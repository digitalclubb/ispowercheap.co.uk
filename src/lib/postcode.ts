/**
 * Pull the outward-postcode part out of arbitrary input.
 * Accepts: "sw1a 2dr", "SW1A2DR", "M1", "B33 8TH", "DH99 1NS"
 * Returns: the outward part uppercased, or null if no valid outcode found.
 *
 * UK outcode shape: 1–2 letters, then a digit, then an optional letter-or-digit.
 */
const OUTCODE_PREFIX = /^([A-Z]{1,2}\d[A-Z\d]?)/;

export function normalizeOutcode(input: string | null | undefined): string | null {
	if (!input) return null;
	const cleaned = input.trim().toUpperCase();
	const match = cleaned.match(OUTCODE_PREFIX);
	return match ? match[1] : null;
}
