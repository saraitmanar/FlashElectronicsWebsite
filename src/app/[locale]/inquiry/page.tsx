import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InquiryView } from "@/components/inquiry/InquiryView";
import { Container } from "@/components/ui/Container";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/inquiry">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Inquiry" });
  return {
    title: t("title"),
    alternates: alternatesFor("/inquiry", locale),
    // Personal, browser-specific page: keep it out of search results.
    robots: { index: false, follow: true },
  };
}

export default async function InquiryPage({ params }: PageProps<"/[locale]/inquiry">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return null;
  setRequestLocale(locale);
  const t = await getTranslations("Inquiry");

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("title")}</h1>
        <p className="max-w-2xl text-ink-muted">{t("intro")}</p>
      </header>
      <InquiryView />
    </Container>
  );
}
