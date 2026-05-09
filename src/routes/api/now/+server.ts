import { json } from '@sveltejs/kit';
import { buildAnswer, cacheHeadersFor } from '$lib/server/answer.js';
import type { RequestHandler } from './$types.js';

/**
 * Public JSON endpoint — same data the page renders.
 *
 *   GET /api/now                 → national GB
 *   GET /api/now?postcode=SW1A   → regional override
 *
 * CORS-enabled so anyone can build on top.
 * Cache TTL adapts to whether the body varies per-IP (header-derived region)
 * or is shareable (URL-derived or national).
 */
export const GET: RequestHandler = async ({ url, request, fetch, setHeaders }) => {
	const { answer, source } = await buildAnswer({ url, request, fetch });

	setHeaders({
		...cacheHeadersFor(source, answer.state, ['Origin']),
		'Access-Control-Allow-Origin': '*',
	});

	return json(answer);
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Max-Age': '86400',
			Vary: 'Origin',
		},
	});
};
