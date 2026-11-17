# Range rings in the new style (2026-11-17, owner: "when placing towers, and when they are placed, the
range ring looks dated next to the new stuff")

Today (`src/render/draw.js`, `rangeRing` / `fullRing` / `musketRing` / `drawRanges`, ~lines 224-312): a
turning ring of square ticks (two on, two off), a flat translucent disc fill drawn with a smooth
`ctx.arc`, and a flat 40x40 square under the build ghost. Make them belong with the new pixel art
(`art/STYLE-GUIDE.md`; the effects pass in CLAUDE.md; `src/render/halls/pixrings.js` and
`src/render/rings.js` for stepped pixel rings; `src/render/inktint.js` for the tinted line).

## Keep (they are the player's measure, not decoration)

- The geometry: a TRUE CIRCLE of the exact radius at the hall's x, y (the engine's reach is a circle on the
  board; do NOT squash it like the ground effects). Every caller and condition in `drawRanges` stays:
  placing (green = can build, red = can't), selected (gold), the weather's full-reach ring (slate), the
  Powder Works' musket ring (steel blue, its fainter fill), `minRange` (red), the armed upgrade's preview
  (pale gold / pale blue), the knights' rally circle (`RALLY_RANGE`), drawing above the weather when any is up.
- Some motion so the ring under the finger reads as live (today's spin): keep it gentle.

## Make

- A hard pixel ring: stepped, one art pixel wide line plus a lit / shaded edge (lighter toward the upper
  left, one sun), a tinted line of the ring's own colour, never anti-aliased; a dithered (Bayer) inner
  band fading inward instead of the flat smooth disc, the middle nearly clear so the board shows.
- The build ghost's footprint as a pixel plate (a stepped rounded tile with a tinted rim), not a flat square.
- Bake per (radius bucket, colour kind, frame) and blit; the ring is drawn every frame while placing.
  Measure before / after (a `performance.now()` loop) and report.

## Files and rules

Own a new `src/render/rangering.js` and the range block of `src/render/draw.js` ONLY (the lines above;
another session may edit other parts of draw.js's neighbours: keep your hunk small, re-read before editing).
`node --check` after each edit. Look in the real game: Free Play (or `shotlab.html` with a hall selected,
`g.selectedId`, and `g.buildMode` for a ghost), in your OWN built-in-browser tab; also in fog
(`weather`) for the slate ring, a Powder Works for two rings, a catapult for `minRange`, a Knight Garrison.
Before / after crops at x3-4 in `.shots/rr_*.png`. No git that changes anything. At most two look-fix
passes. Report: what changed, perf numbers, shots, weak spots.
