"use strict";

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { ROOT } = require("./lib");

const file = path.join(ROOT, "admin/config.yml");
const config = yaml.load(fs.readFileSync(file, "utf8"));

function operational(field) {
  const key = field.name || "";
  if (["boolean", "number", "image", "file"].includes(field.widget)) return true;
  if (/(?:^|_)(?:alt|aria|label|title|heading|text|description|excerpt|bio|quote|address|date|price)$/.test(key)) return false;
  return [
    "src", "image", "video", "url", "href", "endpoint", "icon", "kind",
    "style", "variant", "focal_point", "currency", "capacity", "latitude", "longitude",
  ].includes(key) || /(?:_image|_video|_url|_href|_endpoint|_focus|_variant|_width|_height|_currency|_capacity)$/.test(key);
}

function splitField(field) {
  if (field.widget === "list") return { localized: field };
  if (field.widget === "object" && Array.isArray(field.fields)) {
    const globalFields = [];
    const localizedFields = [];
    for (const child of field.fields) {
      const split = splitField(child);
      if (split.global) globalFields.push(split.global);
      if (split.localized) localizedFields.push(split.localized);
    }
    const base = { ...field };
    delete base.fields;
    return {
      ...(globalFields.length ? { global: { ...base, fields: globalFields } } : {}),
      ...(localizedFields.length ? { localized: { ...base, fields: localizedFields } } : {}),
    };
  }
  return operational(field) ? { global: field } : { localized: field };
}

function mergeField(target, incoming) {
  const existing = target.find((field) => field.name === incoming.name);
  if (!existing) {
    target.push(incoming);
    return;
  }
  if (existing.widget === "object" && incoming.widget === "object") {
    for (const child of incoming.fields || []) mergeField(existing.fields, child);
  }
}

for (const collection of config.collections || []) {
  if (["journal_bodies", "legal_bodies"].includes(collection.name)) continue;
  for (const entry of collection.files || [collection]) {
    const root = new Map((entry.fields || []).map((field) => [field.name, field]));
    const global = root.get("global");
    const locales = root.get("locales");
    if (!global?.fields || !locales?.fields) continue;
    const localeObjects = locales.fields.filter((field) => ["de", "en"].includes(field.name));
    const sourceFields = localeObjects[0]?.fields || [];
    const promoted = [];
    const localized = [];
    for (const field of sourceFields) {
      const split = splitField(field);
      if (split.global) promoted.push(split.global);
      if (split.localized) localized.push(split.localized);
    }
    for (const field of promoted) mergeField(global.fields, field);
    for (const locale of localeObjects) locale.fields = structuredClone(localized);
  }
}

fs.writeFileSync(file, yaml.dump(config, {
  noRefs: true,
  lineWidth: -1,
  quotingType: "'",
  forceQuotes: false,
}));
console.log("Promoted operational CMS controls into each record's shared global section.");
