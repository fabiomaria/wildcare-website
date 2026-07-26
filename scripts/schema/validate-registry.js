"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, parseArgs } = require("./lib");

const args = parseArgs();
const file = args.fixture
  ? path.join(ROOT, "migration/fixtures/registry", `${args.fixture}.json`)
  : path.join(ROOT, "schema/content-schema-v2.registry.json");
if (!fs.existsSync(file)) throw new Error(`${path.relative(ROOT, file)}: registry fixture does not exist`);
const registry = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];

if (registry.schema_version !== 2) errors.push("schema_version: must equal 2");
if (!Number.isInteger(registry.registry_revision) || registry.registry_revision < 1) {
  errors.push("registry_revision: must be a positive integer");
}
if (!Array.isArray(registry.supported_locales) || !registry.supported_locales.length) {
  errors.push("supported_locales: at least one locale is required");
}
const ids = new Set();
for (const [recordType, definition] of Object.entries(registry.record_types || {})) {
  if (!Array.isArray(definition.fields)) {
    errors.push(`${recordType}.fields: must be an array`);
    continue;
  }
  for (const field of definition.fields) {
    const label = field.id || `${recordType}.<missing-id>`;
    if (!field.id) errors.push(`${label}: stable field id is required`);
    else if (ids.has(field.id)) errors.push(`${label}: duplicate field id`);
    else ids.add(field.id);
    if (!["G", "L", "G+O"].includes(field.class)) errors.push(`${label}: invalid localization class`);
    if (["object", "array"].includes(field.type) && !field.path.endsWith("[]")) {
      errors.push(`${label}: localization classes apply only to leaf values`);
    }
    if (field.class === "G+O" && (!field.override_path || field.atomic === undefined)) {
      errors.push(`${label}: G+O requires override_path and explicit atomic policy`);
    }
    if (!field.v1_downgrade || !field.v1_downgrade.path) {
      errors.push(`${label}: v1 downgrade mapping is required`);
    }
    if (field.enum && !registry.enums?.[field.enum]) errors.push(`${label}: unknown enum ${field.enum}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Registry valid: ${ids.size} unique leaf fields.`);
}
