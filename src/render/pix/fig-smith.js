// ============ CREW FIGURE: the Trapsmith ============
// A smith at his anvil: a flat cap, a short dark beard, sleeves rolled over
// thick forearms, a leather apron. The far hand keeps the tongs on the iron the
// whole time; the near one swings the hammer.
//
// He stands where the old smith stood (trapsmith.js: feet at x - 6.5, y + 4),
// so the hall's hot iron lies before him at 14..22 art px ahead, its top 24.4 up
// (the hall paints it). A pose names the two fists (`gN` the hammer hand, `gF`
// the tongs hand: art px from his feet, facing +x) and the haft's angle
// (`haft`, radians, 0 = lying forward, -PI/2 = standing up); the arms are
// solved to the fists (ik), so the hammer goes exactly where it is put.
// Clips:
//   idle    the hammer resting on the iron, a breath (between blows at ease)
//   hammer  ONE BLOW as a 12-frame loop (1 s): lift, the top held, the strike in a
//           single frame, the bounce off the iron, the settle. `hit` 0.5: frame 6
//           is the frame the face is ON the iron; the hall sparks on it.
// Marks, every frame: hammer (the middle of the hammer's head), strike (the
// middle of its face: where the sparks start), tongs (the jaws on the iron).
// One look (CREW_FOLK.smith).
import { mat, flat } from "./pix.js";
import { sampleKeys, HUMAN, scaled, ik } from "./rig.js";

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const lighten = (c, t) => mix(c, "#fff3d2", t), darken = (c, t) => mix(c, "#2a1c2c", t);

// today's palette (folk-kit.js CREW_FOLK.smith); hair and beard are new (the old smith's cap hid his): dark hair, a russet beard
const PAL = { skin: "#e8b990", hood: "#4a3a2e", coat: "#5a4a3c", boots: "#2e2420", trim: "#6a4a2e", hair: "#4c3222", beard: "#7a4a28" };
const COAT = mat(PAL.coat), SLEEVE = mat(lighten(PAL.coat, 0.2)), APRON = mat(darken(PAL.trim, 0.1)), STRAP = mat(darken(PAL.trim, 0.4));
const LEGC = mat(lighten(PAL.boots, 0.12)), BOOT = mat(darken(PAL.boots, 0.2)), CAP = mat(PAL.hood), SKIN = mat(PAL.skin), HAIR = mat(PAL.hair), BEARD = mat(PAL.beard);
const EYE = flat("#2a1c2c"), WOOD = mat("#7a5634"), IRON = mat("#747a86", { contrast: 1.25 }), FACE = mat("#b8bcc6"), TONG = flat("#2e2a30");
const SMEAR = flat("#fff3d2", { emis: true, line: "#d8c8a0" }), SMEAR2 = flat("#c8ccd6", { emis: true, line: "#9aa0ac" });

// His head, facing +x: the flat cap (C; k where the sun catches it) and its
// brim out over the brow (c, a tone down: its underside leaves a row of skin
// above the eye); hair behind the ear (H); a short russet beard round the jaw (D, d a
// tone down), the mouth a gap in it (l); the face at the front edge, the nose
// proud (S skin, s a tone down, b brow, E eye, N nose).
const HEAD = [
  ".....kCCC.....",
  "...kkCCCCCC...",
  "..kCCCCCCCCC..",
  ".kCCCCCCCCCC..",
  ".CCCCCCccccccc",
  ".HHsSSSbbSbb..",
  ".HHSSSSSESSE..",
  ".HDsSSSSESSEN.",
  "..DDSSSSSSSS..",
  "..DDDdSSSlDD..",
  "...DDDDDDDD...",
  "....DDdDDD....",
];
const BLINK = HEAD.map((r, i) => (i === 6 ? r.replace(/E/g, "S") : i === 7 ? r.replace(/E/g, "e") : r));
const LEG = {
  C: { m: CAP, bias: -1, floor: 1 }, k: { m: CAP, floor: 1 }, c: { m: CAP, fix: 0 },
  S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, e: { m: SKIN, fix: 0 }, l: { m: SKIN, fix: 0 }, E: { m: EYE },
  H: { m: HAIR, fix: 1 }, b: { m: HAIR, fix: 2 }, D: { m: BEARD, fix: 2 }, d: { m: BEARD, fix: 1 },
};

