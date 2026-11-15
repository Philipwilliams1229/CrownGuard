// ============ FIGURE: Brother Osric, the battle friar ============
// A brown habit, a rope belt, a tonsure, a gold-headed mace with a short flanged head.
// (The owner's pick of three, 2026-11-14: "A", the faithful look.)
// Clips: idle (the mace held forward, breathing), walk (the mace carried upright before him),
// attack (wind-up behind the head, the smash, a burst of holy light). Sanctuary's lifted mace
// is the attack's wind-up frame (legacy[1]).
import { mat, flat, layers } from "./pix.js";
import { stampFace } from "./bowlayers.js";
import { sampleKeys, walkPose, HUMAN, scaled } from "./rig.js";

const HABIT = mat("#86502f"), ROPE = mat("#e4dcc4"), CREAM = mat("#e4e0d4");
const SKIN = mat("#e8b48a"), HAIR = mat("#86705c"), GOLD = mat("#e8c860", { contrast: 1.15 }), WOOD = mat("#6a4424", { contrast: 1.15 });
const IRON = mat("#9aa2b0", { contrast: 1.2 }), EYE = flat("#2a1c2c"), LIP = flat("#b86a5a"), BRASS = mat("#b88a3a"), WINDOW = flat("#ffe8a0", { emis: true, line: "#b88a3a" });
const HOLY = flat("#fff6c8", { emis: true, line: "#e8c860" }), HOLY2 = flat("#ffe27a", { emis: true, line: "#d8a840" });

