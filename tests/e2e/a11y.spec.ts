import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/products", "/nope"]) {
  test(`axe finds no serious or critical issues on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });
}

test("dark scheme keeps the same structure and passes axe", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/products");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  await context.close();
});

test("axe finds no serious issues with a card expanded", async ({ page }) => {
  await page.goto("/products");
  await page.locator("article").nth(0).getByRole("button").first().click();
  await expect(page.getByRole("region", { name: "Jasmine Rain details" })).toBeVisible();
  await page.waitForTimeout(500); // let the 400ms expand tween finish before measuring contrast
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("axe finds no serious issues with the cart open", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: /Open cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toBeVisible();
  await page.waitForTimeout(500); // let the 300ms drawer tween finish before measuring contrast
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
