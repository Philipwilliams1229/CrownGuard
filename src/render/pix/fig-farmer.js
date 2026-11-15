// ============ FIGURE: the militia's farmer (and the Levy's yeoman) ============
// A countryman called to the horn: a broad straw hat, a tan jerkin with the sleeves rolled
// to bare forearms, brown breeches, leg wraps and clogs, a rope belt. He carries a pitchfork
// (iron three-tine head on an ash shaft). Plainer than any knight: no metal but the fork.
//   o.variant  "farmer" (the pitchfork; the default)
//              "yeoman" (the Levy's swordsman: a short sword and a round wooden buckler
//              in place of the fork, the same clothes)
// Clips (shared by both): idle (the weapon grounded, a breath, a blink), walk (8 frames, the
// fork carried slanted ahead), attack (drawn back, a two-handed jab driven home, hauled up
// again). The blow's `hit` is the point going in, 0.52. Facing +x.
import { mat, flat } from "./pix.js";
import { solve, sampleKeys, walkPose, HUMAN, scaled, clamp } from "./rig.js";

const SKIN = mat("#e8b990"), EYE = flat("#2a1c2c"), STUB = mat("#b88c6a"), BROW = mat("#6a4a2e");
const STRAW = mat("#d8b860", { contrast: 1.2 }), STRAWD = mat("#a8883c"), BAND = mat("#6a3e2c"), HAIRN = mat("#8a6234");
const JERKIN = mat("#9a8a62", { contrast: 1.15 }), SHIRT = mat("#d4c8a8", { contrast: 1.1 }), BREECH = mat("#5a4a3a", { contrast: 1.1 }), WRAP = mat("#cfc2a0");
const CLOG = mat("#4a3220", { contrast: 1.2, floor: 1 }), ROPE = mat("#b49a64"), ASH = mat("#9a7a4a"), IRON = mat("#b8bcc4", { contrast: 1.3 }), IRONK = mat("#7c8290");
const BLADE = mat("#d0d4dc", { contrast: 1.35 }), LEATHER = mat("#5a3c28"), OAK = mat("#8a5e34", { contrast: 1.15 });
const SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });
export const VARIANTS = { farmer: "Pitchfork farmer", yeoman: "Levy yeoman (sword and buckler)" };

// the head: H straw, h its shadowed underside, b the hat band, S skin, s skin a tone down,
// N nose, B brow, E eye, e shut, z stubble, l lips, r hair at the nape
const HEAD = [
  ".....HHHHH.....",
  "....HHHHHHH....",
  "...HHHHHHHHH...",
  "...bbbbbbbbb...",
  "HHHHHHHHHHHHHHH",
  "..hhhhhhhhhhh..",
  "..rrsBBssBBs...",
  "..rrSSESSSES...",
  "..rrsSESSSESN..",
  "..rsSSSSSSSSN..",
  "..rzSSSSzzzS...",
  "...rsSSSllS....",
  "....rssSSS.....",
];
const BLINK = HEAD.map((r) => r.replace(/E/g, "e"));
const LEG = {
  H: { m: STRAW }, h: { m: STRAWD }, b: { m: BAND }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, B: { m: BROW, fix: 1 },
  E: { m: EYE }, e: { m: SKIN, fix: 0 }, z: { m: STUB, fix: 1 }, l: { m: STUB, fix: 2 }, r: { m: HAIRN },
};

export const BONES = scaled(HUMAN, 0.95, { shN: -2.8, shF: 2.8, hipN: -1.3, hipF: 1.5, neck: 1.35 });
export const BOX = { w: 100, h: 72, ox: 30, oy: 62 };
const ARM = BONES.upper + BONES.fore, LONG = 42;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const axes = (ha) => ({ u: [Math.sin(ha), -Math.cos(ha)], v: [Math.cos(ha), Math.sin(ha)] });

