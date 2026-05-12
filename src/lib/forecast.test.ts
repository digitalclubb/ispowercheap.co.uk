import { describe, expect, it } from 'vitest';
import { FORECAST_WINDOW_PERIODS, findUpcomingExtremes, upcomingExtremes } from './forecast.js';
import type { CarbonIntensityPoint, IntensityIndex } from './types.js';

function pt(forecast: number, hour: number, minute = 0): CarbonIntensityPoint {
	const h = String(hour).padStart(2, '0');
	const m = String(minute).padStart(2, '0');
	const from = `2026-05-09T${h}:${m}Z`;
	return { from, to: from, forecast, actual: null, index: 'moderate' as IntensityIndex };
}

/** A run of consecutive half-hour settlement periods starting at `startMs`. */
function halfHourly(startMs: number, forecasts: number[]): CarbonIntensityPoint[] {
	const STEP_MS = 30 * 60 * 1000;
	return forecasts.map((forecast, i) => ({
		from: new Date(startMs + i * STEP_MS).toISOString(),
		to: new Date(startMs + (i + 1) * STEP_MS).toISOString(),
		forecast,
		actual: null,
		index: 'moderate' as IntensityIndex,
	}));
}

const NOW = Date.parse('2026-05-09T12:00Z');

describe('findUpcomingExtremes', () => {
	it('returns null for an empty forecast', () => {
		expect(findUpcomingExtremes([], NOW)).toBe(null);
	});

	it('returns null when every point is in the past', () => {
		const points = [pt(50, 8), pt(100, 10), pt(80, 11)];
		expect(findUpcomingExtremes(points, NOW)).toBe(null);
	});

	it('finds the lowest and highest forecast in upcoming periods', () => {
		const points = [
			pt(50, 8), // past, ignored
			pt(200, 13), // peak
			pt(80, 14),
			pt(40, 15), // cheapest
			pt(120, 16),
		];
		const result = findUpcomingExtremes(points, NOW);
		expect(result?.cheapest.forecast).toBe(40);
		expect(result?.peak.forecast).toBe(200);
		expect(result?.cheapest.from).toBe('2026-05-09T15:00Z');
		expect(result?.peak.from).toBe('2026-05-09T13:00Z');
	});

	it('excludes points whose from is exactly now (strictly future)', () => {
		const points = [
			pt(1000, 12), // exactly NOW — excluded by strict >
			pt(20, 13),
			pt(80, 14),
		];
		const result = findUpcomingExtremes(points, NOW);
		expect(result?.cheapest.forecast).toBe(20);
		expect(result?.peak.forecast).toBe(80);
	});

	it('returns null when only one upcoming point exists (no contrast)', () => {
		const points = [pt(50, 8), pt(80, 13)]; // one past, one future
		expect(findUpcomingExtremes(points, NOW)).toBe(null);
	});

	it('returns null when the upcoming forecast is flat', () => {
		const points = [pt(100, 13), pt(100, 14), pt(100, 15)];
		expect(findUpcomingExtremes(points, NOW)).toBe(null);
	});

	it('handles half-hour granularity correctly', () => {
		const points = [
			pt(50, 11, 30), // started before NOW (11:30), excluded
			pt(60, 12, 30), // first future
			pt(40, 13, 0), // cheapest
			pt(150, 13, 30), // peak
		];
		const result = findUpcomingExtremes(points, NOW);
		expect(result?.cheapest.from).toBe('2026-05-09T13:00Z');
		expect(result?.peak.from).toBe('2026-05-09T13:30Z');
	});
});

describe('upcomingExtremes', () => {
	it('excludes the half-hour already in progress', () => {
		// Index 0 starts exactly at NOW — the period we're partway through.
		const points = halfHourly(NOW, [10, 70, 40, 200]);
		const result = upcomingExtremes(points, NOW);
		expect(result?.cheapest.forecast).toBe(40); // not the 10 at index 0
		expect(result?.peak.forecast).toBe(200);
	});

	it('ignores forecast beyond the next 24 hours (the window the chart draws)', () => {
		// 48 periods inside the window — index 0 is the in-progress one, so the
		// contrast lives at indices 1 (cheapest) and 2 (peak) — then two cheaper
		// / peakier periods just past the window that must be sliced off.
		const inWindow = Array.from({ length: FORECAST_WINDOW_PERIODS }, (_, i) =>
			i === 1 ? 30 : i === 2 ? 250 : 100,
		);
		const points = halfHourly(NOW, [...inWindow, 1, 999]);
		const result = upcomingExtremes(points, NOW);
		expect(result?.cheapest.forecast).toBe(30); // not the 1 at index 48
		expect(result?.peak.forecast).toBe(250); // not the 999 at index 49
	});

	it('returns null when there is no upcoming data', () => {
		expect(upcomingExtremes([], NOW)).toBe(null);
	});
});
