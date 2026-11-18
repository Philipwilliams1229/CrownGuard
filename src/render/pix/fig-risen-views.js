// ============ the Risen seen from the FRONT and from BEHIND ============
// Same figure as fig-risen.js (bone, a purple rag at the hips, a pitted sword in the RIGHT hand, a round
// wooden shield with an iron boss on the LEFT arm), drawn walking toward the camera (FRONT, s = +1) and
// away from it (BACK, s = -1), unflipped, sun upper left. Pattern of fig-goblin-views.js: one drawer `make(s)`;
// the walk keeps the side clip's n / ms / pose and reads feet and bob from the solved skeleton.
// FRONT: skull with its teal-lit sockets, collar bones, the cage of ribs, the sword up beside him on screen
// LEFT, the shield face-on on screen RIGHT. BACK: the skull's back with its sutures, the spine and shoulder
// blades, a cleft in the rag, the shield's back (planks, strap) on screen LEFT, sword hand on screen RIGHT.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-risen.js";

const BONE = mat("#e0d8c4"), RAG = mat("#4a3a5e", { contrast: 0.9 });
const WOOD = mat("#7a5c3c"), IRON = mat("#9a968a", { contrast: 1.2 }), DARKM = mat("#3a3228");
const GAP = flat("#6a604c"), SOCK = flat("#15121a"), EYE = flat("#7ce0b8", { emis: true });
const LEG = { S: { m: BONE }, s: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 }, N: { m: BONE, fix: 1 }, e: { m: SOCK }, E: { m: EYE }, c: { m: BONE, fix: 0 } };

// FRONT skull: two sockets lit teal, the nasal hole, a row of teeth over the jaw. 11 wide, centre column 5.
const FRONT_H = [
  "...SSSSS...",
  "..SSSSSSS..",
  ".SSSSSSSSS.",
  ".SeeSSSeeS.",
  ".SeEsSsEeS.",
  ".sSeeSeeSs.",
  "..sSSNSSs..",
  "..sTjTjTs..",
  "...jTjTj...",
  "....jjj....",
];
const BLINK = FRONT_H.map((r, i) => (i === 4 ? ".SeeSsSeeS." : r));
// BACK skull: the dome, a sagittal seam, a cracked patch, the nape and the first bones of the neck.
const BACK_H = [
  "...SSSSS...",
  "..SSSSSSS..",
  ".SSSSsSSSS.",
  ".SSScsSSSS.",
  ".SScSSSSSS.",
  ".SSSSsSSSS.",
  "..sSScSSs..",
  "..sSSsSSs..",
  "...sjSjs...",
  "....jSj....",
];
const FWD = 0.4, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

