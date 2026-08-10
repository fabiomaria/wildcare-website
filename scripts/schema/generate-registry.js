"use strict";

const path = require("node:path");
const {
  LOCALES,
  ROOT,
  contentFilesFor,
  isObject,
  readYaml,
  writeJson,
} = require("./lib");

const recordTypes = {
  site_settings: {
    source: "content/site.yaml",
    records: contentFilesFor("site"),
    templates: ["site"],
    ordering: { primary: "global.id", tie_breakers: ["global.id"] },
  },
  fixed_page: {
    source: "content/pages/*.yaml",
    records: contentFilesFor("pages"),
    templates: ["index", "kontakt", "team", "journal", "programm", "archive", "montagskurs", "mitmachen"],
    ordering: { primary: "global.route", tie_breakers: ["global.id"] },
  },
  workshop: {
    source: "content/workshops/*.yaml",
    records: contentFilesFor("workshops"),
    templates: ["workshop"],
    ordering: { primary: "global.start_at", tie_breakers: ["global.id"] },
  },
  venue: {
    source: "content/venues/*.yaml",
    records: contentFilesFor("venues"),
    templates: [],
    ordering: { primary: "global.id", tie_breakers: ["global.id"] },
    locale_neutral: true,
  },
  event: {
    source: "content/events/*.yaml",
    records: contentFilesFor("events"),
    templates: ["event"],
    ordering: { primary: "global.start_at", tie_breakers: ["global.id"] },
  },
  journal: {
    source: "content/journal/records/*.yaml",
    records: contentFilesFor("journal"),
    templates: ["journal-post"],
    ordering: { primary: "global.published_at:desc", tie_breakers: ["global.id"] },
  },
  legal_page: {
    source: "content/legal/records/*.yaml",
    records: contentFilesFor("legal"),
    templates: ["legal"],
    ordering: { primary: "global.id", tie_breakers: ["global.id"] },
  },
};

