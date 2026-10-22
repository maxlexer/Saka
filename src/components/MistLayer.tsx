"use client";

import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

// OGL and the shader stay out of the first load.
const Mist = lazy(() => import("./Mist"));

/** The smoke itself lies on the floor; the mask is a backstop, fading anything stirred up out above 75 percent of the hero height. */
const MASK = "[mask-image:linear-gradient(to_top,black_50%,transparent_80%)]";
// The stills are painted on the floor picture's frame and cropped the same way, so their smoke rests on its floor line.
const STILL = "h-full w-full object-cover object-[50%_var(--lift)]";
const FADE = { duration: 0.8, ease: "power1.inOut" };

/**
 * The smoke starts as a captured frame of the shader, which costs nothing. The live shader only takes over when a
 * pointer or finger first comes over the hero, in idle time: creating a WebGL context is a long main-thread task,
 * and the smoke only reacts to the pointer anyway. Reduced motion and WebGL failures keep the still.
 */
export function MistLayer() {
  const layer = useRef<HTMLDivElement>(null);
  const still = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  // The live shader only starts under the no-preference branch below, so these fades never run with reduced motion.
  // The canvas fades in over the still once its first frame is drawn, so the swap never blanks or jumps.
  const ready = useCallback(() => {
    gsap.to(canvas.current, { opacity: 1, ...FADE });
    gsap.to(still.current, { opacity: 0, ...FADE });
  }, []);
  const fallBack = useCallback(() => {
    gsap.set(still.current, { clearProps: "opacity" });
    setLive(false);
  }, []);

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
      {/* Decorative. Lazy, so the other theme's still never downloads. */}
      <div ref={still} className="absolute inset-0">
        {/* Portrait screens get a still baked for the phone layout, or the crop keeps only the thin middle of the wide one. */}
        {["", "-dark"].map((theme) => (
          <picture key={theme}>
            <source media="(orientation: portrait)" srcSet={`/mist-static-tall${theme}.webp`} />
            <img src={`/mist-static${theme}.webp`} alt="" loading="lazy" className={`${STILL} ${theme ? "hidden dark:block" : "dark:hidden"}`} />
          </picture>
        ))}
      </div>
      {live && (
        <div ref={canvas} className="absolute inset-0 opacity-0">
          <Suspense fallback={null}>
            <Mist onReady={ready} onFail={fallBack} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
