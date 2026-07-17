# Wild Care: CMS on GitHub Pages — Design (Preliminary)

**Date:** 2026-07-17
**Status:** Superseded by `2026-07-17-github-pages-cms-implementation-brief.md` (owner-amended final brief). Where the two differ, the brief wins.
**Base:** `html-site` branch (the live site). The `main`-branch Astro/Sanity rewrite is **not** the base (see §8).

---

## 1. Goal & requirements

Make the live Wild Care site (hand-coded HTML/CSS/JS on GitHub Pages) editable through a
functional CMS, without leaving the GitHub Pages environment.

Requirements established with the owner:

- **Scope:** *all* page copy is editable — journal, program/events, plus headlines, body
  text, team bios, membership tiers, FAQ — in both DE and EN.
- **Editors:** non-technical teammates. They must never see git, HTML, or a code editor.
- **Design:** no interest in changing the visual design; pragmatic deviations are
  acceptable where they genuinely help a clean implementation.
- **Hosting:** stays on GitHub Pages (`wildcare.space` via CNAME).

### Why this failed before (context)

The `main` branch history records two prior attempts: Eleventy + Decap CMS *on GitHub
Pages* (died on OAuth — Decap needs an auth backend that Pages cannot host; five
consecutive auth-fix commits before giving up), then a move to Netlify, then a full
Astro + Sanity rebuild that never shipped. Two things have changed since: GitHub Pages
now deploys cleanly from GitHub Actions (build steps are no longer a blocker), and the
project already operates a Cloudflare Worker (`worker/`), so hosting the tiny OAuth
proxy that killed Decap is now trivial.

## 2. Chosen approach (Option A of three)

**Sveltia CMS (git-based) + Eleventy build, everything in this repo.**

Content moves out of the HTML into Markdown/YAML files in the repo. The current HTML
pages become Eleventy templates nearly verbatim. Sveltia CMS is a static `admin/` page
served by Pages itself; a small Cloudflare Worker handles GitHub OAuth. Saving in the
CMS commits to `html-site`; GitHub Actions rebuilds and deploys in ~1–2 minutes.

Rejected alternatives (full trade-off discussion happened in-session, summarized):

- **B — Resurrect the Astro + Sanity rewrite, deploy to Pages.** Best editor UX (drafts,
  email login), but a big-bang cutover of the entire proven frontend, 3 months behind the
  live site, content leaves the repo, most moving parts. Rejected for risk.
- **C — Pages CMS (hosted) + same Eleventy build.** Zero self-run infra, but the login
  path depends on a small third-party hosted service, DE/EN needs manually doubled
  fields, and editors still need GitHub accounts. Kept as the drop-in fallback if
  Sveltia disappoints (identical content architecture).

## 3. Architecture & repo layout — **APPROVED**

Everything stays on `html-site`, which remains the deployed branch.

```
package.json, eleventy.config.js     # new: the build (root package.json for the first time — deliberate)
site/                                # Eleventy input: templates
  _includes/
    layouts/base.njk                 # shared <head>, nav, footer (currently duplicated in every page)
    partials/…                       # nav, footer, signup form
  index.njk, programm.njk, …         # one per page, HTML copied ~verbatim, copy replaced by placeholders
content/                             # CMS-managed content (what editors touch)
  pages/index.yaml, programm.yaml, … # structured per-page copy, DE+EN
  journal/warum-ci.md, …             # journal articles (folder collection)
  legal/datenschutz.md, impressum.md # German-only, markdown body
admin/index.html, admin/config…      # Sveltia CMS (static, served by Pages itself)
.github/workflows/deploy.yml         # build → deploy to Pages
css/, js/, assets/                   # untouched, passthrough-copied as-is
```

Key properties:

- **Output URLs are identical** — Eleventy permalinks keep `mitmachen.html`,
  `journal/warum-ci.html`, etc. `CNAME`, `robots.txt`, `.nojekyll` preserved;
  `sitemap.xml` becomes a template so journal entries auto-list.
- **Deployment switches from "serve the branch" to "GitHub Actions builds and deploys"**
  (`actions/deploy-pages`). This is the one settings-level change in the GitHub repo.
  Rollback of any content edit is `git revert` + auto-redeploy; deploys are atomic.
- **Migration is incremental:** pages not yet templatized are passthrough-copied
  unchanged, so pages convert one at a time on the live site. Phase 1 deploys a build
  whose output is byte-identical to today's site before any page is touched.
- CSS is never edited (standing constraint); `worker/` and the signup flow are
  untouched; `brand.html` (dev styleguide) stays out of the CMS.
- Side benefit: nav and footer, currently copy-pasted into all 12 pages, become one
  shared partial.

## 4. Content model & bilingual editing — **APPROVED**

- Each page gets one YAML file in `content/pages/` mirroring its visible structure —
  e.g. `mitmachen.yaml` has `hero`, `circles`, `membership_tiers` (list of
  icon/name/amount/description), `form`; `programm.yaml` has its event/course entries.
