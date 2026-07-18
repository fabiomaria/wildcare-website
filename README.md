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

## Forms and Workers

- `worker/`: homepage email signup to Notion. Stores the submitted first name in Notion's `Name` field and retains email fallback compatibility for older clients.
- `worker-kontakt/`: contact form to Notion.
- `worker-auth/`: GitHub OAuth for Sveltia CMS.

Never commit Worker secrets. They are managed through Wrangler.

## Deployment

Pushing the `production` branch triggers `.github/workflows/deploy.yml`, which builds `_site/` and deploys it to GitHub Pages.

The signup Worker is deployed separately:

```bash
cd worker
npm run deploy
```

## Project Documentation

- [Current documentation index](docs/superpowers/README.md)
- [Sveltia backend rework and follow-up](docs/superpowers/plans/2026-07-18-sveltia-backend-rework.md)
- [CMS implementation brief](docs/superpowers/specs/2026-07-17-github-pages-cms-implementation-brief.md)
- [Translation conventions](TRANSLATION.md)
