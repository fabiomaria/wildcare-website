"use strict";

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { ROOT } = require("./lib");

const file = path.join(ROOT, "admin/config.yml");
const config = yaml.load(fs.readFileSync(file, "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/content-schema-v2.registry.json"), "utf8"));
const errors = [];
if (
  config.i18n?.structure !== "single_file" ||
  JSON.stringify(config.i18n?.locales) !== JSON.stringify(registry.supported_locales) ||
  config.i18n?.default_locale !== "de" ||
  config.i18n?.initial_locales !== "all"
) {
  errors.push("root i18n must configure native single_file de/en editing with German default and all locales initialized");
}
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
  workshops_de: "workshop",
  workshops_en: "workshop",
  venues: "venue",
  events: "event",
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
    if (field.widget === "select" && ["event_status", "availability", "event_type", "weekday", "schedule_mode", "page_mode"].includes(field.name)) {
      const expected = registry.enums[field.name];
      if (JSON.stringify(optionValues(field)) !== JSON.stringify(expected)) {
        errors.push(`${collectionName}: ${field.name} options disagree with the registry`);
      }
    }
    inspectEnums(field.fields, collectionName);
    inspectEnums(field.types, collectionName);
  }
}

function inspectNestedI18n(fields, scope, inherited = false, pathParts = []) {
  for (const field of fields || []) {
    const fieldPath = [...pathParts, field.name];
    if (inherited && field.i18n === undefined) {
      errors.push(`${scope}: ${fieldPath.join(".")} must declare i18n explicitly so it remains editable in non-default locales`);
    }
    const childInherited = field.i18n === true || (field.i18n === undefined && inherited);
    inspectNestedI18n(field.fields, scope, childInherited, fieldPath);
    inspectNestedI18n(field.types, scope, childInherited, fieldPath);
  }
}

for (const collection of config.collections) {
  const isPages = collection.name === "seiten";
  const isFixedI18n = isPages || collection.name === "website";
  const isPrimaryI18n = ["workshops_de", "workshops_en"].includes(collection.name);
  if (collection.i18n && !isFixedI18n && !isPrimaryI18n) errors.push(`${collection.name}: collection-level native i18n is forbidden`);
  if ((isFixedI18n || isPrimaryI18n) && !collection.i18n) errors.push(`${collection.name}: collection-level native i18n must be enabled for migrated content`);
  const entries = collection.files || (collection.fields ? [collection] : []);
  for (const entry of entries) {
    if (["journal_bodies", "legal_bodies"].includes(collection.name)) continue;
    const isNativeFixed = isFixedI18n && (entry.i18n === true || typeof entry.i18n === "object");
    const isNativePrimary = isPrimaryI18n && Boolean(collection.i18n);
    if (entry.i18n && !isFixedI18n && !isPrimaryI18n) errors.push(`${collection.name}/${entry.name || "<folder>"}: native i18n is only enabled for migrated content`);
    if (isFixedI18n && !isNativeFixed) errors.push(`${collection.name}/${entry.name || "<folder>"}: file-level native i18n must be enabled`);
    if (isPages && (
      typeof entry.i18n !== "object" ||
      JSON.stringify(entry.i18n.locales) !== JSON.stringify(registry.supported_locales) ||
      entry.i18n.default_locale !== "de" ||
      entry.i18n.initial_locales !== "all"
    )) {
      errors.push(`seiten/${entry.name}: must explicitly initialize German and English at file level`);
    }
    const fields = fieldMap(entry.fields);
    const requiredFields = collection.name === "venues" || isNativeFixed || isNativePrimary
      ? ["schema_version", "global"]
      : ["schema_version", "global", "locales"];
    for (const required of requiredFields) {
      if (!fields.has(required)) errors.push(`${collection.name}/${entry.name || "<folder>"}: missing ${required}`);
    }
    const version = fields.get("schema_version");
    if (version && (version.widget !== "hidden" || version.default !== 2)) {
      errors.push(`${collection.name}: schema_version must be a hidden field with default 2`);
    }
    const global = fieldMap(fields.get("global")?.fields);
    const globalRequired = collection.name === "venues"
      ? ["id", "name", "street", "postal_code", "city", "country"]
      : (isNativeFixed || isNativePrimary) ? ["id", "status"] : ["id", "intended_locales", "status"];
    if (isNativePrimary) globalRequired.push("primary_locale");
    for (const required of globalRequired) {
      if (!global.has(required)) errors.push(`${collection.name}: global.${required} is missing`);
    }
    const intended = global.get("intended_locales");
    if (!isNativeFixed && intended && (intended.widget !== "select" || intended.multiple !== true)) {
      errors.push(`${collection.name}: global.intended_locales must be a multi-select`);
    }
    if (!isNativeFixed && intended && JSON.stringify(optionValues(intended)) !== JSON.stringify(registry.supported_locales)) {
      errors.push(`${collection.name}: intended locale options disagree with the registry`);
    }
    const recordType = recordTypeByCollection[collection.name];
    const status = global.get("status");
    if (recordType && status && JSON.stringify(optionValues(status)) !== JSON.stringify(registry.enums.status_by_record_type[recordType])) {
      errors.push(`${collection.name}: status options disagree with the registry`);
    }
    if (isNativeFixed || isNativePrimary) {
      if (fields.has("locales")) errors.push(`${collection.name}/${entry.name}: native i18n fields must not be wrapped in a locales object`);
      for (const [name, field] of fields) {
        if (!["schema_version", "global"].includes(name) && field.i18n !== true) {
          errors.push(`${collection.name}/${entry.name}: ${name} must use native i18n`);
        }
      }
      if (isPages) inspectNestedI18n(entry.fields, "seiten", false, [entry.name]);
      if (isNativePrimary) inspectNestedI18n(entry.fields, collection.name, false);
      const nativeTeam = isPages && entry.name === "team";
      if (!nativeTeam) {
        inspectEnums(entry.fields, collection.name);
        continue;
      }
      for (const name of ["breadcrumb", "hero", "manifest", "team", "quote_band", "philosophy", "cta", "footer", "meta"]) {
        if (fields.get(name)?.i18n !== true) errors.push(`seiten/team: ${name} must use native i18n`);
      }
      const teamFields = fieldMap(fields.get("team")?.fields);
      if (teamFields.get("members")?.i18n !== "duplicate") {
        errors.push("seiten/team: team.members must synchronize list structure with i18n: duplicate");
      }
      inspectEnums(entry.fields, collection.name);
      continue;
    }
    const locales = fieldMap(fields.get("locales")?.fields);
    if (collection.name === "venues") continue;
    for (const locale of ["de", "en"]) {
      const localized = locales.get(locale);
      if (!localized || localized.widget !== "object" || localized.required !== false) {
        errors.push(`${collection.name}: locales.${locale} must be an optional object`);
      }
    }
    inspectEnums(entry.fields, collection.name);
  }
}

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
