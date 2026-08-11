"use strict";

const DEFAULT_TIME_ZONE = "Europe/Vienna";

function localMinute(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

function finalSessionEnd(schedule) {
  if (schedule?.mode !== "dates" || !Array.isArray(schedule.sessions)) return null;
  const ends = schedule.sessions
    .map((session) => session?.end_local)
    .filter((value) => typeof value === "string" && value.length > 0)
    .sort();
  return ends.at(-1) || null;
}

function deriveDatedStatus(configuredStatus, schedule, nowLocal = localMinute()) {
  if (["draft", "unlisted", "past"].includes(configuredStatus)) return configuredStatus;
  const end = finalSessionEnd(schedule);
  return end && end <= nowLocal ? "past" : configuredStatus;
}

// Kept as an alias for existing callers while dated events and workshops share
// the same lifecycle rule.
const deriveWorkshopStatus = deriveDatedStatus;

module.exports = { DEFAULT_TIME_ZONE, localMinute, finalSessionEnd, deriveDatedStatus, deriveWorkshopStatus };