export const BOX = { w: 44, h: 64, ox: 12, oy: 61 };
// the engineer's height, a broader back and thicker arms
export const BONES = scaled(HUMAN, 1.2, { thigh: 9.8, shin: 9.2, spine: 12, neck: 1.8, upper: 7.6, fore: 7.1, shN: -3.2, shF: 3.2, hipN: -1.6, hipF: 1.8 });

const leg = (px, h, k, an, z, b) => {
  px.part();
  px.capsule(h[0], h[1], 3.1, k[0], k[1], 2.6, LEGC, z, { bias: b, floor: 1 });
  px.capsule(k[0], k[1], 2.5, an[0], an[1] - 2.4, 2.1, LEGC, z, { bias: b, floor: 1 });
  px.capsule(k[0] * 0.3 + an[0] * 0.7, k[1] * 0.3 + an[1] * 0.7, 2.4, an[0], an[1], 2.2, BOOT, z + 0.02, { bias: b, floor: 1 });
  px.ellipse(an[0] + 1.4, an[1] + 1, 3.2, 1.5, BOOT, z + 0.03, { bias: b, floor: 1 });
};

const HAFT = 6.6, HEAD_W = 2.5, HEAD_L = 3.5;     // fist to the head's middle; the head's half-width along the haft and half-length across it
// the hammer of a pose: the haft's line, the head's middle, its face
const hammerOf = (hand, ang) => {
  const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
  const c = [hand[0] + d[0] * HAFT, hand[1] + d[1] * HAFT];
  return { d, n, c, butt: [hand[0] - d[0] * 2.4, hand[1] - d[1] * 2.4], face: [c[0] + n[0] * HEAD_L, c[1] + n[1] * HEAD_L] };
};
const TONGS = [8.8, -26.8], JAW = [14.8, -25];   // the old figure's own points x2

