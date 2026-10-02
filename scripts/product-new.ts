/**
 * npm run product:new
 *
 * Asks a few questions and creates content/products/<slug>.yaml with a new
 * product id, as a draft. Fill in the descriptions, add photos to
 * photos/<slug>/, run `npm run images:sync`, then set `status: active`.
 */
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { CONTENT_DIR, loadCatalogFromDisk, readRawContent } from "@/lib/catalog/load-content";
import { optionLibrarySchema, type OptionLibrary } from "@/lib/catalog/authoring-schema";

const rl = createInterface({ input, terminal: false });
// Reading lines through an iterator (instead of rl.question) also works when
// answers are piped in, e.g. from a script.
const lines = rl[Symbol.asyncIterator]();

async function ask(question: string, fallback = ""): Promise<string> {
  const hint = fallback ? ` [${fallback}]` : "";
  output.write(`${question}${hint}: `);
  const next = await lines.next();
  if (next.done) throw new Error("Input ended before all questions were answered.");
  const answer = String(next.value).trim();
  if (!input.isTTY) output.write(`${answer}\n`);
  return answer || fallback;
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** "Luxury 7-Piece Comforter Set" in bedding → "BED-L7PC" */
function suggestSkuPrefix(name: string, categoryId: string) {
  const category = categoryId
    .split("/")[0]
    .replace(/[^a-z]/g, "")
    .slice(0, 3)
    .toUpperCase();
  const initials = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 5);
  return `${category}-${initials || "ITEM"}`;
}

const q = (s: string) => JSON.stringify(s); // valid YAML double-quoted string

