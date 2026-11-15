// ============ CONCEPT FIGURE: the Rime thrall (game type `thrall`) ============
// The Rime Clans' rank and file, a sea raider: undyed wool and sea-teal, a fur
// capelet, a small round buckler painted ochre and teal, a bearded hand axe, a
// flax braid down the back. A light quick step. A man's height (about 44 px).
// Clips (concept round): idle, attack (a short overhead chop). Walk comes after the pick.
// The owner picked look c, "bold": a horned helm and nasal, a mantle of shaggy white
// fur, a big painted round shield, a long Dane axe, a forked flax beard.
// Clips: idle, walk (8 frames), attack (11 frames, the chop lands at 0.55).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, solve, HUMAN, scaled } from "./rig.js";

const SKIN = mat("#e2b48c"), TEAL = mat("#4e6a6e"), TEAL_D = mat("#2f5866"), WOOL = mat("#8a7a5a"), LEATHER = mat("#6a4a30"), DARK = mat("#3a2a20");
const FUR = mat("#c8c2b0"), FURW = mat("#e8e6e0"), FURB = mat("#7a6a58"), OCHRE = mat("#d0943a"), IRON = mat("#9aa0ac", { contrast: 1.2 }), IRON_D = mat("#5e646e");
const STEEL = mat("#c8ccd2", { contrast: 1.3 }), WOOD = mat("#7a5632"), FLAX = mat("#d8b868"), BONE = mat("#ece0c4"), BRASS = mat("#c8a040");
const EYE = flat("#2a1c2c"), FROST = flat("#eaf6ff"), WAR = flat("#4a86b8"), SMEAR = flat("#f4f8ff", { emis: true, line: "#b8c8d8" });

// Heads, facing +x a quarter turned (as the knight's): the cap or helm on top
// (M iron, m a tone down, D dark band and nasal), flax hair (H) down the back,
// skin (S, s a tone down, N the nose), eyes (E), flax beard (B), frost (F), war-stripe (W).
const TOP = [".....MMMM....", "...MMMMMMMM..", "..MMMMMMMMMM.", ".MMMMMMMMMMM.", ".DDDDDDDDDDD."];
const FACE0 = {
  a: [".HMsSSssSSs..", ".HMSSESSSES..", ".HmSSESSSESN.", ".HHSSSSSSSSN.", ".HHmSSBBBBB..", "..HHmBBBBB...", "..HHHHBB....."],
  b: [".HMsSSssSSs..", ".HMSSESSSES..", ".HmSSESSSESN.", ".HHSWWWWWSSN.", ".HHmSSBBBBB..", "..HHmBBBBBB..", "..HHHBBBBB..."],
  c: [".HMMsDDsDDs..", ".HMMSESDSES..", ".HmMSESDSESN.", ".HHMSSSDSSSN.", ".HHmBBBBBBB..", "..HBBBBBBBB..", "..HHBBBBB.B.."],
};
const FACE = FACE0.c, HEAD = [...TOP, ...FACE], BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : r));
const LEG = {
  M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, F: { m: FROST }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  E: { m: EYE }, W: { m: WAR, fix: 0 }, H: { m: FLAX }, B: { m: FLAX, fix: 2 },
};

