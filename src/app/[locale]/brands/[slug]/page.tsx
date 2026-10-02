import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Container } from "@/components/ui/Container";
import { routing } from "@/i18n/routing";
import { catalog, productsByBrand, sortByNewest } from "@/lib/catalog";
import { localize } from "@/lib/i18n/localized";
import { alternatesFor } from "@/lib/seo/metadata";

type Props = PageProps<"/[locale]/brands/[slug]">;

export const dynamicParams = false;

// Only brands that have products on the site get a page.
export async function generateStaticParams() {
  const [brands, products] = await Promise.all([catalog.listBrands(), catalog.listProducts()]);
  return brands
    .filter((b) => productsByBrand(products, b.id).length > 0)
    .map((b) => ({ slug: b.slug }));
}

async function load(slug: string) {
  const [brands, products] = await Promise.all([catalog.listBrands(), catalog.listProducts()]);
  const brand = brands.find((b) => b.slug === slug);
  return {
    brands,
    brand,
    products: brand ? sortByNewest(productsByBrand(products, brand.id)) : [],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const { brand } = await load(slug);
  if (!brand) return {};
  const t = await getTranslations({ locale, namespace: "Catalog" });
  return {
    title: t("brandTitle", { brand: brand.name }),
    description: brand.description && localize(brand.description, locale),
    alternates: alternatesFor(`/brands/${brand.slug}`, locale),
  };
}

export default async function BrandPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { brands, brand, products } = await load(slug);
  if (!brand || products.length === 0) notFound();
  const t = await getTranslations("Catalog");

  return (
    <Container className="py-8 sm:py-12">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t("allProducts"), href: "/products" },
          { label: brand.name, href: `/brands/${brand.slug}` },
        ]}
      />
      <header className="mt-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {t("brandTitle", { brand: brand.name })}
        </h1>
        {brand.description && (
          <p className="max-w-3xl text-ink-muted">{localize(brand.description, locale)}</p>
        )}
      </header>
      <p className="mt-6 mb-4 text-sm text-ink-muted">
        {t("productCount", { count: products.length })}
      </p>
      <ProductGrid products={products} brands={brands} eagerCount={4} />
    </Container>
  );
}
