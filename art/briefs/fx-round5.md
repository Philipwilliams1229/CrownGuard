# Effects concepts, Round 5 (2026-11-18): fire on a foe, raising the dead, light

The owner: "The on fire effect, i dont like. What are some more options? and then the raising dead,
i like the purple green spiral, but i want it to go around the enemy being raised, not in front. and
lets see some more options as well. Some lighting effects would be nice."

Same page and lab as Round 4 (read `art/briefs/fx-round4.md`, "How the page works" and "The look":
everything there holds, except the file names below). This round has FOUR options a row: A, B, C, D.

## Rows by artist

**Fire** (`concept/fx-r5-burn.js`, row id `burn5`, `todayKeys: ["burn"]` so TODAY is the game's
burn; game code: `src/render/statusfx.js` `burnSprite` (flame clumps on the back and at the feet, face
kept clear, a ground glow, embers, a wisp), `src/render/flames.js` for flame shapes the owner liked
on burning ground B). The owner does NOT like today's look, so don't just polish it: four genuinely
different ideas. A walking goblin (`e.foe(f)`, its walk frame) burns in every cell, loop cleanly
(`e.t`), N 10-12. Suggested spread (change it if you find better):
- A: few big, readable licks of flame that ride the body's outline and flicker in frame swaps.
- B: the body itself catches: a hot orange/white rim along the silhouette's edge (as if lit from
  inside the flames), small flames popping up and going out at random spots, smoke trailing behind.
- C: one tall flame column wrapping the figure from behind (behind the body on the far side, over it
  on the near side), sparks spiralling up.
- D: your own idea (e.g. chunky stylised cartoon fire, or charring: the body darkens from the feet).
LIGHT in every option: the fire throws warm light, a flickering ground pool round the feet and a
warm rim on the body's side nearest the flames. The game can do this (`addLight` in
`src/render/pix/pixrigs.js`, the rim overlay on new figures, style guide "Light on the board"), so
paint it as the game would: a stepped glow pool on the ground, a 1-px warm rim on lit edges, in
fifths of strength. Face stays readable.

**Raising the dead** (`concept/fx-r5-raise.js`, row id `raise5`, `todayKeys: ["raise"]`; game code:
`src/render/rings.js` `case "raise"` (GR layer: grave ground, mist, clods; AIR layer: the violet /
green spiral, which today is drawn ENTIRELY OVER the rising figure: the owner's complaint)). The
risen goblin climbs out bone-pale (`e.foe(0, "revived")`, clipped at the ground and raised as the
lab's TODAY does: copy that). One-shot, `e.p`, N 10-12, cell like the old `raise` row (cw 72, ch 76,
ax 36, ay 62) or a little taller.
- A: TODAY's spiral, the owner's liked look, but WRAPPED: the back half of each turn (sin of its
  angle < 0, i.e. behind) drawn BEFORE the figure, the front half after it, so it coils AROUND him.
  This is the direct fix; keep its colours and timing.
- B: the wrapped spiral, richer: two or three strands, thicker near the ground, a witch-fire ring on
  the ground the strands rise from, bright motes spun off the top.
- C: the wrapped spiral PLUS light: violet / green light on the grave earth and a rim of witch-light
  on the bones as he climbs, a flash when he stands.
- D: your own idea (e.g. green soul-fire pouring DOWN into the grave, then the spiral lifts him;
  or ghostly hands; or runes circling on the ground). Still coiling round, never a curtain in front.
The rising figure must stay readable in every frame.

## Rules for artists

As Round 4: own only your `concept/fx-r5-<area>.js` (`export const ROWS = [...]`, row shape
`{ id, label, group: "Round 5", note, cw, ch, ax, ay, N, todayKeys, A, B, C, D }`).
`concept/fx-r5.js` gathers both; the lab (`/fx-concepts.html?only=burn5` or `raise5`) paints
`fxc_<id>_{today,A,B,C,D,Bdark}.png`. Scratch in `scratchpad/<area>5/`. Your own browser tab in the
built-in browser (tabs_create), closed when done; never resize the window or touch others' tabs, never
stop the dev server, no git that changes anything, never search outside the repo. Look at your strips
(Read the PNGs), at most two look-fix passes. Report: row id, a line per option, and anything NOT
CHECKED or weak, plainly.

## Added: the frost nova (owner, same day: "I would also like to revisit nova effect for ice")

**Nova** (`concept/fx-r5-nova.js`, row id `frostnova5`). Give the row its own `today(c, e)` that calls the
game's `drawRingFx` (`/src/render/rings.js`, `{ type: "frostnova", x: 0, y: 0, r: R, life: 500, ttl: 500 * (1 - e.p) }`,
layer "g", then the goblins, then "a"), at round 4's cell and R 56 (concept/fx-r4-novas.js `NW`). The Rimecaller
(Warden Mage path a) fires it from its hall at its aura's reach, now only when a foe is in the aura. Squashed to 0.55 tall
on the ground (rings.js SQ; the owner: "to maintain that 3D effect"); its slow-aura pulse now lies at
the same 0.55. The owner LIKES flashing rings: keep a front that reads as a ring. Put two or three
goblins in it that flash white as the front passes (see concept/fx-r4-novas.js `gob`, round 4's
frostnova row, which is today's pick B: don't redraw B). Four options:
- A: a crisper, bolder ice front (a thick stepped rim of packed frost, a bright inner line), quick.
- B: a ring of ice spikes erupting outward in sequence round the circle, shattering into shards.
- C: a cold blue-white flash and LIGHT: the ground and the goblins lit cold blue as it passes, a
  frost glaze left that fades.
- D: your own idea (e.g. a blizzard swirl spun outward, or frost crystals growing in a snowflake
  pattern).
