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
