// ============ FIGURE: Ysolde the Stormcaller ============
// An indigo robe with silver trim, long white hair, a grey mantle, and a staff whose silver claw
// holds a pale-blue crystal that lights her and the ground about her. (The owner's pick of
// three, 2026-11-14: "A", the faithful look.)
// Clips: idle, walk (the staff carried), attack (the ready, the thrust the bolt leaves from,
// recoil, recover; the engine flies the bolt), sky (the staff raised overhead: raise, hold,
// crackle, hold: the Thunderclap). `info.marks.tip` is the crystal for the engine's shots.
import { mat, flat, layers } from "./pix.js";
import { stampFace } from "./bowlayers.js";
import { sampleKeys, walkPose, HUMAN, scaled } from "./rig.js";

const ROBE = mat("#3c3a7e"), SILVER = mat("#c8d0e4", { contrast: 1.15 }), SKIN = mat("#ecd0b4"), HAIR = mat("#dfe4f2", { contrast: 1.25 }), HAIR_D = mat("#aeb4cc");
const CAPE = mat("#6a7082"), WOOD = mat("#5e4a38", { contrast: 1.15 }), EYE = flat("#2a1c2c"), LIP = flat("#c07a76"), BOOT = mat("#2c2a40");
const CRYS = flat("#bfe6ff", { emis: true, line: "#6aa8d8" }), CRYS_C = flat("#ffffff", { emis: true, line: "#bfe6ff" }), SPARK = flat("#e8f8ff", { emis: true, line: "#7cc4f0" });

// the head: R hair, r a darker strand, Q lit, S skin, s a tone down, E eye, N nose, m lips
const HEAD = [
  "....QQQRR....",
  "..QQQQRRRRR..",
  ".QQRRRRRRRRR.",
  ".QRRRRRRrRRR.",
  "RRRRRrRRRRss.",
  "RRRRrRSSESSE.",
  "RRRrrSSSESSEN",
  ".RrrSSSSSSSS.",
  "....sSSSSmm..",
  "......SSSS...",
];
const BLINK = HEAD.map((r, i) => (i === 5 ? r.replace(/E/g, "S") : i === 6 ? r.replace(/E/g, "e") : r));
const LEG = {
  R: { m: HAIR, fix: 2 }, r: { m: HAIR_D, fix: 1 }, Q: { m: HAIR, fix: 3 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP },
};

