// ============ RENDER: WATER ============
// Still water (ponds, meres, ice, lava, bog pools) and running water (the
// rivers), on the board and — through drawRiver — in the landscape beyond it
// (apron.js paints rivers running off the board with drawRiver at time 0).
//
// draw.js calls drawWaterLive(ctx, g) once a frame, over the baked ground
// and under the road's live bits; world.js calls bakeWater(ctx) while it
// paints the ground layer (after the road), for anything still enough to
// be baked once per realm.

import { PONDS, RIVERS } from "../data/terrain.js";
import { REALM } from "../data/maps.js";
import { reeds } from "./scenery.js";
import {
  lighten, darken, mix, rgba, soft, ball, glow, strokePts, blobPath, lin } from "./paint.js";

// ---- water ------------------------------------------------------------

const DEFAULT_WATER = { deep: "#3a6a86", edge: "#5590a8", shine: "#a8d8e8" };

// A drifting glint on the surface.
const glint = (ctx, x, y, len, ang, col, a) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  soft(ctx, 0, 0, len, 1.1, [[0, rgba(col, a)], [1, rgba(col, 0)]]);
  ctx.restore();
};

export const drawRiver = (ctx, rv, time, water) => {
  const wa = water || DEFAULT_WATER;
  const bank = mix(wa.edge, "#6a5a40", 0.5);
  strokePts(ctx, rv.pts, rv.w + 10, rgba(darken(bank, 0.3), 0.28));
  strokePts(ctx, rv.pts, rv.w + 4, bank);
  strokePts(ctx, rv.pts, rv.w, wa.edge);
  strokePts(ctx, rv.pts, rv.w - 7, wa.deep);
  strokePts(ctx, rv.pts, rv.w * 0.4, rgba(lighten(wa.deep, 0.18), 0.5));
  ctx.lineWidth = 1;
  // the current: glints travelling downstream, braiding side to side
  let total = 0;
  for (const s of rv.segs) total += s.len;
  const n = Math.max(6, Math.round(total / 22));
  for (let i = 0; i < n; i++) {
    const d = ((i / n) * total + time * 22) % total;
    let acc = 0, sx = 0, sy = 0, ang = 0;
    for (const s of rv.segs) {
      if (d <= acc + s.len) {
        const t = (d - acc) / s.len;
        sx = s.x1 + (s.x2 - s.x1) * t;
        sy = s.y1 + (s.y2 - s.y1) * t;
        ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        break;
      }
      acc += s.len;
    }
    const side = Math.sin(i * 2.7 + time * 0.9) * (rv.w * 0.28);
    const px = sx + Math.cos(ang + Math.PI / 2) * side;
    const py = sy + Math.sin(ang + Math.PI / 2) * side;
    glint(ctx, px, py, 5 + (i % 3) * 2, ang, i % 3 === 0 ? wa.shine : lighten(wa.edge, 0.3), i % 3 === 0 ? 0.55 : 0.35);
  }
};

