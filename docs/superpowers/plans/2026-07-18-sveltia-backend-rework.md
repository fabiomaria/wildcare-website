# Sveltia CMS Backend Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kill the CMS scroll fatigue — collapse every section, add drag-and-drop list summaries, de-duplicate the workshop DE/EN schema via Sveltia's native i18n — and (added 2026-07-18, post-spike) unify the two workshop rendering templates into one, abolishing the separate "archive" layout.

> **Amendment (2026-07-18, after Task 4's GO decision):** Task 5's original scope was CMS-schema-only (dedupe the field tree, leave both `site/workshop.njk` and `site/_includes/partials/workshop-course-series.njk` rendering as before). The owner decided instead to **merge the two templates into one**, adopt the sitewide live DE/EN toggle (`data-de`/`data-en` + `js/i18n.js`) for all workshop content instead of the current single-locale-server-render, and selectively generalize a few of the archive layout's sections (hero detail chips, optional video hero, multi-item testimonials, multi-person facilitators, optional FAQ) into the standard template. Task 6 (splitting Workshops/Workshop-Archiv editing views) is **superseded and removed** — see "Deferred / rejected" for why. This is a bigger, riskier change than the rest of this plan: it touches templates (previously out of scope) and **rendered output will change** for Bewegungsrevolution specifically (see the updated Global Constraints below).

**Architecture:** Most work happens in `admin/config.yml` (the Sveltia schema). Task 5 additionally touches `eleventy.config.js`, `site/workshop.njk`, and deletes `site/_includes/partials/workshop-course-series.njk` — a deliberate, scoped exception to "templates are not touched," approved 2026-07-18. Verification is: YAML parse check + Sveltia local-repository smoke test + `_site/` build diff against a baseline snapshot, **except for the workshop template changes in Task 5**, where a byte-diff isn't a meaningful check at all — switching from single-locale server-render to dual `data-de`/`data-en` markup changes the raw HTML for *every* workshop, including Cellular Touch, even though nothing a visitor sees should change for it. Task 5 is verified by manual visual review instead: Cellular Touch's rendered appearance (initial language, hero, all sections, layout) should look and behave like today's page; Bewegungsrevolution's is expected to visibly change (new template, some content intentionally dropped) and is reviewed for acceptability rather than equivalence.

**Tech Stack:** Sveltia CMS 0.171.1 (self-hosted, pinned at `admin/sveltia-cms-0.171.1.js`), Eleventy 11ty (Nunjucks), js-yaml, GitHub Pages deploy from `production`.

## Global Constraints

- Branch: **`production`** — verify `git branch --show-current` prints `production` before every task. Never base work on `main`.
- Commit **with explicit pathspec only** (`git commit path -m "..."`), never bare `git commit`.
- `css/styles.css` is never edited; no new CSS files; no inline `style="..."` attributes. (Task 5's video-hero addition reuses classes that already exist in `css/styles.css` from the current Bewegungsrevolution page — verified 2026-07-18 — so this holds without exception.)
- Rendered output must stay identical for every task **except Task 5's workshop template unification**: after any other task that touches `content/` or `eleventy.config.js`, `_site/` must diff clean against the baseline (excluding `_site/admin/`, which mirrors the config we're editing). Task 5 cannot use a byte-diff at all (see Architecture above) — it's verified by manual visual review: Cellular Touch should look/behave like today's page, Bewegungsrevolution is expected to visibly change.
- Schema before templates: templates conform to schema, never invent variables not in the schema.
- Sveltia stays pinned at 0.171.1. Do **not** upgrade the bundle as part of this work. Note: `divider` is **not** a real field-widget type in this pinned bundle (confirmed during Task 3 — it's a collection-list-level config key only); Task 3 omitted it rather than using it.
- `worker/`, `worker-kontakt/`, `worker-auth/` are out of scope. `js/i18n.js` itself (the toggle mechanism/logic) is out of scope and not modified — but as of the 2026-07-18 amendment, workshop templates now **produce** `data-de`/`data-en` markup that `js/i18n.js` toggles, the same pattern already used by `index.html`, `team.html`, etc.
- The Wurzel-tier `60+`/`50+` mismatch on mitmachen stays as-is.

---

## Current state (why each task exists)

`admin/config.yml` (1,097 lines) has:

1. **Zero collapse/summary configuration.** Every `object` and `list` renders fully expanded → the "endless vertical column" the owner complained about.
2. **The `workshops` collection duplicates its entire field tree** under `de:` (lines ~670–883) and `en:` (lines ~884–1097) instead of using Sveltia i18n. The content files (`content/workshops/*.yaml`) already store `de:`/`en:` top-level keys — exactly the shape Sveltia's `structure: single_file` i18n writes — so native i18n is within reach.
3. ~~**Archive-only sections pollute every workshop form.**~~ **Superseded 2026-07-18:** the original plan was to keep both templates and split the *editing* views (Task 6). The owner instead chose to unify the two templates and generalize a curated subset of the archive layout's sections into the standard one — see the new decision row below. (Historical note, still accurate as of 2026-07-17: the `course_series` layout used `quote, testimonials, team, faq, archive_cta, funded_by, footer`; `standard` used `practice, info, image_band, facilitator, testimonial`; both shared `card, meta, nav, hero, research`.)
4. **`meta` (SEO) is the first field on every page** — editors scroll past it every time.

## Decisions (including what we're NOT doing, and why)

| Gemini recommendation | Decision | Reason |
|---|---|---|
| Collapsible repeaters + dynamic summaries | ✅ Do (Tasks 2, 3, 5) | Pure config win, zero migration risk. |
| Tabs / sidebar layout | ✅ Emulate (Tasks 2, 3, 5) | Sveltia has no tabs. Collapsed section objects + moving SEO last gives the "TOC of sections" feel. (Not `divider` widgets — confirmed during Task 3 that `widget: divider` isn't a real field type in the pinned bundle; omitted there.) |
| De-duplicate DE/EN via native i18n | ✅ Do, gated on a verification spike (Tasks 4, 5) | Halves the workshop schema and gives editors Sveltia's locale switcher instead of two giant stacked objects. Gated because the exact YAML shape Sveltia writes for `single_file` + non-i18n fields must be frozen first (same "schema contract" discipline as the original migration brief). **Spike ran 2026-07-18, decision: GO** — see "Spike results (Task 4)" below. |
| ~~Split editing views (standard vs archive workshops)~~ | ❌ **Superseded 2026-07-18, Task 6 removed** | Was: two `filter`-ed collections over one folder so standard/archive editors don't see each other's sections. No longer needed once the two *templates* are unified (see next row) — there's no more standard/archive distinction to filter on; every workshop just has some optional sections filled in or not. |
| **(2026-07-18) Unify `workshop.njk` and `workshop-course-series.njk` into one template; adopt sitewide live DE/EN toggle for workshop content** | ✅ Do (Task 5) | Owner's call: the "archive" concept (a one-off template forked off when Bewegungsrevolution was migrated from a standalone static page) isn't worth permanently maintaining two rendering paths for one historical program. Discriminating pick of what generalizes: hero detail chips (`hero.details`), optional video hero, testimonials-as-list (1-to-many), facilitators-as-list (1-to-many), optional FAQ section all get promoted into the standard template — verified 2026-07-18 that the video-hero CSS already exists sitewide, so this is low-risk. The quote-divider section, "archive CTA," and funded-by logos are judged one-off flourishes for that specific program and are **not** generalized — their data is dropped from Bewegungsrevolution's content during migration. Bilingual mechanism also unifies: single-locale-server-render is replaced by the sitewide `data-de`/`data-en` live-toggle pattern for all workshops; mono-lingual (`de_only`/`en_only`) workshops get a template-computed "German only"/"English only" badge shown when the visitor's toggle state doesn't match the authored language, rather than silently showing untranslated text. |
| Facilitators/People relation collection | ❌ Skip | Verified: the same two people have **intentionally different** roles/bios on team.yaml ("Gründer", association-level bio) vs montagskurs.yaml (course-level bio). This is contextual copy, not duplication — a single source of truth would destroy it. Only name/image/alt are shared (3 lines per person, 2 people, ~yearly churn). Not worth a collection + loader filter + template changes. Revisit if guest facilitators become frequent. (Still holds after the 2026-07-18 amendment — the new `facilitators` list field is per-workshop content, not a cross-page relation.) |
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

### Task 5 (GO branch): Workshops collection rewrite + template unification — native i18n, one field tree, one template

Replaces the duplicated `de:`/`en:` schema trees (~430 lines) with one i18n-annotated tree, applies collapse/summary patterns, moves SEO last, migrates the two content files, teaches the Eleventy loader the new head-field location — **and** (2026-07-18 amendment) merges `site/workshop.njk` and `site/_includes/partials/workshop-course-series.njk` into one template, deletes the archive partial, adopts the sitewide live DE/EN toggle for all workshop content, and generalizes a curated subset of the archive layout's sections into the standard one.

**If Task 4 recorded NO-GO, skip to Task 5-ALT instead** (5-ALT predates this amendment and does not include the template unification — if NO-GO, re-scope the template work separately before proceeding with it).

**Files:**
- Modify: `admin/config.yml` (replace the whole `workshops` collection)
- Create: `scripts/migrate-workshops-i18n.js`
- Modify: `eleventy.config.js` (`loadWorkshopContent`)
- Modify: `content/workshops/cellular-touch.yaml`, `content/workshops/bewegungsrevolution.yaml` (via the script)
- Modify: `site/workshop.njk` (major rewrite — see Step 6)
- Delete: `site/_includes/partials/workshop-course-series.njk` (see Step 7)

**Interfaces:**
- Consumes: frozen sample from Task 4 (canary (b): non-i18n fields land under `de:` — the migration script always reshapes accordingly, no top-level branch needed).
- Produces: workshop content files where head fields live under `de:`, content sections reshaped for the unified template (`facilitators`/`testimonials`/`faq` promoted to shared, singular `facilitator`/`testimonial` and `layout_variant`/`quote`/`archive_cta`/`funded_by`/`footer` retired); one `workshop.njk` rendering every workshop via the sitewide `data-de`/`data-en` toggle. Task 6 is removed (see Global Constraints amendment and "Deferred / rejected") — nothing downstream consumes this task's output.

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
    summary: '{{fields.card.title}}'
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
        hint: 'Bei "nur Deutsch"/"nur Englisch" zeigt die jeweils andere Sprachversion der Seite einen Hinweis statt einer Übersetzung.'
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
          - { name: video, label: 'Video (optional — falls leer, wird die Bildkombination unten verwendet)', widget: file, required: false, i18n: true }
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
      - name: facilitators
        label: Leitung
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
      - name: testimonials
        label: Stimmen
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
              - { name: author, label: 'Autor:in', widget: string, i18n: true }
      - name: faq
        label: 'FAQ (optional)'
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

Compared to the pre-amendment draft: `layout_variant` is gone (no more second template to route to); the standalone `facilitator`/`testimonial` objects are gone, replaced by the promoted `facilitators`/`testimonials` (both now list-based, 1-to-many); `faq` is promoted from archive-only to shared-optional; `quote` (Archiv-Zitat), `archive_cta`, `funded_by`, and `footer` (connect_heading special case) are dropped entirely — judged one-off flourishes for the retired archive layout, not worth generalizing (their content is dropped from Bewegungsrevolution's file in Step 3).

Parse check: `node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"` → `OK`.

- [ ] **Step 2: Write the content migration script**

Create `scripts/migrate-workshops-i18n.js`:

```js
// One-time migration: move workshop head fields (slug, status, dates, …)
// from the top level into the default locale block, matching the shape
// Sveltia's single_file i18n writes (frozen in the 2026-07-18 spike). Also
// reshapes content for the unified template (2026-07-18 amendment):
// facilitator → facilitators (list), team → facilitators, testimonial →
// testimonials (list); drops layout_variant/quote/archive_cta/funded_by/footer,
// retired along with the archive layout.
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const HEAD_KEYS = [
  "slug", "language_mode", "status", "detail_page",
  "start_date", "sort_order", "registration_url",
];
const DROPPED_LOCALE_KEYS = ["quote", "archive_cta", "funded_by", "footer"];

function reshapeLocale(locale) {
  if (!locale) return locale;
  const out = { ...locale };
  for (const key of DROPPED_LOCALE_KEYS) delete out[key];
  if (out.facilitator && !out.facilitators) {
    const f = out.facilitator;
    out.facilitators = {
      label: f.label || "",
      heading: "",
      members: [{ name: f.name, image: f.image, alt: f.image_alt, role: f.role, bio: f.bio }],
    };
    delete out.facilitator;
  }
  if (out.team && !out.facilitators) {
    out.facilitators = out.team;
    delete out.team;
  }
  if (out.testimonial && !out.testimonials) {
    const t = out.testimonial;
    out.testimonials = { label: "", heading: "", items: [{ quote: t.quote, author: t.author }] };
    delete out.testimonial;
  }
  return out;
}

const dir = path.join(__dirname, "..", "content", "workshops");
for (const filename of fs.readdirSync(dir)) {
  if (!filename.endsWith(".yaml")) continue;
  const file = path.join(dir, filename);
  // CORE_SCHEMA keeps dates like `2026-08-08` as plain strings.
  const data = yaml.load(fs.readFileSync(file, "utf8"), { schema: yaml.CORE_SCHEMA });
  const de = {};
  for (const key of HEAD_KEYS) {
    if (key in data) de[key] = data[key];
  }
  Object.assign(de, reshapeLocale(data.de) || {});
  const out = { de };
  if (data.en) out.en = reshapeLocale(data.en);
  fs.writeFileSync(file, yaml.dump(out, { lineWidth: -1, noRefs: true, schema: yaml.CORE_SCHEMA }));
  console.log(`migrated: ${filename}`);
}
```

- [ ] **Step 3: Run the migration**

```bash
node scripts/migrate-workshops-i18n.js
```

Expected: `migrated: bewegungsrevolution.yaml`, `migrated: cellular-touch.yaml`. Inspect `git diff content/workshops/cellular-touch.yaml` and `content/workshops/bewegungsrevolution.yaml` — head keys now sit under `de:`; `facilitator`→`facilitators`, `team`→`facilitators`, `testimonial`→`testimonials` reshaped correctly; `quote`/`archive_cta`/`funded_by`/`footer` are gone from Bewegungsrevolution's file. This is a deliberate, one-way content change (not a formatting-only churn like earlier tasks) — review the diff carefully before committing.

- [ ] **Step 4: Update `loadWorkshopContent` in `eleventy.config.js`**

Read the current function fully before editing (it's referenced here as it stood before this task; line numbers will have shifted). Update the `.map((filename) => { ... })` body:

```js
    .map((filename) => {
      const raw = yaml.load(fs.readFileSync(path.join(dir, filename), "utf8"));
      const deSource = isObject(raw.de) ? raw.de : {};
      const enSource = isObject(raw.en) ? raw.en : {};
      // Head fields live at the top level (legacy shape) or under the default
      // locale (Sveltia single_file i18n) — accept both.
      const HEAD_KEYS = [
        "slug", "language_mode", "status", "detail_page",
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
      const languageMode = head.language_mode || "bilingual";
      const preferred = languageMode === "en_only" ? enRaw : deRaw;
      const alternate = languageMode === "en_only" ? deRaw : enRaw;
      const fallback = hasWorkshopContent(preferred) ? preferred : alternate;
      const de = deepMerge(fallback, deRaw);
      const en = deepMerge(fallback, enRaw);
      const primaryLocale = languageMode === "en_only" ? "en" : "de";
      const primaryData = primaryLocale === "en" ? en : de;
      const hasDetailPage = head.detail_page !== false && head.status !== "draft" && hasWorkshopDetailContent(primaryData);
      return {
        ...head,
        slug,
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

The only functional change from before this amendment: `layout_variant` is dropped everywhere (no longer read, no longer returned) since there's one template now. `de`/`en` are unchanged — both were already full merged-locale trees (not single-locale slices), which is exactly what the unified template needs for the `data-de`/`data-en` toggle (Step 6 reads `workshop.de.*`/`workshop.en.*` directly, the same way `workshop-course-series.njk` already did). **Check `hasWorkshopDetailContent`'s current signature** — it takes a `layoutVariant` argument today; since there's only one layout, drop that parameter and adjust whatever section-list check it does internally (read its current body first, this plan doesn't have it captured verbatim).

(The trailing `.sort(...)` and the `return { all, listed, pages }` stay unchanged — they read `start_date`, `sort_order`, `status`, which `...head` provides.)

- [ ] **Step 5: Verify the loader change in isolation**

```bash
npm run build && diff -r -x admin _site "$BASE"
```

At this point (schema + content migrated, loader updated, but `workshop.njk` not yet touched) expect this diff to be **non-empty** — `layout_variant` is gone from the data but the *template* still checks `workshop.layout_variant == "course_series"` to route to the archive partial, so Bewegungsrevolution will silently fall through to the standard branch with half-migrated data. This is expected and transient; do not try to make it clean here — Step 6 replaces the template next. (This differs from every other task in this plan, where a non-empty diff mid-task means something is broken — here it's expected because the template hasn't caught up yet.)

- [ ] **Step 6: Rewrite `site/workshop.njk` — one template, live DE/EN toggle**

This is the highest-risk, most judgment-heavy step in the plan. Read both `site/workshop.njk` and `site/_includes/partials/workshop-course-series.njk` in full before starting (the latter is deleted in Step 7, but its markup is the source for everything reused here). Reuse its CSS classes and markup verbatim wherever possible — do not invent new classes (Global Constraint: `css/styles.css` is never edited; verified 2026-07-18 that all classes needed here already exist: `.detail-video-wrapper`, `.video-mute-btn`, `.icon-muted`/`.icon-unmuted`, `.workshop-hero-visual`, `.workshop-photo-main`/`.workshop-photo-inset`, `.workshop-visual-note`, `.detail-team-grid`, `.detail-testimonial-grid`, `.detail-faq-list`, all with responsive breakpoints already defined).

Changes to make:
1. **Remove the `{% if workshop.layout_variant == "course_series" %} {% include "partials/workshop-course-series.njk" %} {% else %} ... {% endif %}` branch entirely.** One body for every workshop.
2. **Switch body content from single-locale to dual-locale rendering.** Keep `primaryLocale`/`primaryData` from the loader (already computed as `en` for `en_only`, `de` otherwise) — this decides which locale's text is the *initial* visible content. Set `{%- set de = workshop.de -%}{%- set en = workshop.en -%}{%- set primary = workshop.primary_locale == "en" and en or de -%}` and convert every body field reference from `t.section.field` to the `data-de`/`data-en` toggle pattern already used throughout `workshop-course-series.njk`, but with the **visible** text sourced from `primary.*` instead of always `de.*` (e.g. `<h1 data-de="{{ de.hero.heading_text | attr }}" data-en="{{ en.hero.heading_text | attr }}">{{ primary.hero.heading | safe }}</h1>`). **Decided 2026-07-18:** Cellular Touch (`en_only`) initializes to English, matching today's behavior; a `de_only` or `bilingual` workshop initializes to German, matching the sitewide default. The `data-de`/`data-en` attributes are unconditional either way — a visitor can still toggle.
3. **Nav, footer, and `js/i18n.js`:** drop the `{% if workshop.language_mode == "en_only" %}` special-cased static-English nav/footer blocks and the `{% if workshop.language_mode != "en_only" %}` gate on loading `js/i18n.js`. Always use `{% include "partials/nav.njk" %}` and `{% include "partials/footer.njk" %}`, always load `js/i18n.js` — every workshop now behaves like the rest of the site (`index.html`, `team.html`, …), with the per-workshop initial-locale override from point 2 applied. **Verify before finalizing:** `js/i18n.js`'s stored language preference (`wc-lang` in `localStorage`) is sitewide, shared across every page — read `js/i18n.js` (out of scope to modify, but its behavior must be understood here) to confirm how it applies on page load. The per-workshop default in point 2 governs the server-rendered initial HTML (what a visitor with no stored preference yet sees, or what shows before JS runs) — confirm it doesn't fight a visitor's already-stored sitewide preference in some jarring way (e.g. page flashes German then swaps to English via JS) once `js/i18n.js` runs.
4. **Hero visual — optional video:** `{% if de.hero.video or en.hero.video %}` render the video markup (copied from `workshop-course-series.njk`'s `.detail-video-wrapper` block, including the mute-toggle button and its `<script>`) `{% else %}` render the current image-duo markup (`.workshop-hero-visual` / `.workshop-photo-main` / `.workshop-photo-inset` / `.workshop-visual-note`, converted to `data-de`/`data-en` for alt text) `{% endif %}`. Fix the mute button's hardcoded `aria-label="Ton ein/aus"` to `data-aria-de="Ton ein/aus"` / `data-aria-en="Toggle sound"` (this repo's convention for translated accessible names, per `js/i18n.js`'s `data-aria-de`/`data-aria-en` handling).
5. **Hero detail chips:** add the `hero.details` loop (copied from `workshop-course-series.njk`) unconditionally, iterating `primary.hero.details` (see point 2) with the alternate locale's item looked up by index for the `data-de`/`data-en` pair, same as `workshop-course-series.njk` already does for its own fields. Verify the loader/template don't error when a workshop (e.g. Cellular Touch) has no `hero.details` authored — confirm it resolves to an empty list, not `undefined`.
6. **Facilitators:** replace the single-facilitator block with `{% for member in primary.facilitators.members %}...{% endfor %}` (index-matched alternate-locale lookup for the toggle attrs, reuse `workshop-course-series.njk`'s team-grid markup/classes). Confirm `.detail-team-grid` etc. look right with exactly one member (Cellular Touch's case after migration) as well as several (a future multi-facilitator workshop).
7. **Testimonials:** replace the single-testimonial block with `{% for item in primary.testimonials.items %}...{% endfor %}` (same index-matched pattern, reuse the archive partial's testimonial-grid markup/classes).
8. **FAQ:** new optional section, `{% if primary.faq.items and primary.faq.items.length %}...{% endif %}`, copied verbatim from the archive partial.
9. **Language-availability badge:** for `workshop.language_mode != "bilingual"`, add a small `data-de`/`data-en` badge near the hero badge reading "Nur auf Deutsch" / "German only" (or the en_only equivalent) — shown so a visitor toggled to the language the workshop *wasn't* authored in sees an honest note instead of silently-untranslated (fallback) text. Exact copy and placement are a judgment call — verify visually once the hero markup is in place, and check whether the same badge should also appear on the workshop's card summary on the programme listing page (not just the detail page) for consistency.

- [ ] **Step 7: Delete the archive partial**

```bash
git rm site/_includes/partials/workshop-course-series.njk
```

- [ ] **Step 8: Verify — manual visual review, not a build diff**

A byte-diff against the baseline is not meaningful for this task (see the amended Global Constraints — the bilingual mechanism itself changed for every workshop). Instead:

```bash
npm run build
```

Expected: exits 0, no template errors. Then manually review in a browser (or, if none is available in this environment, read the generated `_site/cellular-touch.html` and `_site/bewegungsrevolution.html` directly):
- **Cellular Touch:** should look and behave like the current live page — same hero image-duo (no video authored), same practice/info/research/image_band sections, one facilitator shown, one testimonial shown, no FAQ section (none authored), no language-availability badge inappropriately shown (it's `en_only`, so the badge should appear only when toggled to DE).
- **Bewegungsrevolution:** video hero plays, hero detail chips show, multiple testimonials and multiple team members render via the new facilitators/testimonials lists, FAQ section renders. The quote-divider section, "archive CTA," and funded-by logo are gone (dropped by design) — confirm nothing looks broken or leaves an obvious visual gap where they used to be.

- [ ] **Step 9: Verify in the local CMS, including a save round-trip**

In `http://localhost:8081/admin/` → Workshops: entry list shows workshop titles. Open Cellular Touch: one compact form — 6 head fields (no more `layout_variant`), then collapsed sections, SEO last; the DE/EN locale switcher appears at the top. Press Save without changes, then re-run the Step 8 visual check — nothing should look different after a no-op save (content formatting may churn, rendered output must not).

- [ ] **Step 10: Commit**

Consider splitting into two commits (schema+migration+loader, then template) if that makes review easier — the plan's "commit with explicit pathspec" constraint applies to both either way:

```bash
git commit admin/config.yml scripts/migrate-workshops-i18n.js eleventy.config.js content/workshops -m "cms: single i18n workshop schema replacing duplicated de/en trees"
git commit site/workshop.njk -m "workshop: unify standard and archive templates, adopt live DE/EN toggle"
git rm site/_includes/partials/workshop-course-series.njk && git commit -m "workshop: remove retired archive template"
```

---

### Task 5-ALT (NO-GO branch): collapse the existing dual-tree workshop schema

**Moot — Task 4 recorded GO (2026-07-18), so this branch does not run.** Left in place for the historical record only. Note it also predates the template-unification amendment: if a future NO-GO situation ever revives this branch (e.g. an i18n structure change on a Sveltia upgrade), it would need its own pass to decide whether the unified-template work still applies on top of the dual-tree shape.

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

### Task 6: ~~Split workshop editing views~~ — REMOVED (2026-07-18)

**Superseded, do not implement.** This task existed to give standard and archive workshops separate CMS editing views (filtered on `layout_variant`) so editors of one type wouldn't see the other's irrelevant sections. Once Task 5's amendment unifies the *rendering* template and promotes `facilitators`/`testimonials`/`faq` to shared-optional fields for every workshop, there is no more standard/archive distinction left to filter on — every workshop is just "a workshop" with some optional sections filled in or not. Splitting the editing view would now be arbitrary (which workshops go in which collection?), not principled by a real content-shape difference.

If a future need reintroduces a real content-shape split (e.g. a genuinely different kind of workshop with its own required fields), revisit the filtered-collections technique this task explored — the underlying Sveltia mechanism (`filter: { field: ..., value: ... }` on two collections over one folder, with YAML anchors to avoid duplicating shared fields) is sound and was validated in principle; it just doesn't apply to the standard-vs-archive axis anymore.

---

### Task 7: Editor + agent documentation

**Files:**
- Modify: `EDITING.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update EDITING.md**

Read `EDITING.md` first and update every section that describes the old editing experience. New content to cover (in the file's existing tone/language):
- Sections are now collapsed — click a section header (Hero, Programm-Karte, …) to open it; "SEO & Vorschau" is always the last section.
- Lists (Karten, Personen, FAQ, Stufen, Zitate) show one compact row per item; drag rows to reorder, click to expand.
- Workshops: DE/EN are edited via the language switcher at the top of the entry (GO branch) — not two separate blocks; EN can be enabled/disabled per workshop there. (On NO-GO: DE/EN remain two collapsible blocks.)
- Workshops: one collection now (no more "Workshops" vs "Workshop-Archiv" — that split was removed, see Task 6). Every workshop can optionally have a video hero, multiple facilitators, multiple testimonials, and an FAQ section — fill in what applies, leave the rest empty.
- Mono-lingual workshops (`language_mode` = nur Deutsch/nur Englisch): explain the language-availability badge visitors see when toggled to the language the workshop wasn't written in.

- [ ] **Step 2: Update CLAUDE.md's site-architecture notes**

Append to the "Site architecture" section (adjust to match whatever Step 6 of Task 5 actually landed on for the open judgment calls — initial-locale-per-workshop behavior, badge placement):

```markdown
- Workshop schema (post 2026-07 rework): `admin/config.yml` defines the
  workshop fields once with Sveltia i18n (`structure: single_file`); head
  fields (slug, status, dates, …) are stored under the default locale `de:`
  in `content/workshops/*.yaml`, and `loadWorkshopContent` in
  `eleventy.config.js` reads them from there. One `workshop.njk` template
  renders every workshop via the sitewide `data-de`/`data-en` live-toggle
  pattern (`js/i18n.js`) — the separate archive template and the "Workshops"
  vs "Workshop-Archiv" collection split have been retired. Mono-lingual
  workshops show a template-computed language-availability badge instead of
  untranslated fallback text when toggled to the language they weren't
  authored in.
```

(Adjust to match reality if Task 5-ALT was taken instead of Task 5.)

- [ ] **Step 3: Commit**

```bash
git commit EDITING.md CLAUDE.md -m "docs: describe reworked CMS editing experience"
```

---

## Deferred / rejected (do not implement without a new decision)

- **People/Facilitators relation collection** — bios are intentionally page-specific (verified team.yaml vs montagskurs.yaml, 2026-07-18). Revisit only if guest facilitators appear on 3+ pages. (Still holds after the 2026-07-18 template-unification amendment — `facilitators` is per-workshop list content, not a cross-page relation.)
- **Variable-type page builder** — conflicts with the fixed-design templates; would require template block-loops + full content migration.
- **Tag/category taxonomy** — over-modeling at current scale.
- **Sveltia upgrade** past 0.171.1 — separate task if ever needed (new dist download + filename bump per `admin/index.html` comment).
- **Task 6 (split workshop editing views)** — superseded 2026-07-18 by the template-unification amendment; see Task 6's section for why.
- **Quote-divider section, "archive CTA," funded-by logos** (from the retired archive template) — judged one-off flourishes for Bewegungsrevolution specifically, not generalized into the unified template; their content is dropped during Task 5's migration. Revisit only if a future workshop has a similar grant-funded/multi-week-program shape and the specific sections seem worth reintroducing.

## Rollout note

Config-only tasks (2, 3) change nothing about the build; the `_site` diff gate guarantees visitors see no change from them. **Task 5 is the exception** (2026-07-18 amendment): it deliberately changes what visitors see on Bewegungsrevolution's page (new unified template, some archive-only content dropped) even though Cellular Touch should look unchanged. Keep Task 5's commits atomic per sub-part (schema+migration+loader as one, the template rewrite as another) so the CMS schema and content shape never disagree — but treat pushing Task 5 to `production` as a real, visible content/design change to Bewegungsrevolution's page, not a transparent backend refactor like the rest of this plan. Consider previewing it (local build review) before pushing, rather than relying on the usual diff-gate confidence.

---

## Post-plan follow-up: canonical workshop editing and page polish

**Status:** Implemented and verified locally on 2026-07-18. These changes were explicitly requested by the owner after the original plan completed and therefore supersede the earlier constraints that excluded CSS, `js/i18n.js`, and the signup Worker from this work stream.

### Workshop content model

- Added one localized canonical `title`. Programme cards, breadcrumbs, detail-page eligibility, hero fallback, and SEO fallback derive from it instead of requiring duplicated `card.title`, hero title, and `meta.title` values.
- Centralized `registration_url`, localized registration button copy/note, and canonical workshop `facts` (date, time, location, price, duration, format, schedule, and detailed pricing).
- Replaced the separate practice and information concepts with a core `description`: narrative text renders in the left column and an optional facts card renders in the right column.
- Facilitators and their optional quotes render as adjacent columns. Research cards, image band, FAQ, hero media, card tags, hero category badge, and section eyebrow labels remain optional.
- Detail pages require the canonical title, usable hero content, and at least one substantive content section. Programme cards use the canonical title directly.
- The loader retains compatibility fallbacks for existing workshop YAML while migrated entries use the canonical fields.

### CMS editor experience

- All visible CMS collection and field labels are English. Ambiguous controls include examples and explain their frontend destination or fallback behavior.
- Decorative badges, tags, and eyebrow labels are optional; empty values do not leave visual gaps.
- Added the previously omitted Programme page to the Pages collection, including its core facts, outlook cards, call to action, and SEO fields.
- Kept storage keys stable wherever possible so relabeling does not force unrelated content migration.
- Index-matched bilingual lists must remain in the same order and at the same length; this is stated in relevant field hints.

### Rendering and forms

- Reduced and centered About Us portraits with responsive constraints.
- Homepage signup now collects first name and posts it to `worker/`; the Worker maps it to Notion's `Name` property and falls back to email for legacy clients. Visible labels, placeholders, progress, success, and error text are CMS-managed and bilingual.
- Generated pages version the shared stylesheet URL with a CSS content hash. This prevents the CDN's four-hour asset cache from serving the old email-only input styling beside newly deployed first-name markup.
- Contact form now exposes clear sending, sent, success, and retry/error states. Success/error copy appears in a prominent live-region panel rather than low-opacity helper text.
- `js/i18n.js` now switches localized input placeholders in addition to text and accessible labels.

### Verification

- `admin/config.yml` parses through `js-yaml`.
- `npm run build` completes successfully.
- Generated inline scripts for the homepage and Contact pass JavaScript syntax checks.
- The signup Worker passed a mocked Notion payload test confirming first-name mapping and was deployed to `wildcare-signup.fabiogerhold.workers.dev`.
- Desktop render checks covered About Us portraits, the homepage signup layout, Contact, and workshop detail layouts. A real production form submission was intentionally not made to avoid creating test records in Notion.
