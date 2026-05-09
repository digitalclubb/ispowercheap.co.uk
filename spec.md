# ispowercheap.co.uk — v1 Specification

A single-page public utility that answers one question for UK households:
**Is electricity cheap right now?**

Answer is `YES` / `SORT OF` / `NO`, rendered above the fold in a single huge word, on a full-viewport background tinted to match. Free, no login, no email gate, no cookie banner, no app required.

---

## 1. Positioning

The market gap (validated by competitor research):

- **Octopus Agile tools** (energy-stats.uk, agileprices.co.uk, agilebuddy.uk, octoprice) serve ~5% of UK households with real half-hourly retail prices. Useless to the other 95%.
- **Carbon-intensity tools** (carbonintensity.org.uk, GridCarbon, Electricity Maps) serve everyone but feel scientific/eco-niche, not domestic.
- **Nobody** fuses them into a plain-English "yes / sort-of / no" answer aimed at a household deciding whether to put the dishwasher on.

ispowercheap.co.uk's position: **the carbon-intensity ecosystem has the right data and wrong audience; the Agile ecosystem has the right answer and wrong tariff coverage; nobody has fused them into a single, plain-English, geo-aware "yes/no" answer.** That gap is v1.

---

## 2. Audience and answer model

**Primary audience:** every UK household (carbon-intensity-led).
**Secondary:** Octopus Agile customers (price overlay, opt-in).

**Why carbon-intensity-led, not price-led:**
~95% of UK households pay a fixed unit rate. For them, "is electricity cheap?" cannot be answered honestly in money — their bill is the same at 3am or 6pm. The only honest "should I use power now?" signal is **carbon intensity**: when wind/solar are meeting most of demand, the grid is greener and (over time) wholesale prices push fixed rates down. So we say "yes, it's cheap" when **carbon intensity is in the bottom band for the country/region**, with a one-line reason ("wind is meeting 62% of demand right now").

For the Agile minority who *do* see real-time prices, an opt-in price overlay shows their actual half-hourly rate.

**State derivation:**

| State | Carbon Intensity API `index` | Spoken word |
|---|---|---|
| YES | `very low`, `low` | "yes — power is cheap right now" |
| SORT OF | `moderate` | "sort of — middle of today's range" |
| NO | `high`, `very high` | "no — wait if you can" |
| UNKNOWN | data fetch failed / >45 min stale | "we don't know right now — sorry" |

We use the API's `index` field as the canonical state. The API is run by NESO + EDF + Oxford + WWF and computes the bands from a UK-wide rolling distribution — more authoritative than anything we'd compute locally, and saves us holding 30 days of state.

---

## 3. UX — Konklone-pure brutalist

### 3.1 Above-the-fold hierarchy

```
+------------------------------------------------------+
| [solid color background = state]                     |
|                                                      |
|                                                      |
|                                                      |
|                    YES                               |  <- 22vw, clamp(96px, 22vw, 240px)
|                                                      |
|     electricity is cheap right now                   |  <- 18px, opacity 0.7
|                                                      |
|     wind is meeting 62% of demand                    |  <- 14px, tabular numerals
|                                                      |
|     [in England — change]                            |  <- ghost-button, opacity 0.6
|                                                      |
+------------------------------------------------------+
                  ↓ scroll for detail
```

- **No logo. No nav. No header.** The first DOM node that matters is the answer.
- **Full-viewport background colour** matches state. `<meta name="theme-color">` updates so the mobile browser address bar tints to match — a free, beautiful signal.
- **Headline font:** Inter weight 900, **self-hosted and subsetted** to the ~12 letters that ever appear in the answer (Y, E, S, O, R, T, F, N, U, K, W, space). ~5 KB WOFF2, preloaded. Body copy stays on `system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif` — no swap, no shift, deliberate hierarchy. See §5.
- **Single accent only.** Background is the state colour; everything else is white-on-colour or black-on-colour with opacity steps. No secondary accent.

### 3.2 Below-the-fold

