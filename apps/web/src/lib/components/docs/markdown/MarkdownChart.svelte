<script lang="ts">
	import { cn } from '$lib/utils/cn';

	// ─── Types ────────────────────────────────────────────────────────────────────

	type ChartType = 'line' | 'bar' | 'composed' | 'scatter' | 'pie' | 'ring' | 'radar';

	type Row = Record<string, string | number>;
	type Series = { key: string; values: number[]; color: string };
	type ParsedChart = {
		options: Partial<Record<string, string>>;
		headers: string[];
		rows: Row[];
		labelKey: string;
		series: Series[];
	};

	// ─── Props ────────────────────────────────────────────────────────────────────

	let { source = '', class: className = '' }: { source?: string; class?: string } = $props();

	// ─── Constants ────────────────────────────────────────────────────────────────

	// High-contrast palette — picked so nothing blends into a dark background.
	const DEFAULT_COLORS = [
		'#22c55e',
		'#ec4899',
		'#38bdf8',
		'#f97316',
		'#a78bfa',
		'#facc15',
		'#d4a017',
		'#2dd4bf'
	];
	const FALLBACK_COLOR = '#94a3b8';

	function colorAt(list: string[], i: number): string {
		return list[i % list.length] ?? FALLBACK_COLOR;
	}

	const W = 680;
	const H = 280;
	const PAD = { top: 24, right: 24, bottom: 40, left: 52 };
	const PLOT_W = W - PAD.left - PAD.right;
	const PLOT_H = H - PAD.top - PAD.bottom;
	const GRID_LINES = 4;
	const RADAR_STROKE_WIDTH = 1.5;
	const DOT_R = 3.5;
	const ACTIVE_DOT_R = 5.5;

	const OPT_LINE_RE = /^\s*\[([^\]]+)]\s*(.+?)\s*$/;
	const SEPARATOR_ROW_RE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;

	// ─── Reactive state ───────────────────────────────────────────────────────────

	let hoveredSeriesKey = $state<string | null>(null);
	let selectedSeriesKey = $state<string | null>(null);
	let hoveredRowLabel = $state<string | null>(null);
	let selectedRowLabel = $state<string | null>(null);
	let tooltip = $state<{ x: number; y: number; rowIndex: number } | null>(null);
	let svgEl = $state<SVGSVGElement | null>(null);

	// ─── Parsing ──────────────────────────────────────────────────────────────────

	function parseChart(value: string): ParsedChart {
		const lines = value.trim().split(/\r?\n/);
		const options: Partial<Record<string, string>> = {};
		const tableLines: string[] = [];
		for (const line of lines) {
			const opt = OPT_LINE_RE.exec(line);
			if (opt) {
				options[opt[1].trim().toLowerCase()] = opt[2].trim();
				continue;
			}
			if (line.trim().startsWith('|')) tableLines.push(line);
		}
		const table = parseMarkdownTable(tableLines);

		// The first column is always treated as the category/label column,
		// regardless of its exact header text (fixes label column not matching
		// due to case/whitespace/naming differences like "Квартал"/"Регион").
		const labelKey = table.headers[0] ?? 'Label';
		const numericHeaders = table.headers.slice(1);

		return {
			options,
			headers: table.headers,
			rows: table.rows,
			labelKey,
			series: numericHeaders.map((key, i) => ({
				key,
				color: colorAt(DEFAULT_COLORS, i),
				values: table.rows.map((row) => toNum(row[key]))
			}))
		};
	}

	function parseMarkdownTable(lines: string[]) {
		const rows = lines
			.map((l) => l.trim())
			.filter(Boolean)
			.filter((l) => !SEPARATOR_ROW_RE.test(l));
		const headers = splitRow(rows[0] ?? '');
		return {
			headers,
			rows: rows.slice(1).map((line) => {
				const cells = splitRow(line);
				return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
			})
		};
	}

	function splitRow(line: string) {
		return line
			.replace(/^\|/, '')
			.replace(/\|$/, '')
			.split('|')
			.map((c) => c.trim());
	}

	function toNum(value: string | number | undefined) {
		if (typeof value === 'number') return value;
		const asString = value ?? '';
		const n = Number(asString.replace(',', '.').replace(/[^\d.-]/g, ''));
		return Number.isFinite(n) ? n : 0;
	}

	function toStr(value: string | number | undefined) {
		return value === undefined ? '' : String(value);
	}

	// ─── Derived chart data ───────────────────────────────────────────────────────

	const parsed = $derived(parseChart(source));
	const chartType = $derived((parsed.options.type ?? 'line') as ChartType);
	const title = $derived(parsed.options.title ?? 'Chart');
	const glow = $derived(parsed.options.glow === 'true' || parsed.options.glow === '1');

	const customColors = $derived(
		parsed.options.colors
			? parsed.options.colors
					.split(',')
					.map((c) => c.trim())
					.filter(Boolean)
			: null
	);

	const colors = $derived(customColors && customColors.length > 0 ? customColors : DEFAULT_COLORS);

	const chart = $derived({
		...parsed,
		series: parsed.series.map((s, i) => ({
			...s,
			color: colorAt(colors, i)
		}))
	});

	const allValues = $derived(chart.series.flatMap((s) => s.values));
	const rawMax = $derived(Math.max(...allValues, 1));

	// Nice round max for y-axis
	const niceMax = $derived(niceNumber(rawMax, true));
	const niceMin = $derived(0);
	const domain = $derived(Math.max(1, niceMax - niceMin));

	function niceNumber(n: number, ceil: boolean) {
		if (n === 0) return 0;
		const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(n))));
		const norm = n / mag;
		const niced = ceil ? Math.ceil(norm) : Math.floor(norm);
		return niced * mag;
	}

	// ─── Coordinate helpers ───────────────────────────────────────────────────────

	function xPos(index: number, length: number) {
		if (length <= 1) return PAD.left + PLOT_W / 2;
		return PAD.left + (index / (length - 1)) * PLOT_W;
	}

	function yPos(value: number) {
		return PAD.top + PLOT_H - ((value - niceMin) / domain) * PLOT_H;
	}

	function linePath(values: number[]) {
		return values
			.map((v, i) => `${i === 0 ? 'M' : 'L'} ${String(xPos(i, values.length))} ${String(yPos(v))}`)
			.join(' ');
	}

	function points(values: number[]) {
		return values.map((v, i) => ({ x: xPos(i, values.length), y: yPos(v), v }));
	}

	function polarPt(i: number, len: number, r: number, cx = W / 2, cy = H / 2) {
		const a = -Math.PI / 2 + (i / Math.max(len, 1)) * Math.PI * 2;
		return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
	}

	// Pie/Ring: slice by ROWS (categories), using the first numeric series
	// as the value for each category.
	function categorySlices() {
		const firstSeriesKey = chart.series[0]?.key ?? '';
		const values = chart.rows.map((row) => toNum(row[firstSeriesKey]));
		const total = values.reduce((s, v) => s + Math.max(v, 0), 0) || 1;
		let start = -Math.PI / 2;
		return chart.rows.map((row, i) => {
			const v = Math.max(values[i] ?? 0, 0);
			const angle = (v / total) * Math.PI * 2;
			const end = start + angle;
			const sl = {
				start,
				end,
				value: v,
				pct: v / total,
				label: toStr(row[chart.labelKey]) || `#${String(i + 1)}`,
				color: colorAt(colors, i)
			};
			start = end;
			return sl;
		});
	}

	function arcPath(start: number, end: number, outer: number, inner = 0) {
		const cx = W / 2;
		const cy = H / 2;
		const p1 = { x: cx + Math.cos(start) * outer, y: cy + Math.sin(start) * outer };
		const p2 = { x: cx + Math.cos(end) * outer, y: cy + Math.sin(end) * outer };
		const large = end - start > Math.PI ? 1 : 0;
		if (inner <= 0)
			return `M ${String(cx)} ${String(cy)} L ${String(p1.x)} ${String(p1.y)} A ${String(outer)} ${String(outer)} 0 ${String(large)} 1 ${String(p2.x)} ${String(p2.y)} Z`;
		const p3 = { x: cx + Math.cos(end) * inner, y: cy + Math.sin(end) * inner };
		const p4 = { x: cx + Math.cos(start) * inner, y: cy + Math.sin(start) * inner };
		return `M ${String(p1.x)} ${String(p1.y)} A ${String(outer)} ${String(outer)} 0 ${String(large)} 1 ${String(p2.x)} ${String(p2.y)} L ${String(p3.x)} ${String(p3.y)} A ${String(inner)} ${String(inner)} 0 ${String(large)} 0 ${String(p4.x)} ${String(p4.y)} Z`;
	}

	function arcMidPoint(start: number, end: number, r: number) {
		const a = (start + end) / 2;
		return { x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r };
	}

	// ─── Y-axis tick values ───────────────────────────────────────────────────────

	const yTicks = $derived(
		Array.from({ length: GRID_LINES + 1 }, (_, i) => {
			const v = niceMin + (i / GRID_LINES) * (niceMax - niceMin);
			return { value: v, y: yPos(v) };
		})
	);

	function fmtValue(v: number) {
		if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
		if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
		return String(Math.round(v));
	}

	// ─── Series opacity (legend click = isolate) ──────────────────────────────────

	function seriesOpacity(key: string) {
		if (selectedSeriesKey !== null && selectedSeriesKey !== key) return 0.18;
		if (hoveredSeriesKey !== null && hoveredSeriesKey !== key && selectedSeriesKey === null)
			return 0.35;
		return 1;
	}

	function rowOpacity(label: string) {
		if (selectedRowLabel !== null && selectedRowLabel !== label) return 0.25;
		if (hoveredRowLabel !== null && hoveredRowLabel !== label && selectedRowLabel === null)
			return 0.45;
		return 1;
	}

	// ─── Tooltip helpers ──────────────────────────────────────────────────────────

	const CARTESIAN_TYPES: ChartType[] = ['bar', 'composed', 'line', 'scatter'];
	const CIRCULAR_TYPES: ChartType[] = ['pie', 'ring'];

	function onSvgMouseMove(e: MouseEvent) {
		if (!svgEl || !CARTESIAN_TYPES.includes(chartType)) return;
		const rect = svgEl.getBoundingClientRect();
		const svgX = ((e.clientX - rect.left) / rect.width) * W;
		const svgY = ((e.clientY - rect.top) / rect.height) * H;
		if (svgX < PAD.left || svgX > W - PAD.right || svgY < PAD.top || svgY > H - PAD.bottom) {
			tooltip = null;
			return;
		}
		const len = chart.rows.length;
		const raw = ((svgX - PAD.left) / PLOT_W) * (len - 1);
		const idx = Math.max(0, Math.min(len - 1, Math.round(raw)));
		tooltip = { x: xPos(idx, len), y: svgY, rowIndex: idx };
	}

	function onSvgLeave() {
		tooltip = null;
	}

	// Tooltip panel — keep inside SVG bounds
	const tooltipPanel = $derived.by(() => {
		if (!tooltip) return null;
		const px = tooltip.x + 12;
		const py = Math.max(PAD.top, tooltip.y - 40);
		return { x: Math.min(px, W - 160), y: Math.min(py, H - PAD.bottom - 80) };
	});

	const tooltipRow = $derived(tooltip !== null ? (chart.rows[tooltip.rowIndex] ?? null) : null);

	// ─── Chart family flags ───────────────────────────────────────────────────────

	const isCartesian = $derived(CARTESIAN_TYPES.includes(chartType));
	const isCircular = $derived(CIRCULAR_TYPES.includes(chartType));
