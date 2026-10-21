"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, null);
  return (
    <form action={action} className="mt-8 space-y-6 rounded-card border border-border bg-surface p-6">
      <div>
        <label htmlFor="password" className="eyebrow mb-2 block">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state?.ok === false}
          aria-describedby={state ? "login-error" : undefined}
          className="input bg-bg"
        />
        {state && <p id="login-error" role="alert" className="small mt-2 text-error">{state.message}</p>}
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">{pending ? "Signing in" : "Sign in"}</button>
    </form>
  );
}
