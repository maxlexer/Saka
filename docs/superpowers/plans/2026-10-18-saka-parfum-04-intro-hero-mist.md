# SAKA Parfum Pass 4: Turntable Frames, Intro and Mist Implementation Plan

> **Superseded on 2026-10-18 by `2026-10-18-saka-parfum-07-r3-intro-hero-mist.md`.** Do not execute this plan. R3 reuses only Task 2 (mist shader, math, harness, cap test) and the `Mist.tsx` code in Task 3 Step 2, with the amendments R3 lists.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the brand moment: a 3 second intro (logo, then a bottle that spins and lands as the hero image), a hero covered by a soft, pointer-reactive WebGL mist, and every fallback (reduced motion, no WebGL2, no JavaScript, slow or failed assets) without hurting Lighthouse, LCP or the 170KB budget.

**Architecture:** The hero still (frame 0 of the turntable) is a normal `next/image` that always paints, so it stays the LCP element. A tiny inline head script adds `intro-pending` to `<html>` on a hard load of `/`, which CSS uses to hide the header and hero text and to show a server-rendered overlay. The `Intro` client component runs a two-part GSAP timeline (logo, then bottle) and removes the class when done. The mist is an OGL canvas in a lazy chunk, with all geometry math in a plain tested module and the shader strings in one file that the app, a capture script and a test harness all share.

**Tech Stack:** GSAP and `@gsap/react`, OGL, ffmpeg (frame extraction script), sharp, Playwright (shader cap checks, intro timing, fallbacks), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-saka-parfum-design.md`, sections 8.4, 8.5, 10, 12, 15. Passes 1 to 3 must be complete.

## Global Constraints

Copied from `CLAUDE.md` and the spec. They apply to every task.

- Skeleton loaders for every loading state. No spinners, no blank screens.
- Code like a senior developer: less code where possible, no dead code, no needless abstractions or wrappers, no duplicated logic, no unused dependencies.
- No AI slop. No sparkles, no glow, no new hues.
- Never use em dashes anywhere. No exclamation marks in any copy. Avoid the non-null assertion operator followed by a space so `npm run check` stays reliable.
- Palette only. Mist colors: #F2EBDF, #DCD0BF, #AD9883 (the hero stays on cream in dark mode, so the dark mist palette #23261C, #3A3A2C, #8C7964 is not shipped until cutouts exist). No #FFFFFF or #000000.
- All web animation uses GSAP (`gsap`, `@gsap/react`, `useGSAP`). No Motion, Framer Motion or other animation library. No ScrollTrigger and no other GSAP plugin. Every GSAP animation respects `prefers-reduced-motion` via `gsap.matchMedia()`.
- Intro sequence (spec 8.4): total 3000ms, fixed overlay on #FAF6EE above everything.
  - 0 to 1000ms: wordmark with PARFUM, 320px wide on desktop and 220px on mobile, #171A12. Fade in 350ms ease-out, hold 300ms, fade out 350ms ease-in.
  - 1000 to 3000ms: the bottle fades in over the first 500ms and spins 360 degrees using the turntable frames, decelerating with ease-out, and settles down the last few pixels as it lands. It ends front-facing at exactly the hero image rect.
  - 3000ms: overlay removed with no visible jump. Header, headline, subheadline and buttons fade up 12px over 500ms. The mist fades in over 800ms.
  - The overlay bottle is positioned from `getBoundingClientRect()` of the real hero image at runtime. Scroll is locked and `<main>` is `inert` and `aria-hidden` while it runs. A "Skip" text button (Montserrat 500, 13px, #685846) appears bottom center after 300ms. Click, Escape or Enter jumps to the end state.
  - An inline head script adds a class that hides the header, headline, subheadline and buttons. A 6 second failsafe always removes the overlay. The hero still is never hidden.
  - Frames: 24 WebP at 720px wide, each under 25KB, preloaded during the logo phase and drawn to a 2D canvas from decoded bitmaps, dropped after hand-off. If the frames are not ready at 1000ms, skip the spin and crossfade to the hero still over 600ms. Any asset failure skips the intro.
  - `prefers-reduced-motion`: no intro, static hero, static mist image.
  - The user will supply turntable videos later. Until then clearly marked placeholder frames are used. When videos arrive, `scripts/extract-frames` cuts 24 evenly spaced frames and writes WebP into `public/turntable/` with no code change. The hero still is frame 0 and a full turn returns to it.
- Mist rules (spec 8.5): soft, slow, low-contrast fog. Drift about 0.02 noise units per second. Alpha caps 0.55 near hero edges, 0.3 over the bottle, 0.15 behind headline and subheadline text. Buttons are never covered: each hero button plus 16px padding is a keep-out rectangle feathered over 24px with alpha 0 inside, recomputed by a ResizeObserver. Reacts to pointer or finger only (`pointermove` on the hero displaces and swirls within 160px, 120px on touch, easing 0.08 per frame, relaxing over about 2 seconds after leaving or lifting). Nothing moves on scroll, no parallax, never blocks vertical scroll (`touch-action: pan-y`, never `preventDefault`). Canvas at 50 percent resolution, device pixel ratio capped at 1.5, 60fps desktop and 30fps mobile, paused off screen (IntersectionObserver) and in hidden tabs. If frame time stays too high for 2 seconds on mobile, or WebGL2 or the shader fails, or reduced motion is on, show `mist-static.webp` at 40 percent opacity with no interaction and no message. The static image is a captured frame of the shader produced by a script. The canvas is `pointer-events: none` and `aria-hidden`. Lazy loaded after the intro starts.
- Performance targets (mobile): Lighthouse Performance and Best Practices 90 or higher, Accessibility and SEO 95 or higher. LCP under 2.5s, CLS under 0.1, INP under 200ms. Initial JavaScript under 170KB gzipped, excluding the mist chunk. WCAG 2.2 AA. axe-core reports zero serious or critical issues.
- Web design decisions go through `ui-ux-pro-max:ui-ux-pro-max` first. Load `gsap-skills:gsap-core`, `gsap-skills:gsap-timeline`, `gsap-skills:gsap-react` and `gsap-skills:gsap-performance` before animation code. The brand brief wins.
- Report real numbers before claiming anything passes.
- Commits are small and conventional. Add the attribution trailer the session requires.

## Deviations from the spec (decided in this plan)

1. The intro is skipped when the URL has a hash or a query string, so a shared finder link (`/?vibe=calm#finder`) opens straight on the results. A plain `/` hard load always runs it.
2. No `noscript` style is needed. The head script is what adds `intro-pending`, so a visitor without JavaScript never gets the class and sees the normal page.
3. The Skip button receives focus when it appears, so Enter works from the keyboard as the spec requires.
4. A frame that fails to load skips the intro immediately, not after the logo phase.
5. "Frame time exceeds 33ms" is measured as a frame interval above 45ms, because a healthy 30fps loop sits at 33ms.

