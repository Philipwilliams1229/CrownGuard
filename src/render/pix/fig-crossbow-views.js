// ============ VIEWS: the Iron crossbowman seen from the FRONT and from BEHIND ============
// See fig-goblin-views.js / fig-levy-views.js (whose kit this shares). Kettle over an oxblood hood, a quilted
// gambeson, the bolt box on his back hip, and the steel-pronged arbalest: carried at the ready across the chest,
// stock down to the trigger hand at his right hip (screen LEFT in FRONT), the prod's two prongs spread wide.
// FRONT: the prod crosses the chest BELOW the chin (never over the face), the bolt's head pointing at us.
// BACK: the arbalest is in front of him: only the prod's two ends show past the body, and the bolt box with its
// fletchings is the read (plus the hood's back and the hat).
import { mat, flat } from "./pix.js";
import { CLIPS as SIDE, BONES as SIDE_BONES } from "./fig-crossbow.js";
import { cl, TAU, base, dag, legsView, HAT, FRONT_H, BACK_H, blinkOf, LEG as LLEG } from "./fig-levy-views.js";

const IRON = mat("#6c7280", { contrast: 1.25 }), IRONK = mat("#3c4048", { contrast: 1.1 }), STEELB = mat("#c4c8d0", { contrast: 1.3 });
const OX = mat("#7a2a2c", { contrast: 1.1 }), OXK = mat("#561c20"), PAD = mat("#a8966e"), PADK = mat("#7e6e4c"), LEATHER = mat("#5a3c28"), WOOD = mat("#7a5a38"), WOODK = mat("#4e3820");
const BRASS = mat("#c8a040", { contrast: 1.2 }), HOSE = mat("#4a4c58", { floor: 1 }), BOOT = mat("#2a2a30", { contrast: 1.2, floor: 1 }), GREY = mat("#a8aeb8", { contrast: 1.2 });
const CORD = flat("#e8e0c4"), FLETCH = flat("#f0ead8"), BOLT = mat("#8a6a40");
const LEG = { ...LLEG, c: { m: OX } };
const dropTuft = (rows) => rows;   // no crest on his kettle

