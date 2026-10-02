/**
 * Turns the raw /content files into the runtime catalog (types.ts) and
 * reports problems. Pure function: no file system access, easy to test.
 *
 * Errors make the build fail. Warnings are printed by `npm run content:check`
 * (e.g. missing Spanish text, products without photos).
 */
import { z } from "zod";
import {
  brandsFileSchema,
  categoriesFileSchema,
  imageManifestSchema,
  optionLibrarySchema,
  productFileSchema,
  type CategoryInput,
  type ImageManifest,
  type OptionLibrary,
  type ProductFile,
} from "./authoring-schema";
import { compareSortKeys, imageSortKey, parseImageName, stripExtension } from "./image-names";
import type {
  Brand,
  Catalog,
  Category,
  Localized,
  Product,
  ProductImage,
  ProductOption,
  Variant,
} from "./types";

export interface RawContent {
  categories: { file: string; data: unknown };
  brands: { file: string; data: unknown };
  /** Keyed by option id (file name), e.g. "color" → content/options/color.yaml */
  options: Record<string, { file: string; data: unknown }>;
  products: { file: string; data: unknown }[];
  manifest: { file: string; data: unknown } | null;
}

export interface Issue {
  file: string;
  message: string;
}

export interface NormalizeResult {
  catalog: Catalog;
  errors: Issue[];
  warnings: Issue[];
}

const MAX_OPTIONS = 3;

export function normalizeCatalog(raw: RawContent): NormalizeResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const error = (file: string, message: string) => errors.push({ file, message });
  const warn = (file: string, message: string) => warnings.push({ file, message });

  function parse<T>(schema: z.ZodType<T>, file: string, data: unknown): T | null {
    const result = schema.safeParse(data);
    if (result.success) return result.data;
    for (const issue of result.error.issues) {
      const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
      error(file, `${where}${issue.message}`);
    }
    return null;
  }

  // ─── Categories ─────────────────────────────────────────────────────────
  const categories: Category[] = [];
  const categoryInputs =
    parse(categoriesFileSchema, raw.categories.file, raw.categories.data) ?? [];
  const walk = (nodes: CategoryInput[], parentId?: string) => {
    for (const node of nodes) {
      const id = parentId ? `${parentId}/${node.id}` : node.id;
      if (categories.some((c) => c.id === id))
        error(raw.categories.file, `duplicate category "${id}"`);
      categories.push({
        id,
        slug: node.id,
        parentId,
        name: node.name,
        description: node.description,
        sortOrder: categories.length,
      });
      if (node.children) walk(node.children, id);
    }
  };
  walk(categoryInputs);
  const categoryIds = new Set(categories.map((c) => c.id));

  // ─── Brands ─────────────────────────────────────────────────────────────
  const brands: Brand[] = [];
  for (const b of parse(brandsFileSchema, raw.brands.file, raw.brands.data) ?? []) {
    if (brands.some((x) => x.id === b.id)) error(raw.brands.file, `duplicate brand "${b.id}"`);
    brands.push({ id: b.id, slug: b.id, name: b.name, description: b.description });
  }
  const brandIds = new Set(brands.map((b) => b.id));

  // ─── Option libraries ───────────────────────────────────────────────────
  const libraries = new Map<string, OptionLibrary>();
  for (const [optionId, { file, data }] of Object.entries(raw.options)) {
    const library = parse(optionLibrarySchema, file, data);
    if (!library) continue;
    checkUniqueValues(library.values, file, error);
    libraries.set(optionId, library);
  }

  // ─── Image manifest ─────────────────────────────────────────────────────
  let manifest: ImageManifest = { version: 1, products: {} };
  if (raw.manifest) {
    manifest = parse(imageManifestSchema, raw.manifest.file, raw.manifest.data) ?? manifest;
  }

  // ─── Products ───────────────────────────────────────────────────────────
  const products: Product[] = [];
  const skuOwners = new Map<string, string>();

  for (const { file, data } of raw.products) {
    const input = parse(productFileSchema, file, data);
    if (!input) continue;

    const expectedFile = `${input.slug}.yaml`;
    if (!file.endsWith(`/${expectedFile}`) && file !== expectedFile) {
      error(file, `file name must match the slug: rename it to ${expectedFile}`);
    }
    if (products.some((p) => p.id === input.id)) error(file, `duplicate product id "${input.id}"`);
    if (products.some((p) => p.slug === input.slug)) error(file, `duplicate slug "${input.slug}"`);
    if (input.brand && !brandIds.has(input.brand)) {
      error(file, `unknown brand "${input.brand}" (add it to content/brands.yaml)`);
    }
    for (const c of input.categories) {
      if (!categoryIds.has(c)) error(file, `unknown category "${c}" (see content/categories.yaml)`);
    }

    const options = buildOptions(input, libraries, file, error);
    const variants = buildVariants(input, options, file, error);
    for (const v of variants) {
      const owner = skuOwners.get(v.sku);
      if (owner) error(file, `SKU "${v.sku}" is already used by ${owner}`);
      else skuOwners.set(v.sku, input.slug);
    }

    const images = buildImages(input, options, manifest.products[input.slug] ?? [], file, warn);

    if (input.status === "active" && /\bTODO\b/.test(JSON.stringify(input))) {
      error(file, 'still contains "TODO" text; finish it or keep status: draft');
    }
    if (!input.name.es) warn(file, "missing Spanish name (name.es)");
    if (!input.description.es) warn(file, "missing Spanish description (description.es)");
    if (images.length === 0 && input.status !== "archived") {
      warn(file, `no photos yet (add them to photos/${input.slug}/ and run npm run images:sync)`);
    }

    products.push({
      id: input.id,
      slug: input.slug,
      status: input.status,
      name: input.name,
      shortDescription: input.shortDescription,
      description: input.description,
      brandId: input.brand,
      categoryIds: input.categories,
      tags: input.tags ?? [],
      options,
      variants,
      images,
      packaging: input.packaging && {
        ...input.packaging,
        quantityStep: input.packaging.quantityStep ?? 1,
      },
      attributes: input.attributes ?? [],
      featured: input.featured ?? false,
      seo: input.seo,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt ?? input.createdAt,
    });
  }

  const productSlugs = new Set(products.map((p) => p.slug));
  for (const slug of Object.keys(manifest.products)) {
    if (!productSlugs.has(slug)) {
      warn(raw.manifest?.file ?? "images manifest", `photos for unknown product "${slug}"`);
    }
  }

  return { catalog: { categories, brands, products }, errors, warnings };
}

