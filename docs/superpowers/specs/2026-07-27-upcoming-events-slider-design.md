# Upcoming Events Slider — Homepage + Programme Page (Design Spec)

**Status:** approved via conversational brainstorming + HTML mockups
(`docs/superpowers/mockups/2026-07-27-homepage-slim-slider-v2.html`,
`docs/superpowers/mockups/2026-07-27-programme-top-slider-v2.html`).

**Depends on:** the already-implemented (uncommitted) calendar feature —
`lib/calendar/`, `calendar.definitions`/`calendar.byId` global data,
`formatDefDate`/`calendarGoogleUrl`/`perEventIcs` filters, per-event `.ics` at
`/calendar/<id>.ics`, `/montagskurs/<date>` featured leaf pages. This spec adds
a UI layer on top; it does not change the schema/registry work.

## Problem

The homepage's "Nächster Termin" banner is hand-typed static copy — it always
describes the Monday class the same way regardless of what's actually
upcoming, and never surfaces workshops/events at all. The programme page's
"Ausblick" section is hand-typed preview cards with manually-copied dates that
can drift from the real schedule. Neither reflects `calendar.definitions`.

## Goal

Replace both with a single shared "upcoming events" data source and slider
component, rendered in two variants:

1. **Homepage** (`site/index.njk`) — replaces `.event-banner` in place. Slim
   cards, no calendar actions, whole card links to the relevant page.
2. **Programme page** (`site/programm.njk`) — replaces the "Ausblick" section
   entirely, and moves to the **top** of the page (right after `.page-hero`,
   before the Montagskurs section). Full cards, beige background, one
   "Mehr erfahren" link + one "Add to Calendar" link per card.

Both pull from the same underlying ordered list, capped to the next 6
upcoming items. "Aktuelle Projekte" (the rich workshop cards further down
`/programm`) is untouched.

## Non-goals

- No new CMS fields. Everything renders from data already in
  `content/workshops/*.yaml`, `content/events/*.yaml`,
  `content/pages/montagskurs.yaml`, and `content/venues/*.yaml` via the
  existing schema. No thumbnails/images on cards (matches the existing
  `.projekt-card` precedent, which also has no images — just an accent bar).
- No month-view calendar grid (considered, explicitly dropped).
- No special visual treatment for `postponed`/`moved_online`/`rescheduled`
  event_status — only `cancelled` is filtered out. Revisit if it comes up.
- No "see all upcoming" link/page — the cap is a hard 6, oldest-of-the-6 just
  falls off next rebuild as things pass.

## Data model: the shared "upcoming items" list

New loader in `eleventy.config.js`, alongside `loadCalendar`/
`loadMontagskursFeatured`:

```js
function loadUpcomingItems(cal, { limit = 6, now = new Date() } = {}) {
  // now is a parameter (not a hidden global read) precisely so this is the
  // ONE place in the build that reads wall-clock time for calendar UI.
  // lib/calendar itself stays pure/deterministic (ICS SEQUENCE/DTSTAMP still
  // derive only from updated_at) — this loader is presentation-only sorting
  // and never feeds into perEventIcs/masterFeed/jsonld generation.
}
```

For each `def` in `cal.definitions` (already available, one entry per
workshop/event/Montagskurs with a `schedule` block):

- Skip if `def.eventStatus === "cancelled"` (the `schedule.event_status`
  enum — a cancelled session/series shouldn't invite anyone to add it to
  their calendar).
- Skip if the record's `global.status` is `"draft"` or `"unlisted"` — a
  draft workshop isn't published yet and an unlisted one is intentionally
  kept out of listings; both should stay out of the slider even if their
  dates are technically in the future. `toDefinition()` doesn't currently
  carry `global.status` onto `CalendarDefinition`, so this loader reads the
  raw YAML's `global.status` alongside `toDefinition()`'s output (same
  pattern `loadCalendar()` already uses — it reads `raw.global.schedule`
  before calling `toDefinition`).
- **`def.mode === "dates"`** (workshops, events): skip if `def.span.end` is
  already in the past relative to `now` (this is what keeps an in-progress
  multi-day workshop, e.g. Cellular Touch on its second day, showing — it's
  only dropped once its last session has ended). Sort key = `def.span.start`.
  `kind` = `def.type` (already `"workshop"` or `"event"` from
  `lib/calendar/model.js`).
- **`def.mode === "recurring"`** (Montagskurs): call
  `calendar.expandRecurrence(def.recurrence, { from: <today>, to: <today+60d> })`
  and take the first result — the next occurrence date, `except`-aware. If
  that date matches an entry in `def.featured`, this is a **featured** item
  (`kind: "featured"`, carries `teacher` + localized `note`); otherwise it's a
  plain **`kind: "montagskurs"`** item. **Exactly one Montagskurs entry ever
  appears** — never a generic-card-plus-featured-card pair. Sort key = the
  occurrence's `start_local`.
