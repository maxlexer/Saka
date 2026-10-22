import { execFileSync } from "node:child_process";
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

/** Frame 0 must face front. A full turn runs frame 0 to 35, and the next frame would be frame 0 again. */
export async function writeBottle(frames: Buffer[], outDir: string) {
  if (frames.length !== FRAMES) throw new Error(`Need ${FRAMES} frames, got ${frames.length}`);
  await mkdir(outDir, { recursive: true });
  await sharp(frames[0]).resize({ ...STILL, fit: "contain", background: CLEAR }).webp({ quality: 82, alphaQuality: 90 }).toFile(join(outDir, "still.webp"));
  const tiles = await Promise.all(frames.map((frame) => sharp(frame).resize({ ...FRAME, fit: "contain", background: CLEAR }).png().toBuffer()));
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

/** One slow full turn, filmed on a plain backdrop that the color key removes. Center-cropped to 4:5. */
async function videoFrames(file: string, key: string, similarity: string) {
  const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
  if (!(duration > 0)) throw new Error(`Could not read the length of ${file}`);
  const dir = await mkdtemp(join(tmpdir(), "saka-video-"));
  try {
    const filters = [`fps=${FRAMES}/${duration}`, "crop=w='min(iw,ih*4/5)':h='min(ih,iw*5/4)'", `colorkey=${key}:${similarity}:0.08`, "format=rgba"];
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
    for (const dir of ["public/hero", ...products.map((p) => `public/products/${p.slug}`)]) await writeBottle(frames, dir);
    console.log(`wrote placeholders for the hero and ${products.length} perfumes`);
  } else if (mode === "video" && args[0] && args[1]) {
    await writeBottle(await videoFrames(args[0], flag("key", "0x00FF00"), flag("similarity", "0.18")), args[1]);
    console.log(`wrote ${args[1]}`);
  } else {
    console.error("Usage: node scripts/frames.ts placeholders | video <file> <outDir> [--key 0x00FF00] [--similarity 0.18]");
    process.exit(1);
  }
}
