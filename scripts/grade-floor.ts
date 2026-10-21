import { fileURLToPath } from "node:url";
import sharp from "sharp";

/** Luminance stops, darkest first. Grading through them maps every pixel onto warm palette tones, so no stray hue survives. */
export const STOPS = {
  light: ["#685846", "#AD9883", "#DCD0BF", "#F2EBDF", "#FAF6EE"],
  dark: ["#171A12", "#23261C", "#393625", "#3A3A2C", "#8C7964"],
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function lut(stops: string[]) {
  const colors = stops.map(rgb);
  const table = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (colors.length - 1);
    const k = Math.min(Math.floor(t), colors.length - 2);
    const f = t - k;
    for (let c = 0; c < 3; c++) table[i * 3 + c] = Math.round(colors[k][c] + (colors[k + 1][c] - colors[k][c]) * f);
  }
  return table;
}

export async function gradeFloor(input: string, theme: "light" | "dark", output: string) {
  const gray = sharp(input).resize(2400, 1600, { fit: "cover", position: "attention" }).grayscale();
  // The dark scene is the light photo at dusk, so the bottle stands on the same floor in both themes:
  // levels are stretched, then a curve capped at 55 percent of the dark stops keeps the window light as faint as it is by day.
  const dark = theme === "dark";
  const { data, info } = await (dark ? gray.normalise() : gray).raw().toBuffer({ resolveWithObject: true });
  const table = lut(STOPS[theme]);
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let p = 0; p < info.width * info.height; p++) {
    const v = data[p * info.channels];
    const i = dark ? Math.round(140 * (v / 255) ** 1.6) : v;
    out.set(table.subarray(i * 3, i * 3 + 3), p * 3);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 74 }).toFile(output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, theme, output] = process.argv.slice(2);
  if (!input || (theme !== "light" && theme !== "dark") || !output) {
    console.error("Usage: node scripts/grade-floor.ts <light photo> <light|dark> <output>");
    process.exit(1);
  }
  await gradeFloor(input, theme, output);
  console.log(`wrote ${output}`);
}
