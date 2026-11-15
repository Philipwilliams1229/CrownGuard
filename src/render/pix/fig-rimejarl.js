// ============ FIGURE: the Rime Jarl on foot (game type `rimejarlfoot`) ============
// The boss dismounted: a huge man in ring mail under a mantle of white bear fur, a
// sea-teal cape streaming behind, a horned iron helm banded in silver and set with
// frost-blue stones, a long white-blond beard in two braids, and a two-handed Dane axe
// whose blade is furred with rime. Look c, "bold" like the thrall and huscarl, but a
// lord: the biggest horns, the biggest fur, a cold light at his helm. About 72 px.
// Clips: idle, walk (8 frames, a slow lord's stride, the axe carried across him),
// attack (13 frames, a two-handed overhead chop that lands at 0.56) and SONG: his frost
// shroud on the march, the same legs as `walk`, the axe raised, the head thrown back,
// the stones blazing (the game's freezeCd clock).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, solve, HUMAN, scaled } from "./rig.js";

const SKIN = mat("#e4ae8a"), TEAL = mat("#2c4e5a"), TEAL_L = mat("#3e6674"), WOOL = mat("#4a5a60"), LEATHER = mat("#4a3426");
const MAIL = mat("#8a929c", { contrast: 1.25 }), MAIL_D = mat("#5a626e"), FURW = mat("#ece8e0"), IRON = mat("#7e8692", { contrast: 1.3 }), IRON_D = mat("#4e5560");
const STEEL = mat("#d8e4ec", { contrast: 1.3 }), SILVER = mat("#c8d0d8", { contrast: 1.3 }), WOOD = mat("#6a4a2e"), BLOND = mat("#ece2c4"), BONE = mat("#ece0c4"), BRASS = mat("#c8a040");
const EYE = flat("#2a3a48"), RIME = flat("#f4fcff"), ICE = flat("#9ad8f2", { emis: true, line: "#3a86b0" }), ICEHOT = flat("#f4fcff", { emis: true, line: "#9ad8f2" });
const SMEAR = flat("#f4fcff", { emis: true, line: "#9ad8f2" }), STONE = mat("#7cc8ec", { contrast: 1.3 });

// The head, facing +x a quarter turned: the horned helm (M iron, m a tone down, B silver band
// set with stones), the white-blond hair (H) and forked beard (R), skin (S, s, N the nose), eyes (E).
const HEAD = [
  ".....MMMM....",
  "...MMMMMMMM..",
  "..MMmMMMMMMM.",
  ".BBBBBBBBBBB.",
  ".HMMsDDsDDs..",
  ".HMMSESDSES..",
  ".HmMSESDSESN.",
  ".HHMSSSDSSSN.",
  ".HHmRRRRRRR..",
  "..HRRRRRRRR..",
  "..HHRRRRR.R..",
];
const BLINK = HEAD.map((r, i) => (i === 5 || i === 6 ? r.replace(/E/g, "S") : r));
const LEG = {
  M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, B: { m: SILVER, fix: 3 }, H: { m: BLOND, fix: 2 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYE }, R: { m: BLOND, fix: 2 },
};

