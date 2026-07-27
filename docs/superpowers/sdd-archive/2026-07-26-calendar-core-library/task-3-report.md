# Task 3 Report: model.js (raw record → CalendarDefinition)

## Summary

Successfully implemented `lib/calendar/model.js` with `toDefinition()` function that normalizes raw event records (YAML schema v2) into `CalendarDefinition` objects consumed by downstream generators (format.js, ics.js, jsonld.js, google.js).

## Implementation Details

### Files Created
- `lib/calendar/model.js` — Core implementation
- `lib/calendar/model.test.js` — Test suite (3 tests)

### Core Function: `toDefinition(record, { venues })`

Transforms a raw record (global + locales) into a normalized definition object with:
- **Static fields**: id, route, type (event/workshop/montagskurs), mode (dates/recurring), eventStatus, availability, previousStart, updatedAt, primaryLocale, venue, registrationUrl, image, locales
- **Dates mode** (conference-style sessions):
  - `sessions[]` — array of {id, start_local, end_local, status, uid}
  - `span` — computed {start, end} via `overallSpan()` from datetime.js
- **Recurring mode** (standing classes):
  - `recurrence` — {weekday, start_time, end_time, anchor, horizon_months, except}
  - `featured[]` — special occurrences with interpolated datetimes (id+start_time → start_local)

### Key Behaviors

1. **Venue resolution**: Looks up venue by ref in venues map; throws "unknown venue: X" if not found
2. **Primary locale**: Extracted from `intended_locales[0]` or first key in locales object
3. **Session UIDs**: Generated as `${record_id}-${session_id}@wildcare.space`
4. **Type inference**: 
   - `event` if `global.event_type` is truthy
   - `montagskurs` if mode is `recurring`
   - `workshop` (default)
5. **Fallbacks**: 
   - Missing `schedule` → empty object
   - Missing `eventStatus` → "scheduled"
   - Missing `availability` → "available"
   - Missing `locales` → {}

## Test-Driven Development Evidence

### RED Phase
```
$ node --test lib/calendar/model.test.js
Error: Cannot find module './model'
✖ failing tests: 1
```

### GREEN Phase
```
$ node --test lib/calendar/model.test.js
✔ toDefinition resolves venue, span, primary locale, and session UIDs (0.708ms)
✔ toDefinition throws on an unknown venue reference (0.171ms)
✔ toDefinition maps a recurring record and merges featured localized notes (0.081ms)
ℹ tests 3
ℹ pass 3
ℹ fail 0
```

## Test Coverage

### Test 1: Dates Mode (HWMT workshop)
- Validates venue resolution from map
- Confirms primaryLocale extraction
- Checks `span` computation via `overallSpan()`
- Verifies session UID generation
- Confirms registrationUrl and availability mapping

### Test 2: Unknown Venue
- Validates error handling with regex match on error message
- Confirms secure error reporting (no unescaped user input)

### Test 3: Recurring Mode (Montagskurs)
- Maps recurring record with multiple locales
- Verifies featured occurrence datetime interpolation (id + start_time → start_local)
- Confirms recurrence object passthrough
- Validates teacher field handling (nullable)

## Commit

```
Commit: f6ad84f6
Message: feat(calendar): normalize records into CalendarDefinition
Files: lib/calendar/model.js, lib/calendar/model.test.js
```

## Self-Review Findings

✅ **Fully implemented**: All required fields in CalendarDefinition present
✅ **Exact match to brief**: Code transcribed verbatim from spec
✅ **Tests verify behavior**: Three tests exercise dates, recurring, and error paths
✅ **Pure function**: No I/O, Date.now(), or side effects
✅ **Dependencies correct**: Uses `overallSpan` from datetime.js (Task 2)
✅ **CommonJS**: Module uses require/module.exports exclusively
✅ **No new dependencies**: Tests use only node:test and node:assert/strict
✅ **Pristine test output**: All 3 tests pass; no warnings or timeouts

## Dependencies

- **Internal**: `./datetime.js` (Task 2, already committed)
- **External**: node:test, node:assert/strict (built-in)

## Concerns

None. The implementation follows the brief exactly, all tests pass, and the code is ready for downstream generators (format.js, ics.js, etc.) to consume CalendarDefinition objects.
