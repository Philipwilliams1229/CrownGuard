// ============ CREW FIGURE: the castle's halberdier ============
// The gate guard and the wall's sentry: an open-faced steel helm over a mail aventail, a
// tabard in the castle's colour over mail, a gold-buckled belt, and a halberd a head and a
// half taller than he is, its butt grounded beside his boot.
//   o.variant  "guard" (WALL_FOLK.guard, the crimson tabard) | "sentry" (castle.js SENTRY, blue)
// Clips: `idle` (standing to his halberd, breathing), `walk` (8 frames, the halberd carried a
// hand off the flags), `thrust` (both hands bring it down level, a lunge off the front foot,
// back to the shoulder; `hit` is the point going home).
// The halberd hangs off the NEAR hand: the pose says where that hand is, how the haft lies
// (`ha`: 0 upright, PI/2 level and pointing at the foe), how far up from the butt he holds it
// (`hg`), and whether the far hand is on the haft too (`two`, `fd` further up it). Marks:
// `tip` (the spike's point), `butt`, `grip`.
import { mat, flat } from "./pix.js";
import { solve, sampleKeys, walkPose, HUMAN, scaled, lerp, clamp } from "./rig.js";

// the same build as the other standers (fig-stander.js): 47 px to the crown under the helm
export const BONES = scaled(HUMAN, 1.2, { thigh: 9.8, shin: 9.2, ankle: 2.4, spine: 13.6, neck: 1.8, shN: -2.6, shF: 3, hipN: -1.4, hipF: 1.6 });
export const BOX = { w: 102, h: 82, ox: 32, oy: 78 };
const ARM = BONES.upper + BONES.fore, SHAFT = 64, SPIKE = 6;

const SKIN = mat("#e8b990"), EYE = flat("#2a1c2c"), LIP = flat("#b0705a"), BROW = mat("#6a4a30");
const STEEL = mat("#8a909c", { contrast: 1.2 }), MAIL = mat("#727a8a", { contrast: 1.1 }), BLADE = mat("#d8dce4", { contrast: 1.3 });
const WOOD = mat("#6a4a2e"), LEATHER = mat("#5a3c28"), GOLD = mat("#d8b34a", { contrast: 1.15 }), BOOT = mat("#2a2a30", { contrast: 1.25 }), HOSE = mat("#4e5462");
const SMEAR = flat("#fff3d2", { emis: true, line: "#c8ccd8" }), SMEAR2 = flat("#c8d2e4", { emis: true, line: "#9aa4bc" });

const COATS = { guard: "#7c3f4a", sentry: "#3a5474" };
export const VARIANTS = { guard: "Gate guard (crimson)", sentry: "Wall sentry (blue)" };
const LOOKS = new Map();
const look = (v) => {
  if (!COATS[v]) v = "guard";
  let L = LOOKS.get(v);
  if (!L) LOOKS.set(v, (L = { COAT: mat(COATS[v]) }));
  return L;
};

