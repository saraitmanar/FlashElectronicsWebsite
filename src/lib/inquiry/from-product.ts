import type { Product } from "@/lib/catalog/types";
import {
  findVariant,
  imagesForSelection,
  selectionLabel,
  selectionToSearch,
  type Selection,
} from "@/lib/catalog/variant-selection";
import type { InquiryLine } from "./types";

/** Builds an inquiry line (with display snapshot) for the selected variant. */
export function lineFromProduct(
  product: Product,
  selection: Selection,
  quantity: number,
  brandName?: string,
): Omit<InquiryLine, "addedAt"> {
  const variant = findVariant(product, selection) ?? product.variants[0];
  return {
    productId: product.id,
    variantId: variant.id,
    quantity,
    snapshot: {
      slug: product.slug,
      name: product.name,
      brand: brandName,
      sku: variant.sku,
      variantLabel: {
        en: selectionLabel(product, selection, "en"),
        es: selectionLabel(product, selection, "es"),
      },
      search: selectionToSearch(product, selection),
      imageSrc: imagesForSelection(product, selection)[0]?.src,
      packaging: product.packaging,
    },
  };
}
