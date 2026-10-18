# SAKA Parfum R2: Storefront Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the calmer storefront: light by default with a header theme switch, 8px cards that show only a floating bottle and the name, a product modal (shareable `?scent=` URL) holding sizes, prices, stock and add to cart, and /products grouped by family, with every transition easing into the next.

**Architecture:** One `SpinBottle` component (transparent still plus a lazy 36-frame sprite, optional float, imperative `spin()`) is shared by cards, the modal and, in R3, the hero and intro. Cards are links that push `?scent=<slug>` onto the current URL. A page-level `ProductModal` reads `useSearchParams` and renders inside the existing native-dialog `Modal`. `Modal` gains `onShow` and `onHide` timeline hooks, so the product modal can glide the bottle between card and stage inside the same GSAP timeline that opens and closes the dialog. Theme lives on `html[data-theme]`, set before paint by an inline head script.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, GSAP 3 with `@gsap/react`, sharp and ffmpeg (frame script), Vitest, Playwright, axe-core.

**Spec:** `docs/superpowers/specs/2026-10-18-saka-redesign-design.md` (sections 6 and 8). R1 (`2026-10-18-saka-parfum-05-r1-data-admin.md`) must be complete and approved.

## Global Constraints

- `CLAUDE.md` wins any conflict. Read its "Locked decisions" and the GSAP section first.
- Web design decisions go through `ui-ux-pro-max:ui-ux-pro-max` first. Load `gsap-skills:gsap-core`, `gsap-skills:gsap-timeline`, `gsap-skills:gsap-react` and `gsap-skills:gsap-performance` before animation code. The brand brief wins. Append what was accepted and rejected to `docs/design-notes.md`.
- Skeleton loaders for every loading state. No spinners, no blank screens.
- Code like a senior developer: less code where possible, no dead code, no needless abstractions or wrappers, no duplicated logic, no unused dependencies.
- Never use em dashes anywhere. No exclamation marks in any copy. Avoid the non-null assertion operator followed by a space.
- USD only. Sizes, prices and stock appear only inside the product modal, the cart and checkout. Never on cards or anywhere on home.
- Out of stock: one "Out of stock" pill in the modal (`--ink` text on `--badge`, 11px Montserrat 500 uppercase, `rounded-full`) and a disabled Add to cart button with `aria-describedby` on the pill. No icon, no red, no extra line.
- Radius: `rounded-card` (8px) on cards, modal, drawer, admin panels. `rounded-sm` (4px) on buttons, inputs, size segments. Only the pill is fully rounded.
- Motion: GSAP only, every animation inside `gsap.matchMedia()` with a reduced-motion branch, using `MOTION` from `src/lib/gsap.ts` (enter 0.7s `power3.out`, exit 0.5s `power2.inOut`, glide 0.8s `power3.inOut`). No back, elastic or bounce eases. Nothing visible under 300ms except press feedback. CSS motion only for control state transitions, the theme color fade and the dialog backdrop.
- Theme: light on first visit for everyone. Dark only after the visitor uses the header switch, remembered in `localStorage["saka.theme"]`. Dark tokens under `html[data-theme="dark"]`.
- Palette only. No #FFFFFF or #000000. Icons are 1.5px line icons, 24px.
- Targets: initial JavaScript under 170KB gzipped, CLS under 0.1, WCAG 2.2 AA, axe zero serious or critical.
- Report real command output before claiming anything passes. Commits small and conventional with the session's attribution trailer, pushed to `origin main`.

## File Structure

```
src/lib/gsap.ts                 (modify) MOTION constants
src/lib/head-script.ts          THEME_KEY, HEAD_SCRIPT (R3 extends it with the intro flag)
src/lib/catalog.ts              (modify) previewPicks
src/components/ThemeToggle.tsx
src/components/SpinBottle.tsx   still, lazy sprite, float, spin handle, framePosition
src/components/ProductModal.tsx openScent, ProductModal, Details
src/components/ProductCard.tsx  (rewrite) link card with floating bottle and name
src/components/ProductGrid.tsx  (rewrite) server component, no state
src/components/Modal.tsx        (modify) MOTION timings, product variant, onShow and onHide hooks
src/components/Header.tsx, Icons.tsx, Skeletons.tsx, FadeUp.tsx, Hero.tsx   (modify)
src/app/layout.tsx, globals.css, (home)/page.tsx, products/page.tsx, products/loading.tsx   (modify)
scripts/frames.ts               placeholder and video modes, writeBottle
scripts/lib/bottle.mjs          (modify) transparent backdrop, configurable ticks
public/hero/, public/products/<slug>/   still.webp and spin.webp placeholders
deleted: public/turntable/, scripts/placeholder-frames.mjs
tests/unit/frames.test.ts, spin-bottle.test.ts, catalog.test.ts (modify)
tests/e2e/theme.spec.ts, modal.spec.ts, catalog.spec.ts, a11y.spec.ts, admin.spec.ts, helpers.ts   (modify or create)
```

---

### Task 1: Tokens, theme switch, motion constants and smoother dialogs

**Files:**
- Create: `src/lib/head-script.ts`, `src/components/ThemeToggle.tsx`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/gsap.ts`, `src/components/Header.tsx`, `src/components/Icons.tsx`, `src/components/Modal.tsx`, `src/components/FadeUp.tsx`, every file containing `rounded-[8px]` (from R1), `tests/e2e/a11y.spec.ts`
- Test: `tests/e2e/theme.spec.ts`

**Interfaces:**
- Produces:
  - `gsap.ts`: `MOTION = { enter: { duration: 0.7, ease: "power3.out" }, exit: { duration: 0.5, ease: "power2.inOut" }, glide: { duration: 0.8, ease: "power3.inOut" } } as const`.
  - `head-script.ts`: `THEME_KEY = "saka.theme"`, `HEAD_SCRIPT: string`.
  - `ThemeToggle()`: button, accessible name "Dark mode", `aria-pressed` true in dark.
  - `Icons.tsx`: `SunIcon`, `MoonIcon`. `CheckIcon` is removed in Task 4 when its last user goes.
  - `globals.css`: `rounded-card` utility (`--radius-card: 8px`), `--contact` token, `.card-title`, `html.theme-fade`, dialog backdrop fade.
  - `Modal` props: `from?: "right" | "fade" | "full" | "product"`, `onShow?: (tl: gsap.core.Timeline) => void`, `onHide?: (tl: gsap.core.Timeline) => void`. Both hooks run only when motion is allowed. Tweens they add at position 0 run with the dialog's own tween, and the dialog closes when the whole close timeline ends.

- [ ] **Step 1: Design pass**

Invoke `ui-ux-pro-max:ui-ux-pro-max` with `"theme toggle header accessible"` (`--domain ux`) and `"modal dialog backdrop transition"` (`--domain ux`). Load the four GSAP skills. Record accepted and rejected points in `docs/design-notes.md` under "R2 tokens and theme".

- [ ] **Step 2: Write the failing theme spec**

`tests/e2e/theme.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("starts light even when the device prefers dark", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/products");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(250, 246, 238)");
  await context.close();
});

