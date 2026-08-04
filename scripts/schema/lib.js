"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const matter = require("gray-matter");

const ROOT = path.resolve(__dirname, "../..");
const LOCALES = ["de", "en"];
const COLLECTIONS = ["workshops", "site", "pages", "journal", "legal", "venues", "events"];
const PAGE_ROUTES = {
  index: "/",
  kontakt: "/kontakt",
  team: "/team",
  journal: "/journal",
  programm: "/programm",
  montagskurs: "/montagskurs",
  mitmachen: "/mitmachen",
};

const FLOATING_LOCAL_WITH_OPTIONAL_SECONDS = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/;

// Sveltia's datetime widget may serialize a local datetime with seconds even
// though the content contract stores floating-local values at minute precision.
// Normalize that harmless representation at the read boundary so CMS saves do
// not make the deploy fail. The source YAML is intentionally left untouched.
function normalizeCalendarRecord(record) {
  if (!isObject(record) || record.schema_version !== 2) return record;
  const global = record.global;
  const schedule = global?.schedule;
  if (!isObject(global) || !isObject(schedule) || !Array.isArray(schedule.sessions)) return record;

  for (const session of schedule.sessions) {
    if (!isObject(session)) continue;
    for (const key of ["start_local", "end_local"]) {
      const match = typeof session[key] === "string"
        ? session[key].match(FLOATING_LOCAL_WITH_OPTIONAL_SECONDS)
        : null;
      if (match) session[key] = `${match[1]}T${match[2]}`;
    }
  }

  const starts = schedule.sessions
    .map((session) => session?.start_local)
    .filter((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    .sort();
  if (starts.length && (global.start_at === undefined || global.start_at === null || global.start_at === "")) {
    global.start_at = `${starts[0]}:00.000Z`;
  }
  if ((global.updated_at === undefined || global.updated_at === null || global.updated_at === "") && global.start_at) {
    global.updated_at = global.start_at instanceof Date ? global.start_at.toISOString() : String(global.start_at);
  }
  return record;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeNativeI18nRecord(record) {
  // Application consumers may also call this function with an already
  // normalized record. Keep that object byte-for-byte equivalent and avoid
  // treating the `de`/`en` fields inside its `locales` map as native blocks.
  if (!isObject(record) || record.schema_version === 2) return record;

  const topLevelKeys = Object.keys(record);
  const localeEntries = topLevelKeys
    .filter((locale) => LOCALES.includes(locale) && isObject(record[locale]))
    .map((locale) => [locale, record[locale]]);

  // A record with no native locale blocks is still allowed through here: the
  // legacy migration path handles those records. Once a record looks like a
  // native record, however, silently accepting a malformed primary block can
  // make a save appear successful while dropping shared settings.
  if (!localeEntries.length) return record;
  const unsupported = topLevelKeys.filter((key) => !LOCALES.includes(key));
  if (unsupported.length) {
    throw new Error(`native i18n record mixes locale blocks with top-level fields: ${unsupported.join(", ")}`);
  }

  const primaryEntries = localeEntries.filter(([, value]) =>
    value.schema_version === 2 && isObject(value.global));
  if (!primaryEntries.length) {
    throw new Error("native i18n record must have one locale block containing schema_version: 2 and global");
  }
  const [primaryLocale, primary] = primaryEntries[0];
  if (primaryEntries.length > 1) {
    throw new Error(`native i18n record has multiple primary locales: ${primaryEntries.map(([locale]) => locale).join(", ")}`);
  }

  // Sveltia keeps shared fields in the primary locale, but hand-edited files
  // sometimes duplicate them in another block. Identical duplicates are
  // harmless; conflicting duplicates are ambiguous and must not be merged.
  for (const [locale, value] of localeEntries) {
    if (locale === primaryLocale) continue;
    if (value.schema_version !== undefined && value.schema_version !== primary.schema_version) {
      throw new Error(`native i18n record has conflicting schema_version in ${locale}`);
    }
    if (value.global !== undefined) {
      if (!isObject(value.global)) throw new Error(`native i18n record has invalid global in ${locale}`);
      for (const [key, sharedValue] of Object.entries(value.global)) {
        if (key === "intended_locales") continue;
        if (primary.global[key] !== undefined && !deepEqual(primary.global[key], sharedValue)) {
          throw new Error(`native i18n record has conflicting global.${key} between ${primaryLocale} and ${locale}`);
        }
      }
    }
  }

  const locales = {};
  for (const [locale, value] of localeEntries) {
    const localized = { ...value };
    delete localized.schema_version;
    delete localized.global;
    const cleaned = omitEmpty(localized);
    if (cleaned) locales[locale] = cleaned;
  }

  return {
    schema_version: 2,
    global: {
      ...primary.global,
      intended_locales: Object.keys(locales),
    },
    locales,
  };
}

function readYaml(file) {
  return normalizeCalendarRecord(normalizeNativeI18nRecord(yaml.load(fs.readFileSync(file, "utf8"))));
}

function writeYaml(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, yaml.dump(value, {
    noRefs: true,
    lineWidth: -1,
    quotingType: "'",
    forceQuotes: false,
  }));
}

function stableJson(value) {
  const order = (input) => {
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) return input.map(order);
    if (!isObject(input)) return input;
    return Object.fromEntries(Object.keys(input).sort().map((key) => [key, order(input[key])]));
  };
  return `${JSON.stringify(order(value), null, 2)}\n`;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stableJson(value));
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function omitEmpty(value) {
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map(omitEmpty).filter((item) => item !== undefined);
  }
  if (isObject(value)) {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      const cleaned = omitEmpty(item);
      if (cleaned !== undefined) result[key] = cleaned;
    }
    return Object.keys(result).length ? result : undefined;
  }
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (value === null || value === undefined) return undefined;
  return value;
}

