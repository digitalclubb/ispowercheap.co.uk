<script lang="ts">
	import { page } from '$app/state';
	import ActionChips from '$lib/components/ActionChips.svelte';
	import AgileOverlay from '$lib/components/AgileOverlay.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Outlook from '$lib/components/Outlook.svelte';
	import RegionPicker from '$lib/components/RegionPicker.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import StateShape from '$lib/components/StateShape.svelte';
	import Timestamps from '$lib/components/Timestamps.svelte';
	import { upcomingExtremes } from '$lib/forecast.js';
	import { startPolling } from '$lib/livePolling.js';
	import { describeAnswer, faqJsonLd, ORIGIN, websiteJsonLd } from '$lib/seo.js';
	import { refineRegionSilently } from '$lib/silentGeo.js';
	import { STATE_HEADLINE, STATE_WORD } from '$lib/state.js';
	import { THEME_COLOR } from '$lib/theme.js';
	import type { NowAnswer } from '$lib/types.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// Live-polled answer overrides the SSR'd one when present. We reset it to
	// null on navigation so a region change doesn't keep showing stale data
	// from the previous URL.
	let polledAnswer = $state<NowAnswer | null>(null);
	const answer = $derived(polledAnswer ?? data.answer);

	$effect(() => {
		// Touch the SSR answer's region label to subscribe — when navigation
		// re-runs the load function with a new region, this clears the poll.
		data.answer.region.label;
		polledAnswer = null;
	});

	// Stale-data warning: Carbon Intensity publishes every 30 min, so a settlement
	// period older than 45 min suggests the upstream feed has stalled. We only
	// flag stale when we actually have a data point — a null `current` is
	// already covered by the UNKNOWN state's "we don't know right now" line.
	const isStale = $derived.by(() => {
		if (!answer.current?.from) return false;
		const ageMs = Date.now() - new Date(answer.current.from).getTime();
		return ageMs > 45 * 60 * 1000;
	});

	// Cheapest / peak in the next 24 hours, computed once and handed to both
	// Outlook and Sparkline so the headline readout, the chart caption and its
	// ↓/↑ markers all agree. Future-only: the half-hour already underway never
	// wins — you can't "wait for" it. Anchored to `fetchedAt` rather than
	// Date.now() so the server render and the client hydrate agree (no flicker
	// at a settlement-period boundary); it advances each time polling ships
	// fresh data.
	const upcoming = $derived(upcomingExtremes(answer.forecast, Date.parse(answer.fetchedAt)));

	// Live polling: refresh /api/now every 5 minutes while the tab is visible.
	// State changes cross-fade automatically via the `main` element's CSS
	// transition on `background-color`/`color`.
	$effect(() => {
		const params = new URLSearchParams();
		const postcode = answer.region.postcode;
		if (postcode) params.set('postcode', postcode);
		const url = `/api/now${params.size ? `?${params.toString()}` : ''}`;
		return startPolling({
			url,
			onUpdate: (next) => {
				polledAnswer = next;
			},
		});
	});

	// Silent geolocation refinement (best practice — no auto-prompt). Runs once
	// on hydration; only acts if the user has previously granted geolocation
	// permission for this origin. Only on the home page when no explicit
	// `?postcode=` is set — we never override the user's deliberate choice.
	$effect(() => {
		const hasExplicitPostcode = page.url.searchParams.has('postcode');
		if (hasExplicitPostcode) return;
		void refineRegionSilently(answer.region.postcode);
	});

	// Periodic Background Sync — supported in Chromium-only PWA contexts. We
	// register opportunistically; permission is granted by the browser based on
	// site engagement, so most users won't see it. Where it works, the SW
	// refreshes /api/now in the background every 30 minutes so the home-screen
	// icon's launcher answer stays fresh between visits.
	$effect(() => {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
		void navigator.serviceWorker.ready
			.then(async (registration) => {
				const reg = registration as ServiceWorkerRegistration & {
					periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
				};
				if (!reg.periodicSync) return;
				try {
					const status = await navigator.permissions.query({
						name: 'periodic-background-sync' as PermissionName,
					});
					if (status.state !== 'granted') return;
					await reg.periodicSync.register('refresh-now', { minInterval: 30 * 60 * 1000 });
				} catch {
					// Permission API can throw on unknown names in some browsers; treat as unsupported.
				}
			})
			.catch(() => undefined);
	});
</script>

