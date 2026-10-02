# Architecture Proposal — Wholesale Catalog Site (v1)

Status: **Approved.** Phase 1 (foundation) is implemented. Later phases follow
the plan below.

Goal of v1: a fast, image-first, bilingual (EN/ES) catalog for Flash Electronics
International that turns browsing into WhatsApp conversations. No payments,
auth, accounts, inventory sync, or shipping logic. Each of these has a place
reserved in the design.

---

## Decisions log

| # | Topic | Decision | Where it shows up |
|---|---|---|---|
| 1 | Pricing | No public prices. Products show **"Ask for price" / "Consultar precio"**. The model and UI can turn on retail and wholesale prices later. | §4 `PriceInfo`, §1 site config `pricing.showPublicPrices = false` |
| 2 | Catalog maintenance | One maintainer (developer), 100+ products, many with color variants, frequent edits. **Editing products quickly is a primary requirement.** | §8: YAML authoring, shared color library, auto-generated variants and SKUs, photo naming convention, sync script |
| 3 | Wholesale rules | Wholesale is based on a **configurable minimum total order value**, not a per-product minimum. Products can optionally be sold by case/pack with a quantity step. | §4 `Packaging`, §1 config `wholesale.minimumOrderValue`, §6 |
| 4 | Language | **English is the default and has no URL prefix and no redirects.** Spanish is at `/es/...` and one tap away in the switcher. | §7 |
| 5 | POS/inventory | No inventory sync in v1. SKUs/variants are designed so a POS or inventory system can be connected later. **Use POS SKUs on variants wherever possible.** | §4 `Variant.sku`, §9 |
| 6 | WhatsApp | One WhatsApp Business number for wholesale and retail. | §1 config `contact.whatsapp` |
| 7 | Branding | Flash Electronics International is the **store identity**. Products carry their **own brand** (optional). Merchandise is never presented as Flash-branded. | §4 `Brand`, brand filter, JSON-LD in §SEO |
| 8 | Fulfillment | **Store pickup or local delivery**, both explained on the site and chosen in the inquiry. No rates, no checkout logistics. | §2 `/how-to-order`, §6 inquiry form, config `fulfillment` |
| 9 | Visual identity | Blue-and-yellow identity, refined: **deep navy primary, muted warm gold accent** used sparingly for CTAs/highlights (never large backgrounds), **warm off-white page background, white cards, charcoal text**. All colors are centralized design tokens. | `src/app/globals.css` `@theme`, README "Design tokens" |
| 10 | POS | The store uses an **Ocean Bank POS**. Whether it can export products/SKUs is not yet known. | §8 one-time seed, §9 |

---

## 0. Starting point and guiding principles

The repo currently holds a small Vite + React (JavaScript) prototype. It will be
**replaced with a fresh Next.js project in the same repo** (git history kept),
porting the useful pieces (product images, navigation, WhatsApp link).

Fix carried over: `https://wa.me/7867070092` is missing the country code. The
correct form is `https://wa.me/17867070092`. The number will live only in site config.

Principles:
1. **Static first.** Pages are pre-rendered and served from Vercel's CDN.
2. **Server Components by default**, with small client components only where
   interaction is needed.
3. **One data-access layer** (`CatalogRepository`), so the data source can
   change later without touching pages.
4. **The inquiry list is a cart without a payment step yet.** Its line items
   use the same shape a cart will need for checkout.
5. **Authoring format ≠ runtime model.** What you type to add a product is
   short and uses defaults. What the site uses is complete and normalized
   (see §4 and §8).
6. **Few dependencies.**

---

## 1. Project architecture

### Stack

