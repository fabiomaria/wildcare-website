"use strict";
const { escapeText, assemble } = require("./text");
const { formatIcsLocal, formatUtcStamp, sequenceFromUpdatedAt } = require("./datetime");
const { rruleString, exdateLocals, firstOccurrenceLocal } = require("./expand");

const ORIGIN = "https://wildcare.space";
const PRODID = "-//Wild Care//Calendar//EN";
const ICS_STATUS = { scheduled: "CONFIRMED", cancelled: "CANCELLED", postponed: "TENTATIVE", rescheduled: "TENTATIVE", moved_online: "CONFIRMED" };

function venueSummaryLine(v) {
  return `${v.name}, ${v.street}, ${v.postal_code} ${v.city}`;
}

function descriptionFor(def, locale) {
  const l = def.locales[locale] || {};
  const parts = [];
  if (l.summary) parts.push(l.summary);
  if (def.registrationUrl) parts.push(`Anmeldung / Registration: ${def.registrationUrl}`);
  return parts.join("\n");
}

function eventVevents(def) {
  const stamp = formatUtcStamp(def.updatedAt);
  const seq = sequenceFromUpdatedAt(def.updatedAt);
  const title = (def.locales[def.primaryLocale] || {}).title || def.id;
  const location = venueSummaryLine(def.venue);
  const description = descriptionFor(def, def.primaryLocale);
  return def.sessions.map((s) => {
    const lines = [
      "BEGIN:VEVENT",
      `UID:${s.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsLocal(s.start_local)}`,
      `DTEND:${formatIcsLocal(s.end_local)}`,
      `SUMMARY:${escapeText(title)}`,
      `LOCATION:${escapeText(location)}`,
    ];
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push(`URL:${ORIGIN}${def.route}`);
    lines.push(`STATUS:${ICS_STATUS[s.status] || "CONFIRMED"}`);
    lines.push(`SEQUENCE:${seq}`);
    lines.push(`LAST-MODIFIED:${stamp}`);
    lines.push("END:VEVENT");
    return lines;
  });
}

function buildCalendar(vevents) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${PRODID}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const block of vevents) lines.push(...block);
  lines.push("END:VCALENDAR");
  return assemble(lines);
}

function perEventCalendar(def) {
  return buildCalendar(eventVevents(def));
}

function recurringVevents(def) {
  const stamp = formatUtcStamp(def.updatedAt);
  const seq = sequenceFromUpdatedAt(def.updatedAt);
  const title = (def.locales[def.primaryLocale] || {}).title || def.id;
  const location = venueSummaryLine(def.venue);
  const uid = `${def.id}@wildcare.space`;
  const first = firstOccurrenceLocal(def.recurrence);

  const series = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsLocal(first.start_local)}`,
    `DTEND:${formatIcsLocal(first.end_local)}`,
    `RRULE:${rruleString(def.recurrence)}`,
  ];
  const exdates = exdateLocals(def.recurrence);
  if (exdates.length) series.push(`EXDATE:${exdates.map(formatIcsLocal).join(",")}`);
  series.push(`SUMMARY:${escapeText(title)}`);
  series.push(`LOCATION:${escapeText(location)}`);
  series.push(`URL:${ORIGIN}${def.route}`);
  series.push(`STATUS:${ICS_STATUS[def.eventStatus] || "CONFIRMED"}`);
  series.push(`SEQUENCE:${seq}`);
  series.push(`LAST-MODIFIED:${stamp}`);
  series.push("END:VEVENT");

  const blocks = [series];
  for (const f of def.featured || []) {
    const summary = f.teacher ? `${title} — ${f.teacher}` : title;
    blocks.push([
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `RECURRENCE-ID:${formatIcsLocal(f.start_local)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsLocal(f.start_local)}`,
      `DTEND:${formatIcsLocal(f.end_local)}`,
      `SUMMARY:${escapeText(summary)}`,
      `LOCATION:${escapeText(location)}`,
      `URL:${ORIGIN}${def.route}/${f.id}`,
      `STATUS:CONFIRMED`,
      `SEQUENCE:${seq}`,
      `LAST-MODIFIED:${stamp}`,
      "END:VEVENT",
    ]);
  }
  return blocks;
}

function masterFeed(defs) {
  const vevents = [];
  for (const def of defs) {
    if (def.mode === "recurring") vevents.push(...recurringVevents(def));
    else vevents.push(...eventVevents(def));
  }
  return buildCalendar(vevents);
}

module.exports = { venueSummaryLine, eventVevents, buildCalendar, perEventCalendar, recurringVevents, masterFeed };
