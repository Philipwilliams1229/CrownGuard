# Effects Round 5: putting the owner's picks in the game (2026-11-18)

The owner's picks on "Crownguard Effects Concepts, Round 5" (concepts in `concept/fx-r5-*.js`; strips
`.shots/fxc_<row>_<col>.png`; brief `art/briefs/fx-round5.md`):

- **Fire on a foe: B** (the body's outline burns, small flames pop up at edge spots and go out, smoke
  trails, a warm ground pool and rim light). Replaces `burnSprite` (src/render/statusfx.js).
- **Raising the dead: B**, "but take out the flying rocks, and remove the lines from the ground where it
  comes out": three ribbons (violet, green, light violet) coiling ROUND the risen (behind him, then in
  front), the witch-fire ring on the ground split behind / front, motes off the top; NO clods, and the
  grave patch without its dark lines/roots. Plus "the goblin could use a little touch up on the undead
  look" (the bone-pale `revived` look, `boneify` in src/render/rigs.js).
- **Frost nova: B combined with C**, "the glass floor looks nice. Lessen the icicles somewhat, make them
  a bit more transparent": B's spikes erupting round the circle in sequence then shattering, FEWER of
  them and see-through, over C's lit glass floor and glaze (C's centre flash too if it sits well).

## Where it goes

- Ring effects: `drawRingFx` in src/render/rings.js, `case "raise"` and `case "frostnova"`; each has a
  GR layer (drawn under the figures) and an AIR layer (drawn over them). Wrapping round a figure needs
  the BEHIND half drawn before the risen body: the raise's GR layer is under every figure, so the back
  half goes in GR and the front half in AIR (check that this reads right with the rising foe, who is the
  body the effect is centred on: `fx.x, fx.y`). Foes flash white as a ring passes: src/render/ringflash.js
  (`frostnova: [500, 0.55, ...]`, by distance from the centre); if the spikes now erupt by ANGLE, make
  the flash follow the same order, or the foes flash before the ice reaches them.
- Bake, don't paint per pixel per frame (memo'd sprites per size / frame, as rings.js and statusfx.js
  do): older iPhones. Measure a frame cost before / after with many effects at once and report it.
- The status burn: `statusBurn` (statusfx.js) is one blit per burning foe today, called from fx.js
  `drawStatus`, after the figure (enemies.js ~line 181). B needs the figure's SILHOUETTE (its edge
  pixels per frame): derive it from the frame the foe is drawn with (see rigs.js `rigFrame`, `lookOf`,
  and how the "white" hit flash is made) and cache it per frame canvas (a WeakMap), never per draw.
  Light: `addLight(x, y, r, col, k)` (src/render/pix/pixrigs.js; draw.js clears and fills the list each
  frame, see how Dragonbreath / burning ground add theirs) gives figures in it a warm rim; a burning
  foe could add a small one (cap how many a frame). "Spell light" off (`prefs.spellLight`) must still
  look right.

## Checking

- The concepts lab paints TODAY with the game's own painters: `/fx-concepts.html?only=burn5` (or
  `raise5`, `frostnova5`) -> `.shots/fxc_<row>_today.png` is now YOUR game version; compare it with the
  owner's pick in the same row (`_B.png`, and `_C.png` for the nova). That is the main check.
- Then on the real engine: `shotlab.html` (CLAUDE.md, "The new sprites": `&set=` lays fields on the
  lab's foes, e.g. `burnUntil:9e9`), or a Free Play board in your own tab.
- Every frame, both facings, the zoom-1 (board size) look, a dark Hollow ground. Report anything weak
  or NOT CHECKED plainly (`.claude/agents/artist.md` standing rules).

## Who owns what (three artists at once)

- **Rings artist:** src/render/rings.js (`raise`, `frostnova` and the sprites they use) and
  src/render/ringflash.js.
- **Fire artist:** src/render/statusfx.js; a small, reported edit in fx.js / enemies.js / draw.js if
  the hook needs one (those are shared: keep it to a few lines).
- **Undead artist:** `boneify` (and only that) in src/render/rigs.js. The owner looked at the GOBLIN
  rising; every raised kind uses it (goblin, wolf, orc, ironclad, boar rider, troll, raised soldiers as
  wraiths do not), so check them all. Ideas: real bone structure read from the figure (skull face with
  dark sockets and the green eye-fire kept, jaw line), ribs only on the torso not stripes over the whole
  body, rags that keep a hint of the old cloth colour, a grave-green tint in the shadows. Show a before /
  after sheet of each raised kind (`hrd-lab.html?m=[["goblin",0.32,0,{"revived":true}]]` or the lab's
  `e.foe(f, "revived")`).

Rules: only your files; `node --check` after every edit (one syntax error breaks the dev server's page
for everyone); your own tab in the built-in browser, closed after; never resize the window, stop the
dev server, run git that changes anything, or search outside the repo. Scratch in `scratchpad/<you>5b/`.
