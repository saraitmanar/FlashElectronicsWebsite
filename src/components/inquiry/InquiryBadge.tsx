"use client";

import clsx from "clsx";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { selectLineCount, useInquiry } from "@/lib/inquiry/store";

/** Header link to the inquiry list with an item count. */
export function InquiryBadge({ className }: { className?: string }) {
  const t = useTranslations("Inquiry");
  const count = useInquiry(selectLineCount);
  const hydrated = useInquiry((s) => s.hydrated);
  const shown = hydrated ? count : 0;

  return (
    <Link
      href="/inquiry"
      aria-label={t("badgeLabel", { count: shown })}
      title={t("navLabel")}
      className={clsx(
        "relative grid size-10 place-items-center rounded-full text-on-primary transition-colors hover:bg-white/10",
        className,
      )}
    >
      <ClipboardList className="size-5" aria-hidden="true" />
      {shown > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.7rem] leading-5 font-bold text-on-accent">
          {shown > 99 ? "99+" : shown}
        </span>
      )}
    </Link>
  );
}
