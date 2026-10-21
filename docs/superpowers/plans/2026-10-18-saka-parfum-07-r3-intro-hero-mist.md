# SAKA Parfum R3: Floor Scene Hero, Intro and Mist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the brand moment. The logo shows, the bottle spins at center, then it glides down onto a floor scene as that scene dissolves in. A low, pointer-reactive mist settles over the floor. Light and dark scenes follow the theme switch, every fallback works, and Lighthouse and the bundle budget stay intact.

**Architecture:** The hero is a theme-aware floor scene: two graded AI backdrops in `next/image`, the light one with `priority`, the dark one fading in under `html[data-theme="dark"]`. The bottle is R2's `SpinBottle` (`dir="/hero"`) inside a `[data-hero-bottle]` box standing on the floor. The intro overlay holds a second `SpinBottle` of the same size, centered. It spins, then glides by transform to the hero box's measured rect while the overlay background fades, so the hand-off is pixel exact. The mist is plan 04's OGL shader, reused, with theme-aware colors and a CSS mask that keeps it low.

**Tech Stack:** GSAP and `@gsap/react`, OGL, sharp (backdrop grading), the Canva MCP `generate-image` tool (backdrop generation), Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-saka-redesign-design.md` (section 7). Original spec sections 8.4, 8.5, 10 and 12 for anything not changed there. R1, R2 and plan 03 must be complete. Plan 04 (`2026-10-18-saka-parfum-04-intro-hero-mist.md`) is superseded, except Task 2 (mist shader, math, harness, cap test) and the `Mist.tsx` code in its Task 3 Step 2, which this plan reuses by reference.

## Global Constraints

- `CLAUDE.md` wins any conflict. Read "Locked decisions", "Mist rules" and the GSAP section first.
- Found in R2: GSAP 3.13 folds the CSS `translate` property (Tailwind's `-translate-x-1/2`) into its own transform and can freeze a wrong pixel value, for example while an element is hidden. Never center or offset an element GSAP will move or measure with a Tailwind translate utility. Use layout instead: a flex wrapper, or `inset-x-0 mx-auto w-fit`. The snippets below that still use `-translate-x-1/2` (the hero bottle, its skeleton and the Skip button) must be rewritten that way.
- Since the R2 review, `SpinBottle` serves its still unoptimized and has no `sizes` prop, so the card, modal, hero and intro share one cached file. Drop `sizes` from the snippets below.
- Web design decisions go through `ui-ux-pro-max:ui-ux-pro-max` first. Load `gsap-skills:gsap-core`, `gsap-skills:gsap-timeline`, `gsap-skills:gsap-react` and `gsap-skills:gsap-performance` before animation code. Record decisions in `docs/design-notes.md`.
- Never use em dashes anywhere. No exclamation marks in copy. Avoid the non-null assertion operator followed by a space.
- Palette only. Mist light #F2EBDF, #DCD0BF, #AD9883, dark #23261C, #3A3A2C, #8C7964. No sparkles, no glow, no new hues. Backdrops are graded so every pixel maps onto palette tones.
- Hero copy: h1 "Find the scent that feels like you." and one primary button "View products" with the arrow icon. No subheadline, no sizes, no feature card, no dots.
- Intro timing (spec 7.2):
  - 0 to 1.0s: logo in (0.35s) and out.
  - 1.0 to 3.0s: the bottle fades in (0.5s) and makes one turn (2s).
  - 3.0 to 4.2s: the bottle glides (`power3.inOut`, 1.2s), the overlay background fades (1.0s), and the contact shadow grows over the last 0.6s.
  - From 3.8s: headline, then button, then header fade up 12px (0.15s stagger).
  - At 4.2s the overlay is removed and `saka:intro-end` fires.
  - Skip, Escape or Enter. A 7s failsafe in the head script.
  - Runs only on a plain hard load of `/` without reduced motion.
- Mist rules: alpha caps 0.55 at hero edges, 0.3 over the bottle, 0.15 behind headline text, 0 inside the button keep-out box (16px padding, feathered 24px). Pointer or finger only, nothing on scroll, `touch-action: pan-y`, canvas at 50 percent resolution, DPR cap 1.5, 30fps on mobile, paused off screen and in hidden tabs, static image fallback with no message. Masked to the lower part of the hero.
- Motion through `MOTION` from `src/lib/gsap.ts`, inside `gsap.matchMedia()` with a reduced-motion branch. No back, elastic or bounce eases.
- Targets (mobile): Lighthouse Performance and Best Practices 90 or higher, Accessibility and SEO 95 or higher, LCP under 2.5s, CLS under 0.1, INP under 200ms, initial JS under 170KB gzipped excluding the mist chunk. axe zero serious or critical.
- Report real numbers before claiming anything passes. Commits small and conventional with the session's attribution trailer, pushed to `origin main`.

## File Structure

```
scripts/grade-floor.ts            palette duotone grading for the backdrops
public/hero/floor-light.webp, floor-dark.webp
public/mist-static.webp, mist-static-dark.webp
src/lib/mist-math.ts, mist-shader.ts, scripts/lib/mist-harness.ts   (plan 04 Task 2, plus MIST_COLORS_DARK and a colors option)
src/components/Mist.tsx           (plan 04 Task 3 Step 2, plus theme colors)
src/components/MistLayer.tsx      masked layer, theme-aware static fallback
src/components/Hero.tsx           (rewrite) floor scene
src/components/Intro.tsx          overlay timeline
src/components/SpinBottle.tsx     (modify) data-shadow on the contact shadow
src/lib/head-script.ts            (modify) intro flag and failsafe
src/app/globals.css, layout.tsx, (home)/page.tsx, (home)/loading.tsx, Header.tsx   (modify)
scripts/capture-mist.ts           both static images from the real shader
tests/unit/grade-floor.test.ts
tests/e2e/hero.spec.ts, intro.spec.ts, mist.spec.ts, mist-caps.spec.ts, acceptance.spec.ts, budget.spec.ts (modify)
```

---

### Task 1: Floor backdrops

**Files:**
- Create: `scripts/grade-floor.ts`, `public/hero/floor-light.webp`, `public/hero/floor-dark.webp`
- Test: `tests/unit/grade-floor.test.ts`

**Interfaces:**
- Produces: `scripts/grade-floor.ts` exports `STOPS: Record<"light" | "dark", string[]>`, `lut(stops: string[]): Uint8Array` (256 RGB triplets, luminance 0 maps to the first stop, 255 to the last), `gradeFloor(input: string, theme: "light" | "dark", output: string): Promise<void>` (cover-crop to 2400 by 1600, grayscale, map through the LUT, WebP). CLI: `node scripts/grade-floor.ts <input> <light|dark> <output>`.

- [ ] **Step 1: Write the failing test**

`tests/unit/grade-floor.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { lut, STOPS } from "../../scripts/grade-floor.ts";

