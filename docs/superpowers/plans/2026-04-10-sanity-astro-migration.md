# Wild Care: Sanity + Astro Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Wild Care website from Eleventy + Decap CMS to Astro + Sanity CMS, hosted on Netlify, with full bilingual (DE/EN) support and CMS-editable content.

**Architecture:** Sanity Studio (hosted on Sanity Cloud) provides structured content via GROQ API. Astro fetches content at build time, generates static HTML for all DE and EN routes. Netlify deploys on git push and Sanity webhook triggers. Current CSS design system is preserved as-is.

**Tech Stack:** Astro 5, Sanity v3 Studio, `@sanity/client`, `@sanity/image-url`, `@astrojs/sitemap`, Netlify

**Spec:** `docs/superpowers/specs/2026-04-10-cms-architecture-design.md`

---

## File Structure

```
/                                    # Project root
├── studio/                          # Sanity Studio (separate npm project)
│   ├── package.json
│   ├── sanity.config.ts             # Studio config: project ID, dataset, plugins
│   ├── sanity.cli.ts                # CLI config
│   ├── schemas/
│   │   ├── index.ts                 # Schema registry (exports all types)
│   │   ├── helpers/
│   │   │   ├── localeString.ts      # Localized string field helper
│   │   │   ├── localeText.ts        # Localized text field helper
│   │   │   ├── localePortableText.ts # Localized Portable Text helper
│   │   │   └── seoFields.ts         # Reusable SEO object
│   │   ├── blocks/                  # Generic section block types
│   │   │   ├── heroVideo.ts
│   │   │   ├── heroImage.ts
│   │   │   ├── richText.ts
│   │   │   ├── imageTextSplit.ts
│   │   │   ├── valueCards.ts
│   │   │   ├── quoteBand.ts
│   │   │   ├── ctaBanner.ts
│   │   │   ├── testimonials.ts
│   │   │   ├── embedForm.ts
│   │   │   ├── mapEmbed.ts
│   │   │   ├── htmlEmbed.ts
│   │   │   └── contactInfo.ts
│   │   ├── documents/               # Page documents
│   │   │   ├── homepage.ts
│   │   │   ├── montagskurs.ts
│   │   │   ├── bewegungsrevolution.ts
│   │   │   ├── mitmachen.ts
│   │   │   ├── teamPage.ts
│   │   │   ├── kontakt.ts
│   │   │   └── legalPage.ts
│   │   ├── collections/             # Content collections
│   │   │   ├── event.ts
│   │   │   ├── journalArticle.ts
│   │   │   └── teamMember.ts
│   │   └── singletons/              # Global singletons
│   │       ├── navigation.ts
│   │       ├── siteSettings.ts
│   │       └── donationInfo.ts
│   └── structure.ts                 # Desk structure (sidebar organization)
├── src/                             # Astro site (replaces Eleventy)
│   ├── pages/
│   │   ├── index.astro              # DE homepage
│   │   ├── [...slug].astro          # DE dynamic pages
│   │   ├── journal/
│   │   │   ├── index.astro          # DE journal listing
│   │   │   └── [slug].astro         # DE journal article
│   │   └── en/
│   │       ├── index.astro          # EN homepage
│   │       ├── [...slug].astro      # EN dynamic pages
│   │       └── journal/
│   │           ├── index.astro      # EN journal listing
│   │           └── [slug].astro     # EN journal article
│   ├── components/
│   │   ├── sections/                # One per generic section block
│   │   │   ├── SectionRenderer.astro
│   │   │   ├── HeroVideo.astro
│   │   │   ├── HeroImage.astro
│   │   │   ├── RichText.astro
│   │   │   ├── ImageTextSplit.astro
│   │   │   ├── ValueCards.astro
│   │   │   ├── QuoteBand.astro
│   │   │   ├── CtaBanner.astro
│   │   │   ├── Testimonials.astro
│   │   │   ├── EmbedForm.astro
│   │   │   ├── MapEmbed.astro
│   │   │   ├── HtmlEmbed.astro
│   │   │   └── ContactInfo.astro
│   │   ├── pages/                   # Page-specific layout components
│   │   │   ├── MontagskursPage.astro
│   │   │   ├── BewegungsrevolutionPage.astro
│   │   │   ├── MitmachenPage.astro
│   │   │   └── TeamPage.astro
│   │   ├── Nav.astro
│   │   ├── Footer.astro
│   │   ├── LanguageSwitcher.astro
│   │   ├── SeoHead.astro
│   │   └── PortableText.astro
│   ├── lib/
│   │   ├── sanity.ts                # Sanity client + GROQ queries
│   │   ├── i18n.ts                  # Locale helpers, URL mapping
│   │   ├── schema.ts               # JSON-LD generators
│   │   └── image.ts                 # Sanity image URL builder
│   ├── layouts/
│   │   └── Base.astro               # Shell: head, nav, footer
│   └── styles/
│       └── global.css               # Migrated from current src/css/styles.css
├── public/
│   ├── assets/                      # Static assets (videos, images not in Sanity)
│   ├── robots.txt
│   └── favicon.ico
├── astro.config.mjs
├── package.json                     # Astro project deps
├── netlify.toml                     # Updated for Astro
├── .env                             # Sanity project ID + dataset (gitignored)
└── tsconfig.json
```

---

## Phase 1: Project Foundation

### Task 1: Initialize Astro Project

**Files:**
- Create: `package.json` (overwrite existing Eleventy one)
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `netlify.toml`

- [ ] **Step 1: Initialize Astro with npm**

```bash
# From project root
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict
```

Select overwrite when prompted. This creates `astro.config.mjs`, `tsconfig.json`, and a fresh `package.json`.

- [ ] **Step 2: Install dependencies**

```bash
npm install @sanity/client @sanity/image-url @portabletext/to-html
npm install -D @astrojs/sitemap
```

- [ ] **Step 3: Configure Astro**

Write `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://wildcare.space',
  integrations: [sitemap({
    filter: (page) => !page.includes('/studio/'),
  })],
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
```

- [ ] **Step 4: Create environment file**

Write `.env.example`:

```
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_API_VERSION=2026-04-10
```

- [ ] **Step 5: Update .gitignore**

Append to `.gitignore`:

```
dist/
.astro/
.env
_site/
```

- [ ] **Step 6: Update netlify.toml**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

- [ ] **Step 7: Migrate static assets**

```bash
mkdir -p public/assets/images public/assets
cp src/assets/video-hero.mp4 public/assets/
cp "src/assets/what is ci.mp4" public/assets/
cp src/assets/images/*.jpg src/assets/images/*.png public/assets/images/
```

- [ ] **Step 8: Migrate CSS**

```bash
mkdir -p src/styles
cp src/css/styles.css src/styles/global.css
```

- [ ] **Step 9: Copy scroll animations script**

```bash
mkdir -p public/js
cp src/js/scroll-animations.js public/js/
```

- [ ] **Step 10: Verify Astro builds**

```bash
npx astro build
```

Expected: Build succeeds (empty site, no pages yet). Output in `dist/`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: initialize Astro project with Sanity dependencies"
```

---

### Task 2: Initialize Sanity Studio

**Files:**
- Create: `studio/package.json`
- Create: `studio/sanity.config.ts`
- Create: `studio/sanity.cli.ts`
- Create: `studio/tsconfig.json`
- Create: `studio/schemas/index.ts`

- [ ] **Step 1: Create Sanity project via CLI**

```bash
# Must have sanity CLI installed globally: npm i -g sanity
cd studio
npm init sanity@latest -- --project-plan free --dataset production --output-path . --typescript
```

This will prompt to create a new Sanity project or select an existing one. Choose "Create new project" and name it "wild-care". Note the project ID for `.env`.

- [ ] **Step 2: Configure sanity.config.ts**

```ts
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemas';

export default defineConfig({
  name: 'wild-care',
  title: 'Wild Care',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'YOUR_PROJECT_ID',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
});
```

- [ ] **Step 3: Create empty schema registry**

Write `studio/schemas/index.ts`:

```ts
export const schemaTypes: any[] = [];
```

- [ ] **Step 4: Verify Studio starts**

```bash
cd studio && npx sanity dev
```

Expected: Studio opens at `localhost:3333` with no document types.

- [ ] **Step 5: Commit**

```bash
cd .. && git add studio/
git commit -m "feat: initialize Sanity Studio project"
```

---

### Task 3: Sanity Client & Image Helper (Astro side)

**Files:**
- Create: `src/lib/sanity.ts`
- Create: `src/lib/image.ts`

- [ ] **Step 1: Create Sanity client**

Write `src/lib/sanity.ts`:

```ts
import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: import.meta.env.SANITY_API_VERSION || '2026-04-10',
  useCdn: true,
});
```

- [ ] **Step 2: Create image URL helper**

Write `src/lib/image.ts`:

```ts
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { sanityClient } from './sanity';

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/
git commit -m "feat: add Sanity client and image URL helper"
```

---

## Phase 2: Sanity Schemas — Helpers & Blocks

### Task 4: Localized Field Helpers + SEO Object

**Files:**
- Create: `studio/schemas/helpers/localeString.ts`
- Create: `studio/schemas/helpers/localeText.ts`
- Create: `studio/schemas/helpers/localePortableText.ts`
- Create: `studio/schemas/helpers/seoFields.ts`
- Modify: `studio/schemas/index.ts`

- [ ] **Step 1: Create localeString helper**

Write `studio/schemas/helpers/localeString.ts`:

```ts
import { defineType } from 'sanity';

export const localeString = defineType({
  name: 'localeString',
  title: 'Localized String',
  type: 'object',
  fields: [
    {
      name: 'de',
      title: 'Deutsch',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'en',
      title: 'English',
      type: 'string',
    },
  ],
});
```

- [ ] **Step 2: Create localeText helper**

Write `studio/schemas/helpers/localeText.ts`:

```ts
import { defineType } from 'sanity';

export const localeText = defineType({
  name: 'localeText',
  title: 'Localized Text',
  type: 'object',
  fields: [
    {
      name: 'de',
      title: 'Deutsch',
      type: 'text',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'en',
      title: 'English',
      type: 'text',
    },
  ],
});
```

- [ ] **Step 3: Create localePortableText helper**

Write `studio/schemas/helpers/localePortableText.ts`:

```ts
import { defineType, defineArrayMember } from 'sanity';

const portableTextFields = [
  defineArrayMember({
    type: 'block',
    styles: [
      { title: 'Normal', value: 'normal' },
      { title: 'H2', value: 'h2' },
      { title: 'H3', value: 'h3' },
    ],
    marks: {
      decorators: [
        { title: 'Bold', value: 'strong' },
        { title: 'Italic', value: 'em' },
      ],
      annotations: [
        {
          name: 'link',
          type: 'object',
          title: 'Link',
          fields: [
            { name: 'href', type: 'url', title: 'URL' },
            { name: 'blank', type: 'boolean', title: 'Open in new tab', initialValue: false },
          ],
        },
      ],
    },
  }),
  defineArrayMember({
    type: 'image',
    options: { hotspot: true },
    fields: [
      { name: 'alt', type: 'string', title: 'Alt text', validation: (Rule) => Rule.required() },
    ],
  }),
];

export const localePortableText = defineType({
  name: 'localePortableText',
  title: 'Localized Rich Text',
  type: 'object',
  fields: [
    {
      name: 'de',
      title: 'Deutsch',
      type: 'array',
      of: portableTextFields,
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'en',
      title: 'English',
      type: 'array',
      of: portableTextFields,
    },
  ],
});
```

- [ ] **Step 4: Create SEO fields object**

Write `studio/schemas/helpers/seoFields.ts`:

```ts
import { defineType } from 'sanity';

export const seoFields = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    {
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      description: 'Max 60 characters. Leave empty to auto-generate from page title.',
      validation: (Rule) => Rule.max(60),
    },
    {
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'Max 160 characters. Leave empty to auto-generate from content.',
      validation: (Rule) => Rule.max(160),
    },
    {
      name: 'ogImage',
      title: 'Social Image',
      type: 'image',
      description: 'Image shown when shared on social media.',
    },
  ],
});
```

- [ ] **Step 5: Register helpers in schema index**

Update `studio/schemas/index.ts`:

```ts
import { localeString } from './helpers/localeString';
import { localeText } from './helpers/localeText';
import { localePortableText } from './helpers/localePortableText';
import { seoFields } from './helpers/seoFields';

export const schemaTypes = [
  localeString,
  localeText,
  localePortableText,
  seoFields,
];
```

- [ ] **Step 6: Verify Studio starts with new types**

```bash
cd studio && npx sanity dev
```

Expected: Studio starts without errors (types registered but not yet used in documents).

- [ ] **Step 7: Commit**

```bash
cd .. && git add studio/schemas/
git commit -m "feat: add localized field helpers and SEO object schema"
```

---

### Task 5: Generic Section Block Schemas

**Files:**
- Create: `studio/schemas/blocks/heroVideo.ts`
- Create: `studio/schemas/blocks/heroImage.ts`
- Create: `studio/schemas/blocks/richText.ts`
- Create: `studio/schemas/blocks/imageTextSplit.ts`
- Create: `studio/schemas/blocks/valueCards.ts`
- Create: `studio/schemas/blocks/quoteBand.ts`
- Create: `studio/schemas/blocks/ctaBanner.ts`
- Create: `studio/schemas/blocks/testimonials.ts`
- Create: `studio/schemas/blocks/embedForm.ts`
- Create: `studio/schemas/blocks/mapEmbed.ts`
- Create: `studio/schemas/blocks/htmlEmbed.ts`
- Create: `studio/schemas/blocks/contactInfo.ts`
- Modify: `studio/schemas/index.ts`

- [ ] **Step 1: Create heroVideo block**

Write `studio/schemas/blocks/heroVideo.ts`:

```ts
import { defineType } from 'sanity';

