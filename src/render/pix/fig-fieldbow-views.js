// ============ VIEWS: the field bowman from the FRONT and from BEHIND ============
// fig-fieldbow.js's soldier (peaked brown hood over short hair, olive jerkin belted in leather, rolled sleeve,
// bracer, quiver on the back, a yew bow in the far hand) walking toward the camera (FRONT) and away from it
// (BACK). One drawer, `view(s)`: s = +1 front, -1 back. The bow rides his LEFT hand (screen RIGHT in front,
// LEFT from behind), carried upright and edge-on, its string on the inner side; his right arm swings free.
// The quiver hangs across his back: its fletchings show over the right shoulder in front, the whole
// quiver and its strap from behind. Same walk clip as the side; feet / bob read from the solved pose.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-fieldbow.js";

const TUNIC = mat("#80703f", { contrast: 1.1 }), HOOD = mat("#6c5634", { contrast: 1.15 }), SKIN = mat("#eccaa4"), HAIR = mat("#5a4430");
const LEG_C = mat("#5a4630"), BOOT = mat("#3a2a1c"), LEATHER = mat("#6a4628"), BOW = mat("#6a4428", { contrast: 1.15 }), GOLD = mat("#b89a48");
const SHIRT = mat("#b8a878"), EYE = flat("#2a1c2c"), LIP = flat("#b86a5a"), STRING = flat("#f2ead4", { line: "#6a5a48" });
const FLETCH = mat("#e8dcc0");

const LEG = {
  H: { m: HOOD, fix: 2 }, h: { m: HOOD, fix: 1 }, a: { m: HOOD, fix: 3 }, R: { m: HAIR, fix: 2 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP }, B: { m: HAIR, fix: 1 },
};
// FRONT: the peaked hood framing the face, a fringe of hair, brows, eyes, nose, lips. 13 wide, centre 6.
const FRONT_H = [
  "....aHHHH....",
  "..aaHHHHHHH..",
  ".aaHHHHHHHHH.",
  "HHHHHHHHHHHHH",
  "HHhRRRRRRRhHH",
  "HHhRBBSBBRhHH",
  "HHhSESSSEShHH",
  "HHhSESSSEShHH",
  "HHhSSSNSSShHH",
  ".HhSSSSSSShH.",
  "..HsSSmSSsH..",
  "...hSSSSSh...",
];
const BLINK = FRONT_H.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
// BACK: the back of the hood, a seam down it, the fold of the cowl, a tuft of hair at the nape.
const BACK_H = [
  "....aHHHH....",
  "..aaHHhHHHH..",
  ".aaHHHHhHHHH.",
  "HHHHHHHhHHHHH",
  "HHHHHHHhHHHHH",
  "HHHHHHHhHHHHH",
  "HHHhHHHhHHhHH",
  "HHHHHHHhHHHHH",
  ".HHHHHHhHHHH.",
  "..hHHHHhHHHh.",
  "...hhHHHHhh..",
  "....RRRRRR...",
];

const FWD = 0.4, TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v));

