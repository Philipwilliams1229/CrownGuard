# Brief: Captain Hale's whirlwind (spin frames)

Owner, 2026-11-24: "can we make cpt hales first attack more like a whirlwind attack where he does 3 full
spins, same timing as now, but they hit 360 around him. new animation mayhaps."

The lead has done the engine (the Halberd Sweep strikes all round him, `full` in engine/heroes/hale.js),
the light trail round him and the plumbing (render/heroes/hale.js `pose`, pixrigs.js `clipFrame` /
`pixRec`). Until you draw the frames, the game shows stand-ins: the side figure's `sweep` frame 3 and the
front / back views' standing walk frame. Your job is the figure's spin frames.

## What to draw

He turns three full times, one turn every 520 ms, the halberd held OUT LEVEL in both hands at about waist
height, the blade leading (he faces where the blade is). `pose` shows each moment as one of three
figures, picked by where the blade is on the board:

| sheet the game asks | figure file | clip | frame 0 | frame 1 |
|---|---|---|---|---|
| `spin` (blade out to his side; mirrored by the board when he faces left) | `src/render/pix/fig-captain.js` | `spin`, n 2 | facing right, the blade out in front of him on the FAR side (a touch higher on screen, the far hand's side) | facing right, the blade out in front on the NEAR side (a touch lower, nearer the camera) |
| `spinFront` (the blade coming at the camera) | `src/render/pix/fig-captain-views.js` FRONT | `spin`, n 2 | facing the camera, the halberd pointed at the camera, its head swung toward SCREEN RIGHT | the same, its head toward SCREEN LEFT |
| `spinBack` (the blade going away) | `src/render/pix/fig-captain-views.js` BACK | `spin`, n 2 | his back to us, the halberd pointed away behind him, head toward SCREEN RIGHT (mostly hidden by his body: the haft and the blade's edge show past his side) | the same, toward SCREEN LEFT |

So one turn reads: side (far, near) -> front (right, left or left, right) -> side mirrored -> back -> ...
each frame on screen ~65 ms. Feet planted wide (a pivot stance), the far foot and near foot may shift a
little between quarters, weight low. The crest, cloak and tassel stream OUTWARD / behind the turn
(they lag), which is what sells the spin. The two frames of a pair are the same pose with the halberd
moved, not two different poses.

Keep everything that makes him Hale (fig-captain.js header: crested sallet, red crest, grey moustache,
spiked pauldrons, navy tabard and cloak, the halberd's crescent blade, hook, spike, red tassel). The
halberd is ONE size (fig-captain.js `LEN`); held level it reaches about as far as his `attack` frames'
blade. Pointed at / away from the camera it is foreshortened: draw the head and a short stub of haft,
not a full-length pole.

## The contract

- Add `spin` to `RAW` in fig-captain.js (it goes through `grow` like the rest; `n: 2`, `loop: false`,
  a `ms` of your choosing, the pose read by frame) and draw it with the existing `draw` (pose fields)
  if you can; add pose fields where the draw needs them (a level halberd may need its own grip, as
  `HAFT` / `wrist` cannot hold a pole level: if so, add a field, e.g. `p.level`, that sets the haft's
  angle directly, used ONLY by `spin`). Do not change any other clip's pixels (idle, walk, attack, sweep
  must bake identical).
- Add `spin` to the FRONT and BACK `CLIPS` in fig-captain-views.js (the views' `make(s)` reads the walk;
  give it a `p.spin` / `p.blade` branch for the level halberd). The walk views must bake identical.
- Box: `BOX` is 108 x 98 with the feet at (40, 86). The level halberd must fit inside it in every frame
  and both facings (the mirrored side frame too): widen the BOX's `w` / `ox` only if you must, and say so.
- The fx smear (fig-captain.js `fx`) only fires for `attack` / `sweep`; leave it so (the lead's trail
  draws the spin's light).
- Standing rules in `.claude/agents/artist.md` and the views rules in `art/briefs/views-artist.md` (shield
  / weapon clear of the FRONT face, the BACK depth stack: in BACK higher z is BEHIND him).

## How to look

- `node scripts/views-render.mjs` (read its header) for the views; `node scripts/concept-render.mjs` for
  the side figure's clips. Board size first.
- `node scripts/views-check.mjs only=captain` must pass (it checks the walk views; run it so you know you
  broke nothing).
- In the game: `hale-lab.html?fire=brace` on the dev server (http://localhost:5173) snaps the real engine
  mid-whirlwind; open it in your OWN tab in the built-in browser, close it when done.

Budget: about 60 tool calls. Report: what you drew, shot paths (`.shots/hws_*`), anything NOT CHECKED.
