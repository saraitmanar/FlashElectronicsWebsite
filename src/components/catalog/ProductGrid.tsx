import type { Brand, Product } from "@/lib/catalog/types";
import { ProductCard } from "./ProductCard";

export function ProductGrid({
  products,
  brands,
  eagerCount = 0,
}: {
  products: Product[];
  brands: Brand[];
  /** How many leading cards load their image eagerly (above the fold). */
  eagerCount?: number;
}) {
  const brandById = new Map(brands.map((b) => [b.id, b]));
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            brand={product.brandId ? brandById.get(product.brandId) : undefined}
            eager={i < eagerCount}
          />
        </li>
      ))}
    </ul>
  );
}
