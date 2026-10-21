import Link from "next/link";
import { Suspense } from "react";
import { EmptyShelf } from "@/components/EmptyShelf";
import { FadeUp } from "@/components/FadeUp";
import { Finder } from "@/components/Finder";
import { Hero } from "@/components/Hero";
import { ArrowIcon } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import { ProductGrid } from "@/components/ProductGrid";
import { ScentModal } from "@/components/ScentModal";
import { VisitUs } from "@/components/VisitUs";
import { getCatalog, previewPicks } from "@/lib/catalog";
import { localBusiness, SITE_URL } from "@/lib/jsonld";
import { STORE } from "@/lib/store";

export const revalidate = 300;

export default async function HomePage() {
  const { products, prices } = await getCatalog();
  return (
    <>
      <JsonLd data={localBusiness(STORE, SITE_URL)} />
      <Hero />
      <section id="collection" aria-labelledby="collection-title" className="section">
        <FadeUp className="wrap text-center">
          <p className="eyebrow">In store now</p>
          <h2 id="collection-title" className="h2 mt-3">On our shelves today</h2>
          {products.length === 0 ? (
            <EmptyShelf />
          ) : (
            <>
              <p className="mt-4 text-muted">Visit us to try any scent.</p>
              <ProductGrid products={previewPicks(products, 6)} eager={0} className="mt-10 lg:[&>li:nth-child(n+4)]:hidden" />
              <Link href="/products" className="link tap mt-10 inline-flex items-center gap-2 font-display text-[13px] font-medium uppercase tracking-[0.16em]">
                View products <ArrowIcon width={18} height={18} />
              </Link>
            </>
          )}
        </FadeUp>
      </section>
      {products.length > 0 && (
        <section id="finder" aria-labelledby="finder-title" className="section bg-surface">
          <FadeUp><Finder products={products} /></FadeUp>
        </section>
      )}
      <FadeUp><VisitUs /></FadeUp>
      <Suspense fallback={null}>
        <ScentModal products={products} prices={prices} />
      </Suspense>
    </>
  );
}
