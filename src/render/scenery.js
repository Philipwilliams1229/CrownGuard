// ============ RENDER: SCENERY ============
// Static map dressing per realm: trees/rocks and each realm's exotic decor
// (snow pines, ice, dead trees, lava vents, willows, glowing mushrooms,
// reeds), ponds, the castle (which cracks, smokes, and burns as its HP
// falls), and the enemy spawn cave.

import { INK, CELL, S } from "../data/constants.js";
import { PTS } from "../engine/path.js";

// A pine silhouette: three stacked tiers over a trunk, in the given greens.
// `caps` (optional) paints a strip of snow along the top of each tier.
const pineShape = (ctx, x, y, s, greens, caps) => {
  ctx.fillStyle = "#5f4326";
  ctx.fillRect(x - 2, y + 8, 4, 8);
  ctx.fillStyle = INK;
  for (let i = 0; i < 3; i++) {
    const wRow = S((13 - i * 3) * s);
    ctx.fillRect(x - wRow - 1, y + 8 - (i + 1) * S(9 * s), wRow * 2 + 2, S(9 * s) + 2);
  }
  for (let i = 0; i < 3; i++) {
    const wRow = S((12 - i * 3) * s);
    ctx.fillStyle = greens[i];
    ctx.fillRect(x - wRow, y + 7 - (i + 1) * S(9 * s), wRow * 2, S(9 * s));
    if (caps) {
      ctx.fillStyle = caps;
      ctx.fillRect(x - wRow, y + 7 - (i + 1) * S(9 * s), wRow * 2, 3);
    }
  }
};

// A rounded pixel boulder: stacked dome rows in the given palette.
const boulderShape = (ctx, x, y, s, base, top, glint) => {
  const rows = [[10, 0], [9, 1], [8, 2], [6, 3], [4, 4]];
  ctx.fillStyle = INK;
  for (const [wr, i] of rows) {
    const wRow = S(wr * s);
    ctx.fillRect(x - wRow - 2, y + 8 - (i + 1) * 5, wRow * 2 + 4, 7);
  }
  for (const [wr, i] of rows) {
    const wRow = S(wr * s);
    ctx.fillStyle = i >= 3 ? top : base;
    ctx.fillRect(x - wRow, y + 8 - (i + 1) * 5, wRow * 2, 5);
  }
  ctx.fillStyle = glint;
  ctx.fillRect(x - S(5 * s), y - 10, S(4 * s), 4);
  ctx.fillStyle = base;
  ctx.fillRect(x + S(11 * s), y + 6, 5, 4);
};

