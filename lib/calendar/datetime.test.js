// lib/calendar/datetime.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { formatIcsLocal, formatUtcStamp, sequenceFromUpdatedAt, overallSpan, parseLocal } = require("./datetime");

test("formatIcsLocal pads seconds and strips separators (floating, no Z)", () => {
  assert.equal(formatIcsLocal("2026-10-09T19:00"), "20261009T190000");
  assert.equal(formatIcsLocal("2026-10-09T19:00:30"), "20261009T190030");
});

test("parseLocal throws on malformed input", () => {
  assert.throws(() => parseLocal("2026-13-09 19:00"), /invalid local datetime/);
});

test("formatUtcStamp renders a UTC basic-format stamp with Z", () => {
  assert.equal(formatUtcStamp("2026-07-26T10:00:00Z"), "20260726T100000Z");
});

test("sequenceFromUpdatedAt yields a monotonic YYYYMMDDHHMM integer", () => {
  assert.equal(sequenceFromUpdatedAt("2026-07-26T10:05:00Z"), 202607261005);
  assert.ok(sequenceFromUpdatedAt("2026-07-26T10:06:00Z") > sequenceFromUpdatedAt("2026-07-26T10:05:00Z"));
});

test("overallSpan returns earliest start and latest end", () => {
  const span = overallSpan([
    { start_local: "2026-10-10T18:30", end_local: "2026-10-10T21:00" },
    { start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00" },
    { start_local: "2026-10-11T16:00", end_local: "2026-10-11T19:00" },
  ]);
  assert.deepEqual(span, { start: "2026-10-09T19:00", end: "2026-10-11T19:00" });
});
