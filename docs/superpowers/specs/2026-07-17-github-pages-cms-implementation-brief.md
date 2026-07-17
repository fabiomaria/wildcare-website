# Wild Care CMS — Implementation Brief for Coding Agent

Date: 2026-07-17
Status: Supersedes the preliminary design doc. §3–§4 were approved as drafted; §5–§7 are approved **as amended below**. Where this brief and the preliminary doc differ, this brief wins.
Base branch: `html-site` (the live site). The `main`-branch Astro/Sanity rewrite is not touched.

---

## 1. Goal

Make the live Wild Care site (hand-coded HTML/CSS/JS on GitHub Pages, wildcare.space) editable by non-technical teammates through Sveltia CMS, while staying entirely on GitHub Pages. Editors never see git, HTML, or a code editor. Visual design, URLs, and visitor-facing behavior are unchanged.

Stack: **Sveltia CMS (git-based) + Eleventy build + GitHub Actions deploy + one new Cloudflare Worker for OAuth.** Content moves from HTML into YAML/Markdown in the repo; current pages become Nunjucks templates nearly verbatim.

## 2. Hard constraints — do not violate

1. `css/styles.css` is never edited. **Sole exception:** if (and only if) a trailing `styles.cssPK` zip artifact is verified to exist at the end of the file, delete exactly those trailing junk characters and nothing else. Verify before touching; do not trust the report blindly.
2. `js/` is passthrough-copied as-is. Do **not** consolidate the repeated inline scripts (fade-up observer, nav toggle, video mute, scroll listener) into a shared `main.js` — that refactor is explicitly deferred to a later, separate change so migration diffs stay clean. The only permitted JS change is the ~10-line additive extension to `js/i18n.js` for journal article block toggling (§4.4), and it must be additive — do not rewrite the existing file.
3. The existing `worker/` (signup → Notion) is never modified. Auth gets its **own separate** worker (`worker-auth/`). Do not merge them, even though it's technically possible — the signup worker is production-critical and stays frozen.
4. Output URLs are byte-identical to today: `mitmachen.html`, `journal/warum-ci.html`, etc. Preserve `CNAME`, `robots.txt`, `.nojekyll`.
5. The Wurzel-tier 60+/50+ mismatch on mitmachen is carried into the content file **as-is**. Do not reconcile it.
6. `brand.html` (dev styleguide) stays out of the CMS.
7. No visual/design changes anywhere. No draft/preview workflow (accepted limitation: save = publish).
8. Schema before templates: the Sveltia `admin/config.yml` collection schemas are locked first (Phase 0); templates conform to the schema, never the other way around. Do not invent variable names in templates that aren't in the frozen schema.

## 3. Repo layout (target, all on `html-site`)

```
package.json, eleventy.config.js      # new: the build (first root package.json — deliberate)
site/                                 # Eleventy input: templates
  _includes/
    layouts/base.njk                  # shared <head>, nav, footer (currently duplicated in every page)
    partials/…                        # nav, footer, signup form
  index.njk, programm.njk, …          # one per page, HTML copied ~verbatim, copy → placeholders
content/                              # CMS-managed content (what editors touch)
  pages/index.yaml, programm.yaml, …  # structured per-page copy
  journal/warum-ci.md, …              # journal articles (folder collection)
  legal/datenschutz.md, impressum.md  # German-only, markdown body
assets/uploads/                       # NEW: all CMS-uploaded media lands here (media_folder)
admin/index.html, admin/config.yml    # Sveltia CMS (static, served by Pages itself)
.github/workflows/deploy.yml          # build → deploy to Pages (actions/deploy-pages)
worker-auth/                          # NEW: sveltia-cms-auth Cloudflare Worker (separate from worker/)
css/, js/, assets/                    # untouched, passthrough-copied as-is
```

`sitemap.xml` becomes a template so journal entries auto-list. Nav and footer, currently copy-pasted into all 12 pages, become one shared partial (this is in scope; script deduplication is not — see constraint 2).

## 4. Content model

### 4.1 Three page shapes — declared per page, no general mechanism

1. **Bilingual (default):** DE required, EN optional with fallback to DE. Rendered via the existing mechanism: `<span data-de="…" data-en="…">German text</span>`; `js/i18n.js` and the client-side toggle stay untouched for regular pages.
2. **German-only** (datenschutz, impressum): markdown documents, no EN fields, page does not load `i18n.js`.
3. **English-only** (cellular-touch — confirmed by owner: stays English-only permanently): plain fields, no locale pairs, `<html lang="en">`, does not load `i18n.js`. Model it like the legal-page exception, e.g. a page-level `lang` property. Do **not** build conditional-locale machinery for this one page.

### 4.2 Locale structure — resolve in Phase 0, then freeze

Sveltia's native i18n support writes a specific YAML structure depending on config mode (single-file with locales nested vs. per-locale files); this is **not** necessarily the same as hand-rolled per-field `{de:, en:}` objects. The side-by-side editing UX the owner wants may require Sveltia's native i18n mode. Phase 0 must determine which structure the actual Sveltia UI reads/writes for side-by-side editing, and the frozen schema uses **that** structure. Templates are then written against it.

