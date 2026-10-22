import { chromium, devices } from "@playwright/test";
import sharp from "sharp";
const out = process.argv[2];
const browser = await chromium.launch();
for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 800 } }], ["phone", devices["Pixel 7"]]]) {
  const page = await browser.newPage(opts);
  if (process.argv[3]) await page.addInitScript(() => localStorage.setItem("saka.theme", "dark"));
  await page.goto("http://localhost:3100/products"); // warm caches
  await page.goto("http://localhost:3100/", { waitUntil: "commit" });
  await page.waitForFunction(() => document.querySelector(".intro-overlay [aria-hidden]")?.style.width);
  const t0 = Date.now();
  const shots = [];
  for (const at of [500, 1600, 2600, 3300, 3700, 4100, 5200]) {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    shots.push(await page.screenshot());
  }
  const w = name === "desktop" ? 640 : 206, h = name === "desktop" ? 400 : 458;
  const tiles = await Promise.all(shots.map((s) => sharp(s).resize(w, h).toBuffer()));
  await sharp({ create: { width: (w + 8) * tiles.length, height: h, channels: 3, background: "#FAF6EE" } })
    .composite(tiles.map((input, i) => ({ input, left: i * (w + 8), top: 0 }))).png().toFile(`${out}/intro-${name}${process.argv[3] ? "-dark" : ""}.png`);
  await page.close();
}
await browser.close();
