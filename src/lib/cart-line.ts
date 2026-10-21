/** The cart line shape and limits, shared by the client cart and the server schemas. No React, no Zod. */
import { SIZES_ML, type SizeMl } from "./taxonomy";

export const MAX_CART_LINES = 20;
export const MAX_LINE_QTY = 10;

export type CartLine = { productId: string; sizeMl: SizeMl; qty: number };

/** Checks a line read back from storage. A plain check instead of Zod keeps the validator out of every storefront page. The server re-validates with Zod at checkout. */
export function toLine(value: unknown): CartLine[] {
  const { productId, sizeMl, qty } = (value ?? {}) as Record<string, unknown>;
  const ok = typeof productId === "string" && productId !== "" && typeof qty === "number" && Number.isInteger(qty) && qty >= 1 && qty <= MAX_LINE_QTY;
  return ok && SIZES_ML.includes(sizeMl as SizeMl) ? [{ productId, sizeMl: sizeMl as SizeMl, qty }] : [];
}
