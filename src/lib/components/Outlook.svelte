<script lang="ts">
	import type { ForecastExtremes } from '$lib/forecast.js';
	import { formatTimeWithDay } from '$lib/format.js';

	// `extremes`: cheapest / peak among the upcoming periods — computed by the
	// page (over the next 24 h, future-only) and shared with the forecast chart,
	// so the chart's ↓/↑ markers, its caption and this line can never disagree.
	// Null when there's no useful contrast (flat forecast, or no upstream data).
	// `now`: the moment the forecast was fetched (`answer.fetchedAt`) — used only
	// to decide whether a time needs a "tomorrow" tag.
	let { extremes, now }: { extremes: ForecastExtremes | null; now: string } = $props();
</script>

{#if extremes}
	<p class="outlook">
		cheapest
		<time datetime={extremes.cheapest.from}>{formatTimeWithDay(extremes.cheapest.from, now)}</time>
		<span class="value">({extremes.cheapest.forecast}&thinsp;g)</span>
		<span class="sep" aria-hidden="true">·</span>
		peak
		<time datetime={extremes.peak.from}>{formatTimeWithDay(extremes.peak.from, now)}</time>
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
