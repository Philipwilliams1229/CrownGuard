// ============ FIGURE: the Plague Ghast (the Hollow Court's bloated runner, game type `ghast`) ============
// A drowned corpse swollen with grave-rot: stooped under its own distended gut, a hump of
// a back, thin bowed legs, long arms hung low with big clawed hands, a bald swollen head
// slung forward with the jaw lolling and small sick-yellow eyes. Pale dead-green skin, a
// paler tight belly with bruising, a shroud loincloth and drowned weed over one shoulder, and
// glowing sores (crusted rims, pus-yellow light) that promise the burst. About 44 px to the hump,
// a head taller than the Risen. Facing +x, a quarter turned.
// Clips: idle (a heaving sway), walk (a shambling run, the belly swinging a beat behind),
// attack (both arms flung up, slammed down on the foe, the claws raking on).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN } from "./rig.js";

const SKIN = mat("#a4ae8c"), GUT = mat("#c8c8a0"), BRUISE = mat("#6a5a7a", { contrast: 0.9 }), RAG = mat("#4a5a50", { contrast: 0.9 }), RAG2 = mat("#2a2434", { contrast: 0.9 });
const WEED = mat("#4e6a48"), CLAW = mat("#d8d0b4"), CRUST = mat("#8a5a3a", { contrast: 0.9 });
const PUS = flat("#d8e860", { emis: true, line: "#7a8a2a" }), PUS_H = flat("#f4ffb0", { emis: true, line: "#c8d84a" });
const EYE = flat("#d8e860", { emis: true }), SOCK = flat("#1c1a14"), MOUTH = flat("#2c1a22"), TOOTH = flat("#e4dcc0");

// The head, facing +x, a quarter turned: S skin (s a tone down), e the dark socket round
// the sick eye E, N the nose, M the slack mouth's dark and T the few teeth in it.
const HEAD = [
  "...SSSSSS...",
  "..SSSSSSSSS.",
  ".sSSSSSSSSSS",
  ".sSSSSSeEeSS",
  ".sSSSSSSSSSN",
  "..sSSSSSSSSN",
  "..sSSSSSSSS.",
  "...sSTMTMTS.",
  "....sSMMMMS.",
  ".....sMMMS..",
];
// the roar of the blow: the jaw dropped wide on its teeth, the eye narrowed
const ROAR = HEAD.map((r, i) => ({ 3: ".sSSSSSSeESS", 7: "...sSTMTMTT.", 8: "....sTMMMMMT", 9: ".....sTMMMMT", 10: "......sMMMS." })[i] ?? r).concat(["......ssMS..."]);
const BLINK = HEAD.map((r, i) => (i === 3 ? ".sSSSSSSSSSS" : r));
const LEG = { S: { m: SKIN }, s: { m: SKIN, bias: -1 }, e: { m: SOCK }, E: { m: EYE }, N: { m: SKIN, fix: 1 }, M: { m: MOUTH }, T: { m: TOOTH, fix: 4 } };