```
─── next 24 hours ────────────────────────
▁▂▂▃▅▇▇▆▅▃▂▁▁▂▃▄▅▆▇▇▆▅▃▂                  <- forecast bars
cheapest at 02:30  ·  worst at 18:00

─── good time for ───────────────────────
[ dishwasher ✓ ]  [ washing ✓ ]
[ tumble dryer ✗  cheapest from 02:00 ]
[ EV top-up ✓ ]   [ EV full charge ✗  cheapest from 23:30 ]
[ immersion ✓ ]

─── about ───────────────────────────────
how this works · json · github · @author
data: National Energy System Operator (CC BY 4.0)
```

### 3.3 Action chips (duration-aware)

Each chip has a typical duration; chip turns green only if the **average forecast intensity** across the next N half-hours stays in `low/very low`. If not, show the next start time when it would.

| Chip | Duration | Reason |
|---|---|---|
| Dishwasher | 2h | typical eco cycle |
| Washing machine | 1.5h | 30–40°C cycle |
| Tumble dryer | 1.5h | typical cycle |
| EV top-up | 4h | partial overnight charge, ~80 mi added |
| EV full charge | 8h | overnight 7kW charge, 0→100% |
| Immersion heater | 1.5h | reheat tank |
| Oven (1h roast) | 1h | dinner |

Algorithm: given the 48-half-hour forecast from `/intensity/.../fw48h`, for each chip find the rolling-average minimum window of length `duration / 0.5` half-hours where the average index is `low/very low`. Show ✓ if the cheapest window starts *now* (within the current half-hour), else show ✗ with the start time.

### 3.4 Geolocation flow

Three-tier strategy, all transparent to the user:

1. **Vercel edge geo headers** (`x-vercel-ip-latitude`, `x-vercel-ip-longitude`, `x-vercel-ip-country`) → server-render the page with a regional answer based on a coarse lat/lon → outward-postcode-prefix lookup. **Zero prompts. Instant first paint.** ~70% accurate to region for UK IPs.
2. **Browser Geolocation API** opt-in via a small "use my location" link under the region label. Refines to outward postcode via a reverse-geocode (postcodes.io or the Carbon Intensity API direct lat/lon endpoint). Permission prompt only fires if user clicks.
3. **Manual postcode entry** as a fallback under "change" — user types `SW1`, `RG41` etc. (outward part only, never full postcode → no PII).

If everything fails, fall back to GB national. Never block the page on geolocation. The answer renders with the best information available within ~50ms.

### 3.5 States and accessibility

**Palette (WCAG AA, colour-blind safe via Okabe–Ito-derived hues):**

| State | Background | Text | Contrast | Icon shape |
|---|---|---|---|---|
| YES | `#0E7C3A` | `#FFFFFF` | 6.4:1 | filled circle |
| SORT OF | `#E69F00` | `#1A1A1A` | 7.8:1 | filled triangle |
| NO | `#B3261E` | `#FFFFFF` | 6.0:1 | filled octagon |
| UNKNOWN | `#1F2937` | `#FFFFFF` | 12:1 | filled square |

State is communicated by **(a) the word**, **(b) the colour**, **(c) the icon shape** — colour-blind users get the answer from any one of the three.

Dark mode: invert backgrounds with same hues nudged 10% lighter. `prefers-color-scheme` only — no toggle in v1.

Screen reader: the answer block is wrapped in `aria-live="polite"` so state changes announce. Page title updates to `YES — ispowercheap.co.uk` so tab/window switcher shows the answer.

### 3.6 Motion

**None on first paint.** The state colour is just *there*. The only acceptable motion: a 200ms cross-fade if state changes while the page is open (visibility-API-triggered re-poll every 5 minutes). A 1px live-dot in the footer pulses slowly (2s ease-in-out) — that's the maximum.

---

## 4. Data architecture

### 4.1 Sources

| Source | Purpose | Auth | CORS | Update | Notes |
|---|---|---|---|---|---|
| **Carbon Intensity API** (`api.carbonintensity.org.uk`) | Primary state + forecast | None | Yes | 30 min | National + 17 GSP regions + outward-postcode endpoint. CC BY 4.0 — must attribute. |
| **Octopus Energy API** (`api.octopus.energy`) | Optional Agile price overlay | None for tariffs | **No** — server-side only | 30 min, next-day @ ~16:00 UK | DNO regions A–P (no I). 14 regions. |
| **Postcodes.io** (`api.postcodes.io`) | Postcode → outward + lat/lon | None | Yes | n/a | Free, fast, UK-only. |
| **Vercel geo headers** | First-paint default region | Built-in | n/a | per request | Free with Vercel hosting. |

