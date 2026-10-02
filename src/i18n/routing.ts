import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  // English lives at "/", Spanish at "/es". No prefix for the default locale.
  localePrefix: "as-needed",
  // Never redirect based on Accept-Language or a cookie: English visitors
  // get the page they asked for with no redirect hop. Spanish is offered via
  // the language switcher and a client-side suggestion banner instead.
  localeDetection: false,
  localeCookie: false,
  // hreflang alternates are emitted through the Metadata API (lib/seo).
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
