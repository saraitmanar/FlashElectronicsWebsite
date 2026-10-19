import { getSiteUrl } from "@/lib/config/site-url";

/** Absolute URL for a site path or an already-absolute URL (e.g. Cloudinary). */
export function absoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, getSiteUrl()).toString();
}