export const heroVideo = defineType({
  name: 'heroVideo',
  title: 'Hero (Video)',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Heading', type: 'localeString' },
    { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
    { name: 'cta', title: 'CTA Label', type: 'localeString' },
    { name: 'ctaLink', title: 'CTA Link', type: 'string' },
    { name: 'videoUrl', title: 'Video URL', type: 'url', description: 'URL to hosted video file' },
    { name: 'poster', title: 'Poster Image', type: 'image', options: { hotspot: true } },
    { name: 'showScrollHint', title: 'Show Scroll Hint', type: 'boolean', initialValue: true },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'Video Hero', subtitle: 'Hero (Video)' }),
  },
});
```

- [ ] **Step 2: Create heroImage block**

Write `studio/schemas/blocks/heroImage.ts`:

```ts
import { defineType } from 'sanity';

export const heroImage = defineType({
  name: 'heroImage',
  title: 'Hero (Image)',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Heading', type: 'localeString' },
    { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
    { name: 'cta', title: 'CTA Label', type: 'localeString' },
    { name: 'ctaLink', title: 'CTA Link', type: 'string' },
    { name: 'backgroundImage', title: 'Background Image', type: 'image', options: { hotspot: true } },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'Image Hero', subtitle: 'Hero (Image)' }),
  },
});
```

- [ ] **Step 3: Create richText block**

Write `studio/schemas/blocks/richText.ts`:

```ts
import { defineType } from 'sanity';

export const richText = defineType({
  name: 'richText',
  title: 'Rich Text',
  type: 'object',
  fields: [
    { name: 'body', title: 'Body', type: 'localePortableText' },
  ],
  preview: {
    prepare: () => ({ title: 'Rich Text Block' }),
  },
});
```

- [ ] **Step 4: Create imageTextSplit block**

Write `studio/schemas/blocks/imageTextSplit.ts`:

```ts
import { defineType } from 'sanity';

export const imageTextSplit = defineType({
  name: 'imageTextSplit',
  title: 'Image + Text Split',
  type: 'object',
  fields: [
    { name: 'image', title: 'Image', type: 'image', options: { hotspot: true } },
    {
      name: 'imageAlt',
      title: 'Image Alt Text',
      type: 'string',
    },
    { name: 'text', title: 'Text', type: 'localePortableText' },
    {
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          { title: 'Image Left', value: 'image-left' },
          { title: 'Image Right', value: 'image-right' },
        ],
      },
      initialValue: 'image-left',
    },
  ],
  preview: {
    select: { layout: 'layout' },
    prepare: ({ layout }) => ({ title: `Image + Text (${layout || 'image-left'})` }),
  },
});
```

- [ ] **Step 5: Create valueCards block**

Write `studio/schemas/blocks/valueCards.ts`:

```ts
import { defineType } from 'sanity';

export const valueCards = defineType({
  name: 'valueCards',
  title: 'Value Cards',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Section Heading', type: 'localeString' },
    { name: 'eyebrow', title: 'Eyebrow Label', type: 'localeString' },
    {
      name: 'cards',
      title: 'Cards',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'icon', title: 'Icon (SVG)', type: 'text', description: 'Paste inline SVG code' },
            { name: 'title', title: 'Title', type: 'localeString' },
            { name: 'description', title: 'Description', type: 'localeText' },
          ],
          preview: {
            select: { title: 'title.de' },
          },
        },
      ],
    },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'Value Cards', subtitle: 'Card Grid' }),
  },
});
```

- [ ] **Step 6: Create quoteBand block**

Write `studio/schemas/blocks/quoteBand.ts`:

```ts
import { defineType } from 'sanity';

export const quoteBand = defineType({
  name: 'quoteBand',
  title: 'Quote Band',
  type: 'object',
  fields: [
    { name: 'quote', title: 'Quote', type: 'localeText' },
    { name: 'attribution', title: 'Attribution', type: 'localeString' },
  ],
  preview: {
    select: { title: 'quote.de' },
    prepare: ({ title }) => ({
      title: title ? `"${title.substring(0, 50)}..."` : 'Quote Band',
      subtitle: 'Quote',
    }),
  },
});
```

- [ ] **Step 7: Create ctaBanner block**

Write `studio/schemas/blocks/ctaBanner.ts`:

```ts
import { defineType } from 'sanity';

export const ctaBanner = defineType({
  name: 'ctaBanner',
  title: 'CTA Banner',
  type: 'object',
  fields: [
    { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
    { name: 'heading', title: 'Heading', type: 'localeString' },
    { name: 'description', title: 'Description', type: 'localeText' },
    { name: 'buttonLabel', title: 'Button Label', type: 'localeString' },
    { name: 'buttonLink', title: 'Button Link', type: 'string' },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'CTA Banner', subtitle: 'Call to Action' }),
  },
});
```

- [ ] **Step 8: Create testimonials block**

Write `studio/schemas/blocks/testimonials.ts`:

```ts
import { defineType } from 'sanity';

export const testimonials = defineType({
  name: 'testimonials',
  title: 'Testimonials',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Section Heading', type: 'localeString' },
    { name: 'eyebrow', title: 'Eyebrow Label', type: 'localeString' },
    {
      name: 'items',
      title: 'Testimonials',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'quote', title: 'Quote', type: 'localeText' },
            { name: 'author', title: 'Author', type: 'string' },
          ],
          preview: {
            select: { title: 'author', subtitle: 'quote.de' },
          },
        },
      ],
    },
  ],
  preview: {
    select: { title: 'heading.de' },
    prepare: ({ title }) => ({ title: title || 'Testimonials', subtitle: 'Testimonial Grid' }),
  },
});
```

- [ ] **Step 9: Create embedForm block**

Write `studio/schemas/blocks/embedForm.ts`:

```ts
import { defineType } from 'sanity';

export const embedForm = defineType({
  name: 'embedForm',
  title: 'Embedded Form',
  type: 'object',
  fields: [
    { name: 'title', title: 'Title', type: 'localeString' },
    { name: 'description', title: 'Description', type: 'localeText' },
    { name: 'embedUrl', title: 'Embed URL', type: 'url', description: 'Tally form URL or similar' },
  ],
  preview: {
    select: { title: 'title.de' },
    prepare: ({ title }) => ({ title: title || 'Embedded Form', subtitle: 'Form Embed' }),
  },
});
```

- [ ] **Step 10: Create mapEmbed block**

Write `studio/schemas/blocks/mapEmbed.ts`:

```ts
import { defineType } from 'sanity';

export const mapEmbed = defineType({
  name: 'mapEmbed',
  title: 'Map Embed',
  type: 'object',
  fields: [
    { name: 'address', title: 'Address', type: 'string', initialValue: 'Orpheumgasse 11, Graz' },
    {
      name: 'coordinates',
      title: 'Coordinates',
      type: 'object',
      fields: [
        { name: 'lat', title: 'Latitude', type: 'number' },
        { name: 'lng', title: 'Longitude', type: 'number' },
      ],
    },
  ],
  preview: {
    select: { title: 'address' },
    prepare: ({ title }) => ({ title: title || 'Map', subtitle: 'Google Maps' }),
  },
});
```

- [ ] **Step 11: Create htmlEmbed block**

Write `studio/schemas/blocks/htmlEmbed.ts`:

```ts
import { defineType } from 'sanity';

export const htmlEmbed = defineType({
  name: 'htmlEmbed',
  title: 'HTML Embed',
  type: 'object',
  fields: [
    {
      name: 'code',
      title: 'Embed Code',
      type: 'text',
      rows: 6,
      description: 'Paste iframe or embed code from trusted sources only (Tally, Stripe, YouTube).',
    },
    { name: 'caption', title: 'Caption', type: 'localeString' },
  ],
  preview: {
    prepare: () => ({ title: 'HTML Embed' }),
  },
});
```

- [ ] **Step 12: Create contactInfo block**

Write `studio/schemas/blocks/contactInfo.ts`:

```ts
import { defineType } from 'sanity';

export const contactInfo = defineType({
  name: 'contactInfo',
  title: 'Contact Info',
  type: 'object',
  fields: [
    {
      name: 'items',
      title: 'Contact Details',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'icon', title: 'Icon (SVG)', type: 'text' },
            { name: 'label', title: 'Label', type: 'localeString' },
            { name: 'value', title: 'Value', type: 'localeString' },
            { name: 'link', title: 'Link URL', type: 'string' },
          ],
          preview: {
            select: { title: 'label.de', subtitle: 'value.de' },
          },
        },
      ],
    },
  ],
  preview: {
    prepare: () => ({ title: 'Contact Info' }),
  },
});
```

- [ ] **Step 13: Register all blocks in schema index**

Update `studio/schemas/index.ts`:

```ts
import { localeString } from './helpers/localeString';
import { localeText } from './helpers/localeText';
import { localePortableText } from './helpers/localePortableText';
import { seoFields } from './helpers/seoFields';

import { heroVideo } from './blocks/heroVideo';
import { heroImage } from './blocks/heroImage';
import { richText } from './blocks/richText';
import { imageTextSplit } from './blocks/imageTextSplit';
import { valueCards } from './blocks/valueCards';
import { quoteBand } from './blocks/quoteBand';
import { ctaBanner } from './blocks/ctaBanner';
import { testimonials } from './blocks/testimonials';
import { embedForm } from './blocks/embedForm';
import { mapEmbed } from './blocks/mapEmbed';
import { htmlEmbed } from './blocks/htmlEmbed';
import { contactInfo } from './blocks/contactInfo';

export const schemaTypes = [
  // Helpers
  localeString,
  localeText,
  localePortableText,
  seoFields,
  // Blocks
  heroVideo,
  heroImage,
  richText,
  imageTextSplit,
  valueCards,
  quoteBand,
  ctaBanner,
  testimonials,
  embedForm,
  mapEmbed,
  htmlEmbed,
  contactInfo,
];
```

- [ ] **Step 14: Verify Studio starts**

```bash
cd studio && npx sanity dev
```

Expected: Studio starts without errors.

- [ ] **Step 15: Commit**

```bash
cd .. && git add studio/schemas/
git commit -m "feat: add all generic section block schemas"
```

---

## Phase 3: Sanity Schemas — Documents, Collections, Singletons

### Task 6: Singleton Schemas

**Files:**
- Create: `studio/schemas/singletons/navigation.ts`
- Create: `studio/schemas/singletons/siteSettings.ts`
- Create: `studio/schemas/singletons/donationInfo.ts`
- Modify: `studio/schemas/index.ts`

- [ ] **Step 1: Create navigation singleton**

Write `studio/schemas/singletons/navigation.ts`:

```ts
import { defineType } from 'sanity';

export const navigation = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    {
      name: 'mainMenu',
      title: 'Main Menu',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label_de', title: 'Label (DE)', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'label_en', title: 'Label (EN)', type: 'string' },
            { name: 'href', title: 'Link', type: 'string', validation: (Rule) => Rule.required() },
            {
              name: 'children',
              title: 'Submenu Items',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    { name: 'label_de', title: 'Label (DE)', type: 'string' },
                    { name: 'label_en', title: 'Label (EN)', type: 'string' },
                    { name: 'href', title: 'Link', type: 'string' },
                  ],
                },
              ],
            },
          ],
          preview: {
            select: { title: 'label_de', subtitle: 'href' },
          },
        },
      ],
    },
    {
      name: 'footerMenu',
      title: 'Footer Menu',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label_de', title: 'Label (DE)', type: 'string' },
            { name: 'label_en', title: 'Label (EN)', type: 'string' },
            { name: 'href', title: 'Link', type: 'string' },
          ],
          preview: {
            select: { title: 'label_de', subtitle: 'href' },
          },
        },
      ],
    },
    {
      name: 'ctaButton',
      title: 'CTA Button',
      type: 'object',
      fields: [
        { name: 'label_de', title: 'Label (DE)', type: 'string' },
        { name: 'label_en', title: 'Label (EN)', type: 'string' },
        { name: 'href', title: 'Link', type: 'string' },
      ],
    },
    {
      name: 'showLanguageSwitcher',
      title: 'Show Language Switcher',
      type: 'boolean',
      initialValue: true,
    },
  ],
  preview: {
    prepare: () => ({ title: 'Navigation' }),
  },
});
```

- [ ] **Step 2: Create siteSettings singleton**

Write `studio/schemas/singletons/siteSettings.ts`:

```ts
import { defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    { name: 'vereinName', title: 'Verein Name', type: 'string', initialValue: 'Wild Care — Wilde Fürsorge' },
    { name: 'address', title: 'Address', type: 'text', rows: 3 },
    { name: 'email', title: 'Email', type: 'string' },
    { name: 'phone', title: 'Phone', type: 'string' },
    { name: 'zvrZahl', title: 'ZVR-Zahl', type: 'string', description: 'Austrian association registration number' },
    {
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: { list: ['instagram', 'facebook', 'youtube', 'tiktok', 'linkedin'] },
            },
            { name: 'url', title: 'URL', type: 'url' },
          ],
          preview: {
            select: { title: 'platform', subtitle: 'url' },
          },
        },
      ],
    },
    {
      name: 'defaultOgImage',
      title: 'Default Social Image',
      type: 'image',
      description: 'Fallback image for social media sharing.',
    },
    { name: 'copyrightYear', title: 'Copyright Year', type: 'number', initialValue: 2026 },
  ],
  preview: {
    prepare: () => ({ title: 'Site Settings' }),
  },
});
```

- [ ] **Step 3: Create donationInfo singleton**

Write `studio/schemas/singletons/donationInfo.ts`:

```ts
import { defineType } from 'sanity';

