/**
 * grid.js — the imperative renderer for x-1295779-metrics-grid-uic.
 *
 * Renders the dashboard as a list of collapsible SECTIONS (`renderSections`). Each
 * section is a header (name + optional help text + collapse toggle) and a horizontal
 * rule, then its widgets laid into a 12-column CSS grid (build spec §6), in `order`,
 * mapping each metric's `width` to a column span. Each widget is the matching D3 chart
 * component (routing on `viz_type` via `tagForVizType` — no dispatcher), instantiated
 * directly with `data`/`displayConfig`/`title`/`width` set on it.
 *
 * Collapse is a direct DOM class toggle (no re-render) so the chart elements are never
 * destroyed/rebuilt. The snabbdom view renders only a stable container and this module
 * owns its contents imperatively.
 *
 *   width  25  33  50  75  100
 *   span    3   4   6   9   12   (on a 12-col grid)
 */

/** width value -> grid span on a 12-col grid (build spec §6). */
export const WIDTH_TO_SPAN = { 25: 3, 33: 4, 50: 6, 75: 9, 100: 12 };

/**
 * viz_type -> the D3 chart component tag that draws it. This is the single source
 * of truth for routing (formerly owned by the metric-dispatcher). Override or
 * extend per-instance via the `vizMap` property.
 */
export const VIZ_TO_TAG = {
	column_chart: 'x-1295779-column-chart-uic',
	line_chart: 'x-1295779-line-chart-uic',
	pie_chart: 'x-1295779-pie-chart-uic',
	scatter_chart: 'x-1295779-scatter-chart-uic',
	heatmap: 'x-1295779-heatmap-chart-uic',
	sankey: 'x-1295779-sankey-chart-uic',
	treemap: 'x-1295779-treemap-chart-uic',
	wordcloud: 'x-1295779-wordcloud-chart-uic'
};

/** Resolve a metric's `viz_type` to a chart tag, applying `vizMap` overrides. */
export const tagForVizType = (vizType, overrides) => {
	if (!vizType) return null;
	const map = overrides ? { ...VIZ_TO_TAG, ...overrides } : VIZ_TO_TAG;
	return map[vizType] || null;
};

const asArray = (v) => (Array.isArray(v) ? v : []);

const asObject = (v) => {
	if (v == null) return null;
	if (typeof v === 'string') {
		const s = v.trim();
		if (!s) return null;
		try {
			return JSON.parse(s);
		} catch (e) {
			return null;
		}
	}
	return typeof v === 'object' ? v : null;
};

const cssLen = (v, fallback) => {
	if (v === undefined || v === null || v === '') return fallback;
	return /^\d+(\.\d+)?$/.test(String(v)) ? `${v}px` : String(v);
};

/** Resolve a metric's column span, clamped to the grid's column count. */
export const spanForWidth = (width, columns) => {
	const cols = columns || 12;
	const w = parseInt(width, 10);
	let span = WIDTH_TO_SPAN[w];
	if (!span) {
		// Unknown width: treat a bare 1..columns as an explicit span, else full row.
		span = w >= 1 && w <= cols ? w : cols;
	}
	return Math.max(1, Math.min(span, cols));
};

const el = (tag, className) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	return node;
};

const widthOf = (node) =>
	node.getBoundingClientRect
		? node.getBoundingClientRect().width || node.clientWidth || 0
		: node.clientWidth || 0;

/**
 * Apply the responsive single-column collapse to every `.mg-grid` inside `container`
 * (one per section), based on each grid's own width. `container` may itself be a grid
 * (the back-compat single-grid path). Returns true if any grid collapsed.
 */
export const applyResponsive = (container, props) => {
	const columns = parseInt(props.columns, 10) || 12;
	const collapseBelow = parseInt(props.collapseBelow, 10) || 0;
	const isGrid = container.classList && container.classList.contains('mg-grid');
	const grids = isGrid
		? [container]
		: Array.from(container.querySelectorAll ? container.querySelectorAll('.mg-grid') : []);
	let anyCollapsed = false;
	grids.forEach((grid) => {
		const w = widthOf(grid);
		const collapsed = collapseBelow > 0 && w > 0 && w < collapseBelow;
		// Collapsing to a single template column makes every card stack full-width
		// (spans are clamped by the grid), without touching the per-card inline spans.
		grid.style.gridTemplateColumns = collapsed ? '1fr' : `repeat(${columns}, 1fr)`;
		if (collapsed) anyCollapsed = true;
	});
	return anyCollapsed;
};