| Concern | Choice |
|---|---|
| Framework | **Next.js (App Router)**, React Server Components, TypeScript strict |
| Styling | **Tailwind CSS** + small in-house UI primitives |
| i18n | **next-intl** (`localePrefix: "as-needed"`, `localeDetection: false`) |
| Content format | **YAML** files (supports comments and multi-line text, easier to edit by hand than JSON) |
| Validation | **Zod**. The build fails on invalid content. |
| Client state | **Zustand** + `persist` (localStorage) for the inquiry list |
| URL state | **nuqs** for filters/sort/selected variant |
| Search | **MiniSearch**, in the browser, with one index per language generated at build time |
| Images | **Cloudinary** (storage + transforms) through `next/image` with a custom loader |
| Icons | **lucide-react** + inline WhatsApp SVG (replaces Font Awesome) |
| Analytics | Vercel Analytics + Speed Insights, with custom inquiry/WhatsApp events |
| Quality | ESLint, Prettier (+ Tailwind plugin), Vitest for `lib/`, one Playwright smoke test of the inquiry flow |
| Hosting | **Vercel Pro** (Hobby is for non-commercial use only) |

### Site config (single source for business settings)

```ts
// src/lib/config/site.ts
export const siteConfig = {
  business: {
    name: "Flash Electronics International", // store identity, not a product brand
    address: { street: "…", city: "Miami", state: "FL", zip: "…" },
    hours: [/* … */],
    phone: "+1 786 707 0092",
  },
  contact: {
    whatsapp: "17867070092",           // one number for retail + wholesale
  },
  pricing: {
    showPublicPrices: false,           // global switch; v1 = "Ask for price"
  },
  wholesale: {
    minimumOrderValue: null as { amount: number; currency: "USD" } | null, // set later, no code change
  },
  fulfillment: {
    pickup: true,
    localDelivery: { enabled: true, areaDescription: { en: "…", es: "…" } },
  },
  features: {
    checkout: false,                   // reserved
    accounts: false,                   // reserved
    spanishSuggestionBanner: true,     // see §7
  },
} as const;
```

### Rendering strategy

| Page type | Rendering |
|---|---|
| Home, category, brand, product, static pages | **SSG** via `generateStaticParams` |
| Filtering/sorting | Static page + client-side filtering, state in URL |
| Search | Static shell + search index loaded only when needed |
| Inquiry | Static shell, content from localStorage |
| Future live data (stock, prices for logged-in buyers, checkout) | Dynamic segments / Route Handlers added then |

### Folder structure

```
/
├─ content/
│  ├─ categories.yaml
│  ├─ brands.yaml
│  ├─ options/
│  │  ├─ colors.yaml             # shared color library (id, code, en/es label, hex)
│  │  └─ sizes.yaml              # shared size library (twin/full/queen/king, S–XL…)
│  ├─ products/
│  │  ├─ luxury-comforter-set.yaml
│  │  └─ …                       # one file per product
│  └─ images.manifest.json       # GENERATED by images:sync, committed
├─ photos/                       # gitignored local drop-folder for raw photos (§5)
├─ messages/en.json, es.json     # UI strings
├─ scripts/
│  ├─ product-new.ts             # npm run product:new  → scaffold a product file
│  ├─ images-sync.ts             # npm run images:sync  → resize, upload, write manifest
│  ├─ content-check.ts           # npm run content:check → validate everything
│  └─ import-csv.ts              # one-time seed from a POS export / spreadsheet
├─ src/
│  ├─ app/
│  │  ├─ [locale]/…              # routes (see §2); English served without prefix
│  │  ├─ sitemap.ts, robots.ts
│  │  └─ api/                    # empty in v1; reserved
│  ├─ components/                # §3
│  ├─ lib/
│  │  ├─ catalog/
│  │  │  ├─ types.ts             # normalized runtime model (§4)
│  │  │  ├─ authoring-schema.ts  # Zod schema for the YAML format (§8)
│  │  │  ├─ normalize.ts         # YAML + manifest → runtime model (variants, SKUs, alt text)
│  │  │  ├─ repository.ts        # CatalogRepository interface
│  │  │  ├─ sources/local.ts     # v1 implementation
│  │  │  ├─ public.ts            # strips non-public fields (e.g. prices) before data reaches client components
│  │  │  └─ search-index.ts
│  │  ├─ inquiry/ (store.ts, message.ts, whatsapp.ts)
│  │  ├─ i18n/, seo/, images/
│  │  └─ config/site.ts
│  └─ proxy.ts                   # next-intl locale handling, no detection redirects (Next.js 16 renamed middleware → proxy)
└─ docs/ARCHITECTURE.md, docs/CATALOG-GUIDE.md (how to add/edit products & photos)
```

