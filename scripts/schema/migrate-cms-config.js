"use strict";

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const { PAGE_ROUTES, ROOT } = require("./lib");

const file = path.join(ROOT, "admin/config.yml");
const config = yaml.load(fs.readFileSync(file, "utf8"));

function cleanField(field) {
  const cleaned = { ...field };
  delete cleaned.i18n;
  if (Array.isArray(cleaned.fields)) cleaned.fields = cleaned.fields.map(cleanField);
  if (Array.isArray(cleaned.types)) cleaned.types = cleaned.types.map(cleanField);
  return cleaned;
}

function localeEnvelope(originalFields) {
  const fields = originalFields.map(cleanField);
  return {
    name: "locales",
    label: "Language content",
    widget: "object",
    collapsed: false,
    fields: [
      {
        name: "de",
        label: "German content",
        widget: "object",
        required: false,
        collapsed: true,
        hint: "Add only when German is listed under Intended locales.",
        fields,
      },
      {
        name: "en",
        label: "English content",
        widget: "object",
        required: false,
        collapsed: true,
        hint: "Add only when English is listed under Intended locales.",
        fields,
      },
    ],
  };
}

function intendedField(defaults = ["de", "en"]) {
  return {
    name: "intended_locales",
    label: "Intended locales",
    widget: "select",
    multiple: true,
    min: 1,
    options: [
      { label: "German", value: "de" },
      { label: "English", value: "en" },
    ],
    default: defaults,
    hint: "Must exactly match the language content objects added below.",
  };
}

function globalField(id, route, statuses, extras = [], editableId = false, intended = ["de", "en"]) {
  return {
    name: "global",
    label: "Shared settings",
    widget: "object",
    collapsed: false,
    fields: [
      {
        name: "id",
        label: "Stable ID",
        widget: editableId ? "string" : "hidden",
        default: id,
        hint: editableId ? "Lowercase letters and hyphens; must match the filename." : undefined,
      },
      intendedField(intended),
      {
        name: "status",
        label: "Status",
        widget: "select",
        options: statuses,
        default: statuses.includes("published") ? "published" : statuses[0],
      },
      ...(route === undefined ? [] : [{
        name: "route",
        label: "Canonical route",
        widget: route ? "hidden" : "string",
        default: route || undefined,
        hint: route ? undefined : "Start with / and keep existing public URLs stable.",
      }]),
      ...extras,
    ].map((entry) => Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined))),
  };
}

function envelopeFields(global, localizedFields) {
  return [
    { name: "schema_version", label: "Schema version", widget: "hidden", default: 2 },
    global,
    localeEnvelope(localizedFields),
  ];
}

const pages = config.collections.find((collection) => collection.name === "seiten");
delete pages.i18n;
for (const page of pages.files) {
  delete page.i18n;
  const route = PAGE_ROUTES[page.file.match(/([^/]+)\.yaml$/)[1]];
  page.fields = envelopeFields(
    globalField(page.file.match(/([^/]+)\.yaml$/)[1], route, ["draft", "published", "unlisted"]),
    page.fields,
  );
}

const website = config.collections.find((collection) => collection.name === "website");
delete website.i18n;
for (const entry of website.files) {
  delete entry.i18n;
  entry.fields = envelopeFields(
    globalField("site", undefined, ["published"]),
    entry.fields,
  );
}

const workshop = config.collections.find((collection) => collection.name === "workshops");
delete workshop.i18n;
workshop.identifier_field = "global.id";
workshop.summary = "{{global.id}}";
const workshopLocalNames = new Set([
  "title", "registration", "facts", "card", "hero", "description",
  "research", "image_band", "closing_cta", "facilitators", "faq", "meta",
]);
const workshopLocalized = workshop.fields.filter((field) => workshopLocalNames.has(field.name));
workshop.fields = envelopeFields(
  globalField("", "", ["draft", "upcoming", "current", "past", "unlisted"], [
    { name: "start_at", label: "Start date for sorting", widget: "datetime", required: false },
    { name: "sort_order", label: "Sort order when dates match", widget: "number", value_type: "int", required: false, min: 0 },
    { name: "detail_page", label: "Publish detail page", widget: "boolean", default: true },
    {
      name: "registration",
      label: "Shared registration",
      widget: "object",
      fields: [{ name: "url", label: "Registration link", widget: "string", required: false }],
    },
  ], true),
  workshopLocalized,
);

const journal = config.collections.find((collection) => collection.name === "journal");
delete journal.i18n;
journal.folder = "content/journal/records";
journal.extension = "yaml";
journal.format = "yaml";
journal.identifier_field = "global.id";
const journalGlobals = new Set(["language_mode", "date", "sort_order", "status", "image", "hero_image", "hero_variant", "tally", "body"]);
const journalLocalized = journal.fields.filter((field) => !journalGlobals.has(field.name));
journal.fields = envelopeFields(
  globalField("", "", ["published", "coming_soon", "unlisted"], [
    { name: "published_at", label: "Publication date", widget: "datetime" },
    { name: "sort_order", label: "Sort order when dates match", widget: "number", value_type: "int", required: false, min: 0 },
    {
      name: "image",
      label: "Shared card image",
      widget: "object",
      required: false,
      fields: [{ name: "src", label: "Image", widget: "image" }],
    },
    {
      name: "hero",
      label: "Shared hero media",
      widget: "object",
      required: false,
      fields: [
        { name: "image", label: "Hero image", widget: "object", fields: [{ name: "src", label: "Image", widget: "image" }] },
        { name: "variant", label: "Hero layout", widget: "select", options: ["cover", "contained"], default: "cover" },
      ],
    },
    { name: "tally", label: "Load Tally script", widget: "boolean", required: false, default: false },
  ], true),
  journalLocalized,
);

const legal = config.collections.find((collection) => collection.name === "rechtliches");
const legalFields = legal.files[0].fields.filter((field) => field.name !== "body");
delete legal.files;
legal.folder = "content/legal/records";
legal.extension = "yaml";
legal.format = "yaml";
legal.create = false;
legal.identifier_field = "global.id";
legal.fields = envelopeFields(
  globalField("", "", ["draft", "published"], [], true, ["de"]),
  legalFields,
);

config.collections.push({
  name: "journal_bodies",
  label: "Journal bodies",
  folder: "content/journal/bodies",
  create: false,
  extension: "md",
  format: "raw",
  fields: [{ name: "body", label: "Article body", widget: "markdown" }],
});
config.collections.push({
  name: "legal_bodies",
  label: "Legal bodies",
  folder: "content/legal/bodies",
  create: false,
  extension: "md",
  format: "raw",
  fields: [{ name: "body", label: "Legal text", widget: "markdown" }],
});

delete config.i18n;
config.output = {
  ...(config.output || {}),
  omit_empty_optional_fields: true,
};
fs.writeFileSync(file, yaml.dump(config, {
  noRefs: true,
  lineWidth: -1,
  quotingType: "'",
  forceQuotes: false,
}));
require("./promote-cms-globals");
console.log("Migrated admin/config.yml to the schema v2 envelope.");
