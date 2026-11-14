// ============ CREW FIGURE: the hooded master of the Assassin's Covert ============
// The blade on watch before the tent (halls/assassin.js; the old figure was
// drawHooded in folk-gunners.js). A deep cowl running into a short mantle, the
// face in its shadow (a dark brow, two eyes, the nose and jaw out at the front
// edge), a close coat, the house's scarf knotted at the nape with its two tails
// down his back, arms folded with a bare knife in the near hand, its blade
// laid up against the far shoulder.
//   idle    arms folded: breath, the weight settling back, the knife rolled a
//           hair in the fingers (the hall glints its edge at `glint`)
//   turn    now and then the near hand comes off his chest, he rolls the blade
//           over to look down its edge, flips it once, catches it and folds
//           his arms again (the hall plays it by phase, fracFrame)
//   vanish  the work is on: he drops into a crouch, the blade reversed and
//           low, and the hall's smoke takes him
// Looks (o.variant): "c" the Covert's dusk violet (the default), "g" the
// Nightshade Guild's green. Colours are today's CREW_FOLK.blade / bladeGuild.
// Marks: glint (the blade's edge, a third back from its point), hand (the near fist).
import { mat, flat } from "./pix.js";
import { sampleKeys, scaled, HUMAN } from "./rig.js";

// today's palettes (folk-kit.js CREW_FOLK.blade, CREW_FOLK.bladeGuild)
const LOOKS = {
  c: { skin: "#e8b990", hood: "#2a2434", coat: "#3a3244", boots: "#1e1a26", trim: "#6a5a80" },
  g: { skin: "#e8b990", hood: "#2e3a2a", coat: "#3a4a34", boots: "#1e241c", trim: "#8a6aa8" },
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const lighten = (h, k) => hex(rgb(h).map((v) => v + (255 - v) * k));
const darken = (h, k) => hex(rgb(h).map((v) => v * (1 - k)));
// the same colour with more of its own hue (a dark cloth lifted for its sunlit side must not go grey)
const rich = (h, k) => { const c = rgb(h), m = (c[0] + c[1] + c[2]) / 3; return hex(c.map((v) => m + (v - m) * k)); };

const STEEL = mat("#c8ccd4", { contrast: 1.2 }), GRIP = mat("#5a4636"), SHEATH = mat("#2a2026"), GOLD = mat("#d8b34a");
const EYE = flat("#1c1420"), VOID = flat("#15101a"), GLINT = flat("#ffffff", { emis: true, line: "#c8ccd4" });

// each look's materials, built once
const KITS = new Map();
const kitOf = (v) => {
  const key = LOOKS[v] ? v : "c";
  let K = KITS.get(key);
  if (K) return K;
  const L = LOOKS[key];
  // Dark cloth: a ramp's upper tones lean warm and pale, so every cloth here is shaded a
  // tone DOWN on a slightly lifted base (DK), and the cowl's sunlit pixels are a lighter
  // material of their own (HI), never the ramp's top: the dusk colour stays the dusk colour.
  const COWL = mat(lighten(L.hood, 0.12)), HI = mat(lighten(L.hood, 0.3)), COAT = mat(lighten(L.coat, 0.1)), SLEEVE = mat(lighten(rich(L.coat, 1.5), 0.24)), HOSE = mat(lighten(rich(L.coat, 1.3), 0.1));
  const BOOT = mat(lighten(L.boots, 0.12)), TRIM = mat(L.trim), SCARF = mat(lighten(L.trim, 0.08)), SKIN = mat(L.skin);
  // the cowl's grid, toned by hand: C cloth, c its shade, x the deep fold; the sunlit band is
  // A when the sun is behind him (facing east) and F when he is re-lit facing west; L the lip
  // over the brow (lit facing west); I the dark inside. The face stands in the cowl's shade:
  // d the shadowed brow, s shade, S the lit jaw, N the nose; E an eye, m the mouth.
  const head = (flip) => ({
    C: { m: COWL, fix: 2 }, c: { m: COWL, fix: 1 }, x: { m: COWL, fix: 0 },
    A: flip ? { m: COWL, fix: 1 } : { m: HI, fix: 2 }, F: flip ? { m: HI, fix: 2 } : { m: COWL, fix: 2 }, L: { m: HI, fix: flip ? 3 : 2 },
    I: { m: VOID },
    d: { m: SKIN, fix: 0 }, s: { m: SKIN, fix: 1 }, S: { m: SKIN, fix: 2 }, N: { m: SKIN, fix: 3 }, n: { m: SKIN, fix: 2 },
    E: { m: EYE }, m: { m: SKIN, fix: 0 },
  });
  K = { COWL, HI, COAT, SLEEVE, HOSE, BOOT, TRIM, SCARF, SKIN, head: [head(false), head(true)] };
  KITS.set(key, K);
  return K;
};
const DK = { bias: -1, floor: 1 };

// Facing +x, a quarter turned. The cowl covers the crown and the near side and
// stops behind the jaw; its lip stands over the brow; the nose is the head's
// front-most pixel.
const HEAD = [
  "....CCCCC....",
  "..CAAACCFFC..",
  ".CAACCCCCFFL.",
  ".CACCCCcLLLLL",
  "CCCCCcLLIIIIL",
  "CCCCcLLIdddd.",
  "CCCCcLIdEssE.",
  "cCCCcLIsEsSEN",
  "cCCCcLIsSSSSn",
  "ccCCcLIsSSSS.",
  ".cCCCcLIsmmS.",
  ".ccCCcLIISS..",
  "..ccCCcLI....",
  "..xccCCCc....",
];
const BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "s") : i === 7 ? r.replace(/E/g, "d") : r));

