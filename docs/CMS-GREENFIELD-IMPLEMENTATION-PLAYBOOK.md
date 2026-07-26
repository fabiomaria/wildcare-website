# Greenfield CMS Implementation Playbook

This guide captures a reusable approach for building a small-to-medium editorial website from zero. It is based on a production implementation using a Git-backed CMS and a static-site generator, but the principles apply to other CMS and rendering stacks.

The target is a system where non-technical editors can manage structured content safely, developers retain explicit templates and version history, and every published change produces a testable, immutable site build.

## 1. Choose the Architecture Deliberately

A Git-backed static CMS is a strong fit when:

- the site is primarily editorial rather than transactional;
- content changes are measured in minutes or days, not multiple times per second;
- a small, trusted team can have repository access;
- deterministic builds, low hosting cost, and simple rollback matter;
- page layouts are designed templates rather than arbitrary page-builder compositions.

It is a weaker fit when editors require real-time collaboration, scheduled publishing, complex approval workflows, fine-grained permissions, live visual composition, or a very large media library. In those cases, use a database-backed or hosted headless CMS while retaining the content-modeling principles below.

### Reference Stack

The proven reference stack is:

| Layer | Reference technology | Responsibility |
| --- | --- | --- |
| CMS interface | Sveltia CMS | Forms, validation, media upload, localization, Git commits |
| Content store | Git repository | Versioned YAML and Markdown source files |
| Site generator | Eleventy | Loads content and renders static pages |
| Templates | Nunjucks | Owns HTML structure, accessibility, classes, and behavior hooks |
| Styling and interaction | CSS and small client-side JavaScript | Presentation and progressive enhancement |
| Authentication | GitHub OAuth through a small auth service | Grants CMS access to repository collaborators |
| Deployment | GitHub Actions and GitHub Pages | Builds and atomically publishes the site |
| Dynamic forms | Separate serverless endpoints | Validates and forwards submissions to an external system |

The boundaries matter more than the exact products. Content belongs to the CMS, markup belongs to templates, visual rules belong to CSS, and secrets or external API calls belong to server-side services.

## 2. Start With Editorial Workflows

Do not begin by translating every text node in a design into a CMS field. First identify what editors actually create and maintain.

For each content type, answer:

1. Is it a singleton page, a repeatable entry, or global site content?
2. Which values have one canonical meaning across several frontend locations?
3. Which sections are required, optional, or conditionally visible?
4. Which fields are localized, and which are language-neutral?
5. Which values control presentation, publishing, ordering, or routing?
6. What is the smallest complete entry an editor can publish safely?
7. What must remain controlled by developers?

Create a field map before configuring the CMS. For every field, record its editorial label, storage key, data type, required state, localization behavior, validation, frontend destinations, and rendering gate.

## 3. Model Meaning, Not Markup

The most important rule is: one concept should have one canonical source.

Bad models reproduce frontend duplication:

- card title;
- hero title;
- navigation title;
- SEO title;
- registration link in several sections.

A better model uses canonical fields plus explicit optional overrides:

```yaml
title: Canonical entry title
slug: canonical-entry-title
summary: Short reusable description
registration_url: https://example.org/register

hero:
  headline_override: ""

seo:
  title_override: ""
  description_override: ""
```

The loader or template derives card, navigation, hero, and SEO values from `title` unless an override is present. This reduces editor effort and prevents contradictory output.

### Recommended Content Layers

Use four layers consistently:

1. **Canonical content:** title, summary, dates, people, location, price, registration destination.
2. **Editorial sections:** description, quotes, FAQ, related entries, galleries, calls to action.
3. **Presentation options:** optional badge, hero media, alignment, emphasized quote.
4. **System metadata:** slug, status, sort order, language availability, SEO overrides.

Keep decorative fields optional. A badge, eyebrow, secondary image, quote, or label should never be required merely because the template can display it.

## 4. Use Fixed Page Shapes

For a designed website, prefer explicit schemas and templates over a generic page builder.

Typical collection shapes are:

- **Singleton pages:** homepage, contact, about, programme, membership.
- **Repeatable editorial entries:** articles, events, workshops, projects.
- **Global content:** navigation, footer, organization details, shared labels.
- **Legal content:** long-form Markdown with restricted localization rules.

A fixed page schema gives editors meaningful sections and gives developers predictable data. Introduce a block-based page builder only when editors genuinely need to compose varying layouts and the frontend has a tested component system capable of rendering every allowed block combination.

## 5. Design Reusable Editorial Components

CMS components should correspond to recognizable editorial concepts.

### Core Components

- **SEO and social preview:** optional title, description, and image overrides; place last in the form.
- **Hero:** headline override, subtitle, media, primary action, optional badge.
- **Rich description:** heading and Markdown or structured paragraphs.
- **Facts:** structured labels and values such as date, time, location, format, or price.
- **People:** image, name, role, biography, and optional adjacent quote.
- **Quotes:** quotation and attribution; usable alone or paired with another component.
- **Cards:** title, summary, image, destination, and optional metadata.
- **FAQ:** question and answer pairs.
- **Call to action:** action type, visible label, destination, and optional supporting text.
- **Media:** image, alternative text, caption, focal requirements, and optional credit.
- **Form copy:** visible labels, placeholders, submit, progress, success, and error messages.

