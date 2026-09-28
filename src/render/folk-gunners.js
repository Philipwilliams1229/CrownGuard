// ============ FOLK: THE GUNNERS AND OTHERS ============
// The covert's hooded blade, the falcon-mistress, the bombardier (and the
// alchemist, in his cloth) and the musketeer. Built from folk-kit.js;
// folk.js re-exports it.

import { darken, shadow, ball, lin, part } from "./paint.js";
import { limb, head, torso, legs, arm, cap } from "./folk-kit.js";

// A hooded figure standing still, arms folded — the covert's blade on watch.
export const drawHooded = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.1);
  torso(ctx, 0, -17, 10, 7.5, pal);
  limb(ctx, -3, -14, 2.5, -11, 2.2, pal.coat);
  limb(ctx, 3, -14, -2.5, -11, 2.2, pal.coat);
  // a deep hood: the face in its shadow, only the eye's glint and a chin
  head(ctx, 0.4, -20.5, { ...pal, skin: darken(pal.skin, 0.62) });
  part(ctx, (c) => { c.fillStyle = darken(pal.skin, 0.1); c.fillRect(1.4, -18.6, 1.4, 0.8); });
  ctx.restore();
};

// The falcon-mistress: gauntlet raised to the wheel of birds.
export const drawMistress = (ctx, x, y, dir, pal) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.3);
  torso(ctx, 0, -17, 10, 7.5, pal);
  arm(ctx, -2.4, -15.6, -2.9, -8.6, pal);
  head(ctx, 0.4, -20.5, pal);
  // the glove arm raised, a long leather gauntlet to the elbow
  arm(ctx, 2.2, -15.6, 8, -21.4, pal, { bend: -1, glove: "#7a5234" });
  part(ctx, (c) => { c.fillStyle = lin(c, 6, 0, 9, 0, [[0, "#9a6a44"], [1, "#5a3a22"]]); c.beginPath(); c.moveTo(5.2, -18.6); c.lineTo(7.2, -20); c.lineTo(8.6, -21.8); c.lineTo(9.4, -20.6); c.lineTo(7.6, -17.6); c.closePath(); c.fill(); c.fillStyle = "#d8b34a"; c.fillRect(5.6, -18.8, 1.8, 0.6); });
  ctx.restore();
};

// The bombardier, a lit charge in his hands, raised to throw or held low.
export const drawBomber = (ctx, x, y, dir, pal, throwing = false) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 0.7);
  torso(ctx, 0, -17, 10, 8, pal);
  head(ctx, 0.4, -20.5, pal, { hood: false });
  cap(ctx, 0.4, -20.5, pal.hood, { tall: true });   // a knitted cap
  const bx = throwing ? 5 : 5.5, by = throwing ? -24 : -12;
  arm(ctx, -1.2, -15.6, bx - 2, by + 2, pal, { col: darken(pal.coat, 0.18), bend: throwing ? -1 : 1 });
  arm(ctx, 1.8, -15.6, bx - 1, by + 1, pal, { bend: throwing ? -1 : 1 });
  part(ctx, (c) => ball(c, bx + 0.5, by - 1, 2.6, 2.6, "#2e2e36", { hi: 0.45, lo: 0.4 }));
  ctx.restore();
};

// The musketeer: braced, long gun out, a wide hat because he must stand still.
export const drawMusketeer = (ctx, x, y, dir, pal, kick = 0) => {
  ctx.save();
  ctx.translate(x - kick, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  legs(ctx, 0, 0, pal, 1.2);
  torso(ctx, 0, -17, 10, 7.5, pal);
  head(ctx, 0.4, -20.5, pal, { hood: false });
  cap(ctx, 0.4, -20.5, pal.hood, { wide: true, tall: true, band: pal.trim });   // the broad hat
  // the gun, barrel out front
  part(ctx, (c) => {
    c.strokeStyle = "#5f4326"; c.lineWidth = 2.2; c.lineCap = "round";
    c.beginPath(); c.moveTo(-1, -12.5); c.lineTo(4, -15); c.stroke();
    c.strokeStyle = "#6c727e"; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(3, -15); c.lineTo(13, -16.5); c.stroke();
  });
  arm(ctx, 1.8, -15.6, 6, -15, pal);
  arm(ctx, -1.2, -15.6, 1.5, -13, pal, { col: darken(pal.coat, 0.1) });
  ctx.restore();
};
