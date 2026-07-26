"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, stableJson } = require("./lib");

function schemasFromRegistry(registry) {
  const output = {};
  for (const [name, definition] of Object.entries(registry.record_types)) {
    output[name] = {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "$id": `https://wildcare.space/schema/generated/${name}.schema.json`,
      title: `Wild Care ${name} schema v2`,
      type: "object",
      additionalProperties: false,
      required: ["schema_version", "global", "locales"],
      properties: {
        schema_version: { const: 2 },
        global: {
          type: "object",
          required: ["id", "intended_locales", "status"],
          properties: {
            id: { type: "string", minLength: 1 },
            intended_locales: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: { enum: registry.supported_locales },
            },
            status: { enum: registry.enums.status_by_record_type[name] },
          },
        },
        locales: {
          type: "object",
          minProperties: 1,
          propertyNames: { pattern: "^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$" },
          additionalProperties: { type: "object", minProperties: 1 },
        },
      },
      allOf: [{
        "$comment": `${definition.fields.length} leaf fields are enforced by scripts/schema/validate-content.js from registry revision ${registry.registry_revision}.`,
      }],
    };
  }
  return output;
}

function generate({ check = false } = {}) {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/content-schema-v2.registry.json"), "utf8"));
  const schemas = schemasFromRegistry(registry);
  const mismatches = [];
  for (const [name, schema] of Object.entries(schemas)) {
    const file = path.join(ROOT, "schema/generated", `${name}.schema.json`);
    const expected = stableJson(schema);
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    if (current !== expected) {
      if (check) mismatches.push(path.relative(ROOT, file));
      else {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, expected);
      }
    }
  }
  if (mismatches.length) throw new Error(`Generated JSON schemas are stale: ${mismatches.join(", ")}`);
  return Object.keys(schemas).length;
}

if (require.main === module) {
  const check = process.argv.includes("--check");
  console.log(`${check ? "Checked" : "Generated"} ${generate({ check })} JSON schemas.`);
}

module.exports = { generate, schemasFromRegistry };
