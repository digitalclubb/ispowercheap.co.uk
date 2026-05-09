import type { CarbonIntensityPoint } from './types.js';

export interface ChipDef {
	id: string;
	label: string;
	/** Number of half-hour settlement periods needed for one run. */
	slots: number;
}

/**
 * Typical household appliance durations in half-hour units.
 * Source: average eco-cycle / typical-use figures; intentionally conservative
 * so a chip only goes green when the WHOLE run will be cheap.
 */
export const CHIPS: readonly ChipDef[] = [
	{ id: 'dishwasher', label: 'dishwasher', slots: 4 }, //  2 h
	{ id: 'washing', label: 'washing machine', slots: 3 }, //  1.5 h
	{ id: 'dryer', label: 'tumble dryer', slots: 3 }, //  1.5 h
	{ id: 'ev-topup', label: 'EV top-up', slots: 8 }, //  4 h
	{ id: 'ev-full', label: 'EV full charge', slots: 16 }, //  8 h
	{ id: 'immersion', label: 'immersion heater', slots: 3 }, //  1.5 h
	{ id: 'oven', label: 'oven roast', slots: 2 }, //  1 h
];

export type ChipVerdict =
	| { kind: 'good-now'; avgForecast: number }
	| { kind: 'good-later'; startISO: string; avgForecast: number }
	| { kind: 'no-good-window'; startISO: string; avgForecast: number };

const CHEAP_INDICES = new Set<CarbonIntensityPoint['index']>(['very low', 'low']);

/**
 * A window is "cheap" when a majority of its half-hour periods are classified
 * as low or very low.
 */
function isWindowCheap(points: CarbonIntensityPoint[], startIdx: number, slots: number): boolean {
	let count = 0;
	for (let i = startIdx; i < startIdx + slots; i++) {
		if (CHEAP_INDICES.has(points[i].index)) count++;
	}
	return count >= Math.ceil(slots / 2);
}

/**
 * Assess a single chip against a forecast.
 *
 * - `good-now`: the *current* half-hour starts a cheap-enough window — go now.
 *               (We don't withhold the green tick just because tomorrow night is
 *               even cheaper; the practical question is "is now cheap enough?")
 * - `good-later`: now isn't cheap, but a cheap window exists in the horizon —
 *                 surface the start time of the cheapest qualifying window.
 * - `no-good-window`: nothing in the horizon meets the cheap bar; surface the
 *                     start of the *least bad* window.
 */
export function chipVerdict(points: CarbonIntensityPoint[], slots: number): ChipVerdict | null {
	if (slots <= 0 || points.length < slots) return null;

	// sliding-window sum: sums[i] = sum(forecasts[i..i+slots-1])
	const sums: number[] = [];
	let sum = 0;
	for (let i = 0; i < slots; i++) sum += points[i].forecast;
	sums.push(sum);
	for (let i = slots; i < points.length; i++) {
		sum += points[i].forecast - points[i - slots].forecast;
		sums.push(sum);
	}

	if (isWindowCheap(points, 0, slots)) {
		return { kind: 'good-now', avgForecast: Math.round(sums[0] / slots) };
	}

	let cheapestCheapIdx = -1;
	let cheapestCheapSum = Number.POSITIVE_INFINITY;
	for (let i = 0; i < sums.length; i++) {
		if (sums[i] < cheapestCheapSum && isWindowCheap(points, i, slots)) {
			cheapestCheapSum = sums[i];
			cheapestCheapIdx = i;
		}
	}

	if (cheapestCheapIdx >= 0) {
		return {
			kind: 'good-later',
			startISO: points[cheapestCheapIdx].from,
			avgForecast: Math.round(cheapestCheapSum / slots),
		};
	}

	let minIdx = 0;
	let minSum = sums[0];
	for (let i = 1; i < sums.length; i++) {
		if (sums[i] < minSum) {
			minSum = sums[i];
			minIdx = i;
		}
	}
	return {
		kind: 'no-good-window',
		startISO: points[minIdx].from,
		avgForecast: Math.round(minSum / slots),
	};
}
