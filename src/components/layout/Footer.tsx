import { MapPin, Phone, Mail, Clock, Store, Truck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/config/site";
import { localize } from "@/lib/i18n/localized";
import { buildWhatsAppUrl } from "@/lib/inquiry/whatsapp";
import { Logo } from "./Logo";
import { navItems } from "./nav-items";

function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : digits;
}

export async function Footer() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");
  const tWhatsApp = await getTranslations("WhatsApp");
  const locale = await getLocale();
  const { business, contact, fulfillment } = siteConfig;

  return (
    <footer className="mt-auto bg-primary text-on-primary-muted">
      <div className="h-px bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Logo className="text-on-primary" />
          <p className="text-sm leading-relaxed">{t("tagline")}</p>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold text-on-primary">{t("contactHeading")}</h2>
          <ul className="flex flex-col gap-3 text-sm">
            <li>
              <a
                href={buildWhatsAppUrl(tWhatsApp("defaultMessage"))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-on-primary"
              >
                <WhatsAppIcon className="size-4" />
                {t("whatsapp")}: {formatPhone(contact.whatsapp)}
              </a>
            </li>
            {business.phone && (
              <li>
                <a
                  href={`tel:${business.phone}`}
                  className="inline-flex items-center gap-2 hover:text-on-primary"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {business.phone}
                </a>
              </li>
            )}
            {business.email && (
              <li>
                <a
                  href={`mailto:${business.email}`}
                  className="inline-flex items-center gap-2 hover:text-on-primary"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {business.email}
                </a>
              </li>
            )}
            <li className="inline-flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {business.address ? (
                <span>
                  {business.address.street}
                  <br />
                  {business.address.city}, {business.address.state} {business.address.zip}
                </span>
              ) : (
                <span>{business.city}</span>
              )}
            </li>
            {business.hours && (
              <li className="inline-flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-pre-line">{localize(business.hours, locale)}</span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold text-on-primary">{t("servicesHeading")}</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {fulfillment.pickup && (
              <li className="inline-flex items-center gap-2">
                <Store className="size-4 text-accent" aria-hidden="true" />
                {t("pickup")}
              </li>
            )}
            {fulfillment.delivery.enabled && (
              <li className="inline-flex items-start gap-2">
                <Truck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span>
                  {t("delivery")}
                  {fulfillment.delivery.areaDescription && (
                    <span className="block text-xs opacity-80">
                      {localize(fulfillment.delivery.areaDescription, locale)}
                    </span>
                  )}
                </span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold text-on-primary">{t("linksHeading")}</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-on-primary">
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-1 pt-6 pb-24 text-xs sm:flex-row sm:justify-between">
          <p>{t("rights", { year: new Date().getFullYear(), name: business.name })}</p>
          <p className="opacity-80">{t("brandsNote")}</p>
        </Container>
      </div>
    </footer>
  );
}
