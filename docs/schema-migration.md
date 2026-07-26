# Wild Care content schema migration

Status: Proposed

Target schema: v2

Scope: Site settings, fixed pages, workshops, journal posts, and legal pages

CMS: Sveltia CMS

Frontend: Eleventy

## Current release status — 2026-07-26

This release is the compatibility step before the atomic v2 migration described
below. It keeps the current v1 content envelope so existing CMS entries remain
editable, while implementing the workshop-page requirements that prompted this
specification:

- workshop language mode and status remain shared publishing controls;
- English-only workshop pages suppress the public language selector;
- workshop media can be selected from either CMS language editor;
- hero, image-band, and facilitator images have non-destructive focal-point
  controls;
- the practice and image-band text blocks use restricted rich-text fields;
- workshop pages support an optional closing registration call to action;
- the Programme page derives “What’s happening now” from `current` workshops
  and “What’s coming next” from `upcoming` workshops;
- upcoming workshop previews do not render clickable links unless
  `outlook.show_links` is explicitly enabled.

Because Sveltia v1 locale ownership still makes shared fields belong to its
default locale, mono-lingual entries retain a compatibility locale shell in
this release. The v2 cutover removes that workaround by moving shared objects
under `global` and making `de` and `en` optional content objects.

## 1. Purpose

The current content model uses Sveltia CMS native internationalization. In that
model, every collection has one default locale. Fields configured with
`i18n: false` exist only in the default locale, while fields configured with
`i18n: duplicate` are read-only in every other locale.

This creates three recurring problems:

1. Global settings such as language mode, publication status, URLs, images, and
   focal points are presented as if they belong to one language.
2. An English-only entry cannot remove German when German is the collection
   default; changing the default merely reverses the problem for German-only
   entries.
3. A CMS configuration and content files using different default locales can
   make entries disappear from the editor with “Entry not found.”

Schema v2 removes locale ownership from global data. The CMS will edit one
language-neutral record containing:

- a `global` object for shared operational data;
- an optional `de` object for German content;
- an optional `en` object for English content.

Sveltia native i18n will not be enabled for v2 collections. This makes global
fields editable exactly once and makes each language an explicit, optional
content object.

## 2. Goals

- Make global fields editable regardless of the page language.
- Never disable shared image, video, or focal-point controls because of locale.
- Do not render a German content form for an English-only entry, or an English
  content form for a German-only entry.
- Keep bilingual entries editable in one screen without duplicated global data.
- Preserve current frontend URLs and visual output during migration.
- Provide a dual-read period and an explicit rollback path.
- Validate language mode against the language objects that actually exist.
- Use structured data for dates, prices, links, and media where practical.

## 3. Non-goals

- Changing the visual design of any page.
- Changing public URLs.
- Translating missing content automatically.
- Introducing a different CMS.
- Allowing arbitrary HTML from rich-text fields.
- Deleting legacy content before parity has been verified.

## 4. Current content inventory

| Content type | Current storage | Current locale model | Main issue |
| --- | --- | --- | --- |
| Site settings | `content/site.yaml` | `de` and `en` in one file | Shared routes and media live under German |
| Fixed pages | `content/pages/*.yaml` | `de` and `en` in one file | Non-translated fields belong to the default locale |
| Workshops | `content/workshops/*.yaml` | `de` and `en` in one file | Entry ID and shared media are locale-owned |
| Journal posts | Paired `.md` and `.en.md` files | Separate files | Shared dates, status, and media are duplicated |
| Legal pages | `content/legal/*.md` | German-only files | No explicit language mode or schema version |

`content/pages/cellular-touch.yaml` is an obsolete Phase 0 sample. The canonical
Cellular Touch entry is `content/workshops/cellular-touch.yaml`. The sample
should be removed only after the v2 workshop cutover has passed parity checks.

## 5. Canonical v2 envelope

All CMS-managed records use the same top-level contract:

```yaml
schema_version: 2
global:
  id: how-we-move-together
  language_mode: en_only
  status: unlisted
  route: /how-we-move-together.html
de: null
en:
  title: How We Move Together
```

### 5.1 Required global fields

Every record must contain:

