// ============ CONCEPT FIGURE: Wren, the huntress ============
// A forest-green hood and cloak, an auburn braid, a longbow in the far hand,
// the string drawn by the near one. Clips: idle, walk, attack (raise and draw,
// hold, loose, the string hand flying back, reach for the next arrow).
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, HUMAN, scaled } from "./rig.js";

const HOOD = mat("#467a3c"), TUNIC = mat("#5a8c44"), CLOAK = mat("#335a30"), SKIN = mat("#eccaa4"), HAIR = mat("#b5623a");
const LEG_C = mat("#6a4c34"), BOOT = mat("#4a3224"), LEATHER = mat("#7a5232"), BOW = mat("#6a4424", { contrast: 1.15 }), GOLD = mat("#d8b34a");
const SHIRT = mat("#d8cdb0"), STEEL = mat("#c4cad6", { contrast: 1.2 }), EYE = flat("#2a1c2c"), LIP = flat("#b86a5a"), STRING = flat("#f2ead4", { line: "#6a5a48" });
const FLETCH = mat("#e8dcc0"), FLETCH_R = mat("#b03440"), STREAK = flat("#fff3d2", { emis: true, line: "#d8cdb0" });

// hood up, the face framed by it and a sweep of auburn hair
// (H hood, h hood a tone down, R hair, S skin, s skin a tone down, E eye, N nose, m lips)
const HEAD = [
  "....HHHHH....",
  "..HHHHHHHHH..",
  ".HHHHHHHHHHH.",
  ".HHHhhhhhhhH.",
  ".HHhRRRsssSH.",
  ".HHhRRSESSE..",
  ".HHhRSSESSEN.",
  ".HHhRSSSSSS..",
  "..HhRRSSmm...",
  "..HHhRSSS....",
  "...HHhh......",
];
const BLINK = HEAD.map((r, i) => (i === 5 ? ".HHhRRSSSSS.." : i === 6 ? ".HHhRSSeSSeN." : r));
const LEG = {
  H: { m: HOOD }, h: { m: HOOD, bias: -1 }, R: { m: HAIR }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  e: { m: SKIN, fix: 0 }, E: { m: EYE }, m: { m: LIP },
};

