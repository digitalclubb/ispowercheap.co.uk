<script lang="ts">
	import { formatTime } from '$lib/format.js';
	import { findUpcomingExtremes } from '$lib/forecast.js';
	import type { CarbonIntensityPoint } from '$lib/types.js';

	let { forecast }: { forecast: ReadonlyArray<CarbonIntensityPoint> } = $props();

	// Recomputes whenever `forecast` changes (i.e. when polling ships fresh data),
	// reading `Date.now()` each time so "upcoming" stays accurate as the day moves.
	const extremes = $derived(findUpcomingExtremes(forecast, Date.now()));
</script>

{#if extremes}
	<p class="outlook">
		cheapest
		<time datetime={extremes.cheapest.from}>{formatTime(extremes.cheapest.from)}</time>
		<span class="value">({extremes.cheapest.forecast}&thinsp;g)</span>
		<span class="sep" aria-hidden="true">·</span>
		peak
		<time datetime={extremes.peak.from}>{formatTime(extremes.peak.from)}</time>
		<span class="value">({extremes.peak.forecast}&thinsp;g)</span>
	</p>
{/if}

<style>
	.outlook {
		font-size: var(--micro-size);
		opacity: var(--opacity-secondary);
		margin: 0;
		font-variant-numeric: tabular-nums;
		text-wrap: balance;
		max-width: 40ch;
	}
	.value {
		opacity: 0.7;
	}
	.sep {
		opacity: var(--opacity-quaternary);
		margin-inline: var(--space-1);
	}
</style>
