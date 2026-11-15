// ============ FIGURE: Captain Hale of the Watch ============
// A crested sallet with a tall red horsehair crest, a grey moustache, steel plate with spiked
// pauldrons over a navy tabard and cloak, a halberd with a crescent axe blade, a back hook, a
// spike and a red tassel. (The owner's pick of three, 2026-11-14: "C", without the banner.)
// Clips: idle (the halberd grounded), walk (the halberd carried, butt raised), attack (the
// blade drawn back over the shoulder, the chop, follow-through), sweep (his six-frame
// Halberd Sweep sheet: guard, wind-up, blade coming round, strike, follow-through, recover;
// feet planted). Plate is smooth bands: one lit line, one dark side, no dither inside a plate.
import { mat, flat } from "./pix.js";
import { ik, sampleKeys, walkPose, HUMAN, scaled } from "./rig.js";

const STEEL = mat("#98a2b6", { contrast: 1.05 }), STEEL_D = mat("#7a8296", { contrast: 1.05 }), MAIL = mat("#6c7488", { contrast: 1.05 }), GOLD = mat("#e0b84a", { contrast: 1.15 });
const NAVY = mat("#2e4a7a"), NAVY_D = mat("#24365c"), RED = mat("#c8383a"), RED_D = mat("#8a2630"), SKIN = mat("#e2b08a"), HAIR = mat("#b0aca4");
const LEATHER = mat("#5a3c28"), WOOD = mat("#7a5232", { contrast: 1.1 }), EYE = flat("#2a1c2c");
const SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

// the head: the sallet itself (M steel, m a tone down, G a gold brow band, c the mail coif),
// the face open; w the grey moustache, S skin, s skin a tone down, b brow, E eye, N nose
const HEAD = [
  "....MMMM.....",
  "..MMMMMMMM...",
  ".MMMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".GGGGGGGGGGG.",
  ".cMsbbSSbbs..",
  ".cMSSESSSES..",
  ".cmSSESSSESN.",
  ".cmSSSSSSSSN.",
  ".ccmSSSwwww..",
  "..ccmSSSsS...",
  "..cccccc.....",
];
const BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
const LEG = {
  M: { m: STEEL }, m: { m: STEEL, bias: -1 }, G: { m: GOLD }, c: { m: MAIL }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, b: { m: HAIR, fix: 2 }, w: { m: HAIR, fix: 2 },
};

