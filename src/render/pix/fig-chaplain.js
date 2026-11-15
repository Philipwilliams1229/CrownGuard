// ============ FIGURE: the Battle Chaplain ============
// Look "b" of the Iron family: a cream alb to the ankle under an oxblood chasuble worked with a
// brass orphrey cross, mail sleeves, a grey-bearded face under a tall iron-banded mitre over a
// mail coif (the stand-out shape), a black-iron flanged mace and, on a chain from the far fist,
// the reliquary: a little brass house whose windows light as he prays. Facing +x.
// Clips: `idle`, `walk` (8 frames, the mace carried up before him, the reliquary swinging),
// `attack` (the reliquary raised in the far hand, the mace up behind and brought down),
// `heal`: a walk-shaped clip (same legs and body as `walk`) worn on the march while his prayer
// gathers, the reliquary lifted high and burning, motes rising round it.
import { mat, flat } from "./pix.js";
import { walkPose, sampleKeys, scaled, HUMAN } from "./rig.js";

export const BONES = scaled(HUMAN, 1.16, { shN: -2.8, shF: 3, upper: 7.3, fore: 7 });
export const BOX = { w: 90, h: 86, ox: 36, oy: 78 };

const CREAM = mat("#e0d8c4", { contrast: 1.0 }), CREAMK = mat("#b8ae94"), OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20", { floor: 1 });
const MAIL = mat("#7e8490", { contrast: 1.3 }), MAILK = mat("#545a66"), IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#2e3038", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const SKIN = mat("#d8a888"), BEARD = mat("#c8c0b0", { contrast: 1.1 }), BROW = mat("#8a8478"), BRASS = mat("#c8a040", { contrast: 1.2 }), BOOT = mat("#2e2a2c", { floor: 1 });
const EYE = flat("#2a1c2c"), WIN = flat("#ffe8a0", { emis: true, line: "#a8803c" }), WINK = flat("#6a5a3a", { line: "#3a2e1c" });
const HOLY = flat("#fff6c8", { emis: true, line: "#e8c860" }), HOLY2 = flat("#ffe27a", { emis: true, line: "#d8a840" }), HOLY3 = flat("#e8b048", { emis: true });

