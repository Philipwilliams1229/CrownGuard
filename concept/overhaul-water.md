# Overhaul concepts: WATER (2026-11-22)

Painter `concept/overhaul-water.js`, lab `overhaul-water.html?save=1` (`&only=river_A,lake_B,...`, `&t=0..1`).
Each panel is a 420 x 280 board patch (840 x 560 art px) shown at 2x. The ground, road, trees, puddles and the
placeholder deck are painted by the concept; the Archer hall, its bowmen, goblins and garrison knights are the
game's own pix sculpts, for scale. TODAY panels are crops of the real game (`shots.html` snap): Thornbrook's
bridge, Foxmere's lake, Gullwick's shore.

The concept river is about 100-115 art px wide (~50-55 board units), twice today's 24-25 units, and is
REPATHED: it runs mostly east-west with one north-south reach, so the road can run beside it and cross it once.

PNGs (`.shots/`): `ovh_water_river_{today,A,B,C}.png`, `ovh_water_lake_{today,A,B,C}.png`,
`ovh_water_sea_{today,A}.png`, `ovh_water_river_A_golden.png` (golden hour), `ovh_water_strip_A.png` (6 frames,
the weir and its churn).

## A. Cut into the land
**Idea:** the water lies BELOW the meadow. The far bank shows an earth face (strata, hanging roots, set stones,
a dark seam where the water laps), the near bank slopes down as a gravel beach (or sand on a lake's lee shore),
the turf lip overhangs, the face throws a shadow band on the water; a stone weir where the level drops, with a
white fall and churn running off downstream. Lakes are dished the same way (beach on one shore, an islet with
its own face); the sea gets a real low cliff that is tallest on a headland and sinks into a sandy cove.
- **Different from today:** water is a trench, not a ribbon laid on the grass; height and depth are what you
  read first. Wider river, rocks with foam collars and wakes.
- **Cost:** bake: one full-board water/bank layer per board (~30-60 ms, done once, like today's ground); per
  frame: the current streaks and the weir churn as 4-6 scrolling strips or baked frames (~0.2 ms); memory one
  board layer + ~6 small strip frames.
- **Engine:** wider water = fewer build spots near it; the bank face is part of the water (no halls on it).
  River Watch docks must sit at the lip (its skiffs row 6-10 px lower: just a draw offset). Bridges must span a
  trench: a deck at turf height with abutments on both lips (the bridge artist's call). A weir needs a spot on
  the river's path and a `weir` entry per board. Golden hour works by itself: the face is lit by the sun's
  normal (the face goes orange in the west sun, see the golden panel); its shadow on the water follows `fall`.
- **Weak spots:** a reach that runs north-south shows almost no face (the camera sees faces only on the far,
  north banks; the west bank only casts a shadow). The face at noon is in shade and can read as a dark brown
  outline at board size unless it gets its stones and strata. The lake's face is thin against so much water.
  The strip's streaks do not loop exactly (they would be made periodic when built).

## B. Clear living water
**Idea:** you see INTO it: a bright pebble bed in the shallows with a wobbling caustic net, weed streaming with
the current, fish shadows, the channel darkening to blue-green; the far bank and its trees lie on the surface
broken by ripple rows, clouds drift across it; lily rafts, reed beds on the margins, a heron in the shallows,
wide pale shingle margins. The lake has a sand beach and a jetty; puddles show their muddy bottoms.
- **Different from today:** water is mostly see-through, lighter and warmer; life in and on it.
- **Cost:** bake: the bed + depth tint per board (as A); per frame: caustics, weed sway and ripples as 6-8 baked
  frames of the water layer clipped to the water mask, or a scrolling caustic tile over the bed (~0.3-0.5 ms);
  reflections would be baked per board (they mirror scenery that never moves) and need re-baking on `onDay`.
  Memory: the heaviest of the three (several water-layer frames per board: maybe 4-8 MB on a phone).
- **Engine:** same footprint changes as any wider river; reflections need the scenery's bake first (order of
  bakes in world.js). Fish, lilies, the heron are decor living on water (a new decor kind).
- **Weak spots:** at board size the bed texture gets busy and the water loses the strong value contrast that
  tells "water" at a glance; the reflections only read where a tree stands right on the north bank, and are
  weak against the dark channel. The heron is tiny. Hardest to keep readable under foes and effects.

## C. Painted current
**Idea:** bold, graphic water: four or five flat colour bands that follow the flow with crisp, swept edges,
long bright ribbons of light that travel downstream, lacy V-fans of foam opening below every stone and the
bridge piers, a bold cream foam line along every shore, a sparkling sun path. Lakes are concentric bands with
wind lanes; puddles are bright with a white rim.
- **Different from today:** saturated blue and stylised, closer to a storybook / Kingdom Rush look than to
  realism; motion is the main event.
- **Cost:** cheapest: bands baked once; ribbons and fans are a few hundred moving pixels a frame (or 8 baked
  frames, ~0.1-0.2 ms); memory small.
- **Engine:** footprint as any wider river. The shore foam line wants the same mask the engine uses for water,
  so it should come from terrain.js's water test, not a separate painted edge.
- **Weak spots:** the brightest and most saturated thing on screen, so it competes with the road and foes; the
  fans read as chevrons at board size; very different from the pix-sculpted halls' worked look.

## My pick
**A**, with two things taken from B: the lighter, see-into shallows near the gravel beaches, and the reeds and
lilies on the slack margins. A is the only option that changes the STRUCTURE of the land (height, a face, a
weir), which is what made today's rivers read as "ribbons laid flat on the grass". B as a whole is busy at
board size; C is striking but fights the halls' style.
