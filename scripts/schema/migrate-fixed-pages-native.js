"use strict";

// One-time rollout migration for fixed pages and site settings. The script is
// intentionally small and deterministic so a rollback can use the inverse
// envelope shape without touching templates or routes.
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { ROOT, writeYaml } = require("./lib");

const configFile = path.join(ROOT, "admin/config.yml");
const config = yaml.load(fs.readFileSync(configFile, "utf8"));

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function cleanField(field) {
  const result = clone(field);
  delete result.i18n;
  if (Array.isArray(result.fields)) result.fields = result.fields.map(cleanField);
  if (Array.isArray(result.types)) result.types = result.types.map(cleanField);
  return result;
}

function nativeField(field) {
  const result = cleanField(field);
  if (!result.i18n) result.i18n = true;
  return result;
}

function nativeConfigEntry(entry) {
  if (entry.i18n === true) return;
  const fields = entry.fields || [];
  const locales = fields.find((field) => field.name === "locales");
  if (!locales) throw new Error(`${entry.name}: missing legacy locales field`);
  const global = fields.find((field) => field.name === "global");
  const schema = fields.find((field) => field.name === "schema_version");
  const localized = locales.fields.find((field) => field.name === "de");
  if (!localized) throw new Error(`${entry.name}: missing locales.de field tree`);
  const globalField = cleanField(global);
  if (globalField?.fields) globalField.fields = globalField.fields.filter((field) => field.name !== "intended_locales");
  if (globalField) globalField.i18n = false;
  if (schema) schema.i18n = false;
  entry.i18n = true;
  entry.fields = [schema, globalField, ...(localized.fields || []).map(nativeField)].filter(Boolean);
}

function nativeRecord(file) {
  const raw = yaml.load(fs.readFileSync(file, "utf8"));
  if (Object.values(raw).some((value) =>
    value && typeof value === "object" && !Array.isArray(value) && value.schema_version === 2 && value.global)) return;
  const locales = Object.entries(raw.locales || {}).filter(([, value]) => value && Object.keys(value).length);
  const primary = locales.find(([locale]) => locale === "de") || locales[0];
  if (!primary) throw new Error(`${file}: no localized content`);
  const blocks = {};
  blocks[primary[0]] = {
    schema_version: 2,
    global: { ...(raw.global || {}) },
    ...clone(primary[1]),
  };
  delete blocks[primary[0]].global.intended_locales;
  for (const [locale, value] of locales) {
    if (locale !== primary[0]) blocks[locale] = clone(value);
  }
  writeYaml(file, blocks);
}

const pages = config.collections.find((collection) => collection.name === "seiten");
pages.i18n = true;
for (const entry of pages.files) {
  nativeConfigEntry(entry);
  nativeRecord(path.join(ROOT, entry.file));
}

const website = config.collections.find((collection) => collection.name === "website");
website.i18n = true;
for (const entry of website.files) {
  nativeConfigEntry(entry);
  nativeRecord(path.join(ROOT, entry.file));
}

fs.writeFileSync(configFile, yaml.dump(config, {
  noRefs: true,
  lineWidth: -1,
  quotingType: "'",
  forceQuotes: false,
}));
console.log("Migrated fixed pages and site settings to native Sveltia i18n.");
