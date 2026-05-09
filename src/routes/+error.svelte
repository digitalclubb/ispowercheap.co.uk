<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} — ispowercheap.co.uk</title>
</svelte:head>

<main>
	<h1 class="answer">UNKNOWN</h1>
	<p class="supporting">
		something went wrong ({page.status}{page.error?.message ? ` · ${page.error.message}` : ''})
	</p>
	<p class="micro"><a href="/">try again</a></p>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--state-unknown-bg);
		color: var(--state-unknown-fg);
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
	}
	.micro a {
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
</style>
