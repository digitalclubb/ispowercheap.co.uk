<script lang="ts">
	import { type AgileSnapshot, DNO_REGIONS } from '$lib/agile.js';

	interface Config {
		enabled: boolean;
		region: string;
	}

	const STORAGE_KEY = 'ispc:agile';

	let config = $state<Config | null>(null);
	let panelOpen = $state(false);
	let draftEnabled = $state(false);
	let draftRegion = $state('C');
	let snapshot = $state<AgileSnapshot | null>(null);
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		// Hydrate config once on mount (client-only; localStorage doesn't exist on the server).
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Config;
				if (parsed?.enabled && typeof parsed.region === 'string') {
					config = parsed;
					draftEnabled = parsed.enabled;
					draftRegion = parsed.region;
					void fetchPrice(parsed.region);
				}
			}
		} catch {
			// stored value was malformed; ignore
		}
	});

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

	function openPanel() {
		draftEnabled = config?.enabled ?? false;
		draftRegion = config?.region ?? 'C';
		panelOpen = true;
	}

	function applyConfig(event: SubmitEvent) {
		event.preventDefault();
		if (draftEnabled) {
			config = { enabled: true, region: draftRegion };
			localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
			void fetchPrice(draftRegion);
		} else {
			config = null;
			snapshot = null;
			localStorage.removeItem(STORAGE_KEY);
		}
		panelOpen = false;
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

<div class="agile-toggle">
	<button type="button" class="link" aria-expanded={panelOpen} onclick={openPanel}>
		{config?.enabled ? 'Agile settings' : "I'm on Octopus Agile"}
	</button>
	{#if panelOpen}
		<form class="panel" onsubmit={applyConfig}>
			<label class="row">
				<input type="checkbox" bind:checked={draftEnabled} />
				<span>show my Agile price</span>
			</label>
			<label class="row">
				<span>region</span>
				<select bind:value={draftRegion} disabled={!draftEnabled}>
					{#each DNO_REGIONS as r (r.code)}
						<option value={r.code}>{r.name}</option>
					{/each}
				</select>
			</label>
			<div class="row actions">
				<button type="submit">save</button>
				<button type="button" onclick={() => (panelOpen = false)}>cancel</button>
			</div>
		</form>
	{/if}
</div>

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
	.agile-toggle {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--micro-size);
		opacity: 0.85;
	}
	.link {
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
	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		border: 1px solid currentColor;
		border-radius: 6px;
		min-width: min(260px, 100%);
		background: var(--surface-faint);
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-2);
	}
	.row select {
		flex: 1;
		min-height: var(--touch-target);
		padding-inline: var(--space-2);
		border: 1px solid currentColor;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		font: inherit;
	}
	.row.actions {
		justify-content: flex-end;
	}
	.row.actions button {
		min-height: var(--touch-target);
		padding-inline: var(--space-3);
		border: 1px solid currentColor;
		border-radius: 4px;
	}
</style>
