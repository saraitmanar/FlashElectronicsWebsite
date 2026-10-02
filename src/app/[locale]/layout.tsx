import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SpanishSuggestionBanner } from "@/components/layout/SpanishSuggestionBanner";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/config/site";
import { getSiteUrl } from "@/lib/config/site-url";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const name = siteConfig.business.name;

  return {
    metadataBase: getSiteUrl(),
    title: { default: `${name} | ${t("title")}`, template: `%s | ${name}` },
    description: t("description"),
    applicationName: name,
    openGraph: {
      type: "website",
      siteName: name,
      locale: locale === "es" ? "es_US" : "en_US",
      alternateLocale: locale === "es" ? ["en_US"] : ["es_US"],
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#152138", // keep in sync with --color-primary
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this locale.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <NextIntlClientProvider>
          <SpanishSuggestionBanner />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppFab />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
