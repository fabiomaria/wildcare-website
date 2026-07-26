"use strict";

const WEEKDAY_NUM = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const WEEKDAY_ICS = { monday: "MO", tuesday: "TU", wednesday: "WE", thursday: "TH", friday: "FR", saturday: "SA", sunday: "SU" };

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function firstOnOrAfter(startMs, weekdayNum) {
  const d = new Date(startMs);
  while (d.getUTCDay() !== weekdayNum) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function expandRecurrence(recurrence, { from, to }) {
  const target = WEEKDAY_NUM[recurrence.weekday];
  const anchorMs = Date.parse(recurrence.anchor + "T00:00:00Z");
  const fromMs = Date.parse(from + "T00:00:00Z");
  const toMs = Date.parse(to + "T00:00:00Z");
  const except = new Set(recurrence.except || []);
  const start = firstOnOrAfter(Math.max(anchorMs, fromMs), target);
  const out = [];
  for (const d = new Date(start); d.getTime() <= toMs; d.setUTCDate(d.getUTCDate() + 7)) {
    const date = isoDate(d);
    if (except.has(date)) continue;
    out.push({ date, start_local: `${date}T${recurrence.start_time}`, end_local: `${date}T${recurrence.end_time}` });
  }
  return out;
}

function rruleString(recurrence) {
  return `FREQ=WEEKLY;BYDAY=${WEEKDAY_ICS[recurrence.weekday]}`;
}

function exdateLocals(recurrence) {
  return (recurrence.except || []).map((date) => `${date}T${recurrence.start_time}`);
}

function firstOccurrenceLocal(recurrence) {
  const target = WEEKDAY_NUM[recurrence.weekday];
  const d = firstOnOrAfter(Date.parse(recurrence.anchor + "T00:00:00Z"), target);
  const date = isoDate(d);
  return { start_local: `${date}T${recurrence.start_time}`, end_local: `${date}T${recurrence.end_time}` };
}

module.exports = { WEEKDAY_ICS, expandRecurrence, rruleString, exdateLocals, firstOccurrenceLocal };
