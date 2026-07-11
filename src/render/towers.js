// ============ RENDER: TOWERS ============
// The four tower drawings — archer platform, wizard spire, knight garrison,
// and warden priest altar — each reflecting level and evolution branch.

import { INK, CELL, S } from "../data/constants.js";
import { MINI, ARCHER_PALS, WIZ_PALS, PRIEST_PALS, drawSprite } from "../sprites/sprites.js";
import { getStats } from "../engine/towers.js";

export const drawArcherTower = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const lvl = t.level;
  const tall = t.branch === "b";
  const h = tall ? 38 : 14 + lvl * 6;
  const wdt = tall ? 12 : 8 + lvl * 2;
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - wdt - 2, y + 14, (wdt + 2) * 2, 4);
  const wood = lvl === 1 && !t.branch;
  ctx.fillStyle = INK;
  ctx.fillRect(x - wdt - 2, y - h + 6, wdt * 2 + 4, h + 10);
  ctx.fillStyle = wood ? "#8a6238" : "#9a958a";
  ctx.fillRect(x - wdt, y - h + 8, wdt * 2, h + 6);
  ctx.fillStyle = wood ? "#a0754a" : "#b5b0a2";
  ctx.fillRect(x - wdt, y - h + 8, 4, h + 6);
  if (wood) {
    ctx.fillStyle = "#6e4c28";
    for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 6, y - h + 8, 2, h + 6);
  } else {
    ctx.fillStyle = "#7d786e";
    for (let i = 0; i < 3; i++) ctx.fillRect(x - wdt, y - h + 14 + i * 8, wdt * 2, 2);
  }
  const pw = 14 + lvl * 2;
  ctx.fillStyle = INK;
  ctx.fillRect(x - pw - 2, y - h, (pw + 2) * 2, 11);
  ctx.fillStyle = "#8a6238";
  ctx.fillRect(x - pw, y - h + 2, pw * 2, 7);
  ctx.fillStyle = "#a0754a";
  ctx.fillRect(x - pw, y - h + 2, pw * 2, 2);
  ctx.fillStyle = "#5f4326";
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * S(pw / 2.2) - 2, y - h - 4, 4, 6);
  const bc = t.branch === "a" ? "#5c8a44" : t.branch === "b" ? "#4a6a92" : "#a04a3f";
  const wave = Math.round(Math.sin(time * 5 + t.id)) * CELL;
  ctx.fillStyle = "#5f4326";
  ctx.fillRect(x + pw - 2, y - h - 16, 2, 14);
  ctx.fillStyle = bc;
  ctx.fillRect(x + pw, y - h - 16, 8 + wave, 3);
  ctx.fillRect(x + pw, y - h - 13, 5 + wave, 3);
  // pixel archers on the platform
  const recoil = t.anim > 0.4 ? CELL : 0;
  const pal = ARCHER_PALS[t.branch || "base"];
  const dir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  const drawGuy = (gx, gy, big) => {
    const ax = t.x + gx, ay = t.y - h + gy - 8;
    drawSprite(ctx, MINI.archer, pal, 0, ax, ay, dir < 0);
    const bx = S(ax + dir * (7 - recoil));
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(bx, S(ay - (big ? 10 : 7)), 2, big ? 18 : 13);
  };
  if (t.branch === "a") { drawGuy(-9, -1); drawGuy(8, -2); drawGuy(0, -8); }
  else if (t.branch === "b") drawGuy(0, -4, true);
  else {
    const spots = lvl === 1 ? [[0, -3]] : lvl === 2 ? [[-7, -2], [7, -3]] : [[-9, -1], [9, -2], [0, -8]];
    for (const [dx, dy] of spots) drawGuy(dx, dy);
  }
};

