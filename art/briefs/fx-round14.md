# Effects concepts, Round 14 (2026-11-24): Dragonbreath after the owner's reference

The owner on Round 13 (Fable's blade + rolling ground fires): "No that looks like a fountain. Man this is
the hardest one for us. Here's an example of a style I like." They want three options: two drawn by
Opus artists (A, B) and one by Fable (C).

## The reference: `art/briefs/ref/dragonbreath-ref.jpg` (open it and study it first)

A pixel figure holds a flamethrower; the flame goes out STRAIGHT, side on:
- at the nozzle a thin, bright needle (white / pale yellow), with a little spark and smoke-free gap;
- it widens steadily along its whole length, like a long cone or comet: thin at the gun, widest at the end;
- the body is DENSE, mottled pixel flame: clusters of orange, deep orange and red-orange, with a pale yellow
  core line running through most of its length; small ragged licks along both edges, more toward the end;
- it ends in a big ROUNDED, bulbous head, the widest part, slightly darker and redder at its outer rim;
- one continuous mass. No separate balls or billows, no smoke, no fires on the ground, no arc or droop.

## What has been turned down (don't go back there)

- TODAY (`drawBreath`, src/render/flames.js): a smoky hose of lumpy round billows arcing down; grey smoke.
- Round 12 (`.shots/fxc_breath12_*.png`): today's billows tidied, teardrop streaks, a ring at the staff.
- Round 13 (`.shots/fxc_breath13_A.png`): a blade curving down from the staff onto the road, then rows of
  small flames rolling out over the wedge. "Looks like a fountain": the steep fall from the staff and the
  ground fires read as water spraying, not a jet of fire.
- Earlier drafts: a thin rope onto a carpet of spiky candle flames; a flat striped triangle on the road.
- Nearby effects the owner approved: the fire wizard's blast (`fireboom`, src/render/fx.js: no smoke,
  sparks lift off) and the burning-foe outline (statusfx.js `statusBurn`).

## The hard part: the camera

The reference is side on. Our mage stands high on the spire's top (`breathMouth(t)`,
src/render/halls/wizard.js) and the damage is a WEDGE on the road (engine, update.js `breathe`: `ang`
ground radians from the hall's foot, reach 69 world units = 138 art px, half-angle 0.42; what is inside
burns). The jet has to travel from that high staff out and down to the foes and still read as the
reference's straight, widening jet, NOT a fountain falling out of the sky. Think about the direction on
screen (it can lean down only a little and travel far, or head straight for the wedge's far half), where
the bulbous head sits (over the foes at the far end of the reach?), and how the goblins inside stay
readable (the head can sit partly behind them, or be a little see-through at its rim, or the goblins
are drawn over it; your call). The wedge must stay honest: what is inside burns, nothing outside looks hit.

## Your option

Each artist owns ONE file and nothing else:
- **A (Opus):** `concept/fx-r14-a.js`, the reference made faithfully in our camera.
- **B (Opus):** `concept/fx-r14-b.js`, a clearly different reading of the same reference (for example a
  different path for the jet, a different way the head meets the foes, a different rhythm of motion).
  Look at nothing of A's; just make your own choices clear in your note.
- **C (Fable):** `concept/fx-r14-c.js`, your own reading of the reference.

Contract: the file exports `paint(c, e)` that draws the WHOLE cell (road, the real hall, goblins, light,
your flame, in your own order) and `note` (a plain-words description for the owner, 2-4 sentences). Use
the shared cell in `concept/fx-r14-kit.js` (the lead's; import from it, never edit it): `aimAt(e.i)`,
`mkT`, `hallAt`, `mouthOf`, `road(c, e.ground === "dark")`, `GOB` + `gobItem` (y-sorted goblins),
`pool` (the warm light), `sparks`, `FIRE` tones, `H`, `bay`, `P`, `Lart`, `N` 16. `fx-r13-breath.js`
`fable` is a worked example of a whole cell. A true 16-frame loop at 110 ms a frame (the kit's aim
already sweeps and returns), breath held, no jump at the seam. The jet should FLICKER and surge along
its length (the reference is a still; ours must live), still one mass.

Pixel style (`art/STYLE-GUIDE.md`): stepped tones, the tinted 1-px line, one sun, no smooth gradients.
It will later be built into `drawBreath` for a few halls at once, so keep it bakeable (a sprite per aim
step and frame is fine; per-pixel passes are fine in the concept).

## Rules

The lab `http://localhost:5173/fx-concepts.html?only=breath14` paints
`.shots/fxc_breath14_{today,A,B,C}.png` (all three options at once, so a teammate's half-done file may
show; only judge your own strip). If the dev server does not answer, report BLOCKED; never stop it.
Look at EVERY frame of your strip at board size (zoom 1) and zoomed, and the loop's seam; compare
against the reference picture side by side. Scratch in `scratchpad/breath14-<a|b|c>/`; your own browser
tab (tabs_create, its tabId on every call), closed when done; no git that changes anything; edit only your
file; `node --check` after every edit (a syntax error breaks your teammates' lab too). At most three
look-fix passes. Budget ~70 tool calls. Report: what you drew and why it reads like the reference,
anything weak or NOT CHECKED plainly, and your PNG path.
