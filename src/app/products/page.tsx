import { Suspense } from "react";
import { EmptyShelf } from "@/components/EmptyShelf";
import { JsonLd } from "@/components/JsonLd";
import { ProductGrid } from "@/components/ProductGrid";
import { ScentModal } from "@/components/ScentModal";
import { getCatalog } from "@/lib/catalog";
import { productList, SITE_URL } from "@/lib/jsonld";
import { LABELS, SCENT_FAMILIES, type ScentFamily } from "@/lib/taxonomy";

/** One line per family on /products, drawn from the notes of the perfumes on that shelf. */
const FAMILY_INTROS: Record<ScentFamily, string> = {
  fresh: "Sea air, citrus and cool mint. Easy in the heat.",
  woody: "Cedar, vetiver and sandalwood. Dry, warm and steady.",
  oriental: "Vanilla, amber and warm spice. Close to the skin, for evenings.",
  aromatic: "Lavender, sage and pepper over amberwood. Crisp and polished.",
};

export const revalidate = 300;
export const metadata = { title: "Products", alternates: { canonical: "/products" } };

export default async function ProductsPage() {
  const { products, prices } = await getCatalog();
  const shelves = SCENT_FAMILIES.map((family) => ({ family, list: products.filter((p) => p.family === family) })).filter((s) => s.list.length > 0);
  return (
    <section aria-labelledby="products-title" className="section">
      <JsonLd data={productList(products, SITE_URL)} />
      <div className="wrap">
        <h1 id="products-title" className="h2 text-center">Everything on our shelves</h1>
        {products.length === 0 ? <EmptyShelf /> : (
          <>
            <nav aria-label="Scent families" className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2">
              {shelves.map(({ family, list }) => (
                <a key={family} href={`#family-${family}`} className="link tap label">
                  {LABELS[family]} <span className="text-muted">{list.length}</span>
                </a>
              ))}
            </nav>
            {shelves.map(({ family, list }, index) => (
              <section key={family} aria-labelledby={`family-${family}`} className="mt-12 border-t border-border pt-10 lg:mt-16 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12 lg:pt-14">
                <div className="lg:sticky lg:top-28 lg:self-start">
                  <h2 id={`family-${family}`} className="h2">{LABELS[family]}</h2>
                  <p className="mt-3 max-w-[40ch] text-muted">{FAMILY_INTROS[family]}</p>
                </div>
                <ProductGrid products={list} eager={index === 0 ? 3 : 0} className="mt-8 lg:mt-0" />
              </section>
            ))}
          </>
        )}
      </div>
      <Suspense fallback={null}>
        <ScentModal products={products} prices={prices} />
      </Suspense>
    </section>
  );
}