export const BOX = { w: 92, h: 72, ox: 30, oy: 62 };
export const BONES = scaled(HUMAN, 1, { thigh: 8.8, shin: 8.3, shN: -2.6, shF: 2.6, hipN: -1.2, hipF: 1.3 });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 2.2, k[0], k[1], 1.9, LEG_C, z, { bias: b });
  px.capsule(k[0], k[1], 1.8, an[0], an[1] - 2.5, 1.6, LEG_C, z, { bias: b });
  px.capsule(k[0] * 0.25 + an[0] * 0.75, k[1] * 0.25 + an[1] * 0.75, 1.9, an[0], an[1], 1.7, BOOT, z + 0.02, { bias: b });
  px.ellipse(an[0] + 1.2, an[1] + 0.9, 2.6, 1.4, BOOT, z + 0.03, { bias: b });
};

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, hN, hF, kN, kF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), sway = p.sway || 0;

  // the cloak down her back, its tail a beat behind
  const t1 = -vx * 1.5 + sway * 0.5, t2 = -vx * 2.2 - vx2 * 1.6 + sway;
  px.part();
  px.poly([[C[0] - 3.2, C[1] - 1.8], [C[0] + 1.6, C[1] - 1.8], [P[0] - 0.6, P[1] + 2], [P[0] - 2.6 + t2 * 0.6, -9.4], [P[0] - 4.6 + t2, -11.4], [P[0] - 6.8 + t2, -9],
    [P[0] - 6.6 + t1, P[1] + 1], [C[0] - 5.4, C[1] + 3.5]], CLOAK, 0.5, { round: 0.85 });
  px.toneLine(C[0] - 4.2, C[1] + 4, P[0] - 5.2 + t2 * 0.8, -11.5, -1, px._pid);
  // the quiver on her back, three fletchings standing out of it
  const q0 = [C[0] - 2.6, C[1] + 7], q1 = [C[0] - 6, C[1] - 2.4];
  px.part();
  px.capsule(q0[0], q0[1], 1.9, q1[0], q1[1], 1.9, LEATHER, 0.8);
  px.line(q1[0] - 1.6, q1[1] + 0.8, q1[0] + 1.6, q1[1] - 0.4, GOLD, 0.82);
  px.part();
  for (const [dx, m] of [[-0.9, FLETCH], [1.1, FLETCH]]) px.capsule(q1[0] + dx - 0.4, q1[1] - 1.6, 0.8, q1[0] + dx - 1.2, q1[1] - 4, 0.7, m, 0.78);

  // the far arm (the bow arm), a tone down
  px.part();
  px.capsule(sF[0], sF[1], 1.9, eF[0], eF[1], 1.8, TUNIC, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.8, hdF[0], hdF[1], 1.6, SHIRT, 1, { bias: -1 });
  px.capsule(eF[0] * 0.45 + hdF[0] * 0.55, eF[1] * 0.45 + hdF[1] * 0.55, 1.8, eF[0] * 0.15 + hdF[0] * 0.85, eF[1] * 0.15 + hdF[1] * 0.85, 1.7, LEATHER, 1.02, { bias: -1 });

  // the bow: two limbs sprung from the grip; bw tilts it (+ top toward the foe)
  const bw = p.bow ?? 0.25, dr = p.draw || 0, cs = Math.cos(bw), sn = Math.sin(bw);
  const R = (x, y) => [hdF[0] + x * cs - y * sn, hdF[1] + x * sn + y * cs];
  const flex = dr * 1.6;                                   // drawn, the tips come back
  const top = R(-2.6 - flex, -12.5 + flex * 0.4), bot = R(-2.6 - flex, 12.5 - flex * 0.4);
  px.part();
  px.capsule(...R(0.3, -1.6), 1.05, ...R(0.9, -6.5), 0.95, BOW, 1.4, { edge: true }); px.capsule(...R(0.9, -6.5), 0.95, ...top, 0.6, BOW, 1.4, { edge: true });
  px.capsule(...R(0.3, 1.6), 1.05, ...R(0.9, 6.5), 0.95, BOW, 1.4, { edge: true }); px.capsule(...R(0.9, 6.5), 0.95, ...bot, 0.6, BOW, 1.4, { edge: true });
  px.capsule(...R(0.3, -1.8), 1.2, ...R(0.3, 1.8), 1.2, LEATHER, 1.42);
  px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.7, SKIN, 1.6, { bias: -1 });

  // legs, then the tunic: belted, skirted to mid-thigh
  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);
  const hemB = P[0] - 5.2 - vx * 1.1, hemF = P[0] + 5 - vx * 0.7, hy = P[1] + 2.8;
  px.part(); const tun = px._pid;
  px.poly([[C[0] - 4, C[1] - 1.8], [C[0] + 4.2, C[1] - 1.8], [C[0] + 5, C[1] + 3], [P[0] + 3.9, P[1] - 3], [hemF, hy], [hemF - 2.6, hy + 0.9], [P[0] - vx, hy], [hemB + 2.4, hy + 0.9], [hemB, hy], [P[0] - 4.2, P[1] - 3], [C[0] - 5, C[1] + 3]], TUNIC, 4, { round: 0.92, cast: 2 });
  px.toneLine(P[0] + 0.8, P[1] - 0.5, P[0] + 0.6 - vx, hy - 0.5, -1, tun);
  px.poly([[P[0] - 4.3, P[1] - 4.4], [P[0] + 4, P[1] - 4.4], [P[0] + 4, P[1] - 2.6], [P[0] - 4.3, P[1] - 2.6]], LEATHER, 4.05, { round: 0.92 });
  px.rect(P[0] + 1, P[1] - 4.4, 2, 2, GOLD, 4.06, { fix: 3 });
  // the quiver's strap across the chest
  px.toneLine(C[0] - 3.4, C[1] - 0.6, P[0] + 3, P[1] - 5, -1, tun);

  // head, and the hood's point hanging back off it
  const hx = Math.round(N[0]), hyy = Math.round(N[1]), tp = cl(vx * 2 + vx2 * 1.4, -2, 3) - sway * 0.4;
  px.part();
  px.capsule(hx - 4, hyy - 6, 1.7, hx - 7.2 - tp, hyy - 3.4 + Math.abs(tp) * 0.2, 0.7, HOOD, 5.9, { bias: -1 });
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hyy, LEG, 6, { ax: 6, ay: 9, ball: [6.5, 5, 7, 6.5], cast: 2 });
  // her braid over the near shoulder
  px.part();
  px.capsule(hx - 2.4, hyy + 0.6, 1.3, hx - 3.2 - vx, hyy + 4.6, 1.1, HAIR, 6.2);
  px.dot(hx - 3.6 - vx, hyy + 5.6, GOLD, 6.22, { fix: 3 });

  // the string (through the near fingers once she draws) and the arrow on it
  const nock = dr > 0.12 ? hdN : null;
  if (nock) { px.part(); px.line(top[0], top[1], nock[0], nock[1], STRING, 7.5, { noLine: true }); px.line(nock[0], nock[1], bot[0], bot[1], STRING, 7.5, { noLine: true }); }
  else { px.part(); px.line(top[0], top[1], bot[0], bot[1], STRING, 1.3, { noLine: true }); }
  if (p.arrow > 0.5) {
    // the shaft lies from the nock across the bow hand
    const a0 = nock || R(-2.6, 0), ax = hdF[0] + 0.6 - a0[0], ay = hdF[1] - 0.8 - a0[1], l = Math.hypot(ax, ay) || 1, ux = ax / l, uy = ay / l, L = Math.max(l + 3.5, 15);
    px.part();
    px.line(a0[0], a0[1], a0[0] + ux * L, a0[1] + uy * L, BOW, 7.6, { fix: 3 });
    px.capsule(a0[0] + ux * L, a0[1] + uy * L, 0.9, a0[0] + ux * (L + 2.2), a0[1] + uy * (L + 2.2), 0.4, STEEL, 7.62);
    px.capsule(a0[0] + ux * 0.6, a0[1] + uy * 0.6 - 0.6, 0.9, a0[0] + ux * 2.8, a0[1] + uy * 2.8 - 0.6, 0.7, FLETCH, 7.62);
  }

  // the near arm: a rolled green sleeve, a pale shirt cuff, a leather bracer
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.1, eN[0], eN[1], 1.9, TUNIC, 8, { cast: 2 });
  px.capsule(eN[0], eN[1], 1.9, hdN[0], hdN[1], 1.6, SHIRT, 8, { cast: 2 });
  px.capsule(eN[0] * 0.5 + hdN[0] * 0.5, eN[1] * 0.5 + hdN[1] * 0.5, 1.9, eN[0] * 0.15 + hdN[0] * 0.85, eN[1] * 0.15 + hdN[1] * 0.85, 1.8, LEATHER, 8.02);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.6, 1.6, SKIN, 8.2);

  return { bowHand: hdF };
};

