const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const MarkdownIt = require("markdown-it");
const nunjucks = require("nunjucks");
const {
  journalPairs,
  legalEntries,
  migrateJournalEntry,
  migrateLegalEntry,
  migrateYamlRecord,
  normalizeNativeI18nRecord,
  normalizeCalendarRecord,
  normalizeV2,
  parseYaml,
} = require("./scripts/schema/lib");
const calendar = require("./lib/calendar");
const { deriveDatedStatus, deriveWorkshopStatus, finalSessionEnd, localMinute } = require("./lib/calendar/lifecycle");

function loadYamlFile(file) {
  return parseYaml(fs.readFileSync(file, "utf8"));
}

// Pages not yet templatized are passthrough-copied verbatim (brief §7 Phase 1/2:
// incremental migration — remove a page from this list when its template ships).
const PASSTHROUGH_PAGES = [
  "brand.html",
];

const markdown = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
});

const richTextMarkdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});

function escapeHtmlAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMonth(dateInput, locale) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(defaults, localized) {
  if (!defaults || typeof defaults !== "object" || Array.isArray(defaults)) {
    return localized === undefined ? defaults : localized;
  }
  const merged = { ...defaults };
  if (!localized || typeof localized !== "object" || Array.isArray(localized)) {
    return merged;
  }
  for (const [key, value] of Object.entries(localized)) {
    if (Array.isArray(value)) {
      merged[key] = value;
    } else if (value && typeof value === "object") {
      merged[key] = deepMerge(merged[key] || {}, value);
    } else if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }
  return merged;
}

function templateLocale(global, localized) {
  const shared = { ...(global || {}) };
  for (const key of [
    "id", "intended_locales", "status", "route", "start_at",
    "published_at", "sort_order", "detail_page",
  ]) delete shared[key];
  return deepMerge(shared, localized || {});
}

function plainText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRichText(value) {
  if (hasText(value)) return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => isObject(item) ? item.text : item)
    .filter(hasText)
    .join("\n\n");
}

function normalizeJournalLocale(locale) {
  const source = isObject(locale) ? locale : {};
  const meta = isObject(source.meta) ? source.meta : {};
  const summary = source.summary || source.excerpt || source.homepage_excerpt || "";
  const defaultTitle = source.title ? `${source.title} — Wild Care Journal` : "Wild Care Journal";
  return {
    ...source,
    excerpt: summary,
    homepage_title: source.title || "",
    homepage_excerpt: summary,
    homepage_image_alt: source.image_alt || "",
    meta: {
      ...meta,
      title: meta.title || defaultTitle,
      description: meta.description || source.meta_description || summary,
      og_title: meta.og_title || meta.title || defaultTitle,
      og_description: meta.og_description || meta.description || source.meta_description || summary,
      og_image: meta.og_image || source.image?.src || source.image || "",
      og_image_alt: meta.og_image_alt || source.image_alt || "",
    },
  };
}

function v2LocalesForTemplates(raw, file) {
  const collection = file === "content/site.yaml" ? "site" : "pages";
  const adapted = normalizeNativeI18nRecord(raw);
  const source = adapted?.schema_version === 2
    ? adapted
    : migrateYamlRecord(collection, path.join(__dirname, file));
  const normalized = normalizeV2(source, file);
  return {
    ...Object.fromEntries(Object.entries(normalized.locales)
      .map(([locale, localized]) => [locale, templateLocale(normalized.global, localized)])),
    global: normalized.global,
    schemaVersion: normalized.schemaVersion,
    availableLocales: normalized.availableLocales,
    primaryLocale: normalized.primaryLocale,
  };
}

