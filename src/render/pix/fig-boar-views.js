// ============ CONCEPT FIGURES: the Boar Rider (and the loose boar) from the FRONT and from BEHIND ============
// The boar of fig-boar.js (heavy wedge, all shoulder: brown hide, paler belly, black-brown bristle crest,
// small red eyes, yellowed tusks, cloven hooves, tufted tail) with the goblin lancer astride the hump
// (leather cap, jerkin, a lance under the near arm), drawn charging toward the camera (FRONT) and away
// (BACK), unflipped, one sun upper left. Feet and strides are read off the side charge's own solved
// gait (`solveBeast(F.sk.p)`), so the views switch mid-stride in step. Forward is DOWN the screen in FRONT.
// His right (the lance arm, the beast's near side) is screen LEFT in FRONT, screen RIGHT from BEHIND.
// FRONT: the huge low head: brow, red eyes, the flat pink snout disc and both tusks curving up, ears
// laid back; the hump and the bristle crest rising over it; the lance comes AT us under his right arm
// (its steel head big and low, the shaft foreshortened). BACK: the rump, the little tufted tail, the
// crest down the spine, the hams and hooves; the lance goes away from us, so only its butt shows by
// his right hip. variant "loose": the boar alone.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-boar.js";
import { QUAD, solveBeast } from "./beast.js";

const HIDE = mat("#6e4a38"), BELLY = mat("#96725c"), CREST = mat("#3a2620"), TUSK = mat("#ece0c4"), HOOF = mat("#2e2422");
const SNOUT = mat("#b98e78"), BEYE = flat("#e05248"), BGLINT = flat("#ffb0a0"), NOSTRIL = flat("#2c1a22"), BMOUTH = flat("#2c1a22");
const SKIN = mat("#6aa04f"), CAP = mat("#5a4630"), JERK = mat("#5f4326"), DARK = mat("#3c2a18"), WOOD = mat("#8a6238"), STEEL = mat("#c4c8d0", { contrast: 1.2 });
const EYE = flat("#d8402e"), GLINT = flat("#ffb070"), MOUTH = flat("#2c1a22");
const Q = { ...QUAD, spine: 24, height: 29, sh: [-2, 13], hip: [2, 12.5], foreU: 8, foreL: 7.5, hindU: 7.5, hindL: 7, paw: 2,
  neckAt: [3, 8], neck: 8, tailAt: [-6, 5], tail: [3, 3, 2.5], far: [2.2, -1], foreX: 0.5, hindX: -1.5 };
const FWD = 0.3, TAU = Math.PI * 2;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const BHEAD = [
  "...HHHHHHHHH...",
  ".HHHHHHHHHHHHH.",
  ".HHHBBBHBBBHHH.",
  ".HHHeEHHHEeHHH.",
  "hHHHHHHLLLHHHHh",
  ".hHHSSSSSSSHHh.",
  ".hHHSsSSSsSHHh.",
  ".hHTHSSSSSHTHh.",
  "..hTHMMMMMHTh..",
  "...hhPPPPPhh...",
  "....hhhhhhh....",
];
const BLEG = { H: { m: HIDE }, h: { m: HIDE, bias: -1 }, L: { m: HIDE, fix: 3 }, B: { m: CREST, fix: 1 }, E: { m: BEYE }, e: { m: BGLINT }, S: { m: SNOUT }, s: { m: NOSTRIL }, T: { m: TUSK, fix: 4 }, M: { m: BMOUTH }, P: { m: BELLY } };
// the goblin's face under the cap (13 wide)
const GF = [
  "...KKKKKKK...",
  "..KKKKKKKKK..",
  ".KKKKKKKKKKK.",
  ".KKkkkkkkkkK.",
  ".KkBBGGGBBkK.",
  ".KGeEBGBeEGK.",
  ".KGEEGGGEEGK.",
  ".KGGGLNLGGGK.",
  ".KGGgnNngGGK.",
  ".KGMTMNMTMMGK",
  "..kGMMTMMMMGk",
  "...gGGGGGGg..",
  ".....ggggg...",
];
const GB = [
  "...KKKKKKK...",
  "..KKKKKKKKK..",
  ".KKKKKKKKKKK.",
  ".KKKKKsKKKKK.",
  ".KKKKKsKKKkK.",
  "KKKKKKsKKKKkK",
  "KKKKKKsKKKKKK",
  ".KKKKKsKKKKK.",
  ".kkKKKsKKKkk.",
  "..kkkKKKkkk..",
  "...kkKkkKkk..",
  ".....kkk.....",
];
const GLEG = { K: { m: CAP }, k: { m: CAP, bias: -1 }, G: { m: SKIN }, g: { m: SKIN, bias: -1 }, N: { m: SKIN, fix: 2 }, n: { m: SKIN, fix: 1 }, L: { m: SKIN, fix: 3 }, B: { m: SKIN, fix: 0 }, E: { m: EYE }, e: { m: GLINT }, T: { m: TUSK, fix: 3 }, M: { m: MOUTH }, s: { m: CAP, bias: -2 } };

