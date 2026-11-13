// ============ FIGURE: the Boar Rider (game type `boarrider`) and the loose boar ============
// An angry boar about 62 px long: a heavy wedge, all shoulder, with a huge low
// head, small red eyes, yellowed tusks, a black-brown crest of bristles from
// the brow over the hump to the rump, short strong legs on cloven hooves and a
// little tufted tail. Astride its shoulders a goblin lancer (the goblin of
// fig-goblin.js in a leather cap): knees gripping, the far hand in the
// bristles, a long lance under the near arm. Rider and boar stand ~56 px tall.
// The boar stands on beast.js (four legs); the rider's joints are placed here
// and his elbows and knee solved with `ik`, so his bones keep their length. He
// rides a beat behind the back under him.
//   o.variant === "loose": the same boar with NO rider (the game crumbles this
//   one when the boar dies and the lancer leaps clear). All three clips work.
// Clips: idle (pawing, snorting), walk (its CHARGE: a pounding one-flight
// gallop, the lance couched), attack (the tusks hooked up and forward as the
// lance is thrust). fx: the snort's breath, the tusks' smear.
import { mat, flat } from "./pix.js";
import { HUMAN, sampleKeys, ik } from "./rig.js";
import { QUAD, beastFrames, tailPts, gallop } from "./beast.js";

const HIDE = mat("#6e4a38"), BELLY = mat("#96725c"), CREST = mat("#3a2620"), TUSK = mat("#ece0c4"), HOOF = mat("#2e2422");
const SNOUT = mat("#b98e78"), BEYE = flat("#e05248"), BGLINT = flat("#ffb0a0"), NOSTRIL = flat("#2c1a22"), BMOUTH = flat("#2c1a22");
// the rider: the Greenwood goblin's colours
const SKIN = mat("#6aa04f"), CAP = mat("#5a4630"), JERK = mat("#5f4326"), DARK = mat("#3c2a18"), WOOD = mat("#8a6238"), STEEL = mat("#c4c8d0", { contrast: 1.2 });
const EYE = flat("#d8402e"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22");
const BREATH = flat("#f2ecdc"), BREATH2 = flat("#cfd8c2"), SMEAR = flat("#f4efe0"), SMEAR2 = flat("#d9d2c0");

// The boar's head, facing +x: a long wedge from the brow down to the flat disc
// of the snout (S, s the nostril). A small red eye (E, e) under a heavy brow
// (B), the tusk (T) curving up over the lip from a pale jaw (P), jowl (h).
const BHEAD = [
  "..HHHHH...............",
  ".HHHHHHHH.............",
  "HHHHHHHHHLL...........",
  "HHHHHHBBBHHLL.........",
  "HHHHHHHEeHHHHLLL......",
  "HHHHHHHEEHHHHHHHLLL...",
  "HHHHHHHHHHHHHHHHHHHLSS",
  "hHHHHHHHHHHHHHHTHHHHSs",
  "hHHHHHHHHHHHHHTTHHHHSS",
  ".hHHHHHHHHMMMTTMMMMMS.",
  ".hhHHHHPPPPPPTPPPPP...",
  "..hhHHPPPPPPPPPPP.....",
  "...hhhhPPPPP..........",
  "......hhhh............",
];
const swap = (rows, map) => rows.map((r, i) => map[i] ?? r);
// the squeal: the jaw dropped, the mouth a dark wedge behind the tusk
const BSQUEAL = swap(BHEAD, { 10: ".hhHHHHHMMMMMTMMMMM...", 11: "..hhHHPPPMMMMMMMPPP...", 12: "...hhhhPPPPPPPPPPP....", 13: "......hhhhhpppp......." });
const BBLINK = swap(BHEAD, { 4: "HHHHHHHBBHHHHLLL......", 5: "HHHHHHHHHHHHHHHHLLL..." });
const BLEG = {
  H: { m: HIDE }, h: { m: HIDE, bias: -1 }, L: { m: HIDE, fix: 3 }, B: { m: CREST, fix: 1 }, E: { m: BEYE }, e: { m: BGLINT }, S: { m: SNOUT }, s: { m: NOSTRIL },
  T: { m: TUSK, fix: 4 }, M: { m: BMOUTH }, P: { m: BELLY }, p: { m: BELLY, bias: -1 },
};
// an ear up, and streaming back in the charge (R hide, d the dark inside)
const BEAR_UP = ["..R...", ".RR...", ".RdR..", ".RddR.", ".RRdR.", "..RRRR"];
const BEAR_BACK = ["RRR....", "RRddRR.", ".RRRdRR", "....RRR"];
const BEARLEG = { R: { m: HIDE, bias: 1 }, d: { m: CREST, fix: 1 } }, BEARLEG_F = { R: { m: HIDE }, d: { m: CREST, fix: 1 } };

// The rider's head: the goblin's (fig-goblin.js), a leather cap for the hood.
const GHEAD = [
  "....KKKKKK.......",
  "..KKKKKKKKKK.....",
  ".KKKKKKKKKKKK....",
  ".KKKKkkkkkkkk....",
  ".KKKkBBBBGGBBBB..",
  ".KKkGbEeGGbEeG...",
  ".KKGGbEEGGbEEHH..",
  ".KKGGGGGGGGgLHHHL",
  ".KkGGGGGGGGgnLLNN",
  "..KgMTMTMMTMg.nn.",
  "..kGgMMMMMMg.....",
  "...gGGGGGGg......",
  ".....gggg........",
];
const GSNARL = swap(GHEAD, { 9: "..KgMTMTMTMTg.nn.", 10: "..kGMMMMMMMMg....", 11: "...gGTMTMTGg.....", 12: "....gGGGGg......." });
const GBLINK = swap(GHEAD, { 5: ".KKkGGGGGGGGGG...", 6: ".KKGGBBBGGBBBHH.." });
const GLEG = {
  K: { m: CAP }, k: { m: CAP, bias: -1 }, G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, H: { m: SKIN, fix: 4 },
  B: { m: SKIN, fix: 0 }, b: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: TUSK, fix: 3 }, M: { m: MOUTH },
};

