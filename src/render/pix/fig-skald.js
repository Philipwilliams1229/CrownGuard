// ============ FIGURE: the Rime Skald (game type `skald`) ============
// The war-poet: a sea-teal cloak with an ochre border streaming behind him, a great
// fur collar, a long forked beard hung with brass rings, a woven ochre band on his brow
// with a tall raven plume, a frame drum on his far arm (a bent hoop, a pale hide
// painted with a teal raven) and a bone-knobbed beater in the near fist, a bone
// war-horn at his back hip. He beats the drum on each footfall as he marches. Look c,
// "bold": big collar, big plume, the thrall's sea-teal and ochre. About 50 px.
// Clips: idle, walk (8 frames, the beater falls on each contact), attack (a drum shove
// and a club with the beater, lands at 0.54) and CHANT: the march with his head thrown
// back, mouth open, drum and beater high, in step with `walk` (same legs, other arms).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN } from "./rig.js";

const SKIN = mat("#e2b48c"), TEAL = mat("#2f5866"), TEAL_L = mat("#4a7a88"), OCHRE = mat("#d0943a"), TUNIC = mat("#7a6248"), TUNIC_L = mat("#8c8468"), WOOL = mat("#4a5a60"), LEATHER = mat("#5a3e2a");
const FURW = mat("#e8e6e0"), HAIR = mat("#b87444"), BONE = mat("#ece0c4"), BRASS = mat("#c8a040"), HIDE = mat("#e8dcc0"), WOOD = mat("#7a5632"), RAVEN = mat("#2a3040", { contrast: 1.2 });
const EYE = flat("#2a1c2c"), MOUTH = flat("#3a1a22"), NOTE = flat("#fff0c0", { emis: true, line: "#d0943a" });

// The head, facing +x a quarter turned: swept-back hair (H), the woven band (B), skin (S, s,
// N the nose), eyes (E), moustache and forked beard (R), brass rings (G), an open mouth (M).
const HEAD = [
  ".....HHHH....",
  "...HHHHHHHH..",
  "..HHHHHHHHHH.",
  ".HBBBBBBBBBB.",
  ".HHHSSssSSs..",
  ".HHSSESSSES..",
  ".HHSSESSSESN.",
  ".HHRSSSSSSSN.",
  ".HRRRSSRRRR..",
  "..HRRRRRRRR..",
  "..HHRRGRRRR..",
  "...HRRR.RRG..",
];
const BLINK = HEAD.map((r, i) => (i === 5 || i === 6 ? r.replace(/E/g, "S") : r));
const CHANT = HEAD.map((r, i) => (i === 8 ? ".HRRRSMMMRR.." : i === 9 ? "..HRRRMMMRR.." : r));
const LEG = {
  H: { m: HAIR, fix: 2 }, B: { m: OCHRE, fix: 3 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYE }, R: { m: HAIR, fix: 1 }, G: { m: BRASS, fix: 3 }, M: { m: MOUTH },
};