const hex = (table: Uint8Array, i: number) => "#" + [...table.slice(i * 3, i * 3 + 3)].map((v) => v.toString(16).padStart(2, "0")).join("");

describe("lut", () => {
  it("starts and ends exactly on palette colors", () => {
    const light = lut(STOPS.light);
    expect(hex(light, 0)).toBe(STOPS.light[0].toLowerCase());
    expect(hex(light, 255)).toBe(STOPS.light.at(-1)?.toLowerCase());
    const dark = lut(STOPS.dark);
    expect(hex(dark, 0)).toBe(STOPS.dark[0].toLowerCase());
    expect(hex(dark, 255)).toBe(STOPS.dark.at(-1)?.toLowerCase());
  });
  it("only gets lighter as luminance rises, so tones never invert", () => {
    const table = lut(STOPS.light);
    const sum = (i: number) => table[i * 3] + table[i * 3 + 1] + table[i * 3 + 2];
    for (let i = 1; i < 256; i++) expect(sum(i)).toBeGreaterThanOrEqual(sum(i - 1));
  });
  it("uses only palette stops", () => {
    const palette = ["#171A12", "#23261C", "#3A3A2C", "#393625", "#685846", "#8C7964", "#AD9883", "#DCD0BF", "#F2EBDF", "#FAF6EE"];
    [...STOPS.light, ...STOPS.dark].forEach((stop) => expect(palette).toContain(stop));
  });
});
```

Run: `npx vitest run tests/unit/grade-floor.test.ts`
Expected: FAIL (cannot find `scripts/grade-floor.ts`).

- [ ] **Step 2: Write `scripts/grade-floor.ts`**

```ts
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/** Luminance stops, darkest first. Grading through them maps every pixel onto warm palette tones, so no stray hue survives. */
export const STOPS = {
  light: ["#685846", "#AD9883", "#DCD0BF", "#F2EBDF", "#FAF6EE"],
  dark: ["#171A12", "#23261C", "#3A3A2C", "#393625", "#8C7964"],
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function lut(stops: string[]) {
  const colors = stops.map(rgb);
  const table = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (colors.length - 1);
    const k = Math.min(Math.floor(t), colors.length - 2);
    const f = t - k;
    for (let c = 0; c < 3; c++) table[i * 3 + c] = Math.round(colors[k][c] + (colors[k + 1][c] - colors[k][c]) * f);
  }
  return table;
}

export async function gradeFloor(input: string, theme: "light" | "dark", output: string) {
  const { data, info } = await sharp(input).resize(2400, 1600, { fit: "cover", position: "attention" }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const table = lut(STOPS[theme]);
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let p = 0; p < info.width * info.height; p++) out.set(table.subarray(data[p * info.channels] * 3, data[p * info.channels] * 3 + 3), p * 3);
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 74 }).toFile(output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input, theme, output] = process.argv.slice(2);
  if (!input || (theme !== "light" && theme !== "dark") || !output) {
    console.error("Usage: node scripts/grade-floor.ts <input> <light|dark> <output>");
    process.exit(1);
  }
  await gradeFloor(input, theme, output);
  console.log(`wrote ${output}`);
}
```

Note: `check-copy` flags any `#hex` outside the palette in `scripts/`. `#393625` is the dark olive-brown in the palette. Every stop above is in the palette.