// the mitre and the face under it. C cream, c a tone down, O oxblood orphrey, I iron band, w mail coif,
// S skin, s shade, N nose, b brow, E eye (e shut), B beard, m mouth
const HEAD = [
  ".......OO.......",
  "......CCOO......",
  ".....CCCCOO.....",
  "....cCCCCCCO....",
  "...ccCCCCCCCO...",
  "..ccCCCCCCCCCC..",
  "..IIIIBIIIIIII..",
  "..wwwsSbbSbbS...",
  "..wwwsSSESSSEN..",
  "..wwwsSSSSSSSN..",
  "..wwBBBSSSmSS...",
  "..wwBBBBBBBS....",
  "...wBBBBBBBB....",
  "....wBBBBBB.....",
];
const blink = (rows) => rows.map((r) => r.replace(/E/g, "e"));
const LEG = {
  C: { m: CREAM }, c: { m: CREAM, bias: -1 }, O: { m: OX }, I: { m: IRON }, B: { m: BEARD }, w: { m: MAIL }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYE }, e: { m: SKIN, fix: 0 }, m: { m: MAILK },
};
LEG.B = { m: BEARD };
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export const draw = (px, { sk, lag1, lag2 }) => {
  const { p, P, C, N, sN, sF, eN, eF, hdN, hdF, anN, anF } = sk;
  const vx = cl(C[0] - lag1.C[0], -2.5, 2.5), vx2 = cl(lag1.C[0] - lag2.C[0], -2.5, 2.5), vy = cl(C[1] - lag1.C[1], -2, 2);
  const hx = Math.round(N[0]), hy = Math.round(N[1]), sway = p.sway || 0, g = p.glow || 0;

  // ---- the far arm: a mail sleeve under a cream cuff; the reliquary hangs from its fist on a chain
  px.part();
  px.capsule(sF[0], sF[1], 2.2, eF[0], eF[1], 2.1, MAIL, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 2.1, hdF[0], hdF[1], 1.8, MAIL, 1, { bias: -1 });
  px.part(); px.ellipse(hdF[0], hdF[1], 1.6, 1.6, SKIN, 1.2, { bias: -1 });
  const up = (p.lift || 0) > 0.5;
  const rel = [hdF[0] + 1.2 + sway * 1.4 + (up ? 0 : 0), hdF[1] + 6.8 + (up ? 0.5 : 0) + vy * 0.4];
  const chain = (z) => { px.line(hdF[0], hdF[1] + 0.6, rel[0], rel[1] - 3.2, BRASS, z, { noLine: true }); };

  // feet under the hem
  for (const [an, zz, b] of [[anF, 2, -1], [anN, 3, 0]]) { px.part(); px.ellipse(an[0] + 2, an[1] + 1.4, 2.6, 1.2, BOOT, zz, { fix: 1 + b }); }

  // ---- the alb, ankle length, its hem cut from the feet
  const hemY = -0.8, hemF = Math.max(P[0] + 5.2, Math.max(anN[0], anF[0]) + 3.6) - vx * 0.8, hemB = Math.min(P[0] - 5.6, Math.min(anN[0], anF[0]) - 3.6) - vx * 1.3 - vx2 * 0.8;
  const hm = (t) => hemB + (hemF - hemB) * t, top = C[1] - 2.2;
  px.part(); const rb = px._pid;
  px.poly([[C[0] - 4.4, top], [C[0] + 4.5, top], [C[0] + 5.2, C[1] + 3], [P[0] + 4.6, P[1] - 2], [hm(1), hemY], [hm(0.5), hemY + 0.5], [hm(0), hemY], [P[0] - 5, P[1] - 2], [C[0] - 5.4, C[1] + 3]], CREAM, 4, { round: 0.9, cast: 1, edge: true });
  px.toneLine(P[0] - 2.4, P[1] + 2, hm(0.28), hemY - 4, -1, rb);
  px.toneLine(P[0] + 2.4, P[1] + 2, hm(0.78), hemY - 4, 1, rb);
  px.line(hm(0.02) + 0.6, hemY - 1.4, hm(0.98) - 0.4, hemY - 1.4, OX, 4.04, { noLine: true });       // an oxblood hem band, a little muddied
  px.dot(hm(0.3), hemY - 1.4, OXK, 4.05, { fix: 0 }); px.dot(hm(0.66), hemY - 1.4, OXK, 4.05, { fix: 0 });
  // the cord belt, its tassels
  px.part();
  px.line(P[0] - 5, P[1] - 3.2, P[0] + 4.8, P[1] - 3.2, BRASS, 4.1);
  px.line(P[0] + 3.4, P[1] - 3, P[0] + 4 - vx * 0.8 + sway * 0.5, P[1] + 4.6, BRASS, 4.12);
  px.dot(P[0] + 4 - vx * 0.8 + sway * 0.5, P[1] + 5.4, OX, 4.14, { fix: 3 });
  // the chasuble: an oxblood panel before and behind to the knee, a brass cross, a worn edge
  px.part(); const ch = px._pid;
  const cf = [P[0] + 5.2, P[1] + 7.6], cb = [P[0] - 5.6, P[1] + 7.2];
  px.poly([[C[0] - 4.6, C[1] - 2.8], [C[0] + 4.8, C[1] - 2.8], [C[0] + 5.6, C[1] + 3], [cf[0], cf[1] - 1 - vx * 0.4], [cf[0] - 1.2, cf[1] + 1.2], [cb[0] + 1.4, cb[1] + 1.4], [cb[0], cb[1] - 1 - vx * 0.7], [C[0] - 5.6, C[1] + 3]], OX, 4.2, { round: 0.9, cast: 1 });
  px.toneLine(C[0] - 3.4, C[1] + 2, cb[0] + 0.4, cb[1] - 1, 1, ch);
  px.line(C[0] + 0.4, C[1] - 1.6, C[0] + 0.8, P[1] + 6, BRASS, 4.24, { noLine: true });                    // the cross's upright
  px.line(C[0] - 2.6, C[1] + 3, C[0] + 3.6, C[1] + 3, BRASS, 4.24, { noLine: true });                       // and its arm
  px.dot(C[0] + 0.6, C[1] + 3, STEELB, 4.26, { fix: 4 });
  px.line(cb[0] + 0.8, cb[1] + 0.4, cf[0] - 1, cf[1] + 0.2, BRASS, 4.22, { noLine: true });                // the hem's brass edge
  // the mail coif's shoulders and the amice
  px.part();
  px.poly([[C[0] - 5.4, C[1] - 3.4], [C[0] + 5.4, C[1] - 3.4], [C[0] + 6, C[1] + 0.2], [C[0] + 2.4, C[1] + 1.6], [C[0] - 2.4, C[1] + 1.2], [C[0] - 6, C[1] + 0.4]], MAIL, 5, { round: 0.9, cast: 1 });

  // ---- the head
  px.part();
  px.stamp(p.blink ? blink(HEAD) : HEAD, hx, hy, LEG, 6, { ax: 7, ay: 14, cast: 2, ball: [6.5, 5, 7, 6.5] });
  // the mitre's two lappets trailing behind
  const lap = cl(-vx * 1.4 - vx2 * 1.0 + sway * 0.6, -2.4, 2.4);
  px.part();
  px.poly([[hx - 4.4, hy - 8.4], [hx - 2.4, hy - 8.4], [hx - 4.4 + lap * 0.5, hy - 3], [hx - 7 + lap, hy - 0.4], [hx - 8.4 + lap, hy - 3.4]], OX, 5.8, { round: 0.7, cast: 1 });
  px.dot(hx + 1, hy - 14 + 6.4, BRASS, 6.1, { fix: 3 });          // the mitre's brass stud on the band

  // ---- the mace through the near fist: a black-iron head with four flanges
  const a = p.mc ?? 0.5, d = [Math.sin(a), -Math.cos(a)], nr = [-d[1], d[0]];
  const B = (t, s = 0) => [hdN[0] + d[0] * t + nr[0] * s, hdN[1] + d[1] * t + nr[1] * s];
  const hd = B(15);
  px.part();
  px.capsule(...B(-4), 1.15, ...B(13), 1.05, IRONK, 7, { edge: true });
  px.capsule(...B(-0.4), 1.3, ...B(3.6), 1.3, OX, 7.02);
  px.ellipse(...B(-4.6), 1.4, 1.4, BRASS, 7.05);
  px.ellipse(hd[0], hd[1], 2.5, 2.8, IRON, 7.1, { vb: 0.2, cast: 1 });
  for (const s of [-1, 1]) px.poly([[hd[0] + nr[0] * s * 2, hd[1] + nr[1] * s * 2], [hd[0] + nr[0] * s * 5 + d[0] * 1.5, hd[1] + nr[1] * s * 5 + d[1] * 1.5], [hd[0] + nr[0] * s * 2 + d[0] * 4, hd[1] + nr[1] * s * 2 + d[1] * 4]], IRONK, 7.12, { cast: 0 });
  px.capsule(...B(17.6), 0.9, ...B(19.4), 0.3, IRON, 7.12, { edge: true });
  px.dot(hd[0] + d[0] * 1, hd[1] + d[1] * 1, STEELB, 7.15, { fix: 4 });

  // ---- the near arm: a mail sleeve, a gloved fist
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 2.4, eN[0], eN[1], 2.3, MAIL, 8, { cast: 2 });
  px.capsule(eN[0], eN[1], 2.3, hdN[0], hdN[1], 1.9, MAIL, 8, { cast: 2 });
  px.capsule(eN[0] * 0.3 + hdN[0] * 0.7, eN[1] * 0.3 + hdN[1] * 0.7, 2.1, eN[0] * 0.15 + hdN[0] * 0.85, eN[1] * 0.15 + hdN[1] * 0.85, 2.1, CREAMK, 8.02);
  px.part(); px.ellipse(hdN[0], hdN[1], 1.8, 1.8, SKIN, 8.2);

  // ---- the reliquary: a brass house on its chain, windows lit as the prayer burns
  px.part(); chain(7.5);
  px.part();
  const [rx, ry] = rel;
  px.poly([[rx - 3.2, ry - 1.6], [rx, ry - 4.6], [rx + 3.2, ry - 1.6], [rx + 3.2, ry + 3.6], [rx - 3.2, ry + 3.6]], BRASS, 7.6, { cast: 1 });
  px.rect(rx - 1.6, ry - 0.6, 3.2, 3.4, g > 0.35 ? WIN : WINK, 7.7, { noLine: true });
  px.line(rx, ry - 0.6, rx, ry + 2.8, BRASS, 7.72, { noLine: true });
  px.dot(rx, ry - 5.4, BRASS, 7.6, { fix: 3 });
  const k = cl(g, 0, 1.3);
  return { rel, flash: p.flash || 0, hd, feet: [P[0], 0], hemB, hemF, light: k > 0.1 ? { x: rx, y: ry, r: 14 + 24 * cl(k, 0, 1), col: "#ffe8a0", k: 0.5 * k } : null };
};

