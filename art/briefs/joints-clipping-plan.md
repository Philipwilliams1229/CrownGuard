# Rough joints and clipping: the advisor's plan (Fable, 2026-11-15)

The owner: "Some joint connections look rough, particularly on the elephants, and other large
guys ... a result I imagine of different sections each getting their own shading / colouring
treatment. If we can make it consistent all the way down I'm sure that would look better."
And: "a pretty common clipping issue. I've seen it with shields, eagle's wings, bow and arrow
draws, I'm sure there are more."

Prototype of the joint fix on the mammoth (scratch, works): scratchpad/fbj/pix2.js (`group()`,
`_put(..., depth)`); renders .shots/fbj_mammoth_fixA0.png (before), fbj_mammoth_fixA.png (legs
welded), fbj_mammoth_fixB.png (weld + thigh hair as tone strokes).

## 1. Rough joints: root cause (the owner's guess is right)
The outline is NOT the cause (`resolve()` inks only the outer silhouette). It is shading:
- Each primitive is lit as its own solid: a capsule's normals run across its own axis, an
  ellipse is a ball, so the light band restarts at every segment; a leg capsule over the body
  reads as a tube pasted on, its round end cap showing as a disc.
- Cast shadows and `edge` fire between parts of the same creature: any pixel with a different
  `pid` and z more than 0.2 higher drops a 1-2 px shadow (the mammoth's near legs, z 12 over a
  body at z 4, ring themselves with a dark crease).
- Per-part material and bias: the mammoth's `leg()` lays a `SHAG` capsule on the thigh with a
  different ramp, `bias - 0.5`, `floor: 1` and its own light: a near-black sausage with a hard
  round cap at the knee. Far limbs get a flat `bias: -1` per segment.
- Mismatched radii at joints: the frost giant's arm 6.2 -> 5 then 4.8 -> 5.6 reads as a ball
  at the elbow.
Renders: .shots/fbj_mammoth_walk.png, fbj_mammoth_legs.png, fbj_frostgiant.png, fbj_troll.png.

## 2. Clipping: root cause (a kit gap, not per-figure mistakes)
Every primitive has one constant z (a bare number); no named layers; no way for a part to pass
from behind to in front along its length; order changes are hand-written flips on a pose flag,
which pop.
- Shield vs arm and weapon: the levy's shield is fixed at z 8.5, the spear / near arm jump
  between 7/8 and 8.6/8.9 on `p.over > 0.5`: mid-thrust the shaft is behind the shield while
  its hand and head are in front; in the walk the shaft vanishes behind the shield. The
  huscarl's axe lies over the shield on recovery. (.shots/fbj_levy.png, fbj_huscarl.png)
- Wing vs body: `wingOf(W.near, false, 8)` puts the whole near wing on one layer and the far
  wing at z 1 for every pose: upstrokes cut the wing root with the cape and saddle edges,
  downstrokes slab it over the thigh and tail. (.shots/fbj_eagle.png)
- Bow / string / arrow vs head and hands: z chosen for aim 0, then the bow and arms rotate
  with `@deg` and the order never changes: at -40 the upper limb goes behind the hood and the
  string and arrow cut across the face; at +40 the draw arm pastes over the hood and the
  string hides behind the tunic. (.shots/fbj_bowman_-40.png, _0.png, _40.png)
- Unconfirmed: in the bowman's `shoot` at -40, frames 7 and 9 show the bow back near vertical
  while +40 stays rotated: the aim weight may drop unevenly after the loose.

## 3. The fix
### Kit (src/render/pix/pix.js, small helpers in rig.js / beast.js), ALL OFF BY DEFAULT so
### untouched figures stay pixel-identical
1. `px.body(id)` + a `weld: px` option: shapes in one body share a `pid` (no cast / edge on
   each other); a welded shape blends its normal and bias into the same-body pixel beneath it
   over `weld` px from its rim. Silhouettes, materials, z unchanged. (~12 lines in the
   prototype.)
