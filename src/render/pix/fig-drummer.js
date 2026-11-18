// ============ FIGURE: the King's Band's drummers ============
// Crew figures of the band hall (render/halls/band.js, through pix/crews.js), at the bowman's
// size (HUMAN x 1.2). One module, four roles, read from `o.variant` ("<role>" | "<role>:b" |
// "<role>:gold"):
//   drum     a side drum slung at the right hip, tipped toward him, two sticks, hands alternating
//            (the near hand strikes on beat 1, the far on beat 2); a shako
//   bass     a big bass drum on his chest, the face toward the foe; ONE padded beater in the near
//            hand: a big swing back and over on beat 1, a small one on beat 2; a tall fur cap
//   kettle   stands behind a PAIR of kettledrums the HALL draws: only the player, two sticks,
//            alternating hands (near on beat 1, far on beat 2); a tricorn
//   major    the drum major: a tall bearskin with a plume, a long mace with a gilt head in the near
//            fist (it dips forward on each beat, big on 1, small on 2), the far hand on the hip
// Livery: "" the crown's royal blue (coat of the Knight Garrison, gold braid, white cross-belt);
// ":b" the heralds' crimson and gold; ":gold" the finals' richer dress (epaulettes, a gold sash
// and braid across the chest, a bigger plume), blue.
// Clips: play  one bar, 1200 ms, 12 frames, loops: STRUCK on frame 0 (beat 1) and frame 6 (beat 2)
//        idle  at ease, instrument lowered, 4 frames, 3200 ms, slow breathing
// marks (art px from the feet, facing +x): drum / kettle  l = the NEAR stick's head, r = the FAR
//   stick's head (l lands on frame 0, r on frame 6); bass  tip = the beater's head; major  tip =
//   the mace's head. Every frame carries them, so the hall reads the pair at the hit frames.
import { mat, flat } from "./pix.js";
import { solve, ik, HUMAN, scaled } from "./rig.js";

export const BOX = { w: 64, h: 90, ox: 22, oy: 80 };
export const BONES = scaled(HUMAN, 1.2, { upper: 7.8, fore: 7.4, shN: -3, shF: 3.2, hipN: -1.4, hipF: 1.6 });
const ARM = BONES.upper + BONES.fore;

const SKIN = mat("#e8b990"), HAIR = mat("#5a3c28"), EYE = flat("#2a1c2c"), BOOT = mat("#33262a"), SHINE = flat("#fff6e0", { emis: true });
const CREAM = mat("#eee6d2", { contrast: 1.1 }), GOLD = mat("#c8a448", { contrast: 1.15 }), GOLD_HI = mat("#e8c85c", { contrast: 1.2 });
const HOSE = mat("#d6d2c2"), FUR = mat("#2e2a30", { contrast: 1.15 }), STICK = mat("#e6d6b0"), FELT = mat("#f0eadc"), SKINDR = mat("#e8dcc0", { contrast: 1.05 });

const LIVERY = {
  "": { coat: mat("#3a5474", { contrast: 1.1 }), hem: mat("#28405c"), plume: mat("#f0eadc"), hat: mat("#3a5474", { contrast: 1.1 }), hatB: mat("#28405c"), shell: mat("#3a5474", { contrast: 1.1 }), band: GOLD },
  b: { coat: mat("#a0303a", { contrast: 1.1 }), hem: mat("#762230"), plume: mat("#e8c85c"), hat: mat("#a0303a", { contrast: 1.1 }), hatB: mat("#762230"), shell: mat("#a0303a", { contrast: 1.1 }), band: GOLD_HI },
};
LIVERY.gold = { ...LIVERY[""], plume: mat("#f6f0e0"), band: GOLD_HI, hat: mat("#3a5474", { contrast: 1.1 }) };

const HEAD = [
  "....HHHHHH...",
  "..HHHHHHHHH..",
  ".HHHsssssss..",
  ".HHSSSSSSSSS.",
  ".HHSSESSSESN.",
  ".HhSSESSSESNN",
  ".HHSsSSSSSS..",
  "..hSSSSSSSS..",
  "...sSSSSmS...",
  "....sSSs.....",
];
const BLINK = HEAD.map((r, i) => (i === 4 ? ".HHSSSSSSSSN." : i === 5 ? ".HhSSeSSSeSNN" : r));
const LEG = { S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, m: { m: SKIN, fix: 0 }, H: { m: HAIR }, h: { m: HAIR, bias: -1 }, E: { m: EYE } };

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const armAt = (pose, far, [tx, ty]) => { const s = solve(pose, BONES), sh = far ? s.sF : s.sN, dx = tx - sh[0], dy = ty - sh[1]; return [Math.atan2(dx, dy), Math.min(1, Math.hypot(dx, dy) / ARM), 0]; };
const hands = (pose, h) => ({ ...pose, aF: armAt(pose, true, h.F), aN: armAt(pose, false, h.N) });
const BASE = { hx: -1, fN: [-2.2, 0], fF: [2.4, 0], blink: 0, drop: 0, twist: 0.1 };

