// ============ the Rime thrall seen from the FRONT and from BEHIND ============
// Same job as fig-goblin-views.js: one drawer, `make(s)`: s = +1 FRONT, -1 BACK. Colours, build, horned helm and
// nasal, mantle of white fur, big painted round shield (ochre / sea-teal quarters), Dane axe, forked flax beard and
// braid are the side figure's (fig-thrall.js). Hands: the axe is in his RIGHT hand (screen LEFT in front, RIGHT from
// behind: rs = -s), the shield on his LEFT arm (ls = s). The walk keeps the side clip's n, ms and phase and reads its
// feet, bob and arm swing from the same pose, so the game can switch views mid-stride. Forward is DOWN the screen
// in front, UP behind (FWD 0.4 a px of stride). One sun, upper left, both views unmirrored.
// `kit` and `legs` are exported for the huscarl and the berserker (fig-huscarl-views.js, fig-berserker-views.js).
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-thrall.js";

const SKIN = mat("#e2b48c"), TEAL = mat("#4e6a6e"), TEAL_D = mat("#2f5866"), WOOL = mat("#8a7a5a"), LEATHER = mat("#6a4a30"), DARK = mat("#3a2a20");
const FURW = mat("#e8e6e0"), OCHRE = mat("#d0943a"), IRON = mat("#9aa0ac", { contrast: 1.2 }), IRON_D = mat("#5e646e");
const STEEL = mat("#c8ccd2", { contrast: 1.3 }), WOOD = mat("#7a5632"), FLAX = mat("#d8b868"), BONE = mat("#ece0c4"), BRASS = mat("#c8a040");
const EYE = flat("#2a1c2c");

export const FWD = 0.4;
export const cl = (v, a, b) => Math.max(a, Math.min(b, v));
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// the walk's shared numbers: sway over the planted foot, how fast things move (for the lagging bits)
export const kit = (s, F, sway = 0.8) => {
  const rs = -s, ls = s, TAU = Math.PI * 2, { sk, ph } = F, p = sk.p;
  const sw = (t) => rs * sway * Math.sin(t * TAU);
  const sx = sw(ph), sx1 = sw(ph - 0.09), sx2 = sw(ph - 0.18);
  return {
    s, rs, ls, sk, ph, p, TAU, sx,
    hipY: sk.P[1], chY: sk.C[1], hy: Math.round(sk.N[1]), hx: Math.round(sx * 0.7),
    vy: cl(sk.N[1] - F.lag1.N[1], -2, 2), vy2: cl(F.lag1.N[1] - F.lag2.N[1], -2, 2),
    vx: cl((sx - sx1) * 1.3, -2.5, 2.5), vx2: cl((sx1 - sx2) * 1.3, -2.5, 2.5),
    tilt: 0.5 * Math.sin(ph * TAU),
  };
};

// the legs: cloth to the knee, a boot over the lower half, a cuff; forward is down (front) or up (back)
export const legs = (px, K, o) => {
  const { s, rs, ls, p, hx, hipY } = K;
  for (const [f, side, z] of [[p.fF, ls, 2], [p.fN, rs, 3]]) {
    const lift = f[1], fx = hx + side * o.foot, fy = o.ground + s * f[0] * FWD - lift * 0.9, b = side === rs ? 0 : -1;
    const hp = [hx + side * o.hip, hipY + 0.5], kn = [(hp[0] + fx) / 2 + side * 0.9, (hp[1] + fy) / 2 - lift * 0.5], zz = z + lift * 0.05;
    px.part();
    px.capsule(hp[0], hp[1], o.w[0], kn[0], kn[1], o.w[1], o.cloth, zz, { bias: b });
    px.capsule(kn[0], kn[1], o.w[1], fx, fy, o.w[2], o.cloth, zz, { bias: b });
    const w0 = mix(kn, [fx, fy], o.bootAt);
    px.capsule(w0[0], w0[1], o.w[1], fx, fy, o.w[2] + 0.2, o.boot, zz + 0.03, { bias: b });
    if (o.cuff) px.capsule(w0[0] - 1.9, w0[1] - 0.2, 1.1, w0[0] + 1.9, w0[1] + 0.2, 1.1, o.cuff, zz + 0.05, { bias: b });
    px.part();
    if (s > 0) px.ellipse(fx + side * 0.3, fy + 1.3, o.w[2] + 1.1, 1.9, o.boot, z + 0.4 + lift * 0.05, { bias: b });
    else {
      px.ellipse(fx, fy + 1, o.w[2] + 0.9, 1.7, o.boot, z + 0.4 + lift * 0.05, { bias: b });
      if (lift > 0.8) px.ellipse(fx, fy + 2.8, o.w[2] + 0.7, 2 * cl(lift / 2.4, 0.3, 1), o.boot, z + 0.45, { bias: -2 });   // the sole as the heel comes up
    }
  }
};