/**
 * Build the 12-column grid of metric cards into `gridEl` (cleared and turned into the
 * `.mg-grid`). Reused by every section and by the back-compat single-grid path.
 * Returns the number of cards rendered.
 */
export function renderMetricsInto(gridEl, metricsInput, props) {
	const columns = parseInt(props.columns, 10) || 12;
	const vizMap = asObject(props.vizMap);
	const metrics = asArray(metricsInput)
		.map(asObject)
		.filter(Boolean)
		.filter((m) => m.active === undefined || m.active === true || m.active === 'true')
		.slice()
		.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

	gridEl.textContent = '';
	gridEl.className = 'mg-grid';
	gridEl.style.display = 'grid';
	gridEl.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
	gridEl.style.gridAutoFlow = 'row dense';
	gridEl.style.gap = cssLen(props.gap, '16px');

	if (!metrics.length) {
		const empty = el('div', 'mg-empty');
		empty.textContent = props.emptyMessage || 'No metrics to display.';
		empty.style.gridColumn = '1 / -1';
		gridEl.appendChild(empty);
		return 0;
	}

	const showChrome = props.showCardChrome !== false;
	const showCardTitle = props.showCardTitle !== false;
	const borderW = parseFloat(props.cardBorderWidth);

	metrics.forEach((m) => {
		const card = el('div', 'mg-card');
		card.style.gridColumn = `span ${spanForWidth(m.width, columns)}`;
		card.style.minHeight = cssLen(props.cardMinHeight, '120px');
		card.style.padding = cssLen(props.cardPadding, '16px');
		card.style.boxSizing = 'border-box';
		if (showChrome) {
			card.style.background = props.cardBackground || '#ffffff';
			card.style.borderRadius = cssLen(props.cardRadius, '8px');
			if (props.cardBorderColor && borderW > 0) {
				card.style.border = `${borderW}px solid ${props.cardBorderColor}`;
			}
			if (props.cardShadow) {
				card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)';
			}
		}

		if (showCardTitle && m.title) {
			const title = el('div', 'mg-card-title');
			title.textContent = m.title;
			card.appendChild(title);
		}

		const body = el('div', 'mg-card-body');
		const vizType = m.viz_type || m.vizType;
		const tag = tagForVizType(vizType, vizMap);
		if (tag) {
			// Instantiate the D3 chart component for this viz_type and hand it the
			// hydrated envelope + presentation options. The card owns the title, so the
			// chart's own title is suppressed (showTitle = false).
			const chart = el(tag);
			chart.data = m.data || (m.definition && m.definition.data) || {};
			chart.displayConfig = m.display_config || m.displayConfig || null;
			chart.title = m.title || '';
			const widthNum = Number(m.width);
			if (widthNum) chart.width = widthNum;
			chart.showTitle = false;
			body.appendChild(chart);
		} else {
			// No mapping for this viz_type — show a hint instead of a silent blank card.
			const unknown = el('div', 'mg-card-unknown');
			unknown.textContent = vizType
				? `Unsupported viz_type: ${vizType}`
				: 'Metric is missing a viz_type.';
			body.appendChild(unknown);
		}
		card.appendChild(body);
		gridEl.appendChild(card);
	});

	return metrics.length;
}

/** Coerce a font-weight-ish prop to a string, falling back to `fallback`. */
const cssVal = (v, fallback) => (v === undefined || v === null || v === '' ? fallback : String(v));

/**
 * Build one collapsible `<section>` element: header (collapse toggle with chevron +
 * name, an optional "?" help toggle, and the optional collapsible help text), a rule,
 * then a collapsible body holding the metrics grid. Collapse and the help toggle are
 * wired here as direct click listeners that toggle classes/aria + the shared `collapsed`
 * / `helpOpen` Sets — they never re-render, so the chart elements are preserved.
 *
 * Look-and-feel props are applied inline (defaults = the styles.scss values) so the
 * header/help/rule can be themed from UI Builder without code.
 */
