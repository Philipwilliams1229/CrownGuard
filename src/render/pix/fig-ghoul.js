// ============ FIGURE: the Ghoul (the Hollow Court's fast flesh-eater, game type `ghoul`) ============
// A starved corpse gone back to all fours, about 40 px nose to rag and 20 at the hump of its
// shoulders: grey-green dead flesh drawn tight over a knuckled spine and a cage of ribs, a pale
// pinched belly, arms far too long (they are its front legs), thin crouched hind legs, a
// rag of purple shroud flapping at the hip, a sunken face with stringy hair, teal witch-fire in
// the sockets and a wide mouth of teeth. Built on beast.js (four legs, arms for forelegs).
// Clips: idle (a hungry sway), walk (its RUN: a loping gallop), attack (rear up, a claw
// raked down, a snap at the end of it).
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys } from "./rig.js";
import { QUAD, beastFrames, solveBeast, tailPts, gallop } from "./beast.js";

const FLESH = mat("#7c8a70"), PALE = mat("#b4bc9c"), HAIR = mat("#4a5448", { contrast: 0.9 }), RAG = mat("#4a3a5e", { contrast: 0.9 });
const CLAW = mat("#d8d0b4"), BONE = mat("#d4cdb4");
const EYE = flat("#7ce0b8", { emis: true }), SOCK = flat("#15121a"), MOUTH = flat("#2c1a22"), TOOTH = flat("#ece0c4");

// The face, facing +x, a quarter turned: F flesh (f a tone down), h the stringy hair, e the
// sunken socket and E the witch-fire in it, N the nose holes, T teeth, M the mouth's dark,
// P the pale jaw and chin.
const HEAD = [
  "...hhhhhh....",
  "..hhFFFFFF...",
  ".hhFFFFFFFF..",
  ".hFFFFFeeFFF.",
  ".hFFFFFeEFFN.",
  "..FFFFFFFFFN.",
  "..fFFFFFFFPP.",
  "..fFFTMTMTT..",
  "...fPPPPPPP..",
  "....fffPPP...",
];
const SNAP = HEAD.map((r, i) => ({ 7: "..fFFTMMMMMT.", 8: "...fPTMMMMTP.", 9: "....fPTTTPP..", 10: ".....fPPPP..." })[i] ?? r).concat([".....fPPPP..."]);
const BLINK = HEAD.map((r, i) => (i === 3 ? ".hFFFFFFFFFF." : i === 4 ? ".hFFFFFFeeFN." : r));
const LEG = { F: { m: FLESH }, f: { m: FLESH, bias: -1 }, h: { m: HAIR }, P: { m: PALE }, e: { m: SOCK }, E: { m: EYE }, N: { m: SOCK }, T: { m: TOOTH, fix: 4 }, M: { m: MOUTH } };

export const BOX = { w: 76, h: 46, ox: 34, oy: 40 };
export const BONES = HUMAN;                 // unused: the ghoul stands on beast.js's bones
const Q = {
  ...QUAD, spine: 14, height: 17.5, sh: [-1, 3.2], hip: [1, 3], foreU: 10.4, foreL: 9.6, hindU: 8, hindL: 7.4,
  paw: 1, neckAt: [0.4, 0.8], neck: 6.2, tailAt: [-0.5, 1], tail: [3, 3, 2.6], foreX: 1, hindX: -3,
};
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// an arm for a foreleg: long, thin, the elbow a knot, a hand that rakes (curl: fingers closed)
const arm = (px, l, z, bias, curl, b) => {
  const { j, k, a } = l, o = { bias, cast: 1 };
  px.part();
  px.capsule(j[0], j[1], 2.1, k[0], k[1], 1.5, FLESH, z, o);
  px.capsule(k[0], k[1], 1.5, a[0], a[1], 1.1, FLESH, z, o);
  px.ellipse(k[0], k[1], 1.5, 1.4, FLESH, z + 0.02, { ...o, bias: bias + 0.4 });
  // the hand: a flat palm and three claws raking forward (closed into a fist when it curls)
  const down = l.lift < 0.8, spread = 1 - curl * 0.7;
  px.ellipse(a[0] + 0.4, a[1] + 0.3, 1.5, 1.1, FLESH, z + 0.03, o);
  const fx = down ? 3.2 : 2.6;
  for (const dy of [-0.9, 0.3, 1.2]) px.line(a[0] + 0.8, a[1] + 0.2 + dy * 0.4, a[0] + 0.8 + fx * (0.55 + 0.45 * spread), a[1] + 0.3 + dy * (0.6 + spread * 0.9) + (down ? 0.6 : 1.2 * curl), CLAW, z + 0.05, { fix: 3, bias });
};
// a hind leg: a crouched haunch, a thin shin, a long flat foot
const hind = (px, l, z, bias) => {
  const { j, k, a } = l, o = { bias, cast: 1 };
  px.part();
  px.capsule(j[0], j[1], 2.9, k[0], k[1], 1.3, FLESH, z, o);
  px.capsule(k[0], k[1], 1.3, a[0], a[1], 1, FLESH, z, o);
  px.ellipse((j[0] + k[0]) / 2, (j[1] + k[1]) / 2 - 0.6, 2.2, 2.1, FLESH, z + 0.02, o);
  px.capsule(a[0] - 0.2, a[1] + 0.4, 1, a[0] + 3.2, a[1] + 0.7, 0.8, FLESH, z, o);
  px.dot(a[0] + 3.6, a[1] + 0.7, CLAW, z + 0.05, { fix: 3, bias });
};