// the arrow in flight, a short streak behind it
export const fx = (px, { ph, sk }, info, clip) => {
  if (clip !== "attack" || ph < 0.6) return;
  const t = (ph - 0.6) / 0.4, [bx, by] = sk.hdF, x = bx + 4 + t * 150, y = by - 0.8 + t * t * 3;
  if (x > 60) return;
  px.line(x - 9 - t * 16, y, x - 2, y, STREAK, 20, { noLine: true });
  px.line(x - 6, y, x + 7, y, BOW, 20.2, { fix: 3 });
  px.capsule(x + 7, y + 0.5, 0.9, x + 9.4, y + 0.5, 0.4, STEEL, 20.3);
  px.capsule(x - 6, y - 0.2, 0.9, x - 3.8, y - 0.2, 0.7, FLETCH, 20.3);
};

const READY = { aF: [0.72, 0.78, 0], bow: 0.32, aN: [0.42, 0.74, 0], draw: 0, arrow: 0, fN: [-1.8, 0], fF: [2, 0] };
export const CLIPS = {
  idle: {
    n: 8, ms: 1900, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 1); return { ...READY, rise: 0.5 + 0.5 * b, aF: [0.72, 0.78 - 0.03 * (0.5 + 0.5 * b), 0], bow: 0.32 + 0.02 * b2, sway: b2 * 0.8, blink: ph > 0.5 && ph < 0.62 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 680, loop: true, lag: 0.08,
    pose: (ph) => { const w = walkPose(ph, { stride: 5.6, lift: 2.8, swing: 0.5, bob: 1.2 }), a = Math.cos(ph * Math.PI * 2); return { ...w, aF: [0.62 + 0.14 * a, 0.74, 0], bow: 0.5 + 0.08 * a, draw: 0, arrow: 0 }; },
  },
  attack: {
    n: 14, ms: 1000, loop: false, lag: 0.06,
    pose: (ph) => sampleKeys([
      { t: 0, p: { ...READY, arrow: 1 } },
      { t: 0.14, e: "io", p: { aF: [1.05, 0.86, 0], bow: 0.12, aN: [1.2, 0.56, 0], draw: 0.15, arrow: 1, twist: -0.2, fN: [-1.8, 0], fF: [2, 0] } },
      { t: 0.4, e: "out", p: { rx: -0.6, lean: -0.06, twist: -0.7, rise: 0.6, aF: [1.5, 1, 0], bow: 0, aN: [2.05, 0.36, 1], draw: 1, arrow: 1, fN: [-2.4, 0], fF: [2.6, 0] } },
      { t: 0.58, e: "io", p: { rx: -0.8, lean: -0.08, twist: -0.8, rise: 1, aF: [1.52, 1, 0], bow: 0, aN: [2.08, 0.4, 1], draw: 1, arrow: 1, fN: [-2.4, 0], fF: [2.6, 0] } },
      { t: 0.64, e: "in3", p: { rx: -0.3, lean: -0.02, twist: -1, rise: 0.6, aF: [1.46, 1, 0], bow: 0.16, aN: [2.75, 0.62, 1], draw: 0, arrow: 0, fN: [-2.4, 0], fF: [2.6, 0] } },
      { t: 0.78, e: "out", p: { rx: 0, lean: 0, twist: -0.8, aF: [1.3, 0.96, 0], bow: 0.24, aN: [3.1, 0.6, 1], draw: 0, arrow: 0, fN: [-2.4, 0], fF: [2.6, 0] } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
};
