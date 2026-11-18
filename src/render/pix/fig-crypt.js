// ============ FIGURE: the Crypt Warden (the Hollow Court's armoured dead, game type `crypt`) ============
// A huge skeleton in tarnished plate, about 56 px: a skull in an open bascinet with a bronze brim and
// witch-fire in the sockets, lamed pauldrons, a breastplate stove in over the heart (dark ribs and teal
// fire behind the hole, verdigris and bronze rivets on the steel), a skirt of lames with a rotten
// violet tabard strip, greaves and sabatons over bone legs, drowned weed on the shoulders. In the far
// arm his own SARCOPHAGUS LID, a slab of weathered stone with a carved cross and moss, carried before him
// as a shield; in the near hand a flanged mace, sloped back on the shoulder on the march. Slow and heavy.
// Facing +x, a quarter turned.
// Clips: idle, walk (8 frames, heavy), attack (the mace heaved up over the bascinet, brought down, dragged on).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN, ik } from "./rig.js";

const BONE = mat("#e0d8c4"), STEEL = mat("#5e665e", { contrast: 1.15 }), STEEL_D = mat("#464e4a", { contrast: 1.1 }), ROT = mat("#4a3a5e", { contrast: 0.9 });
const BRONZE = mat("#a08a44", { contrast: 1.15 }), VERD = mat("#5a9a80", { contrast: 1.0 }), WEED = mat("#4e6a48"), STONE = mat("#a39a86", { contrast: 1.05 }), MOSS = mat("#5c7a40"), HAFT = mat("#4a3c2c"), IRON = mat("#6c7280", { contrast: 1.25 });
const GAP = flat("#6a604c"), SOCK = flat("#15121a"), HOLE = flat("#1a1620");
const EYE = flat("#7ce0b8", { emis: true }), EYE_HOT = flat("#e0fff4", { emis: true }), F_TEAL = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), F_PALE = flat("#e0fff4", { emis: true, line: "#7ce0b8" });

// The skull in its open bascinet, facing +x, a quarter turned: C steel cap, B the bronze brim, S bone
// (s a tone down), e the dark socket, E the witch-fire, N the nasal hole, T teeth, j the jaw.
const SKULL = [
  "...CCCCCC...",
  "..CCCCCCCC..",
  ".CCCCCCCCCCC",
  ".BBBBBBBBBBB",
  ".sSSSeeSSeeS",
  ".sSSSeEsSeEe",
  "..sSSSSSSSNs",
  "..sSSSSSSSs.",
  "...sSTTTTT..",
  "....jTjTjTj.",
  ".....jjjjj..",
];
const SNARL = SKULL.map((r, i) => ({ 8: "...sSTTTTT..", 9: "....jTjTjTj.", 10: ".....jjjjjj." })[i] ?? r);
const legend = (eye) => ({ C: { m: STEEL }, B: { m: BRONZE, fix: 2 }, S: { m: BONE }, s: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 }, N: { m: SOCK }, e: { m: SOCK }, E: { m: eye } });
const LEG = legend(EYE), LEG_HOT = legend(EYE_HOT);

