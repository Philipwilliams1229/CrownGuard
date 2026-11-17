# Scale pass: heroes taller, the Champion down to them, the ram back to size (2026-11-17)

The owner: "Heroes should be bigger than the normal soldiers. Grand champion should be the
same size as the heroes. Other scale issues from before like the siege ram persist." Asked
how, they chose "Redraw them taller" (not a blown-up sprite: pixels stay crisp, one art px
= 0.5 board px for every figure).

Read `art/briefs/figure-artist.md` (the shared figure brief: read-first list, how to look,
rules) and `art/STYLE-GUIDE.md` "The new sprites", "Arms and the head", "The joint kit".
You own ONLY the files your task names. Never run git commands that change anything.
Scratch in `scratchpad/<prefix>/`, shots `.shots/<prefix>_*.png`.

## Measured today (idle frame, art px, feet to top of head/helm)
garrison knight 44, paladin 44 | Aldric 48, Wren 48, Osric 40, Hale 51, Ysolde 46 |
Champion 69 | ram 62 tall, 102 long.
(`node scripts/concept-render.mjs fig=<name> clips=idle frames=0 ext=1` prints it.)

## Targets
- **Every hero: 56 art px** (+-2, crest/plume/hat brim included in the measure; Hale's
  halberd and Ysolde's staff are not). That is ~1.27x a garrison knight: a hero must read
  as bigger than any soldier at a glance on the board.
- **The Champion: 56 too**, down from 69 (he keeps his look: ivory and gold, crowned great
  helm, his weapon; only his size comes down to match the heroes).
- Build taller by the skeleton (`scaled(HUMAN, k, ...)` / the figure's own `K`), and grow
  what is stamped (heads, faces, helms, hats, weapons, shields) to match, redrawn by hand
  where a stamp would look thin or stretched. A head that stays the old size on a bigger
  body reads as a pinhead: keep each figure's proportions and face.
- Grow `BOX` to hold every frame of every clip (check `ext=1` on all clips).

## Do not break
- **Aldric's and Osric's attacks are owner-approved** ("ALDRIC IS PERFECT ... Same for
  Osric"): keep the same keyframes and timing, only bigger. Near arm never behind the head,
  weapon locked to the hand. Aldric and Wren's LOOK is approved too: same design, bigger.
- Every clip and sheet the game asks for stays, same names, same frame counts, same `hit`.
- Shot points the engine reads: Wren's `AIM` (fig-archer.js, `aimAt(CLIPS.attack, 0.62)`)
  must still sit on her bow at every aim after the change (it is derived, but check
  `marks`). Ysolde's staff tip is read by `stormStaffTip` in rigs-crown.js (a measured
  table, lead's file): report her new staff-head point per frame (`marks=1`) and the lead
  updates the table. Hale's halberd length `LEN` scales with him.
- Don't edit `pixrigs.js`, `rigs*.js`, engine or render files outside your own fig files.
  Report anything the lead must change.

## Report (short)
Old -> new height and BOX per figure; clips touched; any mark the lead must re-read; shot
paths of a before/after (idle + the attack's hit frame, `zoom=4`, cropped). Tool-call
budget: about 60. Stop and report if you hit it.
