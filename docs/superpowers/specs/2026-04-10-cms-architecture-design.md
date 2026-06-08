# Wild Care CMS Architecture Spec

**Date:** 2026-04-10
**Stack:** Sanity CMS + Astro + Netlify
**Status:** Draft

---

## 1. Overview

Rebuild the Wild Care website from Eleventy + Decap CMS to **Astro + Sanity CMS**, hosted on Netlify. The goal is a fully CMS-editable, bilingual (DE/EN) site with structured content models, a distraction-free editor experience, and automated SEO.

### Stack Decision

| Layer | Choice | Rationale |
|---|---|---|
| CMS | Sanity (free tier, 3 users) | Portable Text block editor, field-level i18n, roles, publishing pipeline |
| Frontend | Astro (static) | Built-in i18n routing, content collections with schema validation, optional SSR later |
| Hosting | Netlify | Current setup, webhook-triggered builds, daily cron |
| Studio | Sanity Cloud (`wildcare.sanity.studio`) | Decoupled from site builds |

---

## 2. Content Architecture

### 2.1 Generic Section Blocks

Reusable blocks that editors can add to any composable page via an ordered sections array:

| Block | Fields | Purpose |
|---|---|---|
| `heroVideo` | heading (loc), subtitle (loc), cta (loc), video, poster image, scroll hint toggle | Video hero |
| `heroImage` | heading (loc), subtitle (loc), cta (loc), background image | Static hero |
| `richText` | body (loc Portable Text) | Free-form content |
| `imageTextSplit` | image, text (loc), layout enum (image-left / image-right) | Side-by-side section |
| `valueCards` | array of `{ icon, title (loc), description (loc) }` | Card grid |
| `quoteBand` | quote (loc), attribution (loc) | Full-width quote strip |
| `ctaBanner` | heading (loc), description (loc), buttonLabel (loc), buttonLink | Call to action |
| `testimonials` | array of `{ quote (loc), author }` | Testimonial grid |
| `embedForm` | title (loc), description (loc), embedUrl | Tally forms, etc. |
| `mapEmbed` | address, coordinates (optional) | Google Maps |
| `htmlEmbed` | raw HTML/iframe code, caption (loc) | Future payment widgets |
| `contactInfo` | array of `{ icon, label (loc), value (loc), link }` | Structured contact details |

**(loc)** = localized field with DE (required) and EN (optional) variants.

### 2.2 Page-Specific Structured Documents

Pages with unique layouts have fixed field structures rather than generic section blocks:

#### Homepage
- Sections array of generic blocks
- `eventBanner`: auto-populated from next upcoming Event, with optional override text

#### Montagskurs
- `hero`: detail hero with badge, subtitle, detail rows (icon + label + value)
- `infoCard`: title (loc), info rows `{ icon, label, value }[]`, cta button
- `description`: localized Portable Text
- `quote`: text (loc), attribution (loc)

#### Bewegungsrevolution
- `hero`: detail hero with photo/video, badge, details
- `about`: text (loc) + card grid `{ number, title, description }[]`
- `projectCards`: array of `{ tag, title, subtitle, description, details[] }`
- `previewCards`: array of `{ label, title, subtitle, description, cta }`
- `testimonials`: testimonial array
- `faqList`: array of `{ question (loc), answer (loc) }`
- `donationNote`: localized Portable Text

#### Mitmachen
- `hero`
- `circlesVisual`: outer circle `{ title, description, tags[] }`, inner circle same
- `circleCards`: array of detail cards
- `coreMessage`: localized text
- `membershipTiers`: array of `{ icon, name (loc), amount, description (loc), note (loc) }`
- `membershipFormEmbed`: Tally URL

#### Team
- `hero`
- `teamMembers`: reference to Team Members collection
- `philosophy`: intro text (loc) + pillar cards `{ title (loc), description (loc) }[]`
- `manifestBox`: quote text (loc)

#### Kontakt
- Sections array of generic blocks (contactInfo, embedForm, mapEmbed, highlightBox)

#### Impressum / Datenschutz
- `hero` (simple heading)
- `legalBody`: localized Portable Text

### 2.3 Collections

