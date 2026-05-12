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

/**
 * Like `formatTime`, but appends a non-breaking space + "tomorrow" when `iso`
 * falls on a different (always later, for the forecast times this is used on)
 * calendar day than `referenceIso` — both compared in the viewer's local
 * timezone. Forecast times can land just past midnight, where a bare `09:00`
 * reads as nine hours ago; the forecast window never reaches beyond tomorrow,
 * so a single "tomorrow" suffix covers it. The space is non-breaking so the
 * time and "tomorrow" never wrap onto separate lines. Falls back to bare
 * `HH:mm` on any parse failure, same as `formatTime`.
 */
export function formatTimeWithDay(iso: string, referenceIso: string): string {
	const time = formatTime(iso);
	if (!time) return time;
	try {
		const d = new Date(iso);
		const ref = new Date(referenceIso);
		if (Number.isNaN(d.getTime()) || Number.isNaN(ref.getTime())) return time;
		const sameDay =
			d.getFullYear() === ref.getFullYear() &&
			d.getMonth() === ref.getMonth() &&
			d.getDate() === ref.getDate();
		return sameDay ? time : `${time} tomorrow`;
	} catch {
		return time;
	}
}