### Component Rules

- Make the field label describe the frontend role: `Programme card title`, not `Title 2`.
- Add a realistic example or hint when the field is not self-explanatory.
- Collapse large section objects by default.
- Show compact summaries for list items, normally their title or name.
- Constrain list length when the design expects an exact number.
- Prefer structured lists over delimited text.
- Do not ask editors to enter HTML attributes, CSS classes, embed code, or JavaScript.
- Use a boolean only when there is a genuine editorial decision. Otherwise derive visibility from whether meaningful content exists.

## 6. Separate Actions From Their Rendering

Buttons and links should be structured data, not raw markup:

```yaml
action:
  type: external_url
  label: Register
  url: https://example.org/register
```

The template maps allowed action types to safe markup. For example, `external_url` renders an anchor, while `dialog` or `form_popup` renders the appropriate button and developer-owned attributes.

Validate destinations and normalize URLs in the loader. Editors should never need to know whether a component requires an anchor, button, data attribute, or JavaScript initializer.

## 7. Plan Localization Before Building Templates

Localization is a storage and fallback decision, not just a toggle in the interface.

Decide up front:

- required and optional locales;
- whether translations live in one file or separate files;
- whether each entry can be monolingual;
- which fields are language-neutral;
- the fallback policy for missing translations;
- how language availability appears to visitors;
- how repeatable lists are paired across locales.

Two common storage models are:

```yaml
# Single file
de:
  title: Deutscher Titel
en:
  title: English title
```

```text
# Multiple files
article.md
article.en.md
```

Use single-file localization for structured entries whose locales must evolve together. Use multiple files for long-form articles when separate Markdown bodies are easier to write and review.

Do not infer translation availability from file existence alone. Determine it from substantive content and an explicit language-mode field when monolingual entries are supported.

Avoid index-matching independent localized lists. If the renderer pairs list items by position, both locale lists must remain equal in length and order. Prefer stable item identifiers or localized fields inside one shared list item when the CMS supports that shape cleanly.

Any localized text placed in an HTML attribute must be strictly attribute-escaped at build time. Rich text and Markdown do not belong in `data-*`, `alt`, `title`, or other plain-text attributes.

## 8. Add a Normalization Layer

Templates should receive a stable view model, even while stored content evolves.

Implement a loader or normalization function that:

- supplies canonical fallbacks;
- merges localized content according to policy;
- converts legacy fields into the current shape;
- normalizes slugs and external URLs;
- determines whether an entry has substantive content;
- computes derived metadata and page eligibility;
- sorts and filters collection entries;
- exposes simple booleans and arrays to templates.

Example:

```js
function normalizeEntry(source) {
  const title = source.title || source.card?.title || "";
  const summary = source.summary || source.hero?.subtitle || "";

  return {
    ...source,
    title,
    summary,
    seo: {
      title: source.seo?.title || (title ? `${title} | Site name` : ""),
      description: source.seo?.description || summary,
    },
    hasDetailPage: Boolean(
      source.status !== "draft" &&
      title &&
      hasSubstantiveSection(source)
    ),
  };
}
```

This layer prevents templates from becoming collections of legacy fallbacks and lets a schema migrate without breaking existing entries.

## 9. Make Rendering Conditions Explicit

Every optional component needs one understandable gate.

Good gates include:

- render the section when its heading or content list is non-empty;
- render the facts card when at least one fact has a value;
- render a quote only when quotation text exists;
- render a detail page only when status, canonical title, and one substantive body section are present;
- render a listing card when the entry is publishable, even if its detail page is not ready.

Avoid gating a whole section on decorative content such as a badge or eyebrow. Document gates in the field map so an editor can distinguish missing content from a rendering defect.

## 10. Keep Behavior Template-Owned

Editors should control copy and destinations, not implementation details.

Keep these outside CMS content:

- DOM structure and CSS classes;
- form endpoints and request logic;
- accessibility attributes and live-region behavior;
- third-party integration attributes;
- language-toggle logic;
- icon selection when icons have structural meaning;
- validation and security rules;
- API keys and secrets.

For forms, expose all visible states to the CMS, but keep submission behavior in code. A complete form content model includes field labels, placeholders, button text, progress text, success text, and actionable error text.

Dynamic submissions should go through a server-side or serverless endpoint. The endpoint validates input, applies rate or abuse controls as needed, stores secrets, maps data to the destination system, and returns a small stable response contract.

## 11. Treat the CMS Form as Product Design

An accurate schema can still produce a confusing editor experience.

Apply these editorial UX principles:

- use plain, consistent field names;
- group fields in the order editors work;
- put canonical content before overrides;
- put SEO last;
- distinguish required content from optional enhancement;
- give examples that resemble real entries;
- explain where a value appears and what fallback it has;
- hide or collapse advanced sections;
- use list summaries that make reordering safe;
- avoid exposing fields that no longer affect the frontend.