test("the header switch toggles dark, reports its state and is remembered", async ({ page }) => {
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

test("a saved dark choice applies before any script bundle runs, so there is no light flash", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("saka.theme", "dark"));
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/products");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
```

Run: `npm run test:e2e -- theme`
Expected: FAIL (no "Dark mode" button, and the first test fails because the media query turns the page dark).

- [ ] **Step 3: Tokens and CSS**

In `src/app/globals.css`:

1. Add `--contact: rgba(23, 26, 18, 0.18);` to `:root`.
2. Replace `@media (prefers-color-scheme: dark) { :root { ... } }` with the same declarations under `:root[data-theme="dark"] { ... }`, plus `--contact: rgba(23, 26, 18, 0.6);`.
3. In `@theme inline` add `--radius-card: 8px;`.
4. Inside `@layer components` add:

```css
  .card-title {
    font-family: var(--font-display); text-transform: uppercase; font-weight: 500;
    font-size: 13px; line-height: 1.4; letter-spacing: 0.08em;
  }
  @media (min-width: 1024px) { .card-title { font-size: 15px; } }
```

5. After the components layer:

```css
/* The native backdrop cannot be reached by GSAP, so it fades with CSS. */
dialog::backdrop {
  background: rgba(23, 26, 18, 0);
  transition: background-color 500ms ease, overlay 500ms ease allow-discrete, display 500ms ease allow-discrete;
}
dialog[open]::backdrop { background: rgba(23, 26, 18, 0.3); }
@starting-style { dialog[open]::backdrop { background: rgba(23, 26, 18, 0); } }

@media (prefers-reduced-motion: no-preference) {
  html.theme-fade, html.theme-fade * {
    transition: background-color 500ms ease, color 500ms ease, border-color 500ms ease !important;
  }
}
```

6. In the existing `@media (prefers-reduced-motion: reduce)` rule, change the selector to `*, *::before, *::after, ::backdrop`.

Replace R1's interim radius: `grep -rl "rounded-\[8px\]" src | xargs sed -i "s/rounded-\[8px\]/rounded-card/g"`, then `grep -rn "rounded-\[8px\]" src` prints nothing.

- [ ] **Step 4: Head script, toggle, icons, header**

`src/lib/head-script.ts`:

```ts
export const THEME_KEY = "saka.theme";

/** Runs before first paint. Light is the default. Dark only when the visitor chose it on this device. */
export const HEAD_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
```

In `src/app/layout.tsx`: import `HEAD_SCRIPT`, add `suppressHydrationWarning` to `<html>` (the script changes an attribute before React hydrates), and add as the first child of `<html>`:

```tsx
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
```

The string is a fixed constant with no user input.

`src/components/Icons.tsx`, add:

```ts
export const SunIcon = make("M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4");
export const MoonIcon = make("M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z");
```

`src/components/ThemeToggle.tsx`:

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/head-script";
import { MoonIcon, SunIcon } from "./Icons";

const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const isDark = () => document.documentElement.dataset.theme === "dark";

function setDark(dark: boolean) {
  const root = document.documentElement;
  root.classList.add("theme-fade");
  if (dark) root.dataset.theme = "dark";
  else delete root.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Storage can be blocked. The choice then lasts until the next page load.
  }
  window.setTimeout(() => root.classList.remove("theme-fade"), 500);
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button type="button" aria-label="Dark mode" aria-pressed={dark} onClick={() => setDark(!dark)} className="flex size-11 items-center justify-center">
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
```

`src/components/Header.tsx`: import `ThemeToggle` and render it first inside the right-hand `<div className="flex items-center">`, before `<CartMenu />`. It is visible at every breakpoint.

- [ ] **Step 5: Motion constants, smoother dialogs and fade-ups**

`src/lib/gsap.ts`, append:

```ts
/** Shared timings so every transition feels the same. No back, elastic or bounce eases anywhere. */
export const MOTION = {
  enter: { duration: 0.7, ease: "power3.out" },
  exit: { duration: 0.5, ease: "power2.inOut" },
  glide: { duration: 0.8, ease: "power3.inOut" },
} as const;
```

Replace `src/components/Modal.tsx` with:

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  from?: "right" | "fade" | "full" | "product";
  className?: string;
  /** Adds tweens to the opening timeline. Runs only when motion is allowed, right after showModal. */
  onShow?: (tl: gsap.core.Timeline) => void;
  /** Adds tweens to the closing timeline. The dialog closes when the whole timeline ends. */
  onHide?: (tl: gsap.core.Timeline) => void;
  children: ReactNode;
};

const BOX = {
  right: "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(26rem,100vw)] max-w-none rounded-l-card shadow-soft",
  full: "fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none",
  fade: "m-auto w-[min(28rem,calc(100vw-2rem))] rounded-card shadow-soft",
  product:
    "fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none rounded-t-card shadow-soft lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[88dvh] lg:w-[min(960px,calc(100vw-4rem))] lg:rounded-card",
};
const OFFSET = { right: { x: 48 }, full: { y: -12 }, fade: { y: 12 }, product: { y: 24 } };

export function Modal({ open, onClose, label, from = "fade", className = "", onShow, onHide, children }: Props) {
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
          const tl = gsap.timeline();
          tl.fromTo(dialog, { opacity: 0, ...OFFSET[from] }, { opacity: 1, x: 0, y: 0, ...MOTION.enter }, 0);
          onShow?.(tl);
        } else if (dialog.open) {
          const tl = gsap.timeline({ onComplete: () => dialog.close() });
          tl.to(dialog, { opacity: 0, ...OFFSET[from], ...MOTION.exit }, 0);
          onHide?.(tl);
        }
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
      });
    },
    { dependencies: [open, from], revertOnUpdate: true },
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
      className={`${BOX[from]} bg-bg p-0 text-text ${className}`}
    >
      <div className="h-full overflow-y-auto overscroll-contain">{children}</div>
    </dialog>
  );
}
```

`src/components/FadeUp.tsx`: import `MOTION` and change the reveal tween to `gsap.to(el, { opacity: 1, y: 0, ...MOTION.enter });`.

`tests/e2e/a11y.spec.ts`: replace the `colorScheme: "dark"` test with one that sets the theme the way visitors do:

```ts
test("dark theme keeps the same structure and passes axe", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("saka.theme", "dark"));
  await page.goto("/products");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
