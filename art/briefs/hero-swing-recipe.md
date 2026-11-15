# The heroes' swings: the advisor's recipe (Fable, 2026-11-15)

The owner's rule: the NEAR (viewer-facing) arm and what it holds may pass IN FRONT of the head,
never behind it. The FAR arm may go behind the head and body. Round 1 hid the raised near arm
behind the head ("not possible, looks broken"); round 2 swung it level behind him (about 86
degrees of backward shoulder extension, a real shoulder gives about 40), which reads as "the
sword held in an upside-down hand". Prototype (scratch, reads right): the advisor's copies of
fig-knight / fig-friar / fig-captain.js (see the lead for the path while it lasts).

## 1. Layers: static, no rules
- Aldric `layers(["head","sword","arm"], [], { z0: 5, step: 0.45 })`; delete the rules and the
  `behind` / `swBack` sums; call `KZ({})`.
- Osric `["head","mace","arm"]`, delete the rules, `behind`, `maceBack`.
- Hale `["head","halb","farHand","nearArm"]`, delete the rules, `behind`, `haftBack`; the far ARM
  leaves the list and is drawn at z 1 (section 3).
- Ysolde `["head","staff","arm"]`, delete the `behind` rule. Her pose stays (staff upright in front).
- Far arms at z 1 with `bias: -1`. `nb` is dead.
- No `zb`, no grip / blade split: the weapon tip never goes more than 0.95 rad behind upright, so
  the whole weapon is on the near side and may lie over the head.
- MUST lists: only `[["nearArm","notOver","eyes"]]`. If it fails on a lift / down-swing frame,
  tune that key (hx +0.3, or aN[0] -0.1), never add a flip.

## 2. The one-handed chop (Aldric, Osric)
- `aN[0]` stays within -0.7 .. 3.9 (never more negative); guard ~0.4 -> 3.7 lifts the arm up the front.
- Cocked: `aN [3.7..3.85, 0.8..0.82, 0]`, flip 0 (flip 1 juts the elbow back): fist at the back of
  the helm at ear height, elbow straight above the near shoulder.
- Open the face: `twist` -0.6..-0.8, `lean` -0.1..-0.15, `hx` +0.6..+0.7.
- The weapon continues the forearm, 20-40 degrees further toward upright, never folding back to
  the elbow: `sw` / `mc` -0.6..-0.95 cocked. Tip no further back than -0.95.
- Skip a face-crossing lift: hand at the chest below the chin, then already cocked.
- Down-swing: arm straight `[1.9, 1, 0]`, weapon lagging 35 degrees (`sw` 0.6): crosses the chin.

Aldric attack (n 12, ms 760, strike stays at t 0.5): replace keys 0.09, 0.3, 0.38, 0.45 with
```
{ t: 0.09, e: "out", p: { rx: -0.4, drop: 0.25, lean: -0.04, twist: -0.2, rise: 0.15, aN: [1.35, 0.62, 0], sw: 0.55, aF: [0.5, 0.75, 0], shield: -0.02, fN: [-2, 0], fF: [2.4, 0] } },
{ t: 0.18, e: "out", p: { rx: -1.1, drop: 0.55, lean: -0.1, twist: -0.6, rise: 0.35, hx: 0.6, aN: [3.7, 0.8, 0], sw: -0.6, aF: [0.9, 0.8, 0], shield: -0.08, fN: [-2, 0], fF: [2.4, 0] } },
{ t: 0.38, e: "io", p: { rx: -1.6, drop: 0.8, lean: -0.15, twist: -0.8, rise: 0.5, hx: 0.7, aN: [3.85, 0.82, 0], sw: -0.95, aF: [1.05, 0.8, 0], shield: -0.1, fN: [-2, 0], fF: [2.4, 0] } },
{ t: 0.45, e: "out", p: { rx: 0.4, drop: 1.0, lean: 0.05, twist: 0.1, rise: 0.2, hx: 0.6, aN: [1.9, 1, 0], sw: 0.6, aF: [0.5, 0.8, 0], shield: 0.1, fN: [-2.4, 0], fF: [4, 0] } },
```
Osric attack (n 12, ms 860, strike stays at t 0.56): the same body and `aN`, `mc` for `sw`, at
t 0.09, 0.19, 0.42, 0.48 (rx -0.4/-1.1/-1.7/0.5, drop 0.28/0.6/0.9/1.1, `flash: 0` on all four,
aF [0.6,0.85,0] on the first).

