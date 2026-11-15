# Tower buildings: the artists' brief (the lead is whichever Opus session briefs you)

The owner picked treatment B ("worked") for the tower BUILDINGS: today's designs redrawn in
the pixel sculptor (thin tinted line, one sun from the upper left, cast shadows, stonework as
TONE stone by stone, weathering and ivy, lit windows, torch and spell light on the stone).
The Archer hall is done and in the game; it is your worked example. You redraw ONE hall.

## Read first (in this order)
1. `CLAUDE.md`: "The tower BUILDINGS", "Several sessions at once".
2. `art/STYLE-GUIDE.md`: "The look", "Rules for halls (towers)", "The new halls: buildings in
   the pixel sculptor" (the contract, the kit, the rules, the labs).
3. `src/render/pix/halls.js` (the seam), `src/render/pix/hall-archer.js` (the worked example),
   `src/render/pix/hall-kit.js` (the kit), `src/render/halls/archer.js` (search for `const H =`
   and `if (H)`: the six small edits that wire a new building into a hall file).
4. YOUR hall's old painter `src/render/halls/<file>.js`, all of it: every form, every part,
   where the crew stand, what is baked and what is painted live, which numbers the engine
   shares (grep `src/engine/muzzles.js` and `src/engine/towers.js` for your hall).
   `.shots/hall_<kind>_before.png` shows all nine forms today (at rest, and mid-shot).

## The job
- Write `src/render/pix/hall-<kind>.js`: `BOX`, `build({ level, branch, rank4, seed, style })`
  -> `(back, front) => spec`, ALL NINE FORMS (levels 1-3, paths a / b, finals aa ab ba bb),
  each keeping its identity: the same parts in the same places as the old painter, the old
  palette, a player must still name each form at a glance. Coordinates: art pixels (two to a
  board unit) from the hall's ANCHOR (t.x, t.y), y down.
- THE CREW DECIDES THE BUILDING: never move a crew spot, a muzzle, a pivot or anything the
  engine reads. Build round the old numbers (x2 for art pixels).
- Never bake what moves. Flags, flames, sparks go in the spec's `live`; anything else your
  hall animates (an arm, a wheel, a beam, an orb, an aura) stays painted by the hall file,
  exactly as today. If a live machine part looks wrong on the new building, redraw it as
  `pixSprite` frames (see the Ballista's `siegeBow` in hall-archer.js) only if you have room
  in your budget; otherwise leave it and say so.
- Wire it into `src/render/halls/<file>.js` the way archer.js does: `H` from `hallPix`,
  `drawHallBack` in place of the old ground / body stamps and their live torch / window /
  pennant lights, the crew UNCHANGED, `drawHallFront` in place of the old front piece. The
  old painter must keep working untouched when `H` is null ("New sprites" off) and with
  `t.noFolk` (the build animation paints the hall without its people).
- A hall that mirrors itself to its target bakes with `hallPix(..., { flip: true })` and
  draws with `{ dir: -1 }` (halls.js), so the sun stays in the upper left.

## How to look at it
- `node scripts/hall-render.mjs hall=<kind> styles=B forms=1,2,3,a,aa,ab,b,ba,bb zoom=3 tag=<prefix>_forms`
  (no browser; writes `.shots/<tag>.png`; `crop=x,y,w,h`, `zoom=5`, `seed=1`, `crew=0`). Your
  spec's `crew` list lets it stand figures on the hall: `{ fig: "<name of src/render/pix/fig-<name>.js>", x, y, dir, clip, variant }`.
- In the game: open YOUR OWN browser tab (tabs_create), `http://localhost:5173/hallshot.html?kind=<kind>&tag=<prefix>_new&scale=2`
  (saves `.shots/hall_<kind>_<prefix>_new.png`: all nine forms through the real hall file, at
  rest and mid-shot), then `http://localhost:5173/raise-lab.html?how=build,level,branch&kinds=<kind>&tag=<prefix>`
  (the build animation; read its status line). Close your tab when done.
- Do 2-3 look-fix passes. Judge at 1x (what the player sees) as well as zoomed.

## Rules
- You own exactly TWO files: `src/render/pix/hall-<kind>.js` and `src/render/halls/<file>.js`.
  Edit nothing else. Need something in `hall-kit.js` or `halls.js`? Put a helper in your own
  hall file for now and name the request in your report. (`hall-kit.js` is imported by four
  other artists: do not touch it.)
- No git command that changes anything (no add, commit, stash, checkout, restore, reset).
- Do not stop, start or restart the dev server; do not run `npm run build` (the lead builds).
- Do not touch localStorage or the prefs (the tabs share them); never resize the window;
  never touch another agent's tab; never launch Chrome or apps from a shell.
- `node --check <file>` after every scripted edit: one syntax error breaks every page that
  loads the file, your teammates' included.
- Scratch files go in `scratchpad/<prefix>/` in the repo, shots in `.shots/` with your prefix.
- No em dashes in comments; write comments the way hall-archer.js does (what and why, plain).
- Budget: about 60 tool calls. If you are running out, stop adding and leave the hall file
  WORKING (old painter intact, `node --check` clean), then report.
- Spend your looks wisely: images cost far more than text. Look with `hall-render.mjs`
  (crop to the part you are fixing), at most 2 look-fix passes, and open the browser
  (hallshot / raise-lab) ONCE, at the end, to check the wiring. Read files in the parts you
  need, not whole long files twice.
- If your hall file already exists (an earlier artist was cut off), read it and its hall
  file's diff (`git diff src/render/halls/<file>.js`) first and carry on from there: keep what
  works, finish what is missing. Never start over.

## Your report (short)
The forms done; what you kept live and what you redrew; anything the engine reads that you
relied on; kit requests; weak spots you could not fix; the shot paths.
