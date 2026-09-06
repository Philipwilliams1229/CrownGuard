// ============ FOLK ============
// The little people of the kingdom, as one shared body: a slim, rounded
// figure about 22 world pixels tall, drawn from the feet up in lit, soft
// forms — no outlines. Tower crews stand on this rig now; the soldiers and
// the horde will stand on it next.
//
// Every figure faces +x in its own space and is mirrored by `dir`. A
// palette names the visible materials: skin, hood, coat, boots, trim.

import { lighten, darken, rgba, soft, shadow, ball, roundRect, cylinder, lin, rad, part } from "./paint.js";

// A rounded limb between two points.
const limb = (ctx, x0, y0, x1, y1, w, col) => part(ctx, (c) => {
  c.strokeStyle = lin(c, x0 - w, y0, x0 + w, y0, [[0, lighten(col, 0.3)], [0.5, col], [1, darken(col, 0.45)]]);
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
});

const head = (ctx, x, y, pal, o = {}) => {
  part(ctx, (c) => ball(c, x, y, 3.3, 3.5, pal.skin, { hi: 0.45, lo: 0.4 }));
  // a hood or cap, sitting over the crown and hanging down the back
  if (o.hood !== false) {
    part(ctx, (c) => {
      ball(c, x - 0.4, y - 1.4, 3.7, 2.6, pal.hood, { hi: 0.45, lo: 0.45 });
      ball(c, x - 2.2, y + 0.6, 2.2, 3.2, pal.hood, { hi: 0.3, lo: 0.5 });
    });
  }
  // the eye that faces us
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(x + 1.6, y + 0.2, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
};

// Torso: a coat with a belt.
const torso = (ctx, x, top, h, w, pal) => part(ctx, (c) => {
  roundRect(c, x - w / 2, top, w, h, w * 0.4);
  c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, [[0, lighten(pal.coat, 0.32)], [0.45, pal.coat], [1, darken(pal.coat, 0.5)]]);
  c.fill();
  c.fillStyle = rgba(darken(pal.trim || pal.boots, 0.2), 0.9);
  c.fillRect(x - w / 2 + 0.5, top + h * 0.62, w - 1, 1.4);
});

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
  const bg = lin(ctx, bx, by - half, bx + belly, by + half, [[0, lighten(bowCol, 0.35)], [0.5, bowCol], [1, darken(bowCol, 0.3)]]);
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

// ---- the spire's mage and the warden's priest ----------------------------

// A robe: a coat that widens to the hem, no legs showing.
const robe = (ctx, x, top, h, wTop, wHem, col, trim) => part(ctx, (c) => {
  c.beginPath();
  c.moveTo(x - wTop / 2, top);
  c.lineTo(x + wTop / 2, top);
  c.quadraticCurveTo(x + wHem / 2, top + h * 0.6, x + wHem / 2, top + h);
  c.lineTo(x - wHem / 2, top + h);
  c.quadraticCurveTo(x - wHem / 2, top + h * 0.6, x - wTop / 2, top);
  c.closePath();
  c.fillStyle = lin(c, x - wHem / 2, 0, x + wHem / 2, 0, [[0, lighten(col, 0.32)], [0.45, col], [1, darken(col, 0.5)]]);
  c.fill();
  if (trim) { c.fillStyle = trim; c.fillRect(x - wHem / 2 + 0.5, top + h - 1.6, wHem - 1, 1.3); }
});

