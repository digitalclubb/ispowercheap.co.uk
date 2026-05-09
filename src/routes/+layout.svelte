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
	// and reloads once. The sessionStorage flag is set BEFORE the async work
	// so even if reload races with cleanup, the next load short-circuits and
	// can't loop. Stripped from production via `import.meta.env.DEV`.
	$effect(() => {
		if (
			!import.meta.env.DEV ||
			typeof navigator === 'undefined' ||
			!('serviceWorker' in navigator)
		) {
			return;
		}
		const DEV_FLAG = 'ispc:dev-sw-cleared';
		try {
			if (sessionStorage.getItem(DEV_FLAG)) return;
			sessionStorage.setItem(DEV_FLAG, '1');
		} catch {
			return; // private mode — bail rather than risk a loop
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

	// Production-only SW upgrade safety net. When a new build ships, the new
	// service worker installs in the background and activates via
	// `clients.claim()` — but the page might already have rendered against
	// the old build's HTML, referencing asset hashes the new SW doesn't have
	// in its precache. The result is broken layout that even a hard refresh
	// can't fix (Cmd+Shift+R doesn't bypass the SW). This listener catches
	// the controller transition and reloads once, getting fresh HTML through
	// the new SW. **Skipped in dev** — the dev-mode unregister above owns the
	// SW lifecycle and a controllerchange listener here would race with its
	// `unregister()` call to produce reload loops.
	$effect(() => {
		if (
			import.meta.env.DEV ||
			typeof navigator === 'undefined' ||
			!('serviceWorker' in navigator)
		) {
			return;
		}
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

	// Production-only critical-asset failure recovery. If a build asset 404s
	// because the SW is stuck on a build whose hashes the origin no longer
	// serves, unregister SW + purge caches + reload. Guarded by sessionStorage
	// so an unrecoverable error can't infinite-loop. **Skipped in dev** — Vite
	// serves modules from `/@fs/` and `/src/` paths, never `/_app/immutable/`,
	// so this handler can't legitimately fire there; the explicit guard
	// prevents any future stale-cache scenario from triggering a dev reload.
	$effect(() => {
		if (import.meta.env.DEV || typeof window === 'undefined') return;
		const RECOVERY_FLAG = 'ispc:sw-recovery-attempted';
		function onResourceError(event: Event) {
			const target = event.target as HTMLLinkElement | HTMLScriptElement | null;
			if (!target) return;
			const url =
				(target as HTMLLinkElement).href ?? (target as HTMLScriptElement).src ?? '';
			if (!url.includes('/_app/immutable/')) return;
			try {
				if (sessionStorage.getItem(RECOVERY_FLAG)) return;
				sessionStorage.setItem(RECOVERY_FLAG, '1');
			} catch {
				// private mode — proceed without dedup
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
