# Native Sveltia i18n Rollout

**Date:** 2026-07-27  
**Status:** Proposed; About/Team pilot implemented locally  
**Base branch:** `production`  
**Scope:** Restore native Sveltia multilingual editing across CMS-managed pages while preserving true German-only, English-only, and bilingual records.

## 1. Goal

Editors should regain Sveltia's native language editing experience without forcing placeholder content into a language that a page or workshop does not support.

The final system must support:

- German-only content;
- English-only content;
- bilingual German/English content;
- enabling or disabling the non-primary translation from the editor;
- synchronized structural lists where the same entities appear in both languages;
- independent localized lists where languages may legitimately differ;
- unchanged public HTML, URLs, language-toggle behavior, and schema-v2 semantics.

The About/Team page is the reference implementation for this rollout.

## 2. Constraint

Sveltia always enables an i18n collection's default locale. A single entry collection with German as its default can represent German-only and bilingual entries, but not a genuine English-only entry. Changing `initial_locales` does not change this rule.

Therefore:

- fixed files declare their primary/default locale in CMS configuration;
- entry collections that permit either primary language are exposed as two language-primary CMS collections;
- the public content model does not treat "default locale" as globally synonymous with German.

## 3. Architectural decision

Use two representations with a strict normalization boundary:

```text
Sveltia-native YAML
  de:/en: locale blocks
          │
          ▼
normalizeNativeI18nRecord()
          │
          ▼
schema-v2 envelope
  schema_version + global + locales
          │
          ├── validation and migration tools
          ├── Eleventy loaders and templates
          ├── calendar and SEO consumers
          └── downgrade/parity tooling
```

Sveltia owns the raw editing representation. The schema-v2 envelope remains the canonical application representation.

No template, calendar helper, SEO helper, or page component should read Sveltia's raw locale blocks directly.

## 4. Raw storage contract

### 4.1 German-primary bilingual file

```yaml
de:
  schema_version: 2
  global:
    id: team
    status: published
    route: /team
  hero:
    heading: Begegnung als Praxis.

en:
  hero:
    heading: Encounter as Practice.
```

### 4.2 German-only file

```yaml
de:
  schema_version: 2
  global:
    id: example
    status: published
    route: /example
  title: Deutscher Inhalt
```

### 4.3 English-only file

```yaml
en:
  schema_version: 2
  global:
    id: example
    status: published
    route: /example
  title: English content
```

The locale containing `schema_version` and `global` is the primary locale. Locale key order must preserve the primary locale first.

`global.intended_locales` is derived during normalization from the locale blocks that contain publishable content. It is not an editor-maintained source of truth.

## 5. Normalized application contract

All three raw shapes normalize to:

```yaml
schema_version: 2
global:
  id: example
  intended_locales:
    - en
  status: published
  route: /example
locales:
  en:
    title: English content
```

`normalizeNativeI18nRecord(record)` must:

1. Return existing schema-v2 envelopes unchanged.
2. Detect supported top-level locale blocks.
3. Find the locale containing `schema_version: 2` and `global`.
4. Strip `schema_version` and `global` from localized data.
5. Omit empty locale blocks.
6. Derive `global.intended_locales` from the remaining locale blocks in primary-first order.
7. Return a normal schema-v2 envelope.
8. Reject ambiguous input, including shared settings in multiple locales with conflicting values.

The adapter must be idempotent:

```text
normalize(normalize(record)) === normalize(record)
```

## 6. CMS configuration

### 6.1 Root configuration

```yaml
i18n:
  structure: single_file
  locales: [de, en]
  default_locale: de
  initial_locales: all
```

Both locales are enabled in the editor by default, so bilingual fixed pages can be edited immediately without using the locale menu. The default locale remains German for initial rendering and shared-field storage.

### 6.2 Fixed page files

The `seiten` file collection enables native i18n. Each translatable file also opts in.

German-primary files:

- Homepage;
- Contact;
- About/Team;
- Journal landing;
- Programme;
- Monday class;
- Membership/Participation.

If a fixed English-primary page is introduced, its file-level i18n configuration must set English as its default locale. If the installed Sveltia version does not honor a file-level default override, English-primary fixed files must live in a separate file collection.

Locale-neutral fields use `i18n: false`:

- `schema_version`;
- `global`;
- stable IDs and routes;
- status and publishing controls;
- schedule and registration data;
- shared media where the same asset is intentionally reused.

Localized fields use `i18n: true`:

- headings, labels, prose, biographies, quotes;
- localized image descriptions;
- SEO titles and descriptions;
- button and form copy.

### 6.3 Language-primary entry collections

Collections whose individual entries may be German-primary or English-primary are presented as two CMS collections:

```yaml
- name: workshops_de
  label: Workshops — German primary
  folder: content/workshops
  filter: { field: primary_locale, value: de }
  i18n:
    structure: single_file
    locales: [de, en]
    default_locale: de
    initial_locales: default

- name: workshops_en
  label: Workshops — English primary
  folder: content/workshops
  filter: { field: primary_locale, value: en }
  i18n:
    structure: single_file
    locales: [en, de]
    default_locale: en
    initial_locales: default
```

The same pattern applies to events and journal metadata if those collections permit either primary language.

Before implementation, verify that Sveltia can safely filter both collections over the same folder and can create entries with the filter field prefilled. If creation is ambiguous, use separate primary-language source folders and merge them in the Eleventy loader.

The build must not care which CMS collection exposed the entry.

## 7. List synchronization rules

Choose list i18n behavior from content identity, not convenience.

### 7.1 Shared identity and order

Use `i18n: duplicate` on the list when both languages describe the same entities in the same order:

- team members;
- facilitators;
- value or principle cards;
- membership tiers;
- schedule rows backed by shared structured data;
- CTA button sets whose destinations are shared.

Subfields then declare their own behavior:

```yaml
- name: members
  widget: list
  i18n: duplicate
  fields:
    - { name: name, widget: string, i18n: duplicate }
    - { name: image, widget: image, i18n: duplicate }
    - { name: alt, widget: string, i18n: true }
    - { name: role, widget: string, i18n: true }
    - { name: bio, widget: text, i18n: true }
```

Adding, removing, and reordering items happens in the primary locale and is mirrored into the other locale. Localized subfields remain editable in each language.

Where an item survives reordering or is referenced elsewhere, add a stable duplicated `id`.

### 7.2 Locale-specific identity or cardinality

Use `i18n: true` on the list when languages may legitimately contain different items or a different count:

- language-specific FAQ entries;
- editorial paragraphs where translation structure is intentionally independent;
- locale-specific links or resources.

Templates must not pair these lists by array index.

## 8. Migration phases

### Phase 1 — Harden the About pilot

- Complete raw-shape validation for native files.
- Add adapter unit tests for DE-only, EN-only, bilingual, empty-locale, and conflicting-global cases.
- Round-trip About through the local Sveltia editor.
- Confirm adding/reordering a team member mirrors the list structure.
- Confirm role and biography remain independently editable.
- Confirm disabling English produces a valid German-only record.
- Confirm the normalized About envelope matches the pre-pilot envelope.
- Confirm generated `team.html` is unchanged.

### Phase 2 — Remaining fixed pages

Migrate one file per commit in this order:

1. Contact;
2. Journal landing;
3. Programme;
4. Monday class;
5. Membership/Participation;
6. Homepage;
7. site-wide settings.

For each file:

- replace `global + locales` raw storage with native locale blocks;
- classify every object and list as shared, synchronized, or independently localized;
- enable native i18n only for that file;
- verify normalized-envelope parity;
- verify normalized rendered-HTML parity;
- save once through Sveltia and inspect the resulting YAML diff.

### Phase 3 — Language-primary entry collections

- Add an explicit primary-locale discriminator.
- Split CMS views/configuration into German-primary and English-primary collections.
- Migrate workshops first.
- Migrate standalone events second.
- Migrate journal metadata and body handling last.
- Verify create, edit, translate, disable-translation, rename, and delete behavior in both collection views.

### Phase 4 — Remove transitional schema paths

- Remove the hand-authored `locales.de` / `locales.en` CMS field trees.
- Keep schema-v2 envelope support for application consumers.
- Update editor documentation and migration documentation.
- Mark the About pilot exception in `check-cms-contract.js` as the general native-i18n contract.

## 9. Validation and tests

### 9.1 Adapter tests

Add focused tests covering:

- existing schema-v2 envelope passes through unchanged;
- German-only native record;
- English-only native record;
- bilingual German-primary record;
- bilingual English-primary record;
- empty optional translation is omitted;
- locale order remains primary-first;
- derived `intended_locales` matches available content;
- conflicting duplicated global values fail;
- normalization is idempotent.

### 9.2 CMS contract tests

`scripts/schema/check-cms-contract.js` must assert:

- root i18n configuration is valid;
- only migrated files/collections enable native i18n;
- every migrated file opts in at file level;
- localized top-level fields declare `i18n: true`;
- shared fields declare `i18n: false` or a documented `duplicate`;
- synchronized lists use `i18n: duplicate`;
- non-migrated entries retain the legacy envelope editor until their migration commit.

### 9.3 Build and parity checks

Every migration commit must pass:

```sh
npm run schema:check
npm run build
git diff --check
```

Additionally:

- compare normalized pre/post envelopes;
- compare generated HTML before and after the migration;
- test the public DE/EN toggle;
- test an entry with only German;
- test an entry with only English;
- test an entry with both languages.

## 10. Editor experience requirements

- The language switcher is visible on every migrated bilingual-capable entry.
- Existing bilingual pages open with both translations enabled.
- A non-primary translation can be enabled or disabled from the entry menu.
- Shared settings are editable once.
- Shared list structure is edited only in the primary locale.
- Translatable list subfields are editable in both locales.
- No editor must create placeholder German copy for an English-only entry.
- No editor must manually maintain `intended_locales`.
- Help text explains whether a list's structure is shared or language-specific.

## 11. Rollout safeguards

- Do not migrate multiple complex pages in one commit.
- Do not change templates and raw storage in the same commit unless required by the adapter.
- Keep the previous production HTML as the parity baseline.
- Preserve unrelated working-tree changes.
- Do not deploy the entry-collection split until create/edit behavior is verified with the pinned Sveltia build.
- A failed build must leave the last successful GitHub Pages deployment active.

## 12. Rollback

Each page migration is independently reversible:

1. Revert its CMS configuration to the explicit `locales.de/en` object.
2. Convert its raw YAML back to the schema-v2 envelope.
3. Keep `normalizeNativeI18nRecord()` until no native records remain.
4. Rebuild and compare against the same HTML baseline.

No public template or URL rollback should be required because downstream consumers continue to use the schema-v2 envelope throughout the rollout.

## 13. Acceptance criteria

The rollout is complete when:

- all translatable fixed pages use native Sveltia i18n;
- German-only, English-only, and bilingual entry fixtures can be created and saved;
- language-primary workshop collections work without placeholder translations;
- synchronized lists remain aligned across translations;
- all content consumers receive schema-v2 envelopes;
- `npm run schema:check` and `npm run build` pass;
- generated public HTML has no unintended change;
- the local and production CMS provide the native multilingual editing workflow.