function normalizeWorkshopLocale(locale) {
  const source = isObject(locale) ? locale : {};
  const card = isObject(source.card) ? source.card : {};
  const hero = isObject(source.hero) ? source.hero : {};
  const practice = isObject(source.practice) ? source.practice : null;
  const info = isObject(source.info) ? source.info : null;
  const description = isObject(source.description) ? source.description : (practice || info ? {
    label: practice?.label || "",
    heading: practice?.heading || "",
    paragraphs: practice?.paragraphs || [],
    show_info: info?.enabled ?? Boolean(info),
    info_title: info?.title || "",
  } : null);
  const imageBand = isObject(source.image_band) ? source.image_band : null;
  const meta = isObject(source.meta) ? source.meta : {};
  const title = source.title || card.title || source.nav?.breadcrumb || hero.heading_text || plainText(hero.heading);
  const summary = card.summary || hero.subtitle || "";
  const registration = {
    ...(source.registration || {}),
    label: source.registration?.label || hero.cta_label || info?.cta_label || card.register_label || "",
    note: source.registration?.note || hero.cta_note || "",
  };

  return {
    ...source,
    title,
    registration,
    description: description ? {
      ...description,
      body: normalizeRichText(description.body || description.paragraphs),
    } : null,
    facts: isObject(source.facts) ? source.facts : {
      date: card.date || hero.details?.find((detail) => detail.icon === "calendar")?.text || "",
      time: hero.details?.find((detail) => detail.icon === "clock")?.text || "",
      location: card.location || hero.details?.find((detail) => detail.icon === "location")?.text || "",
      price: card.price || hero.details?.find((detail) => detail.icon === "cost")?.text || "",
      duration: card.duration || "",
      format: (info?.rows?.find((row) => row.icon === "plus")?.values || []).map((value) => ({ value })),
      schedule: (info?.rows?.find((row) => row.icon === "calendar")?.values || []).map((value) => ({ value })),
      price_details: (info?.rows?.find((row) => row.icon === "cost")?.values || []).map((value) => ({ value })),
    },
    card,
    hero: {
      ...hero,
      headline: hero.headline || hero.heading || title,
      show_details: hero.show_details ?? Boolean(hero.details?.length),
    },
    info: info ? {
      ...info,
      enabled: info.enabled ?? true,
    } : null,
    image_band: imageBand ? {
      ...imageBand,
      body: normalizeRichText(imageBand.body || imageBand.text),
    } : null,
    meta: {
      ...meta,
      title: meta.title || (title ? `${title} | Wild Care` : ""),
      description: meta.description || summary,
      og_title: meta.og_title || title,
      og_description: meta.og_description || meta.description || summary,
      og_image: meta.og_image || hero.main_image || "",
      og_image_alt: meta.og_image_alt || hero.main_alt || "",
    },
  };
}

function hasWorkshopDetailContent(locale) {
  // Both retired layouts required meta+hero plus one substantial body
  // section; with a single unified template (Task 5 amendment) neither
  // practice/info nor research is universally authored (Bewegungsrevolution
  // has no practice/info, Cellular Touch has no dedicated research-only
  // requirement either) — accept any one of the optional body sections
  // as evidence the detail page has real content beyond the programme card.
  return Boolean(
    locale?.title &&
    locale?.hero?.headline &&
    (
      locale?.description?.heading ||
      locale?.description?.show_info ||
      locale?.research?.heading ||
      locale?.facilitators?.members?.length ||
      locale?.testimonials?.items?.length ||
      locale?.faq?.items?.length
    )
  );
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\.html$/i, "");
}

// Drop a trailing `.html` from an internal URL so the site links to and
// canonicalises the extension-less form (GitHub Pages serves `foo.html` at
// `/foo`). Files on disk keep their `.html` names; only the visible URL changes.
function stripHtmlExt(url) {
  return String(url || "").replace(/\.html(?=$|[#?])/i, "");
}

function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || /^(https?:|mailto:|#|\/)/i.test(raw)) {
    return raw;
  }
  return raw.includes(".") && !raw.includes(" ") ? `https://${raw}` : raw;
}

function resolveNavigationUrl(value, pathPrefix = "") {
  const url = String(value || "").trim();
  if (!url) return "#";
  if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(url)) return url;
  return `${pathPrefix || ""}${stripHtmlExt(url)}`;
}

function absoluteSiteUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  try {
    return stripHtmlExt(new URL(url, "https://wildcare.space/").href);
  } catch {
    return stripHtmlExt(url);
  }
}

