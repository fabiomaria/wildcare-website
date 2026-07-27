# Wild Care content schema v2 — executable migration contract

Status: Ready for implementation

Contract version: 2.0

Target content schema: 2

CMS: Sveltia CMS

Frontend: Eleventy

Scope: Site settings, every fixed page, workshops, journal posts, and legal
pages

## 1. Purpose

This document is the execution contract for moving Wild Care CMS content from
the current locale-owned schema to a language-neutral schema.

It replaces the earlier design draft. Implementation is split into
dependency-ordered tasks. A task is complete only when its listed artifacts
exist, its commands pass, and its evidence has been recorded.

The migration solves these current problems:

- shared fields appear to belong to the CMS default language;
- image controls become read-only in another language editor;
- mono-lingual entries require compatibility content in an unused locale;
- changing CMS locale configuration independently from content can make an
  entry disappear with “Entry not found”;
- localization rules are repeated in documentation, CMS configuration,
  adapters, validators, and migration scripts.

## 2. Current production compatibility state

The release deployed on 2026-07-26 remains schema v1. It contains compatibility
improvements required before the v2 migration:

- workshop language and status controls;
- English-only frontend rendering;
- editable workshop media in either v1 language editor;
- non-destructive image focal points;
- restricted rich text for workshop practice and image-band content;
- optional workshop closing calls to action;
- Programme sections generated from workshop status;
- non-clickable upcoming workshop previews by default.

The v1 compatibility locale shells remain until the relevant collection
completes its v2 cutover.

## 3. Contract authority

### 3.1 Normative artifacts

Once Task `MIG-01` is complete, these files are authoritative:

| Artifact                                     | Authority                                                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `schema/content-schema-v2.registry.json`     | Field paths, types, localization classes, requirements, enums, ordering, references, and resolution rules |
| `schema/content-schema-registry.schema.json` | Valid shape of the registry itself                                                                        |
| `schema/generated/*.schema.json`             | Generated validation schemas for v2 records                                                               |
| `admin/config.yml`                           | CMS labels, hints, grouping, widgets, and editorial layout                                                |
| `docs/generated/content-schema-v2.md`        | Generated human-readable field catalogue; never edited manually                                           |
| This document                                | Task order, release gates, rollback, and change control                                                   |

If this document and the registry disagree about a field, the registry wins.
If the CMS configuration disagrees with the registry, CI must fail.

### 3.2 No duplicated field catalogue

This document intentionally does not contain an exhaustive table of page
fields. Task `MIG-02` records every field for every content type in the
machine-readable registry. Task `MIG-03` generates the readable catalogue from
that registry.

### 3.3 Change control

A registry change requires all of the following in one pull request:

1. increment `registry_revision`;
2. update or add a fixture;
3. regenerate derived JSON schemas and documentation;
4. update CMS configuration if editor-visible fields changed;
5. update migration and downgrade mappings when storage changed;
6. pass the complete schema contract check.

Generated files must never be edited by hand.

Calendar revision 2 adds locale-neutral `venue` records and localized `event`
records. Dated records carry a `global.schedule` block in either `dates` or
`recurring` mode. Session and recurrence times are quoted floating-local
strings; `global.start_at` must match the earliest dates-mode session. The
schedule uses the closed `event_status`, `availability`, `event_type`,
`weekday`, `schedule_mode`, and `page_mode` enums. `global.venue` references a
venue record and orphan references are errors. Stable IDs are required for
sessions and featured occurrences, including localized featured notes. The
fixed-page Montagskurs carries a recurring schedule, so validation is based on
the presence of the schedule block rather than record type. `lib/calendar/`
consumes these records for Eleventy JSON-LD, ICS feeds, and generated pages.

## 4. Canonical v2 record

All YAML-managed v2 records use this envelope:

```yaml
schema_version: 2
global:
  id: how-we-move-together
  intended_locales:
    - en
  status: upcoming
  route: /how-we-move-together
  start_at: 2026-10-09T19:00:00+02:00
  registration:
    url: https://tally.so/r/PLACEHOLDER
  hero:
    main_image:
      src: /assets/uploads/_dsc8336.webp
      focal_point: center
locales:
  en:
    title: How We Move Together
    registration:
      label: Register now
    hero:
      main_image_alt: Dancers sharing weight
```

Rules:

