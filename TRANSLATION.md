# Wild Care — Translation Model (i18n)

## Overview

The site uses a client-side, attribute-based translation system supporting **German (de)** and **English (en)**. German is the default language. Translations are toggled via DE/EN buttons in the navigation bar and persisted in `localStorage`.

## How It Works

### 1. Data Attributes

Every translatable text element carries two HTML attributes:

```html
<h2 data-de="Vier Haltungen" data-en="Four Principles">Vier Haltungen</h2>
```

- `data-de` — German text (matches the element's default inner text)
- `data-en` — English translation
- The element's initial text content is always the German version

Both attributes must be present on every translatable element. The `i18n.js` script selects elements via `[data-de][data-en]`.

### 2. HTML in Attributes

Only `<br>` tags are supported inside data attributes (for line breaks in headings). All other HTML entities must be encoded (`&uuml;`, `&mdash;`, `&rsquo;`, etc.).

```html
<h1 data-de="Warum Contact<br>Improvisation?"
    data-en="Why Contact<br>Improvisation?">Warum Contact<br>Improvisation?</h1>
```

**Important:** Rich HTML (links, `<em>`, `<strong>`) inside `data-*` attributes will be stripped — the script uses `textContent`, not `innerHTML`. For paragraphs containing links or inline markup, the `data-de`/`data-en` swap will replace the entire content as plain text.

### 3. Language Toggle

The navigation must include this toggle structure:

```html
<div class="lang-toggle">
    <button class="lang-toggle-btn active" data-lang="de">DE</button>
    <button class="lang-toggle-btn" data-lang="en">EN</button>
</div>
```

Do **not** use a simple `<a>` link to `/en/` — the translation is client-side, not route-based.

### 4. Script Include

Every page must include the i18n script at the end of `<body>`, after all other scripts:

```html
<script src="js/i18n.js"></script>
```

For pages in subdirectories (e.g., `journal/`):

```html
<script src="../js/i18n.js"></script>
```

### 5. Persistence

The selected language is stored in `localStorage` under the key `wc-lang`. When a user switches to English on any page, all other pages will also render in English on next load.

## Checklist for New Pages

When creating a new page, ensure:

1. **Nav links** have `data-de` / `data-en` attributes (except "Journal" which stays the same in both languages)
2. **Lang toggle** uses the button pattern, not a link
3. **All visible text** in the page body has `data-de` / `data-en` attributes
4. **Footer** has `data-de` / `data-en` on: brand description, section headings ("Seiten"/"Pages", "Verbinden"/"Connect"), nav link labels, and "Mit Fürsorge gebaut"/"Built with care"
5. **`i18n.js`** is included at the end of `<body>` with the correct relative path

## Elements That Stay Untranslated

- "Wild Care" (brand name)
- "Journal" (nav link — same in both languages)
- "Instagram", email addresses, "Impressum", "Datenschutz" (legal pages remain in German)
- Time formats (17:45 – 19:15)
- Addresses (Orpheumgasse 11, Graz)

## File Reference

| File | Purpose |
|------|---------|
| `js/i18n.js` | Translation engine — reads `data-de`/`data-en`, swaps text, manages localStorage |
| `en/` directory | **Legacy** — static English page copies exist but the primary model is the attribute-based toggle |
