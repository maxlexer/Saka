import { expect, test, type Page } from "@playwright/test";
import { resetAll, signIn } from "./helpers";

test.skip(({ isMobile }) => isMobile, "Admin flows run once, on desktop");
test.beforeEach(resetAll);

test("admin pages send visitors without a session to the login page", async ({ page }) => {
  await page.goto("/admin/transactions");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("the right password opens admin, and logging out closes it", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("a wrong password is refused and five failures lock the login", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await signIn(page, "wrong");
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("That password is not right.");
  }
  await signIn(page);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Too many attempts. Try again in 15 minutes.");
});

test("the session cookie is httpOnly, strict and scoped to admin", async ({ page, context }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
  const cookie = (await context.cookies()).find((c) => c.name === "saka_admin");
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Strict", path: "/admin" });
});

const rowFor = (page: Page, slug: string) => page.locator("form", { has: page.locator(`input[name="slug"][value="${slug}"]`) });

test("availability and name edits reach the storefront, then are restored", async ({ page }) => {
  await signIn(page);
  const row = rowFor(page, "cool-water");
  await row.locator(".switch").click();
  await row.getByLabel(/^Name/).fill("Davidoff Cool Water Test");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row.getByRole("status")).toHaveText("Saved");

  await page.goto("/products");
  const card = page.locator("article", { hasText: "Davidoff Cool Water Test" });
  await expect(card).toContainText("Out of stock");

  await page.goto("/admin");
  await rowFor(page, "cool-water").locator(".switch").click();
  await rowFor(page, "cool-water").getByLabel(/^Name/).fill("Davidoff Cool Water");
  await rowFor(page, "cool-water").getByRole("button", { name: "Save" }).click();
  await expect(rowFor(page, "cool-water").getByRole("status")).toHaveText("Saved");
});

test("a price change reaches the storefront, then is restored", async ({ page }) => {
  await signIn(page);
  const prices = page.locator("form", { hasText: "Save prices" });
  await prices.getByLabel("10ml, USD").fill("13.50");
  await prices.getByRole("button", { name: "Save prices" }).click();
  await expect(prices.getByRole("status")).toHaveText("Saved");
  await page.goto("/products");
  await expect(page.locator("article").first()).toContainText("10ml $13.50");

  await page.goto("/admin");
  await page.locator("form", { hasText: "Save prices" }).getByLabel("10ml, USD").fill("12");
  await page.locator("form", { hasText: "Save prices" }).getByRole("button", { name: "Save prices" }).click();
  await expect(page.locator("form", { hasText: "Save prices" }).getByRole("status")).toHaveText("Saved");
});

test("invalid input is refused with a message", async ({ page }) => {
  await signIn(page);
  const prices = page.locator("form", { hasText: "Save prices" });
  await prices.getByLabel("10ml, USD").evaluate((el: HTMLInputElement) => { el.removeAttribute("min"); el.value = "0"; });
  await prices.getByRole("button", { name: "Save prices" }).click();
  await expect(prices.getByRole("status")).toHaveText("Use at least $0.01.");
});
