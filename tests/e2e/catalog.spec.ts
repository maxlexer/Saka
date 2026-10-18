import { expect, test } from "@playwright/test";

test("home shows the hero and the right number of preview cards", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the scent that feels like you.");
  const expected = info.project.name === "desktop" ? 3 : 6;
  await expect(page.locator("#collection li:visible")).toHaveCount(expected);
  await expect(page.getByRole("link", { name: /view products/i })).toBeVisible();
});

test("products page lists every product", async ({ page }) => {
  await page.goto("/products");
  await expect(page.locator("main li article")).toHaveCount(6);
});

test("a card opens and closes, one at a time", async ({ page }) => {
  await page.goto("/products");
  const first = page.locator("article").nth(0).getByRole("button").first();
  const second = page.locator("article").nth(1).getByRole("button").first();
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await second.click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(second).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(second).toHaveAttribute("aria-expanded", "false");
});

test("adding to the cart updates the count and survives a reload", async ({ page }) => {
  await page.goto("/products");
  await page.locator("article").nth(0).getByRole("button").first().click();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByRole("button", { name: /Open cart, 1 item/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Open cart, 1 item/ })).toBeVisible();
  await page.getByRole("button", { name: /Open cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toContainText("Jasmine Rain, 10ml");
});

test("out of stock products cannot be added", async ({ page }) => {
  await page.goto("/products");
  const card = page.locator("article", { hasText: /Orange Peel/ });
  await expect(card).toContainText("Out of stock");
  await card.getByRole("button").first().click();
  await expect(card.getByRole("button", { name: "Add to cart" })).toBeDisabled();
});

test("unknown routes show the branded 404", async ({ page }) => {
  const response = await page.goto("/nope");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("not on our shelf");
});
