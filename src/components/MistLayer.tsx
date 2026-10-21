"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

// OGL and the shader stay out of the first load. The chunk is requested once the page has mounted.
const Mist = lazy(() => import("./Mist"));

/** The mask keeps the fog low over the floor, fading out above roughly 65 percent of the hero height. */
const MASK = "[mask-image:linear-gradient(to_top,black_30%,transparent_68%)]";
const STILL = "h-full w-full object-cover opacity-40";

export function MistLayer() {
  const layer = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"webgl" | "static" | null>(null);
  const fallBack = useCallback(() => setMode("static"), []);

  useEffect(() => {
    setMode(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "static" : "webgl");
  }, []);

  // Breathes in once the intro has handed over, or at once when there is no intro.
  useGSAP(
    () => {
      const el = layer.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const fadeIn = () => gsap.to(el, { opacity: 1, duration: 0.8, ease: "power1.out" });
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
      {mode === "webgl" && (
        <Suspense fallback={null}>
          <Mist onFail={fallBack} />
        </Suspense>
      )}
      {/* Decorative, shown only after a failure or under reduced motion. Lazy, so the hidden theme's image never downloads. */}
      {mode === "static" && (
        <>
          <img src="/mist-static.webp" alt="" loading="lazy" className={`${STILL} dark:hidden`} />
          <img src="/mist-static-dark.webp" alt="" loading="lazy" className={`${STILL} hidden dark:block`} />
        </>
      )}
    </div>
  );
}
