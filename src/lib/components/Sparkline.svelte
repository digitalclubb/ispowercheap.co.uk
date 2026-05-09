<script lang="ts">
	import { formatTime } from '$lib/format.js';
	import type { CarbonIntensityPoint } from '$lib/types.js';

	let { points }: { points: CarbonIntensityPoint[] } = $props();

	const VIEW_W = 100;
	const VIEW_H = 32;
	const MARKER_AREA = 4; // reserved at the top for ↓ / ↑ glyphs
	const BAR_AREA = VIEW_H - MARKER_AREA;

	const slice = $derived(points.slice(0, 48)); // first 24 hours

	const max = $derived(slice.length ? Math.max(1, ...slice.map((p) => p.forecast)) : 1);

	const cheapest = $derived.by(() => {
		if (!slice.length) return -1;
		let idx = 0;
		for (let i = 1; i < slice.length; i++) {
			if (slice[i].forecast < slice[idx].forecast) idx = i;
		}
		return idx;
	});

	const worst = $derived.by(() => {
		if (!slice.length) return -1;
		let idx = 0;
		for (let i = 1; i < slice.length; i++) {
			if (slice[i].forecast > slice[idx].forecast) idx = i;
		}
		return idx;
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
				{@const isCheap = i === cheapest}
				{@const isWorst = i === worst}
				<rect
					{x}
					y={VIEW_H - h}
					width={w}
					height={h}
					fill="currentColor"
					opacity={isCheap ? 1 : isWorst ? 0.7 : 0.32}
				/>
			{/each}
			<!-- Markers above the bars distinguish cheapest from worst even when
				 both fall at extreme heights — opacity alone isn't enough.
				 Pure SVG paths (not <text>) so they render identically across
				 platforms; <text> falls back to whatever fontconfig finds. -->
			{#if cheapest >= 0}
				{@const cx = (cheapest / slice.length) * VIEW_W + (VIEW_W / slice.length - 0.15) / 2}
				<path
					d={`M ${cx - 1.4} 0.6 L ${cx + 1.4} 0.6 L ${cx} 2.8 Z`}
					fill="currentColor"
				/>
			{/if}
			{#if worst >= 0 && worst !== cheapest}
				{@const wx = (worst / slice.length) * VIEW_W + (VIEW_W / slice.length - 0.15) / 2}
				<path
					d={`M ${wx - 1.2} 2.4 L ${wx + 1.2} 2.4 L ${wx} 0.6 Z`}
					fill="currentColor"
					opacity="0.7"
				/>
			{/if}
		</svg>
		<figcaption>
			<span>
				cheapest <strong>{formatTime(slice[cheapest].from)}</strong>
				· {slice[cheapest].forecast}&thinsp;g
			</span>
			<span class="sep" aria-hidden="true">·</span>
			<span>
				worst <strong>{formatTime(slice[worst].from)}</strong>
				· {slice[worst].forecast}&thinsp;g
			</span>
		</figcaption>
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
