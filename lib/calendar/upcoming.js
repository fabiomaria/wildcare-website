// lib/calendar/upcoming.js
"use strict";
const { expandRecurrence } = require("./expand");

function addDaysIso(dateIso, days) {
  const d = new Date(dateIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function selectUpcomingItems(definitions, { nowLocal, statusById, limit = 6 }) {
  const todayIso = nowLocal.slice(0, 10);
  const horizonIso = addDaysIso(todayIso, 60);
  const candidates = [];

  for (const def of definitions) {
    if (def.eventStatus === "cancelled") continue;
    const meta = statusById.get(def.id);
    if (!meta) continue;
    if (meta.status === "draft" || meta.status === "unlisted") continue;
    if (meta.includable === false) continue;

    if (def.mode === "dates") {
      if (def.span.end < nowLocal) continue;
      candidates.push({ def, kind: def.type, occurrence: null, sortKey: def.span.start });
    } else if (def.mode === "recurring") {
      const next = expandRecurrence(def.recurrence, { from: todayIso, to: horizonIso })[0];
      if (!next) continue;
      const featured = (def.featured || []).find((f) => f.id === next.date);
      candidates.push({
        def,
        kind: featured ? "featured" : "montagskurs",
        occurrence: featured || next,
        sortKey: next.start_local,
      });
    }
  }

  candidates.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
  return candidates.slice(0, limit);
}

module.exports = { selectUpcomingItems };
