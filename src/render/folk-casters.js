// ============ FOLK: THE CASTERS ============
// The spire's mage and the warden's priest. Built from folk-kit.js;
// folk.js re-exports it.

// ---- the mage -----------------------------------------------------------------
// The spire's mage: an apprentice (bare-handed, the orb over his palm), then
// a staff-bearer, then the long-beard. `level` 1..3. The orb is drawn by the
// tower, at mageTip() — the orb's centre, in the fork of the staff's head.
//
// He is a caster who GATHERS, then RELEASES. Every pose is a set of joint
// targets; the arms are solved by the kit (bones keep their length, elbows
// fold the right way), the staff keeps its length and is always in a fist:
//   lean   the shoulders slide over the planted hem (+ toward the foe); the
//          head and the hat's point follow a little further
//   rise   the shoulders and head lift (a breath)
//   hand   the near (staff) hand; for the apprentice the conjuring hand
//   free   the far hand (drawn a shade darker, behind the staff)
//   ang    the staff's tilt from upright in degrees (+ toward the foe)
//   lift   the staff's foot this far off the walk (it stands on it at 0) —
//   above  — or, for a staff swung off the ground, its length above the fist
//   grip2  both hands on the staff: the free hand this far down it
//   orb    the apprentice's orb, from his hand
//   hat / hem / step   the hat's point and the hem trailing (+ back: they
//          lag a lunge, swing past it in the follow-through), a foot
//          stepping in under the robe's front
//   palm   the free hand open (the apprentice's near hand too when `push`)
// The firing cycle (MAGE_CYCLE, by the phase since the shot): strike (the
// staff driven at the foe, the body stepping into it, the free hand
// sweeping forward and down), follow-through (hat and hem swing past),
// recover, ready, three gathering frames (the free hand rises before the
// chest, palm to the orb; the staff lifts; the body leans back as power
// builds), then the wind-up — a small pull back — held until the shot.
// Old names still work: "charge" = the full gather, "cast" = the strike.
const STAFF_POSES = {
  idle: { hand: [5.8, -11.8], free: [-1.2, -8.2], ang: 3, lift: 0.3 },
  idle2: { lean: -0.2, rise: -0.5, hand: [5.8, -12.0], free: [-1.1, -8.7], ang: 3, lift: 0.3, hat: 0.3 },
  ready: { hand: [5.9, -12.0], free: [1.4, -10.6], ang: 4, lift: 0.3 },
  gather1: { lean: -0.3, hand: [5.9, -12.6], free: [3.4, -14.6], ang: 3, lift: 0.8, palm: 1 },
  gather2: { lean: -0.6, hand: [5.8, -13.2], free: [4.4, -17.2], ang: 2, lift: 1.3, palm: 1, hat: -0.2 },
  gather3: { lean: -0.9, hand: [5.6, -13.8], free: [4.9, -18.9], ang: 1, lift: 1.8, palm: 1, hat: -0.5, hem: -0.3 },
  windup: { lean: -1.7, hand: [5.0, -15.0], free: [4.0, -19.3], ang: -5, lift: 2.4, palm: 1, hat: -1.3, hem: -0.8 },
  strike: { lean: 1.4, hand: [9.6, -17.2], free: [5.2, -13.0], ang: 40, above: 5.6, palm: 1, hat: 2.2, hem: 1.6, step: 1.6 },
  follow: { lean: 1.1, hand: [9.8, -16.2], free: [3.6, -10.8], ang: 50, above: 5.4, hat: -1.2, hem: 0.8, step: 1.6 },
  recover: { lean: 0.5, hand: [7.4, -13.4], free: [2.2, -10.4], ang: 16, lift: 1.2, hat: -0.6, hem: -0.3, step: 0.6 },
  // Dragonbreath: the staff swung down (level), then braced in both hands
  // and levelled at the foe while the jet pours out of it
  level: { lean: 0.6, hand: [7.8, -14.6], free: [3.6, -13.2], ang: 38, above: 8, hat: 0.8, hem: 0.6, step: 0.8 },
  brace: { lean: 1.2, hand: [7.6, -15.6], ang: 66, above: 9, grip2: 4.4, hat: 1.6, hem: 1.4, step: 1.8 },
  brace2: { lean: 0.9, hand: [7.3, -15.4], ang: 66, above: 9, grip2: 4.4, hat: 2.0, hem: 1.8, step: 1.8 },
};
const HAND_POSES = {
  idle: { hand: [4.8, -11.4], free: [-1.2, -8.2], orb: [0.6, -2.6] },
  idle2: { lean: -0.2, rise: -0.5, hand: [4.8, -11.8], free: [-1.1, -8.7], orb: [0.6, -2.6], hat: 0.3 },
  ready: { hand: [5.6, -12.4], free: [1.4, -10.6], orb: [0.6, -2.7] },
  gather1: { lean: -0.3, hand: [6.0, -13.4], free: [3.4, -15.2], orb: [0.5, -2.9], palm: 1 },
  gather2: { lean: -0.6, hand: [6.0, -14.2], free: [4.0, -17.8], orb: [0.5, -3.0], palm: 1, hat: -0.2 },
  gather3: { lean: -0.9, hand: [5.8, -14.8], free: [4.7, -18.7], orb: [0.6, -3.1], palm: 1, hat: -0.5, hem: -0.3 },
  windup: { lean: -1.7, hand: [4.6, -16.0], free: [3.9, -19.2], orb: [0.8, -3.0], palm: 1, hat: -1.3, hem: -0.8 },
  strike: { lean: 1.4, hand: [10.4, -20.0], free: [5.0, -13.0], orb: [2.4, -1.3], palm: 1, push: 1, hat: 2.2, hem: 1.6, step: 1.6 },
  follow: { lean: 1.1, hand: [10.0, -17.6], free: [3.6, -10.8], orb: [2.0, -0.8], push: 1, hat: -1.2, hem: 0.8, step: 1.6 },
  recover: { lean: 0.5, hand: [7.6, -13.8], free: [2.2, -10.4], orb: [0.8, -2.6], hat: -0.6, hem: -0.3, step: 0.6 },
};
const LEGACY = { charge: "gather3", cast: "strike" };
const poseOf = (level, pose) => {
  const set = level >= 2 ? STAFF_POSES : HAND_POSES, nm = LEGACY[pose] || pose;
  return set[nm] || set[nm === "level" || nm === "brace" || nm === "brace2" ? "strike" : "gather3"];
};
const rad = (d) => (d * Math.PI) / 180;
// Where everything is for a pose (figure space, facing +x, feet at 0):
// shoulders, hands, the staff's foot and head, the orb. Labs read it too.
export const mageRig = (level, pose = "charge") => {
  const P = poseOf(level, pose);
  const lean = P.lean || 0, rise = P.rise || 0;
  const nsh = [2 + lean, -15.4 + rise], fsh = [-2 + lean, -15.4 + rise];
  const hnd = P.hand;
  let free = P.free, staff = null, tip;
  if (level >= 2) {
    const a = rad(P.ang), d = [Math.sin(a), -Math.cos(a)], len = level >= 3 ? 24.5 : 22.5;
    const below = P.lift != null ? (-P.lift - hnd[1]) / Math.cos(a) : len - P.above;
    const above = len - below;
    tip = [hnd[0] + d[0] * above, hnd[1] + d[1] * above];
    staff = { foot: [hnd[0] - d[0] * below, hnd[1] - d[1] * below], tip, d, a };
    if (P.grip2) free = [hnd[0] - d[0] * P.grip2, hnd[1] - d[1] * P.grip2];
  } else tip = [hnd[0] + P.orb[0], hnd[1] + P.orb[1]];
  return { P, lean, rise, nsh, fsh, hand: hnd, free, staff, tip };
};
export const mageTip = (level, pose = "charge") => mageRig(level, pose).tip;