function valueType(value) {
  if (value instanceof Date) return "datetime";
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function leafPaths(value, prefix = "", output = []) {
  if (Array.isArray(value)) {
    if (!value.length) {
      output.push({ path: `${prefix}[]`, type: "array" });
    } else {
      for (const item of value) leafPaths(item, `${prefix}[]`, output);
    }
  } else if (isObject(value) && !(value instanceof Date)) {
    for (const [key, child] of Object.entries(value)) {
      leafPaths(child, prefix ? `${prefix}.${key}` : key, output);
    }
  } else {
    output.push({ path: prefix, type: valueType(value) });
  }
  return output;
}

function enumFor(pathName) {
  if (pathName === "global.status") return "status";
  if (/(?:^|\.)focal_point$|_focus$/.test(pathName)) return "focal_point";
  if (pathName === "global.hero.variant" || pathName.endsWith(".hero_variant")) return "journal_hero_variant";
  if (pathName.endsWith(".pricing_model")) return "pricing_model";
  if (pathName === "global.schedule.event_status" || pathName === "global.schedule.sessions[].status") return "event_status";
  if (pathName === "global.schedule.mode") return "schedule_mode";
  if (pathName === "global.schedule.recurrence.weekday") return "weekday";
  if (pathName === "global.registration.availability") return "availability";
  if (pathName === "global.event_type") return "event_type";
  if (pathName === "global.page_mode") return "page_mode";
  return undefined;
}

function fieldId(recordType, field) {
  const idPath = field.path
    .replace("locales.{locale}.", "")
    .replace(/\[\]/g, ".item")
    .replace(/[^a-zA-Z0-9.]+/g, "_");
  return `${recordType}.${field.class.toLowerCase()}.${idPath}`;
}

function registryField(recordType, field) {
  const enumName = enumFor(field.path);
  const defaultRequired = recordType === "venue"
    ? ["global.id", "global.name", "global.street", "global.postal_code", "global.city", "global.country"].includes(field.path)
    : ["global.id", "global.intended_locales", "global.status"].includes(field.path);
  return {
    id: fieldId(recordType, field),
    class: field.class,
    path: field.path,
    type: field.type,
    required: field.required ?? defaultRequired,
    allow_empty: false,
    nullable: false,
    ...(enumName ? { enum: enumName } : {}),
    ...(field.path === "global.venue" ? { reference: { target: "venue", orphan: "error" } } : {}),
    ...(field.storage ? {
      storage: field.storage,
      path_pattern: field.path_pattern,
    } : {}),
    cms_visible: field.cms_visible ?? (field.path !== "global.id" && field.storage !== "markdown_file"),
    v1_source: { path: field.path.replace("global.", "de.").replace("locales.{locale}.", "{locale}.") },
    v1_downgrade: { path: field.path.replace("global.", "de.").replace("locales.{locale}.", "{locale}.") },
  };
}

for (const [type, definition] of Object.entries(recordTypes)) {
  const fields = new Map();
  for (const file of definition.records) {
    const record = readYaml(file);
    for (const leaf of leafPaths(record.global, "global")) {
      const key = `G:${leaf.path}`;
      if (!fields.has(key)) fields.set(key, { ...leaf, class: "G" });
    }
    for (const locale of LOCALES) {
      if (!record.locales?.[locale]) continue;
      for (const leaf of leafPaths(record.locales[locale], "locales.{locale}")) {
        const key = `L:${leaf.path}`;
        if (!fields.has(key)) fields.set(key, { ...leaf, class: "L" });
      }
    }
  }
  if (type === "legal_page") {
    fields.set("L:body", {
      class: "L",
      path: "locales.{locale}.body",
      type: "string",
      storage: "markdown_file",
      path_pattern: "content/legal/bodies/{id}.{locale}.md",
    });
  }
  definition.identity = { field: "global.id", filename_stem_must_match: true };
  definition.fields = Array.from(fields.values())
    .sort((a, b) => `${a.class}:${a.path}`.localeCompare(`${b.class}:${b.path}`))
    .map((field) => registryField(type, field));
  delete definition.records;
}

function cmsType(field) {
  if (field.widget === "boolean") return "boolean";
  if (field.widget === "number") return field.value_type === "int" ? "integer" : "number";
  if (field.widget === "datetime") {
    return ["date", "time", "datetime-local"].includes(field.type) || field.time_format === false ? "string" : "datetime";
  }
  if (field.widget === "list" && !field.fields) return "array";
  return "string";
}

function cmsLeaves(fields, prefix = "", output = []) {
  for (const field of fields || []) {
    if (field.name === "schema_version") continue;
    let next = prefix ? `${prefix}.${field.name}` : field.name;
    if (next === "locales.de" || next === "locales.en") next = "locales.{locale}";
    if (field.widget === "object" && field.fields) {
      cmsLeaves(field.fields, next, output);
    } else if (field.widget === "list") {
      if (field.fields) cmsLeaves(field.fields, `${next}[]`, output);
      else output.push({ path: `${next}[]`, type: "array", required: field.required !== false });
    } else if (field.multiple === true) {
      output.push({ path: `${next}[]`, type: cmsType(field), required: field.required !== false });
    } else {
      output.push({ path: next, type: cmsType(field), required: field.required !== false });
    }
  }
  return output;
}

const cmsFile = path.join(ROOT, "admin/config.yml");
if (require("node:fs").existsSync(cmsFile)) {
  const cms = require("js-yaml").load(require("node:fs").readFileSync(cmsFile, "utf8"));
  const typeByCollection = {
    seiten: "fixed_page",
    website: "site_settings",
    workshops: "workshop",
    journal_de: "journal",
    journal_en: "journal",
    venues: "venue",
    events: "event",
    journal: "journal",
    rechtliches: "legal_page",
  };
  for (const collection of cms.collections || []) {
    const recordType = typeByCollection[collection.name];
    if (!recordType) continue;
    const definitions = collection.files || [collection];
    const byPath = new Map(recordTypes[recordType].fields.map((field) => [`${field.class}:${field.path}`, field]));
    for (const definition of definitions) {
      for (const leaf of cmsLeaves(definition.fields)) {
        const localizationClass = leaf.path.startsWith("global.") ? "G" : leaf.path.startsWith("locales.{locale}.") ? "L" : null;
        if (!localizationClass) continue;
        const key = `${localizationClass}:${leaf.path}`;
        if (!byPath.has(key)) {
          const field = registryField(recordType, {
            ...leaf,
            class: localizationClass,
            cms_visible: true,
          });
          byPath.set(key, field);
          recordTypes[recordType].fields.push(field);
        } else {
          byPath.get(key).cms_visible = true;
        }
      }
    }
    recordTypes[recordType].fields.sort((a, b) => `${a.class}:${a.path}`.localeCompare(`${b.class}:${b.path}`));
  }
}

const registry = {
  schema_version: 2,
  registry_revision: 2,
  supported_locales: LOCALES,
  enums: {
    status: ["draft", "published", "unlisted", "upcoming", "current", "past", "coming_soon"],
    status_by_record_type: {
      site_settings: ["published"],
      fixed_page: ["draft", "published", "unlisted"],
      workshop: ["draft", "upcoming", "current", "past", "unlisted"],
      journal: ["draft", "published", "coming_soon", "unlisted"],
      legal_page: ["draft", "published"],
      venue: ["published"],
      event: ["draft", "upcoming", "current", "past", "unlisted"],
    },
    focal_point: ["center", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right"],
    journal_hero_variant: ["cover", "contained"],
    pricing_model: ["fixed", "donation", "sliding_scale", "free"],
    event_status: ["scheduled", "cancelled", "postponed", "rescheduled", "moved_online"],
    availability: ["available", "sold_out", "waitlist", "unavailable"],
    event_type: ["jam", "performance", "talk", "retreat", "other"],
    weekday: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    schedule_mode: ["dates", "recurring"],
    page_mode: ["minimal", "full"],
  },
  ignored_content_keys: [],
  record_types: recordTypes,
};

writeJson(path.join(ROOT, "schema/content-schema-v2.registry.json"), registry);
console.log(`Generated registry revision ${registry.registry_revision}.`);