## File Structure

```
scripts/extract-frames.mjs          ffmpeg turntable extraction (videos arrive later)
scripts/capture-mist.mjs            writes public/mist-static.webp from the real shader
scripts/lib/mist-harness.ts         renders one shader frame in a page and reports max alpha per region
src/lib/mist-shader.ts              vertex and fragment strings (single source)
src/lib/mist-math.ts                hexToRgb, toCanvasRect, createBudget, MIST_COLORS
src/components/Mist.tsx             OGL canvas (lazy chunk)
src/components/MistLayer.tsx        client wrapper: chooses WebGL or static, fades in, listens for intro end
src/components/Intro.tsx            overlay, timeline, skip, failsafe
src/components/Hero.tsx             (modify) light island, mist layer, data attributes
src/components/Header.tsx           (modify) data-intro-hide
src/app/layout.tsx                  (modify) inline head script, suppressHydrationWarning
src/app/globals.css                 (modify) intro rules
src/app/(home)/page.tsx             (modify) render Intro
public/mist-static.webp
tests/unit/mist-math.test.ts
tests/e2e/mist-caps.spec.ts, mist.spec.ts, intro.spec.ts, budget.spec.ts (modify), acceptance.spec.ts
```

---

### Task 1: Turntable frame extraction script

**Files:**
- Create: `scripts/extract-frames.mjs`
- Modify: `README.md` (usage)

**Interfaces:**
- Produces: `node scripts/extract-frames.mjs <video> [--out public/turntable] [--frames 24]` writes `frame-00.webp` to `frame-23.webp`, 720 by 960, each under 25KB, evenly spaced across the video, frame 0 at the very start.

- [ ] **Step 1: Check ffmpeg**

Run: `ffmpeg -version && ffprobe -version`
Expected: both print a version. If missing, tell the user to install ffmpeg (for example `winget install Gyan.FFmpeg`) and wait. The script needs it only when real videos arrive.

- [ ] **Step 2: Write the script**

`scripts/extract-frames.mjs`:

```js
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const [video, ...rest] = process.argv.slice(2);
const option = (name, fallback) => rest[rest.indexOf(name) + 1] ?? fallback;
if (!video) {
  console.error("Usage: node scripts/extract-frames.mjs <video> [--out public/turntable] [--frames 24]");
  process.exit(1);
}

const out = option("--out", "public/turntable");
const count = Number(option("--frames", 24));
const MAX_BYTES = 25 * 1024;
const WIDTH = 720;
const HEIGHT = 960;
const CREAM = "#FAF6EE";

const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]).toString());
const work = mkdtempSync(join(tmpdir(), "saka-frames-"));
mkdirSync(out, { recursive: true });

for (let i = 0; i < count; i++) {
  const png = join(work, `f${i}.png`);
  // Evenly spaced and never past the last frame, so a full turn returns to frame 0.
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String((duration * i) / count), "-i", video, "-frames:v", "1", png]);
  const target = join(out, `frame-${String(i).padStart(2, "0")}.webp`);
  for (const quality of [82, 72, 62, 52, 42]) {
    await sharp(png).resize(WIDTH, HEIGHT, { fit: "contain", background: CREAM }).webp({ quality }).toFile(target);
    if (statSync(target).size <= MAX_BYTES) break;
  }
  const size = statSync(target).size;
  if (size > MAX_BYTES) console.warn(`frame ${i} is ${size} bytes, above ${MAX_BYTES}. Simplify the background or crop closer.`);
}

rmSync(work, { recursive: true, force: true });
console.log(`wrote ${count} frames to ${out}`);
```

- [ ] **Step 3: Verify with a synthetic clip (not committed)**

In the scratchpad directory (not the repo):

```bash
ffmpeg -v error -f lavfi -i "testsrc2=duration=4:size=1080x1440:rate=24" -pix_fmt yuv420p test.mp4
node scripts/extract-frames.mjs <scratchpad>/test.mp4 --out <scratchpad>/frames-test
```

Expected: `wrote 24 frames`. Check: 24 files, every file 720 by 960 (`node -e "import('sharp').then(async s=>console.log(await s.default(process.argv[1]).metadata()))" <file>`), sizes printed or under 25KB (a busy test pattern may warn, which proves the warning path). Do not touch `public/turntable`.

- [ ] **Step 4: Document and commit**

Add a "Turntable frames" section to `README.md`: record the bottle turning once on a cream seamless background, front view at the first frame and a full 360 degree turn, then run the script, then commit the new frames. Replacing files needs no code change.

```bash
git add scripts/extract-frames.mjs README.md
git commit -m "feat: ffmpeg script to cut turntable frames from a video"
```

---

### Task 2: Mist shader, math and a real alpha cap test

**Files:**
- Create: `src/lib/mist-math.ts`, `src/lib/mist-shader.ts`, `scripts/lib/mist-harness.ts`
- Test: `tests/unit/mist-math.test.ts`, `tests/e2e/mist-caps.spec.ts`

**Interfaces:**
- Produces:
  - `mist-math.ts`: `type Box = [number, number, number, number]` (x0, y0, x1, y1 in canvas pixels, origin bottom left), `MIST_COLORS` (`["#F2EBDF", "#DCD0BF", "#AD9883"]`), `hexToRgb(hex: string): [number, number, number]`, `toCanvasRect(el: { left: number; right: number; top: number; bottom: number }, hero: { left: number; top: number; height: number }, scale: number, pad?: number): Box`, `createBudget(slowMs?: number, windowMs?: number): (frameMs: number) => boolean` (returns true once frames have been slow for `windowMs` in a row; defaults 45 and 2000).
  - `mist-shader.ts`: `vertex: string`, `fragment: string` (WebGL2, `#version 300 es`). Uniforms: `uTime` (s), `uRes` (canvas px), `uScale` (canvas px per CSS px), `uColA`, `uColB`, `uColC` (vec3), `uPointer` (px), `uSwirl` (px, smoothed pointer velocity), `uForce` (0 to 1), `uRadius` (px), `uKeepA`, `uKeepB`, `uBottle`, `uText` (vec4 boxes in canvas px). Attribute `position`.
  - `mist-harness.ts`: `renderMist(page: Page, opts: { width: number; height: number; time?: number; scale?: number; boxes?: Partial<Record<"keepA" | "keepB" | "bottle" | "text", Box>> }): Promise<{ stats: Record<string, number>; dataUrl: string }>` where `stats.all` and one entry per given box hold the maximum alpha (0 to 1) in that region.

- [ ] **Step 1: Run the design and animation skills**

Invoke `ui-ux-pro-max:ui-ux-pro-max` for the mist look (soft, slow, low contrast, palette only) and load `gsap-skills:gsap-performance`. Append notes to `docs/design-notes.md`. Install OGL: `npm install ogl`.

- [ ] **Step 2: Write the failing math tests**

