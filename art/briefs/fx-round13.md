# Effects concepts, Round 13 (2026-11-24): Dragonbreath's flame, drawn by Fable

The owner turned down all of Round 12 ("None of those") and asked for Fable to draw one. So this round
has ONE option, yours, beside TODAY. You are the designer and the hands: decide what Dragonbreath's
flame should be, then draw it well.

## What has been turned down (look at the frames before you design)

- **Today** (`drawBreath` in src/render/flames.js): a smoky hose of lumpy round billows, grey smoke
  at the far end; the flame does not read as flame.
- **Round 12** (`concept/fx-r12-breath.js`, row `breath12`; frames in `.shots/fx-concepts-round12/`
  and `.shots/fxc_breath12_*.png`): A today's plume cleaned (no smoke, billows stretched and merged into
  one mass, a white-gold core, a warm far end); B the same with teardrop streaks (read leaf-like); C A
  plus a fire ring at the staff and a broken fire arc on the wedge's far edge. All three still read as
  today's hose, slightly tidied, and the mass covered the goblins.
- Two drafts before those were sent back by the lead: a thin rope of fire dropping onto a carpet of
  identical spiky flames (reads as candles), and a flat striped triangle lying on the road.

What the owner HAS approved in nearby effects (look at them): the fire wizard's new blast (`fireboom`
in src/render/fx.js: no smoke, today's magic ring kept, a broken inner ring of fire, sparks lifting off)
and the burning-foe outline (statusfx.js `statusBurn`). They like conjured fire with no smoke, sparks
that lift, and pixel flame that reads at a glance. They dislike busy spectacle, candle-stick flames and
religious-looking symbols.

## The hall and the rules of the engine

Dragonbreath (Wizard Spire, Pyromancer path, final b) fires no shots: the mage on the spire's top,
staff levelled, holds a gout of flame on the road. Engine (update.js `breathe`): `t.breath = { on,
ang, len, cone }`; `ang` ground-plane radians from the hall's foot; `len` 69 world units; `cone`
half-angle 0.42. Everything inside that wedge burns, so the picture must show the wedge honestly (what
is inside burns, what is outside does not), and it must not hide the foes it burns. The jet comes from
`breathMouth(t)` (src/render/halls/wizard.js), high on the spire, and comes down to the road.

## The row

`concept/fx-r13-breath.js` (yours alone; a stub is there), `export const ROWS = [ row ]`, row id
`breath13`, `group: "Round 13"`, `oneCol: true` (the lab paints TODAY, A, and A on dark ground =
`A(c, e, true)`), `label`, `note` (describe your design in plain words for the owner), the same cell
fields as Round 12 (`cw, ch, ax, ay, N`). Start from `concept/fx-r12-breath.js`: copy its hall, road,
goblins, light and TODAY (the game's own `drawBreath`) rather than rewriting them. A true 16-frame loop
at 110 ms a frame, the breath held (on 1) and sweeping across the road and back, no jump at the seam.

The lab: `http://localhost:5173/fx-concepts.html?only=breath13` paints
`.shots/fxc_breath13_{today,A,Adark}.png` (dev server: don't stop it; if it doesn't answer, report
BLOCKED). Pixel style: `art/STYLE-GUIDE.md` (stepped tones, the tinted 1-px line, one sun, no smooth
gradients). It will later be built into `drawBreath`, so keep it something that could run every frame
for a few halls (bake what you can).

## Rules

Look at EVERY frame at board size (zoom 1) and zoomed, and check the loop's seam. Scratch in
`scratchpad/breath13/`; your own browser tab (tabs_create, its tabId on every call), closed when done
unless it is the last tab; no git that changes anything; edit only your file; `node --check` after every
scripted edit. Budget ~80 tool calls. Report: what you drew and why, anything weak or NOT CHECKED
plainly, and the PNG paths.
