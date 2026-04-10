# Eleventy + Decap CMS Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Wild Care static HTML site to an Eleventy-generated static site with a Decap CMS admin interface, deployed to GitHub Pages via GitHub Actions. Collapse the duplicated DE/EN HTML trees into a single templated source, and enable non-developer content editing.

**Architecture:** Eleventy (Node.js) with Nunjucks templates. One template per page, paginated twice per render via an `i18n` data cascade (DE output to `/`, EN output to `/en/`). Journal posts become an Eleventy collection, stored as Markdown with per-language files. Decap CMS is a static SPA hosted at `/admin/` that commits directly to the GitHub repo via Netlify Identity (Git Gateway) OAuth. Build runs in a GitHub Action on push to `main`, outputs to `_site/`, publishes to the `gh-pages` branch which GitHub Pages serves.

**Tech Stack:**
- **Eleventy** `@11ty/eleventy` v3 — static site generator
- **Nunjucks** — templating (built into Eleventy)
- **js-yaml** — YAML data parsing (transitive)
- **Decap CMS** `decap-cms` — content management
- **Netlify Identity** — free OAuth provider (no Netlify hosting required)
- **GitHub Actions** — CI/CD
- **Node.js** 22 LTS

---

## Open Decisions (Confirm Before Starting Phase 7)

These are decisions I made with sensible defaults. The user should confirm before execution reaches the dependent phase.

1. **Decap content model scope.** Default proposal: manage **journal posts** (fully), **team members**, **event dates** (next session on home page), and **landing page hero copy**. Do NOT manage: navigation labels, footer copy, legal text, translation strings (these edit rarely and benefit from developer review). User can expand scope later.
2. **Decap auth.** Default: **Netlify Identity + Git Gateway**. Free tier is sufficient. Self-hosted OAuth proxy can be swapped in later if needed.
3. **`brand.html`.** Default: **keep as a static passthrough, no templatization**. It's a one-off design system showcase with no content that changes. Passes through the build unchanged. Not in the nav.
4. **Videos (`assets/video-hero.mp4` 25 MB, `assets/what is ci.mp4` 34 MB).** Default: **keep in the repo as regular files**. No Git LFS. At 60 MB total, under GH Pages' 1 GB soft limit. If the repo grows, migrate later.
5. **URL preservation.** Default: **keep `.html` suffix** in URLs (e.g. `/kontakt.html`, not `/kontakt/`). Preserves existing bookmarks and SEO. The only new URL structure is `/en/*` for English pages.
6. **Runtime language toggle.** The existing `js/i18n.js` runtime swap is **deleted**. Language switching now happens via a `<a href="/en/kontakt.html">` link in the nav. Cleaner, no flash of wrong content, SEO-friendly.

---

## File Structure

### New structure after migration

```
website/
├── .eleventy.js                              # Eleventy config
├── package.json                              # Node deps + build scripts
├── package-lock.json
├── .gitignore                                # adds _site/, node_modules/
├── .github/
│   └── workflows/
│       └── deploy.yml                        # build + deploy to gh-pages
├── docs/
│   └── superpowers/
│       └── plans/
│           └── 2026-04-09-eleventy-decap-migration.md
├── src/
│   ├── _data/
│   │   ├── site.yml                          # site-wide metadata
│   │   ├── locales.yml                       # ["de", "en"]
│   │   ├── nav.yml                           # nav link definitions
│   │   └── i18n/
│   │       ├── de.yml                        # all DE strings
│   │       └── en.yml                        # all EN strings
│   ├── _includes/
│   │   └── layouts/
│   │       ├── base.njk                      # html shell (head, nav, footer)
│   │       ├── page.njk                      # standard content page wrapper
│   │       └── article.njk                   # journal article layout
│   ├── _partials/
│   │   ├── nav.njk                           # shared navigation
│   │   ├── footer.njk                        # shared footer
│   │   └── head-meta.njk                     # meta/og/twitter tags
│   ├── css/
│   │   └── styles.css                        # existing stylesheet (moved)
│   ├── assets/                               # existing images + videos (moved)
│   ├── js/
│   │   └── scroll-animations.js              # extracted from inline scripts
│   ├── admin/
│   │   ├── index.html                        # Decap CMS shell
│   │   └── config.yml                        # Decap content model
│   ├── journal/
│   │   ├── de/
│   │   │   ├── bewegungsrevolution.md
│   │   │   └── warum-ci.md
│   │   ├── en/
│   │   │   ├── bewegungsrevolution.md
│   │   │   └── warum-ci.md
│   │   ├── journal.11tydata.js               # collection config
│   │   └── journal-article.njk               # permalink template
│   ├── pages/
│   │   ├── pages.11tydata.js                 # sets layout + pagination
│   │   ├── index.njk
│   │   ├── team.njk
│   │   ├── programm.njk
│   │   ├── journal.njk                       # listing page (not article)
│   │   ├── mitmachen.njk
│   │   ├── kontakt.njk
│   │   ├── montagskurs.njk
│   │   ├── bewegungsrevolution.njk
│   │   ├── impressum.njk
│   │   └── datenschutz.njk
│   ├── brand.html                            # one-off passthrough
│   ├── CNAME                                 # passthrough (wildcare.space)
│   ├── robots.txt                            # passthrough
│   └── sitemap.xml.njk                       # generated
└── _site/                                    # build output (gitignored)
```

### Files removed at the end of migration

```
# Original HTML pages (replaced by templates)
index.html, team.html, programm.html, journal.html, mitmachen.html,
kontakt.html, montagskurs.html, bewegungsrevolution.html,
impressum.html, datenschutz.html

# EN tree (replaced by pagination)
en/index.html, en/team.html, en/programm.html, en/mitmachen.html,
en/kontakt.html, en/brand.html

# Journal article HTML (replaced by Markdown)
journal/bewegungsrevolution.html, journal/warum-ci.html

# Runtime i18n (no longer needed — build-time)
js/i18n.js

# Existing CSS (moved into src/, not deleted from repo until Phase 9)
css/styles.css → src/css/styles.css

# Existing assets (moved into src/)
assets/ → src/assets/
```

### File responsibilities

| File | Purpose |
|---|---|
| `.eleventy.js` | Build config: input/output dirs, passthrough copies, collections, permalink logic |
| `src/_data/site.yml` | Canonical URL, default OG image, copyright year |
| `src/_data/locales.yml` | List of locales the site is built in (`["de", "en"]`) |
| `src/_data/nav.yml` | Nav link keys (actual labels live in `i18n/*.yml`) |
| `src/_data/i18n/de.yml` | All DE-translatable strings, keyed by page/section |
| `src/_data/i18n/en.yml` | Mirror of `de.yml` with English strings |
| `src/_includes/layouts/base.njk` | Full HTML shell: `<head>`, nav include, content slot, footer include |
| `src/_includes/layouts/page.njk` | Extends base, adds page-hero block + body block |
| `src/_includes/layouts/article.njk` | Extends base, adds article-specific hero + prose styles |
| `src/_partials/nav.njk` | Navigation with language-aware hrefs and labels |
| `src/_partials/footer.njk` | Footer with i18n strings |
| `src/_partials/head-meta.njk` | Meta/OG/Twitter tags including language alternates |
| `src/pages/pages.11tydata.js` | Directory data cascade: sets layout default + pagination over locales + permalink function |
| `src/pages/*.njk` | One file per page; renders twice (DE + EN) via pagination |
| `src/journal/journal.11tydata.js` | Makes `.md` files in `journal/de/` and `journal/en/` join `journal_de` / `journal_en` collections |
| `src/journal/journal-article.njk` | Permalink template for journal articles |
| `src/journal/de/*.md` | DE journal posts (frontmatter + markdown body) |
| `src/journal/en/*.md` | EN journal posts |
| `src/admin/index.html` | Decap CMS SPA loader (single `<script>` tag from CDN) |
| `src/admin/config.yml` | Decap content model, collections, fields, auth backend |
| `.github/workflows/deploy.yml` | CI: install, build, publish `_site/` to `gh-pages` branch |

---

## Phase 0: Preparation

### Task 0.1: Create git branch

**Files:** none

- [ ] **Step 1: Verify clean working tree**

Run:
```bash
cd "/Users/fabiogerhold/Sandboxes/Claude/Privat/Fabio Branding & Business 2026/wild-care/website"
git status
```

Expected: `working tree clean` on `main`.

- [ ] **Step 2: Create and switch to migration branch**

Run:
```bash
git checkout -b eleventy-migration
```

Expected: `Switched to a new branch 'eleventy-migration'`

- [ ] **Step 3: Verify Node.js version**

Run:
```bash
node --version
```

Expected: `v22.x.x` or later. If lower, install Node 22 LTS via nvm or homebrew before continuing.

---

## Phase 1: Eleventy Scaffold

### Task 1.1: Initialize package.json

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create `package.json`**

