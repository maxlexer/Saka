# SAKA Parfum Pass 1: Foundation, Catalog and Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browsable, cart-enabled storefront: tokens, fonts, logo, header, footer, Sanity catalog, product cards, `/products`, home with static hero, preview cards and Visit us, 404, skeletons, and a client-side cart drawer. No payment yet.

**Architecture:** Next.js App Router, server components fetch Sanity through one validated module (`src/lib/sanity.ts`) with ISR. Interactive pieces (card, cart, modals) are small client components. All animation goes through one `src/lib/gsap.ts` module and `useGSAP` with `gsap.matchMedia()`. Modals use the native `<dialog>` element (focus trap, Escape and focus return for free).

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS v4, GSAP and `@gsap/react`, Zod, `@sanity/client`, `sanity` (Studio, dev only), Vitest, Playwright, `@axe-core/playwright`, `sharp` (script only).

**Spec:** `docs/superpowers/specs/2026-10-18-saka-parfum-design.md` (read it and `CLAUDE.md` first; `CLAUDE.md` wins on any conflict).

## Global Constraints

These apply to every task in every pass. Copied from `CLAUDE.md` and the spec.

- Skeleton loaders for every loading state (pages, lists, cards, images, data fetches). No spinners, no blank screens. Skeletons match the final layout so nothing shifts.
- Code like a senior developer: less code where the same result is possible, no dead code, no needless abstractions or wrappers, no duplicated logic, no unused dependencies.
- No AI slop: no default purple or blue gradients, no emoji as icons, no generic stock copy, no identical card grids with the same shadow and radius on everything, no filler sections.
- Never use em dashes anywhere (copy, headings, alt text, code comments). Use commas, periods or colons.
- No exclamation marks in any copy. Avoid the non-null assertion operator `!` followed by a space so the grep check stays reliable.
- English only. No Khmer, no language toggle, no i18n layer.
- Exchange rate: 1 USD = 4000 KHR, a fixed constant in code (`RIEL_PER_USD = 4000`). Riel is `round(usd * 4000 / 100) * 100`, shown for information. Delivery fee is the constant $2.00 (`DELIVERY_FEE_USD = 2`).
- Palette only. Light: bg #FAF6EE, surface #F2EBDF, border #DCD0BF, text and primary #171A12, secondary #8C7964, accent #AD9883, muted #685846, success #4F6B3A, error #A3392B. Dark: bg #171A12, surface #23261C, border #3A3A2C, text #F5EFE4, muted #BDAE9B, primary button #F5EFE4 on #171A12 text, secondary #AD9883, accent #8C7964, success #8FB174, error #E07A6A. No #FFFFFF or #000000. Never use #AD9883 or #8C7964 for small text on cream.
- Type: Montserrat 400 and 500 (headings, logo-style labels, buttons, eyebrows), Jost 400 and 500 (body, UI), via `next/font`. No heading weight above 500.
- Radius 2px on buttons, inputs and cards. Product images 0px. No radius above 4px, no pills. No shadows except `0 8px 24px rgba(23,26,18,0.08)` on the open cart drawer and modals. No gradients except the mist.
- Icons: inline 1.5px stroke line icons, square caps, 24px, `currentColor`. No filled or multicolor icons.
- Motion: GSAP only (`gsap`, `@gsap/react`). No Motion, Framer Motion or other animation library. Every GSAP animation respects `prefers-reduced-motion` via `gsap.matchMedia()`. Product card hover: image scales 1.03 over 400ms ease-out, border becomes #8C7964. Primary buttons invert over 250ms. Links get a 1px underline growing from the left over 300ms. Sections fade up 12px over 500ms.
- Layout: base unit 8px, section padding 96px desktop and 56px mobile, card padding 24px, content max width 1200px, text blocks max 62ch.
- Copy: short sentences (12 words or fewer where possible), warm second person, sizes and prices stated plainly, no all caps outside headings and buttons.
- WCAG 2.2 AA: 44px minimum touch targets, visible 2px #8C7964 focus outline with 2px offset, stock status always text plus icon, `aria-live="polite"` for result counts and payment status.
- Web design decisions go through `ui-ux-pro-max:ui-ux-pro-max` before designing or restyling any section. Load `gsap-skills:gsap-core`, `gsap-skills:gsap-react` and `gsap-skills:gsap-timeline` before writing animation code. The brand brief wins any conflict with either.
- Commits are small and frequent, conventional style. Add the attribution trailer the session requires.

## Deviations from the spec (decided in this plan)

- The cart store and drawer are built in this pass (the header and the product card both need them). Pass 2 starts at checkout.
- The header nav has Products and Visit us in this pass. Pass 3 adds Scent finder when the section exists.
- Image URLs from Sanity are read with `asset->url` in GROQ and served through `next/image` (no `@sanity/image-url` dependency).
- No ESLint. `tsc --noEmit`, Vitest, Playwright and `scripts/check-copy.ts` are the gates.
- Mobile product cards use 16px padding below 768px so two columns fit. 24px applies from 768px up. Record this in `docs/design-notes.md`.

## File Structure

```
package.json, tsconfig.json, next.config.ts, postcss.config.mjs, vitest.config.ts, playwright.config.ts
.gitignore, .env.example, .npmrc
scripts/check-copy.ts            copy and palette gate (em dash, exclamation, off-palette hex)
scripts/lib/bottle.mjs           placeholder bottle SVG generator
scripts/placeholder-frames.mjs   24 turntable placeholder frames into public/turntable
scripts/seed-sanity.mjs          sample products and settings into Sanity
sanity/                          Studio config and schemas (hosted Studio)
src/app/layout.tsx, globals.css, not-found.tsx
src/app/(home)/page.tsx, loading.tsx
src/app/products/page.tsx, loading.tsx, error.tsx
src/app/api/revalidate/route.ts
src/lib/gsap.ts, taxonomy.ts, schemas.ts, pricing.ts, sanity.ts, cart.ts
src/components/Logo.tsx, Icons.tsx, Modal.tsx, nav.ts, Header.tsx, MobileMenu.tsx, CartMenu.tsx,
  Footer.tsx, Hero.tsx, FadeUp.tsx, VisitUs.tsx, ProductCard.tsx, ProductGrid.tsx, Skeletons.tsx
tests/unit/*.test.ts
tests/e2e/*.spec.ts, tests/e2e-server.mjs, tests/mock-server.mjs, tests/fixtures/*.json
public/turntable/frame-00.webp ... frame-23.webp
docs/design-notes.md
```

---

### Task 1: Repository, scaffold and copy gate

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`, `.npmrc`
- Create: `scripts/check-copy.ts`
- Test: `tests/unit/check-copy.test.ts`

**Interfaces:**
- Produces: `findViolations(file: string, text: string): string[]` exported from `scripts/check-copy.ts`. npm scripts `dev`, `build`, `start`, `typecheck`, `test`, `test:e2e`, `check`.

- [ ] **Step 1: Initialise git against the user's repository**

The folder is already a git repo with `origin` set to `https://github.com/maxlexer/Saka.git` and the remote was empty when this plan was written. Confirm:

```bash
git remote -v
git ls-remote origin
git status --short
```

Expected: `origin` points at `maxlexer/Saka.git`. If `ls-remote` lists refs, stop and ask the user before pushing anything.

- [ ] **Step 2: Create `package.json` and install dependencies**

Do not use `create-next-app` (the folder name `SakaParfum` has capitals, which npm rejects as a package name). Write `package.json`:

```json
{
  "name": "saka-parfum",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "check": "node scripts/check-copy.ts"
  }
}
```

Install (latest stable versions; do not pin to old ones):

```bash
npm install next react react-dom gsap @gsap/react zod @sanity/client
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss postcss vitest @playwright/test @axe-core/playwright sharp sanity
npx playwright install chromium
```

Create `.npmrc` containing `legacy-peer-deps=true` only if `npm install` reported a peer dependency conflict for `sanity`. Otherwise do not create it.

- [ ] **Step 3: Write the config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "scripts/**/*.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
};

export default config;
```

`postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
```

`.gitignore`:

```
node_modules
.next
out
.env
.env.*
!.env.example
.vercel
next-env.d.ts
*.tsbuildinfo
test-results
playwright-report
```

`.env.example`:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_REVALIDATE_SECRET=
# Pass 2
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
KHQR_TOKEN=
KHQR_WEBHOOK_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_ADMIN_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
CRON_SECRET=
# Test only
SANITY_API_HOST=
KHQR_API_BASE=
TELEGRAM_API_BASE=
```

- [ ] **Step 4: Write the failing test for the copy gate**

`tests/unit/check-copy.test.ts` (build forbidden characters with escapes so this file never contains them literally):

```ts
import { describe, expect, it } from "vitest";
import { findViolations } from "../../scripts/check-copy.ts";

const EM = String.fromCharCode(0x2014);
const BANG = String.fromCharCode(33);

describe("findViolations", () => {
  it("flags em dashes", () => {
    expect(findViolations("a.tsx", `const t = "a ${EM} b";`)).toEqual(["a.tsx:1 em dash"]);
  });

  it("flags exclamation marks in copy but not in code", () => {
    expect(findViolations("a.tsx", `<p>Thank you${BANG} Enjoy</p>`)).toEqual(["a.tsx:1 exclamation mark"]);
    expect(findViolations("a.ts", "if (!ok || a !== b) return;")).toEqual([]);
    expect(findViolations("a.css", "a { color: red !important; }")).toEqual([]);
  });

  it("flags off-palette hex but allows palette colors", () => {
    expect(findViolations("a.css", "a { color: #FFFFFF; }")).toEqual(["a.css:1 off-palette #FFFFFF"]);
    expect(findViolations("a.css", "a { color: #faf6ee; background: #171A12; }")).toEqual([]);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run tests/unit/check-copy.test.ts`
Expected: FAIL (cannot resolve `scripts/check-copy.ts`).

- [ ] **Step 6: Write `scripts/check-copy.ts`**

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PALETTE = new Set([
  "#faf6ee", "#f2ebdf", "#dcd0bf", "#ad9883", "#8c7964", "#685846", "#171a12", "#393625",
  "#4f6b3a", "#a3392b", "#23261c", "#3a3a2c", "#f5efe4", "#bdae9b", "#8fb174", "#e07a6a",
]);
const ROOTS = ["src", "scripts", "sanity", "tests", "supabase", "README.md"];
const EXTS = new Set([".ts", ".tsx", ".css", ".mjs", ".sql", ".md"]);
const SKIP = new Set(["tests/unit/check-copy.test.ts"]);

export function findViolations(file: string, text: string): string[] {
  const out: string[] = [];
  text.split("\n").forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    if (line.includes(String.fromCharCode(0x2014))) out.push(`${at} em dash`);
    if (/\w!(?=[\s"'`<]|$)/.test(line)) out.push(`${at} exclamation mark`);
    if (file.endsWith(".md") || file.endsWith(".sql")) return;
    for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (!PALETTE.has(m[0].toLowerCase())) out.push(`${at} off-palette ${m[0]}`);
    }
  });
  return out;
}

