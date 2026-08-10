"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { deriveWorkshopStatus, finalSessionEnd, localMinute } = require("./lifecycle");

const cellularTouchSchedule = {
  mode: "dates",
  sessions: [
    { start_local: "2026-08-08T10:00", end_local: "2026-08-08T13:00" },
    { start_local: "2026-08-09T17:00", end_local: "2026-08-09T20:00" },
  ],
};

test("finds the final session end regardless of source order", () => {
  assert.equal(finalSessionEnd({
    ...cellularTouchSchedule,
    sessions: [...cellularTouchSchedule.sessions].reverse(),
  }), "2026-08-09T20:00");
});

test("moves a dated workshop to the archive after its final session", () => {
  assert.equal(deriveWorkshopStatus("current", cellularTouchSchedule, "2026-08-10T00:00"), "past");
});

test("keeps a workshop current through the end of its final session", () => {
  assert.equal(deriveWorkshopStatus("current", cellularTouchSchedule, "2026-08-09T19:59"), "current");
  assert.equal(deriveWorkshopStatus("current", cellularTouchSchedule, "2026-08-09T20:00"), "past");
});

test("does not publish draft or unlisted workshops through lifecycle automation", () => {
  assert.equal(deriveWorkshopStatus("draft", cellularTouchSchedule, "2026-08-10T00:00"), "draft");
  assert.equal(deriveWorkshopStatus("unlisted", cellularTouchSchedule, "2026-08-10T00:00"), "unlisted");
});

test("formats the build clock in Vienna local time", () => {
  assert.equal(localMinute(new Date("2026-08-09T18:00:00Z")), "2026-08-09T20:00");
});