Write file `package.json`:
```json
{
  "name": "wild-care-website",
  "version": "1.0.0",
  "private": true,
  "description": "Wild Care — Verein für soziale Praxis, Graz",
  "scripts": {
    "build": "eleventy",
    "dev": "eleventy --serve --quiet",
    "clean": "rm -rf _site"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install
```

Expected: `added N packages` and a `package-lock.json` file is created. No errors.

- [ ] **Step 3: Verify Eleventy installed**

Run:
```bash
npx @11ty/eleventy --version
```

Expected: `3.x.x` printed to stdout.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add eleventy scaffold"
```

### Task 1.2: Create `.gitignore`

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Check for existing .gitignore**

Run:
```bash
cat .gitignore 2>/dev/null || echo "no .gitignore"
```

If a file exists, append the new entries. If not, create fresh.

- [ ] **Step 2: Write `.gitignore`**

Write file `.gitignore`:
```
# Eleventy build output
_site/

# Node
node_modules/

# macOS
.DS_Store

# Editor
.vscode/
.idea/

# Logs
*.log
npm-debug.log*
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore for eleventy build + node"
```

### Task 1.3: Create minimal `.eleventy.js` config

**Files:**
- Create: `.eleventy.js`

- [ ] **Step 1: Write minimal config**

Write file `.eleventy.js`:
```js
module.exports = function (eleventyConfig) {
    // Passthrough copies — files copied as-is from src/ to _site/
    eleventyConfig.addPassthroughCopy("src/css");
    eleventyConfig.addPassthroughCopy("src/assets");
    eleventyConfig.addPassthroughCopy("src/js");
    eleventyConfig.addPassthroughCopy("src/admin");
    eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
    eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
    eleventyConfig.addPassthroughCopy("src/brand.html");

    return {
        dir: {
            input: "src",
            output: "_site",
            includes: "_includes",
            data: "_data",
        },
        templateFormats: ["njk", "md", "html"],
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
    };
};
```

- [ ] **Step 2: Create `src/` directory and placeholder index**

Run:
```bash
mkdir -p src/_includes src/_data src/_partials src/pages src/journal
```

Write file `src/index.njk`:
```njk
---
permalink: /index.html
---
<!DOCTYPE html>
<html lang="de"><head><title>Wild Care</title></head>
<body><h1>Build works</h1></body></html>
```

- [ ] **Step 3: Run first build**

Run:
```bash
npm run build
```

Expected: Eleventy logs something like `Wrote 1 file in 0.xx seconds`. No errors.

- [ ] **Step 4: Verify output file exists**

Run:
```bash
ls _site/
cat _site/index.html
```

Expected: `index.html` exists and contains `<h1>Build works</h1>`.

- [ ] **Step 5: Commit**

```bash
git add .eleventy.js src/index.njk
git commit -m "chore: add minimal eleventy config with first build"
```

### Task 1.4: Move static assets into `src/`

**Files:**
- Move: `css/` → `src/css/`
- Move: `assets/` → `src/assets/`
- Move: `CNAME` → `src/CNAME`
- Move: `robots.txt` → `src/robots.txt`

- [ ] **Step 1: Copy (don't move yet) `css/` into `src/css/`**

Run:
```bash
cp -R css/* src/css/ 2>/dev/null || mkdir -p src/css && cp -R css/* src/css/
```

Expected: `src/css/styles.css` exists and is identical to the original.

- [ ] **Step 2: Copy `assets/` into `src/assets/`**

Run:
```bash
mkdir -p src/assets && cp -R assets/* src/assets/
```

Expected: `src/assets/images/` directory and video files exist under `src/assets/`.

- [ ] **Step 3: Copy `CNAME` and `robots.txt`**

Run:
```bash
cp CNAME src/CNAME
cp robots.txt src/robots.txt
```

- [ ] **Step 4: Copy `brand.html` into `src/`**

Run:
```bash
cp brand.html src/brand.html
```

- [ ] **Step 5: Build and verify passthroughs work**

Run:
```bash
npm run clean && npm run build
ls _site/css _site/assets _site/CNAME _site/robots.txt _site/brand.html
```

Expected: all files exist in output.

- [ ] **Step 6: Commit (don't delete originals yet)**

```bash
git add src/
git commit -m "chore: copy static assets into src/ for eleventy passthrough"
```

---

## Phase 2: Base Layout & Partials

### Task 2.1: Create `site.yml` global data

**Files:**
- Create: `src/_data/site.yml`

- [ ] **Step 1: Write site metadata**

Write file `src/_data/site.yml`:
```yaml
name: "Wild Care"
tagline: "Verein für soziale Praxis"
url: "https://wildcare.space"
defaultOgImage: "/assets/images/og-default.jpg"
email: "hello@wildcare.space"
instagram: "https://instagram.com/wildcare.space"
copyrightYear: 2026
defaultLocale: "de"
```

- [ ] **Step 2: Verify data loads by printing in a throwaway template**

Temporarily replace `src/index.njk`:
```njk
---
permalink: /index.html
---
<p>Site name: {{ site.name }}</p>
<p>Email: {{ site.email }}</p>
```

Run:
```bash
npm run build && cat _site/index.html
```

Expected: `<p>Site name: Wild Care</p>` and the email visible.

- [ ] **Step 3: Commit**

```bash
git add src/_data/site.yml src/index.njk
git commit -m "feat: add site.yml global data"
```

### Task 2.2: Create `locales.yml`

**Files:**
- Create: `src/_data/locales.yml`

- [ ] **Step 1: Write locales**

Write file `src/_data/locales.yml`:
```yaml
- de
- en
```

- [ ] **Step 2: Commit**

```bash
git add src/_data/locales.yml
git commit -m "feat: add locales data"
```

### Task 2.3: Create `nav.yml`

**Files:**
- Create: `src/_data/nav.yml`

- [ ] **Step 1: Write nav structure**

Write file `src/_data/nav.yml`:
```yaml
# Nav items. Labels are resolved from i18n.<locale>.nav.<key>.
# Each item has a `slug` used for permalink lookup.
# `cta: true` marks the highlight button in the nav.
items:
  - key: home
    slug: index
  - key: about
    slug: team
  - key: programme
    slug: programm
  - key: journal
    slug: journal
  - key: join
    slug: mitmachen
  - key: contact
    slug: kontakt
    cta: true
```

- [ ] **Step 2: Commit**

```bash
git add src/_data/nav.yml
git commit -m "feat: add nav.yml structure"
```

### Task 2.4: Create skeleton `i18n/de.yml` and `i18n/en.yml`

**Files:**
- Create: `src/_data/i18n/de.yml`
- Create: `src/_data/i18n/en.yml`

- [ ] **Step 1: Write minimal DE strings**

Write file `src/_data/i18n/de.yml`:
```yaml
nav:
  home: "Startseite"
  about: "Über uns"
  programme: "Programm"
  journal: "Journal"
  join: "Mitmachen"
  contact: "Komm vorbei"
  toggleMenu: "Menü"
footer:
  pagesHeading: "Seiten"
  connectHeading: "Verbinden"
  tagline: "Verein für Kontaktimprovisation und soziale Praxis. Wir üben das Zusammenleben — jeden Montag in Graz."
  legalImpressum: "Impressum"
  legalDatenschutz: "Datenschutz"
  builtWith: "Mit Fürsorge gebaut"
  copyright: "© {{ site.copyrightYear }} Wild Care — Graz"
```

- [ ] **Step 2: Write minimal EN strings**

Write file `src/_data/i18n/en.yml`:
```yaml
nav:
  home: "Home"
  about: "About Us"
  programme: "Programme"
  journal: "Journal"
  join: "Get Involved"
  contact: "Come Along"
  toggleMenu: "Menu"
footer:
  pagesHeading: "Pages"
  connectHeading: "Connect"
  tagline: "Association for Contact Improvisation and social practice. We practise togetherness — every Monday in Graz."
  legalImpressum: "Imprint"
  legalDatenschutz: "Privacy"
  builtWith: "Built with care"
  copyright: "© {{ site.copyrightYear }} Wild Care — Graz"
```

- [ ] **Step 3: Verify data loads**

Temporarily replace `src/index.njk`:
```njk
---
permalink: /index.html
---
<p>DE nav home: {{ i18n.de.nav.home }}</p>
<p>EN nav home: {{ i18n.en.nav.home }}</p>
```

Run:
```bash
npm run build && cat _site/index.html
```

Expected: `<p>DE nav home: Startseite</p>` and `<p>EN nav home: Home</p>`.

- [ ] **Step 4: Commit**

```bash
git add src/_data/i18n/
git commit -m "feat: add skeleton i18n data files"
```

### Task 2.5: Create `head-meta.njk` partial

**Files:**
- Create: `src/_partials/head-meta.njk`

- [ ] **Step 1: Write the partial**

Write file `src/_partials/head-meta.njk`:
```njk
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ title }}{% if title %} — {% endif %}{{ site.name }}</title>
<meta name="description" content="{{ description }}">
<meta property="og:type" content="{{ ogType or 'website' }}">
<meta property="og:url" content="{{ site.url }}{{ page.url }}">
<meta property="og:title" content="{{ title }} — {{ site.name }}">
<meta property="og:description" content="{{ description }}">
<meta property="og:image" content="{{ site.url }}{{ ogImage or site.defaultOgImage }}">
<meta property="og:locale" content="{% if locale == 'de' %}de_AT{% else %}en_US{% endif %}">
{% if locale == 'de' %}
<meta property="og:locale:alternate" content="en_US">
{% else %}
<meta property="og:locale:alternate" content="de_AT">
{% endif %}
<meta name="twitter:card" content="summary_large_image">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,700;1,9..144,300;1,9..144,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">

<link rel="stylesheet" href="/css/styles.css">
```

- [ ] **Step 2: Commit**

```bash
git add src/_partials/head-meta.njk
git commit -m "feat: add head-meta partial"
```

### Task 2.6: Create `nav.njk` partial

**Files:**
- Create: `src/_partials/nav.njk`

- [ ] **Step 1: Write the nav**

Write file `src/_partials/nav.njk`:
```njk
{# Resolve permalink for the current locale and a given slug. #}
{%- macro localeUrl(slug, targetLocale) -%}
{%- if targetLocale == 'de' -%}
{%- if slug == 'index' -%}/{%- else -%}/{{ slug }}.html{%- endif -%}
{%- else -%}
{%- if slug == 'index' -%}/en/{%- else -%}/en/{{ slug }}.html{%- endif -%}
{%- endif -%}
{%- endmacro -%}

<nav>
    <div class="container nav-inner">
        <a href="{{ localeUrl('index', locale) }}" class="nav-logo">
            Wild Care
            <span class="breadcrumb">Graz</span>
        </a>
        <div class="nav-links">
            {%- for item in nav.items -%}
                {%- if item.key != 'home' -%}
                    <a href="{{ localeUrl(item.slug, locale) }}"
                       {% if item.cta %}class="nav-cta"{% elif page.url == localeUrl(item.slug, locale) %}class="active"{% endif %}>
                        {{ i18n[locale].nav[item.key] }}
                    </a>
                {%- endif -%}
            {%- endfor -%}

            <div class="lang-toggle">
                <a class="lang-toggle-btn {% if locale == 'de' %}active{% endif %}"
                   href="{{ localeUrl(pageSlug or 'index', 'de') }}"
                   data-lang="de">DE</a>
                <a class="lang-toggle-btn {% if locale == 'en' %}active{% endif %}"
                   href="{{ localeUrl(pageSlug or 'index', 'en') }}"
                   data-lang="en">EN</a>
            </div>
        </div>
        <button class="nav-toggle" aria-label="{{ i18n[locale].nav.toggleMenu }}">
            <span></span>
            <span></span>
            <span></span>
        </button>
    </div>
</nav>
```

- [ ] **Step 2: Commit**

```bash
git add src/_partials/nav.njk
git commit -m "feat: add nav partial with locale-aware urls"
```

### Task 2.7: Create `footer.njk` partial

**Files:**
- Create: `src/_partials/footer.njk`

- [ ] **Step 1: Write the footer**

Write file `src/_partials/footer.njk`:
```njk
{%- macro localeUrl(slug, targetLocale) -%}
{%- if targetLocale == 'de' -%}
{%- if slug == 'index' -%}/{%- else -%}/{{ slug }}.html{%- endif -%}
{%- else -%}
{%- if slug == 'index' -%}/en/{%- else -%}/en/{{ slug }}.html{%- endif -%}
{%- endif -%}
{%- endmacro -%}

<footer class="page-footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-brand">
                <h4>Wild Care</h4>
                <p>{{ i18n[locale].footer.tagline }}</p>
            </div>
            <div class="footer-links">
                <h4>{{ i18n[locale].footer.pagesHeading }}</h4>
                {%- for item in nav.items -%}
                    <a href="{{ localeUrl(item.slug, locale) }}">{{ i18n[locale].nav[item.key] }}</a>
                {%- endfor -%}
            </div>
            <div class="footer-links">
                <h4>{{ i18n[locale].footer.connectHeading }}</h4>
                <a href="{{ site.instagram }}" target="_blank" rel="noopener">Instagram</a>
                <a href="mailto:{{ site.email }}">{{ site.email }}</a>
                <a href="/impressum.html">{{ i18n[locale].footer.legalImpressum }}</a>
                <a href="/datenschutz.html">{{ i18n[locale].footer.legalDatenschutz }}</a>
            </div>
        </div>
        <div class="footer-bottom">
            <span>{{ i18n[locale].footer.copyright | replace("{{ site.copyrightYear }}", site.copyrightYear) }}</span>
            <span>{{ i18n[locale].footer.builtWith }}</span>
        </div>
    </div>
</footer>
```

- [ ] **Step 2: Commit**

```bash
git add src/_partials/footer.njk
git commit -m "feat: add footer partial"
```

### Task 2.8: Create `base.njk` layout

**Files:**
- Create: `src/_includes/layouts/base.njk`

- [ ] **Step 1: Write base layout**

Write file `src/_includes/layouts/base.njk`:
```njk
<!DOCTYPE html>
<html lang="{{ locale }}">
<head>
{% include "../../_partials/head-meta.njk" %}
</head>
<body{% if bodyClass %} class="{{ bodyClass }}"{% endif %}>

{% include "../../_partials/nav.njk" %}

{{ content | safe }}

{% include "../../_partials/footer.njk" %}

<script src="/js/scroll-animations.js"></script>
{% block scripts %}{% endblock %}

</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/_includes/layouts/base.njk
git commit -m "feat: add base layout"
```

### Task 2.9: Create scroll animations JS

**Files:**
- Create: `src/js/scroll-animations.js`

- [ ] **Step 1: Extract the scroll animation JS (was duplicated inline across pages)**

Write file `src/js/scroll-animations.js`:
```js
// Wild Care — Scroll animations + mobile nav
// This script was previously inlined in every page. Now shared.

(function () {
    // Fade-up animations
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.fade-up').forEach(function (el) {
        observer.observe(el);
    });

    // Mobile nav toggle
    var navToggle = document.querySelector('.nav-toggle');
    var navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function () {
            navLinks.classList.toggle('open');
        });
    }

    // Transparent nav scroll behaviour (only active on pages with .has-hero-video)
    if (document.body.classList.contains('has-hero-video')) {
        var nav = document.querySelector('nav');
        function updateNavState() {
            if (window.scrollY > 80) {
                nav.classList.add('nav-scrolled');
            } else {
                nav.classList.remove('nav-scrolled');
            }
        }
        updateNavState();
        window.addEventListener('scroll', updateNavState, { passive: true });
    }
})();
```

- [ ] **Step 2: Commit**

```bash
git add src/js/scroll-animations.js
git commit -m "feat: extract scroll animations + mobile nav to shared js"
```

---

## Phase 3: i18n System + Pagination

### Task 3.1: Create `pages/pages.11tydata.js`

**Files:**
- Create: `src/pages/pages.11tydata.js`

- [ ] **Step 1: Write directory data cascade**

Write file `src/pages/pages.11tydata.js`:
```js
// Directory data cascade — applied to every .njk in src/pages/.
// Generates TWO outputs per template: one per locale.

module.exports = {
    layout: "layouts/page.njk",
    pagination: {
        data: "locales",
        size: 1,
        alias: "locale",
    },
    eleventyComputed: {
        permalink: (data) => {
            const slug = data.pageSlug;
            const locale = data.locale;
            if (!slug) return false; // skip if no slug set
            if (slug === "index") {
                return locale === "de" ? "/index.html" : "/en/index.html";
            }
            return locale === "de"
                ? `/${slug}.html`
                : `/en/${slug}.html`;
        },
    },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/pages.11tydata.js
git commit -m "feat: add pages data cascade with locale pagination"
```

### Task 3.2: Create `page.njk` layout

**Files:**
- Create: `src/_includes/layouts/page.njk`

- [ ] **Step 1: Write page layout**

Write file `src/_includes/layouts/page.njk`:
```njk
---
layout: layouts/base.njk
---
{{ content | safe }}
```

This is a thin wrapper for now. Later tasks may add per-page hero blocks.

- [ ] **Step 2: Commit**

```bash
git add src/_includes/layouts/page.njk
git commit -m "feat: add thin page layout extending base"
```

### Task 3.3: Create throwaway test page to verify pagination

**Files:**
- Create: `src/pages/_test.njk` (will be deleted)

- [ ] **Step 1: Write test page**

Write file `src/pages/_test.njk`:
```njk
---
pageSlug: "_test"
title: "Test"
description: "Eleventy pagination test"
---
<section>
  <div class="container">
    <h1>Locale: {{ locale }}</h1>
    <p>Nav home: {{ i18n[locale].nav.home }}</p>
    <p>Footer tagline: {{ i18n[locale].footer.tagline }}</p>
  </div>
</section>
```

- [ ] **Step 2: Build and verify both outputs exist**

Run:
```bash
npm run build
ls _site/_test.html _site/en/_test.html
```

Expected: both files exist.

- [ ] **Step 3: Verify DE output contains German strings**

Run:
```bash
grep "Startseite" _site/_test.html
grep "Verein für Kontaktimprovisation" _site/_test.html
```

Expected: both greps match.

- [ ] **Step 4: Verify EN output contains English strings**

Run:
```bash
grep "Home" _site/en/_test.html
grep "Association for Contact Improvisation" _site/en/_test.html
```

Expected: both greps match.

- [ ] **Step 5: Delete test page**

Run:
```bash
rm src/pages/_test.njk
```

- [ ] **Step 6: Delete throwaway `src/index.njk` (will be replaced in Task 6.1)**

Run:
```bash
rm src/index.njk
```

- [ ] **Step 7: Rebuild to confirm nothing is broken**

Run:
```bash
npm run clean && npm run build
```

Expected: build succeeds. `_site/` is empty except for passthroughs (css, assets, js, admin, CNAME, robots.txt, brand.html).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: verify locale pagination generates de/en outputs"
```

---

## Phase 4: Legal Pages (Proof of Pattern)

### Task 4.1: Migrate `impressum.njk`

**Files:**
- Create: `src/pages/impressum.njk`

- [ ] **Step 1: Extend i18n files with impressum strings**

Append to `src/_data/i18n/de.yml`:
```yaml
impressum:
  meta:
    title: "Impressum"
    description: "Impressum von Wild Care — Verein für Kontaktimprovisation und soziale Praxis in Graz. Rechtliche Informationen gemäß österreichischem Recht."
  eyebrow: "Rechtliches"
  heading: "Impressum"
  notice: "Informationspflicht laut §5 E-Commerce Gesetz, §14 Unternehmensgesetzbuch, §63 Gewerbeordnung und Offenlegungspflicht laut §25 Mediengesetz."
  orgName: "Wild Care — Wilde Fürsorge"
  orgType: "Verein für Kontaktimprovisation und soziale Praxis"
  orgAddress: |
    Fabio Maria Gerhold
    Froschaugasse 7
    8010 Graz
    Österreich
  contactHeading: "Kontakt"
  contactEmail: "E-Mail"
  contactWebsite: "Website"
  euHeading: "EU-Streitschlichtung"
  euText: |
    Verbraucher haben die Möglichkeit, Beschwerden an die Online-Streitbeilegungsplattform der EU zu richten:
    <a href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&amp;lng=DE" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr</a>.
    Sie können allfällige Beschwerden auch an die oben angegebene Kontaktmöglichkeit richten.
  contentLiabilityHeading: "Haftung für Inhalte dieser Website"
  contentLiabilityText: "Wir entwickeln die Inhalte dieser Website ständig weiter und bemühen uns korrekte und aktuelle Informationen bereitzustellen. Leider können wir keine Haftung für die Korrektheit aller Inhalte auf dieser Website übernehmen, speziell für jene, die seitens Dritter bereitgestellt wurden."
  linkLiabilityHeading: "Haftung für Links auf dieser Website"
  linkLiabilityText: "Unsere Website enthält Links zu anderen Websites für deren Inhalt wir nicht verantwortlich sind. Haftung für verlinkte Websites besteht laut § 17 ECG für uns nicht."
```

Append to `src/_data/i18n/en.yml`:
```yaml
impressum:
  meta:
    title: "Imprint"
    description: "Imprint of Wild Care — Association for Contact Improvisation and social practice in Graz. Legal information under Austrian law."
  eyebrow: "Legal"
  heading: "Imprint"
  notice: "Information obligation under §5 E-Commerce Act, §14 Austrian Commercial Code, §63 Trade Act and disclosure obligation under §25 Media Act."
  orgName: "Wild Care — Wilde Fürsorge"
  orgType: "Association for Contact Improvisation and social practice"
  orgAddress: |
    Fabio Maria Gerhold
    Froschaugasse 7
    8010 Graz
    Austria
  contactHeading: "Contact"
  contactEmail: "Email"
  contactWebsite: "Website"
  euHeading: "EU Online Dispute Resolution"
  euText: |
    Consumers may submit complaints to the EU Online Dispute Resolution platform:
    <a href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&amp;lng=EN" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr</a>.
    You may also address any complaints to the contact information above.
  contentLiabilityHeading: "Liability for content of this website"
  contentLiabilityText: "We continually develop the contents of this website and strive to provide accurate and up-to-date information. Unfortunately, we cannot assume liability for the correctness of all content on this website, especially for that provided by third parties."
  linkLiabilityHeading: "Liability for links on this website"
  linkLiabilityText: "Our website contains links to other websites for whose content we are not responsible. Under § 17 ECG, we are not liable for linked websites."
```

- [ ] **Step 2: Write the template**

Write file `src/pages/impressum.njk`:
```njk
---
pageSlug: "impressum"
eleventyComputed:
  title: "{{ i18n[locale].impressum.meta.title }}"
  description: "{{ i18n[locale].impressum.meta.description }}"
---
<header class="page-hero">
    <div class="container">
        <p class="label fade-up">{{ i18n[locale].impressum.eyebrow }}</p>
        <h1 class="fade-up delay-1">{{ i18n[locale].impressum.heading }}</h1>
    </div>
</header>

<section>
    <div class="container">
        <div class="legal-prose fade-up delay-2">
            <p>{{ i18n[locale].impressum.notice }}</p>

            <h3>{{ i18n[locale].impressum.orgName }}</h3>
            <p>{{ i18n[locale].impressum.orgType }}</p>
            <p>{{ i18n[locale].impressum.orgAddress | replace("\n", "<br>") | safe }}</p>

            <h3>{{ i18n[locale].impressum.contactHeading }}</h3>
            <p>
                {{ i18n[locale].impressum.contactEmail }}: <a href="mailto:{{ site.email }}">{{ site.email }}</a><br>
                {{ i18n[locale].impressum.contactWebsite }}: <a href="{{ site.url }}">wildcare.space</a>
            </p>

            <h3>{{ i18n[locale].impressum.euHeading }}</h3>
            <p>{{ i18n[locale].impressum.euText | safe }}</p>

            <h3>{{ i18n[locale].impressum.contentLiabilityHeading }}</h3>
            <p>{{ i18n[locale].impressum.contentLiabilityText }}</p>

            <h3>{{ i18n[locale].impressum.linkLiabilityHeading }}</h3>
            <p>{{ i18n[locale].impressum.linkLiabilityText }}</p>
        </div>
    </div>
</section>
```

- [ ] **Step 3: Build and verify**

Run:
```bash
npm run clean && npm run build
ls _site/impressum.html _site/en/impressum.html
grep "Fabio Maria Gerhold" _site/impressum.html
grep "Fabio Maria Gerhold" _site/en/impressum.html
```

Expected: both files exist, both grep matches.

- [ ] **Step 4: Visual check (optional but recommended)**

Run:
```bash
npm run dev
```

Open `http://localhost:8080/impressum.html` and `http://localhost:8080/en/impressum.html` in a browser. Verify both render with correct styles and nav. Stop the server (Ctrl+C) when done.

- [ ] **Step 5: Commit**

```bash
git add src/pages/impressum.njk src/_data/i18n/
git commit -m "feat: migrate impressum to eleventy template"
```

### Task 4.2: Migrate `datenschutz.njk`

**Files:**
- Create: `src/pages/datenschutz.njk`

- [ ] **Step 1: Extend i18n files**

Append to `src/_data/i18n/de.yml` — the complete datenschutz content. Copy the German text from `datenschutz.html` lines 113-147 verbatim, organized under `datenschutz:` with keys for each section (`section1Heading`, `section1Text`, etc.).

- [ ] **Step 2: Extend `en.yml`**

Follow the same pattern, using the translated EN text if the user provided one in the original `en/` pages, or mark a TODO for the user to translate.

- [ ] **Step 3: Write template**

Write file `src/pages/datenschutz.njk` following the same pattern as `impressum.njk`. Use the numbered heading structure (h2 for top-level sections, h3 for subsections).

- [ ] **Step 4: Build and verify**

Run:
```bash
npm run clean && npm run build
ls _site/datenschutz.html _site/en/datenschutz.html
```

Expected: both exist.

- [ ] **Step 5: Commit**

```bash
git add src/pages/datenschutz.njk src/_data/i18n/
git commit -m "feat: migrate datenschutz to eleventy template"
```

---

## Phase 5: Content Pages

Each page follows the same pattern as Task 4.1:

1. Extend `i18n/de.yml` and `i18n/en.yml` with all the strings the page needs.
2. Create `src/pages/<name>.njk` with `pageSlug`, `eleventyComputed.title/description`, and the page body using `{{ i18n[locale].<name>.<key> }}` everywhere text appears.
3. Build and verify both `_site/<name>.html` and `_site/en/<name>.html` exist and render correctly.
4. Commit.

### Task 5.1: `team.njk`

**Files:**
- Modify: `src/_data/i18n/de.yml`, `src/_data/i18n/en.yml`
- Create: `src/pages/team.njk`

- [ ] **Step 1: Read existing `team.html` to extract all German text and structure**

Run:
```bash
cat team.html | head -200
```

Identify every user-visible string: eyebrow, title, manifest excerpt, team member names/roles/bios, philosophy section text, pillar cards, quote band.

- [ ] **Step 2: Extend `i18n/de.yml` under `team:` key**

Use a nested structure like:
```yaml
team:
  meta:
    title: "..."
    description: "..."
  eyebrow: "..."
  title: "..."
  manifest: "..."
  members:
    - name: "Verena Eidenberger"
      role: "..."
      bio: "..."
    - name: "Fabio Maria Gerhold"
      role: "..."
      bio: "..."
  philosophy:
    title: "..."
    intro: "..."
    pillars:
      - title: "..."
        body: "..."
      # ... etc
  quoteBand: "..."
```

- [ ] **Step 3: Extend `i18n/en.yml` mirroring the same structure**

Copy EN text from `en/team.html`.

- [ ] **Step 4: Write template**

Write file `src/pages/team.njk`. Use the same markup as `team.html` but replace all text with `{{ i18n[locale].team.* }}`. Use `{% for member in i18n[locale].team.members %}` loops for members and pillars.

- [ ] **Step 5: Build and spot-check both outputs**

Run:
```bash
npm run clean && npm run build
grep "Verena" _site/team.html _site/en/team.html
```

Expected: match in both.

- [ ] **Step 6: Commit**

```bash
git add src/pages/team.njk src/_data/i18n/
git commit -m "feat: migrate team page to eleventy template"
```

### Task 5.2: `kontakt.njk`

**Files:**
- Modify: `src/_data/i18n/de.yml`, `src/_data/i18n/en.yml`
- Create: `src/pages/kontakt.njk`

- [ ] **Step 1: Extend i18n**

Add `kontakt:` section covering: eyebrow, title, intro, form labels (name, email, message, submit button), form privacy note, contact info items (email, location, next session), highlight quote, map caption.

- [ ] **Step 2: Write template**

Write file `src/pages/kontakt.njk`. Include the Formspree form action and the Google Maps iframe. SVG icons inline.

- [ ] **Step 3: Build + verify**

Run:
```bash
npm run clean && npm run build
grep "formspree" _site/kontakt.html
grep "formspree" _site/en/kontakt.html
```

Expected: both match.

- [ ] **Step 4: Commit**

```bash
git add src/pages/kontakt.njk src/_data/i18n/
git commit -m "feat: migrate kontakt page to eleventy template"
```

### Task 5.3: `mitmachen.njk`

**Files:**
- Modify: `src/_data/i18n/de.yml`, `src/_data/i18n/en.yml`
- Create: `src/pages/mitmachen.njk`

- [ ] **Step 1: Extend i18n**

Add `mitmachen:` section covering: eyebrow, title, core message, two circles (outer + inner labels, titles, descriptions, detail cards, tag rows), Mitgliedschaft intro, beitrag tiers (name, amount, desc for each), beitrag note, CTA section.

- [ ] **Step 2: Write template**

Write file `src/pages/mitmachen.njk`. Use `{% for %}` loops for the beitrag cards. The two circles have distinct data — inline them.

- [ ] **Step 3: Build + verify**

Run:
```bash
npm run clean && npm run build
ls _site/mitmachen.html _site/en/mitmachen.html
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/mitmachen.njk src/_data/i18n/
git commit -m "feat: migrate mitmachen page to eleventy template"
```

### Task 5.4: `programm.njk`

**Files:**
- Modify: `src/_data/i18n/de.yml`, `src/_data/i18n/en.yml`
- Create: `src/pages/programm.njk`

- [ ] **Step 1: Extend i18n**

Add `programm:` section covering: eyebrow, title, info card (title, location, time, donation, CTA), montagskurs description (h2, body, quote), projekt card (tags, subtitle, body, details), ausblick preview cards.

- [ ] **Step 2: Write template**

Write file `src/pages/programm.njk`. Include the Tally widget script. The projekt card and preview cards have distinct content — inline.

- [ ] **Step 3: Build + verify**

Run:
```bash
npm run clean && npm run build
grep "tally" _site/programm.html
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/programm.njk src/_data/i18n/
git commit -m "feat: migrate programm page to eleventy template"
```

### Task 5.5: `journal.njk` (listing page only — articles come in Phase 8)

**Files:**
- Modify: `src/_data/i18n/de.yml`, `src/_data/i18n/en.yml`
- Create: `src/pages/journal.njk`

- [ ] **Step 1: Extend i18n**

Add `journal:` section with: eyebrow, title, intro, readMore, comingSoon labels.

- [ ] **Step 2: Write template using placeholder loop**

Write file `src/pages/journal.njk`:
```njk
---
pageSlug: "journal"
eleventyComputed:
  title: "{{ i18n[locale].journal.meta.title }}"
  description: "{{ i18n[locale].journal.meta.description }}"
---
<header class="page-hero">
    <div class="container">
        <p class="label fade-up">{{ i18n[locale].journal.eyebrow }}</p>
        <h1 class="fade-up delay-1">{{ i18n[locale].journal.title }}</h1>
        <p class="fade-up delay-2">{{ i18n[locale].journal.intro }}</p>
    </div>
</header>

<section>
    <div class="container">
        <div class="journal-listing-grid">
            {%- set posts = collections['journal_' + locale] | reverse -%}
            {%- for post in posts -%}
                <a href="{{ post.url }}" class="journal-card fade-up">
                    <div class="journal-card-image">
                        {% if post.data.image %}
                            <img src="{{ post.data.image }}" alt="{{ post.data.title }}">
                        {% endif %}
                    </div>
                    <div class="journal-card-body">
                        <p class="journal-card-date">{{ post.data.date | dateDisplay(locale) }}</p>
                        <h3>{{ post.data.title }}</h3>
                        <p>{{ post.data.excerpt }}</p>
                        <span class="journal-card-link">{{ i18n[locale].journal.readMore }} →</span>
                    </div>
                </a>
            {%- endfor -%}
        </div>
    </div>
</section>
```

Note: `collections.journal_de` / `collections.journal_en` and the `dateDisplay` filter will be defined in Task 8.1.

- [ ] **Step 3: Build (expect empty listing for now, that's OK)**

Run:
```bash
npm run clean && npm run build
```

Expected: `_site/journal.html` and `_site/en/journal.html` exist. Listing will be empty until Phase 8 adds the collection.

- [ ] **Step 4: Commit**

```bash
git add src/pages/journal.njk src/_data/i18n/
git commit -m "feat: add journal listing page (collection wiring in phase 8)"
```

---

## Phase 6: Index (Home) Page

### Task 6.1: Migrate `index.njk`

**Files:**
- Modify: `src/_data/i18n/de.yml`, `src/_data/i18n/en.yml`
- Create: `src/pages/index.njk`

- [ ] **Step 1: Extend i18n**

Add `home:` section covering all home-page strings: hero video heading + subtitle + CTAs, event banner (tag + date + time + location + action), values grid (4 value cards with title + body each), invitation section, journal preview heading, journal preview link, CTA section at bottom.

- [ ] **Step 2: Write template**

Write file `src/pages/index.njk`. This is the largest template. Key points:
- Set `bodyClass: "has-hero-video"` in frontmatter (front-of-body class that scopes the transparent-nav CSS).
- Hero uses `.hero-video` + `.hero-video-content` classes from `styles.css`.
- Include the `<video>` tag with `src="/assets/video-hero.mp4"`.
- Event banner uses `.event-banner` classes.
- Values grid uses `.values-grid` + `.value-card`.
- Invitation section uses `.invitation` classes.
- Journal preview pulls the latest 3 posts from `collections['journal_' + locale] | reverse | head(3)`.
  - Each preview card uses `class="journal-card compact fade-up"` (the compact modifier from styles.css).
- CTA section uses `.cta-section`.

- [ ] **Step 3: Define `head` filter**

Edit `.eleventy.js` — add inside the `module.exports` function, before `return`:
```js
eleventyConfig.addFilter("head", function (array, n) {
    if (!Array.isArray(array)) return [];
    if (n < 0) return array.slice(n);
    return array.slice(0, n);
});
```

- [ ] **Step 4: Build + verify**

Run:
```bash
npm run clean && npm run build
grep "has-hero-video" _site/index.html
grep "hero-video-content" _site/index.html
```

Expected: both match.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.njk src/_data/i18n/ .eleventy.js
git commit -m "feat: migrate home page with video hero"
```

---

## Phase 7: Detail Landing Pages

These reuse the `.detail-*` shared component set already in `styles.css`.

### Task 7.1: Migrate `montagskurs.njk`

**Files:**
- Modify: `src/_data/i18n/de.yml`, `src/_data/i18n/en.yml`
- Create: `src/pages/montagskurs.njk`

- [ ] **Step 1: Extend i18n under `montagskurs:` key**

Add: eyebrow, title, subtitle, hero details (time, location, price, registration note), hero CTA label, hero note, about section title + body paragraphs, learn cards (6 items with title + body each), donation note, testimonials (2 items with quote + author each), team intro, team members (2 with name + role + bio each), FAQ items (5 with question + answer each).

- [ ] **Step 2: Write template**

Write file `src/pages/montagskurs.njk`. Structure:
- `<header class="detail-hero">` with `.detail-hero-grid`
- Left column: `.detail-hero-content` with eyebrow, h1, subtitle, details, CTA, note
- Right column: `.detail-photo` containing `<img src="/assets/images/warum-ci.jpg">`
- About section: `class="detail-about"` with `.detail-about-grid`, left text, right `.detail-video-wrapper` containing the CI video
- Learn section: `.detail-card-grid` with `{% for card in i18n[locale].montagskurs.learn %}`
- Donation note
- Testimonials: `.detail-testimonials` + `.detail-testimonial-grid` + loop
- Team: `.detail-team-grid` + loop
- FAQ: `.detail-faq-list` + loop
- CTA section

- [ ] **Step 3: Build + verify**

Run:
```bash
npm run clean && npm run build
grep "detail-hero" _site/montagskurs.html
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/montagskurs.njk src/_data/i18n/
git commit -m "feat: migrate montagskurs detail page"
```

### Task 7.2: Migrate `bewegungsrevolution.njk`

**Files:**
- Modify: `src/_data/i18n/de.yml`, `src/_data/i18n/en.yml`
- Create: `src/pages/bewegungsrevolution.njk`

- [ ] **Step 1: Extend i18n under `bewegungsrevolution:` key**

Add: badge label (e.g. "6-Wochen-Kurs"), eyebrow, title (with highlighted span), subtitle, hero details, CTA, note, 6 week cards (week label + topic title + body), quote (italic big text), testimonials, team members (2), FAQ.

- [ ] **Step 2: Write template**

Write file `src/pages/bewegungsrevolution.njk`. Structure:
- `<header class="detail-hero">` with `.detail-hero-grid`
- Left column: `.detail-hero-content accent-terracotta` (the modifier that switches h1 span color to terracotta). Includes `.detail-badge` span on top of h1.
- Right column: `.detail-video-wrapper` containing the CI intro video
- Schedule section: `.detail-card-grid` with 6 `.detail-card`. The 6th has `.detail-card.highlighted` modifier for the current week. Each card contains `.detail-card-number` for the week label.
- Quote section: `.detail-quote-section` with a big italic quote
- Testimonials, team, FAQ (same pattern as montagskurs)
- CTA section

- [ ] **Step 3: Build + verify**

Run:
```bash
npm run clean && npm run build
grep "detail-card highlighted" _site/bewegungsrevolution.html
grep "accent-terracotta" _site/bewegungsrevolution.html
```

Expected: both match.

- [ ] **Step 4: Commit**

```bash
git add src/pages/bewegungsrevolution.njk src/_data/i18n/
git commit -m "feat: migrate bewegungsrevolution detail page"
```

---

## Phase 8: Journal Collection

### Task 8.1: Define journal collections in `.eleventy.js`

**Files:**
- Modify: `.eleventy.js`

- [ ] **Step 1: Add collection definitions + date filter**

Edit `.eleventy.js`. Inside `module.exports = function (eleventyConfig) { ... }`, before `return { ... }`, add:

```js
// Collections — one per locale
eleventyConfig.addCollection("journal_de", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/journal/de/*.md");
});
eleventyConfig.addCollection("journal_en", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/journal/en/*.md");
});

// Date display filter — formats a JS Date as "Month YYYY"
const MONTHS_DE = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const MONTHS_EN = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
eleventyConfig.addFilter("dateDisplay", function (date, locale) {
    if (!(date instanceof Date)) date = new Date(date);
    const months = locale === "en" ? MONTHS_EN : MONTHS_DE;
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
});
```

- [ ] **Step 2: Verify current config parses**

Run:
```bash
npm run build
```

Expected: no errors. `journal_de` and `journal_en` collections exist but are empty.

- [ ] **Step 3: Commit**

```bash
git add .eleventy.js
git commit -m "feat: register journal_de/journal_en collections + dateDisplay filter"
```

### Task 8.2: Create `journal.11tydata.js` directory data

**Files:**
- Create: `src/journal/journal.11tydata.js`

- [ ] **Step 1: Write directory data**

Write file `src/journal/journal.11tydata.js`:
```js
module.exports = {
    layout: "layouts/article.njk",
    eleventyComputed: {
        permalink: (data) => {
            // data.page.filePathStem is like "/journal/de/warum-ci"
            const parts = data.page.filePathStem.split("/");
            const locale = parts[parts.length - 2]; // "de" or "en"
            const slug = parts[parts.length - 1];
            return locale === "de"
                ? `/journal/${slug}.html`
                : `/en/journal/${slug}.html`;
        },
    },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/journal/journal.11tydata.js
git commit -m "feat: add journal directory data with locale-aware permalinks"
```

### Task 8.3: Create `article.njk` layout

**Files:**
- Create: `src/_includes/layouts/article.njk`

- [ ] **Step 1: Extract article-specific CSS from `journal/warum-ci.html` into `src/css/styles.css`**

Read the inline `<style>` block from `journal/warum-ci.html` (lines 22-234 approximately). Identify classes: `.article-hero`, `.article-hero img`, `.article-hero-overlay`, `.article-back`, `.article-content`, `.article-meta`, `.article-body`, `.article-body h2`, `.article-body p`, `.article-body blockquote`, `.article-body ul`, `.article-body a`, `.article-footer`, plus any responsive rules.

Append a new section to `src/css/styles.css` after `PAGE: INDEX`:
```css
/* ============================================
   PAGE: JOURNAL ARTICLE
   ============================================ */