```

The existing cart test waits 500ms for a 300ms tween. Raise that wait to 900ms (the drawer now takes 700ms).

- [ ] **Step 6: Run and commit**

Run: `npm run typecheck && npm run check && npm run test:e2e -- theme a11y catalog`
Expected: PASS on desktop and mobile. Open the dev server, toggle the theme a few times, and confirm colors fade over half a second and the cart drawer glides in and out smoothly.

```bash
git add src tests docs/design-notes.md
git commit -m "feat: light by default with a header theme switch, 8px card radius, smoother dialogs"
```

---

### Task 2: Frame pipeline and placeholder bottles

**Files:**
- Create: `scripts/frames.ts`, `public/hero/still.webp`, `public/hero/spin.webp`, `public/products/<slug>/still.webp` and `spin.webp` for all 20 slugs
- Modify: `scripts/lib/bottle.mjs`, `src/components/Hero.tsx`, `package.json`
- Delete: `public/turntable/`, `scripts/placeholder-frames.mjs`
- Test: `tests/unit/frames.test.ts`

**Interfaces:**
- Produces:
  - `scripts/frames.ts`: `FRAMES = 36`, `writeBottle(frames: Buffer[], outDir: string): Promise<void>` (writes `still.webp` 960 by 1200 from frame 0 and `spin.webp` 2880 by 3600, a 6 by 6 grid of 480 by 600 frames in turn order, both with transparent backgrounds), `placeholderFrames(): Promise<Buffer[]>`.
  - CLI: `node scripts/frames.ts placeholders` (hero and every slug in `supabase/seed/catalog.json`), `node scripts/frames.ts video <file> <outDir> [--key 0x00FF00] [--similarity 0.18]`. `npm run frames` runs the same script.
  - `bottleSvg({ ..., backdrop?: boolean, ticks?: number })`: `backdrop: false` leaves the background transparent and drops the drawn floor shadow.

- [ ] **Step 1: Write the failing test**

`tests/unit/frames.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { FRAMES, placeholderFrames, writeBottle } from "../../scripts/frames.ts";

