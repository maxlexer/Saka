"use client";

import { Mesh, Program, RenderTarget, Renderer, Texture, Triangle, type OGLRenderingContext } from "ogl";
import { useEffect, useRef } from "react";
import { createBudget, hexToRgb, MIST_COLORS, MIST_COLORS_DARK, MIST_STILL_TIME, toCanvasRect, type Box } from "@/lib/mist-math";
import * as shader from "@/lib/mist-shader";

const ZERO: Box = [0, 0, 0, 0];
const palette = () => (document.documentElement.dataset.theme === "dark" ? MIST_COLORS_DARK : MIST_COLORS).map(hexToRgb);

// Sizes in CSS pixels. Air is simulated on a coarse grid, the smoke it carries on a finer one.
const AIR_CELL = 8;
const SMOKE_CELL = 3;
const JACOBI = 24;
// Heavy, still air: a push dies out over about a second (speed falls by e every 1 / DRAG seconds).
const DRAG = 1.8;
// How fast cell-sized ripples in the air even out, per second.
const VISCOSITY = 15;
// The pointer drags the air near it to this share of its own speed, within a gaussian of this radius.
const PUSH = 0.4;
const RADIUS = { mouse: 84, touch: 64 };
const MAX_SPEED = 2400;
// Vorticity confinement: keeps curls alive that the coarse air grid would smear out.
const SWIRL = 1.2;
// The resting sway: its strength (air cells per second squared) and the size of its waves (air cells).
const SWAY = 0.8;
const SWAY_SIZE = 48;
// Seconds for stirred smoke to settle back towards its resting shape. Slow enough to never read as smoke appearing.
const SETTLE = 45;
// How fast sharp bends in the smoke map even out, per second.
const SOFT = 4;

const target = (gl: OGLRenderingContext) =>
  new RenderTarget(gl, { width: 1, height: 1, depth: false, type: WebGL2RenderingContext.HALF_FLOAT, internalFormat: WebGL2RenderingContext.RGBA16F });