1. `schema_version` must equal `2`.
2. `global` is required.
3. `locales` is a map keyed by BCP 47-compatible locale identifiers.
4. Missing locales are omitted; they are not represented by `null`, empty
   objects, or copied fallback content.
5. `global.intended_locales` expresses editorial intent.
6. Available locales are derived only from non-empty keys in `locales`.
7. The validator requires the intended and available locale sets to match.
8. Templates branch only on derived available locales, never on
   `intended_locales`.
9. A detail page never silently substitutes content from another language.

Example validation error:

```text
content/workshops/example.yaml:
declared intended locale "en", but locales.en is missing.
Add English content or remove "en" from global.intended_locales.
```

## 5. Localization contract

### 5.1 Leaf classes

Localization classes apply only to leaf values. Objects and lists are
structural paths and do not have a localization class.

| Class | Storage                                                   | Resolution                                                                   |
| ----- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `G`   | `global`                                                  | Use the global value                                                         |
| `L`   | `locales.<locale>`                                        | Use the requested locale value                                               |
| `G+O` | Global default plus an explicitly allowed locale override | Locale override, then global value, otherwise validation error when required |

No `S` class exists.

### 5.2 Default policy

Operational fields default to `G`, including:

- IDs, routes, status, dates, and ordering;
- media paths, focal points, and variants;
- URLs, form endpoints, and action types;
- numeric prices, currencies, and capacity;
- coordinates and relationships.

Reader-facing copy defaults to `L`, including:

- headings, labels, paragraphs, rich text, and quotes;
- alternative text and accessible names;
- formatted dates, prices, schedules, and addresses;
- biographies and button labels;
- SEO titles, descriptions, and image descriptions.

`G+O` is opt-in per registry field. Supporting an override in the resolver does
not automatically permit one in content or expose one in the CMS.

### 5.3 Override storage

Permitted overrides live under a dedicated namespace:

```yaml
global:
  hero:
    image:
      src: /assets/images/hero.webp
      focal_point: center
locales:
  en:
    overrides:
      hero:
        image:
          src: /assets/images/hero-en.webp
          focal_point: top
```

The registry must define:

- the global path;
- the override path;
- whether the override is scalar or an atomic object group;
- whether an override is required to replace every field in that group.

Empty strings never count as overrides. Partial atomic-object overrides are
invalid.

### 5.4 Required and empty values

Every `L` field definition includes:

- `required`;
- optional `required_when`;
- `allow_empty`;
- `nullable`.

Optional values should be omitted. Empty strings are valid only where the
registry explicitly sets `allow_empty: true`.

### 5.5 Adding override support

Promoting a field from `G` to `G+O` requires:

1. one registry change;
2. one resolver fixture with an override;
3. one resolver fixture without an override;
4. one invalid empty or partial override fixture;
5. a CMS control for the override;
6. migration and downgrade coverage.

## 6. Identity, routing, ordering, and references

### 6.1 Identity

`global.id` is authoritative.

- For file collections, the filename stem must equal `global.id`.
- IDs are unique within a record type.
- Routes are unique across all public records.
- Routes are not derived from IDs because existing German-named routes must
  remain stable.

### 6.2 Routes

Routes remain `G` during schema v2. Bilingual pages continue to serve both
languages at one canonical URL. This deliberately preserves current URLs,
incoming links, and the existing client-side language switch.

Localized routes require a separate routing, redirect, canonical, and
`hreflang` design. They are not part of this migration.

### 6.3 Cross-record ordering

`sort_order` is an optional non-negative integer used only as a tie-breaker.
When absent it resolves to `999`.

The registry specifies the primary ordering for each listing. Final ordering is
always deterministic:

```text
primary date or status order → sort_order → global.id
```

Ties are allowed because `global.id` provides the final stable key.

### 6.4 Ordered nested items

Global lists define membership and order. Every repeatable item has a stable
`id`. Localized item content is stored in a map keyed by that ID.

The validator must:

- reject a localized key not present in the global list;
- reject duplicate global IDs;
- enforce required localized fields for every enabled locale;
- allow omitted optional localized fields;
- never join localized content by array position.

## 7. Required enums

The registry contains the authoritative enum arrays. It must include at least
the current values below.

### 7.1 Status by record type

