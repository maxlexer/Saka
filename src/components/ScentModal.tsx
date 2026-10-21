"use client";

import { useSearchParams } from "next/navigation";
import { lazy, useState } from "react";
import type { Product, SizePrices } from "@/lib/catalog";
import { SCENT_PARAM } from "@/lib/scent-url";

const load = () => import("./ProductModal");
const ProductModal = lazy(() => load().then((m) => ({ default: m.ProductModal })));

/** Cards call this on hover, focus or touch, so the modal code is in place before the click lands. */
export const preloadProductModal = () => void load();

/**
 * The modal code stays out of the first page load. It loads the first time a known perfume is in the URL,
 * then stays mounted so it can animate closed. Render inside a Suspense boundary.
 */
export function ScentModal({ products, prices }: { products: Product[]; prices: SizePrices }) {
  const slug = useSearchParams().get(SCENT_PARAM);
  const wanted = products.some((p) => p.id === slug);
  const [needed, setNeeded] = useState(wanted);
  if (wanted && !needed) setNeeded(true);
  return needed ? <ProductModal products={products} prices={prices} /> : null;
}
