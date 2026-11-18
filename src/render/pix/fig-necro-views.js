// ============ CONCEPT FIGURES: the Necromancer seen from the FRONT and from BEHIND ============
// The necromancer of fig-necro.js (approved: never edited) walking toward the camera (FRONT) and away
// (BACK): the same gaunt stoop, near-black violet robe with its torn hem and violet seam, tattered
// cape, deep cowl with a grave-pale face and witch-lit eyes, the staff with its skull and violet shard.
// One drawer, `make(s)`: s = +1 front, -1 back. The staff is in his LEFT hand (screen RIGHT in front,
// screen LEFT from behind: `ls`), the long free right arm hangs on `rs`. The cape hangs behind him: in
// FRONT it only frames the robe; from BEHIND it is the whole back. Unflipped, one sun upper left.
// Same clip as the side walk (n, ms, phase), the staff planted in time as there; the `light` the side
// returns for the shard's glow is returned here too.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-necro.js";

const ROBE = mat("#2c2850", { contrast: 0.9 }), COWL = mat("#4a4074"), CAPE = mat("#2c2538", { contrast: 0.9 }), TRIM = mat("#5a4a8c"), SKIN = mat("#c8c0b0"), BONE = mat("#d8d0b8");
const WOOD = mat("#54424a"), BRONZE = mat("#a8803c", { contrast: 1.15 }), CRYS = mat("#b08ad8", { contrast: 1.25 }), BOOT = mat("#2c2430");
const VOID = flat("#17121e"), SOCK = flat("#1c1426");
const EYE = flat("#d6b4ff", { emis: true }), EYE_DIM = flat("#7c5cae", { emis: true }), EYE_HOT = flat("#f3e6ff", { emis: true });
const GLOW = flat("#c39cf4", { emis: true, line: "#6a4aa6" }), HOT = flat("#f6ecff", { emis: true, line: "#b08ad8" });
const F_TEAL = flat("#7ce0b8", { emis: true, line: "#2f8a72" });

// FRONT cowl: a wide hood round a dark opening (I), a violet lip (V) with the sun-caught edge (K, left),
// the face in it toned by hand (d deep, s shade, S pale, H highlight), sockets e with eye light E, the
// nose, the mouth m, a gaunt chin. 15 wide, centre column 7.
const FRONT_H = [
  "....CCCCCCC....",
  "..CCCCCCCCCCC..",
  ".CKKKKKCCCCCCc.",
  ".CKVVVVVVVVVCc.",
  "CCKVIIIIIIIVCCc",
  "CCKVIdddddIVCCc",
  "CCKVIdsSSSdIVCc",
  "CCKVIeeSSeeIVCc",
  "CCKVIEeSSeEIVCc",
  "CCKVIsSHHSsIVCc",
  "CCKVIdsHHsdIVCc",
  "CCKVIdsmmsdIVCc",
  "CCCKVIdSSdIIVCc",
  ".CCCKVIIIIIVCc.",
  "..CCCKVVVVVVc..",
  "...cCCCCCCCc...",
];
// BACK cowl: the back of the hood: a seam down the middle, a fold either side, the violet hem, the point.
const BACK_H = [
  "....CCCCCCC....",
  "..CCCKCCCCCCC..",
  ".CKKKKKCCCCCCc.",
  ".CKCCCCICCCCCc.",
  "CCKCCCCICCCCCCc",
  "CKKCCCCICCCCCCc",
  "CCKCCCVIVCCCCCc",
  "CCKCCCVIVCCCCCc",
  "CCKCCCcIcCCCCCc",
  "CCKCCCCICCCcCCc",
  "CCCCCCCICCCCCCc",
  "CCCCCCCICCCCCCc",
  "cCCCCCCICCCCCcc",
  ".cCCCCVVVCCCcc.",
  "..cCCCVVVCCcc..",
  "...cccVVVcccc..",
];
const legend = (eye) => ({
  C: { m: COWL }, c: { m: COWL, bias: -1 }, K: { m: COWL, bias: 1 }, V: { m: TRIM }, I: { m: VOID },
  d: { m: SKIN, fix: 0 }, s: { m: SKIN, fix: 1 }, S: { m: SKIN, fix: 2 }, H: { m: SKIN, fix: 3 }, N: { m: SKIN, fix: 3 },
  e: { m: SOCK }, E: { m: eye }, m: { m: SKIN, fix: 0 },
});
const LEG = legend(EYE), LEG_DIM = legend(EYE_DIM), LEG_HOT = legend(EYE_HOT);
const SKULL = [".BBBB", "BBBBB", "BeBBe", ".BBBB", ".bBbB"];
const SKULL_LEG = { B: { m: BONE }, b: { m: BONE, bias: -1 }, e: { m: SOCK } };