| Record type   | Values                                             |
| ------------- | -------------------------------------------------- |
| Site settings | `published`                                        |
| Fixed page    | `draft`, `published`, `unlisted`                   |
| Workshop      | `draft`, `upcoming`, `current`, `past`, `unlisted` |
| Journal       | `published`, `coming_soon`, `unlisted`             |
| Legal page    | `draft`, `published`                               |

### 7.2 Shared enums

```text
focal_point:
  center
  top
  bottom
  left
  right
  top-left
  top-right
  bottom-left
  bottom-right

journal_hero_variant:
  cover
  contained

pricing_model:
  fixed
  donation
  sliding_scale
  free
```

Templates are enumerated per record type in the registry. Unknown template,
status, focal-point, media-variant, or pricing-model values are build errors.

## 8. Journal body storage

Journal Markdown does not move into YAML.

Target layout:

```text
content/journal/
  records/
    warum-ci.yaml
  bodies/
    warum-ci.de.md
    warum-ci.en.md
```

The YAML record contains global metadata and localized metadata. Body filenames
are derived from `global.id` and the locale key; they are not stored as a third
identity value.

The registry marks the logical `body` field as:

```json
{
  "class": "L",
  "storage": "markdown_file",
  "path_pattern": "content/journal/bodies/{id}.{locale}.md"
}
```

The converter must preserve the Markdown body bytes after the existing front
matter delimiter, including the final-newline state. The validator requires
exactly one body file for every intended journal locale and rejects orphan body
files.

## 9. Reader contract

All templates consume this normalized shape:

```js
{
  schemaVersion: 2,
  global: {},
  locales: {
    en: {}
  },
  availableLocales: ["en"],
  primaryLocale: "en"
}
```

The adapter:

1. detects `schema_version`;
2. reads v1 through the existing compatibility path;
3. reads v2 through the registry-backed resolver;
4. validates before normalization;
5. returns the same normalized interface for both versions;
6. records every `G+O` fallback or override in check mode.

Programme cards may use the record’s primary locale when the surrounding page
does not contain that locale. That exception is explicit and must not translate
or relabel the workshop content.

## 10. Command contract

The tasks below add these package scripts. Once the task that introduces a
command is complete, the command becomes a required release gate.

```text
npm run schema:registry
npm run schema:docs
npm run schema:docs -- --check
npm run schema:cms -- --check
npm run schema:validate -- --all
npm run schema:migrate -- --collection <name> --check
npm run schema:migrate -- --collection <name> --write
npm run schema:downgrade -- --collection <name> --check
npm run schema:downgrade -- --collection <name> --write
npm run schema:parity -- --collection <name>
npm run build
```

General command requirements:

- `--check` never writes;
- `--write` refuses a dirty target file unless `--force` is explicitly passed;
- converters refuse unknown input shapes;
- converters are idempotent;
- output is deterministic;
- scripts create no network side effects;
- errors name the file and registry field ID;
- a non-empty warning set produces a non-zero exit unless explicitly allowlisted.

## 11. Task execution rules

1. Tasks run in dependency order.
2. A collection cutover cannot start until every foundation task is complete.
3. CMS editing is frozen only for the collection currently being cut over.
4. CMS config and content for one collection ship in the same commit.
5. Every collection completes a production editing cycle before the next
   collection starts.
6. Do not remove v1 readers until every collection has passed its editing cycle.
7. Each task records evidence in its named report or fixture path.
8. Failed acceptance commands block the next task.

## 12. Task ledger

| ID       | Task                                            | Depends on         | State       |
| -------- | ----------------------------------------------- | ------------------ | ----------- |
| `MIG-00` | Freeze baseline and resolve remaining decisions | None               | Complete                 |
| `MIG-01` | Create registry infrastructure                  | `MIG-00`           | Complete                 |
| `MIG-02` | Catalogue every current content field           | `MIG-01`           | Complete                 |
| `MIG-03` | Build validators and generated documentation    | `MIG-02`           | Complete                 |
| `MIG-04` | Add normalized dual-read adapters               | `MIG-03`           | Complete                 |
| `MIG-05` | Enforce the CMS contract                        | `MIG-03`           | Release evidence pending |
| `MIG-06` | Build migration and downgrade engines           | `MIG-03`, `MIG-04` | Complete                 |
| `MIG-07` | Cut over workshops                              | `MIG-05`, `MIG-06` | Release evidence pending |
| `MIG-08` | Cut over site settings                          | `MIG-07`           | Release evidence pending |
| `MIG-09` | Cut over every fixed page                       | `MIG-08`           | Release evidence pending |
| `MIG-10` | Cut over journal records and bodies             | `MIG-09`           | Release evidence pending |
| `MIG-11` | Cut over legal pages                            | `MIG-10`           | Release evidence pending |
| `MIG-12` | Remove v1 compatibility code                    | `MIG-11`           | Release evidence pending |

