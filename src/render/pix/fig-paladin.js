// ============ FIGURE: the Paladin Order's knight ============
// Ivory plate and gold: a closed, flat-topped great helm with a gilt cross-slit, a long ivory
// tabard with a gold cross, a gold-flanged mace in the near fist and no shield: the far hand
// holds up a ringed silver holy sign. Holy blows, so the mace head gleams on the swing.
// Same skeleton as the garrison knight (fig-garrison.js), a head taller in the helm.
// Clips: idle (mace grounded, sign raised, breathing), walk (mace on the shoulder), attack
// (mace hauled back, a heavy overhead blow, follow-through). `hit` 0.5.
import { mat, flat, layers } from "./pix.js";
import { stampFace } from "./bowlayers.js";
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
// the near arm may pass in front of the helm, never behind it
export const MUST = [["nearArm", "notOver", "eyes"]];   // the shield is the far arm's, behind the tabard (z 3.5)
export const BONES = scaled(HUMAN, 1.02, { shN: -3.1, shF: 3.1, hipN: -1.4, hipF: 1.6, neck: 1.4 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// THE GRIP (as Osric's mace, fig-friar.js). The weapon is held in a closed fist: its angle is DERIVED from the solved
// forearm, never posed on its own. weapon angle (from upright, + toward the foe) = forearm direction (elbow -> hand)
// + GRIP + wrist; it stands up out of the thumb side of the fist, about 97 degrees from the forearm.
export const GRIP = -1.7;
export const WRIST = 0.35;
const forearm = (sk) => { const f = Math.atan2(sk.hdN[0] - sk.eN[0], -(sk.hdN[1] - sk.eN[1])); return f < -1.9 ? f + Math.PI * 2 : f; };
export const maceAngle = (sk) => forearm(sk) + GRIP + cl(sk.p.wrist || 0, -WRIST, WRIST);
// Depth order, STATIC: the head, the weapon, the near arm (in front of the head, never behind it).
const KZ = layers(["head", "mace", "arm"], [], { z0: 5, step: 0.45 });

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

  // the far arm and its kite shield (as the garrison knight carries his): gilt rim, ivory field, the gilt sun, no cross
  px.part();
  px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 2, IVORY, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2, hdF[0], hdF[1], 1.8, IVORY, 1, { bias: -1 });
  const sx = hdF[0] * 0.7 + eF[0] * 0.3 + 0.8, sy = hdF[1] * 0.7 + eF[1] * 0.3 + 0.6, tl = p.shield ?? 0.08, cs = Math.cos(tl), sn = Math.sin(tl);
  const S = (x, y) => [sx + x * cs - y * sn, sy + x * sn + y * cs];
  px.part();
  px.poly([S(-4.6, -6.2), S(4.6, -6.2), S(4.9, 0.6), S(0, 8), S(-4.9, 0.6)], GOLD, 3.5, { round: 0.6, cast: 2 });
  px.poly([S(-3.5, -5.1), S(3.5, -5.1), S(3.7, 0.3), S(0, 6.3), S(-3.7, 0.3)], COAT, 3.52, { round: 0.6 });
  px.ellipse(...S(0, -0.6), 2.3, 2.3, GOLD, 3.55, { noLine: true });
  px.ellipse(...S(0, -0.6), 1.1, 1.1, COAT, 3.57, { noLine: true });

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
  px.ellipse(C[0] + 1, C[1] + 2.8, 2.3, 2.3, GOLD, 4.25, { noLine: true });    // a gilt sun on the breast (no cross)
  px.ellipse(C[0] + 1, C[1] + 2.8, 1.1, 1.1, COAT, 4.27, { noLine: true });
  px.poly([[P[0] - 4.9, P[1] - 3.4], [P[0] + 4.8, P[1] - 3.4], [P[0] + 4.9, P[1] - 1.6], [P[0] - 5, P[1] - 1.6]], LEATHER, 4.3, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3.4, 2, 1.8, GOLD, 4.32, { fix: 3 });
  px.line(C[0] - 2.4, C[1] - 1.2, C[0] + 3.4, C[1] - 1.2, GOLD, 4.3);

  // the helm
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  px.part();
  const Z = KZ({});
  stampFace(px, HEAD, hx, hyy, LEG, Z.head, Z.head, { ax: 6, ay: 10, ball: [6.5, 5.5, 6.6, 6.6], cast: 2 }, "K", "K");

  // the mace: a haft, a gilt flanged head; sw its angle from upright (+ toward the foe)
  const a = maceAngle(sk), d = [Math.sin(a), -Math.cos(a)], nrm = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t + nrm[0] * s, hdN[1] + d[1] * t + nrm[1] * s];
  const bz = Z.mace;
  px.tag("mace");
  px.part();
  px.capsule(...B(-3.4), 0.9, ...B(11), 0.9, WOOD, bz, { edge: true });
  px.ellipse(...B(-3.8), 1.1, 1.1, GOLD, bz + 0.02);
  px.part();
  px.ellipse(...B(14), 3.2, 3.2, GOLD, bz + 0.05, { edge: true });
  px.capsule(...B(14, -4), 1.0, ...B(14, 4), 1.0, GOLD, bz + 0.07, { edge: true });
  px.capsule(...B(10.6), 1.0, ...B(17.6), 1.0, GOLD, bz + 0.07, { edge: true });
  px.dot(...B(14), IVORY, bz + 0.1, { fix: 4 });

  px.tag(null);
  // the near arm: pauldron, vambrace, gauntlet
  const az = Z.arm;
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.5, 2.2, eN[0], eN[1], 2.1, IVORY, az, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.1, hdN[0], hdN[1], 1.9, IVORY, az, { cast: 2 });
  px.ellipse(eN[0], eN[1], 1.8, 1.8, GOLD, az + 0.02, { vb: 0.25 });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] - 0.4, 3.7, 3.2, IVORY, 8.1, { cast: 2 });
  px.line(sN[0] - 3, sN[1] + 2.2, sN[0] + 2.6, sN[1] + 2.2, GOLD, 8.12);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.8, 2.3, IVMAIL, az + 0.2, { rot: -a }); px.tag(null);

  return { hand: hdN, sw: a, mace: B(14) };
};