// the prayer: motes rising round the reliquary while it gathers; rays and a ring of light as it falls
export const fx = (px, { ph }, info, clip) => {
  if (!info || !info.rel) return;
  const [x, y] = info.rel, NL = { noLine: true };
  if (clip === "heal") {
    for (let i = 0; i < 4; i++) { const u = (ph * 2 + i / 4) % 1, a = u * 7 + i * 1.7; px.dot(x + Math.cos(a) * (3 + 2 * u), y - 3 - u * 12, u < 0.5 ? HOLY : HOLY2, 20 + u, NL); }
    const r = 5 + 3 * Math.sin(ph * Math.PI * 4); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; px.dot(x + Math.cos(a) * r, y + 0.5 + Math.sin(a) * r * 0.8, i % 2 ? HOLY3 : HOLY2, 19.8, NL); }
    return;
  }
  if (clip === "attack" && info.flash > 0.15) {
    const [hx, hy] = info.hd, k = info.flash;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3, r0 = 3.8 + 2 * k, r1 = r0 + (i % 2 ? 4 : 7) * k; px.line(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0 * 0.8, hx + Math.cos(a) * r1, hy + Math.sin(a) * r1 * 0.8, i % 2 ? HOLY2 : HOLY, 20, NL); }
  }
};

// ---- poses ---------------------------------------------------------------------------------
const TAU = Math.PI * 2;
const READY = { aN: [0.62, 0.8, 0], aF: [0.5, 0.9, 0], mc: 0.45, fN: [-2, 0], fF: [2.4, 0], lean: 0.04, glow: 0.15, sway: 0, lift: 0, flash: 0, blink: 0 };
const march = (ph) => walkPose(ph, { stride: 4.6, lift: 2.4, swing: 0.3, bob: 0.9, lean: 0.06 });
export const CLIPS = {
  idle: {
    n: 8, ms: 2200, loop: true, lag: 0.1,
    pose: (ph) => { const b = Math.sin(ph * TAU), b2 = Math.sin(ph * TAU - 0.9); return { ...READY, rise: 0.7 * (0.5 + 0.5 * b), mc: 0.45 + 0.03 * b2, sway: b2 * 0.8, glow: 0.18 + 0.12 * Math.max(0, b2), blink: ph > 0.62 && ph < 0.74 ? 1 : 0 }; },
  },
  walk: {
    n: 8, ms: 800, loop: true, lag: 0.08,
    pose: (ph) => { const w = march(ph), a = Math.cos(ph * TAU); return { ...READY, ...w, aN: [0.62 + 0.04 * a, 0.8, 0], mc: 0.4 + 0.05 * a, aF: [0.2 - 0.3 * a, 0.94, 0], sway: a * 1.3, glow: 0.12 }; },
  },
  // the prayer on the march: the reliquary lifted high in the far fist and burning, the mace held low and out
  heal: {
    n: 8, ms: 800, loop: true, lag: 0.08,
    pose: (ph) => { const w = march(ph), b = Math.sin(ph * TAU); return { ...READY, ...w, aN: [0.4, 0.86, 0], mc: 0.9, aF: [1.95, 0.88, 0], lift: 1, sway: b * 0.5, glow: 0.9 + 0.2 * b, hy: -0.4, rise: 0.4 }; },
  },
  // the reliquary raised, the mace swung up behind the head and brought down in a burst of light
  attack: {
    n: 13, ms: 880, loop: false, lag: 0.07, hit: 0.54,
    pose: (ph) => sampleKeys([
      { t: 0, p: READY },
      { t: 0.3, e: "out", p: { ...READY, rx: -1.2, drop: 0.7, lean: -0.12, twist: -0.6, rise: 0.4, hy: 0.4, aN: [3.2, 0.82, 1], mc: -0.95, aF: [1.7, 0.84, 0], lift: 1, glow: 0.8 } },
      { t: 0.42, e: "io", p: { ...READY, rx: -1.6, drop: 0.9, lean: -0.15, twist: -0.8, rise: 0.5, hy: 0.5, aN: [3.4, 0.84, 1], mc: -1.1, aF: [1.9, 0.86, 0], lift: 1, glow: 1.1 } },
      { t: 0.54, e: "in3", p: { ...READY, rx: 2.6, drop: 1.8, lean: 0.24, twist: 0.8, hx: 0.5, aN: [1.1, 1, 0], mc: 2.1, aF: [1.5, 0.84, 0], lift: 1, glow: 1.3, flash: 1, fF: [6, 0], fN: [-2.6, 0] } },
      { t: 0.68, e: "out", p: { ...READY, rx: 3, drop: 2, lean: 0.27, twist: 0.9, hx: 0.6, aN: [0.6, 0.96, 0], mc: 2.5, aF: [1.1, 0.84, 0], glow: 0.7, flash: 0.5, fF: [6, 0], fN: [-2.6, 0] } },
      { t: 0.84, e: "io", p: { ...READY, rx: 2.2, drop: 1.4, lean: 0.18, twist: 0.5, aN: [0.55, 0.94, 0], mc: 2.2, aF: [0.7, 0.88, 0], glow: 0.3, flash: 0.1, fF: [5, 0], fN: [-2.2, 0] } },
      { t: 1, e: "io", p: READY },
    ], ph),
  },
};