export const donationInfo = defineType({
  name: 'donationInfo',
  title: 'Donation Info',
  type: 'document',
  fields: [
    { name: 'bankName', title: 'Bank Name', type: 'string' },
    { name: 'iban', title: 'IBAN', type: 'string' },
    { name: 'bic', title: 'BIC', type: 'string' },
    { name: 'accountHolder', title: 'Account Holder', type: 'string' },
    { name: 'qrCodeImage', title: 'SEPA QR Code', type: 'image' },
    { name: 'donationText', title: 'Donation Text', type: 'localePortableText' },
    { name: 'membershipFormEmbed', title: 'Membership Form URL', type: 'url', description: 'Tally form URL' },
  ],
  preview: {
    prepare: () => ({ title: 'Donation Info' }),
  },
});
```

- [ ] **Step 4: Register singletons in schema index**

Add to the imports and array in `studio/schemas/index.ts`:

```ts
import { navigation } from './singletons/navigation';
import { siteSettings } from './singletons/siteSettings';
import { donationInfo } from './singletons/donationInfo';

// Add to schemaTypes array:
  // Singletons
  navigation,
  siteSettings,
  donationInfo,
```

- [ ] **Step 5: Commit**

```bash
git add studio/schemas/
git commit -m "feat: add navigation, site settings, and donation info singletons"
```

---

### Task 7: Collection Schemas

**Files:**
- Create: `studio/schemas/collections/event.ts`
- Create: `studio/schemas/collections/journalArticle.ts`
- Create: `studio/schemas/collections/teamMember.ts`
- Modify: `studio/schemas/index.ts`

- [ ] **Step 1: Create event schema**

Write `studio/schemas/collections/event.ts`:

```ts
import { defineType } from 'sanity';

export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'localeString', validation: (Rule) => Rule.required() },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title.de', maxLength: 96 },
    },
    { name: 'startDateTime', title: 'Start Date & Time', type: 'datetime', validation: (Rule) => Rule.required() },
    { name: 'endDateTime', title: 'End Date & Time', type: 'datetime', validation: (Rule) => Rule.required() },
    {
      name: 'recurrenceType',
      title: 'Recurrence',
      type: 'string',
      options: {
        list: [
          { title: 'Single Event', value: 'single' },
          { title: 'Weekly Recurring', value: 'weekly' },
          { title: 'Block / Series', value: 'block' },
        ],
      },
      initialValue: 'single',
      description: 'Single: one-time event. Weekly: repeats on a fixed day. Block: multi-day or defined series.',
    },
    {
      name: 'recurrenceRule',
      title: 'Weekly Recurrence Rule',
      type: 'object',
      hidden: ({ parent }) => parent?.recurrenceType !== 'weekly',
      fields: [
        {
          name: 'dayOfWeek',
          title: 'Day of Week',
          type: 'string',
          options: {
            list: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          },
        },
        { name: 'endDate', title: 'Recurrence End Date', type: 'date' },
      ],
    },
    {
      name: 'blockDates',
      title: 'Block Dates',
      type: 'array',
      hidden: ({ parent }) => parent?.recurrenceType !== 'block',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'startDate', title: 'Start Date', type: 'date' },
            { name: 'endDate', title: 'End Date', type: 'date' },
            { name: 'label', title: 'Label', type: 'string' },
          ],
        },
      ],
    },
    {
      name: 'location',
      title: 'Location',
      type: 'string',
      initialValue: 'Orpheumgasse 11, Graz',
      description: 'Default: Orpheumgasse 11, Graz. Only change for external venues.',
    },
    { name: 'cost', title: 'Cost', type: 'string', initialValue: 'Spendenbasis' },
    { name: 'description', title: 'Description', type: 'localePortableText' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    select: { title: 'title.de', date: 'startDateTime' },
    prepare: ({ title, date }) => ({
      title: title || 'Untitled Event',
      subtitle: date ? new Date(date).toLocaleDateString('de-AT') : 'No date',
    }),
  },
  orderings: [
    { title: 'Date (Newest)', name: 'dateDesc', by: [{ field: 'startDateTime', direction: 'desc' }] },
    { title: 'Date (Oldest)', name: 'dateAsc', by: [{ field: 'startDateTime', direction: 'asc' }] },
  ],
});
```

- [ ] **Step 2: Create journalArticle schema**

Write `studio/schemas/collections/journalArticle.ts`:

```ts
import { defineType } from 'sanity';

export const journalArticle = defineType({
  name: 'journalArticle',
  title: 'Journal Article',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'localeString', validation: (Rule) => Rule.required() },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title.de', maxLength: 96 },
    },
    { name: 'publishedAt', title: 'Published At', type: 'datetime' },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Scheduled', value: 'scheduled' },
          { title: 'Published', value: 'published' },
        ],
      },
      initialValue: 'draft',
    },
    {
      name: 'image',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Please upload landscape images, min 1200px wide, max 1MB.',
      fields: [
        { name: 'alt', title: 'Alt Text', type: 'string', validation: (Rule) => Rule.required() },
      ],
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'localeText',
      description: 'Short summary shown on listing cards. Max 200 characters.',
    },
    { name: 'body', title: 'Body', type: 'localePortableText' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    select: { title: 'title.de', status: 'status', date: 'publishedAt', media: 'image' },
    prepare: ({ title, status, date, media }) => ({
      title: title || 'Untitled Article',
      subtitle: `${status || 'draft'} — ${date ? new Date(date).toLocaleDateString('de-AT') : 'No date'}`,
      media,
    }),
  },
  orderings: [
    { title: 'Published (Newest)', name: 'dateDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
});
```

- [ ] **Step 3: Create teamMember schema**

Write `studio/schemas/collections/teamMember.ts`:

```ts
import { defineType } from 'sanity';

export const teamMember = defineType({
  name: 'teamMember',
  title: 'Team Member',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required() },
    { name: 'role', title: 'Role', type: 'localeString' },
    { name: 'bio', title: 'Bio', type: 'localePortableText' },
    { name: 'portrait', title: 'Portrait', type: 'image', options: { hotspot: true } },
    { name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 },
  ],
  preview: {
    select: { title: 'name', subtitle: 'role.de', media: 'portrait' },
  },
  orderings: [
    { title: 'Sort Order', name: 'sortOrder', by: [{ field: 'sortOrder', direction: 'asc' }] },
  ],
});
```

- [ ] **Step 4: Register collections in schema index**

Add to `studio/schemas/index.ts`:

```ts
import { event } from './collections/event';
import { journalArticle } from './collections/journalArticle';
import { teamMember } from './collections/teamMember';

// Add to schemaTypes array:
  // Collections
  event,
  journalArticle,
  teamMember,
```

- [ ] **Step 5: Commit**

```bash
git add studio/schemas/
git commit -m "feat: add event, journal article, and team member collection schemas"
```

---

### Task 8: Page Document Schemas

**Files:**
- Create: `studio/schemas/documents/homepage.ts`
- Create: `studio/schemas/documents/montagskurs.ts`
- Create: `studio/schemas/documents/bewegungsrevolution.ts`
- Create: `studio/schemas/documents/mitmachen.ts`
- Create: `studio/schemas/documents/teamPage.ts`
- Create: `studio/schemas/documents/kontakt.ts`
- Create: `studio/schemas/documents/legalPage.ts`
- Modify: `studio/schemas/index.ts`

- [ ] **Step 1: Create homepage document schema**

Write `studio/schemas/documents/homepage.ts`:

```ts
import { defineType } from 'sanity';

const sectionBlocks = [
  { type: 'heroVideo' },
  { type: 'heroImage' },
  { type: 'richText' },
  { type: 'imageTextSplit' },
  { type: 'valueCards' },
  { type: 'quoteBand' },
  { type: 'ctaBanner' },
  { type: 'testimonials' },
  { type: 'embedForm' },
  { type: 'mapEmbed' },
  { type: 'htmlEmbed' },
  { type: 'contactInfo' },
];

export const homepage = defineType({
  name: 'homepage',
  title: 'Homepage',
  type: 'document',
  fields: [
    {
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      of: sectionBlocks,
    },
    {
      name: 'eventBanner',
      title: 'Event Banner',
      type: 'object',
      description: 'Auto-populated from next upcoming event. Override text below if needed.',
      fields: [
        { name: 'overrideText', title: 'Override Text', type: 'localeString' },
      ],
    },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    prepare: () => ({ title: 'Homepage' }),
  },
});
```

- [ ] **Step 2: Create montagskurs document schema**

Write `studio/schemas/documents/montagskurs.ts`:

```ts
import { defineType } from 'sanity';

export const montagskurs = defineType({
  name: 'montagskurs',
  title: 'Montagskurs',
  type: 'document',
  fields: [
    {
      name: 'hero',
      title: 'Hero Section',
      type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
        {
          name: 'details',
          title: 'Detail Rows',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'icon', title: 'Icon (SVG)', type: 'text' },
              { name: 'label', title: 'Label', type: 'localeString' },
              { name: 'value', title: 'Value', type: 'localeString' },
            ],
          }],
        },
        { name: 'image', title: 'Hero Image', type: 'image', options: { hotspot: true } },
        { name: 'ctaLabel', title: 'CTA Button Label', type: 'localeString' },
        { name: 'ctaLink', title: 'CTA Link', type: 'string' },
        { name: 'note', title: 'CTA Note', type: 'localeString' },
      ],
    },
    {
      name: 'infoCard',
      title: 'Info Card',
      type: 'object',
      fields: [
        { name: 'title', title: 'Title', type: 'localeString' },
        {
          name: 'rows',
          title: 'Info Rows',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'icon', title: 'Icon (SVG)', type: 'text' },
              { name: 'label', title: 'Label', type: 'localeString' },
              { name: 'value', title: 'Value', type: 'localeString' },
            ],
          }],
        },
        { name: 'ctaLabel', title: 'CTA Label', type: 'localeString' },
        { name: 'ctaLink', title: 'CTA Link', type: 'string' },
      ],
    },
    { name: 'description', title: 'Description', type: 'localePortableText' },
    {
      name: 'quote',
      title: 'Quote',
      type: 'object',
      fields: [
        { name: 'text', title: 'Quote Text', type: 'localeText' },
        { name: 'attribution', title: 'Attribution', type: 'localeString' },
      ],
    },
    {
      name: 'learnCards',
      title: 'What You Learn',
      type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        {
          name: 'cards',
          title: 'Cards',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'title', title: 'Title', type: 'localeString' },
              { name: 'body', title: 'Body', type: 'localeText' },
            ],
          }],
        },
        { name: 'donationNote', title: 'Donation Note', type: 'localeText' },
      ],
    },
    {
      name: 'testimonials',
      title: 'Testimonials',
      type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        {
          name: 'items',
          title: 'Testimonials',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'quote', title: 'Quote', type: 'localeText' },
              { name: 'author', title: 'Author', type: 'string' },
            ],
          }],
        },
      ],
    },
    {
      name: 'faqList',
      title: 'FAQ',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'question', title: 'Question', type: 'localeString' },
          { name: 'answer', title: 'Answer', type: 'localeText' },
        ],
        preview: { select: { title: 'question.de' } },
      }],
    },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    prepare: () => ({ title: 'Montagskurs' }),
  },
});
```

- [ ] **Step 3: Create bewegungsrevolution document schema**

Write `studio/schemas/documents/bewegungsrevolution.ts`:

```ts
import { defineType } from 'sanity';

export const bewegungsrevolution = defineType({
  name: 'bewegungsrevolution',
  title: 'Bewegungsrevolution',
  type: 'document',
  fields: [
    {
      name: 'hero',
      title: 'Hero',
      type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Badge / Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
        { name: 'image', title: 'Hero Image/Video Poster', type: 'image', options: { hotspot: true } },
        { name: 'videoUrl', title: 'Hero Video URL', type: 'url' },
        {
          name: 'details',
          title: 'Detail Rows',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'icon', title: 'Icon (SVG)', type: 'text' },
              { name: 'label', title: 'Label', type: 'localeString' },
              { name: 'value', title: 'Value', type: 'localeString' },
            ],
          }],
        },
      ],
    },
    {
      name: 'about',
      title: 'About Section',
      type: 'object',
      fields: [
        { name: 'text', title: 'Text', type: 'localePortableText' },
        {
          name: 'cards',
          title: 'Number Cards',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'number', title: 'Number', type: 'string' },
              { name: 'title', title: 'Title', type: 'localeString' },
              { name: 'description', title: 'Description', type: 'localeText' },
            ],
          }],
        },
      ],
    },
    {
      name: 'projectCards',
      title: 'Project Cards',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'tag', title: 'Tag', type: 'localeString' },
          { name: 'title', title: 'Title', type: 'localeString' },
          { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
          { name: 'description', title: 'Description', type: 'localeText' },
          {
            name: 'details',
            title: 'Details',
            type: 'array',
            of: [{ type: 'object', fields: [
              { name: 'label', title: 'Label', type: 'localeString' },
              { name: 'value', title: 'Value', type: 'localeString' },
            ]}],
          },
        ],
        preview: { select: { title: 'title.de' } },
      }],
    },
    {
      name: 'previewCards',
      title: 'Preview Cards',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'label', title: 'Label', type: 'localeString' },
          { name: 'title', title: 'Title', type: 'localeString' },
          { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
          { name: 'description', title: 'Description', type: 'localeText' },
          { name: 'ctaLabel', title: 'CTA Label', type: 'localeString' },
          { name: 'ctaLink', title: 'CTA Link', type: 'string' },
        ],
        preview: { select: { title: 'title.de' } },
      }],
    },
    {
      name: 'testimonials',
      title: 'Testimonials',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'quote', title: 'Quote', type: 'localeText' },
          { name: 'author', title: 'Author', type: 'string' },
        ],
      }],
    },
    {
      name: 'faqList',
      title: 'FAQ',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'question', title: 'Question', type: 'localeString' },
          { name: 'answer', title: 'Answer', type: 'localeText' },
        ],
        preview: { select: { title: 'question.de' } },
      }],
    },
    { name: 'donationNote', title: 'Donation Note', type: 'localePortableText' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    prepare: () => ({ title: 'Bewegungsrevolution' }),
  },
});
```

- [ ] **Step 4: Create mitmachen document schema**

Write `studio/schemas/documents/mitmachen.ts`:

```ts
import { defineType } from 'sanity';