Create a diagnostic entry during implementation. Fill every visible CMS field with a unique, context-appropriate identifier, render it, and map each value to the resulting DOM. This exposes mislabeled fields, dead fields, unexpected fallbacks, non-localized attributes, and incorrect section gates faster than reviewing the schema in isolation.

## 12. Build in Phases

### Phase 0: Freeze the Contract

- inventory page and entry types;
- create the field map;
- choose localization storage;
- round-trip representative entries through the real CMS;
- inspect the exact files the CMS writes;
- define canonical fields, fallbacks, gates, and validation;
- record decisions before templating.

### Phase 1: Establish the Pipeline

- add the static-site generator;
- preserve existing routes and assets;
- configure the build and deployment workflow;
- verify that a failing build leaves the last successful site online;
- deploy a no-content-change baseline.

### Phase 2: Templatize Incrementally

- migrate one page shape at a time;
- extract content without redesigning the page;
- compare generated HTML with the accepted reference;
- test desktop, mobile, localization, empty optional fields, and long text;
- keep each migration independently deployable.

### Phase 3: Connect the CMS

- add collections and field validation;
- configure media handling;
- deploy authentication;
- test text editing, new-entry creation, image upload, and rollback end to end;
- write an editor guide using the CMS's actual labels.

### Phase 4: Improve Editorial Quality

- remove duplicated concepts discovered during real use;
- add canonical fallbacks;
- make decorative fields optional;
- improve labels and examples;
- add diagnostic entries and screenshot-based checks;
- document counterintuitive constraints.

## 13. Verification Strategy

Automate the stable checks:

```bash
# CMS configuration parses
node -e "require('js-yaml').load(require('fs').readFileSync('admin/config.yml','utf8'))"

# Production build succeeds
npm run build

# No whitespace errors
git diff --check
```

Add project-specific assertions for:

- required routes and canonical URLs;
- empty optional sections not rendering wrappers;
- locale fallback and monolingual entries;
- list ordering and length constraints;
- escaped content in HTML attributes;
- form request payloads and UI states;
- uploaded media paths;
- SEO fallback output;
- draft and publish-status behavior.

Browser verification should cover representative page shapes at desktop and mobile widths. Test the longest realistic text, missing images, empty optional sections, each language mode, focus states, form validation, success, and failure.

Version static asset URLs with a content hash. Otherwise a CDN may serve new HTML with old CSS or JavaScript, producing defects that survive hard refresh and private browsing.

## 14. Publishing, Recovery, and Security

With a Git-backed CMS, saving usually creates a commit and can trigger production deployment. Make that behavior explicit during onboarding.

Minimum operational requirements:

- protected secrets outside the repository;
- trusted collaborator access only;
- deterministic dependency installation in CI;
- atomic deployment of a completed build artifact;
- last-known-good site remains available after build failure;
- documented commit revert and redeploy procedure;
- extra review rules for financially, legally, or reputationally sensitive pages;
- pinned CMS client version and controlled upgrades.

The CMS interface is an editorial guardrail, not a security boundary for repository collaborators. Use a different architecture when editors require strict per-field or per-collection authorization.

## 15. Common Failure Modes

### Duplicated canonical information

**Symptom:** titles, dates, or links disagree across cards, heroes, and SEO.

**Prevention:** one canonical field with optional, clearly labeled overrides.

### Schema mirrors the DOM

**Symptom:** editors see vague fields such as `Text 1`, `Heading 2`, or several unexplained copies of the same value.

**Prevention:** model editorial concepts and let templates distribute them.

### Optional decoration becomes required content

**Symptom:** empty badges or labels block publication or leave gaps.

**Prevention:** derive visibility from substantive content and make decoration optional.

### CMS and frontend drift apart

**Symptom:** a visible CMS field has no effect, or frontend copy cannot be edited.

**Prevention:** maintain the field map and run a fully identified diagnostic entry.

### Localization is only partially implemented

**Symptom:** body text switches language but placeholders, alternative text, names, or list items do not.

**Prevention:** classify every field as localized or static and test the rendered DOM, not just visible paragraphs.

### Cached assets mismatch deployed HTML

**Symptom:** new controls appear unstyled even after hard refresh.

**Prevention:** content-hashed CSS and JavaScript URLs in every generated template.

### Generic page builders create invalid combinations

**Symptom:** editors can assemble layouts that were never designed or tested.

**Prevention:** fixed page shapes and bounded repeatable components unless free composition is a real requirement.

## 16. Greenfield Definition of Done

A CMS implementation is ready when:

- every editable frontend value has one documented source;
- every CMS field has a clear label, type, example, and rendering destination;
- canonical values and overrides are distinguishable;
- optional sections render cleanly when empty;
- localization storage and fallback behavior are tested;
- editors never enter implementation details or secrets;
- a representative entry can be created entirely through the CMS;
- text edits and image uploads complete the full save-build-deploy cycle;
- failed builds preserve the live site;
- rollback is documented and tested;
- desktop and mobile render checks pass;
- static assets are versioned;
- editor and developer documentation match the production interface.

The result should feel like an editorial system, not a thin form over HTML. Editors work with titles, descriptions, people, facts, media, and actions; templates translate those concepts into a consistent, accessible frontend.