---

## 2. Page structure

English URLs have no prefix. Spanish URLs start with `/es`.

| Route (EN) | Spanish | Purpose |
|---|---|---|
| `/` | `/es` | Home: hero with WhatsApp CTA, category tiles, new arrivals, featured brands, trust strip ("Retail & wholesale · Pickup in Miami · Local delivery") |
| `/products` | `/es/products` | All products, filterable by category, brand, color, tag |
| `/categories/[...slug]` | `/es/categories/…` | Category/subcategory pages (e.g. `home-goods/curtains`) |
| `/brands/[slug]` | `/es/brands/…` | Brand landing pages (good for searches like "*brand* wholesale Miami") |
| `/products/[slug]` | `/es/products/…` | Product detail |
| `/search?q=` | `/es/search?q=` | Search results |
| `/inquiry` | `/es/inquiry` | Inquiry list → WhatsApp |
| `/how-to-order` | `/es/how-to-order` | Retail vs. wholesale, minimum order value (when configured), case/pack items, **store pickup & local delivery**, step-by-step WhatsApp ordering |
| `/about` | `/es/about` | Family business story, store photos |
| `/contact` | `/es/contact` | WhatsApp, phone, address + map, hours |
| `/faq` | `/es/faq` | FAQ (FAQPage JSON-LD) |
| `/privacy`, `/terms` | `/es/…` | Legal |

Global UI on every page: sticky header (logo, search, EN/ES switcher, inquiry
icon with count badge), mobile menu, footer with address/hours/pickup &
delivery note, and a floating WhatsApp button.

Products get a single URL, `/products/[slug]`, even when they appear in several
categories. That gives one canonical URL per product, and it doesn't change if
categories are reorganized.

---

## 3. Component structure

Server Components unless marked (client).

```
components/
├─ ui/        Button, Badge, Input, Select, RadioGroup, Container, Section, Heading,
│             QuantityStepper (client, respects step), Sheet/Drawer (client), Toast (client), Skeleton
├─ layout/    Header, Footer, Logo, MobileNav (client), LanguageSwitcher (client),
│             SpanishSuggestionBanner (client), SearchTrigger (client), InquiryBadge (client), WhatsAppFab (client)
├─ catalog/   CategoryTile/Grid, BrandStrip, ProductCard, ProductGrid, Breadcrumbs, Pagination,
│             FilterPanel (client), ActiveFilters (client), SortSelect (client), SearchDialog (client)
├─ product/   ProductView (client: owns selected variant)
│               ├─ ProductGallery (client)  ├─ VariantSelector (client) → ColorSwatches, OptionPills
│               ├─ PriceDisplay             # v1 renders "Ask for price"; later retail/tiers
│               ├─ PackagingInfo            # "Sold by case of 12", "Order in multiples of 6"
│               ├─ AddToInquiry (client)    └─ AskOnWhatsApp (client)
│             ProductSpecs, BrandLabel, RelatedProducts, ProductJsonLd
├─ inquiry/   InquiryList, InquiryLineItem, InquiryDetailsForm, FulfillmentChoice,
│             WholesaleMinimumNotice, SendInquiryButton, EmptyInquiry   (all client)
└─ seo/       JsonLd
```

`PriceDisplay` is the only component that decides how pricing looks. Turning on
public prices later means changing this one component plus the config flag.

---

## 4. Product data model (normalized runtime model)

This is what pages and components use. You don't write it by hand: §8
describes the short authoring format that generates it. It follows the
common commerce structure (Product → up to 3 Options → Variants with SKUs),
so it maps directly to Shopify, Medusa or a POS later.

