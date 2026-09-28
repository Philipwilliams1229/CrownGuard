// ============ FOLK: THE WORKERS ============
// The winch and wheel crew (catapult, bladewheel, siege bow), the smith, the
// castle's halberdier and mason, and the standers (clerk, river watch).
// Built from folk-kit.js; folk.js re-exports it.

import { darken, shadow, roundRect, cylinder, lin, part } from "./paint.js";
import { head, torso, legs, hand, arm, cap } from "./folk-kit.js";

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
  arm(ctx, -0.6 + work, -15.8, hx - 0.6, hy - 1.4, pal, { col: darken(pal.coat, 0.18) });   // the far arm, behind
  arm(ctx, 1.6 + work, -15.4, hx, hy, pal);
  ctx.restore();
};

// A gate guard: a stander with a halberd grounded beside him.
export const drawHalberdier = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.3);
  torso(ctx, 0, -17, 10, 7.5, pal);
  // the pole, from the ground to well over the helmet
  cylinder(ctx, 5.2, -34, 1.6, 34, "#6a4a2e", { r: 0.8, hi: 0.3, lo: 0.5 });
  part(ctx, (c) => {
    c.fillStyle = lin(c, 3, 0, 9, 0, [[0, "#d8dce4"], [1, "#8a909c"]]);
    c.beginPath(); c.moveTo(6, -34); c.lineTo(10.5, -30); c.lineTo(6, -25.5); c.closePath(); c.fill();
    c.fillRect(5.3, -37, 1.4, 4);
  });
  arm(ctx, -2.4, -15.6, -2.8, -8.6, pal);
  head(ctx, 0.4, -20.5, pal, { helm: true });
  arm(ctx, 2.2, -15.6, 5.8, -19.6, pal);
  ctx.restore();
};

// A mason at the wall, trowel up.
export const drawMason = (ctx, x, y, dir, pal, work = 0) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.5);
  torso(ctx, 0, -17, 10, 7.5, pal);
  head(ctx, 0.4, -20.5, pal, { hood: true });
  arm(ctx, -2.4, -15.6, -3.8, -9.2, pal);
  const hx = 6, hy = -18 - work * 3;
  arm(ctx, 2.2, -15.6, hx, hy, pal, { bend: -1 });
  part(ctx, (c) => { c.fillStyle = "#b8bcc6"; c.beginPath(); c.moveTo(hx - 1, hy - 1.5); c.lineTo(hx + 5, hy - 3.5); c.lineTo(hx + 3, hy + 0.5); c.closePath(); c.fill(); });
  ctx.restore();
};

export const WALL_FOLK = {
  bowman: { skin: "#e8b990", hood: "#5a4a3a", coat: "#7c3f4a", boots: "#3e2a1a", trim: "#d8b34a" },
  guard: { skin: "#e8b990", hood: "#8a909c", coat: "#7c3f4a", boots: "#2a2a30", trim: "#d8b34a" },
  mason: { skin: "#e8b990", hood: "#c8b898", coat: "#8a7a5a", boots: "#3e2a1a", trim: "#5a4a3a" },
};

// Somebody just standing there, looking about.
export const drawStander = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.2);
  torso(ctx, 0, -17, 10, 7.5, pal);
  arm(ctx, -2.4, -15.6, -2.9, -8.6, pal);
  arm(ctx, 2.3, -15.6, 3.1, -8.6, pal);
  head(ctx, 0.4, -20.5, pal);
  ctx.restore();
};

// A smith at the anvil: hammer up (swing 1) or down (swing 0).
export const drawSmith = (ctx, x, y, dir, pal, swing = 0) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.8);
  torso(ctx, 0, -17, 10, 8, pal);
  // leather apron
  part(ctx, (c) => { c.fillStyle = darken(pal.trim || "#6a4a2e", 0.1); roundRect(c, -3, -15, 6, 8, 1.5); c.fill(); });
  head(ctx, 0.4, -20.5, pal, { hood: false });
  cap(ctx, 0.4, -20.5, pal.hood);   // a flat cap
  const hx = swing > 0.5 ? 3 : 6.5, hy = swing > 0.5 ? -26 : -12;
  arm(ctx, -1.2, -15.6, 4.5, -12, pal, { col: darken(pal.coat, 0.18) });   // the far hand steadies the iron
  arm(ctx, 1.8, -15.6, hx, hy, pal, { bend: swing > 0.5 ? -1 : 1, hand: false });
  // the hammer
  part(ctx, (c) => {
    c.strokeStyle = "#6a4a2e"; c.lineWidth = 1.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + (swing > 0.5 ? 3 : 4), hy + (swing > 0.5 ? -4 : -1)); c.stroke();
    c.fillStyle = "#6c727e"; roundRect(c, hx + (swing > 0.5 ? 1.5 : 2.5), hy + (swing > 0.5 ? -6.5 : -3.5), 4, 3, 0.8); c.fill();
  });
  hand(ctx, hx, hy, pal.skin);
  ctx.restore();
};
