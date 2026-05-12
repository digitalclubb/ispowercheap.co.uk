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

/**
 * Number of half-hour settlement periods the home and region pages render as
 * the "next 24 hours" forecast chart. Defined here so the page-level
 * `upcomingExtremes` call and the chart's own slicing can never drift apart —
 * if they did, the caption could name a period that isn't on the chart.
 */
export const FORECAST_WINDOW_PERIODS = 48;

/**
 * `findUpcomingExtremes` over just the next 24 hours — the window the forecast
 * chart draws. Call this from the routes and hand the result to both Outlook
 * and the chart, so the headline outlook line, the chart caption and its ↓/↑
 * markers are all computed from exactly the same set of periods.
 */
export function upcomingExtremes(
	forecast: ReadonlyArray<CarbonIntensityPoint>,
	nowMs: number = Date.now(),
): ForecastExtremes | null {
	return findUpcomingExtremes(forecast.slice(0, FORECAST_WINDOW_PERIODS), nowMs);
}
