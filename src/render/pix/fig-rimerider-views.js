// ============ CONCEPT FIGURES: the Rime Wolf-Rider seen from the FRONT and from BEHIND ============
// The white frost wolf (fig-wolf-views.js' build in the Rime's coat: slate ruff with rime on the hackles,
// ice-blue eyes, a teal saddle cloth with an ochre hem, a bone-studded breast strap) with the clan
// raider seated on the withers: horned iron helm and nasal, a mantle of shaggy white fur, teal tunic,
// forked flax beard, a Dane axe in his right fist. His right is screen LEFT in FRONT, screen RIGHT from
// BEHIND. FRONT: helm, eyes, forked beard, both horns, the axe stood up beside him; NO shield (the
// round painted one is slung on his back, so it must not rise behind his head). BACK: the big
// ochre-and-teal shield fills his back, the braid hangs under the helm, the axe is carried forward and
// only its butt shows by the hip. `variant: "loose"`: the wolf alone (saddle cloth, rein), no rider.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES, Q as RQ } from "./fig-rimerider.js";
import { wolfView, mkKit, cl } from "./fig-wolf-views.js";

const FUR = mat("#d6dde6"), PALE = mat("#f2f5f8"), MANE = mat("#8294ae"), FROST = flat("#eaf6ff");
const EYEW = flat("#9fe4ff", { emis: true }), GLINT = flat("#f4fdff", { emis: true }), NOSE = flat("#2a2c3a"), MOUTH = flat("#3a1c2c");
const TEAL = mat("#3e6470"), TEAL_D = mat("#2a5260"), OCHRE = mat("#d8a040"), LEATHER = mat("#6a4a30"), WOOL = mat("#8a7a5a"), BONE = mat("#ece0c4");
const SKIN = mat("#e2b48c"), FURW = mat("#eef0ee"), IRON = mat("#9aa0ac", { contrast: 1.2 }), IRON_D = mat("#5e646e"), STEEL = mat("#c8ccd2", { contrast: 1.3 });
const WOODM = mat("#7a5632"), FLAX = mat("#d8b868"), BRASS = mat("#c8a040"), EYER = flat("#2a1c2c");
const KIT = { ...mkKit({ FUR, PALE, MANE, EYE: EYEW, GLINT, NOSE, MOUTH }, RQ), FROST };

const RLEG = { M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYER }, H: { m: FLAX }, B: { m: FLAX, fix: 2 } };
const RFACE = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".MMMMMMMMMMM.",
  ".DDDDDDDDDDD.",
  ".HSSESDSESSH.",
  ".HSSSSDSSSSH.",
  ".HHSSSDSSSHH.",
  ".HHBBBBBBBHH.",
  "..HBBBBBBBH..",
  "...BBBBBBB...",
  "...BBB.BBB...",
];
const RBACK = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".MMMMMDMMMMM.",
  ".DDDDDDDDDDD.",
  ".HHHHHHHHHHH.",
  ".HHHHHHHHHHH.",
  "..HHHHHHHHH..",
  "...HHHHHHH...",
];

const horn = (px, x0, y0, dir, z) => {
  const pts = [[x0, y0, 1.7], [x0 + dir * 2.8, y0 - 1, 1.4], [x0 + dir * 4.6, y0 - 3.4, 1.1], [x0 + dir * 5.2, y0 - 6.6, 0.7], [x0 + dir * 4.8, y0 - 8.4, 0.35]];
  for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
};

// the saddle cloth and the breast strap
const harness = (px, c) => {
  const { s, b, chestY, rumpY, sx } = c;
  px.part();
  if (s > 0) {
    // the strap across the chest, studded with bone
    px.capsule(sx - 5.6, chestY - 4, 0.95, sx + 5.6, chestY + 2.4, 0.95, TEAL, 4.4, { floor: 1 });
    px.dot(sx - 2.4, chestY - 2.2, BONE, 4.45, { fix: 3 }); px.dot(sx + 2.4, chestY + 0.6, BONE, 4.45, { fix: 3 });
  } else {
    // the cloth hanging each side of the spine over the haunches, an ochre hem
    for (const side of [-1, 1]) {
      const x0 = sx + side * 2, x1 = sx + side * 7.2;
      px.poly([[x0, b.W[1] + 5], [x1, b.W[1] + 6], [x1 + side * 0.4, rumpY + 3.4], [x0, rumpY + 4]], TEAL, 4.7, { round: 0.8, cast: 1 });
      px.line(x0, rumpY + 4, x1 + side * 0.4, rumpY + 3.4, OCHRE, 4.72, { fix: 3 });
    }
    px.dot(sx + 1, b.W[1] + 9, OCHRE, 4.74, { fix: 3 });
  }
};