// the staff and its arm never pass over her face (they go behind her head)
export const MUST = [["staff", "notOver", "face"], ["nearArm", "notOver", "face"], ["nearArm", "notOver", "eyes"], ["staff", "notOver", "eyes"]];
export const BOX = { w: 96, h: 84, ox: 36, oy: 72 };
export const BONES = scaled(HUMAN, 1, { thigh: 8.6, shin: 8.1, shN: -2.5, shF: 2.5, hipN: -1.2, hipF: 1.3 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// Depth order of her head, the staff and the staff arm (back to front). Raised, or with the hand up beside
// her head, the arm and the staff pass BEHIND it (the head's edge keeps them apart); otherwise they are in front.
const YZ = layers(["head", "staff", "arm"], [
  { when: (p) => p.behind, put: "head", above: "arm" },
], { z0: 5, step: 0.45 });
const hash = (n) => { const s = Math.sin(n * 91.7 + 13.1) * 43758.5453; return s - Math.floor(s); };

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), sway = p.sway || 0;
  const hx = Math.round(N[0]), hyy = Math.round(N[1]), g = p.glow || 0;
  const behind = (p.nb || 0) >= 0.5 || (hdN[1] < N[1] + 3 && Math.abs(hdN[0] - N[0]) < 7);
  const Z = YZ({ behind });
  // the staff's own line: st is its angle from upright (+ toward the foe)
  const a = p.st ?? 0.5, d = [Math.sin(a), -Math.cos(a)], nr = [-d[1], d[0]];
  const at = (t, s = 0) => [hdN[0] + d[0] * t + nr[0] * s, hdN[1] + d[1] * t + nr[1] * s];
  const cx = at(22.6);

  // behind it all: the grey mantle's back and the hair down her back, a beat behind
  const t1 = -vx * 1.6 + sway * 0.6, t2 = -vx * 2.4 - vx2 * 2 + sway;
  px.part();
  px.poly([[C[0] - 3.6, C[1] - 2], [C[0] + 1.6, C[1] - 2], [C[0] + 0.4, C[1] + 5], [P[0] - 2 + t2 * 0.5, P[1] + 4], [P[0] - 5.4 + t1, P[1] + 3], [C[0] - 6.2, C[1] + 3]], CAPE, 0.5, { round: 0.85 });
  const hs = hx - 4, hys = hyy - 4;
  px.part();
  px.capsule(hs, hys, 2.8, hs - 2.4 - t1 * 0.4, hys + 8, 3, HAIR, 0.8);
  px.capsule(hs - 2.4 - t1 * 0.4, hys + 8, 3, hs - 3.4 - t2 * 0.6, hys + 15.4, 1.6, HAIR_D, 0.8);

  // the far arm: a bell sleeve, silver cuff, the hand open (it gestures)
  px.part();
  px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 2.2, ROBE, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.4, hdF[0], hdF[1], 2, ROBE, 1, { bias: -1 });
  px.line(eF[0] * 0.25 + hdF[0] * 0.75 - 1.4, eF[1] * 0.25 + hdF[1] * 0.75, eF[0] * 0.25 + hdF[0] * 0.75 + 1.4, eF[1] * 0.25 + hdF[1] * 0.75, SILVER, 1.02);
  px.part(); px.ellipse(hdF[0], hdF[1], 1.5, 1.5, SKIN, 1.2, { bias: -1 });

  // the robe to the ground, its hem cut from where the feet stand, silver at hem, collar and front
  px.part();
  px.ellipse(anF[0] + 1.4, anF[1] + 0.4, 2.5, 1.2, BOOT, 3, { bias: -1 }); px.ellipse(anN[0] + 1.4, anN[1] + 0.4, 2.5, 1.2, BOOT, 3.1);
  const fc = (anN[0] + anF[0]) / 2, hemY = -1.3 - Math.min(1, Math.abs(anN[1] - anF[1]) * 0.25), hemF = fc + 7 - vx * 0.7, hemB = fc - 7 - vx * 1.8;
  px.part(); const rb = px._pid;
  px.poly([[C[0] - 4.3, C[1] - 1.8], [C[0] + 4.4, C[1] - 1.8], [C[0] + 5.2, C[1] + 3.2], [P[0] + 4.6, P[1] - 1], [hemF, hemY], [hemF - 2.4, hemY + 0.7], [fc + 0.4 - vx, hemY - 0.2], [hemB + 3, hemY + 0.7], [hemB, hemY], [P[0] - 4.6, P[1] - 1], [C[0] - 5.2, C[1] + 3.2]], ROBE, 4, { round: 0.9, ny: -0.12, cast: 2 });
  px.toneLine(P[0] + 0.8, P[1] + 1, fc + 0.6 - vx, hemY - 0.8, -1, rb);
  px.toneLine(P[0] - 2.6, P[1] + 3, hemB + 3.4, hemY - 1, -1, rb);
  px.line(hemB + 0.6, hemY - 0.6, hemF - 0.6, hemY - 0.6, SILVER, 4.2, { noLine: true });
  px.line(hemB + 1, hemY - 3.4, hemF - 1.4, hemY - 3.4, SILVER, 4.21, { noLine: true });
  px.line(C[0] - 2.8, C[1] - 1.3, C[0] + 2.8, C[1] - 1.3, SILVER, 4.3);
  px.line(C[0] + 1.2, C[1] - 1, C[0] + 1.6, P[1] - 2, SILVER, 4.22, { noLine: true });
  // the mantle over the shoulders, a silver edge
  px.part();
  px.poly([[C[0] - 5.4, C[1] - 2.6], [C[0] + 5, C[1] - 2.6], [C[0] + 6, C[1] + 1.4], [C[0] + 3, C[1] + 3.2], [C[0] + 0.4 - vx * 0.5, C[1] + 4], [C[0] - 3, C[1] + 3], [C[0] - 6, C[1] + 1.6]], CAPE, 5, { round: 0.9, cast: 1 });
  px.line(C[0] - 5.4, C[1] + 1.4, C[0] + 5.6, C[1] + 1.2, SILVER, 5.02, { noLine: true });

  // the head
  px.part();
  stampFace(px, p.blink ? BLINK : HEAD, hx, hyy, LEG, Z.head, Z.head, { ax: 7, ay: 10, cast: 2, edge: true }, "SsNEem");

  // the staff: a plain shaft with silver collars, a claw of silver round the crystal
  const bz = Z.staff;
  px.part(); px.tag("staff");
  px.capsule(...at(-11), 0.95, ...at(19), 0.9, WOOD, bz, { edge: true });
  px.capsule(...at(-11), 1.2, ...at(-9.8), 1.2, SILVER, bz + 0.02);
  px.capsule(...at(15.4), 1.4, ...at(17), 1.3, SILVER, bz + 0.03);
  px.part();
  for (const s of [-1, 1]) { px.line(...at(17, 0.4 * s), ...at(20, 2.6 * s), SILVER, bz + 0.05, { fix: 3 }); px.line(...at(20, 2.6 * s), ...at(24, 2 * s), SILVER, bz + 0.05, { fix: 3 }); }
  const c0 = at(21.6);
  px.ellipse(c0[0], c0[1], 2.3, 2.7, CRYS, bz + 0.08);
  px.dot(cx[0] - 0.6, cx[1] - 0.8, CRYS_C, bz + 0.1);
  if (g > 0.5) px.ellipse(cx[0], cx[1], 1 + g, 1 + g, CRYS_C, bz + 0.12);
  px.tag(null);

  // the near arm: a bell sleeve to the grip, a silver cuff; passes behind the head when raised
  const az = Z.arm;
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.4, 2.2, eN[0], eN[1], 2.3, ROBE, az, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.5, hdN[0], hdN[1], 2, ROBE, az, { cast: 2 });
  px.line(eN[0] * 0.25 + hdN[0] * 0.75 - 1.5, eN[1] * 0.25 + hdN[1] * 0.75, eN[0] * 0.25 + hdN[0] * 0.75 + 1.5, eN[1] * 0.25 + hdN[1] * 0.75, SILVER, az + 0.02);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.7, 1.7, SKIN, az + 0.2); px.tag(null);

  const lights = [{ x: cx[0], y: cx[1], r: 16 + 26 * g, col: "#8ad8ff", k: cl(0.5 * g, 0, 0.7) }];
  return { crystal: cx, crackle: p.crackle || 0, lights, marks: { tip: cx } };
};

