import type { CarbonIntensityPoint } from './types.js';

export interface ForecastExtremes {
	cheapest: CarbonIntensityPoint;
	peak: CarbonIntensityPoint;
}

/**
 * Find the cheapest and peak settlement periods in the upcoming forecast,
 * filtered to periods that *haven't started yet* from `now`.
 *
 * The headline state already covers "where we are now"; this surfaces
 * "where it's heading" so users in a SORT OF moment can decide whether
 * waiting buys them anything.
 *
 * Returns null when:
 *   - the forecast is empty (UNKNOWN state, no upstream data),
 *   - all forecast points are already in the past (end-of-window edge case),
 *   - the upcoming forecast is flat (cheapest === peak — no useful contrast).
 */
export function findUpcomingExtremes(
	points: ReadonlyArray<CarbonIntensityPoint>,
	nowMs: number = Date.now(),
): ForecastExtremes | null {
	if (!points.length) return null;

	let cheapest: CarbonIntensityPoint | null = null;
	let peak: CarbonIntensityPoint | null = null;

	for (const p of points) {
		if (Date.parse(p.from) <= nowMs) continue;
		if (cheapest === null || p.forecast < cheapest.forecast) cheapest = p;
		if (peak === null || p.forecast > peak.forecast) peak = p;
	}

	if (!cheapest || !peak || cheapest === peak) return null;
	return { cheapest, peak };
}
