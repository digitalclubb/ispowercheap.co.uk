/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const APP_CACHE = `app-${version}`;
const RUNTIME_CACHE = `runtime-${version}`;
const PRECACHE: readonly string[] = [...build, ...files];
const PRECACHE_SET = new Set(PRECACHE);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(APP_CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => sw.skipWaiting()),
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== APP_CACHE && key !== RUNTIME_CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})(),
	);
});

// Periodic Background Sync — opportunistic refresh of /api/now and / so the
// home-screen icon's launcher answer is current when the user next opens it.
// Permission grants are rare (Chromium-only, gated on site engagement); this
// handler silently no-ops where unsupported.
sw.addEventListener('periodicsync', ((event: ExtendableEvent & { tag?: string }) => {
	if (event.tag !== 'refresh-now') return;
	event.waitUntil(
		(async () => {
			const cache = await caches.open(RUNTIME_CACHE);
			for (const path of ['/api/now', '/']) {
				try {
					const res = await fetch(path);
					if (res.ok && res.status === 200) await cache.put(path, res.clone());
				} catch {
					// upstream unreachable; nothing to cache
				}
			}
			await trimCache(RUNTIME_CACHE, RUNTIME_CACHE_MAX);
		})(),
	);
}) as EventListener);

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin) return; // never cache cross-origin

	// Immutable build assets — cache-first.
	if (PRECACHE_SET.has(url.pathname)) {
		event.respondWith(cacheFirst(event.request, APP_CACHE));
		return;
	}

	// Page navigations and JSON APIs — stale-while-revalidate so users get
	// instant render from cache and the latest answer arrives in the background.
	const isNavigation = event.request.mode === 'navigate' || url.pathname === '/';
	const isApi = url.pathname.startsWith('/api/');
	if (isNavigation || isApi) {
		event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
		return;
	}
});

async function cacheFirst(req: Request, cacheName: string): Promise<Response> {
	const cached = await caches.match(req);
	if (cached) return cached;
	const res = await fetch(req);
	if (res.ok) {
		const cache = await caches.open(cacheName);
		cache.put(req, res.clone());
	}
	return res;
}

/** Cap on the SWR cache. A user who hops 50 postcodes in a session shouldn't
 *  end up with 50 entries; the freshest wins, the rest get pruned FIFO. */
const RUNTIME_CACHE_MAX = 32;

async function trimCache(cacheName: string, max: number): Promise<void> {
	const cache = await caches.open(cacheName);
	const keys = await cache.keys(); // insertion order
	if (keys.length <= max) return;
	const overflow = keys.length - max;
	for (let i = 0; i < overflow; i++) {
		await cache.delete(keys[i]);
	}
}

async function staleWhileRevalidate(req: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(req);
	// Only cache 200s for navigations; a 503 cached for SWR turns into a sticky
	// outage that survives the actual outage. The same applies to /api/now.
	const network = fetch(req)
		.then(async (res) => {
			if (res.ok && res.status === 200) {
				await cache.put(req, res.clone());
				await trimCache(cacheName, RUNTIME_CACHE_MAX);
			}
			return res;
		})
		.catch(() => null);

	if (cached) {
		// Trigger background refresh; immediately return the cached value.
		network.catch(() => undefined);
		return cached;
	}
	const res = await network;
	if (res?.ok) return res;

	// Last-resort offline fallback: serve the cached home page so the user
	// still gets the most-recent known answer instead of a browser error page.
	// The home page may live in either RUNTIME_CACHE (visited before) or
	// APP_CACHE (precached at install) — `caches.match()` queries all caches.
	if (req.mode === 'navigate') {
		const fallback = await caches.match('/');
		if (fallback) return fallback;
	}

	return res ?? new Response('Service Unavailable', { status: 503 });
}
