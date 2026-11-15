// ============ FIGURE: the Champion (the Knight Garrison's giant, path a.a) ============
// A great crowned knight, a head and a half over the garrison: ivory plate and gold like the Paladin
// Order's (fig-paladin.js, whose skeleton, kit and blow this builds on, all scaled up), a closed
// great helm with a gilt cross-slit and a gold crown on it (a red gem at the front), a long ivory
// tabard with a gold cross, a blue cape streaming behind, a gold-flanged war hammer in the near
// fist, and his kite shield slung on his back (gold, a pale cross) where it shows over the shoulder.
// Holy blows, so the hammer's head gleams on the swing.
// Clips: idle (hammer grounded, breathing, a slow shift of weight), walk (hammer on the shoulder,
// a heavy stride), attack (hammer hauled back over the shoulder, a crushing overhead blow,
// follow-through). `hit` 0.52.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN, scaled } from "./rig.js";
import { SKIN, LEATHER } from "./fig-garrison.js";

const IVORY = mat("#b4bac8", { contrast: 1.35 }), IVMAIL = mat("#7a7e8c", { contrast: 1.15 }), GOLD = mat("#d8b34a", { contrast: 1.15 });
const COAT = mat("#ece6d2", { contrast: 1.5 }), WOOD = mat("#6a4a2e"), BLUE = mat("#3a5474", { contrast: 1.15 }), BLUEK = mat("#24384e");
const GEM = flat("#c8383a", { emis: true, line: "#7a1c24" }), SLIT = flat("#2a2430");
const GLOW = flat("#fff0b8", { emis: true, line: "#e8c860" }), GLOW2 = flat("#ffe08a", { emis: true, line: "#d8b34a" });

// the great helm and its crown: M ivory, W its glint, m a tone down, G gilt, R the gem, K the slit, c mail
const HEAD = [
  "...G..G.GG..G...",
  "...GGGGGRGGGGG..",
  "..MMMMMMMMMMMM..",
  ".MMWWMMMMMMMMMG.",
  ".MWWWMMMMMMMMMG.",
  ".MWMMMMMMMMMMMG.",
  ".mmmmmmmmmmmmmm.",
  ".GGGGGGGGGGGGGGG",
  ".MMKKKKKKKKKKGM.",
  ".MMMMMMMMMMMMGM.",
  ".MMMMMMMMMMMMGM.",
  "..mMMMMMMMMMmG..",
  "..cccccccccc....",
];
const LEG = { M: { m: IVORY }, W: { m: IVORY, bias: 1 }, m: { m: IVORY, bias: -1 }, G: { m: GOLD, fix: 3 }, R: { m: GEM }, K: { m: SLIT }, c: { m: IVMAIL } };

