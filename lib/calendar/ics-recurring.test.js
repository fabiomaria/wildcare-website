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
