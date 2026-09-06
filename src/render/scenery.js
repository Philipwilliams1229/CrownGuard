// ============ RENDER: SCENERY ============
// Everything that stands on the ground and isn't a tower or a soldier: the
// trees and stones of each realm (and the fen's graves, the Marches' tents),
// still water, running water and the bridges over it, the castle, and the
// gate the enemy comes in by.
//
// All of it is drawn with the paint kit: lit, rounded, outline-free forms
// with soft shadows falling away from one sun. Nothing here is a rectangle
// unless a carpenter made it.

import { W, H, RES, PATH_HALF, WALL_W } from "../data/constants.js";
import { PTS } from "../engine/path.js";
import { FOREST } from "../data/terrain.js";
import {
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone,
  blade, tuft, strokePts, blobPath, masonry, hash, ellipse, SUN,
} from "./paint.js";

// ---- palettes ---------------------------------------------------------
const OAK = { leaf: "#5e9f45", trunk: "#7a5334" };
const PINE = { leaf: "#4a8c4d", trunk: "#6a4a30" };
const SNOWPINE = { leaf: "#3f6f5a", trunk: "#5a4634" };
const STONE = "#9a9284";
const CASTLE_STONE = "#a19a8a";
const ROOF = "#a8505c";

// ---- trees ------------------------------------------------------------

// A broadleaf: a trunk and a canopy of lit lobes, with leaf-cluster dabs on
// the sunny side so it reads as foliage up close.
const leafyTree = (ctx, x, y, s, pal, sway, seed) => {
  shadow(ctx, x + 6 * s, y + 11, 17 * s, 6.5 * s, 0.3);
  // trunk: a tapered cylinder with two root flares
  const tw = 6 * s;
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.9, y + 11);
  ctx.quadraticCurveTo(x - tw * 0.45, y + 2, x - tw * 0.42, y - 10 * s);
  ctx.lineTo(x + tw * 0.42, y - 10 * s);
  ctx.quadraticCurveTo(x + tw * 0.45, y + 2, x + tw * 0.9, y + 11);
  ctx.closePath();
  const tg = ctx.createLinearGradient(x - tw, 0, x + tw, 0);
  tg.addColorStop(0, lighten(pal.trunk, 0.3));
  tg.addColorStop(0.5, pal.trunk);
  tg.addColorStop(1, darken(pal.trunk, 0.55));
  ctx.fillStyle = tg;
  ctx.fill();
  // canopy: a dark under-mass, then the lobes, lowest first
  const cx = x + sway;
  soft(ctx, cx, y - 12 * s, 18 * s, 14 * s, [[0, darken(pal.leaf, 0.45)], [0.8, darken(pal.leaf, 0.5)], [1, rgba(darken(pal.leaf, 0.5), 0)]]);
  const lobes = [
    [-11, -11, 11.5, 0], [11, -12, 11, 0.2], [0, -8, 12.5, -0.1],
    [-5.5, -21, 10.5, 1], [6.5, -22, 10, 1.2], [0, -17, 13, 0.6],
  ];
  for (const [dx, dy, r, top] of lobes) {
    const sx = cx + top * sway * 0.8;
    ball(ctx, sx + dx * s, y + dy * s, r * s, r * 0.9 * s, mix(pal.leaf, darken(pal.leaf, 0.2), dy > -12 ? 0.35 : 0), { hi: 0.5, lo: 0.45 });
  }
  // leaf clusters: a few soft masses where the sun lands, shade underneath
  for (let i = 0; i < 9; i++) {
    const L = lobes[Math.floor(hash(seed, i) * lobes.length)];
    const a = hash(seed, i + 30) * Math.PI * 2;
    const rr = L[2] * s * (0.3 + hash(seed, i + 60) * 0.45);
    const px = cx + L[3] * sway * 0.8 + L[0] * s + Math.cos(a) * rr;
    const py = y + L[1] * s + Math.sin(a) * rr * 0.9;
    const sunny = (Math.cos(a) * SUN.x + Math.sin(a) * SUN.y) > 0.1;
    const col = sunny ? lighten(pal.leaf, 0.3) : darken(pal.leaf, 0.3);
    soft(ctx, px, py, 3.6 * s, 2.6 * s, [[0, rgba(col, 0.75)], [0.6, rgba(col, 0.35)], [1, rgba(col, 0)]]);
  }
};

// A conifer: three plush tiers over a short trunk, each tier shading the one
// below it. `caps` adds snow.
const pineTree = (ctx, x, y, s, pal, sway, caps = null) => {
  shadow(ctx, x + 5 * s, y + 10, 12 * s, 5 * s, 0.3);
  cylinder(ctx, x - 2 * s, y - 2, 4 * s, 12, pal.trunk, { r: 1.5 });
  const tiers = [
    { halfW: 13, h: 14, bottom: 7, col: darken(pal.leaf, 0.12) },
    { halfW: 10, h: 13, bottom: 7 - 9, col: pal.leaf },
    { halfW: 7, h: 12, bottom: 7 - 17, col: lighten(pal.leaf, 0.1) },
  ];
  tiers.forEach((t, i) => {
    const lean = sway * (i + 1) * 0.6;
    const bottom = y + t.bottom * s + (i === 0 ? 0 : 0);
    if (i > 0) {
      // the tier above throws a soft shadow onto this one
      soft(ctx, x + lean, bottom + 1.5, t.halfW * s * 1.05, 3.2 * s, [[0, rgba(darken(pal.leaf, 0.6), 0.5)], [1, rgba(darken(pal.leaf, 0.6), 0)]]);
    }
    cone(ctx, x + lean, bottom - t.h * s, t.halfW * s, t.h * s, t.col, { scallops: 3, sag: 2.6 * s });
    if (caps) cone(ctx, x + lean, bottom - t.h * s, t.halfW * s * 0.55, t.h * s * 0.42, caps, { scallops: 2, sag: 1.6 * s, hi: 0.2, lo: 0.2 });
  });
};

