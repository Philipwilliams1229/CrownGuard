// ============ CONCEPT FIGURES: Ysolde the Stormcaller seen from the FRONT and from BEHIND ============
// The pattern of fig-goblin-views.js applied to fig-storm.js (indigo robe with silver trim, grey mantle, long white
// hair, the staff with its silver claw round a pale-blue crystal that lights her). s = +1 FRONT (walking down the
// screen), s = -1 BACK (walking up it). The staff is in her RIGHT hand: SCREEN LEFT in front, SCREEN RIGHT behind
// (`rs`), carried upright and a little outboard so the crystal clears her head; her LEFT hand is open at her side.
// The crystal's light (info.lights, info.marks.tip) is kept. Drawn in final art pixels (no scaling proxy); the
// skeleton's y values are the side figure's old units, times K. Unflipped on the board; one sun, upper left.
// Same clip n / ms / pose as the side walk. FRONT: the hair falls in two locks over the mantle in front; BACK: one
// white curtain down the back, parted seam, a beat behind the bob.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-storm.js";

const K = 1.22;
const ROBE = mat("#3c3a7e"), SILVER = mat("#c8d0e4", { contrast: 1.15 }), SKIN = mat("#ecd0b4"), HAIR = mat("#dfe4f2", { contrast: 1.25 }), HAIR_D = mat("#aeb4cc");
const CAPE = mat("#6a7082"), WOOD = mat("#5e4a38", { contrast: 1.15 }), EYE = flat("#2a1c2c"), LIP = flat("#c07a76"), BOOT = mat("#2c2a40");
const CRYS = flat("#bfe6ff", { emis: true, line: "#6aa8d8" }), CRYS_C = flat("#ffffff", { emis: true, line: "#bfe6ff" });
const LEG = {
  R: { m: HAIR, fix: 2 }, r: { m: HAIR_D, fix: 1 }, Q: { m: HAIR, fix: 3 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP },
};
const FWD = 0.16, cl = (v, a, b) => Math.max(a, Math.min(b, v));

