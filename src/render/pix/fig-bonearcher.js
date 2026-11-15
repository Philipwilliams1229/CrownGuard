// ============ FIGURE: the Barrow Archer (the Hollow Court's bowman, game type `bonearcher`) ============
// Risen kin: the same drowned bones (skull with witch-fire teal in its sockets, a thin spine
// and rib cage, knobbed knees) a head shorter than a man, but hooded in a rag of grey-green
// cloth, a ragged mantle over the shoulders and a yew bow of black wood in the far hand, its
// string frayed white. A bone-fletched quiver on the back. Facing +x, a quarter turned.
// He stands and shoots (the game halts him in reach), so the `shoot` clip is the weapon:
// nock, draw to the cheek, loose, the string hand flying back, reach for the next arrow.
// Clips: idle, walk (8 frames, the bow held low and ready), shoot (14 frames).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, ik, solve, scaled, HUMAN } from "./rig.js";
import { bowZ, stampFace, drawLimbs } from "./bowlayers.js";

const BONE = mat("#e0d8c4"), RAG = mat("#4a5a50", { contrast: 0.9 }), RAG2 = mat("#3a4640", { contrast: 0.9 });
const YEW = mat("#4a3018", { contrast: 1.2 }), GRIP = mat("#6a4c34"), DARKM = mat("#3a3228"), IRON = mat("#9a968a", { contrast: 1.2 });
const GAP = flat("#6a604c"), SOCK = flat("#15121a"), EYE = flat("#7ce0b8", { emis: true });
const STRING = flat("#e8e2cc", { line: "#6a604c" }), STREAK = flat("#e8fff4", { emis: true, line: "#7ce0b8" });
const FLETCH = mat("#cfcab4");

// The skull, as the Risen's (shared bones), a quarter turned. The hood covers its crown.
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
// the loose: the jaw dropped a row on the breath out
const SNARL = SKULL.map((r, i) => ({ 7: "...sTTTTT..", 8: "....jTjTj..", 9: ".....jjjj.." })[i] ?? r);
const LEG = { S: { m: BONE }, s: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 }, N: { m: BONE, fix: 1 }, e: { m: SOCK }, E: { m: EYE } };

// the layer rules (bowlayers.js), checked at every aim by scripts/pix-audit.mjs: nothing of the weapon is drawn across
// the face, and the string arm never covers the eyes
export const MUST = [["string", "notOver", "face"], ["arrow", "notOver", "face"], ["bowUpper", "notOver", "face"], ["bowLower", "notOver", "face"], ["bowGrip", "notOver", "face"], ["nearArm", "notOver", "eyes"], ["nearHand", "notOver", "eyes"]];
export const BOX = { w: 64, h: 58, ox: 26, oy: 52 };
export const BONES = scaled(HUMAN, 0.94, { shN: -2.1, shF: 2.3 });

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- the aim (art/briefs/aim-contract.md) -------------------------------------------------
// "<variant>@<deg>": the shot's angle in his own frame (0 level, + down the screen). While a clip's
// `aw` (aim weight) is up, the bow and both arms turn RIGIDLY about the bow shoulder `sF`; the string
// hand is re-solved from its own shoulder so the elbow still folds the same way. aw 0 = no change.
const RAD = Math.PI / 180;
const rotAbout = (pv, q, deg) => { const a = deg * RAD, c = Math.cos(a), s = Math.sin(a), x = q[0] - pv[0], y = q[1] - pv[1]; return [pv[0] + x * c - y * s, pv[1] + x * s + y * c]; };
const aimed = (sk, deg) => {
  const w = sk.p.aw || 0, d = deg * w;
  if (!d) return sk;
  const r = (q) => rotAbout(sk.sF, q, d), eF = r(sk.eF), hdF = r(sk.hdF), tgt = r(sk.hdN), want = r(sk.eN);
  // the upper body turns into the shot about the bow shoulder (so the pivot stays put): the chest and head lean up to
  // 8 degrees, the near shoulder swings round with the aim so the string arm has the reach to stay on the string
  const lean = d * (8 / 70), tw = d * 0.45 + lean, sN = rotAbout(sk.sF, sk.sN, tw), C = rotAbout(sk.sF, sk.C, lean), N = rotAbout(sk.sF, sk.N, lean);
  const a = ik(sN[0], sN[1], tgt[0], tgt[1], BONES.upper, BONES.fore, 1), b = ik(sN[0], sN[1], tgt[0], tgt[1], BONES.upper, BONES.fore, -1);
  const pick = Math.hypot(a.mid[0] - want[0], a.mid[1] - want[1]) <= Math.hypot(b.mid[0] - want[0], b.mid[1] - want[1]) ? a : b;
  return { ...sk, eF, hdF, sN, C, N, eN: pick.mid, hdN: pick.end, aimRad: d * RAD };
};
// the engine's muzzle at aim 0: the bow hand at the frame the shot is loosed on (the pivot is the bow shoulder)
const aimAt = (clip, hit) => { const f = Math.round(hit * (clip.n - 1)), s = solve(clip.pose(f / (clip.n - 1)), BONES); return { pivot: [s.sF[0], s.sF[1]], muzzle: [s.hdF[0], s.hdF[1]] }; };

