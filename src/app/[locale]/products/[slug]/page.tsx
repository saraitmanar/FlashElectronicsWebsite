import { Info } from "lucide-react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ProductView } from "@/components/product/ProductView";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { localizedPath } from "@/i18n/paths";
import { routing } from "@/i18n/routing";
import { catalog, sortByNewest, type Category, type Product } from "@/lib/catalog";
import { toPublicProduct } from "@/lib/catalog/public";
import { defaultSelection, findVariant } from "@/lib/catalog/variant-selection";
import { localize } from "@/lib/i18n/localized";
import { absoluteUrl } from "@/lib/seo/absolute-url";
import { alternatesFor } from "@/lib/seo/metadata";

type Props = PageProps<"/[locale]/products/[slug]">;

export const dynamicParams = false;

export async function generateStaticParams() {
  // Archived products keep a page that redirects to their category.
  const [visible, archived] = await Promise.all([
    catalog.listProducts(),
    catalog.listArchivedProducts(),
  ]);
  return [...visible, ...archived].map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const product = await catalog.getProductBySlug(slug);
  if (!product || product.status === "archived") return {};

  const description = localize(
    product.seo?.description ?? product.shortDescription ?? product.description,
    locale,
  )
    .replace(/\s+/g, " ")
    .slice(0, 160);
  const image = product.images[0];
  return {
    title: localize(product.seo?.title ?? product.name, locale),
    description,
    alternates: alternatesFor(`/products/${product.slug}`, locale),
    openGraph: image
      ? {
          images: [
            {
              url: image.src,
              width: image.width,
              height: image.height,
              alt: localize(image.alt, locale),
            },
          ],
        }
      : undefined,
    robots: product.status === "draft" ? { index: false, follow: false } : undefined,
  };
}

/** Same-category products first, then from the parent category. */
function related(product: Product, products: Product[], categories: Category[], limit = 4) {
  const primary = categories.find((c) => c.id === product.categoryIds[0]);
  const groups = [
    new Set(product.categoryIds),
    new Set(primary?.parentId ? [primary.parentId] : []),
  ];
  const picked: Product[] = [];
  for (const group of groups) {
    for (const p of sortByNewest(products)) {
      if (picked.length >= limit) break;
      if (p.id === product.id || picked.includes(p)) continue;
      if (
        p.categoryIds.some((c) => group.has(c) || [...group].some((g) => c.startsWith(`${g}/`)))
      ) {
        picked.push(p);
      }
    }
  }
  return picked;
}

function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const product = await catalog.getProductBySlug(slug);
  if (!product) notFound();
  if (product.status === "archived") {
    permanentRedirect(localizedPath(`/categories/${product.categoryIds[0]}`, locale));
  }

  const t = await getTranslations("Product");
  const tCatalog = await getTranslations("Catalog");
  const [categories, brands, products] = await Promise.all([
    catalog.listCategories(),
    catalog.listBrands(),
    catalog.listProducts(),
  ]);
  const brand = brands.find((b) => b.id === product.brandId);
  const primary = categories.find((c) => c.id === product.categoryIds[0]);
  const parent = primary?.parentId ? categories.find((c) => c.id === primary.parentId) : undefined;
  const name = localize(product.name, locale);
  const relatedProducts = related(product, products, categories);
  const defaultVariant = findVariant(product, defaultSelection(product)) ?? product.variants[0];

  return (
    <>
      <Container className="py-6 sm:py-10">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: tCatalog("allProducts"), href: "/products" },
            ...[parent, primary]
              .filter((c): c is Category => Boolean(c))
              .map((c) => ({ label: localize(c.name, locale), href: `/categories/${c.id}` })),
            { label: name, href: `/products/${product.slug}` },
          ]}
        />

        {product.status === "draft" && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-accent-soft p-3 text-sm text-ink">
            <Info className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden="true" />
            {t("draftNotice")}
          </p>
        )}

        <div className="mt-6">
          <ProductView product={toPublicProduct(product)} brand={brand} />
        </div>

        <div className="mt-12 grid gap-10 border-t border-line pt-10 lg:grid-cols-2 lg:gap-12">
          <section>
            <h2 className="text-lg font-semibold text-primary">{t("description")}</h2>
            <div className="mt-3 flex flex-col gap-3 leading-relaxed text-ink">
              {paragraphs(localize(product.description, locale)).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
          {product.attributes.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-primary">{t("details")}</h2>
              <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
                {product.attributes.map((a) => (
                  <div
                    key={a.label.en}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm"
                  >
                    <dt className="text-ink-muted">{localize(a.label, locale)}</dt>
                    <dd className="font-medium text-ink">{localize(a.value, locale)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </Container>

      {relatedProducts.length > 0 && (
        <section className="mt-6 border-t border-line bg-canvas-deep">
          <Container className="py-12">
            <h2 className="mb-6 text-xl font-bold tracking-tight text-primary">{t("related")}</h2>
            <ProductGrid products={relatedProducts} brands={brands} />
          </Container>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name,
          description: localize(product.description, locale).replace(/\s+/g, " ").trim(),
          sku: defaultVariant.sku,
          ...(product.images.length && { image: product.images.map((i) => absoluteUrl(i.src)) }),
          ...(brand && { brand: { "@type": "Brand", name: brand.name } }),
          ...(primary && { category: localize(primary.name, locale) }),
          url: absoluteUrl(localizedPath(`/products/${product.slug}`, locale)),
          // No "offers": prices aren't public.
        }}
      />
    </>
  );
}
