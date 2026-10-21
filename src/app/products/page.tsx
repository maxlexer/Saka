import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 300;
export const metadata = { title: "Products | SAKA Parfum" };

export default async function ProductsPage() {
  const { products, prices } = await getCatalog();
  return (
    <section aria-labelledby="products-title" className="section">
      <div className="wrap text-center">
        <p className="eyebrow">Products</p>
        <h1 id="products-title" className="h2 mt-3">Everything on our shelves</h1>
        {products.length === 0 ? (
          <p className="mx-auto mt-10 max-w-[62ch] text-muted">
            Our shelves are being restocked. <Link href="/#visit" className="link text-text">Visit us</Link> or message us for what is new.
          </p>
        ) : (
          <ProductGrid products={products} prices={prices} className="mt-10" />
        )}
      </div>
    </section>
  );
}