describe("writeBottle", () => {
  it("writes a transparent 960 by 1200 still and a 6 by 6 sprite of 480 by 600 frames", async () => {
    const dir = await mkdtemp(join(tmpdir(), "saka-frames-"));
    try {
      const frames = await placeholderFrames();
      expect(frames).toHaveLength(FRAMES);
      await writeBottle(frames, dir);
      const still = await sharp(join(dir, "still.webp")).metadata();
      expect([still.width, still.height, still.hasAlpha]).toEqual([960, 1200, true]);
      const sprite = await sharp(join(dir, "spin.webp")).metadata();
      expect([sprite.width, sprite.height]).toEqual([2880, 3600]);
      const corner = await sharp(join(dir, "still.webp")).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
      expect(corner[3]).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it("refuses the wrong number of frames", async () => {
    await expect(writeBottle([], "unused")).rejects.toThrow("36 frames");
  });
});
```

Run: `npx vitest run tests/unit/frames.test.ts`
Expected: FAIL (cannot find `scripts/frames.ts`).

- [ ] **Step 2: Make the placeholder drawing transparent**

In `scripts/lib/bottle.mjs`:
- The signature becomes `bottleSvg({ width = 720, height = 960, angle = 0, fill = BORDER, tick, ticks = 24, backdrop = true } = {})`.
- The tick marks use `Array.from({ length: ticks }, ...)` with `x="${cx - ticks * 5 + i * 10}"`.
- Wrap the cream `<rect width=... fill="${CREAM}"/>` and the `<ellipse .../>` floor shadow in `${backdrop ? `...` : ""}` so neither is drawn when `backdrop` is false.

- [ ] **Step 3: Write `scripts/frames.ts`**

```ts
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { bottleSvg } from "./lib/bottle.mjs";

export const FRAMES = 36;
const COLS = 6;
const STILL = { width: 960, height: 1200 };
const FRAME = { width: 480, height: 600 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** Frame 0 must face front. A full turn runs frame 0 to 35, and the next frame would be frame 0 again. */
export async function writeBottle(frames: Buffer[], outDir: string) {
  if (frames.length !== FRAMES) throw new Error(`Need ${FRAMES} frames, got ${frames.length}`);
  await mkdir(outDir, { recursive: true });
  await sharp(frames[0]).resize({ ...STILL, fit: "contain", background: CLEAR }).webp({ quality: 82, alphaQuality: 90 }).toFile(join(outDir, "still.webp"));
  const tiles = await Promise.all(frames.map((frame) => sharp(frame).resize({ ...FRAME, fit: "contain", background: CLEAR }).png().toBuffer()));
  await sharp({ create: { width: FRAME.width * COLS, height: FRAME.height * COLS, channels: 4, background: CLEAR } })
    .composite(tiles.map((input, i) => ({ input, left: (i % COLS) * FRAME.width, top: Math.floor(i / COLS) * FRAME.height })))
    .webp({ quality: 72, alphaQuality: 80 })
    .toFile(join(outDir, "spin.webp"));
}

export const placeholderFrames = () =>
  Promise.all(
    Array.from({ length: FRAMES }, (_, i) =>
      sharp(Buffer.from(bottleSvg({ width: 768, height: 960, angle: (360 / FRAMES) * i, tick: i, ticks: FRAMES, backdrop: false }))).png().toBuffer(),
    ),
  );

/** One slow full turn, filmed on a plain backdrop that the color key removes. Center-cropped to 4:5. */
async function videoFrames(file: string, key: string, similarity: string) {
  const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
  const dir = await mkdtemp(join(tmpdir(), "saka-video-"));
  try {
    const filters = [`fps=${FRAMES}/${duration}`, "crop=w='min(iw,ih*4/5)':h='min(ih,iw*5/4)'", `colorkey=${key}:${similarity}:0.08`, "format=rgba"];
    execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vf", filters.join(","), "-frames:v", String(FRAMES), join(dir, "f%02d.png")]);
    const names = (await readdir(dir)).sort();
    return Promise.all(names.map((name) => readFile(join(dir, name))));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, ...args] = process.argv.slice(2);
  const flag = (name: string, fallback: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
  if (mode === "placeholders") {
    const frames = await placeholderFrames();
    const { products } = JSON.parse(await readFile("supabase/seed/catalog.json", "utf8")) as { products: { slug: string }[] };
    for (const dir of ["public/hero", ...products.map((p) => `public/products/${p.slug}`)]) await writeBottle(frames, dir);
    console.log(`wrote placeholders for the hero and ${products.length} perfumes`);
  } else if (mode === "video" && args[0] && args[1]) {
    await writeBottle(await videoFrames(args[0], flag("key", "0x00FF00"), flag("similarity", "0.18")), args[1]);
    console.log(`wrote ${args[1]}`);
  } else {
    console.error("Usage: node scripts/frames.ts placeholders | video <file> <outDir> [--key 0x00FF00] [--similarity 0.18]");
    process.exit(1);
  }
}
```

Run: `npx vitest run tests/unit/frames.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Generate the placeholders and retire the old frames**

In `package.json` `scripts` add `"frames": "node scripts/frames.ts"`.

```bash
npm run frames -- placeholders
git rm -r public/turntable scripts/placeholder-frames.mjs
```

Expected: `wrote placeholders for the hero and 20 perfumes`. Check one sprite: `node -e "require('sharp')('public/products/aventus/spin.webp').metadata().then(m => console.log(m.width, m.height, m.size))"` prints `2880 3600` and a size under 400KB. If larger, lower the sprite `quality` to 60.

In `src/components/Hero.tsx` change the image to `src="/hero/still.webp"`, `width={960}`, `height={1200}`. (R1's interim `ProductCard` points at `/turntable/frame-00.webp`: Task 4 replaces that card. Until then, change its `src` to `` `/products/${id}/still.webp` `` so nothing 404s.)

Run: `grep -rn "turntable" src scripts tests`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add scripts public src package.json tests/unit/frames.test.ts
git commit -m "feat: 36 frame sprite pipeline with video extraction and placeholder bottles"
```

---

### Task 3: SpinBottle

**Files:**
- Create: `src/components/SpinBottle.tsx`
- Test: `tests/unit/spin-bottle.test.ts`

**Interfaces:**
- Consumes: `gsap`, `useGSAP`, sprites from Task 2.
- Produces:
  - `FRAMES = 36`, `framePosition(i: number): string` (CSS background-position of frame `i`, wrapping, rounding).
  - `type SpinHandle = { spin(duration?: number): Promise<void>; preload(): Promise<void> }`.
  - `SpinBottle({ dir, alt, sizes, priority?, float?, className?, ref? })`: `dir` is `/products/<slug>` or `/hero`. Renders a `relative` root (the caller sizes it, normally a 4:5 box), a centered 4:5 bottle body holding the still (`next/image`, `object-contain`) and the sprite layer, and the contact shadow. `spin()` resolves at once under reduced motion, while a turn is already running, or when the sprite fails.

- [ ] **Step 1: Write the failing test**

`tests/unit/spin-bottle.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/lib/gsap", () => ({ gsap: {}, useGSAP: () => ({ contextSafe: (fn: unknown) => fn }), MOTION: {} }));

import { FRAMES, framePosition } from "@/components/SpinBottle";

describe("framePosition", () => {
  it("walks the 6 by 6 grid row by row", () => {
    expect(framePosition(0)).toBe("0% 0%");
    expect(framePosition(1)).toBe("20% 0%");
    expect(framePosition(5)).toBe("100% 0%");
    expect(framePosition(6)).toBe("0% 20%");
    expect(framePosition(35)).toBe("100% 100%");
  });
  it("wraps a full turn back to the front and rounds tween values", () => {
    expect(framePosition(FRAMES)).toBe("0% 0%");
    expect(framePosition(6.4)).toBe("0% 20%");
    expect(framePosition(-1)).toBe("100% 100%");
  });
});
```

Run: `npx vitest run tests/unit/spin-bottle.test.ts`
Expected: FAIL (cannot find `@/components/SpinBottle`).

- [ ] **Step 2: Write `src/components/SpinBottle.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useImperativeHandle, useRef, type Ref } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export const FRAMES = 36;
const COLS = 6;

export function framePosition(i: number) {
  const f = ((Math.round(i) % FRAMES) + FRAMES) % FRAMES;
  return `${((f % COLS) / (COLS - 1)) * 100}% ${(Math.floor(f / COLS) / (COLS - 1)) * 100}%`;
}

const sprites = new Map<string, Promise<void>>();

function loadSprite(src: string) {
  const cached = sprites.get(src);
  if (cached) return cached;
  const pending = new Promise<void>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => img.decode().then(resolve, resolve);
    img.onerror = () => {
      sprites.delete(src);
      reject(new Error(`Sprite failed: ${src}`));
    };
    img.src = src;
  });
  sprites.set(src, pending);
  return pending;
}

export type SpinHandle = { spin: (duration?: number) => Promise<void>; preload: () => Promise<void> };

type Props = {
  dir: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  float?: boolean;
  className?: string;
  ref?: Ref<SpinHandle>;
};

export function SpinBottle({ dir, alt, sizes, priority = false, float = false, className = "", ref }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const still = useRef<HTMLImageElement>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const turning = useRef(false);
  const src = `${dir}/spin.webp`;

  const { contextSafe } = useGSAP(
    () => {
      if (!float) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const period = gsap.utils.random(3.2, 4);
        const tl = gsap
          .timeline({ repeat: -1, yoyo: true, defaults: { duration: period / 2, ease: "sine.inOut" } })
          .to(body.current, { y: -4 }, 0)
          .to(shadow.current, { scaleX: 0.86, opacity: 0.7 }, 0);
        tl.totalTime(gsap.utils.random(0, period));
        const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? tl.resume() : tl.pause()));
        io.observe(root.current as Element);
        return () => io.disconnect();
      });
    },
    { scope: root, dependencies: [float] },
  );

  // Created after an async sprite load, so it is wrapped to stay inside this component's GSAP context.
  const turn = contextSafe((duration: number, done: () => void) => {
    const layer = sprite.current;
    if (!layer || !still.current) return done();
    const state = { frame: 0 };
    layer.style.backgroundImage = `url(${src})`;
    gsap
      .timeline({ onComplete: () => { turning.current = false; done(); } })
      .set(layer, { opacity: 1, backgroundPosition: framePosition(0) })
      .set(still.current, { opacity: 0 })
      .to(state, { frame: FRAMES, duration, ease: "power2.inOut", onUpdate: () => { layer.style.backgroundPosition = framePosition(state.frame); } })
      .to(layer, { opacity: 0, duration: 0.35, ease: "power1.out" })
      .to(still.current, { opacity: 1, duration: 0.35, ease: "power1.out" }, "<");
  });

  useImperativeHandle(
    ref,
    () => ({
      preload: () => loadSprite(src),
      spin: (duration = 2) =>
        new Promise<void>((resolve) => {
          if (turning.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return resolve();
          turning.current = true;
          loadSprite(src).then(
            () => turn(duration, resolve),
            () => {
              turning.current = false;
              resolve();
            },
          );
        }),
    }),
    [src, turn],
  );

  return (
    <div ref={root} className={`relative ${className}`}>
      <div ref={body} className="absolute bottom-[9%] left-1/2 aspect-[4/5] h-[89%] -translate-x-1/2">
        <Image ref={still} src={`${dir}/still.webp`} alt={alt} fill sizes={sizes} priority={priority} className="object-contain" />
        <div ref={sprite} aria-hidden="true" className="absolute inset-0 bg-no-repeat opacity-0 [background-size:600%_600%]" />
      </div>
      <div ref={shadow} aria-hidden="true" className="absolute bottom-[6%] left-1/2 h-[4%] w-[44%] -translate-x-1/2 rounded-[50%] bg-[var(--contact)] blur-[6px]" />
    </div>
  );
}
```

Notes for the implementer:
- The bottle body is exactly 4:5, like the frames, so the still (`object-contain` in a 4:5 box) and the sprite (`600% 600%`) line up pixel for pixel at frame 0. The swap is invisible.
- Tailwind v4's `-translate-x-1/2` uses the CSS `translate` property, and GSAP writes `transform`, so they combine without fighting.
- The contact shadow is product imagery, not a UI shadow. Its ellipse radius is not a UI radius.

Run: `npx vitest run tests/unit/spin-bottle.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/SpinBottle.tsx tests/unit/spin-bottle.test.ts
git commit -m "feat: spin bottle with lazy sprite, float and contact shadow"
```

---

### Task 4: Cards, grids, home preview and grouped /products

**Files:**
- Modify: `src/components/ProductCard.tsx` (rewrite), `src/components/ProductGrid.tsx` (rewrite), `src/components/Skeletons.tsx`, `src/components/Icons.tsx`, `src/lib/catalog.ts`, `src/app/(home)/page.tsx`, `src/app/products/page.tsx`, `src/app/products/loading.tsx`, `tests/unit/catalog.test.ts`, `tests/e2e/catalog.spec.ts`
- Create: `src/components/ProductModal.tsx` with only `openScent` for now (Task 5 adds the modal)

**Interfaces:**
- Consumes: `SpinBottle`, `SpinHandle`.
- Produces:
  - `catalog.ts`: `previewPicks(products: Product[], count: number): Product[]` (available perfumes, round robin across Fresh, Woody, Oriental, Aromatic in shelf order).
  - `ProductModal.tsx`: `openScent(slug: string): void` (pushes `?scent=<slug>` onto the current path, keeping other params and the hash).
  - `ProductCard({ product, priority? })`: an `<a href="/products?scent=<slug>">` with `[data-card-bottle="<slug>"]` around a 4:5 `SpinBottle` and the name in `.card-title`. A plain left click calls `openScent`. Mouse hover on a hover-capable device spins once (2s).
  - `ProductGrid({ products, className?, eager? })`: server component, 2 columns, 3 on desktop.

- [ ] **Step 1: Design pass**

Invoke `ui-ux-pro-max:ui-ux-pro-max` with `"product card hover minimal"` (`--domain ux`) and `"grid stagger reveal"` (`--domain gsap`). Brand rules win: no shadows on cards, no scale-up hover, the bottle float is the motion. Record decisions in `docs/design-notes.md`.

- [ ] **Step 2: Write the failing tests**

Append to `tests/unit/catalog.test.ts` (and add `previewPicks` to its import):

```ts
describe("previewPicks", () => {
  const p = (id: string, family: string, available = true) => ({ id, family, available }) as never;
  const shelf = [p("f1", "fresh"), p("f2", "fresh"), p("w1", "woody"), p("w2", "woody", false), p("w3", "woody"), p("o1", "oriental"), p("a1", "aromatic")];
  it("takes one per family in turn, skipping out of stock", () => {
    expect(previewPicks(shelf, 6).map((x: { id: string }) => x.id)).toEqual(["f1", "w1", "o1", "a1", "f2", "w3"]);
  });
  it("stops at the count and copes with a short shelf", () => {
    expect(previewPicks(shelf, 3).map((x: { id: string }) => x.id)).toEqual(["f1", "w1", "o1"]);
    expect(previewPicks([p("o1", "oriental")], 6).map((x: { id: string }) => x.id)).toEqual(["o1"]);
  });
});
```

Replace `tests/e2e/catalog.spec.ts` tests that touch cards (keep the 404 and max-width tests, and the cart drawer test, which Task 5 updates):

```ts
test("home shows the hero and the right number of preview cards, with no sizes or prices", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the scent that feels like you.");
  const expected = info.project.name === "desktop" ? 3 : 6;
  await expect(page.locator("#collection li:visible")).toHaveCount(expected);
  await expect(page.getByRole("link", { name: /view products/i })).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(/\$|\d\s?ml|out of stock/i);
});

