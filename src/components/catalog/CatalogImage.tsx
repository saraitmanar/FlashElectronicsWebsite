import Image from "next/image";
import type { Locale } from "@/i18n/routing";
import type { ImageAsset } from "@/lib/catalog/types";
import { localize } from "@/lib/i18n/localized";

/**
 * A product photo filling its (positioned, sized) parent. Photos are shown
 * whole ("contain") on white so nothing gets cropped.
 */
export function CatalogImage({
  image,
  locale,
  sizes,
  eager,
  className,
}: {
  image: ImageAsset;
  locale: Locale;
  sizes: string;
  /** For the main photo above the fold (LCP). */
  eager?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={image.src}
      alt={localize(image.alt, locale)}
      fill
      sizes={sizes}
      placeholder={image.blurDataURL ? "blur" : "empty"}
      blurDataURL={image.blurDataURL}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      className={className ?? "object-contain"}
    />
  );
}