// A boulder: a lit ellipsoid with a facet, a couple of soft cracks and moss.
const boulder = (ctx, x, y, s, base, moss = null, seed = 0) => {
  const rx = 11 * s, ry = 8.5 * s;
  shadow(ctx, x + 4 * s, y + 8, rx * 1.15, ry * 0.6, 0.3);
  ball(ctx, x, y + 2, rx, ry, base, { hi: 0.5, lo: 0.55 });
  soft(ctx, x - rx * 0.28, y - ry * 0.25, rx * 0.5, ry * 0.36, [[0, rgba(lighten(base, 0.7), 0.4)], [1, rgba(lighten(base, 0.7), 0)]]);
  ctx.strokeStyle = rgba(darken(base, 0.7), 0.3);
  ctx.lineWidth = 0.9 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - rx * 0.1, y - ry * 0.3);
  ctx.quadraticCurveTo(x + rx * 0.05, y + ry * 0.1, x - rx * 0.15, y + ry * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + rx * 0.3, y + ry * 0.2);
  ctx.quadraticCurveTo(x + rx * 0.5, y + ry * 0.35, x + rx * 0.45, y + ry * 0.7);
  ctx.stroke();
  if (moss) {
    soft(ctx, x - rx * 0.4, y - ry * 0.45, rx * 0.5, ry * 0.4, [[0, rgba(moss, 0.85)], [0.7, rgba(moss, 0.55)], [1, rgba(moss, 0)]]);
    soft(ctx, x + rx * 0.35 + hash(seed, 1) * 3, y + ry * 0.6, rx * 0.35, ry * 0.3, [[0, rgba(moss, 0.7)], [1, rgba(moss, 0)]]);
  }
};

const deadTree = (ctx, x, y, s) => {
  shadow(ctx, x + 4 * s, y + 10, 8 * s, 3.5 * s, 0.28);
  const col = "#5a473a";
  cylinder(ctx, x - 2.5 * s, y - 18 * s, 5 * s, 18 * s + 16, col, { r: 2, hi: 0.35, lo: 0.55 });
  ctx.lineCap = "round";
  const limbs = [[-1, -14, -9, -5], [1, -10, 9, -4], [-1, -5, -7, -3], [1, -16, 5, -6]];
  for (const [, ly, lx, up] of limbs) {
    const g = ctx.createLinearGradient(x, 0, x + lx * s, 0);
    g.addColorStop(0, lighten(col, lx < 0 ? 0.25 : 0));
    g.addColorStop(1, darken(col, lx < 0 ? 0.1 : 0.4));
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(x, y + ly * s);
    ctx.quadraticCurveTo(x + lx * s * 0.5, y + (ly + up * 0.3) * s, x + lx * s, y + (ly + up) * s);
    ctx.stroke();
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.moveTo(x + lx * s, y + (ly + up) * s);
    ctx.lineTo(x + lx * s * 1.25, y + (ly + up - 3) * s);
    ctx.stroke();
  }
};

const willow = (ctx, x, y, s, sway) => {
  shadow(ctx, x + 6 * s, y + 12, 16 * s, 6 * s, 0.3);
  cylinder(ctx, x - 3 * s, y + 1, 6 * s, 15, "#5a4230", { r: 2 });
  const leaf = "#4f7a3c";
  ball(ctx, x + sway * 0.4, y - 13 * s, 15 * s, 11 * s, leaf, { hi: 0.5, lo: 0.45 });
  ball(ctx, x + sway * 0.8 - 3 * s, y - 20 * s, 9 * s, 6.5 * s, lighten(leaf, 0.08), { hi: 0.5, lo: 0.4 });
  for (let i = 0; i < 11; i++) {
    const ox = (-13 + i * 2.6) * s;
    const len = (9 + ((i * 13) % 4) * 3.5) * s;
    const col = i % 2 ? leaf : darken(leaf, 0.22);
    const top = y - 8 * s - Math.abs(ox) * 0.2;
    blade(ctx, x + ox + sway * 0.6, top, x + ox + sway * 1.2 + 1.5 * s, top + len, 0.9 * s, col, lighten(col, 0.25), 0.4);
  }
};

const mushroom = (ctx, x, y, s, time) => {
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.8 + x);
  glow(ctx, x, y - 5 * s, 17 * s, "#c88ce8", 0.1 + pulse * 0.1);
  shadow(ctx, x + 3 * s, y + 9, 8 * s, 3 * s, 0.26);
  cylinder(ctx, x - 2.4 * s, y - 4 * s, 4.8 * s, 4 * s + 14, "#d8cfb8", { r: 2, hi: 0.25, lo: 0.4 });
  const cap = "#9a56c0";
  ball(ctx, x, y - 6 * s, 10 * s, 6.5 * s, cap, { hi: 0.5, lo: 0.5 });
  soft(ctx, x, y - 2 * s, 9.5 * s, 2.2 * s, [[0, rgba(darken(cap, 0.55), 0.5)], [1, rgba(darken(cap, 0.55), 0)]]);
  for (const [dx, dy, r] of [[-5, -8, 1.6], [3, -10, 1.3], [-1, -5, 1.2], [6, -6, 1.1]]) {
    ball(ctx, x + dx * s, y + dy * s, r * s, r * 0.8 * s, "#eedaf6", { hi: 0.3, lo: 0.15 });
  }
};

const reeds = (ctx, x, y, s, time) => {
  const sway = Math.sin(time * 1.6 + x) * 1.2;
  const stalks = [[-6, 13], [-2, 18], [2, 15], [6, 11], [0, 10]];
  stalks.forEach(([ox, hh], i) => {
    const col = i % 2 ? "#6a8448" : "#54703c";
    const sx = x + ox * s, sh = hh * s;
    blade(ctx, sx, y + 8, sx + sway + 1.5 * s, y + 8 - sh, 0.8 * s, darken(col, 0.2), lighten(col, 0.2), 0.45);
    if (i % 2 === 0) ball(ctx, sx + sway + 1.2 * s, y + 8 - sh + 2.5 * s, 1.5 * s, 3.2 * s, "#6a4a2e", { hi: 0.35, lo: 0.35 });
  });
};