const hoof = (px, x, y, s, z, bias) => { px.ellipse(x, y + 0.3, s > 0 ? 2.1 : 1.8, 1.3, HOOF, z, { bias, floor: 1 }); };

const legV = (px, l, s, side, sx, z) => {
  const fore = l.fore, far = fore ? s < 0 : s > 0, dyD = far ? -2.4 : 0, bias = far ? -1 : 0;
  const hx = side * (fore ? 6 : 7) + sx, hy = l.j[1] + 1 + dyD;
  const fx = side * (fore ? 6.2 : 6.6) + sx, fy = l.a[1] + Q.paw - 0.8 + dyD + s * (l.a[0] - l.j[0]) * FWD;
  const kx = side * (fore ? 6.8 : 8.6) + sx, ky = (hy + fy) / 2;
  px.part();
  px.limb([[hx, hy], [kx, ky], [fx, fy]], fore ? [3.6, 2.3, 1.7] : [4.4, 2.4, 1.7], HIDE, z, { cast: 1, bias, weld: far ? 0 : 3, weldRoot: far ? 0 : 6 });
  hoof(px, fx, fy + 0.6, s, z + 0.02, bias);
};

const boarView = (px, F, s) => {
  const b = solveBeast(F.sk.p, Q), ph = F.ph, p = b.p, rs = -s, ls = s;
  const sx = rs * 0.6 * Math.sin(ph * TAU);
  const legs = [[b.FH, ls], [b.NH, rs], [b.FF, ls], [b.NF, rs]];
  px.body(1);
  for (const [l, side] of legs) if (l.fore !== (s > 0)) legV(px, l, s, side, sx * 0.6, 1);
  const hump = b.W[1] + 3.8, rump = b.C[1] + 3;
  if (s > 0) {
    px.part();
    px.ellipse(sx * 0.3, rump - 2, 9, 8.5, HIDE, 3);
    px.ellipse(sx, hump + 3, 11.2, 10.4, HIDE, 4);
    px.ellipse(sx, hump + 9, 7.4, 6, BELLY, 4.02);
    for (const [l, side] of legs) if (l.fore) legV(px, l, s, side, sx, 7);
    // the crest over the hump: a dark ridge and its bristles rising behind the head
    px.part();
    px.capsule(sx, hump - 6.4, 1.8, sx, hump + 1.6, 2.6, CREST, 4.6, { cast: 0, floor: 1 });
    [[-3.2, 1], [-1.4, 1.8], [1.2, 1.4], [3, 0.8], [0, 2.4]].forEach(([x, up], i) => px.poly([[sx + x - 1.6, hump - 5 + (i % 2)], [sx + x + 1.6, hump - 5 + (i % 2)], [sx + x * 1.2, hump - 8.4 - up]], CREST, 4.62, { cast: 0, floor: 1 }));
    // the head, low and wide in front of the hump, its ears laid back each side
    const hx = Math.round(sx * 0.7), hy = Math.round(b.K[1] + 3.5 + (p.drop ?? 0) * 0);
    px.body(0);
    for (const side of [-1, 1]) { px.part(); px.poly([[hx + side * 5, hy - 4], [hx + side * 8.6, hy - 5], [hx + side * 10.4, hy - 8.4], [hx + side * 6.6, hy - 8.6], [hx + side * 4.4, hy - 6.6]], HIDE, 8.8, { n: [side * 0.3, -0.3, 0.9], cast: 1 }); px.dot(hx + side * 7.8, hy - 6.4, CREST, 8.85, { fix: 1 }); }
    px.part();
    px.stamp(BHEAD, hx, hy, BLEG, 9, { ax: 7, ay: 5, ball: [7.5, 5.5, 8, 6.5], cast: 1 });
    return { b, sx, hump, S: 1 };
  }
  // BACK: head's top and ears over the hump, the hump, the rump and ham, the tail
  px.body(0);
  const hy = Math.round(b.K[1] - 1);
  for (const side of [-1, 1]) { px.part(); px.poly([[sx + side * 4, hy - 3], [sx + side * 8, hy - 3.6], [sx + side * 9.4, hy - 7.6], [sx + side * 5.6, hy - 7]], HIDE, 2.9, { n: [side * 0.3, -0.3, 0.9], cast: 1 }); }
  px.part(); px.ellipse(sx, hy, 7.6, 5.4, HIDE, 3, { cast: 1 });
  px.body(1);
  for (const [l, side] of legs) if (l.fore) { /* far end, drawn above */ }
  px.part(); const bid = px._pid;
  px.ellipse(sx, hump + 3, 11.4, 10, HIDE, 3.8);
  px.ellipse(sx * 0.4, rump - 1, 10.2, 9.4, HIDE, 4);
  // the crest down the spine, bristles to either side of it
  px.capsule(sx, hump - 5.4, 1.8, sx * 0.5, rump - 7, 2, CREST, 4.6, { cast: 0, floor: 1 });
  for (let i = 0; i < 6; i++) { const y = hump - 4.6 + i * 2.6, x = sx * (1 - i / 8) + (i % 2 ? 1.4 : -1.4); px.poly([[x - 1.4, y + 1.4], [x + 1.4, y + 1.4], [x + (i % 2 ? 2.2 : -2.2), y - 1.6]], CREST, 4.62, { cast: 0, floor: 1 }); }
  for (const [x, y, dy] of [[-6, 4, 5], [5.4, 7, 6], [-4, 14, 4], [7, 14, 5]]) px.toneLine(sx * 0.4 + x, rump - 12 + y, sx * 0.4 + x - 0.5, rump - 12 + y + dy, -1, bid);
  for (const [l, side] of legs) if (!l.fore) legV(px, l, s, side, sx * 0.4, 7);
  // the little tail and its tuft, a beat behind
  const wag = 1.4 * Math.sin(ph * TAU + 1), t0 = [sx * 0.4, rump - 6];
  px.part();
  px.capsule(t0[0], t0[1], 1.3, t0[0] + wag * 0.5, t0[1] + 4.6, 0.9, HIDE, 6.5);
  px.capsule(t0[0] + wag * 0.5, t0[1] + 4.6, 1, t0[0] + wag, t0[1] + 8.2, 1.5, CREST, 6.55, { floor: 1 });
  return { b, sx, hump, S: -1 };
};

