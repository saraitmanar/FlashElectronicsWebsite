# Architecture Proposal — Wholesale Catalog Site (v1)

Status: **Proposal — awaiting approval.** No application code has been written yet.

Goal of v1: a fast, image-first, bilingual (EN/ES) wholesale catalog that turns
browsing into WhatsApp conversations. No payments, auth, accounts, inventory
system, or shipping logic — but every one of those has a clearly reserved place
in the design.

---

## 0. Starting point and guiding principles

The repo currently holds a small Vite + React (JavaScript) prototype: a navbar,
a home page, and a catalog with two hard-coded products and a WhatsApp link.
I propose **replacing it with a fresh Next.js project in the same repo** (git
history is kept) and porting the useful pieces (product images, the WhatsApp
idea, the navigation structure). Porting the Vite app incrementally would cost
more than starting clean, because routing, rendering and data loading all work
differently in Next.js.

Two things in the prototype to fix along the way:
- `https://wa.me/7867070092` is missing the country code. WhatsApp expects
  `https://wa.me/17867070092` (country code 1, no `+`, no dashes).
- The site name is "Flash Electronics International", but the catalog is
  general merchandise. The brand name and tagline should be confirmed (see the open
  questions at the end).

Guiding principles:
1. **Static first.** Catalog pages are pre-rendered at build time and served
   from Vercel's CDN. Pages load fast on slow mobile connections and get
   indexed well by search engines.
2. **Server Components by default, small client "islands"** only where
   interaction is needed (variant picker, inquiry list, filters, search).
3. **One data-access seam.** All pages read products through a single
   repository interface, so the data source (JSON files today; a CMS, Shopify or a
   database later) can change without touching UI code.
4. **The inquiry list is a cart that hasn't been given a payment step yet.**
   Its line-item shape is the same one checkout will need later.
5. **Few dependencies.** Each library has to justify itself in bundle size and
   maintenance.

---

## 1. Project architecture

### Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router)**, React Server Components | SSG/ISR, Metadata API, image optimization, first-class on Vercel |
| Language | **TypeScript** (strict) | Product data model enforced end to end |
| Styling | **Tailwind CSS** + small in-house UI primitives | No heavy component library; full design control |
| i18n | **next-intl** | Mature App Router support, locale routing, ICU messages |
| Data validation | **Zod** | Product files validated at build time; a bad JSON file fails the build instead of breaking a page |
| Client state | **Zustand** (+ `persist` → localStorage) for the inquiry list | ~1 KB, simple, SSR-safe |
| URL state | **nuqs** for filters/sort/variant in the query string | Shareable, back-button-friendly filter URLs |
| Search | **MiniSearch** (client-side, per-locale index built at build time) | Instant, free, no external service at catalog sizes under ~5k products |
| Images | **next/image** + image host (see §5) | AVIF/WebP, responsive `sizes`, lazy loading, blur placeholders |
| Icons | **lucide-react** (+ one inline WhatsApp SVG) | Tree-shakeable; replaces Font Awesome, which is heavier |
| Analytics | **Vercel Analytics + Speed Insights** | Zero-config; custom events for inquiry/WhatsApp clicks |
| Lint/format | ESLint (next config) + Prettier + `prettier-plugin-tailwindcss` | Consistency |
| Tests | Vitest for `lib/` (message builder, data validation); Playwright smoke test of the inquiry flow | Covers the parts most likely to break |
| Hosting | **Vercel** (Pro plan recommended — Hobby is restricted to non-commercial use) | Preview deploys per branch/PR |

### Rendering strategy

| Page type | Rendering |
|---|---|
| Home, category, product, static pages | **SSG** via `generateStaticParams`, with optional ISR (`revalidate`) once data lives outside the repo |
| Filtering/sorting on listing pages | Static page + client-side filtering, with state mirrored to the URL |
| Search | Static shell + lazily loaded search index (JSON) |
| Inquiry page | Static shell; content from the localStorage-backed store |
| Future: live stock, prices behind login, checkout | Dynamic segments / Route Handlers added at that time |

### Folder structure

