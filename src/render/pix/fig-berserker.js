// ============ CONCEPT FIGURE: the Rime berserker (game types `berserker`, `berserkerRage`) ============
// Bare-chested and woad-striped under a bear's pelt worn over the head (the
// snout over the brow, the hide down the back), a hand axe in each fist, a wild
// forked red beard. A broad, hunched man, bigger than a thrall (about 50 px).
// Clips (concept round): idle (both axes low, rocking), attack (both axes hauled
// up and back, a crossing double chop). Walk comes after the pick.
// The owner picked look c, "bold": a bear-skull helm crowned with antlers, a huge shaggy
// mantle with the bear's forepaws hanging, heavier longer-hafted axes.
// o.variant "rage" is the frenzy past half health (the engine's berserkerRage): flushed
// skin, white-hot eyes, a brighter mane, a haze of red sparks, the mouth bared.
// Clips: idle, walk (8 frames), attack (12 frames, the double chop lands at 0.52).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, solve, HUMAN, scaled } from "./rig.js";

const SKIN = mat("#dca584"), SKINR = mat("#e48a6a"), PELT = mat("#4a4048"), PELT_D = mat("#2e2830"), PELTF = mat("#4a5a70"), WRAP = mat("#b09468"), TIP = mat("#a8a8b0"), LEATHER = mat("#4a382c"), DARK = mat("#3a2a20");
const MANE = mat("#b8603a"), MANER = mat("#d8582e"), BONE = mat("#ece0c4"), STEEL = mat("#c4c8d0", { contrast: 1.3 }), IRON = mat("#5e646e"), WOOD = mat("#7a5632"), BRASS = mat("#c8a040");
const WOAD = flat("#5a8ac8"), WOADR = flat("#4a6ed0"), FROST = flat("#eaf6ff"), EYE = flat("#2a1c2c"), EYER = flat("#fff4d0", { emis: true, line: "#e8402a" }), HAZE = flat("#ff5a3a", { emis: true, line: "#c82a1a" }), HAZE2 = flat("#ffa060", { emis: true, line: "#d84a2a" });
const SMEAR = flat("#f4f8ff", { emis: true, line: "#b8c8d8" }), SMEARR = flat("#ffd8c0", { emis: true, line: "#d86a4a" }), NOSE = flat("#2a1a1c");

// The head, facing +x a quarter turned: pelt hood over the crown (P, p a tone down, k the
// skull in c), skin (S), eyes (E), woad (W), nose (N), the mane and forked beard (R), teeth (T).
const TOPS = {
  c: [".....KKKK....", "...KKKKKKKK..", "..KKKKKKKKKK.", ".KKKKKKKKKKK.", ".kKKKKKKKKKK."],
};
const FACE0 = {
  a: [".RPsbbssbbs..", ".RPSSESSSES..", ".RPSSESSSESN.", ".RRSWSSWSSSN.", ".RRrSSRRRRR..", "..RRrRRRRRR..", "..RRR....RR.."],
  b: [".RPsbbssbbs..", ".RPSSESSSES..", ".RPSSESSSESN.", ".RRSWSSWSSSN.", ".RRrSSRTRTR..", "..RRrRRRRRR..", "..RRR..R..R.."],
  c: [".RKsbbssbbs..", ".RKSSESSSES..", ".RKSSESSSESN.", ".RRSWSSWSSSN.", ".RRrSSRRRRR..", "..RRrRRRRRR..", "..RRR...RRR.."],
};
const ROARF = (rows) => rows.map((r, i) => (i === 4 ? r.replace(/RRRRR/, "TTTTT") : r));
const FACE = FACE0.c, HEAD = [...TOPS.c, ...FACE], BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : r)), ROAR = HEAD.map((r, i) => (i === 9 ? r.replace(/RRRRR/, "TTTTT") : r));
const legend = (rage) => ({
  P: { m: PELT }, p: { m: PELT, bias: -1 }, K: { m: BONE }, k: { m: BONE, bias: -1 }, S: { m: rage ? SKINR : SKIN }, s: { m: rage ? SKINR : SKIN, bias: -1 }, N: { m: rage ? SKINR : SKIN, bias: 1 },
  E: { m: rage ? EYER : EYE }, W: { m: rage ? WOADR : WOAD, fix: 0 }, R: { m: rage ? MANER : MANE }, r: { m: rage ? MANER : MANE, bias: -1 }, b: { m: PELT_D, fix: 2 }, T: { m: BONE, fix: 3 },
});
const LEG = { false: legend(false), true: legend(true) };

