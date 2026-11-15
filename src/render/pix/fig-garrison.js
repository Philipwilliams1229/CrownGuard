// ============ FIGURE: the Knight Garrison's knight (and Aldric's squire) ============
// Rank and file of the crown: steel plate, a mail coif under an open bascinet, a long
// tabard over the breastplate, a kite shield on the far arm, a sword in the near fist.
// Built on Sir Aldric's skeleton (fig-knight.js) but plainer: no cape, no gold, a short
// plume, the livery on the cloth.
//   o.variant  "knight" (steel and navy, the shield's cream cross; the default)
//              "squire" (the same kit in Aldric's red, the shield plain: fig-squire.js,
//              also the Levy's top-tier knights)
// Clips: idle (guard, breathing), walk (sword on the shoulder), attack (wind-up over the
// shoulder, a fast cut, follow-through, back to guard). The blow's `hit` is 0.5.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN, scaled } from "./rig.js";

export const STEEL = mat("#98a2b6", { contrast: 1.18 }), MAIL = mat("#6c7488", { contrast: 1.1 }), BLADE = mat("#d4dae4", { contrast: 1.35 });
export const SKIN = mat("#e8b990"), HAIR = mat("#6a4a30"), LEATHER = mat("#5a3c28"), CREAM = mat("#eee6d2", { contrast: 1.1 }), BRASS = mat("#c8a448", { contrast: 1.15 });
export const EYE = flat("#2a1c2c"), SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });
const LOOKS = {
  knight: { coat: mat("#3a5474", { contrast: 1.1 }), hem: mat("#28405c"), plume: mat("#3a5474"), field: mat("#3a5474", { contrast: 1.1 }), rim: STEEL, cross: true },
  squire: { coat: mat("#a0303a", { contrast: 1.1 }), hem: mat("#762230"), plume: mat("#a0303a"), field: mat("#a0303a", { contrast: 1.1 }), rim: STEEL, cross: false },
};
export const VARIANTS = { knight: "Knight Garrison (navy)", squire: "Aldric's squire (red)" };

// the head: an open bascinet over a mail coif. M steel, m its band a tone down, c mail, S skin,
// s skin a tone down, E eye, e shut, N nose, b brow, l lips
const HEAD = [
  ".....MMMM....",
  "...MMMMMMMM..",
  "..MMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".mmmmmmmmmmm.",
  ".cMsbbssbbs..",
  ".cMSSESSSES..",
  ".cmSSESSSESN.",
  ".cmSSSSSSSSN.",
  ".ccmSSSSSSS..",
  "..ccmSSSll...",
  "..cccccc.....",
];
const BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
const LEG = {
  M: { m: STEEL }, m: { m: STEEL, bias: -1 }, c: { m: MAIL }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, b: { m: HAIR, fix: 2 }, l: { m: SKIN, fix: 0 },
};

