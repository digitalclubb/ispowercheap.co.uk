/** The four states the page can ever be in. */
export type StateKey = 'yes' | 'sortof' | 'no' | 'unknown';

/** Carbon Intensity API's published bands. */
export type IntensityIndex = 'very low' | 'low' | 'moderate' | 'high' | 'very high';

export interface CarbonIntensityPoint {
	/** ISO 8601 start of the half-hour settlement period. */
	from: string;
	/** ISO 8601 end of the half-hour settlement period. */
	to: string;
	/** gCO2/kWh forecast for the period. */
	forecast: number;
	/** gCO2/kWh actual, or null if not yet settled. */
	actual: number | null;
	index: IntensityIndex;
}

export interface RegionInfo {
	kind: 'national' | 'postcode' | 'gsp';
	/** Human-readable label, e.g. "Great Britain", "London (SW1)". */
	label: string;
	postcode?: string;
	gspId?: number;
	/**
	 * Octopus DNO code (A–P, no I) when known. Derived from the Carbon
	 * Intensity API's regionid on regional responses; absent for national.
	 * AgileOverlay uses this to skip the second region picker.
	 */
	dnoCode?: string;
}

export interface NowAnswer {
	state: StateKey;
	current: CarbonIntensityPoint | null;
	/** Next 48 hours of forecast, half-hourly (up to 96 points). */
	forecast: CarbonIntensityPoint[];
	fetchedAt: string;
	region: RegionInfo;
	sources: string[];
}
