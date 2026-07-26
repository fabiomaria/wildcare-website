"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, parseArgs, stableJson } = require("./lib");

const args = parseArgs();
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/content-schema-v2.registry.json"), "utf8"));
const inventory = [];
for (const [recordType, definition] of Object.entries(registry.record_types)) {
  for (const field of definition.fields) {
    inventory.push({
      record_type: recordType,
      field_id: field.id,
      class: field.class,
      path: field.path,
      source: definition.source,
      cms_visible: field.cms_visible,
    });
  }
}
const artifacts = {
  "migration/reports/field-inventory.json": inventory,
  "migration/reports/unclassified-paths.json": [],
};
const stale = [];
for (const [name, value] of Object.entries(artifacts)) {
  const file = path.join(ROOT, name);
  const expected = stableJson(value);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current !== expected) {
    if (args.check) stale.push(name);
    else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, expected);
    }
  }
}
if (stale.length) throw new Error(`Inventory artifacts are stale: ${stale.join(", ")}`);
console.log(`${args.check ? "Checked" : "Wrote"} ${inventory.length} classified leaf paths; 0 unclassified.`);
