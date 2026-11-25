import { describe, expect, it } from 'vitest';
import { alignToNow, cheapestWindow, cheapSpell, describeWindow } from './forecast.js';
import type { CarbonIntensityPoint, NowAnswer } from './types.js';

const STEP_MS = 30 * 60 * 1000;
const START = Date.parse('2026-11-25T10:00Z');

function halfHourly(
	forecasts: number[],
	index: (i: number) => CarbonIntensityPoint['index'] = () => 'moderate',
): CarbonIntensityPoint[] {
	return forecasts.map((forecast, i) => ({
		from: new Date(START + i * STEP_MS).toISOString(),
		to: new Date(START + (i + 1) * STEP_MS).toISOString(),
		forecast,
		actual: null,
		index: index(i),
	}));
}

describe('cheapestWindow', () => {
	it('returns null when there is too little data', () => {
		expect(cheapestWindow(halfHourly([1, 2]), 3)).toBe(null);
	});

	it('returns null for a flat forecast', () => {
		expect(cheapestWindow(halfHourly([100, 100, 100, 100]), 2)).toBe(null);
	});

	it('picks the lowest-average stretch, not the single lowest half-hour', () => {
		// lone dip of 10 at idx 1 vs a sustained 30s run at idx 4–6
		const w = cheapestWindow(halfHourly([200, 10, 200, 200, 30, 30, 30, 200]), 3);
		expect(w?.startIdx).toBe(4);
		expect(w?.from).toBe(new Date(START + 4 * STEP_MS).toISOString());
		expect(w?.to).toBe(new Date(START + 7 * STEP_MS).toISOString());
	});

	it('can start now (index 0)', () => {
		expect(cheapestWindow(halfHourly([10, 10, 50, 90]), 2)?.startIdx).toBe(0);
	});

	it('only looks at the 24 h chart window', () => {
		const points = halfHourly([...Array(48).fill(100), 1, 1, 1]);
		expect(cheapestWindow(points, 3)).toBe(null); // first 48 are flat
	});
});

describe('describeWindow', () => {
	const now = '2026-11-25T10:00Z';
	it('says "tomorrow" once when the whole stretch is tomorrow', () => {
		const w = { startIdx: 5, from: '2026-11-26T03:30Z', to: '2026-11-26T06:30Z' };
		expect(describeWindow(w, now)).toBe('03:30–06:30 tomorrow');
	});
	it('says "now" when the stretch starts with the current half-hour', () => {
		const w = { startIdx: 0, from: '2026-11-25T10:00Z', to: '2026-11-25T13:00Z' };
		expect(describeWindow(w, now)).toBe('now–13:00');
	});
});

describe('cheapSpell', () => {
	const at = (i: number) => new Date(START + i * STEP_MS).toISOString();
	const four = [1, 2, 3, 4];

	it('says when the current cheap spell ends', () => {
		const pts = halfHourly(four, (i) => (i < 2 ? 'low' : 'moderate'));
		expect(cheapSpell(pts)).toEqual({ kind: 'until', at: at(2) });
	});

	it('says all-day only when cheap across a full 24 h of data', () => {
		const full = halfHourly(Array(48).fill(1), () => 'very low');
		expect(cheapSpell(full)).toEqual({ kind: 'all-day' });
		// short data: say until the end of what we know, never "24 hours"
		expect(cheapSpell(halfHourly(four, () => 'very low'))).toEqual({ kind: 'until', at: at(4) });
	});

	it('says when the next cheap spell starts', () => {
		const pts = halfHourly(four, (i) => (i === 3 ? 'low' : 'high'));
		expect(cheapSpell(pts)).toEqual({ kind: 'from', at: at(3) });
	});

	it('is null when nothing is cheap', () => {
		expect(cheapSpell(halfHourly(four))).toBe(null);
		expect(cheapSpell([])).toBe(null);
	});
});

describe('alignToNow', () => {
	// periods 10:00, 10:30, 11:00, 11:30; 10:00 is cheap, the rest are not
	const forecast = halfHourly([1, 2, 3, 4], (i) => (i === 0 ? 'low' : 'high'));
	const base: NowAnswer = {
		state: 'no',
		current: { ...forecast[0], from: '2026-11-25T09:30Z', index: 'high' }, // lagging upstream
		forecast,
		fetchedAt: '2026-11-25T10:13Z',
		region: { kind: 'national', label: 'Great Britain' },
		sources: [],
	};
	const t = (hhmm: string) => Date.parse(`2026-11-25T${hhmm}Z`);

	it('answers from the period underway, not the lagging upstream one', () => {
		const out = alignToNow(base, t('10:13'));
		expect(out.current).toBe(forecast[0]);
		expect(out.state).toBe('yes');
		expect(out.forecast).toHaveLength(4);
	});

	it('moves on with the clock: a stale answer re-derives state and drops the past', () => {
		const later = alignToNow(alignToNow(base, t('10:13')), t('11:05'));
		expect(later.current).toBe(forecast[2]);
		expect(later.state).toBe('no');
		expect(later.forecast).toEqual(forecast.slice(2));
	});

	it('is a no-op within the same period, keeping a ?state= override', () => {
		const aligned = { ...alignToNow(base, t('10:13')), state: 'sortof' as const };
		expect(alignToNow(aligned, t('10:20'))).toBe(aligned);
	});

	it('drops the forecast when nothing covers now (no false "now" claims)', () => {
		const out = alignToNow(base, t('09:45'));
		expect(out.forecast).toEqual([]);
		expect(out.current).toBe(base.current);
		expect(alignToNow(base, t('13:00')).forecast).toEqual([]);
	});
});