// the head: a round steel helm with a short peak, cheek-pieces, mail round the neck
//   M steel, W its glint, m the band's shade, c mail, S skin, s skin a tone down, N nose,
//   b brow, E eye, l lips
const HEAD = [
  ".....MMMMM...",
  "...MMMMMMMMM.",
  "..MMMWWMMMMM.",
  ".MMMMMMMMMMM.",
  ".MmmmmmmmmmmM",
  ".cMMsSSbbSbb.",
  ".cMMSSSSESSE.",
  ".ccMsSSSESSEN",
  ".ccmSSSSSSSSN",
  ".cccSSSSSSSS.",
  "..ccsSSSSll..",
  "..cccssSSS...",
];
const BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
const LEG = {
  M: { m: STEEL }, W: { m: STEEL, bias: 1 }, m: { m: STEEL, bias: -1 }, c: { m: MAIL }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, l: { m: LIP }, b: { m: BROW, fix: 1 },
};

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.3, k[0], k[1], 2.0, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 1.9, an[0], an[1] - 2.5, 1.6, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.45 + an[0] * 0.55, k[1] * 0.45 + an[1] * 0.55, 2.0, an[0], an[1], 1.8, BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.3, an[1] + 1.2, 2.8, 1.5, BOOT, z + 0.03, { bias: b, floor: 1 });
};
// the haft's own frame: u along it toward the point, v the side the axe blade is on
const axes = (ha) => ({ u: [Math.sin(ha), -Math.cos(ha)], v: [Math.cos(ha), Math.sin(ha)] });
const halberdOf = (hand, p) => {
  const ha = p.ha ?? 0, hg = p.hg ?? 35, { u, v } = axes(ha);
  const butt = [hand[0] - u[0] * hg, hand[1] - u[1] * hg], top = [butt[0] + u[0] * SHAFT, butt[1] + u[1] * SHAFT];
  return { u, v, butt, top, tip: [top[0] + u[0] * SPIKE, top[1] + u[1] * SPIKE] };
};

export const draw = (px, { sk, lag1, lag2 }, o = {}) => {
  const L = look(o.variant);
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2, 2);
  const two = (p.two || 0) > 0.6;
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the far arm, a tone down, in mail
  px.part();
  px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 2.0, MAIL, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.0, hdF[0], hdF[1], 1.7, MAIL, 1, { bias: -1 });
  px.capsule(eF[0] * 0.26 + hdF[0] * 0.74, eF[1] * 0.26 + hdF[1] * 0.74, 1.8, eF[0] * 0.14 + hdF[0] * 0.86, eF[1] * 0.14 + hdF[1] * 0.86, 1.8, LEATHER, 1.02, { bias: -1 });
  if (!two) { px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.7, SKIN, 1.6, { bias: -1 }); }

  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the mail's skirt showing under the tabard, then the tabard: belted, a gold hem
  const hemY = P[1] + 4.6, hemB = P[0] - 6.4 - vx * 1.0, hemF = P[0] + 6 - vx * 0.6;
  px.part();
  px.poly([[P[0] - 4.4, P[1] - 3], [P[0] + 4.2, P[1] - 3], [hemF - 0.4, hemY + 2.2], [hemB + 0.4, hemY + 2.2]], MAIL, 3.9, { round: 0.92, bias: -1 });
  px.part(); const coat = px._pid;
  px.poly([[C[0] - 4.6, C[1] - 2], [C[0] + 4.8, C[1] - 2], [C[0] + 5.8, C[1] + 3.2], [P[0] + 4.0, P[1] - 4], [hemF, hemY], [hemB, hemY], [P[0] - 4.2, P[1] - 4], [C[0] - 5.8, C[1] + 3.2]], L.COAT, 4, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 1.4, P[1] - 2, P[0] + 1.2 - vx * 0.5, hemY - 1.4, -1, coat);
  px.line(hemB + 0.6, hemY - 0.6, hemF - 0.6, hemY - 0.6, GOLD, 4.04);
  px.poly([[P[0] - 4.5, P[1] - 5], [P[0] + 4.3, P[1] - 5], [P[0] + 4.4, P[1] - 3], [P[0] - 4.6, P[1] - 3]], LEATHER, 4.05, { round: 0.92 });
  px.rect(P[0] + 1.2, P[1] - 5, 2, 2, GOLD, 4.06, { fix: 3 });
  // the crown's badge on his chest
  px.rect(C[0] + 0.6, C[1] + 4.6, 3, 2, GOLD, 4.06, { fix: 3 }); px.dot(C[0] + 0.6, C[1] + 3.8, GOLD, 4.06, { fix: 3 }); px.dot(C[0] + 2.6, C[1] + 3.8, GOLD, 4.06, { fix: 3 });
  // the aventail over his shoulders
  px.part();
  px.poly([[C[0] - 5.4, C[1] - 2.8], [C[0] + 5.3, C[1] - 2.8], [C[0] + 6.2, C[1] + 0.8], [C[0] + 2.6, C[1] + 2.2], [C[0] - 2.6, C[1] + 2], [C[0] - 6.3, C[1] + 1.2]], MAIL, 5, { round: 0.9, cast: 1 });

  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hy, LEG, 6, { ax: 6, ay: 12, cast: 2, ball: [6.5, 4, 7, 7] });

  // the halberd: an ash haft, a steel socket, the axe blade toward the foe, a fluke behind, a spike
  const H = halberdOf(hdN, p), { u, v, butt, top, tip } = H;
  const at = (a, b) => [top[0] + u[0] * a + v[0] * b, top[1] + u[1] * a + v[1] * b];
  px.part();
  px.capsule(butt[0], butt[1], 0.95, top[0], top[1], 0.95, WOOD, 7, { edge: true });
  px.capsule(butt[0], butt[1], 1.1, butt[0] + u[0] * 1.6, butt[1] + u[1] * 1.6, 1.1, STEEL, 7.01);
  px.part();
  px.capsule(...at(-11.5, 0), 1.25, ...at(0, 0), 1.25, STEEL, 7.05);
  px.capsule(...at(0, 0), 1.0, ...at(SPIKE, 0), 0.35, BLADE, 7.05);
  px.poly([at(-9.6, 0.6), at(-11.4, 5.4), at(-6.2, 6.6), at(-0.8, 5.2), at(-2.6, 0.6)], STEEL, 7.06, { n: [0.1, 0.2, 0.95] });
  px.line(...at(-10.6, 5.6), ...at(-1.6, 5.4), BLADE, 7.07, { fix: 4 });                    // the edge
  px.poly([at(-7.8, -0.6), at(-6.4, -4.4), at(-4.4, -0.6)], STEEL, 7.06, { n: [-0.3, -0.4, 0.86] });
  if (two) { px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.7, SKIN, 7.3, { bias: -1 }); }

  // the near arm over it all: mail, a leather glove's cuff, his fist on the haft
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.3, eN[0], eN[1], 2.1, MAIL, 8, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.1, hdN[0], hdN[1], 1.8, MAIL, 8, { cast: 2 });
  px.capsule(eN[0] * 0.28 + hdN[0] * 0.72, eN[1] * 0.28 + hdN[1] * 0.72, 1.9, eN[0] * 0.16 + hdN[0] * 0.84, eN[1] * 0.16 + hdN[1] * 0.84, 1.9, LEATHER, 8.02);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.7, 1.7, SKIN, 8.2);
  return { marks: { tip, butt, grip: [hdN[0], hdN[1]] }, H };
};

