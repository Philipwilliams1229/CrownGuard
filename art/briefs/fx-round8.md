# Effects concepts, Round 8 (2026-11-21): variations on the Plague Ghast's burst

In the game since today (Round 7 A's first half, `src/render/rings.js` `case "plagueburst"`, the
`gb*` bake): a lumpy swell on the body (220 ms), a white flash, gobbets thrown out in arcs, splats
landing out to the 55 rim (the rim ones the BIGGEST), fading by 900 ms. The owner: "looks a bit
whack. Maybe because the biggest bubbles fall towards the outside? lets see some variations on that
explosion."

The engine's timing stays (any option must fit it): split at `swell` 220 ms; the damage reaches a
soldier at distance d at `swell + 300 x d / 55` ms, so something must ARRIVE at the rim by 520 ms
and the reach must still read; gone by 900 ms; nothing left on the road after.

## The row

`concept/fx-r8-burst.js` (yours alone), `export const ROWS = [ row ]`, row id `burst8`,
`group: "Round 8"`, one-shot (`e.p` 0..1 over 900 ms), N 14, TRUE scale (as Round 7: reach 110 art
px, 0.55 tall; Round 7's cell and its two knights at 48 and 60 world units, one scalded, one not).
TODAY = the game's own `plagueburst` as it is now (drawRingFx, `{ type: "plagueburst", x: 0, y: 0,
r: 55, life: 900, ttl: 900 * (1 - e.p), swell: 220, fly: 300, face: 1 }`, layers "g" and "a", the
browser-only import trick of concept/fx-r5-nova.js) over the ghast's death crumble if you can draw
it, else over nothing. Every option keeps today's swell and flash (so the comparison is the burst
itself) unless the option is about changing them.

Four variations (change them if you find better):
- **A, heavy falls close:** the same gut-burst with sizes the right way round: big gobbets drop
  near the middle (short, low arcs), middling ones mid-way, and only small droplets and flecks
  carry to the rim. Splats biggest in the middle, a fine spatter at the rim.
- **B, streaked splatter:** splats drawn as streaks pointing OUTWARD along their flight (a blob
  with a tail back toward the centre), fewer of them; reads like a hard splash.
- **C, a spray burst:** a fast radial spray of fine droplets (many small, short-lived, low arcs)
  that reaches the rim almost flat, plus three or four big chunks that tumble a short way; a quick
  dark splash shape at the centre.
- **D, your own idea** within the same timing (e.g. the gobbets bounce and burst on landing into
  small droplets; or a ring of droplets that lands at once on the rim as a crisp dotted line).
Light as before (a short sickly glow). Pixel style: stepped tones, the tinted 1-px line, one sun.

## Rules

The lab: `/fx-concepts.html?only=burst8` paints `.shots/fxc_burst8_{today,A,B,C,D,Bdark}.png`
(dev server http://localhost:5173 runs: don't stop it). Read the PNGs and look at every frame of
each option at board size (zoom 1), not only zoomed. Scratch in `scratchpad/burst8/`. Your own
browser tab (tabs_create, its tabId on every call), closed when done; no git that changes
anything; don't edit any other file; `node --check` after every scripted edit. At most two
look-fix passes. Report: a line per option, and anything NOT CHECKED or weak, plainly.
