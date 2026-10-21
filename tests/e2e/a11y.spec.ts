import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FIRST } from "./helpers";

for (const path of ["/", "/products", "/nope"]) {
  test(`axe finds no serious or critical issues on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });
}

test("dark theme keeps the same structure and passes axe", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("saka.theme", "dark"));
  await page.goto("/products");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("axe finds no serious issues with a card expanded", async ({ page }) => {
  await page.goto("/products");
  await page.locator("article").nth(0).getByRole("button").first().click();
  await expect(page.getByRole("region", { name: `${FIRST.name} details` })).toBeVisible();
  await page.waitForTimeout(500); // let the 400ms expand tween finish before measuring contrast
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("axe finds no serious issues with the cart open", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: /Open cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toBeVisible();
  await page.waitForTimeout(900); // let the 700ms drawer tween finish before measuring contrast
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
