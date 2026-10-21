"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSession, SESSION_COOKIE, SESSION_MS } from "@/lib/admin-auth";
import { clientIp, hashIp } from "@/lib/ip";
import * as db from "@/lib/supabase";

const LOCK_WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

export type FormState = { ok: boolean; message: string } | null;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const ipHash = hashIp(clientIp(await headers()));
  if ((await db.countLoginFailures(ipHash, new Date(Date.now() - LOCK_WINDOW_MS).toISOString())) >= MAX_FAILURES) {
    return { ok: false, message: "Too many attempts. Try again in 15 minutes." };
  }
  if (!checkPassword(String(form.get("password") ?? ""))) {
    await db.recordLoginFailure(ipHash);
    return { ok: false, message: "That password is not right." };
  }
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