## 13. Executable tasks

### MIG-00 — Freeze baseline and resolve remaining decisions

Objective: Create a reproducible v1 reference before writing migration code.

Artifacts:

- `migration/baseline/production-sha.txt`
- `migration/baseline/content-manifest.json`
- `migration/fixtures/v1/`
- `migration/fixtures/rendered-v1/`
- `migration/fixtures/screenshots-v1/`

Actions:

1. Record the deployed production commit.
2. Hash every CMS-managed source file and referenced asset.
3. Copy representative fixtures for:
   - `de_only`, `en_only`, and bilingual records;
   - every fixed page;
   - every workshop status;
   - both journal hero variants;
   - each legal page.
4. Save normalized data, rendered HTML, and approved screenshots.
5. Record known intentional language asymmetries.
6. Confirm the enum lists in Section 7.
7. Confirm shared routes remain the v2 policy.
8. Confirm journal bodies remain Markdown files.

Acceptance:

```sh
npm run build
node scripts/validate-seo.js
git diff --check
```

Done when:

- every current content type has at least one fixture;
- the manifest contains a hash for every source and media file;
- the fixture build matches production at the recorded SHA;
- no migration implementation has started.

Rollback: Delete only the newly created baseline artifacts.

### MIG-01 — Create registry infrastructure

Objective: Make field knowledge machine-readable.

Artifacts:

- `schema/content-schema-registry.schema.json`
- `schema/content-schema-v2.registry.json`
- `scripts/schema/validate-registry.js`
- package script `schema:registry`

Registry minimum structure:

```json
{
  "schema_version": 2,
  "registry_revision": 1,
  "supported_locales": ["de", "en"],
  "enums": {},
  "record_types": {
    "workshop": {
      "source": "content/workshops/*.yaml",
      "identity": {},
      "ordering": {},
      "fields": []
    }
  }
}
```

Each leaf field definition must contain:

- a stable field `id`;
- class `G`, `L`, or `G+O`;
- global and/or locale storage path;
- value type;
- required and empty-value policy;
- enum reference when applicable;
- list/reference metadata when applicable;
- CMS visibility;
- v1 source mapping;
- v1 downgrade mapping.

Actions:

1. Add a JSON meta-schema for the registry.
2. Validate stable field-ID uniqueness.
3. Reject object-level localization classes.
4. Reject `G+O` entries without explicit override paths and fixtures.
5. Reject field definitions without downgrade mappings.
6. Add the enums from Section 7.

Acceptance:

```sh
npm run schema:registry
npm run schema:registry -- --fixture invalid-duplicate-field-id
npm run schema:registry -- --fixture invalid-object-class
npm run schema:registry -- --fixture invalid-override
```

The valid registry exits `0`. Every invalid fixture must exit non-zero with the
expected field-specific error.

Rollback: Remove the registry infrastructure; no content changes occur.

### MIG-02 — Catalogue every current content field

Objective: Cover all CMS-managed objects without maintaining a prose duplicate.

Record types:

- site settings;
- fixed pages:
  - homepage;
  - contact;
  - team;
  - journal landing;
  - programme;
  - Monday class;
  - participation;
- workshops;
- journal posts;
- legal pages.

Actions:

1. Inventory paths from `admin/config.yml`, every content source, and template
   reads.
2. Add every leaf path to the registry.
3. Classify operational fields as `G` unless a real override use case exists.
4. Add stable IDs to every repeatable-item contract.
5. Define required, optional, nullable, and empty-string behavior.
6. Define primary sort and tie-breaking for every listing.
7. Define reference targets and orphan rules.
8. Define v1 forward and downgrade mappings.
9. Add an explicit allowlist for content keys that are deliberately ignored.

Evidence:

- `migration/reports/field-inventory.json`
- `migration/reports/unclassified-paths.json`

Acceptance:

```sh
npm run schema:registry
npm run schema:inventory -- --check
```

Done when:

- every CMS field, content leaf, and template content read is classified;
- `unclassified-paths.json` contains an empty array;
- every repeatable object has an ID and orphan policy;
- no speculative `G+O` field remains.

Rollback: Revert registry entries and inventory reports; content remains v1.

### MIG-03 — Build validators and generated documentation

Objective: Enforce the registry and eliminate hand-maintained schema tables.

Artifacts:

- `scripts/schema/generate-json-schemas.js`
- `scripts/schema/validate-content.js`
- `scripts/schema/generate-docs.js`
- `schema/generated/*.schema.json`
- `docs/generated/content-schema-v2.md`
- package scripts `schema:validate` and `schema:docs`

Validation requirements:

- record envelope and schema version;
- ID, filename, and route rules;
- intended-versus-available locale equality;
- required, nullable, and empty values;
- enum membership;
- media existence;
- list-ID uniqueness and localized orphan rejection;
- allowed global and locale paths;
- `G+O` atomicity;
- deterministic sort fields;
- journal body presence and orphan detection.

Acceptance:

```sh
npm run schema:registry
npm run schema:docs
npm run schema:docs -- --check
npm run schema:validate -- --fixtures
git diff --exit-code -- schema/generated docs/generated
```

Done when valid fixtures pass, every invalid fixture fails for the expected
reason, and regeneration leaves the working tree unchanged.

Rollback: Remove generated artifacts and scripts; v1 readers remain unchanged.

### MIG-04 — Add normalized dual-read adapters

Objective: Let v1 and v2 records render through one template contract.

Artifacts:

- registry-backed resolver modules under `scripts/schema/` or `_data/`;
- updated Eleventy data loaders;
- v1/v2 normalized-data parity fixtures;
- package script `schema:parity`.

Actions:

1. Detect `schema_version` per record.
2. Keep existing v1 readers unchanged behind an adapter boundary.
3. Resolve v2 `G`, `L`, and allowed `G+O` values from the registry.
4. Derive available and primary locales.
5. Prevent implicit cross-language fallback on detail pages.
6. Preserve the explicit Programme-card primary-locale exception.
7. Emit a machine-readable override/fallback report in check mode.
8. Make templates consume normalized records only.

Acceptance:

```sh
npm run schema:parity -- --fixtures
npm run schema:validate -- --all
npm run build
node scripts/validate-seo.js
```

Done when paired v1 and v2 fixtures produce equivalent normalized data and
approved rendered HTML.

Rollback: Revert the adapter boundary. No production content has changed.

### MIG-05 — Enforce the CMS contract

Objective: Make the CMS representation agree with the registry without forcing
editorial labels and layout into the registry.

Artifacts:

- `scripts/schema/check-cms-contract.js`
- optional generated CMS field fragments;
- package script `schema:cms`;
- CMS browser fixtures for every language combination.

Actions:

1. Remove collection-level native i18n from a v2 test collection.
2. Expose `global.intended_locales` once.
3. Represent `locales.de` and `locales.en` as optional objects.
4. Test the repository’s pinned Sveltia build for multi-select support.
5. If multi-select is unsuitable, use a list of locale select values without
   changing the stored array contract.
6. Ensure shared media and focal-point controls are editable once.
7. Expose only registry-approved `G+O` overrides.
8. Check CMS type, required state, enum options, and storage path against the
   registry.
9. Keep human-facing labels, hints, grouping, and collapsed state hand-authored.

CMS acceptance matrix:

| Intended locales | Required editor result                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| `[de]`           | One shared section and an optional German content object; no populated English object |
| `[en]`           | One shared section and an optional English content object; no populated German object |
| `[de, en]`       | One shared section and both language objects                                          |

Because Sveltia does not guarantee dependent field visibility, unused optional
locale objects may still show an “add content” control. They must not contain a
duplicated form or be required to save.

Acceptance:

```sh
npm run schema:cms -- --check
npm run schema:validate -- --fixtures
npm run dev
```

Browser evidence must show create, edit, save, reopen, image replace/remove,
focal-point selection, and locale-intent changes for all three matrix rows.

Rollback: Revert the v2 test collection configuration. Production collections
remain v1.

### MIG-06 — Build migration and downgrade engines

Objective: Provide deterministic, reversible conversion before any cutover.

Artifacts:

