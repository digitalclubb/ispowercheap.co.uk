import { describe, expect, it } from 'vitest';
import { parsePoint } from './carbonIntensity.js';

describe('parsePoint', () => {
	it('parses a complete point', () => {
		const p = parsePoint({
			from: '2026-05-09T10:00Z',
			to: '2026-05-09T10:30Z',
			intensity: { forecast: 142, actual: 138, index: 'moderate' },
		});
		expect(p).toEqual({
			from: '2026-05-09T10:00Z',
			to: '2026-05-09T10:30Z',
			forecast: 142,
			actual: 138,
			index: 'moderate',
		});
	});

	it('rejects null / undefined / non-objects', () => {
		expect(parsePoint(null)).toBe(null);
		expect(parsePoint(undefined)).toBe(null);
		expect(parsePoint('nope')).toBe(null);
		expect(parsePoint(42)).toBe(null);
	});

	it('rejects when from or to is missing', () => {
		expect(parsePoint({ to: '2026-05-09T10:30Z', intensity: { index: 'low' } })).toBe(null);
		expect(parsePoint({ from: '2026-05-09T10:00Z', intensity: { index: 'low' } })).toBe(null);
	});

	it('defaults missing intensity.index to "moderate"', () => {
		// Carbon Intensity API has historically returned `index: null` for the
		// last 1–2 settlement periods of a 48-h window. Don't drop the point —
		// dropping silently truncates the EV-full chip's window scan.
		const p = parsePoint({
			from: '2026-05-11T05:00Z',
			to: '2026-05-11T05:30Z',
			intensity: { forecast: 110, actual: null },
		});
		expect(p?.index).toBe('moderate');
		expect(p?.forecast).toBe(110);
	});

	it('defaults missing forecast to 0 and actual to null', () => {
		const p = parsePoint({
			from: '2026-05-09T10:00Z',
			to: '2026-05-09T10:30Z',
			intensity: { index: 'low' },
		});
		expect(p?.forecast).toBe(0);
		expect(p?.actual).toBe(null);
	});

	it('handles entirely missing intensity object', () => {
		const p = parsePoint({ from: '2026-05-09T10:00Z', to: '2026-05-09T10:30Z' });
		expect(p).toEqual({
			from: '2026-05-09T10:00Z',
			to: '2026-05-09T10:30Z',
			forecast: 0,
			actual: null,
			index: 'moderate',
		});
	});
});
