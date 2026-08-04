"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  ROOT, contentFilesFor, isObject, parseArgs, readYaml, relative, stableJson,
  normalizeCalendarRecord,
} = require("./lib");

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_NUM = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

function getPath(value, dotted) {
  const parts = dotted.split(".");
  let current = value;
  for (const part of parts) {
    if (part === "{locale}") continue;
    if (part.endsWith("[]")) {
      const array = current?.[part.slice(0, -2)];
      return Array.isArray(array) ? array : undefined;
    }
    current = current?.[part];
  }
  return current;
}

function toLocalMinute(value) {
  return String(value instanceof Date ? value.toISOString() : value).replace("Z", "").slice(0, 16);
}

function valuesAtPath(record, fieldPath) {
  const parts = fieldPath.split(".");
  function visit(value, index) {
    if (index === parts.length) return [value];
    const part = parts[index];
    if (part === "{locale}") return Object.values(value || {}).flatMap((item) => visit(item, index + 1));
    if (part.endsWith("[]")) return (value?.[part.slice(0, -2)] || []).flatMap((item) => visit(item, index + 1));
    return visit(value?.[part], index + 1);
  }
  return visit(record, 0);
}

function validateRecord(record, { type, registry, venueIds = new Set() }) {
  record = normalizeCalendarRecord(record);
  const errors = [];
  const definition = registry.record_types[type] || { fields: [] };
  const localeNeutral = definition.locale_neutral === true;
  const add = (message) => errors.push(message);

  if (record.schema_version !== 2) add("schema_version must equal 2");
  if (!isObject(record.global)) add("global is required");
  if (!localeNeutral && !isObject(record.locales)) add("locales is required");
  for (const field of definition.fields || []) {
    if (field.required && field.class === "G") {
      if (field.path.startsWith("global.schedule.recurrence.") && record.global?.schedule?.mode !== "recurring") continue;
      if (field.path.startsWith("global.schedule.featured_occurrences") && (!Array.isArray(record.global?.schedule?.featured_occurrences) || record.global.schedule.mode !== "recurring")) continue;
      if (field.path.startsWith("global.schedule.sessions") && record.global?.schedule?.mode !== "dates") continue;
      const value = getPath(record, field.path);
      if (value === undefined || value === null || value === "") add(`${field.path} is required`);
    }
  }
  if (!localeNeutral) {
    const intended = record.global?.intended_locales || [];
    const available = Object.keys(record.locales || {}).filter((locale) => isObject(record.locales[locale]) && Object.keys(record.locales[locale]).length);
    if (stableJson(intended) !== stableJson(available)) add(`global.intended_locales: declared ${JSON.stringify(intended)}, but available locales are ${JSON.stringify(available)}`);
    for (const locale of available) {
      if (!registry.supported_locales.includes(locale)) add(`locales.${locale} is not supported`);
    }
    const statuses = registry.enums.status_by_record_type[type] || [];
    if (statuses.length && !statuses.includes(record.global?.status)) add(`global.status must be one of ${statuses.join(", ")}`);
  }

  for (const field of definition.fields || []) {
    const values = valuesAtPath(record, field.path);
    if (field.enum) for (const value of values) {
      if (value !== undefined && !registry.enums[field.enum]?.includes(value)) add(`${field.path}: invalid ${field.enum}: ${value}`);
    }
    if (field.reference?.target === "venue") {
      const ref = getPath(record, field.path);
      if (ref && !venueIds.has(ref) && field.reference.orphan === "error") add(`${field.path}: unknown venue: ${ref}`);
    }
  }

  const schedule = record.global?.schedule;
  if (schedule?.mode === "dates") {
    const sessions = schedule.sessions || [];
    const ids = new Set();
    for (const session of sessions) {
      if (!session.id) add("schedule.sessions[]: every session needs a stable id");
      if (ids.has(session.id)) add(`schedule.sessions[]: duplicate session id: ${session.id}`);
      ids.add(session.id);
      for (const key of ["start_local", "end_local"]) {
        if (typeof session[key] !== "string" || !LOCAL_DT.test(session[key])) {
          add(`schedule.sessions[].${key} must be a quoted floating-local string YYYY-MM-DDTHH:mm (got ${typeof session[key]})`);
        }
      }
    }
    const starts = sessions.map((session) => session.start_local).filter((value) => typeof value === "string").sort();
    const earliest = starts[0];
    const startAtLocal = toLocalMinute(record.global?.start_at);
    if (earliest && startAtLocal && startAtLocal !== earliest) add(`global.start_at (${startAtLocal}) must equal earliest session start (${earliest})`);
  } else if (schedule?.mode === "recurring") {
    const recurrence = schedule.recurrence || {};
    if (!registry.enums.weekday.includes(recurrence.weekday)) add(`recurrence.weekday invalid: ${recurrence.weekday}`);
    for (const key of ["start_time", "end_time"]) if (!/^\d{2}:\d{2}$/.test(recurrence[key] || "")) add(`recurrence.${key} must be HH:mm`);
    if (typeof recurrence.anchor !== "string" || !LOCAL_DATE.test(recurrence.anchor)) add("recurrence.anchor must be a quoted YYYY-MM-DD string");
    const overrides = schedule.overrides || [];
    const overrideDates = new Set();
    for (const override of overrides) {
      if (typeof override.date !== "string" || !LOCAL_DATE.test(override.date)) add("schedule.overrides[].date must be YYYY-MM-DD");
      else if (new Date(`${override.date}T00:00:00Z`).getUTCDay() !== WEEKDAY_NUM[recurrence.weekday]) {
        add(`schedule.overrides[].date must fall on ${recurrence.weekday}: ${override.date}`);
      }
      if (overrideDates.has(override.date)) add(`schedule.overrides[]: duplicate date: ${override.date}`);
      overrideDates.add(override.date);
      if (!["scheduled", "cancelled"].includes(override.status || "scheduled")) {
        add(`schedule.overrides[].status invalid: ${override.status}`);
      }
    }
  }
  if (schedule) {
    const globalIds = new Set((schedule.featured_occurrences || []).map((item) => item.id));
    for (const [locale, localized] of Object.entries(record.locales || {})) {
      const notes = localized?.schedule?.featured_occurrences || {};
      for (const key of Object.keys(notes)) if (!globalIds.has(key)) add(`locales.${locale}.schedule.featured_occurrences: id "${key}" not in global list`);
    }
  }
  return { errors };
}

