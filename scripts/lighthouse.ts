import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

// Runs Lighthouse (mobile emulation, its default) three times per page and exits non-zero when the median misses a target.
// One run is noisy (total blocking time moved 100ms between identical runs), so the median is what is gated, as Lighthouse advises.
// Lab tools cannot measure INP, so total blocking time under 200ms stands in for it. Real INP comes from field data after launch.
const base = process.argv[2] ?? "http://localhost:3100";
const paths = ["/", "/products"];
const MIN: Record<string, number> = { performance: 90, accessibility: 95, "best-practices": 90, seo: 95 };
const MAX: Record<string, number> = { "largest-contentful-paint": 2500, "cumulative-layout-shift": 0.1, "total-blocking-time": 200 };
const RUNS = 3;
const dir = mkdtempSync(join(tmpdir(), "saka-lh-"));
const env = { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? chromium.executablePath() };
let failed = false;

const median = (values: number[]) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];

function run(url: string, out: string) {
  const args = [url, "--quiet", "--output=json", `--output-path=${out}`, "--chrome-flags=--headless=new", "--only-categories=performance,accessibility,best-practices,seo"];
  try {
    execFileSync("npx", ["lighthouse", ...args], { stdio: "inherit", shell: true, env });
  } catch (error) {
    // On Windows Lighthouse can fail to delete Chrome's temp profile after writing the report. The report is what counts.
    if (!existsSync(out)) throw error;
  }
  return JSON.parse(readFileSync(out, "utf8"));
}

for (const path of paths) {
  const reports = Array.from({ length: RUNS }, (_, i) => run(`${base}${path}`, join(dir, `${path.replace(/\W/g, "_") || "home"}-${i}.json`)));
  console.log(`\n${base}${path} (median of ${RUNS})`);
  for (const [id, min] of Object.entries(MIN)) {
    const score = median(reports.map((r) => Math.round(r.categories[id].score * 100)));
    failed ||= score < min;
    console.log(`  ${score >= min ? "pass" : "FAIL"} ${id}: ${score} (min ${min})`);
  }
  for (const [id, max] of Object.entries(MAX)) {
    const value = median(reports.map((r) => r.audits[id].numericValue as number));
    failed ||= value > max;
    console.log(`  ${value <= max ? "pass" : "FAIL"} ${id}: ${value.toFixed(id === "cumulative-layout-shift" ? 3 : 0)} (max ${max})`);
  }
}
process.exit(failed ? 1 : 0);