const crystal = (ctx, x, y, s, time) => {
  shadow(ctx, x + 3 * s, y + 9, 9 * s, 3 * s, 0.24);
  const shards = [[-6, 9, 3, "#5a94b0"], [6, 11, 3, "#7cc4e0"], [0, 16, 4, "#8fd0e8"]];
  for (const [ox, hh, ww, col] of shards) {
    const sx = x + ox * s, sh = hh * s, w = ww * s;
    ctx.beginPath();
    ctx.moveTo(sx, y + 8 - sh);
    ctx.lineTo(sx + w, y + 8 - sh * 0.3);
    ctx.lineTo(sx + w * 0.8, y + 9);
    ctx.lineTo(sx - w * 0.8, y + 9);
    ctx.lineTo(sx - w, y + 8 - sh * 0.35);
    ctx.closePath();
    const g = ctx.createLinearGradient(sx - w, y + 8 - sh, sx + w, y + 9);
    g.addColorStop(0, lighten(col, 0.6));
    g.addColorStop(0.45, col);
    g.addColorStop(1, darken(col, 0.45));
    ctx.fillStyle = g;
    ctx.fill();
  }
  if (Math.sin(time * 3 + x) > 0.85) glow(ctx, x, y + 8 - 15 * s, 4 * s, "#ffffff", 0.9);
};

const vent = (ctx, x, y, s, time) => {
  shadow(ctx, x + 4 * s, y + 10, 11 * s, 4 * s, 0.3);
  ball(ctx, x, y + 2, 11 * s, 7 * s, "#3d3437", { hi: 0.3, lo: 0.5 });
  ball(ctx, x, y - 3 * s, 6 * s, 3.5 * s, "#4a3e42", { hi: 0.3, lo: 0.4 });
  const hot = 0.6 + 0.4 * Math.sin(time * 4 + x);
  soft(ctx, x, y - 4 * s, 4 * s, 2.2 * s, [[0, `rgba(255,214,120,${hot})`], [0.4, `rgba(232,96,52,${hot * 0.9})`], [1, "rgba(160,50,30,0)"]]);
  glow(ctx, x, y - 4 * s, 10 * s, "#e8703a", 0.18 * hot);
  const rise = (time * 14 + x) % 22;
  glow(ctx, x + Math.sin(time * 2 + x) * 3, y - 10 - rise, 2.2, "#f0a04a", Math.max(0, 0.9 - rise / 22));
};

// ---- the fen's dead and the Marches' camp ----------------------------

const gravestone = (ctx, x, y, s, seed) => {
  const lean = ((seed * 7) % 3) - 1;
  const hh = 14 * s, hw = 5 * s;
  shadow(ctx, x + 3 * s, y + 8, 7 * s, 2.5 * s, 0.26);
  ctx.save();
  ctx.translate(x, y + 8);
  ctx.rotate(lean * 0.08);
  ctx.beginPath();
  ctx.moveTo(-hw, 0);
  ctx.lineTo(-hw, -hh + hw);
  ctx.arc(0, -hh + hw, hw, Math.PI, 0);
  ctx.lineTo(hw, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(-hw, 0, hw, 0);
  g.addColorStop(0, lighten(STONE, 0.28));
  g.addColorStop(0.55, STONE);
  g.addColorStop(1, darken(STONE, 0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(darken(STONE, 0.6), 0.35);
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  if (seed % 2) {
    ctx.beginPath(); ctx.moveTo(0, -hh + 3); ctx.lineTo(0, -hh + 9); ctx.moveTo(-2.5, -hh + 5); ctx.lineTo(2.5, -hh + 5); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-3 * s, -hh + 5); ctx.lineTo(3 * s, -hh + 5); ctx.moveTo(-3 * s, -hh + 8); ctx.lineTo(2 * s, -hh + 8); ctx.stroke();
  }
  ctx.restore();
  soft(ctx, x - 3 * s, y + 7, 4 * s, 1.8 * s, [[0, "rgba(74,90,60,0.8)"], [1, "rgba(74,90,60,0)"]]);
};

const cairn = (ctx, x, y, s) => {
  shadow(ctx, x + 4 * s, y + 9, 9 * s, 3 * s, 0.28);
  const tiers = [[8, 0, 0], [6, 1, 0.08], [4.5, 2, 0.16], [3, 3, 0.24]];
  for (const [wr, i, lt] of tiers) {
    ball(ctx, x + (i % 2 ? 1 : -1) * s, y + 6 - i * 5 * s, wr * s, 3.4 * s, lighten(STONE, lt), { hi: 0.45, lo: 0.5 });
  }
};

const boneheap = (ctx, x, y, s) => {
  soft(ctx, x, y + 4, 11 * s, 4.5 * s, [[0, "rgba(24,26,20,0.4)"], [1, "rgba(24,26,20,0)"]]);
  ctx.lineCap = "round";
  const bones = [[-7, 2, 7, 0.3], [1, 5, 6, -0.4], [-3, 7, 5, 0.1]];
  for (const [bx, by, len, ang] of bones) {
    const x0 = x + bx * s, y0 = y + by, x1 = x0 + Math.cos(ang) * len * s, y1 = y0 + Math.sin(ang) * len * s * 0.5;
    ctx.strokeStyle = "#cfc5ae";
    ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ball(ctx, x0, y0, 1.6 * s, 1.4 * s, "#ddd5c0", { hi: 0.3, lo: 0.4 });
    ball(ctx, x1, y1, 1.6 * s, 1.4 * s, "#ddd5c0", { hi: 0.3, lo: 0.4 });
  }
  ball(ctx, x - 5 * s, y - 1, 3.6 * s, 3.1 * s, "#e0d8c4", { hi: 0.35, lo: 0.4 });
  ctx.fillStyle = "#2b2430";
  ellipse(ctx, x - 6.2 * s, y - 1.2, 0.9 * s, 1.1 * s); ctx.fill();
  ellipse(ctx, x - 3.9 * s, y - 1.2, 0.9 * s, 1.1 * s); ctx.fill();
};

const obelisk = (ctx, x, y, s, time) => {
  const hh = 24 * s;
  shadow(ctx, x + 4 * s, y + 9, 7 * s, 2.6 * s, 0.3);
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y + 9); ctx.lineTo(x - 2.4 * s, y + 8 - hh); ctx.lineTo(x + 2.4 * s, y + 8 - hh); ctx.lineTo(x + 4 * s, y + 9);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - 4 * s, 0, x + 4 * s, 0);
  g.addColorStop(0, "#4a4058"); g.addColorStop(0.5, "#2e2838"); g.addColorStop(1, "#1a1622");
  ctx.fillStyle = g; ctx.fill();
  ball(ctx, x, y + 8 - hh, 2.4 * s, 1.6 * s, "#3a3248", { hi: 0.35, lo: 0.4 });
  for (let i = 0; i < 3; i++) {
    const on = Math.sin(time * 1.6 + i * 2.1 + x) > 0.1;
    glow(ctx, x, y + 4 - i * 7 * s, 2.6 * s, "#7ce0b8", on ? 0.9 : 0.25);
  }
};