</script>

<div class={cn('inset-shadow my-8 rounded-lg bg-background-inset p-1.5', className)}>
	<div class="card overflow-hidden rounded-md bg-background">
		<!-- Header: title + legend -->
		<div class="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
			<div>
				<div class="text-base font-semibold tracking-tight text-foreground">{title}</div>
			</div>

			<!-- Cartesian / Radar legend: one entry per SERIES (column) -->
			{#if isCartesian || chartType === 'radar'}
				<div class="flex flex-wrap items-center gap-3 pt-0.5">
					{#each chart.series as serie (serie.key)}
						{@const isSelected = selectedSeriesKey === null || selectedSeriesKey === serie.key}
						<button
							type="button"
							class="flex cursor-pointer items-center gap-1.5 text-xs transition-opacity duration-150 select-none"
							style="opacity: {isSelected ? 1 : 0.35}"
							onclick={() => {
								selectedSeriesKey = selectedSeriesKey === serie.key ? null : serie.key;
							}}
							onmouseenter={() => {
								hoveredSeriesKey = serie.key;
							}}
							onmouseleave={() => {
								hoveredSeriesKey = null;
							}}
						>
							<span class="inline-block size-2.5 rounded-[3px]" style="background:{serie.color}"
							></span>
							<span class="text-foreground-muted">{serie.key}</span>
						</button>
					{/each}
				</div>
			{/if}

			<!-- Pie / Ring legend: one entry per ROW (category) -->
			{#if isCircular}
				<div class="flex flex-wrap items-center gap-3 pt-0.5">
					{#each categorySlices() as slice (slice.label)}
						{@const isSelected = selectedRowLabel === null || selectedRowLabel === slice.label}
						<button
							type="button"
							class="flex cursor-pointer items-center gap-1.5 text-xs transition-opacity duration-150 select-none"
							style="opacity: {isSelected ? 1 : 0.35}"
							onclick={() => {
								selectedRowLabel = selectedRowLabel === slice.label ? null : slice.label;
							}}
							onmouseenter={() => {
								hoveredRowLabel = slice.label;
							}}
							onmouseleave={() => {
								hoveredRowLabel = null;
							}}
						>
							<span class="inline-block size-2.5 rounded-[3px]" style="background:{slice.color}"
							></span>
							<span class="text-foreground-muted">{slice.label}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Chart area -->
		<div class="overflow-x-auto p-4">
			<svg
				bind:this={svgEl}
				viewBox="0 0 {W} {H}"
				class="w-full"
				style="min-width: 420px"
				role="img"
				aria-label={title}
				onmousemove={onSvgMouseMove}
				onmouseleave={onSvgLeave}
			>
				{#if glow}
					<defs>
						<filter id="glow-{title}" x="-50%" y="-50%" width="200%" height="200%">
							<feGaussianBlur stdDeviation="4" result="blur" />
							<feMerge>
								<feMergeNode in="blur" />
								<feMergeNode in="SourceGraphic" />
							</feMerge>
						</filter>
					</defs>
				{/if}

				<!-- ── Grid + axes (cartesian) ── -->
				{#if isCartesian}
					<!-- Horizontal grid lines + y-axis labels -->
					{#each yTicks as tick (tick.value)}
						<line
							x1={PAD.left}
							x2={W - PAD.right}
							y1={tick.y}
							y2={tick.y}
							stroke="currentColor"
							stroke-width="0.5"
							class="text-border"
						/>
						<text
							x={PAD.left - 8}
							y={tick.y + 4}
							text-anchor="end"
							class="fill-foreground-muted text-[10px]"
							font-size="10">{fmtValue(tick.value)}</text
						>
					{/each}

					<!-- X-axis labels: always taken from the first column (labelKey),
					     whatever it's actually called (Квартал / Регион / etc.) -->
					{#each chart.rows as row, i (i)}
						{@const label = toStr(row[chart.labelKey])}
						{@const every = Math.max(1, Math.ceil(chart.rows.length / 7))}
						{#if i % every === 0}
							<text
								x={xPos(i, chart.rows.length)}
								y={H - PAD.bottom + 16}
								text-anchor="middle"
								class="fill-foreground-muted text-[10px]"
								font-size="10">{label}</text
							>
						{/if}
					{/each}

					<!-- Crosshair -->
					{#if tooltip}
						<line
							x1={tooltip.x}
							x2={tooltip.x}
							y1={PAD.top}
							y2={PAD.top + PLOT_H}
							stroke="currentColor"
							stroke-width="1"
							stroke-dasharray="4 3"
							class="pointer-events-none text-foreground-muted"
						/>
					{/if}
				{/if}

				<!-- ── Line chart ── -->
				{#if chartType === 'line'}
					{#each chart.series as serie (serie.key)}
						<path
							d={linePath(serie.values)}
							fill="none"
							stroke={serie.color}
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							filter={glow ? `url(#glow-${title})` : undefined}
							style="opacity: {seriesOpacity(serie.key)}; transition: opacity 0.2s"
						/>
						{#each points(serie.values) as pt, pi (pi)}
							<circle
								cx={pt.x}
								cy={pt.y}
								r={tooltip?.rowIndex === pi ? ACTIVE_DOT_R : DOT_R}
								fill={serie.color}
								stroke="var(--color-background)"
								stroke-width="2"
								class="transition-all duration-100"
								style="opacity: {seriesOpacity(serie.key)}"
							/>
						{/each}
					{/each}

					<!-- ── Bar chart ── -->
				{:else if chartType === 'bar'}
					{@const groupW = PLOT_W / Math.max(chart.rows.length, 1)}
					{@const barW = (groupW - 8) / Math.max(chart.series.length, 1)}
					{#each chart.series as serie, si (serie.key)}
						{#each serie.values as v, ri (ri)}
							{@const bx = PAD.left + ri * groupW + si * barW + 4}
							{@const by = yPos(v)}
							{@const bh = Math.max(2, PAD.top + PLOT_H - by)}
							<rect
								x={bx}
								y={by}
								width={Math.max(4, barW - 3)}
								height={bh}
								rx="4"
								fill={serie.color}
								filter={glow ? `url(#glow-${title})` : undefined}
								style="opacity: {seriesOpacity(serie.key) * 0.9}; transition: opacity 0.2s"
							/>
						{/each}
					{/each}

					<!-- ── Composed (bars + line) ── -->
				{:else if chartType === 'composed'}
					{@const groupW = PLOT_W / Math.max(chart.rows.length, 1)}
					{@const firstSeriesValues = chart.series.length > 0 ? chart.series[0].values : []}
					{@const firstSeriesColor =
						chart.series.length > 0 ? chart.series[0].color : DEFAULT_COLORS[0]}
					{#each firstSeriesValues as v, ri (ri)}
						{@const bx = PAD.left + ri * groupW + 6}
						{@const by = yPos(v)}
						<rect
							x={bx}
							y={by}
							width={Math.max(10, groupW * 0.5 - 8)}
							height={Math.max(2, PAD.top + PLOT_H - by)}
							rx="5"
							fill={firstSeriesColor}
							opacity="0.5"
						/>
					{/each}
					{#each chart.series.slice(1) as serie (serie.key)}
						<path
							d={linePath(serie.values)}
							fill="none"
							stroke={serie.color}
							stroke-width="2.5"
							stroke-linecap="round"
							style="opacity: {seriesOpacity(serie.key)}"
						/>
						{#each points(serie.values) as pt, pi (pi)}
							<circle
								cx={pt.x}
								cy={pt.y}
								r={DOT_R}
								fill={serie.color}
								stroke="var(--color-background)"
								stroke-width="1.5"
							/>
						{/each}
					{/each}

					<!-- ── Scatter chart ── -->
				{:else if chartType === 'scatter'}
					{#each chart.series as serie (serie.key)}
						{#each points(serie.values) as pt, i (i)}
							<circle
								cx={pt.x}
								cy={pt.y}
								r={5 + (i % 4)}
								fill={serie.color}
								opacity={0.75 * seriesOpacity(serie.key)}
							/>
						{/each}
					{/each}

					<!-- ── Pie / Ring: one slice per ROW/category, with value labels ── -->
				{:else if chartType === 'pie' || chartType === 'ring'}
					{#each categorySlices() as slice (slice.label)}
						<path
							d={arcPath(slice.start, slice.end, 108, chartType === 'ring' ? 66 : 0)}
							fill={slice.color}
							stroke="var(--color-background)"
							stroke-width="3"
							filter={glow ? `url(#glow-${title})` : undefined}
							style="opacity: {rowOpacity(slice.label)}; transition: opacity 0.2s"
						/>
						{@const labelR = chartType === 'ring' ? 87 : 72}
						{@const mid = arcMidPoint(slice.start, slice.end, labelR)}
						{#if slice.end - slice.start > 0.18}
							<text
								x={mid.x}
								y={mid.y}
								text-anchor="middle"
								dominant-baseline="middle"
								font-size="10"
								font-weight="600"
								class="fill-background"
								style="opacity: {rowOpacity(slice.label)}; transition: opacity 0.2s"
								>{fmtValue(slice.value)}</text
							>
						{/if}
					{/each}

					<!-- ── Radar: axes from ROWS, one polygon per SERIES ── -->
				{:else if chartType === 'radar'}
					{@const axisCount = chart.rows.length}
					{#each [0.25, 0.5, 0.75, 1] as ring (ring)}
						<polygon
							points={Array.from({ length: axisCount }, (_, i) =>
								polarPt(i, axisCount, 108 * ring)
							)
								.map((p) => `${String(p.x)},${String(p.y)}`)
								.join(' ')}
							fill="none"
							stroke="currentColor"
							stroke-width={RADAR_STROKE_WIDTH}
							class="text-border/80"
						/>
					{/each}
					<!-- Axis lines from center to each vertex -->
					{#each Array.from({ length: axisCount }, (_, i) => i) as i (i)}
						<line
							x1={W / 2}
							y1={H / 2}
							x2={polarPt(i, axisCount, 108).x}
							y2={polarPt(i, axisCount, 108).y}
							stroke="currentColor"
							stroke-width={RADAR_STROKE_WIDTH * 0.75}
							class="text-border/50"
						/>
					{/each}
					<!-- Axis labels (one per row/category, e.g. Скорость/Стабильность/...) -->
					{#each chart.rows as row, i (i)}
						{@const label = toStr(row[chart.labelKey])}
						{@const p = polarPt(i, axisCount, 128)}
						<text
							x={p.x}
							y={p.y}
							text-anchor="middle"
							dominant-baseline="middle"
							font-size="10"
							class="fill-foreground-muted">{label}</text
						>
					{/each}
					{#each chart.series as serie (serie.key)}
						{@const pts = serie.values
							.map((v, i) => polarPt(i, axisCount, (v / rawMax) * 108))
							.map((p) => `${String(p.x)},${String(p.y)}`)
							.join(' ')}
						<polygon
							points={pts}
							fill={serie.color}
							fill-opacity={0.22 * seriesOpacity(serie.key)}
							stroke={serie.color}
							stroke-width="2.5"
							filter={glow ? `url(#glow-${title})` : undefined}
							style="opacity: {seriesOpacity(serie.key)}"
						/>
					{/each}
				{/if}

				<!-- ── Tooltip overlay (cartesian) ── -->
				{#if tooltip && tooltipPanel && tooltipRow && isCartesian}
					<rect
						x={tooltipPanel.x - 8}
						y={tooltipPanel.y - 8}
						width="148"
						height={18 + chart.series.length * 20}
						rx="8"
						fill="var(--color-background)"
						stroke="var(--color-border)"
						stroke-width="0.5"
						class="shadow-md"
					/>
					<!-- Label row -->
					<text
						x={tooltipPanel.x}
						y={tooltipPanel.y + 6}
						font-size="10"
						font-weight="600"
						class="fill-foreground">{toStr(tooltipRow[chart.labelKey])}</text
					>
					<!-- Series rows -->
					{#each chart.series as serie, si (serie.key)}
						{@const val = toNum(tooltipRow[serie.key])}
						<g transform="translate({tooltipPanel.x}, {tooltipPanel.y + 18 + si * 20})">
							<circle cx="4" cy="0" r="3.5" fill={serie.color} />
							<text x="12" y="4" font-size="10" class="fill-foreground-muted">{serie.key}</text>
							<text
								x="132"
								y="4"
								text-anchor="end"
								font-size="10"
								font-weight="600"
								class="fill-foreground">{fmtValue(val)}</text
							>
						</g>
					{/each}
				{/if}
			</svg>
		</div>
	</div>
</div>