function sourceMap() {
  return {
    site_settings: contentFilesFor("site"), fixed_page: contentFilesFor("pages"),
    workshop: contentFilesFor("workshops"), venue: contentFilesFor("venues"),
    event: contentFilesFor("events"), journal: contentFilesFor("journal"), legal_page: contentFilesFor("legal"),
  };
}

function main() {
  const args = parseArgs();
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/content-schema-v2.registry.json"), "utf8"));
  const sources = sourceMap();
  const venueIds = new Set(sources.venue.map((file) => readYaml(file).global?.id));
  const errors = [];
  let count = 0;
  for (const [type, files] of Object.entries(sources)) {
    for (const file of files) {
      const record = readYaml(file);
      const result = validateRecord(record, { type, registry, venueIds });
      for (const error of result.errors) errors.push(`${relative(file)}: ${error}`);
      if (record.global?.id && path.basename(file, ".yaml") !== record.global.id && type !== "site_settings") errors.push(`${relative(file)}: global.id must match filename stem`);
      count++;
    }
  }
  if (args.fixtures) {
    const dir = path.join(ROOT, "migration/fixtures/content-v2");
    const valid = readYaml(path.join(dir, "valid-minimal.yaml"));
    if (validateRecord(valid, { type: "fixed_page", registry, venueIds }).errors.length) errors.push("valid-minimal.yaml: expected fixture to pass");
    const invalid = readYaml(path.join(dir, "invalid-missing-locale.yaml"));
    if (!validateRecord(invalid, { type: "fixed_page", registry, venueIds }).errors.some((error) => error.includes("intended_locales"))) errors.push("invalid-missing-locale.yaml: expected intended-locale mismatch");
    const invalidEvent = readYaml(path.join(dir, "invalid-event-orphan-venue.yaml"));
    if (!validateRecord(invalidEvent, { type: "event", registry, venueIds }).errors.some((error) => error.includes("unknown venue"))) errors.push("invalid-event-orphan-venue.yaml: expected orphan venue failure");
  }
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  else console.log(`Content schema valid for ${count} v2 record(s).`);
}

if (require.main === module) main();
module.exports = { getPath, toLocalMinute, validateRecord };