## 3. Hale
- Swap the leading hand: the near hand stays blade-side (`B(0)`), the far hand becomes the
  butt-side pivot at `B(-10)`: `grip: -10` everywhere it was 8. Both hands on the haft from frame 1
  to the last swing frame.
- Blend the far hand: `gp = lerp(B(grip), hipPoint, hip)`, IK side -1 when `hip > 0.5`; `hip: 0`
  on every attack / sweep key; guard and walk keep `hip: 1`.
- Far arm: ONE `px.limb([shoulder, fa.mid, fa.end], [2.2, 2.1, 1.8], STEEL_D, 1, { bias: -1 })` at
  z 1 under the torso; only the fist over the haft: `px.ellipse(fa.end, 1.7, 1.6, STEEL_D,
  Z.farHand, { noSeam: true })` + one GOLD cuff pixel (z 4.7 on the hip). Never in `layers` again.
- LEN 58, GRIP 20 unchanged; keep `hb` >= -0.5 while cocked back (the head leaves the BOX).
- Attack (n 12, ms 900, strike stays at t 0.52): replace keys 0.09, 0.3, 0.4, 0.46 with
```
{ t: 0.09, e: "out", p: { rx: -0.4, drop: 0.25, lean: -0.04, twist: -0.2, rise: 0.15, aN: [1.5, 0.7, 0], hb: 0.25, plant: 0, hip: 0, grip: -10, fN: [-2, 0], fF: [2.4, 0] } },
{ t: 0.18, e: "out", p: { rx: -1.0, drop: 0.5, lean: -0.08, twist: -0.6, rise: 0.35, hx: 0.6, aN: [3.6, 0.8, 0], hb: -0.3, plant: 0, hip: 0, grip: -10, fN: [-2, 0], fF: [2.4, 0] } },
{ t: 0.4, e: "io", p: { rx: -1.5, drop: 0.8, lean: -0.12, twist: -0.8, rise: 0.5, hx: 0.7, aN: [3.75, 0.82, 0], hb: -0.48, plant: 0, hip: 0, grip: -10, fN: [-2, 0], fF: [2.4, 0] } },
{ t: 0.46, e: "out", p: { rx: 0.4, drop: 1.0, lean: 0.05, twist: 0.1, rise: 0.2, hx: 0.6, aN: [1.9, 1, 0], hb: 0.7, plant: 0, hip: 0, grip: -10, fN: [-2.4, 0], fF: [4, 0] } },
```
  and `hip: 0, grip: -10` on the keys at 0.52, 0.64, 0.78.
- Sweep: `SW.grip` -10; frame 1 `{ ...SW, rx: -1.2, lean: -0.12, twist: -0.8, rise: 0.5, hx: 0.7,
  aN: [3.75, 0.82, 0], hb: -0.48 }` (no `hip: 1`); frame 2 `aN: [1.5, 1, 0], hb: 1.35`.
- Value separation (the lead's call, taken): near upper arm in `STEEL_D`, vambrace `STEEL`, near
  pauldron 4.6 x 3.8 -> about 4.0 x 3.3 (it also covered the rear eye in the guard).

## 4. Optional
The fist as an ellipse turned with the weapon (`px.ellipse(hd, 1.5, 2.1, MAT, z, { rot: a })`:
short axis along the grip) so the hand reads wrapped round the haft at every angle.

## 5. Hale's attack became a rising sweep (owner, 2026-11-15: "more of a sweeping motion instead of a chop")
Section 3's chop keys are superseded for the ATTACK clip (the grip, far arm and value notes
stand). Fable's design, ported whole: low to high, all in front of him, about 120 degrees. Guard
(haft 0.54) -> gather -> coil with the blade low before his feet (frames 2-4, haft ~1.9, hips back
and sunk, shoulders turned away) -> skim forward along the ground (5) -> strike rising through
the foe at chest height (6, `hit` 0.52 unchanged) -> high finish just past upright (7) -> recover.
Near elbow high (flip 1) through coil and strike, turning over through a straight-arm key at t
0.57; far hand on the haft frames 1-9 at grip -8 (-6 at the deepest coil and the finish). The
smear fires on a RISING blade for this clip. A flat horizontal sweep is impossible side-on with a
constant-length haft; over the top is the chop the owner rejected.
