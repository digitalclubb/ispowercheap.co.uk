<script lang="ts">
	import { CHIPS, chipVerdict } from '$lib/chips.js';
	import { FORECAST_WINDOW_PERIODS } from '$lib/forecast.js';
	import { formatTimeWithDay } from '$lib/format.js';
	import type { CarbonIntensityPoint } from '$lib/types.js';

	// Same 24 h window as the chart, so a chip never names a time the chart doesn't show.
	let { points, now }: { points: CarbonIntensityPoint[]; now: string } = $props();
	const next24 = $derived(points.slice(0, FORECAST_WINDOW_PERIODS));
</script>

<ul class="chips">
	{#each CHIPS as chip (chip.id)}
		{@const verdict = chipVerdict(next24, chip.slots)}
		<li class="chip" data-state={verdict?.kind ?? 'unknown'}>
			<span class="dot" aria-hidden="true">
				{#if verdict?.kind === 'good-now'}●{:else if verdict?.kind === 'good-later'}○{:else}—{/if}
			</span>
			<span class="label">{chip.label}</span>
			<span class="hint">
				{#if verdict?.kind === 'good-now'}
					good time now
				{:else if verdict?.kind === 'good-later'}
					cheapest from {formatTimeWithDay(verdict.startISO, now)}
				{:else if verdict?.kind === 'no-good-window'}
					{#if verdict.startISO === next24[0]?.from}
						least bad now
					{:else}
						least bad from {formatTimeWithDay(verdict.startISO, now)}
					{/if}
				{:else}
					—
				{/if}
			</span>
		</li>
	{/each}
</ul>

<style>
	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: var(--space-1) var(--space-4);
		width: min(100%, 720px);
	}
	.chip {
		display: grid;
		grid-template-columns: 1.4em 1fr auto;
		align-items: baseline;
		gap: var(--space-2);
		padding: var(--space-2) 0;
		/* border-bottom on every chip — closes both columns of the auto-fit
		 * grid symmetrically (a `:last-child` rule would create an
		 * asymmetric short-column on odd chip counts). */
		border-bottom: 1px solid var(--surface-soft);
		font-size: var(--micro-size);
		font-variant-numeric: tabular-nums;
	}
	.chip[data-state='good-now'] {
		opacity: 1;
		font-weight: 600;
	}
	.chip[data-state='good-later'] {
		opacity: 0.85;
	}
	.chip[data-state='no-good-window'],
	.chip[data-state='unknown'] {
		opacity: 0.55;
	}
	.dot {
		font-size: 1.1em;
		text-align: center;
		line-height: 1;
	}
	.label {
		text-align: left;
	}
	.hint {
		text-align: right;
		opacity: 0.85;
	}
	@media (max-width: 480px) {
		.chip {
			grid-template-columns: 1.4em 1fr;
		}
		.hint {
			grid-column: 2;
			text-align: left;
			opacity: 0.7;
		}
	}
</style>
