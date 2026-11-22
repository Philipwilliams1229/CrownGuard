# Overhaul concept: THE GROUND (2026-11-22)

Painter `concept/overhaul-ground.js` (`renderGround(opt, chap, sun)`), lab `overhaul-ground.html`
(open it on the dev server and it saves every panel). A panel is a 420 x 280 board-unit patch at 2x
(1680 x 1120). TODAY is the real engine's `draw()` of a board, cropped. In A / B / C the road
(same width as today's), the real level-3 Archer hall with its crew, and the real goblin and garrison
figures are the same. The trees, rocks and A's pond water are plain placeholders.

Panels (`.shots/`):
- Scene 1, Greenwood: `ovh_ground_1_today.png` (Thornbrook), `_1_A`, `_1_B`, `_1_C`, plus golden hour `_1_Agold`, `_1_Cgold`
- Scene 2, Iron Marches: `ovh_ground_2_today.png` (Ironford), `_2_A`, `_2_B`, `_2_C`
- Scene 3, the Rimewater, option A only: `ovh_ground_3_today.png` (Frostwake), `_3_A`

The painter draws the ground as a height field, front to back down each column, so a face shows
wherever the land steps down toward the viewer. Shadows are then marched toward the sun, and the
standing things are laid on top, sorted by where their feet are. That one method serves all three
options. In A it makes the terraces, in B the hedges and the standing crop's edge, and in C the
stands of tall grass.

## A: land with height
**Idea:** the board is no longer flat. It has three terraces with earth or rock scarps between them,
and the road climbs between the levels in ramps and cuttings. A hollow holds the pond.
- **What changes from today:** two scarps about 26-30 art px tall cross the board. They have a grass
  lip on top, layered earth with bedded stones, a damp foot, and a shadow at golden hour. The lower
  terrace is lusher and darker and the top one is sunnier. Where the road crosses a scarp it ramps,
  with cutting and embankment sides. The pond sits in a hollow with a wet mud ring. Each chapter has
  its own scarps: Iron's are crags of blocky rock facets, and the Rime's are dark rock under a snow
  cornice, with snow lodged on the ledges and drifts banked blue at the foot.
- **Cost:** bake only, roughly 150-400 ms a board once tuned (a column pass, a noise pass and a
  shadow march; this concept code is unoptimised, at 1.2-1.8 s for the patch in Node). Nothing moves
  per frame. Memory is the same as today's ground layer, plus a height map (W x H floats, ~2 MB for
  the whole board).
- **Engine:** this is the big one. There are two ways to build it.
  1. Real height: things stand at screen y = ground y - z. The engine keeps a height map: halls,
     figures and shots are drawn lifted by z, and a tap is mapped back to the ground. Range stays 2D.
  2. Painted height: the board stays flat, and each scarp is a painted step whose face band is
     no-build ground. This needs no engine change beyond `buildableAt` refusing the face. The road's
     ramps are then painted, not real.

  Either way: a hall's footing must sit on one terrace, never across a scarp. Scarps are authored per
  board (or generated, then checked) so they never cut the road except at a ramp, and they keep clear
  of water. On a board with a river they also change where the River Watch docks.
- **Weak spots:** at noon a scarp throws almost no shadow. It reads by its face alone, which at board
  size is a band about 13 screen px tall. The cutting walls beside the ramps are thin and could be
  shaped better. The earth face pattern repeats along a long scarp. The pond's water is a
  placeholder. The snow tops on the Rime are still fairly flat.

## B: a worked countryside
**Idea:** the meadow becomes farmed land, a patchwork of fields with their own work, divided by
hedgerows.
- **What changes from today:** the Greenwood fields are ploughed strips, standing wheat, mown hay with
  windrows, sheep pasture with tracks, and an orchard on a grid. The wheat stands 3 px high, so its
  front edge shows. The hedgerows are 6-9 px high, with a lit top, a leafy face and a cast shadow.
  The road has a grassy verge with hedge or fence along it. Iron shows the same language: a raked
  drill field, heather moor, quarry spoil heaps, and drystone walls in place of hedges. In code, the
  Hollow gets peat cuttings, duckweed dykes and a raised causeway. Those are written but not shown
  in a panel.
- **Cost:** bake only, ~100-250 ms a board. Nothing moves per frame; sheep could shuffle later as live
  sprites.
- **Engine:** each board's field layout (seeded cells) has to avoid the road, the water and the halls'
  usual spots. When a hall is placed, the existing footing (groundblend.js) clears a yard of trampled
  earth over crop or hedge. Hedges and walls must not read as walls the foes respect: they never
  touch the road, and the road is the only thing that crosses them.
- **Weak spots:** this is the strongest change of identity. The gold wheat is loud and competes
  with the road. Hedges can read as barriers. Iron's drill field reads as plough. The spoil heaps
  are weak, the orchard trees are placeholders, and the fields have to be laid out board by board.

## C: lush and painterly
**Idea:** the green carpet becomes big masses of different growth. There are knee-high stands of
tall grass, dark clover, pale dry rises, bracken at the wood's edge and drifts of flowers. The road
is a real country lane with puddles, mud and a ditch.
- **What changes from today:** the tall grass stands are about 7 px high, with lit blade tips on top
  and a front of blades, and they cast real shadows (`_1_Cgold`). The edges are broken by single
  tufts. There are clover patches, dry pale rises, rust and green bracken, foxgloves, and flower
  drifts dense enough to see at board size. Along the lane: trampled earth margins, big puddles
  that hold the sky inside a dark wet mud ring, mended patches of cobbled setts, a reed-lined ditch
  on the outside of the bends, and no ruts. A hall stands in a trampled clearing ringed by flattened
  grass. On Iron the growth is heather cushions, tussock and moss in sunken flags, with puddles in
  the paving.
- **Cost:** bake ~200-400 ms. The tufts are baked into the ground, except a swaying layer if wanted:
  the tall grass sways as a 4-frame strip, the tips leaning by up to 2 px in a wave across the stand.
  That costs about +0.3 ms a frame as scrolling tiles, or nothing if it is left still. The puddles
  take a slow sky glint (1-2 frames).
- **Engine:** none for the ground itself. Placing a hall flattens a patch: the footing redraws, as it
  does today. Puddles stay off bridges (today's rule). Tall growth must stay off the road and the
  outer lanes so the figures stay the clearest thing.
- **Weak spots:** this is the busiest of the three. At board size the bracken, flower spikes and tufts
  approach noise, and the stands of tall grass can read as hedges or bushes. The cobbles are weak.
  Iron's heather is close to too much purple.

## My pick
**A, with C's puddles and lane on top.** Height is the one change that makes the board look 3D and
take the light: the scarps catch golden hour (`_1_Agold`) the way the halls do. A also keeps the
chapter palettes and leaves the road the clearest thing. C's puddles, mud margins, trampled verges
and a few sparing stands of tall grass would fill A's flat terrace tops. B is striking, but it turns
the Greenwood into farmland, and that is a bigger change of the game's character than the owner
asked for.
