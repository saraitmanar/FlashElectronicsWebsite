import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { Link } from "@/i18n/navigation";
import { localizedPath } from "@/i18n/paths";
import type { Locale } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export interface Crumb {
  label: string;
  href: string; // locale-less path, e.g. /categories/bedding
}

/** Breadcrumb trail plus BreadcrumbList structured data. The last crumb is the current page. */
export async function Breadcrumbs({ items, locale }: { items: Crumb[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Catalog" });
  const trail: Crumb[] = [{ label: t("home"), href: "/" }, ...items];

  return (
    <>
      <nav aria-label={t("breadcrumb")} className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {trail.map((crumb, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 text-ink-subtle" aria-hidden="true" />}
                {last ? (
                  <span aria-current="page" className="font-medium text-ink">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-primary hover:underline">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((crumb, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: crumb.label,
            item: absoluteUrl(localizedPath(crumb.href, locale)),
          })),
        }}
      />
    </>
  );
}
