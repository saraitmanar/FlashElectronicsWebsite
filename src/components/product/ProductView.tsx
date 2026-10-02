"use client";

import { AlertCircle, CheckCircle2, ListPlus, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { PackagingDetails } from "@/components/catalog/PackagingLabel";
import { buttonClasses } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Brand, Product } from "@/lib/catalog/types";
import {
  defaultSelection,
  findVariant,
  imagesForSelection,
  parseSelection,
  selectionLabel,
  selectionToSearch,
  type Selection,
} from "@/lib/catalog/variant-selection";
import { localize } from "@/lib/i18n/localized";
import { lineFromProduct } from "@/lib/inquiry/from-product";
import { quantityRules } from "@/lib/inquiry/quantity";
import { useInquiry } from "@/lib/inquiry/store";
import { buildWhatsAppUrl } from "@/lib/inquiry/whatsapp";
import { ProductGallery } from "./ProductGallery";
import { VariantSelector } from "./VariantSelector";

/** Gallery + purchase panel. Owns the selected variant and mirrors it in the URL. */
export function ProductView({ product, brand }: { product: Product; brand?: Brand }) {
  const t = useTranslations("Product");
  const tCatalog = useTranslations("Catalog");
  const tInquiry = useTranslations("Inquiry");
  const locale = useLocale() as Locale;
  const addToInquiry = useInquiry((s) => s.add);
  const [quantity, setQuantity] = useState(() => quantityRules(product.packaging).min);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Static HTML renders the default variant; a shared link like
  // ?color=gray is applied right after the page loads.
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(product));
  useEffect(() => {
    const fromUrl = parseSelection(product, new URLSearchParams(window.location.search));
    // Reading the URL is only possible in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection(fromUrl);
  }, [product]);

  function select(optionId: string, valueId: string) {
    const next = { ...selection, [optionId]: valueId };
    setSelection(next);
    const search = selectionToSearch(product, next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
  }

  const variant = findVariant(product, selection) ?? product.variants[0];
  const images = useMemo(() => imagesForSelection(product, selection), [product, selection]);
  const imagesKey = images.map((i) => i.id).join("|");
  const name = localize(product.name, locale);
  const variantText = selectionLabel(product, selection, locale);
  const fullName = variantText ? `${name} – ${variantText}` : name;

  const whatsappText = t("whatsappMessage", { name: fullName, sku: variant.sku });
  // Add the exact page URL (with the selected options) when the link is clicked.
  function addPageUrl(event: MouseEvent<HTMLAnchorElement>) {
    event.currentTarget.href = buildWhatsAppUrl(`${whatsappText}\n${window.location.href}`);
  }

  function add() {
    addToInquiry(lineFromProduct(product, selection, quantity, brand?.name));
    setToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 5000);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <ProductGallery key={imagesKey} images={images} locale={locale} />

      <div className="flex flex-col gap-6">
        <div>
          {brand && (
            <Link
              href={`/brands/${brand.slug}`}
              className="text-xs font-semibold tracking-wider text-ink-muted uppercase hover:text-primary"
            >
              {brand.name}
            </Link>
          )}
          <h1 className="mt-1 text-2xl leading-tight font-bold tracking-tight text-balance text-primary sm:text-3xl">
            {name}
          </h1>
          <p className="mt-2 text-xs text-ink-subtle">
            {t("sku")}: <span className="font-mono">{variant.sku}</span>
          </p>
          {product.shortDescription && (
            <p className="mt-3 text-ink-muted">{localize(product.shortDescription, locale)}</p>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-lg font-semibold text-accent-strong">{tCatalog("askForPrice")}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{t("priceNote")}</p>
        </div>

        {product.options.length > 0 && (
          <VariantSelector
            product={product}
            selection={selection}
            onSelect={select}
            locale={locale}
          />
        )}

        {!variant.available && (
          <p className="flex items-start gap-2 rounded-lg bg-accent-soft p-3 text-sm text-ink">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden="true" />
            {t("unavailable")}
          </p>
        )}

        <PackagingDetails packaging={product.packaging} />

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              packaging={product.packaging}
              label={tInquiry("quantity")}
            />
            <button
              type="button"
              onClick={add}
              className={buttonClasses({
                size: "lg",
                className: "h-11 min-w-44 flex-1 px-4 whitespace-nowrap max-sm:text-sm",
              })}
            >
              <ListPlus className="size-5 max-[400px]:hidden" aria-hidden="true" />
              {tInquiry("addToList")}
            </button>
          </div>
          <a
            href={buildWhatsAppUrl(whatsappText)}
            onClick={addPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "outline", size: "lg" })}
          >
            <WhatsAppIcon className="size-5 text-whatsapp" />
            {t("askWhatsApp")}
          </a>
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Truck className="size-4 shrink-0" aria-hidden="true" />
            {t("pickupDelivery")}
          </p>
        </div>
      </div>

      {/* Confirmation after adding (announced to screen readers) */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-40 flex justify-center sm:bottom-8"
      >
        {toast && (
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-primary px-4 py-3 text-sm text-on-primary shadow-lg">
            <CheckCircle2 className="size-5 shrink-0 text-accent" aria-hidden="true" />
            <span className="flex-1">{tInquiry("added")}</span>
            <Link
              href="/inquiry"
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              {tInquiry("viewList")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
