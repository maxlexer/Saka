import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { FLOOR_HORIZON } from "../src/lib/mist-math.ts";

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

/** Share of brightness the floor keeps, at the horizon and at the bottom edge, so it reads as a plane in shadow under the lit wall. */
const FLOOR_SHADE = { light: [0.62, 0.5], dark: [0.5, 0.32] };

/**
 * Share of brightness kept on row y of `height`. `horizon` is the floor line as a share of the height from the top; below
 * it the floor is shaded, darkest nearest the viewer. The shade comes in over 3 rows, so the line is crisp without stair steps.
 */
export function floorShade(theme: "light" | "dark", y: number, height: number, horizon = FLOOR_HORIZON) {
  const [near, far] = FLOOR_SHADE[theme];
  const line = horizon * height;
  const below = Math.min(Math.max((y - line) / 3, 0), 1);
  return 1 - below * (1 - (near + ((far - near) * Math.max(y - line, 0)) / (height - line)));
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
    const shade = floorShade(theme, Math.floor(p / info.width), info.height);
    const i = Math.round((dark ? 140 * (v / 255) ** 1.6 : v) * shade);
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
