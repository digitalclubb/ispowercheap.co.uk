import { type Handle, redirect } from '@sveltejs/kit';

/**
 * Per-pathname allowlist of query parameters that meaningfully affect the
 * response. Anything else is stripped via 308 redirect, which collapses
 * cache-buster URLs (?postcode=SW1A&junk=1, ?junk=2, ...) to a single edge
 * cache entry.
 *
 * IMPORTANT — fail-open by design: pathnames NOT in this map have their
 * query params passed through unchanged. Adding a new route that accepts
 * query params? It must be added here too, or it inherits zero protection
 * from cache-buster amplification. There is no other place this list lives.
 */
const ALLOWED_PARAMS: Record<string, ReadonlyArray<string>> = {
	'/': ['postcode', 'state'],
	'/api/now': ['postcode'],
	'/api/agile': ['region'],
	'/og.png': ['postcode'],
	'/region': [],
	'/about': [],
	'/sitemap.xml': [],
};

/**
 * Pathname patterns that legitimately contain dynamic segments (e.g.
 * `/region/london`). Any unrecognised query param on these is stripped.
 */
const DYNAMIC_NO_PARAM_PATHS: ReadonlyArray<RegExp> = [/^\/region\/[a-z][a-z0-9-]*$/];

function allowedFor(pathname: string): ReadonlyArray<string> | null {
	const exact = ALLOWED_PARAMS[pathname];
	if (exact) return exact;
	if (DYNAMIC_NO_PARAM_PATHS.some((re) => re.test(pathname))) return [];
	return null;
}

function canonicalise(url: URL): URL | null {
	const allow = allowedFor(url.pathname);
	if (!allow) return null;
	const params = url.searchParams;
	let hasUnknown = false;
	for (const key of Array.from(params.keys())) {
		if (!allow.includes(key)) {
			hasUnknown = true;
			break;
		}
	}
	if (!hasUnknown) return null;
	const cleaned = new URL(url.toString());
	for (const key of Array.from(cleaned.searchParams.keys())) {
		if (!allow.includes(key)) cleaned.searchParams.delete(key);
	}
	return cleaned;
}

const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
	[
		'Content-Security-Policy',
		[
			"default-src 'self'",
			// Inline styles are required for Svelte's scoped style hashing and
			// the sparkline's per-bar opacity attribute. No external styles.
			"style-src 'self' 'unsafe-inline'",
			// Inline scripts are SvelteKit's hydration JSON payload + state
			// initialiser. SvelteKit requires 'unsafe-inline' on script-src
			// unless we add per-request nonces (out of scope for v1).
			"script-src 'self' 'unsafe-inline'",
			// SVG-inline data: URLs are how the dynamic favicon ships.
			"img-src 'self' data:",
			"font-src 'self'",
			// Client-side reverse-geocode hits postcodes.io directly; same-origin
			// covers /api/now, /api/agile, the SW, and our manifest.
			"connect-src 'self' https://api.postcodes.io",
			"manifest-src 'self'",
			"worker-src 'self'",
			"frame-ancestors 'none'",
			"base-uri 'none'",
			"form-action 'self'",
		].join('; '),
	],
	['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'],
	['Referrer-Policy', 'strict-origin-when-cross-origin'],
	['X-Content-Type-Options', 'nosniff'],
	['X-Frame-Options', 'DENY'],
	[
		'Permissions-Policy',
		'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()',
	],
];

export const handle: Handle = async ({ event, resolve }) => {
	const cleaned = canonicalise(event.url);
	if (cleaned) throw redirect(308, cleaned.pathname + cleaned.search);

	const response = await resolve(event);
	for (const [name, value] of SECURITY_HEADERS) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}
	return response;
};