const watchtower = (ctx, x, y, s, time) => {
  const w2 = 7 * s, hh = 20 * s;
  shadow(ctx, x + 5 * s, y + 10, 11 * s, 4 * s, 0.32);
  masonry(ctx, x - w2, y + 8 - hh, w2 * 2, hh + 8, CASTLE_STONE, { course: 5, block: 7 });
  for (let i = 0; i < 3; i++) {
    const cx2 = x - w2 + i * (w2 - 1.5) + 0.5;
    cylinder(ctx, cx2, y + 8 - hh - 5, 4.5, 6, CASTLE_STONE, { r: 1 });
  }
  const lit = Math.sin(time * 1.9 + x * 2) > -0.5;
  ctx.fillStyle = "#2a2430";
  roundRect(ctx, x - 1.6, y - 6 * s, 3.2, 9, 1.2); ctx.fill();
  if (lit) glow(ctx, x, y - 6 * s + 4.5, 3.5, "#ffd070", 0.8);
  cylinder(ctx, x - 0.8, y + 8 - hh - 17, 1.6, 12, "#6a4a2e", { r: 0.8 });
  const wv = Math.sin(time * 4 + x) * 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 0.8, y + 8 - hh - 17);
  ctx.quadraticCurveTo(x + 5, y + 8 - hh - 18 + wv, x + 9 + wv, y + 8 - hh - 15.5);
  ctx.quadraticCurveTo(x + 5, y + 8 - hh - 13 + wv, x + 0.8, y + 8 - hh - 12);
  ctx.closePath();
  ctx.fillStyle = "#3e5c84"; ctx.fill();
};

const tent = (ctx, x, y, s) => {
  const w2 = 10 * s, hh = 11 * s;
  shadow(ctx, x + 4 * s, y + 9, 12 * s, 4 * s, 0.3);
  cone(ctx, x, y + 8 - hh, w2, hh, "#456a94", { scallops: 2, sag: 1.5, hi: 0.4, lo: 0.5 });
  // the open mouth
  ctx.beginPath();
  ctx.moveTo(x, y + 8 - hh * 0.55);
  ctx.lineTo(x + 4 * s, y + 9);
  ctx.lineTo(x - 4 * s, y + 9);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - hh * 0.5, 0, y + 9);
  g.addColorStop(0, "#1a1c24"); g.addColorStop(1, "#2c2a30");
  ctx.fillStyle = g; ctx.fill();
  for (const sx of [x - w2 - 2.5, x + w2 + 1]) cylinder(ctx, sx, y + 5, 1.6, 4, "#6a4a2e", { r: 0.8 });
};

const banner = (ctx, x, y, s, time) => {
  const hh = 22 * s;
  shadow(ctx, x + 2, y + 9, 4 * s, 1.6 * s, 0.26);
  cylinder(ctx, x - 1, y + 8 - hh, 2.2, hh + 8, "#6a4a2e", { r: 1 });
  const wv = Math.sin(time * 3 + x * 0.2) * 2;
  const ty = y + 8 - hh;
  ctx.beginPath();
  ctx.moveTo(x + 1, ty);
  ctx.quadraticCurveTo(x + 7, ty - 1 + wv * 0.5, x + 13 + wv, ty + 1);
  ctx.lineTo(x + 9 + wv * 0.6, ty + 5.5);
  ctx.lineTo(x + 13 + wv, ty + 10);
  ctx.quadraticCurveTo(x + 7, ty + 11 + wv * 0.5, x + 1, ty + 10);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, ty, x + 12, ty + 10);
  g.addColorStop(0, "#5a7cac"); g.addColorStop(1, "#2e4666");
  ctx.fillStyle = g; ctx.fill();
  ball(ctx, x + 5.5, ty + 5, 1.8, 1.8, "#e8e4d8", { hi: 0.3, lo: 0.2 });
};

// Forest trees are many and they don't sway: each distinct (type, size,
// variant) is painted once at full resolution and stamped from then on.
const FOREST_SPRITES = new Map();
const forestSprite = (d) => {
  const s = Math.round((d.s || 1) * 10) / 10;
  const v = ((Math.round(d.x * 3 + d.y * 7) % 4) + 4) % 4;
  const key = `${d.t}|${s}|${v}`;
  let sp = FOREST_SPRITES.get(key);
  if (sp) return sp;
  const hw = Math.ceil(36 * s + 8), top = Math.ceil(40 * s + 8), bot = 22;
  const cv = document.createElement("canvas");
  cv.width = hw * 2 * RES; cv.height = (top + bot) * RES;
  const c = cv.getContext("2d");
  c.scale(RES, RES);
  const tints = ["#5e9f45", "#6aa64a", "#4f8e42", "#5a9a50"];
  soft(c, hw, top - 14 * s, 30 * s, 26 * s, [[0, "rgba(14,24,10,0.5)"], [0.7, "rgba(14,24,10,0.35)"], [1, "rgba(14,24,10,0)"]]);
  if (d.t === "pine") pineTree(c, hw, top, s, { leaf: v % 2 ? "#4a8c4d" : "#43824a", trunk: PINE.trunk }, 0);
  else leafyTree(c, hw, top, s, { leaf: tints[v], trunk: OAK.trunk }, 0, v * 131 + 7);
  sp = { cv, hw, top, bot };
  FOREST_SPRITES.set(key, sp);
  return sp;
};