<svelte:head>
	<title>
		{STATE_WORD[answer.state]}, {STATE_HEADLINE[answer.state]} — ispowercheap.co.uk
	</title>
	<meta name="description" content={describeAnswer(answer.state)} />
	<link rel="canonical" href={`${ORIGIN}/`} />
	<meta
		name="theme-color"
		media="(prefers-color-scheme: light)"
		content={THEME_COLOR[answer.state].light}
	/>
	<meta
		name="theme-color"
		media="(prefers-color-scheme: dark)"
		content={THEME_COLOR[answer.state].dark}
	/>
	<meta property="og:title" content="Is electricity cheap right now? — ispowercheap.co.uk" />
	<meta property="og:description" content={describeAnswer(answer.state)} />
	<meta property="og:image" content={`${ORIGIN}/og.png`} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={`${ORIGIN}/`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={`${ORIGIN}/og.png`} />
	{@html `<script type="application/ld+json">${faqJsonLd({
		question: 'Is electricity cheap right now in the UK?',
		answer: describeAnswer(answer.state),
		url: `${ORIGIN}/`,
	})}</script>`}
	{@html `<script type="application/ld+json">${websiteJsonLd()}</script>`}
</svelte:head>

<main class={`state-${answer.state}`}>
	<section class="hero">
		<div class="shape" aria-hidden="true">
			<StateShape state={answer.state} />
		</div>
		<h1 class="answer" aria-live="polite">{STATE_WORD[answer.state]}</h1>
		<p class="supporting">{STATE_HEADLINE[answer.state]}</p>
		{#if answer.current}
			<p class="micro">
				{answer.current.forecast}&thinsp;gCO₂/kWh
			</p>
		{/if}
		<Outlook extremes={upcoming} now={answer.fetchedAt} />
		<Timestamps current={answer.current} {isStale} />
		<div class="agile-wrap">
			<AgileOverlay dnoCode={answer.region.dnoCode} />
		</div>
		<div class="region-wrap">
			<RegionPicker region={answer.region} />
		</div>
	</section>

	{#if answer.forecast.length}
		<section class="forecast" aria-labelledby="forecast-heading">
			<h2 id="forecast-heading" class="section-heading">next 24 hours</h2>
			<Sparkline points={answer.forecast} extremes={upcoming} now={answer.fetchedAt} />
		</section>

		<section class="chips" aria-labelledby="chips-heading">
			<h2 id="chips-heading" class="section-heading">good time for…</h2>
			<ActionChips points={answer.forecast} />
		</section>
	{/if}

	<Footer />
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		/* ease-out cubic-bezier — natural deceleration for state colour swaps;
		 * ease (linear-ish in/out) feels mechanical on full-viewport bg changes. */
		transition:
			background-color 220ms cubic-bezier(0.16, 1, 0.3, 1),
			color 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	main.state-yes {
		background: var(--state-yes-bg);
		color: var(--state-yes-fg);
	}
	main.state-sortof {
		background: var(--state-sortof-bg);
		color: var(--state-sortof-fg);
	}
	main.state-no {
		background: var(--state-no-bg);
		color: var(--state-no-fg);
	}
	main.state-unknown {
		background: var(--state-unknown-bg);
		color: var(--state-unknown-fg);
	}

	.hero {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding-block: var(--space-3);
		padding-inline: max(var(--space-3), env(safe-area-inset-left))
			max(var(--space-3), env(safe-area-inset-right));
		width: 100%;
	}

	.shape {
		width: clamp(48px, 8vw, 72px);
		height: clamp(48px, 8vw, 72px);
		opacity: var(--opacity-tertiary);
	}

	.answer {
		font-family: var(--font-headline);
		font-weight: 900;
		font-size: var(--headline-size);
		margin: 0;
		letter-spacing: -0.04em;
		line-height: 0.95;
	}
	.supporting {
		font-size: var(--supporting-size);
		opacity: var(--opacity-secondary);
		margin: 0;
		max-width: 32ch;
		text-wrap: balance;
	}
	.micro {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.agile-wrap {
		margin-top: var(--space-2);
	}
	.region-wrap {
		margin-top: var(--space-3);
	}

	.forecast,
	.chips {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding-block: var(--space-5);
		padding-inline: max(var(--space-3), env(safe-area-inset-left))
			max(var(--space-3), env(safe-area-inset-right));
	}
	.chips {
		padding-bottom: var(--space-6);
	}
	.section-heading {
		font-size: var(--micro-size);
		font-weight: 500;
		opacity: var(--opacity-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0;
	}
</style>
