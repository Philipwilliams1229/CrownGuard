// ============ RENDER: TOWERS ============
// The four tower drawings — archer platform, wizard spire, knight garrison,
// and warden priest altar — each reflecting level and evolution branch.

import { INK, CELL, S } from "../data/constants.js";
import { MINI, ARCHER_PALS, WIZ_PALS, PRIEST_PALS, drawSprite } from "../sprites/sprites.js";
import { getStats } from "../engine/towers.js";

// leather-hooded crew engineer who works the catapult
const CREW_PAL = { o: INK, h: "#7a5a34", b: "#6e4c28", s: "#e0b088", w: "#4a3018" };

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
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const bc = r4 === "aa" ? "#7cc85c" : r4 === "ab" ? "#9fc4dc" : r4 === "ba" ? "#c4c8d0" : r4 === "bb" ? "#d8b34a"
    : t.branch === "a" ? "#5c8a44" : t.branch === "b" ? "#4a6a92" : "#a04a3f";
  const wave = Math.round(Math.sin(time * 5 + t.id)) * CELL;
  ctx.fillStyle = "#5f4326";
  ctx.fillRect(x + pw - 2, y - h - 16, 2, 14);
  ctx.fillStyle = bc;
  ctx.fillRect(x + pw, y - h - 16, 8 + wave, 3);
  ctx.fillRect(x + pw, y - h - 13, 5 + wave, 3);
  // Briar Rangers: thorned vines climb the tower
  if (r4 === "aa") {
    ctx.fillStyle = "#3c6a34";
    for (let i = 0; i < Math.floor(h / 6); i++) {
      const vy = y + 8 - i * 6;
      ctx.fillRect(x - wdt - 2 + (i % 2) * 2, vy, CELL, 4);
      ctx.fillRect(x + wdt - (i % 2) * 2, vy - 3, CELL, 4);
    }
    ctx.fillStyle = "#7cc85c";
    for (let i = 0; i < 3; i++) ctx.fillRect(x - wdt - 2 + (i % 2) * 2, y + 2 - i * 11, CELL, CELL);
  }
  const recoil = t.anim > 0.4 ? CELL : 0;
  const dir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  if (r4 === "ba") {
    // Ballista: a mounted siege bow replaces the archer entirely
    const my = y - h - 6;
    ctx.fillStyle = INK;
    ctx.fillRect(x - 3, my - 2, 6, 10);
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(x - 2, my - 1, 4, 8);
    for (const side of [-1, 1]) {
      ctx.fillStyle = INK;
      for (let i = 0; i < 4; i++) ctx.fillRect(x + side * (3 + i * 3) - 1, my - 4 - i * 3, 4, 5);
      ctx.fillStyle = "#6e4c28";
      for (let i = 0; i < 4; i++) ctx.fillRect(x + side * (3 + i * 3), my - 3 - i * 3, 2, 3);
    }
    // bowstring + loaded steel bolt (recoils when fired)
    ctx.fillStyle = "#d2c6a2";
    ctx.fillRect(x - 12, my - 12 + recoil * 2, 24, 1);
    ctx.fillStyle = "#c4c8d0";
    ctx.fillRect(x - 1 + dir * recoil, my - 14, 2, 12);
    ctx.fillRect(x - 2 + dir * recoil, my - 15, 4, 3);
    // crew engineer at the winch
    drawSprite(ctx, MINI.archer, CREW_PAL, 0, x + 12, y - h - 2, dir < 0);
  } else {
    const pal = ARCHER_PALS[r4 && ARCHER_PALS[r4] ? r4 : t.branch || "base"];
    const drawGuy = (gx, gy, big) => {
      const ax = t.x + gx, ay = t.y - h + gy - 8;
      drawSprite(ctx, MINI.archer, pal, 0, ax, ay, dir < 0);
      const bx = S(ax + dir * (7 - recoil));
      ctx.fillStyle = r4 === "bb" ? "#8a2f24" : "#4a3018";
      ctx.fillRect(bx, S(ay - (big ? 10 : 7)), 2, big ? 18 : 13);
    };
    if (t.branch === "a") { drawGuy(-9, -1); drawGuy(8, -2); drawGuy(0, -8); }
    else if (t.branch === "b") drawGuy(0, -4, true);
    else {
      const spots = lvl === 1 ? [[0, -3]] : lvl === 2 ? [[-7, -2], [7, -3]] : [[-9, -1], [9, -2], [0, -8]];
      for (const [dx, dy] of spots) drawGuy(dx, dy);
    }
    // Dragonslayer: a bleached dragon-skull trophy on the platform edge
    if (r4 === "bb") {
      const sx2 = x - pw + 2, sy2 = y - h - 6;
      ctx.fillStyle = INK;
      ctx.fillRect(sx2 - 1, sy2 - 1, 9, 7);
      ctx.fillStyle = "#ece0c4";
      ctx.fillRect(sx2, sy2, 7, 5);
      ctx.fillStyle = INK;
      ctx.fillRect(sx2 + 1, sy2 + 1, 2, 2);
      ctx.fillRect(sx2 + 4, sy2 + 1, 2, 2);
      ctx.fillStyle = "#ece0c4";
      ctx.fillRect(sx2 - 2, sy2 - 3, 2, 3);
      ctx.fillRect(sx2 + 7, sy2 - 3, 2, 3);
    }
    // Hawkeye Conclave: a hawk wheels above the tower
    if (r4 === "ab") {
      const ang = time * 1.6 + t.id;
      const hx2 = S(x + Math.cos(ang) * 18);
      const hy2 = S(y - h - 22 + Math.sin(ang) * 5);
      const flap = Math.sin(time * 9) > 0;
      ctx.fillStyle = INK;
      ctx.fillRect(hx2 - 1, hy2, 4, 2);
      ctx.fillStyle = "#8a6f4a";
      ctx.fillRect(hx2 - 4, hy2 - (flap ? 2 : 0), 4, 2);
      ctx.fillRect(hx2 + 2, hy2 - (flap ? 2 : 0), 4, 2);
    }
  }
};

