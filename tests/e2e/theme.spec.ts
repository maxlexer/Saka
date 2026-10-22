import { expect, test } from "@playwright/test";

test("starts light even when the device prefers dark", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/products");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(250, 246, 238)");
  await context.close();
});

test("the header switch toggles dark, reports its state and is kept for the tab", async ({ page }) => {
  await page.goto("/products");
  const toggle = page.getByRole("button", { name: "Dark mode" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(23, 26, 18)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Dark mode" }).click();
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

test("a new tab always starts light, even after dark was chosen", async ({ context }) => {
  const first = await context.newPage();
  await first.goto("/products");
  await first.getByRole("button", { name: "Dark mode" }).click();
  await expect(first.locator("html")).toHaveAttribute("data-theme", "dark");
  const second = await context.newPage();
  await second.goto("/products");
  await expect(second.locator("html")).not.toHaveAttribute("data-theme", "dark");
});

test("a dark choice applies on reload before any script bundle runs, so there is no light flash", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("saka.theme", "dark"));
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/products");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
