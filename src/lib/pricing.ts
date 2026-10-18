export const DELIVERY_FEE_USD = 2;
export const RIEL_PER_USD = 4000;

export type Fulfilment = "pickup" | "delivery";

export const toRiel = (usd: number) => Math.round((usd * RIEL_PER_USD) / 100) * 100;
export const rielNumber = (usd: number) => toRiel(usd).toLocaleString("en-US");
export const formatRiel = (usd: number) => `${rielNumber(usd)} KHR`;

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