#### Event
| Field | Type | Notes |
|---|---|---|
| `title` | localized string | Required |
| `slug` | slug, auto from title | |
| `startDateTime` | datetime | Required |
| `endDateTime` | datetime | Required |
| `recurrenceType` | enum: `single`, `weekly`, `block` | |
| `recurrenceRule` | `{ dayOfWeek, endDate }` | Only for `weekly`. **Important:** GROQ cannot compute future dates from a rule. At build time, Astro expands the rule into flat event instances for the next 8 weeks. These computed instances are used for homepage "next event" queries and the schedule listing. |
| `blockDates` | array of `{ startDate, endDate, label }` | Only for `block`. Each entry is a date range. A contiguous workshop (Fri-Sun) = 1 entry. A defined series (every Monday in June) = multiple entries, one per session. |
| `location` | string | Default: "Orpheumgasse 11, Graz" |
| `cost` | string | Default: "Spendenbasis" |
| `description` | localized Portable Text | |
| `seo` | `{ metaTitle, metaDescription, ogImage }` | Optional, auto-fallbacks |

#### Journal Article
| Field | Type | Notes |
|---|---|---|
| `title` | localized string | Required |
| `slug` | slug, auto from title | |
| `publishedAt` | datetime | |
| `status` | enum: `draft`, `scheduled`, `published` | Controls visibility |
| `image` | image + alt text | Help: "Landscape, min 1200px wide, max 1MB" |
| `excerpt` | localized text | Max 200 chars |
| `body` | localized Portable Text | Blocks: paragraph, image, pull-quote, HTML embed |
| `seo` | object | |

#### Team Member
| Field | Type |
|---|---|
| `name` | string |
| `role` | localized string |
| `bio` | localized Portable Text |
| `portrait` | image |
| `sortOrder` | number |

### 2.4 Singletons

#### Navigation
- `mainMenu`: ordered array of `{ label_de, label_en, href, children[] }`
- `footerMenu`: ordered array of `{ label_de, label_en, href }`
- `ctaButton`: `{ label_de, label_en, href }`
- `showLanguageSwitcher`: boolean

#### Site Settings
- `vereinName`, `address`, `email`, `phone`
- `zvrZahl` (Austrian association number)
- `socialLinks`: array of `{ platform, url }`
- `defaultOgImage`: image (fallback for social sharing)
- `copyrightYear`: number

#### Donation Info
- `bankName`, `iban`, `bic`, `accountHolder`
- `qrCodeImage`: image (SEPA QR code)
- `donationText`: localized Portable Text (supports HTML embed block for future Stripe/PayPal)
- `membershipFormEmbed`: URL (Tally form)

---

## 3. Internationalization (i18n)

### Routing

- Default locale: `de` (no URL prefix)
- English: `/en/` prefix
- Astro built-in i18n config handles route generation

```
/                     → DE homepage
/en/                  → EN homepage
/programm/            → DE programme
/en/programme/        → EN programme
/journal/warum-ci/    → DE article
/en/journal/why-ci/   → EN article
```

### Translation Strategy

- **Field-level** localization in Sanity (not document-level)
- Each document has DE and EN variants of text fields
- DE fields are required, EN fields are optional
- Editor sees a language tab or toggle at the top of the document to switch between DE/EN input

### Fallback Logic

- If EN fields are empty for a document, it is **hidden entirely from the English site**
- No mixed-language pages, no "translation pending" notices
- Language switcher only shows the toggle for pages that have a translation

### hreflang Tags

Auto-generated in `<head>` for every page that exists in both languages:

```html
<link rel="alternate" hreflang="de" href="https://wildcare.space/kontakt/" />
<link rel="alternate" hreflang="en" href="https://wildcare.space/en/contact/" />
<link rel="alternate" hreflang="x-default" href="https://wildcare.space/kontakt/" />
```

`x-default` always points to DE.

### Language Switcher

- Persistent toggle in global navigation
- On click: looks up translation of current document via Sanity reference
- Redirects to the translated URL of the same content (not the homepage)

---

## 4. SEO & Structured Data

### Per-Page SEO Fields

Every page and article document has an `seo` object in Sanity:
- `metaTitle`: max 60 chars (character counter in Studio)
- `metaDescription`: max 160 chars (character counter in Studio)
- `ogImage`: image upload for social previews

### Auto-Fallbacks

Built into `SeoHead.astro`:

| Field | Fallback if empty |
|---|---|
| `metaTitle` | Page `title` + " — Wild Care" |
| `metaDescription` | First 150 characters of the page's first richText block |
| `ogImage` | `defaultOgImage` from Site Settings singleton |

### Rendered Meta Tags