export const BOX = { w: 104, h: 70, ox: 44, oy: 62 };
export const BONES = HUMAN;               // unused: the boar stands on beast.js's bones
const Q = { ...QUAD, spine: 24, height: 29, sh: [-2, 13], hip: [2, 12.5], foreU: 8, foreL: 7.5, hindU: 7.5, hindL: 7, paw: 2,
  neckAt: [3, 8], neck: 8, tailAt: [-6, 5], tail: [3, 3, 2.5], far: [2.2, -1], foreX: 0.5, hindX: -1.5 };
// the rider's bones (the goblin's)
const R = { thigh: 6, shin: 5.5, spine: 7.5, upper: 5.2, fore: 5.2 };

const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const leg = (px, l, z, bias) => {
  const { j, k, a } = l, o = { bias, cast: 1 };
  px.part();
  if (l.fore) {
    if (!l.far) px.ellipse(j[0] - 0.5, j[1] - 2, 4.6, 5.4, HIDE, z, { ...o, rot: 0.2 });
    px.capsule(j[0], j[1], 3.3, k[0], k[1], 2.2, HIDE, z, o);
  } else {
    // the ham
    if (!l.far) px.ellipse(j[0] + 0.6, j[1] - 1.6, 5, 5.6, HIDE, z, { ...o, rot: -0.25 });
    px.capsule(j[0], j[1], 3.5, k[0], k[1], 2.1, HIDE, z, o);
  }
  px.capsule(k[0], k[1], 2, a[0], a[1], 1.5, HIDE, z, o);
  // the cloven hoof: square on the ground, pointed down the leg's own line in the air
  const up = cl(l.lift / 2.5, 0, 1), pa = 0.5 + up * (Math.atan2(a[1] - k[1], a[0] - k[0]) - 0.3 - 0.5);
  px.part();
  px.capsule(a[0], a[1] + 0.5, 1.6, a[0] + Math.cos(pa) * 1.5, a[1] + 0.5 + Math.sin(pa) * 1.3, 1.3, HOOF, z + 0.02, { bias, floor: 1 });
};