export const mitmachen = defineType({
  name: 'mitmachen',
  title: 'Mitmachen',
  type: 'document',
  fields: [
    {
      name: 'hero',
      title: 'Hero',
      type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
      ],
    },
    {
      name: 'circlesVisual',
      title: 'Circles Visual',
      type: 'object',
      fields: [
        {
          name: 'outerCircle',
          title: 'Outer Circle',
          type: 'object',
          fields: [
            { name: 'title', title: 'Title', type: 'localeString' },
            { name: 'description', title: 'Description', type: 'localeText' },
            { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'localeString' }] },
          ],
        },
        {
          name: 'innerCircle',
          title: 'Inner Circle',
          type: 'object',
          fields: [
            { name: 'title', title: 'Title', type: 'localeString' },
            { name: 'description', title: 'Description', type: 'localeText' },
            { name: 'tags', title: 'Tags', type: 'array', of: [{ type: 'localeString' }] },
          ],
        },
      ],
    },
    {
      name: 'circleCards',
      title: 'Circle Detail Cards',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'title', title: 'Title', type: 'localeString' },
          { name: 'description', title: 'Description', type: 'localeText' },
          { name: 'icon', title: 'Icon (SVG)', type: 'text' },
        ],
        preview: { select: { title: 'title.de' } },
      }],
    },
    { name: 'coreMessage', title: 'Core Message', type: 'localePortableText' },
    {
      name: 'membershipTiers',
      title: 'Membership Tiers',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'icon', title: 'Icon (SVG)', type: 'text' },
          { name: 'name', title: 'Name', type: 'localeString' },
          { name: 'amount', title: 'Amount', type: 'string' },
          { name: 'description', title: 'Description', type: 'localeText' },
          { name: 'note', title: 'Note', type: 'localeText' },
        ],
        preview: { select: { title: 'name.de', subtitle: 'amount' } },
      }],
    },
    { name: 'membershipFormEmbed', title: 'Membership Form URL', type: 'url' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    prepare: () => ({ title: 'Mitmachen' }),
  },
});
```

- [ ] **Step 5: Create teamPage document schema**

Write `studio/schemas/documents/teamPage.ts`:

```ts
import { defineType } from 'sanity';

export const teamPage = defineType({
  name: 'teamPage',
  title: 'Team Page',
  type: 'document',
  fields: [
    {
      name: 'hero',
      title: 'Hero',
      type: 'object',
      fields: [
        { name: 'eyebrow', title: 'Eyebrow', type: 'localeString' },
        { name: 'heading', title: 'Heading', type: 'localeString' },
        { name: 'subtitle', title: 'Subtitle', type: 'localeString' },
        { name: 'image', title: 'Hero Image', type: 'image', options: { hotspot: true } },
      ],
    },
    {
      name: 'philosophy',
      title: 'Philosophy',
      type: 'object',
      fields: [
        { name: 'intro', title: 'Intro Text', type: 'localePortableText' },
        {
          name: 'pillars',
          title: 'Pillar Cards',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'title', title: 'Title', type: 'localeString' },
              { name: 'description', title: 'Description', type: 'localeText' },
            ],
            preview: { select: { title: 'title.de' } },
          }],
        },
      ],
    },
    {
      name: 'manifestBox',
      title: 'Manifest Quote',
      type: 'object',
      fields: [
        { name: 'quote', title: 'Quote Text', type: 'localeText' },
      ],
    },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    prepare: () => ({ title: 'Team Page' }),
  },
});
```

- [ ] **Step 6: Create kontakt document schema**

Write `studio/schemas/documents/kontakt.ts`:

```ts
import { defineType } from 'sanity';

const sectionBlocks = [
  { type: 'heroImage' },
  { type: 'richText' },
  { type: 'contactInfo' },
  { type: 'embedForm' },
  { type: 'mapEmbed' },
  { type: 'htmlEmbed' },
  { type: 'ctaBanner' },
];

export const kontakt = defineType({
  name: 'kontakt',
  title: 'Kontakt',
  type: 'document',
  fields: [
    {
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      of: sectionBlocks,
    },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    prepare: () => ({ title: 'Kontakt' }),
  },
});
```

- [ ] **Step 7: Create legalPage document schema**

Write `studio/schemas/documents/legalPage.ts`:

```ts
import { defineType } from 'sanity';

export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal Page',
  type: 'document',
  fields: [
    {
      name: 'pageKey',
      title: 'Page',
      type: 'string',
      options: { list: [
        { title: 'Impressum', value: 'impressum' },
        { title: 'Datenschutz', value: 'datenschutz' },
      ]},
      validation: (Rule) => Rule.required(),
    },
    { name: 'heading', title: 'Heading', type: 'localeString' },
    { name: 'legalBody', title: 'Legal Body', type: 'localePortableText' },
    { name: 'seo', title: 'SEO', type: 'seo' },
  ],
  preview: {
    select: { title: 'pageKey' },
    prepare: ({ title }) => ({ title: title === 'impressum' ? 'Impressum' : 'Datenschutz' }),
  },
});
```

- [ ] **Step 8: Register all document schemas in index**

Update `studio/schemas/index.ts` to its final form with all imports:

```ts
import { localeString } from './helpers/localeString';
import { localeText } from './helpers/localeText';
import { localePortableText } from './helpers/localePortableText';
import { seoFields } from './helpers/seoFields';

import { heroVideo } from './blocks/heroVideo';
import { heroImage } from './blocks/heroImage';
import { richText } from './blocks/richText';
import { imageTextSplit } from './blocks/imageTextSplit';
import { valueCards } from './blocks/valueCards';
import { quoteBand } from './blocks/quoteBand';
import { ctaBanner } from './blocks/ctaBanner';
import { testimonials } from './blocks/testimonials';
import { embedForm } from './blocks/embedForm';
import { mapEmbed } from './blocks/mapEmbed';
import { htmlEmbed } from './blocks/htmlEmbed';
import { contactInfo } from './blocks/contactInfo';

import { navigation } from './singletons/navigation';
import { siteSettings } from './singletons/siteSettings';
import { donationInfo } from './singletons/donationInfo';

import { event } from './collections/event';
import { journalArticle } from './collections/journalArticle';
import { teamMember } from './collections/teamMember';

import { homepage } from './documents/homepage';
import { montagskurs } from './documents/montagskurs';
import { bewegungsrevolution } from './documents/bewegungsrevolution';
import { mitmachen } from './documents/mitmachen';
import { teamPage } from './documents/teamPage';
import { kontakt } from './documents/kontakt';
import { legalPage } from './documents/legalPage';

export const schemaTypes = [
  // Helpers
  localeString,
  localeText,
  localePortableText,
  seoFields,
  // Blocks
  heroVideo,
  heroImage,
  richText,
  imageTextSplit,
  valueCards,
  quoteBand,
  ctaBanner,
  testimonials,
  embedForm,
  mapEmbed,
  htmlEmbed,
  contactInfo,
  // Singletons
  navigation,
  siteSettings,
  donationInfo,
  // Collections
  event,
  journalArticle,
  teamMember,
  // Page Documents
  homepage,
  montagskurs,
  bewegungsrevolution,
  mitmachen,
  teamPage,
  kontakt,
  legalPage,
];
```

- [ ] **Step 9: Verify Studio loads all schemas**

```bash
cd studio && npx sanity dev
```

Expected: Studio shows all document types in the sidebar. Can create documents for each type.

- [ ] **Step 10: Commit**

```bash
cd .. && git add studio/schemas/
git commit -m "feat: add all page document schemas (homepage, montagskurs, bewegungsrevolution, mitmachen, team, kontakt, legal)"
```

---

### Task 9: Studio Desk Structure

**Files:**
- Create: `studio/structure.ts`
- Modify: `studio/sanity.config.ts`

- [ ] **Step 1: Create desk structure**

Write `studio/structure.ts`:

```ts
import type { StructureBuilder } from 'sanity/structure';

// Helper to create a singleton item that opens directly to the editor
function singletonItem(S: StructureBuilder, typeName: string, title: string) {
  return S.listItem()
    .title(title)
    .child(
      S.document()
        .schemaType(typeName)
        .documentId(typeName)
    );
}

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      // Pages
      S.listItem()
        .title('Pages')
        .child(
          S.list()
            .title('Pages')
            .items([
              singletonItem(S, 'homepage', 'Homepage'),
              singletonItem(S, 'montagskurs', 'Montagskurs'),
              singletonItem(S, 'bewegungsrevolution', 'Bewegungsrevolution'),
              singletonItem(S, 'mitmachen', 'Mitmachen'),
              singletonItem(S, 'teamPage', 'Team'),
              singletonItem(S, 'kontakt', 'Kontakt'),
              S.divider(),
              S.listItem()
                .title('Legal Pages')
                .child(
                  S.documentTypeList('legalPage').title('Legal Pages')
                ),
            ])
        ),

      S.divider(),

      // Collections
      S.listItem()
        .title('Events')
        .child(S.documentTypeList('event').title('Events')),
      S.listItem()
        .title('Journal')
        .child(S.documentTypeList('journalArticle').title('Journal Articles')),
      S.listItem()
        .title('Team Members')
        .child(S.documentTypeList('teamMember').title('Team Members')),

      S.divider(),

      // Settings (Admin only)
      S.listItem()
        .title('Settings')
        .child(
          S.list()
            .title('Settings')
            .items([
              singletonItem(S, 'navigation', 'Navigation'),
              singletonItem(S, 'siteSettings', 'Site Settings'),
              singletonItem(S, 'donationInfo', 'Donation Info'),
            ])
        ),
    ]);
```

- [ ] **Step 2: Update sanity.config.ts to use desk structure**

Update `studio/sanity.config.ts`:

```ts
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemas';
import { structure } from './structure';

export default defineConfig({
  name: 'wild-care',
  title: 'Wild Care',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'YOUR_PROJECT_ID',
  dataset: 'production',
  plugins: [
    structureTool({ structure }),
  ],
  schema: {
    types: schemaTypes,
  },
});
```

- [ ] **Step 3: Verify desk structure works**

```bash
cd studio && npx sanity dev
```

Expected: Sidebar shows "Pages", "Events", "Journal", "Team Members", "Settings" sections. Clicking "Homepage" opens a singleton editor.

- [ ] **Step 4: Commit**

```bash
cd .. && git add studio/
git commit -m "feat: add Studio desk structure with organized sidebar"
```

---

## Phase 4: Astro Base Layout & Components

### Task 10: i18n Helpers

**Files:**
- Create: `src/lib/i18n.ts`

- [ ] **Step 1: Create i18n helper module**

Write `src/lib/i18n.ts`:

```ts
export type Locale = 'de' | 'en';

export const defaultLocale: Locale = 'de';
export const locales: Locale[] = ['de', 'en'];

/**
 * Get the localized value from a localeString/localeText field.
 * Returns the requested locale value, or undefined if not available.
 */
export function loc(field: { de?: string; en?: string } | undefined, locale: Locale): string | undefined {
  if (!field) return undefined;
  return field[locale] || (locale === 'de' ? field.de : undefined);
}

/**
 * Check if a document has content for a given locale.
 * For EN, checks if the document's title.en (or first localized field) is present.
 */
export function hasLocale(title: { de?: string; en?: string } | undefined, locale: Locale): boolean {
  if (locale === 'de') return true;
  return !!title?.en;
}

/**
 * Build slug-to-route map for DE and EN pages.
 */
const pageRoutes: Record<string, { de: string; en: string }> = {
  'index': { de: '/', en: '/en/' },
  'team': { de: '/team/', en: '/en/team/' },
  'programm': { de: '/programm/', en: '/en/programme/' },
  'journal': { de: '/journal/', en: '/en/journal/' },
  'mitmachen': { de: '/mitmachen/', en: '/en/join/' },
  'kontakt': { de: '/kontakt/', en: '/en/contact/' },
  'montagskurs': { de: '/montagskurs/', en: '/en/monday-class/' },
  'bewegungsrevolution': { de: '/bewegungsrevolution/', en: '/en/movement-revolution/' },
  'impressum': { de: '/impressum/', en: '/en/imprint/' },
  'datenschutz': { de: '/datenschutz/', en: '/en/privacy/' },
};

export function getLocalizedPath(pageKey: string, locale: Locale): string {
  const route = pageRoutes[pageKey];
  if (!route) return locale === 'de' ? `/${pageKey}/` : `/en/${pageKey}/`;
  return route[locale];
}

export function getAlternatePath(pageKey: string, currentLocale: Locale): string {
  const targetLocale = currentLocale === 'de' ? 'en' : 'de';
  return getLocalizedPath(pageKey, targetLocale);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add i18n helpers with locale field access and route mapping"
```

---

### Task 11: Portable Text Renderer

**Files:**
- Create: `src/components/PortableText.astro`

- [ ] **Step 1: Create Portable Text component**

Write `src/components/PortableText.astro`:

```astro
---
import { toHTML } from '@portabletext/to-html';
import { urlFor } from '../lib/image';

interface Props {
  value: any[];
}

const { value } = Astro.props;

if (!value) {
  return;
}

const html = toHTML(value, {
  components: {
    types: {
      image: ({ value }) => {
        const url = urlFor(value).width(1200).auto('format').url();
        return `<figure><img src="${url}" alt="${value.alt || ''}" loading="lazy" />${value.alt ? `<figcaption>${value.alt}</figcaption>` : ''}</figure>`;
      },
    },
    marks: {
      link: ({ children, value }) => {
        const target = value.blank ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${value.href}"${target}>${children}</a>`;
      },
    },
  },
});
---

<Fragment set:html={html} />
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PortableText.astro
git commit -m "feat: add Portable Text rendering component"
```

---

### Task 12: SeoHead Component

**Files:**
- Create: `src/components/SeoHead.astro`
- Create: `src/lib/schema.ts`

- [ ] **Step 1: Create JSON-LD schema generators**

Write `src/lib/schema.ts`:

```ts
import { urlFor } from './image';

export function localBusinessSchema(settings: {
  name: string;
  address: string;
  email: string;
  url: string;
  zvrZahl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: settings.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Orpheumgasse 11',
      addressLocality: 'Graz',
      addressCountry: 'AT',
    },
    email: settings.email,
    url: settings.url,
    ...(settings.zvrZahl && {
      identifier: {
        '@type': 'PropertyValue',
        name: 'ZVR-Zahl',
        value: settings.zvrZahl,
      },
    }),
  };
}

