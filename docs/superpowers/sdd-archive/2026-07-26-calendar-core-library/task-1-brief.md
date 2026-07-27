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

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/text.test.js`
Expected: FAIL — `Cannot find module './text'`.

- [ ] **Step 3: Write minimal implementation**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/text.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Add npm script + commit**

Add to `package.json` scripts: `"test:calendar": "node --test lib/calendar/"`.

```bash
git add lib/calendar/text.js lib/calendar/text.test.js package.json
git commit lib/calendar/text.js lib/calendar/text.test.js package.json -m "feat(calendar): RFC-5545 text primitives (escape/fold/assemble)"
```

---

