// ============ FIGURE: the Knights Errant ============
// The Knight Garrison's second path (CLAUDE.md "Knights Errant replace the Berserker path"):
// gunmetal plate, a forest-green surcoat with a brass chevron on the breast, a green kite
// shield with a brass chevron, brass at the brow, the belt and the hinge, a closed bascinet
// whose pointed visor (a hound's snout) is pushed up over the brow so the face reads, and a
// tall off-white plume streaming back. Heavier than the garrison knight: darker plate, a
// longer plume, and a slow heavy cut. Same skeleton and clips as the garrison (fig-garrison.js).
// Clips: idle (guard, breathing), walk (sword on the shoulder), attack (wind-up over the
// shoulder, a cut, follow-through, back to guard). The blow's `hit` is 0.5.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN, scaled } from "./rig.js";
import { stampFace } from "./bowlayers.js";
import { SKIN, HAIR, LEATHER, EYE, BLADE, CLIPS as GCLIPS, fx as gfx, swordAngle, KZ } from "./fig-garrison.js";

const PLATE = mat("#68738a", { contrast: 1.2 }), MAIL = mat("#474f5e", { contrast: 1.1 }), BRASS = mat("#c9a24a", { contrast: 1.2 });
const GREEN = mat("#2f6b3f", { contrast: 1.15 }), GREENK = mat("#1f4a2c"), PLUME = mat("#e8e2d0", { contrast: 1.2 });

// the head: M plate, W its glint, m a band down, G the brass browband, V the raised visor's
// snout, c mail, S skin, s skin a tone down, E eye, e shut, N nose, b brow, l lips
const HEAD = [
  ".....MMMM....",
  "...MMWMMMM...",
  "..MMWMMMMMM..",
  ".MMWMMMMMMMM.",
  ".GGGGGGGGGGGV",
  ".cMsbbssbbsVV",
  ".cMSSESSSESV.",
  ".cmSSESSSESN.",
  ".cmSSSSSSSSN.",
  ".ccmSSSSSSS..",
  "..ccmSSSll...",
  "..cccccc.....",
];
const BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
const LEG = {
  M: { m: PLATE }, W: { m: PLATE, bias: 1 }, m: { m: PLATE, bias: -1 }, G: { m: BRASS, fix: 3 }, V: { m: PLATE, bias: 1 }, c: { m: MAIL },
  S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, E: { m: EYE }, b: { m: HAIR, fix: 2 }, l: { m: SKIN, fix: 0 },
};

