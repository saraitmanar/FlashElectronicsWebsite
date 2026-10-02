/**
 * Reads the /content folder from disk. Used at build time by the site and
 * by the CLI scripts (content:check, product:new, images:sync).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { normalizeCatalog, type NormalizeResult, type RawContent } from "./normalize";

export const CONTENT_DIR = path.join(process.cwd(), "content");
export const MANIFEST_FILE = path.join(CONTENT_DIR, "images.manifest.json");

const rel = (file: string) => path.relative(process.cwd(), file);

function readYaml(file: string) {
  try {
    return parseYaml(readFileSync(file, "utf8"));
  } catch (err) {
    // Surface YAML syntax errors as content errors, with the file name.
    return { __yamlError: err instanceof Error ? err.message : String(err) };
  }
}

function yamlFiles(dir: string) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort()
    .map((f) => path.join(dir, f));
}

export function readRawContent(contentDir = CONTENT_DIR): RawContent {
  const categoriesFile = path.join(contentDir, "categories.yaml");
  const brandsFile = path.join(contentDir, "brands.yaml");
  const manifestFile = path.join(contentDir, "images.manifest.json");

  return {
    categories: { file: rel(categoriesFile), data: readYaml(categoriesFile) },
    brands: {
      file: rel(brandsFile),
      data: existsSync(brandsFile) ? (readYaml(brandsFile) ?? []) : [],
    },
    options: Object.fromEntries(
      yamlFiles(path.join(contentDir, "options")).map((file) => [
        path.basename(file).replace(/\.ya?ml$/, ""),
        { file: rel(file), data: readYaml(file) },
      ]),
    ),
    products: yamlFiles(path.join(contentDir, "products")).map((file) => ({
      file: rel(file),
      data: readYaml(file),
    })),
    manifest: existsSync(manifestFile)
      ? { file: rel(manifestFile), data: JSON.parse(readFileSync(manifestFile, "utf8")) }
      : null,
  };
}

export function loadCatalogFromDisk(contentDir = CONTENT_DIR): NormalizeResult {
  const raw = readRawContent(contentDir);
  const result = normalizeCatalog(raw);

  // YAML syntax errors show up as a fake object; report them clearly.
  const all = [raw.categories, raw.brands, ...Object.values(raw.options), ...raw.products];
  for (const { file, data } of all) {
    if (data && typeof data === "object" && "__yamlError" in data) {
      result.errors = result.errors.filter((e) => e.file !== file);
      result.errors.push({ file, message: `invalid YAML: ${String(data.__yamlError)}` });
    }
  }
  return result;
}

export function formatIssues(issues: { file: string; message: string }[]) {
  return issues.map((i) => `  ${i.file}: ${i.message}`).join("\n");
}
