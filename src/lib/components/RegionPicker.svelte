<script lang="ts">
	import { goto } from '$app/navigation';
	import { normalizeOutcode } from '$lib/postcode.js';
	import type { RegionInfo } from '$lib/types.js';

	let { region }: { region: RegionInfo } = $props();

	let open = $state(false);
	let postcode = $state('');
	let busy = $state(false);
	let error = $state('');

	async function useMyLocation(event: Event) {
		event.preventDefault();
		if (!('geolocation' in navigator)) {
			error = 'geolocation unavailable in this browser';
			return;
		}
		busy = true;
		error = '';
		try {
			const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					timeout: 10_000,
					maximumAge: 60_000,
				});
			});
			// Truncate to 3 decimal places (~110 m) before sending to a third
			// party. Postcode resolution doesn't need centimetre precision; the
			// extra decimals are pure over-disclosure of the user's location.
			const lat = Math.round(pos.coords.latitude * 1000) / 1000;
			const lon = Math.round(pos.coords.longitude * 1000) / 1000;
			const res = await fetch(`https://api.postcodes.io/postcodes?lat=${lat}&lon=${lon}`, {
				signal: AbortSignal.timeout(8_000),
			});
			if (!res.ok) throw new Error(`reverse geocode failed: ${res.status}`);
			const json = (await res.json()) as { result?: Array<{ outcode?: string }> };
			const outcode = normalizeOutcode(json.result?.[0]?.outcode);
			if (!outcode) {
				error = "couldn't find a UK postcode for your location";
				return;
			}
			await goto(`/?postcode=${encodeURIComponent(outcode)}`, { invalidateAll: true });
			open = false;
		} catch {
			error = 'location unavailable';
		} finally {
			busy = false;
		}
	}

	function handleSubmit(event: SubmitEvent) {
		const outcode = normalizeOutcode(postcode);
		if (!outcode) {
			event.preventDefault();
			error = 'enter a UK outward postcode (e.g. SW1A, M1, RG41)';
			return;
		}
		// Let the native form submit do the navigation — works without JS.
		// We just clean the value first.
		postcode = outcode;
	}
</script>

<div class="region">
	<span class="label">{region.label}</span>
	<button
		type="button"
		class="toggle"
		aria-expanded={open}
		aria-controls="region-panel"
		onclick={() => {
			open = !open;
			error = '';
		}}
	>
		{open ? 'close' : 'change'}
	</button>

	{#if open}
		<div id="region-panel" class="panel">
			<button type="button" class="locate" onclick={useMyLocation} disabled={busy}>
				{busy ? 'finding…' : 'use my location'}
			</button>
			<form action="/" method="GET" onsubmit={handleSubmit}>
				<label class="postcode">
					<span class="visually-hidden">postcode</span>
					<input
						name="postcode"
						bind:value={postcode}
						placeholder="postcode (e.g. SW1A)"
						autocomplete="postal-code"
						maxlength="8"
						required
					/>
				</label>
				<button type="submit">set</button>
			</form>
			{#if error}
				<p class="error" role="alert">{error}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.region {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--micro-size);
		opacity: 0.85;
		max-width: min(100%, 32rem);
	}
	.label {
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
		text-align: center;
	}
	.toggle {
		text-decoration: underline;
		text-underline-offset: 0.25em;
		opacity: 0.7;
		min-height: var(--touch-target);
		padding-inline: var(--space-3);
		display: inline-flex;
		align-items: center;
	}
	.toggle:hover,
	.toggle:focus-visible {
		opacity: 1;
	}
	.panel {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--space-2);
		min-width: min(260px, 100%);
		padding: var(--space-3);
		border: 1px solid currentColor;
		border-radius: 6px;
		background: var(--surface-faint);
	}
	.locate {
		min-height: var(--touch-target);
		padding-inline: var(--space-3);
		border: 1px solid currentColor;
		border-radius: 4px;
		opacity: 0.9;
	}
	.locate:hover,
	.locate:focus-visible {
		opacity: 1;
	}
	.locate:disabled {
		cursor: progress;
		opacity: 0.5;
	}
	form {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.postcode {
		flex: 1 1 8rem;
		min-width: 0;
	}
	.postcode input {
		width: 100%;
		min-height: var(--touch-target);
		padding-inline: var(--space-2);
		border: 1px solid currentColor;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		font: inherit;
		text-transform: uppercase;
	}
	.postcode input::placeholder {
		color: inherit;
		opacity: var(--opacity-tertiary);
		text-transform: none;
	}
	form button[type='submit'] {
		min-height: var(--touch-target);
		padding-inline: var(--space-3);
		border: 1px solid currentColor;
		border-radius: 4px;
	}
	.error {
		margin: 0;
		font-size: 12px;
		opacity: 0.85;
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
</style>
