import { expect, test } from "@playwright/test";

test("the skip link is the first tab stop and jumps to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("the cart drawer opens by keyboard, traps focus, closes on Escape and returns focus", async ({ page }) => {
  await page.goto("/");
  const cart = page.getByRole("button", { name: /Open cart/ });
  await cart.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Cart" });
  await expect(dialog).toBeVisible();
  // A native modal dialog makes the page inert. Tab cycles the dialog and the browser's own toolbar
  // (seen here as body), so focus must never land on page content behind it.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement?.closest("dialog") !== null)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(cart).toBeFocused();
});

test("the mobile menu closes on Escape and restores focus", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The menu button only exists below 1024px");
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu" });
  await menu.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menu).toBeFocused();
});

for (const path of ["/", "/products"]) {
  test(`every interactive control on ${path} is at least 44px in both directions`, async ({ page }) => {
    await page.goto(path);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("a, button, input, select, textarea")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const inlineTextLink = el.matches("a") && el.closest("p, li, address, dd") !== null && style.display === "inline";
          return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && !el.closest(".skip-link") && !inlineTextLink;
        })
        .filter((el) => {
          // `.tap` widens the hit area (12px top and bottom, 8px each side) with a pseudo element getBoundingClientRect cannot see.
          const r = el.getBoundingClientRect();
          const tap = el.classList.contains("tap");
          return r.height + (tap ? 24 : 0) < 44 || r.width + (tap ? 16 : 0) < 44;
        })
        .map((el) => el.outerHTML.slice(0, 80)),
    );
    expect(small).toEqual([]);
  });
}