| Field | Type | Meaning |
| --- | --- | --- |
| `schema_version` | integer | Must be `2` |
| `global.id` | string | Stable content identifier; never translated |
| `global.language_mode` | enum | `de_only`, `en_only`, or `bilingual` |
| `global.status` | enum | Content-type-specific publication state |
| `global.route` | string | Canonical public path |

### 5.2 Language invariants

The build validator must enforce:

| `language_mode` | Required object | Forbidden object |
| --- | --- | --- |
| `de_only` | `de` | `en` |
| `en_only` | `en` | `de` |
| `bilingual` | `de` and `en` | None |

An absent language is represented by `null` or an omitted key. It must not be
represented by a duplicate of another language.

Sveltia does not currently support dependent fields. Therefore `de` and `en`
are configured as optional Object fields. When absent, the CMS shows only an
“add content” control rather than rendering the language’s full form. The build
validator, not conditional UI logic, enforces the table above.

## 6. Global versus localized field policy

Use the following decision rule:

- Put a value in `global` if translating it would be incorrect.
- Put a value under `de` or `en` if a reader may perceive or hear it.
- Split a concept when it has both operational and presentational parts.

### 6.1 Always global

- IDs, slugs, routes, templates, and schema versions
- publication status and sorting keys
- machine-readable dates and times
- registration destinations and external URLs
- image and video file paths
- focal points and display variants
- numeric prices, currency codes, and capacity
- map coordinates
- form endpoint identifiers
- relationships to other records

### 6.2 Always localized

- headings, labels, summaries, and paragraphs
- rich-text content
- alternative text and accessibility descriptions
- human-readable dates, times, prices, and addresses
- button labels
- biographies and role descriptions
- SEO titles and descriptions
- quote text

### 6.3 Split fields

Examples:

```yaml
global:
  registration:
    url: https://tally.so/r/example
  hero:
    main_image:
      src: /assets/uploads/example.webp
      focal_point: top
en:
  registration:
    label: Register now
  hero:
    main_image_alt: Two dancers sharing weight
```

### 6.4 Optional localization classes

Not every value is permanently global or permanently translated. V2 assigns
every field path one of four localization classes:

| Class | Storage | Resolution |
| --- | --- | --- |
| `G` | `global` only | The same value is used for every language |
| `L` | `de` and/or `en` only | A value must exist for each enabled language |
| `G+O` | Global default plus optional locale override | Locale override, otherwise global value |
| `S` | Split object | Operational subfields are global; presentation subfields are localized |

Example of a shared image that may later need a language-specific version:

```yaml
global:
  hero:
    image:
      src: /assets/images/hero.webp
      focal_point: center
de:
  hero:
    image_alt: Menschen in Bewegung
en:
  hero:
    image:
      src: /assets/images/hero-with-english-text.webp # optional G+O override
      focal_point: top                         # optional paired override
    image_alt: People moving
```

Locale overrides are allowed only on paths marked `G+O` in this specification.
The content adapter resolves each such field as:

```text
locale override → global default → validation error when required
```

This provides optional localization without duplicating every non-localized
object. It also supports text-bearing graphics, language-specific registration
destinations, culturally localized names, or different media crops when those
are genuinely needed.

## 7. Target schemas by content type

### 7.1 Site settings

File: `content/site.yaml`

```yaml
schema_version: 2
global:
  id: site
  language_mode: bilingual
  status: published
  routes:
    home: /index.html
    team: /team.html
    programme: /programm.html
    journal: /journal.html
    participate: /mitmachen.html
    contact: /kontakt.html
  seo:
    default_og_image:
      src: /assets/images/social-preview.jpg
      width: 1200
      height: 630
  contact:
    email: hello@wildcare.space
  social: {}
de:
  nav: {}
  footer: {}
  workshop_ui: {}
  seo:
    default_og_image_alt: ""
en:
  nav: {}
  footer: {}
  workshop_ui: {}
  seo:
    default_og_image_alt: ""
```

Navigation labels are localized; route destinations are global.

### 7.2 Fixed pages

Files: `content/pages/*.yaml`

```yaml
schema_version: 2
global:
  id: team
  language_mode: bilingual
  status: published
  route: /team.html
  template: team
  media:
    verena_portrait:
      src: /assets/images/verena.jpg
      focal_point: center
    fabio_portrait:
      src: /assets/images/fabio.jpg
      focal_point: center
  actions:
    contact:
      href: /kontakt.html
de:
  meta: {}
  hero: {}
  sections: []
en:
  meta: {}
  hero: {}
  sections: []
```

