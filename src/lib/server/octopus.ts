import type { AgileRate } from '../agile.js';

/**
 * Active Octopus Agile product code. Octopus rolls these forward periodically
 * (current generation: 2024-10-01). When Octopus issues a new code, update
 * this constant. To verify, hit:
 *   /v1/products/?brand=OCTOPUS_ENERGY&is_variable=true
 * and look for the latest "Agile Octopus" entry.
 */
const AGILE_PRODUCT = 'AGILE-24-10-01';
const AGILE_TARIFF_PREFIX = `E-1R-${AGILE_PRODUCT}`;

const API_BASE = 'https://api.octopus.energy/v1';

/** Round `now` down to the start of the current half-hour, ISO 8601 with Z. */
function currentHalfHourISO(d: Date = new Date()): string {
	const t = new Date(d);
	t.setUTCSeconds(0, 0);
	t.setUTCMinutes(t.getUTCMinutes() < 30 ? 0 : 30);
	return `${t.toISOString().slice(0, 16)}Z`;
}

/**
 * Fetch Octopus Agile half-hour rates for a DNO region, from the current
 * settlement period forward. Returns [] on any failure — the caller surfaces
 * a "price unavailable" message rather than blocking the page.
 */
export async function fetchAgileRates(
	region: string,
	fetchFn: typeof fetch = fetch,
): Promise<AgileRate[]> {
	const periodFrom = currentHalfHourISO();
	const url =
		`${API_BASE}/products/${AGILE_PRODUCT}/electricity-tariffs/${AGILE_TARIFF_PREFIX}-${region}/standard-unit-rates/` +
		`?period_from=${encodeURIComponent(periodFrom)}&page_size=100`;
	try {
		const res = await fetchFn(url, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) return [];
		const json = (await res.json()) as { results?: AgileRate[] };
		const rates = Array.isArray(json.results) ? json.results : [];
		// API returns newest first; sort ascending by valid_from for downstream use.
		return rates
			.filter((r) => r?.valid_from && r?.valid_to && typeof r.value_inc_vat === 'number')
			.sort((a, b) => a.valid_from.localeCompare(b.valid_from));
	} catch {
		return [];
	}
}
