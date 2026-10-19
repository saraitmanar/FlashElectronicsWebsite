import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import {
  buildFullListText,
  buildInquiryMessage,
  MAX_ENCODED_LENGTH,
  type Translate,
} from "./message";
import { normalizeQuantity, quantityRules } from "./quantity";
import { newReferenceCode } from "./reference";
import type { InquiryLine } from "./types";

const translator = (locale: "en" | "es") => {
  const t = createTranslator({ locale, messages: locale === "en" ? en : es });
  return ((key, values) => t(key as never, values as never)) as Translate;
};

const comforter: InquiryLine = {
  productId: "p_0002",
  variantId: "p_0002-navy-queen",
  quantity: 2,
  addedAt: "2026-10-02T00:00:00Z",
  snapshot: {
    slug: "comforter-set",
    name: { en: "Comforter Set", es: "Juego de edredón" },
    brand: "Acme",
    sku: "BED-CMF-NVY-QN",
    variantLabel: { en: "Navy / Queen", es: "Azul marino / Queen" },
    search: "color=navy&bed-size=queen",
    packaging: { unit: "set", quantityStep: 1 },
  },
};
const cleaner: InquiryLine = {
  productId: "p_0005",
  variantId: "p_0005-lemon",
  quantity: 3,
  addedAt: "2026-10-02T00:00:00Z",
  snapshot: {
    slug: "cleaner",
    name: { en: "Cleaner" },
    sku: "HH-APC-LEM",
    variantLabel: { en: "Lemon", es: "Limón" },
    search: "scent=lemon",
    packaging: { unit: "case", unitsPerPack: 12, quantityStep: 1 },
  },
};

const base = {
  reference: "FL-7K3Q",
  storeName: "Flash Electronics International",
  origin: "https://shop.example",
};

describe("quantity rules", () => {
  it("defaults to 1 and rounds up to the step", () => {
    expect(quantityRules()).toMatchObject({ min: 1, step: 1 });
    expect(normalizeQuantity(0)).toBe(1);
    expect(normalizeQuantity(7, { unit: "pack", quantityStep: 6 })).toBe(12);
    expect(normalizeQuantity(1, { unit: "case", quantityStep: 2, minQuantity: 4 })).toBe(4);
    expect(normalizeQuantity(Number.NaN)).toBe(1);
  });
});

describe("reference code", () => {
  it("looks like FL-XXXX without ambiguous characters", () => {
    expect(newReferenceCode()).toMatch(/^FL-[2-9A-HJKMNP-Z]{4}$/);
  });
});

describe("buildInquiryMessage", () => {
  it("writes a complete English message with links, quantities and details", () => {
    const { text, omitted, shortened } = buildInquiryMessage({
      ...base,
      locale: "en",
      t: translator("en"),
      lines: [comforter, cleaner],
      details: {
        buyerType: "wholesale",
        name: "María",
        business: "Tienda La Esquina",
        fulfillment: "delivery",
        location: "Orlando, FL",
        zip: "32801",
        notes: "Need by Friday",
      },
    });
    expect(omitted).toBe(0);
    expect(shortened).toBe(false);
    expect(text).toBe(
      [
        "Hello Flash Electronics International! I'd like a quote for these products:",
        "Ref: FL-7K3Q · Wholesale inquiry",
        "",
        "1) Comforter Set (Acme) — Navy / Queen",
        "   SKU: BED-CMF-NVY-QN · Qty: 2 sets",
        "   https://shop.example/products/comforter-set?color=navy&bed-size=queen",
        "2) Cleaner — Lemon",
        "   SKU: HH-APC-LEM · Qty: 3 cases (36 pcs)",
        "   https://shop.example/products/cleaner?scent=lemon",
        "",
        "Name: María",
        "Business: Tienda La Esquina",
        "Fulfillment: Delivery — Orlando, FL 32801",
        "Notes: Need by Friday",
      ].join("\n"),
    );
  });

  it("writes Spanish with Spanish product text, falling back to English", () => {
    const { text } = buildInquiryMessage({
      ...base,
      locale: "es",
      t: translator("es"),
      lines: [cleaner],
      details: { buyerType: "retail", fulfillment: "pickup", business: "ignored for retail" },
    });
    expect(text).toContain("¡Hola Flash Electronics International!");
    expect(text).toContain("Ref: FL-7K3Q · Consulta al detal");
    expect(text).toContain("1) Cleaner — Limón");
    expect(text).toContain("Cant.: 3 cajas (36 pzs)");
    expect(text).toContain("https://shop.example/es/products/cleaner?scent=lemon");
    expect(text).toContain("Entrega: Recoger en la tienda de Miami");
    expect(text).not.toContain("ignored for retail");
  });

  it("shortens long lists: first links, then details, then leaves items out", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      ...comforter,
      variantId: `v${i}`,
      snapshot: { ...comforter.snapshot, sku: `SKU-${i}` },
    }));
    const result = buildInquiryMessage({
      ...base,
      locale: "en",
      t: translator("en"),
      lines: many,
      details: {},
    });
    expect(encodeURIComponent(result.text).length).toBeLessThanOrEqual(MAX_ENCODED_LENGTH);
    expect(result.shortened).toBe(true);
    expect(result.omitted).toBeGreaterThan(0);
    expect(result.text).not.toContain("https://");
    expect(result.text).toContain(`and ${result.omitted} more items`);

    const full = buildFullListText({
      ...base,
      locale: "en",
      t: translator("en"),
      lines: many,
      details: {},
    });
    expect(full).toContain("60) Comforter Set");
  });

  it("drops only the links when that is enough", () => {
    const some = Array.from({ length: 12 }, (_, i) => ({ ...comforter, variantId: `v${i}` }));
    const result = buildInquiryMessage({
      ...base,
      locale: "en",
      t: translator("en"),
      lines: some,
      details: {},
    });
    expect(result).toMatchObject({ omitted: 0, shortened: true });
    expect(result.text).not.toContain("https://");
    expect(result.text).toContain("SKU: BED-CMF-NVY-QN · Qty: 2 sets");
  });
});
