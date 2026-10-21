"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkPassword, createSession, requireAdmin, SESSION_COOKIE, SESSION_MS } from "@/lib/admin-auth";
import { clientIp, hashIp } from "@/lib/ip";
import * as db from "@/lib/supabase";

const LOCK_WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

/** A failed save sends back what was typed, because React resets the form after every action. */
export type FormState = { ok: boolean; message: string; fields?: Record<string, FormDataEntryValue> } | null;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const ipHash = hashIp(clientIp(await headers()));
  // Record first, then count, so a burst of parallel guesses cannot all slip under the limit.
  const attempt = await db.recordLoginAttempt(ipHash);
  if ((await db.countLoginAttempts(ipHash, new Date(Date.now() - LOCK_WINDOW_MS).toISOString())) > MAX_FAILURES) {
    return { ok: false, message: "Too many attempts. Try again in 15 minutes." };
  }
  if (!checkPassword(String(form.get("password") ?? ""))) {
    return { ok: false, message: "That password is not right." };
  }
  await db.forgetLoginAttempt(attempt);
  (await cookies()).set(SESSION_COOKIE, createSession(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: SESSION_MS / 1000,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/admin" });
  redirect("/admin/login");
}

const productInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1, "Enter a name.").max(80, "Use 80 characters or fewer."),
  available: z.literal("on").optional(),
});

export async function saveProduct(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = Object.fromEntries(form);
  const input = productInput.safeParse(fields);
  if (!input.success) return { ok: false, message: input.error.issues[0].message, fields };
  const { slug, name, available } = input.data;
  if (!(await db.updateProduct(slug, { name, available: available === "on" }))) {
    return { ok: false, message: "This perfume no longer exists.", fields };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved" };
}

const price = z.coerce
  .number({ message: "Enter a price." })
  .min(0.01, "Use at least $0.01.")
  .max(999.99, "Use less than $1000.")
  .multipleOf(0.01, "Use whole cents.");
const pricesInput = z.object({ "10": price, "20": price, "50": price });

export async function savePrices(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = Object.fromEntries(form);
  const input = pricesInput.safeParse(fields);
  if (!input.success) return { ok: false, message: input.error.issues[0].message, fields };
  await db.updatePrices({ 10: input.data["10"], 20: input.data["20"], 50: input.data["50"] });
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved" };
}
