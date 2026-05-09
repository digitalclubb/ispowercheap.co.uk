import { describe, expect, it } from 'vitest';
import { CHIPS, chipVerdict } from './chips.js';
import type { CarbonIntensityPoint, IntensityIndex } from './types.js';

function pt(forecast: number, index: IntensityIndex, from: string): CarbonIntensityPoint {
	return { from, to: from, forecast, actual: null, index };
}

function halfHourSeries(values: Array<[number, IntensityIndex]>): CarbonIntensityPoint[] {
	return values.map(([forecast, index], i) => {
		const minutes = i * 30;
		const h = Math.floor(minutes / 60)
			.toString()
			.padStart(2, '0');
		const m = (minutes % 60).toString().padStart(2, '0');
		return pt(forecast, index, `2026-05-09T${h}:${m}Z`);
	});
}

describe('chipVerdict', () => {
	it('returns good-now when current half-hour starts a cheap window', () => {
		const points = halfHourSeries([
			[50, 'low'],
			[60, 'low'],
			[70, 'low'],
			[80, 'low'],
		]);
		expect(chipVerdict(points, 2)).toEqual({ kind: 'good-now', avgForecast: 55 });
	});

	it('returns good-later when cheapest window is in the future', () => {
		const points = halfHourSeries([
			[300, 'high'],
			[290, 'high'],
			[50, 'low'],
			[55, 'low'],
		]);
		const v = chipVerdict(points, 2);
		expect(v).toEqual({ kind: 'good-later', startISO: '2026-05-09T01:00Z', avgForecast: 53 });
	});

	it('returns no-good-window when nothing is cheap enough', () => {
		const points = halfHourSeries([
			[300, 'high'],
			[310, 'high'],
			[290, 'high'],
			[295, 'high'],
		]);
		expect(chipVerdict(points, 2)?.kind).toBe('no-good-window');
	});

	it('handles longer windows (4 hours = 8 half-hours)', () => {
		const high: Array<[number, IntensityIndex]> = Array.from({ length: 8 }, () => [
			320,
			'high' as IntensityIndex,
		]);
		const veryLow: Array<[number, IntensityIndex]> = Array.from({ length: 8 }, () => [
			40,
			'very low' as IntensityIndex,
		]);
		const points = halfHourSeries([...high, ...veryLow]);
		const v = chipVerdict(points, 8);
		expect(v?.kind).toBe('good-later');
		if (v?.kind === 'good-later') {
			expect(v.startISO).toBe('2026-05-09T04:00Z');
		}
	});

	it('returns null for empty input', () => {
		expect(chipVerdict([], 2)).toBe(null);
	});

	it('returns null when forecast is shorter than the chip duration', () => {
		const tiny = halfHourSeries([[50, 'low']]);
		expect(chipVerdict(tiny, 4)).toBe(null);
	});

	it('treats a 2-low + 1-moderate window as cheap (majority rule)', () => {
		const points = halfHourSeries([
			[80, 'low'],
			[90, 'low'],
			[150, 'moderate'],
		]);
		expect(chipVerdict(points, 3)?.kind).toBe('good-now');
	});

	it('treats a 1-low + 2-moderate window as not cheap', () => {
		const points = halfHourSeries([
			[80, 'low'],
			[150, 'moderate'],
			[160, 'moderate'],
		]);
		expect(chipVerdict(points, 3)?.kind).toBe('no-good-window');
	});

	it('returns good-now when current is cheap even if a later window is cheaper', () => {
		const points = halfHourSeries([
			[80, 'low'],
			[80, 'low'],
			[40, 'very low'],
			[40, 'very low'],
		]);
		const v = chipVerdict(points, 2);
		expect(v?.kind).toBe('good-now');
		if (v?.kind === 'good-now') expect(v.avgForecast).toBe(80);
	});

	it('exports a non-empty list of chips with positive slots', () => {
		expect(CHIPS.length).toBeGreaterThan(0);
		for (const chip of CHIPS) {
			expect(chip.slots).toBeGreaterThan(0);
			expect(chip.label).toBeTruthy();
			expect(chip.id).toBeTruthy();
		}
	});
});