export const draw = (px, { sk: sk0, lag1, lag2 }, o = {}) => {
  const aim = Number((o.variant || "").split("@")[1]) || 0, sk = aimed(sk0, aim);
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(N[0] - lag1.N[0], -2, 2), vx2 = cl(lag1.N[0] - lag2.N[0], -2, 2);
  const Z = bowZ(p, aim * (p.aw || 0));                                            // the shared layer order for this pose and aim (bowlayers.js)
  const u = (() => { const dx = P[0] - C[0], dy = P[1] - C[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; })();
  const fw = [u[1], -u[0]], L = Math.hypot(P[0] - C[0], P[1] - C[1]);
  const at = (t, s) => [C[0] + u[0] * L * t + fw[0] * s, C[1] + u[1] * L * t + fw[1] * s];

  // ---- the quiver on his back, bone-fletched shafts standing out of it
  const q0 = [C[0] - 2.4, C[1] + 6.4], q1 = [C[0] - 5.6, C[1] - 2];
  px.tag("quiver"); px.part();
  px.capsule(q0[0], q0[1], 1.8, q1[0], q1[1], 1.8, DARKM, Z.quiver);
  px.line(q1[0] - 1.6, q1[1] + 0.8, q1[0] + 1.6, q1[1] - 0.4, IRON, Z.quiver + 0.02, { fix: 3 });
  px.part();
  for (const dx of [-0.9, 1.1]) px.capsule(q1[0] + dx - 0.4, q1[1] - 1.6, 0.8, q1[0] + dx - 1.2, q1[1] - 4, 0.7, FLETCH, Z.quiver - 0.02);

  // ---- the far arm (the bow arm), a tone down
  px.tag("farArm"); px.part();
  px.capsule(sF[0], sF[1], 1.1, eF[0], eF[1], 1, BONE, Z.farArm, { bias: -1 });
  px.capsule(eF[0], eF[1], 1, hdF[0], hdF[1], 0.9, BONE, Z.farArm, { bias: -1 });
  px.ellipse(eF[0], eF[1], 1.3, 1.3, BONE, Z.farArm + 0.02, { bias: -1 });

  // ---- the bow: two limbs sprung from the grip; bw tilts it (+ top toward the foe)
  const bw = (p.bow ?? 0.25) + (sk.aimRad || 0), dr = p.draw || 0, cs = Math.cos(bw), sn = Math.sin(bw);
  const R = (x, y) => [hdF[0] + x * cs - y * sn, hdF[1] + x * sn + y * cs];
  const flex = dr * 1.7;
  const top = R(-2.6 - flex, -12 + flex * 0.4), bot = R(-2.6 - flex, 12 - flex * 0.4);
  drawLimbs(px, R, { g: 1.6, rg: 1.05, mid: [0.9, 6.4], rm: 0.95, tip: [-2.6 - flex, 12 - flex * 0.4], rt: 0.6, gripR: 1.2, gripHalf: 1.8 }, YEW, GRIP, Z);
  px.tag("farHand"); px.part(); px.ellipse(hdF[0], hdF[1], 1.4, 1.3, BONE, Z.farHand, { bias: -1 });

  // ---- legs: thigh and shin bones, a knobbed knee, a long foot
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, Z.legFar, -1], [hN, kN, anN, Z.legNear, 0]]) {
    px.tag(b < 0 ? "legFar" : "legNear"); px.part();
    px.capsule(hp[0], hp[1], 1, kn[0], kn[1], 0.85, BONE, z, { bias: b });
    px.capsule(kn[0], kn[1], 0.85, an[0], an[1], 0.8, BONE, z, { bias: b });
    px.ellipse(kn[0] + 0.2, kn[1], 1.25, 1.2, BONE, z + 0.02, { bias: b });
    px.capsule(an[0] - 0.4, an[1] + 0.7, 0.9, an[0] + 3.4, an[1] + 0.9, 0.7, BONE, z, { bias: b });
  }

  // ---- the pelvis, a tattered clout, the spine and rib cage
  px.tag("torso"); px.part();
  px.ellipse(P[0] - 0.2, P[1] - 0.4, 3.6, 2.2, BONE, Z.torso, { floor: 1 });
  px.part();
  px.poly([[P[0] - 4, P[1] - 1.4], [P[0] + 4, P[1] - 1.4], [P[0] + 4.2, P[1] + 4], [P[0] + 2.4, P[1] + 3], [P[0] + 0.8, P[1] + 5.4], [P[0] - 0.6, P[1] + 3.4], [P[0] - 2.6, P[1] + 5], [P[0] - 3.2, P[1] + 3], [P[0] - 4.4 - vx * 1.2, P[1] + 4.6]], RAG2, Z.torso + 0.4, { round: 0.8, floor: 1 });
  px.part();
  px.capsule(...at(0.04, -3.4), 0.9, ...at(1.04, -2.6), 0.9, BONE, Z.torso - 0.1, { bias: -1 });
  px.part();
  const rw = 4;
  px.poly([at(-0.1, -rw + 0.4), at(-0.1, rw - 0.2), at(0.3, rw + 0.2), at(0.62, rw - 1), at(0.74, 0.4), at(0.5, -rw + 1)], BONE, Z.torso + 0.1, { round: 0.7, floor: 1 });
  for (const t of [0.1, 0.26, 0.42, 0.58]) px.line(...at(t, -rw + 0.6), ...at(t + 0.03, rw - 0.8 - t * 1.4), GAP, Z.torso + 0.2);
  px.part();
  px.capsule(...at(-0.1, 0.4), 1.2, N[0], N[1] + 2, 1, BONE, Z.torso + 0.05, {});

  // ---- the ragged mantle over the shoulders, its points swinging a beat behind
  {
    const sw = cl(-vx * 1.2 - vx2 * 1.0, -2, 2);
    px.tag("cape"); px.part();
    px.poly([[C[0] - 5.2, C[1] - 2.2], [C[0] + 4.6, C[1] - 2.2], [C[0] + 5.6, C[1] + 1.8], [C[0] + 3, C[1] + 3.6], [C[0] + 1, C[1] + 2.2], [C[0] - 1, C[1] + 4.6 + sw * 0.3], [C[0] - 3, C[1] + 2.8], [C[0] - 5, C[1] + 6.4 + sw * 0.5], [C[0] - 6.4 + sw, C[1] + 3]], RAG, Z.cape, { round: 0.85, cast: 1, floor: 1 });
    px.line(C[0] + 4, C[1] - 1, C[0] + 3, C[1] + 2.6, RAG2, Z.cape + 0.05, { fix: 0 });
  }

  // ---- the head, and the hood over its crown (its tail trailing a beat behind)
  const hx = Math.round(N[0]), hy = Math.round(N[1]), tp = cl(vx * 2 + vx2 * 1.4, -2, 3);
  px.tag("head"); px.part();
  px.poly([[hx - 5.4, hy - 0.4], [hx - 6, hy - 6], [hx - 3, hy - 10.8], [hx + 2, hy - 12], [hx + 6.6, hy - 9.6], [hx + 4, hy - 4], [hx - 0.6, hy + 0.6]], RAG2, Z.hoodTail, { round: 0.8, bias: -1, floor: 1 });
  px.part();
  stampFace(px, p.snarl > 0.5 ? SNARL : SKULL, hx + 1, hy - 1, LEG, Z.hood, Z.face, { ax: 5, ay: 9, ball: [5.5, 4.5, 5.5, 5.2], cast: 1 }, "SsTjNeE", "E", Math.max(Z.face, Z.nearArm, Z.nearHand) + 0.75);
  px.tag("cowl");
  px.part();
  // the cowl: over the crown to a brow line, a long point trailing behind
  px.poly([[hx - 5.2, hy - 1], [hx - 6 - tp * 0.3, hy - 6.4], [hx - 3.4, hy - 10.8], [hx + 1.4, hy - 12.4], [hx + 6.8, hy - 10], [hx + 7, hy - 7.6], [hx + 3, hy - 8.4], [hx - 0.4, hy - 8], [hx - 3, hy - 4.4], [hx - 3.6, hy - 0.4]], RAG, Z.face + 0.5, { round: 0.8, cast: 1, floor: 1 });
  px.poly([[hx - 5.4, hy - 4], [hx - 9 - tp, hy - 2.4 + Math.abs(tp) * 0.3], [hx - 11.6 - tp * 1.4, hy + 1.6], [hx - 7.6 - tp * 0.6, hy + 0.4], [hx - 5, hy + 2.4]], RAG, Z.face + 0.4, { round: 0.7, floor: 1 });

  // ---- the string (through the near fingers once he draws) and the arrow on it
  const nock = dr > 0.12 ? hdN : null;
  px.tag("string"); px.part();
  if (nock) { px.line(top[0], top[1], nock[0], nock[1], STRING, Z.string, { unlit: true }); px.line(nock[0], nock[1], bot[0], bot[1], STRING, Z.string, { unlit: true }); }
  else px.line(top[0], top[1], bot[0], bot[1], STRING, Math.min(Z.bowUpper, Z.bowLower) - 0.5, { unlit: true });   // unheld: in the bow's plane, under its limbs
  if (p.arrow > 0.5) {
    const a0 = nock || R(-2.6, 0), ar = sk.aimRad || 0, ax = hdF[0] + 0.6 * Math.cos(ar) + 0.8 * Math.sin(ar) - a0[0], ay = hdF[1] + 0.6 * Math.sin(ar) - 0.8 * Math.cos(ar) - a0[1], l = Math.hypot(ax, ay) || 1, ux = ax / l, uy = ay / l, Ln = Math.max(l + 3.5, 14);
    px.tag("arrow"); px.part();
    px.line(a0[0], a0[1], a0[0] + ux * Ln, a0[1] + uy * Ln, DARKM, Z.arrow, { fix: 3 });
    px.capsule(a0[0] + ux * Ln, a0[1] + uy * Ln, 0.9, a0[0] + ux * (Ln + 2.2), a0[1] + uy * (Ln + 2.2), 0.4, IRON, Z.arrow + 0.02);
    px.capsule(a0[0] + ux * 0.6, a0[1] + uy * 0.6 - 0.6, 0.9, a0[0] + ux * 2.8, a0[1] + uy * 2.8 - 0.6, 0.7, FLETCH, Z.arrow + 0.02);
  }

  // ---- the near arm over all: bony, a rag of cuff at the wrist
  px.tag("nearArm"); px.part();
  px.capsule(sN[0], sN[1] + 0.6, 1.2, eN[0], eN[1], 1.05, BONE, Z.nearArm - 0.1, { cast: 1 });
  px.capsule(eN[0], eN[1], 1.05, hdN[0], hdN[1], 0.95, BONE, Z.nearArm - 0.1, { cast: 1 });
  px.ellipse(eN[0] + 0.2, eN[1], 1.5, 1.4, BONE, Z.nearArm - 0.05);
  px.tag("nearHand"); px.part();
  px.ellipse(hdN[0], hdN[1], 1.5, 1.4, BONE, Z.nearHand);
  px.tag("nearArm"); px.part();
  px.ellipse(sN[0] - 0.2, sN[1], 1.7, 1.6, BONE, Z.nearArm, { floor: 1 });
  px.tag(null);
  return { bowHand: hdF, marks: { muzzle: [hdF[0], hdF[1]] } };
};

