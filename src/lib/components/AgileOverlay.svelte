<script lang="ts">
	import { type AgileSnapshot, DNO_REGIONS } from '$lib/agile.js';

	interface Config {
		enabled: boolean;
		region: string;
	}

	/**
	 * DNO code derived from the page's region (Carbon Intensity regionid →
	 * DNO map). Carries the user's location automatically — no second
	 * region picker. Absent when the page is on the national fallback (no
	 * postcode resolved); in that case the toggle is disabled with a hint
	 * pointing the user back to the main "change" region picker.
	 */
	let { dnoCode }: { dnoCode?: string } = $props();

	const STORAGE_KEY = 'ispc:agile';

	let config = $state<Config | null>(null);
	let snapshot = $state<AgileSnapshot | null>(null);
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		// Hydrate config once on mount (client-only).
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Config;
				if (parsed?.enabled && typeof parsed.region === 'string') {
					config = parsed;
					void fetchPrice(parsed.region);
				}
			}
		} catch {
			// stored value malformed; ignore
		}
	});

	// Note: we deliberately do NOT auto-track `dnoCode` after enable. An
	// Octopus Agile customer's meter is in one fixed DNO; if they enabled
	// in London then navigate to /region/manchester to browse, they should
	// keep seeing London's prices (their meter, their price). To change the
	// saved Agile region, the user disables here, sets the correct region
	// via the main RegionPicker, then re-enables.

	async function fetchPrice(region: string) {
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/agile?region=${encodeURIComponent(region)}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			snapshot = (await res.json()) as AgileSnapshot;
			if (!snapshot.current) error = 'no current price published';
		} catch {
			error = 'price unavailable';
			snapshot = null;
		} finally {
			loading = false;
		}
	}

	function toggleEnabled() {
		if (config?.enabled) {
			config = null;
			snapshot = null;
			error = '';
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch {
				// ignore
			}
			return;
		}
		if (!dnoCode) return; // disabled state — no-op
		config = { enabled: true, region: dnoCode };
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
		} catch {
			// private mode — settings won't persist
		}
		void fetchPrice(dnoCode);
	}

	function regionName(code: string): string {
		return DNO_REGIONS.find((r) => r.code === code)?.name ?? code;
	}
</script>

{#if config?.enabled && snapshot?.current}
	<p class="price">
		<strong>{snapshot.current.value_inc_vat.toFixed(2)}</strong>
		<span class="unit">p/kWh</span>
		<span class="region">on Agile · {regionName(config.region)}</span>
	</p>
{:else if config?.enabled && loading}
	<p class="price loading" aria-live="polite" aria-busy="true">
		<span class="visually-hidden">loading Agile price</span>
		<span class="skeleton skeleton-figure" aria-hidden="true"></span>
		<span class="skeleton skeleton-region" aria-hidden="true"></span>
	</p>
{:else if config?.enabled && error}
	<p class="price error">{error}</p>
{/if}

<button
	type="button"
	class="link"
	onclick={toggleEnabled}
	disabled={!config?.enabled && !dnoCode}
	aria-pressed={config?.enabled ?? false}
>
	{#if config?.enabled}
		stop showing Agile price
	{:else if dnoCode}
		I'm on Octopus Agile
	{:else}
		set your region to enable Agile
	{/if}
</button>

<style>
	.price {
		margin: 0;
		font-size: var(--supporting-size);
		font-variant-numeric: tabular-nums;
	}
	.price strong {
		font-weight: 700;
		font-size: 1.4em;
	}
	.price .unit {
		opacity: 0.7;
	}
	.price .region {
		display: block;
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		margin-top: var(--space-1);
	}
	.price.loading {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}
	.price.error {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
	}
	.skeleton {
		display: block;
		background: var(--surface-soft);
		border-radius: 4px;
		animation: skeleton-pulse 1.6s ease-in-out infinite;
	}
	.skeleton-figure {
		width: 5ch;
		height: 1.6em;
	}
	.skeleton-region {
		width: 12ch;
		height: 0.9em;
		opacity: 0.7;
	}
	@keyframes skeleton-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}

	.link {
		font-size: var(--micro-size);
		text-decoration: underline;
		text-underline-offset: 0.25em;
		opacity: 0.7;
		min-height: var(--touch-target);
		padding-inline: var(--space-3);
		display: inline-flex;
		align-items: center;
	}
	.link:hover,
	.link:focus-visible {
		opacity: 1;
	}
	.link:disabled {
		cursor: default;
		opacity: 0.4;
		text-decoration: none;
	}
</style>
