"use client";

import Link from "next/link";
import { CloseIcon } from "./Icons";
import { Modal } from "./Modal";
import { NAV } from "./nav";

/** Loaded on first use by MobileMenu, so it stays out of the first page load. */
export function MenuDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label="Menu" from="full">
      <div className="flex min-h-full flex-col px-5 py-3">
        <button type="button" aria-label="Close menu" onClick={onClose} className="flex size-11 items-center justify-center self-end">
          <CloseIcon />
        </button>
        <nav aria-label="Mobile" className="mt-10 flex flex-col gap-8">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={onClose} className="tap font-display text-[22px] font-medium uppercase tracking-[0.1em]">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </Modal>
  );
}
