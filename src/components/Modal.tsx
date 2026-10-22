"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  from: "right" | "full" | "product";
  className?: string;
  /** Adds tweens to the opening timeline. Runs only when motion is allowed, right after showModal. */
  onShow?: (tl: gsap.core.Timeline) => void;
  /** Adds tweens to the closing timeline. The dialog closes when the whole timeline ends. */
  onHide?: (tl: gsap.core.Timeline) => void;
  children: ReactNode;
};

const BOX = {
  right: "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(26rem,100vw)] max-w-none rounded-l-card shadow-soft",
  full: "fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none",
  product:
    "fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none rounded-t-card shadow-soft lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[88dvh] lg:w-[min(960px,calc(100vw-4rem))] lg:rounded-card",
};
const OFFSET = { right: { x: 48 }, full: { y: -12 }, product: { y: 24 } };

/** Chrome counts a scrolling box as focusable, so showModal alone would focus the scroller instead of the first control. */
function show(dialog: HTMLDialogElement) {
  if (dialog.open) return;
  dialog.showModal();
  dialog.querySelector<HTMLElement>("button, [href], input")?.focus();
}

/** Open dialogs holding the page scroll. Two can overlap: the cart drawer opens while the product modal glides shut. */
let locks = 0;

export function Modal({ open, onClose, label, from, className = "", onShow, onHide, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    locks += 1;
    document.documentElement.style.overflow = "hidden";
    return () => {
      locks -= 1;
      if (locks === 0) document.documentElement.style.overflow = "";
    };
  }, [open]);

  useGSAP(
    () => {
      const dialog = ref.current;
      if (!dialog) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (open) {
          delete dialog.dataset.closing;
          show(dialog);
          const tl = gsap.timeline();
          tl.fromTo(dialog, { opacity: 0, ...OFFSET[from] }, { opacity: 1, x: 0, y: 0, ...MOTION.enter }, 0);
          onShow?.(tl);
        } else if (dialog.open) {
          // Starts the CSS backdrop fade now, so the backdrop is gone by the time the dialog closes.
          dialog.dataset.closing = "";
          const tl = gsap.timeline({
            onComplete: () => {
              dialog.close();
              delete dialog.dataset.closing;
            },
          });
          tl.to(dialog, { opacity: 0, ...OFFSET[from], ...MOTION.exit }, 0);
          onHide?.(tl);
        }
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (open) show(dialog);
        if (!open && dialog.open) dialog.close();
      });
    },
    { dependencies: [open, from], revertOnUpdate: true },
  );

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // detail < 2: the second click of a double click that opened the dialog must not close it.
      onClick={(event) => event.target === event.currentTarget && event.detail < 2 && onClose()}
      className={`${BOX[from]} bg-bg p-0 text-text ${className}`}
    >
      {/* Inherits the dialog's height cap so this box, not the dialog, scrolls. Sticky bars inside depend on it. */}
      <div className="h-full max-h-[inherit] overflow-y-auto overscroll-contain">{children}</div>
    </dialog>
  );
}
