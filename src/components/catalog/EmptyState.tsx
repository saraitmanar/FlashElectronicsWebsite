import { PackageOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { buildWhatsAppUrl } from "@/lib/inquiry/whatsapp";

export function EmptyState() {
  const t = useTranslations("Catalog");
  const tHeader = useTranslations("Header");
  const tWhatsApp = useTranslations("WhatsApp");
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <PackageOpen className="size-10 text-navy-300" strokeWidth={1.5} aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-primary">{t("emptyTitle")}</h2>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{t("emptyBody")}</p>
      <a
        href={buildWhatsAppUrl(tWhatsApp("defaultMessage"))}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses({ variant: "outline", className: "mt-6" })}
      >
        <WhatsAppIcon className="size-4 text-whatsapp" />
        {tHeader("chatWhatsApp")}
      </a>
    </div>
  );
}
