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
  priority?: boolean;
  float?: boolean;
  className?: string;
  ref?: Ref<SpinHandle>;
};

export function SpinBottle({ dir, alt, priority = false, float = false, className = "", ref }: Props) {
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
      {/* Centered by layout, not by CSS translate: GSAP folds `translate` into its own transform and can freeze a wrong value while the box is hidden. */}
      <div className="absolute inset-x-0 bottom-[9%] flex h-[89%] justify-center">
        <div ref={body} className="relative aspect-[4/5] h-full">
          {/* Served as written by scripts/frames.ts, so a card, the modal and the hero share one cached file and a glide never waits on a new size. */}
          <Image ref={still} src={`${dir}/still.webp`} alt={alt} fill priority={priority} unoptimized className="object-contain" />
          <div ref={sprite} aria-hidden="true" className="absolute inset-0 bg-no-repeat opacity-0 [background-size:600%_600%]" />
        </div>
      </div>
      <div ref={shadow} aria-hidden="true" className="absolute inset-x-0 bottom-[6%] mx-auto h-[4%] w-[44%] rounded-[50%] bg-[var(--contact)] blur-[6px]" />
    </div>
  );
}
