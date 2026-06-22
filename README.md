# Metrics Grid — UI Builder custom component

The **layout grid** for the ServiceNow **Metrics Portal**. It lays a metrics array into a
**12-column CSS grid** (build spec §6), in `order`, mapping each metric's `width` to a column span,
wraps with `grid-auto-flow: row dense`, and renders a **metric-dispatcher per metric**. It collapses
to a single column below a configurable width.

- **Component tag:** `x-1295779-metrics-grid-uic`
- **Scope:** `x_1295779_grid_0`
- **Renderer:** Seismic (`@servicenow/ui-renderer-snabbdom`)

> Part of the **Metrics Components** library app (build spec §2/§6/§10). Sibling components:
> `x-1295779-metrics-nav-uic`, `x-1295779-metric-dispatcher-uic`. Shares the vendor prefix
> `x_1295779`.

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

- **Props in:** `metrics` (the resolver payload's `metrics` array). Each item is a metric record
  plus its hydrated `data` envelope.
- Sorts by `order`, applies the width→span mapping, and renders one
  `<x-1295779-metric-dispatcher-uic>` per metric, passing `definition` + `data` + `displayConfig`.
- The card owns the metric title (the dispatcher's own title is suppressed).
- **Pure presentation — never fetches its own data.**

This is the drop-in for step 3 of the UIB assembly checklist (build spec §11): bind the grid's
`metrics` to the resolver Data Resource — the grid *is* the repeater of dispatchers, so you don't
have to wire a separate UIB repeater.

---

## Data shape (`metrics` property)

```jsonc
[
  { "id": "m1", "title": "New Policies (MTD)", "order": 10, "width": 25,
    "viz_type": "single_score", "display_config": { "format": ",.0f" },
    "data": { "value": 1234, "trend": { "direction": "up", "delta": 0.12 } } },
  { "id": "m2", "title": "New Policies by Region", "order": 20, "width": 50,
    "viz_type": "column_chart", "display_config": { "y_label": "Policies" },
    "data": { "categories": ["NE","SE","MW","W"],
              "series": [ { "name": "Q2", "values": [120, 98, 76, 134] } ] } }
]
```

Leave `metrics` empty/unbound to render built-in sample metrics (mixed widths, to show wrapping).

---

## Project layout

```
src/x-1295779-metrics-grid-uic/
├── index.js        # createCustomElement: properties + lifecycle + ResizeObserver
├── grid.js         # renderGrid(container, props) — width→span, sort, cards, dispatchers
├── sampleData.js   # SAMPLE_METRICS fallback
├── styles.scss     # card + body sizing
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

Deploy the **Metric Dispatcher** and any chart components to the same instance. After deploying,
add **"Metrics Grid"** in UI Builder on the generic page and bind `metrics` to the resolver Data
Resource (`/dashboard/{key}` → `metrics`).
