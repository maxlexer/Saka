"use client";

import { useActionState } from "react";
import { savePrices, type FormState } from "@/app/admin/actions";
import type { SizePrices } from "@/lib/catalog";
import { SIZES_ML } from "@/lib/taxonomy";

export function PricesForm({ prices }: { prices: SizePrices }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePrices, null);
  return (
    <form action={action} className="mt-8 rounded-card border border-border bg-surface p-6">
      <h2 className="h3">Prices</h2>
      <p className="small mt-2 text-muted">One price per size, used for every perfume.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SIZES_ML.map((size) => (
          <label key={size} className="block">
            <span className="eyebrow mb-2 block">{size}ml, USD</span>
            <input name={String(size)} type="number" inputMode="decimal" step="0.01" min="0.01" max="999.99" required defaultValue={String(state?.fields?.[size] ?? prices[size].toFixed(2))} className="input bg-bg" />
          </label>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn btn-primary">Save prices</button>
        <p role="status" className={`small ${state?.ok === false ? "text-error" : "text-muted"}`}>{state?.message}</p>
      </div>
    </form>
  );
}
