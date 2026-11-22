# Overhaul concept: BRIDGES, and how a river meets one (2026-11-22)

Brief: `art/briefs/overhaul-concepts.md`. Painter `concept/overhaul-bridges.js`, lab `overhaul-bridges.html`
(`?only=1A,1B,1C,2A,2B,2C,3A,today1,today2,today3,repath&save=1`, `&sun=golden&tag=golden`).
Every panel is a 420 x 280 board-unit patch at the game's scale (an art pixel = half a board unit),
shown x2 (1680 x 1120). The rivers are about TWICE today's width (100 art px = 50 board units); the road
is the game's 44 units. The figures and the Archer hall are the game's own pix sculpts, baked under
the panel's sun. The water is drawn plainly (the water artist owns its look).

PNGs (`.shots/`):
- Scene 1, road across / river down: `ovh_bridges_1across_{today,A,B,C}.png`
- Scene 2, road up / river across (the hard case): `ovh_bridges_2up_{today,A,B,C}.png`, golden hour `ovh_bridges_2up_A_golden.png`
- Scene 3, the Iron Marches: `ovh_bridges_3iron_{today,A}.png`
- Ironford repathed (sketch over today's board): `ovh_bridges_4repath_A.png`

## A. The humpback (stone, real arches)
**Idea:** a stone bridge with HEIGHT: the deck rises 17 board units to a crown; three stilted arches with
voussoirs and a keystone; cutwater starlings standing in the water; parapets with coping and a string
course; newel posts with a lantern and a wayside shrine.
- Different from today: today is a flat rectangle the road's width. Here the near face is a whole
  elevation (the arches are dark barrels with the far opening's light and water light in them), the
  deck's sett courses CURVE over the hump, the rise toward the sun is lit and the fall shaded.
- The river meets it: a POOL above (wider, calmer, still water), white tongues running out of every
  arch, V wakes off the starlings, gravel bars and reeds in the slack below the abutments, dressed-stone
  revetment on the banks either side, a path down to a landing stage and a moored skiff.
- The up-screen case (scene 2): straight-down projection hides a north-south span's sides, so it uses
  the castle's own rule (a wall running up the screen shows a SLANTING WEST FACE): the west face leans
  out at its foot (`KF` 0.85), its width follows the deck's height, so the hump, the arches and the
  upstream starlings all read; the east starlings and the white water show downstream; the deck's
  cast shadow on the water carries the hump's curve (golden hour panel: a long shadow east).
- Iron version (scene 3): cool grey ashlar, crenellated parapets, flagged road, twin round gate towers
  with slate cones and oxblood banners at the castle-side bridgehead.
- Cost: bake ~1 span = one canvas pair (back + front, ~230 x 130 board px) per span, a few ms (this
  painter bakes the whole patch in ~1 s, the span alone is a small share). Per frame: 2 blits + the
  white-water strips (frame strips, 4-6 frames). Memory: ~0.5 MB a span.
- Engine: `BRIDGE_RISE` 8 -> ~17 board units (walkers lifted by `bridgeLift`, unchanged code); the
  near parapet must be a FRONT layer drawn after the walkers on the deck (today's span is one stamp);
  skiffs pass under the arches (they fit: openings 13-15 units wide); a wider river moves bank
  footings (`buildableAt`, River Watch docks) and needs each realm's `rivers[].w` raised.
- Weak spots: the deck is still a big grey rectangle as wide as the road (it must carry three lanes);
  the arches on the up-screen west face are sheared (they read as arches at board size, but they are
  a convention, not a true view); the arch spacing is fixed per span length (needs an even/odd rule
  per river width like today's `ARCH_SPAN`).

## B. The great timber trestle
**Idea:** heavy carpentry: pile bents every 9 board units with X bracing, a level deck of big baulks
high on its piles (10 units), see-through truss rails, earth ramps held by crib walls, a toll hut with a
raised toll bar, banner posts with lanterns at both bridgeheads.
- Different from today: today's timber deck lies flat on the stream. Here the near side is a lattice
  you can see the water through (gloom under the deck), the piles stand in the river with wakes, and
  the bridgehead is a place (hut, posts, banners).
- Up-screen: the slanted west face shows piles, braces and the truss lattice; bent caps and piles
  stand out past the east edge; a long cast shadow.
- Cost: as A (two layers), a little more alpha (the lattice); per frame 2 blits + wakes.
- Engine: a level deck (no arch: `archAt` returns a plateau with ramps); skiffs pass between bents
  (9 units apart: narrow, the boat would need to thread a gap or the bents spaced wider over a
  channel); the toll hut and posts sit on land beside the road (decor, never on a hall's spot).
- Weak spots: the truss reads as a "fence" at board size more than a structure; the ramps on land are
  plain dirt slabs; the wakes are generic.

## C. The weir crossing (the river engineered)
**Idea:** the road runs along the top of a dam. Above it a still MILLPOND (wide, calm, lily pads,
reeds, a boat); below it the river drops ~9 board units down a STEPPED SPILLWAY of white water out of
four culvert mouths; sluice frames with winding wheels stand on the pond side; (scene 2) a watermill
with its wheel turning in the tailrace.
- Different from today: the crossing is not "a bridge over a stream" but a change of water level the
  player can read at a glance: calm high water on one side, falling white water on the other.
- Cost: the dam is a span bake like A; the spillway is a 4-6 frame strip (the white water slides);
  the wheels turn (8 frames). Per frame ~4 blits.
- Engine: two water levels (`drop` per side) in the water painter; the pond is a pond-shaped
  widening of the river (eats buildable ground on one side); skiffs CANNOT pass a weir: the River
  Watch would patrol either the pond or the tail, never both (patrolOf split at the dam).
- Weak spots: it is a landmark, not a general bridge (one per board at most); the dam crest is flat
  (no height to walk over); the spillway's steps read as bands rather than steps at board size.

## Repath (Ironford sketch)
The river comes down the inside of the road's middle loop and crosses the top leg ONCE, square-on,
under one big humpback, with a pool above it; the old diagonal course is filled in and the two old
bridges become plain flagged road. Room: 39 board units of ground either side of a 68-unit river
between the loop's legs. Needs: the realm's `rivers[].pts` / `w`, its decor re-placed, the sims re-run
(halls lose the ground the wider river takes, gain the ground the old course gave back).

## Motion (one line each)
- A: white tongues out of the arches stream downstream (4-frame strip per arch), the shrine candle and
  the lantern flicker.
- B: wakes peel off each pile, banners flap, the toll bar stays.
- C: the spillway's white sheets slide down the steps (6 frames), the sluice wheels creep round, the
  mill wheel turns, the pond lies still with a slow glint.

## My pick
**A, the humpback**, with the slanted west face for up-screen spans and C kept as a one-off landmark
for a board that wants one (Millrace). A is the only option that makes the crossing a real object from
every angle, it sells the height (the arches, the shadow, the walkers lifted over the crown) without
hiding the foes, and it carries over to every chapter by material: fieldstone in the Greenwood, ashlar
with merlons and gate towers in the Iron Marches, broken drowned arches with a plank patch in the
Hollowfen, ice-crusted cribs in the Rimewater.