// crackles about the crystal when she charges (the engine flies her bolts)
export const fx = (px, F, info) => {
  if (!info || !(info.crackle > 0.3)) return;
  const [x, y] = info.crystal, seed = Math.round(F.ph * 100) + 5;
  for (let i = 0; i < 4; i++) { const an = hash(seed + i) * 6.28, r = 3.6 + hash(seed + i * 3) * 3 * info.crackle; px.line(x + Math.cos(an) * 3.4, y + Math.sin(an) * 3.4, x + Math.cos(an) * r, y + Math.sin(an) * r, SPARK, 21, { noLine: true }); }
};

const READY = { aN: [1.0, 0.86, 0], aF: [0.1, 0.9, 0], st: 0.5, glow: 0.1, crackle: 0, bolt: 0, nb: 0, fN: [-1.8, 0], fF: [2, 0] };
// the Thunderclap's four poses, the staff raised overhead
const SKY = [
  { aN: [2.5, 0.72, 1], nb: 1, st: -0.1, aF: [1.2, 0.8, 0], glow: 0.7, rise: 0.6, hy: -0.4, lean: -0.05, twist: -0.4 },
  { aN: [2.9, 0.7, 1], nb: 1, st: -0.02, aF: [1.7, 0.95, 0], glow: 1.0, rise: 1, hy: -0.8, lean: -0.08, twist: -0.5 },
  { aN: [2.9, 0.7, 1], nb: 1, st: 0.02, aF: [1.9, 1, 0], glow: 1.4, crackle: 1, rise: 1.1, hy: -0.8, lean: -0.08, twist: -0.5 },
  { aN: [2.9, 0.7, 1], nb: 1, st: -0.02, aF: [1.8, 1, 0], glow: 1.2, crackle: 0.6, rise: 1, hy: -0.8, lean: -0.08, twist: -0.5 },
];
export const CLIPS = {
  idle: {
    n: 8, ms: 2000, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 1); return { ...READY, rise: 0.5 + 0.5 * b, glow: 0.15 + 0.15 * (0.5 + 0.5 * b2), sway: b2 * 1.1, blink: ph > 0.62 && ph < 0.74 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5, lift: 2.4, swing: 0.3, bob: 1 }), a = Math.cos(ph * Math.PI * 2); return { ...READY, ...w, aN: [0.9 + 0.05 * a, 0.86, 0], st: 0.45 + 0.05 * a, aF: [0.1 - 0.4 * a, 0.93, 0], glow: 0.18, sway: a * 1.3 }; },
  },
  // the cast: ready, the staff drawn up, the thrust the bolt leaves from, recoil, recover
  attack: {
    n: 12, ms: 900, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      { t: 0.09, e: "out", p: { ...READY, rx: -0.25, lean: -0.03, twist: -0.2, rise: 0.25, hy: -0.2, aN: [2.7, 0.72, 1], nb: 1, st: -0.2, aF: [0.5, 0.85, 0], glow: 0.3, fN: [-2, 0], fF: [2.2, 0] } },
      { t: 0.3, e: "out", p: { ...READY, rx: -0.8, lean: -0.1, twist: -0.6, rise: 0.8, hy: -0.6, aN: [2.6, 0.7, 1], nb: 1, st: -0.2, aF: [0.9, 0.85, 0], glow: 0.7, fN: [-2.2, 0], fF: [2.4, 0] } },
      { t: 0.5, e: "io", p: { ...READY, rx: -0.4, lean: -0.04, twist: -0.4, rise: 1, hy: -0.8, aN: [2.8, 0.66, 1], nb: 1, st: -0.1, aF: [1.9, 1, 0], glow: 1.1, crackle: 1, fN: [-2.2, 0], fF: [2.4, 0] } },
      { t: 0.6, e: "in3", p: { ...READY, rx: 1.8, drop: 1, lean: 0.2, twist: 0.7, hx: 0.4, aN: [1.7, 0.86, 0], nb: 0, st: 1.2, aF: [1.6, 1, 0], glow: 1.5, crackle: 1, fN: [-2.6, 0], fF: [5, 0] } },
      { t: 0.74, e: "out", p: { ...READY, rx: 2.2, drop: 1.2, lean: 0.24, twist: 0.8, hx: 0.5, aN: [1.6, 0.9, 0], nb: 0, st: 1.35, aF: [1.5, 1, 0], glow: 1.1, crackle: 0.5, fN: [-2.6, 0], fF: [5, 0] } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
  sky: { n: 4, ms: 400, loop: false, lag: 0.01, pose: (ph) => ({ ...READY, fN: [-2.2, 0], fF: [2.4, 0], ...SKY[Math.round(ph * 3)] }) },
};
