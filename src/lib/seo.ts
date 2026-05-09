import type { LocationDef } from './locations.js';
import type { StateKey } from './types.js';

export const ORIGIN = 'https://ispowercheap.co.uk';

/**
 * Plain-English answer text used by JSON-LD structured data and the
 * dynamic meta description. Stable per state — the live numeric forecast
 * lives in the page body, not in the indexed meta.
 */
const STATE_ANSWER: Record<StateKey, string> = {
	yes: 'Yes — electricity is cheap right now. Carbon intensity is in the low band; a good time to charge the EV or run the dishwasher.',
	sortof:
		'Sort of — middle of today’s range. Carbon intensity is moderate; not the cheapest hour but not the worst either.',
	no: 'No — wait if you can. Carbon intensity is high right now; consider deferring big electricity uses.',
	unknown: 'We don’t know right now — the upstream live data feed is unavailable. Reload to retry.',
};

export function describeAnswer(state: StateKey, locationName?: string): string {
	const base = STATE_ANSWER[state];
	if (!locationName) return base;
	// UNKNOWN is about *our* feed being down, not about the location, so the
	// "In London: …" prefix would mislead. Other states correctly localise.
	if (state === 'unknown') {
		return `Live data feed for ${locationName} is unavailable. Reload to retry.`;
	}
	return `In ${locationName}: ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
}

/**
 * Serialise an object as JSON for inline `<script type="application/ld+json">`
 * embedding. JSON.stringify alone leaves `</script>` intact in any contained
 * string, which would terminate the surrounding script tag — so escape `<`
 * to its Unicode form. No other characters need escaping for HTML embedding.
 */
export function safeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

interface FaqJsonLdInput {
	question: string;
	answer: string;
	url: string;
}

export function faqJsonLd({ question, answer, url }: FaqJsonLdInput): string {
	return safeJsonLd({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		url,
		mainEntity: [
			{
				'@type': 'Question',
				name: question,
				acceptedAnswer: { '@type': 'Answer', text: answer },
			},
		],
	});
}

export function websiteJsonLd(): string {
	return safeJsonLd({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'ispowercheap.co.uk',
		alternateName: 'is power cheap',
		url: ORIGIN,
		inLanguage: 'en-GB',
		description:
			'Live answer to whether electricity is cheap right now in the UK, based on real-time grid carbon intensity from the National Energy System Operator.',
	});
}

interface LocationJsonLdInput {
	location: LocationDef;
	url: string;
}

/**
 * Geographic JSON-LD for a location page. Cities use `City`; DNO regions
 * (which aren't formal cities) use `AdministrativeArea`. Both are valid
 * schema.org types and Google understands them as Place subtypes.
 */
export function locationJsonLd({ location, url }: LocationJsonLdInput): string {
	const type = location.kind === 'city' ? 'City' : 'AdministrativeArea';
	return safeJsonLd({
		'@context': 'https://schema.org',
		'@type': type,
		name: location.name,
		url,
		containedInPlace: { '@type': 'Country', name: 'United Kingdom' },
		address: { '@type': 'PostalAddress', addressCountry: 'GB' },
	});
}

interface ItemListJsonLdInput {
	url: string;
	items: ReadonlyArray<{ name: string; url: string }>;
}

export function itemListJsonLd({ url, items }: ItemListJsonLdInput): string {
	return safeJsonLd({
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		url,
		numberOfItems: items.length,
		itemListElement: items.map((item, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: item.name,
			url: item.url,
		})),
	});
}
