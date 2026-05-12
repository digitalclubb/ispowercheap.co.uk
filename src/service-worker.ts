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

	// Page navigations and the JSON API are the *answer* — they must reflect
	// the live state whenever we're online. Network-first: the runtime cache is
	// only the offline last-known-answer fallback, never served ahead of a
	// reachable origin. (A stale-while-revalidate cache here meant every page
	// open showed the previous visit's answer until the user reloaded.)
	const isNavigation = event.request.mode === 'navigate' || url.pathname === '/';
	const isApi = url.pathname.startsWith('/api/');
	if (isNavigation || isApi) {
		event.respondWith(networkFirst(event.request, RUNTIME_CACHE, isNavigation));
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

async function networkFirst(
	req: Request,
	cacheName: string,
	isNavigation: boolean,
): Promise<Response> {
	const cache = await caches.open(cacheName);

	// Offline fallback: the cached copy of this exact request, or — for a
	// navigation — the cached home page so the user still sees the most-recent
	// known answer instead of a browser error page. The home page is only ever
	// in RUNTIME_CACHE (it's SSR'd, never precached); `caches.match('/')`
	// queries every cache, so it finds it there once the user has visited once.
	const fromCache = async (): Promise<Response | undefined> =>
		(await cache.match(req)) ?? (isNavigation ? await caches.match('/') : undefined);

	try {
		const res = await fetch(req);
		// Navigation requests carry `redirect: 'manual'`, so a 3xx from the
		// origin (e.g. the canonicalising 308 in hooks.server.ts) surfaces here
		// as an opaque redirect. Hand it straight back so the browser performs
		// the redirect — falling through to the cached `/` would render the
		// page but swallow the URL correction.
		if (res.type === 'opaqueredirect') return res;
		if (res.ok && res.status === 200) {
			await cache.put(req, res.clone());
			await trimCache(cacheName, RUNTIME_CACHE_MAX);
			return res;
		}
		// Upstream returned an error (5xx, etc.) — a recent cached answer beats
		// an error page. We never cache the error itself, so it can't go sticky.
		return (await fromCache()) ?? res;
	} catch {
		// Network unreachable — serve the last-known answer if we have one.
		return (await fromCache()) ?? new Response('Service Unavailable', { status: 503 });
	}
}
