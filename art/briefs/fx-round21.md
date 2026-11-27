# Effects concepts, Round 21 (2026-11-27): a look of its own for the PLAIN slow

The owner: "We need a different visual effect for frost slow and normal slow like from traps. Frost is great,
I'd like to whip something up for the normal slow. 3 options?"

**Today** every slow wears one look: the frost's COLD MIST (Round 6 C, in the game: `src/render/statusfx.js`
`statusSlow` / `mistBake`): a thin blue-white dithered mist hugging the body's outline, drifting down off it.
The owner keeps it for FROST slows (the Warden Mage's aura and its lines, frost orbs). The PLAIN slows need
their own look: the Trapsmith's spike strips and Caltrop Field, the Bladewheel's Hamstringer, the catapult's
Earthshaker, the River Watch's Harpooners, the King's Band War Horn, rolling logs. They are steel, thorns,
quakes and fear, not cold: the foe is HOBBLED, not chilled.

## The row

Row `slow21` (`concept/fx-r21.js`, the lead's), three columns after TODAY. Each option is ONE file, its
artist's alone: `concept/fx-r21-a.js`, `-b.js`, `-c.js`, exporting
`export const note = "..."` (one or two plain sentences for the owner, no jargon) and
`export const paint = (c, e) => { ... }`. The shared kit is `concept/fx-r21-kit.js` (read it: `body`,
`maskOf`, `sprite`, `frameOf`, `isFace`, `sunEdge`, `fifth`, `bay`, `H`, `P`, `NW`); copy anything else you need
into your own file, never edit the kit or another option's file. c is translated to the goblin's feet,
1 unit = 1 art px; `e.i` / `e.N` (12 cells, a clean loop), `e.foe(f, v)` a goblin walk frame (8 frames).
Pure canvas, no game imports. The goblin faces right; the sun is top-left.
`concept/fx-r6-slow.js` and `concept/fx-r5-burn.js` are worked examples of effects that ride the body's own
outline (the look the owner liked for fire and frost).

## The three directions (your own take on yours; better ideas welcome, say why)

- **A (Opus): hobbled, dust and drag.** Earthy: the feet scuff and drag, a little grit kicked off the
  trailing heel each step, dirt or bramble scratches on the shins, a warm tan / brown rim on the LOWER body.
  The walk can read as a limp (a dip, a dragged foot) if you can sell it from the walk frames.
- **B (Opus): slow motion, an afterimage.** The foe moves in slowed time: one or two dithered echoes of its
  own silhouette trailing a step behind, a frame or two late, in a warm or neutral grey (NOT blue), fading.
  Echoes of the figure, not copies at full strength: the real figure must stay clearly in front.
- **C (Fable): your own idea** on the same rules. Starting thoughts, not orders: weighed down (a dull iron
  heaviness on the outline, a few motes sinking off it), bound (thorny bramble or cord wrapped round the
  legs), or a daunted shiver (the outline jittering, a cold-sweat drop at the temple: never over the crown).

## Rules for every option

- **Never confused with the others on the board.** No blue / white (the frost mist), no orange or red flame
  (fire), no green (poison), nothing gold over the head (the stun's ring). Nothing over the crown at all.
  Nothing on the ground wider than the feet.
- **Must read at board size**: an art pixel is 1 to 1.3 screen pixels in the game. Look at your strip at
  zoom 1 as well as the lab's zoom 3. A 1-px speck that only reads at zoom 3 does not count.
- The face stays readable; no full-body tint that hides the figure.
- Paint the MIDDLE strength (30-60% slow). Say in your note how it would grow for under 30% and over 60%.
- Both kinds can be on one foe at once (a frost aura over a spike strip). Say how yours reads beside the
  cold mist (or, if you have budget left, draw that combination as a second painter and say so).
- Pixel style: stepped tones, the tinted 1-px line, one sun (top-left), no soft blur, no round blobs that
  read as balls (the owner turned those down before), no smoke.
- Building it later: the game will bake it per figure frame from the frame's own silhouette (as the cold
  mist and the burn are). An afterimage may read the PREVIOUS walk frame too. Keep it to what a per-frame
  bake can do: no state carried between frames.

## How to look

Dev server on http://localhost:5173 (running: never stop it). Paint the row with
`node scripts/shoot.mjs "/fx-concepts.html?only=slow21" "" 6000`, which writes
`.shots/fxc_slow21_{today,A,B,C}.png` (12 cells of 240 x 234 screen px each, zoom 3). Crop and read your own
column (python3 + PIL is there); make a zoom-1 crop too. Scratch in `scratchpad/slow21-<a|b|c>/` inside the
repo's scratchpad, never the root; delete scratch PNGs when done. The other two artists are painting the
same row at the same time: only look at your own column, and if the shot fails, wait a moment and retry.
`node --check` your file after every edit. No git that changes anything, never search outside the repo.
At most two look-fix passes after the first draft. Budget: about 35 tool calls.

## Report

Three or four lines: what you drew, how it grows with strength, how it reads with the cold mist, and anything
weak or NOT CHECKED, plainly.