function loadJournalContent() {
  const dir = path.join(__dirname, "content", "journal");
  const entries = new Map();

  if (!fs.existsSync(dir)) {
    return { posts: [], listingPosts: [], articlePages: [], homepagePosts: [] };
  }

  const recordsDir = path.join(dir, "records");
  if (fs.existsSync(recordsDir)) {
    for (const filename of fs.readdirSync(recordsDir).filter((name) => name.endsWith(".yaml")).sort()) {
      const recordFile = path.join(recordsDir, filename);
      const raw = loadYamlFile(recordFile);
      const normalized = normalizeV2(normalizeNativeI18nRecord(raw), path.relative(__dirname, recordFile));
      const id = normalized.global.id;
      const entry = { slug: id, global: normalized.global, locales: {} };
      for (const [locale, localized] of Object.entries(normalized.locales)) {
        const body = localized.body || "";
        entry.locales[locale] = {
          ...templateLocale(normalized.global, localized),
          body: body.trim(),
          body_html: markdown.render(body.trim()),
        };
      }
      entries.set(id, entry);
    }
  } else {
    for (const [id, pair] of journalPairs()) {
      const migrated = migrateJournalEntry(id, pair);
      const normalized = normalizeV2(migrated.record, `content/journal/${id}`);
      const entry = { slug: id, global: normalized.global, locales: {} };
      for (const [locale, localized] of Object.entries(normalized.locales)) {
        const body = migrated.parsed[locale].content;
        entry.locales[locale] = {
          ...templateLocale(normalized.global, localized),
          body: body.trim(),
          body_html: markdown.render(body.trim()),
        };
      }
      entries.set(id, entry);
    }
  }

  const posts = Array.from(entries.values()).map((entry) => {
    const duplicateSource = entry.global || entry.locales.de || entry.locales.en || {};
    const deRaw = entry.locales.de || {};
    const enRaw = entry.locales.en || {};
    const deHasContent = hasText(deRaw.title) || hasText(deRaw.body);
    const enHasContent = hasText(enRaw.title) || hasText(enRaw.body);
    const primaryLocale = entry.global.primary_locale || (deHasContent ? "de" : "en");
    const primaryRaw = primaryLocale === "en" ? enRaw : deRaw;

    const de = normalizeJournalLocale(deHasContent ? deRaw : primaryRaw);
    const en = normalizeJournalLocale(enHasContent ? enRaw : primaryRaw);

    const post = {
      slug: entry.slug,
      href: `journal/${entry.slug}.html`,
      status: duplicateSource.status || "published",
      primary_locale: primaryLocale,
      language_mode: duplicateSource.language_mode || (deHasContent && enHasContent ? "bilingual" : deHasContent ? "de_only" : "en_only"),
      date: duplicateSource.published_at || duplicateSource.date || deRaw.date || enRaw.date || "",
      image: duplicateSource.image?.src || duplicateSource.image || deRaw.image || enRaw.image || "",
      image_alt: duplicateSource.image_alt || primaryRaw.image_alt || "",
      homepage_image_alt: duplicateSource.homepage_image_alt || primaryRaw.homepage_image_alt || primaryRaw.image_alt || "",
      hero_image: duplicateSource.hero?.image?.src || duplicateSource.hero_image || duplicateSource.image?.src || duplicateSource.image || "",
      hero_alt: duplicateSource.hero_alt || primaryRaw.hero_alt || primaryRaw.image_alt || "",
      hero_variant: duplicateSource.hero?.variant || duplicateSource.hero_variant || "cover",
      tally: Boolean(duplicateSource.tally || Object.values(entry.locales).some((locale) =>
        locale.cta?.buttons?.some((button) => button.kind === "tally"))),
      has_de: deHasContent,
      has_en: enHasContent,
      de,
      en,
    };

    const publishedDate = new Date(post.date);
    post.date_iso = Number.isNaN(publishedDate.getTime()) ? "" : publishedDate.toISOString();

    post.de.date_label = formatMonth(post.date, "de-AT");
    post.en.date_label = formatMonth(post.date, "en");
    post.has_article_page = (post.status === "published" || post.status === "unlisted") && (hasText(de.body) || hasText(en.body));
    post.available_locales = [
      ...(deHasContent && hasText(de.body) ? ["de"] : []),
      ...(enHasContent && hasText(en.body) ? ["en"] : []),
    ];
    return post;
  });

  posts.sort((a, b) => {
    const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (byDate !== 0) return byDate;
    return a.slug.localeCompare(b.slug);
  });

  const articlePages = posts.filter((post) => post.has_article_page);
  for (const post of posts) {
    post.related = articlePages.filter((related) => related.slug !== post.slug).slice(0, 2);
  }

  return {
    posts,
    listingPosts: posts.filter((post) => post.status === "published" || post.status === "coming_soon"),
    articlePages,
    homepagePosts: posts.filter((post) => post.status === "published" || post.status === "coming_soon").slice(0, 3),
  };
}

