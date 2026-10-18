"use client";

import { useState } from "react";
import type { Product } from "@/lib/sanity";
import { ProductCard } from "./ProductCard";

type Props = { products: Product[]; className?: string; eager?: number };

export function ProductGrid({ products, className = "", eager = 3 }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ul className={`grid grid-cols-2 items-start gap-4 lg:grid-cols-3 lg:gap-6 ${className}`}>
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            priority={i < eager}
            open={openId === product.id}
            onToggle={() => setOpenId(openId === product.id ? null : product.id)}
          />
        </li>
      ))}
    </ul>
  );
}
