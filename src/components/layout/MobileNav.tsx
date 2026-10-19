"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { buttonClasses } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Link, usePathname } from "@/i18n/navigation";
import { buildWhatsAppUrl } from "@/lib/inquiry/whatsapp";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { isActive, navItems } from "./nav-items";

export function MobileNav() {
  const t = useTranslations("Nav");
  const tHeader = useTranslations("Header");
  const tWhatsApp = useTranslations("WhatsApp");
  const tInquiry = useTranslations("Inquiry");
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Close the menu after navigating.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="-mr-2 grid size-10 place-items-center rounded-full text-on-primary hover:bg-white/10 lg:hidden"
        aria-label={tHeader("openMenu")}
      >
        <Menu className="size-6" aria-hidden="true" />
      </button>

      {/* Native <dialog>: focus trapping, Esc to close and inert background for free. */}
      <dialog
        ref={dialogRef}
        aria-label={tHeader("menu")}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-0 ml-auto h-dvh max-h-none w-[min(22rem,100vw)] max-w-none bg-canvas p-0 text-ink lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <span className="font-semibold text-primary">{tHeader("menu")}</span>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="-mr-2 grid size-10 place-items-center rounded-full text-primary hover:bg-primary-soft"
              aria-label={tHeader("closeMenu")}
            >
              <X className="size-6" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label={tHeader("mainNav")} className="flex-1 overflow-y-auto px-2 py-4">
            <ul className="flex flex-col gap-1">
              {[{ href: "/", key: "home" } as const, ...navItems].map((item) => {
                const active = item.href === "/" ? pathname === "/" : isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "block rounded-lg px-3 py-3 text-base font-medium",
                        active
                          ? "border-l-4 border-accent bg-surface text-primary"
                          : "text-ink hover:bg-surface",
                      )}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href="/inquiry"
                  aria-current={pathname === "/inquiry" ? "page" : undefined}
                  className={clsx(
                    "block rounded-lg px-3 py-3 text-base font-medium",
                    pathname === "/inquiry"
                      ? "border-l-4 border-accent bg-surface text-primary"
                      : "text-ink hover:bg-surface",
                  )}
                >
                  {tInquiry("navLabel")}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex flex-col gap-4 border-t border-line p-4">
            <LanguageSwitcher tone="light" className="self-start" />
            <a
              href={buildWhatsAppUrl(tWhatsApp("defaultMessage"))}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "whatsapp", size: "lg" })}
            >
              <WhatsAppIcon className="size-5" />
              {tHeader("chatWhatsApp")}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