const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.2, k[0], k[1], 1.9, BREECH, z, { bias: b });
  px.capsule(k[0], k[1], 1.8, an[0], an[1] - 2, 1.5, BREECH, z, { bias: b });
  px.capsule(k[0] * 0.55 + an[0] * 0.45, k[1] * 0.55 + an[1] * 0.45, 1.9, an[0], an[1] - 1.6, 1.7, WRAP, z + 0.01, { bias: b });
  px.ellipse(an[0] + 0.6, an[1] - 0.2, 2.3, 1.7, CLOG, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.6, an[1] + 0.9, 2.6, 1.3, CLOG, z + 0.03, { bias: b, floor: 1 });
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const yeo = o.variant === "yeoman";
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2, 2), vx2 = cl(lag1.C[0] - lag2.C[0], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the far arm: jerkin sleeve to the elbow, bare forearm, a tone down
  px.part();
  px.capsule(sF[0], sF[1], 2.0, eF[0], eF[1], 1.8, JERKIN, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.8, hdF[0], hdF[1], 1.5, SKIN, 1, { bias: -1 });

  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the jerkin to the hip, a frayed hem, a rope belt with a knot
  const hem = P[1] + 3.6, hemB = P[0] - 5 - vx * 0.8, hemF = P[0] + 4.8 - vx * 0.6;
  px.part(); const jk = px._pid;
  px.poly([[C[0] - 4.2, C[1] - 1.8], [C[0] + 4.4, C[1] - 1.8], [C[0] + 5.2, C[1] + 3], [hemF, hem], [hemF - 2.2, hem + 1.2], [P[0] + 0.2 - vx * 0.5, hem], [hemB + 2.4, hem + 1.2], [hemB, hem], [C[0] - 5.2, C[1] + 3]], JERKIN, 4, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 1.2, P[1] - 1, P[0] + 0.8 - vx * 0.5, hem - 0.6, -1, jk);
  px.line(C[0] + 0.6, C[1] - 1.4, C[0] + 1.2, C[1] + 3.4, SHIRT, 4.05);                                 // the open laces down the chest
  px.line(P[0] - 4.6, P[1] - 2.4, P[0] + 4.6, P[1] - 2.4, ROPE, 4.1);
  px.dot(P[0] + 2.4, P[1] - 1.4, ROPE, 4.12, { fix: 2 }); px.dot(P[0] + 2.4, P[1] - 0.4, ROPE, 4.12, { fix: 1 });
  // the collar of the shirt
  px.part();
  px.poly([[C[0] - 3.4, C[1] - 2.8], [C[0] + 3.4, C[1] - 2.8], [C[0] + 3.8, C[1] - 0.4], [C[0] - 3.8, C[1] - 0.2]], SHIRT, 5, { round: 0.9, cast: 1 });

  // the head and its hat
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, LEG, 6, { ax: 7, ay: 12, ball: [7.5, 5.5, 6.4, 6.4], cast: 2 });

  // the weapon: from the near hand along the haft
  const ha = p.ha ?? 0, hg = p.hg ?? 17, { u, v } = axes(ha);
  const ov = (p.over || 0) > 0.5, zs = ov ? 8.6 : 7;
  let info = {};
  if (!yeo) {
    const butt = [hdN[0] - u[0] * hg, hdN[1] - u[1] * hg], top = [butt[0] + u[0] * LONG, butt[1] + u[1] * LONG];
    const at = (a, b) => [top[0] + u[0] * a + v[0] * b, top[1] + u[1] * a + v[1] * b];
    px.part();
    px.capsule(butt[0], butt[1], 0.95, top[0], top[1], 0.95, ASH, zs, { edge: true });
    px.part();
    px.capsule(...at(-3.4, 0), 1.2, ...at(0.6, 0), 1.2, IRONK, zs + 0.05);
    px.capsule(...at(0.4, -3), 0.8, ...at(0.4, 3), 0.8, IRON, zs + 0.06, { edge: true });
    px.capsule(...at(0.4, -3), 0.7, ...at(8.4, -3), 0.5, IRON, zs + 0.06, { edge: true });
    px.capsule(...at(0.4, 3), 0.7, ...at(8.4, 3), 0.5, IRON, zs + 0.06, { edge: true });
    px.capsule(...at(0.4, 0), 0.8, ...at(10.2, 0), 0.4, IRON, zs + 0.07, { edge: true });
    info = { H: { u, v, top }, tip: at(10.2, 0) };
  } else {
    const B = (t, s = 0) => [hdN[0] + u[0] * t + v[0] * s, hdN[1] + u[1] * t + v[1] * s];
    px.part();
    px.capsule(...B(2.4), 1.15, ...B(14), 0.95, BLADE, zs, { edge: true });
    px.capsule(...B(14), 0.95, ...B(16.2), 0.3, BLADE, zs, { edge: true });
    px.part();
    px.capsule(...B(-3), 0.9, ...B(1.4), 0.9, LEATHER, zs + 0.02);
    px.capsule(...B(1.8, -2.4), 0.75, ...B(1.8, 2.4), 0.75, IRONK, zs + 0.05, { edge: true });
    px.ellipse(...B(-3.4), 1.0, 1.0, IRONK, zs + 0.05);
    info = { H: { u, v, top: B(0) }, tip: B(16.2) };
  }
  // the buckler on the far arm (yeoman): oak planks, an iron boss and rim
  if (yeo) {
    const bx = hdF[0] + 2.2, by = hdF[1] - 0.4;
    px.part(); const bid = px._pid;
    px.ellipse(bx, by, 4.8, 5.2, IRONK, 8.5, { round: 0.7 });
    px.ellipse(bx, by, 3.8, 4.2, OAK, 8.52, { round: 0.8 });
    px.toneLine(bx - 1.2, by - 3.6, bx - 1.4, by + 3.6, -1, bid);
    px.dot(bx + 0.4, by, IRON, 8.6, { fix: 4 }); px.dot(bx + 1.2, by, IRONK, 8.6, { fix: 2 });
  }

  // the near arm: rolled sleeve, bare forearm, the fist on the haft (over the haft in the jab)
  const zn = ov ? 8.9 : 8;
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.2, eN[0], eN[1], 1.9, JERKIN, zn, { cast: 2 });
  px.capsule(eN[0], eN[1], 1.9, hdN[0], hdN[1], 1.6, SKIN, zn, { cast: 2 });
  px.capsule(eN[0] * 0.8 + sN[0] * 0.2, eN[1] * 0.8 + sN[1] * 0.2, 2.0, eN[0] * 0.72 + sN[0] * 0.28, eN[1] * 0.72 + sN[1] * 0.28, 2.0, SHIRT, zn + 0.02);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.8, 1.7, SKIN, zn + 0.2);
  if (!yeo) { px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.5, SKIN, 6.8, { bias: -1 }); }
  return info;
};

