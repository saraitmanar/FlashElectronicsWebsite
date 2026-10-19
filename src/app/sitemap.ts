import type { MetadataRoute } from "next";
import { localizedPath } from "@/i18n/paths";
import { routing } from "@/i18n/routing";
import { catalog, productsByBrand } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/config/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const abs = (path: string) => new URL(path, base).toString();

  const [categories, brands, products] = await Promise.all([
    catalog.listCategories(),
    catalog.listBrands(),
    catalog.listProducts(),
  ]);
  const published = products.filter((p) => p.status === "active");

  const entries: { path: string; lastModified?: string }[] = [
    { path: "/" },
    { path: "/products" },
    ...categories.map((c) => ({ path: `/categories/${c.id}` })),
    ...brands
      .filter((b) => productsByBrand(published, b.id).length > 0)
      .map((b) => ({ path: `/brands/${b.slug}` })),
    ...published.map((p) => ({ path: `/products/${p.slug}`, lastModified: p.updatedAt })),
  ];

  return entries.flatMap(({ path, lastModified }) =>
    routing.locales.map((locale) => ({
      url: abs(localizedPath(path, locale)),
      ...(lastModified && { lastModified }),
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, abs(localizedPath(path, l))])),
      },
    })),
  );
}
