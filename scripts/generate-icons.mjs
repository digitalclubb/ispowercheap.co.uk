#!/usr/bin/env node
/**
 * Render the brand mark (`bolt.png`) into every icon size the manifest,
 * iOS, Android, and the favicon need.
 *
 * Best-practice background strategy:
 *   - **Favicons** (16/32/48): TRANSPARENT. Browser tabs are light-mode grey
 *     or dark-mode dark; a white-square favicon fights both. Letting the
 *     bolt float gives it logo-energy instead of sticker-energy.
 *   - **Apple touch + PWA + maskable**: warm off-white (`#FAF6EE`). Subtle
 *     brand tint — reads as "household / warm" rather than the clinical
 *     "AI medical app" feel of pure white. Mirrors the manifest splash.
 *   - **Maskable variants** get 15% safe-area padding so Android's adaptive
 *     launcher mask doesn't crop the clock ring.
 *
 * Run on every change to bolt.png:  pnpm icons
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
/** Source PNG (transparent background expected). To regenerate icons, drop a
 *  768×768 (or larger) PNG of the brand mark at this path. */
const SRC = resolve(root, 'src/lib/assets/bolt.png');
const OUT_DIR = resolve(root, 'static');

if (!existsSync(SRC)) {
	console.error(
		`error: source asset missing at ${SRC}\n` +
			`add a transparent-background bolt PNG (recommended 768×768+) and re-run \`pnpm icons\`.`,
	);
	process.exit(1);
}

/** Warm off-white — brand-aligned, mirrors the manifest's background_color. */
const BG_CREAM = { r: 250, g: 246, b: 238, alpha: 1 };
/** Used for transparent-bg favicons; sharp still needs *some* base when compositing. */
const BG_TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const TARGETS = [
	// favicon — transparent so it inherits the browser tab's natural background
	{ name: 'favicon-16.png', size: 16, transparent: true },
	{ name: 'favicon-32.png', size: 32, transparent: true },
	{ name: 'favicon.png', size: 48, transparent: true },
	// iOS home screen + Apple's touch fallback (must be opaque per iOS)
	{ name: 'apple-touch-icon.png', size: 180 },
	// PWA — Android adaptive launcher reserves ~15 % safe area on maskable variants
	{ name: 'icon-192.png', size: 192 },
	{ name: 'icon-512.png', size: 512 },
	{ name: 'icon-maskable-192.png', size: 192, padding: 0.15 },
	{ name: 'icon-maskable-512.png', size: 512, padding: 0.15 },
];

async function render({ name, size, padding = 0, transparent = false }) {
	const src = await readFile(SRC);
	const inner = Math.round(size * (1 - padding * 2));
	const offset = Math.round((size - inner) / 2);

	const resized = await sharp(src).resize(inner, inner, { fit: 'contain' }).png().toBuffer();

	const composite = sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background: transparent ? BG_TRANSPARENT : BG_CREAM,
		},
	})
		.composite([{ input: resized, top: offset, left: offset }])
		.png({ compressionLevel: 9 });

	const out = resolve(OUT_DIR, name);
	await composite.toFile(out);
	console.log(
		`wrote ${out} (${size}×${size}${padding ? `, padding ${padding * 100}%` : ''}${transparent ? ', transparent' : ''})`,
	);
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	for (const t of TARGETS) await render(t);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
