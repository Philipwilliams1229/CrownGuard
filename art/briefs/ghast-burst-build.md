# Build: the Plague Ghast's burst is Round 7 A's first half (2026-11-21)

The owner, on the Round 7 page (`concept/fx-r7-plague.js`, option A, gut-burst): "lets remove the
puddle from afterwards, and just use the beginning half of the animation from A". So: the swell,
the split, the gobbets thrown out in arcs and their splats landing (the rim splats show where 55
ends), then the splats FADE AWAY quickly. No pool, no lasting stain, no scaly ground: nothing is
left on the road once it ends.

## The engine (done by the lead; read, don't change)

`src/engine/update.js`: a dying ghast pushes `{ type: "plagueburst", x, y, face, ttl, life: 900,
r: 55, swell: 220, fly: 300 }` (GHAST_SWELL / GHAST_FLY / GHAST_LIFE). The damage (75) lands on
each soldier when the rot REACHES him: at `swell + fly * (distance / r)` ms after the death. So the
picture must match: the split at `swell` (220 ms), the gobbets reach the rim at `swell + fly`
(520 ms), then splats fade out by `life` (900 ms). The engine no longer lays a plague pool for
the ghast. `fx.face` is the way the ghast faced.

## What to change (files you own)

- `src/render/rings.js`, `case "plagueburst"` only: replace the bubbles with A's opening, ported
  from `concept/fx-r7-plague.js` (its A painter and helpers), in the game's world units (1 unit =
  PX art px; the case already shows how its GR / AIR layers, `put`, `dither`, `stepA` work). Ground
  marks (the splats, the glow) in the GR layer, under bodies; the flying gobbets and the flash in
  the AIR layer. Squash on the ground as the rest of rings.js does (0.55). Keep it light: bake
  per frame where you can (the ghasts come in numbers in the Hollow); report its cost for 10 bursts
  at once.
- The swell: A drew the ghast itself swelling and shuddering before it went white. In the game
  the dead ghast's own death crumble also plays (engine/actions.js pushes a `death` effect). Pick
  one and say which: (a) the burst starts from a white flash shaped like a swollen blob over the
  crumble (no figure in rings.js), or (b) you draw the ghast's swelling yourself from its frame and
  the lead turns its crumble off. (a) is preferred unless it looks wrong; if you want (b), STOP and
  report before doing it.
- The light: a brief sickly green-yellow glow on the ground during the burst, as A painted it.

## Check

A lab of your own in `scratchpad/ghastburst/` (copy `fx-lab.html`'s way of drawing a frame through
the real `draw()`, or call `drawRingFx` directly at several ttl values), plus the real engine:
`/shotlab.html?kind=knight&form=3&foes=ghast,ghast,ghast&realm=hollowfen...` (read the header of
shotlab.html for its params; `&set=hp:1` makes the ghasts die at once next to the knights) to see a
burst among soldiers at board size. Shots in `.shots/` with prefix `gb_`. `node --check` every file
after every scripted edit (the dev server serves every session).

Rules: as `.claude/agents/artist.md`. Your own browser tab (tabs_create, its tabId on every call),
closed when done; never stop the dev server, no git that changes anything, never search outside
the repo. Budget about 50 tool calls. Report: what it looks like frame by frame, the cost, the shot
paths, and anything NOT CHECKED or weak, plainly.
