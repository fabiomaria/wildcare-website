"use strict";

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { ROOT, writeYaml } = require("./lib");

const configFile = path.join(ROOT, "admin/config.yml");
const config = yaml.load(fs.readFileSync(configFile, "utf8"));
const prefixes = {
  workshops_de: "",
  workshops_en: "",
  events: "/events",
  rechtliches: "",
};

for (const collection of config.collections) {
  if (!(collection.name in prefixes)) continue;
  const global = collection.fields?.find((field) => field.name === "global");
  if (!global) continue;
  global.fields = global.fields.filter((field) => !["route", "sort_order"].includes(field.name));
  const id = global.fields.find((field) => field.name === "id");
  if (!id) continue;
  const prefix = prefixes[collection.name];
  id.label = "URL slug";
  id.hint = `Lowercase letters and hyphens only. This creates ${prefix || ""}/your-slug and must match the filename.`;
}

fs.writeFileSync(configFile, yaml.dump(config, {
  noRefs: true,
  lineWidth: -1,
  quotingType: "'",
  forceQuotes: false,
}));

for (const name of fs.readdirSync(path.join(ROOT, "content/workshops")).filter((item) => item.endsWith(".yaml")).sort()) {
  const file = path.join(ROOT, "content/workshops", name);
  const raw = yaml.load(fs.readFileSync(file, "utf8"));
  for (const block of Object.values(raw).filter((value) => value && typeof value === "object" && value.global)) {
    delete block.global.route;
    delete block.global.sort_order;
  }
  writeYaml(file, raw);
}

for (const directory of ["events", "legal/records"]) {
  const dir = path.join(ROOT, "content", directory);
  for (const name of fs.readdirSync(dir).filter((item) => item.endsWith(".yaml")).sort()) {
    const file = path.join(dir, name);
    const raw = yaml.load(fs.readFileSync(file, "utf8"));
    delete raw.global.route;
    delete raw.global.sort_order;
    writeYaml(file, raw);
  }
}

console.log("Simplified URL and ordering fields across workshops, events, and legal pages.");