// the near arm may pass in front of the head, never behind it (the garrison's rules: fig-garrison.js, "THE GRIP")
export const MUST = [["nearArm", "notOver", "eyes"]];
export const BOX = { w: 84, h: 74, ox: 34, oy: 62 };
export const BONES = scaled(HUMAN, 1.02, { shN: -3.1, shF: 3.1, hipN: -1.35, hipF: 1.55, neck: 1.4 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const plateLeg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.5, k[0], k[1], 2.1, PLATE, z, { bias: b });
  px.capsule(k[0], k[1], 2.0, an[0], an[1], 1.7, PLATE, z, { bias: b });
  px.ellipse(k[0] + 0.6, k[1], 2.0, 1.9, PLATE, z + 0.02, { bias: b, vb: 0.25 });
  px.dot(k[0] + 1.2, k[1] - 0.2, BRASS, z + 0.04, { bias: b, fix: 3 });
  px.ellipse(an[0] + 1.2, an[1] + 0.9, 2.8, 1.4, MAIL, z + 0.03, { bias: b });
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, kN, kF, hN, hF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5);
  const sway = p.sway || 0;

  // the far arm and its green kite shield, a brass chevron across it
  px.part();
  px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 2.0, PLATE, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.0, hdF[0], hdF[1], 1.8, PLATE, 1, { bias: -1 });
  const sx = hdF[0] * 0.7 + eF[0] * 0.3 + 0.8, sy = hdF[1] * 0.7 + eF[1] * 0.3 + 0.6, tl = p.shield ?? 0.08, cs = Math.cos(tl), sn = Math.sin(tl);
  const S = (x, y) => [sx + x * cs - y * sn, sy + x * sn + y * cs];
  px.part();
  px.poly([S(-4.7, -6.3), S(4.7, -6.3), S(5, 0.6), S(0, 8.2), S(-5, 0.6)], BRASS, 3.5, { round: 0.6, cast: 2 });
  px.poly([S(-3.6, -5.2), S(3.6, -5.2), S(3.8, 0.3), S(0, 6.5), S(-3.8, 0.3)], GREEN, 3.52, { round: 0.6 });
  px.line(...S(-3, -2.4), ...S(0, 1), BRASS, 3.55); px.line(...S(0, 1), ...S(3, -2.4), BRASS, 3.55);
  px.dot(...S(0, 3.4), BRASS, 3.56, { fix: 3 });

  plateLeg(px, hF, kF, anF, 2, -1);
  plateLeg(px, hN, kN, anN, 3, 0);

  // the body: a gunmetal breastplate, the green surcoat to the knee (a brass chevron, brass
  // piping down the front edge), the belt
  px.part();
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 5, C[1] - 1.6], [C[0] + 6, C[1] + 3.5], [P[0] + 4.8, P[1] - 2.6], [P[0] - 4.8, P[1] - 2.6], [C[0] - 6, C[1] + 3.5]], PLATE, 4, { round: 0.92, ny: -0.12, cast: 2 });
  const hy = P[1] + 4.8, hemB = P[0] - 5.9 - vx * 1.2, hemF = P[0] + 5.7 - vx * 0.8;
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 3.7, C[1] - 1.2], [C[0] + 3.9, C[1] - 1.2], [C[0] + 5, C[1] + 3.3], [P[0] + 4.7, P[1] - 2.6], [hemF, hy], [hemF - 2.4, hy + 0.9], [P[0] + 0.4 - vx, hy], [hemB + 2.6, hy + 0.9], [hemB, hy], [P[0] - 4.7, P[1] - 2.6], [C[0] - 5, C[1] + 3.3]], GREEN, 4.2, { round: 0.9, cast: 2 });
  px.toneLine(P[0] + 0.8, P[1] - 1, P[0] + 0.6 - vx, hy - 0.6, -1, coat);
  px.line(hemB + 1, hy - 0.6, hemF - 1, hy - 0.6, GREENK, 4.22);
  px.line(C[0] - 2.2, C[1] + 0.4, C[0] + 0.8, C[1] + 3, BRASS, 4.25); px.line(C[0] + 0.8, C[1] + 3, C[0] + 4, C[1] + 0.4, BRASS, 4.25);
  px.line(C[0] + 4.1, C[1] + 1.2, P[0] + 4.5, P[1] - 3.4, BRASS, 4.23);
  px.poly([[P[0] - 4.8, P[1] - 3.4], [P[0] + 4.7, P[1] - 3.4], [P[0] + 4.8, P[1] - 1.6], [P[0] - 4.9, P[1] - 1.6]], LEATHER, 4.3, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3.4, 2, 1.8, BRASS, 4.32, { fix: 3 });
  px.line(C[0] - 2.4, C[1] - 1.2, C[0] + 3.4, C[1] - 1.2, BRASS, 4.3);

  // the head, its tall plume rooted on the crown and streaming back a beat behind
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  const Z0 = KZ({}).head;   // the plume sits just over the helm, UNDER the near arm and the sword
  const pl = cl(vx * 2 + vx2 * 1.5, -3, 3) - sway * 0.5, rx0 = hx + 0.5, ry0 = hyy - 10;
  px.part();
  px.capsule(rx0, ry0 - 0.5, 1.4, rx0 - 1.2 - pl * 0.3, ry0 - 3.4, 1.9, PLUME, Z0 + 0.02);
  px.capsule(rx0 - 1.2 - pl * 0.3, ry0 - 3.4, 1.9, rx0 - 4 - pl * 0.8, ry0 - 3.8 + Math.abs(pl) * 0.2, 1.7, PLUME, Z0 + 0.02);
  px.capsule(rx0 - 4 - pl * 0.8, ry0 - 3.8 + Math.abs(pl) * 0.2, 1.7, rx0 - 7.4 - pl * 1.3, ry0 - 1.4 + Math.abs(pl) * 0.4, 1.0, PLUME, Z0 + 0.02);
  px.part();
  const Z = KZ({});
  stampFace(px, p.blink ? BLINK : HEAD, hx, hyy, LEG, Z.head, Z.head, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 2 }, "SsNEelb");

  // the sword through the near fist (sw: the blade's angle from upright, + toward the foe)
  const a = swordAngle(sk), d = [Math.sin(a), -Math.cos(a)], nrm = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t + nrm[0] * s, hdN[1] + d[1] * t + nrm[1] * s];
  px.part();
  const bz = Z.sword;
  px.tag("sword");
  px.capsule(...B(2.5), 1.25, ...B(14.5), 1.05, BLADE, bz, { edge: true });
  px.capsule(...B(14.5), 1.05, ...B(16.8), 0.3, BLADE, bz, { edge: true });
  px.part();
  px.capsule(...B(-3), 0.9, ...B(1), 0.9, LEATHER, bz + 0.02);
  px.capsule(...B(1.8, -2.8), 0.8, ...B(1.8, 2.8), 0.8, BRASS, bz + 0.05, { edge: true });
  px.ellipse(...B(-3.6), 1.15, 1.15, BRASS, bz + 0.05);
  px.tag(null);

  // the near arm over it all: a brass-edged pauldron, vambrace, gauntlet on the grip
  const az = Z.arm;
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.5, 2.2, eN[0], eN[1], 2.0, PLATE, az, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.0, hdN[0], hdN[1], 1.8, PLATE, az, { cast: 2 });
  px.ellipse(eN[0], eN[1], 1.7, 1.7, PLATE, az + 0.02, { vb: 0.25 });
  px.part(); px.tag(null);
  px.ellipse(sN[0] - 0.2, sN[1] - 0.4, 3.6, 3.1, PLATE, 8.1, { cast: 2 });
  px.line(sN[0] - 2.9, sN[1] + 2.1, sN[0] + 2.5, sN[1] + 2.1, BRASS, 8.12);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.7, 2.2, MAIL, az + 0.2, { rot: -a });

  return { hand: hdN, sw: a };
};

export const fx = gfx;
export const CLIPS = GCLIPS;
