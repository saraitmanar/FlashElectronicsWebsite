import { Zap } from "lucide-react";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/config/site";

// Text wordmark until a logo file is provided.
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={clsx("flex items-center gap-2 sm:gap-2.5", className)}
      aria-label={siteConfig.business.name}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-on-accent sm:size-9">
        <Zap className="size-5" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none whitespace-nowrap">
        <span className="text-[0.95rem] font-bold tracking-tight sm:text-base">
          Flash Electronics
        </span>
        <span className="text-[0.65rem] font-medium tracking-[0.2em] uppercase opacity-75">
          International
        </span>
      </span>
    </Link>
  );
}
