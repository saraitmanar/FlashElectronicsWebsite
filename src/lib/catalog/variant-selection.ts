/**
 * Pure helpers for the product page: which variant is selected, which
 * option values are available, which photos to show, and how the selection
 * is written to the URL (?color=navy&bed-size=queen).
 */
import type { Locale } from "@/i18n/routing";
import { localize } from "@/lib/i18n/localized";
import type { Product, ProductImage, Variant } from "./types";

export type Selection = Record<string, string>;

/** First available variant, or the first variant if none are available. */
export function defaultSelection(product: Product): Selection {
  const variant = product.variants.find((v) => v.available) ?? product.variants[0];
  return { ...(variant?.optionValues ?? {}) };
}

export function findVariant(product: Product, selection: Selection): Variant | undefined {
  return product.variants.find((v) =>
    product.options.every((o) => v.optionValues[o.id] === selection[o.id]),
  );
}

/** Would choosing `valueId` (keeping the other selected options) give an available variant? */
export function isValueAvailable(
  product: Product,
  selection: Selection,
  optionId: string,
  valueId: string,
): boolean {
  return findVariant(product, { ...selection, [optionId]: valueId })?.available ?? false;
}

/** Reads a selection from the URL, ignoring unknown options/values. */
export function parseSelection(product: Product, params: URLSearchParams): Selection {
  const selection = defaultSelection(product);
  for (const option of product.options) {
    const value = params.get(option.id);
    if (value && option.values.some((v) => v.id === value)) selection[option.id] = value;
  }
  return selection;
}

/** "color=navy&bed-size=queen" in option order ("" for products without options). */
export function selectionToSearch(product: Product, selection: Selection): string {
  const params = new URLSearchParams();
  for (const option of product.options) {
    if (selection[option.id]) params.set(option.id, selection[option.id]);
  }
  return params.toString();
}

/**
 * Photos for the selected variant: photos tagged with the selected values
 * first, then general photos. Photos of other colors are hidden. Falls back
 * to every photo if nothing matches.
 */
export function imagesForSelection(product: Product, selection: Selection): ProductImage[] {
  const matching = product.images.filter(
    (img) =>
      img.optionValues && Object.entries(img.optionValues).every(([k, v]) => selection[k] === v),
  );
  const general = product.images.filter((img) => !img.optionValues);
  const result = [...matching, ...general];
  return result.length ? result : product.images;
}

/** "Navy / Queen" in the given language ("" for products without options). */
export function selectionLabel(product: Product, selection: Selection, locale: Locale): string {
  return product.options
    .flatMap((o) => {
      const value = o.values.find((v) => v.id === selection[o.id]);
      return value ? [localize(value.label, locale)] : [];
    })
    .join(" / ");
}
