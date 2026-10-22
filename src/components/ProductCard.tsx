"use client";

import { useRef } from "react";
import type { Product } from "@/lib/catalog";
import { openScent } from "@/lib/scent-url";
import { preloadProductModal } from "./ScentModal";
import { SpinBottle, type SpinHandle } from "./SpinBottle";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const bottle = useRef<SpinHandle>(null);
  return (
    <a
      href={`/products?scent=${product.id}`}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openScent(product.id);
      }}
      onPointerEnter={(event) => {
        preloadProductModal();
        if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) void bottle.current?.spin(2);
      }}
      onPointerDown={preloadProductModal}
      onFocus={preloadProductModal}
      className="block h-full rounded-card border border-border bg-surface p-4 text-center transition-colors duration-500 ease-out hover:border-secondary lg:p-6"
    >
      <div data-card-bottle={product.id} className="mx-auto aspect-[4/5] w-4/5">
        <SpinBottle ref={bottle} dir={`/products/${product.id}`} alt="" priority={priority} float className="h-full" />
      </div>
      <span className="card-title mt-3 block text-balance">{product.name}</span>
      {/* Two moods tell neighbouring bottles apart without prices or sizes. */}
      <span className="eyebrow mt-1 block">{product.moods}</span>
    </a>
  );
}