export const drawTree = (ctx, d, time) => {
  if (d.forest && typeof document !== "undefined") {
    const sp = forestSprite(d);
    ctx.drawImage(sp.cv, d.x - sp.hw, d.y - sp.top, sp.hw * 2, sp.top + sp.bot);
    return;
  }
  const x = d.x, y = d.y, s = d.s || 1;
  const seed = Math.round(d.x * 3 + d.y * 7);
  const sway = Math.sin(time * 0.8 + d.x * 0.06 + d.y * 0.03) * 1.4;
  switch (d.t) {
    case "pine": pineTree(ctx, x, y, s, PINE, sway); break;
    case "snowpine": pineTree(ctx, x, y, s, SNOWPINE, sway * 0.5, "#eef5f8"); break;
    case "rock": boulder(ctx, x, y, s, "#9a978f", "#5f8a3a", seed); break;
    case "icerock": boulder(ctx, x, y, s, "#aac2d0", null, seed); break;
    case "obsidian": boulder(ctx, x, y, s, "#3c3448", null, seed); break;
    case "crystal": crystal(ctx, x, y, s, time); break;
    case "deadtree": deadTree(ctx, x, y, s); break;
    case "vent": vent(ctx, x, y, s, time); break;
    case "willow": willow(ctx, x, y, s, sway); break;
    case "mushroom": mushroom(ctx, x, y, s, time); break;
    case "reeds": reeds(ctx, x, y, s, time); break;
    case "gravestone": gravestone(ctx, x, y, s, seed); break;
    case "cairn": cairn(ctx, x, y, s); break;
    case "boneheap": boneheap(ctx, x, y, s); break;
    case "obelisk": obelisk(ctx, x, y, s, time); break;
    case "watchtower": watchtower(ctx, x, y, s, time); break;
    case "tent": tent(ctx, x, y, s); break;
    case "banner": banner(ctx, x, y, s, time); break;
    case "tree": leafyTree(ctx, x, y, s, OAK, sway, seed); break;
    default: boulder(ctx, x, y, s, "#9a978f", "#5f8a3a", seed);
  }
};

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

const DEFAULT_BRIDGE = { beam: "#4a3018", plank: "#8f6a3e", plankDk: "#75512c", rail: "#5f4326" };

export const drawBridge = (ctx, b, time, posAt, angleAt, pal) => {
  const bp = pal || DEFAULT_BRIDGE;
  const half = 35;
  const len = b.d1 - b.d0;
  // the span's shadow on the water, then the beams
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.a);
  soft(ctx, 2, 5, len / 2 + 4, half + 4, [[0, "rgba(20,16,24,0.3)"], [0.8, "rgba(20,16,24,0.18)"], [1, "rgba(20,16,24,0)"]]);
  ctx.fillStyle = bp.beam;
  roundRect(ctx, -len / 2 - 2, -half - 2, len + 4, half * 2 + 4, 2);
  ctx.fill();
  ctx.restore();
  // planks along the road's real curve
  for (let d = b.d0 + 2; d < b.d1 - 1; d += 6) {
    const [px, py] = posAt(d);
    const a = angleAt(d);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    const k = Math.floor(d / 6);
    const col = k % 3 === 0 ? bp.plankDk : bp.plank;
    const g = ctx.createLinearGradient(-2.5, 0, 2.5, 0);
    g.addColorStop(0, lighten(col, 0.22)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.3));
    ctx.fillStyle = g;
    roundRect(ctx, -2.6, -half, 5.2, half * 2, 1);
    ctx.fill();
    ctx.restore();
  }
  // rails: posts every few paces, a beam along the top
  for (const side of [-1, 1]) {
    const railPts = [];
    for (let d = b.d0 + 2; d <= b.d1 - 1; d += 10) {
      const [px, py] = posAt(d);
      const a = angleAt(d) + Math.PI / 2;
      const rx = px + Math.cos(a) * half * side, ry = py + Math.sin(a) * half * side;
      cylinder(ctx, rx - 1.4, ry - 6, 2.8, 7, bp.rail, { r: 1 });
      railPts.push([rx, ry - 5.5]);
    }
    if (railPts.length > 1) strokePts(ctx, railPts, 1.8, lighten(bp.rail, 0.15));
    for (const dEnd of [b.d0, b.d1]) {
      const [px, py] = posAt(dEnd);
      const a = angleAt(dEnd) + Math.PI / 2;
      const rx = px + Math.cos(a) * half * side, ry = py + Math.sin(a) * half * side;
      cylinder(ctx, rx - 2.5, ry - 8, 5, 11, bp.beam, { r: 1.5 });
    }
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
    const g = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
    g.addColorStop(0, "#e4f2f8"); g.addColorStop(0.5, "#c2dbe6"); g.addColorStop(1, "#9cbccb");
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

// ---- the castle -------------------------------------------------------
// The crown's curtain wall runs the whole right edge of the board. Seen from
// above it is a walkway between two battlemented parapets, studded with round
// drum towers; where the road arrives, two great drums flank a gate as wide
// as the road itself, a bridge of wall crossing over it and a portcullis
// under that. The road runs into the dark beneath and the board ends.

const drum = (ctx, cx, cy, r, time, dire) => {
  const S1 = CASTLE_STONE;
  const bh = r * 2.3;
  const foot = cy + bh * 0.5;
  // it stands on the wall: a dark pool where it meets the walkway, a splayed
  // footing course, and square-bottomed masonry above that
  soft(ctx, cx + 2, foot + 1, r * 1.5, r * 0.42, [[0, "rgba(28,20,30,0.55)"], [0.6, "rgba(28,20,30,0.3)"], [1, "rgba(28,20,30,0)"]]);
  masonry(ctx, cx - r, cy - bh * 0.5, r * 2, bh - 3, S1, { r: r * 0.45, course: 6, block: r * 0.9 });
  ctx.fillStyle = darken(S1, 0.05);
  ctx.fillRect(cx - r, foot - 9, r * 2, 6);
  cylinder(ctx, cx - r - 2.5, foot - 5, r * 2 + 5, 5.5, darken(S1, 0.14), { r: 1.5, hi: 0.28, lo: 0.45 });
  cylinder(ctx, cx - r - 4, foot - 1.5, r * 2 + 8, 3, darken(S1, 0.28), { r: 1.2, hi: 0.2, lo: 0.45 });
  cylinder(ctx, cx - r - 2, cy - bh * 0.5 - 4, r * 2 + 4, 4.5, lighten(S1, 0.1), { r: 1.5, hi: 0.35, lo: 0.4 });
  ctx.fillStyle = "#2a2430";
  roundRect(ctx, cx - 1.6, cy - 4, 3.2, 11, 1.4); ctx.fill();
  if (Math.sin(time * 1.9 + cx * 0.3 + cy * 0.7) > -0.5 && !dire) glow(ctx, cx, cy + 1, 4, "#ffd070", 0.75);
  const apex = cy - bh * 0.5 - 4 - r * 1.5;
  cone(ctx, cx, apex, r * 1.15, r * 1.5, dire ? "#4a3a30" : ROOF, { scallops: 3, sag: 2, hi: 0.4, lo: 0.5 });
  ball(ctx, cx, apex, 1.8, 1.8, "#d8b34a", { hi: 0.5, lo: 0.3 });
  return apex;
};

// A run of top-down wall between y0 and y1: walkway, flagstones, parapets.
const wallRun = (ctx, x0, x1, y0, y1, vertical = true) => {
  const S1 = CASTLE_STONE;
  const g = vertical ? ctx.createLinearGradient(x0, 0, x1, 0) : ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, lighten(S1, 0.3)); g.addColorStop(0.5, lighten(S1, 0.14)); g.addColorStop(1, darken(S1, 0.12));
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = rgba(darken(S1, 0.6), 0.16);
  ctx.lineWidth = 0.8;
  if (vertical) for (let y = y0 + 6; y < y1; y += 9) { ctx.beginPath(); ctx.moveTo(x0 + 8, y); ctx.lineTo(x1 - 8, y); ctx.stroke(); }
  else for (let x = x0 + 6; x < x1; x += 9) { ctx.beginPath(); ctx.moveTo(x, y0 + 8); ctx.lineTo(x, y1 - 8); ctx.stroke(); }
  // parapets: a raised course each side, notched with crenels
  const pw = 7;
  const sides = vertical ? [[x0, y0, pw, y1 - y0], [x1 - pw, y0, pw, y1 - y0]] : [[x0, y0, x1 - x0, pw], [x0, y1 - pw, x1 - x0, pw]];
  for (const [px, py, w, h] of sides) {
    cylinder(ctx, px, py, w, h, S1, { r: 1, hi: 0.32, lo: 0.42 });
    ctx.fillStyle = darken(S1, 0.5);
    if (vertical) for (let y = py + 5; y < py + h - 4; y += 12) ctx.fillRect(px + 1.5, y, w - 3, 4);
    else for (let x = px + 5; x < px + w - 4; x += 12) ctx.fillRect(x, py + 1.5, 4, h - 3);
  }
};

