### Task 6: `google.js` (Add-to-Google-Calendar URL, per session)

**Files:**
- Create: `lib/calendar/google.js`
- Test: `lib/calendar/google.test.js`

**Interfaces:**
- Consumes: `formatIcsLocal` from `datetime.js`.
- Produces:
  - `googleUrl({title, details, location, start_local, end_local}): string` — includes `ctz=Europe/Vienna`.

- [ ] **Step 1: Write the failing test**

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

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/calendar/google.test.js`
Expected: FAIL — `Cannot find module './google'`.

- [ ] **Step 3: Write minimal implementation**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/calendar/google.test.js`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add lib/calendar/google.js lib/calendar/google.test.js
git commit lib/calendar/google.js lib/calendar/google.test.js -m "feat(calendar): add-to-Google-Calendar links"
```

---