const rider = (px, F, s, b, sx, hump) => {
  const rs = -s, ls = s, ph = F.ph;
  const seat = b.at(0.14, 0, -3.6);
  const H = [sx * 0.6, seat[1] + 1], C = [H[0], H[1] - 7.5 * 0.9];
  const hx = Math.round(C[0]), hy = Math.round(C[1] - 4.8), sw = 0.5 * Math.sin(ph * TAU * 2);
  for (const side of [ls, rs]) {
    px.part();
    const k = [side * 8, H[1] + 2.2], f = [side * 8.8, H[1] + 8.4];
    px.capsule(side * 2.4, H[1] + 0.2, 2.2, k[0], k[1], 1.9, SKIN, 8, { cast: 1 });
    px.capsule(k[0], k[1], 1.8, f[0], f[1] - 0.6, 1.4, SKIN, 8, { cast: 1 });
    px.ellipse(f[0] + side * 0.4, f[1] + 0.6, 1.9, 1.2, SKIN, 8.02, { cast: 1 });
  }
  px.part();
  px.poly([[C[0] - 4.2, C[1] - 1.6], [C[0] + 4.2, C[1] - 1.6], [C[0] + 4.4, C[1] + 2.6], [H[0] + 4.2, H[1] - 1], [H[0] + 4.4, H[1] + 1.8], [H[0] - 4.4, H[1] + 1.8], [H[0] - 4.2, H[1] - 1], [C[0] - 4.4, C[1] + 2.6]], JERK, 8.5, { round: 0.92, cast: 1 });
  px.poly([[H[0] - 4.6, H[1] - 2.4], [H[0] + 4.6, H[1] - 2.4], [H[0] + 4.6, H[1] - 0.8], [H[0] - 4.6, H[1] - 0.8]], DARK, 8.55, { round: 0.92, floor: 1 });
  px.part();
  if (s > 0) px.dot(H[0], H[1] - 1.6, STEEL, 8.6); else px.toneLine(C[0], C[1], H[0], H[1] - 2.6, -1, px._pid);
  const sN = [C[0] + rs * 4.6, C[1] + 0.8], sF = [C[0] + ls * 4.6, C[1] + 0.8];
  // the far hand (his left): in the bristles before him / down at his side from behind
  px.part();
  const fh = s > 0 ? [ls * 3, C[1] + 6.4] : [ls * 5.6, C[1] + 6.4];
  px.capsule(sF[0], sF[1], 1.6, ls * 6.8, C[1] + 4, 1.5, SKIN, 9, { cast: 1 });
  px.capsule(ls * 6.8, C[1] + 4, 1.5, fh[0], fh[1], 1.4, SKIN, 9, { cast: 1 });
  px.ellipse(fh[0], fh[1], 1.6, 1.6, SKIN, 9.1);
  // the near arm and the lance
  const hd = [rs * 7.4, C[1] + 6.6], el = [rs * 7.8, C[1] + 3.4];
  px.part(); px.tag("weapon");
  if (s > 0) {
    // coming at us: the haft behind the fist running up, the steel head big and low before it
    px.capsule(hd[0] - rs * 0.4, hd[1] - 6, 0.8, hd[0], hd[1] + 3.4, 0.9, WOOD, 9.4, { cast: 1 });
    const tx = hd[0], ty = hd[1] + 6.6;
    px.poly([[tx, ty - 4.2], [tx - 2.4, ty - 0.4], [tx - 1.4, ty + 3.8], [tx, ty + 6], [tx + 1.4, ty + 3.8], [tx + 2.4, ty - 0.4]], STEEL, 9.5, { fix: 3 });
    px.line(tx - 0.8, ty - 2, tx - 0.8, ty + 3.4, STEEL, 9.55, { fix: 4 });
    px.capsule(tx, ty - 4.4, 1.4, tx, ty - 2.8, 1.4, DARK, 9.45, { floor: 1 });
  } else px.capsule(hd[0], hd[1] + 0.6, 0.85, hd[0] + rs * 0.3, hd[1] + 4.4, 0.9, WOOD, 9.3, { cast: 1 });
  px.tag(null);
  px.part(); px.tag("nearArm");
  px.capsule(sN[0], sN[1], 1.7, el[0], el[1], 1.6, SKIN, 9.2, { cast: 1 });
  px.capsule(el[0], el[1], 1.6, hd[0], hd[1], 1.5, SKIN, 9.2, { cast: 1 });
  px.capsule(el[0], el[1] + 1.3, 1.65, hd[0], hd[1], 1.6, DARK, 9.25, { cast: 1, floor: 1 });
  px.ellipse(hd[0], hd[1], 1.7, 1.7, SKIN, 9.6);
  px.tag(null);
  // the head: ears out to both sides, the cap's peak
  for (const side of [-1, 1]) {
    px.part();
    const ex = hx + side * 5, ey = hy + 0.4;
    px.poly([[ex - side * 0.4, ey - 2.4], [ex - side * 0.4, ey + 2.4], [ex + side * 4.4, ey + 2.8 + sw * 0.4], [ex + side * 9.4, ey - 3.4 + sw], [ex + side * 5, ey - 4.6]], SKIN, s > 0 ? 9.2 : 9.7, { n: [side * 0.3, -0.35, 0.9], cast: 1, bias: s > 0 ? 0 : -1 });
  }
  px.part();
  px.stamp(s > 0 ? GF : GB, hx, hy, GLEG, 9.6, { ax: 6, ay: 6, ball: [6.5, 5.5, 7, 6.5], cast: 1 });
  void cl; void hump;
};

const make = (s) => (px, F, o = {}) => {
  const r = boarView(px, F, s);
  if (o.variant !== "loose") rider(px, F, s, r.b, r.sx, r.hump);
  return {};
};
export const BOX = { w: 48, h: 76, ox: 24, oy: 62 };
export const FRONT = { NAME: "boar-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk: { ...SIDE.walk } } };
export const BACK = { NAME: "boar-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk: { ...SIDE.walk } } };
