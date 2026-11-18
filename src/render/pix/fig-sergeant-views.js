// ============ VIEWS: the Iron Knight-Sergeant seen from the FRONT and from BEHIND ============
// See fig-goblin-views.js / fig-levy-views.js (the shared kit). A barbute with a T cut (FRONT: the slot's eyes and
// nose bar; BACK: the plain dome with its ridge, brass studs), blued plate, a brass-edged gorget, the layered pauldrons,
// a dagged oxblood surcoat with the grey tower, a scarf trailing at his back. The heater shield rides his LEFT arm
// (screen RIGHT in FRONT, screen LEFT from BEHIND), carried LOW and forward beside the body, top below the chin.
// The longsword is in his RIGHT hand (screen left in FRONT): carried upright before the shoulder, shown in FRONT only;
// from BEHIND the body hides it (owner rule: no blade standing up beside the head).
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-sergeant.js";
import { cl, TAU, base, dag, legsView } from "./fig-levy-views.js";

const SKIN = mat("#e0b088"), EYE = flat("#c8d4e8"), LIP = flat("#a8685a");
const PLATE = mat("#646a78", { contrast: 1.3 }), PLATEK = mat("#3a3e4a", { contrast: 1.15 }), STEELB = mat("#c4c8d0", { contrast: 1.3 }), IRON = mat("#6c7280", { contrast: 1.25 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), PAD = mat("#6a604c"), LEATHER = mat("#5a3c28"), GRIP = mat("#3a2418"), WOOD = mat("#7a5a38"), WOODK = mat("#4e3820");
const BRASS = mat("#c8a040", { contrast: 1.2 }), HOSE = mat("#3c3e4a", { floor: 1 }), GREY = mat("#a8aeb8", { contrast: 1.2 }), BLADE = mat("#dde2ea", { contrast: 1.35 });
const LEG = {
  M: { m: PLATE }, W: { m: PLATE, bias: 1 }, m: { m: PLATEK }, K: { m: PLATEK, bias: 1 }, S: { m: SKIN }, s: { m: SKIN, bias: -1 }, N: { m: SKIN, bias: 1 },
  E: { m: EYE }, e: { m: SKIN, fix: 0 }, l: { m: LIP }, z: { m: SKIN, fix: 0 },
};
const DOME = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMWWMMMMMMM.",
  "MMWMMMMMMMMMM",
  "MMMMMMMMMMMMM",
  "MMMMMMMMMMMMM",
];
const FRONT_H = [...DOME,
  "MMMmESSSEmMMM",
  "MMMMmSNSmMMMM",
  "MMMMmSSSmMMMM",
  "MMMMmzSzmMMMM",
  "MMMMmlllmMMMM",
  "MMMMMmmmMMMMM",
  "KKKKKKKKKKKKK",
  ".mmmmmmmmmmm.",
];
const BACK_H = [...DOME,
  "MMMMMMKMMMMMM",
  "MMMMMMKMMMMMM",
  "MMMMMMKMMMMMM",
  "MMMMMMKMMMMMM",
  "MMMMMMKMMMMMM",
  "MMMMMMKMMMMMM",
  "KKKKKKKKKKKKK",
  ".mmmmmmmmmmm.",
];
const blinkOf = (rows) => rows.map((r, i) => (i === 6 ? r.replace(/E/g, "e") : r));

