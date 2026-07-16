# Conversion, Accessibility & Notion Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a visible rendering bug and an accessibility gap, add funnel-clarity CTAs, and ship a Notion-backed email signup — all on a static, no-build, GitHub Pages HTML site with a bilingual DE/EN client-side toggle.

**Architecture:** All HTML/JS changes are made directly to the existing static files (no build step, no bundler). The one new piece of infrastructure is a single-purpose Cloudflare Worker (in a new `worker/` directory) that proxies the footer signup form's POST request to the Notion API, since Notion has no public form-submission endpoint and the static site cannot hold a secret token.

**Tech Stack:** Plain HTML/CSS/JS (no framework), `js/i18n.js` (existing custom DE/EN toggle), Cloudflare Workers + `wrangler` CLI (new), Notion API (`https://api.notion.com/v1`).

## Global Constraints

- No edits to `css/styles.css`. No new CSS files. No inline `style="..."` attributes added anywhere (removing a pre-existing inline style to fix a bug is allowed; adding one is not).
- Every visual treatment must use a class already defined in `css/styles.css` (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.form-group`, `.form-note`, `.nav-cta`, etc.).
- Every translatable piece of DE/EN content uses the existing `data-de`/`data-en` attribute pattern read by `js/i18n.js`, EXCEPT `datenschutz.html`, which has no toggle at all and is German-only — new content there must not introduce `data-de`/`data-en` attributes, since nothing on that page reads them.
- `js/i18n.js`'s `apply()` function only ever sets `textContent` (with a `<br>` exception) when swapping `data-de`/`data-en` — never `innerHTML`. Any fix must not attempt to inject HTML through those attributes.
- No automated test framework exists in this repo (no `package.json` at the root, no Jest/Playwright/pytest). Verification steps below use a combination of `grep`-based structural checks, a local static file server + manual browser check, and (for the Worker) plain Node.js snippets to test pure logic in isolation. This is intentional — installing a test framework for a handful of static-file edits would be scope creep.
- The `worker/` directory is new, self-contained, and has its own `package.json` — it does not affect the root static site's lack of a build step.

---

## File Structure

- **Modify** `kontakt.html` — fix the mailto rendering bug (Task 1)
- **Modify** `js/i18n.js` — add translated `aria-label` support (Task 2)
- **Modify** `mitmachen.html` — accessible tier buttons (Task 3), tier benefit lines (Task 5)
- **Modify** `index.html` — hero tertiary link (Task 4), footer signup form + script (Task 10)
- **Delete** `en/` directory entirely (Task 6)
- **Modify** `sitemap.xml` — remove `/en/` entries (Task 6)
- **Create** `worker/package.json`, `worker/wrangler.toml`, `worker/src/index.js` — the Notion-proxy Worker (Task 8)
- **Modify** `datenschutz.html` — new German-only data-collection subsection (Task 11)

---

### Task 1: Fix Kontakt mailto rendering bug

**Files:**
- Modify: `kontakt.html:104-106`

**Interfaces:** None (self-contained markup fix).

- [ ] **Step 1: Confirm the current broken markup**

Run: `grep -n "Oder schreib uns direkt an" kontakt.html`

Expected output includes these two lines (104-106 currently read as):
```html
                            <p class="form-note"
                                data-de="Oder schreib uns direkt an &lt;a href='mailto:hello@wildcare.space'&gt;hello@wildcare.space&lt;/a&gt;"
                                data-en="Or write to us directly at &lt;a href='mailto:hello@wildcare.space'&gt;hello@wildcare.space&lt;/a&gt;">Oder schreib uns direkt an <a href="mailto:hello@wildcare.space">hello@wildcare.space</a></p>
```

- [ ] **Step 2: Replace with a translatable text span + a static (non-toggled) mailto link**

Replace the 3-line block above with:
```html
                            <p class="form-note">
                                <span data-de="Oder schreib uns direkt an" data-en="Or write to us directly at">Oder schreib uns direkt an</span>
                                <a href="mailto:hello@wildcare.space">hello@wildcare.space</a>
                            </p>
```

- [ ] **Step 3: Verify no escaped markup remains**

Run: `grep -n "&lt;a href" kontakt.html`
Expected: no output (no matches).

Run: `grep -n "mailto:hello@wildcare.space" kontakt.html`
Expected: at least 3 matches (the one you just edited, plus the two pre-existing static mailto links elsewhere on the page at the info panel and footer).

- [ ] **Step 4: Manual browser check**

Run: `python3 -m http.server 8080` from the repo root (leave running), then open `http://localhost:8080/kontakt.html` in a browser.
Expected: under the contact form, the line reads "Oder schreib uns direkt an hello@wildcare.space" with `hello@wildcare.space` as a real, underlined/colored clickable link (inspect it — it must be an `<a>` element, not literal text with visible angle brackets).
Click the DE/EN toggle in the nav. Expected: the lead-in text switches to "Or write to us directly at" and the link remains clickable and unchanged.
Stop the server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add kontakt.html
git commit -m "Fix Kontakt mailto link rendering as escaped text instead of a real anchor"
```

---

### Task 2: Extend `js/i18n.js` with translated `aria-label` support

**Files:**
- Modify: `js/i18n.js:43-57` (the `apply()` function)

**Interfaces:**
- Produces: any element with both `data-aria-de` and `data-aria-en` attributes will have its `aria-label` set to the matching attribute's value whenever `apply(lang)` runs (on page load and on every language toggle). Later tasks (Task 3) rely on this.

- [ ] **Step 1: Read the current `apply()` function to confirm line numbers**

Run: `grep -n "function apply" -A 15 js/i18n.js`

Expected current content (lines 43-57):
```js
    function apply(lang) {
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-de][data-en]').forEach(function (el) {
            var text = el.getAttribute('data-' + lang);
            if (text !== null) {
                setContent(el, text);
            }
        });

        // Update toggle buttons
        document.querySelectorAll('.lang-toggle-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }
```

- [ ] **Step 2: Add the `data-aria-de`/`data-aria-en` handling**

Replace that block with:
```js
    function apply(lang) {
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-de][data-en]').forEach(function (el) {
            var text = el.getAttribute('data-' + lang);
            if (text !== null) {
                setContent(el, text);
            }
        });

        document.querySelectorAll('[data-aria-de][data-aria-en]').forEach(function (el) {
            var label = el.getAttribute('data-aria-' + lang);
            if (label !== null) {
                el.setAttribute('aria-label', label);
            }
        });

        // Update toggle buttons
        document.querySelectorAll('.lang-toggle-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }
```

- [ ] **Step 3: Verify the change landed correctly**

Run: `grep -n "data-aria-" js/i18n.js`
Expected: 2 matches, both inside the new `forEach` block.

- [ ] **Step 4: Manual logic check with a throwaway HTML file**

Create a temporary file at the repo root, `./i18n-aria-check.html` (temporary — deleted in this same step, never committed):
```html
<!DOCTYPE html>
<html>
<body>
<button id="btn" data-aria-de="Deutsches Label" data-aria-en="English Label">X</button>
<script src="js/i18n.js"></script>
<script>
    console.log('initial aria-label:', document.getElementById('btn').getAttribute('aria-label'));
</script>
</body>
</html>
```

Run: `python3 -m http.server 8080` from the repo root.
Open `http://localhost:8080/i18n-aria-check.html`, open the browser devtools console.
Expected console output: `initial aria-label: Deutsches Label`.
In the console, run `localStorage.setItem('wc-lang','en'); location.reload();` then re-check the console output.
Expected: `initial aria-label: English Label`.

Clean up: stop the server, then run:
```bash
rm ./i18n-aria-check.html
```

- [ ] **Step 5: Commit**

```bash
git add js/i18n.js
git commit -m "Add translated aria-label support to the DE/EN toggle"
```

---

### Task 3: Mitmachen tier cards — real, accessible buttons

**Files:**
- Modify: `mitmachen.html:215-270` (the three `.beitrag-card` blocks)

**Interfaces:**
- Consumes: the `data-aria-de`/`data-aria-en` → `aria-label` behavior added in Task 2.

- [ ] **Step 1: Confirm current markup for all three cards**

Run: `grep -n "beitrag-card\|btn-ghost\|onclick=\"openMembershipForm" mitmachen.html`

Expected to see the 3 outer divs with `onclick="openMembershipForm(...)"` and `style="cursor: pointer; display: flex; flex-direction: column;"`, and 3 inner `<span class="btn-ghost" ...>Diese Stufe wählen</span>` elements (lines ~215, 228-230, 234, 247-249, 253, 266-268 per the current file).

- [ ] **Step 2: Edit the Saat (Seed) card**

Replace:
```html
                <div class="beitrag-card fade-up delay-1" style="cursor: pointer; display: flex; flex-direction: column;" onclick="openMembershipForm('Seed (10€)')">
```
with:
```html
                <div class="beitrag-card fade-up delay-1" style="display: flex; flex-direction: column;">
```

Replace:
```html
                        <span class="btn-ghost" style="font-size: 0.85rem;" 
                              data-de="Diese Stufe wählen" 
                              data-en="Select this tier">Diese Stufe w&auml;hlen</span>
```
(the first occurrence, inside the Saat card) with:
```html
                        <button type="button" class="btn btn-ghost" style="font-size: 0.85rem;"
                                data-de="Diese Stufe wählen"
                                data-en="Select this tier"
                                data-aria-de="Mitgliedschaft Saat, 10 Euro pro Jahr wählen"
                                data-aria-en="Select Seed membership, 10 euros per year"
                                onclick="openMembershipForm('Seed (10€)')">Diese Stufe w&auml;hlen</button>
```

- [ ] **Step 3: Edit the Stamm (Trunk) card**

Replace:
```html
                <div class="beitrag-card fade-up delay-2" style="cursor: pointer; display: flex; flex-direction: column;" onclick="openMembershipForm('Trunk (35 €)')">
```
with:
```html
                <div class="beitrag-card fade-up delay-2" style="display: flex; flex-direction: column;">
```

Replace the second `<span class="btn-ghost" ...>Diese Stufe wählen</span>` (inside the Stamm card) with:
```html
                        <button type="button" class="btn btn-ghost" style="font-size: 0.85rem;"
                                data-de="Diese Stufe wählen"
                                data-en="Select this tier"
                                data-aria-de="Mitgliedschaft Stamm, 35 Euro pro Jahr wählen"
                                data-aria-en="Select Trunk membership, 35 euros per year"
                                onclick="openMembershipForm('Trunk (35 €)')">Diese Stufe w&auml;hlen</button>
```

- [ ] **Step 4: Edit the Wurzel (Root) card**

Replace:
```html
                <div class="beitrag-card fade-up delay-3" style="cursor: pointer; display: flex; flex-direction: column;" onclick="openMembershipForm('Root (60+ €)')">
```
with:
```html
                <div class="beitrag-card fade-up delay-3" style="display: flex; flex-direction: column;">
```

Replace the third `<span class="btn-ghost" ...>Diese Stufe wählen</span>` (inside the Wurzel card) with:
```html
                        <button type="button" class="btn btn-ghost" style="font-size: 0.85rem;"
                                data-de="Diese Stufe wählen"
                                data-en="Select this tier"
                                data-aria-de="Mitgliedschaft Wurzel, 50 Euro oder mehr pro Jahr wählen"
                                data-aria-en="Select Root membership, 50 euros or more per year"
                                onclick="openMembershipForm('Root (60+ €)')">Diese Stufe w&auml;hlen</button>
```

- [ ] **Step 5: Verify no card divs still carry `onclick` or `cursor: pointer`**

Run: `grep -n "beitrag-card.*onclick\|beitrag-card.*cursor" mitmachen.html`
Expected: no output.

Run: `grep -c 'class="btn btn-ghost"' mitmachen.html`
Expected: `3`.

Run: `grep -c "openMembershipForm" mitmachen.html`
Expected: `4` (3 button `onclick`s + 1 function definition).

- [ ] **Step 6: Manual browser + keyboard check**

Run: `python3 -m http.server 8080` from the repo root, open `http://localhost:8080/mitmachen.html`.
Expected visually: the three tier cards look the same as before (same padding, same "Diese Stufe wählen" link-styled text) — clicking anywhere else on the card (e.g. the icon or price) now does nothing; only the "Diese Stufe wählen" button opens the Tally popup.
Press Tab repeatedly from the top of the page. Expected: focus reaches each of the three "Diese Stufe wählen" buttons in order, each shows a visible focus outline (browser default is acceptable — no new CSS was added).
With a button focused, press Enter. Expected: the Tally popup opens with the correct tier pre-filled (inspect the popup or, if Tally is unreachable in this environment, confirm via the browser console that `openMembershipForm(...)` was called with the right argument — add a temporary `console.log(tier)` at the top of `openMembershipForm` if needed to confirm, then remove it before committing).
Right-click one button → Inspect. Expected: the browser's accessibility panel (or just reading the DOM) shows `aria-label="Mitgliedschaft Saat, 10 Euro pro Jahr wählen"` (or Stamm/Wurzel equivalent) on that `<button>`.
Toggle to EN and repeat the aria-label check — expected the English `aria-label` values.
Stop the server.

- [ ] **Step 7: Commit**

```bash
git add mitmachen.html
git commit -m "Make mitmachen tier CTAs real, keyboard-accessible buttons with translated aria-labels"
```

---

### Task 4: Hero — add "Mitglied werden" tertiary link

**Files:**
- Modify: `index.html:80-87` (hero `.button-row`)

**Interfaces:** None (self-contained markup addition).

- [ ] **Step 1: Confirm current hero button row**

Run: `sed -n '80,87p' index.html`

Expected:
```html
                <div class="button-row fade-up delay-2">
                    <button class="btn btn-primary" data-tally-open="nplWX8" data-tally-emoji-text="👋" data-tally-emoji-animation="wave"
                        data-de="Komm vorbei"
                        data-en="Join us">Komm vorbei</button>
                    <a href="programm.html" class="btn btn-secondary"
                        data-de="Mehr erfahren"
                        data-en="Learn more">Mehr erfahren</a>
                </div>
```

- [ ] **Step 2: Add the third link**

Replace with:
```html
                <div class="button-row fade-up delay-2">
                    <button class="btn btn-primary" data-tally-open="nplWX8" data-tally-emoji-text="👋" data-tally-emoji-animation="wave"
                        data-de="Komm vorbei"
                        data-en="Join us">Komm vorbei</button>
                    <a href="programm.html" class="btn btn-secondary"
                        data-de="Mehr erfahren"
                        data-en="Learn more">Mehr erfahren</a>
                    <a href="mitmachen.html" class="btn btn-ghost"
                        data-de="Mitglied werden"
                        data-en="Become a member">Mitglied werden</a>
                </div>
```

- [ ] **Step 3: Verify**

Run: `grep -n "Mitglied werden" index.html`
Expected: at least 1 match inside the hero button row (there may be additional pre-existing matches elsewhere on the page, e.g. the nav link — that's fine).

- [ ] **Step 4: Manual browser check**

Run: `python3 -m http.server 8080`, open `http://localhost:8080/index.html`.
Expected: the hero now shows three elements — a solid green "Komm vorbei" button, a bordered "Mehr erfahren" button, and a lighter text-style "Mitglied werden" link with a trailing arrow (from `.btn-ghost`'s `::after` arrow), visually the lightest-weight of the three.
Click "Mitglied werden". Expected: navigates to `mitmachen.html`.
Toggle EN and confirm it reads "Become a member" and still links correctly.
Stop the server.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add Mitglied werden link to homepage hero for a direct membership path"
```

---

### Task 5: Mitmachen — tier benefit lines

**Files:**
- Modify: `mitmachen.html` (the three tier card `.beitrag-desc` blocks, immediately after each)

**Interfaces:** None (self-contained markup addition; depends on Task 3 having already restructured the surrounding card markup, so do this task after Task 3).

- [ ] **Step 1: Confirm current per-tier description markup (post-Task-3)**

Run: `grep -n "beitrag-desc" mitmachen.html`

Expected 3 matches, e.g.:
```html
                    <p class="beitrag-desc" style="flex-grow: 1;"
                        data-de="&bdquo;Ich bin dabei.&ldquo;"
                        data-en="&ldquo;I&rsquo;m in.&rdquo;">&bdquo;Ich bin dabei.&ldquo;</p>
```

- [ ] **Step 2: Add a benefit line under the Saat description**

Immediately after the Saat card's `.beitrag-desc` closing `</p>` (the `„Ich bin dabei.“` one), add (using the `.beitrag-desc` class alone, no inline style — it already provides suitable body-text sizing):
```html
                    <p class="beitrag-desc"
                        data-de="Du bist Teil der Community und bekommst unsere Updates."
                        data-en="You're part of the community and get our updates.">Du bist Teil der Community und bekommst unsere Updates.</p>
```

- [ ] **Step 3: Add a benefit line under the Stamm description**

Immediately after the Stamm card's `.beitrag-desc` closing `</p>` (the `„Ich trage den Raum mit.“` one), add:
```html
                    <p class="beitrag-desc"
                        data-de="Zugang zu Samstags-Labs und Sharing Circles."
                        data-en="Access to Saturday Labs and Sharing Circles.">Zugang zu Samstags-Labs und Sharing Circles.</p>
```

- [ ] **Step 4: Add a benefit line under the Wurzel description**

Immediately after the Wurzel card's `.beitrag-desc` closing `</p>` (the `„Ich investiere in die Vision.“` one), add:
```html
                    <p class="beitrag-desc"
                        data-de="Samstags-Labs, Sharing Circles, Gast-Workshops und Mitsprache bei Entscheidungen."
                        data-en="Saturday Labs, Sharing Circles, guest workshops, and a voice in decisions.">Samstags-Labs, Sharing Circles, Gast-Workshops und Mitsprache bei Entscheidungen.</p>
```

- [ ] **Step 5: Verify**

Run: `grep -c "beitrag-desc" mitmachen.html`
Expected: `6` (3 original tier taglines + 3 new benefit lines).

Run: `grep -n 'style="font-size: 0.8rem' mitmachen.html`
Expected: no output (confirms the correction in Step 4 was applied and no new inline style was left in place).

- [ ] **Step 6: Manual browser check**

Run: `python3 -m http.server 8080`, open `http://localhost:8080/mitmachen.html`.
Expected: each tier card now shows its tagline (e.g. „Ich bin dabei.“) followed by a benefit line, above the "Diese Stufe wählen" button. The "all tiers are equal" note below the grid is unchanged.
Toggle EN and confirm the benefit lines translate correctly.
Stop the server.

- [ ] **Step 7: Commit**

```bash
git add mitmachen.html
git commit -m "Add tier benefit lines to mitmachen membership cards"
```

---

### Task 6: Remove stale `/en/` directory and its sitemap entries

**Files:**
- Delete: `en/brand.html`, `en/index.html`, `en/kontakt.html`, `en/mitmachen.html`, `en/programm.html`, `en/team.html`
- Modify: `sitemap.xml`

**Interfaces:** None.

- [ ] **Step 1: Confirm nothing in the live site links into `/en/`**

Run: `grep -rn 'href="en/\|href="/en/\|href='"'"'en/' *.html`
Expected: no output (confirms no page links to the stale directory before deleting it).

- [ ] **Step 2: Delete the directory**

```bash
git rm -r en/
```

- [ ] **Step 3: Remove the `/en/` entries from `sitemap.xml`**

Run: `grep -n "en/" sitemap.xml` to see the exact `<url>` blocks (each `<loc>` line sits inside a surrounding `<url>...</url>` block — remove each full block, not just the `<loc>` line). Example of one such block to remove:
```xml
    <url>
        <loc>https://wildcare.space/en/index.html</loc>
        ...
    </url>
```
Remove all 6 `<url>` blocks whose `<loc>` contains `/en/` (for `index.html`, `team.html`, `programm.html`, `mitmachen.html`, `kontakt.html`, `brand.html`).

- [ ] **Step 4: Verify**

Run: `ls en/ 2>&1`
Expected: `ls: en/: No such file or directory` (or platform equivalent).

Run: `grep -c "en/" sitemap.xml`
Expected: `0`.

- [ ] **Step 5: Commit**

```bash
git add -A en/ sitemap.xml
git commit -m "Remove stale /en/ directory and its sitemap entries"
```

---

### Task 7: Notion prerequisite setup (manual)

**Files:** None — this is account/workspace setup performed by the site owner in the Notion web UI, not a code change. Required before Task 8/9 can be tested end-to-end.

**Interfaces:** Produces two secrets consumed by Task 9: a Notion integration token and a database ID.

- [ ] **Step 1: Create the database**

In Notion, create a new database named "Email Signups" with these properties:
- `Email` — type **Title** (Notion requires exactly one Title property per database; use it for the email address)
- `Consent` — type **Checkbox**
- `Language` — type **Select**, with two options: `de` and `en`
- `Source` — type **Rich text**

- [ ] **Step 2: Create an internal integration**

Go to `https://www.notion.so/my-integrations` → "New integration" → name it e.g. "Wild Care Signup Worker" → associate it with the workspace that contains the "Email Signups" database → save.
Copy the **Internal Integration Secret** shown after creation (starts with `secret_` or `ntn_`) — this is the value that will become the Worker's `NOTION_TOKEN` secret in Task 9.

- [ ] **Step 3: Share the database with the integration**

Open the "Email Signups" database in Notion → "..." menu (top right) → "Connections" → "Connect to" → select "Wild Care Signup Worker" (the integration created in Step 2).

- [ ] **Step 4: Get the database ID**

Open the database as a full page in Notion, copy its URL. The database ID is the 32-character hex string in the URL right before the `?v=` query parameter (with dashes stripped by Notion, or present — either form works with the Notion API). Save this value — it becomes `NOTION_DATABASE_ID` in Task 9.

- [ ] **Step 5: Confirm access with a manual API call**

Run (substituting the real token and database ID):
```bash
curl -s -X POST "https://api.notion.com/v1/databases/<NOTION_DATABASE_ID>/query" \
  -H "Authorization: Bearer <NOTION_TOKEN>" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json"
```
Expected: a JSON response with `"object": "list"` and `"results": []` (empty, since no rows exist yet) — not a `401`/`403`/`404` error. If you get an error, re-check Steps 2-4 (the integration must be connected to the specific database, not just created).

No commit for this task (no files changed).

---

### Task 8: Cloudflare Worker — scaffold, validation, Notion API call

**Files:**
- Create: `worker/package.json`
- Create: `worker/wrangler.toml`
- Create: `worker/src/index.js`

**Interfaces:**
- Consumes: `env.NOTION_TOKEN`, `env.NOTION_DATABASE_ID` (Worker secrets, set in Task 9 — not present yet in this task, which is why full end-to-end success can't be tested until Task 9; this task tests validation logic only).
- Produces: a `fetch(request, env)` handler consumed by Task 9's deploy step and Task 10's frontend `fetch()` call. Request body shape: `{ email: string, consent: boolean, language: "de"|"en", website: string }` (the last is the honeypot field). Response shape: `{ ok: true }` on success, `{ ok: false, error: string }` on failure.

- [ ] **Step 1: Scaffold the worker directory**

```bash
mkdir -p worker/src
```

- [ ] **Step 2: Write `worker/package.json`**

```json
{
  "name": "wildcare-signup-worker",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^3.78.0"
  }
}
```

- [ ] **Step 3: Write `worker/wrangler.toml`**

```toml
name = "wildcare-signup"
main = "src/index.js"
compatibility_date = "2026-07-16"
```

- [ ] **Step 4: Write `worker/src/index.js`**

```js
const ALLOWED_ORIGIN = "https://wildcare.space";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders()),
    });
}

function isValidEmail(email) {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function createNotionRow(env, email, language) {
    return fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + env.NOTION_TOKEN,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            parent: { database_id: env.NOTION_DATABASE_ID },
            properties: {
                Email: { title: [{ text: { content: email } }] },
                Consent: { checkbox: true },
                Language: { select: { name: language } },
                Source: { rich_text: [{ text: { content: "Homepage footer" } }] },
            },
        }),
    });
}

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders() });
        }

        if (request.method !== "POST") {
            return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
        }

        let data;
        try {
            data = await request.json();
        } catch (err) {
            return jsonResponse({ ok: false, error: "invalid_json" }, 400);
        }

        if (data.website) {
            return jsonResponse({ ok: true });
        }

        if (!isValidEmail(data.email)) {
            return jsonResponse({ ok: false, error: "invalid_email" }, 400);
        }

        if (data.consent !== true) {
            return jsonResponse({ ok: false, error: "consent_required" }, 400);
        }

        const language = data.language === "en" ? "en" : "de";

        const notionResponse = await createNotionRow(env, data.email, language);

        if (!notionResponse.ok) {
            return jsonResponse({ ok: false, error: "notion_error" }, 502);
        }

        return jsonResponse({ ok: true });
    },
};
```

- [ ] **Step 5: Install dependencies**

```bash
cd worker && npm install
```
Expected: `node_modules/` created, `wrangler` installed, no errors. (Add `worker/node_modules/` to `.gitignore` in the next step if not already covered.)

Run: `grep -n "node_modules" ../.gitignore`
Expected: a match already exists (the repo's root `.gitignore` already ignores `node_modules/`, confirmed from the existing file). If it doesn't cover `worker/node_modules/`, add `worker/node_modules/` to the root `.gitignore`.

- [ ] **Step 6: Test the pure validation logic without deploying (no live Notion credentials needed for these three cases)**

Run each of these with `wrangler dev` running in one terminal (`cd worker && npx wrangler dev` — it will start on `http://localhost:8787` by default) and `curl` in another:

Test 1 — honeypot filled in (should short-circuit to success without touching Notion):
```bash
curl -s -X POST http://localhost:8787 -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","consent":true,"language":"de","website":"spambot-filled-this-in"}'
```
Expected: `{"ok":true}`

Test 2 — invalid email:
```bash
curl -s -X POST http://localhost:8787 -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","consent":true,"language":"de","website":""}'
```
Expected: `{"ok":false,"error":"invalid_email"}`

Test 3 — missing consent:
```bash
curl -s -X POST http://localhost:8787 -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","consent":false,"language":"de","website":""}'
```
Expected: `{"ok":false,"error":"consent_required"}`

Stop `wrangler dev` (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add worker/
git commit -m "Add Cloudflare Worker scaffold that proxies signup submissions toward Notion"
```

---

### Task 9: Deploy the Worker and wire up Notion secrets

**Files:** None new — this is a deploy/configuration step using the code from Task 8.

**Interfaces:**
- Consumes: `NOTION_TOKEN` and `NOTION_DATABASE_ID` from Task 7.
- Produces: a live Worker URL (`https://wildcare-signup.<your-subdomain>.workers.dev`), consumed by Task 10's frontend `fetch()` call.

- [ ] **Step 1: Log in to Cloudflare via wrangler**

```bash
cd worker && npx wrangler login
```
This opens a browser window to authorize `wrangler` against your Cloudflare account (create a free account first at cloudflare.com if you don't have one). Expected terminal output after authorizing in the browser: "Successfully logged in."

- [ ] **Step 2: Set the two secrets**

```bash
npx wrangler secret put NOTION_TOKEN
```
Paste the integration token from Task 7 Step 2 when prompted.

```bash
npx wrangler secret put NOTION_DATABASE_ID
```
Paste the database ID from Task 7 Step 4 when prompted.

- [ ] **Step 3: Deploy**

```bash
npx wrangler deploy
```
Expected output includes a line like `Published wildcare-signup (X.XX sec)` followed by the live URL, e.g. `https://wildcare-signup.<your-subdomain>.workers.dev`. Copy this exact URL — it's needed verbatim in Task 10.

- [ ] **Step 4: End-to-end verify against the real Notion database**

```bash
curl -s -X POST https://wildcare-signup.<your-subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-test@example.com","consent":true,"language":"de","website":""}'
```
Expected: `{"ok":true}`

Then in Notion, open the "Email Signups" database and confirm a new row appeared with Email = `e2e-test@example.com`, Consent checked, Language = `de`, Source = "Homepage footer". Delete this test row afterward to keep the database clean.

No commit for this task (no repo files changed — `wrangler.toml` and secrets are managed via the Cloudflare dashboard/CLI, not committed).

---

### Task 10: Footer signup form on `index.html`

**Files:**
- Modify: `index.html:295-300` (the "Verbunden bleiben" footer column)
- Modify: `index.html` (add a new `<script>` block before `</body>`, after the existing `js/i18n.js` include at line 355)

**Interfaces:**
- Consumes: the deployed Worker URL from Task 9 Step 3.

- [ ] **Step 1: Confirm current footer column markup**

Run: `sed -n '295,300p' index.html`

Expected:
```html
                <div class="footer-links">
                    <h4 data-de="Verbunden bleiben" data-en="Stay connected">Verbunden bleiben</h4>
                    <a href="https://instagram.com/wildcare.space" target="_blank" rel="noopener">Instagram</a>
                    <a href="https://facebook.com/wildcare.space" target="_blank" rel="noopener">Facebook</a>
                    <a href="mailto:hello@wildcare.space">hello@wildcare.space</a>
                </div>
```

- [ ] **Step 2: Add the signup form inside this column**

Replace with:
```html
                <div class="footer-links">
                    <h4 data-de="Verbunden bleiben" data-en="Stay connected">Verbunden bleiben</h4>
                    <a href="https://instagram.com/wildcare.space" target="_blank" rel="noopener">Instagram</a>
                    <a href="https://facebook.com/wildcare.space" target="_blank" rel="noopener">Facebook</a>
                    <a href="mailto:hello@wildcare.space">hello@wildcare.space</a>
                    <p data-de="Montags-Erinnerung erhalten" data-en="Get a Monday reminder">Montags-Erinnerung erhalten</p>
                    <form id="signup-form">
                        <div class="form-group">
                            <label for="signup-email" data-de="E-Mail" data-en="Email">E-Mail</label>
                            <input type="email" id="signup-email" name="email" placeholder="deine@email.at" required>
                        </div>
                        <div class="form-group">
                            <label for="signup-consent">
                                <input type="checkbox" id="signup-consent" name="consent" required>
                                <span data-de="Ich stimme der Speicherung meiner E-Mail gem&auml;&szlig; " data-en="I agree to my email being stored per the ">Ich stimme der Speicherung meiner E-Mail gem&auml;&szlig; </span><a href="datenschutz.html" data-de="Datenschutzerkl&auml;rung" data-en="privacy policy">Datenschutzerkl&auml;rung</a><span data-de=" zu." data-en=".">zu.</span>
                            </label>
                        </div>
                        <input type="text" name="website" id="signup-website" tabindex="-1" autocomplete="off" hidden>
                        <button type="submit" class="btn btn-secondary" data-de="Anmelden" data-en="Sign up">Anmelden</button>
                        <p class="form-note" id="signup-message" hidden></p>
                    </form>
                </div>
```

(no inline styles: the existing `.footer-links` spacing already applies suitable margins/padding to every child element, including the new `<p>` and `<form>`)

- [ ] **Step 3: Verify no inline `style` was left behind in this block**

Run: `sed -n '295,315p' index.html | grep -n "style="`
Expected: no output.

- [ ] **Step 4: Add the submit-handling script**

Run: `grep -n 'src="js/i18n.js"' index.html`
Expected: one match near the end of the body (line ~355 before this edit; line numbers will shift slightly after Steps 1-2's insertions — locate it again by the grep rather than assuming the exact original line number).

Immediately after that `<script src="js/i18n.js"></script>` line, add:
```html
    <script>
        (function () {
            var form = document.getElementById('signup-form');
            if (!form) return;

            var WORKER_URL = 'https://wildcare-signup.<your-subdomain>.workers.dev';

            form.addEventListener('submit', function (e) {
                e.preventDefault();

                var email = document.getElementById('signup-email').value;
                var consent = document.getElementById('signup-consent').checked;
                var website = document.getElementById('signup-website').value;
                var lang = document.documentElement.lang || 'de';
                var messageEl = document.getElementById('signup-message');

                fetch(WORKER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, consent: consent, website: website, language: lang })
                })
                    .then(function (response) { return response.json(); })
                    .then(function (result) {
                        if (result.ok) {
                            form.hidden = true;
                            messageEl.textContent = lang === 'en' ? 'Thanks! See you Monday.' : 'Danke! Bis Montag.';
                        } else {
                            messageEl.textContent = lang === 'en' ? 'Something went wrong. Please try again.' : 'Etwas ist schiefgelaufen. Bitte versuch es erneut.';
                        }
                        messageEl.hidden = false;
                    })
                    .catch(function () {
                        messageEl.textContent = lang === 'en' ? 'Something went wrong. Please try again.' : 'Etwas ist schiefgelaufen. Bitte versuch es erneut.';
                        messageEl.hidden = false;
                    });
            });
        })();
    </script>
```

Replace `<your-subdomain>` with the actual subdomain from Task 9 Step 3's deploy output before committing.

- [ ] **Step 5: Verify**

Run: `grep -n "WORKER_URL" index.html`
Expected: 1 match, with the placeholder replaced by the real deployed URL (confirm it does NOT still say `<your-subdomain>`).

- [ ] **Step 6: Manual browser check (against the real deployed Worker from Task 9)**

Run: `python3 -m http.server 8080`, open `http://localhost:8080/index.html`, scroll to the footer.
Expected: under "Verbunden bleiben", see the pitch line, an email field with label, a consent checkbox with a label linking to Datenschutz, and an "Anmelden" button.
Tab through it with keyboard only — confirm the email field, checkbox, and button are all reachable and show a focus indicator.
Try submitting with an empty email — expected: browser's native "fill out this field" validation blocks submission (from `required`).
Fill in a real-looking email, check the consent box, submit. Expected: the form disappears and a "Danke! Bis Montag." message appears in its place.
Check the Notion database — expected: a new row with that email. Delete the test row afterward.
Toggle to EN before submitting and confirm the pitch, labels, and post-submit message are in English.
Stop the server.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "Add footer email signup wired to the Notion-backed Cloudflare Worker"
```

---

### Task 11: Datenschutz.html — document the new data collection

**Files:**
- Modify: `datenschutz.html` (new subsection under "4. Eingebundene Dienste")

**Interfaces:** None. This page is German-only — do not add `data-de`/`data-en` attributes here (confirmed in Task setup: `grep -c "data-de=" datenschutz.html` returns `0` on the current file).

- [ ] **Step 1: Confirm the insertion point**

Run: `grep -n "Tally (Anmeldeformular)\|5. SSL" datenschutz.html`

Expected: the "Tally (Anmeldeformular)" `<h3>` and its `<p>` immediately precede the "5. SSL/TLS-Verschlüsselung" `<h2>`.

- [ ] **Step 2: Insert the new subsection**

Immediately before the `<h2 class="fade-up">5. SSL/TLS-Verschl&uuml;sselung</h2>` line, add:
```html
                <h3 class="fade-up">Montags-Erinnerung (E-Mail-Anmeldung)</h3>
                <p class="fade-up">Wenn du dich &uuml;ber das Formular in der Fu&szlig;zeile unserer Startseite f&uuml;r die Montags-Erinnerung anmeldest, speichern wir deine E-Mail-Adresse und deine Einwilligung. Die Daten werden nicht direkt bei uns, sondern in einer Notion-Datenbank gespeichert; die &Uuml;bertragung dorthin erfolgt &uuml;ber einen von uns betriebenen Cloudflare Worker als technischen Vermittler. Notion International ULC (Irland) fungiert dabei als Auftragsverarbeiter. Die Verarbeitung erfolgt auf Grundlage von Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO (Einwilligung). Du kannst deine Einwilligung jederzeit widerrufen und die L&ouml;schung deiner Daten verlangen, indem du uns unter <a href="mailto:hello@wildcare.space">hello@wildcare.space</a> kontaktierst.</p>

```

- [ ] **Step 3: Verify**

Run: `grep -n "Montags-Erinnerung" datenschutz.html`
Expected: 1 match (the new `<h3>`).

Run: `grep -c "data-de=" datenschutz.html`
Expected: `0` (confirms no toggle attributes were accidentally introduced on this German-only page).

- [ ] **Step 4: Manual browser check**

Run: `python3 -m http.server 8080`, open `http://localhost:8080/datenschutz.html`.
Expected: a new "Montags-Erinnerung (E-Mail-Anmeldung)" subsection appears between "Tally (Anmeldeformular)" and "5. SSL/TLS-Verschlüsselung", styled identically to the surrounding subsections (no visual difference — same heading/paragraph classes).
Stop the server.

- [ ] **Step 5: Commit**

```bash
git add datenschutz.html
git commit -m "Document the new Monday-reminder email signup in the privacy policy"
```

---

### Task 12: Final QA checklist pass

**Files:** None — verification only, across all pages touched by Tasks 1-11.

**Interfaces:** None.

- [ ] **Step 1: DE/EN + desktop/mobile visual pass**

Run: `python3 -m http.server 8080`. For each of `index.html`, `kontakt.html`, `mitmachen.html`, `datenschutz.html`: open in a browser at a desktop width (e.g. 1440px) and a mobile width (e.g. 375px, via devtools device toolbar), toggle DE and EN, and visually confirm no layout breakage or untranslated leftover text.

- [ ] **Step 2: Keyboard-only pass**

On `mitmachen.html`, `index.html`, and `kontakt.html`: unplug the mouse mentally (don't click) — Tab through the entire page from the top. Confirm every interactive element (nav links, lang toggle, hero buttons including the new "Mitglied werden", the three tier buttons, the footer signup form's field/checkbox/button, the contact form's field/button) receives a visible focus outline and activates via Enter/Space.

- [ ] **Step 3: Lighthouse accessibility check**

In Chrome devtools → Lighthouse tab → run an Accessibility-only audit on `index.html`, `mitmachen.html`, and `kontakt.html`. Confirm no new "Buttons do not have an accessible name" or "Form elements do not have associated labels" findings (there may be pre-existing unrelated findings on the site — only new regressions from this work block completion).

- [ ] **Step 4: Formspree contact form end-to-end**

On `kontakt.html`, submit the contact form with real-looking test data. Confirm you receive it in the Formspree dashboard/connected email.

- [ ] **Step 5: Tally membership flow end-to-end**

On `mitmachen.html`, click each of the three "Diese Stufe wählen" buttons and confirm the Tally popup opens with the correct tier value each time. On `programm.html`, click "Jetzt anmelden" and confirm it still opens the Tally popup (this button was not modified, but re-verify nothing else on the page broke it).

- [ ] **Step 6: Notion signup end-to-end (repeat of Task 9/10's check, now as a full regression pass)**

Submit the footer signup form on `index.html` with a real-looking test email. Confirm the row appears in the Notion "Email Signups" database with correct Email/Consent/Language/Source values. Delete the test row afterward.

- [ ] **Step 7: Sitemap / stale directory check**

Run: `grep -c "en/" sitemap.xml` → expected `0`.
Run: `curl -s -o /dev/null -w "%{http_code}" https://wildcare.space/en/index.html` (only once the changes are deployed to production) → expected `404`.

- [ ] **Step 8: Stop the local server, confirm git status is clean**

```bash
git status
```
Expected: `nothing to commit, working tree clean` (everything from Tasks 1-11 already committed).

No commit for this task (verification only).
