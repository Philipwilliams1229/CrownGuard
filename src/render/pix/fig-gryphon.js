// ============ FIGURE: the Gryphon Knight (game type `gryphon`) and its empty mount (`gryphonMount`) ============
// The Iron Kingdom's air cavalry: an armoured war-gryphon with an eagle's head (cream, a hooked
// golden beak, a fierce gold eye under a steel brow plate with a spike), a steel crinet down the
// neck and a steel peytral over the feathered brown breast studded in brass; a lion's tawny barrel
// and haunch under a steel crupper plate, lion's hind legs trailing, eagle's forelegs with golden
// talons, a lion's tail ending in a dark tuft. Brown wings with plated leading edges and five
// primaries spread at the tips. On its back an oxblood saddle cloth (the grey tower on it) and
// the same Iron knight as the cavalier and the unseated knight (blued plate, sallet with an
// oxblood crest, oxblood surcoat), his lance carried raised, his far fist in the crinet.
// About 70 px tall with the wings raised and the lance, 40 px of body and tail behind the neck.
//   o.variant === "loose": the same beast with NO rider (the game crumbles it when the knight
//   dies: `gryphonMount`): the saddle empty, the stirrup swinging, the reins streaming from the bit.
// It does not walk: each clip's pose is a few numbers of its own (see the poses below), `walk`
// IS the wingbeat (the board plays it on a clock; `idle` is the same). Wing, tail and plume
// each ask the same beat for an EARLIER moment (lag1, lag2), which is what makes them trail.
// Clips: idle / walk (8-frame wingbeat), attack (the air strike: the beast rears on a raised wing,
// the knight sits back and draws the lance in, the downstroke drives it out level, the talons
// rake, the wings sweep back up; `hit` is the lance landing).
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys, ik } from "./rig.js";

const TAWNY = mat("#b08850"), CREAM = mat("#e8e0cc"), MANE = mat("#8a6a3e"), WING = mat("#7a5a3c"), WINGD = mat("#4e3828"), GOLD = mat("#d8a838", { contrast: 1.2 });
const STEEL = mat("#8a90a0", { contrast: 1.3 }), STEELB = mat("#c4c8d0", { contrast: 1.3 }), IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), BRASS = mat("#c8a040", { contrast: 1.2 }), LEATHER = mat("#5a3c28"), GREY = mat("#8e94a2", { contrast: 1.2 }), CREAMC = mat("#e6dfd0");
const SKIN = mat("#e0b088"), EYEK = flat("#2a1c2c"), BROW = mat("#4a3426"), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 });
const EYE = flat("#f0c040", { emis: true }), PUPIL = flat("#1a1016"), SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

export const BOX = { w: 112, h: 72, ox: 48, oy: 70 };
export const BONES = HUMAN;                  // unused: a flier poses itself

const TAU = Math.PI * 2;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

