// ============ FIGURE: the Rime Huscarl (game type `huscarl`) ============
// The clans' heavy: a hearth-guard in ring mail to the knee under a mantle of white
// fur, a horned spangenhelm with a nasal and a mail curtain, a great round shield
// painted in quarters (ochre and sea-teal) hauled up to the chin, and a long-hafted
// Dane axe. Bigger than a thrall (about 56 px with the horns). Look c, "bold", as the
// thrall: the same hands, the same fur, the same sea-teal and ochre, only heavier.
// Clips: idle, walk (8 frames, a heavy shield-up tread), attack (12 frames, a
// shield shove into an overhead chop that lands at 0.56).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, solve, HUMAN, scaled } from "./rig.js";

const SKIN = mat("#e2b48c"), TEAL = mat("#3a5a66"), TEAL_D = mat("#2a5260"), WOOL = mat("#6e5a44"), LEATHER = mat("#5a3e2a");
const MAIL = mat("#8a929c", { contrast: 1.25 }), MAIL_D = mat("#5a626e"), FURW = mat("#e8e6e0"), OCHRE = mat("#e0b050"), IRON = mat("#7e8692", { contrast: 1.3 }), IRON_D = mat("#5e646e");
const STEEL = mat("#d0d4da", { contrast: 1.3 }), WOOD = mat("#7a5632"), COPPER = mat("#c07a44"), BONE = mat("#ece0c4"), BRASS = mat("#c8a040");
const EYE = flat("#2a1c2c"), FROST = flat("#eaf6ff"), SMEAR = flat("#f4f8ff", { emis: true, line: "#b8c8d8" });

