"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { onOpenCart, useCart } from "@/lib/cart";
import type { CartCatalog } from "@/lib/catalog";
import { preloader, preloadWhenIdle } from "@/lib/preload";
import { CartIcon } from "./Icons";

const load = () => import("./CartDrawer");
const CartDrawer = lazy(() => load().then((m) => ({ default: m.CartDrawer })));
const preload = preloader(load);

export function CartMenu({ catalog }: { catalog: CartCatalog }) {
  const { lines } = useCart();
  // null until first opened: the drawer code loads on intent and then stays mounted so it can animate closed.
  const [open, setOpen] = useState<boolean | null>(null);
  const count = (lines ?? []).reduce((n, l) => n + l.qty, 0);
  useEffect(() => preloadWhenIdle(load), []);
  useEffect(() => onOpenCart(() => setOpen(true)), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={preload}
        onPointerDown={preload}
        onFocus={preload}
        aria-haspopup="dialog"
        aria-label={count > 0 ? `Open cart, ${count} ${count === 1 ? "item" : "items"}` : "Open cart"}
        className="relative flex size-11 items-center justify-center"
      >
        <CartIcon />
        {lines === null ? (
          <span className="skeleton absolute right-0 top-0 h-5 w-5" aria-hidden="true" />
        ) : (
          count > 0 && (
            <span className="badge absolute right-0 top-0">
              {count}
            </span>
          )
        )}
      </button>
      {open !== null && (
        <Suspense fallback={null}>
          <CartDrawer open={open} onClose={() => setOpen(false)} catalog={catalog} />
        </Suspense>
      )}
    </>
  );
}
