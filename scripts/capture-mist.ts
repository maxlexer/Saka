import { chromium } from "@playwright/test";
import sharp from "sharp";
import { MIST_COLORS, MIST_COLORS_DARK, MIST_STILL_TIME, type Box } from "../src/lib/mist-math.ts";
import { renderMist } from "./lib/mist-harness.ts";

// Approximate desktop hero regions in canvas pixels (origin bottom left), so the caps are baked into the fallback.
const boxes: Record<"bottle" | "text" | "keepA", Box> = {
  bottle: [800, 120, 1260, 720],
  text: [110, 450, 760, 660],
  keepA: [110, 300, 420, 400],
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
for (const [colors, file] of [[MIST_COLORS, "public/mist-static.webp"], [MIST_COLORS_DARK, "public/mist-static-dark.webp"]] as const) {
  const { dataUrl } = await renderMist(page, { width: 1600, height: 1000, time: MIST_STILL_TIME, scale: 1, colors, boxes });
  // Fog has no fine detail, so half size looks the same stretched over the hero and stays small.
  await sharp(Buffer.from(dataUrl.split(",")[1], "base64")).resize(800, 500).webp({ quality: 70, alphaQuality: 70 }).toFile(file);
  console.log(`wrote ${file}`);
}
await browser.close();