Run: `npx vitest run tests/unit/grade-floor.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 3: Generate the two raw backdrops**

Load the Canva image tools with ToolSearch (`select:mcp__claude_ai_Canva__generate-image,mcp__claude_ai_Canva__get-generate-image-job`) and read their schemas. Generate each image at a 3:2 landscape aspect (or the closest the tool offers), poll the job until it finishes, then download the result into the scratchpad directory (never into `public/` unreviewed). If the Canva connector is unavailable, stop and ask the user for two photos instead (a cream wall and stone floor, and a dark version). Do not invent another source.

Light prompt:

> Photorealistic interior product backdrop with no product in it. A soft cream plaster wall meets a warm taupe stone floor. Gentle diffused daylight from the left side, soft long shadows. A few small smooth pale pebbles rest on the floor in the right third. Shallow depth of field, the wall softly out of focus. The left half is calm plain wall with generous empty space. The floor horizon sits at about 60 percent of the image height, camera low near floor level. Muted, warm, desaturated tones only: cream, sand, taupe, umber. No plants, no green, no blue, no text, no logos, no bottles, no people, no glow, no light spots.

Dark prompt:

> The same composition at dusk. A dark olive brown plaster wall meets a deep umber stone floor. Low warm side light from the left, soft shadows. A few dark smooth pebbles in the right third. Shallow depth of field. The left half is calm plain wall with generous empty space. Floor horizon at about 60 percent of the image height, camera near floor level. Muted, dark, desaturated tones only. No plants, no green, no blue, no text, no logos, no bottles, no people, no glow, no light spots, no bokeh highlights.

- [ ] **Step 4: Grade, check and get approval**

```bash
node scripts/grade-floor.ts "<scratchpad>/floor-light-raw.png" light public/hero/floor-light.webp
node scripts/grade-floor.ts "<scratchpad>/floor-dark-raw.png" dark public/hero/floor-dark.webp
```

Check each is under 200KB (`ls -l public/hero/floor-*.webp`). If larger, lower `quality` in `gradeFloor`. Open both images and confirm: the floor horizon is near 60 percent height, the left half is quiet enough for the headline, and nothing reads as a stray object.

**Gate:** send both graded images to the user (SendUserFile) and wait for approval. If they ask for changes, adjust the prompt, regenerate and regrade. Do not commit the backdrops before the user approves them.

- [ ] **Step 5: Commit**

```bash
git add scripts/grade-floor.ts tests/unit/grade-floor.test.ts public/hero/floor-light.webp public/hero/floor-dark.webp
git commit -m "feat: palette graded floor backdrops for the hero, light and dark"
```

---

### Task 2: The floor scene hero

**Files:**
- Modify: `src/components/Hero.tsx` (rewrite), `src/components/SpinBottle.tsx`, `src/app/globals.css`, `src/app/(home)/loading.tsx`, `tests/e2e/catalog.spec.ts`
- Test: `tests/e2e/hero.spec.ts`

**Interfaces:**
- Produces:
  - Hero markers used by the intro and the mist: `section` (the hero root, `touch-pan-y`, `isolate`, `overflow-hidden`), `[data-hero-bottle]` (the 4:5 box the bottle stands in), `[data-mist-text]` (the h1), `[data-intro-hide]` (the h1 and the button wrapper), `a.btn` (the single button, the mist keep-out).
  - `SpinBottle`'s contact shadow element gets `data-shadow`.
  - `globals.css`: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` so Tailwind's `dark:` follows the switch.

- [ ] **Step 1: Design pass**

Invoke `ui-ux-pro-max:ui-ux-pro-max` with `"hero product floor minimal text"` (`--domain landing`) and `"text over image contrast"` (`--domain ux`). Brand wins. Record decisions.

- [ ] **Step 2: Write the failing hero spec**

`tests/e2e/hero.spec.ts` (every visit uses `?x=1` so the intro, added in Task 4, never runs here):

```ts
import { expect, test } from "@playwright/test";

test("the hero has one headline, one button, a floor and a standing bottle, and no sizes", async ({ page }) => {
  await page.goto("/?x=1");
  const hero = page.locator("section").first();
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Find the scent that feels like you.");
  await expect(hero.getByRole("link")).toHaveCount(1);
  await expect(hero.getByRole("link", { name: /view products/i })).toHaveAttribute("href", "/products");
  await expect(hero.locator('img[src*="floor-light"]')).toBeVisible();
  await expect(hero.locator("[data-hero-bottle] img")).toBeVisible();
  expect(await hero.innerText()).not.toMatch(/\d\s?ml|\$/);
});

test("the button sits left of the bottle on desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop layout");
  await page.goto("/?x=1");
  const button = await page.getByRole("link", { name: /view products/i }).boundingBox();
  const bottle = await page.locator("[data-hero-bottle]").boundingBox();
  expect((button?.x ?? 0) + (button?.width ?? 0)).toBeLessThan(bottle?.x ?? 0);
});

test("the dark floor fades in when the theme is dark", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("saka.theme", "dark"));
  await page.goto("/?x=1");
  await expect.poll(() => page.locator('img[src*="floor-dark"]').evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("the hero never blocks vertical scrolling", async ({ page }) => {
  await page.goto("/?x=1");
  expect(await page.locator("section").first().evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-y");
});
```

Run: `npm run test:e2e -- hero`
Expected: FAIL (old hero).

- [ ] **Step 3: Variant and shadow marker**

`src/app/globals.css`, right after `@import "tailwindcss";`:

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

`src/components/SpinBottle.tsx`: add `data-shadow` to the contact shadow `div`.

- [ ] **Step 4: Write the hero**

Replace `src/components/Hero.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "./Icons";
import { MistLayer } from "./MistLayer";
import { SpinBottle } from "./SpinBottle";

const FLOOR = "-z-10 object-cover object-[50%_70%]";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate h-[max(600px,calc(100svh-4.5rem))] touch-pan-y overflow-hidden">
      <Image src="/hero/floor-light.webp" alt="" fill priority sizes="100vw" className={FLOOR} />
      <Image src="/hero/floor-dark.webp" alt="" fill sizes="100vw" className={`${FLOOR} opacity-0 transition-opacity duration-500 dark:opacity-100`} />

      <div className="wrap relative z-10 flex h-full flex-col justify-between pb-12 pt-14 lg:justify-center lg:gap-10 lg:py-0">
        <h1 id="hero-title" data-intro-hide data-mist-text className="h1 max-w-[12ch] text-balance">
          Find the scent that feels like you.
        </h1>
        <div data-intro-hide>
          <Link href="/products" className="btn btn-primary">
            View products <ArrowIcon width={18} height={18} />
          </Link>
        </div>
      </div>

      <div data-hero-bottle className="absolute bottom-[13%] left-1/2 z-[1] aspect-[4/5] h-[44%] -translate-x-1/2 lg:bottom-[11%] lg:left-[66%] lg:h-[62%]">
        <SpinBottle dir="/hero" alt="A SAKA Parfum bottle standing on a stone floor" sizes="(min-width: 1024px) 520px, 60vw" priority className="h-full" />
      </div>

      <MistLayer />
    </section>
  );
}
```

