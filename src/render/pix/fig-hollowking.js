// ============ FIGURE: the Hollow King (the Hollow Court's boss, game type `hollowking`) ============
// The drowned king: a tall crowned skeleton in the rags of his royal robes, about 62 px to the crown, a
// head over the Gravecaller. A skull in a verdigris-and-gold crown with witch-fire gems and teal in the
// sockets, a gold-edged mantle over the shoulders, a rib cage with a witch-fire heart burning in it, a
// tarnished girdle, a violet robe in tatters over bone legs, a long torn cape of bruise-violet streaming
// behind with weed caught in it, and a great dark sword with a burning teal edge held in both hands.
// Facing +x, a quarter turned.
// His summons is the court calling its dead: every ten seconds he heaves the sword up and the road ahead
// of him burns with teal columns. The `toll` clip is that, ON THE MARCH: the very legs of `walk`.
// Clips: idle, walk (8 frames), attack (heaved back, a step in, one great cut), toll.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN, ik } from "./rig.js";

const BONE = mat("#e0d8c4"), ROBE = mat("#3a2e4a", { contrast: 0.95 }), ROBE_D = mat("#2a2236", { contrast: 0.9 }), CAPE = mat("#2a2434", { contrast: 0.9 });
const GOLD = mat("#b89c42", { contrast: 1.15 }), CROWN = mat("#d2b24e", { contrast: 1.2 }), WEED = mat("#4e6a48"), STEEL = mat("#4a5260", { contrast: 1.2 }), HAFT = mat("#2e2a36");
const GAP = flat("#6a604c"), SOCK = flat("#15121a");
const EYE = flat("#7ce0b8", { emis: true }), EYE_HOT = flat("#e0fff4", { emis: true }), GEM = flat("#9cf4d4", { emis: true, line: "#2f8a72" });
const F_TEAL = flat("#7ce0b8", { emis: true, line: "#2f8a72" }), F_PALE = flat("#e0fff4", { emis: true, line: "#7ce0b8" }), F_DEEP = flat("#2f6a62", { emis: true });

// The crowned skull, facing +x, a quarter turned: R the crown (points and band, G its witch-fire gems),
// S bone (s a tone down), e the dark socket, E the witch-fire in it, N the nasal hole, T teeth, j the jaw.
const SKULL = [
  "..R..R..R..R.",
  "..R..RR.RR.R.",
  "..RR.RRRRRRR.",
  "..RRRRGRRGRR.",
  "..SSSSSSSSSS.",
  ".SSSSSSSSSSSS",
  ".SSSSeeSSeeSS",
  ".sSSSeEsSeEeS",
  ".sSSSSSSSSSNs",
  "..sSSSSSSSSs.",
  "..sSSTTTTTS..",
  "...sjTjTjTj..",
  "....sjjjjj...",
];
// the blow's snarl: the jaw dropped a row
const SNARL = SKULL.map((r, i) => ({ 9: "..sSSTTTTTS..", 10: "...sjTjTjTj..", 11: "....sjjjjjj.." })[i] ?? r).concat(["....sjjjjj..."]);
const legend = (eye) => ({
  R: { m: CROWN, fix: 2 }, G: { m: GEM, fix: 3 }, S: { m: BONE }, s: { m: BONE, bias: -1 }, T: { m: BONE, fix: 3 }, j: { m: BONE, fix: 1 }, N: { m: BONE, fix: 1 }, e: { m: SOCK }, E: { m: eye },
});
const LEG = legend(EYE), LEG_HOT = legend(EYE_HOT);

export const BOX = { w: 108, h: 98, ox: 46, oy: 88 };
export const BONES = scaled(HUMAN, 1.42, { shN: -3.6, shF: 3.8 });

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const TAT = [[1, 0.4], [0.84, 3.6], [0.7, 0], [0.54, 4.4], [0.4, 0.2], [0.26, 3.4], [0.12, 0], [0, 2]];
const BL = 24;           // the blade's length

