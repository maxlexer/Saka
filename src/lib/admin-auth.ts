import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "saka_admin";
export const SESSION_MS = 12 * 60 * 60 * 1000;

const digest = (value: string) => createHash("sha256").update(value).digest();
const sign = (expires: number, secret: string) => createHmac("sha256", secret).update(String(expires)).digest("base64url");

/** Constant time: both sides are hashed to the same length before comparing. */
export function checkPassword(input: string, expected = process.env.ADMIN_PASSWORD ?? "") {
  return expected.length > 0 && timingSafeEqual(digest(input), digest(expected));
}

export function createSession(now: number, secret = process.env.ADMIN_SESSION_SECRET ?? "") {
  if (secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters");
  const expires = now + SESSION_MS;
  return `${expires}.${sign(expires, secret)}`;
}

export function verifySession(token: string | undefined, now: number, secret = process.env.ADMIN_SESSION_SECRET ?? "") {
  const [expires, mac] = token?.split(".") ?? [];
  if (!expires || !mac || secret.length < 32 || !(Number(expires) > now)) return false;
  const given = Buffer.from(mac);
  const wanted = Buffer.from(sign(Number(expires), secret));
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export async function isAdmin() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value, Date.now());
}

/** Call first in every admin page and server action. A layout check alone does not protect actions. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
