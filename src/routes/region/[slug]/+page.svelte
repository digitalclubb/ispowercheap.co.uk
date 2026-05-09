<script lang="ts">
	import ActionChips from '$lib/components/ActionChips.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import StateShape from '$lib/components/StateShape.svelte';
	import Timestamps from '$lib/components/Timestamps.svelte';
	import { startPolling } from '$lib/livePolling.js';
	import { siblingLocations } from '$lib/locations.js';
	import { describeAnswer, faqJsonLd, locationJsonLd, ORIGIN } from '$lib/seo.js';
	import { STATE_HEADLINE, STATE_WORD } from '$lib/state.js';
	import { THEME_COLOR } from '$lib/theme.js';
	import type { NowAnswer } from '$lib/types.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let polledAnswer = $state<NowAnswer | null>(null);
	const answer = $derived(polledAnswer ?? data.answer);
	const location = $derived(data.location);

	$effect(() => {
		// Reset polled state when navigation lands us on a different region.
		data.answer.region.label;
		polledAnswer = null;
	});

	$effect(() => {
		const url = `/api/now?postcode=${encodeURIComponent(location.postcode)}`;
		return startPolling({
			url,
			onUpdate: (next) => {
				polledAnswer = next;
			},
		});
	});

	const canonicalUrl = $derived(`${ORIGIN}/region/${location.slug}`);
	const ogImage = $derived(`${ORIGIN}/og.png?postcode=${encodeURIComponent(location.postcode)}`);

	const question = $derived(`Is electricity cheap in ${location.name} right now?`);
	const description = $derived(describeAnswer(answer.state, location.name));

	const siblings = $derived(siblingLocations(location));

	const isStale = $derived.by(() => {
		if (!answer.current?.from) return false;
		const ageMs = Date.now() - new Date(answer.current.from).getTime();
		return ageMs > 45 * 60 * 1000;
	});
</script>

<svelte:head>
	<title>{question} — ispowercheap.co.uk</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
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
	<meta property="og:title" content={question} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={ogImage} />
	{@html `<script type="application/ld+json">${faqJsonLd({ question, answer: description, url: canonicalUrl })}</script>`}
	{@html `<script type="application/ld+json">${locationJsonLd({ location, url: canonicalUrl })}</script>`}
</svelte:head>

<main class={`state-${answer.state}`}>
	<section class="hero">
		<div class="shape" aria-hidden="true">
			<StateShape state={answer.state} />
		</div>
		<h1 class="answer" aria-live="polite">{STATE_WORD[answer.state]}</h1>
		<p class="supporting">
			{STATE_HEADLINE[answer.state]} <span class="dim">in {location.name}</span>
		</p>
		{#if answer.current}
			<p class="micro">
				{answer.current.forecast}&thinsp;gCO₂/kWh
			</p>
		{/if}
		<Timestamps current={answer.current} {isStale} />
		<p class="region-pill">
			{location.name} · DNO {location.dnoCode} · {location.dnoName}
		</p>
	</section>

	{#if answer.forecast.length}
		<section class="forecast" aria-labelledby="forecast-heading">
			<h2 id="forecast-heading" class="section-heading">next 24 hours</h2>
			<Sparkline points={answer.forecast} />
		</section>

		<section class="chips" aria-labelledby="chips-heading">
			<h2 id="chips-heading" class="section-heading">good time for…</h2>
			<ActionChips points={answer.forecast} />
		</section>
	{/if}

	<section class="copy" aria-labelledby="about-heading">
		<h2 id="about-heading" class="section-heading">about {location.name}</h2>
		<div class="copy-body">
			{#if location.kind === 'city'}
				<p>
					{location.name} draws its electricity from the
					<strong>{location.dnoName}</strong> distribution network — DNO region
					{location.dnoCode}. The answer above is the live carbon-intensity
					forecast for that region, published every half-hour by the National
					Energy System Operator. Households across {location.name} share the
					same regional grid, so the answer is the same whether you're in
					{location.postcode} or a few outcodes over.
				</p>
				<p>
					If you're on Octopus Agile, your half-hourly price tracks the same
					wholesale market that drives carbon intensity in {location.name}'s
					grid. For everyone else on a fixed-rate tariff, the answer is the
					honest "<em>is now a good time to use power</em>" signal — your
					bill won't change, but the grid is greener when wind and solar are
					doing the work.
				</p>
			{:else}
				<p>
					The {location.name} region — DNO {location.dnoCode}, served by
					<strong>{location.dnoName}</strong> — covers a substantial slice of
					Great Britain's grid. The live carbon-intensity forecast above is
					published every half-hour by the National Energy System Operator
					and applies to every postcode within the region.
				</p>
				<p>
					If you're on Octopus Agile, your half-hourly price tracks the same
					wholesale market driving these numbers. For everyone else on a
					fixed-rate tariff, the answer is the honest "<em>is now a good
					time to use power</em>" signal — your bill won't change, but the
					grid is greener when wind and solar are doing the work.
				</p>
			{/if}
		</div>
		{#if siblings.length}
			<p class="alt-regions">
				or check
				{#each siblings as sibling, i (sibling.slug)}
					{#if i > 0}<span aria-hidden="true">·</span>{/if}
					<a href={`/region/${sibling.slug}`}>{sibling.name}</a>
				{/each}
				<span aria-hidden="true">·</span>
				<a href="/region">all regions</a>
			</p>
		{/if}
	</section>

	<Footer />
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
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
		max-width: 36ch;
		text-wrap: balance;
	}
	.supporting .dim {
		opacity: 0.7;
	}
	.micro {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	.region-pill {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		margin: var(--space-3) 0 0 0;
		font-variant-numeric: tabular-nums;
	}

	.forecast,
	.chips,
	.copy {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding-block: var(--space-5);
		padding-inline: max(var(--space-3), env(safe-area-inset-left))
			max(var(--space-3), env(safe-area-inset-right));
	}
	.section-heading {
		font-size: var(--micro-size);
		font-weight: 500;
		opacity: var(--opacity-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0;
	}
	.copy-body {
		max-width: 60ch;
		font-size: var(--supporting-size);
		opacity: var(--opacity-secondary);
		text-align: left;
	}
	.copy-body p {
		margin: 0 0 var(--space-3) 0;
	}
	.copy-body p:last-child {
		margin-bottom: 0;
	}
	.alt-regions {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		margin: var(--space-3) 0 0 0;
		max-width: 60ch;
		text-wrap: balance;
	}
	.alt-regions a {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
	.alt-regions span {
		margin-inline: var(--space-2);
		opacity: var(--opacity-quaternary);
	}
</style>
