import { describe, expect, it } from 'vitest';
import { findUpcomingExtremes } from './forecast.js';
import type { CarbonIntensityPoint, IntensityIndex } from './types.js';

function pt(forecast: number, hour: number, minute = 0): CarbonIntensityPoint {
	const h = String(hour).padStart(2, '0');
	const m = String(minute).padStart(2, '0');
	const from = `2026-05-09T${h}:${m}Z`;
	return { from, to: from, forecast, actual: null, index: 'moderate' as IntensityIndex };
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