Page-specific modules may remain named objects during the first migration.
Converting every fixed page to a page-builder list is a separate decision and is
not required for v2.

### 7.3 Workshops

Files: `content/workshops/*.yaml`

```yaml
schema_version: 2
global:
  id: how-we-move-together
  language_mode: en_only
  status: unlisted
  route: /how-we-move-together.html
  detail_page: true
  start_at: 2026-10-09T19:00:00+02:00
  end_at: 2026-10-11T19:00:00+02:00
  sort_order: 2
  registration:
    url: https://tally.so/r/PLACEHOLDER
  pricing:
    currency: EUR
    minimum: 70
    maximum: 200
    model: sliding_scale
  location:
    name: Orpheumgasse
    postal_code: "8010"
    city: Graz
  hero:
    show_details: true
    video: null
    video_poster: null
    main_image:
      src: /assets/uploads/_dsc8336.webp
      focal_point: center
    inset_image:
      src: /assets/uploads/_dsc8761.webp
      focal_point: top
  image_band:
    image:
      src: /assets/uploads/acam6757.webp
      focal_point: center
  facilitators:
    - id: fran
      name: Fran
      image:
        src: /assets/uploads/_dsc8761.webp
        focal_point: top
de: null
en:
  title: How We Move Together
  registration:
    label: Register now
    note: ""
  facts:
    date: 9–11 October 2026
    time: ""
    location: Orpheumgasse, 8010 Graz
    price: 70–200 EUR sliding scale
  card: {}
  hero:
    badge: Workshop · Contact Improvisation
    headline: How We Move Together
    main_image_alt: Dancers sharing weight
    inset_image_alt: Contact Improvisation research
  description: {}
  research: {}
  image_band:
    alt: Group research through Contact Improvisation
  facilitators:
    fran:
      role: Contact Improvisation · Social Inquiry
      bio: ""
      image_alt: Fran
  meta: {}
```

Facilitators use stable IDs so localized biographies can reference the same
global person without relying on list position.

### 7.4 Journal posts

Target files: `content/journal/*.yaml`

Journal posts move from paired Markdown files into one YAML record. Markdown
bodies remain Markdown strings edited with the RichText widget.

```yaml
schema_version: 2
global:
  id: warum-ci
  language_mode: bilingual
  status: published
  route: /journal/warum-ci.html
  published_at: 2026-03-01
  sort_order: 2
  card_image:
    src: /assets/images/warum-ci.jpg
    focal_point: center
  hero_image:
    src: /assets/images/ci-cover.jpg
    focal_point: center
    variant: cover
de:
  title: Warum Contact Improvisation?
  excerpt: ""
  image_alt: ""
  hero_alt: ""
  body: |-
    Markdown content
  cta: {}
  meta: {}
en:
  title: Why Contact Improvisation?
  excerpt: ""
  image_alt: ""
  hero_alt: ""
  body: |-
    Markdown content
  cta: {}
  meta: {}
```

The old `.md` and `.en.md` files remain readable during the transition but are
deleted only after the YAML records pass parity checks.

### 7.5 Legal pages

Target files: `content/legal/*.yaml`

```yaml
schema_version: 2
global:
  id: datenschutz
  language_mode: de_only
  status: published
  route: /datenschutz.html
  effective_date: null
de:
  heading: Datenschutzerklärung
  meta: {}
  body: |-
    Markdown content
en: null
```

### 7.6 Exhaustive object localization catalogue

The following catalogue covers every current CMS-managed page object. Nested
fields inherit the object classification unless a field-level exception is
listed.

#### Shared objects used on every page