2. `px.limb(points, radii, m, z, { weld, weldRoot })`: one chain, one part, a shared radius at
   each joint, welded segments; `weldRoot` merges the first segment into the body. beast.js
   gets `legChain(l)`, bipeds `armChain` / `legChain`.
3. `wrap: true` on a shape: changes the material (fur, bracer, mail sleeve) but keeps the
   normal and `pid` of what it lies on. For shag prefer tone strokes or wrapped locks.
4. Depth varying along a part: `capsule(..., { zb })` runs z from a to b; `poly` takes
   `zOf: (x, y) => z`. An arm can leave the shoulder behind the chest and arrive in front at
   the hand; a wing can run from behind the rider at the root to in front at the tip.
5. Named layers: `const Z = layers(["farArm","bowFar","torso","head","bowNear","nearArm",
   "string","arrow"], rules)(pose, aim)`, rules as plain data, e.g.
   `{ when: (p, aim) => aim < -15, put: "bowTop", above: "head" }`; the bow split into upper
   limb, grip and lower limb so rules can address each.
6. A `tag` buffer: `px.tag("shield")` labels every pixel that follows (bake time only), for
   the audit.

### Per-figure checklist
1. Skin and body primitives in one `px.body`; limbs with `px.limb` + `weldRoot` into the
   torso or barrel; radii match at joints.
2. Hair, fur, armour on a limb: `wrap` or tone strokes, never an independently lit shape of
   another ramp.
3. No `cast` or `edge` between parts of the same body (keep them for weapons, shields, riders).
4. Far limbs keep `bias: -1` on the whole chain, not per segment.
5. Replace bare z numbers and `? :` flips with `layers()` + rules; `zb` where one part must
   cross another.
6. Geometry, `marks`, `AIM`, `BOX` untouched (the engine reads them).

### Order
1. Kit + audit script; prove every figure byte-identical with the new options off.
2. The mammoth as the worked example; show the owner before / after.
3. Frost giant, troll, amalgam, crypt, Hollow King, Marshal, Rime Jarl, champion, then the
   quadrupeds (cavalier horse, boar, wolf).
4. Bows: one shared layer rule set for bowman, fieldbow, bonearcher, tested -70..+70; Wren
   (fig-archer) last and only with the owner's OK (an approved figure).
5. Shields: levy, garrison, thrall, huscarl.
6. Eagle wings.
7. Sweep the remaining figures by the audit's ranking.

## 4. Verification
- Eyes: `node scripts/concept-render.mjs fig=... clips=... frames=... zoom=8 crop=...` before
  and after; bows with `variant=@-40|@0|@40` and the +-70 extremes; the eagle via
  scratchpad/fbj/render.mjs mod=bird-eagle (or add `mod=` to concept-render). Then shotlab.html
  on the board, and pix-lab.html green.
- Automatic, to build: `scripts/pix-audit.mjs` over every figure / clip / frame / aim:
  a seam score (adjacent same-body pixels differing by 2+ tones, or a cast / edge fired between
  two parts of one creature), ranked; layer rules per figure (`MUST = [["nearHand","over",
  "spear"], ["string","notOver","face"], ["shield","visible",0.5]]`) from the tag buffer; and a
  regression hash of every untouched figure's frames plus `marks=1` output identical.

## 5. Risks
- Engine reads (`marks`, `AIM`, `BOX`, foot / tip) come from geometry: untouched if checklist
  item 6 holds; the audit's marks diff enforces it.
- Performance: weld costs a few multiplies per overlapping pixel at bake time; layers nothing
  at run time; the tag buffer one Int16Array per bake.
- Looks: big figures read softer at shoulders and hips (keep weld 3-5 px, at the root); the
  mammoth's thigh shag goes from a dark block to strokes (show the owner). Approved figures
  (Aldric, Wren, mage, goblin, orc, necromancer) change only with a before / after shown.
- Cache: aim-dependent layer rules are covered by the variant string in the bake key.