const legalMarkdown = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
});
// Legal prose is hand-authored HTML with per-element scroll-fade-in classes;
// match that structure so migrated pages stay pixel-identical to the original.
function addFadeUpClass(tokens, idx, options, env, self) {
  tokens[idx].attrJoin("class", "fade-up");
  return self.renderToken(tokens, idx, options);
}
legalMarkdown.renderer.rules.heading_open = addFadeUpClass;
legalMarkdown.renderer.rules.paragraph_open = addFadeUpClass;
legalMarkdown.renderer.rules.bullet_list_open = addFadeUpClass;

function loadLegalContent() {
  const dir = path.join(__dirname, "content", "legal");
  const pages = {};

  if (!fs.existsSync(dir)) {
    return pages;
  }

  const recordsDir = path.join(dir, "records");
  const inputs = fs.existsSync(recordsDir)
    ? fs.readdirSync(recordsDir).filter((name) => name.endsWith(".yaml")).sort().map((filename) => {
      const recordFile = path.join(recordsDir, filename);
      return {
        raw: loadYamlFile(recordFile),
        file: path.relative(__dirname, recordFile),
        body: null,
      };
    })
    : legalEntries().map(([id, sourceFile]) => {
      const migrated = migrateLegalEntry(id, sourceFile);
      return { raw: migrated.record, file: path.relative(__dirname, sourceFile), body: migrated.parsed.content };
    });
  for (const input of inputs) {
    const normalized = normalizeV2(input.raw, input.file);
    const slug = normalized.global.id;
    const locale = normalized.primaryLocale;
    const localized = templateLocale(normalized.global, normalized.locales[locale]);
    const bodyFile = path.join(dir, "bodies", `${slug}.${locale}.md`);
    const body = (input.body ?? fs.readFileSync(bodyFile, "utf8")).trim();
    const legacyMeta = {
      title: localized.meta_title || "",
      description: localized.meta_description || "",
    };
    pages[slug] = {
      ...localized,
      status: normalized.global.status,
      route: normalized.global.route || `/${slug}`,
      meta: deepMerge(legacyMeta, localized.meta || {}),
      body,
      body_html: markdown.render(body),
      body_html_fadeup: legalMarkdown.render(body),
    };
  }

  return pages;
}

