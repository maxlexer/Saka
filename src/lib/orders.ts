import { createHash, randomBytes } from "node:crypto";
import { checkPaid, generateDeeplink, generateQr } from "./khqr";
import { computeTotals, priceOf } from "./pricing";
import { getLiveProducts } from "./sanity";
import type { OrderInput } from "./schemas";
import * as db from "./supabase";
import type { OrderItem, OrderRow } from "./supabase";
import { formatAdminMessage, formatConfirmation, orderNumber, sendMessage } from "./telegram";

const QR_LIFETIME_MS = 10 * 60_000;
const CHECK_INTERVAL_MS = 5000;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 5;

export class OrderError extends Error {
  constructor(readonly code: "unavailable" | "rate_limited", message: string, readonly status: number) {
    super(message);
  }
}

export type OrderView =
  | { state: "pending"; qr: string; deeplink: string | null; totalUsd: number; expiresAt: string }
  | { state: "expired"; totalUsd: number }
  | { state: "paid"; orderNumber: string; totalUsd: number; fulfilment: "pickup" | "delivery"; claimToken: string };

export async function createOrder({ lines, details }: OrderInput, ip: string) {
  const ipHash = createHash("sha256").update(ip + (process.env.CRON_SECRET ?? "")).digest("hex");
  if ((await db.countRecentByIp(ipHash, new Date(Date.now() - RATE_WINDOW_MS).toISOString())) >= RATE_MAX) {
    throw new OrderError("rate_limited", "Too many attempts. Please wait a few minutes and try again.", 429);
  }

  const products = await getLiveProducts([...new Set(lines.map((l) => l.productId))]);
  const items: OrderItem[] = lines.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    const price = product && priceOf(product.sizes, line.sizeMl);
    if (!product || price === undefined) {
      throw new OrderError("unavailable", "An item in your cart is no longer sold. Please remove it to continue.", 409);
    }
    if (!product.available) {
      throw new OrderError("unavailable", `${product.name} is out of stock. Please remove it to continue.`, 409);
    }
    return { productId: product.id, name: product.name, sizeMl: line.sizeMl, priceUsd: price, qty: line.qty };
  });

  const { subtotalUsd, deliveryFeeUsd, totalUsd } = computeTotals(items, details.fulfilment);
  const expiresAt = new Date(Date.now() + QR_LIFETIME_MS).toISOString();
  const qr = await generateQr(totalUsd);
  const order = await db.insertOrder({
    claim_token: randomBytes(18).toString("base64url"),
    customer_name: details.name,
    telegram: details.telegram,
    fulfilment: details.fulfilment,
    map_url: details.fulfilment === "delivery" ? details.mapUrl : null,
    items,
    subtotal_usd: subtotalUsd,
    delivery_fee_usd: deliveryFeeUsd,
    total_usd: totalUsd,
    khqr_md5: qr.md5,
    khqr_tran_id: qr.tranId,
    khqr_qr: qr.qr,
    khqr_deeplink: await generateDeeplink(qr.qr),
    ip_hash: ipHash,
    expires_at: expiresAt,
  });
  return { orderId: order.id };
}

export async function notifyAdmin(order: OrderRow) {
  try {
    if (!(await db.claimNotify(order.id))) return;
    try {
      await sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID ?? "", formatAdminMessage(order));
    } catch (error) {
      await db.releaseNotify(order.id);
      throw error;
    }
  } catch (error) {
    console.error("Admin notification failed, will retry", error);
  }
}

/** The only path that marks an order paid. Safe to call from any number of callers at once. */
export async function settleOrder(md5: string) {
  const order = await db.getOrderByMd5(md5);
  if (!order || order.status !== "pending") return false;

  const payment = await checkPaid(md5);
  if (!payment.paid) return false;
  if (payment.currency.toUpperCase() !== "USD" || Math.abs(payment.amount - Number(order.total_usd)) > 0.005) {
    console.error(`Payment mismatch for order ${order.id}: got ${payment.amount} ${payment.currency}, expected ${order.total_usd} USD`);
    return false;
  }

  const settled = await db.settleByMd5(md5);
  if (!settled) return false;
  await notifyAdmin(settled);
  return true;
}

export async function getOrderView(id: string): Promise<OrderView | null> {
  let order = await db.getOrder(id);
  if (!order) return null;

  const dueForCheck = !order.last_checked_at || Date.now() - Date.parse(order.last_checked_at) > CHECK_INTERVAL_MS;
  if (order.status === "pending" && dueForCheck) {
    await db.touchChecked(order.id);
    if (await settleOrder(order.khqr_md5)) order = (await db.getOrder(id)) ?? order;
  }
  if (order.status === "paid" && !order.admin_notified_at) await notifyAdmin(order);

  const totalUsd = Number(order.total_usd);
  if (order.status === "paid") {
    return { state: "paid", orderNumber: orderNumber(order.order_number), totalUsd, fulfilment: order.fulfilment, claimToken: order.claim_token };
  }
  if (Date.parse(order.expires_at) <= Date.now()) return { state: "expired", totalUsd };
  return { state: "pending", qr: order.khqr_qr, deeplink: order.khqr_deeplink, totalUsd, expiresAt: order.expires_at };
}

/** Replies once to the chat that pressed Start. The chat id is never stored. */
export async function handleStart(chatId: number, token: string | undefined) {
  const order = token ? await db.getOrderByClaimToken(token) : null;
  const text = !order
    ? "Hello from SAKA Parfum. Pay on our site, then tap the Telegram button to get your confirmation here."
    : order.status === "paid"
      ? formatConfirmation(order)
      : "We have not received this payment yet. Please try again in a moment.";
  await sendMessage(chatId, text);
}

export async function runDaily() {
  await db.ping();
  const unsent = await db.unnotifiedPaid();
  await Promise.all(unsent.map(notifyAdmin));
  const checks = await Promise.allSettled((await db.stalePending()).map((order) => settleOrder(order.khqr_md5)));
  const settled = checks.filter((c) => c.status === "fulfilled" && c.value).length;
  return { retried: unsent.length, settled, ...(await db.cleanup()) };
}
