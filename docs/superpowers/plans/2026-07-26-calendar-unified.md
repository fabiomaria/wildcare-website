# Calendar Implementation Plan — Unified (Schema Revision 2 + Eleventy Integration)

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Scope:** Replaces Plan 2 Tasks 3–10 and all of Plan 3 Tasks 1–10 with 13 tasks in two phases. **Plan 2 Tasks 1–2 are already committed** (venue records + fixtures; `schedule` blocks on the three real workshops) — this plan assumes them as its starting state.

**Goal:** Ship `registry_revision: 2` (locale-neutral `schedule` block, `venue` + `event` record types, five new enums, validators, CMS config) and then wire `lib/calendar/` into Eleventy so every dated record emits schema.org `Event` JSON-LD, a per-event `.ics` at `/calendar/<id>.ics`, an add-to-calendar UI, a subscribable master feed `/wildcare.ics`, featured-Monday leaf pages, and a generated `sitemap.xml` — with human date text derived from the structured block.

---

## What changed vs. the two source plans

Every technical detail from both plans survives. The consolidation removes *ceremony*, not substance.

| Simplification | Before | After | Why it's safe |
|---|---|---|---|
| **One registry regeneration instead of four** | Plan 2 regenerated after Tasks 3, 4, 5, and 9 | All content + generator + meta-schema + CMS edits land first; **Task 4** regenerates once | `generate-registry.js` is a pure function of `content/**` + `admin/config.yml`. Regenerating once at the end of the authoring work produces the identical artifact. Intermediate regens only bought earlier feedback. |
| **One `eleventy.config.js` edit instead of seven** | Plan 3 Tasks 1,2,3,4,5,6,7,8 each touched it to add one filter or loader | **Task 8** adds every loader and every filter in a single pass | The filters are independent one-liners with no interdependencies. Writing them together avoids seven merge-conflict-prone edits to one 500-line file. |
| **Montagskurs moved into the schema phase** | Plan 3 Task 7 Step 1 was an unresolved decision point (`fixed_page` + schedule vs. new `event` record), taken *after* `schema:check` had already passed | **Decided: option (a).** The recurring block is added to `content/pages/montagskurs.yaml` in **Task 1**, so it is registry-discovered and `schema:check`-validated in Phase 1 | This is the biggest structural win. It means (1) recurring field paths are discovered from *real* content, not only fixtures; (2) `loadCalendar()` sees the definition the moment it exists; (3) Phase 2 Task 12 shrinks to templates only; (4) no schema re-gate after Phase 2. |
| **Event content authored before the generator learns about it** | Plan 2 registered the `event` record type in Task 3 but only authored `content/events/solstice-jam.yaml` in Task 5 | **Task 1** authors it; **Task 2** teaches the generator | Fixes an ordering inversion against Plan 2's own stated content-first architecture. Registering a record type whose `records:` glob matches nothing discovers no fields. |
| **Migrate + downgrade merged** | Plan 2 Tasks 6 + 7, two commits | **Task 5**, one commit | Both are ~10 lines in adjacent files, both are verified by adjacent `schema:*` scripts, and neither has real v1 source data (venue/event/schedule are v2-native). |
| **Meta-schema folded into the generator task** | Plan 2 Task 3 (record types/enums) + Task 4 (`locale_neutral`, `reference`) | **Task 2** | Task 3 *emitted* `locale_neutral` while Task 4 *permitted* it in the meta-schema — the registry is invalid in between. They were always one atomic change. |
| **JSON-LD + add-to-calendar + date parity merged** | Plan 3 Tasks 2, 3, 9 — three commits, three edits to `workshop.njk` | **Task 9**, one commit | All three are `<head>`/CTA insertions into the same file, verified by the same `npm run build`. |
| **Per-event `.ics` + master feed merged** | Plan 3 Tasks 4 + 5 | **Task 10** | Same output format, same CRLF/folding risk, same verification technique. Testing them together is strictly better — a folding bug shows up in both. |
| **Sitemap merged with the final gate** | Plan 3 Tasks 8 + 10 | **Task 13** | The sitemap *is* the deploy gate's input; `validate-seo.js` can't be meaningfully run until every URL exists. |
| **`start_at == earliest session` narrowed to dates mode** | Plan 2's *goal* prose claimed recurring mode too; its *validator code* only implemented dates mode | Dates mode only, stated explicitly (**Task 6**) | Deliberate narrowing to match the shipped code. Recurring records (`fixed_page` Montagskurs) have no `global.start_at` to compare against; the anchor is the series DTSTART. Revisit only if a recurring `event` record ever needs ordering. |

**Net:** 18 tasks → 13. Four registry regenerations → one. Seven `eleventy.config.js` edits → one. One open decision point → zero.

---

## Global Constraints (merged from both plans — read once, applies throughout)

**Repo & process**

- **Work on branch `production`**, or a worktree explicitly based on `production` — **NEVER `main`** (see repo `CLAUDE.md` branch topology).
- Confirm before starting: `content/`, `schema/`, `scripts/schema/`, `admin/config.yml`, `site/`, `eleventy.config.js`, `sitemap.xml` exist at repo root; `require("./lib/calendar")` resolves (Plan 1 merged); `content/venues/orpheumgasse.yaml` exists (Plan 2 Task 1 committed).
- **Commit with an explicit pathspec** — `git commit <paths> -m "..."`, never a bare `git commit`. This tree has carried unrelated staged changes.
- **CommonJS only** (`require`/`module.exports`, `"use strict";`). Match the existing style of `scripts/schema/*.js` and `eleventy.config.js`.
- **No new npm dependencies.**

**Generated artifacts**

- **Never hand-edit generated files** (`docs/schema-migration.md` §3.3). Regenerate `schema/content-schema-v2.registry.json`, `schema/generated/*.schema.json`, `docs/generated/*` via their scripts.
- `generate-registry.js` is **not** wired to an npm script — run it directly: `node scripts/schema/generate-registry.js`.
- **§3.3 change-control bundle (one PR):** revision bump → fixtures → regenerated schemas + docs → CMS config → migrate/downgrade mappings → green `npm run schema:check`.

**Data semantics**

- **Floating local wall-clock everywhere.** Session and recurrence times are floating-local **strings**: `YYYY-MM-DDTHH:mm` (sessions) and `HH:mm` (recurrence). They **MUST be quoted in YAML** — an unquoted `2026-10-09T19:00` is parsed by js-yaml as a `Date`, typed `datetime` in the registry, and serialized with a `Z` offset, which breaks floating-local semantics. Validator-enforced (Task 6).
- **`updated_at`** is a UTC `...Z` instant (unquoted is fine — it is a real instant). It is the calendar library's *only* source for ICS `SEQUENCE`/`DTSTAMP`/`LAST-MODIFIED`.
- **`global.start_at` stays the workshop `ordering.primary`.** Its wall-clock `YYYY-MM-DDTHH:mm` must equal the earliest session `start_local` (dates mode only — see narrowing note above).
- **Stable ids on every repeatable item** (`sessions[].id`, `featured_occurrences[].id`); localized copy is keyed by that id; **never join by array position** (`docs/schema-migration.md` §6.4).
- **Enums are closed** — unknown `event_status` / `availability` / `event_type` / `weekday` / `schedule_mode` / `page_mode` values are build errors.
- Venue country codes are ISO-3166 alpha-2 (`AT`). Site origin `https://wildcare.space`.
- **Determinism:** `lib/calendar` derives every timestamp from `updated_at`. Never inject `Date.now()` or build time.

**Eleventy & front-end (Phase 2)**

