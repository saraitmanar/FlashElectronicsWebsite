/**
 * Absolute base URL used for canonical links, hreflang, sitemap and
 * WhatsApp product links. Set NEXT_PUBLIC_SITE_URL in production; Vercel
 * preview/production URLs are used as a fallback.
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("http://localhost:3000");
}
