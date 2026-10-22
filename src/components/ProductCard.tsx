"use client";

import type { Product } from "@/lib/catalog";
import { openScent } from "@/lib/scent-url";
import { preloadProductModal } from "./ScentModal";
import { SpinBottle } from "./SpinBottle";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <a
      href={`/products?scent=${product.id}`}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openScent(product.id);
      }}
      onPointerEnter={preloadProductModal}
      onPointerDown={preloadProductModal}
      onFocus={preloadProductModal}
      className="block h-full rounded-card border border-border bg-surface p-4 text-center transition-colors duration-500 ease-out hover:border-secondary lg:p-6"
    >
      <div data-card-bottle={product.id} className="mx-auto aspect-[4/5] w-4/5">
        <SpinBottle dir={`/products/${product.id}`} alt="" priority={priority} float className="h-full" />
      </div>
      <span className="card-title mt-3 block text-balance">{product.name}</span>
      {/* Two moods tell neighbouring bottles apart without prices or sizes. */}
      <span className="eyebrow mt-1 block">{product.moods}</span>
    </a>
  );
}