export const MUST = [["nearArm", "notOver", "eyes"]];
export const BOX = { w: 100, h: 88, ox: 40, oy: 78 };
// THE GRIP: the beater's angle (from upright, + toward the foe) is DERIVED from the solved near forearm: forearm direction
// (elbow -> hand) + GRIP + a wrist of +-0.35, never posed on its own. A drumstick is held lower than a club's 90 degrees so it can reach the drum.
export const GRIP = -1.1, WRIST = 0.35;
const forearm = (sk) => { const f = Math.atan2(sk.hdN[0] - sk.eN[0], -(sk.hdN[1] - sk.eN[1])); return f < -1.9 ? f + Math.PI * 2 : f; };
export const beatAngle = (sk) => forearm(sk) + GRIP + Math.max(-WRIST, Math.min(WRIST, sk.p.wrist || 0));
export const BONES = scaled(HUMAN, 1.06, { shN: -3.2, shF: 3.2, hipN: -1.4, hipF: 1.6, neck: 1.4 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), vy = cl(N[1] - lag1.N[1], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]);

  // the raven plume, swinging a beat behind the head
  {
    const s = cl(-vx * 1.6 - vx2 * 1.2, -3, 3), r = [hx - 1, hy - 8.6], m = [r[0] - 3 + s * 0.4, r[1] - 5.6 - vy * 0.2], t = [m[0] - 4.2 + s * 0.8, m[1] - 3.2 + Math.abs(s) * 0.3];
    px.part();
    px.capsule(r[0], r[1], 1.2, m[0], m[1], 1.8, RAVEN, 0.6); px.capsule(m[0], m[1], 1.8, t[0], t[1], 0.6, RAVEN, 0.6);
    px.dot(r[0] - 1.6, r[1] - 3, BRASS, 0.65, { fix: 3 });
  }
  // the cloak: teal, an ochre border, streaming from the shoulders to the calf, its tail late
  {
    const s = cl(-vx * 1.8 - vx2 * 1.4, -4, 4), top = C[0] - 2, hem = P[1] + 8;
    px.part(); const cid = px._pid;
    px.poly([[top + 3, C[1] - 1.4], [top - 3, C[1] + 0.4], [top - 10 + s * 0.4, C[1] + 6], [P[0] - 12 + s * 0.8, hem - 2], [P[0] - 13 + s * 1.2, hem], [P[0] - 2 + s * 0.6, hem + 1], [P[0] + 2, P[1] - 2], [C[0] + 3, C[1] + 3]], TEAL, 0.5, { round: 0.85, cast: 1 });
    px.toneLine(top - 2, C[1] + 3, P[0] - 5 + s * 0.8, hem - 1, -1, cid);
    px.poly([[P[0] - 13 + s * 1.2, hem - 1.4], [P[0] - 2 + s * 0.6, hem - 0.4], [P[0] - 2 + s * 0.6, hem + 1], [P[0] - 13 + s * 1.2, hem]], OCHRE, 0.52, { round: 0.9 });
    // the war-horn at the back hip
    px.part();
    px.capsule(P[0] - 4.4, P[1] - 1, 1.5, P[0] - 6.4, P[1] + 2.2, 1.9, BONE, 0.8, { cast: 1 });
    px.capsule(P[0] - 6.4, P[1] + 2.2, 1.9, P[0] - 5.4 + s * 0.2, P[1] + 5.4, 1, BONE, 0.8, { cast: 1 });
    px.dot(P[0] - 6.2, P[1] + 1.4, BRASS, 0.85, { fix: 3 });
  }

  // the far arm and the frame drum
  px.part();
  px.capsule(sF[0], sF[1], 2.1, eF[0], eF[1], 1.9, TUNIC_L, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.9, hdF[0], hdF[1], 1.6, TUNIC_L, 1, { bias: -1 });
  const R = 6.8, dx = hdF[0] + 2.2, dy = hdF[1] - 0.8 - (p.dlift || 0);
  px.part(); const did = px._pid;
  px.ellipse(dx, dy, R, R, WOOD, 1.5, { round: 0.5, cast: 1 });
  px.ellipse(dx, dy, R * 0.82, R * 0.82, HIDE, 1.52, { round: 0.6 });
  // the painted raven on the hide, a teal wedge of wings
  px.poly([[dx - 3.4, dy + 1.6], [dx - 0.6, dy - 2.6], [dx + 0.6, dy - 0.4], [dx + 3.2, dy - 2.2], [dx + 1.8, dy + 2.4]], TEAL, 1.54, { fix: 2 });
  px.dot(dx + 0.6, dy - 1, OCHRE, 1.56, { fix: 3, noLine: true });
  px.toneLine(dx - R * 0.6, dy - R * 0.6, dx + R * 0.6, dy + R * 0.6, -1, did);
  px.ellipse(hdF[0] + 0.4, hdF[1] + 0.2, 1.8, 1.8, SKIN, 1.7, { bias: -1 });

  // legs: wool trews, leather wraps, fur-topped boots
  for (const [h, k, a, z, b] of [[hF, kF, anF, 2, -1], [hN, kN, anN, 3, 0]]) {
    px.part();
    px.capsule(h[0], h[1], 2.5, k[0], k[1], 2.1, WOOL, z, { bias: b });
    px.capsule(k[0], k[1], 2.1, a[0], a[1], 1.7, WOOL, z, { bias: b });
    const w0 = mix(k, a, 0.45);
    px.capsule(w0[0], w0[1], 2.1, a[0], a[1], 1.9, LEATHER, z + 0.03, { bias: b });
    px.capsule(a[0] - 0.4, a[1] + 0.5, 1.5, a[0] + 3.4, a[1] + 0.8, 1.2, LEATHER, z + 0.03, { bias: b });
    px.capsule(w0[0] - 1.8, w0[1] - 0.2, 1.1, w0[0] + 1.8, w0[1] + 0.2, 1.1, FURW, z + 0.05, { bias: b });
  }

  // the tunic: ochre-brown to the knee, a leather belt with a brass buckle, the hem a beat late
  const hem = P[1] + 4.4, hF2 = P[0] + 5.4 - vx * 0.8, hB = P[0] - 5.8 - vx * 1.4 - vx2 * 0.6;
  px.part();
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 4.8, C[1] - 1.6], [C[0] + 5.6, C[1] + 3.4], [P[0] + 5, P[1] - 2.4], [hF2, hem], [hF2 - 3.4, hem + 0.8], [P[0] - 0.4 - vx, hem], [hB + 3, hem + 0.8], [hB, hem], [P[0] - 5, P[1] - 2.4], [C[0] - 5.8, C[1] + 3.4]], TUNIC, 4, { round: 0.9, ny: -0.1, cast: 1 });
  px.toneLine(P[0] + 0.6, P[1] - 0.6, P[0] + 0.2 - vx, hem - 0.6, -1, px._pid);
  px.poly([[P[0] - 5, P[1] - 3.2], [P[0] + 5, P[1] - 3.2], [P[0] + 5.1, P[1] - 1.2], [P[0] - 5, P[1] - 1.2]], LEATHER, 4.2, { round: 0.9 });
  px.rect(P[0] + 1.2, P[1] - 3, 2.4, 2, BRASS, 4.25, { fix: 3 });
  px.poly([[hB, hem - 1.6], [hF2, hem - 1.6], [hF2, hem + 0.2], [hB, hem + 0.2]], OCHRE, 4.05, { round: 0.9 });
  // the big fur collar
  px.part();
  px.ellipse(C[0] + 0.2, C[1] + 0.2, 9, 4.2, FURW, 4.4, { cast: 1 });
  px.ellipse(sN[0] - 0.4, sN[1] + 0.2, 4.8, 4.2, FURW, 8, { cast: 1 });
  for (const x of [-7, -4.4, -1.6, 1.2, 4, 6.6]) px.dot(C[0] + 0.2 + x, C[1] + 3 + (x & 1), FURW, 4.4);

  // the head
  px.part();
  px.stamp(p.chant > 0.5 ? CHANT : p.blink ? BLINK : HEAD, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });

  // the near arm over it all: sleeve, a leather cuff, the beater in the fist
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1] + 0.6, 2.2, eN[0], eN[1], 2, TUNIC_L, 7.9, { cast: 1 });
  px.capsule(eN[0], eN[1], 2, hdN[0], hdN[1], 1.8, TUNIC_L, 7.9, { cast: 1 });
  const c0 = mix(eN, hdN, 0.68);
  px.capsule(c0[0], c0[1], 2, hdN[0], hdN[1], 1.9, LEATHER, 7.95, { cast: 1 });
  {
    const a = beatAngle(sk), d = [Math.sin(a), -Math.cos(a)], at = (f) => [hdN[0] + d[0] * f, hdN[1] + d[1] * f];
    px.tag(null);
    px.part(); px.tag("weapon");
    px.capsule(...at(-2), 0.8, ...at(8.4), 0.8, WOOD, 8.1, { edge: true });
    px.ellipse(...at(9.2), 1.9, 1.9, BONE, 8.12);
    px.part(); px.tag("nearHand");
    px.ellipse(hdN[0], hdN[1], 1.7, 2.2, SKIN, 8.3, { rot: -a });
    px.tag(null);
  }

  return { drum: [dx, dy], hand: hdN, head: [hx, hy] };
};

