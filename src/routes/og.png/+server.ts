import sharp from 'sharp';
import { read } from '$app/server';
import ogMarkUrl from '$lib/assets/og-mark.png';
import { buildStateOnly, cacheHeadersFor } from '$lib/server/answer.js';
import { STATE_HEADLINE, STATE_WORD } from '$lib/state.js';
import { THEME_COLOR } from '$lib/theme.js';
import type { RequestHandler } from './$types.js';

/**
 * Server-rendered Open Graph image (1200×630).
 *
 * The image reflects the *current* answer at request time, so a social share
 * always shows whatever the page is showing at that moment. Cache TTL adapts
 * to whether the body varies per-IP (header-derived region) or is shareable.
 *
 * Uses `buildStateOnly` (skip the 48 h forecast fetch) and PNG
 * `compressionLevel: 6, effort: 1` (~30–50% less CPU than 9 with negligible
 * byte impact on a flat-colour image). Both choices reduce per-miss cost and
 * shrink the wallet-drain attack surface on `/og.png`.
 *
 * The brand mark is composited in from `src/lib/assets/og-mark.png` (the
 * cream-backgrounded bolt+clock). Resized + cached at module scope so the
 * sharp pipeline only does it once per Lambda lifetime.
 */

let markCache: Buffer | null = null;
async function getMark(): Promise<Buffer> {
	if (markCache) return markCache;
	const source = Buffer.from(await read(ogMarkUrl).arrayBuffer());
	markCache = await sharp(source).resize(140, 140, { fit: 'contain' }).png().toBuffer();
	return markCache;
}

export const GET: RequestHandler = async ({ url, request, fetch, setHeaders }) => {
	const { state, source } = await buildStateOnly({ url, request, fetch });

	setHeaders(cacheHeadersFor(source, state));

	const word = STATE_WORD[state];
	const sub = STATE_HEADLINE[state];
	const bg = THEME_COLOR[state].light;
	const fg = state === 'sortof' ? '#1a1a1a' : '#ffffff';

	const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
	<rect width="1200" height="630" fill="${bg}" />
	<text x="600" y="370" text-anchor="middle"
		font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
		font-weight="900" font-size="240" letter-spacing="-12" fill="${fg}">${word}</text>
	<text x="600" y="455" text-anchor="middle"
		font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
		font-size="32" fill="${fg}" opacity="0.78">${sub}</text>
	<text x="600" y="585" text-anchor="middle"
		font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
		font-size="24" fill="${fg}" opacity="0.55">ispowercheap.co.uk</text>
</svg>`.trim();

	const mark = await getMark();

	const png = await sharp(Buffer.from(svg))
		.composite([{ input: mark, top: 60, left: 60 }])
		.png({ compressionLevel: 6, effort: 1 })
		.toBuffer();

	return new Response(new Uint8Array(png), {
		headers: {
			'Content-Type': 'image/png',
			'Content-Length': String(png.byteLength),
		},
	});
};
