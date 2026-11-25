import { describe, expect, it } from 'vitest';
import { formatTime, formatTimeWithDay } from './format.js';

describe('formatTime', () => {
	it('renders UK wall-clock time regardless of runtime zone (BST = UTC+1)', () => {
		expect(formatTime('2026-07-01T12:00Z')).toBe('13:00');
		expect(formatTime('2026-11-25T12:00Z')).toBe('12:00');
	});
});

describe('formatTimeWithDay', () => {
	it('shows a bare HH:mm for a time on the same UK day', () => {
		expect(formatTimeWithDay('2026-11-25T14:00Z', '2026-11-25T12:00Z')).toBe('14:00');
	});

	it('appends a non-breaking-space "tomorrow" for a later UK day', () => {
		expect(formatTimeWithDay('2026-11-26T09:00Z', '2026-11-25T22:00Z')).toBe('09:00\u00a0tomorrow');
	});

	it('uses the UK day, not UTC: 23:30Z in summer is already tomorrow', () => {
		expect(formatTimeWithDay('2026-07-01T23:30Z', '2026-07-01T20:00Z')).toBe('00:30\u00a0tomorrow');
	});

	it('falls back to a bare HH:mm when the reference is unparseable', () => {
		expect(formatTimeWithDay('2026-11-25T14:00Z', 'not-a-date')).toBe('14:00');
	});
});
