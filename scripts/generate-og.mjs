#!/usr/bin/env node
/**
 * Pre-render the four Open Graph images (one per state) into
 * src/lib/assets/og/{state}.png. The /og.png route picks one at request time.
 *
 * Rendered at build-time because sharp (native) cannot run on Cloudflare
 * Workers. Re-run when og-mark.png, state words or theme colours change:
 *   pnpm og
 */
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { STATE_WORD } from '../src/lib/state.ts';
import { THEME_COLOR } from '../src/lib/theme.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(root, 'src/lib/assets/og');

const W = 1200;
const H = 630;
const LOGO_SIZE = 400;

const logo = await sharp(await readFile(resolve(root, 'src/lib/assets/og-mark.png')))
	.resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain' })
	.png()
	.toBuffer();

await mkdir(OUT_DIR, { recursive: true });

for (const state of Object.keys(STATE_WORD)) {
	const bg = THEME_COLOR[state].light;
	const fg = state === 'sortof' ? '#1a1a1a' : '#ffffff';
	const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
	<rect width="${W}" height="${H}" fill="${bg}" />
	<text x="${W / 2}" y="555" text-anchor="middle"
		font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
		font-weight="900" font-size="100" letter-spacing="-5" fill="${fg}">${STATE_WORD[state]}</text>
	<text x="${W / 2}" y="605" text-anchor="middle"
		font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
		font-size="22" fill="${fg}" opacity="0.6">ispowercheap.co.uk</text>
</svg>`.trim();

	const out = resolve(OUT_DIR, `${state}.png`);
	await sharp(Buffer.from(svg))
		.composite([{ input: logo, top: 30, left: Math.round((W - LOGO_SIZE) / 2) }])
		.png({ compressionLevel: 9 })
		.toFile(out);
	console.log(`wrote ${out}`);
}