- `scripts/schema/migrate-content.js`
- `scripts/schema/downgrade-content.js`
- collection mapping modules;
- package scripts `schema:migrate` and `schema:downgrade`;
- deterministic field-level reports under `migration/reports/`.

Forward-converter requirements:

- refuse unknown v1 shapes;
- preserve localized copy without translation;
- derive no content from another locale;
- move shared values according to the registry;
- omit optional empty values unless explicitly allowed;
- create stable nested IDs deterministically;
- preserve asset paths;
- preserve journal body bytes;
- produce the same output on a second run.

Downgrade requirements:

- reconstruct the v1 shape required by the current production adapter and CMS;
- preserve every locale and approved override;
- refuse a lossy mapping rather than choosing silently;
- report fields that cannot be represented in v1;
- produce the same output on a second run.

Acceptance for every collection:

```sh
npm run schema:migrate -- --collection <name> --check
npm run schema:migrate -- --collection <name> --write
npm run schema:migrate -- --collection <name> --check
npm run schema:downgrade -- --collection <name> --check
npm run schema:downgrade -- --collection <name> --write
npm run schema:parity -- --collection <name>
```

The round trip must reproduce the normalized v1 data. Any intentional
serialization difference must be listed in a deterministic allowlist.

Rollback: Revert the scripts and generated test outputs. Production content
remains v1.

### MIG-07 — Cut over workshops

Objective: Use workshops as the first production v2 collection.

Scope:

- `content/workshops/*.yaml`;
- the Workshops collection in `admin/config.yml`;
- workshop loaders and templates;
- Programme workshop queries;
- workshop-specific CMS fixtures.

Actions:

1. Freeze workshop editing.
2. Fetch the latest `production` branch.
3. Run the workshop converter in check mode.
4. Convert every workshop.
5. Update the Workshops CMS collection in the same commit.
6. Run validation, normalized parity, HTML parity, SEO, and screenshot checks.
7. Run the downgrade converter in check mode against the converted content.
8. Deploy to a preview branch and complete the CMS acceptance matrix.
9. Merge the one-collection cutover commit to `production`.
10. Complete at least one real production workshop edit and reopen the entry.
11. End the workshop editing freeze.

Acceptance:

```sh
npm run schema:migrate -- --collection workshops --check
npm run schema:validate -- --all
npm run schema:cms -- --check
npm run schema:parity -- --collection workshops
npm run schema:downgrade -- --collection workshops --check
npm run build
node scripts/validate-seo.js
```

Frontend checks:

- current and upcoming Programme sections remain status-driven;
- upcoming previews remain non-clickable by default;
- mono-lingual detail pages have one language and no toggle;
- bilingual detail pages retain both languages;
- rich text, media, focal points, and calls to action retain approved output.

Rollback: Follow Section 14 for `workshops` only.

### MIG-08 — Cut over site settings

Objective: Move shared navigation, footer, SEO defaults, routes, and workshop UI
copy to v2.

Scope:

- `content/site.yaml`;
- the Site Settings CMS collection;
- navigation, footer, SEO, and workshop UI consumers.

Actions and release sequence are identical to `MIG-07`, scoped to site settings.
Route destinations remain global; visible labels remain localized.

Acceptance:

```sh
npm run schema:migrate -- --collection site --check
npm run schema:validate -- --all
npm run schema:cms -- --check
npm run schema:parity -- --collection site
npm run schema:downgrade -- --collection site --check
npm run build
```

Rollback: Follow Section 14 for `site`.

### MIG-09 — Cut over every fixed page

Objective: Convert every page under `content/pages/` without introducing a page
builder.

Required pages:

- homepage;
- contact;
- team;
- journal landing;
- programme;
- Monday class;
- participation.

The obsolete `content/pages/cellular-touch.yaml` sample is excluded from public
content but retained until `MIG-12`.

Actions:

1. Convert and release one fixed-page CMS collection at a time if their config
   contracts differ.
2. Run parity after each page, not after the group.
3. Stop the task immediately if one page fails; previously completed page
   cutovers remain valid.
4. Do not convert named sections into a generic page-builder list.

Acceptance per page:

```sh
npm run schema:migrate -- --collection pages --record <id> --check
npm run schema:parity -- --collection pages --record <id>
npm run schema:downgrade -- --collection pages --record <id> --check
npm run schema:validate -- --all
npm run build
```

