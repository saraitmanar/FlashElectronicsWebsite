import { describe, expect, it } from "vitest";
import { normalizeCatalog, type RawContent } from "./normalize";

const colorLibrary = {
  name: { en: "Color", es: "Color" },
  type: "swatch",
  values: [
    { id: "navy", code: "NVY", label: { en: "Navy", es: "Azul marino" }, hex: "#1f2a44" },
    { id: "gray", code: "GRY", label: { en: "Gray", es: "Gris" } },
  ],
};
const sizeLibrary = {
  name: { en: "Bed size", es: "Tamaño" },
  type: "pill",
  values: [
    { id: "queen", code: "QN", label: { en: "Queen" } },
    { id: "king", code: "KG", label: { en: "King" } },
  ],
};

const baseProduct = {
  id: "p_0001",
  slug: "comforter-set",
  status: "active",
  categories: ["bedding"],
  name: { en: "Comforter Set", es: "Juego de edredón" },
  description: { en: "Soft.", es: "Suave." },
  skuPrefix: "BED-CMF",
  options: { color: ["navy", "gray"], "bed-size": ["queen", "king"] },
  createdAt: "2026-10-02",
};

function raw(products: unknown[], manifest: unknown = null): RawContent {
  return {
    categories: { file: "categories.yaml", data: [{ id: "bedding", name: { en: "Bedding" } }] },
    brands: { file: "brands.yaml", data: [{ id: "acme", name: "Acme" }] },
    options: {
      color: { file: "options/color.yaml", data: colorLibrary },
      "bed-size": { file: "options/bed-size.yaml", data: sizeLibrary },
    },
    products: products.map((data) => ({
      file: `content/products/${(data as { slug: string }).slug}.yaml`,
      data,
    })),
    manifest: manifest ? { file: "images.manifest.json", data: manifest } : null,
  };
}

const image = (file: string) => ({
  file,
  hash: "x",
  src: `/catalog/comforter-set/${file}`,
  width: 800,
  height: 1000,
  provider: "local",
});

describe("normalizeCatalog", () => {
  it("generates every option combination with SKUs from option codes", () => {
    const { catalog, errors } = normalizeCatalog(raw([baseProduct]));
    expect(errors).toEqual([]);
    const variants = catalog.products[0].variants;
    expect(variants.map((v) => v.sku)).toEqual([
      "BED-CMF-NVY-QN",
      "BED-CMF-NVY-KG",
      "BED-CMF-GRY-QN",
      "BED-CMF-GRY-KG",
    ]);
    expect(variants[0]).toMatchObject({
      id: "p_0001-navy-queen",
      optionValues: { color: "navy", "bed-size": "queen" },
      available: true,
    });
    expect(catalog.products[0].options[0].values[0].swatch).toEqual({ hex: "#1f2a44" });
  });

  it("applies exceptions: partial matches for availability, exact matches for SKUs", () => {
    const { catalog, errors } = normalizeCatalog(
      raw([
        {
          ...baseProduct,
          variants: [
            { match: { color: "gray" }, available: false },
            { match: { color: "navy", "bed-size": "king" }, sku: "POS-123", barcode: "0123" },
          ],
        },
      ]),
    );
    expect(errors).toEqual([]);
    const bySku = Object.fromEntries(catalog.products[0].variants.map((v) => [v.sku, v]));
    expect(bySku["BED-CMF-GRY-QN"].available).toBe(false);
    expect(bySku["BED-CMF-GRY-KG"].available).toBe(false);
    expect(bySku["POS-123"]).toMatchObject({ barcode: "0123", available: true });
  });

  it("gives a product without options a single variant using the SKU prefix", () => {
    const { catalog } = normalizeCatalog(raw([{ ...baseProduct, options: undefined }]));
    expect(catalog.products[0].variants).toEqual([
      { id: "p_0001", sku: "BED-CMF", optionValues: {}, available: true },
    ]);
  });

  it("supports inline options", () => {
    const { catalog, errors } = normalizeCatalog(
      raw([
        {
          ...baseProduct,
          options: {
            scent: {
              name: { en: "Scent" },
              values: [{ id: "lemon", code: "LEM", label: { en: "Lemon" } }],
            },
          },
        },
      ]),
    );
    expect(errors).toEqual([]);
    expect(catalog.products[0].options[0]).toMatchObject({ id: "scent", type: "pill" });
    expect(catalog.products[0].variants[0].sku).toBe("BED-CMF-LEM");
  });

  it("reports unknown references and duplicate SKUs", () => {
    const { errors } = normalizeCatalog(
      raw([
        {
          ...baseProduct,
          brand: "nope",
          categories: ["missing"],
          options: { color: ["navy", "purple"] },
        },
        {
          ...baseProduct,
          id: "p_0002",
          slug: "other",
          skuPrefix: "BED-CMF",
          options: { color: ["navy"] },
        },
      ]),
    );
    const messages = errors.map((e) => e.message).join("\n");
    expect(messages).toMatch(/unknown brand "nope"/);
    expect(messages).toMatch(/unknown category "missing"/);
    expect(messages).toMatch(/unknown value "purple"/);
    expect(messages).toMatch(/SKU "BED-CMF-NVY" is already used/);
  });

  it("requires sku overrides to target exactly one variant", () => {
    const { errors } = normalizeCatalog(
      raw([{ ...baseProduct, variants: [{ match: { color: "navy" }, sku: "X" }] }]),
    );
    expect(errors[0].message).toMatch(/must match exactly one variant \(matches 2\)/);
  });

  it("rejects misspelled fields and file names that don't match the slug", () => {
    const { errors } = normalizeCatalog({
      ...raw([]),
      products: [{ file: "content/products/wrong.yaml", data: { ...baseProduct, colour: "x" } }],
    });
    const messages = errors.map((e) => e.message).join("\n");
    expect(messages).toMatch(/colour/);
  });

  it("blocks TODO text on active products only", () => {
    const todo = { ...baseProduct, description: { en: "TODO: describe" } };
    expect(normalizeCatalog(raw([todo])).errors[0].message).toMatch(/TODO/);
    expect(normalizeCatalog(raw([{ ...todo, status: "draft" }])).errors).toEqual([]);
  });

  it("orders and tags photos and generates alt text in both languages", () => {
    const manifest = {
      version: 1,
      products: {
        "comforter-set": [
          image("gray-1.jpg"),
          image("detail-1.jpg"),
          image("navy-1.jpg"),
          image("main-1.jpg"),
        ],
      },
    };
    const { catalog, warnings } = normalizeCatalog(raw([baseProduct], manifest));
    const images = catalog.products[0].images;
    expect(images.map((i) => i.id)).toEqual([
      "p_0001-main-1",
      "p_0001-navy-1",
      "p_0001-gray-1",
      "p_0001-detail-1",
    ]);
    expect(images[1]).toMatchObject({
      optionValues: { color: "navy" },
      alt: { en: "Comforter Set – Navy", es: "Juego de edredón – Azul marino" },
    });
    expect(images[0].alt).toEqual({ en: "Comforter Set", es: "Juego de edredón" });
    expect(warnings.some((w) => w.message.includes("no photos"))).toBe(false);
  });

  it("warns about missing Spanish text and missing photos", () => {
    const { warnings } = normalizeCatalog(
      raw([{ ...baseProduct, name: { en: "Only English" }, description: { en: "x" } }]),
    );
    const messages = warnings.map((w) => w.message).join("\n");
    expect(messages).toMatch(/missing Spanish name/);
    expect(messages).toMatch(/missing Spanish description/);
    expect(messages).toMatch(/no photos yet/);
  });
});
