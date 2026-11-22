# The overhaul: a CONCEPT round (2026-11-22, owner request)

The owner saw the night's scenery and water upgrade side by side with the old game and said:
"I was hoping for more of an 'overhaul' like I had said. These are incremental upgrades at best. I
was hoping for upgrades across the board for things like rocks and stones, puddles, rivers, lakes,
grass, trees, decorations, etc. Dont be afraid to change things more radically to fit in with our
new standard of graphics. Especially the bridges, they need a good rework. And how those rivers
interact with the bridges, feel free to repath the rivers to make them make more sense. About
water, feel free to change the shore shapes, river widths (wider only, dont make any smaller
streams) add some more larger puddles to maps, etc. I want you and your team to deliver some
impressive results. Want to propose me some changes for water, trees, etc? the big main features?
we can nail down a style direction and go from there."

So this round BUILDS NOTHING INTO THE GAME. Each artist proposes THREE clearly different, bold
directions (A, B, C) for one big feature, as pictures the owner can choose from. The owner then
picks, mixes ("A's water with C's banks") and we build.

## What a good concept is

- **Bold.** The last pass failed by being careful. If your option could be mistaken for the game
  as it is today (`.shots/preview-upgrade/*-2after.jpg`), it is not an option. Change shapes,
  sizes, proportions, structure: a river twice as wide, cut below the land with an earth bank you
  can see the face of; a bridge with real arches and height; trees half again as big with trunks
  and layered canopies; land with terraces and little cliffs. Each of A / B / C should be a
  different IDEA, not three strengths of one idea; say in one line what each idea is.
- **Still this game.** Pixel art at the board's scale (an art pixel is half a board unit; a soldier
  is ~22 art px tall, a hall 60-110), tinted one-pixel lines, one sun (upper left at noon), the
  chapter palettes, readable at BOARD SIZE on a phone: the road, the halls and the foes must stay
  the clearest things on screen. The new standard to match is the pix-sculpted halls and figures
  (`art/STYLE-GUIDE.md` "The new sprites", "The new halls") and the time-of-day lighting
  (`src/data/sun.js`): show at least one option at golden hour or sunrise so the owner sees it
  take the light and throw a shadow.
- **Buildable on Canvas 2D.** No WebGL. Heavy pixel work at bake, a frame only blits sprites,
  scrolling tiles and frame strips. For each option give a one-line cost guess (bake / per frame /
  memory) and what it would need from the engine (wider rivers and new shores change where halls
  can stand and where the River Watch rows; repathed rivers change the bridges: say so plainly).
- **Shown in context.** Not a sprite on grey: a patch of a real board (about 420 x 280 board units
  drawn at 2x, so ~1680 x 1120 px, or two smaller scenes) with the road, a hall and a few figures
  for scale. You may import the game's own painters for the surroundings (ground, road, halls via
  `src/render/pix/halls.js`, figures via `src/render/pix/bake.js`) and paint your feature new on
  top; or paint the whole patch yourself. Include TODAY (the current game's version of the same
  patch) as the first panel, then A, B, C: four panels per scene, same framing.
- **Motion where it is the point** (water, foliage sway, flags): also save a short frame strip
  (4-6 frames side by side) or describe the motion in one line per option.

## Where concepts live

- Your painter: `concept/overhaul-<feature>.js` (ES module; no edits to anything under `src/`).
- Your lab page: `overhaul-<feature>.html` in the repo root: it draws the panels and saves PNGs
  through the dev server (`await fetch("/__shot?name=ovh_<feature>_<scene>_<option>", { method:
  "POST", body: canvas.toDataURL("image/png").slice(22) })` writes `.shots/<name>.png`; see
  `sun-lab.html` for the pattern). One PNG per panel, named
  `ovh_<feature>_<scene>_<today|A|B|C>.png`, each at most 1680 x 1120.
- A notes file `concept/overhaul-<feature>.md`: for each option: its one-line idea, what is
  different from today, the cost guess, what the engine would need, and its weak spots, honestly.

## Working rules

- Read CLAUDE.md "Several sessions at once". Never run git commands that change anything. Never
  search outside the repo. Edit only your own concept files. `node --check` your module after
  every edit (a syntax error breaks the shared dev server for everyone).
- Dev server: http://localhost:5173 (do not restart it; if it stops answering, say so in your
  report and stop). Open YOUR OWN tab (built-in browser `tabs_create`, then `navigate` with that
  tabId); never touch other tabs; close yours at the end. If `tabs_create` is refused (the browser
  caps tabs at about 9), try again a little later a few times; do not work blind: a concept nobody
  has looked at is worthless.
- LOOK at every panel you save (Read the PNG; crop with `sips -c <h> <w> --cropOffset <y> <x>` if
  needed) at full size AND shrunk to board size (`sips -Z 840`), and fix what reads badly. Three
  look-fix passes at least. Compare A / B / C: if two look alike, replace one.
- Disk space is tight: delete PNGs you no longer need. Budget: about 110 tool calls.
- Report (short): each option's idea in a line, the PNG paths, cost and engine notes, weak spots,
  and which option YOU would pick and why.