// The head, facing +x a quarter turned: the spangenhelm (M iron, m a tone down, B a brass
// band, D the nasal), a mail curtain down the back and cheek (K), skin (S, s, N the nose),
// eyes (E), a copper forked beard (R).
const TOP = [".....MMMM....", "...MMMMMMMM..", "..MMmMMMMMMM.", ".BBBBBBBBBBB.", ".KMMsDDsDDs.."];
const FACE = [".KMMSESDSES..", ".KmMSESDSESN.", ".KKMSSSDSSSN.", ".KKmRRRRRRR..", "..KRRRRRRRR..", "..KKRRRRR.R.."];
const HEAD = [...TOP, ...FACE], BLINK = HEAD.map((r, i) => (i === 5 || i === 6 ? r.replace(/E/g, "S") : r));
const LEG = {
  M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, B: { m: BRASS, fix: 3 }, K: { m: MAIL, fix: 2 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  E: { m: EYE }, R: { m: COPPER, fix: 2 },
};

export const BOX = { w: 108, h: 96, ox: 44, oy: 86 };
export const MUST = [["nearArm", "notOver", "eyes"], ["axe", "sameSide", "nearHand"], ["shield", "visible", 0.4]];   // the great shield sits behind the body (z 1.5); the axe lies over it on recovery by design (the axe is nearer the viewer)
// THE GRIP: the axe's angle (from upright, + toward the foe) is DERIVED from the solved near forearm:
// forearm direction (elbow -> hand) + GRIP + a wrist of +-0.35, never posed on its own. Measured from his guard (-1.87).
export const GRIP = -1.8, WRIST = 0.35;
const forearm = (sk) => { const f = Math.atan2(sk.hdN[0] - sk.eN[0], -(sk.hdN[1] - sk.eN[1])); return f < -1.9 ? f + Math.PI * 2 : f; };
export const axeAngle = (sk) => forearm(sk) + GRIP + Math.max(-WRIST, Math.min(WRIST, sk.p.wrist || 0));
export const BONES = scaled(HUMAN, 1.2, { shN: -3.6, shF: 3.6, hipN: -1.6, hipF: 1.8, neck: 1.4 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// the long-hafted Dane, PI/2 level before him
const axe = (px, h, a) => {
  const L = 19, k = 1.5, d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)];
  const at = (f, s) => [h[0] + d[0] * f + n[0] * s, h[1] + d[1] * f + n[1] * s];
  px.part();
  px.capsule(...at(-4, 0), 0.9, ...at(L + 1, 0), 0.9, WOOD, 8.1, { edge: true });
  px.part();
  px.poly([at(L - 2.2 * k, 0.4), at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.6 * k), at(L + 1.6 * k, 3.2 * k), at(L + 1.6 * k, 0.4)], STEEL, 8.12, { fix: 2 });
  px.poly([at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.6 * k), at(L + 1.6 * k, 3.2 * k), at(L + 1 * k, 2.6 * k), at(L - 1 * k, 3.4 * k)], STEEL, 8.13, { fix: 4 });
  px.poly([at(L - 1.6, -0.4), at(L + 1.2, -0.4), at(L + 1.4, -4.2)], IRON_D, 8.11, { fix: 1 });
  px.poly([at(L - 2.6, -0.8), at(L + 1.8, -0.8), at(L + 1.8, 0.9), at(L - 2.6, 0.9)], IRON_D, 8.14, { fix: 1 });
  px.dot(...at(L - 6, 0), BRASS, 8.15, { fix: 3 });
  return at;
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // a horn, thick at the root and curling out and up, banded in brass
  const horn = (x0, y0, dir, z) => {
    const pts = [[x0, y0, 2.4], [x0 + dir * 3.2, y0 - 1, 2], [x0 + dir * 5.2, y0 - 3.6, 1.5], [x0 + dir * 5.6, y0 - 6.6, 0.9], [x0 + dir * 4.8, y0 - 8.6, 0.4]];
    for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
  };
  px.part(); horn(hx - 3.4, hy - 8.6, -1, 0.7);

  // the far arm and the great shield, up to the chin
  px.part();
  px.capsule(sF[0], sF[1], 2.4, eF[0], eF[1], 2.2, MAIL_D, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.2, hdF[0], hdF[1], 1.9, MAIL_D, 1, { bias: -1 });
  const R = 10.4, sx = hdF[0] + 2.6, sy = hdF[1] - 2.4;
  px.part(); const shId = px._pid;
  px.ellipse(sx, sy, R, R, OCHRE, 1.5, { round: 0.55, cast: 1 });
  // the quarters: two opposite teal wedges
  const wedge = (a0) => { const pts = [[sx, sy]]; for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); pts.push([sx + Math.cos(a) * R * 0.94, sy + Math.sin(a) * R * 0.94]); } px.poly(pts, TEAL_D, 1.52, { round: 0.6 }); };
  wedge(0); wedge(Math.PI);
  px.ellipse(sx, sy, R * 0.22, R * 0.22, IRON, 1.56, { cast: 1 });
  px.toneLine(sx - R * 0.7, sy - R * 0.7, sx + R * 0.7, sy + R * 0.7, -1, shId);
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + 0.2; px.dot(sx + Math.cos(a) * R * 0.9, sy + Math.sin(a) * R * 0.9, STEEL, 1.57, { fix: 3 }); }

  // legs: wool wraps, iron-shod boots, fur cuffs
  for (const [h, k, a, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(h[0], h[1], 2.9, k[0], k[1], 2.4, WOOL, z, { bias: b });
    px.capsule(k[0], k[1], 2.4, a[0], a[1], 1.9, WOOL, z, { bias: b });
    const w0 = mix(k, a, 0.42);
    px.capsule(w0[0], w0[1], 2.4, a[0], a[1], 2.1, LEATHER, z + 0.03, { bias: b });
    px.capsule(a[0] - 0.4, a[1] + 0.5, 1.7, a[0] + 3.8, a[1] + 0.8, 1.3, LEATHER, z + 0.03, { bias: b });
    px.capsule(w0[0] - 2, w0[1] - 0.2, 1.2, w0[0] + 2, w0[1] + 0.2, 1.2, FURW, z + 0.05, { bias: b });
  }

  // the hauberk: ring mail to the knee, a teal sash and belt, its hem a beat behind
  const hem = P[1] + 5, hF2 = P[0] + 6 - vx * 0.8, hB = P[0] - 6.4 - vx * 1.4 - vx2 * 0.6;
  px.part(); const mId = px._pid;
  px.poly([[C[0] - 5.4, C[1] - 1.6], [C[0] + 5.4, C[1] - 1.6], [C[0] + 6.2, C[1] + 3.4], [P[0] + 5.6, P[1] - 2.4], [hF2, hem], [hF2 - 3.4, hem + 0.8], [P[0] - 0.4 - vx, hem], [hB + 3, hem + 0.8], [hB, hem], [P[0] - 5.6, P[1] - 2.4], [C[0] - 6.4, C[1] + 3.4]], MAIL, 4, { round: 0.9, ny: -0.1, cast: 1 });
  px.toneLine(P[0] + 0.6, P[1] - 0.6, P[0] + 0.2 - vx, hem - 0.6, -1, mId);
  // ring texture: a lattice of dark dots
  for (let yy = C[1] + 1; yy < hem - 1; yy += 2.6) for (let xx = -4.4; xx <= 4.6; xx += 3) { const sh = ((yy - C[1]) / 2.6 | 0) % 2 ? 1.5 : 0; if (yy < P[1] - 2 || Math.abs(xx) < 4) px.dot(C[0] + xx + sh + (yy - C[1]) / 12 * 0.5, yy, MAIL_D, 4.08, { noLine: true }); }
  px.poly([[C[0] - 1.6, C[1] + 1], [C[0] + 2.4, C[1] + 1], [P[0] + 2.8 - vx * 0.3, hem - 0.2], [P[0] - 1.6 - vx * 0.3, hem - 0.2]], TEAL, 4.12, { round: 0.9 });
  px.poly([[P[0] - 5.6, P[1] - 3.4], [P[0] + 5.6, P[1] - 3.4], [P[0] + 5.7, P[1] - 1.2], [P[0] - 5.6, P[1] - 1.2]], LEATHER, 4.2, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3.2, 2.6, 2.2, BRASS, 4.25, { fix: 3 });
  // the mantle of white fur over the shoulders, shaggy at its edge
  px.part();
  px.ellipse(C[0] + 0.2, C[1] + 0.4, 10, 4.4, FURW, 4.4, { cast: 1 });
  px.ellipse(sN[0] - 0.4, sN[1] + 0.2, 5.4, 4.8, FURW, 8, { cast: 1 });
  for (const x of [-8.4, -5.8, -3, -0.2, 2.6, 5.4, 8]) px.dot(C[0] + 0.2 + x, C[1] + 3.6 + Math.abs(x) * -0.12 + (x & 1), FURW, 4.4);
  for (const x of [-6, -3, 0, 3, 6]) px.dot(C[0] + x, C[1] + 5.4 + (x & 1), FURW, 4.4);

  // the head
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  px.part();
  horn(hx + 2.4, hy - 8.6, 1, 6.6);
  px.dot(hx + 3.2, hy - 9.4, BRASS, 6.7, { fix: 3 }); px.dot(hx - 3.2, hy - 9.4, BRASS, 6.7, { fix: 3 });
  px.dot(hx, hy - 10, BRASS, 6.7, { fix: 3 });

  // the near arm over it all: mail sleeve, a fur cuff, the axe in the fist
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.6, 2.5, eN[0], eN[1], 2.2, MAIL, 7.9, { cast: 1 });
  px.capsule(eN[0], eN[1], 2.2, hdN[0], hdN[1], 1.9, MAIL, 7.9, { cast: 1 });
  const c0 = mix(eN, hdN, 0.7);
  px.capsule(c0[0], c0[1], 2.1, hdN[0], hdN[1], 2, FURW, 7.95, { cast: 1 });
  px.tag(null);
  const ax = axeAngle(sk);
  px.part(); px.tag("axe");
  axe(px, hdN, ax);
  px.tag(null);
  px.part(); px.tag("nearHand");
  px.ellipse(hdN[0], hdN[1], 1.8, 2.3, SKIN, 8.3, { rot: -ax });
  px.tag(null);

  return { bite: [hdN[0] + 10, hdN[1] + 4] };
};

