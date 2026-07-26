"use strict";

const fs = require("node:fs");
const path = require("node:path");
const matter = require("gray-matter");
const { ROOT, hash, parseArgs, stableJson } = require("./lib");

const args = parseArgs();
const pairs = [];
for (const collection of ["journal", "legal"]) {
  const fixtureDir = path.join(ROOT, "migration/fixtures/v1", collection);
  if (!fs.existsSync(fixtureDir)) continue;
  for (const name of fs.readdirSync(fixtureDir).filter((item) => item.endsWith(".md")).sort()) {
    const source = path.join(fixtureDir, name);
    let id;
    let locale;
    if (collection === "journal") {
      const match = name.match(/^(.+?)(?:\.(en))?\.md$/);
      id = match[1];
      locale = match[2] || "de";
    } else {
      id = path.basename(name, ".md");
      locale = "de";
    }
    const target = path.join(ROOT, `content/${collection}/bodies`, `${id}.${locale}.md`);
    if (!fs.existsSync(target)) throw new Error(`${path.relative(ROOT, target)} is missing`);
    const before = matter(fs.readFileSync(source, "utf8")).content;
    const after = fs.readFileSync(target);
    pairs.push({
      collection,
      id,
      locale,
      before_sha256: hash(before),
      after_sha256: hash(after),
      bytes: after.length,
      equal: hash(before) === hash(after),
    });
  }
}
const report = { body_files: pairs, all_equal: pairs.every((item) => item.equal) };
if (!report.all_equal) throw new Error("One or more Markdown bodies changed during extraction");
const file = path.join(ROOT, "migration/reports/body-hashes.json");
const expected = stableJson(report);
const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
if (args.check && current !== expected) throw new Error("migration/reports/body-hashes.json is stale");
if (!args.check && current !== expected) fs.writeFileSync(file, expected);
console.log(`Body byte parity verified for ${pairs.length} Markdown files.`);
