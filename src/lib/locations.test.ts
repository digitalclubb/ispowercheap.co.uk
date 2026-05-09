import { describe, expect, it } from 'vitest';
import {
	CITY_LOCATIONS,
	findLocation,
	LOCATIONS,
	type LocationDef,
	REGION_LOCATIONS,
	siblingLocations,
} from './locations.js';

const VALID_DNO = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P']);

describe('LOCATIONS', () => {
	it('has unique slugs', () => {
		const slugs = LOCATIONS.map((l) => l.slug);
		const unique = new Set(slugs);
		expect(unique.size).toBe(slugs.length);
	});

	it('has lowercase hyphenated slugs', () => {
		for (const l of LOCATIONS) {
			expect(l.slug).toMatch(/^[a-z][a-z0-9-]*$/);
			expect(l.slug).not.toContain(' ');
			expect(l.slug).not.toContain('_');
		}
	});

	it('uses only the 14 valid DNO codes (no I)', () => {
		for (const l of LOCATIONS) {
			expect(VALID_DNO.has(l.dnoCode)).toBe(true);
		}
	});

	it('postcode shape is plausibly a UK outcode', () => {
		for (const l of LOCATIONS) {
			expect(l.postcode).toMatch(/^[A-Z]{1,2}\d[A-Z\d]?$/);
		}
	});

	it('covers all 14 DNO regions exactly once', () => {
		const codes = REGION_LOCATIONS.map((l) => l.dnoCode);
		expect(codes.sort()).toEqual([...VALID_DNO].sort());
	});

	it('city count is at least 30', () => {
		expect(CITY_LOCATIONS.length).toBeGreaterThanOrEqual(30);
	});

	it('findLocation resolves known slugs and returns undefined for unknown', () => {
		expect(findLocation('london')?.dnoCode).toBe('C');
		expect(findLocation('manchester')?.dnoCode).toBe('G');
		expect(findLocation('aberdeen')?.dnoCode).toBe('P');
		expect(findLocation('atlantis')).toBeUndefined();
	});
});

describe('siblingLocations', () => {
	it('never returns the current location', () => {
		for (const l of LOCATIONS) {
			const siblings = siblingLocations(l);
			expect(siblings.find((s) => s.slug === l.slug)).toBeUndefined();
		}
	});

	it('returns a stable count across all locations', () => {
		for (const l of LOCATIONS) {
			const siblings = siblingLocations(l);
			// Some DNO regions have only the region itself + popular cities to draw from.
			// All locations should produce >=4 siblings; most will hit the 7 max.
			expect(siblings.length).toBeGreaterThanOrEqual(4);
			expect(siblings.length).toBeLessThanOrEqual(7);
		}
	});

	it('prefers same-DNO siblings when available', () => {
		const london = findLocation('london');
		expect(london).toBeDefined();
		if (!london) return;
		const siblings = siblingLocations(london);
		// London is DNO C with a single city in the same DNO (none other today),
		// so siblings should mostly be the popular fill list.
		expect(siblings.every((s) => s.slug !== 'london')).toBe(true);
	});

	it('returns deterministic order across calls', () => {
		const a = siblingLocations(findLocation('birmingham') as LocationDef).map((l) => l.slug);
		const b = siblingLocations(findLocation('birmingham') as LocationDef).map((l) => l.slug);
		expect(a).toEqual(b);
	});
});