// stick angle a: screen radians (0 forward, + down, - up). Returns the head.
const tipOf = (h, a, len) => [h[0] + Math.cos(a) * len, h[1] + Math.sin(a) * len];

// ---- the poses ----
// swing amount u 0 (struck) .. 1 (up). Each hand strikes once a bar, alternately.
const PI2 = Math.PI * 2;
const nearUp = (ph) => (0.5 - 0.5 * Math.cos(PI2 * ph)) ** 0.85;
const farUp = (ph) => (0.5 + 0.5 * Math.cos(PI2 * ph)) ** 0.85;
// the bass's single beater: up on each half, strongly on the first
const half = (ph) => { const q = (ph % 0.5) / 0.5; return Math.sin(Math.PI * q) ** 0.9; };

const POSES = {
  drum: {
    play: (ph) => {
      const un = nearUp(ph), uf = farUp(ph);
      const N = [lerp(8.3, 9.8, un), lerp(-27.6, -31.6, un)], F = [lerp(5.2, 6.6, uf), lerp(-28.1, -32.2, uf)];
      return hands({ ...BASE, drop: 0.55 * (0.5 + 0.5 * Math.cos(2 * PI2 * ph)), hy: 0.35 * Math.cos(2 * PI2 * ph), sN: lerp(0.6, -0.55, un), sF: lerp(0.6, -0.55, uf) }, { N, F });
    },
    idle: (ph) => { const b = 0.5 + 0.5 * Math.sin(ph * PI2); return hands({ ...BASE, rise: 0.5 * b, blink: ph > 0.62 && ph < 0.78 ? 1 : 0, sN: 0.7, sF: 0.55 }, { N: [8.4, -27.2 - 0.3 * b], F: [5.3, -27.8 - 0.3 * b] }); },
  },
  bass: {
    play: (ph) => {
      const q = (ph % 0.5) / 0.5, big = ph < 0.5 ? 1 : 0.4, u = half(ph) * big;
      // (frame 0 / 6 land on the skin: u 0)
      const N = [lerp(7, 8.6, u), lerp(-28.4, -36, u)], F = [11.8, -19.6];
      return hands({ ...BASE, drop: 0.5 * (0.5 + 0.5 * Math.cos(2 * PI2 * ph)), hy: 0.3 * Math.cos(2 * PI2 * ph), twist: 0.1 + 0.25 * u, rise: 0.6 * u, sN: lerp(0.5, -1.15, u) + 0 * q, sF: 0 }, { N, F });
    },
    idle: (ph) => { const b = 0.5 + 0.5 * Math.sin(ph * PI2); return hands({ ...BASE, rise: 0.5 * b, blink: ph > 0.62 && ph < 0.78 ? 1 : 0, sN: 1.45, sF: 0 }, { N: [3.2, -23.6], F: [11.8, -19.6 - 0.3 * b] }); },
  },
  kettle: {
    play: (ph) => {
      const un = nearUp(ph), uf = farUp(ph);
      const N = [lerp(9, 9.8, un), lerp(-26.4, -31.6, un)], F = [lerp(5.6, 6.6, uf), lerp(-27, -32.4, uf)];
      return hands({ ...BASE, drop: 0.5 * (0.5 + 0.5 * Math.cos(2 * PI2 * ph)), hy: 0.35 * Math.cos(2 * PI2 * ph), sN: lerp(0.6, -0.55, un), sF: lerp(0.6, -0.55, uf) }, { N, F });
    },
    idle: (ph) => { const b = 0.5 + 0.5 * Math.sin(ph * PI2); return hands({ ...BASE, rise: 0.5 * b, blink: ph > 0.62 && ph < 0.78 ? 1 : 0, sN: 1.25, sF: 1.15 }, { N: [8.2, -26.2 - 0.3 * b], F: [5.4, -26.8 - 0.3 * b] }); },
  },
  major: {
    play: (ph) => {
      const big = ph < 0.5 ? 1 : 0.5, u = half(ph) * big;
      const N = [10.2, lerp(-30.6, -38, u)];
      return hands({ ...BASE, rise: 0.5, drop: 0.4 * (0.5 + 0.5 * Math.cos(2 * PI2 * ph)), hy: 0.3 * Math.cos(2 * PI2 * ph), hx: -0.8, twist: 0.2, mace: lerp(0.78, -0.12, u) }, { N, F: [3.4, -21] });
    },
    idle: (ph) => { const b = 0.5 + 0.5 * Math.sin(ph * PI2); return hands({ ...BASE, rise: 0.5 + 0.4 * b, blink: ph > 0.62 && ph < 0.78 ? 1 : 0, mace: 0.03 }, { N: [10, -30.5], F: [3.4, -21] }); },
  },
};
// One clip table for all four roles: pose() returns every role's pose side by side (`roles`) and
// draw() re-solves its own, so each variant shares the clips' timing.
const rolePose = (kind) => (ph) => {
  const out = {};
  for (const r of Object.keys(POSES)) out[r] = POSES[r][kind](ph);
  return { ...out.drum, roles: out };
};
export const CLIPS = {
  play: { n: 12, ms: 1200, loop: true, lag: 0.05, pose: rolePose("play") },
  idle: { n: 4, ms: 3200, loop: true, lag: 0.1, pose: rolePose("idle") },
};