export const draw = (px, { sk, lag1, lag2, ph }, o = {}) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2, 2), vx2 = cl(lag1.C[0] - lag2.C[0], -2, 2), vy = cl(C[1] - lag1.C[1], -2, 2);
  const u = (() => { const dx = P[0] - C[0], dy = P[1] - C[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; })();
  const fw = [u[1], -u[0]], L = Math.hypot(P[0] - C[0], P[1] - C[1]);
  const at = (t, s) => [C[0] + u[0] * L * t + fw[0] * s, C[1] + u[1] * L * t + fw[1] * s];
  const tk = p.toll || 0, fl = p.fire ?? 0.5;

  // ---- the great sword's frame: the hands on the grip, the blade along `sword` (0 up, + leaning forward)
  const sa = p.sword ?? 0.3, d = [Math.sin(sa), -Math.cos(sa)], nn = [-d[1], d[0]];
  const at2 = (f, s) => [hdN[0] + d[0] * f + nn[0] * s, hdN[1] + d[1] * f + nn[1] * s];

  // ---- the cape, behind it all: long, torn, streaming
  {
    const d1 = -vx * 1.6 - vx2 * 1.3, d2 = -vx - vx2 * 2 + vy * 0.5, top = C[1] - 2.2, botY = -3.2 + Math.abs(d2) * 0.3;
    px.part(); const cid = px._pid;
    px.poly([[C[0] - 5.4, top], [C[0] + 1, top], [P[0] + 1.4, P[1]], [P[0] - 1, botY], [P[0] - 3.4 + d2, botY - 3.6], [P[0] - 6.4 + d2, botY - 0.2], [P[0] - 10 + d1, P[1] + 12], [P[0] - 11 + d1, P[1] + 6], [C[0] - 8 + d1 * 0.3, C[1] + 8]], CAPE, 0.4, { round: 0.9, floor: 1 });
    px.toneLine(P[0] - 6.4 + d1, P[1] + 7, P[0] - 3.2 + d2 * 0.3, botY - 4, -1, cid);
    px.toneLine(C[0] - 5, C[1] + 2, P[0] - 6.6 + d1, P[1] + 8, 1, cid);
    px.part();
    px.line(C[0] - 5.4, top, P[0] - 11 + d1, P[1] + 6, GOLD, 0.42, { fix: 1 });
    for (const [t, s] of [[0.55, -6.6], [0.9, -9.4]]) px.dot(...at(t, s), WEED, 0.45, { fix: 1 });
  }

  // ---- the far arm, a tone down: a violet sleeve, the bone hand on the grip's end
  {
    const hand = at2(-3.6, 0), r = ik(sF[0], sF[1], hand[0], hand[1], 8.1, 7.6, 1);
    // ONE BODY (the joint kit): the sleeve and the bone forearm are one welded tube, the bone wrapped over the sleeve
    px.body(1);
    px.limb([sF, r.mid, r.end], [2.0, 1.8, 1.2], ROBE_D, 1, { bias: -1, floor: 1 });
    const fm = mix(r.mid, r.end, 0.25);
    px.capsule(fm[0], fm[1], 1.9, r.end[0], r.end[1], 1.2, BONE, 1.01, { bias: -1, wrap: true });
    px.ellipse(r.end[0], r.end[1], 1.5, 1.4, BONE, 1.02, { bias: -1, weld: 1.5 });
    px.body(0);
  }

  // ---- legs: thigh and shin bones, a knobbed knee, a long foot
  for (const [hp, kn, an, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.body(1);
    px.limb([hp, kn, an], [1.3, 1.1, 1.0], BONE, z, { bias: b });
    px.ellipse(kn[0] + 0.2, kn[1], 1.6, 1.5, BONE, z + 0.02, { bias: b, weld: 1.5 });
    px.capsule(an[0] - 0.4, an[1] + 0.8, 1.2, an[0] + 4.4, an[1] + 1, 0.9, BONE, z, { bias: b, weld: 1.5 });
    px.body(0);
  }

  // ---- the robe: a back skirt and a front panel in tatters, hem swinging a beat behind, gold trim
  {
    const hy = -3.2, tipD = -vx * 0.8 - vx2 * 0.8;
    px.part(); const rid = px._pid;
    px.poly([[P[0] - 5, P[1] - 2], [P[0] + 5, P[1] - 2], [P[0] + 6, P[1] + 7], ...TAT.map(([t, dp]) => [P[0] + 5.6 - t * 11.6 + (dp < 1 ? tipD : tipD * 0.4), hy - dp + 1.4 - Math.sin(t * 6) * 0.5]), [P[0] - 5.4, P[1] + 7]], ROBE, 4, { round: 0.85, floor: 1 });
    px.toneLine(P[0] - 2.4, P[1] + 1, P[0] - 3.6, hy - 3, -1, rid);
    px.toneLine(P[0] + 3, P[1] + 1, P[0] + 3.4, hy - 3, 1, rid);
    // the front panel, gold-edged, weed up from the hem
    px.part();
    px.poly([[P[0] + 0.4, P[1] - 1], [P[0] + 3.8, P[1] - 1], [P[0] + 4.4 - vx, hy - 1.6], [P[0] + 2.6 - vx * 1.2, hy + 0.8], [P[0] + 1, hy - 1.8], [P[0] + 0.2 - vx, hy + 0.6]], ROBE_D, 4.1, { round: 0.8, floor: 1 });
    px.line(P[0] + 0.4, P[1] - 1, P[0] + 0.2 - vx, hy - 1, GOLD, 4.15, { fix: 2 });
    px.line(P[0] + 3.8, P[1] - 1, P[0] + 4.4 - vx, hy - 2, GOLD, 4.15, { fix: 1 });
    px.part();
    for (let i = 0; i < 5; i++) px.dot(P[0] - 4.4 + i * 2.2 + tipD * 0.3, hy - 1 - (i % 2) * 1.6, WEED, 4.2, { fix: 1 });
  }

  // ---- the pelvis, the girdle, the spine and the rib cage with the witch-fire heart in it
  px.body(1);
  px.ellipse(P[0] - 0.2, P[1] - 0.6, 4.2, 2.5, BONE, 4.3, { floor: 1 });
  px.capsule(...at(0.04, -4), 1.1, ...at(1.04, -3), 1.1, BONE, 3.9, { bias: -1 });
  px.capsule(...at(-0.1, 0.4), 1.3, N[0], N[1] + 2, 1.1, BONE, 4.05, { weld: 1.5 });
  const rw = 5.4, pulse = 0.5 + 0.5 * Math.sin(((ph ?? 0) * 2) * Math.PI * 2);
  px.poly([at(-0.1, -rw + 0.4), at(-0.1, rw - 0.2), at(0.3, rw + 0.2), at(0.62, rw - 1), at(0.78, 0.4), at(0.54, -rw + 1)], BONE, 4.5, { round: 0.7, floor: 1 });
  for (const t of [0.1, 0.26, 0.42, 0.58]) px.line(...at(t, -rw + 0.6), ...at(t + 0.03, rw - 0.8 - t * 1.4), GAP, 4.6);
  px.line(...at(-0.04, 0.8), ...at(0.76, 0.6), BONE, 4.65, { fix: 3 });
  px.body(0);
  px.part();
  px.rect(P[0] - 4.8, P[1] - 3, 9.6, 1.6, GOLD, 4.4, { fix: 2 });
  px.dot(P[0] + 2.2, P[1] - 2.2, GEM, 4.45, { fix: 3 });
  // the heart: a teal fire between the ribs
  px.part();
  { const h = at(0.38, 1.4); px.ellipse(h[0], h[1], 1.7, 2.0, F_TEAL, 4.7, { noLine: true }); px.dot(h[0], h[1] - (pulse > 0.5 ? 0.6 : 0), F_PALE, 4.75, { noLine: true }); }
  // the mantle over the shoulders: a gold-edged collar, verdigris fittings, weed
  px.part(); const mid = px._pid;
  px.poly([at(0.05, -rw - 1.6), at(0.02, rw + 1.4), at(0.12, rw + 3), at(0.3, rw + 1.2), at(0.26, 0), at(0.3, -rw - 1), at(0.14, -rw - 3)], ROBE, 5, { round: 0.8, floor: 1, edge: true });
  px.line(...at(0.05, -rw - 1.4), ...at(0.3, -rw - 0.8), GOLD, 5.1, { fix: 2 });
  px.line(...at(0.02, rw + 1.4), ...at(0.3, rw + 1), GOLD, 5.1, { fix: 2 });
  for (const s of [-3.4, -0.6, 2.4]) px.dot(...at(0.07, s), CROWN, 5.2, { fix: 2 });
  px.part();
  px.poly([at(0.0, -4), at(-0.08, -5.4), at(0.4, -6.4 - vx), at(0.56, -5.2 - vx * 1.4), at(0.3, -3.8)], WEED, 5.3, { round: 0.7, floor: 1 });

  // ---- the crowned skull
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  px.part();
  px.stamp(p.snarl > 0.5 ? SNARL : SKULL, hx + 1, hy - 1, p.eye > 0.5 ? LEG_HOT : LEG, 6, { ax: 6, ay: 12, ball: [6, 8, 6.4, 6.8], cast: 1 });
  px.part();
  px.dot(hx - 6, hy - 8 + (vx > 0.5 ? 1 : 0), WEED, 6.2, { fix: 1 }); px.dot(hx - 6, hy - 7, WEED, 6.2, { fix: 1 });

  // ---- the great sword: a dark blade with a burning edge, a gold guard and pommel
  px.part();
  px.capsule(...at2(-4.4, 0), 0.9, ...at2(1.6, 0), 0.9, HAFT, 8.1);
  px.ellipse(...at2(-5, 0), 1.3, 1.3, GOLD, 8.12, { fix: 2 });
  px.line(...at2(1.8, -2.6), ...at2(1.8, 2.8), GOLD, 8.14, { fix: 2 });
  px.dot(...at2(1.8, -2.9), CROWN, 8.15, { fix: 2 }); px.dot(...at2(1.8, 3.1), CROWN, 8.15, { fix: 2 });
  px.part();
  px.poly([at2(2.4, -1.5), at2(2.4, 1.6), at2(BL - 2.4, 1.4), at2(BL, 0.1), at2(BL - 2.4, -1.2)], STEEL, 8.2, { fix: 3 });
  px.line(...at2(3, 0.3), ...at2(BL - 3, 0.2), STEEL, 8.22, { fix: 1 });
  px.line(...at2(2.6, -1.5), ...at2(BL - 1.6, -0.9), F_TEAL, 8.3, { noLine: true });
  px.dot(...at2(BL - 1.2, -0.3), F_PALE, 8.35, { noLine: true });
  // the near arm over all: the violet sleeve, the bone forearm, the hand on the grip
  px.body(1);
  px.limb([[sN[0], sN[1] + 0.6], eN, hdN], [2.2, 2.0, 1.2], ROBE, 8.4, { floor: 1, weld: 2, weldRoot: 3 });
  const nf = mix(eN, hdN, 0.3);
  px.capsule(nf[0], nf[1], 1.8, hdN[0], hdN[1], 1.2, BONE, 8.45, { wrap: true });
  px.ellipse(eN[0] + 0.2, eN[1], 2.0, 1.9, ROBE, 8.42, { floor: 1, weld: 2 });
  px.line(eN[0] - 1.6, eN[1] + 2, eN[0] + 1.4, eN[1] + 2.4, GOLD, 8.48, { fix: 2 });
  px.ellipse(hdN[0], hdN[1], 1.7, 1.6, BONE, 8.6, { weld: 1.5 });
  px.body(0);
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1], 2.1, 1.9, ROBE, 8.3, { floor: 1 });

  const tipP = at2(BL, 0);
  return {
    light: { x: at(0.38, 1.4)[0], y: at(0.38, 1.4)[1], r: 26 + 8 * tk, col: "#7ce0b8", k: 0.3 + 0.12 * pulse + 0.2 * tk },
    sword: [at2(2.6, 0), tipP], toll: tk, tollR: p.tollR || 0, feet: [P[0], 0], fl,
  };
};

