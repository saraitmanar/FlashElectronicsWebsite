import type { Metadata } from "next";
import { localizedPath } from "@/i18n/paths";
import { routing, type Locale } from "@/i18n/routing";

/** Canonical + hreflang alternates for a page (relative to metadataBase). */
export function alternatesFor(pathname: string, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localizedPath(pathname, l);
  languages["x-default"] = localizedPath(pathname, routing.defaultLocale);

  return {
    canonical: localizedPath(pathname, locale),
    languages,
  };
}
