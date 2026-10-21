"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

/** Shared timings so every transition feels the same. No back, elastic or bounce eases anywhere. */
export const MOTION = {
  enter: { duration: 0.7, ease: "power3.out" },
  exit: { duration: 0.5, ease: "power2.inOut" },
  glide: { duration: 0.8, ease: "power3.inOut" },
} as const;
