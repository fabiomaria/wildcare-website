# Wild Care Calendar Integration — Design

Status: Approved for planning
Date: 2026-07-26
Scope: Build-time calendar + structured-data + subscribable-feed integration for
workshops, events, and the recurring Montagskurs.
Ships as: **content schema `registry_revision: 2`**, under `docs/schema-migration.md`
§3.3 change control, on the already-stable/deployed schema v2.

---

## Goals

1. A single canonical source of event dates ("core workshop facts") that replaces the
   three disagreeing date sources in use today.
2. Correct, complete schema.org structured data + a unique, indexable leaf URL for
   every event.
3. Per-event "add to calendar" (download `.ics` + Google link) and one **subscribable
   master feed** (`/wildcare.ics`) covering all Wild Care events, refreshed each deploy.
4. Support one-off workshops, multi-day workshops, workshop *series*, one-off events,
   and the open-ended recurring Montagskurs.
5. All build-time/static — no servers, no logins, no runtime backend.

## Non-goals (explicitly out of scope)

- Any dynamic/backend platform: two-way device sync, webhooks, OAuth, in-site
  checkout, real-time updates, user accounts. ("Option B" — declined.)
- Promised Google *rich-result event cards* for Graz (Austria is not in Google's
  Event-experience region list; virtual events unsupported). We commit to valid
  structured data, not guaranteed cards.
- Localized routes / hreflang (unchanged from the migration contract).

## Success criteria

- Every workshop/event/featured-Monday builds a leaf page with valid `Event` JSON-LD
  and passes `node scripts/validate-seo.js`.
- `/wildcare.ics` validates against an RFC-5545 conformance harness and imports
  cleanly into Google Calendar, Apple Calendar, and Outlook.
- Editing a workshop's time and rebuilding *updates* existing calendar entries (stable
  UID) rather than duplicating; a cancelled event shows as cancelled, not vanished.
- Date/schedule display text is generated bilingually from the structured block; no
  hand-typed bilingual date strings remain (override available).
- Full `registry_revision: 2` change-control bundle passes; `sitemap.xml` is generated
  and covers every event URL.

---

## Locked decisions

- **No explicit timezones** — floating local wall-clock time everywhere (no luxon, no
  `VTIMEZONE`, no offset math). DST self-corrects; out-of-region-subscriber wall-time
  is the accepted, deliberate tradeoff.
- **`updated_at`** is the single deterministic source for `SEQUENCE`, `DTSTAMP`,
  `LAST-MODIFIED`.
- **Addresses formatted at build**; no per-venue localized copy.
- **ICS hand-rolled** behind `ics.js` + full RFC-5545 conformance harness.
- **`start_at` remains the workshop `ordering.primary`**, validator-enforced to equal
  the earliest session start (ordering contract untouched).

---

## 1. Internal model — two stages

```
content/{workshops,events,venues}/*.yaml + montagskurs
  │  model.js (normalize + resolve refs)
  ▼
CalendarDefinition[]   preserves series/workshop structure, recurrence rule, status,
  │                    registration, venue, localized copy
  │  expand.js (apply recurrence + horizon; attach session IDs)
  ▼
CalendarOccurrence[]   one concrete, dated session
  │
  ├─► jsonld.js   (Definition → schema.org JSON-LD, per leaf page)
  ├─► ics.js      (Occurrence[] → VEVENTs; per-event file + master feed)
  ├─► google.js   (Occurrence → Add-to-Google-Calendar URL, per session)
  ├─► listing.js  (Occurrence[] within horizon → overview/programme data)
  └─► format.js   (Definition/Occurrence + locale → display strings)
```

All functions pure → fixture-based unit tests. New module root: `lib/calendar/`.

## 2. Canonical `schedule` block (single source of truth)

Locale-neutral (`G`), under `global:`. Times are floating local wall-clock.

### Mode A — `dates` (one-off, multi-day, series workshops + events)

