"use client";

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";
import { createBudget, hexToRgb, MIST_COLORS, MIST_COLORS_DARK, MIST_STILL_TIME, toCanvasRect, type Box } from "@/lib/mist-math";
import { fragment, vertex } from "@/lib/mist-shader";

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
      uPointer: { value: [-1e4, -1e4] },
      uSwirl: { value: [0, 0] },
      uForce: { value: 0 },
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

    // Pointer: eased toward the target at 0.08 per frame, relaxing over about two seconds after it leaves.
    // Listeners are passive and never prevent default, so a finger on the hero still scrolls the page.
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
    const born = performance.now();
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
      const px = current.x;
      const py = current.y;
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      swirl.x += (current.x - px - swirl.x) * 0.2;
      swirl.y += (current.y - py - swirl.y) * 0.2;
      uniforms.uForce.value = active ? uniforms.uForce.value + (1 - uniforms.uForce.value) * 0.1 : uniforms.uForce.value * Math.exp(-dt / 650);
      uniforms.uPointer.value = [current.x, current.y];
      uniforms.uSwirl.value = [swirl.x, swirl.y];
      uniforms.uTime.value = MIST_STILL_TIME + (now - born) / 1000;
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
