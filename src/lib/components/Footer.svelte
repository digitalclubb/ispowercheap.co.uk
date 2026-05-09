<script lang="ts">
	import InstallPrompt from './InstallPrompt.svelte';
</script>

<footer class="footer">
	<div class="install-row">
		<InstallPrompt />
	</div>

	<p class="attribution">
		Carbon data:
		<a href="https://carbonintensity.org.uk" rel="noopener noreferrer">
			National Energy System Operator
		</a>, EDF, University of Oxford, WWF — CC BY 4.0.
	</p>
	<p class="attribution muted">
		Tariff data:
		<a href="https://octopus.energy" rel="noopener noreferrer">Octopus Energy</a>.
	</p>

	<nav class="links" aria-label="footer">
		<a href="/region">all regions</a>
		<span aria-hidden="true">·</span>
		<a href="/about">about</a>
		<span aria-hidden="true">·</span>
		<a href="/api/now">api</a>
		<span aria-hidden="true">·</span>
		<a href="/humans.txt">colophon</a>
	</nav>

	<p class="brand">ispowercheap.co.uk</p>
</footer>

<style>
	.footer {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding-block: var(--space-5) max(var(--space-6), env(safe-area-inset-bottom));
		padding-inline: max(var(--space-3), env(safe-area-inset-left))
			max(var(--space-3), env(safe-area-inset-right));
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
		text-align: center;
		text-wrap: balance;
	}
	.install-row {
		min-height: var(--touch-target);
		margin-bottom: var(--space-2);
		display: flex;
		align-items: center;
	}
	.attribution {
		margin: 0;
		max-width: 60ch;
	}
	.attribution.muted {
		opacity: 0.75;
	}
	.attribution a,
	.links a {
		text-decoration: underline;
		text-underline-offset: 0.25em;
		display: inline-block;
		min-height: 24px;
		padding-block: 6px;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}
	.brand {
		margin: var(--space-2) 0 0 0;
		opacity: 0.7;
		font-variant-numeric: tabular-nums;
	}
</style>
