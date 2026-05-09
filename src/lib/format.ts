/**
 * Format an ISO 8601 timestamp as `HH:mm` in en-GB (24-hour).
 * Returns an empty string on any parsing failure rather than throwing —
 * the call sites all use it inside a render path where a thrown error
 * would crash the section for everyone.
 */
export function formatTime(iso: string): string {
	try {
		return new Date(iso).toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});
	} catch {
		return '';
	}
}
