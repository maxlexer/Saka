import Link from "next/link";
import { FadeUp } from "@/components/FadeUp";
import { Hero } from "@/components/Hero";
import { ArrowIcon } from "@/components/Icons";
import { ProductGrid } from "@/components/ProductGrid";
import { VisitUs } from "@/components/VisitUs";
import { getCatalog, getSettings } from "@/lib/sanity";

export const revalidate = 60;

export default async function HomePage() {
  const [products, settings] = await Promise.all([getCatalog(), getSettings()]);
  const stockDate = settings.stockUpdatedAt
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Asia/Phnom_Penh" }).format(new Date(settings.stockUpdatedAt))
    : null;

  return (
    <>
      <Hero />
      <section id="collection" aria-labelledby="collection-title" className="section">
        <FadeUp className="container text-center">
          <p className="eyebrow">In store now</p>
          <h2 id="collection-title" className="h2 mt-3">On our shelves today</h2>
          <p className="mt-4 text-muted">{stockDate ? `Stock as of ${stockDate}. ` : ""}Visit us to try any scent.</p>
          <ProductGrid products={products.slice(0, 6)} className="mt-10 lg:[&>li:nth-child(n+4)]:hidden" />
          <Link href="/products" className="link mt-10 inline-flex items-center gap-2 font-display text-[13px] font-medium uppercase tracking-[0.16em]">
            View products <ArrowIcon width={18} height={18} />
          </Link>
        </FadeUp>
      </section>
      <FadeUp><VisitUs settings={settings} /></FadeUp>
    </>
  );
}
