# Effects concepts, Round 9 (2026-11-24): the fire wizard's blast

The owner: "a different animation for the fire wizard's explosion ... right now it is the same or very
close to the bombardier throw. I think it's good for a bomb, bad for a wizard. Show me a few options."

It IS the same today: a Pyromancer / Inferno Throne fireball (`p.burn`) and the Powder Works' shell
both push `{ type: "boom" }` (src/engine/update.js ~3325), drawn by `BLAST.boom` in src/render/fx.js:
a cream starburst, a cauliflower fireball, grey smoke boiling up, a fire shockwave ring on the ground,
embers flung out. That reads as gunpowder. The bomb KEEPS it; the wizard gets a new one.

## What a wizard's fire should say (and the bomb's must not)

Conjured flame, not powder: no grey smoke column, no shrapnel-like debris, no soot. Flame that moves
like a spell: it curls, licks, spirals, rises; it glows rather than smokes; the colours can run hotter
(white-gold core, orange, crimson, a little violet-magenta at the cool edge to tie it to the mage's
spell light). It should still read as FIRE at a glance (the target is set ablaze).

## The engine's timing (every option must fit it)

On screen the blast lasts ~530 ms (ttl 320 at `BLAST_PACE` 0.6). The owner loves "seeing the wave of
damage emanate from the centre": the damage rides an expanding front: foes within 0.3 r are hit at
once, the rim r at ~384 ms (update.js `blastDelay`). So something must visibly travel outward and
reach the rim by ~384 ms (p 0.72 of the effect), then the effect fades out by 530 ms. Nothing may be
left on the road afterwards (the Inferno Throne's every-fifth fire pool is a separate effect: leave it).
Splash r is 36-38 units (Pyromancer / Inferno Throne): draw it at TRUE scale, r 37 units = 74 art px
radius, squashed 0.7 tall on the ground like today's (the ground ring never draws over a body: style
guide "Effects on the ground").

## The row

`concept/fx-r9-fireblast.js` (yours alone; a stub exists, replace it), `export const ROWS = [ row ]`,
row id `fireblast9`, `group: "Round 9"`, one-shot (`e.p` 0..1 over 530 ms), N 12 frames. Use
`concept/fx-r8-burst.js` as the worked example of a row (cell size, `today`, the knights, `note`,
the browser-only import trick). Two goblins (or knights) in the cell: one inside the reach (flashes as
the front reaches him), one just outside.
- **TODAY** = the game's own `boom` through `drawBlast` (src/render/fx.js; "g" layer, figures, then
  "a"), `{ type: "boom", x: 0, y: 0, r: 37, ttl: 320 * (1 - e.p), life: 320 }` (check how drawBlast
  reads life/ttl so the frames match the game).
- Four options (change them if you find better; keep them clearly DIFFERENT from each other):
  - **A, flame bloom:** the orb splashes into a ring of curling flame tongues that run out along the
    ground to the rim and lick up as they go, then gutter out in sparks; a white-gold flash at the
    centre, no smoke at all.
  - **B, fire sigil:** a burning rune circle snaps onto the ground at impact and spreads to the rim
    (that is the wave), then a short pillar of flame roars up from the centre and collapses into
    rising sparks. Must not look like the arcane blast (which has a pillar and turning runes in
    violet): fire colours, the circle burns rather than glows.
  - **C, fire vortex:** the flame swirls out from the centre as a turning spiral of fire wisps (two or
    three arms), widening to the rim, with a heat shimmer, ending in a puff of embers floating UP
    (not falling like the bomb's).
  - **D, wild card:** your own wizard-fire idea (e.g. molten globs of liquid fire that splash out and
    flicker briefly where they land; or a phoenix-wing flare).
Light: each option paints the light `addLight` would give (a warm pool on the ground and the figures'
near edge), as Round 5's rows did. Pixel style: stepped tones, the tinted 1-px line, one sun, no
smooth gradients.

## Rules

The lab: `/fx-concepts.html?only=fireblast9` paints `.shots/fxc_fireblast9_{today,A,B,C,D,Bdark}.png`
(dev server http://localhost:5173 runs: don't stop it; if it doesn't answer, report BLOCKED). Read the
PNGs and look at every frame of each option at board size (zoom 1), not only zoomed. Check that a
glance at A-D next to TODAY no longer says "bomb". Scratch in `scratchpad/fireblast9/`. Your own browser
tab (tabs_create, its tabId on every call), closed when done; no git that changes anything; don't
edit any other file; `node --check` after every scripted edit. At most two look-fix passes. Budget:
about 60 tool calls. Report: a line per option, and anything NOT CHECKED or weak, plainly.
