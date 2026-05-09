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

	// Dev-mode service-worker safety net. A previous `pnpm preview` registers
	// the production SW with production-hashed asset paths cached. When you
	// then switch to `pnpm dev`, Vite's dev server doesn't serve those paths,
	// so the SW serves stale HTML referencing CSS files that 404 — broken
	// layout. This effect unregisters any leftover SW, purges its caches,
	// and reloads once. No-op when no SW is registered (so it can't loop).
	// Stripped from production builds at compile time via `import.meta.env.DEV`.
	$effect(() => {
		if (
			!import.meta.env.DEV ||
			typeof navigator === 'undefined' ||
			!('serviceWorker' in navigator)
		) {
			return;
		}
		void (async () => {
			const regs = await navigator.serviceWorker.getRegistrations();
			if (regs.length === 0) return;
			await Promise.all(regs.map((reg) => reg.unregister()));
			if ('caches' in window) {
				const keys = await caches.keys();
				await Promise.all(keys.map((key) => caches.delete(key)));
			}
			window.location.reload();
		})();
	});

	// Production SW upgrade safety net. When a new build ships, the new
	// service worker installs in the background and activates via
	// `clients.claim()` — but the page might already have rendered against
	// the old build's HTML, referencing asset hashes the new SW doesn't have
	// in its precache. The result is broken layout that even a hard refresh
	// can't fix (Cmd+Shift+R doesn't bypass the SW). This listener catches
	// the controller transition and reloads once, getting fresh HTML through
	// the new SW. The `alreadyHadController` guard prevents the first-load
	// case (no controller → first SW takes over) from triggering a reload loop.
	$effect(() => {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
		let alreadyHadController = navigator.serviceWorker.controller !== null;
		function onControllerChange() {
			if (alreadyHadController) {
				window.location.reload();
				return;
			}
			alreadyHadController = navigator.serviceWorker.controller !== null;
		}
		navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
		return () => {
			navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
		};
	});

	// Critical-asset failure recovery. If a build asset (CSS, JS chunk) 404s
	// because the SW is stuck on a build whose hashes the origin no longer
	// serves, force-recover: unregister SW, purge caches, reload once. Guarded
	// by sessionStorage so an unrecoverable error can't infinite-loop.
	$effect(() => {
		if (typeof window === 'undefined') return;
		const RECOVERY_FLAG = 'ispc:sw-recovery-attempted';
		function onResourceError(event: Event) {
			const target = event.target as HTMLLinkElement | HTMLScriptElement | null;
			if (!target) return;
			const url =
				(target as HTMLLinkElement).href ?? (target as HTMLScriptElement).src ?? '';
			if (!url.includes('/_app/immutable/')) return;
			try {
				if (sessionStorage.getItem(RECOVERY_FLAG)) return; // already tried; don't loop
				sessionStorage.setItem(RECOVERY_FLAG, '1');
			} catch {
				// private mode — proceed without dedup, browser may not loop anyway
			}
			void (async () => {
				if ('serviceWorker' in navigator) {
					const regs = await navigator.serviceWorker.getRegistrations();
					await Promise.all(regs.map((r) => r.unregister()));
				}
				if ('caches' in window) {
					const keys = await caches.keys();
					await Promise.all(keys.map((k) => caches.delete(k)));
				}
				window.location.reload();
			})();
		}
		// Use capture phase — error events on resources don't bubble.
		document.addEventListener('error', onResourceError, true);
		return () => document.removeEventListener('error', onResourceError, true);
	});
</script>

{@render children()}
