/** Octopus DNO region letters and human-readable names.
 * Note: there is no "I" — the codes go A–H, J–P. */
export const DNO_REGIONS: ReadonlyArray<{ code: string; name: string }> = [
	{ code: 'A', name: 'Eastern England' },
	{ code: 'B', name: 'East Midlands' },
	{ code: 'C', name: 'London' },
	{ code: 'D', name: 'Merseyside & N Wales' },
	{ code: 'E', name: 'West Midlands' },
	{ code: 'F', name: 'North East' },
	{ code: 'G', name: 'North West' },
	{ code: 'H', name: 'Southern England' },
	{ code: 'J', name: 'South Eastern England' },
	{ code: 'K', name: 'South Wales' },
	{ code: 'L', name: 'South Western England' },
	{ code: 'M', name: 'Yorkshire' },
	{ code: 'N', name: 'Southern Scotland' },
	{ code: 'P', name: 'Northern Scotland' },
];

export const DNO_REGION_CODES = new Set(DNO_REGIONS.map((r) => r.code));

/**
 * Carbon Intensity API region IDs (1–17) → Octopus DNO codes (A–P, no I).
 *
 * The Carbon Intensity API returns `regionid` on every regional response;
 * we map it to the matching DNO so the page's existing region resolution
 * (postcode → regional intensity) automatically populates the user's
 * Agile DNO. This lets AgileOverlay enable in a single click without a
 * second region picker — the page already knows where the user is.
 *
 * IDs 15/16/17 are England/Scotland/Wales aggregates with no DNO mapping
 * (they're not distribution regions).
 */
const REGION_ID_TO_DNO: Record<number, string> = {
	1: 'P', // North Scotland
	2: 'N', // South Scotland
	3: 'G', // North West England
	4: 'F', // North East England
	5: 'M', // Yorkshire
	6: 'D', // North Wales & Merseyside
	7: 'K', // South Wales
	8: 'E', // West Midlands
	9: 'B', // East Midlands
	10: 'A', // East England
	11: 'L', // South West England
	12: 'H', // South England
	13: 'C', // London
	14: 'J', // South East England
};

export function dnoFromRegionId(regionId: number | undefined): string | undefined {
	if (regionId === undefined) return undefined;
	return REGION_ID_TO_DNO[regionId];
}

export interface AgileRate {
	/** Inclusive of VAT, in p/kWh. */
	value_inc_vat: number;
	value_exc_vat: number;
	/** ISO 8601, e.g. "2026-05-09T13:00:00Z". */
	valid_from: string;
	valid_to: string;
}

export interface AgileSnapshot {
	current: AgileRate | null;
	rates: AgileRate[];
	region: string;
}
