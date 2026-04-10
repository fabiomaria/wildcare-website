const yaml = require("js-yaml");

module.exports = function (eleventyConfig) {
    // YAML data file support
    eleventyConfig.addDataExtension("yml,yaml", (contents) =>
        yaml.load(contents)
    );

    // Passthrough copies — files copied as-is from src/ to _site/
    eleventyConfig.addPassthroughCopy("src/css");
    eleventyConfig.addPassthroughCopy("src/assets");
    eleventyConfig.addPassthroughCopy("src/js");
    eleventyConfig.addPassthroughCopy("src/admin");

    eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
    eleventyConfig.addPassthroughCopy("src/brand.html");

    // Collections — one per locale
    eleventyConfig.addCollection("journal_de", function (collectionApi) {
        return collectionApi.getFilteredByGlob("src/journal/de/*.md");
    });
    eleventyConfig.addCollection("journal_en", function (collectionApi) {
        return collectionApi.getFilteredByGlob("src/journal/en/*.md");
    });

    // head filter — first N elements of an array (negative = last N)
    eleventyConfig.addFilter("head", function (array, n) {
        if (!Array.isArray(array)) return [];
        if (n < 0) return array.slice(n);
        return array.slice(0, n);
    });

    // Date display filter — formats a JS Date as "Month YYYY"
    const MONTHS_DE = [
        "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember",
    ];
    const MONTHS_EN = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];
    eleventyConfig.addFilter("dateDisplay", function (date, locale) {
        if (!(date instanceof Date)) date = new Date(date);
        const months = locale === "en" ? MONTHS_EN : MONTHS_DE;
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    });

    return {
        dir: {
            input: "src",
            output: "_site",
            includes: "_includes",
            data: "_data",
        },
        templateFormats: ["njk", "md"],
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
    };
};
