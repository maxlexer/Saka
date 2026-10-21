import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { SOLD_OUT } from "./helpers";

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

test("axe finds no serious issues with the product modal open, in both themes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // no tweens, so contrast is measured on the final state
  for (const dark of [false, true]) {
    if (dark) await page.addInitScript(() => localStorage.setItem("saka.theme", "dark"));
    await page.goto(`/products?scent=${SOLD_OUT.slug}`);
    await expect(page.getByRole("dialog", { name: SOLD_OUT.name })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  }
});

test("axe finds no serious issues with the cart open", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // no tweens, so contrast is measured on the final state
  await page.goto("/products");
  await page.getByRole("button", { name: /Open cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
