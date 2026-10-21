"use client";

import { useActionState, useId } from "react";
import { saveProduct, type FormState } from "@/app/admin/actions";

export function ProductRow({ slug, name, available }: { slug: string; name: string; available: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, null);
  const id = useId();
  return (
    <form action={action} className="grid grid-cols-[1fr_auto] items-center gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:gap-6 lg:px-6">
      <input type="hidden" name="slug" value={slug} />
      <label htmlFor={`${id}-name`} className="sr-only">Name, {name}</label>
      <input id={`${id}-name`} name="name" defaultValue={String(state?.fields?.name ?? name)} required maxLength={80} className="input col-span-2 bg-bg sm:col-span-1" />
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" name="available" defaultChecked={state?.fields ? state.fields.available === "on" : available} aria-label={`Available, ${name}`} className="peer sr-only" />
        <span aria-hidden="true" className="switch" />
        <span aria-hidden="true" className="small hidden peer-checked:inline sm:w-24">Available</span>
        <span aria-hidden="true" className="small peer-checked:hidden sm:w-24">Out of stock</span>
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-secondary">Save</button>
        <span role="status" className={`small sm:w-16 ${state?.ok === false ? "text-error" : "text-muted"}`}>{state?.message}</span>
      </div>
    </form>
  );
}