// ---- the eagle's head, facing +x: C cream (c a tone down), P the steel brow plate (p its dark
// underside), E the gold eye (e the pupil), B the golden beak (b its mouth line, k the hooked tip) ----
const HEAD = [
  ".....CCCC..........",
  "...CCCCCCCPP.......",
  "..CCCCCCPPPPPP.....",
  ".CCCCCCCPPPPPPP....",
  ".CCCCCCCpEEpBBBB...",
  "CCCCCCCCCEeEBBBBBB.",
  "CCCCCCCCCCcBBBBBBBB",
  ".cCCCCCCCCcBBbbBBBB",
  ".ccCCCCCCCcBBBBBBBk",
  "..cccCCCCCcBBBBBBk.",
  "....ccccccBBBBBk...",
  "..........BBBk.....",
  "...........kk......",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const CRY = swap(HEAD, { 8: ".ccCCCCCCCcBBbbbbbbk", 9: "..cccCCCCCcBBBBBBBBk", 10: "....ccccccBBBBBBk..." });
const BLINKH = swap(HEAD, { 5: "CCCCCCCCCCCpppBBBBBB.", 4: ".CCCCCCCpppppBBBB..." });
const HLEG = {
  C: { m: CREAM }, c: { m: CREAM, bias: -1 }, P: { m: STEEL }, p: { m: STEEL, fix: 0 }, E: { m: EYE }, e: { m: PUPIL }, B: { m: GOLD }, b: { m: GOLD, fix: 0 }, k: { m: GOLD, fix: 1 },
};

// ---- the wing's four keys (relative to the shoulder; from the old rig, x 1.25): 0 high, 1
// driving down, 2 low, 3 swept back and rising. E elbow, W wrist, T the five primary tips, B where
// the trailing edge meets the flank. Flattened to [Ex,Ey,Wx,Wy,T0x,T0y..T4x,T4y,Bx,By] ----
const KEYS = [
  { E: [-2.5, -6.5], W: [-2.5, -14], T: [[-3.5, -25.5], [-7.5, -27.5], [-11.5, -27], [-15, -25], [-17.5, -21.5]], B: [-12, -1] },
  { E: [-2, -5], W: [3, -10.5], T: [[9, -18.5], [5.5, -21], [1.5, -22], [-2.5, -21.5], [-6, -19]], B: [-12, 0] },
  { E: [-2, 3], W: [4, 7.5], T: [[12.5, 13], [9.5, 16], [5.5, 17.5], [1.5, 17.5], [-2.5, 16]], B: [-12, 1] },
  { E: [-4, -3], W: [-3, -9.5], T: [[-9, -17], [-12.5, -17], [-15.5, -15.5], [-18, -13], [-19.5, -10]], B: [-12, 0] },
].map((k) => [...k.E, ...k.W, ...k.T.flat(), ...k.B].map((v, i) => (i % 2 === 0 ? v * (v < 0 ? 2.1 : 1.5) : v * 1.3)));
const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
const shape = (wp) => {
  const w = ((wp % 4) + 4) % 4, i = Math.floor(w), t = w - i, k = (j) => KEYS[(i + j + 4) % 4];
  const f = k(0).map((_, n) => cr(k(-1)[n], k(0)[n], k(1)[n], k(2)[n], t));
  const pt = (n) => [f[n], f[n + 1]];
  return { E: pt(0), W: pt(2), T: [pt(4), pt(6), pt(8), pt(10), pt(12)], B: pt(14) };
};

// one wing from its root R: leading edge in plate, the primaries spread at the tips (a beat late),
// the secondaries trailing to the flank
const wing = (px, R, wp, wp1, wp2, z, far, steelOn) => {
  const A = shape(wp), A1 = shape(wp1), A2 = shape(wp2), bias = far ? -1 : 0, sc = far ? 0.9 : 1;
  const P = (v) => [R[0] + v[0] * sc, R[1] + v[1] * sc];
  const E = P(A.E), W = P(A.W), B = P(A2.B);
  const T = A1.T.map((t, i) => P([A.W[0] + (t[0] - A1.W[0]), A.W[1] + (t[1] - A1.W[1])]));
  const T2 = A2.T.map((t) => P([A.E[0] + (t[0] - A2.E[0]) * 0.9, A.E[1] + (t[1] - A2.E[1]) * 0.9]));
  const out = [R, E, W, T[0]];
  for (let i = 1; i < 5; i++) out.push(mix(mix(T[i - 1], T[i], 0.5), W, 0.2), T[i]);
  const tr = [];
  for (let i = 1; i <= 5; i++) {
    const bow = (t) => { const m = mix(T2[4], B, t); return mix(m, E, Math.sin(Math.PI * t) * 0.3); };
    const a = bow((i - 0.5) / 5), bb = bow(i / 5);
    tr.push(a);
    out.push(a, mix(bb, E, 0.1));
  }
  out.push(B);
  px.part(); const id = px._pid;
  px.poly(out, WING, z, { n: [-0.12, -0.3, 0.95], cast: far ? 0 : 1, bias });
  // the dark primaries toward the tips, a pale bar of coverts along the arm, the secondaries a tone down
  px.poly([mix(W, T[0], 0.7), ...T.map((t) => mix(W, t, 1.0)), mix(W, T[4], 0.7), ...T.slice().reverse().map((t) => mix(W, t, 0.72))], WING, z + 0.01, { fix: 1, bias, noLine: true });
  px.poly([R, E, W, mix(W, T[2], 0.3), mix(E, T2[4], 0.5), mix(R, B, 0.3)], WING, z + 0.02, { fix: far ? 2 : 3, bias, noLine: true });
  for (let i = 0; i < 4; i++) px.toneLine(...mix(mix(T[i], T[i + 1], 0.5), W, 0.2), ...mix(mix(T[i], T[i + 1], 0.5), W, 0.62), -1, id);
  for (let i = 1; i < 5; i++) { const e = mix(T2[4], B, i / 5); px.toneLine(e[0], e[1], ...mix(e, E, 0.4), -1, id); }
  if (steelOn) {
    // plate down the leading edge: lames and a cop at the wrist
    px.part();
    px.capsule(...mix(R, E, 0.1), 2.4 * sc, ...E, 2.1 * sc, STEEL, z + 0.1, { cast: 1, bias });
    px.capsule(...E, 2.1 * sc, ...W, 1.9 * sc, STEEL, z + 0.1, { cast: 1, bias });
    for (const t of [0.45]) { const m = mix(R, E, t); px.line(m[0] - 1.6, m[1], m[0] + 1.6, m[1] + 0.5, IRONK, z + 0.12, { fix: 0, noLine: true }); }
    for (const t of [0.4, 0.75]) { const m = mix(E, W, t); px.line(m[0] - 1.6, m[1], m[0] + 1.6, m[1] + 0.4, IRONK, z + 0.12, { fix: 0, noLine: true }); }
    px.ellipse(W[0], W[1], 1.9 * sc, 1.9 * sc, STEELB, z + 0.14, { cast: 1, bias });
    px.dot(W[0] - 0.6, W[1] - 0.8, STEELB, z + 0.16, { fix: 4, noLine: true });
  }
  return { W, T };
};

// ---- the rider (the Iron knight of fig-cavalier.js, seated, lance raised) ----
const RB = { thigh: 7, shin: 6, spine: 9.4, upper: 5.5, fore: 5.3 };
const SALLET = [
  "......MMMMM.....",
  "....MMMMMMMMM...",
  "...MMWWMMMMMMM..",
  "..MMMWMMMMMMMMM.",
  "MMMMMMMMMMMMMMMM",
  "MMmmmmmmmmmmmmmm",
  "MMMMsSSbbSbbS...",
  "MMMMsSSSESSSEN..",
  "mMMMsSSSSSSSSN..",
  ".mMMBBBBBBBSS...",
  "..mMBBBBBBBBS...",
  "...mBBBBBBBB....",
];
const blink = (rows) => rows.map((r) => r.replace(/E/g, "e"));
const SLEG = {
  M: { m: IRON }, W: { m: IRON, bias: 1 }, m: { m: IRONK }, B: { m: IRON, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYEK }, e: { m: SKIN, fix: 0 },
};

const rider = (px, F, B, info) => {
  const p = F.sk.p, p1 = F.lag1.p;
  const H = add(B, [-3.4, -8.4 + (p.seatY ?? 0)]);
  const lean = p.lean ?? 0.1, sp = RB.spine;
  const C = [H[0] + Math.sin(lean) * sp, H[1] - Math.cos(lean) * sp];
  const N = [C[0] + Math.sin(lean) * 1.6 + 1.2 + (p.rHx ?? 0), C[1] - 1.8 + (p.rHy ?? 0)];
  const tw = p.rTwist ?? 0.2, sN = [C[0] - 2.8 + tw * 1.4, C[1] + 0.9], sF = [C[0] + 2.8 - tw * 1.4, C[1] - 0.1];
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const vx = cl((p.bx - p1.bx) * 1.4, -2.4, 2.4), vy = cl((p.bob - p1.bob), -2, 2);

  // the near leg in plate, the knee drawn up and gripping, the boot hanging
  const hp = [H[0] - 0.6, H[1] + 0.6], ft = [H[0] + 2.6 + (p.knee ?? 0), H[1] + 12.4];
  const lg = ik(hp[0], hp[1], ft[0], ft[1], RB.thigh, RB.shin, -1);
  px.part();
  px.capsule(hp[0], hp[1], 2.9, lg.mid[0], lg.mid[1], 2.4, IRON, 8, { cast: 1 });
  px.capsule(lg.mid[0], lg.mid[1], 2.3, lg.end[0], lg.end[1] - 1, 1.9, IRON, 8, { cast: 1 });
  px.part();
  px.ellipse(lg.mid[0] + 0.5, lg.mid[1], 2.6, 2.4, IRON, 8.02, { cast: 1 });
  px.dot(lg.mid[0] + 0.6, lg.mid[1] - 0.6, STEELB, 8.04, { fix: 4 });
  px.capsule(lg.end[0] - 0.4, lg.end[1] - 0.2, 2, lg.end[0] + 3.2, lg.end[1] + 0.8, 1.6, BOOT, 8.05, { floor: 1 });

  // the far arm: its fist in the crinet before him
  const grip = add(B, [9.4 + (p.hx ?? 0) * 0.4, -11 + (p.hy ?? 0) * 0.5]);
  const fa = ik(sF[0], sF[1], grip[0], grip[1], RB.upper, RB.fore, 1);
  px.part();
  px.capsule(sF[0], sF[1], 2.2, fa.mid[0], fa.mid[1], 2, IRON, 7.6, { bias: -1 });
  px.capsule(fa.mid[0], fa.mid[1], 2, fa.end[0], fa.end[1], 1.7, IRON, 7.6, { bias: -1 });
  px.part(); px.ellipse(fa.end[0], fa.end[1], 1.8, 1.8, LEATHER, 7.7, { bias: -1 });

  // the trunk: a breastplate under an oxblood surcoat that falls over the thighs and the saddle
  const hemY = H[1] + 5.4, sw = cl(-vx * 1.1, -2.4, 2.4);
  px.part(); const tab = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 1.8], [C[0] + 4.8, C[1] - 1.8], [C[0] + 5.4, C[1] + 3], [H[0] + 5, H[1] - 1], [H[0] + 6.2, hemY - 0.4], [H[0] + 4, hemY + 1.6], [H[0] + 1.8, hemY - 0.2],
    [H[0] - 0.6, hemY + 1.8], [H[0] - 2.6 + sw, hemY - 0.2], [H[0] - 4.8 + sw, hemY + 1.6], [H[0] - 6.4 + sw, hemY - 0.4], [H[0] - 5, H[1] - 2], [C[0] - 5.6, C[1] + 3]], OX, 8.5, { round: 0.92, cast: 1 });
  px.toneLine(H[0] + 1.4, H[1] - 2, H[0] + 1.2, hemY - 1.4, -1, tab);
  px.toneLine(H[0] - 2.4, H[1] - 2, H[0] - 2.6 + sw * 0.7, hemY - 1.4, 1, tab);
  px.line(H[0] - 5.6 + sw, hemY - 1.2, H[0] + 5.6, hemY - 1.2, BRASS, 8.54);
  px.poly([[H[0] - 5.2, H[1] - 3.6], [H[0] + 5, H[1] - 3.6], [H[0] + 5.1, H[1] - 1.8], [H[0] - 5.3, H[1] - 1.8]], LEATHER, 8.55, { round: 0.92 });
  px.rect(H[0] + 1.4, H[1] - 3.6, 2, 2, BRASS, 8.56, { fix: 3 });
  px.part();
  const c0 = [C[0] + 1, C[1] + 3.4];                                    // the tower on his breast
  px.rect(c0[0], c0[1], 2, 3, GREY, 8.6, { fix: 3 }); px.dot(c0[0], c0[1] - 1, GREY, 8.6, { fix: 3 }); px.dot(c0[0] + 1, c0[1] - 1, GREY, 8.6, { fix: 3 });
  px.part();
  px.poly([[C[0] - 5.2, C[1] - 3.4], [C[0] + 5.2, C[1] - 3.4], [C[0] + 5.6, C[1] + 0.2], [C[0] - 5.6, C[1] + 0.4]], IRON, 8.7, { round: 0.9, cast: 1 });
  px.line(C[0] - 4.8, C[1] + 0.6, C[0] + 5, C[1] + 0.4, IRONK, 8.72, { fix: 1 });
  for (const [s, zz, bs] of [[sF, 7.7, -1], [sN, 9.2, 0]]) {            // round pauldrons
    px.part();
    px.ellipse(s[0] + 0.2, s[1] + 0.2, 4.2, 3.7, IRON, zz, { bias: bs, cast: 1 });
    px.line(s[0] - 3.2, s[1] + 1.6, s[0] + 3.4, s[1] + 1.6, IRONK, zz + 0.01, { bias: bs });
    px.dot(s[0] + 0.6, s[1] - 1.6, STEELB, zz + 0.02, { fix: 4 });
  }

  // the head: the oxblood crest streams back, a beat late
  const tuft = cl(-vx * 1.5 - 0.4, -2.4, 2.4), tv = cl(-vy * 1.0, -1.4, 1.4);
  px.part();
  px.poly([[hx - 4, hy - 11.4], [hx + 3, hy - 11.8], [hx + 3.2, hy - 14], [hx - 3.4 + tuft * 0.5, hy - 15 + tv * 0.4], [hx - 9 + tuft * 1.7, hy - 12 + tv], [hx - 11.6 + tuft * 2.3, hy - 7.4 + tv], [hx - 10.2 + tuft * 1.5, hy - 3.2], [hx - 7.4 + tuft, hy - 5.8], [hx - 5.4, hy - 8.8]], OX, 9.4, { round: 0.85, cast: 1 });
  px.part();
  px.stamp(p.rBlink ? blink(SALLET) : SALLET, hx, hy, SLEG, 9.5, { ax: 7, ay: 12, cast: 2, ball: [8, 6, 8, 7] });
  px.dot(hx + 2, hy - 10.6, BRASS, 9.6, { fix: 3 });

  // the near arm and the lance: banded oxblood and cream, a steel head, a pennon streaming
  const hand = add(B, p.hand ?? [4, -11]);
  const na = ik(sN[0], sN[1], hand[0], hand[1], RB.upper, RB.fore, 1);
  const hd = na.end, la = (p.lance ?? -0.72) + vy * 0.02, d = [Math.cos(la), Math.sin(la)], nn = [-d[1], d[0]];
  const at = (f, s = 0) => [hd[0] + d[0] * f + nn[0] * s, hd[1] + d[1] * f + nn[1] * s];
  px.part();
  for (let f = -9, i = 0; f < 35.99; f += 3.6, i++) px.capsule(...at(f), 1.05, ...at(Math.min(36, f + 3.6)), 1.05, i % 2 ? CREAMC : OX, 10, { cast: 1 });
  px.part();
  px.poly([at(35, -1.2), at(37.4, -2), at(44, 0), at(37.4, 2), at(35, 1.2)], STEELB, 10.1, { fix: 3 });
  px.line(...at(36, -1), ...at(43, -0.2), STEELB, 10.12, { fix: 4 });
  px.capsule(...at(33.6), 1.3, ...at(35), 1.3, IRONK, 10.1, { floor: 1 });
  px.capsule(...at(-9.6), 1.3, ...at(-8.4), 1.3, IRONK, 10.1, { floor: 1 });
  const fl = cl(-vx * 1.4 + (p.flut || 0), -2.6, 2.6);
  px.part();
  px.poly([at(31.6, 0.6), at(31, 4 + fl * 0.3), at(24.6, 5.4 + fl), at(20, 3.6 + fl * 1.3), at(23.6, 2.4 + fl * 0.6), at(26.4, 0.8)], OX, 10.2, { round: 0.6, cast: 1 });
  px.line(...at(30, 2), ...at(22.4, 3.6 + fl), BRASS, 10.24, { noLine: true });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] + 0.2, 2.4, 2.2, IRON, 10.4, { cast: 0, bias: 1 });
  px.capsule(sN[0], sN[1] + 0.6, 2.4, na.mid[0], na.mid[1], 2.1, IRON, 10.5, { cast: 1 });
  px.capsule(na.mid[0], na.mid[1], 2.1, hd[0], hd[1], 1.7, IRON, 10.5, { cast: 1 });
  px.ellipse(na.mid[0], na.mid[1], 2, 1.9, IRON, 10.55, { cast: 1 });
  px.part();
  px.ellipse(hd[0], hd[1], 1.9, 1.9, LEATHER, 10.7);
  info.lance = { hd, d, nn };
};

