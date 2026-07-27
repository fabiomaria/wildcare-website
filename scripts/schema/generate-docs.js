"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./lib");
const { generate: generateSchemas } = require("./generate-json-schemas");

const check = process.argv.includes("--check");
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "schema/content-schema-v2.registry.json"), "utf8"));
const lines = [
  "# Wild Care content schema v2",
  "",
  "<!-- Generated from schema/content-schema-v2.registry.json. Do not edit. -->",
  "",
  `Registry revision: ${registry.registry_revision}`,
  "",
  `Supported locales: ${registry.supported_locales.map((locale) => `\`${locale}\``).join(", ")}`,
  "",
];

for (const [name, definition] of Object.entries(registry.record_types)) {
  lines.push(`## ${name}`, "");
  lines.push(`Source: \`${definition.source}\``, "");
  lines.push(`Templates:${definition.templates.length ? ` ${definition.templates.map((item) => `\`${item}\``).join(", ")}` : ""}`, "");
  lines.push("| Field ID | Class | Storage path | Type | Required | CMS |", "| --- | --- | --- | --- | --- | --- |");
  for (const field of definition.fields) {
    lines.push(`| \`${field.id}\` | ${field.class} | \`${field.path}\` | ${field.type}${field.storage ? ` / ${field.storage}` : ""} | ${field.required ? "yes" : "no"} | ${field.cms_visible ? "yes" : "no"} |`);
  }
  lines.push("");
}

lines.push("## Enums", "");
for (const [name, values] of Object.entries(registry.enums)) {
  if (Array.isArray(values)) lines.push(`- \`${name}\`: ${values.map((value) => `\`${value}\``).join(", ")}`);
}
lines.push("");

const output = `${lines.join("\n")}\n`;
const file = path.join(ROOT, "docs/generated/content-schema-v2.md");
const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
if (check && current !== output) throw new Error("docs/generated/content-schema-v2.md is stale");
if (!check && current !== output) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, output);
}
generateSchemas({ check });
console.log(`${check ? "Checked" : "Generated"} schema documentation and JSON schemas.`);
