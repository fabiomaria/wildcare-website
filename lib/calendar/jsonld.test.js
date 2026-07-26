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
