import { createHash } from "node:crypto";

/** Trusts the first x-forwarded-for entry, which is safe on Vercel because it overwrites the header. */
export const clientIp = (headers: Headers) => headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

/** Salted so a stored hash cannot be reversed by hashing every IPv4 address. */
export const hashIp = (ip: string) => createHash("sha256").update(ip + (process.env.CRON_SECRET ?? "")).digest("hex");
