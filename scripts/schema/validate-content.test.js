"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateRecord } = require("./validate-content");
const { normalizeCalendarRecord, parseYaml } = require("./lib");
const yaml = require("js-yaml");
const fs = require("node:fs");
const path = require("node:path");
const registry = require("../../schema/content-schema-v2.registry.json");

const FX = path.join(__dirname, "../../migration/fixtures/content-v2");
const load = (f) => yaml.load(fs.readFileSync(path.join(FX, f), "utf8"));
const venueIds = new Set(["orpheumgasse", "fixture-venue"]);
const run = (file, type) => validateRecord(load(file), { type, registry, venueIds });

test("valid dates-mode schedule passes", () => assert.deepEqual(run("valid-schedule-dates.yaml", "workshop").errors, []));
test("valid recurring-mode schedule passes", () => assert.deepEqual(run("valid-schedule-recurring.yaml", "workshop").errors, []));
test("explicit timestamp values are rejected", () => assert.ok(run("invalid-schedule-unquoted-datetime.yaml", "workshop").errors.some((e) => /start_local.*floating-local string/.test(e))));
test("start_at mismatch is rejected", () => assert.ok(run("invalid-schedule-start-at-mismatch.yaml", "workshop").errors.some((e) => /start_at.*earliest session/.test(e))));
test("orphan featured note is rejected", () => assert.ok(run("invalid-schedule-orphan-featured-note.yaml", "workshop").errors.some((e) => /featured_occurrences.*not in global list/.test(e))));
test("orphan venue is rejected", () => assert.ok(run("invalid-event-orphan-venue.yaml", "event").errors.some((e) => /unknown venue.*nowhere/.test(e))));
test("valid event passes", () => assert.deepEqual(run("valid-event.yaml", "event").errors, []));
test("locale-neutral venue passes", () => assert.deepEqual(run("valid-venue.yaml", "venue").errors, []));
test("venue missing city is rejected", () => assert.ok(run("invalid-venue-missing-city.yaml", "venue").errors.some((e) => /city/.test(e))));
test("scheduled records require a venue", () => {
  const record = {
    schema_version: 2,
    global: { id: "no-venue", intended_locales: ["en"], status: "upcoming", route: "/events/no-venue", schedule: { mode: "dates", sessions: [] } },
    locales: { en: { title: "No Venue" } },
  };
  assert.ok(validateRecord(record, { type: "event", registry, venueIds }).errors.some((e) => /global\.venue is required/.test(e)));
});

test("CMS datetime output is normalized before validation", () => {
  const record = {
    schema_version: 2,
    global: {
      id: "cms-event",
      intended_locales: ["en"],
      status: "upcoming",
      route: "/events/cms-event",
      venue: "fixture-venue",
      schedule: {
        event_status: "scheduled",
        mode: "dates",
        sessions: [{ id: "session", start_local: "2026-08-10 17:30", end_local: "2026-08-10 19:00" }],
      },
    },
    locales: { en: { title: "CMS Event", summary: "Normalized CMS output." } },
  };
  const normalized = normalizeCalendarRecord(record);
  assert.equal(normalized.global.schedule.sessions[0].start_local, "2026-08-10T17:30");
  assert.equal(normalized.global.schedule.sessions[0].end_local, "2026-08-10T19:00");
  assert.equal(normalized.global.start_at, "2026-08-10T17:30:00.000Z");
  assert.equal(normalized.global.updated_at, "2026-08-10T17:30:00.000Z");
  assert.deepEqual(validateRecord(record, { type: "event", registry, venueIds }).errors, []);
});

test("CMS YAML 1.2 calendar dates remain strings without quotes", () => {
  const record = parseYaml(`
schema_version: 2
global:
  id: cms-recurring
  intended_locales: [en]
  status: upcoming
  route: /cms-recurring
  venue: fixture-venue
  schedule:
    event_status: scheduled
    mode: recurring
    recurrence:
      weekday: monday
      start_time: 17:45
      end_time: 19:15
      anchor: 2026-01-05
      horizon_months: 6
    overrides:
      - date: 2026-09-07
        status: cancelled
locales:
  en: { title: CMS recurring, summary: Saved through the calendar widget. }
`);

  assert.equal(typeof record.global.schedule.recurrence.anchor, "string");
  assert.equal(typeof record.global.schedule.overrides[0].date, "string");
  assert.deepEqual(validateRecord(record, { type: "workshop", registry, venueIds }).errors, []);
});
