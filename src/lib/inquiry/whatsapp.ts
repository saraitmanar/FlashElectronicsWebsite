import { siteConfig } from "@/lib/config/site";

/**
 * Builds a wa.me link. Opens the WhatsApp app on phones and WhatsApp Web on
 * desktop, with `text` pre-filled when given.
 */
export function buildWhatsAppUrl(text?: string): string {
  const base = `https://wa.me/${siteConfig.contact.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