```html
<title>{metaTitle}</title>
<meta name="description" content="{metaDescription}" />
<meta property="og:title" content="{metaTitle}" />
<meta property="og:description" content="{metaDescription}" />
<meta property="og:image" content="{ogImage}" />
<meta property="og:type" content="website" /> <!-- "article" for journal -->
<meta property="og:locale" content="de_AT" />
```

### JSON-LD Structured Data

Auto-generated from Sanity data, injected in `<head>`:

**Every page — LocalBusiness:**
```json
{
  "@type": "LocalBusiness",
  "name": "Wild Care",
  "address": { "streetAddress": "Orpheumgasse 11", "addressLocality": "Graz" },
  "email": "...",
  "url": "https://wildcare.space",
  "identifier": { "@type": "PropertyValue", "name": "ZVR-Zahl", "value": "..." }
}
```

**Event pages — Schema.org/Event:**
```json
{
  "@type": "Event",
  "name": "...",
  "startDate": "2026-04-14T17:45:00+02:00",
  "endDate": "2026-04-14T19:45:00+02:00",
  "location": { "@type": "Place", "name": "Orpheumgasse 11, Graz" },
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR", "description": "Spendenbasis" }
}
```

**Journal articles — Schema.org/Article:**
```json
{
  "@type": "Article",
  "headline": "...",
  "datePublished": "...",
  "author": { "@type": "Organization", "name": "Wild Care" },
  "image": "..."
}
```

### Sitemap & Robots

- Auto-generated `sitemap.xml` via `@astrojs/sitemap` (all DE and EN URLs)
- `robots.txt` allows all crawlers, points to sitemap
- `/studio/` excluded from sitemap

---

## 5. Editor Experience & Roles

### Roles

| Role | Access |
|---|---|
| **Admin** | All documents, Site Settings, Navigation, Donation Info, Studio config |
| **Editor** | Events, Journal Articles, Pages (content fields only) |

Implemented via Sanity's built-in role system. Admin-only singletons hidden from Editor navigation.

### Portable Text Toolbar

Limited to: paragraph, heading 2, heading 3, bold, italic, link, image block, pull-quote block, HTML embed block.

**Explicitly excluded:** font size, color picker, alignment, margin controls, custom CSS.

### Inline Help Text

Every field has a `description` in the Sanity schema:

| Field | Help text |
|---|---|
| Event `location` | "Default: Orpheumgasse 11, Graz. Only change for external venues." |
| Journal `image` | "Please upload landscape images, min 1200px wide, max 1MB." |
| Journal `excerpt` | "Short summary shown on listing cards. Max 200 characters." |
| SEO `metaTitle` | "Max 60 characters. Leave empty to auto-generate from page title." |
| SEO `metaDescription` | "Max 160 characters. Leave empty to auto-generate from content." |
| Event `recurrenceType` | "Single: one-time event. Weekly: repeats on a fixed day. Block: multi-day or defined series." |
| HTML Embed `code` | "Paste iframe or embed code from trusted sources only (Tally, Stripe, YouTube)." |

### Publishing Pipeline (Journal only)

| Status | Behavior |
|---|---|
| `draft` | Visible in Studio only |
| `scheduled` | Editor sets `publishedAt` in the future; daily cron build publishes once date passes |
| `published` | Live on site |

Events have no pipeline — they're visible immediately, controlled by date-based queries.

---

## 6. Donations & Membership

### Bank Details & QR Code
- Managed via Donation Info singleton in Sanity
- Fields: bank name, IBAN, BIC, account holder, SEPA QR code image
- Displayed via `donationBlock` or embedded in page-specific structures

### Membership Registration
- Tally form embedded via `embedForm` section block or `membershipFormEmbed` field
- Form collects member details; Verein handles approval offline

### Future Payment Integration
- Rich Text and HTML Embed blocks support `<iframe>` code
- Editors can paste Stripe/PayPal/fundraising embeds without developer involvement

---

## 7. Deployment & Build Pipeline

### Build Flow

```
Editor publishes in Sanity
  → Sanity webhook fires
  → Triggers Netlify build hook
  → Astro fetches content from Sanity API
  → Generates static HTML
  → Deployed to wildcare.space
```

### Build Triggers

| Trigger | Mechanism |
|---|---|
| Content change | Sanity webhook → Netlify build hook |
| Code change | Git push to `main` → Netlify build |
| Daily cron | Netlify scheduled build at 04:00 CET — event archiving + scheduled article publishing |

### Environments

| Environment | Branch | URL | Sanity Dataset |
|---|---|---|---|
| Production | `main` | `wildcare.space` | `production` |
| Preview | feature branches | Netlify deploy previews | `production` (read-only) |