/* ... paste exact rules from journal/warum-ci.html <style> block ... */
```

- [ ] **Step 2: Write the article layout**

Write file `src/_includes/layouts/article.njk`:
```njk
---
layout: layouts/base.njk
---
<article>
    <header class="article-hero">
        {% if image %}
            <img src="{{ image }}" alt="{{ title }}">
        {% endif %}
        <div class="article-hero-overlay"></div>
    </header>

    <div class="article-back container">
        <a href="/{{ locale == 'en' and 'en/' or '' }}journal.html">← {{ i18n[locale].journal.backToJournal }}</a>
    </div>

    <section class="article-content">
        <div class="container">
            <div class="article-meta fade-up">
                <p class="label">{{ date | dateDisplay(locale) }}</p>
            </div>
            <h1 class="fade-up delay-1">{{ title }}</h1>
            <div class="article-body fade-up delay-2">
                {{ content | safe }}
            </div>
        </div>
    </section>
</article>
```

- [ ] **Step 3: Add `backToJournal` to i18n**

Append to `src/_data/i18n/de.yml` under `journal:`:
```yaml
  backToJournal: "Zurück zum Journal"
```

Append to `src/_data/i18n/en.yml` under `journal:`:
```yaml
  backToJournal: "Back to Journal"
```

- [ ] **Step 4: Commit**

```bash
git add src/_includes/layouts/article.njk src/css/styles.css src/_data/i18n/
git commit -m "feat: add article layout with prose styles"
```

### Task 8.4: Port `warum-ci.html` to Markdown

**Files:**
- Create: `src/journal/de/warum-ci.md`
- Create: `src/journal/en/warum-ci.md`

- [ ] **Step 1: Inspect original article structure**

Read `journal/warum-ci.html` to find: title, date, hero image, body prose (probably inside `<div class="article-body">` or similar).

- [ ] **Step 2: Write DE markdown**

Write file `src/journal/de/warum-ci.md`:
```markdown
---
title: "Warum Contact Improvisation?"
slug: warum-ci
locale: de
date: 2026-03-15
image: /assets/images/warum-ci.jpg
excerpt: "Was ist Contact Improvisation? Spielerisches Forschen mit Schwerkraft, Balance und Berührung. Warum es mehr ist als Tanz — und was du dabei lernst."
---

