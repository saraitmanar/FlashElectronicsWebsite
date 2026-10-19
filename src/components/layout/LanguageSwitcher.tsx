"use client";

import clsx from "clsx";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { usePathname } from "@/i18n/navigation";
import { localizedPath } from "@/i18n/paths";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher({
  tone = "dark",
  className,
}: {
  /** "dark" for use on the navy header, "light" on light backgrounds. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const t = useTranslations("LanguageSwitcher");
  const current = useLocale();
  const pathname = usePathname(); // without locale prefix
  const router = useRouter();

  // Plain links work without JS and are crawlable; with JS we also keep the
  // query string (e.g. a selected color) when switching.
  function keepQuery(event: MouseEvent<HTMLAnchorElement>, href: string) {
    const search = window.location.search;
    if (!search) return;
    event.preventDefault();
    router.push(`${href}${search}`);
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={clsx(
        "flex items-center rounded-full p-0.5 text-xs font-semibold",
        tone === "dark" ? "bg-white/10" : "bg-primary-soft",
        className,
      )}
    >
      {routing.locales.map((locale) => {
        const active = locale === current;
        const href = localizedPath(pathname, locale);
        return (
          <NextLink
            key={locale}
            href={href}
            lang={locale}
            hrefLang={locale}
            aria-current={active ? "true" : undefined}
            title={t(locale)}
            onClick={(event) => keepQuery(event, href)}
            className={clsx(
              "rounded-full px-2.5 py-1 uppercase transition-colors",
              active
                ? "bg-accent text-on-accent"
                : tone === "dark"
                  ? "text-on-primary-muted hover:text-on-primary"
                  : "text-ink-muted hover:text-primary",
            )}
          >
            {locale}
          </NextLink>
        );
      })}
    </div>
  );
}
