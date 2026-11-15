# Ground, road and trees in look C: the artists' brief (the lead is the Opus session briefing you)

The owner picked look C ("bolder") for the board's ground and trees from the concept round
(CLAUDE.md, "The roster and scenery concept round"): richer saturation, bigger leaf masses
with bright flecks, deeper cast shadows and stronger highlights, grass in tufts and tone
patches, a road with pebbles and a worn edge. One change from the concept, in the owner's
words: "don't make the lanes in the road so obvious" (the concept's two rut lines and the
grass spine down the middle were too loud: keep ruts faint and broken, no spine).

The concept is code you can run and read: `concept/scenery.js` (look "c") and
`node scripts/scenery-render.mjs only=c zoom=3` (writes `.shots/scx_c.png`). It was hand-tuned
for the Greenwood on a small patch; your job is to carry its LOOK onto the real board's
painters, which serve every chapter and every board.

## Read first
1. `CLAUDE.md`: "The roster and scenery concept round", "Who does what", "Several sessions at once".
2. `art/STYLE-GUIDE.md`: "The look", "A chapter's own ground", "Water, roads and ground",
   "How to look at your work", and anything the section names about the file you own.
3. Your file(s), in the parts you need, and `concept/scenery.js` for the look C recipe.

## Rules of the job
- **Every chapter keeps its own ground.** The Greenwood, Iron Marches, Hollow fen and the Rime
  each have their own palette and pieces (`groundArt`, `scenery-iron/hollow/vale/rime.js`).
  Look C is a TREATMENT (saturation, shading depth, shape size, highlight strength, detail
  density), applied through each chapter's own colours, never the Greenwood's greens on a
  snowfield. Where a chapter has its own painter you don't own, leave it and say what it needs.
- **The engine reads none of this**, but the board does: keep every piece where it stands
  (positions, footprints, the road's width and centre line, what water, bridges, halls and the
  castle clip against). Change how things are painted, not where.
- **Performance:** the ground is baked once per board into a cached layer (`groundLayer`,
  world.js). Keep it baked: no per-frame cost added. Report the bake time before and after
  for one board (time it in your tab with `performance.now()` around the call, or say how
  you measured).
- **Weather and labs keep working:** fog, rain soak, puddles and floods read the road and
  ground; do not break their hooks.
- One sun, upper left. Pixel art: no blur, no smooth gradients across big areas.

## How to look
- Before you change anything, shoot the SAME four boards you will compare after, one per
  chapter (e.g. a Greenwood board such as `thornbrook`, an Iron board, a Hollow board and a
  Rime board; pick ones that show your part well), with `shots.html` in your OWN browser tab
  (style guide, "How to look at your work"), prefix your shot names, crop to your part.
- At most three look-fix passes. Judge at 1x (what a player sees) as well as zoomed.

## Rules
- Own only the files your task names. Need a change elsewhere? Report it.
- No git that changes anything; do not touch the dev server, localStorage or prefs; never
  resize the window; never touch another agent's tab; close yours when done.
- `node --check <file>` after every scripted edit (one syntax error breaks the board for
  every teammate).
- Scratch in `scratchpad/<prefix>/`, shots in `.shots/` with your prefix.
- No em dashes in comments; comment like the files you edit.
- Stay inside your tool-call budget; running short, leave the file WORKING and report.

## Report (short)
What you changed and how look C carries onto each chapter; before/after shot paths (one per
chapter); bake time before/after; anything another owner's file needs; weak spots.
