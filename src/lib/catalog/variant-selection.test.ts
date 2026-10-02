import { describe, expect, it } from "vitest";
import type { Product } from "./types";
import {
  defaultSelection,
  findVariant,
  imagesForSelection,
  isValueAvailable,
  parseSelection,
  selectionLabel,
  selectionToSearch,
} from "./variant-selection";

const value = (id: string, en: string, es?: string) => ({
  id,
  code: id.toUpperCase(),
  label: { en, es },
});
const img = (id: string, optionValues?: Record<string, string>) => ({
  id,
  src: `/${id}.jpg`,
  width: 1,
  height: 1,
  alt: { en: id },
  sortOrder: 0,
  optionValues,
});

const product = {
  id: "p_1",
  slug: "set",
  status: "active",
  name: { en: "Set" },
  description: { en: "x" },
  categoryIds: ["bedding"],
  tags: [],
  attributes: [],
  featured: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  options: [
    {
      id: "color",
      name: { en: "Color" },
      type: "swatch",
      values: [value("navy", "Navy", "Azul marino"), value("gray", "Gray")],
    },
    {
      id: "size",
      name: { en: "Size" },
      type: "pill",
      values: [value("queen", "Queen"), value("king", "King")],
    },
  ],
  variants: [
    { id: "a", sku: "A", optionValues: { color: "navy", size: "queen" }, available: false },
    { id: "b", sku: "B", optionValues: { color: "navy", size: "king" }, available: true },
    { id: "c", sku: "C", optionValues: { color: "gray", size: "queen" }, available: true },
    { id: "d", sku: "D", optionValues: { color: "gray", size: "king" }, available: false },
  ],
  images: [
    img("main"),
    img("navy-1", { color: "navy" }),
    img("gray-1", { color: "gray" }),
    img("detail"),
  ],
} satisfies Product;

describe("variant selection", () => {
  it("defaults to the first available variant", () => {
    expect(defaultSelection(product)).toEqual({ color: "navy", size: "king" });
  });

  it("finds the exact variant", () => {
    expect(findVariant(product, { color: "gray", size: "queen" })?.sku).toBe("C");
  });

  it("reports availability of a value given the other selected options", () => {
    const sel = { color: "navy", size: "king" };
    expect(isValueAvailable(product, sel, "size", "queen")).toBe(false);
    expect(isValueAvailable(product, sel, "color", "gray")).toBe(false); // gray + king
    expect(isValueAvailable(product, { color: "gray", size: "queen" }, "color", "gray")).toBe(true);
  });

  it("reads valid values from the URL and ignores the rest", () => {
    const params = new URLSearchParams("color=gray&size=huge&other=1");
    expect(parseSelection(product, params)).toEqual({ color: "gray", size: "king" });
  });

  it("writes the selection in option order", () => {
    expect(selectionToSearch(product, { size: "queen", color: "gray" })).toBe(
      "color=gray&size=queen",
    );
  });

  it("shows the selected color's photos first, then general photos", () => {
    expect(imagesForSelection(product, { color: "gray", size: "king" }).map((i) => i.id)).toEqual([
      "gray-1",
      "main",
      "detail",
    ]);
  });

  it("labels the selection in each language with English fallback", () => {
    expect(selectionLabel(product, { color: "navy", size: "king" }, "es")).toBe(
      "Azul marino / King",
    );
  });
});
