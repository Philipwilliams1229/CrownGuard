// ============ CONCEPT FIGURE: the orc bruiser ============
// Big (about 52 px to the topknot; a man is ~44) and very wide: heavy shoulders
// and forearms, short legs, the head sunk in a fur collar between the
// shoulders. Tusks up out of an underbite, yellow eyes under one slab of brow,
// a dark topknot that whips a beat behind the head. A hide kilt, a strap, iron
// on the belt, and a great bearded axe. Three clips: idle (the axe resting on
// its beard), walk (a stomp, the axe swinging with the arm), attack (a
// two-handed overhead chop that buries the axe before him).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, solve } from "./rig.js";

const SKIN = mat("#5a8a3c"), HAIR = mat("#2e1e16"), HIDE = mat("#6e523a"), DARK = mat("#3e2c22"), FUR = mat("#9a8462"), BOOT = mat("#4a382c");
const STEEL = mat("#b8bcc4", { contrast: 1.2 }), IRON = mat("#7c808c"), WOOD = mat("#7a5632"), BONE = mat("#ece0c4");
const BAND = mat("#a8432e"), EYE = flat("#f0c83c"), MOUTH = flat("#2c1a22");
const SMEAR1 = flat("#f6f4e6"), SMEAR2 = flat("#cfe0b4"), CLOD = flat("#5a4028"), TURF = flat("#4f8a3a");

