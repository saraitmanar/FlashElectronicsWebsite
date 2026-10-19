"use client";

import clsx from "clsx";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Packaging } from "@/lib/catalog/types";
import { normalizeQuantity, quantityRules } from "@/lib/inquiry/quantity";

/** − [ 12 ] + with pack/case steps; typed values are rounded on blur. */
export function QuantityStepper({
  value,
  onChange,
  packaging,
  label,
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  packaging?: Packaging;
  label: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("Inquiry");
  const { min, step, max } = quantityRules(packaging);
  const [draft, setDraft] = useState(String(value));
  // Keep the text box in sync when the value changes elsewhere.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDraft(String(value)), [value]);

  const commit = (next: number) => {
    const normalized = normalizeQuantity(next, packaging);
    setDraft(String(normalized));
    if (normalized !== value) onChange(normalized);
  };

  const button = clsx(
    "grid shrink-0 place-items-center text-primary transition-colors hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-40",
    size === "sm" ? "size-8" : "size-11",
  );

  return (
    <div
      className={clsx(
        "inline-flex items-center overflow-hidden rounded-full border border-line bg-surface",
        size === "sm" ? "h-8" : "h-11",
      )}
    >
      <button
        type="button"
        className={button}
        onClick={() => commit(value - step)}
        disabled={value <= min}
        aria-label={t("decrease")}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(Number(draft))}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(Number(draft));
        }}
        className={clsx(
          "h-full [appearance:textfield] bg-transparent text-center font-semibold text-ink tabular-nums outline-none focus-visible:bg-accent-soft [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          size === "sm" ? "w-10 text-sm" : "w-14",
        )}
      />
      <button
        type="button"
        className={button}
        onClick={() => commit(value + step)}
        disabled={value + step > max}
        aria-label={t("increase")}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
