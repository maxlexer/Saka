"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { computeTotals, formatRiel, formatUsd, priceOf } from "@/lib/pricing";
import type { CartCatalogItem } from "@/lib/sanity";
import { CartIcon, CloseIcon, MinusIcon, PlusIcon } from "./Icons";
import { Modal } from "./Modal";

export function CartMenu({ catalog }: { catalog: CartCatalogItem[] }) {
  const { lines, setQty } = useCart();
  const [open, setOpen] = useState(false);

  const rows = (lines ?? []).map((line) => {
    const product = catalog.find((p) => p.id === line.productId);
    const price = product && priceOf(product.sizes, line.sizeMl);
    return { line, name: product?.name, price };
  });
  const priced = rows.flatMap((r) => (r.price === undefined ? [] : [{ priceUsd: r.price, qty: r.line.qty }]));
  const { subtotalUsd } = computeTotals(priced, "pickup");
  const count = (lines ?? []).reduce((n, l) => n + l.qty, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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

      <Modal open={open} onClose={() => setOpen(false)} label="Cart" from="right">
        <div className="flex min-h-full flex-col px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="h3">Your cart</h2>
            <button type="button" aria-label="Close cart" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center">
              <CloseIcon />
            </button>
          </div>

          {lines === null ? (
            <div className="mt-8 space-y-4" aria-hidden="true">
              <div className="skeleton h-14" />
              <div className="skeleton h-14" />
            </div>
          ) : rows.length === 0 ? (
            <p className="mt-8 text-muted">
              Your cart is empty. <Link href="/products" onClick={() => setOpen(false)} className="link text-text">See what is in store.</Link>
            </p>
          ) : (
            <>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {rows.map(({ line, name, price }) => (
                  <li key={`${line.productId}-${line.sizeMl}`} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p>{name ? `${name}, ${line.sizeMl}ml` : `Unavailable item, ${line.sizeMl}ml`}</p>
                      <p className="small text-muted">{price === undefined ? "No longer sold" : formatUsd(price * line.qty)}</p>
                    </div>
                    <div className="flex items-center">
                      <button type="button" aria-label={`Remove one ${name ?? "item"}, ${line.sizeMl}ml`} onClick={() => setQty(line.productId, line.sizeMl, line.qty - 1)} className="flex size-11 items-center justify-center text-secondary">
                        <MinusIcon />
                      </button>
                      <span aria-live="polite" className="w-6 text-center">{line.qty}</span>
                      <button type="button" aria-label={`Add one ${name ?? "item"}, ${line.sizeMl}ml`} onClick={() => setQty(line.productId, line.sizeMl, line.qty + 1)} className="flex size-11 items-center justify-center text-secondary">
                        <PlusIcon />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-baseline justify-between">
                <span className="eyebrow">Subtotal</span>
                <span>{formatUsd(subtotalUsd)} <span className="small text-muted">({formatRiel(subtotalUsd)})</span></span>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
