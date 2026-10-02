import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { InquiryBadge } from "@/components/inquiry/InquiryBadge";
import { Container } from "@/components/ui/Container";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { buildWhatsAppUrl } from "@/lib/inquiry/whatsapp";
import { DesktopNav } from "./DesktopNav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";

export async function Header() {
  const t = await getTranslations("Header");
  const tWhatsApp = await getTranslations("WhatsApp");

  return (
    <header className="sticky top-0 z-40 bg-primary text-on-primary shadow-sm">
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Logo />
        <DesktopNav />
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <a
            href={buildWhatsAppUrl(tWhatsApp("defaultMessage"))}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({
              variant: "accent",
              size: "sm",
              className: "max-md:hidden",
            })}
          >
            <WhatsAppIcon className="size-4" />
            {t("chatWhatsApp")}
          </a>
          <InquiryBadge />
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
