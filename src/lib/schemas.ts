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
