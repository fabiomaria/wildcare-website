"use strict";

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { finalSessionEnd, localMinute } = require("../lib/calendar/lifecycle");

// Sveltia 0.171.1 saves the regex itself in view preferences. If a daily build
// changes it, the stock client silently ignores the stale filter and shows all
// entries. Reset obsolete preferences to the configured default. Apply only to
// the deployed copy, with an exact-match guard for future vendor upgrades.
function refreshStaleFilters(source) {
  const before = 'filters:e.filters??(r?[r]:void 0)';
  const after = 'filters:e.filters?.some(f=>!n.some(o=>o.field===f.field&&String(o.pattern)===String(f.pattern)))?(r?[r]:[]):e.filters??(r?[r]:void 0)';
  if (source.split(before).length !== 2) throw new Error("Review Sveltia archive-filter compatibility patch after CMS upgrade");
  return source.replace(before, after);
}

function eventViews(records, now = localMinute()) {
  const ids = records.filter(({ global: g }) => {
    const end = finalSessionEnd(g?.schedule);
    return g?.status === "past" || (end && end <= now);
  }).map(({ global: g }) => String(g.id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const past = ids.length ? `^(?:${ids.join("|")})$` : "(?!)";
  return {
    filters: [
      { name: "upcoming", label: "Upcoming", field: "global.id", pattern: `^(?!${past}).*$` },
      { name: "past", label: "Past events", field: "global.id", pattern: past },
    ],
    default: "upcoming",
  };
}

// Generate only the deployed config. Source records and their language filters
// stay untouched. The existing daily Pages build refreshes the archive views.
function writeCmsEventViews(outputDir, root = process.cwd()) {
  const read = (file) => yaml.load(fs.readFileSync(file, "utf8"), { schema: yaml.CORE_SCHEMA });
  const config = read(path.join(root, "admin/config.yml"));
  for (const collection of config.collections) {
    if (!["events", "workshops_de", "workshops_en"].includes(collection.name)) continue;
    const folder = path.join(root, collection.folder);
    const records = fs.readdirSync(folder).filter((name) => /\.ya?ml$/.test(name))
      .map((name) => read(path.join(folder, name)));
    collection.view_filters = eventViews(records);
  }
  fs.mkdirSync(path.join(outputDir, "admin"), { recursive: true });
  fs.writeFileSync(path.join(outputDir, "admin/config.yml"), yaml.dump(config, { lineWidth: -1, noRefs: true }));
  const vendor = "sveltia-cms-0.171.1.js";
  fs.writeFileSync(path.join(outputDir, "admin", vendor), refreshStaleFilters(fs.readFileSync(path.join(root, "admin", vendor), "utf8")));
}

module.exports = { eventViews, writeCmsEventViews, refreshStaleFilters };
