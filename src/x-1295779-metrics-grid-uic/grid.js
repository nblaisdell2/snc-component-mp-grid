/**
 * grid.js — the imperative renderer for x-1295779-metrics-grid-uic.
 *
 * Lays metrics into a 12-column CSS grid (build spec §6), in `order`, mapping each
 * metric's `width` to a column span, and hosts a metric-dispatcher per metric.
 * Like the dispatcher (and unlike the nav), it instantiates child custom elements
 * and sets object properties on them, so the snabbdom view renders only a stable
 * container and this module owns its contents imperatively.
 *
 *   width  25  33  50  75  100
 *   span    3   4   6   9   12   (on a 12-col grid)
 */

/** width value -> grid span on a 12-col grid (build spec §6). */
export const WIDTH_TO_SPAN = { 25: 3, 33: 4, 50: 6, 75: 9, 100: 12 };

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

/** Apply the responsive single-column collapse based on the container's width. */
export const applyResponsive = (container, props) => {
	const columns = parseInt(props.columns, 10) || 12;
	const collapseBelow = parseInt(props.collapseBelow, 10) || 0;
	const w = container.getBoundingClientRect
		? container.getBoundingClientRect().width || container.clientWidth || 0
		: container.clientWidth || 0;
	const collapsed = collapseBelow > 0 && w > 0 && w < collapseBelow;
	// Collapsing to a single template column makes every card stack full-width
	// (spans are clamped by the grid), without touching the per-card inline spans.
	container.style.gridTemplateColumns = collapsed ? '1fr' : `repeat(${columns}, 1fr)`;
	return collapsed;
};

/**
 * Render the metrics grid into `container`. Clears and rebuilds.
 */
export function renderGrid(container, props, dispatch) {
	const columns = parseInt(props.columns, 10) || 12;
	const metrics = asArray(props.metrics)
		.map(asObject)
		.filter(Boolean)
		.filter((m) => m.active === undefined || m.active === true || m.active === 'true')
		.slice()
		.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

	const dispatcherTag = props.dispatcherTag || 'x-1295779-metric-dispatcher-uic';
	const vizMap = asObject(props.vizMap);

	container.textContent = '';
	container.className = 'mg-grid';
	container.style.display = 'grid';
	container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
	container.style.gridAutoFlow = 'row dense';
	container.style.gap = cssLen(props.gap, '16px');

	if (!metrics.length) {
		const empty = el('div', 'mg-empty');
		empty.textContent = props.emptyMessage || 'No metrics to display.';
		empty.style.gridColumn = '1 / -1';
		container.appendChild(empty);
		applyResponsive(container, props);
		return;
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
		const disp = el(dispatcherTag);
		// Hand the whole metric record to the dispatcher (it reads viz_type/title/
		// display_config from `definition`) plus the hydrated data + display config.
		disp.definition = m;
		disp.data = m.data || (m.definition && m.definition.data) || {};
		disp.displayConfig = m.display_config || m.displayConfig || null;
		disp.showTitle = false; // the card owns the title
		if (vizMap) disp.vizMap = vizMap;
		body.appendChild(disp);
		card.appendChild(body);
		container.appendChild(card);
	});

	applyResponsive(container, props);
}