export const drawWizardSpire = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const lvl = t.level;
  const pal = WIZ_PALS[t.branch || "base"];
  const trim = pal.h;
  const orbCol = pal.g;
  const bodyH = 16 + lvl * 5;
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - 13, y + 14, 26, 4);
  ctx.fillStyle = INK;
  ctx.fillRect(x - 12, y - bodyH - 2, 24, bodyH + 18);
  ctx.fillStyle = "#8a8496";
  ctx.fillRect(x - 10, y - bodyH, 20, bodyH + 14);
  ctx.fillStyle = "#a29cb2";
  ctx.fillRect(x - 10, y - bodyH, 4, bodyH + 14);
  ctx.fillStyle = trim;
  ctx.fillRect(x - 10, y - bodyH, 20, 3);
  const pulse = Math.sin(time * 3 + t.id) > 0;
  for (let i = 0; i < lvl; i++) {
    ctx.fillStyle = pulse ? "#e8d47a" : "#c4a94a";
    ctx.fillRect(x - 2, y - 2 - i * 8, 4, 4);
  }
  // top platform where the mage stands
  ctx.fillStyle = INK;
  ctx.fillRect(x - 15, y - bodyH - 8, 30, 8);
  ctx.fillStyle = "#8a6238";
  ctx.fillRect(x - 13, y - bodyH - 6, 26, 5);
  ctx.fillStyle = trim;
  ctx.fillRect(x - 14, y - bodyH - 8, 3, 4);
  ctx.fillRect(x + 11, y - bodyH - 8, 3, 4);
  if (lvl >= 2 || t.branch) {
    ctx.fillStyle = "#b8a2d8";
    for (let i = 0; i < 6; i++) {
      const ang = time * 0.9 + (i / 6) * Math.PI * 2;
      ctx.fillRect(S(x + Math.cos(ang) * 16), S(y - bodyH / 2 + Math.sin(ang) * 5), CELL, CELL);
    }
  }
  // the little mage on top
  const flipped = Math.cos(t.lastAim) < 0;
  const my = y - bodyH - 18;
  drawSprite(ctx, MINI.wizard, pal, 0, x - 1, my, flipped);
  // orb above the staff, flares when casting
  const bob = S(Math.sin(time * 2.5 + t.id) * 2);
  const big = t.anim > 0.4 ? CELL : 0;
  const orbX = x + (flipped ? -9 : 9);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(orbX, my - 12 + bob, 4 + big, 0, 7); ctx.fill();
  ctx.fillStyle = orbCol;
  ctx.beginPath(); ctx.arc(orbX, my - 12 + bob, 3 + big, 0, 7); ctx.fill();
  if (lvl >= 3 || t.branch) {
    ctx.fillStyle = orbCol;
    for (let i = 0; i < 3; i++) {
      const ang = time * 1.7 + i * 2.09 + t.id;
      const cx = S(x + Math.cos(ang) * 15);
      const cy = S(my - 4 + Math.sin(ang) * 5);
      ctx.fillRect(cx, cy - 2, CELL, CELL * 3);
      ctx.fillRect(cx - CELL, cy, CELL * 3, CELL);
    }
  }
};

