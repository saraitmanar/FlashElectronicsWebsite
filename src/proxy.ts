import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Maps "/" → English and "/es/..." → Spanish (Next.js 16 "proxy", formerly middleware).
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next.js internals, Vercel internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
