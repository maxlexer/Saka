import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ended = (page: Page, timeout = 10_000) => page.waitForFunction(() => !document.documentElement.classList.contains("intro-pending"), undefined, { timeout });
const heroButton = (page: Page) => page.locator("section").first().getByRole("link", { name: /view products/i });

test("runs on a hard load of home, locks the page, and ends in about four seconds", async ({ page }) => {
  const start = Date.now();
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator("html")).toHaveClass(/intro-pending/);
  await expect(page.locator(".intro-overlay")).toBeVisible();
  await expect(page.locator("main > section").first()).toHaveAttribute("inert", "");
  await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
  await ended(page);
  const seconds = (Date.now() - start) / 1000;
  expect(seconds).toBeGreaterThan(3.6);
  expect(seconds).toBeLessThan(6);
  await expect(page.locator(".intro-overlay")).toBeHidden();
  await expect(page.locator("main > section").first()).not.toHaveAttribute("inert", "");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-hero-bottle] img")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("the overlay bottle matches the hero bottle's size, and the hand-off causes no layout shift", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cls: number }).cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) (window as unknown as { cls: number }).cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await page.waitForFunction(() => (document.querySelector(".intro-overlay [aria-hidden]") as HTMLElement | null)?.style.width !== "");
  const sizes = await page.evaluate(() => {
    const stage = (document.querySelector(".intro-overlay [aria-hidden]") as HTMLElement).style;
    const hero = (document.querySelector("[data-hero-bottle]") as HTMLElement).getBoundingClientRect();
    return { w: parseFloat(stage.width), h: parseFloat(stage.height), hw: hero.width, hh: hero.height };
  });
  expect(sizes.w).toBeCloseTo(sizes.hw, 0);
  expect(sizes.h).toBeCloseTo(sizes.hh, 0);
  await ended(page);
  // The glide lands exactly on the hero bottle. The overlay is hidden by now, so its end point is read from its styles.
  const landed = await page.evaluate(() => {
    const stage = (document.querySelector(".intro-overlay [aria-hidden]") as HTMLElement).style;
    const glide = new DOMMatrix(stage.transform);
    const hero = (document.querySelector("[data-hero-bottle]") as HTMLElement).getBoundingClientRect();
    return Math.max(Math.abs(parseFloat(stage.left) + glide.e - hero.left), Math.abs(parseFloat(stage.top) + glide.f - hero.top));
  });
  expect(landed).toBeLessThan(1);
  expect(await page.evaluate(() => (window as unknown as { cls: number }).cls)).toBeLessThan(0.1);
});

test("Skip, Escape and Enter each jump to the end state", async ({ page }) => {
  for (const act of [(p: Page) => p.getByRole("button", { name: "Skip" }).click(), (p: Page) => p.keyboard.press("Escape"), (p: Page) => p.keyboard.press("Enter")]) {
    // The intro plays once per tab, so forget it was seen. The first round runs on about:blank, which has no storage.
    await page.evaluate(() => sessionStorage.clear()).catch(() => {});
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
    await act(page);
    await ended(page, 2000);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".intro-overlay")).toBeHidden();
  }
});

test("plays once per tab: a reload skips it, a new tab plays it again", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/intro-pending/);
  await ended(page);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
  await expect(heroButton(page)).toBeVisible();
  const tab = await context.newPage();
  await tab.goto("/");
  await expect(tab.locator("html")).toHaveClass(/intro-pending/);
});

test("a slow sprite never delays the intro", async ({ page }) => {
  await page.route("**/hero/spin.webp", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    await route.continue().catch(() => {});
  });
  const start = Date.now();
  await page.goto("/", { waitUntil: "commit" });
  await ended(page);
  expect((Date.now() - start) / 1000).toBeLessThan(5.5);
});

test("a failed sprite skips the intro at once", async ({ page }) => {
  await page.route("**/hero/spin.webp", (route) => route.abort());
  const start = Date.now();
  await page.goto("/", { waitUntil: "commit" });
  await ended(page);
  expect((Date.now() - start) / 1000).toBeLessThan(2.5);
});

test("the failsafe reveals the page when no script bundle loads", async ({ page }) => {
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/intro-pending/);
  await ended(page, 9000);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("a timeline chunk that arrives after the failsafe never locks the revealed page", async ({ page }) => {
  // Holds back only the timeline chunk, recognised by a selector only it contains.
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (body.includes("body > .skip-link")) await new Promise((resolve) => setTimeout(resolve, 8000));
    await route.fulfill({ response, body });
  });
  await page.goto("/");
  await ended(page, 9000);
  const mist = page.locator("section").first().locator("[aria-hidden=true]:has(img)").first();
  await expect.poll(() => mist.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await page.waitForTimeout(3000);
  await expect(page.locator("main > section").first()).not.toHaveAttribute("inert", "");
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  await expect(page.locator(".intro-overlay")).toBeHidden();
});

test("reduced motion has no intro", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
  await expect(page.locator(".intro-overlay")).toBeHidden();
  await context.close();
});

test("with JavaScript disabled the content shows and no overlay appears", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(heroButton(page)).toBeVisible();
  await expect(page.locator(".intro-overlay")).toBeHidden();
  await context.close();
});

test("a query skips the intro, and client navigation never replays it", async ({ page }) => {
  await page.goto("/?scent=cool-water");
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
  await page.goto("/");
  await ended(page);
  await heroButton(page).click();
  await expect(page).toHaveURL(/\/products$/);
  await page.getByRole("link", { name: "SAKA Parfum, home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
  await expect(heroButton(page)).toBeVisible();
});

test("the intro follows the theme", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("saka.theme", "dark"));
  await page.goto("/");
  expect(await page.locator(".intro-overlay > div").first().evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(23, 26, 18)");
});

test("the intro screen has no serious accessibility issues, and Skip has focus", async ({ page }) => {
  await page.goto("/");
  const skip = page.getByRole("button", { name: "Skip" });
  await expect(skip).toBeFocused();
  // Checked once its 0.3s fade-in is done, as a visitor reads it. Mid-fade its blended color is lighter.
  await expect.poll(() => skip.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
