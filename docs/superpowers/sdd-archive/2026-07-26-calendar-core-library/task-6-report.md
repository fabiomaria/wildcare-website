# Task 6: google.js — Implementation Report

## Overview

Successfully implemented `lib/calendar/google.js` following RED → GREEN TDD cycle. Created a pure function that generates RFC-compliant Google Calendar "Add to Calendar" URLs with Vienna timezone support.

## Files Created

- **`lib/calendar/google.js`** (15 lines)
  - Exports `googleUrl({title, details, location, start_local, end_local})` 
  - Imports `formatIcsLocal` from `datetime.js` (Task 2)
  - Constructs Google Calendar template URLs with `action=TEMPLATE`
  - Hardcodes `ctz=Europe/Vienna` as per spec
  - Conditionally includes optional `details` and `location` params

- **`lib/calendar/google.test.js`** (19 lines)
  - One comprehensive test validating full URL structure
  - Tests origin, pathname, and all query parameters
  - Verifies date formatting via `formatIcsLocal`

## TDD Cycle Evidence

### RED (Step 2)
```
$ node --test lib/calendar/google.test.js
Error: Cannot find module './google'
```
✔ Failed as expected

### GREEN (Step 4)
```
$ node --test lib/calendar/google.test.js
✔ googleUrl encodes a per-session template link with Vienna ctz
ℹ tests 1
ℹ pass 1
ℹ fail 0
```
✔ All 1 test passing

## Implementation Correctness

**Input:** `{title: "How We Move Together", details: "Register: https://...", location: "Orpheumgasse Studio...", start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00"}`

**Output:** `https://calendar.google.com/calendar/render?action=TEMPLATE&text=How+We+Move+Together&dates=20261009T190000%2F20261009T210000&ctz=Europe%2FVienna&details=...&location=...`

**Test Assertions (all passing):**
- ✔ URL origin and pathname correct
- ✔ `action` param = `TEMPLATE`
- ✔ `text` param = title
- ✔ `dates` param = `formatIcsLocal(start)/formatIcsLocal(end)` (ISO 8601 local time)
- ✔ `ctz` param = `Europe/Vienna`

## Commit

```
c86b2206 feat(calendar): add-to-Google-Calendar links
 2 files changed, 34 insertions(+)
 create mode 100644 lib/calendar/google.js
 create mode 100644 lib/calendar/google.test.js
```

## Self-Review Findings

### Strengths
- Follows spec exactly: uses `URLSearchParams` for safe param encoding
- Reuses `formatIcsLocal` from Task 2 — no date format duplication
- Conditional params (`details`, `location`) only included if truthy — clean URL for minimal inputs
- Pure function — no side effects, fully testable
- Test covers real behavior: URL parsing, param extraction, value assertions

### Concerns
- None. Implementation matches brief precisely; test comprehensive; commit clean.

## Verification Checklist

- [x] `googleUrl` function fully implemented
- [x] Matches brief code exactly
- [x] Imports `formatIcsLocal` correctly
- [x] Test verifies URL params and timezone
- [x] Test passes (1/1)
- [x] Commit created with explicit pathspec (`git commit lib/calendar/google.js lib/calendar/google.test.js -m "..."`)
- [x] Working tree clean

Ready for integration.
