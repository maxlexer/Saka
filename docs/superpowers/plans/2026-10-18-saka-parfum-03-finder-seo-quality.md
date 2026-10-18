# SAKA Parfum Pass 3: Scent Finder, SEO, Dark Mode and Quality Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the scent finder to the home page, ship SEO (metadata, JSON-LD, sitemap, robots, social image, favicon), finish dark mode (with the hero stage kept on cream), and put hard numeric gates on accessibility, keyboard use, bundle size and Lighthouse.

**Architecture:** The finder is pure functions (`src/lib/finder.ts`, unit tested) plus one small client component that reads the catalog passed from the server and mirrors the selection to the URL with `history.replaceState` (no extra fetch, no `useSearchParams`, so the home page stays static). SEO is plain Next metadata files plus a tiny JSON-LD component. Quality gates are scripts and Playwright specs that fail the build when a number is missed.

**Tech Stack:** Next.js metadata API, Vitest, Playwright, `@axe-core/playwright`, `lighthouse` CLI, `sharp` (social image script).

**Spec:** `docs/superpowers/specs/2026-10-18-saka-parfum-design.md`, sections 8.9, 8.1 (dark mode), 9, 10, 12. Passes 1 and 2 must be complete.

## Global Constraints

Copied from `CLAUDE.md` and the spec. They apply to every task.

