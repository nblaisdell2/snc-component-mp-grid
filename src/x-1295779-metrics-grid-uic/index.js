import { createCustomElement, actionTypes } from '@servicenow/ui-core';
import snabbdom from '@servicenow/ui-renderer-snabbdom';
import styles from './styles.scss';
import { renderSections, applyResponsive } from './grid';
import { SAMPLE_SECTIONS } from './sampleData';

// Side-effect imports that register the 8 D3 chart components the grid renders by
// tag at runtime (via document.createElement in grid.js). These imports are what
// makes the platform treat the charts as real dependencies: the snc CLI's
// import-based scanner detects them, resolves them against instance-fetched assets
// (package.json optionalDependencies → "instance", deploy with --fetch-assets-from-instance),
// and externalizes them as component dependencies so UIB loads their bundles wherever
// the grid is placed. Without these, the chart tags stay undefined and cards render
// blank until some other component on the page happens to pull a chart bundle in.
// Keep in sync with VIZ_TO_TAG / now-ui.json innerComponents.
import 'column-chart-uic';
import 'line-chart-uic';
import 'pie-chart-uic';
import 'scatter-chart-uic';
import 'heatmap-chart-uic';
import 'sankey-chart-uic';
import 'treemap-chart-uic';
import 'wordcloud-chart-uic';

const { COMPONENT_RENDERED, COMPONENT_DOM_READY, COMPONENT_PROPERTY_CHANGED, COMPONENT_DISCONNECTED } =
	actionTypes;

/**
 * x-1295779-metrics-grid-uic — the Metrics Portal layout grid (build spec §6/§10).
 *
 * Lays a metrics array into a 12-column grid (width -> span: 25/33/50/75/100 ->
 * 3/4/6/9/12), in `order`, with `grid-auto-flow: row dense` wrapping, and renders
 * the matching D3 chart component per metric (routing on `viz_type`). Responsive:
 * collapses to a single column below a configurable container width. Pure
 * presentation — never fetches its own data.
 *
 * The snabbdom view renders only a stable `<div class="mg-root">`; `renderGrid`
 * owns its contents imperatively so it can instantiate the chart children and set
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

	// Sections drive the layout. Back-compat: a flat `metrics` array still renders (the
	// grid wraps it into a single untitled section). With nothing bound, show samples.
	const hasSections = Array.isArray(properties.sections) && properties.sections.length > 0;
	const hasMetrics = Array.isArray(properties.metrics) && properties.metrics.length > 0;
	const effective = { ...properties };
	if (!hasSections && !hasMetrics) effective.sections = SAMPLE_SECTIONS;

	// Collapse state lives on the host so expand/collapse survives a property re-bind
	// (e.g. a future filter change that re-binds the payload). `initialized` guards the
	// one-time defaultCollapsed seeding in renderSections.
	if (!host._mgState) host._mgState = { collapsed: new Set(), helpOpen: new Set(), initialized: false };

	host._mgLast = { container, props: effective, dispatch };
	try {
		renderSections(container, effective, host._mgState);
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
		sections: { default: [] },
		metrics: { default: [] },
		columns: { default: 12 },
		gap: { default: '16px' },
		collapseBelow: { default: 900 },
		vizMap: { default: null },
		sectionsCollapsible: { default: true },
		defaultCollapsed: { default: false },
		animateSections: { default: true },
		sectionAnimationMs: { default: 250 },
		helpDefaultVisible: { default: false },
		showSectionHelpToggle: { default: true },
		sectionNameColor: { default: '#111827' },
		sectionNameFontFamily: { default: '' },
		sectionNameFontSize: { default: '16px' },
		sectionNameFontWeight: { default: '600' },
		sectionHelpColor: { default: '#6b7280' },
		sectionHelpFontSize: { default: '12px' },
		helpIconColor: { default: '#9ca3af' },
		ruleColor: { default: '#e5e7eb' },
		ruleThickness: { default: 1 },
		sectionSpacing: { default: '24px' },
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
