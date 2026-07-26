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
