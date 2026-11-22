# Overhaul concepts, ROUND 2: WATER (2026-11-22) — option A "cut into the land", made ready to build

Greenwood only (the owner's "SCOPE NOW"). Painter `concept/overhaul2-water.js`, lab
`overhaul2-water.html?scene=<name>[,<name>...]&save=1` (one realm's TODAY per page load: TODAY needs the old
water baked into the ground layer, the others need it gone). `?sheet=a,b,c&cols=2&w=840` makes a contact sheet.

## How a panel is made (no stand-in lawn)
The real board: the engine runs it (halls placed, a wave walking), RIVERS / PONDS are emptied, then `draw()`
renders it twice: A (everything) and B (no halls, figures, trees, bridges). The new water is painted over B from
a signed-distance field (+ land, - water, its normal, distance along the flow, an EDGE KIND per bank stretch with a
soft weight at zone ends); then every pixel where A differs from B is laid back on top, and where the difference
is only a cast shadow (the ground pulled toward `DAY.shade` by one alpha in every channel) the new water under it
takes that shadow instead. Bridges are the game's current ones (the bridge artist's job). Puddles, reeds, lilies,
tussocks, boulders, birds, the jetty and the skiff are pixel-placed sprites in the same pass.

## PNGs (`.shots/`, 1680 x 1120 unless noted)
- Edge vocabulary, Wolfrun (the Greenwood's one river running ACROSS the screen), zoomed 8 px a unit:
  `ovh2_water_wolf_today`, `wolf_a_cut`, `wolf_b_lip`, `wolf_c_beach`, `wolf_d_reeds`, `wolf_e_quay`,
  `wolf_near` (the near bank under a cut far bank: 1 overhang, 2 reed tops, 3 shingle strip).
- Mixed edges at board scale: `thorn_today`, `thorn_mix` (Thornbrook, a brook running UP the screen, with a weir),
  `thorn_golden`; `mill_today`, `mill_mix` (Millrace: the Foxwater and the stone-lined race).
- The lake, Foxmere: `fox_today`, `fox_lake`, `fox_golden`, `fox_dusk` (lanterns).
- Pond + puddles, Oakmere: `oak_today`, `oak_pond`.
- Motion (6 frames, 1672 wide): `strip_weir`, `strip_reeds`.
- Round 1's A for comparison: `scratchpad/overhaul-page/img/water_river_A.jpg`, `water_lake_A.jpg`.

## The edge vocabulary, and where each goes
- **(a) Cut bank**: an earth face 13 art px tall on a far (north) bank: hanging turf lip, strata with a pale clay
  band, set stones, roots, a wet seam and a lap of foam; its shade lies on the water at its foot. Lit by the sun's
  normal, floored at a mid brown so at noon it never reads as a dark outline. Side faces (rivers running up the
  screen) are 0.42 as tall: the east bank shows a LIT west face, the west bank a narrower shaded face whose shadow
  falls on the water. USE: outside of bends, far shores of lakes, the islet's south side, any steep reach.
- **(b) Grassy lip**: turf to the water, darker sodden grass, tussocks overhanging, a 1 px dark waterline, the
  grass tinting the near water. USE: gentle country, near banks, ponds, most of a quiet river's length.
- **(c) Shingle beach**: dry gravel, wet darker gravel with a lap of foam, then clear shallows over the bed with
  caustics (a lake's wandering wrack line). USE: inside of bends, fords, below a weir; SAND variant for lake
  beaches (dry, wet that holds the sky, tide line, a dune edge into the grass).
- **(d) Reeds and rushes**: dense clumps (broad leaves, a few bulrush heads, they sway), brown-green slack water,
  lily pads with pink / white flowers. USE: slack water, lake bays, pond margins, mill tails.
- **(e) Stone quay**: dressed courses with joints, coping stones on the lip, a weed line and a wet foot. USE: by
  bridges, the mill race, towns, the castle side; later the Iron Marches.
- **Near banks** (the viewer looks onto the top): (1) the turf lip's lit edge, then a dark shadow gap with
  hanging blades; (2) reed tops growing up past the lip; (3) a shingle strip seen past the lip. My pick: 1 by
  default, 2 where a reach is slack, 3 on the inside of bends.
- Rule of thumb for a board: cut on the outside of bends and on far banks, shingle inside, reeds in the slack,
  quay within ~40 units of a bridge, lip everywhere else. Zone ends blend over ~20 units (no straight seams).

## The lake (Foxmere)
Far shore cut, a reed bay with ducks and a heron, a rocky point of boulders with foam collars, grassy banks, a
sand beach (dry / wet / tide line) carrying a T-headed jetty (plank walk with water in the gaps, posts with wet
weedy feet and ripples, a head with crate, rope and bollard, a ladder, two lanterns, the River Watch's skiff tied
alongside), an islet with a cut south face and the game's own oak, depth from clear shallows to deep teal, wind
lanes, the sky lying on it. Golden: warm faces and a glitter band. Dusk: the board sinks to blue, the lanterns and
the hall's door add stepped dithered light (as nightlight.js does) and a lantern's light lies broken on the water.

## Cost guess
Bake: the water layer per board once per sun (one pass of the field, ~40-80 ms on the Mac in this lab, which is
unoptimised: the engine would bake the field once per board and the colour pass per sun). Per frame: the river
dashes, weir churn and lake ripples as 6 baked frames of the water layer clipped to its mask (~0.2-0.4 ms), reed
sway as 3-4 frame sprites. Memory: one board layer + 6 water frames (~4-6 MB on a phone at 2x art) + small sprites.

## What the engine would need
- Wider rivers (x1.15-1.6 here, kept 7 units clear of the road and tapered back to today's width at bridges) and
  lakes reshaped: `inRiver` / pond tests from the same field, so halls and decor respect the new shores.
- An edge-kind table per river / lake (`zones` by distance along the river and bank; lakes by angle), plus `weir`.
- The River Watch moors at a quay, lip or jetty; skiffs row on the water at the lip (the face is not water).
- A jetty and a weir as board pieces; ducks / swans / herons as water decor with a tiny paddle loop.
- Puddles as a board list `[x, y, rx, ry, seed, on]` (3-5 a board), on grass or road; they would join the storm's
  puddles (weatherfx.js) rather than duplicate them.

## Weak spots (honest)
- Wolfrun's straight river is crowded by four bridges and the forest hem, so the zoomed vocabulary panels show a
  short reach; the near-bank variants 2 and 3 are small there.
- At board size the river shingle (c) reads as a grey band; better on lakes and wide bends.
- Ducks and the heron are 8-12 art px: honest at the board's scale, but they read as dots on a phone.
- Golden hour's glitter is still a little speckled across the whole lake; it should gather into one band.
- The old bridges sit over the new water unchanged (the bridge round decides them); the taper to them leaves a
  slight corner in the banks.
- Where the mill race meets the Foxwater the two quays overlap a little.
- The dusk panel's darkness is a flat multiply over the golden board, not the game's night painter.

## My pick
Cut bank on far banks and outer bends, lip as the default near bank (variant 1), reeds in slack water, quay at
bridges and the mill, shingle only on wide inside bends; the lake as shown, with the sand beach and the T jetty.

## Shore pass on the lake (owner: "a proper fade into the water for the sandy bank")
`lakeShore()` in the painter: from the land outward, in stepped bands whose edges wander (noise plus a few stray
pixels, dithered only at the edge) and follow the shore: dry sand (footprints, clumped wrack) -> damp sand (darker,
cooler, a wandering wet line) -> a 1-2 px lapping edge that moves -> ankle-deep (the sand almost unchanged, tinted
pale turquoise, ripple marks following the shore, pebbles, moving caustic netting) -> knee-deep (greener, dimmer)
-> the drop-off into teal -> open water (its depth now counted from the drop-off). On the beach the run is ~34 board
units at its middle and blends into the grassy banks' narrow shelf at its ends (widths interpolated over ~26 deg).
Grassy, reed and rocky shores and the islet's north side get the same sequence, narrower (silt / pebble / sand
bed); the cut far shore keeps deep dark water under its face. Jetty: the landward posts stand in the sand (a foot
shadow, no ripple), the middle ones in the shallows (shadow on the bed, a faint ring), the head in deep water;
plank gaps show sand, shallows or deep water beneath. PNGs: `ovh2_water_fox_lake2`, `fox_lake2_golden`,
`fox_beach_zoom` (2.5x), `fox_before_after` (round 2 | this pass, board size), `strip_beach` (6 frames).
Weak: the wrack and the grassy waterline still read a little like dashed lines up close; a faint contour where the
islet's shelf meets the lake's on its east side; the walk's planks read ladder-like at board size.

## Blend pass (owner: "still just a line ... lighter shade towards the shore and darker as it gets further")
The stepped bands are gone. `lakeShore()` now drives ONE ramp from a continuous depth d (0 where the dry sand ends,
1 where the open water takes over): 16 close steps sand -> wet sand -> sand under pale water -> pale aqua (WA[6]),
each step dissolved by an 8x8 ordered dither as wide as the step, slow noise in d so the contours wander. The open
lake carries on from WA[6] to WA[0] in 20 dithered steps (RAMP_DEEP), so there is no seam where the shore hands
over. No wet line, no continuous waterline (only sparse 2-4 px foam glints that move), no outline between shallows
and deep. The beach's width is a smooth bell over the shore's angle (widest at its middle, ~34 units of run), so
its ends fade instead of stopping on a line. Grassy, reed and rocky shores get a narrow lighter-near ramp over
silt or pebbles; the cut shores keep their face with dark water at its foot. PNGs: `ovh2_water_fox_lake3`,
`fox_lake3_golden`, `fox_beach_zoom3`, `fox_before_after3` (shore pass | blend pass, board size).
Weak: faint fan-shaped seams either side of the islet where its pale north shallows meet the dark water under its
cut south face; the bay's reeds side shows a slight light rim; the walk's planks still read ladder-like.

## ROUND 3: LOOPS (art/briefs/overhaul-animation.md, 2026-11-22)
Lab: `/overhaul2-water.html?scene=anim_<name>[,...]&save=1` saves `.shots/ovh3_anim_<name>_c6r5_fps10.png` (30 frames,
10 fps, 3 s, each frame the real board at 1 px an art px = 2x board), `_still.png`, and `ovh3w_quarters_<name>.png`
(frames 0 / 7 / 15 / 22 side by side), and prints the three checks (mean step, the wrap step F-1 -> 0, shimmer pixels).
Loops drop the wave (no frozen foes, coins or corpses). Every clock is periodic in the loop: phases are whole turns a
loop; scrolling strips move a whole number of art px a frame and their noise repeats once a loop (`scroll` + `vnp`);
slow drifts (clouds, caustics) are two copies of the field a loop apart cross-faded (`vl`, contrast held mid-loop).
Checks at the last render: wrap step within the frame-to-frame range on all seven; shimmer 0 (weir 17 px in the fall,
quay 3 px, both in moving foam).
- **river_cut** (Wolfrun, cut far bank, grassy lip near): current dashes per lane, 5 px/frame mid-channel down to 2 at the
  edges (25 -> 10 board units/s); foam working at the face's foot (3 px/frame); lip tussocks stir, 1.5 s period, <=1 px.
  Game: the dashes are a scrolling strip per lane in the water mask (cheap), or 30 baked water frames (~4 MB a board).
- **river_reeds** (Millrace's Foxwater as a slack reach, reeds both banks): flow x0.45 (2 -> 1 px/frame); reeds sway on a
  3 s period, tips up to ~2 px, a gust running across; lily pads bob 1 px; three rings open and fade; a duck paddles
  against the current holding its place (surges 1-2 px, V ripples off its tail). FAKED: the duck can't cross a 3 s loop,
  so it holds station. Game: reed clumps as 6-8 frame sprites, rings as a 6-frame sprite.
- **river_quay** (the mill race from its bend past the road bridge to the Foxwater): race flow x1.25; quick streaks hug the
  walls (3-4 px/frame); broken wake lines curve out off the bend and below the bridge, travelling downstream. The mill is
  left out of frame: its wheel is a live painter on clocks that don't fit a 3 s loop.
- **weir** (Thornbrook): the fall cycles every 0.5 s, the churn runs off at 3 px/frame (15 u/s) and fades over ~20 units.
- **lake_beach** (Foxmere): the lap: the water's edge runs ~4 art px up the sand and back once a loop, its phase running
  along the shore; uncovered swash stays damp, a thin film and broken foam at the front; caustic netting drifts ~2 cells a
  loop; swell lines roll south one 15-px wavelength a loop (5 px/s); the skiff bobs 1 px. FAKED: the swan turns a slow
  ellipse (14 x 5 px) instead of gliding across.
- **lake_far**: swell lines, cloud sheen drifting ~13 px a loop, two fish rings with a splash, the islet oak's reflection
  wobbling (rows shifted 1-2 px, broken by ripple rows), ducks idling in small ellipses.
- **pond** (Oakmere): still (no swell), cloud sheen drifting, three drop / insect rings, rushes swaying, ducks idling;
  puddles: drifting cloud and a drip ring. No walker splashing through (the figures would need A re-rendered per frame).
Costs in the game: everything here is either a strip scroll in the water mask or a few small sprite strips; the lap is
the costliest (a per-pixel test along the beach band, bake ~6-8 frames of it).
Weak: the quay crop is mostly road and grass (the race is narrow); Wolfrun's reach in river_cut is short (bridge + forest);
the river's dash contrast is low at board size, so the flow reads best on the zoomed sheet; the pond's cloud sheen is
in row stripes (the earlier look) and its radial fan seam is still there; the lap's damp/dry edge is a visible step.