// ---- the drawing ----
const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.6, k[0], k[1], 2.2, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 2.1, an[0], an[1] - 3, 1.9, HOSE, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.3 + an[0] * 0.7, k[1] * 0.3 + an[1] * 0.7, 2.2, an[0], an[1], 2, BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.4, an[1] + 1.1, 3.1, 1.7, BOOT, z + 0.03, { bias: b, floor: 1 });
};
const arm = (px, L, s, e, hd, z, b, gold) => {
  px.part();
  px.capsule(s[0], s[1] + 0.3, 2.5, e[0], e[1], 2.2, L.coat, z, { bias: b, cast: 1, vb: -0.22 });
  px.capsule(e[0], e[1], 2.2, hd[0], hd[1], 1.9, L.coat, z, { bias: b, cast: 1, vb: -0.22 });
  const cu = [lerp(e[0], hd[0], 0.86), lerp(e[1], hd[1], 0.86)];
  px.ellipse(cu[0], cu[1], 2.4, 2.4, gold ? GOLD_HI : L.band, z + 0.02, { bias: b });
};
const stick = (px, hd, a, len, z, M = STICK, tipR = 1.25) => {
  const t = tipOf(hd, a, len);
  px.part(); px.capsule(hd[0] - Math.cos(a) * 1.2, hd[1] - Math.sin(a) * 1.2, 0.7, t[0], t[1], 0.7, M, z);
  px.ellipse(t[0], t[1], tipR, tipR, M === STICK ? FELT : M, z + 0.01);
  return t;
};

