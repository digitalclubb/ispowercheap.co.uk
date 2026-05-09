import type { NowAnswer } from './types.js';

/**
 * Default polling interval. Carbon Intensity publishes every 30 minutes, so a
 * 5-minute interval is plenty fresh and cheap. Page Visibility API gates
 * everything: hidden tabs don't poll, and the first request fires
 * immediately when a hidden tab becomes visible (so a user returning after
 * 25 minutes gets a fresh answer the moment they look).
 */
export const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;

interface StartPollingOptions {
	/** URL of the same-origin JSON endpoint to poll (e.g. `/api/now?postcode=SW1A`). */
	url: string;
	/** Called whenever a fresh answer arrives. Caller decides what to do with it. */
	onUpdate: (answer: NowAnswer) => void;
	intervalMs?: number;
}

/**
 * Start polling a JSON endpoint at a regular interval, gated on tab visibility.
 *
 * Returns a teardown function that stops the timer and detaches the
 * `visibilitychange` listener. Wire it to a Svelte `$effect` cleanup so
 * polling stops when the component unmounts.
 *
 * Cost shape: while the tab is visible, one fetch every `intervalMs`. The
 * /api/now edge cache (s-maxage=60) absorbs duplicates across users; per-user
 * cost is roughly one Vercel invocation every 5 minutes. A user keeping the
 * page open for an hour is ~12 invocations.
 */
export function startPolling({
	url,
	onUpdate,
	intervalMs = DEFAULT_POLL_INTERVAL_MS,
}: StartPollingOptions): () => void {
	if (typeof window === 'undefined') return () => {};

	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;

	async function poll(): Promise<void> {
		if (stopped) return;
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
			if (!res.ok) return;
			const json = (await res.json()) as NowAnswer;
			if (!stopped) onUpdate(json);
		} catch {
			// Polling failures are silent — the previous answer stays on screen.
		}
	}

	function schedule(): void {
		if (stopped || document.visibilityState !== 'visible') return;
		timer = setTimeout(async () => {
			await poll();
			schedule();
		}, intervalMs);
	}

	function onVisibilityChange(): void {
		if (stopped) return;
		if (document.visibilityState === 'visible') {
			// Resumed — refresh now (in case the tab was hidden through a
			// settlement-period boundary) and reschedule.
			void poll().then(schedule);
		} else if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	document.addEventListener('visibilitychange', onVisibilityChange);
	schedule();

	return () => {
		stopped = true;
		if (timer) clearTimeout(timer);
		document.removeEventListener('visibilitychange', onVisibilityChange);
	};
}
