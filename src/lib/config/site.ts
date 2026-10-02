import type { Localized } from "@/lib/i18n/localized";

export interface Money {
  amount: number; // integer cents
  currency: "USD";
}

/**
 * Business settings in one place. Change values here; no component should
 * hard-code contact details, policies or feature switches.
 *
 * `null` means "not provided yet" — the UI hides that piece instead of
 * showing a placeholder.
 */
export const siteConfig = {
  business: {
    // Store identity. Products carry their own brands; this is never used as
    // a product brand.
    name: "Flash Electronics International",
    shortName: "Flash Electronics",
    city: "Miami, FL",
    address: null as null | {
      street: string;
      city: string;
      state: string;
      zip: string;
      mapUrl?: string;
    },
    hours: null as null | Localized,
    phone: null as null | string,
    email: null as null | string,
  },

  contact: {
    // One WhatsApp Business number for retail and wholesale.
    // Digits only, with country code (1 = US).
    whatsapp: "17867070092",
  },

  pricing: {
    // v1: no public prices; products show "Ask for price".
    showPublicPrices: false,
  },

  wholesale: {
    // Minimum total order value for wholesale. null = not announced yet.
    minimumOrderValue: null as Money | null,
  },

  fulfillment: {
    pickup: true,
    // Delivery within the US. No shipping-rate calculation in v1; cost and
    // timing are confirmed on WhatsApp.
    delivery: {
      enabled: true,
      areaDescription: { en: "Within the US", es: "Dentro de Estados Unidos" } as null | Localized,
    },
  },

  features: {
    checkout: false, // reserved
    accounts: false, // reserved
    spanishSuggestionBanner: true,
  },
} as const;

export type SiteConfig = typeof siteConfig;