export const BOX = { w: 92, h: 84, ox: 36, oy: 74 };
export const MUST = [["nearArm", "notOver", "eyes"], ["axe", "sameSide", "nearHand"], ["shield", "visible", 0.4]];   // the buckler sits behind the body (z 1.5); the axe and its hand always in front
// THE GRIP: the axe's angle (from upright, + toward the foe) is DERIVED from the solved near forearm:
// forearm direction (elbow -> hand) + GRIP + a wrist of +-0.35, never posed on its own. Measured from his guard (-1.87).
export const GRIP = -1.8, WRIST = 0.35;
const forearm = (sk) => { const f = Math.atan2(sk.hdN[0] - sk.eN[0], -(sk.hdN[1] - sk.eN[1])); return f < -1.9 ? f + Math.PI * 2 : f; };
export const axeAngle = (sk) => forearm(sk) + GRIP + Math.max(-WRIST, Math.min(WRIST, sk.p.wrist || 0));
export const BONES = scaled(HUMAN, 1.08, { shN: -3.2, shF: 3.2, hipN: -1.4, hipF: 1.6, neck: 1.5 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// the axe: a = 0 haft straight up, PI/2 level before him; the beard leads the cut
const axe = (px, h, a, v) => {
  const L = v === "c" ? 16 : 12, k = v === "c" ? 1.45 : 1, d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)];
  const at = (f, s) => [h[0] + d[0] * f + n[0] * s, h[1] + d[1] * f + n[1] * s];
  px.part();
  px.capsule(...at(-3, 0), 0.8, ...at(L + 1, 0), 0.8, WOOD, 8.1, { edge: true });
  px.part();
  px.poly([at(L - 2.2 * k, 0.4), at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.6 * k), at(L + 1.6 * k, 3.2 * k), at(L + 1.6 * k, 0.4)], STEEL, 8.12, { fix: 2 });
  px.poly([at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.6 * k), at(L + 1.6 * k, 3.2 * k), at(L + 1 * k, 2.6 * k), at(L - 1 * k, 3.4 * k)], STEEL, 8.13, { fix: 4 });
  px.poly([at(L - 1.6, -0.4), at(L + 1.2, -0.4), at(L + (v === "c" ? 1.4 : 0.4), -(v === "c" ? 4.2 : 2.6))], IRON_D, 8.11, { fix: 1 });
  if (v === "c") px.poly([at(L - 3, 0.4), at(L - 3.8, -2.6), at(L - 2, -0.6)], IRON_D, 8.11, { fix: 1 });
  px.poly([at(L - 2.6, -0.8), at(L + 1.8, -0.8), at(L + 1.8, 0.9), at(L - 2.6, 0.9)], IRON_D, 8.14, { fix: 1 });
  if (v === "b") px.dot(...at(L - 0.4, 3.2), FROST, 8.15, { noLine: true });
  return at;
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const v = "c", big = true, sto = false;
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), vy = cl(N[1] - lag1.N[1], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the braid (two in b) hangs from the back of the head, swinging a beat behind
  const braid = (dx, dy, k) => {
    const s = -vx * 1.6 - vx2 * 1.2, b0 = [hx - 4.8 + dx, hy - 3 + dy], b1 = [b0[0] - 1.8 + s * 0.4, b0[1] + 4.4 - vy * 0.3], b2 = [b1[0] - 0.4 + s * 0.8, b1[1] + 4.8 * k], b3 = [b2[0] + s * 0.4, b2[1] + 3.6 * k];
    px.part();
    px.capsule(b0[0], b0[1], 1.5, b1[0], b1[1], 1.4, FLAX, 0.6); px.capsule(b1[0], b1[1], 1.4, b2[0], b2[1], 1.2, FLAX, 0.6); px.capsule(b2[0], b2[1], 1.2, b3[0], b3[1], 0.9, FLAX, 0.6);
    px.dot(b3[0], b3[1] + 1, sto ? BONE : LEATHER, 0.65);
  };
  braid(0, 0, 1);
  if (sto) braid(1.8, 1.6, 0.8);
  // c: the far horn, behind the helm
  const horn = (x0, y0, dir, z) => {
    const pts = [[x0, y0, 2], [x0 + dir * 3.4, y0 - 1.2, 1.7], [x0 + dir * 5.8, y0 - 4.4, 1.3], [x0 + dir * 6.6, y0 - 8.4, 0.8], [x0 + dir * 6, y0 - 11.4, 0.4]];
    for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
  };
  if (big) { px.part(); horn(hx - 3.4, hy - 8.4, -1, 0.7); }

  // the far arm and the buckler (a big round shield in c)
  px.part();
  px.capsule(sF[0], sF[1], 2, eF[0], eF[1], 1.8, TEAL, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.8, hdF[0], hdF[1], 1.6, TEAL, 1, { bias: -1 });
  const R = big ? 7.6 : 5.4, sx = hdF[0] + 1.6 + (big ? 1.4 : 0), sy = hdF[1] - 0.6;
  px.part(); const shId = px._pid;
  px.ellipse(sx, sy, R, R, OCHRE, 1.5, { round: 0.55, cast: 1 });
  px.ellipse(sx, sy, R * 0.62, R * 0.62, TEAL_D, 1.52, { round: 0.6 });
  px.ellipse(sx, sy, R * 0.26, R * 0.26, IRON, 1.56, { cast: 1 });
  px.toneLine(sx - R * 0.6, sy - R * 0.6, sx + R * 0.6, sy + R * 0.6, -1, shId);
  if (sto) { for (const [a, b] of [[-0.55, -0.9], [0.55, -0.9], [0, 0.9]]) px.dot(sx + a * R * 0.62, sy + b * R * 0.62, BONE, 1.57, { noLine: true }); px.dot(sx - R * 0.7, sy - R * 0.74, FROST, 1.58, { noLine: true }); px.dot(sx + R * 0.74, sy - R * 0.6, FROST, 1.58, { noLine: true }); }
  if (big) for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; px.dot(sx + Math.cos(a) * R * 0.82, sy + Math.sin(a) * R * 0.82, STEEL, 1.57, { fix: 3 }); }

  // legs: wool wraps, leather boots (fur cuffs in b and c)
  for (const [h, k, a, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(h[0], h[1], 2.5, k[0], k[1], 2.1, WOOL, z, { bias: b });
    px.capsule(k[0], k[1], 2.1, a[0], a[1], 1.7, WOOL, z, { bias: b });
    const w0 = mix(k, a, 0.45);
    px.capsule(w0[0], w0[1], 2.1, a[0], a[1], 1.9, LEATHER, z + 0.03, { bias: b });
    px.capsule(a[0] - 0.4, a[1] + 0.5, 1.5, a[0] + 3.4, a[1] + 0.8, 1.2, LEATHER, z + 0.03, { bias: b });
    if (sto || big) px.capsule(w0[0] - 1.8, w0[1] - 0.2, 1.1, w0[0] + 1.8, w0[1] + 0.2, 1.1, sto ? FUR : FURW, z + 0.05, { bias: b });
  }

  // the tunic: teal wool to the knee, a leather belt, its hem a beat behind the hips
  const hem = P[1] + 4.2, hF2 = P[0] + 5.4 - vx * 0.8, hB = P[0] - 5.8 - vx * 1.4 - vx2 * 0.6;
  px.part();
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 4.8, C[1] - 1.6], [C[0] + 5.6, C[1] + 3.4], [P[0] + 5, P[1] - 2.4], [hF2, hem], [hF2 - 3.4, hem + 0.8], [P[0] - 0.4 - vx, hem], [hB + 3, hem + 0.8], [hB, hem], [P[0] - 5, P[1] - 2.4], [C[0] - 5.8, C[1] + 3.4]], TEAL, 4, { round: 0.9, ny: -0.1, cast: 1 });
  px.toneLine(P[0] + 0.6, P[1] - 0.6, P[0] + 0.2 - vx, hem - 0.6, -1, px._pid);
  px.poly([[P[0] - 5, P[1] - 3.2], [P[0] + 5, P[1] - 3.2], [P[0] + 5.1, P[1] - 1.2], [P[0] - 5, P[1] - 1.2]], LEATHER, 4.2, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3, 2.4, 2, BRASS, 4.25, { fix: 3 });
  if (sto) { px.line(C[0] - 3.6, C[1] + 0.4, C[0] + 3, C[1] + 5.6, LEATHER, 4.1, {}); px.dot(C[0] + 0.2, C[1] + 3.4, BONE, 4.15, { fix: 3 }); }
  // the neck's collar and the capelet over the shoulders
  px.part();
  const cd = big ? 6.6 : sto ? 5.6 : 4.8, cw = big ? 8.6 : 6.4;
  px.ellipse(C[0] + 0.2, C[1] + 0.2, cw, cd * 0.62, big ? FURW : FUR, 4.4, { cast: 1 });
  px.ellipse(sN[0] - 0.4, sN[1] + 0.2, big ? 4.6 : 3.4, big ? 4.2 : 3, big ? FURW : FUR, 8, { cast: 1 });
  for (const x of big ? [-7, -4.4, -1.6, 1.2, 4, 6.6] : [-5, -2.6, 0, 2.6, 5]) px.dot(C[0] + 0.2 + x, C[1] + cd * 0.62 + 0.4 - Math.abs(x) * 0.1, big ? FURW : FUR, 4.4);
  if (big) for (const x of [-6, -3, 0, 3, 6]) px.dot(C[0] + x, C[1] + 4.6 + (x & 1), FURW, 4.4);
  if (sto) for (const [x, y] of [[-3, -1.8], [1.4, -2.4], [4.6, -0.4]]) px.dot(C[0] + x, C[1] + y, FROST, 4.45, { noLine: true });

  // the head
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  if (sto) { px.dot(hx - 2, hy - 9.5, BONE, 6.4, { fix: 3 }); px.dot(hx + 3.4, hy - 7.8, BRASS, 6.4, { fix: 3 }); }
  if (big) {
    // the near horn, curving out and up from the helm, a brass band at its root
    px.part();
    horn(hx + 2.4, hy - 8.4, 1, 6.6);
    px.dot(hx + 3.4, hy - 8.8, BRASS, 6.7, { fix: 3 }); px.dot(hx - 3.2, hy - 8.8, BRASS, 6.7, { fix: 3 });
  }

  // the near arm over it all, a fur cuff at the wrist, and the axe in the fist
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.6, 2.1, eN[0], eN[1], 1.9, TEAL, 7.9, { cast: 1 });
  px.capsule(eN[0], eN[1], 1.9, hdN[0], hdN[1], 1.7, TEAL, 7.9, { cast: 1 });
  const c0 = mix(eN, hdN, 0.68);
  px.capsule(c0[0], c0[1], 1.9, hdN[0], hdN[1], 1.8, LEATHER, 7.95, { cast: 1 });
  px.tag(null);
  const ax = axeAngle(sk);
  px.part(); px.tag("axe");
  axe(px, hdN, ax, v);
  px.tag(null);
  px.part(); px.tag("nearHand");
  px.ellipse(hdN[0], hdN[1], 1.7, 2.2, SKIN, 8.3, { rot: -ax });
  px.tag(null);

  return { bite: [hdN[0] + 8, hdN[1] + 4] };
};

