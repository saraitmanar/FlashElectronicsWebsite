/**
 * Normalized catalog model — what pages and components use.
 *
 * Nobody writes this by hand: product YAML files (see authoring-schema.ts)
 * are expanded into this shape by normalize.ts. The structure follows the
 * common commerce pattern (Product → up to 3 Options → Variants with SKUs)
 * so a CMS, Shopify or a POS can become the source later without changing
 * the UI.
 */
import type { Localized } from "@/lib/i18n/localized";
import type { Money } from "@/lib/config/site";

export type { Localized, Money };

export interface Brand {
  id: string;
  slug: string;
  name: string; // brand names are usually not translated
  description?: Localized;
}

export interface Category {
  /** Path id, e.g. "bedding" or "bedding/comforters". Also the URL path. */
  id: string;
  slug: string; // last path segment
  parentId?: string;
  name: Localized;
  description?: Localized;
  sortOrder: number;
}

export interface ImageAsset {
  id: string;
  /** Absolute URL (Cloudinary) or site path (/catalog/...). */
  src: string;
  width: number;
  height: number;
  alt: Localized;
  blurDataURL?: string;
}

export interface ProductImage extends ImageAsset {
  /** e.g. { color: "navy" }. Absent = shown for every variant. */
  optionValues?: Record<string, string>;
  sortOrder: number;
}

export interface OptionValue {
  id: string; // "navy"
  code: string; // "NVY" — used to build SKUs
  label: Localized;
  swatch?: { hex?: string };
}

export interface ProductOption {
  id: string; // "color" | "size" | "scent" …
  name: Localized;
  type: "swatch" | "pill";
  values: OptionValue[]; // only the values this product offers, in display order
}

export interface PriceInfo {
  // Not populated in v1 (prices are not public). Kept so pricing can be
  // added without changing the model. See public.ts for client stripping.
  retail?: Money;
  wholesaleTiers?: { minQuantity: number; price: Money }[];
  visibility?: "public" | "wholesale-only" | "hidden";
}

export interface Variant {
  id: string; // stable; future cart/inventory key
  sku: string; // join key for a future POS/inventory integration
  optionValues: Record<string, string>; // { color: "navy", size: "queen" }
  available: boolean; // manual on/off; no stock counts in v1
  barcode?: string;
  price?: PriceInfo;
}

export type PackagingUnit = "piece" | "pack" | "case" | "set" | "dozen";

export interface Packaging {
  unit: PackagingUnit;
  unitsPerPack?: number; // e.g. case of 12
  quantityStep: number; // order in multiples of this (default 1)
  minQuantity?: number; // rarely used; wholesale minimum is order-level
}

export type ProductStatus = "active" | "draft" | "archived";

export interface Product {
  id: string;
  slug: string;
  status: ProductStatus;
  name: Localized;
  shortDescription?: Localized;
  description: Localized;
  brandId?: string; // the product's own brand — never the store
  categoryIds: string[]; // first = primary (breadcrumbs, canonical)
  tags: string[];
  options: ProductOption[];
  variants: Variant[]; // ≥ 1
  images: ProductImage[];
  packaging?: Packaging;
  price?: PriceInfo;
  attributes: { label: Localized; value: Localized }[];
  featured: boolean;
  seo?: { title?: Localized; description?: Localized };
  createdAt: string; // YYYY-MM-DD
  updatedAt: string; // YYYY-MM-DD
}

export interface Catalog {
  categories: Category[];
  brands: Brand[];
  /** Every product, including drafts and archived ones. */
  products: Product[];
}
