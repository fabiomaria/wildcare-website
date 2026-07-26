"use strict";
const { escapeText, assemble } = require("./text");
const { formatIcsLocal, formatUtcStamp, sequenceFromUpdatedAt } = require("./datetime");

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

module.exports = { venueSummaryLine, eventVevents, buildCalendar, perEventCalendar };
