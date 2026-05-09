<script lang="ts">
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import '../app.css';

	let { children } = $props();

	// Vercel Web Analytics — anonymous, no cookies, no PII, GDPR-compliant by
	// design so we don't need a consent banner. Sends beacons to same-origin
	// `/_vercel/insights/*` (Vercel routes through the edge) so the existing
	// CSP `connect-src 'self'` covers it without modification. Active only
	// on Vercel deployments; a no-op locally.
	$effect(() => {
		injectAnalytics();
	});
</script>

{@render children()}
