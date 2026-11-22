# Overhaul concept, ROUND 2: GREENWOOD TREES (2026-11-22)

## The five crown treatments (the rules, for anyone drawing trees in this realm)
All five share one shape language: a tree's crown is a few LARGE masses (eggs; a pine is stacked skirts), each
shaded as one smooth dome under the one sun (top-left lit, underside a tone down, four tone bands), each mass
rimming whatever lies behind it (Pix `edge`), and a 1-px tinted outline. Leaf texture is made of LEAF CELLS
(Voronoi cells `leaf` px across), and a treatment decides WHERE cells show; nowhere is there per-pixel noise.
1 Today's lobes: each mass split into ~4 rounded lobes (today's clumped look), smooth terminators, the silhouette
  scalloped by 3-px cells, a few lit leaf flecks; full outline. Closest to today.
2 Clean masses: masses split in two, flat calm bands, a checker across each tone step, scalloped 4-px edge, a quarter
  of the lit outline dropped, rare dark bough gaps. The quiet, toy-like one.
3 Leafy terminator: big unsplit masses; leaves (3.5-px cells, one tone each, a dark rim on their lower right) ONLY in
  a band along the light/shade line and along the silhouette; calm flat light and shade; dark bough gaps low in the
  crown; half the lit outline dropped (lost edges beside the brightest leaves). The middle way. MY PICK.
4 Broken canopy: masses split in two, a wider leafy terminator, leaves picked out in the light and the shade, more
  bough gaps and a few see-through sky holes near the rim. Richer, still calm interiors.
5 C, calmed: round 1's C (leaf texture everywhere) with bigger 3.4-px cells, leaves leaning only a third toward
  their own dome, rims on half of them: the closest to C without the stipple.
Species: today's round oak (a dome of stacked lobes), today's tiered pine (five skirts, shaded hems), today's
willow (a crown with locks of strands hanging over it), today's tall beech; C's spreading oak, birch grove and
hawthorn (blossom / haws in tight sprays on the sunny side, never a random spray of dots).

## Files
Painter `concept/overhaul2-trees.js` (TREAT, PAL by season, crown(), species SP, standRing, LIFE, fallingLeaves,
fireflies); lab `overhaul2-trees.html` (`?scene=1|2|3&opt=today|1..5&season=&sun=noon|golden|dusk&suffix=`,
`?mode=leaves`, `?mode=life`, `?mode=idle` = a queue runner that survives reloads). The lab runs the REAL engine and
`draw()`, takes the board's trees out, and paints the treatment's trees on top (1 art px = half a board unit).
Panels, `.shots/` (1680 x 1120, a 420 x 280 board patch):
- Thornbrook meadow: `ovh2_trees_1_today|1|2|3|4|5.png`
- Millrace (willows by the race, the mill): `ovh2_trees_3_today|1|2|3|4|5.png`
- Wood edge and cave, the two best: `ovh2_trees_2_today|3|4.png`
- Seasons (treatment 3): `ovh2_trees_1_3_spring|_autumn|_winter.png` (summer = `ovh2_trees_1_3.png`)
- Falling leaves, 4 frames: `ovh2_trees_leaves.png`; small life, 4 frames each: `ovh2_trees_life.png`
- Light: golden hour `ovh2_trees_1_3_golden.png`, dusk with fireflies and the owl `ovh2_trees_2_3_dusk.png`
Round 1's C for comparison: `scratchpad/overhaul-page/img/trees_1_C.jpg`, `trees_1_C_autumn.jpg`.

