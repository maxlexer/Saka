import type { Product } from "./catalog";
import type { STORE } from "./store";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const CONTEXT = "https://schema.org";

export const localBusiness = (store: typeof STORE, siteUrl: string) => ({
  "@context": CONTEXT,
  "@type": "LocalBusiness",
  name: store.name,
  url: siteUrl,
  image: `${siteUrl}/og.png`,
  telephone: store.phone || undefined,
  address: { "@type": "PostalAddress", streetAddress: store.address, addressCountry: "KH" },
  hasMap: store.mapUrl,
  sameAs: store.socialLinks.map((link) => link.url),
});

/** No offers on purpose: prices live only in the product modal. */
export const productList = (products: Product[], siteUrl: string) => ({
  "@context": CONTEXT,
  "@type": "ItemList",
  itemListElement: products.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Product",
      name: p.name,
      description: p.description,
      image: `${siteUrl}/products/${p.id}/still.webp`,
      brand: { "@type": "Brand", name: "SAKA Parfum" },
    },
  })),
});