function checkUniqueValues(
  values: { id: string; code: string }[],
  file: string,
  error: (file: string, message: string) => void,
) {
  const ids = new Set<string>();
  const codes = new Set<string>();
  for (const v of values) {
    if (ids.has(v.id)) error(file, `duplicate value "${v.id}"`);
    if (codes.has(v.code)) error(file, `duplicate code "${v.code}"`);
    ids.add(v.id);
    codes.add(v.code);
  }
}

function buildOptions(
  input: ProductFile,
  libraries: Map<string, OptionLibrary>,
  file: string,
  error: (file: string, message: string) => void,
): ProductOption[] {
  const entries = Object.entries(input.options ?? {});
  if (entries.length > MAX_OPTIONS) error(file, `at most ${MAX_OPTIONS} options are supported`);

  const options: ProductOption[] = [];
  for (const [optionId, spec] of entries) {
    if (Array.isArray(spec)) {
      const library = libraries.get(optionId);
      if (!library) {
        error(
          file,
          `options.${optionId}: no library content/options/${optionId}.yaml (or define it inline)`,
        );
        continue;
      }
      if (new Set(spec).size !== spec.length) error(file, `options.${optionId}: duplicate values`);
      const values = spec.flatMap((valueId) => {
        const value = library.values.find((v) => v.id === valueId);
        if (!value) {
          error(
            file,
            `options.${optionId}: unknown value "${valueId}" (add it to content/options/${optionId}.yaml)`,
          );
          return [];
        }
        return [value];
      });
      options.push({
        id: optionId,
        name: library.name,
        type: library.type,
        values: values.map(toOptionValue),
      });
    } else {
      checkUniqueValues(spec.values, `${file} (options.${optionId})`, error);
      options.push({
        id: optionId,
        name: spec.name,
        type: spec.type,
        values: spec.values.map(toOptionValue),
      });
    }
  }
  return options;
}

