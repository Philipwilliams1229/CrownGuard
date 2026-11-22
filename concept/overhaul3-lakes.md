# Overhaul round 3: LAKES, started over (2026-11-22)

Owner: "man these lakes do not look good. we gotta start over i think, create 3 or 4 fresh looks. keep the water
like the river water, that looks good." Painter `concept/overhaul3-lakes.js`, lab `overhaul3-lakes.html`.

## Why the old lakes read badly next to the rivers (five lines)

1. Different water: the lake was a smooth dithered teal-to-navy ramp (20 close steps, 8x8 Bayer) with row stripes;
   the river is 7 crisp WA bands with blotchy edges and light dashes. Two waters on one board.
2. The sand ring: a pale tan band round most of a small oval reads as a hole cut in the lawn, not as land holding water.
3. Too much on too little: jetty, islet, rocks, reeds, swan, ducks, heron, beach, wrack on one small oval: busy.
4. Fan-shaped pale seams by the islet and a blobby, even outline: the shape had no character, only noise.
5. Nothing gave it height: the river's cut bank says "the land stands above the water"; the lake mostly lay flat.

## How the four are made (shared)

- THE WATER IS THE RIVER'S, LITERALLY: the module loads `concept/overhaul2-water.js?raw` as a module with its internals
  exported (no copy, no edit), so WA, the band formula `idx = 6 - q*6.2 + Bayer nudge + blotch noise`, facePixel, the
  edge kinds (cut, lip, reeds, quay, rock), reeds, lilies, tussocks, boulders, birds and rings are the approved code.
  The only change: q rises with distance from the shore (`deep` art px) instead of across a channel, and the river's
  light dashes lie still in level wind-lanes that form and fade (a slow cross-fade, ~6 px drift a loop) instead of
  running. Streams in and out are painted by the river painter itself (paintWater), joined to the lake with a smooth min.
- Shape: a mask (smooth union of ellipses / a rounded box, low-frequency wobble) -> exact signed distance (Felzenszwalb
  EDT, ~150-600 ms for an 840x560 crop at bake). The road is kept clear by a SMOOTH max, so the shore curves away from
  it (a hard clamp gave straight clipped edges in the first pass). Edge kind per pixel from the shore's direction
  (far/north shore = cut face, near = grassy lip) or a named zone; kinds taper their face over ~10 px.
- No sand anywhere: the owner rejected three beaches; none of the four needs one.

## The four looks

1. **The mere** (`ovh3_lakes_1_*`): a round-shouldered deep pool held in the land like the river's cut: north shore the
   approved cut earth bank, south the grassy lip, ONE reed bay with lilies; a pair of ducks. Plain on purpose.
   Loop: rising-fish rings, still dashes forming/fading, reeds sway, ducks idle, the lap working at the cut face.
2. **The tarn** (`ovh3_lakes_2_*`): three lobes with narrow waists, a rocky headland (the game's own `rock` decor plus
   boulders with foam collars), dark and deep (bands reach the river's middle within ~18 px), a stream running in from
   a stone culvert under the north road and out to the south-west as the approved river (cut east bank, lip west):
   lake and river visibly one water. Loop: the inflow's current dashes running into the still lake, rings.
3. **The millpond** (`ovh3_lakes_3_*`): a made lake: a straight dam on the south with a wide dressed-stone coping, a
   sluice (two piers, timber gate, rack wheel) spilling over the river painter's weir into a quay-lined race that turns
   to a grassy channel, a plank jetty with a moored clinker skiff (pix-sculpted), lily rafts, strand willows (round 2's
   approved tree) on the north bank. Loop: the white fall and churn below the sluice, the skiff rocking, rings, dashes.
4. **The reed fen** (`ovh3_lakes_4_*`): shallow (q capped at 0.5, so it never gets past the river's mid teal) open water
   almost wholly edged in the approved reeds, two reed islets, reed beds standing in the shallows, a fowler's punt
   (pix-sculpted, a wildfowler at the stern), a heron, a willow. Loop: reeds swaying everywhere, punt rocking, rings.

Each: Foxmere noon / golden hour / a 2.5x close-up of its characteristic shore / the same look on Oakmere (a pond
board) / one loop (`ovh3_anim_lake<n>_c6r5_fps10.png`, 30 frames, 10 fps, 3 s, 460x300 = a 230x150 crop at 2x, + `_still`).
Contact sheet `ovh3_lakes_sheet.png`: the four on Foxmere and on Oakmere at board size beside the approved river reaches.

Loop checks (step mean / wrap step / shimmer px): 1: 605 / 620 / 0; 2: 296 / 399 / 0; 3: 1323 / 1293 / 8; 4: 2540 / 2624 / 0.

## Cost and engine

- Bake: the distance field ~0.2-0.6 s per board once; the water paint is per pixel like the river's (bake the still
  water once; only the marks and rings animate). Per frame in the game: the wind-lane dashes as 3-6 baked frames
  cross-faded (or a slow 1 px/3 frames strip), rings and boats as sprites, reeds as the river's sway frames: about the
  river's cost or less. Memory: one board-sized water layer + a few frames.
- Engine: PONDS today are ellipses (`terrain.js`, `footing.js` treats a pond as an ellipse); these shapes need a pond
  MASK (or a polygon) for buildability, the River Watch's rowing ring (a lake's ring = its distance-field contour at
  ~-12 px) and the footing tests. The tarn adds a culvert under a road and two short rivers (river data on Foxmere);
  the millpond adds a stream and a weir; both change where halls may stand. The reed fen's islets are unbuildable land.

