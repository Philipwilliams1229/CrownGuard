// ============ FIGURE: the Ice Drake (game type `icedrake`) ============
// A lesser drake off the ice cliffs, the Greenwood dragon's small cold cousin: pale blue scales like
// a frozen lake, a white belly, a crest and spines of icicle, a long tail ending in a blade of ice,
// finger-boned wings of a deeper glacier blue, cold white eyes. About 90 px across the spread wings
// and 14 px of body held ~22 px above its ground point (the anchor of BOX is the ground UNDER it).
// It does not walk, so the biped skeleton is unused; each clip's pose is a few numbers of its own
// (the wing's angle, the body's bob, a tail wave, the neck's coil, the jaw, the breath) read back
// off `F.sk.p`; the wing's fingers and membrane follow the arm a beat late (`lag1`, `lag2`).
// Clips: idle = walk = the wingbeat (the board plays it on a clock), attack = the frost breath
// (rear and draw the neck back, the jaws open on a cold glow, a cone of frost poured out); the
// engine never asks for it (the drake has no blow).
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys, EASE } from "./rig.js";

const ICE = mat("#9cc2d8"), BELLY = mat("#eef4f4"), MEM = mat("#6f9fc4"), MEMF = mat("#557f9c"), CREST = mat("#e4f6ff"), BONEW = mat("#bfd8e8");
const EYE = flat("#e8fbff", { emis: true }), PUP = flat("#26405a"), MOUTH = flat("#2a3450"), GLOW = flat("#bff0ff", { emis: true }), GLOW2 = flat("#8ad8f8", { emis: true });
const MIST = flat("#f4fbff", { emis: true, line: "#b8d8ea" }), MIST2 = flat("#cfeaf8", { emis: true, line: "#98c4dc" }), MIST3 = flat("#a8d4ec", { emis: true, line: "#7aa8c8" });

// The head, facing +x a quarter turned: R scales (r a tone down, L lit), the crest's dark root (D),
// a pale eye (E, P its pupil), the snout with nostril (N), pale jaw (B), mouth (M), a fang (T).
const HEAD = [
  "...DD.DD......",
  "..RRRRRRRR....",
  ".RRRRLLLLRRR..",
  "RRRRREEPRRRRRL",
  "rRRRRRRRRRRRRN",
  ".rRRRRRRRRMMMN",
  "..rBBBBBBTBBB.",
  "....bbbbbbb...",
];
const OPEN = [
  "...DD.DD......",
  "..RRRRRRRR....",
  ".RRRRLLLLRRR..",
  "RRRRREEPRRRRRL",
  "rRRRRRRRRRRRRN",
  ".rRRRRRTRTRRRN",
  "..rrMMMMMMMMM.",
  "...bBMMMMMMM..",
  "....bbBBBBBT..",
];
const legend = (flip) => ({
  R: { m: ICE, fix: 2 }, r: { m: ICE, fix: 1 }, L: { m: ICE, fix: flip ? 4 : 3 }, D: { m: CREST, fix: 2 }, E: { m: EYE }, P: { m: PUP },
  N: { m: ICE, fix: 3 }, B: { m: BELLY, fix: 3 }, b: { m: BELLY, fix: 2 }, M: { m: MOUTH }, T: { m: CREST, fix: 4 },
});
const LEG = legend(false), LEG_F = legend(true);

export const BOX = { w: 128, h: 84, ox: 56, oy: 74 };
export const BONES = HUMAN;            // unused: a flier poses itself