// The head, facing +x, a quarter turned: a mane down the back (H), a low
// forehead over one slab of brow (B), yellow eyes (Y) cut to a scowl by it, a flat
// snout (L, N, the nostril n), tusks (T) standing up out of the jutting jaw.
const HEAD = [
  "......HHHHH.....",
  "...HHHHHHHHHH...",
  "..HHHHGGGGGGGG..",
  ".HHHGGGGGGGGGGG.",
  ".HHGBBBBBGGBBBBB",
  ".HHGGbYBGGGBBYG.",
  ".HHGGbYYGGGbYYG.",
  ".HHGGGGGGGgLLLG.",
  "..HGGGGGGGgnLNNG",
  "..HGGTGMMMMMTGGG",
  "..HGGTTLLLLTTGGG",
  "..GGGGGGGGGGGGGG",
  "..gGGGGGGGGGGGGG",
  "...gGGGGGGGGGGg.",
  ".....ggggggggg..",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
const BLINK = swap(HEAD, { 5: ".HHGGGGGGGGGGGG.", 6: ".HHGGBBBGGGBBBG." });
// the chop's roar: the jaw dropped, the mouth open on the tusks
const ROAR = swap(HEAD, { 9: "..HGGTGMMMMMTGGG", 10: "..HGGTMMMMMMTGGG", 11: "..GGGTTLLLLTTGGG", 12: "..gGGGGGGGGGGGGG", 13: "...gGGGGGGGGGGg.", 14: ".....ggggggggg.." });
const LEG = {
  G: { m: SKIN }, g: { m: SKIN, bias: -1 }, L: { m: SKIN, fix: 3 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 0 },
  B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, Y: { m: EYE }, T: { m: BONE, fix: 3 }, M: { m: MOUTH },
  H: { m: HAIR }, h: { m: HAIR, bias: 1 },
};

export const BOX = { w: 80, h: 84, ox: 37, oy: 78 };
export const BONES = { thigh: 8.5, shin: 8, ankle: 2.2, spine: 18.5, neck: 1, upper: 9, fore: 8.5, shN: -7.6, shF: 7, hipN: -3, hipF: 3.2 };

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// the same two-bone rule as the rig's arms (the elbow folds back and down)
const elbow = (s, t, l1, l2) => {
  let dx = t[0] - s[0], dy = t[1] - s[1], d = Math.hypot(dx, dy) || 1e-6;
  const max = (l1 + l2) * 0.999;
  if (d > max) { t = [s[0] + (dx / d) * max, s[1] + (dy / d) * max]; d = max; dx = t[0] - s[0]; dy = t[1] - s[1]; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / d, uy = dy / d;
  return [[s[0] + ux * a - uy * h, s[1] + uy * a + ux * h], t];
};

// the axe: 0 = the haft straight up, PI/2 = level before him; the beard leads the swing
const LEN = 25;
const axeOf = (sk) => {
  const a = sk.p.axe ?? 2.3, g = sk.p.grip ?? 9, h = sk.hdN;
  const d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)];
  return { g, H: LEN - 4 - g, at: (f, s) => [h[0] + d[0] * f + n[0] * s, h[1] + d[1] * f + n[1] * s] };
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, hdN, hN, hF, kN, kF, anN, anF, B } = sk;
  const vx = cl(N[0] - lag1.N[0], -2.5, 2.5), vy = cl(N[1] - lag1.N[1], -2.5, 2.5);
  const vx2 = cl(lag1.N[0] - lag2.N[0], -2.5, 2.5), vy2 = cl(lag1.N[1] - lag2.N[1], -2.5, 2.5);
  const bx = cl(P[0] - lag1.P[0], -2, 2), bx2 = cl(lag1.P[0] - lag2.P[0], -2, 2);
  const ax = axeOf(sk), g2 = p.grip2 || 0;

  // the far arm, a tone down: it swings free, or reaches across to the haft
  const [eF, hdF] = elbow(sF, mix(sk.hdF, ax.at(5.5, 0), g2), B.upper, B.fore);
  px.part();
  px.capsule(sF[0], sF[1] + 0.6, 4.2, eF[0], eF[1], 3.6, SKIN, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 3.4, hdF[0], hdF[1], 3.7, SKIN, 1, { bias: -1 });
  const f0 = mix(eF, hdF, 0.35), f1 = mix(eF, hdF, 0.8);
  px.capsule(f0[0], f0[1], 3.6, f1[0], f1[1], 3.9, HIDE, 1.02, { bias: -1 });
  px.part();
  px.ellipse(hdF[0], hdF[1], 3, 3, SKIN, g2 > 0.5 ? 8.25 : 1.1, { bias: -1 });

  // short thick legs: bare knees, dark hide boots with a fur cuff
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 3.9, kn[0], kn[1], 3.3, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 3.2, an[0], an[1], 2.6, SKIN, z, { bias: b });
    const b0 = mix(kn, an, 0.5);
    px.capsule(b0[0], b0[1], 3.1, an[0], an[1], 2.8, BOOT, z + 0.03, { bias: b });
    px.capsule(an[0] - 1, an[1] + 0.4, 1.8, an[0] + 4.4, an[1] + 0.75, 1.45, BOOT, z + 0.03, { bias: b });
    px.capsule(b0[0] - 2.4, b0[1] - 0.2, 1.1, b0[0] + 2.4, b0[1] + 0.2, 1.1, FUR, z + 0.05, { bias: b });
  }

  // the hide kilt: short, hung from the belt, its ragged hem a beat behind the hips
  const kh = P[1] + 4.2, kf = P[0] + 7.2 - bx * 1.4 - bx2 * 0.8, kb = P[0] - 7.4 - bx * 1.8 - bx2 * 1.2, km = (t) => kb + (kf - kb) * t;
  px.part(); const kiltId = px._pid;
  px.poly([[P[0] - 7, P[1] - 1], [P[0] + 6.8, P[1] - 1], [kf, kh - 1], [km(0.86), kh + 0.8], [km(0.7), kh - 0.6], [km(0.52), kh + 1.2], [km(0.34), kh - 0.4], [km(0.16), kh + 0.8], [kb, kh - 1.4]], HIDE, 3.6, { round: 0.85, cast: 1 });
  px.toneLine(P[0] + 2, P[1] + 1, km(0.62), kh - 1, -1, kiltId);
  px.toneLine(P[0] - 3, P[1] + 1, km(0.26), kh - 1.2, -1, kiltId);

  // the trunk: a bare green barrel, deep in the chest; a strap across it, a broad belt with an iron buckle
  px.part(); const bodyId = px._pid;
  px.poly([[C[0] - 9, C[1] - 2], [C[0] + 8.4, C[1] - 2.6], [C[0] + 10.6, C[1] + 4], [C[0] + 9.6, C[1] + 9], [P[0] + 7.2, P[1] - 5], [P[0] + 6.8, P[1] + 0.4],
    [P[0] - 7, P[1] + 0.4], [P[0] - 7.6, P[1] - 5], [C[0] - 10.4, C[1] + 8], [C[0] - 10.8, C[1] + 3]], SKIN, 4, { round: 0.92, cast: 1 });
  px.toneLine(C[0] + 1, C[1] + 8.6, C[0] + 8.6, C[1] + 8, -1, bodyId);       // under the chest
  px.toneLine(C[0] + 3.4, C[1] + 3, C[0] + 3.2, C[1] + 8, -1, bodyId);       // between the pecs
  const md = mix(C, P, 0.6);
  px.toneLine(md[0] + 3, md[1], P[0] + 3, P[1] - 4.4, -1, bodyId);           // the belly's line
  px.poly([[C[0] - 8, C[1] + 1.4], [C[0] - 5, C[1] + 0.2], [P[0] + 7.2, P[1] - 6.4], [P[0] + 7, P[1] - 3.4]], DARK, 4.03, { round: 0.5 });
  px.poly([[P[0] - 7.5, P[1] - 4], [P[0] + 7.3, P[1] - 4], [P[0] + 7, P[1] + 0.4], [P[0] - 7.2, P[1] + 0.4]], BOOT, 4.05, { round: 0.92, bias: 1 });
  px.rect(P[0] + 1.4, P[1] - 3.4, 3, 3, IRON, 4.06, { fix: 3 });
  px.dot(P[0] + 2.5, P[1] - 2.2, IRON, 4.07, { fix: 1 });

  // the fur collar the head sits in
  px.part();
  px.ellipse(C[0] + 0.4, C[1] - 1.6, 9.6, 3.6, FUR, 4.2, { cast: 1 });
  for (const [x, y] of [[-7.4, 2.6], [-4.4, 3.6], [-1.4, 3.2], [2, 3.8], [5, 3.4], [8, 2.6]]) px.dot(C[0] + 0.4 + x, C[1] - 1.6 + y, FUR, 4.2);

  // the head, low between the shoulders
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  px.part();
  px.stamp(p.blink ? BLINK : p.roar > 0.5 ? ROAR : HEAD, hx, hy, LEG, 6, { ax: 7, ay: 11, ball: [7.5, 7, 8.5, 8.5], cast: 1 });
  // a small torn ear
  px.part();
  px.poly([[hx - 4.6, hy - 5.4], [hx - 3.4, hy - 2.6], [hx - 7.6, hy - 6.4]], SKIN, 6.2, { n: [-0.3, -0.3, 0.9] });

  // the topknot: bound in a bone ring, its tail whipping a beat behind the head
  const top = hy - 11, sway = cl(vx * 1.8 + vx2 * 1.4, -3, 3.5), hop = cl(vy * 1.4 + vy2, -2, 2);
  const k0 = [hx - 0.6, top + 0.6], k1 = [hx - 1.4 - sway * 0.3, top - 3.6 - hop * 0.3], k2 = [hx - 5.6 - sway, top - 2.4 - hop + Math.abs(sway) * 0.3], k3 = [hx - 8 - sway * 1.5, top + 1.6 - hop * 1.2];
  px.part();
  px.capsule(k0[0], k0[1], 1.6, k1[0], k1[1], 1.9, HAIR, 6.3);
  px.capsule(k1[0], k1[1], 1.9, k2[0], k2[1], 1.5, HAIR, 6.3);
  px.capsule(k2[0], k2[1], 1.5, k3[0], k3[1], 0.8, HAIR, 6.3);
  px.part();
  px.capsule(k0[0] - 1.2, k0[1] - 0.8, 0.9, k0[0] + 1, k0[1] - 1, 0.9, BAND, 6.4);

  // the axe: an oak haft, a bearded steel head; the near fist closes over it
  px.part();
  px.capsule(...ax.at(-ax.g, 0), 1.05, ...ax.at(ax.H + 3.4, 0), 1.05, WOOD, 8.1, { edge: true });
  px.part();
  const H = ax.H;
  px.poly([ax.at(H - 2.4, 0.6), ax.at(H - 3.6, 4.4), ax.at(H - 5, 8.6), ax.at(H - 1.4, 9.6), ax.at(H + 2.4, 9), ax.at(H + 5.4, 6.6), ax.at(H + 3.6, 3.4), ax.at(H + 2.8, 0.6)], STEEL, 8.12, { fix: 2 });
  px.poly([ax.at(H - 5, 8.6), ax.at(H - 1.4, 9.6), ax.at(H + 2.4, 9), ax.at(H + 5.4, 6.6), ax.at(H + 3.9, 5.6), ax.at(H + 1.8, 7.4), ax.at(H - 1.4, 7.9), ax.at(H - 4.2, 7)], STEEL, 8.13, { fix: 4 });
  px.poly([ax.at(H - 2.4, 0.6), ax.at(H - 3.3, 3.4), ax.at(H + 3.3, 3), ax.at(H + 2.8, 0.6)], STEEL, 8.13, { fix: 1 });
  px.poly([ax.at(H - 1.8, -0.8), ax.at(H + 2.2, -0.8), ax.at(H + 1.8, -3), ax.at(H - 1.4, -3)], IRON, 8.12, { fix: 2 });
  px.poly([ax.at(H - 2.4, -1.2), ax.at(H + 2.8, -1.2), ax.at(H + 2.8, 1.2), ax.at(H - 2.4, 1.2)], IRON, 8.14, { fix: 1 });

  // the near arm over it all: a hide pauldron, a slab of forearm in a studded bracer
  px.part();
  px.capsule(sN[0], sN[1] + 1, 4.4, eN[0], eN[1], 3.8, SKIN, 7.9, { cast: 1 });
  px.capsule(eN[0], eN[1], 3.6, hdN[0], hdN[1], 3.9, SKIN, 7.9, { cast: 1 });
  const b0 = mix(eN, hdN, 0.34), b1 = mix(eN, hdN, 0.78);
  px.capsule(b0[0], b0[1], 3.9, b1[0], b1[1], 4.1, DARK, 7.95, { cast: 1 });
  px.dot(mix(b0, b1, 0.25)[0], mix(b0, b1, 0.25)[1], IRON, 7.96, { fix: 4 }); px.dot(mix(b0, b1, 0.8)[0], mix(b0, b1, 0.8)[1], IRON, 7.96, { fix: 4 });
  px.part();
  px.ellipse(sN[0] - 0.4, sN[1] - 0.6, 5.4, 4.5, HIDE, 8, { cast: 1 });
  for (const x of [-3.6, -1, 1.6, 4]) px.dot(sN[0] - 0.4 + x, sN[1] + 3.6 - Math.abs(x) * 0.3, FUR, 8);
  px.dot(sN[0] - 2.6, sN[1] - 1.4, IRON, 8.01, { fix: 4 }); px.dot(sN[0] + 1.4, sN[1] - 2.4, IRON, 8.01, { fix: 4 });
  px.part();
  px.ellipse(hdN[0], hdN[1], 3.2, 3.2, SKIN, 8.3);

  return { bite: ax.at(ax.H, 8) };
};

