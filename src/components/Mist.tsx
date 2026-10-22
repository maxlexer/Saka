"use client";

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";
import { createBudget, hexToRgb, MIST_COLORS, MIST_COLORS_DARK, MIST_STILL_TIME, toCanvasRect, type Box } from "@/lib/mist-math";
import { fragment, PUFFS, vertex } from "@/lib/mist-shader";

const ZERO: Box = [0, 0, 0, 0];
const palette = () => (document.documentElement.dataset.theme === "dark" ? MIST_COLORS_DARK : MIST_COLORS).map(hexToRgb);

export default function Mist({ onReady, onFail }: { onReady: () => void; onFail: () => void }) {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = holder.current?.closest("section");
    if (!holder.current || !hero) return;
    // A fresh canvas per mount: the cleanup loses its context, and a remount on the same canvas would get that dead context back.
    const canvas = document.createElement("canvas");
    canvas.className = "block size-full";
    holder.current.append(canvas);

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let renderer: Renderer;
    try {
      // Half resolution, device pixel ratio capped at 1.5.
      renderer = new Renderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio, 1.5) * 0.5, webgl: 2 });
    } catch {
      return onFail();
    }
    const gl = renderer.gl;
    // OGL falls back to WebGL1 by itself, so a refused context is released before giving up.
    const giveUp = () => {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      onFail();
    };
    if (!renderer.isWebgl2) return giveUp();

    const [colA, colB, colC] = palette();
    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: [1, 1] },
      uScale: { value: renderer.dpr },
      uColA: { value: colA },
      uColB: { value: colB },
      uColC: { value: colC },
      // Plain arrays: OGL only resolves array uniforms from them. Unborn puffs sit far in the past.
      uPuffs: { value: Array<number>(PUFFS * 4).fill(0) },
      uBorn: { value: Array<number>(PUFFS).fill(-1e4) },
      uRadius: { value: 160 * renderer.dpr },
      uKeepA: { value: ZERO },
      uBottle: { value: ZERO },
      uText: { value: ZERO },
    };
    const program = new Program(gl, { vertex, fragment, uniforms, transparent: true, depthTest: false, depthWrite: false });
    if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) return giveUp();
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    // Keep-out box, bottle and text, recomputed whenever the hero or its contents change size.
    const measure = () => {
      const box = hero.getBoundingClientRect();
      renderer.setSize(box.width, box.height);
      const rectOf = (el: Element | null, pad = 0) => (el ? toCanvasRect(el.getBoundingClientRect(), box, renderer.dpr, pad) : ZERO);
      uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
      uniforms.uKeepA.value = rectOf(hero.querySelector("a.btn"), 16);
      uniforms.uBottle.value = rectOf(hero.querySelector("[data-hero-bottle]"));
      uniforms.uText.value = rectOf(hero.querySelector("[data-mist-text]"));
    };
    const resize = new ResizeObserver(measure);
    [hero, ...hero.querySelectorAll("[data-hero-bottle], [data-mist-text], a.btn")].forEach((el) => resize.observe(el));
    measure();

    // The palette follows the header theme switch without a reload.
    const themeWatch = new MutationObserver(() => {
      const [a, b, c] = palette();
      uniforms.uColA.value = a;
      uniforms.uColB.value = b;
      uniforms.uColC.value = c;
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Pointer: a weak wind. Moving drops a puff every third of a radius, stronger the faster it moves.
    // Standing still drops nothing, so the smoke rolls back in. Listeners are passive and never prevent default,
    // so a finger on the hero still scrolls the page.
    const born = performance.now();
    const clock = (now: number) => MIST_STILL_TIME + (now - born) / 1000;
    let anchor: { x: number; y: number; t: number } | null = null;
    let next = 0;
    const onMove = (event: PointerEvent) => {
      const box = hero.getBoundingClientRect();
      const x = (event.clientX - box.left) * renderer.dpr;
      const y = (box.height - (event.clientY - box.top)) * renderer.dpr;
      const now = performance.now();
      uniforms.uRadius.value = (event.pointerType === "touch" ? 120 : 160) * renderer.dpr;
      if (!anchor) return void (anchor = { x, y, t: now });
      const dx = x - anchor.x;
      const dy = y - anchor.y;
      const dist = Math.hypot(dx, dy);
      if (dist < uniforms.uRadius.value / 3) return;
      // CSS pixels per second: a slow drift barely stirs it, a quick sweep reaches full strength.
      const speed = (dist / renderer.dpr / Math.max(now - anchor.t, 8)) * 1000;
      const strength = Math.min(1, 0.25 + speed / 1600) / dist;
      uniforms.uPuffs.value.splice(next * 4, 4, x, y, dx * strength, dy * strength);
      uniforms.uBorn.value[next] = clock(now);
      next = (next + 1) % PUFFS;
      anchor = { x, y, t: now };
    };
    const onLeave = () => {
      anchor = null;
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
    let drawn = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = now - last;
      // 30fps on touch devices.
      if (coarse && dt < 31) return;
      last = now;
      if (coarse && tooSlow(dt)) {
        stop();
        return onFail();
      }
      uniforms.uTime.value = clock(now);
      renderer.render({ scene: mesh });
      if (!drawn) {
        drawn = true;
        onReady();
      }
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

    // Paused off screen and in hidden tabs.
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
      themeWatch.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("pointerup", onLeave);
      hero.removeEventListener("pointercancel", onLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [onReady, onFail]);

  return <div ref={holder} className="absolute inset-0" />;
}