### Sanity Studio

Hosted on Sanity Cloud at `wildcare.sanity.studio`. Decoupled from site builds.

### Migration Path

1. Set up Sanity project + define schemas
2. Seed Sanity with current content (YAML data + markdown journal posts)
3. Build Astro site, reusing current CSS
4. Wire up Netlify build hook + Sanity webhook
5. Switch DNS when Astro version is tested

Current Eleventy site stays live until cutover.

---

## 8. Frontend Architecture (Astro)

### Project Structure

```
/src/
├── pages/
│   ├── index.astro                → DE home
│   ├── [...slug].astro            → DE dynamic pages
│   ├── journal/
│   │   ├── index.astro            → DE listing
│   │   └── [slug].astro           → DE article
│   └── en/
│       ├── index.astro            → EN home
│       ├── [...slug].astro        → EN dynamic pages
│       └── journal/
│           ├── index.astro
│           └── [slug].astro
├── components/
│   ├── sections/                  → One component per generic section block
│   │   ├── HeroVideo.astro
│   │   ├── HeroImage.astro
│   │   ├── RichText.astro
│   │   ├── ImageTextSplit.astro
│   │   ├── ValueCards.astro
│   │   ├── QuoteBand.astro
│   │   ├── CtaBanner.astro
│   │   ├── Testimonials.astro
│   │   ├── EmbedForm.astro
│   │   ├── MapEmbed.astro
│   │   ├── HtmlEmbed.astro
│   │   └── ContactInfo.astro
│   ├── pages/                     → Page-specific layout components
│   │   ├── Montagskurs.astro
│   │   ├── Bewegungsrevolution.astro
│   │   ├── Mitmachen.astro
│   │   └── TeamPage.astro
│   ├── Nav.astro
│   ├── Footer.astro
│   ├── LanguageSwitcher.astro
│   └── SeoHead.astro
├── lib/
│   ├── sanity.ts                  → Sanity client + GROQ queries
│   ├── i18n.ts                    → Locale helpers, URL mapping
│   └── schema.ts                  → JSON-LD generators
├── layouts/
│   └── Base.astro                 → Shell: head, nav, footer, scripts
└── styles/
    └── global.css                 → Migrated from current styles.css
```

### Section Rendering

Generic pages render their sections array dynamically:

```astro
{sections.map(section => {
  switch(section._type) {
    case 'heroVideo': return <HeroVideo {...section} />
    case 'richText': return <RichText {...section} />
    case 'ctaBanner': return <CtaBanner {...section} />
    ...
  }
})}
```

Page-specific documents render their fixed-field components directly.

### Data Fetching

All pages fetch from Sanity at build time via `@sanity/client` and GROQ queries:
- Next event: `*[_type == "event" && startDateTime > now()] | order(startDateTime asc)[0]`
- Journal listing: `*[_type == "journal" && status == "published" && defined(title[$locale])] | order(publishedAt desc)` — filters to articles that have the requested locale's title filled in
- Past events excluded by date query; daily cron rebuild keeps the site current

---

## 9. Image Optimization

All images served via **Sanity's Image CDN** using `@sanity/image-url`:
- Dynamic resizing, cropping, and format conversion (WebP/AVIF) at the CDN level
- No image processing during Astro/Netlify build — keeps builds fast and within free tier limits
- Responsive `srcset` attributes generated from Sanity image URLs with width parameters
- Editors upload originals; the CDN handles optimization on delivery

---

## 10. Constraints & Limits

| Constraint | Detail |
|---|---|
| Sanity free tier | 3 users max (1 Admin + 2 Editors). Sufficient for current team. Upgrade to Teams plan if more volunteers need access. |
| Netlify free tier | 300 build minutes/month, 100GB bandwidth. Well within range for a ~15 page static site. |
| Build freshness | Content updates appear after a Netlify rebuild (~30s). Not real-time, but fast enough. |
| Scheduled publishing | Accuracy is daily (04:00 CET cron), not minute-precise. Acceptable for journal articles and event archiving. |

---

## 11. Out of Scope (for now)

- **Taxonomies/tags** on journal posts — can be added later as a Sanity reference list
- **Online payment processing** — HTML embed block ready for future Stripe/PayPal integration
- **Complex RBAC** beyond Admin/Editor — sufficient for 1-2 editors
- **SSR** — static build with daily cron is sufficient; SSR can be enabled per-route later if needed
- **Search** — not needed at current content volume