```ts
export type Locale = "en" | "es";
export type Localized<T = string> = { en: T; es?: T };       // es falls back to en
export interface Money { amount: number; currency: "USD" }  // integer cents

export interface Brand {
  id: string; slug: string; name: string;                   // brand names usually not translated
  logo?: ImageAsset; description?: Localized;
}

export interface Category {
  id: string; slug: string; parentId?: string;
  name: Localized; description?: Localized; image?: ImageAsset; sortOrder: number;
}

export interface ImageAsset {
  id: string; src: string; width: number; height: number;
  alt: Localized; blurDataURL?: string;
}
export interface ProductImage extends ImageAsset {
  optionValues?: Record<string, string>;  // { color: "navy" }; none = applies to all variants
  sortOrder: number;
}

export interface ProductOption {
  id: string;                     // "color" | "size" | "scent" | "pack" …
  name: Localized;
  type: "swatch" | "pill";
  values: OptionValue[];
}
export interface OptionValue {
  id: string;                     // "navy"
  code: string;                   // "NVY" – used for SKU generation
  label: Localized;
  swatch?: { hex?: string; imageSrc?: string };
}

export interface Variant {
  id: string;                     // stable; future cart/inventory key
  sku: string;                    // ideally the POS SKU – join key for future inventory
  optionValues: Record<string, string>;
  available: boolean;             // manual on/off (e.g. color no longer carried); no stock counts in v1
  barcode?: string;               // UPC/EAN if the POS has it
  price?: PriceInfo;              // optional per-variant override (future)
}

export interface Packaging {      // optional; absent = sold individually, any quantity
  unit: "piece" | "pack" | "case" | "set" | "dozen";
  unitsPerPack?: number;          // e.g. case of 12
  quantityStep?: number;          // e.g. order in multiples of 6 (default 1)
  minQuantity?: number;           // rarely used; wholesale minimum is order-level (§6)
}

export interface PriceInfo {      // NOT populated in v1
  retail?: Money;
  wholesaleTiers?: { minQuantity: number; price: Money }[];
  visibility?: "public" | "wholesale-only" | "hidden";      // future: depends on logged-in buyer
}

export interface Product {
  id: string; slug: string;
  status: "active" | "draft" | "archived";
  name: Localized; shortDescription?: Localized; description: Localized;
  brandId?: string;               // the product's brand – never defaults to Flash
  categoryIds: string[];          // first = primary
  tags: string[];                 // "new", "best-seller", "clearance"…
  options: ProductOption[];
  variants: Variant[];            // ≥ 1
  images: ProductImage[];
  packaging?: Packaging;
  price?: PriceInfo;
  attributes?: { label: Localized; value: Localized }[];
  featured?: boolean;
  seo?: { title?: Localized; description?: Localized };
  createdAt: string; updatedAt: string;
}
```

**Pricing safety:** in v1, no prices are stored in `content/`. When pricing
is added later, `lib/catalog/public.ts` strips price fields from data sent to
the browser unless `pricing.showPublicPrices` is on (or, later, unless the buyer is
logged in). Without this step, a price could reach the page source even
though the UI shows "Ask for price". This applies no matter what the
UI shows.

**Stock:** v1 shows no stock counts or "In stock" badges, because the site
has no live inventory and would sometimes be wrong. The only manual control is
`available: false` on a variant, which greys out that color/size with a "Currently
unavailable – ask us" note. A product with `status: archived` disappears from
listings and its URL redirects to its category, so old links keep working.

---

## 5. Variant and image handling

**Image matching:** each image can be tagged with option values. Selecting a
color shows that color's photos first, then untagged ones (lifestyle shots,
packaging, size charts).

**Selection UX:**
- The selected variant appears in the URL (`/products/comforter-set?color=navy&size=queen`),
  so the link can be shared on WhatsApp. The canonical URL is still the plain product URL.
- The default selection is the first available variant.
- Unavailable combinations stay visible but disabled.
- Product cards show up to ~5 color dots. Tapping or hovering a dot swaps the card image.

**Photo workflow (designed to be fast for you):**

```
photos/                               (local, gitignored)
└─ luxury-comforter-set/
   ├─ navy-1.jpg      → tagged color=navy, order 1
   ├─ navy-2.jpg
   ├─ gray-1.jpg      → tagged color=gray
   ├─ main-1.jpg      → untagged (shown for all variants)
   └─ detail-1.jpg    → untagged
```