const make = (s) => (px, F, o = {}) => {
  const B = base(F, s, 0.8), { sk, ph, p, rs, ls, sx, hipY, chestY, hy, hx, vy, vy2, vx, vx2, tilt } = B;
  const shY = sk.sN[1] + 0.4, c0 = chestY - 3, b0 = hipY, hemY = hipY + 6;
  const bw = Math.sin(ph * TAU * 2) * 0.3;

  // ---- BACK: the arbalest's two prongs show past his sides, nothing else of it
  if (s < 0) {
    for (const side of [-1, 1]) {
      px.part();
      px.capsule(hx + side * 4.6, chestY + 2.2, 1.1, hx + side * 9.4, chestY + 0.2 + bw, 0.8, IRON, 3.3, { edge: true });
      px.dot(hx + side * 9.4, chestY + 0.2 + bw, STEELB, 3.4, { fix: 3 });
    }
  }
  // the bolt box on his back hip, fletchings standing out of it
  if (s < 0) {
    const bx = hx + rs * 2.2, by = hipY - 0.4;
    px.part();
    px.poly([[bx - 2.8, by - 3], [bx + 2.8, by - 3], [bx + 3.2, by + 3.6], [bx - 3.2, by + 3.6]], LEATHER, 4.3, { round: 0.8, cast: 1 });
    px.rect(bx - 2.8, by - 0.6, 5.6, 0.9, BRASS, 4.32, { noLine: true });
    px.part();
    for (const [dx, h] of [[-1.9, 3.4], [-0.5, 4.8], [0.9, 3.8], [2.2, 4.4]]) { px.line(bx + dx, by - 3, bx + dx - vx * 0.3, by - 3 - h, BOLT, 4.25, { noLine: true }); px.dot(bx + dx - vx * 0.3, by - 3 - h, FLETCH, 4.26, { fix: 3 }); px.dot(bx + dx - vx * 0.3 + 1, by - 3 - h + 1, FLETCH, 4.26, { fix: 3 }); }
  }

  legsView(px, B, { leg: HOSE, boot: BOOT, thigh: [2.3, 1.9], cuff: LEATHER });

  // ---- the gambeson: quilted padding to the hip, a dagged skirt, rows of stitching
  px.part(); const jk = px._pid;
  px.poly([[sx - 5.2, c0], [sx + 5.2, c0], [sx + 5.8, c0 + 4], [hx + 5.2, b0], [hx + 5.4, hemY - 0.4], ...dag(hx + 5.4, hx - 5.4, hemY, 5), [hx - 5.2, b0], [sx - 5.8, c0 + 4]], PAD, 4, { round: 0.92, cast: 2 });
  px.toneLine(sx - 3.4, c0 + 2, hx - 3.4, hemY - 2, -1, jk);
  for (let i = 0; i < 4; i++) { const y = c0 + 2.4 + i * 2.6; px.line(sx - 4, y, sx + 4, y, PADK, 4.04, { noLine: true }); }
  px.line(hx - 4.6, hemY - 1.8, hx + 4.6, hemY - 1.8, PADK, 4.04, { noLine: true });
  px.part();
  px.poly([[hx - 5.4, b0 - 4.4], [hx + 5.4, b0 - 4.4], [hx + 5.5, b0 - 2.6], [hx - 5.5, b0 - 2.6]], LEATHER, 4.05, { round: 0.92 });
  px.part();
  if (s > 0) {
    px.rect(hx - 1, b0 - 4.4, 2, 2, BRASS, 4.06, { fix: 3 });
    px.rect(sx + ls * 2.2 - 1, c0 + 4.6, 2, 3, GREY, 4.1, { fix: 3 }); px.dot(sx + ls * 2.2 - 1, c0 + 3.6, GREY, 4.1, { fix: 3 }); px.dot(sx + ls * 2.2, c0 + 3.6, GREY, 4.1, { fix: 3 });   // the tower on the breast
    px.rect(hx + ls * 3.4 - 1.4, b0 - 2.6, 2.8, 3.4, LEATHER, 4.1, { cast: 1 }); px.dot(hx + ls * 3.4, b0 - 2, BRASS, 4.11, { fix: 3 });   // the pouch on his left hip
    px.line(hx + rs * 3.2, b0 - 2.4, hx + rs * 3.4, b0 + 3.4, IRON, 4.1, { noLine: true }); px.dot(hx + rs * 3.2, b0 - 2.6, BRASS, 4.12, { fix: 3 });   // the dagger
  } else {
    px.toneLine(sx, c0 + 1, hx, b0 - 4.4, -1, jk);
    px.rect(sx + ls * 2.6 - 1.3, c0 + 5.6, 2.6, 2.6, OXK, 4.08, { fix: 1, noLine: true });          // the mend patch
  }
  // the hood falls on the shoulders over the collar
  px.part();
  px.poly([[sx - 5.6, c0 - 0.4], [sx + 5.6, c0 - 0.4], [sx + 6.2, c0 + 2.2], [sx + (s > 0 ? 1.4 : 0), c0 + (s > 0 ? 3.6 : 3.2)], [sx - 6.2, c0 + 2.2]], OX, 5, { round: 0.9, cast: 1 });

  // ---- the arms and the arbalest (FRONT)
  const sh = (side) => [side * 5.4 + sx, shY + 0.6];
  const rEl = [rs * 7.6 + sx, shY + 7.4], lEl = [ls * 7.6 + sx, shY + 6.2];
  if (s > 0) {
    // trigger hand at his right hip-chest, fore hand up under the tiller near the nose
    const rh = [rs * 3.4 + sx, shY + 10.6 + vy * 0.3];
    const nose = [hx + ls * 0.8, shY + 3.4], butt = [hx + rs * 4.6, hipY - 1.6];
    const lh = [nose[0] + (rh[0] - nose[0]) * 0.42, nose[1] + (rh[1] - nose[1]) * 0.42 + 0.4];   // the fore hand closes round the tiller
    px.part(); px.tag("stock");
    px.capsule(butt[0], butt[1], 1.9, rh[0] + 0.4, rh[1] + 0.4, 1.6, WOOD, 6.5, { edge: true });
    px.capsule(rh[0] + 0.4, rh[1] + 0.4, 1.7, nose[0], nose[1], 1.9, WOOD, 6.5, { edge: true });
    px.capsule(hx + (nose[0] - hx) * 0.3 + (rh[0] - hx) * 0.1 + 0.2, nose[1] + 4.6, 1.4, hx + (nose[0] - hx) * 0.3 + (rh[0] - hx) * 0.1 + 0.2, nose[1] + 6.4, 1.4, IRON, 6.53);   // the band
    px.part(); px.tag("prod");
    // the prod, a bowed steel lath across the nose: ends bowed back toward him and down
    const e0 = [nose[0] - 9.6, nose[1] - 0.6], e1 = [nose[0] + 9.6, nose[1] - 0.6], mid0 = [nose[0] - 4.8, nose[1] + 1.2], mid1 = [nose[0] + 4.8, nose[1] + 1.2];
    px.capsule(nose[0], nose[1] + 0.4, 1.9, mid0[0], mid0[1], 1.6, IRON, 6.6, { edge: true }); px.capsule(mid0[0], mid0[1], 1.6, e0[0], e0[1], 1.0, IRON, 6.6, { edge: true });
    px.capsule(nose[0], nose[1] + 0.4, 1.9, mid1[0], mid1[1], 1.6, IRON, 6.6, { edge: true }); px.capsule(mid1[0], mid1[1], 1.6, e1[0], e1[1], 1.0, IRON, 6.6, { edge: true });
    px.dot(e0[0], e0[1], STEELB, 6.7, { fix: 3 }); px.dot(e1[0], e1[1], STEELB, 6.7, { fix: 3 });
    px.part(); px.ellipse(nose[0], nose[1] + 0.6, 1.5, 1.8, IRONK, 6.62, { noLine: true });                                         // the stirrup ring
    px.tag("string"); px.part();
    const nut = [nose[0], nose[1] + 6.6];
    px.line(e0[0], e0[1], e1[0], e1[1], CORD, 6.7, { unlit: true }); px.line(nose[0], nose[1] - 0.6, nut[0], nut[1] - 2.4, CORD, 6.7, { unlit: true });
    px.tag("bolt"); px.part();
    px.dot(nose[0], nose[1] - 2.4, STEELB, 6.75, { fix: 4 }); px.dot(nose[0], nose[1] - 1.2, BOLT, 6.74, { fix: 2 }); px.dot(nose[0], nose[1] - 0.2, BOLT, 6.74, { fix: 2 });                // the bolt's head pointing at us
    px.tag(null);
    // the far (left) arm up to the tiller, the near (right) to the grip
    px.part(); px.tag("farHand");
    px.capsule(...sh(ls), 2.0, lEl[0], lEl[1] + 1.4, 2.0, PAD, 6.2, { cast: 1 });
    px.capsule(lEl[0], lEl[1] + 1.4, 1.9, lh[0], lh[1] + 0.8, 1.7, PAD, 6.2, { cast: 1 });
    px.part(); px.ellipse(lh[0], lh[1], 2.0, 1.8, LEATHER, 7);
    px.part(); px.tag("nearArm");
    px.capsule(...sh(rs), 2.1, rEl[0], rEl[1] + 1.2, 2.0, PAD, 6.2, { cast: 1 });
    px.capsule(rEl[0], rEl[1] + 1.2, 1.9, rh[0], rh[1] - 0.4, 1.7, PAD, 6.2, { cast: 1 });
    px.capsule(rEl[0] * 0.3 + rh[0] * 0.7, rEl[1] * 0.3 + rh[1] * 0.7, 1.8, rh[0], rh[1] - 0.2, 1.8, LEATHER, 6.95);
    px.part(); px.tag("nearHand"); px.ellipse(rh[0], rh[1], 1.8, 1.8, LEATHER, 7.1);
    px.tag(null);
  } else {
    // from behind both arms reach forward round him: the sleeves show, the hands are hidden by the sides
    for (const side of [rs, ls]) {
      px.part();
      px.capsule(...sh(side), 2.2, side * 7.6 + sx, shY + 7.6, 2.1, PAD, 4.6, { cast: 1 });
      px.capsule(side * 7.6 + sx, shY + 7.6, 2.0, side * 7.6 + sx, shY + 11.2 + (side === rs ? bw : -bw), 1.8, PAD, 4.6, { cast: 1 });
      px.part(); px.ellipse(side * 7.6 + sx, shY + 12.2 + (side === rs ? bw : -bw), 1.7, 1.7, LEATHER, 4.65);
    }
  }

  // ---- the head: the kettle over the hood
  px.part();
  if (s > 0) px.stamp(p.blink ? blinkOf(FRONT_H) : FRONT_H, hx, hy, LEG, 6, { ax: 6, ay: 12, ball: [6.5, 6, 7, 7], cast: 1 });
  else px.stamp(BACK_H, hx, hy, LEG, 6.4, { ax: 6, ay: 12, ball: [6.5, 6, 7, 7], cast: 1 });
  px.dot(hx + 1, hy - 10.4, BRASS, 6.5, { fix: 3 });
  if (s > 0) px.dot(hx + 3, hy - 8.4, STEELB, 6.5, { fix: 4 }); else { px.dot(hx - 3, hy - 8.4, STEELB, 6.5, { fix: 4 }); px.dot(hx + 3, hy - 8.4, STEELB, 6.5, { fix: 4 }); }
  return {};
};

const walk = { ...SIDE.walk };
export const FRONT = { NAME: "crossbow-front", BOX: { w: 52, h: 80, ox: 26, oy: 74 }, BONES: SIDE_BONES, draw: make(1), CLIPS: { walk } };
export const BACK = { NAME: "crossbow-back", BOX: { w: 52, h: 80, ox: 26, oy: 74 }, BONES: SIDE_BONES, draw: make(-1), CLIPS: { walk } };
