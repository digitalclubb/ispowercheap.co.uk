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
pnpm test         # vitest run (chip logic)
pnpm build        # vercel-ready build
pnpm subset       # regen headline font (only if state words change)
pnpm icons        # regen PWA PNGs from static/icon.svg
```

## Repo conventions

- **State words ever live at `src/lib/state.ts`** — `YES`, `SORT OF`, `NO`, `UNKNOWN`. Adding a new word requires re-running `pnpm subset` so the headline font covers the new glyphs.
- **Region resolution priority:** URL `?postcode=` → Vercel `x-vercel-ip-postal-code` (when country is GB) → national fallback. Lat/lon → outward happens client-side via postcodes.io to avoid the round trip on cold first paint.
- **`?state=yes|sortof|no|unknown` is a debug-only override** in `+page.server.ts`. The `/api/now` JSON endpoint deliberately ignores it.
- **Octopus Agile product code** is hard-coded as `AGILE-24-10-01` in `src/lib/server/octopus.ts`. Octopus rolls these forward; if rates start coming back stale, fetch `/v1/products/?brand=OCTOPUS_ENERGY&is_variable=true` to find the current code.
- **Sharp powers `/og.png`** (server-rendered 1200×630). It needs the Node.js runtime; do not move that route to edge.
- **Service worker auto-registers** because `src/service-worker.ts` exists. Use `pnpm preview` (not `pnpm dev`) to test SW behaviour locally.
- **Location landing pages** at `/region/[slug]` are driven by `src/lib/locations.ts` (44 entries: 14 DNO regions + 30 cities). Adding/removing locations auto-updates `/sitemap.xml`. `pnpm test` includes a slug-uniqueness + DNO-coverage check in `locations.test.ts`.
- **SEO meta** (title, description, canonical, JSON-LD) is per-page via `<svelte:head>`. The static `<meta name="description">` was deliberately removed from `app.html` — pages must each set their own. Use `src/lib/seo.ts` helpers (`describeAnswer`, `faqJsonLd`, `websiteJsonLd`, `placeJsonLd`).
- **Post-deploy SEO checklist** (one-time, can't do from code):
  1. Submit `https://ispowercheap.co.uk/sitemap.xml` to Google Search Console.
  2. Submit the same to Bing Webmaster Tools.
  3. Verify domain ownership via DNS TXT or the Vercel-served `/.well-known` route.
  4. Watch the "Coverage" report for the 47 URLs to be indexed (typical: 1–3 weeks).

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
