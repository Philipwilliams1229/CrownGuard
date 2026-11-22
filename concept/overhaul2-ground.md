# Overhaul round 2: THE GREENWOOD GROUND (2026-11-22)

Painter `concept/overhaul2-ground.js` (`repaint(layer, noonImg, goldImg, look, o, g)`, `farmPlan(o, g)`),
lab `overhaul2-ground.html` (open it on the dev server; it saves every panel, and resumes after a dev-server
reload). Brief: `art/briefs/overhaul-round2.md` (round 1: `art/briefs/overhaul-concepts.md`).

**How a panel is made (no stand-ins this round):** the real engine runs a real Greenwood board (halls placed
and upgraded, a wave walking). The engine bakes its own ground layer (`world.js groundLayer()`), and the painter
repaints that very canvas in place. It keeps the game's water, banks and sand, the wood, the castle and the
road's own surface, and repaints the land and the lane's edges. Then `draw()` lays the game's own trees, rocks,
halls, bridges, figures and its time-of-day grade on top. At golden hour, the bake's own cast shadows (trees, rocks,
crags) are carried over: golden layer / noon layer, wherever it is darker. Every PNG is the whole board,
1680 x 1120, one art pixel to a pixel. Shrink it to 840 to see it at board size.

The palette is the game's own Greenwood ramp (`turfTones()`: 7 tones x cool / plain / warm). Nothing brings in a
new green. The texture is the game's own blade-stroke tile (`DITH`).

## Panels (`.shots/`)

