// ============ the Rime Huscarl seen from the FRONT and from BEHIND ============
// One drawer, `make(s)`: s = +1 FRONT, -1 BACK (as fig-goblin-views.js). Colours and gear are the side figure's
// (fig-huscarl.js): spangenhelm with horns, brass band and nasal, mail curtain, copper forked beard, ring-mail hauberk
// to the knee with a teal sash, mantle of white fur, the great round shield in ochre / teal quarters, the long Dane axe.
// Owner's rules: in FRONT the shield rides low and forward on its arm, top below the chin, head clear; from BEHIND the
// axe is hidden by him (fist and haft butt only). Hands: axe in his RIGHT (screen LEFT in front), shield on his LEFT.
// Shares `kit`, `legs`, `horn`, `daneAxe`, `backGrip` with fig-thrall-views.js. Unflipped; one sun, upper left.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-huscarl.js";
import { kit, legs, horn, daneAxe, backArms, mix } from "./fig-thrall-views.js";

const SKIN = mat("#e2b48c"), TEAL = mat("#3a5a66"), TEAL_D = mat("#2a5260"), WOOL = mat("#6e5a44"), LEATHER = mat("#5a3e2a");
const MAIL = mat("#8a929c", { contrast: 1.25 }), MAIL_D = mat("#5a626e"), FURW = mat("#e8e6e0"), OCHRE = mat("#e0b050"), IRON = mat("#7e8692", { contrast: 1.3 }), IRON_D = mat("#5e646e");
const STEEL = mat("#d0d4da", { contrast: 1.3 }), WOOD = mat("#7a5632"), COPPER = mat("#c07a44"), BRASS = mat("#c8a040");
const EYE = flat("#2a1c2c");

const FRONT_H = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMmMMMMM.",
  ".BBBBBBBBBBB.",
  ".KMMsDDDsMMK.",
  ".KKSESDSESKK.",
  ".KKSESDSESKK.",
  ".KKSSSDSSSKK.",
  ".KKSSSNSSSKK.",
  ".KKRRRRRRRKK.",
  "..KRRRRRRRK..",
  "..KRRRRRRRK..",
  "...RRR.RRR...",
  "...RR...RR...",
];
const BLINK = FRONT_H.map((r, i) => (i === 5 || i === 6 ? r.replace(/E/g, "S") : r));
const BACK_H = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMMMZMMMMM.",
  ".BBBBBBBBBBB.",
  ".MMMMMZMMMMM.",
  "KKKKKKkKKKKKK",
  ".KKKKKkKKKKK.",
  ".KKKKKkKKKKK.",
  "..KKKKkKKKK..",
  "..kKKKkKKKk..",
  "...kkKKKkk...",
];
const LEG = {
  M: { m: IRON }, m: { m: IRON, bias: -1 }, D: { m: IRON_D, fix: 1 }, Z: { m: IRON_D, fix: 1 }, B: { m: BRASS, fix: 3 }, K: { m: MAIL, fix: 2 }, k: { m: MAIL, fix: 2, bias: -1 },
  S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 }, E: { m: EYE }, R: { m: COPPER, fix: 2 },
};

