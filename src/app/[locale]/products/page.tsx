import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryChips } from "@/components/catalog/CategoryChips";
import { EmptyState } from "@/components/catalog/EmptyState";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Container } from "@/components/ui/Container";
import { routing } from "@/i18n/routing";
import { catalog, sortByNewest } from "@/lib/catalog";
import { alternatesFor } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Catalog" });
  return {
    title: t("allProducts"),
    description: t("allProductsIntro"),
    alternates: alternatesFor("/products", locale),
  };
}

export default async function ProductsPage({ params }: PageProps<"/[locale]/products">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return null;
  setRequestLocale(locale);
  const t = await getTranslations("Catalog");

  const [products, categories, brands] = await Promise.all([
    catalog.listProducts(),
    catalog.listCategories(),
    catalog.listBrands(),
  ]);
  const sorted = sortByNewest(products);

  return (
    <Container className="py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("allProducts")}</h1>
        <p className="text-ink-muted">{t("allProductsIntro")}</p>
      </header>
      <div className="mt-6">
        <CategoryChips
          categories={categories.filter((c) => !c.parentId)}
          allHref="/products"
          locale={locale}
        />
      </div>
      <p className="mt-6 mb-4 text-sm text-ink-muted">
        {t("productCount", { count: sorted.length })}
      </p>
      {sorted.length ? (
        <ProductGrid products={sorted} brands={brands} eagerCount={4} />
      ) : (
        <EmptyState />
      )}
    </Container>
  );
}
