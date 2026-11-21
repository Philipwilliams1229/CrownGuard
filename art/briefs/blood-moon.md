# Brief: the Blood Moon's look (2026-11-21)

The Hollowfen's new weather. The engine is DONE (engine/weather.js `bloodmoon`); it needs its
look. Read `art/STYLE-GUIDE.md` first (pixel style, one sun, light, performance), and
`.claude/agents/artist.md` (standing rules).

## What it is
Night falls over the fen under a red moon. One moon a level: the red light creeps in over ~20 s
(`g.weather.phase` "rising", `w.k` 0 -> 1), holds at its height ("squall", k = 1) for one to
three minutes, then fades over ~20 s ("easing", k 1 -> 0). On the Throne of Dust it never sets.
While it is up the dead get back up and mend. Between waves the weather freezes as it stands but
keeps animating.

## The owner's notes on the mock-up (hwx-concepts.html, option A)
- **No moon in the sky.** Make it apparent the red light comes from the UPPER-LEFT corner (just
  off the board): a raking red key light, the board darker toward the bottom right.
- **Torchlight needs real work.** Each hall's torches / lit windows should throw warm light on its
  own stone and the ground round it, and read as LIGHT, not a yellow disc pasted under the hall.
  This is the groundwork for NIGHT MAPS later, so build it as a reusable piece (a function any
  night painter can call), not as blood-moon-only code.
- **Eyes must sit in the figures' eye sockets.** The mock-up's red dots floated. The undead's
  eyes should glow red under the moon, exactly where each figure's eyes are, every frame and
  facing (side, FRONT, BACK: no eyes from behind). The risen look (`boneify`, render/rigs.js)
  already colours eyes witch-fire green in their own sockets; the Hollow figures (fig-risen.js,
  fig-wraith.js, ...) have their own eye pixels. Find where the eye pixels are known and glow
  those; do not guess offsets from the foe's centre.

## Do
- A painter `bloodmoon` registered in `PAINTERS` (src/render/weatherfx.js; read how `storm`,
  `fog` and `gravemist` are wired, and `weatherVeil` for the colour beyond the board) scaled by
  `w.k`. Put the work in a NEW file `src/render/bloodmoon.js` (painter, the torchlight piece, the
  eye glow) and keep edits to other files small and listed in your report.
- Red key light from the upper left; figures and halls may catch a red rim on their upper-left
  edges if the existing light system (`addLight` / `LIGHTS` in src/render/pix/pixrigs.js, spell
  light, `rimOf` in pix/bake.js) can do it cheaply; say so if it can't.
- Health bars, range rings and the HUD stay readable (check the draw order in draw.js).
- An icon for the forecast chip and level card: `PX.bloodmoon` in src/ui/WeatherForecast.jsx (a
  small red crescent or blood-red disc, same size and style as its neighbours).

## Don't
- Don't touch the engine (src/engine/*, src/data/*), and run no git that changes anything.
- No full-canvas getImageData per frame. Budget: about +1 ms a frame on a full board (~200 foes,
  12 halls) on this machine; measure and report it.

## Look at it
Dev server on http://127.0.0.1:5173 (the lead keeps it up). No browser pane: use
`node scripts/shoot.mjs "<url>"`, which saves through the page to `.shots/`.
- `/wx-lab.html?realm=bellmarsh&faction=hollow&wave=10&weather=bloodmoon:1&whole=1&rise=0&snaps=0,10,25,45&tag=bm_<n>`:
  the real engine and draw(); the moon rises at the first horn (+0 dark-free, +10 creeping in,
  +25 and on full). Also try `realm=sunkencauseway` and `realm=thronedust`.
- Shots go in `.shots/` with the prefix `bm_`. Scratch files in `scratchpad/bm/`.
- Look at a full board AND a close crop of halls and Risen (eyes, torchlight) at 2x.

## Report
What you built (files, functions), the measured cost, shot paths (before / creeping in / full,
plus crops), and anything NOT CHECKED or BLOCKED. Tool-call budget: about 90.
