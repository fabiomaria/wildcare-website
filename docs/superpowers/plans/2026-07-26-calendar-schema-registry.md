# Calendar Schema & Registry Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bump the content schema to `registry_revision: 2`, adding a locale-neutral calendar `schedule` block (dates + recurring modes), a `venue` record type, an `event` record type, and the enums (`event_status`, `availability`, `event_type`, `weekday`, `schedule_mode`) the calendar core library (Plan 1) consumes — with generated schemas/docs, CMS config, migration/downgrade mappings, and validators all passing the full `schema:check` gate.

**Architecture:** The registry is *generated*, not hand-authored: `scripts/schema/generate-registry.js` discovers field paths by walking `content/**/*.yaml` + `admin/config.yml`, then stamps hardcoded `registry_revision` and `enums` literals. So the workflow for every schema change is: (1) put the new field/record shapes into content (fixtures + real records), (2) teach the generator the new record types + enum heuristics + literals, (3) regenerate the registry, (4) regenerate derived JSON schemas + docs, (5) update `admin/config.yml` + its contract check, (6) update migration/downgrade branches, (7) add net-new validators, (8) pass `schema:check`. This plan produces the *record shape* that Plan 1's `lib/calendar/model.js` (`toDefinition(record, {venues})`) already expects, and that Plan 3's Eleventy templates will consume.

**Tech Stack:** Node.js v24 (CommonJS), `js-yaml`, the existing `scripts/schema/*` tooling (`lib.js`, `generate-registry.js`, `generate-json-schemas.js`, `generate-docs.js`, `validate-content.js`, `validate-registry.js`, `migrate-content.js`, `downgrade-content.js`, `check-cms-contract.js`). Sveltia CMS (`admin/config.yml`). No new npm dependencies.

## Global Constraints

- **Work on branch `production`** (or a worktree explicitly based on `production` — NEVER `main`; see repo CLAUDE.md branch topology). Confirm `content/`, `schema/`, `scripts/schema/`, `admin/config.yml` exist at repo root before editing.
- **CommonJS only** (`require`/`module.exports`, `"use strict";`); match existing `scripts/schema/*.js` style.
- **No new npm dependencies.**
- **Generated files are never hand-edited** (`docs/schema-migration.md` §3.3). Regenerate `schema/content-schema-v2.registry.json`, `schema/generated/*.schema.json`, `docs/generated/*` via their scripts. The registry generator (`generate-registry.js`) is NOT wired to an npm script — run it directly: `node scripts/schema/generate-registry.js`.
- **§3.3 change-control bundle (one PR):** (1) increment `registry_revision`; (2) update/add fixtures; (3) regenerate JSON schemas + docs; (4) update CMS config if editor-visible fields changed; (5) update migration + downgrade mappings when storage changed; (6) pass `npm run schema:check`.
- **Floating local wall-clock everywhere.** Session/recurrence times are floating-local **strings** `YYYY-MM-DDTHH:mm` (dates) / `HH:mm` (recurrence). They MUST be quoted in YAML — an unquoted `2026-10-09T19:00` is parsed by js-yaml as a `Date` (typed `datetime` in the registry, serialized with a `Z` offset), which breaks floating-local semantics. This is a validator-enforced rule.
- **`updated_at`** is a UTC `...Z` instant (unquoted datetime is fine here — it is a real instant). It is the calendar library's only source for SEQUENCE/DTSTAMP/LAST-MODIFIED.
- **`global.start_at` stays the workshop `ordering.primary`**; a new validator enforces its wall-clock `YYYY-MM-DDTHH:mm` equals the earliest session `start_local` (dates mode) or the anchor's first occurrence (recurring mode).
- **Stable ids on every repeatable item** (`sessions[].id`, `featured_occurrences[].id`); localized copy keyed by that id; never join by array position (`docs/schema-migration.md` §6.4).
- **Enum values are closed** — unknown `event_status`/`availability`/`event_type`/`weekday`/`schedule_mode`/`page_mode` values are build errors.
- **Domain:** venue country codes are ISO-3166 alpha-2 (e.g. `AT`). Site origin `https://wildcare.space`.
- **Commit with an explicit pathspec** (`git commit path -m "..."`) — never a bare `git commit` (this tree has carried unrelated staged changes).

## Record shape this plan produces (the contract Plan 1 already consumes)

