import { formatIssues, loadCatalogFromDisk } from "../load-content";
import type { CatalogRepository } from "../repository";
import type { Catalog } from "../types";
import { isVisible } from "../visibility";

let cached: Catalog | null = null;

/** Loads /content once per process. Invalid content fails the build. */
function catalog(): Catalog {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const { catalog, errors } = loadCatalogFromDisk();
  if (errors.length) {
    throw new Error(
      `Catalog content has ${errors.length} error(s). Run "npm run content:check" for details:\n${formatIssues(errors)}`,
    );
  }
  cached = catalog;
  return catalog;
}

export const localCatalog: CatalogRepository = {
  async listCategories() {
    return catalog().categories;
  },
  async getCategory(id) {
    return catalog().categories.find((c) => c.id === id) ?? null;
  },
  async listBrands() {
    return catalog().brands;
  },
  async getBrand(id) {
    return catalog().brands.find((b) => b.id === id) ?? null;
  },
  async listProducts() {
    return catalog().products.filter((p) => isVisible(p));
  },
  async getProductBySlug(slug) {
    const product = catalog().products.find((p) => p.slug === slug);
    if (!product) return null;
    return isVisible(product) || product.status === "archived" ? product : null;
  },
  async getProductsByIds(ids) {
    const wanted = new Set(ids);
    return catalog().products.filter((p) => wanted.has(p.id) && isVisible(p));
  },
};
