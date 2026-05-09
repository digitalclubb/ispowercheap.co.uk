import type { StateKey } from './types.js';

/** theme-color values per state, light + dark mode. Mirrors src/app.css. */
export const THEME_COLOR: Record<StateKey, { light: string; dark: string }> = {
	yes: { light: '#0e7c3a', dark: '#14a04a' },
	sortof: { light: '#e69f00', dark: '#f5b020' },
	no: { light: '#b3261e', dark: '#d2382f' },
	unknown: { light: '#1f2937', dark: '#2d3a4a' },
};
