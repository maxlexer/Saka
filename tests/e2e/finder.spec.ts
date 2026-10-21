import { expect, test, type Page } from "@playwright/test";

const PROMPT = "Choose what feels right. We will show what is in store.";
const chip = (page: Page, group: string, name: string) =>
  page.locator("#finder").getByRole("group", { name: group }).getByRole("button", { name, exact: true });
const results = (page: Page) => page.locator('#finder a[href*="scent="]');

test("initial state shows the prompt and no results", async ({ page }) => {
  await page.goto("/#finder");
  await expect(page.locator("#finder").getByText(PROMPT)).toBeVisible();
  await expect(results(page)).toHaveCount(0);
});

test("chips filter with OR inside a group and AND across groups", async ({ page }) => {
  await page.goto("/");
  await chip(page, "Vibe", "Calm").click();
  await expect(page.locator("#finder").getByText(/^\d+ scents match$/)).toBeVisible();
  const calm = await results(page).count();
  expect(calm).toBeGreaterThan(0);

  await chip(page, "Vibe", "Fresh").click();
  await expect.poll(() => results(page).count()).toBeGreaterThan(calm);

  await chip(page, "Occasion", "Ceremony").click();
  await expect(chip(page, "Occasion", "Ceremony")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => results(page).count()).toBeLessThan(calm);
});

test("the selection is mirrored to the URL and restored on load", async ({ page }) => {
  await page.goto("/");
  await chip(page, "Vibe", "Calm").click();
  await expect(page).toHaveURL(/vibe=calm/);
  await page.reload();
  await expect(chip(page, "Vibe", "Calm")).toHaveAttribute("aria-pressed", "true");
  await expect(results(page).first()).toBeVisible();
});

test("an impossible combination offers close matches, and clear all resets", async ({ page }) => {
  await page.goto("/?vibe=romantic&occasion=everyday&family=fresh");
  const finder = page.locator("#finder");
  await expect(finder.getByText("Nothing matches all of that. Try removing one choice.")).toBeVisible();
  await expect(finder.getByRole("heading", { name: "Close matches" })).toBeVisible();
  await expect(results(page).first()).toBeVisible();
  await finder.getByRole("button", { name: "Clear all" }).click();
  await expect(finder.getByText(PROMPT)).toBeVisible();
  await expect(results(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/vibe=/);
});

test("a chip works with the keyboard and the count is announced politely", async ({ page }) => {
  await page.goto("/");
  const calm = chip(page, "Vibe", "Calm");
  await calm.focus();
  await page.keyboard.press("Space");
  await expect(calm).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#finder [aria-live=polite]")).toContainText(/scents? match/);
});

test("a result opens the product modal and keeps the selection", async ({ page }) => {
  await page.goto("/?vibe=calm");
  await results(page).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/vibe=calm.*scent=|scent=.*vibe=calm/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/\?vibe=calm$/);
});