const make = (s) => (px, F) => {
  const K = kit(s, F, 0.6), { rs, ls, p, sx, hx, hy, hipY, chY, vx, tilt } = K;
  const shY = chY + 0.4;

  // horns, far then near
  px.part(); horn(px, hx - 5.6, hy - 8.4, -1, s > 0 ? 0.7 : 5.9, 1.15);
  px.part(); horn(px, hx + 5.6, hy - 8.4, 1, s > 0 ? 0.8 : 5.9, 1.15);

  // the great shield on his left arm, low and forward: face in front (quarters, boss, rivets), wooden back behind
  const zs = s > 0 ? 7.4 : 1.0, R = 10.2, c = s > 0 ? [ls * 14.2 + sx, chY + 14.4 + tilt * 0.4] : [ls * 2 + sx, chY + 12];
  px.part();
  if (s > 0) px.capsule(sx + ls * 5, shY, 2.2, ls * 9 + sx, shY + 9, 2, MAIL_D, zs - 0.2, { bias: -1 });
  px.part(); const shId = px._pid;
  if (s > 0) {
    px.ellipse(c[0], c[1], R, R, OCHRE, zs, { round: 0.55, cast: 1 });
    const wedge = (a0) => { const pts = [[c[0], c[1]]]; for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); pts.push([c[0] + Math.cos(a) * R * 0.94, c[1] + Math.sin(a) * R * 0.94]); } px.poly(pts, TEAL_D, zs + 0.02, { round: 0.6 }); };
    wedge(0); wedge(Math.PI);
    px.ellipse(c[0], c[1], R * 0.22, R * 0.22, IRON, zs + 0.06, { cast: 1 });
    px.toneLine(c[0] - R * 0.7, c[1] - R * 0.7, c[0] + R * 0.7, c[1] + R * 0.7, -1, shId);
    px.part();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + 0.2; px.dot(c[0] + Math.cos(a) * R * 0.9, c[1] + Math.sin(a) * R * 0.9, STEEL, zs + 0.07, { fix: 3 }); }
  } else {
    // strapped on his left arm and carried forward: only its rim and dark inner face past his outline
    px.ellipse(c[0], c[1], R, R, IRON_D, zs, { round: 0.6, cast: 0 });
    px.ellipse(c[0], c[1], R * 0.88, R * 0.88, WOOD, zs + 0.02, { round: 0.75 });
  }

  legs(px, K, { hip: 2.4, foot: 3.6, ground: -2.4, w: [2.9, 2.4, 1.9], cloth: WOOL, boot: LEATHER, bootAt: 0.42, cuff: FURW });

  // the hauberk: ring mail to the knee, a teal sash down the middle, belt
  const c0 = chY - 1.6, hem = hipY + 5;
  px.part(); const mId = px._pid;
  px.poly([[sx - 5.8, c0], [sx + 5.8, c0], [sx + 6.6, chY + 3.4], [hx + 5.8, hipY - 2.4], [hx + 6.2 - vx * 0.5, hem], [hx + 2.2, hem + 0.8], [hx - vx * 0.3, hem - 0.6], [hx - 2.2, hem + 0.8], [hx - 6.2 - vx * 0.5, hem], [hx - 5.8, hipY - 2.4], [sx - 6.6, chY + 3.4]], MAIL, 4, { round: 0.9, cast: 1 });
  px.toneLine(hx + 0.2, hipY - 0.4, hx, hem - 1.2, -1, mId);
  for (let yy = chY + 1; yy < hem - 1; yy += 2.6) for (let xx = -4.6; xx <= 4.8; xx += 3) { const sh = ((yy - chY) / 2.6 | 0) % 2 ? 1.5 : 0; if (yy < hipY - 2 || Math.abs(xx) < 4.2) px.dot(sx + xx + sh, yy, MAIL_D, 4.08, { noLine: true }); }
  if (s > 0) px.poly([[sx - 1.6, chY + 1], [sx + 1.6, chY + 1], [hx + 1.8, hem - 0.2], [hx - 1.8, hem - 0.2]], TEAL, 4.12, { round: 0.9 });
  px.poly([[hx - 5.8, hipY - 3.4], [hx + 5.8, hipY - 3.4], [hx + 5.9, hipY - 1.2], [hx - 5.8, hipY - 1.2]], LEATHER, 4.2, { round: 0.9 });
  px.part();
  if (s > 0) px.rect(hx - 1.3, hipY - 3.2, 2.6, 2.2, BRASS, 4.25, { fix: 3 });
  else { px.dot(hx - 3.4, hipY - 2.2, BRASS, 4.25, { fix: 3 }); px.dot(hx + 3.4, hipY - 2.2, BRASS, 4.25, { fix: 3 }); }

  // the mantle of white fur, shaggy at its edge
  px.part();
  px.ellipse(sx, chY + 0.4, 10, 4.4, FURW, 4.4, { cast: 1 });
  for (const x of [-8.4, -5.8, -3, -0.2, 2.6, 5.4, 8]) px.dot(sx + x, chY + 3.8 - Math.abs(x) * 0.12 + (x & 1), FURW, 4.4);
  for (const x of [-6, -3, 0, 3, 6]) px.dot(sx + x, chY + 5.4 + (x & 1), FURW, 4.4);

  // the axe arm: mail sleeve, fur cuff, fist on the haft (BACK: both arms hang at his sides, the axe upright in the fist)
  const ang = p.aN[0];
  if (s > 0) {
    const hd = [rs * 9 + sx, shY + 10 + s * ang * 1.6], el = [rs * 9.4 + sx, shY + 5];
    px.part(); px.tag("nearArm");
    px.capsule(sx + rs * 5.4, shY + 0.4, 2.4, el[0], el[1], 2.1, MAIL, 7.9, { cast: 1 });
    px.capsule(el[0], el[1], 2.1, hd[0], hd[1], 1.9, MAIL, 7.9, { cast: 1 });
    const cf = mix(el, hd, 0.7);
    px.capsule(cf[0], cf[1], 2.1, hd[0], hd[1], 2, FURW, 7.95, { cast: 1 });
    px.tag(null);
    daneAxe(px, K, hd, 19, 1.5, 8.1);
    px.part(); px.tag("nearHand");
    px.ellipse(hd[0], hd[1], 1.9, 2.2, SKIN, 8.3);
    px.tag(null);
  } else {
    const o = { sh: 5.8, el: 8, hx: 8.2, up: MAIL, cuff: FURW, w: [2.4, 2.1, 1.9] };
    const hd = backArms(px, K, o);
    daneAxe(px, K, [hd[0], hd[1] + 1], 19, 1.5, 1.0, undefined, true);
  }
  px.part();
  px.ellipse(sx + rs * 9, shY + 0.6, 4, 3.8, FURW, s > 0 ? 8 : 5, { cast: 1, edge: s < 0 });
  if (s < 0) px.ellipse(sx + ls * 9, shY + 0.6, 4, 3.8, FURW, 5, { cast: 1, edge: true });

  // the head
  px.part();
  if (s > 0) px.stamp(p.blink ? BLINK : FRONT_H, hx, hy, LEG, 6, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  else px.stamp(BACK_H, hx, hy, LEG, 6.4, { ax: 6, ay: 10, ball: [6.5, 5.5, 7, 7], cast: 1 });
  px.dot(hx + 5.8, hy - 9.2, BRASS, 6.7, { fix: 3 }); px.dot(hx - 5.8, hy - 9.2, BRASS, 6.7, { fix: 3 });
  return {};
};

const walk = { ...SIDE.walk };
export const BOX = { w: 72, h: 90, ox: 36, oy: 80 };
export const FRONT = { NAME: "huscarl-front", BOX, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "huscarl-back", BOX, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