function toOptionValue(v: OptionLibrary["values"][number]) {
  return { id: v.id, code: v.code, label: v.label, swatch: v.hex ? { hex: v.hex } : undefined };
}

function buildVariants(
  input: ProductFile,
  options: ProductOption[],
  file: string,
  error: (file: string, message: string) => void,
): Variant[] {
  // Every combination of option values, in display order.
  let combos: Record<string, string>[] = [{}];
  for (const option of options) {
    combos = combos.flatMap((combo) => option.values.map((v) => ({ ...combo, [option.id]: v.id })));
  }

  const variants: Variant[] = combos.map((optionValues) => {
    const valueIds = options.map((o) => optionValues[o.id]);
    const codes = options.map((o) => o.values.find((v) => v.id === optionValues[o.id])!.code);
    return {
      id: valueIds.length ? `${input.id}-${valueIds.join("-")}` : input.id,
      sku: codes.length ? `${input.skuPrefix}-${codes.join("-")}` : input.skuPrefix,
      optionValues,
      available: true,
    };
  });

  for (const [index, exception] of (input.variants ?? []).entries()) {
    const where = `variants[${index}]`;
    let valid = true;
    for (const [optionId, valueId] of Object.entries(exception.match)) {
      const option = options.find((o) => o.id === optionId);
      if (!option) {
        error(file, `${where}.match: product has no option "${optionId}"`);
        valid = false;
      } else if (!option.values.some((v) => v.id === valueId)) {
        error(file, `${where}.match: "${valueId}" is not one of this product's ${optionId} values`);
        valid = false;
      }
    }
    if (!valid) continue;

    const matches = variants.filter((v) =>
      Object.entries(exception.match).every(([k, val]) => v.optionValues[k] === val),
    );
    if ((exception.sku || exception.barcode) && matches.length !== 1) {
      error(
        file,
        `${where}: sku/barcode must match exactly one variant (matches ${matches.length}); list every option in "match"`,
      );
      continue;
    }
    for (const v of matches) {
      if (exception.available !== undefined) v.available = exception.available;
      if (exception.sku) v.sku = exception.sku;
      if (exception.barcode) v.barcode = exception.barcode;
    }
  }

  return variants;
}

function buildImages(
  input: ProductFile,
  options: ProductOption[],
  manifestImages: ImageManifest["products"][string],
  file: string,
  warn: (file: string, message: string) => void,
): ProductImage[] {
  const parsed = manifestImages.map((img) => ({ img, name: parseImageName(img.file, options) }));

  for (const { img, name } of parsed) {
    if (name.kind === "unknown") {
      warn(
        file,
        `photo "${img.file}" doesn't match an option value or a general name (main, detail, …); it will be shown for all variants`,
      );
    }
  }

  parsed.sort(
    (a, b) =>
      compareSortKeys(imageSortKey(a.name, options), imageSortKey(b.name, options)) ||
      a.name.base.localeCompare(b.name.base),
  );

  return parsed.map(({ img, name }, sortOrder) => {
    const key = stripExtension(img.file);
    return {
      id: `${input.id}-${name.base}`,
      src: img.src,
      width: img.width,
      height: img.height,
      blurDataURL: img.blurDataURL,
      optionValues: name.optionValues,
      sortOrder,
      alt: input.imageAlt?.[key] ?? altText(input.name, options, name.optionValues),
    };
  });
}

/** "Comforter Set – Navy / Queen", in both languages. */
function altText(
  name: Localized,
  options: ProductOption[],
  optionValues?: Record<string, string>,
): Localized {
  const describe = (lang: "en" | "es") => {
    const productName = (lang === "es" ? name.es : undefined) ?? name.en;
    const labels = options.flatMap((o) => {
      const value = o.values.find((v) => v.id === optionValues?.[o.id]);
      return value ? [(lang === "es" ? value.label.es : undefined) ?? value.label.en] : [];
    });
    return labels.length ? `${productName} – ${labels.join(" / ")}` : productName;
  };
  return { en: describe("en"), es: describe("es") };
}
