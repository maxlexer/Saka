"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { setActiveOrder, useActiveOrder, useCart } from "@/lib/cart";
import { EMPTY_DRAFT, loadDraft, saveDraft, submitOrder, type Draft } from "@/lib/checkout-client";
import { computeTotals, DELIVERY_FEE_USD, formatRiel, formatUsd, priceOf } from "@/lib/pricing";
import type { CartCatalogItem } from "@/lib/sanity";
import { detailsSchema } from "@/lib/schemas";
import { AlertIcon } from "./Icons";
import { CheckoutSkeleton } from "./Skeletons";

type Props = { catalog: CartCatalogItem[]; address: string };
type Errors = Record<string, string>;

const input = "min-h-11 w-full rounded-sm border border-border bg-surface px-3 focus:border-secondary";

function check(draft: Draft) {
  const parsed = detailsSchema.safeParse(draft);
  if (parsed.success) return { details: parsed.data, errors: {} as Errors };
  return { details: null, errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) as Errors };
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2 block">{label}</label>
      {children}
      {error && (
        <p id={`${id}-error`} className="small mt-2 flex items-center gap-1 text-error">
          <AlertIcon width={18} height={18} />
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({ catalog, address }: Props) {
  const router = useRouter();
  const { lines } = useCart();
  const activeOrder = useActiveOrder();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(loadDraft());
    setRestored(true);
  }, []);
  useEffect(() => {
    if (restored) saveDraft(draft);
  }, [draft, restored]);

  const set = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (Object.keys(errors).length) setErrors(check(next).errors);
  };
  const described = (id: string) => ({ "aria-invalid": !!errors[id], "aria-describedby": errors[id] ? `${id}-error` : undefined });
  const delivery = draft.fulfilment === "delivery";

  const rows = (lines ?? []).map((line) => {
    const product = catalog.find((p) => p.id === line.productId);
    return { line, name: product?.name ?? "Unavailable item", price: product ? priceOf(product.sizes, line.sizeMl) : undefined };
  });
  const totals = computeTotals(rows.flatMap((r) => (r.price === undefined ? [] : [{ priceUsd: r.price, qty: r.line.qty }])), draft.fulfilment);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const { details, errors: next } = check(draft);
    setErrors(next);
    if (!details) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setFormError("");
    setBusy(true);
    const result = await submitOrder(lines ?? [], details);
    if ("orderId" in result) {
      setActiveOrder(result.orderId);
      router.push(`/checkout/${result.orderId}`);
      return;
    }
    setBusy(false);
    setFormError(result.message);
  }

  const resume = activeOrder && (
    <Link href={`/checkout/${activeOrder}`} className="mb-8 flex min-h-11 items-center justify-between border border-border bg-surface px-4 py-3">
      <span>Continue your payment</span>
      <span className="eyebrow">Open</span>
    </Link>
  );

  if (!restored || lines === null) return <CheckoutSkeleton />;

  if (lines.length === 0) {
    return (
      <div className="mx-auto mt-10 max-w-[62ch] text-center">
        {resume}
        <p className="text-muted">Your cart is empty. <Link href="/products" className="link text-text">See what is in store.</Link></p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      {resume}
      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <Field id="name" label="Name" error={errors.name}>
            <input id="name" autoComplete="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} {...described("name")} className={input} />
          </Field>
          <Field id="telegram" label="Telegram number" error={errors.telegram}>
            <input id="telegram" type="tel" inputMode="tel" autoComplete="tel" value={draft.telegram} onChange={(e) => set({ telegram: e.target.value })} {...described("telegram")} className={input} />
          </Field>

          <fieldset>
            <legend className="eyebrow mb-2">Pickup or delivery</legend>
            <div className="grid grid-cols-2">
              {(["pickup", "delivery"] as const).map((value) => (
                <label key={value} className="block">
                  <input type="radio" name="fulfilment" value={value} checked={draft.fulfilment === value} onChange={() => set({ fulfilment: value })} className="peer sr-only" />
                  <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-sm border border-border font-display text-xs font-medium uppercase tracking-[0.16em] peer-checked:border-btn peer-checked:bg-btn peer-checked:text-btn-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary">
                    {value}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {delivery ? (
            <Field id="mapUrl" label="Google Maps link" error={errors.mapUrl}>
              <input id="mapUrl" type="url" inputMode="url" value={draft.mapUrl} onChange={(e) => set({ mapUrl: e.target.value })} placeholder="https://maps.app.goo.gl/..." {...described("mapUrl")} className={input} />
              <p className="small mt-2 text-muted">Share your location in Google Maps and paste the link. Delivery adds {formatUsd(DELIVERY_FEE_USD)} ({formatRiel(DELIVERY_FEE_USD)}).</p>
            </Field>
          ) : (
            <p className="small text-muted">Pick up in the shop, free of charge. {address}</p>
          )}

          <p className="small text-muted">We use your name and number only to prepare your order.</p>
          {formError && (
            <p role="alert" className="small flex items-center gap-1 text-error">
              <AlertIcon width={18} height={18} />
              {formError}
            </p>
          )}
          <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary w-full lg:w-auto">
            {busy ? "Preparing your code" : "Pay with KHQR"}
          </button>
        </form>

        <aside aria-label="Order summary" className="h-fit border border-border bg-surface p-6">
          <h2 className="h3">Your order</h2>
          <ul className="mt-6 space-y-3">
            {rows.map(({ line, name, price }) => (
              <li key={`${line.productId}-${line.sizeMl}`} className="flex justify-between gap-4">
                <span>{name}, {line.sizeMl}ml x{line.qty}</span>
                <span>{price === undefined ? "Unavailable" : formatUsd(price * line.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-border pt-4">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatUsd(totals.subtotalUsd)}</dd></div>
            <div className="flex justify-between"><dt>{delivery ? "Delivery" : "Pickup"}</dt><dd>{delivery ? formatUsd(totals.deliveryFeeUsd) : "Free"}</dd></div>
            <div className="flex justify-between font-medium"><dt>Total</dt><dd>{formatUsd(totals.totalUsd)}</dd></div>
            <div className="small flex justify-between text-muted"><dt>In Riel</dt><dd>{formatRiel(totals.totalUsd)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