export const drawCastle = (ctx, time, hpPct) => {
  const [gx, gy] = PTS[PTS.length - 1];
  const hurt = hpPct < 0.75, bad = hpPct < 0.5, dire = hpPct < 0.25;
  const S1 = CASTLE_STONE;
  const WB = W - 44;
  const G = 70;                                   // gate drums sit this far off the road's centre

  // the wall's foot: the ground darkens under it
  const ao = ctx.createLinearGradient(WB - 34, 0, WB, 0);
  ao.addColorStop(0, "rgba(28,20,30,0)"); ao.addColorStop(1, "rgba(28,20,30,0.38)");
  ctx.fillStyle = ao;
  ctx.fillRect(WB - 34, -10, 34, H + 20);
  // the road runs into the dark of the gate passage
  const pass = ctx.createLinearGradient(gx - 24, 0, gx + 18, 0);
  pass.addColorStop(0, "rgba(16,12,16,0)"); pass.addColorStop(1, "rgba(16,12,16,0.85)");
  ctx.fillStyle = pass;
  ctx.fillRect(gx - 24, gy - PATH_HALF - 3, W - gx + 24, PATH_HALF * 2 + 6);
  if (bad) {
    for (const [dx, dy, r] of [[-14, -22, 3.5], [-6, 20, 3], [-20, 6, 2.2], [2, -8, 2.6]]) ball(ctx, gx + dx, gy + dy, r, r * 0.75, darken(S1, 0.15), { hi: 0.4, lo: 0.45 });
  }

  // the curtain wall, north and south of the gate
  wallRun(ctx, WB, W + 4, -10, gy - G - 20);
  wallRun(ctx, WB, W + 4, gy + G + 20, H + 10);
  // lesser drums along its length
  for (let y = 70; y < H; y += 150) {
    if (Math.abs(y - gy) < G + 92) continue;   // never stacked on a gate drum's roof
    drum(ctx, WB + 18, y, 15, time, dire);
  }

  // the gate: a bridge of wall over the road, the portcullis under it
  wallRun(ctx, gx + 14, W + 4, gy - PATH_HALF - 7, gy + PATH_HALF + 7, false);
  ctx.fillStyle = "rgba(16,12,16,0.7)";
  ctx.fillRect(gx + 7, gy - PATH_HALF, 8, PATH_HALF * 2);
  ctx.fillStyle = "#8a909c";
  for (let y = gy - PATH_HALF + 3; y < gy + PATH_HALF - 2; y += 6) roundRect(ctx, gx + 8, y, 5.5, 2.4, 1), ctx.fill();
  ctx.fillStyle = "#b8bcc6";
  roundRect(ctx, gx + 8, gy - PATH_HALF - 1, 5.5, 3, 1); ctx.fill();
  roundRect(ctx, gx + 8, gy + PATH_HALF - 2, 5.5, 3, 1); ctx.fill();
  // the two great drums
  const apexN = drum(ctx, gx + 24, gy - G, 25, time, dire);
  const apexS = drum(ctx, gx + 24, gy + G, 25, time, dire);

  // battle damage: cracks in the drums, then smoke, then fire
  if (hurt) {
    ctx.strokeStyle = "rgba(40,32,28,0.6)";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(gx + 12, gy - G - 16); ctx.lineTo(gx + 15, gy - G - 4); ctx.lineTo(gx + 11, gy - G + 8); ctx.lineTo(gx + 14, gy - G + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + 36, gy + G - 12); ctx.lineTo(gx + 33, gy + G + 2); ctx.lineTo(gx + 37, gy + G + 14); ctx.stroke();
  }
  if (bad) {
    ctx.strokeStyle = "rgba(40,32,28,0.65)";
    ctx.beginPath(); ctx.moveTo(gx + 30, gy - G - 20); ctx.lineTo(gx + 27, gy - G - 6); ctx.lineTo(gx + 32, gy - G + 8); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const prog = ((time * 20 + i * 14) % 42) / 42;
      const smx = gx + 14 + i * 10 + Math.sin(time * 2 + i * 3) * 4;
      soft(ctx, smx, apexN - 4 - prog * 30, 4 + prog * 7, 4 + prog * 6, [[0, `rgba(120,116,112,${(1 - prog) * 0.5})`], [1, "rgba(120,116,112,0)"]]);
    }
  }
  if (dire) {
    for (let i = 0; i < 3; i++) {
      const fx = gx + 18 + i * 12;
      const fl = 0.5 + 0.5 * Math.sin(time * 14 + i * 2);
      soft(ctx, fx, gy + G - 30 - fl * 3, 4.5, 7 + fl * 4, [[0, "#ffe08a"], [0.35, "#f0903a"], [0.8, "rgba(200,60,30,0.7)"], [1, "rgba(200,60,30,0)"]], 0, 0.3);
    }
  }

  // pennants on the drums, and the great banner over the gate
  for (const [ax, ay, k] of [[gx + 24, apexN, 1], [gx + 24, apexS, -1]]) {
    cylinder(ctx, ax - 0.8, ay - 13, 1.6, 13, "#6a4a2e", { r: 0.8 });
    if (!dire) {
      const wv = Math.sin(time * 5 + k) * 1.5;
      ctx.beginPath();
      ctx.moveTo(ax - 0.8, ay - 13);
      ctx.quadraticCurveTo(ax - 5, ay - 13.5 + wv, ax - 9 - wv, ay - 11.5);
      ctx.quadraticCurveTo(ax - 5, ay - 9 + wv, ax - 0.8, ay - 8);
      ctx.closePath();
      ctx.fillStyle = "#e0bb48"; ctx.fill();
    }
  }
  cylinder(ctx, W - 12, gy - 24, 2.2, 24, "#6a4a2e", { r: 1 });
  if (!dire) {
    const wave = Math.sin(time * 4) * 1.8;
    const bw = bad ? 12 : 20, bh = bad ? 7 : 11;
    const px = W - 11, py = gy - 24;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px - bw * 0.5, py - 1 - wave, px - bw - wave, py + 1);
    ctx.lineTo(px - bw * 0.7 - wave, py + bh * 0.55);
    ctx.lineTo(px - bw - wave, py + bh);
    ctx.quadraticCurveTo(px - bw * 0.5, py + bh + 1 - wave, px, py + bh);
    ctx.closePath();
    const bg = ctx.createLinearGradient(px - bw, 0, px, 0);
    bg.addColorStop(0, "#c89a34"); bg.addColorStop(1, "#ecc95a");
    ctx.fillStyle = bg; ctx.fill();
    if (!bad) ball(ctx, px - 9, py + 5.5, 2.4, 2.4, "#7c3f4a", { hi: 0.4, lo: 0.3 });
  }
};

