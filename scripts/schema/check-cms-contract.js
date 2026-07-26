"use strict";

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { ROOT } = require("./lib");

const file = path.join(ROOT, "admin/config.yml");
const config = yaml.load(fs.readFileSync(file, "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/content-schema-v2.registry.json"), "utf8"));
const errors = [];
if (config.i18n) errors.push("root i18n configuration must be removed for schema v2");
if (config.output?.omit_empty_optional_fields !== true) {
  errors.push("output.omit_empty_optional_fields must be true so optional empty values remain omitted");
}

function fieldMap(fields) {
  return new Map((fields || []).map((field) => [field.name, field]));
}

const recordTypeByCollection = {
  seiten: "fixed_page",
  website: "site_settings",
  workshops: "workshop",
  journal: "journal",
  rechtliches: "legal_page",
};

function optionValues(field) {
  return (field?.options || []).map((option) => typeof option === "object" ? option.value : option);
}

function inspectEnums(fields, collectionName) {
  for (const field of fields || []) {
    if (field.widget === "select" && /(?:focal_point|_focus)$/.test(field.name)) {
      if (JSON.stringify(optionValues(field)) !== JSON.stringify(registry.enums.focal_point)) {
        errors.push(`${collectionName}: ${field.name} focal-point options disagree with the registry`);
      }
    }
    inspectEnums(field.fields, collectionName);
    inspectEnums(field.types, collectionName);
  }
}

for (const collection of config.collections) {
  if (collection.i18n) errors.push(`${collection.name}: collection-level native i18n is forbidden`);
  const entries = collection.files || (collection.fields ? [collection] : []);
  for (const entry of entries) {
    if (["journal_bodies", "legal_bodies"].includes(collection.name)) continue;
    const fields = fieldMap(entry.fields);
    for (const required of ["schema_version", "global", "locales"]) {
      if (!fields.has(required)) errors.push(`${collection.name}/${entry.name || "<folder>"}: missing ${required}`);
    }
    const version = fields.get("schema_version");
    if (version && (version.widget !== "hidden" || version.default !== 2)) {
      errors.push(`${collection.name}: schema_version must be a hidden field with default 2`);
    }
    const global = fieldMap(fields.get("global")?.fields);
    for (const required of ["id", "intended_locales", "status"]) {
      if (!global.has(required)) errors.push(`${collection.name}: global.${required} is missing`);
    }
    const intended = global.get("intended_locales");
    if (intended && (intended.widget !== "select" || intended.multiple !== true)) {
      errors.push(`${collection.name}: global.intended_locales must be a multi-select`);
    }
    if (intended && JSON.stringify(optionValues(intended)) !== JSON.stringify(registry.supported_locales)) {
      errors.push(`${collection.name}: intended locale options disagree with the registry`);
    }
    const recordType = recordTypeByCollection[collection.name];
    const status = global.get("status");
    if (recordType && status && JSON.stringify(optionValues(status)) !== JSON.stringify(registry.enums.status_by_record_type[recordType])) {
      errors.push(`${collection.name}: status options disagree with the registry`);
    }
    const locales = fieldMap(fields.get("locales")?.fields);
    for (const locale of ["de", "en"]) {
      const localized = locales.get(locale);
      if (!localized || localized.widget !== "object" || localized.required !== false) {
        errors.push(`${collection.name}: locales.${locale} must be an optional object`);
      }
    }
    inspectEnums(entry.fields, collection.name);
  }
}

function findI18n(value, prefix = "config") {
  if (Array.isArray(value)) value.forEach((item, index) => findI18n(item, `${prefix}[${index}]`));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "i18n") errors.push(`${prefix}.i18n: native i18n flag remains`);
      findI18n(child, `${prefix}.${key}`);
    }
  }
}
findI18n(config);

const matrix = {
  "de-only.yaml": ["de"],
  "en-only.yaml": ["en"],
  "bilingual.yaml": ["de", "en"],
};
for (const [name, expected] of Object.entries(matrix)) {
  const fixture = yaml.load(fs.readFileSync(path.join(ROOT, "migration/fixtures/cms", name), "utf8"));
  const intended = fixture.global?.intended_locales || [];
  const available = Object.keys(fixture.locales || {});
  if (JSON.stringify(intended) !== JSON.stringify(expected) || JSON.stringify(available) !== JSON.stringify(expected)) {
    errors.push(`migration/fixtures/cms/${name}: locale matrix mismatch`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`CMS contract valid for ${config.collections.length} collections.`);
}