const rider = (px, F, s, b, sx) => {
  const rs = -s, ls = s, ph = F.ph, TAU = Math.PI * 2;
  const seat = b.at(0.06, 0, -1.8);
  const H = [sx * 0.6, seat[1] + 1.5], C = [H[0], H[1] - 8.6 * 0.9];
  const hx = Math.round(C[0]), hy = Math.round(C[1] - 5);
  const sw = 0.5 * Math.sin(ph * TAU * 2);

  if (s < 0) {
    // the round shield slung on his back: ochre rim, teal field, iron boss, six studs
    px.part(); const shId = px._pid;
    const cx = C[0], cy = C[1] + 3.2, SR = 7;
    px.ellipse(cx, cy, SR, SR, OCHRE, 8.8, { round: 0.55, cast: 1 });
    px.ellipse(cx, cy, SR * 0.62, SR * 0.62, TEAL_D, 8.82, { round: 0.6 });
    px.ellipse(cx, cy, SR * 0.26, SR * 0.26, IRON, 8.86, { cast: 1 });
    px.toneLine(cx - SR * 0.6, cy - SR * 0.6, cx + SR * 0.6, cy + SR * 0.6, -1, shId);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; px.dot(cx + Math.cos(a) * SR * 0.82, cy + Math.sin(a) * SR * 0.82, STEEL, 8.88, { fix: 3 }); }
  }
  // the horns and (behind) the braid, round the helm
  px.part();
  horn(px, hx - 4.6, hy - 5, -1, 7.5); horn(px, hx + 4.6, hy - 5, 1, 9.6);
  if (s < 0) { px.capsule(hx, hy + 4, 1.5, hx + sw, hy + 8.6, 1.3, FLAX, 9.7); px.capsule(hx + sw, hy + 8.6, 1.3, hx + sw * 1.4, hy + 12.4, 0.9, FLAX, 9.7); }

  for (const side of [ls, rs]) {
    px.part();
    const k = [side * 8.2, H[1] + 2.4], f = [side * 8.6, H[1] + 10.2];
    px.capsule(side * 2.6, H[1] + 0.2, 2.5, k[0], k[1], 2.1, WOOL, 8, { cast: 1 });
    px.capsule(k[0], k[1], 2, f[0], f[1] - 0.6, 1.6, LEATHER, 8, { cast: 1 });
    px.ellipse(f[0] + side * 0.3, f[1] + 0.7, 1.9, 1.3, LEATHER, 8.02, { cast: 1 });
    px.capsule(k[0] - 1.8, k[1] + 3, 1.2, k[0] + 1.8, k[1] + 3.2, 1.2, FURW, 8.05, {});
  }
  // the tunic and belt, the white mantle over the shoulders
  px.part();
  px.poly([[C[0] - 4.8, C[1] - 1.6], [C[0] + 4.8, C[1] - 1.6], [C[0] + 4.8, C[1] + 2.8], [H[0] + 4.7, H[1] - 1], [H[0] + 4.8, H[1] + 2.6], [H[0] - 4.8, H[1] + 2.6], [H[0] - 4.8, H[1] - 1], [C[0] - 4.8, C[1] + 2.8]], TEAL, 8.5, { round: 0.92, cast: 1 });
  px.poly([[H[0] - 5, H[1] - 2.2], [H[0] + 5, H[1] - 2.2], [H[0] + 5, H[1] - 0.4], [H[0] - 5, H[1] - 0.4]], LEATHER, 8.55, { round: 0.92, floor: 1 });
  if (s > 0) px.rect(H[0] - 1.2, H[1] - 2.2, 2.4, 1.8, BRASS, 8.58, { fix: 3 });
  px.part();
  px.ellipse(C[0], C[1] + 0.6, 8, 4.2, FURW, 8.6, { cast: 1 });
  for (const x of [-6.4, -4, -1.4, 1.2, 3.8, 6]) px.dot(C[0] + x, C[1] + 4.4 - Math.abs(x) * 0.1 + (x > 0 ? sw * 0.3 : 0), FURW, 8.6);
  for (const x of [-5, -2, 1, 4]) px.dot(C[0] + x, C[1] + 5.2 + (x & 1), FURW, 8.6);
  for (const [x, y] of [[-3, -0.6], [1.6, -1.2], [4.4, 0.8]]) px.dot(C[0] + x, C[1] + y, FROST, 8.65, { noLine: true });

  const sN = [C[0] + rs * 5.6, C[1] + 1.2], sF = [C[0] + ls * 5.6, C[1] + 1.2];
  if (s > 0) {
    const h = [ls * 4.6, C[1] + 7];
    px.part();
    px.capsule(sF[0], sF[1], 2, ls * 7.8, C[1] + 5, 1.8, TEAL, 9, { cast: 1 });
    px.capsule(ls * 7.8, C[1] + 5, 1.8, h[0], h[1], 1.6, TEAL, 9, { cast: 1 });
    px.ellipse(h[0], h[1] + 0.4, 1.7, 1.6, SKIN, 9.1);
    // the near arm and the Dane axe stood up beside him, the bearded blade turned out
    const hd = [rs * 9, C[1] + 5.6], el = [rs * 8.8, C[1] + 3];
    const tx = hd[0] + rs * 0.5, ty = hd[1] - 17.5;
    px.part(); px.tag("axe");
    px.capsule(hd[0], hd[1] + 5, 0.85, tx, ty, 0.85, WOODM, 9.4, { cast: 1 });
    px.poly([[tx, ty + 0.4], [tx + rs * 7.6, ty - 1.6], [tx + rs * 8, ty + 5.6], [tx + rs * 5, ty + 7], [tx, ty + 4]], STEEL, 9.5, { fix: 2 });
    px.poly([[tx + rs * 4.4, ty + 5.8], [tx + rs * 8, ty + 5.6], [tx + rs * 5, ty + 7]], STEEL, 9.55, { fix: 4 });
    px.poly([[tx, ty - 2], [tx - rs * 0.4, ty - 2], [tx - rs * 1.8, ty + 4.4], [tx, ty + 4.4]], IRON_D, 9.45, { fix: 1 });
    px.tag(null);
    px.part(); px.tag("nearArm");
    px.capsule(sN[0], sN[1], 2.1, el[0], el[1], 1.9, TEAL, 9.2, { cast: 1 });
    px.capsule(el[0], el[1], 1.9, hd[0], hd[1], 1.7, TEAL, 9.2, { cast: 1 });
    px.capsule(el[0], el[1] + 1.4, 1.9, hd[0], hd[1], 1.8, LEATHER, 9.25, { cast: 1 });
    px.ellipse(hd[0], hd[1], 1.8, 1.9, SKIN, 9.6);
    px.tag(null);
  } else {
    px.part();
    px.capsule(sF[0], sF[1], 2, ls * 6.8, C[1] + 5.2, 1.8, TEAL, 9, { cast: 1 });
    px.capsule(ls * 6.8, C[1] + 5.2, 1.8, ls * 5.8, C[1] + 7.8, 1.6, TEAL, 9, { cast: 1 });
    px.ellipse(ls * 5.8, C[1] + 8.2, 1.7, 1.7, SKIN, 9.1);
    const hd = [rs * 7.6, C[1] + 7.2], el = [rs * 8.6, C[1] + 3.8];
    px.part(); px.tag("nearArm");
    px.capsule(sN[0], sN[1], 2.1, el[0], el[1], 1.9, TEAL, 9.2, { cast: 1 });
    px.capsule(el[0], el[1], 1.9, hd[0], hd[1], 1.7, TEAL, 9.2, { cast: 1 });
    px.capsule(el[0], el[1] + 1.4, 1.9, hd[0], hd[1], 1.8, LEATHER, 9.25, { cast: 1 });
    px.tag(null);
    px.part(); px.tag("axe");
    px.capsule(hd[0], hd[1] + 0.6, 0.85, hd[0] - rs * 0.4, hd[1] + 4.6, 0.85, WOODM, 9.3, { cast: 1 });
    px.tag(null);
    px.part();
    px.ellipse(hd[0], hd[1], 1.8, 1.9, SKIN, 9.6);
  }
  px.part();
  px.stamp(s > 0 ? RFACE : RBACK, hx, hy, RLEG, 9.5, { ax: 6, ay: 6, ball: [6.5, 5.5, 7, 6.5], cast: 1 });
  void cl;
};

const make = (s) => (px, F, o = {}) => {
  const loose = o.variant === "loose";
  const { b, sx } = wolfView(px, F, s, KIT, { zHead: 11, extra: harness });
  if (!loose) rider(px, F, s, b, sx);
  return {};
};
export const BOX = { w: 48, h: 84, ox: 24, oy: 76 };
export const FRONT = { NAME: "rimerider-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk: { ...SIDE.walk } } };
export const BACK = { NAME: "rimerider-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk: { ...SIDE.walk } } };