// the club's smear (attack) and the chant's rising notes (chant)
const T0 = 0.42, T1 = 0.54;
export const fx = (px, F, info, clip) => {
  const { ph } = F, NL = { noLine: true };
  if (clip === "attack" && ph > T0 && ph < T1 + 0.1 && info.hand) {
    const [x, y] = info.hand;
    for (let i = 0; i < 3; i++) px.dot(x + 5 + i * 3, y - 2 + i * 2.4, flat("#f4f8ff", { emis: true, line: "#b8c8d8" }), 20, NL);
  }
  if (clip === "chant" && info.head) {
    const [hx, hy] = info.head;
    for (let i = 0; i < 4; i++) {
      const u = (ph + i / 4) % 1, x = hx + 5 + u * 9 + Math.sin(i * 2 + u * 5) * 1.5, y = hy - 4 - u * 9 - (i % 2) * 2;
      if (y < -BOX.oy + 3 || u > 0.9) continue;
      px.dot(x, y, NOTE, 20, u > 0.7 ? NL : {}); px.dot(x, y - 1, NOTE, 20, NL); px.dot(x + 1, y - 2, NOTE, 20, NL);
    }
  }
};

const TAU = Math.PI * 2;
const GUARD = { drop: 0.8, lean: 0.1, hx: 0.6, hy: 0, aN: [0.9, 0.78, 0], aF: [1.2, 0.7, 0], fN: [-3, 0], fF: [3.2, 0], dlift: 0 };
// the beater falls on each contact (twice a cycle): 0 = struck, 1 = raised
const beatPose = (ph) => { const u = 0.5 + 0.5 * Math.cos((ph * 2 - 0.02) * TAU); return { aN: [1.0 + 0.45 * u, 0.82, 0]}; };
const march = (ph) => { const w = walkPose(ph, { stride: 4.2, lift: 2.4, swing: 0.2, bob: 1.2, lean: 0.1 }); return { ...w, drop: w.drop + 0.6 }; };
export const CLIPS = {
  idle: {
    n: 8, ms: 1800, loop: true, lag: 0.09,
    pose: (ph) => {
      const b = Math.sin(ph * TAU), u = 0.5 + 0.5 * b;
      return { ...GUARD, rise: 0.6 * u, drop: 0.8 + 0.3 * (1 - u), aN: [0.9 + 0.06 * b, 0.78, 0], aF: [1.2 - 0.04 * b, 0.7, 0], blink: ph >= 0.84 && ph < 0.96 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 780, loop: true, lag: 0.09,
    pose: (ph) => ({ ...march(ph), hx: 1, aF: [1.2, 0.7, 0], ...beatPose(ph) }),
  },
  // the war-chant on the march: the same legs as walk, the head thrown back, the drum and beater raised
  chant: {
    n: 8, ms: 780, loop: true, lag: 0.09,
    pose: (ph) => { const b = beatPose(ph); return { ...march(ph), hx: -0.8, hy: -1.4, aF: [1.5, 0.76, 0], aN: [1.5 + (b.aN[0] - 1.0) * 0.4, 0.86, 0], dlift: 0.6, chant: 1 }; },
  },
  attack: {
    n: 11, ms: 760, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: GUARD },
      // the drum swung out to shove, the beater drawn back
      { t: 0.24, e: "out", p: { ...GUARD, rx: -1.8, drop: 1.4, lean: 0.02, aF: [1.45, 0.9, 0], aN: [2.4, 0.9, 0], fF: [3.4, 1] } },
      { t: T0, e: "io", p: { ...GUARD, rx: -2.4, drop: 1.4, lean: -0.04, twist: -0.4, aF: [1.4, 0.9, 0], aN: [2.8, 0.94, 0], fF: [3.4, 1.6] } },
      // the club: a step in, the knob brought down
      { t: T1, e: "in3", p: { ...GUARD, rx: 3, drop: 2.2, lean: 0.46, twist: 0.4, hx: 2, hy: 0.5, aF: [1.5, 0.9, 0], aN: [0.3, 0.96, 0], fF: [7.4, 0] } },
      { t: 0.66, e: "out", p: { ...GUARD, rx: 3.4, drop: 2.5, lean: 0.5, twist: 0.5, hx: 2.2, aF: [1.5, 0.9, 0], aN: [0.25, 0.96, 0], fF: [7.4, 0] } },
      { t: 0.84, e: "io", p: { ...GUARD, rx: 1.4, drop: 1.2, lean: 0.2, fF: [5.6, 1.4] } },
      { t: 1, e: "out", p: GUARD },
    ], ph),
  },
};
