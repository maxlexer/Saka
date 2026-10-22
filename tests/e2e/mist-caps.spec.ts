import { expect, test } from "@playwright/test";
import { renderMist } from "../../scripts/lib/mist-harness.ts";
import { MIST_COLORS_DARK, type Box } from "../../src/lib/mist-math.ts";
import { PUFF_LIFE } from "../../src/lib/mist-shader.ts";

const STEP = 1 / 255;

test.describe("mist alpha caps and keep-out (real shader, no browser UI)", () => {
  test.skip(({ isMobile }) => isMobile, "Shader math does not depend on the device");

  test("respects 0.55 overall, 0.3 over the bottle, 0.15 behind text and 0 inside keep-out boxes", async ({ page }) => {
    await page.goto("about:blank");
    const boxes: Record<"bottle" | "text" | "keepA", Box> = {
      bottle: [320, 140, 480, 400],
      text: [240, 420, 560, 480],
      keepA: [260, 40, 395, 100],
    };
    for (const time of [0, 13, 40, 97]) {
      const { stats } = await renderMist(page, { width: 800, height: 500, time, scale: 0.5, boxes });
      expect(stats.all).toBeGreaterThan(0.2);
      expect(stats.all).toBeLessThanOrEqual(0.55 + STEP);
      expect(stats.bottle).toBeLessThanOrEqual(0.3 + STEP);
      expect(stats.text).toBeLessThanOrEqual(0.15 + STEP);
      expect(stats.keepA).toBeLessThanOrEqual(STEP);
    }
  });

  test("the dark palette respects the same caps", async ({ page }) => {
    await page.goto("about:blank");
    const { stats } = await renderMist(page, { width: 800, height: 500, time: 40, scale: 0.5, colors: MIST_COLORS_DARK, boxes: { bottle: [320, 140, 480, 400], text: [240, 420, 560, 480], keepA: [260, 40, 395, 100] } });
    expect(stats.all).toBeLessThanOrEqual(0.55 + STEP);
    expect(stats.bottle).toBeLessThanOrEqual(0.3 + STEP);
    expect(stats.text).toBeLessThanOrEqual(0.15 + STEP);
    expect(stats.keepA).toBeLessThanOrEqual(STEP);
  });

  test("a gust clears a lane through the smoke, and the smoke fills it back in", async ({ page }) => {
    await page.goto("about:blank");
    // A quick left to right sweep through dense smoke, finished at t = 40, as Mist.tsx would upload it.
    const wind = { puffs: [] as number[], born: [] as number[] };
    for (let i = 0; i < 20; i++) {
      wind.puffs.push(60 + i * 30, 330, 0.9, 0);
      wind.born.push(40 - (19 - i) * 0.03);
    }
    const lane: Box = [150, 315, 550, 345];
    const alpha = async (time: number, gust?: typeof wind) => (await renderMist(page, { width: 720, height: 450, time, scale: 0.5, wind: gust, boxes: { lane } })).stats.lane;
    expect(await alpha(40.2, wind)).toBeLessThan((await alpha(40.2)) * 0.5);
    expect(await alpha(40 + PUFF_LIFE + 0.1, wind)).toBe(await alpha(40 + PUFF_LIFE + 0.1));
  });
});
