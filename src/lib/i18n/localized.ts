import type { Locale } from "@/i18n/routing";

/** Content stored per language. Spanish falls back to English when missing. */
export type Localized<T = string> = { en: T; es?: T };

export function localize<T>(value: Localized<T>, locale: Locale): T {
  return value[locale] ?? value.en;
}
