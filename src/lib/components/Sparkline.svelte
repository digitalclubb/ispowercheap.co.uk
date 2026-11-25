<script lang="ts">
	import {
		BEST_WINDOW_PERIODS,
		type BestWindow,
		describeWindow,
		FORECAST_WINDOW_PERIODS,
	} from '$lib/forecast.js';
	import { formatTime, formatTimeWithDay } from '$lib/format.js';
	import type { CarbonIntensityPoint } from '$lib/types.js';

	// `points[0]` is the half-hour underway now (server trims the past).
	// `best` is the page's cheapest 3 h stretch — shared with the Outlook line.
	let {
		points,
		best,
		now,
	}: { points: CarbonIntensityPoint[]; best: BestWindow | null; now: string } = $props();

	const slice = $derived(points.slice(0, FORECAST_WINDOW_PERIODS));
	const n = $derived(slice.length);
	const max = $derived(Math.max(...slice.map((p) => p.forecast)));
	const min = $derived(Math.min(...slice.map((p) => p.forecast)));
	// Flat day (e.g. North Scotland at 0 g all day): no "cheaper" or "pricier"
	// to show, so draw even half-height bars and say so instead of a key.
	const flat = $derived(max === min);
	// Baseline sits below the lowest bar rather than at zero: on a 300–400 g day a
	// zero baseline makes every bar look the same height, and the job here is
	// "when is it lower", not "how many grams". Shortest bar ≈ 25% tall.
	const floor = $derived(min - (max - min) / 3);
	const height = (v: number) => (flat ? 50 : ((v - floor) / (max - floor)) * 100);
	const avg = $derived(slice.reduce((s, p) => s + p.forecast, 0) / Math.max(1, n));

	// Three tiers, one colour: the cheapest stretch solid, anything below the
	// 24 h average mid, the rest faint. Lets you spot "also pretty good at 18:00"
	// without reading numbers.
	function tier(i: number, p: CarbonIntensityPoint): 'best' | 'below' | 'above' {
		if (best && i >= best.startIdx && i < best.startIdx + BEST_WINDOW_PERIODS) return 'best';
		return flat || p.forecast <= avg ? 'below' : 'above';
	}

	// Clock labels at 00/06/12/18 UK time, kept clear of the "now" label and the right edge.
	const ticks = $derived(
		slice.flatMap((p, i) => {
			const t = formatTime(p.from);
			if (i < 6 || i > n - 3 || !['00:00', '06:00', '12:00', '18:00'].includes(t)) return [];
			return [{ i, pct: (i / n) * 100, label: t === '00:00' ? 'midnight' : t }];
		}),
	);
	const midnight = $derived(ticks.find((t) => t.label === 'midnight'));

	const bestPct = $derived(
		best ? Math.min(85, Math.max(15, ((best.startIdx + BEST_WINDOW_PERIODS / 2) / n) * 100)) : 0,
	);

	const summary = $derived.by(() => {
		if (!n) return '';
		const peak = slice.reduce((a, b) => (b.forecast > a.forecast ? b : a));
		const parts = ['Next 24 hours.'];
		if (best) parts.push(`Cheapest 3 hours: ${describeWindow(best, now)}.`);
		parts.push(
			flat ? 'About the same all day.' : `Highest carbon around ${formatTimeWithDay(peak.from, now)}.`,
		);
		return parts.join(' ');
	});
</script>

{#if n}
	<figure class="forecast-chart">
		<div class="plot" role="img" aria-label={summary}>
			{#if best}
				<span class="best-label" style:left="{bestPct}%">{describeWindow(best, now)}</span>
			{/if}
			<svg viewBox="0 0 {n} 100" preserveAspectRatio="none" aria-hidden="true">
				{#if midnight}
					<line
						x1={midnight.i}
						x2={midnight.i}
						y1="0"
						y2="100"
						class="midnight"
						vector-effect="non-scaling-stroke"
					/>
				{/if}
				{#each slice as p, i (p.from)}
					{@const h = height(p.forecast)}
					<rect x={i + 0.12} width="0.76" y={100 - h} height={h} class={tier(i, p)}>
						<title>{formatTimeWithDay(p.from, now)} · {p.forecast} gCO₂/kWh · {p.index}</title>
					</rect>
				{/each}
			</svg>
			<div class="axis" aria-hidden="true">
				<span class="now">now</span>
				{#each ticks as t (t.i)}
					<span style:left="{t.pct}%">{t.label}</span>
				{/each}
			</div>
		</div>
		<figcaption>
			{#if flat}
				<span class="note">about the same all day</span>
			{:else}
			<span class="key">
				{#if best}<span><i class="sw best"></i><span class="lbl">cheapest 3 hours</span></span>{/if}
				<span><i class="sw below"></i><span class="lbl">below average</span></span>
				<span><i class="sw above"></i><span class="lbl">above average</span></span>
			</span>
			{/if}
			<span class="note">shorter bar = cleaner grid</span>
			<span class="note tariff">
				on a fixed-rate tariff your price per unit is the same all day, so moving
				your usage cuts carbon, not your bill. on economy 7 or a time-of-use
				tariff, use your tariff’s cheap hours first. <a href="/about">how this works</a>
			</span>
		</figcaption>
	</figure>
{/if}

<style>
	.forecast-chart {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: min(100%, 560px);
	}
	.plot {
		position: relative;
		padding-top: 1.6em; /* room for the best-window label */
		font-size: var(--micro-size);
		font-variant-numeric: tabular-nums;
	}
	svg {
		display: block;
		width: 100%;
		height: 96px;
		fill: currentColor;
	}
	.best {
		opacity: 1;
	}
	.below {
		opacity: 0.5;
	}
	.above {
		opacity: 0.2;
	}
	.midnight {
		stroke: currentColor;
		stroke-dasharray: 2 3;
		opacity: var(--opacity-quaternary);
	}
	.best-label {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		white-space: nowrap;
		font-weight: 600;
	}
	.axis {
		position: relative;
		height: 1.5em;
		margin-top: var(--space-1);
		opacity: var(--opacity-secondary);
	}
	.axis span {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		white-space: nowrap;
	}
	.axis .now {
		left: 0;
		transform: none;
		font-weight: 600;
	}
	figcaption {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--micro-size);
	}
	.lbl,
	.note {
		opacity: var(--opacity-tertiary);
	}
	.tariff {
		max-width: 46ch;
		text-wrap: balance;
	}
	.key {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-1) var(--space-3);
	}
	.sw {
		display: inline-block;
		width: 0.75em;
		height: 0.75em;
		margin-right: 0.4em;
		background: currentColor;
		vertical-align: -0.05em;
	}
</style>