// the crest's bristles, brow to rump: [where on the spine, height, lean back]; uneven on purpose
const BRISTLES = [[0.56, 3, 0.8], [0.45, 4.6, 1.2], [0.34, 3.6, 1], [0.23, 4.8, 1.4], [0.11, 3.4, 1], [-0.01, 4, 1.3], [-0.13, 2.8, 1], [-0.25, 3.2, 1.2], [-0.37, 2.2, 1]];
// short dark strokes on the flank: [where on the spine, how far down it]
const FLANK = [[0.3, 6], [0.16, 9.5], [0.04, 5.5], [-0.1, 10], [-0.2, 6.5], [-0.34, 9], [-0.44, 5.5], [0.36, 11]];

const boar = (px, b, b1, b2) => {
  const p = b.p;
  const hx = Math.round(b.K[0]), hy = Math.round(b.K[1]);
  const vx = cl(b.K[0] - b1.K[0], -3, 3), wx = cl(b.W[0] - b1.W[0], -3, 3), wy = cl(b.W[1] - b1.W[1], -2, 2);

  leg(px, b.FH, 1, -1);
  leg(px, b.FF, 1.2, -1);

  // the little tail and its tuft
  const t = tailPts(b, b1, b2);
  px.part();
  px.capsule(t[0][0], t[0][1], 1.3, t[1][0], t[1][1], 0.9, HIDE, 2.5);
  px.capsule(t[1][0], t[1][1], 0.9, t[2][0], t[2][1], 0.8, HIDE, 2.5);
  px.part();
  px.capsule(t[2][0], t[2][1], 1, t[3][0], t[3][1], 1.4, CREST, 2.52, { floor: 1 });

  // the body: the hump of the shoulders, the barrel, the rump; a paler belly
  const hu = b.at(0.2, 0, 6.6), ru = b.at(-0.42, 0, 8.8), ba = b.at(-0.1, 0, 8.4);
  px.part();
  px.ellipse(ru[0], ru[1], 9, 8, HIDE, 4);
  const bodyId = px._pid;
  px.capsule(hu[0], hu[1] + 0.6, 9.6, ba[0], ba[1], 8.4, HIDE, 4);
  px.ellipse(hu[0], hu[1], 11.4, 10.4, HIDE, 4, { rot: b.ang(0.2) - 0.12 });
  const be0 = b.at(0.2, 0, 15.6), be1 = b.at(-0.3, 0, 15.4);
  px.capsule(be0[0], be0[1], 2.6, be1[0], be1[1], 2.2, BELLY, 4.02);
  // the neck there is none of: the jowl runs from the hump straight into the head
  const j0 = b.at(0.44, 0, 8.6), j1 = [b.K[0] + 1, b.K[1] + 2.4];
  px.capsule(j0[0], j0[1], 8.6, j1[0], j1[1], 6.4, HIDE, 4.2);

  // bristly: short dark strokes down the flank
  for (const [fs, fd] of FLANK) { const q0 = b.at(fs, 0, fd), q1 = b.at(fs - 0.06, 0, fd + 2.4); px.toneLine(q0[0], q0[1], q1[0], q1[1], -1, bodyId); }

  // the crest: a dark ridge and its bristles, laid back in the charge
  const br = p.bristle ?? 0.6;
  px.part();
  const c0 = [b.K[0] - 1, b.K[1] - 4.6], c1 = b.at(0.42, 0, -1.6), c2 = b.at(0.1, 0, -2.2), c3 = b.at(-0.4, 0, 0.4);
  px.capsule(c0[0], c0[1], 1.6, c1[0], c1[1], 2.2, CREST, 4.6, { cast: 0, floor: 1 });
  px.capsule(c1[0], c1[1], 2.2, c2[0], c2[1], 2.2, CREST, 4.6, { cast: 0, floor: 1 });
  px.capsule(c2[0], c2[1], 2.2, c3[0], c3[1], 1.2, CREST, 4.6, { cast: 0, floor: 1 });
  BRISTLES.forEach(([s, h, ln], i) => {
    const q = s > 0.5 ? mix(c0, c1, 0.5) : b.at(s, 0, s > 0.05 ? -2.6 : -2.2 + (0.05 - s) * 5), x = Math.round(q[0]), y = Math.round(q[1]);
    const up = 0.8 + h * (0.4 + br * 0.6), bk = Math.min(3.4, ln * (1 + (1 - br) * 2) + wx * 0.5);
    px.poly([[x - 1.8, y + 1.2], [x + 1.8, y + 1.2], [x - bk, y - up + wy * (i % 2 ? 0.8 : 0.4)]], CREST, 4.6, { n: [-0.3, -0.5, 0.8], cast: 0, floor: 1 });
  });

  // the head and its ears
  const back = (p.ear ?? 0) > 0.5, ev = Math.round(vx * 0.4);
  px.part();
  if (back) px.stamp(BEAR_BACK, hx + 3 - ev, hy - 4, BEARLEG_F, 5.5, { ax: 6, ay: 3 });
  else px.stamp(BEAR_UP, hx + 5, hy - 5, BEARLEG_F, 5.5, { ax: 3, ay: 5 });
  px.part();
  px.stamp(p.bblink ? BBLINK : p.jaw > 0.5 ? BSQUEAL : BHEAD, hx, hy, BLEG, 6, { ax: 3, ay: 5, ball: [10, 6, 13, 8.5], cast: 1 });
  px.part();
  if (back) px.stamp(BEAR_BACK, hx - 1 - ev, hy - 3, BEARLEG, 6.5, { ax: 6, ay: 3 });
  else px.stamp(BEAR_UP, hx + 1, hy - 4 + (p.twitch ? 1 : 0), BEARLEG, 6.5, { ax: 3, ay: 5 });

  leg(px, b.NH, 7, 0);
  leg(px, b.NF, 7.2, 0);
};

