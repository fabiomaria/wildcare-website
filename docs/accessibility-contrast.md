# Contrast accessibility review

Last reviewed: 2026-08-20

## Scope

The review covered the 21 HTML routes in the generated sitemap at desktop and
collapsed-navigation widths. Computed foreground and solid-background colours
were checked against WCAG 2.2 AA thresholds:

- 4.5:1 for normal text;
- 3:1 for large text;
- 3:1 for visual information needed to identify active controls.

Image- and video-backed text requires visual review because its contrast changes
with the underlying media. Disabled controls are not required to meet the active
control contrast threshold.

## Changes

- Scoped the legacy simple-footer opacity rule so it no longer fades the shared
  page footer and all of its children.
- Added a darker terracotta text shade for links, ghost buttons, card actions,
  badges, and other small accent text while retaining the original terracotta
  for larger decorative surfaces.
- Increased contrast for navigation links, breadcrumbs, language controls,
  labels, secondary copy, team roles, workshop metadata, and Journal cards.
- Improved contact-form placeholders, field boundaries, notes, and focused
  field borders.
- Corrected the Journal article selector that changed a primary CTA's text from
  warm white to terracotta on a moss background.
- Removed several low-opacity inline treatments from Brand and About content.

The main implementation is in `css/styles.css`, with scoped template corrections
in `site/journal-post.njk`, `site/mitmachen.njk`, and `site/team.njk`.

## Design-preserving exceptions

Two homepage surfaces retain their original appearance by owner decision:

- The navigation remains transparent over the video hero. Contrast therefore
  depends on the current video frame and cannot be guaranteed from static colour
  values alone.
- The upcoming-events band retains the original terracotta background. Its small
  warm-white eyebrow label is below the 4.5:1 normal-text threshold. The event
  cards themselves use accessible light surfaces and dark text.

If full WCAG AA conformance becomes a release requirement, revisit these two
surfaces with a localized text backdrop, stronger media overlay, or a revised
event-band text treatment that preserves the preferred colour.

## Verification

Run the production checks after contrast-related changes:

```bash
npm run schema:check
npm run test:calendar
npm run build
git diff --check
```

Then visually review the homepage video header, homepage event band, shared
footer, Contact form, Journal listing/article CTA, and at least one workshop page
at desktop and mobile widths.
