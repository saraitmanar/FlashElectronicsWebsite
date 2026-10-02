/**
 * npm run content:check   — validate everything in /content
 *   --quiet               — only print errors and a one-line summary (used before builds)
 *
 * Exits with code 1 when there are errors, which stops `npm run build`.
 */
import { formatIssues, loadCatalogFromDisk } from "@/lib/catalog/load-content";

const quiet = process.argv.includes("--quiet");
const { catalog, errors, warnings } = loadCatalogFromDisk();

const count = (status: string) => catalog.products.filter((p) => p.status === status).length;
const variants = catalog.products.reduce((n, p) => n + p.variants.length, 0);
const photos = catalog.products.reduce((n, p) => n + p.images.length, 0);

if (!quiet && warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s):\n${formatIssues(warnings)}`);
}
if (errors.length) {
  console.error(`\n✖ ${errors.length} error(s):\n${formatIssues(errors)}\n`);
}

console.log(
  `\nCatalog: ${catalog.products.length} products (${count("active")} active, ${count("draft")} draft, ${count("archived")} archived), ` +
    `${variants} variants, ${photos} photos, ${catalog.categories.length} categories, ${catalog.brands.length} brands.` +
    (quiet && warnings.length
      ? ` ${warnings.length} warning(s): run npm run content:check to see them.`
      : ""),
);

if (errors.length) process.exit(1);
console.log("✓ Content is valid.\n");