async function main() {
  const { catalog } = loadCatalogFromDisk();
  const raw = readRawContent();
  const libraries = new Map<string, OptionLibrary>();
  // Ask about color first, then the other option lists alphabetically.
  const optionEntries = Object.entries(raw.options).sort(
    ([a], [b]) => Number(b === "color") - Number(a === "color") || a.localeCompare(b),
  );
  for (const [id, { data }] of optionEntries) {
    const parsed = optionLibrarySchema.safeParse(data);
    if (parsed.success) libraries.set(id, parsed.data);
  }

  console.log("\nNew product — press Enter to accept the [suggestion].\n");

  // Name and slug
  let nameEn = "";
  while (!nameEn) nameEn = await ask("Name in English");
  const nameEs = await ask("Name in Spanish (optional)");
  let slug = slugify(nameEn);
  for (;;) {
    slug = slugify(await ask("URL slug", slug));
    const file = path.join(CONTENT_DIR, "products", `${slug}.yaml`);
    if (!slug) continue;
    if (existsSync(file) || catalog.products.some((p) => p.slug === slug)) {
      console.log(`  "${slug}" is already used. Choose another.`);
      continue;
    }
    break;
  }

  // Category
  console.log("\nCategories:");
  catalog.categories.forEach((c, i) => {
    const depth = c.id.split("/").length - 1;
    console.log(`  ${String(i + 1).padStart(2)}. ${"  ".repeat(depth)}${c.id}`);
  });
  let categoryId = "";
  while (!categoryId) {
    const answer = await ask("Category (number or id)");
    const byNumber = catalog.categories[Number(answer) - 1];
    categoryId = byNumber?.id ?? catalog.categories.find((c) => c.id === answer)?.id ?? "";
    if (!categoryId) console.log("  Not a category from the list.");
  }

  // Brand
  let brand = "";
  if (catalog.brands.length) {
    console.log(`\nBrands: ${catalog.brands.map((b) => b.id).join(", ")}`);
  }
  for (;;) {
    brand = await ask("Brand id (optional; add new brands to content/brands.yaml)");
    if (!brand || catalog.brands.some((b) => b.id === brand)) break;
    console.log(`  Unknown brand "${brand}".`);
  }

  // Options from the shared libraries
  const options: { id: string; values: string[] }[] = [];
  for (const [optionId, library] of libraries) {
    if (options.length === 3) break;
    for (;;) {
      const valid = library.values.map((v) => v.id);
      const answer = await ask(
        `\n${library.name.en} values, comma-separated (optional)\n  Available: ${valid.join(", ")}\n${optionId}`,
      );
      const values = answer
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const unknown = values.filter((v) => !valid.includes(v));
      if (unknown.length) {
        console.log(
          `  Unknown: ${unknown.join(", ")}. Add new values to content/options/${optionId}.yaml first.`,
        );
        continue;
      }
      if (values.length) options.push({ id: optionId, values: [...new Set(values)] });
      break;
    }
  }

  // Packaging
  const units = ["piece", "pack", "case", "set", "dozen"];
  let unit = "";
  while (!units.includes(unit))
    unit = (await ask(`\nSold by (${units.join(" / ")})`, "piece")).toLowerCase();
  let unitsPerPack = "";
  if (unit === "pack" || unit === "case") {
    while (!/^[1-9]\d*$/.test(unitsPerPack)) unitsPerPack = await ask(`Units per ${unit}`);
  }

  // SKU prefix
  const usedPrefixes = new Set(
    raw.products.map((p) => (p.data as { skuPrefix?: string })?.skuPrefix),
  );
  let skuPrefix = suggestSkuPrefix(nameEn, categoryId);
  for (;;) {
    skuPrefix = (
      await ask("SKU prefix (variant SKUs add option codes, e.g. -NVY-QN)", skuPrefix)
    ).toUpperCase();
    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(skuPrefix)) {
      console.log("  Use uppercase letters, numbers and dashes, e.g. BED-CMF7.");
      continue;
    }
    if (usedPrefixes.has(skuPrefix)) {
      console.log("  Another product already uses this prefix.");
      continue;
    }
    break;
  }

  // New id: highest existing number + 1
  const maxId = catalog.products.reduce((max, p) => Math.max(max, Number(p.id.slice(2)) || 0), 0);
  const id = `p_${String(maxId + 1).padStart(4, "0")}`;
  const today = new Date().toISOString().slice(0, 10);

  const lines = [
    `id: ${id}`,
    `slug: ${slug}`,
    `status: draft # change to "active" when ready to publish`,
    ...(brand ? [`brand: ${brand}`] : []),
    `categories: [${categoryId}]`,
    `name:`,
    `  en: ${q(nameEn)}`,
    nameEs ? `  es: ${q(nameEs)}` : `  # es: ""`,
    `description:`,
    `  en: |`,
    `    TODO: describe the product.`,
    `  # es: |`,
    `  #   TODO: descripción en español.`,
    `skuPrefix: ${skuPrefix}`,
    ...(options.length
      ? ["options:", ...options.map((o) => `  ${o.id}: [${o.values.join(", ")}]`)]
      : []),
    `# variants: # exceptions only, e.g.`,
    `#   - match: { color: navy }`,
    `#     available: false`,
    ...(unit !== "piece"
      ? [
          "packaging:",
          `  unit: ${unit}`,
          ...(unitsPerPack ? [`  unitsPerPack: ${unitsPerPack}`] : []),
        ]
      : []),
    `createdAt: ${today}`,
    ``,
  ];

  const file = path.join(CONTENT_DIR, "products", `${slug}.yaml`);
  writeFileSync(file, lines.join("\n"));

  const variantCount = options.reduce((n, o) => n * o.values.length, 1);
  console.log(
    `\n✓ Created ${path.relative(process.cwd(), file)} (${id}, ${variantCount} variant(s), draft)`,
  );
  console.log(`
Next steps:
  1. Fill in the description (and Spanish text) in the file.
  2. Add photos to photos/${slug}/, named like ${options.find((o) => o.id === "color")?.values[0] ?? "main"}-1.jpg
  3. npm run images:sync
  4. npm run content:check
  5. Set status: active when it's ready to go live.
`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