Layering: floors at -10, bottle at 1, mist at 5 (MistLayer), text and button at 10. `MistLayer` comes from Task 3. Until then, create a one-line placeholder `export function MistLayer() { return null; }` in `src/components/MistLayer.tsx` and replace it in Task 3.

Tune the bottle's `bottom`, `left` and `h` against the approved backdrop so the bottle's base and contact shadow sit on the floor plane, a little in front of the horizon. Check at 390, 768, 1280 and 1600px wide.

`src/app/(home)/loading.tsx`, replace the hero block with a skeleton of the new layout:

```tsx
      <div className="relative h-[max(600px,calc(100svh-4.5rem))] bg-surface" aria-hidden="true">
        <div className="wrap flex h-full flex-col justify-between pb-12 pt-14 lg:justify-center lg:gap-10 lg:py-0">
          <div className="space-y-3">
            <div className="skeleton h-9 w-64 bg-bg lg:h-12 lg:w-[28rem]" />
            <div className="skeleton h-9 w-48 bg-bg lg:h-12 lg:w-80" />
          </div>
          <div className="skeleton h-11 w-48 bg-bg" />
        </div>
        <div className="skeleton absolute bottom-[13%] left-1/2 aspect-[4/5] h-[44%] -translate-x-1/2 rounded-sm bg-bg lg:bottom-[11%] lg:left-[66%] lg:h-[62%]" />
      </div>
```

In `tests/e2e/catalog.spec.ts`, the home preview test's `page.goto("/")` becomes `page.goto("/?x=1")` (it must not depend on the intro).

- [ ] **Step 5: Run, look, commit**

Run: `npm run typecheck && npm run check && npm run test:e2e -- hero catalog a11y`
Expected: PASS. Look at both themes at phone and desktop widths. The headline must read clearly on the wall, and the bottle must look like it stands on the floor, not float above it. Toggle the theme and watch the floors crossfade.

```bash
git add src tests
git commit -m "feat: floor scene hero with standing bottle, one headline and one button"
```

---

### Task 3: Mist over the floor

**Files:**
- Create: `src/lib/mist-math.ts`, `src/lib/mist-shader.ts`, `scripts/lib/mist-harness.ts`, `tests/unit/mist-math.test.ts`, `tests/e2e/mist-caps.spec.ts` (all from plan 04 Task 2), `src/components/Mist.tsx`, `scripts/capture-mist.ts`, `public/mist-static.webp`, `public/mist-static-dark.webp`
- Modify: `src/components/MistLayer.tsx` (replace the placeholder), `tests/e2e/budget.spec.ts`
- Test: `tests/e2e/mist.spec.ts`

**Interfaces:**
- Consumes: hero markers (Task 2).
- Produces: everything plan 04 Task 2 produces, plus `MIST_COLORS_DARK` in `mist-math.ts` and a `colors?: readonly string[]` option on `renderMist` (defaults to `MIST_COLORS`). `Mist({ onFail })` (default export, lazy chunk). `MistLayer()`.

- [ ] **Step 1: Execute plan 04 Task 2 as written**

Open `docs/superpowers/plans/2026-10-18-saka-parfum-04-intro-hero-mist.md` and run its Task 2, Steps 1 to 5, exactly: install `ogl`, write the math tests and `mist-math.ts`, the harness and the cap test, then the shader. Do not commit yet. Then apply two amendments:

1. `src/lib/mist-math.ts`, add:

```ts
export const MIST_COLORS_DARK = ["#23261C", "#3A3A2C", "#8C7964"] as const;
```

2. `scripts/lib/mist-harness.ts`: add `colors?: readonly string[]` to `Options`, destructure it as `colors = MIST_COLORS`, and pass `colors: colors.map(hexToRgb)` into `page.evaluate` in place of `colors: MIST_COLORS.map(hexToRgb)`.

In `tests/e2e/mist-caps.spec.ts`, change the type import to `import { MIST_COLORS_DARK, type Box } from "../../src/lib/mist-math.ts";` and append inside the describe:

```ts
  test("the dark palette respects the same caps", async ({ page }) => {
    await page.goto("about:blank");
    const { stats } = await renderMist(page, { width: 800, height: 500, time: 40, scale: 0.5, colors: MIST_COLORS_DARK, boxes: { bottle: [320, 140, 480, 400], text: [240, 420, 560, 480], keepA: [260, 40, 395, 100] } });
    expect(stats.all).toBeLessThanOrEqual(0.55 + STEP);
    expect(stats.bottle).toBeLessThanOrEqual(0.3 + STEP);
    expect(stats.text).toBeLessThanOrEqual(0.15 + STEP);
    expect(stats.keepA).toBeLessThanOrEqual(STEP);
  });
```

Run: `npx vitest run tests/unit/mist-math.test.ts && npx playwright test mist-caps --project=desktop`
Expected: PASS.

- [ ] **Step 2: `Mist.tsx` with theme colors**

Create `src/components/Mist.tsx` with the exact code from plan 04 Task 3 Step 2, then change it so the palette follows the theme switch:

- Import `MIST_COLORS_DARK` next to `MIST_COLORS`.
- Before `const uniforms = {`, add:

```ts
    const palette = () => (document.documentElement.dataset.theme === "dark" ? MIST_COLORS_DARK : MIST_COLORS).map(hexToRgb);
    const [colA, colB, colC] = palette();
```

- The three color uniforms become `uColA: { value: colA }`, `uColB: { value: colB }`, `uColC: { value: colC }`.
- After `measure();`, add:

```ts
    const themeWatch = new MutationObserver(() => {
      const [a, b, c] = palette();
      uniforms.uColA.value = a;
      uniforms.uColB.value = b;
      uniforms.uColC.value = c;
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
```

- In the cleanup, add `themeWatch.disconnect();`.

