"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { Product } from "@/lib/catalog/types";
import { isValueAvailable, type Selection } from "@/lib/catalog/variant-selection";
import { localize } from "@/lib/i18n/localized";

const MULTICOLOR = "conic-gradient(#e74c3c, #f1c40f, #2ecc71, #3498db, #9b59b6, #e74c3c)";

/**
 * One radio group per option (keyboard friendly). Unavailable values stay
 * selectable, shown struck through, so customers can still ask about them.
 */
export function VariantSelector({
  product,
  selection,
  onSelect,
  locale,
}: {
  product: Product;
  selection: Selection;
  onSelect: (optionId: string, valueId: string) => void;
  locale: Locale;
}) {
  const t = useTranslations("Product");

  return (
    <div className="flex flex-col gap-5">
      {product.options.map((option) => {
        const selected = option.values.find((v) => v.id === selection[option.id]);
        return (
          <fieldset key={option.id}>
            <legend className="mb-2.5 text-sm text-ink-muted">
              {localize(option.name, locale)}:{" "}
              <span className="font-semibold text-ink">
                {selected ? localize(selected.label, locale) : ""}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const checked = value.id === selection[option.id];
                const available = isValueAvailable(product, selection, option.id, value.id);
                const label = localize(value.label, locale);
                const accessibleLabel = available ? label : t("unavailableOption", { label });

                return (
                  <label key={value.id} className="relative cursor-pointer" title={accessibleLabel}>
                    <input
                      type="radio"
                      name={option.id}
                      value={value.id}
                      checked={checked}
                      onChange={() => onSelect(option.id, value.id)}
                      aria-label={accessibleLabel}
                      className="peer sr-only"
                    />
                    {option.type === "swatch" ? (
                      <span
                        className={clsx(
                          "relative block size-9 overflow-hidden rounded-full border border-black/15 ring-offset-2 ring-offset-canvas transition-shadow peer-focus-visible:ring-2 peer-focus-visible:ring-accent",
                          checked ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-navy-200",
                          !available && "opacity-50",
                        )}
                        style={{ background: value.swatch?.hex ?? MULTICOLOR }}
                      >
                        {!available && (
                          <span className="absolute top-1/2 left-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink" />
                        )}
                      </span>
                    ) : (
                      <span
                        className={clsx(
                          "inline-flex h-10 min-w-12 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2",
                          checked
                            ? "border-primary bg-primary text-on-primary"
                            : "border-line bg-surface text-ink hover:border-primary",
                          !available && "line-through decoration-1",
                          !available && !checked && "text-ink-subtle",
                        )}
                      >
                        {label}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
