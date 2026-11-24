# Effects concepts, Round 10 (2026-11-24): the fire wizard's blast, softer

Round 9 (`concept/fx-r9-fireblast.js`: flame bloom, sigil, vortex, molten splash) was turned down whole.
The owner: "none of those. I still want it to keep its cool magic rings around the outer edge, I was just
thinking more along the lines of less smoke, less explosivity maybe?"

So this round is NOT a new effect. It is TODAY (`BLAST.boom` in src/render/fx.js) with its outer ring
KEPT EXACTLY (the "g" layer's expanding fire ring, its wash and its timing, and the white flash on foes
from ringflash.js), and only the middle softened: the part that says "gunpowder" is the grey smoke
column, the cream starburst rays and the big cauliflower fireball. The bomb keeps today's `boom`
untouched; the wizard will get a new type that shares the ring.

## The row

`concept/fx-r10-fireblast.js` (yours alone; a stub is there), `export const ROWS = [ row ]`, row id
`fireblast10`, `group: "Round 10"`, the same cell, scale, timing (~530 ms on screen, the ring at the rim
by 384 ms, nothing left at 530 ms) and knights as Round 9's `fireblast9` (copy what you need from it).
TODAY = the game's own `boom` through drawBlast, as Round 9. Every option draws today's ring by CALLING
the game's own code (draw only the "g" layer of drawBlast, or port `BLAST.boom.g` unchanged), so the ring
is byte-for-byte today's; only the "a" layer (what stands above the ground) changes.

Four steps from today, mildest first (change them if you find better):
- **A, no smoke:** today's fireball and embers exactly, the smoke removed; the fireball burns out into
  a few rising sparks instead of sinking into smoke.
- **B, a smaller flame:** no smoke, no starburst rays; the fireball half today's size and lower, a
  quick puff of flame that collapses into a soft glow at the centre; today's embers but fewer.
- **C, a flare, not a blast:** no fireball at all: a bright white-gold flash at the point of impact
  (a few frames), a small cluster of flame licks curling up from it, and embers drifting UP and fading.
  The ring does the talking.
- **D, a magic touch:** C plus a faint SECOND, smaller ring inside the outer one (fire-coloured, a
  little behind it), so the blast reads as a spell; maybe a wisp of thin, pale smoke at the very end.
Light: the warm pool as Round 9 painted it, scaled to each option's flame. Pixel style: stepped tones,
the tinted 1-px line, one sun.

## Rules

As Round 9 (lab `/fx-concepts.html?only=fireblast10` paints `.shots/fxc_fireblast10_*.png`; scratch in
`scratchpad/fireblast10/`; your own browser tab; no git that changes anything; only your file; `node
--check` after every scripted edit). Look at EVERY frame of every option at zoom 1 (board size) and say
so. Check side by side that A-D's outer ring matches TODAY's frame for frame. Update the row's `note`.
Budget ~40 tool calls. Report: a line per option, anything NOT CHECKED or weak, plainly, and PNG paths.
