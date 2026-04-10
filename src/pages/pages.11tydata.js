// Directory data cascade — applied to every .njk in src/pages/.
// Generates TWO outputs per template: one per locale.

module.exports = {
    layout: "layouts/page.njk",
    pagination: {
        data: "locales",
        size: 1,
        alias: "locale",
    },
    eleventyComputed: {
        permalink: (data) => {
            const slug = data.pageSlug;
            const locale = data.locale;
            if (!slug) return false; // skip if no slug set
            if (slug === "index") {
                return locale === "de" ? "/index.html" : "/en/index.html";
            }
            return locale === "de"
                ? `/${slug}.html`
                : `/en/${slug}.html`;
        },
    },
};