function buildSection(section, index, props, ctx) {
	const { collapsed, helpOpen, seedCollapsed, seedHelp } = ctx;
	const sectionId = section.id != null ? String(section.id) : `_s${index}`;
	const name = section.name || section.title || '';
	const help = section.help_text || section.helpText || '';
	const hasHelp = !!help;
	const untitled = section._untitled === true || (!name && !help);
	const collapsible = props.sectionsCollapsible !== false && !untitled;
	const animate = props.animateSections !== false;
	const showHelpToggle = props.showSectionHelpToggle !== false;

	// Style props (defaults mirror styles.scss so nothing changes unless set).
	const nameColor = props.sectionNameColor || '#111827';
	const nameFamily = props.sectionNameFontFamily || '';
	const nameSize = cssLen(props.sectionNameFontSize, '16px');
	const nameWeight = cssVal(props.sectionNameFontWeight, '600');
	const helpColor = props.sectionHelpColor || '#6b7280';
	const helpSize = cssLen(props.sectionHelpFontSize, '12px');
	const helpIconColor = props.helpIconColor || '#9ca3af';
	const ruleColor = props.ruleColor || '#e5e7eb';
	const ruleThickness = props.ruleThickness === undefined || props.ruleThickness === '' || props.ruleThickness === null
		? 1
		: parseFloat(props.ruleThickness);
	const spacing = cssLen(props.sectionSpacing, '24px');
	const animMs = props.sectionAnimationMs === undefined || props.sectionAnimationMs === '' || props.sectionAnimationMs === null
		? 250
		: parseInt(props.sectionAnimationMs, 10);

	let isCollapsed = collapsible && collapsed.has(sectionId);
	if (collapsible && seedCollapsed) {
		collapsed.add(sectionId);
		isCollapsed = true;
	}
	let isHelpOpen = hasHelp && helpOpen.has(sectionId);
	if (hasHelp && seedHelp) {
		helpOpen.add(sectionId);
		isHelpOpen = true;
	}

	const sectionEl = el('section', 'mg-section');
	sectionEl.setAttribute('data-section-id', sectionId);
	if (animate) sectionEl.classList.add('mg-animate');
	if (collapsible) sectionEl.classList.add('mg-collapsible'); // has the squircle icon
	if (isCollapsed) sectionEl.classList.add('mg-collapsed');
	if (isHelpOpen) sectionEl.classList.add('mg-help-open');
	sectionEl.style.setProperty('--mg-section-gap', spacing);
	sectionEl.style.setProperty('--mg-anim', `${animMs}ms`);

	const bodyId = `mg-sec-body-${sectionId}`;
	const helpId = `mg-sec-help-${sectionId}`;

	if (!untitled) {
		const head = el('div', 'mg-section-head');
		const headRow = el('div', 'mg-section-head-row');

		const toggle = el('button', 'mg-section-toggle');
		toggle.type = 'button';
		toggle.style.color = nameColor; // chevron uses currentColor
		// Squircle +/- toggle icon — only when the section can actually collapse.
		// The sign (minus when expanded, plus when collapsed) is driven purely by the
		// `.mg-collapsed` class in CSS, so the click handler never touches the icon.
		if (collapsible) {
			toggle.setAttribute('aria-controls', bodyId);
			toggle.setAttribute('aria-expanded', String(!isCollapsed));
			const icon = el('span', 'mg-section-toggle-icon');
			icon.setAttribute('aria-hidden', 'true');
			toggle.appendChild(icon);
		} else {
			toggle.disabled = true;
		}
		const nameEl = el('span', 'mg-section-name');
		nameEl.textContent = name || 'Section';
		nameEl.style.fontSize = nameSize;
		nameEl.style.fontWeight = nameWeight;
		if (nameFamily) nameEl.style.fontFamily = nameFamily;
		toggle.appendChild(nameEl);
		headRow.appendChild(toggle);

		// "?" help toggle — only when the section actually has help text.
		if (hasHelp && showHelpToggle) {
			const helpBtn = el('button', 'mg-section-help-toggle');
			helpBtn.type = 'button';
			helpBtn.textContent = '?';
			helpBtn.style.setProperty('--mg-help-icon', helpIconColor);
			helpBtn.setAttribute('aria-controls', helpId);
			helpBtn.setAttribute('aria-expanded', String(isHelpOpen));
			helpBtn.setAttribute('aria-label', 'Toggle help text');
			helpBtn.title = 'Help';
			helpBtn.addEventListener('click', () => {
				const nowOpen = !sectionEl.classList.contains('mg-help-open');
				sectionEl.classList.toggle('mg-help-open', nowOpen);
				helpBtn.setAttribute('aria-expanded', String(nowOpen));
				if (nowOpen) helpOpen.add(sectionId);
				else helpOpen.delete(sectionId);
			});
			headRow.appendChild(helpBtn);
		}
		head.appendChild(headRow);

		// Collapsible help wrapper — only when there is help text.
		if (hasHelp) {
			const helpEl = el('div', 'mg-section-help');
			helpEl.id = helpId;
			const helpInner = el('div', 'mg-section-help-inner');
			const helpText = el('div', 'mg-section-help-text');
			helpText.textContent = help;
			helpText.style.color = helpColor;
			helpText.style.fontSize = helpSize;
			helpInner.appendChild(helpText);
			helpEl.appendChild(helpInner);
			head.appendChild(helpEl);
		}
		sectionEl.appendChild(head);

		const rule = el('hr', 'mg-section-rule');
		if (ruleThickness > 0) {
			rule.style.borderTopWidth = `${ruleThickness}px`;
			rule.style.borderTopColor = ruleColor;
		} else {
			rule.style.display = 'none';
		}
		sectionEl.appendChild(rule);

		if (collapsible) {
			toggle.addEventListener('click', () => {
				const nowCollapsed = !sectionEl.classList.contains('mg-collapsed');
				sectionEl.classList.toggle('mg-collapsed', nowCollapsed);
				toggle.setAttribute('aria-expanded', String(!nowCollapsed));
				if (nowCollapsed) collapsed.add(sectionId);
				else collapsed.delete(sectionId);
			});
		}
	}

	const body = el('div', 'mg-section-body');
	body.id = bodyId;
	const inner = el('div', 'mg-section-body-inner');
	const grid = el('div', 'mg-grid');
	renderMetricsInto(grid, section.metrics, props);
	inner.appendChild(grid);
	body.appendChild(inner);
	sectionEl.appendChild(body);

	return sectionEl;
}