`tests/unit/mist-math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createBudget, hexToRgb, toCanvasRect } from "@/lib/mist-math";

describe("hexToRgb", () => {
  it("converts a palette hex to 0 to 1 channels", () => {
    const [r, g, b] = hexToRgb("#F2EBDF");
    expect(r).toBeCloseTo(242 / 255);
    expect(g).toBeCloseTo(235 / 255);
    expect(b).toBeCloseTo(223 / 255);
  });
});

describe("toCanvasRect", () => {
  const hero = { left: 0, top: 0, height: 100 };
  it("pads, flips the y axis for WebGL and scales to canvas pixels", () => {
    expect(toCanvasRect({ left: 10, right: 30, top: 20, bottom: 40 }, hero, 0.5, 16)).toEqual([-3, 22, 23, 48]);
  });
  it("accounts for the hero offset on the page", () => {
    expect(toCanvasRect({ left: 110, right: 130, top: 520, bottom: 540 }, { left: 100, top: 500, height: 100 }, 1)).toEqual([10, 60, 30, 80]);
  });
});

describe("createBudget", () => {
  it("trips after two seconds of slow frames in a row", () => {
    const over = createBudget();
    let tripped = false;
    for (let i = 0; i < 39; i++) tripped = over(50);
    expect(tripped).toBe(false);
    expect(over(50)).toBe(true);
  });
  it("resets when a frame is fast again", () => {
    const over = createBudget();
    for (let i = 0; i < 30; i++) over(50);
    over(33);
    for (let i = 0; i < 30; i++) expect(over(50)).toBe(false);
  });
});
```

Run: `npx vitest run tests/unit/mist-math.test.ts` (FAIL: module not found).

- [ ] **Step 3: Write `src/lib/mist-math.ts`**

```ts
export type Box = [number, number, number, number];

export const MIST_COLORS = ["#F2EBDF", "#DCD0BF", "#AD9883"] as const;

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** CSS pixels relative to the page to canvas pixels relative to the hero, with the y axis flipped for WebGL. */
export function toCanvasRect(
  el: { left: number; right: number; top: number; bottom: number },
  hero: { left: number; top: number; height: number },
  scale: number,
  pad = 0,
): Box {
  return [
    (el.left - hero.left - pad) * scale,
    (hero.height - (el.bottom - hero.top) - pad) * scale,
    (el.right - hero.left + pad) * scale,
    (hero.height - (el.top - hero.top) + pad) * scale,
  ];
}

/** True once frames have been slower than `slowMs` for `windowMs` in a row. A healthy 30fps loop sits near 33ms. */
export function createBudget(slowMs = 45, windowMs = 2000) {
  let slow = 0;
  return (frameMs: number) => {
    slow = frameMs > slowMs ? slow + frameMs : 0;
    return slow >= windowMs;
  };
}
```

Run `npx vitest run tests/unit/mist-math.test.ts` (PASS).

- [ ] **Step 4: Write the harness and the failing cap test**

`scripts/lib/mist-harness.ts`:

```ts
import type { Page } from "@playwright/test";
import { fragment, vertex } from "../../src/lib/mist-shader.ts";
import { hexToRgb, MIST_COLORS, type Box } from "../../src/lib/mist-math.ts";

type Boxes = Partial<Record<"keepA" | "keepB" | "bottle" | "text", Box>>;
type Options = { width: number; height: number; time?: number; scale?: number; boxes?: Boxes };

/** Draws one frame of the real shader in a fresh canvas and reports the maximum alpha per region. */
export function renderMist(page: Page, { width, height, time = 40, scale = 1, boxes = {} }: Options) {
  return page.evaluate(
    ({ vertex, fragment, width, height, time, scale, boxes, colors }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!gl) throw new Error("WebGL2 is unavailable in this browser");

      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type) as WebGLShader;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader error");
        return shader;
      };
      const program = gl.createProgram() as WebGLProgram;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link error");
      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      const set = (name: string, ...v: number[]) => {
        const at = gl.getUniformLocation(program, name);
        if (v.length === 1) gl.uniform1f(at, v[0]);
        else if (v.length === 2) gl.uniform2f(at, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(at, v[0], v[1], v[2]);
        else gl.uniform4f(at, v[0], v[1], v[2], v[3]);
      };
      const zero = [0, 0, 0, 0];
      set("uTime", time);
      set("uRes", width, height);
      set("uScale", scale);
      ["uColA", "uColB", "uColC"].forEach((name, i) => set(name, ...colors[i]));
      set("uPointer", -1e4, -1e4);
      set("uSwirl", 0, 0);
      set("uForce", 0);
      set("uRadius", 160);
      set("uKeepA", ...(boxes.keepA ?? zero));
      set("uKeepB", ...(boxes.keepB ?? zero));
      set("uBottle", ...(boxes.bottle ?? zero));
      set("uText", ...(boxes.text ?? zero));

      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const maxAlpha = (box: number[]) => {
        const [x0, y0, x1, y1] = box.map(Math.round);
        let max = 0;
        for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) {
          for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) max = Math.max(max, pixels[(y * width + x) * 4 + 3]);
        }
        return max / 255;
      };
      const stats: Record<string, number> = { all: maxAlpha([0, 0, width, height]) };
      for (const [name, box] of Object.entries(boxes)) stats[name] = maxAlpha(box as number[]);
      return { stats, dataUrl: canvas.toDataURL("image/png") };
    },
    { vertex, fragment, width, height, time, scale, boxes, colors: MIST_COLORS.map(hexToRgb) },
  );
}
```

`tests/e2e/mist-caps.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { renderMist } from "../../scripts/lib/mist-harness.ts";
import type { Box } from "../../src/lib/mist-math.ts";

const STEP = 1 / 255;

test.describe("mist alpha caps and keep-out (real shader, no browser UI)", () => {
  test.skip(({ isMobile }) => isMobile, "Shader math does not depend on the device");

  test("respects 0.55 overall, 0.3 over the bottle, 0.15 behind text and 0 inside keep-out boxes", async ({ page }) => {
    await page.goto("about:blank");
    const boxes: Record<"bottle" | "text" | "keepA" | "keepB", Box> = {
      bottle: [320, 140, 480, 400],
      text: [240, 420, 560, 480],
      keepA: [260, 40, 395, 100],
      keepB: [405, 40, 540, 100],
    };
    for (const time of [0, 13, 40, 97]) {
      const { stats } = await renderMist(page, { width: 800, height: 500, time, scale: 0.5, boxes });
      expect(stats.all).toBeGreaterThan(0.2);
      expect(stats.all).toBeLessThanOrEqual(0.55 + STEP);
      expect(stats.bottle).toBeLessThanOrEqual(0.3 + STEP);
      expect(stats.text).toBeLessThanOrEqual(0.15 + STEP);
      expect(stats.keepA).toBeLessThanOrEqual(STEP);
      expect(stats.keepB).toBeLessThanOrEqual(STEP);
    }
  });
});
```

