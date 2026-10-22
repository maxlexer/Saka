import { chromium } from "@playwright/test";
import sharp from "sharp";
import { FLOOR_SIZE, MIST_COLORS, MIST_COLORS_DARK, MIST_STILL_TIME, type Box } from "../src/lib/mist-math.ts";
import { renderMist } from "./lib/mist-harness.ts";

type Boxes = Record<"bottle" | "text" | "keepA", Box>;
// Both stills are painted on the whole floor picture (2400 by 1600, origin bottom left) and cropped over the hero the
// same way, so their smoke lies on its floor line. The boxes bake the caps in, measured from the live page in that frame.
// Wide covers desktop heroes from 1440 by 828 to 1920 by 850 (lifted). Tall is a 375 by 772 phone hero, bottle between headline and button.
// scale sizes the feathers: the frame shows at about 0.7 CSS pixels per pixel on desktop and 0.5 on phones.
const layouts: { name: string; scale: number; boxes: Boxes }[] = [
  { name: "", scale: 1.4, boxes: { bottle: [1049, 261, 2119, 1599], text: [243, 804, 1314, 1143], keepA: [216, 635, 789, 858] } },
  { name: "-tall", scale: 2, boxes: { bottle: [820, 224, 1580, 1173], text: [868, 1104, 1532, 1484], keepA: [835, 66, 1370, 224] } },
];
const [width, height] = FLOOR_SIZE;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
for (const { name, scale, boxes } of layouts) {
  for (const [colors, theme] of [[MIST_COLORS, ""], [MIST_COLORS_DARK, "-dark"]] as const) {
    const file = `public/mist-static${name}${theme}.webp`;
    const { dataUrl } = await renderMist(page, { width, height, time: MIST_STILL_TIME, scale, colors, boxes });
    // Smoke has no fine detail, so half size looks the same stretched over the hero and stays small.
    await sharp(Buffer.from(dataUrl.split(",")[1], "base64")).resize(width / 2, height / 2).webp({ quality: 70, alphaQuality: 70 }).toFile(file);
    console.log(`wrote ${file}`);
  }
}
await browser.close();
