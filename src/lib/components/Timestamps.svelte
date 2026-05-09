<script lang="ts">
	import { formatTime } from '$lib/format.js';
	import type { CarbonIntensityPoint } from '$lib/types.js';

	let { current, isStale }: { current: CarbonIntensityPoint | null; isStale: boolean } = $props();

	// `loadedAt` initialises with the SSR time so the server-rendered HTML
	// always carries a value; the $effect re-sets it on hydration so the
	// figure reflects the user's actual load time (not the edge cache's
	// snapshot age).
	let loadedAt = $state<string>(new Date().toISOString());
	$effect(() => {
		loadedAt = new Date().toISOString();
	});
</script>

<p class="timestamps" class:stale={isStale} role={isStale ? 'status' : undefined}>
	{#if isStale}<span>data may be stale — </span>{/if}
	{#if current}
		as of
		<time datetime={current.from}>{formatTime(current.from)}</time>
		<span class="sep" aria-hidden="true">·</span>
	{/if}
	loaded
	<time datetime={loadedAt}>{formatTime(loadedAt)}</time>
</p>

<style>
	.timestamps {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.timestamps.stale {
		opacity: var(--opacity-secondary);
		font-style: italic;
	}
	.sep {
		opacity: var(--opacity-quaternary);
		margin-inline: var(--space-1);
	}
</style>