function* walk(path: string): Generator<string> {
  let stat;
  try { stat = statSync(path); } catch { return; }
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) yield* walk(join(path, name));
  } else if (EXTS.has(extname(path))) {
    yield path;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = ROOTS.flatMap((root) => [...walk(root)])
    .map((f) => f.replaceAll("\\", "/"))
    .filter((f) => !SKIP.has(f))
    .flatMap((f) => findViolations(f, readFileSync(f, "utf8")));
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("copy check passed");
}
```

- [ ] **Step 7: Run tests and the gate**

Run: `npx vitest run tests/unit/check-copy.test.ts` then `npm run check`
Expected: 3 tests PASS, then `copy check passed`.

- [ ] **Step 8: Commit and push the foundation**

```bash
git add -A
git commit -m "chore: scaffold project, tooling and copy gate"
git push -u origin main
```

If the push is rejected, stop and report. Never force push.

---

### Task 2: Taxonomy, schemas and pricing

**Files:**
- Create: `src/lib/taxonomy.ts`, `src/lib/schemas.ts`, `src/lib/pricing.ts`
- Test: `tests/unit/pricing.test.ts`

**Interfaces:**
- Produces:
  - `taxonomy.ts`: `SCENT_FAMILIES`, `VIBES`, `OCCASIONS`, `SIZES_ML` (readonly tuples), `LABELS: Record<string, string>`, types `ScentFamily`, `Vibe`, `Occasion`, `SizeMl`.
  - `schemas.ts`: `sizeMlSchema`, `cartLineSchema`, `type CartLine = { productId: string; sizeMl: SizeMl; qty: number }`, `MAX_CART_LINES = 20`, `MAX_LINE_QTY = 10`.
  - `pricing.ts`: `DELIVERY_FEE_USD = 2`, `RIEL_PER_USD = 4000`, `type Fulfilment = "pickup" | "delivery"`, `toRiel(usd: number): number`, `rielNumber(usd: number): string`, `formatRiel(usd: number): string`, `formatUsd(usd: number, compact?: boolean): string`, `priceOf(sizes: {sizeMl: number; priceUsd: number}[], sizeMl: number): number | undefined`, `computeTotals(lines: {priceUsd: number; qty: number}[], fulfilment: Fulfilment): { subtotalUsd: number; deliveryFeeUsd: number; totalUsd: number }`.

- [ ] **Step 1: Write the failing pricing tests**

`tests/unit/pricing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeTotals, formatRiel, formatUsd, priceOf, toRiel } from "@/lib/pricing";

describe("toRiel", () => {
  it("uses 4000 KHR per USD, rounded to 100", () => {
    expect(toRiel(18)).toBe(72000);
    expect(toRiel(2)).toBe(8000);
    expect(toRiel(0.01)).toBe(0);
    expect(toRiel(0.03)).toBe(100);
  });
});

describe("formatters", () => {
  it("formats Riel with thousands separators", () => {
    expect(formatRiel(30)).toBe("120,000 KHR");
  });
  it("formats USD with two decimals, or compact for whole amounts", () => {
    expect(formatUsd(18)).toBe("$18.00");
    expect(formatUsd(18, true)).toBe("$18");
    expect(formatUsd(18.5, true)).toBe("$18.50");
  });
});

describe("priceOf", () => {
  it("finds the price for a size", () => {
    const sizes = [{ sizeMl: 10, priceUsd: 12 }, { sizeMl: 20, priceUsd: 22 }];
    expect(priceOf(sizes, 20)).toBe(22);
    expect(priceOf(sizes, 50)).toBeUndefined();
  });
});

