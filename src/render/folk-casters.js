// ============ FOLK: THE CASTERS ============
// The spire's mage and the warden's priest. Built from folk-kit.js;
// folk.js re-exports it.

import { lighten, darken, rgba, shadow, ball, lin, part } from "./paint.js";
import { limb, blob, dab, head, hand, arm } from "./folk-kit.js";

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
// long-beard. `level` 1..3. The orb is drawn by the tower, at mageTip().
// o.pose: "charge" (the default — conjuring hand up, staff upright),
// "idle" (staff grounded, hand at rest), "cast" (staff driven forward at
// the foe, the free hand flung out behind it).
export const mageTip = (level, pose = "charge") => {
  const tall = level >= 3;
  if (level < 2) return pose === "cast" ? [8, -17] : pose === "idle" ? [4.5, -12] : [5, -21];
  if (pose === "cast") return [11, -20 - (tall ? 1.5 : 0)];
  return [6.5, -23 - (tall ? 2 : 0)];
};
export const drawMage = (ctx, x, y, dir, pal, level = 3, o = {}) => {
  const pose = o.pose || "charge";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 1, 0.4, 5, 1.8, 0.3);
  const tall = level >= 3;
  const lean = pose === "cast" ? 0.8 : 0;
  robe(ctx, 0, -17, 17, 7, tall ? 12 : 10, pal.robe, pal.trim);
  // a sash of the trim colour down the front
  part(ctx, (c) => { c.fillStyle = pal.trim; c.fillRect(1.2, -16.5, 1, 15); });
  const [tx, ty] = mageTip(level, pose);
  // the staff: grounded, upright, or levelled at the foe
  if (level >= 2) {
    part(ctx, (c) => {
      c.strokeStyle = lin(c, tx - 1, 0, tx + 1, 0, [[0, "#8a6a44"], [1, "#4a3420"]]);
      c.lineWidth = 1.6; c.lineCap = "round";
      c.beginPath();
      if (pose === "cast") { c.moveTo(3, -4); c.lineTo(tx - 1, ty + 1.5); }
      else { c.moveTo(tx - 1.5, -0.5); c.lineTo(tx - 0.6, ty + 1.5); }
      c.stroke();
      // the head of the staff: a gilt fork that cups the orb
      c.fillStyle = pal.trim;
      c.fillRect(tx - 2.2, ty + 1, 1, 2); c.fillRect(tx + 0.6, ty + 1, 1, 2); c.fillRect(tx - 2.2, ty + 2.5, 3.8, 1);
    });
  }
  ctx.translate(lean, 0);
  // arms: the staff hand, and the free hand conjuring (or resting)
  const sh = pose === "cast" ? [tx - 4, ty + 3.5] : level >= 2 ? [tx - 1, -13] : pose === "cast" ? [tx - 1, ty] : [5.5, -13];
  const fh = pose === "idle" ? [-3, -9.5] : pose === "cast" ? [-5.5, -15] : [-4.5, -20.5];
  if (level < 2 && pose !== "idle") sh[0] = tx - 1, sh[1] = ty + 0.5;
  arm(ctx, 2, -15.4, sh[0], sh[1], pal, { col: pal.robe });
  arm(ctx, -2, -15.4, fh[0], fh[1], pal, { col: pal.robe, bend: pose === "charge" ? -1 : 1 });
  // head, beard, hat: the soldiers' face under the wizard's hat
  head(ctx, 0.4, -20.5, pal, { hood: false });
  if (tall) part(ctx, (c) => { c.beginPath(); c.moveTo(-2.4, -19); c.quadraticCurveTo(0.6, -10, 3.4, -19); c.closePath(); c.fillStyle = pal.beard || "#e8e0d0"; c.fill(); });
  else if (level === 2) part(ctx, (c) => ball(c, 0.6, -18, 2.2, 1.4, pal.beard || "#c8bca8", { hi: 0.3, lo: 0.3 }));
  part(ctx, (c) => {
    // brim, then the point, flopping back
    ball(c, 0.4, -23, 5.2, 1.5, pal.hat, { hi: 0.4, lo: 0.4 });
    c.beginPath(); c.moveTo(-3.4, -23); c.quadraticCurveTo(0, -25, 1.8 + (tall ? 1.5 : 0) - (pose === "cast" ? 2.5 : 0), -33 - (tall ? 2 : 0)); c.quadraticCurveTo(3, -26, 3.8, -23); c.closePath();
    c.fillStyle = lin(c, -3, 0, 4, 0, [[0, lighten(pal.hat, 0.3)], [0.5, pal.hat], [1, darken(pal.hat, 0.45)]]);
    c.fill();
    c.fillStyle = pal.trim; c.fillRect(-3, -24, 6.6, 1);
  });
  ctx.restore();
};

