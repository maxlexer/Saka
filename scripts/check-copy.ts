import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PALETTE = new Set([
  "#faf6ee", "#f2ebdf", "#dcd0bf", "#ad9883", "#8c7964", "#685846", "#171a12", "#393625",
  "#4f6b3a", "#a3392b", "#23261c", "#3a3a2c", "#f5efe4", "#bdae9b", "#8fb174", "#e07a6a",
]);
const ROOTS = ["src", "scripts", "tests", "supabase", "README.md"];
const EXTS = new Set([".ts", ".tsx", ".css", ".mjs", ".sql", ".md"]);
const SKIP = new Set(["tests/unit/check-copy.test.ts"]);
const SKIP_DIRS = new Set(["dist", "node_modules"]);

export function findViolations(file: string, text: string): string[] {
  const out: string[] = [];
  text.split("\n").forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    if (line.includes(String.fromCharCode(0x2014))) out.push(`${at} em dash`);
    if (/\w!(?=[\s"'`<]|$)/.test(line)) out.push(`${at} exclamation mark`);
    if (file.endsWith(".md") || file.endsWith(".sql")) return;
    for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (!PALETTE.has(m[0].toLowerCase())) out.push(`${at} off-palette ${m[0]}`);
    }
  });
  return out;
}

function* walk(path: string): Generator<string> {
  let stat;
  try { stat = statSync(path); } catch { return; }
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) if (!SKIP_DIRS.has(name)) yield* walk(join(path, name));
  } else if (EXTS.has(extname(path))) {
    yield path;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = ROOTS.flatMap((root) => [...walk(root)])
    .map((f) => f.replaceAll("\\", "/"))
    .filter((f) => !SKIP.has(f))
    .flatMap((f) => findViolations(f, readFileSync(f, "utf8")));
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("copy check passed");
}
