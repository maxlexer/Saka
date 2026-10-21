"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SpinBottle, type SpinHandle } from "./SpinBottle";

const PENDING = "intro-pending";

/** The logo arrives rendered on the server, so its paths ship as HTML rather than as code. */
export function Intro({ logo }: { logo: ReactNode }) {
  const overlay = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bottle = useRef<SpinHandle>(null);
  const skip = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains(PENDING)) return;
    const end = () => {
      root.classList.remove(PENDING);
      window.dispatchEvent(new Event("saka:intro-end"));
    };
    let live = true;
    let stop: (() => void) | undefined;
    // The timeline is its own chunk, off the first load. The overlay below is server HTML and covers the page until it runs.
    import("@/lib/intro").then(({ playIntro }) => {
      if (live) stop = playIntro({ overlay, backdrop, mark, stage, skip, bottle }, end);
    }, end);
    return () => {
      live = false;
      stop?.();
    };
  }, []);

  return (
    <div ref={overlay} className="intro-overlay fixed inset-0 z-[100]">
      <div ref={backdrop} className="absolute inset-0 bg-bg" />
      <div ref={mark} className="absolute inset-0 grid place-items-center opacity-0">
        {logo}
      </div>
      <div ref={stage} aria-hidden="true" className="absolute opacity-0">
        <SpinBottle ref={bottle} dir="/hero" alt="" className="h-full" />
      </div>
      <button ref={skip} type="button" className="absolute inset-x-0 bottom-8 mx-auto min-h-11 w-fit px-4 font-display text-[13px] font-medium text-muted opacity-0">
        Skip
      </button>
    </div>
  );
}
