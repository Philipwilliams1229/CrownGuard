// ============ CONCEPT FIGURES: the Wolf Rider seen from the FRONT and from BEHIND ============
// The wolf of fig-wolf-views.js (its head lifted in front of the rider) with the raider of
// fig-wolfrider.js astride his shoulders: swept red mane, red beard, brown-red jerkin belted in dark
// leather with a collar of pale fur, bare forearms in leather bracers, a steel axe in the near (right)
// fist, the far hand in the ruff. His right is screen LEFT in FRONT, screen RIGHT from BEHIND.
// FRONT: face with brows, eyes, nose, beard; the axe up beside him on his right, its head out to the
// side. BACK: the swept mane over the back of the head, the jerkin's back with its belt; the axe is
// carried forward so only its haft end shows by the hip (owner: a held weapon is mostly hidden from behind).
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-wolfrider.js";
import { wolfView, WOLF, cl } from "./fig-wolf-views.js";

const SKIN = mat("#e8b990"), HAIR = mat("#b0503a"), BROWN = mat("#6a3a2a"), BROWN2 = mat("#3a2018"), FUR = mat("#b4aa9a"), LEATHER = mat("#4a382c");
const STEEL = mat("#b8bcc4", { contrast: 1.3 }), IRONK = mat("#585c66"), WOOD = mat("#7a5632"), BRASS = mat("#c8a040");
const EYE = flat("#2a1c2c");
const LEG = { R: { m: HAIR }, r: { m: HAIR, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, b: { m: HAIR, fix: 1 }, E: { m: EYE }, e: { m: SKIN, fix: 0 }, M: { m: BROWN2, fix: 0 } };
const FACE = [
  "...RRRRRRR...",
  "..RRRRRRRRR..",
  ".RRRRRRRRRRR.",
  ".RRSSSSSSSRR.",
  ".RRbbSSSbbRR.",
  ".RRSESSSESRR.",
  ".rRSSSNSSSRr.",
  ".rRsSSNSSsRr.",
  "..rRRRMRRRr..",
  "...rRRRRRr...",
  "....rrRrr....",
];
const HAIRB = [
  "...RRRRRRR...",
  "..RRRRRRRRR..",
  ".RRRRRRRRRRR.",
  ".RRRRrRRRRRR.",
  ".RRRrRRRRRRR.",
  ".RRRRRRrRRRR.",
  ".rRRRrRRRRRr.",
  ".rRRRRRRRrRr.",
  "..rRRRRRRRr..",
  "...rrRRRrr...",
  "....rrrrr....",
];

const rider = (px, F, s, b, sx) => {
  const rs = -s, ls = s, p = b.p, ph = F.ph, TAU = Math.PI * 2;
  const seat = b.at(0.2, 0, -0.4), b1 = null;
  void b1;
  const H = [sx * 0.6, seat[1] + 1.5], sp = 7, C = [H[0], H[1] - sp * 0.9];
  const hx = Math.round(C[0]), hy = Math.round(C[1] - 3.8);
  const sw = 0.5 * Math.sin(ph * TAU * 2);

  // the legs: thighs out round the barrel, knees gripping, the boots down the flanks (toes toward us in front)
  for (const side of [ls, rs]) {
    px.part();
    const k = [side * 7.8, H[1] + 2.4], f = [side * 8.2, H[1] + 9.4 + s * 0.6];
    px.capsule(side * 2.4, H[1] + 0.2, 2.5, k[0], k[1], 2.1, BROWN2, 8, { cast: 1, floor: 1 });
    px.capsule(k[0], k[1], 2, f[0], f[1] - 0.6, 1.6, LEATHER, 8, { cast: 1, floor: 1 });
    px.ellipse(f[0] + side * 0.3, f[1] + 0.7, 1.9, 1.3, LEATHER, 8.02, { cast: 1 });
  }

  // the jerkin: a belted barrel, the hem swinging, a fur collar
  px.part(); const tab = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 4.8, C[1] - 1.6], [C[0] + 4.8, C[1] + 2.8], [H[0] + 4.7, H[1] - 1], [H[0] + 5, H[1] + 3.6 + sw * 0.3], [H[0] + 1.6, H[1] + 4.8], [H[0] - 1, H[1] + 3.4],
    [H[0] - 3, H[1] + 4.8], [H[0] - 5, H[1] + 3.4 - sw * 0.3], [H[0] - 4.8, H[1] - 1], [C[0] - 4.8, C[1] + 2.8]], BROWN, 8.5, { round: 0.92, cast: 1 });
  px.toneLine(H[0] + 1.6 * s, H[1] - 2, H[0] + 1.4 * s, H[1] + 3, -1, tab);
  px.poly([[H[0] - 5, H[1] - 2.2], [H[0] + 5, H[1] - 2.2], [H[0] + 5, H[1] - 0.4], [H[0] - 5, H[1] - 0.4]], BROWN2, 8.55, { round: 0.92, floor: 1 });
  px.part();
  if (s > 0) px.rect(H[0] - 1.2, H[1] - 2.2, 2.4, 1.8, BRASS, 8.57, { fix: 3 });
  px.poly([[C[0] - 5, C[1] - 2], [C[0] + 5, C[1] - 2], [C[0] + 4.8, C[1] + 0.8], [C[0] - 4.8, C[1] + 0.8]], FUR, 8.7, { round: 0.8, cast: 1 });
  for (const x of [-4, -1.6, 1, 3.6]) px.dot(C[0] + x, C[1] + 1.4, FUR, 8.7, { noLine: true });

  const sN = [C[0] + rs * 5.4, C[1] + 0.6], sF = [C[0] + ls * 5.4, C[1] + 0.6];
  if (s > 0) {
    // the far arm (his left, screen right): bracer, the fist in the ruff before him
    const h = [ls * 4.4, C[1] + 6.4];
    px.part();
    px.capsule(sF[0], sF[1], 1.9, ls * 7.2, C[1] + 4.2, 1.7, SKIN, 9, { cast: 1 });
    px.capsule(ls * 7.2, C[1] + 4.2, 1.7, h[0], h[1], 1.6, SKIN, 9, { cast: 1 });
    px.capsule(ls * 6.2, C[1] + 5, 1.8, h[0], h[1], 1.75, LEATHER, 9.05, { cast: 1, floor: 1 });
    px.ellipse(h[0], h[1] + 0.4, 1.8, 1.7, SKIN, 9.1);
    // the near arm (his right, screen left): the axe stood up beside him, its bearded blade turned out
    const hd = [rs * 8.6, C[1] + 5.2], el = [rs * 8.4, C[1] + 2.6];
    px.part(); px.tag("weapon");
    px.capsule(hd[0], hd[1] + 5, 0.85, hd[0] + rs * 0.6, hd[1] - 17, 0.85, WOOD, 9.4, { cast: 1 });
    const ty = hd[1] - 16.6, tx = hd[0] + rs * 0.6;
    px.poly([[tx, ty + 0.6], [tx + rs * 7.4, ty - 1.2], [tx + rs * 7.6, ty + 5.4], [tx + rs * 5, ty + 6.4], [tx, ty + 3.6]], STEEL, 9.5, { fix: 2 });
    px.poly([[tx + rs * 4.4, ty + 5.4], [tx + rs * 7.6, ty + 5.4], [tx + rs * 5, ty + 6.4]], STEEL, 9.55, { fix: 4 });
    px.poly([[tx, ty - 1.6], [tx - rs * 0.4, ty - 1.6], [tx - rs * 1.8, ty + 4.4], [tx, ty + 4.4]], IRONK, 9.45, { fix: 1 });
    px.tag(null);
    px.part(); px.tag("nearArm");
    px.capsule(sN[0], sN[1], 2, el[0], el[1], 1.8, SKIN, 9.2, { cast: 1 });
    px.capsule(el[0], el[1], 1.8, hd[0], hd[1], 1.7, SKIN, 9.2, { cast: 1 });
    px.capsule(el[0] * 0.98, el[1] + 1.2, 1.9, hd[0], hd[1], 1.8, LEATHER, 9.25, { cast: 1, floor: 1 });
    px.ellipse(hd[0], hd[1], 1.8, 1.8, SKIN, 9.6);
    px.tag(null);
  } else {
    // from behind both arms are down the sides, the near one (screen right) carrying the axe forward: only its butt shows past the hip
    px.part();
    px.capsule(sF[0], sF[1], 1.9, ls * 6.4, C[1] + 4.6, 1.7, SKIN, 9, { cast: 1 });
    px.capsule(ls * 6.4, C[1] + 4.6, 1.7, ls * 5.4, C[1] + 7.2, 1.6, SKIN, 9, { cast: 1 });
    px.ellipse(ls * 5.4, C[1] + 7.6, 1.7, 1.7, SKIN, 9.1);
    const hd = [rs * 7.2, C[1] + 6.6], el = [rs * 8, C[1] + 3.4];
    px.part(); px.tag("nearArm");
    px.capsule(sN[0], sN[1], 2, el[0], el[1], 1.8, SKIN, 9.2, { cast: 1 });
    px.capsule(el[0], el[1], 1.8, hd[0], hd[1], 1.7, SKIN, 9.2, { cast: 1 });
    px.capsule(el[0], el[1] + 1.2, 1.9, hd[0], hd[1], 1.8, LEATHER, 9.25, { cast: 1, floor: 1 });
    px.tag(null);
    px.part(); px.tag("weapon");
    px.capsule(hd[0], hd[1] + 0.6, 0.85, hd[0] - rs * 0.6, hd[1] + 4.2, 0.85, WOOD, 9.3, { cast: 1 });
    px.tag(null);
    px.part();
    px.ellipse(hd[0], hd[1], 1.8, 1.8, SKIN, 9.6);
  }

  // the head: the mane streams a beat behind the bob
  px.part();
  const tuft = -sw * 0.6;
  px.stamp(s > 0 ? FACE : HAIRB, hx, hy, LEG, 9.5, { ax: 6, ay: 6, cast: 2, ball: [6.5, 5.5, 7, 6.5] });
  if (s < 0) px.poly([[hx - 3, hy + 4], [hx + 3, hy + 4], [hx + 2.4 + tuft, hy + 8.6], [hx - 2.4 + tuft, hy + 8.6]], HAIR, 9.45, { cast: 1 });
  void cl;
};

const make = (s) => (px, F, o = {}) => {
  const { b, sx } = wolfView(px, F, s, WOLF, { zHead: 11 });
  rider(px, F, s, b, sx);
  void o;
  return {};
};
export const BOX = { w: 48, h: 74, ox: 24, oy: 52 };
export const FRONT = { NAME: "wolfrider-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk: { ...SIDE.walk } } };
export const BACK = { NAME: "wolfrider-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk: { ...SIDE.walk } } };