## Weak spots (honest)

- The big open lakes (mere, tarn, millpond) are mostly WA[0]/WA[1]: the river's blotch noise reads as darker/lighter
  mottling over a wide area; on a narrow river it was hidden. If too heavy: lower qmax (mere 0.88 now) or the blotch.
- The jetty's planks read as a ladder (dark seams); the skiff is a long oval from above, readable but plain.
- Strand willows are static in the loops (round 2's tree sway hook not wired). The heron is small (river module's).
- Tarn on the pond board: the stream runs straight through, so the lake reads more as a widening of the stream.
- Golden hour: the lake's glitter was thinned from the river's (it covered the whole lake); the streams keep the river's.

## Pass 2 (owner: "1 2 and 4 are all good ... 3 the millpond doesnt look good, remove"; the mere's west end)

- The millpond is DROPPED (its PNGs deleted; its code is still in LOOKS[3], unused).
- The mere's shape: rounder and clear of the west road (the road's smooth max now 16 wide, the lake moved east), no
  facets. The CUT BANK never ends in a wedge: its face height = HFACE x tp, tp = smoothstep on the shore's facing
  (full when north-facing, none by east/west-facing) x smoothstep over `BANK_FADE` 72 art px (36 board units) from each
  end of the lake; where tp < 0.3 the water meets it as a grassy lip, so the turf line is one continuous edge. Applies
  to every cut bank (mere, tarn; the fen has none). Before / after: `ovh3_lakes_1_fix.png`.
- Wide dark water calmed: the river's blotch noise (and the 0.18 depth wobble) fall to 40% beyond ~12-34 px from shore.
- VARIETY (`VARIETY`, `genLook`): the Greenwood boards with a pond today are Foxmere, Oakmere and Bramblewick; a fourth,
  Thistlecrag, gets a new small mere placed by search (widest ground clear of road and rivers). Deal: Foxmere the long
  mere, Bramblewick a tarn (the road loops round it, so a stream runs in and out under it: culverts placed where the
  seeded rill meets the road), Oakmere the reed fen (low meadow), Thistlecrag a small round mere in a hollow among crags.
  Sheet `ovh3_lakes_variety.png`, panels `ovh3_lakes_v_<realm>.png` (`?scene=v_<realm>`, `?variety=a,b,c,d`).
- Weak spots: Bramblewick's tarn is small for three lobes and its south outflow is a short stub to the road (the culvert
  sprite faces the viewer, so at the downstream end it reads back to front); the v_ panels skip any board scatter left
  inside the water by masking it (a stray ground layer drew grass in the Foxmere variety panel; cause not found).

## Pass 3: culverts (owner: "these like pipe entrances need work. we should be able to see in the one on the bottom")

- Rule: an arch mouth is drawn ONLY on a road's SOUTH verge (a south-facing headwall, the face our camera sees); on a
  north verge only the coping shows (`drawCoping`: a kerb of rough flat stones, the water darkening as it slides under).
  Every stream that goes under a road is seen coming out the other side: `rill` crosses the road and carries on beyond
  it, trying five headings and keeping the shortest crossing. The streams are cut back from the road (PATH_HALF + 5).
- The headwall (`archImg`): coursed rough fieldstone (grey, buff, mossy), nine voussoirs and a keystone, a kerb of
  road-edge stones on top, moss, ferns at the wing walls; sized to the stream (opening = 1.5 x its width).
  `drawArchMouth` paints the mouth into the water: a lit soffit, black-blue depth, the stream sliding out of the dark
  (moving light dashes), a lit lip at the entrance and the arch's reflection wobbling in front. Animated in the loops.
- Bramblewick: the inflow comes from the north board edge, under the north road (coping on its north verge, the arch
  on its south verge), into the tarn; the outflow leaves the tarn, slides under the coping on the inner bend's verge
  and comes out of an arch on the far side, running on south-east. `ovh3_lakes_culverts.png` = before / after at 3x.
- Weak spots: Bramblewick's outflow crosses the road on a BEND, so its outfall arch sits on a verge that faces
  south-east, with a grass gap beside its west wing; the north verge's coping is small at board size.
