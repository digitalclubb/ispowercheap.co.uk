// See https://svelte.dev/docs/kit/types#app
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			/** Cloudflare request geo (subset of IncomingRequestCfProperties). */
			cf?: { country?: string; postalCode?: string };
		}
	}
}

export {};
