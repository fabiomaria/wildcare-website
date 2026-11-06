"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { eventViews, refreshStaleFilters } = require("./cms-event-views");
const record = (id, ends, status = "published") => ({ global: {
  id, status, schedule: { mode: "dates", sessions: ends.map((end_local) => ({ end_local })) },
} });

test("archive uses final session, includes drafts, and preserves undated/recurring records", () => {
  const views = eventViews([
    record("past", ["2026-11-05T20:00"]),
    record("ends-now", ["2026-11-06T20:00"]),
    record("multi", ["2026-11-07T20:00", "2026-11-05T20:00"]),
    record("draft", ["2026-11-05T20:00"], "draft"),
    record("no-date", []),
    { global: { id: "recurring", schedule: { mode: "recurring" } } },
  ], "2026-11-06T20:00");
  const [upcoming, past] = views.filters.map(({ pattern }) => new RegExp(pattern));
  for (const id of ["past", "ends-now", "draft"]) {
    assert.ok(past.test(id)); assert.ok(!upcoming.test(id));
  }
  for (const id of ["multi", "no-date", "recurring", "new-record"]) {
    assert.ok(upcoming.test(id)); assert.ok(!past.test(id));
  }
  assert.equal(views.default, "upcoming");
});

test("empty archive and regex characters in IDs are handled literally", () => {
  assert.ok(new RegExp(eventViews([]).filters[0].pattern).test("new"));
  assert.ok(!new RegExp(eventViews([]).filters[1].pattern).test("new"));
  const views = eventViews([record("a.b", ["2020-01-01T20:00"])], "2026-11-06T20:00");
  assert.ok(new RegExp(views.filters[1].pattern).test("a.b"));
  assert.ok(!new RegExp(views.filters[1].pattern).test("axb"));
});

test("stale remembered filters revert to Upcoming after daily archive refresh", () => {
  const original = '({filters:e.filters??(r?[r]:void 0)})';
  const apply = new Function("e", "n", "r", `return ${refreshStaleFilters(original)}`);
  const current = { field: "global.id", pattern: "current" };
  assert.deepEqual(apply({ filters: [{ field: "global.id", pattern: "yesterday" }] }, [current], current).filters, [current]);
  assert.deepEqual(apply({ filters: [current] }, [current], current).filters, [current]);
  assert.deepEqual(apply({ filters: [] }, [current], current).filters, []);
  assert.throws(() => refreshStaleFilters("different vendor"));
});

test("every structured scheduling time uses half-hour steps", () => {
  const fs = require("node:fs");
  const yaml = require("js-yaml");
  const config = yaml.load(fs.readFileSync("admin/config.yml", "utf8"));
  let checked = 0;
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (["start_local", "end_local", "start_time", "end_time", "previous_start_local"].includes(value.name)) {
      assert.equal(value.widget, "datetime");
      assert.equal(value.step, 1800);
      checked++;
    }
    Object.values(value).forEach(walk);
  }
  walk(config);
  assert.equal(checked, 18);
});
