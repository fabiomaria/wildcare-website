"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { expandRecurrence, rruleString, exdateLocals, firstOccurrenceLocal } = require("./expand");

const REC = { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", except: ["2026-01-19"] };

test("expandRecurrence lists Mondays in range and skips except dates", () => {
  const occ = expandRecurrence(REC, { from: "2026-01-01", to: "2026-02-01" });
  const dates = occ.map((o) => o.date);
  assert.deepEqual(dates, ["2026-01-05", "2026-01-12", "2026-01-26"]); // 19th excluded
  assert.equal(occ[0].start_local, "2026-01-05T17:45");
  assert.equal(occ[0].end_local, "2026-01-05T19:15");
});

test("expandRecurrence starts no earlier than the anchor", () => {
  const occ = expandRecurrence(REC, { from: "2025-12-01", to: "2026-01-10" });
  assert.deepEqual(occ.map((o) => o.date), ["2026-01-05"]);
});

test("rruleString and firstOccurrenceLocal", () => {
  assert.equal(rruleString(REC), "FREQ=WEEKLY;BYDAY=MO");
  assert.deepEqual(firstOccurrenceLocal(REC), { start_local: "2026-01-05T17:45", end_local: "2026-01-05T19:15" });
});

test("exdateLocals renders excluded occurrences at the series time", () => {
  assert.deepEqual(exdateLocals(REC), ["2026-01-19T17:45"]);
});
