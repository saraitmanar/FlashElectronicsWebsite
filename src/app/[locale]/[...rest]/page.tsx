import { notFound } from "next/navigation";

// Routes any unknown path inside a locale to the localized 404 page.
export default function CatchAll() {
  notFound();
}