describe("computeTotals", () => {
  const lines = [{ priceUsd: 12, qty: 2 }, { priceUsd: 18.5, qty: 1 }];
  it("adds nothing for pickup", () => {
    expect(computeTotals(lines, "pickup")).toEqual({ subtotalUsd: 42.5, deliveryFeeUsd: 0, totalUsd: 42.5 });
  });
  it("adds the $2.00 delivery fee", () => {
    expect(computeTotals(lines, "delivery")).toEqual({ subtotalUsd: 42.5, deliveryFeeUsd: 2, totalUsd: 44.5 });
  });
  it("avoids floating point drift", () => {
    expect(computeTotals([{ priceUsd: 0.1, qty: 3 }], "pickup").subtotalUsd).toBe(0.3);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/pricing.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/taxonomy.ts`**

```ts
export const SCENT_FAMILIES = ["floral", "woody", "citrus", "amber", "fresh_aquatic", "musk"] as const;
export const VIBES = ["calm", "fresh", "warm", "bold", "romantic", "earthy"] as const;
export const OCCASIONS = ["everyday", "work", "evening", "date_night", "ceremony", "gift"] as const;
export const SIZES_ML = [10, 20, 50] as const;

export type ScentFamily = (typeof SCENT_FAMILIES)[number];
export type Vibe = (typeof VIBES)[number];
export type Occasion = (typeof OCCASIONS)[number];
export type SizeMl = (typeof SIZES_ML)[number];

export const LABELS: Record<string, string> = {
  floral: "Floral",
  woody: "Woody",
  citrus: "Citrus",
  amber: "Amber",
  fresh_aquatic: "Fresh and aquatic",
  musk: "Musk",
  calm: "Calm",
  fresh: "Fresh",
  warm: "Warm",
  bold: "Bold",
  romantic: "Romantic",
  earthy: "Earthy",
  everyday: "Everyday",
  work: "Work",
  evening: "Evening",
  date_night: "Date night",
  ceremony: "Ceremony",
  gift: "Gift",
};
```

- [ ] **Step 4: Write `src/lib/schemas.ts`**

```ts
import { z } from "zod";

export const MAX_CART_LINES = 20;
export const MAX_LINE_QTY = 10;

export const sizeMlSchema = z.union([z.literal(10), z.literal(20), z.literal(50)]);

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  sizeMl: sizeMlSchema,
  qty: z.number().int().min(1).max(MAX_LINE_QTY),
});

export type CartLine = z.infer<typeof cartLineSchema>;
```

- [ ] **Step 5: Write `src/lib/pricing.ts`**

```ts
export const DELIVERY_FEE_USD = 2;
export const RIEL_PER_USD = 4000;

export type Fulfilment = "pickup" | "delivery";

export const toRiel = (usd: number) => Math.round((usd * RIEL_PER_USD) / 100) * 100;
export const rielNumber = (usd: number) => toRiel(usd).toLocaleString("en-US");
export const formatRiel = (usd: number) => `${rielNumber(usd)} KHR`;

export function formatUsd(usd: number, compact = false) {
  return compact && Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`;
}

export const priceOf = (sizes: { sizeMl: number; priceUsd: number }[], sizeMl: number) =>
  sizes.find((s) => s.sizeMl === sizeMl)?.priceUsd;

export function computeTotals(lines: { priceUsd: number; qty: number }[], fulfilment: Fulfilment) {
  const subtotalCents = lines.reduce((sum, l) => sum + Math.round(l.priceUsd * 100) * l.qty, 0);
  const deliveryCents = fulfilment === "delivery" ? DELIVERY_FEE_USD * 100 : 0;
  return {
    subtotalUsd: subtotalCents / 100,
    deliveryFeeUsd: deliveryCents / 100,
    totalUsd: (subtotalCents + deliveryCents) / 100,
  };
}
```

- [ ] **Step 6: Run tests, typecheck, commit**

Run: `npx vitest run tests/unit/pricing.test.ts && npm run typecheck`
Expected: all PASS.

```bash
git add src/lib tests/unit/pricing.test.ts
git commit -m "feat: taxonomy, cart line schema and pricing with 4000 KHR rate"
```

---

### Task 3: Design tokens, fonts and layout shell

**Files:**
- Create: `src/app/globals.css`, `src/lib/gsap.ts`, `docs/design-notes.md`
- Modify: none yet (layout is written in Task 5 once Header and Footer exist)

**Interfaces:**
- Produces CSS classes: `.container`, `.section`, `.h1`, `.h2`, `.h3`, `.eyebrow`, `.small`, `.btn`, `.btn-primary`, `.btn-secondary`, `.link`, `.skeleton`, `.skip-link`. Tailwind color tokens `bg`, `surface`, `border`, `text`, `muted`, `secondary`, `accent`, `success`, `error`, `badge`, `ink`, `btn`, `btn-text`. Shadow token `shadow-soft`. Fonts `font-display` (Montserrat) and `font-sans` (Jost). `gsap.ts` exports `gsap` and `useGSAP`.

- [ ] **Step 1: Run the design skills**

Invoke `ui-ux-pro-max:ui-ux-pro-max` with the brand brief (calm, refined, tactile, cream, black text, warm neutrals, Montserrat and Jost) for: global tokens, buttons, links, form-less base styles. Invoke `gsap-skills:gsap-core` and `gsap-skills:gsap-react`. Append a short "Pass 1 tokens" note to `docs/design-notes.md` listing which suggestions were accepted or rejected and why (the brand brief wins). Include the mobile card padding deviation from this plan's header.

- [ ] **Step 2: Write `src/lib/gsap.ts`**

```ts
"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };
```

- [ ] **Step 3: Write `src/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --bg: #faf6ee;
  --surface: #f2ebdf;
  --border: #dcd0bf;
  --text: #171a12;
  --muted: #685846;
  --secondary: #8c7964;
  --accent: #ad9883;
  --success: #4f6b3a;
  --error: #a3392b;
  --btn: #171a12;
  --btn-text: #faf6ee;
  --badge: #ad9883;
  --ink: #171a12;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #171a12;
    --surface: #23261c;
    --border: #3a3a2c;
    --text: #f5efe4;
    --muted: #bdae9b;
    --secondary: #ad9883;
    --accent: #8c7964;
    --success: #8fb174;
    --error: #e07a6a;
    --btn: #f5efe4;
    --btn-text: #171a12;
  }
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-secondary: var(--secondary);
  --color-accent: var(--accent);
  --color-success: var(--success);
  --color-error: var(--error);
  --color-btn: var(--btn);
  --color-btn-text: var(--btn-text);
  --color-badge: var(--badge);
  --color-ink: var(--ink);
  --font-display: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--font-jost), ui-sans-serif, system-ui, sans-serif;
  --radius-sm: 2px;
  --shadow-soft: 0 8px 24px rgba(23, 26, 18, 0.08);
}

html {
  background: var(--bg);
  scroll-behavior: smooth;
  scroll-padding-top: 5rem;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.65;
  letter-spacing: 0.01em;
}

@media (min-width: 1024px) {
  body { font-size: 17px; }
}

:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 2px;
}

@layer components {
  .container { margin-inline: auto; max-width: 1200px; padding-inline: 20px; }
  @media (min-width: 1024px) { .container { padding-inline: 32px; } }

  .section { padding-block: 56px; }
  @media (min-width: 1024px) { .section { padding-block: 96px; } }

  .h1, .h2, .h3, .eyebrow, .btn { font-family: var(--font-display); text-transform: uppercase; }
  .h1 { font-size: 32px; line-height: 1.15; letter-spacing: 0.18em; font-weight: 400; }
  .h2 { font-size: 24px; line-height: 1.2; letter-spacing: 0.14em; font-weight: 400; }
  .h3 { font-size: 18px; line-height: 1.3; letter-spacing: 0.1em; font-weight: 500; }
  @media (min-width: 1024px) {
    .h1 { font-size: 48px; }
    .h2 { font-size: 32px; }
    .h3 { font-size: 22px; }
  }
  .eyebrow { font-size: 12px; line-height: 1.5; letter-spacing: 0.3em; font-weight: 500; color: var(--muted); }
  .small { font-size: 13px; line-height: 1.5; letter-spacing: 0.02em; }
  @media (min-width: 1024px) { .small { font-size: 14px; } }

  .btn {
    display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 8px;
    padding: 0 28px; border: 1px solid transparent; border-radius: 2px;
    font-size: 13px; font-weight: 500; letter-spacing: 0.16em;
    transition: background-color 250ms ease, color 250ms ease, border-color 250ms ease;
  }
  .btn:disabled { cursor: not-allowed; opacity: 0.5; }
  .btn-primary { background: var(--btn); color: var(--btn-text); border-color: var(--btn); }
  .btn-primary:not(:disabled):hover { background: transparent; color: var(--text); }
  .btn-secondary { background: transparent; color: var(--text); border-color: var(--secondary); }
  .btn-secondary:not(:disabled):hover { background: var(--btn); color: var(--btn-text); border-color: var(--btn); }

  .link { position: relative; }
  .link::after {
    content: ""; position: absolute; left: 0; bottom: -2px; width: 100%; height: 1px;
    background: currentColor; transform: scaleX(0); transform-origin: left;
    transition: transform 300ms ease-out;
  }
  .link:hover::after, .link:focus-visible::after, .link[aria-current="page"]::after { transform: scaleX(1); }

  .skeleton { background: var(--surface); }
  .skip-link {
    position: absolute; left: 16px; top: -100px; z-index: 100; padding: 12px 16px;
    background: var(--btn); color: var(--btn-text); border-radius: 2px;
  }
  .skip-link:focus { top: 16px; }
}

@media (prefers-reduced-motion: no-preference) {
  .skeleton { animation: skeleton-pulse 1.8s ease-in-out infinite; }
}
@keyframes skeleton-pulse { 50% { opacity: 0.55; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

- [ ] **Step 7: Verify and commit**

Run: `npm run check`
Expected: `copy check passed` (all hex values are palette colors).

```bash
git add src/app/globals.css src/lib/gsap.ts docs/design-notes.md
git commit -m "feat: design tokens, type scale, buttons and gsap module"
```

---

### Task 4: Sanity schema, validated data access, seed and revalidation

**Files:**
- Create: `sanity/sanity.config.ts`, `sanity/sanity.cli.ts`, `sanity/schemas/product.ts`, `sanity/schemas/siteSettings.ts`, `sanity/schemas/index.ts`
- Create: `src/lib/sanity.ts`, `src/app/api/revalidate/route.ts`
- Create: `scripts/lib/bottle.mjs`, `scripts/seed-sanity.mjs`
- Test: `tests/unit/sanity.test.ts`

**Interfaces:**
- Consumes: `taxonomy.ts`, `schemas.ts`.
- Produces from `src/lib/sanity.ts`:
  - `type Product` with fields `id: string`, `name: string`, `slug: string`, `description: string`, `notesTop/notesHeart/notesBase: string[]`, `scentFamily: ScentFamily[]`, `vibes: Vibe[]`, `occasions: Occasion[]`, `sizes: { sizeMl: SizeMl; priceUsd: number }[]` (sorted ascending), `available: boolean`, `displayOrder: number`, `image: { url: string; alt: string; lqip?: string | null }`, `imageHover?: { url: string; alt: string } | null`.
  - `type SiteSettings` with `storeName`, `address`, `hours: { days: string; open: string; close: string }[]`, `phone`, `mapUrl`, `socialLinks: { label: string; url: string }[]`, `stockUpdatedAt: string | null`.
  - `parseProducts(raw: unknown[]): Product[]`, `parseSettings(raw: unknown): SiteSettings`, `getCatalog(): Promise<Product[]>` (throws on network error), `getSettings(): Promise<SiteSettings>` (never throws), `type CartCatalogItem = Pick<Product, "id" | "name" | "sizes" | "available">`, `toCartCatalog(products: Product[]): CartCatalogItem[]`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/sanity.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { parseProducts, parseSettings } from "@/lib/sanity";

const valid = {
  id: "p1",
  name: "Jasmine Rain",
  slug: "jasmine-rain",
  description: "Jasmine after rain on warm stone.",
  notesTop: ["bergamot"],
  notesHeart: ["jasmine"],
  notesBase: null,
  scentFamily: ["floral"],
  vibes: null,
  occasions: ["everyday"],
  sizes: [{ sizeMl: 50, priceUsd: 48 }, { sizeMl: 10, priceUsd: 12 }],
  available: true,
  displayOrder: 10,
  image: { url: "/turntable/frame-00.webp", alt: "Jasmine Rain bottle", lqip: null },
  imageHover: { url: null, alt: null },
};

describe("parseProducts", () => {
  it("accepts a valid product, sorts sizes and turns nulls into empty lists", () => {
    const [p] = parseProducts([valid]);
    expect(p.sizes.map((s) => s.sizeMl)).toEqual([10, 50]);
    expect(p.notesBase).toEqual([]);
    expect(p.vibes).toEqual([]);
    expect(p.imageHover).toBeNull();
  });

  it("skips and logs products missing a name, image or size", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad = [
      { ...valid, id: "a", name: "" },
      { ...valid, id: "b", image: null },
      { ...valid, id: "c", sizes: [] },
      valid,
    ];
    expect(parseProducts(bad).map((p) => p.id)).toEqual(["p1"]);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });
});

describe("parseSettings", () => {
  it("falls back to placeholder text for a bad document", () => {
    expect(parseSettings(null).storeName).toBe("SAKA Parfum");
    expect(parseSettings({ storeName: 12 }).address).toBe("Cambodia");
  });

  it("keeps a valid document", () => {
    const s = parseSettings({ storeName: "SAKA Parfum", address: "Street 1", hours: [], phone: "012", mapUrl: "https://maps.app.goo.gl/x", socialLinks: [], stockUpdatedAt: null });
    expect(s.address).toBe("Street 1");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/sanity.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/sanity.ts`**

```ts
import { createClient } from "@sanity/client";
import { z } from "zod";
import { OCCASIONS, SCENT_FAMILIES, VIBES } from "./taxonomy";
import { sizeMlSchema } from "./schemas";

const list = <T extends z.ZodTypeAny>(item: T) =>
  z.array(item).nullish().transform((v) => v ?? []);

const image = z.object({ url: z.string().min(1), alt: z.string().min(1), lqip: z.string().nullish() });

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullish().transform((v) => v ?? ""),
  notesTop: list(z.string()),
  notesHeart: list(z.string()),
  notesBase: list(z.string()),
  scentFamily: list(z.enum(SCENT_FAMILIES)),
  vibes: list(z.enum(VIBES)),
  occasions: list(z.enum(OCCASIONS)),
  sizes: z
    .array(z.object({ sizeMl: sizeMlSchema, priceUsd: z.number().positive() }))
    .min(1)
    .transform((s) => [...s].sort((a, b) => a.sizeMl - b.sizeMl)),
  available: z.boolean().nullish().transform((v) => v ?? true),
  displayOrder: z.number().nullish().transform((v) => v ?? 100),
  image,
  imageHover: image.omit({ lqip: true }).nullish().catch(null).transform((v) => v ?? null),
});

export const siteSettingsSchema = z.object({
  storeName: z.string().min(1),
  address: z.string().min(1),
  hours: list(z.object({ days: z.string(), open: z.string(), close: z.string() })),
  phone: z.string().nullish().transform((v) => v ?? ""),
  mapUrl: z.string().url(),
  socialLinks: list(z.object({ label: z.string(), url: z.string().url() })),
  stockUpdatedAt: z.string().nullish().transform((v) => v ?? null),
});

export type Product = z.infer<typeof productSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type CartCatalogItem = Pick<Product, "id" | "name" | "sizes" | "available">;

const FALLBACK_SETTINGS: SiteSettings = {
  storeName: "SAKA Parfum",
  address: "Cambodia",
  hours: [],
  phone: "",
  mapUrl: "https://www.google.com/maps",
  socialLinks: [],
  stockUpdatedAt: null,
};

export function parseProducts(raw: unknown[]): Product[] {
  return raw.flatMap((item) => {
    const parsed = productSchema.safeParse(item);
    if (parsed.success) return [parsed.data];
    const id = (item as { id?: string } | null)?.id ?? "unknown";
    console.warn(`Skipped product ${id}: ${parsed.error.issues[0]?.message}`);
    return [];
  });
}

export function parseSettings(raw: unknown): SiteSettings {
  const parsed = siteSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : FALLBACK_SETTINGS;
}

export const toCartCatalog = (products: Product[]): CartCatalogItem[] =>
  products.map(({ id, name, sizes, available }) => ({ id, name, sizes, available }));

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? "missing",
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  useCdn: true,
  ...(process.env.SANITY_API_HOST
    ? { apiHost: process.env.SANITY_API_HOST, useProjectHostname: false, useCdn: false }
    : {}),
});

const PRODUCT_FIELDS = `
  "id": _id, name, "slug": slug.current, description, notesTop, notesHeart, notesBase,
  scentFamily, vibes, occasions, sizes[]{ sizeMl, priceUsd }, available, displayOrder,
  "image": image{ "url": asset->url, "lqip": asset->metadata.lqip, alt },
  "imageHover": imageHover{ "url": asset->url, alt }`;

const CATALOG_QUERY = `*[_type == "product" && isActive != false] | order(displayOrder asc, name asc){${PRODUCT_FIELDS}}`;
const SETTINGS_QUERY = `*[_id == "siteSettings"][0]{ storeName, address, hours, phone, mapUrl, socialLinks, stockUpdatedAt }`;

const ISR = { next: { revalidate: 60 } } as const;

export async function getCatalog(): Promise<Product[]> {
  return parseProducts(await client.fetch<unknown[]>(CATALOG_QUERY, {}, ISR));
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    return parseSettings(await client.fetch<unknown>(SETTINGS_QUERY, {}, ISR));
  } catch (error) {
    console.warn("Could not load site settings", error);
    return FALLBACK_SETTINGS;
  }
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/unit/sanity.test.ts && npm run typecheck`
Expected: PASS. If TypeScript rejects the `next` fetch option on `client.fetch`, upgrade `@sanity/client` to latest and retry. Do not cast around it.

- [ ] **Step 5: Write the Studio schemas**

`sanity/schemas/product.ts`:

```ts
import { defineField, defineType } from "sanity";
import { LABELS, OCCASIONS, SCENT_FAMILIES, SIZES_ML, VIBES } from "../../src/lib/taxonomy";

const options = (values: readonly string[]) => ({
  list: values.map((value) => ({ value, title: LABELS[value] })),
});

const notes = (name: string, title: string) =>
  defineField({ name, title, type: "array", of: [{ type: "string" }], validation: (r) => r.required().min(1).max(5) });

const tags = (name: string, title: string, values: readonly string[], required = false) =>
  defineField({
    name,
    title,
    type: "array",
    of: [{ type: "string" }],
    options: options(values),
    validation: (r) => (required ? r.required().min(1) : r),
  });

export const product = defineType({
  name: "product",
  title: "Perfume",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required().max(60) }),
    defineField({ name: "slug", type: "slug", options: { source: "name" }, validation: (r) => r.required() }),
    defineField({ name: "description", type: "text", rows: 3, validation: (r) => r.required().max(160) }),
    notes("notesTop", "Top notes"),
    notes("notesHeart", "Heart notes"),
    notes("notesBase", "Base notes"),
    tags("scentFamily", "Scent family", SCENT_FAMILIES, true),
    tags("vibes", "Vibes", VIBES),
    tags("occasions", "Occasions", OCCASIONS),
    defineField({
      name: "image",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", type: "string", validation: (r) => r.required() })],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "imageHover",
      title: "Hover image (optional)",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", type: "string" })],
      validation: (r) =>
        r.custom((value: { asset?: unknown; alt?: string } | undefined) =>
          !value?.asset || value.alt ? true : "Alt text is required when a hover image is set"),
    }),
    defineField({
      name: "sizes",
      type: "array",
      of: [
        {
          type: "object",
          name: "size",
          fields: [
            defineField({ name: "sizeMl", title: "Size (ml)", type: "number", options: { list: [...SIZES_ML] }, validation: (r) => r.required() }),
            defineField({ name: "priceUsd", title: "Price (USD)", type: "number", validation: (r) => r.required().positive().precision(2) }),
          ],
          preview: { select: { ml: "sizeMl", usd: "priceUsd" }, prepare: ({ ml, usd }) => ({ title: `${ml}ml`, subtitle: `$${usd}` }) },
        },
      ],
      validation: (r) =>
        r.required().min(1).custom((sizes: { sizeMl?: number }[] | undefined) =>
          new Set(sizes?.map((s) => s.sizeMl)).size === (sizes?.length ?? 0) ? true : "Use each size once"),
    }),
    defineField({ name: "available", title: "Available", type: "boolean", initialValue: true, description: "Switch off when the perfume is out of stock." }),
    defineField({ name: "displayOrder", type: "number", initialValue: 100 }),
    defineField({ name: "isActive", title: "Show on site", type: "boolean", initialValue: true }),
  ],
  preview: { select: { title: "name", media: "image", available: "available" }, prepare: ({ title, media, available }) => ({ title, media, subtitle: available === false ? "Out of stock" : "Available" }) },
});
```

`sanity/schemas/siteSettings.ts`:

```ts
import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Store settings",
  type: "document",
  fields: [
    defineField({ name: "storeName", type: "string", validation: (r) => r.required() }),
    defineField({ name: "address", type: "text", rows: 2, validation: (r) => r.required() }),
    defineField({
      name: "hours",
      type: "array",
      of: [{ type: "object", fields: [
        defineField({ name: "days", type: "string" }),
        defineField({ name: "open", type: "string" }),
        defineField({ name: "close", type: "string" }),
      ] }],
    }),
    defineField({ name: "phone", type: "string" }),
    defineField({ name: "mapUrl", title: "Google Maps link", type: "url", validation: (r) => r.required() }),
    defineField({
      name: "socialLinks",
      type: "array",
      of: [{ type: "object", fields: [
        defineField({ name: "label", type: "string", description: "Instagram, Facebook or Telegram" }),
        defineField({ name: "url", type: "url" }),
      ] }],
    }),
    defineField({ name: "stockUpdatedAt", title: "Stock last checked", type: "datetime" }),
  ],
});
```

`sanity/schemas/index.ts`:

```ts
import { product } from "./product";
import { siteSettings } from "./siteSettings";

export const schemaTypes = [product, siteSettings];
```

`sanity/sanity.config.ts`:

```ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "saka",
  title: "SAKA Parfum",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "",
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  plugins: [
    structureTool({
      structure: (S) =>
        S.list().title("Content").items([
          S.listItem().title("Store settings").id("siteSettings").child(S.document().schemaType("siteSettings").documentId("siteSettings")),
          S.documentTypeListItem("product").title("Perfumes"),
        ]),
    }),
  ],
  schema: { types: schemaTypes },
});
```

`sanity/sanity.cli.ts`:

```ts
import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: { projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "", dataset: process.env.SANITY_STUDIO_DATASET ?? "production" },
  studioHost: "saka-parfum",
});
```

- [ ] **Step 6: Write the revalidation route**

`src/app/api/revalidate/route.ts`:

```ts
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.SANITY_REVALIDATE_SECRET || secret !== process.env.SANITY_REVALIDATE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true });
}
```

- [ ] **Step 7: Write the placeholder bottle generator**

`scripts/lib/bottle.mjs` (palette colors only, hatch marks make the placeholder obvious):

```js
const INK = "#171A12";
const CREAM = "#FAF6EE";
const SURFACE = "#F2EBDF";
const BORDER = "#DCD0BF";

/** Draws a placeholder bottle at `angle` degrees of turn. Hatched label marks it as a placeholder. */
export function bottleSvg({ width = 720, height = 960, angle = 0, fill = BORDER, tick } = {}) {
  const rad = (angle * Math.PI) / 180;
  const cx = width / 2;
  const bodyW = 300 * (0.62 + 0.38 * Math.abs(Math.cos(rad)));
  const labelW = bodyW * 0.6 * Math.max(Math.cos(rad), 0.15);
  const labelX = cx + Math.sin(rad) * bodyW * 0.42 - labelW / 2;
  const top = height * 0.34;
  const bottom = height * 0.92;
  const ticks =
    tick === undefined
      ? ""
      : Array.from({ length: 24 }, (_, i) =>
          `<rect x="${cx - 120 + i * 10}" y="${height - 28}" width="6" height="6" fill="${i === tick ? INK : BORDER}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="body"><rect x="${cx - bodyW / 2}" y="${top}" width="${bodyW}" height="${bottom - top}" rx="4"/></clipPath>
    <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${SURFACE}"/><rect width="3" height="12" fill="${INK}" opacity="0.5"/></pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="${CREAM}"/>
  <ellipse cx="${cx}" cy="${bottom + 6}" rx="${bodyW * 0.55}" ry="14" fill="${BORDER}" opacity="0.7"/>
  <rect x="${cx - 45}" y="${top - 70}" width="90" height="72" fill="${fill}"/>
  <rect x="${cx - 65}" y="${top - 190}" width="130" height="124" rx="2" fill="${INK}"/>
  <rect x="${cx - bodyW / 2}" y="${top}" width="${bodyW}" height="${bottom - top}" rx="4" fill="${fill}"/>
  <g clip-path="url(#body)"><rect x="${labelX}" y="${top + 120}" width="${labelW}" height="230" fill="url(#hatch)" stroke="${INK}" stroke-width="2"/></g>
  ${ticks}
</svg>`;
}
```

- [ ] **Step 8: Write the seed script**

`scripts/seed-sanity.mjs` (uploads six clearly named sample perfumes and the settings document; needs `SANITY_WRITE_TOKEN`):

```js
import { createClient } from "@sanity/client";
import sharp from "sharp";
import { bottleSvg } from "./lib/bottle.mjs";

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const FILLS = ["#DCD0BF", "#AD9883", "#8C7964"];
const SAMPLES = [
  { name: "Jasmine Rain", desc: "Jasmine after rain on warm stone.", top: ["bergamot", "green leaf"], heart: ["jasmine", "tuberose"], base: ["musk"], family: ["floral"], vibes: ["calm", "romantic"], occ: ["everyday", "date_night"], prices: [12, 22, 48] },
  { name: "Warm Amber", desc: "Amber and vanilla, like a lit evening room.", top: ["orange peel"], heart: ["amber", "benzoin"], base: ["vanilla", "sandalwood"], family: ["amber"], vibes: ["warm", "bold"], occ: ["evening", "gift"], prices: [14, 26, 58] },
  { name: "Cedar Linen", desc: "Dry cedar on sun-washed linen.", top: ["lemon"], heart: ["cedar", "vetiver"], base: ["white musk"], family: ["woody", "musk"], vibes: ["calm", "earthy"], occ: ["work", "everyday"], prices: [12, 22, 50] },
  { name: "Sea Salt Morning", desc: "Cool air, salt and pale driftwood.", top: ["sea salt", "grapefruit"], heart: ["driftwood"], base: ["ambergris"], family: ["fresh_aquatic", "citrus"], vibes: ["fresh"], occ: ["everyday", "work"], prices: [11, 20, 45] },
  { name: "White Musk", desc: "Clean skin and soft cotton.", top: ["pear"], heart: ["lily", "cotton"], base: ["white musk"], family: ["musk", "floral"], vibes: ["calm", "fresh"], occ: ["everyday", "gift"], prices: [10, 18, 40] },
  { name: "Orange Peel", desc: "Bright peel, then a quiet resin.", top: ["mandarin", "orange peel"], heart: ["neroli"], base: ["labdanum"], family: ["citrus", "amber"], vibes: ["fresh", "warm"], occ: ["ceremony", "evening"], prices: [12, 22, 48], available: false },
];

const slugify = (s) => s.toLowerCase().replace(/\s+/g, "-");

for (const [i, s] of SAMPLES.entries()) {
  const png = await sharp(Buffer.from(bottleSvg({ width: 1200, height: 1200, fill: FILLS[i % 3] }))).png().toBuffer();
  const asset = await client.assets.upload("image", png, { filename: `${slugify(s.name)}.png` });
  await client.createOrReplace({
    _id: `product-${slugify(s.name)}`,
    _type: "product",
    name: s.name,
    slug: { _type: "slug", current: slugify(s.name) },
    description: s.desc,
    notesTop: s.top, notesHeart: s.heart, notesBase: s.base,
    scentFamily: s.family, vibes: s.vibes, occasions: s.occ,
    image: { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt: `${s.name} bottle, sample image` },
    sizes: [10, 20, 50].map((sizeMl, k) => ({ _key: `s${sizeMl}`, _type: "size", sizeMl, priceUsd: s.prices[k] })),
    available: s.available ?? true,
    displayOrder: (i + 1) * 10,
    isActive: true,
  });
  console.log(`seeded ${s.name}`);
}

await client.createOrReplace({
  _id: "siteSettings",
  _type: "siteSettings",
  storeName: "SAKA Parfum",
  address: "Replace with the shop address, Phnom Penh, Cambodia",
  hours: [{ _key: "h1", days: "Every day", open: "9:00", close: "19:00" }],
  phone: "+855 00 000 000",
  mapUrl: "https://maps.app.goo.gl/replace-me",
  socialLinks: [],
  stockUpdatedAt: new Date().toISOString(),
});
console.log("seeded settings");
```

- [ ] **Step 9: Manual setup, seed and verify (user action required)**

Ask the user to: create a Sanity project at sanity.io/manage (dataset `production`), then provide `SANITY_PROJECT_ID`, and create an API token with Editor rights (`SANITY_WRITE_TOKEN`, used only for seeding, never committed). Add `SANITY_PROJECT_ID` to `.env.local`. The site reads Sanity only on the server, so no CORS origin is needed. Then:

```bash
SANITY_STUDIO_PROJECT_ID=<id> npx sanity deploy --config sanity/sanity.config.ts   # hosted Studio
node --env-file=.env.local scripts/seed-sanity.mjs
```

If `sanity deploy` rejects the `--config` flag, run it from inside the `sanity/` folder. Expected: six `seeded ...` lines and `seeded settings`. Open the hosted Studio and confirm 6 perfumes, one with Available off.

Create a Sanity webhook (Studio project settings, API, Webhooks): URL `https://<site>/api/revalidate?secret=<SANITY_REVALIDATE_SECRET>`, trigger on create, update and delete for `product` and `siteSettings`. Do this after the first deploy in Pass 2's README task if the site is not deployed yet.

- [ ] **Step 10: Verify and commit**

Run: `npm run typecheck && npm test && npm run check`
Expected: PASS.

```bash
git add sanity src scripts tests
git commit -m "feat: sanity schema, validated catalog access, seed script and revalidation"
```

---

### Task 5: Logo, icons, modal, mobile menu and footer

**Files:**
- Create: `src/components/Logo.tsx`, `src/components/Icons.tsx`, `src/components/Modal.tsx`, `src/components/nav.ts`, `src/components/MobileMenu.tsx`, `src/components/Footer.tsx`

The header and root layout need the cart button, so they are written in Task 6 once `CartMenu` exists. Nothing imports these files yet, so this commit stays green.

**Interfaces:**
- Produces:
  - `Logo({ showParfum?: boolean; className?: string })`: hand-built SVG, `currentColor`.
  - Icons (each `(props: SVGProps<SVGSVGElement>) => JSX.Element`): `MenuIcon`, `CloseIcon`, `PlusIcon`, `MinusIcon`, `CheckIcon`, `ArrowIcon`, `CartIcon`, `AlertIcon`, `InstagramIcon`, `FacebookIcon`, `TelegramIcon`, and `socialIcon(label: string)` returning the matching icon component or `undefined`.
  - `Modal({ open: boolean; onClose: () => void; label: string; from?: "right" | "fade" | "full"; className?: string; children })`.
  - `NAV: { href: string; label: string }[]`.

- [ ] **Step 1: Run the design skill**

Invoke `ui-ux-pro-max:ui-ux-pro-max` for header, mobile menu and footer. Append accepted and rejected suggestions to `docs/design-notes.md`.

- [ ] **Step 2: Write `src/components/Icons.tsx`**

```tsx
import type { ComponentType, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const make = (d: string) =>
  function Icon(props: IconProps) {
    return (
      <svg
        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" {...props}
      >
        <path d={d} />
      </svg>
    );
  };

export const MenuIcon = make("M3 7h18M3 12h18M3 17h18");
export const CloseIcon = make("M5 5l14 14M19 5L5 19");
export const PlusIcon = make("M12 5v14M5 12h14");
export const MinusIcon = make("M5 12h14");
export const CheckIcon = make("M5 12.5l4.5 4.5L19 7.5");
export const ArrowIcon = make("M4 12h16M14 6l6 6-6 6");
export const CartIcon = make("M5 8h14l-1 12H6L5 8zM9 8V6.5a3 3 0 016 0V8");
export const AlertIcon = make("M12 3a9 9 0 100 18 9 9 0 000-18zM9 9l6 6M15 9l-6 6");
export const InstagramIcon = make("M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM12 8a4 4 0 100 8 4 4 0 000-8zM17.5 6.5v.01");
export const FacebookIcon = make("M14 21v-8h3l.5-3.5H14V7.5c0-1 .5-1.5 1.5-1.5H17.5V3h-2.7C12.3 3 10.5 4.5 10.5 7v2.5H8V13h2.5v8");
export const TelegramIcon = make("M21 4L3 11l6 2 2 6 3-3.5 5 3.5L21 4zM9 13l12-9");

const SOCIAL: Record<string, ComponentType<IconProps>> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  telegram: TelegramIcon,
};

export const socialIcon = (label: string) => SOCIAL[label.trim().toLowerCase()];
```

- [ ] **Step 3: Write `src/components/Logo.tsx`**

Hand-built from the reference `Saka logo.jpg` (reference only, never placed on the site). Cap height is 40 units. A and K are filled polygons, S and PARFUM are stroked paths.

```tsx
const A = "M48 40L65.2 0H69.8L87 40H81.55L77.05 29.5H57.95L53.45 40Z M67.45 7.44L74.9 24.5H60.1Z";
const K = "M111 0H116.4V40H111Z M116.4 19.2L137.2 0H144L120.6 24Z M116.4 14.1L144 40H136.1L116.4 21.5Z";
const S = "M25.5 8C22.5 4.5 18.5 2.5 13.5 2.5C7 2.5 2.8 6 2.8 10.2C2.8 15 7.5 16.5 13.5 18.3C19.8 20.2 25.5 22 25.5 29C25.5 34 20.5 37.5 14 37.5C8.5 37.5 4.5 35.5 2.5 32";

const PARFUM: { x: number; d: string }[] = [
  { x: 42.5, d: "M.65 11.6V.65H4.6C7.2.65 8.2 2.2 8.2 3.9C8.2 5.6 7.2 7.1 4.6 7.1H.65" },
  { x: 63.3, d: "M.3 11.6L5 0L9.7 11.6M2 8H8" },
  { x: 85.2, d: "M.65 11.6V.65H4.6C7.1.65 8.1 2.1 8.1 3.7C8.1 5.3 7.1 6.8 4.6 6.8H.65M4.4 6.8L8.3 11.6" },
  { x: 106, d: "M.65 11.6V.65H7.4M.65 5.9H6.4" },
  { x: 125.3, d: "M.65.65V7.5C.65 10.3 2.5 11.6 4.4 11.6C6.3 11.6 8.15 10.3 8.15 7.5V.65" },
  { x: 146, d: "M.65 11.6V.65L5.7 9L10.75.65V11.6" },
];

type Props = { showParfum?: boolean; className?: string };

export function Logo({ showParfum = true, className }: Props) {
  return (
    <svg viewBox={`0 0 200 ${showParfum ? 65.2 : 40}`} role="img" aria-label="SAKA Parfum" className={className}>
      <path d={S} fill="none" stroke="currentColor" strokeWidth="5" />
      <path d={A} fill="currentColor" fillRule="evenodd" />
      <path d={K} fill="currentColor" />
      <path d={A} fill="currentColor" fillRule="evenodd" transform="translate(113 0)" />
      {showParfum && (
        <g transform="translate(0 53.6)" fill="none" stroke="currentColor" strokeWidth="1.3">
          {PARFUM.map(({ x, d }) => (
            <path key={x} d={d} transform={`translate(${x} 0)`} />
          ))}
        </g>
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Compare the logo against the reference and adjust**

Temporarily render the logo big and view it. Run a throwaway script outside the repo (scratchpad) that renders the SVG string to PNG with `sharp` at 1200px wide, then open the PNG and the reference `Saka logo.jpg` side by side. Adjust path coordinates until: S is round with open terminals, A and K are geometric with a flat narrow apex, spacing matches the reference (S to A gap about 0.5 of cap height), and PARFUM is centered below with wide tracking. Keep letters as paths. Do not use `<text>`. Re-run `npm run check` after editing.

- [ ] **Step 5: Write `src/components/Modal.tsx`**

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  from?: "right" | "fade" | "full";
  className?: string;
  children: ReactNode;
};

const BOX = {
  right: "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(26rem,100vw)] max-w-none shadow-soft",
  full: "fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none",
  fade: "m-auto w-[min(28rem,calc(100vw-2rem))] shadow-soft",
};
const OFFSET = { right: { x: 48 }, full: { y: -12 }, fade: { y: 12 } };

export function Modal({ open, onClose, label, from = "fade", className = "", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useGSAP(
    () => {
      const dialog = ref.current;
      if (!dialog) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (open) {
          if (!dialog.open) dialog.showModal();
          gsap.fromTo(dialog, { opacity: 0, ...OFFSET[from] }, { opacity: 1, x: 0, y: 0, duration: 0.3, ease: "power2.out" });
        } else if (dialog.open) {
          gsap.to(dialog, { opacity: 0, ...OFFSET[from], duration: 0.2, ease: "power2.in", onComplete: () => dialog.close() });
        }
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
      });
    },
    { dependencies: [open, from] },
  );

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className={`${BOX[from]} bg-bg p-0 text-text backdrop:bg-[rgba(23,26,18,0.3)] ${className}`}
    >
      <div className="h-full overflow-y-auto overscroll-contain">{children}</div>
    </dialog>
  );
}
```

- [ ] **Step 6: Write `nav.ts`, `MobileMenu.tsx`, `Footer.tsx`**

`src/components/nav.ts`:

```ts
export const NAV = [
  { href: "/products", label: "Products" },
  { href: "/#visit", label: "Visit us" },
];
```

`src/components/MobileMenu.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { CloseIcon, MenuIcon } from "./Icons";
import { Modal } from "./Modal";
import { NAV } from "./nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center lg:hidden"
      >
        <MenuIcon />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label="Menu" from="full">
        <div className="flex min-h-full flex-col px-5 py-3">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center self-end">
            <CloseIcon />
          </button>
          <nav aria-label="Mobile" className="mt-10 flex flex-col gap-8">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-display text-[22px] font-medium uppercase tracking-[0.1em]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </Modal>
    </>
  );
}
```

`src/components/Footer.tsx`:

```tsx
import { socialIcon } from "./Icons";
import { Logo } from "./Logo";
import type { SiteSettings } from "@/lib/sanity";

export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container flex flex-col items-center gap-6 py-14 text-center">
        <Logo className="h-14 w-auto" />
        <p className="small text-muted">Fragrance from Cambodia.</p>
        <p className="small max-w-[62ch] text-muted">
          {settings.address}
          {settings.phone && <> &middot; <a className="link" href={`tel:${settings.phone.replace(/\s/g, "")}`}>{settings.phone}</a></>}
        </p>
        {settings.socialLinks.length > 0 && (
          <ul className="flex gap-2">
            {settings.socialLinks.map(({ label, url }) => {
              const Icon = socialIcon(label);
              return (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex min-h-11 min-w-11 items-center justify-center text-secondary">
                    {Icon ? <Icon /> : <span className="small">{label}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <p className="small text-muted">&copy; {new Date().getFullYear()} {settings.storeName}</p>
      </div>
    </footer>
  );
}
```

Clear space rule: the footer logo is `h-14` so the S height is about 14 units of 56px, padding `py-14` (56px) exceeds it.

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck && npm run check`
Expected: PASS (Header and layout come next, so nothing imports them yet).

```bash
git add src/components docs/design-notes.md
git commit -m "feat: hand-built logo, line icons, native dialog modal, mobile menu and footer"
```

---

### Task 6: Cart store, cart drawer, header and root layout

**Files:**
- Create: `src/lib/cart.ts`, `src/components/CartMenu.tsx`, `src/components/Header.tsx`, `src/app/layout.tsx`
- Test: `tests/unit/cart.test.ts`

**Interfaces:**
- Consumes: `CartLine`, `MAX_CART_LINES`, `MAX_LINE_QTY` (`schemas.ts`), `computeTotals`, `formatUsd`, `formatRiel`, `priceOf` (`pricing.ts`), `CartCatalogItem`, `toCartCatalog`, `getCatalog`, `getSettings` (`sanity.ts`), `Modal`, icons, `NAV`, `Logo`.
- Produces: `addLine(cart: CartLine[], line: CartLine): CartLine[]`, `setLineQty(cart: CartLine[], productId: string, sizeMl: number, qty: number): CartLine[]` (qty below 1 removes the line), `useCart(): { lines: CartLine[] | null; add(line: CartLine): void; setQty(productId: string, sizeMl: number, qty: number): void; clear(): void }` where `lines` is `null` until the browser has hydrated. `CartMenu({ catalog: CartCatalogItem[] })`.

- [ ] **Step 1: Write the failing cart tests**

`tests/unit/cart.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addLine, setLineQty } from "@/lib/cart";

const line = (productId: string, sizeMl: 10 | 20 | 50, qty: number) => ({ productId, sizeMl, qty });

describe("addLine", () => {
  it("adds a new line", () => {
    expect(addLine([], line("a", 10, 1))).toEqual([line("a", 10, 1)]);
  });
  it("merges the same product and size", () => {
    expect(addLine([line("a", 10, 2)], line("a", 10, 3))).toEqual([line("a", 10, 5)]);
  });
  it("keeps different sizes as separate lines", () => {
    expect(addLine([line("a", 10, 1)], line("a", 20, 1))).toHaveLength(2);
  });
  it("caps quantity at 10", () => {
    expect(addLine([line("a", 10, 8)], line("a", 10, 5))[0].qty).toBe(10);
  });
  it("ignores new lines beyond 20", () => {
    const full = Array.from({ length: 20 }, (_, i) => line(`p${i}`, 10, 1));
    expect(addLine(full, line("extra", 10, 1))).toHaveLength(20);
  });
});

describe("setLineQty", () => {
  it("sets a quantity", () => {
    expect(setLineQty([line("a", 10, 1)], "a", 10, 4)).toEqual([line("a", 10, 4)]);
  });
  it("removes the line below 1", () => {
    expect(setLineQty([line("a", 10, 1), line("b", 20, 1)], "a", 10, 0)).toEqual([line("b", 20, 1)]);
  });
  it("caps at 10", () => {
    expect(setLineQty([line("a", 10, 1)], "a", 10, 99)[0].qty).toBe(10);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/cart.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/cart.ts`**

```ts
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { cartLineSchema, MAX_CART_LINES, MAX_LINE_QTY, type CartLine } from "./schemas";

const KEY = "saka.cart";
const listeners = new Set<() => void>();
let lines: CartLine[] | null = null;

const same = (l: CartLine, productId: string, sizeMl: number) => l.productId === productId && l.sizeMl === sizeMl;

export function addLine(cart: CartLine[], line: CartLine): CartLine[] {
  if (cart.some((l) => same(l, line.productId, line.sizeMl))) {
    return cart.map((l) => (same(l, line.productId, line.sizeMl) ? { ...l, qty: Math.min(MAX_LINE_QTY, l.qty + line.qty) } : l));
  }
  return cart.length >= MAX_CART_LINES ? cart : [...cart, { ...line, qty: Math.min(MAX_LINE_QTY, line.qty) }];
}

export function setLineQty(cart: CartLine[], productId: string, sizeMl: number, qty: number): CartLine[] {
  if (qty < 1) return cart.filter((l) => !same(l, productId, sizeMl));
  return cart.map((l) => (same(l, productId, sizeMl) ? { ...l, qty: Math.min(MAX_LINE_QTY, qty) } : l));
}

function readStorage(): CartLine[] {
  try {
    const parsed = z.array(cartLineSchema).safeParse(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function write(next: CartLine[]) {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked. The cart then lives in memory for this tab.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) {
      lines = null;
      notify();
    }
  };
  listeners.add(notify);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot(): CartLine[] {
  lines ??= readStorage();
  return lines;
}

export function useCart() {
  const current = useSyncExternalStore(subscribe, snapshot, () => null);
  return {
    lines: current,
    add: (line: CartLine) => write(addLine(snapshot(), line)),
    setQty: (productId: string, sizeMl: number, qty: number) => write(setLineQty(snapshot(), productId, sizeMl, qty)),
    clear: () => write([]),
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/cart.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Write `src/components/CartMenu.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { computeTotals, formatRiel, formatUsd, priceOf } from "@/lib/pricing";
import type { CartCatalogItem } from "@/lib/sanity";
import { CartIcon, CloseIcon, MinusIcon, PlusIcon } from "./Icons";
import { Modal } from "./Modal";

export function CartMenu({ catalog }: { catalog: CartCatalogItem[] }) {
  const { lines, setQty } = useCart();
  const [open, setOpen] = useState(false);

  const rows = (lines ?? []).map((line) => {
    const product = catalog.find((p) => p.id === line.productId);
    const price = product && priceOf(product.sizes, line.sizeMl);
    return { line, name: product?.name, price };
  });
  const priced = rows.flatMap((r) => (r.price === undefined ? [] : [{ priceUsd: r.price, qty: r.line.qty }]));
  const { subtotalUsd } = computeTotals(priced, "pickup");
  const count = (lines ?? []).reduce((n, l) => n + l.qty, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={count > 0 ? `Open cart, ${count} ${count === 1 ? "item" : "items"}` : "Open cart"}
        className="relative flex size-11 items-center justify-center"
      >
        <CartIcon />
        {lines === null ? (
          <span className="skeleton absolute right-0 top-0 h-5 w-5" aria-hidden="true" />
        ) : (
          count > 0 && (
            <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-sm bg-badge px-1 font-display text-[11px] font-medium text-ink">
              {count}
            </span>
          )
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} label="Cart" from="right">
        <div className="flex min-h-full flex-col px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="h3">Your cart</h2>
            <button type="button" aria-label="Close cart" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center">
              <CloseIcon />
            </button>
          </div>

          {lines === null ? (
            <div className="mt-8 space-y-4" aria-hidden="true">
              <div className="skeleton h-14" />
              <div className="skeleton h-14" />
            </div>
          ) : rows.length === 0 ? (
            <p className="mt-8 text-muted">
              Your cart is empty. <Link href="/products" onClick={() => setOpen(false)} className="link text-text">See what is in store.</Link>
            </p>
          ) : (
            <>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {rows.map(({ line, name, price }) => (
                  <li key={`${line.productId}-${line.sizeMl}`} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p>{name ? `${name}, ${line.sizeMl}ml` : `Unavailable item, ${line.sizeMl}ml`}</p>
                      <p className="small text-muted">{price === undefined ? "No longer sold" : formatUsd(price * line.qty)}</p>
                    </div>
                    <div className="flex items-center">
                      <button type="button" aria-label={`Remove one ${name ?? "item"}, ${line.sizeMl}ml`} onClick={() => setQty(line.productId, line.sizeMl, line.qty - 1)} className="flex size-11 items-center justify-center text-secondary">
                        <MinusIcon />
                      </button>
                      <span aria-live="polite" className="w-6 text-center">{line.qty}</span>
                      <button type="button" aria-label={`Add one ${name ?? "item"}, ${line.sizeMl}ml`} onClick={() => setQty(line.productId, line.sizeMl, line.qty + 1)} className="flex size-11 items-center justify-center text-secondary">
                        <PlusIcon />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-baseline justify-between">
                <span className="eyebrow">Subtotal</span>
                <span>{formatUsd(subtotalUsd)} <span className="small text-muted">({formatRiel(subtotalUsd)})</span></span>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 6: Write `src/components/Header.tsx` and `src/app/layout.tsx`**

`src/components/Header.tsx`:

```tsx
import Link from "next/link";
import type { CartCatalogItem } from "@/lib/sanity";
import { CartMenu } from "./CartMenu";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NAV } from "./nav";

export function Header({ catalog }: { catalog: CartCatalogItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 lg:h-[72px] lg:px-8">
        <Link href="/" aria-label="SAKA Parfum, home">
          <Logo showParfum={false} className="h-5 w-auto lg:h-6" />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="link font-display text-[13px] font-medium uppercase tracking-[0.16em]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center">
          <CartMenu catalog={catalog} />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
```

The header is 64px on mobile and 72px on desktop, and the logo cap height is 20px and 24px, so vertical clear space equals the height of the S. Horizontal padding is 20px and 32px, which also clears it.

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Jost, Montserrat } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCatalog, getSettings, toCartCatalog } from "@/lib/sanity";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-montserrat", display: "swap" });
const jost = Jost({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = { title: "SAKA Parfum | Fragrance shop in Cambodia" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [products, settings] = await Promise.all([getCatalog().catch(() => []), getSettings()]);
  return (
    <html lang="en" className={`${montserrat.variable} ${jost.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        <Header catalog={toCartCatalog(products)} />
        <main id="main" className="flex-1">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck && npm test && npm run check`
Expected: PASS.

```bash
git add src tests
git commit -m "feat: cart store, cart drawer, header and root layout"
```

---

### Task 7: Product card, grid, skeletons and section fade-up

**Files:**
- Create: `src/components/ProductCard.tsx`, `src/components/ProductGrid.tsx`, `src/components/Skeletons.tsx`, `src/components/FadeUp.tsx`

**Interfaces:**
- Consumes: `Product` (`sanity.ts`), `useCart`, `formatUsd`, `rielNumber`, `LABELS`, icons, `gsap`/`useGSAP`.
- Produces: `ProductCard({ product: Product; open: boolean; onToggle: () => void; priority?: boolean })`, `ProductGrid({ products: Product[]; className?: string; eager?: number })` (manages one open card, 2 columns mobile and 3 from 1024px), `ProductCardSkeleton()`, `ProductGridSkeleton({ count: number; className?: string })`, `FadeUp({ children; className? })`.

- [ ] **Step 1: Run the design skill**

Invoke `ui-ux-pro-max:ui-ux-pro-max` for the product card (expandable tile, size segmented control, quantity stepper, availability states) and the section rhythm. Brand brief wins. Append to `docs/design-notes.md`.

- [ ] **Step 2: Write `src/components/ProductCard.tsx`**

```tsx
"use client";

import Image from "next/image";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { gsap, useGSAP } from "@/lib/gsap";
import { formatUsd, rielNumber } from "@/lib/pricing";
import type { Product } from "@/lib/sanity";
import { LABELS } from "@/lib/taxonomy";
import { AlertIcon, CheckIcon, MinusIcon, PlusIcon } from "./Icons";

type Props = { product: Product; open: boolean; onToggle: () => void; priority?: boolean };

export function ProductCard({ product, open, onToggle, priority = false }: Props) {
  const { id, name, description, image, imageHover, sizes, available, scentFamily } = product;
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [broken, setBroken] = useState(false);
  const [sizeMl, setSizeMl] = useState(sizes[0].sizeMl);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(timer);
  }, [added]);

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (open) {
          panel.hidden = false;
          gsap.fromTo(panel, { height: 0 }, { height: "auto", duration: 0.4, ease: "power2.out" });
        } else if (!panel.hidden) {
          gsap.to(panel, { height: 0, duration: 0.4, ease: "power2.out", onComplete: () => { panel.hidden = true; } });
        }
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        panel.hidden = !open;
      });
    },
    { dependencies: [open] },
  );

  const notes = [
    ["Top", product.notesTop],
    ["Heart", product.notesHeart],
    ["Base", product.notesBase],
  ] as const;

  return (
    <article
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          onToggle();
          toggleRef.current?.focus();
        }
      }}
      className="group border border-border bg-surface p-4 transition-colors duration-[400ms] ease-out hover:border-secondary md:p-6"
    >
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="relative block w-full text-center"
      >
        <span className="relative block aspect-square overflow-hidden bg-bg">
          {broken ? (
            <span className="absolute inset-0 grid place-items-center p-4 font-display text-sm uppercase tracking-[0.1em] text-muted">{name}</span>
          ) : (
            <>
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 360px, 50vw"
                priority={priority}
                placeholder={image.lqip ? "blur" : "empty"}
                blurDataURL={image.lqip ?? undefined}
                onError={() => setBroken(true)}
                className="object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
              />
              {imageHover && (
                <Image
                  src={imageHover.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 360px, 50vw"
                  className="object-cover opacity-0 transition-opacity duration-[400ms] ease-out group-hover:opacity-100"
                />
              )}
            </>
          )}
        </span>
        <span className="h3 mt-5 block">{name}</span>
        <span className="small mt-2 block">{sizes.map((s) => `${s.sizeMl}ml ${formatUsd(s.priceUsd, true)}`).join(" · ")}</span>
        <span className="small block text-muted">{sizes.map((s) => rielNumber(s.priceUsd)).join(" · ")} KHR</span>
        <span className={`small mt-2 inline-flex items-center gap-1 ${available ? "text-success" : "text-error"}`}>
          {available ? <CheckIcon width={18} height={18} /> : <AlertIcon width={18} height={18} />}
          {available ? "Available" : "Out of stock"}
        </span>
        <span className="absolute bottom-0 right-0 text-secondary">{open ? <MinusIcon /> : <PlusIcon />}</span>
      </button>

      <div id={panelId} ref={panelRef} role="region" aria-label={`${name} details`} hidden className="overflow-hidden">
        <div className="space-y-5 pt-6 text-left">
          <dl className="grid grid-cols-[4rem_1fr] gap-x-3 gap-y-2">
            {notes.map(([label, list]) =>
              list.length > 0 ? (
                <Fragment key={label}>
                  <dt className="eyebrow">{label}</dt>
                  <dd className="small">{list.join(", ")}</dd>
                </Fragment>
              ) : null,
            )}
          </dl>
          <p className="small">{description}</p>
          {scentFamily.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {scentFamily.map((f) => (
                <li key={f} className="rounded-sm bg-badge px-2 py-0.5 font-display text-[11px] font-medium uppercase tracking-[0.12em] text-ink">{LABELS[f]}</li>
              ))}
            </ul>
          )}

          <fieldset>
            <legend className="eyebrow mb-2">Size</legend>
            <div className="grid grid-cols-3">
              {sizes.map((s) => (
                <label key={s.sizeMl} className="block">
                  <input
                    type="radio"
                    name={`size-${panelId}`}
                    value={s.sizeMl}
                    checked={sizeMl === s.sizeMl}
                    onChange={() => setSizeMl(s.sizeMl)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-11 cursor-pointer items-center justify-center border border-border font-display text-xs font-medium tracking-[0.1em] peer-checked:border-btn peer-checked:bg-btn peer-checked:text-btn-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary">
                    {s.sizeMl}ml
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between">
            <span className="eyebrow">Quantity</span>
            <div className="flex items-center">
              <button type="button" aria-label="Fewer" onClick={() => setQty(Math.max(1, qty - 1))} className="flex size-11 items-center justify-center text-secondary"><MinusIcon /></button>
              <span aria-live="polite" className="w-6 text-center">{qty}</span>
              <button type="button" aria-label="More" onClick={() => setQty(Math.min(10, qty + 1))} className="flex size-11 items-center justify-center text-secondary"><PlusIcon /></button>
            </div>
          </div>

          <button
            type="button"
            disabled={!available}
            onClick={() => {
              add({ productId: id, sizeMl, qty });
              setAdded(true);
            }}
            className="btn btn-primary w-full"
          >
            {added ? "Added to cart" : "Add to cart"}
          </button>
          {!available && <p className="small text-error">This scent is out of stock. Visit us or check back soon.</p>}
        </div>
      </div>
    </article>
  );
}
```

The button text is "Add to cart"; the `.btn` class uppercases it. If the product `sizes` array could be empty the schema already rejects it, so `sizes[0]` is safe.

- [ ] **Step 3: Write `ProductGrid.tsx`, `Skeletons.tsx`, `FadeUp.tsx`**

`src/components/ProductGrid.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Product } from "@/lib/sanity";
import { ProductCard } from "./ProductCard";

type Props = { products: Product[]; className?: string; eager?: number };

export function ProductGrid({ products, className = "", eager = 3 }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className={`grid grid-cols-2 items-start gap-4 lg:grid-cols-3 lg:gap-6 ${className}`}>
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            priority={i < eager}
            open={openId === product.id}
            onToggle={() => setOpenId(openId === product.id ? null : product.id)}
          />
        </li>
      ))}
    </ul>
  );
}
```

`src/components/Skeletons.tsx`:

```tsx
export function ProductCardSkeleton() {
  return (
    <div className="border border-border bg-surface p-4 md:p-6" aria-hidden="true">
      <div className="skeleton aspect-square bg-bg" />
      <div className="skeleton mx-auto mt-5 h-6 w-3/4" />
      <div className="skeleton mx-auto mt-3 h-4 w-full" />
      <div className="skeleton mx-auto mt-2 h-4 w-2/3" />
      <div className="skeleton mx-auto mt-3 h-5 w-24" />
    </div>
  );
}

export function ProductGridSkeleton({ count, className = "" }: { count: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading products" className={`grid grid-cols-2 items-start gap-4 lg:grid-cols-3 lg:gap-6 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

`src/components/FadeUp.tsx`:

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export function FadeUp({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(el, { opacity: 0, y: 12 });
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            gsap.to(el, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
            observer.disconnect();
          },
          { threshold: 0.15 },
        );
        observer.observe(el);
        return () => observer.disconnect();
      });
    },
    { scope: ref },
  );

  return <div ref={ref} className={className}>{children}</div>;
}
```

`FadeUp` is used only on sections below the hero so nothing above the fold flashes. It fires once when the section enters view and is never tied to scroll position.

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck && npm run check`
Expected: PASS.