// the head, bare: a tonsure (skin crown, a ring of hair at the back and sides), the face at the front edge
//   h hair, H hair darker, Q hair lit, S skin, s skin a tone down, b brow, E eye, N nose, m lips, B beard, g beard lit
const HEAD = [
  "....SSSS.....",
  "..hQSSSSSs...",
  ".hhhSSSSSSs..",
  ".hhhsSSSSSSs.",
  "hhhHhbbSbbs..",
  "hhhHSSSESSSE.",
  "hhHSSSSESSSEN",
  ".hhSSSSSSSSS.",
  "....sSSSSmm..",
  "......SSSS...",
];
const BLINK = HEAD.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));
const LEG = {
  h: { m: HAIR, fix: 2 }, H: { m: HAIR, fix: 1 }, Q: { m: HAIR, fix: 3 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, b: { m: HAIR, fix: 2 }, m: { m: LIP },
};

// the near arm may pass in front of the head, but never over the eyes
export const MUST = [["nearArm", "notOver", "eyes"]];
export const BOX = { w: 92, h: 78, ox: 38, oy: 66 };
export const BONES = scaled(HUMAN, 1, { shN: -3, shF: 3, hipN: -1.4, hipF: 1.6, neck: 1.5 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// Depth order, back to front, STATIC: the head, the mace, the near arm (in front of the head, never behind it).
const FZ = layers(["head", "mace", "arm"], [], { z0: 5, step: 0.45 });

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), sway = p.sway || 0;
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);

  // the far arm: a wide sleeve, the hand bare
  px.part(); px.tag("farArm");
  px.capsule(sF[0], sF[1], 2.6, eF[0], eF[1], 2.5, HABIT, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.5, hdF[0], hdF[1], 2.1, HABIT, 1, { bias: -1 });
  px.part(); px.ellipse(hdF[0], hdF[1], 1.5, 1.5, SKIN, 1.2, { bias: -1 }); px.tag(null);

  // the feet: bare toes in sandals under the hem (a raised foot slips behind the robe)
  px.part();
  px.ellipse(anF[0] + 1.4, anF[1] + 0.4, 2.7, 1.3, SKIN, 3, { bias: -1 });
  px.ellipse(anN[0] + 1.4, anN[1] + 0.4, 2.7, 1.3, SKIN, 3.1);

  // the habit: one robe from the shoulders to the ground, its hem cut from where the feet stand
  const fc = (anN[0] + anF[0]) / 2, hemY = -1.3 - Math.min(1, Math.abs(anN[1] - anF[1]) * 0.25), hemF = fc + 7.8 - vx * 0.6, hemB = fc - 7.4 - vx * 1.5;
  px.part(); const rb = px._pid;
  px.poly([[C[0] - 4.9, C[1] - 1.8], [C[0] + 5, C[1] - 1.8], [C[0] + 6, C[1] + 3.5], [P[0] + 5.6, P[1] - 1], [hemF, hemY], [hemF - 2.6, hemY + 0.6], [fc + 0.4 - vx, hemY], [hemB + 3, hemY + 0.6], [hemB, hemY], [P[0] - 5.6, P[1] - 1], [C[0] - 6, C[1] + 3.5]], HABIT, 4, { round: 0.9, ny: -0.12, cast: 2 });
  px.toneLine(P[0] + 1, P[1] + 1, fc + 1 - vx, hemY - 0.8, -1, rb);
  px.toneLine(P[0] - 2.6, P[1] + 3, hemB + 3.4, hemY - 1, -1, rb);
  px.line(C[0] - 2.8, C[1] - 1.3, C[0] + 3, C[1] - 1.3, CREAM, 4.3);
  // the rope belt, its knotted end hanging
  px.part();
  px.line(P[0] - 5.2, P[1] - 2.2, P[0] + 5.2, P[1] - 2.2, ROPE, 4.3);
  px.line(P[0] + 2.6, P[1] - 2, P[0] + 3 - vx * 0.8 + sway * 0.4, P[1] + 5.4, ROPE, 4.32);
  px.dot(P[0] + 3 - vx * 0.8 + sway * 0.4, P[1] + 6.2, ROPE, 4.34, { fix: 3 });

  // the head
  px.part();
  const Z = FZ({});
  stampFace(px, p.blink ? BLINK : HEAD, hx, hyy, LEG, Z.head, Z.head, { ax: 7, ay: 10, ball: [6.5, 5, 6.5, 6], cast: 2, edge: true }, "SsNEem");

  // the mace through the near fist; mc is its angle from upright (+ toward the foe)
  const a = p.mc ?? 0.3, d = [Math.sin(a), -Math.cos(a)], nrm = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t + nrm[0] * s, hdN[1] + d[1] * t + nrm[1] * s];
  const hz = Z.mace;
  const hd = B(13);
  px.part(); px.tag("mace");
  px.capsule(...B(-3), 1.15, ...B(11), 1, WOOD, hz, { edge: true });
  px.capsule(...B(-0.5), 1.25, ...B(3.4), 1.25, ROPE, hz + 0.02);
  px.part();
  px.ellipse(...B(-3.6), 1.3, 1.3, GOLD, hz + 0.05);
  // the head: a gold ball with a short iron collar and two small flanges
  px.ellipse(hd[0], hd[1], 2.4, 2.6, GOLD, hz + 0.1, { vb: 0.2 });
  px.capsule(...B(11.2), 1.5, ...B(11.8), 1.5, IRON, hz + 0.11);
  for (const s of [-1, 1]) px.capsule(hd[0] + nrm[0] * 1.8 * s, hd[1] + nrm[1] * 1.8 * s, 0.9, hd[0] + nrm[0] * 3 * s, hd[1] + nrm[1] * 3 * s, 0.6, GOLD, hz + 0.12, { edge: true });
  px.capsule(...B(15), 0.8, ...B(16.6), 0.3, IRON, hz + 0.12, { edge: true });
  px.tag(null);

  // the near arm over it all: a wide sleeve (raised, it passes BEHIND the head so the face stays open)
  const az = Z.arm;
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.5, 2.7, eN[0], eN[1], 2.6, HABIT, az, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.6, hdN[0], hdN[1], 2.1, HABIT, az, { cast: 2 });
  px.part(); px.ellipse(hdN[0], hdN[1], 1.7, 1.7, SKIN, az + 0.2); px.tag(null);

  // holy light: a flash on the smash
  const k = p.flash || 0, lights = [];
  if (k > 0.05) lights.push({ x: hd[0], y: hd[1], r: 16 + 26 * k, col: "#ffe8a0", k: 0.85 * k });
  return { head: hd, flash: k, lights };
};

