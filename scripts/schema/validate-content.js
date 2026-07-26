"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  ROOT,
  contentFilesFor,
  isObject,
  parseArgs,
  readYaml,
  relative,
  stableJson,
} = require("./lib");

const args = parseArgs();
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/content-schema-v2.registry.json"), "utf8"));
const sourceMap = {
  site_settings: contentFilesFor("site"),
  fixed_page: contentFilesFor("pages"),
  workshop: contentFilesFor("workshops"),
  journal: contentFilesFor("journal"),
  legal_page: contentFilesFor("legal"),
};
const errors = [];
const routes = new Map();
const records = [];

function addError(file, field, message) {
  errors.push(`${relative(file)}: ${field}: ${message}`);
}

function leaves(value, prefix = "", output = []) {
  if (Array.isArray(value)) {
    if (!value.length) output.push({ path: `${prefix}[]`, value });
    else for (const item of value) leaves(item, `${prefix}[]`, output);
  } else if (isObject(value) && !(value instanceof Date)) {
    for (const [key, child] of Object.entries(value)) leaves(child, prefix ? `${prefix}.${key}` : key, output);
  } else output.push({ path: prefix, value });
  return output;
}

function mediaCandidate(pathName, value) {
  if (typeof value !== "string" || /^(?:https?:|mailto:|#)/.test(value)) return false;
  return /(?:^|\.)(?:src|image|hero_image|main_image|inset_image|video|video_poster|og_image|default_og_image)$/.test(pathName);
}

for (const [recordType, files] of Object.entries(sourceMap)) {
  const definition = registry.record_types[recordType];
  const allowed = new Set(definition.fields.filter((field) => field.storage !== "markdown_file").map((field) => field.path));
  for (const file of files) {
    const record = readYaml(file);
    records.push({ recordType, file, record });
    if (record.schema_version !== 2) addError(file, "schema_version", "must equal 2");
    if (!isObject(record.global)) addError(file, "global", "is required");
    if (!isObject(record.locales)) addError(file, "locales", "is required");
    const id = record.global?.id;
    if (!id) addError(file, "global.id", "is required");
    if (path.basename(file, ".yaml") !== id && !(recordType === "site_settings" && id === "site")) {
      addError(file, "global.id", `must match filename stem "${path.basename(file, ".yaml")}"`);
    }
    const intended = record.global?.intended_locales || [];
    const available = Object.keys(record.locales || {}).filter((locale) => isObject(record.locales[locale]) && Object.keys(record.locales[locale]).length);
    if (stableJson(intended) !== stableJson(available)) {
      addError(file, "global.intended_locales", `declared ${JSON.stringify(intended)}, but available locales are ${JSON.stringify(available)}`);
    }
    for (const locale of available) {
      if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)) addError(file, `locales.${locale}`, "is not a BCP 47-compatible locale");
      if (!registry.supported_locales.includes(locale)) addError(file, `locales.${locale}`, "is not supported");
    }
    const statuses = registry.enums.status_by_record_type[recordType];
    if (!statuses.includes(record.global?.status)) addError(file, "global.status", `must be one of ${statuses.join(", ")}`);
    if (record.global?.sort_order !== undefined && (!Number.isInteger(record.global.sort_order) || record.global.sort_order < 0)) {
      addError(file, "global.sort_order", "must be a non-negative integer");
    }
    const route = record.global?.route;
    if (route) {
      if (routes.has(route)) addError(file, "global.route", `duplicates ${relative(routes.get(route))}`);
      else routes.set(route, file);
    }
    for (const leaf of leaves(record.global, "global")) {
      if (!allowed.has(leaf.path)) addError(file, leaf.path, "is not classified in the registry");
      if (typeof leaf.value === "string" && !leaf.value.trim()) addError(file, leaf.path, "empty strings are not allowed");
      if (mediaCandidate(leaf.path, leaf.value)) checkMedia(file, leaf.path, leaf.value);
      checkEnum(file, leaf.path, leaf.value);
    }
    for (const [locale, localized] of Object.entries(record.locales || {})) {
      for (const leaf of leaves(localized, "locales.{locale}")) {
        if (!allowed.has(leaf.path)) addError(file, leaf.path, "is not classified in the registry");
        if (typeof leaf.value === "string" && !leaf.value.trim()) addError(file, leaf.path, "empty strings are not allowed");
        if (mediaCandidate(leaf.path, leaf.value)) checkMedia(file, leaf.path, leaf.value);
        checkEnum(file, leaf.path, leaf.value);
      }
    }
    if (recordType === "journal" || recordType === "legal_page") {
      const bodyRoot = recordType === "journal" ? "content/journal/bodies" : "content/legal/bodies";
      for (const locale of intended) {
        const body = path.join(ROOT, bodyRoot, `${id}.${locale}.md`);
        if (!fs.existsSync(body)) addError(file, `locales.${locale}.body`, `missing ${relative(body)}`);
      }
    }
  }
}

function checkMedia(file, field, value) {
  const decoded = decodeURIComponent(value);
  const local = decoded.startsWith("/") ? decoded.slice(1) : decoded;
  if (!local.startsWith("assets/")) return;
  if (!fs.existsSync(path.join(ROOT, local))) addError(file, field, `media file does not exist: ${value}`);
}

function checkEnum(file, field, value) {
  if (/(?:focal_point|_focus)$/.test(field) && !registry.enums.focal_point.includes(value)) {
    addError(file, field, `unknown focal point "${value}"`);
  }
  if ((field === "global.hero.variant" || field.endsWith(".hero_variant")) && !registry.enums.journal_hero_variant.includes(value)) {
    addError(file, field, `unknown journal hero variant "${value}"`);
  }
  if (field.endsWith(".pricing_model") && !registry.enums.pricing_model.includes(value)) {
    addError(file, field, `unknown pricing model "${value}"`);
  }
}

for (const [recordType, bodyDir] of [["journal", "content/journal/bodies"], ["legal_page", "content/legal/bodies"]]) {
  const dir = path.join(ROOT, bodyDir);
  if (!fs.existsSync(dir)) continue;
  const valid = new Set(sourceMap[recordType].flatMap((file) => {
    const record = readYaml(file);
    return (record.global.intended_locales || []).map((locale) => `${record.global.id}.${locale}.md`);
  }));
  for (const name of fs.readdirSync(dir).filter((item) => item.endsWith(".md"))) {
    if (!valid.has(name)) errors.push(`${bodyDir}/${name}: orphan body file`);
  }
}

if (args.fixtures) {
  const fixtureDir = path.join(ROOT, "migration/fixtures/content-v2");
  if (!fs.existsSync(fixtureDir)) {
    errors.push("migration/fixtures/content-v2: fixture directory is missing");
  } else {
    const valid = readYaml(path.join(fixtureDir, "valid-minimal.yaml"));
    if (valid.schema_version !== 2 || stableJson(valid.global.intended_locales) !== stableJson(Object.keys(valid.locales))) {
      errors.push("migration/fixtures/content-v2/valid-minimal.yaml: expected fixture to pass");
    }
    const invalid = readYaml(path.join(fixtureDir, "invalid-missing-locale.yaml"));
    if (stableJson(invalid.global.intended_locales) === stableJson(Object.keys(invalid.locales))) {
      errors.push("migration/fixtures/content-v2/invalid-missing-locale.yaml: expected intended-locale mismatch");
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Content schema valid for ${records.length} v2 record(s).`);
}
