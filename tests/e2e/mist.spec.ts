import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { renderMist } from "../../scripts/lib/mist-harness.ts";
import { toCanvasRect } from "../../src/lib/mist-math.ts";

// The live shader only starts once a pointer comes over the hero.
const hoverHero = (page: Page) => page.locator("section").first().hover({ position: { x: 200, y: 400 } });

const VIEWPORTS = [{ width: 360, height: 740 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];

test.describe("mist", () => {
  test.skip(({ isMobile }) => isMobile, "Viewports are set explicitly below");

  test("the hero starts with the still, and the live canvas fades in over it on hover", async ({ page }) => {
    await page.goto("/?x=1");
    const still = page.locator('section img[src="/mist-static.webp"]');
    const opacity = (el: import("@playwright/test").Locator) => el.evaluate((node) => getComputedStyle(node).opacity);
    await expect(still).toBeVisible();
    await expect.poll(() => page.locator("section [aria-hidden=true]:has(img)").first().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await page.waitForTimeout(1000);
    await expect(page.locator("section canvas")).toHaveCount(0);
    await hoverHero(page);
    await expect(page.locator("section canvas")).toHaveCount(1);
    await expect.poll(() => opacity(page.locator("section div:has(> canvas)").locator(".."))).toBe("1");
    await expect.poll(() => opacity(still.locator("../.."))).toBe("0");
  });

  test("the smoke rests while the pointer rests, and a sweep carries it along", async ({ page }) => {
    await page.goto("/?x=1");
    await hoverHero(page);
    const canvas = page.locator("section canvas");
    await expect.poll(() => page.locator("section div:has(> canvas)").locator("..").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    const frame = async () => sharp(await canvas.screenshot()).raw().toBuffer();
    const change = (a: Buffer, b: Buffer) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length;

    const before = await frame();
    await page.waitForTimeout(600);
    const resting = await frame();
    const box = (await canvas.boundingBox()) as { x: number; y: number; width: number; height: number };
    const y = box.y + box.height * 0.85;
    await page.mouse.move(box.x + 40, y);
    await page.mouse.move(box.x + box.width * 0.6, y, { steps: 24 });
    await page.waitForTimeout(400);
    const swept = await frame();
    // Nothing boils or fades in place at rest. A sweep moves the smoke many times more than resting does.
    expect(change(before, resting)).toBeLessThan(1.5);
    expect(change(resting, swept)).toBeGreaterThan(Math.max(1, change(before, resting) * 4));
  });

  test("the canvas is decorative, never takes input, sits under the button and is masked low", async ({ page }) => {
    await page.goto("/?x=1");
    await hoverHero(page);
    await expect(page.locator("section canvas")).toHaveCount(1);
    const layer = page.locator("[aria-hidden=true]:has(canvas)");
    expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
    expect(await layer.evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage)).toContain("linear-gradient");
    const box = (await page.locator("section").first().locator("a.btn").boundingBox()) as { x: number; y: number; width: number; height: number };
    const top = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.textContent?.trim(), [box.x + box.width / 2, box.y + box.height / 2]);
    expect(top?.toLowerCase()).toContain("view products");
  });

  for (const viewport of VIEWPORTS) {
    test(`the button keep-out stays clear at ${viewport.width}px wide`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/?x=1");
      const measured = await page.evaluate(() => {
        const hero = document.querySelector("section") as HTMLElement;
        return { hero: hero.getBoundingClientRect().toJSON(), button: (hero.querySelector("a.btn") as HTMLElement).getBoundingClientRect().toJSON() };
      });
      const scale = 0.5;
      const keepA = toCanvasRect(measured.button, measured.hero, scale, 16);
      const { stats } = await renderMist(page, { width: Math.round(measured.hero.width * scale), height: Math.round(measured.hero.height * scale), scale, boxes: { keepA } });
      expect(stats.keepA).toBeLessThanOrEqual(1 / 255);
    });
  }

  test("reduced motion shows the static image and no canvas", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("http://localhost:3100/");
    await hoverHero(page);
    await page.waitForTimeout(1000);
    await expect(page.locator('section img[src="/mist-static.webp"]')).toBeVisible();
    await expect(page.locator("section canvas")).toHaveCount(0);
    await context.close();
  });

  test("without WebGL the theme's static image appears and no error text shows", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("saka.theme", "dark");
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        return type === "webgl2" || type === "webgl" ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...args);
      } as typeof original;
    });
    await page.goto("/?x=1");
    await hoverHero(page);
    await page.waitForTimeout(1000);
    await expect(page.locator('section img[src="/mist-static-dark.webp"]')).toBeVisible();
    await expect(page.locator("section canvas")).toHaveCount(0);
    await expect(page.getByText(/webgl|error|not supported/i)).toHaveCount(0);
  });
});