// ragged edges: [t along the hem, how far the cloth is torn up]
const TAT = [[1, 0.5], [0.86, 4.2], [0.72, 0], [0.56, 5], [0.4, 0.3], [0.27, 4], [0.12, 0], [0, 2.4]];
const CTAT = [[1, 3.4], [0.84, 0.4], [0.68, 5], [0.5, 0], [0.34, 4.6], [0.16, 0.2], [0, 3]];
const FWD = 0.4, STAFF = 43, TAU = Math.PI * 2;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const make = (s) => (px, F, o = {}) => {
  const rs = -s, ls = s;                                    // screen side of his right / left
  const { sk, ph } = F, p = sk.p;
  const lagT = 0.09;
  const sw = (t) => rs * 0.7 * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - lagT), sx2 = sw(ph - lagT * 2);
  const hipY = sk.P[1], chestY = sk.C[1], hy = Math.round(sk.N[1]), hx = Math.round(sx * 0.6);
  const vy = cl(sk.N[1] - F.lag1.N[1], -2, 2);
  const vx = cl((sx - sx1) * 1.3, -2, 2), vx2 = cl((sx1 - sx2) * 1.3, -2, 2);
  const w1 = (F.lag1.p.sway || 0) - (F.lag1.p.gust || 0) * 1.6, w2 = (F.lag2.p.sway || 0) - (F.lag2.p.gust || 0) * 2.2;
  const g = p.glow || 0, lift = p.lift || 0;
  const hemY = -0.8, top = chestY - 2.2, flare = 8.2 + 0.4 * Math.abs(Math.sin(ph * TAU));
  const hemL = hx - flare, hemR = hx + flare, hm = (t) => hemL + (hemR - hemL) * t;
  const tipD = -vx * 0.6 - vx2 * 0.8 + w2 * 0.7;

  // ---- the cape: front, only its edges frame the robe behind; behind, the whole back of him (drawn over the robe)
  {
    const d2 = -vx * 1.0 - vx2 * 1.4 + w2 * 0.6, topC = chestY - 3.8, botY = s > 0 ? -2.6 : -2.2;
    const wL = hx - flare - (s > 0 ? 1.2 : 0.2) + d2 * 0.3, wR = hx + flare + (s > 0 ? 1.2 : 0.2) + d2 * 0.3;
    const cm = (t) => wL + (wR - wL) * t;
    px.part(); const cid = px._pid;
    px.poly([[sx - 5.6, topC], [sx + 5.6, topC], [sx + 6.4, chestY + 5], [hx + 7, hipY - 2], [wR, botY - 1],
      ...CTAT.map(([t, dp]) => [cm(t) + (dp < 1 ? d2 * 0.3 : 0), botY - dp]),
      [wL, botY - 1], [hx - 7, hipY - 2], [sx - 6.4, chestY + 5]], CAPE, s > 0 ? 0.4 : 5, { round: 0.9, cast: s < 0 ? 1 : 0 });
    if (s < 0) {
      px.toneLine(hx - 3.4, hipY - 2, cm(0.28), botY - 5, -1, cid);
      px.toneLine(hx + 3.2, hipY - 1, cm(0.74), botY - 5, 1, cid);
      px.toneLine(sx, topC + 4, hx, hipY - 3, -1, cid);                            // the cape's centre seam
      px.poly([[sx - 5.2, topC - 0.2], [sx + 5.2, topC - 0.2], [sx + 5.4, topC + 1.6], [sx - 5.4, topC + 1.6]], TRIM, 5.05, { round: 0.8 });   // the cape's collar band
      px.part(); px.dot(sx, topC + 3.2, BRONZE, 5.1, { fix: 3 });                  // its clasp
    }
  }

  // ---- the staff, in his left fist, standing out from his side: planted as the body passes it, then swung on ahead
  const SX = ls * 10.6 + sx * 0.6, hgY = hipY - 4;
  const fY = s * ((p.sx ?? 9) - 9) * 0.25 - lift * 0.9 - 0.4;
  const tipY = fY - STAFF, tipX = SX;
  const at = (a, b) => [tipX + b, tipY - a];
  const orb = at(8.6, 0), T = at(13.4, 0), Bm = at(4.4, 0), Lf = at(8, -2.6), Rt = at(8, 2.6), Md = at(8, 0);
  px.part();
  px.capsule(SX, fY, 0.95, tipX, tipY, 0.95, WOOD, 1.5, { edge: true });
  px.part();
  px.capsule(...at(-1.8, 0), 1.4, ...at(-0.4, 0), 1.6, BRONZE, 1.55);
  px.part();
  if (g > 0.6) { px.poly([T, Rt, Bm, Lf], GLOW, 1.6); px.poly([at(12, 0), at(8.2, 1.5), at(6, 0), at(8.2, -1.5)], HOT, 1.62); }
  else if (g > 0.3) { px.poly([T, Rt, Bm, Lf], GLOW, 1.6); px.poly([at(10.6, 0), at(8.2, 0.9), at(6.8, 0), at(8.2, -0.9)], HOT, 1.62); }
  else {
    px.poly([T, Md, Bm, Lf], CRYS, 1.6, { n: [-0.55, -0.45, 0.7] });
    px.poly([T, Rt, Bm, Md], CRYS, 1.6, { n: [0.7, 0.35, 0.62] });
    if (g > 0.2) px.dot(...at(9, -0.6), HOT, 1.62); else px.dot(...at(10, -0.9), CRYS, 1.62, { fix: 4 });
  }
  px.part();
  { const sp = at(2.4, 0); px.stamp(SKULL, sp[0] - 2, sp[1] - 2.5, SKULL_LEG, 1.64, { ball: [2.2, 2, 3, 3] }); }

  // ---- the left arm (staff side): a long thin arm in a belled sleeve, the fist round the shaft
  {
    const sh = [ls * 4.4 + sx, chestY + 0.8], el = [ls * 7.6 + sx * 0.8, chestY + 8.4], fist = [SX, hgY], wr = mix(el, fist, 0.7);
    px.part();
    px.capsule(sh[0], sh[1], 2.2, el[0], el[1], 2.2, COWL, 4.6, { bias: -1 });
    px.capsule(el[0], el[1], 2.2, wr[0], wr[1], 2.8, COWL, 4.6, { bias: -1 });
    px.poly([[wr[0] - 3, wr[1] - 0.2], [wr[0] + 3, wr[1] - 0.2], [wr[0] + 3, wr[1] + 1.5], [wr[0] - 3, wr[1] + 1.5]], TRIM, 4.65, { bias: -1 });
    px.part(); px.ellipse(fist[0], fist[1] + 0.8, 2.4, 2.6, SKIN, 4.7, { bias: -1 });
    px.dot(fist[0] - 1, fist[1] - 0.2, SKIN, 4.75, { fix: 0 }); px.dot(fist[0] - 1, fist[1] + 1.8, SKIN, 4.75, { fix: 0 });   // fingers closed over the shaft
    px.dot(fist[0] + ls * 0.6, fist[1] - 0.2, SKIN, 4.72);
  }

  // slippers under the hem
  for (const [f, side, zz] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lf = f[1], fx = hx + side * 3.6, fy = cl(0.9 + s * f[0] * FWD * 0.5 - lf * 0.4, 0.2, 1.8);
    px.part();
    px.capsule(fx, hemY - 3, 1.5, fx, fy, 1.4, BOOT, 3.6, { fix: side === rs ? 1 : 0 });       // the shin, hidden under the hem, so the foot hangs from it
    px.ellipse(fx, fy + 0.4, 2.2 + (s > 0 ? 0.4 : 0), 1.2, BOOT, 3.7 + zz * 0.01, { fix: side === rs ? 1 : 0 });
  }

  // ---- the robe: narrow shoulders to a torn hem
  px.part(); const robeId = px._pid;
  px.poly([[sx - 4.2, top], [sx + 4.3, top], [sx + 5, chestY + 3], [hx + 4.7, hipY - 2],
    ...TAT.map(([t, dp]) => [hm(t) + (dp < 1 ? tipD : tipD * 0.4), hemY - dp]),
    [hx - 4.7, hipY - 2], [sx - 5.2, chestY + 3]], ROBE, 4, { round: 0.9, cast: 1, edge: true });
  px.toneLine(hx - 2, hipY + 2, hm(0.3), hemY - 5, -1, robeId);
  px.toneLine(hx - 4, hipY + 4, hm(0.1), hemY - 5, 1, robeId);
  px.toneLine(hx + 3, hipY + 1, hm(0.86), hemY - 5, 1, robeId);
  if (s > 0) {
    px.line(sx, top + 3, hx, hipY - 2, TRIM, 4.04);                              // the violet seam down the front
    px.line(hx, hipY - 2, hm(0.5), hemY - 5, TRIM, 4.04);
  }
  px.poly([[hx - 4.9, hipY - 3.3], [hx + 4.9, hipY - 3.3], [hx + 4.9, hipY - 1.7], [hx - 4.9, hipY - 1.7]], BRONZE, 4.05, { round: 0.94, bias: -1 });
  const bw = cl(-(sx - sx1) * 1.1, -1.5, 1.5);
  px.part();
  if (s > 0) {
    px.rect(hx - 1, hipY - 3.7, 2, 2.4, BRONZE, 4.3, { fix: 3 });                  // the bronze disc at the belt
    px.rect(sx - 1 + bw * 0.4, chestY + 3.6, 2, 2, BRONZE, 4.3, { fix: 3 });          // the amulet
    px.dot(sx + bw * 0.4, chestY + 4.6, F_TEAL, 4.31);
    px.line(hx + 3, hipY - 1.6, hx + 3 + bw * 0.6, hipY + 0.6, BONE, 4.2, { fix: 2 });
  } else px.line(hx - 3, hipY - 1.6, hx - 3 + bw * 0.6, hipY + 0.6, BONE, 4.2, { fix: 2 });   // the finger bones at the back hip

  // ---- the right arm (free): long and thin in a belled sleeve with a violet cuff, bony fingers hanging
  {
    const ang = p.aN[0];
    const sh = [rs * 4.4 + sx, chestY + 0.8], el = [rs * 7.2 + sx * 0.8, chestY + 8.4], hand = [rs * 6.6 + sx * 0.8, chestY + 15.6 + s * ang * 2.2], wr = mix(el, hand, 0.76);
    px.part(); px.tag("nearArm");
    px.capsule(sh[0], sh[1], 2.4, el[0], el[1], 2.3, COWL, 8, { cast: 2 });
    px.capsule(el[0], el[1], 2.3, wr[0], wr[1], 3, COWL, 8, { cast: 2 });
    px.poly([[el[0] - 2.4, el[1] + 2.4], [el[0] + 2.4, el[1] + 2.4], [wr[0] + rs * 0.4 + w1 * 0.5, wr[1] + 2.6], [wr[0] - rs * 0.4, wr[1] + 2.6]], COWL, 7.95, { round: 0.6, cast: 1, bias: -1 });
    px.poly([[wr[0] - 3.2, wr[1] - 0.6], [wr[0] + 3.2, wr[1] - 0.6], [wr[0] + 3.2, wr[1] + 1.2], [wr[0] - 3.2, wr[1] + 1.2]], TRIM, 8.02, { bias: 1 });
    const hb = [Math.round(hand[0]) + 0.5, Math.round(hand[1] + 1.4) + 0.5];
    px.part();
    px.ellipse(hb[0], hb[1], 1.7, 1.5, SKIN, 9.5, { cast: 1 });
    for (let i = -1; i <= 1; i++) {
      const a = Math.PI / 2 + i * 0.4, L = 3;
      px.line(hb[0], hb[1] + 0.6, hb[0] + Math.cos(a) * L, hb[1] + 0.6 + Math.sin(a) * L, SKIN, 9.5, { bias: i > 0 ? -1 : 0 });
    }
    px.tag(null);
  }

  // ---- the cowl: its point trails the head; then the head
  {
    const bend = cl(vx * 2.2 + vx2 * 1.6 + w2 * 0.6, -2, 3), dr = cl(-vy * 1.3, -1.2, 1.8), tp = hy - 13, tx = hx - 5 * s;
    px.part();
    px.poly([[hx - 4.4, tp + 3], [hx + 4.4, tp + 3], [hx + 3.4 + bend * 0.4, tp - 1.8 + dr * 0.3], [tx - bend * 0.8, tp - 5 + dr * 0.7], [tx - 3 * s - bend - 1, tp - 4.4 + Math.abs(bend) * 0.4 + dr],
      [hx - 1.4 + bend * 0.4, tp - 0.6 + dr * 0.4], [hx - 3, tp + 1]], COWL, 8.95, { round: 0.85, ny: -0.2 });
    px.part();
    px.stamp(s > 0 ? FRONT_H : BACK_H, hx, hy, s > 0 ? (p.eye > 0.5 ? LEG_HOT : p.eye < -0.5 ? LEG_DIM : LEG) : LEG, 9, { ax: 7, ay: 13, ball: [6, 7, 8.5, 9], cast: 1 });
  }

  const k = cl(g, 0, 1.4);
  return {
    light: k > 0.05 ? { x: orb[0], y: orb[1], r: 22 + 34 * cl(k, 0, 1), col: p.flare > 0.5 ? "#a8f4d0" : "#b388ff", k } : null,
    orb, tip: [tipX, tipY], foot: [SX, fY], d: [0, -1], nn: [1, 0], hemB: hemL, hemF: hemR, feet: [hx, 0],
  };
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "necro-front", BOX: { w: 64, h: 90, ox: 32, oy: 82 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "necro-back", BOX: { w: 64, h: 90, ox: 32, oy: 82 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