export const draw = (px, { sk: sk0, lag1, lag2, at }, o = {}) => {
  const [role0, liv = ""] = (o.variant || "drum").split(":");
  const role = POSES[role0] ? role0 : "drum";
  // this role's own pose (the clip's pose() returned every role's; re-solve this one)
  const rp = sk0.p.roles ? sk0.p.roles[role] : sk0.p;
  const sk = sk0.p.roles ? solve(rp, BONES) : sk0;
  const lg1 = sk0.p.roles && lag1 ? solve(lag1.p.roles[role], BONES) : lag1, lg2 = sk0.p.roles && lag2 ? solve(lag2.p.roles[role], BONES) : lag2;
  const L = { ...LIVERY[liv] || LIVERY[""] }, gold = liv === "gold" || liv === "b";
  const rich = liv === "gold";
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lg1.C[0], -2.5, 2.5);
  const marks = {};

  leg(px, hF, kF, anF, 1, -1);
  leg(px, hN, kN, anN, 2, 0);

  // ---- the far arm first, behind the coat ----
  arm(px, L, sF, eF, hdF, 3, -1, rich);

  // ---- the coat ----
  const hemB = P[0] - 6 - vx * 1.1, hemF = P[0] + 5.8 - vx * 0.7, hy = P[1] + 5.2;
  px.part(); const coatId = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 2], [C[0] + 5, C[1] - 2], [C[0] + 6, C[1] + 3.6], [P[0] + 4.9, P[1] - 3.6], [hemF, hy], [hemF - 3, hy + 0.9], [P[0] - vx, hy], [hemB + 2.8, hy + 0.9], [hemB, hy], [P[0] - 5.2, P[1] - 3.6], [C[0] - 6, C[1] + 3.6]], L.coat, 4, { round: 0.92, cast: 2, floor: 1 });
  px.toneLine(P[0] + 1, P[1] - 0.5, P[0] + 0.8 - vx, hy - 0.5, -1, coatId);
  // the coat's hem braid
  px.poly([[hemB + 0.2, hy - 1.4], [hemF - 0.2, hy - 1.4], [hemF - 0.4, hy + 0.2], [hemB + 0.4, hy + 0.2]], L.band, 4.04, { round: 0.9 });
  // the white cross-belt (back-shoulder to the front hip) and the waist belt
  px.part();
  px.poly([[C[0] - 4.4, C[1] - 2.2], [C[0] - 1.6, C[1] - 2.2], [P[0] + 5.4, P[1] - 3.4], [P[0] + 2.8, P[1] - 3.4]], CREAM, 4.1, { round: 0.6 });
  px.poly([[P[0] - 5.3, P[1] - 5.2], [P[0] + 5, P[1] - 5.2], [P[0] + 5, P[1] - 3], [P[0] - 5.3, P[1] - 3]], CREAM, 4.12, { round: 0.92, floor: 1 });
  px.rect(P[0] + 1.2, P[1] - 5.2, 2, 2.2, L.band, 4.14, { fix: 3 });
  // collar and buttons
  px.part(); px.rect(C[0] + 0.6, C[1] - 2.6, 4.6, 1.8, L.band, 4.2, { fix: 3 });
  for (let i = 0; i < 3; i++) px.dot(C[0] + 3.8, C[1] + 0.6 + i * 2.4, L.band, 4.2, { fix: 3 });
  if (rich) {
    // braid frogging across the chest, and a gold sash at the waist
    for (let i = 0; i < 3; i++) px.line(C[0] - 1, C[1] + 0.6 + i * 2.4, C[0] + 5.2, C[1] + 0.6 + i * 2.4, GOLD_HI, 4.18);
    px.poly([[P[0] - 5.4, P[1] - 7.6], [P[0] + 5.2, P[1] - 7.6], [P[0] + 5.2, P[1] - 5.2], [P[0] - 5.4, P[1] - 5.2]], GOLD_HI, 4.11, { round: 0.9, floor: 1 });
  }

  // ---- the instrument (behind the near arm, over the coat) ----
  if (role === "drum") {
    // a side drum at the right hip, its head tipped down toward the front
    const t = 0.2, u = [Math.cos(t), Math.sin(t)], v = [-Math.sin(t), Math.cos(t)];
    const Hc = [P[0] + 10, P[1] - 3.4], W = 5.6, D = 6;
    const a = [Hc[0] - u[0] * W, Hc[1] - u[1] * W], b = [Hc[0] + u[0] * W, Hc[1] + u[1] * W];
    px.part(); px.toneLine(C[0] + 3.5, C[1] - 1, a[0] + 1, a[1] + 1, 1, coatId);
    // the sling: a white strap from the shoulder to the rim
    px.part(); px.line(C[0] + 1.5, C[1] - 2.3, a[0] + 1.2, a[1] + 0.6, CREAM, 5.4);
    px.line(C[0] + 2.6, C[1] - 2.3, a[0] + 2.4, a[1] + 0.6, CREAM, 5.4);
    px.part(); px.poly([a, b, [b[0] + v[0] * D, b[1] + v[1] * D], [a[0] + v[0] * D, a[1] + v[1] * D]], L.shell, 5, { round: 0.5, cast: 1 });
    px.poly([[a[0] + v[0] * 2, a[1] + v[1] * 2], [b[0] + v[0] * 2, b[1] + v[1] * 2], [b[0] + v[0] * 3.4, b[1] + v[1] * 3.4], [a[0] + v[0] * 3.4, a[1] + v[1] * 3.4]], L.band, 5.04, { round: 0.5 });
    px.part(); px.poly([[a[0] + v[0] * 5.1, a[1] + v[1] * 5.1], [b[0] + v[0] * 5.1, b[1] + v[1] * 5.1], [b[0] + v[0] * 6.2, b[1] + v[1] * 6.2], [a[0] + v[0] * 6.2, a[1] + v[1] * 6.2]], CREAM, 5.05, { round: 0.5 });
    px.part(); px.ellipse(Hc[0], Hc[1] + 0.4, W + 0.5, 1.7, SKINDR, 5.1);
    px.poly([[a[0] - 0.6, a[1] - 0.2], [b[0] + 0.6, b[1] - 0.2], [b[0] + 0.6, b[1] + 0.8], [a[0] - 0.6, a[1] + 0.8]], CREAM, 5.12, { round: 0.6 });
  } else if (role === "bass") {
    // the bass drum on his chest, its face to the front
    const x0 = P[0] + 5, x1 = P[0] + 13, y0 = P[1] - 10.8, y1 = P[1] + 0.6;
    px.part(); px.rect(x0, y0, x1 - x0, y1 - y0, L.shell, 5, { round: 0.6, cast: 1 });
    px.rect(x0 + 3, y0, 2, y1 - y0, L.band, 5.04);
    px.part(); px.rect(x0 - 0.4, y0 - 0.4, 1.6, y1 - y0 + 0.8, CREAM, 5.06); px.rect(x1 - 1.6, y0 - 0.4, 1.6, y1 - y0 + 0.8, CREAM, 5.06);
    px.part(); px.ellipse(x1 + 0.2, (y0 + y1) / 2, 1.5, (y1 - y0) / 2 + 0.2, SKINDR, 5.1);
    // the harness over the shoulder
    px.part(); px.line(C[0] + 2.4, C[1] - 2.3, x0 + 1, y0 + 0.5, CREAM, 5.4);
  }

  // ---- the head and hat ----
  const hx = Math.round(N[0]), hyy = Math.round(N[1]), by = hyy - 5, cx = hx + 0.2;
  px.part(); px.stamp(p.blink ? BLINK : HEAD, hx, hyy, LEG, 6, { ax: 6, ay: 8, ball: [6.5, 5, 7, 7], cast: 2 });
  px.part();
  if (role === "drum" || role === "kettle") {
    if (role === "drum") {
      // a shako: a straight-sided cap, a gold band, a visor and a plume
      px.poly([[cx - 5.2, by + 0.6], [cx + 5.4, by + 0.6], [cx + 4.8, by - 6.6], [cx - 4.8, by - 6.6]], L.hat, 6.3, { round: 0.85 });
      px.poly([[cx - 5.2, by - 1.6], [cx + 5.4, by - 1.6], [cx + 5.4, by + 0.8], [cx - 5.2, by + 0.8]], L.band, 6.4, { round: 0.9 });
      px.poly([[cx + 5, by + 0.4], [cx + 8.4, by + 1], [cx + 5, by + 1.8]], L.hatB, 6.35, {});
      px.part(); px.poly([[cx - 1, by - 6.6], [cx + 1.8, by - 6.6], [cx + 2.4, by - 11.8 - (rich ? 3 : 0)], [cx - 0.4, by - 13 - (rich ? 3 : 0)]], L.plume, 6.5, { round: 0.8 });
      if (rich) px.line(cx - 4.8, by - 4.6, cx + 4.8, by - 4.6, GOLD_HI, 6.42);
    } else {
      // a tricorn with a feather
      px.poly([[cx - 7.2, by + 1], [cx + 7.4, by + 1], [cx + 5.2, by - 3.4], [cx + 0.6, by - 6.8], [cx - 4.6, by - 3.2]], L.hat, 6.3, { round: 0.85 });
      px.poly([[cx - 7.2, by - 0.4], [cx + 7.4, by - 0.4], [cx + 7.4, by + 1.2], [cx - 7.2, by + 1.2]], L.band, 6.4, { round: 0.9 });
      px.part(); px.poly([[cx - 6.2, by - 1.2], [cx - 7.4, by - 6.4 - (rich ? 2 : 0)], [cx - 4.4, by - 7.6 - (rich ? 2 : 0)], [cx - 3.4, by - 2.4]], L.plume, 6.5, { round: 0.8 });
    }
  } else if (role === "bass") {
    // a fur busby with a bag and a plume
    px.poly([[cx - 5.2, by + 0.6], [cx + 5.4, by + 0.6], [cx + 5.9, by - 6], [cx + 4.2, by - 10], [cx - 3.8, by - 10], [cx - 5.5, by - 6]], FUR, 6.3, { round: 0.8 });
    px.poly([[cx - 5.2, by - 0.8], [cx + 5.4, by - 0.8], [cx + 5.4, by + 0.8], [cx - 5.2, by + 0.8]], L.band, 6.4, { round: 0.9 });
    px.part(); px.poly([[cx + 1.4, by - 9.4], [cx + 4.2, by - 9.4], [cx + 4.4, by - 14.6 - (rich ? 3 : 0)], [cx + 1.6, by - 14.8 - (rich ? 3 : 0)]], L.plume, 6.5, { round: 0.8 });
  } else {
    // the major's tall bearskin, a gilt plate and a long plume
    px.poly([[cx - 5.6, by + 0.8], [cx + 5.8, by + 0.8], [cx + 6.2, by - 8], [cx + 4.6, by - 13.6], [cx - 4.6, by - 13.6], [cx - 6.2, by - 8]], FUR, 6.3, { round: 0.8 });
    px.poly([[cx - 5.6, by - 0.8], [cx + 5.8, by - 0.8], [cx + 5.8, by + 0.8], [cx - 5.6, by + 0.8]], L.band, 6.4, { round: 0.9 });
    px.rect(cx + 2, by - 6.4, 2.6, 3, GOLD_HI, 6.42, { fix: 3 });
    px.part(); px.poly([[cx - 1.8, by - 13.6], [cx + 1.6, by - 13.6], [cx + 2.4, by - 20.2 - (rich ? 2 : 0)], [cx - 0.6, by - 21.4 - (rich ? 2 : 0)]], L.plume, 6.5, { round: 0.8 });
  }

  // ---- epaulette on the near shoulder ----
  px.part(); px.ellipse(sN[0] + 0.3, sN[1] - 0.8, 3.1, 2.4, L.coat, 7.8, { cast: 1, fix: 2 });
  if (rich) { px.ellipse(sN[0] + 0.3, sN[1] - 1.6, 3.4, 1.3, GOLD_HI, 7.85, { fix: 3 }); px.line(sN[0] - 2.6, sN[1] + 0.2, sN[0] - 2.6, sN[1] + 2.8, GOLD_HI, 7.85); }

  // ---- the near arm (over the instrument) ----
  const hand = (hd, z) => { px.part(); px.ellipse(hd[0], hd[1], 1.9, 1.9, SKIN, z); };
  if (role === "drum" || role === "kettle") {
    const tF = stick(px, hdF, p.sF, 6.8, 5.6), tN = stick(px, hdN, p.sN, 6.8, 8.1);
    hand(hdF, 5.7);
    arm(px, L, sN, eN, hdN, 8, 0, rich);
    hand(hdN, 8.3);
    marks.l = tN; marks.r = tF;
  } else if (role === "bass") {
    hand(hdF, 5.6);
    // the beater: a long thin stick with a big felt ball, held at the grip
    const t = stick(px, hdN, p.sN, 7.6, 8.1, mat("#cdb88c"), 2.5);
    arm(px, L, sN, eN, hdN, 8, 0, rich);
    hand(hdN, 8.3);
    marks.tip = t;
  } else {
    // the mace: a long shaft through the fist, a gilt head at the top, a ferrule below
    const a = p.mace, d = [Math.sin(a), -Math.cos(a)], LM = 34, below = 8;
    const t0 = [hdN[0] - d[0] * below, hdN[1] - d[1] * below], t1 = [hdN[0] + d[0] * (LM - below), hdN[1] + d[1] * (LM - below)];
    px.part(); px.capsule(t0[0], t0[1], 0.8, t1[0], t1[1], 0.9, mat("#6a4a30"), 7.4, { edge: true });
    px.part(); px.capsule(t1[0] - d[0] * 3, t1[1] - d[1] * 3, 1.2, t1[0] + d[0] * 1, t1[1] + d[1] * 1, 1.6, GOLD, 7.5);
    const hd2 = [t1[0] + d[0] * 2, t1[1] + d[1] * 2];
    px.part(); px.ellipse(hd2[0], hd2[1], 3.1, 3.1, GOLD_HI, 7.6); px.dot(hd2[0] - 1, hd2[1] - 1.2, SHINE, 7.7);
    px.part(); px.ellipse(t0[0], t0[1], 1.3, 1.3, GOLD, 7.5);
    hand(hdF, 3.2);
    arm(px, L, sN, eN, hdN, 8, 0, rich);
    hand(hdN, 8.3);
    marks.tip = hd2;
  }
  return { marks };
};
