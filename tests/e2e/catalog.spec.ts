import { expect, test } from "@playwright/test";
import { addFirstProduct, FIRST } from "./helpers";

test("home shows the hero and three best sellers on every screen, with no sizes or prices", async ({ page }) => {
  await page.goto("/?x=1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the scent that feels like you.");
  await expect(page.getByRole("heading", { level: 2, name: "Best sellers" })).toBeVisible();
  await expect(page.locator("#collection li:visible")).toHaveCount(3);
  const tops = await page.locator("#collection li").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1); // one row, at any width
  await expect(page.locator("#collection").getByRole("link", { name: /view products/i })).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(/\$|\d\s?ml|out of stock/i);
});

test("products are grouped under the four families, cards show the name and two moods", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Fresh", "Woody", "Oriental", "Aromatic"]);
  await expect(page.locator('main a[href*="scent="]')).toHaveCount(20);
  const first = page.locator('main a[href*="scent="]').first();
  await expect(first).toContainText(FIRST.name);
  await expect(first).toContainText("Bright, Calm");
  expect(await page.locator("main").innerText()).not.toMatch(/\$|\d\s?ml|out of stock/i);
});

test("cards have 8px corners and a 4:5 bottle stage", async ({ page }) => {
  await page.goto("/products");
  const card = page.locator('main a[href*="scent="]').first();
  expect(await card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("8px");
  const box = await card.locator("[data-card-bottle]").boundingBox();
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(0.8, 1);
});

test("product bottles only float: hovering a card never loads a spin sprite", async ({ page, isMobile }) => {
  test.skip(isMobile, "Hover only exists on desktop");
  const sprites: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("spin.webp")) sprites.push(request.url());
  });
  await page.goto("/products");
  await page.locator('main a[href*="scent="]').first().hover();
  await page.waitForTimeout(1000);
  expect(sprites).toEqual([]);
});

test("adding to the cart updates the count and survives a reload", async ({ page }) => {
  await addFirstProduct(page);
  await expect(page.getByRole("button", { name: /Open cart, 1 item/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Open cart, 1 item/ })).toBeVisible();
  await page.getByRole("button", { name: /Open cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toContainText(`${FIRST.name}, 10ml`);
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
  await addFirstProduct(page);
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
