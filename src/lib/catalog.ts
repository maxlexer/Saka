import { z } from "zod";
import { listPrices, listProducts } from "./supabase";
import { OCCASIONS, SCENT_FAMILIES, SIZES_ML, VIBE_LABELS, VIBES, type SizeMl } from "./taxonomy";

const tags = <T extends string>(allowed: readonly T[]) =>
  z.array(z.string()).transform((list) => list.filter((value): value is T => (allowed as readonly string[]).includes(value)));

const productRow = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    family: z.enum(SCENT_FAMILIES),
    description: z.string(),
    notes_top: z.array(z.string()),
    notes_heart: z.array(z.string()),
    notes_base: z.array(z.string()),
    mood: z.string(),
    occasion: z.string(),
    vibes: tags(VIBES),
    occasions: tags(OCCASIONS),
    available: z.boolean(),
    sort: z.number(),
  })
  .transform(({ slug, notes_top, notes_heart, notes_base, ...rest }) => ({
    id: slug,
    ...rest,
    notesTop: notes_top,
    notesHeart: notes_heart,
    notesBase: notes_base,
    /** The card's mood line, for example "Bright, Calm". Built here so the card ships no lookup code. */
    moods: rest.vibes.slice(0, 2).map((vibe) => VIBE_LABELS[vibe]).join(", "),
  }));

const priceRow = z.object({ size_ml: z.union([z.literal(10), z.literal(20), z.literal(50)]), price_usd: z.coerce.number().positive() });

export type Product = z.output<typeof productRow>;
export type SizePrices = Record<SizeMl, number>;
export type Catalog = { products: Product[]; prices: SizePrices };
export type CartCatalog = { names: Record<string, string>; prices: SizePrices };

export const EMPTY_CATALOG: Catalog = { products: [], prices: { 10: 0, 20: 0, 50: 0 } };

export function parseCatalog(rawProducts: unknown[], rawPrices: unknown[]): Catalog {
  const products = rawProducts.flatMap((item) => {
    const parsed = productRow.safeParse(item);
    if (parsed.success) return [parsed.data];
    console.warn(`Skipped product ${(item as { slug?: string } | null)?.slug ?? "unknown"}: ${parsed.error.issues[0]?.message}`);
    return [];
  });
  const prices = Object.fromEntries(z.array(priceRow).parse(rawPrices).map((r) => [r.size_ml, r.price_usd]));
  if (SIZES_ML.some((size) => !(size in prices))) throw new Error("A size price is missing");
  return { products, prices: prices as SizePrices };
}

/**
 * Pages that call this are cached (route `revalidate`) and refreshed by admin saves.
 * Checkout calls it from a dynamic POST, so there it always reads live data.
 */
export async function getCatalog(slugs?: string[]) {
  const [products, prices] = await Promise.all([listProducts(slugs), listPrices()]);
  return parseCatalog(products, prices);
}

export const toCartCatalog = ({ products, prices }: Catalog): CartCatalog => ({
  names: Object.fromEntries(products.map((p) => [p.id, p.name])),
  prices,
});

/** The home shelf, in order. Change this list to change what the shelf shows. */
export const BEST_SELLERS = ["acqua-di-gio-profondo", "sauvage-edt", "aventus"];

/** Best sellers that are in stock, topped up from the shelf in order if one is missing or sold out. */
export function bestSellers(products: Product[], count = 3) {
  const shelf = products.filter((p) => p.available);
  const named = BEST_SELLERS.flatMap((id) => shelf.filter((p) => p.id === id));
  return [...named, ...shelf.filter((p) => !named.includes(p))].slice(0, count);
}
