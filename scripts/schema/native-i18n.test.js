"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeNativeI18nRecord } = require("./lib");

const primary = (locale, title, extra = {}) => ({
  [locale]: {
    schema_version: 2,
    global: { id: "example", status: "published", route: "/example" },
    title,
    ...extra,
  },
});

test("passes an existing schema-v2 envelope through unchanged", () => {
  const envelope = { schema_version: 2, global: { id: "x" }, locales: { en: { title: "X" } } };
  assert.strictEqual(normalizeNativeI18nRecord(envelope), envelope);
});

test("normalizes German-only native records", () => {
  assert.deepEqual(normalizeNativeI18nRecord(primary("de", "Deutsch")), {
    schema_version: 2,
    global: { id: "example", status: "published", route: "/example", intended_locales: ["de"] },
    locales: { de: { title: "Deutsch" } },
  });
});

test("normalizes English-only native records", () => {
  assert.deepEqual(normalizeNativeI18nRecord(primary("en", "English")), {
    schema_version: 2,
    global: { id: "example", status: "published", route: "/example", intended_locales: ["en"] },
    locales: { en: { title: "English" } },
  });
});

test("keeps bilingual locale order primary-first", () => {
  const record = {
    ...primary("en", "English"),
    de: { title: "Deutsch" },
  };
  const normalized = normalizeNativeI18nRecord(record);
  assert.deepEqual(normalized.global.intended_locales, ["en", "de"]);
  assert.deepEqual(Object.keys(normalized.locales), ["en", "de"]);
});

test("omits empty optional translation blocks", () => {
  const record = { ...primary("de", "Deutsch"), en: { title: "" } };
  assert.deepEqual(normalizeNativeI18nRecord(record).global.intended_locales, ["de"]);
  assert.deepEqual(normalizeNativeI18nRecord(record).locales, { de: { title: "Deutsch" } });
});

test("does not mutate native input and is idempotent", () => {
  const record = { ...primary("de", "Deutsch"), en: { title: "English" } };
  const first = normalizeNativeI18nRecord(record);
  assert.deepEqual(record.de.global, { id: "example", status: "published", route: "/example" });
  assert.deepEqual(normalizeNativeI18nRecord(first), first);
});

test("rejects conflicting duplicated global values", () => {
  const record = { ...primary("de", "Deutsch"), en: {
    global: { status: "draft" },
    title: "English",
  } };
  assert.throws(() => normalizeNativeI18nRecord(record), /conflicting global\.status/);
});

test("rejects ambiguous mixed-shape records", () => {
  const record = { ...primary("de", "Deutsch"), route: "/elsewhere" };
  assert.throws(() => normalizeNativeI18nRecord(record), /mixes locale blocks/);
});