export const BOX = { w: 40, h: 56, ox: 15, oy: 52 };
export const BONES = scaled(HUMAN, 1.2, { shN: -2.6, shF: 3.0, hipN: -1.4, hipF: 1.6 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const leg = (px, K, h, k, an, z, b) => {
  const o = { bias: b - 1, floor: 1 }, c = [k[0] * 0.4 + an[0] * 0.6, k[1] * 0.4 + an[1] * 0.6];
  px.part();
  px.capsule(h[0], h[1], 2.4, k[0], k[1], 2.1, K.HOSE, z, o);
  px.capsule(k[0], k[1], 2, an[0], an[1] - 3, 1.8, K.HOSE, z, o);
  // a soft boot to the calf, its cuff bound in the house's colour
  px.capsule(c[0], c[1], 2.1, an[0], an[1], 1.9, K.BOOT, z + 0.02, o);
  px.ellipse(an[0] + 1.4, an[1] + 1.1, 3, 1.6, K.BOOT, z + 0.03, o);
  px.line(c[0] - 1.6, c[1], c[0] + 1.8, c[1], K.TRIM, z + 0.04, { bias: b - 1 });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const K = kitOf(o.variant), LEG = K.head[o.flip ? 1 : 0];
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5);
  const vy = cl(C[1] - lag1.C[1], -2, 2), sway = lag1.p.sway || 0, sway2 = lag2.p.sway || 0;
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // ---- the scarf's knot at his nape and its tail down his back, a beat behind him
  {
    const k0 = [hx - 5.6, hy - 0.6], d1 = -vx * 1.4 + sway * 0.3 + vy * 0.4, d2 = -vx * 1.4 - vx2 * 2 + sway2 * 0.7 + vy * 0.8;
    const fly = p.fly || 0;      // the crouch throws it up and back
    const m1 = [k0[0] - 2 + d1 * 0.5 - fly * 2.6, k0[1] + 3.6 - fly * 4], e1 = [k0[0] - 2.6 + d2 - fly * 6, k0[1] + 8.6 - fly * 9.4];
    px.part();
    px.capsule(k0[0], k0[1], 1.2, m1[0], m1[1], 1, K.SCARF, 0.5, { fix: 2 });
    px.capsule(m1[0], m1[1], 1, e1[0], e1[1], 0.6, K.SCARF, 0.5, { fix: 1 });
  }

  // ---- the far arm's upper half, behind him
  px.part();
  px.capsule(sF[0], sF[1], 2.3, eF[0], eF[1], 2.2, K.SLEEVE, 1, { bias: -3, floor: 1 });

  // ---- legs
  leg(px, K, hF, kF, anF, 2, -1);
  leg(px, K, hN, kN, anN, 3, 0);

  // ---- the coat: close in the body, belted, a short skirt split at the front
  const hemB = P[0] - 5.6 - vx * 1.1, hemF = P[0] + 5.6 - vx * 0.7, hemY = P[1] + 4.6;
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 4.6, C[1] - 2], [C[0] + 4.8, C[1] - 2], [C[0] + 5.6, C[1] + 3.5], [P[0] + 4.6, P[1] - 3.2], [hemF, hemY], [hemF - 3, hemY + 1], [P[0] + 0.6 - vx, hemY - 0.4], [hemB + 2.6, hemY + 1], [hemB, hemY], [P[0] - 4.9, P[1] - 3.2], [C[0] - 5.6, C[1] + 3.5]], K.COAT, 4, { round: 0.92, cast: 2, ...DK });
  px.toneLine(P[0] + 0.8, P[1] - 1, P[0] + 0.6 - vx, hemY - 0.6, -1, coat);
  px.toneLine(C[0] + 3.6, C[1] + 3, P[0] + 3.4, P[1] - 4.4, 1, coat);
  // the belt and its buckle
  px.poly([[P[0] - 5, P[1] - 4.8], [P[0] + 4.7, P[1] - 4.8], [P[0] + 4.7, P[1] - 2.8], [P[0] - 5, P[1] - 2.8]], K.TRIM, 4.05, { round: 0.92, bias: -1 });
  px.rect(P[0] + 1.4, P[1] - 4.8, 2, 2, GOLD, 4.06, { fix: 3 });

  // ---- the mantle: the cowl's own cloth over both shoulders
  px.part(); const man = px._pid;
  px.poly([[C[0] - 5.6, C[1] - 3], [C[0] + 5.4, C[1] - 3], [C[0] + 6.4, C[1] + 1.2], [C[0] + 4.6, C[1] + 3], [C[0] + 0.6 - vx * 0.4, C[1] + 4], [C[0] - 3.6, C[1] + 3.4], [C[0] - 6.8, C[1] + 1.8]], K.COWL, 5, { round: 0.9, cast: 1, bias: -2, floor: 1 });
  px.toneLine(C[0] - 6.4, C[1] + 2.2, C[0] - 3.6, C[1] + 3.4, -1, man);
  px.toneLine(C[0] - 3.6, C[1] + 3.4, C[0] + 0.6 - vx * 0.4, C[1] + 4, -1, man);

  // ---- the far forearm across his chest (the hand tucked under the near elbow unless it is out)
  px.part();
  px.capsule(eF[0], eF[1], 2.1, hdF[0], hdF[1], 1.9, K.SLEEVE, 6, { bias: -3, floor: 1, cast: 1 });
  { const a = mix(eF, hdF, 0.55), b = mix(eF, hdF, 0.86); px.capsule(a[0], a[1], 2, b[0], b[1], 1.9, K.TRIM, 6.02, { bias: -2 }); }
  if ((p.farHand || 0) > 0.5) { px.part(); px.ellipse(hdF[0], hdF[1], 1.7, 1.7, K.SKIN, 6.2, { bias: -1 }); }

  // ---- the head in its cowl; the scarf's turn at his throat, under the jaw
  px.part();
  px.poly([[hx - 4, hy - 0.4], [hx + 3.6, hy - 0.2], [hx + 3, hy + 1.8], [hx - 4, hy + 1.6]], K.SCARF, 8.9, { round: 0.8 });
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, LEG, 9, { ax: 7, ay: 13, cast: 1 });

  // ---- the knife in the near fist: the blade from the fist along `kn` (0 = level at the foe, -PI/2 = up)
  const ka = p.kn ?? -1.25, toss = p.toss || 0;
  const kc = [hdN[0] + (p.kx || 0), hdN[1] - toss];       // where the grip is (it leaves the hand on the flip)
  const ku = [Math.cos(ka), Math.sin(ka)];
  const tip = [kc[0] + ku[0] * 8.2, kc[1] + ku[1] * 8.2], glint = [kc[0] + ku[0] * 5.6, kc[1] + ku[1] * 5.6];
  {
    const z = toss > 0.5 ? 9.6 : 7.5;
    px.part();
    px.capsule(kc[0] - ku[0] * 2.2, kc[1] - ku[1] * 2.2, 0.9, kc[0] + ku[0] * 1.2, kc[1] + ku[1] * 1.2, 0.9, GRIP, z);
    px.dot(kc[0] - ku[0] * 2.8, kc[1] - ku[1] * 2.8, STEEL, z + 0.01, { fix: 3 });
    px.part();
    px.capsule(kc[0] + ku[0] * 1.6, kc[1] + ku[1] * 1.6, 1.1, tip[0], tip[1], 0.5, STEEL, z + 0.02, { edge: true });
    px.line(kc[0] + ku[0] * 2.2, kc[1] + ku[1] * 2.2, kc[0] + ku[0] * 7.4, kc[1] + ku[1] * 7.4, STEEL, z + 0.03, { fix: 4 });
    if ((p.gl || 0) > 0.5) px.dot(glint[0], glint[1], GLINT, z + 0.05, { noLine: true });
  }

  // ---- the near arm over it all: sleeve, a bound wrist, the fist
  px.part();
  px.capsule(sN[0], sN[1] + 0.4, 2.5, eN[0], eN[1], 2.3, K.SLEEVE, 8, { cast: 2, bias: -2, floor: 1 });
  px.capsule(eN[0], eN[1], 2.3, hdN[0], hdN[1], 1.9, K.SLEEVE, 8, { cast: 2, bias: -2, floor: 1 });
  { const a = mix(eN, hdN, 0.56), b = mix(eN, hdN, 0.84); px.capsule(a[0], a[1], 2.2, b[0], b[1], 2, K.TRIM, 8.02, { bias: -1 }); }
  px.part(); px.ellipse(hdN[0], hdN[1], 1.7, 1.7, K.SKIN, 8.2, { cast: 1 });

  return { marks: { glint, hand: [hdN[0], hdN[1]], tip } };
};

