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

test("toDefinition maps recurring defaults and date overrides", () => {
  const rec = {
    schema_version: 2,
    global: {
      id: "montagskurs", route: "/montagskurs", intended_locales: ["de", "en"],
      venue: "orpheumgasse", updated_at: "2026-07-26T10:00:00Z",
      schedule: {
        event_status: "scheduled", mode: "recurring",
        recurrence: { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", horizon_months: 6, except: [], default_teacher: "Verena" },
        overrides: [{ date: "2026-11-16", teacher: "Guest", note_de: "Sonderabend", note_en: "Special evening" }],
      },
    },
    locales: { de: { title: "Montagskurs" }, en: { title: "Monday Class" } },
  };
  const def = toDefinition(rec, { venues: VENUES });
  assert.equal(def.mode, "recurring");
  assert.equal(def.recurrence.weekday, "monday");
  assert.equal(def.defaultTeacher, "Verena");
  assert.equal(def.overrides[0].note_de, "Sonderabend");
  assert.equal(def.featured[0].start_local, "2026-11-16T17:45");
  assert.equal(def.featured[0].end_local, "2026-11-16T19:15");
});

test("toDefinition turns cancelled overrides into recurrence exclusions", () => {
  const rec = JSON.parse(JSON.stringify(DATES_RECORD));
  rec.global.id = "montagskurs";
  rec.global.route = "/montagskurs";
  rec.global.schedule = {
    event_status: "scheduled", mode: "recurring",
    recurrence: { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", horizon_months: 6, except: ["2026-09-07"] },
    overrides: [{ date: "2026-08-17", status: "cancelled" }],
  };
  const def = toDefinition(rec, { venues: VENUES });
  assert.deepEqual(def.recurrence.except.sort(), ["2026-08-17", "2026-09-07"]);
  assert.equal(def.featured.length, 0);
});