function loadWorkshopContent({ now = new Date() } = {}) {
  const dir = path.join(__dirname, "content", "workshops");
  if (!fs.existsSync(dir)) {
    return { all: [], current: [], upcoming: [], past: [], listed: [], pages: [] };
  }

  const nowLocal = localMinute(now);

  const all = fs.readdirSync(dir)
    .filter((filename) => filename.endsWith(".yaml"))
    .map((filename) => {
      const recordFile = path.join(dir, filename);
      const raw = loadYamlFile(recordFile);
      const adapted = normalizeNativeI18nRecord(raw);
      const source = adapted?.schema_version === 2 ? adapted : migrateYamlRecord("workshops", recordFile);
      const normalized = normalizeV2(source, `content/workshops/${filename}`);
      const deSource = isObject(normalized.locales.de) ? templateLocale(normalized.global, normalized.locales.de) : {};
      const enSource = isObject(normalized.locales.en) ? templateLocale(normalized.global, normalized.locales.en) : {};
      const configuredStatus = normalized.global.status;
      const schedule = normalized.global.schedule;
      const head = {
        slug: normalized.global.id,
        language_mode: normalized.global.intended_locales.length === 2
          ? "bilingual"
          : `${normalized.global.intended_locales[0]}_only`,
        status: deriveWorkshopStatus(configuredStatus, schedule, nowLocal),
        configured_status: configuredStatus,
        detail_page: normalized.global.detail_page,
        start_date: normalized.global.start_at,
        end_date: finalSessionEnd(schedule),
        registration_url: normalized.global.registration?.url,
      };
      const deRaw = { ...deSource };
      const enRaw = { ...enSource };
      const slug = normalizeSlug(head.slug || path.basename(filename, ".yaml"));
      const languageMode = head.language_mode || "bilingual";
      let de = deRaw;
      let en = enRaw;

      // A mono-lingual v2 record has no compatibility locale in storage. The
      // template receives a render-only alias because its data attributes are
      // inert on forced-language pages; available locale derivation still
      // comes exclusively from `locales`.
      if (languageMode === "en_only") de = enRaw;
      if (languageMode === "de_only") en = deRaw;
      de = normalizeWorkshopLocale(de);
      en = normalizeWorkshopLocale(en);
      const primaryLocale = languageMode === "en_only" ? "en" : "de";
      const primaryData = primaryLocale === "en" ? en : de;
      const hasDetailPage = head.detail_page !== false && head.status !== "draft" && hasWorkshopDetailContent(primaryData);
      return {
        ...head,
        slug,
        language_mode: languageMode,
        has_de: languageMode !== "en_only",
        has_en: languageMode !== "de_only",
        has_detail_page: hasDetailPage,
        primary_locale: primaryLocale,
        registration_url: normalizeExternalUrl(head.registration_url),
        de,
        en,
        href: `${slug}.html`,
      };
    })
    .sort((a, b) => {
      const byDate = new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
      if (byDate !== 0) return byDate;
      return a.slug.localeCompare(b.slug);
    });

  const hasListingTitle = (workshop) => Boolean(workshop.de.title || workshop.en.title);
  const current = all.filter((workshop) => workshop.status === "current" && hasListingTitle(workshop));
  const upcoming = all.filter((workshop) => workshop.status === "upcoming" && hasListingTitle(workshop));
  const past = all
    .filter((workshop) => workshop.status === "past" && hasListingTitle(workshop))
    .sort((a, b) => {
      const byDate = String(b.end_date || b.start_date || "").localeCompare(String(a.end_date || a.start_date || ""));
      return byDate || a.slug.localeCompare(b.slug);
    });

  return {
    all,
    current,
    upcoming,
    past,
    listed: [...current, ...upcoming],
    pages: all.filter((workshop) => workshop.has_detail_page),
  };
}

function loadVenues() {
  const dir = path.join(__dirname, "content", "venues");
  const venues = {};
  if (!fs.existsSync(dir)) return venues;
  for (const filename of fs.readdirSync(dir).filter((name) => name.endsWith(".yaml")).sort()) {
    const global = loadYamlFile(path.join(dir, filename)).global;
    venues[global.id] = global;
  }
  return venues;
}

// Items with these configured statuses keep their detail page and per-event
// .ics (so the page's own "Add to Calendar" button still works) but are kept
// out of the public subscribable master feed (wildcare.ics).
const HIDDEN_FROM_MASTER_FEED = new Set(["unlisted", "draft"]);

function loadCalendar() {
  const venues = loadVenues();
  const definitions = [];
  const statusById = {};
  for (const collection of ["workshops", "events", "pages"]) {
    const dir = path.join(__dirname, "content", collection);
    if (!fs.existsSync(dir)) continue;
    for (const filename of fs.readdirSync(dir).filter((name) => name.endsWith(".yaml")).sort()) {
      const raw = normalizeCalendarRecord(normalizeNativeI18nRecord(loadYamlFile(path.join(dir, filename))));
      if (raw?.global?.schedule) {
        const def = calendar.toDefinition(raw, { venues });
        statusById[def.id] = raw.global.status;
        definitions.push(def);
      }
    }
  }
  definitions.sort((a, b) => a.id.localeCompare(b.id));
  const feedDefinitions = definitions.filter((def) => !HIDDEN_FROM_MASTER_FEED.has(statusById[def.id]));
  return { venues, definitions, pages: definitions, feedDefinitions, byId: Object.fromEntries(definitions.map((def) => [def.id, def])) };
}