Run: `npx playwright test mist-caps --project=desktop` (FAIL: `mist-shader` does not exist; the webServer starts the full e2e build, which is slow but fine. To iterate faster, temporarily point the test at `about:blank` only by running with `--config` that has no webServer, or keep the e2e server running with `reuseExistingServer: true` set via an env var if you add it).

- [ ] **Step 5: Write the shader**

`src/lib/mist-shader.ts`:

```ts
export const vertex = /* glsl */ `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment = /* glsl */ `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform float uScale;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec2 uPointer;
uniform vec2 uSwirl;
uniform float uForce;
uniform float uRadius;
uniform vec4 uKeepA;
uniform vec4 uKeepB;
uniform vec4 uBottle;
uniform vec4 uText;

out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.02 + 17.0;
    a *= 0.5;
  }
  return v;
}

// 1 inside the box, fading to 0 over "feather" pixels outside it.
float rectMask(vec2 p, vec4 r, float feather) {
  vec2 d = max(r.xy - p, p - r.zw);
  return 1.0 - smoothstep(0.0, feather, max(d.x, d.y));
}

void main() {
  vec2 px = gl_FragCoord.xy;
  float minDim = min(uRes.x, uRes.y);
  float k = 2.4 / minDim;
  vec2 p = px * k;

  // Pointer: swirl the noise around the pointer and push it along the pointer velocity.
  vec2 d = px - uPointer;
  float w = exp(-dot(d, d) / (uRadius * uRadius)) * uForce;
  float angle = w * 1.6;
  vec2 pc = uPointer * k;
  vec2 rel = p - pc;
  p = pc + mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * rel;
  p -= uSwirl * k * w * 6.0;

  // Slow drift, about 0.02 noise units per second.
  float t = uTime * 0.02;
  vec2 q = vec2(fbm(p + vec2(t, 0.0)), fbm(p + vec2(5.2, 1.3) - vec2(0.0, t)));
  float f = fbm(p + 1.6 * q + vec2(t * 0.6, t * 0.4));

  float density = smoothstep(0.32, 0.82, f);
  vec3 col = mix(uColA, uColB, smoothstep(0.25, 0.6, f));
  col = mix(col, uColC, smoothstep(0.58, 0.9, f));

  // Alpha caps: 0.55 near the hero edges, 0.3 inside, 0.3 over the bottle, 0.15 behind the text.
  float edge = min(min(px.x, uRes.x - px.x), min(px.y, uRes.y - px.y)) / minDim;
  float cap = mix(0.3, 0.55, 1.0 - smoothstep(0.0, 0.22, edge));
  cap = min(cap, mix(1.0, 0.3, rectMask(px, uBottle, 40.0 * uScale)));
  cap = min(cap, mix(1.0, 0.15, rectMask(px, uText, 40.0 * uScale)));

  // Buttons are never covered. The boxes already include 16px padding.
  float keep = max(rectMask(px, uKeepA, 24.0 * uScale), rectMask(px, uKeepB, 24.0 * uScale));

  float a = density * cap * (1.0 - keep);
  outColor = vec4(col * a, a);
}
`;
```

- [ ] **Step 6: Run the cap test and look at the shader**

Run: `npx playwright test mist-caps --project=desktop`
Expected: PASS. If `stats.all` is below 0.2 the fog is too faint: tune `smoothstep(0.32, 0.82, f)` and the noise scale `2.4`. If caps fail, fix the shader, not the test.

Then eyeball it: write a throwaway script in the scratchpad that calls `renderMist` with no boxes at 1600 by 1000 and saves `dataUrl` to a PNG, composite it over #FAF6EE and open it. It must read as soft slow fog: no hard edges, no sparkle, low contrast, only the three palette colors. Adjust the constants in the shader until it does, re-running the cap test after every change.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mist-math.ts src/lib/mist-shader.ts scripts/lib tests package.json package-lock.json docs
git commit -m "feat: mist shader with alpha caps and keep-out, plus math helpers and cap test"
```

---

### Task 3: Mist component, static fallback and hero integration

**Files:**
- Create: `src/components/Mist.tsx`, `src/components/MistLayer.tsx`, `scripts/capture-mist.mjs`, `public/mist-static.webp`
- Modify: `src/components/Hero.tsx`, `tests/e2e/budget.spec.ts`
- Test: `tests/e2e/mist.spec.ts`

**Interfaces:**
- Consumes: `vertex`, `fragment`, `MIST_COLORS`, `hexToRgb`, `toCanvasRect`, `createBudget`, `renderMist`.
- Produces: `Mist({ onFail: () => void })` (default export, lazy chunk), `MistLayer()` (named export). `MistLayer` fades the layer in when the intro ends. It listens for the `saka:intro-end` window event and checks whether `html` has the `intro-pending` class when it mounts (Task 4 creates both; until then the class is absent so the mist fades in at once). Hero markers: `data-mist-text` on the headline block, `data-hero-bottle` on the image (exists), hero buttons are the `a.btn` elements.

- [ ] **Step 1: Capture the static fallback image**

`scripts/capture-mist.mjs`:

```js
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { renderMist } from "./lib/mist-harness.ts";

const width = 1600;
const height = 1000;
// Approximate hero regions in canvas pixels, origin bottom left, so the static image has the same caps baked in.
const boxes = {
  bottle: [640, 180, 960, 800],
  text: [440, 700, 1160, 940],
  keepA: [540, 30, 790, 130],
  keepB: [810, 30, 1060, 130],
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");
const { dataUrl } = await renderMist(page, { width, height, time: 40, scale: 1, boxes });
await browser.close();

await sharp(Buffer.from(dataUrl.split(",")[1], "base64")).webp({ quality: 80, alphaQuality: 80 }).toFile("public/mist-static.webp");
console.log("wrote public/mist-static.webp");
```

Run: `node scripts/capture-mist.mjs`. Expected: file written, under 80KB (`ls -l public/mist-static.webp`). If larger, lower `quality`. Open it over a cream background and check it matches the live shader look.

- [ ] **Step 2: Write `Mist.tsx`**

