/**
 * Builds the WhatsApp message for an inquiry list, in the visitor's
 * language. Pure function: translations come in through `t`.
 */
import { localizedPath } from "@/i18n/paths";
import type { Locale } from "@/i18n/routing";
import type { Packaging } from "@/lib/catalog/types";
import { localize } from "@/lib/i18n/localized";
import type { InquiryDetails, InquiryLine } from "./types";

/** Root-level translator (keys like "InquiryMessage.greeting", "Units.case"). */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Keep the pre-filled wa.me link comfortably short: very long links can fail
 * to open in some phones and browsers. Measured on the URL-encoded text.
 */
export const MAX_ENCODED_LENGTH = 2000;

export interface BuildMessageInput {
  lines: InquiryLine[];
  details: InquiryDetails;
  reference: string | null;
  locale: Locale;
  storeName: string;
  /** e.g. "https://www.example.com"; product links are omitted when empty. */
  origin: string;
  t: Translate;
}

export interface BuiltMessage {
  text: string;
  /** Lines left out to keep the message short (0 = complete list). */
  omitted: number;
  /** True when links or line details were removed to fit. */
  shortened: boolean;
}

/** "2 cases (24 pcs)", "3 pieces", "1 set" */
export function quantityText(t: Translate, quantity: number, packaging?: Packaging): string {
  const unit = packaging?.unit ?? "piece";
  const base = t(`Units.${unit}`, { count: quantity });
  if ((unit === "pack" || unit === "case") && packaging?.unitsPerPack) {
    return `${base} ${t("Units.pieces", { count: quantity * packaging.unitsPerPack })}`;
  }
  return base;
}

function productUrl(line: InquiryLine, locale: Locale, origin: string) {
  const path = localizedPath(`/products/${line.snapshot.slug}`, locale);
  return `${origin}${path}${line.snapshot.search ? `?${line.snapshot.search}` : ""}`;
}

function formatLine(
  line: InquiryLine,
  index: number,
  input: BuildMessageInput,
  style: { links: boolean; compact: boolean },
) {
  const { t, locale } = input;
  const name = localize(line.snapshot.name, locale);
  const variant = localize(line.snapshot.variantLabel, locale);
  const qty = quantityText(t, line.quantity, line.snapshot.packaging);
  const title = `${index + 1}) ${name}${variant ? ` — ${variant}` : ""}`;

  if (style.compact) return `${title} · ${line.snapshot.sku} · ${qty}`;

  const brand = line.snapshot.brand ? ` (${line.snapshot.brand})` : "";
  const rows = [
    `${index + 1}) ${name}${brand}${variant ? ` — ${variant}` : ""}`,
    `   ${t("InquiryMessage.sku")}: ${line.snapshot.sku} · ${t("InquiryMessage.qty")}: ${qty}`,
  ];
  if (style.links && input.origin) rows.push(`   ${productUrl(line, locale, input.origin)}`);
  return rows.join("\n");
}

function header(input: BuildMessageInput) {
  const { t, reference, details } = input;
  const meta = [
    reference ? t("InquiryMessage.reference", { code: reference }) : null,
    details.buyerType ? t(`InquiryMessage.${details.buyerType}`) : null,
  ].filter(Boolean);
  return [
    t("InquiryMessage.greeting", { store: input.storeName }),
    ...(meta.length ? [meta.join(" · ")] : []),
  ].join("\n");
}

function footer(input: BuildMessageInput) {
  const { t, details } = input;
  const clean = (s?: string) => s?.trim().replace(/\s+/g, " ") || "";
  const rows: string[] = [];
  if (clean(details.name)) rows.push(`${t("InquiryMessage.name")}: ${clean(details.name)}`);
  if (details.buyerType === "wholesale" && clean(details.business)) {
    rows.push(`${t("InquiryMessage.business")}: ${clean(details.business)}`);
  }
  if (details.fulfillment === "pickup") {
    rows.push(`${t("InquiryMessage.fulfillment")}: ${t("InquiryMessage.pickup")}`);
  } else if (details.fulfillment === "delivery") {
    const where = [clean(details.location), clean(details.zip)].filter(Boolean).join(" ");
    rows.push(
      `${t("InquiryMessage.fulfillment")}: ${t("InquiryMessage.delivery")}${where ? ` — ${where}` : ""}`,
    );
  }
  if (details.notes?.trim()) rows.push(`${t("InquiryMessage.notes")}: ${details.notes.trim()}`);
  return rows.join("\n");
}

function assemble(input: BuildMessageInput, lineTexts: string[], extra?: string) {
  return [header(input), [...lineTexts, ...(extra ? [extra] : [])].join("\n"), footer(input)]
    .filter(Boolean)
    .join("\n\n");
}

const fits = (text: string) => encodeURIComponent(text).length <= MAX_ENCODED_LENGTH;

export function buildInquiryMessage(input: BuildMessageInput): BuiltMessage {
  // Shorten step by step: drop product links, then put each product on one line.
  const styles = [
    { links: true, compact: false },
    { links: false, compact: false },
    { links: false, compact: true },
  ];
  for (const [i, style] of styles.entries()) {
    const text = assemble(
      input,
      input.lines.map((l, n) => formatLine(l, n, input, style)),
    );
    if (fits(text)) return { text, omitted: 0, shortened: i > 0 };
  }

  // Still too long: keep as many compact lines as fit and say how many are missing.
  const compact = input.lines.map((l, n) => formatLine(l, n, input, styles[2]));
  for (let keep = compact.length - 1; keep >= 1; keep--) {
    const omitted = compact.length - keep;
    const text = assemble(
      input,
      compact.slice(0, keep),
      input.t("InquiryMessage.moreItems", { count: omitted }),
    );
    if (fits(text)) return { text, omitted, shortened: true };
  }
  const omitted = compact.length - 1;
  return {
    text: assemble(
      input,
      compact.slice(0, 1),
      input.t("InquiryMessage.moreItems", { count: omitted }),
    ),
    omitted,
    shortened: true,
  };
}

/** The complete list, never shortened (for "Copy list"). */
export function buildFullListText(input: BuildMessageInput): string {
  return assemble(
    input,
    input.lines.map((l, n) => formatLine(l, n, input, { links: true, compact: false })),
  );
}