// ---- the enemy's gate -------------------------------------------------

export const drawSpawn = (ctx, time, kind) => {
  if (kind === "grove") drawGrove(ctx, time);
  else if (kind === "barrow") drawBarrow(ctx, time);
  else drawCave(ctx, time);
};

const eyes = (ctx, sx, sy, time, col) => {
  if (Math.sin(time * 1.1) > -0.8) {
    const a = Math.sin(time * 5) > 0 ? 0.95 : 0.5;
    glow(ctx, sx - 5, sy - 1, 3, col, a);
    glow(ctx, sx + 5, sy - 1, 3, col, a);
  }
};

// A burial mound with its doorway stones pushed open.
export const drawBarrow = (ctx, time) => {
  // the road starts at the board edge; the mouth it comes out of sits a
  // little inside it
  const [psx, psy] = PTS[0];
  const sx = psx < 60 ? psx + 30 : psx, sy = psy < 60 ? psy + 30 : psy;
  shadow(ctx, sx + 6, sy + 26, 40, 7, 0.32);
  ball(ctx, sx, sy + 4, 38, 24, "#48503f", { hi: 0.35, lo: 0.5, fy: -0.7 });
  soft(ctx, sx - 12, sy - 8, 14, 5, [[0, "rgba(90,104,76,0.6)"], [1, "rgba(90,104,76,0)"]]);
  soft(ctx, sx + 14, sy - 2, 12, 4, [[0, "rgba(90,104,76,0.5)"], [1, "rgba(90,104,76,0)"]]);
  ball(ctx, sx + 4, sy - 19, 1.4, 1.4, "#9a8ec4", { hi: 0.3, lo: 0.2 });
  // doorway
  ctx.fillStyle = "#14100c";
  roundRect(ctx, sx - 10, sy - 4, 20, 30, 2); ctx.fill();
  const breathe = 0.4 + 0.3 * Math.sin(time * 1.3);
  glow(ctx, sx, sy + 16, 12, "#7ce0b8", breathe * 0.3);
  cylinder(ctx, sx - 15, sy - 4, 5.5, 30, "#7d7666", { r: 1.5 });
  cylinder(ctx, sx + 9.5, sy - 4, 5.5, 30, "#7d7666", { r: 1.5 });
  cylinder(ctx, sx - 17, sy - 9, 34, 6, "#8a8478", { r: 2, hi: 0.3, lo: 0.35 });
  eyes(ctx, sx, sy + 3, time, "#7ce0b8");
  ball(ctx, sx - 27, sy + 21, 6, 5, "#7d7666", { hi: 0.4, lo: 0.5 });
  ball(ctx, sx + 27, sy + 23, 5, 3.5, "#6e6859", { hi: 0.4, lo: 0.5 });
  soft(ctx, sx - 2, sy + 26, 10, 2.5, [[0, "rgba(190,180,150,0.6)"], [1, "rgba(190,180,150,0)"]]);
};

