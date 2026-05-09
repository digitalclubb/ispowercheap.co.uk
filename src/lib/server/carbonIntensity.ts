import type { CarbonIntensityPoint } from '../types.js';

const API_BASE = 'https://api.carbonintensity.org.uk';
/** Bound every upstream fetch so a slow upstream can't pin our Lambda for
 *  the full execution-time limit and inflate our bill during their incident. */
const UPSTREAM_TIMEOUT_MS = 5000;

function fetchWithTimeout(fetchFn: typeof fetch, url: string): Promise<Response> {
	return fetchFn(url, {
		headers: { Accept: 'application/json' },
		signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
	});
}

/**
 * Round `now` down to the start of the current half-hour settlement period
 * and return a Carbon-Intensity-API-compatible string (`YYYY-MM-DDTHH:MMZ`).
 */
function settlementPeriodStart(d: Date = new Date()): string {
	const t = new Date(d);
	t.setUTCSeconds(0, 0);
	t.setUTCMinutes(t.getUTCMinutes() < 30 ? 0 : 30);
	return `${t.toISOString().slice(0, 16)}Z`;
}

export function parsePoint(raw: unknown): CarbonIntensityPoint | null {
	if (!raw || typeof raw !== 'object') return null;
	const p = raw as {
		from?: string;
		to?: string;
		intensity?: {
			forecast?: number;
			actual?: number | null;
			index?: CarbonIntensityPoint['index'];
		};
	};
	if (!p.from || !p.to) return null;
	// `intensity.index` is missing on the last 1–2 settlement periods of a 48-h
	// window when the upstream model hasn't produced a confidence band yet.
	// We default to 'moderate' (the conservative middle) rather than dropping
	// the point — losing the tail silently truncates the EV-full chip's
	// 8-hour window scan.
	return {
		from: p.from,
		to: p.to,
		forecast: p.intensity?.forecast ?? 0,
		actual: p.intensity?.actual ?? null,
		index: p.intensity?.index ?? 'moderate',
	};
}

/**
 * Fetch the current half-hour carbon intensity, national.
 * Returns null on any failure — the caller maps that to UNKNOWN state.
 */
export async function fetchCurrentIntensity(
	fetchFn: typeof fetch = fetch,
): Promise<CarbonIntensityPoint | null> {
	try {
		const res = await fetchWithTimeout(fetchFn, `${API_BASE}/intensity`);
		if (!res.ok) return null;
		const json = (await res.json()) as { data?: unknown[] };
		return parsePoint(json.data?.[0]);
	} catch {
		return null;
	}
}

export interface RegionalIntensityResult {
	point: CarbonIntensityPoint;
	/** API-provided region name, e.g. "London", "South England". */
	shortname: string;
	regionid: number;
}

/**
 * Fetch the current half-hour regional carbon intensity for a UK outcode.
 * The regional endpoint omits `actual` — only `forecast` is returned.
 */
export async function fetchRegionalIntensity(
	outcode: string,
	fetchFn: typeof fetch = fetch,
): Promise<RegionalIntensityResult | null> {
	try {
		const res = await fetchWithTimeout(
			fetchFn,
			`${API_BASE}/regional/postcode/${encodeURIComponent(outcode)}`,
		);
		if (!res.ok) return null;
		const json = (await res.json()) as {
			data?: Array<{ regionid?: number; shortname?: string; data?: unknown[] }>;
		};
		const region = json.data?.[0];
		const point = parsePoint(region?.data?.[0]);
		if (!point) return null;
		return {
			shortname: region?.shortname ?? '',
			regionid: region?.regionid ?? 0,
			point,
		};
	} catch {
		return null;
	}
}

/**
 * Fetch the next 48-hour forecast (96 half-hour points) for a UK outcode,
 * or national if outcode is null. Returns [] on any failure.
 */
export async function fetchForecast(
	outcode: string | null,
	fetchFn: typeof fetch = fetch,
): Promise<CarbonIntensityPoint[]> {
	const from = settlementPeriodStart();
	const url = outcode
		? `${API_BASE}/regional/intensity/${from}/fw48h/postcode/${encodeURIComponent(outcode)}`
		: `${API_BASE}/intensity/${from}/fw48h`;
	try {
		const res = await fetchWithTimeout(fetchFn, url);
		if (!res.ok) return [];
		const json = (await res.json()) as {
			data?: unknown;
		};
		// National: data is an array of points.
		// Regional: data is an object with .data being the array of points.
		let items: unknown[] = [];
		if (Array.isArray(json.data)) {
			items = json.data;
		} else if (json.data && typeof json.data === 'object') {
			const inner = (json.data as { data?: unknown }).data;
			if (Array.isArray(inner)) items = inner;
		}
		const points: CarbonIntensityPoint[] = [];
		for (const item of items) {
			const p = parsePoint(item);
			if (p) points.push(p);
		}
		return points;
	} catch {
		return [];
	}
}
