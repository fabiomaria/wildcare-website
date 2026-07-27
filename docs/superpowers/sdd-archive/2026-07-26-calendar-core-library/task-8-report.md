# Task 8 Report: `ics.js` part 1 — dates-mode per-event calendar

## Status
DONE

## Implementation Summary

Created two new files in `/Users/fabiogerhold/Sandboxes/Claude/fabio-gerhold/projects/wild-care/website/.worktrees/calendar-core-library-task8/lib/calendar/`:

### `ics.js` — Per-event ICS calendar generator
Exports exactly four functions as specified:

1. **`venueSummaryLine(v)`** — Formats venue object into single-line address string for `LOCATION` field
   - Format: `"${name}, ${street}, ${postal_code} ${city}"`
   - Input example: `{ name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" }`
   - Output: `"Orpheumgasse Studio, Orpheumgasse 11, 8010 Graz"`

2. **`eventVevents(def)`** — Generates array of VEVENT blocks (unfolded content lines)
   - One VEVENT per session in `def.sessions[]`
   - Uses stable UIDs from `session.uid` (never array position)
   - Floating DTSTART/DTEND from `session.start_local`/`session.end_local` (not UTC)
   - DTSTAMP/SEQUENCE/LAST-MODIFIED derived from `def.updatedAt` via datetime.js helpers
   - STATUS mapping: scheduled→CONFIRMED, cancelled→CANCELLED, postponed→TENTATIVE, rescheduled→TENTATIVE, moved_online→CONFIRMED
   - Includes DESCRIPTION (registration URL + summary), URL (route), escaped SUMMARY/LOCATION via text.js

3. **`buildCalendar(vevents)`** — Wraps VEVENT blocks in VCALENDAR envelope
   - Adds VCALENDAR headers: VERSION:2.0, PRODID, CALSCALE:GREGORIAN, METHOD:PUBLISH
   - Passes all lines through `assemble()` from text.js for RFC-5545 compliance
   - Returns CRLF-terminated string with 75-octet UTF-8-safe line folding

4. **`perEventCalendar(def)`** — High-level convenience function
   - Calls `buildCalendar(eventVevents(def))` in one step
   - Returns complete, ready-to-save .ics file content

## Test Results

All 3 tests passing (100%):

```
✔ eventVevents yields one VEVENT per session with stable UID, floating DTSTART, deterministic stamps
✔ perEventCalendar is deterministic, CRLF-terminated, well-formed
✔ a cancelled session renders STATUS:CANCELLED but keeps its UID (tombstone)
```

### Test Verification Details

**Test 1:** eventVevents correctness
- Verifies exactly 2 VEVENTs generated for 2-session input
- Confirms stable UID from session object (not positional)
- Validates floating DTSTART (no Z suffix): `DTSTART:20261009T190000`
- Validates deterministic DTSTAMP from updatedAt: `DTSTAMP:20260726T100000Z`
- Validates SEQUENCE from updatedAt: `SEQUENCE:202607261000`
- Confirms STATUS:CONFIRMED for scheduled sessions
- Confirms SUMMARY escaped correctly via text.js

**Test 2:** perEventCalendar RFC-5545 compliance
- Starts with `BEGIN:VCALENDAR\r\n` (correct envelope)
- Includes VERSION:2.0, PRODID, CALSCALE:GREGORIAN
- Ends with `END:VCALENDAR\r\n` (CRLF termination)
- Deterministic output (same input → same output)
- No bare LF (`\n\n`) present (all line breaks are CRLF)
- All lines ≤ 75 UTF-8 bytes (RFC-5545 requirement, handled by text.js `assemble()`)

**Test 3:** Tombstone status preservation
- Cancelled session renders with `STATUS:CANCELLED`
- UID remains stable across status change (critical for calendar clients to recognize the same event)
- Demonstrates proper handling of cancellation semantics

## TDD Evidence

Followed RED → GREEN → COMMIT flow precisely:

1. **RED (Step 1-2):** Created test file; verified failure with "Cannot find module './ics'"
2. **GREEN (Step 3-4):** Implemented code exactly per brief; all 3 tests pass
3. **COMMIT (Step 5):** Used explicit pathspec as required: `git commit lib/calendar/ics.js lib/calendar/ics.test.js -m "feat(calendar): per-event ICS (dates mode) with tombstone status"`

## Files Changed

```
commit 33584e4a
Author: Fabio Gerhold <fabio.gerhold@zyglox.com>
Date:   [timestamp]

    feat(calendar): per-event ICS (dates mode) with tombstone status

 lib/calendar/ics.js      | 59 ++++++++++++++++++++++++++++++++++++++++++++++
 lib/calendar/ics.test.js | 68 ++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 127 insertions(+)
```

## Self-Review Checklist

- ✓ **Fully implemented:** venueSummaryLine, eventVevents, buildCalendar, perEventCalendar (no Task 9 functions like recurringVevents/masterFeed)
- ✓ **Matches brief exactly:** Code copied verbatim from task-8-brief.md, no deviations
- ✓ **Tests verify real behavior:**
  - Deterministic output (not time-dependent)
  - CRLF line breaks (RFC-5545 requirement)
  - 75-octet UTF-8 folding (RFC-5545 requirement)
  - Tombstone status keeps stable UID (calendar client correctness)
- ✓ **Pristine test output:** 3/3 passing, no warnings or failures
- ✓ **Dependencies correct:**
  - Imports from text.js: `escapeText`, `assemble` ✓
  - Imports from datetime.js: `formatIcsLocal`, `formatUtcStamp`, `sequenceFromUpdatedAt` ✓
  - No new runtime/dev dependencies added ✓
- ✓ **Export correctness:** Only 4 functions exported, no helpers exposed
- ✓ **Commit hygiene:** Explicit pathspec used, no unrelated files included

## Key Design Decisions

1. **Helper function `descriptionFor(def, locale)`** — not exported, internal only. Builds multi-part description (summary + registration URL).

2. **ICS_STATUS mapping table** — handles all event status values with appropriate RFC-5545 STATUS values:
   - `scheduled` → `CONFIRMED` (event is going ahead)
   - `cancelled` → `CANCELLED` (tombstone — UID preserved for client cleanup)
   - `postponed`/`rescheduled` → `TENTATIVE` (date/time uncertain but slot exists)
   - `moved_online` → `CONFIRMED` (event still happening, just online)

3. **ORIGIN constant** — hardcoded `https://wildcare.space` for `URL` field in VEVENTs (site origin).

4. **Floating times (no UTC)** — DTSTART/DTEND use local time format (no Z suffix), allowing calendar clients to interpret in user's timezone.

## Concerns

None. The implementation is complete, tested, matches the brief exactly, and follows all RFC-5545 and project constraints:
- CommonJS (require/module.exports) ✓
- Pure functions ✓
- `updated_at` as ONLY source for SEQUENCE/DTSTAMP/LAST-MODIFIED ✓
- Stable UIDs from session.uid ✓
- CRLF/TEXT escaping/75-octet folding via text.js ✓

---

**Report generated:** 2026-07-26  
**Worktree:** `calendar-core-library-task8` (task-specific isolated branch)  
**Next task:** Task 9 will extend ics.js with `recurringVevents(def)` and `masterFeed(def)` — separate step, separate PR.