// the witch-fire licking off the blade, and the toll: columns of fire climbing out of the road ahead of him
export const fx = (px, F, info, clip) => {
  if (!info) return;
  const NL = { noLine: true }, [a, b] = info.sword, ph = F.ph;
  for (let i = 0; i < 5; i++) {
    const t = 0.25 + i * 0.16, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, h = (i + Math.floor(ph * 8)) % 2;
    px.dot(x, y - 1.6 - h, i % 2 ? F_TEAL : F_DEEP, 20, NL);
    if (i === 2 || h) px.dot(x - 0.4, y - 3 - h, F_PALE, 20, NL);
  }
  if (info.toll > 0.05) {
    // the columns: teal fire climbing out of the ground ahead, each on its own beat
    const t = info.tollR;
    for (let i = 0; i < 5; i++) {
      const gx = info.feet[0] + 16 + i * 9 + (i % 2) * 2, h = Math.max(0, 1 - Math.abs(((t * 1.4 + i * 0.37) % 1) - 0.45) * 2.4) * (8 + (i % 3) * 4);
      for (let k = 0; k < h; k++) { const c = k > h - 2 ? F_PALE : k % 3 ? F_TEAL : F_DEEP, w = k < h * 0.6 ? 1 : 0; for (let j = -w; j <= w; j++) px.dot(gx + j + (k % 2 ? 0.6 : 0), -1 - k, j ? F_DEEP : c, 20, NL); }
    }
    for (const [dx, r] of [[22, 6], [36, 9]]) for (let j = -3; j <= 3; j++) px.dot(info.feet[0] + dx + j * (r / 3), -0.5 + Math.abs(j) * 0.2, F_DEEP, 19, NL);
  }
};