export const draw = (px, F) => {
  const { b, b1, b2 } = beastFrames(F, Q), p = b.p;
  const hx = Math.round(b.K[0]), hy = Math.round(b.K[1]);
  const vx = cl(b.K[0] - b1.K[0], -3, 3);
  const curl = p.curl2 ?? 0;

  // the far limbs, a tone down
  hind(px, b.FH, 1, -1);
  arm(px, b.FF, 1.2, -1, curl, b);

  // the rag of shroud at the hip, flapping behind (it trails the body by a beat)
  const t = tailPts(b, b1, b2, { drag: 0.7 });
  px.part();
  px.poly([[t[0][0] + 1.4, t[0][1] - 1], [t[0][0] - 1.2, t[0][1] - 1.4], [t[1][0] - 0.6, t[1][1] - 0.6], [t[2][0] - 0.4, t[2][1] + 0.4], [t[3][0] - 0.4, t[3][1] + 1.8], [t[2][0] + 1, t[2][1] + 2.2], [t[1][0] + 0.4, t[1][1] + 2.6], [t[0][0] + 1.2, t[0][1] + 2.4]], RAG, 2.5, { round: 0.8, floor: 1 });

  // the body: a haunch, a pinched waist, a cage of ribs and the hump of the shoulders
  const ch = b.at(0.2, 0, 3.8), hn = b.at(-0.38, 0, 2.8), wa = b.at(-0.15, 0, 2.6), sh = b.at(0.4, 0, -0.2);
  px.part(); const bodyId = px._pid;
  px.ellipse(hn[0], hn[1], 3.4, 3.2, FLESH, 4, { rot: b.ang(-0.38) });
  px.capsule(hn[0], hn[1], 2.8, wa[0], wa[1], 1.9, FLESH, 4);
  px.capsule(wa[0], wa[1], 2, ch[0], ch[1], 3.8, FLESH, 4);
  px.ellipse(sh[0], sh[1] + 1.6, 4.3, 4.6, FLESH, 4.1, { rot: b.ang(0.42) });
  // the pale belly under the ribs
  const be0 = b.at(0.34, 0.4, 6.2), be1 = b.at(-0.1, 0, 4.2);
  px.capsule(be0[0], be0[1], 1.6, be1[0], be1[1], 1, PALE, 4.2);
  // ribs: dark grooves over the cage
  for (const s of [0.1, 0.2, 0.3]) { const r0 = b.at(s, 0.6, 1.2), r1 = b.at(s + 0.04, 0, 6.2); px.line(r0[0], r0[1], r1[0], r1[1], HAIR, 4.3, { fix: 1 }); }
  // the knuckled spine standing off the back
  for (let u = -0.42; u <= 0.46; u += 0.14) { const q = b.at(u, 0, -0.5); px.dot(Math.round(q[0]), Math.round(q[1]) - 1, PALE, 4.4, { fix: 3 }); }
  // the shroud's rag over the ribs
  const rg = b.at(0.02, 0, 1.6), rg2 = b.at(0.0 - vx * 0.05, -1.6, 6.4);
  px.part();
  px.poly([[rg[0] - 3.4, rg[1]], [rg[0] + 2.6, rg[1] + 0.2], [rg[0] + 2.4, rg[1] + 3.6], [rg2[0] + 1.4, rg2[1]], [rg[0] - 0.4, rg[1] + 3.8], [rg2[0] - 1.4, rg2[1] - 0.4], [rg[0] - 3.2, rg[1] + 4]], RAG, 4.5, { round: 0.8, floor: 1 });

  // the neck, slung low and thin
  const n0 = b.at(0.46, 0, 1), n1 = [b.K[0] - 1.6, b.K[1] + 0.6];
  px.part();
  px.capsule(n0[0], n0[1], 2.8, n1[0], n1[1], 2.1, FLESH, 4.3);

  // the head: a stamped face, the jaw open on the snap
  const jaw = p.jaw ?? 0, grid = p.blink ? BLINK : jaw > 0.7 ? SNAP : HEAD;
  px.part();
  px.stamp(grid, hx + 1, hy - 1, LEG, 6, { ax: 5, ay: 5, ball: [6, 4.6, 6.4, 5.2], cast: 1 });

  // the near limbs, in front of it all
  hind(px, b.NH, 7, 0);
  arm(px, b.NF, 7.2, 0, curl, b);
  return { glow: [hx + 3, hy - 3] };
};