```tsx
"use client";

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";
import { fragment, vertex } from "@/lib/mist-shader";
import { createBudget, hexToRgb, MIST_COLORS, toCanvasRect, type Box } from "@/lib/mist-math";

const ZERO: Box = [0, 0, 0, 0];

export default function Mist({ onFail }: { onFail: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.closest("section");
    if (!canvas || !hero) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const renderer = new Renderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio, 1.5) * 0.5, webgl: 2 });
    const gl = renderer.gl;
    if (!renderer.isWebgl2) return onFail();

    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: [1, 1] },
      uScale: { value: renderer.dpr },
      uColA: { value: hexToRgb(MIST_COLORS[0]) },
      uColB: { value: hexToRgb(MIST_COLORS[1]) },
      uColC: { value: hexToRgb(MIST_COLORS[2]) },
      uPointer: { value: [-1e4, -1e4] },
      uSwirl: { value: [0, 0] },
      uForce: { value: 0 },
      uRadius: { value: 160 * renderer.dpr },
      uKeepA: { value: ZERO },
      uKeepB: { value: ZERO },
      uBottle: { value: ZERO },
      uText: { value: ZERO },
    };
    const program = new Program(gl, { vertex, fragment, uniforms, transparent: true, depthTest: false, depthWrite: false });
    if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) return onFail();
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    // Keep-out boxes, bottle and text, recomputed whenever the hero or its contents change size.
    const measure = () => {
      const box = hero.getBoundingClientRect();
      renderer.setSize(box.width, box.height);
      const scale = renderer.dpr;
      const rectOf = (el: Element | null, pad = 0) => (el ? toCanvasRect(el.getBoundingClientRect(), box, scale, pad) : ZERO);
      const buttons = hero.querySelectorAll("a.btn");
      uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
      uniforms.uKeepA.value = rectOf(buttons[0] ?? null, 16);
      uniforms.uKeepB.value = rectOf(buttons[1] ?? null, 16);
      uniforms.uBottle.value = rectOf(hero.querySelector("[data-hero-bottle]"));
      uniforms.uText.value = rectOf(hero.querySelector("[data-mist-text]"));
    };
    const resize = new ResizeObserver(measure);
    [hero, ...hero.querySelectorAll("[data-hero-bottle], [data-mist-text], a.btn")].forEach((el) => resize.observe(el));
    measure();

    // Pointer: eased toward the target at 0.08 per frame, relaxing over about two seconds after it leaves.
    const target = { x: -1e4, y: -1e4 };
    const current = { x: -1e4, y: -1e4 };
    const swirl = { x: 0, y: 0 };
    let active = false;
    const onMove = (event: PointerEvent) => {
      const box = hero.getBoundingClientRect();
      target.x = (event.clientX - box.left) * renderer.dpr;
      target.y = (box.height - (event.clientY - box.top)) * renderer.dpr;
      if (!active) Object.assign(current, target);
      uniforms.uRadius.value = (event.pointerType === "touch" ? 120 : 160) * renderer.dpr;
      active = true;
    };
    const onLeave = () => {
      active = false;
    };
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    hero.addEventListener("pointerup", onLeave);
    hero.addEventListener("pointercancel", onLeave);

    const tooSlow = createBudget();
    let raf = 0;
    let last = 0;
    let visible = true;
    let running = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = now - last;
      if (coarse && dt < 31) return;
      last = now;
      if (coarse && tooSlow(dt)) {
        stop();
        return onFail();
      }
      const px = current.x;
      const py = current.y;
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      swirl.x += (current.x - px - swirl.x) * 0.2;
      swirl.y += (current.y - py - swirl.y) * 0.2;
      uniforms.uForce.value = active ? uniforms.uForce.value + (1 - uniforms.uForce.value) * 0.1 : uniforms.uForce.value * Math.exp(-dt / 650);
      uniforms.uPointer.value = [current.x, current.y];
      uniforms.uSwirl.value = [swirl.x, swirl.y];
      uniforms.uTime.value = now / 1000;
      renderer.render({ scene: mesh });
    };
    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(hero);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      io.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("pointerup", onLeave);
      hero.removeEventListener("pointercancel", onLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [onFail]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
```

Notes for the implementer: the hero must carry `touch-pan-y` so vertical scroll is never blocked, and no handler may call `preventDefault`. `stop` is a function declaration so `frame` can call it before its definition. Check the installed OGL version's `Renderer` options (`webgl: 2`, `premultipliedAlpha`, `dpr`) and `Program` `transparent` handling against its README and adjust names if they differ. If `new Renderer` throws when WebGL2 is unavailable, wrap it in `try/catch` and call `onFail()`.

- [ ] **Step 3: Write `MistLayer.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const Mist = dynamic(() => import("./Mist"), { ssr: false });

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
    <div ref={layer} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] opacity-0">
      {mode === "webgl" && <Mist onFail={fallBack} />}
      {mode === "static" && <img src="/mist-static.webp" alt="" className="h-full w-full object-cover opacity-40" />}
    </div>
  );
}
```

`next/image` is not used for the static fallback because it is decorative, already optimized, and only shown after a failure. If a lint rule or the team prefers `next/image`, use it with `fill`, `sizes="100vw"` and `alt=""`.

- [ ] **Step 4: Integrate into `Hero.tsx`**

Replace `src/components/Hero.tsx` with the full file below (it keeps the Pass 1 copy and the Pass 3 second button, and adds the light island, the mist layer and the markers):

```tsx
import Image from "next/image";
import Link from "next/link";
import { MistLayer } from "./MistLayer";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="light-island relative isolate flex min-h-[max(640px,calc(100svh-4.5rem))] touch-pan-y flex-col items-center justify-center overflow-hidden px-5 py-10 text-center"
    >
      <div data-intro-hide data-mist-text className="relative z-10 flex flex-col items-center">
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
        className="relative z-0 my-8 h-[40svh] w-auto lg:h-[50svh]"
      />
      <MistLayer />
      <div data-intro-hide className="relative z-10 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn btn-primary">Shop fragrances</Link>
        <a href="#finder" className="btn btn-secondary">Find your scent</a>
      </div>
    </section>
  );
}
```

The mist layer sits at `z-[5]`: above the bottle (z 0) and below the text and buttons (z 10).

- [ ] **Step 5: Exclude the mist chunk from the bundle budget**

In `tests/e2e/budget.spec.ts`, skip any script whose text contains the shader marker: after `const body = await response.body().catch(() => null);` add `if (body && body.toString("utf8").includes("#version 300 es")) return;` before pushing the size. Only the mist chunk contains it.

- [ ] **Step 6: Write the mist e2e spec**

