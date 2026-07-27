# Calendar Eleventy Integration Implementation Plan (Plan 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the calendar core library (Plan 1, `lib/calendar/`) and the revision-2 schedule schema (Plan 2) into the Eleventy build so every workshop/event emits valid schema.org `Event` JSON-LD, a downloadable per-event `.ics` at `/calendar/<id>.ics`, an add-to-calendar UI, and so the site publishes one subscribable master feed `/wildcare.ics`, per-special-Monday leaf pages, and an auto-generated `sitemap.xml` — with the human date/schedule text derived from the structured block (dual-read parity) instead of hand-typed strings.

**Architecture:** A single `loadCalendar()` builder in `eleventy.config.js` reads `content/venues/*.yaml` into a venues map, then runs every dated `content/workshops/*.yaml` + `content/events/*.yaml` record through `lib/calendar`'s `toDefinition(record, {venues})` to produce `CalendarDefinition[]`. This becomes Eleventy global data (`calendar`). Templates consume it: a shared `event-jsonld.njk` partial renders `eventJsonLd`/`recurringJsonLd`; a paginated `event-ics.njk` emits one `.ics` per definition via `perEventCalendar`; a single `wildcare-ics.njk` emits `masterFeed(all)`; `sitemap.njk` replaces the static passthrough; `formatDateRange`/`formatRecurring` feed the human display strings. Everything is build-time static — no runtime backend.

**Tech Stack:** Eleventy (input `site/`, output `_site/`, njk), `lib/calendar/` (CommonJS, from Plan 1), `js-yaml`, existing filters (`json`, `attr`, `absoluteSiteUrl`, `cleanUrl`), `scripts/validate-seo.js` deploy gate. No new npm dependencies. No CSS changes.

## Global Constraints