// the smash's burst: rays out of the mace's head
export const fx = (px, F, info) => {
  if (!info || !(info.flash > 0.15)) return;
  const k = info.flash, [x, y] = info.head, n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3, r0 = 3.8 + 2 * k, r1 = r0 + (i % 2 ? 4 : 7) * k;
    px.line(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.8, x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.8, i % 2 ? HOLY2 : HOLY, 20, { noLine: true });
  }
};

const GUARD = { nb: 0, aN: [0.5, 0.8, 0], aF: [0.62, 0.9, 0], mc: 1.15, fN: [-2, 0], fF: [2.4, 0], flash: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1800, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 0.9); return { ...GUARD, aF: [0.05, 0.95, 0], rise: 0.5 + 0.5 * b, mc: 1.15 + 0.03 * b2, sway: b2 * 0.9, blink: ph > 0.62 && ph < 0.74 ? 1 : 0 }; },
  },
  // the march: short steps under the robe, the mace carried upright before his face
  walk: {
    n: 8, ms: 800, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 4.6, lift: 2.2, swing: 0.3, bob: 1 }), a = Math.cos(ph * Math.PI * 2); return { ...w, nb: 0, aN: [0.55 + 0.04 * a, 0.8, 0], mc: 0.75 + 0.05 * a, aF: [0.12 - 0.35 * a, 0.94, 0], sway: a * 1.2, flash: 0 }; },
  },
  attack: {
    n: 12, ms: 860, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // the wind-up carries the mace back over the REAR shoulder, hand low behind the neck: nothing near the head
      { t: 0.09, e: "out", p: { rx: -0.4, drop: 0.28, lean: -0.04, twist: -0.2, rise: 0.14, aN: [1.35, 0.62, 0], nb: 0, flash: 0, mc: 0.55, aF: [0.6, 0.85, 0], fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.19, e: "out", p: { rx: -1.1, drop: 0.6, lean: -0.1, twist: -0.6, rise: 0.35, hx: 0.6, aN: [3.7, 0.8, 0], nb: 0, flash: 0, mc: -0.6, aF: [0.9, 0.8, 0], fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.42, e: "io", p: { rx: -1.7, drop: 0.9, lean: -0.16, twist: -0.8, rise: 0.5, hx: 0.7, aN: [3.85, 0.82, 0], nb: 0, flash: 0, mc: -0.95, aF: [1.05, 0.8, 0], fN: [-2, 0], fF: [2.4, 0] } },
      { t: 0.46, e: "out", p: { rx: 0.5, drop: 1.1, lean: 0.05, twist: 0.1, rise: 0.2, hx: 0.6, aN: [1.9, 1, 0], nb: 0, mc: 0.6, aF: [0.5, 0.8, 0], fN: [-2.4, 0], fF: [4, 0], flash: 0 } },
      { t: 0.56, e: "in3", p: { rx: 2.6, drop: 1.8, lean: 0.24, twist: 0.8, hx: 0.5, aN: [1.05, 1, 0], nb: 0, mc: 2.05, aF: [0.2, 0.8, 0], fN: [-2.6, 0], fF: [6, 0], flash: 1 } },
      { t: 0.68, e: "out", p: { rx: 3, drop: 2, lean: 0.27, twist: 0.9, hx: 0.6, aN: [0.6, 0.96, 0], mc: 2.5, aF: [0.1, 0.82, 0], fN: [-2.6, 0], fF: [6, 0], flash: 0.6 } },
      { t: 0.82, e: "io", p: { rx: 2.2, drop: 1.4, lean: 0.18, twist: 0.5, aN: [0.5, 0.94, 0], mc: 2.3, aF: [0.2, 0.84, 0], fN: [-2.6, 0], fF: [5, 0], flash: 0.15 } },
      { t: 1, e: "io", p: GUARD },
    ], ph),
  },
};
