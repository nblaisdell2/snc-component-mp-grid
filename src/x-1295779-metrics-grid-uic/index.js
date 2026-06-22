import { createCustomElement, actionTypes } from '@servicenow/ui-core';
import snabbdom from '@servicenow/ui-renderer-snabbdom';
import styles from './styles.scss';
import { renderGrid, applyResponsive } from './grid';
import { SAMPLE_METRICS } from './sampleData';

const { COMPONENT_RENDERED, COMPONENT_DOM_READY, COMPONENT_PROPERTY_CHANGED, COMPONENT_DISCONNECTED } =
	actionTypes;

/**
 * x-1295779-metrics-grid-uic — the Metrics Portal layout grid (build spec §6/§10).
 *
 * Lays a metrics array into a 12-column grid (width -> span: 25/33/50/75/100 ->
 * 3/4/6/9/12), in `order`, with `grid-auto-flow: row dense` wrapping, and hosts a
 * metric-dispatcher per metric. Responsive: collapses to a single column below a
 * configurable container width. Pure presentation — never fetches its own data.
 *
 * The snabbdom view renders only a stable `<div class="mg-root">`; `renderGrid`
 * owns its contents imperatively so it can instantiate dispatcher children and set
 * object properties on them.
 */
const view = () => <div className="mg-root" />;

const getContainer = (host) =>
	host && host.shadowRoot
		? host.shadowRoot.querySelector('.mg-root') || host.shadowRoot.querySelector('div')
		: null;

const render = ({ host, properties, dispatch }) => {
	const container = getContainer(host);
	if (!container) return;
	host.style.display = 'block';
	host.style.boxSizing = 'border-box';
	host.style.width = '100%';
	const metrics =
		Array.isArray(properties.metrics) && properties.metrics.length
			? properties.metrics
			: SAMPLE_METRICS;
	const effective = { ...properties, metrics };
	host._mgLast = { container, props: effective, dispatch };
	try {
		renderGrid(container, effective, dispatch);
	} catch (e) {
		container.textContent = `Grid error: ${e && e.message ? e.message : String(e)}`;
		// eslint-disable-next-line no-console
		if (typeof console !== 'undefined') console.error('[metrics-grid] render failed', e);
	}
};

createCustomElement('x-1295779-metrics-grid-uic', {
	renderer: { type: snabbdom },
	view,
	styles,
	properties: {
		metrics: { default: SAMPLE_METRICS },
		columns: { default: 12 },
		gap: { default: '16px' },
		collapseBelow: { default: 900 },
		dispatcherTag: { default: 'x-1295779-metric-dispatcher-uic' },
		vizMap: { default: null },
		showCardChrome: { default: true },
		showCardTitle: { default: true },
		cardBackground: { default: '#ffffff' },
		cardBorderColor: { default: '#e5e7eb' },
		cardBorderWidth: { default: 1 },
		cardRadius: { default: '8px' },
		cardPadding: { default: '16px' },
		cardMinHeight: { default: '120px' },
		cardShadow: { default: true },
		emptyMessage: { default: 'No metrics to display.' }
	},
	actionHandlers: {
		[COMPONENT_RENDERED]: render,
		[COMPONENT_PROPERTY_CHANGED]: render,
		[COMPONENT_DOM_READY]: (coeffects) => {
			const { host } = coeffects;
			render(coeffects);
			// Container-width-based responsive collapse (build spec §6). A media query
			// keys off the viewport, but this component can sit at any slot width, so a
			// ResizeObserver on the grid is the correct trigger.
			if (typeof ResizeObserver !== 'undefined' && !host._mgResizeObserver) {
				const ro = new ResizeObserver(() => {
					const last = host._mgLast;
					if (last && last.container) applyResponsive(last.container, last.props);
				});
				const target = getContainer(host);
				if (target) {
					ro.observe(target);
					host._mgResizeObserver = ro;
				}
			}
		},
		[COMPONENT_DISCONNECTED]: ({ host }) => {
			if (host._mgResizeObserver) {
				host._mgResizeObserver.disconnect();
				host._mgResizeObserver = null;
			}
		}
	}
});