export const MUST = [["nearArm", "notOver", "eyes"]];
export const BOX = { w: 108, h: 94, ox: 46, oy: 84 };
// THE GRIP: each axe's angle (from upright, + toward the foe) is DERIVED from its own solved forearm: forearm direction
// (elbow -> hand) + GRIP + a wrist of +-0.35, never posed on its own. The haft stands out of the top of the fist, near 90 degrees to it.
export const GRIP = -1.6, WRIST = 0.35;
const fore = (e, h) => { const f = Math.atan2(h[0] - e[0], -(h[1] - e[1])); return f < -1.9 ? f + Math.PI * 2 : f; };
const wr = (w) => Math.max(-WRIST, Math.min(WRIST, w || 0));
export const axeAngle = (sk) => fore(sk.eN, sk.hdN) + GRIP + wr(sk.p.wrist);
export const axeAngleF = (sk) => fore(sk.eF, sk.hdF) + GRIP + wr(sk.p.wristF);
export const BONES = scaled(HUMAN, 1.18, { shN: -4, shF: 4, hipN: -1.8, hipF: 2, neck: 1.2 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// a hand, PI/2 level before him
const axe = (px, h, a, v, z) => {
  const big = v === "c", L = big ? 17 : 12.5, k = big ? 1.4 : 1, d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)];
  const at = (f, s) => [h[0] + d[0] * f + n[0] * s, h[1] + d[1] * f + n[1] * s];
  px.part();
  px.capsule(...at(-3, 0), 0.85, ...at(L + 1, 0), 0.85, WOOD, z, { edge: true });
  px.part();
  px.poly([at(L - 2.4 * k, 0.4), at(L - 3.8 * k, 3.8 * k), at(L - 1.2 * k, 5 * k), at(L + 1.8 * k, 3.6 * k), at(L + 1.8 * k, 0.4)], STEEL, z + 0.02, { fix: 2 });
  px.poly([at(L - 3.8 * k, 3.8 * k), at(L - 1.2 * k, 5 * k), at(L + 1.8 * k, 3.6 * k), at(L + 1.2 * k, 2.9 * k), at(L - 1.2 * k, 3.8 * k)], STEEL, z + 0.03, { fix: 4 });
  px.poly([at(L - 1.6, -0.4), at(L + 1.2, -0.4), at(L + (big ? 1.2 : 0.3), -(big ? 3.6 : 2.2))], IRON, z + 0.01, { fix: 1 });
  px.poly([at(L - 2.8, -0.8), at(L + 2, -0.8), at(L + 2, 0.9), at(L - 2.8, 0.9)], IRON, z + 0.04, { fix: 1 });
  if (v === "b") px.dot(...at(L - 0.4, 3.6), FROST, z + 0.05, { noLine: true });
  return at;
};

