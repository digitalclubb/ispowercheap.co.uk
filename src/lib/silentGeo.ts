import { goto } from '$app/navigation';
import { normalizeOutcode } from './postcode.js';

/**
 * Silently refine the home-page region using the browser Geolocation API,
 * **only** when the user has already granted permission for this origin.
 *
 * Best-practice rationale: auto-prompting on page load is widely treated as a
 * UX anti-pattern and degrades permission-trust telemetry across all major
 * browsers. We render the IP-derived answer first, then upgrade silently for
 * returning visitors who've granted permission — no surprise prompts.
 *
 * Returns true if a navigation was triggered (caller may want to show a
 * cross-fade), false otherwise.
 */
export async function refineRegionSilently(currentPostcode?: string): Promise<boolean> {
	if (typeof navigator === 'undefined' || !navigator.geolocation) return false;

	let permissionState: PermissionState;
	try {
		const status = await navigator.permissions.query({ name: 'geolocation' });
		permissionState = status.state;
	} catch {
		// permissions.query throws on unknown names in older browsers; treat as unsupported.
		return false;
	}

	if (permissionState !== 'granted') return false;

	let pos: GeolocationPosition;
	try {
		pos = await new Promise<GeolocationPosition>((resolve, reject) => {
			navigator.geolocation.getCurrentPosition(resolve, reject, {
				timeout: 8000,
				maximumAge: 60_000,
			});
		});
	} catch {
		return false;
	}

	const lat = Math.round(pos.coords.latitude * 1000) / 1000;
	const lon = Math.round(pos.coords.longitude * 1000) / 1000;

	let outcode: string | null = null;
	try {
		const res = await fetch(`https://api.postcodes.io/postcodes?lat=${lat}&lon=${lon}`, {
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) return false;
		const json = (await res.json()) as { result?: Array<{ outcode?: string }> };
		outcode = normalizeOutcode(json.result?.[0]?.outcode);
	} catch {
		return false;
	}

	if (!outcode) return false;
	if (currentPostcode && outcode === currentPostcode.toUpperCase()) return false;

	await goto(`/?postcode=${encodeURIComponent(outcode)}`, { invalidateAll: true });
	return true;
}
