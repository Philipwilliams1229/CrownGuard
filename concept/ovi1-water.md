# Iron overhaul concept round 1, panel 1: WATER (Ironford, Coldwater)

Painter `concept/ovi1-water.js`, lab `ovi1-water.html` (`?scene=today|A|B|C&realm=ironford|coldwater&sun=&towers=&bk=&x=&y=&w=&h=&zoom=&frames=&dt=&cols=&secs=&save=1&name=`;
an option needs `&ovh=1&b3off=1` in the URL, TODAY `&ovh=0`). The real engine and `draw()` run on the real board; the option
replaces the overhaul's `bakeWater`, `waterLive`, `bridgesBack`, `bridgeFronts`, `deckLift`, `drawnSpans` slots (so halls, foes, the sun and the day grade are
the game's own). The Greenwood's approved river painter is used as it stands: its distance field (`field.js`), its water ramp, shelving, flow dashes and foam
(`waterlive.js`, loaded as a blob copy with its bridge-pier import cut to our piers). What changes is the EDGE, the WIDTH and the STONE.

## The three ideas

- **A "the walled river"** (Ironford): the whole river between dressed-stone embankments (slate-blue ashlar, lit coping, a dark joint line, weed and wet at the foot,
  a drain arch every ~64 units), a paved quay apron along both banks with iron bollards, the river 1.25x wider. Three plain packhorse humpbacks (one arch, battered
  flanks, lit voussoir ring, parapets with a coping).
- **B "the gorge"** (Ironford): the river cut into rock: fractured slab faces on ragged strata with rust staining, a lit rim and an overhang shade, ragged boulder lips on
  the near bank, boulders with foam standing at the foot; dressed stone only for 52 units either side of each bridge. Bridges mixed: plain across, a FORTIFIED up-screen
  span (a battered gatehouse at the north end whose gate arch faces south onto the road), plain across. `bk=0:fort,1:fort,2:ruin` shows the kinds together.
- **C "the wide river"** (Coldwater, 2.2x wider: 57 and 70 units): a low turf lip with dead reed and rust bracken on the north bank, a stone embankment only along the south bank at
  the camp, rocks and shoals mid-stream. Three-arch humpbacks (cutwater piers) across, and the up-screen span RUINED and PATCHED WITH TIMBER
  (the centre arch fell: a lower plank deck on raked trestle legs between broken stone ends).

## The humpback (all kinds)

One SOLID per span in its own frame (u along the road, v across, z up), battered (the flanks lean out 0.5, up-screen 0.8, of their height), rendered by a tiny ray-caster at
bake time (screen = x, y - z, a pixel's ray runs y = Y + z; 1 art px; faces by course and block, the deck by flags in the span's own (u, v) so the pitch opens and closes with the
slope; slope tone from the sun). Two layers per span: BACK (under the walkers) and FRONT (the south parapet of an across span, the gatehouse and its battlements, sorted at their ground
line so a walker passes behind them). A cast shadow is baked into the back layer along `DAY.fall` x `DAY.len`; today's bridge cast is switched off. `deckLift` returns the
profile (the plank deck of a ruin) so walkers climb the hump (checked in the loops: soldiers walk over the crown and drop to the timber patch).
The up-the-screen rule is followed: the deck is one battered solid, strips on both flanks, a gate tower faces south, no sheared elevation.

## Loops (sprite sheets, per art/briefs/overhaul-animation.md)

- `.shots/ovi1_anim_water_A_embankment_golden_c6r4_fps10.png` (+ `_still`): the river past the embankment and the bridge arch at golden hour; flow dashes, foam at the wall feet,
  glints. 24 frames, 480x320. NOT seamless: it is the game's live clock (dashes wrap on each lane's own length, foam cells are random per cell), so the wrap step is ~2x the mean step.
  A shipped game never loops it, so I left it honest.
- `.shots/ovi1_anim_water_B_walker_fortified_c6r5_fps10.png`: soldiers walking south through the fortified up-screen span, over the crown and out past the gatehouse. 30 frames, 440x380.
  Real engine walkers, nothing faked; they pass behind the gatehouse.
- `.shots/ovi1_anim_water_C_walker_ruined_wide_c6r5_fps10.png`: soldiers crossing the ruined, timber-patched span over the wide river (late sun). 30 frames, 440x340.
  They step down onto the timber deck and up onto the far stone.

## Cost (what a build would need)

- Water: the Greenwood's pipeline plus a different colour pass at bake (the same field, one art px, ~the cost of the Greenwood's bake); live cost = the approved `drawLive`. Wall /
  rock faces need only the per-kind painters here, no new frame work. A real build needs a PLANS entry per Iron river (zones per bank, `faceMax`, `HFACE`) and the width of each river
  raised in realm data (engine truth: halls already stand clear of the old line; a wider river eats buildable ground, so each wider board must be re-simmed).
- Bridges: 3 spans x 2 layers, a few hundred KB; a ray-cast bake of ~0.5-1.5 s per span per sun in this lab (NOT measured separately: the lab's "first draw" 3.7-7 s is every bake on a
  busy machine). A build must call it lazily, one span a frame, like the Greenwood's bakes. Per frame: 2-3 blits a span.
- The engine needs: spans longer than today's d0-d1 where the river widens (the road is unchanged; the humpback runs on its own ramps like the Greenwood's trestles); `blocks` for the
  gatehouse; nothing else.

## Weak spots (honest)

- The up-screen deck is a big paved rectangle at board size: the crown is shown by the pitch of the courses, the lit/shaded slopes and the dark vault mouths in the flank strips, and it
  reads only on the zoomed crops, not at zoom 1. A fortified or ruined span reads better than the plain one. NOT solved.
- The wide river on Coldwater makes the road and bridges read small beside it; the hall footings and the Warden range were not checked on it.
- The across-the-screen fortified gatehouse (`bk=0:fort`) reads as a dark leaning slab, so no option uses it: only the up-screen gatehouse (B) is shown. Needs a redraw if the owner wants it across.
- Bridge stone is flat slate / warm stone from my own ramps, not matched to the paving flags' colours exactly; the sun grades both so it works, but the match is by eye.
- The Greenwood's meadow, trees and rocks are still drawn under all of it (today's, `b3off=1`): this panel is water and bridges only. Halls on a widened river stand a little in the water.
- Wet-bank dressing (bollards, boulders, shoals) is static; no ripples around the boulders or wake from the piers except the approved live foam (our pier feet feed `waterlive`).
- NOT CHECKED: sunrise / early suns, night lamps (no torch or window light on the gatehouse yet: the brief asks every lived-in place for a light), a phone-size crop, the Ironmouth estuary.