// THE GRIP. The mace is held in a closed fist: its angle is DERIVED from the solved forearm (elbow -> hand), never
// posed on its own: forearm + GRIP + a wrist clamped to +-0.35.
export const GRIP = -1.6;
export const WRIST = 0.35;
const forearm = (sk) => { const f = Math.atan2(sk.hdN[0] - sk.eN[0], -(sk.hdN[1] - sk.eN[1])); return f < -1.9 ? f + Math.PI * 2 : f; };
export const maceAngle = (sk) => forearm(sk) + GRIP + Math.max(-WRIST, Math.min(WRIST, sk.p.wrist || 0));
// the near arm may pass in front of the head, never over the eyes
export const MUST = [["nearArm", "notOver", "eyes"]];
export const BOX = { w: 104, h: 100, ox: 44, oy: 90 };
export const BONES = scaled(HUMAN, 1.4, { shN: -4.2, shF: 4.4, upper: 8.6, fore: 8.2 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const TAU = Math.PI * 2;

export const draw = (px, { sk, lag1, lag2, ph }, o = {}) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(N[0] - lag1.N[0], -2, 2), vx2 = cl(lag1.N[0] - lag2.N[0], -2, 2);
  const u = (() => { const dx = P[0] - C[0], dy = P[1] - C[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; })();
  const fw = [u[1], -u[0]], L = Math.hypot(P[0] - C[0], P[1] - C[1]);
  const at = (t, s) => [C[0] + u[0] * L * t + fw[0] * s, C[1] + u[1] * L * t + fw[1] * s];
  const ma = maceAngle(sk), d = [Math.sin(ma), -Math.cos(ma)], nn = [-d[1], d[0]];
  const at2 = (f, s) => [hdN[0] + d[0] * f + nn[0] * s, hdN[1] + d[1] * f + nn[1] * s];

  // ---- the lid on the far arm, carried before him: a slab of stone with a carved cross and moss
  {
    const c = [hdF[0] + 3.2, hdF[1] + 0.4], lw = 5.2, lh = 11.4;
    px.part(); const sid = px._pid;
    px.poly([[c[0] - lw, c[1] - lh + 1.6], [c[0] - lw + 1.6, c[1] - lh], [c[0] + lw - 1.6, c[1] - lh], [c[0] + lw, c[1] - lh + 1.6], [c[0] + lw, c[1] + lh - 1.2], [c[0] + lw - 1.4, c[1] + lh], [c[0] - lw + 1.4, c[1] + lh], [c[0] - lw, c[1] + lh - 1.2]], STONE, 2.5, { round: 0.5, floor: 1, edge: true });
    px.toneLine(c[0] - lw + 1, c[1] - lh + 2, c[0] - lw + 1, c[1] + lh - 2, -1, sid);
    px.part();
    px.line(c[0], c[1] - 6, c[0], c[1] + 5, STEEL_D, 2.6, { fix: 0 }); px.line(c[0] - 2.4, c[1] - 2.8, c[0] + 2.4, c[1] - 2.8, STEEL_D, 2.6, { fix: 0 });
    for (const [dx, dy] of [[-3, 7], [-2, 8], [-1, 7], [2, -8], [3, -9]]) px.dot(c[0] + dx, c[1] + dy, MOSS, 2.65, { fix: 1 });
    px.dot(c[0] + 2.8, c[1] + 4.6, STEEL_D, 2.65, { fix: 0 });
  }
  // ---- the far arm: a pauldron, a bone arm, the steel vambrace, a gauntlet on the lid's edge
  // ONE BODY (the joint kit): the bone limbs are welded tubes, the steel on them wrapped over the bone
  const BID = px.body(1);
  px.limb([sF, eF, hdF], [1.5, 1.7, 1.6], BONE, 2, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.9, hdF[0], hdF[1], 1.6, STEEL_D, 2.01, { bias: -1, wrap: true });
  px.ellipse(hdF[0], hdF[1], 1.7, 1.6, STEEL_D, 2.05, { bias: -1, weld: 1.5 });

  // ---- legs: bone, a steel greave over the shin, a bronze-capped knee, a long sabaton
  for (const [hp, kn, an, z, b, st] of [[hF, kF, anF, 3, -1, STEEL_D], [hN, kN, anN, 4, 0, STEEL]]) {
    px.limb([hp, kn, an], [1.7, 2.2, 2.0], BONE, z, { bias: b });
    px.capsule(kn[0], kn[1], 2.4, an[0], an[1], 2.0, st, z + 0.01, { bias: b, wrap: true });
    px.ellipse(kn[0] + 0.3, kn[1], 2.6, 2.5, st, z + 0.02, { bias: b, weld: 2 });
    px.dot(kn[0] + 1, kn[1] - 0.4, BRONZE, z + 0.05, { fix: 2 });
    px.capsule(an[0] - 0.6, an[1] + 0.8, 1.6, an[0] + 5.6, an[1] + 1, 1.5, st, z, { bias: b, weld: 1.5 });
  }
  px.body(0);

  // ---- the skirt of lames and the rotten tabard strip, its hem a beat behind
  px.part(); const skid = px._pid;
  px.poly([[P[0] - 6.4, P[1] - 2.2], [P[0] + 6.2, P[1] - 2.2], [P[0] + 6.8, P[1] + 4.2], [P[0] + 3, P[1] + 4.6], [P[0] + 1.2, P[1] + 3.4], [P[0] - 0.4, P[1] + 4.6], [P[0] - 2, P[1] + 3.4], [P[0] - 3.8, P[1] + 4.4], [P[0] - 6.8, P[1] + 3.4]], STEEL_D, 5, { round: 0.75, floor: 1 });
  for (const y of [P[1] - 0.2, P[1] + 1.8]) px.line(P[0] - 6, y, P[0] + 6, y + 0.1, STEEL, 5.1, { fix: 0 });
  for (const x of [-3.2, 0, 3.2]) px.dot(P[0] + x, P[1] - 1.2, BRONZE, 5.15, { fix: 2 });
  px.part();
  px.poly([[P[0] + 0.2, P[1] + 2], [P[0] + 3.2, P[1] + 2], [P[0] + 3.8 - vx, P[1] + 9.4], [P[0] + 2.2 - vx * 1.4, P[1] + 8], [P[0] + 1.2 - vx, P[1] + 10], [P[0] - 0.2 - vx, P[1] + 8.4]], ROT, 5.2, { round: 0.8, floor: 1 });

  // ---- the spine and the breastplate, stove in over the heart
  px.body(1);
  px.capsule(...at(0.04, -4), 1.1, ...at(1.04, -3), 1.1, BONE, 3.9, { bias: -1 });
  px.capsule(...at(-0.1, 0.4), 1.2, N[0], N[1] + 2, 1, BONE, 4.05, { weld: 1.5 });
  px.body(0); px.part(); const bid = px._pid;
  const rw = 6.6;
  px.poly([at(-0.04, -rw + 0.2), at(-0.04, rw - 0.4), at(0.3, rw + 0.6), at(0.7, rw - 0.4), at(0.84, 0.4), at(0.62, -rw + 0.6)], STEEL, 5.5, { round: 0.65, floor: 1, edge: true });
  px.line(...at(0.1, -rw + 1.6), ...at(0.78, -rw + 1.2), STEEL, 5.52, { fix: 4 });
  // the hole: dark ribs and witch-fire behind
  px.part();
  { const h = at(0.4, 0.8); px.ellipse(h[0], h[1], 2.6, 3.0, HOLE, 5.6, { noLine: true });
    px.line(h[0] - 2, h[1] - 1.4, h[0] + 2, h[1] - 1.2, BONE, 5.65, { fix: 1 }); px.line(h[0] - 2, h[1] + 0.4, h[0] + 2, h[1] + 0.6, BONE, 5.65, { fix: 1 });
    px.dot(h[0] + 0.4, h[1] + 1.8, F_TEAL, 5.7, { noLine: true }); px.dot(h[0] - 0.6, h[1] - 0.4, F_TEAL, 5.7, { noLine: true }); px.dot(h[0] + 0.4, h[1] + 0.6, F_PALE, 5.72, { noLine: true }); }
  px.part();
  for (const [t, s] of [[0.12, -3.6], [0.5, -4.2], [0.74, 3.4], [0.22, 2.6]]) px.dot(...at(t, s), VERD, 5.8, { fix: 1 });
  for (const [t, s] of [[0.1, -4.4], [0.12, 4.2], [0.78, -4], [0.76, 4]]) px.dot(...at(t, s), BRONZE, 5.8, { fix: 2 });
  px.line(...at(0.02, -rw + 0.4), ...at(0.02, rw - 0.4), STEEL_D, 5.85, { fix: 0 });
  // drowned weed hung from the shoulders
  px.part();
  px.poly([at(0.02, -rw - 1), at(0.14, -rw - 2.6), at(0.52, -rw - 3 - vx), at(0.7, -rw - 1.2 - vx * 1.4), at(0.4, -rw + 0.4)], WEED, 6.1, { round: 0.7, floor: 1 });

  // ---- the far pauldron, then the skull in its bascinet
  px.part(); px.ellipse(sF[0] - 0.4, sF[1] - 0.4, 3.8, 3.0, STEEL_D, 5.9, { floor: 1 }); px.line(sF[0] - 3, sF[1] + 0.4, sF[0] + 2.4, sF[1] + 0.6, STEEL, 5.95, { fix: 0 });
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  px.part();
  px.stamp(p.snarl > 0.5 ? SNARL : SKULL, hx + 1, hy - 1, p.eye > 0.5 ? LEG_HOT : LEG, 6, { ax: 5, ay: 8, ball: [5.5, 5.2, 5.8, 5.6], cast: 1 });

  // ---- the near arm over all: pauldron, bone arm, vambrace, and the mace
  px.body(1); px.tag("nearArm");
  px.limb([[sN[0], sN[1] + 0.6], eN, hdN], [1.8, 1.8, 1.7], BONE, 7.9, { weld: 1.5, weldRoot: 3 });
  px.capsule(eN[0], eN[1], 2.0, hdN[0], hdN[1], 1.7, STEEL, 7.95, { wrap: true });
  px.ellipse(hdN[0], hdN[1], 1.8, 1.7, STEEL, 8.4, { weld: 1.5 });
  px.tag(null);
  px.body(0);
  px.part();
  px.capsule(...at2(-3.4, 0), 0.9, ...at2(11, 0), 0.9, HAFT, 8.1);
  px.ellipse(...at2(-3.8, 0), 1.2, 1.2, BRONZE, 8.12, { fix: 2 });
  // the flanged head: a core with flanges standing off it
  const hc = at2(13.4, 0);
  px.part();
  px.ellipse(hc[0], hc[1], 2.6, 2.6, IRON, 8.2);
  for (const a of [0, 1.05, 2.1, 3.15, 4.2, 5.25]) { const q = a + ma; px.line(hc[0] + Math.cos(q) * 2.2, hc[1] + Math.sin(q) * 2.2, hc[0] + Math.cos(q) * 4.4, hc[1] + Math.sin(q) * 4.4, IRON, 8.25, { fix: a === 0 ? 4 : 2 }); }
  px.dot(hc[0] - 0.6, hc[1] - 0.6, STEEL, 8.3, { fix: 4 });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] - 0.2, 4.2, 3.4, STEEL, 8.5, { floor: 1 });
  px.line(sN[0] - 3, sN[1] + 0.6, sN[0] + 2.6, sN[1] + 0.9, STEEL_D, 8.55, { fix: 0 }); px.dot(sN[0] - 0.4, sN[1] - 1.6, STEEL, 8.6, { fix: 4 });
  const heart = at(0.4, 0.8);
  return { light: { x: heart[0], y: heart[1], r: 16, col: "#7ce0b8", k: 0.22 } };
};