// Still water: a wandering shoreline, a lit bank, deep water with a soft
// inner shadow, and glints drifting across. Ice and lava keep their moods.
export const drawPond = (ctx, p, time) => {
  const x = p.x, y = p.y, rx = p.w / 2, ry = p.h / 2;
  const seed = Math.round(x * 3 + y);
  const big = p.w >= 80;
  const wobble = big ? 0.14 : 0.1;
  if (p.t === "lava") {
    blobPath(ctx, x, y, rx + 5, ry + 5, seed, wobble);
    ctx.fillStyle = "#2a2422"; ctx.fill();
    blobPath(ctx, x, y, rx, ry, seed, wobble);
    ctx.fillStyle = "#6a2a20"; ctx.fill();
    ctx.save(); blobPath(ctx, x, y, rx, ry, seed, wobble); ctx.clip();
    soft(ctx, x, y, rx * 0.9, ry * 0.9, [[0, "#ffd070"], [0.3, "#f08a3a"], [0.7, "#a03a24"], [1, "rgba(120,40,30,0)"]]);
    for (let i = 0; i < 4; i++) {
      const bub = 0.5 + 0.5 * Math.sin(time * 5 + i * 2.1 + x);
      const bx = x - rx * 0.6 + ((i * 37) % Math.max(8, p.w - 14)), by = y - ry * 0.5 + ((i * 23) % Math.max(4, p.h - 12));
      ball(ctx, bx, by - bub * 1.5, 2.2, 1.8, "#e8702a", { hi: 0.6, lo: 0.2 });
    }
    ctx.restore();
    glow(ctx, x, y, rx * 1.3, "#f08a3a", 0.16);
    return;
  }
  if (p.t === "ice") {
    blobPath(ctx, x, y, rx + 3, ry + 3, seed, wobble);
    ctx.fillStyle = "#9fb8c6"; ctx.fill();
    blobPath(ctx, x, y, rx, ry, seed, wobble);
    const g = lin(ctx, x - rx, y - ry, x + rx, y + ry, [[0, "#e4f2f8"], [0.5, "#c2dbe6"], [1, "#9cbccb"]]);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - rx * 0.5, y + ry * 0.2); ctx.lineTo(x - rx * 0.1, y - ry * 0.1); ctx.lineTo(x + rx * 0.35, y + ry * 0.3); ctx.stroke();
    if (Math.sin(time * 2.4 + p.x) > 0.8) glow(ctx, x - rx * 0.2, y - ry * 0.1, 5, "#ffffff", 0.9);
    return;
  }
  const swamp = p.t === "swamp";
  const deep = swamp ? "#2c4a3c" : "#3a6c88";
  const edge = swamp ? "#3d5c44" : "#5896ad";
  const shine = swamp ? "#7aa078" : "#b0e0ee";
  const bank = swamp ? "#4f5a3c" : "#8a7a58";
  // the bank: a soft dark ring on the turf, a lit lip on the far side
  ctx.save(); ctx.translate(2, 3);
  blobPath(ctx, x, y, rx + 6, ry + 5, seed, wobble);
  ctx.fillStyle = "rgba(30,22,30,0.22)"; ctx.fill();
  ctx.restore();
  blobPath(ctx, x, y, rx + 4, ry + 3.5, seed, wobble);
  ctx.fillStyle = bank; ctx.fill();
  blobPath(ctx, x, y, rx, ry, seed, wobble);
  ctx.fillStyle = edge; ctx.fill();
  ctx.save();
  blobPath(ctx, x, y, rx, ry, seed, wobble);
  ctx.clip();
  soft(ctx, x, y + ry * 0.1, rx * 0.95, ry * 0.9, [[0, deep], [0.75, deep], [1, rgba(edge, 0)]]);
  // the bank throws its shadow onto the near water
  soft(ctx, x - rx * 0.2, y - ry * 0.9, rx * 1.1, ry * 0.55, [[0, "rgba(20,24,30,0.32)"], [1, "rgba(20,24,30,0)"]]);
  // sky in the water: a pale sheen toward the sun
  soft(ctx, x - rx * 0.3, y - ry * 0.2, rx * 0.55, ry * 0.4, [[0, rgba(shine, 0.22)], [1, rgba(shine, 0)]]);
  const nG = big ? 7 : 3;
  for (let i = 0; i < nG; i++) {
    const gx = x - rx + 8 + ((time * 6 + i * 41) % Math.max(10, p.w - 16));
    const gy = y - ry * 0.55 + i * Math.max(4, (p.h - 10) / nG);
    glint(ctx, gx, gy, 4 + (i % 3) * 2, 0.05, shine, 0.5);
  }
  if (swamp) {
    for (const [dx, dy, r] of [[-0.4, 0.3, 3.4], [0.35, -0.25, 3], [0.1, 0.5, 2.5]]) {
      ball(ctx, x + rx * dx, y + ry * dy, r, r * 0.7, "#5f8a48", { hi: 0.4, lo: 0.3 });
    }
  }
  ctx.restore();
  if (swamp || big) reeds(ctx, x - rx * 0.72, y - ry * 0.55, 0.9, time);
};

// Painted once into the ground layer (world.js groundLayer, after the road
// and the chapter's road art). Nothing yet: the water is all drawn live.
export const bakeWater = (ctx) => {};

// Every frame, over the baked ground: the ponds, then the rivers.
export const drawWaterLive = (ctx, g) => {
  for (const p of PONDS) drawPond(ctx, p, g.time);
  for (const rv of RIVERS) drawRiver(ctx, rv, g.time, REALM.water);
};