export function eventSchema(event: {
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  cost: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    location: {
      '@type': 'Place',
      name: event.location,
    },
    isAccessibleForFree: event.cost === 'Spendenbasis',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: event.cost,
    },
  };
}

export function articleSchema(article: {
  headline: string;
  datePublished: string;
  imageUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    datePublished: article.datePublished,
    author: {
      '@type': 'Organization',
      name: 'Wild Care',
    },
    ...(article.imageUrl && { image: article.imageUrl }),
  };
}
```

- [ ] **Step 2: Create SeoHead component**

Write `src/components/SeoHead.astro`:

```astro
---
import type { Locale } from '../lib/i18n';
import { getLocalizedPath } from '../lib/i18n';
import { urlFor } from '../lib/image';

interface Props {
  title: string;
  description?: string;
  ogImage?: any; // Sanity image reference
  defaultOgImage?: any;
  locale: Locale;
  pageKey?: string;
  hasTranslation?: boolean;
  type?: 'website' | 'article';
  jsonLd?: object;
}

const {
  title,
  description,
  ogImage,
  defaultOgImage,
  locale,
  pageKey,
  hasTranslation = false,
  type = 'website',
  jsonLd,
} = Astro.props;

const metaTitle = title.includes('Wild Care') ? title : `${title} — Wild Care`;
const metaDescription = description || '';
const ogImageUrl = ogImage
  ? urlFor(ogImage).width(1200).height(630).auto('format').url()
  : defaultOgImage
    ? urlFor(defaultOgImage).width(1200).height(630).auto('format').url()
    : '/assets/images/og-default.jpg';

const ogLocale = locale === 'de' ? 'de_AT' : 'en_US';
const canonicalUrl = `https://wildcare.space${Astro.url.pathname}`;
---

<title>{metaTitle}</title>
<meta name="description" content={metaDescription} />
<link rel="canonical" href={canonicalUrl} />

<!-- Open Graph -->
<meta property="og:title" content={metaTitle} />
<meta property="og:description" content={metaDescription} />
<meta property="og:image" content={ogImageUrl} />
<meta property="og:type" content={type} />
<meta property="og:locale" content={ogLocale} />
<meta property="og:url" content={canonicalUrl} />

<!-- hreflang -->
{pageKey && (
  <>
    <link rel="alternate" hreflang="de" href={`https://wildcare.space${getLocalizedPath(pageKey, 'de')}`} />
    {hasTranslation && (
      <link rel="alternate" hreflang="en" href={`https://wildcare.space${getLocalizedPath(pageKey, 'en')}`} />
    )}
    <link rel="alternate" hreflang="x-default" href={`https://wildcare.space${getLocalizedPath(pageKey, 'de')}`} />
  </>
)}