export const drawWizardSpire = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const lvl = t.level;
  const r4 = t.rank4 && t.branch ? t.branch + t.rank4 : null;
  const pal = WIZ_PALS[r4 && WIZ_PALS[r4] ? r4 : t.branch || "base"];
  // rank-4 flourishes: lava glow, drifting embers, crackling static
  if (r4 === "aa") {
    ctx.fillStyle = `rgba(216,118,58,${0.35 + 0.15 * Math.sin(time * 4 + t.id)})`;
    ctx.beginPath(); ctx.arc(x, y + 10, 16, 0, 7); ctx.fill();
  }
  if (r4 === "ab") {
    ctx.fillStyle = "#e88a3a";
    for (let i = 0; i < 3; i++) {
      const ey2 = y + 8 - ((time * 26 + i * 14 + t.id * 7) % 44);
      ctx.fillRect(S(x - 10 + i * 10 + Math.sin(time * 3 + i) * 3), S(ey2), CELL, CELL);
    }
  }
  if (r4 === "ba" || r4 === "bb" || t.branch === "b") {
    if (Math.sin(time * 11 + t.id) > 0.55) {
      ctx.fillStyle = "#f8f0a0";
      const ang = time * 5 + t.id;
      const zx = S(x + Math.cos(ang) * 13), zy = S(y - 18 + Math.sin(ang) * 8);
      ctx.fillRect(zx, zy, 2, 4);
      ctx.fillRect(zx + 2, zy + 3, 2, 4);
    }
  }
  const trim = pal.h;
  const orbCol = pal.g;
  const bodyH = 16 + lvl * 5;
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - 13, y + 14, 26, 4);
  // orbiting runes (Lv2+): the back half of the ring hides behind the spire,
  // so those are painted before the body and the rest after.
  const runes = [];
  if (lvl >= 2 || t.branch) {
    for (let i = 0; i < 6; i++) {
      const ang = time * 0.9 + (i / 6) * Math.PI * 2;
      runes.push({ rx: S(x + Math.cos(ang) * 16), ry: S(y - bodyH / 2 + Math.sin(ang) * 5), front: Math.sin(ang) >= 0 });
    }
    ctx.fillStyle = "#b8a2d8";
    for (const r of runes) if (!r.front) ctx.fillRect(r.rx, r.ry, CELL, CELL);
  }
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
  if (runes.length) {
    ctx.fillStyle = "#b8a2d8";
    for (const r of runes) if (r.front) ctx.fillRect(r.rx, r.ry, CELL, CELL);
  }
  // the mage grows with his tower: apprentice -> staff-bearer -> long-beard
  const flipped = Math.cos(t.lastAim) < 0;
  const my = y - bodyH - 18;
  const mspr = t.branch || lvl >= 3 ? MINI.wizardLv3 : lvl === 2 ? MINI.wizardLv2 : MINI.wizardLv1;
  // spinning star-charms (Lv3+): the back arc passes BEHIND the mage
  const stars = [];
  if (lvl >= 3 || t.branch) {
    for (let i = 0; i < 3; i++) {
      const ang = time * 1.7 + i * 2.09 + t.id;
      stars.push({ cx: S(x + Math.cos(ang) * 15), cy: S(my - 4 + Math.sin(ang) * 5), front: Math.sin(ang) >= 0 });
    }
  }
  const drawStar = (s) => {
    ctx.fillStyle = orbCol;
    ctx.fillRect(s.cx, s.cy - 2, CELL, CELL * 3);
    ctx.fillRect(s.cx - CELL, s.cy, CELL * 3, CELL);
  };
  for (const s of stars) if (!s.front) drawStar(s);
  drawSprite(ctx, mspr, pal, 0, x - 1, my, flipped);
  // casting orb: apprentices conjure it bare-handed; staff-bearers carry it
  // at the staff tip. It flares when casting.
  const bob = S(Math.sin(time * 2.5 + t.id) * 2);
  const big = t.anim > 0.4 ? CELL : 0;
  const hasStaff = lvl >= 2 || t.branch;
  const orbX = hasStaff ? x - 1 + (flipped ? -7 : 7) : x + (flipped ? -9 : 9);
  const orbY = (hasStaff ? my - 12 : my - 4) + bob;
  const rOut = (t.branch || lvl >= 3 ? 4.5 : lvl === 2 ? 3.5 : 3) + big;
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(orbX, orbY, rOut, 0, 7); ctx.fill();
  ctx.fillStyle = orbCol;
  ctx.beginPath(); ctx.arc(orbX, orbY, rOut - 1.2, 0, 7); ctx.fill();
  for (const s of stars) if (s.front) drawStar(s);
};

