<script lang="ts">
	import { type ForecastExtremes, FORECAST_WINDOW_PERIODS } from '$lib/forecast.js';
	import { formatTimeWithDay } from '$lib/format.js';
	import type { CarbonIntensityPoint } from '$lib/types.js';

	// `now` is the moment the forecast was fetched (`answer.fetchedAt`) — used
	// only to tag a caption time with "tomorrow" when it crosses midnight.
	let {
		points,
		extremes,
		now,
	}: { points: CarbonIntensityPoint[]; extremes: ForecastExtremes | null; now: string } = $props();

	const VIEW_W = 100;
	const VIEW_H = 32;
	const MARKER_AREA = 4; // reserved at the top for ↓ / ↑ glyphs
	const BAR_AREA = VIEW_H - MARKER_AREA;

	const slice = $derived(points.slice(0, FORECAST_WINDOW_PERIODS)); // the same window `extremes` is computed over

	const max = $derived(slice.length ? Math.max(1, ...slice.map((p) => p.forecast)) : 1);

	// Which bars carry the ↓ / ↑ markers and the emphasis: the exact periods
	// the page picked as cheapest / peak (future-only — the half-hour already in
	// progress never wins). Keyed off the shared `extremes` so the chart, its
	// caption and the Outlook line above always match. −1 when there's no
	// meaningful contrast (flat forecast, or no upcoming data) — no marker then.
	const cheapestIdx = $derived.by(() => {
		if (!extremes) return -1;
		const from = extremes.cheapest.from;
		return slice.findIndex((p) => p.from === from);
	});
	const peakIdx = $derived.by(() => {
		if (!extremes) return -1;
		const from = extremes.peak.from;
		return slice.findIndex((p) => p.from === from);
	});
</script>

{#if slice.length}
	<figure class="sparkline">
		<svg
			class="chart"
			viewBox="0 0 {VIEW_W} {VIEW_H}"
			preserveAspectRatio="none"
			role="img"
			aria-label="next 24 hours forecast carbon intensity"
		>
			{#each slice as p, i (p.from)}
				{@const w = VIEW_W / slice.length - 0.15}
				{@const x = (i / slice.length) * VIEW_W}
				{@const h = (p.forecast / max) * BAR_AREA}
				{@const isCheap = i === cheapestIdx}
				{@const isPeak = i === peakIdx}
				<rect
					{x}
					y={VIEW_H - h}
					width={w}
					height={h}
					fill="currentColor"
					opacity={isCheap ? 1 : isPeak ? 0.7 : 0.32}
				/>
			{/each}
			<!-- Markers above the bars distinguish cheapest from peak even when
				 both fall at extreme heights — opacity alone isn't enough.
				 Pure SVG paths (not <text>) so they render identically across
				 platforms; <text> falls back to whatever fontconfig finds. -->
			{#if cheapestIdx >= 0}
				{@const cx = (cheapestIdx / slice.length) * VIEW_W + (VIEW_W / slice.length - 0.15) / 2}
				<path
					d={`M ${cx - 1.4} 0.6 L ${cx + 1.4} 0.6 L ${cx} 2.8 Z`}
					fill="currentColor"
				/>
			{/if}
			{#if peakIdx >= 0 && peakIdx !== cheapestIdx}
				{@const wx = (peakIdx / slice.length) * VIEW_W + (VIEW_W / slice.length - 0.15) / 2}
				<path
					d={`M ${wx - 1.2} 2.4 L ${wx + 1.2} 2.4 L ${wx} 0.6 Z`}
					fill="currentColor"
					opacity="0.7"
				/>
			{/if}
		</svg>
		{#if extremes}
			<figcaption>
				<span>
					cheapest <strong>{formatTimeWithDay(extremes.cheapest.from, now)}</strong>
					· {extremes.cheapest.forecast}&thinsp;g
				</span>
				<span class="sep" aria-hidden="true">·</span>
				<span>
					peak <strong>{formatTimeWithDay(extremes.peak.from, now)}</strong>
					· {extremes.peak.forecast}&thinsp;g
				</span>
			</figcaption>
		{/if}
	</figure>
{/if}

<style>
	.sparkline {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: min(100%, 520px);
		opacity: 0.92;
	}
	.chart {
		display: block;
		width: 100%;
		height: 72px;
	}
	figcaption {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
		font-variant-numeric: tabular-nums;
	}
	figcaption strong {
		font-weight: 600;
	}
	.sep {
		opacity: var(--opacity-quaternary);
	}
	@media (max-width: 360px) {
		figcaption {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 0;
		}
		.sep {
			display: none;
		}
	}
</style>
