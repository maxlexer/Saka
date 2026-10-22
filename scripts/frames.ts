import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { bottleSvg } from "./lib/bottle.mjs";

export const FRAMES = 36;
const COLS = 6;
const STILL = { width: 960, height: 1200 };
const FRAME = { width: 480, height: 600 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
// Every bottle stands in one spot, as fractions of the frame height: cap at 14 percent, base at 92. The hero's floor shadow is drawn for it.
const TOP = 0.14;
const BASE = 0.92;

type Box = { left: number; top: number; width: number; height: number; base: number };

/**
 * The smallest box holding the bottle in every frame, so a turn keeps one scale. A turned base dips below the front one in
 * perspective, so the floor line follows frame 0, the view that rests on the shadow.
 */
async function bounds(frames: Buffer[]): Promise<Box> {
  const boxes = await Promise.all(
    frames.map(async (frame) => {
      const { info } = await sharp(frame).trim().toBuffer({ resolveWithObject: true });
      const left = -(info.trimOffsetLeft ?? 0);
      const top = -(info.trimOffsetTop ?? 0);
      return [left, top, left + info.width, top + info.height];
    }),
  );
  const [left, top, right, bottom] = [0, 1, 2, 3].map((i) => (i < 2 ? Math.min : Math.max)(...boxes.map((b) => b[i])));
  return { left, top, width: right - left, height: bottom - top, base: boxes[0][3] };
}

async function stand(frame: Buffer, { base, ...box }: Box, { width, height }: typeof STILL) {
  const scale = Math.min((height * (BASE - TOP)) / (base - box.top), (width * 0.9) / box.width);
  const [w, h] = [Math.round(box.width * scale), Math.round(box.height * scale)];
  const input = await sharp(frame).extract(box).resize(w, h).png().toBuffer();
  const top = Math.round(height * BASE - (base - box.top) * scale);
  return sharp({ create: { width, height, channels: 4, background: CLEAR } }).composite([{ input, left: Math.round((width - w) / 2), top }]);
}

/** Writes a still from frame 0 and, given a full turn, the spin sprite. Frame 0 must face front; a turn runs frame 0 to 35. */
export async function writeBottle(frames: Buffer[], outDir: string) {
  if (frames.length !== 1 && frames.length !== FRAMES) throw new Error(`Need 1 or ${FRAMES} frames, got ${frames.length}`);
  await mkdir(outDir, { recursive: true });
  const box = await bounds(frames);
  await (await stand(frames[0], box, STILL)).webp({ quality: 82, alphaQuality: 90 }).toFile(join(outDir, "still.webp"));
  if (frames.length === 1) return;
  const tiles = await Promise.all(frames.map(async (frame) => (await stand(frame, box, FRAME)).png().toBuffer()));
  await sharp({ create: { width: FRAME.width * COLS, height: FRAME.height * COLS, channels: 4, background: CLEAR } })
    .composite(tiles.map((input, i) => ({ input, left: (i % COLS) * FRAME.width, top: Math.floor(i / COLS) * FRAME.height })))
    .webp({ quality: 72, alphaQuality: 80 })
    .toFile(join(outDir, "spin.webp"));
}

export const placeholderFrames = () =>
  Promise.all(
    Array.from({ length: FRAMES }, (_, i) =>
      sharp(Buffer.from(bottleSvg({ width: 768, height: 960, angle: (360 / FRAMES) * i, backdrop: false }))).png().toBuffer(),
    ),
  );

/** One slow full turn, filmed on a plain green backdrop that the color key removes. Despill takes the green the glass picks up at its edges. */
async function videoFrames(file: string, key: string, similarity: string) {
  const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
  if (!(duration > 0)) throw new Error(`Could not read the length of ${file}`);
  const dir = await mkdtemp(join(tmpdir(), "saka-video-"));
  try {
    const filters = [`fps=${FRAMES}/${duration}`, `colorkey=${key}:${similarity}:0.08`, "despill=type=green", "format=rgba"];
    execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vf", filters.join(","), "-frames:v", String(FRAMES), join(dir, "f%02d.png")]);
    const names = (await readdir(dir)).sort();
    return Promise.all(names.map((name) => readFile(join(dir, name))));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, ...args] = process.argv.slice(2);
  const flag = (name: string, fallback: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
  if (mode === "placeholders") {
    const frames = await placeholderFrames();
    const { products } = JSON.parse(await readFile("supabase/seed/catalog.json", "utf8")) as { products: { slug: string }[] };
    // Only the hero turns. A bottle that already has a still, placeholder or real, is left alone.
    const bottles: [string, Buffer[]][] = [["public/hero", frames], ...products.map((p): [string, Buffer[]] => [`public/products/${p.slug}`, frames.slice(0, 1)])];
    const missing = bottles.filter(([dir]) => !existsSync(join(dir, "still.webp")));
    for (const [dir, list] of missing) await writeBottle(list, dir);
    console.log(`wrote ${missing.length} placeholders`);
  } else if (mode === "still" && args[0] && args[1]) {
    await writeBottle([await readFile(args[0])], args[1]);
    console.log(`wrote ${args[1]}`);
  } else if (mode === "video" && args[0] && args[1]) {
    await writeBottle(await videoFrames(args[0], flag("key", "0x00FF00"), flag("similarity", "0.18")), args[1]);
    console.log(`wrote ${args[1]}`);
  } else {
    console.error("Usage: node scripts/frames.ts placeholders | still <transparent image> <outDir> | video <file> <outDir> [--key 0x00FF00] [--similarity 0.18]");
    process.exit(1);
  }
}