`tests/e2e/mist.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { renderMist } from "../../scripts/lib/mist-harness.ts";
import { toCanvasRect } from "../../src/lib/mist-math.ts";

const VIEWPORTS = [{ width: 360, height: 740 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }];

async function waitForIntroEnd(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains("intro-pending"), undefined, { timeout: 10_000 });
}

test.describe("mist", () => {
  test.skip(({ isMobile }) => isMobile, "Viewports are set explicitly below");

  test("the canvas is decorative, never intercepts input, and sits behind the buttons", async ({ page }) => {
    await page.goto("/");
    await waitForIntroEnd(page);
    const canvas = page.locator("section canvas");
    await expect(canvas).toHaveCount(1);
    await expect(page.locator("[aria-hidden=true]:has(canvas)")).toHaveCount(1);
    expect(await canvas.evaluate((el) => getComputedStyle(el.parentElement as HTMLElement).pointerEvents)).toBe("none");
    const button = page.getByRole("link", { name: "Shop fragrances" });
    const box = (await button.boundingBox()) as { x: number; y: number; width: number; height: number };
    const topIsButton = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.textContent?.trim(), [box.x + box.width / 2, box.y + box.height / 2]);
    expect(topIsButton?.toLowerCase()).toContain("shop fragrances");
  });

  for (const viewport of VIEWPORTS) {
    test(`keep-out boxes stay clear at ${viewport.width}px wide`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await waitForIntroEnd(page);
      const measured = await page.evaluate(() => {
        const hero = document.querySelector("section") as HTMLElement;
        const rect = (el: Element | null) => (el ? el.getBoundingClientRect().toJSON() : null);
        const buttons = [...hero.querySelectorAll("a.btn")].map(rect);
        return { hero: rect(hero), buttons };
      });
      const scale = 0.5;
      const hero = measured.hero as { left: number; top: number; width: number; height: number };
      const keep = measured.buttons.map((b) => toCanvasRect(b as never, hero, scale, 16));
      const { stats } = await renderMist(page, {
        width: Math.round(hero.width * scale),
        height: Math.round(hero.height * scale),
        scale,
        boxes: { keepA: keep[0], keepB: keep[1] },
      });
      expect(stats.keepA).toBeLessThanOrEqual(1 / 255);
      expect(stats.keepB).toBeLessThanOrEqual(1 / 255);
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

  test("without WebGL2 the static image appears and no error text is shown", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        return type === "webgl2" || type === "webgl" ? null : (original as Function).call(this, type, ...args);
      } as typeof original;
    });
    await page.goto("/");
    await waitForIntroEnd(page);
    await expect(page.locator('section img[src="/mist-static.webp"]')).toBeVisible();
    await expect(page.getByText(/webgl|error|not supported/i)).toHaveCount(0);
  });

  test("the hero never blocks vertical scrolling", async ({ page }) => {
    await page.goto("/");
    await waitForIntroEnd(page);
    expect(await page.locator("section").first().evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-y");
  });
});
```

The intro does not exist until Task 4, so `waitForIntroEnd` resolves at once. These tests must still pass after Task 4.

- [ ] **Step 7: Run, look, commit**

Run: `npm run typecheck && npm run check && npm run test:e2e -- mist mist-caps budget`
Expected: PASS. Open `http://localhost:3000` in a real browser: move the pointer over the hero and watch the mist swirl and relax, check the buttons stay clear, resize the window and confirm the keep-out follows, scroll and confirm nothing moves with scroll. On a phone (same Wi-Fi, `npm run dev -- -H 0.0.0.0`), drag a finger over the hero and confirm the page still scrolls vertically.

```bash
git add src scripts public tests
git commit -m "feat: ogl mist with pointer reaction, keep-out, budget guard and static fallback"
```

---

### Task 4: The intro

**Files:**
- Create: `src/components/Intro.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/components/Header.tsx`, `src/app/(home)/page.tsx`
- Test: `tests/e2e/intro.spec.ts`

**Interfaces:**
- Consumes: `gsap`, `useGSAP`, `Logo`, hero markers `[data-hero-bottle]` and `[data-intro-hide]`, frames `/turntable/frame-00.webp` to `frame-23.webp`.
- Produces: `Intro()` client component. Window event `saka:intro-end` (dispatched once, when the overlay is gone and content is revealed). `html.intro-pending` class contract: added by the inline head script, removed by `Intro` or the 6 second failsafe.

- [ ] **Step 1: Run the design and animation skills**

Invoke `ui-ux-pro-max:ui-ux-pro-max` (intro overlay composition, Skip button placement) and load `gsap-skills:gsap-core`, `gsap-skills:gsap-timeline`, `gsap-skills:gsap-react`. Append notes to `docs/design-notes.md`.

- [ ] **Step 2: Add the inline head script and hydration flag in `layout.tsx`**

Inside `<html>` add `suppressHydrationWarning` (the script changes the class before React hydrates), and add a `<head>` as the first child:

```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `try{var d=document.documentElement,l=location;if(l.pathname==="/"&&!l.hash&&!l.search&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("intro-pending");setTimeout(function(){d.classList.remove("intro-pending")},6000)}}catch(e){}`,
    }}
  />
</head>
```

The content is a fixed string with no user input. It adds the class only on a plain hard load of `/` without reduced motion, and the 6 second failsafe always removes it even if hydration never happens.

In `Header.tsx` add `data-intro-hide` to the `<header>` element so the header hides and fades with the hero text.

- [ ] **Step 3: Add the CSS contract to `globals.css`** (unlayered, after the `.light-island` rule)

```css
.intro-overlay { display: none; }
html.intro-pending .intro-overlay { display: block; }
html.intro-pending [data-intro-hide] { opacity: 0; }
```

