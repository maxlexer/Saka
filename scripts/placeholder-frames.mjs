import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { bottleSvg } from "./lib/bottle.mjs";

const FRAMES = 24;
await mkdir("public/turntable", { recursive: true });
for (let i = 0; i < FRAMES; i++) {
  const svg = bottleSvg({ angle: (360 / FRAMES) * i, tick: i });
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(`public/turntable/frame-${String(i).padStart(2, "0")}.webp`);
}
console.log(`wrote ${FRAMES} placeholder frames`);
