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
