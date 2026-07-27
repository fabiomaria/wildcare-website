### Task 9: `ics.js` part 2 — recurring series, featured overrides, master feed

**Files:**
- Modify: `lib/calendar/ics.js`
- Test: `lib/calendar/ics-recurring.test.js`

**Interfaces:**
- Consumes: additionally `rruleString`, `exdateLocals`, `firstOccurrenceLocal` (`expand.js`).
- Produces:
  - `recurringVevents(def): string[][]` — series VEVENT (with `RRULE`/`EXDATE`) + one override VEVENT per featured occurrence (same UID + `RECURRENCE-ID`).
  - `masterFeed(defs: CalendarDefinition[]): string` — one VCALENDAR aggregating every dates-mode VEVENT plus every recurring series/override VEVENT.

- [ ] **Step 1: Write the failing test**

```js
// lib/calendar/ics-recurring.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { recurringVevents, masterFeed } = require("./ics");

const REC_DEF = {
  id: "montagskurs", route: "/montagskurs", updatedAt: "2026-07-26T10:00:00Z",
  eventStatus: "scheduled", primaryLocale: "de",
  venue: { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" },
  registrationUrl: null,
  locales: { de: { title: "Montagskurs" } },
  recurrence: { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", except: ["2026-01-19"] },
  featured: [{ id: "2026-11-16", teacher: "Guest", start_local: "2026-11-16T17:45", end_local: "2026-11-16T19:15" }],
};

test("recurringVevents emits an unbounded RRULE series with EXDATE and a RECURRENCE-ID override sharing the UID", () => {
  const blocks = recurringVevents(REC_DEF);
  const series = blocks[0];
  assert.ok(series.includes("UID:montagskurs@wildcare.space"));
  assert.ok(series.includes("DTSTART:20260105T174500"));
  assert.ok(series.includes("RRULE:FREQ=WEEKLY;BYDAY=MO"));
  assert.ok(series.includes("EXDATE:20260119T174500"));

  const override = blocks[1];
  assert.ok(override.includes("UID:montagskurs@wildcare.space"), "override shares series UID");
  assert.ok(override.includes("RECURRENCE-ID:20261116T174500"));
  assert.ok(override.includes("DTSTART:20261116T174500"));
});

test("masterFeed aggregates dates-mode and recurring definitions into one VCALENDAR", () => {
  const datesDef = {
    id: "hw", route: "/hw", updatedAt: "2026-07-26T10:00:00Z", eventStatus: "scheduled", primaryLocale: "en",
    venue: REC_DEF.venue, registrationUrl: null, locales: { en: { title: "HW" } },
    mode: "dates", sessions: [{ id: "s1", start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00", status: "scheduled", uid: "hw-s1@wildcare.space" }],
  };
  const recDef = Object.assign({ mode: "recurring" }, REC_DEF);
  const feed = masterFeed([datesDef, recDef]);
  assert.ok(feed.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(feed.endsWith("END:VCALENDAR\r\n"));
  assert.ok(feed.includes("UID:hw-s1@wildcare.space"));
  assert.ok(feed.includes("UID:montagskurs@wildcare.space"));
  assert.ok(feed.includes("RRULE:FREQ=WEEKLY;BYDAY=MO"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/ics-recurring.test.js`
Expected: FAIL — `recurringVevents is not a function` / `masterFeed is not a function`.

- [ ] **Step 3: Write minimal implementation (extend `ics.js`)**

Add these requires at the top of `lib/calendar/ics.js`:

```js
const { rruleString, exdateLocals, firstOccurrenceLocal } = require("./expand");
```

Add these functions before `module.exports`:

```js
function recurringVevents(def) {
  const stamp = formatUtcStamp(def.updatedAt);
  const seq = sequenceFromUpdatedAt(def.updatedAt);
  const title = (def.locales[def.primaryLocale] || {}).title || def.id;
  const location = venueSummaryLine(def.venue);
  const uid = `${def.id}@wildcare.space`;
  const first = firstOccurrenceLocal(def.recurrence);

  const series = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsLocal(first.start_local)}`,
    `DTEND:${formatIcsLocal(first.end_local)}`,
    `RRULE:${rruleString(def.recurrence)}`,
  ];
  const exdates = exdateLocals(def.recurrence);
  if (exdates.length) series.push(`EXDATE:${exdates.map(formatIcsLocal).join(",")}`);
  series.push(`SUMMARY:${escapeText(title)}`);
  series.push(`LOCATION:${escapeText(location)}`);
  series.push(`URL:${ORIGIN}${def.route}`);
  series.push(`STATUS:${ICS_STATUS[def.eventStatus] || "CONFIRMED"}`);
  series.push(`SEQUENCE:${seq}`);
  series.push(`LAST-MODIFIED:${stamp}`);
  series.push("END:VEVENT");

  const blocks = [series];
  for (const f of def.featured || []) {
    const summary = f.teacher ? `${title} — ${f.teacher}` : title;
    blocks.push([
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `RECURRENCE-ID:${formatIcsLocal(f.start_local)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsLocal(f.start_local)}`,
      `DTEND:${formatIcsLocal(f.end_local)}`,
      `SUMMARY:${escapeText(summary)}`,
      `LOCATION:${escapeText(location)}`,
      `URL:${ORIGIN}${def.route}/${f.id}`,
      `STATUS:CONFIRMED`,
      `SEQUENCE:${seq}`,
      `LAST-MODIFIED:${stamp}`,
      "END:VEVENT",
    ]);
  }
  return blocks;
}

function masterFeed(defs) {
  const vevents = [];
  for (const def of defs) {
    if (def.mode === "recurring") vevents.push(...recurringVevents(def));
    else vevents.push(...eventVevents(def));
  }
  return buildCalendar(vevents);
}
```

Update the exports line:

```js
module.exports = { venueSummaryLine, eventVevents, buildCalendar, perEventCalendar, recurringVevents, masterFeed };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/`
Expected: PASS (all suites, including the two ICS files).

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/ics.js lib/calendar/ics-recurring.test.js
git commit lib/calendar/ics.js lib/calendar/ics-recurring.test.js -m "feat(calendar): recurring series, featured overrides, master feed"
```

---