// the smear behind the axe's edge on the chop's fastest frames, and the turf it throws up
const T0 = 0.45, T1 = 0.55;
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack") return;
  if (ph > T0 + 0.005 && ph < T1 + 0.075) {
    const end = Math.min(ph, T1 + 0.004), pts = [];
    for (let i = 0; i <= (ph > T1 + 0.01 ? 4 : 6); i++) {
      const q = Math.max(T0, end - 0.004 - i * 0.0042), a = axeOf(solve(CLIPS.attack.pose(q), BONES));
      pts.push([a.at(a.H + 5.2, 7), a.at(a.H - 4.6, 9)]);
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const t = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1), m = ph < T1 + 0.01 && t < 0.4 ? SMEAR1 : SMEAR2;
      px.poly([pts[i][0], pts[i + 1][0], mix(pts[i + 1][1], pts[i + 1][0], t1 * 0.85), mix(pts[i][1], pts[i][0], t * 0.85)], m, 20 - t, { noLine: true });
    }
  }
  if (ph >= T1 - 0.02 && ph < T1 + 0.2 && info.bite) {
    const t = (ph - (T1 - 0.02)) / 0.22, [x, y] = info.bite;
    for (let i = 0; i < 7; i++) {
      const dir = (i - 3) * 0.42 + 0.2, sp = 5 + (i * 37 % 5) * 1.6;
      px.dot(x + Math.sin(dir) * sp * t * 1.6, Math.min(0, y - Math.cos(dir) * sp * t * 2 + 9 * t * t), i % 3 ? CLOD : TURF, 20, { noLine: i % 2 === 0 });
    }
  }
};

