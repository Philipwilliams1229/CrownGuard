# The overhaul in the Iron Marches: concept ROUND 2, narrowing (2026-11-28)

Round 1 is published and the owner has picked: read "The owner's picks from round 1" at the end of
`art/briefs/overhaul-iron-round1.md` (their words), and the round-1 rules in that file still hold. This round
NARROWS: the owner's pick, with the changes they named, polished. Not new ideas. Each panel still shows TODAY first.

## Files

- Copy your round-1 painter and lab to `concept/ovi2-<panel>.js` and `ovi2-<panel>.html` (leave the ovi1 files as
  they are: the published page is the record) and work in the copies. Notes `concept/ovi2-<panel>.md` (short).
- Shots `.shots/ovi2_<panel>_<scene>_<option>.png`, loops `.shots/ovi2_anim_<panel>_<name>_c<cols>r<rows>_fps<n>.png`
  + `_still.png`. Everything else as in round 1 (shoot.mjs, PIL, `node --check`, no git, no src/ edits, stay in your
  files, delete scratch PNGs).
- LOOK at every still at 840 wide before you report, and at 4 frames of every loop. Say NOT CHECKED otherwise.

## The panels

1. **trees** (Warden Moor, Kestrel Head): ONE mixed Iron set: A's gold larch and dark spruce / pines, B's red rowan,
   C's ochre aspen and tall leaning Scots pines, and the oak made more ORANGE so it fits (show 2-3 oak colour steps
   side by side in one close-up, the owner picks). Late autumn, crimson shrub carpet. Two boards at "late" and one
   golden. Fix: in strong wind the tall yellow tree's trunk separates from its foliage (no frame may part trunk and
   crown). Wind loops at THREE levels on the same crop, the owner picks the strengths: `calm` (no storm), `mild`
   (a mild storm's height), `strong` (a fierce storm's height); the round-1 strong wind "goes too far", so
   `strong` should sit a little under it.
2. **water** (Ironford for A and B, Coldwater for C): A walled river: care round the curves and at every bridge:
   no water peeking out at a bridge's corners (the middle bridge on A), the wall following the bend smoothly. B
   granite gorge: keep, polish; the owner wants BOTH A and B (variety by level), so show B on a second board too if
   one suits (Ironmouth or another river board), else Ironford. C wide river: REPATH Coldwater's rivers so the
   fork reads natural (a confluence meeting at an angle, the tributary narrower, a gravel bar in the V; no
   T-junction), and better banks. Write in your notes exactly what the engine data would change (river points,
   widths, which bridges move) so the lead can judge the sim cost. Loops: the river past a bend; a walker over a
   bridge; the new confluence.
3. **places** (The Muster, Stonewatch): the CAMP = B's camp (mud, cookfires, the wagon, the clothesline) with the
   tents redone to fit (the commander's tent on the right especially) and A's soldiers drilling in a group on a
   small parade ground. Not A's rows of tents. The STOCKADE (C) as the variant camp. BEACON = C's timber tower in
   its palisade. QUARRY: B and C both, polished: detail on the cranes (rope, jib, pulley, block hanging), an
   operator, workers. Inn and fort: keep as they are (not asked). Loops: the camp with the drill, the beacon
   golden, the quarry crane working.
4. **crags** (Greyhelm, Blackcliff): B (erratics) and C (crag line), polished: the rocks read "weird and two
   toned": make them SOLID masses with fewer visible lines on the faces (one or two joints at most, values that
   turn smoothly from lit top to shaded side, no hard band between a pale top and a dark body). The road as in
   round 1. One loop each.
5. **storm** (Ironford): A, with the PARALYZE replaced by TODAY's tower shock: the small arcing pieces that bounce
   round a struck hall (`src/render/weatherfx.js` `hallShocks`, read it and reuse its look), recoloured to the
   yellow ramp, on stunned foes AND soldiers (sized to the figure) and on struck halls. The puddle strike as A.
   Every hall with men on the field (Knight Hall, Assassin's Covert, River Watch) is no longer a lightning target
   (an engine change the lead makes), so the struck-hall scene must use another hall (an archer or wizard hall).
   Loops: the puddle strike, a struck hall, a stunned soldier and foe on the road.

## Report (short)

What changed per panel, paths, NOT CHECKED items, weak spots, and anything the lead must decide.