export const BOX = { w: 96, h: 90, ox: 36, oy: 78 };
export const BONES = scaled(HUMAN, 1.1, { shN: -3.4, shF: 3.4, hipN: -1.5, hipF: 1.7, neck: 1.6 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.7, k[0], k[1], 2.3, NAVY_D, z, { bias: b });
  px.capsule(k[0], k[1], 2.2, an[0], an[1], 1.9, STEEL_D, z, { bias: b });
  px.ellipse(k[0] + 0.6, k[1], 2.2, 2.1, STEEL, z + 0.02, { bias: b, vb: 0.25 });
  px.ellipse(an[0] + 1.3, an[1] + 0.9, 3, 1.5, LEATHER, z + 0.03, { bias: b });
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, hdN, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), sway = p.sway || 0;
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);

  // the cloak down his back, its tail a beat behind
  const t1 = -vx * 1.6 + sway * 0.6, t2 = -vx * 2.2 - vx2 * 1.8 + sway;
  px.part(); const cp = px._pid;
  px.poly([[C[0] - 3.8, C[1] - 1.8], [C[0] + 1.6, C[1] - 1.8], [P[0] - 1, P[1] + 2], [P[0] - 3.4 + t2 * 0.7, -6.4], [P[0] - 5.2 + t2, -8.2], [P[0] - 7.6 + t2, -6], [P[0] - 7.2 + t1, P[1] + 1.5], [C[0] - 6.4, C[1] + 3.5]], NAVY_D, 0.5, { round: 0.85 });
  px.toneLine(C[0] - 4.8, C[1] + 4, P[0] - 6 + t2 * 0.8, -8, -1, cp);

  // the halberd's line: grounded at rest, in two hands when it swings
  const a = p.hb ?? 0.12, d = [Math.sin(a), -Math.cos(a)], nrm = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t + nrm[0] * s, hdN[1] + d[1] * t + nrm[1] * s];
  const nb = (p.nb || 0) > 0.5, bz = nb ? 5.4 : 7;
  const butt = p.plant ? Math.min(-8, hdN[1] / Math.max(0.3, Math.cos(a)) + 0.6) : -9;

  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the tabard: navy from the chest to the knee, split at the front for the stride
  const hemB = P[0] - 6 - vx * 1.2, hemF = P[0] + 5.8 - vx * 0.8, hy = P[1] + 3.6;
  px.part(); const tb = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 5, C[1] - 1.6], [C[0] + 6.2, C[1] + 3.5], [P[0] + 4.8, P[1] - 2.6], [hemF, hy], [hemF - 2.4, hy + 0.9], [P[0] + 0.4 - vx, hy], [hemB + 2.6, hy + 0.9], [hemB, hy], [P[0] - 4.8, P[1] - 2.6], [C[0] - 6, C[1] + 3.5]], NAVY, 4, { round: 0.9, ny: -0.12, cast: 2 });
  px.toneLine(P[0] + 0.6, P[1] - 0.5, P[0] + 0.5 - vx, hy - 0.6, -1, tb);
  // the breastplate over it: one lit line down the sunward side, one dark on the far side
  px.part();
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 5, C[1] - 1.6], [C[0] + 6, C[1] + 3.4], [P[0] + 4.6, P[1] - 4.2], [P[0] - 4.6, P[1] - 4.2], [C[0] - 5.8, C[1] + 3.4]], STEEL, 4.3, { round: 0.92, ny: -0.12, cast: 1 });
  px.line(C[0] - 3.4, C[1] - 0.6, C[0] - 3, P[1] - 5.4, STEEL, 4.32, { fix: 4, noLine: true });
  px.line(C[0] + 4.2, C[1] + 0.4, C[0] + 3.8, P[1] - 5.4, STEEL, 4.32, { fix: 1, noLine: true });
  // belt and buckle, a gold line down the tabard's skirt
  px.part();
  px.rect(P[0] - 4.8, P[1] - 3.8, 9.6, 1.8, LEATHER, 4.4, { round: 0.9 });
  px.rect(P[0] + 1, P[1] - 3.8, 2, 1.8, GOLD, 4.42, { fix: 3 });
  px.line(P[0] - 0.4 - vx * 0.3, hy - 1.4, P[0] - 0.4 - vx * 0.3, P[1] - 2, GOLD, 4.43, { noLine: true });
  // the gorget, and the far pauldron with its spike
  px.line(C[0] - 2.6, C[1] - 1.4, C[0] + 3.4, C[1] - 1.4, GOLD, 4.5);
  px.part();
  px.ellipse(sF[0] + 0.2, sF[1] - 0.4, 3.8, 3.4, STEEL_D, 4.6, { cast: 0 });
  px.poly([[sF[0] - 0.4, sF[1] - 2], [sF[0] + 2.6, sF[1] - 2], [sF[0] + 2.4, sF[1] - 6.4]], STEEL_D, 4.62, { edge: true });

  // the head: the sallet, and its horsehair crest streaming back a beat behind
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hyy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 2 });
  const pl = cl(vx * 2 + vx2 * 1.5, -3, 3) - sway * 0.5;
  px.part();
  px.poly([[hx + 3, hyy - 10.4], [hx + 0.4, hyy - 13.4], [hx - 3.4 - pl * 0.5, hyy - 14.4], [hx - 8.6 - pl, hyy - 12.4], [hx - 11 - pl * 1.4, hyy - 7.4 + Math.abs(pl) * 0.4], [hx - 6.4 - pl * 0.6, hyy - 9.8], [hx - 2, hyy - 10]], RED, 6.45, { round: 0.8 });
  px.toneLine(hx + 2, hyy - 12, hx - 8 - pl, hyy - 13, -1, px._pid);

  // the halberd: shaft, socket, spike, crescent axe blade, back hook, tassel
  px.part();
  px.capsule(...B(butt), 1.1, ...B(22), 1.05, WOOD, bz, { edge: true });
  px.capsule(...B(butt), 1.5, ...B(butt + 1.4), 1.5, STEEL_D, bz + 0.02);
  px.part();
  px.capsule(...B(18), 1.5, ...B(21.4), 1.4, STEEL_D, bz + 0.05);
  px.capsule(...B(21), 1.2, ...B(31), 0.2, STEEL, bz + 0.06, { edge: true });
  px.poly([B(23.6, 0.8), B(25.4, 4), B(24.4, 7.6), B(20.8, 9), B(16.6, 7.4), B(18.8, 6), B(20.6, 5.2), B(20.6, 3.4), B(18.6, 1)], STEEL, bz + 0.07, { round: 0.5, edge: true });
  px.line(...B(23.8, 2.4), ...B(23.6, 6.6), STEEL, bz + 0.1, { fix: 4, noLine: true });
  px.line(...B(21, 8.2), ...B(17.6, 6.9), STEEL, bz + 0.1, { fix: 1, noLine: true });
  px.poly([B(19.4, -0.8), B(21.8, -0.8), B(21.4, -4.6), B(19.6, -6), B(19.6, -3.2)], STEEL, bz + 0.07, { round: 0.5, edge: true });
  {
    const w = cl(-vx * 1.4 + sway * 0.8, -3, 3), t0 = B(14.4, 0.4);
    px.part();
    px.capsule(...t0, 0.9, t0[0] + w * 0.6 - 0.4, t0[1] + 3.2, 1.2, RED, bz + 0.1);
    px.capsule(t0[0] + w * 0.6 - 0.4, t0[1] + 3.2, 1.2, t0[0] + w * 1.1, t0[1] + 7, 0.7, RED_D, bz + 0.1);
  }

  // the far arm: solved to a grip on the shaft, or resting on his hip (grounded halberd, the march)
  const gp = p.hip ? [P[0] + 3.6, P[1] - 4.4] : B(p.grip ?? 8), side = p.hip ? -1 : 1;
  const fa = ik(sF[0], sF[1] + 0.4, gp[0], gp[1], BONES.upper, BONES.fore, side);
  px.part();
  px.capsule(sF[0], sF[1] + 0.4, 2.3, fa.mid[0], fa.mid[1], 2.2, STEEL, nb ? 5.45 : 7.2, { cast: 0 });
  px.capsule(fa.mid[0], fa.mid[1], 2.2, fa.end[0], fa.end[1], 1.9, STEEL, nb ? 5.45 : 7.2, { cast: 0 });
  px.part(); px.ellipse(fa.end[0], fa.end[1], 1.7, 1.7, STEEL_D, nb ? 5.6 : 7.4);
  // the near arm: vambrace, gauntlet on the haft, and the great spiked pauldron
  const az = nb ? 5.5 : 8;
  px.part();
  px.capsule(sN[0], sN[1] + 0.5, 2.3, eN[0], eN[1], 2.2, STEEL, az, { cast: 0 });
  px.capsule(eN[0], eN[1], 2.2, hdN[0], hdN[1], 1.9, STEEL, az, { cast: 0 });
  px.ellipse(eN[0], eN[1], 1.9, 1.9, STEEL, az + 0.02, { vb: 0.25 });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] - 0.4, 4.6, 3.8, STEEL, 8.1, { cast: 1 });
  px.line(sN[0] - 3, sN[1] + 2.2, sN[0] + 2.6, sN[1] + 2.2, GOLD, 8.12);
  px.poly([[sN[0] - 1.8, sN[1] - 2], [sN[0] + 0.8, sN[1] - 2], [sN[0] - 1.6, sN[1] - 7.6]], STEEL, 8.14, { edge: true });
  px.poly([[sN[0] + 1, sN[1] - 1.8], [sN[0] + 3.4, sN[1] - 1.8], [sN[0] + 3.6, sN[1] - 6]], STEEL, 8.14, { edge: true });
  px.part(); px.ellipse(hdN[0], hdN[1], 1.8, 1.7, STEEL_D, az + 0.2);

  return { tip: B(31), hand: hdN, hb: a };
};

