export type CatalogProduct = {
  slug: string;
  name: string;
  family: string;
  description: string;
  notes_top: string[];
  notes_heart: string[];
  notes_base: string[];
  mood: string;
  occasion: string;
  vibes: string[];
  occasions: string[];
  available: boolean;
};

export type CatalogFile = { prices: Record<"10" | "20" | "50", number>; products: CatalogProduct[] };

/** Shared by the seed migration, the e2e seed and the local mock, so the three never drift. */
export function catalogRows({ prices, products }: CatalogFile) {
  return {
    products: products.map((product, i) => ({ ...product, sort: (i + 1) * 10 })),
    prices: Object.entries(prices).map(([size, price]) => ({ size_ml: Number(size), price_usd: price })),
  };
}