function loadEventContent() {
  const dir = path.join(__dirname, "content", "events");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith(".yaml")).sort().map((filename) => {
    const raw = loadYamlFile(path.join(dir, filename));
    const global = raw.global;
    const primary = global.intended_locales?.[0] || "de";
    return {
      slug: global.id, route: global.route || `/events/${global.id}`, page_mode: global.page_mode || "minimal",
      related_workshop: global.related_workshop || null,
      configured_status: global.status,
      event_type: global.event_type || "event",
      primary_locale: primary, de: raw.locales?.de || {}, en: raw.locales?.en || {},
      href: `events/${global.id}.html`,
    };
  });
}

function loadPastEventContent(cal, { now = new Date() } = {}) {
  const nowLocal = localMinute(now);
  return loadEventContent()
    .map((event) => {
      const def = cal.byId[event.slug];
      if (!def || def.mode !== "dates") return null;
      const schedule = { mode: def.mode, sessions: def.sessions };
      const status = deriveDatedStatus(event.configured_status, schedule, nowLocal);
      const de = Object.keys(event.de).length ? event.de : event.en;
      const en = Object.keys(event.en).length ? event.en : event.de;
      return {
        ...event,
        status,
        de,
        en,
        end_date: def.span.end,
        date: {
          de: calendar.formatDateRange(def.span.start, def.span.end, "de"),
          en: calendar.formatDateRange(def.span.start, def.span.end, "en"),
        },
        venue_name: def.venue.name,
      };
    })
    .filter((event) => event && event.status === "past" && (event.de.title || event.en.title))
    .sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)) || a.slug.localeCompare(b.slug));
}

function loadMontagskursFeatured(cal) {
  const def = cal.byId.montagskurs;
  if (!def) return [];
  return (def.featured || []).map((occurrence) => ({
    date: occurrence.id, teacher: occurrence.teacher, start_local: occurrence.start_local,
    end_local: occurrence.end_local,
    date_label_de: calendar.formatNextOccurrence(def.recurrence.weekday, occurrence.start_local, "de"),
    date_label_en: calendar.formatNextOccurrence(def.recurrence.weekday, occurrence.start_local, "en"),
    time_label: `${occurrence.start_local.slice(11, 16)}–${occurrence.end_local.slice(11, 16)}`,
    note_de: occurrence.note_de || "",
    note_en: occurrence.note_en || "",
    href: `montagskurs/${occurrence.id}.html`, def,
  }));
}