<!-- JSON-LD -->
{jsonLd && (
  <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SeoHead.astro src/lib/schema.ts
git commit -m "feat: add SeoHead component with JSON-LD and hreflang support"
```

---

### Task 13: Base Layout + Nav + Footer

**Files:**
- Create: `src/layouts/Base.astro`
- Create: `src/components/Nav.astro`
- Create: `src/components/Footer.astro`
- Create: `src/components/LanguageSwitcher.astro`

- [ ] **Step 1: Create Nav component**

Write `src/components/Nav.astro`:

```astro
---
import type { Locale } from '../lib/i18n';
import { loc, getLocalizedPath } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher.astro';

interface Props {
  locale: Locale;
  navigation: any;
  pageKey?: string;
  hasTranslation?: boolean;
}

const { locale, navigation, pageKey, hasTranslation } = Astro.props;
const menuItems = navigation?.mainMenu || [];
const ctaButton = navigation?.ctaButton;
const showLangSwitcher = navigation?.showLanguageSwitcher ?? true;
---

<nav class="nav">
  <div class="container nav-inner">
    <a href={getLocalizedPath('index', locale)} class="nav-brand">Wild Care</a>

    <button class="nav-toggle" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>

    <div class="nav-menu">
      <ul class="nav-links">
        {menuItems.map((item: any) => (
          <li>
            <a href={locale === 'en' ? (item.href_en || item.href) : item.href}>
              {locale === 'en' ? (item.label_en || item.label_de) : item.label_de}
            </a>
          </li>
        ))}
      </ul>

      <div class="nav-actions">
        {showLangSwitcher && pageKey && (
          <LanguageSwitcher
            locale={locale}
            pageKey={pageKey}
            hasTranslation={hasTranslation}
          />
        )}
        {ctaButton && (
          <a
            href={locale === 'en' ? (ctaButton.href_en || ctaButton.href) : ctaButton.href}
            class="btn btn-primary nav-cta"
          >
            {locale === 'en' ? (ctaButton.label_en || ctaButton.label_de) : ctaButton.label_de}
          </a>
        )}
      </div>
    </div>
  </div>
</nav>
```

- [ ] **Step 2: Create LanguageSwitcher component**

Write `src/components/LanguageSwitcher.astro`:

```astro
---
import type { Locale } from '../lib/i18n';
import { getAlternatePath } from '../lib/i18n';

interface Props {
  locale: Locale;
  pageKey: string;
  hasTranslation?: boolean;
}

const { locale, pageKey, hasTranslation = false } = Astro.props;
const alternatePath = getAlternatePath(pageKey, locale);
---

{hasTranslation ? (
  <a href={alternatePath} class="lang-toggle">
    {locale === 'de' ? 'EN' : 'DE'}
  </a>
) : (
  <span class="lang-toggle lang-toggle--disabled" title={locale === 'de' ? 'No English translation available' : 'Keine deutsche Übersetzung'}>
    {locale === 'de' ? 'EN' : 'DE'}
  </span>
)}
```

- [ ] **Step 3: Create Footer component**

Write `src/components/Footer.astro`:

```astro
---
import type { Locale } from '../lib/i18n';
import { loc, getLocalizedPath } from '../lib/i18n';

interface Props {
  locale: Locale;
  navigation: any;
  siteSettings: any;
}

const { locale, navigation, siteSettings } = Astro.props;
const footerMenu = navigation?.footerMenu || [];
const socialLinks = siteSettings?.socialLinks || [];
---

<footer class="footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <p class="footer-brand-name">Wild Care</p>
      <p class="footer-tagline">
        {locale === 'de'
          ? 'Verein für Kontaktimprovisation und soziale Praxis. Wir üben das Zusammenleben — jeden Montag in Graz.'
          : 'Association for Contact Improvisation and social practice. Practicing togetherness — every Monday in Graz.'}
      </p>
    </div>

    <div class="footer-links">
      <p class="footer-heading">{locale === 'de' ? 'Seiten' : 'Pages'}</p>
      <ul>
        {footerMenu.map((item: any) => (
          <li>
            <a href={locale === 'en' ? (item.href_en || item.href) : item.href}>
              {locale === 'en' ? (item.label_en || item.label_de) : item.label_de}
            </a>
          </li>
        ))}
      </ul>
    </div>

    <div class="footer-connect">
      <p class="footer-heading">{locale === 'de' ? 'Verbinden' : 'Connect'}</p>
      <ul>
        {siteSettings?.email && (
          <li><a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a></li>
        )}
        {socialLinks.map((link: any) => (
          <li><a href={link.url} target="_blank" rel="noopener">{link.platform}</a></li>
        ))}
      </ul>
    </div>

    <div class="footer-legal">
      <a href={getLocalizedPath('impressum', locale)}>
        {locale === 'de' ? 'Impressum' : 'Imprint'}
      </a>
      <a href={getLocalizedPath('datenschutz', locale)}>
        {locale === 'de' ? 'Datenschutz' : 'Privacy'}
      </a>
    </div>

    <div class="footer-copyright">
      <p>© {siteSettings?.copyrightYear || 2026} Wild Care — Graz</p>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Create Base layout**

Write `src/layouts/Base.astro`:

```astro
---
import type { Locale } from '../lib/i18n';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import SeoHead from '../components/SeoHead.astro';
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
  ogImage?: any;
  locale: Locale;
  pageKey?: string;
  hasTranslation?: boolean;
  bodyClass?: string;
  type?: 'website' | 'article';
  jsonLd?: object;
  navigation: any;
  siteSettings: any;
}

const {
  title,
  description,
  ogImage,
  locale,
  pageKey,
  hasTranslation = false,
  bodyClass = '',
  type = 'website',
  jsonLd,
  navigation,
  siteSettings,
} = Astro.props;
---

<!DOCTYPE html>
<html lang={locale}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap" rel="stylesheet" />
  <SeoHead
    title={title}
    description={description}
    ogImage={ogImage}
    defaultOgImage={siteSettings?.defaultOgImage}
    locale={locale}
    pageKey={pageKey}
    hasTranslation={hasTranslation}
    type={type}
    jsonLd={jsonLd}
  />
</head>
<body class={bodyClass}>
  <Nav
    locale={locale}
    navigation={navigation}
    pageKey={pageKey}
    hasTranslation={hasTranslation}
  />

  <main>
    <slot />
  </main>

  <Footer
    locale={locale}
    navigation={navigation}
    siteSettings={siteSettings}
  />

  <script src="/js/scroll-animations.js"></script>
</body>
</html>
```

- [ ] **Step 5: Verify build succeeds**

```bash
npx astro build
```

Expected: Build succeeds (no pages yet, but layout/components are valid).

- [ ] **Step 6: Commit**

```bash
git add src/layouts/ src/components/Nav.astro src/components/Footer.astro src/components/LanguageSwitcher.astro
git commit -m "feat: add Base layout with Nav, Footer, LanguageSwitcher, and SeoHead"
```

---

## Phase 5: Section Components

### Task 14: Section Renderer + All Section Components

**Files:**
- Create: `src/components/sections/SectionRenderer.astro`
- Create: all 12 section component files in `src/components/sections/`

- [ ] **Step 1: Create SectionRenderer**

Write `src/components/sections/SectionRenderer.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import HeroVideo from './HeroVideo.astro';
import HeroImage from './HeroImage.astro';
import RichText from './RichText.astro';
import ImageTextSplit from './ImageTextSplit.astro';
import ValueCards from './ValueCards.astro';
import QuoteBand from './QuoteBand.astro';
import CtaBanner from './CtaBanner.astro';
import Testimonials from './Testimonials.astro';
import EmbedForm from './EmbedForm.astro';
import MapEmbed from './MapEmbed.astro';
import HtmlEmbed from './HtmlEmbed.astro';
import ContactInfo from './ContactInfo.astro';

interface Props {
  sections: any[];
  locale: Locale;
}

const { sections, locale } = Astro.props;

const componentMap: Record<string, any> = {
  heroVideo: HeroVideo,
  heroImage: HeroImage,
  richText: RichText,
  imageTextSplit: ImageTextSplit,
  valueCards: ValueCards,
  quoteBand: QuoteBand,
  ctaBanner: CtaBanner,
  testimonials: Testimonials,
  embedForm: EmbedForm,
  mapEmbed: MapEmbed,
  htmlEmbed: HtmlEmbed,
  contactInfo: ContactInfo,
};
---

{sections?.map((section) => {
  const Component = componentMap[section._type];
  return Component ? <Component {...section} locale={locale} /> : null;
})}
```

- [ ] **Step 2: Create HeroVideo section**

Write `src/components/sections/HeroVideo.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';
import { urlFor } from '../../lib/image';

interface Props {
  heading?: { de?: string; en?: string };
  subtitle?: { de?: string; en?: string };
  cta?: { de?: string; en?: string };
  ctaLink?: string;
  videoUrl?: string;
  poster?: any;
  showScrollHint?: boolean;
  locale: Locale;
}

const { heading, subtitle, cta, ctaLink, videoUrl, poster, showScrollHint = true, locale } = Astro.props;
const posterUrl = poster ? urlFor(poster).width(1920).auto('format').url() : undefined;
---

<header class="hero-video">
  {videoUrl && (
    <video autoplay muted loop playsinline preload="metadata" poster={posterUrl}>
      <source src={videoUrl} type="video/mp4" />
    </video>
  )}
  <div class="hero-video-overlay"></div>

  <div class="hero-video-content">
    <div class="container">
      {heading && <h1 class="fade-up" set:html={loc(heading, locale)} />}
      {subtitle && <p class="fade-up delay-1">{loc(subtitle, locale)}</p>}
      {cta && ctaLink && (
        <div class="button-row fade-up delay-2">
          <a href={ctaLink} class="btn btn-primary">{loc(cta, locale)}</a>
        </div>
      )}
    </div>
  </div>

  {showScrollHint && (
    <div class="hero-scroll-hint">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
    </div>
  )}
</header>
```

- [ ] **Step 3: Create HeroImage section**

Write `src/components/sections/HeroImage.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';
import { urlFor } from '../../lib/image';

interface Props {
  heading?: { de?: string; en?: string };
  subtitle?: { de?: string; en?: string };
  cta?: { de?: string; en?: string };
  ctaLink?: string;
  backgroundImage?: any;
  locale: Locale;
}

const { heading, subtitle, cta, ctaLink, backgroundImage, locale } = Astro.props;
const bgUrl = backgroundImage ? urlFor(backgroundImage).width(1920).auto('format').url() : undefined;
---

<header class="page-hero" style={bgUrl ? `background-image: url(${bgUrl})` : undefined}>
  <div class="container">
    {heading && <h1 class="fade-up">{loc(heading, locale)}</h1>}
    {subtitle && <p class="fade-up delay-1">{loc(subtitle, locale)}</p>}
    {cta && ctaLink && (
      <a href={ctaLink} class="btn btn-primary fade-up delay-2">{loc(cta, locale)}</a>
    )}
  </div>
</header>
```

- [ ] **Step 4: Create RichText section**

Write `src/components/sections/RichText.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import PortableText from '../PortableText.astro';

interface Props {
  body?: { de?: any[]; en?: any[] };
  locale: Locale;
}

const { body, locale } = Astro.props;
const content = body?.[locale] || body?.de;
---

{content && (
  <section>
    <div class="container rich-text">
      <PortableText value={content} />
    </div>
  </section>
)}
```

- [ ] **Step 5: Create ImageTextSplit section**

Write `src/components/sections/ImageTextSplit.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { urlFor } from '../../lib/image';
import PortableText from '../PortableText.astro';

interface Props {
  image?: any;
  imageAlt?: string;
  text?: { de?: any[]; en?: any[] };
  layout?: string;
  locale: Locale;
}

const { image, imageAlt, text, layout = 'image-left', locale } = Astro.props;
const imgUrl = image ? urlFor(image).width(800).auto('format').url() : undefined;
const content = text?.[locale] || text?.de;
---

<section class="invitation">
  <div class="container">
    <div class={`invitation-grid ${layout === 'image-right' ? 'invitation-grid--reversed' : ''}`}>
      {layout === 'image-left' && imgUrl && (
        <div class="invitation-image fade-up">
          <div class="invitation-image-frame">
            <img src={imgUrl} alt={imageAlt || ''} loading="lazy" />
          </div>
        </div>
      )}
      <div class="invitation-text fade-up delay-1">
        {content && <PortableText value={content} />}
      </div>
      {layout === 'image-right' && imgUrl && (
        <div class="invitation-image fade-up delay-2">
          <div class="invitation-image-frame">
            <img src={imgUrl} alt={imageAlt || ''} loading="lazy" />
          </div>
        </div>
      )}
    </div>
  </div>
</section>
```

- [ ] **Step 6: Create ValueCards section**

Write `src/components/sections/ValueCards.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';

interface Props {
  heading?: { de?: string; en?: string };
  eyebrow?: { de?: string; en?: string };
  cards?: any[];
  locale: Locale;
}

const { heading, eyebrow, cards, locale } = Astro.props;
const delays = ['delay-1', 'delay-2', 'delay-3', 'delay-4'];
---

<section id="werte">
  <div class="container">
    <div class="section-header fade-up" style="text-align: center; margin-bottom: 64px;">
      {eyebrow && <p class="label">{loc(eyebrow, locale)}</p>}
      {heading && <h2>{loc(heading, locale)}</h2>}
    </div>

    <div class="values-grid">
      {cards?.map((card, i) => (
        <div class={`value-card fade-up ${delays[i] || ''}`}>
          {card.icon && <div class="value-icon" set:html={card.icon} />}
          <h3>{loc(card.title, locale)}</h3>
          <p>{loc(card.description, locale)}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 7: Create QuoteBand section**

Write `src/components/sections/QuoteBand.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';

interface Props {
  quote?: { de?: string; en?: string };
  attribution?: { de?: string; en?: string };
  locale: Locale;
}

const { quote, attribution, locale } = Astro.props;
---

<section style="background: var(--sand-light);">
  <div class="container fade-up" style="text-align: center; max-width: 800px;">
    <div class="divider" style="margin: 0 auto var(--space-xl);"></div>
    {quote && <p class="quote">{loc(quote, locale)}</p>}
    {attribution && <p class="label" style="margin-top: var(--space-md);">{loc(attribution, locale)}</p>}
    <div class="divider" style="margin: var(--space-xl) auto 0;"></div>
  </div>
</section>
```

- [ ] **Step 8: Create CtaBanner section**

Write `src/components/sections/CtaBanner.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';

interface Props {
  eyebrow?: { de?: string; en?: string };
  heading?: { de?: string; en?: string };
  description?: { de?: string; en?: string };
  buttonLabel?: { de?: string; en?: string };
  buttonLink?: string;
  locale: Locale;
}

const { eyebrow, heading, description, buttonLabel, buttonLink, locale } = Astro.props;
---

<section class="cta-section">
  <div class="container fade-up">
    {eyebrow && <p class="label" style="color: var(--warmwhite); opacity: 0.5; margin-bottom: 16px;">{loc(eyebrow, locale)}</p>}
    {heading && <h2>{loc(heading, locale)}</h2>}
    {description && <p>{loc(description, locale)}</p>}
    {buttonLabel && buttonLink && (
      <a href={buttonLink} class="btn btn-primary">{loc(buttonLabel, locale)}</a>
    )}
  </div>
</section>
```

- [ ] **Step 9: Create Testimonials section**

Write `src/components/sections/Testimonials.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';

interface Props {
  heading?: { de?: string; en?: string };
  eyebrow?: { de?: string; en?: string };
  items?: any[];
  locale: Locale;
}

const { heading, eyebrow, items, locale } = Astro.props;
---

<section class="detail-testimonials">
  <div class="container">
    <div class="section-header fade-up" style="text-align: center; margin-bottom: 56px;">
      {eyebrow && <p class="label">{loc(eyebrow, locale)}</p>}
      {heading && <h2>{loc(heading, locale)}</h2>}
    </div>

    <div class="detail-testimonial-grid">
      {items?.map((item, i) => (
        <div class={`detail-testimonial fade-up delay-${i + 1}`}>
          <blockquote>{loc(item.quote, locale)}</blockquote>
          {item.author && <p class="detail-testimonial-author">{item.author}</p>}
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 10: Create EmbedForm section**

Write `src/components/sections/EmbedForm.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';

interface Props {
  title?: { de?: string; en?: string };
  description?: { de?: string; en?: string };
  embedUrl?: string;
  locale: Locale;
}

const { title, description, embedUrl, locale } = Astro.props;
---

<section>
  <div class="container">
    {title && <h2 class="fade-up">{loc(title, locale)}</h2>}
    {description && <p class="fade-up delay-1">{loc(description, locale)}</p>}
    {embedUrl && (
      <div class="embed-wrapper fade-up delay-2">
        <iframe src={embedUrl} width="100%" style="border: none; min-height: 500px;" loading="lazy"></iframe>
      </div>
    )}
  </div>
</section>
```

- [ ] **Step 11: Create MapEmbed section**

Write `src/components/sections/MapEmbed.astro`:

```astro
---
interface Props {
  address?: string;
  coordinates?: { lat?: number; lng?: number };
}

const { address = 'Orpheumgasse 11, Graz', coordinates } = Astro.props;
const mapQuery = coordinates
  ? `${coordinates.lat},${coordinates.lng}`
  : encodeURIComponent(address);
---

<section>
  <div class="container">
    <div class="map-wrapper fade-up">
      <iframe
        src={`https://www.google.com/maps/embed/v1/place?key=&q=${mapQuery}`}
        width="100%"
        height="400"
        style="border: 0; border-radius: 12px;"
        loading="lazy"
        allowfullscreen
      ></iframe>
    </div>
  </div>
</section>
```

- [ ] **Step 12: Create HtmlEmbed section**

Write `src/components/sections/HtmlEmbed.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';

interface Props {
  code?: string;
  caption?: { de?: string; en?: string };
  locale: Locale;
}

const { code, caption, locale } = Astro.props;
---

{code && (
  <section>
    <div class="container">
      <div class="embed-wrapper fade-up" set:html={code} />
      {caption && <p class="embed-caption fade-up delay-1">{loc(caption, locale)}</p>}
    </div>
  </section>
)}
```

- [ ] **Step 13: Create ContactInfo section**

Write `src/components/sections/ContactInfo.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';

interface Props {
  items?: any[];
  locale: Locale;
}

const { items, locale } = Astro.props;
---

<section>
  <div class="container">
    <div class="contact-info-grid fade-up">
      {items?.map((item) => (
        <div class="contact-info-item">
          {item.icon && <div class="contact-info-icon" set:html={item.icon} />}
          <p class="contact-info-label">{loc(item.label, locale)}</p>
          {item.link ? (
            <a href={item.link}>{loc(item.value, locale)}</a>
          ) : (
            <p>{loc(item.value, locale)}</p>
          )}
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 14: Verify build**

```bash
npx astro build
```

Expected: Build succeeds.

- [ ] **Step 15: Commit**

```bash
git add src/components/sections/
git commit -m "feat: add all section block components with SectionRenderer"
```

---

## Phase 6: GROQ Queries + Page Templates

### Task 15: GROQ Query Layer

**Files:**
- Modify: `src/lib/sanity.ts`

- [ ] **Step 1: Add all GROQ queries to sanity.ts**

Append queries to `src/lib/sanity.ts`:

```ts
import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: import.meta.env.SANITY_API_VERSION || '2026-04-10',
  useCdn: true,
});

// ---- Singletons ----

export async function getNavigation() {
  return sanityClient.fetch(`*[_type == "navigation"][0]`);
}

export async function getSiteSettings() {
  return sanityClient.fetch(`*[_type == "siteSettings"][0]`);
}

export async function getDonationInfo() {
  return sanityClient.fetch(`*[_type == "donationInfo"][0]`);
}

// ---- Page Documents (singletons by convention) ----

export async function getHomepage() {
  return sanityClient.fetch(`*[_type == "homepage"][0]`);
}

export async function getMontagskurs() {
  return sanityClient.fetch(`*[_type == "montagskurs"][0]`);
}

export async function getBewegungsrevolution() {
  return sanityClient.fetch(`*[_type == "bewegungsrevolution"][0]`);
}

export async function getMitmachen() {
  return sanityClient.fetch(`*[_type == "mitmachen"][0]`);
}

export async function getTeamPage() {
  return sanityClient.fetch(`*[_type == "teamPage"][0]`);
}

export async function getKontakt() {
  return sanityClient.fetch(`*[_type == "kontakt"][0]`);
}

export async function getLegalPage(pageKey: string) {
  return sanityClient.fetch(
    `*[_type == "legalPage" && pageKey == $pageKey][0]`,
    { pageKey }
  );
}

// ---- Collections ----

export async function getNextEvent() {
  return sanityClient.fetch(
    `*[_type == "event" && startDateTime > now()] | order(startDateTime asc)[0]`
  );
}

export async function getAllEvents() {
  return sanityClient.fetch(
    `*[_type == "event"] | order(startDateTime desc)`
  );
}

export async function getPublishedArticles(locale: string) {
  const localeFilter = locale === 'en'
    ? `&& defined(title.en)`
    : '';
  return sanityClient.fetch(
    `*[_type == "journalArticle" && status == "published" ${localeFilter}] | order(publishedAt desc)`
  );
}

export async function getArticleBySlug(slug: string) {
  return sanityClient.fetch(
    `*[_type == "journalArticle" && slug.current == $slug][0]`,
    { slug }
  );
}

export async function getAllArticleSlugs() {
  return sanityClient.fetch(
    `*[_type == "journalArticle" && status == "published"]{ "slug": slug.current, title }`
  );
}

export async function getTeamMembers() {
  return sanityClient.fetch(
    `*[_type == "teamMember"] | order(sortOrder asc)`
  );
}

// ---- Shared data fetcher (used by every page) ----

export async function getSharedData() {
  const [navigation, siteSettings] = await Promise.all([
    getNavigation(),
    getSiteSettings(),
  ]);
  return { navigation, siteSettings };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sanity.ts
git commit -m "feat: add GROQ query layer for all content types"
```

---

### Task 16: Homepage Template

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/pages/en/index.astro`

- [ ] **Step 1: Create DE homepage**

Write `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import SectionRenderer from '../components/sections/SectionRenderer.astro';
import { getHomepage, getNextEvent, getSharedData } from '../lib/sanity';
import { loc } from '../lib/i18n';
import { localBusinessSchema } from '../lib/schema';

const locale = 'de';
const [page, nextEvent, { navigation, siteSettings }] = await Promise.all([
  getHomepage(),
  getNextEvent(),
  getSharedData(),
]);

const title = page?.seo?.metaTitle || loc(page?.sections?.[0]?.heading, locale) || 'Wild Care';
const description = page?.seo?.metaDescription || 'Verein für Kontaktimprovisation und soziale Praxis in Graz.';
const jsonLd = localBusinessSchema({
  name: siteSettings?.vereinName || 'Wild Care',
  address: siteSettings?.address || '',
  email: siteSettings?.email || '',
  url: 'https://wildcare.space',
  zvrZahl: siteSettings?.zvrZahl,
});
---

<Base
  title={title}
  description={description}
  ogImage={page?.seo?.ogImage}
  locale={locale}
  pageKey="index"
  hasTranslation={true}
  bodyClass="has-hero-video"
  jsonLd={jsonLd}
  navigation={navigation}
  siteSettings={siteSettings}
>
  {page?.sections && <SectionRenderer sections={page.sections} locale={locale} />}
</Base>
```

- [ ] **Step 2: Create EN homepage**

Write `src/pages/en/index.astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import SectionRenderer from '../../components/sections/SectionRenderer.astro';
import { getHomepage, getNextEvent, getSharedData } from '../../lib/sanity';
import { loc } from '../../lib/i18n';
import { localBusinessSchema } from '../../lib/schema';

const locale = 'en';
const [page, nextEvent, { navigation, siteSettings }] = await Promise.all([
  getHomepage(),
  getNextEvent(),
  getSharedData(),
]);

const hasEnContent = !!page?.sections?.some((s: any) => s.heading?.en || s.body?.en);
if (!hasEnContent) return Astro.redirect('/');

const title = page?.seo?.metaTitle || loc(page?.sections?.[0]?.heading, locale) || 'Wild Care';
const description = page?.seo?.metaDescription || 'Association for Contact Improvisation and social practice in Graz.';
const jsonLd = localBusinessSchema({
  name: siteSettings?.vereinName || 'Wild Care',
  address: siteSettings?.address || '',
  email: siteSettings?.email || '',
  url: 'https://wildcare.space',
  zvrZahl: siteSettings?.zvrZahl,
});
---

<Base
  title={title}
  description={description}
  ogImage={page?.seo?.ogImage}
  locale={locale}
  pageKey="index"
  hasTranslation={true}
  bodyClass="has-hero-video"
  jsonLd={jsonLd}
  navigation={navigation}
  siteSettings={siteSettings}
>
  {page?.sections && <SectionRenderer sections={page.sections} locale={locale} />}
</Base>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro src/pages/en/index.astro
git commit -m "feat: add homepage templates (DE + EN)"
```

---

### Task 17: Page-Specific Components + Dynamic Pages

**Files:**
- Create: `src/components/pages/MontagskursPage.astro`
- Create: `src/components/pages/BewegungsrevolutionPage.astro`
- Create: `src/components/pages/MitmachenPage.astro`
- Create: `src/components/pages/TeamPage.astro`
- Create: `src/pages/[...slug].astro`
- Create: `src/pages/en/[...slug].astro`

- [ ] **Step 1: Create MontagskursPage component**

Write `src/components/pages/MontagskursPage.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';
import { urlFor } from '../../lib/image';
import PortableText from '../PortableText.astro';

interface Props {
  page: any;
  locale: Locale;
}

const { page, locale } = Astro.props;
const hero = page?.hero;
const learnCards = page?.learnCards;
const testimonials = page?.testimonials;
const faqList = page?.faqList;
---

<!-- Hero -->
{hero && (
  <header class="detail-hero">
    <div class="container">
      <div class="detail-hero-grid">
        <div class="detail-hero-content fade-up">
          {hero.eyebrow && <p class="label">{loc(hero.eyebrow, locale)}</p>}
          {hero.heading && <h1 set:html={loc(hero.heading, locale)} />}
          {hero.subtitle && <p class="detail-hero-subtitle">{loc(hero.subtitle, locale)}</p>}

          {hero.details && (
            <div class="detail-hero-details">
              {hero.details.map((d: any) => (
                <div class="detail-hero-detail">
                  {d.icon && <span set:html={d.icon} />}
                  <span>{loc(d.value || d.label, locale)}</span>
                </div>
              ))}
            </div>
          )}

          {hero.ctaLabel && (
            <div class="detail-hero-cta">
              <a href={hero.ctaLink || '#'} class="btn btn-primary">{loc(hero.ctaLabel, locale)}</a>
              {hero.note && <p class="detail-hero-note">{loc(hero.note, locale)}</p>}
            </div>
          )}
        </div>

        {hero.image && (
          <div class="detail-photo fade-up delay-2">
            <img src={urlFor(hero.image).width(600).auto('format').url()} alt="Contact Improvisation" />
          </div>
        )}
      </div>
    </div>
  </header>
)}

<!-- Description -->
{page?.description && (
  <section class="detail-about">
    <div class="container">
      <PortableText value={page.description[locale] || page.description.de} />
    </div>
  </section>
)}

<!-- What You Learn -->
{learnCards?.cards && (
  <section>
    <div class="container">
      <div class="section-header fade-up" style="text-align: center; margin-bottom: 56px;">
        {learnCards.eyebrow && <p class="label">{loc(learnCards.eyebrow, locale)}</p>}
        {learnCards.heading && <h2>{loc(learnCards.heading, locale)}</h2>}
      </div>
      <div class="detail-card-grid">
        {learnCards.cards.map((card: any, i: number) => (
          <div class={`detail-card fade-up delay-${i + 1}`}>
            <h3>{loc(card.title, locale)}</h3>
            <p>{loc(card.body, locale)}</p>
          </div>
        ))}
      </div>
      {learnCards.donationNote && (
        <div class="detail-donation-note fade-up">
          <p>{loc(learnCards.donationNote, locale)}</p>
        </div>
      )}
    </div>
  </section>
)}

<!-- Testimonials -->
{testimonials?.items && (
  <section class="detail-testimonials">
    <div class="container">
      <div class="section-header fade-up" style="text-align: center; margin-bottom: 56px;">
        {testimonials.eyebrow && <p class="label">{loc(testimonials.eyebrow, locale)}</p>}
        {testimonials.heading && <h2>{loc(testimonials.heading, locale)}</h2>}
      </div>
      <div class="detail-testimonial-grid">
        {testimonials.items.map((item: any, i: number) => (
          <div class={`detail-testimonial fade-up delay-${i + 1}`}>
            <blockquote>{loc(item.quote, locale)}</blockquote>
            {item.author && <p class="detail-testimonial-author">{item.author}</p>}
          </div>
        ))}
      </div>
    </div>
  </section>
)}

<!-- FAQ -->
{faqList && faqList.length > 0 && (
  <section style="background: var(--sand-light);">
    <div class="container">
      <div class="detail-faq-list">
        {faqList.map((item: any) => (
          <div class="detail-faq-item fade-up">
            <p class="detail-faq-q">{loc(item.question, locale)}</p>
            <p class="detail-faq-a">{loc(item.answer, locale)}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 2: Create TeamPage component**

Write `src/components/pages/TeamPage.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { loc } from '../../lib/i18n';
import { urlFor } from '../../lib/image';
import PortableText from '../PortableText.astro';

interface Props {
  page: any;
  members: any[];
  locale: Locale;
}

const { page, members, locale } = Astro.props;
const hero = page?.hero;
---

<!-- Hero -->
{hero && (
  <header class="page-hero" style={hero.image ? `background-image: url(${urlFor(hero.image).width(1920).auto('format').url()})` : undefined}>
    <div class="container">
      {hero.eyebrow && <p class="label fade-up">{loc(hero.eyebrow, locale)}</p>}
      {hero.heading && <h1 class="fade-up delay-1">{loc(hero.heading, locale)}</h1>}
      {hero.subtitle && <p class="fade-up delay-2">{loc(hero.subtitle, locale)}</p>}
    </div>
  </header>
)}

<!-- Manifest Quote -->
{page?.manifestBox?.quote && (
  <section style="background: var(--sand-light);">
    <div class="container fade-up" style="text-align: center; max-width: 800px;">
      <div class="divider" style="margin: 0 auto var(--space-xl);"></div>
      <p class="quote">{loc(page.manifestBox.quote, locale)}</p>
      <div class="divider" style="margin: var(--space-xl) auto 0;"></div>
    </div>
  </section>
)}

<!-- Team Members -->
{members && members.length > 0 && (
  <section>
    <div class="container">
      <div class="team-grid">
        {members.map((member, i) => (
          <div class={`team-member fade-up delay-${i + 1}`}>
            {member.portrait && (
              <div class="team-portrait">
                <img src={urlFor(member.portrait).width(400).height(400).auto('format').url()} alt={member.name} loading="lazy" />
              </div>
            )}
            <h3>{member.name}</h3>
            {member.role && <p class="team-role">{loc(member.role, locale)}</p>}
            {member.bio?.[locale] && <PortableText value={member.bio[locale]} />}
          </div>
        ))}
      </div>
    </div>
  </section>
)}

<!-- Philosophy -->
{page?.philosophy && (
  <section>
    <div class="container">
      {page.philosophy.intro && (
        <div class="fade-up" style="max-width: 700px; margin: 0 auto var(--space-xl);">
          <PortableText value={page.philosophy.intro[locale] || page.philosophy.intro.de} />
        </div>
      )}
      {page.philosophy.pillars && (
        <div class="values-grid">
          {page.philosophy.pillars.map((pillar: any, i: number) => (
            <div class={`value-card fade-up delay-${i + 1}`}>
              <h3>{loc(pillar.title, locale)}</h3>
              <p>{loc(pillar.description, locale)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
)}
```

- [ ] **Step 3: Create BewegungsrevolutionPage and MitmachenPage**

Write `src/components/pages/BewegungsrevolutionPage.astro` (follows same pattern as MontagskursPage but with project cards, preview cards, and donation note sections — structured per spec).

Write `src/components/pages/MitmachenPage.astro` (circles visual, circle cards, membership tiers, form embed — structured per spec).

These follow the same pattern as MontagskursPage. For brevity, they render their fixed-field structures using `loc()` and `PortableText`. The structure maps 1:1 from the Sanity schema fields to component sections.

- [ ] **Step 4: Create dynamic page router (DE)**

Write `src/pages/[...slug].astro`:

```astro
---
import Base from '../layouts/Base.astro';
import SectionRenderer from '../components/sections/SectionRenderer.astro';
import MontagskursPage from '../components/pages/MontagskursPage.astro';
import BewegungsrevolutionPage from '../components/pages/BewegungsrevolutionPage.astro';
import MitmachenPage from '../components/pages/MitmachenPage.astro';
import TeamPage from '../components/pages/TeamPage.astro';
import PortableText from '../components/PortableText.astro';
import {
  getMontagskurs, getBewegungsrevolution, getMitmachen,
  getTeamPage, getKontakt, getLegalPage,
  getTeamMembers, getSharedData
} from '../lib/sanity';
import { loc } from '../lib/i18n';
import { localBusinessSchema } from '../lib/schema';

const locale = 'de';

export function getStaticPaths() {
  return [
    { params: { slug: 'montagskurs' } },
    { params: { slug: 'bewegungsrevolution' } },
    { params: { slug: 'mitmachen' } },
    { params: { slug: 'team' } },
    { params: { slug: 'programm' } },
    { params: { slug: 'kontakt' } },
    { params: { slug: 'impressum' } },
    { params: { slug: 'datenschutz' } },
  ];
}

const { slug } = Astro.params;
const { navigation, siteSettings } = await getSharedData();

// Fetch page-specific data
let page: any;
let members: any[] = [];
let title = 'Wild Care';
let description = '';
let pageKey = slug || '';
let component = 'generic';

switch (slug) {
  case 'montagskurs':
    page = await getMontagskurs();
    title = page?.seo?.metaTitle || loc(page?.hero?.heading, locale) || 'Montagskurs';
    component = 'montagskurs';
    break;
  case 'bewegungsrevolution':
    page = await getBewegungsrevolution();
    title = page?.seo?.metaTitle || loc(page?.hero?.heading, locale) || 'Bewegungsrevolution';
    component = 'bewegungsrevolution';
    break;
  case 'mitmachen':
    page = await getMitmachen();
    title = page?.seo?.metaTitle || loc(page?.hero?.heading, locale) || 'Mitmachen';
    component = 'mitmachen';
    break;
  case 'team':
    page = await getTeamPage();
    members = await getTeamMembers();
    title = page?.seo?.metaTitle || loc(page?.hero?.heading, locale) || 'Team';
    component = 'team';
    break;
  case 'kontakt':
    page = await getKontakt();
    title = page?.seo?.metaTitle || 'Kontakt';
    component = 'kontakt';
    break;
  case 'impressum':
  case 'datenschutz':
    page = await getLegalPage(slug);
    title = page?.seo?.metaTitle || loc(page?.heading, locale) || slug;
    component = 'legal';
    break;
}

description = page?.seo?.metaDescription || description;
const jsonLd = localBusinessSchema({
  name: siteSettings?.vereinName || 'Wild Care',
  address: siteSettings?.address || '',
  email: siteSettings?.email || '',
  url: 'https://wildcare.space',
  zvrZahl: siteSettings?.zvrZahl,
});
---

<Base
  title={title}
  description={description}
  ogImage={page?.seo?.ogImage}
  locale={locale}
  pageKey={pageKey}
  hasTranslation={true}
  jsonLd={jsonLd}
  navigation={navigation}
  siteSettings={siteSettings}
>
  {component === 'montagskurs' && <MontagskursPage page={page} locale={locale} />}
  {component === 'bewegungsrevolution' && <BewegungsrevolutionPage page={page} locale={locale} />}
  {component === 'mitmachen' && <MitmachenPage page={page} locale={locale} />}
  {component === 'team' && <TeamPage page={page} members={members} locale={locale} />}
  {component === 'kontakt' && page?.sections && <SectionRenderer sections={page.sections} locale={locale} />}
  {component === 'legal' && page?.legalBody && (
    <section>
      <div class="container">
        {page.heading && <h1>{loc(page.heading, locale)}</h1>}
        <PortableText value={page.legalBody[locale] || page.legalBody.de} />
      </div>
    </section>
  )}
</Base>
```

- [ ] **Step 5: Create dynamic page router (EN)**

Write `src/pages/en/[...slug].astro` — same structure as the DE version but with `locale = 'en'` and EN slug mappings:

```astro
---
// Same imports as DE version, paths adjusted for ../..

const locale = 'en';

export function getStaticPaths() {
  return [
    { params: { slug: 'monday-class' } },
    { params: { slug: 'movement-revolution' } },
    { params: { slug: 'join' } },
    { params: { slug: 'team' } },
    { params: { slug: 'programme' } },
    { params: { slug: 'contact' } },
    { params: { slug: 'imprint' } },
    { params: { slug: 'privacy' } },
  ];
}

// Same switch logic but mapping EN slugs to the same fetchers
// e.g., 'monday-class' → getMontagskurs(), etc.
```

- [ ] **Step 6: Commit**

```bash
git add src/components/pages/ src/pages/
git commit -m "feat: add page-specific components and dynamic page routing (DE + EN)"
```

---

### Task 18: Journal Templates

**Files:**
- Create: `src/pages/journal/index.astro`
- Create: `src/pages/journal/[slug].astro`
- Create: `src/pages/en/journal/index.astro`
- Create: `src/pages/en/journal/[slug].astro`

- [ ] **Step 1: Create DE journal listing**

Write `src/pages/journal/index.astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import { getPublishedArticles, getSharedData } from '../../lib/sanity';
import { loc } from '../../lib/i18n';
import { urlFor } from '../../lib/image';
import { localBusinessSchema } from '../../lib/schema';

const locale = 'de';
const [articles, { navigation, siteSettings }] = await Promise.all([
  getPublishedArticles(locale),
  getSharedData(),
]);
---

<Base
  title="Journal — Wild Care"
  description="Artikel und Gedanken zu Kontaktimprovisation und sozialer Praxis."
  locale={locale}
  pageKey="journal"
  hasTranslation={true}
  navigation={navigation}
  siteSettings={siteSettings}
>
  <header class="page-hero">
    <div class="container">
      <p class="label fade-up">Journal</p>
      <h1 class="fade-up delay-1">Journal</h1>
    </div>
  </header>

  <section>
    <div class="container">
      <div class="journal-grid">
        {articles?.map((article: any, i: number) => (
          <a href={`/journal/${article.slug?.current}/`} class={`journal-card fade-up delay-${i + 1}`}>
            {article.image && (
              <div class="journal-card-image">
                <img src={urlFor(article.image).width(600).height(400).auto('format').url()} alt={article.image.alt || ''} loading="lazy" />
              </div>
            )}
            <div class="journal-card-body">
              {article.publishedAt && (
                <p class="journal-card-date">{new Date(article.publishedAt).toLocaleDateString('de-AT')}</p>
              )}
              <h3>{loc(article.title, locale)}</h3>
              {article.excerpt && <p>{loc(article.excerpt, locale)}</p>}
            </div>
          </a>
        ))}
      </div>
    </div>
  </section>
</Base>
```

- [ ] **Step 2: Create DE journal article page**

Write `src/pages/journal/[slug].astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import PortableText from '../../components/PortableText.astro';
import { getAllArticleSlugs, getArticleBySlug, getSharedData } from '../../lib/sanity';
import { loc } from '../../lib/i18n';
import { urlFor } from '../../lib/image';
import { articleSchema } from '../../lib/schema';

const locale = 'de';

export async function getStaticPaths() {
  const articles = await getAllArticleSlugs();
  return articles.map((a: any) => ({ params: { slug: a.slug } }));
}

const { slug } = Astro.params;
const [article, { navigation, siteSettings }] = await Promise.all([
  getArticleBySlug(slug!),
  getSharedData(),
]);

if (!article) return Astro.redirect('/journal/');

const title = article.seo?.metaTitle || loc(article.title, locale) || 'Article';
const description = article.seo?.metaDescription || loc(article.excerpt, locale) || '';
const imageUrl = article.image ? urlFor(article.image).width(1200).auto('format').url() : undefined;
const jsonLd = articleSchema({
  headline: loc(article.title, locale) || '',
  datePublished: article.publishedAt,
  imageUrl,
});
const hasEnTranslation = !!article.title?.en;
---

<Base
  title={title}
  description={description}
  ogImage={article.seo?.ogImage || article.image}
  locale={locale}
  pageKey={`journal/${slug}`}
  hasTranslation={hasEnTranslation}
  type="article"
  jsonLd={jsonLd}
  navigation={navigation}
  siteSettings={siteSettings}
>
  <article>
    <header class="article-hero">
      <div class="container">
        {article.publishedAt && (
          <p class="label fade-up">{new Date(article.publishedAt).toLocaleDateString('de-AT')}</p>
        )}
        <h1 class="fade-up delay-1">{loc(article.title, locale)}</h1>
      </div>
      {article.image && (
        <div class="article-hero-image fade-up delay-2">
          <img src={imageUrl} alt={article.image.alt || ''} />
        </div>
      )}
    </header>

    <section>
      <div class="container article-body">
        {article.body && <PortableText value={article.body[locale] || article.body.de} />}
      </div>
    </section>
  </article>
</Base>
```

- [ ] **Step 3: Create EN journal listing and article pages**

Write `src/pages/en/journal/index.astro` — same as DE but `locale = 'en'` and adjusted paths.

Write `src/pages/en/journal/[slug].astro` — same as DE but `locale = 'en'` and adjusted paths. Filter out articles without English content.

- [ ] **Step 4: Commit**

```bash
git add src/pages/journal/ src/pages/en/journal/
git commit -m "feat: add journal listing and article pages (DE + EN)"
```

---

## Phase 7: Deployment & Final Wiring

### Task 19: Robots.txt + Sitemap

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Create robots.txt**

Write `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://wildcare.space/sitemap-index.xml
```

Sitemap is auto-generated by `@astrojs/sitemap` (configured in Task 1).

- [ ] **Step 2: Commit**

```bash
git add public/robots.txt
git commit -m "feat: add robots.txt"
```

---

### Task 20: Environment Variables + Build Verification

**Files:**
- Create: `.env` (not committed)
- Modify: `netlify.toml`

- [ ] **Step 1: Create .env with real Sanity project ID**

```bash
cp .env.example .env
# Edit .env to add the real SANITY_PROJECT_ID from Task 2
```

- [ ] **Step 2: Update netlify.toml with environment variable references**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

# Sanity webhook build hook is configured in Netlify UI
# Environment variables SANITY_PROJECT_ID, SANITY_DATASET set in Netlify UI
```

- [ ] **Step 3: Run full build**

```bash
npx astro build
```

Expected: Build succeeds, outputs static HTML to `dist/`. If Sanity has no content yet, pages render with empty sections (no errors).

- [ ] **Step 4: Run dev server**

```bash
npx astro dev
```

Expected: Dev server starts at `localhost:4321`. Pages load (empty content until Sanity is seeded).

- [ ] **Step 5: Commit**

```bash
git add netlify.toml
git commit -m "feat: finalize Netlify config for Astro build"
```

---

### Task 21: Deploy Sanity Studio

- [ ] **Step 1: Deploy Studio to Sanity Cloud**

```bash
cd studio && npx sanity deploy
```

When prompted, choose hostname: `wildcare` (will be `wildcare.sanity.studio`).

- [ ] **Step 2: Verify Studio is accessible**

Open `https://wildcare.sanity.studio` in browser. Log in and verify all document types are visible.

- [ ] **Step 3: Configure Sanity webhook**

In Sanity project settings (manage.sanity.io):
1. Go to API → Webhooks
2. Add webhook:
   - Name: `Netlify Build`
   - URL: Netlify build hook URL (from Netlify UI → Site → Build & deploy → Build hooks)
   - Trigger on: Create, Update, Delete
   - Filter: Leave empty (trigger on all document changes)

- [ ] **Step 4: Commit any Studio config changes**

```bash
cd .. && git add studio/
git commit -m "chore: deploy Sanity Studio to wildcare.sanity.studio"
```

---

### Task 22: Seed Sanity with Current Content

This is a manual/scripted step to populate Sanity with existing content from the Eleventy site.

- [ ] **Step 1: Create seed script**

Create `studio/seed.ts` (run with `npx sanity exec seed.ts --with-user-token`):

```ts
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: 'production',
  apiVersion: '2026-04-10',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

async function seed() {
  // Site Settings
  await client.createOrReplace({
    _id: 'siteSettings',
    _type: 'siteSettings',
    vereinName: 'Wild Care — Wilde Fürsorge',
    address: 'Fabio Maria Gerhold\nFroschaugasse 7\n8010 Graz\nÖsterreich',
    email: 'hello@wildcare.space',
    socialLinks: [
      { _key: 'ig', platform: 'instagram', url: 'https://instagram.com/wildcare.space' },
    ],
    copyrightYear: 2026,
  });

  // Navigation
  await client.createOrReplace({
    _id: 'navigation',
    _type: 'navigation',
    mainMenu: [
      { _key: 'home', label_de: 'Startseite', label_en: 'Home', href: '/' },
      { _key: 'about', label_de: 'Über uns', label_en: 'About', href: '/team/' },
      { _key: 'prog', label_de: 'Programm', label_en: 'Programme', href: '/programm/' },
      { _key: 'journal', label_de: 'Journal', label_en: 'Journal', href: '/journal/' },
      { _key: 'join', label_de: 'Mitmachen', label_en: 'Get Involved', href: '/mitmachen/' },
      { _key: 'contact', label_de: 'Komm vorbei', label_en: 'Visit Us', href: '/kontakt/' },
    ],
    ctaButton: { label_de: 'Komm vorbei', label_en: 'Visit Us', href: '/kontakt/' },
    showLanguageSwitcher: true,
  });

  // Team Members
  await client.createOrReplace({
    _id: 'member-fabio',
    _type: 'teamMember',
    name: 'Fabio Maria Gerhold',
    role: { de: 'Gründer', en: 'Founder' },
    sortOrder: 1,
  });

  await client.createOrReplace({
    _id: 'member-verena',
    _type: 'teamMember',
    name: 'Verena',
    sortOrder: 2,
  });

  console.log('Seed complete!');
}

seed().catch(console.error);
```

- [ ] **Step 2: Run seed script**

```bash
cd studio && npx sanity exec seed.ts --with-user-token
```

Expected: Documents created in Sanity. Verify in Studio.

- [ ] **Step 3: Manually populate remaining content**

Use Sanity Studio to:
1. Create Homepage document with sections matching the current site
2. Create Montagskurs document with hero, testimonials, FAQ from `de.yml`
3. Create journal articles from existing markdown files
4. Create legal pages (impressum, datenschutz) from `de.yml` content

- [ ] **Step 4: Commit seed script**

```bash
cd .. && git add studio/seed.ts
git commit -m "chore: add Sanity seed script for initial content migration"
```

---

### Task 23: Event Recurrence Expansion (Astro Build Helper)

**Files:**
- Create: `src/lib/events.ts`

- [ ] **Step 1: Create event expansion helper**

Write `src/lib/events.ts`:

```ts
interface EventInstance {
  title: { de?: string; en?: string };
  startDateTime: string;
  endDateTime: string;
  location: string;
  cost: string;
  slug: string;
}

/**
 * Expand weekly recurring events into flat instances for the next 8 weeks.
 * Single and block events are passed through as-is.
 */
export function expandEvents(events: any[]): EventInstance[] {
  const instances: EventInstance[] = [];
  const now = new Date();
  const eightWeeksOut = new Date(now.getTime() + 8 * 7 * 24 * 60 * 60 * 1000);

  for (const event of events) {
    if (event.recurrenceType === 'weekly' && event.recurrenceRule) {
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      };
      const targetDay = dayMap[event.recurrenceRule.dayOfWeek] ?? 1;
      const endDate = event.recurrenceRule.endDate
        ? new Date(event.recurrenceRule.endDate)
        : eightWeeksOut;

      // Calculate time offset from original event
      const origStart = new Date(event.startDateTime);
      const origEnd = new Date(event.endDateTime);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const startHour = origStart.getHours();
      const startMin = origStart.getMinutes();

      // Find next occurrence of target day
      const cursor = new Date(now);
      cursor.setHours(startHour, startMin, 0, 0);
      while (cursor.getDay() !== targetDay) {
        cursor.setDate(cursor.getDate() + 1);
      }

      while (cursor <= endDate && cursor <= eightWeeksOut) {
        const instanceStart = new Date(cursor);
        const instanceEnd = new Date(instanceStart.getTime() + durationMs);
        instances.push({
          title: event.title,
          startDateTime: instanceStart.toISOString(),
          endDateTime: instanceEnd.toISOString(),
          location: event.location,
          cost: event.cost,
          slug: event.slug?.current || '',
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    } else if (event.recurrenceType === 'block' && event.blockDates) {
      for (const block of event.blockDates) {
        instances.push({
          title: event.title,
          startDateTime: block.startDate,
          endDateTime: block.endDate,
          location: event.location,
          cost: event.cost,
          slug: event.slug?.current || '',
        });
      }
    } else {
      // Single event
      instances.push({
        title: event.title,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        location: event.location,
        cost: event.cost,
        slug: event.slug?.current || '',
      });
    }
  }

  return instances
    .filter((e) => new Date(e.startDateTime) >= now)
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/events.ts
git commit -m "feat: add event recurrence expansion for weekly/block events"
```

---

### Task 24: Clean Up Old Eleventy Files

- [ ] **Step 1: Remove old Eleventy config and templates**

After verifying the Astro site builds and works:

```bash
rm .eleventy.js
rm -rf src/_includes src/_data src/pages src/journal src/admin src/css src/js src/brand.html
rm -rf _site
```

- [ ] **Step 2: Remove Eleventy dependencies from package.json**

Remove `@11ty/eleventy` from devDependencies and `js-yaml` from dependencies.

- [ ] **Step 3: Verify clean build**

```bash
npm install && npx astro build
```

Expected: Build succeeds with only Astro files.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Eleventy files and dependencies after Astro migration"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1. Foundation | 1-3 | Astro project, Sanity Studio init, client setup |
| 2. Schema Helpers & Blocks | 4-5 | Localized fields, SEO, 12 section block types |
| 3. Documents & Singletons | 6-9 | All page schemas, collections, singletons, desk structure |
| 4. Astro Base | 10-13 | i18n, Portable Text, SEO, Base layout, Nav, Footer |
| 5. Section Components | 14 | All 12 section components + SectionRenderer |
| 6. Pages & Queries | 15-18 | GROQ layer, homepage, dynamic pages, journal |
| 7. Deployment | 19-24 | Robots, env, Studio deploy, seed, event expansion, cleanup |