export const draw = (px, { sk }) => {
  const { p, P, C, N, sN, sF, hN, hF, kN, kF, anN, anF, B } = sk;
  const gN = p.gN || sk.hdN, gF = p.gF || TONGS;
  const aN = ik(sN[0], sN[1] + 0.3, gN[0], gN[1], B.upper, B.fore, 1), aF = ik(sF[0], sF[1], gF[0], gF[1], B.upper, B.fore, 1);
  const eN = aN.mid, hdN = aN.end, eF = aF.mid, hdF = aF.end;
  const H = hammerOf(hdN, p.haft ?? 0);

  // the far arm and the tongs it keeps on the iron
  px.part();
  px.capsule(sF[0], sF[1], 2.4, eF[0], eF[1], 2.3, SLEEVE, 1, { bias: -1 });
  px.capsule(eF[0], eF[1], 1.9, hdF[0], hdF[1], 1.7, SKIN, 0.98, { bias: -1 });
  px.part();
  px.line(hdF[0] - 1.2, hdF[1] + 0.2, JAW[0], JAW[1] - 0.6, TONG, 1.5, { noLine: true });
  px.line(hdF[0] - 0.8, hdF[1] + 1.4, JAW[0], JAW[1] + 0.4, TONG, 1.5, { noLine: true });
  px.part(); px.ellipse(hdF[0], hdF[1], 1.7, 1.8, SKIN, 1.6, { bias: -1 });

  leg(px, hF, kF, anF, 2, -1);
  leg(px, hN, kN, anN, 3, 0);

  // the coat, then the leather apron over it: a bib on the chest, a skirt to the knee
  const top = C[1] - 1.8;
  px.part();
  px.poly([[C[0] - 7.6, top + 1.8], [C[0] - 4.2, top], [C[0] + 4, top], [C[0] + 7, top + 1.8], [C[0] + 6.8, C[1] + 5], [P[0] + 5.2, P[1] - 3], [P[0] + 5.6, P[1] + 1.8], [P[0] - 6.4, P[1] + 1.8], [P[0] - 5.8, P[1] - 3], [C[0] - 7.6, C[1] + 5]], COAT, 4, { round: 0.92, cast: 2 });
  px.part(); const apron = px._pid;
  px.poly([[C[0] - 1.6, top + 3], [C[0] + 5, top + 3], [C[0] + 6.4, C[1] + 6], [P[0] + 5.4, P[1] - 3], [P[0] + 6.6, P[1] + 6.4], [P[0] - 2.8, P[1] + 6.8], [P[0] - 3.4, P[1] - 3], [C[0] - 2.8, C[1] + 6]], APRON, 4.2, { round: 0.85, cast: 1 });
  px.toneLine(P[0] + 1.4, P[1] - 1, P[0] + 1.8, P[1] + 5.6, -1, apron);                       // a fold down the skirt
  px.line(C[0] - 1.6, top + 3, C[0] - 3.4, top + 0.4, STRAP, 4.22, { fix: 1 });                // the bib's strap over the shoulder
  px.line(P[0] - 5.6, P[1] - 3.6, P[0] + 5.2, P[1] - 3.6, STRAP, 4.24, { fix: 1 });            // the apron string round the waist

  // the head: whole pixels
  const hx = Math.round(N[0]), hyy = Math.round(N[1]);
  px.part();
  px.stamp(p.blink ? BLINK : HEAD, hx, hyy, LEG, 6, { ax: 7, ay: 12, cast: 2, ball: [6.5, 6, 6.5, 6.5] });

  // the hammer in the near fist: the haft, the iron head across it, its bright face
  const { d, n, c } = H, q = (a, b) => [c[0] + d[0] * a + n[0] * b, c[1] + d[1] * a + n[1] * b];
  px.part();
  px.capsule(H.butt[0], H.butt[1], 0.9, c[0], c[1], 0.9, WOOD, 7.6, { edge: true });
  px.part();
  px.poly([q(-HEAD_W, -HEAD_L + 0.6), q(HEAD_W, -HEAD_L + 0.6), q(HEAD_W, HEAD_L), q(-HEAD_W, HEAD_L)], IRON, 7.7, { round: 0.7, cast: 2 });
  px.poly([q(-HEAD_W, HEAD_L - 1.3), q(HEAD_W, HEAD_L - 1.3), q(HEAD_W, HEAD_L), q(-HEAD_W, HEAD_L)], FACE, 7.72, { fix: 3 });

  // the near arm over it all: the sleeve rolled above the elbow, a thick bare forearm, the fist on the haft
  px.part();
  px.capsule(eN[0], eN[1], 2.3, hdN[0], hdN[1], 2, SKIN, 7.98, { cast: 1 });
  px.part();
  px.capsule(sN[0], sN[1] + 0.3, 3.1, eN[0], eN[1], 2.7, SLEEVE, 8, { cast: 2 });
  px.part(); px.ellipse(hdN[0], hdN[1], 2.1, 2.2, SKIN, 8.2);

  return { hammerAt: H, marks: { hammer: c, strike: H.face, tongs: JAW } };
};

