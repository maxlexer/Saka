import type { Product } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

/** Two columns on phones: a lone last card sits centred under the pair above instead of hugging the left edge. */
const ODD_LAST_CENTERED = "grid-cols-2 lg:grid-cols-3 max-lg:[&>li:last-child:nth-child(odd)]:col-span-2 max-lg:[&>li:last-child:nth-child(odd)]:w-[calc(50%-0.5rem)] max-lg:[&>li:last-child:nth-child(odd)]:justify-self-center";

type Props = { products: Product[]; className?: string; eager?: number; columns?: string };

export function ProductGrid({ products, className = "", eager = 0, columns = ODD_LAST_CENTERED }: Props) {
  return (
    <ul className={`grid gap-4 lg:gap-6 ${columns} ${className}`}>
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard product={product} priority={i < eager} />
        </li>
      ))}
    </ul>
  );
}
