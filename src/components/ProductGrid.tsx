import type { Product } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

type Props = { products: Product[]; className?: string; eager?: number };

export function ProductGrid({ products, className = "", eager = 3 }: Props) {
  return (
    <ul className={`grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6 ${className}`}>
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard product={product} priority={i < eager} />
        </li>
      ))}
    </ul>
  );
}
