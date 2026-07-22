# Katie & Josiah — honeymoon site

A private, password-gated site for a San Diego honeymoon (July 28 – August 2, 2026).
Live at **https://katieandjosiah.info** via GitHub Pages (this repo, branch `main`, root).

## How the site works

- **`index.html`** — "the reel": cinematic day chapters that pin and pan horizontally as you
  scroll (CSS scroll-driven animations with a rAF fallback; fully vertical layout under
  `prefers-reduced-motion`). Renders entirely from the itinerary data at runtime.
- **`katie-schedule.html`** — the week at a glance: six static day cards, one row per
  event. Deliberately read-only (the reordering UI was removed in July 2026); the week
  presents as settled, with no booking-status labels anywhere on the site.
- **`gate.js`** — the password gate. The itinerary ships **encrypted** as
  `schedule-data.enc.json` (AES-256-GCM; key derived from the site password with
  PBKDF2-SHA256, 200k iterations). The gate decrypts in the browser, executes the data
  script, then calls each page's `window.__boot()`. The derived key is cached in
  `localStorage`, so each device is asked only once. The gate resolves all asset paths
  relative to its own script URL, so it works from subfolders too.
- **`reveal/`** — a three.js "sneak peek" ceremony (self-contained; see
  `reveal/INTEGRATION.md`). **Flow**: a fresh manual login on either page redirects here
  (`data-after-login="reveal/"` on the gate script tag); six tiles reveal a 3D object per
  day, then the finale button leads to the main page. Silent unlocks (returning devices)
  skip the ceremony and go straight to the page they asked for; `/reveal/` stays
  reachable directly and is gated like everything else.
- **`photos/`** — all images bundled locally (freely licensed; see `photo-credits.md`).
  Three panels (Allegro, Mister A's, the Spider-Man matinee) intentionally render as
  typographic title cards until personal photos replace them.

## Editing the schedule (the part future-me must not skip)

The plaintext source of truth, **`schedule-data.js`, is NOT in this repo** — it lives only
on the local machine (gitignored), alongside `encrypt-data.mjs` and the private planning
docs (`DESIGN-NOTES.md`, `honeymoon-hq.md`, `archive/`). The site password is recorded in
the local `DESIGN-NOTES.md`, never here.

To publish any schedule change, **all three steps**:

```sh
# 1. edit schedule-data.js  (days/events/photos — schema documented in its header)
# 2. re-encrypt with the site password (from local DESIGN-NOTES.md):
node encrypt-data.mjs '<site password>'
# 3. ship it:
git add -A && git commit -m "…" && git push
```

Skipping step 2 silently ships the **old** schedule — the site only ever reads
`schedule-data.enc.json`. Changing the password is the same command with a new password
(every device will be re-prompted; it's one shared key).

Local preview: serve over http (e.g. `python3 -m http.server 8742`, or the
`.claude/launch.json` config) — the gate's `fetch()` can't run from `file://`.

## Security model, honestly

- The itinerary content (events, times, notes, addresses, dates) is genuinely encrypted
  at rest; without the password the site is an empty shell plus a lock screen. Repo
  history contains no plaintext.
- Not a vault: the photos in `photos/` are fetchable by direct URL, the shell reveals the
  couple's first names and "San Diego" (as does the domain), and one shared password
  unlocks everything.

## Content rules (enforced across the site)

1. No booking-status labels ("Reserved"/"Flexible") and no reordering UI — the week
   presents as settled. (`locked:` in the data is planning truth only, never rendered.)
2. No prices or dollar amounts anywhere on the site.
3. Planning-only notes never leave the local machine.

Photo attribution: `photo-credits.md` (CC BY / CC BY-SA credits must ship with the site).