export const draw = (px, { sk, lag1, lag2, ph }, o = {}) => {
  const v = "c", rage = o.variant === "rage", big = true, sto = false;
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), vy = cl(N[1] - lag1.N[1], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]), skin = rage ? SKINR : SKIN, mane = rage ? MANER : MANE;

  // the pelt down the back: the hide from the hood to the hips, its ragged tail a beat behind
  const t1 = cl(-vx * 0.6 - vx2 * 0.4, -1.2, 1.2);
  px.part();
  px.poly([[hx - 4, hy - 4], [hx + 1, hy - 3], [C[0] - 3, C[1] + 2], [P[0] - 2, P[1] - 1], [P[0] - 4 + t1 * 0.5, P[1] + 2.4], [P[0] - 6.4 + t1, P[1] + 3.6], [P[0] - 8 + t1, P[1] + 1], [C[0] - 8.4, C[1] + 5], [hx - 7, hy - 1]], PELT, 0.5, { round: 0.85, cast: 1 });
  for (const [x, y] of [[-6, -0.4], [-4, 1.4], [-2, 2.8]]) px.dot(hx + x, hy + y + 1, TIP, 0.6, { noLine: true });
  px.toneLine(hx - 4, hy, P[0] - 8 + t1, P[1] + 6, -1, px._pid);
  if (big) { px.part(); const aw = 4 + (vx > 0 ? 0 : 1); for (const [x, y] of [[-5, -8.6], [-1.6, -9.6], [2.4, -9.4]]) px.dot(hx + x, hy + y, BONE, 0.6, { fix: 3 }); void aw; }

  // the far arm, bare, a brass or woad band; its axe held out
  px.part();
  px.capsule(sF[0], sF[1], 2.5, eF[0], eF[1], 2.2, skin, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.2, hdF[0], hdF[1], 1.9, skin, 1, { bias: -1 });
  const w0 = mix(eF, hdF, 0.6);
  px.capsule(w0[0], w0[1], 2.2, hdF[0], hdF[1], 2, LEATHER, 1.05, { bias: -1 });
  const axF = axeAngleF(sk);
  px.part(); px.tag("farArm");
  axe(px, hdF, axF, v, 1.3);
  px.part();
  px.ellipse(hdF[0], hdF[1], 1.9, 2.4, skin, 1.4, { bias: -1, rot: -axF });
  px.tag(null);

  // legs: fur-wrapped, barefoot-looking boots of hide
  for (const [h, k, a, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(h[0], h[1], 3.1, k[0], k[1], 2.5, WRAP, z, { bias: b });
    px.capsule(k[0], k[1], 2.5, a[0], a[1], 2, WRAP, z, { bias: b });
    const w1 = mix(k, a, 0.5);
    px.capsule(w1[0], w1[1], 2.5, a[0], a[1], 2.3, PELTF, z + 0.03, { bias: b });
    px.capsule(a[0] - 0.4, a[1] + 0.6, 1.8, a[0] + 4, a[1] + 0.9, 1.4, PELT_D, z + 0.03, { bias: b });
  }

  // the trunk: a bare barrel of chest, a fur kilt, a belt
  px.part(); const body = px._pid;
  px.poly([[C[0] - 6.4, C[1] - 1.8], [C[0] + 6.2, C[1] - 1.8], [C[0] + 7.6, C[1] + 3.6], [P[0] + 6, P[1] - 3], [P[0] + 6, P[1] + 0.4], [P[0] - 6, P[1] + 0.4], [P[0] - 6.2, P[1] - 3], [C[0] - 7.4, C[1] + 3.6]], skin, 4, { round: 0.92, cast: 1 });
  px.toneLine(C[0] + 2.6, C[1] + 2.4, C[0] + 2.4, C[1] + 6.6, -1, body);
  px.toneLine(C[0] - 1, C[1] + 7, C[0] + 6, C[1] + 6.6, -1, body);
  // woad across the chest and belly
  const wd = rage ? WOADR : WOAD;
  px.line(C[0] - 4.6, C[1] + 1, C[0] + 3.8, C[1] + 3.2, wd, 4.1, {});
  px.line(C[0] - 4.2, C[1] + 3.4, C[0] + 4.4, C[1] + 5.6, wd, 4.1, {});
  px.line(C[0] - 3.6, C[1] + 8, C[0] + 3.2, C[1] + 9, wd, 4.1, {});
  if (sto) {
    px.line(C[0] - 5.6, C[1] + 0.4, C[0] + 1, C[1] + 8.4, LEATHER, 4.12, {});
    px.dot(C[0] + 4.6, C[1] + 7, FROST, 4.15, { noLine: true });
    for (let i = 0; i < 5; i++) { const t = i / 4; px.dot(C[0] - 5 + t * 8.4, C[1] + 1.4 + Math.sin(t * Math.PI) * 3.4 + t * 1.4, BONE, 4.2, { fix: 3 }); }
    px.line(C[0] - 4.4, C[1] + 6.4, C[0] - 3, C[1] + 9.4, mat("#b04a3a"), 4.1, { noLine: true });
  }
  const kh = P[1] + 5.2, kf = P[0] + 6.4 - vx * 0.8, kb = P[0] - 6.6 - vx * 1.4 - vx2 * 0.6;
  px.part(); const kilt = px._pid;
  px.poly([[P[0] - 6.4, P[1] - 2], [P[0] + 6.4, P[1] - 2], [kf, kh - 1], [kf - 2.4, kh + 1], [P[0] - vx, kh - 0.4], [kb + 3.4, kh + 1.2], [kb, kh - 1]], PELTF, 4.2, { round: 0.85, cast: 1 });
  px.toneLine(P[0] + 1, P[1], P[0] - vx, kh - 1, -1, kilt);
  px.poly([[P[0] - 6.4, P[1] - 3.2], [P[0] + 6.4, P[1] - 3.2], [P[0] + 6.5, P[1] - 1.2], [P[0] - 6.4, P[1] - 1.2]], LEATHER, 4.25, { round: 0.9 });
  px.rect(P[0] + 1.6, P[1] - 3, 2.6, 2, BRASS, 4.3, { fix: 3 });
  if (sto) { px.ellipse(P[0] - 3.6, P[1] + 1.6, 1.9, 1.7, BONE, 4.4, { cast: 0 }); px.dot(P[0] - 4.2, P[1] + 1.6, DARK, 4.45, { fix: 1 }); px.dot(P[0] - 3, P[1] + 1.6, DARK, 4.45, { fix: 1 }); }

  // the mantle over the shoulders: the pelt's collar; in c a great shaggy one with the forepaws hanging
  px.part();
  const cw = big ? 11 : 8.2;
  px.ellipse(C[0] + 0.2, C[1] + 0.2, cw, big ? 5.2 : 3.8, PELT, 4.4, { cast: 1 });
  for (const x of big ? [-9, -6, -3, 0, 3, 6, 9] : [-6, -3, 0, 3, 6]) px.dot(C[0] + 0.2 + x, C[1] + (big ? 5.2 : 3.8) - 0.2 + ((x & 1) ? 0.8 : 0), PELT, 4.4);
  for (const x of [-5, -1, 3, 6]) px.dot(C[0] + x, C[1] - 3.2, TIP, 4.45, { noLine: true });
  if (big) {
    for (const [dx, k] of [[-8.6, 1], [8.6, 0.8]]) { px.part(); px.capsule(C[0] + dx, C[1] + 2, 2.4, C[0] + dx * 1.05, C[1] + 8.4 * k, 2, PELTF, 4.45, { cast: 1 }); for (const q of [-1.2, 0.2, 1.4]) px.dot(C[0] + dx * 1.05 + q, C[1] + 9.8 * k, BONE, 4.5, { fix: 3 }); }
  }
  if (sto || big) for (const [x, y] of [[-3.4, -0.2], [2.2, -1], [5, 1.4]]) px.dot(C[0] + x, C[1] + y, FROST, 4.46, { noLine: true });

  // the head under the hood; the snout, ears and cheek-hide
  px.part();
  px.stamp(p.blink ? BLINK : p.roar > 0.5 || rage ? ROAR : HEAD, hx, hy, LEG[rage], 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  if (!big) {
    px.part(); px.ellipse(hx + 7.2, hy - 8, 3.6, 2.2, PELT, 6.4, { round: 0.7, cast: 1 }); px.dot(hx + 9.6, hy - 8.4, NOSE, 6.5, { fix: 1 });
    px.part(); px.ellipse(hx - 2.6, hy - 11.4, 2.1, 2, PELT, 6.2, { cast: 1 }); px.dot(hx - 2.6, hy - 11.2, PELT_D, 6.3, { fix: 1 });
    px.part(); px.ellipse(hx + 3.2, hy - 11.8, 2, 1.9, PELT, 6.2, { cast: 1 }); px.dot(hx + 3.2, hy - 11.6, PELT_D, 6.3, { fix: 1 });
    if (sto) { for (const x of [4.6, 6.6, 8.4]) px.dot(hx + x, hy - 6.2, BONE, 6.6, { fix: 3 }); px.dot(hx + 1, hy - 10.4, FROST, 6.6, { noLine: true }); px.dot(hx - 3.6, hy - 9, FROST, 6.6, { noLine: true }); }
  } else {
    // the bear-skull helm: a long muzzle over the brow and dark orbits, and the antlers
    px.part(); px.ellipse(hx + 7.2, hy - 7.2, 3.8, 2, BONE, 6.4, { round: 0.7, cast: 1 }); px.dot(hx + 9.8, hy - 7.6, NOSE, 6.5, { fix: 1 });
    for (const x of [6, 8, 10]) px.dot(hx + x, hy - 5.2, BONE, 6.5, { fix: 3 });
    const ant = (x0, y0, dir, z) => {
      const pts = [[x0, y0, 1.7], [x0 + dir * 2.4, y0 - 4, 1.4], [x0 + dir * 4.6, y0 - 8, 1.1], [x0 + dir * 5.4, y0 - 12, 0.8]];
      px.part();
      for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
      px.capsule(pts[1][0], pts[1][1], 1, pts[1][0] + dir * 4.6, pts[1][1] - 2.4, 0.7, BONE, z, {});
      px.capsule(pts[2][0], pts[2][1], 0.9, pts[2][0] - dir * 1.2, pts[2][1] - 4, 0.6, BONE, z, {});
      px.capsule(pts[3][0], pts[3][1], 0.8, pts[3][0] + dir * 2.4, pts[3][1] - 2.8, 0.5, BONE, z, {});
    };
    ant(hx - 3.2, hy - 9.4, -1, 0.7);
    ant(hx + 2.4, hy - 9.6, 1, 6.6);
  }

  // the near arm over it all, a band at the wrist, the axe in the fist
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.8, 2.7, eN[0], eN[1], 2.3, skin, 7.9, { cast: 1 });
  px.capsule(eN[0], eN[1], 2.3, hdN[0], hdN[1], 2, skin, 7.9, { cast: 1 });
  const c0 = mix(eN, hdN, 0.62);
  px.capsule(c0[0], c0[1], 2.3, hdN[0], hdN[1], 2.1, LEATHER, 7.95, { cast: 1 });
  if (sto || big) { const m0 = mix(sN, eN, 0.55); px.capsule(m0[0], m0[1], 2.6, m0[0] + 0.3, m0[1] + 0.7, 2.6, BRASS, 7.93, { fix: 3 }); }
  px.tag(null);
  const ax = axeAngle(sk);
  px.part(); px.tag("axe");
  axe(px, hdN, ax, v, 8.1);
  px.tag(null);
  px.part(); px.tag("nearHand");
  px.ellipse(hdN[0], hdN[1], 2.0, 2.5, skin, 8.3, { rot: -ax });
  px.tag(null);
  // pelt over the near shoulder
  px.part();
  px.ellipse(sN[0] - 0.4, sN[1] - 0.2, big ? 5.6 : 4.2, big ? 4.6 : 3.4, PELT, 8, { cast: 1 });

  // the rage: a haze of red sparks about the whole man
  if (rage) {
    const ft = (ph || 0) * 6.283;
    for (let i = 0; i < 20; i++) {
      const a = i * 2.399 + ft * 0.4, rr = 13 + (i * 7 % 5) * 2.2, x = C[0] + Math.cos(a) * rr * 0.9, y = C[1] + 4 + Math.sin(a) * rr * 1.1 - ((i * 3 + ft * 2) % 5);
      px.dot(x, y, i % 3 ? HAZE : HAZE2, 19, { noLine: true });
    }
  }
  return {};
};

