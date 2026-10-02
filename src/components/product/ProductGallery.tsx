"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { ImagePlaceholder } from "@/components/catalog/ImagePlaceholder";
import type { Locale } from "@/i18n/routing";
import type { ProductImage } from "@/lib/catalog/types";
import { localize } from "@/lib/i18n/localized";

/**
 * Swipeable on phones (CSS scroll snap), thumbnails and arrows on larger
 * screens. Remount with a new `key` when the image set changes.
 */
export function ProductGallery({ images, locale }: { images: ProductImage[]; locale: Locale }) {
  const t = useTranslations("Product");
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/5] overflow-hidden rounded-xl border border-line">
        <ImagePlaceholder />
      </div>
    );
  }

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }

  return (
    <section aria-label={t("photos")} className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
        <div
          ref={trackRef}
          onScroll={(e) => {
            const track = e.currentTarget;
            setIndex(Math.round(track.scrollLeft / track.clientWidth));
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {images.map((image, i) => (
            <div key={image.id} className="relative aspect-[4/5] w-full shrink-0 snap-center">
              <CatalogImage
                image={image}
                locale={locale}
                eager={i === 0}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-contain p-3"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label={t("previousPhoto")}
              className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-primary shadow-md transition-opacity disabled:opacity-0 sm:grid"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index === images.length - 1}
              aria-label={t("nextPhoto")}
              className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-primary shadow-md transition-opacity disabled:opacity-0 sm:grid"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            {/* Position dots (phones) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
              {images.map((image, i) => (
                <span
                  key={image.id}
                  className={clsx(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-4 bg-primary" : "w-1.5 bg-navy-300",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="hidden gap-2 sm:flex sm:flex-wrap">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("showPhoto", { index: i + 1, total: images.length })}
                aria-current={i === index ? "true" : undefined}
                className={clsx(
                  "relative block size-16 overflow-hidden rounded-lg border-2 bg-surface transition-colors",
                  i === index ? "border-primary" : "border-line hover:border-navy-300",
                )}
              >
                <Image
                  src={image.src}
                  alt={localize(image.alt, locale)}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