// ---- the clips ---------------------------------------------------------------
// arms folded: the upper arms down his sides, the near forearm laid up across his chest
// with the knife against the far shoulder, the far forearm under it
const FOLD = { rx: -0.5, lean: -0.03, twist: 0.9, hx: 0.4, hy: 0, aN: [0.8, 0.62, 0], aF: [-0.5, 0.5, 1], fN: [-3, 0], fF: [2.6, 0], kn: -1.2, toss: 0, kx: 0, gl: 0, sway: 0, fly: 0, farHand: 0, blink: 0 };
const TAU = Math.PI * 2;
export const CLIPS = {
  idle: {
    n: 8, ms: 2800, loop: true, lag: 0.12,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b, w = Math.sin(ph * TAU - 1.1);
      return { ...FOLD, rx: -0.5 - 0.5 * u, drop: 0.5 * u, rise: 0.7 * (0.5 + 0.5 * w), lean: -0.03 - 0.02 * u, kn: -1.2 + 0.1 * w, sway: Math.sin(ph * TAU - 2), blink: ph > 0.6 && ph < 0.7 ? 1 : 0 };
    },
  },
  // the knife turned over: unfold, a slow roll to look down the edge, one quick flip, the catch, fold
  turn: {
    n: 16, ms: 2100, loop: false, lag: 0.05,
    pose: (ph) => sampleKeys([
      { t: 0, p: FOLD },
      // the hand comes off his chest
      { t: 0.14, e: "io", p: { ...FOLD, aN: [1.02, 0.66, 0], kn: -1.45, hy: 0.4 } },
      // held out before him, the blade rolled over slowly: point up, then level, edge to the light
      { t: 0.3, e: "out", p: { ...FOLD, rx: -0.2, aN: [1.18, 0.74, 0], kn: -1.75, hy: 0.8, hx: 0.8 } },
      { t: 0.5, e: "io", p: { ...FOLD, rx: -0.2, aN: [1.14, 0.76, 0], kn: -0.35, hy: 1, hx: 0.9, gl: 1 } },
      // the dip before the flip
      { t: 0.58, e: "io", p: { ...FOLD, rx: -0.2, drop: 0.3, aN: [1.02, 0.74, 0], kn: -0.1, hy: 1, hx: 0.9 } },
      // up it goes, a full turn in the air (the angle runs on past a circle)
      { t: 0.66, e: "out", p: { ...FOLD, rx: -0.3, aN: [1.26, 0.76, 0], kn: -0.1 - TAU * 0.55, toss: 4.2, kx: 0.6, hy: 0.2, hx: 0.6 } },
      // caught, point up; the hand gives under it
      { t: 0.74, e: "in", p: { ...FOLD, rx: -0.2, drop: 0.4, aN: [1.04, 0.72, 0], kn: -1.3 - TAU, hy: 0.8, hx: 0.6 } },
      { t: 0.84, e: "out", p: { ...FOLD, aN: [1.1, 0.7, 0], kn: -1.5 - TAU, hy: 0.4, gl: 1 } },
      { t: 1, e: "io", p: { ...FOLD, kn: -1.2 - TAU } },
    ], ph),
  },
  // the drop into the crouch (the hall fades him into its smoke over these)
  vanish: {
    n: 5, ms: 260, loop: false, lag: 0.2,
    pose: (ph) => sampleKeys([
      { t: 0, p: { ...FOLD, rx: 0.4, drop: 1.6, lean: 0.1, aN: [0.5, 0.7, 0], aF: [0.4, 0.6, 0], kn: 2.6, hy: 0.6, hx: 1, farHand: 1, fN: [-3, 0], fF: [3, 0], fly: 0.3 } },
      { t: 0.5, e: "out", p: { ...FOLD, rx: 1.6, drop: 5.4, lean: 0.34, twist: 0.6, aN: [0.1, 0.8, 0], aF: [0.9, 0.7, 0], kn: 2.9, hy: 1.6, hx: 2.2, farHand: 1, fN: [-4.4, 0], fF: [4.6, 0], fly: 0.8 } },
      { t: 1, e: "io", p: { ...FOLD, rx: 2.4, drop: 6.6, lean: 0.42, twist: 0.8, aN: [-0.2, 0.84, 0], aF: [1.05, 0.74, 0], kn: 3.05, hy: 2, hx: 2.6, farHand: 1, fN: [-4.8, 0], fF: [5.4, 0], fly: 1 } },
    ], ph),
  },
};
