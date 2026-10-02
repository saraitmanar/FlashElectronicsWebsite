import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="text-sm font-semibold tracking-widest text-accent-strong">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary">{t("title")}</h1>
      <p className="mt-3 max-w-md text-ink-muted">{t("body")}</p>
      <Link href="/" className={buttonClasses({ className: "mt-8" })}>
        {t("backHome")}
      </Link>
    </Container>
  );
}