// the blow's smear: one crescent on the frame the hammer lands, along the arc its head just came down
export const fx = (px, F, info, clip) => {
  if (clip !== "hammer" || Math.abs(F.ph - HIT) > 0.02) return;
  const sk0 = F.at(TOP_T), s = [F.sk.sN[0], F.sk.sN[1] + 0.3];
  const a0 = ik(sk0.sN[0], sk0.sN[1] + 0.3, sk0.p.gN[0], sk0.p.gN[1], F.sk.B.upper, F.sk.B.fore, 1).end;
  const h0 = hammerOf(a0, sk0.p.haft).c, h1 = info.hammerAt.c;
  let t0 = Math.atan2(h0[1] - s[1], h0[0] - s[0]), t1 = Math.atan2(h1[1] - s[1], h1[0] - s[0]);
  const r0 = Math.hypot(h0[0] - s[0], h0[1] - s[1]), r1 = Math.hypot(h1[0] - s[0], h1[1] - s[1]);
  t0 += (t1 - t0) * 0.25; t1 -= (t1 - t0) * 0.14;                // a wedge: from a quarter of the way down, widening to just above the head
  const N = 14, out = [], inn = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, t = t0 + (t1 - t0) * u, r = r0 + (r1 - r0) * u + 1.4, w = 0.8 + 2.9 * u;
    out.push([s[0] + Math.cos(t) * r, s[1] + Math.sin(t) * r]); inn.push([s[0] + Math.cos(t) * (r - w), s[1] + Math.sin(t) * (r - w)]);
  }
  px.poly([...out, ...inn.reverse()], SMEAR2, 20, { noLine: true });
  const mid = out.map((o, i) => { const k = inn[N - i]; return [(o[0] * 0.5 + k[0] * 0.5), (o[1] * 0.5 + k[1] * 0.5)]; });
  px.poly([...out, ...mid.reverse()], SMEAR, 20.1, { noLine: true });
};

// ---- the blow ------------------------------------------------------------------
const HIT = 0.5, TOP_T = 0.42;
const STANCE = { fN: [-3.8, 0], fF: [3.6, 0] };
const REST = { ...STANCE, rx: 0.6, drop: 0.3, rise: 0.4, lean: 0.05, twist: 1.3, gN: [13.3, -27.9], gF: TONGS, haft: -0.06 };
export const CLIPS = {
  idle: {
    n: 8, ms: 2400, loop: true,
    pose: (ph) => { const b = Math.sin(ph * Math.PI * 2), b2 = Math.sin(ph * Math.PI * 2 - 1.1); return { ...REST, rx: 0.6 + 0.3 * b2, drop: 0.3 - 0.1 * b, rise: 0.4 + 0.45 * b, lean: 0.05 - 0.015 * b, blink: ph > 0.56 && ph < 0.7 ? 1 : 0 }; },
  },
  hammer: {
    n: 12, ms: 1000, loop: true, hit: HIT,
    pose: (ph) => sampleKeys([
      { t: 0, p: REST },
      // the lift: the weight going back, the head coming up off the iron
      { t: 0.17, e: "in", p: { ...STANCE, rx: 0.1, drop: 0.2, rise: 0.8, lean: 0, twist: 1.4, gN: [11.6, -35.5], gF: TONGS, haft: -1.05 } },
      // the top: high, ahead of his cap, the haft upright (HOLD)
      { t: 0.34, e: "out", p: { ...STANCE, rx: -0.7, drop: 0, rise: 1.2, lean: -0.09, twist: 1.6, hy: -0.5, gN: [6.6, -42.4], gF: TONGS, haft: -1.62 } },
      { t: TOP_T, e: "io", p: { ...STANCE, rx: -0.9, drop: 0, rise: 1.3, lean: -0.11, twist: 1.6, hy: -0.6, gN: [6.2, -42.8], gF: TONGS, haft: -1.66 } },
      // the strike: one frame, the body dropping in behind it; the face flat on the iron
      { t: HIT, e: "in3", p: { ...STANCE, rx: 0.9, drop: 1.5, rise: 0, lean: 0.11, twist: 1.3, hy: 0.6, gN: [13.4, -28.3], gF: TONGS, haft: 0 } },
      // the bounce off the iron
      { t: 0.6, e: "out", p: { ...STANCE, rx: 0.8, drop: 1.1, rise: 0.1, lean: 0.09, twist: 1.3, hy: 0.4, gN: [13, -30.6], gF: TONGS, haft: -0.3 } },
      // the settle: the head resting on the iron
      { t: 0.76, e: "io", p: { ...REST, drop: 0.6, rise: 0.2, lean: 0.07 } },
      { t: 1, e: "io", p: REST },
    ], ph),
  },
};
