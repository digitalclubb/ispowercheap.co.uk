import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_POLL_INTERVAL_MS, startPolling } from './livePolling.js';
import type { NowAnswer } from './types.js';

/**
 * Vitest runs this suite in a node environment (no jsdom), so we wire up just
 * enough of the browser surface `startPolling` touches: a `window` (its mere
 * existence flips `startPolling` out of its SSR no-op branch), a `document`
 * with a mutable `visibilityState` and a tiny event registry, and `fetch`.
 */
function setupBrowserEnv() {
	const listeners: Record<string, Array<() => void>> = {};
	const doc = {
		visibilityState: 'visible' as DocumentVisibilityState,
		addEventListener(type: string, fn: () => void) {
			listeners[type] ??= [];
			listeners[type].push(fn);
		},
		removeEventListener(type: string, fn: () => void) {
			listeners[type] = (listeners[type] ?? []).filter((l) => l !== fn);
		},
	};
	function fireVisibilityChange(state: DocumentVisibilityState) {
		doc.visibilityState = state;
		for (const fn of listeners.visibilitychange ?? []) fn();
	}
	vi.stubGlobal('window', {});
	vi.stubGlobal('document', doc);
	return { doc, listeners, fireVisibilityChange };
}

const SAMPLE: NowAnswer = {
	state: 'yes',
	current: null,
	forecast: [],
	fetchedAt: '2026-05-12T12:00:00.000Z',
	region: { kind: 'national', label: 'Great Britain' },
	sources: ['carbonintensity.org.uk'],
};

const okJson = () =>
	new Response(JSON.stringify(SAMPLE), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});

describe('startPolling', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('is a no-op on the server (no window)', () => {
		const onUpdate = vi.fn();
		const stop = startPolling({ url: '/api/now', onUpdate });
		expect(onUpdate).not.toHaveBeenCalled();
		expect(typeof stop).toBe('function');
		stop();
	});

	it('does not fetch on start — the first poll fires after the interval', async () => {
		setupBrowserEnv();
		const fetchMock = vi.fn(async () => okJson());
		vi.stubGlobal('fetch', fetchMock);
		const onUpdate = vi.fn();

		const stop = startPolling({ url: '/api/now', onUpdate });
		expect(fetchMock).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(DEFAULT_POLL_INTERVAL_MS);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(onUpdate).toHaveBeenCalledWith(SAMPLE);
		stop();
	});

	it('keeps polling on the interval', async () => {
		setupBrowserEnv();
		const fetchMock = vi.fn(async () => okJson());
		vi.stubGlobal('fetch', fetchMock);

		const stop = startPolling({ url: '/api/now', onUpdate: vi.fn(), intervalMs: 1000 });
		await vi.advanceTimersByTimeAsync(3000);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		stop();
	});

	it('stops polling and detaches the visibility listener on teardown', async () => {
		const { listeners } = setupBrowserEnv();
		const fetchMock = vi.fn(async () => okJson());
		vi.stubGlobal('fetch', fetchMock);

		const stop = startPolling({ url: '/api/now', onUpdate: vi.fn(), intervalMs: 1000 });
		expect(listeners.visibilitychange).toHaveLength(1);

		stop();
		expect(listeners.visibilitychange).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(5000);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('pauses while hidden and refreshes immediately on return', async () => {
		const { fireVisibilityChange } = setupBrowserEnv();
		const fetchMock = vi.fn(async () => okJson());
		vi.stubGlobal('fetch', fetchMock);
		const onUpdate = vi.fn();

		const stop = startPolling({ url: '/api/now', onUpdate, intervalMs: 1000 });

		fireVisibilityChange('hidden');
		await vi.advanceTimersByTimeAsync(5000);
		expect(fetchMock).not.toHaveBeenCalled();

		fireVisibilityChange('visible');
		await vi.advanceTimersByTimeAsync(10); // well under the interval — this is the catch-up poll
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(onUpdate).toHaveBeenCalledWith(SAMPLE);

		await vi.advanceTimersByTimeAsync(1000);
		expect(fetchMock).toHaveBeenCalledTimes(2); // and the interval resumed
		stop();
	});

	it('swallows fetch rejections — onUpdate is skipped, polling continues', async () => {
		setupBrowserEnv();
		const fetchMock = vi.fn(async () => okJson()).mockRejectedValueOnce(new Error('offline'));
		vi.stubGlobal('fetch', fetchMock);
		const onUpdate = vi.fn();

		const stop = startPolling({ url: '/api/now', onUpdate, intervalMs: 1000 });

		await vi.advanceTimersByTimeAsync(1000);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(onUpdate).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1000);
		expect(onUpdate).toHaveBeenCalledWith(SAMPLE);
		stop();
	});

	it('ignores non-OK responses', async () => {
		setupBrowserEnv();
		const fetchMock = vi.fn(async () => new Response('nope', { status: 503 }));
		vi.stubGlobal('fetch', fetchMock);
		const onUpdate = vi.fn();

		const stop = startPolling({ url: '/api/now', onUpdate, intervalMs: 1000 });
		await vi.advanceTimersByTimeAsync(1000);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(onUpdate).not.toHaveBeenCalled();
		stop();
	});
});
