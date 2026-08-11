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

`content/pages/*.yaml` stores fixed-layout page content. `content/journal/records/*.yaml` stores complete Journal articles. `content/workshops/*.yaml` stores workshop entries. Journal articles and workshops both use Sveltia's single-file DE/EN locale structure, so metadata and localized page content are edited together.

Workshop data has four central concepts:

- `title`: canonical title used by programme cards, breadcrumbs, hero fallback, and SEO fallback
- `registration_url` and `registration`: one registration destination and localized action copy
- `facts`: canonical date, time, location, price, duration, format, and detailed schedule
- `description`: the core article text, rendered beside the facts card

Hero headings and SEO titles are optional overrides. Decorative badges and eyebrow labels are optional. Facilitators can have adjacent optional quotes, and secondary sections such as research cards, image bands, and FAQ are optional.

The Programme page is also CMS-managed. Keep index-matched German and English lists in the same order and at the same length.

### CMS bilingual editing

The `Pages` collection uses Sveltia's native `single_file` i18n mode. Each page file explicitly enables both `de` and `en`, keeps German as the default locale, and sets `initial_locales: all`. Existing bilingual YAML therefore opens as two editor panes without requiring editors to enable English from the menu.

Workshops use two primary-language collections over the same source folder. `workshops_de` defaults to German and offers English as an optional translation; `workshops_en` does the reverse. Their `initial_locales: default` setting is intentional: editors enable the secondary locale from Sveltia's locale menu only when that workshop is bilingual.

Journal publishing uses the same model. `journal_de` and `journal_en` each create a single article record containing the title, one reusable summary, full Markdown body, images, CTA, and SEO fields. The URL is derived from one stable slug, publication dates break ties alphabetically, and new articles begin as drafts. Enabling a secondary locale keeps its complete translation in the same entry.

Workshops and events use the same simplified publishing controls: editors enter one URL slug, while the build derives `/<slug>` for workshops and `/events/<slug>` for events. Legal-page routes are derived in the same way. There is no manual sort-order field; records with the same date are ordered alphabetically by slug. Fixed-layout pages retain their established routes as hidden implementation data because editors cannot create or rename those pages.

For the pinned Sveltia CMS version, declaring `i18n: true` only on a parent object is not sufficient for nested fields: the secondary-language object can appear expanded but empty. Every localized nested object, list, and leaf field in `admin/config.yml` must therefore declare `i18n: true` explicitly. Locale-neutral controls, URLs, schedules, and shared media use `i18n: false` and are intentionally editable only in the primary/default pane. Lists whose item identity and order must stay synchronized use `i18n: duplicate`, with translated child fields still marked `i18n: true`.

`npm run schema:cms` enforces the page locale configuration and rejects localized descendants in pages or workshops that rely on implicit inheritance.

## Schema Migration

The site now uses schema v2 content records. The migration moved shared metadata into a language-neutral `global` block and localized copy into `locales`, while keeping page URLs stable. Journal articles keep their localized Markdown bodies inside each canonical record; legal pages keep canonical records plus body files under `content/legal/`. Workshops use the same v2 record shape across the CMS and build.

The migration is reversible by design: `npm run schema:check` validates the registry, CMS contract, content, parity, and downgrade fixtures, and `npm run build` verifies the rendered site before deployment.

### Calendar and event publishing

Calendar-aware workshops, events, and recurring classes use the structured `global.schedule` block. Calendar definitions live in `lib/calendar/` and are loaded by Eleventy from `content/workshops/`, `content/events/`, and scheduled fixed pages such as `content/pages/montagskurs.yaml`.

Dated workshops and events automatically leave current listings and enter `/archive` as soon as their final scheduled session has ended in `Europe/Vienna`. Draft and unlisted records remain hidden. The GitHub Pages workflow rebuilds the production branch daily so this transition happens even when nobody edits the CMS.

Each published dated record can produce:

- an Event JSON-LD block with structured date, venue, status, and registration data;
- a per-event iCalendar feed at `/calendar/<id>.ics`;
- the subscribable master feed at `/wildcare.ics`;
- a human-readable leaf page for events and featured Montagskurs dates;
- inclusion in the generated `/sitemap.xml` when it has an HTML page.

Featured occurrence pages use human-readable dates in their title, description, heading, and `<time>` elements. Their JSON-LD uses the leaf-page URL and event name, while the machine-readable `startDate` and `endDate` remain floating local times.

Leaf pages are written one directory deep (`events/<id>.html`, `montagskurs/<date>.html`, `journal/<slug>.html`), so any nested template **must set `{%- set pathPrefix = "../" -%}` before including `partials/nav.njk`**. The shared nav and footer emit root-page-relative links (`index`, `team`, …) via the `navigationUrl` filter; without the prefix they resolve against the subdirectory and produce broken URLs like `/events/index`. Root-level templates (`index.njk`, `team.njk`, …) leave `pathPrefix` unset. This is unrelated to the `www` → apex redirect — it affects every nested page regardless of the domain used to reach it.

Preview calendar changes locally with `npm run dev`, then check `/montagskurs/<date>`, `/events/<id>`, `/wildcare.ics`, and `/sitemap.xml`. The deployment workflow runs `npm run schema:check` and `npm run build` before publishing.

#### Recent scheduling decisions

- Montagskurs keeps a weekly recurrence with a default teacher; individual
  Mondays use one unified override list for guest teachers, notes, and breaks.
- Sveltia uses native date, time, and datetime-local inputs for structured
  scheduling fields while preserving the existing storage formats.
- Date-only YAML values must remain quoted (`'YYYY-MM-DD'`). Validation rejects
  unquoted recurrence anchors and override dates because YAML can otherwise
  parse them as JavaScript dates and break recurrence expansion.

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

Because the CMS also commits directly to `production`, fetch and rebase onto the latest remote branch before pushing local changes (for example, `git fetch origin production && git rebase origin/production`).

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