const HOVER = 22, TAU = Math.PI * 2;
const ARM = 11.5;
const FING = [[17, 0.12], [18.5, 0.82], [16, 1.55]];   // each finger: [length, how far it fans down from the arm]
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// one wing (the bat's construction at a drake's size): S shoulder, H where the membrane meets the flank;
// sgn -1 the near wing (out to the left), +1 the far one.
const wing = (px, S, H, sgn, a, aT, aM, sp, k, z, far) => {
  const dir = (ang, l) => [sgn * Math.cos(ang) * l * k, -Math.sin(ang) * l * k];
  const W = add(S, dir(a, ARM));
  const T = FING.map(([l, f]) => add(W, dir(aT - f * sp, l)));
  const drag = (aM - a) * 3;
  const sc = (p, q, d = 0.3) => { const m = mix(mix(p, q, 0.5), W, d); return [m[0], m[1] - drag]; };
  const M = far ? MEMF : MEM, t = far ? [2, 1, 1] : [3, 2, 2];
  px.part();
  px.poly([W, T[0], sc(T[0], T[1]), T[1]], M, z, { fix: t[0] });
  px.poly([W, T[1], sc(T[1], T[2]), T[2]], M, z, { fix: t[1] });
  px.poly([S, W, T[2], sc(T[2], H, 0.2), H], M, z, { fix: t[2] });
  for (let i = 1; i < 3; i++) px.line(W[0], W[1], T[i][0], T[i][1], M, z + 0.02, { fix: far ? 0 : 1 });
  px.line(S[0], S[1], W[0], W[1], BONEW, z + 0.03, { fix: far ? 1 : 3 });
  px.line(W[0], W[1], T[0][0], T[0][1], BONEW, z + 0.03, { fix: far ? 1 : 3 });
  // an ice claw at the wrist
  if (!far) px.poly([[W[0] - 1, W[1]], [W[0] + 1, W[1]], [W[0] - sgn * 0.5, W[1] - 4]], CREST, z + 0.04, { fix: 3 });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const p = sk.p, p1 = lag1.p, p2 = lag2.p;
  const by = p.by || 0, B = [0, -HOVER + by];
  const sw = p.sw || 0, coil = p.coil || 0;
  // the far wing, behind everything, smaller and a tone down
  wing(px, add(B, [3, -4]), add(B, [-4, 1]), 1, p.a + sw, p1.a + (p1.sw || 0), p2.a + (p2.sw || 0), p.sp, 1.5 * 0.82, 1, true);

  // legs tucked under, dangling a beat behind
  const dang = (p1.by || 0) - by;
  px.part();
  for (const [x, z, bs] of [[-6, 1.4, -1], [4, 1.5, -1]]) {
    px.capsule(B[0] + x, B[1] + 4, 1.9, B[0] + x - 2.4, B[1] + 8.6 + dang, 1.3, ICE, z, { bias: bs });
    px.capsule(B[0] + x - 2.4, B[1] + 8.6 + dang, 1.3, B[0] + x + 0.4, B[1] + 11.2 + dang, 1, ICE, z, { bias: bs });
  }

  // the tail: a wave running down it, ending in a blade of ice
  const tw = [p.t1 || 0, p.t2 || 0, p.t3 || 0, p.t4 || 0];
  const TL = [[-8, B[1] + 1.4], [-15, B[1] + 2 + tw[0]], [-22, B[1] + 2.4 + tw[1]], [-29, B[1] + 1.4 + tw[2]], [-35, B[1] - 1.6 + tw[3]]];
  const TR = [4.2, 3.2, 2.3, 1.6, 0.9];
  px.part();
  for (let i = 0; i + 1 < TL.length; i++) px.capsule(TL[i][0], TL[i][1], TR[i], TL[i + 1][0], TL[i + 1][1], TR[i + 1], ICE, 2, { cast: 1, floor: 1 });
  {
    const e = TL[4], q = TL[3], l = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1, dx = (e[0] - q[0]) / l, dy = (e[1] - q[1]) / l, nx = -dy, ny = dx;
    const at = (f, s) => [e[0] + dx * f + nx * s, e[1] + dy * f + ny * s];
    px.poly([at(-1, 0.8), at(0.5, 3), at(7, 0), at(0.5, -3), at(-1, -0.8)], CREST, 2.1, { fix: 3 });
  }
  // icicle spines along the tail and back
  px.part();
  for (let i = 1; i < TL.length - 1; i++) px.poly([[TL[i][0] - 1, TL[i][1] - TR[i] + 0.6], [TL[i][0] + 1, TL[i][1] - TR[i] + 0.6], [TL[i][0] - 1.6, TL[i][1] - TR[i] - 3 + i * 0.3]], CREST, 1.9, { fix: 3 });

  // the body: a barrel and a deep chest, a white belly, the neck rising to the head
  const NK = [[7, B[1] - 2], [11, B[1] - 6 + coil * 1.2], [13.5 + coil * 1.5, B[1] - 11 + coil * 2.4], [15.5 + coil * 2.6, B[1] - 15.4 + coil * 3.4]];
  px.part();
  px.ellipse(-1, B[1], 10, 6, ICE, 3, { rot: -0.1, cast: 1, floor: 1 });
  px.ellipse(5.4, B[1] + 0.4, 6.4, 6, ICE, 3, { cast: 1 });
  px.capsule(NK[0][0], NK[0][1], 4.2, NK[1][0], NK[1][1], 3.5, ICE, 3.2, { cast: 1 });
  px.capsule(NK[1][0], NK[1][1], 3.5, NK[2][0], NK[2][1], 3.1, ICE, 3.2, { cast: 1 });
  px.capsule(NK[2][0], NK[2][1], 3.1, NK[3][0], NK[3][1], 3, ICE, 3.2, { cast: 1 });
  px.part();
  px.capsule(-3, B[1] + 4.4, 2.2, 8, B[1] + 4.6, 2.6, BELLY, 3.3, { cast: 0 });
  px.capsule(7.4, B[1] + 3, 2.4, 11.4, B[1] - 3.8 + coil, 1.6, BELLY, 3.3, { cast: 0 });
  // the icicle crest down the back and neck
  px.part();
  for (const [x, y, h] of [[-5, B[1] - 5.6, 3], [-1, B[1] - 6.4, 3.6], [3, B[1] - 6.2, 3.2], [6.6, B[1] - 8, 3.4], [10, B[1] - 11.4 + coil, 3.2]]) px.poly([[x - 1.2, y + 1.6], [x + 1.2, y + 1.6], [x - 1.8, y - h]], CREST, 3.4, { fix: 3 });

  // the head, on whole pixels, the horns of ice swept back from the brow
  const hx = Math.round(NK[3][0]) - 3 + Math.round(p.hx || 0), hy = Math.round(NK[3][1]) - 5 + Math.round(p.hy || 0);
  const open = (p.jaw || 0) > 0.5;
  px.part();
  px.poly([[hx + 2, hy + 0.6], [hx + 5, hy + 0.4], [hx - 3, hy - 4.6], [hx - 4.6, hy - 4]], CREST, 5.9, { fix: 3 });
  px.part();
  px.stamp(open ? OPEN : HEAD, hx, hy, o.flip ? LEG_F : LEG, 6, { ax: 3, ay: 4 });
  if (open && (p.chill || 0) > 0.3) px.dot(hx + 11, hy + 5, GLOW, 6.3, { noLine: true });

  // the near wing over the body's flank
  wing(px, add(B, [-1, -3.6]), add(B, [-6, 2.4]), -1, p.a - sw * 0.35, p1.a - (p1.sw || 0) * 0.35, p2.a - (p2.sw || 0) * 0.35, p.sp, 1.5, 5, false);
  return { mouth: [hx + 12, hy + 5], chill: p.chill || 0, reach: p.reach || 0 };
};