export const drawGarrison = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const lvl = t.level;
  const paladin = t.branch === "a";
  const berserk = t.branch === "b";
  const bc = paladin ? "#d8b34a" : berserk ? "#a0473a" : "#a04a3f";
  const hw = 10 + lvl * 2;
  const wallH = 9 + lvl;
  const baseY = y + 14;
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - hw - 4, baseY, (hw + 4) * 2, 4);
  // palisade behind (Lv3+)
  if (lvl >= 3 || t.branch) {
    ctx.fillStyle = berserk ? "#4a3226" : "#6e4c28";
    for (let i = -3; i <= 3; i++) {
      const px = x + i * 7;
      const ph = 14 - Math.abs(i) * 2;
      ctx.fillRect(px - 2, baseY - wallH - 10 - ph, 4, ph + 6);
    }
  }
  // fence (Lv2+)
  if (lvl >= 2 || t.branch) {
    ctx.fillStyle = "#6e4c28";
    for (const side of [-1, 1]) {
      const fx = x + side * (hw + 9);
      ctx.fillRect(fx - 1, baseY - 10, 2, 10);
      ctx.fillRect(fx + side * 7 - 1, baseY - 8, 2, 8);
      ctx.fillRect(Math.min(fx, fx + side * 8) - 1, baseY - 7, 10, 2);
    }
  }
  // walls
  const wall = paladin ? "#d8d2be" : berserk ? "#6a4634" : "#9a7a52";
  const wallLt = paladin ? "#e8e0cc" : berserk ? "#7d5540" : "#ae8c60";
  ctx.fillStyle = INK;
  ctx.fillRect(x - hw - 2, baseY - wallH - 2, hw * 2 + 4, wallH + 2);
  ctx.fillStyle = wall;
  ctx.fillRect(x - hw, baseY - wallH, hw * 2, wallH);
  ctx.fillStyle = wallLt;
  ctx.fillRect(x - hw, baseY - wallH, 4, wallH);
  // pitched roof, stepped
  const roofCol = paladin ? "#d8b34a" : berserk ? "#48291f" : "#a0503c";
  const roofLt = paladin ? "#e8c968" : berserk ? "#5c3a2c" : "#b46450";
  const rows = 5;
  for (let i = 0; i < rows; i++) {
    const wRow = hw + 4 - Math.round(((i + 1) / rows) * (hw + 2));
    ctx.fillStyle = INK;
    ctx.fillRect(x - wRow - 2, baseY - wallH - 4 - i * 4, wRow * 2 + 4, 5);
  }
  for (let i = 0; i < rows; i++) {
    const wRow = hw + 3 - Math.round(((i + 1) / rows) * (hw + 2));
    if (wRow <= 0) break;
    ctx.fillStyle = i === 0 ? roofLt : roofCol;
    ctx.fillRect(x - wRow, baseY - wallH - 3 - i * 4, wRow * 2, 4);
  }
  // south-facing door (knights muster out of it)
  ctx.fillStyle = INK;
  ctx.fillRect(x - 4, baseY - wallH + 2, 8, wallH - 2);
  ctx.fillStyle = "#33291a";
  ctx.fillRect(x - 3, baseY - wallH + 3, 6, wallH - 3);
  // emblem
  ctx.fillStyle = bc;
  ctx.fillRect(x - hw + 3, baseY - wallH + 3, 5, 5);
  ctx.fillStyle = "#e0d6ba";
  ctx.fillRect(x - hw + 5, baseY - wallH + 5, 2, 2);
  // weapon rack (Lv2+)
  if (lvl >= 2 || t.branch) {
    const rx = x + hw + 6;
    ctx.fillStyle = "#c4c8d0";
    ctx.fillRect(rx - 3, baseY - 14, 2, 14);
    ctx.fillRect(rx + 1, baseY - 14, 2, 14);
    ctx.fillStyle = "#6e4c28";
    ctx.fillRect(rx - 5, baseY - 2, 10, 2);
  }
  // campfire (Lv3+)
  if (lvl >= 3 || t.branch) {
    const fx = S(x - hw - 10), fy = baseY - 4;
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(fx - 5, fy + 1, 10, 2);
    const fl = Math.sin(time * 13 + t.id) > 0 ? 2 : 0;
    ctx.fillStyle = "#d8763a";
    ctx.fillRect(fx - 2, fy - 6 - fl, 4, 6 + fl);
    ctx.fillStyle = "#e8d47a";
    ctx.fillRect(fx - 1, fy - 3 - fl, 2, 3 + fl);
  }
  // banner at the roof peak
  const wave = Math.round(Math.sin(time * 5 + t.id)) * CELL;
  const peakY = baseY - wallH - 3 - rows * 4;
  ctx.fillStyle = "#5f4326";
  ctx.fillRect(x - 1, peakY - 14, 2, 14);
  ctx.fillStyle = bc;
  ctx.fillRect(x + 1, peakY - 14, 10 + wave, 3);
  ctx.fillRect(x + 1, peakY - 11, 7 + wave, 3);
  // rally flag
  if (t.rally) {
    const rx = S(t.rally.x), ry = S(t.rally.y);
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(rx - 1, ry - 10, 2, 14);
    ctx.fillStyle = bc;
    ctx.fillRect(rx + 1, ry - 10, 7, 3);
    ctx.fillRect(rx + 1, ry - 7, 5, 2);
  }
};

