### Task 3: `model.js` (raw record → `CalendarDefinition`)

**Files:**
- Create: `lib/calendar/model.js`
- Test: `lib/calendar/model.test.js`

**Interfaces:**
- Consumes: `overallSpan` from `datetime.js`.
- Produces:
  - `toDefinition(record: object, opts: {venues: object}): CalendarDefinition`
  - **`CalendarDefinition`** (the shape every generator consumes):
    ```
    {
      id, route, type,               // type: 'workshop' | 'event' | 'montagskurs'
      mode,                          // 'dates' | 'recurring'
      eventStatus, availability,     // enum strings
      previousStart,                 // string | null (rescheduled)
      updatedAt,                     // UTC iso string
      primaryLocale,                 // e.g. 'de'
      sessions,                      // dates mode: [{id,start_local,end_local,status,uid}]
      span,                          // dates mode: {start,end}
      recurrence,                    // recurring mode: {weekday,start_time,end_time,anchor,horizon_months,except[]}
      featured,                      // recurring: [{id,teacher,start_local,end_local}]
      venue,                         // resolved {name,street,postal_code,city,country}
      registrationUrl,               // string | null
      image,                         // string | null
      locales                        // { de:{title,summary,...}, en:{...} }
    }
    ```

- [ ] **Step 1: Write the failing test**

```js
// lib/calendar/model.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { toDefinition } = require("./model");

const VENUES = {
  orpheumgasse: { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" },
};

const DATES_RECORD = {
  schema_version: 2,
  global: {
    id: "how-we-move-together", route: "/how-we-move-together", intended_locales: ["en"],
    venue: "orpheumgasse", image: "/assets/uploads/x.webp",
    updated_at: "2026-07-26T10:00:00Z",
    registration: { url: "https://tally.so/r/ABC", availability: "available" },
    schedule: {
      event_status: "scheduled", mode: "dates",
      sessions: [
        { id: "fri-eve", start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00" },
        { id: "sat-aft", start_local: "2026-10-10T13:00", end_local: "2026-10-10T17:00" },
      ],
    },
  },
  locales: { en: { title: "How We Move Together", summary: "A CI workshop." } },
};

test("toDefinition resolves venue, span, primary locale, and session UIDs", () => {
  const def = toDefinition(DATES_RECORD, { venues: VENUES });
  assert.equal(def.mode, "dates");
  assert.equal(def.venue.name, "Orpheumgasse Studio");
  assert.equal(def.primaryLocale, "en");
  assert.deepEqual(def.span, { start: "2026-10-09T19:00", end: "2026-10-10T17:00" });
  assert.equal(def.sessions[0].uid, "how-we-move-together-fri-eve@wildcare.space");
  assert.equal(def.registrationUrl, "https://tally.so/r/ABC");
  assert.equal(def.availability, "available");
});

test("toDefinition throws on an unknown venue reference", () => {
  const bad = JSON.parse(JSON.stringify(DATES_RECORD));
  bad.global.venue = "nowhere";
  assert.throws(() => toDefinition(bad, { venues: VENUES }), /unknown venue: nowhere/);
});

test("toDefinition maps a recurring record and merges featured localized notes", () => {
  const rec = {
    schema_version: 2,
    global: {
      id: "montagskurs", route: "/montagskurs", intended_locales: ["de", "en"],
      venue: "orpheumgasse", updated_at: "2026-07-26T10:00:00Z",
      schedule: {
        event_status: "scheduled", mode: "recurring",
        recurrence: { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", horizon_months: 6, except: [] },
        featured_occurrences: [{ id: "2026-11-16", teacher: "Guest" }],
      },
    },
    locales: {
      de: { title: "Montagskurs", schedule: { featured_occurrences: { "2026-11-16": { note: "Sonderabend" } } } },
      en: { title: "Monday Class", schedule: { featured_occurrences: { "2026-11-16": { note: "Special evening" } } } },
    },
  };
  const def = toDefinition(rec, { venues: VENUES });
  assert.equal(def.mode, "recurring");
  assert.equal(def.recurrence.weekday, "monday");
  assert.equal(def.featured[0].start_local, "2026-11-16T17:45");
  assert.equal(def.featured[0].end_local, "2026-11-16T19:15");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/model.test.js`
Expected: FAIL — `Cannot find module './model'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/calendar/model.js
"use strict";
const { overallSpan } = require("./datetime");

const ORIGIN = "https://wildcare.space";

function toDefinition(record, { venues }) {
  const g = record.global;
  const sc = g.schedule || {};
  const venueRef = g.venue;
  const venue = venues[venueRef];
  if (!venue) throw new Error("unknown venue: " + venueRef);

  const intended = g.intended_locales || Object.keys(record.locales || {});
  const primaryLocale = intended[0];

  const def = {
    id: g.id,
    route: g.route,
    type: g.event_type ? "event" : sc.mode === "recurring" ? "montagskurs" : "workshop",
    mode: sc.mode,
    eventStatus: sc.event_status || "scheduled",
    availability: (g.registration && g.registration.availability) || "available",
    previousStart: sc.previous_start_local || null,
    updatedAt: g.updated_at,
    primaryLocale,
    venue,
    registrationUrl: (g.registration && g.registration.url) || null,
    image: g.image || null,
    locales: record.locales || {},
  };

  if (sc.mode === "dates") {
    def.sessions = (sc.sessions || []).map((s) => ({
      id: s.id,
      start_local: s.start_local,
      end_local: s.end_local,
      status: s.status || def.eventStatus,
      uid: `${g.id}-${s.id}@wildcare.space`,
    }));
    def.span = overallSpan(def.sessions);
  } else if (sc.mode === "recurring") {
    def.recurrence = sc.recurrence;
    def.featured = (sc.featured_occurrences || []).map((f) => ({
      id: f.id,
      teacher: f.teacher || null,
      start_local: `${f.id}T${sc.recurrence.start_time}`,
      end_local: `${f.id}T${sc.recurrence.end_time}`,
    }));
  }
  return def;
}

module.exports = { toDefinition, ORIGIN };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/model.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/model.js lib/calendar/model.test.js
git commit lib/calendar/model.js lib/calendar/model.test.js -m "feat(calendar): normalize records into CalendarDefinition"
```

---