// The warden's priest: a frost-and-light mage-priest. A shaped alb that
// flares at the hem, wide bell sleeves cuffed in the accent colour, a stole
// hanging down the front, a two-peaked mitre with its ribbons behind, and a
// short staff crowned with a charm. Folded: both hands on the staff. Raised:
// staff aloft in the near hand, the far hand open in blessing — the hands
// land at (±6, -23), where the hall pools its light.
const sleeve = (ctx, sx, sy, cx, cy, w, col, cuff, droop = 0) => {
  const dx = cx - sx, dy = cy - sy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const p = [cx + nx * w, cy + ny * w], q = [cx - nx * w, cy - ny * w];
  (p[1] > q[1] ? p : q)[1] += droop;                                     // the loose side hangs
  blob(ctx, [[sx + nx * 1.3, sy + ny * 1.3], [sx - nx * 1.3, sy - ny * 1.3], [q[0], q[1], 1], [p[0], p[1], 1]], col, {
    hi: 0.3, lo: 0.4, then: (c) => { c.strokeStyle = cuff; c.lineWidth = 1; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(p[0], p[1]); c.stroke(); },
  });
};
const priestStaff = (ctx, x0, y0, x1, y1, pal) => {
  const metal = pal.metal || "#d8b34a";
  part(ctx, (c) => {
    c.strokeStyle = lin(c, x1 - 1, 0, x1 + 1, 0, [[0, lighten(pal.staff || "#8a6a44", 0.3)], [1, darken(pal.staff || "#8a6a44", 0.35)]]);
    c.lineWidth = 1.3; c.lineCap = "round";
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.fillStyle = metal; c.fillRect(x1 - 1, y1 - 0.2, 2, 0.9);                              // the collar
    c.strokeStyle = metal; c.lineWidth = 0.8;
    c.beginPath(); c.arc(x1, y1 - 2.4, 1.9, 0, Math.PI * 2); c.stroke();                      // the ring
    c.fillStyle = rgba(pal.gem, 0.45); c.beginPath(); c.arc(x1, y1 - 2.4, 1.5, 0, Math.PI * 2); c.fill();
  });
  ball(ctx, x1, y1 - 2.4, 1.1, 1.3, pal.gem, { hi: 0.7, lo: 0.25 });
  dab(ctx, x1 - 0.5, y1 - 3.2, 0.5, 0.5, "#fff3d2");
};
const openHand = (ctx, x, y, col, s) => {
  hand(ctx, x, y, col);
  dab(ctx, x + s * 0.6, y - 1.9, 0.6, 1, col); dab(ctx, x - s * 0.3, y - 2.1, 0.6, 1.1, col);   // fingers spread
};
export const drawPriest = (ctx, x, y, dir, pal, raised = false) => {
  const robeC = pal.robe, stole = pal.trim, metal = pal.metal || "#d8b34a";
  const farC = darken(robeC, 0.16);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  shadow(ctx, 0.6, 0.4, 5.6, 1.8, 0.3);
  // the far arm raised goes behind the body
  if (raised) {
    limb(ctx, -5.0, -19.8, -6, -22.4, 1.9, pal.skin);
    sleeve(ctx, -2.2, -16.4, -5.0, -20.0, 2.0, farC, stole, 2.6);
    openHand(ctx, -6, -23, pal.skin, -1);
  }
  // the alb: shoulders, a nipped waist, a hem that flares and ripples
  blob(ctx, [[-3.3, -16.4], [-0.8, -17.6], [2.2, -17.4], [3.8, -16.0], [3.9, -11.2], [4.8, -5.4], [6.2, -0.3, 1], [4.2, 0.5], [1.6, 0.0], [-1.0, 0.5], [-3.6, 0.0], [-5.8, -0.3, 1], [-4.8, -5.4], [-3.8, -11.2]], robeC, {
    hi: 0.28, lo: 0.4, then: (c) => {
      c.strokeStyle = darken(robeC, 0.32); c.lineWidth = 0.55;                                // folds, fanning to the hem
      c.beginPath(); c.moveTo(-1.6, -9.4); c.quadraticCurveTo(-2.0, -4, -2.8, 0.4); c.stroke();
      c.beginPath(); c.moveTo(0.6, -8.6); c.quadraticCurveTo(0.8, -4, 0.6, 0.4); c.stroke();
      c.beginPath(); c.moveTo(3.2, -8.8); c.quadraticCurveTo(3.8, -4, 4.4, 0.4); c.stroke();
      c.strokeStyle = lighten(robeC, 0.45); c.lineWidth = 0.6;                               // the lit edge of a fold
      c.beginPath(); c.moveTo(-3.0, -9); c.quadraticCurveTo(-3.6, -4.5, -4.4, -0.6); c.stroke();
      c.beginPath(); c.moveTo(-0.6, -8.8); c.quadraticCurveTo(-0.8, -4, -1.2, -0.4); c.stroke();
      dab(c, -7, -1.0, 14, 1.6, darken(robeC, 0.22));                                          // the hem band
      dab(c, -7, -1.4, 14, 0.5, stole);
      dab(c, -5, -11.6, 10, 0.9, metal);                                                       // the girdle cord
    },
  });
  dab(ctx, 3.9, -0.6, 1.6, 0.9, "#4a3a3a");                                                    // a toe under the hem
  // the stole: two strands down the front, a gilt mark near each end
  for (const [x0, x1, bot, col] of [[-0.9, -0.6, -4.6, darken(stole, 0.2)], [1.4, 2.4, -3.4, stole]]) {
    blob(ctx, [[x0, -17.4, 1], [x0 + 1.7, -17.4, 1], [x1 + 1.8, bot, 1], [x1 + 0.9, bot + 0.7, 1], [x1, bot, 1]], col, {
      hi: 0.35, lo: 0.3, then: (c) => { dab(c, x1 + 0.5, bot - 2.4, 0.8, 1.6, metal); dab(c, x1 + 0.2, bot - 2.0, 1.4, 0.6, metal); },
    });
  }
  // the mitre's ribbons, fallen behind the neck
  part(ctx, (c) => { c.fillStyle = darken(stole, 0.15); c.fillRect(-2.9, -22.4, 0.9, 4.6); c.fillRect(-2.0, -22.4, 0.7, 3.6); });
  if (raised) {
    priestStaff(ctx, 6.6, -14.6, 5.5, -30.2, pal);
    limb(ctx, 5.0, -19.8, 6, -22.4, 1.9, pal.skin);
    sleeve(ctx, 2.2, -16.4, 5.0, -20.0, 2.1, robeC, stole, 2.8);
    hand(ctx, 6, -23, pal.skin);
  } else {
    priestStaff(ctx, 5.0, 0.2, 4.4, -24.6, pal);
    sleeve(ctx, -1.6, -16.6, 2.6, -14.0, 1.8, farC, stole, 0.8);                             // the far arm across the breast
    hand(ctx, 4.5, -14.8, pal.skin);
    sleeve(ctx, 2.2, -16.4, 3.4, -12.4, 2.3, robeC, stole, 1.4);
    hand(ctx, 4.7, -12.2, pal.skin);
  }
  head(ctx, 0.4, -20.5, pal, { hood: false });
  if (pal.hair) { dab(ctx, -1.9, -22.6, 2.0, 0.8, pal.hair); dab(ctx, -1.9, -22.0, 0.8, 2.2, darken(pal.hair, 0.15)); }   // hair at the nape, under the mitre
  if (pal.beard) part(ctx, (c) => { c.beginPath(); c.moveTo(-0.2, -19.4); c.quadraticCurveTo(1.6, -15.6, 3.2, -19.2); c.closePath(); c.fillStyle = pal.beard; c.fill(); });
  // the mitre: a back peak, then the front one, banded and gemmed
  const hat = pal.hat;
  blob(ctx, [[-2.6, -22.8, 1], [1.4, -22.8, 1], [0.6, -26.4], [-0.9, -29.4, 1], [-2.4, -26.6]], darken(hat, 0.2), { hi: 0.25 });
  blob(ctx, [[-1.9, -22.4, 1], [3.5, -22.4, 1], [3.7, -25.2], [2.6, -28.2], [1.1, -30.2, 1], [-0.4, -28.2], [-1.9, -25.4]], hat, {
    hi: 0.3, lo: 0.42, then: (c) => {
      dab(c, -2.2, -23.6, 6.2, 1.2, metal);                                                    // the band
      dab(c, 0.6, -29, 1, 5.4, metal);                                                         // the orphrey up the front
      dab(c, 0.4, -26.4, 1.4, 1.4, pal.gem); dab(c, 0.5, -26.3, 0.5, 0.5, "#fff3d2");         // the gem
    },
  });
  ctx.restore();
};

