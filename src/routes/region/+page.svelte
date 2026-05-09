<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import { CITY_LOCATIONS, REGION_LOCATIONS } from '$lib/locations.js';
	import { itemListJsonLd, ORIGIN } from '$lib/seo.js';

	const canonicalUrl = `${ORIGIN}/region`;
	const allLocationItems = [...REGION_LOCATIONS, ...CITY_LOCATIONS].map((l) => ({
		name: l.name,
		url: `${ORIGIN}/region/${l.slug}`,
	}));
</script>

<svelte:head>
	<title>UK regions — ispowercheap.co.uk</title>
	<meta
		name="description"
		content="Live electricity-cost answer for every UK power region. Pick yours: London, Birmingham, Manchester, all 14 DNO regions, 30+ cities."
	/>
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content="UK regions — ispowercheap.co.uk" />
	<meta property="og:description" content="Live electricity-cost answer for every UK power region." />
	<meta property="og:image" content={`${ORIGIN}/og.png`} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content="website" />
	{@html `<script type="application/ld+json">${itemListJsonLd({ url: canonicalUrl, items: allLocationItems })}</script>`}
</svelte:head>

<main>
	<header class="hero">
		<h1>by region</h1>
		<p class="supporting">
			pick your part of the UK for a live, regionally-resolved answer.
		</p>
	</header>

	<section class="group" aria-labelledby="dno-heading">
		<h2 id="dno-heading" class="section-heading">all 14 power regions</h2>
		<ul class="grid">
			{#each REGION_LOCATIONS as l (l.slug)}
				<li>
					<a href={`/region/${l.slug}`}>
						{l.name} <span class="dno">DNO {l.dnoCode}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section class="group" aria-labelledby="cities-heading">
		<h2 id="cities-heading" class="section-heading">cities</h2>
		<ul class="grid">
			{#each CITY_LOCATIONS as l (l.slug)}
				<li>
					<a href={`/region/${l.slug}`}>{l.name}</a>
				</li>
			{/each}
		</ul>
	</section>

	<Footer />
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		background: var(--state-unknown-bg);
		color: var(--state-unknown-fg);
	}
	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: var(--space-3);
		padding: var(--space-6) var(--space-3);
	}
	h1 {
		font-family: var(--font-headline);
		font-weight: 900;
		font-size: clamp(56px, 12vw, 140px);
		letter-spacing: -0.04em;
		line-height: 0.95;
		margin: 0;
	}
	.supporting {
		font-size: var(--supporting-size);
		opacity: var(--opacity-secondary);
		margin: 0;
		max-width: 36ch;
		text-wrap: balance;
	}
	.group {
		width: 100%;
		max-width: 720px;
		margin: 0 auto;
		padding: var(--space-5)
			max(var(--space-3), env(safe-area-inset-right))
			var(--space-5)
			max(var(--space-3), env(safe-area-inset-left));
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.section-heading {
		font-size: var(--micro-size);
		font-weight: 500;
		opacity: var(--opacity-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0;
	}
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-2) var(--space-4);
	}
	.grid li {
		font-size: var(--supporting-size);
	}
	.grid a {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-2);
		min-height: var(--touch-target);
		padding-block: var(--space-2);
		text-decoration: none;
		border-bottom: 1px solid var(--surface-soft);
		width: 100%;
	}
	.grid a:hover,
	.grid a:focus-visible {
		opacity: 1;
	}
	.dno {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		font-variant-numeric: tabular-nums;
	}
</style>
