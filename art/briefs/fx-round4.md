# Effects concepts, Round 4 (2026-11-17)

The owner asked Fable for a sweep of the game's moving effects that still lag behind the effects
pass (statusfx.js, rings.js, flames.js: baked pixel frames, tinted one-pixel line, one sun from the
upper left). Its report is `scratchpad/fable-sweep/report.md`. This round shows the owner A / B / C
concepts beside TODAY for the picked effects, as Rounds 1-3 did (CLAUDE.md, "The effects pass").

## How the page works

- `fx-concepts.html` (the lab, needs the dev server at http://localhost:5173) paints each row's strips
  and POSTs them to `.shots/fxc_<row>_<col>.png`. Run only your rows: `/fx-concepts.html?only=puddles,flood`.
  The page title turns `DONE`, and `#status` lists any errors.
- Your rows live in YOUR file `concept/fx-r4-<area>.js` (`export const ROWS = [...]`, header says the
  shape). `concept/fx-r4.js` gathers the three; don't edit it, nor `fx-concepts.html`.
- A row: `{ id, label, group: "Round 4", note, cw, ch, ax, ay, N, today, A, B, C }`. `today(c, e)` draws
  the game's look NOW by calling the game's own painter (import it from `/src/render/...`), so the
  owner compares against the truth. `N` frames (8-16; an effect that loops should loop cleanly: use
  `e.t`, 0..1 exclusive; a one-shot uses `e.p`, 0..1 inclusive). Cell art pixels; the page draws at x3.
  `e.ground` is "grass" or "dark"; the lab paints the grass under you; paint a road strip yourself
  where the effect needs one. Helpers you may copy: `concept/fx-concepts.js` (px, ell, inked, eachPx,
  bay, H, FIRE...) — copy, don't import (it is the lab's big file).
- Keep your module importable by Node at top level (`node -e 'import("./concept/fx-r4.js")'` must
  work: the viewer's build script reads the rows' metadata). Import game modules only if they don't
  touch `document` at load; otherwise call them via dynamic `import()` inside `today`.
- `node --check` your file after every edit.
- The viewer: `node scripts/build-fx-concepts.mjs round4` -> `.shots/fx-concepts-round4/index.html`.
  In Round 4 each option shows the PLAYING animation first, big, with its frames under it.

## The look (all options)

- Pixel art: whole art pixels, no anti-aliased arcs or soft gradients (dither with `bay` instead).
  Tinted one-pixel line where a shape has an edge (never near-black), one sun from the upper left.
- GROUND effects lie UNDER figures (style guide, "Effects on the ground"); only tongues / spikes /
  spray in front may draw over a body. No reflections of figures in water.
- A clean = today's idea, done properly in pixels. B worked = richer, more frames, more going on.
  C bold = B pushed: light thrown, a flash, a lingering mark. Make the three clearly different.
- Older iPhones: an effect will ship as baked frames (per size bucket / frame), so design for frame
  swaps, not per-pixel noise each frame.
- Put a goblin (`e.foe`, see the lab) or the road in the cell where it helps the owner read scale.

## Rows by artist

