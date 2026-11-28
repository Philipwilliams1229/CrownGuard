# Iron overhaul, concept round 1, panel 5: the storm (Ironford)

Painter `concept/ovi1-storm.js`, lab `ovi1-storm.html` (`?job=stills|loops|probe&opts=A,B,C&sun=noon|golden&f=4&scenes=board,puddle,open,hall&tag=`).
Draws the LOOK only; the puddle-strike rule is the lead's. Nothing under `src/` is edited.

## How the panels are made (so the lead knows what is real and what is staged)

- The REAL engine and `draw()` run Ironford under `storm:1` with `w.k` and `w.wet` pinned at 1, 11 s into wave 7.
  TODAY = that frame with the engine's own `wxbolt` effect (white-blue bolt), `stunUntil` on the foes and `shockLeft` on the hall.
- The board is drawn three ways at one instant (all / no foes and soldiers / no foes, soldiers or halls); the differences are the
  actor layer and the hall layer, so the concept paints BETWEEN them: wet grade and gloss on the ground, the puddle under the
  actors, the actors (jolted, outlined, tinted), then yellow light, arcs and bolts on top, then a periodic rain layer.
- Staged on purpose: three foes are set down on a clear stretch of road (the board's gate road, x ~ 630-655, y ~ 210) and three more
  on another stretch so each body reads (the real column is a crowd). The puddle is the concept's own (rx 44 x ry 21 board units,
  an ellipse on the road); TODAY has no puddle at that spot. The stun targets are every foe within the 45-unit blast (open ground)
  or standing in the puddle.
- The real ground is today's Iron ground (the overhaul of the ground is not built); the grade, the gloss and the spate are painted on it.
- The base frame carries the engine's own frozen rain; the loops lay a periodic rain layer over it (every drop repeats exactly).
- Stills at f=4 (the stroke lands on frame 3; frame 4 is the hot frame). `_after` = frame 9 (the stun, the fading puddle). `_golden` = the
  whole board at golden hour (sun `golden`; the tone multiply is warmed by half so the low sun still reads).

## The yellow (one ramp, lemon, never fire's orange nor today's white-blue)

`#fffdf0` white-hot, `#fff58a` pale, `#f6e03a` lemon, `#c9b01c` deep, `#6e640e` ink. Paralyze and lightning share it.

## The three ideas (different ideas, not three strengths)