<!-- Paste the article body prose from journal/warum-ci.html here,
     converted from HTML to Markdown. Keep <blockquote> and complex
     elements as inline HTML where Markdown can't express them. -->
```

- [ ] **Step 3: Write EN markdown**

Write file `src/journal/en/warum-ci.md` with the translated EN version of the same content. If no EN source exists yet, write a brief placeholder body and mark the file with a `draft: true` frontmatter (draft posts can be excluded from collections later).

- [ ] **Step 4: Build and verify**

Run:
```bash
npm run clean && npm run build
ls _site/journal/warum-ci.html _site/en/journal/warum-ci.html
```

Expected: both exist.

- [ ] **Step 5: Verify journal listing now shows the post**

Run:
```bash
grep "warum-ci" _site/journal.html
grep "warum-ci" _site/en/journal.html
```

Expected: match (the `<a href>` in the listing).

- [ ] **Step 6: Commit**

```bash
git add src/journal/
git commit -m "feat: port warum-ci article to markdown (de + en)"
```

### Task 8.5: Port `bewegungsrevolution.html` article to Markdown

**Files:**
- Create: `src/journal/de/bewegungsrevolution.md`
- Create: `src/journal/en/bewegungsrevolution.md`

Same pattern as Task 8.4. The article at `journal/bewegungsrevolution.html` becomes a DE markdown file and an EN markdown file.

- [ ] **Step 1: Read original, extract prose**

Run:
```bash
cat journal/bewegungsrevolution.html | head -100
```

- [ ] **Step 2: Write DE markdown**

Title: "Die Bewegungsrevolution". Date: extract from original (likely 2026-05). Use `image: /assets/images/bewegungsrevolution.png`.

- [ ] **Step 3: Write EN markdown**

- [ ] **Step 4: Build + verify listing shows both posts**

Run:
```bash
npm run clean && npm run build
grep -c "journal-card" _site/journal.html
```

Expected: 2 or more (one per post).

- [ ] **Step 5: Commit**

```bash
git add src/journal/
git commit -m "feat: port bewegungsrevolution article to markdown"
```

---

## Phase 9: Delete Legacy Files

At this point, `_site/` should fully mirror the old structure (plus more) but rendered from templates. Time to delete the originals.

### Task 9.1: Delete old HTML files

**Files:**
- Delete: `index.html`, `team.html`, `programm.html`, `journal.html`, `mitmachen.html`, `kontakt.html`, `montagskurs.html`, `bewegungsrevolution.html`, `impressum.html`, `datenschutz.html`

- [ ] **Step 1: Verify each has a template equivalent built in `_site/`**

Run:
```bash
for f in index team programm journal mitmachen kontakt montagskurs bewegungsrevolution impressum datenschutz; do
  if [ ! -f "_site/${f}.html" ]; then echo "MISSING: _site/${f}.html"; fi