// the thrust's streak: one solid wedge trailing the blade on the frame the point goes home
export const fx = (px, { ph }, info, clip) => {
  if (clip !== "thrust" || ph < 0.46 || ph > 0.54 || !info.H) return;
  const { u, v, top } = info.H, at = (a, b) => [top[0] + u[0] * a + v[0] * b, top[1] + u[1] * a + v[1] * b];
  px.poly([at(-11.6, 5.6), at(-27, 3.4), at(-12, 1.6)], SMEAR2, 20, { noLine: true });
  px.poly([at(-11.6, 4.8), at(-22, 3.4), at(-12, 2.6)], SMEAR, 20.1, { noLine: true });
};

// ---- poses ---------------------------------------------------------------------------------
const TAU = Math.PI * 2;
const aim = (s, t, flip = 0) => { const dx = t[0] - s[0], dy = t[1] - s[1]; return [Math.atan2(dx, dy), clamp(Math.hypot(dx, dy) / ARM, 0.25, 0.97), flip]; };
const mixA = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), t < 0.5 ? a[2] : b[2]];
const bump = (ph, a, b) => (ph <= a || ph >= b ? 0 : Math.sin(((ph - a) / (b - a)) * Math.PI));
const STAND = { fN: [-2.8, 0], fF: [3.2, 0] };
// b.n: where the near hand is (art px from the feet's centre); b.ha, b.hg: how the haft lies in
// it; b.two 0..1: the far hand comes onto the haft, b.fd further toward the point. b.aF: the
// far arm when it is free.
const hold = (b) => {
  const p = { ...STAND, ...b }, s = solve(p, BONES), free = b.aF || [0.14, 0.95, 0];
  p.aN = aim(s.sN, b.n);
  if ((b.two || 0) > 0) { const { u } = axes(b.ha ?? 0), d = b.fd ?? 12; p.aF = mixA(free, aim(s.sF, [b.n[0] + u[0] * d, b.n[1] + u[1] * d]), clamp(b.two, 0, 1)); }
  else p.aF = free;
  return p;
};
const REST = { n: [11, -35], ha: 0, hg: 35, two: 0, fd: 12, twist: 0.6, rx: 0, lean: 0, drop: 0, hx: 0 };

