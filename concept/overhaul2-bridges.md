# Overhaul ROUND 2: BRIDGES, the Greenwood (2026-11-22)

Briefs: `art/briefs/overhaul-concepts.md`, `art/briefs/overhaul-round2.md`, `art/briefs/bridges-upscreen-rule.md`
(the advisor's rule, followed). Painter `concept/overhaul2-bridges.js`, lab `overhaul2-bridges.html`
(`?save=1&scene=<scene>.<kind>.<variant>[@sun=golden;dusk=1;hump=1;v0=farm;crop=x_y_w_h],...&out=..&labels=a|b`,
`&strip=5` for a water strip). Every panel is a REAL board: the realm's river widened in its data (the engine
re-spans its bridges from it), the old span removed (`BRIDGES` emptied before the first bake), the board drawn by
`draw()`, then the new span painted in art pixels over it, figures (the game's pix sculpts) on the deck at its
height, the front layer last. A 420 x 260 board patch at 4 px a unit.

Greenwood timber spans in the data: Thornbrook 1 across; Millrace 2 across + 1 up; Wolfrun 4 up
(3 across / 5 up, not 5 / 5).

## PNGs (`.shots/`)
- TODAY: `ovh2_bridges_{across,up,brook,mill}_today.png`
- 1 Trestle (toll): across `ovh2_bridges_across_trestle.png` (Millrace), up `ovh2_bridges_up_trestle.png` (Wolfrun, two spans,
  a skiff in the navigation bay); golden `ovh2_bridges_up_trestle_golden.png`; sunrise (small) `ovh2_bridges_up_trestle_sunrise.png`;
  dusk `ovh2_bridges_up_trestle_dusk.png`, `ovh2_bridges_across_trestle_dusk.png`
- 1b farm trestle `ovh2_bridges_across_farm.png`; 1c mill trestle with sluice gates `ovh2_bridges_mill_trestle.png` (Millrace north)
- 2 Today's bridge updated: `ovh2_bridges_up_flat.png`, `ovh2_bridges_brook_flat.png` (Thornbrook)
- 3 Humpback up the screen (right span, beside a farm trestle): `ovh2_bridges_up_hump.png`
- water through the piles, 5 frames: `ovh2_bridges_water_strip.png`

## 1. The timber trestle (the owner's B), polished
- One solid in (u, v, z); rise 10 units, level over the water + 3 units of abutment, ramps of 25 units onto land
  (slope 0.4), battered 0.4: a 4-unit strip on BOTH flanks up the screen.
- Across: a Howe pony truss (top chord 4 px sloping down over the end panels, verticals with iron straps, diagonals to
  the middle) instead of round 1's lattice "fence"; stringer, raked piles to the water, X braces, waling; a crib box
  at each abutment and turfed earth banks along the ramps (crib logs the full length read as stairs).
- Up the screen, by the rule: cap ends past the deck, raked outer piles, knee braces to the rail, X braces (none over
  the 20-unit navigation bay), far crib wing walls in south elevation with turf on top and a reflection, gloom on the
  water hugging the strips, the thrown shadow per point (zero at the ramp feet), rails as a 2-px line with post-cap
  dots, south posts and lanterns in the front layer.
- Built with the road: the ramps ARE the road's own pixels carried up (read off the board under them), with
  half-buried cross timbers every 8 units (their spacing shows the slope: wide on the near ramp, tight on the far),
  kerb logs continuing the verge, the road flaring 4 units into each bridgehead; on the deck two TREAD BOARDS run along
  the wheel tracks, worn to the road's sampled dust, earth spilled onto the end planks. Other areas: swap the sampled
  road (it already is the area's road) and the wood ramp; not drawn (Greenwood only).
- Variants: toll (truss, toll hut with lit window, raised bar, banner posts, lanterns), farm (post and rail, plain
  posts, no lamps), mill (truss, sluice gates beside it on the upstream side: millpond above, white falls below,
  winding wheels; a roofed span was rejected: a roof hides the foes on the deck).
- Engine: `BRIDGE_RISE` 8 -> 10 with a plateau `archAt` (ramp 25, level, ramp 25); a span grows from today's 40-64 to
  ~100 units (Wolfrun 191 art px = 96 units, Millrace across 96); `bridgeLift`, barricade refusal, `floodSites`,
  `clipDecks` and `drawnSpans` must read the new ends; the deck half-width 30 units (BRIDGE_HALF 35 today; lanes +-21
  sit on the tread boards). The rivers widened 28/30 -> 40 (Wolfrun, Millrace river 0) and 18 -> 34 (Millrace river 1):
  halls lose that ground, River Watch docks move. A skiff passes the 20-unit bay (bents 8.5 units apart elsewhere).
  Needs a straight of ~100 units: Thornbrook's crossing sits in the bottom of a U with 76 units straight: it cannot
  take a trestle without moving the road.
- Cost: one bake per span (~a few ms here, two layers: back and front), per frame 2 blits + wakes; ~0.6 MB a span.

## 2. Today's bridge, updated
- Rise 8 on a cos arch over water + 8 each side, vertical piles just past the deck with cap ends past them, the
  spacing change from the projection, far footings at the bank, gloom, a height-following shadow, tread boards.
- Engine: none beyond the river width (span = water + 16 as today).
- Weak: the far footings read as thin sticks (the arch is 0 at the deck ends, so the footing has no height); little
  height reads at noon, as today.

## 3. The humpback, up the screen
- Rise 17, cos crown over a 106-unit span (slope 0.5 at the feet), sett deck whose courses stretch on the near half
  and close up on the far, tone by slope and a lit lip at the crown, battered stone strips with three arch mouths
  (voussoir rim), cutwaters 8 units out on both sides with their coping and south face, white water off the downstream
  noses, stone wing walls in south elevation, stone newels with lanterns.
- Engine: a 106-unit span needs ~33 units of ramp on land each side at a 40-unit river; `BRIDGE_RISE` 17.

## Greenwood: which kind where
- Thornbrook (1 across, in a U): today's bridge updated (no room for ramps).
- Millrace: the across span by the hamlet = toll trestle; the north across span (river 1) = mill trestle with the
  sluice; the up span = farm trestle.
- Wolfrun's four fords: alternate farm trestle and today's bridge updated; one toll trestle at the ford nearest the
  castle (the last crossing).

## Light
Lanterns on every toll / mill bridgehead post, the hut's window; golden hour (sun west: the shadow falls east, long),
sunrise (sun east: shadow west); dusk = the board darkened and blue-shifted, lamps through `nightlight.js`
(`noteLamp`, `drawLampPools`, `drawLampBloom`) plus a broken column of glints on the water. NOTE: the game's own
low-sun grade did not take in this lab (draw() rendered the ground at noon; `DAY` was found back at noon after the
run, cause not found), so the golden / sunrise board is my own simple warm grade, not the game's.

## Weak spots, honestly
- The advisor's rule at board size (840 px wide): the 0.4 strip is 8 art px; the members inside it (piles 3 px,
  braces 1 px) read as a dark textured edge, not as carpentry. Height reads up the screen from: the far crib wing
  walls, the near/far ramp spacing, the gloom and (strongly) the golden-hour shadow. At noon the trestle up the screen
  reads as a raised boardwalk more than a trestle. The rule is right (no fallen fence, no lozenge arches, symmetric),
  it is just quiet at this scale.
- The humpback's arch mouths in a 13-px strip are barely legible; the cutwaters do most of the work.
- Across, the deck is wider (60) than the water span (~47), so the level part reads as a square; the ramps blend into
  the road so well they barely read as ramps.
- The water strip is weak: the wakes are 1-2 px dashes that hardly move; the water artist's flow should own it.
- Diagonal river crossings (Millrace's up span) break the rule's assumptions (sluice and wings placed by the centre
  line); not drawn.

## Round 3: ANIMATED loops (art/briefs/overhaul-animation.md)
Lab: `overhaul2-bridges.html?anim=<loop>[&fps=10&F=32&cols=4&zoom=x_y_w_h_k&zf=a,b,c,d]` -> `.shots/ovh3_anim_bridges_<loop>_c4r8_fps10.png`
(+ `_still.png`); the page prints the three checks (step 0->1 vs F-1->0, shimmer). Painter: `LOOPS`, `runAnim`, `liveLoop`.
All loops: 32 frames, 10 fps (3.2 s), 480 x 340 px (240 x 170 board units at 2x), 4 cols x 8 rows.
While a loop is built the painters RECORD wakes, banners, lanterns, sluice falls and still water instead of baking them;
each frame paints them live over the static bake. Every clock is a whole number of cycles a loop.
- Water (all): 1-px light dashes in 3-px lanes along the river's own centre line, 4 px/frame mid-stream (20 units/s),
  3 and 2 nearer the banks; pattern period = speed x F, so it wraps. Game cost: a scrolling/offset dash layer per river
  (or ~8 baked phases), cheap. Over the river artist's water this is a stand-in.
- Wakes: upstream cushion (4-frame flicker), dark eddy, V tongue whose foam ribbons run downstream 4 px/frame on a 16-px
  period, 7 flecks drifting on and dithering out. Game: per pile ~60 px drawn a frame, or 4 baked phases per pile.
- trestle_across (Millrace): water, 3 wakes, 4 banners stirring (2 sway cycles a loop), 4 lantern flames (4-frame cycle),
  goblins east on the engine's road (path.js lanePos, speed 82) rising onto the deck, behind the near truss, and down;
  garrison knights west on the far lanes. Walkers' z from the new profile (the engine's bridgeLift knows only old spans).
- trestle_up (Wolfrun, right span): the same, plus a River Watch skiff pair (36 units/s): one slips in under the west strip
  as the loop ends while its twin comes out from under the east strip as it begins (seam hidden under the deck).
- flat_updated (Thornbrook): water and 3 wakes through the piles, walkers over the cos arch.
- mill_trestle (Millrace north): three sluice sheets pouring 6 px/frame (12-px period) from under the gates; the millpond
  above nearly still (slow glints, one breath a loop; its overlay's top edge dithered); walkers.
- trestle_golden (Wolfrun): the thrown shadow is cast from the span's members (deck slab, crib ramps, piles, knee braces,
  X braces, rails, posts, banners), rim stepped and dithered in two rings; it is an alpha layer over the moving water, so
  the streaks dim inside it. Walkers' long shadows laid along the sun's fall on the deck (clipped by nothing: a shadow
  that runs off the deck edge stays at deck height). Game: the shadow bakes with the span (per sun), free a frame.
- trestle_dusk (Millrace): night grade, lamp pools/bloom breathing (+-7%), flames flickering, a broken column of glints
  under each lamp swaying 2 cycles a loop. No sun shadows after sundown.
Faked: walkers are placed on the engine's road at engine speed, not stepped through updateGame (no combat, no blocking);
both goblin variants walk at 82 (the hooded one's x1.15 dropped so the loop wraps); knights walk at goblin pace.
