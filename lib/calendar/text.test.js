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
