# Time of day: a fixed sun for every level (2026-11-22, owner request)

The owner's words: "static lighting environments ... the light in different positions across the
sky, so we can vary up the look and gameplay a bit, and it helps make it look more 3d too ... the
lower the sun position, the more into the 'sunset' look it would get, but this could also be a
sunrise position if it comes up in the east (right) ... dynamic shadow positions for each time of
day ... and some color adjustments as well as we get into the golden hour." Later the same night:
"give you the job of foliage and other decorative items (stones, rocks, old towers, etc) too. add
those into these effects."

The owner's answers: SEVEN positions; fixed per level, the lead proposes the list; look only (no
rules change); the painted bright side of towers and figures MOVES to the sun's side (they saw a
trial, `node scripts/sun-sides.mjs`, and picked "repaint bright side").

The owner is asleep and wants it finished by morning. Work autonomously; never wait on a question.

## The contract (read `src/data/sun.js` first: it is short)

- `DAY` is the live sun. Fields: `id`, `on` (false at noon), `side` (+1 east/right, -1 west/left),
  `elev`, `L` (sculptor's light), `fall` (unit vector a cast shadow runs along the ground, screen
  space), `len` (shadow length x the caster's height; 0 at noon), `col` (the light's colour),
  `warm` (0..1), `rim` (edge-light strength), `shade` ([r,g,b,a] of cast shadows), `tone`
  ("rose" sunrise | "amber" golden hour | null), `v` (a counter that goes up at every change).
- `onDay(fn)` registers a cache clearer (called after a change). Or key a cache on `DAY.v` / `DAY.id`.
- **NOON IS TODAY'S GAME. At noon (`DAY.on === false`) every picture must stay pixel-identical to
  before this work.** So guard every new path with `DAY.on`. The Hollowfen plays at noon with its
  own moving sunset and blood moon (render/sunset.js, render/bloodmoon.js): that must not change.
- Already wired by the lead: pix.js `resolve` sculpts every pix sprite from `spriteSun(flip)`;
  bake.js and pix/halls.js clear their bakes on a new sun; CrownguardGame.jsx `startLevel` calls
  `setDay(sunFor(lv))`; `src/render/daylight.js` is the seam draw.js calls (`dayGround` in the
  ground pass, `dayOver` after everything standing, `dayLights` with the frame's lights).
- The seven: sunrise, early, morning (east; shadows fall LEFT), noon, afternoon, late, golden
  (west; shadows fall RIGHT). morning / afternoon are plain daylight with medium shadows; the
  colour comes in at early / late and is full at sunrise (rose-gold light, blue-violet shadows)
  and golden (amber light, violet shadows).

## Rules from earlier owner feedback (they apply here)

- NO flat colour wash over the whole board ("someone would think their phone is breaking"). The
  hour is told by the WORLD: shadow direction and length, a lit edge on the sunward side, colour
  that differs between lit ground and shadow. A gentle, uneven grade is fine; a tinted screen is not.
- Shadows start from the outline of a hall's base and take the hall's full width; nothing juts out
  under the base's front (render/sunset.js `bakeHallSun` has the owner-approved rule for a shadow
  falling right; mirror it for one falling left).
- Pixel-art discipline: art-pixel stepped edges (an art pixel is 0.5 board units), dithered tips,
  stepped alpha, no soft gradients or blurs on sprites. Style rules: `art/STYLE-GUIDE.md`.
- Performance on phones matters: bake per sun (a level has ONE sun, so bake once and keep it),
  no per-frame getImageData, no canvases bigger than they must be. Measure what you add (ms a frame).
- Memory: phones were once killed for memory. Drop caches on a sun change instead of keeping seven.

## Who owns what (edit ONLY your files; shared files belong to the lead)

