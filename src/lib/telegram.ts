import type { OrderRow } from "./supabase";
import { phnomPenhTime } from "./time";

type Receipt = Pick<OrderRow, "order_number" | "paid_at" | "customer_name" | "telegram" | "fulfilment" | "map_url" | "items" | "delivery_fee_usd" | "total_usd">;

export const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const orderNumber = (n: number | null) => `SK-${n ?? "pending"}`;

const usd = (amount: number) => `$${Number(amount).toFixed(2)}`;

export function formatAdminMessage(o: Receipt) {
  const delivery = o.fulfilment === "delivery";
  return [
    `New order ${orderNumber(o.order_number)}`,
    `Paid ${phnomPenhTime(o.paid_at)} (Phnom Penh)`,
    "",
    `Name: ${escapeHtml(o.customer_name ?? "")}`,
    `Telegram: ${escapeHtml(o.telegram ?? "")}`,
    `Fulfilment: ${delivery ? "Delivery" : "Pickup"}`,
    ...(delivery && o.map_url ? [`Map: ${escapeHtml(o.map_url)}`] : []),
    "",
    "Items",
    ...o.items.map((i) => `${escapeHtml(i.name)}, ${i.sizeMl}ml x${i.qty}  ${usd(i.priceUsd * i.qty)}`),
    ...(Number(o.delivery_fee_usd) > 0 ? [`Delivery  ${usd(o.delivery_fee_usd)}`] : []),
    `Total  ${usd(o.total_usd)}`,
  ].join("\n");
}

export function formatConfirmation(o: Receipt) {
  const first = escapeHtml((o.customer_name ?? "").split(" ")[0]);
  return `Thank you, ${first}. Order ${orderNumber(o.order_number)} is confirmed. Total ${usd(o.total_usd)}, ${o.fulfilment}. Paid ${phnomPenhTime(o.paid_at)} (Phnom Penh). We will message you when it is ready.`;
}

export async function sendMessage(chatId: number | string, text: string) {
  const res = await fetch(`${process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org"}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
  });
  if (!res.ok) throw new Error(`telegram sendMessage failed: ${res.status}`);
}
