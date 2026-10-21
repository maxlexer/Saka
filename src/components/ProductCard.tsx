"use client";

import { useRef } from "react";
import type { Product } from "@/lib/catalog";
import { openScent } from "./ProductModal";
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
        if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) void bottle.current?.spin(2);
      }}
      className="block h-full rounded-card border border-border bg-surface p-4 text-center transition-colors duration-500 ease-out hover:border-secondary lg:p-6"
    >
      <div data-card-bottle={product.id} className="aspect-[4/5]">
        <SpinBottle ref={bottle} dir={`/products/${product.id}`} alt={`${product.name} bottle`} sizes="(min-width: 1024px) 340px, 45vw" priority={priority} float className="h-full" />
      </div>
      <span className="card-title mt-4 block text-balance">{product.name}</span>
    </a>
  );
}