```
/
├─ content/                      # v1 product data (see §8)
│  ├─ categories.json
│  └─ products/
│     ├─ bedding-comforter-set-queen.json
│     └─ ...                     # one file per product → clean diffs/reviews
├─ messages/
│  ├─ en.json                    # UI strings
│  └─ es.json
├─ public/                       # favicons, logo, static OG fallback
├─ scripts/
│  ├─ validate-content.ts        # runs in CI + prebuild
│  └─ import-from-sheet.ts       # optional: CSV/Google Sheet → content/ JSON
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ layout.tsx           # <html lang>, header/footer, providers
│  │  │  ├─ page.tsx             # home
│  │  │  ├─ products/
│  │  │  │  ├─ page.tsx          # all products (filterable)
│  │  │  │  └─ [slug]/page.tsx   # product detail
│  │  │  ├─ categories/[...slug]/page.tsx
│  │  │  ├─ search/page.tsx
│  │  │  ├─ inquiry/page.tsx
│  │  │  ├─ wholesale/page.tsx   # "How to buy wholesale"
│  │  │  ├─ about/page.tsx
│  │  │  ├─ contact/page.tsx
│  │  │  ├─ faq/page.tsx
│  │  │  ├─ (legal)/privacy/page.tsx, terms/page.tsx
│  │  │  └─ not-found.tsx
│  │  ├─ sitemap.ts
│  │  ├─ robots.ts
│  │  └─ api/                    # empty in v1; reserved for inquiries/checkout/webhooks
│  ├─ components/                # see §3
│  ├─ lib/
│  │  ├─ catalog/
│  │  │  ├─ types.ts             # domain types (see §4)
│  │  │  ├─ schema.ts            # Zod schemas mirroring types
│  │  │  ├─ repository.ts        # CatalogRepository interface
│  │  │  ├─ sources/local.ts     # v1 implementation reading /content
│  │  │  ├─ queries.ts           # getProductBySlug, listByCategory, related…
│  │  │  └─ search-index.ts      # builds per-locale MiniSearch index
│  │  ├─ inquiry/
│  │  │  ├─ store.ts             # Zustand store (persisted)
│  │  │  ├─ message.ts           # pure fn: inquiry → localized text
│  │  │  └─ whatsapp.ts          # pure fn: text → wa.me URL (+ length guard)
│  │  ├─ i18n/                   # next-intl routing + request config
│  │  ├─ seo/                    # metadata helpers, JSON-LD builders
│  │  ├─ images/                 # loader, size presets
│  │  └─ config/site.ts          # business name, phone, address, hours, feature flags
│  └─ middleware.ts              # locale detection/redirect
└─ docs/ARCHITECTURE.md
```

---

## 2. Page structure

All public routes are prefixed with the locale: `/en/...` and `/es/...`.

| Route | Purpose | Key contents |
|---|---|---|
| `/` | Redirects to `/en` or `/es` (from cookie, then `Accept-Language`) | — |
| `/[locale]` | Home | Hero with WhatsApp CTA, category tiles, featured/new products, "Wholesale & retail welcome" trust strip (Miami location, years in business, bulk pricing, pickup/shipping) |
| `/[locale]/products` | All products | Filter panel, sort, grid, pagination |
| `/[locale]/categories/[...slug]` | Category & subcategory (e.g. `home-goods/curtains`) | Breadcrumbs, subcategory chips, filters, grid, category SEO text |
| `/[locale]/products/[slug]` | Product detail | Gallery, title, SKU, variant selector, quantity/MOQ, Add to inquiry, "Ask on WhatsApp", specs, wholesale info, related products |
| `/[locale]/search?q=` | Search results | Instant client-side results, filters |
| `/[locale]/inquiry` | Inquiry list ("Quote list") | Line items, quantities, optional customer details, Send via WhatsApp |
| `/[locale]/wholesale` | How wholesale works | Who it's for, MOQs, case packs, pricing tiers, pickup/shipping, how to order (step by step) |
| `/[locale]/about` | Family business story | Photos of store/warehouse — builds B2B trust |
| `/[locale]/contact` | Contact | WhatsApp, phone, email, address + map, hours |
| `/[locale]/faq` | FAQ | FAQPage JSON-LD |
| `/[locale]/privacy`, `/terms` | Legal | — |
| `/sitemap.xml`, `/robots.txt` | SEO | Sitemap includes hreflang alternates for every URL |

