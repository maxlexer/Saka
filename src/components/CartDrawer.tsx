"use client";

import Link from "next/link";
import { useActiveOrder, useCart } from "@/lib/cart";
import type { CartCatalog } from "@/lib/catalog";
import { computeTotals, formatUsd } from "@/lib/pricing";
import { CloseIcon, MinusIcon, PlusIcon } from "./Icons";
import { Modal } from "./Modal";

/** Loaded on first use by CartMenu, so it stays out of the first page load. */
export function CartDrawer({ open, onClose, catalog }: { open: boolean; onClose: () => void; catalog: CartCatalog }) {
  const { lines, setQty } = useCart();
  const activeOrder = useActiveOrder();
  const rows = (lines ?? []).map((line) => {
    const name = catalog.names[line.productId];
    return { line, name, price: name ? catalog.prices[line.sizeMl] : undefined };
  });
  const priced = rows.flatMap((r) => (r.price === undefined ? [] : [{ priceUsd: r.price, qty: r.line.qty }]));
  const { subtotalUsd } = computeTotals(priced, "pickup");

  return (
    <Modal open={open} onClose={onClose} label="Cart" from="right">
      <div className="flex min-h-full flex-col px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="h3">Your cart</h2>
          <button type="button" aria-label="Close cart" onClick={onClose} className="flex size-11 items-center justify-center">
            <CloseIcon />
          </button>
        </div>

        {activeOrder && (
          <Link href={`/checkout/${activeOrder}`} onClick={onClose} className="mt-6 flex min-h-11 items-center justify-between border border-border bg-surface px-4 py-3">
            <span>Continue your payment</span>
            <span className="eyebrow">Open</span>
          </Link>
        )}

        {lines === null ? (
          <div className="mt-8 space-y-4" aria-hidden="true">
            <div className="skeleton h-14" />
            <div className="skeleton h-14" />
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-8 text-muted">
            Your cart is empty. <Link href="/products" onClick={onClose} className="link text-text">See what is in store.</Link>
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
              <span>{formatUsd(subtotalUsd)}</span>
            </div>
            <Link href="/checkout" onClick={onClose} className="btn btn-primary mt-8 w-full">Checkout</Link>
          </>
        )}
      </div>
    </Modal>
  );
}
