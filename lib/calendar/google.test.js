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