// a curling horn, out to one side and up
export const horn = (px, x0, y0, dir, z, th = 1) => {
  const pts = [[x0, y0, 2 * th], [x0 + dir * 3.4, y0 - 1.2, 1.7 * th], [x0 + dir * 5.8, y0 - 4.4, 1.3 * th], [x0 + dir * 6.6, y0 - 8.4, 0.8 * th], [x0 + dir * 6, y0 - 11.4, 0.4 * th]];
  for (let i = 0; i + 1 < pts.length; i++) px.capsule(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2], BONE, z, { cast: 1 });
};

// The Dane axe, in the fist hd (screen side rs). FRONT: upright by his side, the head out to that side.
// back = true (the BACK stack, z 1.0 = carried, in front of him): the haft stands upright at the fist's x, the beard and
// head tucked INWARD behind his head and mantle, so below the fist the butt shows, the sleeve hides the haft up to the
// shoulder and the top of the haft shows above it.
export const daneAxe = (px, K, hd, L, k, z, IRON_M = IRON_D, back = false) => {
  const { rs, vx } = K, t = back ? 0 : rs * 0.2 + vx * 0.08, bs = back ? -rs : rs, A = (f, o) => [hd[0] + t * f + bs * o, hd[1] - f], zb = back ? 1.0 : z;
  px.part(); px.tag("weapon");
  px.capsule(...A(-4, 0), 0.95, ...A(L + 1, 0), 0.95, WOOD, zb, { edge: !back, cast: back ? 0 : 1 });
  px.part();
  px.poly([A(L - 2.2 * k, 0.4), A(L - 3.8 * k, 3.4 * k), A(L - 3.4 * k, 6.2 * k), A(L - 0.4 * k, 6.6 * k), A(L + 1.8 * k, 4.2 * k), A(L + 1.6 * k, 0.4)], STEEL, zb + 0.02, { fix: 2 });
  px.poly([A(L - 3.4 * k, 6.2 * k), A(L - 0.4 * k, 6.6 * k), A(L + 1.8 * k, 4.2 * k), A(L + 1.2 * k, 3.6 * k), A(L - 0.6 * k, 5.2 * k)], STEEL, zb + 0.03, { fix: 4 });
  px.poly([A(L - 1.6, -0.4), A(L + 1.2, -0.4), A(L + 1.4, -4)], IRON_M, zb + 0.01, { fix: 1 });
  px.poly([A(L - 2.6, -0.8), A(L + 1.8, -0.8), A(L + 1.8, 0.9), A(L - 2.6, 0.9)], IRON_M, zb + 0.04, { fix: 1 });
  px.tag(null);
  return A;
};

// BACK arms (the BACK stack): both hang at his sides, one z (4.3, cast 0), the fists under them at 3.6, no x travel,
// the hand swinging in y only. o: sh (shoulder x), el (elbow x), hx (hand x), up/fo/cuff materials, w widths, handY.
export const backArms = (px, K, o) => {
  const { rs, ls, p, sx, chY, hipY } = K, sY = chY + 0.4 + 0.8;
  for (const [side, ang] of [[ls, p.aF[0]], [rs, p.aN[0]]]) {
    const hand = [sx + side * o.hx, (o.handY ?? hipY - 2) + cl(ang, -1, 1) * 1.2], el = [sx + side * o.el, (sY + hand[1]) / 2 + 0.4], sh = [sx + side * o.sh, sY];
    px.part();
    px.capsule(sh[0], sh[1], o.w[0], el[0], el[1], o.w[1], o.up, 4.3, { cast: 0 });
    px.capsule(el[0], el[1], o.w[1], hand[0], hand[1], o.w[2], o.up, 4.3, { cast: 0 });
    const c0 = mix(el, hand, 0.84);
    px.capsule(c0[0], c0[1], o.w[2], hand[0], hand[1], o.w[2], o.cuff, 4.32, { cast: 0 });
    px.part();
    px.ellipse(hand[0], hand[1] + 1, 1.5, 1.6, o.fist ?? SKIN, 3.6);
    if (side === rs) o.hand = hand;
    else o.handL = hand;
  }
  return o.hand;
};

// FROM BEHIND a held axe is hidden by the body: only the fist, the butt of the haft below it and a glint of the beard
// past the hip, angled forward and down (owner's rule)
export const backGrip = (px, K, hd, z, len = 5) => {
  const { rs } = K;
  px.part(); px.tag("weapon");
  px.capsule(hd[0] - rs * 0.2, hd[1] - 1.5, 0.95, hd[0] + rs * 0.5, hd[1] + len, 0.95, WOOD, z, { edge: true });
  px.tag(null);
};

