// ============ VIEWS: the Unhorsed Knight (and the Unseated Knight) seen from the FRONT and from BEHIND ============
// See fig-goblin-views.js / fig-levy-views.js (shared kit). Blued plate under a dagged oxblood surcoat, a sallet with its
// crest and a bevor, round pauldrons, a small scuffed heater on his LEFT arm (screen RIGHT in FRONT, screen LEFT from BEHIND:
// carried low and forward, top below the chin), the arming sword in his RIGHT hand (FRONT only: from behind the body hides it).
// BACK is the torn riding cape down the whole back (rip and ragged hem) under the sallet's tail: the read.
// Variant "gryphon" (the `unseated` PIX type): the darker cape of that house and the tawny feather in the sallet, both views.
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-unhorsed.js";
import { cl, TAU, base, dag, legsView } from "./fig-levy-views.js";

const SKIN = mat("#e0b088"), EYE = flat("#2a1c2c"), BROW = mat("#4a3426");
const IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), OX2 = mat("#6a2226", { contrast: 1.1 });
const LEATHER = mat("#5a3c28"), BRASS = mat("#c8a040", { contrast: 1.2 }), GREY = mat("#a8aeb8", { contrast: 1.2 }), FEATHER = mat("#b08850"), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 });
const GRIP = mat("#3a2418"), BLADE = mat("#dde2ea", { contrast: 1.35 });
const mk = (cape) => ({
  M: { m: IRON }, W: { m: IRON, bias: 1 }, m: { m: IRONK }, B: { m: IRON, bias: -1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  b: { m: BROW, fix: 1 }, E: { m: EYE }, e: { m: SKIN, fix: 0 },
});
const DOME = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMWWMMMMMMM.",
  "MMMWMMMMMMMMM",
  "MMMMMMMMMMMMM",
  "mmmmmmmmmmmmm",
];
const FRONT_H = [...DOME,
  ".MMsbbSbbsMM.",
  ".MMsSENESsMM.",
  ".mMsSSNSSsMm.",
  ".mMBBBBBBBMm.",
  "..mBBBBBBBm..",
  "...mBBBBBm...",
  "....mmmmm....",
];
const BACK_H = [...DOME,
  ".MMMMMmMMMMM.",
  "MMMMMMmMMMMMM",
  "MMMMMMmMMMMMM",
  ".mMMMMmMMMMm.",
  "..mMMMmMMMm..",
  "...mmmmmmm...",
  "....mmmmm....",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 7 ? r.replace(/E/g, "e") : r));