Global UI on every page: sticky header (logo, search, language switcher,
inquiry icon with item-count badge), mobile bottom-sheet menu, footer with
contact and hours, and a floating WhatsApp button (hidden on the inquiry page,
which has its own primary CTA).

Why `/products/[slug]` and not `/categories/.../[product]`: products can belong
to more than one category. A flat product URL gives each product one
canonical URL, and it stays the same when categories are reorganized.

---

## 3. Component structure

Rule: components are **Server Components unless marked (client)**.

```
components/
├─ ui/                          # design-system primitives, no domain knowledge
│  ├─ Button, IconButton, Badge, Input, Select, Checkbox
│  ├─ QuantityStepper (client)  # respects min / step / max
│  ├─ Sheet / Drawer (client)   # mobile filters, mobile menu
│  ├─ Skeleton, Toast (client)
│  └─ Container, Section, Heading
├─ layout/
│  ├─ Header, Footer, Logo
│  ├─ MobileNav (client)
│  ├─ LanguageSwitcher (client) # keeps current path & query when switching
│  ├─ SearchTrigger (client)
│  ├─ InquiryBadge (client)     # reads store count
│  └─ WhatsAppFab (client)
├─ catalog/
│  ├─ CategoryTile, CategoryGrid
│  ├─ ProductCard               # image, name, "from" price/“Ask for price”, color dots, badges
│  ├─ ProductGrid
│  ├─ FilterPanel (client)      # category, color, availability, customer type, price band
│  ├─ ActiveFilters (client), SortSelect (client)
│  ├─ Pagination
│  ├─ Breadcrumbs
│  └─ SearchDialog (client)     # loads MiniSearch index on first open
├─ product/
│  ├─ ProductView (client wrapper that owns the selected-variant state)
│  │  ├─ ProductGallery (client)    # swipe on mobile, thumbnails, zoom, filtered by variant
│  │  ├─ VariantSelector (client)
│  │  │  ├─ ColorSwatches           # hex or image swatches
│  │  │  └─ OptionPills             # size, pack size, scent…
│  │  ├─ AvailabilityBadge
│  │  ├─ WholesaleInfo              # MOQ, case pack, tier table
│  │  ├─ AddToInquiry (client)      # quantity + add button
│  │  └─ AskOnWhatsApp (client)     # single-product quick message
│  ├─ ProductSpecs                  # attributes table
│  ├─ RelatedProducts
│  └─ ProductJsonLd
├─ inquiry/
│  ├─ InquiryList (client), InquiryLineItem (client)
│  ├─ InquiryCustomerForm (client)  # optional name, business, type, city, notes
│  ├─ InquirySummary (client)
│  ├─ SendInquiryButton (client)    # builds message → opens wa.me
│  └─ EmptyInquiry
└─ seo/
   └─ JsonLd                        # generic <script type="application/ld+json">
```

The product page server component loads the product and passes plain
serializable data to `ProductView`. Only the interactive parts ship JavaScript.
The specs, description, related products and JSON-LD stay server-rendered.

---

## 4. Product data model

Modeled on how Shopify, Medusa and most commerce platforms structure products
(**Product → Options → Variants**, each variant with a SKU), so migrating
later is a field-mapping exercise and not a redesign.