// the jab's streak: a wedge trailing the point on the frames it goes home
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "attack" || ph < 0.44 || ph > 0.62 || !info.H) return;
  const { u, v } = info.H, t = info.tip, at = (a, b) => [t[0] + u[0] * a + v[0] * b, t[1] + u[1] * a + v[1] * b];
  px.poly([at(-1, 2.4), at(-18, 1.6), at(-3, 0.4)], SMEAR2, 20, { noLine: true });
  px.poly([at(-1, 1.8), at(-13, 1.3), at(-3, 0.8)], SMEAR, 20.1, { noLine: true });
};

// ---- poses: where the near hand goes, how the haft lies in it, the far hand a step up it -------
const TAU = Math.PI * 2;
const aim = (s, t, flip = 0) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), clamp(Math.hypot(dx, dy) / ARM, 0.25, 0.97), flip]; };
const STAND = { fN: [-2.4, 0], fF: [3, 0] };
const hold = (b) => {
  const p = { ...STAND, ...b }, s = solve(p, BONES), { u, v } = axes(b.ha), fd = b.fd ?? 5.5;
  p.aN = aim(s.sN, b.n);
  p.aF = aim(s.sF, [b.n[0] + u[0] * fd + v[0] * (b.fs ?? 0), b.n[1] + u[1] * fd + v[1] * (b.fs ?? 0)]);
  return p;
};
const REST = { n: [11, -19], ha: 0.08, hg: 17, fd: 6, fs: 0.4, twist: 0.45, rx: 0, lean: 0.02, drop: 0, hx: 0 };

export const CLIPS = {
  // the weapon grounded beside him: a breath, a blink, the weight shifting a hair
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.1,
    pose: (ph) => { const b = 0.5 - 0.5 * Math.cos(ph * TAU); return hold({ ...REST, rise: 0.8 * b, rx: -0.2 * b, n: [11, -19 - 0.3 * b], blink: ph > 0.62 && ph < 0.74 ? 1 : 0 }); },
  },
  // the march: the fork carried slanted ahead, the far hand steadying it, the body's bob in the hands
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 5.2, lift: 2.8, swing: 0.3, bob: 1.2, lean: 0.08 }), a = Math.cos(ph * TAU), d = w.drop;
      return hold({ ...w, twist: 0.4 + w.twist * 0.25, n: [9.5, -20 + d], ha: 0.5 + 0.03 * a, hg: 17, fd: 6.5, fs: 0.2, blink: 0 });
    },
  },
  // drawn back, held a beat, the two-handed jab driven out level, held, hauled up again
  attack: {
    n: 11, ms: 800, loop: false, lag: 0.06, hit: 0.52,
    pose: (ph) => hold(sampleKeys([
      { t: 0, p: REST },
      { t: 0.26, e: "io", p: { n: [3, -24], ha: 1.15, hg: 15, fd: 8, fs: 0.3, rx: -1.3, lean: -0.08, twist: -0.1, drop: 0.5 } },
      { t: 0.42, e: "out", p: { n: [0.5, -24.5], ha: 1.3, hg: 15, fd: 8, fs: 0.3, rx: -2, lean: -0.13, twist: -0.4, drop: 0.8 } },
      { t: 0.52, e: "in3", p: { n: [13, -25], ha: 1.5, hg: 12, fd: 8, fs: 0.3, over: 1, rx: 2.8, lean: 0.2, twist: 0.8, drop: 1.5, hx: 0.5, fF: [6.4, 0] } },
      { t: 0.64, e: "out", p: { n: [14, -25], ha: 1.52, hg: 12, fd: 8, fs: 0.3, over: 1, rx: 3.1, lean: 0.21, twist: 0.8, drop: 1.6, hx: 0.6, fF: [6.4, 0] } },
      { t: 0.84, e: "io", p: { n: [8, -21], ha: 0.6, hg: 17, fd: 6, fs: 0.3, over: 0, rx: 0.6, lean: 0.05, twist: 0.4, drop: 0.3, fF: [4, 0] } },
      { t: 1, e: "io", p: REST },
    ], ph)),
  },
};
