import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Blinds,
  ListPlus,
  Package,
  Search,
  Send,
  Shirt,
  Sofa,
  Sparkles,
  SprayCan,
  Store,
  Tags,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { catalog, sortByNewest } from "@/lib/catalog";
import { localize } from "@/lib/i18n/localized";
import { buildWhatsAppUrl } from "@/lib/inquiry/whatsapp";
import { alternatesFor } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return { alternates: alternatesFor("/", locale) };
}

// Icons for top-level categories (content/categories.yaml). New categories
// get a generic icon until one is added here.
const categoryIcons: Record<string, LucideIcon> = {
  clothing: Shirt,
  bedding: BedDouble,
  curtains: Blinds,
  "home-goods": Sofa,
  perfumes: Sparkles,
  household: SprayCan,
};

const trust = [
  { title: "trust.wholesaleTitle", body: "trust.wholesaleBody", icon: Tags },
  { title: "trust.brandsTitle", body: "trust.brandsBody", icon: BadgeCheck },
  { title: "trust.pickupTitle", body: "trust.pickupBody", icon: Store },
  { title: "trust.deliveryTitle", body: "trust.deliveryBody", icon: Truck },
] as const;

const steps = [
  { title: "steps.browseTitle", body: "steps.browseBody", icon: Search },
  { title: "steps.listTitle", body: "steps.listBody", icon: ListPlus },
  { title: "steps.sendTitle", body: "steps.sendBody", icon: Send },
] as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return null;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  const tWhatsApp = await getTranslations("WhatsApp");
  const whatsappUrl = buildWhatsAppUrl(tWhatsApp("defaultMessage"));
  const tCatalog = await getTranslations("Catalog");
  const [categories, products, brands] = await Promise.all([
    catalog.listCategories(),
    catalog.listProducts(),
    catalog.listBrands(),
  ]);
  const topCategories = categories.filter((c) => !c.parentId);
  const newArrivals = sortByNewest(products).slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <Container className="py-14 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-accent-strong uppercase">
              <span className="h-px w-8 bg-accent" aria-hidden="true" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 text-3xl leading-tight font-bold tracking-tight text-balance text-primary sm:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
              {t("subtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/products" className={buttonClasses({ size: "lg" })}>
                {t("ctaBrowse")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "outline", size: "lg" })}
              >
                <WhatsAppIcon className="size-5 text-whatsapp" />
                {t("ctaWhatsApp")}
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* Trust strip */}
      <section className="border-b border-line bg-surface">
        <Container className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map(({ title, body, icon: Icon }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-primary">{t(title)}</h2>
                <p className="mt-0.5 text-sm text-ink-muted">{t(body)}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {/* Categories */}
      <section>
        <Container className="py-14 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-primary">{t("categoriesTitle")}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {topCategories.map((category) => {
              const Icon = categoryIcons[category.id] ?? Package;
              return (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.id}`}
                    className="flex h-full flex-col items-center gap-3 rounded-xl border border-line bg-surface px-3 py-6 text-center shadow-xs transition-colors hover:border-primary"
                  >
                    <Icon className="size-8 text-primary" strokeWidth={1.5} aria-hidden="true" />
                    <span className="text-sm font-medium text-ink">
                      {localize(category.name, locale)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* New arrivals (hidden until there are products) */}
      {newArrivals.length > 0 && (
        <section className="border-t border-line">
          <Container className="py-14 sm:py-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-primary">
                {tCatalog("newArrivals")}
              </h2>
              <Link
                href="/products"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {tCatalog("viewAll")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ProductGrid products={newArrivals} brands={brands} />
          </Container>
        </section>
      )}

      {/* How ordering works */}
      <section className="bg-canvas-deep">
        <Container className="py-14 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-primary">{t("stepsTitle")}</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map(({ title, body, icon: Icon }, index) => (
              <li
                key={title}
                className="relative rounded-xl border border-line bg-surface p-6 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full border-2 border-accent text-sm font-bold text-accent-strong">
                    {index + 1}
                  </span>
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold text-primary">{t(title)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t(body)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-xl border border-l-4 border-line border-l-accent bg-surface p-6">
            <h3 className="font-semibold text-primary">{t("pricingTitle")}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t("pricingBody")}</p>
          </div>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="bg-primary text-on-primary">
        <Container className="flex flex-col items-start gap-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t("ctaTitle")}</h2>
            <p className="mt-1 text-on-primary-muted">{t("ctaBody")}</p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "accent", size: "lg", className: "shrink-0" })}
          >
            <WhatsAppIcon className="size-5" />
            {t("ctaWhatsApp")}
          </a>
        </Container>
      </section>
    </>
  );
}