export const fx = () => {};

const GUARD = { drop: 0.9, lean: 0.1, hx: 0.5, hy: 0, aN: [0.9, 0.8, 0], aF: [1.05, 0.9, 0], fN: [-2.6, 0], fF: [2.8, 0], wrist: 0.2, snarl: 0, eye: 0 };
const march = (ph) => walkPose(ph, { stride: 4.0, lift: 2.0, swing: 0.1, bob: 0.9, lean: 0.1 });
export const CLIPS = {
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b; return { ...GUARD, rise: 0.4 * u, drop: 0.9 + 0.3 * (1 - u), wrist: 0.2 + 0.05 * b, aN: [0.9 + 0.04 * b, 0.8, 0], eye: ph > 0.74 && ph < 0.8 ? 1 : 0 }; },
  },
  // a heavy tread: the lid carried before him, the mace riding the shoulder
  walk: {
    n: 8, ms: 1120, loop: true, lag: 0.09,
    pose: (ph) => { const w = march(ph), a = Math.cos(ph * TAU); return { ...GUARD, ...w, drop: w.drop + 0.6, hx: 0.7, hy: 0.3 * a, aN: [0.9 + 0.06 * a, 0.8, 0], aF: [1.05 - 0.04 * a, 0.9, 0], wrist: 0.2 + 0.12 * a }; },
  },
  // the near arm lifts up the FRONT, the forearm cocked beside the back of the helm with the mace lying back behind
  // it, then thrown over and down
  attack: {
    n: 14, ms: 1000, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.22, e: "out", p: { ...GUARD, rx: -1, drop: 1.2, lean: 0.02, twist: -0.3, aN: [1.5, 0.84, 0], aF: [1.15, 0.9, 0], wrist: 0.35 } },
      { t: 0.4, e: "io", p: { ...GUARD, rx: -2.4, drop: 1.8, lean: -0.14, twist: -0.8, hx: 0.6, hy: -0.2, aN: [3.5, 0.95, 0], aF: [1.0, 0.9, 0], wrist: 0.35, fN: [-3.2, 0], fF: [3.2, 0], eye: 1 } },
      { t: 0.47, e: "out", p: { ...GUARD, rx: 0.4, drop: 1.8, lean: 0.1, twist: 0.1, hx: 0.8, aN: [1.8, 0.95, 0], aF: [0.9, 0.9, 0], wrist: 0.2, fF: [4, 0], eye: 1 } },
      { t: 0.55, e: "in3", p: { ...GUARD, rx: 3, drop: 2.2, lean: 0.46, twist: 0.7, hx: 2.2, hy: 0.8, aN: [0.7, 1, 0], aF: [0.9, 0.9, 0], wrist: 0.35, fF: [7, 0], snarl: 1, eye: 1 } },
      { t: 0.66, e: "out", p: { ...GUARD, rx: 3.6, drop: 2.4, lean: 0.52, twist: 0.8, hx: 2.6, hy: 1, aN: [0.4, 1, 0], aF: [0.8, 0.9, 0], wrist: 0.1, fF: [7.4, 0], snarl: 1, eye: 1 } },
      { t: 0.86, e: "io", p: { ...GUARD, rx: 1.2, drop: 1.0, lean: 0.24, aN: [0.6, 0.9, 0], wrist: 0.1 } },
      { t: 1, e: "out", p: GUARD },
    ], ph),
  },
};