const K = 1.6;                                  // the champion's build over a garrison knight's
export const BOX = { w: 140, h: 112, ox: 54, oy: 98 };
export const BONES = scaled(HUMAN, K, { shN: -4.8, shF: 4.8, hipN: -2.2, hipF: 2.5, neck: 2.1 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const leg = (px, h, kn, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 3.4, kn[0], kn[1], 2.9, IVORY, z, { bias: b });
  px.capsule(kn[0], kn[1], 2.8, an[0], an[1], 2.3, IVORY, z, { bias: b });
  px.ellipse(kn[0] + 0.8, kn[1], 2.8, 2.6, GOLD, z + 0.02, { bias: b, vb: 0.25 });
  px.ellipse(an[0] + 1.6, an[1] + 1.2, 3.9, 1.9, IVMAIL, z + 0.03, { bias: b });
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.8, 2.8), vx2 = cl(lag1.C[0] - lag2.C[0], -2.8, 2.8), sway = p.sway || 0;
  const q = (b, x, y) => [b[0] + x * K, b[1] + y * K];

  // the blue cape down his back, its tail a beat behind
  const t1 = -vx * 1.8 + sway * 0.6, t2 = -vx * 2.6 - vx2 * 2 + sway;
  px.part(); const cape = px._pid;
  px.poly([q(C, -3.6, -1.8), q(C, 1.6, -1.8), q(P, -0.6, 2), [P[0] - 4.4 + t2 * 0.6, -12.5], [P[0] - 8 + t2, -15], [P[0] - 11.4 + t2, -12], [P[0] - 10.4 + t1, P[1] + 2], q(C, -5.8, 3.5)], BLUE, 0.5, { round: 0.85 });
  px.toneLine(C[0] - 6, C[1] + 5, P[0] - 6.4 + t2 * 0.8, -13.6, -1, cape);
  // the shield slung across the back: a gold kite with a pale cross, its top over the far shoulder
  const sx = C[0] - 6.4, sy = C[1] + 7.4, tl = -0.28 + sway * 0.04, cs = Math.cos(tl), sn = Math.sin(tl);
  const S = (x, y) => [sx + x * cs - y * sn, sy + x * sn + y * cs];
  px.part();
  px.poly([S(-5.4, -7.6), S(5.4, -7.6), S(5.8, 0.4), S(0, 10.4), S(-5.8, 0.4)], GOLD, 0.8, { round: 0.6, cast: 1 });
  px.poly([S(-4.2, -6.4), S(4.2, -6.4), S(4.5, 0.2), S(0, 8.4), S(-4.5, 0.2)], COAT, 0.82, { round: 0.6 });
  px.line(...S(0, -5.4), ...S(0, 6), GOLD, 0.86); px.line(...S(-3, -1.8), ...S(3, -1.8), GOLD, 0.86);

  // the far arm, bare of a shield: a fist at the hip
  px.part();
  px.capsule(sF[0], sF[1], 3, eF[0], eF[1], 2.8, IVORY, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.8, hdF[0], hdF[1], 2.4, IVORY, 1, { bias: -1 });
  px.part(); px.ellipse(hdF[0], hdF[1], 2.4, 2.4, IVMAIL, 1.2, { bias: -1 });

  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // breastplate, the long tabard with its gold cross and hem, the belt
  px.part();
  px.poly([q(C, -4.8, -1.6), q(C, 5, -1.6), q(C, 6.2, 3.5), q(P, 4.8, -2.6), q(P, -4.8, -2.6), q(C, -6, 3.5)], IVORY, 4, { round: 0.92, ny: -0.12, cast: 2 });
  const hy = P[1] + 4.6, hemB = P[0] - 8.2 - vx * 1.5, hemF = P[0] + 8 - vx * 1;
  px.part(); const coat = px._pid;
  px.poly([q(C, -3.8, -1.2), q(C, 4, -1.2), q(C, 5.2, 3.3), q(P, 4.8, -2.6), [hemF, hy], [hemF - 3.4, hy + 1.2], [P[0] + 0.5 - vx, hy], [hemB + 3.6, hy + 1.2], [hemB, hy], q(P, -4.8, -2.6), q(C, -5.2, 3.3)], COAT, 4.2, { round: 0.9, cast: 2 });
  px.toneLine(P[0] + 1, P[1] - 1.4, P[0] + 0.8 - vx, hy - 0.8, -1, coat);
  px.line(hemB + 1.4, hy - 0.9, hemF - 1.4, hy - 0.9, GOLD, 4.22);
  px.line(C[0] + 1.1, C[1] - 0.4, C[0] + 1.1, C[1] + 7.4, GOLD, 4.25); px.line(C[0] - 2, C[1] + 2.4, C[0] + 4.2, C[1] + 2.4, GOLD, 4.25);
  px.poly([q(P, -4.9, -3.6), q(P, 4.8, -3.6), q(P, 4.9, -1.6), q(P, -5, -1.6)], LEATHER, 4.3, { round: 0.9 });
  px.rect(P[0] + 1.6, P[1] - 5, 2.8, 2.6, GOLD, 4.32, { fix: 3 });
  px.line(C[0] - 3.4, C[1] - 1.6, C[0] + 4.8, C[1] - 1.6, GOLD, 4.3);

  // the helm
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  px.part();
  px.stamp(HEAD, hx, hyy, LEG, 6, { ax: 8, ay: 13, ball: [8.5, 7.5, 8.8, 8.6], cast: 2 });

  // the war hammer: a long haft, a gilt block and a back-spike; sw its angle from upright (+ toward the foe)
  const a = p.sw ?? 2.3, d = [Math.sin(a), -Math.cos(a)], nrm = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t * 1.3 + nrm[0] * s * 1.15, hdN[1] + d[1] * t * 1.3 + nrm[1] * s * 1.15];
  const bz = (p.nb || 0) > 0.5 ? 5.4 : 7;
  px.part();
  px.capsule(...B(-4.6), 1.2, ...B(17), 1.2, WOOD, bz, { edge: true });
  px.ellipse(...B(-5.2), 1.6, 1.6, GOLD, bz + 0.02);
  px.part();
  px.capsule(...B(20, -5.4), 3.0, ...B(20, 5.4), 3.0, GOLD, bz + 0.05, { edge: true });
  px.capsule(...B(20, 5.4), 3.0, ...B(20, 8.4), 0.7, GOLD, bz + 0.06, { edge: true });
  px.capsule(...B(15), 1.6, ...B(24.6), 1.4, GOLD, bz + 0.07, { edge: true });
  px.dot(...B(20.4), IVORY, bz + 0.1, { fix: 4 });

  // the near arm over it all: a heavy pauldron with a gold rim, vambrace, gauntlet
  const az = (p.nb || 0) > 0.5 ? 5.5 : 8;
  px.part();
  px.capsule(sN[0], sN[1] + 0.7, 3.1, eN[0], eN[1], 2.9, IVORY, az, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.9, hdN[0], hdN[1], 2.5, IVORY, az, { cast: 2 });
  px.ellipse(eN[0], eN[1], 2.5, 2.5, GOLD, az + 0.02, { vb: 0.25 });
  px.part();
  px.ellipse(sN[0] - 0.3, sN[1] - 0.6, 5.2, 4.4, IVORY, 8.1, { cast: 2 });
  px.line(sN[0] - 4.2, sN[1] + 3.1, sN[0] + 3.6, sN[1] + 3.1, GOLD, 8.12);
  px.part(); px.ellipse(hdN[0], hdN[1], 2.8, 2.6, IVMAIL, az + 0.2);

  return { hand: hdN, sw: a, mace: B(20) };
};

