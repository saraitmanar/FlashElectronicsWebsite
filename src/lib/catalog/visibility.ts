import type { Product } from "./types";

/**
 * Draft products are visible in development and on Vercel preview
 * deployments so they can be reviewed, but never on the production site.
 * Override with CATALOG_SHOW_DRAFTS=true|false.
 */
export function showDrafts(): boolean {
  const override = process.env.CATALOG_SHOW_DRAFTS;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.VERCEL_ENV !== "production";
}

/** Products that should appear on the site (listings, product pages, sitemap). */
export function isVisible(product: Product, drafts = showDrafts()): boolean {
  return product.status === "active" || (drafts && product.status === "draft");
}
