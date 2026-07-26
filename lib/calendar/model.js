"use strict";
const { overallSpan } = require("./datetime");

const ORIGIN = "https://wildcare.space";

function toDefinition(record, { venues }) {
  const g = record.global;
  const sc = g.schedule || {};
  const venueRef = g.venue;
  const venue = venues[venueRef];
  if (!venue) throw new Error("unknown venue: " + venueRef);

  const intended = g.intended_locales || Object.keys(record.locales || {});
  const primaryLocale = intended[0];

  const def = {
    id: g.id,
    route: g.route,
    type: g.event_type ? "event" : sc.mode === "recurring" ? "montagskurs" : "workshop",
    mode: sc.mode,
    eventStatus: sc.event_status || "scheduled",
    availability: (g.registration && g.registration.availability) || "available",
    previousStart: sc.previous_start_local || null,
    updatedAt: g.updated_at,
    primaryLocale,
    venue,
    registrationUrl: (g.registration && g.registration.url) || null,
    image: g.image || null,
    locales: record.locales || {},
  };

  if (sc.mode === "dates") {
    def.sessions = (sc.sessions || []).map((s) => ({
      id: s.id,
      start_local: s.start_local,
      end_local: s.end_local,
      status: s.status || def.eventStatus,
      uid: `${g.id}-${s.id}@wildcare.space`,
    }));
    def.span = overallSpan(def.sessions);
  } else if (sc.mode === "recurring") {
    def.recurrence = sc.recurrence;
    def.featured = (sc.featured_occurrences || []).map((f) => ({
      id: f.id,
      teacher: f.teacher || null,
      start_local: `${f.id}T${sc.recurrence.start_time}`,
      end_local: `${f.id}T${sc.recurrence.end_time}`,
    }));
  }
  return def;
}

module.exports = { toDefinition, ORIGIN };
