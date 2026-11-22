# Effects concepts, Round 7 (2026-11-21): the Plague Ghast's burst

The owner: "lets look next too at the plague ghast explosion effect, needs a rework." No more
detail than that, so four genuinely different ideas, not a polish of today's.

## What happens in the game today

A Plague Ghast (Hollow; `fig-ghast.js`, a swollen grave-rot shambler, size 18) dies and BURSTS
(engine/update.js, `deathBurst` { r 55, dmg 26, dps 12, dur 3500 }): every soldier within 55 world
units is scalded for 26 (or loses his shield), and a plague POOL of radius 44 (0.8 x r) lies on the
ground for 3.5 s, eating at anyone standing in it. What draws:
- the burst: `src/render/rings.js` `case "plagueburst"` (Round 2's pick B: a sickly glow in a rot
  stain, then 15 bubbles of many sizes that swell, hold and slowly pop, over `life` 1400 ms; the
  ground part is squashed to 0.55 tall);
- the pool after it: `src/render/fx.js` `drawGround` kind "plague" (`poolSprite`, Round 4's pick B);
- the ghast itself crumbles in the usual death (`drawDeathPoof`, statusfx.js).

## The row

`concept/fx-r7-plague.js` (yours alone), `export const ROWS = [ row ]`, row id `plague7`,
`group: "Round 7"`, shape `{ id, label, group, note, cw, ch, ax, ay, N, today, A, B, C, D }`,
one-shot (`e.p` 0..1), N 14. Give the row its own `today(c, e)` built like
`concept/fx-r5-nova.js` `todayNova`: import the game's painters in the browser only (that file's
`BR ? await import(...) : {}` trick, so Node can still read ROWS), draw `drawRingFx` with
`{ type: "plagueburst", x: 0, y: 0, r: 55, life: 1400, ttl: 1400 * (1 - e.p) }` on layer "g", the
figures, then layer "a"; and `drawGround` plague under the last frames, as the game lays it.
TRUE SCALE: 1 world unit = PX (2) art px, so the burst is 110 art px in radius and 0.55 tall
(about 220 x 121): pick a cell that holds it (e.g. cw 250, ch 170, the anchor low in the middle).

In every cell: the ghast at the centre (`rigFrame("ghast", "walk", f)` from `/src/render/rigs.js`,
in the browser) for the opening frames, gone once it bursts; and two knights at the burst's rim
(`rigFrame("garrison", "walk", 0)` or any soldier rig), one just inside the 55 (it is scalded: a
flash) and one just outside (untouched), so the owner can SEE the reach. Every option ends by
handing over to a pool the size of the game's (44); keep today's pool, or show your own if the
option needs it (say so in the note).

Four options (change the spread if you find better):
- **A, a gut-burst:** the ghast swells and trembles for a beat, then splits: gobbets and droplets
  of green-yellow rot thrown out in arcs, landing all over the reach as splats that become the pool.
- **B, a gas cloud:** a thick rolling cloud of plague gas billows out to the reach (lumpy, stepped
  puffs, squashed on the ground), sickly light inside it, then thins and settles into the pool.
- **C, a bold blast:** a hard, readable ring of rot (the owner likes flashing rings) racing out to
  the reach, a spray of bubbles and flecks behind its front, a ground stain left.
- **D, your own idea** (e.g. a swarm of flies bursting out and spiralling down, or bone shards and
  rot together).
LIGHT in every option, painted as the game would (`addLight`, style guide "Light on the board"): a
sickly green-yellow glow on the ground and a rim on the knights' near sides, in fifths of strength.
The reach must READ in every option: someone should be able to tell where 55 ends.
Pixel style: stepped tones, tinted 1-px line, one sun (top-left), no soft blur; the ground part
never draws over a body, only under (style guide "Effects on the ground").

## How to look, and the rules for artists

The lab: `/fx-concepts.html?only=plague7` paints `.shots/fxc_plague7_{today,A,B,C,D,Bdark}.png`
(dev server http://localhost:5173 is running: don't stop it). Read the PNGs to look. Scratch in
`scratchpad/plague7/` inside the repo. Your own browser tab in the built-in browser (tabs_create,
and pass its tabId on every call), closed when done; never resize the window or touch others'
tabs, no git that changes anything, never search outside the repo, `node --check` your file after
every scripted edit. Another artist is editing src/render/statusfx.js, fx.js and enemies.js at the
same time: read them if you like, never edit them. At most two look-fix passes. Report: a line per
option, and anything NOT CHECKED or weak, plainly.