// the chop's smear: on the fastest frames the blade leaves a fan of light behind it
export const fx = (px, F, info, clip) => {
  if (clip !== "attack" && clip !== "sweep") return;
  const a1 = F.sk.p.hb, a0 = F.lag1.p.hb;
  if (!(a1 - a0 > 0.5)) return;
  const [hx, hy] = F.sk.hdN, [gx, gy] = F.lag1.hdN, n = 10;
  const at = (t, r) => { const a = a0 + (a1 - a0) * t, x = gx + (hx - gx) * t, y = gy + (hy - gy) * t; return [x + Math.sin(a) * r, y - Math.cos(a) * r]; };
  const arc = (t0, rIn, m, z) => { const out = [], inn = []; for (let i = 0; i <= n; i++) { const t = t0 + (1 - t0) * (i / n); out.push(at(t, 27)); inn.unshift(at(t, 27 - (27 - rIn) * ((t - t0) / (1 - t0)) ** 1.4)); } px.poly([...out, ...inn], m, z, { noLine: true }); };
  arc(0, 14, SMEAR2, 20); arc(0.45, 19, SMEAR, 20.1);
};

const GUARD = { nb: 0, aN: [0.62, 0.8, 0], aF: [0.2, 0.9, 0], hb: 0.52, plant: 1, hip: 1, grip: 7, fN: [-2, 0], fF: [2.4, 0] };
// the sweep's six poses: planted feet, both hands on the haft
const SW = { rx: 0, drop: 1, fN: [-2.6, 0], fF: [5, 0], plant: 0, hip: 0, grip: 8 };
const SWEEP = [
  { ...SW, aN: [0.9, 0.9, 0], hb: 0.7, lean: 0.05, twist: 0.1 },
  { ...SW, rx: -1.2, lean: -0.14, twist: -0.8, rise: 0.5, aN: [2.9, 0.78, 1], nb: 1, hb: -1.0 },
  { ...SW, rx: 0.4, lean: 0.02, twist: -0.2, rise: 0.8, aN: [2.2, 0.9, 0], hb: 0.5 },
  { ...SW, rx: 2.4, drop: 1.6, lean: 0.2, twist: 0.8, aN: [1.2, 1, 0], hb: 1.7 },
  { ...SW, rx: 3, drop: 2, lean: 0.25, twist: 0.9, aN: [0.8, 0.96, 0], hb: 2.5 },
  { ...SW, rx: 1.4, drop: 1.2, lean: 0.12, twist: 0.4, aN: [0.9, 0.9, 0], hb: 1.4 },
];
export const CLIPS = {
  idle: {
    n: 8, ms: 1800, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 0.9); return { ...GUARD, rise: 0.5 + 0.5 * b, hb: 0.52 + 0.015 * b2, sway: b2 * 0.9, blink: ph > 0.6 && ph < 0.72 ? 1 : 0 }; },
  },
  // the march: the halberd carried leaning forward, butt off the ground, the far hand on his hip
  walk: {
    n: 8, ms: 780, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.4, lift: 2.8, swing: 0.3, bob: 1.1 }), a = Math.cos(ph * Math.PI * 2); return { ...w, nb: 0, aN: [0.8 + 0.05 * a, 0.8, 0], hb: 0.5 + 0.06 * a, plant: 0, hip: 1, grip: 7, sway: a * 1.2 }; },
  },
  attack: {
    n: 12, ms: 900, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.3, e: "out", p: { rx: -1.4, drop: 0.7, lean: -0.13, twist: -0.8, rise: 0.4, aN: [2.9, 0.78, 1], nb: 1, hb: -0.95, plant: 0, hip: 0, grip: 8, fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.4, e: "io", p: { rx: -1.7, drop: 0.8, lean: -0.15, twist: -0.9, rise: 0.5, aN: [3, 0.8, 1], nb: 1, hb: -1.1, plant: 0, hip: 0, grip: 8, fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.52, e: "in3", p: { rx: 2.4, drop: 1.6, lean: 0.2, twist: 0.8, hx: 0.5, aN: [1.1, 1, 0], nb: 0, hb: 1.9, plant: 0, hip: 0, grip: 8, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.64, e: "out", p: { rx: 3, drop: 2, lean: 0.25, twist: 0.9, hx: 0.6, aN: [0.8, 0.96, 0], nb: 0, hb: 2.6, plant: 0, hip: 0, grip: 8, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.78, e: "io", p: { rx: 2.4, drop: 1.6, lean: 0.2, twist: 0.6, hx: 0.4, aN: [0.7, 0.94, 0], hb: 2.4, plant: 0, hip: 0, grip: 8, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
  // the Halberd Sweep's six poses (frame i is sheet frame i)
  sweep: { n: 6, ms: 600, loop: false, lag: 0.2, pose: (ph) => ({ ...SWEEP[Math.round(ph * 5)] }) },
};
