import type { Localized, Packaging } from "@/lib/catalog/types";

/**
 * One product + variant on the inquiry list. The same shape a cart line will
 * need for checkout later ({ variantId, quantity }), plus a snapshot so the
 * list renders instantly without loading the catalog.
 */
export interface InquiryLine {
  productId: string;
  variantId: string;
  quantity: number;
  snapshot: {
    slug: string;
    name: Localized;
    brand?: string;
    sku: string;
    variantLabel: Localized; // "" for products without options
    search: string; // "color=navy&bed-size=queen" to link back to the variant
    imageSrc?: string;
    packaging?: Packaging;
  };
  addedAt: string;
}

export type BuyerType = "retail" | "wholesale";
export type Fulfillment = "pickup" | "delivery";

export interface InquiryDetails {
  buyerType?: BuyerType;
  name?: string;
  business?: string;
  fulfillment?: Fulfillment;
  location?: string; // city, state for delivery
  zip?: string;
  notes?: string;
}
