# Effects concepts, Round 18 (2026-11-24): the Brazier Wheel's flame rings and fire on a foe

Dragonbreath was just settled after five rounds, and the owner: "this actually looks so much better than what we have
everywhere else". So the fire everywhere follows its look. The owner chose these two first and asked for three Opus
variations on each.

## The look to carry over (study it first)

The new Dragonbreath: `src/render/flames.js` `drawBreath` (from `concept/fx-r17-a.js`); see it in
`.shots/fxc_breath17_A.png` and `.shots/shotlab_brj2.png`, and the owner's reference
`art/briefs/ref/dragonbreath-ref.jpg`. What makes it read: flame as ONE dense, mottled mass (clusters of gold, orange,
deep orange and red-orange, stretched along the flame's motion) with a pale core, small ragged licks leaning against
the motion, a darker red tinted 1-px rim, a white-hot needle where it is born, sparks that lift, NO smoke, see-through
(about 80%, stepped) where it spreads out so what is under it shows. Things the owner rejected on the way: lumpy round
billows, smoke, candle-stick flames standing in rows, carpets of identical spikes, flat striped shapes, busy new
constructions ("fountain"). Each round that worked was the familiar effect made in the new look.

## Row 1: the flame rings (artist 1, `concept/fx-r18-ring.js`, row id `firering18`)

The Brazier Wheel line (Bladewheel's path: Brazier Wheel, Solar Crown, Wildheart Pyre; towers.js `nova: true`) fires a
ring of flame round the hall every ~1.25 s over its whole reach (65-74 units): update.js pushes `{ type: "firenova",
x, y, ttl: 450, r: range }`, drawn by `src/render/rings.js` `case "firenova"` (Round 4 B: a rolling wall of flame on a
line of coals, a scorched ring behind, embers, heat haze, squashed to 0.55 on the ground; ringflash.js flashes each foe
as the front passes). The owner keeps the ring and its timing (450 ms, the front reaching the rim); redo the FLAMES on
it in the new look. Cell: the real hall (the Bladewheel at the Brazier Wheel form, read src/render/pix/halls.js and
concept/fx-r4-novas.js's fire nova row, which is the worked example of this cell, TODAY included) with goblins in and
out of reach. TODAY = the game's own `case "firenova"`.
Three variations, each a clear step: A the wall of flame redrawn as Dragonbreath's mottled mass (same height, same
coals); B a lower, faster rolling front of licks leaning back against the motion, see-through behind the front so the
scorched ring shows; C the front plus a white-gold needle-bright leading edge and sparks lifting off it. (Change them if
you find better; keep them clearly different.) Optional: if the hall's own brazier fire on the wheel looks old beside
it, say so in the report; don't redraw the hall.

## Row 2: fire on a foe (artist 2, `concept/fx-r18-burn.js`, row id `burn18`)

A burning foe: `src/render/statusfx.js` `statusBurn` (Round 5 B: the outline of the very frame drawn burns, read
through `e._rf`, baked per frame and step; plus a ground glow and a light). The owner: "I like the outline and the
glow, but I'm thinking we can update the flames." KEEP the burning outline and the glow exactly; redo only the flames
that rise off the body. Cell: as `concept/fx-r5-burn.js` (row `burn5`, the worked example: 80x78, several foe types
at board size; TODAY = the game's own statusBurn). Show at least a goblin, an orc and a bigger foe (troll or ironclad),
walking, at true board scale, plus one enlarged.
Three variations: A small Dragonbreath-style tongues (mottled, pale core, red rim) rising from the outline where today's
flames are; B fewer, taller licks that stream back against the walk (the foe's motion), see-through at their tips;
C A plus sparks lifting and a white-hot flicker at the hottest point. The face stays clear (style rule from Round 5).

## Both

`export const ROWS = [ row ]` with `group: "Round 18"`, `label`, a plain `note` describing each variation for the owner,
`today`, `A`, `B`, `C` (no D; a `Bdark` strip is painted from B on dark ground). Loops must close cleanly (the ring is
one-shot over 450 ms: show it like the Round 4 row does). Pixel style: `art/STYLE-GUIDE.md`. Both will be built into the
game afterwards, so keep them bakeable.
Lab: `http://localhost:5173/fx-concepts.html?only=<rowid>` paints `.shots/fxc_<rowid>_{today,A,B,C,Bdark}.png`. Look at
every frame at board size and zoomed; make a side-by-side sheet (today / A / B / C) in `scratchpad/<rowid>/`. Your own
browser tab (the id tabs_create returns, on every call), closed when done; no git that changes anything; edit only your
file; `node --check` after every edit (a syntax error breaks the other artist's lab too). At most three look-fix passes.
Budget ~60 tool calls. Report: each variation in a line, anything weak or NOT CHECKED, the PNG paths and the sheet.
