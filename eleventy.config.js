const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

// Pages not yet templatized are passthrough-copied verbatim (brief §7 Phase 1/2:
// incremental migration — remove a page from this list when its template ships).
const PASSTHROUGH_PAGES = [
  "bewegungsrevolution.html",
  "brand.html",
  "cellular-touch.html",
  "datenschutz.html",
  "impressum.html",
  "journal.html",
  "mitmachen.html",
  "montagskurs.html",
  "programm.html",
];

module.exports = function (eleventyConfig) {
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  // Static assets, untouched per the brief (§3).
  eleventyConfig.addPassthroughCopy({ "css": "css" });
  eleventyConfig.addPassthroughCopy({ "js": "js" });
  eleventyConfig.addPassthroughCopy({ "assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "journal": "journal" });
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
    return data;
  });
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