// ---- heads. FRONT: helm, dark band and nasal, flax at the sides, forked flax beard. BACK: the helm's back, flax down.
// M iron, m a tone down, D dark band / nasal, H flax hair, B flax beard (fix 2), S skin, E eyes, N nose, Z the helm's back seam.
const FRONT_H = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMMMMMMM.",
  ".MMMMMmMMMMM.",
  ".DDDDDDDDDDD.",
  ".HSsSSDSSsSH.",
  ".HSESSDSSESH.",
  ".HSESSDSSESH.",
  ".HSSSSDSSSSH.",
  ".HHSSSNSSSHH.",
  ".HHBBBBBBBHH.",
  "..HBBBBBBBH..",
  "..HBBBBBBBH..",
  "...BBB.BBB...",
  "...BB...BB...",
];
const BLINK = FRONT_H.map((r, i) => (i === 7 ? r.replace(/E/g, "S") : r));
const BACK_H = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMZMMMMM.",
  ".MMMMMZMMMMM.",
  ".DDDDDDDDDDD.",
  ".HHHHHhHHHHH.",
  "SHHHHhHHHHHHS",
  "SHHHHhHHHHHHS",
  ".HHHHhHHHHHH.",
  "..HHHHhHHHH..",
  "...sSSSSSs...",
];
const LEG = {
  M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, Z: { m: IRON_D, fix: 1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  E: { m: EYE }, H: { m: FLAX }, h: { m: FLAX, bias: -1 }, B: { m: FLAX, fix: 2 },
};

const make = (s) => (px, F) => {
  const K = kit(s, F), { rs, ls, p, sx, hx, hy, hipY, chY, vx, vx2, vy, tilt, ph } = K;
  const shY = chY + 0.4;

  // the braid down his back (seen from behind; hidden by him in front), swinging a beat behind
  const sway = -vx * 1.6 - vx2 * 1.2;
  if (s < 0) {
    px.part();
    const b = [[hx, hy + 1], [hx + sway * 0.3, hy + 6], [hx + sway * 0.7, hy + 12], [hx + sway, hy + 18]];
    for (let i = 0; i < 3; i++) px.capsule(b[i][0], b[i][1], 1.7 - i * 0.15, b[i + 1][0], b[i + 1][1], 1.55 - i * 0.2, FLAX, 6.3);
    px.dot(b[3][0], b[3][1] + 1, LEATHER, 6.35);
  }

  // the horns, behind the helm (far one) and beside it
  px.part(); horn(px, hx - 5.4, hy - 8, -1, s > 0 ? 0.7 : 5.9);
  px.part(); horn(px, hx + 5.4, hy - 8, 1, s > 0 ? 0.8 : 5.9);

  // the shield on his left arm (screen side ls): its painted face toward us in front, its wooden back from behind
  const zs = s > 0 ? 7.4 : 1.0, R = 7.8, c = s > 0 ? [ls * 11 + sx, chY + 11 + tilt * 0.4] : [ls * 4.2 + sx, chY + 8.6];
  px.part();
  if (s > 0) px.capsule(sx + ls * 4.8, shY, 2.0, ls * 8.4 + sx, shY + 8, 1.8, TEAL, zs - 0.2, { bias: -1 });
  px.part(); const shId = px._pid;
  if (s > 0) {
    px.ellipse(c[0], c[1], R, R, OCHRE, zs, { round: 0.55, cast: 1 });
    px.ellipse(c[0], c[1], R * 0.62, R * 0.62, TEAL_D, zs + 0.02, { round: 0.6 });
    px.ellipse(c[0], c[1], R * 0.26, R * 0.26, IRON, zs + 0.06, { cast: 1 });
    px.toneLine(c[0] - R * 0.6, c[1] - R * 0.6, c[0] + R * 0.6, c[1] + R * 0.6, -1, shId);
    px.part();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; px.dot(c[0] + Math.cos(a) * R * 0.82, c[1] + Math.sin(a) * R * 0.82, STEEL, zs + 0.07, { fix: 3 }); }
  } else {
    // strapped on his left arm, carried forward: only the rim and dark inner face past his outline show
    px.ellipse(c[0], c[1], R, R, DARK, zs, { round: 0.6, cast: 0 });
    px.ellipse(c[0], c[1], R * 0.84, R * 0.84, WOOD, zs + 0.02, { round: 0.75 });
  }

  legs(px, K, { hip: 2.2, foot: 3.4, ground: -2.2, w: [2.5, 2.1, 1.7], cloth: WOOL, boot: LEATHER, bootAt: 0.45, cuff: FURW });

  // the tunic: teal wool to the knee, slit up the front, a leather belt, its hem a beat behind
  const c0 = chY - 1.6, hem = hipY + 4.2;
  px.part(); const tid = px._pid;
  px.poly([[sx - 5.2, c0], [sx + 5.2, c0], [sx + 5.8, chY + 3.4], [hx + 5.2, hipY - 2.4], [hx + 5.6 - vx * 0.5, hem], [hx + 2.2, hem + 0.8], [hx - vx * 0.3, hem - 0.6], [hx - 2.2, hem + 0.8], [hx - 5.6 - vx * 0.5, hem], [hx - 5.2, hipY - 2.4], [sx - 5.8, chY + 3.4]], TEAL, 4, { round: 0.9, cast: 1 });
  if (s > 0) px.toneLine(hx + 0.2, hipY - 0.4, hx, hem - 1.2, -1, tid);
  else px.toneLine(sx, c0 + 2, hx, hem - 1.2, -1, tid);
  px.poly([[hx - 5.4, hipY - 3.2], [hx + 5.4, hipY - 3.2], [hx + 5.5, hipY - 1.2], [hx - 5.4, hipY - 1.2]], LEATHER, 4.2, { round: 0.9 });
  px.part();
  if (s > 0) px.rect(hx - 1.3, hipY - 3.2, 2.6, 2, BRASS, 4.25, { fix: 3 });
  else { px.dot(hx - 3.2, hipY - 2.2, BRASS, 4.25, { fix: 3 }); px.dot(hx + 3.2, hipY - 2.2, BRASS, 4.25, { fix: 3 }); }

  // the white fur capelet over the shoulders, shaggy at its edge, a fur ball on each shoulder
  px.part();
  px.ellipse(sx, chY + 0.2, 8.8, 4.1, FURW, 4.4, { cast: 1 });
  for (const x of [-7, -4.4, -1.6, 1.2, 4, 6.6]) px.dot(sx + x, chY + 3.6 - Math.abs(x) * 0.1, FURW, 4.4);
  for (const x of [-6, -3, 0, 3, 6]) px.dot(sx + x, chY + 5 + (x & 1), FURW, 4.4);

  // the axe arm (his right, screen side rs): teal sleeve, leather cuff, the fist on the haft; the swing lifts the hand
  const ang = p.aN[0];
  if (s > 0) {
    const hd = [rs * 8 + sx, shY + 9.8 + s * ang * 2], el = [rs * 8.4 + sx, shY + 5];
    px.part(); px.tag("nearArm");
    px.capsule(sx + rs * 4.8, shY + 0.4, 2.1, el[0], el[1], 1.9, TEAL, 7.9, { cast: 1 });
    px.capsule(el[0], el[1], 1.9, hd[0], hd[1], 1.7, TEAL, 7.9, { cast: 1 });
    const cf = mix(el, hd, 0.66);
    px.capsule(cf[0], cf[1], 1.9, hd[0], hd[1], 1.8, LEATHER, 7.95, { cast: 1 });
    px.tag(null);
    daneAxe(px, K, hd, 16, 1.45, 8.1);
    px.part(); px.tag("nearHand");
    px.ellipse(hd[0], hd[1], 1.9, 2, SKIN, 8.3);
    px.tag(null);
  } else {
    const o = { sh: 5.4, el: 7.4, hx: 7.6, up: TEAL, cuff: LEATHER, w: [2.1, 1.9, 1.7] };
    const hd = backArms(px, K, o);
    daneAxe(px, K, [hd[0], hd[1] + 1], 16, 1.45, 1.0, IRON_D, true);
  }
  px.part();
  px.ellipse(sx + rs * 8, shY + 0.4, 3.6, 3.4, FURW, s > 0 ? 8 : 5, { cast: 1, edge: s < 0 });
  if (s < 0) px.ellipse(sx + ls * 8, shY + 0.4, 3.6, 3.4, FURW, 5, { cast: 1, edge: true });

  // the head
  px.part();
  if (s > 0) px.stamp(p.blink ? BLINK : FRONT_H, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  else px.stamp(BACK_H, hx, hy, LEG, 6.4, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  px.dot(hx + 5.6, hy - 8.4, BRASS, 6.7, { fix: 3 }); px.dot(hx - 5.6, hy - 8.4, BRASS, 6.7, { fix: 3 });
  if (s < 0) px.dot(hx, hy - 9.6, BRASS, 6.7, { fix: 3 });
  return {};
};

const walk = { ...SIDE.walk };
export const BOX = { w: 64, h: 84, ox: 32, oy: 74 };
export const FRONT = { NAME: "thrall-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "thrall-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
