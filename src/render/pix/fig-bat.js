// ============ FIGURE: the Fell Bat (the Greenwood's small flier) ============
// "A shrieking scrap of wing and teeth." Tiny: about 28 px across the spread
// wings, a furry body of 8-9 px held ~16 px above its ground point (the anchor
// of BOX is the ground UNDER it, not its feet). Three-quarter view facing +x:
// the near wing in front and to the left, the far wing a tone down behind the
// head, big ears, two red eyes at the front edge of the face, fangs under a
// snub pink nose, tiny feet.
// It does not walk, so the biped skeleton is unused: each clip's pose is a few
// numbers of its own (a wing angle, how far the fingers are spread, where the
// body is), read back off `F.sk.p`. The wing's bones keep their length through
// the beat; the fingers and the membrane's trailing edge follow the arm a beat
// late (`lag1`, `lag2`), which is what makes the stroke read as skin on bone.
// `walk` IS the wingbeat (the board plays it on a clock).
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys, EASE } from "./rig.js";

const FUR = mat("#4a3a48"), RUFF = mat("#6a5868"), MEM = mat("#6a4a62"), PINK = mat("#8a5a6a"), FANG = mat("#ece0c4");
const EYE = flat("#e05248", { emis: true }), GLINT = flat("#ffb070", { emis: true }), MOUTH = flat("#2a1c24"), GUM = flat("#b0404a");

// The head, facing +x, a quarter turned. K fur (k a tone down), d the dark
// socket over each eye, E the eye (e its hot glint), N the snub nose proud of
// the face, M the mouth, T a fang, p the pink inside an ear.
const HEAD = [
  "K....k...",
  "KA..kF...",
  "KpK.kpk..",
  "AAKKKFFK.",
  "KKKdKKdK.",
  "KKKeKKeKN",
  "KKKEKKEnN",
  ".kKKMTMT.",
  "..kkkkk..",
];
// the shriek: the jaw dropped, the gape red, both fangs bared
const BITE = [
  "K....k...",
  "KA..kF...",
  "KpK.kpk..",
  "AAKKKFFK.",
  "KKKdKKdK.",
  "KKKeKKeKN",
  "KKKEKKEnN",
  ".kKKTMTM.",
  ".kKgMggM.",
  "..kkkTk..",
];
// every tone is set by hand (the head is too small to light as a ball): A is the sunlit
// band when the sun is behind it, F when the figure is re-lit facing left
const legend = (flip) => ({
  K: { m: FUR, fix: 2 }, k: { m: FUR, fix: 1 }, A: { m: FUR, fix: flip ? 2 : 3 }, F: { m: FUR, fix: flip ? 3 : 2 }, d: { m: FUR, fix: 0 }, p: { m: PINK, fix: 2 },
  E: { m: EYE }, e: { m: GLINT }, N: { m: PINK, fix: 3 }, n: { m: PINK, fix: 1 }, M: { m: MOUTH }, g: { m: GUM }, T: { m: FANG, fix: 4 },
});
const LEG = legend(false), LEG_F = legend(true);

export const BOX = { w: 44, h: 46, ox: 21, oy: 39 };
export const BONES = HUMAN;            // unused: a flier poses itself

