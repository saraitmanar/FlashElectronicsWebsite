/**
 * Photo naming convention (photos/<product-slug>/<name>.jpg):
 *
 *   navy-1.jpg         → tagged { color: "navy" }, order 1
 *   navy-queen-2.jpg   → tagged { color: "navy", size: "queen" }, order 2
 *   light-blue-1.jpg   → value ids may contain dashes
 *   main-1.jpg         → general photo shown first for every variant
 *   detail-1.jpg       → general photo (also: lifestyle, pack, back, …)
 */

/** Names for photos that apply to every variant. "main" sorts first. */
export const GENERIC_IMAGE_NAMES = [
  "main",
  "front",
  "back",
  "side",
  "detail",
  "lifestyle",
  "pack",
  "packaging",
  "box",
  "label",
  "size-chart",
] as const;

export interface OptionForMatching {
  id: string;
  values: { id: string }[];
}

export interface ParsedImageName {
  base: string; // file name without extension
  order: number;
  kind: "main" | "tagged" | "generic" | "unknown";
  optionValues?: Record<string, string>;
}

export function stripExtension(file: string) {
  return file.replace(/\.[^.]+$/, "");
}

export function parseImageName(file: string, options: OptionForMatching[]): ParsedImageName {
  const base = stripExtension(file).toLowerCase();
  const m = base.match(/^(.*?)(?:-(\d+))?$/);
  const rest = m?.[1] ?? base;
  const order = m?.[2] ? Number(m[2]) : 1;

  if (rest === "main") return { base, order, kind: "main" };
  if ((GENERIC_IMAGE_NAMES as readonly string[]).includes(rest)) {
    return { base, order, kind: "generic" };
  }

  const optionValues = matchOptionValues(rest, options, {});
  if (optionValues) return { base, order, kind: "tagged", optionValues };
  return { base, order, kind: "unknown" };
}

/** Splits "navy-queen" into option values, trying every option once. */
function matchOptionValues(
  rest: string,
  options: OptionForMatching[],
  found: Record<string, string>,
): Record<string, string> | null {
  if (rest === "") return Object.keys(found).length ? found : null;
  for (const option of options) {
    if (option.id in found) continue;
    for (const value of option.values) {
      if (rest === value.id || rest.startsWith(`${value.id}-`)) {
        const next = matchOptionValues(rest.slice(value.id.length).replace(/^-/, ""), options, {
          ...found,
          [option.id]: value.id,
        });
        if (next) return next;
      }
    }
  }
  return null;
}

/** Sort key: main photos, then tagged photos in option-value order, then the rest. */
export function imageSortKey(parsed: ParsedImageName, options: OptionForMatching[]): number[] {
  const group = { main: 0, tagged: 1, generic: 2, unknown: 3 }[parsed.kind];
  const valueRanks = options.map((option) => {
    const valueId = parsed.optionValues?.[option.id];
    const index = valueId ? option.values.findIndex((v) => v.id === valueId) : -1;
    return index === -1 ? 999 : index;
  });
  return [group, ...valueRanks, parsed.order];
}

export function compareSortKeys(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
