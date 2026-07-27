# Task 2 Report: datetime.js (floating-local formatting + updated_at stamps)

## Summary

Task 2 implementation completed successfully. Created `lib/calendar/datetime.js` and `lib/calendar/datetime.test.js` with exact code from the brief, following the RED → GREEN → COMMIT sequence.

## Implementation

### Files Created
- `lib/calendar/datetime.js` (45 lines): 5 pure functions for floating-local datetime handling
  - `parseLocal(s)`: Parses ISO 8601-like string to zero-padded object parts with validation
  - `formatIcsLocal(s)`: Strips separators and pads seconds for iCalendar basic format (floating, no Z)
  - `formatUtcStamp(isoZ)`: Converts UTC instant to basic format with Z suffix
  - `sequenceFromUpdatedAt(isoZ)`: Extracts monotonic YYYYMMDDHHMM integer from updated_at
  - `overallSpan(sessions)`: Finds min start and max end across session array (lexicographic sort safe because zero-padded)
  - `utcParts(isoZ)` (internal): Helper to parse Date and format parts for UTC timestamps

- `lib/calendar/datetime.test.js` (32 lines): 5 test cases covering all exported functions

### Code Fidelity

Transcription verified against brief:
- All function signatures match exactly
- All validation logic (month/day/hour/minute bounds) implemented
- Error messages match spec
- Module exports correct 5-tuple
- Test assertions match brief line-for-line

## Testing Results

### RED (Step 2)
```
node --test lib/calendar/datetime.test.js
Error: Cannot find module './datetime'
✖ lib/calendar/datetime.test.js
  'test failed'
```
✓ Expected: test fails because module doesn't exist

### GREEN (Step 4)
```
node --test lib/calendar/datetime.test.js
✔ formatIcsLocal pads seconds and strips separators (floating, no Z)
✔ parseLocal throws on malformed input
✔ formatUtcStamp renders a UTC basic-format stamp with Z
✔ sequenceFromUpdatedAt yields a monotonic YYYYMMDDHHMM integer
✔ overallSpan returns earliest start and latest end

ℹ tests 5
ℹ pass 5
ℹ fail 0
ℹ duration_ms 40.11625
```
✓ All 5 tests passing, clean output, no warnings

## Commit

```bash
git add lib/calendar/datetime.js lib/calendar/datetime.test.js
git commit lib/calendar/datetime.js lib/calendar/datetime.test.js -m "feat(calendar): floating-local datetime + updated_at stamps"
```

**Result:** commit `cda2706b` on `calendar-core-library` branch
- Files: 2 changed, 77 insertions(+)
- Staged explicitly by pathspec (no accidental sweeping of unrelated changes)

## Self-Review

- [x] All 5 exported functions implemented
- [x] Code transcription matches brief exactly (no drift)
- [x] All test cases verify behavior (not just structure)
- [x] Test output pristine (5 pass, 0 fail, no warnings or stray output)
- [x] Commit uses explicit pathspec as per CLAUDE.md
- [x] No dependencies on Task 1 (datetime.js is self-contained)

## Concerns

None. Implementation is complete, tests are passing, commit is clean.

## Verification Commands

To re-run tests:
```bash
node --test lib/calendar/datetime.test.js
```

To verify commit:
```bash
git show cda2706b
```

---

**Status:** DONE
**Commit:** cda2706b feat(calendar): floating-local datetime + updated_at stamps
**Test Result:** 5/5 passing, no failures
**Date Completed:** 2026-07-26

---

## Fix Report: Calendar-invalid day validation (post-review)

### Finding (from code review)

`parseLocal` validated day against a flat bound of 1-31 regardless of month, so
calendar-invalid combinations like `2026-02-30T12:00` (Feb 30 doesn't exist)
passed validation despite the function's contract stating it "throws on
malformed input." Leap-year Feb 29 was also not distinguished from non-leap-year
Feb 29.

### Change

Added a `daysInMonth(year, month)` helper to `lib/calendar/datetime.js` that
computes the correct day count per month, including leap-year handling for
February (divisible by 4, except century years not divisible by 400). `parseLocal`
now additionally checks `day > daysInMonth(year, month)` and throws the same
`"invalid local datetime: " + s` error if the day exceeds the actual length of
that month. This is an additive change — the regex, existing bounds checks, and
all other functions in the file are unchanged.

```js
function daysInMonth(year, month) {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const lengths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1];
}
```

### Tests added to `lib/calendar/datetime.test.js`

```js
test("parseLocal throws on calendar-invalid day (Feb 30)", () => {
  assert.throws(() => parseLocal("2026-02-30T12:00"), /invalid local datetime/);
});

test("parseLocal accepts Feb 29 in a leap year but rejects it in a non-leap year", () => {
  assert.deepEqual(parseLocal("2028-02-29T12:00"), { y: "2028", mo: "02", d: "29", h: "12", mi: "00", s: "00" });
  assert.throws(() => parseLocal("2026-02-29T12:00"), /invalid local datetime/);
});
```

### Test run

Command: `node --test lib/calendar/datetime.test.js`

```
✔ formatIcsLocal pads seconds and strips separators (floating, no Z)
✔ parseLocal throws on malformed input
✔ parseLocal throws on calendar-invalid day (Feb 30)
✔ parseLocal accepts Feb 29 in a leap year but rejects it in a non-leap year
✔ formatUtcStamp renders a UTC basic-format stamp with Z
✔ sequenceFromUpdatedAt yields a monotonic YYYYMMDDHHMM integer
✔ overallSpan returns earliest start and latest end

ℹ tests 7
ℹ pass 7
ℹ fail 0
ℹ duration_ms 38.205875
```

All 7 tests pass (5 original + 2 new), no failures, clean output.

### Commit

```bash
git add lib/calendar/datetime.js lib/calendar/datetime.test.js
git commit lib/calendar/datetime.js lib/calendar/datetime.test.js -m "fix(calendar): reject calendar-invalid days in parseLocal (Feb 30, leap-year Feb 29)"
```

**Result:** commit `638e3382` on `calendar-core-library` branch
- Files: 2 changed, 19 insertions(+), 1 deletion(-)
- Staged explicitly by pathspec

**Fix Status:** DONE
**Fix Commit:** 638e3382 fix(calendar): reject calendar-invalid days in parseLocal (Feb 30, leap-year Feb 29)