const make = (s) => (px, F, o = {}) => {
  const rs = -s, ls = s;                                     // screen side of his right (sword) and left (shield)
  const { sk, ph } = F, p = sk.p;
  const sx = rs * 0.7 * Math.sin(ph * TAU), hx = Math.round(sx * 0.6);
  const chestY = sk.C[1], hipY = sk.P[1], hy = Math.round(sk.N[1]) - 1;
  const vx = cl((sx - rs * 0.7 * Math.sin((ph - 0.09) * TAU)) * 1.3, -2, 2);
  const a = Math.cos(ph * TAU);

  // ---- the shield (his left arm), carried before him: face-on in FRONT, its back from behind
  const shc = [ls * 8 + sx, chestY + 6.6 + a * 0.5 * ls * rs * -1];
  const zs = s > 0 ? 6.5 : 3.2;
  px.part();
  px.capsule(ls * 4.6 + sx, chestY + 0.8, 1.2, ls * 6.6 + sx, chestY + 4, 1.05, BONE, zs - 0.2, { bias: -1 });
  px.capsule(ls * 6.6 + sx, chestY + 4, 1.05, shc[0], shc[1], 0.9, BONE, zs - 0.2, { bias: -1 });
  px.part(); const sid = px._pid;
  px.ellipse(shc[0], shc[1], s > 0 ? 3.9 : 3.5, 4.8, WOOD, zs, { round: 0.75 });
  px.toneLine(shc[0] - 1.4, shc[1] - 4.2, shc[0] - 1.4, shc[1] + 4.2, -1, sid);
  px.toneLine(shc[0] + 1.3, shc[1] - 4.2, shc[0] + 1.3, shc[1] + 4.2, -1, sid);
  px.part();
  if (s > 0) { px.ellipse(shc[0], shc[1], 1.3, 1.3, IRON, zs + 0.06, { cast: 1 }); }
  else {
    px.line(shc[0] - 3, shc[1] - 1, shc[0] + 3, shc[1] - 1, DARKM, zs + 0.06, { cast: 0 });       // the strap
    px.line(shc[0] - 3, shc[1] + 2, shc[0] + 3, shc[1] + 2, DARKM, zs + 0.06, { cast: 0 });
    px.dot(shc[0] - 2, shc[1] - 3.4, IRON, zs + 0.08); px.dot(shc[0] + 2, shc[1] + 3.6, IRON, zs + 0.08);
  }

  // ---- legs: bone, a knobbed knee, forward is down the screen (front) or up it (back)
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * 2.6, fy = -1.9 + s * f[0] * FWD - lift * 0.9;
    const hp = [hx + side * 2, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 1, (hp[1] + fy) / 2 - lift * 0.4];
    const b = side === rs ? 0 : -1;
    px.part();
    px.capsule(hp[0], hp[1], 1.1, kn[0], kn[1], 0.9, BONE, z + lift * 0.05, { bias: b });
    px.capsule(kn[0], kn[1], 0.9, fx, fy, 0.8, BONE, z + lift * 0.05, { bias: b });
    px.ellipse(kn[0], kn[1], 1.4, 1.3, BONE, z + 0.02 + lift * 0.05, { bias: b });
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.2, fy + 0.9, 1.5, 1.1, BONE, z + 0.3 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 0.7, 1.3, 1, BONE, z + 0.3 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 2.2, 1.1, 1.4, BONE, z + 0.35, { bias: -2 });             // the heel's sole as it comes up
    }
  }

  // ---- the pelvis and the tattered clout: swings a beat behind, one ragged hem
  px.part();
  px.ellipse(hx, hipY - 0.6, 4.3, 2.3, BONE, 4, { floor: 1 });
  px.part();
  px.poly([[hx - 4.6, hipY - 1.4], [hx + 4.6, hipY - 1.4], [hx + 4.8, hipY + 4.6], [hx + 3, hipY + 3.2], [hx + 1.8, hipY + 6.4], [hx + 0.2, hipY + 3.6], [hx - 1.2, hipY + 6.2], [hx - 2.6, hipY + 3.4], [hx - 3.4, hipY + 5], [hx - 4.8 - vx, hipY + 3.6]], RAG, s > 0 ? 4.5 : 4.6, { round: 0.8, floor: 1 });
  px.part();
  if (s > 0) px.line(hx - 0.4, hipY - 1, hx + 0.2, hipY + 4, RAG, 4.55, { fix: 0 });
  else { px.line(hx, hipY - 1, hx, hipY + 3.4, RAG, 4.65, { fix: 0 }); px.dot(hx + 2.8, hipY + 1.2, GAP, 4.7); }

  // ---- spine, rib cage, shoulders
  const top = chestY - 1, bot = chestY + 7.4;
  px.part();
  px.capsule(sx + 0.2, top + 2, 0.9, hx, hipY - 1, 0.95, BONE, s > 0 ? 3.9 : 4.7, { bias: -1 });
  px.part();
  const rz = s > 0 ? 4.1 : 3.9, rw = 4.2;
  px.poly([[sx - rw, top + 1.4], [sx + rw, top + 1.4], [sx + rw + 0.4, top + 4], [sx + rw - 0.8, bot - 0.6], [sx + 1, bot], [sx - 1, bot], [sx - rw + 0.8, bot - 0.6], [sx - rw - 0.4, top + 4]], BONE, rz, { round: 0.7, floor: 1 });
  if (s > 0) {
    for (const t of [2.4, 4.2, 6]) { px.line(sx - rw + 0.8, top + t, sx - 0.8, top + t + 0.8, GAP, 4.2); px.line(sx + rw - 0.8, top + t, sx + 0.8, top + t + 0.8, GAP, 4.2); }
    px.line(sx, top + 1.6, sx, bot - 0.4, BONE, 4.25, { fix: 3 });                                     // the breastbone
    px.line(sx - rw, top + 1.4, sx + rw, top + 1.4, BONE, 4.25, { fix: 3 });                             // the collar bones
  } else {
    px.part();
    for (let t = 2.2; t < 7; t += 1.7) { px.line(sx - rw + 0.8, top + t - 0.6, sx - 0.8, top + t + 0.4, GAP, 4.2); px.line(sx + rw - 0.8, top + t - 0.6, sx + 0.8, top + t + 0.4, GAP, 4.2); }
    for (let t = 1.6; t < 7.4; t += 1.7) px.dot(sx, top + t, BONE, 4.3, { fix: 3 });                    // the knuckled spine
    px.poly([[sx - 3.8, top + 2], [sx - 1.2, top + 2.4], [sx - 2.2, top + 5.6]], BONE, 4.15, { fix: 1 }); // shoulder blades
    px.poly([[sx + 3.8, top + 2], [sx + 1.2, top + 2.4], [sx + 2.2, top + 5.6]], BONE, 4.15, { fix: 1 });
  }
  // the neck
  px.part();
  px.capsule(sx * 0.9, top + 1.6, 1.1, hx, hy + 0.5, 1, BONE, 4.05, {});

  // ---- the near arm (his right, screen side rs): the pitted sword up in its fist
  const ar = 0.6 * a * s * rs * -1 * -1;
  const hand = [rs * 6.8 + sx, chestY + 8.4 + ar], elb = [rs * 7 + sx, chestY + 4];
  px.part();
  px.ellipse(sx + rs * 4.4, chestY + 0.8, 1.8, 1.6, BONE, 7.9, { floor: 1 });
  px.part();
  px.capsule(sx + rs * 4.4, chestY + 1, 1.2, elb[0], elb[1], 1.05, BONE, 7.8, { cast: 1 });
  px.capsule(elb[0], elb[1], 1.05, hand[0], hand[1], 0.95, BONE, 7.8, { cast: 1 });
  px.ellipse(elb[0], elb[1], 1.4, 1.3, BONE, 7.85);
  px.part(); px.tag("sword");
  if (s > 0) {
    const lean = rs * 0.1, bl = 15, tipx = hand[0] + lean * bl, tipy = hand[1] - bl;
    px.poly([[hand[0] - 1.3, hand[1] - 1.8], [hand[0] + 1.4, hand[1] - 1.8], [tipx + 1.2, tipy + 2.4], [tipx, tipy - 1.2], [tipx - 1.2, tipy + 2.4]], IRON, 8.1, { fix: 3 });
    px.line(hand[0] - 0.2, hand[1] - 2, tipx, tipy + 1, IRON, 8.12, { fix: 4 });
    px.line(hand[0] - 2.2, hand[1] - 1.8, hand[0] + 2.2, hand[1] - 1.8, BONE, 8.13, { fix: 1 });             // the guard
    px.capsule(hand[0], hand[1] + 0.2, 0.8, hand[0], hand[1] + 2.4, 0.8, DARKM, 8.1);
  } else {
    // from behind the blade is hidden by him: only its tip shows past the hip, angled forward and down
    px.poly([[hand[0] - 0.9, hand[1] + 1], [hand[0] + 1, hand[1] + 1], [hand[0] + rs * 1.4, hand[1] + 6.6], [hand[0] + rs * 0.6, hand[1] + 7.6]], IRON, 3.0, { fix: 3 });
    px.capsule(hand[0], hand[1] - 0.4, 0.8, hand[0], hand[1] + 1.4, 0.8, DARKM, 8.1);
  }
  px.tag(null);
  px.part();
  px.ellipse(hand[0], hand[1], 1.5, 1.4, BONE, 8.3);

  // ---- the head
  px.part();
  if (s > 0) px.stamp(p.blink ? BLINK : FRONT_H, hx, hy, LEG, 6, { ax: 5, ay: 9, ball: [5.5, 5, 5.5, 5.5], cast: 1 });
  else px.stamp(BACK_H, hx, hy, LEG, 6, { ax: 5, ay: 9, ball: [5.5, 5, 5.5, 5.5], cast: 1 });
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "risen-front", BOX: { w: 48, h: 62, ox: 24, oy: 54 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "risen-back", BOX: { w: 48, h: 62, ox: 24, oy: 54 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
