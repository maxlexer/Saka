"use client";

import { lazy, Suspense, useState } from "react";
import { useCart } from "@/lib/cart";
import type { CartCatalog } from "@/lib/catalog";
import { CartIcon } from "./Icons";

const load = () => import("./CartDrawer");
const CartDrawer = lazy(() => load().then((m) => ({ default: m.CartDrawer })));
const preload = () => void load();

export function CartMenu({ catalog }: { catalog: CartCatalog }) {
  const { lines } = useCart();
  // null until first opened: the drawer code loads on intent and then stays mounted so it can animate closed.
  const [open, setOpen] = useState<boolean | null>(null);
  const count = (lines ?? []).reduce((n, l) => n + l.qty, 0);

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
            <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-sm bg-badge px-1 font-display text-[11px] font-medium text-ink">
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
