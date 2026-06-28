# CLAUDE.md — Metrics Grid UI component

Context for Claude (or any agent) continuing work on this project.

## What this is

A ServiceNow **Next Experience / UI Builder** custom component: the **layout grid** for the Metrics
Portal. It organizes a page into **collapsible sections**; each section lays its metrics into a
12-column grid (width→span mapping, build spec §6) and renders the matching D3 chart component per
metric (routing on `viz_type` — there is no dispatcher). Part of the **Metrics Components** library
app; sibling is `x-1295779-metrics-nav-uic`, plus the 8 `x-1295779-<name>-chart-uic` chart components
it renders. (Filters — a future first "Filters" section — are not built yet.)

- Component tag: `x-1295779-metrics-grid-uic`  ·  Scope: `x_1295779_grid_0`
- Vendor prefix `x_1295779` shared with the nav + chart components.

## Architecture (important conventions)

- **Imperative content, like the D3 charts (NOT declarative like nav).** The snabbdom view renders
  only a stable `<div class="mg-root">`; `grid.js#renderSections(container, props, state)` owns the
  contents because it instantiates chart child elements and sets object properties on them (`data`,
  `displayConfig`, `title`, `width`, `showTitle`). `renderMetricsInto(gridEl, metrics, props)` builds
  one section's grid of cards; `renderGrid` is a thin back-compat wrapper for a single flat grid.
- **Sections are collapsible; collapse is a class toggle, NOT a re-render.** Each `.mg-section` has a
  header (`.mg-section-toggle` squircle +/- icon + `.mg-section-name`, optional `.mg-section-help`), an `<hr>`,
  then a `.mg-section-body` whose grid-template-rows `1fr`↔`0fr` animates open/closed. The toggle's
  click listener flips classes + `aria-expanded` and updates a `collapsed` Set — it must **never** call
  `renderSections`, because rebuilding would destroy & recreate the D3 chart elements. Collapse state
  is persisted in `host._mgState.collapsed` so it survives a property re-bind; `host._mgState.initialized`
  guards the one-time `defaultCollapsed` seeding. Sections default **expanded** (a section that starts
  collapsed renders its charts at 0 height — a known follow-up).
- **Help text is toggled by a "?" button, same animation as collapse.** The header row
  (`.mg-section-head-row`) holds the toggle plus an optional `.mg-section-help-toggle` ("?"); the help
  itself (`.mg-section-help` > `.mg-section-help-inner` > `.mg-section-help-text`, where the padding
  lives so it collapses cleanly) animates via the same grid-rows trick on `.mg-help-open`. The "?"
  button **and** the help wrapper render **only when the section has `help_text`** (no orphan icon).
  The "?" is **hollow when help is hidden, solid when showing** (`.mg-help-open .mg-section-help-toggle`),
  its colour driven by the `--mg-help-icon` var (`helpIconColor`). Open state persists in
  `host._mgState.helpOpen`, seeded once from `helpDefaultVisible` (default hidden) under the same
  `initialized` guard as collapse. The help block is indented to line up with the section **name**
  (not the squircle): `.mg-collapsible .mg-section-help` gets `padding-left: calc(--mg-icon-size +
  --mg-icon-gap)` — the same two vars that size the icon and its gap, so they stay in sync.
- **The squircle +/- toggle icon (`.mg-section-toggle-icon`) is only rendered when `sectionsCollapsible`**
  (a non-collapsible section shows just its name; its toggle is `disabled`). The icon is a hollow rounded
  square; a CSS `::before` is the always-present minus bar and `::after` is the vertical bar that fades in
  on `.mg-collapsed` to form a plus — so the icon stays put and only the sign changes.
- **Section look-and-feel is data-driven via global props**, applied inline in `buildSection` (defaults
  mirror `styles.scss`, so nothing changes unless set): `sectionNameColor`/`FontFamily`/`FontSize`/
  `FontWeight`, `sectionHelpColor`/`FontSize`, `ruleColor`/`ruleThickness` (0 hides the rule),
  `sectionSpacing` and `sectionAnimationMs` (the latter two as the `--mg-section-gap` / `--mg-anim` CSS
  vars), `showSectionHelpToggle`, `helpDefaultVisible`. Chevron color follows `sectionNameColor` via
  `currentColor`.
- **viz_type→tag routing** lives in `VIZ_TO_TAG` + `tagForVizType(vizType, overrides)` in `grid.js`
  (the single source of truth that used to be the dispatcher). The `vizMap` property is merged over
  it for per-instance overrides. Unknown/missing `viz_type` renders a `.mg-card-unknown` hint.
