# Wild Care Website

Production website and CMS for [wildcare.space](https://wildcare.space), built with Eleventy and edited through Sveltia CMS.

## Stack

- Eleventy 3 with Nunjucks templates in `site/`
- YAML and Markdown content in `content/`
- Sveltia CMS configured in `admin/config.yml`
- Client-side German/English switching through `js/i18n.js`
- GitHub Pages deployment from the `production` branch
- Separate Cloudflare Workers for CMS authentication, contact messages, and email signup

## Local Development

```bash
npm install
npm run dev
```

The local site currently uses port `8081` by default. If that port is occupied, Eleventy selects another port and prints it in the terminal.

- Website: `http://localhost:8081/`
- CMS: `http://localhost:8081/admin/`

In Chrome or Edge, choose **Work with Local Repository** in the CMS and select this repository root. This mode edits the working tree directly.

## Content Architecture

`content/pages/*.yaml` stores fixed-layout page content. `content/journal/` stores Markdown articles. `content/workshops/*.yaml` stores workshop entries using Sveltia's single-file DE/EN locale structure.

Workshop data has four central concepts:

- `title`: canonical title used by programme cards, breadcrumbs, hero fallback, and SEO fallback
- `registration_url` and `registration`: one registration destination and localized action copy
- `facts`: canonical date, time, location, price, duration, format, and detailed schedule
- `description`: the core article text, rendered beside the facts card

Hero headings and SEO titles are optional overrides. Decorative badges and eyebrow labels are optional. Facilitators can have adjacent optional quotes, and secondary sections such as research cards, image bands, and FAQ are optional.

The Programme page is also CMS-managed. Keep index-matched German and English lists in the same order and at the same length.

## Schema Migration

The site now uses schema v2 content records. The migration moved shared metadata into a language-neutral `global` block and localized copy into `locales`, while keeping page URLs stable. Journal and legal articles now split into canonical records plus per-language body files under `content/journal/` and `content/legal/`, and workshops use the same v2 record shape across the CMS and build.

The migration is reversible by design: `npm run schema:check` validates the registry, CMS contract, content, parity, and downgrade fixtures, and `npm run build` verifies the rendered site before deployment.

### Calendar and event publishing

Calendar-aware workshops, events, and recurring classes use the structured `global.schedule` block. Calendar definitions live in `lib/calendar/` and are loaded by Eleventy from `content/workshops/`, `content/events/`, and scheduled fixed pages such as `content/pages/montagskurs.yaml`.

Each published dated record can produce:

- an Event JSON-LD block with structured date, venue, status, and registration data;
- a per-event iCalendar feed at `/calendar/<id>.ics`;
- the subscribable master feed at `/wildcare.ics`;
- a human-readable leaf page for events and featured Montagskurs dates;
- inclusion in the generated `/sitemap.xml` when it has an HTML page.

Featured occurrence pages use human-readable dates in their title, description, heading, and `<time>` elements. Their JSON-LD uses the leaf-page URL and event name, while the machine-readable `startDate` and `endDate` remain floating local times.

Preview calendar changes locally with `npm run dev`, then check `/montagskurs/<date>`, `/events/<id>`, `/wildcare.ics`, and `/sitemap.xml`. The deployment workflow runs `npm run schema:check` and `npm run build` before publishing.

One editorial regression is that this v2 CMS shape no longer provides side-by-side locale editing in the editor. That makes bilingual edits slower and more error-prone, so it should be treated as an open issue rather than a desired end state.

## Editing Guide

See [EDITING.md](EDITING.md) for the non-technical editor workflow. CMS field labels are English and include examples describing where each value appears.

## Verification

Before committing:

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8')); console.log('CMS config valid')"
npm run build
node --check worker/src/index.js
git diff --check
```

For rendering changes, review at least the homepage, Programme, a workshop detail page, About Us, and Contact at desktop and mobile widths.

CSS is sacrosanct: do not edit `css/styles.css` or add new CSS; reuse the existing component classes in templates.

## Forms and Workers

- `worker/`: homepage email signup to Notion. Stores the submitted first name in Notion's `Name` field and retains email fallback compatibility for older clients.
- `worker-kontakt/`: contact form to Notion.
- `worker-auth/`: GitHub OAuth for Sveltia CMS.

Never commit Worker secrets. They are managed through Wrangler.

## Deployment

Pushing the `production` branch triggers `.github/workflows/deploy.yml`, which builds `_site/` and deploys it to GitHub Pages.

Generated pages append a content hash to `css/styles.css`. This prevents GitHub Pages and Cloudflare from combining newly deployed HTML with an older cached stylesheet; keep stylesheet references tied to the global `assetVersion` value in `eleventy.config.js`.

The signup Worker is deployed separately:

```bash
cd worker
npm run deploy
```

## Project Documentation

- [Greenfield CMS implementation playbook](docs/CMS-GREENFIELD-IMPLEMENTATION-PLAYBOOK.md)
- [Current documentation index](docs/superpowers/README.md)
- [Sveltia backend rework and follow-up](docs/superpowers/plans/2026-07-18-sveltia-backend-rework.md)
- [CMS implementation brief](docs/superpowers/specs/2026-07-17-github-pages-cms-implementation-brief.md)
- [Translation conventions](TRANSLATION.md)
