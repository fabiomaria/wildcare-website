// lib/calendar/format.js
"use strict";
const { parseLocal } = require("./datetime");

const LOCALE_TAG = { de: "de-AT", en: "en-GB" };
const WEEKDAY = {
  de: { monday: "Montag", tuesday: "Dienstag", wednesday: "Mittwoch", thursday: "Donnerstag", friday: "Freitag", saturday: "Samstag", sunday: "Sonntag" },
  en: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" },
};

function toUtcDate(local) {
  const p = parseLocal(local);
  return new Date(Date.UTC(Number(p.y), Number(p.mo) - 1, Number(p.d)));
}

function formatDateRange(startLocal, endLocal, locale) {
  const dtf = new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  const a = toUtcDate(startLocal);
  const b = toUtcDate(endLocal);
  if (a.getTime() === b.getTime()) return dtf.format(a);
  return dtf.formatRange(a, b);
}

function formatRecurring(recurrence, locale) {
  const every = locale === "de" ? "Jeden" : "Every";
  const day = WEEKDAY[locale][recurrence.weekday];
  return `${every} ${day}, ${recurrence.start_time}–${recurrence.end_time}`;
}

function formatNextOccurrence(weekday, dateLocal, locale) {
  const day = WEEKDAY[locale][weekday];
  return `${day}, ${formatDateRange(dateLocal, dateLocal, locale)}`;
}

module.exports = { formatDateRange, formatRecurring, formatNextOccurrence };
