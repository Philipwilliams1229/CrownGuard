// ============ FIGURE: the Gravecaller (the Hollow Court's bell-ringer, game type `gravecaller`) ============
// A robed, hooded thing with a skull for a face: a long dark teal-grey robe with a ragged hem
// stained green from the bog, a cape of bruise-violet trailing behind, a rope belt hung with
// finger bones, drowned weed on the hem, witch-fire in the hood's dark. In the far fist a
// shepherd's crook (walked like a staff) with a bronze handbell hung from its hook; in the near hand
// a corpse-candle lantern, an iron cage with a teal flame. About 50 px, a head over a man.
// His summons is the BELL: every toll he swings the crook up and the bell rings out in rings of
// witch-fire. The `toll` clip is that, ON THE MARCH: the very legs of `walk`, frame for frame.
// Clips: idle, walk (8 frames), strike (a swing of the crook when a soldier reaches him), toll.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN } from "./rig.js";

const ROBE = mat("#2e3a3c", { contrast: 0.9 }), COWL = mat("#3c4a4a"), TRIM = mat("#4a5a50"), CAPE = mat("#2a2434", { contrast: 0.9 });
const BONE = mat("#d8d0bc"), WOOD = mat("#5a4a3a"), BRONZE = mat("#a8843e", { contrast: 1.15 }), WEED = mat("#4e6a48"), IRON = mat("#3a3c44", { contrast: 1.1 }), BOOT = mat("#242c30");
const VOID = flat("#12161a"), SOCK = flat("#0c1012");
const EYE = flat("#7ce0b8", { emis: true }), EYE_HOT = flat("#e0fff4", { emis: true }), EYE_DIM = flat("#3a9c86", { emis: true });
const F_TEAL = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), F_PALE = flat("#e0fff4", { emis: true, line: "#7ce0b8" }), F_DEEP = flat("#2f6a62", { emis: true });

// The hood and the skull in it, facing +x, a quarter turned. C cloth (c a tone down, K a tone
// up: the lip in the sun), I the dark inside, B bone (b shade), e socket, E witch-fire, n the
// nose hole, T teeth, j jaw.
const HEAD = [
  "....CCCCC....",
  "..CCCCCCCCC..",
  ".CCCCCCCCKKK.",
  "CCCCCCKKIIIKK",
  "CCCCCKIIIIIIK",
  "CCCCKIIBBBBBK",
  "CCCCKIBBeEBeE",
  "CCCCKIBBBBBnK",
  "CCCCKIIbBTTTK",
  "cCCCKIIIbTjTK",
  ".CCCCKIIIjjK.",
  "..cCCCCKKKK..",
];
const legend = (eye) => ({
  C: { m: COWL }, c: { m: COWL, bias: -1 }, K: { m: COWL, bias: 1 }, I: { m: VOID },
  B: { m: BONE, fix: 2 }, b: { m: BONE, fix: 1 }, e: { m: SOCK }, E: { m: eye }, n: { m: SOCK }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 },
});
const LEG = legend(EYE), LEG_HOT = legend(EYE_HOT), LEG_DIM = legend(EYE_DIM);

export const BOX = { w: 70, h: 74, ox: 28, oy: 66 };
export const BONES = scaled(HUMAN, 1.12, { shN: -2.4, shF: 2.7 });
const STAFF = 36;

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const TAT = [[1, 0.4], [0.84, 3.6], [0.7, 0], [0.54, 4.4], [0.4, 0.2], [0.26, 3.4], [0.12, 0], [0, 2]];

