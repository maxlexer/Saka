"use client";

import { lazy, Suspense, useState } from "react";
import { MenuIcon } from "./Icons";

const load = () => import("./MenuDialog");
const MenuDialog = lazy(() => load().then((m) => ({ default: m.MenuDialog })));
const preload = () => void load();

export function MobileMenu() {
  // null until first opened: the dialog code loads on intent and then stays mounted so it can animate closed.
  const [open, setOpen] = useState<boolean | null>(null);
  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        onPointerDown={preload}
        onFocus={preload}
        className="flex size-11 items-center justify-center lg:hidden"
      >
        <MenuIcon />
      </button>
      {open !== null && (
        <Suspense fallback={null}>
          <MenuDialog open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
