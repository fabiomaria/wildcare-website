# Task 5: expand.js — Recurrence Expansion + RRULE/EXDATE

## Summary

Successfully implemented `lib/calendar/expand.js` with full recurrence expansion logic for weekly recurring events, RRULE formatting, and EXDATE handling. All 4 tests pass with pristine output.

## Implementation Details

### Files Created
- **`lib/calendar/expand.js`** — Pure library for weekly recurrence math:
  - `WEEKDAY_ICS` — Weekday name to ICS code mapping (monday→MO, etc.)
  - `expandRecurrence(recurrence, {from, to})` — Expands weekly series into concrete occurrences within a date range
  - `rruleString(recurrence)` — Generates RFC-5545 RRULE for FREQ=WEEKLY;BYDAY=
  - `exdateLocals(recurrence)` — Renders except-dates as local datetimes for EXDATE field
  - `firstOccurrenceLocal(recurrence)` — Retrieves series anchor (DTSTART) with start/end times

- **`lib/calendar/expand.test.js`** — 4 comprehensive tests covering:
  - Monday expansion with except-date skipping
  - Anchor-clamping (not before anchor date)
  - RRULE and anchor occurrence formatting
  - EXDATE local datetime rendering

### TDD Flow

**RED:** `node --test lib/calendar/expand.test.js` → MODULE_NOT_FOUND (expected)

**GREEN:** After implementation:
```
✔ expandRecurrence lists Mondays in range and skips except dates (2.7225ms)
✔ expandRecurrence starts no earlier than the anchor (0.076167ms)
✔ rruleString and firstOccurrenceLocal (0.068958ms)
✔ exdateLocals renders excluded occurrences at the series time (0.052167ms)
```
All 4 tests pass, 0 failures.

### Edge Cases Verified

1. **Except-date skipping:** 2026-01-19 excluded from Monday series, produces [01-05, 01-12, 01-26]
2. **Anchor clamping:** Range from 2025-12-01 does not emit dates before anchor 2026-01-05
3. **RRULE format:** Correctly generates `FREQ=WEEKLY;BYDAY=MO`
4. **EXDATE times:** Except-dates rendered at series start_time (17:45) for ICS compliance
5. **Anchor occurrence:** firstOccurrenceLocal returns anchor date with times, even when anchor is not a Monday after clamping

### Implementation Quality

- **Pure functions:** No I/O, no mutations of inputs
- **CommonJS only:** `require`/`module.exports`, no ES modules
- **No new dependencies:** Uses only Node.js built-ins (Date, Set)
- **Self-contained:** No dependency on text.js or datetime.js; pure UTC calendar-date math
- **RFC-5545 compliant:** RRULE and EXDATE formats match iCalendar spec

### Commit

```
85ecffc4 feat(calendar): weekly recurrence expansion + RRULE/EXDATE
```

Explicit pathspec used (no index sweep risk):
```bash
git add lib/calendar/expand.js lib/calendar/expand.test.js
git commit lib/calendar/expand.js lib/calendar/expand.test.js -m "feat(calendar): weekly recurrence expansion + RRULE/EXDATE"
```

## Self-Review Checklist

- [x] Fully implemented: WEEKDAY_ICS, expandRecurrence, rruleString, exdateLocals, firstOccurrenceLocal
- [x] Matches brief's exact code
- [x] Tests verify real behavior (anchor-clamping, except-date-skipping)
- [x] Pristine test output (4/4 passing)
- [x] Committed with explicit pathspec
- [x] No new dependencies introduced
- [x] Pure functions (no side effects)

## Status

**DONE** — All requirements met, tests green, commit clean.