// FRONT head, 15 wide, 13 tall: hair parted and falling to both sides, the face between, small mouth.
const FRONT_H = [
  "....QQQRRRR....",
  "..QQQQRRRRRRR..",
  ".QQQRRRRRRRRRR.",
  ".QQRRRRRRRRRRR.",
  ".QRRSSSSSSSRRr.",
  ".QRRSSSSSSSRRr.",
  ".QRRSESSSESRRr.",
  ".QRRSESNSESRRr.",
  ".RRrSSSNSSSrRR.",
  ".RRrSSmmmSSrRR.",
  "..RRrsSSSSSsrR.",
  "..RRr.ssSSs.rRR",
  "..Rrr..SSS..rRR",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
// BACK head: all white hair, a parting seam, a lit side.
const BACK_H = [
  "....QQQRRRR....",
  "..QQQQRRRRRRR..",
  ".QQQRRRRRRRRRR.",
  ".QQRRRRRrRRRRR.",
  ".QRRRRRrRRRRRr.",
  ".QRRRRRrRRRRRr.",
  ".QRRRRrrRRRRRr.",
  ".RRRRRrRRRRRRr.",
  ".RRRRrRRRRRRrr.",
  "..RRRrRRRRRrr..",
  "..RRrrRRRRrr...",
  "...RrrRRRrr....",
  "....rrrrrr.....",
];

const make = (s) => (px, F, o = {}) => {
  const { sk, ph } = F, p = sk.p, TAU = Math.PI * 2, rs = -s, ls = s;
  const sx = rs * 1.0 * Math.sin(ph * TAU), sxL = rs * 1.0 * Math.sin((ph - 0.08) * TAU), sxL2 = rs * 1.0 * Math.sin((ph - 0.16) * TAU);
  const hipY = sk.P[1] * K, chestY = sk.C[1] * K, hy = sk.N[1] * K, hx = Math.round(sx * 0.7), tx = sx * 0.6;
  const a = Math.cos(ph * TAU), vx = cl((sx - sxL) * 1.3, -2.5, 2.5), vx2 = cl((sxL - sxL2) * 1.3, -2.5, 2.5);
  const hemY = -1.6;

  // the boots under the hem: a foot lifts toward us (front) or away (back), but always hangs from the robe's hem
  for (const [f, side] of [[p.fF, ls], [p.fN, rs]]) {
    const lift = f[1], fx = hx + side * 3.4, fy = cl(-0.2 + s * f[0] * FWD * K - lift * 0.3, -1.1, 0.5);
    px.part();
    px.ellipse(fx + (s > 0 ? side * 0.3 : 0), fy + 0.3, 2.6, 1.5, BOOT, 3, { bias: side === rs ? 0 : -1 });
  }

  // behind it all: the grey mantle's back and the hem of the cape; in BACK the long white curtain of hair
  px.part();
  px.poly([[tx - 4.4, chestY - 2.4], [tx + 4.4, chestY - 2.4], [tx + 5.6, chestY + 4], [hx + 3, hipY + 6], [hx - 3, hipY + 6], [tx - 5.6, chestY + 4]], CAPE, 0.5, { round: 0.85 });

  // the robe to the ground, silver at the hem, the collar and the centre front
  px.part(); const rb = px._pid;
  const W = 5.4, B = 8.6, hL = hemY - cl(p.fN[1] * 0.2, 0, 1), hR = hemY - cl(p.fF[1] * 0.2, 0, 1);
  px.poly([[tx - W, chestY - 2.2], [tx + W, chestY - 2.2], [tx + W + 1, chestY + 4], [hx + 5.8, hipY - 1], [hx + B, rs > 0 ? hL : hR], [hx + B * 0.55, hemY + 0.8], [hx + 0.4, hemY - 0.2], [hx - B * 0.55, hemY + 0.8], [hx - B, rs > 0 ? hR : hL], [hx - 5.8, hipY - 1], [tx - W - 1, chestY + 4]], ROBE, 4, { round: 0.9, ny: -0.12, cast: 2 });
  px.toneLine(hx - 2.4, hipY + 2, hx - 3.4 - vx * 0.6, hemY - 1, -1, rb);
  px.toneLine(hx + 3.2, hipY + 3, hx + 4.6 - vx * 0.4, hemY - 1, -1, rb);
  px.line(hx - B + 1, hemY - 0.8, hx + B - 1, hemY - 0.8, SILVER, 4.2, { noLine: true });
  px.line(hx - B + 1.4, hemY - 4, hx + B - 1.4, hemY - 4, SILVER, 4.21, { noLine: true });
  if (s > 0) px.line(hx + 0.2, chestY + 3, hx + 0.2, hemY - 4.6, SILVER, 4.22, { noLine: true });
  else px.toneLine(tx, chestY + 3, hx, hemY - 3, -1, rb);                       // the back seam
  // the mantle over the shoulders, a silver edge; a clasp in front
  px.part();
  px.poly([[tx - 6.4, chestY - 3], [tx + 6.2, chestY - 3], [tx + 7.6, chestY + 1.8], [tx + 3.6, chestY + 4], [tx + 0.4 - vx * 0.5, chestY + 5], [tx - 3.6, chestY + 3.8], [tx - 7.4, chestY + 2]], CAPE, 5, { round: 0.9, cast: 1 });
  px.line(tx - 7, chestY + 1.8, tx + 7.2, chestY + 1.6, SILVER, 5.02, { noLine: true });
  if (s > 0) px.dot(tx, chestY - 1.4, SILVER, 5.1, { fix: 3 });

  // hair: FRONT two locks over the mantle at both sides of the chest; BACK one white curtain down her back, a beat behind
  const t1 = -vx * 1.4, t2 = -vx * 2 - vx2 * 1.6;
  px.part();
  if (s > 0) {
    for (const side of [-1, 1]) {
      const top = [hx + side * 6.4, hy + 2];
      px.capsule(top[0], top[1], 2.4, top[0] + side * 1.2 + t1 * 0.3, chestY + 6, 2.6, HAIR, 5.6, { bias: side === rs ? 0 : -1 });
      px.capsule(top[0] + side * 1.2 + t1 * 0.3, chestY + 6, 2.6, top[0] + side * 0.6 + t2 * 0.4, chestY + 13.4, 1.4, HAIR_D, 5.6, { bias: side === rs ? 0 : -1 });
    }
  } else {
    px.capsule(hx, hy - 2, 5.2, hx + t1 * 0.4, chestY + 8, 5.6, HAIR, 5.6, { cast: 1 });
    px.capsule(hx + t1 * 0.4, chestY + 8, 5.6, hx + t2 * 0.5, chestY + 18.8, 2.6, HAIR_D, 5.6);
    px.toneLine(hx - 0.4, hy + 4, hx + t2 * 0.4, chestY + 17, -1, px._pid);
  }

  // the far arm (her LEFT, screen side ls): a bell sleeve, silver cuff, the hand open at her side
  const swing = -a * 1.2 * s * 0.4;
  const shL = [tx + ls * 6.3, chestY + 0.4], elL = [tx + ls * 8.8, chestY + 7.2], hdL = [tx + ls * 9.4, chestY + 13.6 + swing];
  px.part();
  px.capsule(shL[0], shL[1], 2.7, elL[0], elL[1], 2.8, ROBE, 4.6, { bias: -1, cast: 1 });
  px.capsule(elL[0], elL[1], 3, hdL[0], hdL[1], 2.4, ROBE, 4.6, { bias: -1, cast: 1 });
  px.line(hdL[0] - 2, hdL[1] - 1.2, hdL[0] + 2, hdL[1] - 1.2, SILVER, 4.62);
  px.part(); px.ellipse(hdL[0], hdL[1] + 1.8, 1.8, 1.8, SKIN, 4.7, { bias: -1 });

  // the staff in her right hand, upright and a little outboard; the claw and crystal clear her head
  const sh = [tx + rs * 6.3, chestY + 0.4], elb = [tx + rs * 9.4, chestY + 6.8], hd = [tx + rs * 10.8, chestY + 12.2 - s * a * 0.4];
  const lean = rs * 0.05, d = [Math.sin(lean), -Math.cos(lean)], nr = [-d[1], d[0]];
  const at = (t, w = 0) => [hd[0] + d[0] * t * K + nr[0] * w * K, hd[1] + d[1] * t * K + nr[1] * w * K];
  const bz = 5.4, cx = at(22.6);
  px.part(); px.tag("staff");
  px.capsule(...at(-11), 0.95 * K, ...at(19), 0.9 * K, WOOD, bz, { edge: true });
  px.capsule(...at(-11), 1.2 * K, ...at(-9.8), 1.2 * K, SILVER, bz + 0.02);
  px.capsule(...at(15.4), 1.4 * K, ...at(17), 1.3 * K, SILVER, bz + 0.03);
  px.part();
  for (const q of [-1, 1]) { px.line(...at(17, 0.4 * q), ...at(20, 2.6 * q), SILVER, bz + 0.05, { fix: 3 }); px.line(...at(20, 2.6 * q), ...at(24, 2 * q), SILVER, bz + 0.05, { fix: 3 }); }
  const c0 = at(21.6), g = p.glow || 0;
  px.ellipse(c0[0], c0[1], 2.3 * K, 2.7 * K, CRYS, bz + 0.08);
  px.dot(cx[0] - 0.6, cx[1] - 0.8, CRYS_C, bz + 0.1);
  if (g > 0.5) px.ellipse(cx[0], cx[1], 1 + g, 1 + g, CRYS_C, bz + 0.12);
  px.tag(null);
  // the sleeve to the fist
  px.part(); px.tag("nearArm");
  px.capsule(sh[0], sh[1] + 0.4, 2.7, elb[0], elb[1], 2.8, ROBE, 5.9, { cast: 2 });
  px.capsule(elb[0], elb[1], 3, hd[0], hd[1], 2.4, ROBE, 5.9, { cast: 2 });
  px.line(hd[0] - 2, hd[1] - 1.4, hd[0] + 2, hd[1] - 1.4, SILVER, 5.95);
  px.part(); px.ellipse(hd[0], hd[1] + 0.4, 2.1, 2.1, SKIN, 6.1); px.tag(null);

  // the head
  px.part();
  px.stamp(s > 0 ? (p.blink ? blinkOf(FRONT_H) : FRONT_H) : BACK_H, hx, Math.round(hy), LEG, 6.4, { ax: 7, ay: 13, ball: [7.5, 6.5, 8, 7.3], cast: 2, edge: true });

  const lights = [{ x: cx[0], y: cx[1], r: (16 + 26 * g) * K, col: "#8ad8ff", k: cl(0.5 * g, 0, 0.7) }];
  return { crystal: cx, crackle: 0, lights, marks: { tip: cx } };
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "storm-front", BOX: { w: 120, h: 104, ox: 44, oy: 88 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "storm-back", BOX: { w: 120, h: 104, ox: 44, oy: 88 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
