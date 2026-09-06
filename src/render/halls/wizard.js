// ============ HALL: THE WIZARD SPIRE ============
// A slender violet-grey spire with a lit arched window and a platform at
// the top where the mage stands. He grows with the tower: an apprentice
// conjuring bare-handed, a staff-bearer, a long-beard. Runes orbit the
// spire from level two, star-charms from level three. The fire path warms
// the stone and glows at the base; the storm path crackles.

import {
  pad, stoneBody, skirt, GREY_STONE,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, lin, part,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";
import { drawMage, MAGE_FOLK } from "../folk.js";

const CACHE = new Map();
export const resetWizardBakes = () => CACHE.clear();
const baked = (key, w, h, draw) => {
  let sp = CACHE.get(key);
  if (!sp) { sp = bakeSprite(w, h, draw); CACHE.set(key, sp); }
  return sp;
};
const stamp = (ctx, cv, x, y, ax, ay, dir = 1) => {
  const w = cv.width / PX, h = cv.height / PX;
  if (dir >= 0) { ctx.drawImage(cv, x - ax, y - ay, w, h); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -ax, -ay, w, h); ctx.restore();
};

const STONE = { base: "#8a8496", a: "#8a6a6a", aa: "#7a5a58", ab: "#9a7060", b: "#7a8098", ba: "#6a7a9a", bb: "#7a7aa0" };
const ORB = { base: "#b08ad8", a: "#e88a3a", aa: "#f0a040", ab: "#f0b060", b: "#8ce8f0", ba: "#a8f0f8", bb: "#f0e070" };
const TRIM = { base: "#d8b34a", a: "#e8a040", aa: "#f0b048", ab: "#f0c060", b: "#8ce8f0", ba: "#a8f0f8", bb: "#f0e070" };

const spireH = (t) => 18 + t.level * 6 + (t.branch ? 4 : 0);
const BOX = { left: 30, right: 30, up: 70, down: 18 };

const paintSpire = (ctx, t, x, y) => {
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const bodyH = spireH(t);
  const stone = STONE[key] || STONE.base;
  pad(ctx, x, y + 6, 20, t.id);
  shadow(ctx, x + 6, y + 8, 18, 4.5, 0.32);
  stoneBody(ctx, x, y - bodyH, 20, bodyH + 8, stone);
  // the arched window, dark; its light is painted live
  part(ctx, (c) => {
    c.fillStyle = "#2a2438";
    c.beginPath(); c.moveTo(x - 3.5, y - bodyH + 20); c.lineTo(x - 3.5, y - bodyH + 12); c.arc(x, y - bodyH + 12, 3.5, Math.PI, 0); c.lineTo(x + 3.5, y - bodyH + 20); c.closePath(); c.fill();
  });
  // the trim course, then the platform the mage stands on
  part(ctx, (c) => cylinder(c, x - 11, y - bodyH - 1, 22, 3, TRIM[key] || TRIM.base, { r: 1, hi: 0.35, lo: 0.4 }));
  part(ctx, (c) => cylinder(c, x - 14, y - bodyH - 7, 28, 6, "#8a6238", { r: 1.5, hi: 0.3, lo: 0.5 }));
  part(ctx, (c) => {
    for (const sgn of [-1, 1]) cylinder(c, x + sgn * 13 - 1.5, y - bodyH - 10, 3, 4, TRIM[key] || TRIM.base, { r: 1, hi: 0.35, lo: 0.4 });
  });
  skirt(ctx, x, y + 6, 12, t.id);
};

export const drawWizardSpire = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const bodyH = spireH(t);
  const orbCol = ORB[key] || ORB.base;
  const canBake = typeof document !== "undefined";

  // lava glow at the foot of the Volcanic Throne
  if (r4 === "aa") glow(ctx, x, y + 8, 18, "#e8703a", 0.35 + 0.15 * Math.sin(time * 4 + t.id));
  // runes orbit the spire from level two; the back half hides behind the stone
  const runes = [];
  if (lvl >= 2 || t.branch) {
    for (let i = 0; i < 6; i++) {
      const ang = time * 0.9 + (i / 6) * Math.PI * 2;
      runes.push({ rx: x + Math.cos(ang) * 17, ry: y - bodyH / 2 + Math.sin(ang) * 5, front: Math.sin(ang) >= 0 });
    }
    for (const r of runes) if (!r.front) ball(ctx, r.rx, r.ry, 1.3, 1.3, "#b8a2d8", { hi: 0.5, lo: 0.2 });
  }
  if (canBake) {
    const cv = baked(`spire|${lvl}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintSpire(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up));
    stamp(ctx, cv, x, y, BOX.left, BOX.up);
  } else paintSpire(ctx, t, x, y);
  // the window's light
  if (Math.sin(time * 1.7 + t.id) > -0.4) glow(ctx, x, y - bodyH + 15, 3.5, "#ffd070", 0.75);
  for (const r of runes) if (r.front) ball(ctx, r.rx, r.ry, 1.3, 1.3, "#b8a2d8", { hi: 0.5, lo: 0.2 });
  // drifting embers of the Wildfire Court
  if (r4 === "ab") {
    for (let i = 0; i < 3; i++) {
      const ey = y + 8 - ((time * 26 + i * 14 + t.id * 7) % 44);
      glow(ctx, x - 10 + i * 10 + Math.sin(time * 3 + i) * 3, ey, 1.8, "#e88a3a", 0.9);
    }
  }
  // the mage, on the platform
  const dir = t._idle ? (Math.sin(time * 0.5 + t.id) >= 0 ? 1 : -1) : (Math.cos(t.lastAim) >= 0 ? 1 : -1);
  const level = t.branch ? 3 : lvl;
  const pal = MAGE_FOLK[key] || MAGE_FOLK.base;
  const my = y - bodyH - 7;
  const mcv = canBake ? baked(`mage|${key}|${level}`, 30, 40, (c) => drawMage(c, 13, 37, 1, pal, level)) : null;
  // star-charms from level three; the back arc passes behind the mage
  const stars = [];
  if (lvl >= 3 || t.branch) {
    for (let i = 0; i < 3; i++) {
      const ang = time * 1.7 + i * 2.09 + t.id;
      stars.push({ cx: x + Math.cos(ang) * 15, cy: my - 14 + Math.sin(ang) * 5, front: Math.sin(ang) >= 0 });
    }
  }
  const star = (s) => { ctx.fillStyle = orbCol; ctx.fillRect(s.cx - 0.5, s.cy - 2, 1.2, 4.5); ctx.fillRect(s.cx - 2.2, s.cy - 0.3, 4.5, 1.2); };
  for (const s of stars) if (!s.front) star(s);
  if (mcv) stamp(ctx, mcv, x, my, 13, 37, dir); else drawMage(ctx, x, my, dir, pal, level);
  // the orb: bare-handed for the apprentice, at the staff tip after
  const bob = Math.sin(time * 2.5 + t.id) * 1.5;
  const hasStaff = level >= 2;
  const orbX = x + dir * (hasStaff ? 6.5 : 5), orbY = my + (hasStaff ? -23 - (level >= 3 ? 2 : 0) : -21) + bob;
  const rOut = (level >= 3 ? 4 : level === 2 ? 3.2 : 2.6) + (t.anim > 0.4 ? 1 : 0);
  glow(ctx, orbX, orbY, rOut * 2.2, orbCol, 0.35);
  ball(ctx, orbX, orbY, rOut, rOut, orbCol, { hi: 0.6, lo: 0.3 });
  if (t.anim > 0.05) {
    glow(ctx, orbX, orbY, rOut * 0.8, "#fffaf0", t.anim);
    ctx.strokeStyle = rgba(orbCol, t.anim * 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(orbX, orbY, rOut + (1 - t.anim) * 12, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
  }
  for (const s of stars) if (s.front) star(s);
  // static crackling around the storm paths
  if ((t.branch === "b") && Math.sin(time * 11 + t.id) > 0.55) {
    const ang = time * 5 + t.id;
    const zx = x + Math.cos(ang) * 13, zy = my - 10 + Math.sin(ang) * 8;
    ctx.strokeStyle = "#f8f0a0";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(zx, zy); ctx.lineTo(zx + 2, zy + 3); ctx.lineTo(zx + 0.5, zy + 4); ctx.lineTo(zx + 2.5, zy + 7); ctx.stroke();
  }
  // between battles a tome hangs open by the spire, pages flicking
  if (t._idle && ((time / 9) + t.id * 0.37) % 1 < 0.45) {
    const ty2 = y - bodyH - 22 + Math.sin(time * 1.6) * 2;
    ctx.fillStyle = "#d8ceb4";
    ctx.fillRect(x + 12, ty2, 3.5, 4.5); ctx.fillRect(x + 16, ty2, 3.5, 4.5);
    ctx.fillStyle = "#a89c7c";
    ctx.fillRect(x + 15.4 + (Math.sin(time * 7) > 0.6 ? 0.6 : 0), ty2, 0.8, 4.5);
  }
};
