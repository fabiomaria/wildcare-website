"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const yaml = require("js-yaml");
const matter = require("gray-matter");
const {
  JOURNAL_GLOBAL_KEYS,
  ROOT,
  contentFilesFor,
  localizedView,
  omitEmpty,
  parseArgs,
  readYaml,
  relative,
  selectedCollections,
  writeJson,
  writeYaml,
} = require("./lib");

const args = parseArgs();
if (!args.check && !args.write) throw new Error("Choose exactly one of --check or --write");
if (args.check && args.write) throw new Error("--check and --write are mutually exclusive");
const collections = selectedCollections(args);
const outputRoot = path.join(ROOT, "migration/downgraded");
const outputs = [];
let writtenCount = 0;

function languageMode(intended) {
  if (intended.length === 1) return `${intended[0]}_only`;
  return "bilingual";
}

function addOutput(collection, name, value, raw = false) {
  outputs.push({ collection, target: path.join(outputRoot, collection, name), value, raw });
}

for (const collection of collections) {
  for (const file of contentFilesFor(collection)) {
    const record = readYaml(file);
    if (record.schema_version !== 2) throw new Error(`${relative(file)}: schema_version must equal 2`);
    const id = record.global.id;
    if (collection === "site" || collection === "pages") {
      addOutput(collection, collection === "site" ? "site.yaml" : `${id}.yaml`,
        Object.fromEntries(Object.keys(record.locales).map((locale) => [locale, localizedView(record, locale)])));
    } else if (collection === "workshops") {
      const shared = {
        slug: id,
        language_mode: languageMode(record.global.intended_locales),
        status: record.global.status,
        detail_page: record.global.detail_page,
        start_date: record.global.start_at,
        registration_url: record.global.registration?.url,
      };
      const locales = {};
      for (const locale of Object.keys(record.locales)) {
        const value = localizedView(record, locale);
        locales[locale] = locale === "de" || !record.locales.de ? { ...shared, ...value } : value;
      }
      addOutput(collection, `${id}.yaml`, locales);
    } else if (collection === "journal") {
      for (const locale of Object.keys(record.locales)) {
        const localized = localizedView(record, locale);
        const body = localized.body;
        delete localized.body;
        if (localized.summary) {
          localized.excerpt = localized.summary;
          localized.homepage_excerpt = localized.summary;
          localized.homepage_title = localized.homepage_title || localized.title;
          localized.homepage_image_alt = localized.homepage_image_alt || localized.image_alt;
          delete localized.summary;
        }
        const data = {
          language_mode: languageMode(record.global.intended_locales),
          ...localized,
          date: record.global.published_at,
          status: record.global.status,
          image: record.global.image?.src,
          hero_image: record.global.hero?.image?.src,
          hero_variant: record.global.hero?.variant,
          tally: record.global.tally,
        };
        if (typeof body !== "string" || !body.trim()) throw new Error(`${relative(file)}: journal.locales.${locale}.body is missing`);
        const name = locale === "de" ? `${id}.md` : `${id}.${locale}.md`;
        addOutput(collection, name, matter.stringify(body, omitEmpty(data)), true);
      }
    } else if (collection === "legal") {
      const locale = Object.keys(record.locales)[0];
      const bodyFile = path.join(ROOT, "content/legal/bodies", `${id}.${locale}.md`);
      if (!fs.existsSync(bodyFile)) throw new Error(`${relative(bodyFile)}: legal body is missing`);
      const data = { status: record.global.status, route: record.global.route || `/${id}`, ...localizedView(record, locale) };
      addOutput(collection, `${id}.md`, matter.stringify(fs.readFileSync(bodyFile, "utf8"), omitEmpty(data)), true);
    }
  }
}

if (args.write) {
  const changed = outputs.filter((output) => {
    const next = output.raw ? output.value : yaml.dump(output.value, {
      noRefs: true,
      lineWidth: -1,
      quotingType: "'",
      forceQuotes: false,
    });
    return !fs.existsSync(output.target) || fs.readFileSync(output.target, "utf8") !== next;
  });
  writtenCount = changed.length;
  if (!args.force) {
    for (const output of changed) {
      const target = relative(output.target);
      const status = execFileSync("git", ["status", "--short", "--", target], {
        cwd: ROOT,
        encoding: "utf8",
      }).trim();
      if (status) throw new Error(`${target}: target has uncommitted changes; commit it or rerun with --force`);
    }
  }
  for (const output of changed) {
    fs.mkdirSync(path.dirname(output.target), { recursive: true });
    if (output.raw) fs.writeFileSync(output.target, output.value);
    else writeYaml(output.target, output.value);
  }
}

if (args.write) {
  writeJson(path.join(ROOT, "migration/reports/downgrade-content.json"), {
    mode: "write",
    collections,
    outputs: outputs.map((item) => relative(item.target)),
    lossy_fields: [
      "global.schedule.*", "global.venue", "global.registration.availability",
      "global.event_type", "global.page_mode",
    ],
    warnings: ["venue and event records are v2-only and have no v1 downgrade target"],
  });
}
console.log(args.write
  ? `Wrote ${writtenCount} changed v1 downgrade file(s); verified ${outputs.length} total.`
  : `Verified ${outputs.length} deterministic v1 downgrade file(s).`);
