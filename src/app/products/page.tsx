import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import { getCatalog } from "@/lib/catalog";
import { LABELS, SCENT_FAMILIES } from "@/lib/taxonomy";

export const revalidate = 300;
export const metadata = { title: "Products | SAKA Parfum" };

export default async function ProductsPage() {
  const { products } = await getCatalog();
  return (
    <section aria-labelledby="products-title" className="section">
      <div className="wrap">
        <p className="eyebrow text-center">Products</p>
        <h1 id="products-title" className="h2 mt-3 text-center">Everything on our shelves</h1>
        {products.length === 0 ? (
          <p className="mx-auto mt-10 max-w-[62ch] text-center text-muted">
            Our shelves are being restocked. <Link href="/#visit" className="link text-text">Visit us</Link> or message us for what is new.
          </p>
        ) : (
          SCENT_FAMILIES.map((family, index) => {
            const list = products.filter((p) => p.family === family);
            return list.length === 0 ? null : (
              <section key={family} aria-labelledby={`family-${family}`} className="mt-14 lg:mt-20">
                <h2 id={`family-${family}`} className="h2">{LABELS[family]}</h2>
                <ProductGrid products={list} eager={index === 0 ? 3 : 0} className="mt-8" />
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
