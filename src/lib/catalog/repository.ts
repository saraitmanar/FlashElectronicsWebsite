import type { Brand, Category, Product } from "./types";

/**
 * The only way pages read catalog data. v1 reads YAML files
 * (sources/local.ts); a CMS, Shopify or POS source can implement the same
 * interface later without page changes.
 */
export interface CatalogRepository {
  listCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | null>;
  listBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | null>;
  /** Products visible on the site (active, plus drafts outside production). */
  listProducts(): Promise<Product[]>;
  /** Archived products, whose old URLs redirect to their category. */
  listArchivedProducts(): Promise<Product[]>;
  /** Includes archived products so their old URLs can redirect. */
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
}