## Cost
Same as round 1's C: trees bake once per species / seed / season / depth tint (~3-8 ms each for the sculpt; the
crown pass is per pixel with a 3x3 cell search). Per frame: today's blits. Seasons are a palette table, not new code;
a season is one more bake set per board (only that level's season is ever baked). Small life ~0.05 ms. Fireflies:
~30 additive 5x5 stamps.

## Seasons in the game
- A per-level field `season: "spring" | "summer" | "autumn" | "winter"`, planned per chapter like the sun
  (`SUN_PLAN` in data/sun.js): e.g. the Greenwood's 15 levels walk spring -> summer -> autumn, the boss level in
  first snow. A level may set its own.
- What must follow the season so nothing is out of season: the turf colour (groundblend / look-c `grass` dials:
  spring fresher yellow-green, autumn olive-gold, winter a snow cover with dormant grass showing through), the
  meadow flowers and the board's flower patches (bluebells and primroses in spring, none but haws in winter), grass
  tufts (straw-coloured in winter), bushes (`bushSprite` in world.js / apron.js), the vale pieces (haywain only in
  late summer/autumn), water (winter: ice at the edges, the ground artist and water artist would own those), the
  title screen if it shows the Greenwood, and the music could follow. The lab grades the board's own ground as a
  stand-in for the ground artist's real work.
- Winter: broadleaves are BARE (a branching skeleton, twigs to the crown's own envelope, snow on the upper side of
  flat limbs, a few dead brown leaves kept on oaks and beeches): warm brown bark and a full twig crown keep them
  alive-asleep, unlike the Hollowfen's grey, gnarled, sparse dead trees. Pines and spruces stay green with snow on
  each skirt.
- Autumn: each tree's seed picks gold, russet, orange or still-green per mass (mixed in one crown), birches gold,
  willow yellow, bushes red; litter under every crown and drifting over the meadow; leaves falling (a 4-frame tumble:
  broad, edge-on, flipped, half-turned, each with its own shadow; ~20-40 a board, looping over a few seconds).

## Small life
All ambient: never on the road (placed >= 10 units off it), never takes a tap, pale calm colours unlike any foe.
- Deer (grey-fawn, white rump; graze / chew / look up / ear flick): 2-3 a board, at the wood's edge or a far meadow.
- Rabbits (sit / ear turn / two hop frames): 2-4, in pairs near cover.
- Fox (trot x3 / sit): 0-1 a board, crosses a meadow now and then.
- Songbirds (fly in / flare / perch on a twig): 2-4, landing on hawthorns and lone oaks; plus round 1's flocks.
- Butterflies (open / half / shut / half): 3-6 over flower clumps; none in winter or at dusk.
- Squirrel (climb stretch / tuck / pause tail up / look): 1 on a lone tree's trunk.
- Owl (open / blink / head turned / shuffle): 1 in the wood's front row, dusk and night only, eyes catching light.
Behaviour, cheap: each creature has a home spot and a few frames on a slow random clock. Fleeing: every 0.5 s test the
nearest foe or soldier (the engine already has the lists); within ~60 units the creature runs (deer bound, rabbits
hop, fox trots) to a second home spot away from the road, and comes back 20-40 s after the field is quiet.

## Weak spots (honest)
- Winter willow reads as a scruffy hedge; the bare birches' crowns are small fans. Winter's road snow is camouflage-
  mottled (the ground artist should do the road's snow properly). The lab's season grade leaves a few lime pixels
  in a box round each figure and hall (a lab artefact).
- Golden hour: shadows are laid over the finished board, so they also darken figures (in the game they go into the
  ground layer). The trees take a warm tint; the board's own grade does the rest.
- Dusk is closer to night; only the land's light (fireflies) and the halls' torches glow. Treatments 3 and 4 differ
  less at board size than up close; 1 and 2 are the clearest alternatives.
- The rabbit is the weakest creature drawing (a blob with ears at 6x; fine at board size). The deer's grazing head is
  small. Wildlife flight behaviour is described, not built.
- The bigger oak's fork still shows a Y of bare boughs under the crown (C's shape, kept).

## My pick
**Treatment 3, Leafy terminator.** It keeps today's readable big masses and calm light / shade planes, puts leaves
only where an artist would (the light's edge and the silhouette), and the broken outline lets the lit side breathe:
it is the "mix between today and C" the owner asked for. 4 if the owner wants a little more of C's richness.

## The willow, second pass (owner picked treatment 3; "take another pass at the willow")
`SP.willow(pal, k, sway, dk, seed, T, { form, wet })`: a leaning trunk forking into 3-4 arching boughs; the crown is
separate CASCADES (a new mass kind `casc` in geom(): a domed shoulder on top, a curtain that narrows and drifts
outward as it falls), lit on the shoulder, shaded down the fall, dim narrow back cascades in the gaps between them;
leaf cells stretched 2.6x tall and slanted down-and-out (long narrow willow leaves) and shown only at the light's
edge and the ragged hem; 2-4 thin strands of different lengths under each front hem, the waterside ones trailing
into the water with a little ripple (`wet` -1/1, the lab finds the river with inRiver). Paler, yellower green
(#88ae4a; spring #a6cc5c; autumn #d4b83c). Forms: 0 broad old waterside, 1 tall narrow, 2 young. Winter: hanging
golden-brown withies in loose bunches off each arch, a little snow on the boughs. Sway: the cascades and strands
swing with `sway`, the trunk holds.
Shots: `ovh2_trees_willow_sheet.png` (3 forms x summer / autumn / winter, 3x and board size),
`ovh2_trees_willow_sway.png` (4 frames), `ovh2_trees_1_3w.png`, `ovh2_trees_3_3w.png`, `ovh2_trees_1_3w_autumn.png`,
`ovh2_trees_3_3w_winter.png`.
Weak: the hems end in short blunt "fingers" here and there; the tall form is still dense (few gaps); in the sway the
leaf texture shimmers a little because the cells are fixed to the pixel grid while the cascades move (bake per frame,
as all sway does).

## The willow, third pass: the STRAND willow (owner: "make it green for the normal time and then more bare for winter")
The default `SP.willow` is now built on the winter shape: trunk and arching boughs as visible as in winter, loose
bunches of long thin strands off each arch (3.1 x the cascade width per bough in summer / autumn, 2.2 in spring,
0.85 in winter). Leafed, each strand is an outline-less column of small narrow leaves either side of a stem, near
strands lit (yellow-green), the far third two tones darker behind them (that layer gives the bunch body against the
meadow); short leafy sprigs along the top of each arch. Spring: sparser, with catkins; autumn: gold, a quarter of the
leaves gone, a few in the air; winter: about half the withies of the second pass, shorter, golden-brown, no leaf, the
tips without outline, a little snow on the boughs. Sway moves whole strands by whole pixels (no shimmer); the layout
comes from its own random stream. The second pass's cascade willow stays behind `{ old: true }`.
Shots: `ovh2_trees_willow_sheet2.png` (3 forms x previous summer / spring / summer / autumn / winter, 2.4x with a 1x
board-size copy in each corner), `ovh2_trees_willow_sway2.png`, `ovh2_trees_1_3w2.png`, `ovh2_trees_3_3w2.png`,
`ovh2_trees_3_3w2_winter.png`.
Weak: the broad waterside one's curtain ends in a near-straight line at the water (a boxy silhouette); the bough ends
show as small dark knobs above the strands; the tall form's strands are long, even columns (a bit "barcode" up close);
the boughs' ends shift a pixel in the sway.

## ROUND 3 (2026-11-22, the owner's comments on the round-2 page)
- **The mix** (`opt=mix`): each tree deals treatment 3 (leafy edge) or 4 (broken canopy) by a hash of its seed (`mixT`,
  about half each, never by species). Treatment 2 is dropped. Shots `ovh2_trees_1_mix.png` (Thornbrook, willow by the
  river), `ovh2_trees_3_mix.png` (Millrace), `ovh2_trees_mix_sheet.png` (`mode=mixsheet`: six trees, 3 | 4 side by side
  at 3x; board-size copies in the strips below).
- **The wood's edge in treatment 4**: by day `ovh2_trees_2_4b.png`, at dusk `ovh2_trees_2_4_dusk.png`. The dusk is now a
  real dusk (`duskShade`): the board multiplied by a cool blue-violet in Bayer-dithered steps, lighter and rosier toward
  the west (the sun has just set on the left), a step lighter than the decorations lab's night; warm lights kept; the
  halls' torches throw their pools and blooms through the game's own `nightlight.js` (the lab calls `nightTick` before
  the draw so the halls note their lamps, then `drawLampBloom` / `drawLampPools`); fireflies along the edge; the owl.
- **Evergreens** never get leaf litter: `standRing(..., ever)` lays a needle-brown floor, fallen needles and 2x2 cones
  (a little snow only at the rim in winter); the autumn meadow scatter skips the ground under pines.
- **Winter is the same tree** (`twigMasses`): the summer boughs are drawn in every season; each summer leaf mass becomes
  a fan of twigs from a hub low in the mass, rising to the mass's own rim (plus a few hanging down from the hub), so the
  bare crown fills the summer silhouette. Inner twigs dark without outline, pale tips, a little snow on the flatter
  limbs, a few kept dead leaves. `ovh2_trees_winter_sheet.png` (`mode=wsheet`: six trees, summer above, winter below,
  same seed / size / anchor, 2x, board size below). The beech gets its hidden leader, the hawthorn its hidden crook.
- **Seasons** of the mix on Thornbrook: `ovh2_trees_1_mix_spring|_autumn|_winter.png`; `ovh2_trees_seasons_sheet.png`
  (`mode=seasons`, 2 x 2 at board size).
- The lab's season grade no longer leaves green boxes round halls and figures: a pixel that differs from the empty draw
  still counts as ground when its colour is in the empty draw within 2 px, or it is the empty draw darkened by one ratio
  (a shadow).
- Fixes: the birch grove's canvas was too short (its top crown was cut flat); the waterside willow's trailing strands
  now end at different depths (no straight hem at the water).
Weak: each winter mass still reads a little as its own fan (a "pom-pom" crown) on the big oak; the twigs are one warm
tan, with no sun-side / shade-side value; the winter willow is much barer than its summer self (the strand willow's
agreed winter, but it is the one tree whose silhouette changes); the willow's bough ends still poke above the strands
as dark knobs; a few green flecks remain at the edge of the boxes; the dusk's western glow is subtle at board size.

## ROUND 4: ANIMATED LOOPS (2026-11-22, art/briefs/overhaul-animation.md)
Lab: `overhaul2-trees.html?anim=<name>` (or `?mode=wildlife`), run through `?mode=idle` + `queue([...])`. Every loop is 4 s at
10 fps (40 frames, sheets 5 x 8; wildlife 4 x 10), a crop of the real board at 2 px a board unit (1 px an art px), no wave
running (nothing on the road), the board's own animation (water, flags, mill wheel, hall crews) held still: only the trees, the
creatures and the effects move. Sheets `.shots/ovh3_anim_<name>_c5r8_fps10.png` + `_still.png`.
How the sway works (painter `SWAY`): the lab sets `SWAY.at(i)` = the lean of mass i before baking a tree; `leafMasses` shifts
each mass by a whole pixel offset (`round(lean x height^1.3)`, so low masses move less, the trunk and boughs never), and the
leaf cells, bough gaps, sky holes and the broken outline are computed RELATIVE to the mass (`M.sx`, `P._sxm`), so a moved mass
is the same picture moved, never a re-rolled texture (shimmer check: 0 pixels on every tree loop). Pine skirts lean in turn;
willow strands swing per bunch (whole strands, leaf choices keyed to the strand, not the pixel grid); winter twigs move only their
pale tips. The gust: lean = 0.5 - 0.5 cos(2 pi (t/4 - x/160 - 0.07 i)): trees lean downwind and come back, a wave crossing left
to right at 40 units/s (neighbours a beat apart), each mass a beat behind the one before.
- trees_meadow: birch grove, hawthorn, oak, round oak, pine; crowns lean up to 2 px (pine 1.5); a robin flies in, flares,
  perches on the hawthorn ~1.4 s and flies off; two butterflies on closed loops; a rabbit sits, turns an ear, hops and back.
- willow_water: the strand willow by Thornbrook's river; strand tips swing up to ~2 px on their own beats; the trailing strands
  dip and send a ring every 2 s (each strand its own phase) that spreads 1.5 -> 7.5 px and breaks up as it fades.
- wood_edge_day: treatment 4 wood, front row only sways (lean 1.4 px), deep rows still; two deer graze / chew / look up / ear
  flick (half a loop apart); a squirrel climbs a front trunk, pauses tail up, looks, slips round the back; a rabbit.
- wood_edge_dusk: the same at dusk; ~70 fireflies drift on 2-4 s closed loops and blink (on 0.6-1.2 s, one dim frame each end);
  the owl blinks, turns its head, shuffles; the hall's torch flickers (nightlight.js FLICK, 12 steps a second: 48 a loop, seamless).
- autumn_leaves: the meadow in autumn; ~45 leaves leave the broadleaves (none from the pine), fall over 3.2 s with a dying
  side-to-side drift and a tumble every 0.2 s, land on a TWIN laid in the litter (so the landed one can go without a pop).
- winter: the meadow in winter; crowns lean a quarter as far (only twig tips tremble, the pine's skirts 1 px); ~150 flakes at
  12-22 px/s, each fading in and out over one loop; at 1.2 s a clump slides off the pine's skirt, falls and bursts in powder.
- wildlife: deer, rabbit, robin (on a twig), butterfly, squirrel, owl (dusk cell), fox (trots in, sits, trots off) at 4x.
Game cost: sway = pre-baked poses per tree: the meadow's trees need 6-17 distinct poses each over a loop (pine 3-6, winter
fewer), ~4-7 ms a bake, 60-90 KB a pose canvas, so ~1 MB per swaying tree kind; bake lazily, a few a frame, and play them by the
same lean clock (blit only). Only lone trees and the wood's front row sway. Creatures: 4-frame strips (as today's LIFE) on
timelines, ~0.05 ms. Fireflies ~70 additive 5x5 stamps (~0.1 ms); falling leaves 2-6 rects each; snow 150 rects.
Faked for the loop: the water, mill wheel, flags and crews are frozen; the snow slide does not take snow off the bough; the
autumn twins are drawn into the litter; the bird and fox enter and leave inside the loop.
Weak: falling leaves are small at board size (they read in motion, barely in a still); snowflakes are faint over the snow
(a cool rim helps a little); the willow's sway is subtle; the owl's squirrel's and robin's routines are short and identical every
loop; the dusk tint hides the deer.
