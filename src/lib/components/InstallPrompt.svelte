<script lang="ts">
	/**
	 * `BeforeInstallPromptEvent` isn't in the standard DOM lib yet.
	 * Modelled minimally — we only call .prompt() and read .userChoice.
	 */
	interface BeforeInstallPromptEvent extends Event {
		prompt(): Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	const VISITS_KEY = 'ispc:visits';
	const SESSION_KEY = 'ispc:session';

	let prompt = $state<BeforeInstallPromptEvent | null>(null);
	let canShow = $state(false);
	let isIos = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;

		// Spec §8.1.3: surface the install affordance on the user's *second*
		// visit. We count distinct *sessions*, not page reloads — F5-fatigue
		// shouldn't graduate someone to "second-visit" status in 30 seconds.
		// sessionStorage is cleared when the tab/window closes, so its presence
		// proves we've already counted this session; absence = new session.
		try {
			const sessionMarked = sessionStorage.getItem(SESSION_KEY) === '1';
			let visits = Number(localStorage.getItem(VISITS_KEY) ?? '0');
			if (!sessionMarked) {
				visits += 1;
				localStorage.setItem(VISITS_KEY, String(visits));
				sessionStorage.setItem(SESSION_KEY, '1');
			}
			canShow = visits >= 2;
		} catch {
			// Private-browsing modes can throw on Storage access; treat as not eligible.
			canShow = false;
		}

		// iOS Safari never fires `beforeinstallprompt` and requires a manual
		// share-sheet flow. Detect it once so we can show a one-line hint
		// instead of a no-op button.
		isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);

		function onPrompt(event: Event) {
			event.preventDefault();
			prompt = event as BeforeInstallPromptEvent;
		}
		function onInstalled() {
			prompt = null;
		}
		window.addEventListener('beforeinstallprompt', onPrompt);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			window.removeEventListener('beforeinstallprompt', onPrompt);
			window.removeEventListener('appinstalled', onInstalled);
		};
	});

	async function install() {
		if (!prompt) return;
		try {
			await prompt.prompt();
			await prompt.userChoice;
		} finally {
			prompt = null;
		}
	}
</script>

{#if canShow && prompt}
	<button type="button" class="install" onclick={install}>add to home screen</button>
{:else if canShow && isIos && !prompt}
	<span class="hint">on iPhone: share <span aria-hidden="true">→</span> add to home screen</span>
{/if}

<style>
	.install {
		text-decoration: underline;
		text-underline-offset: 0.25em;
		opacity: 0.7;
		font-size: var(--micro-size);
		min-height: var(--touch-target);
		padding-inline: var(--space-3);
		display: inline-flex;
		align-items: center;
	}
	.install:hover,
	.install:focus-visible {
		opacity: 1;
	}
	.hint {
		font-size: var(--micro-size);
		opacity: var(--opacity-tertiary);
	}
</style>
