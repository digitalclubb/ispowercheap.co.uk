<script lang="ts">
	import { type BestWindow, cheapSpell, describeWindow } from '#lib/forecast.js';
	import { formatTimeWithDay } from '#lib/format.js';
	import type { CarbonIntensityPoint } from '#lib/types.js';

	// Two plain answers under the headline: how long the current state lasts,
	// and the cheapest stretch ahead (the same one the chart highlights).
	let {
		points,
		best,
		now,
	}: { points: CarbonIntensityPoint[]; best: BestWindow | null; now: string } = $props();

	const spell = $derived(cheapSpell(points));
</script>

{#if spell}
	<p class="outlook">
		{#if spell.kind === 'until'}
			cheap until <strong>{formatTimeWithDay(spell.at, now)}</strong>
		{:else if spell.kind === 'all-day'}
			cheap for the next 24 hours
		{:else}
			next cheap from <strong>{formatTimeWithDay(spell.at, now)}</strong>
		{/if}
	</p>
{/if}
{#if best}
	<p class="outlook">
		{#if best.startIdx === 0}
			now is the cheapest it gets in the next 24 hours
		{:else}
			cheapest in the next 24 hours: <strong>{describeWindow(best, now)}</strong>
		{/if}
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
	strong {
		font-weight: 600;
	}
</style>