- **The grid bundles the 8 chart components in — it does NOT rely on the platform to load them.** The
  grid renders charts via `document.createElement(tag)`; an unregistered tag is an inert blank element.
  Declaring the tags in `now-ui.json` `innerComponents` did NOT make UIB load them (it produced zero
  dependency records), and `--fetch-assets-from-instance` / `plugin.xml requires` resolution never
  worked either. What works: **side-effect `import`s** of each chart package in
  [index.js](src/x-1295779-metrics-grid-uic/index.js) (`import 'column-chart-uic'` …) + the 8 charts as
  **`file:` deps** in `package.json` (pointing at the sibling `snc-component-d3-*` projects /
  `now-experience-cli-components` for column). webpack then compiles the charts into the grid bundle, so
  `createCustomElement` runs for every tag and the grid renders standalone — verified locally (all 8 draw
  from `SAMPLE_METRICS`, no console errors). Trade-off: bigger bundle, and **building requires the 8
  sibling projects present on disk** (CI/other machines need them too). Any new `viz_type` in
  `VIZ_TO_TAG` needs a matching `file:` dep + side-effect import here.
- **Width→span mapping** lives in `WIDTH_TO_SPAN` (25/33/50/75/100 → 3/4/6/9/12) and
  `spanForWidth(width, columns)` (clamped). The grid template, gap, and `grid-auto-flow: row dense`
  are set **inline** from properties so the layout stays data-driven.
- **Responsive collapse** is grid-width based via a `ResizeObserver` (wired in `COMPONENT_DOM_READY`) +
  `applyResponsive()`, which swaps **every** section's `.mg-grid` template to a single column below
  `collapseBelow`. A CSS media query would be wrong here — it keys off the viewport, but the grid sits
  at an arbitrary slot width. The observer only re-applies the template (no full rebuild). Don't confuse
  this width-collapse with section expand/collapse — different mechanisms.
- **Cards own the title;** each chart's own title is suppressed (`chart.showTitle = false`).
- **Pure presentation — never fetches data** (build spec §10). `sections`/`metrics` are bound by the
  page; a future filter change would re-bind the payload (the grid would emit, not fetch).
- **Indentation is TABS**; ESLint `@tectonic/tectonic/servicenow`.

## Files

- `src/.../index.js` — properties + lifecycle + ResizeObserver + collapse-state memory.
- `src/.../grid.js` — `renderSections`, `renderMetricsInto`, `renderGrid` (back-compat), `spanForWidth`,
  `WIDTH_TO_SPAN`, `VIZ_TO_TAG`, `tagForVizType`, `applyResponsive` (exported for unit testing).
- `src/.../sampleData.js` — `SAMPLE_METRICS` (mixed widths) + `SAMPLE_SECTIONS` (two sections, one with
  help text) for the default preview.
- `now-ui.json` — manifest: properties (no events). **Keep in sync with `index.js`.**

## Data contract

`sections` = the resolver payload's `sections[]` (build spec §5.2): each
`{ id, name, help_text, order, active, metrics: [...] }`, sorted by `order`. `metrics[]` items are
`{ id, title, order, width, viz_type, display_config, data }`. The grid renders each section's metrics
sorted by `order`, maps `width`→span, and renders the chart matching each `viz_type` (`VIZ_TO_TAG`),
setting `data`/`displayConfig`/`title`/`width`. Back-compat: a flat `metrics` prop (no `sections`) is
wrapped into one untitled section. No outbound events yet (drill-in is emitted by the chart components;
a `FILTERS_CHANGED` event will come with the future filters section). All 8 `x-1295779-<name>-chart-uic`
components must be deployed for tiles to draw.

## How to verify changes without an instance

`grid.js` is pure DOM. Under jsdom: stub `document.createElement` (and the chart tags from
`VIZ_TO_TAG`), call `renderSections(container, { sections }, { collapsed: new Set() })`, and assert the
`.mg-section` count, each section's `.mg-card` count, each card's `grid-column: span N` against
`spanForWidth`, the `order` sort, the correct chart child (per `tagForVizType`) with `data` set, and
that clicking `.mg-section-toggle` flips `.mg-collapsed` + `aria-expanded` **without** recreating the
chart elements. Unit-test `spanForWidth` and
`tagForVizType` directly.

## If adding a property

Update all three: `now-ui.json` (manifest), `index.js` (default), and read it in `grid.js`.
