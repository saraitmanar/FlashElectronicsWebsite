import { siteConfig } from "@/lib/config/site";
import type { Product } from "./types";

/**
 * Removes data that must not reach the browser before passing a product to
 * a Client Component. While public prices are off, prices are stripped even
 * if they exist in the data, so they can't leak into the page source while
 * the UI shows "Ask for price".
 */
export function toPublicProduct(product: Product): Product {
  if (siteConfig.pricing.showPublicPrices) return product;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { price, ...rest } = product;
  return {
    ...rest,
    variants: product.variants.map((variant) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { price: _variantPrice, ...v } = variant;
      return v;
    }),
  };
}