export const BOX = { w: 150, h: 124, ox: 60, oy: 114 };
export const BONES = scaled(HUMAN, 1.52, { shN: -4.6, shF: 4.6, hipN: -2, hipF: 2.2, neck: 1.4 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const L = 26;                                  // the Dane axe's haft, grip to blade

// the axe, a = 0 haft up, PI/2 level before him; returns the point-on-haft helper
const axeAt = (h, a) => { const d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)]; return (f, s = 0) => [h[0] + d[0] * f + n[0] * s, h[1] + d[1] * f + n[1] * s]; };

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), vy = cl(N[1] - lag1.N[1], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]), g = p.glow || 0;
  const hot = g > 0.6;

  // the teal cape, streaming behind from the shoulders, its tail late
  {
    const s = cl(-vx * 1.8 - vx2 * 1.4, -4, 4), top = C[0] - 3, hem = P[1] + 9;
    px.part(); const cid = px._pid;
    px.poly([[top + 4, C[1] - 1.6], [top - 3, C[1] + 0.4], [top - 11 + s * 0.4, C[1] + 7], [P[0] - 13 + s * 0.8, hem - 2], [P[0] - 14 + s * 1.2, hem], [P[0] - 2 + s * 0.6, hem + 1], [P[0] + 2, P[1] - 2], [C[0] + 3.4, C[1] + 3]], TEAL, 0.5, { round: 0.85, cast: 1 });
    px.toneLine(top - 2, C[1] + 3, P[0] - 6 + s * 0.8, hem - 1, -1, cid);
    px.poly([[P[0] - 14 + s * 1.2, hem - 1.6], [P[0] - 2 + s * 0.6, hem - 0.6], [P[0] - 2 + s * 0.6, hem + 1], [P[0] - 14 + s * 1.2, hem]], FURW, 0.52, { round: 0.9 });
  }
  // the far horn, behind the helm: the lord's horns sweep wide
  const horn = (x0, y0, dir, z) => {
    const pts = [[x0, y0, 2.8], [x0 + dir * 3.8, y0 - 1.2, 2.3], [x0 + dir * 6.8, y0 - 4.4, 1.7], [x0 + dir * 8, y0 - 8.4, 1, ], [x0 + dir * 7.4, y0 - 12, 0.4]];
    for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
  };
  px.part(); horn(hx - 3.6, hy - 8.6, -1, 0.7);

  // the far arm, fixed to the haft: the second hand up the shaft (an elbow solved by hand)
  const at = axeAt(hdN, p.axe ?? 0.5);
  const gF = at(-p.span || -8.5), eFx = [(sF[0] + gF[0]) / 2 - 1.4, Math.max(sF[1], gF[1]) * 0.3 + (sF[1] + gF[1]) * 0.35 + 3];
  px.part();
  px.capsule(sF[0], sF[1], 2.7, eFx[0], eFx[1], 2.4, MAIL_D, 1, { bias: -1 });
  px.capsule(eFx[0], eFx[1], 2.4, gF[0], gF[1], 2, MAIL_D, 1, { bias: -1 });
  // legs: wool wraps, greaves, fur cuffs
  for (const [h, k, a, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(h[0], h[1], 3.2, k[0], k[1], 2.6, WOOL, z, { bias: b });
    px.capsule(k[0], k[1], 2.6, a[0], a[1], 2.1, WOOL, z, { bias: b });
    const w0 = mix(k, a, 0.4);
    px.capsule(w0[0], w0[1], 2.6, a[0], a[1], 2.3, LEATHER, z + 0.03, { bias: b });
    px.capsule(a[0] - 0.4, a[1] + 0.5, 1.9, a[0] + 4.2, a[1] + 0.8, 1.4, LEATHER, z + 0.03, { bias: b });
    px.capsule(w0[0] - 2.2, w0[1] - 0.2, 1.3, w0[0] + 2.2, w0[1] + 0.2, 1.3, FURW, z + 0.05, { bias: b });
  }
  // the hauberk to the knee, a leather belt with a silver buckle
  const hem = P[1] + 5.6, hF2 = P[0] + 6.6 - vx * 0.8, hB = P[0] - 7 - vx * 1.4 - vx2 * 0.6;
  px.part(); const mId = px._pid;
  px.poly([[C[0] - 6, C[1] - 1.6], [C[0] + 6, C[1] - 1.6], [C[0] + 6.8, C[1] + 3.6], [P[0] + 6.2, P[1] - 2.4], [hF2, hem], [hF2 - 3.6, hem + 0.8], [P[0] - 0.4 - vx, hem], [hB + 3, hem + 0.8], [hB, hem], [P[0] - 6.2, P[1] - 2.4], [C[0] - 7, C[1] + 3.6]], MAIL, 4, { round: 0.9, ny: -0.1, cast: 1 });
  px.toneLine(P[0] + 0.6, P[1] - 0.6, P[0] + 0.2 - vx, hem - 0.6, -1, mId);
  for (let yy = C[1] + 1; yy < hem - 1; yy += 2.8) for (let xx = -5; xx <= 5; xx += 3.2) { const sh = ((yy - C[1]) / 2.8 | 0) % 2 ? 1.6 : 0; px.dot(C[0] + xx + sh + (yy - C[1]) / 12 * 0.5, yy, MAIL_D, 4.08, { noLine: true }); }
  px.poly([[P[0] - 6.2, P[1] - 3.6], [P[0] + 6.2, P[1] - 3.6], [P[0] + 6.3, P[1] - 1.2], [P[0] - 6.2, P[1] - 1.2]], LEATHER, 4.2, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3.4, 3, 2.4, SILVER, 4.25, { fix: 3 });
  // the white bear mantle, deep and shaggy, a fringe of tails
  px.part();
  px.ellipse(C[0] + 0.2, C[1] + 0.6, 11.4, 5, FURW, 4.4, { cast: 1 });
  px.ellipse(sN[0] - 0.4, sN[1] + 0.2, 6, 5.4, FURW, 8, { cast: 1 });
  for (const x of [-9.6, -7, -4.2, -1.4, 1.4, 4.2, 7, 9.4]) px.dot(C[0] + 0.2 + x, C[1] + 4.4 + Math.abs(x) * -0.1 + (x & 1), FURW, 4.4);
  for (const x of [-7, -3.6, 0, 3.6, 7]) px.dot(C[0] + x, C[1] + 6.4 + (x & 1), FURW, 4.4);

  // the head and its braided beard: two plaits hanging to the belt, a beat late
  {
    const s = cl(-vx * 1.4 - vx2 * 1, -2.4, 2.4);
    for (const [dx, k] of [[-1.4, 1], [2.2, 0.85]]) {
      px.part();
      const b0 = [hx + dx, hy + 4.6], b1 = [b0[0] + s * 0.3, b0[1] + 5 * k - vy * 0.3], b2 = [b1[0] + s * 0.6, b1[1] + 5 * k];
      px.capsule(b0[0], b0[1], 1.9, b1[0], b1[1], 1.7, BLOND, 6.2); px.capsule(b1[0], b1[1], 1.7, b2[0], b2[1], 1.3, BLOND, 6.2);
      px.dot(b2[0], b2[1] + 1, BRASS, 6.3, { fix: 3 });
    }
  }
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  px.part();
  horn(hx + 2.6, hy - 8.6, 1, 6.6);
  // the frost-blue stones along the silver band, and one above the brow
  for (const x of [-3.2, -0.2, 2.8]) px.dot(hx + x, hy - 5.4, hot ? ICEHOT : STONE, 6.7, { fix: 3 });
  px.dot(hx - 0.2, hy - 10, hot ? ICEHOT : STONE, 6.7, { fix: 3 });

  // the near arm and the axe, both hands on the haft; its blade furred with rime
  px.part();
  px.capsule(sN[0], sN[1] + 0.6, 2.7, eN[0], eN[1], 2.4, MAIL, 7.9, { cast: 1 });
  px.capsule(eN[0], eN[1], 2.4, hdN[0], hdN[1], 2.1, MAIL, 7.9, { cast: 1 });
  const c0 = mix(eN, hdN, 0.7);
  px.capsule(c0[0], c0[1], 2.4, hdN[0], hdN[1], 2.3, FURW, 7.95, { cast: 1 });
  {
    const k = 1.55;
    px.part();
    px.capsule(...at(-6), 1, ...at(L + 1), 1, WOOD, 8.1, { edge: true });
    px.part();
    px.poly([at(L - 2.2 * k, 0.4), at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.8 * k), at(L + 1.8 * k, 3.4 * k), at(L + 1.8 * k, 0.4)], STEEL, 8.12, { fix: 2 });
    px.poly([at(L - 3.6 * k, 3.4 * k), at(L - 1 * k, 4.8 * k), at(L + 1.8 * k, 3.4 * k), at(L + 1 * k, 2.6 * k), at(L - 1 * k, 3.4 * k)], STEEL, 8.13, { fix: 4 });
    px.poly([at(L - 1.6, -0.4), at(L + 1.2, -0.4), at(L + 1.6, -4.6)], IRON_D, 8.11, { fix: 1 });
    px.poly([at(L - 2.8, -0.8), at(L + 2, -0.8), at(L + 2, 1), at(L - 2.8, 1)], IRON_D, 8.14, { fix: 1 });
    // rime: a furred crust along the blade's back and edge
    for (const [f, s2] of [[L - 4, 4.6], [L - 1.6, 5.4], [L + 1.4, 4.2], [L - 6, 2.8], [L + 2.2, 1.6]]) px.dot(...at(f, s2 * (s2 > 4 ? 1 : 0.9)), RIME, 8.16, { noLine: true });
    for (const f of [L - 4.6, L - 1.8, L + 1]) px.dot(...at(f, -1.2), RIME, 8.16, { noLine: true });
    px.dot(...at(L - 6.6, 0), hot ? ICEHOT : STONE, 8.17, { fix: 3 });
  }
  px.part();
  px.ellipse(hdN[0], hdN[1], 2.2, 2.2, SKIN, 8.3);
  px.ellipse(gF[0], gF[1], 2, 2, SKIN, 8.3);

  const k = cl(g, 0, 1.4);
  return { light: k > 0.05 ? { x: hx, y: hy - 5, r: 18 + 24 * cl(k, 0, 1), col: "#9ad8f2", k: Math.min(k, 0.45) } : null, blade: at(L - 1, 3), head: [hx, hy] };
};