// the chop's smear
const T0 = 0.44, T1 = 0.56;
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack" || ph < T0 || ph > T1 + 0.14) return;
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const q = Math.max(T0, Math.min(ph, T1 + 0.03) - i * 0.012), s = solve(CLIPS.attack.pose(q), BONES), a = axeAngle(s), d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)], h = s.hdN, L = 19;
    pts.push([[h[0] + d[0] * (L + 2) + n[0] * 3, h[1] + d[1] * (L + 2) + n[1] * 3], [h[0] + d[0] * (L - 4) + n[0] * 4.6, h[1] + d[1] * (L - 4) + n[1] * 4.6]]);
  }
  for (let i = 0; i + 1 < pts.length; i++) px.poly([pts[i][0], pts[i + 1][0], pts[i + 1][1], pts[i][1]], SMEAR, 20 - i, { noLine: true });
};

const GUARD = { drop: 1.4, lean: 0.1, hx: 0.8, hy: 0, aN: [0.1, 0.92, 0], aF: [1.3, 0.76, 0], fN: [-3.4, 0], fF: [3.6, 0]};
export const CLIPS = {
  idle: {
    n: 8, ms: 1700, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * Math.PI * 2), u = 0.5 + 0.5 * b;
      return { ...GUARD, rise: 0.7 * u, drop: 1.4 + 0.4 * (1 - u), aN: [0.1 + 0.04 * b, 0.92, 0], aF: [1.3 - 0.04 * b, 0.76 + 0.03 * u, 0], blink: ph >= 0.84 && ph < 0.96 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 900, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 4.4, lift: 2.4, swing: 0.3, bob: 1.1, lean: 0.1 }), a = Math.cos(ph * Math.PI * 2);
      return { ...w, drop: w.drop + 1, aN: [-a * 0.3 + 0.5, 0.86, 0], aF: [1.3 + 0.06 * a, 0.76, 0]};
    },
  },
  attack: {
    n: 12, ms: 900, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // the shield thrust out to shove, then the axe hauled up and back
      { t: 0.18, e: "out", p: { ...GUARD, rx: -1.4, drop: 2, lean: 0.04, aF: [1.42, 0.9, 0], aN: [1.4, 0.92, 0]} },
      { t: 0.32, e: "out", p: { ...GUARD, rx: -2.4, drop: 2.2, lean: -0.02, twist: -0.4, hx: 0.2, aN: [2.8, 0.92, 0], aF: [1.0, 0.8, 0], fF: [3.6, 1.4] } },
      { t: T0, e: "io", p: { ...GUARD, rx: -3, drop: 1.8, lean: -0.08, twist: -0.5, hx: 0.2, aN: [3.0, 0.94, 0], aF: [1.0, 0.8, 0], fF: [3.6, 2.2] } },
      // the chop: a step in, the blade comes down before him
      { t: T1, e: "in3", p: { ...GUARD, rx: 3.6, drop: 3, lean: 0.5, twist: 0.5, hx: 2.4, hy: 0.6, aN: [0.75, 1, 0], aF: [1.3, 0.8, 0], fF: [8.4, 0] } },
      { t: 0.66, e: "out", p: { ...GUARD, rx: 4.2, drop: 3.4, lean: 0.56, twist: 0.6, hx: 2.6, hy: 0.8, aN: [0.65, 1, 0], aF: [1.34, 0.8, 0], fF: [8.4, 0] } },
      { t: 0.84, e: "io", p: { ...GUARD, rx: 1.6, drop: 1.6, lean: 0.24, aN: [0.9, 0.8, 0], fF: [6.4, 1.6] } },
      { t: 1, e: "out", p: GUARD },
    ], ph),
  },
};
