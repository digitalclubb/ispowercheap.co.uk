#!/usr/bin/env node
/**
 * Subset Inter weight 900 to the unique glyphs that appear in the answer
 * words (YES, SORT OF, NO, UNKNOWN). Result lands in static/fonts/.
 *
 * Re-run when the answer set changes:  pnpm subset
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SOURCE_URL = 'https://rsms.me/inter/font-files/Inter-Black.woff2';
const SOURCE_PATH = resolve(root, '.cache/Inter-Black.woff2');
const OUTPUT_PATH = resolve(root, 'static/fonts/inter-900-subset.woff2');
// Every unique character that ever appears in the headline word.
// YES / SORT OF / NO / UNKNOWN  ->  Y E S O R T F N U K W + space
const SUBSET_TEXT = 'YES ORTFNUKW';

async function ensureSource() {
	if (existsSync(SOURCE_PATH)) return;
	console.log(`fetching ${SOURCE_URL}`);
	await mkdir(dirname(SOURCE_PATH), { recursive: true });
	const res = await fetch(SOURCE_URL);
	if (!res.ok) throw new Error(`failed to fetch source font: ${res.status}`);
	const bytes = new Uint8Array(await res.arrayBuffer());
	await writeFile(SOURCE_PATH, bytes);
}

async function main() {
	await ensureSource();
	const source = await readFile(SOURCE_PATH);
	const subset = await subsetFont(source, SUBSET_TEXT, { targetFormat: 'woff2' });
	await mkdir(dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, subset);
	console.log(`wrote ${OUTPUT_PATH} (${subset.length} bytes, glyphs: ${SUBSET_TEXT})`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
