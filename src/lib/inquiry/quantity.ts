import type { Packaging } from "@/lib/catalog/types";

export const MAX_QUANTITY = 9999;

/** Smallest quantity, and the step between quantities, for a product. */
export function quantityRules(packaging?: Packaging) {
  const step = Math.max(1, packaging?.quantityStep ?? 1);
  const min = Math.max(step, packaging?.minQuantity ?? step);
  return { min, step, max: MAX_QUANTITY };
}

/** Rounds a typed quantity to a valid one: at least `min`, a multiple of `step`. */
export function normalizeQuantity(value: number, packaging?: Packaging): number {
  const { min, step, max } = quantityRules(packaging);
  if (!Number.isFinite(value)) return min;
  const rounded = Math.ceil(Math.max(value, min) / step) * step;
  return Math.min(rounded, Math.floor(max / step) * step);
}
