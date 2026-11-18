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
import { solveBeast } from "./beast.js";
import { ik } from "./rig.js";
import { carry, damp } from "./carry.js";

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

// ---- ONE axe pose (views-artist.md, "One weapon pose"): the side file's hatchet angle, read per frame from the same
// formulas (the rider's seat, lean, near-arm ik, GRIP -0.8 + the wrist), damped, projected by carry(): FRONT it
// comes at us, BACK it rises past his hip with only the head showing past the body. a = la + PI/2 (the side file
// measures from +x).
const AXE_L = 17, AXE_B = 4, GRIPW = -0.8, RB = { spine: 7.6, upper: 5.2, fore: 5.2 };
const rideA = (p, p1, p2) => {
  const Q = WOLF.Q, b = solveBeast(p, Q), b1 = solveBeast(p1, Q), b2 = solveBeast(p2, Q);
  const s0 = b.at(0.2, 0, -0.4), s1 = b1.at(0.2, 0, -0.4), s2 = b2.at(0.2, 0, -0.4);
  const late = s1[1] * 0.65 + s2[1] * 0.35, air = cl(s0[1] - late, 0, 2.2), press = cl(late - s0[1], 0, 1.8);
  const H = [s0[0], s0[1] - air], lean = (p.rLean ?? 0.3) + press * 0.05 - air * 0.04, sp = RB.spine - press * 0.5;
  const C = [H[0] + Math.sin(lean) * sp, H[1] - Math.cos(lean) * sp];
  const tw = p.rTwist ?? 0, sN = [C[0] - 2.8 + tw * 1.4, C[1] + 0.9];
  const [ang, reach] = p.rArm ?? [1.0, 0.7], len = RB.upper + RB.fore;
  const na = ik(sN[0], sN[1], sN[0] + Math.sin(ang) * reach * len, sN[1] + Math.cos(ang) * reach * len, RB.upper, RB.fore, 1);
  const hd = na.end, la = Math.atan2(hd[1] - na.mid[1], hd[0] - na.mid[0]) + GRIPW + cl(p.wrist || 0, -0.35, 0.35);
  return { a: la + Math.PI / 2, rel: hd[1] - C[1] };
};
const MEAN = (() => { let t = 0, r = 0; for (let k = 0; k < 8; k++) { const ph = k / 8, lg = SIDE.walk.lag ?? 0.09, P = (x) => SIDE.walk.pose(((x % 1) + 1) % 1); t += rideA(P(ph), P(ph - lg), P(ph - 2 * lg)).a; r += rideA(P(ph), P(ph - lg), P(ph - 2 * lg)).rel; } return { a: t / 8, rel: r / 8 }; })();
const axePose = (F) => { const r = rideA(F.sk.p, F.lag1.p, F.lag2.p); return { a: damp(r.a, MEAN.a), rel: r.rel }; };
// the haft in two segments split at the fist, and the bearded head at FULL size
const drawAxe = (px, cr, hd, zT, zB) => {
  const T = cr.at(AXE_L), bu = cr.at(-AXE_B), hp = (f, sd) => cr.head(AXE_L, f - AXE_L, sd);
  px.part(); px.tag("weapon");
  px.capsule(bu[0], bu[1], 0.8, hd[0], hd[1], 0.85, WOOD, zB, { cast: 0 });
  px.capsule(hd[0], hd[1], 0.85, T[0], T[1], 0.8, WOOD, zT, { cast: 0 });
  px.part();
  px.poly([hp(14.4, 0.4), hp(13, 4.6), hp(16.2, 6), hp(19.6, 4.2), hp(19.2, 0.4)], STEEL, zT + 0.05, { fix: 2, cast: 0 });
  px.poly([hp(13, 4.6), hp(16.2, 6), hp(19.6, 4.2), hp(18.6, 3.4), hp(15.8, 4.8)], STEEL, zT + 0.08, { fix: 4, cast: 0 });
  px.poly([hp(15.4, -0.4), hp(18.8, -0.4), hp(18.2, -2.4)], IRONK, zT + 0.04, { fix: 1, cast: 0 });
  px.poly([hp(13.6, -0.8), hp(19.6, -0.8), hp(19.6, 1), hp(13.6, 1)], IRONK, zT + 0.1, { fix: 1, cast: 0 });
  px.tag(null);
};

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
    // the near arm (his right, screen left): the hatchet in his fist, raised forward and coming at us
    const ap = axePose(F), hd = [rs * 8.6, C[1] + ap.rel], el = [rs * 8.4, (sN[1] + hd[1]) / 2];
    drawAxe(px, carry(ap.a, s, { rs, hand: hd, len: AXE_L, butt: AXE_B, zTop: 9.4, zUnder: 7.8 }), hd, 9.4, 9.4);
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
    // the haft runs through his fist: the butt below it, the rest forward (behind arm and jerkin) with the axe head showing past his hip
    const tp = [hd[0] + rs * 3, hd[1] - 5.6];
    px.capsule(hd[0] - rs * 0.3, hd[1] + 4.6, 0.85, hd[0], hd[1], 0.85, WOOD, 9.3, { cast: 1 });
    px.capsule(hd[0], hd[1], 0.85, tp[0], tp[1], 0.85, WOOD, 8.4, { cast: 1 });
    px.poly([[tp[0], tp[1] - 1], [tp[0] + rs * 5, tp[1] - 2.2], [tp[0] + rs * 5.4, tp[1] + 3.6], [tp[0] + rs * 3, tp[1] + 4.6], [tp[0], tp[1] + 2.4]], STEEL, 8.45, { fix: 2 });
    px.poly([[tp[0] + rs * 3, tp[1] + 4.6], [tp[0] + rs * 5.4, tp[1] + 3.6], [tp[0] + rs * 4.6, tp[1] + 2.6]], STEEL, 8.5, { fix: 4 });
    px.poly([[tp[0], tp[1] - 1.4], [tp[0] - rs * 1.2, tp[1] - 1.4], [tp[0] - rs * 1.2, tp[1] + 2], [tp[0], tp[1] + 2]], IRONK, 8.42, { fix: 1 });
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

