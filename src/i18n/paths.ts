import { routing, type Locale } from "./routing";

/**
 * Public URL path for `pathname` in `locale`: English has no prefix,
 * Spanish is under /es. Used for language links so switching to English
 * goes straight to "/…" instead of "/en/…" plus a redirect.
 */
export function localizedPath(pathname: string, locale: Locale): string {
  const clean = pathname === "/" ? "" : pathname;
  if (locale === routing.defaultLocale) return clean || "/";
  return `/${locale}${clean}`;
}