export const drawTree = (ctx, d, time) => {
  const x = S(d.x), y = S(d.y);
  const s = d.s;
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - S(10 * s), y + 14, S(20 * s), 4);
  if (d.t === "pine") {
    pineShape(ctx, x, y, s, ["#4a6a3e", "#557a46", "#628a50"]);
  } else if (d.t === "snowpine") {
    pineShape(ctx, x, y, s, ["#3a5648", "#446454", "#4f7260"], "#e8f2f6");
  } else if (d.t === "icerock") {
    boulderShape(ctx, x, y, s, "#9cb4c4", "#c4d8e4", "#ecf4f8");
  } else if (d.t === "obsidian") {
    boulderShape(ctx, x, y, s, "#352e40", "#443a52", "#6a5c84");
  } else if (d.t === "crystal") {
    // a cluster of ice shards, tallest in the middle, with a blinking glint
    const shards = [[-6, 9, 3, "#5a94b0"], [0, 16, 4, "#8fd0e8"], [6, 11, 3, "#7cc4e0"]];
    for (const [ox, hh, ww, col] of shards) {
      const sx = x + S(ox * s), sh = S(hh * s);
      ctx.fillStyle = INK;
      ctx.fillRect(sx - ww / 2 - 1, y + 8 - sh - 2, ww + 2, sh + 2);
      ctx.fillStyle = col;
      ctx.fillRect(sx - ww / 2, y + 8 - sh, ww, sh);
      ctx.fillStyle = "#c8ecf8";
      ctx.fillRect(sx - ww / 2, y + 8 - sh, 2, S(5 * s));
    }
    if (Math.sin(time * 3 + d.x) > 0.85) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 1, y + 8 - S(16 * s), 2, 2);
    }
  } else if (d.t === "deadtree") {
    // a bare, charred snag with a few reaching branch stubs
    ctx.fillStyle = INK;
    ctx.fillRect(x - 3, y - S(18 * s) - 1, 6, S(18 * s) + 17);
    ctx.fillStyle = "#4a3a30";
    ctx.fillRect(x - 2, y - S(18 * s), 4, S(18 * s) + 16);
    ctx.fillStyle = "#5a473a";
    ctx.fillRect(x - 2, y - S(18 * s), 2, S(18 * s) + 16);
    const limbs = [[-1, -14, -8, 6], [1, -10, 8, 5], [-1, -4, -7, 4]];
    for (const [dir, ly, lx, lw] of limbs) {
      ctx.fillStyle = INK;
      ctx.fillRect(x + (dir < 0 ? S(lx * s) - 1 : 1), y + S(ly * s) - 1, S(Math.abs(lx) * s) + 2, 4);
      ctx.fillStyle = "#4a3a30";
      ctx.fillRect(x + (dir < 0 ? S(lx * s) : 2), y + S(ly * s), S(Math.abs(lx) * s), 2);
      ctx.fillStyle = "#4a3a30";
      ctx.fillRect(x + S(lx * s) - (dir < 0 ? 0 : 2), y + S(ly * s) - lw, 2, lw);
    }
  } else if (d.t === "vent") {
    // a low volcanic mound with a glowing throat and a drifting ember
    const rows = [[9, 0], [7, 1], [5, 2]];
    ctx.fillStyle = INK;
    for (const [wr, i] of rows) {
      const wRow = S(wr * s);
      ctx.fillRect(x - wRow - 2, y + 8 - (i + 1) * 5, wRow * 2 + 4, 7);
    }
    for (const [wr, i] of rows) {
      const wRow = S(wr * s);
      ctx.fillStyle = i >= 2 ? "#4a3e42" : "#3a3234";
      ctx.fillRect(x - wRow, y + 8 - (i + 1) * 5, wRow * 2, 5);
    }
    const hot = Math.sin(time * 4 + d.x) > 0;
    ctx.fillStyle = hot ? "#e05a3a" : "#b0442e";
    ctx.fillRect(x - S(3 * s), y - 8, S(6 * s), 4);
    ctx.fillStyle = "#f0a04a";
    ctx.fillRect(x - 1, y - 7, 2, 2);
    const rise = (time * 14 + d.x) % 22;
    ctx.fillStyle = `rgba(240,160,80,${Math.max(0, 0.8 - rise / 22)})`;
    ctx.fillRect(x + Math.round(Math.sin(time * 2 + d.x) * 3), y - 10 - S(rise), 2, 2);
  } else if (d.t === "willow") {
    // a weeping willow: a tall domed canopy with strands hanging past the trunk
    ctx.fillStyle = "#3a2c1e";
    ctx.fillRect(x - 3, y + 2, 6, 14);
    ctx.fillStyle = "#4a3826";
    ctx.fillRect(x - 3, y + 2, 3, 14);
    ctx.fillStyle = INK;
    ctx.fillRect(x - S(14 * s) - 2, y - S(14 * s) - 2, S(28 * s) + 4, S(12 * s) + 4);
    ctx.fillRect(x - S(10 * s) - 2, y - S(21 * s) - 2, S(20 * s) + 4, S(9 * s) + 4);
    ctx.fillStyle = "#37502e";
    ctx.fillRect(x - S(14 * s), y - S(14 * s), S(28 * s), S(12 * s));
    ctx.fillStyle = "#47653a";
    ctx.fillRect(x - S(10 * s), y - S(21 * s), S(20 * s), S(9 * s));
    ctx.fillStyle = "#5d8050";
    ctx.fillRect(x - S(8 * s), y - S(20 * s), S(9 * s), S(4 * s));
    const sway = Math.sin(time * 1.4 + d.x) > 0 ? CELL : 0;
    for (let i = 0; i < 7; i++) {
      const ox = -S(13 * s) + i * S(4.4 * s);
      const len = S((10 + ((i * 13) % 3) * 4) * s);
      ctx.fillStyle = i % 2 ? "#37502e" : "#2c4026";
      ctx.fillRect(x + ox + (i % 2 ? sway : 0), y - S(4 * s), CELL, len);
    }
  } else if (d.t === "mushroom") {
    // an overgrown glowing toadstool, pulsing faintly in the murk
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.8 + d.x);
    ctx.fillStyle = `rgba(200,140,232,${0.08 + pulse * 0.08})`;
    ctx.beginPath(); ctx.arc(x, y - S(6 * s), S(16 * s), 0, 7); ctx.fill();
    ctx.fillStyle = "#cfc4ae";
    ctx.fillRect(x - 2, y - S(4 * s), 5, S(4 * s) + 14);
    ctx.fillStyle = "#b0a68e";
    ctx.fillRect(x + 1, y - S(4 * s), 2, S(4 * s) + 14);
    const rows = [[9, 0], [8, 1], [5, 2]];
    ctx.fillStyle = INK;
    for (const [wr, i] of rows) {
      const wRow = S(wr * s);
      ctx.fillRect(x - wRow - 1, y - S(4 * s) - (i + 1) * 5 - 1, wRow * 2 + 2, 7);
    }
    for (const [wr, i] of rows) {
      const wRow = S(wr * s);
      ctx.fillStyle = i >= 2 ? "#b878dc" : "#9a54c0";
      ctx.fillRect(x - wRow, y - S(4 * s) - (i + 1) * 5, wRow * 2, 5);
    }
    ctx.fillStyle = "#e8d0f4";
    ctx.fillRect(x - S(5 * s), y - S(4 * s) - 9, 2, 2);
    ctx.fillRect(x + S(3 * s), y - S(4 * s) - 12, 2, 2);
    ctx.fillRect(x - 1, y - S(4 * s) - 6, 2, 2);
  } else if (d.t === "reeds") {
    // a stand of marsh reeds with cattail tips, swaying together
    const sway = Math.sin(time * 1.6 + d.x) > 0 ? CELL : 0;
    const stalks = [[-5, 12], [-1, 17], [3, 14], [7, 10]];
    stalks.forEach(([ox, hh], i) => {
      const sx = x + S(ox * s), sh = S(hh * s);
      ctx.fillStyle = i % 2 ? "#6a7a4a" : "#56663c";
      ctx.fillRect(sx + sway, y + 8 - sh, 2, sh);
      if (i % 2 === 0) {
        ctx.fillStyle = "#6a4a2e";
        ctx.fillRect(sx + sway - 1, y + 8 - sh - 4, 4, 5);
      }
    });
  } else if (d.t === "tree") {
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(x - 2, y + 2, 5, 14);
    ctx.fillStyle = INK;
    ctx.fillRect(x - S(11 * s) - 1, y - S(16 * s) - 1, S(22 * s) + 2, S(16 * s) + 2);
    ctx.fillStyle = "#557a46";
    ctx.fillRect(x - S(11 * s), y - S(16 * s), S(22 * s), S(16 * s));
    ctx.fillStyle = "#628a50";
    ctx.fillRect(x - S(11 * s), y - S(16 * s), S(9 * s), S(7 * s));
  } else {
    boulderShape(ctx, x, y, s, "#8a8a92", "#a2a2aa", "#b8b8c0");
  }
};

