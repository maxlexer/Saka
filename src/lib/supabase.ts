import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type OrderItem = { productId: string; name: string; sizeMl: number; priceUsd: number; qty: number };

export type OrderRow = {
  id: string;
  status: "pending" | "paid";
  order_number: number | null;
  claim_token: string;
  customer_name: string | null;
  telegram: string | null;
  fulfilment: "pickup" | "delivery";
  map_url: string | null;
  items: OrderItem[];
  subtotal_usd: number;
  delivery_fee_usd: number;
  total_usd: number;
  khqr_md5: string;
  khqr_tran_id: string | null;
  khqr_qr: string;
  khqr_deeplink: string | null;
  ip_hash: string | null;
  expires_at: string;
  last_checked_at: string | null;
  paid_at: string | null;
  admin_notified_at: string | null;
  created_at: string;
};

export type NewOrder = Omit<OrderRow, "id" | "status" | "order_number" | "paid_at" | "admin_notified_at" | "last_checked_at" | "created_at">;

const HOUR_MS = 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

let client: SupabaseClient | undefined;
const db = () => (client ??= createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } }));

function ok<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

async function getBy(column: "id" | "khqr_md5" | "claim_token", value: string) {
  return ok(await db().from("orders").select().eq(column, value).maybeSingle()) as OrderRow | null;
}

export const getOrder = (id: string) => getBy("id", id);
export const getOrderByMd5 = (md5: string) => getBy("khqr_md5", md5);
export const getOrderByClaimToken = (token: string) => getBy("claim_token", token);

export async function insertOrder(order: NewOrder) {
  return ok(await db().from("orders").insert(order).select().single()) as OrderRow;
}

export async function settleByMd5(md5: string) {
  const rows = ok(await db().rpc("settle_order", { p_md5: md5 })) as OrderRow[] | null;
  return rows?.[0] ?? null;
}

export async function markNotified(id: string) {
  ok(await db().from("orders").update({ admin_notified_at: new Date().toISOString() }).eq("id", id));
}

export async function touchChecked(id: string) {
  ok(await db().from("orders").update({ last_checked_at: new Date().toISOString() }).eq("id", id));
}

export async function countRecentByIp(ipHash: string, sinceIso: string) {
  const { count, error } = await db().from("orders").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", sinceIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function unnotifiedPaid() {
  return ok(await db().from("orders").select().eq("status", "paid").is("admin_notified_at", null).limit(50)) as OrderRow[];
}

export async function stalePending() {
  return ok(await db().from("orders").select().eq("status", "pending").is("last_checked_at", null).gte("created_at", ago(24 * HOUR_MS)).limit(50)) as OrderRow[];
}

export async function cleanup() {
  const deleted = await db().from("orders").delete({ count: "exact" }).eq("status", "pending").lt("created_at", ago(24 * HOUR_MS));
  const scrubbed = await db()
    .from("orders")
    .update({ customer_name: null, telegram: null, map_url: null }, { count: "exact" })
    .eq("status", "paid")
    .lt("paid_at", ago(90 * 24 * HOUR_MS))
    .not("customer_name", "is", null);
  ok(deleted);
  ok(scrubbed);
  return { deleted: deleted.count ?? 0, scrubbed: scrubbed.count ?? 0 };
}

export async function ping() {
  ok(await db().from("orders").select("id").limit(1));
}
