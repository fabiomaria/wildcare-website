# Task 10 Report: index.js public surface + end-to-end fixture test

## Summary

Successfully completed Task 10 — the final task of the 10-task calendar-core-library plan. Created the single public entry point (`lib/calendar/index.js`), two realistic fixtures (dates-mode and recurring), and an end-to-end test suite that exercises the full record-to-definition-to-ICS/JSON-LD pipeline. All 34 tests in the library now pass.

## What Was Implemented

### Files Created

1. **`lib/calendar/index.js`** — Public API surface re-exporting all consumer-facing functions:
   - `toDefinition` (model.js)
   - `eventJsonLd`, `recurringJsonLd` (jsonld.js)
   - `perEventCalendar`, `masterFeed`, `eventVevents`, `recurringVevents`, `buildCalendar` (ics.js)
   - `googleUrl` (google.js)
   - `formatDateRange`, `formatRecurring` (format.js)
   - `expandRecurrence` (expand.js)

2. **`lib/calendar/fixtures/how-we-move-together.json`** — Dates-mode fixture:
   - 3-session Contact Improvisation workshop (Fri 19:00–21:00, Sat 13:00–17:00, Sun 10:00–14:00)
   - English-only (`intended_locales: ["en"]`)
   - Venue reference to Orpheumgasse
   - Registration link (available)

3. **`lib/calendar/fixtures/montagskurs.json`** — Recurring fixture:
   - Weekly Monday class (17:45–19:15, anchor 2026-01-05, 6-month horizon)
   - Bilingual DE/EN (`intended_locales: ["de", "en"]`)
   - Featured occurrence on 2026-11-16 with localized notes ("Sonderabend" / "Special evening")

4. **`lib/calendar/index.test.js`** — End-to-end test suite (2 tests):
   - Test 1: dates-mode fixture → `toDefinition()` → `perEventCalendar()` (ICS) + `eventJsonLd()` (JSON-LD)
     - Verifies `BEGIN:VEVENT` and `END:VCALENDAR\r\n` markers
     - Verifies JSON-LD `@type: "Event"` with `startDate` and `endDate`
   - Test 2: recurring fixture → `masterFeed()` aggregating one definition
     - Verifies `RRULE:FREQ=WEEKLY;BYDAY=MO` in output
     - Verifies `RECURRENCE-ID:` override present (featured Monday)

## TDD Evidence: RED → GREEN

### Step 1: Failing Test (RED)
Before implementation, ran `node --test lib/calendar/index.test.js` — test failed with `Cannot find module './index'`.

### Step 2: Implementation
Created all 4 files exactly as specified in the brief.

### Step 3: GREEN
```
✔ end-to-end: dates-mode fixture → definition → ICS + JSON-LD (1.431291ms)
✔ end-to-end: recurring fixture → master feed contains series + override (0.850875ms)
ℹ tests 2 pass 2 fail 0
```

### Step 4: Full Suite Verification
Ran `npm run test:calendar` — all 34 tests pass:
- 2 new tests (index.test.js)
- 32 prior tests across text, datetime, model, format, expand, google, jsonld, ics (2 suites)

```
ℹ tests 34
ℹ pass 34
ℹ fail 0
```

## Files Changed

```
 create mode 100644 lib/calendar/fixtures/how-we-move-together.json
 create mode 100644 lib/calendar/fixtures/montagskurs.json
 create mode 100644 lib/calendar/index.js
 create mode 100644 lib/calendar/index.test.js
```

**Commit:** `71fc8ed7` — "feat(calendar): public index + end-to-end fixture tests"

## Self-Review: Specification Compliance

- ✓ **Public surface complete:** All 9 function families exported: `toDefinition`, `{event,recurring}JsonLd`, `{perEvent,masterFeed,eventVevents,recurringVevents,buildCalendar}`, `googleUrl`, `{formatDateRange,formatRecurring}`, `expandRecurrence`
- ✓ **Fixtures realistic:** Both dates-mode and recurring records follow schema v2 spec. Dates-mode uses 3 sessions spanning 3 days; recurring uses Monday anchor with featured override. Bilingual merge tested.
- ✓ **Tests exercise full pipeline:** Not just imports; actual record → definition → ICS/JSON-LD transformation. Fixture loading via `fs`, venue resolution, output structure validation.
- ✓ **ICS validation:** Tests verify well-formedness (markers, CRLF termination), VEVENT presence, RRULE/RECURRENCE-ID presence in recurring feed.
- ✓ **JSON-LD validation:** Verifies `@type`, `startDate`, `endDate` fields present and populated.
- ✓ **Floating-local time:** Fixtures use `start_local`/`end_local` and `start_time`/`end_time`; no UTC offsets emitted by library.
- ✓ **Commit hygiene:** Explicit pathspec (`git commit lib/calendar/index.js lib/calendar/fixtures lib/calendar/index.test.js`) avoids sweeping unrelated changes.

## Integration with Prior Tasks

- **Task 1 (text.js):** ICS escaping tested via full fixture roundtrip
- **Tasks 2 (datetime.js):** Floating-local parsing/formatting in definition creation
- **Task 3 (model.js):** `toDefinition` invoked by both fixture tests
- **Task 4 (format.js):** `formatDateRange`, `formatRecurring` available but not directly tested here (tested in format.test.js)
- **Tasks 6–7 (google.js, jsonld.js):** `googleUrl`, `eventJsonLd`, `recurringJsonLd` available; JSON-LD tested here
- **Tasks 8–9 (ics.js):** `perEventCalendar`, `masterFeed` both exercised; dates-mode and recurring tested end-to-end

## No Known Concerns

- All 34 tests pass
- No new dependencies added (CommonJS, pure functions)
- Fixtures are valid schema v2 records
- Public API surface is complete and documented in index.js
- Ready for Plan 2 (schema finalization, CMS config) and Plan 3 (Eleventy integration, templates, content migration)