export const drawCatapult = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const lvl = t.level;
  const treb = t.branch === "a";
  const scat = t.branch === "b";
  const wood = treb ? "#6e4c28" : "#8a6238";
  const woodLt = treb ? "#7d5a34" : "#a0754a";
  const dark = "#4a3018";
  const bc = treb ? "#4a6a92" : scat ? "#a0473a" : "#a04a3f";
  const hw = 12 + lvl * 2;
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - hw - 2, y + 14, (hw + 2) * 2, 4);
  // wooden deck
  ctx.fillStyle = INK;
  ctx.fillRect(x - hw - 2, y + 2, hw * 2 + 4, 14);
  ctx.fillStyle = wood;
  ctx.fillRect(x - hw, y + 4, hw * 2, 10);
  ctx.fillStyle = woodLt;
  ctx.fillRect(x - hw, y + 4, hw * 2, 3);
  ctx.fillStyle = dark;
  for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 8 - 1, y + 4, 2, 10);
  // wheels
  ctx.fillStyle = INK;
  ctx.fillRect(x - hw - 3, y + 8, 6, 8);
  ctx.fillRect(x + hw - 3, y + 8, 6, 8);
  ctx.fillStyle = "#33291a";
  ctx.fillRect(x - hw - 2, y + 9, 4, 6);
  ctx.fillRect(x + hw - 2, y + 9, 4, 6);
  // A-frame uprights (trebuchet stands much taller)
  const fh = treb ? 30 : 16 + lvl * 2;
  ctx.fillStyle = INK;
  ctx.fillRect(x - 7, y + 4 - fh, 5, fh);
  ctx.fillRect(x + 3, y + 4 - fh, 5, fh);
  ctx.fillStyle = wood;
  ctx.fillRect(x - 6, y + 4 - fh + 1, 3, fh - 2);
  ctx.fillRect(x + 4, y + 4 - fh + 1, 3, fh - 2);
  // crossbeam at pivot
  const py = y + 4 - fh + 2;
  ctx.fillStyle = INK;
  ctx.fillRect(x - 9, py - 2, 18, 5);
  ctx.fillStyle = woodLt;
  ctx.fillRect(x - 8, py - 1, 16, 3);
  // throwing arm: cocked back while loading, swung forward right after a shot
  const fired = t.anim > 0.45;
  const dir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  const steps = 4 + (treb ? 2 : 0);
  ctx.fillStyle = dark;
  for (let i = 1; i <= steps; i++) {
    const ax = x + (fired ? dir : -dir) * i * 3;
    const ay = py - i * 3;
    ctx.fillRect(S(ax) - 1, S(ay) - 1, 4, 4);
  }
  const tipX = x + (fired ? dir : -dir) * steps * 3;
  const tipY = py - steps * 3;
  if (treb) {
    // counterweight box swings opposite the arm
    const cwX = x + (fired ? -dir : dir) * 8;
    ctx.fillStyle = INK;
    ctx.fillRect(S(cwX) - 5, py + 2, 10, 10);
    ctx.fillStyle = "#5f5a4d";
    ctx.fillRect(S(cwX) - 4, py + 3, 8, 8);
  }
  // cup with rock(s) when loaded
  ctx.fillStyle = INK;
  ctx.fillRect(S(tipX) - 4, S(tipY) - 2, 8, 4);
  if (!fired) {
    if (scat) {
      ctx.fillStyle = "#b8b8c0";
      ctx.fillRect(S(tipX) - 5, S(tipY) - 6, 4, 4);
      ctx.fillRect(S(tipX) - 1, S(tipY) - 7, 4, 4);
      ctx.fillRect(S(tipX) + 3, S(tipY) - 5, 3, 3);
    } else {
      ctx.fillStyle = "#8a8a92";
      ctx.fillRect(S(tipX) - 3, S(tipY) - (treb ? 9 : 7), treb ? 8 : 6, treb ? 8 : 6);
      ctx.fillStyle = "#a2a2aa";
      ctx.fillRect(S(tipX) - 2, S(tipY) - (treb ? 8 : 6), 2, 2);
    }
  }
  // rank-4 flourishes
  const r4 = t.rank4 && t.branch ? t.branch + t.rank4 : null;
  if (r4 === "ab" && !fired) {
    // Comet Sling: the loaded stone burns
    const fl = Math.sin(time * 12 + t.id) > 0 ? 2 : 0;
    ctx.fillStyle = "#d8763a";
    ctx.fillRect(S(tipX) - 2, S(tipY) - 13 - fl, 5, 4 + fl);
    ctx.fillStyle = "#e8d47a";
    ctx.fillRect(S(tipX), S(tipY) - 11 - fl, 2, 2);
  }
  if (r4 === "aa") {
    // Earthshaker: the ground around it is cracked
    ctx.fillStyle = "#4f4636";
    ctx.fillRect(x - hw - 6, y + 16, 8, 2);
    ctx.fillRect(x + hw + 1, y + 17, 7, 2);
    ctx.fillRect(x - 2, y + 18, 5, 2);
  }
  if (r4 === "ba") {
    // Rockstorm Battery: a ready drum of stones on the deck
    ctx.fillStyle = "#b8b8c0";
    for (let i = 0; i < 5; i++) ctx.fillRect(x - 8 + i * 4, y + 5, 3, 3);
  }
  if (r4 === "bb") {
    // Grapeshot: iron-banded frame
    ctx.fillStyle = "#9aa0ac";
    ctx.fillRect(x - 7, y + 4 - fh + 4, 4, 2);
    ctx.fillRect(x + 3, y + 4 - fh + 4, 4, 2);
    ctx.fillRect(x - hw + 2, y + 6, 3, 8);
  }
  // spare boulder pile beside the deck
  ctx.fillStyle = "#8a8a92";
  ctx.fillRect(x - hw - 8, y + 10, 5, 5);
  ctx.fillRect(x - hw - 12, y + 12, 4, 4);
  if (lvl >= 2 || t.branch) ctx.fillRect(x - hw - 10, y + 6, 4, 4);
  // banner
  const wave = Math.round(Math.sin(time * 5 + t.id)) * CELL;
  ctx.fillStyle = "#5f4326";
  ctx.fillRect(x + hw + 4, y - 14, 2, 28);
  ctx.fillStyle = bc;
  ctx.fillRect(x + hw + 6, y - 14, 8 + wave, 3);
  ctx.fillRect(x + hw + 6, y - 11, 5 + wave, 3);
  // crew engineer working the winch
  drawSprite(ctx, MINI.archer, CREW_PAL, 0, x + hw + 2, y - 2, dir < 0);
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
  const r4 = t.rank4 && t.branch ? t.branch + t.rank4 : null;
  const key = r4 && PRIEST_PALS[r4] ? r4 : t.branch || "base";
  const pal = PRIEST_PALS[key];
  const st = getStats(t);
  const ice = !t.branch || t.branch === "a";
  const auraCol = r4 === "aa" ? "184,240,248" : r4 === "ba" ? "232,212,122" : r4 === "bb" ? "216,179,74"
    : t.branch === "b" ? "140,224,140" : ice ? "124,212,212" : "200,232,240";
  // a single pulsing ring reads the aura; no constant outer circle
  const pr = ((time * 34 + t.id * 40) % st.range);
  ctx.strokeStyle = `rgba(${auraCol},${0.4 * (1 - pr / st.range)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke();
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
  // ice branch: a floating shard of never-melting ice
  if (t.branch === "a") {
    const hy = S(y - 34 + Math.sin(time * 2.5 + t.id) * 3);
    ctx.fillStyle = "#8ce8f0";
    ctx.fillRect(x + 10, hy, 2, 2);
    ctx.fillRect(x + 9, hy + 2, 4, 4);
    ctx.fillRect(x + 10, hy + 6, 2, 3);
    ctx.fillStyle = "#e8f8fc";
    ctx.fillRect(x + 10, hy + 2, 2, 2);
    // Absolute Zero: a second shard orbits; Permafrost: frost creeps up the altar
    if (r4 === "aa") {
      const ang = time * 2.2 + t.id;
      ctx.fillStyle = "#b8f0f8";
      ctx.fillRect(S(x + Math.cos(ang) * 14), S(y - 30 + Math.sin(ang) * 4), 3, 4);
    }
    if (r4 === "ab") {
      ctx.fillStyle = "#c8ecf4";
      for (const side of [-1, 1]) {
        ctx.fillRect(x + side * (pw + 2) - 1, y - 4, 2, 4);
        ctx.fillRect(x + side * (pw - 3) - 1, y - 6, 2, 6);
      }
    }
  }
  // life branch rank-4 accents: a golden ward, or the cathedral's gilded spire
  if (r4 === "ba") {
    const hy = S(y - 36 + Math.sin(time * 2.5 + t.id) * 3);
    ctx.fillStyle = "#e8d47a";
    ctx.fillRect(x + 9, hy, 2, 2);
    ctx.fillRect(x + 7, hy + 2, 6, 2);
    ctx.fillRect(x + 9, hy + 4, 2, 2);
  }
  if (r4 === "bb") {
    ctx.fillStyle = "#5f4326";
    ctx.fillRect(x + 9, y - 44, 2, 30);
    ctx.fillStyle = "#d8b34a";
    ctx.fillRect(x + 7, y - 40, 6, 2);
    ctx.fillRect(x + 9, y - 46, 2, 8);
  }
  // the priest, raising arms to cast blessings
  const raising = ((time * 0.9 + t.id * 0.7) % 1.6) < 0.55;
  drawSprite(ctx, MINI.priest, pal, raising ? 1 : 0, x, y - 14, false);
  // halo (Lv3+)
  if (lvl >= 3 || t.branch) {
    ctx.fillStyle = pal.c;
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
