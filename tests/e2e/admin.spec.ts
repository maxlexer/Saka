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
