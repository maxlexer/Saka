import Link from "next/link";
import { Suspense } from "react";
import { FadeUp } from "@/components/FadeUp";
import { Hero } from "@/components/Hero";
import { ArrowIcon } from "@/components/Icons";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductModal } from "@/components/ProductModal";
import { VisitUs } from "@/components/VisitUs";
import { getCatalog, previewPicks } from "@/lib/catalog";

export const revalidate = 300;

export default async function HomePage() {
  const { products, prices } = await getCatalog();
  return (
    <>
      <Hero />
      <section id="collection" aria-labelledby="collection-title" className="section">
        <FadeUp className="wrap text-center">
          <p className="eyebrow">In store now</p>
          <h2 id="collection-title" className="h2 mt-3">On our shelves today</h2>
          <p className="mt-4 text-muted">Visit us to try any scent.</p>
          <ProductGrid products={previewPicks(products, 6)} eager={0} className="mt-10 lg:[&>li:nth-child(n+4)]:hidden" />
          <Link href="/products" className="link tap mt-10 inline-flex items-center gap-2 font-display text-[13px] font-medium uppercase tracking-[0.16em]">
            View products <ArrowIcon width={18} height={18} />
          </Link>
        </FadeUp>
      </section>
      <FadeUp><VisitUs /></FadeUp>
      <Suspense fallback={null}>
        <ProductModal products={products} prices={prices} />
      </Suspense>
    </>
  );
}
