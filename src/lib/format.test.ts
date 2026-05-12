import { describe, expect, it } from 'vitest';
import { formatTimeWithDay } from './format.js';

// Dates are built in local time and read back in local time by the function
// under test, so these assertions hold regardless of the test runner's TZ.
describe('formatTimeWithDay', () => {
	it('shows a bare HH:mm for a time on the same calendar day', () => {
		const ref = new Date(2026, 4, 9, 12, 0, 0); // local 9 May, 12:00
		const sameDay = new Date(2026, 4, 9, 14, 0, 0); // local 9 May, 14:00
		const out = formatTimeWithDay(sameDay.toISOString(), ref.toISOString());
		expect(out).toMatch(/^\d{2}:\d{2}$/);
		expect(out).not.toMatch(/tomorrow/);
	});

	it('appends a non-breaking-space "tomorrow" for a time on a later calendar day', () => {
		const ref = new Date(2026, 4, 9, 22, 0, 0); // local 9 May, 22:00
		const nextDay = new Date(2026, 4, 10, 9, 0, 0); // local 10 May, 09:00
		const out = formatTimeWithDay(nextDay.toISOString(), ref.toISOString());
		expect(out).toMatch(/^\d{2}:\d{2} tomorrow$/); // U+00A0, not a plain space — keeps it on one line
	});

	it('falls back to a bare HH:mm when the reference is unparseable', () => {
		const out = formatTimeWithDay(new Date(2026, 4, 9, 14, 0, 0).toISOString(), 'not-a-date');
		expect(out).toMatch(/^\d{2}:\d{2}$/);
		expect(out).not.toMatch(/tomorrow/);
	});
});