// the chop's smear, and the song's rime motes
const T0 = 0.44, T1 = 0.56;
export const fx = (px, { ph }, info, clip) => {
  if (clip === "attack" && ph >= T0 && ph <= T1 + 0.14) {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const q = Math.max(T0, Math.min(ph, T1 + 0.03) - i * 0.012), s = solve(CLIPS.attack.pose(q), BONES), a = s.p.axe ?? 0.5, d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)], h = s.hdN;
      pts.push([[h[0] + d[0] * (L + 2) + n[0] * 3, h[1] + d[1] * (L + 2) + n[1] * 3], [h[0] + d[0] * (L - 5) + n[0] * 5, h[1] + d[1] * (L - 5) + n[1] * 5]]);
    }
    for (let i = 0; i + 1 < pts.length; i++) px.poly([pts[i][0], pts[i + 1][0], pts[i + 1][1], pts[i][1]], SMEAR, 20 - i, { noLine: true });
  }
  if (clip === "song" && info.head) {
    const [hx, hy] = info.head;
    for (let i = 0; i < 5; i++) {
      const u = (ph + i / 5) % 1, x = hx + Math.sin(i * 2.2 + u * 5) * (6 + 5 * u) + (i - 2) * 2, y = hy - 6 - u * 14;
      if (u > 0.9 || y < -BOX.oy + 3) continue;
      px.dot(x, y, u < 0.5 ? ICEHOT : ICE, 20, u > 0.7 ? { noLine: true } : {});
    }
  }
};

