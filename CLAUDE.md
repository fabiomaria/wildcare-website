# Wild Care Website — Agent Guide

Read this before touching anything. It captures the non-obvious gotchas that
have already bitten agents on this repo.

## ⚠️ Branch topology — the #1 trap

This repo contains **three important branches**:

- **`production`** — the **LIVE/CMS deploy branch**. This is the Eleventy +
  Sveltia CMS version deployed to GitHub Pages at `wildcare.space`. CMS edits
  commit here, GitHub Actions builds `_site/`, and Pages deploys the artifact.
- **`legacy-html-backup`** — frozen snapshot of the last pre-CMS static HTML
  site (`v1.0-legacy`). Use this only as a rollback reference/fallback.
- **`main`** — a **separate, unrelated rewrite** (Astro + Sanity CMS; formerly
  Eleventy + Decap CMS; Netlify hosting). Totally different architecture
  (`src/pages/*`, template files, a real build). It does **not** contain the
  root-level `*.html` files. Do **not** base static-site work on it.

**Consequence for parallel work:** `git`'s default branch / `origin/HEAD` points
at `main`, so `git worktree add` (and any agent "worktree isolation") checks out
from **`main` — the wrong base**. Agents then can't find `mitmachen.html`,
`js/i18n.js`, etc., and either stall or "helpfully" implement against the Astro
architecture (unusable). If you dispatch parallel agents in worktrees, base them
explicitly on `production`. When in doubt, work **directly on `production`**
(sequentially) — that is what actually ships.

Always confirm `git branch --show-current` is `production` and that
`site/`, `content/`, `index.html`, and `mitmachen.html` exist at the repo root
before editing.

## Site architecture

- The live site is being migrated from hand-coded HTML to **Eleventy + Sveltia
  CMS** on the `production` branch. Templated pages live under `site/` and pull
  editable copy from `content/`; root-level HTML is retained as compatibility
  baseline/static passthrough where needed.
- Run `npm run build` to produce `_site/`; run `npm run dev` for the local
  Eleventy preview. Verification is still lightweight: normalized HTML diffs,
  grep-based structural checks, local browser passes.
- Do not edit CMS-managed copy directly in templates. Put editable text in
  `content/` and let templates own markup, classes, IDs, behavior, and inline
  spacing around translated fields.
- Backend pieces are intentionally separate Cloudflare Workers:
  - `worker/` — homepage email signup to Notion. Frozen unless a task explicitly
    targets it.
  - `worker-kontakt/` — contact form to the same Notion database. Separate by
    design; do not merge into `worker/`.
  - `worker-auth/` — Sveltia CMS GitHub OAuth.

## Bilingual DE/EN (see also `TRANSLATION.md`)

- Client-side toggle in `js/i18n.js`. It selects `[data-de][data-en]` elements
  and swaps **`textContent`** (German is the default/initial text). Persisted in
  `localStorage` (`wc-lang`).
- **`textContent`, never `innerHTML`** (by design, anti-injection). The only
  exception is `<br>`. So you **cannot** put markup (e.g. an `<a>`) inside a
  `data-de`/`data-en` attribute — it renders as escaped literal text. Split it:
  a translatable `<span data-de/data-en>` for the words + separate static markup
  (e.g. the `<a>`) outside any translated attribute. Encode entities
  (`&uuml;`, `&mdash;`, …) inside the attributes.
- `js/i18n.js` also swaps **`aria-label`** from `data-aria-de`/`data-aria-en`
  (same lookup pattern). Use this for translated accessible names.
- **German-only pages:** `datenschutz.html` and `impressum.html` have **no**
  `data-de`/`data-en` and don't load `i18n.js`. Do **not** add toggle attributes
  there — nothing reads them.

## Styling constraints (current work stream)