// Themed still water. Ice is frozen solid (cracks + glint), lava glows and
// bubbles, swamp/plain water shimmers.
export const drawPond = (ctx, p, time) => {
  const x = S(p.x), y = S(p.y), w = S(p.w), h = S(p.h);
  const lx = x - w / 2, ty = y - h / 2;
  const rim = p.t === "lava" ? "#2e2826" : INK;
  ctx.fillStyle = rim;
  ctx.fillRect(lx - 2, ty - 2, w + 4, h + 4);
  if (p.t === "ice") {
    ctx.fillStyle = "#b8d4e0";
    ctx.fillRect(lx, ty, w, h);
    ctx.fillStyle = "#cee4ee";
    ctx.fillRect(lx, ty, w, CELL * 2);
    ctx.fillStyle = "#e8f4f8";
    ctx.fillRect(lx + w * 0.2, ty + h * 0.3, w * 0.4, CELL);
    ctx.fillRect(lx + w * 0.5, ty + h * 0.55, w * 0.3, CELL);
    ctx.fillRect(lx + w * 0.55, ty + h * 0.3, CELL, h * 0.3);
    if (Math.sin(time * 2.4 + p.x) > 0.8) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(lx + w * 0.3, ty + h * 0.4, 3, 3);
    }
  } else if (p.t === "lava") {
    // dark cooled crust ringing a molten heart
    ctx.fillStyle = "#241f1d";
    ctx.fillRect(lx - 3, ty - 3, w + 6, h + 6);
    ctx.fillStyle = "#6a2a20";
    ctx.fillRect(lx, ty, w, h);
    ctx.fillStyle = "#8e3a28";
    ctx.fillRect(lx + 4, ty + 4, w - 8, h - 8);
    ctx.fillStyle = "#d8763a";
    for (let i = 0; i < 4; i++) {
      const bub = Math.sin(time * 5 + i * 2.1 + p.x) > 0.2 ? CELL : 0;
      const bx = lx + 6 + ((i * 37) % Math.max(8, w - 14));
      const by = ty + 5 + ((i * 23) % Math.max(4, h - 12));
      ctx.fillRect(S(bx), S(by) - bub, CELL + 1, CELL + 1);
    }
    ctx.fillStyle = "#e8c14a";
    ctx.fillRect(S(lx + w / 2 + Math.sin(time * 2.2 + p.x) * w * 0.2), S(y), CELL, CELL);
    // faint heat shimmer above the crust
    ctx.fillStyle = "rgba(240,140,60,0.12)";
    ctx.fillRect(lx - 4, ty - 6, w + 8, h + 8);
  } else {
    const deep = p.t === "swamp" ? "#2c4638" : "#4a7a94";
    const edge = p.t === "swamp" ? "#3a563f" : "#5f92ac";
    const shine = p.t === "swamp" ? "#527a58" : "#8cc4d8";
    ctx.fillStyle = deep;
    ctx.fillRect(lx, ty, w, h);
    ctx.fillStyle = edge;
    ctx.fillRect(lx, ty, w, CELL * 2);
    ctx.fillStyle = shine;
    for (let i = 0; i < 3; i++) {
      const sx2 = p.x - p.w / 2 + 6 + ((time * 9 + i * 23) % Math.max(8, p.w - 14));
      const sy2 = p.y - p.h / 2 + 5 + i * Math.max(4, (p.h - 10) / 3);
      ctx.fillRect(S(sx2), S(sy2), CELL * 3, CELL);
    }
    if (p.t === "swamp") {
      // lily pads
      ctx.fillStyle = "#5a7a46";
      ctx.fillRect(S(p.x - p.w * 0.28), S(p.y + p.h * 0.12), 7, 4);
      ctx.fillRect(S(p.x + p.w * 0.18), S(p.y - p.h * 0.18), 6, 4);
      ctx.fillStyle = "#6d8c56";
      ctx.fillRect(S(p.x - p.w * 0.28), S(p.y + p.h * 0.12), 3, 2);
    }
  }
};