### 4.2 Cache strategy (Vercel)

| Endpoint | TTL | SWR | Why |
|---|---|---|---|
| `GET /api/now?region=…` (our edge) | 60s | 5 min | Carbon Intensity changes every 30 min; 60s gives near-live without hammering upstream. |
| Carbon Intensity `/intensity` calls | 60s | 5 min | Same cadence. |
| Carbon Intensity `/intensity/.../fw48h` | 30 min | 6h | 48h forecast updates rarely. |
| Octopus Agile rates (today, published) | 24h | 7d | Immutable once issued. |
| Octopus Agile rates (next-day, before 16:00) | 60s | none | We want freshness when we know they're about to land. |
| Octopus Agile rates (next-day, after 16:00 success) | 24h | 7d | Immutable. |
| Postcode → region lookup | 1y | 1y | Stable. |

Implemented with SvelteKit's `cache` exports + Vercel's `Cache-Control: s-maxage=…, stale-while-revalidate=…` headers. No Vercel KV in v1 — edge cache headers are sufficient.

### 4.3 Failure modes

1. **Carbon Intensity down.** Show `UNKNOWN` state with last-known timestamp. Never invent.
2. **Stale data (>45 min).** API returns half-hour data; >45 min is suspicious. Show "data may be stale" line, keep last-known answer visible.
3. **Geolocation fails.** Fall back to GB national.
4. **Agile next-day prices not published by 18:00.** Show "tomorrow's prices land between 4–8pm" placeholder; cron retries every 15 min until 22:00.

### 4.4 Endpoints we expose

- `GET /` — the page itself (SSR with state already decided)
- `GET /api/now` — JSON: `{ state, intensity, forecast24h, region, fetchedAt, sources }` — public, CORS-enabled, attribution-required
- `GET /api/now?region=H` — DNO-region-specific
- `GET /api/now?postcode=SW1` — postcode-specific (outward only)

`/api/now` is documented in the footer link as a public endpoint. Reinforces "public utility" framing.

---

## 5. Tech stack

- **Runtime:** SvelteKit on Vercel, Node 22 (Vercel default).
- **Adapter:** `@sveltejs/adapter-vercel` with edge runtime where possible (faster regional response).
- **Package manager:** pnpm.
- **Linter/formatter:** Biome.
- **Styling:** vanilla CSS with custom properties (CSS variables). No Tailwind, no SCSS, no CSS-in-JS. One global `app.css` for tokens, scoped Svelte styles for components.
- **Web font:** **Inter weight 900, self-hosted, subsetted** to ~12 glyphs — every unique letter in `YES`, `SORT OF`, `NO`, `UNKNOWN` (Y, E, S, O, R, T, F, N, U, K, W, space). Result: ~3–5 KB WOFF2, preloaded with `<link rel="preload" as="font" crossorigin>`, used **only on the headline word**. All other copy stays in `system-ui` weight 500/400 — zero layout shift, body renders before the network even returns. Brand expressed exclusively through the typography of the one word that matters. The subset is regenerated as part of the build pipeline (any new state word would extend the subset).
- **Type safety:** TypeScript, strict.
- **Testing:** Vitest for logic (state derivation, action-chip windowing). Playwright for one smoke test (page renders, answer is present).
- **Analytics:** Vercel Web Analytics (privacy-friendly, no cookie banner needed) — only if user wants; default off in v1.

### 5.1 Performance budget

| Metric | Budget |
|---|---|
| HTML payload (gzipped) | < 8 KB |
| Total payload first load (gzipped, incl. font + icons) | < 35 KB |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Largest Contentful Paint | < 0.5s on 4G |
| Time to Interactive | < 1s on 4G |

Achieved by: SSR, headline-only subset web font (~5 KB) + system-ui everywhere else, inline critical CSS, one tiny `app.js` (polling + theme-color sync + service-worker registration), no analytics in v1.