- **Do not edit `css/styles.css`, do not add new CSS files, do not add inline
  `style="..."` attributes.** (Removing a pre-existing inline style to fix a bug
  is fine; adding one is not.) Reuse existing classes: `.btn`, `.btn-primary`,
  `.btn-secondary`, `.btn-ghost`, `.form-group`, `.form-note`, `.nav-cta`, …
- `.btn-ghost` is always paired with `.btn` sitewide (`class="btn btn-ghost"`).

## Email signup → Notion (the `worker/` backend)

- The homepage email-list signup form (in the `.cta-section` "Komm vorbei" band
  on `index.html`) POSTs to the Cloudflare Worker, which writes a row to
  Notion. Notion has no public form endpoint and the static site can't hold a
  secret, hence the Worker relay.
- **Reuses the existing Notion database `Wild Care Anmeldungen`**
  (id `4e17b975-28ac-8298-8a1b-81e5b9bbb85b`) — **not** a dedicated signup DB.
  Integration name: **`Wild Care signup`** (must be connected to the DB via the
  database's `···` → **Connections**, or API calls 404).
- DB schema (do not assume the plan's original `Email/Consent/Language/Source`
  columns — they don't exist here): `Name` (title), `Email` (email-type),
  `Erfahrung` (rich_text), `Nachricht` (rich_text), `Anmeldung Datum` (date),
  `Wie hast du von uns erfahren` (select), `Tag` (multi_select).
- **There is no consent/language/source column.** By owner decision, the Worker
  records those as a **text note in `Nachricht`**, e.g.
  `"E-Mail-Verteiler (kommende Events) — Anmeldung über Startseite — Einwilligung erteilt — Sprache: de"`.
  Worker field mapping: `Name` ← email, `Email` ← email,
  `Anmeldung Datum` ← submission date, `Nachricht` ← the note. Consent is still
  **required to submit** (validated), just recorded as text.
- Secrets `NOTION_TOKEN` and `NOTION_DATABASE_ID` live as **Cloudflare Worker
  secrets** (`wrangler secret put`), never committed.
- Notion API version `2022-06-28`. To find the real database id, use
  `POST /v1/search` (a page URL's id can be a *page*, not the database).

## Contact form → Notion (the `worker-kontakt/` backend)

- `kontakt.html` no longer posts to Formspree. It uses an inline fetch to
  `worker-kontakt/`, which writes into the same `Wild Care Anmeldungen` Notion
  database.
- Keep `worker-kontakt/` separate from `worker/`. Both use the same secret names
  (`NOTION_TOKEN`, `NOTION_DATABASE_ID`) but are deployed independently.
- Contact field mapping: `Name` ← submitted name, `Email` ← submitted email,
  `Nachricht` ← source/language-prefixed message text, `Anmeldung Datum` ←
  submission date, `Tag` (multi_select) ← `Kontaktformular`.
- The source tag is set server-side. Do not trust or pass it from the browser.

## Git / commit hygiene

- `git commit` with **no pathspec commits the entire index**. This tree has at
  times carried unrelated pre-existing staged changes. **Always commit with an
  explicit pathspec** (`git commit path/to/file -m "..."`) so you don't sweep in
  changes you didn't make.

## Known pre-existing quirk (unfixed, out of scope)

- On `mitmachen.html`, the Wurzel tier's `openMembershipForm('Root (60+ €)')`
  argument says `60+` while the displayed price and aria-labels say `€50+ /
  50 Euro oder mehr`. Pre-existing mismatch; reconcile only if a task calls for
  it.

## CMS schema verification (admin/config.yml)

- Parse check: `node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"`
- UI check: `npm run dev`, open http://localhost:8081/admin/ in Chrome, use
  **Work with Local Repository** (pick the repo root). This reads/writes the
  working tree directly — no GitHub auth needed.
- CMS saves rewrite YAML formatting (quoting, key order). Never judge a
  schema change by `git diff content/` after a UI save; judge it by the
  `_site/` build diff (`npm run build` + `diff -r -x admin _site <baseline>`).