export const draw = (px, { sk, lag1, lag2, ph }, o = {}) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2, 2), vx2 = cl(lag1.C[0] - lag2.C[0], -2, 2), vy = cl(C[1] - lag1.C[1], -2, 2);
  const w1 = lag1.p.sway || 0, w2 = lag2.p.sway || 0;

  // ---- the cape, behind it all, its torn foot trailing
  {
    const d1 = -vx * 1.5 - vx2 * 1.2 + w1 * 0.8, d2 = -vx - vx2 * 2 + w2 * 1.4 + vy * 0.5;
    const top = C[1] - 1.6, botY = -3.4 + Math.abs(d2) * 0.3;
    px.part();
    px.poly([[C[0] - 4.6, top], [C[0] + 1, top], [P[0] + 1, P[1]], [P[0] - 1, botY], [P[0] - 3 + d2, botY - 3.4], [P[0] - 6 + d2, botY - 0.2], [P[0] - 9.4 + d1, P[1] + 8.6], [P[0] - 9.6 + d1, P[1] + 4], [C[0] - 6.4 + d1 * 0.3, C[1] + 7]], CAPE, 0.4, { round: 0.9 });
    px.toneLine(P[0] - 6 + d1, P[1] + 5, P[0] - 3.4 + d2 * 0.3, botY - 4, -1, px._pid);
  }

  // ---- the crook in the far fist: a dark shaft, a hook curling forward and down, the bell on it
  const lift = p.lift || 0, hgt = -hdF[1] - lift;
  const tl = p.sx != null ? Math.atan2(hdF[0] - p.sx, hgt) : (p.staff ?? 0);
  const d = [Math.sin(tl), -Math.cos(tl)], nn = [Math.cos(tl), Math.sin(tl)], lo = hgt / Math.cos(tl);
  const foot = [hdF[0] - d[0] * lo, hdF[1] - d[1] * lo], tip = [foot[0] + d[0] * STAFF, foot[1] + d[1] * STAFF];
  const at = (a, b) => [tip[0] + d[0] * a + nn[0] * b, tip[1] + d[1] * a + nn[1] * b];
  px.part();
  px.capsule(foot[0], foot[1], 0.95, tip[0], tip[1], 0.95, WOOD, 1.5, { edge: true });
  px.capsule(...at(0, 0), 0.95, ...at(1.6, 2.4), 0.9, WOOD, 1.5, { edge: true });
  px.capsule(...at(1.6, 2.4), 0.9, ...at(-0.6, 4.2), 0.8, WOOD, 1.5, { edge: true });
  px.line(...at(-6, 0), ...at(-2, 0), BRONZE, 1.52, { fix: 3 });
  // the bell: hung from the hook's end, swinging (ring -1 back .. 1 forward)
  const hook = at(-0.6, 4.2), ring = p.ring || 0;
  const bx = hook[0] + ring * 2.6, by = hook[1] + 3.6 - Math.abs(ring) * 0.5;
  px.part();
  px.line(hook[0], hook[1], bx, by - 1.4, IRON, 1.55, { noLine: true });
  px.poly([[bx - 1.2, by - 1.6], [bx + 1.2, by - 1.6], [bx + 1.8, by + 0.4], [bx + 2.8, by + 2.4], [bx - 2.8, by + 2.4], [bx - 1.8, by + 0.4]], BRONZE, 1.6, { round: 0.7 });
  px.dot(Math.round(bx), Math.round(by) + 3, IRON, 1.62, { fix: 1 });

  // ---- the far arm, a tone down; its fist on the crook
  {
    const wr = mix(eF, hdF, 0.8);
    px.part();
    px.capsule(sF[0], sF[1], 1.8, eF[0], eF[1], 1.7, COWL, 1, { bias: -1 });
    px.capsule(eF[0], eF[1], 1.7, wr[0], wr[1], 2.2, COWL, 1, { bias: -1 });
    px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.8, BONE, 1.7, { bias: -1 });
  }
  // the lantern arm's far side stays with the near arm below

  // ---- slippers under the hem
  for (const [an, zz, b] of [[anF, 2, -1], [anN, 3, 0]]) { px.part(); px.ellipse(an[0] + 2, an[1] + 1.4, 2.4, 1.1, BOOT, zz, { fix: 1 + b }); }

  // ---- the robe: narrow shoulders to a ragged hem shaped by the feet, trailing the body
  const hemY = -0.8, top = C[1] - 2.2;
  const hemF = Math.max(P[0] + 4.6, Math.max(anN[0], anF[0]) + 3.4) - vx * 0.8 + w1 * 0.3;
  const hemB = Math.min(P[0] - 5.6, Math.min(anN[0], anF[0]) - 3.4) - vx * 1.3 - vx2 * 0.8 + w1 * 0.5;
  const tipD = -vx * 0.6 - vx2 * 0.8 + w2 * 0.6;
  const wF = [P[0] + 4, P[1] - 2], wB = [P[0] - 4.4, P[1] - 2];
  const hm = (t) => hemB + (hemF - hemB) * t;
  px.part(); const robeId = px._pid;
  px.poly([[C[0] - 4.2, top], [C[0] + 4.2, top], [C[0] + 4.8, C[1] + 3], wF,
    ...TAT.map(([t, dp]) => [hm(t) + (dp < 1 ? tipD : tipD * 0.4), hemY - dp]),
    wB, [C[0] - 5, C[1] + 3]], ROBE, 4, { round: 0.9, cast: 1, edge: true });
  px.toneLine(P[0] - 2.4, P[1] + 2, hm(0.3), hemY - 5, -1, robeId);
  px.toneLine(P[0] + 3, P[1] + 1, hm(0.84), hemY - 5, 1, robeId);
  px.toneLine(C[0] + 3.2, C[1] + 2, P[0] + 3, P[1] - 4, 1, robeId);
  // the front panel in dull green trim, bog-stain up from the hem
  px.line(C[0] + 1.6, top + 4, P[0] + 1.2, P[1] - 2, TRIM, 4.04);
  px.line(P[0] + 1.2, P[1] - 2, hm(0.62), hemY - 5, TRIM, 4.04);
  px.part();
  for (let i = 0; i < 6; i++) px.dot(hm(0.1 + i * 0.15), hemY - 1.2 - (i % 2) * 1.6, WEED, 4.1, { fix: 1 });
  px.poly([[wB[0] - 0.1, P[1] - 3.3], [wF[0] + 0.2, P[1] - 3.3], [wF[0], P[1] - 1.7], [wB[0], P[1] - 1.7]], WOOD, 4.05, { round: 0.94, bias: -1 });
  // finger bones on the rope
  const sw = cl(-vx * 1.1 - vx2 * 0.9 + w1 * 0.6, -1.5, 1.5);
  px.part();
  for (let i = 0; i < 3; i++) px.line(P[0] - 2.2 + i * 1.5, P[1] - 1.6, P[0] - 2.2 + i * 1.5 + sw * 0.5, P[1] + 0.8 + (i % 2), BONE, 4.2, { fix: 3 });

  // ---- the near arm: a belled sleeve, the lantern hung from the fist
  const u = (() => { const dx = hdN[0] - eN[0], dy = hdN[1] - eN[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; })();
  const wr = mix(eN, hdN, 0.78);
  px.part();
  px.capsule(sN[0], sN[1], 2.1, eN[0], eN[1], 2, COWL, 8, { cast: 2 });
  px.capsule(eN[0], eN[1], 2, wr[0], wr[1], 2.7, COWL, 8, { cast: 2 });
  px.poly([[wr[0] - 3, wr[1] - 3], [wr[0] + 3, wr[1] + 3], [wr[0] + 3 + u[0], wr[1] + 3 + u[1]], [wr[0] - 3 + u[0], wr[1] - 3 + u[1]]].map(([a, b]) => [wr[0] + (a - wr[0]) * 0.9, wr[1] + (b - wr[1]) * 0.9]), TRIM, 8.02, { bias: 1 });
  px.part(); px.ellipse(hdN[0], hdN[1] + 0.4, 1.7, 1.6, BONE, 8.4);
  // the lantern: a chain, an iron cage, a teal flame
  const sway = (lag1.p.sway || 0) * 0.6 + vx * -0.8, lx = hdN[0] + sway, ly = hdN[1] + 5.4;
  const flick = p.flick || 0;
  px.part();
  px.line(hdN[0], hdN[1] + 1, lx, ly - 2.4, IRON, 8.45, { noLine: true });
  px.rect(lx - 2, ly - 2.4, 4, 1, IRON, 8.5, { fix: 1 }); px.rect(lx - 2, ly + 2.4, 4, 1, IRON, 8.5, { fix: 1 });
  px.rect(lx - 1.5, ly - 1.4, 3, 3.8, F_TEAL, 8.48, { noLine: true });
  px.dot(Math.round(lx), Math.round(ly) - (flick ? 0 : 1), F_PALE, 8.55, { noLine: true });
  px.line(lx - 2, ly - 1.4, lx - 2, ly + 2.4, IRON, 8.52, { fix: 1, noLine: true }); px.line(lx + 2, ly - 1.4, lx + 2, ly + 2.4, IRON, 8.52, { fix: 1, noLine: true });

  // ---- the hood: its point trails the head and settles
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const gx = hx - 6, gy = hy - 11, bend = cl(vx * 2 + vx2 * 1.4 + w2 * 0.5, -2, 3);
  px.part();
  px.poly([[gx + 0.4, gy + 5], [gx + 0.6, gy + 1.4], [gx + 1.4 - bend * 0.3, gy - 1.6], [gx - 0.4 - bend * 0.8, gy - 3.2], [gx - 2.2 - bend, gy - 3], [gx + 2 - bend * 0.4, gy - 3.8], [gx + 6, gy - 1.4], [gx + 10.5, gy + 1.6], [gx + 10, gy + 3.6]], COWL, 8.95, { round: 0.85, ny: -0.2 });
  px.stamp(HEAD, hx, hy, p.eye > 0.5 ? LEG_HOT : p.eye < -0.5 ? LEG_DIM : LEG, 9, { ax: 6, ay: 11, ball: [5.5, 6.5, 8, 8.5], cast: 1 });

  const tk = p.toll || 0;
  return { light: { x: lx, y: ly, r: 16 + 10 * tk, col: "#7ce0b8", k: 0.3 + 0.3 * tk }, bell: [bx, by], toll: tk, tollR: p.tollR || 0, feet: [P[0], 0] };
};