---

## 6. Branding / visual

- **Wordmark:** none above the fold. Footer text only: `ispowercheap.co.uk`.
- **Headline typography:** Inter weight 900 (self-hosted, subsetted to ~12 glyphs). Letter-spacing `-0.04em`. All other text uses `system-ui` so the headline reads as deliberately distinct without paying the round-trip for the rest of the page. See §5 for subsetting strategy.
- **Favicon:** a single coloured square that matches current state at request time (32×32 PNG generated server-side). The favicon literally answers the question in the browser tab.
- **OG image:** server-rendered current state as a 1200×630 PNG (so social shares show the live answer).
- **Page title:** dynamic — `YES — ispowercheap.co.uk` / `SORT OF — ispowercheap.co.uk` etc.
- **Tone of copy:** declarative, lower-case, no exclamation marks. "yes — power is cheap right now" not "YES! It's cheap!".

---

## 7. Out of scope for v1 (deliberately)

- User accounts, login, sync.
- Web push notifications ("tomorrow's cheapest window starts at 02:30").
- Tariff branching (Go / Cosy / Economy 7 cheap-window detection).
- Smart-meter integration (Hildebrand Glow, n3rgy).
- Ads, affiliate links, monetisation.
- Multi-day forecast view.
- Cost calculator ("how much will running the dryer cost?").
- Email digest.
- Native iOS/Android apps (the v1 PWA covers home-screen install).

These are all good v1.x ideas; not now.

---

## 8. PWA / installable / offline

This is a glanceable utility used **on the go** — someone walking home wondering if they should plug the EV in now, someone in the kitchen deciding whether to start the dishwasher. They want it on the home screen and they want it to work even on a tube/train/lift with intermittent connectivity. PWA is therefore in v1, not deferred.

### 8.1 What we ship

1. **Web app manifest** (`/manifest.webmanifest`):
    - `name`: `ispowercheap`
    - `short_name`: `ispowercheap`
    - `start_url`: `/`
    - `display`: `standalone`
    - `theme_color` / `background_color`: a neutral that respects all four state colours; the *dynamic* state colour comes from `<meta name="theme-color">` in the document, which the OS picks up live.
    - `icons`: 192 / 512 / maskable PNG, plus an Apple touch icon. Generated at build time from a single SVG source.