**Water** (`concept/fx-r4-water.js`; game code: `src/render/weatherfx.js` `stormGround`, `drawFloods`,
`bridgePools`, the wet road; `src/render/weatherbake.js` `puddle`, `floodDisc`, `dimple`, `splash`,
`wetRoad`, `boltScorch`; the lightning `wxArcs`):
1. `puddles` — "Rain puddles and wet road" (the owner's ask). A road strip with a grass verge in a
   full storm: puddles form, rain rings and splashes. Today: one noisy ellipse with a fixed sky band,
   the same slate on grass and road, fading in by alpha. A: ground-coloured (mud on the road, dark
   green on turf), lit near rim, grows from the middle. B: puddles in ruts and hollows, irregular,
   joining as it soaks; a slow cloud reflection; overlapping drop rings; run-off trickling off the
   verge. C: B plus a lightning flash mirrored in every pool and gusts rippling the water.
2. `flood` — "Flooded road". A stretch of road under water. Today: built from discs. A: clean pixel
   water edge and shallows. B: a creeping foamy edge, a current running across the road, debris.
   C: B plus a goblin wading with a wake and splash.
3. `bolt` — "Lightning strikes the ground". Today: the bolt + scorch. A: more bolt frames and a cleaner
   scorch. B: a branching crawl across the wet ground, steam off the puddles, a scorch with glowing
   cracks that cool. C: B plus a white flash frame and short shadows thrown from what stands there.

**Novas and pools** (`concept/fx-r4-novas.js`; game code: `src/render/rings.js` `firenova`,
`frostnova`; `src/render/ringflash.js` (foes flash white as the ring passes: keep that); `src/render/fx.js`
`drawGround` / `groundSprite` for the pools; reuse ideas from `src/render/flames.js`). The owner LIKES
"the flashing rings of the magic spells": every option keeps a ring front that reads as a ring.
4. `firenova` — "Fire nova" (Brazier Wheel, ~450 ms). A: a thicker stepped front with a short tail.
   B: a rolling flame wall with a scorched ring left behind and embers. C: B plus a core flash at the
   centre and heat shimmer lingering a moment. Put two goblins in it.
5. `frostnova` — "Frost nova" (~500 ms). A: thicker stepped front, frost tail. B: a rime sheet spreading
   under the feet, ice spikes snapping up at the front, then melting. C: B plus a cold flash and an ice
   glaze lingering a second.
6. `pools` — "Lava, plague and spore pools" (show lava on the top half of the cell and plague below,
   or two cells' worth side by side; your call). Today: 4 frames of a disc with fillRect tongues.
   A: richer 8-frame bake. B: broken crust, bubbles that swell and pop (as plague burst B), a creeping
   edge. C: B plus fissures and a glow on nearby ground. Must sit beside burning ground B, which the
   owner picked (flames.js `drawFireGround`).

**Rime and sea** (`concept/fx-r4-rime.js`; game code: `src/render/rimefx.js` — `landingWarn`,
`shipsink`, `plank`, `frostcast`, `thaw`, the ring / line / ripple placeholders; `drawShip`,
`drawSea`; `drawFrostShells`). Paint water (sea blue-grey) and a strip of beach / snow yourself.
7. `landing` — "Longship lands / sinks" (the beach warning, then the ship holed and going under).
   Today: vector ellipses and a monospace "!". A: the same shapes pixel-baked: a stepped ring, a
   sculpted horn-and-ship mark for the warning. B: bow wave and foam at the beach; the ship breaking
   and going under over the frames with flotsam. C: B plus a cold flash / spray burst.
8. `surface` — "Sea serpent surfaces". Today: a ring placeholder. A: pixel ring + ripple. B: a boil of
   foam, then the body breaking water and falling spray. C: B plus a dark shadow rising first.
9. `frozenhall` — "Frozen hall" (a Rime Seer freezes a hall: the ice shell, then the thaw). Today:
   a translucent rectangle with fillRect icicles (`drawFrostShells`). Use `e.hall` (an Archer hall)
   in the cell. A: a clean pixel ice shell fitted to the hall. B: ice creeping up from the ground,
   facets, icicles, then cracking and melting. C: B plus a rime-crystal ring on the ground and a
   shatter of shards at the thaw.

## Rules for artists

Own only your `concept/fx-r4-<area>.js`. Scratch files in `scratchpad/<area>4/`, shots `.shots/fxc_*`
(the lab writes them). Use your OWN browser tab (tabs_create) in the built-in browser, close it when
done; never resize the window, never touch others' tabs, never stop the dev server, no git that
changes anything. Look at your strips (Read the PNGs, cropped if big), at most two look-fix passes.
Report: your row ids, a line per option on what it does, and any weak spot.
