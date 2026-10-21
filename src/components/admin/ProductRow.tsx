"use client";

import { useActionState, useId } from "react";
import { saveProduct, type FormState } from "@/app/admin/actions";

export function ProductRow({ slug, name, available }: { slug: string; name: string; available: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, null);
  const id = useId();
  return (
    <form action={action} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6 lg:px-6">
      <input type="hidden" name="slug" value={slug} />
      <label htmlFor={`${id}-name`} className="sr-only">Name, {slug}</label>
      <input id={`${id}-name`} name="name" defaultValue={name} required maxLength={80} className="input bg-bg" />
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" name="available" defaultChecked={available} aria-label={`Available, ${slug}`} className="peer sr-only" />
        <span aria-hidden="true" className="switch" />
        <span aria-hidden="true" className="small hidden w-24 peer-checked:inline">Available</span>
        <span aria-hidden="true" className="small w-24 peer-checked:hidden">Out of stock</span>
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-secondary">Save</button>
        <span role="status" className={`small w-16 ${state?.ok === false ? "text-error" : "text-muted"}`}>{state?.message}</span>
      </div>
    </form>
  );
}
