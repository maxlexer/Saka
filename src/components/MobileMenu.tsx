"use client";

import Link from "next/link";
import { useState } from "react";
import { CloseIcon, MenuIcon } from "./Icons";
import { Modal } from "./Modal";
import { NAV } from "./nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center lg:hidden"
      >
        <MenuIcon />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label="Menu" from="full">
        <div className="flex min-h-full flex-col px-5 py-3">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center self-end">
            <CloseIcon />
          </button>
          <nav aria-label="Mobile" className="mt-10 flex flex-col gap-8">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-display text-[22px] font-medium uppercase tracking-[0.1em]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </Modal>
    </>
  );
}
