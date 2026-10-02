"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isActive, navItems } from "./nav-items";

export function DesktopNav() {
  const t = useTranslations("Nav");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();

  return (
    <nav aria-label={tHeader("mainNav")} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active ? "text-on-primary" : "text-on-primary-muted hover:text-on-primary",
                )}
              >
                {t(item.key)}
                {active && (
                  <span className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-accent" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