const make = (s) => (px, F, o = {}) => {
  const gry = o.variant === "gryphon", CAPE = gry ? OX2 : OX, LEG = mk();
  const B = base(F, s, 0.55), { sk, ph, p, rs, ls, sx, hipY, chestY, hy, hx, vy, vy2, vx, vx2, tilt } = B;
  const shY = sk.sN[1] + 0.5, c0 = chestY - 3, b0 = hipY, hemY = hipY + 6;
  const cb = cl(-vx * 1.6 - vx2 * 1.2, -2.6, 2.6);

  // ---- the torn riding cape, behind everything in FRONT (a little at his sides), over the back in BACK
  px.part(); const capeId = px._pid;
  if (s > 0) {
    px.poly([[sx - 5.6, c0], [sx + 5.6, c0], [sx + 7.4, c0 + 8], [sx + 7 + cb * 0.3, hipY + 6], [sx - 7 + cb * 0.3, hipY + 6.6], [sx - 7.4, c0 + 8]], CAPE, 0.5, { round: 0.8, cast: 1 });
  } else {
    const rag = [[sx + 6.8 + cb * 0.4, hipY + 8], ...dag(sx + 6.8 + cb * 0.4, sx - 7 + cb * 0.5, hipY + 9, 4, 0.8, 2.6)];
    px.poly([[sx - 5.4, c0], [sx + 5.4, c0], [sx + 7, c0 + 9], ...rag, [sx - 7.2, c0 + 9]], CAPE, 4.2, { round: 0.85, cast: 2 });
    px.toneLine(sx - 3.8, c0 + 2, sx - 4.4 + cb * 0.4, hipY + 8, -1, capeId);
    px.part(); px.line(sx + 1.6, hipY + 9, sx + 1.2 + cb * 0.4, hipY + 3.4, OXK, 4.25, { noLine: true });         // the rip
    px.line(sx + 1.2 + cb * 0.4, hipY + 3.4, sx + 3.2, hipY + 1.4, OXK, 4.25, { noLine: true });
    px.rect(sx - 5.6, c0 - 0.4, 11.2, 1.2, IRONK, 4.3, { noLine: true });                                        // the cape's clasp band at the neck
    px.dot(sx - 4.2, c0 + 0.2, BRASS, 4.32, { fix: 3 }); px.dot(sx + 4.2, c0 + 0.2, BRASS, 4.32, { fix: 3 });
  }

  // ---- the shield's back (BACK only): beyond his left side
  const sc = [ls * 9 + sx, chestY + 7.6], sw = 5.6;
  const S = (x, y) => [sc[0] + x, sc[1] + y];
  const heater = (k) => [S(-sw * k, -7 * k), S(sw * k, -7 * k), S((sw + 0.4) * k, 0.8 * k), S(0, 9 * k), S((-sw - 0.4) * k, 0.8 * k)];
  if (s < 0) {
    px.part(); const sid = px._pid;
    px.poly(heater(1), IRON, 3.2, { round: 0.6, cast: 2 });
    px.poly(heater(0.82), LEATHER, 3.22, { round: 0.7 });
    px.toneLine(...S(-2, -5.4), ...S(-1.8, 5.4), -1, sid);
    px.part(); px.line(...S(-4, -1.6), ...S(3.6, -1.6), IRONK, 3.3, { noLine: true }); px.line(...S(-3.6, 2.4), ...S(3.2, 2.4), IRONK, 3.3, { noLine: true });
  }

  legsView(px, B, {
    leg: IRON, boot: BOOT, thigh: [2.7, 2.2], spread: 3.1,
    extra: (px2, hp, kn, fx, fy, side, z) => {
      px2.part(); px2.ellipse(kn[0], kn[1], 2.5, 2.3, IRON, z + 0.04, { bias: side === rs ? 0 : -1, cast: 1 });
      if (s > 0) px2.dot(kn[0] + 0.2, kn[1] - 0.6, STEELB, z + 0.05, { fix: 4 });
      const g = [(kn[0] + fx) / 2, (kn[1] + fy) / 2 - 0.4];
      px2.line(g[0] - 1.8, g[1], g[0] + 1.8, g[1] + 0.2, IRONK, z + 0.04, { fix: 1 });
    },
  });

  // ---- the surcoat over the plate: belted, a dagged hem swinging a beat behind
  px.part(); const tab = px._pid;
  const teeth = [[hx + 5.8, hemY - 0.6], ...dag(hx + 5.8, hx - 5.8, hemY, 5, 0.4, 2)];
  if (s > 0) px.poly([[sx - 5, c0], [sx + 5, c0], [sx + 5.8, c0 + 4], [hx + 5.4, b0], ...teeth, [hx - 5.4, b0], [sx - 5.8, c0 + 4]], OX, 4, { round: 0.92, cast: 2 });
  else px.poly([[sx - 4.6, c0 + 6], [sx + 4.6, c0 + 6], [hx + 5.4, b0], ...teeth, [hx - 5.4, b0]], OX, 4.1, { round: 0.92, cast: 2 });
  px.toneLine(hx + 1.6, b0, hx + 1.4, hemY - 1.6, -1, tab);
  px.toneLine(hx - 2.4, b0, hx - 2.6, hemY - 1.6, 1, tab);
  px.line(hx - 5.2, hemY - 1.2, hx + 5.2, hemY - 1.2, BRASS, 4.14);
  px.part();
  px.poly([[hx - 5.2, b0 - 4.6], [hx + 5.2, b0 - 4.6], [hx + 5.3, b0 - 2.8], [hx - 5.3, b0 - 2.8]], LEATHER, 4.55, { round: 0.92 });
  px.part();
  if (s > 0) {
    px.rect(hx - 1, b0 - 4.6, 2, 2, BRASS, 4.56, { fix: 3 });
    px.poly([[sx - 5.4, c0 - 0.6], [sx + 5.4, c0 - 0.6], [sx + 5.8, c0 + 0.6], [sx - 5.8, c0 + 0.6]], IRON, 4.5, { round: 0.9, cast: 1 });                // the gorget
    px.line(sx - 5, c0 + 1.2, sx + 5, c0 + 1.2, IRONK, 4.52, { fix: 1 });
    px.rect(sx - 1, c0 + 4, 2.4, 3.4, GREY, 4.6, { fix: 3 }); px.dot(sx - 1, c0 + 3, GREY, 4.6, { fix: 3 }); px.dot(sx + 1.4, c0 + 3, GREY, 4.6, { fix: 3 });   // the tower on his breast
  } else {
    px.dot(hx + rs * 3.2, b0 - 3.6, BRASS, 4.57, { fix: 3 });
    px.poly([[sx - 5.4, c0 - 0.6], [sx + 5.4, c0 - 0.6], [sx + 5.8, c0 + 0.6], [sx - 5.8, c0 + 0.6]], IRON, 4.5, { round: 0.9, cast: 1 });
  }

  // ---- the pauldrons of blued plate
  for (const side of [ls, rs]) {
    px.part();
    const q = [side * 6.4 + sx, shY + 0.2];
    px.ellipse(q[0], q[1], 4.4, 3.8, IRON, 6.5, { cast: 1 });
    px.line(q[0] - 3.2, q[1] + 1.6, q[0] + 3.6, q[1] + 1.6, IRONK, 6.52, { fix: 1 });
    px.dot(q[0] - 0.6, q[1] - 1.6, STEELB, 6.54, { fix: 4 });
  }

  // ---- the arms
  const rEl = [rs * 8 + sx, shY + 7.2], hand = [rs * 6.4 + sx, shY + 7.6 + vy * 0.3 - (s > 0 ? 1 : 0)];
  px.part();
  px.capsule(rs * 6.2 + sx, shY + 1.2, 2.4, rEl[0], rEl[1], 2.1, IRON, 5, { cast: 2 });
  px.capsule(rEl[0], rEl[1], 2.1, hand[0], hand[1], 1.8, IRON, 5, { cast: 2 });
  
  const lEl = [ls * 8.4 + sx, shY + 8], lh = [ls * 8.4 + sx, shY + 11.2];
  px.part();
  px.capsule(ls * 6.2 + sx, shY + 1.2, 2.4, lEl[0], lEl[1], 2.1, IRON, s > 0 ? 5 : 3.5, { cast: 2, bias: -1 });
  px.capsule(lEl[0], lEl[1], 2.1, lh[0], lh[1], 1.8, IRON, s > 0 ? 5 : 3.5, { cast: 2, bias: -1 });

  // ---- the arming sword, FRONT only, upright before his right shoulder
  if (s > 0) {
    const gx = hand[0], gy = hand[1], tx = gx - 0.2, ty = gy - 27 + vy * 0.5;
    px.part(); px.tag("sword");
    px.capsule(gx, gy + 3, 1.0, gx, gy - 2.4, 1.0, GRIP, 7.2, { edge: true });
    px.ellipse(gx, gy + 3.4, 1.6, 1.2, BRASS, 7.22);
    px.capsule(gx - 3.8, gy - 3, 0.9, gx + 3.8, gy - 3, 0.9, STEELB, 7.24, { edge: true });
    px.poly([[gx - 1.4, gy - 3.4], [gx + 1.4, gy - 3.4], [tx + 1.1, ty + 3.6], [tx, ty], [tx - 1.1, ty + 3.6]], BLADE, 7.25, { n: [0.1, 0.1, 0.95] });
    px.line(gx, gy - 4.6, tx, ty + 3.6, IRON, 7.26, { fix: 1, noLine: true });
    px.tag(null);
  } else {
    // BACK: the sword is still in his right hand; its length runs forward, hidden behind his side and shoulder. Past his outline: the pommel under the fist and the crossguard's outer arm.
    px.part(); px.tag("sword");
    px.capsule(hand[0], hand[1] + 2.6, 1.0, hand[0], hand[1] - 1.4, 1.0, GRIP, 3.4, { edge: true });
    px.capsule(hand[0], hand[1] + 3.2, 1.6, hand[0], hand[1] + 3.8, 1.6, BRASS, 6.95);
    px.capsule(hand[0], hand[1] - 2.4, 0.9, hand[0] + rs * 3.8, hand[1] - 2.4 + 0.4, 0.9, STEELB, 5.6, { edge: true });
    px.tag(null);
  }
  // the fist closes round the grip (over it in FRONT, round the haft from behind)
  px.part(); px.ellipse(hand[0], hand[1], 2.0, 2.0, IRONK, 7.6);

    // ---- the crest and (the gryphon's rider) the feather, behind the head
  const tuft = cl(-vx * 1.4 - vx2 * 1.0, -2, 2), bob = cl(vy * 1.2 + vy2 * 0.8, -1.5, 1.5);
  px.part();
  px.poly([[hx - 2, hy - 11], [hx + 2, hy - 11], [hx + 2 + tuft * 0.2, hy - 14 - bob * 0.5], [hx + 0.6 + tuft * 0.8, hy - 16.6 - bob], [hx - 2.2 + tuft * 1.2, hy - 15 - bob * 0.7], [hx - 2.4, hy - 13]], CAPE, 5.4, { round: 0.8, cast: 1 });
  if (gry) {
    px.part();
    const fx0 = hx + ls * 2.6;
    px.poly([[fx0, hy - 10.6], [fx0 + 0.6 + tuft * 0.2, hy - 15], [fx0 + 1.4 + tuft * 0.5, hy - 19.4 - bob], [fx0 + 2.8 + tuft * 0.6, hy - 17.4], [fx0 + 2, hy - 13], [fx0 + 1.8, hy - 10.4]], FEATHER, 5.5, { round: 0.7 });
    px.line(fx0 + 0.8, hy - 11, fx0 + 1.6 + tuft * 0.5, hy - 18.4 - bob, OXK, 5.6, { noLine: true });
  }

  // ---- the head
  px.part();
  if (s > 0) px.stamp(p.blink ? blinkOf(FRONT_H) : FRONT_H, hx, hy, LEG, 6, { ax: 6, ay: 13, ball: [6.5, 6, 7, 7], cast: 1 });
  else px.stamp(BACK_H, hx, hy, LEG, 6.4, { ax: 6, ay: 13, ball: [6.5, 6, 7, 7], cast: 1 });
  px.dot(hx + 1, hy - 10.6, BRASS, 6.5, { fix: 3 });

  // ---- the heater, FRONT: small, scuffed, low and forward on his left arm, top below the chin
  if (s > 0) {
    px.part(); const sid = px._pid, z = 8.6;
    px.poly(heater(1), IRON, z, { round: 0.6, cast: 2 });
    px.poly(heater(0.82), OX, z + 0.02, { round: 0.7 });
    px.toneLine(...S(-1.8, -5.6), ...S(-1.6, 5.6), -1, sid);
    px.part();
    px.rect(...S(-sw * 0.82, -5.8), sw * 1.64, 2, BRASS, z + 0.1, { fix: 3, noLine: true });
    px.rect(...S(-2, -2.6), 4, 4.4, GREY, z + 0.3, { fix: 3 });
    px.dot(...S(-2, -3.6), GREY, z + 0.3, { fix: 3 }); px.dot(...S(0, -3.6), GREY, z + 0.3, { fix: 3 }); px.dot(...S(2, -3.6), GREY, z + 0.3, { fix: 3 });
    px.part(); px.ellipse(...S(0, 4), 1.3, 1.1, STEELB, z + 0.4, { cast: 1 });
    px.line(...S(1.6, -5), ...S(4.4, -1.4), OXK, z + 0.36, { noLine: true });                       // the dent
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "unhorsed-front", BOX: { w: 56, h: 84, ox: 28, oy: 80 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "unhorsed-back", BOX: { w: 56, h: 84, ox: 28, oy: 80 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