const rider = (px, b, b1, b2) => {
  const p = b.p;
  // the seat: on the hump, a beat behind it. When the back drops away he hangs in the air; when it comes up under him he is pressed down into it.
  const s0 = b.at(0.14, 0, -3.6), s1 = b1.at(0.14, 0, -3.6), s2 = b2.at(0.14, 0, -3.6);
  const late = s1[1] * 0.65 + s2[1] * 0.35, air = cl(s0[1] - late, 0, 2.5), press = cl(late - s0[1], 0, 2);
  const H = [s0[0], s0[1] - air];
  const lean = (p.rLean ?? 0.3) + press * 0.05 - air * 0.04, sp = R.spine - press * 0.6;
  const C = [H[0] + Math.sin(lean) * sp, H[1] - Math.cos(lean) * sp];
  const N = [C[0] + Math.sin(lean) * 1.5 + 1.4 + (p.rHx ?? 0), C[1] - 1 + (p.rHy ?? 0)];
  const tw = p.rTwist ?? 0, sN = [C[0] - 2.8 + tw * 1.6, C[1] + 0.9], sF = [C[0] + 2.6 - tw * 1.6, C[1] - 0.1];
  const hx = Math.round(N[0]), hy = Math.round(N[1]);
  const vx = cl((s0[0] - s1[0]) * 1.6, -2, 2), vy = cl(s0[1] - s1[1], -2, 2);

  // the far arm: its hand in the bristles before him
  const grip = b.at(0.46, 0, -3);
  const fa = ik(sF[0], sF[1], grip[0], grip[1], R.upper, R.fore, 1);
  px.part();
  px.capsule(sF[0], sF[1], 1.6, fa.mid[0], fa.mid[1], 1.5, SKIN, 7.6, { bias: -1 });
  px.capsule(fa.mid[0], fa.mid[1], 1.5, fa.end[0], fa.end[1], 1.4, SKIN, 7.6, { bias: -1 });

  // the near leg: the knee forward and gripping, the shin back down the flank
  const hp = [H[0] - 0.6, H[1] + 0.4], ft = [H[0] + 3.6 + (p.rKnee ?? 0), H[1] + 9.6];
  const lg = ik(hp[0], hp[1], ft[0], ft[1], R.thigh, R.shin, -1);
  px.part();
  px.capsule(hp[0], hp[1], 2.1, lg.mid[0], lg.mid[1], 1.8, SKIN, 8, { cast: 1 });
  px.capsule(lg.mid[0], lg.mid[1], 1.7, lg.end[0], lg.end[1], 1.3, SKIN, 8, { cast: 1 });
  px.capsule(lg.end[0] - 0.4, lg.end[1] + 0.6, 1.2, lg.end[0] + 3, lg.end[1] + 1.5, 1, SKIN, 8, { cast: 1 });

  // the jerkin and its belt
  px.part();
  px.poly([[C[0] - 4, C[1] - 1.6], [C[0] + 3.2, C[1] - 1.2], [C[0] + 4.2, C[1] + 2.6], [H[0] + 4, H[1] - 1], [H[0] + 4.2, H[1] + 1.8],
    [H[0] - 4.2, H[1] + 1.8], [H[0] - 4.6, H[1] - 2], [C[0] - 5.4, C[1] + 2.4]], JERK, 8.5, { round: 0.92, cast: 1 });
  px.poly([[H[0] - 4.7, H[1] - 2.4], [H[0] + 4.1, H[1] - 2.4], [H[0] + 4.2, H[1] - 0.8], [H[0] - 4.5, H[1] - 0.8]], DARK, 8.55, { round: 0.92, floor: 1 });

  // the far ear, the head, the cap's peak, the near ear: ear and peak trail the head
  const ex = -vx * 1.4, ey = vy * 1.4;
  px.part();
  px.poly([[hx - 3, hy - 6.4], [hx - 2.4, hy - 2.6], [hx - 6 + ex * 0.5, hy - 5 + ey * 0.5], [hx - 9.4 + ex, hy - 8.6 + ey], [hx - 5.6 + ex * 0.5, hy - 7.6 + ey * 0.5]], SKIN, 9, { bias: -1, n: [-0.2, -0.2, 0.9] });
  px.part();
  px.stamp(p.rBlink ? GBLINK : (p.rSnarl ?? 0) > 0.5 ? GSNARL : GHEAD, hx, hy, GLEG, 9.5, { ax: 6, ay: 10, ball: [7, 6.5, 8, 7.5], cast: 1 });
  px.part();
  px.poly([[hx - 4.4, hy - 9], [hx + 1.6, hy - 9.4], [hx - 1.6 + ex * 0.4, hy - 11.6 + ey * 0.4], [hx - 5.6 + ex, hy - 11 + ey * 0.8]], CAP, 9.6, { round: 0.8, ny: -0.2 });
  const eb = [hx - 2.6, hy - 3.4];
  px.part(); const earId = px._pid;
  px.poly([[eb[0], eb[1] - 2.2], [eb[0] + 1, eb[1] + 1.8], [eb[0] - 3.6 + ex * 0.4, eb[1] + 0.2 + ey * 0.4], [eb[0] - 8.8 + ex, eb[1] - 3.6 + ey], [eb[0] - 4 + ex * 0.4, eb[1] - 3.6 + ey * 0.4]], SKIN, 9.8, { n: [-0.25, -0.35, 0.9], cast: 1 });
  px.toneLine(eb[0] - 0.4, eb[1] - 0.2, eb[0] - 5 + ex * 0.5, eb[1] - 1.8 + ey * 0.5, -1, earId);

  // the near arm and the lance under it: a long ash shaft, a steel head
  const [ang, reach] = p.rArm ?? [0.9, 0.62], len = R.upper + R.fore;
  const na = ik(sN[0], sN[1], sN[0] + Math.sin(ang) * reach * len, sN[1] + Math.cos(ang) * reach * len, R.upper, R.fore, 1);
  const hd = na.end, la = (p.lance ?? 0) + vy * 0.03, d = [Math.cos(la), Math.sin(la)], nn = [-d[1], d[0]];
  const at = (f, s = 0) => [hd[0] + d[0] * f + nn[0] * s, hd[1] + d[1] * f + nn[1] * s];
  px.part();
  px.capsule(...at(-11), 0.75, ...at(25), 0.75, WOOD, 10, { cast: 1 });
  px.part();
  px.poly([at(24, -1.1), at(26.5, -1.9), at(32.5, 0), at(26.5, 1.9), at(24, 1.1)], STEEL, 10.1, { fix: 3 });
  px.line(...at(25, -1), ...at(31.5, -0.2), STEEL, 10.12, { fix: 4 });
  px.line(...at(25, 1.2), ...at(30, 0.8), STEEL, 10.12, { fix: 1 });
  px.capsule(...at(22.6), 1.1, ...at(24), 1.1, DARK, 10.1, { floor: 1 });
  px.part();
  px.ellipse(sN[0] - 0.2, sN[1] + 0.2, 2.5, 2.3, JERK, 10.4, { cast: 0, bias: 1 });
  px.part();
  px.capsule(sN[0], sN[1] + 0.6, 1.7, na.mid[0], na.mid[1], 1.6, SKIN, 10.5, { cast: 1 });
  px.capsule(na.mid[0], na.mid[1], 1.6, hd[0], hd[1], 1.5, SKIN, 10.5, { cast: 1 });
  const w0 = mix(na.mid, hd, 0.6), w1 = mix(na.mid, hd, 0.74);
  px.capsule(w0[0], w0[1], 1.65, w1[0], w1[1], 1.65, DARK, 10.55, { cast: 1, floor: 1 });
  px.part();
  px.ellipse(hd[0], hd[1], 1.7, 1.7, SKIN, 10.7);
};

