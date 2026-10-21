"use client";

import { useSearchParams } from "next/navigation";
import { lazy, useEffect, useState } from "react";
import type { Product, SizePrices } from "@/lib/catalog";
import { preloader, preloadWhenIdle } from "@/lib/preload";
import { SCENT_PARAM, scentClosed } from "@/lib/scent-url";

const load = () => import("./ProductModal");
const ProductModal = lazy(() => load().then((m) => ({ default: m.ProductModal })));

/** Cards call this on hover, focus or touch, in case they are used before the idle preload. */
export const preloadProductModal = preloader(load);

/**
 * The modal code stays out of the first page load and arrives once the page is idle. It mounts the first time a known
 * perfume is in the URL, then stays mounted so it can animate closed. Render inside a Suspense boundary.
 */
export function ScentModal({ products, prices }: { products: Product[]; prices: SizePrices }) {
  const slug = useSearchParams().get(SCENT_PARAM);
  const wanted = products.some((p) => p.id === slug);
  const [needed, setNeeded] = useState(wanted);
  if (wanted && !needed) setNeeded(true);
  useEffect(() => preloadWhenIdle(load), []);
  // Closed by any route, Back included, even before the modal code arrived.
  useEffect(() => {
    if (!slug) scentClosed();
  }, [slug]);
  return needed ? <ProductModal products={products} prices={prices} /> : null;
}
