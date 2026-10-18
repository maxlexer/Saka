"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  from?: "right" | "fade" | "full";
  className?: string;
  children: ReactNode;
};

const BOX = {
  right: "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(26rem,100vw)] max-w-none shadow-soft",
  full: "fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none",
  fade: "m-auto w-[min(28rem,calc(100vw-2rem))] shadow-soft",
};
const OFFSET = { right: { x: 48 }, full: { y: -12 }, fade: { y: 12 } };

export function Modal({ open, onClose, label, from = "fade", className = "", children }: Props) {
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
          gsap.fromTo(dialog, { opacity: 0, ...OFFSET[from] }, { opacity: 1, x: 0, y: 0, duration: 0.3, ease: "power2.out" });
        } else if (dialog.open) {
          gsap.to(dialog, { opacity: 0, ...OFFSET[from], duration: 0.2, ease: "power2.in", onComplete: () => dialog.close() });
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
      className={`${BOX[from]} bg-bg p-0 text-text backdrop:bg-[rgba(23,26,18,0.3)] ${className}`}
    >
      <div className="h-full overflow-y-auto overscroll-contain">{children}</div>
    </dialog>
  );
}