export const drawCastle = (ctx, time, hpPct) => {
  const [ex, ey] = PTS[PTS.length - 1];
  const x = S(ex + 6), y = S(ey);
  ctx.fillStyle = INK;
  ctx.fillRect(x - 37, y - 42, 74, 70);
  ctx.fillStyle = "#8a8474";
  ctx.fillRect(x - 24, y - 34, 48, 60);
  ctx.fillStyle = "#9b9584";
  ctx.fillRect(x - 24, y - 34, 20, 60);
  ctx.fillStyle = "#767061";
  for (let i = 0; i < 5; i++) {
    if (hpPct < 0.5 && i === 1) { ctx.fillRect(x - 24 + i * 11, y - 36, 7, 4); continue; }
    if (hpPct < 0.25 && i === 3) continue;
    ctx.fillRect(x - 24 + i * 11, y - 40, 7, 8);
  }
  ctx.fillStyle = "#7d7768";
  ctx.fillRect(x - 34, y - 26, 12, 52);
  ctx.fillRect(x + 22, y - 26, 12, 52);
  ctx.fillStyle = "#5f5a4d";
  for (let i = 0; i < 4; i++) {
    const wRow = 8 - i * 2;
    ctx.fillRect(x - 28 - wRow, y - 28 - i * 4, wRow * 2, 4);
    ctx.fillRect(x + 28 - wRow, y - 28 - i * 4, wRow * 2, 4);
  }
  if (hpPct < 0.75) {
    ctx.fillStyle = "#3a352c";
    ctx.fillRect(x - 14, y - 30, 2, 8); ctx.fillRect(x - 12, y - 22, 2, 6); ctx.fillRect(x - 15, y - 16, 2, 6);
    ctx.fillRect(x + 12, y - 6, 2, 8); ctx.fillRect(x + 9, y + 2, 2, 8);
  }
  if (hpPct < 0.5) {
    ctx.fillStyle = "#3a352c";
    ctx.fillRect(x + 4, y - 32, 2, 12); ctx.fillRect(x + 1, y - 20, 2, 10); ctx.fillRect(x + 5, y - 10, 2, 12);
    ctx.fillStyle = "#6a6456";
    ctx.fillRect(x - 22, y + 22, 6, 4); ctx.fillRect(x + 15, y + 23, 5, 3);
  }
  ctx.fillStyle = "#4a3a24";
  ctx.fillRect(x - 10, y - 2, 20, 28);
  ctx.fillRect(x - 8, y - 6, 16, 4);
  ctx.fillRect(x - 5, y - 9, 10, 3);
  ctx.fillStyle = "#33291a";
  for (let i = -6; i <= 6; i += 4) ctx.fillRect(x + i, y - 4, 2, 30);
  if (hpPct < 0.5) {
    for (let i = 0; i < 2; i++) {
      const prog = ((time * 22 + i * 18) % 36) / 36;
      ctx.fillStyle = `rgba(110,108,104,${(1 - prog) * 0.5})`;
      const smx = S(x - 6 + i * 14 + Math.sin(time * 2 + i * 3) * 3);
      ctx.beginPath(); ctx.arc(smx, S(y - 44 - prog * 26), 4 + prog * 4, 0, 7); ctx.fill();
    }
  }
  if (hpPct < 0.25) {
    for (let i = 0; i < 2; i++) {
      const fx = x - 10 + i * 20;
      const fl = Math.sin(time * 14 + i * 2) > 0 ? 4 : 0;
      ctx.fillStyle = "#d8763a";
      ctx.fillRect(fx - 3, y - 40 - fl, 6, 8 + fl);
      ctx.fillStyle = "#e8d47a";
      ctx.fillRect(fx - 1, y - 36 - fl, 2, 4 + fl);
    }
  }
  ctx.fillStyle = "#5f4326";
  ctx.fillRect(x - 1, y - 58, 2, 18);
  if (hpPct >= 0.25) {
    const wave = Math.round(Math.sin(time * 5)) * CELL;
    ctx.fillStyle = "#d8b34a";
    if (hpPct < 0.5) {
      ctx.fillRect(x - 9 - wave, y - 58, 9, 3);
      ctx.fillRect(x - 6 - wave, y - 53, 6, 3);
    } else {
      ctx.fillRect(x - 14 - wave, y - 58, 14, 4);
      ctx.fillRect(x - 10 - wave, y - 54, 10, 4);
    }
  }
};

