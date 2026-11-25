# ispowercheap.co.uk

A single-page UK public utility that answers **"is electricity cheap right now?"** in plain English.

The page renders one of four states — **YES** / **SORT OF** / **NO** / **UNKNOWN** — based on live UK grid carbon intensity from the National Energy System Operator. It's regional (resolved by IP, refinable by browser geolocation or postcode), live-polling while the tab is visible, and serves dedicated landing pages for all 14 UK power-distribution regions plus 30+ cities.

🌐 **[ispowercheap.co.uk](https://ispowercheap.co.uk)**

## Stack

- **pnpm** + **SvelteKit 2** + **Svelte 5** + **Cloudflare Workers** (`@sveltejs/adapter-cloudflare`, config in `wrangler.jsonc`)
- **TypeScript strict**, **Biome** lint/format, **Vitest** tests
- **Vanilla CSS** with custom properties — no Tailwind, no SCSS, no CSS-in-JS
- **Inter** weight 900 subsetted to ~12 glyphs (~1.7 KB), self-hosted
- **Carbon Intensity API**, **Octopus Energy API**, **postcodes.io** for data
- **PWA**: manifest + service worker + offline last-known-answer + install affordance

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:5173+ (auto-detects free port)
pnpm test         # 27 vitest cases
pnpm check        # svelte-check + tsc
pnpm build        # Workers-ready output in .svelte-kit/cloudflare
pnpm deploy       # build + wrangler deploy
pnpm og           # regen the 4 OG PNGs (needs sharp, runs in Node)
pnpm icons        # regenerate brand icons (needs src/lib/assets/bolt.png)
pnpm subset       # regenerate headline font subset
```

## Project structure

```
src/
  lib/
    components/      Svelte UI components
    server/          Server-only utilities (data fetching, region resolution)
    assets/          Source PNG/SVG assets (bolt.png — brand mark)
    *.ts             Pure logic, types, helpers (locations, seo, livePolling, …)
  routes/            SvelteKit pages and API endpoints
  service-worker.ts  Offline + SWR + periodic-sync handler
  hooks.server.ts    Query-param canonicalisation + security headers
  app.html           Root HTML template (preload, icons, manifest, fallback meta)
  app.css            Design tokens (state colours, type scale, spacing, surfaces)
static/              Built icons, manifest, robots.txt, fonts, humans.txt
scripts/
  generate-icons.mjs Bolt PNG → 8 icon sizes (favicon, apple-touch, PWA, maskable)
  subset-font.mjs    Inter Black → 1.7 KB WOFF2 subset
spec.md              The original v1 specification (historical reference)
CLAUDE.md            Conventions + gotchas + design context (also for AI tools)
.impeccable.md       Design context for design-skill AI tooling
```

## Key concepts

### State derivation
The page maps the Carbon Intensity API's `index` field directly: `very low`/`low → YES`, `moderate → SORT OF`, `high`/`very high → NO`. We don't compute our own rolling distribution — the API's national band is more authoritative and saves us holding 30 days of state.

### Region resolution
Three-tier priority handled by `src/lib/server/region.ts`:

1. **URL `?postcode=`** — explicit user choice (highest priority)
2. **Cloudflare `request.cf.postalCode`** — IP-derived, no prompt, ~70 % accurate
3. **National GB fallback** — when the above are missing/non-UK

Returning visitors with a previously-granted geolocation permission get a silent precision upgrade after hydration via `src/lib/silentGeo.ts`. **No prompt fires for new visitors.**

### Cache strategy
`src/lib/server/answer.ts` exports `cacheHeadersFor(source, state)` which picks the right `Cache-Control` and `Vary`:

- **URL- or national-derived** → `public, s-maxage=60, stale-while-revalidate=300`
- **IP-header-derived** → `private, max-age=60` (never enters a shared cache)
- **UNKNOWN state** → short TTL (10 s) so transient upstream blips don't pin

`src/hooks.server.ts` 308-redirects unknown query parameters to the canonical URL — defeats cache-buster amplification (`?postcode=SW1A&utm=anything` collapses to a single cache entry).

### Live polling
`src/lib/livePolling.ts` wires `/api/now` polling at 5 minute intervals while the tab is visible (Page Visibility API gated). State changes cross-fade via CSS transition. Hidden tabs don't poll; returning to a hidden tab triggers an immediate refresh + reschedule.

### Brand & accessibility
**Three-signal state communication**: every answer is conveyed by **colour AND shape AND word** simultaneously. Okabe-Ito-derived ternary palette is WCAG AA on each pairing. 44 px touch targets, global `:focus-visible`, `prefers-reduced-motion` respected, semantic `<h1>`/`<h2>` hierarchy, `aria-live` on the answer.

## Endpoints

| URL | Description |
|---|---|
| `GET /` | Home — dynamic state-aware, IP-region by default |
| `GET /region` | Index of all 44 location pages |
| `GET /region/[slug]` | Per-location landing page (14 DNO regions + 30 cities) |
| `GET /about` | Methodology, sources, JSON API docs, privacy |
| `GET /api/now` | Public JSON, CORS-enabled |
| `GET /api/now?postcode=SW1A` | Region-specific JSON |
| `GET /api/agile?region=C` | Octopus Agile rates (server-proxied — Octopus has no CORS) |
| `GET /og.png` | Dynamic state-aware Open Graph image (1200×630, sharp-rendered) |
| `GET /sitemap.xml` | Auto-generated from `LOCATIONS` array |
| `GET /robots.txt` | Disallows `/api/`, references sitemap |
| `GET /humans.txt` | Colophon |

## Deployment

`pnpm deploy` (after `pnpm exec wrangler login`), or connect the GitHub repo in Cloudflare dashboard → Workers → Workers Builds with build command `pnpm build` and deploy command `pnpm exec wrangler deploy`. Custom domains are declared in `wrangler.jsonc`; `www` 308s to the apex via a Cloudflare Redirect Rule on the zone (not in code).

**Recommended Cloudflare WAF rate-limiting rule:** 60 req/min/IP across `/`, `/api/*`, `/og.png`. In-memory rate limiting on serverless is unreliable across cold-starts; the WAF dashboard is the right place.

**Post-deploy checklist:**

1. Submit `https://ispowercheap.co.uk/sitemap.xml` to Google Search Console.
2. Submit the same to Bing Webmaster Tools.
3. Verify domain ownership (DNS TXT record in Cloudflare).
4. Watch the Coverage report for the 47 indexable URLs (typical: 1–3 weeks).

## Data sources & attribution

- **Carbon Intensity API** — National Energy System Operator, EDF, University of Oxford, WWF (CC BY 4.0)
- **Octopus Energy** — public Agile tariff API
- **postcodes.io** — UK postcode lookup
- **Inter typeface** — rsms.me/inter (OFL 1.1)

Attributed in the footer of every page.

## Conventions

For everything from "where is the Octopus product code hard-coded?" to "how does the silent-geo refinement decide whether to redirect?", see **[CLAUDE.md](./CLAUDE.md)**. It's written for AI assistants but reads cleanly for humans too.

For the original product spec — what we agreed v1 should be, before the SEO programme and live polling landed — see **[spec.md](./spec.md)**.
