# Wild Care — wildcare.space

Website for Wild Care, a Verein für soziale Praxis in Graz.

## Stack

- **Eleventy** — static site generator
- **Nunjucks** — templates
- **Decap CMS** — content editor at `/admin/`
- **GitHub Pages** — hosting, deployed via GitHub Actions
- **Netlify Identity** — auth for Decap (we use Netlify for auth only, not hosting)

## Development

```bash
npm install
npm run dev
# Opens http://localhost:8080
```

## Build

```bash
npm run build
# Output in _site/
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml` which builds and publishes to GitHub Pages.

## Content editing

Log in at `https://wildcare.space/admin/` with a Netlify Identity invitation. Changes are committed to the repo and auto-deploy.

## Structure

- `src/pages/` — page templates (one per page, rendered for each locale)
- `src/journal/` — journal posts as Markdown
- `src/_data/i18n/` — all translated strings (de.yml, en.yml)
- `src/_includes/layouts/` — base, page, article layouts
- `src/_includes/partials/` — nav, footer, head-meta
- `src/css/styles.css` — single source of truth for all styling
- `src/admin/` — Decap CMS shell + config
