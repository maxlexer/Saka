import { expect, test } from "@playwright/test";

const ldJson = async (page: import("@playwright/test").Page) =>
  JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");

test("home has the right title, a short description, canonical and social tags", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("SAKA Parfum | Fragrance shop in Cambodia");
  const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
  expect(description.length).toBeGreaterThan(50);
  expect(description.length).toBeLessThanOrEqual(160);
  expect(description).not.toMatch(/\d\s?ml/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /:3100\/?$/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
});

test("products has its own title and canonical", async ({ page }) => {
  await page.goto("/products");
  await expect(page).toHaveTitle("Products | SAKA Parfum");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/products$/);
});

test("home carries LocalBusiness and products carries a Product list without offers", async ({ page }) => {
  await page.goto("/");
  expect((await ldJson(page))["@type"]).toBe("LocalBusiness");
  await page.goto("/products");
  const list = await ldJson(page);
  expect(list["@type"]).toBe("ItemList");
  expect(list.itemListElement).toHaveLength(20);
  expect(JSON.stringify(list)).not.toContain("offers");
});

test("the page content is in the first HTML, not behind a skeleton", async ({ request }) => {
  const html = await (await request.get("/products")).text();
  const firstCard = html.indexOf('href="/products?scent=');
  expect(firstCard).toBeGreaterThan(-1);
  expect(html.slice(0, firstCard)).not.toMatch(/<div hidden id="S:/);
});

test("robots, sitemap and favicon", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const path of ["/checkout", "/api", "/admin"]) expect(robots).toContain(`Disallow: ${path}`);
  expect(robots).toContain("Sitemap:");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/products");
  expect(sitemap).not.toContain("/checkout");
  expect((await request.get("/icon.svg")).status()).toBe(200);
  expect((await request.get("/og.png")).status()).toBe(200);
});

test("checkout and admin are noindex", async ({ page }) => {
  for (const path of ["/checkout", "/admin/login"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