export const drawSupportTower = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const lvl = t.level;
  const key = t.branch || "base";
  const pal = PRIEST_PALS[key];
  const st = getStats(t);
  const auraCol = key === "a" ? "140,224,140" : key === "b" ? "124,212,212" : key === "c" ? "216,179,74" : "224,214,186";
  const pr = ((time * 34 + t.id * 40) % st.range);
  ctx.strokeStyle = `rgba(${auraCol},${0.4 * (1 - pr / st.range)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke();
  ctx.strokeStyle = `rgba(${auraCol},0.16)`;
  ctx.beginPath(); ctx.arc(x, y, st.range, 0, 7); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - 13, y + 14, 26, 4);
  // stone altar platform (grows with level)
  const pw = 8 + lvl * 2;
  ctx.fillStyle = INK;
  ctx.fillRect(x - pw - 4, y + 4, (pw + 4) * 2, 12);
  ctx.fillStyle = "#948c80";
  ctx.fillRect(x - pw - 3, y + 6, (pw + 3) * 2, 8);
  ctx.fillStyle = INK;
  ctx.fillRect(x - pw - 1, y - 2, (pw + 1) * 2, 8);
  ctx.fillStyle = "#a8a094";
  ctx.fillRect(x - pw, y, pw * 2, 6);
  ctx.fillStyle = "#bcb4a6";
  ctx.fillRect(x - pw, y, 4, 6);
  // pillars + candles (Lv2+)
  if (lvl >= 2 || t.branch) {
    for (const side of [-1, 1]) {
      const px = x + side * (pw + 6);
      ctx.fillStyle = INK; ctx.fillRect(px - 3, y - 14, 6, 22);
      ctx.fillStyle = "#948c80"; ctx.fillRect(px - 2, y - 12, 4, 18);
      ctx.fillStyle = "#bcb4a6"; ctx.fillRect(px - 3, y - 15, 6, 3);
      const fl = Math.sin(time * 12 + side + t.id) > 0 ? CELL : 0;
      ctx.fillStyle = "#e8d47a";
      ctx.fillRect(px - 1, y - 19 - fl, 2, 3 + fl);
    }
  }
  // battle standard: banner pole behind the priest
  if (key === "c") {
    const wave = Math.round(Math.sin(time * 5 + t.id)) * CELL;
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(x + 8, y - 42, 2, 42);
    ctx.fillStyle = "#a0473a";
    ctx.fillRect(x + 10, y - 42, 13 + wave, 5);
    ctx.fillRect(x + 10, y - 37, 9 + wave, 4);
    ctx.fillStyle = "#d8b34a";
    ctx.fillRect(x + 11, y - 41, 5, 2);
  }
  // chronomancer: floating hourglass
  if (key === "b") {
    const hy = S(y - 34 + Math.sin(time * 2.5 + t.id) * 3);
    ctx.fillStyle = "#7cd4d4";
    ctx.fillRect(x + 9, hy, 6, 2);
    ctx.fillRect(x + 10, hy + 2, 4, 2);
    ctx.fillRect(x + 11, hy + 4, 2, 2);
    ctx.fillRect(x + 10, hy + 6, 4, 2);
    ctx.fillRect(x + 9, hy + 8, 6, 2);
  }
  // the priest, raising arms to cast blessings
  const raising = ((time * 0.9 + t.id * 0.7) % 1.6) < 0.55;
  drawSprite(ctx, MINI.priest, pal, raising ? 1 : 0, x, y - 14, false);
  // halo (Lv3+)
  if (lvl >= 3 || t.branch) {
    ctx.fillStyle = key === "a" ? "#bee8b0" : key === "b" ? "#c8ecec" : "#e8d47a";
    const hy = S(y - 30 + Math.sin(time * 2 + t.id) * 2);
    ctx.fillRect(x - 7, hy, 14, 2);
  }
  // blessings drifting down inside the aura
  ctx.fillStyle = `rgba(${auraCol},0.95)`;
  for (let i = 0; i < 3; i++) {
    const fall = ((time * 22 + i * 15 + t.id * 5) % 40);
    const bx = x + (i === 0 ? -14 : i === 1 ? 15 : -2) + Math.round(Math.sin(time * 2 + i) * 3);
    const by = y - 34 + fall;
    ctx.fillRect(S(bx) - CELL, S(by), CELL * 3, CELL);
    ctx.fillRect(S(bx), S(by) - CELL, CELL, CELL * 3);
  }
};