| scene | today | options |
|---|---|---|
| Everyday meadow, Thornbrook | `ovh2_ground_meadow_today` | `_meadow_1` calm, `_meadow_2` middle, `_meadow_3` richer, `_meadow_2autumn` |
| Terraces, Thistlecrag | `ovh2_ground_terrace_today` | `_terrace_banks` (gentle), `_terrace_steps` (bold), `_terrace_stepsgold` (golden) |
| Countryside, Millrace | `ovh2_ground_farm_today` | `_farm_quiet`, `_farm_patch`, `_farm_patchgold` (golden), `_farm_autumn` |
| Contact sheet | | `_sheet_1` (Vale Road meadow, Gullwick strand, Millrace patchwork, Thistlecrag steps, each at 840), `_sheet_2` (the Kingstones' downland, the banks, and the 15-level plan) |
| Source boards for the sheet | | `_sheet_greenwood`, `_sheet_gullwick`, `_sheet_kingstones` |

Round 1, for comparison: `scratchpad/overhaul-page/img/ground_1_C.jpg`, `ground_1_A.jpg`, `ground_1_B.jpg`, `_Agold`, `_Cgold`.

## 1. The everyday meadow (C, dialled back): three strengths

**Idea:** big quiet masses first. Then a few features you can read at board size. Small detail goes only at
edges.
- **Masses:** four bands of the game's ramp in big soft areas (noise at ~330 art px) that follow a gentle height
  field. The rises are paler, drier and warm. The hollows and the ground near water are darker, damp and cool.
  The edges break in the game's own blade strokes, never an airbrush. The slopes take a gentle sun-side lift. There
  are lit and dark blade strokes, a little thicker along the mass edges.
- **Features:** stands of tall grass (strength 1: 2, strength 2: 3, strength 3: 5; 7-9 px high). They are
  straw-tinged seed heads with a lit back rim, a dark front of blades and a shadowed foot. Strength 1 has one
  white-and-buttercup drift; strength 3 has two. There is one clover patch at strength 2 and two at strength 3.
- **Edges:** a trampled verge along the road (paler, drier, about 7 px) with small tufts. Damp turf and rushes at
  the water's edge. A shade pool and long grass at the feet of trees. In autumn, fallen leaves.
- **The lane:** the game's road surface is kept as it is. On the bends it gets big puddles: the sky in the water
  (shade under the far bank, lighter toward the near rim, one glint), a dark ring of wet mud and splashed specks.
  The puddles are 2, 3 or 4 by strength, never on a bridge. The cobble patches are gone, and so are the ruts.
- **Hall on tall grass:** in `_meadow_2` / `_3` the Wizard Spire stands in a stand of tall grass. The stand is
  cut back to a trampled clearing, ringed by flattened grass lying in strokes, and today's footing draws over it.
- **Autumn** (`_meadow_2autumn`): the grass yellows toward olive and ochre. The stands become russet bracken
  with a dark brown front. Fallen leaves gather under the trees, and the drift turns to late gold and rust.
  (The trees stay green here; the trees artist draws their seasons.)

## 2. Terraces (A, polished) on Thistlecrag: banks and steps

**Idea:** painted height. The board stays flat, and each level change is painted as a face on its lower side.
- **Steps (bold):** faces up to 30 art px. The height varies along the scarp (62-122%). Each face has a bright
  lit turf lip, turf hanging over the edge (in places a slumped tongue of grass), and earth that is lighter under
  the turf and darker toward the damp foot. It has soft wavy strata, a pale sandy bed, erosion streaks, bedded
  stones and roots, and a 1 px ink at the foot. Under every face lies a shade band (2-5 px solid, dithered out to
  18 px) with lusher, darker grass. The upper terrace is warmer and drier, the lower one cooler and damper. Where
  the high side lies to the south, the crest seen from behind is a lit line over a dark one. The east foot of a
  step that runs north-south is shaded. Where the road crosses, the face stops: the road ramps (a slightly darker
  band across it), with **retaining stones** walling the cutting on both sides. Golden hour marches the terraces'
  own long shadows down-sun (`_terrace_stepsgold`), and the scarps catch the light strongly.
- **Banks (gentle):** faces up to 16 px. Each is a grassed bank combed down the slope, darker toward its foot,
  with a lit lip. No stones; the road simply ramps.
- **Hall beside a scarp:** the Wizard Spire stands on the upper level just above a step. Its footing sits on one
  level.
- **Footpath with steps:** the painter supports it (`o.paths`: stone steps cut in the face, worn earth on the
  level), but no panel shows one yet.

## 3. The worked countryside (B, polished) on Millrace: quiet and patchwork

**Idea:** old fields on a slightly skewed, wandering grid (the hedge lines follow the land), each with its own
work. The road stays the clearest thing.
- **Fields:** plough has furrows across the field and a grass headland. Standing wheat is a duller gold, 4 px high,
  with its front face showing above a mown stubble edge. Hay is mown in swathes, with windrows and rows of stooks
  on some fields. Pasture has tussocks, sheep tracks and small flocks of 3-6 sheep. The orchard uses the game's own
  tree painter at about half size, pushed into DECOR, so the bake casts their shadows. Rough meadow cells rest the
  eye.
- **Hedges:** low (5 px), leafy, with a lit top and their own shadow. May blossom in spring, haws in autumn. They
  never come within 13 units of the road, the water, the wood or a hall. Some field edges have no hedge at all.
  There are hedgerow oaks (game trees) standing in the hedges.
- **Creatures and work:** a scarecrow with five crows in a wheat field, a ginger farm cat at the cart track's end,
  and the sheep. The cart track is two worn wheel tracks with grass between them, running from the road edge
  through a gap in the hedge.
- **Quiet** = mostly pasture, hay and meadow, few hedges. **Patchwork** = plough, wheat, hay, pasture, meadow
  and an orchard.
- **Hall on a crop:** in `_farm_patch` the Archer hall's field is forced to wheat. The crop is cut back round its
  footing, leaving a flattened ring.
- **Autumn** (`_farm_autumn`): half the wheat is ploughed in and the rest is stubble. The hay is stooked thinner,
  the hedges russet with haws, the grass olive.

## 4. The contact sheet and the 15-level plan (`_sheet_1`, `_sheet_2`)

1 Vale Road: meadow, middle · 2 Thornbrook: meadow, middle · 3 Gullwick: farmed strand, quiet · 4 Millrace:
countryside, patchwork · 5 Foxmere: meadow, richer (damp hollows) · 6 Oakmere Hollow: rolling banks ·
7 Bramblewick: countryside, quiet (hamlet hedges, orchard) · 8 Barrowfields: open downland · 9 Wolfrun:
meadow, calm (bracken at the wood) · 10 Thistlecrag: stepped terraces · 11 Kingstones: open downland with the
stones · 12 Ravenscar: stepped terraces and scarps · 13 Blackbriar: meadow, richer (overgrown) · 14 Cinderholt:
countryside in autumn (plough, stubble) · 15 Goblin Warrens: rolling banks, golden hour.

That makes 5 meadow, 4 countryside, 4 terraces or banks and 2 downland, with no two neighbours alike. The
downland look (`downs`) is the meadow at its calmest, with paler, greyer short turf, chalk showing on the rises
and a few sheep. The seasons from the trees round sit on top of whichever look a level has.

## Cost (measured in the lab, unoptimised concept code, Chrome on the dev Mac)

- **Repaint, the whole board:** meadow ~1.0 s, terraces ~1.1 s (golden with the shadow march ~3 s), countryside
  ~2-3 s. Of that, the board masks (two chamfer distance fields and the water / wood tests) take 100-650 ms.
  Written for the game (Uint8 buffers, loops limited to bounding boxes, the masks shared with the bake that
  already finds road and water), I would expect **150-400 ms a board, once, at load**, like today's ground bake.
- **Per frame: nothing.** Everything is baked into the ground layer. Optional extras: the tall grass swaying (a
  4-frame tip strip, about +0.3 ms) and a glint on the puddles (1-2 frames).
- **Memory:** no more than today's ground layer once baked. The concept's working buffers are about 40 MB (Float32
  colour, Z, shadow). The game version should use Uint8 (~8 MB, freed after the bake), because the iPhone has
  memory limits (see "The phone crash audit").

## What the engine needs

- **Meadow and downland:** nothing. Puddles stay off bridges (today's rule). Tall grass never comes within
  ~7 units of the road's edge. A placed hall flattens its patch through today's footing; the ground needs no
  re-bake.
- **Countryside:** a seeded field layout per board, plus a short list of per-board overrides (`fields: [[kind, x,
  y]]`, as the panels use), checked to keep hedges clear of the road, water, wood and halls. Orchard and
  hedgerow trees are ordinary DECOR, so they block building as any tree does. A hall placed later on a crop needs
  the crop cut back. Either re-bake that patch (a small dirty-rect bake) or accept today's footing blend over the
  wheat: the panels show the bake-time cut, so test the live case. Sheep and the scarecrow's crows could later be
  live sprites (the owner likes little creatures).
- **Terraces:** **I recommend painted steps, not real height.** The board stays flat, and the halls, figures,
  shots and taps are untouched. The engine needs: a per-board level map (authored as a few scarp polylines, or
  this generated field checked by hand), and `buildableAt` refusing a hall whose footing straddles two levels or
  touches a face band. Range stays 2D. The faces stop at the road, which ramps, so foes never meet a face. Real
  height (lifting everything by z) would touch every renderer and the tap mapping, for a look the painted faces
  already give.

## Weak spots (honest)

- **Terraces at midday** still read mostly by the tone change between levels and the dark foot band. At board
  size a face is 6-15 px, and where a scarp runs diagonally it thins. Golden hour is where they shine. Thistlecrag's
  many crags hide part of the faces. The ramp across the road is only a darker band, so it can read as a stray
  shadow. Boundaries come from a generated field, not authored per board yet.
- **Meadow stands** read as pale straw cushions at board size: correct for "tall grass in seed", but they could be
  taken for hay. At strength 1 the drift is easy to miss. The rushes at the water's edge are a little lime.
- **Countryside:** the fields are still a fairly regular grid. Plough at golden hour comes close to the road's
  colour (the grass headland keeps them apart). The sheep are 7 px and vanish at board size (a find-it detail,
  not a read). The cart track is short, and the field gate is only a gap. The stooks and hedges are bake-time
  pixels, not pix sculpts. At golden hour the stubble and hay go quite orange under the game's grade.
- **Downland** (the Kingstones): the chalk on the rises reads as pale blotches at board size and could be taken
  for frost. It wants shaped scars and a sheep path, not noise. Otherwise it is close to meadow strength 1.
- **Autumn:** the grass tint is one global shift. A real autumn board wants the trees artist's leaves to match.
- **Contact sheet:** the Vale Road, Gullwick and the Kingstones use auto-placed features, not tuned by hand. The
  15-level plan is a proposal made from the boards' names and the four I looked at.

## My picks

- **Everyday meadow: strength 2.** Strength 1 is almost today with better masses. Strength 3 starts to busy the
  board at 840 px.
- **Terraces: both, by level.** Banks on the softer boards (Oakmere, the Warrens). Bold steps on Thistlecrag and
  Ravenscar, built as painted steps.
- **Countryside: quiet as the default, patchwork for Millrace only.** Quiet keeps the road the clearest thing
  everywhere. The patchwork is the showpiece for the mill's level.

---

# ROUND 3 (2026-11-22, evening): the owner's picks built on

The owner: meadow "1. Calm" is the everyday ground (done, unchanged, under everything); bold steps "cool but ...
how they interact with the paths. Doesn't look great rn"; full patchwork "this one, but ... No two maps should have
the same pattern of fields." The lab now runs round 3 by default (`overhaul2-ground.html`; `?r2=1` for round 2's
panels; `?only=` and a fresh `?r=N` as before).

## Panels (`.shots/`)

| file | what |
|---|---|
| `ovh2_ground_step_meets_road` | close-ups (x1.5) of the four crossings, noon over golden: (a) ramp and (b) cutting, road up the screen and road across |
| `ovh2_ground_terrace_steps2`, `_steps2gold` | Thistlecrag re-laid by the rule, whole board, noon and golden |
| `ovh2_ground_terrace_before_after` | round 2's steps (left) beside round 3's (right), at board size |
| `ovh2_ground_farm_millrace`, `_gullwick`, `_bramblewick`, `_cinderholt` | the generated patchwork on four boards, noon |
| `ovh2_ground_farm_variety`, `_variety_gold` | the four at board size, noon and golden |

## Steps that meet the road

Steps are no longer cut from a noise field. Each is an authored SCARP (`o.scarps`: a polyline in board units, a
height in art px, `dir: "ns"` + `high: "e"|"w"` for one running north-south, `cross: "ramp"|"cut"`), painted by
`scarpField` / `paintSteps` / `crossing` in the painter. The vocabulary:
- **(a) The ramp.** The road climbs. The step's own earth face turns down along both sides of the road as two
  wedges, widest at the scarp and tapering to nothing 28 units down the road, a course of retaining stones lining
  each against the road, a turf lip on top (the west wedge lit, the east in shade). The road's own pebbles are
  drawn closer together across the rise (sampled from further down), dotted contour lines close up toward the top,
  and a lit lip marks where it tops out. Road running across: the far side gets capstones and a narrow bank, the
  near side a dressed-stone embankment face toward us that grows with the climb and casts its shadow.
- **(b) The cutting.** The road keeps its level and cuts through. Timber-revetted banks either side rise from
  nothing at the face's foot to the step's height at the scarp, then fall back to nothing 36 units into the high
  ground, grassed on top. Road up the screen: the banks are seen edge-on (east one lit, west one dark) and the
  west bank's shadow lies down the road's edge. Road across: the far bank's plank face is seen whole, its shadow
  along the road's far edge; the near bank shows only its grassed top and post heads.
- **(c) The rule** (`STEP_RULE`, checked and logged on every bake): a scarp keeps 24 units clear of every road
  edge except where it crosses; it crosses square-on (within 20 degrees) on a straight (heading within 15 degrees
  40 units either side); one crossing per road stretch (between two bends); halls never straddle a face.
  Thistlecrag passes: six steps, six crossings, one each on the four climbs, the bottom of the first loop and
  the gate approach; no glancing crossing, no step along a road, both halls clear.
- **(d) How a step ends.** Over its last 32 units its height eases to nothing and its line bends downhill, so it
  sinks into the slope; the level's tone fades with it (no stub, no blunt end).

**What it does to Thistlecrag:** instead of three long noise-made terraces that ran beside the lanes and crossed
some lanes twice, the hill is six short steps, each laid across one climb (or across the gate road) and dying
out in the crag ridges between lanes. The land still falls from the wood toward the viewer, step by step; the
lanes keep their own level along their length.

## The generated patchwork

`recipeOf(o)` reads the board's shape first, then the seed (`seedOf(realm)` in the lab: a hash of its id):
- **character:** a pond -> *orchard country* (Bramblewick: small closes, three orchards round the millpond, a hop
  yard, vegetable plots, plough and wheat); two rivers or more -> *arable* (Millrace: long open strips of plough,
  wheat, stubble and hay, few hedges, one orchard by the water); a coast -> *pastoral* (Gullwick: hedged closes of
  pasture in three greens, hay, ONE wheat field, many flocks, ten hedgerow oaks); otherwise -> *downs farm*
  (Cinderholt: big fields of ridge and furrow and pasture, a common with a pond and gorse, twelve hedgerow trees).
  `o.char` forces one.
- **numbers from the seed:** grid angle (squared to the road's main heading, then turned by up to 6-18 degrees),
  field length and width ranges, how far the hedges wander and bend with the land, a slant per column of fields,
  hedge density, fields merged across an unhedged edge, hedgerow-tree count, orchard spacing.
- The layout is decided from the road, water and wood only (`layoutOf`, cached), so the orchard trees pushed into
  DECOR before the bake and the painting agree.
- Kept from round 2: duller wheat, low hedges never within 13 units of the road, the road the clearest thing.
  Fixed: sheep are 10 x 8 art px now (a pale dot with a dark face at board size), in bunched flocks of 8-14 with
  strays; plough is darker with deep furrows, so it stays apart from the road at golden hour.
- New field kinds: stubble, ridge and furrow, hop yard (9 px bines), vegetable plots, common (rough grass, gorse,
  a pond).

## Cost and engine notes (changed this round)

- Bake: Thistlecrag steps ~0.7 s noon / ~1.0 s golden in the lab; farms 1.2-3 s (the orchard-heavy and river
  boards are slowest: the board masks). Game estimate unchanged: 150-400 ms at load, nothing per frame.
- **Steps need, from the engine:** a per-board list of scarps (authored, a few lines of data each) instead of a
  generated field; `buildableAt` refusing a hall whose footing touches a face or a crossing's banks; the STEP_RULE
  check run by a script over every board that has steps (like check-map-water.mjs). Crossings are paint only:
  foes, soldiers and the road are untouched (the road is still flat for the engine).
- **Farms need:** nothing authored; the recipe runs from the board's shape and id. A common's pond is painted,
  so it must be added to PONDS (or the common skipped) so no hall stands in it. Puddles keep off crossings (done
  in the painter).

## Weak spots (honest)

- The ramp's lit lip is a straight line across the road: at full size it can still read as a plank edge; at
  board size it reads as a step. A road-across ramp is the weakest of the four: the north-south face is a thin
  sliver, and the climb shows mainly through the stone embankment and the lip.
- Steps are authored per board: only Thistlecrag is laid (and Ravenscar would need its own six lines).
- The pastoral board (Gullwick) has little room inside its loops, so its patchwork is mostly the outer fields.
- Bramblewick's vegetable plots landed small (3% of the farmland); the hop yard is one field.
- Cinderholt's own burnt palette makes its farmland olive; the common's pond is small at board size.
- Sheep are bake-time pixels, not live sprites.

## The fifteen-level plan (round 3, the owner's picks)

1 The Vale Road (gw1) - calm meadow
2 Thornbrook Ford (gw2) - calm meadow, by the brook
3 Gullwick Sands - full patchwork, pastoral (its own pattern)
4 Millrace - full patchwork, arable strips round the mill
5 Foxmere - calm meadow, damp hollows by the mere
6 Oakmere Hollow (gw3) - gentle banks round the hollow (calm meadow if banks are dropped)
7 Bramblewick - full patchwork, orchards, hop yard and plots round the millpond
8 The Barrowfields (gw4) - calm meadow, short downland turf on the barrows
9 Wolfrun Ford - calm meadow, bracken at the wood's edge
10 Thistlecrag - bold steps, six crossings (ramps and cuttings), as shown
11 The Kingstones - calm meadow, downland turf round the ring
12 Ravenscar - bold steps, laid by the same rule
13 Blackbriar - calm meadow, overgrown edges
14 Cinderholt - full patchwork, downs farm (ridge and furrow, the common), in autumn
15 The Goblin Warrens (gw5) - gentle banks, trampled

Meadow 7, patchwork 4 (four different patterns), bold steps 2, gentle banks 2.

## Round 3b: calmer farms and the sliver rule (owner: "bramblewick and millrace are too busy"; "little tiny rows next to the roads")

- **`busy` dial** (`o.busy`, 0..1, 1 = round 3): lower means fields up to x1.45 a side (x1.3 more across for the calm
  mixes), +30% neighbours merged, hedges -45%, hedgerow trees down to 30%, softer textures (paler, finer plough; no
  hay windrows; duller wheat; pasture tints halved), a plain green margin up to 25 units along road and water, and
  below 0.5 a calm mix (`CALM`): arable = pasture / hay / at most 2 wheat + 1 plough by the water; orchard country =
  pasture / hay + 1 orchard block + 1 garden plot by a building, no hops or vegetable rows.
  Set: Millrace 0.25, Bramblewick 0.25, Gullwick 1, Cinderholt 1.
- **Sliver rule** (`FIELD_MIN` { width 45, area 3500, verge 12 }, board units): a patch may carry rows or crop texture
  only if, clipped by road, water, wood, castle and headland, it survives an erosion of half the width (45 units at its
  narrowest) and covers 3500 sq units; otherwise it is plain grass with no hedge of its own. Cultivated ground keeps a
  12-unit plain verge from the road's edge. Patches made plain: Millrace 6 of 12, Gullwick 7 of 9, Bramblewick 3 of 6,
  Cinderholt 6 of 17.
- Panels: `ovh2_ground_farm_millrace2`, `_bramblewick2`, `_gullwick2`, `_cinderholt2`, `_calm_before_after`,
  `_variety2`, `_slivers_before_after`.
- Weak: Millrace's one plough field and Bramblewick's garden plot did not survive (the plough pick lands on a clipped
  cell; the garden's whole cell failed the rule). A fix exempting the garden plot is in the code but NOT CHECKED
  (the last render served a stale module). Bramblewick is now almost all pasture: calm, but its pattern rests on
  pasture tints and a few hedges. The sliver close-up compares two different layouts (the calm pass also re-cut the
  grid), so it shows the result, not the same patch made plain.