`npm run images:sync`:
1. finds new or changed photos (by content hash), so re-running is cheap;
2. auto-orients and limits the long edge to ~2400 px, keeps the original aspect ratio;
3. uploads to Cloudinary at `products/{slug}/{file}`;
4. writes width, height, blur placeholder and tags into `content/images.manifest.json`.

Product files don't list images. They're found from the folder and
filename. Alt text is generated as "{product name} – {color label}" in both languages,
and can be overridden.

**Delivery:** `next/image` with `sizes` set per layout, AVIF/WebP from
Cloudinary, `priority` only on the main image above the fold, blur placeholders.
**Photography standard:** one aspect ratio across the catalog (recommend 4:5),
light neutral background, a front shot for each color, plus detail/packaging shots.
This goes in `docs/CATALOG-GUIDE.md`.

---

## 6. Inquiry list and WhatsApp flow

```
Product page → choose color/size → quantity → "Add to inquiry"   (toast: "Added · View list")
            ↘ "Ask about this product on WhatsApp"               (single-item shortcut)

/inquiry → adjust quantities → details → "Send via WhatsApp"
   Details (all optional except type):
   • I'm buying for: ( ) Myself / retail   ( ) My business / wholesale
   • Business name (wholesale), name, city/ZIP
   • Fulfillment: ( ) Pickup at store   ( ) Local delivery (+ address area)
   • Notes
```

**Wholesale minimum:** Prices aren't public, so the site can't calculate an
order total. v1 therefore **informs** buyers about the minimum instead of
enforcing it. When `wholesale.minimumOrderValue` is set, buyers who select "wholesale"
see "Wholesale orders have a minimum of $X. We'll confirm your total on
WhatsApp." When it's `null`, nothing is shown. Once public prices are turned on,
the same component can show a running total and progress toward the minimum,
with no change to the data model.

**Quantities:** the stepper defaults to 1 with step 1. Products with `packaging`
use their step and unit ("2 cases (24 pcs)").

**State:** Zustand persisted to localStorage (versioned key).

```ts
interface InquiryLine {
  productId: string; variantId: string; quantity: number; note?: string;
  snapshot: { name: Localized; brand?: string; sku: string; variantLabel: Localized;
              imageSrc: string; slug: string; unitLabel: Localized };
  addedAt: string;
}
interface InquiryState {
  version: 1;
  lines: InquiryLine[];            // same variant added twice = quantities merged
  details: { buyerType?: "retail" | "wholesale"; name?: string; business?: string;
             city?: string; fulfillment?: "pickup" | "delivery"; deliveryArea?: string; notes?: string };
}
```