- **A  Mirror** (cool slate; glass). Wet stone is a MIRROR: each flag has its own glossy stripe, some flags stay dull; the puddle
  is dark glass that reflects the foes standing in it and, struck, goes white-hot then lemon in one flash, with a lit ring that
  fades over about 1.2 s. Bolt: wide, soft halo, white core, eight spokes at the foot. Paralyze: the body's own OUTLINE turns yellow
  and crawls (like the owner's picked burn: the edge of the very frame), two sparks orbit it. Hall: yellow crawling rim, ring on the ground.
  River in spate: standing-wave chevrons, white crest over a brown trough, mud creeping over the bank.
- **B  Arcs** (deep blue-black; the darkest). Wet stone is dark and rough with beaded glints. Bolt: thin, forked, four branches.
  The stroke into the puddle is arcs: every body in the pool gets its own arc from the strike to its feet, a ring runs out, and the
  pool glows only faintly (the arcs are the effect). Paralyze: a CAGE of two arcs crossing the body, re-struck every other frame, and
  three dots circling the head. Hall: four arcs run roof to ground and a dashed ring. River: long fast white streaks down the current.
- **C  Static** (olive-brown peat storm; the most graphic). Wet stone carries long diagonal reflections of the cloud edge. Bolt:
  stepped at right angles and 45 degrees with a 1-px olive line, no halo (reads as pixel art, not a photograph). The puddle strike
  lights the FLAG JOINTS inside the pool (the current runs along the paving) over a faint dithered glow. Paralyze: scan bands, two
  rows in eleven turn to yellow plate and a bright line sweeps up the body, a ring of crawling dots under the feet. Hall: the same
  scan on the stone. River: ochre flood with blocky cream bores across the stream.

## The loops (24 frames, 6 x 4, 12 fps = 2 s, 480 x 320 per frame = 240 x 160 board units)

`.shots/ovi1_anim_storm_<open|puddle|hall>_<A|B|C>_c6r4_fps12.png` + `_still.png` (frame 4).
Nothing moves except what the strike does and the periodic parts; the engine is frozen, so the foes hold the pose they were set in
(a paralysed body does hold one).
- timeline: frames 0-2 calm; 3 the stroke lands (white flash 0.5, bolt full); 4 bolt, flash 0.26; 5 no bolt; 6 a thin second flicker;
  7 on, gone. The ground wave runs frames 3-13 (stepped ring, flattened to 0.5). The stun marks run frame 4-18, blink 19-22, clean at 0
  so the loop closes. In the puddle loop every body is jolted (1-2 px shake, a flash tint) for frames 3-8.
- periodic parts (move by whole art pixels, repeat exactly over 24 frames): the rain (650 drops in lanes of 6 / 8 / 12 / 24 frames),
  the rain rings in puddles (12-frame period), the foam on the river (A: one row spacing a loop; B: one or two spacings; C: one) and
  the foam collars on the banks (a dither that crawls).
- Seam check (mean abs diff, 0..255): seam 23 -> 0 is the same size as the step 0 -> 1 on every sheet (see the report).

## Cost, in the game's terms

- Per level (bake): the wet grade is one pass over the ground layer (the road mask is the path stroked 40 units wide, the river mask
  from `inRiver`), about 0.3 s on the lab machine, 8 MB a graded copy; best baked into `groundLayer` WITH the storm's wet film
  (`wetRoadArt`), keyed on the sun, since `w.wet` only rises and falls slowly.
- Per frame: bolt = 2-4 fillRect lines (a `boltSprite` bake per seed is better: one blit); a stun mark = one small crop and a pixel
  loop on the foe's own frame, so it must be BAKED like `statusBurn` (per frame canvas, edge data in a WeakMap, at most 2 bakes a
  frame); the puddle's lit state is a dithered ellipse (bake per size and 6 steps). A: rim = the burn's machinery, cheapest to build
  (same code, new colours). B: arcs are 2 lines a foe re-struck every other frame, cheap but cannot be baked per frame (draw live,
  8-12 fillRects). C: scan = a per-row tint of the baked frame, one bake per frame x phase (8 phases).
- Engine: none for the look. The puddle strike needs puddles in the engine (the lead's rule): a puddle = {x, y, rx, ry} that the
  stroke tests against, and the same list drives the draw.

## Weak spots (honest)

- The river on Ironford is narrow (about 17 units), so the spate is a few pixels across: the foam is bold on purpose. The wide river
  panel belongs to the water artist.
- The wet grade and the gloss are a post-process on today's ground: in the game they would be the baked ground and the road
  painter's own wet film (road.js / weatherfx `wetRoadArt`), so the paving's joints would carry the sheen instead of a stripe per
  flag. NOT CHECKED on the other Iron boards or at another sun than noon and golden.
- Foes are staged (set down on a clear road); the real column is dense, and a stun mark on a dense crowd overlaps (the engine would
  need to draw the marks per foe in z order, as the burn does).
- Soldiers are not shown paralysed (no garrison stood in these scenes); the foes' marks are the same code a soldier would use.
- The struck hall's own crew do not freeze in these frames (the engine's shock is not applied: the base is drawn without it), and
  the hall glow does not light nearby foes.
- The foam on the river spate does not meet a bridge pier (the bridge decks are cut out of the river mask).
- TODAY's puddle frames carry the engine's own brown puddles; the concept's puddle is drawn over a clear road stretch, so the panels
  compare the stroke's look, not the puddle's.