2. **Service worker** (SvelteKit's built-in `src/service-worker.ts`) with three caches:
    - **App shell** (`/`, CSS, JS, font, icons) — cache-first, revalidate in background. Keyed by build hash.
    - **`/api/now` responses** — stale-while-revalidate, 60 s fresh / 24 h stale. If offline, serves the last-known answer with a small "offline — as of HH:MM" badge.
    - **Static assets** (icons, manifest) — cache-first, immutable, content-hashed.
3. **Install affordance** — listen to `beforeinstallprompt`; on the user's *second* visit, surface a discreet "add to home screen" link in the footer (never a popup, never above the fold). Apple devices get a one-line hint in the footer ("on iOS: share → add to home screen") detected via UA.
4. **Periodic Background Sync** where supported — refresh the cached `/api/now` every 30 min so the home-screen icon's state is current when next opened. Graceful no-op where unsupported.

### 8.2 Offline UX

- **`/` loaded offline:** serve cached HTML showing the last-known state, with a single muted line: `offline — last update HH:MM`. The answer is always more useful than a generic "you're offline" page.
- **Cold start offline (no cache yet):** serve the cached shell with `UNKNOWN` state and a one-line apology. Never a browser-default error page.
- **Back online:** silent revalidate, swap state if it changed, no jarring re-render — the same 200ms cross-fade used elsewhere.

### 8.3 Acceptance criteria

- Installable to home screen on iOS Safari, Android Chrome, desktop Chrome/Edge.
- Lighthouse PWA category passes all relevant checks.
- Airplane mode test: launch from home screen → last-known answer appears within 200 ms.
- Service worker correctly invalidates on new build (no stale-shell-after-deploy bug).

---

## 9. Implementation slices

Each slice is a single PR / commit, builds on the previous, and is shippable on its own.

| # | Slice | Acceptance criteria |
|---|---|---|
| 1 | **Project skeleton** — pnpm + SvelteKit + Vercel adapter + Biome + TS + base CSS tokens. Empty page renders "loading…". | `pnpm dev` runs, `pnpm build` produces a Vercel-ready bundle, Biome runs clean. |
| 2 | **Carbon Intensity integration + state derivation** — server-side fetch, derive `YES/SORT OF/NO/UNKNOWN`, SSR the answer. National only. | Visit `/`, see correct state matching `api.carbonintensity.org.uk/intensity`. View source: answer is in HTML before JS runs. |
| 3 | **Konklone-pure visual layer + headline font** — full-viewport bg colour, big-word answer using subsetted Inter 900 WOFF2 (preloaded), supporting line, theme-color meta tag, dark mode via `prefers-color-scheme`. | All four states render correctly via `?state=yes|sortof|no|unknown`. Lighthouse a11y 100. Font payload < 6 KB. |
| 4 | **Geolocation flow** — Vercel geo headers for first paint, "use my location" opt-in, postcode entry fallback. Region label under answer. | Visit from a UK IP → regional answer. Click "use my location" → permission prompt → refined region. Type "SW1" → London region. |
| 5 | **Forecast sparkline** — 24h forecast as bar chart below the fold, cheapest/worst slot annotations. Pure CSS or single inline SVG. | Sparkline renders with correct heights matching `/intensity/.../fw24h`. No external chart library. |
| 6 | **Action chips with duration-aware logic** — windowed forecast scan, ✓/✗ + next start time. | Chip shows ✓ when current half-hour starts a cheap-enough window of its duration. Unit-tested with at least 6 fixtures. |
| 7 | **Optional Agile price overlay** — small toggle "I'm on Octopus Agile", server-side fetch, show real p/kWh inline. Off by default. | Toggle persists in localStorage. With toggle on and DNO region known, current p/kWh shows under the answer. |
| 8 | **Public JSON endpoint** — `/api/now?postcode=…` with CORS, documented in footer. | `curl …/api/now` returns valid JSON with state, intensity, forecast, sources. |
| 9 | **PWA — manifest + service worker + offline + install** — installable, offline-resilient last-known answer, install affordance on second visit, periodic background sync. | Lighthouse PWA passes. Airplane-mode launch from home screen shows last-known answer within 200 ms. |
| 10 | **Polish + ship** — favicon-as-state, OG image, dynamic title, footer attribution, humans.txt, error boundary. Lighthouse 100/100/100/100. | All performance budgets met. Deployed to Vercel preview + production. |

Estimated total effort: ~3 days of focused work (PWA adds ~half a day).

---

## 10. Risks and open questions

| Risk | Mitigation |
|---|---|
| Carbon Intensity API outage | `UNKNOWN` state with last-known cached value; clear messaging. |
| Octopus rate-limiting Agile fetches | Cache aggressively; one fetch per region per 30 min; lazy on demand only when toggle is on. |
| User on Agile but in a region we can't auto-detect | Manual region picker (DNO A–P) inside the Agile toggle panel. |
| `index` band feels wrong locally (e.g., the API says `moderate` but locally it's actually one of the cheapest hours) | v1 trusts the API's national distribution. v1.x can layer a region-specific tercile on top. |
| Vercel geo headers wrong (VPN, mobile carrier IP) | "use my location" and postcode entry both override silently. |
| Attribution/branding requirements from CC BY 4.0 | Footer line: "Carbon data: National Energy System Operator, EDF, University of Oxford, WWF — CC BY 4.0." |
| ENTSO-E / Nord Pool licensing if we add wholesale view later | Out of v1 scope; flagged for any v1.x wholesale layer. |

---

## 11. Done means

1. Visiting `ispowercheap.co.uk` from any UK device shows the right answer in <500ms.
2. The answer reads correctly to a colour-blind user, a screen reader, and a 4-year-old.
3. Lighthouse 100 across the board.
4. The JSON endpoint serves machines as cleanly as the HTML serves humans.
5. The footer credits its sources honestly.
