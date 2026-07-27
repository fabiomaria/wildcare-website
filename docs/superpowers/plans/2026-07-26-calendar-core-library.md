# Calendar Core Library Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Status: All 10 tasks complete (2026-07-26)

Implemented via superpowers:subagent-driven-development on branch `calendar-core-library`
(worktree `.worktrees/calendar-core-library`, repo root
`/Users/fabiogerhold/Sandboxes/Claude/fabio-gerhold/projects/wild-care/website`), based on
`production` (NOT `main` — see this repo's CLAUDE.md branch-topology warning).

- **Tasks 1-2** (`text.js`, `datetime.js`): done sequentially. Task 2 got one Important
  fix-round after review: `parseLocal` now rejects calendar-invalid days (Feb 30, etc.)
  with correct leap-year handling — see commit `638e3382`.
- **Tasks 3-8** (`model.js`, `format.js`, `expand.js`, `google.js`, `jsonld.js`,
  `ics.js` part 1): parallelized across 6 separate git worktrees (each branched from
  Task 2's commit, since these 6 files have no dependencies on each other), implemented
  concurrently by 6 subagents, reviewed independently, then merged one at a time into
  `calendar-core-library` (6 clean merges, zero conflicts — the files are disjoint).
- **Tasks 9-10** (`ics.js` part 2 + `index.js`): done sequentially afterward, since both
  depend on the merged output of the parallel tasks.
- **Full suite:** 34/34 tests passing (`node --test lib/calendar/*.test.js` — note: the
  plan's literal `node --test lib/calendar/` does NOT work on this environment's Node
  v24.5.0, directory args aren't recursively scanned; the `test:calendar` npm script was
  adjusted to the glob form instead).
- **SDD ledger:** `.worktrees/calendar-core-library/.superpowers/sdd/2026-07-26-calendar-core-library/progress.md`
  (per-task review verdicts, the one fix round, and deferred minors are recorded there).
- **Deferred minors** (non-blocking, noted in the ledger): a cosmetic test-description
  mismatch in `model.test.js`, and an untested edge case in `expand.js` (anchor date
  whose weekday differs from `recurrence.weekday` — behavior is sensible, just unverified).

**Remaining before this plan is done:** the final whole-branch code review (dispatch on
the most capable available model per the skill's Model Selection section, using
`scripts/review-package PLAN_FILE MERGE_BASE HEAD` where `MERGE_BASE` is
`git merge-base production calendar-core-library`), then
`superpowers:finishing-a-development-branch` to integrate into `production`. All 15
commits on the branch are ahead of `production` cleanly (`git log production..calendar-core-library`).

**Goal:** Build `lib/calendar/` — a pure, fully unit-tested library that turns Wild Care event records into RFC-5545 `.ics`, schema.org JSON-LD, Google-calendar links, and bilingual display strings.

**Architecture:** Two-stage pure pipeline: raw record → `CalendarDefinition` (`model.js`) → `CalendarOccurrence[]` (`expand.js`), then independent generators (`ics.js`, `jsonld.js`, `google.js`, `format.js`) consume the right projection. Low-level RFC text handling (`text.js`) and floating-local datetime handling (`datetime.js`) are isolated primitives. No Eleventy, no registry, no real content — everything is tested against in-file fixtures. Plans 2 (registry_revision:2 schema) and 3 (Eleventy integration + content migration) build on this.

**Tech Stack:** Node.js v24 (CommonJS), built-in `node:test` + `node:assert/strict`, `Intl.DateTimeFormat` for localized dates. **No new npm dependencies.**

## Global Constraints

- **CommonJS only** (`require`/`module.exports`); repo has no `"type":"module"`. Match existing `scripts/schema/*.js` style (`"use strict";`).
- **No new runtime/dev dependencies.** Tests use `node:test`/`node:assert` only. No luxon, no `ics` package.
- **Floating local wall-clock time everywhere.** No `TZID`, no `VTIMEZONE`, no UTC offsets on event times. Local datetime literals are `YYYY-MM-DDTHH:mm` (seconds optional).
- **`updated_at`** (a UTC `...Z` instant) is the ONLY source for `SEQUENCE`, `DTSTAMP`, `LAST-MODIFIED`. Never use build/current time — output must be deterministic across rebuilds.
- **UIDs are derived from stable ids**, never array position: session UID = `<def.id>-<session.id>@wildcare.space`; recurring series UID = `<def.id>@wildcare.space`.
- **RFC 5545:** CRLF line breaks; TEXT values escape `\ ; ,` and newline; lines folded at 75 octets, UTF-8-safe (never split a code point).
- **Domain constant:** site origin is `https://wildcare.space`; calendar zone name (Google links only) is `Europe/Vienna`; organizer is `Wild Care`.
- All library functions are **pure** (data in → data out, no I/O, no `Date.now()`).

**Add this npm script in Task 1 and use it throughout:**
```json
"test:calendar": "node --test lib/calendar/"
```

---

### Task 1: Scaffolding + `text.js` (RFC-5545 text primitives)

**Files:**
- Create: `lib/calendar/text.js`
- Test: `lib/calendar/text.test.js`
- Modify: `package.json` (add `test:calendar` script)

**Interfaces:**
- Produces:
  - `escapeText(value: string): string` — backslash-escape `\ ; ,` and newline per RFC 5545 §3.3.11.
  - `foldLine(line: string): string` — fold to ≤75 octets/line, UTF-8-safe, continuation lines start with one space, segments joined by CRLF. Returns the folded string (no trailing CRLF).
  - `assemble(lines: string[]): string` — fold each line, join with CRLF, add one trailing CRLF.

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/text.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeText, foldLine, assemble } = require("./text");

test("escapeText escapes backslash, semicolon, comma, newline (backslash first)", () => {
  assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("foldLine leaves a short line unchanged", () => {
  assert.equal(foldLine("UID:abc@wildcare.space"), "UID:abc@wildcare.space");
});

test("foldLine folds long ASCII at 75 octets with a leading space on continuation", () => {
  const line = "DESCRIPTION:" + "x".repeat(120);
  const folded = foldLine(line);
  const segs = folded.split("\r\n");
  assert.ok(segs.length >= 2, "should fold into >=2 segments");
  assert.ok(Buffer.byteLength(segs[0], "utf8") <= 75, "first segment <=75 octets");
  assert.equal(segs[1][0], " ", "continuation starts with a space");
  // reconstruct: strip the leading space of each continuation
  const rebuilt = segs[0] + segs.slice(1).map((s) => s.slice(1)).join("");
  assert.equal(rebuilt, line);
});

test("foldLine never splits a multi-octet code point", () => {
  const line = "SUMMARY:" + "é".repeat(60); // é = 2 octets
  for (const seg of foldLine(line).split("\r\n")) {
    assert.ok(Buffer.byteLength(seg, "utf8") <= 75);
    assert.ok(!seg.includes("�"), "no replacement char");
  }
});

test("assemble folds each line and terminates with CRLF", () => {
  const out = assemble(["BEGIN:VCALENDAR", "END:VCALENDAR"]);
  assert.equal(out, "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/text.test.js`
Expected: FAIL — `Cannot find module './text'`.

- [x] **Step 3: Write minimal implementation**

```js
// lib/calendar/text.js
"use strict";

function escapeText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line) {
  const segments = [];
  let current = "";
  let octets = 0;
  for (const ch of line) {
    // iterating a string yields whole code points (surrogate-pair safe)
    const b = Buffer.byteLength(ch, "utf8");
    if (octets + b > 75) {
      segments.push(current);
      current = " " + ch; // leading space counts toward the 75-octet budget
      octets = 1 + b;
    } else {
      current += ch;
      octets += b;
    }
  }
  segments.push(current);
  return segments.join("\r\n");
}

function assemble(lines) {
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

module.exports = { escapeText, foldLine, assemble };
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/text.test.js`
Expected: PASS (5 tests).

- [x] **Step 5: Add npm script + commit**

Add to `package.json` scripts: `"test:calendar": "node --test lib/calendar/"`.

```bash
git add lib/calendar/text.js lib/calendar/text.test.js package.json
git commit lib/calendar/text.js lib/calendar/text.test.js package.json -m "feat(calendar): RFC-5545 text primitives (escape/fold/assemble)"
```

---

### Task 2: `datetime.js` (floating-local formatting + updated_at stamps)

**Files:**
- Create: `lib/calendar/datetime.js`
- Test: `lib/calendar/datetime.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parseLocal(s: string): {y,mo,d,h,mi,s}` (string parts, zero-padded) — throws on malformed input.
  - `formatIcsLocal(s: string): string` — `YYYY-MM-DDTHH:mm[:ss]` → `YYYYMMDDTHHMMSS` (floating, no `Z`).
  - `formatUtcStamp(isoZ: string): string` — UTC instant → `YYYYMMDDTHHMMSSZ`.
  - `sequenceFromUpdatedAt(isoZ: string): number` — → integer `YYYYMMDDHHMM` (monotonic).
  - `overallSpan(sessions: {start_local,end_local}[]): {start: string, end: string}` — min start, max end (lexicographic == chronological for zero-padded local ISO).

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/datetime.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { formatIcsLocal, formatUtcStamp, sequenceFromUpdatedAt, overallSpan, parseLocal } = require("./datetime");

test("formatIcsLocal pads seconds and strips separators (floating, no Z)", () => {
  assert.equal(formatIcsLocal("2026-10-09T19:00"), "20261009T190000");
  assert.equal(formatIcsLocal("2026-10-09T19:00:30"), "20261009T190030");
});

test("parseLocal throws on malformed input", () => {
  assert.throws(() => parseLocal("2026-13-09 19:00"), /invalid local datetime/);
});

test("formatUtcStamp renders a UTC basic-format stamp with Z", () => {
  assert.equal(formatUtcStamp("2026-07-26T10:00:00Z"), "20260726T100000Z");
});

test("sequenceFromUpdatedAt yields a monotonic YYYYMMDDHHMM integer", () => {
  assert.equal(sequenceFromUpdatedAt("2026-07-26T10:05:00Z"), 202607261005);
  assert.ok(sequenceFromUpdatedAt("2026-07-26T10:06:00Z") > sequenceFromUpdatedAt("2026-07-26T10:05:00Z"));
});

test("overallSpan returns earliest start and latest end", () => {
  const span = overallSpan([
    { start_local: "2026-10-10T18:30", end_local: "2026-10-10T21:00" },
    { start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00" },
    { start_local: "2026-10-11T16:00", end_local: "2026-10-11T19:00" },
  ]);
  assert.deepEqual(span, { start: "2026-10-09T19:00", end: "2026-10-11T19:00" });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/datetime.test.js`
Expected: FAIL — `Cannot find module './datetime'`.

- [x] **Step 3: Write minimal implementation**

```js
// lib/calendar/datetime.js
"use strict";

function parseLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(s));
  if (!m) throw new Error("invalid local datetime: " + s);
  const [, y, mo, d, h, mi, sec] = m;
  const month = Number(mo), day = Number(d), hour = Number(h), min = Number(mi);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || min > 59) {
    throw new Error("invalid local datetime: " + s);
  }
  return { y, mo, d, h, mi, s: sec || "00" };
}

function formatIcsLocal(s) {
  const p = parseLocal(s);
  return `${p.y}${p.mo}${p.d}T${p.h}${p.mi}${p.s}`;
}

function utcParts(isoZ) {
  const dt = new Date(isoZ);
  if (Number.isNaN(dt.getTime())) throw new Error("invalid utc timestamp: " + isoZ);
  const p = (n) => String(n).padStart(2, "0");
  return {
    Y: dt.getUTCFullYear(), M: p(dt.getUTCMonth() + 1), D: p(dt.getUTCDate()),
    h: p(dt.getUTCHours()), m: p(dt.getUTCMinutes()), s: p(dt.getUTCSeconds()),
  };
}

function formatUtcStamp(isoZ) {
  const t = utcParts(isoZ);
  return `${t.Y}${t.M}${t.D}T${t.h}${t.m}${t.s}Z`;
}

function sequenceFromUpdatedAt(isoZ) {
  const t = utcParts(isoZ);
  return Number(`${t.Y}${t.M}${t.D}${t.h}${t.m}`);
}

function overallSpan(sessions) {
  const starts = sessions.map((s) => s.start_local).sort();
  const ends = sessions.map((s) => s.end_local).sort();
  return { start: starts[0], end: ends[ends.length - 1] };
}

module.exports = { parseLocal, formatIcsLocal, formatUtcStamp, sequenceFromUpdatedAt, overallSpan };
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/datetime.test.js`
Expected: PASS (5 tests).

- [x] **Step 5: Commit**

```bash
git add lib/calendar/datetime.js lib/calendar/datetime.test.js
git commit lib/calendar/datetime.js lib/calendar/datetime.test.js -m "feat(calendar): floating-local datetime + updated_at stamps"
```

---

### Task 3: `model.js` (raw record → `CalendarDefinition`)

**Files:**
- Create: `lib/calendar/model.js`
- Test: `lib/calendar/model.test.js`

**Interfaces:**
- Consumes: `overallSpan` from `datetime.js`.
- Produces:
  - `toDefinition(record: object, opts: {venues: object}): CalendarDefinition`
  - **`CalendarDefinition`** (the shape every generator consumes):
    ```
    {
      id, route, type,               // type: 'workshop' | 'event' | 'montagskurs'
      mode,                          // 'dates' | 'recurring'
      eventStatus, availability,     // enum strings
      previousStart,                 // string | null (rescheduled)
      updatedAt,                     // UTC iso string
      primaryLocale,                 // e.g. 'de'
      sessions,                      // dates mode: [{id,start_local,end_local,status,uid}]
      span,                          // dates mode: {start,end}
      recurrence,                    // recurring mode: {weekday,start_time,end_time,anchor,horizon_months,except[]}
      featured,                      // recurring: [{id,teacher,start_local,end_local}]
      venue,                         // resolved {name,street,postal_code,city,country}
      registrationUrl,               // string | null
      image,                         // string | null
      locales                        // { de:{title,summary,...}, en:{...} }
    }
    ```

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/model.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { toDefinition } = require("./model");

const VENUES = {
  orpheumgasse: { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" },
};

const DATES_RECORD = {
  schema_version: 2,
  global: {
    id: "how-we-move-together", route: "/how-we-move-together", intended_locales: ["en"],
    venue: "orpheumgasse", image: "/assets/uploads/x.webp",
    updated_at: "2026-07-26T10:00:00Z",
    registration: { url: "https://tally.so/r/ABC", availability: "available" },
    schedule: {
      event_status: "scheduled", mode: "dates",
      sessions: [
        { id: "fri-eve", start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00" },
        { id: "sat-aft", start_local: "2026-10-10T13:00", end_local: "2026-10-10T17:00" },
      ],
    },
  },
  locales: { en: { title: "How We Move Together", summary: "A CI workshop." } },
};

test("toDefinition resolves venue, span, primary locale, and session UIDs", () => {
  const def = toDefinition(DATES_RECORD, { venues: VENUES });
  assert.equal(def.mode, "dates");
  assert.equal(def.venue.name, "Orpheumgasse Studio");
  assert.equal(def.primaryLocale, "en");
  assert.deepEqual(def.span, { start: "2026-10-09T19:00", end: "2026-10-10T17:00" });
  assert.equal(def.sessions[0].uid, "how-we-move-together-fri-eve@wildcare.space");
  assert.equal(def.registrationUrl, "https://tally.so/r/ABC");
  assert.equal(def.availability, "available");
});

test("toDefinition throws on an unknown venue reference", () => {
  const bad = JSON.parse(JSON.stringify(DATES_RECORD));
  bad.global.venue = "nowhere";
  assert.throws(() => toDefinition(bad, { venues: VENUES }), /unknown venue: nowhere/);
});

test("toDefinition maps a recurring record and merges featured localized notes", () => {
  const rec = {
    schema_version: 2,
    global: {
      id: "montagskurs", route: "/montagskurs", intended_locales: ["de", "en"],
      venue: "orpheumgasse", updated_at: "2026-07-26T10:00:00Z",
      schedule: {
        event_status: "scheduled", mode: "recurring",
        recurrence: { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", horizon_months: 6, except: [] },
        featured_occurrences: [{ id: "2026-11-16", teacher: "Guest" }],
      },
    },
    locales: {
      de: { title: "Montagskurs", schedule: { featured_occurrences: { "2026-11-16": { note: "Sonderabend" } } } },
      en: { title: "Monday Class", schedule: { featured_occurrences: { "2026-11-16": { note: "Special evening" } } } },
    },
  };
  const def = toDefinition(rec, { venues: VENUES });
  assert.equal(def.mode, "recurring");
  assert.equal(def.recurrence.weekday, "monday");
  assert.equal(def.featured[0].start_local, "2026-11-16T17:45");
  assert.equal(def.featured[0].end_local, "2026-11-16T19:15");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/model.test.js`
Expected: FAIL — `Cannot find module './model'`.

- [x] **Step 3: Write minimal implementation**

```js
// lib/calendar/model.js
"use strict";
const { overallSpan } = require("./datetime");

const ORIGIN = "https://wildcare.space";

function toDefinition(record, { venues }) {
  const g = record.global;
  const sc = g.schedule || {};
  const venueRef = g.venue;
  const venue = venues[venueRef];
  if (!venue) throw new Error("unknown venue: " + venueRef);

  const intended = g.intended_locales || Object.keys(record.locales || {});
  const primaryLocale = intended[0];

  const def = {
    id: g.id,
    route: g.route,
    type: g.event_type ? "event" : sc.mode === "recurring" ? "montagskurs" : "workshop",
    mode: sc.mode,
    eventStatus: sc.event_status || "scheduled",
    availability: (g.registration && g.registration.availability) || "available",
    previousStart: sc.previous_start_local || null,
    updatedAt: g.updated_at,
    primaryLocale,
    venue,
    registrationUrl: (g.registration && g.registration.url) || null,
    image: g.image || null,
    locales: record.locales || {},
  };

  if (sc.mode === "dates") {
    def.sessions = (sc.sessions || []).map((s) => ({
      id: s.id,
      start_local: s.start_local,
      end_local: s.end_local,
      status: s.status || def.eventStatus,
      uid: `${g.id}-${s.id}@wildcare.space`,
    }));
    def.span = overallSpan(def.sessions);
  } else if (sc.mode === "recurring") {
    def.recurrence = sc.recurrence;
    def.featured = (sc.featured_occurrences || []).map((f) => ({
      id: f.id,
      teacher: f.teacher || null,
      start_local: `${f.id}T${sc.recurrence.start_time}`,
      end_local: `${f.id}T${sc.recurrence.end_time}`,
    }));
  }
  return def;
}

module.exports = { toDefinition, ORIGIN };
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/model.test.js`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add lib/calendar/model.js lib/calendar/model.test.js
git commit lib/calendar/model.js lib/calendar/model.test.js -m "feat(calendar): normalize records into CalendarDefinition"
```

---

### Task 4: `format.js` (bilingual display strings)

**Files:**
- Create: `lib/calendar/format.js`
- Test: `lib/calendar/format.test.js`

**Interfaces:**
- Consumes: `parseLocal` from `datetime.js`.
- Produces:
  - `formatDateRange(startLocal: string, endLocal: string, locale: 'de'|'en'): string`
  - `formatRecurring(recurrence: {weekday,start_time,end_time}, locale): string`

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/format.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { formatDateRange, formatRecurring } = require("./format");

test("formatDateRange (en) renders a multi-day range", () => {
  assert.equal(formatDateRange("2026-10-09T19:00", "2026-10-11T19:00", "en"), "9–11 October 2026");
});

test("formatDateRange (en) collapses a single day", () => {
  assert.equal(formatDateRange("2026-10-09T19:00", "2026-10-09T21:00", "en"), "9 October 2026");
});

test("formatDateRange (de) renders German month names", () => {
  assert.equal(formatDateRange("2026-10-09T19:00", "2026-10-11T19:00", "de"), "9.–11. Oktober 2026");
});

test("formatRecurring renders the weekly phrase per locale", () => {
  const rec = { weekday: "monday", start_time: "17:45", end_time: "19:15" };
  assert.equal(formatRecurring(rec, "de"), "Jeden Montag, 17:45–19:15");
  assert.equal(formatRecurring(rec, "en"), "Every Monday, 17:45–19:15");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/format.test.js`
Expected: FAIL — `Cannot find module './format'`.

- [x] **Step 3: Write minimal implementation**

```js
// lib/calendar/format.js
"use strict";
const { parseLocal } = require("./datetime");

const LOCALE_TAG = { de: "de-AT", en: "en-GB" };
const WEEKDAY = {
  de: { monday: "Montag", tuesday: "Dienstag", wednesday: "Mittwoch", thursday: "Donnerstag", friday: "Freitag", saturday: "Samstag", sunday: "Sonntag" },
  en: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" },
};

function toUtcDate(local) {
  const p = parseLocal(local);
  return new Date(Date.UTC(Number(p.y), Number(p.mo) - 1, Number(p.d)));
}

function formatDateRange(startLocal, endLocal, locale) {
  const dtf = new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  const a = toUtcDate(startLocal);
  const b = toUtcDate(endLocal);
  if (a.getTime() === b.getTime()) return dtf.format(a);
  return dtf.formatRange(a, b);
}

function formatRecurring(recurrence, locale) {
  const every = locale === "de" ? "Jeden" : "Every";
  const day = WEEKDAY[locale][recurrence.weekday];
  return `${every} ${day}, ${recurrence.start_time}–${recurrence.end_time}`;
}

module.exports = { formatDateRange, formatRecurring };
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/format.test.js`
Expected: PASS (4 tests). If `formatRange` output punctuation differs by ICU version, adjust the expected string to the actual `de-AT`/`en-GB` output — the behavior (range vs single day) is what matters.

- [x] **Step 5: Commit**

```bash
git add lib/calendar/format.js lib/calendar/format.test.js
git commit lib/calendar/format.js lib/calendar/format.test.js -m "feat(calendar): bilingual date/schedule display strings"
```

---

### Task 5: `expand.js` (recurrence expansion + RRULE/EXDATE)

**Files:**
- Create: `lib/calendar/expand.js`
- Test: `lib/calendar/expand.test.js`

**Interfaces:**
- Consumes: nothing (self-contained date math on UTC calendar dates).
- Produces:
  - `WEEKDAY_ICS: {monday:'MO', ...}`
  - `expandRecurrence(recurrence, range: {from: string, to: string}): {date,start_local,end_local}[]` — concrete occurrences (for website listing), skipping `except`.
  - `rruleString(recurrence): string` — e.g. `FREQ=WEEKLY;BYDAY=MO`.
  - `exdateLocals(recurrence): string[]` — excluded occurrences as local datetimes `YYYY-MM-DDTHH:mm`.
  - `firstOccurrenceLocal(recurrence): {start_local,end_local}` — the series anchor occurrence (DTSTART).

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/expand.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { expandRecurrence, rruleString, exdateLocals, firstOccurrenceLocal } = require("./expand");

const REC = { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", except: ["2026-01-19"] };

test("expandRecurrence lists Mondays in range and skips except dates", () => {
  const occ = expandRecurrence(REC, { from: "2026-01-01", to: "2026-02-01" });
  const dates = occ.map((o) => o.date);
  assert.deepEqual(dates, ["2026-01-05", "2026-01-12", "2026-01-26"]); // 19th excluded
  assert.equal(occ[0].start_local, "2026-01-05T17:45");
  assert.equal(occ[0].end_local, "2026-01-05T19:15");
});

test("expandRecurrence starts no earlier than the anchor", () => {
  const occ = expandRecurrence(REC, { from: "2025-12-01", to: "2026-01-10" });
  assert.deepEqual(occ.map((o) => o.date), ["2026-01-05"]);
});

test("rruleString and firstOccurrenceLocal", () => {
  assert.equal(rruleString(REC), "FREQ=WEEKLY;BYDAY=MO");
  assert.deepEqual(firstOccurrenceLocal(REC), { start_local: "2026-01-05T17:45", end_local: "2026-01-05T19:15" });
});

test("exdateLocals renders excluded occurrences at the series time", () => {
  assert.deepEqual(exdateLocals(REC), ["2026-01-19T17:45"]);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/expand.test.js`
Expected: FAIL — `Cannot find module './expand'`.

- [x] **Step 3: Write minimal implementation**

```js
// lib/calendar/expand.js
"use strict";

const WEEKDAY_NUM = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const WEEKDAY_ICS = { monday: "MO", tuesday: "TU", wednesday: "WE", thursday: "TH", friday: "FR", saturday: "SA", sunday: "SU" };

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function firstOnOrAfter(startMs, weekdayNum) {
  const d = new Date(startMs);
  while (d.getUTCDay() !== weekdayNum) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function expandRecurrence(recurrence, { from, to }) {
  const target = WEEKDAY_NUM[recurrence.weekday];
  const anchorMs = Date.parse(recurrence.anchor + "T00:00:00Z");
  const fromMs = Date.parse(from + "T00:00:00Z");
  const toMs = Date.parse(to + "T00:00:00Z");
  const except = new Set(recurrence.except || []);
  const start = firstOnOrAfter(Math.max(anchorMs, fromMs), target);
  const out = [];
  for (const d = new Date(start); d.getTime() <= toMs; d.setUTCDate(d.getUTCDate() + 7)) {
    const date = isoDate(d);
    if (except.has(date)) continue;
    out.push({ date, start_local: `${date}T${recurrence.start_time}`, end_local: `${date}T${recurrence.end_time}` });
  }
  return out;
}

function rruleString(recurrence) {
  return `FREQ=WEEKLY;BYDAY=${WEEKDAY_ICS[recurrence.weekday]}`;
}

function exdateLocals(recurrence) {
  return (recurrence.except || []).map((date) => `${date}T${recurrence.start_time}`);
}

function firstOccurrenceLocal(recurrence) {
  const target = WEEKDAY_NUM[recurrence.weekday];
  const d = firstOnOrAfter(Date.parse(recurrence.anchor + "T00:00:00Z"), target);
  const date = isoDate(d);
  return { start_local: `${date}T${recurrence.start_time}`, end_local: `${date}T${recurrence.end_time}` };
}

module.exports = { WEEKDAY_ICS, expandRecurrence, rruleString, exdateLocals, firstOccurrenceLocal };
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/expand.test.js`
Expected: PASS (4 tests).

- [x] **Step 5: Commit**

```bash
git add lib/calendar/expand.js lib/calendar/expand.test.js
git commit lib/calendar/expand.js lib/calendar/expand.test.js -m "feat(calendar): weekly recurrence expansion + RRULE/EXDATE"
```

---

### Task 6: `google.js` (Add-to-Google-Calendar URL, per session)

**Files:**
- Create: `lib/calendar/google.js`
- Test: `lib/calendar/google.test.js`

**Interfaces:**
- Consumes: `formatIcsLocal` from `datetime.js`.
- Produces:
  - `googleUrl({title, details, location, start_local, end_local}): string` — includes `ctz=Europe/Vienna`.

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/google.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { googleUrl } = require("./google");

test("googleUrl encodes a per-session template link with Vienna ctz", () => {
  const url = googleUrl({
    title: "How We Move Together", details: "Register: https://tally.so/r/ABC",
    location: "Orpheumgasse Studio, Orpheumgasse 11, 8010 Graz",
    start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00",
  });
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, "https://calendar.google.com/calendar/render");
  assert.equal(u.searchParams.get("action"), "TEMPLATE");
  assert.equal(u.searchParams.get("text"), "How We Move Together");
  assert.equal(u.searchParams.get("dates"), "20261009T190000/20261009T210000");
  assert.equal(u.searchParams.get("ctz"), "Europe/Vienna");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/google.test.js`
Expected: FAIL — `Cannot find module './google'`.

- [x] **Step 3: Write minimal implementation**

```js
// lib/calendar/google.js
"use strict";
const { formatIcsLocal } = require("./datetime");

function googleUrl({ title, details, location, start_local, end_local }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatIcsLocal(start_local)}/${formatIcsLocal(end_local)}`,
    ctz: "Europe/Vienna",
  });
  if (details) params.set("details", details);
  if (location) params.set("location", location);
  return "https://calendar.google.com/calendar/render?" + params.toString();
}

module.exports = { googleUrl };
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/google.test.js`
Expected: PASS (1 test).

- [x] **Step 5: Commit**

```bash
git add lib/calendar/google.js lib/calendar/google.test.js
git commit lib/calendar/google.js lib/calendar/google.test.js -m "feat(calendar): add-to-Google-Calendar links"
```

---

### Task 7: `jsonld.js` (schema.org Event / eventSchedule)

**Files:**
- Create: `lib/calendar/jsonld.js`
- Test: `lib/calendar/jsonld.test.js`

**Interfaces:**
- Consumes: `CalendarDefinition` (from `model.js`).
- Produces:
  - `eventJsonLd(def, {locale}): object` — dates-mode `Event` with `startDate`/`endDate` (floating local, no offset).
  - `recurringJsonLd(def, {locale}): object` — `Event` with `eventSchedule`, NO `startDate`/`endDate`.

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/jsonld.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { eventJsonLd, recurringJsonLd } = require("./jsonld");

const VENUE = { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" };

test("eventJsonLd emits floating-local start/end, place, offer, status", () => {
  const def = {
    route: "/how-we-move-together", eventStatus: "scheduled", availability: "available",
    span: { start: "2026-10-09T19:00", end: "2026-10-11T19:00" }, venue: VENUE,
    registrationUrl: "https://tally.so/r/ABC", image: "/assets/x.webp", previousStart: null,
    locales: { en: { title: "How We Move Together", summary: "A CI workshop." } },
  };
  const ld = eventJsonLd(def, { locale: "en" });
  assert.equal(ld["@type"], "Event");
  assert.equal(ld.startDate, "2026-10-09T19:00");
  assert.equal(ld.endDate, "2026-10-11T19:00");
  assert.equal(ld.eventStatus, "https://schema.org/EventScheduled");
  assert.equal(ld.location.name, "Orpheumgasse Studio");
  assert.equal(ld.location.address.postalCode, "8010");
  assert.equal(ld.offers.availability, "https://schema.org/InStock");
  assert.equal(ld.url, "https://wildcare.space/how-we-move-together");
});

test("eventJsonLd includes previousStartDate when rescheduled", () => {
  const def = {
    route: "/x", eventStatus: "rescheduled", availability: "available",
    span: { start: "2026-10-09T19:00", end: "2026-10-09T21:00" }, venue: VENUE,
    registrationUrl: null, image: null, previousStart: "2026-09-01T19:00",
    locales: { en: { title: "X" } },
  };
  const ld = eventJsonLd(def, { locale: "en" });
  assert.equal(ld.eventStatus, "https://schema.org/EventRescheduled");
  assert.equal(ld.previousStartDate, "2026-09-01T19:00");
});

test("recurringJsonLd uses eventSchedule and omits startDate/endDate", () => {
  const def = {
    route: "/montagskurs", eventStatus: "scheduled", venue: VENUE,
    recurrence: { weekday: "monday", start_time: "17:45", end_time: "19:15" },
    locales: { de: { title: "Montagskurs" } },
  };
  const ld = recurringJsonLd(def, { locale: "de" });
  assert.equal(ld.eventSchedule.repeatFrequency, "P1W");
  assert.equal(ld.eventSchedule.byDay, "https://schema.org/Monday");
  assert.equal(ld.eventSchedule.startTime, "17:45");
  assert.ok(!("startDate" in ld), "must omit startDate for eventSchedule");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/jsonld.test.js`
Expected: FAIL — `Cannot find module './jsonld'`.

- [x] **Step 3: Write minimal implementation**

```js
// lib/calendar/jsonld.js
"use strict";
const ORIGIN = "https://wildcare.space";
const SCHEMA = "https://schema.org/";

const STATUS = { scheduled: "EventScheduled", cancelled: "EventCancelled", postponed: "EventPostponed", rescheduled: "EventRescheduled", moved_online: "EventMovedOnline" };
const AVAIL = { available: "InStock", sold_out: "SoldOut", waitlist: "PreOrder", unavailable: "OutOfStock" };
const BYDAY = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

function statusUrl(s) { return SCHEMA + (STATUS[s] || "EventScheduled"); }
function availUrl(a) { return SCHEMA + (AVAIL[a] || "InStock"); }
function placeOf(v) {
  return { "@type": "Place", name: v.name, address: { "@type": "PostalAddress", streetAddress: v.street, postalCode: v.postal_code, addressLocality: v.city, addressCountry: v.country } };
}
function organizer() { return { "@type": "Organization", name: "Wild Care", url: ORIGIN }; }

function base(def, locale) {
  const l = def.locales[locale] || {};
  const obj = {
    "@context": "https://schema.org", "@type": "Event",
    name: l.title,
    eventStatus: statusUrl(def.eventStatus),
    eventAttendanceMode: SCHEMA + "OfflineEventAttendanceMode",
    location: placeOf(def.venue),
    organizer: organizer(),
    url: ORIGIN + def.route,
  };
  if (l.summary) obj.description = l.summary;
  if (def.image) obj.image = def.image;
  return obj;
}

function eventJsonLd(def, { locale }) {
  const obj = base(def, locale);
  obj.startDate = def.span.start;
  obj.endDate = def.span.end;
  if (def.eventStatus === "rescheduled" && def.previousStart) obj.previousStartDate = def.previousStart;
  if (def.registrationUrl) obj.offers = { "@type": "Offer", url: def.registrationUrl, availability: availUrl(def.availability) };
  return obj;
}

function recurringJsonLd(def, { locale }) {
  const obj = base(def, locale);
  obj.eventSchedule = {
    "@type": "Schedule", repeatFrequency: "P1W",
    byDay: SCHEMA + BYDAY[def.recurrence.weekday],
    startTime: def.recurrence.start_time, endTime: def.recurrence.end_time,
  };
  return obj;
}

module.exports = { eventJsonLd, recurringJsonLd };
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/jsonld.test.js`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add lib/calendar/jsonld.js lib/calendar/jsonld.test.js
git commit lib/calendar/jsonld.js lib/calendar/jsonld.test.js -m "feat(calendar): schema.org Event/eventSchedule JSON-LD"
```

---

### Task 8: `ics.js` part 1 — dates-mode per-event calendar

**Files:**
- Create: `lib/calendar/ics.js`
- Test: `lib/calendar/ics.test.js`

**Interfaces:**
- Consumes: `escapeText`, `assemble` (`text.js`); `formatIcsLocal`, `formatUtcStamp`, `sequenceFromUpdatedAt` (`datetime.js`); `CalendarDefinition` (`model.js`).
- Produces:
  - `venueSummaryLine(venue): string` — one-line address for `LOCATION`.
  - `eventVevents(def): string[][]` — one VEVENT (array of unfolded content lines) per session.
  - `buildCalendar(vevents: string[][]): string` — wrap in VCALENDAR, fold, CRLF-terminate.
  - `perEventCalendar(def): string` — `buildCalendar(eventVevents(def))`.

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/ics.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { perEventCalendar, eventVevents } = require("./ics");

const DEF = {
  id: "how-we-move-together", route: "/how-we-move-together", updatedAt: "2026-07-26T10:00:00Z",
  eventStatus: "scheduled", primaryLocale: "en",
  venue: { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" },
  registrationUrl: "https://tally.so/r/ABC",
  locales: { en: { title: "How We Move Together", summary: "A CI workshop." } },
  sessions: [
    { id: "fri-eve", start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00", status: "scheduled", uid: "how-we-move-together-fri-eve@wildcare.space" },
    { id: "sat-aft", start_local: "2026-10-10T13:00", end_local: "2026-10-10T17:00", status: "scheduled", uid: "how-we-move-together-sat-aft@wildcare.space" },
  ],
};

test("eventVevents yields one VEVENT per session with stable UID, floating DTSTART, deterministic stamps", () => {
  const blocks = eventVevents(DEF);
  assert.equal(blocks.length, 2);
  const v = blocks[0];
  assert.ok(v.includes("UID:how-we-move-together-fri-eve@wildcare.space"));
  assert.ok(v.includes("DTSTART:20261009T190000"));
  assert.ok(v.includes("DTEND:20261009T210000"));
  assert.ok(v.includes("DTSTAMP:20260726T100000Z"));
  assert.ok(v.includes("SEQUENCE:202607261000"));
  assert.ok(v.includes("STATUS:CONFIRMED"));
  assert.ok(v.includes("SUMMARY:How We Move Together"));
});

test("perEventCalendar is deterministic, CRLF-terminated, well-formed", () => {
  const ics = perEventCalendar(DEF);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.includes("VERSION:2.0\r\n"));
  assert.ok(ics.includes("PRODID:"));
  assert.ok(ics.includes("CALSCALE:GREGORIAN\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal(ics, perEventCalendar(DEF)); // deterministic
  assert.ok(!ics.includes("\n\n"), "no bare LF blank lines");
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75);
});

test("a cancelled session renders STATUS:CANCELLED but keeps its UID (tombstone)", () => {
  const def = JSON.parse(JSON.stringify(DEF));
  def.sessions[0].status = "cancelled";
  const v = eventVevents(def)[0];
  assert.ok(v.includes("STATUS:CANCELLED"));
  assert.ok(v.includes("UID:how-we-move-together-fri-eve@wildcare.space"));
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/ics.test.js`
Expected: FAIL — `Cannot find module './ics'`.

- [x] **Step 3: Write minimal implementation**

```js
// lib/calendar/ics.js
"use strict";
const { escapeText, assemble } = require("./text");
const { formatIcsLocal, formatUtcStamp, sequenceFromUpdatedAt } = require("./datetime");

const ORIGIN = "https://wildcare.space";
const PRODID = "-//Wild Care//Calendar//EN";
const ICS_STATUS = { scheduled: "CONFIRMED", cancelled: "CANCELLED", postponed: "TENTATIVE", rescheduled: "TENTATIVE", moved_online: "CONFIRMED" };

function venueSummaryLine(v) {
  return `${v.name}, ${v.street}, ${v.postal_code} ${v.city}`;
}

function descriptionFor(def, locale) {
  const l = def.locales[locale] || {};
  const parts = [];
  if (l.summary) parts.push(l.summary);
  if (def.registrationUrl) parts.push(`Anmeldung / Registration: ${def.registrationUrl}`);
  return parts.join("\n");
}

function eventVevents(def) {
  const stamp = formatUtcStamp(def.updatedAt);
  const seq = sequenceFromUpdatedAt(def.updatedAt);
  const title = (def.locales[def.primaryLocale] || {}).title || def.id;
  const location = venueSummaryLine(def.venue);
  const description = descriptionFor(def, def.primaryLocale);
  return def.sessions.map((s) => {
    const lines = [
      "BEGIN:VEVENT",
      `UID:${s.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsLocal(s.start_local)}`,
      `DTEND:${formatIcsLocal(s.end_local)}`,
      `SUMMARY:${escapeText(title)}`,
      `LOCATION:${escapeText(location)}`,
    ];
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push(`URL:${ORIGIN}${def.route}`);
    lines.push(`STATUS:${ICS_STATUS[s.status] || "CONFIRMED"}`);
    lines.push(`SEQUENCE:${seq}`);
    lines.push(`LAST-MODIFIED:${stamp}`);
    lines.push("END:VEVENT");
    return lines;
  });
}

function buildCalendar(vevents) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${PRODID}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const block of vevents) lines.push(...block);
  lines.push("END:VCALENDAR");
  return assemble(lines);
}

function perEventCalendar(def) {
  return buildCalendar(eventVevents(def));
}

module.exports = { venueSummaryLine, eventVevents, buildCalendar, perEventCalendar };
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/ics.test.js`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add lib/calendar/ics.js lib/calendar/ics.test.js
git commit lib/calendar/ics.js lib/calendar/ics.test.js -m "feat(calendar): per-event ICS (dates mode) with tombstone status"
```

---

### Task 9: `ics.js` part 2 — recurring series, featured overrides, master feed

**Files:**
- Modify: `lib/calendar/ics.js`
- Test: `lib/calendar/ics-recurring.test.js`

**Interfaces:**
- Consumes: additionally `rruleString`, `exdateLocals`, `firstOccurrenceLocal` (`expand.js`).
- Produces:
  - `recurringVevents(def): string[][]` — series VEVENT (with `RRULE`/`EXDATE`) + one override VEVENT per featured occurrence (same UID + `RECURRENCE-ID`).
  - `masterFeed(defs: CalendarDefinition[]): string` — one VCALENDAR aggregating every dates-mode VEVENT plus every recurring series/override VEVENT.

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/ics-recurring.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { recurringVevents, masterFeed } = require("./ics");

const REC_DEF = {
  id: "montagskurs", route: "/montagskurs", updatedAt: "2026-07-26T10:00:00Z",
  eventStatus: "scheduled", primaryLocale: "de",
  venue: { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" },
  registrationUrl: null,
  locales: { de: { title: "Montagskurs" } },
  recurrence: { weekday: "monday", start_time: "17:45", end_time: "19:15", anchor: "2026-01-05", except: ["2026-01-19"] },
  featured: [{ id: "2026-11-16", teacher: "Guest", start_local: "2026-11-16T17:45", end_local: "2026-11-16T19:15" }],
};

test("recurringVevents emits an unbounded RRULE series with EXDATE and a RECURRENCE-ID override sharing the UID", () => {
  const blocks = recurringVevents(REC_DEF);
  const series = blocks[0];
  assert.ok(series.includes("UID:montagskurs@wildcare.space"));
  assert.ok(series.includes("DTSTART:20260105T174500"));
  assert.ok(series.includes("RRULE:FREQ=WEEKLY;BYDAY=MO"));
  assert.ok(series.includes("EXDATE:20260119T174500"));

  const override = blocks[1];
  assert.ok(override.includes("UID:montagskurs@wildcare.space"), "override shares series UID");
  assert.ok(override.includes("RECURRENCE-ID:20261116T174500"));
  assert.ok(override.includes("DTSTART:20261116T174500"));
});

test("masterFeed aggregates dates-mode and recurring definitions into one VCALENDAR", () => {
  const datesDef = {
    id: "hw", route: "/hw", updatedAt: "2026-07-26T10:00:00Z", eventStatus: "scheduled", primaryLocale: "en",
    venue: REC_DEF.venue, registrationUrl: null, locales: { en: { title: "HW" } },
    mode: "dates", sessions: [{ id: "s1", start_local: "2026-10-09T19:00", end_local: "2026-10-09T21:00", status: "scheduled", uid: "hw-s1@wildcare.space" }],
  };
  const recDef = Object.assign({ mode: "recurring" }, REC_DEF);
  const feed = masterFeed([datesDef, recDef]);
  assert.ok(feed.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(feed.endsWith("END:VCALENDAR\r\n"));
  assert.ok(feed.includes("UID:hw-s1@wildcare.space"));
  assert.ok(feed.includes("UID:montagskurs@wildcare.space"));
  assert.ok(feed.includes("RRULE:FREQ=WEEKLY;BYDAY=MO"));
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/ics-recurring.test.js`
Expected: FAIL — `recurringVevents is not a function` / `masterFeed is not a function`.

- [x] **Step 3: Write minimal implementation (extend `ics.js`)**

Add these requires at the top of `lib/calendar/ics.js`:

```js
const { rruleString, exdateLocals, firstOccurrenceLocal } = require("./expand");
```

Add these functions before `module.exports`:

```js
function recurringVevents(def) {
  const stamp = formatUtcStamp(def.updatedAt);
  const seq = sequenceFromUpdatedAt(def.updatedAt);
  const title = (def.locales[def.primaryLocale] || {}).title || def.id;
  const location = venueSummaryLine(def.venue);
  const uid = `${def.id}@wildcare.space`;
  const first = firstOccurrenceLocal(def.recurrence);

  const series = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsLocal(first.start_local)}`,
    `DTEND:${formatIcsLocal(first.end_local)}`,
    `RRULE:${rruleString(def.recurrence)}`,
  ];
  const exdates = exdateLocals(def.recurrence);
  if (exdates.length) series.push(`EXDATE:${exdates.map(formatIcsLocal).join(",")}`);
  series.push(`SUMMARY:${escapeText(title)}`);
  series.push(`LOCATION:${escapeText(location)}`);
  series.push(`URL:${ORIGIN}${def.route}`);
  series.push(`STATUS:${ICS_STATUS[def.eventStatus] || "CONFIRMED"}`);
  series.push(`SEQUENCE:${seq}`);
  series.push(`LAST-MODIFIED:${stamp}`);
  series.push("END:VEVENT");

  const blocks = [series];
  for (const f of def.featured || []) {
    const summary = f.teacher ? `${title} — ${f.teacher}` : title;
    blocks.push([
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `RECURRENCE-ID:${formatIcsLocal(f.start_local)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsLocal(f.start_local)}`,
      `DTEND:${formatIcsLocal(f.end_local)}`,
      `SUMMARY:${escapeText(summary)}`,
      `LOCATION:${escapeText(location)}`,
      `URL:${ORIGIN}${def.route}/${f.id}`,
      `STATUS:CONFIRMED`,
      `SEQUENCE:${seq}`,
      `LAST-MODIFIED:${stamp}`,
      "END:VEVENT",
    ]);
  }
  return blocks;
}

function masterFeed(defs) {
  const vevents = [];
  for (const def of defs) {
    if (def.mode === "recurring") vevents.push(...recurringVevents(def));
    else vevents.push(...eventVevents(def));
  }
  return buildCalendar(vevents);
}
```

Update the exports line:

```js
module.exports = { venueSummaryLine, eventVevents, buildCalendar, perEventCalendar, recurringVevents, masterFeed };
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/`
Expected: PASS (all suites, including the two ICS files).

- [x] **Step 5: Commit**

```bash
git add lib/calendar/ics.js lib/calendar/ics-recurring.test.js
git commit lib/calendar/ics.js lib/calendar/ics-recurring.test.js -m "feat(calendar): recurring series, featured overrides, master feed"
```

---

### Task 10: `index.js` public surface + end-to-end fixture test

**Files:**
- Create: `lib/calendar/index.js`
- Create: `lib/calendar/fixtures/how-we-move-together.json` (a realistic dates-mode record)
- Create: `lib/calendar/fixtures/montagskurs.json` (a recurring record with a featured Monday)
- Test: `lib/calendar/index.test.js`

**Interfaces:**
- Consumes: all prior modules.
- Produces (single import surface):
  - `toDefinition`, `eventJsonLd`, `recurringJsonLd`, `perEventCalendar`, `masterFeed`, `googleUrl`, `formatDateRange`, `formatRecurring`, `expandRecurrence`.

- [x] **Step 1: Write the failing test**

```js
// lib/calendar/index.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cal = require("./index");

const VENUES = {
  orpheumgasse: { name: "Orpheumgasse Studio", street: "Orpheumgasse 11", postal_code: "8010", city: "Graz", country: "AT" },
};
const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

test("end-to-end: dates-mode fixture → definition → ICS + JSON-LD", () => {
  const def = cal.toDefinition(load("how-we-move-together.json"), { venues: VENUES });
  const ics = cal.perEventCalendar(def);
  assert.ok(ics.includes("BEGIN:VEVENT"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  const ld = cal.eventJsonLd(def, { locale: def.primaryLocale });
  assert.equal(ld["@type"], "Event");
  assert.ok(ld.startDate && ld.endDate);
});

test("end-to-end: recurring fixture → master feed contains series + override", () => {
  const def = cal.toDefinition(load("montagskurs.json"), { venues: VENUES });
  const feed = cal.masterFeed([def]);
  assert.ok(feed.includes("RRULE:FREQ=WEEKLY;BYDAY=MO"));
  assert.ok(feed.includes("RECURRENCE-ID:"));
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/index.test.js`
Expected: FAIL — `Cannot find module './index'`.

- [x] **Step 3: Write the fixtures and index**

`lib/calendar/fixtures/how-we-move-together.json`:

```json
{
  "schema_version": 2,
  "global": {
    "id": "how-we-move-together", "route": "/how-we-move-together", "intended_locales": ["en"],
    "venue": "orpheumgasse", "image": "/assets/uploads/x.webp", "updated_at": "2026-07-26T10:00:00Z",
    "registration": { "url": "https://tally.so/r/ABC", "availability": "available" },
    "schedule": {
      "event_status": "scheduled", "mode": "dates",
      "sessions": [
        { "id": "fri-eve", "start_local": "2026-10-09T19:00", "end_local": "2026-10-09T21:00" },
        { "id": "sat-aft", "start_local": "2026-10-10T13:00", "end_local": "2026-10-10T17:00" },
        { "id": "sun-morn", "start_local": "2026-10-11T10:00", "end_local": "2026-10-11T14:00" }
      ]
    }
  },
  "locales": { "en": { "title": "How We Move Together", "summary": "A two-day Contact Improvisation workshop." } }
}
```

`lib/calendar/fixtures/montagskurs.json`:

```json
{
  "schema_version": 2,
  "global": {
    "id": "montagskurs", "route": "/montagskurs", "intended_locales": ["de", "en"],
    "venue": "orpheumgasse", "updated_at": "2026-07-26T10:00:00Z",
    "schedule": {
      "event_status": "scheduled", "mode": "recurring",
      "recurrence": { "weekday": "monday", "start_time": "17:45", "end_time": "19:15", "anchor": "2026-01-05", "horizon_months": 6, "except": [] },
      "featured_occurrences": [{ "id": "2026-11-16", "teacher": "Guest Teacher" }]
    }
  },
  "locales": {
    "de": { "title": "Montagskurs", "schedule": { "featured_occurrences": { "2026-11-16": { "note": "Sonderabend" } } } },
    "en": { "title": "Monday Class", "schedule": { "featured_occurrences": { "2026-11-16": { "note": "Special evening" } } } }
  }
}
```

`lib/calendar/index.js`:

```js
"use strict";
const { toDefinition } = require("./model");
const { eventJsonLd, recurringJsonLd } = require("./jsonld");
const { perEventCalendar, masterFeed, eventVevents, recurringVevents, buildCalendar } = require("./ics");
const { googleUrl } = require("./google");
const { formatDateRange, formatRecurring } = require("./format");
const { expandRecurrence } = require("./expand");

module.exports = {
  toDefinition,
  eventJsonLd, recurringJsonLd,
  perEventCalendar, masterFeed, eventVevents, recurringVevents, buildCalendar,
  googleUrl,
  formatDateRange, formatRecurring,
  expandRecurrence,
};
```

- [x] **Step 4: Run the full library suite**

Run: `npm run test:calendar`
Expected: PASS — every suite green.

- [x] **Step 5: Commit**

```bash
git add lib/calendar/index.js lib/calendar/fixtures lib/calendar/index.test.js
git commit lib/calendar/index.js lib/calendar/fixtures lib/calendar/index.test.js -m "feat(calendar): public index + end-to-end fixture tests"
```

---

## What this plan deliberately leaves to Plans 2 and 3

- **Plan 2 (registry_revision:2):** the `schedule`/venue/event field definitions, enums, generated JSON schemas + docs, `admin/config.yml`, migration/downgrade mappings, and validators (including `start_at == earliest session start`). This library consumes the record shape; Plan 2 makes that shape official and CMS-editable.
- **Plan 3 (Eleventy + content):** `event-jsonld.njk`, per-event `.ics` pagination to `/calendar/<id>.ics`, `/wildcare.ics`, generated `sitemap.xml`, `event.njk` + featured-Monday leaf pages, the add-to-calendar UI (visual pass), converting the three real workshops, and dual-read HTML parity.

---

## Self-review notes

- **Spec coverage (library scope):** floating local time ✓ (no offsets emitted anywhere); `updated_at`→SEQUENCE/DTSTAMP/LAST-MODIFIED ✓ (Task 2/8/9); stable UIDs ✓ (Task 3/8); RRULE+EXDATE+RECURRENCE-ID ✓ (Task 9); tombstone STATUS:CANCELLED same UID ✓ (Task 8); eventSchedule omits startDate ✓ (Task 7); per-session Google links with ctz ✓ (Task 6); bilingual generated display ✓ (Task 4); 75-octet UTF-8 folding + CRLF + escaping ✓ (Task 1). Sitemap, leaf pages, and content migration are correctly deferred to Plan 3.
- **Type consistency:** `CalendarDefinition` fields defined in Task 3 (`sessions[].uid`, `span`, `recurrence`, `featured[].start_local`, `primaryLocale`, `venue.postal_code`, `eventStatus`, `availability`) are used verbatim in Tasks 6–9. `mode` is set on definitions by callers of `masterFeed` (Task 9 test sets it explicitly; Plan 3's loader sets it from `toDefinition`, which already assigns `mode`).
- **No placeholders:** every step has runnable code and an exact command.