```bash
git add src/components docs/design-notes.md
git commit -m "feat: expandable product card, grid, skeletons and fade-up"
```

---

### Task 8: Pages, hero and placeholder turntable frames

**Files:**
- Create: `scripts/placeholder-frames.mjs`, `public/turntable/frame-00.webp` to `frame-23.webp` (generated, committed)
- Create: `src/components/Hero.tsx`, `src/components/VisitUs.tsx`
- Create: `src/app/(home)/page.tsx`, `src/app/(home)/loading.tsx`
- Create: `src/app/products/page.tsx`, `src/app/products/loading.tsx`, `src/app/products/error.tsx`
- Create: `src/app/not-found.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces: routes `/`, `/products`, a branded 404. The hero bottle image element carries `data-hero-bottle` and the intro-hidden elements carry `data-intro-hide` (hooks for Pass 4).

- [ ] **Step 1: Run the design skill**

Invoke `ui-ux-pro-max:ui-ux-pro-max` for the hero, home sections, Visit us and 404. Append to `docs/design-notes.md`.

- [ ] **Step 2: Write and run the placeholder frames script**

`scripts/placeholder-frames.mjs`:

```js
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { bottleSvg } from "./lib/bottle.mjs";

const FRAMES = 24;
await mkdir("public/turntable", { recursive: true });
for (let i = 0; i < FRAMES; i++) {
  const svg = bottleSvg({ angle: (360 / FRAMES) * i, tick: i });
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(`public/turntable/frame-${String(i).padStart(2, "0")}.webp`);
}
console.log(`wrote ${FRAMES} placeholder frames`);
```

Run: `node scripts/placeholder-frames.mjs`
Expected: `wrote 24 placeholder frames`. Check sizes: `ls -l public/turntable | head` (each file under 25KB). Open `frame-00.webp` and `frame-06.webp`: the bottle must look front-facing at frame 0 and turned at frame 6, with a hatched label and a moving tick bar. These are placeholders until the videos arrive (Pass 4 replaces them with `scripts/extract-frames`).

- [ ] **Step 3: Write `Hero.tsx` and `VisitUs.tsx`**

`src/components/Hero.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative flex min-h-[max(640px,calc(100svh-4.5rem))] flex-col items-center justify-center px-5 py-10 text-center">
      <div data-intro-hide className="flex flex-col items-center">
        <p className="eyebrow">Parfum</p>
        <h1 id="hero-title" className="h1 mt-4 max-w-[18ch]">Find the scent that feels like you.</h1>
        <p className="mt-4 max-w-[40ch] text-muted">Fragrance in 10ml, 20ml and 50ml bottles, from our shop in Cambodia.</p>
      </div>
      <Image
        data-hero-bottle
        src="/turntable/frame-00.webp"
        alt="A SAKA Parfum bottle, front view"
        width={720}
        height={960}
        priority
        sizes="(min-width: 1024px) 420px, 60vw"
        className="my-8 h-[40svh] w-auto lg:h-[50svh]"
      />
      <div data-intro-hide className="flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn btn-primary">Shop fragrances</Link>
      </div>
    </section>
  );
}
```

`src/components/VisitUs.tsx`:

```tsx
import type { SiteSettings } from "@/lib/sanity";
import { ArrowIcon } from "./Icons";

