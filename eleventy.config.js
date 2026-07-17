const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");
const nunjucks = require("nunjucks");

// Pages not yet templatized are passthrough-copied verbatim (brief §7 Phase 1/2:
// incremental migration — remove a page from this list when its template ships).
const PASSTHROUGH_PAGES = [
  "bewegungsrevolution.html",
  "brand.html",
  "impressum.html",
];

const markdown = new MarkdownIt({
  html: true,
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

function mergeLocale(defaults, localized) {
  return {
    ...defaults,
    ...localized,
    cta: {
      ...(defaults.cta || {}),
      ...(localized.cta || {}),
    },
  };
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

function hasWorkshopContent(locale) {
  return Boolean(
    locale &&
    (
      locale.card?.title ||
      locale.meta?.title ||
      locale.hero?.heading ||
      locale.practice?.heading
    )
  );
}

function hasWorkshopDetailContent(locale) {
  return Boolean(
    locale?.meta?.title &&
    locale?.hero?.heading &&
    locale?.practice?.heading &&
    locale?.info?.title
  );
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\.html$/i, "");
}

function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || /^(https?:|mailto:|#|\/)/i.test(raw)) {
    return raw;
  }
  return raw.includes(".") && !raw.includes(" ") ? `https://${raw}` : raw;
}

function loadJournalContent() {
  const dir = path.join(__dirname, "content", "journal");
  const entries = new Map();

  if (!fs.existsSync(dir)) {
    return { posts: [], listingPosts: [], articlePages: [], homepagePosts: [] };
  }

  for (const filename of fs.readdirSync(dir)) {
    if (!filename.endsWith(".md")) continue;

    const stem = path.basename(filename, ".md");
    const locale = stem.endsWith(".en") ? "en" : "de";
    const slug = locale === "en" ? stem.slice(0, -3) : stem;

    // Phase 0 round-trip files are intentionally left in working trees but
    // must never leak into the generated public journal.
    if (slug.startsWith("phase0-")) continue;

    const parsed = matter(fs.readFileSync(path.join(dir, filename), "utf8"));
    if (!entries.has(slug)) {
      entries.set(slug, { slug, locales: {} });
    }
    entries.get(slug).locales[locale] = {
      ...parsed.data,
      body: parsed.content.trim(),
      body_html: markdown.render(parsed.content.trim()),
    };
  }

  const posts = Array.from(entries.values()).map((entry) => {
    const duplicateSource = entry.locales.de || entry.locales.en || {};
    const deRaw = entry.locales.de || {};
    const enRaw = entry.locales.en || {};
    const deHasContent = hasText(deRaw.title) || hasText(deRaw.body);
    const enHasContent = hasText(enRaw.title) || hasText(enRaw.body);
    const fallbackLocale = deHasContent ? deRaw : enRaw;

    const de = mergeLocale(fallbackLocale, deRaw);
    const en = mergeLocale(fallbackLocale, enRaw);

    const post = {
      slug: entry.slug,
      href: `journal/${entry.slug}.html`,
      status: duplicateSource.status || "published",
      language_mode: duplicateSource.language_mode || (deHasContent && enHasContent ? "bilingual" : deHasContent ? "de_only" : "en_only"),
      date: duplicateSource.date || deRaw.date || enRaw.date || "",
      sort_order: duplicateSource.sort_order || 999,
      image: duplicateSource.image || deRaw.image || enRaw.image || "",
      image_alt: duplicateSource.image_alt || deRaw.image_alt || enRaw.image_alt || "",
      homepage_image_alt: duplicateSource.homepage_image_alt || deRaw.homepage_image_alt || enRaw.homepage_image_alt || duplicateSource.image_alt || "",
      hero_image: duplicateSource.hero_image || duplicateSource.image || "",
      hero_alt: duplicateSource.hero_alt || duplicateSource.image_alt || "",
      hero_variant: duplicateSource.hero_variant || "cover",
      tally: duplicateSource.tally || false,
      has_de: deHasContent,
      has_en: enHasContent,
      de,
      en,
    };

    post.de.date_label = formatMonth(post.date, "de-AT");
    post.en.date_label = formatMonth(post.date, "en");
    post.has_article_page = post.status === "published" && (hasText(de.body) || hasText(en.body));
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

  for (const filename of fs.readdirSync(dir)) {
    if (!filename.endsWith(".md")) continue;
    const slug = path.basename(filename, ".md");
    const parsed = matter(fs.readFileSync(path.join(dir, filename), "utf8"));
    const body = parsed.content.trim();
    pages[slug] = {
      ...parsed.data,
      body,
      // Plain rendering (no per-element classes) for pages whose original
      // markup wraps the whole prose block in one fade-up container.
      body_html: markdown.render(body),
      // Per-element fade-up rendering for pages whose original markup put
      // class="fade-up" on every individual heading/paragraph/list.
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
      const workshop = yaml.load(fs.readFileSync(path.join(dir, filename), "utf8"));
      const slug = normalizeSlug(workshop.slug || path.basename(filename, ".yaml"));
      const languageMode = workshop.language_mode || "bilingual";
      const deRaw = isObject(workshop.de) ? workshop.de : {};
      const enRaw = isObject(workshop.en) ? workshop.en : {};
      const preferred = languageMode === "en_only" ? enRaw : deRaw;
      const alternate = languageMode === "en_only" ? deRaw : enRaw;
      const fallback = hasWorkshopContent(preferred) ? preferred : alternate;
      const de = deepMerge(fallback, deRaw);
      const en = deepMerge(fallback, enRaw);
      const primaryLocale = languageMode === "en_only" ? "en" : "de";
      const primaryData = primaryLocale === "en" ? en : de;
      const hasDetailPage = workshop.detail_page !== false && workshop.status !== "draft" && hasWorkshopDetailContent(primaryData);
      return {
        ...workshop,
        slug,
        language_mode: languageMode,
        has_de: languageMode !== "en_only",
        has_en: languageMode !== "de_only",
        has_detail_page: hasDetailPage,
        primary_locale: primaryLocale,
        registration_url: normalizeExternalUrl(workshop.registration_url),
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

  return {
    all,
    listed: all.filter((workshop) => (workshop.status === "upcoming" || workshop.status === "current") && (workshop.de.card?.title || workshop.en.card?.title)),
    pages: all.filter((workshop) => workshop.has_detail_page),
  };
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));
  eleventyConfig.addFilter("attr", (value) => new nunjucks.runtime.SafeString(escapeHtmlAttr(value)));

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
  // content/journal/*.md → cms.journal (paired DE/EN Markdown files)
  eleventyConfig.addGlobalData("cms", () => {
    const root = path.join(__dirname, "content");
    const data = { pages: {} };
    const load = (p) => yaml.load(fs.readFileSync(p, "utf8"));
    if (fs.existsSync(path.join(root, "site.yaml"))) {
      data.site = load(path.join(root, "site.yaml"));
    }
    const pagesDir = path.join(root, "pages");
    if (fs.existsSync(pagesDir)) {
      for (const f of fs.readdirSync(pagesDir)) {
        if (f.endsWith(".yaml")) {
          data.pages[path.basename(f, ".yaml")] = load(path.join(pagesDir, f));
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
  eleventyConfig.addWatchTarget("content/");

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