const TAU = Math.PI * 2;
const GUARD = { drop: 1.0, lean: 0.1, hx: 0.6, hy: 0, aN: [1.2, 0.84, 0], aF: [1.2, 0.84, 0], fN: [-2.6, 0], fF: [2.8, 0], sword: 0.3, snarl: 0, eye: 0, toll: 0, tollR: 0, fire: 0.5 };
const march = (ph) => walkPose(ph, { stride: 4.6, lift: 2.2, swing: 0.1, bob: 1.0, lean: 0.12 });
export const CLIPS = {
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b; return { ...GUARD, rise: 0.5 * u, drop: 1.0 + 0.4 * (1 - u), sword: 0.3 + 0.05 * b, aN: [1.2, 0.84 + 0.02 * b, 0], hy: 0.2 * b, fire: u, eye: ph > 0.74 && ph < 0.8 ? 1 : 0 }; },
  },
  // a slow, regal march: the sword held up before him, a little sway to the cape
  walk: {
    n: 8, ms: 1200, loop: true, lag: 0.09,
    pose: (ph) => { const w = march(ph), a = Math.cos(ph * TAU); return { ...GUARD, ...w, drop: w.drop + 0.8, hx: 0.9, hy: 0.3 * a, aN: [1.2 + 0.05 * a, 0.84, 0], sword: 0.28 + 0.06 * a, fire: 0.5 + 0.5 * Math.sin(ph * TAU) }; },
  },
  // the blow: the sword heaved up behind the crown, a held beat, a step in, one great cut down through the foe
  attack: {
    n: 14, ms: 1000, loop: false, lag: 0.07,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      { t: 0.3, e: "out", p: { ...GUARD, rx: -2.4, drop: 1.8, lean: -0.1, hx: -0.4, hy: -0.4, aN: [2.8, 0.9, 0], aF: [2.8, 0.9, 0], sword: -0.55, fN: [-3.4, 0], fF: [3.4, 0], fire: 1 } },
      { t: 0.42, e: "io", p: { ...GUARD, rx: -3, drop: 2, lean: -0.16, hx: -0.6, hy: -0.5, aN: [2.95, 0.92, 0], aF: [2.95, 0.92, 0], sword: -0.85, fire: 1, eye: 1 } },
      { t: 0.54, e: "in3", p: { ...GUARD, rx: 3.6, drop: 2.6, lean: 0.5, hx: 2.2, hy: 0.8, aN: [1.5, 1, 0], aF: [1.5, 1, 0], sword: 1.9, fF: [7.6, 0], snarl: 1, eye: 1, fire: 1 } },
      { t: 0.64, e: "out", p: { ...GUARD, rx: 4.2, drop: 2.8, lean: 0.58, hx: 2.6, hy: 1, aN: [1.3, 1, 0], aF: [1.3, 1, 0], sword: 2.25, fF: [8, 0], snarl: 1, eye: 1, fire: 1 } },
      { t: 0.84, e: "io", p: { ...GUARD, rx: 1.2, drop: 1.0, lean: 0.24, aN: [1.1, 0.9, 0], sword: 1.3, fire: 0.7 } },
      { t: 1, e: "out", p: GUARD },
    ], ph),
  },
};
// The call, ON THE MARCH (the game: every ten seconds the court's dead are called up in front of him, without
// breaking his step). Walk-shaped: the very legs of `walk`, the sword raised overhead and shaken, teal fire
// climbing out of the road ahead.
CLIPS.toll = {
  n: 8, ms: 1200, loop: true, lag: 0.09,
  pose: (ph) => {
    const w = march(ph), a = Math.cos(ph * TAU), sg = Math.sin(ph * TAU * 2);
    return { ...GUARD, ...w, drop: w.drop + 0.8, hx: 0.9, hy: -0.5, aN: [2.55 + 0.05 * sg, 0.9, 0], aF: [2.55, 0.9, 0], sword: 0.02 + 0.07 * sg, eye: 1, fire: 1, toll: 1, tollR: (ph * 2) % 1 };
  },
};