| Agent | Owns | Job |
|---|---|---|
| shadows | `src/render/dayshadows.js`, `src/render/sunset.js`; the two sun lines in `src/render/pix/halls.js` (`noteHall` / `hallRim` calls) | Cast shadows of halls, soldiers, heroes, foes for any `DAY.fall` / `DAY.len`, and the sun's edge line and wash on the halls' sunward side (colour `DAY.col`, strength `DAY.rim`). Reuse `sunset.js` (generalise its hard-wired direction) WITHOUT changing the blood moon's sunset. |
| castle | `src/render/castle.js` | The castle wall, towers, gate and decks under each sun: which faces are lit or shaded, deck and tower shadows along `DAY.fall`, edge light in `DAY.col`. The castle stands at the EAST edge: at sunrise the sun is behind it (its west faces, the ones we see, in shade with a lit top rim and long shadows thrown west onto the board); at golden hour its west faces glow. |
| scenery | `src/render/scenery.js` (not the castle parts), `scenery-vale.js`, `scenery-gwpix.js`, `scenery-iron.js`, `scenery-rime.js`, `world.js`, `apron.js`, `bridge.js`, `pix/vale-pix.js`, `pix/iron-works.js` | Trees, bushes, rocks, stones, ruins, old towers, tents, props, the spawn cave, bridges: their lit side and their cast shadows follow the sun on the board AND on the apron beyond it. Greenwood, Iron and Rime boards (not the Hollow). Idea to weigh first: most decor is baked to a sprite lit from the left with a shadow to the right, so drawing the baked sprite MIRRORED about its anchor gives an eastern sun for free (fine for trees and rocks; check props with writing, doors or water); then long shadows for low suns as sheared silhouettes like the halls'. |
| colour | `src/render/daygrade.js` | The hour's colour: `dayGradeGround` (ground pass), `dayGradeOver` (over everything standing), `dayKeyLights(g, add)` (the sun's edge light on figures via pixrigs' `addLight(x, y, r, col, k)`, as bloodmoon.js `moonLights` does with `SUN_KEY`; a light's x decides the side). Lit ground warms toward the sun's side, shadow sides cool; water and road take the hour; the strip beyond the board on tall screens (weatherfx.js `paintWeatherEdge`, apron) must not show a seam: report what the lead must hook. |

The lead owns `draw.js`, `data/sun.js`, `daylight.js`, `pix/pix.js`, `pix/bake.js`,
`CrownguardGame.jsx`, the guides. Need a change there? Make it only if it is one or two lines,
and REPORT it; otherwise ask the lead in your report.

## Working rules

- Read `CLAUDE.md` "Several sessions at once" and "Default way of working". Never run git commands
  that change anything (no add, commit, stash, checkout, restore, reset). Never search outside
  the repo. Scratch files go in `scratchpad/<your name>/` or `.shots/` with your prefix.
- `node --check <file>` after every edit: one syntax error breaks the shared dev server for all.
- Look at your work: the dev server runs at http://localhost:5173 (do not restart it). Open YOUR
  OWN browser tab (the built-in browser's `tabs_create`, then `navigate` with that tabId), never
  touch other tabs, close yours when done. Lab page:
  `/sun-lab.html?realm=thornbrook&faction=greenwood&sun=golden&tag=<prefix>_x` saves
  `.shots/sun_<tag>_0.png` (1680x1120); `&all=1` saves one per sun (`sun_<tag>_<sun id>.png`).
  Wait until the tab's title is DONE, then Read the PNG (crop / shrink with `sips` first: e.g.
  `sips -c 500 700 --cropOffset 300 400 in.png --out out.png`). Other boards: realm=ironford
  faction=iron; realm=frostwake faction=rime; realm=gullwick (coast); `&towers=archer@0.3:3,...`.
  No playwright on this Mac: `scripts/shoot.mjs` does not work here.
- Check at least: sunrise, morning, noon (unchanged!), late, golden, on a Greenwood board, then
  one Iron and one Rime board. Compare noon against `.shots/sun_base_noon.png` (taken before the
  team started) for your area.
- Budget: about 90 tool calls. Do two or three look-fix passes, then stop.
- Report (short): what you built, the files touched, any line changed outside your files, what
  you measured, shot paths, and every weak spot named plainly ("NOT CHECKED: ...").

## STATUS (the lead keeps this current)

The time of day itself is finished and live on main (2026-11-22). **The night's work continues in
`art/briefs/scenery-water-upgrade.md` (the scenery and water upgrade the owner asked for next): read
that brief and its STATUS section and carry on from there.** It is not "ALL DONE" until that brief's
STATUS says so.