Plan 1's `toDefinition(record, { venues })` (`lib/calendar/model.js`) reads exactly these paths — this plan makes them official:

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
  venue: orpheumgasse                     # reference → content/venues/orpheumgasse.yaml
  event_type: jam                         # events ONLY (→ schema.org @type); absent on workshops
  page_mode: full                         # events ONLY: minimal | full
  registration:
    url: https://tally.so/r/lbXDW5
    availability: available               # enum: available | sold_out | waitlist | unavailable
  schedule:
    event_status: scheduled               # enum: scheduled|cancelled|postponed|rescheduled|moved_online
    previous_start_local: null            # set only on reschedule → schema.org previousStartDate
    mode: dates                           # enum: dates | recurring
    # --- dates mode ---
    sessions:
      - { id: fri-eve, start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00" }
      - { id: sat-aft, start_local: "2026-10-10T13:00", end_local: "2026-10-10T17:00" }
      # optional per-session `status:` (enum event_status) so one session can cancel alone
    # --- recurring mode (mutually exclusive with sessions) ---
    recurrence:
      weekday: monday                     # enum weekday
      start_time: "17:45"                 # floating local HH:mm
      end_time: "19:15"
      anchor: "2026-01-05"                # series DTSTART date
      horizon_months: 6                   # website listing expansion only (feed is unbounded)
      except: ["2026-01-19"]              # EXDATE dates
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
# content/venues/<id>.yaml  — locale-neutral record type (no intended_locales / locales block)
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

## Task 1: Author venue records + venue fixture (content first, so the generator can discover the shape)

**Files:**
- Create: `content/venues/orpheumgasse.yaml`
- Create: `migration/fixtures/content-v2/valid-venue.yaml`
- Create: `migration/fixtures/content-v2/invalid-venue-missing-city.yaml`

**Interfaces:**
- Produces: the `venue` record shape that Task 3 registers as a record type and Task 8's venue-reference validator resolves against. `toDefinition`'s `opts.venues` map (Plan 1) is `{ <id>: { name, street, postal_code, city, country } }` — the loader in Plan 3 will build it from these files.

- [ ] **Step 1: Write the venue record**

`content/venues/orpheumgasse.yaml`:
```yaml
schema_version: 2
global:
  id: orpheumgasse
  name: Orpheumgasse Studio
  street: Orpheumgasse 11
  postal_code: "8010"
  city: Graz
  country: AT
```

- [ ] **Step 2: Write the fixtures**

`migration/fixtures/content-v2/valid-venue.yaml` — identical shape to the record above (a second id, e.g. `id: fixture-venue`, `name: Fixture Studio`).

`migration/fixtures/content-v2/invalid-venue-missing-city.yaml` — same but delete the `city:` line (used by Task 8 to prove the required-field check fails).

- [ ] **Step 3: Verify YAML parses**

Run: `node -e "require('js-yaml').load(require('fs').readFileSync('content/venues/orpheumgasse.yaml','utf8')); console.log('OK')"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add content/venues/orpheumgasse.yaml migration/fixtures/content-v2/valid-venue.yaml migration/fixtures/content-v2/invalid-venue-missing-city.yaml
git commit content/venues/orpheumgasse.yaml migration/fixtures/content-v2/valid-venue.yaml migration/fixtures/content-v2/invalid-venue-missing-city.yaml -m "feat(schema): venue record + fixtures (content-first for registry gen)"
```

---

## Task 2: Add the `schedule` block to the three real workshops + a recurring-mode fixture

**Files:**
- Modify: `content/workshops/how-we-move-together.yaml` (dates mode, en_only)
- Modify: `content/workshops/cellular-touch.yaml` (dates mode, en_only)
- Modify: `content/workshops/bewegungsrevolution.yaml` (dates mode, bilingual, past)
- Create: `migration/fixtures/content-v2/valid-schedule-dates.yaml`
- Create: `migration/fixtures/content-v2/valid-schedule-recurring.yaml`
- Create: `migration/fixtures/content-v2/invalid-schedule-unquoted-datetime.yaml`
- Create: `migration/fixtures/content-v2/invalid-schedule-start-at-mismatch.yaml`
- Create: `migration/fixtures/content-v2/invalid-schedule-orphan-featured-note.yaml`

**Interfaces:**
- Consumes: the free-text `locales.<locale>.facts.schedule[]` / `facts.date` currently in each workshop (kept in place for dual-read parity — Plan 3 retires them).
- Produces: `global.schedule` + `global.venue` + `global.registration.availability` on each workshop; the fixtures Task 8's validators assert against.

- [ ] **Step 1: Migrate `how-we-move-together.yaml`**

Add under `global:` (the human facts at `locales.en.facts.schedule` lines 38–41 map to these sessions — Fri 19:00–21:00, Sat 13:00–17:00 & 18:30–21:00, Sun 10:00–14:00 & 16:00–19:00):

```yaml
  updated_at: 2026-07-26T10:00:00Z
  venue: orpheumgasse
  registration:
    url: https://tally.so/r/lbXDW5
    availability: available
  schedule:
    event_status: scheduled
    previous_start_local: null
    mode: dates
    sessions:
      - { id: fri-eve, start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00" }
      - { id: sat-aft, start_local: "2026-10-10T13:00", end_local: "2026-10-10T17:00" }
      - { id: sat-eve, start_local: "2026-10-10T18:30", end_local: "2026-10-10T21:00" }
      - { id: sun-morn, start_local: "2026-10-11T10:00", end_local: "2026-10-11T14:00" }
      - { id: sun-aft, start_local: "2026-10-11T16:00", end_local: "2026-10-11T19:00" }
```

Change `global.start_at` from `2026-10-09T00:00:00.000Z` to `2026-10-09T19:00:00.000Z` (wall-clock now equals the earliest session `start_local`; Task 8's validator enforces this). Add `locales.en.summary` if missing (reuse `card.summary`). Leave `registration.url` in place (do not duplicate — move it under the new block; delete the old top-level `registration.url` if it existed separately). **Keep** `locales.en.facts.*` untouched for dual-read parity.

- [ ] **Step 2: Migrate `cellular-touch.yaml` and `bewegungsrevolution.yaml`**

Same pattern. `cellular-touch`: dates mode, 8–9 August 2026, venue `orpheumgasse`, `availability: available`, `start_at` = earliest session. `bewegungsrevolution`: `status: past`, dates mode covering 11 May–15 June 2026 (its week-by-week program in `research.fields[]` becomes six sessions `id: week-1 … week-6`, Mondays 17:45–19:15); `availability: unavailable` (it is past); venue `orpheumgasse`. Read each file's `facts` block for the exact times before writing sessions.

- [ ] **Step 3: Write the mode fixtures**

`valid-schedule-dates.yaml` — a minimal complete dates-mode workshop (envelope + `global.schedule` dates + one venue ref + `locales.en.{title,summary}`).

`valid-schedule-recurring.yaml` — a recurring-mode record (the Montagskurs shape): `mode: recurring`, `recurrence: {weekday: monday, start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", horizon_months: 6, except: ["2026-01-19"]}`, one `featured_occurrences: [{id: "2026-11-16", teacher: Guest}]`, and `locales.{de,en}.schedule.featured_occurrences."2026-11-16".note`.

`invalid-schedule-unquoted-datetime.yaml` — copy of the dates fixture but with `start_local: 2026-10-09T19:00` **unquoted** (js-yaml parses to Date) → Task 8 floating-local check fails.

`invalid-schedule-start-at-mismatch.yaml` — dates fixture with `global.start_at` NOT equal to the earliest session → Task 8 ordering check fails.

`invalid-schedule-orphan-featured-note.yaml` — recurring fixture whose `locales.de.schedule.featured_occurrences` has a key (`"2027-01-01"`) absent from `global.schedule.featured_occurrences[].id` → Task 8 §6.4 check fails.

- [ ] **Step 4: Verify all parse**

Run: `for f in content/workshops/*.yaml migration/fixtures/content-v2/valid-schedule-*.yaml; do node -e "require('js-yaml').load(require('fs').readFileSync('$f','utf8'))" && echo "OK $f"; done`
Expected: `OK` for every file. (Do NOT run `schema:validate` yet — the registry doesn't know these paths until Task 3.)

- [ ] **Step 5: Commit**

```bash
git add content/workshops/*.yaml migration/fixtures/content-v2/*schedule*.yaml
git commit content/workshops/*.yaml migration/fixtures/content-v2/valid-schedule-dates.yaml migration/fixtures/content-v2/valid-schedule-recurring.yaml migration/fixtures/content-v2/invalid-schedule-unquoted-datetime.yaml migration/fixtures/content-v2/invalid-schedule-start-at-mismatch.yaml migration/fixtures/content-v2/invalid-schedule-orphan-featured-note.yaml -m "feat(schema): schedule blocks on real workshops + schedule fixtures"
```

---

## Task 3: Teach `generate-registry.js` the new record types, enums, and enum heuristics; bump to revision 2

**Files:**
- Modify: `scripts/schema/generate-registry.js`
- Modify: `scripts/schema/lib.js` (if `contentFilesFor` needs the `venues`/`events` dirs — verify first)

**Interfaces:**
- Consumes: `content/venues/*.yaml`, `content/events/*.yaml`, and the schedule-bearing workshops from Tasks 1–2.
- Produces: `schema/content-schema-v2.registry.json` at `registry_revision: 2` containing `venue` + `event` record types, all `global.schedule.*` fields, and the new enums.

- [ ] **Step 1: Verify `contentFilesFor` resolves new dirs**

Run: `node -e "const {contentFilesFor}=require('./scripts/schema/lib'); console.log(contentFilesFor('venues'))"`
Expected: an array containing `content/venues/orpheumgasse.yaml`. If it returns `[]` or throws, read `lib.js`'s `contentFilesFor` and add `venues`/`events` to its collection→glob map (mirror the `workshops → content/workshops/*.yaml` entry).

- [ ] **Step 2: Register the `venue` and `event` record types**

In `scripts/schema/generate-registry.js`, add to the `recordTypes` object (after `workshop`, `generate-registry.js:31`):

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

(`locale_neutral` flows into the generated registry and is read by Task 8's validator to skip locale/intended_locales checks for venues. Add `locale_neutral` to the meta-schema's per-record optional keys in Task 4.)

- [ ] **Step 3: Extend `enumFor()` heuristics**

Replace `enumFor` (`generate-registry.js:71-77`) with:

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

- [ ] **Step 4: Add the new enums + `status_by_record_type` entries + bump the revision**

In the `registry` literal (`generate-registry.js:213-232`): change `registry_revision: 1` → `registry_revision: 2`. Add to `enums`:

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

- [ ] **Step 5: Regenerate and verify the registry**

```bash
node scripts/schema/generate-registry.js
npm run schema:registry          # validate-registry.js: field-id uniqueness, class validity, enum refs exist
node -e "const r=require('./schema/content-schema-v2.registry.json'); console.log(r.registry_revision, Object.keys(r.record_types), r.enums.event_status)"
```
Expected: `Generated registry revision 2.`; `schema:registry` passes; the node line prints `2`, a record-types list including `venue` and `event`, and the `event_status` array. Grep the registry for `"path": "global.schedule.sessions[].start_local"` to confirm the schedule paths were discovered.

- [ ] **Step 6: Commit**

```bash
git add scripts/schema/generate-registry.js scripts/schema/lib.js schema/content-schema-v2.registry.json
git commit scripts/schema/generate-registry.js scripts/schema/lib.js schema/content-schema-v2.registry.json -m "feat(schema): registry revision 2 — venue/event types, schedule enums"
```

---

## Task 4: Extend the registry meta-schema for `locale_neutral` + `reference`; regenerate JSON schemas + docs

**Files:**
- Modify: `schema/content-schema-registry.schema.json` (allow `locale_neutral` on record types; allow `reference` on fields)
- Modify: `scripts/schema/generate-registry.js` (emit `reference: { target, orphan }` on the venue-ref field)
- Regenerate: `schema/generated/*.schema.json`, `docs/generated/content-schema-v2.md`

**Interfaces:**
- Consumes: the revision-2 registry from Task 3.
- Produces: `schema/generated/venue.schema.json`, `schema/generated/event.schema.json`, updated `workshop.schema.json`; declarative reference metadata on `workshop.g.global.venue` / `event.g.global.venue` that Task 8's validator reads.

- [ ] **Step 1: Add `locale_neutral` + `reference` to the meta-schema**

In `schema/content-schema-registry.schema.json`: under each record type's property set add `"locale_neutral": { "type": "boolean" }` (optional). Under the field definition's optional keys (alongside `required_when`, `storage`, etc., around line 57-65) add:

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

- [ ] **Step 2: Emit reference metadata from the generator**

In `generate-registry.js`'s `registryField` (line 87), after the `enum` spread, add:

```js
    ...(field.path === "global.venue" ? { reference: { target: "venue", orphan: "error" } } : {}),
```

Re-run `node scripts/schema/generate-registry.js` and `npm run schema:registry`.

- [ ] **Step 3: Regenerate JSON schemas + docs**

```bash
npm run schema:docs              # runs generate-docs.js → docs/generated + generate-json-schemas.js → schema/generated
ls schema/generated/venue.schema.json schema/generated/event.schema.json
grep -c "Registry revision: 2" docs/generated/content-schema-v2.md
```
Expected: both generated schema files exist; docs header shows revision 2.

- [ ] **Step 4: Verify the check-mode gates see no drift**

```bash
npm run schema:docs -- --check   # must pass (no stale derived files)
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add schema/content-schema-registry.schema.json scripts/schema/generate-registry.js schema/content-schema-v2.registry.json schema/generated docs/generated
git commit schema/content-schema-registry.schema.json scripts/schema/generate-registry.js schema/content-schema-v2.registry.json schema/generated docs/generated -m "feat(schema): reference + locale_neutral metadata; regen schemas/docs"
```

---

## Task 5: Author the example `event` record + fixtures (proves the event record type end-to-end)

**Files:**
- Create: `content/events/solstice-jam.yaml`
- Create: `migration/fixtures/content-v2/valid-event.yaml`
- Create: `migration/fixtures/content-v2/invalid-event-orphan-venue.yaml`
- Regenerate: registry + schemas/docs (event fields are discovered from this content)

**Interfaces:**
- Consumes: venue `orpheumgasse` (Task 1), the schedule block (Task 2), enums (Task 3).
- Produces: a real `event` record Plan 3 renders as a leaf page; `invalid-event-orphan-venue.yaml` (venue ref `nowhere`) for Task 8's orphan check.

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

- [ ] **Step 2: Write the fixtures**

`valid-event.yaml` — a second event with a distinct id/route. `invalid-event-orphan-venue.yaml` — same but `venue: nowhere`.

- [ ] **Step 3: Regenerate (event fields now discoverable)**

```bash
node scripts/schema/generate-registry.js && npm run schema:registry && npm run schema:docs
node -e "const r=require('./schema/content-schema-v2.registry.json'); console.log(r.record_types.event.fields.some(f=>f.path==='global.event_type'))"
```
Expected: `true` (event_type field present with enum `event_type`).

- [ ] **Step 4: Commit**

```bash
git add content/events schema/content-schema-v2.registry.json schema/generated docs/generated migration/fixtures/content-v2/valid-event.yaml migration/fixtures/content-v2/invalid-event-orphan-venue.yaml
git commit content/events schema/content-schema-v2.registry.json schema/generated docs/generated migration/fixtures/content-v2/valid-event.yaml migration/fixtures/content-v2/invalid-event-orphan-venue.yaml -m "feat(schema): event record + fixtures; regen registry/schemas/docs"
```

---

## Task 6: Migration (v1→v2) — venue/event/schedule branches in `lib.js` + `migrate-content.js`

**Files:**
- Modify: `scripts/schema/lib.js` (add `migrateVenueRecord`, `migrateEventRecord`; extend workshop head-key promotion for `venue`/`registration.availability`)
- Modify: `scripts/schema/migrate-content.js` (route `venues`/`events` collections)

**Interfaces:**
- Consumes: legacy/v1 content (none exists for venue/event — these are v2-native).
- Produces: idempotent up-migration so `schema:migrate -- --all --check` passes on the new record types (a re-run of an already-v2 venue/event/schedule record is a no-op).

- [ ] **Step 1: Read the existing migration functions**

Read `scripts/schema/lib.js` `migrateYamlRecord` (≈ lines 252–310) and `migrate-content.js`'s collection loop. The schedule block, venue, and event have NO v1 source — the migration path for them is **identity** (an already-v2 record round-trips unchanged). The only real work is ensuring the new collections are enumerated and that `migrateYamlRecord` for workshops passes through `global.schedule`/`global.venue`/`global.registration.availability` untouched (it likely already does, since it promotes a fixed head-key set and copies the rest — verify).

- [ ] **Step 2: Add venue/event routing**

In `migrate-content.js`, add `venues` and `events` to the collection list it iterates (mirror `workshops`). For these v2-native types the migrate step is a normalize+rewrite that must be idempotent under `--check`.

- [ ] **Step 3: Verify idempotency**

```bash
npm run schema:migrate -- --all --check
```
Expected: PASS (no diffs — every v2 record already in canonical form).

- [ ] **Step 4: Commit**

```bash
git add scripts/schema/lib.js scripts/schema/migrate-content.js
git commit scripts/schema/lib.js scripts/schema/migrate-content.js -m "feat(schema): migration routing for venue/event/schedule (v2-native, idempotent)"
```

---

## Task 7: Downgrade (v2→v1) — mark schedule/venue/event as lossy

**Files:**
- Modify: `scripts/schema/downgrade-content.js`

**Interfaces:**
- Consumes: revision-2 content.
- Produces: `migration/downgraded/**` output + `migration/reports/downgrade-content.json` whose `lossy_fields` now lists the v2-only structured fields (they have no v1 free-text equivalent; the free-text `facts.*` remain the v1 rollback representation).

- [ ] **Step 1: Read `downgrade-content.js`** (reconstruction at lines ≈47–62) to see how it currently maps head keys back to v1.

- [ ] **Step 2: Add lossy declarations**

For workshop/event downgrade, record `global.schedule.*`, `global.venue`, `global.registration.availability`, `global.event_type`, `global.page_mode` in the `lossy_fields` array (they are dropped on downgrade — v1 has no slot). Skip the `venue` and `event` record types entirely on downgrade (no v1 collection exists) — emit them to `migration/downgraded/` only if a v1 target is defined; otherwise document them as "v2-only, no downgrade target" in the report.

- [ ] **Step 3: Verify**

```bash
npm run schema:downgrade -- --all --check
node -e "const r=require('./migration/reports/downgrade-content.json'); console.log(r.lossy_fields.includes('global.schedule.mode'))"
```
Expected: PASS; `true`.

- [ ] **Step 4: Commit**

```bash
git add scripts/schema/downgrade-content.js migration/reports/downgrade-content.json
git commit scripts/schema/downgrade-content.js migration/reports/downgrade-content.json -m "feat(schema): downgrade marks v2-only calendar fields as lossy"
```

---

## Task 8: Net-new validators in `validate-content.js` (references, §6.4, floating-local, start_at, locale-neutral)

**Files:**
- Modify: `scripts/schema/validate-content.js`
- Test: `scripts/schema/validate-content.test.js` (new — `node:test` over the fixtures from Tasks 1/2/5)

**Interfaces:**
- Consumes: the registry (`reference` + `locale_neutral` metadata from Tasks 3–4), all content + fixtures.
- Produces: five new checks. All valid fixtures pass; every `invalid-*` fixture fails with a specific, field-named error.

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
test("locale-neutral venue skips intended_locales check and passes", () => {
  assert.deepEqual(run("valid-venue.yaml", "venue").errors, []);
});
test("venue missing required city is rejected", () => {
  const errs = run("invalid-venue-missing-city.yaml", "venue").errors;
  assert.ok(errs.some((e) => /city/.test(e)));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test scripts/schema/validate-content.test.js`
Expected: FAIL — `validateRecord is not a function` (not yet exported).

- [ ] **Step 3: Refactor + implement**

Read `validate-content.js` first. Extract the per-record checks into an exported pure `validateRecord(record, { type, registry, venueIds, filenameStem })` returning `{ errors: string[] }` (keep the file's CLI wrapper calling it, collecting `venueIds` from `content/venues/*.yaml` and calling `validateRecord` per file). Add these checks inside it:

```js
const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
const isRecordType = (registry, type) => registry.record_types[type] || {};

// (a) locale-neutral: skip intended_locales/locales checks when record type is locale_neutral
const localeNeutral = !!isRecordType(registry, type).locale_neutral;
// guard the existing intended_locales/locales/status-locale checks with `if (!localeNeutral) { ... }`

// (b) required-field enforcement for locale-neutral venue (city etc.)
for (const f of isRecordType(registry, type).fields || []) {
  if (f.required && f.class === "G") {
    const v = getPath(record, f.path);          // getPath = existing dotted-path getter
    if (v === undefined || v === null || v === "") errors.push(`${f.path} is required`);
  }
}

// (c) venue reference orphan check (declarative from registry `reference` metadata)
for (const f of isRecordType(registry, type).fields || []) {
  if (f.reference?.target === "venue") {
    const ref = getPath(record, f.path);
    if (ref && !venueIds.has(ref) && f.reference.orphan === "error") {
      errors.push(`${f.path}: unknown venue: ${ref}`);
    }
  }
}

// (d) schedule checks (dates + recurring)
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
    // start_at wall-clock == earliest session start_local
    const starts = sessions.map((s) => s.start_local).filter((x) => typeof x === "string").sort();
    const earliest = starts[0];
    const startAtLocal = toLocalMinute(record.global.start_at);   // strip Z, → YYYY-MM-DDTHH:mm
    if (earliest && startAtLocal && startAtLocal !== earliest) {
      errors.push(`global.start_at (${startAtLocal}) must equal earliest session start (${earliest})`);
    }
  } else if (sc.mode === "recurring") {
    const r = sc.recurrence || {};
    if (!registry.enums.weekday.includes(r.weekday)) errors.push(`recurrence.weekday invalid: ${r.weekday}`);
    for (const k of ["start_time", "end_time"]) {
      if (!/^\d{2}:\d{2}$/.test(r[k] || "")) errors.push(`recurrence.${k} must be HH:mm`);
    }
    // §6.4: localized featured notes must key into the global featured_occurrences ids
    const globalIds = new Set((sc.featured_occurrences || []).map((f) => f.id));
    for (const loc of Object.keys(record.locales || {})) {
      const notes = record.locales[loc]?.schedule?.featured_occurrences || {};
      for (const key of Object.keys(notes)) {
        if (!globalIds.has(key)) errors.push(`locales.${loc}.schedule.featured_occurrences: id "${key}" not in global list`);
      }
    }
  }
}
```

Add helpers `getPath` (reuse if one exists) and `toLocalMinute(v)` (`String(v instanceof Date ? v.toISOString() : v).replace('Z','').slice(0,16)`). Also extend `checkEnum` (or add a registry-driven enum pass) so `event_status`/`availability`/`event_type`/`weekday`/`schedule_mode`/`page_mode` values are validated against `registry.enums` via each field's declared `enum` — the existing `checkEnum` is path-heuristic; a registry-`enum`-driven loop is cleaner and covers all new enums at once.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test scripts/schema/validate-content.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the real content validation**

```bash
npm run schema:validate -- --all
npm run schema:validate -- --fixtures
```
Expected: all real records pass; the `invalid-*` fixtures fail as designed (fixtures runner asserts expected failures).

- [ ] **Step 6: Commit**

```bash
git add scripts/schema/validate-content.js scripts/schema/validate-content.test.js
git commit scripts/schema/validate-content.js scripts/schema/validate-content.test.js -m "feat(schema): venue-ref/§6.4/floating-local/start_at validators + tests"
```

---

## Task 9: CMS config — schedule editor, venues + events collections, status/availability selects; extend the contract check

**Files:**
- Modify: `admin/config.yml`
- Modify: `scripts/schema/check-cms-contract.js`
- Create: `migration/fixtures/cms/venue.yaml` (locale-neutral CMS entry fixture, if the contract checker reads per-type fixtures)

**Interfaces:**
- Consumes: the revision-2 registry enums.
- Produces: a Sveltia UI where an editor can pick venue, set `schedule.mode`, add sessions (list widget with stable `id`), set `event_status`/`availability`; `venues` + `events` collections; and `check-cms-contract.js` enforcing the new enum option-lists.

- [ ] **Step 1: Add the `schedule` object widget to the workshop + event collections**

In `admin/config.yml`, under each collection's `global` object field, add a `schedule` object field:
- `event_status` → `select`, options = `["scheduled","cancelled","postponed","rescheduled","moved_online"]`, default `scheduled`.
- `mode` → `select`, options = `["dates","recurring"]`, default `dates`.
- `sessions` → `list` with fields `id` (string, required), `start_local` (string — **use `widget: string`, not `datetime`**, so it stays floating-local; hint the `YYYY-MM-DDTHH:mm` format), `end_local` (string), `status` (select, optional, same options as `event_status`).
- `recurrence` → object (`weekday` select from the `weekday` enum, `start_time`/`end_time` string, `anchor` string, `horizon_months` number int, `except` list of string).
- `featured_occurrences` → list (`id` string, `teacher` string optional).
- Add `registration.availability` → `select` (availability enum) beside the existing `registration.url`.
- Add `global.venue` → `select` or `relation` widget sourcing the `venues` collection.

Follow the existing v2-envelope widget patterns produced by `scripts/schema/migrate-cms-config.js` (`globalField`/`envelopeFields`). Parse-check after: `node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'));console.log('OK')"`.

- [ ] **Step 2: Add `venues` and `events` collections**

`venues` → folder `content/venues`, `schema_version` hidden default 2, `global` object (id, name, street, postal_code, city, country, optional geo/url); **no `locales`** (locale-neutral). `events` → folder `content/events`, full v2 envelope (`schema_version`/`global`/`locales.de`/`locales.en`) with the same schedule widget + `event_type` select + `page_mode` select.

- [ ] **Step 3: Extend the contract check**

In `scripts/schema/check-cms-contract.js`, add `venues → venue` and `events → event` to `recordTypeByCollection`. Add option-equality assertions (mirroring the existing focal-point check via `inspectEnums`) for `event_status`, `availability`, `event_type`, `weekday`, `schedule_mode`, `page_mode` — each CMS select's options must equal `registry.enums.<name>`. For the `venues` collection, assert it has `schema_version` + `global` but is exempt from the `locales.de`/`locales.en` requirement (locale-neutral).

- [ ] **Step 4: Regenerate registry (CMS merge picks up any CMS-only leaves) + run the contract check**

```bash
node scripts/schema/generate-registry.js && npm run schema:registry && npm run schema:docs
npm run schema:cms
```
Expected: both pass. (Regen is required because `generate-registry.js` merges CMS leaves into the registry — see `generate-registry.js:176-211`.)

- [ ] **Step 5: UI smoke test**

Run `npm run dev`, open `http://localhost:8081/admin/`, choose **Work with Local Repository**, open a workshop → confirm the schedule editor renders (mode toggle, sessions list, availability select) and the `venues`/`events` collections appear.

- [ ] **Step 6: Commit**

```bash
git add admin/config.yml scripts/schema/check-cms-contract.js schema/content-schema-v2.registry.json schema/generated docs/generated migration/fixtures/cms
git commit admin/config.yml scripts/schema/check-cms-contract.js schema/content-schema-v2.registry.json schema/generated docs/generated migration/fixtures/cms -m "feat(cms): schedule editor + venues/events collections + contract checks"
```

---

## Task 10: Update `docs/schema-migration.md` narrative + pass the full `schema:check` bundle

**Files:**
- Modify: `docs/schema-migration.md` (§3.3 changelog entry for revision 2; document venue/event record types, the schedule block §6.4 compliance, floating-local string rule, locale-neutral record types, reference fields + orphan rule)

**Interfaces:**
- Consumes: everything from Tasks 1–9.
- Produces: a green `npm run schema:check` (the §3.3 acceptance gate) and prose that matches the registry (registry wins on disagreement, §3.1).

- [ ] **Step 1: Document the revision**

Add a revision-2 entry: new record types (`venue` locale-neutral, `event`), the `global.schedule` block (dates/recurring), new enums, the floating-local **string** rule (quote datetimes), the `start_at == earliest session` invariant, reference fields (`global.venue` → `venue`, orphan=error), and §6.4 compliance for `sessions[]`/`featured_occurrences[]`. Note the calendar library (Plan 1) is the consumer and Plan 3 wires Eleventy.

- [ ] **Step 2: Run the complete gate**

```bash
npm run schema:check
```
Expected: PASS — this runs, in order: `schema:registry`, `schema:docs -- --check`, `schema:inventory -- --check`, `schema:cms -- --check`, `schema:validate -- --all`, `verify-body-hashes.js --check`, `schema:migrate -- --all --check`, `schema:downgrade -- --all --check`, `schema:parity -- --fixtures`. Also run `node --test scripts/schema/validate-content.test.js` (7 pass) and `npm run build` (Eleventy + `validate-seo.js` — should still pass; Plan 3 adds the calendar outputs).

If `schema:inventory -- --check` fails, run `npm run schema:inventory` (no `--check`) to refresh the inventory, review the diff, and commit it.

- [ ] **Step 3: Commit**

```bash
git add docs/schema-migration.md
git commit docs/schema-migration.md -m "docs(schema): revision 2 change-control entry (calendar schedule + venue/event)"
```

---

## What this plan deliberately leaves to Plan 3

- All Eleventy consumers: `event-jsonld.njk`, per-event `.ics` pagination to `/calendar/<id>.ics`, `/wildcare.ics` master feed, generated `sitemap.xml`, `event.njk` + featured-Monday leaf pages, the add-to-calendar UI, wiring `lib/calendar/` into `eleventy.config.js` global data, converting the free-text `facts.*` consumers to the structured block, and dual-read HTML parity.
- The Montagskurs migration to a `recurring`-mode record: this plan ships the *recurring fixture* and CMS support; Plan 3 decides whether Montagskurs becomes a `workshop`/`event` record or stays a `fixed_page` with a sidecar schedule, and renders its featured-Monday leaf pages.

## Self-review notes

- **Spec coverage:** §2 schedule block (dates + recurring) ✓ (Tasks 2,3); §3 three status fields (`status`/`event_status`/`availability`) ✓ (Tasks 2,3,8 enums); §4 venue record + reference + orphan rule ✓ (Tasks 1,4,8); §5 event record (`event_type`, `page_mode`) ✓ (Task 5); §6 ordering (`start_at == earliest`) + §6.4 stable ids ✓ (Task 8); §7 floating-local ✓ (quoted-string rule, Tasks 2,8); §11 registry-revision bundle (revision bump, fixtures, regen schemas/docs, CMS, migrate/downgrade, `schema:check`) ✓ (Tasks 3–10). Deferred: JSON-LD/ICS/sitemap generation (Plan 3), `performer`/price on offers (Plan 3 data), localized routes (out of scope per spec).
- **Type consistency:** the record paths authored in Tasks 1–2/5 (`global.schedule.sessions[].{id,start_local,end_local,status}`, `global.schedule.recurrence.{weekday,start_time,end_time,anchor,horizon_months,except}`, `global.schedule.featured_occurrences[].{id,teacher}`, `global.venue`, `global.registration.availability`, `locales.{locale}.schedule.featured_occurrences.{id}.note`) are exactly the paths `enumFor`/`reference` classify (Tasks 3–4), the validators check (Task 8), and Plan 1's `toDefinition` reads.
- **Content-first ordering:** the registry generator discovers fields from content, so venue/event/schedule content (Tasks 1,2,5) is authored *before* the generator is taught the types (Task 3) and *before* validation runs (Task 8). Regeneration is repeated after Task 5 and Task 9 because new content + CMS leaves change the discovered field set.
- **No placeholders:** every step has a concrete command or code block; where an existing function must be read first (Tasks 6,7,8 Step 1), the exact function name, line anchor, and the code to add are given.
