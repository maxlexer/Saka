"use client";

import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

// OGL and the shader stay out of the first load.
const Mist = lazy(() => import("./Mist"));

/** The mask keeps the fog low over the floor, fading out above roughly 65 percent of the hero height. */
const MASK = "[mask-image:linear-gradient(to_top,black_30%,transparent_68%)]";
const STILL = "h-full w-full object-cover";

// Decorative. Lazy, so the other theme's still never downloads.
const stills = (
  <>
    <img src="/mist-static.webp" alt="" loading="lazy" className={`${STILL} dark:hidden`} />
    <img src="/mist-static-dark.webp" alt="" loading="lazy" className={`${STILL} hidden dark:block`} />
  </>
);

/**
 * The fog starts as a captured frame of the shader, which costs nothing. The live shader only takes over when a
 * pointer or finger first comes over the hero, in idle time: creating a WebGL context is a long main-thread task,
 * and the mist only reacts to the pointer anyway. Reduced motion and WebGL failures keep the still.
 */
export function MistLayer() {
  const layer = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const fallBack = useCallback(() => setLive(false), []);

  useGSAP(
    () => {
      const el = layer.current;
      const hero = el?.closest("section");
      if (!el || !hero) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Breathes in once the intro has handed over, or at once when there is no intro.
        const fadeIn = () => gsap.to(el, { opacity: 1, duration: 0.8, ease: "power1.out" });
        const wake = () => ("requestIdleCallback" in window ? requestIdleCallback(() => setLive(true)) : setTimeout(() => setLive(true), 200));
        // Fires for a mouse entering and for a finger touching down.
        hero.addEventListener("pointerover", wake, { once: true, passive: true });
        if (document.documentElement.classList.contains("intro-pending")) window.addEventListener("saka:intro-end", fadeIn, { once: true });
        else fadeIn();
        return () => {
          hero.removeEventListener("pointerover", wake);
          window.removeEventListener("saka:intro-end", fadeIn);
        };
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { opacity: 1 });
      });
    },
    { scope: layer },
  );

  return (
    <div ref={layer} aria-hidden="true" className={`pointer-events-none absolute inset-0 z-[5] opacity-0 ${MASK}`}>
      {live ? (
        <Suspense fallback={stills}>
          <Mist onFail={fallBack} />
        </Suspense>
      ) : (
        stills
      )}
    </div>
  );
}
