# Metrics Grid — UI Builder custom component

The **layout grid** for the ServiceNow **Metrics Portal**. It organizes a page into **collapsible
sections**; each section lays its metrics into a **12-column CSS grid** (build spec §6), in `order`,
mapping each metric's `width` to a column span, wraps with `grid-auto-flow: row dense`, and renders
the **matching D3 chart component per metric** (routing on `viz_type`). Each grid collapses to a
single column below a configurable width. (A "Filters" first-section is planned but not built yet.)

- **Component tag:** `x-1295779-metrics-grid-uic`
- **Scope:** `x_1295779_grid_0`
- **Renderer:** Seismic (`@servicenow/ui-renderer-snabbdom`)

> Part of the **Metrics Components** library app (build spec §2/§6/§10). Sibling component:
> `x-1295779-metrics-nav-uic`, plus the 8 `x-1295779-<name>-chart-uic` chart components it renders.
> Shares the vendor prefix `x_1295779`.

---

## Width → span mapping (build spec §6)

| `width` | grid span |
|---|---|
| 25 | 3 |
| 33 | 4 |
| 50 | 6 |
| 75 | 9 |
| 100 | 12 |

Cards are emitted in `order`; `grid-auto-flow: row dense` fills each row until the next card
doesn't fit, then wraps (and backfills earlier gaps when a later small card slots in). An unknown
`width` of `1..columns` is treated as an explicit span; anything else falls back to a full row.

```css
.mg-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-flow: row dense;
  gap: 16px;
}
.mg-card { grid-column: span <span>; }   /* set from the width mapping */
```

**Responsive collapse:** below `collapseBelow` px of the grid's own width, the template drops to a
single column so every card stacks full-width. A `ResizeObserver` drives this off the component's
container width (not the viewport), since the grid can sit in any UI Builder slot.

---

## What it does (build spec §10/§11)

- **Props in:** `sections` (the resolver payload's `sections` array). Each section is
  `{ id, name, help_text, order, metrics: [...] }`; each metric carries its hydrated `data` envelope.
  Back-compat: a flat `metrics` array (no `sections`) is wrapped into one untitled section.
- Renders each section sorted by `order` as a **collapsible** block: a header (name + chevron toggle,
  and — when the section has help text — a **"?" button** that reveals the help text with the same
  animation) and a horizontal rule, then the section's metrics in the grid.
- **Theming:** the section header/help/rule are styled by global properties (`sectionNameColor` /
  `…FontFamily` / `…FontSize` / `…FontWeight`, `sectionHelpColor` / `…FontSize`, `ruleColor` /
  `ruleThickness`, `sectionSpacing`, `sectionAnimationMs`, `showSectionHelpToggle`, `helpDefaultVisible`).
  Defaults match the built-in look, so they're opt-in.
- Within a section, sorts metrics by `order`, applies the width→span mapping, and renders the chart
  matching each metric's `viz_type` directly (`VIZ_TO_TAG` in `grid.js`), passing
  `data` + `displayConfig` + `title` + `width`.
- The card owns the metric title (the chart's own title is suppressed via `showTitle = false`).
- **Collapse is a CSS class toggle, not a re-render** — the chart elements are never rebuilt, and the
  collapse state survives a property re-bind.
- **Pure presentation — never fetches its own data.**

This is the drop-in for step 3 of the UIB assembly checklist (build spec §11): bind the grid's
`sections` to the resolver Data Resource — the grid *is* the repeater of sections + charts, so you
don't have to wire a separate UIB repeater or a dispatcher.

### viz_type → chart component

| `viz_type` | component tag |
|---|---|
| `column_chart` | `x-1295779-column-chart-uic` |
| `line_chart` | `x-1295779-line-chart-uic` |
| `pie_chart` | `x-1295779-pie-chart-uic` |
| `scatter_chart` | `x-1295779-scatter-chart-uic` |
| `heatmap` | `x-1295779-heatmap-chart-uic` |
| `sankey` | `x-1295779-sankey-chart-uic` |
| `treemap` | `x-1295779-treemap-chart-uic` |
| `wordcloud` | `x-1295779-wordcloud-chart-uic` |

Override per-instance with the `vizMap` property (merged over the built-in map). All 8 chart
components must be deployed to the instance for their tiles to render.

---

## Data shape (`sections` property)

```jsonc
[
  { "id": "sec-charts", "name": "Charts & Distributions",
    "help_text": "Visual breakdowns across the book of business.", "order": 10,
    "metrics": [
      { "id": "m1", "title": "Premium Mix", "order": 10, "width": 25,
        "viz_type": "pie_chart", "display_config": { "show_legend": true },
        "data": { "slices": [ { "label": "Auto", "value": 420 }, { "label": "Home", "value": 310 } ] } },
      { "id": "m2", "title": "New Policies by Region", "order": 20, "width": 50,
        "viz_type": "column_chart", "display_config": { "y_label": "Policies" },
        "data": { "categories": ["NE","SE","MW","W"],
                  "series": [ { "name": "Q2", "values": [120, 98, 76, 134] } ] } }
    ] }
]
```

Leave `sections` empty/unbound to render built-in sample sections. A flat `metrics` array (no
`sections`) still works — it renders as one untitled section.

---

## Project layout

```
src/x-1295779-metrics-grid-uic/
├── index.js        # createCustomElement: properties + lifecycle + ResizeObserver + collapse memory
├── grid.js         # renderSections / renderMetricsInto — sections, collapse, width→span, VIZ_TO_TAG
├── sampleData.js   # SAMPLE_SECTIONS + SAMPLE_METRICS fallback
├── styles.scss     # section header/rule/collapse animation + card sizing
└── __tests__/
now-ui.json         # UI Builder manifest: properties (no events)
```

---

## Develop & deploy

```powershell
npm install -g @servicenow/cli
snc configure profile set
npm install
snc ui-component develop --open
snc ui-component generate-update-set --offline
snc ui-component deploy
```

Deploy the 8 `x-1295779-<name>-chart-uic` chart components to the same instance (the grid renders
them directly — there is no dispatcher). After deploying, add **"Metrics Grid"** in UI Builder on
the generic page and bind `metrics` to the resolver Data Resource (`/dashboard/{key}` → `metrics`).
