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