// the arrow in flight, a short streak behind it (the game flies the real one; this is for the lab)
export const fx = () => {};

const READY = { drop: 0.8, lean: 0.1, hx: 0.5, hy: 0.2, aF: [0.78, 0.78, 0], bow: 0.32, aN: [0.5, 0.8, 0], draw: 0, arrow: 0, fN: [-2.2, 0], fF: [2.4, 0], snarl: 0 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1700, loop: true, lag: 0.09,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), u = 0.5 + 0.5 * b; return { ...READY, rise: 0.5 * u, drop: 0.8 + 0.4 * (1 - u), aF: [0.78, 0.78 - 0.03 * u, 0], bow: 0.32 + 0.03 * b, hy: 0.2 + 0.2 * b }; },
  },
  // a stiff shamble, the bow held low in one fist
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.09,
    pose: (ph) => { const w = walkPose(ph, { stride: 4.4, lift: 2.6, swing: 0.28, bob: 1.0, lean: 0.14 }), a = Math.cos(ph * Math.PI * 2); return { ...w, drop: w.drop + 0.7, hy: 0.3 * a, aF: [0.64 + 0.1 * a, 0.78, 0], bow: 0.5 + 0.08 * a, aN: [-a * 0.28 + 0.1, 0.9, 0], draw: 0, arrow: 0 }; },
  },
  shoot: {
    n: 14, ms: 1000, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      // (the first and last keys name aw 0: a key with none inherits its neighbour's, so the last frames stayed turned toward the aim)
      { t: 0, p: { ...READY, aw: 0, arrow: 1 } },
      // raise the bow, the nock to the string
      { t: 0.14, e: "io", p: { aw: 0.4, ...READY, aF: [1.1, 0.88, 0], bow: 0.1, aN: [1.25, 0.58, 0], draw: 0.15, arrow: 1, twist: -0.2, lean: 0.06, drop: 0.6 } },
      // the draw, the arm back to the cheek
      { t: 0.4, e: "out", p: { aw: 1, ...READY, rx: -0.6, drop: 0.5, lean: -0.04, twist: -0.7, rise: 0.6, aF: [1.5, 1, 0], bow: 0, aN: [1.8, 0.38, 1], draw: 1, arrow: 1, fN: [-2.6, 0], fF: [2.8, 0] } },
      { t: 0.58, e: "io", p: { aw: 1, ...READY, rx: -0.8, drop: 0.5, lean: -0.06, twist: -0.8, rise: 1, aF: [1.52, 1, 0], bow: 0, aN: [1.82, 0.42, 1], draw: 1, arrow: 1, fN: [-2.6, 0], fF: [2.8, 0] } },
      // the loose: the string hand flying back, the bow springing, the jaw dropped
      { t: 0.64, e: "in3", p: { aw: 1, ...READY, rx: -0.3, drop: 0.6, lean: 0, twist: -1, rise: 0.6, aF: [1.46, 1, 0], bow: 0.16, aN: [2.75, 0.62, 1], draw: 0, arrow: 0, snarl: 1, fN: [-2.6, 0], fF: [2.8, 0] } },
      { t: 0.78, e: "out", p: { aw: 0.4, ...READY, twist: -0.8, aF: [1.3, 0.96, 0], bow: 0.24, aN: [3.1, 0.6, 1], draw: 0, arrow: 0, fN: [-2.6, 0], fF: [2.8, 0] } },
      // the reach for the next shaft
      { t: 1, e: "io", p: { ...READY, aw: 0, arrow: 0 } },
    ], ph),
  },
};

// the aim contract: the bow hand at the loose (PIX hit 0.64) and the bow shoulder it turns about (art px from the feet, aim 0)
export const AIM = aimAt(CLIPS.shoot, 0.64);
