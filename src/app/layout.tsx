import type { ReactNode } from "react";

// The real root layout (with <html>) is app/[locale]/layout.tsx so the
// lang attribute matches the page language. This file only exists so that
// app/not-found.tsx has a parent layout.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
