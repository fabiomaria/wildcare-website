const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const outputDir = path.join(projectRoot, "_site");
const sitemap = fs.readFileSync(path.join(projectRoot, "sitemap.xml"), "utf8");
const publicUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

const requiredMetadata = [
  ["title", /<title>[^<]+<\/title>/],
  ["description", /<meta name="description" content="[^"]+">/],
  ["canonical URL", /<link rel="canonical" href="[^"]+">/],
  ["Open Graph type", /<meta property="og:type" content="[^"]+">/],
  ["Open Graph URL", /<meta property="og:url" content="[^"]+">/],
  ["Open Graph site name", /<meta property="og:site_name" content="Wild Care">/],
  ["Open Graph title", /<meta property="og:title" content="[^"]+">/],
  ["Open Graph description", /<meta property="og:description" content="[^"]+">/],
  ["Open Graph image", /<meta property="og:image" content="https:\/\/[^\"]+">/],
  ["Open Graph image width", /<meta property="og:image:width" content="\d+">/],
  ["Open Graph image height", /<meta property="og:image:height" content="\d+">/],
  ["Open Graph image description", /<meta property="og:image:alt" content="[^"]+">/],
  ["social card type", /<meta name="twitter:card" content="summary_large_image">/],
  ["social card title", /<meta name="twitter:title" content="[^"]+">/],
  ["social card description", /<meta name="twitter:description" content="[^"]+">/],
  ["social card image", /<meta name="twitter:image" content="https:\/\/[^\"]+">/],
  ["social card image description", /<meta name="twitter:image:alt" content="[^"]+">/],
];

for (const publicUrl of publicUrls) {
  const pathname = new URL(publicUrl).pathname;
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const html = fs.readFileSync(path.join(outputDir, relativePath), "utf8");

  for (const [label, pattern] of requiredMetadata) {
    if (!pattern.test(html)) {
      throw new Error(`${relativePath}: missing or empty ${label}`);
    }
  }

  const canonicalUrl = html.match(/<link rel="canonical" href="([^"]+)">/)[1];
  const openGraphUrl = html.match(/<meta property="og:url" content="([^"]+)">/)[1];
  if (canonicalUrl !== publicUrl || openGraphUrl !== publicUrl) {
    throw new Error(`${relativePath}: canonical and Open Graph URLs must match ${publicUrl}`);
  }
}

console.log(`SEO metadata valid for all ${publicUrls.length} sitemap URLs`);
