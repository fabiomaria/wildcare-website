# Idea: scaffold script for new journal articles

**Status:** raw idea, not brainstormed/designed yet. Captured 2026-07-18 for a future session.

## Problem

Writing a new Journal article (`content/journal/*.md`) means hand-crafting frontmatter
with ~19 fields, matching an exact schema, plus getting the bilingual file-pairing
convention right. This is easy for a human editor to get right in the Sveltia CMS UI
(the CMS enforces the schema for you), but there's no equivalent guardrail for an
agent (or a human) creating/editing the `.md` files directly — an agent free-typing
YAML frontmatter from memory can easily invent a field name, get an option value
wrong, or forget the second bilingual file. `EDITING.md` section 3 ("Wie du einen
Journal-Artikel hinzufügst") documents the CMS-UI flow for humans, but nothing today
targets an agent authoring files directly.

## Current state (verified 2026-07-18)

**i18n file structure** — journal is a `multiple_files` collection (per
`admin/config.yml` lines 28-33, top-level `i18n:` block):
```yaml
i18n:
  # Applies to entry (folder) collections, i.e. the journal:
  # warum-ci.md (DE) + warum-ci.en.md (EN, optional).
  # File collections without a {{locale}} placeholder use single_file
  # (top-level de:/en: keys) regardless of this structure setting.
  structure: multiple_files
  omit_default_locale_from_file_path: true
```
So each article is **one file per locale**: `content/journal/<slug>.md` (German,
default locale, no suffix) plus an **optional** `content/journal/<slug>.en.md`
(English) if the article is bilingual. This is a different i18n shape than the
workshops collection (which just moved to `single_file`, one file with `de:`/`en:`
keys, in the 2026-07-18 Sveltia rework) — a scaffold script for journal needs
**two output files**, not one.

**Current frontmatter schema** (from the `journal` collection in `admin/config.yml`,
reordered/grouped in Task 3 of the 2026-07-18 Sveltia rework — see
`docs/superpowers/plans/2026-07-18-sveltia-backend-rework.md` Task 3 for how it got
this shape):

- `language_mode` (select: `de_only` / `en_only` / `bilingual`, default `de_only`) — `i18n: duplicate` (same value in both files, not translated)
- `title` (string, i18n)
- `title_html` (string, i18n — title with optional `<br>`)
- `date` (datetime, `i18n: duplicate`)
- `sort_order` (number, optional, `i18n: duplicate`)
- `status` (select: `published` / `coming_soon`, default `published`, `i18n: duplicate`)
- `excerpt` (text, i18n)
- `body` (markdown, i18n) — **not a frontmatter key**; this is the actual Markdown content below the `---` fence (Decap/Sveltia convention: a field literally named `body` maps to the file body, not a frontmatter entry)
- `image` (image, optional, `i18n: duplicate`)
- `image_alt` (string, optional, `i18n: duplicate`)
- `hero_image` (image, optional, `i18n: duplicate`)
- `hero_alt` (string, optional, `i18n: duplicate`)
- `hero_variant` (select: `cover` / `contained`, default `cover`, `i18n: duplicate`)
- `homepage_title` (string, optional, i18n)
- `homepage_excerpt` (text, optional, i18n)
- `homepage_image_alt` (string, optional, `i18n: duplicate`)
- `tally` (boolean, optional, default `false`, `i18n: duplicate` — whether to load the Tally embed script)
- `cta` (object, optional, i18n) — `heading` (string), `text` (text), `buttons` (list): each button has `label` (string, i18n), `kind` (select `link`/`tally`, `i18n: duplicate`), `style` (select `primary`/`secondary`, `i18n: duplicate`), `href` (string, optional, `i18n: duplicate`), `tally_open` (string, optional, `i18n: duplicate`)
- `meta_description` (text, i18n)

**Real example** (`content/journal/warum-ci.md`, German file) for concrete reference:
```yaml
---
language_mode: bilingual
title: Warum Contact Improvisation?
title_html: "Warum Contact<br>Improvisation?"
homepage_title: Warum Contact Improvisation?
date: 2026-03-01
sort_order: 2
status: published
excerpt: "Über das spielerische Forschen mit Schwerkraft, Gleichgewicht und Vertrauen — und warum es mehr ist als Tanz."
homepage_excerpt: "Über das spielerische Forschen mit Schwerkraft, Gleichgewicht und Vertrauen."
meta_description: "Was ist Contact Improvisation? ..."
image: assets/images/warum-ci.jpg
image_alt: Contact Improvisation
hero_image: assets/images/ci-cover.jpg
hero_alt: Contact Improvisation — zwei Menschen in Bewegung
hero_variant: cover
cta:
  heading: Probier es aus
  text: Jeden Montag, 17:45 Uhr, Orpheumgasse 11, Graz. Keine Erfahrung nötig.
  buttons:
    - label: Kontakt & Anfahrt
      kind: link
      style: primary
      href: ../kontakt.html
---

Contact Improvisation ist das spielerische Erforschen von ... (markdown body)
```
Its `warum-ci.en.md` sibling is the English translation (same shape, no
`language_mode`/`date`/`sort_order`/`status` duplication issues since `gray-matter`
reads whichever file is loaded — the loader is what reconciles head fields, see below).

**Loader** (`eleventy.config.js`):
- Reads `content/journal/` directly (`path.join(__dirname, "content", "journal")`, ~line 120).
- Produces public permalinks as `journal/<slug>.html` (~line 162).
- Exposed as `cms.journal` global data and `journalArticlePages` (~lines 336-357).
- Worth reading in full before building the script — it has its own logic for
  pairing DE/EN files by slug and reconciling fields that should not "leak" between
  languages (comment at ~line 135 warns about exactly this).

## Proposed idea

A scaffold script, following the existing precedent of
`scripts/migrate-workshops-i18n.js` (a one-off migration script already in this
repo — same `fs`/`path`/`js-yaml` style, same place: `scripts/`), but as a
**generator** rather than a migration:

`scripts/new-journal-entry.js <slug> [--bilingual|--de-only|--en-only]` (exact CLI
shape TBD) that:
1. Writes `content/journal/<slug>.md` (and `<slug>.en.md` if bilingual) with every
   frontmatter field present, using either sensible defaults (`date`: today,
   `sort_order`: max existing + 1, `status: published`, `hero_variant: cover`,
   `language_mode` per the flag) or an obvious placeholder (`"TODO: title"`) for
   fields that need real content — so nothing is silently missing, and no field name
   can be typo'd because the agent isn't hand-typing the schema.
2. Guarantees the two-file bilingual pairing is never forgotten.
3. Optionally runs the existing verification harness afterward (parse check /
   `npm run build`) to catch integration errors immediately, per the pattern
   established in `docs/superpowers/plans/2026-07-18-sveltia-backend-rework.md`'s
   Task 1 (CLAUDE.md's "CMS schema verification" section, added there).

## Open questions to brainstorm

- **CLI shape**: flags vs. an interactive prompt vs. just positional args (slug +
  title, everything else defaulted/placeholder)?
- **Schema drift risk**: hardcode the template in the script (simple, but silently
  goes stale if `admin/config.yml`'s journal fields change again) vs. parse
  `admin/config.yml`'s journal collection at runtime and generate the template
  fields programmatically (more robust, more complex, and `admin/config.yml` uses
  YAML anchors/complex nesting that would need real parsing logic, not just a
  field-name list)?
- **Where do "creative" fields come from?** Title, excerpt, CTA copy, image
  selection/alt text still need human or agent judgment — the script only
  guarantees *structural* correctness, not content quality. Should it leave these
  as clearly-marked placeholders, or should the *agent* (not the script) fill
  real content directly into the generated file before the first commit?
- **Should this pair with a Claude Code project skill** (e.g.
  `.claude/skills/new-journal-article/SKILL.md`) that tells a future agent
  session "run this script first, then edit the output, then verify with
  `npm run build`" — so the workflow is discoverable without re-deriving it each
  session? (Mirrors how this repo already leans on `CLAUDE.md`'s "CMS schema
  verification" section for the CMS-config side of things.)
- **Slug validation**: should it reuse whatever slug-normalization convention
  exists elsewhere in this codebase (the workshops loader has a
  `normalizeSlug`/`normalizeExternalUrl` helper in `eleventy.config.js` — worth
  checking if journal should follow the same normalization rules)?
- **Bilingual defaults**: for `de_only`/`en_only` articles, should the script only
  write the one file, or write both with the second clearly marked "not needed for
  this language_mode, delete me" (to avoid an agent forgetting whether the second
  file is required or not)?