- Combine, sort ascending by key, take the first `limit` (6).

Each resulting item is mapped to a plain render-ready object (no logic left
for njk):

```js
{
  kind,                     // "workshop" | "event" | "montagskurs" | "featured"
  id,                       // def.id, or `${def.id}-${occurrence.id}` for featured
  title: { de, en },        // from def.locales.<locale>.title; both sides equal
                             // if the record is single-locale (language_mode
                             // de_only/en_only) — no mono-lingual badge at this
                             // card size, that nuance stays on the detail page.
  subtitle: { de, en } | null, // def.locales.<locale>.subtitle if present
                                 // (workshops have it, e.g. "With Fran";
                                 // events currently don't — omitted, not faked).
  dateLabel: { de, en },     // dates mode: def | formatDateRange(span.start, span.end)
                             // montagskurs/featured: new formatNextOccurrence()
                             //   (see "lib/calendar addition" below) — a *specific*
                             //   date ("Montag, 3. August"), not the generic
                             //   "Jeden Montag" pattern formatRecurring() gives you.
  timeLabel: string,        // "17:45–19:15" — locale-independent (24h clock, no
                             // words), reused from session/occurrence start/end.
  venueName: string,        // def.venue.name
  detailHref: string,       // workshop/event: `/${def.route or id}`;
                             // montagskurs plain: `/montagskurs`;
                             // featured: `/montagskurs/<occurrence.id>` (the
                             //   leaf page already built in the calendar work).
  icsHref: string | null,   // `/calendar/<def.id>.ics` — null only if a def
                             //   somehow has no calendar page (shouldn't happen;
                             //   defensive, not expected to trigger). No Google
                             //   Calendar URL anywhere — `calendarGoogleUrl` is
                             //   no longer used by any template as of this
                             //   session; `.ics` is the sole calendar action
                             //   sitewide (see "Programme page variant" below).
  teacher: string | null,   // featured only
}
```

**`lib/calendar` addition:** `lib/calendar/format.js` gets one new exported
function, `formatNextOccurrence(weekday, dateLocal, locale)` — composes the
existing `WEEKDAY[locale][weekday]` name with `formatDateRange(dateLocal,
dateLocal, locale)` (same-start/end already collapses to a single formatted
date in the existing implementation). Pure function, unit-tested like every
other `lib/calendar` module — no build-time dependency, the specific date is
passed in by the caller.

## Semantic HTML requirements (both variants)

These apply to the shared partial, not per-variant — called out separately so
they can't be lost in one variant's styling pass:

- **The track is a list, not a `<div>` soup.** `.upcoming-track` is a
  `<ul>`; each card is a `<li>` (the `<article>`/`<a>` card markup lives
  *inside* the `<li>`, it doesn't replace it). This is a genuine collection
  of related items — the DOM should say so, both for crawlers and for
  assistive tech (list semantics announce "list of N items").
- **Every section gets a real heading, visible or not.** The programme
  variant already has a visible `<h2>` ("Was noch kommt") — fine as-is. The
  homepage variant's terracotta band currently has no heading, only a
  `<span class="label">Termine</span>` (styling chrome, not a heading
  element) — add `<h2 class="sr-only">Kommende Termine</h2>` (bilingual via
  `data-de`/`data-en` same as everywhere else) using the site's existing
  `.sr-only` utility class (already defined in `css/styles.css`, no new CSS
  needed for this part). The visible `.label` span stays for the visual
  design; the `<h2>` exists purely so deleting "Ausblick" doesn't leave a
  section with no semantic header, and so the homepage band was never
  missing one in the first place. Both `<h2>`s are siblings at the same
  outline depth as the section headings around them — no level-skipping.
- **Whole-card links stay single-purpose and coherently labelled.** On the
  slim (homepage) card, the entire `<li>` content is one `<a>` — verified no
  interactive element (button, nested link) is ever placed inside it. The
  decorative arrow glyph (`→`) gets `aria-hidden="true"` so it doesn't get
  read/parsed as content. The `<a>` carries an explicit `aria-label` (via
  `data-aria-de`/`data-aria-en`, the same mechanism `js/i18n.js` already
  swaps per `CLAUDE.md`'s bilingual pattern) summarizing kind + title + date
  — e.g. "Montagskurs, Montag, 3. August, 17:45–19:15" — rather than relying
  on a bot/screen reader to concatenate the visually-arranged tag+title+date
  text into something coherent on its own.

## Homepage variant (slim)

- Replaces `.event-banner` in `site/index.njk`, same position (immediately
  after the hero).
- Terracotta band (matches the old banner's visual identity/position),
  horizontally scrollable `<ul class="upcoming-track">`, scroll-snap,
  prev/next arrow buttons, dot indicators reflecting scroll position.
- Card: tag chip (styled per `kind`) + title + one compact `dateLabel · timeLabel`
  line, inside an `<li>`. **Whole card is an `<a href="{{ item.detailHref }}">`**
  wrapping that content — no add-to-calendar actions on this variant. See
  "Semantic HTML requirements" above for the heading + link-labelling rules.
- Bilingual: tag chip text is UI chrome (hardcoded `data-de`/`data-en` in the
  partial, not content), title/date use the item's `{de, en}` pairs the same
  way every other `data-de`/`data-en` pair on the site works.

## Programme page variant (full)

- New section, first section on the page, right after `<header class="page-hero">`
  and before the existing Montagskurs `<section>`. Background `var(--sand-light)`
  (beige) — same section/card color pairing the current "Ausblick" already
  uses (`.preview-card` on `--sand-light`), so this isn't a new color pairing.
- The existing "Ausblick" `<section>` block is deleted outright — its visible
  `<h2>` is replaced by this section's own `<h2>` (see "Semantic HTML
  requirements" above), so the page never has a heading-less gap where
  "Ausblick" used to be.
- Card: tag chip + title + subtitle (if present) + one date/time detail row
  (clock icon) + one venue detail row (pin icon), each card an `<article>`
  inside an `<li>` of the shared `<ul class="upcoming-track">` + **exactly
  two actions**: `Mehr erfahren` (`.btn-secondary`, bordered, `detailHref`)
  and `Zum Kalender hinzufügen` / `Add to Calendar` (`.btn-ghost`, terracotta
  text + arrow, `icsHref`) — matching the single-button, ghost-arrow
  add-to-calendar convention just established across `workshop.njk`/
  `event.njk`/`montagskurs.njk`/`programm.njk`'s info-cards (see
  `site/_includes/partials/add-to-calendar.njk`, now a single `.ics` link,
  no separate Google Calendar button — `.ics` opens in Google/Apple/Outlook
  alike). The earlier mockup's separate "Google" button is dropped
  everywhere, not just here.

## Shared component

- One new njk partial, `site/_includes/partials/upcoming-slider.njk`, taking
  `items` and a `variant` (`"slim" | "full"`) parameter, rendering the
  `<h2>` + head/track/arrows/dots and switching card markup (`<a>` vs.
  `<article>` inside each `<li>`) on `variant`. Included from both
  `site/index.njk` and `site/programm.njk` — not two copy-pasted blocks.
- One new script, `js/upcoming-slider.js` (mirrors the existing
  `js/i18n.js` — small, dependency-free, one concern), handling scroll-snap
  arrow scrolling + dot sync + active-state tracking. Loaded on both pages.
  Query-scoped to `.upcoming-track` elements so one script serves both
  variants without per-page wiring.

## Styling — explicit exception to the CLAUDE.md "no new CSS" rule

`CLAUDE.md`'s "Styling constraints (current work stream)" section forbids
editing `css/styles.css`/adding new CSS. This feature is new UI with no
existing analog (no slider/carousel component exists anywhere on the site —
confirmed by grep), so the user has explicitly authorized new, brand-token-only
CSS for this feature specifically (new selectors appended under a clearly
labeled "Upcoming events slider" section, built only from existing custom
properties — `--terracotta`, `--moss`, `--sand`/`--sand-light`, `--space-*`,
`--radius-*`, `--ease-out`, `--font-*` — no new colors/fonts/spacing values
invented). This is a scoped, one-feature exception, not a blanket lift of the
constraint — the implementation plan should flag this loudly so nobody reads
`CLAUDE.md` mid-task and reverts it.

## CMS integration

No new `admin/config.yml` fields — this feature is read-only over data the
CMS already edits (`schedule`, `venue`, `registration`, `event_type`,
`subtitle`, `featured_occurrences`, `event_status`). "Integration" here means
verifying the existing editing surface correctly drives the new UI, not
building new editing surface:

- Editing a workshop's `schedule.sessions[]` dates in the CMS and rebuilding
  changes its position/date in both sliders.
- Setting `schedule.event_status: cancelled` on a workshop/event removes it
  from both sliders.
- Setting `status: draft` or `status: unlisted` should also exclude an item —
  **open question, see below.**
- Adding/removing a `featured_occurrences` entry on Montagskurs toggles that
  week's card between the plain and featured presentation, and changes its
  "Mehr erfahren" target between `/montagskurs` and its leaf page.
- This becomes a manual verification step in the plan (edit via
  **Work with Local Repository** per `CLAUDE.md`'s existing CMS verification
  routine, rebuild, diff `_site/index.html` and `_site/programm.html`) rather
  than new CMS schema work.

Note the resulting rule is deliberately **not** "trust `global.status`
entirely" — `current`/`upcoming`/`past` on that field are editor-set labels
that this feature intentionally does not rely on for ordering or the
in-progress-workshop behavior (that's derived from real dates instead, which
is the whole point of replacing hand-maintained copy). `draft`/`unlisted` are
the two values from that enum that represent "don't show this publicly"
rather than "here's roughly when this happens," so those two are the only
ones checked.
