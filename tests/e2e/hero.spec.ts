import { expect, test } from "@playwright/test";

// Every visit carries a query, so the intro never runs here.

test("the hero has the shop's city, one headline, one button, a floor and a standing bottle, and no sizes", async ({ page }) => {
  await page.goto("/?x=1");
  const hero = page.locator("section").first();
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Find the scent that feels like you.");
  await expect(hero.getByRole("link")).toHaveCount(2);
  await expect(hero.getByRole("link", { name: /^Phnom Penh, open in Google Maps/ })).toHaveAttribute("target", "_blank");
  await expect(page.locator("header").getByRole("link", { name: /Google Maps/ })).toHaveCount(0);
  await expect(hero.getByRole("link", { name: /view products/i })).toHaveAttribute("href", "/products");
  await expect(hero.locator('img[src*="floor-light"]')).toBeVisible();
  await expect(hero.locator("[data-hero-bottle] img")).toBeVisible();
  expect(await hero.innerText()).not.toMatch(/\d\s?ml|\$/);
});

test("the button sits left of the bottle on desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop layout");
  await page.goto("/?x=1");
  const button = await page.locator("section").first().getByRole("link", { name: /view products/i }).boundingBox();
  const bottle = await page.locator("[data-hero-bottle]").boundingBox();
  expect((button?.x ?? 0) + (button?.width ?? 0)).toBeLessThan(bottle?.x ?? 0);
});

test("the dark floor is never downloaded in light mode", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.goto("/?x=1");
  await page.waitForLoadState("networkidle");
  expect(requested.some((url) => url.includes("floor-light"))).toBe(true);
  expect(requested.some((url) => url.includes("floor-dark"))).toBe(false);
});

test("the dark floor shows when the theme is dark, and fades in when switched", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("saka.theme", "dark"));
  await page.goto("/?x=1");
  const dark = page.locator('img[src*="floor-dark"]');
  await expect.poll(() => dark.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await page.getByRole("button", { name: "Dark mode" }).click();
  await expect(dark).toBeHidden();
  await page.getByRole("button", { name: "Dark mode" }).click();
  await expect(dark).toBeVisible();
  await expect.poll(() => dark.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("the hero never blocks vertical scrolling or pinch zoom", async ({ page }) => {
  await page.goto("/?x=1");
  expect(await page.locator("section").first().evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-y pinch-zoom");
});
