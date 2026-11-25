import no from '#lib/assets/og/no.png';
import sortof from '#lib/assets/og/sortof.png';
import unknown from '#lib/assets/og/unknown.png';
import yes from '#lib/assets/og/yes.png';
import { buildStateOnly, cacheHeadersFor } from '#lib/server/answer.js';
import type { StateKey } from '#lib/types.js';
import { read } from '$app/server';
import type { RequestHandler } from './$types.js';

/**
 * Open Graph image (1200×630) reflecting the *current* answer, so social
 * shares show whatever the page is showing. The four variants are pre-rendered
 * by `pnpm og` (sharp can't run on Workers); this route just picks one.
 */
const OG: Record<StateKey, string> = { yes, sortof, no, unknown };

export const GET: RequestHandler = async ({ url, request, fetch, setHeaders }) => {
	const { state, source } = await buildStateOnly({ url, request, fetch });
	setHeaders(cacheHeadersFor(source, state));
	const png = read(OG[state]);
	return new Response(png.body, { headers: { 'Content-Type': 'image/png' } });
};
