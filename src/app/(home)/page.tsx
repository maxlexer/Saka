import Link from "next/link";
import { Suspense } from "react";
import { EmptyShelf } from "@/components/EmptyShelf";
import { FadeUp } from "@/components/FadeUp";
import { Finder } from "@/components/Finder";
import { Hero } from "@/components/Hero";
import { Intro } from "@/components/Intro";
import { Logo } from "@/components/Logo";
import { ArrowIcon } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import { ProductGrid } from "@/components/ProductGrid";
import { ScentModal } from "@/components/ScentModal";
import { VisitUs } from "@/components/VisitUs";
import { bestSellers, getCatalog } from "@/lib/catalog";
import { localBusiness, SITE_URL } from "@/lib/jsonld";
import { STORE } from "@/lib/store";

export const revalidate = 300;
export const metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const { products, prices } = await getCatalog();
  return (
    <>
      <Intro logo={<Logo className="h-auto w-[220px] md:w-[320px]" />} />
      <JsonLd data={localBusiness(STORE, SITE_URL)} />
      <Hero />
      <section id="collection" aria-labelledby="collection-title" className="section">
        <FadeUp className="wrap text-center">
          <h2 id="collection-title" className="h2">Best sellers</h2>
          {products.length === 0 ? (
            <EmptyShelf />
          ) : (
            <>
              <p className="mt-4 text-muted">Visit us to try any scent.</p>
              <ProductGrid products={bestSellers(products)} columns="grid-cols-3" className="mt-10 max-sm:gap-2 max-sm:[&_.card-title]:text-xs max-sm:[&_.eyebrow]:tracking-[0.08em] max-sm:[&_a]:p-2" />
              <Link href="/products" className="link tap mt-10 inline-flex items-center gap-2 label">
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
