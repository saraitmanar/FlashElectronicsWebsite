import type { Category, Product } from "./types";

/** A category and all of its descendants, e.g. "bedding" → bedding/comforters… */
export function categoryWithDescendants(categories: Category[], id: string): Set<string> {
  const ids = new Set([id]);
  for (const c of categories) {
    if (c.id.startsWith(`${id}/`)) ids.add(c.id);
  }
  return ids;
}

export function productsInCategory(
  products: Product[],
  categories: Category[],
  categoryId: string,
): Product[] {
  const ids = categoryWithDescendants(categories, categoryId);
  return products.filter((p) => p.categoryIds.some((c) => ids.has(c)));
}

export function productsByBrand(products: Product[], brandId: string): Product[] {
  return products.filter((p) => p.brandId === brandId);
}

/** Newest first, then by English name. */
export function sortByNewest(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || a.name.en.localeCompare(b.name.en),
  );
}
