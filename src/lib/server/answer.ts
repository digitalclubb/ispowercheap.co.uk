import { dnoFromRegionId } from '../agile.js';
import { deriveState } from '../state.js';
import type { CarbonIntensityPoint, NowAnswer, RegionInfo, StateKey } from '../types.js';
import { fetchCurrentIntensity, fetchForecast, fetchRegionalIntensity } from './carbonIntensity.js';
import { type RegionSource, resolveRegion } from './region.js';

/**
 * Pick a Cache-Control value that respects two truths:
 *   - When the body depends on the user's IP (source === 'header'), the
 *     response MUST NOT enter Vercel's shared edge cache or one user's
 *     regional answer leaks to another.
 *   - When the upstream returned nothing (state === 'unknown'), we want a
 *     short TTL so recovery is fast — never pin UNKNOWN for 5 minutes.
 */
export function cacheHeaderFor(source: RegionSource, state: StateKey): string {
	const sharedSafe = source !== 'header';
	if (state === 'unknown') {
		return sharedSafe ? 'public, s-maxage=10, stale-while-revalidate=60' : 'private, max-age=10';
	}
	return sharedSafe ? 'public, s-maxage=60, stale-while-revalidate=300' : 'private, max-age=60';
}

/**
 * Build the full set of cache + vary headers for a route response.
 *
 * `Vary` is set to `x-vercel-ip-postal-code, x-vercel-ip-country` whenever the
 * region was derived from the request IP — belt-and-braces with `private`. If
 * a future change accidentally flips a header-derived response to `public`,
 * a CDN that honours Vary still won't serve one user's regional answer to
 * another user.
 *
 * `extraVary` is for routes that already need to vary on something else
 * (e.g. `/api/now` varies on `Origin` for CORS).
 */
export function cacheHeadersFor(
	source: RegionSource,
	state: StateKey,
	extraVary: ReadonlyArray<string> = [],
): Record<string, string> {
	const headers: Record<string, string> = {
		'Cache-Control': cacheHeaderFor(source, state),
	};
	const vary = [...extraVary];
	if (source === 'header') {
		vary.push('x-vercel-ip-postal-code', 'x-vercel-ip-country');
	}
	if (vary.length) headers.Vary = vary.join(', ');
	return headers;
}

export interface AnswerContext {
	url: URL;
	request: Request;
	fetch: typeof fetch;
	/**
	 * Force-pin the region to a specific outward postcode.
	 * Used by the `/region/[slug]` landing pages where the location is part
	 * of the URL path (not query params or IP). Treats the body as
	 * URL-shaped for cache purposes — i.e. shareable across users, since
	 * the path itself is the cache key.
	 */
	regionOverride?: { postcode: string; label: string };
}

export interface AnswerResult {
	answer: NowAnswer;
	/** Where the region came from — drives cache strategy at the route layer. */
	source: RegionSource;
}

async function fetchNational(fetchFn: typeof fetch): Promise<{
	current: CarbonIntensityPoint | null;
	forecast: CarbonIntensityPoint[];
}> {
	const [current, forecast] = await Promise.all([
		fetchCurrentIntensity(fetchFn),
		fetchForecast(null, fetchFn),
	]);
	return { current, forecast };
}

export interface StateOnlyResult {
	state: import('../types.js').StateKey;
	source: RegionSource;
	region: RegionInfo;
}

/**
 * Slim path for /og.png — derive just the state and region label without
 * paying for the 48-hour forecast. The OG image only renders state word +
 * headline + brand line, all driven by `state`.
 */
export async function buildStateOnly(ctx: AnswerContext): Promise<StateOnlyResult> {
	const { region, source } = ctx.regionOverride
		? {
				region: {
					kind: 'postcode' as const,
					label: ctx.regionOverride.label,
					postcode: ctx.regionOverride.postcode,
				},
				source: 'url' as const,
			}
		: resolveRegion({ url: ctx.url, request: ctx.request });
	let resolvedRegion: RegionInfo = region;
	let effectiveSource = source;
	let current: CarbonIntensityPoint | null = null;

	if (region.kind === 'postcode' && region.postcode) {
		const regional = await fetchRegionalIntensity(region.postcode, ctx.fetch);
		if (regional) {
			current = regional.point;
			resolvedRegion = {
				...region,
				label: regional.shortname ? `${regional.shortname} (${region.postcode})` : region.postcode,
				dnoCode: dnoFromRegionId(regional.regionid),
			};
		} else {
			current = await fetchCurrentIntensity(ctx.fetch);
			resolvedRegion = { kind: 'national', label: 'Great Britain' };
			effectiveSource = 'national';
		}
	} else {
		current = await fetchCurrentIntensity(ctx.fetch);
	}

	return {
		state: deriveState(current?.index),
		source: effectiveSource,
		region: resolvedRegion,
	};
}

/**
 * Build the canonical NowAnswer used by both the HTML page and the JSON API.
 * Resolves region, fetches current + 48h forecast, derives state, falls back
 * to national if a regional fetch fails.
 */
export async function buildAnswer(ctx: AnswerContext): Promise<AnswerResult> {
	const { region, source } = ctx.regionOverride
		? {
				region: {
					kind: 'postcode' as const,
					label: ctx.regionOverride.label,
					postcode: ctx.regionOverride.postcode,
				},
				source: 'url' as const,
			}
		: resolveRegion({ url: ctx.url, request: ctx.request });
	let resolvedRegion: RegionInfo = region;
	let effectiveSource = source;
	let current: CarbonIntensityPoint | null = null;
	let forecast: CarbonIntensityPoint[] = [];

	if (region.kind === 'postcode' && region.postcode) {
		const [regional, regionalForecast] = await Promise.all([
			fetchRegionalIntensity(region.postcode, ctx.fetch),
			fetchForecast(region.postcode, ctx.fetch),
		]);
		if (regional) {
			current = regional.point;
			forecast = regionalForecast;
			resolvedRegion = {
				...region,
				label: regional.shortname ? `${regional.shortname} (${region.postcode})` : region.postcode,
				dnoCode: dnoFromRegionId(regional.regionid),
			};
		} else {
			// Regional fetch failed → silently fall back to national. The user
			// keeps their answer, just at a coarser grain. We also drop the
			// region source to 'national' so the cache layer treats this as
			// safe to share across users (same body for all).
			const fallback = await fetchNational(ctx.fetch);
			current = fallback.current;
			forecast = fallback.forecast;
			resolvedRegion = { kind: 'national', label: 'Great Britain' };
			effectiveSource = 'national';
		}
	} else {
		const fallback = await fetchNational(ctx.fetch);
		current = fallback.current;
		forecast = fallback.forecast;
	}

	const answer: NowAnswer = {
		state: deriveState(current?.index),
		current,
		forecast,
		fetchedAt: new Date().toISOString(),
		region: resolvedRegion,
		sources: ['carbonintensity.org.uk'],
	};

	return { answer, source: effectiveSource };
}
