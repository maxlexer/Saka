import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addFirstProduct, FIRST, insertPaidOrders, resetAll, signIn } from "./helpers";

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
  await expect(row.getByLabel(/^Name/)).toHaveValue("Davidoff Cool Water Test");

  await page.goto("/products?scent=cool-water");
  const dialog = page.getByRole("dialog", { name: "Davidoff Cool Water Test" });
  await expect(dialog.getByText("Out of stock", { exact: true })).toBeVisible();

  await page.goto("/admin");
  await rowFor(page, "cool-water").locator(".switch").click();
  await rowFor(page, "cool-water").getByLabel(/^Name/).fill("Davidoff Cool Water");
  await rowFor(page, "cool-water").getByRole("button", { name: "Save" }).click();
  await expect(rowFor(page, "cool-water").getByRole("status")).toHaveText("Saved");
});

test("a price change reaches the storefront and the checkout total, then is restored", async ({ page }) => {
  await signIn(page);
  const prices = page.locator("form", { hasText: "Save prices" });
  await prices.getByLabel("10ml, USD").fill("13.50");
  await prices.getByRole("button", { name: "Save prices" }).click();
  await expect(prices.getByRole("status")).toHaveText("Saved");
  await page.goto(`/products?scent=${FIRST.slug}`);
  await expect(page.getByRole("dialog").getByRole("radio", { name: "10ml, $13.50" })).toBeAttached();
  await addFirstProduct(page);
  await page.goto("/checkout");
  await expect(page.getByRole("main")).toContainText("$13.50");

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
  await expect(prices.getByLabel("10ml, USD")).toHaveValue("0");
});

test("transactions show zero totals and an empty state when nothing is paid", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Transactions" })).toBeVisible();
  await expect(page.getByText("Today")).toBeVisible();
  await expect(page.getByText("$0.00").first()).toBeVisible();
  await expect(page.getByText("No paid orders yet.")).toBeVisible();
});

test("transactions total today and this month, list orders newest first and hide scrubbed details", async ({ page }) => {
  await insertPaidOrders([
    { order_number: 1001, paid_at: new Date(Date.now() - 40 * 86_400_000).toISOString(), customer_name: null, telegram: null, fulfilment: "pickup", map_url: null, items: [{ productId: FIRST.slug, name: FIRST.name, sizeMl: 10, priceUsd: 12, qty: 1 }], subtotal_usd: 12, delivery_fee_usd: 0, total_usd: 12 },
    { order_number: 1002, paid_at: new Date().toISOString(), customer_name: "Sokha Chan", telegram: "+855 12 345 678", fulfilment: "delivery", map_url: "https://maps.app.goo.gl/abc123", items: [{ productId: FIRST.slug, name: FIRST.name, sizeMl: 20, priceUsd: 22, qty: 2 }], subtotal_usd: 44, delivery_fee_usd: 2, total_usd: 46 },
  ]);
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
  await page.goto("/admin/transactions");
  for (const label of ["Today", "This month"]) {
    await expect(page.locator("dl > div", { hasText: label })).toContainText("$46.00");
    await expect(page.locator("dl > div", { hasText: label })).toContainText("1 paid order");
  }
  const main = page.getByRole("main");
  await expect(main).toContainText("Sokha Chan, +855 12 345 678");
  await expect(main).toContainText(`${FIRST.name}, 20ml x2`);
  await expect(main.getByRole("link", { name: "open map" })).toHaveAttribute("href", "https://maps.app.goo.gl/abc123");
  await expect(main).toContainText("Details removed");
  const text = await main.innerText();
  expect(text.indexOf("SK-1002")).toBeLessThan(text.indexOf("SK-1001"));

  await page.goto("/admin/transactions?page=9");
  await expect(page).toHaveURL(/\/admin\/transactions$/);
});

test("axe finds no serious or critical issues on the admin pages", async ({ page }) => {
  const check = async () => {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  };
  await page.goto("/admin/login");
  await check();
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
  await check();
  await page.goto("/admin/transactions");
  await check();
});
