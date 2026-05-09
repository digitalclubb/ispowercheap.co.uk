# ispowercheap.co.uk

A single-page UK public utility that answers **"is electricity cheap right now?"** in plain English.
The full v1 spec lives at `spec.md`. This file holds context that should bias every Claude session in this repo.

## Tech stack

- **pnpm + SvelteKit + Vercel adapter** (Node.js 22 runtime, no edge — sharp dependency).
- **TypeScript strict.**
- **Vanilla CSS with custom properties.** No Tailwind, no SCSS, no CSS-in-JS.
- **Biome** for lint + format. **Vitest** for unit tests.
- **Headline font:** Inter weight 900, subsetted to ~12 glyphs (`pnpm subset` regenerates it). Body uses `system-ui`.
- **Data sources:** Carbon Intensity API (primary, free, CORS-OK), Octopus Agile API (server-side proxied, no CORS), postcodes.io (postcode → outward).
- **PWA in v1:** manifest, service worker, install affordance, offline last-known-answer.

## Common commands

```
pnpm dev          # dev server (auto-detects free port)
pnpm test         # vitest run (chip logic, parsePoint, locations)
pnpm check        # svelte-check + tsc (whole repo)
pnpm build        # vercel-ready build
pnpm subset       # regen headline font (only if state words change)
pnpm icons        # regen PWA PNGs from src/lib/assets/bolt.png
```

## Repo conventions

### State + region

- **State words live at `src/lib/state.ts`** — `YES`, `SORT OF`, `NO`, `UNKNOWN`. Adding a new word requires re-running `pnpm subset` so the headline font covers the new glyphs.
- **State derivation is the API's `index` field**, not a locally-computed band. `very low`/`low → YES`, `moderate → SORT OF`, `high`/`very high → NO`. The API's national distribution is more authoritative than anything we'd compute.
- **Region resolution priority** in `src/lib/server/region.ts`: URL `?postcode=` → Vercel `x-vercel-ip-postal-code` (when country is GB) → national fallback. Returns `{ region, source: 'url' | 'header' | 'national' }`; the route handler uses `source` to pick `cacheHeadersFor()`.
- **`?state=yes|sortof|no|unknown` is a debug-only override** in `+page.server.ts`. The `/api/now` JSON endpoint deliberately ignores it. Cache TTL is computed from the *real* state (pre-override), not the rendered state.

### Cache + abuse defence

