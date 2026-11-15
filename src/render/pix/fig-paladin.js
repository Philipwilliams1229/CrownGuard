// ============ FIGURE: the Paladin Order's knight ============
// Ivory plate and gold: a closed, flat-topped great helm with a gilt cross-slit, a long ivory
// tabard with a gold cross, a gold-flanged mace in the near fist and no shield: the far hand
// holds up a ringed silver holy sign. Holy blows, so the mace head gleams on the swing.
// Same skeleton as the garrison knight (fig-garrison.js), a head taller in the helm.
// Clips: idle (mace grounded, sign raised, breathing), walk (mace on the shoulder), attack
// (mace hauled back, a heavy overhead blow, follow-through). `hit` 0.5.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN, scaled } from "./rig.js";
import { SKIN, LEATHER, EYE } from "./fig-garrison.js";

const IVORY = mat("#d6d0be", { contrast: 1.45 }), IVMAIL = mat("#9a988e", { contrast: 1.15 }), GOLD = mat("#d8b34a", { contrast: 1.15 });
const COAT = mat("#ece6d2", { contrast: 1.5 }), SILVER = mat("#dfe3ea", { contrast: 1.25 }), WOOD = mat("#6a4a2e");
const GLOW = flat("#fff0b8", { emis: true, line: "#e8c860" }), GLOW2 = flat("#ffe08a", { emis: true, line: "#d8b34a" });
const SLIT = flat("#2a2430");

// the great helm: M ivory, W its glint, m a tone down, G gilt, K the dark of the slit, c mail
const HEAD = [
  "...MMMMMM...",
  ".MMMMMMMMMM.",
  ".MWWMMMMMMG.",
  ".MWMMMMMMMG.",
  ".mmmmmmmmmm.",
  ".GGGGGGGGGGG",
  ".MMKKKKKKGM.",
  ".MMMMMMMMGM.",
  ".MMMMMMMMGM.",
  ".MMMMMMMMGM.",
  "..mMMMMMMmG.",
  "..ccccccc...",
];
const LEG = { M: { m: IVORY }, W: { m: IVORY, bias: 1 }, m: { m: IVORY, bias: -1 }, G: { m: GOLD, fix: 3 }, K: { m: SLIT }, c: { m: IVMAIL } };

export const BOX = { w: 84, h: 72, ox: 34, oy: 62 };
export const BONES = scaled(HUMAN, 1.02, { shN: -3.1, shF: 3.1, hipN: -1.4, hipF: 1.6, neck: 1.4 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.5, k[0], k[1], 2.1, IVORY, z, { bias: b });
  px.capsule(k[0], k[1], 2, an[0], an[1], 1.7, IVORY, z, { bias: b });
  px.ellipse(k[0] + 0.6, k[1], 2, 1.9, GOLD, z + 0.02, { bias: b, vb: 0.25 });
  px.ellipse(an[0] + 1.2, an[1] + 0.9, 2.8, 1.4, IVMAIL, z + 0.03, { bias: b });
};

export const draw = (px, { sk, lag1 }, o = {}) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5);

  // the far arm and the holy sign held up in its hand
  px.part();
  px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 2, IVORY, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2, hdF[0], hdF[1], 1.8, IVORY, 1, { bias: -1 });
  px.part();
  const gx = hdF[0] + 0.6, gy = hdF[1];
  px.line(gx, gy - 8, gx, gy - 0.4, SILVER, 3.4);
  px.line(gx - 2.2, gy - 5.8, gx + 2.2, gy - 5.8, SILVER, 3.4);
  px.ellipse(gx, gy - 5.8, 1.9, 1.9, GOLD, 3.35, { noLine: true });
  px.part(); px.ellipse(hdF[0] + 0.4, hdF[1] + 0.2, 1.7, 1.7, SKIN, 3.5, { bias: -1 });

  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // breastplate, the long ivory tabard with its gold cross and hem, the belt
  px.part();
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 5, C[1] - 1.6], [C[0] + 6.2, C[1] + 3.5], [P[0] + 4.8, P[1] - 2.6], [P[0] - 4.8, P[1] - 2.6], [C[0] - 6, C[1] + 3.5]], IVORY, 4, { round: 0.92, ny: -0.12, cast: 2 });
  const hy = P[1] + 5.2, hemB = P[0] - 6 - vx * 1.2, hemF = P[0] + 5.8 - vx * 0.8;
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 3.8, C[1] - 1.2], [C[0] + 4, C[1] - 1.2], [C[0] + 5.2, C[1] + 3.3], [P[0] + 4.8, P[1] - 2.6], [hemF, hy], [hemF - 2.6, hy + 0.9], [P[0] + 0.4 - vx, hy], [hemB + 2.8, hy + 0.9], [hemB, hy], [P[0] - 4.8, P[1] - 2.6], [C[0] - 5.2, C[1] + 3.3]], COAT, 4.2, { round: 0.9, cast: 2 });
  px.toneLine(P[0] + 0.8, P[1] - 1, P[0] + 0.6 - vx, hy - 0.6, -1, coat);
  px.line(hemB + 1, hy - 0.7, hemF - 1, hy - 0.7, GOLD, 4.22);
  px.line(C[0] + 0.8, C[1] - 0.2, C[0] + 0.8, C[1] + 5.4, GOLD, 4.25);
  px.line(C[0] - 1.4, C[1] + 1.6, C[0] + 3, C[1] + 1.6, GOLD, 4.25);
  px.poly([[P[0] - 4.9, P[1] - 3.4], [P[0] + 4.8, P[1] - 3.4], [P[0] + 4.9, P[1] - 1.6], [P[0] - 5, P[1] - 1.6]], LEATHER, 4.3, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3.4, 2, 1.8, GOLD, 4.32, { fix: 3 });
  px.line(C[0] - 2.4, C[1] - 1.2, C[0] + 3.4, C[1] - 1.2, GOLD, 4.3);

  // the helm
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  px.part();
  px.stamp(HEAD, hx, hyy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 6.6, 6.6], cast: 2 });

  // the mace: a haft, a gilt flanged head; sw its angle from upright (+ toward the foe)
  const a = p.sw ?? 2.3, d = [Math.sin(a), -Math.cos(a)], nrm = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t + nrm[0] * s, hdN[1] + d[1] * t + nrm[1] * s];
  const bz = (p.nb || 0) > 0.5 ? 5.4 : 7;
  px.part();
  px.capsule(...B(-3.4), 0.9, ...B(11), 0.9, WOOD, bz, { edge: true });
  px.ellipse(...B(-3.8), 1.1, 1.1, GOLD, bz + 0.02);
  px.part();
  px.ellipse(...B(14), 3.2, 3.2, GOLD, bz + 0.05, { edge: true });
  px.capsule(...B(14, -4), 1.0, ...B(14, 4), 1.0, GOLD, bz + 0.07, { edge: true });
  px.capsule(...B(10.6), 1.0, ...B(17.6), 1.0, GOLD, bz + 0.07, { edge: true });
  px.dot(...B(14), IVORY, bz + 0.1, { fix: 4 });

  // the near arm: pauldron, vambrace, gauntlet
  const az = (p.nb || 0) > 0.5 ? 5.5 : 8;
  px.part();
  px.capsule(sN[0], sN[1] + 0.5, 2.2, eN[0], eN[1], 2.1, IVORY, az, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.1, hdN[0], hdN[1], 1.9, IVORY, az, { cast: 2 });
  px.ellipse(eN[0], eN[1], 1.8, 1.8, GOLD, az + 0.02, { vb: 0.25 });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] - 0.4, 3.7, 3.2, IVORY, 8.1, { cast: 2 });
  px.line(sN[0] - 3, sN[1] + 2.2, sN[0] + 2.6, sN[1] + 2.2, GOLD, 8.12);
  px.part(); px.ellipse(hdN[0], hdN[1], 2, 1.9, IVMAIL, az + 0.2);

  return { hand: hdN, sw: a, mace: B(14) };
};

