/**
 * UK locations served by /region/[slug] landing pages.
 *
 * 14 DNO regions (the canonical UK power-distribution geography, codes A–P
 * with no I) plus the 30 most-searched UK cities. Each entry maps to a
 * representative outward postcode that the Carbon Intensity API resolves
 * cleanly for the regional endpoint.
 *
 * SEO purpose: a separate URL per location so we can rank for
 * "is electricity cheap in {city}" / "{region} electricity costs" queries.
 * Spec & rationale in the SEO review thread.
 */
export interface LocationDef {
	/** URL slug — used at `/region/{slug}`. Must be lowercase, hyphenated. */
	slug: string;
	/** Display name for h1, copy, sitemap. */
	name: string;
	/** Whether the slug represents a DNO region or a specific city within one. */
	kind: 'region' | 'city';
	/** DNO region letter (Carbon Intensity API + Octopus Agile). */
	dnoCode: string;
	/** UK Power Networks / regional operator name, for body copy. */
	dnoName: string;
	/** Representative outward postcode that resolves cleanly on the
	 *  Carbon Intensity regional endpoint. */
	postcode: string;
}

export const LOCATIONS: ReadonlyArray<LocationDef> = [
	// 14 DNO regions — canonical UK power-distribution geography.
	{
		slug: 'eastern-england',
		name: 'Eastern England',
		kind: 'region',
		dnoCode: 'A',
		dnoName: 'UK Power Networks',
		postcode: 'CB1',
	},
	{
		slug: 'east-midlands',
		name: 'East Midlands',
		kind: 'region',
		dnoCode: 'B',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'NG1',
	},
	{
		slug: 'london',
		name: 'London',
		kind: 'region',
		dnoCode: 'C',
		dnoName: 'UK Power Networks',
		postcode: 'SW1A',
	},
	{
		slug: 'merseyside-north-wales',
		name: 'Merseyside & North Wales',
		kind: 'region',
		dnoCode: 'D',
		dnoName: 'SP Energy Networks',
		postcode: 'L1',
	},
	{
		slug: 'west-midlands',
		name: 'West Midlands',
		kind: 'region',
		dnoCode: 'E',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'B1',
	},
	{
		slug: 'north-east-england',
		name: 'North East England',
		kind: 'region',
		dnoCode: 'F',
		dnoName: 'Northern Powergrid',
		postcode: 'NE1',
	},
	{
		slug: 'north-west-england',
		name: 'North West England',
		kind: 'region',
		dnoCode: 'G',
		dnoName: 'Electricity North West',
		postcode: 'M1',
	},
	{
		slug: 'southern-england',
		name: 'Southern England',
		kind: 'region',
		dnoCode: 'H',
		dnoName: 'SSEN',
		postcode: 'SO14',
	},
	{
		slug: 'south-east-england',
		name: 'South East England',
		kind: 'region',
		dnoCode: 'J',
		dnoName: 'UK Power Networks',
		postcode: 'BN1',
	},
	{
		slug: 'south-wales',
		name: 'South Wales',
		kind: 'region',
		dnoCode: 'K',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'CF10',
	},
	{
		slug: 'south-west-england',
		name: 'South West England',
		kind: 'region',
		dnoCode: 'L',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'BS1',
	},
	{
		slug: 'yorkshire',
		name: 'Yorkshire',
		kind: 'region',
		dnoCode: 'M',
		dnoName: 'Northern Powergrid',
		postcode: 'LS1',
	},
	{
		slug: 'southern-scotland',
		name: 'Southern Scotland',
		kind: 'region',
		dnoCode: 'N',
		dnoName: 'SP Energy Networks',
		postcode: 'G1',
	},
	{
		slug: 'northern-scotland',
		name: 'Northern Scotland',
		kind: 'region',
		dnoCode: 'P',
		dnoName: 'SSEN',
		postcode: 'AB10',
	},

	// Cities — high-search-volume locations, mapped to their DNO.
	{
		slug: 'birmingham',
		name: 'Birmingham',
		kind: 'city',
		dnoCode: 'E',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'B1',
	},
	{
		slug: 'manchester',
		name: 'Manchester',
		kind: 'city',
		dnoCode: 'G',
		dnoName: 'Electricity North West',
		postcode: 'M1',
	},
	{
		slug: 'leeds',
		name: 'Leeds',
		kind: 'city',
		dnoCode: 'M',
		dnoName: 'Northern Powergrid',
		postcode: 'LS1',
	},
	{
		slug: 'glasgow',
		name: 'Glasgow',
		kind: 'city',
		dnoCode: 'N',
		dnoName: 'SP Energy Networks',
		postcode: 'G1',
	},
	{
		slug: 'edinburgh',
		name: 'Edinburgh',
		kind: 'city',
		dnoCode: 'N',
		dnoName: 'SP Energy Networks',
		postcode: 'EH1',
	},
	{
		slug: 'liverpool',
		name: 'Liverpool',
		kind: 'city',
		dnoCode: 'D',
		dnoName: 'SP Energy Networks',
		postcode: 'L1',
	},
	{
		slug: 'bristol',
		name: 'Bristol',
		kind: 'city',
		dnoCode: 'L',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'BS1',
	},
	{
		slug: 'sheffield',
		name: 'Sheffield',
		kind: 'city',
		dnoCode: 'M',
		dnoName: 'Northern Powergrid',
		postcode: 'S1',
	},
	{
		slug: 'newcastle',
		name: 'Newcastle',
		kind: 'city',
		dnoCode: 'F',
		dnoName: 'Northern Powergrid',
		postcode: 'NE1',
	},
	{
		slug: 'nottingham',
		name: 'Nottingham',
		kind: 'city',
		dnoCode: 'B',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'NG1',
	},
	{
		slug: 'southampton',
		name: 'Southampton',
		kind: 'city',
		dnoCode: 'H',
		dnoName: 'SSEN',
		postcode: 'SO14',
	},
	{
		slug: 'portsmouth',
		name: 'Portsmouth',
		kind: 'city',
		dnoCode: 'H',
		dnoName: 'SSEN',
		postcode: 'PO1',
	},
	{
		slug: 'cambridge',
		name: 'Cambridge',
		kind: 'city',
		dnoCode: 'A',
		dnoName: 'UK Power Networks',
		postcode: 'CB1',
	},
	{ slug: 'oxford', name: 'Oxford', kind: 'city', dnoCode: 'H', dnoName: 'SSEN', postcode: 'OX1' },
	{
		slug: 'cardiff',
		name: 'Cardiff',
		kind: 'city',
		dnoCode: 'K',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'CF10',
	},
	{
		slug: 'swansea',
		name: 'Swansea',
		kind: 'city',
		dnoCode: 'K',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'SA1',
	},
	{
		slug: 'aberdeen',
		name: 'Aberdeen',
		kind: 'city',
		dnoCode: 'P',
		dnoName: 'SSEN',
		postcode: 'AB10',
	},
	{
		slug: 'inverness',
		name: 'Inverness',
		kind: 'city',
		dnoCode: 'P',
		dnoName: 'SSEN',
		postcode: 'IV1',
	},
	{
		slug: 'coventry',
		name: 'Coventry',
		kind: 'city',
		dnoCode: 'E',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'CV1',
	},
	{
		slug: 'leicester',
		name: 'Leicester',
		kind: 'city',
		dnoCode: 'B',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'LE1',
	},
	{
		slug: 'brighton',
		name: 'Brighton',
		kind: 'city',
		dnoCode: 'J',
		dnoName: 'UK Power Networks',
		postcode: 'BN1',
	},
	{
		slug: 'norwich',
		name: 'Norwich',
		kind: 'city',
		dnoCode: 'A',
		dnoName: 'UK Power Networks',
		postcode: 'NR1',
	},
	{
		slug: 'reading',
		name: 'Reading',
		kind: 'city',
		dnoCode: 'H',
		dnoName: 'SSEN',
		postcode: 'RG1',
	},
	{
		slug: 'plymouth',
		name: 'Plymouth',
		kind: 'city',
		dnoCode: 'L',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'PL1',
	},
	{
		slug: 'exeter',
		name: 'Exeter',
		kind: 'city',
		dnoCode: 'L',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'EX1',
	},
	{
		slug: 'bradford',
		name: 'Bradford',
		kind: 'city',
		dnoCode: 'M',
		dnoName: 'Northern Powergrid',
		postcode: 'BD1',
	},
	{
		slug: 'hull',
		name: 'Hull',
		kind: 'city',
		dnoCode: 'M',
		dnoName: 'Northern Powergrid',
		postcode: 'HU1',
	},
	{
		slug: 'preston',
		name: 'Preston',
		kind: 'city',
		dnoCode: 'G',
		dnoName: 'Electricity North West',
		postcode: 'PR1',
	},
	{
		slug: 'derby',
		name: 'Derby',
		kind: 'city',
		dnoCode: 'B',
		dnoName: 'National Grid Electricity Distribution',
		postcode: 'DE1',
	},
	{
		slug: 'york',
		name: 'York',
		kind: 'city',
		dnoCode: 'M',
		dnoName: 'Northern Powergrid',
		postcode: 'YO1',
	},
];

