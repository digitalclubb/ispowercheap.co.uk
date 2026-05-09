import { LOCATIONS } from '$lib/locations.js';
import { ORIGIN } from '$lib/seo.js';
import type { RequestHandler } from './$types.js';

/**
 * Dynamic sitemap. Self-updates as locations are added or removed.
 * `lastmod` uses today's date so crawlers re-fetch when answers move
 * (Carbon Intensity refreshes every 30 minutes; daily lastmod is honest
 * without being noisy).
 */
export const GET: RequestHandler = async ({ setHeaders }) => {
	setHeaders({
		'Content-Type': 'application/xml; charset=utf-8',
		'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
	});

	const today = new Date().toISOString().slice(0, 10);

	const urls: Array<{ loc: string; priority: string; changefreq: string }> = [
		{ loc: `${ORIGIN}/`, priority: '1.0', changefreq: 'hourly' },
		{ loc: `${ORIGIN}/region`, priority: '0.7', changefreq: 'weekly' },
		{ loc: `${ORIGIN}/about`, priority: '0.5', changefreq: 'monthly' },
		...LOCATIONS.map((l) => ({
			loc: `${ORIGIN}/region/${l.slug}`,
			priority: l.kind === 'region' ? '0.8' : '0.7',
			changefreq: 'hourly',
		})),
	];

	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		urls
			.map(
				(u) =>
					`  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
			)
			.join('\n') +
		'\n</urlset>\n';

	return new Response(body);
};