function nowLocalString(date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const hour = parts.hour === "24" ? "00" : parts.hour; // Intl hour12:false quirk on some ICU builds
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

function buildUpcomingCard({ def, kind, occurrence }) {
  const isRecurringKind = kind === "montagskurs" || kind === "featured";

  const dateLabel = isRecurringKind
    ? {
        de: calendar.formatNextOccurrence(def.recurrence.weekday, occurrence.start_local, "de"),
        en: calendar.formatNextOccurrence(def.recurrence.weekday, occurrence.start_local, "en"),
      }
    : {
        de: calendar.formatDateRange(def.span.start, def.span.end, "de"),
        en: calendar.formatDateRange(def.span.start, def.span.end, "en"),
      };

  const timeLabel = isRecurringKind
    ? `${def.recurrence.start_time}–${def.recurrence.end_time}`
    : def.sessions.length === 1
      ? `${def.sessions[0].start_local.slice(11, 16)}–${def.sessions[0].end_local.slice(11, 16)}`
      : null;

  const title = isRecurringKind
    ? null
    : {
        de: def.locales.de?.title || def.locales.en?.title || def.id,
        en: def.locales.en?.title || def.locales.de?.title || def.id,
      };

  let subtitle = null;
  if (kind === "featured") {
    const override = (def.overrides || []).find((item) => item.id === occurrence.id);
    const noteDe = override?.note_de;
    const noteEn = override?.note_en;
    if (noteDe || noteEn) subtitle = { de: noteDe || noteEn, en: noteEn || noteDe };
  } else if (def.locales.de?.subtitle || def.locales.en?.subtitle) {
    subtitle = { de: def.locales.de?.subtitle || def.locales.en?.subtitle, en: def.locales.en?.subtitle || def.locales.de?.subtitle };
  }

  return {
    kind,
    id: kind === "featured" ? `${def.id}-${occurrence.id}` : def.id,
    title,
    subtitle,
    dateLabel,
    timeLabel,
    venueName: def.venue.name,
    detailHref: kind === "featured" ? `/montagskurs/${occurrence.id}` : def.route,
    icsHref: `/calendar/${def.id}.ics`,
    teacher: occurrence?.teacher || null,
  };
}

function loadUpcomingItems(cal, workshopContent, { limit = 6, now = new Date() } = {}) {
  const statusById = new Map();
  for (const w of workshopContent.all) {
    statusById.set(w.slug, { status: w.status, includable: w.has_detail_page });
  }
  const eventsDir = path.join(__dirname, "content", "events");
  if (fs.existsSync(eventsDir)) {
    for (const filename of fs.readdirSync(eventsDir).filter((f) => f.endsWith(".yaml"))) {
      const raw = loadYamlFile(path.join(eventsDir, filename));
      statusById.set(raw.global.id, { status: raw.global.status, includable: true });
    }
  }
  const montagskursPath = path.join(__dirname, "content", "pages", "montagskurs.yaml");
  if (fs.existsSync(montagskursPath)) {
    const raw = normalizeNativeI18nRecord(loadYamlFile(montagskursPath));
    statusById.set(raw.global.id, { status: raw.global.status, includable: true });
  }

  const nowLocal = nowLocalString(now);
  const selected = calendar.selectUpcomingItems(cal.definitions, { nowLocal, statusById, limit });
  return selected.map(buildUpcomingCard);
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));
  eleventyConfig.addFilter("attr", (value) => new nunjucks.runtime.SafeString(escapeHtmlAttr(value)));
  eleventyConfig.addFilter("richText", (value) => new nunjucks.runtime.SafeString(richTextMarkdown.render(String(value || ""))));
  eleventyConfig.addFilter("navigationUrl", resolveNavigationUrl);
  eleventyConfig.addFilter("absoluteSiteUrl", absoluteSiteUrl);
  eleventyConfig.addFilter("cleanUrl", stripHtmlExt);

  // Static assets, untouched per the brief (§3).
  eleventyConfig.addPassthroughCopy({ "css": "css" });
  eleventyConfig.addPassthroughCopy({ "js": "js" });
  eleventyConfig.addPassthroughCopy({ "assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ ".nojekyll": ".nojekyll" });
  eleventyConfig.addPassthroughCopy({ "robots.txt": "robots.txt" });
  for (const page of PASSTHROUGH_PAGES) {
    eleventyConfig.addPassthroughCopy({ [page]: page });
  }

  // CMS-managed content (content/**/*.yaml) → global data `cms`.
  // content/site.yaml → cms.site; content/pages/foo.yaml → cms.pages.foo
  // v2 journal/legal metadata records and separately stored Markdown bodies.
  eleventyConfig.addGlobalData("cms", () => {
    const root = path.join(__dirname, "content");
    const data = { pages: {} };
    const load = loadYamlFile;
    if (fs.existsSync(path.join(root, "site.yaml"))) {
      data.site = v2LocalesForTemplates(load(path.join(root, "site.yaml")), "content/site.yaml");
    }
    const pagesDir = path.join(root, "pages");
    if (fs.existsSync(pagesDir)) {
      for (const f of fs.readdirSync(pagesDir)) {
        if (f.endsWith(".yaml")) {
          const raw = load(path.join(pagesDir, f));
          data.pages[path.basename(f, ".yaml")] = v2LocalesForTemplates(raw, `content/pages/${f}`);
        }
      }
    }
    data.journal = loadJournalContent();
    data.workshops = loadWorkshopContent();
    data.events = { past: loadPastEventContent(loadCalendar()) };
    data.past_projects = [
      ...data.workshops.past.map((item) => ({ ...item, archive_kind: "workshop" })),
      ...data.events.past.map((item) => ({ ...item, archive_kind: "event" })),
    ].sort((a, b) =>
      String(b.end_date || b.start_date || "").localeCompare(String(a.end_date || a.start_date || ""))
      || a.slug.localeCompare(b.slug));
    data.legal = loadLegalContent();
    return data;
  });
  eleventyConfig.addGlobalData("journalArticlePages", () => loadJournalContent().articlePages);
  eleventyConfig.addGlobalData("workshopPages", () => loadWorkshopContent().pages);
  const calendarData = loadCalendar();
  eleventyConfig.addGlobalData("calendar", () => calendarData);
  eleventyConfig.addGlobalData("eventPages", () => loadEventContent());
  eleventyConfig.addGlobalData("montagskursFeatured", () => loadMontagskursFeatured(calendarData));
  eleventyConfig.addGlobalData("upcomingItems", () => loadUpcomingItems(calendarData, loadWorkshopContent()));
  eleventyConfig.addFilter("eventJsonLd", (def) => def.mode === "recurring"
    ? calendar.recurringJsonLd(def, { locale: def.primaryLocale })
    : calendar.eventJsonLd(def, { locale: def.primaryLocale }));
  eleventyConfig.addFilter("featuredOccurrenceJsonLd", (occurrence) => {
    const locale = occurrence.def.primaryLocale;
    const sourceLocale = occurrence.def.locales[locale] || {};
    const title = locale === "en" ? "Monday Class" : "Montagskurs";
    const dateLabel = locale === "en" ? occurrence.date_label_en : occurrence.date_label_de;
    const description = locale === "en" ? occurrence.note_en : occurrence.note_de;
    return calendar.eventJsonLd({
      ...occurrence.def,
      route: `/montagskurs/${occurrence.date}`,
      mode: "dates",
      recurrence: undefined,
      locales: { ...occurrence.def.locales, [locale]: {
        ...sourceLocale,
        title: `${title}${occurrence.teacher ? (locale === "en" ? ` with ${occurrence.teacher}` : ` mit ${occurrence.teacher}`) : ""} — ${dateLabel}`,
        summary: description,
      } },
      sessions: [{ id: occurrence.date, start_local: occurrence.start_local, end_local: occurrence.end_local }],
      span: { start: occurrence.start_local, end: occurrence.end_local },
    }, { locale });
  });
  eleventyConfig.addFilter("calendarGoogleUrl", (def) => {
    const locale = def.locales[def.primaryLocale] || {};
    const location = `${def.venue.name}, ${def.venue.street}, ${def.venue.postal_code} ${def.venue.city}`;
    if (def.mode === "recurring") {
      const first = calendar.expandRecurrence(def.recurrence, { from: def.recurrence.anchor, to: def.recurrence.anchor })[0];
      return calendar.googleUrl({ title: locale.title, details: locale.summary || "", location, start_local: first.start_local, end_local: first.end_local });
    }
    return calendar.googleUrl({ title: locale.title, details: locale.summary || "", location, start_local: def.span.start, end_local: def.span.end });
  });
  eleventyConfig.addFilter("perEventIcs", (def) => def.mode === "recurring"
    ? calendar.buildCalendar(calendar.recurringVevents(def)) : calendar.perEventCalendar(def));
  eleventyConfig.addFilter("masterIcs", (defs) => calendar.masterFeed(defs));
  eleventyConfig.addFilter("formatDefDate", (def, locale) => def.mode === "recurring"
    ? calendar.formatRecurring(def.recurrence, locale) : calendar.formatDateRange(def.span.start, def.span.end, locale));
  eleventyConfig.addFilter("formatDefTime", (def) => def.mode === "recurring"
    ? `${def.recurrence.start_time}–${def.recurrence.end_time}`
    : def.sessions && def.sessions.length === 1
      ? `${def.sessions[0].start_local.slice(11, 16)}–${def.sessions[0].end_local.slice(11, 16)}`
      : "");
  eleventyConfig.addGlobalData("assetVersion", () => {
    const css = fs.readFileSync(path.join(__dirname, "css", "styles.css"));
    return crypto.createHash("sha256").update(css).digest("hex").slice(0, 12);
  });
  eleventyConfig.addWatchTarget("content/");
  eleventyConfig.addWatchTarget("css/styles.css");

  return {
    dir: {
      input: "site",
      output: "_site",
      includes: "_includes",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
