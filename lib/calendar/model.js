"use strict";
const { overallSpan } = require("./datetime");

const ORIGIN = "https://wildcare.space";

function toDefinition(record, { venues }) {
  const g = record.global;
  const sc = g.schedule || {};
  const type = g.event_type ? "event" : sc.mode === "recurring" ? "montagskurs" : "workshop";
  const venueRef = g.venue;
  const venue = venues[venueRef];
  if (!venue) throw new Error("unknown venue: " + venueRef);

  const intended = g.intended_locales || Object.keys(record.locales || {});
  const primaryLocale = intended[0];

  const def = {
    id: g.id,
    route: g.route || (type === "event" ? `/events/${g.id}` : `/${g.id}`),
    type,
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
      label: s.label || null,
      start_local: s.start_local,
      end_local: s.end_local,
      status: s.status || def.eventStatus,
      uid: `${g.id}-${s.id}@wildcare.space`,
    }));
    def.span = overallSpan(def.sessions);
  } else if (sc.mode === "recurring") {
    const recurrence = sc.recurrence || {};
    const legacyFeatured = (sc.featured_occurrences || []).map((item) => ({
      date: item.id,
      teacher: item.teacher,
      note_de: record.locales?.de?.schedule?.featured_occurrences?.[item.id]?.note || "",
      note_en: record.locales?.en?.schedule?.featured_occurrences?.[item.id]?.note || "",
    }));
    const overrides = sc.overrides || legacyFeatured;
    const cancelled = overrides.filter((item) => item.status === "cancelled").map((item) => item.date);
    def.defaultTeacher = recurrence.default_teacher || null;
    def.recurrence = {
      ...recurrence,
      except: [...new Set([...(recurrence.except || []), ...cancelled])],
    };
    def.overrides = overrides.map((item) => ({
      id: item.date,
      status: item.status || "scheduled",
      teacher: item.teacher || def.defaultTeacher,
      note_de: item.note_de || "",
      note_en: item.note_en || "",
      start_local: `${item.date}T${recurrence.start_time}`,
      end_local: `${item.date}T${recurrence.end_time}`,
    }));
    // Keep the calendar's existing featured-occurrence interface for the
    // special-date leaf pages and recurring ICS overrides.
    def.featured = def.overrides.filter((item) => item.status !== "cancelled");
  }
  return def;
}

module.exports = { toDefinition, ORIGIN };