// The mage: apprentice (bare-handed, small), then a staff-bearer, then the
// long-beard. `level` 1..3. The orb is drawn by the tower, at the staff tip.
export const drawMage = (ctx, x, y, dir, pal, level = 3, o = {}) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  const tall = level >= 3;
  robe(ctx, 0, -17, 17, 7, tall ? 12 : 10, pal.robe, pal.trim);
  // the staff, held out front
  if (level >= 2) limb(ctx, 5, -22 + (tall ? -2 : 0), 6.5, -1, 1.6, "#6a4a2e");
  // arms: one on the staff, one held up to conjure
  limb(ctx, 2, -15, 5.5, -13, 2.2, pal.robe);
  limb(ctx, -2, -15, -4.5, -20, 2.2, pal.robe);
  ball(ctx, -4.5, -20.5, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  ball(ctx, 5.5, -13, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  // head, beard, hat
  part(ctx, (c) => ball(c, 0.4, -20.5, 3.3, 3.5, pal.skin, { hi: 0.45, lo: 0.4 }));
  if (tall) part(ctx, (c) => { c.beginPath(); c.moveTo(-2.4, -19); c.quadraticCurveTo(0.6, -10, 3.4, -19); c.closePath(); c.fillStyle = pal.beard || "#e8e0d0"; c.fill(); });
  else if (level === 2) part(ctx, (c) => ball(c, 0.6, -18, 2.2, 1.4, pal.beard || "#c8bca8", { hi: 0.3, lo: 0.3 }));
  part(ctx, (c) => {
    // brim, then the point
    ball(c, 0.4, -23, 5.2, 1.5, pal.hat, { hi: 0.4, lo: 0.4 });
    c.beginPath(); c.moveTo(-3.4, -23); c.quadraticCurveTo(0, -25, 1.8 + (tall ? 1.5 : 0), -33 - (tall ? 2 : 0)); c.quadraticCurveTo(3, -26, 3.8, -23); c.closePath();
    c.fillStyle = lin(c, -3, 0, 4, 0, [[0, lighten(pal.hat, 0.3)], [0.5, pal.hat], [1, darken(pal.hat, 0.45)]]);
    c.fill();
  });
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(2, -20.3, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};

// The priest: a robe and a mitre, arms raised in blessing or folded.
export const drawPriest = (ctx, x, y, dir, pal, raised = false) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  robe(ctx, 0, -17, 17, 7.5, 12, pal.robe, pal.trim);
  if (raised) {
    limb(ctx, -2.5, -15, -6, -22, 2.2, pal.robe);
    limb(ctx, 2.5, -15, 6, -22, 2.2, pal.robe);
    ball(ctx, -6, -22.5, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
    ball(ctx, 6, -22.5, 1.4, 1.4, pal.skin, { hi: 0.4, lo: 0.4 });
  } else {
    limb(ctx, -2.5, -15, -1, -11, 2.2, pal.robe);
    limb(ctx, 2.5, -15, 1, -11, 2.2, pal.robe);
  }
  part(ctx, (c) => ball(c, 0.4, -20.5, 3.3, 3.5, pal.skin, { hi: 0.45, lo: 0.4 }));
  // the mitre: a tall split cap with a gem
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(-3.2, -22.5); c.lineTo(-1.2, -30); c.lineTo(0.6, -27.5); c.lineTo(2.4, -30); c.lineTo(4, -22.5); c.closePath();
    c.fillStyle = lin(c, -3, 0, 4, 0, [[0, lighten(pal.hat, 0.3)], [0.5, pal.hat], [1, darken(pal.hat, 0.45)]]);
    c.fill();
  });
  ball(ctx, 0.5, -25, 0.9, 0.9, pal.gem || "#8ce8f0", { hi: 0.6, lo: 0.2 });
  ctx.fillStyle = "#2a2230";
  ctx.beginPath(); ctx.ellipse(2, -20.3, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
};

export const MAGE_FOLK = {
  base: { skin: "#e8b990", robe: "#5a4a8c", hat: "#3f3468", trim: "#d8b34a", beard: "#e8e0d0" },
  a: { skin: "#e8b990", robe: "#8a3a2e", hat: "#5a2420", trim: "#e8a040", beard: "#e8e0d0" },
  aa: { skin: "#e8b990", robe: "#7a2a22", hat: "#3a1a18", trim: "#f0b048", beard: "#d8cfc0" },
  ab: { skin: "#e8b990", robe: "#a04a2a", hat: "#6a2c1c", trim: "#f0c060", beard: "#e8e0d0" },
  b: { skin: "#e8b990", robe: "#2e4a7a", hat: "#1f3252", trim: "#8ce8f0", beard: "#e8e0d0" },
  ba: { skin: "#e8b990", robe: "#24406e", hat: "#182a48", trim: "#a8f0f8", beard: "#e8e0d0" },
  bb: { skin: "#e8b990", robe: "#3a3a80", hat: "#22224e", trim: "#f0e070", beard: "#e8e0d0" },
};
export const PRIEST_FOLK = {
  base: { skin: "#e8b990", robe: "#d8d0bc", hat: "#e8e2d0", trim: "#7cb8c8", gem: "#8ce8f0" },
  a: { skin: "#e8b990", robe: "#c8dce4", hat: "#e8f2f6", trim: "#5aa8c0", gem: "#8ce8f0" },
  aa: { skin: "#d8e0e8", robe: "#b8d4e0", hat: "#eef8fc", trim: "#3a90b0", gem: "#b8f0f8" },
  ab: { skin: "#e8b990", robe: "#a8c8d4", hat: "#e0eef4", trim: "#4a90a8", gem: "#c8ecf4" },
  b: { skin: "#e8b990", robe: "#e0d8b8", hat: "#f0e8c8", trim: "#7cb864", gem: "#8ce08c" },
  ba: { skin: "#e8b990", robe: "#e8dcb0", hat: "#f4ecc8", trim: "#d8b34a", gem: "#e8d47a" },
  bb: { skin: "#e8b990", robe: "#e8e0c0", hat: "#f8f2d8", trim: "#d8b34a", gem: "#f0d060" },
};
