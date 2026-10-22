import { expect, test } from "@playwright/test";
import { renderMist } from "../../scripts/lib/mist-harness.ts";
import { MIST_COLORS_DARK, type Box } from "../../src/lib/mist-math.ts";

const STEP = 1 / 255;

test.describe("mist alpha caps and keep-out (real shader, no browser UI)", () => {
  test.skip(({ isMobile }) => isMobile, "Shader math does not depend on the device");

  test("respects 0.8 overall, 0.4 over the bottle glass, 0.15 behind text and 0 inside keep-out boxes", async ({ page }) => {
    await page.goto("about:blank");
    // The bottle cap hugs the middle third of the bottle box, where the glass stands. "glass" is only measured.
    const boxes: Record<"bottle" | "glass" | "text" | "keepA", Box> = {
      bottle: [320, 140, 480, 400],
      glass: [368, 140, 432, 400],
      text: [240, 420, 560, 480],
      keepA: [260, 40, 395, 100],
    };
    for (const time of [0, 13, 40, 97]) {
      const { stats } = await renderMist(page, { width: 800, height: 500, time, scale: 0.5, boxes });
      expect(stats.all).toBeGreaterThan(0.2);
      expect(stats.all).toBeLessThanOrEqual(0.8 + STEP);
      expect(stats.glass).toBeLessThanOrEqual(0.4 + STEP);
      expect(stats.text).toBeLessThanOrEqual(0.15 + STEP);
      expect(stats.keepA).toBeLessThanOrEqual(STEP);
    }
  });

  test("the dark palette respects the same caps", async ({ page }) => {
    await page.goto("about:blank");
    const { stats } = await renderMist(page, { width: 800, height: 500, time: 40, scale: 0.5, colors: MIST_COLORS_DARK, boxes: { bottle: [320, 140, 480, 400], glass: [368, 140, 432, 400], text: [240, 420, 560, 480], keepA: [260, 40, 395, 100] } });
    expect(stats.all).toBeLessThanOrEqual(0.8 + STEP);
    expect(stats.glass).toBeLessThanOrEqual(0.4 + STEP);
    expect(stats.text).toBeLessThanOrEqual(0.15 + STEP);
    expect(stats.keepA).toBeLessThanOrEqual(STEP);
  });
});
