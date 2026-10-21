"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";

export function FadeUp({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(el, { opacity: 0, y: 12 });
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            gsap.to(el, { opacity: 1, y: 0, ...MOTION.enter });
            observer.disconnect();
          },
          { threshold: 0.15 },
        );
        observer.observe(el);
        return () => observer.disconnect();
      });
    },
    { scope: ref },
  );

  return <div ref={ref} className={className}>{children}</div>;
}