export const BOX = { w: 84, h: 72, ox: 34, oy: 62 };
export const BONES = scaled(HUMAN, 1.0, { shN: -3, shF: 3, hipN: -1.3, hipF: 1.5, neck: 1.4 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// a plated leg: cuisse, knee cop, greave, sabaton
export const plateLeg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.4, k[0], k[1], 2.0, STEEL, z, { bias: b });
  px.capsule(k[0], k[1], 1.9, an[0], an[1], 1.6, STEEL, z, { bias: b });
  px.ellipse(k[0] + 0.6, k[1], 1.9, 1.8, STEEL, z + 0.02, { bias: b, vb: 0.25 });
  px.ellipse(an[0] + 1.2, an[1] + 0.9, 2.7, 1.4, MAIL, z + 0.03, { bias: b });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const L = LOOKS[o.variant] || LOOKS.knight;
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5);
  const sway = p.sway || 0;

  // the far arm and its kite shield
  px.part();
  px.capsule(sF[0], sF[1], 2.0, eF[0], eF[1], 1.9, STEEL, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.9, hdF[0], hdF[1], 1.7, STEEL, 1, { bias: -1 });
  const sx = hdF[0] * 0.7 + eF[0] * 0.3 + 0.8, sy = hdF[1] * 0.7 + eF[1] * 0.3 + 0.6, tl = p.shield ?? 0.08, cs = Math.cos(tl), sn = Math.sin(tl);
  const S = (x, y) => [sx + x * cs - y * sn, sy + x * sn + y * cs];
  px.part();
  px.poly([S(-4.6, -6.2), S(4.6, -6.2), S(4.9, 0.6), S(0, 8), S(-4.9, 0.6)], L.rim, 3.5, { round: 0.6, cast: 2 });
  px.poly([S(-3.5, -5.1), S(3.5, -5.1), S(3.7, 0.3), S(0, 6.3), S(-3.7, 0.3)], L.field, 3.52, { round: 0.6 });
  if (L.cross) {
    px.line(...S(0, -4.4), ...S(0, 4.4), CREAM, 3.55);
    px.line(...S(-2.6, -1.6), ...S(2.6, -1.6), CREAM, 3.55);
  } else px.line(...S(-2.4, -2.6), ...S(0, -0.6), CREAM, 3.55), px.line(...S(0, -0.6), ...S(2.4, -2.6), CREAM, 3.55);
  px.dot(...S(0, -0.2), BRASS, 3.6, { fix: 3 });

  plateLeg(px, hF, kF, anF, 2, -1);
  plateLeg(px, hN, kN, anN, 3, 0);

  // the body: a breastplate, the tabard over it to the knee, the belt
  px.part();
  px.poly([[C[0] - 4.6, C[1] - 1.6], [C[0] + 4.8, C[1] - 1.6], [C[0] + 5.8, C[1] + 3.5], [P[0] + 4.6, P[1] - 2.6], [P[0] - 4.6, P[1] - 2.6], [C[0] - 5.8, C[1] + 3.5]], STEEL, 4, { round: 0.92, ny: -0.12, cast: 2 });
  const hy = P[1] + 4.6, hemB = P[0] - 5.8 - vx * 1.2, hemF = P[0] + 5.6 - vx * 0.8;
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 3.6, C[1] - 1.2], [C[0] + 3.8, C[1] - 1.2], [C[0] + 4.9, C[1] + 3.3], [P[0] + 4.6, P[1] - 2.6], [hemF, hy], [hemF - 2.4, hy + 0.9], [P[0] + 0.4 - vx, hy], [hemB + 2.6, hy + 0.9], [hemB, hy], [P[0] - 4.6, P[1] - 2.6], [C[0] - 4.9, C[1] + 3.3]], L.coat, 4.2, { round: 0.9, cast: 2 });
  px.toneLine(P[0] + 0.8, P[1] - 1, P[0] + 0.6 - vx, hy - 0.6, -1, coat);
  px.line(hemB + 1, hy - 0.6, hemF - 1, hy - 0.6, L.hem, 4.22);
  if (L.cross) { px.line(C[0] + 0.6, C[1] - 0.2, C[0] + 0.6, C[1] + 5, CREAM, 4.25); px.line(C[0] - 1.4, C[1] + 1.6, C[0] + 2.6, C[1] + 1.6, CREAM, 4.25); }
  px.poly([[P[0] - 4.8, P[1] - 3.4], [P[0] + 4.7, P[1] - 3.4], [P[0] + 4.8, P[1] - 1.6], [P[0] - 4.9, P[1] - 1.6]], LEATHER, 4.3, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3.4, 2, 1.8, BRASS, 4.32, { fix: 3 });
  px.line(C[0] - 2.4, C[1] - 1.2, C[0] + 3.4, C[1] - 1.2, STEEL, 4.3);

  // the head
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  // the plume: a short tuft rooted on the crown, streaming back a beat behind
  const pl = cl(vx * 2 + vx2 * 1.5, -3, 3) - sway * 0.5, rx0 = hx + 0.5, ry0 = hyy - 10;
  px.part();
  px.capsule(rx0, ry0 - 0.5, 1.3, rx0 - 2 - pl * 0.4, ry0 - 2.4, 1.8, L.plume, 6.5);
  px.capsule(rx0 - 2 - pl * 0.4, ry0 - 2.4, 1.8, rx0 - 4.8 - pl, ry0 - 1.2 + Math.abs(pl) * 0.3, 1.2, L.plume, 6.5);
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hyy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 2 });

  // the sword through the near fist: sw is the blade's angle from upright (+ toward the foe)
  const a = p.sw ?? 2.3, d = [Math.sin(a), -Math.cos(a)], nrm = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t + nrm[0] * s, hdN[1] + d[1] * t + nrm[1] * s];
  px.part();
  const bz = (p.nb || 0) > 0.5 ? 5.4 : 7;
  px.capsule(...B(2.5), 1.2, ...B(14.5), 1.0, BLADE, bz, { edge: true });
  px.capsule(...B(14.5), 1.0, ...B(16.6), 0.3, BLADE, bz, { edge: true });
  px.part();
  px.capsule(...B(-3), 0.9, ...B(1), 0.9, LEATHER, bz + 0.02);
  px.capsule(...B(1.8, -2.6), 0.8, ...B(1.8, 2.6), 0.8, STEEL, bz + 0.05, { edge: true });
  px.ellipse(...B(-3.6), 1.1, 1.1, BRASS, bz + 0.05);

  // the near arm over it all: pauldron, vambrace, gauntlet on the grip
  const az = (p.nb || 0) > 0.5 ? 5.5 : 8;
  px.part();
  px.capsule(sN[0], sN[1] + 0.5, 2.1, eN[0], eN[1], 2.0, STEEL, az, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.0, hdN[0], hdN[1], 1.8, STEEL, az, { cast: 2 });
  px.ellipse(eN[0], eN[1], 1.7, 1.7, STEEL, az + 0.02, { vb: 0.25 });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] - 0.4, 3.5, 3.0, STEEL, 8.1, { cast: 2 });
  px.line(sN[0] - 2.8, sN[1] + 2.1, sN[0] + 2.4, sN[1] + 2.1, L.coat, 8.12);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.9, 1.8, MAIL, az + 0.2);

  return { hand: hdN, sw: a };
};

