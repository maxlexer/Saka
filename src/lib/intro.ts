import type { RefObject } from "react";
import type { SpinHandle } from "@/components/SpinBottle";
import { gsap, MOTION } from "./gsap";
import { INTRO_FAILSAFE } from "./head-script";

type Ref<T> = RefObject<T | null>;
export type IntroParts = { overlay: Ref<HTMLDivElement>; backdrop: Ref<HTMLDivElement>; mark: Ref<HTMLDivElement>; stage: Ref<HTMLDivElement>; skip: Ref<HTMLButtonElement>; bottle: Ref<SpinHandle> };

/** Plays the intro over the server-rendered overlay. `end` reveals the page. Returns the cleanup. */
export function playIntro({ overlay, backdrop, mark, stage, skip, bottle }: IntroParts, end: () => void) {
  // From here the timeline owns the reveal, so the head script's failsafe can no longer cut it mid-play.
  clearTimeout((window as unknown as Record<string, number>)[INTRO_FAILSAFE]);
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: reduce)", end);
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const root = document.documentElement;
    const hero = document.querySelector<HTMLElement>("[data-hero-bottle]");
    const el = stage.current;
    const shadow = el?.querySelector<HTMLElement>("[data-shadow]");
    if (!hero || !el || !shadow) return end();

    // The overlay lives inside main, so everything around it goes inert instead of main itself.
    const guarded = [...document.querySelectorAll<HTMLElement>("body > .skip-link, body > header, body > footer, main > :not(.intro-overlay)")];
    // Headline, then button, then header.
    const header = document.querySelector<HTMLElement>("body > header");
    const reveal = [...document.querySelectorAll<HTMLElement>("main [data-intro-hide]"), ...(header ? [header] : [])];
    const width = window.innerWidth;
    let done = false;
    let ready = false;
    let revealed = false;

    guarded.forEach((node) => (node.inert = true));
    root.style.overflow = "hidden";
    window.scrollTo({ top: 0, behavior: "instant" });

    // The overlay bottle is the hero bottle's exact size, centered, so the glide is a pure translate.
    const target = hero.getBoundingClientRect();
    const left = (window.innerWidth - target.width) / 2;
    const top = (window.innerHeight - target.height) / 2;
    Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${target.width}px`, height: `${target.height}px` });

    // Inline opacity beats the pending rule, so content fades up while the overlay is still in place.
    const showContent = () => {
      if (revealed) return;
      revealed = true;
      gsap.fromTo(reveal, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.15, ...MOTION.enter, clearProps: "opacity,transform" });
    };

    let tl: gsap.core.Timeline | undefined;
    // Only ever called after the listeners below are attached: by an event, the sprite promise or the timeline.
    const finish = (fade = false) => {
      if (done) return;
      done = true;
      tl?.kill();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      button?.removeEventListener("click", onSkip);
      if (fade) {
        gsap.set(overlay.current, { display: "block" });
        gsap.to(overlay.current, { opacity: 0, duration: 0.4, ease: "power1.out", onComplete: () => void gsap.set(overlay.current, { display: "none" }) });
        gsap.fromTo(hero, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out", clearProps: "opacity" });
      }
      showContent();
      guarded.forEach((node) => (node.inert = false));
      root.style.overflow = "";
      end();
    };

    // The sprite loads during the logo. If it is late the bottle glides without turning. If it fails, skip.
    bottle.current?.preload().then(
      () => (ready = true),
      () => finish(true),
    );

    tl = gsap
      .timeline({ onComplete: () => finish() })
      .fromTo(mark.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, 0)
      .to(mark.current, { opacity: 0, duration: 0.35, ease: "power2.in" }, 0.65)
      .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, 1)
      .call(() => void (ready && bottle.current?.spin(2)), [], 1)
      .to(el, { x: target.left - left, y: target.top - top, duration: 1.2, ease: MOTION.glide.ease }, 3)
      .to(backdrop.current, { opacity: 0, duration: 1, ease: "power2.inOut" }, 3)
      .fromTo(shadow, { opacity: 0, scaleX: 0.6 }, { opacity: 1, scaleX: 1, duration: 0.6, ease: "power2.out" }, 3.6)
      .call(showContent, [], 3.8)
      // Skip appears after 0.3s and leaves as the glide starts, before the hero button fades up where it sits on phones.
      // It takes focus for screen readers and Enter, without a ring. Tab still shows one.
      .fromTo(skip.current, { opacity: 0 }, { opacity: 1, duration: 0.3, onStart: () => skip.current?.focus({ focusVisible: false }) }, 0.3)
      .to(skip.current, { opacity: 0, duration: 0.3, ease: "power1.out" }, 3);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") finish(true);
    };
    // Phones resize when the address bar moves, so only a width change (rotation, window resize) ends it.
    const onResize = () => window.innerWidth !== width && finish(true);
    const onSkip = () => finish(true);
    const button = skip.current;
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    button?.addEventListener("click", onSkip);
    return () => finish();
  });
  return () => mm.revert();
}