```yaml
global:
  start_at: 2026-10-09T19:00          # = earliest session start (ordering key; validator-enforced)
  updated_at: 2026-07-26T10:00:00Z    # UTC; drives SEQUENCE/DTSTAMP/LAST-MODIFIED
  schedule:
    event_status: scheduled           # scheduled | cancelled | postponed | rescheduled | moved_online
    previous_start_local: null        # set only on reschedule → schema.org previousStartDate
    mode: dates
    sessions:                         # global list = membership + order; STABLE id each
      - { id: fri-eve, start_local: 2026-10-09T19:00, end_local: 2026-10-09T21:00 }
      - { id: sat-aft, start_local: 2026-10-10T13:00, end_local: 2026-10-10T17:00 }
      - { id: sat-eve, start_local: 2026-10-10T18:30, end_local: 2026-10-10T21:00 }
      # optional per-session `status:` override so one session can cancel alone
```

- Overall span (Google `startDate`/`endDate`, listing) = earliest start → latest end,
  computed.
- One-day event = one session (degrades gracefully).
- UID = `<global.id>-<session.id>@wildcare.space`; immutable → moving a session updates
  rather than duplicates.

### Mode B — `recurring` (only the Montagskurs)

```yaml
global:
  updated_at: 2026-07-26T10:00:00Z
  schedule:
    event_status: scheduled
    mode: recurring
    recurrence:
      weekday: monday
      start_time: "17:45"             # floating local; DST via wall-clock
      end_time:   "19:15"
      anchor: 2026-01-05              # series DTSTART
      horizon_months: 6               # website listing expansion only (feed is unbounded)
      except: []                      # EXDATE dates
    featured_occurrences:             # global list, stable ids; opt-in special Mondays
      - { id: 2026-11-16, teacher: Guest Name }
locales:
  de: { schedule: { featured_occurrences: { 2026-11-16: { note: Sonderabend … } } } }
  en: { schedule: { featured_occurrences: { 2026-11-16: { note: Special evening … } } } }
```

Feed vs website (never both):
- Master `.ics`: ONE unbounded `RRULE` (`FREQ=WEEKLY;BYDAY=MO`) + `EXDATE`.
- Website/listing: expand only through `horizon_months`.
- Featured Monday in `.ics`: `RECURRENCE-ID` override on the *same series UID*.
- Featured Monday on web: concrete leaf page `/montagskurs/<date>` + concrete JSON-LD.

### Generated display text

Bilingual date/schedule strings built from the structured block via
`Intl.DateTimeFormat` (zero-dep). Optional `date_display_override` /
`schedule_display_override` (class `L`).

## 3. Status / lifecycle / availability — three separate fields

| Field | Enum | schema.org |
|-------|------|-----------|
| `global.status` | draft, upcoming, current, past, unlisted | listing visibility |
| `global.schedule.event_status` | scheduled, cancelled, postponed, rescheduled, moved_online | `eventStatus` |
| `global.registration.availability` | available, sold_out, waitlist, unavailable | `offers.availability` |

`previous_start_local` on reschedule; optional per-session status. New enums
(`event_status`, `availability`, `event_type`, `weekday`) added to the registry;
unknown values are build errors.

## 4. Venue record type — `content/venues/*.yaml`

v2-envelope record; `G` fields; address formatted at build.

```yaml
schema_version: 2
global:
  id: orpheumgasse
  name: Orpheumgasse Studio     # schema.org location.name — never the event title
  street: Orpheumgasse 11
  postal_code: "8010"
  city: Graz
  country: AT
  # optional geo lat/lng, url; `online` variant for moved_online/virtual
```

Events reference `global.venue: orpheumgasse`; registry defines reference + orphan
rule. Custom one-off locations may inline the same shape.

## 5. Event record type — `content/events/*.yaml`

```yaml
schema_version: 2
global:
  id: solstice-jam
  intended_locales: [de, en]    # required by envelope
  event_type: jam               # jam | performance | talk | retreat | other → @type
  status: upcoming
  route: /events/solstice-jam
  page_mode: minimal            # minimal | full — every event ALWAYS gets a leaf page
  venue: orpheumgasse
  registration: { url: ... }
  updated_at: ...
  schedule: { mode: dates, sessions: [ … ] }
locales:
  de: { title: …, summary: … }
  en: { title: …, summary: … }
```