// Read one, draw into the other, then swap.
function pair(gl: OGLRenderingContext) {
  const p = { read: target(gl), write: target(gl), swap: () => ([p.read, p.write] = [p.write, p.read]) };
  return p;
}

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
      renderer = new Renderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false, depth: false, autoClear: false, dpr: Math.min(window.devicePixelRatio, 1.5) * 0.5, webgl: 2 });
    } catch {
      return onFail();
    }
    const gl = renderer.gl;
    // OGL falls back to WebGL1 by itself, so a refused context is released before giving up.
    const giveUp = () => {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      onFail();
    };
    // The simulation needs half float targets it can draw into.
    if (!renderer.isWebgl2 || !gl.getExtension("EXT_color_buffer_float")) return giveUp();

    const triangle = new Triangle(gl);
    const pass = <U extends Record<string, { value: unknown }>>(fragment: string, uniforms: U) => {
      const program = new Program(gl, { vertex: shader.vertex, fragment, uniforms, depthTest: false, depthWrite: false });
      return { mesh: new Mesh(gl, { geometry: triangle, program }), uniforms, ok: gl.getProgramParameter(program.program, gl.LINK_STATUS) as boolean };
    };

    const air = { texel: { value: [1, 1] } };
    const smoke = { texel: { value: [1, 1] } };
    const time = { value: MIST_STILL_TIME };
    const dt = { value: 0 };
    const bottle = { tex: { value: new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR }) }, box: { value: ZERO } };
    const solid = { uBottleTex: bottle.tex, uBottleBox: bottle.box };

    const vel = pair(gl);
    const pressure = pair(gl);
    const map = pair(gl);
    const curlTarget = target(gl);
    const divTarget = target(gl);
    const moved = target(gl);

    // Shared by both smoke map passes, so one update per frame feeds them.
    const carried = { uTexel: smoke.texel, uSimTexel: air.texel, uVel: { value: vel.read.texture }, uMap: { value: map.read.texture }, uDt: dt };
    const [colA, colB, colC] = palette();
    const passes = {
      advect: pass(shader.advect, { uTexel: air.texel, uVel: { value: vel.read.texture }, uDt: dt, uKeep: { value: 1 }, uThick: { value: 0 } }),
      curl: pass(shader.curl, { uTexel: air.texel, uVel: { value: vel.read.texture } }),
      force: pass(shader.force(SWIRL, SWAY, SWAY_SIZE), {
        ...solid,
        uTexel: air.texel,
        uVel: { value: vel.read.texture },
        uCurl: { value: curlTarget.texture },
        uDt: dt,
        uTime: time,
        uStroke: { value: ZERO },
        uPush: { value: [0, 0] },
        uRadius: { value: 0 },
      }),
      divergence: pass(shader.divergence, { ...solid, uTexel: air.texel, uVel: { value: vel.read.texture } }),
      jacobi: pass(shader.jacobi, { ...solid, uTexel: air.texel, uP: { value: pressure.read.texture }, uDiv: { value: divTarget.texture } }),
      gradient: pass(shader.gradient, { ...solid, uTexel: air.texel, uP: { value: pressure.read.texture }, uVel: { value: vel.read.texture } }),
      carry: pass(shader.carry, carried),
      sharpen: pass(shader.sharpen, { ...solid, ...carried, uMoved: { value: moved.texture }, uSoft: { value: 0 }, uSettle: { value: 0 } }),
      display: pass(shader.display(false), {
        uRes: { value: [1, 1] },
        uScale: { value: renderer.dpr },
        uColA: { value: colA },
        uColB: { value: colB },
        uColC: { value: colC },
        // The live smoke rests in the shape of the still, so swapping one for the other never jumps.
        uTime: { value: MIST_STILL_TIME },
        uMap: { value: map.read.texture },
        uKeepA: { value: ZERO },
        uBottle: { value: ZERO },
        uText: { value: ZERO },
      }),
    };
    if (!Object.values(passes).every((p) => p.ok)) return giveUp();
    const draw = (p: { mesh: Mesh }, target?: RenderTarget) => renderer.render({ scene: p.mesh, target });

    // The bottle's own picture is the solid the air flows around. decode() settles at once when it already loaded.
    const bottleImg = hero.querySelector<HTMLImageElement>("[data-hero-bottle] img");
    bottleImg?.decode().then(() => (bottle.tex.value.image = bottleImg), () => {});

    // Keep-outs, bottle and text, recomputed whenever the hero or its contents change size. A new hero size restarts
    // the smoke from rest: resized targets come back zero filled, which is still air and the smoke at rest.
    const measure = () => {
      const box = hero.getBoundingClientRect();
      renderer.setSize(box.width, box.height);
      const rectOf = (el: Element | null, pad = 0) => (el ? toCanvasRect(el.getBoundingClientRect(), box, renderer.dpr, pad) : ZERO);
      const d = passes.display.uniforms;
      d.uRes.value = [gl.canvas.width, gl.canvas.height];
      d.uKeepA.value = rectOf(hero.querySelector("a.btn"), 16);
      d.uBottle.value = rectOf(hero.querySelector("[data-hero-bottle]"));
      d.uText.value = rectOf(hero.querySelector("[data-mist-text]"));
      const [x0, y0, x1, y1] = rectOf(bottleImg);
      bottle.box.value = [x0 / gl.canvas.width, y0 / gl.canvas.height, x1 / gl.canvas.width, y1 / gl.canvas.height];

      const airSize = [Math.ceil(box.width / AIR_CELL), Math.ceil(box.height / AIR_CELL)];
      const smokeSize = [Math.ceil(box.width / SMOKE_CELL), Math.ceil(box.height / SMOKE_CELL)];
      if (smokeSize[0] === moved.width && smokeSize[1] === moved.height) return;
      for (const t of [vel.read, vel.write, pressure.read, pressure.write, curlTarget, divTarget]) t.setSize(airSize[0], airSize[1]);
      for (const t of [map.read, map.write, moved]) t.setSize(smokeSize[0], smokeSize[1]);
      air.texel.value = [1 / airSize[0], 1 / airSize[1]];
      smoke.texel.value = [1 / smokeSize[0], 1 / smokeSize[1]];
    };
    const resize = new ResizeObserver(measure);
    [hero, ...hero.querySelectorAll("[data-hero-bottle], [data-mist-text], a.btn")].forEach((el) => resize.observe(el));

    // The palette follows the header theme switch without a reload.
    const themeWatch = new MutationObserver(() => {
      const d = passes.display.uniforms;
      [d.uColA.value, d.uColB.value, d.uColC.value] = palette();
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Pointer: the air near its path is dragged along at its speed, measured between event timestamps so uneven
    // event rates never make the push stutter. Standing still pushes nothing. Listeners are passive and never prevent
    // default, so a finger on the hero still scrolls the page.
    type Point = { x: number; y: number; t: number };
    let pointer: Point | null = null;
    let from: Point | null = null;
    let radius = RADIUS.mouse;
    const push = [0, 0];
    const onMove = (event: PointerEvent) => {
      const box = hero.getBoundingClientRect();
      pointer = { x: (event.clientX - box.left) / AIR_CELL, y: (box.height - (event.clientY - box.top)) / AIR_CELL, t: event.timeStamp };
      from ??= pointer;
      radius = event.pointerType === "touch" ? RADIUS.touch : RADIUS.mouse;
    };
    const onLeave = () => {
      pointer = from = null;
    };
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    hero.addEventListener("pointerup", onLeave);
    hero.addEventListener("pointercancel", onLeave);

    const step = (seconds: number) => {
      dt.value = seconds;
      const f = passes.force.uniforms;
      f.uRadius.value = 0;
      if (pointer && from && pointer.t > from.t) {
        const elapsed = Math.max((pointer.t - from.t) / 1000, 1 / 240);
        const vx = (pointer.x - from.x) / elapsed;
        const vy = (pointer.y - from.y) / elapsed;
        const cap = Math.min(1, MAX_SPEED / AIR_CELL / Math.max(Math.hypot(vx, vy), 1e-6));
        // A light smoothing of the measured speed, so a jittery mouse still pushes evenly.
        push[0] += (vx * cap * PUSH - push[0]) * 0.5;
        push[1] += (vy * cap * PUSH - push[1]) * 0.5;
        f.uStroke.value = [from.x, from.y, pointer.x, pointer.y];
        f.uPush.value = push;
        f.uRadius.value = radius / AIR_CELL;
        from = pointer;
      } else push[0] = push[1] = 0;

      passes.advect.uniforms.uVel.value = vel.read.texture;
      passes.advect.uniforms.uKeep.value = Math.exp(-DRAG * seconds);
      passes.advect.uniforms.uThick.value = 1 - Math.exp(-VISCOSITY * seconds);
      draw(passes.advect, vel.write);
      vel.swap();
      passes.curl.uniforms.uVel.value = vel.read.texture;
      draw(passes.curl, curlTarget);
      f.uVel.value = vel.read.texture;
      draw(passes.force, vel.write);
      vel.swap();
      passes.divergence.uniforms.uVel.value = vel.read.texture;
      draw(passes.divergence, divTarget);
      // Last frame's pressure is a good first guess, so the solve settles in few steps.
      for (let i = 0; i < JACOBI; i++) {
        passes.jacobi.uniforms.uP.value = pressure.read.texture;
        draw(passes.jacobi, pressure.write);
        pressure.swap();
      }
      passes.gradient.uniforms.uP.value = pressure.read.texture;
      passes.gradient.uniforms.uVel.value = vel.read.texture;
      draw(passes.gradient, vel.write);
      vel.swap();
      carried.uVel.value = vel.read.texture;
      carried.uMap.value = map.read.texture;
      draw(passes.carry, moved);
      passes.sharpen.uniforms.uSoft.value = 1 - Math.exp(-SOFT * seconds);
      passes.sharpen.uniforms.uSettle.value = 1 - Math.exp(-seconds / SETTLE);
      draw(passes.sharpen, map.write);
      map.swap();
      passes.display.uniforms.uMap.value = map.read.texture;
      draw(passes.display);
    };

    const tooSlow = createBudget();
    let raf = 0;
    let last = 0;
    let visible = true;
    let running = false;
    let drawn = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const ms = now - last;
      // 30fps on touch devices.
      if (coarse && ms < 31) return;
      last = now;
      if (coarse && tooSlow(ms)) {
        stop();
        return onFail();
      }
      time.value += ms / 1000;
      // A long stall (a dropped tab, a slow frame) never becomes one giant leap.
      step(Math.min(ms / 1000, 1 / 30));
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
    measure();
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