// the cut's smear: on the fastest frames the blade leaves a fan of light behind it
export const fx = (px, F, info, clip) => {
  if (clip !== "attack") return;
  const a1 = F.sk.p.sw, a0 = F.lag1.p.sw;
  if (!(a1 - a0 > 0.5)) return;
  const [hx, hy] = F.sk.hdN, [gx, gy] = F.lag1.hdN, n = 10;
  const at = (t, r) => { const a = a0 + (a1 - a0) * t, x = gx + (hx - gx) * t, y = gy + (hy - gy) * t; return [x + Math.sin(a) * r, y - Math.cos(a) * r]; };
  const arc = (t0, rIn, m, z) => { const out = [], inn = []; for (let i = 0; i <= n; i++) { const t = t0 + (1 - t0) * (i / n); out.push(at(t, 17)); inn.unshift(at(t, 17 - (17 - rIn) * ((t - t0) / (1 - t0)) ** 1.4)); } px.poly([...out, ...inn], m, z, { noLine: true }); };
  arc(0, 9, SMEAR2, 20); arc(0.45, 13, SMEAR, 20.1);
};

// Aldric's guard and cut, a little less flourish: a soldier's drilled blow
const GUARD = { aN: [0.42, 0.86, 0], aF: [0.55, 0.72, 0], sw: 2.25, shield: 0.06, fN: [-2, 0], fF: [2.4, 0] };
export const CLIPS = {
  idle: {
    n: 8, ms: 1800, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 0.9); return { ...GUARD, rise: 0.5 + 0.5 * b, aN: [0.42, 0.86 - 0.03 * (0.5 + 0.5 * b), 0], sw: 2.25 + 0.03 * b2, sway: b2 * 0.8, blink: ph > 0.6 && ph < 0.72 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 720, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.2, lift: 2.7, swing: 0.4, bob: 1.1 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aN: [0.7 + 0.06 * a, 0.56, 0], sw: -0.42 + 0.05 * a, aF: [0.5 + 0.18 * a, 0.72, 0], shield: 0.06 + 0.05 * a }; },
  },
  attack: {
    n: 12, ms: 760, loop: false, lag: 0.07, hit: 0.5,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.3, e: "out", p: { rx: -1.3, drop: 0.6, lean: -0.12, twist: -0.7, rise: 0.4, aN: [3.4, 0.8, 1], nb: 1, sw: -1.05, aF: [1.0, 0.8, 0], shield: -0.1, fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.38, e: "io", p: { rx: -1.5, drop: 0.7, lean: -0.14, twist: -0.8, rise: 0.5, aN: [3.5, 0.82, 1], nb: 1, sw: -1.2, aF: [1.05, 0.8, 0], shield: -0.1, fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.5, e: "in3", p: { rx: 2.3, drop: 1.5, lean: 0.2, twist: 0.8, hx: 0.5, aN: [1.02, 1, 0], nb: 0, sw: 1.95, aF: [0.2, 0.8, 0], shield: 0.25, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.62, e: "out", p: { rx: 2.9, drop: 1.9, lean: 0.25, twist: 0.9, hx: 0.6, aN: [0.5, 0.96, 0], sw: 2.75, aF: [0.05, 0.82, 0], shield: 0.3, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 0.74, e: "io", p: { rx: 2.5, drop: 1.5, lean: 0.2, twist: 0.6, hx: 0.4, aN: [0.46, 0.94, 0], sw: 2.62, aF: [0.15, 0.8, 0], shield: 0.25, fN: [-2.6, 0], fF: [6, 0] } },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
};
