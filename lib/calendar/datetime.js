"use strict";

function daysInMonth(year, month) {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const lengths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1];
}

function parseLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(s));
  if (!m) throw new Error("invalid local datetime: " + s);
  const [, y, mo, d, h, mi, sec] = m;
  const year = Number(y), month = Number(mo), day = Number(d), hour = Number(h), min = Number(mi);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || min > 59) {
    throw new Error("invalid local datetime: " + s);
  }
  if (day > daysInMonth(year, month)) {
    throw new Error("invalid local datetime: " + s);
  }
  return { y, mo, d, h, mi, s: sec || "00" };
}

function formatIcsLocal(s) {
  const p = parseLocal(s);
  return `${p.y}${p.mo}${p.d}T${p.h}${p.mi}${p.s}`;
}

function utcParts(isoZ) {
  const dt = new Date(isoZ);
  if (Number.isNaN(dt.getTime())) throw new Error("invalid utc timestamp: " + isoZ);
  const p = (n) => String(n).padStart(2, "0");
  return {
    Y: dt.getUTCFullYear(), M: p(dt.getUTCMonth() + 1), D: p(dt.getUTCDate()),
    h: p(dt.getUTCHours()), m: p(dt.getUTCMinutes()), s: p(dt.getUTCSeconds()),
  };
}

function formatUtcStamp(isoZ) {
  const t = utcParts(isoZ);
  return `${t.Y}${t.M}${t.D}T${t.h}${t.m}${t.s}Z`;
}

function sequenceFromUpdatedAt(isoZ) {
  const t = utcParts(isoZ);
  return Number(`${t.Y}${t.M}${t.D}${t.h}${t.m}`);
}

function overallSpan(sessions) {
  const starts = sessions.map((s) => s.start_local).sort();
  const ends = sessions.map((s) => s.end_local).sort();
  return { start: starts[0], end: ends[ends.length - 1] };
}

module.exports = { parseLocal, formatIcsLocal, formatUtcStamp, sequenceFromUpdatedAt, overallSpan };
