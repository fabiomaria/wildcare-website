# Wild Care Website — Conversion, Accessibility & Email Capture

**Date:** 2026-07-16
**Status:** Approved for planning

## Context

The site is a static, hand-coded HTML site (GitHub Pages, `wildcare.space` via CNAME, no build step, no backend). Bilingual DE/EN content is handled inline on each page via a `data-de`/`data-en` attribute toggle (`js/i18n.js`), documented in `TRANSLATION.md`. Version control is already in place (git repo, clean working tree on `html-site` branch) — no setup work needed there.

This spec covers four areas of work identified from a site review: a rendering bug, two accessibility gaps, funnel/copy changes to increase membership conversion, and a new email-capture feature that requires new infrastructure (Notion has no public form-submission endpoint).

**Known constraint driving several decisions below:** `js/i18n.js` sets `textContent` only (with one exception for `<br>`) when swapping languages, by design, to avoid `innerHTML` injection. Any translatable element containing rich markup (e.g. an `<a>` tag) will have that markup rendered as literal escaped text once the toggle runs. Fixes must work within this constraint, not around it.

**Second constraint (user directive):** no edits to `css/styles.css` and no inline `style="..."` attributes for any of the work below. Every visual treatment must be achieved by applying **existing** classes already defined in `css/styles.css` (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.form-group`, `.form-note`, `.nav-cta`, `.nav-links a`, etc.). Where a section below previously called for a new class or inline style, it has been revised to reuse an existing one instead. Where removing an inline style (not adding one) is needed to fix a bug, that remains in scope — the constraint is against *adding* CSS/inline styles, not removing them.

## A. Quick fixes

### A1. Kontakt mailto rendering bug
File: `kontakt.html` (~line 105-106).

Currently the fallback contact line embeds a raw `<a href="mailto:...">` inside the `data-de`/`data-en` attributes. Because of the constraint above, this renders as literal escaped markup text once `i18n.js` runs.

**Fix:** split the line into two adjacent elements —
- A `<span data-de="Oder schreib uns direkt an" data-en="Or write to us directly at">` for the translatable lead-in text (no markup inside the attribute).
- A static `<a href="mailto:hello@wildcare.space">hello@wildcare.space</a>` immediately after — not wrapped in a translated attribute, since the email address itself doesn't change between languages.

Verify the rendered result is `Oder schreib uns direkt an <a>hello@wildcare.space</a>` in DE and the equivalent in EN, in both cases a real clickable link.

### A2. Mitmachen tier cards — real, accessible buttons
File: `mitmachen.html`, three `.beitrag-card` blocks (Saat / Stamm / Wurzel).

Currently the entire card is `<div class="beitrag-card" onclick="openMembershipForm('...')">`, with a decorative `<span class="btn-ghost">Diese Stufe wählen</span>` inside that visually looks like a button but is not part of the tab order and has no accessible name of its own.

**Fix, per card:**
- Convert the `<span class="btn-ghost">` to `<button type="button" class="btn-ghost">`, keeping the visual classes unchanged.
- Move the `onclick="openMembershipForm('Seed (10€)')"` (etc.) from the outer `div` onto this button.
- Remove the outer div's `onclick` and `cursor: pointer` style — the card is no longer a mock click target.
- Add a translated `aria-label` on each button, e.g. `aria-label="Mitgliedschaft Saat, 10 Euro pro Jahr wählen"` (DE) / `aria-label="Select Seed membership, 10 euros per year"` (EN). `i18n.js` only swaps `textContent` on `[data-de][data-en]` elements today — it doesn't touch attributes like `aria-label`. Extend `apply()` with one small addition: for elements carrying `data-aria-de`/`data-aria-en`, set `aria-label` from the matching attribute on language switch (same lookup pattern as the existing text swap, just writing to `aria-label` instead of `textContent`). Add `data-aria-de`/`data-aria-en` to each of the three tier buttons.
- Verify `openMembershipForm()` still opens the correct Tally form for each tier via mouse click and via keyboard (Tab to focus, Enter/Space to activate).

`programm.html`'s "Jetzt anmelden" button requires no change — it is already a real `<button>` with `data-tally-open`.

## B. Conversion funnel clarity

### B1. Homepage hero — add a membership path
File: `index.html`, hero button row (~line 80-87).

Keep both existing buttons unchanged:
- `Komm vorbei` (primary, `data-tally-open="nplWX8"`)
- `Mehr erfahren` (secondary, → `programm.html`)

Add a third element: `Mitglied werden` / `Become a member` → `mitmachen.html`, using the existing `class="btn btn-ghost"` combination (already defined in `css/styles.css`, already used sitewide for lighter-weight text-style CTAs with an arrow — see `index.html:186`, `index.html:222`, `programm.html:312`). Every existing use of `.btn-ghost` pairs it with the base `.btn` class, so this follows established convention rather than introducing a new pattern. `.btn-ghost` is visually lighter than both `.btn-primary` and `.btn-secondary`, so it naturally reads as the lowest-emphasis of the three. Add via the existing `data-de`/`data-en` toggle pattern.

### B2. Tier benefit lines
File: `mitmachen.html`, three tier cards.

Add one concise benefit line under each tier's existing description, drawing from the benefits already listed higher on the page (lines ~168-184: Samstags-Labs, Sharing Circles, Gast-Workshops, Mitsprache). Suggested mapping (exact copy to be refined at implementation time, matching existing tone):
- **Saat** — light-touch access note (e.g. invited to community updates / open labs when space allows)
- **Stamm** — Samstags-Labs + Sharing Circles access
- **Wurzel** — all of the above, plus Gast-Workshops and Mitsprache in decisions

Keep the existing "all tiers are equal" note unchanged as the section footer.

## C. Email capture → Notion

### C1. Frontend
File: `index.html` footer, inside the existing "Verbunden bleiben" (Stay connected) column (~line 295-300) — no new footer column.

Built entirely from existing classes already defined in `css/styles.css` — no new CSS, no inline styles:
- A short one-line pitch (e.g. "Get a Monday reminder" / "Montags-Erinnerung erhalten"), translated via the existing toggle, styled like the other footer column headings/text.
- An email `<input type="email" required>` wrapped in `.form-group` with a proper `<label>` (same structure as the Formspree contact form's fields).
- A required GDPR consent checkbox with a label linking to `datenschutz.html` (e.g. "Ich stimme der Speicherung meiner E-Mail gemäß Datenschutzerklärung zu" / "I agree to my email being stored per the privacy policy"), also inside a `.form-group`. No existing checkbox-specific styling exists in `css/styles.css`, so it renders with the browser's default checkbox appearance — acceptable since adding new CSS is out of scope.
- A submit button using `.btn-secondary` (footer background is light, so the bordered/transparent secondary style fits better than the filled primary) or `.btn-primary` — final call made at implementation time by checking which reads better against the footer's existing background, without adding any new style.
- A hidden honeypot field for basic spam filtering (no visual styling needed — it stays hidden via an existing utility if one exists, otherwise via the `hidden` HTML attribute, which is not a `style=` attribute).

The form posts to the Cloudflare Worker endpoint (below), not Formspree — Formspree has no Notion-writing capability. On success, replace the form with an inline thank-you message via a small script (same pattern already used for the Tally trigger buttons); on failure, show an inline error and leave the form intact so the visitor can retry.

### C2. Backend — Cloudflare Worker
New, minimal, single-purpose Worker (new to this repo — no backend currently exists).

- Route: `POST https://<worker-name>.<subdomain>.workers.dev/subscribe` (or a custom route under `wildcare.space` if DNS is later pointed at it — not required for v1).
- Validates: honeypot field is empty, email is present and passes a basic format check, consent is `true`. Rejects otherwise with a 4xx JSON response.
- On success, calls the Notion API (`POST /v1/pages`) to create a row in a Notion database ("Email Signups") with properties:
  - **Email** (title or rich text)
  - **Consent** (checkbox, always `true` on a valid submission)
  - **Language** (`de` or `en`, from which the form was submitted in)
  - **Source** (fixed value: "Homepage footer")
  - (Notion's built-in `created_time` covers submission timestamp — no need to send one.)
- Notion integration token and database ID are stored as Worker secrets (`wrangler secret put`), never exposed to the client.
- CORS: `Access-Control-Allow-Origin` restricted to `https://wildcare.space` (and `http://localhost` variants only if needed for local testing).
- Returns `{ok: true}` on success, `{ok: false, error: "..."}` on failure, for the frontend script to branch on.

**Prerequisite (manual, not code):** an internal Notion integration must be created, the "Email Signups" database created and shared with that integration, and the integration token + database ID retrieved. This is a one-time setup step to do before the Worker can be deployed, and will be called out explicitly as the first task in the implementation plan.

### C3. Datenschutz.html update
Add a new section (matching the existing numbered-section style, e.g. after section 4 "Eingebundene Dienste") describing the new data collection: what's collected (email + consent), why (Monday class reminder), where it's stored (Notion, via a Cloudflare Worker relay), and how to opt out / request deletion. Mirror in the DE/EN toggle pattern used elsewhere on that page.

### Out of scope
- Tally form step-reordering (combining/reordering the membership application's early screens) is a Tally dashboard configuration change, not a file edit in this repo. Noted as a manual follow-up, not part of the implementation plan.
- **Nav emphasis for "Mitmachen" (originally B2) is dropped.** No existing CSS class achieves "more prominent than a muted nav link, less prominent than the filled `.nav-cta`" without adding new CSS: `.nav-cta` would make it a visual twin of "Komm vorbei", `.active` is already reserved sitewide for marking the current page, and `.btn-ghost` is overridden by `.nav-links a`'s higher specificity so it wouldn't visually change anything. Decision: leave the nav as-is; B1's hero link and B2 (tier benefit lines) carry the funnel-clarity goal instead.

## D. Cleanup

### D1. Remove stale `/en/` directory
The `/en/` directory (`brand.html`, `index.html`, `kontakt.html`, `mitmachen.html`, `programm.html`, `team.html`) predates the current inline DE/EN toggle system, is not linked from any live nav, but is still listed in `sitemap.xml` — exposing stale duplicate content to search engines.

**Fix:** delete the `/en/` directory entirely; remove all `<loc>https://wildcare.space/en/...</loc>` entries from `sitemap.xml`.

### D2. Pre-deploy QA checklist
Not a code change — a checklist to run through before shipping any of the above, across every changed page (`index.html`, `kontakt.html`, `mitmachen.html`, `programm.html`, `datenschutz.html`):

- [ ] DE and EN toggle both render correctly, desktop and mobile widths
- [ ] Keyboard-only pass: every new/changed CTA (mitmachen tier buttons, hero Mitglied werden link, footer signup form) is reachable via Tab, has a visible focus state, and activates via Enter/Space
- [ ] Lighthouse accessibility check on changed pages
- [ ] All form fields (contact form, footer signup) have properly associated `<label>`s
- [ ] Live end-to-end test: submit the Formspree contact form and confirm receipt
- [ ] Live end-to-end test: trigger the Tally membership popup from a mitmachen tier button and from programm.html, confirm it opens and (if possible) submit a test entry
- [ ] Live end-to-end test: submit the new footer email signup and confirm a row appears in the Notion database
- [ ] `sitemap.xml` no longer references `/en/`; spot-check `/en/*` URLs return 404 as expected post-deletion

## Open items carried into implementation planning

- Exact copy for the B2 tier benefit lines (DE + EN) — draft during implementation, matching existing tone.
- Whether the C1 footer signup submit button uses `.btn-primary` or `.btn-secondary` — decide at implementation time by checking against the footer's background, no new styling either way.
- Notion integration setup (token, database, sharing) is a manual prerequisite step the user must perform; the implementation plan will call it out as an explicit first task with instructions.
- No CSS files are edited and no inline `style="..."` attributes are added anywhere in this spec's implementation — verify this holds as a final check before considering the implementation done.
