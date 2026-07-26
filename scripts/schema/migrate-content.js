"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  ROOT,
  contentFilesFor,
  journalPairs,
  legalEntries,
  migrateJournalEntry,
  migrateLegalEntry,
  migrateYamlRecord,
  promoteGlobalFields,
  readYaml,
  parseArgs,
  relative,
  selectedCollections,
  stableJson,
  writeJson,
  writeYaml,
} = require("./lib");

const args = parseArgs();
if (!args.check && !args.write) {
  throw new Error("Choose exactly one of --check or --write");
}
if (args.check && args.write) throw new Error("--check and --write are mutually exclusive");

const collections = selectedCollections(args);
const changes = [];

function recordChange(collection, source, target, value) {
  const serialized = target.endsWith(".yaml") ? null : value;
  const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  const next = serialized ?? require("js-yaml").dump(value, {
    noRefs: true,
    lineWidth: -1,
    quotingType: "'",
  });
  if (existing !== next) changes.push({ collection, source: relative(source), target: relative(target), value });
}

for (const collection of collections) {
  if (["site", "pages", "workshops"].includes(collection)) {
    for (const file of contentFilesFor(collection)) {
      const migrated = migrateYamlRecord(collection, file);
      recordChange(collection, file, file, migrated);
    }
  }

  if (collection === "journal") {
    const pairs = journalPairs();
    if (!pairs.size && !contentFilesFor("journal").length) {
      throw new Error("content/journal: no v1 pairs or v2 records found");
    }
    for (const [id, pair] of pairs) {
      const { record, parsed } = migrateJournalEntry(id, pair);
      const target = path.join(ROOT, "content/journal/records", `${id}.yaml`);
      recordChange(collection, pair.de || pair.en, target, record);
      for (const [locale, entry] of Object.entries(parsed)) {
        const bodyTarget = path.join(ROOT, "content/journal/bodies", `${id}.${locale}.md`);
        const existing = fs.existsSync(bodyTarget) ? fs.readFileSync(bodyTarget, "utf8") : null;
        if (existing !== entry.content) {
          changes.push({
            collection,
            source: relative(pair[locale]),
            target: relative(bodyTarget),
            raw: entry.content,
          });
        }
      }
    }
    for (const file of contentFilesFor("journal")) {
      recordChange(collection, file, file, promoteGlobalFields(readYaml(file)));
    }
  }

  if (collection === "legal") {
    const entries = legalEntries();
    if (!entries.length && !contentFilesFor("legal").length) {
      throw new Error("content/legal: no v1 or v2 legal records found");
    }
    for (const [id, file] of entries) {
      const { record, parsed } = migrateLegalEntry(id, file);
      const target = path.join(ROOT, "content/legal/records", `${id}.yaml`);
      recordChange(collection, file, target, record);
      const bodyTarget = path.join(ROOT, "content/legal/bodies", `${id}.de.md`);
      const existing = fs.existsSync(bodyTarget) ? fs.readFileSync(bodyTarget, "utf8") : null;
      if (existing !== parsed.content) {
        changes.push({
          collection,
          source: relative(file),
          target: relative(bodyTarget),
          raw: parsed.content,
        });
      }
    }
    for (const file of contentFilesFor("legal")) {
      recordChange(collection, file, file, promoteGlobalFields(readYaml(file)));
    }
  }
}

const report = {
  mode: args.write ? "write" : "check",
  collections,
  records_verified: collections.flatMap((collection) => contentFilesFor(collection).map(relative)),
  body_files_verified: [
    ...(collections.includes("journal") && fs.existsSync(path.join(ROOT, "content/journal/bodies"))
      ? fs.readdirSync(path.join(ROOT, "content/journal/bodies")).filter((name) => name.endsWith(".md")).sort()
        .map((name) => `content/journal/bodies/${name}`)
      : []),
    ...(collections.includes("legal") && fs.existsSync(path.join(ROOT, "content/legal/bodies"))
      ? fs.readdirSync(path.join(ROOT, "content/legal/bodies")).filter((name) => name.endsWith(".md")).sort()
        .map((name) => `content/legal/bodies/${name}`)
      : []),
  ],
  changes: changes.map(({ collection, source, target }) => ({ collection, source, target })),
  idempotent: changes.length === 0,
  warnings: [],
};

if (args.write) {
  if (!args.force) {
    for (const change of changes) {
      const status = execFileSync("git", ["status", "--short", "--", change.target], {
        cwd: ROOT,
        encoding: "utf8",
      }).trim();
      if (status) {
        throw new Error(`${change.target}: target has uncommitted changes; commit it or rerun with --force`);
      }
    }
  }
  for (const change of changes) {
    const target = path.join(ROOT, change.target);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (change.raw !== undefined) fs.writeFileSync(target, change.raw);
    else writeYaml(target, change.value);
  }
}

if (args.write) {
  writeJson(path.join(ROOT, "migration/reports/migrate-content.json"), report);
}
console.log(`${args.write ? "Wrote" : "Planned"} ${changes.length} schema v2 file change(s).`);