export const MAGE_FOLK = {
  base: { skin: "#e8b990", robe: "#5a4a8c", hat: "#3f3468", trim: "#d8b34a", beard: "#e8e0d0" },
  a: { skin: "#e8b990", robe: "#8a3a2e", hat: "#5a2420", trim: "#e8a040", beard: "#e8e0d0" },
  aa: { skin: "#e8b990", robe: "#9a2420", hat: "#6a1616", trim: "#f0c050", beard: "#e8e0d0" },
  ab: { skin: "#e8b990", robe: "#c05a24", hat: "#2e2228", trim: "#f0c050", beard: "#e8e0d0" },
  b: { skin: "#e8b990", robe: "#2e4a7a", hat: "#1f3252", trim: "#8ce8f0", beard: "#e8e0d0" },
  ba: { skin: "#e8b990", robe: "#24406e", hat: "#182a48", trim: "#a8f0f8", beard: "#e8e0d0" },
  bb: { skin: "#e8b990", robe: "#3a3a80", hat: "#22224e", trim: "#f0e070", beard: "#e8e0d0" },
};
export const PRIEST_FOLK = {
  base: { skin: "#e8b990", hair: "#8a5a34", robe: "#e6dfcc", hat: "#f0ead8", trim: "#4a9ab4", gem: "#8ce8f0", metal: "#d8b34a", staff: "#8a6a44" },
  a: { skin: "#e8b990", hair: "#8a5a34", robe: "#d0e2ec", hat: "#eef6fa", trim: "#3a7eb0", gem: "#a8ecf8", metal: "#c4d4e0", staff: "#9aaebc" },
  aa: { skin: "#f0d0bc", hair: "#e4eef4", robe: "#b4d0e4", hat: "#f2faff", trim: "#28588e", gem: "#c8f6ff", metal: "#e0ecf4", staff: "#b4c8d8" },
  ab: { skin: "#e8b990", hair: "#6a4a30", robe: "#a4c4d6", hat: "#e4f0f6", trim: "#2e6c8c", gem: "#9ce4f8", metal: "#c4d4e0", staff: "#8aa0b0" },
  b: { skin: "#e8b990", hair: "#8a5a34", robe: "#ece6cc", hat: "#f4efdc", trim: "#5a9a44", gem: "#9ce88c", metal: "#d8b34a", staff: "#8a6a44" },
  ba: { skin: "#e8b990", hair: "#a06a38", robe: "#f2e8c4", hat: "#f8f0d4", trim: "#4e8a3c", gem: "#f0dc7a", metal: "#e0bc50", staff: "#7a5334" },
  bb: { skin: "#e8b990", hair: "#a06a38", robe: "#faf4de", hat: "#fff8e4", trim: "#c8962c", gem: "#f8e070", metal: "#e8c458", staff: "#7a5334" },
};