export function VisitUs({ settings }: { settings: SiteSettings }) {
  return (
    <section id="visit" aria-labelledby="visit-title" className="section">
      <div className="container text-center">
        <p className="eyebrow">Visit us</p>
        <h2 id="visit-title" className="h2 mt-3">Visit the shop</h2>
        <address className="mx-auto mt-6 max-w-[62ch] whitespace-pre-line not-italic">{settings.address}</address>
        {settings.hours.length > 0 && (
          <dl className="mx-auto mt-6 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-left">
            {settings.hours.map(({ days, open, close }) => (
              <div key={days} className="contents">
                <dt>{days}</dt>
                <dd className="text-muted">{open} to {close}</dd>
              </div>
            ))}
          </dl>
        )}
        {settings.phone && <p className="mt-6"><a className="link" href={`tel:${settings.phone.replace(/\s/g, "")}`}>{settings.phone}</a></p>}
        <a href={settings.mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-8">
          Get directions <ArrowIcon width={18} height={18} />
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write the home page and its skeleton**

`src/app/(home)/page.tsx`:

```tsx
import Link from "next/link";
import { FadeUp } from "@/components/FadeUp";
import { Hero } from "@/components/Hero";
import { ArrowIcon } from "@/components/Icons";
import { ProductGrid } from "@/components/ProductGrid";
import { VisitUs } from "@/components/VisitUs";
import { getCatalog, getSettings } from "@/lib/sanity";

export const revalidate = 60;

export default async function HomePage() {
  const [products, settings] = await Promise.all([getCatalog(), getSettings()]);
  const stockDate = settings.stockUpdatedAt
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Asia/Phnom_Penh" }).format(new Date(settings.stockUpdatedAt))
    : null;

  return (
    <>
      <Hero />
      <section id="collection" aria-labelledby="collection-title" className="section">
        <FadeUp className="container text-center">
          <p className="eyebrow">In store now</p>
          <h2 id="collection-title" className="h2 mt-3">On our shelves today</h2>
          <p className="mt-4 text-muted">{stockDate ? `Stock as of ${stockDate}. ` : ""}Visit us to try any scent.</p>
          <ProductGrid products={products.slice(0, 6)} className="mt-10 lg:[&>li:nth-child(n+4)]:hidden" />
          <Link href="/products" className="link mt-10 inline-flex items-center gap-2 font-display text-[13px] font-medium uppercase tracking-[0.16em]">
            View products <ArrowIcon width={18} height={18} />
          </Link>
        </FadeUp>
      </section>
      <FadeUp><VisitUs settings={settings} /></FadeUp>
    </>
  );
}
```

`src/app/(home)/loading.tsx`:

```tsx
import { ProductGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <div className="flex min-h-[max(640px,calc(100svh-4.5rem))] flex-col items-center justify-center gap-6 px-5" aria-hidden="true">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-12 w-full max-w-md" />
        <div className="skeleton h-[40svh] w-[30svh] lg:h-[50svh] lg:w-[37.5svh]" />
        <div className="skeleton h-11 w-48" />
      </div>
      <section className="section"><div className="container"><ProductGridSkeleton count={6} className="lg:[&>div:nth-child(n+4)]:hidden" /></div></section>
    </>
  );
}
```

- [ ] **Step 5: Write `/products`, its loading and error states, and the 404**

`src/app/products/page.tsx`:

```tsx
import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import { getCatalog } from "@/lib/sanity";

export const revalidate = 60;
export const metadata = { title: "Products | SAKA Parfum" };

export default async function ProductsPage() {
  const products = await getCatalog();
  return (
    <section aria-labelledby="products-title" className="section">
      <div className="container text-center">
        <p className="eyebrow">Products</p>
        <h1 id="products-title" className="h2 mt-3">Everything on our shelves</h1>
        {products.length === 0 ? (
          <p className="mx-auto mt-10 max-w-[62ch] text-muted">
            Our shelves are being restocked. <Link href="/#visit" className="link text-text">Visit us</Link> or message us for what is new.
          </p>
        ) : (
          <ProductGrid products={products} className="mt-10" />
        )}
      </div>
    </section>
  );
}
```

`src/app/products/loading.tsx`:

```tsx
import { ProductGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <section className="section">
      <div className="container">
        <div className="mx-auto skeleton h-4 w-24" aria-hidden="true" />
        <div className="mx-auto mt-3 skeleton h-10 w-72 max-w-full" aria-hidden="true" />
        <ProductGridSkeleton count={6} className="mt-10 [&>div:nth-child(n+5)]:hidden lg:[&>div:nth-child(n+5)]:block" />
      </div>
    </section>
  );
}
```

`src/app/products/error.tsx`:

```tsx
"use client";

export default function ProductsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="section">
      <div className="container text-center">
        <h1 className="h2">We could not load our shelf just now</h1>
        <p className="mt-4 text-muted">Please try again in a moment.</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-8">Try again</button>
      </div>
    </section>
  );
}
```

`src/app/not-found.tsx`:

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container flex flex-col items-center text-center">
        <p className="eyebrow">404</p>
        <h1 className="h1 mt-4 max-w-[20ch]">This page is not on our shelf.</h1>
        <p className="mt-4 text-muted">Let us take you back to the scents.</p>
        <Link href="/" className="btn btn-primary mt-8">Back home</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Run the app and look at it**

Run: `npm run typecheck && npm run check && npm run dev` with `.env.local` set to the real Sanity project from Task 4.
Open `http://localhost:3000`, `/products` and `/nope`. Take desktop (1280 wide) and mobile (390 wide) screenshots with Playwright (`npx playwright screenshot --viewport-size=1280,900 http://localhost:3000 home-desktop.png`, and the same at `390,844`). Check: cream background, no horizontal scroll, header 72px and 64px, 3 cards on desktop home and 6 on mobile, hero bottle visible, the logo matches the reference. Fix visual issues now.

- [ ] **Step 7: Commit**

```bash
git add scripts public src docs
git commit -m "feat: home, products, 404, hero and placeholder turntable frames"
```

---

### Task 9: End-to-end and accessibility tests

**Files:**
- Create: `tests/mock-server.mjs`, `tests/e2e-server.mjs`, `tests/fixtures/catalog.json`, `tests/fixtures/settings.json`, `playwright.config.ts`
- Test: `tests/e2e/catalog.spec.ts`, `tests/e2e/a11y.spec.ts`

**Interfaces:**
- Produces: `startMock(port?: number)` and mutable `state` from `tests/mock-server.mjs` (Pass 2 extends it with khqr.dev and Telegram routes). Playwright projects `desktop` and `mobile`, base URL `http://localhost:3100`.

- [ ] **Step 1: Write the fixtures and mock server**

`tests/fixtures/settings.json`:

```json
{
  "storeName": "SAKA Parfum",
  "address": "12 Sample Street, Phnom Penh",
  "hours": [{ "days": "Every day", "open": "9:00", "close": "19:00" }],
  "phone": "+855 12 000 000",
  "mapUrl": "https://maps.app.goo.gl/sample",
  "socialLinks": [{ "label": "Instagram", "url": "https://instagram.com/sakaparfum" }],
  "stockUpdatedAt": "2026-10-18T03:00:00Z"
}
```

`tests/fixtures/catalog.json` has six products in the exact GROQ projection shape (`id`, `name`, `slug`, `description`, notes, `scentFamily`, `vibes`, `occasions`, `sizes`, `available`, `displayOrder`, `image { url, lqip, alt }`, `imageHover`). Use these ids and names, with image `url` set to `/turntable/frame-00.webp` for all: `p-jasmine` Jasmine Rain (12, 22, 48), `p-amber` Warm Amber (14, 26, 58), `p-cedar` Cedar Linen (12, 22, 50), `p-sea` Sea Salt Morning (11, 20, 45), `p-musk` White Musk (10, 18, 40), `p-orange` Orange Peel (12, 22, 48, `available: false`). Write all six out in full (copy the notes, families, vibes and occasions from the seed script).

`tests/mock-server.mjs`:

```js
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));

export const state = { catalog: load("catalog"), settings: load("settings") };

export function startMock(port = 4010) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const send = (code, body) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (url.pathname.includes("/data/query/")) {
      const query = url.searchParams.get("query") ?? "";
      return send(200, { result: query.includes("siteSettings") ? state.settings : state.catalog });
    }
    send(404, { error: "not found" });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
```

`tests/e2e-server.mjs` (starts the mock, builds against it, then serves):

```js
import { spawn } from "node:child_process";
import { startMock } from "./mock-server.mjs";

await startMock(4010);

const env = {
  ...process.env,
  SANITY_PROJECT_ID: "mock",
  SANITY_API_HOST: "http://127.0.0.1:4010",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
};
const next = (...args) =>
  new Promise((resolve, reject) => {
    spawn("npx", ["next", ...args], { stdio: "inherit", shell: true, env }).on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`next ${args[0]} failed`))));
  });

await next("build");
await next("start", "-p", "3100");
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3100" },
  webServer: { command: "node tests/e2e-server.mjs", url: "http://localhost:3100", timeout: 240_000, reuseExistingServer: false },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
```

- [ ] **Step 2: Write the failing e2e tests**

`tests/e2e/catalog.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("home shows the hero and the right number of preview cards", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the scent that feels like you.");
  const expected = info.project.name === "desktop" ? 3 : 6;
  await expect(page.locator("#collection li:visible")).toHaveCount(expected);
  await expect(page.getByRole("link", { name: /view products/i })).toBeVisible();
});

test("products page lists every product", async ({ page }) => {
  await page.goto("/products");
  await expect(page.locator("main li article")).toHaveCount(6);
});

test("a card opens and closes, one at a time", async ({ page }) => {
  await page.goto("/products");
  const first = page.locator("article").nth(0).getByRole("button").first();
  const second = page.locator("article").nth(1).getByRole("button").first();
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await second.click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(second).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(second).toHaveAttribute("aria-expanded", "false");
});

test("adding to the cart updates the count and survives a reload", async ({ page }) => {
  await page.goto("/products");
  await page.locator("article").nth(0).getByRole("button").first().click();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByRole("button", { name: /Open cart, 1 item/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Open cart, 1 item/ })).toBeVisible();
  await page.getByRole("button", { name: /Open cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toContainText("Jasmine Rain, 10ml");
});

test("out of stock products cannot be added", async ({ page }) => {
  await page.goto("/products");
  const card = page.locator("article", { hasText: "Orange Peel" });
  await expect(card).toContainText("Out of stock");
  await card.getByRole("button").first().click();
  await expect(card.getByRole("button", { name: "Add to cart" })).toBeDisabled();
});

test("unknown routes show the branded 404", async ({ page }) => {
  const response = await page.goto("/nope");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("not on our shelf");
});
```

`tests/e2e/a11y.spec.ts`:

```ts
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
```

- [ ] **Step 3: Run and fix**

Run: `npm run test:e2e`
Expected on first run: the build uses the mock catalog and all tests are evaluated. Failures here are real bugs in earlier tasks: fix the code, not the tests (unless a selector is plainly wrong). Typical issues to expect: Sanity client rejecting the mock host (if `useProjectHostname: false` misbehaves, log the requested URL in the mock server and adjust `apiHost` handling), axe contrast findings on any `text-muted` or `text-secondary` small text (use `text-muted`, never `text-secondary`, for small text), and the 2-column card layout overflowing at 390px.
Expected when done: all tests PASS on both projects.

- [ ] **Step 4: Commit**

```bash
git add tests playwright.config.ts
git commit -m "test: e2e catalog and cart flows, axe checks, local sanity mock"
```

---

### Task 10: Pass 1 verification and handoff

- [ ] **Step 1: Run every gate**

```bash
npm run typecheck && npm test && npm run check && npm run build && npm run test:e2e
```

Expected: everything PASS. Report real output. If anything fails, fix it before continuing.

- [ ] **Step 2: Manual review checklist**

Confirm and record in the commit message: skeleton shows on `/products` throttled navigation (DevTools slow 3G), keyboard only: skip link, header, cart drawer open and Escape returns focus to the cart button, card toggles by Enter and Space, reduced motion (DevTools rendering emulation) removes every animation, no exclamation marks or em dashes (`npm run check`), no emoji, nothing off-palette.

- [ ] **Step 3: Push and request review**

```bash
git push
```

Then invoke `superpowers:requesting-code-review` for the pass and wait for approval before starting Pass 2 (`2026-10-18-saka-parfum-02-checkout-payment.md`).