export const CLIPS = {
  // standing to his halberd: the butt stays where it is planted, he breathes against it
  idle: {
    n: 8, ms: 2400, loop: true, lag: 0.1,
    pose: (ph) => { const b = 0.5 - 0.5 * Math.cos(ph * TAU); return hold({ ...REST, rise: 0.9 * b, rx: -0.5 * b, blink: ph > 0.6 && ph < 0.74 ? 1 : 0 }); },
  },
  // the beat along the wall: the halberd upright, carried a hand off the flags, the far arm swinging
  walk: {
    n: 8, ms: 760, loop: true, lag: 0.08,
    pose: (ph) => {
      const w = walkPose(ph, { stride: 6, lift: 3, swing: 0.4, bob: 1.2, lean: 0.05 }), a = Math.cos(ph * TAU);
      return hold({ ...w, twist: 0.5 + w.twist * 0.4, n: [10.5, -35.5 + w.drop], ha: 0.035 * a, hg: 32, aF: w.aF });
    },
  },
  // the thrust: tipped down into both hands, drawn back level, driven home off the front foot,
  // held a beat, back up to the shoulder
  thrust: {
    n: 13, ms: 950, loop: false, lag: 0.05, hit: 0.5,
    pose: (ph) => {
      const k = sampleKeys([
        { t: 0, p: REST },
        { t: 0.2, e: "io", p: { n: [3, -27], ha: 1.0, hg: 24, two: 1, fd: 13, rx: -1, lean: -0.05, twist: 0.2, drop: 0.2 } },
        { t: 0.4, e: "out", p: { n: [-4, -27.5], ha: 1.5, hg: 24, two: 1, fd: 13.5, rx: -2.4, lean: -0.1, twist: -0.6, drop: 0.6, fF: [3.2, 0] } },
        { t: 0.5, e: "in3", p: { n: [9.5, -28.5], ha: 1.58, hg: 16, two: 1, fd: 11, rx: 3.2, lean: 0.2, twist: 0.9, drop: 1.4, hx: 0.5, fF: [7.4, 0] } },
        { t: 0.62, e: "out", p: { n: [10.5, -28.2], ha: 1.6, hg: 16, two: 1, fd: 11, rx: 3.6, lean: 0.21, twist: 0.9, drop: 1.5, hx: 0.5, fF: [7.4, 0] } },
        { t: 0.82, e: "io", p: { n: [5, -29], ha: 0.9, hg: 26, two: 1, fd: 12, rx: 0.6, lean: 0.03, twist: 0.4, drop: 0.3, fF: [3.6, 0] } },
        { t: 1, e: "io", p: REST },
      ], ph);
      k.fF = [k.fF[0], 2.2 * bump(ph, 0.41, 0.5) + 1.6 * bump(ph, 0.64, 0.82)];
      return hold(k);
    },
  },
};