Keep plan 04's notes: no `preventDefault`, `stop` stays a function declaration, wrap `new Renderer` in `try/catch` and call `onFail()` if it throws, and check the installed OGL option names.

- [ ] **Step 3: `MistLayer.tsx`**

Replace the placeholder:

```tsx
"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const Mist = dynamic(() => import("./Mist"), { ssr: false });

/** The mask keeps the fog low over the floor, fading out above roughly 65 percent of the hero height. */
const MASK = "[mask-image:linear-gradient(to_top,black_30%,transparent_68%)]";

export function MistLayer() {
  const layer = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"webgl" | "static" | null>(null);
  const fallBack = useCallback(() => setMode("static"), []);

  useEffect(() => {
    setMode(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "static" : "webgl");
  }, []);

  useGSAP(
    () => {
      const el = layer.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      const fadeIn = () => gsap.to(el, { opacity: 1, duration: 0.8, ease: "power1.out" });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!document.documentElement.classList.contains("intro-pending")) {
          fadeIn();
          return;
        }
        window.addEventListener("saka:intro-end", fadeIn, { once: true });
        return () => window.removeEventListener("saka:intro-end", fadeIn);
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { opacity: 1 });
      });
    },
    { scope: layer },
  );

  return (
    <div ref={layer} aria-hidden="true" className={`pointer-events-none absolute inset-0 z-[5] opacity-0 ${MASK}`}>
      {mode === "webgl" && <Mist onFail={fallBack} />}
      {mode === "static" && (
        <>
          <img src="/mist-static.webp" alt="" className="h-full w-full object-cover opacity-40 dark:hidden" />
          <img src="/mist-static-dark.webp" alt="" className="hidden h-full w-full object-cover opacity-40 dark:block" />
        </>
      )}
    </div>
  );
}
```

The mask is part of the mist, not a visible gradient. The static images are decorative and only shown after a failure or under reduced motion, so a plain `img` is fine.

- [ ] **Step 4: Capture both static images**

`scripts/capture-mist.ts`:

```ts
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { MIST_COLORS, MIST_COLORS_DARK, type Box } from "../src/lib/mist-math.ts";
import { renderMist } from "./lib/mist-harness.ts";

// Approximate desktop hero regions in canvas pixels (origin bottom left), so the caps are baked into the fallback.
const boxes: Record<"bottle" | "text" | "keepA", Box> = {
  bottle: [800, 120, 1260, 720],
  text: [110, 450, 760, 660],
  keepA: [110, 300, 420, 400],
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
for (const [colors, file] of [[MIST_COLORS, "public/mist-static.webp"], [MIST_COLORS_DARK, "public/mist-static-dark.webp"]] as const) {
  const { dataUrl } = await renderMist(page, { width: 1600, height: 1000, time: 40, scale: 1, colors, boxes });
  await sharp(Buffer.from(dataUrl.split(",")[1], "base64")).webp({ quality: 80, alphaQuality: 80 }).toFile(file);
  console.log(`wrote ${file}`);
}
await browser.close();
```

Run: `node scripts/capture-mist.ts`
Expected: both files written, each under 80KB.

- [ ] **Step 5: Bundle budget and the mist spec**

In `tests/e2e/budget.spec.ts` (from plan 03), skip any script whose text contains the shader marker: after the line that reads the response body, add `if (body && body.toString("utf8").includes("#version 300 es")) return;` before the size is counted.

`tests/e2e/mist.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { renderMist } from "../../scripts/lib/mist-harness.ts";
import { toCanvasRect } from "../../src/lib/mist-math.ts";

const VIEWPORTS = [{ width: 360, height: 740 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];

test.describe("mist", () => {
  test.skip(({ isMobile }) => isMobile, "Viewports are set explicitly below");

  test("the canvas is decorative, never takes input, sits under the button and is masked low", async ({ page }) => {
    await page.goto("/?x=1");
    const canvas = page.locator("section canvas");
    await expect(canvas).toHaveCount(1);
    const layer = page.locator("[aria-hidden=true]:has(canvas)");
    expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
    expect(await layer.evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage)).toContain("linear-gradient");
    const box = (await page.getByRole("link", { name: /view products/i }).boundingBox()) as { x: number; y: number; width: number; height: number };
    const top = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.textContent?.trim(), [box.x + box.width / 2, box.y + box.height / 2]);
    expect(top?.toLowerCase()).toContain("view products");
  });

  for (const viewport of VIEWPORTS) {
    test(`the button keep-out stays clear at ${viewport.width}px wide`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/?x=1");
      const measured = await page.evaluate(() => {
        const hero = document.querySelector("section") as HTMLElement;
        return { hero: hero.getBoundingClientRect().toJSON(), button: (hero.querySelector("a.btn") as HTMLElement).getBoundingClientRect().toJSON() };
      });
      const scale = 0.5;
      const keepA = toCanvasRect(measured.button, measured.hero, scale, 16);
      const { stats } = await renderMist(page, { width: Math.round(measured.hero.width * scale), height: Math.round(measured.hero.height * scale), scale, boxes: { keepA } });
      expect(stats.keepA).toBeLessThanOrEqual(1 / 255);
    });
  }

  test("reduced motion shows the static image and no canvas", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("http://localhost:3100/");
    await expect(page.locator("section canvas")).toHaveCount(0);
    await expect(page.locator('section img[src="/mist-static.webp"]')).toBeVisible();
    await context.close();
  });

  test("without WebGL2 the theme's static image appears and no error text shows", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("saka.theme", "dark");
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        return type === "webgl2" || type === "webgl" ? null : (original as Function).call(this, type, ...args);
      } as typeof original;
    });
    await page.goto("/?x=1");
    await expect(page.locator('section img[src="/mist-static-dark.webp"]')).toBeVisible();
    await expect(page.getByText(/webgl|error|not supported/i)).toHaveCount(0);
  });
});
```