done
```

Expected: no output (all exist).

- [ ] **Step 2: Delete originals**

Run:
```bash
rm index.html team.html programm.html journal.html mitmachen.html \
   kontakt.html montagskurs.html bewegungsrevolution.html \
   impressum.html datenschutz.html
```

- [ ] **Step 3: Rebuild to confirm nothing was relying on them**

Run:
```bash
npm run clean && npm run build
```

Expected: success, same files in `_site/`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete legacy DE html pages (replaced by eleventy)"
```

### Task 9.2: Delete EN tree

- [ ] **Step 1: Verify `_site/en/` is populated**

Run:
```bash
ls _site/en/
```

Expected: index.html, team.html, programm.html, journal.html, mitmachen.html, kontakt.html, etc.

- [ ] **Step 2: Delete the old `en/` directory**

Run:
```bash
rm -rf en/
```

- [ ] **Step 3: Rebuild and verify**

Run:
```bash
npm run clean && npm run build
ls _site/en/
```

Expected: same files present (now generated from templates).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete legacy en/ tree (replaced by locale pagination)"
```

### Task 9.3: Delete old `journal/` HTML articles

- [ ] **Step 1: Verify new journal articles exist in output**

Run:
```bash
ls _site/journal/warum-ci.html _site/journal/bewegungsrevolution.html
ls _site/en/journal/warum-ci.html _site/en/journal/bewegungsrevolution.html
```

- [ ] **Step 2: Delete originals**

Run:
```bash
rm journal/warum-ci.html journal/bewegungsrevolution.html
rmdir journal/ 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete legacy journal html (replaced by markdown)"
```

### Task 9.4: Delete old `js/i18n.js`, old `css/`, old `assets/`

- [ ] **Step 1: Verify `src/` has copies**

Run:
```bash
ls src/js/ src/css/ src/assets/
```

- [ ] **Step 2: Delete originals**

Run:
```bash
rm -rf js/ css/ assets/
rm CNAME robots.txt brand.html
```

- [ ] **Step 3: Rebuild + verify output unchanged**

Run:
```bash
npm run clean && npm run build
ls _site/
```

Expected: all files still present in `_site/`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete legacy top-level assets (now under src/)"
```

