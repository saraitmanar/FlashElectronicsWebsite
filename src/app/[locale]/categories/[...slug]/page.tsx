import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { CategoryChips } from "@/components/catalog/CategoryChips";
import { EmptyState } from "@/components/catalog/EmptyState";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Container } from "@/components/ui/Container";
import { routing, type Locale } from "@/i18n/routing";
import { catalog, productsInCategory, sortByNewest, type Category } from "@/lib/catalog";
import { localize } from "@/lib/i18n/localized";
import { alternatesFor } from "@/lib/seo/metadata";

type Props = PageProps<"/[locale]/categories/[...slug]">;

// Only categories from content/categories.yaml exist; anything else is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  const categories = await catalog.listCategories();
  return categories.map((c) => ({ slug: c.id.split("/") }));
}

async function load(slug: string[]) {
  const categories = await catalog.listCategories();
  const category = categories.find((c) => c.id === slug.join("/"));
  return { categories, category };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const { category } = await load(slug);
  if (!category) return {};
  return {
    title: localize(category.name, locale),
    description: category.description && localize(category.description, locale),
    alternates: alternatesFor(`/categories/${category.id}`, locale),
  };
}

/** Root → … → category, for breadcrumbs. */
function ancestry(categories: Category[], category: Category): Category[] {
  const chain = [category];
  let current = category;
  while (current.parentId) {
    const parent = categories.find((c) => c.id === current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { categories, category } = await load(slug);
  if (!category) notFound();
  const t = await getTranslations("Catalog");
  const [allProducts, brands] = await Promise.all([catalog.listProducts(), catalog.listBrands()]);
  const products = sortByNewest(productsInCategory(allProducts, categories, category.id));

  // Show subcategories; on a leaf category show its siblings instead.
  const children = categories.filter((c) => c.parentId === category.id);
  const chipsParentId = children.length ? category.id : category.parentId;
  const chips = chipsParentId ? categories.filter((c) => c.parentId === chipsParentId) : [];
  const chipsAllHref = chipsParentId ? `/categories/${chipsParentId}` : undefined;

  return (
    <Container className="py-8 sm:py-12">
      <Breadcrumbs
        locale={locale as Locale}
        items={[
          { label: t("allProducts"), href: "/products" },
          ...ancestry(categories, category).map((c) => ({
            label: localize(c.name, locale),
            href: `/categories/${c.id}`,
          })),
        ]}
      />
      <header className="mt-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {localize(category.name, locale)}
        </h1>
        {category.description && (
          <p className="max-w-3xl text-ink-muted">{localize(category.description, locale)}</p>
        )}
      </header>
      {chips.length > 0 && (
        <div className="mt-6">
          <CategoryChips
            categories={chips}
            activeId={children.length ? undefined : category.id}
            allHref={chipsAllHref}
            locale={locale}
          />
        </div>
      )}
      <p className="mt-6 mb-4 text-sm text-ink-muted">
        {t("productCount", { count: products.length })}
      </p>
      {products.length ? (
        <ProductGrid products={products} brands={brands} eagerCount={4} />
      ) : (
        <EmptyState />
      )}
    </Container>
  );
}
