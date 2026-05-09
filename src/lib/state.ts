import type { IntensityIndex, StateKey } from './types.js';

const STATE_BY_INDEX: Record<IntensityIndex, StateKey> = {
	'very low': 'yes',
	low: 'yes',
	moderate: 'sortof',
	high: 'no',
	'very high': 'no',
};

/**
 * Map the Carbon Intensity API's `index` field to one of our four states.
 * Anything missing or unrecognised falls back to `unknown` — never invent.
 */
export function deriveState(index: IntensityIndex | null | undefined): StateKey {
	if (!index) return 'unknown';
	return STATE_BY_INDEX[index] ?? 'unknown';
}

/** The single word rendered as the headline. */
export const STATE_WORD: Record<StateKey, string> = {
	yes: 'YES',
	sortof: 'SORT OF',
	no: 'NO',
	unknown: 'UNKNOWN',
};

/** One-line plain-English context immediately under the headline. */
export const STATE_HEADLINE: Record<StateKey, string> = {
	yes: 'electricity is cheap right now',
	sortof: 'middle of today’s range',
	no: 'wait if you can',
	unknown: 'we don’t know right now',
};