// the toll going out: rings of witch-fire off the bell, and motes lifting off the ground ahead of him
export const fx = (px, F, info, clip) => {
  if (!info || !(info.tollR > 0.02)) return;
  const [bx, by] = info.bell, t = info.tollR, NL = { noLine: true };
  for (const [r0, c] of [[4, F_PALE], [8, F_TEAL]]) {
    const r = r0 * (0.5 + t * 1.6);
    if (t > 0.9 && r0 > 4) continue;
    for (const s of [-1, 1]) for (let i = -2; i <= 2; i++) { const a = i * 0.32 + (s > 0 ? 0 : Math.PI); px.dot(bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.9, i % 2 ? c : F_DEEP, 20, NL); }
  }
};

const READY = { lean: 0.06, hx: 1.2, hy: 0.6, aF: [0.95, 0.72, 0], aN: [0.36, 0.78, 0], fN: [-1.8, 0], fF: [2, 0], staff: 0.05, lift: 0, ring: 0, flick: 0, sway: 0, eye: 0, toll: 0, tollR: 0 };
const TAU = Math.PI * 2;
// the crook walked like a staff: planted while the body passes it, then swung on ahead
const planted = (q) => { const pl = 0.62, sx = q < pl ? 17.6 - 14.4 * q : 17.6 - 14.4 * pl + 14.4 * pl * (0.5 - 0.5 * Math.cos(((q - pl) / (1 - pl)) * Math.PI)); return [sx, q < pl ? 0 : Math.sin(((q - pl) / (1 - pl)) * Math.PI) * 2.4]; };
const march = (ph) => walkPose(ph, { stride: 3.8, lift: 1.7, swing: 0.1, bob: 0.8, lean: 0.14 });
export const CLIPS = {
  idle: {
    n: 8, ms: 2400, loop: true, lag: 0.12,
    pose: (ph) => { const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b; return { ...READY, rise: 0.6 * u, aN: [0.36 + 0.04 * b, 0.78, 0], ring: 0.25 * Math.sin(ph * TAU + 0.8), sway: Math.sin(ph * TAU + 0.8), flick: ph > 0.4 && ph < 0.6 ? 1 : 0, eye: ph > 0.72 && ph < 0.8 ? -1 : 0 }; },
  },
  walk: {
    n: 8, ms: 960, loop: true, lag: 0.09,
    pose: (ph) => {
      const w = march(ph), a = Math.cos(ph * TAU), [sx, lift] = planted(ph);
      return { ...READY, ...w, hx: 1.4, hy: 0.8, aF: [0.97 + 0.1 * Math.cos((ph - 0.08) * TAU), 0.72, 0], aN: [0.36 - a * 0.1, 0.78, 0], sx, lift, ring: 0.5 * Math.sin(ph * TAU * 2), flick: ph % 0.5 < 0.25 ? 1 : 0, sway: Math.sin(ph * TAU) * 0.5 };
    },
  },
  // his blow, for a soldier who reaches him: the crook heaved up and brought down, the bell clanging
  strike: {
    n: 12, ms: 900, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      { t: 0.3, e: "out", p: { ...READY, rx: -1.2, lean: -0.02, aF: [0.7, 0.74, 0], aN: [0.9, 0.7, 0], staff: -0.4, lift: 4, ring: -1, eye: 1 } },
      { t: 0.42, e: "io", p: { ...READY, rx: -1.6, lean: -0.05, aF: [0.6, 0.76, 0], aN: [1, 0.7, 0], staff: -0.5, lift: 5, ring: -1, eye: 1 } },
      { t: 0.54, e: "in3", p: { ...READY, rx: 2, drop: 1, lean: 0.3, hx: 2.4, hy: 1.4, aF: [1.25, 1, 0], aN: [-0.3, 0.85, 0], fF: [5, 0], staff: 0.95, lift: 7, ring: 1, eye: 1, toll: 1, tollR: 0.2 } },
      { t: 0.7, e: "out", p: { ...READY, rx: 2.4, drop: 1.2, lean: 0.34, hx: 2.6, hy: 1.6, aF: [1.15, 1, 0], aN: [-0.4, 0.85, 0], fF: [5, 0], staff: 1.05, lift: 7, ring: -0.5, eye: 1, toll: 0.6, tollR: 0.7 } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
};
// The toll, ON THE MARCH (the game: every few seconds the bell rings and ten Risen climb out of the road
// ahead of him, without breaking his step). Walk-shaped: the very legs of `walk`, the crook raised and
// swung, the bell clanging, rings of witch-fire going out.
CLIPS.toll = {
  n: 8, ms: 960, loop: true, lag: 0.09,
  pose: (ph) => {
    const w = march(ph), a = Math.cos(ph * TAU), sg = Math.sin(ph * TAU * 2);
    return { ...READY, ...w, sx: null, hx: 1.4, hy: -0.4, aF: [1.9, 0.9, 0], aN: [0.36 - a * 0.1, 0.78, 0], staff: 0.05 + 0.1 * sg, lift: 9, ring: sg, flick: 1, eye: 1, toll: 1, tollR: ((ph * 2) % 1) };
  },
};