- Fields hold **DE and EN values as locale pairs**, edited side-by-side in Sveltia
  (DE required, EN optional with fallback to DE — matching today's behavior).
- Templates emit exactly the current mechanism:
  `<span data-de="…" data-en="…">German text</span>`. **`js/i18n.js` and the
  client-side toggle stay untouched** for regular pages. Attribute values are escaped at
  build time — removing today's manual entity-encoding failure mode.
- German-only pages (`datenschutz`, `impressum`) become markdown documents with no EN
  field and continue not to load `i18n.js`.
- **Journal article bodies (owner decision): per-locale markdown.** The editor writes
  the DE article and optionally the EN article as two normal markdown fields. The
  template renders both into the page as two blocks; `i18n.js` gets a ~10-line
  extension to show/hide the right block on toggle (article pages only). Same rendered
  text and toggle behavior for visitors; massively better writing experience than
  per-paragraph field pairs.
- The known Wurzel-tier `60+`/`50+` mismatch on `mitmachen.html` is carried over
  **as-is** into the content file; reconciling it stays a separate owner decision
  (per CLAUDE.md).

## 5. CMS admin & authentication — *pending review*

- `admin/index.html` loads a **self-hosted, version-pinned copy** of the Sveltia CMS
  script (committed to the repo, not a CDN link — a CDN outage can't break editing).
  Its config declares the GitHub backend (`repo`, `branch: html-site`) and the
  collections: one "Seiten" file-collection entry per page, a "Journal" folder
  collection, "Rechtliches" for the legal pages.
- **Auth:** a second Cloudflare Worker (new top-level dir `worker-auth/`, structured
  like the existing `worker/`) running the official `sveltia-cms-auth` code. One-time
  setup: create a GitHub OAuth App; put client id/secret in Worker secrets via
  `wrangler secret put` (same pattern as the Notion secrets). This is the piece that
  fixes what killed the April Decap attempt.
- **Editor onboarding (per person, once):** create a free GitHub account → owner adds
  them as repo collaborator → they open `wildcare.space/admin/`, "Sign in with GitHub",
  authorize. Documented in a short German `EDITING.md`.
- Known property (not a surprise later): repo collaborators can technically edit
  anything via git; the CMS UI only *shows* content collections, which is guardrail
  enough for a trusted small team.
- Known limitation accepted with Option A: **save = publish** (no draft/review stage)
  and no visual preview while editing; rollback is a one-click revert for the owner.

## 6. Build, deploy & error handling — *pending review*

- Workflow on push to `html-site`: `npm ci` → `eleventy` → deploy artifact to Pages.
  Sub-2-minute cycle. The Pages setting flips from "deploy from branch" to
  "GitHub Actions" at Phase 1, at a moment when build output is verified
  byte-identical — invisible to visitors.
- **Bad content cannot take the site down:** a failing build (malformed YAML, missing
  required field) simply doesn't deploy; the last good version keeps serving. The CMS
  prevents most of this class (writes well-formed files, enforces required fields).
  Build failures notify via GitHub's standard Actions email.
- Templates render optional sections conditionally (missing EN → falls back to DE), so
  partial content degrades gracefully instead of erroring.
- The existing `worker/` deploy process is untouched.

## 7. Migration order, verification & docs — *pending review*

- **Phase 0 — verify assumptions** (before building anything): confirm against current
  docs that Sveltia's GitHub backend + auth worker + side-by-side i18n editing work as
  designed here (design authored while web search was unavailable; Sveltia knowledge is
  from early 2026). Fallback if blocked: Pages CMS on the identical content
  architecture — only §5 details would change.
- **Phase 1 — pipeline swap, zero content changes:** add Eleventy with everything
  passthrough; verify built output byte-identical to the current site; switch Pages to
  Actions deploy. Site unchanged; plumbing proven.
- **Phase 2 — templatize page by page**, easiest → hardest: `kontakt` → `team` →
  `journal` listing + articles → `index` → `programm` → `montagskurs` →
  `cellular-touch` → `bewegungsrevolution` → `mitmachen` → legal pages. Per page:
  extract content → templatize → **diff normalized built HTML against the live page**
  (the objective acceptance test) → commit. Any page can ship independently.
- **Phase 3 — CMS layer:** deploy auth worker, add `admin/`, connect, end-to-end test
  (edit in CMS → commit → deploy → visible), onboard editors with `EDITING.md`.
- **Testing overall:** per-page HTML diffs (Phase 2), the repo's existing grep-based
  structural checks, a link-and-asset check on built output, and one manual browser
  pass per page for the DE/EN toggle and the signup form.
- **Docs updated in the same stream:** `CLAUDE.md` (the "no build step" reality changes;
  new content-editing rules), `TRANSLATION.md` (content lives in `content/`), new
  `EDITING.md` (German, for editors).

## 8. Explicit non-goals

- No visual/design changes; `css/styles.css` is not edited.
- No draft/preview workflow (accepted Option A limitation).
- No touch of the `main`-branch Astro/Sanity rewrite; it is neither merged nor deleted.
- No change to the signup worker, Notion integration, or legal-page language policy.
- No reconciliation of the Wurzel `60+`/`50+` mismatch.

## 9. Open items for owner review

1. §5–§7 (CMS/auth, build & error handling, migration order & testing) await approval.
2. Editor GitHub accounts: acceptable onboarding friction? (Accepted implicitly with
   Option A; flagged once more since it's the main editor-facing cost.)
3. Naming: `worker-auth/` for the second Worker, `EDITING.md` for the editor guide —
   bikeshed freely.