export function findLocation(slug: string): LocationDef | undefined {
	return LOCATIONS.find((l) => l.slug === slug);
}

export const REGION_LOCATIONS = LOCATIONS.filter((l) => l.kind === 'region');
export const CITY_LOCATIONS = LOCATIONS.filter((l) => l.kind === 'city');

/** Cities that anchor the "popular" cross-link list when a location has no
 *  same-DNO siblings to show. Picked for search volume + geographic spread. */
const POPULAR_CITY_SLUGS: ReadonlyArray<string> = [
	'london',
	'birmingham',
	'manchester',
	'leeds',
	'glasgow',
	'bristol',
	'cardiff',
	'edinburgh',
];

/**
 * Compute up to 7 cross-link siblings for a location page.
 *
 * Strategy: prefer locations in the same DNO region (gives readers / Google
 * a natural geographic neighbourhood), then fill from a popular-cities list
 * picked for search-volume + spread. Always excludes the current location;
 * always returns a deterministic order so the link cluster is cacheable.
 */
export function siblingLocations(current: LocationDef, max = 7): ReadonlyArray<LocationDef> {
	const sameDno = LOCATIONS.filter((l) => l.dnoCode === current.dnoCode && l.slug !== current.slug);
	const popular: LocationDef[] = [];
	for (const slug of POPULAR_CITY_SLUGS) {
		const loc = findLocation(slug);
		if (loc && loc.slug !== current.slug && loc.dnoCode !== current.dnoCode) {
			popular.push(loc);
		}
	}
	const seen = new Set<string>();
	const result: LocationDef[] = [];
	for (const l of [...sameDno, ...popular]) {
		if (seen.has(l.slug)) continue;
		seen.add(l.slug);
		result.push(l);
		if (result.length >= max) break;
	}
	return result;
}