const make = (s) => (px, F, o = {}) => {
  const B = base(F, s, 0.55), { sk, ph, p, rs, ls, sx, hipY, chestY, hy, hx, vy, vx, vx2, tilt } = B;
  const shY = sk.sN[1] + 0.5, c0 = chestY - 3, b0 = hipY, hemY = hipY + 6.4;

  // ---- the scarf: knotted at the neck, trailing down his back (BACK: down the middle; FRONT: a knot at the throat)
  const sw = cl(-vx * 1.6 - vx2 * 1.0, -2.4, 2.4);
  if (s < 0) {
    px.part();
    px.poly([[sx - 2.4, c0 + 0.4], [sx + 2.4, c0 + 0.4], [sx + 3 + sw * 0.5, c0 + 8], [sx + 2.6 + sw, c0 + 13.4], [sx + 0.4 + sw * 1.2, c0 + 11.4], [sx - 1.6 + sw, c0 + 14], [sx - 3 + sw * 0.6, c0 + 8]], OX, 4.9, { round: 0.6, cast: 1 });
  }

  // ---- the shield's back, BACK view only (beyond his left side, behind the body)
  const sh = [ls * 9.2 + sx, chestY + 8.2], hw = 7.0;
  const heater = (cx, cy, k) => [[cx - hw * k, cy - 9 * k], [cx + hw * k, cy - 9 * k], [cx + hw * k, cy + 0.4 * k], [cx + hw * 0.55 * k, cy + 6 * k], [cx, cy + 10 * k], [cx - hw * 0.55 * k, cy + 6 * k], [cx - hw * k, cy + 0.4 * k]];
  if (s < 0) {
    px.part(); const hid = px._pid;
    px.poly(heater(sh[0] - 0.6, sh[1], 1), IRON, 3.2, { round: 0.7 });
    px.poly(heater(sh[0] - 0.6, sh[1], 0.84), WOOD, 3.22, { round: 0.8 });
    px.toneLine(sh[0] - 3, sh[1] - 7, sh[0] - 3, sh[1] + 5, -1, hid);
    px.part();
    px.line(sh[0] - 5.6, sh[1] - 2.4, sh[0] + 4.4, sh[1] - 2.4, LEATHER, 3.3, { noLine: true });
    px.line(sh[0] - 5.2, sh[1] + 2, sh[0] + 4, sh[1] + 2, LEATHER, 3.3, { noLine: true });
    px.line(sh[0] - 0.8, sh[1] - 7.4, sh[0] - 0.8, sh[1] + 8, WOODK, 3.28, { noLine: true });
  }

  legsView(px, B, {
    leg: HOSE, boot: PLATEK, thigh: [2.6, 2.3], spread: 3.3,
    extra: (px2, hp, kn, fx, fy, side, z, lift) => {
      const bs = side === rs ? 0 : -1;
      px2.capsule(hp[0] * 0.7 + kn[0] * 0.3, hp[1] * 0.7 + kn[1] * 0.3, 2.9, hp[0] * 0.3 + kn[0] * 0.7, hp[1] * 0.3 + kn[1] * 0.7, 2.7, PLATE, z + 0.01, { bias: bs });   // the cuisse
      px2.capsule(kn[0], kn[1] + 0.8, 2.4, fx, fy - 2.4, 2.1, PLATE, z + 0.02, { bias: bs });                                                                            // the greave
      px2.part(); px2.ellipse(kn[0], kn[1] + (s > 0 ? 0 : 0.2), 2.5, 2.2, PLATE, z + 0.04, { bias: bs, cast: 1 });                                                       // the poleyn
      if (s > 0) px2.dot(kn[0], kn[1] - 0.4, STEELB, z + 0.05, { fix: 4 });
    },
  });

  // ---- the breastplate (BACK: backplate, a ridge down it) over padding, the tassets, the dagged surcoat
  px.part(); const cu = px._pid;
  px.poly([[sx - 5.8, c0], [sx + 5.8, c0], [sx + 6.4, c0 + 4], [hx + 5.4, b0], [hx + 5.6, b0 + 3], [hx - 5.6, b0 + 3], [hx - 5.4, b0], [sx - 6.4, c0 + 4]], PLATE, 4, { round: 0.92, cast: 2 });
  px.toneLine(sx - 3.4, c0 + 1, hx - 3.4, b0 + 1, -1, cu);
  px.part(); const sc = px._pid;
  const hemTop = [[hx + 5.6, hemY - 0.6], ...dag(hx + 5.6, hx - 5.6, hemY, 5, 0.4, 2)];
  if (s > 0) px.poly([[sx - 4.4, c0 + 3], [sx + 4.4, c0 + 3], [hx + 5.2, b0], ...hemTop, [hx - 5.2, b0]], OX, 4.02, { round: 0.92, cast: 2 });
  else px.poly([[sx - 5.4, c0 + 4.4], [sx + 5.4, c0 + 4.4], [hx + 5.6, b0], ...hemTop, [hx - 5.6, b0]], OX, 4.02, { round: 0.92, cast: 2 });
  px.toneLine(hx + 1.6, b0, hx + 1.4, hemY - 1.6, -1, sc);
  px.toneLine(hx - 2.2, b0, hx - 2.4, hemY - 1.6, 1, sc);
  px.line(hx - 5.2, hemY - 1.2, hx + 5.2, hemY - 1.2, BRASS, 4.04);
  px.part();
  if (s > 0) {
    px.poly([[sx - 5.4, c0 + 0.2], [sx + 5.4, c0 + 0.2], [sx + 5.8, c0 + 3.4], [sx + 2, c0 + 3], [sx - 2, c0 + 3], [sx - 5.8, c0 + 3.4]], PLATE, 4.06, { round: 0.9, cast: 1 });
    px.line(sx, c0 + 0.4, sx, c0 + 3, STEELB, 4.08, { noLine: true });
    px.part(); px.rect(sx - 2.4, c0 + 5.2, 4.8, 4.4, GREY, 4.1, { fix: 3 });                            // the tower on his chest
    px.dot(sx - 2.4, c0 + 4.2, GREY, 4.1, { fix: 3 }); px.dot(sx - 0.4, c0 + 4.2, GREY, 4.1, { fix: 3 }); px.dot(sx + 1.6, c0 + 4.2, GREY, 4.1, { fix: 3 });
    px.rect(sx - 0.4, c0 + 7.8, 1.4, 1.8, OXK, 4.12, { noLine: true });
  } else {
    px.line(sx, c0 + 0.6, hx, b0 - 3, STEELB, 4.08, { noLine: true });                                  // the backplate's ridge
    px.line(sx - 4.6, c0 + 3.4, sx + 4.8, c0 + 3.4, PLATEK, 4.08, { noLine: true });                    // the plate's lower edge
  }
  // the belt: a buckle in FRONT, a sword-hanger ring and pouch BEHIND
  px.part();
  px.poly([[hx - 5.8, b0 - 4.8], [hx + 5.8, b0 - 4.8], [hx + 5.9, b0 - 2.8], [hx - 5.9, b0 - 2.8]], LEATHER, 4.15, { round: 0.92 });
  if (s > 0) px.rect(hx - 1.1, b0 - 4.8, 2.2, 2.2, BRASS, 4.16, { fix: 3 });
  else { px.dot(hx + rs * 3.4, b0 - 3.8, BRASS, 4.17, { fix: 3 }); px.part(); px.rect(hx + ls * 3.6 - 1.5, b0 - 2.6, 3, 3.4, LEATHER, 4.2, { cast: 1 }); px.dot(hx + ls * 3.6, b0 - 1.8, BRASS, 4.21, { fix: 3 }); }
  // the gorget, brass edged
  px.part();
  px.poly([[sx - 5, c0 - 1.4], [sx + 5, c0 - 1.4], [sx + 5.8, c0 + 1.4], [sx - 5.8, c0 + 1.6]], PLATE, 5, { round: 0.9, cast: 1 });
  px.line(sx - 5.4, c0 + 1.4, sx + 5.4, c0 + 1.4, BRASS, 5.05, { noLine: true });

  // ---- the pauldrons: layered and riveted on the sword arm (his right, screen side rs), plainer on the left
  for (const [side, big] of [[ls, 0], [rs, 1]]) {
    px.part();
    const sc2 = [side * 6.4 + sx, shY + 0.4];
    px.ellipse(sc2[0], sc2[1], 4.6, 3.8, PLATE, 6.5, { cast: 1 });
    if (big) { px.ellipse(sc2[0], sc2[1] + 2.2, 3.7, 2.8, PLATE, 6.52, { cast: 1 }); px.line(sc2[0] - 3.8, sc2[1] + 1.8, sc2[0] + 3.8, sc2[1] + 1.8, BRASS, 6.55, { noLine: true }); }
    px.dot(sc2[0] - 1, sc2[1] - 1.4, STEELB, 6.56, { fix: 4 }); px.dot(sc2[0] + 1.6, sc2[1] - 0.6, STEELB, 6.56, { fix: 4 });
  }

  // ---- the arms: plate vambraces over padded sleeves; the sword hand in FRONT
  const rEl = [rs * 8 + sx, shY + 7.2], hdY = shY + 8.2 + vy * 0.3, hand = [rs * 6.4 + sx, hdY - (s > 0 ? 1.2 : 0)];
  px.part();
  px.capsule(rs * 6.2 + sx, shY + 1.2, 2.5, rEl[0], rEl[1], 2.3, PAD, 5, { cast: 2 });
  px.capsule(rEl[0], rEl[1], 2.3, hand[0], hand[1], 2.0, PLATE, 5, { cast: 2 });
  px.ellipse(rEl[0], rEl[1], 2.2, 2.2, PLATE, 5.05, { cast: 1 });
  
  const lEl = [ls * 8.6 + sx, shY + 8], lh = [ls * 8.6 + sx, shY + 11.6];
  px.part();
  px.capsule(ls * 6.2 + sx, shY + 1.2, 2.5, lEl[0], lEl[1], 2.3, PAD, s > 0 ? 5 : 3.5, { cast: 2, bias: -1 });
  px.capsule(lEl[0], lEl[1], 2.3, lh[0], lh[1], 2.0, PLATE, s > 0 ? 5 : 3.5, { cast: 2, bias: -1 });

  // ---- the longsword, FRONT only: the blade stands up before his right shoulder, the point toward us a little
  if (s > 0) {
    const gx = hand[0], gy = hand[1], top = [gx - rs * 0.4 + 0 - 0.4, gy - 32 + vy * 0.5];
    px.part(); px.tag("sword");
    px.capsule(gx, gy + 3.2, 1.0, gx, gy - 2.6, 1.0, GRIP, 7.2, { edge: true });
    px.ellipse(gx, gy + 3.6, 1.7, 1.2, BRASS, 7.22);
    px.capsule(gx - 4.2, gy - 3.2, 0.9, gx + 4.2, gy - 3.2, 0.9, STEELB, 7.24, { edge: true });                // the crossguard
    px.poly([[gx - 1.5, gy - 3.6], [gx + 1.5, gy - 3.6], [top[0] + 1.2, top[1] + 4], [top[0], top[1]], [top[0] - 1.2, top[1] + 4]], BLADE, 7.25, { n: [0.1, 0.1, 0.95] });
    px.line(gx, gy - 5, top[0], top[1] + 4, IRON, 7.26, { fix: 1, noLine: true });
    px.tag(null);
  } else {
    // BACK: the sword is still in his right hand; its length runs forward, hidden behind his side and shoulder. Past his outline: the pommel under the fist and the crossguard's outer arm.
    px.part(); px.tag("sword");
    px.capsule(hand[0], hand[1] + 2.6, 1.0, hand[0], hand[1] - 1.4, 1.0, GRIP, 3.4, { edge: true });
    px.capsule(hand[0], hand[1] + 3.2, 1.6, hand[0], hand[1] + 3.8, 1.6, BRASS, 6.95);
    px.capsule(hand[0], hand[1] - 2.4, 0.9, hand[0] + rs * 4.2, hand[1] - 2.4 + 0.4, 0.9, STEELB, 5.6, { edge: true });
    px.tag(null);
  }
  // the fist closes round the grip (over it in FRONT, round the haft from behind)
  px.part(); px.ellipse(hand[0], hand[1], 2.0, 2.0, PLATEK, 7.6);

    // ---- the head: the barbute (BACK: the dome and its ridge, brass studs)
  px.part();
  if (s > 0) px.stamp(p.blink ? blinkOf(FRONT_H) : FRONT_H, hx, hy, LEG, 6, { ax: 6, ay: 14, ball: [6.5, 6, 7, 8], cast: 1 });
  else px.stamp(BACK_H, hx, hy, LEG, 6.4, { ax: 6, ay: 14, ball: [6.5, 6, 7, 8], cast: 1 });
  px.dot(hx - 3, hy - 8.2, BRASS, 6.6, { fix: 3 }); px.dot(hx + 3, hy - 8.2, BRASS, 6.6, { fix: 3 });

  // ---- the heater, FRONT: low and forward on his left arm, the top below his chin; oxblood field, brass chief, the tower
  if (s > 0) {
    const cx = sh[0], cy = sh[1] + 0.6, z = 8.6;
    px.part(); const hid = px._pid;
    px.poly(heater(cx, cy, 1), IRON, z, { round: 0.7 });
    px.poly(heater(cx, cy, 0.84), OX, z + 0.02, { round: 0.8 });
    px.toneLine(cx - 2.4, cy - 7, cx - 2.4, cy + 6, -1, hid);
    px.rect(cx - hw * 0.84, cy - 7.6, hw * 1.68, 2.4, BRASS, z + 0.04, { fix: 3, noLine: true });
    px.part();
    px.rect(cx - 2.6, cy - 3.4, 5.2, 5.6, GREY, z + 0.3, { fix: 3 });
    px.dot(cx - 2.6, cy - 4.4, GREY, z + 0.3, { fix: 3 }); px.dot(cx - 0.6, cy - 4.4, GREY, z + 0.3, { fix: 3 }); px.dot(cx + 1.4, cy - 4.4, GREY, z + 0.3, { fix: 3 });
    px.rect(cx - 0.6, cy - 0.2, 1.2, 2.4, OXK, z + 0.32, { noLine: true });
    px.part(); px.ellipse(cx, cy + 4.2, 1.5, 1.3, STEELB, z + 0.4, { cast: 1 });
    for (const [dx, dy] of [[-5.4, -4], [5.2, -4], [-4.6, 1.4], [4.4, 1.4], [-2.6, 5.6], [2.4, 5.6]]) px.dot(cx + dx, cy + dy, STEELB, z + 0.4, { fix: 4 });
    px.line(cx + 2, cy - 6.4, cx + 5, cy - 1.6, OXK, z + 0.36, { noLine: true });
    px.line(cx - 5, cy + 0.8, cx - 3, cy + 3, GREY, z + 0.36, { noLine: true, fix: 2 });
  }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "sergeant-front", BOX: { w: 60, h: 80, ox: 30, oy: 74 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "sergeant-back", BOX: { w: 60, h: 80, ox: 30, oy: 74 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
