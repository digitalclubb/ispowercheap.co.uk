import { error } from '@sveltejs/kit';
import { findLocation } from '$lib/locations.js';
import { buildAnswer, cacheHeadersFor } from '$lib/server/answer.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, fetch, request, url, setHeaders }) => {
	const location = findLocation(params.slug);
	if (!location) {
		throw error(404, 'unknown region');
	}

	const { answer, source } = await buildAnswer({
		url,
		request,
		fetch,
		regionOverride: { postcode: location.postcode, label: location.name },
	});

	setHeaders(cacheHeadersFor(source, answer.state));

	return { answer, location };
};
