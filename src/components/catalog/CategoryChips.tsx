import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Category } from "@/lib/catalog/types";
import { localize } from "@/lib/i18n/localized";

/** Horizontal, scrollable category links. `activeId` undefined = "All". */
export function CategoryChips({
  categories,
  activeId,
  allHref,
  locale,
}: {
  categories: Category[];
  activeId?: string;
  /** Adds a leading "All" chip linking here. */
  allHref?: string;
  locale: Locale;
}) {
  const t = useTranslations("Catalog");
  const chip = (active: boolean) =>
    clsx(
      "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors",
      active
        ? "border-primary bg-primary text-on-primary"
        : "border-line bg-surface text-ink hover:border-primary hover:text-primary",
    );

  return (
    <nav
      aria-label={t("categoriesLabel")}
      className="-mx-4 no-scrollbar overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex gap-2 pb-1">
        {allHref && (
          <li>
            <Link
              href={allHref}
              className={chip(!activeId)}
              aria-current={!activeId ? "page" : undefined}
            >
              {t("all")}
            </Link>
          </li>
        )}
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/categories/${c.id}`}
              className={chip(c.id === activeId)}
              aria-current={c.id === activeId ? "page" : undefined}
            >
              {localize(c.name, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