// ---- the beast ----
const talons = (px, ft, spread, z, bias, dark) => {
  // three toes with golden claws, spread by `spread` (0 closed .. 1 raking open)
  for (const [ax, ay] of [[3.2 + spread * 1.4, 0.4 + spread * 1.2], [2.4 + spread * 0.8, 2 + spread * 0.6], [-0.2, 2.4 - spread * 0.2]]) {
    px.capsule(ft[0], ft[1], 0.95, ft[0] + ax, ft[1] + ay, 0.7, GOLD, z, { bias, cast: 0 });
    px.dot(ft[0] + ax * 1.15, ft[1] + ay * 1.15 + 0.2, IRONK, z + 0.01, { noLine: true });
  }
  void dark;
};

export const draw = (px, F, o = {}) => {
  const { sk, lag1, lag2 } = F, p = sk.p, p1 = lag1.p, p2 = lag2.p;
  const loose = o.variant === "loose" || o.variant === "riderless";
  const B = [Math.round(p.bx ?? 0), Math.round(-22 + (p.bob ?? 0))];
  const info = {};
  const rel = (x, y) => [B[0] + x, B[1] + y];
  const tlag = cl(p1.bob - p.bob, -2, 2) * 0.6 + cl(p2.bob - p.bob, -3, 3) * 0.4;

  // the far wing, in shade, set back and up
  wing(px, rel(0.8, -8), p.wp, p1.wp, p2.wp, 1, true, true);

  // the far legs: lion hind trailing, eagle fore tucked
  const lg = p.leg ?? 0.5, tl = p.talon ?? 0.5;
  const hind = (ox, oy, z, far) => {
    const bias = far ? -1 : 0, hp = rel(-11 + ox, 5 + oy), kn = rel(-13 + ox - lg * 0.8, 9.4 + oy), hk = rel(-16.4 + ox - lg * 3.4, 9 + oy + lg * 0.6), pw = rel(-19.6 + ox - lg * 4.6, 8.4 + oy + lg * 1.8);
    px.part();
    px.capsule(hp[0], hp[1], 4.2, kn[0], kn[1], 2.8, TAWNY, z, { bias, cast: 1 });
    px.capsule(kn[0], kn[1], 2.8, hk[0], hk[1], 2, TAWNY, z, { bias, cast: 1 });
    px.capsule(hk[0], hk[1], 2, pw[0], pw[1], 1.8, TAWNY, z, { bias, cast: 1 });
    px.ellipse(pw[0] - 0.6, pw[1] + 0.4, 2.1, 1.5, TAWNY, z + 0.01, { bias, rot: 0.3, floor: 1 });
    for (let i = 0; i < 3; i++) px.dot(pw[0] - 2.8 - i * 0.2, pw[1] + 0.4 + i * 0.8, IRONK, z + 0.02, { noLine: true });
  };
  const fore = (ox, oy, z, far) => {
    const bias = far ? -1 : 0, th = rel(7.6 + ox, 4 + oy);
    const kn = rel(7.4 + ox + tl * 3.4, 9 + oy - tl * 2), ft = rel(8.6 + ox + tl * 7.4, 12.4 + oy - tl * 8 + (p.rake ?? 0) * 7);
    px.part();
    px.capsule(th[0], th[1], 4, kn[0], kn[1], 2.9, MANE, z, { bias, cast: 1 });
    px.capsule(kn[0], kn[1], 2.4, ft[0], ft[1], 1.5, GOLD, z, { bias, cast: 1 });
    px.dot(kn[0] + 0.4, kn[1] + 1.4, GOLD, z + 0.02, { fix: 4, noLine: true });
    talons(px, ft, cl(tl - 0.4, 0, 1), z + 0.02, bias);
  };
  hind(1.6, -0.8, 2, true);
  fore(2.4, -0.4, 2, true);

  // the lion's tail, a dark tuft at its end, trailing a beat late
  const tw = (p.tail ?? 0) + tlag;
  const tp = [rel(-15.6, -1.6), rel(-21, -1.8 + tw * 0.4), rel(-27, -3.4 + tw * 1), rel(-32, -6.4 + tw * 1.8)];
  px.part();
  px.capsule(tp[0][0], tp[0][1], 2.3, tp[1][0], tp[1][1], 1.9, TAWNY, 2.5, { cast: 1 });
  px.capsule(tp[1][0], tp[1][1], 1.9, tp[2][0], tp[2][1], 1.5, TAWNY, 2.5, { cast: 1 });
  px.capsule(tp[2][0], tp[2][1], 1.5, tp[3][0], tp[3][1], 1.3, TAWNY, 2.5, { cast: 1 });
  px.part();
  px.ellipse(tp[3][0] - 1.4, tp[3][1] - 1, 3.2, 2.6, MANE, 2.6, { rot: -0.6, cast: 1, floor: 1 });
  px.poly([[tp[3][0] - 2, tp[3][1] - 2.4], [tp[3][0] - 5.2, tp[3][1] - 4.4 + tw * 0.4], [tp[3][0] - 3.4, tp[3][1] + 0.6], [tp[3][0] - 6.4, tp[3][1] - 0.2 + tw * 0.3]], MANE, 2.62, { floor: 1 });

  // the lion's barrel and haunch, the feathered eagle breast, a paler belly
  px.part(); const body = px._pid;
  px.capsule(...rel(5, -0.2), 7.2, ...rel(-9, 0.8), 6.2, TAWNY, 4, { cast: 1 });
  px.ellipse(...rel(-11, 1.2), 6.2, 6.6, TAWNY, 4, { cast: 1, rot: 0.2 });
  px.ellipse(...rel(7.6, -1), 7.6, 8.2, MANE, 4.1, { cast: 1 });
  for (const [x, y] of [[4, -6], [7, -6.6], [10, -5], [5.4, -2.6], [8.4, -1.4], [11, 0.6], [4.4, 2.4], [7.6, 3.4]]) px.toneLine(...rel(x - 1.4, y), ...rel(x + 0.2, y + 1.6), -1, body);
  px.part();
  px.capsule(...rel(2, 5.4), 1.5, ...rel(-9, 5.8), 1.2, CREAM, 4.05, { cast: 0 });
  px.dot(...rel(-8, -3), TAWNY, 4.2, { fix: 4, noLine: true });
  // the crupper plate over the rump
  px.part();
  px.poly([rel(-7.4, -6), rel(-14, -5.6), rel(-17.6, -1), rel(-15.8, 1.6), rel(-11, 0), rel(-8.4, -2.6)], STEEL, 4.5, { round: 0.6, cast: 1 });
  px.line(...rel(-9.6, -5.6), ...rel(-11.4, -1), IRONK, 4.52, { fix: 0, noLine: true });
  px.dot(...rel(-8.8, -4.6), BRASS, 4.54, { fix: 3, noLine: true }); px.dot(...rel(-14, -3.8), BRASS, 4.54, { fix: 3, noLine: true });
  // the peytral over the breast
  px.part();
  px.poly([rel(6.2, -5), rel(10.6, -2.8), rel(12.4, 2.4), rel(10.6, 7.2), rel(6.8, 6.4), rel(7.6, 0.4)], STEEL, 4.6, { round: 0.7, cast: 1 });
  px.line(...rel(7.6, -3.6), ...rel(10.8, 4.4), STEELB, 4.62, { fix: 4, noLine: true });
  px.line(...rel(7.4, 1.4), ...rel(11.8, 1.6), IRONK, 4.62, { fix: 0, noLine: true });
  px.dot(...rel(10.4, -1.4), BRASS, 4.64, { fix: 3, noLine: true }); px.dot(...rel(11.4, 4), BRASS, 4.64, { fix: 3, noLine: true }); px.dot(...rel(8.4, 5.4), BRASS, 4.64, { fix: 3, noLine: true });

  // the neck: cream feathers, a steel crinet of lames down its back
  const hh = [14.4 + (p.hx ?? 0), -12.4 + (p.hy ?? 0)];
  px.part();
  px.capsule(...rel(8.4, -4), 6, ...rel(hh[0] - 1.6, hh[1] + 3.2), 4.4, CREAM, 4.3, { cast: 1 });
  px.part();
  for (const t of [0.15, 0.5, 0.85]) {
    const a = mix([8.4, -4], [hh[0] - 1.6, hh[1] + 3.2], t);
    px.capsule(...rel(a[0] - 2.2, a[1] - 4.2), 1.6, ...rel(a[0] + 0.4, a[1] - 4.8), 1.4, STEEL, 4.5, { cast: 1 });
  }
  void p2;

  // the eagle's head, its steel brow plate and spike, the eye alight
  px.part();
  px.stamp(p.blinkH ? BLINKH : (p.cry ?? 0) > 0.5 ? CRY : HEAD, rel(hh[0], hh[1])[0], rel(hh[0], hh[1])[1], HLEG, 6, { ax: 7, ay: 6, ball: [8, 5, 8, 7], cast: 1 });
  px.part();
  px.poly([rel(hh[0] + 0.4, hh[1] - 6), rel(hh[0] - 0.4, hh[1] - 10.4), rel(hh[0] + 2.6, hh[1] - 6.4)], STEELB, 6.2, { fix: 3 });

  // the saddle cloth, dagged, the tower on it; the saddle itself rides it
  px.part();
  const sd = [-4.2, -7.6];
  px.poly([rel(sd[0] - 6.6, sd[1]), rel(sd[0] + 4.2, sd[1] - 0.6), rel(sd[0] + 4.8, sd[1] + 5.4), rel(sd[0] + 3.4, sd[1] + 8.6), rel(sd[0] + 2.2, sd[1] + 6.6), rel(sd[0] + 0.8, sd[1] + 9),
    rel(sd[0] - 0.6, sd[1] + 6.8), rel(sd[0] - 2, sd[1] + 9), rel(sd[0] - 3.4, sd[1] + 6.8), rel(sd[0] - 5, sd[1] + 8.6), rel(sd[0] - 6.4, sd[1] + 5)], OX, 6, { round: 0.6, cast: 1 });
  px.rect(...rel(sd[0] - 1.6, sd[1] + 1.8), 3, 4, GREY, 6.1, { fix: 3 });
  px.dot(...rel(sd[0] - 1.6, sd[1] + 0.8), GREY, 6.1, { fix: 3 }); px.dot(...rel(sd[0] + 0.4, sd[1] + 0.8), GREY, 6.1, { fix: 3 });

  // the near legs
  hind(0, 0, 5, false);
  fore(0, 0, 5, false);

  // the near wing, then the knight in front of it
  const nw = wing(px, rel(3.4, -7.4), p.wp, p1.wp, p2.wp, 5.4, false, true);
  info.wing = nw;
  if (loose) {
    // no one up: the stirrup swinging free, the reins thrown back from the bit
    const sdc = rel(sd[0] + 0.4, sd[1] + 4), swing = cl(-(p.bx - p1.bx) * 1.6 + (p1.bob - p.bob) * 0.5, -3, 3);
    px.part();
    px.capsule(sdc[0], sdc[1], 0.8, sdc[0] + swing * 0.6, sdc[1] + 10, 0.8, LEATHER, 7, { floor: 1 });
    px.ellipse(sdc[0] + swing * 0.7, sdc[1] + 11.6, 2.1, 1.7, BRASS, 7.02, { fix: 3 });
    px.ellipse(sdc[0] + swing * 0.7, sdc[1] + 11.8, 1, 0.8, TAWNY, 7.04, { noLine: true });
    const bit = rel(hh[0] + 7.4, hh[1] + 4.8), wi = rel(2, -9), fl = cl(-(p.bx - p1.bx) * 1.4 + tlag, -3, 3);
    px.part();
    px.capsule(bit[0], bit[1], 0.6, (bit[0] + wi[0]) / 2, (bit[1] + wi[1]) / 2 + 2.4, 0.6, LEATHER, 7, { floor: 1 });
    px.capsule((bit[0] + wi[0]) / 2, (bit[1] + wi[1]) / 2 + 2.4, 0.6, wi[0], wi[1], 0.6, LEATHER, 7, { floor: 1 });
    px.capsule(wi[0], wi[1], 0.6, wi[0] - 7 + fl, wi[1] + 4 + fl * 0.4, 0.5, LEATHER, 7, { floor: 1 });
  } else rider(px, F, B, info);
  return info;
};

