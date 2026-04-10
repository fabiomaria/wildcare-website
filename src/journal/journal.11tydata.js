module.exports = {
    layout: "layouts/article.njk",
    eleventyComputed: {
        permalink: (data) => {
            // data.page.filePathStem is like "/journal/de/warum-ci"
            const parts = data.page.filePathStem.split("/");
            const locale = parts[parts.length - 2]; // "de" or "en"
            const slug = parts[parts.length - 1];
            return locale === "de"
                ? `/journal/${slug}.html`
                : `/en/journal/${slug}.html`;
        },
    },
};
