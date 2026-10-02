import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Brand, Product } from "@/lib/catalog/types";
import { localize } from "@/lib/i18n/localized";
import { CatalogImage } from "./CatalogImage";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { usePackagingLabel } from "./PackagingLabel";

const MAX_DOTS = 5;

export function ProductCard({
  product,
  brand,
  eager,
}: {
  product: Product;
  brand?: Brand;
  eager?: boolean;
}) {
  const t = useTranslations("Catalog");
  const locale = useLocale() as Locale;
  const packagingLabel = usePackagingLabel()(product.packaging);
  const image = product.images[0];
  const colors = product.options.find((o) => o.type === "swatch")?.values ?? [];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        {image ? (
          <CatalogImage
            image={image}
            locale={locale}
            eager={eager}
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <ImagePlaceholder compact />
        )}
        {product.status === "draft" && (
          <span className="absolute top-2 left-2 rounded-full bg-ink/80 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-white uppercase">
            {t("draft")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-line p-3 sm:p-4">
        {brand && (
          <p className="text-[0.7rem] font-semibold tracking-wider text-ink-subtle uppercase">
            {brand.name}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-ink group-hover:text-primary sm:text-[0.95rem]">
          {localize(product.name, locale)}
        </h3>

        {colors.length > 1 && (
          <div
            className="flex items-center gap-1.5"
            aria-label={t("colorCount", { count: colors.length })}
          >
            {colors.slice(0, MAX_DOTS).map((c) => (
              <span
                key={c.id}
                title={localize(c.label, locale)}
                className="size-3.5 rounded-full border border-black/15"
                style={{
                  background:
                    c.swatch?.hex ??
                    "conic-gradient(#e74c3c, #f1c40f, #2ecc71, #3498db, #9b59b6, #e74c3c)",
                }}
              />
            ))}
            {colors.length > MAX_DOTS && (
              <span className="text-xs text-ink-muted">
                {t("moreColors", { count: colors.length - MAX_DOTS })}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
          <span className="text-sm font-semibold text-accent-strong">{t("askForPrice")}</span>
          {packagingLabel && <span className="text-xs text-ink-muted">{packagingLabel}</span>}
        </div>
      </div>
    </Link>
  );
}