// the blow's light: the gilt head throws a holy streak behind it on the fast frames
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const a1 = F.sk.p.sw, a0 = F.lag1.p.sw;
  if (!(a1 - a0 > 0.5)) return;
  const [hx, hy] = F.sk.hdN, [gx, gy] = F.lag1.hdN, n = 10, R = 26;
  const at = (t, r) => { const a = a0 + (a1 - a0) * t, x = gx + (hx - gx) * t, y = gy + (hy - gy) * t; return [x + Math.sin(a) * r, y - Math.cos(a) * r]; };
  const arc = (t0, rIn, m, z) => { const out = [], inn = []; for (let i = 0; i <= n; i++) { const t = t0 + (1 - t0) * (i / n); out.push(at(t, R)); inn.unshift(at(t, R - (R - rIn) * ((t - t0) / (1 - t0)) ** 1.4)); } px.poly([...out, ...inn], m, z, { noLine: true }); };
  arc(0, 14, GLOW2, 20); arc(0.45, 19, GLOW, 20.1);
};

const GUARD = { aN: [0.55, 0.62, 0], aF: [0.34, 0.78, 0], sw: 2.85, fN: [-2.6, 0], fF: [3, 0] };
export const CLIPS = {
  idle: {
    n: 8, ms: 2300, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 0.9); return { ...GUARD, rise: 0.6 + 0.6 * b, sw: 2.85 + 0.03 * b2, aF: [0.34 + 0.04 * b2, 0.78, 0], sway: b2 * 0.7 }; },
  },
  walk: {
    n: 8, ms: 900, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 6.6, lift: 3.4, swing: 0.4, bob: 1.5 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aN: [1.0 + 0.06 * a, 0.62, 0], sw: -1.15 + 0.05 * a, aF: [0.4 + 0.2 * a, 0.78, 0] }; },
  },
  attack: {
    n: 14, ms: 1150, loop: false, lag: 0.07, hit: 0.52,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.34, e: "out", p: { rx: -1.8, drop: 0.9, lean: -0.16, twist: -0.7, rise: 0.5, aN: [3.3, 0.88, 1], nb: 1, sw: -0.9, aF: [1.9, 0.8, 0], fN: [-2.6, 0], fF: [3, 0] } },
      { t: 0.44, e: "io", p: { rx: -2.1, drop: 1.1, lean: -0.2, twist: -0.85, rise: 0.7, aN: [3.4, 0.9, 1], nb: 1, sw: -0.85, aF: [2.0, 0.8, 0], fN: [-2.6, 0], fF: [3, 0] } },
      { t: 0.52, e: "in3", p: { rx: 3.1, drop: 2.4, lean: 0.26, twist: 0.8, hx: 0.6, aN: [1.2, 1, 0], nb: 0, sw: 1.9, aF: [1.5, 0.8, 0], fN: [-3.2, 0], fF: [8, 0] } },
      { t: 0.64, e: "out", p: { rx: 3.8, drop: 2.9, lean: 0.32, twist: 0.9, hx: 0.8, aN: [0.6, 0.96, 0], sw: 2.75, aF: [1.2, 0.8, 0], fN: [-3.2, 0], fF: [8, 0] } },
      { t: 0.8, e: "io", p: { rx: 3.2, drop: 2.2, lean: 0.24, twist: 0.6, hx: 0.5, aN: [0.5, 0.94, 0], sw: 2.6, aF: [1.3, 0.8, 0], fN: [-3.2, 0], fF: [8, 0] } },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
};