const GUARD = { drop: 1.5, lean: 0.22, twist: 0, hx: 3, hy: 2, rise: 0, aN: [0.15, 0.95, 0], aF: [0.1, 0.92, 0], fN: [-3.4, 0], fF: [3.8, 0], axe: 1.9, grip: 4.5, grip2: 0, roar: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 2000, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * Math.PI * 2), u = 0.5 + 0.5 * b, s = Math.sin(ph * Math.PI * 2 - 1.2);
      return { ...GUARD, rise: 1.4 * u, rx: 0.9 * s, hy: 2 + 0.5 * (1 - u), lean: 0.22 - 0.02 * b, aN: [0.15 - 0.02 * b, 0.95 - 0.05 * u, 0], aF: [0.1 + 0.05 * b, 0.92, 0], axe: 1.9 + 0.035 * u, blink: ph >= 0.8 && ph < 0.92 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 900, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 4.4, lift: 2.4, swing: 0.3, bob: 1.8, lean: 0.26 }), a = Math.cos(ph * Math.PI * 2);
      return { ...w, drop: w.drop + 1.2, twist: -a * 0.9, hx: 3, hy: 2, aN: [-a * 0.3 + 0.2, 0.9, 0], aF: [a * 0.34 + 0.12, 0.9, 0], axe: 1.8 - a * 0.2, grip: 4.5, grip2: 0, roar: 0 };
    },
  },
  attack: {
    n: 14, ms: 1300, loop: false, lag: 0.05,
    pose: (ph) => {
      const p = sampleKeys([
        { t: 0, p: GUARD },
        // both hands to the haft, the axe swung up off the ground
        { t: 0.14, e: "io", p: { ...GUARD, rx: -0.6, lean: 0.14, aN: [0.9, 0.7, 0], axe: 1.1, grip: 5, grip2: 1 } },
        // the heave: up and back over the head, the weight on the back foot, the front foot off the ground
        { t: 0.34, e: "out", p: { ...GUARD, rx: -2.6, drop: 0.6, rise: 1, lean: -0.08, twist: -0.4, hx: 2.4, hy: 1.2, aN: [3.3, 0.86, 0], fF: [3.2, 2.2], axe: -0.5, grip: 5, grip2: 1, roar: 0 } },
        { t: T0, e: "io", p: { ...GUARD, rx: -3.2, drop: 0.4, rise: 1.4, lean: -0.14, twist: -0.5, hx: 2.2, hy: 1, aN: [3.5, 0.88, 0], fF: [3.6, 3], axe: -0.72, grip: 5, grip2: 1, roar: 1 } },
        // the chop: a step in, everything comes down
        { t: T1, e: "in3", p: { ...GUARD, rx: 3.6, drop: 3.4, lean: 0.52, twist: 0.5, hx: 3.6, hy: 3, aN: [0.56, 1, 0], fF: [9, 0], axe: 2.06, grip: 5, grip2: 1, roar: 1 } },
        { t: 0.63, e: "out", p: { ...GUARD, rx: 4.2, drop: 4.2, lean: 0.58, twist: 0.6, hx: 3.8, hy: 3.4, aN: [0.52, 1, 0], fF: [9, 0], axe: 2.1, grip: 5, grip2: 1, roar: 1 } },
        { t: 0.76, e: "io", p: { ...GUARD, rx: 3.8, drop: 3.6, lean: 0.54, twist: 0.5, hx: 3.6, hy: 3, aN: [0.55, 1, 0], fF: [9, 0], axe: 2.07, grip: 5, grip2: 1, roar: 0 } },
        // wrench it free and settle
        { t: 0.89, e: "io", p: { ...GUARD, rx: 1.6, drop: 1.2, lean: 0.24, aN: [0.6, 0.8, 0], fF: [6.6, 1.8], axe: 1.55, grip: 5, grip2: 0.6 } },
        { t: 1, e: "out", p: GUARD },
      ], ph);
      // the recoil: the haft shivers in his hands while the axe is stuck
      if (ph > 0.57 && ph < 0.78) { const k = (0.78 - ph) / 0.21, s = Math.sin(ph * 95); p.hx += s * 0.7 * k; p.twist += s * 0.25 * k; }
      return p;
    },
  },
};
