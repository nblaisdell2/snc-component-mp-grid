# CLAUDE.md — Metrics Grid UI component

Context for Claude (or any agent) continuing work on this project.

## What this is

A ServiceNow **Next Experience / UI Builder** custom component: the **layout grid** for the Metrics
Portal. It lays a metrics array into a 12-column grid (width→span mapping, build spec §6) and hosts
a metric-dispatcher per metric. Part of the **Metrics Components** library app; siblings are
`x-1295779-metrics-nav-uic` and `x-1295779-metric-dispatcher-uic`.

- Component tag: `x-1295779-metrics-grid-uic`  ·  Scope: `x_1295779_grid_0`
- Vendor prefix `x_1295779` shared with the dispatcher + chart components.

## Architecture (important conventions)

- **Imperative content, like the dispatcher/D3 charts (NOT declarative like nav).** The snabbdom
  view renders only a stable `<div class="mg-root">`; `grid.js#renderGrid(container, props)` owns
  the contents because it instantiates dispatcher child elements and sets object properties on them
  (`definition`, `data`, `displayConfig`).
- **Width→span mapping** lives in `WIDTH_TO_SPAN` (25/33/50/75/100 → 3/4/6/9/12) and
  `spanForWidth(width, columns)` (clamped). The grid template, gap, and `grid-auto-flow: row dense`
  are set **inline** from properties so the layout stays data-driven.
- **Responsive collapse** is container-width based via a `ResizeObserver` (wired in
  `COMPONENT_DOM_READY`) + `applyResponsive()`, which swaps the grid template to a single column
  below `collapseBelow`. A CSS media query would be wrong here — it keys off the viewport, but the
  grid sits at an arbitrary slot width. The observer only re-applies the template (no full rebuild).
- **Cards own the title;** the dispatcher's own title is suppressed (`disp.showTitle = false`).
- **Pure presentation — never fetches data** (build spec §10). `metrics` is bound by the page.
- **Indentation is TABS**; ESLint `@tectonic/tectonic/servicenow`.

## Files

- `src/.../index.js` — properties + lifecycle + ResizeObserver wiring.
- `src/.../grid.js` — `renderGrid`, `spanForWidth`, `WIDTH_TO_SPAN`, `applyResponsive`
  (exported for unit testing).
- `src/.../sampleData.js` — `SAMPLE_METRICS` (mixed widths to exercise wrapping).
- `now-ui.json` — manifest: properties (no events). **Keep in sync with `index.js`.**

## Data contract

`metrics` = the resolver payload's `metrics[]` (build spec §5.2): each
`{ id, title, order, width, viz_type, display_config, data }`. The grid sorts by `order`, maps
`width`→span, and forwards each item to a dispatcher (`dispatcherTag`, default
`x-1295779-metric-dispatcher-uic`). No outbound events (drill-in is emitted by the dispatcher).

## How to verify changes without an instance

`grid.js` is pure DOM. Under jsdom: stub `document.createElement` (and the child dispatcher tag),
call `renderGrid(container, { metrics })`, and assert the `.mg-card` count, each card's
`grid-column: span N` against `spanForWidth`, the `order` sort, and that a dispatcher child is
created per metric with `definition`/`data` set. Unit-test `spanForWidth` directly.

## If adding a property

Update all three: `now-ui.json` (manifest), `index.js` (default), and read it in `grid.js`.