// the lance's streak on the frames the strike comes through, a little rake of light off the talons
export const fx = (px, F, info, clip) => {
  if (clip !== "attack" || !info.lance) return;
  const p = F.sk.p, l = F.lag1.p, { hd, d, nn } = info.lance, at = (f, s = 0) => [hd[0] + d[0] * f + nn[0] * s, hd[1] + d[1] * f + nn[1] * s];
  if ((p.bx - l.bx) > 0.8 || (F.ph >= 0.46 && F.ph <= 0.6)) {
    px.poly([at(16, 2.4), at(-2, 1.4), at(16, 0.4)], SMEAR2, 20, { noLine: true });
    px.poly([at(16, 1.8), at(2, 1.2), at(16, 0.8)], SMEAR, 20.1, { noLine: true });
  }
};

// ---- poses ----------------------------------------------------------------------------------
// wp the wingbeat (0 high, 1 driving, 2 low, 3 swept back); bob / bx the body's height and surge;
// leg the hind legs trailing (0 tucked .. 1 streaming); talon the forelegs (0 tucked .. 1 thrown
// forward and up), rake the talons dragged down; tail the tail's lift; hx hy the head thrust fwd /
// down; lean the knight about his seat; hand the near fist and lance its angle (rad, up is negative)
const FLY = { wp: 0, bob: 0, bx: 0, leg: 0.5, talon: 0.3, rake: 0, tail: 0, hx: 0, hy: 0, cry: 0, lean: 0.1, hand: [4, -11], lance: -0.72, knee: 0, rTwist: 0.2, flut: 0, rHx: 0, rHy: 0, seatY: 0 };
const beat = (ph) => {
  const w = Math.cos(ph * TAU);                      // +1 wings high, -1 low
  return { ...FLY, wp: ph * 4, bob: -1.6 * Math.cos(TAU * (ph - 0.5)) * 0.9 + 0.2, leg: 0.5 + 0.5 * Math.sin(TAU * ph - 1) * 0.6, talon: 0.3 + 0.12 * w, tail: 1.4 * Math.sin(TAU * ph - 0.6), lean: 0.1 - 0.02 * w,
    flut: 1.2 * Math.sin(TAU * ph - 0.4), hand: [4, -11 + 0.5 * w], hy: 0.5 * w, rBlink: ph >= 0.82 && ph < 0.9 ? 1 : 0, blinkH: ph >= 0.3 && ph < 0.36 ? 1 : 0 };
};
export const CLIPS = {
  idle: { n: 8, ms: 560, loop: true, lag: 0.085, pose: beat },
  walk: { n: 8, ms: 560, loop: true, lag: 0.085, pose: beat },
  attack: {
    n: 14, ms: 900, loop: false, lag: 0.07, hit: 0.5,
    pose: (ph) => sampleKeys([
      // guard: levelled at the foe on a mid wingbeat
      { t: 0, p: { ...FLY, wp: 1, bob: 0, lean: 0.12, hand: [5.6, -11.4], lance: -0.4, leg: 0.4, talon: 0.6, flut: 0.8 } },
      // wind-up: the beast rears on a raised wing, the knight sits back and draws the lance in
      { t: 0.26, e: "out", p: { ...FLY, wp: 0, bob: 1, bx: -3.4, lean: -0.14, hand: [0, -10.4], lance: -0.8, leg: 0, talon: 0, tail: 1.5, hy: -1.4, hx: -1.6, rHx: -0.6, flut: -1.2, seatY: 0.4 } },
      { t: 0.4, e: "io", p: { ...FLY, wp: 0.1, bob: 1.2, bx: -4, lean: -0.18, hand: [-1, -10], lance: -0.84, leg: 0, talon: 0, tail: 1.6, hy: -1.6, hx: -2, rHx: -0.8, flut: -1.4, seatY: 0.6 } },
      // the strike: the downstroke drives it in, the lance thrust out level, the talons thrown forward to rake, the beak lunging
      { t: 0.5, e: "in3", p: { ...FLY, wp: 2, bob: -1.6, bx: 6.4, lean: 0.38, hand: [13.4, -10.6], lance: -0.1, leg: 1, talon: 1, tail: -1, hx: 3.4, hy: 1, cry: 1, rTwist: 0.7, rHx: 1.2, flut: 2, knee: 1 } },
      { t: 0.6, e: "out", p: { ...FLY, wp: 2.5, bob: -0.8, bx: 7.2, lean: 0.42, hand: [14, -9.6], lance: 0.1, leg: 0.9, talon: 1.2, rake: 1, tail: -0.4, hx: 3.8, hy: 1.6, cry: 1, rTwist: 0.8, rHx: 1.3, flut: 2, knee: 1 } },
      // follow-through: the arm all the way out, the talons raking down, the wings sweeping back up
      { t: 0.8, e: "io", p: { ...FLY, wp: 3.4, bob: -0.4, bx: 3, lean: 0.3, hand: [10, -10], lance: -0.2, leg: 0.7, talon: 0.7, rake: 0.4, hx: 1.4, hy: 0.6, flut: 1.4 } },
      { t: 1, e: "out", p: { ...FLY, wp: 4.9, bob: 0.4, bx: 0, lean: 0.12, hand: [5.6, -11.4], lance: -0.5, leg: 0.5, talon: 0.4, flut: 0.6 } },
    ], ph),
  },
};
