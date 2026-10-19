"use client";

import clsx from "clsx";
import { Check, ClipboardList, Copy, ImageOff, Info, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/config/site";
import { localize } from "@/lib/i18n/localized";
import {
  buildFullListText,
  buildInquiryMessage,
  quantityText,
  type Translate,
} from "@/lib/inquiry/message";
import { useInquiry } from "@/lib/inquiry/store";
import type { InquiryDetails, InquiryLine } from "@/lib/inquiry/types";
import { buildWhatsAppUrl } from "@/lib/inquiry/whatsapp";

export function InquiryView() {
  const t = useTranslations("Inquiry");
  const tRoot = useTranslations();
  const locale = useLocale() as Locale;
  const { lines, details, reference, hydrated, setQuantity, remove, clear, setDetails } =
    useInquiry();
  const [origin, setOrigin] = useState("");
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);

  if (!hydrated) {
    return <p className="py-16 text-center text-ink-muted">{t("loading")}</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
        <ClipboardList className="size-10 text-navy-300" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-primary">{t("emptyTitle")}</h2>
        <p className="mt-1 max-w-md text-sm text-ink-muted">{t("emptyBody")}</p>
        <Link href="/products" className={buttonClasses({ className: "mt-6" })}>
          {t("browse")}
        </Link>
      </div>
    );
  }

  const translate: Translate = (key, values) => tRoot(key as never, values as never);
  const messageInput = {
    lines,
    details,
    reference,
    locale,
    origin,
    storeName: siteConfig.business.name,
    t: translate,
  };
  const message = buildInquiryMessage(messageInput);

  async function copyList() {
    try {
      await navigator.clipboard.writeText(buildFullListText(messageInput));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (e.g. insecure context): nothing else to do.
    }
  }

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    clear();
    setSent(false);
    setConfirmClear(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <section aria-labelledby="inquiry-items">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="inquiry-items" className="text-sm font-semibold text-ink-muted">
            {t("itemCount", { count: lines.length })}
          </h2>
          {reference && (
            <p className="font-mono text-sm text-ink-muted">
              {t("reference", { code: reference })}
            </p>
          )}
        </div>
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <LineItem
              key={line.variantId}
              line={line}
              locale={locale}
              translate={translate}
              onQuantity={(q) => setQuantity(line.variantId, q)}
              onRemove={() => remove(line.variantId)}
            />
          ))}
        </ul>
      </section>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        <DetailsForm details={details} onChange={setDetails} />

        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          {sent ? (
            <div className="rounded-lg bg-accent-soft p-3 text-sm">
              <p className="font-semibold text-ink">{t("sentTitle")}</p>
              <p className="mt-0.5 text-ink-muted">{t("sentBody")}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    setSent(false);
                  }}
                  className={buttonClasses({ size: "sm" })}
                >
                  {t("clear")}
                </button>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  {t("keep")}
                </button>
              </div>
            </div>
          ) : null}

          <a
            href={buildWhatsAppUrl(message.text)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSent(true)}
            className={buttonClasses({ variant: "whatsapp", size: "lg" })}
          >
            <WhatsAppIcon className="size-5" />
            {t("send")}
          </a>
          <p className="text-xs text-ink-muted">{t("sendHint")}</p>
          {message.shortened && (
            <p className="flex items-start gap-2 text-xs text-ink-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {t("trimmed")}
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={copyList}
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? t("copied") : t("copy")}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className={buttonClasses({
                variant: "ghost",
                size: "sm",
                className: clsx(confirmClear && "bg-accent-soft text-ink"),
              })}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {confirmClear ? t("clearConfirm") : t("clear")}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function LineItem({
  line,
  locale,
  translate,
  onQuantity,
  onRemove,
}: {
  line: InquiryLine;
  locale: Locale;
  translate: Translate;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Inquiry");
  const name = localize(line.snapshot.name, locale);
  const variant = localize(line.snapshot.variantLabel, locale);
  const href = `/products/${line.snapshot.slug}${line.snapshot.search ? `?${line.snapshot.search}` : ""}`;

  return (
    <li className="flex gap-3 rounded-xl border border-line bg-surface p-3 sm:gap-4 sm:p-4">
      <Link
        href={href}
        className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface sm:size-24"
      >
        {line.snapshot.imageSrc ? (
          <Image
            src={line.snapshot.imageSrc}
            alt=""
            fill
            sizes="96px"
            className="object-contain p-1"
          />
        ) : (
          <span className="grid h-full place-items-center bg-primary-soft text-navy-300">
            <ImageOff className="size-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {line.snapshot.brand && (
              <p className="text-[0.7rem] font-semibold tracking-wider text-ink-subtle uppercase">
                {line.snapshot.brand}
              </p>
            )}
            <Link href={href} className="line-clamp-2 font-semibold text-ink hover:text-primary">
              {name}
            </Link>
            {variant && <p className="text-sm text-ink-muted">{variant}</p>}
            <p className="mt-0.5 font-mono text-xs text-ink-subtle">{line.snapshot.sku}</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("removeItem", { name })}
            title={t("remove")}
            className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-primary-soft hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            onChange={onQuantity}
            packaging={line.snapshot.packaging}
            label={`${t("quantity")}: ${name}`}
          />
          <span className="text-sm text-ink-muted">
            {quantityText(translate, line.quantity, line.snapshot.packaging)}
          </span>
        </div>
      </div>
    </li>
  );
}

function DetailsForm({
  details,
  onChange,
}: {
  details: InquiryDetails;
  onChange: (details: Partial<InquiryDetails>) => void;
}) {
  const t = useTranslations("Inquiry");
  const locale = useLocale();
  const minimum = siteConfig.wholesale.minimumOrderValue;

  return (
    <section
      aria-labelledby="inquiry-details"
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4"
    >
      <div>
        <h2 id="inquiry-details" className="font-semibold text-primary">
          {t("detailsTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">{t("detailsHint")}</p>
      </div>

      <ChoiceGroup
        legend={t("buyerType")}
        name="buyerType"
        value={details.buyerType}
        options={[
          { value: "retail", label: t("retail") },
          { value: "wholesale", label: t("wholesale") },
        ]}
        onChange={(buyerType) => onChange({ buyerType })}
      />

      {details.buyerType === "wholesale" && minimum && (
        <p className="rounded-lg bg-accent-soft p-3 text-sm text-ink">
          {t("wholesaleMinimum", {
            amount: new Intl.NumberFormat(locale, {
              style: "currency",
              currency: minimum.currency,
            }).format(minimum.amount / 100),
          })}
        </p>
      )}

      <Field label={t("name")}>
        <input
          type="text"
          autoComplete="name"
          value={details.name ?? ""}
          onChange={(e) => onChange({ name: e.target.value })}
          className={inputClass}
        />
      </Field>

      {details.buyerType === "wholesale" && (
        <Field label={t("business")}>
          <input
            type="text"
            autoComplete="organization"
            value={details.business ?? ""}
            onChange={(e) => onChange({ business: e.target.value })}
            className={inputClass}
          />
        </Field>
      )}

      <ChoiceGroup
        legend={t("fulfillment")}
        name="fulfillment"
        value={details.fulfillment}
        options={[
          ...(siteConfig.fulfillment.pickup
            ? [{ value: "pickup" as const, label: t("pickup") }]
            : []),
          ...(siteConfig.fulfillment.delivery.enabled
            ? [{ value: "delivery" as const, label: t("delivery") }]
            : []),
        ]}
        onChange={(fulfillment) => onChange({ fulfillment })}
      />

      {details.fulfillment === "delivery" && (
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <Field label={t("location")}>
            <input
              type="text"
              autoComplete="address-level2"
              placeholder={t("locationPlaceholder")}
              value={details.location ?? ""}
              onChange={(e) => onChange({ location: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={t("zip")}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={10}
              value={details.zip ?? ""}
              onChange={(e) => onChange({ zip: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      )}

      <Field label={t("notes")}>
        <textarea
          rows={3}
          placeholder={t("notesPlaceholder")}
          value={details.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          className={clsx(inputClass, "h-auto py-2")}
        />
      </Field>
    </section>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none sm:text-sm";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value?: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={clsx(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent",
              value === option.value
                ? "border-primary bg-primary-soft text-ink"
                : "border-line hover:border-navy-300",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="size-4 accent-[var(--color-primary)]"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
