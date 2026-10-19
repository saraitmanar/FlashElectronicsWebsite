import Link from "next/link";
import "./globals.css";

// Fallback for requests outside the locale routes (rare). Localized 404s
// are handled by app/[locale]/not-found.tsx.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center p-6 text-center font-sans">
        <div>
          <h1 className="text-2xl font-bold text-primary">Page not found</h1>
          <p className="mt-2 text-ink-muted">
            <Link href="/" className="underline">
              Back to home
            </Link>
          </p>
        </div>
      </body>
    </html>
  );
}