// the blow's light: the gilt head throws a holy streak behind it on the fast frames
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const a1 = maceAngle(F.sk), a0 = maceAngle(F.lag1);
  if (!(a1 - a0 > 0.5)) return;
  const [hx, hy] = F.sk.hdN, [gx, gy] = F.lag1.hdN, n = 10;
  const at = (t, r) => { const a = a0 + (a1 - a0) * t, x = gx + (hx - gx) * t, y = gy + (hy - gy) * t; return [x + Math.sin(a) * r, y - Math.cos(a) * r]; };
  const arc = (t0, rIn, m, z) => { const out = [], inn = []; for (let i = 0; i <= n; i++) { const t = t0 + (1 - t0) * (i / n); out.push(at(t, 18)); inn.unshift(at(t, 18 - (18 - rIn) * ((t - t0) / (1 - t0)) ** 1.4)); } px.poly([...out, ...inn], m, z, { noLine: true }); };
  arc(0, 10, GLOW2, 20); arc(0.45, 14, GLOW, 20.1);
};

const GUARD = { aN: [1.1, 0.95, 0], wrist: 0.35, aF: [0.55, 0.72, 0], shield: 0.06, fN: [-2, 0], fF: [2.4, 0] };
const FA = [0.5, 0.9, 1.05, 0.5, 0.2, 0.05, 0.15], SH = [-0.02, -0.08, -0.1, 0.1, 0.25, 0.3, 0.25];   // the far arm and the shield's tilt, per attack key (the garrison knight's)
export const CLIPS = {
  idle: {
    n: 8, ms: 1900, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 0.9); return { ...GUARD, rise: 0.5 + 0.5 * b, aN: [1.1, 0.95 - 0.03 * (0.5 + 0.5 * b), 0], wrist: 0.35 + 0.03 * b2, aF: [GUARD.aF[0] + 0.05 * b2, 0.72, 0], shield: 0.06 + 0.02 * b2, sway: b2 * 0.7 }; },
  },
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.2, lift: 2.7, swing: 0.4, bob: 1.1 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aN: [1.1 + 0.05 * a, 0.9, 0], wrist: 0.3 + 0.05 * a, aF: [0.5 + 0.18 * a, 0.72, 0], shield: 0.06 + 0.05 * a }; },
  },
  // the lift (fist up the front, the mace standing out of it), the cock (forearm up beside the back of the helm, the
  // mace lying back behind the head), the forearm carried over, the blow (forearm forward-down, the mace follows)
  attack: {
    n: 13, ms: 900, loop: false, lag: 0.07, hit: 0.5,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.09, e: "out", p: { rx: -0.4, drop: 0.25, lean: -0.04, twist: -0.2, rise: 0.15, aN: [1.1, 0.8, 0], wrist: 0.35, aF: [FA[0], 0.75, 0], shield: SH[0], fN: [-2, 0], fF: GUARD.fF } },
      { t: 0.18, e: "out", p: { rx: -1.1, drop: 0.55, lean: -0.1, twist: -0.6, rise: 0.35, hx: 0.6, aN: [3.4, 1, 0], wrist: 0.35, aF: [FA[1], 0.75, 0], shield: SH[1], fN: [-2, 0], fF: GUARD.fF } },
      { t: 0.38, e: "io", p: { rx: -1.6, drop: 0.8, lean: -0.15, twist: -0.8, rise: 0.5, hx: 0.7, aN: [3.5, 1, 0], wrist: 0.35, aF: [FA[2], 0.75, 0], shield: SH[2], fN: [-2, 0], fF: GUARD.fF } },
      { t: 0.45, e: "out", p: { rx: 0.4, drop: 1.0, lean: 0.05, twist: 0.1, rise: 0.2, hx: 0.6, aN: [1.7, 0.95, 0], wrist: 0.2, aF: [FA[3], 0.75, 0], shield: SH[3], fN: [-2.4, 0], fF: [4, 0] } },
      { t: 0.5, e: "in3", p: { rx: 2.4, drop: 1.6, lean: 0.2, twist: 0.8, hx: 0.5, aN: [0.6, 1, 0], wrist: 0.35, aF: [FA[4], 0.75, 0], shield: SH[4], fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.62, e: "out", p: { rx: 3, drop: 2, lean: 0.27, twist: 0.9, hx: 0.6, aN: [0.3, 0.96, 0], wrist: 0.1, aF: [FA[5], 0.75, 0], shield: SH[5], fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.76, e: "io", p: { rx: 2.6, drop: 1.6, lean: 0.2, twist: 0.6, hx: 0.4, aN: [0.5, 0.94, 0], wrist: 0.1, aF: [FA[6], 0.75, 0], shield: SH[6], fN: [-2.6, 0], fF: [6, 0] } },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
};