const make = (s) => (px, F) => {
  const rs = -s, ls = s, vv = s > 0;
  const { sk, ph } = F, p = sk.p;
  const sx = rs * 0.5 * Math.sin(ph * TAU), hipY = sk.P[1], chestY = sk.C[1], hy = sk.N[1] + 0.5, hx = Math.round(sx * 0.7);
  const a = Math.cos(ph * TAU), shY = chestY - 0.4, hem = hipY + 3.4;

  // ---- the bow arm (his left): sleeve, shirt cuff and bracer, the fist on the grip; the yew bow upright beside it
  const lSh = [ls * 5.2 + sx, shY], lEl = [ls * 6.6 + sx, shY + 5], lHd = [ls * 7 + sx, shY + 10.4];
  const bz = 7, gx = lHd[0] + ls * 0.4, gy = lHd[1];
  px.part(); px.tag("bow");
  px.capsule(gx - ls * 0.6, gy - 12.5, 0.6, gx + ls * 0.2, gy - 6, 0.95, BOW, bz, { edge: true });
  px.capsule(gx + ls * 0.2, gy - 6, 0.95, gx + ls * 0.4, gy, 1.3, BOW, bz, { edge: true });
  px.capsule(gx + ls * 0.4, gy, 1.3, gx + ls * 0.2, gy + 6, 0.95, BOW, bz, { edge: true });
  px.capsule(gx + ls * 0.2, gy + 6, 0.95, gx - ls * 0.6, gy + 12.5, 0.6, BOW, bz, { edge: true });
  px.line(gx - ls * 0.6, gy - 12.5, gx - ls * 1.4, gy + 12.5, STRING, bz - 0.2, { unlit: true });
  px.part(); px.capsule(gx + ls * 0.4, gy - 1.8, 1.25, gx + ls * 0.4, gy + 1.8, 1.25, LEATHER, bz + 0.05);   // the grip wrap
  px.tag(null);
  px.part(); px.tag("farArm");
  px.capsule(lSh[0], lSh[1], 2.0, lEl[0], lEl[1], 1.8, TUNIC, 4.4, { bias: -1 });
  px.capsule(lEl[0], lEl[1], 1.8, lHd[0], lHd[1], 1.6, SHIRT, 4.4, { bias: -1 });
  px.capsule(lEl[0] * 0.4 + lHd[0] * 0.6, lEl[1] * 0.4 + lHd[1] * 0.6, 1.8, lHd[0], lHd[1], 1.7, LEATHER, 4.42, { bias: -1 });
  px.part(); px.ellipse(lHd[0], lHd[1], 1.7, 1.7, SKIN, bz + 0.3, { bias: -1 }); px.tag(null);

  // ---- the quiver across the back: behind the body in front (fletchings over the right shoulder), over it from behind
  const q0 = [ls * 3.2 + sx, hipY - 0.5], q1 = [rs * 3.6 + sx, chestY - 4];
  px.part(); px.tag("quiver");
  const qz = vv ? 3.3 : 4.6;
  px.capsule(q0[0], q0[1], 1.9, q1[0], q1[1], 1.9, LEATHER, qz);
  px.line(q1[0] - 1.6, q1[1] + 1, q1[0] + 1.6, q1[1] - 0.8, GOLD, qz + 0.02);
  px.part();
  for (const [dx, m] of [[-1, FLETCH], [1.1, FLETCH]]) px.capsule(q1[0] + dx, q1[1] - 1.4, 0.8, q1[0] + dx + rs * 0.3, q1[1] - 4.2, 0.7, m, qz - 0.02);
  px.tag(null);

  // ---- legs: breeches, boots. Forward is down the screen in front, up it behind.
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * 2.7, fy = -2 + s * f[0] * FWD - lift * 0.9, b = side === rs ? 0 : -1;
    const hp = [hx + side * 2, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.4, (hp[1] + fy) / 2 - lift * 0.5];
    px.part();
    px.capsule(hp[0], hp[1], 2.3, kn[0], kn[1], 2.0, LEG_C, z + lift * 0.05, { bias: b });
    px.capsule(kn[0], kn[1], 1.9, fx, fy - 2.4, 1.6, LEG_C, z + lift * 0.05, { bias: b });
    px.capsule(kn[0] * 0.3 + fx * 0.7, kn[1] * 0.3 + (fy - 2.4) * 0.7, 1.9, fx, fy, 1.8, BOOT, z + lift * 0.05 + 0.02, { bias: b });
    px.part();
    if (vv) px.ellipse(fx, fy + 1, 2.5, 1.4, BOOT, z + 0.4 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 0.8, 2.0, 1.3, BOOT, z + 0.4 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 2.3, 1.7, 1.6 * cl(lift / 2.4, 0.3, 1), BOOT, z + 0.45, { bias: -2 });
    }
  }

  // ---- the tunic: belted, skirted to mid-thigh; the quiver's strap across the chest in front
  px.part(); const tun = px._pid;
  const hm = [[sx + 5.2, hem], [sx + 2.8, hem + 0.9], [sx, hem], [sx - 2.8, hem + 0.9], [sx - 5.2, hem]];
  px.poly([[sx - 4.4, chestY - 1.8], [sx + 4.4, chestY - 1.8], [sx + 5.2, chestY + 3], [sx + 4.4, hipY - 3], ...hm, [sx - 4.4, hipY - 3], [sx - 5.2, chestY + 3]], TUNIC, 4, { round: 0.92, cast: 2 });
  px.toneLine(sx - 3.6, hipY - 1, sx - 3.6, hem - 0.4, -1, tun);
  px.poly([[sx - 4.5, hipY - 4.4], [sx + 4.5, hipY - 4.4], [sx + 4.5, hipY - 2.6], [sx - 4.5, hipY - 2.6]], LEATHER, 4.05, { round: 0.92 });
  px.part();
  if (vv) {
    px.rect(sx - 1, hipY - 4.4, 2, 2, GOLD, 4.06, { fix: 3 });
    px.line(sx + rs * 4.2, chestY - 1.4, sx + ls * 3.6, hipY - 4.6, LEATHER, 4.04);          // the strap over the chest
  } else {
    px.toneLine(sx + 0.3, chestY - 1, sx, hipY - 4, -1, tun);
    px.line(sx + ls * 3.2, hipY - 1, sx + rs * 3.4, chestY - 1.6, LEATHER, 4.9);             // the strap over the quiver
    px.dot(sx + 2.4, hipY - 3.6, GOLD, 4.07, { fix: 3 });
  }
  px.part();   // the cowl on the shoulders
  px.poly([[sx - 5.4, chestY - 2.8], [sx + 5.4, chestY - 2.8], [sx + 5.8, chestY + 0.8], [sx + 1.6, chestY + 2.8], [sx - 1.6, chestY + 2.8], [sx - 5.8, chestY + 0.8]], HOOD, 5, { round: 0.9, cast: 1 });

  // ---- the free right arm: rolled sleeve, cuff, bracer; it swings forward as the left foot is planted
  const sw = -a * 0.45, rSh = [rs * 5.2 + sx, shY], rEl = [rs * (vv ? 6.8 : 6.2) + sx, shY + 5.2], rHd = [rs * (vv ? 6.6 : 4.4) + sx, shY + (vv ? 10.8 + s * sw * 2.2 : 9.6 - sw * 1.6)];
  px.part(); px.tag("nearArm");
  px.capsule(rSh[0], rSh[1] + 0.3, 2.1, rEl[0], rEl[1], 1.9, TUNIC, 8, { cast: 2 });
  px.capsule(rEl[0], rEl[1], 1.9, rHd[0], rHd[1], 1.6, SHIRT, 8, { cast: 2 });
  px.capsule(rEl[0] * 0.4 + rHd[0] * 0.6, rEl[1] * 0.4 + rHd[1] * 0.6, 1.9, rHd[0], rHd[1], 1.8, LEATHER, 8.02);
  px.part(); px.ellipse(rHd[0], rHd[1] + 0.3, 1.7 + s * sw * 0.3, 1.7, SKIN, 8.3); px.tag(null);

  // ---- the head
  px.part();
  px.stamp(vv ? (p.blink ? BLINK : FRONT_H) : BACK_H, hx, hy, LEG, 6, { ax: 6, ay: 11, ball: [6.5, 6, 6.6, 6.6], cast: 2 });
  return {};
};

const walk = { ...SIDE.walk };
const BOX = { w: 44, h: 66, ox: 22, oy: 58 };
export const FRONT = { NAME: "fieldbow-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "fieldbow-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
