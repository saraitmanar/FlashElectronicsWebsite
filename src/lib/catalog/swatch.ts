import type { OptionValue } from "./types";

const MULTICOLOR = "conic-gradient(#e74c3c, #f1c40f, #2ecc71, #3498db, #9b59b6, #e74c3c)";

/** CSS background for a color swatch: plain, split diagonally (two-tone) or rainbow. */
export function swatchBackground(swatch: OptionValue["swatch"]): string {
  if (!swatch?.hex) return MULTICOLOR;
  if (swatch.hex2) return `linear-gradient(135deg, ${swatch.hex} 50%, ${swatch.hex2} 50%)`;
  return swatch.hex;
}
