export const DELIVERY_FEE_USD = 2;

export type Fulfilment = "pickup" | "delivery";

export function formatUsd(usd: number, compact = false) {
  return compact && Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`;
}

export const priceOf = (sizes: { sizeMl: number; priceUsd: number }[], sizeMl: number) =>
  sizes.find((s) => s.sizeMl === sizeMl)?.priceUsd;

export function computeTotals(lines: { priceUsd: number; qty: number }[], fulfilment: Fulfilment) {
  const subtotalCents = lines.reduce((sum, l) => sum + Math.round(l.priceUsd * 100) * l.qty, 0);
  const deliveryCents = fulfilment === "delivery" ? DELIVERY_FEE_USD * 100 : 0;
  return {
    subtotalUsd: subtotalCents / 100,
    deliveryFeeUsd: deliveryCents / 100,
    totalUsd: (subtotalCents + deliveryCents) / 100,
  };
}