test("products are grouped under the four families, cards show only the name", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Fresh", "Woody", "Oriental", "Aromatic"]);
  await expect(page.locator('main a[href*="scent="]')).toHaveCount(20);
  await expect(page.locator('main a[href*="scent="]').first()).toHaveText(FIRST.name);
  expect(await page.locator("main").innerText()).not.toMatch(/\$|\d\s?ml|out of stock/i);
});

test("cards have 8px corners and a 4:5 bottle stage", async ({ page }) => {
  await page.goto("/products");
  const card = page.locator('main a[href*="scent="]').first();
  expect(await card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("8px");
  const box = await card.locator("[data-card-bottle]").boundingBox();
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(0.8, 1);
});

test("hovering a card with a mouse loads its spin sprite", async ({ page, isMobile }) => {
  test.skip(isMobile, "Hover only exists on desktop");
  await page.goto("/products");
  const sprite = page.waitForRequest(`**/products/${FIRST.slug}/spin.webp`);
  await page.locator('main a[href*="scent="]').first().hover();
  await sprite;
});
```

Run: `npx vitest run tests/unit/catalog.test.ts && npm run test:e2e -- catalog`
Expected: FAIL (`previewPicks` missing, old cards still render prices).

- [ ] **Step 3: `previewPicks`**

Append to `src/lib/catalog.ts`:

```ts
/** Round robin across families in shelf order, so the home preview shows the whole range. */
export function previewPicks(products: Product[], count: number) {
  const groups = SCENT_FAMILIES.map((family) => products.filter((p) => p.family === family && p.available));
  const picks: Product[] = [];
  for (let i = 0; picks.length < count && groups.some((g) => i < g.length); i++) {
    for (const group of groups) if (group[i] && picks.length < count) picks.push(group[i]);
  }
  return picks;
}
```

- [ ] **Step 4: `openScent`, the card and the grid**

`src/components/ProductModal.tsx` (Task 5 fills in the rest of this file):

```tsx
"use client";

const PARAM = "scent";
let pushed = false;

function urlWith(slug: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (slug) params.set(PARAM, slug);
  else params.delete(PARAM);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
}

/** Opens the product modal in place. The URL can be shared, and Back closes the modal. */
export function openScent(slug: string) {
  pushed = true;
  window.history.pushState(null, "", urlWith(slug));
}
```

Replace `src/components/ProductCard.tsx`:

```tsx
"use client";

import { useRef } from "react";
import type { Product } from "@/lib/catalog";
import { openScent } from "./ProductModal";
import { SpinBottle, type SpinHandle } from "./SpinBottle";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const bottle = useRef<SpinHandle>(null);
  return (
    <a
      href={`/products?scent=${product.id}`}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openScent(product.id);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) void bottle.current?.spin(2);
      }}
      className="block h-full rounded-card border border-border bg-surface p-4 text-center transition-colors duration-500 ease-out hover:border-secondary lg:p-6"
    >
      <div data-card-bottle={product.id} className="aspect-[4/5]">
        <SpinBottle ref={bottle} dir={`/products/${product.id}`} alt={`${product.name} bottle`} sizes="(min-width: 1024px) 340px, 45vw" priority={priority} float className="h-full" />
      </div>
      <span className="card-title mt-4 block text-balance">{product.name}</span>
    </a>
  );
}
```

Replace `src/components/ProductGrid.tsx`:

```tsx
import type { Product } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