- **Do NOT edit `css/styles.css`, do NOT add CSS files, do NOT add inline `style="..."`.** Reuse existing classes only (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.nav-cta`, …). `.btn-ghost` is always paired with `.btn`: `class="btn btn-ghost"`.
- **Bilingual pattern (`js/i18n.js`):** `[data-de][data-en]` elements swap `textContent` (German default); `data-aria-de`/`data-aria-en` swap `aria-label`. `textContent` only — no markup inside translated attributes (except `<br>`); pre-encode entities. JSON-LD and `.ics` are **server-rendered in a single locale** (`def.primaryLocale`) — the client toggle does not apply to them.
- **`.ics`/`.xml` output** via njk `permalink` ending in `.ics`/`.xml` (engine stays njk; proven by existing pagination in `site/workshop.njk`). ICS bodies output raw ICS text — no `<!DOCTYPE>`, use `{%- -%}` whitespace control, print the library string **verbatim** (it already has CRLF + 75-octet folding; do not let njk reflow it).
- **`validate-seo.js` is the deploy gate** (`npm run build` = `eleventy && node scripts/validate-seo.js`; CI runs `schema:check` then `build`). It iterates `sitemap.xml` `<loc>`s and requires **17 `<head>` patterns per page** (title, description, canonical, full OG block incl. `og:image` https + width + height + alt, twitter card). **Every sitemap URL must exist in `_site/` and pass all 17.** Keep `.ics` URLs **out** of the sitemap — they have no HTML head.

---

## The record shapes this plan produces (Plan 1's `toDefinition` already consumes them)

```yaml
# content/workshops/<id>.yaml  and  content/events/<id>.yaml
schema_version: 2
global:
  id: how-we-move-together
  intended_locales: [en]
  status: upcoming
  route: /how-we-move-together
  start_at: 2026-10-09T19:00:00.000Z     # ordering key; wall-clock == earliest session (validator-enforced)
  updated_at: 2026-07-26T10:00:00Z       # UTC instant; drives ICS SEQUENCE/DTSTAMP
  sort_order: 2
  detail_page: true
  venue: orpheumgasse                    # reference → content/venues/orpheumgasse.yaml
  event_type: jam                        # events ONLY (→ schema.org @type); absent on workshops
  page_mode: full                        # events ONLY: minimal | full
  registration:
    url: https://tally.so/r/lbXDW5
    availability: available              # enum: available | sold_out | waitlist | unavailable
  schedule:
    event_status: scheduled              # enum: scheduled|cancelled|postponed|rescheduled|moved_online
    previous_start_local: null           # set only on reschedule → schema.org previousStartDate
    mode: dates                          # enum: dates | recurring
    # --- dates mode ---
    sessions:
      - { id: fri-eve, start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00" }
      - { id: sat-aft, start_local: "2026-10-10T13:00", end_local: "2026-10-10T17:00" }
      # optional per-session `status:` (enum event_status) so one session can cancel alone
    # --- recurring mode (mutually exclusive with sessions) ---
    recurrence:
      weekday: monday                    # enum weekday
      start_time: "17:45"                # floating local HH:mm
      end_time: "19:15"
      anchor: "2026-01-05"               # series DTSTART date
      horizon_months: 6                  # website listing expansion only (feed is unbounded)
      except: ["2026-01-19"]             # EXDATE dates
    featured_occurrences:
      - { id: "2026-11-16", teacher: Guest Name }   # stable id = the date; opt-in special day
locales:
  en:
    title: How We Move Together
    summary: A two-day Contact Improvisation workshop.   # → JSON-LD description / ICS DESCRIPTION
    schedule:
      featured_occurrences:
        "2026-11-16": { note: Special evening … }        # localized, keyed by featured id
```

```yaml
# content/venues/<id>.yaml — locale-neutral record type (no intended_locales / locales block)
schema_version: 2
global:
  id: orpheumgasse
  name: Orpheumgasse Studio       # schema.org location.name — never the event title
  street: Orpheumgasse 11
  postal_code: "8010"
  city: Graz
  country: AT
  # optional: geo_lat, geo_lng, url
```

---
---

# PHASE 1 — Schema & Registry (Tasks 1–7)

Ends with a green `npm run schema:check`. Nothing in Phase 1 touches Eleventy templates.

---

## Task 1: Author all remaining v2 content (event record, Montagskurs recurring block, fixtures)

Content first — `generate-registry.js` discovers field paths by walking `content/**/*.yaml`, so every new field must exist in a real record or fixture *before* Task 2 teaches the generator about it.

**Files:**
- Create: `content/events/solstice-jam.yaml`
- Modify: `content/pages/montagskurs.yaml` (add the recurring `schedule` block — **this is the resolved decision point**)
- Create: `migration/fixtures/content-v2/valid-event.yaml`
- Create: `migration/fixtures/content-v2/invalid-event-orphan-venue.yaml`

**Interfaces:**
- Consumes: venue `orpheumgasse` (already committed), the schedule shape from Plan 2 Task 2.
- Produces: the `event` record fields and the `global.schedule.recurrence.*` / `featured_occurrences[]` paths the generator will discover in Task 2; the orphan-venue fixture Task 6 asserts against; the `montagskurs` definition Task 12 renders.

- [ ] **Step 1: Write the event record**

`content/events/solstice-jam.yaml`:
```yaml
schema_version: 2
global:
  id: solstice-jam
  intended_locales: [de, en]
  event_type: jam
  status: upcoming
  route: /events/solstice-jam
  page_mode: minimal
  venue: orpheumgasse
  start_at: 2026-06-21T18:00:00.000Z
  updated_at: 2026-07-26T10:00:00Z
  sort_order: 10
  registration:
    url: https://tally.so/r/EXAMPLE
    availability: available
  schedule:
    event_status: scheduled
    previous_start_local: null
    mode: dates
    sessions:
      - { id: eve, start_local: "2026-06-21T18:00", end_local: "2026-06-21T22:00" }
locales:
  de: { title: Sonnenwend-Jam, summary: Ein offener Contact-Improvisation-Jam zur Sommersonnenwende. }
  en: { title: Solstice Jam, summary: An open Contact Improvisation jam for the summer solstice. }
```

- [ ] **Step 2: Add the recurring schedule block to Montagskurs**

Montagskurs stays a `fixed_page` (`content/pages/montagskurs.yaml` + `site/montagskurs.njk`) — lowest churn, keeps the rich existing page. Add under `global:`:

```yaml
  updated_at: 2026-07-26T10:00:00Z
  venue: orpheumgasse
  schedule:
    event_status: scheduled
    previous_start_local: null
    mode: recurring
    recurrence:
      weekday: monday
      start_time: "17:45"
      end_time: "19:15"
      anchor: "2026-01-05"
      horizon_months: 6
      except: []
    featured_occurrences:
      - { id: "2026-11-16", teacher: Guest Name }
```

And under each locale (`locales.de`, `locales.en`), the localized note keyed by the featured id:
```yaml
    schedule:
      featured_occurrences:
        "2026-11-16": { note: Besonderer Abend mit Gastlehrperson. }   # de
```

Read the existing file first to confirm the real anchor date, `except` dates, and whether `updated_at`/`venue` are already present. Do **not** add `global.start_at` — `fixed_page` does not order by it, and the `start_at == earliest session` validator is dates-mode only.

- [ ] **Step 3: Write the event fixtures**

`migration/fixtures/content-v2/valid-event.yaml` — a second event, distinct `id`/`route`, otherwise the shape above.

`migration/fixtures/content-v2/invalid-event-orphan-venue.yaml` — identical but `venue: nowhere` (proves Task 6's orphan check fires).

- [ ] **Step 4: Verify everything parses**

```bash
for f in content/events/*.yaml content/pages/montagskurs.yaml migration/fixtures/content-v2/*event*.yaml; do
  node -e "require('js-yaml').load(require('fs').readFileSync('$f','utf8'))" && echo "OK $f"
done
```
Expected: `OK` for every file. Do **not** run `schema:validate` yet — the registry does not know these paths until Task 4.

Also confirm the quoting rule held:
```bash
node -e "const y=require('js-yaml'),fs=require('fs');const r=y.load(fs.readFileSync('content/events/solstice-jam.yaml','utf8'));console.log(typeof r.global.schedule.sessions[0].start_local)"
```
Expected: `string` (not `object` — an `object` means js-yaml made it a `Date`, i.e. you forgot the quotes).

- [ ] **Step 5: Commit**

```bash
git add content/events/solstice-jam.yaml content/pages/montagskurs.yaml migration/fixtures/content-v2/valid-event.yaml migration/fixtures/content-v2/invalid-event-orphan-venue.yaml
git commit content/events/solstice-jam.yaml content/pages/montagskurs.yaml migration/fixtures/content-v2/valid-event.yaml migration/fixtures/content-v2/invalid-event-orphan-venue.yaml -m "feat(schema): event record, Montagskurs recurring block, event fixtures"
```

---

## Task 2: Teach the generator + meta-schema everything at once (revision 2)

Formerly Plan 2 Tasks 3 + 4. They were never separable: Task 3 emitted `locale_neutral` into the registry while Task 4 taught the meta-schema to accept it, so the registry was invalid in between.

**Files:**
- Modify: `scripts/schema/generate-registry.js`
- Modify: `scripts/schema/lib.js` (only if `contentFilesFor` needs the `venues`/`events` dirs — verify first)
- Modify: `schema/content-schema-registry.schema.json`

**Interfaces:**
- Consumes: `content/venues/*.yaml`, `content/events/*.yaml`, the schedule-bearing workshops, `content/pages/montagskurs.yaml`.
- Produces: a generator that will emit `registry_revision: 2` with `venue` + `event` record types, all `global.schedule.*` fields, six new enums, `locale_neutral` on venue, and `reference: {target, orphan}` on `global.venue` — plus a meta-schema that validates all of it. **No regeneration happens in this task** (Task 4 does it once).

- [ ] **Step 1: Verify `contentFilesFor` resolves the new dirs**

```bash
node -e "const {contentFilesFor}=require('./scripts/schema/lib'); console.log(contentFilesFor('venues'), contentFilesFor('events'))"
```
Expected: arrays containing `content/venues/orpheumgasse.yaml` and `content/events/solstice-jam.yaml`. If either returns `[]` or throws, read `lib.js`'s `contentFilesFor` and add `venues`/`events` to its collection→glob map (mirror the `workshops → content/workshops/*.yaml` entry).

- [ ] **Step 2: Register the `venue` and `event` record types**

In `scripts/schema/generate-registry.js`, add to the `recordTypes` object (after `workshop`, ≈ line 31):

```js
  venue: {
    source: "content/venues/*.yaml",
    records: contentFilesFor("venues"),
    templates: [],
    ordering: { primary: "global.id", tie_breakers: ["global.sort_order", "global.id"] },
    locale_neutral: true,
  },
  event: {
    source: "content/events/*.yaml",
    records: contentFilesFor("events"),
    templates: ["event"],
    ordering: { primary: "global.start_at", tie_breakers: ["global.sort_order", "global.id"] },
  },
```

- [ ] **Step 3: Extend `enumFor()` heuristics**

Replace `enumFor` (≈ lines 71–77) with:

```js
function enumFor(pathName) {
  if (pathName === "global.status") return "status";
  if (/(?:^|\.)focal_point$|_focus$/.test(pathName)) return "focal_point";
  if (pathName === "global.hero.variant" || pathName.endsWith(".hero_variant")) return "journal_hero_variant";
  if (pathName.endsWith(".pricing_model")) return "pricing_model";
  if (pathName === "global.schedule.event_status" || pathName === "global.schedule.sessions[].status") return "event_status";
  if (pathName === "global.schedule.mode") return "schedule_mode";
  if (pathName === "global.schedule.recurrence.weekday") return "weekday";
  if (pathName === "global.registration.availability") return "availability";
  if (pathName === "global.event_type") return "event_type";
  if (pathName === "global.page_mode") return "page_mode";
  return undefined;
}
```

- [ ] **Step 4: Emit `reference` metadata on the venue field**

In `registryField` (≈ line 87), after the `enum` spread, add:

```js
    ...(field.path === "global.venue" ? { reference: { target: "venue", orphan: "error" } } : {}),
```

This is record-type agnostic, so `fixed_page` Montagskurs's `global.venue` gets orphan-checked too — intended.

- [ ] **Step 5: Bump the revision, add enums + `status_by_record_type` entries**

In the `registry` literal (≈ lines 213–232): change `registry_revision: 1` → `registry_revision: 2`. Add to `enums`:

```js
    event_status: ["scheduled", "cancelled", "postponed", "rescheduled", "moved_online"],
    availability: ["available", "sold_out", "waitlist", "unavailable"],
    event_type: ["jam", "performance", "talk", "retreat", "other"],
    weekday: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    schedule_mode: ["dates", "recurring"],
    page_mode: ["minimal", "full"],
```

Add to `status_by_record_type`:

```js
      venue: ["published"],
      event: ["draft", "upcoming", "current", "past", "unlisted"],
```

- [ ] **Step 6: Teach the meta-schema `locale_neutral` + `reference`**

In `schema/content-schema-registry.schema.json`:

Under each record type's property set, add the optional `"locale_neutral": { "type": "boolean" }`.

Under the field definition's optional keys (alongside `required_when`, `storage`, etc., ≈ lines 57–65), add:

```json
"reference": {
  "type": "object",
  "required": ["target", "orphan"],
  "properties": {
    "target": { "type": "string" },
    "orphan": { "enum": ["error", "warn"] }
  },
  "additionalProperties": false
}
```

- [ ] **Step 7: Syntax-check only (no regeneration yet)**

```bash
node -e "require('./scripts/schema/generate-registry.js')" 2>&1 | head -3 || true
node -e "JSON.parse(require('fs').readFileSync('schema/content-schema-registry.schema.json','utf8'));console.log('meta-schema parses')"
```
The generator may execute on require (it is a script) — if it writes the registry, that is fine and harmless; Task 4 regenerates authoritatively after the CMS edits. What matters here is: no `SyntaxError`, and the meta-schema is valid JSON.

- [ ] **Step 8: Commit**

```bash
git add scripts/schema/generate-registry.js scripts/schema/lib.js schema/content-schema-registry.schema.json
git commit scripts/schema/generate-registry.js scripts/schema/lib.js schema/content-schema-registry.schema.json -m "feat(schema): revision-2 generator — venue/event types, schedule enums, reference + locale_neutral"
```

---

## Task 3: CMS config — schedule editor, venues + events collections, contract check

Placed **before** the regeneration because `generate-registry.js` merges CMS-only leaves from `admin/config.yml` into the registry (see `generate-registry.js:176-211`). Doing CMS first is what collapses four regens into one.

**Files:**
- Modify: `admin/config.yml`
- Modify: `scripts/schema/check-cms-contract.js`
- Create: `migration/fixtures/cms/venue.yaml` (only if the contract checker reads per-type fixtures — check first)

**Interfaces:**
- Consumes: the revision-2 enum literals from Task 2 (as source-of-truth values to mirror).
- Produces: a Sveltia UI where an editor can pick a venue, set `schedule.mode`, add sessions with stable ids, and set `event_status`/`availability`; `venues` + `events` collections; and a contract check that fails if any select's options drift from `registry.enums`.

- [ ] **Step 1: Add the `schedule` object widget to the workshop + event collections**

Under each collection's `global` object field, add a `schedule` object field:

- `event_status` → `select`, options `["scheduled","cancelled","postponed","rescheduled","moved_online"]`, default `scheduled`.
- `mode` → `select`, options `["dates","recurring"]`, default `dates`.
- `sessions` → `list`, fields: `id` (string, required), `start_local` (**`widget: string`, NOT `datetime`** — a datetime widget would re-introduce a zoned value; hint the `YYYY-MM-DDTHH:mm` format), `end_local` (string), `status` (select, optional, same options as `event_status`).
- `recurrence` → object: `weekday` (select, the `weekday` enum), `start_time`/`end_time` (string, `HH:mm`), `anchor` (string), `horizon_months` (number, int), `except` (list of string).
- `featured_occurrences` → list: `id` (string), `teacher` (string, optional).
- Add `registration.availability` → `select` (availability enum) beside the existing `registration.url`.
- Add `global.venue` → `select` or `relation` widget sourcing the `venues` collection.

Follow the existing v2-envelope widget patterns produced by `scripts/schema/migrate-cms-config.js` (`globalField`/`envelopeFields`).

Parse-check:
```bash
node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"
```

- [ ] **Step 2: Add the `venues` and `events` collections**

`venues` → folder `content/venues`, `schema_version` hidden with default `2`, `global` object (`id`, `name`, `street`, `postal_code`, `city`, `country`, optional `geo_lat`/`geo_lng`/`url`), and **no `locales`** block (locale-neutral).

`events` → folder `content/events`, full v2 envelope (`schema_version` / `global` / `locales.de` / `locales.en`) with the same schedule widget plus `event_type` select and `page_mode` select.

- [ ] **Step 3: Extend the contract check**

In `scripts/schema/check-cms-contract.js`:
- Add `venues → venue` and `events → event` to `recordTypeByCollection`.
- Add option-equality assertions (mirroring the existing focal-point check via `inspectEnums`) for `event_status`, `availability`, `event_type`, `weekday`, `schedule_mode`, `page_mode` — each CMS select's options must equal `registry.enums.<name>`.
- For `venues`, assert it has `schema_version` + `global` but **exempt it** from the `locales.de`/`locales.en` requirement.

- [ ] **Step 4: Commit (verification happens in Task 4)**

```bash
git add admin/config.yml scripts/schema/check-cms-contract.js migration/fixtures/cms
git commit admin/config.yml scripts/schema/check-cms-contract.js -m "feat(cms): schedule editor + venues/events collections + enum contract checks"
```

---

## Task 4: The single regeneration — registry, JSON schemas, docs

All content (Task 1), generator + meta-schema (Task 2), and CMS leaves (Task 3) are now in place. Regenerate once.

**Files:**
- Regenerate: `schema/content-schema-v2.registry.json`, `schema/generated/*.schema.json`, `docs/generated/content-schema-v2.md`

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: revision-2 registry + derived artifacts with zero drift under `--check`.

- [ ] **Step 1: Regenerate and validate**

```bash
node scripts/schema/generate-registry.js
npm run schema:registry     # validate-registry.js: field-id uniqueness, class validity, enum refs exist
npm run schema:docs         # generate-docs.js → docs/generated + generate-json-schemas.js → schema/generated
```
Expected: `Generated registry revision 2.`; `schema:registry` passes; both generators complete.

- [ ] **Step 2: Assert the registry contains what it should**

```bash
node -e "
const r=require('./schema/content-schema-v2.registry.json');
console.log('revision', r.registry_revision);
console.log('types', Object.keys(r.record_types).join(','));
console.log('venue locale_neutral', r.record_types.venue.locale_neutral);
console.log('event_status', r.enums.event_status.join('|'));
console.log('event has event_type', r.record_types.event.fields.some(f=>f.path==='global.event_type'));
console.log('venue ref', JSON.stringify(r.record_types.event.fields.find(f=>f.path==='global.venue')?.reference));
"
grep -c '"path": "global.schedule.sessions\[\].start_local"' schema/content-schema-v2.registry.json
grep -c '"path": "global.schedule.recurrence.weekday"' schema/content-schema-v2.registry.json
ls schema/generated/venue.schema.json schema/generated/event.schema.json
grep -c "Registry revision: 2" docs/generated/content-schema-v2.md
```
Expected: `revision 2`; types include `venue` and `event`; `venue locale_neutral true`; the enum list; `true`; `{"target":"venue","orphan":"error"}`; both greps ≥ 1 (proves the dates *and* recurring paths were discovered from real content); both generated schema files exist; docs header shows revision 2.

**If `sessions[].start_local` is typed `datetime` rather than `string`**, a YAML file somewhere has an unquoted datetime. Find it:
```bash
grep -rn 'start_local: [0-9]' content/ migration/fixtures/ | grep -v '"'
```

- [ ] **Step 3: Verify the CMS contract and check-mode gates**

```bash
npm run schema:cms
npm run schema:docs -- --check    # must pass — no stale derived files
```
Expected: both PASS. If `schema:cms` fails on option inequality, fix `admin/config.yml` (the registry is the source of truth, §3.1) and re-run Step 1.

- [ ] **Step 4: UI smoke test**

Run `npm run dev`, open `http://localhost:8081/admin/`, choose **Work with Local Repository**, open a workshop → confirm the schedule editor renders (mode toggle, sessions list, availability select) and the `venues`/`events` collections appear.

- [ ] **Step 5: Commit**

```bash
git add schema/content-schema-v2.registry.json schema/generated docs/generated
git commit schema/content-schema-v2.registry.json schema/generated docs/generated -m "chore(schema): regenerate registry revision 2 + JSON schemas + docs"
```

---

## Task 5: Migration + downgrade mappings

Formerly Plan 2 Tasks 6 + 7. Both are small, both cover v2-native record types with no v1 source, and both are verified by adjacent `schema:*` scripts.

**Files:**
- Modify: `scripts/schema/lib.js` (verify workshop head-key promotion passes `venue` / `registration.availability` / `schedule` through)
- Modify: `scripts/schema/migrate-content.js` (route `venues`/`events`)
- Modify: `scripts/schema/downgrade-content.js` (declare the v2-only fields lossy)

**Interfaces:**
- Consumes: revision-2 content and registry.
- Produces: idempotent up-migration (`schema:migrate -- --all --check` clean) and a downgrade report whose `lossy_fields` lists the v2-only structured fields.

- [ ] **Step 1: Read before writing**

Read `scripts/schema/lib.js`'s `migrateYamlRecord` (≈ lines 252–310), `migrate-content.js`'s collection loop, and `downgrade-content.js`'s reconstruction (≈ lines 47–62).

Key insight: `schedule`, `venue`, and `event` have **no v1 source** — the migration path is **identity**. `migrateYamlRecord` promotes a fixed head-key set and copies the rest, so it very likely already passes the new fields through untouched. **Verify rather than change.**

- [ ] **Step 2: Add venue/event routing to migration**

In `migrate-content.js`, add `venues` and `events` to the iterated collection list (mirror `workshops`). For these v2-native types the migrate step is normalize-and-rewrite, and must be idempotent under `--check`.

- [ ] **Step 3: Declare the lossy fields on downgrade**

For workshop/event downgrade, add to `lossy_fields`: `global.schedule.*`, `global.venue`, `global.registration.availability`, `global.event_type`, `global.page_mode`. V1 has no slot for them; the free-text `locales.*.facts.*` fields remain the v1 rollback representation (which is exactly why Phase 2 keeps them — see Task 9).

Skip the `venue` and `event` record types entirely on downgrade (no v1 collection exists); document them in the report as "v2-only, no downgrade target".

- [ ] **Step 4: Verify**

```bash
npm run schema:migrate -- --all --check
npm run schema:downgrade -- --all --check
node -e "const r=require('./migration/reports/downgrade-content.json'); console.log(r.lossy_fields.includes('global.schedule.mode'))"
```
Expected: both PASS (no diffs — every v2 record already canonical); `true`.

- [ ] **Step 5: Commit**

```bash
git add scripts/schema/lib.js scripts/schema/migrate-content.js scripts/schema/downgrade-content.js migration/reports/downgrade-content.json
git commit scripts/schema/lib.js scripts/schema/migrate-content.js scripts/schema/downgrade-content.js migration/reports/downgrade-content.json -m "feat(schema): migrate routing + downgrade lossy declarations for calendar fields"
```

---

## Task 6: Net-new validators + tests (TDD)

**Files:**
- Modify: `scripts/schema/validate-content.js`
- Create: `scripts/schema/validate-content.test.js`

**Interfaces:**
- Consumes: the registry's `reference` + `locale_neutral` metadata, all content + fixtures.
- Produces: five new checks. Every `valid-*` fixture passes; every `invalid-*` fixture fails with a specific, field-named error.

Note the two intentional scoping decisions: the schedule checks key off **`record.global.schedule` presence, not record type** (so `fixed_page` Montagskurs is validated too), and the `start_at` check runs in **dates mode only**.

- [ ] **Step 1: Write the failing test**

```js
// scripts/schema/validate-content.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateRecord } = require("./validate-content");   // Step 3 exports this
const yaml = require("js-yaml");
const fs = require("node:fs");
const path = require("node:path");
const registry = require("../../schema/content-schema-v2.registry.json");

const FX = "migration/fixtures/content-v2";
const load = (f) => yaml.load(fs.readFileSync(path.join(FX, f), "utf8"));
const venueIds = new Set(["orpheumgasse", "fixture-venue"]);
const run = (file, type) => validateRecord(load(file), { type, registry, venueIds, filenameStem: file.replace(/\.yaml$/, "") });

test("valid dates-mode schedule passes", () => {
  assert.deepEqual(run("valid-schedule-dates.yaml", "workshop").errors, []);
});
test("valid recurring-mode schedule passes", () => {
  assert.deepEqual(run("valid-schedule-recurring.yaml", "workshop").errors, []);
});
test("unquoted datetime (parsed as Date) is rejected", () => {
  const errs = run("invalid-schedule-unquoted-datetime.yaml", "workshop").errors;
  assert.ok(errs.some((e) => /start_local.*must be a quoted floating-local string/.test(e)));
});
test("start_at not equal to earliest session is rejected", () => {
  const errs = run("invalid-schedule-start-at-mismatch.yaml", "workshop").errors;
  assert.ok(errs.some((e) => /start_at.*earliest session/.test(e)));
});
test("orphan localized featured note (§6.4) is rejected", () => {
  const errs = run("invalid-schedule-orphan-featured-note.yaml", "workshop").errors;
  assert.ok(errs.some((e) => /featured_occurrences.*not in global list/.test(e)));
});
test("orphan venue reference is rejected", () => {
  const errs = run("invalid-event-orphan-venue.yaml", "event").errors;
  assert.ok(errs.some((e) => /unknown venue.*nowhere/.test(e)));
});
test("valid event passes", () => {
  assert.deepEqual(run("valid-event.yaml", "event").errors, []);
});
test("locale-neutral venue skips intended_locales check and passes", () => {
  assert.deepEqual(run("valid-venue.yaml", "venue").errors, []);
});
test("venue missing required city is rejected", () => {
  const errs = run("invalid-venue-missing-city.yaml", "venue").errors;
  assert.ok(errs.some((e) => /city/.test(e)));
});
```

- [ ] **Step 2: Run to confirm it fails for the right reason**

```bash
node --test scripts/schema/validate-content.test.js
```
Expected: FAIL — `validateRecord is not a function` (not yet exported).

- [ ] **Step 3: Refactor + implement**

Read `validate-content.js` first. Extract the per-record checks into an exported pure function `validateRecord(record, { type, registry, venueIds, filenameStem })` returning `{ errors: string[] }`. Keep the file's CLI wrapper calling it — the wrapper collects `venueIds` from `content/venues/*.yaml` and calls `validateRecord` per file.

Add these checks inside it:

```js
const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
const isRecordType = (registry, type) => registry.record_types[type] || {};

// (a) locale-neutral: skip intended_locales / locales / status-locale checks
const localeNeutral = !!isRecordType(registry, type).locale_neutral;
// guard the existing intended_locales/locales/status-locale checks with `if (!localeNeutral) { ... }`

// (b) required-field enforcement (catches venue.city etc.)
for (const f of isRecordType(registry, type).fields || []) {
  if (f.required && f.class === "G") {
    const v = getPath(record, f.path);          // getPath = existing dotted-path getter
    if (v === undefined || v === null || v === "") errors.push(`${f.path} is required`);
  }
}

// (c) reference orphan check — declarative, driven by registry `reference` metadata
for (const f of isRecordType(registry, type).fields || []) {
  if (f.reference?.target === "venue") {
    const ref = getPath(record, f.path);
    if (ref && !venueIds.has(ref) && f.reference.orphan === "error") {
      errors.push(`${f.path}: unknown venue: ${ref}`);
    }
  }
}

// (d) schedule checks — keyed off presence, so fixed_page records are covered too
const sc = record.global?.schedule;
if (sc) {
  if (sc.mode === "dates") {
    const sessions = sc.sessions || [];
    const ids = new Set();
    for (const s of sessions) {
      if (!s.id) errors.push("schedule.sessions[]: every session needs a stable id");
      if (ids.has(s.id)) errors.push(`schedule.sessions[]: duplicate session id: ${s.id}`);
      ids.add(s.id);
      for (const k of ["start_local", "end_local"]) {
        if (typeof s[k] !== "string" || !LOCAL_DT.test(s[k])) {
          errors.push(`schedule.sessions[].${k} must be a quoted floating-local string YYYY-MM-DDTHH:mm (got ${typeof s[k]})`);
        }
      }
    }
    // start_at wall-clock == earliest session start_local (DATES MODE ONLY)
    const starts = sessions.map((s) => s.start_local).filter((x) => typeof x === "string").sort();
    const earliest = starts[0];
    const startAtLocal = toLocalMinute(record.global.start_at);   // strip Z → YYYY-MM-DDTHH:mm
    if (earliest && startAtLocal && startAtLocal !== earliest) {
      errors.push(`global.start_at (${startAtLocal}) must equal earliest session start (${earliest})`);
    }
  } else if (sc.mode === "recurring") {
    const r = sc.recurrence || {};
    if (!registry.enums.weekday.includes(r.weekday)) errors.push(`recurrence.weekday invalid: ${r.weekday}`);
    for (const k of ["start_time", "end_time"]) {
      if (!/^\d{2}:\d{2}$/.test(r[k] || "")) errors.push(`recurrence.${k} must be HH:mm`);
    }
  }
  // §6.4 applies to BOTH modes: localized featured notes must key into the global ids
  const globalIds = new Set((sc.featured_occurrences || []).map((f) => f.id));
  for (const loc of Object.keys(record.locales || {})) {
    const notes = record.locales[loc]?.schedule?.featured_occurrences || {};
    for (const key of Object.keys(notes)) {
      if (!globalIds.has(key)) errors.push(`locales.${loc}.schedule.featured_occurrences: id "${key}" not in global list`);
    }
  }
}
```

Add helpers: `getPath` (reuse if one exists) and `toLocalMinute(v)` = `String(v instanceof Date ? v.toISOString() : v).replace('Z','').slice(0,16)`.

Also replace the path-heuristic `checkEnum` with a **registry-`enum`-driven loop**: iterate the record type's fields, and where `f.enum` is set, assert the record's value at `f.path` is in `registry.enums[f.enum]`. This covers all six new enums at once and stays correct as enums are added later.

*(Note: §6.4 is hoisted out of the mode branch here — Plan 2 had it inside the `recurring` branch only, which would have let a dates-mode record carry an orphan featured note. Small correctness fix.)*

- [ ] **Step 4: Run to green**

```bash
node --test scripts/schema/validate-content.test.js
```
Expected: PASS (9 tests).

- [ ] **Step 5: Validate real content and fixtures**

```bash
npm run schema:validate -- --all
npm run schema:validate -- --fixtures
```
Expected: every real record passes (including `content/pages/montagskurs.yaml` with its recurring block); the `invalid-*` fixtures fail as designed (the fixtures runner asserts expected failures).

- [ ] **Step 6: Commit**

```bash
git add scripts/schema/validate-content.js scripts/schema/validate-content.test.js
git commit scripts/schema/validate-content.js scripts/schema/validate-content.test.js -m "feat(schema): venue-ref / §6.4 / floating-local / start_at validators + tests"
```

---

## Task 7: Phase 1 gate — docs narrative + full `schema:check`

**Files:**
- Modify: `docs/schema-migration.md`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: a green `npm run schema:check` (the §3.3 acceptance gate) and prose matching the registry (the registry wins on disagreement, §3.1).

- [ ] **Step 1: Write the revision-2 change-control entry**

Document: the new record types (`venue` locale-neutral, `event`); the `global.schedule` block (dates + recurring modes, mutually exclusive); the six new enums; the floating-local **string** rule (quote your datetimes, and why); the `start_at == earliest session` invariant **and its dates-mode-only scope**; reference fields (`global.venue` → `venue`, orphan = error, applies to any record type carrying the field); §6.4 compliance for `sessions[]` / `featured_occurrences[]`; and that Montagskurs is a `fixed_page` carrying a recurring schedule block (so schedule validation keys off field presence, not record type). Note that `lib/calendar/` (Plan 1) is the consumer and Phase 2 wires Eleventy.

- [ ] **Step 2: Run the complete gate**

```bash
npm run schema:check
node --test scripts/schema/validate-content.test.js
npm run build
```

`schema:check` runs, in order: `schema:registry`, `schema:docs -- --check`, `schema:inventory -- --check`, `schema:cms -- --check`, `schema:validate -- --all`, `verify-body-hashes.js --check`, `schema:migrate -- --all --check`, `schema:downgrade -- --all --check`, `schema:parity -- --fixtures`.

Expected: PASS; 9 tests pass; `npm run build` still passes (Eleventy + `validate-seo.js` — Phase 2 adds the calendar outputs).

If `schema:inventory -- --check` fails, run `npm run schema:inventory` (no `--check`) to refresh, review the diff, and commit it.

- [ ] **Step 3: Commit**

```bash
git add docs/schema-migration.md
git commit docs/schema-migration.md -m "docs(schema): revision 2 change-control entry (calendar schedule + venue/event)"
```

---
---

# PHASE 2 — Eleventy Integration (Tasks 8–13)

Phase 1 must be green before starting. Ends with a green `npm run schema:check && npm run build`.

### File map

| File | Action | Responsibility |
|------|--------|----------------|
| `eleventy.config.js` | modify (**once**, Task 8) | all loaders (`calendar`, `eventPages`, `montagskursFeatured`) + all filters; remove the static `sitemap.xml` passthrough |
| `site/_includes/partials/event-jsonld.njk` | create (T9) | `<script type="application/ld+json">` from `eventJsonLd`/`recurringJsonLd` |
| `site/_includes/partials/add-to-calendar.njk` | create (T9) | Google link + `.ics` download, existing button classes |
| `site/workshop.njk` | modify (T9) | JSON-LD + add-to-calendar + derived date string |
| `site/event-ics.njk` | create (T10) | paginated → `/calendar/<id>.ics` |
| `site/wildcare-ics.njk` | create (T10) | single → `/wildcare.ics` master feed |
| `site/event.njk` | create (T11) | event-record leaf page (`page_mode` minimal/full) |
| `site/montagskurs.njk` | modify (T12) | recurring JSON-LD + add-to-calendar |
| `site/montagskurs-featured.njk` | create (T12) | paginated → `/montagskurs/<date>` |
| `site/sitemap.njk` | create (T13) | generated `sitemap.xml` (replaces passthrough) |
| `sitemap.xml` | delete (T13) | after the generated one is verified to cover every URL |

---

## Task 8: One `eleventy.config.js` pass — every loader and every filter

Formerly seven separate edits across Plan 3 Tasks 1–8. The filters are independent one-liners; writing them together removes six conflict-prone round-trips to a 500-line file. Every filter is smoke-tested here before any template consumes it.

**Files:**
- Modify: `eleventy.config.js`

**Interfaces:**
- Consumes: `lib/calendar` (`toDefinition`, `eventJsonLd`, `recurringJsonLd`, `perEventCalendar`, `buildCalendar`, `recurringVevents`, `masterFeed`, `googleUrl`, `expandRecurrence`, `formatDateRange`, `formatRecurring`); `content/venues/*.yaml`; dated records in `content/workshops/`, `content/events/`, `content/pages/`.
- Produces global data:
  ```
  calendar.venues            // { <id>: {name,street,postal_code,city,country} }
  calendar.definitions       // CalendarDefinition[] (every record with a schedule block)
  calendar.pages             // definitions that get a per-event .ics
  calendar.byId              // { <def.id>: CalendarDefinition }
  eventPages                 // [{ slug, route, page_mode, primary_locale, de, en, href }]
  montagskursFeatured        // [{ date, teacher, start_local, end_local, note_de, note_en, href, def }]
  ```
  …and filters `eventJsonLd`, `featuredOccurrenceJsonLd`, `calendarGoogleUrl`, `perEventIcs`, `masterIcs`, `formatDefDate`.

- [ ] **Step 1: Add the loaders**

Near the other loaders (beside `loadWorkshopContent`, ≈ line 439):

```js
const calendar = require("./lib/calendar");

function loadVenues() {
  const dir = path.join(__dirname, "content", "venues");
  const venues = {};
  if (!fs.existsSync(dir)) return venues;
  for (const filename of fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
    const raw = yaml.load(fs.readFileSync(path.join(dir, filename), "utf8"));
    const g = raw.global;
    venues[g.id] = { name: g.name, street: g.street, postal_code: g.postal_code, city: g.city, country: g.country };
  }
  return venues;
}

function loadCalendar() {
  const venues = loadVenues();
  const definitions = [];
  // `pages` is included so the Montagskurs fixed_page's recurring block participates
  for (const coll of ["workshops", "events", "pages"]) {
    const dir = path.join(__dirname, "content", coll);
    if (!fs.existsSync(dir)) continue;
    for (const filename of fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
      const raw = yaml.load(fs.readFileSync(path.join(dir, filename), "utf8"));
      if (!raw?.global?.schedule) continue;            // only dated records participate
      definitions.push(calendar.toDefinition(raw, { venues }));
    }
  }
  definitions.sort((a, b) => a.id.localeCompare(b.id)); // deterministic feed order
  const byId = Object.fromEntries(definitions.map((d) => [d.id, d]));
  return { venues, definitions, pages: definitions, byId };
}
```

Then the two page-list loaders. Model `loadEventContent` on `loadWorkshopContent` (reuse `normalizeV2`/`templateLocale` if applicable):

```js
function loadEventContent() {
  const dir = path.join(__dirname, "content", "events");
  const pages = [];
  if (!fs.existsSync(dir)) return { pages };
  for (const filename of fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
    const raw = yaml.load(fs.readFileSync(path.join(dir, filename), "utf8"));
    const g = raw.global;
    pages.push({
      slug: g.id,
      route: g.route,
      page_mode: g.page_mode || "minimal",
      primary_locale: (g.intended_locales || ["de"])[0],
      de: raw.locales?.de || {},
      en: raw.locales?.en || {},
      href: `events/${g.id}.html`,
    });
  }
  return { pages };
}

function loadMontagskursFeatured(cal) {
  const def = cal.byId.montagskurs;
  if (!def) return [];                                  // guard: no schedule block yet
  return (def.featured || []).map((occ) => ({
    date: occ.id,
    teacher: occ.teacher || null,
    start_local: occ.start_local,
    end_local: occ.end_local,
    note_de: def.locales?.de?.schedule?.featured_occurrences?.[occ.id]?.note || null,
    note_en: def.locales?.en?.schedule?.featured_occurrences?.[occ.id]?.note || null,
    href: `montagskurs/${occ.id}.html`,
    def,
  }));
}
```

Read `lib/calendar`'s definition shape to confirm the exact `def.featured` field name and whether occurrences carry `start_local`/`end_local` or need deriving from `def.recurrence.start_time`/`end_time`. Adjust accordingly — this is the one place the loader depends on Plan 1's internal naming.

- [ ] **Step 2: Register the globals**

Beside the `workshopPages`/`journalArticlePages` registrations (≈ line 561):

```js
const calendarData = loadCalendar();
eleventyConfig.addGlobalData("calendar", () => calendarData);
eleventyConfig.addGlobalData("eventPages", () => loadEventContent().pages);
eleventyConfig.addGlobalData("montagskursFeatured", () => loadMontagskursFeatured(calendarData));
```

Add `content/venues`, `content/events`, and `content/pages` to the watch targets alongside `content/`.

- [ ] **Step 3: Add all six filters**

njk cannot call `require`d functions directly, so everything crosses the boundary as a filter:

```js
eleventyConfig.addFilter("eventJsonLd", (def) =>
  def.mode === "recurring"
    ? calendar.recurringJsonLd(def, { locale: def.primaryLocale })
    : calendar.eventJsonLd(def, { locale: def.primaryLocale })
);

// concrete single-occurrence Event for a featured Monday leaf page:
// shallow dates-mode projection of the recurring def, one session
eleventyConfig.addFilter("featuredOccurrenceJsonLd", (occ) => {
  const def = occ.def;
  const projected = {
    ...def,
    mode: "dates",
    recurrence: undefined,
    sessions: [{ id: occ.date, start_local: occ.start_local, end_local: occ.end_local }],
    span: { start: occ.start_local, end: occ.end_local },
  };
  return calendar.eventJsonLd(projected, { locale: def.primaryLocale });
});

eleventyConfig.addFilter("calendarGoogleUrl", (def) => {
  const l = def.locales[def.primaryLocale] || {};
  const loc = `${def.venue.name}, ${def.venue.street}, ${def.venue.postal_code} ${def.venue.city}`;
  const details = def.registrationUrl ? `Anmeldung / Registration: ${def.registrationUrl}` : (l.summary || "");
  if (def.mode === "recurring") {
    const first = calendar.expandRecurrence(def.recurrence, { from: def.recurrence.anchor, to: def.recurrence.anchor })[0]
      || { start_local: `${def.recurrence.anchor}T${def.recurrence.start_time}`, end_local: `${def.recurrence.anchor}T${def.recurrence.end_time}` };
    return calendar.googleUrl({ title: l.title, details, location: loc, start_local: first.start_local, end_local: first.end_local });
  }
  return calendar.googleUrl({ title: l.title, details, location: loc, start_local: def.span.start, end_local: def.span.end });
});

eleventyConfig.addFilter("perEventIcs", (def) =>
  def.mode === "recurring"
    ? calendar.buildCalendar(calendar.recurringVevents(def))
    : calendar.perEventCalendar(def)
);

eleventyConfig.addFilter("masterIcs", (defs) => calendar.masterFeed(defs));

eleventyConfig.addFilter("formatDefDate", (def, locale) =>
  def.mode === "recurring"
    ? calendar.formatRecurring(def.recurrence, locale)
    : calendar.formatDateRange(def.span.start, def.span.end, locale)
);
```

- [ ] **Step 4: Remove the static sitemap passthrough**

Delete `eleventyConfig.addPassthroughCopy({ "sitemap.xml": "sitemap.xml" });` (or its equivalent form) at ≈ line 532. `grep -n sitemap eleventy.config.js` to catch any other match. The root `sitemap.xml` file stays on disk until Task 13 confirms the generated one is complete.

- [ ] **Step 5: Verify the data builds**

The config exports a function, so it can't be required directly. Temporarily append a log inside `loadCalendar` before the `return`:

```js
  console.log("CALENDAR:", JSON.stringify(definitions.map((d) => ({ id: d.id, mode: d.mode, venue: d.venue?.name })), null, 2));
```

Then:
```bash
npx @11ty/eleventy --dryrun 2>&1 | head -40
```
Expected: `how-we-move-together` (dates), `cellular-touch` (dates), `bewegungsrevolution` (dates), `solstice-jam` (dates), `montagskurs` (**recurring**) — each with a resolved venue name, and no `toDefinition` crash. **Remove the temp log** before committing.

Then smoke-test the filters without any template, by asserting the library functions the filters wrap return sane values:
```bash
node -e "
const c=require('./lib/calendar'), y=require('js-yaml'), fs=require('fs');
const venues={orpheumgasse:y.load(fs.readFileSync('content/venues/orpheumgasse.yaml','utf8')).global};
const w=y.load(fs.readFileSync('content/workshops/how-we-move-together.yaml','utf8'));
const d=c.toDefinition(w,{venues});
console.log('jsonld @type', c.eventJsonLd(d,{locale:d.primaryLocale})['@type']);
console.log('ics head', c.perEventCalendar(d).slice(0,22).replace(/\r/g,'\\\\r'));
console.log('date en', c.formatDateRange(d.span.start, d.span.end, 'en'));
"
```
Expected: `Event`; an ICS string beginning `BEGIN:VCALENDAR\r`; a human range like `9–11 October 2026`.

- [ ] **Step 6: Commit**

```bash
git add eleventy.config.js
git commit eleventy.config.js -m "feat(calendar): loaders + filters for calendar/events/featured; drop sitemap passthrough"
```

---

## Task 9: Workshop pages — JSON-LD, add-to-calendar, derived date string

Formerly Plan 3 Tasks 2, 3, and 9 — three commits and three edits to the same file, all verified by the same build.

**Files:**
- Create: `site/_includes/partials/event-jsonld.njk`
- Create: `site/_includes/partials/add-to-calendar.njk`
- Modify: `site/workshop.njk`

**Interfaces:**
- Consumes: `calendar.byId`, the `eventJsonLd` / `calendarGoogleUrl` / `formatDefDate` filters, the `.ics` path `/calendar/<id>.ics` (Task 10).
- Produces: JSON-LD in each workshop `<head>`; two calendar buttons in the CTA area; the human date string derived from the structured block.

- [ ] **Step 1: Capture the current date strings as a parity baseline**

```bash
npm run build
for f in how-we-move-together cellular-touch bewegungsrevolution; do
  echo "--- $f"; grep -o 'data-de="[^"]*20[0-9][0-9][^"]*"' _site/$f.html | head -5
done
```
Record the output. Step 4 diffs against it.

- [ ] **Step 2: Write both partials**

`site/_includes/partials/event-jsonld.njk`:
```njk
{%- set def = calendar.byId[jsonldId] -%}
{%- if def -%}
<script type="application/ld+json">
{{ def | eventJsonLd | json | safe }}
</script>
{%- endif -%}
```
(`json` is the existing `JSON.stringify` filter, `eleventy.config.js:517`.)

`site/_includes/partials/add-to-calendar.njk`:
```njk
{%- set def = calendar.byId[calId] -%}
{%- if def -%}
<div class="add-to-calendar">
  <a class="btn btn-secondary" href="/calendar/{{ def.id }}.ics" download
     data-de="Zum Kalender hinzufügen (.ics)" data-en="Add to calendar (.ics)">Zum Kalender hinzufügen (.ics)</a>
  <a class="btn btn-ghost" href="{{ def | calendarGoogleUrl }}" target="_blank" rel="noopener"
     data-de="Zu Google Kalender" data-en="Add to Google Calendar">Zu Google Kalender</a>
</div>
{%- endif -%}
```

**Before using `.add-to-calendar`, grep for it:** `grep -n 'add-to-calendar' css/styles.css`. If it does not exist, wrap the links in an existing container class instead. **Do not add CSS.** `.btn-ghost` must stay paired with `.btn`.

Both partials no-op via their `if def` guard, so they are safe to include on pages without a schedule block (e.g. past workshops).

- [ ] **Step 3: Wire all three changes into `site/workshop.njk`**

In `<head>`, after the `seo.njk` include (≈ line 32):
```njk
{%- set jsonldId = workshop.slug -%}
{% include "partials/event-jsonld.njk" %}
```

In the CTA/registration area (near the register button, e.g. the `closing_cta`/registration block):
```njk
{%- set calId = workshop.slug -%}
{% include "partials/add-to-calendar.njk" %}
```

For the date display, replace the hand-typed `facts.date` output with the derived value, guarded and with a free-text fallback:
```njk
{%- set def = calendar.byId[workshop.slug] -%}
{%- if def -%}
  <span data-de="{{ def | formatDefDate('de') }}" data-en="{{ def | formatDefDate('en') }}">{{ def | formatDefDate('de') }}</span>
{%- else -%}
  <span data-de="{{ workshop.de.facts.date }}" data-en="{{ workshop.en.facts.date }}">{{ workshop.de.facts.date }}</span>
{%- endif -%}
```
(Match the surrounding markup's actual element and attribute names — read the file.)

**Leave the multi-line `facts.schedule[]` list as free text.** Session-level display is a larger design change and is explicitly deferred; the free-text fields also remain the v1 downgrade representation (Task 5).

- [ ] **Step 4: Verify**

```bash
npm run build
node -e "
const s=require('fs').readFileSync('_site/how-we-move-together.html','utf8');
const ld=JSON.parse(s.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/)[1]);
console.log(ld['@type'], ld.startDate, ld.location.name);
"
grep -A3 'add-to-calendar' _site/how-we-move-together.html
```
Expected: `Event 2026-10-09T19:00 Orpheumgasse Studio`; both links present, `.ics` href `/calendar/how-we-move-together.ics`, Google href starting `https://calendar.google.com/calendar/render?` and containing `ctz=Europe/Vienna`.

Then diff the date strings against the Step 1 baseline. `formatDateRange` should produce `9–11 October 2026`. **If ICU punctuation differs** (en-dash vs hyphen, non-breaking space), accept the ICU-correct form and note it — the success criterion is "generated bilingually from the structured block," not byte-identical to the old hand-typed text.

- [ ] **Step 5: Commit**

```bash
git add site/_includes/partials/event-jsonld.njk site/_includes/partials/add-to-calendar.njk site/workshop.njk
git commit site/_includes/partials/event-jsonld.njk site/_includes/partials/add-to-calendar.njk site/workshop.njk -m "feat(calendar): workshop JSON-LD, add-to-calendar UI, derived date display"
```

---

## Task 10: ICS outputs — per-event files and the master feed

Formerly Plan 3 Tasks 4 + 5. Same format, same CRLF/folding risk, same verification — testing them together means a folding bug surfaces in both at once.

**Files:**
- Create: `site/event-ics.njk`
- Create: `site/wildcare-ics.njk`

**Interfaces:**
- Consumes: `calendar.pages`, `calendar.definitions`, the `perEventIcs` / `masterIcs` filters.
- Produces: `_site/calendar/<id>.ics` per definition and `_site/wildcare.ics` aggregating every dates-mode VEVENT plus every recurring series and override.

- [ ] **Step 1: Write both templates**

`site/event-ics.njk`:
```njk
---
pagination:
  data: calendar.pages
  size: 1
  alias: def
permalink: "calendar/{{ def.id }}.ics"
eleventyExcludeFromCollections: true
---
{{- def | perEventIcs | safe -}}
```

`site/wildcare-ics.njk`:
```njk
---
permalink: wildcare.ics
eleventyExcludeFromCollections: true
---
{{- calendar.definitions | masterIcs | safe -}}
```

The `{{-` / `-}}` are load-bearing: the library string already ends with CRLF, and any njk-added whitespace breaks RFC 5545.

- [ ] **Step 2: Verify RFC shape survives njk**

```bash
npm run build
node -e "
const fs=require('fs');
const s=fs.readFileSync('_site/calendar/how-we-move-together.ics','utf8');
console.log('starts', s.startsWith('BEGIN:VCALENDAR\r\n'));
console.log('ends', s.endsWith('END:VCALENDAR\r\n'));
console.log('crlf', /\r\n/.test(s));
console.log('uid', s.includes('UID:how-we-move-together-fri-eve@wildcare.space'));
const m=fs.readFileSync('_site/wildcare.ics','utf8');
console.log('master starts', m.startsWith('BEGIN:VCALENDAR'), 'ends', m.endsWith('END:VCALENDAR\r\n'));
console.log('vevents', (m.match(/BEGIN:VEVENT/g)||[]).length);
"
ls _site/calendar/
```
Expected: all `true`; a VEVENT count equal to the total sessions across every dates-mode definition plus the recurring series and its overrides; one `.ics` per definition in `_site/calendar/` including `montagskurs.ics`.

**If CRLF became bare LF** (njk normalized line endings), switch the offending template to a `.11ty.js` file that returns the string from `render()` and sets `permalink` in `data()` — a JS template does not reflow the string. Check the LF result first; only escalate if needed. This is the one place Eleventy can silently corrupt the output.

- [ ] **Step 3: Verify folding**

```bash
node -e "
const s=require('fs').readFileSync('_site/wildcare.ics','utf8');
for (const line of s.split('\r\n')) if (Buffer.byteLength(line,'utf8')>75) { console.error('FOLD VIOLATION:', line); process.exit(1); }
console.log('folding OK,', (s.match(/BEGIN:VEVENT/g)||[]).length, 'VEVENTs');
"
```
Expected: `folding OK, <N> VEVENTs`.

- [ ] **Step 4: Confirm `.ics` stays out of collections**

The `eleventyExcludeFromCollections` front matter handles collections; Task 13's sitemap only iterates HTML page lists. Spot-check that no collection picked them up if the build warns.

- [ ] **Step 5: Commit**

```bash
git add site/event-ics.njk site/wildcare-ics.njk
git commit site/event-ics.njk site/wildcare-ics.njk -m "feat(calendar): per-event .ics + subscribable master feed /wildcare.ics"
```

---

## Task 11: `event.njk` leaf pages for the `event` record type

**Files:**
- Create: `site/event.njk`

**Interfaces:**
- Consumes: `eventPages`, `calendar.byId`, both partials, the `formatDefDate` filter.
- Produces: `_site/events/<id>.html` at route `/events/<id>`. `page_mode: minimal` → canonical + JSON-LD + add-to-calendar + compact hero; `page_mode: full` → the complete layout.

- [ ] **Step 1: Write the paginated leaf template**

`site/event.njk` — paginate over `eventPages` with `permalink: "{{ event.href }}"`.

In `<head>`: set the `seo*` variables (title, description, canonical `https://wildcare.space{{ event.route }}`, and the **full OG block including `og:image` https + width + height + alt** — `validate-seo.js` requires all 17 patterns; fall back to the site default OG if the event sets none), include `seo.njk`, then:
```njk
{%- set jsonldId = event.slug -%}
{% include "partials/event-jsonld.njk" %}
```

In the body, for `minimal`: a compact hero with title, the human date via `{{ calendar.byId[event.slug] | formatDefDate('de') }}` / `('en')` in the `data-de`/`data-en` attributes, the venue, the register button, and:
```njk
{%- set calId = event.slug -%}
{% include "partials/add-to-calendar.njk" %}
```
For `full`: the complete layout. Use the `data-de`/`data-en` pattern throughout for bilingual events.

- [ ] **Step 2: Verify**

```bash
npm run build
test -f _site/events/solstice-jam.html && echo "leaf exists"
node -e "
const s=require('fs').readFileSync('_site/events/solstice-jam.html','utf8');
console.log('jsonld', /application\/ld\+json/.test(s));
console.log('ics link', /calendar\/solstice-jam\.ics/.test(s));
console.log('og:image:width', /og:image:width/.test(s));
console.log('og:image:alt', /og:image:alt/.test(s));
"
```
Expected: `leaf exists` and four `true`. The OG checks matter now rather than in Task 13 — this page is about to enter the sitemap, and `validate-seo.js` gates the deploy.

- [ ] **Step 3: Commit**

```bash
git add site/event.njk
git commit site/event.njk -m "feat(calendar): event leaf pages (page_mode minimal/full)"
```

---

## Task 12: Montagskurs — recurring JSON-LD + featured-Monday leaf pages

Templates only. The content decision and the recurring schedule block landed in Task 1, and `montagskursFeatured` already exists from Task 8.

**Files:**
- Modify: `site/montagskurs.njk`
- Create: `site/montagskurs-featured.njk`

**Interfaces:**
- Consumes: `calendar.byId.montagskurs`, `montagskursFeatured`, the `eventJsonLd` (recurring branch) and `featuredOccurrenceJsonLd` filters.
- Produces: recurring `Event` JSON-LD with `eventSchedule` (and **no** `startDate`) on `/montagskurs`; `_site/montagskurs/<date>.html` per featured occurrence with a concrete single-occurrence `Event`.

- [ ] **Step 1: Wire the main page**

In `site/montagskurs.njk` `<head>`:
```njk
{%- set jsonldId = "montagskurs" -%}
{% include "partials/event-jsonld.njk" %}
```
The `eventJsonLd` filter routes recurring definitions to `recurringJsonLd` automatically.

In the CTA area:
```njk
{%- set calId = "montagskurs" -%}
{% include "partials/add-to-calendar.njk" %}
```

- [ ] **Step 2: Write the featured-Monday leaf template**

`site/montagskurs-featured.njk` — paginate over `montagskursFeatured`, alias `occ`, `permalink: "montagskurs/{{ occ.date }}.html"`, canonical `https://wildcare.space/montagskurs/{{ occ.date }}`.

Emit a **concrete** single-occurrence Event (not the recurring schedule):
```njk
<script type="application/ld+json">
{{ occ | featuredOccurrenceJsonLd | json | safe }}
</script>
```

Body: the date, `occ.teacher`, the localized note via `data-de="{{ occ.note_de }}" data-en="{{ occ.note_en }}"`, and add-to-calendar for that single date. Since the add-to-calendar partial keys off `calendar.byId` (the whole recurring series), either accept the series-level `.ics`/Google link or inline a per-occurrence Google link built from `occ.start_local`/`occ.end_local` — the simpler series-level link is acceptable for a first pass.

Satisfy all 17 `validate-seo.js` `<head>` requirements, including the full OG block.

- [ ] **Step 3: Verify**

```bash
npm run build
node -e "
const s=require('fs').readFileSync('_site/montagskurs.html','utf8');
const ld=JSON.parse(s.match(/ld\+json\">([\s\S]*?)<\/script>/)[1]);
console.log('byDay', ld.eventSchedule.byDay, '| has startDate:', 'startDate' in ld);
"
ls _site/montagskurs/*.html
node -e "
const s=require('fs').readFileSync('_site/montagskurs/2026-11-16.html','utf8');
const ld=JSON.parse(s.match(/ld\+json\">([\s\S]*?)<\/script>/)[1]);
console.log(ld['@type'], ld.startDate, '| has eventSchedule:', 'eventSchedule' in ld);
"
```
Expected: `https://schema.org/Monday | has startDate: false`; one leaf per featured occurrence (e.g. `_site/montagskurs/2026-11-16.html`); that leaf shows `Event 2026-11-16T17:45 | has eventSchedule: false`.

- [ ] **Step 4: Commit**

```bash
git add site/montagskurs.njk site/montagskurs-featured.njk
git commit site/montagskurs.njk site/montagskurs-featured.njk -m "feat(calendar): Montagskurs recurring JSON-LD + featured-Monday leaf pages"
```

---

## Task 13: Generated `sitemap.xml` + full deploy gate

Formerly Plan 3 Tasks 8 + 10. The sitemap *is* the deploy gate's input, so generating it and running the gate are one step.

**Files:**
- Create: `site/sitemap.njk`
- Delete: `sitemap.xml` (root static file), after verification
- Modify: `README.md` / `EDITING.md` if they describe the sitemap as hand-maintained

**Interfaces:**
- Consumes: the static page set, `cms.workshops.pages`, `eventPages`, `montagskursFeatured`, `journalArticlePages`.
- Produces: `_site/sitemap.xml` covering every HTML leaf with clean extension-less URLs, and **no `.ics` URLs**; a green `npm run schema:check && npm run build`.

- [ ] **Step 1: Read the existing sitemap first**

```bash
grep -o '<loc>[^<]*</loc>' sitemap.xml
```
The generated static-path list must match this set exactly, or you will silently drop pages from indexing.

- [ ] **Step 2: Write the template**

`site/sitemap.njk`:
```njk
---
permalink: sitemap.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- set staticPaths = ["/", "/team", "/programm", "/mitmachen", "/kontakt", "/journal", "/montagskurs", "/impressum", "/datenschutz", "/brand"] -%}
{%- for p in staticPaths %}
  <url><loc>https://wildcare.space{{ p }}</loc></url>
{%- endfor -%}
{%- for w in cms.workshops.pages %}
  <url><loc>{{ ("/" + w.slug) | absoluteSiteUrl }}</loc></url>
{%- endfor -%}
{%- for e in eventPages %}
  <url><loc>https://wildcare.space{{ e.route }}</loc></url>
{%- endfor -%}
{%- for occ in montagskursFeatured %}
  <url><loc>https://wildcare.space/montagskurs/{{ occ.date }}</loc></url>
{%- endfor -%}
{%- for a in journalArticlePages %}
  <url><loc>{{ a.href | absoluteSiteUrl }}</loc></url>
{%- endfor %}
</urlset>
```
`absoluteSiteUrl` is the existing filter that strips `.html` and resolves against the origin. Replace `staticPaths` with the real set from Step 1.

- [ ] **Step 3: Verify coverage and the SEO gate**

```bash
npm run build
node -e "
const s=require('fs').readFileSync('_site/sitemap.xml','utf8');
console.log('locs', (s.match(/<loc>/g)||[]).length);
console.log('workshop present', /how-we-move-together/.test(s));
console.log('event present', /events\/solstice-jam/.test(s));
console.log('featured present', /montagskurs\/2026-11-16/.test(s));
console.log('NO ics', !/\.ics/.test(s));
"
```
Expected: `npm run build` **PASSES** (every sitemap URL exists in `_site/` and passes all 17 head checks) and all four booleans `true`.

**The likeliest failure is an OG-dimension gap.** `how-we-move-together` sets `meta.og_image` with no width/height and was not previously in the sitemap; it must now either inherit the site default OG dimensions or set its own. If `validate-seo.js` reports a missing pattern, it names the page and the pattern — fix that page's `<head>`, not the validator.

- [ ] **Step 4: Delete the static file**

```bash
git rm sitemap.xml
npm run build && echo "still green"
```
Expected: still green — the generated sitemap fully replaces it.

- [ ] **Step 5: Run the full CI gate in CI order**

```bash
npm run schema:check && npm run build
```
Expected: both PASS. `schema:check` covers Phase 1; `build` = Eleventy + `validate-seo.js`.

- [ ] **Step 6: Owner-run manual verification**

- **Calendar import:** open `_site/wildcare.ics` and one `_site/calendar/<id>.ics`; import into Google Calendar and Apple Calendar. Confirm events appear **once** (stable UID), at the **correct wall-clock times**, and that re-importing after an `updated_at` bump updates rather than duplicates.
- **JSON-LD:** paste the blocks from `_site/how-we-move-together.html`, `_site/events/solstice-jam.html`, `_site/montagskurs.html`, and `_site/montagskurs/2026-11-16.html` into the schema.org validator / Google Rich Results Test. Confirm valid `Event` / `eventSchedule` with no errors. (Rich cards are not guaranteed for AT — per the design's non-goals.)

- [ ] **Step 7: Update docs that describe the sitemap as static**

```bash
grep -rn "sitemap" README.md EDITING.md docs/ 2>/dev/null
```
Update anything that says the sitemap is hand-maintained.

- [ ] **Step 8: Commit and finish the branch**

```bash
git add site/sitemap.njk README.md EDITING.md
git commit site/sitemap.njk sitemap.xml README.md EDITING.md -m "feat(seo): generate sitemap.xml (covers events + featured Mondays)"
```

Then finish via `superpowers:finishing-a-development-branch` (merge to `production`; the CMS/Pages deploy pipeline builds `_site/` and publishes). Confirm `validate-seo.js` passes in CI.

---
---

## Deliberately out of scope

Carried forward unchanged from both source plans:

- **Retiring the free-text `facts.schedule[]` multi-line list.** Only the single date-range string is cut over (Task 9). A definition-driven per-session renderer is a separate design task — and the free-text fields remain the v1 downgrade representation (Task 5).
- **`performer` and price on JSON-LD `offers`.** The `CalendarDefinition` does not carry the data. Add when the schema does.
- **Visual/UX polish of the add-to-calendar surface, and an events overview page.** Placement is left to a later visual pass by the owner; this plan renders functional, class-reusing UI in the existing CTA areas.
- **Localized routes.** Out of scope per the original spec.
- **`start_at == first occurrence` for recurring mode.** See the narrowing note in the change table.

## Verification summary

| Gate | Command | After task |
|---|---|---|
| Registry valid, revision 2 | `npm run schema:registry` | 4 |
| No derived-file drift | `npm run schema:docs -- --check` | 4 |
| CMS ↔ registry enum parity | `npm run schema:cms` | 4 |
| Migrate/downgrade idempotent | `npm run schema:migrate -- --all --check` / `schema:downgrade` | 5 |
| Validators | `node --test scripts/schema/validate-content.test.js` (9 pass) | 6 |
| **Phase 1 gate** | `npm run schema:check` | **7** |
| JSON-LD present + correct | `npm run build` + node assertions | 9, 11, 12 |
| RFC 5545 CRLF + 75-octet folding | node assertions on `_site/**/*.ics` | 10 |
| **Deploy gate** | `npm run schema:check && npm run build` | **13** |
