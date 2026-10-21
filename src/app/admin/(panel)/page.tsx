import { PricesForm } from "@/components/admin/PricesForm";
import { ProductRow } from "@/components/admin/ProductRow";
import { getCatalog } from "@/lib/catalog";
import { LABELS, SCENT_FAMILIES } from "@/lib/taxonomy";

export default async function AdminProductsPage() {
  const { products, prices } = await getCatalog();
  return (
    <>
      <h1 className="h2 mt-10">Products</h1>
      <PricesForm prices={prices} />
      <h2 className="h3 mt-12">Perfumes</h2>
      <p className="small mt-2 text-muted">Rename a perfume or mark it out of stock. Changes show on the site within moments.</p>
      {/* Grouped like the shelves and /products, so staff find a bottle where they expect it. */}
      {SCENT_FAMILIES.map((family) => (
        <section key={family} aria-labelledby={`family-${family}`} className="mt-8">
          <h3 id={`family-${family}`} className="eyebrow">{LABELS[family]}</h3>
          <ul className="mt-3 divide-y divide-border rounded-[8px] border border-border bg-surface">
            {products
              .filter((p) => p.family === family)
              .map((p) => (
                <li key={p.id}>
                  <ProductRow slug={p.id} name={p.name} available={p.available} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