// the blow's light: the gilt head throws a holy streak behind it on the fast frames
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const a1 = F.sk.p.sw, a0 = F.lag1.p.sw;
  if (!(a1 - a0 > 0.5)) return;
  const [hx, hy] = F.sk.hdN, [gx, gy] = F.lag1.hdN, n = 10;
  const at = (t, r) => { const a = a0 + (a1 - a0) * t, x = gx + (hx - gx) * t, y = gy + (hy - gy) * t; return [x + Math.sin(a) * r, y - Math.cos(a) * r]; };
  const arc = (t0, rIn, m, z) => { const out = [], inn = []; for (let i = 0; i <= n; i++) { const t = t0 + (1 - t0) * (i / n); out.push(at(t, 18)); inn.unshift(at(t, 18 - (18 - rIn) * ((t - t0) / (1 - t0)) ** 1.4)); } px.poly([...out, ...inn], m, z, { noLine: true }); };
  arc(0, 10, GLOW2, 20); arc(0.45, 14, GLOW, 20.1);
};

const GUARD = { aN: [0.6, 0.62, 0], aF: [2.2, 0.8, 0], sw: -0.9, fN: [-2, 0], fF: [2.4, 0] };
export const CLIPS = {
  idle: {
    n: 8, ms: 1900, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 0.9); return { ...GUARD, rise: 0.5 + 0.5 * b, sw: -0.9 + 0.03 * b2, aF: [2.2 + 0.05 * b2, 0.8, 0] }; },
  },
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.2, lift: 2.7, swing: 0.4, bob: 1.1 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aN: [0.7 + 0.06 * a, 0.58, 0], sw: -0.9 + 0.05 * a, aF: [2.0 + 0.1 * a, 0.8, 0] }; },
  },
  attack: {
    n: 13, ms: 900, loop: false, lag: 0.07, hit: 0.5,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.32, e: "out", p: { rx: -1.4, drop: 0.7, lean: -0.14, twist: -0.7, rise: 0.4, aN: [3.3, 0.85, 1], nb: 1, sw: -0.7, aF: [2.4, 0.8, 0], fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.4, e: "io", p: { rx: -1.6, drop: 0.8, lean: -0.16, twist: -0.8, rise: 0.5, aN: [3.4, 0.86, 1], nb: 1, sw: -0.95, aF: [2.5, 0.8, 0], fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.5, e: "in3", p: { rx: 2.4, drop: 1.7, lean: 0.22, twist: 0.8, hx: 0.5, aN: [1.2, 1, 0], nb: 0, sw: 1.9, aF: [1.9, 0.8, 0], fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.62, e: "out", p: { rx: 3, drop: 2.1, lean: 0.27, twist: 0.9, hx: 0.6, aN: [0.6, 0.96, 0], sw: 2.7, aF: [1.6, 0.8, 0], fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.76, e: "io", p: { rx: 2.5, drop: 1.6, lean: 0.2, twist: 0.6, hx: 0.4, aN: [0.5, 0.94, 0], sw: 2.55, aF: [1.8, 0.8, 0], fN: [-2.6, 0], fF: [6, 0] } },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
};
