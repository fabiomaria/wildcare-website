// lib/calendar/format.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { formatDateRange, formatRecurring, formatNextOccurrence } = require("./format");

test("formatDateRange (en) renders a multi-day range", () => {
  assert.equal(formatDateRange("2026-10-09T19:00", "2026-10-11T19:00", "en"), "9–11 October 2026");
});

test("formatDateRange (en) collapses a single day", () => {
  assert.equal(formatDateRange("2026-10-09T19:00", "2026-10-09T21:00", "en"), "9 October 2026");
});

test("formatDateRange (de) renders German month names", () => {
  assert.equal(formatDateRange("2026-10-09T19:00", "2026-10-11T19:00", "de"), "9.–11. Oktober 2026");
});

test("formatRecurring renders the weekly phrase per locale", () => {
  const rec = { weekday: "monday", start_time: "17:45", end_time: "19:15" };
  assert.equal(formatRecurring(rec, "de"), "Jeden Montag, 17:45–19:15");
  assert.equal(formatRecurring(rec, "en"), "Every Monday, 17:45–19:15");
});

test("formatNextOccurrence (de) prefixes the weekday name onto a single date", () => {
  assert.equal(formatNextOccurrence("monday", "2026-11-16T17:45", "de"), "Montag, 16. November 2026");
});

test("formatNextOccurrence (en) prefixes the weekday name onto a single date", () => {
  assert.equal(formatNextOccurrence("monday", "2026-11-16T17:45", "en"), "Monday, 16 November 2026");
});
