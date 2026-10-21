import { expect, test } from "@playwright/test";
import { FIRST, SOLD_OUT } from "./helpers";

const card = (page: import("@playwright/test").Page, slug: string) => page.locator(`main a[href="/products?scent=${slug}"]`).first();

test("a card opens the modal in place, the URL can be shared, and Back closes it", async ({ page }) => {
  await page.goto("/products");
  await card(page, FIRST.slug).click();
  const dialog = page.getByRole("dialog", { name: FIRST.name });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/products\\?scent=${FIRST.slug}$`));
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(FIRST.name);
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/products$/);
});

test("the home preview opens the modal on the home page", async ({ page }) => {
  await page.goto("/");
  await page.locator('#collection a[href*="scent="]').first().click();
  await expect(page).toHaveURL(/^http:\/\/localhost:3100\/\?scent=/);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("a shared link opens straight on the perfume, and Close removes the parameter", async ({ page }) => {
  await page.goto(`/products?scent=${FIRST.slug}`);
  const dialog = page.getByRole("dialog", { name: FIRST.name });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/products$/);
});

test("an unknown scent is ignored", async ({ page }) => {
  await page.goto("/products?scent=nope");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("out of stock shows one pill and a disabled button, and nothing else", async ({ page }) => {
  await page.goto(`/products?scent=${SOLD_OUT.slug}`);
  const dialog = page.getByRole("dialog", { name: SOLD_OUT.name });
  const pill = dialog.getByText("Out of stock", { exact: true });
  await expect(pill).toHaveCount(1);
  expect(await pill.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).not.toBe("0px");
  const button = dialog.getByRole("button", { name: /^Add to cart/ });
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-describedby", (await pill.getAttribute("id")) ?? "missing");
  await expect(dialog.locator("svg")).toHaveCount(3); // close, fewer, more: no warning icon
  await expect(dialog.locator(".text-error")).toHaveCount(0);
});

test("sizes, quantity and price live in the modal and add to the cart", async ({ page }) => {
  await page.goto(`/products?scent=${FIRST.slug}`);
  const dialog = page.getByRole("dialog", { name: FIRST.name });
  await dialog.getByText("20ml", { exact: true }).click();
  await dialog.getByRole("button", { name: "More" }).click();
  await expect(dialog.getByRole("button", { name: "Add to cart, $44.00" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Add to cart, $44.00" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Added to cart.");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Open cart, 2 items/ })).toBeVisible();
  await page.getByRole("button", { name: /Open cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toContainText(`${FIRST.name}, 20ml`);
});

test("keyboard: Enter opens, focus starts on Close, Escape closes and returns focus to the card", async ({ page }) => {
  await page.goto("/products");
  await card(page, FIRST.slug).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: FIRST.name });
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(card(page, FIRST.slug)).toBeFocused();
});

test("a perfume whose card is hidden opens without growing from a point", async ({ page, isMobile }) => {
  test.skip(isMobile, "The fourth home pick is only hidden on desktop");
  await page.goto("/?scent=sauvage-edt"); // fourth round robin pick, hidden on desktop
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(150);
  const smallestScale = await page.evaluate(() => {
    let el = document.querySelector("dialog[open] img")?.parentElement ?? null;
    let min = 1;
    while (el && el.tagName !== "DIALOG") {
      const t = getComputedStyle(el).transform;
      if (t !== "none") min = Math.min(min, new DOMMatrix(t).a);
      el = el.parentElement;
    }
    return min;
  });
  expect(smallestScale).toBeGreaterThan(0.5);
});

test("the backdrop fades out with the dialog instead of snapping off at the end", async ({ page }) => {
  await page.goto(`/products?scent=${FIRST.slug}`);
  await expect(page.getByRole("dialog", { name: FIRST.name })).toBeVisible();
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const backdrop = await page.evaluate(() => {
    const dialog = document.querySelector("dialog[open]");
    return dialog ? getComputedStyle(dialog, "::backdrop").backgroundColor : null;
  });
  expect(backdrop, "the dialog should still be closing").not.toBeNull();
  const alpha = Number(backdrop?.match(/[\d.]+(?=\)$)/)?.[0] ?? 1);
  expect(alpha).toBeLessThan(0.25);
});

test("clicking the backdrop closes the modal", async ({ page }) => {
  await page.goto(`/products?scent=${FIRST.slug}`);
  const dialog = page.getByRole("dialog", { name: FIRST.name });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(800);
  await page.mouse.click(4, 4);
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/products$/);
});

test("with reduced motion the modal never loads a spin sprite", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const sprites: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("spin.webp")) sprites.push(request.url());
  });
  await page.goto(`/products?scent=${FIRST.slug}`);
  await expect(page.getByRole("dialog", { name: FIRST.name })).toBeVisible();
  await page.waitForTimeout(3000);
  expect(sprites).toEqual([]);
});
