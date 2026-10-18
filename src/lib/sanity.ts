import { createClient } from "@sanity/client";
import { z } from "zod";
import { OCCASIONS, SCENT_FAMILIES, VIBES } from "./taxonomy";
import { sizeMlSchema } from "./schemas";

const list = <T extends z.ZodTypeAny>(item: T) =>
  z.array(item).nullish().transform((v) => v ?? []);

const webUrl = z.url({ protocol: /^https?$/ });

const image = z.object({ url: z.string().min(1), alt: z.string().min(1), lqip: z.string().nullish() });

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullish().transform((v) => v ?? ""),
  notesTop: list(z.string()),
  notesHeart: list(z.string()),
  notesBase: list(z.string()),
  scentFamily: list(z.enum(SCENT_FAMILIES)),
  vibes: list(z.enum(VIBES)),
  occasions: list(z.enum(OCCASIONS)),
  sizes: z
    .array(z.object({ sizeMl: sizeMlSchema, priceUsd: z.number().positive() }))
    .min(1)
    .transform((s) => [...s].sort((a, b) => a.sizeMl - b.sizeMl)),
  available: z.boolean().nullish().transform((v) => v ?? true),
  displayOrder: z.number().nullish().transform((v) => v ?? 100),
  image,
  imageHover: image.omit({ lqip: true }).nullish().catch(null).transform((v) => v ?? null),
});

export const siteSettingsSchema = z.object({
  storeName: z.string().min(1),
  address: z.string().min(1),
  hours: list(z.object({ days: z.string(), open: z.string(), close: z.string() })),
  phone: z.string().nullish().transform((v) => v ?? ""),
  mapUrl: webUrl,
  socialLinks: list(z.object({ label: z.string(), url: webUrl })),
  stockUpdatedAt: z.string().nullish().transform((v) => v ?? null),
});

export type Product = z.infer<typeof productSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type CartCatalogItem = Pick<Product, "id" | "name" | "sizes" | "available">;

const FALLBACK_SETTINGS: SiteSettings = {
  storeName: "SAKA Parfum",
  address: "Cambodia",
  hours: [],
  phone: "",
  mapUrl: "https://www.google.com/maps",
  socialLinks: [],
  stockUpdatedAt: null,
};

export function parseProducts(raw: unknown[]): Product[] {
  return raw.flatMap((item) => {
    const parsed = productSchema.safeParse(item);
    if (parsed.success) return [parsed.data];
    const id = (item as { id?: string } | null)?.id ?? "unknown";
    console.warn(`Skipped product ${id}: ${parsed.error.issues[0]?.message}`);
    return [];
  });
}

export function parseSettings(raw: unknown): SiteSettings {
  const parsed = siteSettingsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  console.warn(`Using fallback site settings: ${parsed.error.issues[0]?.message}`);
  return FALLBACK_SETTINGS;
}

export const toCartCatalog = (products: Product[]): CartCatalogItem[] =>
  products.map(({ id, name, sizes, available }) => ({ id, name, sizes, available }));

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? "missing",
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  useCdn: true,
  ...(process.env.SANITY_API_HOST
    ? { apiHost: process.env.SANITY_API_HOST, useProjectHostname: false, useCdn: false }
    : {}),
});

const PRODUCT_FIELDS = `
  "id": _id, name, "slug": slug.current, description, notesTop, notesHeart, notesBase,
  scentFamily, vibes, occasions, sizes[]{ sizeMl, priceUsd }, available, displayOrder,
  "image": image{ "url": asset->url, "lqip": asset->metadata.lqip, alt },
  "imageHover": imageHover{ "url": asset->url, alt }`;

const CATALOG_QUERY = `*[_type == "product" && isActive != false] | order(displayOrder asc, name asc){${PRODUCT_FIELDS}}`;
const SETTINGS_QUERY = `*[_id == "siteSettings"][0]{ storeName, address, hours, phone, mapUrl, socialLinks, stockUpdatedAt }`;

const ISR = { next: { revalidate: 60 } } as const;

export async function getCatalog(): Promise<Product[]> {
  return parseProducts(await client.fetch<unknown[]>(CATALOG_QUERY, {}, ISR));
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    return parseSettings(await client.fetch<unknown>(SETTINGS_QUERY, {}, ISR));
  } catch (error) {
    console.warn("Could not load site settings", error);
    return FALLBACK_SETTINGS;
  }
}