| Object or field | Class | Migration rule |
| --- | --- | --- |
| Record ID, route, template, status, sort order | `G` | Move to `global` |
| Language mode | `G` | One selector outside all language objects |
| Section enabled/disabled state | `G` | Store once; localized copy does not control layout |
| Section order and stable item IDs | `G` | Lists use IDs; localized lists reference those IDs |
| Heading, label, eyebrow, paragraph, quote | `L` | Store only under enabled languages |
| Internal/external URL | `G+O` | Global default; allow a locale-specific destination |
| Button style, action kind, icon key | `G` | Button label remains localized |
| Image/video source, focal point, display variant | `G+O` | Global by default; locale override allowed |
| Image alt text, caption, ARIA description | `L` | Required per enabled language when media is informative |
| SEO canonical route and image dimensions | `G` | Store once |
| SEO image source | `G+O` | Allow text-bearing localized social images |
| SEO title, description, image alt | `L` | Store per enabled language |
| Person ID and list order | `G` | Use stable IDs |
| Person name and portrait | `G+O` | Global default with optional cultural/media override |
| Person role, biography, portrait alt | `L` | Store per enabled language |
| Form endpoint, field keys, validation rules | `G` | Never translate |
| Form labels, placeholders, state and error messages | `L` | Store per enabled language |

#### Site settings — `content/site.yaml`

| Current object | Class | Field treatment |
| --- | --- | --- |
| `nav` | `S` | Route fields are `G+O`; visible labels are `L` |
| `seo` | `S` | Default image and dimensions are `G+O`/`G`; alt text is `L` |
| `footer` | `L` | All current footer copy is localized |
| `workshop_ui` | `L` | Facts-card, facilitator, FAQ, and detail labels are localized |
| Contact/social configuration added later | `S` | Destinations and handles are `G`; visible labels are `L` |

#### Homepage — `content/pages/index.yaml`

| Current object | Class | Field treatment |
| --- | --- | --- |
| `hero` | `S` | Copy is `L`; CTA destinations and any media are `G+O` |
| `event_banner` | `S` | Machine schedule/location are `G`; tag, formatted day/time/address/basis are `L` |
| `values` | `S` | Card IDs/order are `G`; label, heading, card title/text are `L` |
| `invitation` | `S` | Copy is `L`; CTA destination is `G+O` |
| `quote` | `L` | Quote and optional attribution are localized |
| `journal` | `S` | Query/count/source are `G`; heading and “all posts” label are `L` |
| Newsletter `cta` | `S` | Endpoint, provider/list ID, consent URL, and field keys are `G`; all visible copy is `L` |
| `meta` | `S` | Follows the shared SEO rule |

#### Contact — `content/pages/kontakt.yaml`

| Current object | Class | Field treatment |
| --- | --- | --- |
| `hero` | `L` | Current fields are localized copy; future media is `G+O` |
| `form` | `S` | Submission endpoint, method, field keys, and required rules are `G`; labels, placeholders, progress, success, and errors are `L` |
| `info` | `S` | Email/address/schedule source data are `G+O`; labels, formatted schedule, and highlight are `L` |
| `map` | `S` | Coordinates, provider, zoom, and destination URL are `G`; label, heading, caption, and accessible name are `L` |
| `footer` | `L` | Page-specific footer copy override |
| `meta` | `S` | Follows the shared SEO rule |

#### Team — `content/pages/team.yaml`

| Current object | Class | Field treatment |
| --- | --- | --- |
| `breadcrumb` | `L` | Localized navigation copy |
| `hero` | `L` | Current fields are localized copy; future media is `G+O` |
| `manifest` | `S` | Quote/copy are `L`; source name is `G+O` |
| `team.members` | `S` | Member IDs/order are `G`; name/image/focal point are `G+O`; alt/role/bio are `L` |
| `quote_band` | `S` | Quote is `L`; source is `G+O` |
| `philosophy` | `S` | Pillar IDs/order are `G`; all visible copy is `L` |
| `cta` | `S` | Destination/style are `G+O`/`G`; label, heading, text, and button are `L` |
| `footer` | `L` | Page-specific footer copy override |
| `meta` | `S` | Follows the shared SEO rule |

#### Journal landing — `content/pages/journal.yaml`

| Current object | Class | Field treatment |
| --- | --- | --- |
| `hero` | `L` | Label, heading, and intro are localized |
| `card` | `L` | “Read more” and empty-state copy are localized |
| `cta` | `S` | Destination/style are `G+O`/`G`; visible copy is `L` |
| `article` | `L` | Back, related label, and related heading are localized UI copy |
| Journal query/sort/pagination | `G` | Add to `global` if these become configurable |
| `meta` | `S` | Follows the shared SEO rule |

#### Programme — `content/pages/programm.yaml`