- [ ] **Step 6: Run, look, commit**

Run: `npm run typecheck && npm run check && npm test && npm run test:e2e -- mist mist-caps budget hero`
Expected: PASS. In a real browser:
- Move the pointer low over the floor. The mist swirls and relaxes.
- Nothing hangs over the headline.
- The button stays clear.
- Switching the theme changes the mist tones without a reload.
- On a phone, dragging a finger over the hero still scrolls the page.

```bash
git add src scripts public tests package.json package-lock.json
git commit -m "feat: low floor mist with theme colors, keep-out, budget guard and static fallbacks"
```

---

### Task 4: The intro

**Files:**
- Create: `src/components/Intro.tsx`
- Modify: `src/lib/head-script.ts`, `src/app/globals.css`, `src/components/Header.tsx`, `src/app/(home)/page.tsx`
- Test: `tests/e2e/intro.spec.ts`

**Interfaces:**
- Consumes: `SpinBottle` and `SpinHandle` (`preload`, `spin`), hero markers, `[data-shadow]`, `MOTION`, `Logo`.
- Produces: `Intro()` client component. `html.intro-pending` contract: added by the head script on a plain hard load of `/` without reduced motion, removed by `Intro` or the 7s failsafe. While present, CSS shows `.intro-overlay` and hides `[data-intro-hide]` and `[data-hero-bottle]`. The window event `saka:intro-end` fires once when the page is revealed.

- [ ] **Step 1: Design pass**

Invoke `ui-ux-pro-max:ui-ux-pro-max` with `"intro animation skip button"` (`--domain ux`) and `"timeline choreography"` (`--domain gsap`). Load the four GSAP skills. Record decisions.

- [ ] **Step 2: Extend the head script and the CSS contract**

`src/lib/head-script.ts`, replace `HEAD_SCRIPT`:

```ts
/**
 * Runs before first paint. Light is the default, dark only when the visitor chose it on this device.
 * A plain hard load of the home page (no hash, no query, motion allowed) gets the intro, and the
 * failsafe always reveals the page even if no script bundle ever runs.
 */
export const HEAD_SCRIPT =
  `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}` +
  `try{var d=document.documentElement,l=location;if(l.pathname==="/"&&!l.hash&&!l.search&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("intro-pending");setTimeout(function(){d.classList.remove("intro-pending")},7000)}}catch(e){}`;
```

`src/app/globals.css`, unlayered, at the end:

```css
.intro-overlay { display: none; }
html.intro-pending .intro-overlay { display: block; }
html.intro-pending [data-intro-hide],
html.intro-pending [data-hero-bottle] { opacity: 0; }
```

`src/components/Header.tsx`: add `data-intro-hide` to the `<header>`.

- [ ] **Step 3: Write `Intro.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";
import { Logo } from "./Logo";
import { SpinBottle, type SpinHandle } from "./SpinBottle";

const PENDING = "intro-pending";

export function Intro() {
  const overlay = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bottle = useRef<SpinHandle>(null);
  const skip = useRef<HTMLButtonElement>(null);

  useGSAP(
    () => {
      const root = document.documentElement;
      if (!root.classList.contains(PENDING)) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        root.classList.remove(PENDING);
        window.dispatchEvent(new Event("saka:intro-end"));
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const hero = document.querySelector<HTMLElement>("[data-hero-bottle]");
        const el = stage.current;
        const shadow = el?.querySelector<HTMLElement>("[data-shadow]");
        if (!hero || !el || !shadow) {
          root.classList.remove(PENDING);
          return;
        }
        const guarded = [...document.querySelectorAll<HTMLElement>("body > header, body > main, body > footer")];
        const main = document.querySelector("main");
        // Headline, then button, then header.
        const reveal = [...document.querySelectorAll<HTMLElement>("main [data-intro-hide]"), document.querySelector<HTMLElement>("body > header")].filter(Boolean);
        let done = false;
        let revealed = false;
        let ready = false;

        guarded.forEach((node) => (node.inert = true));
        main?.setAttribute("aria-hidden", "true");
        root.style.overflow = "hidden";
        window.scrollTo({ top: 0, behavior: "instant" });

        // The overlay bottle is the hero bottle's exact size, centered, so the glide is a pure translate.
        const target = hero.getBoundingClientRect();
        const left = (window.innerWidth - target.width) / 2;
        const top = (window.innerHeight - target.height) / 2;
        Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${target.width}px`, height: `${target.height}px` });

        // Inline opacity beats the pending rule, so content can fade up while the overlay is still in place.
        const showContent = () => {
          if (revealed) return;
          revealed = true;
          gsap.fromTo(reveal, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.15, ...MOTION.enter, clearProps: "opacity,transform" });
        };

        const finish = (fade = false) => {
          if (done) return;
          done = true;
          tl.kill();
          if (fade) {
            gsap.set(overlay.current, { display: "block" });
            gsap.to(overlay.current, { opacity: 0, duration: 0.4, ease: "power1.out", onComplete: () => gsap.set(overlay.current, { display: "none" }) });
            gsap.fromTo(hero, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out", clearProps: "opacity" });
          }
          showContent();
          guarded.forEach((node) => (node.inert = false));
          main?.removeAttribute("aria-hidden");
          root.style.overflow = "";
          root.classList.remove(PENDING);
          window.dispatchEvent(new Event("saka:intro-end"));
        };

        // The sprite loads during the logo. If it is late, the bottle glides without turning. If it fails, skip.
        bottle.current?.preload().then(
          () => (ready = true),
          () => finish(true),
        );

        const tl = gsap
          .timeline({ onComplete: () => finish() })
          .fromTo(logo.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, 0)
          .to(logo.current, { opacity: 0, duration: 0.35, ease: "power2.in" }, 0.65)
          .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, 1)
          .call(() => void (ready && bottle.current?.spin(2)), [], 1)
          .to(el, { x: target.left - left, y: target.top - top, duration: 1.2, ease: "power3.inOut" }, 3)
          .to(backdrop.current, { opacity: 0, duration: 1, ease: "power2.inOut" }, 3)
          .fromTo(shadow, { opacity: 0, scaleX: 0.6 }, { opacity: 1, scaleX: 1, duration: 0.6, ease: "power2.out" }, 3.6)
          .call(showContent, [], 3.8);

        gsap.to(skip.current, { opacity: 1, duration: 0.3, delay: 0.3, onStart: () => skip.current?.focus() });

        const onKey = (event: KeyboardEvent) => {
          if (event.key === "Escape" || event.key === "Enter") finish(true);
        };
        const onResize = () => finish(true);
        const onSkip = () => finish(true);
        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", onResize);
        skip.current?.addEventListener("click", onSkip);
        return () => {
          window.removeEventListener("keydown", onKey);
          window.removeEventListener("resize", onResize);
          skip.current?.removeEventListener("click", onSkip);
          finish();
        };
      });
    },
    { scope: overlay },
  );

  return (
    <div ref={overlay} className="intro-overlay fixed inset-0 z-[100]">
      <div ref={backdrop} className="absolute inset-0 bg-bg" />
      <div ref={logo} className="absolute inset-0 grid place-items-center opacity-0">
        <Logo className="h-auto w-[220px] md:w-[320px]" />
      </div>
      <div ref={stage} aria-hidden="true" className="absolute opacity-0">
        <SpinBottle ref={bottle} dir="/hero" alt="" sizes="(min-width: 1024px) 520px, 60vw" className="h-full" />
      </div>
      <button ref={skip} type="button" className="absolute bottom-8 left-1/2 min-h-11 -translate-x-1/2 px-4 font-display text-[13px] font-medium text-muted opacity-0">
        Skip
      </button>
    </div>
  );
}
```

Implementation notes:
- `tl` is used inside `finish` before its `const` line. Both only run after `tl` is assigned (the preload rejects asynchronously, events fire later). If TypeScript complains, declare `let tl: gsap.core.Timeline;` above `finish` and assign it below.
- At 4.2s the overlay bottle sits exactly over the hero bottle, both are the same still image, and the overlay background is already transparent. Removing `intro-pending` shows the hero bottle and hides the overlay in the same frame, so nothing jumps.
- The hero bottle stays hidden under the pending rule during the glide, so there is never a second bottle visible through the fading backdrop.
- On skip, the overlay fades out over 0.4s while the hero bottle fades in at its place.

- [ ] **Step 4: Render it**

`src/app/(home)/page.tsx`: add `<Intro />` as the first child of the fragment, before `<Hero />`.

- [ ] **Step 5: Write the intro spec**

`tests/e2e/intro.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

