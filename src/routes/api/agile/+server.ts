import { json } from '@sveltejs/kit';
import { type AgileSnapshot, DNO_REGION_CODES } from '$lib/agile.js';
import { fetchAgileRates } from '$lib/server/octopus.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url, fetch, setHeaders }) => {
	const raw = url.searchParams.get('region') ?? '';
	const region = raw.trim().toUpperCase();
	if (!DNO_REGION_CODES.has(region)) {
		return json({ error: 'invalid region' }, { status: 400 });
	}

	// Agile prices are immutable once published; 60s cache + 5min SWR is conservative.
	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
		'Access-Control-Allow-Origin': '*',
	});

	const rates = await fetchAgileRates(region, fetch);
	const now = Date.now();
	const current =
		rates.find((r) => Date.parse(r.valid_from) <= now && now < Date.parse(r.valid_to)) ?? null;

	const payload: AgileSnapshot = { current, rates, region };
	return json(payload);
};