function availableLocales(locales) {
  return LOCALES.filter((locale) => isObject(locales?.[locale]) && Object.keys(locales[locale]).length);
}

function intendedFromMode(mode, locales) {
  if (mode === "de_only") return ["de"];
  if (mode === "en_only") return ["en"];
  const available = availableLocales(locales);
  return available.length ? available : ["de"];
}

function envelope(global, locales) {
  const cleanedLocales = {};
  for (const locale of LOCALES) {
    const cleaned = omitEmpty(locales?.[locale]);
    if (cleaned && Object.keys(cleaned).length) cleanedLocales[locale] = cleaned;
  }
  return promoteGlobalFields({ schema_version: 2, global: omitEmpty(global), locales: cleanedLocales });
}

function operationalLeaf(pathParts, value) {
  const key = pathParts.at(-1) || "";
  if (typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value !== "string") return false;
  if (/(?:^|_)(?:alt|aria|label|title|heading|text|description|excerpt|bio|quote|address|date|price)$/.test(key)) return false;
  return [
    "src", "image", "video", "url", "href", "endpoint", "icon", "kind", "style", "variant",
    "focal_point", "currency", "capacity", "latitude", "longitude",
  ].includes(key) || /(?:_image|_video|_url|_href|_endpoint|_focus|_variant|_width|_height|_currency|_capacity)$/.test(key);
}

