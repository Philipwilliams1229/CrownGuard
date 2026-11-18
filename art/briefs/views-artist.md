# Front and back views: the artists' brief (2026-11-17, owner: "lets get started on the rest")

Figures are drawn side-on. On roads that run up or down the board the owner wants each
character to face where it walks: its BACK walking up the screen, its FACE walking down.
The goblin is done and in the game (owner: "front and back views look great"). You draw the
same for the figures your task names. Side, front and back ONLY: no three-quarter or
in-between poses (the owner tried them and turned them down).

## Read first
1. `art/briefs/figure-artist.md` (rules, how to look, report) and `art/briefs/goblin-views.md`
   (the goblin's brief: the same job, read it as the detailed spec).
2. `art/STYLE-GUIDE.md`: "The new sprites: the pixel sculptor", "The kit and the rules the
   concepts settled", "Walking up and down the screen; the squeeze turn" (incl. "Front and back views").
3. THE WORKED EXAMPLE: `src/render/pix/fig-goblin-views.js` (read it whole: how it reads the
   side walk's pose for the feet, bob and arm swing, the front and back head grids, the hand
   sides, the variant) beside `src/render/pix/fig-goblin.js`.
4. Your figure's side file `src/render/pix/fig-<name>.js` in full, and its PIX entry in
   `src/render/pix/pixrigs.js` (its `variant`s: e.g. a look the same figure wears).
   Several figures are APPROVED by the owner (Aldric, Wren, mage, goblin, orc, necromancer):
   never edit any side file. Match it exactly: colours, proportions, gear, face, finish.

## What to make: `src/render/pix/fig-<name>-views.js` (you own only this, per figure)
```js
export const FRONT = { NAME: "<name>-front", BOX, BONES, draw, CLIPS: { walk } };
export const BACK  = { NAME: "<name>-back",  BOX, BONES, draw, CLIPS: { walk } };
```
- `CLIPS.walk` = the side figure's own walk clip (`{ ...SIDE.walk }`: the SAME n, ms and
  pose), so the game switches views mid-stride in step. Your draw reads the solved pose as
  the goblin's does (`F.sk`, `F.ph`); frame 0 = the same stride moment as the side's frame 0.
- `BOX` big enough for the widest view, `oy` = the side figure's `oy` (feet on the same
  line), `ox` at the body's centre. BONES = the side figure's.
- Every `variant` the figure has (handed in as `o.variant`) drawn in both views. Ignore
  "revived" and "white" (the game makes those from any frame) and `@<deg>` aim suffixes.
- Hands: facing the camera his RIGHT hand is on SCREEN LEFT; from behind on SCREEN RIGHT.
  Weapons and shields keep their hands. A two-handed weapon is held across the body.
- Same height and build as the side view; one sun upper LEFT of the screen in both views
  (they are drawn unmirrored); one-pixel tinted outline; cast shadows between parts.
- **Owner's rules (2026-11-17), checked on every figure:**
  1. FRONT: a shield never sits BEHIND the head or overlaps it. Carry it low and forward on
     its arm (its top below the chin), beside the body, so the head stays clear and in front.
  2. BACK: every weapon is STILL THERE, in the same hand (owner, 2026-11-17: "i didnt mean take
     them out completely ... be mindful of which body parts they would be hidden behind").
     Draw it at its true depth: the hand is at his side, so the part of the weapon that runs
     IN FRONT of him (toward where he faces, away from us) is hidden behind his torso, arm or
     cloak; the parts that stick out PAST his outline still show (a spear's shaft above his
     shoulder and below his fist, an axe head or blade past his hip, a pommel). Never delete
     a weapon. Never stand a blade up beside the head as if held backwards. A sword carried
     upright in front DOES peek over his right shoulder from behind (owner, second notes): a
     little of the blade's upper part shows above/behind the shoulder, the rest hidden by him.
  3. FEET STAY CONNECTED: in every frame of both views each foot joins its leg (no gap,
     no loose boot or dark blob below a hem); a lifted foot still hangs from its shin.
     Check every frame at zoom 4, not just frame 0.
  4. THE WEAPON IS IN THE HAND (owner, same day): in every frame of both views the fist
     closes AROUND the grip: the haft runs into the fist and out the other side (or ends in
     a pommel just past it), the fingers drawn OVER the haft. Never a weapon floating beside,
     above or behind a hand, and never a hand hanging empty under a weapon.
  5. SHOULDERS OUTBOARD (owner's notes, same day): in FRONT and BACK the shoulders and
     pauldrons sit OUT to the sides of the head and never slide over the face or the back of
     the head as he walks; widen the torso a little if they must. A weapon or hand held in
     front of him is drawn IN FRONT of its shoulder and arm, never behind them.
  6. ARMS FROM BEHIND (owner's notes): in BACK both arms hang at his sides and swing FORWARD,
     so what you see is the back of each upper arm and the parts in front of the torso are
     hidden by it. An arm must never look bent backwards, crossed behind the back, or like the
     FRONT view's hand pasted on (mirror the hand: from behind you see its back, thumb inward).
     His right arm is screen right, his left screen left.
- FRONT: the face is the read (eyes, brow, mouth, the figure's signature feature); the
  silhouette must say "this figure" at board size (an art pixel is half a board pixel).
- BACK: no face; the back of the head / helmet / hood with a seam, patch or detail so it is
  not one flat blob; the hair, cloak, pack, quiver or weapon that shows from behind; heels.
- The walk: legs a hip apart, each foot in turn lifts (toward us in FRONT, away in BACK)
  and plants; body bob and a small sway; arms swing forward and back, which from the front
  reads as hands rising and falling a little. Heavy figures plod, small ones bounce: follow
  the side walk's own character.

## Look at it
- `node scripts/views-render.mjs fig=<name> zoom=4 frames=0,2,4,6 tag=vw_<name>` (rows:
  side, FRONT, BACK; `variant=`, `rows=0,1,2`, `crop=x,y,w,h`). Also zoom 2 for the board read.
- The lead's lab: `http://localhost:5173/views-lab.html?fig=<PIX type>&z=2` walks it round a
  loop. You may open it ONCE at the end in your OWN tab (tabs_create; close it after).
- At most three look-fix passes per figure.

## Budget and report
About 45 tool calls a figure. Report per figure: what each view shows, variants handled,
the `BOX`, weak spots, shot paths. The lead wires the PIX `views`; do not touch pixrigs.js.
