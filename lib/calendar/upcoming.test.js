// lib/calendar/upcoming.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { selectUpcomingItems } = require("./upcoming");

const venue = { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" };

function workshopDef(id, sessions, overrides) {
  return Object.assign({
    id, type: "workshop", mode: "dates", eventStatus: "scheduled",
    venue, locales: { de: { title: id }, en: { title: id } },
    route: `/${id}`,
    sessions,
    span: { start: sessions[0].start_local, end: sessions[sessions.length - 1].end_local },
  }, overrides);
}

function montagskursDef(overrides) {
  return Object.assign({
    id: "montagskurs", type: "montagskurs", mode: "recurring", eventStatus: "scheduled",
    venue, locales: {}, route: "/montagskurs",
    recurrence: { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", horizon_months: 6, except: [] },
    featured: [],
  }, overrides);
}

test("skips a cancelled definition", () => {
  const def = workshopDef("a", [{ start_local: "2026-09-01T18:00", end_local: "2026-09-01T20:00" }], { eventStatus: "cancelled" });
  const result = selectUpcomingItems([def], { nowLocal: "2026-08-01T00:00", statusById: new Map([["a", { status: "upcoming", includable: true }]]) });
  assert.deepEqual(result, []);
});

test("skips a draft-status definition even with future dates", () => {
  const def = workshopDef("a", [{ start_local: "2026-09-01T18:00", end_local: "2026-09-01T20:00" }]);
  const result = selectUpcomingItems([def], { nowLocal: "2026-08-01T00:00", statusById: new Map([["a", { status: "draft", includable: true }]]) });
  assert.deepEqual(result, []);
});

test("skips an unlisted-status definition", () => {
  const def = workshopDef("a", [{ start_local: "2026-09-01T18:00", end_local: "2026-09-01T20:00" }]);
  const result = selectUpcomingItems([def], { nowLocal: "2026-08-01T00:00", statusById: new Map([["a", { status: "unlisted", includable: true }]]) });
  assert.deepEqual(result, []);
});

test("skips a workshop with no buildable detail page (includable: false)", () => {
  const def = workshopDef("a", [{ start_local: "2026-09-01T18:00", end_local: "2026-09-01T20:00" }]);
  const result = selectUpcomingItems([def], { nowLocal: "2026-08-01T00:00", statusById: new Map([["a", { status: "upcoming", includable: false }]]) });
  assert.deepEqual(result, []);
});

test("skips a dates-mode definition whose last session has already ended", () => {
  const def = workshopDef("a", [{ start_local: "2026-07-01T18:00", end_local: "2026-07-01T20:00" }]);
  const result = selectUpcomingItems([def], { nowLocal: "2026-08-01T00:00", statusById: new Map([["a", { status: "past", includable: true }]]) });
  assert.deepEqual(result, []);
});

test("keeps a dates-mode definition that is currently in progress", () => {
  const def = workshopDef("a", [
    { start_local: "2026-08-08T10:00", end_local: "2026-08-08T13:00" },
    { start_local: "2026-08-09T17:00", end_local: "2026-08-09T20:00" },
  ]);
  const result = selectUpcomingItems([def], { nowLocal: "2026-08-09T12:00", statusById: new Map([["a", { status: "current", includable: true }]]) });
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, "workshop");
});

test("recurring mode: plain Montagskurs when the next occurrence is not featured", () => {
  const def = montagskursDef();
  const statusById = new Map([["montagskurs", { status: "published", includable: true }]]);
  const result = selectUpcomingItems([def], { nowLocal: "2026-08-01T00:00", statusById });
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, "montagskurs");
  assert.equal(result[0].occurrence.date, "2026-08-03");
});

test("recurring mode: featured Montagskurs when the next occurrence matches a featured date", () => {
  const def = montagskursDef({ featured: [{ id: "2026-08-03", teacher: "Guest Name" }] });
  const statusById = new Map([["montagskurs", { status: "published", includable: true }]]);
  const result = selectUpcomingItems([def], { nowLocal: "2026-08-01T00:00", statusById });
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, "featured");
  assert.equal(result[0].occurrence.teacher, "Guest Name");
});

test("recurring mode never produces two Montagskurs entries for one definition", () => {
  const def = montagskursDef({ featured: [{ id: "2026-08-03", teacher: "Guest Name" }] });
  const statusById = new Map([["montagskurs", { status: "published", includable: true }]]);
  const result = selectUpcomingItems([def], { nowLocal: "2026-08-01T00:00", statusById });
  assert.equal(result.filter((item) => item.def.id === "montagskurs").length, 1);
});

test("sorts ascending by chronological key and caps at limit", () => {
  const defs = [
    workshopDef("late", [{ start_local: "2026-10-01T10:00", end_local: "2026-10-01T12:00" }]),
    workshopDef("early", [{ start_local: "2026-09-01T10:00", end_local: "2026-09-01T12:00" }]),
    workshopDef("middle", [{ start_local: "2026-09-15T10:00", end_local: "2026-09-15T12:00" }]),
  ];
  const statusById = new Map(defs.map((d) => [d.id, { status: "upcoming", includable: true }]));
  const result = selectUpcomingItems(defs, { nowLocal: "2026-08-01T00:00", statusById, limit: 2 });
  assert.deepEqual(result.map((item) => item.def.id), ["early", "middle"]);
});