// the frost breath: a stepped cone of mist poured forward and a little down from the jaws
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack" || info.reach < 0.05) return;
  const [mx, my] = info.mouth, L = 38 * info.reach, k = Math.round(ph * 15);
  for (let i = 0; i < 26; i++) {
    const u = ((i * 0.618 + k * 0.17) % 1), t = u * info.reach, d = t * 38, sp = (((i * 7919) % 100) / 100 - 0.5) * 2;
    const x = mx + d, y = my + d * 0.42 + sp * (1.5 + d * 0.32);
    if (d > L) continue;
    const r = 0.9 + t * 3.2;
    px.ellipse(x, y, r, r * 0.8, t < 0.3 ? MIST : t < 0.65 ? MIST2 : MIST3, 20 + t, { noLine: t > 0.5 && i % 2 === 0 });
  }
};

const beat = (ph) => {
  // the downstroke: fast, the fingers spread wide; the upstroke: slower, the wing folding a little to slip the air
  const UP = 1.0, DOWN = -0.55, D = 0.38;
  let a, sp;
  if (ph < D) { const u = ph / D; a = UP + (DOWN - UP) * EASE.io(u); sp = 1.04; }
  else { const u = (ph - D) / (1 - D); a = DOWN + (UP - DOWN) * EASE.io(u); sp = 1.04 - 0.3 * Math.sin(Math.PI * u); }
  const w = (d) => Math.sin(TAU * (ph - 0.2 - d));
  return { a, sp, sw: 0, by: -1.8 * Math.cos(TAU * (ph - 0.44)), t1: 0.7 * w(0.07), t2: 1.5 * w(0.14), t3: 2.4 * w(0.21), t4: 3.4 * w(0.28), coil: 0, hx: 0, hy: 0, jaw: 0, chill: 0, reach: 0 };
};
const WALK = { n: 8, ms: 560, loop: true, lag: 0.09, pose: beat };
const HOLD = { a: 0.45, sp: 1, sw: 0, by: 0, t1: 0, t2: 0.5, t3: 1, t4: 1.4, coil: 0, hx: 0, hy: 0, jaw: 0, chill: 0, reach: 0 };
export const CLIPS = {
  idle: WALK,
  walk: WALK,
  attack: {
    n: 10, ms: 900, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: HOLD },
      // rear back, the neck drawn into an S, the throat kindling cold
      { t: 0.28, e: "out", p: { ...HOLD, a: 0.95, by: -3, coil: -1, hx: -1, chill: 0.6 } },
      { t: 0.4, e: "io", p: { ...HOLD, a: 1.0, by: -3.4, coil: -1.2, hx: -1.5, jaw: 1, chill: 1 } },
      // the breath: the head thrown out and down, the frost poured
      { t: 0.52, e: "in3", p: { ...HOLD, a: 0.5, by: -1.6, coil: 1, hx: 2, hy: 1, jaw: 1, chill: 1, reach: 0.7 } },
      { t: 0.66, e: "out", p: { ...HOLD, a: 0.6, by: -1.4, coil: 0.9, hx: 2, hy: 1, jaw: 1, chill: 1, reach: 1 } },
      { t: 0.84, e: "io", p: { ...HOLD, a: 0.8, by: -2, coil: 0.3, jaw: 0, reach: 0.4 } },
      { t: 1, e: "io", p: HOLD },
    ], ph),
  },
};
