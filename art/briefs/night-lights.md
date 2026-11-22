# Brief: a light on every hall from level 2 (2026-11-22)

Owner: "all towers have some kind of light source after hitting level 2, except for the assassins.
This doesn't mean take it away from the ones that already have it."

Read first: `art/STYLE-GUIDE.md` ("The new halls", light, one sun), `.claude/agents/artist.md` (standing
rules), CLAUDE.md "The Blood Moon" (the night look). The night lighting is DONE in code: every entry in a
hall spec's `lights` list (`{ key, x, y, r, col, a, k? }`, art px from the hall's anchor) is lit at night
by `src/render/pix/halls.js` (warm colours as fire, others as magic light). So a hall form "has a light"
when it DRAWS a light source (a lantern, torch, brazier, fire basket, hanging lamp, lit window...) AND
lists it in `lights` (and a flame, if it has one, in `live`, `kind: "flame"`).

## What to do
For each form below that has no light now, add one small, believable light source in the hall's own
material and style, where it reads at board size and does not cover the crew, their shot points
(engine/muzzles.js: the crew decides the building, never move a crew spot), the door or the flag:
- Look at how `hall-archer.js` does its wall torch (`torch()` art at ~line 87, the flame in `live`, the
  light in `lights`, key "torch", r ~19, col "#ffa040", a ~0.75) and copy that pattern. A hanging lantern
  (a small iron cage with a lit pane, `col` "#ffcf70") suits timber halls; a fire basket / brazier suits
  machines; a torch suits stone.
- Keep `r` 14-22 (the night caps warm lights at 24). Keep a light that already exists exactly as it is.
- Day look: the light must also look right by day (the torch flame burns by day too, as the archer's does).

## The forms still dark (level 2 and up; kinds and forms as hallshot / sun-halls name them)
- archer: 2 (hall-archer.js line ~247 excludes `level === 2 && !br` and the level-1 `post`: level 1 may
  stay dark; give level 2 its torch if the art allows, else a lantern)
- knight: 3b, 3ba, 3bb (the green path)
- catapult: 2, 3, 3a, 3aa, 3b, 3ba, 3bb (3ab already has one: keep it)
- spiker (Bladewheel): 2, 3, 3a, 3aa, 3ab (3b, 3ba, 3bb already have a brazier)
- gunpowder (Powder Works): 2, and any of 3, 3a, 3aa, 3b, 3ba, 3bb whose door lamp reads too weakly
- falconry: 3aa (the nest form)
- riverwatch: 3aa (the mast form)
- band (King's Band): 2, 3, 3a, 3ab, 3b, 3ba (3aa and 3bb already lit)
Level 1 may stay dark. The Covert (assassin) is exempt: don't touch it.
Verify by looking: some of the above may have a light the sheet hid; if a form truly reads lit, leave it.

## Look at it
Dev server on http://127.0.0.1:5173 (the lead keeps it up). No browser pane: `node scripts/shoot.mjs`.
- Night, every form of your kinds:
  `node scripts/shoot.mjs "/night-halls.html?tag=<you>&kinds=catapult,spiker" "new Promise(r=>{const t=setInterval(()=>{if(window.__done){clearInterval(t);r('ok')}},300)})" 800`
  -> `.shots/nighthall_<tag>.png` (one row a kind, nine forms).
- Day: `/hallshot.html?kind=<kind>&tag=<you>` -> `.shots/hall_<kind>_<tag>.png`.
- Every new light must read at board size in the night sheet; nothing may cover a crew member.
- `node --check` every file you edit.

## Report
Per kind: which forms got what (file, line), before / after shot paths (night and day), anything NOT
CHECKED. Edit only the hall files you were given. No git that changes anything.
