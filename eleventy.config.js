const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const yaml = require("js-yaml");
const MarkdownIt = require("markdown-it");
const nunjucks = require("nunjucks");
const {
  journalPairs,
  legalEntries,
  migrateJournalEntry,
  migrateLegalEntry,
  migrateYamlRecord,
  normalizeV2,
} = require("./scripts/schema/lib");

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
  const defaultTitle = source.title ? `${source.title} — Wild Care Journal` : "Wild Care Journal";
  return {
    ...source,
    meta: {
      ...meta,
      title: meta.title || defaultTitle,
      description: meta.description || source.meta_description || source.excerpt || "",
      og_title: meta.og_title || meta.title || defaultTitle,
      og_description: meta.og_description || meta.description || source.meta_description || source.excerpt || "",
      og_image: meta.og_image || source.image || "",
      og_image_alt: meta.og_image_alt || source.image_alt || "",
    },
  };
}

function v2LocalesForTemplates(raw, file) {
  const collection = file === "content/site.yaml" ? "site" : "pages";
  const source = raw?.schema_version === 2
    ? raw
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
      const raw = yaml.load(fs.readFileSync(recordFile, "utf8"));
      const normalized = normalizeV2(raw, path.relative(__dirname, recordFile));
      const id = normalized.global.id;
      const entry = { slug: id, global: normalized.global, locales: {} };
      for (const [locale, localized] of Object.entries(normalized.locales)) {
        const bodyFile = path.join(dir, "bodies", `${id}.${locale}.md`);
        if (!fs.existsSync(bodyFile)) throw new Error(`${path.relative(__dirname, bodyFile)} is required`);
        const body = fs.readFileSync(bodyFile, "utf8");
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
    const primaryRaw = deHasContent ? deRaw : enRaw;

    const de = normalizeJournalLocale(deHasContent ? deRaw : primaryRaw);
    const en = normalizeJournalLocale(enHasContent ? enRaw : primaryRaw);

    const post = {
      slug: entry.slug,
      href: `journal/${entry.slug}.html`,
      status: duplicateSource.status || "published",
      language_mode: duplicateSource.language_mode || (deHasContent && enHasContent ? "bilingual" : deHasContent ? "de_only" : "en_only"),
      date: duplicateSource.published_at || duplicateSource.date || deRaw.date || enRaw.date || "",
      sort_order: duplicateSource.sort_order || 999,
      image: duplicateSource.image?.src || duplicateSource.image || deRaw.image || enRaw.image || "",
      image_alt: duplicateSource.image_alt || primaryRaw.image_alt || "",
      homepage_image_alt: duplicateSource.homepage_image_alt || primaryRaw.homepage_image_alt || primaryRaw.image_alt || "",
      hero_image: duplicateSource.hero?.image?.src || duplicateSource.hero_image || duplicateSource.image?.src || duplicateSource.image || "",
      hero_alt: duplicateSource.hero_alt || primaryRaw.hero_alt || primaryRaw.image_alt || "",
      hero_variant: duplicateSource.hero?.variant || duplicateSource.hero_variant || "cover",
      tally: duplicateSource.tally || false,
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
    return a.sort_order - b.sort_order;
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
        raw: yaml.load(fs.readFileSync(recordFile, "utf8")),
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
      route: normalized.global.route,
      meta: deepMerge(legacyMeta, localized.meta || {}),
      body,
      body_html: markdown.render(body),
      body_html_fadeup: legalMarkdown.render(body),
    };
  }

  return pages;
}

function loadWorkshopContent() {
  const dir = path.join(__dirname, "content", "workshops");
  if (!fs.existsSync(dir)) {
    return { all: [], listed: [], pages: [] };
  }

  const all = fs.readdirSync(dir)
    .filter((filename) => filename.endsWith(".yaml"))
    .map((filename) => {
      const recordFile = path.join(dir, filename);
      const raw = yaml.load(fs.readFileSync(recordFile, "utf8"));
      const source = raw?.schema_version === 2 ? raw : migrateYamlRecord("workshops", recordFile);
      const normalized = normalizeV2(source, `content/workshops/${filename}`);
      const deSource = isObject(normalized.locales.de) ? templateLocale(normalized.global, normalized.locales.de) : {};
      const enSource = isObject(normalized.locales.en) ? templateLocale(normalized.global, normalized.locales.en) : {};
      const head = {
        slug: normalized.global.id,
        language_mode: normalized.global.intended_locales.length === 2
          ? "bilingual"
          : `${normalized.global.intended_locales[0]}_only`,
        status: normalized.global.status,
        detail_page: normalized.global.detail_page,
        start_date: normalized.global.start_at,
        sort_order: normalized.global.sort_order,
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
      return (a.sort_order || 999) - (b.sort_order || 999);
    });

  const hasListingTitle = (workshop) => Boolean(workshop.de.title || workshop.en.title);
  const current = all.filter((workshop) => workshop.status === "current" && hasListingTitle(workshop));
  const upcoming = all.filter((workshop) => workshop.status === "upcoming" && hasListingTitle(workshop));

  return {
    all,
    current,
    upcoming,
    listed: [...current, ...upcoming],
    pages: all.filter((workshop) => workshop.has_detail_page),
  };
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
  eleventyConfig.addPassthroughCopy({ "sitemap.xml": "sitemap.xml" });
  for (const page of PASSTHROUGH_PAGES) {
    eleventyConfig.addPassthroughCopy({ [page]: page });
  }

  // CMS-managed content (content/**/*.yaml) → global data `cms`.
  // content/site.yaml → cms.site; content/pages/foo.yaml → cms.pages.foo
  // v2 journal/legal metadata records and separately stored Markdown bodies.
  eleventyConfig.addGlobalData("cms", () => {
    const root = path.join(__dirname, "content");
    const data = { pages: {} };
    const load = (p) => yaml.load(fs.readFileSync(p, "utf8"));
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
    data.legal = loadLegalContent();
    return data;
  });
  eleventyConfig.addGlobalData("journalArticlePages", () => loadJournalContent().articlePages);
  eleventyConfig.addGlobalData("workshopPages", () => loadWorkshopContent().pages);
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
