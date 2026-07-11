// ============ RENDER: SCENERY ============
// Static map dressing: trees/rocks, the castle (which cracks, smokes, and
// burns as its HP falls), and the enemy spawn cave.

import { INK, CELL, S } from "../data/constants.js";
import { PTS } from "../engine/path.js";

export const drawTree = (ctx, d, time) => {
  const x = S(d.x), y = S(d.y);
  const s = d.s;
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - S(10 * s), y + 14, S(20 * s), 4);
  if (d.t === "pine") {
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(x - 2, y + 8, 4, 8);
    ctx.fillStyle = INK;
    for (let i = 0; i < 3; i++) {
      const wRow = S((13 - i * 3) * s);
      ctx.fillRect(x - wRow - 1, y + 8 - (i + 1) * S(9 * s), wRow * 2 + 2, S(9 * s) + 2);
    }
    const greens = ["#4a6a3e", "#557a46", "#628a50"];
    for (let i = 0; i < 3; i++) {
      const wRow = S((12 - i * 3) * s);
      ctx.fillStyle = greens[i];
      ctx.fillRect(x - wRow, y + 7 - (i + 1) * S(9 * s), wRow * 2, S(9 * s));
    }
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
    // rounded pixel boulder: stacked dome rows
    const rows = [[10, 0], [9, 1], [8, 2], [6, 3], [4, 4]];
    ctx.fillStyle = INK;
    for (const [wr, i] of rows) {
      const wRow = S(wr * s);
      ctx.fillRect(x - wRow - 2, y + 8 - (i + 1) * 5, wRow * 2 + 4, 7);
    }
    for (const [wr, i] of rows) {
      const wRow = S(wr * s);
      ctx.fillStyle = i >= 3 ? "#a2a2aa" : "#8a8a92";
      ctx.fillRect(x - wRow, y + 8 - (i + 1) * 5, wRow * 2, 5);
    }
    ctx.fillStyle = "#b8b8c0";
    ctx.fillRect(x - S(5 * s), y - 10, S(4 * s), 4);
    ctx.fillStyle = "#8a8a92";
    ctx.fillRect(x + S(11 * s), y + 6, 5, 4);
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