- [ ] **Step 4: Write `Intro.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Logo } from "./Logo";

const FRAMES = 24;
const PENDING = "intro-pending";
const frameUrl = (i: number) => `/turntable/frame-${String(i).padStart(2, "0")}.webp`;

async function loadBitmap(i: number) {
  const res = await fetch(frameUrl(i));
  if (!res.ok) throw new Error(`frame ${i} failed`);
  return createImageBitmap(await res.blob());
}

export function Intro() {
  const overlay = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
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
        const guarded = [...document.querySelectorAll<HTMLElement>("body > header, body > main, body > footer")];
        const main = document.querySelector("main");
        let bitmaps: ImageBitmap[] | null = null;
        let done = false;
        let bottleTl: gsap.core.Timeline | undefined;

        guarded.forEach((el) => (el.inert = true));
        main?.setAttribute("aria-hidden", "true");
        root.style.overflow = "hidden";
        window.scrollTo({ top: 0, behavior: "instant" });

        const finish = () => {
          if (done) return;
          done = true;
          logoTl.kill();
          bottleTl?.kill();
          bitmaps?.forEach((bitmap) => bitmap.close());
          guarded.forEach((el) => (el.inert = false));
          main?.removeAttribute("aria-hidden");
          root.style.overflow = "";
          const reveal = [...document.querySelectorAll("[data-intro-hide]")];
          gsap.set(reveal, { opacity: 0, y: 12 });
          root.classList.remove(PENDING);
          gsap.to(reveal, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", clearProps: "opacity,transform" });
          window.dispatchEvent(new Event("saka:intro-end"));
        };

        // Frames load during the logo phase. Any failure skips the intro.
        Promise.all(Array.from({ length: FRAMES }, (_, i) => loadBitmap(i)))
          .then((loaded) => {
            if (done) loaded.forEach((bitmap) => bitmap.close());
            else bitmaps = loaded;
          })
          .catch(finish);

        const startBottle = () => {
          const hero = document.querySelector<HTMLElement>("[data-hero-bottle]");
          const el = canvas.current;
          const ctx = el?.getContext("2d");
          if (done || !hero || !el || !ctx) return finish();

          // Frames not ready at 1000ms: skip the spin and crossfade to the hero still.
          if (!bitmaps) {
            bottleTl = gsap.timeline({ onComplete: finish }).to(overlay.current, { opacity: 0, duration: 0.6, ease: "power1.inOut" });
            return;
          }

          const rect = hero.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio, 2);
          Object.assign(el.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
          el.width = Math.round(rect.width * dpr);
          el.height = Math.round(rect.height * dpr);
          const turn = { frame: 0 };
          const draw = () => {
            ctx.clearRect(0, 0, el.width, el.height);
            ctx.drawImage((bitmaps as ImageBitmap[])[Math.floor(turn.frame) % FRAMES], 0, 0, el.width, el.height);
          };
          draw();
          bottleTl = gsap
            .timeline({ onComplete: finish })
            .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, 0)
            .to(turn, { frame: FRAMES, duration: 1.9, ease: "power2.out", onUpdate: draw }, 0)
            .fromTo(el, { y: -18 }, { y: 0, duration: 2, ease: "power2.out" }, 0);
        };

        const logoTl = gsap
          .timeline({ onComplete: startBottle })
          .fromTo(logo.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" })
          .to(logo.current, { duration: 0.3 })
          .to(logo.current, { opacity: 0, duration: 0.35, ease: "power2.in" });

        gsap.to(skip.current, { opacity: 1, duration: 0.3, delay: 0.3, onStart: () => skip.current?.focus() });

        const onKey = (event: KeyboardEvent) => {
          if (event.key === "Escape" || event.key === "Enter") finish();
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", finish);
        return () => {
          window.removeEventListener("keydown", onKey);
          window.removeEventListener("resize", finish);
          finish();
        };
      });
    },
    { scope: overlay },
  );

  return (
    <div ref={overlay} className="intro-overlay light-island fixed inset-0 z-[100]">
      <div ref={logo} className="absolute inset-0 grid place-items-center opacity-0">
        <Logo className="h-auto w-[220px] md:w-[320px]" />
      </div>
      <canvas ref={canvas} aria-hidden="true" className="absolute opacity-0" />
      <button ref={skip} type="button" className="absolute bottom-8 left-1/2 min-h-11 -translate-x-1/2 px-4 font-display text-[13px] font-medium text-muted opacity-0">
        Skip
      </button>
    </div>
  );
}
```

Implementation notes:
- `logoTl` is a `const` declared after `finish` and `startBottle` use it. That is fine at runtime because both only execute after it is assigned, but TypeScript may complain about use before assignment. If it does, declare `let logoTl: gsap.core.Timeline;` at the top of the callback and assign it later.
- The resize listener uses `finish` directly. `finish` ignores its event argument.
- The canvas starts at `opacity: 0` by class and is revealed by the first tween, so there is no flash.
- The overlay is rendered on the server but hidden by CSS unless `html.intro-pending` is present, so a visitor without JavaScript, with reduced motion, or after the failsafe never sees it.

- [ ] **Step 5: Render the intro on the home page**

In `src/app/(home)/page.tsx` add `<Intro />` as the first child of the fragment (before `<Hero />`).

- [ ] **Step 6: Write the intro e2e spec**

`tests/e2e/intro.spec.ts` (real timers, tolerant windows, desktop and mobile both run):

```ts
import { expect, test, type Page } from "@playwright/test";

const ended = (page: Page) => page.waitForFunction(() => !document.documentElement.classList.contains("intro-pending"), undefined, { timeout: 10_000 });

test("runs on a hard load of home, locks scroll, makes main inert, and ends in about 3 seconds", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/intro-pending/);
  await expect(page.locator(".intro-overlay")).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await expect(page.locator("main")).toHaveAttribute("aria-hidden", "true");
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
  await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
  await ended(page);
  const seconds = (Date.now() - start) / 1000;
  expect(seconds).toBeGreaterThan(2.6);
  expect(seconds).toBeLessThan(5);
  await expect(page.locator(".intro-overlay")).toBeHidden();
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("the bottle overlay is placed from the real hero image rect", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => {
    const c = document.querySelector<HTMLCanvasElement>(".intro-overlay canvas");
    return !!c && c.style.width !== "";
  });
  const { canvas, hero } = await page.evaluate(() => {
    const c = document.querySelector(".intro-overlay canvas") as HTMLCanvasElement;
    const h = document.querySelector("[data-hero-bottle]") as HTMLElement;
    return { canvas: { left: c.style.left, width: c.style.width, height: c.style.height }, hero: h.getBoundingClientRect().toJSON() };
  });
  expect(parseFloat(canvas.left)).toBeCloseTo(hero.left, 0);
  expect(parseFloat(canvas.width)).toBeCloseTo(hero.width, 0);
  expect(parseFloat(canvas.height)).toBeCloseTo(hero.height, 0);
});

test("Skip, Escape and Enter each jump to the end state", async ({ page }) => {
  for (const act of [(p: Page) => p.getByRole("button", { name: "Skip" }).click(), (p: Page) => p.keyboard.press("Escape"), (p: Page) => p.keyboard.press("Enter")]) {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
    await act(page);
    await ended(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("slow frames crossfade to the hero still instead of waiting", async ({ page }) => {
  await page.route("**/turntable/*.webp", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue();
  });
  const start = Date.now();
  await page.goto("/");
  await ended(page);
  expect((Date.now() - start) / 1000).toBeLessThan(3);
});

test("a failed frame skips the intro at once", async ({ page }) => {
  await page.route("**/turntable/frame-05.webp", (route) => route.abort());
  const start = Date.now();
  await page.goto("/");
  await ended(page);
  expect((Date.now() - start) / 1000).toBeLessThan(2);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the failsafe reveals the page even when JavaScript chunks never load", async ({ page }) => {
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/intro-pending/);
  await page.waitForFunction(() => !document.documentElement.classList.contains("intro-pending"), undefined, { timeout: 8000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("reduced motion has no intro and shows everything at once", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".intro-overlay")).toBeHidden();
  await context.close();
});

test("with JavaScript disabled the content is visible and no overlay shows", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop fragrances" })).toBeVisible();
  await expect(page.locator(".intro-overlay")).toBeHidden();
  await context.close();
});

test("a link with a hash or query skips the intro, and client navigation does not replay it", async ({ page }) => {
  await page.goto("/?vibe=calm");
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
  await page.goto("/");
  await ended(page);
  await page.getByRole("link", { name: "Products" }).first().click();
  await page.getByRole("link", { name: "SAKA Parfum, home" }).click();
  await expect(page.locator("html")).not.toHaveClass(/intro-pending/);
  await expect(page.locator(".intro-overlay")).toBeHidden();
});
```

- [ ] **Step 7: Run, watch it, commit**