```ts
// lib/catalog/types.ts
export type Locale = "en" | "es";
export type Localized<T = string> = { en: T; es?: T }; // es falls back to en

export interface Money {
  amount: number;          // in cents, never floats
  currency: "USD";
}

export interface Category {
  id: string;               // stable, never reused
  slug: string;             // "curtains"
  parentId?: string;        // → "home-goods"
  name: Localized;
  description?: Localized;  // SEO copy shown on the category page
  image?: ImageAsset;
  sortOrder: number;
}

export interface ImageAsset {
  id: string;
  src: string;              // path/public ID on the image host
  width: number;
  height: number;
  alt: Localized;
  blurDataURL?: string;     // generated at build
}

export interface ProductImage extends ImageAsset {
  // Ties an image to an option value, e.g. { color: "navy" }.
  // Images without this are shown for every variant.
  optionValues?: Record<string, string>;
}

export interface ProductOption {
  id: string;               // "color" | "size" | "pack" | "scent"…
  name: Localized;          // { en: "Color", es: "Color" }
  type: "swatch" | "pill";
  values: OptionValue[];
}

export interface OptionValue {
  id: string;               // "navy"
  label: Localized;         // { en: "Navy", es: "Azul marino" }
  swatch?: { hex?: string; imageId?: string };
}

export type Availability =
  | "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "discontinued";

export interface Variant {
  id: string;               // stable; becomes the cart/inventory key later
  sku: string;              // e.g. "BED-CMF-Q-NVY" — single source of truth across systems
  optionValues: Record<string, string>; // { color: "navy", size: "queen" }
  availability: Availability;           // manual in v1, live later (§9)
  price?: PriceInfo;        // overrides product-level price
  barcode?: string;         // UPC/EAN, useful for POS later
  imageIds?: string[];      // explicit override of image matching
}

export interface WholesaleTerms {
  unit: "piece" | "pack" | "dozen" | "case";
  unitsPerCase?: number;    // e.g. 12 per case
  minQuantity: number;      // MOQ in `unit`s (retail = 1)
  quantityStep: number;     // e.g. must order in multiples of 6
}

export interface PriceInfo {
  // Business decides what is public. "hidden" = "Ask for price".
  visibility: "hidden" | "from" | "exact";
  retail?: Money;
  wholesaleTiers?: { minQuantity: number; price: Money }[];
}

export interface Product {
  id: string;
  slug: string;             // shared across locales in v1
  status: "active" | "draft" | "archived";
  name: Localized;
  shortDescription?: Localized;
  description: Localized;   // limited Markdown
  brand?: string;
  categoryIds: string[];    // first = primary (breadcrumbs, canonical)
  tags: string[];           // "new", "best-seller", "clearance"…
  options: ProductOption[]; // max 3 (Shopify-compatible)
  variants: Variant[];      // ≥ 1; simple products have one default variant
  images: ProductImage[];
  price?: PriceInfo;
  wholesale: WholesaleTerms;
  attributes?: { label: Localized; value: Localized }[]; // material, dimensions, fragrance notes…
  audience?: ("retail" | "wholesale")[];
  featured?: boolean;
  seo?: { title?: Localized; description?: Localized };
  createdAt: string;        // ISO date; drives "New arrivals"
  updatedAt: string;
}
```

Notes:
- **IDs vs slugs:** IDs never change, so inquiry lists saved in browsers and
  future orders keep working. Slugs can change; old slugs go into a redirect map.
- **Simple products** (most perfumes and household items) have zero options and
  one variant. The UI hides the selector automatically.
- **Pricing is optional on purpose.** Many wholesalers show "Ask for price"
  or show prices only to approved buyers. The model supports hidden, "from $X",
  exact retail, and tiered wholesale pricing. Today that is a per-product setting
  in the data. Later it can depend on who is logged in.
- **Money in integer cents** to avoid floating-point errors once real
  checkout arrives.

---

## 5. Variant and image handling

**Image matching**
- Each image can be tagged with option values (`{ color: "navy" }`).
- When a variant is selected, the gallery shows images that match its option
  values first, then untagged images (lifestyle shots, packaging, size charts).
- Untagged products just show all images. Nothing extra to configure.

**Selection behavior**
- The selected variant is reflected in the URL (`/en/products/comforter-set?color=navy&size=queen`)
  so a customer can share or WhatsApp a link to the exact color. The canonical URL
  stays the bare product URL, which avoids duplicate-content issues.
