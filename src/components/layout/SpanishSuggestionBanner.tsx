"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "@/i18n/navigation";
import { localizedPath } from "@/i18n/paths";

const DISMISS_KEY = "flash:spanish-banner-dismissed";

/**
 * Suggests the Spanish site to visitors whose browser prefers Spanish.
 * Purely client-side after load: never redirects and doesn't affect the
 * static HTML that search engines and first paint see.
 */
export function SpanishSuggestionBanner() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("SpanishBanner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (locale !== "en") return;
    const prefersSpanish = navigator.languages?.[0]?.toLowerCase().startsWith("es");
    if (!prefersSpanish) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // Storage unavailable (private mode): show the banner anyway.
    }
    // Reading browser-only APIs must happen after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dismissed) setVisible(true);
  }, [locale]);

  if (!visible || locale !== "en") return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  return (
    <div lang="es" className="border-b border-line bg-accent-soft">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <p className="text-ink">
          {t("text")}{" "}
          <NextLink
            href={localizedPath(pathname, "es")}
            className="font-semibold text-primary underline underline-offset-2"
          >
            {t("action")}
          </NextLink>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:text-ink"
          aria-label={t("dismiss")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
