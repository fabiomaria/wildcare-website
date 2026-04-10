# Wild Care — wildcare.space

Website for Wild Care, a Verein für soziale Praxis in Graz.

## Stack

- **Eleventy** — static site generator
- **Nunjucks** — templates
- **Decap CMS** — content editor at `/admin/`
- **Netlify** — hosting, builds, and OAuth proxy for CMS auth
- **GitHub OAuth** — authenticates CMS users via their GitHub account

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

Pushing to `main` triggers a Netlify build which runs `npm run build` and publishes the `_site/` directory. Build config is in `netlify.toml`.

## Content editing

Log in at `https://wildcare.space/admin/` with your GitHub account. Changes are committed to the repo and auto-deploy.

## Structure

- `src/pages/` — page templates (one per page, rendered for each locale)
- `src/journal/` — journal posts as Markdown
- `src/_data/i18n/` — all translated strings (de.yml, en.yml)
- `src/_includes/layouts/` — base, page, article layouts
- `src/_includes/partials/` — nav, footer, head-meta
- `src/css/styles.css` — single source of truth for all styling
- `src/admin/` — Decap CMS shell + config

## Architecture

```
wildcare.space (Netlify)
├── Eleventy site — built and hosted on Netlify
├── /admin/ — Decap CMS (client-side JS)
│   ├── Auth: GitHub OAuth via Netlify's built-in OAuth proxy
│   └── Content: reads/writes directly to GitHub repo via GitHub API
└── netlify.toml — build config
```

### Authentication flow

1. User visits `wildcare.space/admin/` and clicks "Login with GitHub"
2. Netlify's OAuth proxy (`api.netlify.com/auth`) redirects to GitHub
3. User authorizes the GitHub OAuth App
4. GitHub redirects back to Netlify (`api.netlify.com/auth/done`)
5. Netlify exchanges the code for a token and passes it to the CMS
6. Decap CMS uses the token to read/write the repo via GitHub's API

### External services

| Service | Purpose | Config location |
|---------|---------|-----------------|
| **Netlify** | Hosting + OAuth proxy | `netlify.toml`, Netlify dashboard (OAuth under Access & security) |
| **GitHub OAuth App** | CMS authentication | github.com/settings/developers, Client ID in `src/admin/config.yml` |

### GitHub OAuth App settings

- **Client ID**: referenced in Netlify's OAuth provider config
- **Callback URL**: `https://api.netlify.com/auth/done`
- **Scopes**: `repo` (granted at auth time by Decap CMS)
