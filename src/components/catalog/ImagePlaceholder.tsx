import clsx from "clsx";
import { ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";

/** Shown until a product has photos. */
export function ImagePlaceholder({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("Catalog");
  return (
    <div
      className={clsx(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-soft text-navy-400",
        className,
      )}
    >
      <ImageOff className={compact ? "size-6" : "size-10"} strokeWidth={1.5} aria-hidden="true" />
      <span className={clsx("font-medium", compact ? "text-xs" : "text-sm")}>
        {t("photoComingSoon")}
      </span>
    </div>
  );
}
