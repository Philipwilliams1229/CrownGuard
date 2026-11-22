# Overhaul concepts ROUND 2: GREENWOOD ROCKS, WALLS, RUINS, BUILDINGS AND PROPS (2026-11-22)

## THE ROCK RULE (for every rock artist, every chapter)

1. A rock is a MASS seen from above and the south, never a cone: build it from 1-4 stacked blocks, each a box
   with rounded shoulders (a "loaf"), wider than tall; the biggest block at the foot, the next set back and up.
2. Every block shows THREE planes and only three: a flat-ish TOP (lit, from the upper left: the lightest), a SOUTH
   face toward the camera (mid tone, the largest plane on a tall rock), an EAST side (shade). West rims catch a
   1-px highlight. No plane may face the camera more steeply than the south face: no peak, ridge or facet may
   point at the viewer, and the highest point sits BEHIND the middle of the rock, never in front of it.
3. Shoulders are rounded (2-4 px bevels lit on the top-west, darkened on the bottom-east), not sharp facets.
4. Bedding: horizontal joint lines across the south face (limestone: straight, 3-6 px apart; granite: few, curved,
   plus a vertical joint or two), each a 1-px dark line with a 1-px lit lip above it. Cracks run DOWN from them.
5. Life on it: moss on the top plane and in the north-facing hollows; lichen crusts (pale grey-green, yellow,
   rust) on the lit top and upper south face; grass tufts growing out of the joints.
6. Its foot: a skirt of taller turf breaking over the lower edge, 2-5 small stones and pebbles beside it, and a
   1-2 px dark contact shadow hugging the base, then the cast shadow from the board's sun.
7. Two families: LIMESTONE slabs (pale warm grey, flat tops, many straight beds, square-ish blocks, clints and
   grikes on the top) and GRANITE (cooler, darker grey, rounded loaves, few joints, speckled, woolpack stacks).
8. Size ladder: pebble 3-6 art px, stone 8-14, boulder 18-30, big boulder 36-50 (a soldier hides behind it),
   landmark group 70-120 wide. Height never more than ~0.8 x the width (a menhir is the one exception).
9. Silhouette check at board size: the top edge is a gentle, broken horizontal; if it reads as a point, flatten it.
10. One sun, the tinted one-pixel line (pix.js `line: "tint"`), cast shadow from the silhouette; golden hour warms it.


## What this round is

The owner on Gullwick: B's village details, TODAY's house styling, A's bigger rocks and tower (the rock
re-sculpted: no point at the camera), C's cliff edges and horizontal rock walls, light as the sun goes down,
little creatures. Scope: the Greenwood only. Ground: terraces and worked fields on SOME levels, so the combination
is shown on two boards: **Gullwick** (ledges and walls present) and **Millrace** (nearly none). The ground artist
owns terraces and fields (`concept/overhaul2-ground.js`); my ledges stay short and local.

Painter `concept/overhaul2-decor-gw.js` (its first half is round 1's kit, copied; round 1's file is untouched),
lab `overhaul2-decor-gw.html`:
- `?scene=gw|mr&opt=today|1|2|3&sun=noon|golden|night&save=1` (`&strip=x,y,w,h` adds a 4-frame strip)
- `?sheet=rocks|build|ruins&save=1` close-up sheets on the board's own grass (210 x 140 board units at 4x)
The real engine and `draw()` on the board, the patch's own decor lifted (trees and the mill stay), the pieces
painted at board scale (1 art px = 1 px of the 2x board), sculpted with `pix.js` (one sun, tinted line).

## The variations (Gullwick: 1, 2, 3; Millrace: 2, 3)

**1 THE CROFT.** One cottage a level-1 hall's size (72 art px wide), today's styling: limewashed walls, dark
timber frame, combed thatch running back up the page, the gable end to the south; its yard, a fenced kitchen
garden, a well with a lantern, washing on a line, hens, a cat. One low ledge (24 art px) steps the castle's
strip below the yard; the old tower stands under it with two deer grazing. A granite landmark group on the
field's corner, a drystone wall with a stile, kerb stones along the road, the wayside shrine and fingerpost,
the fishers' strand with a limestone shelf.
- Ground it takes: the castle strip from the road to the wall (~80 x 280 board units at Gullwick's east end),
  the field corner by the bend (~110 x 30), the beach. Hall ground lost: the strip (today 2 halls wide) and
  the corner rock group's footprint (~45 x 20).

**2 THE FARM.** Three buildings round a trodden yard: a boarded barn under thatch, a tile-roofed timber-framed
farmhouse, a hen house; the well, haystacks, hens, the cat. Two ledges (26 and 20 art px) step the strip into
three levels; the old tower and the hunters' camp (tent, fire, woodpile) on the middle one. Limestone landmark
on the field corner (the two families side by side across variations).
- Ground: as 1, plus the middle terrace. On Millrace (no ledges) the same farm stands on the Foxwater's east
  bank, with a fenced plot, haystacks in the corner by the gate road, a small granite group and deer in the
  far field corner.

**3 THE HAMLET.** The Crown and Goblin (a jettied two-storey inn: tile roof, a painted hanging sign with its
own lantern, a bench), a rubble-walled slate-roofed smithy with the forge glowing in its open front and an
anvil, an ochre cottage, the well and a lamp post at the yard's mouth. One short ledge; the roofless chapel
(the second ruin) replaces the tower. On Millrace it sits by the stream on the road toward the gate.
- Ground: the most (the strip from top to ledge is all village); best where a board has a dead corner or a
  strip beside water; a board should carry at most one hamlet.

Where places go on a board: corners, the strip by the castle wall, loops too small for a hall, beside water,
never on hall ground the level's design needs. Each place carries one footprint polygon (halls refused
inside it), placed by hand per board.