export const BOX = { w: 68, h: 62, ox: 30, oy: 56 };
export const BONES = scaled(HUMAN, 1.08, { shN: -2.2, shF: 3.2 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const draw = (px, { sk, lag1, lag2, ph }, o = {}) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(N[0] - lag1.N[0], -2, 2), vy = cl(P[1] - lag1.P[1], -2, 2) + cl(lag1.P[1] - lag2.P[1], -2, 2) * 0.6;
  const u = (() => { const dx = P[0] - C[0], dy = P[1] - C[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; })();
  const fw = [u[1], -u[0]], L = Math.hypot(P[0] - C[0], P[1] - C[1]);
  const at = (t, s) => [C[0] + u[0] * L * t + fw[0] * s, C[1] + u[1] * L * t + fw[1] * s];
  const ff = (p.flung ?? 0);

  // ---- the far arm and leg, a tone down
  const armOf = (s, e, h, z, b, m) => {
    px.part();
    px.capsule(s[0], s[1], 2.0, e[0], e[1], 1.5, m, z, { bias: b });
    px.capsule(e[0], e[1], 1.5, h[0], h[1], 1.2, m, z, { bias: b });
    px.ellipse(e[0], e[1], 1.7, 1.6, m, z + 0.02, { bias: b });
    px.ellipse(h[0] + 0.6, h[1] + 0.6, 2.1, 1.8, m, z + 0.03, { bias: b });
    for (const [dx, dy] of [[2.6, -0.6], [3.2, 0.9], [2.4, 2.2]]) px.line(h[0] + 1.2, h[1] + 0.8, h[0] + dx + 1.2, h[1] + dy + 1, CLAW, z + 0.05, { fix: 3, bias: b });
  };
  armOf(sF, eF, hdF, 1, -1, SKIN);
  const legOf = (hp, kn, an, z, b) => {
    px.part();
    px.capsule(hp[0], hp[1], 2.2, kn[0], kn[1], 1.6, SKIN, z, { bias: b });
    px.capsule(kn[0], kn[1], 1.6, an[0], an[1], 1.2, SKIN, z, { bias: b });
    px.ellipse(kn[0] + 0.2, kn[1], 1.9, 1.8, SKIN, z + 0.02, { bias: b });
    px.capsule(an[0] - 0.4, an[1] + 0.8, 1.1, an[0] + 3.8, an[1] + 1, 0.9, SKIN, z, { bias: b });
  };
  legOf(hF, kF, anF, 2, -1);

  // ---- a torn strip of shroud down the back
  px.part();
  px.poly([at(0, -2.4), at(0.2, -5.4), at(0.7, -5.8), at(1.05, -4.4 - vx), at(1.35, -4 - vx * 1.6), at(1.0, -1)], RAG2, 3.5, { round: 0.7, floor: 1 });

  // ---- the body: a hump of a back, the torso, and the great tight gut hung low in front
  px.part(); const bodyId = px._pid;
  px.ellipse(...at(0.1, -2.8), 5.6, 5.6, SKIN, 4, { cast: 1 });
  px.capsule(...at(0.2, 0), 4.6, ...at(0.9, 0), 4.8, SKIN, 4);
  const gut = at(0.78, 5 + vy * 0.5), gh = 6.4 + vy * 0.4;
  px.part();
  px.ellipse(gut[0], gut[1] + 0.4, 6.5, gh, GUT, 4.2, { cast: 1, round: 0.9 });
  const bruise = at(0.9, 3.8);
  px.ellipse(bruise[0], bruise[1], 3.4, 2.4, BRUISE, 4.25, { bias: 0, noLine: true });
  px.dot(...at(0.45, 4.4), BRUISE, 4.26, { noLine: true }); px.dot(...at(0.5, 3.4), BRUISE, 4.26, { noLine: true });
  px.line(...at(0.64, 3.2), ...at(0.8, 4.4), BRUISE, 4.27, { fix: 1 });
  // the belly's stretched sheen, a lit spot on its curve
  px.dot(...at(0.58, 5.6), GUT, 4.3, { fix: 4, noLine: true });
  // the sores: a crust ring with the sick light in it
  const sores = [[0.3, -4.8, 1.4], [0.55, -1.2, 1.2], [0.68, 6.6, 1.6], [1.0, 2.4, 1.3], [0.85, -3.4, 1.1]];
  const pulse = 0.5 + 0.5 * Math.sin(((ph ?? 0) + 0.2) * Math.PI * 2);
  px.part();
  for (const [t, s, r] of sores) { const q = at(t, s); px.ellipse(q[0], q[1], r + 0.7, r + 0.6, CRUST, 4.4); px.ellipse(q[0], q[1], r * 0.85, r * 0.8, pulse > 0.5 || r > 1.3 ? PUS_H : PUS, 4.45, { noLine: true }); }

  // ---- a loincloth of shroud, its hem swinging a beat behind
  px.part();
  const hm = P[1] + 8.5 + vy * 0.5;
  px.poly([[P[0] - 4.6, P[1] - 1.8], [P[0] + 4.4, P[1] - 1.8], [P[0] + 4.8, hm - 1.4], [P[0] + 2.4, hm + 1], [P[0] + 0.4, hm - 1.2], [P[0] - 1.8, hm + 1.4], [P[0] - 4.2 - vx * 1.4, hm - 0.8]], RAG, 4.5, { round: 0.85, floor: 1 });
  px.line(P[0] - 3, P[1] + 0.6, P[0] - 3.4 - vx, hm - 0.5, RAG2, 4.55, { fix: 0 });
  // legs over the rag
  legOf(hN, kN, anN, 3.2, 0);
  // drowned weed slung over the shoulder, trailing a beat behind
  px.part();
  const wv = cl(vx * 1.6, -2, 2.4);
  px.poly([at(0.02, -5.2), at(0.2, -6.8), at(0.7, -6.6 - wv), at(0.9, -5 - wv * 1.4), at(0.55, -4.4 - wv * 0.5)], WEED, 4.6, { round: 0.7, floor: 1 });
  px.poly([at(0.1, 0.4), at(0.1, 3.4), at(0.5, 4.2), at(0.28, 1.2)], WEED, 4.6, { round: 0.7, floor: 1 });

  // ---- the head, slung low and forward, jaw lolling
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  px.part();
  px.capsule(...at(0.0, 1.4), 2.8, N[0] + 0.5, N[1] + 3.6, 2.4, SKIN, 5);
  px.part();
  const grid = p.roar > 0.5 ? ROAR : p.blink ? BLINK : HEAD;
  px.stamp(grid, hx + 1, hy - 1, LEG, 6, { ax: 5, ay: 9, ball: [5.6, 4.6, 6, 5.2], cast: 1 });
  px.dot(hx - 1, hy - 8, PUS, 6.2, { fix: 3 });         // a sore on the swollen scalp

  // ---- the near arm over all, a sore on it
  armOf(sN, eN, hdN, 8, 0, SKIN);
  px.dot(Math.round(eN[0] + 0.5), Math.round(eN[1] - 1), PUS, 8.5, { noLine: true });
  return { light: { x: gut[0], y: gut[1], r: 24, col: "#e0ec70", k: 0.34 + 0.12 * pulse }, glow: [gut[0], gut[1]] };
};

export const fx = () => {};

const BASE = { lean: 0.46, drop: 1.2, hx: 1.2, hy: 2.2, aN: [-0.08, 0.96, 0], aF: [0.1, 0.96, 0], fN: [-2.2, 0], fF: [2.6, 0], roar: 0, flung: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1800, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * Math.PI * 2), u = 0.5 + 0.5 * b;
      return { ...BASE, rise: 0.8 * u, drop: 1.2 + 0.4 * (1 - u), hy: 2.2 + 0.5 * Math.sin(ph * Math.PI * 2 - 1), aN: [-0.1 + 0.05 * b, 0.96, 0], aF: [0.1 - 0.04 * b, 0.96, 0], blink: ph > 0.7 && ph < 0.8 ? 1 : 0 };
    },
  },
  // a shambling run: heavy, stooped, the arms hanging and swinging, the belly swaying behind
  walk: {
    n: 8, ms: 780, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 4.8, lift: 2.4, swing: 0.34, bob: 1.5, lean: 0.46 }), a = Math.cos(ph * Math.PI * 2);
      return { ...BASE, ...w, drop: w.drop + 1, hy: 2.2 + 0.5 * a, aN: [-a * 0.34 - 0.08, 0.96, 0], aF: [a * 0.34 + 0.1, 0.96, 0] };
    },
  },
  attack: {
    n: 12, ms: 900, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: BASE },
      // rear up: the body sinks and tips back, both arms flung overhead, the jaw wide
      { t: 0.3, e: "out", p: { ...BASE, rx: -2, drop: 2, lean: 0.1, rise: 0.8, hx: -0.4, hy: 0.4, aN: [2.8, 0.96, 0], aF: [2.55, 0.96, 0], fN: [-3, 0], fF: [3, 0], roar: 1, flung: 1 } },
      { t: 0.42, e: "io", p: { ...BASE, rx: -2.4, drop: 2.2, lean: 0.04, rise: 1, hx: -0.6, hy: 0.2, aN: [3, 0.96, 0], aF: [2.7, 0.96, 0], fN: [-3, 0], fF: [3, 0], roar: 1, flung: 1 } },
      // slammed down on the foe, the whole gut thrown after them
      { t: 0.54, e: "in3", p: { ...BASE, rx: 3.4, drop: 2.2, lean: 0.8, hx: 2.4, hy: 2.8, aN: [1.1, 1, 0], aF: [0.8, 1, 0], fN: [-2, 0], fF: [5.4, 0], roar: 1, flung: 1 } },
      { t: 0.64, e: "out", p: { ...BASE, rx: 4, drop: 2.6, lean: 0.9, hx: 2.6, hy: 3, aN: [0.7, 1, 0], aF: [0.45, 1, 0], fN: [-2, 0], fF: [5.8, 0], roar: 1, flung: 1 } },
      { t: 0.84, e: "io", p: { ...BASE, rx: 1.6, drop: 1.6, lean: 0.6, aN: [0.1, 0.96, 0], aF: [0.2, 0.96, 0] } },
      { t: 1, e: "out", p: BASE },
    ], ph),
  },
};
