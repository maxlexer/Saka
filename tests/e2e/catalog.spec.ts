import { expect, test } from "@playwright/test";
import { FIRST, SOLD_OUT } from "./helpers";

test("home shows the hero and the right number of preview cards", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the scent that feels like you.");
  const expected = info.project.name === "desktop" ? 3 : 6;
  await expect(page.locator("#collection li:visible")).toHaveCount(expected);
  await expect(page.getByRole("link", { name: /view products/i })).toBeVisible();
});

test("products page lists every product", async ({ page }) => {
  await page.goto("/products");
  await expect(page.locator("main li article")).toHaveCount(20);
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
  await expect(page.getByRole("dialog", { name: "Cart" })).toContainText(`${FIRST.name}, 10ml`);
});

test("out of stock products cannot be added", async ({ page }) => {
  await page.goto("/products");
  const card = page.locator("article", { hasText: SOLD_OUT.name });
  await expect(card).toContainText("Out of stock");
  await card.getByRole("button").first().click();
  await expect(card.getByRole("button", { name: "Add to cart" })).toBeDisabled();
});

test("unknown routes show the branded 404", async ({ page }) => {
  const response = await page.goto("/nope");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("not on our shelf");
});

test("content stays within 1200px on wide screens", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/products");
  const width = await page.locator("main .wrap").first().evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(1200);
});

test("cart drawer changes quantity, removes lines and returns focus on Escape", async ({ page }) => {
  await page.goto("/products");
  await page.locator("article").nth(0).getByRole("button").first().click();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  const opener = page.getByRole("button", { name: /Open cart/ });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Cart" });
  await dialog.getByRole("button", { name: `Add one ${FIRST.name}, 10ml` }).click();
  await expect(dialog).toContainText("$24.00");
  await dialog.getByRole("button", { name: `Remove one ${FIRST.name}, 10ml` }).click();
  await dialog.getByRole("button", { name: `Remove one ${FIRST.name}, 10ml` }).click();
  await expect(dialog).toContainText("Your cart is empty");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});
