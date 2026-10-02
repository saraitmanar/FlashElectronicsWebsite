"use client";

import { useTranslations } from "next-intl";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { usePathname } from "@/i18n/navigation";
import { buildWhatsAppUrl } from "@/lib/inquiry/whatsapp";

// Pages with their own primary WhatsApp action don't need the floating button.
const HIDDEN_ON = ["/inquiry"];

export function WhatsAppFab() {
  const t = useTranslations("WhatsApp");
  const pathname = usePathname();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <a
      href={buildWhatsAppUrl(t("defaultMessage"))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("fabLabel")}
      title={t("fabLabel")}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full bg-whatsapp text-on-whatsapp shadow-lg ring-4 ring-white/70 transition-transform hover:scale-105 hover:bg-whatsapp-hover sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
