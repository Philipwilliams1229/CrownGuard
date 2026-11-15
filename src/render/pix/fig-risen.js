// ============ FIGURE: the Risen (the Hollow Court's rank-and-file bones) ============
// A drowned soldier's skeleton, a head shorter than a man: a skull with witch-fire teal in its
// sockets, a rib cage on a thin spine, bony limbs with knobbed knees, a rag of purple cloth at the
// hips, a pitted sword and a round wooden shield with an iron boss. Facing +x, a quarter turned.
// Already bone, so the game's `revived` bone-look needs nothing from it. The old rig has no
// extra sheets (its reassembly is the engine's, drawn with the same figure).
// Clips: idle, walk (8 frames, shield up and blade held ready), attack (an overhead chop).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN } from "./rig.js";

const BONE = mat("#e0d8c4"), RAG = mat("#4a3a5e", { contrast: 0.9 });
const WOOD = mat("#7a5c3c"), IRON = mat("#9a968a", { contrast: 1.2 }), DARKM = mat("#3a3228");
const GAP = flat("#6a604c"), SOCK = flat("#15121a");
const EYE = flat("#7ce0b8", { emis: true });

// The skull, facing +x, a quarter turned: S bone (s a tone down), e the dark socket, E the
// witch-fire in it, N the nasal hole, T teeth, j the jaw.
const SKULL = [
  "...SSSSSS..",
  "..SSSSSSSS.",
  ".SSSSSSSSSS",
  ".SSSSeeSeeS",
  ".sSSSeEsEeS",
  ".sSSSSSSSNs",
  "..sSSSSSSS.",
  "...sTTTTT..",
  "....jTjTj..",
  ".....jjj...",
];
// the blow's snarl: the jaw dropped a row
const SNARL = SKULL.map((r, i) => ({ 7: "...sTTTTT..", 8: "....jTjTj..", 9: ".....jjjj.." })[i] ?? r);
const LEG = { S: { m: BONE }, s: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 }, N: { m: BONE, fix: 1 }, e: { m: SOCK }, E: { m: EYE } };

export const BOX = { w: 64, h: 62, ox: 24, oy: 54 };
export const BONES = scaled(HUMAN, 0.94, { shN: -2.1, shF: 2.3 });

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(N[0] - lag1.N[0], -2, 2);
  const u = (() => { const dx = P[0] - C[0], dy = P[1] - C[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; })();
  const fw = [u[1], -u[0]], L = Math.hypot(P[0] - C[0], P[1] - C[1]);
  const at = (t, s) => [C[0] + u[0] * L * t + fw[0] * s, C[1] + u[1] * L * t + fw[1] * s];

  // ---- the far arm (a tone down) and the shield it carries before him
  px.part();
  px.capsule(sF[0], sF[1], 1.1, eF[0], eF[1], 1, BONE, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1, hdF[0], hdF[1], 0.9, BONE, 1, { bias: -1 });
  px.ellipse(eF[0], eF[1], 1.3, 1.3, BONE, 1.02, { bias: -1 });
  const sh = [hdF[0] + 1.2, hdF[1] - 0.4];
  px.part(); const sid = px._pid;
  px.ellipse(sh[0], sh[1], 3.6, 4.7, WOOD, 1.5, { round: 0.75 });
  px.toneLine(sh[0] - 1.1, sh[1] - 4, sh[0] - 1.1, sh[1] + 4, -1, sid);
  px.part();
  px.ellipse(sh[0] + 0.2, sh[1], 1.2, 1.2, IRON, 1.56, { cast: 1 });

  // ---- legs: thigh and shin bones, a knobbed knee, a long foot
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(hp[0], hp[1], 1, kn[0], kn[1], 0.85, BONE, z, { bias: b });
    px.capsule(kn[0], kn[1], 0.85, an[0], an[1], 0.8, BONE, z, { bias: b });
    px.ellipse(kn[0] + 0.2, kn[1], 1.25, 1.2, BONE, z + 0.02, { bias: b });
    px.capsule(an[0] - 0.4, an[1] + 0.7, 0.9, an[0] + 3.4, an[1] + 0.9, 0.7, BONE, z, { bias: b });
  }

  // ---- the pelvis, a tattered clout (its hem swings a beat behind), the spine and rib cage
  px.part();
  px.ellipse(P[0] - 0.2, P[1] - 0.4, 3.6, 2.2, BONE, 4, { floor: 1 });
  px.part();
  px.poly([[P[0] - 4, P[1] - 1.4], [P[0] + 4, P[1] - 1.4], [P[0] + 4.4, P[1] + 4.6], [P[0] + 2.6, P[1] + 3.2], [P[0] + 1.2, P[1] + 6], [P[0] - 0.4, P[1] + 3.6], [P[0] - 2.2, P[1] + 5.4], [P[0] - 3, P[1] + 3.2], [P[0] - 4.4 - vx * 1.2, P[1] + 4.8]], RAG, 4.4, { round: 0.8, floor: 1 });
  px.part();
  px.capsule(...at(0.04, -3.4), 0.9, ...at(1.04, -2.6), 0.9, BONE, 3.9, { bias: -1 });
  px.part();
  const rw = 4;
  px.poly([at(-0.1, -rw + 0.4), at(-0.1, rw - 0.2), at(0.3, rw + 0.2), at(0.62, rw - 1), at(0.74, 0.4), at(0.5, -rw + 1)], BONE, 4.1, { round: 0.7, floor: 1 });
  for (const t of [0.1, 0.26, 0.42, 0.58]) px.line(...at(t, -rw + 0.6), ...at(t + 0.03, rw - 0.8 - t * 1.4), GAP, 4.2);
  px.line(...at(-0.04, 0.8), ...at(0.7, 0.6), BONE, 4.25, { fix: 3 });
  px.part();
  px.capsule(...at(-0.1, 0.4), 1.2, N[0], N[1] + 2, 1, BONE, 4.05, {});

  // ---- the head
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  px.part();
  px.stamp(p.snarl > 0.5 ? SNARL : SKULL, hx + 1, hy - 1, LEG, 6, { ax: 5, ay: 9, ball: [5.5, 4.5, 5.5, 5.2], cast: 1 });

  // ---- the near arm over all, and the blade
  const sa = p.sword ?? 0.7, d = [Math.sin(sa), -Math.cos(sa)], nn = [-d[1], d[0]];
  const at2 = (f, s) => [hdN[0] + d[0] * f + nn[0] * s, hdN[1] + d[1] * f + nn[1] * s];
  px.part();
  px.poly([at2(1.8, -0.9), at2(1.8, 1.1), at2(11, 1.3), at2(13, 0.1), at2(11, -0.7)], IRON, 8.1, { fix: 3 });
  px.line(...at2(2, 1), ...at2(11, 1.1), IRON, 8.12, { fix: 4 });
  px.line(...at2(1.8, -1.8), ...at2(1.8, 2.2), BONE, 8.13, { fix: 1 });
  px.part();
  px.capsule(...at2(-2.4, 0), 0.8, ...at2(1.2, 0), 0.8, DARKM, 8.1);
  px.part();
  px.capsule(sN[0], sN[1] + 0.6, 1.2, eN[0], eN[1], 1.05, BONE, 7.9, { cast: 1 });
  px.capsule(eN[0], eN[1], 1.05, hdN[0], hdN[1], 0.95, BONE, 7.9, { cast: 1 });
  px.ellipse(eN[0] + 0.2, eN[1], 1.5, 1.4, BONE, 7.95);
  px.part();
  px.ellipse(hdN[0], hdN[1], 1.5, 1.4, BONE, 8.3);
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1], 1.7, 1.6, BONE, 8, { floor: 1 });
  return {};
};