// the witch-fire: two teal motes at the sockets' edge
export const fx = () => {};

const STAND = { drop: 1, pitch: 0.12, arch: 0.28, neck: -0.1, hx: 0, hy: 1, jaw: 0.3, tail: -0.3, curl: 0.2, curl2: 0, fNF: [0.5, 0], fFF: [3.5, 0], fNH: [-1, 0], fFH: [2, 0] };
export const CLIPS = {
  // a hungry sway: weight shifting between the arms, the head wagging low, a blink
  idle: {
    n: 8, ms: 1500, loop: true, lag: 0.1,
    pose: (ph) => {
      const s = Math.sin(ph * Math.PI * 2), s2 = Math.sin(ph * Math.PI * 2 - 1.1);
      return { ...STAND, drop: 1 + 0.5 * (0.5 + 0.5 * s), arch: 0.28 + 0.06 * s, neck: -0.1 - 0.05 * s2, hy: 1 + 0.4 * s2, hx: 0.5 * s, jaw: 0.3 + 0.3 * Math.max(0, s2), tail: -0.3 + 0.2 * s2,
        fNF: [0.5 + 0.8 * Math.max(0, s), 0], blink: ph >= 0.72 && ph < 0.84 ? 1 : 0 };
    },
  },
  // the run: a loping gallop on arms and legs, the head low and out, the rag streaming
  walk: {
    n: 8, ms: 340, loop: true, lag: 0.09,
    pose: (ph) => {
      const g = gallop(ph, { travel: 40, duty: 0.26, lift: 4.2, flex: 0.55, flexBias: 0.24, rock: 0.2, bob: 1.5, kick: [9, 5], reach: [9, 3.5], foreX: 3, hindX: 2 });
      return { ...STAND, ...g, drop: g.drop + 1.6, neck: -0.1 + g.nod, hx: -g.g * 1.4, hy: 1.4, jaw: 0.55 + 0.25 * g.g, tail: 0.1 - g.g * 0.18, curl: -0.1 - g.g * 0.1, curl2: g.g > 0.4 ? 0.7 : 0 };
    },
  },
  attack: {
    n: 12, ms: 700, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: STAND },
      // rear up on the haunches, the near claw drawn back and high, the jaw wide
      { t: 0.26, e: "out", p: { ...STAND, rx: -2.4, drop: 2.6, pitch: -0.5, arch: 0.4, neck: 0.5, hx: -1, hy: -1.6, jaw: 1, fNF: [-5, 17], fFF: [3, 2], fNH: [-2.4, 0], fFH: [1, 0], curl2: 0.5 } },
      { t: 0.4, e: "io", p: { ...STAND, rx: -3, drop: 3, pitch: -0.56, arch: 0.4, neck: 0.55, hx: -1.4, hy: -2, jaw: 1, fNF: [-6, 19], fFF: [3, 2.5], fNH: [-2.6, 0], fFH: [1, 0], curl2: 0.6 } },
      // the rake: thrown forward and down, the whole body over the claw
      { t: 0.52, e: "in3", p: { ...STAND, rx: 3.6, drop: 1, pitch: 0.2, arch: -0.12, neck: -0.2, hx: 3, hy: 1.4, jaw: 1, fNF: [19, 3], fFF: [8, 0], fNH: [-1, 0], fFH: [3, 0], curl2: 0 } },
      { t: 0.6, e: "out", p: { ...STAND, rx: 4.4, drop: 1.4, pitch: 0.28, arch: 0, neck: -0.26, hx: 3.4, hy: 2, jaw: 0.2, fNF: [20, 0], fFF: [9, 0], fNH: [-1, 0], fFH: [3, 0], curl2: 0.9 } },
      { t: 0.8, e: "io", p: { ...STAND, rx: 1.4, drop: 1.2, jaw: 0.5, fNF: [5, 2], fFF: [4, 0], curl2: 0.3 } },
      { t: 1, e: "out", p: STAND },
    ], ph),
  },
};
