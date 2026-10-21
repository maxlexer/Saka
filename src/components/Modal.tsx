"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  from?: "right" | "fade" | "full" | "product";
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
  fade: "m-auto w-[min(28rem,calc(100vw-2rem))] rounded-card shadow-soft",
  product:
    "fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none rounded-t-card shadow-soft lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[88dvh] lg:w-[min(960px,calc(100vw-4rem))] lg:rounded-card",
};
const OFFSET = { right: { x: 48 }, full: { y: -12 }, fade: { y: 12 }, product: { y: 24 } };

export function Modal({ open, onClose, label, from = "fade", className = "", onShow, onHide, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useGSAP(
    () => {
      const dialog = ref.current;
      if (!dialog) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (open) {
          if (!dialog.open) dialog.showModal();
          const tl = gsap.timeline();
          tl.fromTo(dialog, { opacity: 0, ...OFFSET[from] }, { opacity: 1, x: 0, y: 0, ...MOTION.enter }, 0);
          onShow?.(tl);
        } else if (dialog.open) {
          const tl = gsap.timeline({ onComplete: () => dialog.close() });
          tl.to(dialog, { opacity: 0, ...OFFSET[from], ...MOTION.exit }, 0);
          onHide?.(tl);
        }
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (open && !dialog.open) dialog.showModal();
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
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className={`${BOX[from]} bg-bg p-0 text-text ${className}`}
    >
      <div className="h-full overflow-y-auto overscroll-contain">{children}</div>
    </dialog>
  );
}
