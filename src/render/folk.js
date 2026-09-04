// ============ FOLK ============
// The little people of the kingdom, as one shared body: a slim, rounded
// figure about 22 world pixels tall, drawn from the feet up in lit, soft
// forms — no outlines. Tower crews stand on this rig now; the soldiers and
// the horde will stand on it next.
//
// Every figure faces +x in its own space and is mirrored by `dir`. A
// palette names the visible materials: skin, hood, coat, boots, trim.

import { lighten, darken, rgba, soft, shadow, ball, roundRect, cylinder } from "./paint.js";

// A rounded limb between two points.
const limb = (ctx, x0, y0, x1, y1, w, col) => {
  const g = ctx.createLinearGradient(x0 - w, y0, x0 + w, y0);
  g.addColorStop(0, lighten(col, 0.3));
  g.addColorStop(0.5, col);
  g.addColorStop(1, darken(col, 0.45));
  ctx.strokeStyle = g;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
};

const head = (ctx, x, y, pal, o = {}) => {
  ball(ctx, x, y, 3.3, 3.5, pal.skin, { hi: 0.45, lo: 0.4 });
  // a hood or cap, sitting over the crown and hanging down the back
  if (o.hood !== false) {
    ball(ctx, x - 0.4, y - 1.4, 3.7, 2.6, pal.hood, { hi: 0.45, lo: 0.45 });
    ball(ctx, x - 2.2, y + 0.6, 2.2, 3.2, pal.hood, { hi: 0.3, lo: 0.5 });
  }
  // the eye that faces us
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(x + 1.6, y + 0.2, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
};

// Torso: a coat with a belt.
const torso = (ctx, x, top, h, w, pal) => {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, lighten(pal.coat, 0.32));
  g.addColorStop(0.45, pal.coat);
  g.addColorStop(1, darken(pal.coat, 0.5));
  roundRect(ctx, x - w / 2, top, w, h, w * 0.4);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = rgba(darken(pal.trim || pal.boots, 0.2), 0.9);
  ctx.fillRect(x - w / 2 + 0.5, top + h * 0.62, w - 1, 1.4);
};

const legs = (ctx, x, y, pal, stride = 0) => {
  limb(ctx, x - 1.6 - stride, y - 7.5, x - 1.9 - stride * 1.5, y - 0.5, 2.6, pal.boots);
  limb(ctx, x + 1.4 + stride, y - 7.5, x + 1.7 + stride * 1.5, y - 0.5, 2.6, darken(pal.boots, 0.15));
};

// ---- poses ---------------------------------------------------------------

// An archer at the string. `draw` runs 0..1: loosed to full draw.
export const drawArcher = (ctx, x, y, dir, pal, draw = 1, o = {}) => {
  const big = !!o.big;
  const s = big ? 1.15 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.6);
  torso(ctx, 0, -17, 10, 7.5, pal);
  // a quiver over the back shoulder
  cylinder(ctx, -4.6, -19, 2.4, 8, darken(pal.coat, 0.35), { r: 1, hi: 0.3, lo: 0.5 });
  ctx.fillStyle = "#d8ccb0";
  for (let i = 0; i < 3; i++) ctx.fillRect(-4.6 + i * 0.9, -21.5 - (i % 2) * 0.8, 0.7, 2.4);
  head(ctx, 0.4, -20.5, pal);
  // the bow, held out at arm's length
  const bx = 7, by = -15;
  const half = big ? 9 : 7, belly = big ? 4.2 : 3.2;
  const bowCol = o.bowCol || "#4a3018";
  const bg = ctx.createLinearGradient(bx, by - half, bx + belly, by + half);
  bg.addColorStop(0, lighten(bowCol, 0.35)); bg.addColorStop(0.5, bowCol); bg.addColorStop(1, darken(bowCol, 0.3));
  ctx.strokeStyle = bg;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 0.5, by - half);
  ctx.quadraticCurveTo(bx + belly * 2, by, bx - 0.5, by + half);
  ctx.stroke();
  // the string, hauled into a V at full draw
  const pull = draw * (big ? 6.5 : 5);
  ctx.strokeStyle = "rgba(240,232,210,0.95)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(bx - 0.5, by - half);
  ctx.lineTo(bx - pull, by);
  ctx.lineTo(bx - 0.5, by + half);
  ctx.stroke();
  // the nocked arrow
  if (draw > 0.4) {
    const len = big ? 12 : 9.5;
    ctx.strokeStyle = "#c4c8d0";
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(bx - pull, by); ctx.lineTo(bx - pull + len, by); ctx.stroke();
    ctx.fillStyle = bowCol === "#4a3018" ? "#a04a3f" : bowCol;
    ctx.beginPath(); ctx.moveTo(bx - pull, by - 1.4); ctx.lineTo(bx - pull + 2.2, by); ctx.lineTo(bx - pull, by + 1.4); ctx.closePath(); ctx.fill();
  }
  // arms: bow arm straight out, string arm drawn back to the cheek
  limb(ctx, 2, -15, bx - 0.5, by, 2.4, pal.coat);
  ball(ctx, bx - 0.5, by, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  limb(ctx, -1, -15.5, bx - pull - 0.5, by - 0.5, 2.4, pal.coat);
  ball(ctx, bx - pull - 0.5, by - 0.5, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  ctx.restore();
};

// A crewman working a winch or a wheel: braced stance, both hands on a bar.
export const drawCrew = (ctx, x, y, dir, pal, work = 0) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 1);
  torso(ctx, 0.5 + work, -17, 10, 7.5, pal);
  head(ctx, 1 + work, -20.5, pal, { hood: true });
  const hx = 5.5 + work * 1.5, hy = -13 + work;
  limb(ctx, 2, -15, hx, hy, 2.4, pal.coat);
  limb(ctx, -1, -15.5, hx - 0.5, hy - 1.5, 2.4, pal.coat);
  ball(ctx, hx, hy, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  ball(ctx, hx - 0.5, hy - 1.5, 1.5, 1.5, pal.skin, { hi: 0.4, lo: 0.4 });
  ctx.restore();
};

// Somebody just standing there, looking about.
export const drawStander = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.2);
  torso(ctx, 0, -17, 10, 7.5, pal);
  limb(ctx, -2.5, -15, -3, -9, 2.4, pal.coat);
  limb(ctx, 2.5, -15, 3.2, -9, 2.4, pal.coat);
  head(ctx, 0.4, -20.5, pal);
  ctx.restore();
};

// The crews' cloth, by tower and path.
export const ARCHER_FOLK = {
  base: { skin: "#e8b990", hood: "#5c7a3f", coat: "#7a5432", boots: "#3e2a1a", trim: "#3e2a1a" },
  a: { skin: "#e8b990", hood: "#3f6a34", coat: "#4e7f3e", boots: "#3e2a1a", trim: "#2f4a24" },
  b: { skin: "#e8b990", hood: "#2c3e54", coat: "#3a5474", boots: "#2a2a30", trim: "#1f2c3e" },
  aa: { skin: "#d6c8a0", hood: "#2f5230", coat: "#3c6a34", boots: "#2a3020", trim: "#243a20" },
  ab: { skin: "#e8b990", hood: "#9fc4dc", coat: "#5a7a94", boots: "#2a2a30", trim: "#3a5060" },
  bb: { skin: "#e8b990", hood: "#8e2f2a", coat: "#a0473a", boots: "#2a2a30", trim: "#d8b34a" },
  crew: { skin: "#e8b990", hood: "#7a5a34", coat: "#6e4c28", boots: "#3e2a1a", trim: "#4a3018" },
};

export { soft };