const GUARD = { drop: 0.8, lean: 0.14, hx: 0.6, hy: 0, aN: [0.95, 0.9, 0], aF: [1.15, 0.9, 0], fN: [-2.4, 0], fF: [2.6, 0], sword: 0.35, snarl: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1500, loop: true, lag: 0.09,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), u = 0.5 + 0.5 * b; return { ...GUARD, rise: 0.5 * u, drop: 0.8 + 0.4 * (1 - u), aN: [0.95 + 0.05 * b, 0.9, 0], aF: [1.15, 0.9 - 0.03 * u, 0], sword: 0.35 + 0.08 * b, hy: 0.2 * b }; },
  },
  // a stiff, shambling march: the blade held ready and bobbing, the shield forward, a little head-nod
  walk: {
    n: 8, ms: 700, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 4.4, lift: 2.6, swing: 0.3, bob: 1.1, lean: 0.16 }), a = Math.cos(ph * Math.PI * 2);
      return { ...w, drop: w.drop + 0.7, hx: 0.8, hy: 0.35 * a, aN: [0.9 + 0.08 * a, 0.9, 0], aF: [1.15 - 0.05 * a, 0.9, 0], sword: 0.3 + 0.14 * a };
    },
  },
  attack: {
    n: 11, ms: 800, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // rear back: the blade high over the shoulder, the shield drawn in
      { t: 0.28, e: "out", p: { ...GUARD, rx: -2.2, drop: 1.6, lean: -0.1, hx: -0.4, hy: -0.4, aN: [2.75, 0.92, 0], aF: [0.7, 0.8, 0], sword: -0.5, fN: [-3, 0], fF: [3, 0] } },
      { t: 0.4, e: "io", p: { ...GUARD, rx: -2.8, drop: 1.8, lean: -0.16, hx: -0.6, hy: -0.5, aN: [2.95, 0.94, 0], aF: [0.6, 0.8, 0], sword: -0.8 } },
      // the chop: a step in, the whole body thrown over the blade
      { t: 0.52, e: "in3", p: { ...GUARD, rx: 3.4, drop: 2.2, lean: 0.55, hx: 2.2, hy: 0.8, aN: [1.45, 1, 0], aF: [-0.4, 0.9, 0], sword: 1.9, fF: [7, 0], snarl: 1 } },
      { t: 0.62, e: "out", p: { ...GUARD, rx: 4, drop: 2.4, lean: 0.62, hx: 2.6, hy: 1, aN: [1.25, 1, 0], aF: [-0.5, 0.9, 0], sword: 2.2, fF: [7.4, 0], snarl: 1 } },
      { t: 0.82, e: "io", p: { ...GUARD, rx: 1.2, drop: 0.6, lean: 0.28, aN: [0.9, 0.9, 0], sword: 1.2 } },
      { t: 1, e: "out", p: GUARD },
    ], ph),
  },
};