- Default selection: the first variant that is in stock. If none is, the first variant.
- Option values that can't be combined with the current selection, or are out of stock,
  are shown disabled/struck-through instead of hidden, so customers can still see
  every option that exists.
- Product cards show up to ~5 color dots, and hovering or tapping a dot swaps the card image.

**Image delivery**
- `next/image` everywhere, with `sizes` set per layout (grid card vs. PDP hero),
  AVIF/WebP, `priority` only on the LCP image, and blur placeholders.
- Consistent **4:5 portrait** (or 1:1, pick one) crop on a light, neutral
  background across the catalog. A uniform grid makes the biggest visual difference.
- **Hosting:** keep product photos *out of git*. Recommended: **Cloudinary**
  (free tier is generous; `next/image` custom loader; on-the-fly crops,
  background cleanup, auto-format). Alternative: Vercel Blob with Vercel's own
  image optimization (simpler, but watch the image-optimization usage quota as
  the catalog grows). Logos/icons/UI images stay in `public/`.
- Naming convention for uploads: `{product-slug}/{color}-{n}.jpg`
  (e.g. `comforter-set/navy-1.jpg`), which also makes it possible to tag images automatically on import.

**Photography guidelines** (short doc for the family): ≥ 2000 px on the long
edge, same background and lighting, a front shot per color plus 1–3 detail/lifestyle
shots, and a shot showing case pack / packaging for wholesale buyers.

---

## 6. Inquiry list and WhatsApp flow

```
Browse → Product page → pick color/size → set qty → "Add to inquiry"
      ↘ "Ask about this product on WhatsApp" (single-item shortcut)

Inquiry page → review/adjust qty → (optional) name, business, customer type,
city, notes → "Send via WhatsApp" → wa.me opens with a pre-filled message
```

**State**: a Zustand store persisted to `localStorage` (versioned key, with
migration support). It survives refreshes and return visits on the same
device. No account needed.

```ts
interface InquiryLine {
  productId: string;
  variantId: string;
  quantity: number;
  note?: string;
  // display snapshot so the list renders instantly without refetching
  snapshot: { name: Localized; sku: string; variantLabel: Localized; imageSrc: string; slug: string; unit: string };
  addedAt: string;
}
interface InquiryState {
  version: 1;
  lines: InquiryLine[];          // same product+variant = merge quantities
  customer?: { name?: string; business?: string; type?: "store" | "reseller" | "individual"; city?: string; notes?: string };
}
```

- The quantity stepper enforces `minQuantity` and `quantityStep`
  (wholesale) and allows 1 for retail-only items.
- Adding an item shows a toast with "View inquiry" and updates the header
  badge. It does not navigate away from the product page.

**Message builder** (`lib/inquiry/message.ts`, a pure function with unit tests),
written in the customer's current language:

```
Hola Flash! Me interesa cotizar estos productos:
Ref: FL-7K3Q

1) Juego de edredón — Azul marino / Queen
   SKU BED-CMF-Q-NVY · Cantidad: 12 piezas
   https://site.com/es/products/comforter-set?color=navy&size=queen
2) ...

Nombre: María · Negocio: Tienda La Esquina (revendedor) · Hialeah
Notas: ...
```

- **Reference code** (`FL-XXXX`, short random code) so staff can match a
  conversation to a list, and later to a stored inquiry record.
- **Length guard:** WhatsApp pre-fill URLs get unreliable when very long.
  If the message passes a safe limit (~1,500 encoded characters), drop product URLs
  first, then compact lines (name + SKU + qty).
- **URL:** `https://wa.me/<number>?text=<encodeURIComponent(msg)>`. This opens
  the WhatsApp app on mobile and WhatsApp Web on desktop. The number lives in
  `config/site.ts`, so it can be changed in one place or set per language/department.
- Secondary actions: "Copy list" (clipboard) and "Clear list".
- After sending, ask the customer whether to clear the list, rather than clearing it automatically. They
  may come back to add more.
- **Analytics events:** `inquiry_add`, `inquiry_send`, `whatsapp_click`
  (with source: fab / product / inquiry), so we can measure which products
  generate leads.

