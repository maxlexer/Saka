import { chromium } from "@playwright/test";
import sharp from "sharp";
import { MIST_COLORS, MIST_COLORS_DARK, MIST_STILL_TIME, type Box } from "../src/lib/mist-math.ts";
import { renderMist } from "./lib/mist-harness.ts";

type Boxes = Record<"bottle" | "text" | "keepA", Box>;
// Approximate hero regions in canvas pixels (origin bottom left), so the caps are baked into the fallback.
// Wide is the desktop hero at 1x. Tall is a 390 by 772 phone hero at 2x, with the bottle between headline and button.
const layouts: { name: string; width: number; height: number; boxes: Boxes }[] = [
  { name: "", width: 1600, height: 1000, boxes: { bottle: [672, 10, 1440, 970], text: [110, 450, 760, 660], keepA: [110, 300, 420, 400] } },
  { name: "-tall", width: 780, height: 1544, boxes: { bottle: [40, 234, 740, 1194], text: [40, 1144, 550, 1434], keepA: [8, 64, 524, 216] } },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
for (const { name, width, height, boxes } of layouts) {
  for (const [colors, theme] of [[MIST_COLORS, ""], [MIST_COLORS_DARK, "-dark"]] as const) {
    const file = `public/mist-static${name}${theme}.webp`;
    const { dataUrl } = await renderMist(page, { width, height, time: MIST_STILL_TIME, scale: 1, colors, boxes });
    // Smoke has no fine detail, so half size looks the same stretched over the hero and stays small.
    await sharp(Buffer.from(dataUrl.split(",")[1], "base64")).resize(width / 2, height / 2).webp({ quality: 70, alphaQuality: 70 }).toFile(file);
    console.log(`wrote ${file}`);
  }
}
await browser.close();
