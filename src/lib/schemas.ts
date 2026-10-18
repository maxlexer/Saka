import { z } from "zod";

export const MAX_CART_LINES = 20;
export const MAX_LINE_QTY = 10;

export const sizeMlSchema = z.union([z.literal(10), z.literal(20), z.literal(50)]);

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  sizeMl: sizeMlSchema,
  qty: z.number().int().min(1).max(MAX_LINE_QTY),
});

export type CartLine = z.infer<typeof cartLineSchema>;

export function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const { hostname, pathname } = url;
    return (
      hostname === "maps.app.goo.gl" ||
      (hostname === "goo.gl" && pathname.startsWith("/maps")) ||
      ((hostname === "google.com" || hostname === "www.google.com") && pathname.startsWith("/maps"))
    );
  } catch {
    return false;
  }
}

const digitCount = (value: string) => value.replace(/\D/g, "").length;

const contact = {
  name: z.string().trim().min(1, "Enter your name.").max(80, "Use 80 characters or fewer."),
  telegram: z
    .string()
    .trim()
    .refine((v) => /^\+?[\d\s]+$/.test(v) && digitCount(v) >= 8 && digitCount(v) <= 15, "Enter a Telegram number with 8 to 15 digits."),
};

export const detailsSchema = z.discriminatedUnion("fulfilment", [
  z.object({ fulfilment: z.literal("pickup"), ...contact }),
  z.object({
    fulfilment: z.literal("delivery"),
    ...contact,
    mapUrl: z.string().trim().refine(isGoogleMapsUrl, "Paste a Google Maps link."),
  }),
]);

export const orderInputSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(MAX_CART_LINES),
  details: detailsSchema,
});

export type Details = z.infer<typeof detailsSchema>;
export type OrderInput = z.infer<typeof orderInputSchema>;
