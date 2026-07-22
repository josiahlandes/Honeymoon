# Honeymoon Reveal — integration guide

Interactive 3D "sneak peek" for katieandjosiah.info. One self-contained folder:

```
reveal/
  index.html          the whole experience (three.js, no build step)
  assets/*.glb        4 bundled models (baseball, bat, taco, wine)
```

## Drop-in

Commit the `reveal/` folder to the site repo and serve it statically (e.g. at `/reveal/`).
All paths inside are relative — it works from any subpath. No bundler, no npm; three.js
loads from unpkg via an import map with SRI integrity hashes (requires a modern browser
with ES-module + import-map support; everything current qualifies).

Two integration options:
1. Link "Begin the reveal" from the main page → `/reveal/`.
2. Make it the landing gate: serve reveal at `/`, and its finale button already points to
   `https://katieandjosiah.info/katie-schedule.html` (absolute URL — edit in index.html,
   search for `schedule-btn`, if the schedule path differs).

The main site has a client-side password gate; the reveal page has none. If it should be
gated too, wrap it in the same gate snippet used on index.

## Behavior contract (all working, "set in stone")

- 6 tiles, Tuesday → Sunday, strict reveal order. Locked tiles thump + shake.
- Click the pulsing tile: chime + pop, gold burst, model springs out and slowly rotates.
- Clicking a revealed day gives it a spin boost + soft note.
- After Sunday: "That's the plan, Mrs." + fanfare + champagne confetti rain + schedule button.
- ↺ Replay (bottom-left) resets everything. Sound requires one user gesture (autoplay-safe).
- Camera has a gentle pointer parallax; scene is laptop-first (16:9-ish).
- Test hook from console: `window.__hm.revealNext()` advances one day programmatically.

## Model loading (three layers, automatic)

For each key the loader tries, in order:
1. `assets/<key>.glb` (local — the 4 bundled files land here)
2. a pinned `static.poly.pizza` URL (only used if the local file is missing)
3. hand-built low-poly geometry in code (always works offline)

Keys: `baseball` `bat` `taco` `wine` (bundled) · `saber` `spidey` `cup` `panda` `kayak`
`sealion` `bag` (deliberately hand-built; drop a same-named .glb in assets/ to override —
no code change needed).

## Attribution (required)

Add to the photo-credits page:
- "Baseball" & "Baseball bat" — Poly by Google, CC-BY 3.0 (via poly.pizza)
- "Taco" & "Glass Wine" — Kenney (kenney.nl), CC0 (no credit required, appreciated)

## Copy & tuning map (for the copy-editing session)

- Header: `#eyebrow`, `<h1>` (San Diego *for Katie*), `#subtitle` — plain HTML near top.
- Per-day labels: `DAYS` array (`day:` strings) in the module script.
- Mid-run prompt: `sub.innerHTML = 'Now… <b>…</b>'` inside `reveal()`.
- Finale line: `'That's the plan, <b>Mrs.</b>'` same function; replay-reset line near
  `#replay` handler. Signature: `#sig` ("xoxo, your husband").
- Chime scale: `PENT` array. Palette: `GOLD`/`IVORY` consts + CSS in `<style>`.
- Float height: `HOVER_Y`. Camera: `CAM = { y, z, ly }`.

## Do not

- Rename keys in `GLB_URLS` or move `assets/` relative to index.html.
- Strip the import-map `integrity` block unless upgrading the pinned three.js version.
- Add `scrollIntoView` or global scroll code — the page is a fixed viewport scene.