- Skeleton loaders for every loading state. No spinners, no blank screens.
- Code like a senior developer: less code where possible, no dead code, no needless abstractions or wrappers, no duplicated logic, no unused dependencies.
- No AI slop. No emoji as icons. No generic stock copy. No identical card grids with the same shadow and radius on everything.
- Never use em dashes anywhere. No exclamation marks in any copy. Avoid the non-null assertion operator followed by a space so `npm run check` stays reliable.
- English only. Palette only (light: #FAF6EE, #F2EBDF, #DCD0BF, #171A12, #8C7964, #AD9883, #685846, success #4F6B3A, error #A3392B; dark: #171A12, #23261C, #3A3A2C, #F5EFE4, #BDAE9B, success #8FB174, error #E07A6A). No #FFFFFF or #000000.
- Radius 2px, no pills, no gradients except the mist, no shadows except `0 8px 24px rgba(23,26,18,0.08)` on the cart drawer and modals. Icons are 1.5px line icons.
- GSAP only for animation, inside `useGSAP` with `gsap.matchMedia()` and `prefers-reduced-motion` respected.
- Exchange rate 1 USD = 4000 KHR, delivery $2.00, constants in code.
- Scent finder: three chip groups (Vibe, Occasion, Scent family), each chip a button with `aria-pressed`, outlined with 2px radius and a 1px #DCD0BF border, selected filled #171A12 with #FAF6EE text, focus ring 2px #8C7964. OR within a group, AND across groups, an empty group applies no filter. Results update on every toggle. Sort: available first, then number of matched tags, then `displayOrder`. Count line "4 scents match" or "1 scent matches" in `aria-live="polite"`. CLEAR ALL resets everything. The selection is mirrored to the URL query string. Initial state: "Choose what feels right. We will show what is in store." and no grid. No match: "Nothing matches all of that. Try removing one choice." then "Close matches" (the products matching the most groups). The finder lives on the home page only. It makes no extra fetch. If the catalog failed to load, show the shelf error and disable the chips.
- Dark mode via `prefers-color-scheme`. The hero stage and the intro stay on the cream tones because the bottle photography is shot on cream.
- Targets (mobile): Lighthouse Performance and Best Practices 90 or higher, Accessibility and SEO 95 or higher. LCP under 2.5s, CLS under 0.1, INP under 200ms. Initial JavaScript under 170KB gzipped, excluding the lazy mist chunk and the checkout routes. WCAG 2.2 AA. axe-core reports zero serious or critical issues.
- SEO: title "SAKA Parfum | Fragrance shop in Cambodia". Description under 160 characters. Open Graph and Twitter tags with a 1200 by 630 image on cream. JSON-LD `LocalBusiness` and a `Product` list without offers. Canonical URL, `sitemap.xml`, `robots.txt`. `/checkout` and `/api` are disallowed and `noindex`.
- Web design decisions go through `ui-ux-pro-max:ui-ux-pro-max` first. Load `gsap-skills:gsap-core` and `gsap-skills:gsap-react` before animation code. The brand brief wins.
- Report real numbers before claiming anything passes.
- Commits are small and conventional. Add the attribution trailer the session requires.

## File Structure

```
src/lib/finder.ts            filtering, sorting, close matches, URL query helpers
src/lib/jsonld.ts            localBusiness, productList builders
src/components/Finder.tsx, ShelfNotice.tsx, JsonLd.tsx, logo-paths.ts
src/app/robots.ts, sitemap.ts, icon.svg
src/app/(home)/page.tsx, layout.tsx, products/page.tsx, checkout pages   (modify)
src/app/globals.css          (modify) chip styles, light island
src/components/Hero.tsx, Header nav (nav.ts), Logo.tsx   (modify)
scripts/og-image.mjs, scripts/lighthouse.mjs
public/og.png
tests/unit/finder.test.ts, jsonld.test.ts
tests/e2e/finder.spec.ts, seo.spec.ts, keyboard.spec.ts, budget.spec.ts, a11y.spec.ts (modify)
```

---

### Task 1: Finder logic

**Files:**
- Create: `src/lib/finder.ts`
- Test: `tests/unit/finder.test.ts`

**Interfaces:**
- Consumes: `Product` (`sanity.ts`), taxonomy tuples and types.
- Produces: `type Selection = { vibes: Vibe[]; occasions: Occasion[]; families: ScentFamily[] }`, `EMPTY_SELECTION`, `isEmptySelection(sel): boolean`, `toggle<T>(list: T[], value: T): T[]`, `findMatches(products: Product[], sel: Selection): { matches: Product[]; close: Product[] }` (`close` is only filled when `matches` is empty and the selection is not empty), `parseSelection(params: URLSearchParams): Selection`, `selectionToQuery(sel: Selection): string` (returns `""` or `"?vibe=...&..."`).

- [ ] **Step 1: Write the failing tests**

`tests/unit/finder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EMPTY_SELECTION, findMatches, isEmptySelection, parseSelection, selectionToQuery, toggle } from "@/lib/finder";
import type { Product } from "@/lib/sanity";

const product = (id: string, over: Partial<Product> = {}) =>
  ({ id, name: id, vibes: [], occasions: [], scentFamily: [], available: true, displayOrder: 100, ...over }) as Product;

const rose = product("rose", { vibes: ["romantic", "calm"], occasions: ["date_night"], scentFamily: ["floral"], displayOrder: 20 });
const cedar = product("cedar", { vibes: ["calm", "earthy"], occasions: ["work", "everyday"], scentFamily: ["woody"], displayOrder: 10 });
const citrus = product("citrus", { vibes: ["fresh"], occasions: ["everyday"], scentFamily: ["citrus"], displayOrder: 30 });
const all = [rose, cedar, citrus];

describe("findMatches", () => {
  it("returns nothing for an empty selection", () => {
    expect(findMatches(all, EMPTY_SELECTION)).toEqual({ matches: [], close: [] });
  });
  it("uses OR within a group", () => {
    const { matches } = findMatches(all, { ...EMPTY_SELECTION, vibes: ["fresh", "romantic"] });
    expect(matches.map((p) => p.id).sort()).toEqual(["citrus", "rose"]);
  });
  it("uses AND across groups", () => {
    const { matches } = findMatches(all, { vibes: ["calm"], occasions: ["everyday"], families: [] });
    expect(matches.map((p) => p.id)).toEqual(["cedar"]);
  });
  it("sorts available first, then matched tags, then display order", () => {
    const sold = product("sold", { vibes: ["calm", "earthy"], displayOrder: 1, available: false });
    const two = product("two", { vibes: ["calm", "earthy"], displayOrder: 50 });
    const one = product("one", { vibes: ["calm"], displayOrder: 5 });
    const { matches } = findMatches([sold, one, two], { ...EMPTY_SELECTION, vibes: ["calm", "earthy"] });
    expect(matches.map((p) => p.id)).toEqual(["two", "one", "sold"]);
  });
  it("offers close matches (most groups matched) when nothing matches everything", () => {
    const sel = { vibes: ["calm"], occasions: ["date_night"], families: ["woody"] } as const;
    const { matches, close } = findMatches(all, { vibes: [...sel.vibes], occasions: [...sel.occasions], families: [...sel.families] });
    expect(matches).toEqual([]);
    expect(close.map((p) => p.id).sort()).toEqual(["cedar", "rose"]);
  });
  it("offers no close matches when no product matches any group", () => {
    expect(findMatches([citrus], { vibes: ["bold"], occasions: [], families: [] })).toEqual({ matches: [], close: [] });
  });
});

describe("selection helpers", () => {
  it("detects an empty selection", () => {
    expect(isEmptySelection(EMPTY_SELECTION)).toBe(true);
    expect(isEmptySelection({ ...EMPTY_SELECTION, vibes: ["calm"] })).toBe(false);
  });
  it("toggles a value in a list", () => {
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
  });
  it("round trips through the query string and ignores unknown values", () => {
    const sel = { vibes: ["calm", "fresh"], occasions: ["date_night"], families: [] } as const;
    const query = selectionToQuery({ vibes: [...sel.vibes], occasions: [...sel.occasions], families: [] });
    expect(parseSelection(new URLSearchParams(query))).toEqual({ vibes: ["calm", "fresh"], occasions: ["date_night"], families: [] });
    expect(parseSelection(new URLSearchParams("?vibe=calm,nonsense&family=woody"))).toEqual({ vibes: ["calm"], occasions: [], families: ["woody"] });
    expect(selectionToQuery(EMPTY_SELECTION)).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/finder.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/finder.ts`**

```ts
import type { Product } from "./sanity";
import { OCCASIONS, SCENT_FAMILIES, VIBES, type Occasion, type ScentFamily, type Vibe } from "./taxonomy";

export type Selection = { vibes: Vibe[]; occasions: Occasion[]; families: ScentFamily[] };
export const EMPTY_SELECTION: Selection = { vibes: [], occasions: [], families: [] };

const KEYS = ["vibes", "occasions", "families"] as const;
const tagsOf = (p: Product, key: keyof Selection): string[] => (key === "families" ? p.scentFamily : p[key]);

export const isEmptySelection = (sel: Selection) => KEYS.every((key) => sel[key].length === 0);
export const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function score(p: Product, sel: Selection) {
  let active = 0;
  let groups = 0;
  let tags = 0;
  for (const key of KEYS) {
    if (sel[key].length === 0) continue;
    active += 1;
    const hits = (sel[key] as string[]).filter((tag) => tagsOf(p, key).includes(tag)).length;
    if (hits > 0) groups += 1;
    tags += hits;
  }
  return { active, groups, tags };
}

const shelfOrder = (sel: Selection) => (a: Product, b: Product) =>
  Number(b.available) - Number(a.available) ||
  score(b, sel).tags - score(a, sel).tags ||
  a.displayOrder - b.displayOrder ||
  a.name.localeCompare(b.name);

export function findMatches(products: Product[], sel: Selection) {
  if (isEmptySelection(sel)) return { matches: [], close: [] };
  const scored = products.map((product) => ({ product, ...score(product, sel) }));
  const matches = scored.filter((s) => s.groups === s.active).map((s) => s.product).sort(shelfOrder(sel));
  if (matches.length > 0) return { matches, close: [] };
  const best = Math.max(...scored.map((s) => s.groups), 0);
  const close = best > 0 ? scored.filter((s) => s.groups === best).map((s) => s.product).sort(shelfOrder(sel)) : [];
  return { matches, close };
}

const pick = <T extends string>(raw: string | null, allowed: readonly T[]) =>
  (raw ?? "").split(",").filter((value): value is T => (allowed as readonly string[]).includes(value));

export const parseSelection = (params: URLSearchParams): Selection => ({
  vibes: pick(params.get("vibe"), VIBES),
  occasions: pick(params.get("occasion"), OCCASIONS),
  families: pick(params.get("family"), SCENT_FAMILIES),
});

export function selectionToQuery(sel: Selection) {
  const params = new URLSearchParams();
  if (sel.vibes.length) params.set("vibe", sel.vibes.join(","));
  if (sel.occasions.length) params.set("occasion", sel.occasions.join(","));
  if (sel.families.length) params.set("family", sel.families.join(","));
  const query = params.toString();
  return query ? `?${query}` : "";
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run tests/unit/finder.test.ts && npm run typecheck`
Expected: PASS.

```bash
git add src/lib/finder.ts tests/unit/finder.test.ts
git commit -m "feat: scent finder matching, sorting, close matches and URL helpers"
```

---

### Task 2: Finder UI and home integration

**Files:**
- Create: `src/components/Finder.tsx`, `src/components/ShelfNotice.tsx`
- Modify: `src/app/globals.css` (chip styles), `src/app/(home)/page.tsx`, `src/app/products/page.tsx`, `src/components/Hero.tsx`, `src/components/nav.ts`
- Test: `tests/e2e/finder.spec.ts`

**Interfaces:**
- Consumes: `findMatches`, `parseSelection`, `selectionToQuery`, `toggle`, `EMPTY_SELECTION`, `isEmptySelection`, `ProductGrid`, `LABELS`, taxonomy tuples.
- Produces: `Finder({ products: Product[] | null })`, `EmptyShelf()` and `ShelfError()` from `ShelfNotice.tsx`. Header nav gains Scent finder, hero gains FIND YOUR SCENT.

- [ ] **Step 1: Run the design skill**

Invoke `ui-ux-pro-max:ui-ux-pro-max` for the finder section (chip groups, result count, empty and no-match states, results grid on a #F2EBDF section). Cards on the same surface color rely on their 1px border, check that reads well. Append notes to `docs/design-notes.md`.

- [ ] **Step 2: Add chip styles to `globals.css`** (inside `@layer components`)

```css
  .chip {
    min-height: 44px; padding: 0 16px; border: 1px solid var(--border); border-radius: 2px;
    background: transparent; color: var(--text); font-size: 14px; letter-spacing: 0.02em;
    transition: background-color 250ms ease, color 250ms ease, border-color 250ms ease;
  }
  .chip:not(:disabled):hover { border-color: var(--secondary); }
  .chip[aria-pressed="true"] { background: var(--btn); color: var(--btn-text); border-color: var(--btn); }
  .chip:disabled { cursor: not-allowed; opacity: 0.5; }
```

- [ ] **Step 3: Write `ShelfNotice.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function EmptyShelf() {
  return (
    <p className="mx-auto mt-10 max-w-[62ch] text-muted">
      Our shelves are being restocked. <Link href="/#visit" className="link text-text">Visit us</Link> or message us for what is new.
    </p>
  );
}

export function ShelfError() {
  const router = useRouter();
  return (
    <div className="mx-auto mt-10 max-w-[62ch]">
      <p className="text-muted">We could not load our shelf just now. Please try again in a moment.</p>
      <button type="button" onClick={() => router.refresh()} className="btn btn-secondary mt-6">Try again</button>
    </div>
  );
}
```

- [ ] **Step 4: Write `Finder.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { EMPTY_SELECTION, findMatches, isEmptySelection, parseSelection, selectionToQuery, toggle, type Selection } from "@/lib/finder";
import type { Product } from "@/lib/sanity";
import { LABELS, OCCASIONS, SCENT_FAMILIES, VIBES } from "@/lib/taxonomy";
import { ProductGrid } from "./ProductGrid";
import { ShelfError } from "./ShelfNotice";

const GROUPS = [
  { key: "vibes", title: "Vibe", values: VIBES },
  { key: "occasions", title: "Occasion", values: OCCASIONS },
  { key: "families", title: "Scent family", values: SCENT_FAMILIES },
] as const;

export function Finder({ products }: { products: Product[] | null }) {
  const [sel, setSel] = useState<Selection>(EMPTY_SELECTION);

  useEffect(() => setSel(parseSelection(new URLSearchParams(window.location.search))), []);

  const change = (next: Selection) => {
    setSel(next);
    window.history.replaceState(null, "", `${window.location.pathname}${selectionToQuery(next)}${window.location.hash}`);
  };

  const { matches, close } = findMatches(products ?? [], sel);
  const empty = isEmptySelection(sel);
  const count = `${matches.length} ${matches.length === 1 ? "scent matches" : "scents match"}`;

  return (
    <div className="container text-center">
      <p className="eyebrow">Scent finder</p>
      <h2 id="finder-title" className="h2 mt-3">Tell us how you want to feel</h2>

      {products === null && <ShelfError />}

      <div className="mx-auto mt-10 max-w-3xl space-y-8">
        {GROUPS.map(({ key, title, values }) => (
          <div key={key} role="group" aria-labelledby={`finder-${key}`}>
            <h3 id={`finder-${key}`} className="eyebrow mb-3">{title}</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {values.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={products === null}
                  aria-pressed={(sel[key] as string[]).includes(value)}
                  onClick={() => change({ ...sel, [key]: toggle(sel[key] as string[], value) } as Selection)}
                  className="chip"
                >
                  {LABELS[value]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        <p aria-live="polite" className="text-muted">
          {empty ? "Choose what feels right. We will show what is in store." : count}
        </p>
        {!empty && (
          <button type="button" onClick={() => change(EMPTY_SELECTION)} className="link font-display text-[13px] font-medium uppercase tracking-[0.16em]">
            Clear all
          </button>
        )}
      </div>

      {!empty && matches.length > 0 && <ProductGrid products={matches} className="mt-10" />}
      {!empty && matches.length === 0 && products !== null && (
        <>
          <p className="mt-6 text-muted">Nothing matches all of that. Try removing one choice.</p>
          {close.length > 0 && (
            <>
              <h3 className="h3 mt-10">Close matches</h3>
              <ProductGrid products={close} className="mt-6" />
            </>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Wire the home page, hero, nav and products page**

`src/app/(home)/page.tsx`: fetch with `getCatalog().catch(() => null)`; render the preview as `products === null ? <ShelfError /> : products.length === 0 ? <EmptyShelf /> : <ProductGrid products={products.slice(0, 6)} ... />`; add the finder section between the collection and Visit us:

```tsx
<section id="finder" aria-labelledby="finder-title" className="section bg-surface">
  <FadeUp><Finder products={products} /></FadeUp>
</section>
```

`src/components/Hero.tsx`: add the second button after SHOP FRAGRANCES: `<a href="#finder" className="btn btn-secondary">Find your scent</a>`.

`src/components/nav.ts`: insert `{ href: "/#finder", label: "Scent finder" }` between Products and Visit us.

`src/app/products/page.tsx`: replace the inline restocking paragraph with `<EmptyShelf />` (remove the unused `Link` import).

- [ ] **Step 6: Write the e2e spec**

`tests/e2e/finder.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("initial state shows the prompt and no results", async ({ page }) => {
  await page.goto("/#finder");
  await expect(page.getByText("Choose what feels right. We will show what is in store.")).toBeVisible();
  await expect(page.locator("#finder article")).toHaveCount(0);
});

test("chips filter with OR inside a group and AND across groups", async ({ page }) => {
  await page.goto("/");
  const finder = page.locator("#finder");
  await finder.getByRole("button", { name: "Calm", exact: true }).click();
  await expect(finder.getByText(/\d+ scents? match/)).toBeVisible();
  const calm = await finder.locator("article").count();
  await finder.getByRole("button", { name: "Fresh", exact: true }).click();
  expect(await finder.locator("article").count()).toBeGreaterThanOrEqual(calm);
  await finder.getByRole("button", { name: "Gift", exact: true }).click();
  expect(await finder.locator("article").count()).toBeLessThanOrEqual(calm + 1);
  await expect(finder.getByRole("button", { name: "Gift", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("the selection is mirrored to the URL and restored on load", async ({ page }) => {
  await page.goto("/");
  await page.locator("#finder").getByRole("button", { name: "Calm", exact: true }).click();
  await expect(page).toHaveURL(/vibe=calm/);
  await page.reload();
  await expect(page.locator("#finder").getByRole("button", { name: "Calm", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#finder article").first()).toBeVisible();
});

test("clear all resets, and an impossible combination shows close matches", async ({ page }) => {
  await page.goto("/?vibe=bold&occasion=ceremony&family=musk");
  const finder = page.locator("#finder");
  await expect(finder.getByText("Nothing matches all of that. Try removing one choice.")).toBeVisible();
  await finder.getByRole("button", { name: "Clear all" }).click();
  await expect(finder.getByText("Choose what feels right. We will show what is in store.")).toBeVisible();
  await expect(page).not.toHaveURL(/vibe=/);
});

test("a selection works with the keyboard and the count is announced politely", async ({ page }) => {
  await page.goto("/");
  const chip = page.locator("#finder").getByRole("button", { name: "Calm", exact: true });
  await chip.focus();
  await page.keyboard.press("Space");
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#finder [aria-live=polite]")).toContainText(/scents? match/);
});
```

The mock catalog fixture's tags decide the exact counts. If an assertion depends on a count the fixture cannot satisfy, adjust the fixture (not the assertion's intent): the fixture must contain at least one product that matches `Calm` and one that is `Fresh` but not `Calm`, and no product that is `bold` with `ceremony` and `musk`.

- [ ] **Step 7: Run, look at it, commit**

Run: `npm run typecheck && npm test && npm run check && npm run test:e2e -- finder`
Expected: PASS. Screenshot the finder section at 390px and 1280px: chips wrap cleanly, 44px targets, selected chip clearly inverted.

```bash
git add src tests docs
git commit -m "feat: scent finder section on the home page"
```

---

### Task 3: SEO, social image and favicon

**Files:**
- Create: `src/components/logo-paths.ts`, `src/components/JsonLd.tsx`, `src/lib/jsonld.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/icon.svg`, `scripts/og-image.mjs`, `public/og.png`
- Modify: `src/components/Logo.tsx`, `src/app/layout.tsx`, `src/app/(home)/page.tsx`, `src/app/products/page.tsx`, `src/app/checkout/page.tsx`, `src/app/checkout/[orderId]/page.tsx`
- Test: `tests/unit/jsonld.test.ts`, `tests/e2e/seo.spec.ts`

**Interfaces:**
- Produces: `logo-paths.ts` exports `S`, `A`, `K` (path strings) and `PARFUM` (`{ x: number; d: string }[]`), moved out of `Logo.tsx` so the social image script reuses the same geometry. `localBusiness(settings: SiteSettings, siteUrl: string): object`, `productList(products: Product[], siteUrl: string): object`, `JsonLd({ data: object })`.

- [ ] **Step 1: Move the logo geometry to a plain module**

Create `src/components/logo-paths.ts` containing the four exports (`S`, `A`, `K`, `PARFUM`) cut from `Logo.tsx` with identical values, and change `Logo.tsx` to `import { A, K, PARFUM, S } from "./logo-paths";`. Run `npm run typecheck`. Nothing visual changes.

- [ ] **Step 2: Write the failing JSON-LD tests**

`tests/unit/jsonld.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { localBusiness, productList } from "@/lib/jsonld";
import type { Product, SiteSettings } from "@/lib/sanity";

const settings: SiteSettings = {
  storeName: "SAKA Parfum", address: "12 Sample Street, Phnom Penh", hours: [], phone: "+855 12 000 000",
  mapUrl: "https://maps.app.goo.gl/x", socialLinks: [{ label: "Instagram", url: "https://instagram.com/sakaparfum" }], stockUpdatedAt: null,
};

describe("localBusiness", () => {
  it("describes the shop", () => {
    expect(localBusiness(settings, "https://saka.example")).toMatchObject({
      "@type": "LocalBusiness", name: "SAKA Parfum", url: "https://saka.example", telephone: "+855 12 000 000",
      address: { "@type": "PostalAddress", streetAddress: "12 Sample Street, Phnom Penh", addressCountry: "KH" },
      hasMap: "https://maps.app.goo.gl/x", sameAs: ["https://instagram.com/sakaparfum"],
    });
  });
  it("omits an empty phone", () => {
    expect(JSON.parse(JSON.stringify(localBusiness({ ...settings, phone: "" }, "https://s.example")))).not.toHaveProperty("telephone");
  });
});

describe("productList", () => {
  it("lists products without offers", () => {
    const list = productList([{ name: "Jasmine Rain", description: "Jasmine.", image: { url: "https://cdn.sanity.io/a.png", alt: "x" } } as Product], "https://s.example") as {
      itemListElement: { position: number; item: Record<string, unknown> }[];
    };
    expect(list.itemListElement[0]).toMatchObject({ position: 1, item: { "@type": "Product", name: "Jasmine Rain", image: "https://cdn.sanity.io/a.png" } });
    expect(JSON.stringify(list)).not.toContain("offers");
  });
});
```

- [ ] **Step 3: Run to verify failure, then write the builders**

Run: `npx vitest run tests/unit/jsonld.test.ts` (FAIL), then create `src/lib/jsonld.ts`:

```ts
import type { Product, SiteSettings } from "./sanity";

const CONTEXT = "https://schema.org";

export const localBusiness = (s: SiteSettings, siteUrl: string) => ({
  "@context": CONTEXT,
  "@type": "LocalBusiness",
  name: s.storeName,
  url: siteUrl,
  image: `${siteUrl}/og.png`,
  telephone: s.phone || undefined,
  address: { "@type": "PostalAddress", streetAddress: s.address, addressCountry: "KH" },
  hasMap: s.mapUrl,
  sameAs: s.socialLinks.map((link) => link.url),
});

export const productList = (products: Product[], siteUrl: string) => ({
  "@context": CONTEXT,
  "@type": "ItemList",
  itemListElement: products.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Product",
      name: p.name,
      description: p.description,
      image: p.image.url.startsWith("http") ? p.image.url : `${siteUrl}${p.image.url}`,
      brand: { "@type": "Brand", name: "SAKA Parfum" },
    },
  })),
});
```

Run `npx vitest run tests/unit/jsonld.test.ts` (PASS).

- [ ] **Step 4: Write `JsonLd.tsx`**

```tsx
/** Server only. Data comes from our own builders, and `<` is escaped so a value can never close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
```

- [ ] **Step 5: Metadata, robots, sitemap**

`src/app/layout.tsx`: replace the `metadata` export with:

```tsx
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description = "Fragrance in 10ml, 20ml and 50ml bottles from SAKA Parfum, a perfume shop in Cambodia. Find a scent by mood or occasion.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "SAKA Parfum | Fragrance shop in Cambodia", template: "%s | SAKA Parfum" },
  description,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "SAKA Parfum", title: "SAKA Parfum | Fragrance shop in Cambodia", description, images: [{ url: "/og.png", width: 1200, height: 630, alt: "SAKA Parfum" }] },
  twitter: { card: "summary_large_image", title: "SAKA Parfum | Fragrance shop in Cambodia", description, images: ["/og.png"] },
};
```

The description is under 160 characters (count it: it must be 160 or fewer). In `products/page.tsx` set `export const metadata = { title: "Products", alternates: { canonical: "/products" } };`. In the checkout pages change titles to `"Checkout"` and `"Payment"` (the template adds the brand) and keep `robots: { index: false, follow: false }`.

`src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/checkout", "/api"] }, sitemap: `${site}/sitemap.xml` };
}
```

`src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return ["", "/products"].map((path) => ({ url: `${site}${path}` }));
}
```

- [ ] **Step 6: JSON-LD on the pages**

Home page: render `<JsonLd data={localBusiness(settings, siteUrl)} />` at the top of the fragment (define `siteUrl` from `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`). Products page: render `<JsonLd data={productList(products, siteUrl)} />` before the section. To avoid repeating `siteUrl` three times, export it once from a new line in `src/lib/jsonld.ts`: `export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";` and import it in `layout.tsx`, `robots.ts`, `sitemap.ts` and the pages.

- [ ] **Step 7: Social image and favicon**

`scripts/og-image.mjs` (1200 by 630, cream, the real logo geometry):

```js
import sharp from "sharp";
import { A, K, PARFUM, S } from "../src/components/logo-paths.ts";

const INK = "#171A12";
const parfum = PARFUM.map(({ x, d }) => `<path d="${d}" transform="translate(${x} 0)"/>`).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FAF6EE"/>
  <g transform="translate(320 223) scale(2.8)">
    <path d="${S}" fill="none" stroke="${INK}" stroke-width="5"/>
    <path d="${A}" fill="${INK}" fill-rule="evenodd"/>
    <path d="${K}" fill="${INK}"/>
    <path d="${A}" fill="${INK}" fill-rule="evenodd" transform="translate(113 0)"/>
    <g transform="translate(0 53.6)" fill="none" stroke="${INK}" stroke-width="1.3">${parfum}</g>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/og.png");
console.log("wrote public/og.png");
```

Run `node scripts/og-image.mjs` (Node 24 imports the `.ts` file directly). Open `public/og.png` and check the logo is centered with plenty of cream space.

`src/app/icon.svg` (hand-built S on cream, uses the same S path as `logo-paths.ts`; copy its value):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#FAF6EE"/>
  <path transform="translate(15.2 8) scale(1.2)" d="M25.5 8C22.5 4.5 18.5 2.5 13.5 2.5C7 2.5 2.8 6 2.8 10.2C2.8 15 7.5 16.5 13.5 18.3C19.8 20.2 25.5 22 25.5 29C25.5 34 20.5 37.5 14 37.5C8.5 37.5 4.5 35.5 2.5 32" fill="none" stroke="#171A12" stroke-width="5"/>
</svg>
```

If Step 4 of Pass 1 changed the S path while matching the reference, paste the final value here.

- [ ] **Step 8: Write the SEO e2e spec**

`tests/e2e/seo.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("home has the right title, a short description, canonical and social tags", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("SAKA Parfum | Fragrance shop in Cambodia");
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description!.length).toBeLessThanOrEqual(160);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/$/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
});

test("home carries LocalBusiness and products carries a Product list", async ({ page }) => {
  await page.goto("/");
  const home = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(home["@type"]).toBe("LocalBusiness");
  await page.goto("/products");
  const list = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(list["@type"]).toBe("ItemList");
  expect(list.itemListElement.length).toBeGreaterThan(0);
});

test("robots and sitemap", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /checkout");
  expect(robots).toContain("Disallow: /api");
  expect(robots).toContain("Sitemap:");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/products");
  expect(sitemap).not.toContain("/checkout");
});

test("checkout is noindex", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
```

- [ ] **Step 9: Run and commit**

Run: `npm run typecheck && npm test && npm run check && npm run test:e2e -- seo`
Expected: PASS. Also confirm `/icon.svg` returns 200 in the dev server.

```bash
git add src scripts public tests
git commit -m "feat: metadata, json-ld, robots, sitemap, social image and favicon"
```

---

### Task 4: Dark mode completion

**Files:**
- Modify: `src/app/globals.css`, `src/components/Hero.tsx`
- Test: `tests/e2e/a11y.spec.ts` (dark-mode checks)

**Interfaces:**
- Produces: a `.light-island` class that re-declares the light tokens for a subtree, so the hero stage stays on cream in dark mode (spec assumption 3).

- [ ] **Step 1: Run the design skill**

Invoke `ui-ux-pro-max:ui-ux-pro-max` for dark mode (surface hierarchy on #171A12 and #23261C, the cream hero island, badge contrast). Append notes to `docs/design-notes.md`.

- [ ] **Step 2: Add the light island**

In `globals.css`, directly after the `@media (prefers-color-scheme: dark) { :root { ... } }` block and OUTSIDE any `@layer` (unlayered rules beat layered ones, which is what lets this override the dark tokens):

```css
.light-island {
  --bg: #faf6ee;
  --surface: #f2ebdf;
  --border: #dcd0bf;
  --text: #171a12;
  --muted: #685846;
  --secondary: #8c7964;
  --accent: #ad9883;
  --btn: #171a12;
  --btn-text: #faf6ee;
  background: var(--bg);
  color: var(--text);
}
```

In `Hero.tsx` add `light-island` to the `<section>` class list. The hero keeps the cream stage and the cream-shot bottle frames in dark mode, and every header, section and card below it follows the dark tokens.

- [ ] **Step 3: Verify dark mode with axe and screenshots**

Extend `tests/e2e/a11y.spec.ts` so the dark-scheme test loops over `["/", "/products", "/checkout", "/nope"]` and uses `.withTags(["wcag2a", "wcag2aa", "wcag22aa"])`. Then take dark screenshots of `/` and `/products` at 390px and 1280px (`colorScheme: "dark"` context) and look at them: hero is cream with dark text, everything else dark, borders visible, the cart badge is #AD9883 with #171A12 text, status colors readable (success #8FB174, error #E07A6A).

Run: `npm run test:e2e -- a11y`
Expected: PASS. Fix real contrast findings by adjusting which token a component uses, never by introducing a new color.

- [ ] **Step 4: Commit**

```bash
git add src tests docs
git commit -m "feat: complete dark mode with a cream hero stage"
```

---

### Task 5: Keyboard, accessibility and screen reader pass

**Files:**
- Create: `tests/e2e/keyboard.spec.ts`
- Modify: `tests/e2e/a11y.spec.ts`, `tests/e2e/checkout.spec.ts`; any component the tests find broken

**Interfaces:** none new.

- [ ] **Step 1: Write the keyboard spec**

`tests/e2e/keyboard.spec.ts`:

```ts
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
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(cart).toBeFocused();
});

test("the mobile menu traps focus and restores it", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The menu button only exists below 1024px");
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu" });
  await menu.tap();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menu).toBeFocused();
});

test("a product card toggles with Enter and Space and closes with Escape", async ({ page }) => {
  await page.goto("/products");
  const toggle = page.locator("article").first().getByRole("button").first();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Space");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("every interactive control meets the 44px touch target", async ({ page }) => {
  await page.goto("/products");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("a, button, input, select, textarea")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && !el.closest("[hidden]") && !el.classList.contains("sr-only") && !el.closest(".skip-link") && !(el.matches("a") && el.closest("p, li, address, dd") && getComputedStyle(el).display === "inline");
      })
      .filter((el) => el.getBoundingClientRect().height < 44 && el.getBoundingClientRect().width < 44)
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(small).toEqual([]);
});
```

- [ ] **Step 2: Add axe to every route and state**

In `tests/e2e/a11y.spec.ts` the path list becomes `["/", "/products", "/checkout", "/nope"]`. In `tests/e2e/checkout.spec.ts` add (desktop only, like the rest) a test that calls `reachPayment(page, "pickup")` and runs axe on the payment screen, then calls `payAndTrigger(page)`, waits for the order number heading, and runs axe again with the Telegram popup open. Both must have zero serious or critical violations.

- [ ] **Step 3: Run, fix, repeat**

Run: `npm run test:e2e -- keyboard a11y checkout`
Expected: PASS. Failures are real accessibility bugs. Typical fixes: a missing accessible name on an icon button, a focus ring hidden by `overflow-hidden` on the card panel, `aria-controls` pointing at a `hidden` element (acceptable, but verify axe agrees), small hit areas on text links in the footer (give them `min-h-11 inline-flex items-center`).

Then do one manual screen reader pass with NVDA or VoiceOver on `/`, `/products` and the payment screen. Record in `docs/design-notes.md`: heading order is one H1 then H2 then H3, landmarks (header, nav, main, footer) are announced, the finder count and payment status are announced politely, the Telegram popup announces its title and traps focus.

- [ ] **Step 4: Commit**

```bash
git add tests src docs
git commit -m "test: keyboard, touch target and accessibility coverage across routes and states"
```

---

### Task 6: Bundle budget and Lighthouse gates

**Files:**
- Create: `tests/e2e/budget.spec.ts`, `scripts/lighthouse.mjs`
- Modify: `package.json` (script and dev dependency)

**Interfaces:**
- Produces: `npm run lighthouse -- <baseUrl>` which prints a table and exits non-zero when a threshold is missed.

- [ ] **Step 1: Write the bundle budget spec**

`tests/e2e/budget.spec.ts`:

```ts
import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const BUDGET_BYTES = 170 * 1024;

for (const path of ["/", "/products"]) {
  test(`initial JavaScript on ${path} stays under 170KB gzipped`, async ({ page }) => {
    const sizes: number[] = [];
    page.on("response", async (response) => {
      if (response.request().resourceType() !== "script") return;
      const body = await response.body().catch(() => null);
      if (body) sizes.push(gzipSync(body).length);
    });
    await page.goto(path, { waitUntil: "load" });
    await page.waitForLoadState("networkidle");
    const total = sizes.reduce((sum, n) => sum + n, 0);
    console.log(`${path}: ${(total / 1024).toFixed(1)}KB gzipped across ${sizes.length} scripts`);
    expect(total).toBeLessThan(BUDGET_BYTES);
  });
}
```

Pass 4 will exclude the lazy mist chunk from this sum (it identifies it by its WebGL code). Until then there is no such chunk.

- [ ] **Step 2: Install Lighthouse and write the runner**

```bash
npm install -D lighthouse
```

`scripts/lighthouse.mjs`:

```js
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3100";
const paths = ["/", "/products"];
const MIN = { performance: 90, accessibility: 95, "best-practices": 90, seo: 95 };
const MAX = { "largest-contentful-paint": 2500, "cumulative-layout-shift": 0.1, "total-blocking-time": 200 };
const dir = mkdtempSync(join(tmpdir(), "saka-lh-"));
let failed = false;

for (const path of paths) {
  const out = join(dir, `${path.replace(/\W/g, "_") || "home"}.json`);
  execFileSync(
    "npx",
    ["lighthouse", `${base}${path}`, "--quiet", "--output=json", `--output-path=${out}`, "--chrome-flags=--headless=new", "--only-categories=performance,accessibility,best-practices,seo"],
    { stdio: "inherit", shell: true },
  );
  const { categories, audits } = JSON.parse(readFileSync(out, "utf8"));
  console.log(`\n${base}${path}`);
  for (const [id, min] of Object.entries(MIN)) {
    const score = Math.round(categories[id].score * 100);
    const ok = score >= min;
    failed ||= !ok;
    console.log(`  ${ok ? "pass" : "FAIL"} ${id}: ${score} (min ${min})`);
  }
  for (const [id, max] of Object.entries(MAX)) {
    const value = audits[id].numericValue;
    const ok = value <= max;
    failed ||= !ok;
    console.log(`  ${ok ? "pass" : "FAIL"} ${id}: ${value.toFixed(id === "cumulative-layout-shift" ? 3 : 0)} (max ${max})`);
  }
}
process.exit(failed ? 1 : 0);
```

Lab tools do not measure INP, so total blocking time under 200ms is the lab proxy. Real INP is checked in the field after launch (Vercel Speed Insights or Chrome UX Report).

Add `"lighthouse": "node scripts/lighthouse.mjs"` to `package.json` scripts.

- [ ] **Step 3: Run the gates**

```bash
npm run build && npm run test:e2e -- budget
```

Then start the e2e server in one terminal (`node tests/e2e-server.mjs`) and run `npm run lighthouse` in another. Expected: every line says `pass`. If a threshold fails, fix the cause (image sizes and `sizes` attributes, font preloading, render-blocking CSS, unused JavaScript, missing `alt`, tap targets), never loosen a threshold. Record the real numbers in `docs/design-notes.md`.

Run it again later against the Vercel preview deployment with real Sanity data and keep both result sets. Numbers on a local server are optimistic, the deployed run is the one that counts.

- [ ] **Step 4: Commit**

```bash
git add tests scripts package.json package-lock.json docs
git commit -m "test: bundle budget spec and lighthouse threshold runner"
```

---

### Task 7: Pass 3 verification and handoff

- [ ] **Step 1: Run every gate**

```bash
npm run typecheck && npm test && npm run check && npm run build && npm run test:e2e
```

Expected: PASS. Report real output, including the Lighthouse table and the bundle size line.

- [ ] **Step 2: Repository hygiene check**

Run `npm run check` once more and also `git grep -nI -E "TODO|FIXME|console\.log" -- src` (expected: no hits in `src`). Run `npx knip`-style manual review of dependencies: every package in `package.json` is imported somewhere or used by a script.

- [ ] **Step 3: Push and request review**

```bash
git push
```

Invoke `superpowers:requesting-code-review`. Wait for approval before Pass 4 (`2026-10-18-saka-parfum-04-intro-hero-mist.md`).
