import { useTranslations } from "next-intl";
import type { Packaging } from "@/lib/catalog/types";

/** "Case of 12", "Sold as a set"… Nothing for items sold individually. */
export function usePackagingLabel() {
  const t = useTranslations("Packaging");
  return (packaging?: Packaging): string | null => {
    if (!packaging) return null;
    const { unit, unitsPerPack } = packaging;
    if (unit === "pack" || unit === "case") {
      return unitsPerPack ? t(unit, { count: unitsPerPack }) : t(`${unit}NoCount`);
    }
    if (unit === "set" || unit === "dozen") return t(unit);
    return null;
  };
}

export function PackagingDetails({ packaging }: { packaging?: Packaging }) {
  const t = useTranslations("Packaging");
  const label = usePackagingLabel()(packaging);
  const lines = [
    label,
    packaging && packaging.quantityStep > 1 ? t("step", { step: packaging.quantityStep }) : null,
    packaging?.minQuantity ? t("min", { count: packaging.minQuantity }) : null,
  ].filter(Boolean);
  if (!lines.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {lines.map((line) => (
        <li
          key={line}
          className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted"
        >
          {line}
        </li>
      ))}
    </ul>
  );
}