type Props = { products: Product[]; className?: string; eager?: number };

export function ProductGrid({ products, className = "", eager = 3 }: Props) {
  return (
    <ul className={`grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6 ${className}`}>
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard product={product} priority={i < eager} />
        </li>
      ))}
    </ul>
  );
}
```

`src/components/Icons.tsx`: delete `CheckIcon` (no longer used). `grep -rn "CheckIcon" src` prints nothing.

- [ ] **Step 5: Pages and skeletons**

`src/app/(home)/page.tsx`: import `previewPicks` and render `<ProductGrid products={previewPicks(products, 6)} eager={0} className="mt-10 lg:[&>li:nth-child(n+4)]:hidden" />`. The `prices` prop goes away. `getCatalog` still runs here because Task 5 needs the products and prices for the modal.

`src/app/products/page.tsx`:

```tsx
import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import { getCatalog } from "@/lib/catalog";
import { LABELS, SCENT_FAMILIES } from "@/lib/taxonomy";

export const revalidate = 300;
export const metadata = { title: "Products | SAKA Parfum" };

export default async function ProductsPage() {
  const { products } = await getCatalog();
  return (
    <section aria-labelledby="products-title" className="section">
      <div className="wrap">
        <p className="eyebrow text-center">Products</p>
        <h1 id="products-title" className="h2 mt-3 text-center">Everything on our shelves</h1>
        {products.length === 0 ? (
          <p className="mx-auto mt-10 max-w-[62ch] text-center text-muted">
            Our shelves are being restocked. <Link href="/#visit" className="link text-text">Visit us</Link> or message us for what is new.
          </p>
        ) : (
          SCENT_FAMILIES.map((family, index) => {
            const list = products.filter((p) => p.family === family);
            return list.length === 0 ? null : (
              <section key={family} aria-labelledby={`family-${family}`} className="mt-14 lg:mt-20">
                <h2 id={`family-${family}`} className="h2">{LABELS[family]}</h2>
                <ProductGrid products={list} eager={index === 0 ? 3 : 0} className="mt-8" />
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
```

`src/components/Skeletons.tsx`, replace `ProductCardSkeleton`:

```tsx
export function ProductCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-4 lg:p-6" aria-hidden="true">
      <div className="skeleton aspect-[4/5] rounded-sm bg-bg" />
      <div className="skeleton mx-auto mt-4 h-4 w-3/4" />
      <div className="skeleton mx-auto mt-2 h-4 w-1/2" />
    </div>
  );
}
```

In `ProductGridSkeleton` drop `items-start` from the class list.

`src/app/products/loading.tsx`:

```tsx
import { ProductGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="mx-auto skeleton h-4 w-24" aria-hidden="true" />
        <div className="mx-auto mt-3 skeleton h-10 w-72 max-w-full" aria-hidden="true" />
        <div className="skeleton mt-14 h-8 w-32 lg:mt-20" aria-hidden="true" />
        <ProductGridSkeleton count={3} className="mt-8" />
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Run, look, commit**

Run: `npm run typecheck && npm test && npm run check && npm run test:e2e -- catalog`
Expected: PASS. In the browser: bottles float gently and out of step, hovering a card turns its bottle once and settles front-facing with no jump, the border warms slowly, and nothing on home or /products mentions sizes, prices or stock. The modal does not exist yet, so a click only changes the URL.

```bash
git add src tests docs/design-notes.md
git commit -m "feat: floating bottle cards, round robin home preview and family grouped products"
```

---

### Task 5: The product modal

**Files:**
- Modify: `src/components/ProductModal.tsx`, `src/app/(home)/page.tsx`, `src/app/products/page.tsx`, `tests/e2e/helpers.ts`, `tests/e2e/catalog.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/admin.spec.ts`
- Test: `tests/e2e/modal.spec.ts`

**Interfaces:**
- Consumes: `Modal` with `from="product"`, `onShow`, `onHide`; `SpinBottle`; `useCart`; `formatUsd`; `MOTION`.
- Produces: `ProductModal({ products, prices })`, rendered once per page inside `<Suspense fallback={null}>`. Open when `?scent=` matches a slug. Its dialog is labelled with the perfume name. Inside: a close button labelled "Close", h2 name, the "Out of stock" pill when unavailable, size radios labelled "10ml", "20ml" and "50ml" with their prices, quantity buttons "Fewer" and "More", and the Add to cart button reading "Add to cart, $X.XX".
- `helpers.ts`: `addFirstProduct(page)` adds the first perfume, 10ml, through the modal.

- [ ] **Step 1: Design pass**

Invoke `ui-ux-pro-max:ui-ux-pro-max` with `"product quick view modal mobile sheet"` (`--domain ux`), `"focus management dialog"` (`--domain ux`) and `"shared element transition"` (`--domain gsap`). Keep the brand rules: one soft shadow on the modal, cream surfaces, the pill as the only stock signal. Record decisions.

- [ ] **Step 2: Write the failing modal spec**

`tests/e2e/modal.spec.ts`:

```ts
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
```

Run: `npm run test:e2e -- modal`
Expected: FAIL (no dialog).

- [ ] **Step 3: Write the modal**

Replace `src/components/ProductModal.tsx` with:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product, SizePrices } from "@/lib/catalog";
import { gsap, MOTION } from "@/lib/gsap";
import { formatUsd } from "@/lib/pricing";
import { MAX_LINE_QTY } from "@/lib/schemas";
import { LABELS, SIZES_ML, type SizeMl } from "@/lib/taxonomy";
import { CloseIcon, MinusIcon, PlusIcon } from "./Icons";
import { Modal } from "./Modal";
import { SpinBottle, type SpinHandle } from "./SpinBottle";

const PARAM = "scent";
const TURN_S = 2.2;
const TURN_EVERY_MS = 6000;
let pushed = false;

function urlWith(slug: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (slug) params.set(PARAM, slug);
  else params.delete(PARAM);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
}

/** Opens the product modal in place. The URL can be shared, and Back closes the modal. */
export function openScent(slug: string) {
  pushed = true;
  window.history.pushState(null, "", urlWith(slug));
}

function closeScent() {
  if (pushed) {
    pushed = false;
    window.history.back();
  } else {
    window.history.replaceState(null, "", urlWith(null));
  }
}

/** Offset and scale that place `el` exactly over `target`, for the card to stage glide. Both boxes are 4:5. */
function flip(target: Element, el: Element) {
  const from = el.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  return { x: from.left - to.left, y: from.top - to.top, scale: from.width / to.width, transformOrigin: "0 0" };
}

export function ProductModal({ products, prices }: { products: Product[]; prices: SizePrices }) {
  const slug = useSearchParams().get(PARAM);
  const product = products.find((p) => p.id === slug) ?? null;
  const [shown, setShown] = useState<Product | null>(product);
  if (product && product !== shown) setShown(product);
  const open = product !== null;
  const stage = useRef<HTMLDivElement>(null);
  const bottle = useRef<SpinHandle>(null);

  // The bottle turns once after it lands, then every few seconds while the modal is open.
  useEffect(() => {
    if (!open) {
      pushed = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const first = window.setTimeout(() => void bottle.current?.spin(TURN_S), MOTION.glide.duration * 1000);
    const again = window.setInterval(() => void bottle.current?.spin(TURN_S), TURN_EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(again);
    };
  }, [open, shown]);

  const card = () => (shown ? document.querySelector(`[data-card-bottle="${shown.id}"]`) : null);

  const onShow = (tl: gsap.core.Timeline) => {
    const target = stage.current;
    if (!target) return;
    tl.fromTo(target.closest("dialog")?.querySelectorAll("[data-reveal]") ?? [], { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.06, ...MOTION.enter }, 0.15);
    const from = card();
    if (!from) return;
    tl.set(from, { opacity: 0 }, 0).fromTo(target, flip(target, from), { x: 0, y: 0, scale: 1, ...MOTION.glide }, 0);
  };

  const onHide = (tl: gsap.core.Timeline) => {
    const target = stage.current;
    const to = card();
    if (!target || !to) return;
    tl.set(to, { opacity: 0 }, 0)
      .to(target, { ...flip(target, to), ...MOTION.exit }, 0)
      .to(to, { opacity: 1, duration: 0.3, ease: "power1.out" }, MOTION.exit.duration - 0.2);
  };

  return (
    <Modal open={open} onClose={closeScent} label={shown?.name ?? "Perfume"} from="product" onShow={onShow} onHide={onHide}>
      {shown && (
        <div className="relative grid lg:grid-cols-2">
          <button type="button" aria-label="Close" onClick={closeScent} className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center">
            <CloseIcon />
          </button>
          <div className="bg-surface px-6 pb-4 pt-10 lg:p-10">
            <div ref={stage} className="mx-auto aspect-[4/5] h-[38svh] lg:h-auto lg:w-full">
              <SpinBottle key={shown.id} ref={bottle} dir={`/products/${shown.id}`} alt={`${shown.name} bottle`} sizes="(min-width: 1024px) 440px, 60vw" float className="h-full" />
            </div>
          </div>
          <Details key={shown.id} product={shown} prices={prices} />
        </div>
      )}
    </Modal>
  );
}

function Details({ product, prices }: { product: Product; prices: SizePrices }) {
  const pillId = useId();
  const [sizeMl, setSizeMl] = useState<SizeMl>(10);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<"added" | "full" | null>(null);
  const { add } = useCart();

  useEffect(() => {
    if (status !== "added") return;
    const timer = setTimeout(() => setStatus(null), 1600);
    return () => clearTimeout(timer);
  }, [status]);

  const rows = [
    ["Top", product.notesTop.join(", ")],
    ["Heart", product.notesHeart.join(", ")],
    ["Base", product.notesBase.join(", ")],
    ["Mood", product.mood],
    ["Occasion", product.occasion],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div data-reveal>
        <p className="eyebrow">{LABELS[product.family]}</p>
        <h2 className="h2 mt-3 text-balance">{product.name}</h2>
        {!product.available && (
          <p id={pillId} className="mt-4 inline-flex rounded-full bg-badge px-3 py-1 font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink">
            Out of stock
          </p>
        )}
      </div>
      <p data-reveal>{product.description}</p>
      <dl data-reveal className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-2">
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt className="eyebrow pt-0.5">{label}</dt>
            <dd className="small">{value}</dd>
          </Fragment>
        ))}
      </dl>
      <fieldset data-reveal>
        <legend className="eyebrow mb-3">Size</legend>
        <div className="grid grid-cols-3 gap-2">
          {SIZES_ML.map((size) => (
            <label key={size} className="block">
              <input type="radio" name="size" value={size} checked={sizeMl === size} onChange={() => setSizeMl(size)} aria-label={`${size}ml, ${formatUsd(prices[size])}`} className="peer sr-only" />
              <span aria-hidden="true" className="flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-sm border border-border transition-colors duration-300 peer-checked:border-btn peer-checked:bg-btn peer-checked:text-btn-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary">
                <span className="font-display text-xs font-medium tracking-[0.1em]">{size}ml</span>
                <span className="small">{formatUsd(prices[size], true)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div data-reveal className="flex items-center justify-between">
        <span className="eyebrow">Quantity</span>
        <div className="flex items-center">
          <button type="button" aria-label="Fewer" onClick={() => setQty(Math.max(1, qty - 1))} className="flex size-11 items-center justify-center text-secondary"><MinusIcon /></button>
          <span aria-live="polite" className="w-6 text-center">{qty}</span>
          <button type="button" aria-label="More" onClick={() => setQty(Math.min(MAX_LINE_QTY, qty + 1))} className="flex size-11 items-center justify-center text-secondary"><PlusIcon /></button>
        </div>
      </div>
      <div data-reveal>
        <button
          type="button"
          disabled={!product.available}
          aria-describedby={product.available ? undefined : pillId}
          onClick={() => setStatus(add({ productId: product.id, sizeMl, qty }) ? "added" : "full")}
          className="btn btn-primary w-full"
        >
          {status === "added" ? "Added to cart" : `Add to cart, ${formatUsd(prices[sizeMl] * qty)}`}
        </button>
        <p role="status" className={status === "full" ? "small mt-2 text-error" : "sr-only"}>
          {status === "added" && "Added to cart."}
          {status === "full" && "Your cart is full. Remove an item to add more."}
        </p>
      </div>
    </div>
  );
}
```

Notes for the implementer:
- Effects run child first, so the glide cannot be set up from this component's own effect: the dialog is not open yet. That is why the choreography is handed to `Modal` as `onShow` and `onHide`. They run right after `showModal()`, inside Modal's GSAP context, under its reduced-motion guard.
- `Modal` reverts the opening timeline when `open` changes (`revertOnUpdate`). That puts the card bottle back to visible for one tick, which is why `onHide` sets it to 0 again at position 0 before fading it in at the end.
- `fromTo` with an explicit end state is used for the stage so a reopen never animates toward a leftover transform from the last close.
- The size radio's visible box is `aria-hidden` and the radio carries "20ml, $22.00" as its name, so a screen reader hears the price once.
- The e2e spec clicks the visible "20ml" text, which is inside the label, so it selects the radio.
- The dialog's own close behavior returns focus to the element that was focused before `showModal()`, which is the card link.

- [ ] **Step 4: Mount it on the pages**

`src/app/(home)/page.tsx` and `src/app/products/page.tsx`: read `prices` from `getCatalog()` again and render, as the last child of the page's top-level element:

```tsx
<Suspense fallback={null}>
  <ProductModal products={products} prices={prices} />
</Suspense>
```

(`import { Suspense } from "react";` and `import { ProductModal } from "@/components/ProductModal";`.) The fallback is `null` because the closed modal renders nothing visible. `useSearchParams` needs the boundary, or the static build fails. Home passes all products, not only the preview, so finder results (plan 03) can open any perfume.

- [ ] **Step 5: Point the older specs at the modal**

`tests/e2e/helpers.ts`, replace `addFirstProduct`:

```ts
export async function addFirstProduct(page: Page) {
  await page.goto(`/products?scent=${FIRST.slug}`);
  const dialog = page.getByRole("dialog", { name: FIRST.name });
  await dialog.getByRole("button", { name: /^Add to cart/ }).click();
  await expect(dialog.getByRole("status")).toHaveText("Added to cart.");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}
```

`tests/e2e/catalog.spec.ts`:
- `"adding to the cart updates the count and survives a reload"`: replace its first three lines with `await addFirstProduct(page);` (import it), keep the rest.
- `"cart drawer changes quantity..."`: same replacement for its add step.
- Delete `"a card opens and closes, one at a time"` and `"out of stock products cannot be added"` (covered by `modal.spec.ts`).

`tests/e2e/a11y.spec.ts`: replace the "card expanded" test with:

```ts
test("axe finds no serious issues with the product modal open, in both themes", async ({ page }) => {
  for (const dark of [false, true]) {
    if (dark) await page.addInitScript(() => localStorage.setItem("saka.theme", "dark"));
    await page.goto(`/products?scent=${SOLD_OUT.slug}`);
    await expect(page.getByRole("dialog", { name: SOLD_OUT.name })).toBeVisible();
    await page.waitForTimeout(900); // let the 700ms open and 800ms glide settle before measuring contrast
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  }
});
```

(Import `SOLD_OUT` from `"./helpers"`. The sold-out perfume covers the pill's contrast too.)

`tests/e2e/admin.spec.ts`: in the availability test, replace the two storefront lines with:

```ts
  await page.goto("/products?scent=cool-water");
  const dialog = page.getByRole("dialog", { name: "Davidoff Cool Water Test" });
  await expect(dialog.getByText("Out of stock", { exact: true })).toBeVisible();
```

and in the price test replace the storefront check with:

```ts
  await page.goto(`/products?scent=${FIRST.slug}`);
  await expect(page.getByRole("dialog").getByRole("radio", { name: "10ml, $13.50" })).toBeAttached();
```

(import `FIRST`).

- [ ] **Step 6: Run, watch it, commit**

Run: `npm run typecheck && npm test && npm run check && npm run test:e2e`
Expected: PASS on desktop and mobile (checkout specs skip without `.env.test`).

Watch it for real at desktop and phone width, in both themes:
- The card bottle lifts and glides into the stage while the dialog rises and the details fade in one after another.
- Nothing snaps. After landing the bottle turns once, then again every few seconds, and keeps floating.
- Closing sends the bottle back toward its card while the dialog fades, and the card bottle fades back in.
- On a phone the modal is a bottom sheet and the details scroll under the stage.
- With reduced motion turned on in the OS, the modal simply appears and disappears and nothing floats or spins.

Record a short screen capture of open and close and step through it. If the glide starts from the wrong place, compare `flip()`'s rects with the card's `[data-card-bottle]` box.

```bash
git add src tests docs/design-notes.md
git commit -m "feat: product modal with shareable url, bottle glide, sizes, stock pill and add to cart"
```

---

### Task 6: Verification and review

- [ ] **Step 1: Full gates**

Run: `npm run typecheck && npm test && npm run check && npm run build && npm run test:e2e`
Expected: PASS. Read the build output for the First Load JS of `/` and `/products` and note both in `docs/design-notes.md` under "R2 numbers". The target is under 170KB gzipped.

- [ ] **Step 2: Manual pass**

Check, and record pass or fail in `docs/design-notes.md`:
- keyboard only across home, /products, the modal and the cart
- theme switch on a phone
- no sizes, prices or stock outside the modal, cart and checkout
- no Riel anywhere
- out of stock shows only the pill
- every card has 8px corners and buttons have 4px

- [ ] **Step 3: Review and push**

Invoke `superpowers:requesting-code-review` for the R2 commits, fix critical and important findings in `fix: address r2 code review`, update the SAKA memory notes (R2 done, what the user still owes), and `git push`.

Plan 03 (finder, SEO, quality) runs next, then R3.
