import sharp from 'sharp';
import { read } from '$app/server';
import ogMarkUrl from '$lib/assets/og-mark.png';
import { buildStateOnly, cacheHeadersFor } from '$lib/server/answer.js';
import { STATE_WORD } from '$lib/state.js';
import { THEME_COLOR } from '$lib/theme.js';
import type { RequestHandler } from './$types.js';

/**
 * Server-rendered Open Graph image (1200×630).
 *
 * Logo-first composition: a large centred bolt mark dominates the upper two
 * thirds; the state word sits below it, and the brand URL anchors the bottom.
 * The image reflects the *current* answer at request time so social shares
 * always show whatever the page is showing.
 *
 * Logo asset is `src/lib/assets/og-mark.png` (cream-backed bolt). To swap to
 * a transparent-bg version, drop the source PNG at `src/lib/assets/bolt.png`
 * and update the import below — sharp will composite directly onto the
 * state colour with no cream backdrop.
 *
 * Cost defences carried over: `buildStateOnly` skips the 48-h forecast fetch,
 * `compressionLevel: 6, effort: 1` cuts encode CPU ~30–50% vs default.
 * Both the SVG canvas and the resized logo are cached at module scope so
 * sharp only does work-per-state once per Lambda lifetime.
 */

const CANVAS_W = 1200;
const CANVAS_H = 630;
const LOGO_SIZE = 400;
const LOGO_TOP = 30;
const LOGO_LEFT = Math.round((CANVAS_W - LOGO_SIZE) / 2);
const STATE_BASELINE_Y = 555;
const BRAND_BASELINE_Y = 605;

let logoCache: Buffer | null = null;
async function getLogo(): Promise<Buffer> {
	if (logoCache) return logoCache;
	const source = Buffer.from(await read(ogMarkUrl).arrayBuffer());
	logoCache = await sharp(source).resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain' }).png().toBuffer();
	return logoCache;
}

export const GET: RequestHandler = async ({ url, request, fetch, setHeaders }) => {
	const { state, source } = await buildStateOnly({ url, request, fetch });

	setHeaders(cacheHeadersFor(source, state));

	const word = STATE_WORD[state];
	const bg = THEME_COLOR[state].light;
	const fg = state === 'sortof' ? '#1a1a1a' : '#ffffff';

	const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" width="${CANVAS_W}" height="${CANVAS_H}">
	<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${bg}" />
	<text x="${CANVAS_W / 2}" y="${STATE_BASELINE_Y}" text-anchor="middle"
		font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
		font-weight="900" font-size="100" letter-spacing="-5" fill="${fg}">${word}</text>
	<text x="${CANVAS_W / 2}" y="${BRAND_BASELINE_Y}" text-anchor="middle"
		font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
		font-size="22" fill="${fg}" opacity="0.6">ispowercheap.co.uk</text>
</svg>`.trim();

	const logo = await getLogo();

	const png = await sharp(Buffer.from(svg))
		.composite([{ input: logo, top: LOGO_TOP, left: LOGO_LEFT }])
		.png({ compressionLevel: 6, effort: 1 })
		.toBuffer();

	return new Response(new Uint8Array(png), {
		headers: {
			'Content-Type': 'image/png',
			'Content-Length': String(png.byteLength),
		},
	});
};