---

## Phase 10: GitHub Actions Deployment

### Task 10.1: Create deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write workflow**

Write file `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: "_site"

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add github actions deploy workflow"
```

### Task 10.2: Configure GitHub Pages source (manual user step)

**Files:** none (GitHub web UI)

- [ ] **Step 1: Push the migration branch**

Run:
```bash
git push -u origin eleventy-migration
```

- [ ] **Step 2: User opens GitHub repo settings**

Navigate to: `https://github.com/<user>/<repo>/settings/pages`

- [ ] **Step 3: Set Source to "GitHub Actions"**

Under "Build and deployment" > "Source", select **GitHub Actions** (not "Deploy from a branch").

- [ ] **Step 4: Confirm custom domain**

Under "Custom domain", verify `wildcare.space` is set. If not, set it.

- [ ] **Step 5: Confirm Enforce HTTPS is checked**

### Task 10.3: Trigger first deploy

- [ ] **Step 1: Merge migration branch to main**

Open a PR from `eleventy-migration` → `main`. Merge it (squash or merge commit, user preference).

- [ ] **Step 2: Watch the Actions tab**

Navigate to `https://github.com/<user>/<repo>/actions`. Verify the "Deploy to GitHub Pages" workflow runs and succeeds.

- [ ] **Step 3: Visit the live site**

