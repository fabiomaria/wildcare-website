// One-time migration: move workshop head fields (slug, status, dates, …)
// from the top level into the default locale block, matching the shape
// Sveltia's single_file i18n writes (frozen in the 2026-07-18 spike). Also
// reshapes content for the unified template (2026-07-18 amendment):
// facilitator → facilitators (list), team → facilitators, testimonial →
// testimonials (list); drops layout_variant/quote/archive_cta/funded_by/footer,
// retired along with the archive layout.
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const HEAD_KEYS = [
  "slug", "language_mode", "status", "detail_page",
  "start_date", "sort_order", "registration_url",
];
const DROPPED_LOCALE_KEYS = ["quote", "archive_cta", "funded_by", "footer"];

function reshapeLocale(locale) {
  if (!locale) return locale;
  const out = { ...locale };
  for (const key of DROPPED_LOCALE_KEYS) delete out[key];
  if (out.facilitator && !out.facilitators) {
    const f = out.facilitator;
    out.facilitators = {
      label: f.label || "",
      heading: "",
      members: [{ name: f.name, image: f.image, alt: f.image_alt, role: f.role, bio: f.bio }],
    };
    delete out.facilitator;
  }
  if (out.team && !out.facilitators) {
    out.facilitators = out.team;
    delete out.team;
  }
  if (out.testimonial && !out.testimonials) {
    const t = out.testimonial;
    out.testimonials = { label: "", heading: "", items: [{ quote: t.quote, author: t.author }] };
    delete out.testimonial;
  }
  return out;
}

const dir = path.join(__dirname, "..", "content", "workshops");
for (const filename of fs.readdirSync(dir)) {
  if (!filename.endsWith(".yaml")) continue;
  const file = path.join(dir, filename);
  // CORE_SCHEMA keeps dates like `2026-08-08` as plain strings.
  const data = yaml.load(fs.readFileSync(file, "utf8"), { schema: yaml.CORE_SCHEMA });
  const de = {};
  for (const key of HEAD_KEYS) {
    if (key in data) de[key] = data[key];
  }
  Object.assign(de, reshapeLocale(data.de) || {});
  const out = { de };
  if (data.en) out.en = reshapeLocale(data.en);
  fs.writeFileSync(file, yaml.dump(out, { lineWidth: -1, noRefs: true, schema: yaml.CORE_SCHEMA }));
  console.log(`migrated: ${filename}`);
}