export const drawCave = (ctx, time) => {
  const [psx, psy] = PTS[0];
  const sx = S(psx), sy = S(psy);
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(sx - 36, sy + 24, 72, 4);
  ctx.fillStyle = INK;
  for (let i = 0; i < 8; i++) {
    const wRow = 38 - i * 4;
    ctx.fillRect(sx - wRow - 1, sy + 26 - (i + 1) * 7, wRow * 2 + 2, 8);
  }
  for (let i = 0; i < 8; i++) {
    const wRow = 36 - i * 4;
    if (wRow <= 0) break;
    ctx.fillStyle = i > 4 ? "#4f6340" : "#6a6152";
    ctx.fillRect(sx - wRow, sy + 26 - (i + 1) * 7, wRow * 2, 7);
  }
  ctx.fillStyle = "#7a7264";
  ctx.fillRect(sx - 30, sy + 4, 10, 8);
  ctx.fillRect(sx + 20, sy - 2, 8, 8);
  ctx.fillStyle = "#14100c";
  for (let i = 0; i < 6; i++) {
    const wRow = 17 - i * 2;
    ctx.fillRect(sx - wRow, sy + 26 - (i + 1) * 7, wRow * 2, 8);
  }
  ctx.fillStyle = "#8a8272";
  const rim = [[-19, 4], [-17, -6], [-9, -13], [1, -16], [10, -12], [17, -5], [19, 4]];
  for (const [rx, ry] of rim) ctx.fillRect(S(sx + rx) - 3, S(sy + ry) - 2, 7, 5);
  if (Math.sin(time * 1.1) > -0.8) {
    ctx.fillStyle = Math.sin(time * 5) > 0 ? "#e05248" : "#a03a32";
    ctx.fillRect(sx - 6, sy, 3, 3);
    ctx.fillRect(sx + 4, sy, 3, 3);
  }
  ctx.fillStyle = "#e0d6ba";
  ctx.fillRect(sx - 26, sy + 20, 8, 2);
  ctx.fillRect(sx + 19, sy + 22, 8, 2);
  ctx.fillRect(sx + 21, sy + 25, 4, 4);
};
