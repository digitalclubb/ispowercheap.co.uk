// Every time on the page is UK wall-clock time, whatever the runtime's zone.
// Workers run in UTC, so without this the server render was an hour out all
// summer (BST) and hydration kept the wrong text.
const TIME = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/London',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});
const DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'short' });

/**
 * Format an ISO 8601 timestamp as UK `HH:mm` (24-hour).
 * Returns an empty string on any parsing failure rather than throwing —
 * the call sites all use it inside a render path.
 */
export function formatTime(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? '' : TIME.format(d);
}

/**
 * Like `formatTime`, but appends a non-breaking space + "tomorrow" when `iso`
 * falls on a later UK calendar day than `referenceIso`. The forecast window
 * never reaches beyond tomorrow, so one suffix covers it. Falls back to bare
 * `HH:mm` when the reference is unparseable.
 */
export function formatTimeWithDay(iso: string, referenceIso: string): string {
	const time = formatTime(iso);
	const ref = new Date(referenceIso);
	if (!time || Number.isNaN(ref.getTime())) return time;
	return DAY.format(new Date(iso)) === DAY.format(ref) ? time : `${time}\u00a0tomorrow`;
}