const ended = (page: Page, timeout = 10_000) => page.waitForFunction(() => !document.documentElement.classList.contains("intro-pending"), undefined, { timeout });

test("runs on a hard load of home, locks the page, and ends in about four seconds", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/intro-pending/);
  await expect(page.locator(".intro-overlay")).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
  await ended(page);
  const seconds = (Date.now() - start) / 1000;
  expect(seconds).toBeGreaterThan(3.6);
  expect(seconds).toBeLessThan(6);
  await expect(page.locator(".intro-overlay")).toBeHidden();
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-hero-bottle] img")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("the overlay bottle matches the hero bottle's size, and the hand-off causes no layout shift", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cls: number }).cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) (window as unknown as { cls: number }).cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await page.waitForFunction(() => (document.querySelector(".intro-overlay [aria-hidden]") as HTMLElement | null)?.style.width !== "");
  const sizes = await page.evaluate(() => {
    const stage = (document.querySelector(".intro-overlay [aria-hidden]") as HTMLElement).style;
    const hero = (document.querySelector("[data-hero-bottle]") as HTMLElement).getBoundingClientRect();
    return { w: parseFloat(stage.width), h: parseFloat(stage.height), hw: hero.width, hh: hero.height };
  });
  expect(sizes.w).toBeCloseTo(sizes.hw, 0);
  expect(sizes.h).toBeCloseTo(sizes.hh, 0);
  await ended(page);
  expect(await page.evaluate(() => (window as unknown as { cls: number }).cls)).toBeLessThan(0.1);
});

test("Skip, Escape and Enter each jump to the end state", async ({ page }) => {
  for (const act of [(p: Page) => p.getByRole("button", { name: "Skip" }).click(), (p: Page) => p.keyboard.press("Escape"), (p: Page) => p.keyboard.press("Enter")]) {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
    await act(page);
    await ended(page, 2000);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("a slow sprite never delays the intro", async ({ page }) => {
  await page.route("**/hero/spin.webp", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    await route.continue();
  });
  const start = Date.now();
  await page.goto("/");
  await ended(page);
  expect((Date.now() - start) / 1000).toBeLessThan(5.5);
});

test("a failed sprite skips the intro at once", async ({ page }) => {
  await page.route("**/hero/spin.webp", (route) => route.abort());
  const start = Date.now();
  await page.goto("/");
  await ended(page);
  expect((Date.now() - start) / 1000).toBeLessThan(2.5);
});

test("the failsafe reveals the page when no script bundle loads", async ({ page }) => {
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/intro-pending/);
  await ended(page, 9000);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("reduced motion has no intro", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
  await expect(page.locator(".intro-overlay")).toBeHidden();
  await context.close();
});

test("with JavaScript disabled the content shows and no overlay appears", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /view products/i })).toBeVisible();
  await expect(page.locator(".intro-overlay")).toBeHidden();
  await context.close();
});

