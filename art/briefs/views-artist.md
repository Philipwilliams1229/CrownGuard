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

## The BACK stack (2026-11-17, the advisor's diagnosis of "arms folded behind the back")

The owner kept seeing arms "folded / snapped behind the back" in BACK views. Cause: every BACK
view reused the side/front depth stack. In pix.js higher z is nearer the camera, and in BACK the
camera is BEHIND him: whatever is drawn over the torso is physically behind his back. The side
view's "near arm" kept its high z and `cast: 2`, so it lay on his back. pix.js has no inner
outline: parts read as separate only through a cast shadow, `edge: true` and the overlap rim, all
of which fire when the z gap is over 0.2 and all of which say "this lies on top".

**Rule 0.** In BACK, higher z = further BEHIND him (nearer us). Never share arm, hand or weapon z
between FRONT and BACK: write a BACK stack.

| z (BACK) | what |
|---|---|
| 1.0 | everything carried in a hand: weapon, staff, bow, lance, strapped shield. `edge: false`, `cast: 0` |
| 2, 3 | legs |
| 3.6 | both fists: radius 1.5 or less, ~1 px lower than FRONT, no highlight, no thumb dot; over the weapon, under the cuff and hip |
| 4.0 | torso, tabard, robe |
| 4.3 | BOTH arms at the same z, `cast: 0` (the 0.3 gap gives a dark rim against the torso, no shadow on the back) |
| 5.0+ | what lies on the back or shoulders: cowl, aventail, pauldrons, cloak, hair, quiver, slung shield, scabbard; its rim `edge: true` so the arm comes out from under it |
| 6.0 | head |

**Arm geometry.** Shoulder at ±S, elbow x at or outboard of the shoulder, hand x at or outboard
of the elbow less 0.3. No arm pixel inboard of (torso edge minus arm radius); never angle a forearm
across the back. One `limb()` per arm. A free arm swings in y only (~1.2 px): forward = the hand
rises and half-hides under the cuff/hip; back = it drops ~1 px. No x travel, no z flip.
**Held weapon/staff in front.** The shaft passes through the fist at the hand's x. From behind:
shaft below the fist, the fist, the sleeve hiding the shaft up to the shoulder, then shaft again
above the shoulder. A forearm reaching forward (a staff held out): shorten it to 60-70%, elbow
outboard, only a sliver of fist. **Upright weapon over the shoulder:** shaft vertical at the hand's
x, at least 1 px outside the head's columns, emerging from behind the shoulder/pauldron. A sword
peeks its upper blade over the right shoulder (owner); short weapons otherwise are a stub down-
forward below the fist plus a pommel. **Bow upright:** 1.5 px outboard of the hand, belly a thin
curve outside the arm, grip under the fist, string inboard and mostly hidden. **Shield** on the left
arm (screen left from behind): z 1.0, arm, pauldron and trunk drawn over it; only the 2-4 px past
his outline show (dark inner face, rim, no emblem); move its centre inboard if more shows. Only a
shield slung ON the back goes in the 5.0 layer, whole.
**Light.** Sun upper left in both views. Drop the "far arm `bias: -1`" habit in BACK (if one arm
is darker it is the screen-right one). No `cast: 2` on arms; shoulder gear keeps `cast: 1`.
**pix.js notes.** z gaps under 0.2 read as one surface. A poly/ellipse/stamp that hides something
gets no seam line, so a weapon pushed behind the body can look soft: put `edge: true` on the
occluder's rim rather than pulling the weapon back on top. `edge: true` on hafts/bows/staffs means
"lies on top": off in BACK.
**Check at zoom 4, every frame:** no skin or sleeve pixel on the torso's interior; no shaft crossing
a shoulder, cloak or head (except the deliberate over-the-shoulder peek); the weapon visible above
and/or below the body.
Worked proofs (advisor's scratch copies): scratchpad/adv/fig-halberdier-views.js, fig-fieldbow-views.js
(scratchpad/adv/ in the repo: the recipe applied, rough).

## One weapon pose (2026-11-18, the owner: "weapons always stay in the same positions throughout the three")

The advisor's rule: **a weapon has ONE 3D pose, read from the side walk clip; FRONT and BACK are
projections of it, never a new carry.** This supersedes rule 2's "never stand a blade up beside
the head" and every "hang it head-down from behind" habit: an upright weapon stays upright in all
three views (from behind it rises past the shoulder, occluded by the pauldron and arm up to the
shoulder). Upright weapons can be identical in all three views; slanted and level ones are the
SAME POSE, not the same picture: from the front they point at us (short, head big), from behind
they are in front of him and show past the shoulder.

Read per frame from the side file (`F.sk`): `a` = the weapon's angle from straight up, + forward
(forearm angle `atan2(hdN.x - eN.x, -(hdN.y - eN.y))` + the side file's GRIP + clamped wrist;
import the side file's angle helper where exported, else copy its GRIP with a comment; files that
measure from +x: a = la + PI/2); the hand HEIGHT (`hdN[1]`: a chest-high fist stays chest-high in
both views); the side file's own lengths L (fist to tip) and B (fist to butt). Damp the swing
(`damp(aFrame, aMean)` 0.35) so a big walk swing doesn't pump the head.

Use the shared helper **`src/render/pix/carry.js`** (`carry(a, view, { rs, hand, len, butt, K,
splay, floorY })` -> `{ at(f, s), dir, fore, near, zTip, zButt, cls }`): it projects (forward = down
the screen in FRONT, up it in BACK, K 0.5), snaps |a| <= 0.35 rad to exactly upright, adds up to
0.5 rad of outboard splay when the weapon would read end-on, clamps to the ground, and gives the
z: BACK far side 1.0 (the BACK stack), BACK near side 4.6 (over the arms, under back gear), FRONT
near side on top (over its own arm and shoulder), FRONT far side under the legs. Draw the weapon as
two segments, tip side and butt side, split at the fist; the fist closes over the haft (rule 4).
The HEAD (axe head, club end, blade tip, lance head and pennon) is never foreshortened: full
side-view size, only the haft shortens (build head polygons with `head(L, d, s)`, L the fist-to-tip length in art px: unforeshortened offsets from the tip; `at(f, s)` alone squashes a head seen end-on). Worked examples: fig-orc-views.js (slanted axe), fig-ironclad-views.js (upright sword), fig-cavalier-views.js (couched lance). K 0.5 and damping 0.35 were checked on the pilots.

Hard cases: slanted/level in FRONT (an axe at 60-90 degrees): the end-on glyph, haft 0.4-0.5 L
down-and-outboard, full-size head clear of the face. Couched lance FRONT: shaft down-and-out with
~15 degrees of splay over the horse, at least three bands, head and pennon full size; BACK: the
same splay, rising past his shoulder beside the helm at z 1.0, a short butt stub below the fist.
Low forward club (the troll's walk points it FORWARD, it is not dragged): FRONT toward us, its head
on the ground in front of his foot over the shin; BACK hidden behind the leg, splayed so the head
clears the leg by 4-6 px. Truly dragged weapons (a < 0): mirror case. Check the measured angle
before calling anything "dragged". Drop "a two-handed weapon is held across the body": a second
hand goes on the haft only where the side walk has one.

**The "not held backwards" test, every frame:** for a forward weapon in BACK the tip side is never
below the fist, never drawn over the body, never edged or cast. In FRONT the tip is the nearest
thing, never behind his legs. The approved goblin's knife stays as it is unless the owner asks.