export const draw = (px, F, o = {}) => {
  const { b, b1, b2 } = beastFrames(F, Q);
  boar(px, b, b1, b2);
  if (o.variant !== "loose") rider(px, b, b1, b2);
  return {};
};

// the snort's breath (idle) and the tusks' smear (attack)
export const fx = (px, F, info, clip) => {
  const { b, b1 } = beastFrames(F, Q), p = b.p;
  if (clip === "idle" && (p.snort ?? 0) > 0.05) {
    const u = p.snort, x = b.K[0] + 20 + u * 5, y = b.K[1] + 3 + u * 1.5;
    px.part();
    px.ellipse(x, y, 1.4 + u * 1.6, 1 + u * 1.2, u > 0.6 ? BREATH2 : BREATH, 20, { noLine: true });
    if (u > 0.3) px.ellipse(x + 3 + u * 2, y - 1.5 - u, 1 + u, 0.8 + u * 0.6, BREATH2, 20, { noLine: true });
  }
  if (clip === "attack") {
    const dy = b.K[1] - b1.K[1], dx = b.K[0] - b1.K[0];
    if (dy > -2 || dx < 1) return;
    // one crescent ahead of the snout, from where the tusk was to where it is: thin at the tail, full at the tusk
    const a0 = [b1.K[0] + 15, b1.K[1] + 4], a1 = [b.K[0] + 16.5, b.K[1] + 1.5], n = 8;
    const at = (t, r) => { const m = mix(a0, a1, t), bow = Math.sin(Math.PI * t) * 4.5; return [m[0] + bow + r, m[1]]; };
    const arc = (t0, wd, m, z) => { const out = [], inn = []; for (let i = 0; i <= n; i++) { const t = t0 + (1 - t0) * (i / n); out.push(at(t, 3.4)); inn.unshift(at(t, 3.4 - wd * ((t - t0) / (1 - t0)) ** 1.2)); } px.poly([...out, ...inn], m, z, { noLine: true }); };
    arc(0.3, 5, SMEAR2, 20); arc(0.6, 3.4, SMEAR, 20.1);
  }
};