/**
 * Render the dashboard sections into `container`. Clears and rebuilds the DOM (charts
 * included), but reads collapse state from `state.collapsed` (a Set persisted on the
 * host) so expand/collapse survives a property re-bind. `state.initialized` guards the
 * one-time `defaultCollapsed` seeding.
 *
 * Back-compat: if `props.sections` is empty but `props.metrics` is present, the flat
 * metrics array is wrapped into a single untitled (header-less, non-collapsible) section.
 */
export function renderSections(container, props, state) {
	const collapsed = (state && state.collapsed) || new Set();
	const helpOpen = (state && state.helpOpen) || new Set();

	let sections = asArray(props.sections).map(asObject).filter(Boolean);
	if (!sections.length && asArray(props.metrics).length) {
		sections = [{ id: '_default', _untitled: true, metrics: props.metrics }];
	}
	sections = sections
		.filter((s) => s.active === undefined || s.active === true || s.active === 'true')
		.slice()
		.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

	container.textContent = '';

	if (!sections.length) {
		const empty = el('div', 'mg-empty');
		empty.textContent = props.emptyMessage || 'No metrics to display.';
		container.appendChild(empty);
		return;
	}

	// One-time seeding of the collapsed / help-open default state (first render only).
	const firstInit = !!state && !state.initialized;
	const ctx = {
		collapsed,
		helpOpen,
		seedCollapsed: firstInit && (props.defaultCollapsed === true || props.defaultCollapsed === 'true'),
		seedHelp: firstInit && (props.helpDefaultVisible === true || props.helpDefaultVisible === 'true')
	};

	sections.forEach((section, i) => {
		container.appendChild(buildSection(section, i, props, ctx));
	});

	if (state) state.initialized = true;

	applyResponsive(container, props);
}

/**
 * Back-compat: render a flat metrics array directly into `container` as a single grid
 * (no section chrome). Kept for any external/test callers; the component uses
 * `renderSections`.
 */
export function renderGrid(container, props) {
	renderMetricsInto(container, props.metrics, props);
	applyResponsive(container, props);
}