**Reserved for later (no v1 code):** before opening WhatsApp,
`POST /api/inquiries` stores the inquiry (DB or email via Resend). That gives
the business a lead history and a fallback if WhatsApp isn't installed.
Because the message builder and reference code already exist, this only adds
one call before the redirect.

---

## 7. Localization strategy

- **Library:** next-intl with locale-prefixed routes, `/en/...` and `/es/...`.
  Both are prefixed. That keeps URLs symmetric, makes hreflang simple, and
  avoids redirect logic depending on which language is default.
- **Detection:** `/` redirects using the saved `NEXT_LOCALE` cookie, then
  `Accept-Language`. After that, the user's choice in the switcher always wins
  and is saved in the cookie. Crawlers always see both versions through hreflang.
- **Two kinds of text:**
  1. **UI strings** (buttons, labels, page copy) live in `messages/en.json` and `messages/es.json`,
     use ICU plurals ("1 artículo / 3 artículos"), and are type-checked so a missing key fails the build.
  2. **Catalog content** (product names, descriptions, option labels, alt
     text) is stored as `Localized` fields on the data. `es` falls back to `en`
     when missing, and the content validator reports missing translations as warnings instead of failing the build.
- **Slugs:** shared across languages in v1 (`/es/products/comforter-set`). This
  keeps maintenance much simpler. The model can add `slug: Localized` later
  if Spanish-keyword URLs turn out to matter for SEO.
- **SEO per locale:** localized `<title>`/description, `<html lang>`,
  `alternates.languages` (hreflang `en`, `es`, `x-default`), localized OG tags,
  sitemap entries with alternates.
- **Formatting:** `Intl` for currency/numbers/dates per locale.
- **Adding a third language later** (e.g. Portuguese or Haitian Creole for
  South Florida) means adding a messages file and optional `Localized` keys.
  No code changes.

---

## 8. How to handle product data initially

**Recommendation for v1: typed JSON files in the repo (`content/`), validated
by Zod, behind a `CatalogRepository` interface.**

```ts
// lib/catalog/repository.ts
export interface CatalogRepository {
  listCategories(): Promise<Category[]>;
  listProducts(filter?: ProductFilter): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
}
```

Why:
- Free, zero infrastructure, fully static output, version history of every
  price/description change, preview deploys show changes before they go live.
- One file per product means small diffs and no merge conflicts.
- Validation runs before every build: missing image, duplicate SKU, bad
  category reference, or missing Spanish name is caught before deploy.
- `scripts/import-from-sheet.ts` lets the family keep a **Google Sheet / CSV**
  (one row per variant: SKU, name EN/ES, category, color, price, MOQ…) and
  generate the JSON from it. Non-developers can then manage most data without
  touching code.

When to move off files: once non-technical family members need to edit
products themselves every week, or the catalog passes roughly 1–2k products. At that point
the options are:
- **Headless CMS** (e.g. Sanity): great editing UI with image uploads and
  field-level translation. Add `sources/sanity.ts` and switch pages to ISR with
  on-demand revalidation via webhook.
- **Commerce platform** (see §9) if inventory/checkout are coming at the same time.
  The platform then becomes the catalog source, which avoids a migration in between.

In both cases only `lib/catalog/sources/*` and the revalidation setup change.
Pages and components stay as they are.

---

## 9. Path to inventory, accounts and checkout

The v1 design already reserves a place for each of these:

| Future capability | Already in place in v1 | What gets added later |
|---|---|---|
| **Inventory** | `Variant.sku` as the universal key; `availability` field; `barcode` | An `InventoryProvider` (platform API or POS sync) returning live stock per SKU; product pages use ISR + webhook revalidation, or fetch stock client-side |
| **Online checkout** | Inquiry line = `{variantId, quantity}` = a cart line; money in cents; `api/` reserved | `CheckoutProvider` (Shopify checkout or Stripe Checkout). The inquiry page gains a "Checkout" button next to "Send via WhatsApp", controlled by a feature flag in `config/site.ts` |
| **Customer accounts / B2B pricing** | `PriceInfo.visibility`, `wholesaleTiers`, `audience` | Auth (Auth.js or the platform's customer accounts). "Approved wholesale buyer" unlocks tier prices; route group `(account)` for order history and saved lists |
| **Shipping** | Product weight/dimensions can go in `attributes`, later as typed fields | Rates come from the commerce platform or a shipping API at checkout; local pickup in Miami as a first option |
| **Lead tracking** | Inquiry reference codes, analytics events | `POST /api/inquiries` → database/CRM/email |

**Recommended future direction:** if the business also has a physical
store, **Shopify used headlessly** (Storefront API) is the most practical next step.
It provides inventory, checkout, payments, taxes and shipping, and **Shopify POS**
keeps in-store and online stock in sync. Because our model follows Shopify's
Product → Options (≤3) → Variants + SKU structure, migration is a script that
pushes `content/` into Shopify, followed by a new `sources/shopify.ts`.
The site's design, URLs and SEO stay the same.
Caveat: Shopify's native B2B/wholesale price-list features need the Plus plan.
On lower plans, tiered wholesale pricing would be handled with
customer tags/apps or kept as "request a quote".
The alternative, for full control and no platform fees, is **Medusa** or a custom Postgres + Stripe
backend, at the cost of more engineering.

The decision does not need to be made now. v1 keeps both options open.

---

## SEO and performance checklist (applies to everything above)

- Metadata API per page; canonical URLs; hreflang; `sitemap.ts`; `robots.ts`.
- JSON-LD: `Organization` + **`LocalBusiness`** (Miami address, hours,
  phone, which matters for local search), `BreadcrumbList`, `Product`
  (with `offers` only when a price is public), `FAQPage`.
- Dynamic Open Graph images per product (`opengraph-image.tsx`) so links shared
  on WhatsApp/Facebook show the product photo and name.
- Recommend setting up a Google Business Profile that points to the site.
- Targets: Lighthouse ≥ 95 mobile, LCP < 2.0 s on 4G, JS per route kept small
  (check with `@next/bundle-analyzer`). Fonts via `next/font` (self-hosted, no
  layout shift).
- Accessibility: semantic HTML, keyboard-navigable variant picker (radio-group
  semantics), alt text required by the schema, color contrast checked in the design tokens.

---

## Proposed delivery phases

1. **Foundation:** Next.js + TS + Tailwind scaffold, i18n routing, design
   tokens, layout (header/footer/mobile nav), site config, Vercel project.
2. **Catalog:** data model + Zod + local repository, sample content (port the
   existing products), home, category, product listing, product detail with
   variants/gallery.
3. **Inquiry:** store, inquiry page, WhatsApp message builder (+ tests),
   single-product "Ask on WhatsApp", floating button.
4. **Search & filters:** MiniSearch index, search dialog/page, URL-synced filters.
5. **Content & SEO:** wholesale/about/contact/FAQ pages, JSON-LD, sitemap, OG
   images, analytics events, Lighthouse pass.
6. **Data tooling:** CSV/Sheet import script + photo guidelines doc.

---

## Open questions for the business

1. **Prices:** show them publicly (retail, wholesale tiers, both), show
   "from $X", or always "Ask for price"? Can it vary per product?
2. **Who maintains products**, roughly how many products/variants, and how
   often do they change? (Decides JSON vs. Sheet import vs. CMS sooner.)
3. **Wholesale rules:** minimum order quantities, case packs, minimum order
   value? Same for all products or per product?
4. **Default language:** should first-time visitors without a browser
   preference land on Spanish or English?
5. **Physical store / POS:** is there an existing POS or inventory spreadsheet?
   (Affects the long-term Shopify vs. custom decision.)
6. **WhatsApp:** one number for everyone, or separate numbers for wholesale
   vs. retail? Is it a WhatsApp Business account?
7. **Brand:** confirm business name, logo and colors ("Flash Electronics
   International" vs. a merchandise-focused name), and the domain.
8. **Fulfillment info to publish:** local pickup, delivery area, shipping to
   other states/countries (Caribbean/Latin America exports are common for Miami
   wholesalers)?
