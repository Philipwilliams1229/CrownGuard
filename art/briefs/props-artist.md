# Map props and the last old pieces: the artists' brief (the lead is the Opus session briefing you)

The owner, after the graphics pass: "do a sweep of other assets that are still in the old
style across the game". The sweep is `art/briefs/old-style-sweep.md`: read your section.
The old style: a thick 2-pixel near-black ring, flat fills. The new style (the halls,
figures, ground and castle): one sun from the upper left, a ONE-pixel outline tinted from
the material, stone block by block, wood with grain and end rings, cloth with folds as
tone, lit facets, real cast shadows to the lower right, each chapter in its own colours
(Greenwood C bold, Iron B worked, Hollow B worked, Rime C bold).

## Read first
1. `CLAUDE.md`: "The roster and scenery concept round" (the picks and the ground pass),
   "Who does what", "Several sessions at once".
2. `art/STYLE-GUIDE.md`: "The look", "A chapter's own ground", "The new halls" (the kit),
   and the section about your files.
3. Worked examples: `src/render/scenery-iron.js` `irspruce` / `ircrag` / `irwall` /
   `irmile` (props re-sculpted in `src/render/pix/pix.js` and baked into the decor sprite,
   footprints unchanged), `src/render/pix/hall-kit.js` (walls, roofs, timber, banners),
   `src/render/pix/hall-archer.js`.

## Rules of the job
- Change how a piece is drawn, never where it stands, its footprint, or what the engine
  or board reads (decor positions, hit boxes, water clipping, bridge decks, road width).
- Bake once (as decor sprites already are): no per-frame cost added. Moving bits (flags,
  smoke, water wheels, torches) stay live as they are, redrawn to match if you have budget.
- Keep each piece's identity (its parts, colours, what a player recognises).
- The old drawing stays under "New sprites" off (`prefs.newSprites`) where that is cheap;
  where a piece is baked into a board-wide layer and a switch would be costly, say so.
- Own only the files your task names; report anything you need elsewhere.
- No git that changes anything; don't start, stop or restart the dev server (5173); don't
  touch localStorage or prefs (in-memory flips only); your own browser tab, closed at the
  end; never resize the window. `node --check` after every edit. Scratch in
  `scratchpad/<prefix>/`, shots in `.shots/` with your prefix.
- Look: before/after crops of each piece on a real board with `shots.html` (style guide,
  "How to look at your work"); at most two look-fix passes per piece. Judge at 1x too.

## Report (short)
What you redrew (by the player's name for it), what you left and why, before/after shot
paths, bake time if it changed, weak spots.
