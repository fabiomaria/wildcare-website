### Task 10: `index.js` public surface + end-to-end fixture test

**Files:**
- Create: `lib/calendar/index.js`
- Create: `lib/calendar/fixtures/how-we-move-together.json` (a realistic dates-mode record)
- Create: `lib/calendar/fixtures/montagskurs.json` (a recurring record with a featured Monday)
- Test: `lib/calendar/index.test.js`

**Interfaces:**
- Consumes: all prior modules.
- Produces (single import surface):
  - `toDefinition`, `eventJsonLd`, `recurringJsonLd`, `perEventCalendar`, `masterFeed`, `googleUrl`, `formatDateRange`, `formatRecurring`, `expandRecurrence`.

- [ ] **Step 1: Write the failing test**

```js
// lib/calendar/index.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cal = require("./index");

const VENUES = {
  orpheumgasse: { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" },
};
const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

test("end-to-end: dates-mode fixture → definition → ICS + JSON-LD", () => {
  const def = cal.toDefinition(load("how-we-move-together.json"), { venues: VENUES });
  const ics = cal.perEventCalendar(def);
  assert.ok(ics.includes("BEGIN:VEVENT"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  const ld = cal.eventJsonLd(def, { locale: def.primaryLocale });
  assert.equal(ld["@type"], "Event");
  assert.ok(ld.startDate && ld.endDate);
});

test("end-to-end: recurring fixture → master feed contains series + override", () => {
  const def = cal.toDefinition(load("montagskurs.json"), { venues: VENUES });
  const feed = cal.masterFeed([def]);
  assert.ok(feed.includes("RRULE:FREQ=WEEKLY;BYDAY=MO"));
  assert.ok(feed.includes("RECURRENCE-ID:"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/index.test.js`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Write the fixtures and index**

`lib/calendar/fixtures/how-we-move-together.json`:

```json
{
  "schema_version": 2,
  "global": {
    "id": "how-we-move-together", "route": "/how-we-move-together", "intended_locales": ["en"],
    "venue": "orpheumgasse", "image": "/assets/uploads/x.webp", "updated_at": "2026-07-26T10:00:00Z",
    "registration": { "url": "https://tally.so/r/ABC", "availability": "available" },
    "schedule": {
      "event_status": "scheduled", "mode": "dates",
      "sessions": [
        { "id": "fri-eve", "start_local": "2026-10-09T19:00", "end_local": "2026-10-09T21:00" },
        { "id": "sat-aft", "start_local": "2026-10-10T13:00", "end_local": "2026-10-10T17:00" },
        { "id": "sun-morn", "start_local": "2026-10-11T10:00", "end_local": "2026-10-11T14:00" }
      ]
    }
  },
  "locales": { "en": { "title": "How We Move Together", "summary": "A two-day Contact Improvisation workshop." } }
}
```

`lib/calendar/fixtures/montagskurs.json`:

```json
{
  "schema_version": 2,
  "global": {
    "id": "montagskurs", "route": "/montagskurs", "intended_locales": ["de", "en"],
    "venue": "orpheumgasse", "updated_at": "2026-07-26T10:00:00Z",
    "schedule": {
      "event_status": "scheduled", "mode": "recurring",
      "recurrence": { "weekday": "monday", "start_time": "17:45", "end_time": "19:15", "anchor": "2026-01-05", "horizon_months": 6, "except": [] },
      "featured_occurrences": [{ "id": "2026-11-16", "teacher": "Guest Teacher" }]
    }
  },
  "locales": {
    "de": { "title": "Montagskurs", "schedule": { "featured_occurrences": { "2026-11-16": { "note": "Sonderabend" } } } },
    "en": { "title": "Monday Class", "schedule": { "featured_occurrences": { "2026-11-16": { "note": "Special evening" } } } }
  }
}
```

`lib/calendar/index.js`:

```js
"use strict";
const { toDefinition } = require("./model");
const { eventJsonLd, recurringJsonLd } = require("./jsonld");
const { perEventCalendar, masterFeed, eventVevents, recurringVevents, buildCalendar } = require("./ics");
const { googleUrl } = require("./google");
const { formatDateRange, formatRecurring } = require("./format");
const { expandRecurrence } = require("./expand");

module.exports = {
  toDefinition,
  eventJsonLd, recurringJsonLd,
  perEventCalendar, masterFeed, eventVevents, recurringVevents, buildCalendar,
  googleUrl,
  formatDateRange, formatRecurring,
  expandRecurrence,
};
```

- [ ] **Step 4: Run the full library suite**

Run: `npm run test:calendar`
Expected: PASS — every suite green.

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/index.js lib/calendar/fixtures lib/calendar/index.test.js
git commit lib/calendar/index.js lib/calendar/fixtures lib/calendar/index.test.js -m "feat(calendar): public index + end-to-end fixture tests"
```

---

## What this plan deliberately leaves to Plans 2 and 3

- **Plan 2 (registry_revision:2):** the `schedule`/venue/event field definitions, enums, generated JSON schemas + docs, `admin/config.yml`, migration/downgrade mappings, and validators (including `start_at == earliest session start`). This library consumes the record shape; Plan 2 makes that shape official and CMS-editable.
- **Plan 3 (Eleventy + content):** `event-jsonld.njk`, per-event `.ics` pagination to `/calendar/<id>.ics`, `/wildcare.ics`, generated `sitemap.xml`, `event.njk` + featured-Monday leaf pages, the add-to-calendar UI (visual pass), converting the three real workshops, and dual-read HTML parity.

---

## Self-review notes

- **Spec coverage (library scope):** floating local time ✓ (no offsets emitted anywhere); `updated_at`→SEQUENCE/DTSTAMP/LAST-MODIFIED ✓ (Task 2/8/9); stable UIDs ✓ (Task 3/8); RRULE+EXDATE+RECURRENCE-ID ✓ (Task 9); tombstone STATUS:CANCELLED same UID ✓ (Task 8); eventSchedule omits startDate ✓ (Task 7); per-session Google links with ctz ✓ (Task 6); bilingual generated display ✓ (Task 4); 75-octet UTF-8 folding + CRLF + escaping ✓ (Task 1). Sitemap, leaf pages, and content migration are correctly deferred to Plan 3.
- **Type consistency:** `CalendarDefinition` fields defined in Task 3 (`sessions[].uid`, `span`, `recurrence`, `featured[].start_local`, `primaryLocale`, `venue.postal_code`, `eventStatus`, `availability`) are used verbatim in Tasks 6–9. `mode` is set on definitions by callers of `masterFeed` (Task 9 test sets it explicitly; Plan 3's loader sets it from `toDefinition`, which already assigns `mode`).
- **No placeholders:** every step has runnable code and an exact command.