Done when every listed page completes a production edit/save/reopen cycle.

Rollback: Follow Section 14 for the affected page collection only.

### MIG-10 — Cut over journal records and Markdown bodies

Objective: Consolidate duplicated journal metadata while preserving Markdown as
files.

Scope:

- paired files under `content/journal/`;
- target `records/` and `bodies/` directories;
- Journal CMS collection;
- journal list and post adapters.

Actions:

1. Parse each existing front matter block.
2. Require duplicated shared metadata to agree before conversion.
3. Write one YAML record per post.
4. Extract each body to the derived locale body filename byte-for-byte.
5. Preserve both `cover` and `contained` hero variants.
6. Reject missing, duplicate, or orphan body files.
7. Keep the old paired files until the production editing cycle passes.

Acceptance:

```sh
npm run schema:migrate -- --collection journal --check
npm run schema:validate -- --all
npm run schema:parity -- --collection journal
npm run schema:downgrade -- --collection journal --check
npm run build
```

Additional evidence:

- body-file hashes before and after extraction;
- readable Git diffs for an edited German and English body;
- CMS save/reopen proof for metadata and both Markdown bodies.

Rollback: Follow Section 14 for `journal`; restore paired files through the
downgrade converter.

### MIG-11 — Cut over legal pages

Objective: Give legal pages an explicit schema and language intent without
changing their public presentation.

Scope:

- Datenschutz;
- Impressum;
- Legal CMS collection or file editor;
- legal page loaders.

Actions:

1. Convert current German bodies without creating English content.
2. Set intended locales to `[de]`.
3. Preserve routes and body text exactly.
4. Validate links and effective dates when present.

Acceptance:

```sh
npm run schema:migrate -- --collection legal --check
npm run schema:validate -- --all
npm run schema:parity -- --collection legal
npm run schema:downgrade -- --collection legal --check
npm run build
```

Rollback: Follow Section 14 for `legal`.

### MIG-12 — Remove v1 compatibility code

Objective: Finish the migration only after every collection is proven editable
in production.

Preconditions:

- all previous tasks are complete;
- every collection has completed a production save/reopen cycle;
- no v1 record remains;
- all downgrade checks pass;
- the last v1-compatible commit SHA is recorded.

Actions:

1. Remove v1 readers.
2. Remove v1-only aliases and compatibility locale shells.
3. Remove old paired journal files.
4. Remove `content/pages/cellular-touch.yaml`.
5. Keep forward and downgrade converters for audit and emergency recovery.
6. Keep v1 fixtures needed by downgrade tests.
7. Update this task ledger to `Complete`.

Acceptance:

```sh
npm run schema:registry
npm run schema:docs -- --check
npm run schema:cms -- --check
npm run schema:validate -- --all
npm run schema:downgrade -- --all --check
npm run build
node scripts/validate-seo.js
git diff --check
```

Rollback: Revert the cleanup commit. Do not revert any already-proven v2
collection.

## 14. Per-collection rollback

Rollback is collection-scoped because cutovers are collection-scoped.

Before each cutover:

1. record the source commit SHA;
2. produce a clean downgrade report;
3. create a branch containing the converted collection;
4. record hashes for all files in that collection;
5. freeze editing for that collection.

If a v2 collection fails after editors have saved content:

1. stop editing only that collection;
2. branch from the failing production state to preserve v2 edits;
3. run the downgrade converter against that branch;
4. validate normalized parity and rendered output;
5. commit the downgraded collection and its v1 CMS configuration together;
6. deploy;
7. reopen representative entries in the v1 CMS;
8. resume editing only after save/reopen succeeds.

Never:

- revert only `admin/config.yml`;
- revert only content files;
- discard post-cutover editorial commits;
- hand-copy v2 content into v1;
- proceed after a lossy downgrade warning.

## 15. Global completion gate

Schema v2 is complete only when:

- the registry covers every current CMS-managed leaf path;
- generated documentation is current;
- every record validates as v2;
- no unclassified or orphan path exists;
- all CMS collections pass create/edit/save/reopen checks;
- all shared media controls remain editable;
- all locale-intent combinations validate;
- all downgrade checks pass;
- all generated sitemap URLs (including event and featured-occurrence leaves) build with valid SEO;
- approved visual regression checks pass;
- `MIG-12` is complete.

Until then, the migration is in progress even if one or more collections
already use v2.
