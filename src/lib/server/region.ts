import { normalizeOutcode } from '../postcode.js';
import type { RegionInfo } from '../types.js';

export interface RegionContext {
	url: URL;
	request: Request;
}

/** Where the resolved region came from. Drives cache strategy at the route layer. */
export type RegionSource = 'url' | 'header' | 'national';

export interface RegionResolution {
	region: RegionInfo;
	source: RegionSource;
}

/**
 * Resolve the user's region from request signals, in priority order:
 *   1. Explicit ?postcode= in the URL (the user asked for it).
 *   2. Vercel's x-vercel-ip-postal-code header (when country is GB).
 *   3. National GB fallback.
 *
 * Lat/lon → outcode reverse-geocoding happens client-side on user opt-in
 * (saves a postcodes.io call on every cold first paint).
 *
 * The `source` field is used by the route handler to pick a cache strategy:
 * URL- and national-derived responses can be safely shared across users
 * (the URL itself is the cache key, or the body is identical for everyone).
 * Header-derived responses must NOT enter shared caches because the same
 * URL produces different bodies depending on the requester's IP.
 */
export function resolveRegion({ url, request }: RegionContext): RegionResolution {
	const urlOutcode = normalizeOutcode(url.searchParams.get('postcode'));
	if (urlOutcode) {
		return {
			region: { kind: 'postcode', label: urlOutcode, postcode: urlOutcode },
			source: 'url',
		};
	}

	const country = request.headers.get('x-vercel-ip-country');
	if (country === 'GB') {
		const headerOutcode = normalizeOutcode(request.headers.get('x-vercel-ip-postal-code'));
		if (headerOutcode) {
			return {
				region: { kind: 'postcode', label: headerOutcode, postcode: headerOutcode },
				source: 'header',
			};
		}
	}

	return {
		region: { kind: 'national', label: 'Great Britain' },
		source: 'national',
	};
}