| Current object | Class | Field treatment |
| --- | --- | --- |
| `hero` | `L` | Current fields are localized copy |
| `core` | `S` | Row IDs/order/icons are `G`; row labels/values and section copy are `L`; registration/detail destinations are `G+O` |
| `projects` | `S` | Workshop query/filter is `G`; label and heading are `L` |
| `outlook` | `S` | Card IDs/order and link destinations are `G+O`; card and section copy are `L` |
| `cta` | `S` | Destination/style are `G+O`/`G`; visible copy is `L` |
| `meta` | `S` | Follows the shared SEO rule |

#### Monday class — `content/pages/montagskurs.yaml`

| Current object | Class | Field treatment |
| --- | --- | --- |
| `breadcrumb` | `L` | Localized navigation copy |
| `hero` | `S` | Image/focal point, structured schedule/address, and CTA destination are `G+O`; headings, formatted schedule/address/basis, CTA label, and alt are `L` |
| `practice` | `S` | Video/poster/focal point are `G+O`; label, heading, paragraphs, and media descriptions are `L` |
| `learn` | `S` | Card IDs/order are `G`; all visible copy and donation note are `L` |
| `testimonials` | `S` | Testimonial IDs/order/author identity are `G+O`; quote and optional author display override are `L` |
| `team.members` | `S` | Same person rules as the Team page |
| `faq` | `S` | Item IDs/order are `G`; questions and answers are `L` |
| `crosslink` | `S` | Destination is `G+O`; visible copy is `L` |
| `cta` | `S` | Destination/style are `G+O`/`G`; visible copy is `L` |
| `footer` | `L` | Page-specific footer copy override |
| `meta` | `S` | Follows the shared SEO rule |

#### Participation — `content/pages/mitmachen.yaml`

| Current object | Class | Field treatment |
| --- | --- | --- |
| `hero` | `L` | Current fields are localized copy |
| `core_message` | `L` | Localized copy |
| `circles` | `S` | Outer/inner IDs and tag IDs/order are `G`; all visible descriptions and tags are `L` |
| `membership` | `S` | Tier IDs, icon, numeric price, currency, billing period, action target, and `tier_arg` are `G+O`; names, formatted amounts, quote, description, button, ARIA, and notes are `L` |
| `footer` | `L` | Page-specific footer copy override |
| `meta` | `S` | Follows the shared SEO rule |

#### Workshops — `content/workshops/*.yaml`

| Current object | Class | Field treatment |
| --- | --- | --- |
| Publishing/logistics | `S` | Slug/route, status, detail-page flag, machine dates, sort order, registration URL are `G`; displayed facts are `L` |
| `registration` | `S` | URL/action kind are `G+O`; label and note are `L` |
| `facts` | `S` | Structured dates, location, price, duration, format IDs, and schedule IDs are `G`; formatted rows are `L` |
| `card` | `S` | Tag style/IDs are `G`; tag labels, subtitle, summary, and detail label are `L` |
| `hero` | `S` | Video, poster, images, focal points, and show-details flag are `G+O`; badge, headings, subtitle, ARIA, alt text, and note are `L` |
| `description` | `S` | Enabled/show-info flags are `G`; label, heading, body, and info title are `L` |
| `research.fields` | `S` | Card IDs/order and highlighted flag are `G`; number/eyebrow, title, and text are `L` |
| `image_band` | `S` | Enabled flag, image, and focal point are `G+O`; label, heading, body, and alt are `L` |
| `closing_cta` | `S` | Enabled flag, destination, and style are `G+O`/`G`; heading, text, and button label are `L` |
| `facilitators.members` | `S` | Stable person IDs/order are `G`; name/image/focal point are `G+O`; alt, role, and bio are `L` |
| `facilitators.quotes` | `S` | Quote IDs/order and author identity are `G+O`; quote and optional author display override are `L` |
| `faq.items` | `S` | Item IDs/order are `G`; questions and answers are `L` |
| `meta` | `S` | Follows the shared SEO rule |

#### Journal posts — current paired Markdown files

| Current object | Class | Field treatment |
| --- | --- | --- |
| `language_mode`, date, sort order, status | `G` | Store once in the YAML record |
| Title and excerpts | `L` | Store per enabled language |
| Card/hero image and variant | `G+O` | Global default with optional locale override |
| Card/hero alt text | `L` | Store per enabled language |
| Markdown body | `L` | Store per enabled language without modifying Markdown |
| `tally` and CTA button action/style/target | `G+O` | Operational values global; locale override allowed for target |
| CTA heading/text/button label | `L` | Store per enabled language |
| `meta` | `S` | Follows the shared SEO rule |