### 4.3 Attribute safety

All YAML text fields destined for `data-de`/`data-en` attributes must run through strict attribute-escaping in Nunjucks at build time (this replaces today's manual entity-encoding failure mode). Fields rendered into attributes must be restricted to plain text in the CMS config (no markdown widgets for those fields) — markdown/HTML inside a `data-` attribute breaks the page.

### 4.4 Journal articles

Per-locale markdown bodies: editor writes the DE article and optionally the EN article as two normal markdown fields. Template renders both blocks into the page; `js/i18n.js` gets a small **additive** extension (target a wrapper like `<article data-i18n-block="de">`) to show/hide the right block on toggle, on article pages only. Visitor-visible text and toggle behavior are identical to today.

Journal frontmatter includes a `status` field (e.g. `published` / `coming_soon`). The homepage "Aus dem Labor" section is populated dynamically from the latest three entries in `content/journal/` via Eleventy collections; `coming_soon` renders the `.coming-soon` card state with the link stripped, automatically. (Migration note: do the index page in two commits — verbatim templatization first, dynamic journal section second — so the acceptance diff stays interpretable.)

### 4.5 Media (owner confirmed: editors upload images regularly)

- `media_folder: assets/uploads` (with matching `public_folder`) in `admin/config.yml`. No uploads outside this folder.
- Build-time image optimization: integrate `@11ty/eleventy-img` (or an equivalent Sharp step) so uploaded images are resized/compressed during the Actions build. Raw uploads are never served unprocessed at original size where the templates control the `<img>`.
- Git-history bloat: in Phase 0, check whether Sveltia's client-side image optimization/resize-on-upload option works as documented; if yes, enable it so large originals are compressed **before** commit. If not, accept history growth (document this) and rely on build-time optimization plus a soft guideline in EDITING.md ("phone photos are fine, the site shrinks them").
- Phase 3 end-to-end test must include an image upload rendering correctly on the live page (different code path from text edits).

### 4.6 CTAs / buttons — structured, never raw attributes

The live site uses three CTA mechanisms: Tally popup (`data-tally-open="…"` + emoji attrs), plain external links (e.g. cellular-touch → tally.so URL), and the custom `#signup-form` fetch to the signup worker. Editors must never type attributes. Model buttons as a structured object in the schema, e.g.:

- `action_type: tally_popup` + `tally_id` → template emits `<button … data-tally-open="{{ id }}" …>` with the existing emoji attributes hardcoded in the template.
- `action_type: external_url` + `url` → template emits `<a href="…" class="btn …">`.
- The signup form itself (inline IIFE posting to the Cloudflare Worker) is **template-owned**, not editor-editable content; only its visible labels/copy are CMS fields.

## 5. CMS admin & auth

- `admin/index.html` loads a **self-hosted, version-pinned** copy of the Sveltia CMS script committed to the repo (not a CDN link).
- `admin/config.yml`: GitHub backend, repo + `branch: html-site`. Collections: "Seiten" (one file-collection entry per page), "Journal" (folder collection), "Rechtliches" (legal pages).
- Auth: new `worker-auth/` running the official `sveltia-cms-auth` code, structured like the existing `worker/`. One-time setup: GitHub OAuth App; client id/secret via `wrangler secret put` (same pattern as the Notion secrets).
- Editor onboarding (per person, once): free GitHub account → owner adds as repo collaborator → open wildcare.space/admin/ → "Sign in with GitHub" → authorize. Documented in EDITING.md.
- Known/accepted: collaborators can technically edit anything via git (trusted small team); save = publish, no preview; rollback is a one-click revert by the owner.

## 6. Build, deploy & error handling

- Workflow on push to `html-site`: `npm ci` → `eleventy` → deploy artifact to Pages (`actions/deploy-pages`). Target sub-2-minute cycle.
- The Pages setting flips from "deploy from branch" to "GitHub Actions" during Phase 1, at the moment build output is verified byte-identical — invisible to visitors. This is the only repo-settings change.
- Failing builds (malformed YAML, missing required field) don't deploy; last good version keeps serving. Failures notify via standard Actions email. The CMS prevents most of this class (well-formed files, required fields enforced).
- Templates render optional sections conditionally (missing EN → DE fallback) so partial content degrades gracefully.

## 7. Phased execution & acceptance criteria

### Phase 0 — verify assumptions and freeze the schema (before building anything)

Deliverables, all verified against **current** docs and a live Sveltia instance (the design was authored without web access; Sveltia knowledge dates from early 2026):

1. Confirm Sveltia GitHub backend + `sveltia-cms-auth` worker flow works as designed.
2. Determine the exact YAML structure Sveltia's side-by-side i18n editing reads/writes (§4.2). Produce **one frozen sample YAML file per page shape** (bilingual, German-only, English-only) plus one journal markdown sample, round-tripped through the actual Sveltia UI (edit → save → inspect committed file). These frozen samples are the schema contract for all Phase 2 templates.
3. Check Sveltia's pre-commit image optimization option (§4.5) and record the decision.
4. Fallback if Sveltia is blocked on any of the above: **Pages CMS** on the identical content architecture — only §5 details change; the frozen content schema is designed to survive the swap.

### Phase 1 — pipeline swap, zero content changes

Add Eleventy with **everything** passthrough-copied. Acceptance: built output is **byte-identical** to the current site (this is trivially achievable with pure passthrough and is the smoke test — byte-identity applies to Phase 1 only). Then flip Pages to Actions deploy. Site unchanged; plumbing proven.

### Phase 2 — templatize page by page, easiest → hardest

Order: kontakt → team → journal listing + articles → index → programm → montagskurs → cellular-touch → bewegungsrevolution → mitmachen → legal pages. Any page can ship independently.

Per page: extract content into the frozen schema → templatize (no changes to CSS classes, IDs, or HTML structure) → run the normalized diff → commit.

**Acceptance standard for Phase 2 is DOM/normalized-identical, not byte-identical.** Build a small normalization diff script once, use it for every page:

```bash
npx prettier --parser html live/<page>.html > /tmp/live.html
npx prettier --parser html _site/<page>.html > /tmp/built.html
diff -u /tmp/live.html /tmp/built.html
```

Show the diff output for every migrated page; an empty (or explicitly justified) diff is the gate to commit. Index is done in two commits per §4.4.

### Phase 3 — CMS layer

Deploy `worker-auth/`, add `admin/`, connect, then end-to-end test: (a) text edit in CMS → commit → build → visible on live site; (b) image upload in CMS → renders correctly on the live page. Onboard editors with EDITING.md.

### Testing overall

Per-page normalized HTML diffs (Phase 2), the repo's existing grep-based structural checks, a link-and-asset check on built output, and one manual browser pass per page covering the DE/EN toggle and the signup form.

## 8. Documentation (updated in the same stream)

- `CLAUDE.md`: the "no build step" reality changes; add content-editing rules (copy lives in `content/`, never edit copy in templates).
- `TRANSLATION.md`: content lives in `content/`.
- `EDITING.md` (new, in German, for editors): how to log in, edit, upload images (with the soft size guidance), and — written plainly **for the owner** — the exact one-click revert procedure for when a bad edit goes live. Recommend the team norm that edits to mitmachen (the money page) get a second pair of eyes before saving, since save = publish.

## 9. Explicit non-goals

No visual/design changes; no draft/preview workflow; no touching the `main`-branch Astro/Sanity rewrite (neither merged nor deleted); no changes to the signup worker, Notion integration, or legal-page language policy; no Wurzel 60+/50+ reconciliation; no JS consolidation/refactor (deferred).

## 10. Decisions already made (do not re-litigate)

- Option A (Sveltia + Eleventy) chosen over Astro/Sanity resurrection (risk) and Pages CMS (kept as fallback).
- Two separate Cloudflare Workers, deliberately.
- cellular-touch stays English-only permanently (owner confirmed 2026-07-17).
- Editors upload images regularly (owner confirmed 2026-07-17) — §4.5 is mandatory scope, not optional.
- Journal bodies are per-locale markdown, not per-paragraph field pairs.
- Editor GitHub accounts are accepted onboarding friction.

## 11. Amendment 2026-07-17-b: contact form → Notion (owner decision)

The kontakt.html contact form currently POSTs to Formspree (`https://formspree.io/f/xlgongny`). Owner decision: **remake it without Formspree**, relaying through the existing Notion mechanism into the `Wild Care Anmeldungen` database.

- **New separate Cloudflare Worker `worker-kontakt/`**, structured like the existing `worker/` (same Notion API version 2022-06-28, same secrets pattern via `wrangler secret put`). Constraint 3 stands: `worker/` itself remains frozen; this makes three deliberately separate workers (signup, CMS auth, kontakt).
- Field mapping (per the established DB schema — do not invent columns): `Name` ← name field, `Email` ← email field, `Nachricht` ← message text prefixed with a source note in the established style (e.g. `"Kontaktformular wildcare.space — "`), `Anmeldung Datum` ← submission date, **`Tag` (multi_select) ← source tag, e.g. `Kontaktformular`** (owner decision 2026-07-17: `Tag` records where people came from; use it for source attribution in this and future workers rather than overloading `Nachricht`).
- Frontend follows the signup form's proven pattern (template-owned inline fetch, client-side validation, DE/EN status messages via the existing i18n mechanism).
- **Sequencing:** implemented as a standalone change after Phase 0 and before Phase 2 templatizes kontakt, so the migration diff for kontakt carries the new form verbatim. Datenschutz implications (Formspree leaves the privacy policy, Notion processing already documented for signup) are reviewed as part of this change.
- §4.6 note: this replaces the "Formspree form" as the fourth CTA mechanism; like the signup form, it is template-owned — only visible labels/placeholders are CMS fields.
