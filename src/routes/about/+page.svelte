<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import { ORIGIN } from '$lib/seo.js';

	const canonicalUrl = `${ORIGIN}/about`;
</script>

<svelte:head>
	<title>About — ispowercheap.co.uk</title>
	<meta
		name="description"
		content="How ispowercheap.co.uk works: live UK grid carbon intensity from the National Energy System Operator, mapped to a plain-English answer."
	/>
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:title" content="About — ispowercheap.co.uk" />
	<meta property="og:description" content="How ispowercheap.co.uk works." />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content="article" />
</svelte:head>

<main>
	<article class="prose">
		<header>
			<p class="back"><a href="/">← back</a></p>
			<h1>about</h1>
			<p class="lede">
				A live, plain-English answer to whether electricity is cheap right
				now in the UK.
			</p>
		</header>

		<section>
			<h2>what the answer means</h2>
			<p>
				Most UK households pay a fixed unit rate, so "is electricity cheap?"
				can't be answered honestly in pence per kilowatt-hour — your bill is
				the same at 3am or 6pm. The honest signal for everyone is
				<strong>carbon intensity</strong>: how much CO₂ each kilowatt-hour
				generates right now. When wind and solar are doing the work, the
				grid is greener and (over time) wholesale prices push fixed rates
				down. So we say "<em>yes, it's cheap</em>" when carbon intensity is
				in the low band — a good time to put the dishwasher on or charge
				the EV.
			</p>
			<p>
				If you're on Octopus Agile, your half-hourly price tracks the same
				wholesale market. You can opt in via the toggle on the home page to
				see your actual p/kWh inline.
			</p>
		</section>

		<section>
			<h2>methodology</h2>
			<ul>
				<li>
					Live carbon intensity from the
					<a href="https://carbonintensity.org.uk" rel="noopener noreferrer">
						Carbon Intensity API
					</a>
					— published every half-hour by the
					<strong>National Energy System Operator</strong> with EDF, the
					University of Oxford and WWF.
				</li>
				<li>
					State derivation maps the API's <code>index</code> field directly:
					<code>very low / low → YES</code>,
					<code>moderate → SORT OF</code>,
					<code>high / very high → NO</code>. We don't compute our own band
					— the API's national distribution is more authoritative.
				</li>
				<li>
					Regional answers use the API's outward-postcode endpoint
					(e.g. <code>SW1A</code>, <code>M1</code>). Region detection on the
					home page uses Vercel edge geo headers; you can override via the
					"change" link.
				</li>
				<li>
					Action chips ("good time for dishwasher / EV / dryer") scan the
					next 48 hours of forecast for a contiguous window of the
					appropriate duration where the majority of half-hours classify
					as low or very low.
				</li>
			</ul>
		</section>

		<section>
			<h2>data sources &amp; attribution</h2>
			<ul>
				<li>
					<a href="https://carbonintensity.org.uk" rel="noopener noreferrer">
						Carbon Intensity API
					</a> — National Energy System Operator, EDF, University of Oxford, WWF (CC BY 4.0).
				</li>
				<li>
					<a href="https://octopus.energy" rel="noopener noreferrer">Octopus Energy</a> — Agile tariff rates (free public API).
				</li>
				<li>
					<a href="https://postcodes.io" rel="noopener noreferrer">postcodes.io</a> — UK postcode → outcode reverse geocoding.
				</li>
			</ul>
		</section>

		<section>
			<h2>JSON API</h2>
			<p>
				The same data the page renders is available as JSON. Free, CORS-enabled,
				cached at the edge:
			</p>
			<pre><code>GET <a href="/api/now">https://ispowercheap.co.uk/api/now</a>
GET <a href="/api/now?postcode=SW1A">https://ispowercheap.co.uk/api/now?postcode=SW1A</a></code></pre>
			<p>
				Please attribute as above when you build on top of it.
			</p>
		</section>

		<section>
			<h2>privacy</h2>
			<p>
				No accounts, no tracking, no analytics, no cookie banner. Region detection
				uses the IP-derived header Vercel adds at the edge — never stored. If you
				opt in to the postcode lookup via your browser, your latitude/longitude
				is truncated to ~110 m before being sent to postcodes.io.
			</p>
		</section>
	</article>

	<Footer />
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--state-unknown-bg);
		color: var(--state-unknown-fg);
	}
	.prose {
		max-width: 64ch;
		margin: 0 auto;
		padding: var(--space-5)
			max(var(--space-3), env(safe-area-inset-right))
			var(--space-5)
			max(var(--space-3), env(safe-area-inset-left));
		font-size: var(--supporting-size);
		line-height: 1.55;
	}
	.prose header {
		margin-bottom: var(--space-5);
	}
	.back a {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		text-decoration: none;
		min-height: var(--touch-target);
		display: inline-flex;
		align-items: center;
	}
	.back a:hover,
	.back a:focus-visible {
		opacity: 1;
	}
	.prose h1 {
		font-family: var(--font-headline);
		font-weight: 900;
		font-size: clamp(48px, 9vw, 96px);
		letter-spacing: -0.04em;
		line-height: 0.95;
		margin: 0 0 var(--space-3) 0;
	}
	.lede {
		font-size: var(--supporting-size);
		opacity: var(--opacity-secondary);
		margin: 0;
	}
	.prose section {
		margin-top: var(--space-5);
	}
	.prose h2 {
		font-size: var(--supporting-size);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0 0 var(--space-3) 0;
		opacity: var(--opacity-secondary);
	}
	.prose p {
		margin: 0 0 var(--space-3) 0;
		opacity: var(--opacity-secondary);
	}
	.prose p:last-child {
		margin-bottom: 0;
	}
	.prose ul {
		padding-inline-start: 1.2em;
		margin: 0 0 var(--space-3) 0;
		opacity: var(--opacity-secondary);
	}
	.prose li {
		margin-bottom: var(--space-2);
	}
	.prose a {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
	.prose code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.92em;
		opacity: var(--opacity-secondary);
	}
	.prose pre {
		margin: 0 0 var(--space-3) 0;
		padding: var(--space-3);
		background: var(--surface-faint);
		border-radius: 6px;
		overflow-x: auto;
		font-size: var(--micro-size);
	}
	.prose pre code {
		opacity: 1;
	}
</style>
