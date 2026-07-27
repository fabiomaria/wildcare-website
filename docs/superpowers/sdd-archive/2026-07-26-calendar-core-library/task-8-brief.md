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

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/ics.test.js`
Expected: FAIL — `Cannot find module './ics'`.

- [ ] **Step 3: Write minimal implementation**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/ics.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/ics.js lib/calendar/ics.test.js
git commit lib/calendar/ics.js lib/calendar/ics.test.js -m "feat(calendar): per-event ICS (dates mode) with tombstone status"
```

---

