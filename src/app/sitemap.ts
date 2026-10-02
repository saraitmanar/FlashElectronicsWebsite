import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/config/site-url";
import { localizedPath } from "@/i18n/paths";

// Static pages for now; categories, brands and products are added in Phase 2–3.
const STATIC_PATHS = ["/"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const abs = (path: string) => new URL(path, base).toString();

  return STATIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: abs(localizedPath(path, locale)),
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, abs(localizedPath(path, l))])),
      },
    })),
  );
}