- **`cacheHeadersFor(source, state)`** in `src/lib/server/answer.ts` is the single source of truth for `Cache-Control` + `Vary`. Header-derived responses get `private, max-age=60` (never enters Vercel's shared edge cache); URL/national-derived get `public, s-maxage=60, swr=300`. UNKNOWN gets short TTLs (10 s).
- **`hooks.server.ts canonicalise()`** 308-redirects unknown query params to the canonical URL. Per-pathname allowlist is `ALLOWED_PARAMS`; dynamic routes use `DYNAMIC_NO_PARAM_PATHS` regexes. **It's fail-open** — pathnames not in the table pass through unchanged. When adding a new route, add it to `ALLOWED_PARAMS`.
- **Security headers** (CSP, HSTS, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy) are set centrally in `hooks.server.ts`. CSP keeps `'unsafe-inline'` for script-src + style-src — required by SvelteKit hydration today.
- **Rate limiting belongs at Vercel WAF**, not in code. Recommend 60 req/min/IP across `/`, `/api/*`, `/og.png`. In-memory limiters on serverless are unreliable across cold-starts.

### Live data

- **Live polling** via `src/lib/livePolling.ts` `startPolling({ url, onUpdate })`. 5-minute interval, gated on `document.visibilityState === 'visible'`. Hidden tabs pause; returning to a hidden tab triggers an immediate refresh + reschedule. State changes cross-fade via the CSS transition on `main`'s `background-color`/`color`.
- **Polling persists across cache-key boundaries**: when navigating between regions, `polledAnswer` is reset (`$effect` watches `data.answer.region.label`) so stale polled data doesn't bleed across URLs.
- **Silent geolocation refinement** via `src/lib/silentGeo.ts` `refineRegionSilently(currentPostcode)`. Best practice — **no auto-prompt on page load**. Only acts when `navigator.permissions.query({ name: 'geolocation' })` returns `state: 'granted'`, i.e. for returning visitors. Only on the home page when there's no explicit `?postcode=` (we never override a deliberate user choice).
- **`Timestamps.svelte`** shows `as of HH:mm · loaded HH:mm`. The "loaded" time is set in a `$effect` that runs once on hydration and intentionally has no reactive deps — it stays at original page-load time, doesn't update with each poll. Polling updates `current.from` (the "as of" time).
- **`Outlook.svelte`** shows `cheapest HH:mm · peak HH:mm` for upcoming forecast extremes. Computed by `findUpcomingExtremes(forecast, Date.now())` in `src/lib/forecast.ts` — strictly future periods only. Hides when forecast is empty (UNKNOWN) or flat. Most useful in SORT OF state where it answers "should I wait?".

### SEO

- **SEO meta** (title, description, canonical, JSON-LD) is per-page via `<svelte:head>`. A brand-level `<meta name="description">` fallback exists in `app.html` so future routes that forget one still ship something; per-page descriptions add specificity Google generally prefers.
- **`src/lib/seo.ts`** helpers: `describeAnswer(state, locationName?)`, `faqJsonLd()`, `websiteJsonLd()`, `locationJsonLd()` (City for cities, AdministrativeArea for DNO regions), `itemListJsonLd()` (used on `/region` index), `safeJsonLd()` (escapes `<` to defend against `</script>` injection — all helpers route through it). Use these, don't hand-roll.
- **Location landing pages** at `/region/[slug]` are driven by `src/lib/locations.ts` (44 entries: 14 DNO regions + 30 cities). `findLocation(slug)` resolves; `siblingLocations(current)` computes ~7 deterministic cross-link siblings (same DNO first, popular fillers second). Adding/removing locations auto-updates `/sitemap.xml`. `pnpm test` includes slug-uniqueness, DNO-coverage, postcode-shape and sibling-determinism checks in `locations.test.ts`.
- **Title shape**: home page is `STATE, headline — brand`; region pages are `Is electricity cheap in {Location}? — brand` (question-shaped to match search queries).

### PWA + assets

- **Brand mark source: `src/lib/assets/bolt.png`** (transparent background expected). `pnpm icons` reads it and writes 8 PNG sizes to `static/`. `og.png` route also reads it via SvelteKit's `read()` for the OG mark.
- **Sharp powers `/og.png`** (server-rendered 1200×630). It needs the Node.js runtime; do not move that route to edge. Uses `compressionLevel: 6, effort: 1` for a sweet spot between size and CPU. Module-scope cache holds the resized brand mark so sharp only resizes once per Lambda lifetime.
- **Service worker auto-registers** because `src/service-worker.ts` exists. Caches only 200 responses (no sticky 5xx), runtime cache capped at 32 entries FIFO, navigation fallback queries all caches via `caches.match('/')`. Use `pnpm preview` (not `pnpm dev`) to test SW behaviour locally.
- **Dev-mode SW safety net** in `+layout.svelte`: if a previous `pnpm preview` left a SW registered, it can serve stale HTML referencing production-hashed asset paths during a subsequent `pnpm dev` session — broken layout. The layout `$effect` detects any leftover registration in dev mode, unregisters it, purges all caches, and reloads once. Stripped from production builds via `import.meta.env.DEV`. No-op when no SW is registered (cannot loop).
- **Production SW upgrade safety net** in `+layout.svelte`: when a new build's SW activates and calls `clients.claim()`, the page may have already rendered against the old build's HTML (referencing asset hashes the new SW's `PRECACHE_SET` doesn't have). The `controllerchange` listener detects the SW transition and reloads once. `alreadyHadController` guard prevents first-load reload-loop.
- **Critical-asset failure recovery** in `+layout.svelte`: if any `/_app/immutable/` resource 404s (the symptom of a SW stuck on a build whose hashes are gone from origin), the layout's resource-error capture handler unregisters the SW, purges all caches, and reloads. Guarded by `sessionStorage` so it cannot loop on unrecoverable errors.
- **Octopus Agile product code** is hard-coded as `AGILE-24-10-01` in `src/lib/server/octopus.ts`. Octopus rolls these forward; if rates start coming back stale, fetch `/v1/products/?brand=OCTOPUS_ENERGY&is_variable=true` to find the current code.
- **Skeleton loading pattern** in `AgileOverlay.svelte` — `.skeleton` blocks use `var(--surface-soft)` (token tints to currentColor automatically), 1.6 s opacity pulse (1.0 → 0.5 → 1.0), `aria-busy`, `.visually-hidden` text for screen readers. Reuse this shape for any future async loading state.
- **Install affordance** (`InstallPrompt.svelte`) gates on `localStorage` visit count ≥ 2, deduped per session via `sessionStorage` so reloads don't inflate the count. iOS shows a `share → add to home screen` hint instead (no `beforeinstallprompt` on iOS Safari).
- **Vercel Web Analytics** is enabled via `injectAnalytics()` in `+layout.svelte`. Anonymous, no cookies, no PII, GDPR-compliant — that's why we get away without a consent banner. Beacons go to same-origin `/_vercel/insights/*` (Vercel proxies them) so the existing `connect-src 'self'` CSP covers it. Only active on Vercel deployments; no-op locally. View metrics in the Vercel dashboard's Analytics tab.

### Post-deploy SEO checklist

(One-time, can't do from code:)

1. Submit `https://ispowercheap.co.uk/sitemap.xml` to Google Search Console.
2. Submit the same to Bing Webmaster Tools.
3. Verify domain ownership via DNS TXT or the Vercel-served `/.well-known` route.
4. Watch the Coverage report for the 47 URLs to be indexed (typical: 1–3 weeks).
5. Add a Vercel WAF rate-limit rule: 60 req/min/IP across `/`, `/api/*`, `/og.png`.

---

## Design Context

### Users

UK households making everyday energy decisions: when to charge the EV, run the dishwasher, dry the washing, fire up the immersion heater. They're standing in the kitchen or walking home — they want a single answer in under a second, not a dashboard. They span the full UK consumer range (most are on fixed-rate tariffs; a small minority are on Octopus Agile and see real-time prices).

The job: **answer "is electricity cheap right now?" in plain English, before they've finished asking it.**

### Brand Personality

Three words: **honest, civic, calm.**

The product is positioned as a public utility, not a marketing site or a startup. Trust is earned by feeling like infrastructure — like an old weather indicator, not a SaaS product. Lower-case declarative copy. No exclamation marks. No emoji. No newsletter. No cookie banner.

Reference: **isitchristmas.com** (Eric Mill / Konklone). Anti-references: corporate-cyan dashboards, glassmorphism, gradient hero metrics, energy-tech startups with neon accents on dark backgrounds.

### Aesthetic Direction

**Konklone-pure brutalist.** Commit to one bold word above the fold, on a full-viewport background tinted to match the state. The address bar tints to match via `<meta name="theme-color">`. Everything else lives below the fold or in muted secondary type.

- **Headline font:** Inter weight 900, subsetted to ~12 glyphs (Y E S O R T F N U K W + space) — ~1.7 KB self-hosted WOFF2, preloaded. Used only on the answer word.
- **Body font:** `system-ui` everywhere else. No round-trip, no FOUT, deliberate typographic hierarchy.
- **Palette:** Okabe-Ito-derived ternary state colours (green `#0E7C3A` / amber `#E69F00` / red `#B3261E`) plus slate `#1F2937` for unknown. WCAG AA on the paired text colour. Dark-mode variants nudged 10% lighter. Colour is paired with both a shape (filled circle / triangle / octagon / square) and a word — colour-blind users get the answer from any one of three signals.
- **No gradients, no glassmorphism, no shadows, no rounded cards, no decorative sparklines.** The 24h forecast bar chart is functional, not decorative.
- **Motion:** none on first paint. The state colour just *is*. The only acceptable motion is a 200 ms cross-fade if state changes while the page is open. `prefers-reduced-motion` is respected globally.

### Design Principles

1. **The answer is the design.** The single biggest typographic element on the page is the answer word. Everything else is supporting. If a feature competes with the headline, it doesn't ship above the fold.
2. **Three signals, never one.** State is communicated by colour AND shape AND word — colour-blind users, screen readers, and 4-year-olds all get the answer.
3. **Trust through restraint.** No marketing chrome. No logo. No nav. No popups. The site looks like a public utility because that's what it is.
4. **System-ui by default, web fonts only where they earn their byte.** The headline gets a self-hosted subset font; everything else uses the OS stack.
5. **Honest about what we know.** Carbon intensity is the cheap-or-not signal for everyone; price overlay is opt-in for Agile users only. We never pretend a fixed-rate user's bill changes by half-hour.
6. **PWA-first for users on the go.** Installable, offline-resilient last-known answer, theme-color tints the launcher. The product belongs on a home screen, not behind a login.
7. **Free, no login, no email gate, no cookie banner.** Trust dies the moment we ask.
