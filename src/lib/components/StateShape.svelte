<script lang="ts">
	import type { StateKey } from '$lib/types.js';

	let { state }: { state: StateKey } = $props();
</script>

<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
	{#if state === 'yes'}
		<circle cx="40" cy="40" r="32" fill="currentColor" />
	{:else if state === 'sortof'}
		<polygon points="40,12 72,68 8,68" fill="currentColor" />
	{:else if state === 'no'}
		<polygon
			points="26,8 54,8 72,26 72,54 54,72 26,72 8,54 8,26"
			fill="currentColor"
		/>
	{:else}
		<rect x="12" y="12" width="56" height="56" fill="currentColor" />
	{/if}
</svg>

<style>
	svg {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
