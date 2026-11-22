# Overhaul concept: TREES and FOLIAGE (2026-11-22)

Brief: `art/briefs/overhaul-concepts.md`. Painter `concept/overhaul-trees.js`, lab `overhaul-trees.html`
(`?scene=1|2|3|sway&opt=today|A|B|C&sun=noon|golden&season=autumn&suffix=`). The lab runs the REAL engine and
`draw()` on the board, takes the trees out of `DECOR` for A / B / C, and paints the option's trees over it
(sculpted with the game's own pixel sculptor, `src/render/pix/pix.js`, 1 art px = half a board unit). Each panel
is a 420 x 280 board patch at 4 px a unit (2x art pixels).

Panels (`.shots/`):
- Scene 1, Greenwood meadow (Thornbrook, top meadow): `ovh_trees_1_today|A|B|C.png`
- Scene 2, the wood's edge and the cave (Thornbrook): `ovh_trees_2_today|A|B|C.png`
- Scene 3, A in the Iron Marches (Ironford wood edge): `ovh_trees_3_today.png`, `ovh_trees_3_A.png`
- Golden hour (A): `ovh_trees_1_A_golden.png`; autumn (C): `ovh_trees_1_C_autumn.png`
- Sway strip (A oak + poplar, 4 frames): `ovh_trees_sway_A.png`

## A: Grand trees
**Idea:** trees become landmarks, about 1.7x today (a grand oak is ~205 art px tall, 230 wide, bigger than a hall),
with a real trunk, buttress roots, a visible Y-fork and boughs, and a canopy of 6-8 separate leaf masses at
different heights; each species its own silhouette: broad oak, Lombardy poplar column, leaning Scots pine with
flat cloud pads, a white birch grove of three stems, (Iron) a tall layered spruce.
**Different from today:** size and structure; you see the tree's skeleton; the wood's edge is a row of great
trunks you could walk between; the Iron wood becomes a colonnade of orange Scots-pine trunks under dark pads.
**Motion:** 4-frame sway: each leaf mass shifts by its height (0 / 2 / 3 / 1 px at the crown top), trunk still,
so the masses slide against each other (a parallax shimmer, not a whole-sprite wobble).
**Cost:** bake ~15-25 ms per oak variant (54k px sculpt); ~6 species x 3 variants x 4 sway frames x up to 3 depth
tints = 30-40 MB if all kept: bake the wood's deep trees once into the edge layer (no sway) and keep sway only for
lone trees and the front row (~10-15 MB). Per frame: the same blits as today (fewer, bigger trees). Long shadows
come free from `castShadow` (sceneryday.js) on the new silhouettes.
**Engine:** a canopy reaches ~55 board units from its trunk, so `terrain.js` must place trees by their CANOPY disc
against the road (not the foot), and fewer lone trees fit on tight boards (Thornbrook's inner meadow islands can't
hold a grand oak). Halls: either halls keep out of every canopy disc (costs build space) or, better, halls only
keep clear of the trunk (r ~10) and a canopy over a hall or the build ghost fades to ~40% (bake trunk and canopy as
two sprites). Trees behind a hall must not draw over it (the lab had to refuse those spots).
**Weak spots:** the leaf clumps still read a little cobbled up close (fine at board size); the birch grove's crowns
merge into one flat cloud; the Iron wood's pads are heavy and samey; a 100-unit oak makes the halls look small,
which fights "the halls must be the clearest thing". Lab artefact: shadows are laid over the finished board, so at
golden hour they also darken figures; in the game they would go into the ground layer, under everyone.

## B: Sculpted canopy (toy diorama)
**Idea:** trees made the way the halls are, but as a few big clean lobes: one sun, banded light / mid / cool core,
crisp tinted line, no leaf noise; spruces as stacked lit cones; ~1.25x today.
**Different from today:** shape language, not size: bold readable silhouettes, flat confident planes, strong colour
per species; a wood of rhythmic cones and round tops.
**Motion:** the lobes rock as whole pieces, 1-2 px (two frames would do).
**Cost:** sprites ~half of A's; bake ~5 ms each; tiny memory; per frame as today.
**Engine:** footprints about today's (+25%): placement rules barely change.
**Weak spots:** reads as a different game (a clean mobile style beside the busy stone-by-stone halls and turf); the
lobes look like cloud balls, the birch like lollipops; the cones look papery; bare trunks show as pegs between the
wood's rows. Kept as the real alternative to A, not a recommendation.

## C: A living wood
**Idea:** the trees stay near today's size (+25%) with fine leaves, but every tree stands IN a place: a trodden
earth pool, surface roots, leaf litter and flowers under it, dappled shade; the meadow gets logs with mushrooms,
stumps, a deer, birds; the wood is layered: a dark roof, mid row, a bright front row of trunks, an undergrowth hem
of bushes and ferns along the edge, light shafts in the interior. Hawthorn in blossom; per-level SEASONS (the
autumn panel: gold birches, orange oaks, red bushes, litter turned rust).
**Different from today:** the ground around the trees and the wood's depth, more than the trees themselves.
**Motion:** sway as today, plus a deer that grazes / lifts its head and birds that cross now and then.
**Cost:** trees ~today's; the litter rings, roots and props bake into the ground layer (free per frame); shafts one
screen-blend layer baked per board (or skip at noon, where they barely read); deer and birds ~0.05 ms.
**Engine:** props (log, stump) need a footing like rocks; the deer and birds are look-only and must never take a
tap. Seasons: a per-level `season` field picked like the sun (data/sun.js SUN_PLAN), palettes in one table.
**Weak spots:** the trees alone are the least changed of the three; the deer is brown-orange and could be read as a
foe at a glance (make it grey-brown, smaller, or move it deep in the wood); litter speckle beside the road adds
noise; the shafts hardly show.

## My pick
**A's trees with C's ground and seasons.** A is the only option that answers "a small green ball on a stick": the
trunks, forks and separate masses read even at board size, and the Iron Scots pines become a place. C's litter
rings, undergrowth hem, props and the autumn palette cost almost nothing per frame and make A's trees sit in the
land. Build rule to settle first: trunk-only footing for halls plus canopy fade over halls, and canopy-disc
placement against the road.
