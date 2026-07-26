"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  ROOT,
  contentFilesFor,
  parseArgs,
  readYaml,
  selectedCollections,
  stableJson,
  writeJson,
} = require("./lib");

const args = parseArgs();
const collections = args.fixtures
  ? ["workshops", "site", "pages", "journal", "legal"]
  : selectedCollections(args);
const results = [];

for (const collection of collections) {
  for (const file of contentFilesFor(collection)) {
    const record = readYaml(file);
    const id = record.global?.id;
    const available = Object.keys(record.locales || {});
    const intended = record.global?.intended_locales || [];
    const equal = stableJson(available) === stableJson(intended);
    results.push({ collection, id, intended_locales: intended, available_locales: available, equal });
    if (!equal) throw new Error(`${path.relative(ROOT, file)}: normalized locale parity failed`);
  }
}

const baseline = path.join(ROOT, "migration/fixtures/rendered-v1/manifest.json");
writeJson(path.join(ROOT, "migration/reports/parity.json"), {
  collections,
  normalized_records: results,
  rendered_v1_manifest_present: fs.existsSync(baseline),
  intentional_serialization_differences: [
    "Schema v2 omits optional empty strings.",
    "Journal and legal front matter are separated from Markdown bodies.",
  ],
  warnings: [],
});
console.log(`Normalized parity verified for ${results.length} record(s).`);
