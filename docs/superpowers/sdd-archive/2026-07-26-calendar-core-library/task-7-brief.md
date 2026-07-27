### Task 7: `jsonld.js` (schema.org Event / eventSchedule)

**Files:**
- Create: `lib/calendar/jsonld.js`
- Test: `lib/calendar/jsonld.test.js`

**Interfaces:**
- Consumes: `CalendarDefinition` (from `model.js`).
- Produces:
  - `eventJsonLd(def, {locale}): object` — dates-mode `Event` with `startDate`/`endDate` (floating local, no offset).
  - `recurringJsonLd(def, {locale}): object` — `Event` with `eventSchedule`, NO `startDate`/`endDate`.

- [ ] **Step 1: Write the failing test**

```js
// lib/calendar/jsonld.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { eventJsonLd, recurringJsonLd } = require("./jsonld");

const VENUE = { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" };

test("eventJsonLd emits floating-local start/end, place, offer, status", () => {
  const def = {
    route: "/how-we-move-together", eventStatus: "scheduled", availability: "available",
    span: { start: "2026-10-09T19:00", end: "2026-10-11T19:00" }, venue: VENUE,
    registrationUrl: "https://tally.so/r/ABC", image: "/assets/x.webp", previousStart: null,
    locales: { en: { title: "How We Move Together", summary: "A CI workshop." } },
  };
  const ld = eventJsonLd(def, { locale: "en" });
  assert.equal(ld["@type"], "Event");
  assert.equal(ld.startDate, "2026-10-09T19:00");
  assert.equal(ld.endDate, "2026-10-11T19:00");
  assert.equal(ld.eventStatus, "https://schema.org/EventScheduled");
  assert.equal(ld.location.name, "Orpheumgasse Studio");
  assert.equal(ld.location.address.postalCode, "8010");
  assert.equal(ld.offers.availability, "https://schema.org/InStock");
  assert.equal(ld.url, "https://wildcare.space/how-we-move-together");
});

test("eventJsonLd includes previousStartDate when rescheduled", () => {
  const def = {
    route: "/x", eventStatus: "rescheduled", availability: "available",
    span: { start: "2026-10-09T19:00", end: "2026-10-09T21:00" }, venue: VENUE,
    registrationUrl: null, image: null, previousStart: "2026-09-01T19:00",
    locales: { en: { title: "X" } },
  };
  const ld = eventJsonLd(def, { locale: "en" });
  assert.equal(ld.eventStatus, "https://schema.org/EventRescheduled");
  assert.equal(ld.previousStartDate, "2026-09-01T19:00");
});

test("recurringJsonLd uses eventSchedule and omits startDate/endDate", () => {
  const def = {
    route: "/montagskurs", eventStatus: "scheduled", venue: VENUE,
    recurrence: { weekday: "monday", start_time: "17:45", end_time: "19:15" },
    locales: { de: { title: "Montagskurs" } },
  };
  const ld = recurringJsonLd(def, { locale: "de" });
  assert.equal(ld.eventSchedule.repeatFrequency, "P1W");
  assert.equal(ld.eventSchedule.byDay, "https://schema.org/Monday");
  assert.equal(ld.eventSchedule.startTime, "17:45");
  assert.ok(!("startDate" in ld), "must omit startDate for eventSchedule");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/jsonld.test.js`
Expected: FAIL — `Cannot find module './jsonld'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/calendar/jsonld.js
"use strict";
const ORIGIN = "https://wildcare.space";
const SCHEMA = "https://schema.org/";

const STATUS = { scheduled: "EventScheduled", cancelled: "EventCancelled", postponed: "EventPostponed", rescheduled: "EventRescheduled", moved_online: "EventMovedOnline" };
const AVAIL = { available: "InStock", sold_out: "SoldOut", waitlist: "PreOrder", unavailable: "OutOfStock" };
const BYDAY = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

function statusUrl(s) { return SCHEMA + (STATUS[s] || "EventScheduled"); }
function availUrl(a) { return SCHEMA + (AVAIL[a] || "InStock"); }
function placeOf(v) {
  return { "@type": "Place", name: v.name, address: { "@type": "PostalAddress", streetAddress: v.street, postalCode: v.postal_code, addressLocality: v.city, addressCountry: v.country } };
}
function organizer() { return { "@type": "Organization", name: "Wild Care", url: ORIGIN }; }

function base(def, locale) {
  const l = def.locales[locale] || {};
  const obj = {
    "@context": "https://schema.org", "@type": "Event",
    name: l.title,
    eventStatus: statusUrl(def.eventStatus),
    eventAttendanceMode: SCHEMA + "OfflineEventAttendanceMode",
    location: placeOf(def.venue),
    organizer: organizer(),
    url: ORIGIN + def.route,
  };
  if (l.summary) obj.description = l.summary;
  if (def.image) obj.image = def.image;
  return obj;
}

function eventJsonLd(def, { locale }) {
  const obj = base(def, locale);
  obj.startDate = def.span.start;
  obj.endDate = def.span.end;
  if (def.eventStatus === "rescheduled" && def.previousStart) obj.previousStartDate = def.previousStart;
  if (def.registrationUrl) obj.offers = { "@type": "Offer", url: def.registrationUrl, availability: availUrl(def.availability) };
  return obj;
}

function recurringJsonLd(def, { locale }) {
  const obj = base(def, locale);
  obj.eventSchedule = {
    "@type": "Schedule", repeatFrequency: "P1W",
    byDay: SCHEMA + BYDAY[def.recurrence.weekday],
    startTime: def.recurrence.start_time, endTime: def.recurrence.end_time,
  };
  return obj;
}

module.exports = { eventJsonLd, recurringJsonLd };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/jsonld.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/jsonld.js lib/calendar/jsonld.test.js
git commit lib/calendar/jsonld.js lib/calendar/jsonld.test.js -m "feat(calendar): schema.org Event/eventSchedule JSON-LD"
```

---

