# Effects concepts, Round 12 (2026-11-24): Dragonbreath's flame

The owner, right after the fire wizard's blast was settled: "let's go ahead and get to fixing the
dragon's breath as well. Can you give me 3 options, animated?" What they liked in the blast round:
NO smoke (the blast lost its grey smoke and they approved it at once), sparks that lift off, flame that
reads as conjured fire, and the game's existing magic touches kept. Rounds 9-10 taught: they turned
down effects that replace everything with something new and busy (candle-stick flames, rune stars);
they took the familiar effect made cleaner. Aim each option at "a dragon's fire a wizard pours", read
at board size, clearly better than today, not a busy new spectacle.

## Today

Dragonbreath (Wizard Spire, Pyromancer path, final b) fires no shots: the mage on the spire's top,
staff levelled (`brace` pose), holds a gout of flame on the road. Engine (update.js `breathe`):
`t.breath = { on, ang, len, cone }`: `on` 0..1 (grows at 5/s when a foe is in reach, gutters at 3/s),
`ang` ground-plane radians from the hall's foot, turning toward its mark at 4.2 rad/s, `len` = range
69 units, `cone` half-angle 0.42; everything inside the wedge burns. Render: `drawBreath` in
src/render/flames.js (the jet from `breathMouth(t)`, the staff ring high on the spire, arcing down to
a ground wedge: a dithered heat wedge on the road, three layers of churning flame-cloud billows from
the nozzle out, slow billows at the far end reddening into grey SMOKE puffs, sparks), and draw.js adds
a warm light along the jet. It reads as a smoky cloud hose: lumpy balls, smoke at the end, the flame
itself not reading as flame.

## The row

`concept/fx-r12-breath.js` (yours alone; a stub exists), `export const ROWS = [ row ]`, row id
`breath12`, `group: "Round 12"`. The lab plays every strip as a LOOP at 110 ms a frame, so make it a
true loop: N 16 frames (1.76 s) with no jump between the last frame and the first. In the loop the
breath should be held (on 1) and SWEEP: the aim swings across the road and back (say 0.5 rad each way),
so the owner sees it turn. Optionally a second short row or the first 3 frames showing it igniting is
NOT needed; the held, sweeping jet is what matters.

Cell: draw the real hall, so the jet comes from the real staff: `drawWizardSpire(ctx, t, time)`
(src/render/halls/wizard.js) with a tower `t = { id, kind: "wizard", x: 0, y: 0, level: 3, branch:
"a", rank4: "b", breath: { on: 1, ang, len: 69, cone: 0.42 }, lastAim: ang, anim: 1, ... }` (copy the
other fields from fx-concepts.html's `hall()` helper), in world units scaled by PX like the other
rows; then the breath; three or four goblins on a road strip inside the wedge (rigFrame("goblin"...)),
lit warm, a couple burning. TODAY = the game's own `drawBreath(ctx, t, time)` with the same t.
Concept/fx-r8-burst.js and concept/fx-r10-fireblast.js are worked examples of rows (browser-only
imports, knights, light pools).

Three options (change them if you find better; keep them clearly different):
- **A, a cleaner jet:** today's shape and motion, made to read as FLAME: a tapered stream with a
  white-gold core and orange / crimson licking edges coming off the staff, turbulent but continuous
  (no separate balls), opening into the wedge and breaking into upward-curling flame tongues where it
  meets the road; NO smoke; sparks lift off the far end. The nearest to today.
- **B, rolling fire on the ground:** the stream comes down from the staff and the flame ROLLS along
  the road inside the wedge: waves of flame scrolling outward from the impact point, standing tongues
  flickering in rows, a hot glowing bed under them; the heat wedge clearly marks what burns.
- **C, the dragon's breath:** keep A's stream, but give it a faint wizardly touch tying it to the
  blast the owner just approved: a small spell ring at the staff (fire-coloured) the jet pours through,
  and the far edge of the wedge marked by a thin broken arc of fire (like the new blast's inner ring).
Light: the warm pool on the road and goblins, as earlier rounds painted it. Pixel style: stepped tones,
the tinted 1-px line, one sun, no smooth gradients. The cone must stay exactly the engine's wedge.

## Rules

The lab `/fx-concepts.html?only=breath12` paints `.shots/fxc_breath12_{today,A,B,C,Bdark}.png` (no D:
omit it). Dev server http://localhost:5173 (don't stop it; if it doesn't answer, report BLOCKED). Look
at EVERY frame of each option at board size (zoom 1) and zoomed; check the loop joins (last frame next
to the first). Scratch in `scratchpad/breath12/`; your own browser tab (tabs_create, its tabId on every
call), closed when done unless it is the last tab; no git that changes anything; only your file;
`node --check` after every scripted edit. At most two look-fix passes. Update the row's `note` to
describe each option. Budget ~60 tool calls. Report: a line per option, anything NOT CHECKED or weak,
plainly, and the PNG paths.