`minimal` = small canonical leaf page (URL + JSON-LD + add-to-calendar block).
`full` = complete `event.njk` page. No `detail_page: false`.

## 6. Ordering & identity

- `global.start_at` stays the workshop `ordering.primary`; validator enforces it
  equals the earliest session start. Recurring records order by anchor/next-occurrence.
- Every repeatable item (`sessions[]`, `featured_occurrences[]`) has a stable `id`;
  localized item copy keyed by that id; never join by array position (§6.4).

## 7. Timezone policy

Floating local wall-clock (no `TZID`/`VTIMEZONE`/offset). JSON-LD local time, Google
infers zone from physical venue. Add-to-Google links append `ctz=Europe/Vienna`.
`DTSTAMP`/`LAST-MODIFIED` UTC from `updated_at` → deterministic ICS.

## 8. schema.org / Google — honest scope

Every event: `Event` JSON-LD with `startDate`/`endDate`, physical `location`,
`organizer`, `performer`, `image`, `eventStatus`, `offers` (availability + price +
registration URL), unique leaf URL. Routine Montagskurs: valid `eventSchedule`
(semantic only, not a promised rich result). Multi-session single booking → one Event
spanning overall; sessions optionally `subEvent`s.

## 9. Build outputs (static files)

| Artifact | Location | Purpose |
|----------|----------|---------|
| `Event` JSON-LD | per leaf page via `event-jsonld.njk` (beside `seo.njk`) | structured data |
| Per-event `.ics` | `/calendar/<id>.ics` (Eleventy pagination) | download-to-calendar |
| Add-to-Google link | inline per session (`ctz=Europe/Vienna`) | one-click add |
| Master feed | `/wildcare.ics` (+ `webcal://…`) | subscribable Wild Care calendar |
| Featured-Monday leaf pages | `/montagskurs/<date>` | per-special-Monday URL + JSON-LD |
| Sitemap | auto-generated (replaces hand-maintained `sitemap.xml`) | indexing |

## 10. ICS hardening (hand-rolled `ics.js`, fully tested)

CRLF; escape `\ , ;` + newlines; UTF-8-safe 75-octet folding; `PRODID`,
`VERSION:2.0`, `CALSCALE:GREGORIAN`; UTC `DTSTAMP`/`LAST-MODIFIED` from `updated_at`;
`SEQUENCE` deterministic from `updated_at` (monotonic integer, e.g. `YYYYMMDDHHMM`);
`RRULE`/`EXDATE`/`RECURRENCE-ID`; cancellation tombstones (same UID +
`STATUS:CANCELLED`, retained ~30 days past date); floating local times; per-session
Add-to-Google (or explicitly-labelled overall span).

## 11. Registry revision — §3.3 bundle (one PR)

1. `registry_revision` → 2.
2. Fixtures: dates-mode, recurring-mode, featured override, cancelled tombstone, venue
   record, event record; invalids (missing session id, orphan localized note,
   `start_at` ≠ earliest, unknown enum).
3. Regenerate `schema/generated/*` + `docs/generated/*`.
4. Update `admin/config.yml` (schedule editor, venues + events collections,
   status/availability selects).
5. Update migration + downgrade mappings.
6. Full schema contract check + `scripts/validate-seo.js` + `npm run build`.

## 12. Rollout — dual-read parity

1. Add `schedule` block to existing workshops (free-text dates → sessions).
2. Derive current `facts.date`/`facts.schedule` presentation *from* the block; diff
   rendered HTML for parity.
3. Cut consumers (JSON-LD, listing, ICS) to the structured source.
4. Retire free-text date fields.

## Deferred

- **Surfaces** (where the add-to-calendar UI, events overview page, and subscribe link
  live) — handled in a later visual pass, per owner.