- **Depends on Plan 1 merged to `production`** (`lib/calendar/index.js` present at repo root) **and Plan 2 merged** (revision-2 `schedule`/venue/event schema, `content/venues/*.yaml`, schedule blocks on the workshops). Confirm `require("./lib/calendar")` resolves and `content/venues/orpheumgasse.yaml` exists before starting.
- **Work on branch `production`** (never `main`). Confirm `site/`, `eleventy.config.js`, `content/`, `sitemap.xml` at repo root.
- **CommonJS** in `eleventy.config.js`; match its existing style (loaders return plain objects added via `addGlobalData`).
- **Styling constraints (repo CLAUDE.md):** do NOT edit `css/styles.css`, do NOT add CSS files, do NOT add inline `style="..."`. Reuse existing classes only (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.nav-cta`, …). `.btn-ghost` is always paired with `.btn` (`class="btn btn-ghost"`).
- **Bilingual pattern (`js/i18n.js`):** `[data-de][data-en]` elements swap `textContent` (German default), `data-aria-de`/`data-aria-en` swap `aria-label`. `textContent` only — no markup inside translated attributes (except `<br>`); pre-encode entities. JSON-LD and `.ics` are **server-rendered in a single locale** (the definition's `primaryLocale`) — the client toggle does not apply to `<script type="application/ld+json">` or `.ics` files.
- **ICS/`.xml` output:** emit via njk `permalink` ending in `.ics`/`.xml` (engine stays njk; proven by existing pagination in `site/workshop.njk`). ICS template bodies must output raw ICS text — no `<!DOCTYPE>`, use `{%- -%}` whitespace control, and print the pre-built string from `lib/calendar` verbatim (it already has CRLF + folding; do not let njk reflow it).
- **`validate-seo.js` is the deploy gate** (`npm run build` = `eleventy && node scripts/validate-seo.js`; CI runs `schema:check` then `build`). It iterates `sitemap.xml` `<loc>`s and requires 17 `<head>` patterns per page (title, description, canonical, full OG block incl. `og:image` https + width + height + alt, twitter card). **Every URL added to the sitemap must exist in `_site/` and pass all 17 patterns.** Keep `.ics` URLs OUT of the sitemap (they have no HTML head).
- **Determinism:** `lib/calendar` output already derives all timestamps from `updated_at` (no `Date.now()`). Preserve that — never inject build time.
- **Commit with explicit pathspec.**

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `eleventy.config.js` | modify | `loadCalendar()` global data; remove static `sitemap.xml` passthrough |
| `site/_includes/partials/event-jsonld.njk` | create | `<script type="application/ld+json">` from `eventJsonLd`/`recurringJsonLd` |
| `site/_includes/partials/add-to-calendar.njk` | create | Google link + `.ics` download UI (existing button classes) |
| `site/event-ics.njk` | create | paginated → `/calendar/<id>.ics` per definition |
| `site/wildcare-ics.njk` | create | single → `/wildcare.ics` master feed |
| `site/event.njk` | create | event-record leaf page (`page_mode` minimal/full) |
| `site/montagskurs-featured.njk` | create | paginated → `/montagskurs/<date>` featured-Monday leaves |
| `site/sitemap.njk` | create | generated `sitemap.xml` (replaces passthrough) |
| `site/workshop.njk` | modify | include JSON-LD + add-to-calendar; derive human date/schedule from structured block |
| `site/montagskurs.njk` | modify | recurring JSON-LD + add-to-calendar |

---

## Task 1: `loadCalendar()` global data — venues map + CalendarDefinition[]

**Files:**
- Modify: `eleventy.config.js`

**Interfaces:**
- Consumes: `lib/calendar` (`toDefinition`), `content/venues/*.yaml`, dated `content/workshops/*.yaml` + `content/events/*.yaml`.
- Produces global data `calendar`:
  ```
  calendar.venues            // { <id>: {name,street,postal_code,city,country} }
  calendar.definitions       // CalendarDefinition[] (workshops + events with a schedule block)
  calendar.pages             // definitions that get a per-event .ics (mode dates|recurring)
  calendar.byId              // { <def.id>: CalendarDefinition }
  ```
  Each `CalendarDefinition` is exactly Plan 1's shape (`def.id`, `def.route`, `def.mode`, `def.sessions`/`def.recurrence`, `def.venue`, `def.primaryLocale`, `def.locales`, …).

- [ ] **Step 1: Add the loader**

Near the other loaders in `eleventy.config.js` (beside `loadWorkshopContent`, ≈ line 439), add:

```js
const calendar = require("./lib/calendar");

function loadVenues() {
  const dir = path.join(__dirname, "content", "venues");
  const venues = {};
  if (!fs.existsSync(dir)) return venues;
  for (const filename of fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
    const raw = yaml.load(fs.readFileSync(path.join(dir, filename), "utf8"));
    const g = raw.global;
    venues[g.id] = { name: g.name, street: g.street, postal_code: g.postal_code, city: g.city, country: g.country };
  }
  return venues;
}

function loadCalendar() {
  const venues = loadVenues();
  const definitions = [];
  for (const coll of ["workshops", "events"]) {
    const dir = path.join(__dirname, "content", coll);
    if (!fs.existsSync(dir)) continue;
    for (const filename of fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
      const raw = yaml.load(fs.readFileSync(path.join(dir, filename), "utf8"));
      if (!raw?.global?.schedule) continue;            // only dated records participate
      definitions.push(calendar.toDefinition(raw, { venues }));
    }
  }
  definitions.sort((a, b) => a.id.localeCompare(b.id)); // deterministic feed order
  const byId = Object.fromEntries(definitions.map((d) => [d.id, d]));
  return { venues, definitions, pages: definitions, byId };
}
```

Register it: `eleventyConfig.addGlobalData("calendar", loadCalendar);` (beside the `workshopPages`/`journalArticlePages` registrations, ≈ line 561). Add `content/venues` and `content/events` to the watch targets alongside `content/`.

- [ ] **Step 2: Verify the data builds**

Run: `npm run build 2>&1 | tail -5` then
`node -e "const c=require('./eleventy.config.js'); " ` is not straightforward (config exports a function) — instead add a temporary `console.log(JSON.stringify(loadCalendar().definitions.map(d=>({id:d.id,mode:d.mode})),null,2))` at the bottom of the loader during dev, run `npx @11ty/eleventy --dryrun 2>&1 | head`, confirm it lists the workshop + event ids with modes, then remove the temp log.
Expected: `how-we-move-together` (dates), `cellular-touch` (dates), `bewegungsrevolution` (dates), `solstice-jam` (dates) appear; no crash on `toDefinition` (venue refs resolve).

- [ ] **Step 3: Commit**

```bash
git add eleventy.config.js
git commit eleventy.config.js -m "feat(calendar): loadCalendar global data (venues + CalendarDefinitions)"
```

---

## Task 2: `event-jsonld.njk` partial + inject into `workshop.njk`

**Files:**
- Create: `site/_includes/partials/event-jsonld.njk`
- Modify: `site/workshop.njk`

**Interfaces:**
- Consumes: `calendar.byId[<id>]` (the definition for the current page), `eventJsonLd`/`recurringJsonLd` — exposed to templates via a filter (njk can't call `require`d functions directly).
- Produces: a `<script type="application/ld+json">` block in each workshop `<head>`.

- [ ] **Step 1: Expose JSON-LD as a filter**

In `eleventy.config.js`, add:
```js
eleventyConfig.addFilter("eventJsonLd", (def) =>
  def.mode === "recurring"
    ? calendar.recurringJsonLd(def, { locale: def.primaryLocale })
    : calendar.eventJsonLd(def, { locale: def.primaryLocale })
);
```

- [ ] **Step 2: Write the partial**

`site/_includes/partials/event-jsonld.njk`:
```njk
{%- set def = calendar.byId[jsonldId] -%}
{%- if def -%}
<script type="application/ld+json">
{{ def | eventJsonLd | json | safe }}
</script>
{%- endif -%}
```
(`json` is the existing `JSON.stringify` filter, `eleventy.config.js:517`.)

- [ ] **Step 3: Include it in `workshop.njk`**

In `site/workshop.njk` `<head>` (after the `seo.njk` include at line 32), add:
```njk
{%- set jsonldId = workshop.slug -%}
{% include "partials/event-jsonld.njk" %}
```
(`workshop.slug` == `def.id`; only workshops with a schedule block have a `calendar.byId` entry, so the partial's `if def` guard no-ops the rest.)

- [ ] **Step 4: Verify**

```bash
npm run build
node -e "const s=require('fs').readFileSync('_site/how-we-move-together.html','utf8'); const m=s.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/); const ld=JSON.parse(m[1]); console.log(ld['@type'], ld.startDate, ld.location.name)"
```
Expected: `Event 2026-10-09T19:00 Orpheumgasse Studio`.

- [ ] **Step 5: Commit**

```bash
git add site/_includes/partials/event-jsonld.njk site/workshop.njk eleventy.config.js
git commit site/_includes/partials/event-jsonld.njk site/workshop.njk eleventy.config.js -m "feat(calendar): Event JSON-LD partial on workshop pages"
```

---

## Task 3: Add-to-calendar UI partial (Google link + `.ics` download)

**Files:**
- Create: `site/_includes/partials/add-to-calendar.njk`
- Modify: `site/workshop.njk` (render it in the CTA area)

**Interfaces:**
- Consumes: `calendar.byId[<id>]`, a `googleUrl` filter, the per-event `.ics` path `/calendar/<id>.ics` (Task 4).
- Produces: two links using existing button classes; bilingual labels via `data-de`/`data-en`.

- [ ] **Step 1: Expose a `googleUrl` filter**

In `eleventy.config.js` add a filter that builds the overall-span Google link for a definition (dates mode uses `def.span`; recurring uses the first occurrence):
```js
eleventyConfig.addFilter("calendarGoogleUrl", (def) => {
  const l = def.locales[def.primaryLocale] || {};
  const loc = `${def.venue.name}, ${def.venue.street}, ${def.venue.postal_code} ${def.venue.city}`;
  const details = def.registrationUrl ? `Anmeldung / Registration: ${def.registrationUrl}` : (l.summary || "");
  if (def.mode === "recurring") {
    const first = calendar.expandRecurrence(def.recurrence, { from: def.recurrence.anchor, to: def.recurrence.anchor })[0]
      || { start_local: `${def.recurrence.anchor}T${def.recurrence.start_time}`, end_local: `${def.recurrence.anchor}T${def.recurrence.end_time}` };
    return calendar.googleUrl({ title: l.title, details, location: loc, start_local: first.start_local, end_local: first.end_local });
  }
  return calendar.googleUrl({ title: l.title, details, location: loc, start_local: def.span.start, end_local: def.span.end });
});
```

- [ ] **Step 2: Write the partial**

`site/_includes/partials/add-to-calendar.njk`:
```njk
{%- set def = calendar.byId[calId] -%}
{%- if def -%}
<div class="add-to-calendar">
  <a class="btn btn-secondary" href="/calendar/{{ def.id }}.ics" download
     data-de="Zum Kalender hinzufügen (.ics)" data-en="Add to calendar (.ics)">Zum Kalender hinzufügen (.ics)</a>
  <a class="btn btn-ghost" href="{{ def | calendarGoogleUrl }}" target="_blank" rel="noopener"
     data-de="Zu Google Kalender" data-en="Add to Google Calendar">Zu Google Kalender</a>
</div>
{%- endif -%}
```
(Reuse `.add-to-calendar` only if it already exists in `css/styles.css`; if not, wrap the two links in an existing container class instead — grep `css/styles.css` first. Do NOT add CSS. `.btn btn-ghost` per the pairing rule.)

- [ ] **Step 3: Render it in `workshop.njk`**

In the CTA/registration area of `site/workshop.njk` (near the register button, e.g. the `closing_cta`/registration block), add:
```njk
{%- set calId = workshop.slug -%}
{% include "partials/add-to-calendar.njk" %}
```

- [ ] **Step 4: Verify (after Task 4 exists the `.ics` link resolves; for now check the markup)**

```bash
npm run build
grep -A3 'add-to-calendar' _site/how-we-move-together.html
```
Expected: both links present, `.ics` href `/calendar/how-we-move-together.ics`, Google href starts `https://calendar.google.com/calendar/render?` with `ctz=Europe/Vienna`.

- [ ] **Step 5: Commit**

```bash
git add site/_includes/partials/add-to-calendar.njk site/workshop.njk eleventy.config.js
git commit site/_includes/partials/add-to-calendar.njk site/workshop.njk eleventy.config.js -m "feat(calendar): add-to-calendar UI (ics download + Google link)"
```

---

## Task 4: Per-event `.ics` files at `/calendar/<id>.ics`

**Files:**
- Create: `site/event-ics.njk`

**Interfaces:**
- Consumes: `calendar.pages` (paginate one per definition), a `perEventIcs` filter.
- Produces: `_site/calendar/<id>.ics` — `perEventCalendar(def)` for dates mode, `buildCalendar(recurringVevents(def))` for recurring.

- [ ] **Step 1: Expose an ICS filter**

```js
eleventyConfig.addFilter("perEventIcs", (def) =>
  def.mode === "recurring"
    ? calendar.buildCalendar(calendar.recurringVevents(def))
    : calendar.perEventCalendar(def)
);
```

- [ ] **Step 2: Write the paginated template**

`site/event-ics.njk`:
```njk
---
pagination:
  data: calendar.pages
  size: 1
  alias: def
permalink: "calendar/{{ def.id }}.ics"
eleventyExcludeFromCollections: true
---
{{- def | perEventIcs | safe -}}
```
The `{{- -%}`… wait — use `{{-` and `-}}` around the single expression so no leading/trailing whitespace is added; the library string already ends with CRLF.

- [ ] **Step 3: Verify RFC shape survives Eleventy**

```bash
npm run build
node -e "const s=require('fs').readFileSync('_site/calendar/how-we-move-together.ics','utf8'); console.log(s.startsWith('BEGIN:VCALENDAR\r\n'), s.endsWith('END:VCALENDAR\r\n'), /\r\n/.test(s), s.includes('UID:how-we-move-together-fri-eve@wildcare.space'))"
```
Expected: `true true true true`. If CRLF became bare LF (Eleventy/njk normalized line endings), switch the template to a `.11ty.js` file that returns the string via `data()`/`render()` and set `permalink` in `data()` — a JS template does not reflow the string. (Check the LF result first; only escalate if needed.)

- [ ] **Step 4: Confirm `.ics` is NOT in any collection / sitemap** (the `eleventyExcludeFromCollections` front matter handles collections; the sitemap in Task 8 only iterates HTML pages).

- [ ] **Step 5: Commit**

```bash
git add site/event-ics.njk eleventy.config.js
git commit site/event-ics.njk eleventy.config.js -m "feat(calendar): per-event .ics at /calendar/<id>.ics"
```

---

## Task 5: Master feed `/wildcare.ics`

**Files:**
- Create: `site/wildcare-ics.njk`

**Interfaces:**
- Consumes: `calendar.definitions`, a `masterIcs` filter.
- Produces: `_site/wildcare.ics` = `masterFeed(calendar.definitions)` (aggregates every dates-mode VEVENT + every recurring series/override).

- [ ] **Step 1: Expose the filter**

```js
eleventyConfig.addFilter("masterIcs", (defs) => calendar.masterFeed(defs));
```

- [ ] **Step 2: Write the template**

`site/wildcare-ics.njk`:
```njk
---
permalink: wildcare.ics
eleventyExcludeFromCollections: true
---
{{- calendar.definitions | masterIcs | safe -}}
```

- [ ] **Step 3: Verify**

```bash
npm run build
node -e "const s=require('fs').readFileSync('_site/wildcare.ics','utf8'); console.log(s.startsWith('BEGIN:VCALENDAR'), s.endsWith('END:VCALENDAR\r\n'), (s.match(/BEGIN:VEVENT/g)||[]).length)"
```
Expected: `true true <N>` where N = total sessions across all dated definitions (+ recurring series/overrides once Montagskurs is recurring, Task 7).

- [ ] **Step 4: Commit**

```bash
git add site/wildcare-ics.njk eleventy.config.js
git commit site/wildcare-ics.njk eleventy.config.js -m "feat(calendar): subscribable master feed /wildcare.ics"
```

---

## Task 6: `event.njk` leaf page for the `event` record type

**Files:**
- Create: `site/event.njk`
- Modify: `eleventy.config.js` (expose an `eventPages` global built from `content/events/*.yaml`, mirroring `loadWorkshopContent().pages` — reuse `normalizeV2`/`templateLocale` if applicable, else a minimal loader)

**Interfaces:**
- Consumes: event records (Plan 2), `calendar.byId`, the JSON-LD + add-to-calendar partials.
- Produces: `_site/events/<id>.html` (route `/events/<id>`); `page_mode: minimal` = canonical URL + JSON-LD + add-to-calendar only; `page_mode: full` = full content page.

- [ ] **Step 1: Build the events page list**

In `eleventy.config.js` add `loadEventContent()` returning `{ pages: [...] }` with each event's `{ slug, route, page_mode, primary_locale, de, en, href: "events/<id>.html" }` (model on `loadWorkshopContent`). Register `eventPages` global.

- [ ] **Step 2: Write the paginated leaf template**

`site/event.njk` — pagination over `eventPages`, `permalink: "{{ event.href }}"`. `<head>` sets `seo*` vars (title/description/canonical `https://wildcare.space{{ event.route }}`, OG image + width/height/alt — required by `validate-seo.js`; fall back to the site default OG if the event sets none), includes `seo.njk`, then `{% set jsonldId = event.slug %}{% include "partials/event-jsonld.njk" %}`. Body: for `minimal`, a compact hero (title, human date via `formatDateRange`, venue, register button, `{% set calId = event.slug %}{% include "partials/add-to-calendar.njk" %}`); for `full`, the complete layout. Use the `data-de`/`data-en` pattern for bilingual events.

- [ ] **Step 3: Human date via a filter**

```js
eleventyConfig.addFilter("formatDefDate", (def, locale) =>
  def.mode === "recurring"
    ? calendar.formatRecurring(def.recurrence, locale)
    : calendar.formatDateRange(def.span.start, def.span.end, locale)
);
```
Use `def | formatDefDate("de")` / `("en")` in the two `data-*` attributes.

- [ ] **Step 4: Verify**

```bash
npm run build
test -f _site/events/solstice-jam.html && echo "leaf exists"
node -e "const s=require('fs').readFileSync('_site/events/solstice-jam.html','utf8'); console.log(/application\/ld\+json/.test(s), /calendar\/solstice-jam\.ics/.test(s))"
```
Expected: `leaf exists`; `true true`.

- [ ] **Step 5: Commit**

```bash
git add site/event.njk eleventy.config.js
git commit site/event.njk eleventy.config.js -m "feat(calendar): event leaf pages (minimal/full)"
```

---

## Task 7: Montagskurs → recurring definition + featured-Monday leaf pages

**Files:**
- Decide + modify: `content/pages/montagskurs.yaml` (add a `global.schedule` recurring block) OR create `content/events/montagskurs.yaml` — see Step 1
- Create: `site/montagskurs-featured.njk`
- Modify: `site/montagskurs.njk` (recurring JSON-LD + add-to-calendar)

**Interfaces:**
- Consumes: the recurring schedule block (Plan 2 shipped the fixture + CMS support), `calendar.byId.montagskurs`, `recurringJsonLd`, a featured-occurrence page list.
- Produces: recurring Event JSON-LD on `/montagskurs`; `_site/montagskurs/<date>.html` per featured occurrence.

- [ ] **Step 1: Choose the Montagskurs record home (decision point)**

Montagskurs is currently a `fixed_page` (`content/pages/montagskurs.yaml` + `site/montagskurs.njk`). Two options:
- **(a) Add a `global.schedule` recurring block to `content/pages/montagskurs.yaml`** and have `loadCalendar()` also scan `content/pages` for records with a schedule block. Lowest churn; keeps the rich existing page.
- **(b) Create a `content/events/montagskurs.yaml` recurring event** and redirect/retire the page.
Recommend **(a)**. Add to `loadCalendar()`'s collection loop: also read `content/pages/*.yaml` and include any with `global.schedule`. Add the recurring block (weekday monday, 17:45–19:15, anchor, horizon_months 6, except [], featured_occurrences with localized notes) to `content/pages/montagskurs.yaml`, plus `global.venue: orpheumgasse`, `global.updated_at`. Re-run `npm run schema:check` (Plan 2 validators must still pass — Montagskurs as a `fixed_page` with a schedule block means the schedule validators from Plan 2 Task 8 must also apply to `fixed_page`; confirm they key off `record.global.schedule` presence, not record type — they do).

- [ ] **Step 2: Build the featured-occurrence page list**

In `eleventy.config.js` add `montagskursFeatured` global: for the montagskurs definition, map `def.featured` → `[{ date, teacher, start_local, end_local, note_de, note_en, href: "montagskurs/<date>.html", def }]` (notes from `def.locales.{de,en}.schedule.featured_occurrences[date].note`).

- [ ] **Step 3: Featured-Monday leaf template**

`site/montagskurs-featured.njk` — pagination over `montagskursFeatured`, `permalink: "montagskurs/{{ occ.date }}.html"`, canonical `https://wildcare.space/montagskurs/{{ occ.date }}`. Emit a **concrete** single-occurrence `Event` JSON-LD (startDate `occ.start_local`, endDate `occ.end_local`) — build it via a dedicated filter `featuredOccurrenceJsonLd(occ)` that returns `eventJsonLd` on a shallow dates-mode projection of the def with a one-session span. Include add-to-calendar for that date (per-session Google link). Satisfy `validate-seo.js` head requirements.

- [ ] **Step 4: Recurring JSON-LD on the main page**

In `site/montagskurs.njk` `<head>`, add `{% set jsonldId = "montagskurs" %}{% include "partials/event-jsonld.njk" %}` (renders `recurringJsonLd` — `eventSchedule`, no startDate) and `{% set calId = "montagskurs" %}{% include "partials/add-to-calendar.njk" %}` in the CTA.

- [ ] **Step 5: Verify**

```bash
npm run build
node -e "const s=require('fs').readFileSync('_site/montagskurs.html','utf8'); const ld=JSON.parse(s.match(/ld\+json\">([\s\S]*?)<\/script>/)[1]); console.log(ld.eventSchedule.byDay, 'startDate' in ld)"
ls _site/montagskurs/*.html
```
Expected: `https://schema.org/Monday false`; one leaf per featured occurrence (e.g. `_site/montagskurs/2026-11-16.html`).

- [ ] **Step 6: Commit**

```bash
git add content/pages/montagskurs.yaml site/montagskurs-featured.njk site/montagskurs.njk eleventy.config.js
git commit content/pages/montagskurs.yaml site/montagskurs-featured.njk site/montagskurs.njk eleventy.config.js -m "feat(calendar): Montagskurs recurring JSON-LD + featured-Monday leaves"
```

---

## Task 8: Generated `sitemap.xml` (replace the static passthrough)

**Files:**
- Create: `site/sitemap.njk`
- Modify: `eleventy.config.js` (remove the `sitemap.xml` passthrough at ≈ line 532)
- Delete: `sitemap.xml` (root static file) — after confirming the generated one covers every URL

**Interfaces:**
- Consumes: the static page set, `cms.workshops.pages`, `eventPages`, `montagskursFeatured`, `journalArticlePages`.
- Produces: `_site/sitemap.xml` covering every HTML leaf (workshops with detail pages, events, featured Mondays, journal, static pages) with clean (extension-less) URLs. **No `.ics` URLs.**

- [ ] **Step 1: Remove the passthrough**

Delete the line `eleventyConfig.addPassthroughCopy({ "sitemap.xml": "sitemap.xml" });` (or the equivalent form) at `eleventy.config.js` ≈ 532. (If it fails to build because the root `sitemap.xml` is still passthrough-matched elsewhere, grep for `sitemap` in the config.)

- [ ] **Step 2: Write the template**

`site/sitemap.njk`:
```njk
---
permalink: sitemap.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- set staticPaths = ["/", "/team", "/programm", "/mitmachen", "/kontakt", "/journal", "/montagskurs", "/impressum", "/datenschutz", "/brand"] -%}
{%- for p in staticPaths %}
  <url><loc>https://wildcare.space{{ p }}</loc></url>
{%- endfor -%}
{%- for w in cms.workshops.pages %}
  <url><loc>{{ ("/" + w.slug) | absoluteSiteUrl }}</loc></url>
{%- endfor -%}
{%- for e in eventPages %}
  <url><loc>https://wildcare.space{{ e.route }}</loc></url>
{%- endfor -%}
{%- for occ in montagskursFeatured %}
  <url><loc>https://wildcare.space/montagskurs/{{ occ.date }}</loc></url>
{%- endfor -%}
{%- for a in journalArticlePages %}
  <url><loc>{{ a.href | absoluteSiteUrl }}</loc></url>
{%- endfor %}
</urlset>
```
(Use the existing `absoluteSiteUrl` filter which strips `.html` and resolves against the origin. Adjust the static list to match the real current `sitemap.xml` set — read it first.)

- [ ] **Step 3: Verify coverage + validator gate**

```bash
npm run build          # runs eleventy + validate-seo.js
node -e "const s=require('fs').readFileSync('_site/sitemap.xml','utf8'); console.log((s.match(/<loc>/g)||[]).length, /how-we-move-together/.test(s), /\.ics/.test(s))"
```
Expected: `npm run build` PASSES (every sitemap URL exists in `_site/` and passes all 17 head checks — note `how-we-move-together` must now be covered, so its page must set OG width/height/alt or inherit the site default; verify). Sitemap contains `how-we-move-together`, contains no `.ics`.

- [ ] **Step 4: Delete the static file**

```bash
git rm sitemap.xml
npm run build && echo "still green"
```
Expected: build still green (generated sitemap fully replaces it).

- [ ] **Step 5: Commit**

```bash
git add site/sitemap.njk eleventy.config.js
git commit site/sitemap.njk eleventy.config.js sitemap.xml -m "feat(seo): generate sitemap.xml (covers events + featured Mondays)"
```

---

## Task 9: Dual-read parity — derive human date/schedule text from the structured block

**Files:**
- Modify: `site/workshop.njk` (and `site/montagskurs.njk`)
- Create: `scripts/calendar/check-display-parity.js` (optional helper) OR use `scripts/schema/check-parity.js` pattern

**Interfaces:**
- Consumes: `calendar.byId`, `formatDateRange`/`formatRecurring`.
- Produces: the `facts.date` / schedule display strings rendered FROM the structured block, diffed against the current hand-typed output for parity before the free-text fields are retired.

- [ ] **Step 1: Capture the current rendered date/schedule strings**

```bash
npm run build
node -e "const s=require('fs').readFileSync('_site/how-we-move-together.html','utf8'); const m=s.match(/9[–-]11 October 2026/); console.log(m && m[0])"
```
Record the current human strings for all three workshops (baseline).

- [ ] **Step 2: Swap the date display to the derived value**

In `site/workshop.njk`, replace the hand-typed `facts.date` output with `{{ calendar.byId[workshop.slug] | formatDefDate("de") }}` / `("en")` in the `data-de`/`data-en` attributes (guard `{% if calendar.byId[workshop.slug] %}` and fall back to the free-text `facts.date` when no definition exists — e.g. past workshops without a schedule block). Leave the multi-line `facts.schedule[]` as-is for now (session-level display is a larger change; the design defers detailed schedule display — keep the free-text list until a definition-driven session renderer is designed).

- [ ] **Step 3: Diff for parity**

```bash
npm run build
```
Compare the new rendered date strings against the Step 1 baseline. `formatDateRange("2026-10-09…","2026-10-11…","en")` → `9–11 October 2026` should match the old free-text `9–11 October 2026`. If ICU punctuation differs (e.g. en-dash vs hyphen), accept the ICU-correct form and note it; the design's success criterion is "generated bilingually from the structured block," not byte-identical to the old hand text.

- [ ] **Step 4: Commit**

```bash
git add site/workshop.njk
git commit site/workshop.njk -m "feat(calendar): derive workshop date display from structured schedule"
```

---

## Task 10: Full build verification + finish

**Files:** none (verification task)

**Interfaces:**
- Consumes: everything.
- Produces: a green `schema:check` + `build` (the CI gate order) and a manual import smoke test.

- [ ] **Step 1: Run the full CI gate locally**

```bash
npm run schema:check && npm run build
```
Expected: both PASS. `schema:check` covers the Plan 2 schema; `build` = Eleventy + `validate-seo.js`.

- [ ] **Step 2: ICS conformance smoke test**

```bash
node -e "const s=require('fs').readFileSync('_site/wildcare.ics','utf8'); for(const line of s.split('\r\n')) if(Buffer.byteLength(line,'utf8')>75){console.error('FOLD VIOLATION:',line);process.exit(1)} console.log('folding OK,', (s.match(/BEGIN:VEVENT/g)||[]).length, 'VEVENTs')"
```
Expected: `folding OK, <N> VEVENTs`. Then manually: open `_site/wildcare.ics` and a `_site/calendar/<id>.ics` — import into Google Calendar / Apple Calendar (owner does this) and confirm events appear once (stable UID) at the correct wall-clock times.

- [ ] **Step 3: JSON-LD validation**

Paste the JSON-LD from `_site/how-we-move-together.html` and `_site/montagskurs.html` into the schema.org / Google Rich Results validator (owner) — confirm valid `Event` / `eventSchedule` with no errors (cards not guaranteed for AT, per design non-goals).

- [ ] **Step 4: Update `sitemap` note in README / EDITING.md if they reference the static sitemap** (grep for `sitemap.xml`; update any doc that says it is hand-maintained).

- [ ] **Step 5: Finish the branch** via `superpowers:finishing-a-development-branch` (merge to `production`; the CMS/Pages deploy pipeline builds `_site/` and publishes). Confirm the deploy's `validate-seo.js` passes in CI.

---

## What this plan intentionally does NOT change

- **Visual/UX polish of the add-to-calendar surface and an events overview page** — the design (§Deferred) leaves surface placement to a later visual pass by the owner. This plan renders functional, class-reusing UI in the existing CTA areas.
- **Detailed per-session schedule display** (replacing the multi-line `facts.schedule[]`) — kept as free-text pending a definition-driven session renderer; only the single date-range/`facts.date` string is cut over in Task 9.
- **`performer` / price on `offers`** in JSON-LD — needs data not in the current `CalendarDefinition`; add when the schema carries it.

## Self-review notes

- **Spec coverage:** §8 Event JSON-LD per leaf ✓ (Tasks 2,6,7); §9 per-event `.ics` ✓ (Task 4), Google link ✓ (Task 3), master feed `/wildcare.ics` ✓ (Task 5), featured-Monday leaves ✓ (Task 7), generated sitemap ✓ (Task 8); §10 ICS hardening is inherited from Plan 1 and re-verified end-to-end after Eleventy (Task 4 Step 3, Task 10 Step 2); §12 dual-read parity ✓ (Task 9); success criterion "valid Event JSON-LD + passes validate-seo" ✓ (Tasks 2,8,10). Deferred items (surfaces, performer/price, detailed session display) are called out.
- **Determinism preserved:** all ICS/JSON-LD flow through `lib/calendar` (Plan 1), which derives every timestamp from `updated_at`; `loadCalendar` sorts definitions by id for a stable feed order. No `Date.now()` introduced.
- **validate-seo interaction:** the biggest deploy risk is a sitemap URL whose page lacks OG width/height/alt (memory: SEO validator gates deploy). Task 8 Step 3 explicitly verifies `how-we-move-together` (which currently sets `meta.og_image` with no width/height) passes — it must inherit the site default OG dimensions or set its own. `.ics` URLs are deliberately excluded from the sitemap so they never hit the HTML-head checks.
- **CRLF risk:** Task 4 Step 3 verifies the library's CRLF/folding survives njk rendering and gives the `.11ty.js` escape hatch if njk normalizes line endings — the one place Eleventy could silently corrupt RFC-5545 output.
- **No placeholders:** every step has runnable commands/code; the one genuine decision (Montagskurs record home) is a marked decision point with a recommendation (Task 7 Step 1).
- **Styling constraint honored:** all UI reuses `.btn`/`.btn-secondary`/`.btn-ghost`; no CSS files or inline styles added (Task 3 notes the grep-before-use for any container class).
