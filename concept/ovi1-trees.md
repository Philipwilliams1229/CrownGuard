# Iron overhaul concept round 1, panel 2: TREES (2026-11-28)

Painter `concept/ovi1-trees.js` (the Greenwood's treatment-4 machinery copied from `src/render/overhaul/treeart.js`: crown(),
bark(), trunk() with root flares, fillVar, dressMasses, SWAY; plus the Iron set), lab `ovi1-trees.html`
(`?mode=scene&scene=1|2&opt=today|A|B|C&sun=late|golden`, `?mode=anim&name=wind_B|wind_C|needles_B&scene=1&sun=golden`,
`?mode=sheet`). Boards: scene 1 Warden Moor (whole board, left wood + moor), scene 2 Kestrel Pass (left wood + sea corner).
Nothing under `src/` is touched. The real board is drawn through `draw()` with today's irspruce / irpine / irheather taken out,
then: the turf's green pixels re-graded to olive-straw (late autumn), the ground's own purple heather dulled and browned,
ground cover, cast shadows (`layShadows`), the new trees y-sorted on top.

## The Iron set (late autumn)
- **Scots pine**: bare dark trunk, ORANGE upper bark, a few flat cloud pads of blue-green needles (airy: many sky holes).
- **Spruce**: dark narrow tiers (7), blue-green, darker again deeper in the wood (dk 1, 2). `lean` tilts it, `flag` skews the tiers.
- **Wind-bent thorn**: a twisted trunk leaning with the wind, bare boughs, many SMALL rust clumps strung along the outer
  boughs (not balls on tips), a few red haws.
- **Larch**: slim cone of ten soft gold tiers (rust at the low skirts), trunk showing, ragged feathery edge.
- **Ground cover** (painted straight into the ground, 1 art px): bracken (rust fronds, three tones, a contact shade,
  `wind` combs them), heather mounds (purple-brown, a pale lit lip, a dry gold stem), larch litter, needle floors.

## The options (three IDEAS)
- **A, sentinels**: few, dark, tall. Thin wood (about half today's trees), Scots pines and spruce standing clear, the dark
  forest floor showing between; lone Scots pines and thorns on the moor, small spruce stands of three; heather drifts, a
  little bracken. The calm, empty moor.
- **B, gold among the dark**: the layered edge wood: a bright front row of LARCH gold with thorn, spruce mid, a dark roof;
  larch groves of 5-6 on the moor, rust bracken under the larches and thorns. Autumn colour as the event.
- **C, windswept**: the wind shapes every tree: Scots pines lean hard (34 art px at the top), thorns bent flat (44),
  spruce flagged (tiers skewed down-wind), a low shelter belt of squat flagged spruce across the moor's edge, heather low and
  bracken combed right. Strongest loop (wind x2).

## Loops (`.shots/ovi1_anim_trees_<name>_c5r4_fps10.png` + `_still.png`, 20 frames, 2 s, 520 x 340)
- `wind_B` (larch / spruce / thorn, wind x1.3), `wind_C` (the leaning Scots pine and thorn, x2): each tree's crown (and tiers)
  is re-baked at whole-pixel lean poses (-9..9 art px at the top by species), the trunk and roots never move; a gust envelope
  (two cycles a loop) and a per-tree phase; C adds a steady down-wind bias. Fully periodic. Checked: step 0->1 and 19->0 are the
  same size (5161 / 3809 px changed in wind_B), no jump at the loop point; some quantisation shimmer (steps flip 0/1 px).
- `needles_B`: wind_B plus 16 gold needles (3 x 2 px, dark underline) per larch, each drifting right and down over exactly one
  loop from the crown to the ground, hidden at both ends. Faked: they simply vanish where they land (no settling).
Ground, shadows and grass do not move in the loops (grass stirring is NOT done).

## Cost guess and what the engine needs
- Bake: a species at k 1 sculpts in ~10-40 ms; a board needs ~25 distinct sprites (the Greenwood's `WOOD_MAX` rule: dealt from a
  small shared set per kind, depth and slot) = a few hundred ms, lazily a few a frame. Sway poses: the game's trees.js cuts
  poses from the base sprite by row shifts (under 1 ms); the conifer tiers would need the same split into wood and leaves
  (tiers move as bands by height^1.3) rather than my per-pose re-sculpt. Memory: ~4-6 MB of sprites a board.
- Per frame: blits only; the cast shadows are one mask in the ground bake (static; a swaying crown's shadow does not move).
- The late-autumn turf is a per-pixel recolour of the ground bake (green -> olive-straw ramp), ~one pass at bake; the ground's
  heather drifts (world.js) would need an autumn variant (I only dulled their colour).
- Needs: Iron `season: "lateautumn"` read by the ground bake and a species table in `trees.js` (`irspruce` / `irpine` ->
  spruce / scots, `irheather` -> heather / bracken), the wood thinned by a hash like `woodPlan` (A keeps ~half), a thorn and larch
  placement list per board (lone, groves), `look: "overhaul"` on the Iron realms. Trunk feet = today's DECOR anchors + 10.

## Weak spots (honest)
- Scale: trees are today's reach x1.25; not checked at a phone's board size beyond the 840 px shots.
- The thorn's rust clumps still read slightly like berries at 1x; its cast shadow reads as a hand (dense fork).
- Larch tiers are a little stiff / stacked; the gold is saturated (reads as a fire at golden hour: perhaps desaturate one step).
- The ground's own purple heather remains (dulled), so A/B/C all still show today's patches; my heather / bracken are only added
  under and between trees.
- Trees stay clear of halls and the road by a centre-distance rule; a crown may still brush a lane edge. No see-through crowns
  in front of halls, no wildlife (not asked).
- The turf recolour touches any green pixel (a hall's green ring too: slightly olive).
- NOT CHECKED: the second board's loops; any option on a phone; golden hour on Kestrel's wood at 1x beyond the stills.
