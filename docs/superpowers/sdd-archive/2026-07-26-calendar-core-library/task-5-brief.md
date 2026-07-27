### Task 5: `expand.js` (recurrence expansion + RRULE/EXDATE)

**Files:**
- Create: `lib/calendar/expand.js`
- Test: `lib/calendar/expand.test.js`

**Interfaces:**
- Consumes: nothing (self-contained date math on UTC calendar dates).
- Produces:
  - `WEEKDAY_ICS: {monday:'MO', ...}`
  - `expandRecurrence(recurrence, range: {from: string, to: string}): {date,start_local,end_local}[]` — concrete occurrences (for website listing), skipping `except`.
  - `rruleString(recurrence): string` — e.g. `FREQ=WEEKLY;BYDAY=MO`.
  - `exdateLocals(recurrence): string[]` — excluded occurrences as local datetimes `YYYY-MM-DDTHH:mm`.
  - `firstOccurrenceLocal(recurrence): {start_local,end_local}` — the series anchor occurrence (DTSTART).

- [ ] **Step 1: Write the failing test**

```js
// lib/calendar/expand.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { expandRecurrence, rruleString, exdateLocals, firstOccurrenceLocal } = require("./expand");

const REC = { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", except: ["2026-01-19"] };

test("expandRecurrence lists Mondays in range and skips except dates", () => {
  const occ = expandRecurrence(REC, { from: "2026-01-01", to: "2026-02-01" });
  const dates = occ.map((o) => o.date);
  assert.deepEqual(dates, ["2026-01-05", "2026-01-12", "2026-01-26"]); // 19th excluded
  assert.equal(occ[0].start_local, "2026-01-05T17:45");
  assert.equal(occ[0].end_local, "2026-01-05T19:15");
});

test("expandRecurrence starts no earlier than the anchor", () => {
  const occ = expandRecurrence(REC, { from: "2025-12-01", to: "2026-01-10" });
  assert.deepEqual(occ.map((o) => o.date), ["2026-01-05"]);
});

test("rruleString and firstOccurrenceLocal", () => {
  assert.equal(rruleString(REC), "FREQ=WEEKLY;BYDAY=MO");
  assert.deepEqual(firstOccurrenceLocal(REC), { start_local: "2026-01-05T17:45", end_local: "2026-01-05T19:15" });
});

test("exdateLocals renders excluded occurrences at the series time", () => {
  assert.deepEqual(exdateLocals(REC), ["2026-01-19T17:45"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/expand.test.js`
Expected: FAIL — `Cannot find module './expand'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/calendar/expand.js
"use strict";

const WEEKDAY_NUM = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const WEEKDAY_ICS = { monday: "MO", tuesday: "TU", wednesday: "WE", thursday: "TH", friday: "FR", saturday: "SA", sunday: "SU" };

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function firstOnOrAfter(startMs, weekdayNum) {
  const d = new Date(startMs);
  while (d.getUTCDay() !== weekdayNum) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function expandRecurrence(recurrence, { from, to }) {
  const target = WEEKDAY_NUM[recurrence.weekday];
  const anchorMs = Date.parse(recurrence.anchor + "T00:00:00Z");
  const fromMs = Date.parse(from + "T00:00:00Z");
  const toMs = Date.parse(to + "T00:00:00Z");
  const except = new Set(recurrence.except || []);
  const start = firstOnOrAfter(Math.max(anchorMs, fromMs), target);
  const out = [];
  for (const d = new Date(start); d.getTime() <= toMs; d.setUTCDate(d.getUTCDate() + 7)) {
    const date = isoDate(d);
    if (except.has(date)) continue;
    out.push({ date, start_local: `${date}T${recurrence.start_time}`, end_local: `${date}T${recurrence.end_time}` });
  }
  return out;
}

function rruleString(recurrence) {
  return `FREQ=WEEKLY;BYDAY=${WEEKDAY_ICS[recurrence.weekday]}`;
}

function exdateLocals(recurrence) {
  return (recurrence.except || []).map((date) => `${date}T${recurrence.start_time}`);
}

function firstOccurrenceLocal(recurrence) {
  const target = WEEKDAY_NUM[recurrence.weekday];
  const d = firstOnOrAfter(Date.parse(recurrence.anchor + "T00:00:00Z"), target);
  const date = isoDate(d);
  return { start_local: `${date}T${recurrence.start_time}`, end_local: `${date}T${recurrence.end_time}` };
}

module.exports = { WEEKDAY_ICS, expandRecurrence, rruleString, exdateLocals, firstOccurrenceLocal };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/expand.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/expand.js lib/calendar/expand.test.js
git commit lib/calendar/expand.js lib/calendar/expand.test.js -m "feat(calendar): weekly recurrence expansion + RRULE/EXDATE"
```

---