const TAU = Math.PI * 2;
const GUARD = { drop: 1.6, lean: 0.1, hx: 0.8, hy: 0, aN: [0.7, 0.9, 0], aF: [0.9, 0.8, 0], fN: [-3.8, 0], fF: [4, 0], axe: 0.7, glow: 0.16, span: 8.5 };
export const CLIPS = {
  idle: {
    n: 8, ms: 2000, loop: true, lag: 0.1,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b;
      return { ...GUARD, rise: 0.8 * u, drop: 1.6 + 0.4 * (1 - u), aN: [0.7 + 0.04 * b, 0.9, 0], axe: 0.7 + 0.04 * b, glow: 0.16 + 0.12 * u, blink: ph >= 0.84 && ph < 0.96 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 1000, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5, lift: 2.6, swing: 0.2, bob: 1.2, lean: 0.1 }), a = Math.cos(ph * TAU);
      return { ...w, drop: w.drop + 1.2, aN: [0.8 - a * 0.1, 0.9, 0], aF: [1.0, 0.8, 0], axe: -1.1 - a * 0.07, span: 8.5, glow: 0.14 };
    },
  },
  // his frost song on the march: the same legs as walk, the axe held high, the head thrown back, the stones blazing
  song: {
    n: 8, ms: 1000, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5, lift: 2.6, swing: 0.2, bob: 1.2, lean: 0.1 }), b = Math.sin(ph * TAU * 2);
      return { ...w, drop: w.drop + 1.2, hx: -0.6, hy: -1.2, aN: [1.9 + 0.06 * b, 0.94, 0], aF: [1.9, 0.9, 0], axe: 0.15 + 0.06 * b, span: 8.5, glow: 1.1 + 0.25 * b };
    },
  },
  attack: {
    n: 13, ms: 1000, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // the great axe hauled up and back over the shoulder, the weight on the back foot
      { t: 0.28, e: "out", p: { ...GUARD, rx: -2.6, drop: 2.4, lean: 0.0, twist: -0.4, hx: 0.3, aN: [2.8, 0.92, 0], aF: [2.6, 0.9, 0], axe: -0.5, fF: [4, 1.4], glow: 0.4 } },
      { t: T0, e: "io", p: { ...GUARD, rx: -3.2, drop: 2, lean: -0.08, twist: -0.5, hx: 0.2, aN: [3.0, 0.94, 0], aF: [2.8, 0.94, 0], axe: -0.7, fF: [4, 2.4], glow: 0.5 } },
      // the chop: a long step in, the blade comes down before him
      { t: T1, e: "in3", p: { ...GUARD, rx: 4, drop: 3.4, lean: 0.5, twist: 0.5, hx: 2.6, hy: 0.6, aN: [1.4, 1, 0], aF: [1.5, 0.9, 0], axe: 2.0, fF: [9.4, 0], glow: 0.9 } },
      { t: 0.68, e: "out", p: { ...GUARD, rx: 4.6, drop: 3.8, lean: 0.56, twist: 0.6, hx: 2.8, hy: 0.8, aN: [1.3, 1, 0], aF: [1.5, 0.9, 0], axe: 2.15, fF: [9.4, 0], glow: 0.6 } },
      { t: 0.86, e: "io", p: { ...GUARD, rx: 1.8, drop: 1.8, lean: 0.24, aN: [0.9, 0.85, 0], axe: 1.2, fF: [7, 1.6], glow: 0.3 } },
      { t: 1, e: "out", p: GUARD },
    ], ph),
  },
};
