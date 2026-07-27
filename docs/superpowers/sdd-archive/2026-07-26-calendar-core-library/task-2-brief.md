### Task 2: `datetime.js` (floating-local formatting + updated_at stamps)

**Files:**
- Create: `lib/calendar/datetime.js`
- Test: `lib/calendar/datetime.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parseLocal(s: string): {y,mo,d,h,mi,s}` (string parts, zero-padded) — throws on malformed input.
  - `formatIcsLocal(s: string): string` — `YYYY-MM-DDTHH:mm[:ss]` → `YYYYMMDDTHHMMSS` (floating, no `Z`).
  - `formatUtcStamp(isoZ: string): string` — UTC instant → `YYYYMMDDTHHMMSSZ`.
  - `sequenceFromUpdatedAt(isoZ: string): number` — → integer `YYYYMMDDHHMM` (monotonic).
  - `overallSpan(sessions: {start_local,end_local}[]): {start: string, end: string}` — min start, max end (lexicographic == chronological for zero-padded local ISO).

- [ ] **Step 1: Write the failing test**

```js
// lib/calendar/datetime.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { formatIcsLocal, formatUtcStamp, sequenceFromUpdatedAt, overallSpan, parseLocal } = require("./datetime");

test("formatIcsLocal pads seconds and strips separators (floating, no Z)", () => {
  assert.equal(formatIcsLocal("2026-10-09T19:00"), "20261009T190000");
  assert.equal(formatIcsLocal("2026-10-09T19:00:30"), "20261009T190030");
});

test("parseLocal throws on malformed input", () => {
  assert.throws(() => parseLocal("2026-13-09 19:00"), /invalid local datetime/);
});

test("formatUtcStamp renders a UTC basic-format stamp with Z", () => {
  assert.equal(formatUtcStamp("2026-07-26T10:00:00Z"), "20260726T100000Z");
});

test("sequenceFromUpdatedAt yields a monotonic YYYYMMDDHHMM integer", () => {
  assert.equal(sequenceFromUpdatedAt("2026-07-26T10:05:00Z"), 202607261005);
  assert.ok(sequenceFromUpdatedAt("2026-07-26T10:06:00Z") > sequenceFromUpdatedAt("2026-07-26T10:05:00Z"));
});

test("overallSpan returns earliest start and latest end", () => {
  const span = overallSpan([
    { start_local: "2026-10-10T18:30", end_local: "2026-10-10T21:00" },
    { start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00" },
    { start_local: "2026-10-11T16:00", end_local: "2026-10-11T19:00" },
  ]);
  assert.deepEqual(span, { start: "2026-10-09T19:00", end: "2026-10-11T19:00" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/datetime.test.js`
Expected: FAIL — `Cannot find module './datetime'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/calendar/datetime.js
"use strict";

function parseLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(s));
  if (!m) throw new Error("invalid local datetime: " + s);
  const [, y, mo, d, h, mi, sec] = m;
  const month = Number(mo), day = Number(d), hour = Number(h), min = Number(mi);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || min > 59) {
    throw new Error("invalid local datetime: " + s);
  }
  return { y, mo, d, h, mi, s: sec || "00" };
}

function formatIcsLocal(s) {
  const p = parseLocal(s);
  return `${p.y}${p.mo}${p.d}T${p.h}${p.mi}${p.s}`;
}

function utcParts(isoZ) {
  const dt = new Date(isoZ);
  if (Number.isNaN(dt.getTime())) throw new Error("invalid utc timestamp: " + isoZ);
  const p = (n) => String(n).padStart(2, "0");
  return {
    Y: dt.getUTCFullYear(), M: p(dt.getUTCMonth() + 1), D: p(dt.getUTCDate()),
    h: p(dt.getUTCHours()), m: p(dt.getUTCMinutes()), s: p(dt.getUTCSeconds()),
  };
}

function formatUtcStamp(isoZ) {
  const t = utcParts(isoZ);
  return `${t.Y}${t.M}${t.D}T${t.h}${t.m}${t.s}Z`;
}

function sequenceFromUpdatedAt(isoZ) {
  const t = utcParts(isoZ);
  return Number(`${t.Y}${t.M}${t.D}${t.h}${t.m}`);
}

function overallSpan(sessions) {
  const starts = sessions.map((s) => s.start_local).sort();
  const ends = sessions.map((s) => s.end_local).sort();
  return { start: starts[0], end: ends[ends.length - 1] };
}

module.exports = { parseLocal, formatIcsLocal, formatUtcStamp, sequenceFromUpdatedAt, overallSpan };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/datetime.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/datetime.js lib/calendar/datetime.test.js
git commit lib/calendar/datetime.js lib/calendar/datetime.test.js -m "feat(calendar): floating-local datetime + updated_at stamps"
```

---