## Light

Every lived-in place has its lights: cottage windows (lit panes, kept bright after the shade), a wall lantern
by each door, a lantern on the well, the shrine's two candles, a lantern on the fingerpost, the inn sign's
lantern, a lamp post, the forge, the hunters' fire, a post lamp on the strand. They use the game's own
`src/render/nightlight.js` (`noteLamp`, `drawLampPools` under the pieces, `drawLampBloom` over them), and the
night is the Blood Moon's two-layer multiply (`bloodmoon.js`) with a deep blue Greenwood night in place of the
red. Golden hour: the board's own `golden` sun; the pieces warm, throw long shadows, the windows glow faintly.

## Pictures (`.shots/`)
- `ovh2_decorgw_gw_today.png`, `ovh2_decorgw_gw_1.png`, `_2.png`, `_3.png` (round 1's A/B/C for comparison:
  `scratchpad/overhaul-page/img/decor_gw_A|B|C.jpg`)
- `ovh2_decorgw_gw_2_golden.png`, `ovh2_decorgw_gw_2_night.png`, `ovh2_decorgw_gw_3_golden.png`
- `ovh2_decorgw_mr_today.png`, `ovh2_decorgw_mr_2.png`, `ovh2_decorgw_mr_3.png`, `ovh2_decorgw_mr_3_night.png`
- `ovh2_decorgw_sheet_rocks.png` (+ `_golden`): round 1's boulder, then the ladder 4 / 8 / 14 / 24 / 42 / 70 art
  px in limestone and granite; `ovh2_decorgw_sheet_build.png`: every building and lit prop;
  `ovh2_decorgw_sheet_ruins.png`: the old tower, the chapel, wall, gate, a ledge, kerbs
- `ovh2_decorgw_strip_gw_2.png`: 4 frames of the farm (smoke rising, hens pecking, the bucket swinging);
  washing flaps, the cat's tail and the deer's heads move too (in 1 and 3).

## Cost
Bake once per board, like a hall form: a building ~5-10 ms, a rock 1-4 ms (cached by size, family, seed and
sun), the tower ~8 ms; memory ~0.2-0.6 MB a building, a whole village ~2 MB. Per frame: one blit per piece
plus ~10-20 tiny live sprites a board (smoke, hens, bucket, washing, flames, deer), ~0.1 ms; lamps at night
are the existing nightlight stamps (each lamp one pool + one bloom). Ledges bake into the ground layer.

## Engine needs
- `places: [{ kind, x, y, flip }]` per realm with a footprint polygon each (`buildableAt` refuses halls in it,
  like `hallfoot.js`); rocks get their true ellipse footprint (their `contact` half-width is the start).
- Ledges: a short `ledges: [{ pts, h }]` line drawn by the ground bake; it blocks halls along its face only.
- Night lights: places register their lamps with `noteLamp` each frame the night painter runs (as halls do).
- Live bits: the existing per-frame decor overlay (scenery-vale.js does the mill wheel and cottage smoke).

## Weak spots, honestly
- The ledges inside an 80-wide strip read as short rock walls more than terraces; the terrace look needs the
  ground artist's lifted land to agree with them (my lighter "lifted" wash is a stand-in).
- The tower's inside (the back wall's inner face) reads a little flat and its crown break is regular; the
  chapel is stronger.
- The landmark rock groups are a few block masses side by side; the limestone one can read as ruined masonry
  from far off (granite reads better as natural rock in the Greenwood).
- The lantern brackets are 3-4 px: at noon they read as small hooks; they come alive only at dusk.
- Deer are 13 art px long and simple; hens are 5 px dots (they read only as motion).
- Thatch combing is faint at board size; the roofs read as flat colour plus speckle (today's cottage has
  the same); tiles read better.
- At night the pale limestone and limewash stay the lightest things after the lamps (as halls do in the
  Blood Moon); the night colour is a stand-in for a Greenwood night the game does not have yet.
- The close-up sheets' grass is a tiled patch of the board (visible repeats).

## My pick
**2, the farm**, on boards with a castle strip or a dead corner, with **3's hamlet kept for one or two boards
beside water** (Millrace, Gullwick's strand) so the vale has a village somewhere, and **1's croft** as the
light touch for boards that need their corners for halls. The farm gives the most story for its footprint, keeps
today's house look at a hall's scale, and its two short ledges show C's bones without re-shaping the board.
