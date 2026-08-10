"use strict";

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { ROOT, writeYaml } = require("./lib");

const configFile = path.join(ROOT, "admin/config.yml");
const recordsDir = path.join(ROOT, "content/journal/records");
const bodiesDir = path.join(ROOT, "content/journal/bodies");

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function withoutI18n(field) {
  const result = clone(field);
  delete result.i18n;
  if (result.fields) result.fields = result.fields.map(withoutI18n);
  if (result.types) result.types = result.types.map(withoutI18n);
  return result;
}

function localized(field) {
  const result = withoutI18n(field);
  result.i18n = true;
  if (result.fields) result.fields = result.fields.map(localized);
  if (result.types) result.types = result.types.map(localized);
  return result;
}

function nativeCollection(legacy, schema, shared, localizedFields, locale) {
  const global = clone(shared);
  global.fields.find((field) => field.name === "primary_locale").default = locale;
  return {
    ...clone(legacy),
    name: `journal_${locale}`,
    label: locale === "de" ? "Journal — German primary" : "Journal — English primary",
    summary: "{{title}} — {{global.status}}",
    thumbnail: "global.image.src",
    fields: [clone(schema), global, ...clone(localizedFields)],
    i18n: {
      structure: "single_file",
      locales: locale === "de" ? ["de", "en"] : ["en", "de"],
      default_locale: locale,
      initial_locales: "default",
    },
    filter: { field: "global.primary_locale", value: locale },
  };
}

function simplifyJournalCollection(collection) {
  const global = collection.fields.find((field) => field.name === "global");
  global.fields = global.fields.filter((field) => !["route", "sort_order", "tally"].includes(field.name));
  const id = global.fields.find((field) => field.name === "id");
  id.label = "URL slug";
  id.hint = "Lowercase letters and hyphens only. This creates /journal/your-slug and must match the filename.";
  const sharedMeta = global.fields.find((field) => field.name === "meta");
  if (sharedMeta) sharedMeta.hint = "Optional overrides. The article title, summary, and card image are used as fallbacks.";

  collection.fields = collection.fields.filter((field) =>
    !["title_html", "homepage_title", "homepage_excerpt", "homepage_image_alt"].includes(field.name));
  const excerpt = collection.fields.find((field) => field.name === "excerpt");
  if (excerpt) {
    excerpt.name = "summary";
    excerpt.label = "Summary";
    excerpt.hint = "Used on the Journal page, homepage, and as the default search description.";
    delete excerpt.required;
  }
  const imageAlt = collection.fields.find((field) => field.name === "image_alt");
  if (imageAlt) imageAlt.label = "Card image description";
  const localizedMeta = collection.fields.find((field) => field.name === "meta");
  if (localizedMeta) {
    localizedMeta.hint = "Optional overrides. The article title, summary, and card image are used as fallbacks.";
    const description = localizedMeta.fields.find((field) => field.name === "description");
    if (description) description.hint = "Leave empty to use the article summary.";
  }
  return collection;
}

const config = yaml.load(fs.readFileSync(configFile, "utf8"));
const journalIndex = config.collections.findIndex((collection) => collection.name === "journal");
if (journalIndex >= 0) {
  const legacy = config.collections[journalIndex];
  const schema = withoutI18n(legacy.fields.find((field) => field.name === "schema_version"));
  schema.i18n = false;

  const global = withoutI18n(legacy.fields.find((field) => field.name === "global"));
  global.fields = global.fields.filter((field) => field.name !== "intended_locales");
  global.fields.splice(1, 0, {
    name: "primary_locale",
    label: "Primary language",
    widget: "select",
    options: [
      { label: "German primary", value: "de" },
      { label: "English primary", value: "en" },
    ],
    default: "de",
    hint: "Determines which Journal collection exposes this article. Keep the primary language first in the saved file.",
  });
  const status = global.fields.find((field) => field.name === "status");
  status.options = ["draft", "published", "coming_soon", "unlisted"];
  status.default = "draft";
  global.i18n = false;

  const localeEnvelope = legacy.fields.find((field) => field.name === "locales");
  const deFields = localeEnvelope.fields.find((field) => field.name === "de").fields;
  const localizedFields = deFields.map(localized);
  for (const name of ["title", "excerpt"]) {
    const field = localizedFields.find((item) => item.name === name);
    delete field.required;
  }
  const excerptIndex = localizedFields.findIndex((field) => field.name === "excerpt");
  localizedFields.splice(excerptIndex + 1, 0, {
    name: "body",
    label: "Article body",
    widget: "markdown",
    i18n: true,
    hint: "Write the complete article here. Use headings, links, lists, and blockquotes as needed.",
  });

  config.collections.splice(journalIndex, 1,
    nativeCollection(legacy, schema, global, localizedFields, "de"),
    nativeCollection(legacy, schema, global, localizedFields, "en"));
}

config.collections = config.collections.filter((collection) => collection.name !== "journal_bodies");
for (const collection of config.collections.filter((item) => ["journal_de", "journal_en"].includes(item.name))) {
  simplifyJournalCollection(collection);
}

fs.writeFileSync(configFile, yaml.dump(config, {
  noRefs: true,
  lineWidth: -1,
  quotingType: "'",
  forceQuotes: false,
}));

for (const name of fs.readdirSync(recordsDir).filter((item) => item.endsWith(".yaml")).sort()) {
  const file = path.join(recordsDir, name);
  const raw = yaml.load(fs.readFileSync(file, "utf8"));
  if (raw.de || raw.en) {
    for (const block of Object.values(raw).filter((value) => value && typeof value === "object")) {
      if (block.global) {
        delete block.global.route;
        delete block.global.sort_order;
        delete block.global.tally;
      }
      block.summary = block.summary || block.excerpt || block.homepage_excerpt;
      delete block.excerpt;
      delete block.title_html;
      delete block.homepage_title;
      delete block.homepage_excerpt;
      delete block.homepage_image_alt;
    }
    writeYaml(file, raw);
    continue;
  }
  const intended = raw.global?.intended_locales || Object.keys(raw.locales || {});
  const primaryLocale = intended[0] || "de";
  const blocks = {};
  for (const locale of intended) {
    const bodyFile = path.join(bodiesDir, `${raw.global.id}.${locale}.md`);
    if (!fs.existsSync(bodyFile)) throw new Error(`${path.relative(ROOT, bodyFile)} is required`);
    const localizedContent = {
      ...(raw.locales?.[locale] || {}),
      body: fs.readFileSync(bodyFile, "utf8").trim(),
    };
    localizedContent.summary = localizedContent.summary || localizedContent.excerpt || localizedContent.homepage_excerpt;
    delete localizedContent.excerpt;
    delete localizedContent.title_html;
    delete localizedContent.homepage_title;
    delete localizedContent.homepage_excerpt;
    delete localizedContent.homepage_image_alt;
    if (locale === primaryLocale) {
      const global = { ...raw.global, primary_locale: primaryLocale };
      delete global.intended_locales;
      delete global.route;
      delete global.sort_order;
      delete global.tally;
      blocks[locale] = { schema_version: 2, global, ...localizedContent };
    } else {
      blocks[locale] = localizedContent;
    }
  }
  writeYaml(file, blocks);
}

console.log("Migrated Journal to primary-language native i18n records with embedded article bodies.");
