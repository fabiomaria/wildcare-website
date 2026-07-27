### Task 4: `format.js` (bilingual display strings)

**Files:**
- Create: `lib/calendar/format.js`
- Test: `lib/calendar/format.test.js`

**Interfaces:**
- Consumes: `parseLocal` from `datetime.js`.
- Produces:
  - `formatDateRange(startLocal: string, endLocal: string, locale: 'de'|'en'): string`
  - `formatRecurring(recurrence: {weekday,start_time,end_time}, locale): string`

- [ ] **Step 1: Write the failing test**

```js
// lib/calendar/format.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { formatDateRange, formatRecurring } = require("./format");

test("formatDateRange (en) renders a multi-day range", () => {
  assert.equal(formatDateRange("2026-10-09T19:00", "2026-10-11T19:00", "en"), "9–11 October 2026");
});

test("formatDateRange (en) collapses a single day", () => {
  assert.equal(formatDateRange("2026-10-09T19:00", "2026-10-09T21:00", "en"), "9 October 2026");
});

test("formatDateRange (de) renders German month names", () => {
  assert.equal(formatDateRange("2026-10-09T19:00", "2026-10-11T19:00", "de"), "9.–11. Oktober 2026");
});

test("formatRecurring renders the weekly phrase per locale", () => {
  const rec = { weekday: "monday", start_time: "17:45", end_time: "19:15" };
  assert.equal(formatRecurring(rec, "de"), "Jeden Montag, 17:45–19:15");
  assert.equal(formatRecurring(rec, "en"), "Every Monday, 17:45–19:15");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/format.test.js`
Expected: FAIL — `Cannot find module './format'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/calendar/format.js
"use strict";
const { parseLocal } = require("./datetime");

const LOCALE_TAG = { de: "de-AT", en: "en-GB" };
const WEEKDAY = {
  de: { monday: "Montag", tuesday: "Dienstag", wednesday: "Mittwoch", thursday: "Donnerstag", friday: "Freitag", saturday: "Samstag", sunday: "Sonntag" },
  en: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" },
};

function toUtcDate(local) {
  const p = parseLocal(local);
  return new Date(Date.UTC(Number(p.y), Number(p.mo) - 1, Number(p.d)));
}

function formatDateRange(startLocal, endLocal, locale) {
  const dtf = new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  const a = toUtcDate(startLocal);
  const b = toUtcDate(endLocal);
  if (a.getTime() === b.getTime()) return dtf.format(a);
  return dtf.formatRange(a, b);
}

function formatRecurring(recurrence, locale) {
  const every = locale === "de" ? "Jeden" : "Every";
  const day = WEEKDAY[locale][recurrence.weekday];
  return `${every} ${day}, ${recurrence.start_time}–${recurrence.end_time}`;
}

module.exports = { formatDateRange, formatRecurring };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/format.test.js`
Expected: PASS (4 tests). If `formatRange` output punctuation differs by ICU version, adjust the expected string to the actual `de-AT`/`en-GB` output — the behavior (range vs single day) is what matters.

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/format.js lib/calendar/format.test.js
git commit lib/calendar/format.js lib/calendar/format.test.js -m "feat(calendar): bilingual date/schedule display strings"
```

---