// BACK stack (views-artist.md, "The BACK stack"): higher z is nearer us, i.e. further BEHIND him. The rider sits
// over the wolf (z 9+): axe lowest, then legs, fists, torso, both arms just over the torso (cast 0), the fur
// collar and the hair on his back and shoulders, the head last.
const riderBack = (px, F, b, sx) => {
  const ph = F.ph, TAU = Math.PI * 2, seat = b.at(0.2, 0, -0.4);
  const H = [sx * 0.6, seat[1] + 1.5], C = [H[0], H[1] - 6.3];
  const hx = Math.round(C[0]), hy = Math.round(C[1] - 3.8), sw = 0.5 * Math.sin(ph * TAU * 2), S = 5.2;
  const hN = [C[0] + 6.3, C[1] + 7.4], hF = [C[0] - 6.3, C[1] + 7.4 + sw * 0.8];
  // the hatchet, one pose: tip side forward (away from us, behind him, z 9), the butt stub below the fist
  const ap = axePose(F);
  hN[1] = C[1] + ap.rel;
  drawAxe(px, carry(ap.a, -1, { rs: 1, hand: hN, len: AXE_L, butt: AXE_B }), hN, 9, 11);
  // the legs, boots down the flanks
  for (const side of [-1, 1]) {
    px.part();
    const k = [side * 7.8, H[1] + 2.4], f = [side * 8.2, H[1] + 9.4];
    px.capsule(side * 2.4, H[1] + 0.2, 2.5, k[0], k[1], 2.1, BROWN2, 10, { cast: 1, floor: 1 });
    px.capsule(k[0], k[1], 2, f[0], f[1] - 0.6, 1.6, LEATHER, 10, { cast: 1, floor: 1 });
    px.ellipse(f[0] + side * 0.3, f[1] + 0.7, 1.9, 1.3, LEATHER, 10.02, { cast: 1 });
  }
  // the fists, small, under the cuffs
  px.part(); px.ellipse(hN[0], hN[1] + 0.9, 1.5, 1.5, SKIN, 11.6, { cast: 0 });
  px.part(); px.ellipse(hF[0], hF[1] + 0.9, 1.5, 1.5, SKIN, 11.6, { cast: 0 });
  // the jerkin, belt and its seam
  px.part(); const tab = px._pid;
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 4.8, C[1] - 1.6], [C[0] + 4.8, C[1] + 2.8], [H[0] + 4.7, H[1] - 1], [H[0] + 5, H[1] + 3.6], [H[0] + 1.6, H[1] + 4.8], [H[0] - 1, H[1] + 3.4],
    [H[0] - 3, H[1] + 4.8], [H[0] - 5, H[1] + 3.4], [H[0] - 4.8, H[1] - 1], [C[0] - 4.8, C[1] + 2.8]], BROWN, 12, { round: 0.92, cast: 1 });
  px.toneLine(C[0], C[1], H[0], H[1] - 2.6, -1, tab);
  px.poly([[H[0] - 5, H[1] - 2.2], [H[0] + 5, H[1] - 2.2], [H[0] + 5, H[1] - 0.4], [H[0] - 5, H[1] - 0.4]], BROWN2, 12.05, { round: 0.92, floor: 1 });
  // both arms, the same z, one limb each, hanging at his sides (a forearm bracer on each)
  for (const [sgn, hd] of [[1, hN], [-1, hF]]) {
    const sh = [C[0] + sgn * S, C[1] + 1.2], el = [C[0] + sgn * (S + 1.2), (C[1] + 1.2 + hd[1]) / 2];
    px.part();
    px.limb([sh, el, hd], [2, 1.8, 1.6], SKIN, 12.3, { cast: 0 });
    px.capsule(el[0], el[1] + 0.8, 1.9, hd[0], hd[1], 1.75, LEATHER, 12.35, { cast: 0, floor: 1 });
  }
  // the fur collar over the shoulders, the hair on his back
  px.part();
  px.poly([[C[0] - 5.4, C[1] - 2], [C[0] + 5.4, C[1] - 2], [C[0] + 5.2, C[1] + 1.4], [C[0] - 5.2, C[1] + 1.4]], FUR, 13, { round: 0.8, cast: 1, edge: true });
  for (const x of [-4.4, -1.8, 1, 3.8]) px.dot(C[0] + x, C[1] + 2.2, FUR, 13, { noLine: true });
  px.part();
  px.poly([[hx - 3, hy + 4], [hx + 3, hy + 4], [hx + 2.4 - sw * 0.6, hy + 8.6], [hx - 2.4 - sw * 0.6, hy + 8.6]], HAIR, 13.5, { cast: 1 });
  px.part();
  px.stamp(HAIRB, hx, hy, LEG, 14, { ax: 6, ay: 6, cast: 1, ball: [6.5, 5.5, 7, 6.5] });
};

const make = (s) => (px, F, o = {}) => {
  const { b, sx } = wolfView(px, F, s, WOLF, { zHead: 11 });
  if (s > 0) rider(px, F, s, b, sx); else riderBack(px, F, b, sx);
  void o;
  return {};
};
export const BOX = { w: 48, h: 74, ox: 24, oy: 52 };
export const FRONT = { NAME: "wolfrider-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk: { ...SIDE.walk } } };
export const BACK = { NAME: "wolfrider-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk: { ...SIDE.walk } } };