Run: `npm run typecheck && npm run check && npm run test:e2e -- intro mist`
Expected: PASS on both projects. Then watch it for real in a browser at desktop and phone width: the logo fades in, holds and fades out, the bottle fades in, spins with an ease-out slowdown, settles a few pixels as it lands, the overlay disappears with no visible jump, header, headline and buttons fade up, then the mist fades in. Check there is no flash of un-hidden content before the overlay, and no layout shift at hand-off. Record a short screen capture and look at the hand-off frame by frame. If the hand-off jumps, compare the canvas rect with the rendered hero image rect and fix the offset (a common cause is a different object-fit or a CSS transform on a parent).

```bash
git add src tests
git commit -m "feat: three second intro with logo, turntable spin and hand-off to the hero"
```

---

### Task 5: Acceptance suite for the whole pass

**Files:**
- Create: `tests/e2e/acceptance.spec.ts`

**Interfaces:** none new.

- [ ] **Step 1: Write the remaining acceptance checks from spec section 12**

`tests/e2e/acceptance.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("the product grid is 3 columns on desktop and 2 on mobile", async ({ page }, info) => {
  await page.goto("/products");
  const columns = await page.locator("main ul").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(info.project.name === "desktop" ? 3 : 2);
});

test("no horizontal scroll at common widths", async ({ page }) => {
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/products");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("headings are ordered: one H1, then H2 and H3 without skipping", async ({ page }) => {
  for (const path of ["/", "/products", "/checkout"]) {
    await page.goto(`${path}?x=1`);
    const levels = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4")].filter((h) => (h as HTMLElement).offsetParent !== null || getComputedStyle(h).position === "fixed").map((h) => Number(h.tagName[1])));
    expect(levels.filter((n) => n === 1)).toHaveLength(1);
    levels.reduce((prev, level) => {
      expect(level - prev).toBeLessThanOrEqual(1);
      return level;
    }, 1);
  }
});

test("every image has alt text", async ({ page }) => {
  await page.goto("/products");
  expect(await page.evaluate(() => [...document.querySelectorAll("img")].filter((img) => !img.hasAttribute("alt")).length)).toBe(0);
});
```

Note `?x=1` makes the request skip the intro (it has a query), so heading checks never run behind the overlay.

- [ ] **Step 2: Run everything and fix**

Run: `npm run typecheck && npm test && npm run check && npm run build && npm run test:e2e`
Expected: all PASS on desktop and mobile projects. Fix real failures in the code.

- [ ] **Step 3: Commit**

```bash
git add tests
git commit -m "test: acceptance checks for grids, scroll, headings and image alt text"
```

---

### Task 6: Performance tuning against the real targets

**Files:**
- Modify: whatever the measurements point at. Record results in `docs/design-notes.md`.

**Interfaces:** none new.

- [ ] **Step 1: Measure**

```bash
npm run build && node tests/e2e-server.mjs &
npm run lighthouse
npm run test:e2e -- budget
```

Then run Lighthouse a second time with the intro skipped (`http://localhost:3100/?x=1`) to separate the cost of the intro from the page. Open one run's JSON or the HTML report and read the `largest-contentful-paint-element` audit.

Expected targets: Performance and Best Practices 90 or higher, Accessibility and SEO 95 or higher, LCP under 2.5s, CLS under 0.1, TBT under 200ms, initial JS under 170KB gzipped (mist chunk excluded), and the LCP element must be the hero image.

- [ ] **Step 2: Fix what is measured, in this order**

1. LCP element is not the hero image: make sure nothing larger paints first. The overlay logo is an SVG (not an LCP candidate), the hero text is `opacity: 0` (ignored), the hero image has `priority` and correct `sizes`.
2. LCP above 2.5s: check the hero image request is high priority and its size is sensible (the 720 by 960 AVIF or WebP should be under 40KB), fonts are `display: swap` with preloaded latin subsets, no render-blocking CSS beyond Tailwind's single file.
3. CLS above 0.1: confirm the hero image has width and height, the header reserves its height, fonts use size-adjusted fallbacks (the `next/font` default), and the reveal animation only changes opacity and transform.
4. TBT or JS size above budget: confirm GSAP core is the only GSAP import (no plugins), `Intro` does not pull OGL, `Mist` is only imported through `next/dynamic`, and check `npm run build` output for the First Load JS of `/`. If still large, find what is in the shared chunk with `npx @next/bundle-analyzer` equivalent or by reading the build manifest, and remove or lazy load the culprit.
5. Mist cost on mid-range phones: test on a real Android phone over USB or Wi-Fi. If it drops frames, lower the noise octaves from 4 to 3, reduce DPR cap, or drop the domain warp pass. The budget guard (45ms frames for 2 seconds) must fall back to the static image when it cannot keep up, confirm this by throttling the CPU 6x in DevTools on a phone-sized viewport.

Never loosen a threshold or remove a test to pass.

- [ ] **Step 3: Record and commit**

Append a "Pass 4 numbers" table to `docs/design-notes.md` with the real scores, LCP, CLS, TBT and JS size (before and after tuning) for both `/` and `/products`, and the device used for the mist check.

```bash
git add -A
git commit -m "perf: tune intro, hero and mist to the lighthouse and bundle targets"
```

---

### Task 7: Final verification and handoff

- [ ] **Step 1: Run every gate from a clean state**

```bash
npm ci && npm run typecheck && npm test && npm run check && npm run build && npm run test:e2e && npm run lighthouse
```

Expected: PASS. Report the real output: test counts, Lighthouse scores per page, bundle size.

- [ ] **Step 2: Deploy a preview and re-run Lighthouse against it**

Push the branch, open the Vercel preview, run `npm run lighthouse -- https://<preview-url>` and keep the numbers. The deployed run with real Sanity images is the one that counts for the targets.

- [ ] **Step 3: Pre-launch manual checks (from spec section 12)**

Record pass or fail for each in `docs/design-notes.md`:

1. One real KHQR payment of the smallest amount: admin message arrives, the Telegram popup button opens the bot, and the bot confirms the order.
2. The intro on a real phone (iOS Safari and Android Chrome): timing, no jump at hand-off, Skip works.
3. Mist on a real phone: finger swirl, vertical scroll never blocked, buttons never covered.
4. Keyboard only pass across home, products, checkout and payment screens.
5. Dark mode pass: cream hero, dark everywhere else, nothing unreadable.
6. When the real bottle videos arrive: run `scripts/extract-frames.mjs`, replace `public/turntable`, regenerate nothing else, confirm frame 0 is the front view and the full turn returns to it, re-run the intro and Lighthouse tests, and re-run `node scripts/capture-mist.mjs` only if the shader changed.

- [ ] **Step 4: Push and request final review**

```bash
git push
```

Invoke `superpowers:requesting-code-review` for the full storefront, then `superpowers:finishing-a-development-branch` once approved.