// The mouth of the wood. The forest itself is real trees (terrain.js grows
// them along the board edge); this is only the dark the road runs into, the
// canopy closing over it, and what watches from inside.
export const drawGrove = (ctx, time) => {
  const [sx, sy] = PTS[0];
  const left = !FOREST || FOREST.edge !== "top";
  // the road darkens the whole way through the wood
  const reach = 104;
  const g = left ? ctx.createLinearGradient(sx + reach, 0, sx + 26, 0) : ctx.createLinearGradient(0, sy + reach, 0, sy + 26);
  g.addColorStop(0, "rgba(8,12,6,0)"); g.addColorStop(0.5, "rgba(8,12,6,0.72)"); g.addColorStop(1, "rgba(8,12,6,0.97)");
  ctx.fillStyle = g;
  if (left) ctx.fillRect(sx - 60, sy - PATH_HALF - 5, reach + 60, PATH_HALF * 2 + 10);
  else ctx.fillRect(sx - PATH_HALF - 5, sy - 60, PATH_HALF * 2 + 10, reach + 60);
  // boughs closing over the mouth
  const dark = "#17240f";
  if (left) {
    ball(ctx, sx + 30, sy - PATH_HALF - 8, 30, 15, dark, { hi: 0.25, lo: 0.45 });
    ball(ctx, sx + 34, sy + PATH_HALF + 10, 30, 15, dark, { hi: 0.25, lo: 0.45 });
    ball(ctx, sx + 2, sy - 6, 26, 20, dark, { hi: 0.2, lo: 0.4 });
  } else {
    ball(ctx, sx - PATH_HALF - 8, sy + 30, 15, 30, dark, { hi: 0.25, lo: 0.45 });
    ball(ctx, sx + PATH_HALF + 10, sy + 34, 15, 30, dark, { hi: 0.25, lo: 0.45 });
    ball(ctx, sx - 6, sy + 2, 20, 26, dark, { hi: 0.2, lo: 0.4 });
  }
  // leaves shaken loose where something is coming through
  for (let i = 0; i < 4; i++) {
    const t2 = (time * 14 + i * 9) % 30;
    const lx = sx - 10 + ((i * 11) % 32) + Math.sin(time * 2 + i) * 4;
    ball(ctx, left ? lx : sx - 16 + ((i * 11) % 32), left ? sy - 20 + t2 : sy - 26 + t2, 1.4, 1, i % 2 ? "#5f8a3a" : "#8fb04a", { hi: 0.3, lo: 0.2 });
  }
  eyes(ctx, left ? sx + 34 : sx, left ? sy - 1 : sy + 34, time, "#e05248");
  // trampled mud at the mouth
  soft(ctx, sx + 8, sy + (left ? 18 : 22), 14, 3.5, [[0, "rgba(90,74,48,0.55)"], [1, "rgba(90,74,48,0)"]]);
  soft(ctx, sx + 22, sy - (left ? 16 : -26), 10, 3, [[0, "rgba(90,74,48,0.45)"], [1, "rgba(90,74,48,0)"]]);
};

export const drawCave = (ctx, time) => {
  // the road starts at the board edge; the mouth it comes out of sits a
  // little inside it
  const [psx, psy] = PTS[0];
  const sx = psx < 60 ? psx + 30 : psx, sy = psy < 60 ? psy + 30 : psy;
  shadow(ctx, sx + 6, sy + 26, 38, 6, 0.3);
  ball(ctx, sx, sy + 2, 37, 26, "#6d6556", { hi: 0.35, lo: 0.55, fy: -0.7 });
  soft(ctx, sx - 10, sy - 14, 18, 7, [[0, "rgba(96,120,72,0.6)"], [1, "rgba(96,120,72,0)"]]);
  ball(ctx, sx - 25, sy + 8, 6, 4.5, "#7d7566", { hi: 0.4, lo: 0.5 });
  ball(ctx, sx + 24, sy + 2, 5, 4.5, "#7d7566", { hi: 0.4, lo: 0.5 });
  // the mouth
  ctx.beginPath();
  ctx.moveTo(sx - 17, sy + 26);
  ctx.quadraticCurveTo(sx - 18, sy - 8, sx, sy - 14);
  ctx.quadraticCurveTo(sx + 18, sy - 8, sx + 17, sy + 26);
  ctx.closePath();
  const mg = ctx.createLinearGradient(0, sy - 14, 0, sy + 26);
  mg.addColorStop(0, "#0e0b09"); mg.addColorStop(1, "#241c16");
  ctx.fillStyle = mg; ctx.fill();
  const rim = [[-19, 4], [-17, -6], [-9, -13], [1, -16], [10, -12], [17, -5], [19, 4]];
  for (const [rx, ry] of rim) ball(ctx, sx + rx, sy + ry, 4, 3, "#8a8272", { hi: 0.45, lo: 0.5 });
  eyes(ctx, sx, sy + 1, time, "#e05248");
  for (const [bx, by, r] of [[-22, 21, 4], [23, 23, 4], [23, 27, 2.2]]) ball(ctx, sx + bx, sy + by, r, r * 0.55, "#e0d6ba", { hi: 0.3, lo: 0.3 });
};

// Re-export the odd helper the render lab likes to borrow.
export { tuft };