// the chop's smear
const T0 = 0.42, T1 = 0.55;
export const fx = (px, { ph, sk }, info, clip) => {
  if (clip !== "attack" || ph < T0 || ph > T1 + 0.14) return;
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const q = Math.max(T0, Math.min(ph, T1 + 0.03) - i * 0.012), s = solve(CLIPS.attack.pose(q), BONES), a = axeAngle(s), d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)], h = s.hdN, L = 12;
    pts.push([[h[0] + d[0] * (L + 2) + n[0] * 3, h[1] + d[1] * (L + 2) + n[1] * 3], [h[0] + d[0] * (L - 3) + n[0] * 4, h[1] + d[1] * (L - 3) + n[1] * 4]]);
  }
  for (let i = 0; i + 1 < pts.length; i++) px.poly([pts[i][0], pts[i + 1][0], pts[i + 1][1], pts[i][1]], SMEAR, 20 - i, { noLine: true });
};

const GUARD = { drop: 1.2, lean: 0.14, hx: 1, hy: 0, aN: [0.1, 0.92, 0], aF: [1.15, 0.72, 0], fN: [-3.2, 0], fF: [3.4, 0], };
export const CLIPS = {
  idle: {
    n: 8, ms: 1500, loop: true, lag: 0.09,
    pose: (ph) => {
      const b = Math.sin(ph * Math.PI * 2), u = 0.5 + 0.5 * b;
      return { ...GUARD, rise: 0.7 * u, drop: 1.2 + 0.4 * (1 - u), aN: [0.1 + 0.04 * b, 0.92, 0], aF: [1.15 - 0.05 * b, 0.72 + 0.03 * u, 0], blink: ph >= 0.84 && ph < 0.96 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 820, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 4.6, lift: 2.6, swing: 0.4, bob: 1.3, lean: 0.14 }), a = Math.cos(ph * Math.PI * 2);
      return { ...w, drop: w.drop + 0.8, aN: [-a * 0.4 + 0.5, 0.86, 0], aF: [1.0 + 0.1 * a, 0.7, 0] };
    },
  },
  attack: {
    n: 11, ms: 760, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // the axe hauled up and back, the shield pulled in, the weight on the back foot
      { t: 0.26, e: "out", p: { ...GUARD, rx: -2.2, drop: 2, lean: 0.02, twist: -0.4, hx: 0.4, aN: [2.8, 0.92, 0], aF: [0.8, 0.8, 0], fF: [3.4, 1.4] } },
      { t: T0, e: "io", p: { ...GUARD, rx: -2.8, drop: 1.6, lean: -0.06, twist: -0.5, hx: 0.2, aN: [3.0, 0.94, 0], aF: [0.8, 0.8, 0], fF: [3.4, 2.2] } },
      // the chop: a step in, the blade comes down before him
      { t: T1, e: "in3", p: { ...GUARD, rx: 3.4, drop: 2.8, lean: 0.5, twist: 0.5, hx: 2.4, hy: 0.6, aN: [0.75, 1, 0], aF: [1.25, 0.8, 0], fF: [8, 0] } },
      { t: 0.66, e: "out", p: { ...GUARD, rx: 4, drop: 3.2, lean: 0.56, twist: 0.6, hx: 2.6, hy: 0.8, aN: [0.65, 1, 0], aF: [1.3, 0.8, 0], fF: [8, 0] } },
      { t: 0.84, e: "io", p: { ...GUARD, rx: 1.6, drop: 1.4, lean: 0.24, aN: [0.9, 0.8, 0], fF: [6, 1.6] } },
      { t: 1, e: "out", p: GUARD },
    ], ph),
  },
};
