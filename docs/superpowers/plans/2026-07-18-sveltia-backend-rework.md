# Sveltia CMS Backend Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kill the CMS scroll fatigue — collapse every section, add drag-and-drop list summaries, de-duplicate the workshop DE/EN schema via Sveltia's native i18n, and split standard vs. archive workshop editing views — without changing a single rendered byte of the site.

**Architecture:** All work happens in `admin/config.yml` (the Sveltia schema), plus one contained change to `eleventy.config.js` + a one-time content migration for the workshop i18n restructure. Templates (`site/**`) are not touched. Verification is: YAML parse check + Sveltia local-repository smoke test + `_site/` build diff against a baseline snapshot.

**Tech Stack:** Sveltia CMS 0.171.1 (self-hosted, pinned at `admin/sveltia-cms-0.171.1.js`), Eleventy 11ty (Nunjucks), js-yaml, GitHub Pages deploy from `production`.

## Global Constraints

- Branch: **`production`** — verify `git branch --show-current` prints `production` before every task. Never base work on `main`.
- Commit **with explicit pathspec only** (`git commit path -m "..."`), never bare `git commit`.
- `css/styles.css` is never edited; no new CSS files; no inline `style="..."` attributes.
- Rendered output must stay identical: after any task that touches `content/` or `eleventy.config.js`, `_site/` must diff clean against the baseline (excluding `_site/admin/`, which mirrors the config we're editing).
- Schema before templates: templates conform to schema, never invent variables not in the schema.
- Sveltia stays pinned at 0.171.1. All features used here were verified present in the pinned bundle (`minimize_collapsed`, `divider`, `thumbnail`, `relation`, variable `types`). Do **not** upgrade the bundle as part of this work.
- `worker/`, `worker-kontakt/`, `worker-auth/` are out of scope. `js/i18n.js` is out of scope (client-side DE/EN toggle is unrelated to the CMS backend).
- The Wurzel-tier `60+`/`50+` mismatch on mitmachen stays as-is.

---

## Current state (why each task exists)

`admin/config.yml` (1,097 lines) has:

1. **Zero collapse/summary configuration.** Every `object` and `list` renders fully expanded → the "endless vertical column" the owner complained about.
2. **The `workshops` collection duplicates its entire field tree** under `de:` (lines ~670–883) and `en:` (lines ~884–1097) instead of using Sveltia i18n. The content files (`content/workshops/*.yaml`) already store `de:`/`en:` top-level keys — exactly the shape Sveltia's `structure: single_file` i18n writes — so native i18n is within reach.
3. **Archive-only sections pollute every workshop form.** The `course_series` layout uses `quote, testimonials, team, faq, archive_cta, funded_by, footer`; the `standard` layout uses `practice, info, image_band, facilitator, testimonial`. Verified against `site/workshop.njk` and `site/_includes/partials/workshop-course-series.njk`, and against the two content files (cellular-touch = standard sections only, bewegungsrevolution = archive sections only). Both variants share `card, meta, nav, hero, research`.
4. **`meta` (SEO) is the first field on every page** — editors scroll past it every time.

## Decisions (including what we're NOT doing, and why)

| Gemini recommendation | Decision | Reason |
|---|---|---|
| Collapsible repeaters + dynamic summaries | ✅ Do (Tasks 2, 3, 5) | Pure config win, zero migration risk. |
| Tabs / sidebar layout | ✅ Emulate (Tasks 2, 3, 5) | Sveltia has no tabs. Collapsed section objects + `divider` widgets + moving SEO last gives the "TOC of sections" feel. |
| De-duplicate DE/EN via native i18n | ✅ Do, gated on a verification spike (Tasks 4, 5) | Halves the workshop schema and gives editors Sveltia's locale switcher instead of two giant stacked objects. Gated because the exact YAML shape Sveltia writes for `single_file` + non-i18n fields must be frozen first (same "schema contract" discipline as the original migration brief). |
| Split editing views (standard vs archive workshops) | ✅ Do (Task 6) | Removes ~7 irrelevant sections from each form via Decap-compatible `filter` on two collections over the same folder. |
| Facilitators/People relation collection | ❌ Skip | Verified: the same two people have **intentionally different** roles/bios on team.yaml ("Gründer", association-level bio) vs montagskurs.yaml (course-level bio). This is contextual copy, not duplication — a single source of truth would destroy it. Only name/image/alt are shared (3 lines per person, 2 people, ~yearly churn). Not worth a collection + loader filter + template changes. Revisit if guest facilitators become frequent. |
| Category taxonomy for tags | ❌ Skip | Card tags are 1–2 short styled labels per workshop; a taxonomy collection adds indirection with no reuse payoff at this scale. |
| Variable-type page builder (`types`) | ❌ Skip | The pages are fixed-design (hand-tuned section order, accent classes, animation delays baked into templates). Letting editors add/reorder/remove sections would break design integrity and require rewriting every template as a block loop plus migrating all content. Editors edit copy, not layout — by design. |

---

### Task 1: Local CMS verification harness + build baseline

Everything later is verified against these two fixtures. No schema changes in this task.

**Files:**
- Modify: `CLAUDE.md` (append a short "CMS verification" section)
- Create: `<scratchpad>/site-baseline/` (build snapshot, not committed)

**Interfaces:**
- Produces: the verification procedure ("parse check", "local CMS smoke test", "build diff") referenced by every later task's verify steps.

- [ ] **Step 1: Confirm branch and clean build**

```bash
git branch --show-current   # expected: production
npm run build               # expected: exit 0, writes _site/
```

- [ ] **Step 2: Snapshot the baseline output**

```bash
BASE="/private/tmp/claude-501/-Users-fabiogerhold-Sandboxes-Claude-fabio-gerhold-projects-wild-care-website/fbd97fa2-9732-486b-a24d-264a23223085/scratchpad/site-baseline"
rm -rf "$BASE" && cp -R _site "$BASE"
diff -r -x admin _site "$BASE" && echo BASELINE-OK
```

Expected: `BASELINE-OK`. Every later verify step that references `$BASE` needs this export re-run in a fresh shell session (the snapshot itself persists on disk).

- [ ] **Step 3: Verify the Sveltia local-repository workflow works**

```bash
npm run dev   # serves on http://localhost:8081
```

In a Chromium browser, open `http://localhost:8081/admin/`. Sveltia shows a **"Work with Local Repository"** button on localhost (File System Access API; Chrome/Edge only — Safari/Firefox won't work). Click it, select the repo root (`website/`). Confirm:
- All five collections (Seiten, Website, Journal, Rechtliches, Workshops) load.
- Open `Workshops → Cellular Touch` — note the current wall of expanded fields (the "before" state).
- Close **without saving** (saving from the UI rewrites YAML formatting; we only save when a task's verify step says so).

- [ ] **Step 4: Document the harness in CLAUDE.md**

Append to `CLAUDE.md`:

```markdown
## CMS schema verification (admin/config.yml)

- Parse check: `node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"`
- UI check: `npm run dev`, open http://localhost:8081/admin/ in Chrome, use
  **Work with Local Repository** (pick the repo root). This reads/writes the
  working tree directly — no GitHub auth needed.
- CMS saves rewrite YAML formatting (quoting, key order). Never judge a
  schema change by `git diff content/` after a UI save; judge it by the
  `_site/` build diff (`npm run build` + `diff -r -x admin _site <baseline>`).
```

- [ ] **Step 5: Commit**

```bash
git commit CLAUDE.md -m "docs: document local Sveltia verification harness"
```

---

### Task 2: Seiten collection — collapse sections, list summaries, SEO last

Config-only. No content or build changes possible (config.yml is a passthrough asset).

**Files:**
- Modify: `admin/config.yml` (the `seiten` collection, lines ~40–534, and `website` collection lines ~536–564)

**Interfaces:**
- Consumes: verification harness from Task 1.
- Produces: the three edit patterns (A/B/C below) reused verbatim by Tasks 3 and 5.

- [ ] **Step 1: Apply pattern A — collapse every top-level section object**

For each `widget: object` listed below, add `collapsed: true` on the line after `widget: object`. Example (startseite `hero`, before → after):

```yaml
# before
          - name: hero
            label: Hero (Video)
            widget: object
            i18n: true
# after
          - name: hero
            label: Hero (Video)
            widget: object
            collapsed: true
            i18n: true
```

Apply to exactly these objects:

| Page schema | Objects to collapse |
|---|---|
| `startseite` | `meta`, `hero`, `event_banner`, `values`, `invitation`, `journal`, `cta` |
| `kontakt` | `meta`, `hero`, `form`, `info`, `map`, `footer` |
| `team` | `meta`, `hero`, `manifest`, `team`, `quote_band`, `philosophy`, `cta`, `footer` |
| `journal_landing` | `meta`, `hero`, `card`, `cta`, `article` |
| `montagskurs` | `meta`, `hero`, `practice`, `learn`, `testimonials`, `team`, `faq`, `crosslink`, `cta`, `footer` |
| `mitmachen` | `meta`, `hero`, `circles`, `circles.outer`, `circles.inner`, `membership`, `footer` |
| `website → global` | `nav`, `footer` |

(Plain scalar fields like `quote`, `breadcrumb`, `core_message` stay as they are.)

- [ ] **Step 2: Apply pattern B — collapsible lists with summaries**

For each `widget: list` below, add three lines after `widget: list`:

```yaml
# before (team.members example)
              - name: members
                label: Personen
                widget: list
                i18n: true
# after
              - name: members
                label: Personen
                widget: list
                collapsed: true
                minimize_collapsed: true
                summary: '{{fields.name}}'
                i18n: true
```

| Page schema | List | `summary` value |
|---|---|---|
| `startseite` | `values.cards` | `'{{fields.title}}'` |
| `team` | `team.members` | `'{{fields.name}}'` |
| `team` | `philosophy.pillars` | `'{{fields.title}}'` |
| `montagskurs` | `learn.cards` | `'{{fields.title}}'` |
| `montagskurs` | `testimonials.items` | `'{{fields.author}}'` |
| `montagskurs` | `team.members` | `'{{fields.name}}'` |
| `montagskurs` | `faq.items` | `'{{fields.q}}'` |
| `mitmachen` | `membership.tiers` | `'{{fields.name}} · {{fields.amount}}'` |

The single-field tag lists on mitmachen (`circles.outer.tags`, `circles.inner.tags`) already render as compact scalar rows — leave them unchanged.

- [ ] **Step 3: Apply pattern C — move `meta` (SEO) to the end of each page's field list**

For each of the six page schemas (`startseite`, `kontakt`, `team`, `journal_landing`, `montagskurs`, `mitmachen`): cut the entire `meta` object block (5 lines + its 2 fields) from the top of `fields:` and paste it as the **last** entry of that page's `fields:` list, and change its label to make the placement obvious:

```yaml
          - name: meta
            label: 'SEO & Vorschau (zuletzt prüfen)'
            widget: object
            collapsed: true
            i18n: false
            fields:
              - { name: title, label: Seitentitel, widget: string }
              - { name: description, label: Beschreibung, widget: text }
```

This only reorders the schema; YAML key order in `content/pages/*.yaml` changes on the next CMS save, which is harmless (Eleventy reads by key).

- [ ] **Step 4: Verify**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"
```

Expected: `OK`. Then `npm run dev`, open `http://localhost:8081/admin/` → Startseite: the entry now shows a short stack of collapsed section headers (Hero, Termin-Banner, Vier Haltungen, …, SEO last). Expand "Vier Haltungen" → cards show as four collapsed rows titled by card title, draggable. Open Team → Personen shows "Verena Eidenberger", "Fabio Maria Gerhold" as collapsed rows. Do not save.

- [ ] **Step 5: Commit**

```bash
git commit admin/config.yml -m "cms: collapse page sections, add list summaries, move SEO last"
```

---

### Task 3: Journal collection — dividers, grouping, entry-list thumbnail

The journal folder collection is a flat 19-field form. Group it with `divider` widgets (UI-only), collapse the CTA object, and give the entry list thumbnails.

**Files:**
- Modify: `admin/config.yml` (the `journal` collection, lines ~566–618)

**Interfaces:**
- Consumes: patterns A/B from Task 2.
- Produces: nothing downstream; independent deliverable.

- [ ] **Step 1: Add `thumbnail` to the collection head**

```yaml
  - name: journal
    label: Journal
    folder: content/journal
    create: true
    extension: md
    format: frontmatter
    thumbnail: image
    i18n: true
```

- [ ] **Step 2: Reorder fields into groups separated by dividers**

Replace the journal `fields:` list with the same fields in this order, inserting the four divider entries (dividers are UI-only widgets; Step 4 verifies they write nothing to frontmatter):

```yaml
    fields:
      - name: language_mode
        label: Sprachversionen
        widget: select
        options:
          - { label: Deutsch, value: de_only }
          - { label: Englisch, value: en_only }
          - { label: Deutsch + Englisch, value: bilingual }
        default: de_only
        i18n: duplicate
      - { name: title, label: Titel, widget: string, required: false, i18n: true }
      - { name: title_html, label: 'Artikeltitel mit optionalem <br>', widget: string, required: false, i18n: true }
      - { name: date, label: Datum, widget: datetime, i18n: duplicate }
      - { name: sort_order, label: Sortierung bei gleichem Datum, widget: number, required: false, value_type: int, i18n: duplicate }
      - { name: status, label: Status, widget: select, options: [published, coming_soon], default: published, i18n: duplicate }
      - { name: excerpt, label: Teaser, widget: text, required: false, i18n: true }
      - { name: body, label: Artikeltext, widget: markdown, required: false, i18n: true }
      - { widget: divider }
      - { name: image, label: Bild, widget: image, required: false, i18n: duplicate }
      - { name: image_alt, label: Alt-Text, widget: string, required: false, i18n: duplicate }
      - { name: hero_image, label: Hero-Bild, widget: image, required: false, i18n: duplicate }
      - { name: hero_alt, label: Hero-Alt-Text, widget: string, required: false, i18n: duplicate }
      - { name: hero_variant, label: Hero-Darstellung, widget: select, options: [cover, contained], default: cover, i18n: duplicate }
      - { widget: divider }
      - { name: homepage_title, label: 'Titel auf der Startseite', widget: string, required: false, i18n: true }
      - { name: homepage_excerpt, label: 'Kurz-Teaser auf der Startseite', widget: text, required: false, i18n: true }
      - { name: homepage_image_alt, label: 'Alt-Text auf der Startseite', widget: string, required: false, i18n: duplicate }
      - { widget: divider }
      - { name: tally, label: Tally-Script laden, widget: boolean, required: false, default: false, i18n: duplicate }
      - name: cta
        label: Artikel-CTA
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: heading, label: Überschrift, widget: string, required: false, i18n: true }
          - { name: text, label: Text, widget: text, required: false, i18n: true }
          - name: buttons
            label: Buttons
            widget: list
            collapsed: true
            minimize_collapsed: true
            summary: '{{fields.label}}'
            required: false
            i18n: true
            fields:
              - { name: label, label: Button-Text, widget: string, i18n: true }
              - { name: kind, label: Typ, widget: select, options: [link, tally], default: link, i18n: duplicate }
              - { name: style, label: Stil, widget: select, options: [primary, secondary], default: primary, i18n: duplicate }
              - { name: href, label: Link, widget: string, required: false, i18n: duplicate }
              - { name: tally_open, label: Tally-ID, widget: string, required: false, i18n: duplicate }
      - { widget: divider }
      - { name: meta_description, label: SEO-Beschreibung, widget: text, required: false, i18n: true }
```

(Every field above is the existing field verbatim; only order, dividers, and the collapse/summary attributes are new. Frontmatter key order changes on next CMS save — harmless.)

- [ ] **Step 3: Verify parse + UI**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"
```

Expected: `OK`. In the local CMS: Journal entry list shows image thumbnails; opening `warum-ci` shows the grouped form with divider rules; the CTA object is collapsed. If Sveltia rejects a nameless `{ widget: divider }` (error banner or console error), give each divider a unique name: `{ name: divider_images, widget: divider }` etc.

- [ ] **Step 4: Divider round-trip canary**

In the local CMS, open journal entry `was-ist-kunst`, change nothing, press **Save** once. Then:

```bash
git diff --stat content/journal/
git diff content/journal/ | grep -iE 'divider' ; echo "divider-grep-exit=$?"
npm run build && diff -r -x admin _site "$BASE" && echo BUILD-IDENTICAL
```

Expected: `divider-grep-exit=1` (dividers never persist), and `BUILD-IDENTICAL` (a no-op CMS save may reformat YAML, but the rendered site must not change). If the build diff is NOT clean, inspect it — a changed date format or dropped field means a schema bug; fix before committing. Revert the content file (`git checkout -- content/journal/`) so only the config change is committed.

- [ ] **Step 5: Commit**

```bash
git commit admin/config.yml -m "cms: group journal form with dividers, add thumbnails"
```

---

### Task 4: i18n spike — freeze the single_file shape, GO/NO-GO for the workshop rewrite

The workshop de-dup (Task 5) assumes Sveltia's per-collection `structure: single_file` i18n writes the same `de:`/`en:` shape the content files already use. Freeze that assumption against the real UI before rewriting anything — this echoes the original brief's Phase-0 "schema contract" discipline. Nothing in this task is committed.

**Files:**
- Modify (temporarily, reverted at the end): `admin/config.yml`
- Create (temporary, deleted at the end): `content/_spike/`

**Interfaces:**
- Produces: a GO/NO-GO decision plus the frozen sample YAML, recorded in `docs/superpowers/plans/2026-07-18-sveltia-backend-rework.md` itself (append a "## Spike results" section). Task 5 branches on it.

- [ ] **Step 1: Add a throwaway spike collection to `admin/config.yml`**

Append at the end of `collections:`:

```yaml
  - name: i18n_spike
    label: '[SPIKE] i18n Test'
    folder: content/_spike
    create: true
    extension: yaml
    format: yaml
    identifier_field: slug
    slug: '{{slug}}'
    summary: '{{fields.card.heading}}'
    i18n:
      structure: single_file
      locales: [de, en]
      default_locale: de
      initial_locales: [de]
    fields:
      - { name: slug, label: Slug, widget: string, i18n: false }
      - { name: status, label: Status, widget: select, options: [draft, upcoming], default: upcoming, i18n: false }
      - name: card
        label: Karte
        widget: object
        collapsed: true
        i18n: true
        fields:
          - { name: heading, label: Überschrift, widget: string, i18n: true }
          - name: items
            label: Liste
            widget: list
            collapsed: true
            minimize_collapsed: true
            summary: '{{fields.text}}'
            i18n: true
            fields:
              - { name: text, label: Text, widget: string, i18n: true }
```

- [ ] **Step 2: Round-trip a bilingual entry and freeze the file shape**

`mkdir -p content/_spike`. In the local CMS (`http://localhost:8081/admin/`), open `[SPIKE] i18n Test` → New entry. Fill slug `probe`, heading DE "Hallo", add one list item "eins"; enable the EN locale via Sveltia's locale switcher, fill heading "Hello", item "one". Save. Then:

```bash
cat content/_spike/probe.yaml
```

Record the answers to these canaries in the "Spike results" section:
- **(a) Per-collection i18n override honored?** The entry must be ONE file with `de:`/`en:` keys (not `probe.yaml` + `probe.en.yaml`, which would mean the collection inherited the global `multiple_files`).
- **(b) Where do `i18n: false` fields land?** Under `de:` (expected) or at the top level? Task 5's migration script and loader handle both, but the frozen sample decides what the migration writes.
- **(c) Locale toggling:** disable EN again in the UI, save, confirm the `en:` block is removed without corrupting `de:`.
- **(d) Unknown-field preservation (needed by Task 6):** manually add a stray line `zzz_canary: keep-me` to `probe.yaml` (top level and once inside `de:`), reload the CMS, save the entry again, and check whether both `zzz_canary` lines survive. This decides whether filtered collections with partial schemas are safe.
- **(e) Nested collection summary:** does the entry list show "Hallo" (the `{{fields.card.heading}}` summary) or fall back to the slug? Decides whether Task 5 can use a nested `summary`.

- [ ] **Step 3: Decide GO/NO-GO and record it**

**GO** if (a) yields one file with top-level `de:`/`en:` content blocks and (c) doesn't corrupt data. Append to this plan file:

```markdown
## Spike results (Task 4)

- Decision: GO | NO-GO
- Frozen sample (content/_spike/probe.yaml after round-trip):
  <paste the exact file content>
- (b) non-i18n fields land: <top-level | under de:>
- (d) unknown fields preserved on save: <yes | no>  → Task 6 <proceeds | needs the caveat documented in EDITING.md>
- (e) nested summary works: <yes | no>
```

**NO-GO** otherwise → Task 5-ALT.

- [ ] **Step 4: Clean up the spike**

```bash
rm -rf content/_spike
git checkout -- admin/config.yml
git status --short   # expected: only this plan file modified
```

- [ ] **Step 5: Commit the recorded results**

```bash
git commit docs/superpowers/plans/2026-07-18-sveltia-backend-rework.md -m "docs: record i18n spike results for workshop schema rework"
```

## Spike results (Task 4)

- Decision: **GO**
- Frozen sample (`content/_spike/probe.yaml` after the bilingual round-trip, before the canary (c)/(d) follow-up saves):
  ```yaml
  de:
    slug: probe
    status: upcoming
    card:
      heading: hallo
      items:
        - text: test
  en:
    card:
      heading: translation
      items:
        - text: translation
        - text: text
  ```
- (b) non-i18n fields land: **under `de:`** (both `slug` and `status`, declared `i18n: false` in the spike schema, appear inside the `de:` block, not at the top level).
- (c) locale toggling: disabling the EN locale and saving cleanly removed the `en:` block; the `de:` block (including its content) was left intact, no corruption.
- (d) unknown fields preserved on save: **nuanced — depends on nesting.** A stray `zzz_canary: keep-me` field added at the **top level** (outside `de:`/`en:`) was **dropped** on the next save. The same stray field added **nested inside `de:`** **survived** the save (reordered to the end of the block, but present). → Since Task 5's real schema stores all head fields and content fields under the locale blocks (nothing at the true top level), this is the case that applies to Task 6: fields belonging to the *other* layout variant (e.g. archive-only `team`/`faq` data sitting under `de:` when an entry is opened through the filtered "Workshops" collection, which doesn't declare those fields) should survive a save the same way. Task 6 **proceeds** without the data-loss caveat.
- (e) nested summary works: **yes** — the entry list showed the card heading ("hallo"), not a fallback to the slug.

---

### Task 5 (GO branch): Workshops collection rewrite — native i18n, one field tree

Replaces the duplicated `de:`/`en:` schema trees (~430 lines) with one i18n-annotated tree (~200 lines), applies collapse/summary patterns, moves SEO last, migrates the two content files, and teaches the Eleventy loader the new head-field location.

**If Task 4 recorded NO-GO, skip to Task 5-ALT instead.**

**Files:**
- Modify: `admin/config.yml` (replace the whole `workshops` collection, lines ~640–1097)
- Create: `scripts/migrate-workshops-i18n.js`
- Modify: `eleventy.config.js` (`loadWorkshopContent`, lines ~255–304)
- Modify: `content/workshops/cellular-touch.yaml`, `content/workshops/bewegungsrevolution.yaml` (via the script)

**Interfaces:**
- Consumes: frozen sample from Task 4 — if canary (b) said non-i18n fields stay **top-level**, skip the file migration entirely (files already match) and only do Steps 1, 4, 5, 6.
- Produces: workshop content files where head fields live under `de:`; `loadWorkshopContent` reading head fields from either location (`raw[key] ?? de[key]`). Task 6 builds on this collection definition.

- [ ] **Step 1: Replace the `workshops` collection in `admin/config.yml`**

Replace everything from `- name: workshops` to the end of the file with:

```yaml
  - name: workshops
    label: Workshops
    folder: content/workshops
    create: true
    extension: yaml
    format: yaml
    identifier_field: slug
    slug: '{{slug}}'
    summary: '{{fields.card.title}}'   # remove this line if spike canary (e) was "no"
    i18n:
      structure: single_file
      locales: [de, en]
      default_locale: de
      initial_locales: [de]
    fields:
      # ── Einstellungen & Logistik ─────────────────────────────
      - { name: slug, label: Slug/URL, widget: string, i18n: false, hint: 'Beispiel: cellular-touch ergibt cellular-touch.html' }
      - name: language_mode
        label: Sprachversionen der Detailseite
        widget: select
        i18n: false
        options:
          - { label: Deutsch, value: de_only }
          - { label: Englisch, value: en_only }
          - { label: Deutsch & Englisch, value: bilingual }
        default: de_only
      - name: layout_variant
        label: Layout
        widget: select
        i18n: false
        options:
          - { label: Standard-Workshop, value: standard }
          - { label: Archivierter Kursblock, value: course_series }
        default: standard
      - { name: status, label: Status, widget: select, options: [draft, upcoming, current, past], default: upcoming, i18n: false }
      - { name: detail_page, label: Detailseite veröffentlichen, widget: boolean, default: true, i18n: false, hint: 'Die Seite wird erst gebaut, wenn SEO, Hero, Praxis-Intro und Info-Karte ausgefüllt sind; bis dahin erscheint nur die Programm-Karte.' }
      - { name: start_date, label: Startdatum, widget: datetime, i18n: false }
      - { name: sort_order, label: Sortierung bei gleichem Datum, widget: number, required: false, value_type: int, i18n: false }
      - { name: registration_url, label: Anmeldelink, widget: string, i18n: false }
      # ── Inhalt ───────────────────────────────────────────────
      - name: card
        label: Programm-Karte
        widget: object
        collapsed: true
        i18n: true
        fields:
          - name: tags
            label: Tags
            widget: list
            collapsed: true
            minimize_collapsed: true
            summary: '{{fields.label}}'
            i18n: true
            fields:
              - { name: label, label: Text, widget: string, i18n: true }
              - { name: style, label: Stil, widget: select, options: [default, moss], default: default, i18n: true }
          - { name: title, label: Titel, widget: string, required: false, i18n: true }
          - { name: subtitle, label: Untertitel, widget: string, required: false, i18n: true }
          - { name: summary, label: Kurzbeschreibung, widget: text, required: false, i18n: true }
          - { name: date, label: Datumstext, widget: string, required: false, i18n: true }
          - { name: location, label: Ort, widget: string, required: false, i18n: true }
          - { name: price, label: Preis, widget: string, required: false, i18n: true }
          - { name: duration, label: Dauer, widget: string, required: false, i18n: true }
          - { name: register_label, label: Anmeldebutton, widget: string, required: false, i18n: true }
          - { name: detail_label, label: Detailbutton, widget: string, required: false, i18n: true }
      - name: nav
        label: Navigation
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: breadcrumb, label: Breadcrumb, widget: string, required: false, i18n: true }
      - name: hero
        label: Hero
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: badge, label: Badge, widget: string, required: false, i18n: true }
          - { name: heading, label: Überschrift, widget: string, required: false, i18n: true, hint: 'HTML wie <br> und <span> ist erlaubt.' }
          - { name: heading_text, label: 'Überschrift (Text für Sprachumschaltung)', widget: string, required: false, i18n: true }
          - { name: subtitle, label: Untertitel, widget: text, required: false, i18n: true }
          - { name: cta_label, label: Button, widget: string, required: false, i18n: true }
          - { name: cta_href, label: Button-Link, widget: string, required: false, i18n: true }
          - { name: cta_note, label: Button-Hinweis, widget: text, required: false, i18n: true }
          - { name: video, label: Video, widget: file, required: false, i18n: true }
          - { name: video_poster, label: Video-Standbild, widget: image, required: false, i18n: true }
          - name: details
            label: Eckdaten
            widget: list
            collapsed: true
            minimize_collapsed: true
            summary: '{{fields.text}}'
            required: false
            i18n: true
            fields:
              - { name: icon, label: Icon, widget: select, options: [calendar, clock, location, cost], default: calendar, i18n: true }
              - { name: text, label: Text, widget: string, i18n: true }
          - { name: visual_aria, label: Bildgruppe ARIA, widget: string, required: false, i18n: true }
          - { name: main_image, label: Hauptbild, widget: image, required: false, i18n: true }
          - { name: main_alt, label: Hauptbild Alt-Text, widget: string, required: false, i18n: true }
          - { name: inset_image, label: Nebenbild, widget: image, required: false, i18n: true }
          - { name: inset_alt, label: Nebenbild Alt-Text, widget: string, required: false, i18n: true }
          - { name: note_title, label: Bildnotiz Titel, widget: string, required: false, i18n: true }
          - { name: note_text, label: Bildnotiz Text, widget: text, required: false, i18n: true }
      - name: practice
        label: Praxis-Intro
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: label, label: Label, widget: string, required: false, i18n: true }
          - { name: heading, label: Überschrift, widget: string, required: false, i18n: true }
          - name: paragraphs
            label: Absätze
            widget: list
            collapsed: true
            minimize_collapsed: true
            required: false
            i18n: true
            field: { name: text, label: Absatz, widget: text }
      - name: info
        label: Info-Karte
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: title, label: Titel, widget: string, required: false, i18n: true }
          - name: rows
            label: Zeilen
            widget: list
            collapsed: true
            minimize_collapsed: true
            summary: '{{fields.label}}'
            required: false
            i18n: true
            fields:
              - { name: icon, label: Icon, widget: select, options: [plus, calendar, location, cost, clock, people], default: plus, i18n: true }
              - { name: label, label: Label, widget: string, i18n: true }
              - name: values
                label: Werte
                widget: list
                i18n: true
                field: { name: value, label: Wert, widget: string }
          - { name: cta_label, label: Button, widget: string, required: false, i18n: true }
      - name: research
        label: Forschungsfelder
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: label, label: Label, widget: string, required: false, i18n: true }
          - { name: heading, label: Überschrift, widget: string, required: false, i18n: true }
          - name: fields
            label: Karten
            widget: list
            collapsed: true
            minimize_collapsed: true
            summary: '{{fields.number}} — {{fields.title}}'
            required: false
            i18n: true
            fields:
              - { name: number, label: Nummer, widget: string, i18n: true }
              - { name: title, label: Titel, widget: string, i18n: true }
              - { name: text, label: Text, widget: text, i18n: true }
              - { name: highlighted, label: Hervorheben, widget: boolean, required: false, default: false, i18n: true }
      - name: image_band
        label: Bildband
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: label, label: Label, widget: string, required: false, i18n: true }
          - { name: heading, label: Überschrift, widget: string, required: false, i18n: true }
          - { name: text, label: Text, widget: text, required: false, i18n: true }
          - { name: image, label: Bild, widget: image, required: false, i18n: true }
          - { name: alt, label: Alt-Text, widget: string, required: false, i18n: true }
      - name: facilitator
        label: Leitung
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: label, label: Label, widget: string, required: false, i18n: true }
          - { name: name, label: Name, widget: string, required: false, i18n: true }
          - { name: image, label: Bild, widget: image, required: false, i18n: true }
          - { name: image_alt, label: Bild Alt-Text, widget: string, required: false, i18n: true }
          - { name: role, label: Rolle, widget: string, required: false, i18n: true }
          - { name: bio, label: Bio, widget: text, required: false, i18n: true }
      - name: testimonial
        label: Zitat
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: quote, label: Zitat, widget: text, required: false, i18n: true }
          - { name: author, label: 'Autor:in', widget: string, required: false, i18n: true }
      # ── Nur Archiv-Layout (Kursblock) ────────────────────────
      - { name: quote, label: Archiv-Zitat, widget: text, required: false, i18n: true }
      - name: testimonials
        label: Feedback (Archiv)
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: label, label: Label, widget: string, required: false, i18n: true }
          - { name: heading, label: Überschrift, widget: string, required: false, i18n: true }
          - name: items
            label: Zitate
            widget: list
            collapsed: true
            minimize_collapsed: true
            summary: '{{fields.author}}'
            required: false
            i18n: true
            fields:
              - { name: quote, label: Zitat, widget: text, i18n: true }
              - { name: author, label: Name, widget: string, i18n: true }
      - name: team
        label: Team (Archiv)
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: label, label: Label, widget: string, required: false, i18n: true }
          - { name: heading, label: Überschrift, widget: string, required: false, i18n: true }
          - name: members
            label: Personen
            widget: list
            collapsed: true
            minimize_collapsed: true
            summary: '{{fields.name}}'
            required: false
            i18n: true
            fields:
              - { name: name, label: Name, widget: string, i18n: true }
              - { name: image, label: Bild, widget: image, i18n: true }
              - { name: alt, label: Alt-Text, widget: string, i18n: true }
              - { name: role, label: Rolle, widget: string, i18n: true }
              - { name: bio, label: Bio, widget: text, i18n: true }
      - name: faq
        label: FAQ (Archiv)
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: label, label: Label, widget: string, required: false, i18n: true }
          - { name: heading, label: Überschrift, widget: string, required: false, i18n: true }
          - name: items
            label: Fragen
            widget: list
            collapsed: true
            minimize_collapsed: true
            summary: '{{fields.q}}'
            required: false
            i18n: true
            fields:
              - { name: q, label: Frage, widget: string, i18n: true }
              - { name: a, label: Antwort, widget: text, i18n: true }
      - name: archive_cta
        label: CTA (Archiv)
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: label, label: Label, widget: string, required: false, i18n: true }
          - { name: heading, label: Überschrift, widget: string, required: false, i18n: true }
          - { name: text, label: Text, widget: text, required: false, i18n: true }
          - { name: button, label: Button, widget: string, required: false, i18n: true }
          - { name: href, label: Link, widget: string, required: false, i18n: true }
      - name: funded_by
        label: Förderung (Archiv)
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: label, label: Label, widget: string, required: false, i18n: true }
          - { name: image, label: Logo, widget: image, required: false, i18n: true }
          - { name: alt, label: Alt-Text, widget: string, required: false, i18n: true }
      - name: footer
        label: Footer-Sonderfall (Archiv)
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: connect_heading, label: Überschrift Verbinden, widget: string, required: false, i18n: true }
      # ── SEO zuletzt ──────────────────────────────────────────
      - name: meta
        label: 'SEO & Vorschau (zuletzt prüfen)'
        widget: object
        collapsed: true
        required: false
        i18n: true
        fields:
          - { name: title, label: Seitentitel, widget: string, required: false, i18n: true }
          - { name: description, label: Beschreibung, widget: text, required: false, i18n: true }
          - { name: og_title, label: Social Title, widget: string, required: false, i18n: true }
          - { name: og_description, label: Social Beschreibung, widget: text, required: false, i18n: true }
          - { name: og_image, label: Social Bild, widget: image, required: false, i18n: true }
          - { name: og_image_width, label: Bildbreite, widget: number, required: false, value_type: int, i18n: true }
          - { name: og_image_height, label: Bildhöhe, widget: number, required: false, value_type: int, i18n: true }
```

Parse check: `node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"` → `OK`.

- [ ] **Step 2: Write the content migration script**

Only needed if spike canary (b) said non-i18n fields live **under `de:`**. Create `scripts/migrate-workshops-i18n.js`:

```js
// One-time migration: move workshop head fields (slug, status, dates, …)
// from the top level into the default locale block, matching the shape
// Sveltia's single_file i18n writes (frozen in the 2026-07-18 spike).
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const HEAD_KEYS = [
  "slug", "language_mode", "layout_variant", "status", "detail_page",
  "start_date", "sort_order", "registration_url",
];

const dir = path.join(__dirname, "..", "content", "workshops");
for (const filename of fs.readdirSync(dir)) {
  if (!filename.endsWith(".yaml")) continue;
  const file = path.join(dir, filename);
  // CORE_SCHEMA keeps dates like `2026-08-08` as plain strings.
  const data = yaml.load(fs.readFileSync(file, "utf8"), { schema: yaml.CORE_SCHEMA });
  if (!HEAD_KEYS.some((key) => key in data)) {
    console.log(`skip (already migrated): ${filename}`);
    continue;
  }
  const de = {};
  for (const key of HEAD_KEYS) {
    if (key in data) de[key] = data[key];
  }
  // layout_variant must be explicit for Task 6's filtered views.
  if (de.layout_variant === undefined) de.layout_variant = "standard";
  Object.assign(de, data.de || {});
  const out = { de };
  if (data.en) out.en = data.en;
  fs.writeFileSync(file, yaml.dump(out, { lineWidth: -1, noRefs: true, schema: yaml.CORE_SCHEMA }));
  console.log(`migrated: ${filename}`);
}
```

If canary (b) said fields stay **top-level**, skip this script but still add `layout_variant: standard` to `content/workshops/cellular-touch.yaml` by hand (one line after `slug:`) — Task 6's filter needs it explicit.

- [ ] **Step 3: Run the migration**

```bash
node scripts/migrate-workshops-i18n.js
```

Expected: `migrated: bewegungsrevolution.yaml`, `migrated: cellular-touch.yaml`. Inspect `git diff content/workshops/cellular-touch.yaml` — head keys now sit under `de:`, the `en:` block is unchanged apart from formatting.

- [ ] **Step 4: Update `loadWorkshopContent` in `eleventy.config.js`**

Replace the `.map((filename) => { ... })` body (currently lines ~262–292) with:

```js
    .map((filename) => {
      const raw = yaml.load(fs.readFileSync(path.join(dir, filename), "utf8"));
      const deSource = isObject(raw.de) ? raw.de : {};
      const enSource = isObject(raw.en) ? raw.en : {};
      // Head fields live at the top level (legacy shape) or under the default
      // locale (Sveltia single_file i18n) — accept both.
      const HEAD_KEYS = [
        "slug", "language_mode", "layout_variant", "status", "detail_page",
        "start_date", "sort_order", "registration_url",
      ];
      const head = {};
      for (const key of HEAD_KEYS) {
        head[key] = raw[key] !== undefined ? raw[key] : deSource[key];
      }
      const deRaw = { ...deSource };
      const enRaw = { ...enSource };
      for (const key of HEAD_KEYS) {
        delete deRaw[key];
        delete enRaw[key];
      }
      const slug = normalizeSlug(head.slug || path.basename(filename, ".yaml"));
      const layoutVariant = head.layout_variant || "standard";
      const languageMode = head.language_mode || "bilingual";
      const preferred = languageMode === "en_only" ? enRaw : deRaw;
      const alternate = languageMode === "en_only" ? deRaw : enRaw;
      const fallback = hasWorkshopContent(preferred) ? preferred : alternate;
      const de = deepMerge(fallback, deRaw);
      const en = deepMerge(fallback, enRaw);
      const primaryLocale = languageMode === "en_only" ? "en" : "de";
      const primaryData = primaryLocale === "en" ? en : de;
      const hasDetailPage = head.detail_page !== false && head.status !== "draft" && hasWorkshopDetailContent(primaryData, layoutVariant);
      return {
        ...head,
        slug,
        layout_variant: layoutVariant,
        language_mode: languageMode,
        has_de: languageMode !== "en_only",
        has_en: languageMode !== "de_only",
        has_detail_page: hasDetailPage,
        primary_locale: primaryLocale,
        registration_url: normalizeExternalUrl(head.registration_url),
        de,
        en,
        href: `${slug}.html`,
      };
    })
```

(The trailing `.sort(...)` and the `return { all, listed, pages }` stay unchanged — they read `start_date`, `sort_order`, `status`, which `...head` provides.)

- [ ] **Step 5: Verify the build is byte-identical**

```bash
npm run build && diff -r -x admin _site "$BASE" && echo BUILD-IDENTICAL
```

Expected: `BUILD-IDENTICAL`. If not, the diff pinpoints which field the loader lost — fix the loader, not the templates.

- [ ] **Step 6: Verify in the local CMS, including a save round-trip**

In `http://localhost:8081/admin/` → Workshops: entry list shows workshop titles (or slugs if nested summary was a no). Open Cellular Touch: one compact form — 8 head fields, then collapsed sections, SEO last; the DE/EN locale switcher appears at the top; EN pane shows the English card/meta/hero content. Press Save without changes, then:

```bash
npm run build && diff -r -x admin _site "$BASE" && echo ROUNDTRIP-OK
```

Expected: `ROUNDTRIP-OK` (formatting may churn in `content/`, rendered output must not).

- [ ] **Step 7: Commit**

```bash
git commit admin/config.yml scripts/migrate-workshops-i18n.js eleventy.config.js content/workshops -m "cms: single i18n workshop schema replacing duplicated de/en trees"
```

---

### Task 5-ALT (NO-GO branch): collapse the existing dual-tree workshop schema

Only if Task 4 recorded NO-GO. Keeps the manual `de:`/`en:` objects and file shape exactly as they are; removes the config duplication with a YAML anchor and applies the collapse patterns.

**Files:**
- Modify: `admin/config.yml` (workshops collection only)

- [ ] **Step 1: De-duplicate via YAML anchor**

Sveltia's YAML parser resolves standard anchors/aliases. Anchor the DE fields list and alias it for EN (labels stay German in both panes — the editors are German-speaking; this is the accepted trade-off of NO-GO):

```yaml
      - name: de
        label: Deutsch
        widget: object
        collapsed: true
        required: false
        fields: &workshop_locale_fields
          - name: card
            label: Programm-Karte
            widget: object
            collapsed: true
            fields:
              # ... (existing de card fields, unchanged)
          # ... (all remaining existing de fields, unchanged)
      - name: en
        label: English
        widget: object
        collapsed: true
        required: false
        fields: *workshop_locale_fields
```

Delete the entire literal `en:` field tree (lines ~884–1097).

- [ ] **Step 2: Apply patterns A + B inside the anchored tree and move `meta` last**

Same tables as Task 5 Step 1: `collapsed: true` on every section object (`card, meta, nav, hero, practice, info, research, image_band, facilitator, testimonial, testimonials, team, faq, archive_cta, funded_by, footer`); `collapsed: true` + `minimize_collapsed: true` + the same `summary` strings on the lists (`card.tags`, `hero.details`, `info.rows`, `research.fields`, `testimonials.items`, `team.members`, `faq.items`); move `meta` to the end of the anchored list with label `'SEO & Vorschau (zuletzt prüfen)'`.

- [ ] **Step 3: Verify + commit**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"
```

Local CMS: open Cellular Touch — the form is now two collapsed locale objects that expand into collapsed section lists. No build or content changes to verify.

```bash
git commit admin/config.yml -m "cms: collapse and de-duplicate workshop schema (anchor fallback)"
```

---

### Task 6: Split workshop editing views — "Workshops" vs "Workshop-Archiv"

Two collections over the same `content/workshops` folder, filtered by `layout_variant`, so a standard workshop form never shows the seven archive sections and vice versa. Skip only the section groups; head fields and shared sections appear in both.

**Files:**
- Modify: `admin/config.yml` (workshops collection → two filtered collections)

**Interfaces:**
- Consumes: Task 5's collection definition (or 5-ALT's) and spike canary (d) (unknown-field preservation).

- [ ] **Step 1: Spike the filter against the migrated file shape (5 minutes, not committed)**

Temporarily add `filter: { field: layout_variant, value: standard }` to the workshops collection, reload the local CMS, and confirm the entry list shows **only** Cellular Touch (i.e., the filter resolves `layout_variant` in its post-Task-5 location). If the list shows nothing, the filter can't see the field where it now lives — **stop, keep one unfiltered collection, revert, and record that in this plan file**; the collapsed archive sections from Task 5 remain the mitigation.

- [ ] **Step 2: Split the collection**

Convert the single `workshops` collection into two. Use YAML anchors so shared field blocks are written once — anchor each shared field in the first collection and alias it in the second:

```yaml
  - name: workshops
    label: Workshops
    folder: content/workshops
    create: true
    extension: yaml
    format: yaml
    identifier_field: slug
    slug: '{{slug}}'
    summary: '{{fields.card.title}}'
    filter: { field: layout_variant, value: standard }
    i18n: &workshops_i18n
      structure: single_file
      locales: [de, en]
      default_locale: de
      initial_locales: [de]
    fields:
      - &ws_slug { name: slug, label: Slug/URL, widget: string, i18n: false, hint: 'Beispiel: cellular-touch ergibt cellular-touch.html' }
      - &ws_language_mode
        name: language_mode
        # ... (field exactly as in Task 5, with the anchor added)
      - &ws_layout_variant
        name: layout_variant
        # ... (as in Task 5; hint: 'Auf "Archivierter Kursblock" stellen verschiebt den Eintrag ins Workshop-Archiv.')
      - &ws_status { name: status, label: Status, widget: select, options: [draft, upcoming, current, past], default: upcoming, i18n: false }
      - &ws_detail_page { name: detail_page, ... }      # as in Task 5
      - &ws_start_date { name: start_date, ... }        # as in Task 5
      - &ws_sort_order { name: sort_order, ... }        # as in Task 5
      - &ws_registration_url { name: registration_url, ... }  # as in Task 5
      - &ws_card
        name: card
        # ... (entire card object as in Task 5)
      - &ws_nav
        name: nav
        # ... (as in Task 5)
      - &ws_hero
        name: hero
        # ... (as in Task 5)
      - name: practice
        # ... (standard-only sections stay unanchored: practice, info, image_band, facilitator, testimonial)
      - &ws_research
        name: research
        # ... (as in Task 5)
      - &ws_meta
        name: meta
        # ... (as in Task 5, stays last)

  - name: workshops_archiv
    label: Workshop-Archiv
    folder: content/workshops
    create: false
    extension: yaml
    format: yaml
    identifier_field: slug
    slug: '{{slug}}'
    summary: '{{fields.card.title}}'
    filter: { field: layout_variant, value: course_series }
    i18n: *workshops_i18n
    fields:
      - *ws_slug
      - *ws_language_mode
      - *ws_layout_variant
      - *ws_status
      - *ws_detail_page
      - *ws_start_date
      - *ws_sort_order
      - *ws_registration_url
      - *ws_card
      - *ws_nav
      - *ws_hero
      - *ws_research
      - name: quote
        label: Archiv-Zitat
        widget: text
        required: false
        i18n: true
      # ... then the archive-only sections exactly as written in Task 5:
      # testimonials, team, faq, archive_cta, funded_by, footer
      - *ws_meta
```

Concretely: the standard view = Task 5's field list **minus** `quote, testimonials, team, faq, archive_cta, funded_by, footer`; the archive view = Task 5's list **minus** `practice, info, image_band, facilitator, testimonial`. Every field definition is Task 5's text verbatim — the anchors just avoid writing shared ones twice. (On the 5-ALT branch, apply the same split with the head fields top-level and the locale-object anchor from 5-ALT.)

- [ ] **Step 3: Data-safety check (uses spike canary d)**

If canary (d) said Sveltia **preserves** unknown fields on save: nothing further. If it **drops** them: confirm the current files don't mix variants (verified 2026-07-18: cellular-touch has zero archive sections, bewegungsrevolution has zero standard-only sections), and add this hint to both `layout_variant` fields so the constraint is visible to future editors/agents: `hint: 'Nicht zwischen Layouts wechseln, wenn bereits Inhalte für das andere Layout bestehen — Felder des jeweils anderen Layouts werden beim Speichern entfernt.'`

- [ ] **Step 4: Verify**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"
```

Local CMS: sidebar shows **Workshops** (Cellular Touch only) and **Workshop-Archiv** (Bewegungsrevolution only). Open each — the standard form has no archive sections; the archive form has no practice/info/facilitator sections. Save Cellular Touch once, then `npm run build && diff -r -x admin _site "$BASE"` → identical.

- [ ] **Step 5: Commit**

```bash
git commit admin/config.yml -m "cms: split workshop editing into standard and archive views"
```

---

### Task 7: Editor + agent documentation

**Files:**
- Modify: `EDITING.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update EDITING.md**

Read `EDITING.md` first and update every section that describes the old editing experience. New content to cover (in the file's existing tone/language):
- Sections are now collapsed — click a section header (Hero, Programm-Karte, …) to open it; "SEO & Vorschau" is always the last section.
- Lists (Karten, Personen, FAQ, Stufen) show one compact row per item; drag rows to reorder, click to expand.
- Workshops: DE/EN are edited via the language switcher at the top of the entry (GO branch) — not two separate blocks; EN can be enabled/disabled per workshop there. (On NO-GO: DE/EN remain two collapsible blocks.)
- Workshops vs Workshop-Archiv: current workshops live under "Workshops"; archived course blocks under "Workshop-Archiv". Setting Layout to "Archivierter Kursblock" moves an entry to the archive view. Include the layout-switch data caveat if Task 6 Step 3 recorded that Sveltia drops unknown fields.

- [ ] **Step 2: Update CLAUDE.md's site-architecture notes**

Append to the "Site architecture" section:

```markdown
- Workshop schema (post 2026-07 rework): `admin/config.yml` defines the
  workshop fields once with Sveltia i18n (`structure: single_file`); head
  fields (slug, status, dates, …) are stored under the default locale `de:`
  in `content/workshops/*.yaml`, and `loadWorkshopContent` in
  `eleventy.config.js` accepts both the legacy top-level and the nested
  location. Two filtered collections ("Workshops", "Workshop-Archiv") edit
  the same folder, split by `layout_variant`.
```

(Adjust to match reality if Task 5-ALT or the Task 6 filter fallback was taken.)

- [ ] **Step 3: Commit**

```bash
git commit EDITING.md CLAUDE.md -m "docs: describe reworked CMS editing experience"
```

---

## Deferred / rejected (do not implement without a new decision)

- **People/Facilitators relation collection** — bios are intentionally page-specific (verified team.yaml vs montagskurs.yaml, 2026-07-18). Revisit only if guest facilitators appear on 3+ pages.
- **Variable-type page builder** — conflicts with the fixed-design templates; would require template block-loops + full content migration.
- **Tag/category taxonomy** — over-modeling at current scale.
- **Sveltia upgrade** past 0.171.1 — separate task if ever needed (new dist download + filename bump per `admin/index.html` comment).

## Rollout note

Each task is deployable on its own: config-only tasks (2, 3, 6) change nothing about the build; tasks 5's commit is atomic (schema + migration + loader together) so the CMS and the files never disagree on the shape. Pushing to `production` triggers the Pages deploy; the `_site` diff gate guarantees visitors see no change.
