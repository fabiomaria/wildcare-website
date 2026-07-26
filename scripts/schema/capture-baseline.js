"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { ROOT, hash, relative, writeJson } = require("./lib");

const baselineDir = path.join(ROOT, "migration/baseline");
const fixtureDir = path.join(ROOT, "migration/fixtures/v1");
const renderedDir = path.join(ROOT, "migration/fixtures/rendered-v1");
const screenshotDir = path.join(ROOT, "migration/fixtures/screenshots-v1");

fs.mkdirSync(baselineDir, { recursive: true });
fs.mkdirSync(fixtureDir, { recursive: true });
fs.mkdirSync(renderedDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
fs.writeFileSync(path.join(baselineDir, "production-sha.txt"), `${sha}\n`);

const roots = ["content", "assets"];
const files = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.isFile() && entry.name !== ".DS_Store") files.push(file);
  }
}
for (const name of roots) visit(path.join(ROOT, name));

writeJson(path.join(baselineDir, "content-manifest.json"), {
  production_sha: sha,
  generated_at: "2026-07-26",
  files: files.map((file) => ({
    path: relative(file),
    bytes: fs.statSync(file).size,
    sha256: hash(fs.readFileSync(file)),
  })),
  decisions: {
    supported_locales: ["de", "en"],
    routes: "shared",
    journal_bodies: "markdown_files",
    known_language_asymmetries: [
      "Workshop language_mode may intentionally expose only one detail-page locale.",
      "Legal pages are intentionally German-only.",
    ],
  },
});

for (const source of files.filter((file) => relative(file).startsWith("content/"))) {
  const target = path.join(fixtureDir, relative(source).slice("content/".length));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

const siteDir = path.join(ROOT, "_site");
if (fs.existsSync(siteDir)) {
  const rendered = [];
  visitRendered(siteDir, rendered);
  writeJson(path.join(renderedDir, "manifest.json"), rendered.map((file) => ({
    path: path.relative(siteDir, file).split(path.sep).join("/"),
    sha256: hash(fs.readFileSync(file)),
  })));
} else {
  writeJson(path.join(renderedDir, "manifest.json"), []);
}

function visitRendered(dir, output) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "admin") visitRendered(file, output);
    else if (entry.isFile() && file.endsWith(".html")) output.push(file);
  }
}

const approvedScreenshots = path.join(ROOT, "docs/screenshots/new");
if (fs.existsSync(approvedScreenshots)) {
  for (const name of fs.readdirSync(approvedScreenshots).filter((item) => item.endsWith(".png")).sort()) {
    fs.copyFileSync(path.join(approvedScreenshots, name), path.join(screenshotDir, name));
  }
}

console.log(`Captured schema v1 baseline at ${sha}.`);
