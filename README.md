# Flash Electronics International — Website

Bilingual (English/Spanish) wholesale and retail catalog for a family-owned
merchandise business in Miami. Visitors browse products, build an inquiry
list and send it on WhatsApp. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the full design.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · next-intl · Vercel

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev        # http://localhost:3000 (English) and /es (Spanish)
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | Generates route types, then runs TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (also sorts Tailwind classes) |
| `npm run check` | Typecheck + lint + format check (run before pushing) |

## Where things live

| What | Where |
|---|---|
| Business settings (WhatsApp number, address, hours, pricing switch, wholesale minimum, pickup/delivery) | `src/lib/config/site.ts` |
| Brand colors and design tokens | `src/app/globals.css` (`@theme` block) |
| UI text in English / Spanish | `messages/en.json`, `messages/es.json` |
| Pages | `src/app/[locale]/…` |
| Header, footer, menus, WhatsApp button | `src/components/layout/` |
| Language routing (English at `/`, Spanish at `/es`) | `src/i18n/`, `src/proxy.ts` |

### Design tokens

All colors are defined once in `src/app/globals.css`. Components use the
semantic names (`bg-primary`, `text-ink`, `bg-canvas`, `bg-surface`,
`bg-accent`, `border-line`…), never raw hex values. To adjust the palette,
change the navy/gold scales or the semantic mappings there. The browser theme
color in `src/app/[locale]/layout.tsx` should match `--color-primary`.

- **Primary (deep navy):** header, footer, headings, primary buttons
- **Accent (muted gold):** use sparingly for key CTAs, small highlights and focus rings
- **Canvas (warm off-white):** page background
- **Surface (white):** cards and panels
- **Ink (charcoal):** body text

### Translations

Add every new UI string to **both** message files. The build fails if
`es.json` is missing a key that exists in `en.json`.

## Deploying to Vercel

1. Import the GitHub repository in Vercel (framework preset: Next.js, no
   build settings to change).
2. Set the environment variable `NEXT_PUBLIC_SITE_URL` for Production to the
   real domain (e.g. `https://www.example.com`). It's used for canonical
   links, hreflang tags and the sitemap. See `.env.example`.
3. Every branch and pull request gets its own preview deployment.

Use the Vercel **Pro** plan for the live site, because Hobby is limited to
non-commercial use.
