import { expect, test } from "@playwright/test";

test("product grids are 3 columns on desktop and 2 on mobile", async ({ page }, info) => {
  await page.goto("/products");
  const columns = await page.locator("main ul").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(info.project.name === "desktop" ? 3 : 2);
});

test("no horizontal scroll at common widths", async ({ page }) => {
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/?x=1", "/products", "/admin/login"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} at ${width}px`).toBe(true);
    }
  }
});

test("headings are ordered: one H1, then H2 and H3 without skipping", async ({ page }) => {
  for (const path of ["/?x=1", "/products", "/checkout", "/admin/login"]) {
    await page.goto(path);
    const levels = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4")].filter((h) => (h as HTMLElement).offsetParent !== null).map((h) => Number(h.tagName[1])));
    expect(levels.filter((n) => n === 1), path).toHaveLength(1);
    levels.reduce((prev, level) => {
      expect(level - prev, path).toBeLessThanOrEqual(1);
      return level;
    }, 1);
  }
});

test("every image has alt text and nothing on home or products mentions Riel", async ({ page }) => {
  for (const path of ["/?x=1", "/products"]) {
    await page.goto(path);
    expect(await page.evaluate(() => [...document.querySelectorAll("img")].filter((img) => !img.hasAttribute("alt")).length)).toBe(0);
    expect(await page.locator("body").innerText()).not.toMatch(/riel|KHR/i);
  }
});