Open `https://wildcare.space`. Verify:
- Home page loads with video hero
- Nav works and language toggle goes to `/en/`
- `/en/` shows English home
- All internal links work
- Journal listing shows 2 posts
- Clicking a post opens the article page
- Kontakt form is visible (don't submit)
- Impressum and Datenschutz pages load

- [ ] **Step 4: If anything is broken, rollback**

If the deployment has issues, GitHub Pages keeps the previous build available. Either:
- Fix the issue, commit, push → new deploy
- Revert the merge commit on `main` → triggers redeploy of old state

---

## Phase 11: Decap CMS

### Task 11.1: Set up Netlify Identity (manual user step)

- [ ] **Step 1: Create a free Netlify account**

Visit `https://app.netlify.com/signup` if one doesn't exist. No credit card required.

- [ ] **Step 2: Create a new Netlify site "for" this repo**

Go to `https://app.netlify.com/start` → "Deploy manually" or "Import from Git". The site doesn't need to actually serve content — we're using Netlify only for Identity + Git Gateway.

If "Deploy manually": drag an empty folder to create a site. Name it something like `wildcare-cms`.

- [ ] **Step 3: Enable Identity**

In the new Netlify site dashboard → "Identity" → click "Enable Identity".

- [ ] **Step 4: Enable Git Gateway**

In Identity settings → "Services" section → "Git Gateway" → click "Enable Git Gateway". Connect to the GitHub repo.

- [ ] **Step 5: Configure registration**

Under Identity → "Registration preferences" → set to "Invite only" (you don't want random signups).

- [ ] **Step 6: Invite yourself**

Under Identity → "Invite users" → enter your email. Accept the invitation in your email inbox.

- [ ] **Step 7: Note the Netlify Identity URL**

Under Identity → find the "Identity endpoint URL" (format: `https://<site-name>.netlify.app/.netlify/identity`). Save this — used in Task 11.3.

### Task 11.2: Create `admin/index.html`

**Files:**
- Create: `src/admin/index.html`

- [ ] **Step 1: Write the admin shell**

Write file `src/admin/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wild Care — Content Admin</title>
    <!-- Netlify Identity widget -->
    <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
</head>
<body>
    <!-- Decap CMS from CDN -->
    <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>

    <script>
        // Redirect to login if not authenticated
        if (window.netlifyIdentity) {
            window.netlifyIdentity.on("init", function (user) {
                if (!user) {
                    window.netlifyIdentity.on("login", function () {
                        document.location.href = "/admin/";
                    });
                }
            });
        }
    </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/admin/index.html
git commit -m "feat: add decap cms admin shell"
```

### Task 11.3: Create `admin/config.yml`

**Files:**
- Create: `src/admin/config.yml`

- [ ] **Step 1: Write Decap configuration**

Write file `src/admin/config.yml`:
```yaml
backend:
  name: git-gateway
  branch: main
  commit_messages:
    create: 'content: create {{collection}} "{{slug}}"'
    update: 'content: update {{collection}} "{{slug}}"'
    delete: 'content: delete {{collection}} "{{slug}}"'

# Uploads via the admin UI go here, committed to the repo
media_folder: "src/assets/images/uploads"
public_folder: "/assets/images/uploads"

# Display URL shown in the CMS header
display_url: https://wildcare.space
site_url: https://wildcare.space
logo_url: https://wildcare.space/assets/images/og-default.jpg

collections:
  # ------------------------------------------
  # Journal posts — DE
  # ------------------------------------------
  - name: "journal_de"
    label: "Journal (Deutsch)"
    folder: "src/journal/de"
    create: true
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields:
      - { label: "Titel", name: "title", widget: "string" }
      - { label: "Slug", name: "slug", widget: "string", required: true, hint: "URL-Teil, z.B. 'warum-ci'" }
      - { label: "Sprache", name: "locale", widget: "hidden", default: "de" }
      - { label: "Datum", name: "date", widget: "datetime" }
      - { label: "Titelbild", name: "image", widget: "image", required: false }
      - { label: "Kurzbeschreibung", name: "excerpt", widget: "text" }
      - { label: "Entwurf", name: "draft", widget: "boolean", default: false, required: false }
      - { label: "Inhalt", name: "body", widget: "markdown" }

  # ------------------------------------------
  # Journal posts — EN
  # ------------------------------------------
  - name: "journal_en"
    label: "Journal (English)"
    folder: "src/journal/en"
    create: true
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Slug", name: "slug", widget: "string", required: true, hint: "URL segment, e.g. 'warum-ci'" }
      - { label: "Locale", name: "locale", widget: "hidden", default: "en" }
      - { label: "Date", name: "date", widget: "datetime" }
      - { label: "Cover image", name: "image", widget: "image", required: false }
      - { label: "Excerpt", name: "excerpt", widget: "text" }
      - { label: "Draft", name: "draft", widget: "boolean", default: false, required: false }
      - { label: "Body", name: "body", widget: "markdown" }

  # ------------------------------------------
  # Team members (flat file)
  # ------------------------------------------
  - name: "team"
    label: "Team"
    files:
      - name: "team_members"
        label: "Team-Mitglieder"
        file: "src/_data/team.yml"
        fields:
          - label: "Mitglieder"
            name: "members"
            widget: "list"
            fields:
              - { label: "Name", name: "name", widget: "string" }
              - { label: "Rolle (DE)", name: "role_de", widget: "string" }
              - { label: "Rolle (EN)", name: "role_en", widget: "string" }
              - { label: "Bio (DE)", name: "bio_de", widget: "text" }
              - { label: "Bio (EN)", name: "bio_en", widget: "text" }
              - { label: "Portrait", name: "portrait", widget: "image", required: false }

  # ------------------------------------------
  # Next session / event banner (flat file)
  # ------------------------------------------
  - name: "event"
    label: "Nächste Session"
    files:
      - name: "next_session"
        label: "Nächste Session"
        file: "src/_data/next_session.yml"
        fields:
          - { label: "Datum", name: "date", widget: "datetime" }
          - { label: "Uhrzeit", name: "time", widget: "string", hint: "z.B. 17:45" }
          - { label: "Ort", name: "location", widget: "string" }
          - { label: "Banner anzeigen", name: "show_banner", widget: "boolean", default: true }

  # ------------------------------------------
  # Home page hero copy (flat file, bilingual)
  # ------------------------------------------
  - name: "home"
    label: "Startseite"
    files:
      - name: "home_hero"
        label: "Hero-Bereich"
        file: "src/_data/home_hero.yml"
        fields:
          - { label: "Titel (DE)", name: "title_de", widget: "string" }
          - { label: "Titel (EN)", name: "title_en", widget: "string" }
          - { label: "Untertitel (DE)", name: "subtitle_de", widget: "text" }
          - { label: "Untertitel (EN)", name: "subtitle_en", widget: "text" }
          - { label: "CTA-Label (DE)", name: "cta_de", widget: "string" }
          - { label: "CTA-Label (EN)", name: "cta_en", widget: "string" }
```

- [ ] **Step 2: Update the Netlify Identity widget URL in `base.njk`**

So that logged-in users see an "admin" link and can invoke Decap from anywhere.

Edit `src/_includes/layouts/base.njk` — inside `<head>`, after `{% include ... head-meta.njk %}`, add:
```njk
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add src/admin/config.yml src/_includes/layouts/base.njk
git commit -m "feat: add decap cms config with journal + team + event collections"
```

### Task 11.4: Deploy and test Decap

- [ ] **Step 1: Push + wait for deploy**

Run:
```bash
git push
```

Wait for the GH Actions deploy to complete.

- [ ] **Step 2: Visit `https://wildcare.space/admin/`**

Expected: Decap CMS login screen. Click "Login with Netlify Identity".

- [ ] **Step 3: Sign in with the email you invited in Task 11.1**

Expected: Decap dashboard loads, showing the collections from `config.yml`.

- [ ] **Step 4: Create a test journal post**

In the Decap UI: Journal (Deutsch) → New → fill in title "Test", slug "cms-test", date, excerpt, body → Save → Publish.

Expected: Decap commits a new file at `src/journal/de/cms-test.md` to `main`. GH Actions runs. New post appears on live journal listing at `/journal.html`.

- [ ] **Step 5: Delete the test post via Decap**

In Decap: journal listing → test post → Delete. Expected: commit removes the file. Listing updates after next deploy.

- [ ] **Step 6: No commit needed — the test was self-contained**

---

## Phase 12: Cutover Verification

### Task 12.1: Full site smoke test

- [ ] **Step 1: Check every page loads in both languages**

Visit each URL and confirm the page renders without broken layout or missing content:
- `https://wildcare.space/`
- `https://wildcare.space/team.html`
- `https://wildcare.space/programm.html`
- `https://wildcare.space/journal.html`
- `https://wildcare.space/mitmachen.html`
- `https://wildcare.space/kontakt.html`
- `https://wildcare.space/montagskurs.html`
- `https://wildcare.space/bewegungsrevolution.html`
- `https://wildcare.space/impressum.html`
- `https://wildcare.space/datenschutz.html`
- `https://wildcare.space/brand.html`
- `https://wildcare.space/en/` (and each of the above with `/en/` prefix)

- [ ] **Step 2: Check journal articles**

Visit:
- `https://wildcare.space/journal/warum-ci.html`
- `https://wildcare.space/journal/bewegungsrevolution.html`
- `https://wildcare.space/en/journal/warum-ci.html`
- `https://wildcare.space/en/journal/bewegungsrevolution.html`

- [ ] **Step 3: Verify language toggle works**

On any page, click the DE/EN toggle in the nav. It should navigate to the same page in the other language (e.g. `/team.html` → `/en/team.html`).

- [ ] **Step 4: Check mobile nav**

On a mobile viewport (or browser dev tools responsive mode <968px), tap the hamburger icon. Menu should open. Links should work.

- [ ] **Step 5: Check the video hero on home**

Home page should play the background video. Scroll-triggered nav state change (transparent → solid) should work.

- [ ] **Step 6: Check forms render**

Kontakt page form should render. Don't submit unless you want to test Formspree.

- [ ] **Step 7: Check that old URLs still work (or redirect)**

The deletion in Phase 9 removed old files from the repo, but GH Pages might cache. Clear the CDN by visiting each URL once.

### Task 12.2: Update documentation

**Files:**
- Modify: `README.md` (or create if none exists)

- [ ] **Step 1: Check for existing README**

Run:
```bash
cat README.md 2>/dev/null || echo "no README"
```

- [ ] **Step 2: Write or update README**

Write file `README.md`:
```markdown
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
- `src/_partials/` — nav, footer, head-meta
- `src/css/styles.css` — single source of truth for all styling
- `src/admin/` — Decap CMS shell + config
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README describing the new stack"
```

### Task 12.3: Merge to main

- [ ] **Step 1: Push final commits**

```bash
git push
```

- [ ] **Step 2: Verify final deploy green on GH Actions**

- [ ] **Step 3: Celebrate**

The migration is complete. The old duplicated HTML tree is gone, DE and EN share one template, journal posts are editable via Decap, and everything deploys from a single `npm run build`.

---

## Notes & References

**Eleventy docs:**
- Config: https://www.11ty.dev/docs/config/
- Pagination: https://www.11ty.dev/docs/pagination/
- Data cascade: https://www.11ty.dev/docs/data-cascade/
- Collections: https://www.11ty.dev/docs/collections/
- Permalinks: https://www.11ty.dev/docs/permalinks/

**Decap CMS docs:**
- Getting started: https://decapcms.org/docs/intro/
- Config: https://decapcms.org/docs/configuration-options/
- Collection types: https://decapcms.org/docs/collection-types/
- Widgets: https://decapcms.org/docs/widgets/
- Git Gateway: https://decapcms.org/docs/git-gateway-backend/

**GitHub Pages + Actions:**
- Deploy action: https://github.com/actions/deploy-pages
- Pages config: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

**Netlify Identity:**
- Enable Identity: https://docs.netlify.com/visitor-access/identity/
- Git Gateway: https://docs.netlify.com/visitor-access/git-gateway/

---

## Post-migration: Open Work

Deferred, not part of this plan:

- Translate any missing EN journal content (Phase 8 may have placeholder EN files).
- Tune Decap content model based on real editing experience. Add more collections (e.g. homepage values, programm projects) if editing demand surfaces.
- Add CI for content validation (e.g. required frontmatter fields).
- Consider `eleventy-img` for automatic responsive image generation (currently assets are hand-sized).
- Consider a sitemap generator plugin if search indexing needs it.