// the double chop's smear
const T0 = 0.4, T1 = 0.52;
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack" || ph < T0 || ph > T1 + 0.14) return;
  for (const [key, ak, L] of [["hdN", axeAngle, 12.5], ["hdF", axeAngleF, 12.5]]) {
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const q = Math.max(T0, Math.min(ph, T1 + 0.03) - i * 0.01), s = solve(CLIPS.attack.pose(q), BONES), a = ak(s), d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)], h = s[key];
      pts.push([h[0] + d[0] * (L + 2) + n[0] * 4.4, h[1] + d[1] * (L + 2) + n[1] * 4.4]);
    }
    for (let i = 0; i + 1 < pts.length; i += 1) if (i !== 1) px.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], SMEAR, 20, { noLine: true });
  }
};

const GUARD = { drop: 2.4, lean: 0.24, hx: 2.4, hy: 1.2, aN: [0.5, 0.9, 0], aF: [0.85, 0.88, 0], fN: [-4, 0], fF: [4.4, 0], roar: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1200, loop: true, lag: 0.09,
    pose: (ph) => {
      const b = Math.sin(ph * Math.PI * 2), u = 0.5 + 0.5 * b, s = Math.sin(ph * Math.PI * 2 - 1);
      return { ...GUARD, rise: 0.9 * u, drop: 2.4 + 0.6 * (1 - u), rx: 0.7 * s, aN: [0.5 + 0.08 * b, 0.9, 0], aF: [0.85 - 0.08 * b, 0.88, 0], hx: 2.4 + 0.5 * s, blink: ph >= 0.84 && ph < 0.94 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 930, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 4.8, lift: 2.6, swing: 0.5, bob: 1.5, lean: 0.24 }), a = Math.cos(ph * Math.PI * 2);
      return { ...w, drop: w.drop + 1.8, hx: 2.4, aN: [-a * 0.5 + 0.7, 0.9, 0], aF: [a * 0.5 + 0.9, 0.9, 0]};
    },
  },
  attack: {
    n: 12, ms: 700, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // both axes hauled up and back, a roar, the weight on the back foot
      { t: 0.24, e: "out", p: { ...GUARD, rx: -2.4, drop: 2.6, lean: 0.02, twist: -0.5, hx: 0.6, aN: [2.8, 0.94, 0], aF: [2.6, 0.94, 0], fF: [4, 1.6], roar: 1 } },
      { t: T0, e: "io", p: { ...GUARD, rx: -3.2, drop: 2, lean: -0.1, twist: -0.6, hx: 0.2, aN: [3.1, 0.96, 0], aF: [2.9, 0.96, 0], fF: [4, 2.6], roar: 1 } },
      // the chop: a lunge, the near axe straight down, the far one crossing
      { t: T1, e: "in3", p: { ...GUARD, rx: 3.6, drop: 3.6, lean: 0.56, twist: 0.5, hx: 3, hy: 1.4, aN: [0.75, 1, 0], aF: [0.7, 1, 0], fF: [9, 0], roar: 1 } },
      { t: 0.64, e: "out", p: { ...GUARD, rx: 4.2, drop: 4, lean: 0.62, twist: 0.6, hx: 3.2, hy: 1.6, aN: [0.65, 1, 0], aF: [0.6, 1, 0], fF: [9, 0], roar: 1 } },
      { t: 0.84, e: "io", p: { ...GUARD, rx: 1.6, drop: 2.6, lean: 0.3, aN: [0.8, 0.9, 0], aF: [0.9, 0.9, 0], fF: [6.4, 1.8], roar: 0 } },
      { t: 1, e: "out", p: GUARD },
    ], ph),
  },
};
