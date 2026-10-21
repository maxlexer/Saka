import { describe, expect, it } from "vitest";
import catalog from "../../supabase/seed/catalog.json";
import type { Product } from "@/lib/catalog";
import { localBusiness, productList } from "@/lib/jsonld";
import { STORE } from "@/lib/store";

describe("localBusiness", () => {
  it("describes the shop", () => {
    expect(localBusiness(STORE, "https://saka.example")).toMatchObject({
      "@type": "LocalBusiness",
      name: STORE.name,
      url: "https://saka.example",
      telephone: STORE.phone,
      address: { "@type": "PostalAddress", streetAddress: STORE.address, addressCountry: "KH" },
      hasMap: STORE.mapUrl,
      sameAs: STORE.socialLinks.map((link) => link.url),
    });
  });
  it("omits an empty phone", () => {
    expect(JSON.parse(JSON.stringify(localBusiness({ ...STORE, phone: "" }, "https://s.example")))).not.toHaveProperty("telephone");
  });
});

describe("productList", () => {
  it("lists products with their still image and no offers", () => {
    const { slug, name, description } = catalog.products[0];
    const list = productList([{ id: slug, name, description } as Product], "https://s.example");
    expect(list.itemListElement[0]).toMatchObject({
      position: 1,
      item: { "@type": "Product", name, description, image: `https://s.example/products/${slug}/still.webp` },
    });
    expect(JSON.stringify(list)).not.toContain("offers");
  });
});
