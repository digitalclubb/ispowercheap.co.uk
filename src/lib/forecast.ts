import { formatTimeWithDay } from './format.js';
import { deriveState } from './state.js';
import type { CarbonIntensityPoint, NowAnswer } from './types.js';

/**
 * Half-hour periods in the "next 24 hours" chart. The chart, the outlook line
 * and the chips all read this slice so they can never disagree.
 */
export const FORECAST_WINDOW_PERIODS = 48;

/** Length of the highlighted "cheapest stretch": 3 hours covers most loads. */
export const BEST_WINDOW_PERIODS = 6;

export interface BestWindow {
	/** Index of the first period in the 24 h slice. */
	startIdx: number;
	from: string;
	to: string;
}

/**
 * The cheapest run of `slots` consecutive half-hours in the next 24 h, by
 * lowest average intensity. A stretch, not a single half-hour: a lone 04:30
 * minimum is fragile and useless when 03:30–06:00 is all within a few grams.
 * Assumes `points[0]` is the period underway now (the server trims the past),
 * so a window starting at index 0 means "now".
 *
 * Null when there's too little data or the forecast is flat (nothing to pick).
 */
export function cheapestWindow(
	points: ReadonlyArray<CarbonIntensityPoint>,
	slots: number = BEST_WINDOW_PERIODS,
): BestWindow | null {
	const slice = points.slice(0, FORECAST_WINDOW_PERIODS);
	if (slots <= 0 || slice.length < slots) return null;
	const values = slice.map((p) => p.forecast);
	if (Math.min(...values) === Math.max(...values)) return null;

	let sum = 0;
	for (let i = 0; i < slots; i++) sum += values[i];
	let best = sum;
	let startIdx = 0;
	for (let i = slots; i < values.length; i++) {
		sum += values[i] - values[i - slots];
		if (sum < best) {
			best = sum;
			startIdx = i - slots + 1;
		}
	}
	return { startIdx, from: slice[startIdx].from, to: slice[startIdx + slots - 1].to };
}

/**
 * "03:30–06:30 tomorrow", "22:30–01:30 tomorrow" or "now–12:30".
 * "tomorrow" appears once, at the end, when both ends are tomorrow.
 */
export function describeWindow(w: BestWindow, now: string): string {
	const end = formatTimeWithDay(w.to, now);
	const start = w.startIdx === 0 ? 'now' : formatTimeWithDay(w.from, now);
	return `${end.endsWith('tomorrow') ? start.replace(/ tomorrow$/, '') : start}–${end}`;
}

export type CheapSpell =
	| { kind: 'until'; at: string }
	| { kind: 'all-day' }
	| { kind: 'from'; at: string }
	| null;

/**
 * "Cheap" in the headline's own sense (API band → YES). If the half-hour
 * underway is cheap: when does that end? If not: when does the next cheap
 * half-hour start? Within the 24 h chart window. Null when nothing in the
 * window is cheap — the cheapest-stretch line covers that case.
 */
export function cheapSpell(points: ReadonlyArray<CarbonIntensityPoint>): CheapSpell {
	const slice = points.slice(0, FORECAST_WINDOW_PERIODS);
	const cheap = (p: CarbonIntensityPoint) => deriveState(p.index) === 'yes';
	if (!slice.length) return null;
	if (cheap(slice[0])) {
		const end = slice.findIndex((p) => !cheap(p));
		if (end !== -1) return { kind: 'until', at: slice[end].from };
		// Only claim "all day" when the data really covers the whole window.
		return slice.length >= FORECAST_WINDOW_PERIODS
			? { kind: 'all-day' }
			: { kind: 'until', at: slice[slice.length - 1].to };
	}
	const next = slice.find(cheap);
	return next ? { kind: 'from', at: next.from } : null;
}

/**
 * Make `forecast[0]` the half-hour underway at `nowMs` and answer from it.
 * Everything downstream (chart "now", cheap-until, chips) relies on that.
 *
 * Server: the forecast endpoint returns the period *before* the one asked for,
 * and /intensity lags a period (at 09:43 it still reports 09:00–09:30).
 * Client: re-run every minute so an offline last-known answer, or a tab left
 * open while polling fails, moves on with the clock instead of insisting a
 * 13:00 bar is "now" at 18:00.
 *
 * If no period covers `nowMs` the forecast is dropped (we can't say what "now"
 * is) and the upstream `current`/`state` stand. The state is only re-derived
 * when the period actually changes, so the server's `?state=` debug override
 * survives hydration.
 */
export function alignToNow(answer: NowAnswer, nowMs: number): NowAnswer {
	const live = answer.forecast.filter((p) => Date.parse(p.to) > nowMs);
	const covering = live[0] && Date.parse(live[0].from) <= nowMs ? live[0] : null;
	if (!covering) return answer.forecast.length ? { ...answer, forecast: [] } : answer;
	const samePeriod = covering.from === answer.current?.from;
	if (samePeriod && live.length === answer.forecast.length) return answer;
	const state = samePeriod ? answer.state : deriveState(covering.index);
	return { ...answer, state, current: covering, forecast: live };
}