#### Legal pages — `content/legal/*`

| Current object | Class | Field treatment |
| --- | --- | --- |
| ID, route, status, effective date | `G` | Store once |
| Heading and Markdown body | `L` | German currently required; English optional only if language mode changes |
| External legal references | `G+O` | May use a global destination with localized link labels in the body |
| `meta` | `S` | Follows the shared SEO rule |

### 7.7 Object-shape requirements

To make optional localization reliable across every page:

1. Every repeatable item receives a stable `id`; localized arrays must not be
   joined by position.
2. A locale override may replace a scalar or a complete media/action object,
   but may not partially replace an object in a way that leaves an invalid
   combination.
3. If a localized media `src` override exists, its paired focal point may
   override the global focal point; localized alt text remains required.
4. Global lists define membership and order. Locale objects provide copy keyed
   by item ID.
5. Empty strings do not count as overrides.
6. Removing a global object removes it from every locale.
7. Adding a locale does not duplicate global objects; it adds only localized
   copy and optional overrides.
8. The adapter must report every consumed fallback or override in `--check`
   mode so migration results are auditable.

## 8. CMS configuration

### 8.1 Collection rules

V2 collections must:

- omit collection-level `i18n`;
- define `schema_version` as a hidden field with default `2`;
- define `global` as a required Object field;
- define `de` and `en` as optional Object fields;
- keep all media paths and focal points inside `global`;
- keep all alternative text inside the relevant language object;
- use `widget: richtext` with the existing restricted toolbar for large text;
- use no inline styles and introduce no frontend design tokens.

### 8.2 Language selector

`global.language_mode` is an ordinary Select field. It is visible and editable
once, independent of German or English content.

The three options are:

- German only (`de_only`)
- English only (`en_only`)
- German and English (`bilingual`)

### 8.3 CMS validation limitations

Sveltia cannot currently show or hide arbitrary fields based on another field.
The editor therefore cannot automatically add or remove `de` and `en` when the
language mode changes.

Mitigations:

1. Keep both language objects optional.
2. Add clear hints to the language selector and language objects.
3. Reject invalid combinations in the repository build.
4. Provide an idempotent migration/normalization script.
5. Add CMS event-hook validation later only if it can remain version-stable.

## 9. Frontend reader contract

Eleventy receives normalized records in this shape:

```js
{
  schemaVersion: 2,
  global: {},
  locales: {
    de: null,
    en: {}
  },
  primaryLocale: "en",
  availableLocales: ["en"]
}
```

Templates must not read raw YAML directly. A content adapter selects the
requested locale and combines:

1. the immutable `global` object;
2. the requested language object;
3. explicitly defined site UI fallbacks.

Localized content must never silently fall back to another language on a detail
page. Missing required localized content is a build error.

Programme cards may use the entry’s primary language when the surrounding page
does not have a matching translation. This fallback must be explicit and
visually remain in the source language.

## 10. Migration sequence

The order is mandatory. The “Entry not found” incident occurred because a new
CMS locale contract was loaded against old production content.

### Phase 0 — Freeze and fixtures

1. Record the production commit SHA.
2. Export every CMS-managed content file.
3. Save representative rendered HTML and screenshots for every page type.
4. Add fixtures for `de_only`, `en_only`, and `bilingual`.
5. Document all known intentional language asymmetries.

### Phase 1 — Dual-read frontend

1. Add `schema_version` detection.
2. Preserve current v1 readers.
3. Add v2 adapters and validators.
4. Make templates consume only normalized adapter output.
5. Build both v1 and v2 fixtures in CI.

No CMS configuration changes occur in this phase.

### Phase 2 — Idempotent converters

Create scripts:

- `scripts/migrate-site-schema-v2.js`
- `scripts/migrate-pages-schema-v2.js`
- `scripts/migrate-workshops-schema-v2.js`
- `scripts/migrate-journal-schema-v2.js`
- `scripts/migrate-legal-schema-v2.js`
- `scripts/validate-content-schema-v2.js`

Each converter must:

- refuse unknown input shapes;
- support `--check` without writing;
- write deterministic YAML;
- preserve Markdown exactly;
- never infer a translation;
- emit a field-level migration report;
- be safe to run twice;
- create no network side effects.

### Phase 3 — Content conversion

1. Convert site settings.
2. Convert fixed pages.
3. Convert workshops.
4. Convert journal posts.
5. Convert legal pages.
6. Run v1-versus-v2 normalized-data comparisons.
7. Run rendered HTML and screenshot parity checks.

### Phase 4 — Atomic CMS cutover

The v2 CMS configuration and all v2 content files must be published in the same
production commit. A local v2 CMS must not point at a repository revision that
still contains v1 files.

For local review, use either:

- a local CMS backend reading the working tree; or
- a preview branch containing both the v2 config and converted content.

Do not test a working-tree `admin/config.yml` against unrelated production
content.

### Phase 5 — Cleanup

After at least one successful production editing cycle:

1. Remove v1 readers.
2. Remove paired legacy journal Markdown files.
3. Remove the obsolete `content/pages/cellular-touch.yaml` sample.
4. Remove compatibility comments and unused field aliases.
5. Keep the converter and validator for auditability.

## 11. Field migration rules

### 11.1 Images

For every image:

- move `src`, focal point, and display variant to `global`;
- keep `alt` and ARIA descriptions localized;
- preserve the original full-resolution asset;
- use CSS `object-position` classes for display crops;
- never write crop coordinates into inline CSS.

### 11.2 Links and calls to action

- move `href`, Tally IDs, and action type to `global`;
- keep button labels, headings, and explanatory text localized.

### 11.3 Dates and schedules

- add machine-readable ISO date/time fields to `global`;
- retain localized display strings during v2;
- do not generate copy automatically until formatting requirements are agreed.

### 11.4 Prices

- add numeric minimum/maximum and ISO currency to `global`;
- retain localized display text for sliding-scale explanations.

### 11.5 People

- assign each person a stable global ID;
- store name, portrait, and focal point globally unless culturally localized;
- store role, biography, and portrait alternative text per language.

### 11.6 SEO

- keep canonical route and social image path global;
- keep title, description, social title, social description, and image alt text
  localized;
- validate social image dimensions against the actual asset where possible.

## 12. Validation and acceptance criteria

### 12.1 Schema validation

- Every record has `schema_version: 2`.
- Every `global.id` is unique within its content type.
- `language_mode` matches the existing language objects.
- Every referenced media path exists.
- Every focal point is one of the nine supported presets.
- Every published record has required SEO fields.
- No locale contains fields classified as global.

### 12.2 CMS acceptance

- An English-only entry opens without a German editing pane.
- A German-only entry opens without an English editing pane.
- A bilingual entry shows both optional language objects.
- Language mode is visible once and is editable.
- Image Replace and Remove buttons work for every language mode.
- Focal-point controls work for every language mode.
- Saving and reopening an entry preserves all values.
- A config/content version mismatch produces a clear validation error, not
  “Entry not found.”

### 12.3 Frontend acceptance

- All existing URLs remain unchanged.
- English-only detail pages emit `lang="en"` and no German toggle.
- German-only detail pages emit `lang="de"` and no English toggle.
- Bilingual pages retain both languages.
- Programme cards follow the documented language fallback.
- Rich text retains paragraph, bold, italic, and link formatting.
- Hero, image-band, and portrait crops match their focal points.
- SEO validation passes for every sitemap URL.
- Visual regression screenshots match approved references.

## 13. Rollback

Before cutover, preserve the last v1-compatible commit SHA.

If the v2 CMS or build fails:

1. Stop CMS editing.
2. Revert the single atomic v2 cutover commit.
3. Redeploy the v1 config and content together.
4. Preserve any v2 edits in a separate branch.
5. Fix the converter or adapter and rerun parity checks.

Never revert only `admin/config.yml` or only the content files. They form one
versioned contract.

## 14. Open decisions

- Whether fixed pages should retain named sections or adopt a page-builder list.
- Whether journal bodies should move to YAML or remain in paired Markdown files
  with a separate global registry.
- Whether human-readable workshop dates should eventually be generated from
  structured global dates.
- Whether facilitator identities should become a reusable people collection.
- Whether legal pages will remain German-only.

These decisions do not block the workshop v2 schema, but they should be resolved
before starting the all-content conversion scripts.