const HOVER = 16;                      // the body's height over its ground point
const ARM = 5.4;                       // shoulder to wrist
const FING = [[7.6, 0.12], [8, 0.82], [7, 1.55]];   // each finger: [length, how far it fans down from the arm]
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// one wing: S shoulder, H where the membrane meets the flank; sgn -1 the near wing (out to the
// left), +1 the far one. a: the arm's angle above level; aT, aM: the same angle a beat and two
// beats ago (the fingertips and the membrane's edge follow late); sp: the fingers' spread.
const wing = (px, S, H, sgn, a, aT, aM, sp, k, z, far) => {
  const dir = (ang, l) => [sgn * Math.cos(ang) * l * k, -Math.sin(ang) * l * k];
  const W = add(S, dir(a, ARM));
  const T = FING.map(([l, f]) => add(W, dir(aT - f * sp, l)));
  // the trailing edge between two fingertips: a scallop drawn in toward the wrist, lagging again
  const drag = (aM - a) * 1.6;
  const sc = (p, q, d = 0.34) => { const m = mix(mix(p, q, 0.5), W, d); return [m[0], m[1] - drag]; };
  const t = far ? [2, 1, 1] : [3, 2, 2];
  px.part();
  px.poly([W, T[0], sc(T[0], T[1]), T[1]], MEM, z, { fix: t[0] });
  px.poly([W, T[1], sc(T[1], T[2]), T[2]], MEM, z, { fix: t[1] });
  px.poly([S, W, T[2], sc(T[2], H, 0.2), H], MEM, z, { fix: t[2] });
  // the bones: pink arm and leading finger along the top edge, the inner fingers faint in the skin
  for (let i = 1; i < 3; i++) px.line(W[0], W[1], T[i][0], T[i][1], MEM, z + 0.02, { fix: far ? 0 : 1 });
  px.line(S[0], S[1], W[0], W[1], PINK, z + 0.03, { fix: far ? 1 : 3 });
  px.line(W[0], W[1], T[0][0], T[0][1], PINK, z + 0.03, { fix: far ? 1 : 3 });
  if (!far) px.dot(W[0], W[1] - 1, FANG, z + 0.04, { fix: 3 });   // the thumb claw
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const p = sk.p, p1 = lag1.p, p2 = lag2.p;
  const B = [Math.round(p.bx), Math.round(-HOVER + p.by)];
  const sw = p.sw || 0;
  // the far wing, behind everything, smaller and a tone down
  wing(px, add(B, [2.2, -2.6]), add(B, [1.6, 2.6]), 1, p.a + sw, p1.a + (p1.sw || 0), p2.a + (p2.sw || 0), p.sp, 0.86, 1, true);
  // tiny feet, tucked under the tail end
  px.part();
  px.line(B[0] - 2.4, B[1] + 4.4, B[0] - 3, B[1] + 6, PINK, 2, { fix: 1 });
  px.line(B[0] - 0.6, B[1] + 4.6, B[0] - 0.8, B[1] + 6.2, PINK, 2, { fix: 1 });
  // the body: a furry egg, a paler ruff on the chest
  px.part();
  px.ellipse(B[0] - 0.6, B[1] + 1.4, 3.3, 3.9, FUR, 4, { rot: -0.25, floor: 1 });
  px.rect(B[0], B[1] + 1, 2, 2, RUFF, 4.05, { fix: 2 }); px.dot(B[0] + 2, B[1] + 2, RUFF, 4.05, { fix: 1 });
  // the near wing, over the body's flank
  wing(px, add(B, [-2.4, -1.2]), add(B, [-2.2, 3.6]), -1, p.a - sw * 0.35, p1.a - (p1.sw || 0) * 0.35, p2.a - (p2.sw || 0) * 0.35, p.sp, 1, 5, false);
  // the head, on whole pixels
  px.part();
  px.stamp(p.jaw > 0.5 ? BITE : HEAD, B[0] + Math.round(p.hx) - 3, B[1] + Math.round(p.hy) - 8, o.flip ? LEG_F : LEG, 6);
  return {};
};

const TAU = Math.PI * 2;
const UP = 1.02, DOWN = -0.62, D = 0.36;   // the arm's highest and lowest angle; the downstroke's share of the beat
const beat = (ph) => {
  // the downstroke: fast, the fingers spread wide; the upstroke: slower, the wing folding a little to slip the air
  let a, sp;
  if (ph < D) { const u = ph / D; a = UP + (DOWN - UP) * EASE.io(u); sp = 1.04; }
  else { const u = (ph - D) / (1 - D); a = DOWN + (UP - DOWN) * EASE.io(u); sp = 1.04 - 0.3 * Math.sin(Math.PI * u); }
  // the body is thrown up by the downstroke and sinks through the upstroke
  return { a, sp, sw: 0, bx: 0, by: -1.4 * Math.cos(TAU * (ph - 0.44)), hx: 0, hy: 0, jaw: 0 };
};
const HOLD = { a: 0.5, sp: 1, sw: 0, bx: 0, by: 0, hx: 0, hy: 0, jaw: 0 };
const WALK = { n: 8, ms: 420, loop: true, lag: 0.085, pose: beat };

export const CLIPS = {
  idle: WALK,
  walk: WALK,
  // a swooping bite (the game's bat never strikes; old call sites may still ask for fight frames):
  // it rears up and back with the wings high, stoops with them swept back, snaps, then flares to brake
  attack: {
    n: 8, ms: 620, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: HOLD },
      { t: 0.22, e: "out", p: { ...HOLD, a: 1.1, sp: 0.95, bx: -2.5, by: -2.6, hy: -1 } },
      { t: 0.34, e: "io", p: { ...HOLD, a: 1.2, sp: 0.8, bx: -3, by: -3, hy: -1, jaw: 1 } },
      { t: 0.52, e: "in3", p: { ...HOLD, a: 1.25, sp: 0.4, sw: 0.75, bx: 5, by: 3.4, hx: 1, hy: 1, jaw: 1 } },
      { t: 0.6, e: "out", p: { ...HOLD, a: 1.2, sp: 0.45, sw: 0.7, bx: 5.8, by: 3.8, hx: 1, hy: 1, jaw: 0 } },
      { t: 0.76, e: "out", p: { ...HOLD, a: -0.5, sp: 1.15, bx: 3, by: 1.2 } },
      { t: 0.9, e: "io", p: { ...HOLD, a: 0.9, sp: 0.9, bx: 1, by: -0.8 } },
      { t: 1, e: "io", p: HOLD },
    ], ph),
  },
};