**Message** (pure, unit-tested function; written in the visitor's language):

```
Hello Flash Electronics International! I'd like pricing for:
Ref: FL-7K3Q · Wholesale inquiry

1) Luxury 7-Piece Comforter Set (Home Elegance) — Navy / Queen
   SKU BED-CMF7-NVY-Q · Qty: 12
   https://<domain>/products/luxury-comforter-set?color=navy&size=queen
2) …

Business: Tienda La Esquina · Hialeah
Fulfillment: Local delivery (Hialeah, 33012)
Notes: …
```

- The short **reference code** lets staff match a chat to a list, and later to
  a stored inquiry record.
- **Length guard:** if the message gets too long for a reliable link (~1,500
  encoded characters), product URLs are dropped first, then lines are compacted.
- Opens `https://wa.me/17867070092?text=…` (the WhatsApp app on phones,
  WhatsApp Web on desktop). Also offers "Copy list" and "Clear list".
  The list is not cleared automatically after sending.
- Analytics events: `inquiry_add`, `inquiry_send` (with buyer type and fulfillment),
  `whatsapp_click` (source: fab / product / inquiry).

Reserved for later: `POST /api/inquiries` to save inquiries (lead history,
email notification) before opening WhatsApp.

---

## 7. Localization strategy

- **English is the default, with no prefix and no redirect:** `/products/x` is English,
  `/es/products/x` is Spanish. `localeDetection: false` means visitors are never
  redirected based on browser language or cookies. `/` always serves English
  directly, with no redirect hop.
- **Getting to Spanish:** the EN/ES switcher in the header (and mobile menu)
  keeps the current page, query and selected variant. If the browser's
  preferred language is Spanish, a small dismissible banner
  ("¿Prefiere ver el sitio en español? Ver en español") suggests switching.
  This runs in the browser after page load. It doesn't redirect and doesn't affect
  page speed or SEO, and it can be turned off in config.
- **UI strings** live in `messages/en.json` and `messages/es.json`, use ICU
  plurals, and are type-checked: a missing key fails the build.
- **Catalog text** uses `Localized` fields. Spanish falls back to English, and
  `content:check` lists missing translations so you can fill them gradually.
  Shared option libraries (colors/sizes) mean each color name is translated once.
- **Slugs** are shared between languages (`/es/products/luxury-comforter-set`).
- **SEO:** localized metadata, `<html lang>`, hreflang `en` / `es` /
  `x-default` (→ English), sitemap with alternates.
- **Adding another language** later means adding a messages file plus the
  locale. No code changes.

---

## 8. Product data: initial approach, built for frequent editing

**Recommendation: YAML files in the repo, a shared option library, variants
and SKUs generated automatically, and photos found from folder/file names, with
scripts and validation.** Everything sits behind `CatalogRepository`. It's
free, fully static, version-controlled, and every change gets a Vercel preview
before it goes live.

### What adding a product looks like

```bash
npm run product:new          # asks: name (en/es), brand, category, colors, sizes
# → creates content/products/luxury-comforter-set.yaml with a new id
# → drop photos into photos/luxury-comforter-set/
npm run images:sync
npm run dev                  # check it locally (or push → Vercel preview)
```

```yaml
# content/products/luxury-comforter-set.yaml
id: p_0142
slug: luxury-comforter-set
status: active
brand: home-elegance                 # → content/brands.yaml
categories: [bedding/comforters]
name:
  en: Luxury 7-Piece Comforter Set
  es: Juego de Edredón de Lujo de 7 Piezas
description:
  en: |
    Soft microfiber comforter set with shams and bed skirt.
  es: |
    Juego de edredón de microfibra suave con fundas y faldón.
skuPrefix: BED-CMF7
options:
  color: [navy, gray, white, burgundy]  # ids from content/options/colors.yaml
  size: [queen, king]                   # ids from content/options/sizes.yaml
# → 8 variants generated automatically; SKUs like BED-CMF7-NVY-Q
variants:                               # list exceptions only
  - match: { color: burgundy, size: king }
    available: false
  - match: { color: white, size: queen }
    sku: "000123456"                    # POS SKU when it differs from the pattern
packaging:                              # optional; omit for single-piece items
  unit: case
  unitsPerPack: 6
attributes:
  - label: { en: Material, es: Material }
    value: { en: Microfiber, es: Microfibra }
tags: [new]
```

A simple product (a perfume with no options) is about 10 lines.

### What makes it fast

- **Shared color/size library:** "navy" is defined once (code, EN/ES label,
  hex swatch) and reused everywhere. This also gives a consistent color filter
  across the catalog.
- **Generated variants:** variants are every combination of the listed options.
  You only write the exceptions.
- **Generated SKUs** from `skuPrefix` + option codes, which you can override with POS SKUs.
- **Photos are found automatically** from folder/file names, with no image
  lists to keep in sync.
- **`content:check`** runs before every build and in CI. It catches duplicate
  SKUs/slugs, unknown color/brand/category ids, products with no photos,
  missing Spanish text (warning), and photos whose names don't match an option.
- **Bulk changes** (retagging, recategorizing) are a find-and-replace across
  plain text files.
- **One-time seed:** if your POS can export products/SKUs to CSV,
  `import-csv.ts` turns it into product files. Using POS SKUs from the start
  makes future inventory sync much simpler.

### When to graduate

Move to a headless CMS (e.g. Sanity, with drag-and-drop photos and editing
from a phone) if someone non-technical needs to edit, or if editing from a
phone becomes important. Move to a commerce platform when checkout or inventory
arrives (§9). Either way only `lib/catalog/sources/*` changes. Pages, URLs and
the runtime model stay the same.

---

## 9. Path to inventory, accounts and checkout

| Future capability | Already in place in v1 | What gets added later |
|---|---|---|
| **Inventory** | POS-compatible `Variant.sku`, `barcode`, `available` flag | An `InventoryProvider` that reads stock per SKU from the POS (if it has an API) or a commerce platform. Pages revalidate on stock-change webhooks, or fetch stock in the browser |
| **Public pricing** | `PriceInfo` (retail + wholesale tiers), `PriceDisplay` component, `public.ts` stripping, config flag | Add prices to content (or pull them from POS/platform), turn on `showPublicPrices` |
| **Wholesale minimum enforcement** | `wholesale.minimumOrderValue` config, `buyerType` in inquiry | With prices public: running total + progress bar in the inquiry/cart |
| **Checkout** | Inquiry line `{variantId, quantity}` = cart line; cents; `api/` reserved; `features.checkout` | `CheckoutProvider` (Shopify or Stripe). "Checkout" button next to "Send via WhatsApp" |
| **Accounts / approved wholesale buyers** | `PriceInfo.visibility: "wholesale-only"`, `features.accounts` | Auth + `(account)` route group, wholesale tier prices for approved buyers |
| **Pickup/delivery logistics** | `fulfillment` config + choice captured in inquiry | Delivery zones/fees at checkout; shipping rates only if ever needed |
| **Lead tracking** | Reference codes, analytics events | `POST /api/inquiries` → DB/CRM/email |

**Long-term direction:** which commerce backend to use depends mostly on
the POS. The store uses an Ocean Bank POS. If it offers an API or reliable
exports, the website can read inventory from it. If not, moving
to Shopify + Shopify POS gives unified inventory and checkout. In both cases
the website code stays largely the same.

---

## SEO and performance

- Metadata API per page; canonical URLs; hreflang; `sitemap.ts`; `robots.ts`.
- JSON-LD:
  - `Store` / `LocalBusiness` for **Flash Electronics International** (Miami address, hours, phone)
  - `Product` with **`brand` = the product's own brand** (omitted if none, never Flash)
  - `BreadcrumbList`, `FAQPage`
  - No `offers` while prices are hidden
- Per-product Open Graph images, so links shared on WhatsApp show the photo + name.
- Set up a Google Business Profile linking to the site (important for local Miami search).
- Targets: Lighthouse ≥ 95 on mobile, LCP < 2 s on 4G, small JS per route,
  `next/font` for fonts.
- Accessibility: semantic HTML, the variant picker works as a radio group,
  alt text required, contrast-checked colors.

---

## Delivery phases

1. **Foundation:** Next.js/TS/Tailwind, i18n routing (EN no prefix, ES `/es`),
   site config, layout (header/footer/mobile nav/WhatsApp button), Vercel project.
2. **Catalog data:** YAML authoring schema, option libraries, normalizer
   (variants/SKUs), local repository, `content:check`, `product:new`,
   `images:sync` + Cloudinary, sample products (port the existing two).
3. **Catalog pages:** home, products, categories, brands, product detail with
   gallery/variants, "Ask for price".
4. **Inquiry:** store, inquiry page, buyer type / fulfillment, WhatsApp message
   builder + tests, single-product shortcut.
5. **Search & filters:** MiniSearch, search dialog/page, URL-synced filters.
6. **Content & SEO:** How to order (pickup/delivery/wholesale), about,
   contact, FAQ, JSON-LD, sitemap, OG images, analytics, Lighthouse pass,
   `docs/CATALOG-GUIDE.md`.

---

## Remaining questions

1. **Ocean Bank POS export:** can it export products/SKUs (CSV/Excel)? (Affects
   the seed import and the long-term inventory plan.)
2. **Store details:** address, hours, phone/email, and how to describe the
   local delivery area. These go in `src/lib/config/site.ts`; the site hides each
   item until it's filled in.
3. **Domain** for the site (needed for sitemap, canonical URLs and WhatsApp links).
4. **Photos:** none yet. They'll be shot new, following the photography standard in §5.
   Phase 2 can start with placeholder images. Is a Cloudinary account OK? It's free to start.
5. **Logo:** the site uses a text wordmark until a logo file exists.