function setPath(object, parts, value) {
  let cursor = object;
  for (const part of parts.slice(0, -1)) {
    if (!isObject(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

function deletePath(object, parts) {
  const stack = [];
  let cursor = object;
  for (const part of parts) {
    if (!isObject(cursor) || !(part in cursor)) return;
    stack.push([cursor, part]);
    cursor = cursor[part];
  }
  const [parent, key] = stack.pop();
  delete parent[key];
  while (stack.length) {
    const [ancestor, childKey] = stack.pop();
    if (isObject(ancestor[childKey]) && !Object.keys(ancestor[childKey]).length) delete ancestor[childKey];
    else break;
  }
}

function promoteGlobalFields(record) {
  if (!isObject(record?.global) || !isObject(record?.locales)) return record;
  const localeNames = Object.keys(record.locales);
  function visit(parts) {
    const values = localeNames.map((locale) => {
      let cursor = record.locales[locale];
      for (const part of parts) cursor = isObject(cursor) ? cursor[part] : undefined;
      return cursor;
    });
    const defined = values.filter((value) => value !== undefined);
    if (!defined.length || defined.some(Array.isArray)) return;
    if (defined.some((value) => isObject(value))) {
      const keys = new Set(defined.filter(isObject).flatMap((value) => Object.keys(value)));
      for (const key of keys) visit([...parts, key]);
      return;
    }
    if (!operationalLeaf(parts, defined[0])) return;
    if (!defined.every((value) => deepEqual(value, defined[0]))) return;
    setPath(record.global, parts, defined[0]);
    for (const locale of localeNames) deletePath(record.locales[locale], parts);
  }
  const roots = new Set(localeNames.flatMap((locale) => Object.keys(record.locales[locale] || {})));
  for (const key of roots) visit([key]);
  record.global = omitEmpty(record.global) || {};
  for (const locale of localeNames) {
    record.locales[locale] = omitEmpty(record.locales[locale]) || {};
  }
  return record;
}

function assertV2(record, file) {
  if (!isObject(record) || record.schema_version !== 2 || !isObject(record.global) || !isObject(record.locales)) {
    throw new Error(`${file}: unknown input shape; expected a schema v1 record or the schema v2 envelope`);
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { positionals: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args.positionals.push(token);
    } else {
      const name = token.slice(2);
      if (["check", "write", "all", "fixtures", "force"].includes(name)) args[name] = true;
      else args[name] = argv[++index];
    }
  }
  return args;
}

function selectedCollections(args) {
  if (args.all) return COLLECTIONS;
  if (!args.collection || !COLLECTIONS.includes(args.collection)) {
    throw new Error(`Choose --collection ${COLLECTIONS.join("|")} or use --all`);
  }
  return [args.collection];
}

function normalizeV2(record, file = "<record>") {
  record = normalizeCalendarRecord(normalizeNativeI18nRecord(record));
  assertV2(record, file);
  const locales = {};
  for (const locale of Object.keys(record.locales)) {
    if (isObject(record.locales[locale]) && Object.keys(record.locales[locale]).length) {
      locales[locale] = record.locales[locale];
    }
  }
  const available = Object.keys(locales);
  return {
    schemaVersion: 2,
    global: record.global,
    locales,
    availableLocales: available,
    primaryLocale: available[0] || null,
  };
}

function loadV2Yaml(file) {
  return normalizeV2(readYaml(file), path.relative(ROOT, file));
}

function listYaml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith(".yaml")).sort()
    .map((name) => path.join(dir, name));
}

function deepEqual(a, b) {
  return stableJson(a) === stableJson(b);
}

function deepMerge(defaults, localized) {
  if (!isObject(defaults)) return localized === undefined ? defaults : localized;
  const merged = { ...defaults };
  if (!isObject(localized)) return merged;
  for (const [key, value] of Object.entries(localized)) {
    if (Array.isArray(value)) merged[key] = value;
    else if (isObject(value)) merged[key] = deepMerge(merged[key] || {}, value);
    else if (value !== undefined && value !== null) merged[key] = value;
  }
  return merged;
}

function localizedView(record, locale) {
  const shared = { ...(record.global || {}) };
  for (const key of [
    "id", "intended_locales", "status", "route", "start_at",
    "published_at", "sort_order", "detail_page",
  ]) delete shared[key];
  return deepMerge(shared, record.locales?.[locale] || {});
}

function removeKeys(object, keys) {
  const result = { ...(object || {}) };
  for (const key of keys) delete result[key];
  return result;
}

function migrateYamlRecord(collection, file) {
  const raw = readYaml(file);
  if (raw?.schema_version === 2) return promoteGlobalFields(raw);
  const id = path.basename(file, ".yaml");

  if (collection === "site") {
    const locales = { de: raw.de, en: raw.en };
    return envelope({
      id: "site",
      intended_locales: availableLocales(locales),
      status: "published",
    }, locales);
  }

  if (collection === "pages") {
    if (!(id in PAGE_ROUTES) || !isObject(raw.de)) {
      throw new Error(`${path.relative(ROOT, file)}: unknown fixed-page v1 shape`);
    }
    const locales = { de: raw.de, en: raw.en };
    return envelope({
      id,
      intended_locales: availableLocales(locales),
      status: "published",
      route: PAGE_ROUTES[id],
    }, locales);
  }

  if (collection === "workshops") {
    const de = isObject(raw.de) ? raw.de : {};
    const en = isObject(raw.en) ? raw.en : {};
    const headKeys = [
      "slug", "language_mode", "status", "detail_page",
      "start_date", "sort_order", "registration_url",
    ];
    const head = {};
    for (const key of headKeys) head[key] = raw[key] ?? de[key] ?? en[key];
    const slug = head.slug || id;
    const locales = {
      de: removeKeys(de, headKeys),
      en: removeKeys(en, headKeys),
    };
    const intended = intendedFromMode(head.language_mode, locales);
    for (const locale of LOCALES) {
      if (!intended.includes(locale)) delete locales[locale];
    }
    return envelope({
      id: slug,
      intended_locales: intended,
      status: head.status || "draft",
      route: `/${slug}`,
      start_at: head.start_date || undefined,
      sort_order: head.sort_order ?? undefined,
      detail_page: head.detail_page ?? true,
      registration: head.registration_url ? { url: head.registration_url } : undefined,
    }, locales);
  }

  throw new Error(`${path.relative(ROOT, file)}: unsupported YAML collection ${collection}`);
}

function journalPairs() {
  const dir = path.join(ROOT, "content/journal");
  const entries = new Map();
  if (!fs.existsSync(dir)) return entries;
  for (const name of fs.readdirSync(dir).filter((item) => item.endsWith(".md")).sort()) {
    const match = name.match(/^(.+?)(?:\.(en))?\.md$/);
    if (!match || name.includes(".de.")) continue;
    const id = match[1];
    const locale = match[2] || "de";
    if (!entries.has(id)) entries.set(id, {});
    entries.get(id)[locale] = path.join(dir, name);
  }
  return entries;
}

const JOURNAL_GLOBAL_KEYS = [
  "language_mode", "date", "sort_order", "status", "image", "hero_image",
  "hero_variant", "tally",
];

function migrateJournalEntry(id, pair) {
  const parsed = {};
  for (const locale of LOCALES) {
    if (pair[locale]) parsed[locale] = matter(fs.readFileSync(pair[locale], "utf8"));
  }
  const primary = parsed.de || parsed.en;
  if (!primary) throw new Error(`content/journal/${id}: no journal locale found`);
  for (const key of JOURNAL_GLOBAL_KEYS.filter((item) => item !== "language_mode")) {
    const values = Object.values(parsed).map((entry) => entry.data[key]).filter((value) => value !== undefined);
    if (values.length > 1 && !values.every((value) => deepEqual(value, values[0]))) {
      throw new Error(`content/journal/${id}: shared field journal.global.${key} differs between locales`);
    }
  }
  const locales = {};
  for (const locale of LOCALES) {
    if (!parsed[locale]) continue;
    locales[locale] = removeKeys(parsed[locale].data, JOURNAL_GLOBAL_KEYS);
  }
  const intended = intendedFromMode(primary.data.language_mode, locales);
  const global = {
    id,
    intended_locales: intended,
    status: primary.data.status || "published",
    route: `/journal/${id}`,
    published_at: primary.data.date,
    sort_order: primary.data.sort_order ?? undefined,
    image: primary.data.image ? { src: primary.data.image } : undefined,
    hero: primary.data.hero_image ? {
      image: { src: primary.data.hero_image },
      variant: primary.data.hero_variant || "cover",
    } : undefined,
    tally: primary.data.tally ?? undefined,
  };
  return { record: envelope(global, locales), parsed };
}

function legalEntries() {
  const dir = path.join(ROOT, "content/legal");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith(".md")).sort()
    .map((name) => [path.basename(name, ".md"), path.join(dir, name)]);
}

function migrateLegalEntry(id, file) {
  const parsed = matter(fs.readFileSync(file, "utf8"));
  const status = parsed.data.status || "published";
  const localized = removeKeys(parsed.data, ["status", "route"]);
  return {
    record: envelope({
      id,
      intended_locales: ["de"],
      status,
      route: parsed.data.route || `/${id}`,
    }, { de: localized }),
    parsed,
  };
}

function contentFilesFor(collection) {
  if (collection === "site") return [path.join(ROOT, "content/site.yaml")];
  if (collection === "pages") {
    return listYaml(path.join(ROOT, "content/pages")).filter((file) => path.basename(file) !== "cellular-touch.yaml");
  }
  if (collection === "workshops") return listYaml(path.join(ROOT, "content/workshops"));
  if (collection === "venues") return listYaml(path.join(ROOT, "content/venues"));
  if (collection === "events") return listYaml(path.join(ROOT, "content/events"));
  if (collection === "journal") return listYaml(path.join(ROOT, "content/journal/records"));
  if (collection === "legal") return listYaml(path.join(ROOT, "content/legal/records"));
  return [];
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

module.exports = {
  COLLECTIONS,
  JOURNAL_GLOBAL_KEYS,
  LOCALES,
  PAGE_ROUTES,
  ROOT,
  assertV2,
  availableLocales,
  contentFilesFor,
  deepMerge,
  deepEqual,
  envelope,
  hash,
  isObject,
  journalPairs,
  legalEntries,
  listYaml,
  localizedView,
  loadV2Yaml,
  migrateJournalEntry,
  migrateLegalEntry,
  migrateYamlRecord,
  normalizeNativeI18nRecord,
  normalizeCalendarRecord,
  normalizeV2,
  omitEmpty,
  promoteGlobalFields,
  parseArgs,
  readYaml,
  relative,
  selectedCollections,
  stableJson,
  writeJson,
  writeYaml,
};
