// ============ CONCEPT FIGURES: Brother Osric seen from the FRONT and from BEHIND ============
// The pattern of fig-goblin-views.js applied to the battle friar of fig-friar.js (approved look: brown habit,
// rope belt with its knotted end, tonsure, gold-headed mace carried upright in his RIGHT fist). One drawer
// serves both: s = +1 FRONT (walking down the screen), s = -1 BACK (walking up it). His right hand is on
// SCREEN LEFT in front and SCREEN RIGHT behind (`rs`); the mace keeps that hand. Unflipped on the board; one sun,
// upper left. Same clip n / ms / pose as the side walk; the feet, bob and sway read the same solved walk.
// Forward is DOWN the screen in FRONT and UP in BACK, foreshortened (FWD a px of stride).
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-friar.js";

const HABIT = mat("#86502f"), ROPE = mat("#e4dcc4"), CREAM = mat("#e4e0d4");
const SKIN = mat("#e8b48a"), HAIR = mat("#86705c"), GOLD = mat("#e8c860", { contrast: 1.15 }), WOOD = mat("#6a4424", { contrast: 1.15 });
const IRON = mat("#9aa2b0", { contrast: 1.2 }), EYE = flat("#2a1c2c"), LIP = flat("#b86a5a");
const LEG = {
  h: { m: HAIR, fix: 2 }, H: { m: HAIR, fix: 1 }, Q: { m: HAIR, fix: 3 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, b: { m: HAIR, fix: 2 }, m: { m: LIP },
};
const S = 1.36, FWD = 0.16, cl = (v, a, b) => Math.max(a, Math.min(b, v));

// FRONT head, 15 wide, 13 tall: the bare crown, a ring of hair at the sides, brows, eyes, nose, small mouth.
const FRONT_H = [
  "....SSSSSSS....",
  "..QhSSSSSSShh..",
  ".QhhSSSSSSSHhh.",
  ".hhhSSSSSSSHhh.",
  ".hhhSSSSSSSHhh.",
  ".hhsbbSSSbbshh.",
  ".hhsSESSSESshh.",
  ".hhsSESNSESshh.",
  ".hhsSSSNSSSshh.",
  "..hsSSmmmSSsh..",
  "...sSSSSSSSs...",
  ".....sSSSSs....",
  "......SSSSS....",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
// BACK head: the bare crown seen from behind with the ring of hair round it, a parting seam, the ears.
const BACK_H = [
  "....hSSSSSh....",
  "..hhhSSSSShhh..",
  ".QhhhhSSShhhHh.",
  ".QhhhhhHhhhhHh.",
  ".hhhhhhHhhhhhh.",
  ".shhhhhHhhhhhs.",
  ".shhhHhHhhhhhs.",
  ".hhhhhhHhhhhhh.",
  "..hhhHhHhhhhh..",
  "...hhhhHhhhh...",
  "....sSSSSSs....",
  ".....sSSSs.....",
  "......SSSS.....",
];

const make = (s) => (px, F, o = {}) => {
  const { sk, ph } = F, p = sk.p, TAU = Math.PI * 2, rs = -s, ls = s;
  const sx = rs * 1.0 * Math.sin(ph * TAU), sxL = rs * 1.0 * Math.sin((ph - 0.08) * TAU);
  const hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1], hx = Math.round(sx * 0.7), tx = sx * 0.6;
  const a = Math.cos(ph * TAU), vx = cl((sx - sxL) * 1.4, -2.4, 2.4);
  const hemY = -1.3, fc = hx;

  // the feet: bare toes in sandals under the hem; the lifting foot rises (toward us in FRONT, away in BACK)
  const feet = [[p.fF, ls], [p.fN, rs]];
  for (const [f, side] of feet) {
    const lift = f[1], fx = fc + side * 3.6, fy = cl(0.2 + s * f[0] * FWD - lift * 0.3, -0.8, 0.9);
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.3, fy + 0.4, 2.5, 1.6, SKIN, 3 + lift * 0.02, { bias: side === rs ? 0 : -1 });
    else {
      px.ellipse(fx, fy + 0.2, 2.2, 1.5, SKIN, 3 + lift * 0.02, { bias: side === rs ? 0 : -1 });
      if (lift > 1.2) px.ellipse(fx, fy + 1.8, 2.0, 1.4 * cl(lift / 3, 0.3, 1), SKIN, 3.05, { bias: -2 });   // the heel's sole
    }
  }

  // the habit: one bell of robe from the shoulders to the ground, its hem scalloped, lifting where a foot steps
  px.part(); const rb = px._pid;
  const L = (t) => cl(t, 0, 2);
  const hL = hemY - L(p.fN[1] * (rs < 0 ? 0.3 : 0) + p.fF[1] * (rs < 0 ? 0 : 0.3)) * 0.2, hR = hemY - L(p.fN[1] * (rs > 0 ? 0.3 : 0) + p.fF[1] * (rs > 0 ? 0 : 0.3)) * 0.2;
  const W = 5.1 * S, B = 7.7 * S;
  px.poly([[tx - W, chestY - 0.8], [tx + W, chestY - 0.8], [tx + W + 1.2, chestY + 4.8], [hx + 5.6 * S, hipY - 1], [hx + B, hR], [hx + B * 0.55, hemY + 0.9], [hx + 0.4, hemY - 0.2], [hx - B * 0.55, hemY + 0.9], [hx - B, hL], [hx - 5.6 * S, hipY - 1], [tx - W - 1.2, chestY + 4.8]], HABIT, 4, { round: 0.9, ny: -0.12, cast: 2 });
  px.toneLine(hx - 2.2, hipY + 2, hx - 3.4 - vx * 0.6, hemY - 1, -1, rb);
  px.toneLine(hx + 3.4, hipY + 3, hx + 5 - vx * 0.4, hemY - 1, -1, rb);
  if (s > 0) {
    px.part();                                                              // the open neck: a bare chest, a cream collar edge
    px.poly([[tx - 2.2, chestY - 2.2], [tx + 2.2, chestY - 2.2], [tx + 0.4, chestY + 3]], SKIN, 4.1, { round: 0.6, cast: 1 });
    px.line(tx - 2.4, chestY - 1.8, tx + 0.2, chestY + 3, CREAM, 4.3, { fix: 3 });
    px.line(tx + 2.4, chestY - 1.8, tx + 0.4, chestY + 3, CREAM, 4.3, { fix: 3 });
  } else {
    px.part();
    px.line(tx - 3.6, chestY - 1.3, tx + 3.8, chestY - 1.3, CREAM, 4.3);   // the collar at the nape
    px.toneLine(tx - 0.4, chestY + 1, hx - 0.4, hipY - 3, -1, px._pid);        // the back seam
  }
  // the rope belt, its knotted end hanging at his right hip in front, nothing behind but a loop
  px.part();
  px.line(hx - 6.2 * S * 0.9, hipY - 2.2, hx + 6.2 * S * 0.9, hipY - 2.2, ROPE, 4.3);
  if (s > 0) {
    const kx = hx + rs * 2.6, ky = hipY - 1.8;
    px.dot(kx, ky, ROPE, 4.34, { fix: 3 });
    px.line(kx, ky, kx + rs * 0.3 + vx * 0.3, hipY + 6.4 * S, ROPE, 4.32);
    px.dot(kx + rs * 0.3 + vx * 0.3, hipY + 7.2 * S, ROPE, 4.34, { fix: 3 });
  } else {
    px.dot(hx + rs * 2.4, hipY - 1.8, ROPE, 4.34, { fix: 3 });
    px.dot(hx - 0.8, hipY + 0.6, ROPE, 4.33, { fix: 3 });
  }

  // the far arm (his left, screen side ls): a wide sleeve hanging, the bare hand swinging a little
  const swing = a * 0.4, bk = s < 0, shL = [tx + ls * (bk ? 5.6 : 5.9), chestY + 1.4];
  const elL = [tx + ls * (bk ? 7.0 : 7.6), chestY + 8], hdL = [tx + ls * (bk ? 7.2 : 8.2), chestY + 14.6 + s * swing * 2.2 * -1];
  const az = bk ? 3.9 : 4.5;   // from behind both arms hang at his sides, under the robe's back: only the outer edge of each sleeve shows
  px.part();
  px.capsule(shL[0], shL[1], 2.7 * S, elL[0], elL[1], 2.8 * S, HABIT, az, { bias: -1, cast: 1 });
  px.capsule(elL[0], elL[1], 2.8 * S, hdL[0], hdL[1], 2.5 * S, HABIT, az, { bias: -1, cast: 1 });
  px.part(); px.ellipse(hdL[0], hdL[1] + 2.2, 1.6 * S, 1.5 * S, SKIN, az + 0.2, { bias: -1 });

  // the mace: carried upright in his right fist, a little out from the body. Haft, rope grip, gold ball, iron collar, flanges.
  const rise = -a * 0.5 * s, sh = [tx + rs * 5.8, chestY + 1.4];
  const hd = [tx + rs * (s < 0 ? 7.6 : 8.4), chestY + 14 + s * rise * 0.4], elb = [tx + rs * (s < 0 ? 6.8 : 7.2), chestY + 8], zo = s > 0 ? 0 : -1.95;
  const dn = [-rs * 0.45, 0.5], dl = Math.hypot(dn[0], dn[1]), d = dn, nr = [-d[1] / dl, d[0] / dl];   // hangs head DOWN and forward (front: by his thigh; back: foreshortened, tucked behind the robe)
  const Bm = (t, w = 0) => [hd[0] + d[0] * t * S + nr[0] * w * S, hd[1] + d[1] * t * S + nr[1] * w * S];
  px.part(); px.tag("mace");
  px.capsule(...Bm(-6), 1.15 * S, ...Bm(11), 1 * S, WOOD, zo + 5.4, { edge: true });
  px.capsule(...Bm(-0.5), 1.25 * S, ...Bm(3.4), 1.25 * S, ROPE, zo + 5.42);
  px.part();
  px.ellipse(...Bm(-6.6), 1.3 * S, 1.3 * S, GOLD, zo + 5.45);
  const mh = Bm(13);
  px.ellipse(mh[0], mh[1], 2.4 * S, 2.6 * S, GOLD, zo + 5.5, { vb: 0.2 });
  px.capsule(...Bm(11.2), 1.5 * S, ...Bm(11.8), 1.5 * S, IRON, zo + 5.51);
  for (const k of [-1, 1]) px.capsule(mh[0] + nr[0] * 1.8 * S * k, mh[1] + nr[1] * 1.8 * S * k, 0.9 * S, mh[0] + nr[0] * 3 * S * k, mh[1] + nr[1] * 3 * S * k, 0.6 * S, GOLD, zo + 5.52, { edge: true });
  px.capsule(...Bm(15), 0.8 * S, ...Bm(16.6), 0.3 * S, IRON, zo + 5.52, { edge: true });
  px.tag(null);
  // the right sleeve up to the fist, the fist round the haft
  px.part(); px.tag("nearArm");
  px.capsule(sh[0], sh[1] + 0.5, 2.7 * S, elb[0], elb[1], 2.6 * S, HABIT, s < 0 ? 3.9 : 5.9, { cast: 2 });
  px.capsule(elb[0], elb[1], 2.6 * S, hd[0], hd[1] + 1.2, 2.1 * S, HABIT, s < 0 ? 3.9 : 5.9, { cast: 2 });
  px.part(); const ang = Math.atan2(d[0], -d[1]);
  px.ellipse(hd[0], hd[1], 1.9 * S, 1.6 * S, SKIN, s < 0 ? 3.95 : 6.1, { rot: -ang + Math.PI / 2 });       // the fist closes round the haft
  px.toneLine(hd[0] - nr[0] * 1.6 + d[0] * 0.8, hd[1] - nr[1] * 1.6 + d[1] * 0.8, hd[0] + nr[0] * 1.6 + d[0] * 0.8, hd[1] + nr[1] * 1.6 + d[1] * 0.8, -1, px._pid);   // the fingers over it
  px.tag(null);

  // the head
  px.part();
  const hz = 6.4;
  if (s > 0) px.stamp(p.blink ? blinkOf(FRONT_H) : FRONT_H, hx, hy, LEG, hz, { ax: 7, ay: 13, ball: [7.5, 6, 8, 7.3], cast: 2, edge: true });
  else px.stamp(BACK_H, hx, hy, LEG, hz, { ax: 7, ay: 13, ball: [7.5, 6, 8, 7.3], cast: 2, edge: true });
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "friar-front", BOX: { w: 100, h: 104, ox: 50, oy: 90 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "friar-back", BOX: { w: 100, h: 104, ox: 50, oy: 90 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
