"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import { preload } from "react-dom";
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
  priority?: boolean;
  float?: boolean;
  /** A pulsing placeholder until the still arrives. Off for the hero, which has its floor scene behind it. */
  skeleton?: boolean;
  /** Standing on the floor: the shadow sits tight under the base instead of below a floating bottle. */
  grounded?: boolean;
  className?: string;
  ref?: Ref<SpinHandle>;
};

export function SpinBottle({ dir, alt, priority = false, float = false, skeleton = true, grounded = false, className = "", ref }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const still = useRef<HTMLImageElement>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const placeholder = useRef<HTMLDivElement>(null);
  // The still paints over the placeholder in the same frame, so it can simply go.
  const settle = () => placeholder.current?.setAttribute("hidden", "");
  const turning = useRef(false);
  const src = `${dir}/spin.webp`;
  const stillSrc = `${dir}/still.webp`;
  if (priority) preload(stillSrc, { as: "image", fetchPriority: "high" });

  const { contextSafe } = useGSAP(
    () => {
      // Loaded before hydration, so onLoad already fired unseen. Not `complete`: Chromium sets it on lazy images still waiting.
      if (still.current?.naturalWidth) settle();
      if (!float) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const period = gsap.utils.random(3.2, 4);
        const tl = gsap
          .timeline({ paused: true, repeat: -1, yoyo: true, defaults: { duration: period / 2, ease: "sine.inOut" } })
          .to(body.current, { y: -4 }, 0)
          .to(shadow.current, { scaleX: 0.86, opacity: 0.7 }, 0);
        tl.totalTime(gsap.utils.random(0, period));
        // Starts paused, so bottles below the fold never animate until they scroll into view.
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
      // The still returns fully opaque under the last frame before the sprite fades, so the bottle never thins out mid swap.
      .set(still.current, { opacity: 1 })
      .to(layer, { opacity: 0, duration: 0.35, ease: "power1.out" });
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
      {/* Painted first, so a grounded shadow tucks under the base: a dark contact line inside a soft pool. The placeholder art's base sits at 16 percent of this box. */}
      <div
        ref={shadow}
        data-shadow
        aria-hidden="true"
        className={`absolute inset-x-0 mx-auto rounded-[50%] ${grounded ? "bottom-[15.2%] h-[2%] w-[37%] bg-[var(--ground)] shadow-[0_0_24px_10px_var(--contact)] blur-[2px]" : "bottom-[6%] h-[4%] w-[44%] bg-[var(--contact)] blur-[6px]"}`}
      />
      {/* Centered by layout, not by CSS translate: GSAP folds `translate` into its own transform and can freeze a wrong value while the box is hidden. */}
      <div className="absolute inset-x-0 bottom-[9%] flex h-[89%] justify-center">
        <div ref={body} className="relative aspect-[4/5] h-full">
          {/* A plain img served as written by scripts/frames.ts: a card, the modal and the hero share one cached file, a glide never waits on a new size, and no image component ships to the browser. */}
          {skeleton && <div ref={placeholder} aria-hidden="true" className="skeleton absolute inset-x-[30%] inset-y-[6%] rounded-card bg-border/60" />}
          <img
            ref={still}
            onLoad={skeleton ? settle : undefined}
            src={stillSrc}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="absolute inset-0 size-full object-contain"
          />
          <div ref={sprite} aria-hidden="true" className="absolute inset-0 bg-no-repeat opacity-0 [background-size:600%_600%]" />
        </div>
      </div>
    </div>
  );
}
