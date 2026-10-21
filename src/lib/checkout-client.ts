import { z } from "zod";
import type { CartLine } from "./cart-line";
import type { Details } from "./schemas";

const DRAFT_KEY = "saka.draft";

const draftSchema = z.object({
  fulfilment: z.enum(["pickup", "delivery"]).catch("pickup"),
  name: z.string().catch(""),
  telegram: z.string().catch(""),
  mapUrl: z.string().catch(""),
});

export type Draft = z.infer<typeof draftSchema>;
export const EMPTY_DRAFT: Draft = { fulfilment: "pickup", name: "", telegram: "", mapUrl: "" };

export function loadDraft(): Draft {
  try {
    const parsed = draftSchema.safeParse(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null"));
    return parsed.success ? parsed.data : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The form still works, it just will not be restored.
  }
}

export async function submitOrder(lines: CartLine[], details: Details): Promise<{ orderId: string } | { message: string }> {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines, details }),
    });
    const body = await res.json();
    return res.ok ? { orderId: body.orderId } : { message: body.message ?? "We could not start your payment. Please try again." };
  } catch {
    return { message: "We could not reach the shop. Check your connection and try again." };
  }
}
