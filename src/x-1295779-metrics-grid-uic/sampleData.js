/**
 * Built-in sample metrics so the grid renders something the moment it is dropped
 * onto a page (before `metrics` is bound to the resolver payload's `metrics`
 * array). Widths are mixed (25/33/50/75/100) to exercise the 12-col wrap behavior
 * (build spec §6).
 *
 * Each item mirrors a resolver `metrics[]` entry (build spec §5.2): the metric
 * definition fields plus its hydrated `data` envelope. The grid passes each item
 * straight to a metric-dispatcher, which routes `viz_type` to one of the 8 D3
 * chart components and hands it the envelope as-is — so each `data` shape below
 * matches exactly what its target component expects:
 *
 *   viz_type        component             data envelope
 *   column_chart    column-chart-uic      { categories, series: [{ name, values }] }
 *   line_chart      line-chart-uic        { categories, series: [{ name, values }] }
 *   pie_chart       pie-chart-uic         { slices: [{ label, value }] }
 *   scatter_chart   scatter-chart-uic     { series: [{ name, points: [{ x, y }] }] }
 *   heatmap         heatmap-chart-uic     { x_labels, y_labels, values: [[]] }
 *   sankey          sankey-chart-uic      { nodes: [{ name }], links: [{ source, target, value }] }
 *   treemap         treemap-chart-uic     { name, children: [{ name, value, children? }] }
 *   wordcloud       wordcloud-chart-uic   { words: [{ text, size }] }
 *
 * The grid is data-shape agnostic — it forwards the envelope verbatim — so these
 * exist purely to demonstrate the layout against the real component contract.
 */
export const SAMPLE_METRICS = [
	{
		id: 'm1',
		title: 'New Policies by Region',
		order: 10,
		width: 50,
		viz_type: 'column_chart',
		display_config: { y_label: 'Policies', value_format: '.0f' },
		data: {
			categories: ['Northeast', 'Southeast', 'Midwest', 'West'],
			series: [
				{ name: 'Q1', values: [120, 98, 76, 134] },
				{ name: 'Q2', values: [138, 104, 81, 152] }
			]
		}
	},
	{
		id: 'm2',
		title: 'Premium Mix',
		order: 20,
		width: 25,
		viz_type: 'pie_chart',
		display_config: { value_format: ',.0f' },
		data: {
			slices: [
				{ label: 'Auto', value: 420 },
				{ label: 'Home', value: 310 },
				{ label: 'Life', value: 180 },
				{ label: 'Commercial', value: 90 }
			]
		}
	},
	{
		id: 'm3',
		title: 'Premiums Written (Trend)',
		order: 30,
		width: 25,
		viz_type: 'line_chart',
		display_config: { y_label: 'USD (k)', value_format: ',.0f' },
		data: {
			categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
			series: [{ name: '2026', values: [210, 232, 228, 254, 271, 290] }]
		}
	},
	{
		id: 'm4',
		title: 'Claim Amount vs. Handle Time',
		order: 40,
		width: 75,
		viz_type: 'scatter_chart',
		display_config: { x_label: 'Handle time (hrs)', y_label: 'Claim amount (USD)' },
		data: {
			series: [
				{
					name: 'Auto',
					points: [
						{ x: 2.1, y: 1200 },
						{ x: 4.8, y: 3400 },
						{ x: 6.2, y: 5100 },
						{ x: 3.5, y: 2600 }
					]
				},
				{
					name: 'Home',
					points: [
						{ x: 5.0, y: 4200 },
						{ x: 7.4, y: 8800 },
						{ x: 9.1, y: 12400 }
					]
				}
			]
		}
	},
	{
		id: 'm5',
		title: 'Book of Business',
		order: 50,
		width: 25,
		viz_type: 'treemap',
		display_config: { value_format: ',.0f' },
		data: {
			name: 'Portfolio',
			children: [
				{
					name: 'Personal',
					children: [
						{ name: 'Auto', value: 420 },
						{ name: 'Home', value: 310 }
					]
				},
				{
					name: 'Commercial',
					children: [
						{ name: 'Fleet', value: 150 },
						{ name: 'Property', value: 95 }
					]
				}
			]
		}
	},
	{
		id: 'm6',
		title: 'Incidents by Category & State',
		order: 60,
		width: 33,
		viz_type: 'heatmap',
		display_config: { value_format: ',.0f' },
		data: {
			x_labels: ['New', 'In Progress', 'Resolved', 'Closed'],
			y_labels: ['Network', 'Hardware', 'Software'],
			values: [
				[12, 8, 20, 14],
				[6, 11, 9, 18],
				[15, 7, 22, 10]
			]
		}
	},
	{
		id: 'm7',
		title: 'Top Claim Keywords',
		order: 70,
		width: 33,
		viz_type: 'wordcloud',
		display_config: {},
		data: {
			words: [
				{ text: 'collision', size: 48 },
				{ text: 'water', size: 36 },
				{ text: 'theft', size: 30 },
				{ text: 'liability', size: 26 },
				{ text: 'hail', size: 22 },
				{ text: 'fire', size: 18 },
				{ text: 'vandalism', size: 14 }
			]
		}
	},
	{
		id: 'm8',
		title: 'Category → Assignment Group',
		order: 80,
		width: 100,
		viz_type: 'sankey',
		display_config: { value_format: ',.0f' },
		data: {
			nodes: [
				{ name: 'Network' },
				{ name: 'Hardware' },
				{ name: 'Software' },
				{ name: 'Tier 1' },
				{ name: 'Tier 2' },
				{ name: 'Field Ops' }
			],
			links: [
				{ source: 0, target: 3, value: 24 },
				{ source: 0, target: 4, value: 12 },
				{ source: 1, target: 4, value: 18 },
				{ source: 1, target: 5, value: 9 },
				{ source: 2, target: 3, value: 30 },
				{ source: 2, target: 4, value: 16 }
			]
		}
	}
];
