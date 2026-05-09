import { buildAnswer, cacheHeadersFor } from '$lib/server/answer.js';
import type { StateKey } from '$lib/types.js';
import type { PageServerLoad } from './$types.js';

const STATES: readonly StateKey[] = ['yes', 'sortof', 'no', 'unknown'];

function isStateKey(value: string | null): value is StateKey {
	return value !== null && (STATES as readonly string[]).includes(value);
}

export const load: PageServerLoad = async ({ fetch, setHeaders, url, request }) => {
	const { answer, source } = await buildAnswer({ url, request, fetch });

	// Cache headers are computed from the *real* state — debug overrides must
	// not influence cache TTL. Otherwise `?state=unknown` would short-TTL the
	// underlying YES/NO/SORT-OF page for everyone hitting the same cache key.
	setHeaders(cacheHeadersFor(source, answer.state));

	// Visual debug: ?state=yes|sortof|no|unknown overrides the rendered state
	// without touching the underlying data. Useful for screenshots and a11y testing.
	// We construct a NEW answer rather than mutating the one returned from
	// buildAnswer — a future memoisation around buildAnswer would otherwise
	// silently corrupt the cached value across requests.
	const stateOverride = url.searchParams.get('state');
	const finalAnswer = isStateKey(stateOverride) ? { ...answer, state: stateOverride } : answer;

	return { answer: finalAnswer };
};