const STAND = { drop: 0.8, pitch: -0.19, arch: 0.04, neck: -0.32, hx: 0, hy: 0, jaw: 0, tail: -0.9, curl: -0.5, bristle: 0.7, ear: 0,
  fNF: [-0.5, 0], fFF: [2.5, 0], fNH: [-1.5, 0], fFH: [2.5, 0],
  rLean: 0.26, rArm: [1.2, 0.78], lance: -0.34, rTwist: 0, rHx: 0, rHy: 0, rSnarl: 0, rKnee: 0 };
const COUCH = { rLean: 0.5, rArm: [1.0, 0.6], lance: 0.03, rTwist: 0.3, rHx: 0.6, rHy: 0.4 };
export const CLIPS = {
  idle: {
    n: 8, ms: 1600, loop: true, lag: 0.1,
    pose: (ph) => {
      const s = Math.sin(ph * Math.PI * 2), s2 = Math.sin(ph * Math.PI * 2 - 1);
      // one forefoot paws the ground: up, forward, and scraped back
      const u = cl((ph - 0.08) / 0.42, 0, 1), paw = u > 0 && u < 1 ? [6 - 10 * u * u, Math.sin(Math.PI * Math.sqrt(u)) * 5.5] : [-0.5, 0];
      const sn = cl((ph - 0.6) / 0.3, 0, 1);
      return { ...STAND, drop: 0.8 + 0.5 * (0.5 + 0.5 * s), neck: -0.32 - 0.1 * (u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0) + (sn > 0 && sn < 0.5 ? 0.12 : 0), fNF: paw,
        tail: -0.9 + 0.5 * s2, curl: -0.5 + 0.3 * s, bristle: 0.7 + 0.2 * s, snort: sn > 0 && sn < 1 ? sn : 0, jaw: sn > 0 && sn < 0.5 ? 1 : 0,
        bblink: ph >= 0.5 && ph < 0.6 ? 1 : 0, twitch: ph >= 0.25 && ph < 0.4 ? 1 : 0,
        rLean: 0.26 + 0.04 * s2, rArm: [1.2 + 0.04 * s, 0.78], lance: -0.34 + 0.05 * s2, rBlink: ph >= 0.86 && ph < 0.98 ? 1 : 0 };
    },
  },
  walk: {
    n: 8, ms: 380, loop: true, lag: 0.1,
    pose: (ph) => {
      const g = gallop(ph, { travel: 40, duty: 0.3, lift: 4, double: false, beats: { hF: 0.04, hN: 0.14, fF: 0.34, fN: 0.46 }, flex: 0.28, flexBias: 0.06, rock: 0.13, bob: 2.4, kick: [8, 4], reach: [7, 3], foreX: 1.5, hindX: 2 });
      return { ...STAND, ...COUCH, ...g, pitch: g.pitch - 0.12, neck: -0.36 + g.nod * 0.7, hx: 0.5, jaw: 0, bristle: 0.25, ear: 1, tail: 0.5 - g.g * 0.3, curl: 0.3,
        rLean: 0.5 + g.g * 0.06, lance: 0.03 - g.pitch * 0.3, rSnarl: 1 };
    },
  },
  attack: {
    n: 11, ms: 740, loop: false, lag: 0.08,
    pose: (ph) => sampleKeys([
      { t: 0, p: STAND },
      // the head down and back, the rider hauling the lance back with it
      { t: 0.22, e: "out", p: { ...STAND, rx: -2.6, drop: 1.6, pitch: 0.1, arch: 0.14, neck: -0.62, hy: 2, bristle: 1, ear: 1, tail: 0.2, curl: 0.2,
        rLean: 0.12, rArm: [0.35, 0.72], lance: -0.06, rTwist: -0.5 } },
      { t: 0.34, e: "io", p: { ...STAND, rx: -3.2, drop: 2, pitch: 0.12, arch: 0.16, neck: -0.66, hy: 2.4, bristle: 1, ear: 1, tail: 0.3, curl: 0.2,
        rLean: 0.08, rArm: [0.25, 0.74], lance: -0.04, rTwist: -0.6 } },
      // the hook: the tusks ripped up and forward off the forelegs; the lance thrown out to the arm's length
      { t: 0.47, e: "in3", p: { ...STAND, rx: 4.6, drop: -0.4, pitch: -0.25, arch: -0.08, neck: -0.08, hx: 2.6, hy: 0, jaw: 1, bristle: 0.5, ear: 1, tail: 0.7, curl: 0.3,
        fNF: [3.5, 2.6], fFF: [5, 1.2], rLean: 0.62, rArm: [1.5, 1], lance: -0.04, rTwist: 0.6, rHx: 1, rSnarl: 1 } },
      { t: 0.58, e: "out", p: { ...STAND, rx: 5.2, drop: 1, pitch: -0.2, arch: -0.06, neck: 0.04, hx: 3, hy: -1, jaw: 1, bristle: 0.5, ear: 1, tail: 0.6, curl: 0.3,
        fNF: [4.5, 0], fFF: [5.5, 0], rLean: 0.66, rArm: [1.44, 1], lance: -0.02, rTwist: 0.7, rHx: 1.2, rSnarl: 1 } },
      // both come back
      { t: 0.8, e: "io", p: { ...STAND, rx: 1.4, drop: 1.2, pitch: -0.1, neck: -0.2, bristle: 0.8, fNF: [2, 1.6], fFF: [3.5, 0], rLean: 0.34, rArm: [1.05, 0.7], lance: -0.2, rTwist: 0.2 } },
      { t: 1, e: "out", p: STAND },
    ], ph),
  },
};