test("a query skips the intro, and client navigation never replays it", async ({ page }) => {
  await page.goto("/?scent=cool-water");
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
  await page.goto("/");
  await ended(page);
  await page.getByRole("link", { name: "Products" }).first().click();
  await page.getByRole("link", { name: "SAKA Parfum, home" }).click();
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
});

test("the intro follows the theme", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("saka.theme", "dark"));
  await page.goto("/");
  expect(await page.locator(".intro-overlay > div").first().evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(23, 26, 18)");
});
```

- [ ] **Step 6: Run, watch it, commit**

Run: `npm run typecheck && npm run check && npm run test:e2e -- intro mist hero`
Expected: PASS on both projects.

Watch it at phone and desktop width, in both themes:
1. The logo fades in, holds and fades out.
2. The bottle fades in at center and turns once, slowing to face front.
3. It glides down and to the side as the floor dissolves in behind it, and its shadow grows as it settles.
4. The headline, button and header fade up, then the mist breathes in.

Record a screen capture and step through the hand-off frame by frame. If anything jumps at 4.2s, compare the overlay stage's final rect with `[data-hero-bottle]`'s rect (a CSS transform on a parent, or the header height changing, are the usual causes).

```bash
git add src tests
git commit -m "feat: intro with center spin and glide onto the floor scene"
```

---

### Task 5: Acceptance, performance and handoff

**Files:**
- Create: `tests/e2e/acceptance.spec.ts`
- Modify: whatever the measurements point at, `docs/design-notes.md`

- [ ] **Step 1: Acceptance checks**

`tests/e2e/acceptance.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("product grids are 3 columns on desktop and 2 on mobile", async ({ page }, info) => {
  await page.goto("/products");
  const columns = await page.locator("main ul").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(info.project.name === "desktop" ? 3 : 2);
});

test("no horizontal scroll at common widths", async ({ page }) => {
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/?x=1", "/products", "/admin/login"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  }
});

test("headings are ordered: one H1, then H2 and H3 without skipping", async ({ page }) => {
  for (const path of ["/?x=1", "/products", "/checkout", "/admin/login"]) {
    await page.goto(path);
    const levels = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4")].filter((h) => (h as HTMLElement).offsetParent !== null).map((h) => Number(h.tagName[1])));
    expect(levels.filter((n) => n === 1)).toHaveLength(1);
    levels.reduce((prev, level) => {
      expect(level - prev).toBeLessThanOrEqual(1);
      return level;
    }, 1);
  }
});

test("every image has alt text and nothing on home or products mentions Riel", async ({ page }) => {
  for (const path of ["/?x=1", "/products"]) {
    await page.goto(path);
    expect(await page.evaluate(() => [...document.querySelectorAll("img")].filter((img) => !img.hasAttribute("alt")).length)).toBe(0);
    expect(await page.locator("body").innerText()).not.toMatch(/riel|KHR/i);
  }
});
```

Run: `npm run typecheck && npm test && npm run check && npm run build && npm run test:e2e`
Expected: all PASS on desktop and mobile. Fix real failures in the code.

```bash
git add tests
git commit -m "test: acceptance checks for grids, scroll, headings, alt text and usd only"
```

- [ ] **Step 2: Measure and tune**

```bash
npm run build && node tests/e2e-server.mjs &
npm run lighthouse
npm run test:e2e -- budget
```

Run Lighthouse again on `http://localhost:3100/?x=1` to separate the intro's cost. Read the `largest-contentful-paint-element` audit: it should be the light floor image or the hero bottle.

Fix in this order, never loosening a threshold or removing a test:
1. **LCP element is wrong or slow.** Both floors have `sizes="100vw"`, and only the light floor and the hero bottle have `priority`. The floor WebP is under 200KB, and fonts are `display: swap`.
2. **CLS.** The hero has a fixed height, the bottle box is sized by CSS before its image loads, and reveals only animate opacity and transform.
3. **JS over budget.** `Intro` must not import OGL, `Mist` is only reached through `next/dynamic`, and GSAP core is the only GSAP import.
4. **Mist cost on a mid-range phone.** Lower the octaves or the DPR cap if frames drop. Confirm the 45ms budget guard falls back to the static image under 6x CPU throttling.

Record a "R3 numbers" table in `docs/design-notes.md`: scores, LCP, CLS, TBT, JS for `/` and `/products`, before and after, and the phone used for the mist check.

```bash
git add -A
git commit -m "perf: tune the floor hero, intro and mist to the targets"
```

- [ ] **Step 3: Final gates, preview and manual checks**

```bash
npm ci && npm run typecheck && npm test && npm run check && npm run build && npm run test:e2e && npm run lighthouse
```

Report the real output. Deploy a Vercel preview (once the user has created the Supabase project and set its variables) and run `npm run lighthouse -- https://<preview-url>`. The deployed numbers are the ones that count.

Record pass or fail in `docs/design-notes.md`:
1. The intro on a real iPhone (Safari) and Android phone (Chrome): timing, a smooth glide, no jump at the hand-off, Skip works.
2. Mist on a real phone: finger swirl, vertical scroll never blocked, button never covered.
3. Theme switch on the hero: floors and mist change together.
4. A keyboard-only pass across home, /products, the modal, checkout and admin.
5. When the real videos arrive:
   - For the hero, run `npm run frames -- video <file> public/hero`, and for each perfume `npm run frames -- video <file> public/products/<slug>`.
   - Confirm frame 0 faces front and a full turn returns to it.
   - Re-run the intro, hero and modal specs and Lighthouse. Recapture the mist only if the shader changed.

- [ ] **Step 4: Review and push**

Invoke `superpowers:requesting-code-review` for the R3 commits, fix critical and important findings, update the SAKA memory notes, `git push`, then `superpowers:finishing-a-development-branch`.
