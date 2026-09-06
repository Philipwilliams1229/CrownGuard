// ============ HALL: THE WARDEN MAGE ============
// A stone altar on a stepped footing where the warden stands, arms raised,
// with blessings drifting down through the cold. Level two raises fluted
// pillars with candles, level three a stone arch with a swinging censer.
// The ice path floats a shard of never-melting ice; the life path hangs a
// golden ward, or raises the cathedral's gilded spire.

import {
  pad, skirt, lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, masonry, lin, part,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";
import { getStats } from "../../engine/towers.js";
import { drawPriest, PRIEST_FOLK } from "../folk.js";

const CACHE = new Map();
export const resetWardenBakes = () => CACHE.clear();
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

const ALTAR = "#948c80";
const BOX = { left: 38, right: 38, up: 62, down: 18 };

const paintLower = (ctx, t, x, y) => {
  const lvl = t.level;
  const pw = 8 + lvl * 2;
  pad(ctx, x, y + 6, pw + 12, t.id);
  shadow(ctx, x + 6, y + 9, pw + 9, 4, 0.3);
  // stepped footing, then the altar slab
  part(ctx, (c) => masonry(c, x - pw - 3, y + 6, (pw + 3) * 2, 8, ALTAR, { r: 1.5, course: 4, block: 8 }));
  part(ctx, (c) => {
    cylinder(c, x - pw, y, pw * 2, 7, lighten(ALTAR, 0.08), { r: 1.5, hi: 0.3, lo: 0.45 });
    c.fillStyle = rgba(darken(ALTAR, 0.6), 0.5);
    c.fillRect(x - 3, y + 2.5, 7, 1); c.fillRect(x, y + 1, 1, 4);
  });
  // pillars with candles
  if (lvl >= 2 || t.branch) {
    for (const side of [-1, 1]) {
      const px = x + side * (pw + 6);
      part(ctx, (c) => {
        cylinder(c, px - 2, y - 12, 4, 18, ALTAR, { r: 1, hi: 0.35, lo: 0.45 });
        cylinder(c, px - 3, y - 15, 6, 3, lighten(ALTAR, 0.15), { r: 1, hi: 0.3, lo: 0.4 });
        c.fillStyle = "#e8e0c8";
        c.fillRect(px - 1, y - 19, 2, 4);
      });
    }
  }
  // frost creeping up the altar (Permafrost)
  if (t.branch === "a" && t.rank4 === "b") {
    for (const side of [-1, 1]) {
      ball(ctx, x + side * (pw + 1), y - 1, 1.6, 3, "#c8ecf4", { hi: 0.4, lo: 0.2 });
      ball(ctx, x + side * (pw - 4), y - 3, 1.4, 4, "#c8ecf4", { hi: 0.4, lo: 0.2 });
    }
  }
  skirt(ctx, x, y + 8, pw + 6, t.id);
};

const paintArch = (ctx, t, x, y) => {
  const pw = 8 + t.level * 2;
  const ah = 30, aw = pw + 7;
  for (const sgn of [-1, 1]) part(ctx, (c) => cylinder(c, x + sgn * aw - 2, y - ah, 4, ah - 6, ALTAR, { r: 1, hi: 0.35, lo: 0.45 }));
  part(ctx, (c) => cylinder(c, x - aw - 1, y - ah - 5, aw * 2 + 2, 5, lighten(ALTAR, 0.06), { r: 1.5, hi: 0.3, lo: 0.4 }));
  // the cathedral's gilded spire
  if (t.branch === "b" && t.rank4 === "b") {
    part(ctx, (c) => {
      cylinder(c, x - 1.5, y - ah - 30, 3, 26, "#6a4a2e", { r: 1 });
      c.fillStyle = "#d8b34a";
      c.fillRect(x - 3.5, y - ah - 26, 7, 1.8); c.fillRect(x - 0.9, y - ah - 32, 1.8, 9);
    });
  }
};

export const drawSupportTower = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lvl = t.level;
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "base";
  const st = getStats(t);
  const ice = !t.branch || t.branch === "a";
  const auraCol = r4 === "aa" ? "#b8f0f8" : r4 === "ba" ? "#e8d47a" : r4 === "bb" ? "#d8b34a" : t.branch === "b" ? "#8ce08c" : ice ? "#7cd4d4" : "#c8e8f0";
  const canBake = typeof document !== "undefined";
  const grown = lvl >= 3 || !!t.branch;

  // the aura shows itself only while it works: a pulse sweeping out
  const live = t._auraLive || 0;
  if (live > 0) {
    const pr = (time * 34 + t.id * 40) % st.range;
    ctx.strokeStyle = rgba(auraCol, (0.22 + Math.min(0.4, live * 0.07)) * (1 - pr / st.range));
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
  }
  if (canBake) {
    const cv = baked(`altar|${lvl}|${t.branch}|${t.rank4}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintLower(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up));
    stamp(ctx, cv, x, y, BOX.left, BOX.up);
  } else paintLower(ctx, t, x, y);
  // candle flames
  if (lvl >= 2 || t.branch) {
    for (const side of [-1, 1]) {
      const px = x + side * (8 + lvl * 2 + 6);
      const fl = 0.5 + 0.5 * Math.sin(time * 12 + side + t.id);
      glow(ctx, px, y - 20.5 - fl, 2.2 + fl, "#ffd070", 0.9);
    }
  }
  // the warden, arms raised in blessing on a slow rhythm
  const raising = ((time * 0.9 + t.id * 0.7) % 1.6) < 0.55;
  const pal = PRIEST_FOLK[key] || PRIEST_FOLK.base;
  const dir = t._idle ? 1 : (Math.cos(t.lastAim || 0) >= 0 ? 1 : -1);
  if (canBake) {
    const pcv = baked(`priest|${key}|${raising ? 1 : 0}`, 26, 38, (c) => drawPriest(c, 13, 35, 1, pal, raising));
    stamp(ctx, pcv, x, y + 2, 13, 35, dir);
  } else drawPriest(ctx, x, y + 2, dir, pal, raising);
  // halo
  if (grown) glow(ctx, x, y - 28 + Math.sin(time * 2 + t.id) * 1.5, 6, auraCol, 0.45);
  // the arch, over the warden
  if (grown) {
    if (canBake) {
      const cv = baked(`arch|${lvl}|${t.branch}|${t.rank4}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintArch(c, t, BOX.left, BOX.up));
      stamp(ctx, cv, x, y, BOX.left, BOX.up);
    } else paintArch(ctx, t, x, y);
    // the censer on its chain
    const sw = Math.sin(time * 1.6 + t.id) * 7;
    const cx2 = x + sw, cy2 = y - 30 + 9 + Math.abs(sw) * 0.25;
    ctx.strokeStyle = "#6c727e";
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(cx2, cy2); ctx.stroke();
    ball(ctx, cx2, cy2 + 3, 3.2, 3, "#d8b34a", { hi: 0.5, lo: 0.4 });
    for (let i = 0; i < 3; i++) {
      const py2 = cy2 - 2 - ((time * 12 + i * 6 + t.id * 3) % 14);
      glow(ctx, cx2 + Math.sin(time * 3 + i) * 2, py2, 1.6, "#d8e6f0", 0.5 - i * 0.12);
    }
  }
  // the ice path's floating shard, the life path's golden ward
  if (t.branch === "a") {
    const hy = y - 34 + Math.sin(time * 2.5 + t.id) * 3;
    ctx.fillStyle = "#8ce8f0";
    ctx.beginPath(); ctx.moveTo(x + 11, hy); ctx.lineTo(x + 13.5, hy + 4); ctx.lineTo(x + 11, hy + 9); ctx.lineTo(x + 8.5, hy + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8f8fc"; ctx.fillRect(x + 10.4, hy + 2.5, 1.2, 2.5);
    if (r4 === "aa") {
      const ang = time * 2.2 + t.id;
      ball(ctx, x + Math.cos(ang) * 14, y - 30 + Math.sin(ang) * 4, 1.6, 2.2, "#b8f0f8", { hi: 0.5, lo: 0.2 });
    }
  }
  if (r4 === "ba") {
    const hy = y - 36 + Math.sin(time * 2.5 + t.id) * 3;
    ctx.fillStyle = "#e8d47a";
    ctx.fillRect(x + 9, hy, 2, 2); ctx.fillRect(x + 7, hy + 2, 6, 2); ctx.fillRect(x + 9, hy + 4, 2, 2);
  }
  // blessings drifting down inside the aura
  ctx.fillStyle = rgba(auraCol, 0.95);
  for (let i = 0; i < 3; i++) {
    const fall = (time * 22 + i * 15 + t.id * 5) % 40;
    const bx = x + (i === 0 ? -14 : i === 1 ? 15 : -2) + Math.sin(time * 2 + i) * 3;
    const by = y - 34 + fall;
    ctx.fillRect(bx - 2, by - 0.5, 4.5, 1.2); ctx.fillRect(bx - 0.4, by - 2, 1.2, 4.5);
  }
  // at rest the crystal breathes: a mote climbs off it and fades
  if (t._idle) {
    const cyc = ((time / 4) + t.id * 0.29) % 1;
    if (cyc < 0.6) glow(ctx, x + Math.sin(time * 1.3 + t.id) * 3, y - 26 - cyc * 20, 1.5, auraCol, 0.8 * (1 - cyc / 0.6));
  }
};
