# Effects concepts, Round 20 (2026-11-24): the rest of the fire, in Dragonbreath's look

The owner has settled three fire effects in a new look and wants the rest of the game's fire to follow: "this actually
looks so much better than what we have everywhere else." Four Opus artists, one row each, three variations a row.

## The look to carry over (study it first)

In the game now (pushed): Dragonbreath (`src/render/flames.js` `drawBreath`, `.shots/shotlab_brj2.png`), fire on a
foe (`src/render/statusfx.js` `statusBurn`, the Round 18 A tongues: `.shots/burn18v_new_z1.png`), and the Brazier
Wheel's ring of fire (`src/render/rings.js` `case "firenova"`, `.shots/shotlab_r19hoop_zoom2.png`); the owner's
reference `art/briefs/ref/dragonbreath-ref.jpg`. What makes it read: flame as ONE dense, mottled mass (clusters of gold,
orange, deep orange and red-orange, stretched along the flame's motion), a broken pale core, small ragged licks leaning
against the motion, a darker red tinted 1-px rim (`#8a2028`), white-hot where it is born, sparks that lift, NO smoke,
see-through (about 80%, stepped) where it spreads. Rejected on the way: lumpy round billows, smoke, candle-stick flames
standing in rows, carpets of identical spikes, flat striped shapes, busy new constructions, fire going "across the
ground" when it should be in the air. Each round that worked was the familiar effect made in the new look.

## The four rows (each artist owns ONE file; `export const ROWS = [ row ]`, `group: "Round 20"`)

1. **`concept/fx-r20-fireball.js`, row `fireball20`: fire in flight.** The Pyromancer / Inferno Throne fireball (fx.js
   `drawProjectile`, the orb with element "fire", `orbElement`), the Comet Sling's burning stone (catapult, `burn` on
   its stone) and the Fireship Wharf / Hellburner's fire pot (River Watch skiffs' shot). One cell with all three flying
   across, at board size, on today's paths and speeds. The fireball keeps flying to its target (the blast on landing is
   the approved `fireboom`: don't redo it). Variations: A a mottled fireball with a white-hot heart and a short flame
   tail streaming back; B a longer comet tail (needle to head, like Dragonbreath reversed) that thins see-through;
   C A + sparks shed along the path.
2. **`concept/fx-r20-logs.js`, row `logs20`: the burning logs.** The Log Roller line's burning logs and the Powder Keg
   Run (`src/render/logs.js`, the `lg.burn` flames "streaming back as it rolls", and the keg's fuse). Show a burning log
   and a keg rolling along a road strip, at board size and one enlarged. Variations: A today's flames as mottled
   tongues streaming back; B a continuous sheet of flame along the top of the log, see-through at its trailing edge;
   C A + embers and sparks thrown off behind, the keg's fuse a white-hot spitting point.
3. **`concept/fx-r20-pools.js`, row `pools20`: fire on the ground.** The Hellburner's and Inferno Throne's lingering
   pools (`g.grounds` kinds `lava` and `fire`: fx.js `poolSprite` and flames.js `drawFireGround` / `drawFireFront`,
   the owner's earlier picks Round 4 B and burning ground B). These are meant to be ON the ground, so keep them there,
   with today's sizes and lifetimes; redo the flames standing on them in the new look. Variations: A today's shapes with
   the new mottled tongues; B lower flames, see-through, the glowing bed showing through them; C A + sparks lifting
   and a white-hot heart. Goblins walking through, a burning one or two.
4. **`concept/fx-r20-torch.js`, row `torch20`: torches and braziers.** The small fires on the buildings: buildkit.js
   `flame` / `brazier` / `torchBracket`, the halls' torches and lanterns (pix/hall-*.js, night lights in pix/halls.js),
   the Brazier Wheel's own spike flames (pix/hall-spiker.js), the castle wall's torches. Show four or five halls up
   close at board size by DAY and at NIGHT (the night lights / `lampsOn`, nightlight.js), plus a piece of the castle
   wall. Small flames (3-8 px) must still read as flame, not as candles or blobs. Variations: A a mottled tongue with a
   pale core and red rim; B a taller, flickering lick that leans with a slow sway, see-through tip; C A + a spark now
   and then and a white-hot base. Don't redraw the buildings.

## For every row

`label`, a plain `note` for the owner describing each variation, `today` (the game's own painter, called for real),
`A`, `B`, `C` (no D; a `Bdark` strip is painted from B on dark ground). Loops close cleanly; one-shots like the Round
19 row. Pixel style: `art/STYLE-GUIDE.md`. They will be built into the game afterwards, so keep them bakeable.
Lab: `http://localhost:5173/fx-concepts.html?only=<rowid>` paints `.shots/fxc_<rowid>_{today,A,B,C,Bdark}.png`. The
existing rows `concept/fx-r18-burn.js`, `concept/fx-r19-ring.js`, `concept/fx-r4-novas.js` (pools) and
`concept/fx-r10-fireblast.js` are worked examples of cells. Look at every frame at board size and zoomed; make a side
by side sheet (today / A / B / C) in `scratchpad/<rowid>/`. Your own browser tab (the id tabs_create returns, on every
call), closed when done; no git that changes anything; edit only your file; `node --check` after every edit (a syntax
error breaks the other three artists' lab too). At most three look-fix passes. Budget ~60 tool calls. Report each
variation in a line, anything weak or NOT CHECKED, the PNG paths and the sheet.
