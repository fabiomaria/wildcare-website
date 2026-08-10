"use strict";

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { ROOT, writeYaml } = require("./lib");

const configFile = path.join(ROOT, "admin/config.yml");
const config = yaml.load(fs.readFileSync(configFile, "utf8"));
const index = config.collections.findIndex((collection) => collection.name === "workshops");
const legacy = config.collections[index];

function clone(value) { return value === undefined ? value : JSON.parse(JSON.stringify(value)); }
function clean(field) {
  const result = clone(field);
  delete result.i18n;
  if (result.fields) result.fields = result.fields.map(clean);
  if (result.types) result.types = result.types.map(clean);
  return result;
}
function localized(field) {
  const result = clean(field);
  result.i18n = true;
  return result;
}

const schema = legacy.fields.find((field) => field.name === "schema_version");
const global = clean(legacy.fields.find((field) => field.name === "global"));
global.fields = global.fields.filter((field) => !["intended_locales", "route", "sort_order"].includes(field.name));
global.fields.splice(1, 0, {
  name: "primary_locale",
  label: "Primary language",
  widget: "select",
  options: [
    { label: "German primary", value: "de" },
    { label: "English primary", value: "en" },
  ],
  default: "de",
  hint: "Determines which CMS collection exposes this entry. Keep the primary language first in the saved file.",
});
global.i18n = false;
schema.i18n = false;
const locales = legacy.fields.find((field) => field.name === "locales");
const localizedFields = locales.fields.find((field) => field.name === "de").fields.map(localized);

function collection(name, label, locale) {
  return {
    ...clone(legacy),
    name,
    label,
    i18n: {
      structure: "single_file",
      locales: locale === "de" ? ["de", "en"] : ["en", "de"],
      default_locale: locale,
      initial_locales: "default",
    },
    filter: { field: "global.primary_locale", value: locale },
    fields: [clone(schema), clone(global), ...clone(localizedFields)],
  };
}

config.collections.splice(index, 1,
  collection("workshops_de", "Workshops — German primary", "de"),
  collection("workshops_en", "Workshops — English primary", "en"));

for (const name of fs.readdirSync(path.join(ROOT, "content/workshops")).filter((item) => item.endsWith(".yaml")).sort()) {
  const file = path.join(ROOT, "content/workshops", name);
  const raw = yaml.load(fs.readFileSync(file, "utf8"));
  if (raw.de || raw.en) continue;
  const intended = raw.global?.intended_locales || [];
  const primaryLocale = intended.includes("de") ? "de" : "en";
  const blocks = {};
  blocks[primaryLocale] = {
    schema_version: 2,
    global: { ...raw.global, primary_locale: primaryLocale },
    ...(raw.locales?.[primaryLocale] || {}),
  };
  delete blocks[primaryLocale].global.intended_locales;
  delete blocks[primaryLocale].global.route;
  delete blocks[primaryLocale].global.sort_order;
  for (const locale of ["de", "en"]) {
    if (locale !== primaryLocale && raw.locales?.[locale] && Object.keys(raw.locales[locale]).length) {
      blocks[locale] = clone(raw.locales[locale]);
    }
  }
  writeYaml(file, blocks);
}

fs.writeFileSync(configFile, yaml.dump(config, { noRefs: true, lineWidth: -1, quotingType: "'", forceQuotes: false }));
console.log("Migrated workshops to German-primary and English-primary native i18n collections.");
