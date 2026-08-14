// ============ RENDER: TOWERS ============
// The four tower drawings — archer platform, wizard spire, knight garrison,
// and warden priest altar — each reflecting level and evolution branch.

import { INK, CELL, S } from "../data/constants.js";
import { MINI, ARCHER_PALS, WIZ_PALS, PRIEST_PALS, drawSprite } from "../sprites/sprites.js";
import { getStats } from "../engine/towers.js";

// leather-hooded crew engineer who works the catapult
const CREW_PAL = { o: INK, h: "#7a5a34", b: "#6e4c28", s: "#e0b088", w: "#4a3018" };

// ============ SURFACES ============
// Flat fills read as filing cabinets now that the board renders at full
// resolution, so walls are laid as courses of blocks and decks as planks.
// Everything is keyed off position rather than randomness, so a given tower
// looks the same every frame.

const STONE = { mid: "#9a958a", lit: "#b5b0a2", shade: "#7a756c", mortar: "#615d56", dark: "#8a857b" };
const PALE_STONE = { mid: "#d8d2be", lit: "#ece7d6", shade: "#b0aa96", mortar: "#8f8a78", dark: "#c8c2ae" };
const DAUB = { mid: "#9a7a52", lit: "#ae8c60", shade: "#7a5e3e", mortar: "#5f4326", dark: "#8c6e49" };
const DARKWOOD_WALL = { mid: "#6a4634", lit: "#7d5540", shade: "#523528", mortar: "#3c2419", dark: "#5f3f2f" };
const ALTAR = { mid: "#948c80", lit: "#bcb4a6", shade: "#786f64", mortar: "#5c554c", dark: "#8a8276" };
const SPIRE = { mid: "#8a8496", lit: "#a29cb2", shade: "#6c6678", mortar: "#544f60", dark: "#7d7788" };

const hash2 = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

// slow candle flicker behind a spire window
const pulseWin = (time, id) => Math.sin(time * 1.7 + id) > -0.4;

// A block wall: courses about six pixels deep, joints staggered course by
// course, one stone in six laid darker, and the sunward edge picked out.
export const stoneWall = (ctx, x, top, w, h, pal = STONE) => {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = pal.mid;
  ctx.fillRect(x, top, w, h);
  const ch = 6;
  const bw = Math.max(6, Math.floor(w / 2));
  for (let cy = top, row = 0; cy < top + h; cy += ch, row++) {
    const rh = Math.min(ch, top + h - cy);
    const off = row % 2 ? 0 : Math.floor(bw / 2);
    // the odd darker block
    for (let bx = x - off; bx < x + w; bx += bw) {
      if (hash2(row, Math.floor(bx / bw)) % 6 === 0) {
        const x0 = Math.max(x, bx), x1 = Math.min(x + w, bx + bw - 1);
        if (x1 > x0) { ctx.fillStyle = pal.dark; ctx.fillRect(x0, cy, x1 - x0, rh - 1); }
      }
    }
    ctx.fillStyle = pal.mortar;
    if (rh > 1) ctx.fillRect(x, cy + rh - 1, w, 1);          // bed joint
    for (let bx = x - off + bw; bx < x + w; bx += bw) {       // head joints
      ctx.fillRect(bx, cy, 1, rh - 1);
    }
  }
  ctx.fillStyle = pal.lit;
  ctx.fillRect(x, top, 2, h);
  ctx.fillStyle = pal.shade;
  ctx.fillRect(x + w - 3, top, 3, h);
};

// Sawn planks, laid across. `vert` stands them on end for a palisade or shaft.
export const plankFace = (ctx, x, top, w, h, mid = "#8a6238", lit = "#a0754a", dark = "#5f4326", vert = false) => {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = mid;
  ctx.fillRect(x, top, w, h);
  ctx.fillStyle = dark;
  if (vert) {
    for (let px = x + 5; px < x + w - 1; px += 6) ctx.fillRect(px, top, 1, h);
    for (let px = x + 2; px < x + w - 1; px += 6) {           // grain
      ctx.fillRect(px, top + 2 + (hash2(px, 1) % 4), 1, 3);
    }
  } else {
    for (let py = top + 4; py < top + h - 1; py += 5) ctx.fillRect(x, py, w, 1);
    for (let py = top + 1; py < top + h - 1; py += 5) {
      const gx = x + 2 + (hash2(py, 3) % Math.max(1, w - 6));
      ctx.fillRect(gx, py, 3, 1);
    }
  }
  ctx.fillStyle = lit;
  ctx.fillRect(x, top, vert ? 2 : w, vert ? h : 2);
};

// A stepped footing so a tower sits on the ground instead of ending at it.
export const plinth = (ctx, x, baseY, halfW, pal = STONE) => {
  ctx.fillStyle = INK;
  ctx.fillRect(x - halfW - 4, baseY - 5, (halfW + 4) * 2, 7);
  ctx.fillStyle = pal.mid;
  ctx.fillRect(x - halfW - 3, baseY - 4, (halfW + 3) * 2, 5);
  ctx.fillStyle = pal.lit;
  ctx.fillRect(x - halfW - 3, baseY - 4, (halfW + 3) * 2, 1);
  ctx.fillStyle = pal.shade;
  ctx.fillRect(x - halfW - 3, baseY, (halfW + 3) * 2, 1);
  ctx.fillStyle = pal.mortar;
  for (let i = -halfW; i < halfW; i += 8) ctx.fillRect(x + i, baseY - 4, 1, 5);
};

// Corbels: the little brackets that carry a platform over a shaft.
export const corbels = (ctx, x, y, halfW, col = "#5f4326") => {
  ctx.fillStyle = INK;
  for (const s of [-1, 1]) ctx.fillRect(x + s * halfW - (s < 0 ? 5 : 0), y, 5, 6);
  ctx.fillStyle = col;
  for (const s of [-1, 1]) ctx.fillRect(x + s * halfW - (s < 0 ? 4 : 0), y + 1, 3, 4);
};

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
  if (wood) plankFace(ctx, x - wdt, y - h + 8, wdt * 2, h + 6, "#8a6238", "#a0754a", "#5f4326", true);
  else stoneWall(ctx, x - wdt, y - h + 8, wdt * 2, h + 6);
  plinth(ctx, x, y + 14, wdt, wood ? DAUB : STONE);
  const pw = 14 + lvl * 2;
  corbels(ctx, x, y - h + 8, wdt + 2);
  ctx.fillStyle = INK;
  ctx.fillRect(x - pw - 2, y - h, (pw + 2) * 2, 11);
  plankFace(ctx, x - pw, y - h + 2, pw * 2, 7);
  // rail posts around the platform edge
  ctx.fillStyle = "#5f4326";
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * S(pw / 2.2) - 2, y - h - 4, 4, 6);
  ctx.fillStyle = "#4a3018";
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * S(pw / 2.2) - 2, y - h - 4, 1, 6);
  const r4 = t.rank4 ? t.branch + t.rank4 : null;
  const bc = r4 === "aa" ? "#7cc85c" : r4 === "ab" ? "#9fc4dc" : r4 === "ba" ? "#c4c8d0" : r4 === "bb" ? "#d8b34a"
    : t.branch === "a" ? "#5c8a44" : t.branch === "b" ? "#4a6a92" : "#a04a3f";
  // A fully raised tower gets a shingled cap over the shooting deck — the
  // clearest read at a glance that this one is finished.
  if (lvl >= 3 || t.branch) {
    const ry = y - h - 20;      // clear of the archers' heads
    const roofCol = t.branch === "a" ? "#4a6a3a" : t.branch === "b" ? "#3f5a7c" : "#8a4a3c";
    const roofLt = t.branch === "a" ? "#5c8a44" : t.branch === "b" ? "#527398" : "#a45c4a";
    for (let i = 0; i < 5; i++) {
      const wRow = pw + 2 - Math.round(((i + 1) / 5) * (pw - 1));
      ctx.fillStyle = INK;
      ctx.fillRect(x - wRow - 1, ry - i * 3 - 1, wRow * 2 + 2, 4);
      ctx.fillStyle = i === 0 ? roofLt : roofCol;
      ctx.fillRect(x - wRow, ry - i * 3, wRow * 2, 3);
      ctx.fillStyle = "rgba(20,20,26,0.25)";
      for (let sx2 = x - wRow + (i % 2 ? 1 : 4); sx2 < x + wRow - 1; sx2 += 6) ctx.fillRect(sx2, ry - i * 3, 1, 2);
    }
    // corner posts carrying it down to the deck
    ctx.fillStyle = INK;
    for (const sgn of [-1, 1]) ctx.fillRect(x + sgn * (pw - 3) - 1, ry + 1, 4, 22);
    ctx.fillStyle = "#5f4326";
    for (const sgn of [-1, 1]) ctx.fillRect(x + sgn * (pw - 3), ry + 1, 2, 21);
  }
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
    // t.anim runs 1 -> 0 over a quarter second after a shot, so `draw` runs
    // 0 -> 1 as the archer hauls the string back to full draw again.
    const draw = 1 - t.anim;
    const bowCol = r4 === "bb" ? "#8a2f24" : "#4a3018";
    const drawGuy = (gx, gy, big) => {
      const ax = t.x + gx, ay = t.y - h + gy - 8;
      drawSprite(ctx, MINI.archer, pal, 0, ax, ay, dir < 0);
      const bx = S(ax + dir * (7 - recoil));
      // NB: drawn on whole pixels, not through S() — snapping each row to the
      // two-pixel grid collapses neighbouring rows and shreds the curve.
      const ry = Math.round(ay);
      const half = big ? 9 : 6;                       // half the bow's height
      const belly = big ? 4 : 3;                      // how far the limbs bow out
      ctx.fillStyle = bowCol;
      for (let i = -half; i <= half; i++) {
        const k = 1 - Math.abs(i) / half;             // 0 at the tips, 1 at the grip
        const out = Math.round(belly * Math.sqrt(k));
        ctx.fillRect(bx + dir * out, ry + i, 2, 1);
      }
      // string: nearly straight when loosed, hauled into a V at full draw
      const pull = Math.round(draw * (big ? 7 : 5));
      ctx.fillStyle = "#e8e0c8";
      for (let i = -half; i <= half; i++) {
        const k = 1 - Math.abs(i) / half;
        ctx.fillRect(bx - dir * Math.round(pull * k), ry + i, 1, 1);
      }
      // a nocked arrow, once the string is more than half drawn
      if (draw > 0.45) {
        const len = big ? 12 : 9;
        ctx.fillStyle = "#c4c8d0";
        ctx.fillRect(dir > 0 ? bx - pull : bx - len + pull, ry, len, 1);
        ctx.fillStyle = bowCol;                       // fletching at the nock
        ctx.fillRect(bx - dir * (pull + 1), ry - 1, 2, 3);
      }
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
  stoneWall(ctx, x - 10, y - bodyH, 20, bodyH + 14, SPIRE);
  plinth(ctx, x, y + 14, 11, SPIRE);
  // an arched window part way up, lit from within
  const winY = y - bodyH + 10;
  ctx.fillStyle = INK;
  ctx.fillRect(x - 4, winY, 8, 10);
  ctx.fillStyle = "#3a3448";
  ctx.fillRect(x - 3, winY + 1, 6, 8);
  ctx.fillStyle = pulseWin(time, t.id) ? "#e8d47a" : "#8a7a4a";
  ctx.fillRect(x - 2, winY + 3, 4, 5);
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
  // a white core, and a ring blown off the orb as the spell leaves it
  if (t.anim > 0.05) {
    ctx.fillStyle = `rgba(248,244,232,${t.anim * 0.9})`;
    ctx.beginPath(); ctx.arc(orbX, orbY, (rOut - 2) * t.anim, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${pal.g === "#8ce8f0" ? "140,232,240" : "216,196,255"},${t.anim * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(orbX, orbY, rOut + (1 - t.anim) * 12, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
  }
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
  plankFace(ctx, x - hw, y + 4, hw * 2, 10, wood, woodLt, dark);
  ctx.fillStyle = dark;   // iron straps across the deck
  for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 8 - 1, y + 4, 2, 10);
  ctx.fillStyle = "#9aa0ac";
  for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 8 - 1, y + 5, 1, 8);
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
  plankFace(ctx, x - 6, y + 4 - fh + 1, 3, fh - 2, wood, woodLt, dark, true);
  plankFace(ctx, x + 4, y + 4 - fh + 1, 3, fh - 2, wood, woodLt, dark, true);
  // crossbeam at pivot
  const py = y + 4 - fh + 2;
  ctx.fillStyle = INK;
  ctx.fillRect(x - 9, py - 2, 18, 5);
  ctx.fillStyle = woodLt;
  ctx.fillRect(x - 8, py - 1, 16, 3);
  // Throwing arm: it sweeps. t.anim is 1 the instant the arm lets go and
  // decays to 0 as the crew winch it back, so the whole arc gets drawn
  // rather than the old two-position flip.
  const dir = Math.cos(t.lastAim) >= 0 ? 1 : -1;
  const swing = t.anim * t.anim;                 // snap forward, ease back
  const ang = -2.2 + 2.8 * swing;                // radians from straight up
  const steps = 4 + (treb ? 2 : 0);
  const seg = treb ? 3.4 : 3;
  const armX = (len) => x + Math.sin(ang) * len * dir;
  const armY = (len) => py - Math.cos(ang) * len;
  ctx.fillStyle = dark;
  for (let i = 1; i <= steps; i++) {
    ctx.fillRect(S(armX(i * seg)) - 1, S(armY(i * seg)) - 1, 4, 4);
  }
  ctx.fillStyle = woodLt;                         // lit edge along the beam
  for (let i = 1; i <= steps; i++) {
    ctx.fillRect(S(armX(i * seg)) - 1, S(armY(i * seg)) - 1, 2, 2);
  }
  const tipX = armX(steps * seg);
  const tipY = armY(steps * seg);
  // the rope from the tip back down to the winch drum
  ctx.fillStyle = "#d2c6a2";
  const wx = x - dir * (hw - 4), wy2 = y + 6;
  const rope = 6;
  for (let i = 0; i <= rope; i++) {
    const k = i / rope;
    ctx.fillRect(S(tipX + (wx - tipX) * k), S(tipY + (wy2 - tipY) * k), 1, 1);
  }
  // winch drum on the deck
  ctx.fillStyle = INK;
  ctx.fillRect(S(wx) - 4, wy2 - 3, 8, 7);
  ctx.fillStyle = "#5f4326";
  ctx.fillRect(S(wx) - 3, wy2 - 2, 6, 5);
  ctx.fillStyle = "#9aa0ac";
  ctx.fillRect(S(wx) - 3, wy2 - 2 + ((Math.floor(time * 6) + t.id) % 5), 6, 1);
  if (treb) {
    // counterweight box swings opposite the arm, and it is heavy
    const cwAng = ang + Math.PI;
    const cwX = x + Math.sin(cwAng) * 9 * dir;
    const cwY = py - Math.cos(cwAng) * 9;
    ctx.fillStyle = INK;
    ctx.fillRect(S(cwX) - 6, S(cwY) - 5, 12, 12);
    ctx.fillStyle = "#5f5a4d";
    ctx.fillRect(S(cwX) - 5, S(cwY) - 4, 10, 10);
    ctx.fillStyle = "#43403a";
    ctx.fillRect(S(cwX) - 5, S(cwY) + 1, 10, 2);
    ctx.fillStyle = "#7a766c";
    ctx.fillRect(S(cwX) - 5, S(cwY) - 4, 10, 2);
  }
  // cup with rock(s) when loaded
  ctx.fillStyle = INK;
  ctx.fillRect(S(tipX) - 4, S(tipY) - 2, 8, 4);
  if (swing < 0.25) {
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
  if (r4 === "ab" && swing < 0.25) {
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
  // spare boulder pile beside the deck, in a crate once the crew are properly
  // supplied — the quickest read on how far this engine has been built up
  if (lvl >= 3 || t.branch) {
    const cx2 = x - hw - 11, cy2 = y + 4;
    ctx.fillStyle = INK;
    ctx.fillRect(cx2 - 1, cy2 - 1, 14, 13);
    plankFace(ctx, cx2, cy2, 12, 11, "#7a5a34", "#8f6c40", "#4a3018");
    ctx.fillStyle = "#8a8a92";
    for (let i = 0; i < 3; i++) ctx.fillRect(cx2 + 1 + i * 4, cy2 - 3, 3, 3);
    ctx.fillStyle = "#a2a2aa";
    for (let i = 0; i < 3; i++) ctx.fillRect(cx2 + 1 + i * 4, cy2 - 3, 1, 1);
  } else {
    ctx.fillStyle = "#8a8a92";
    ctx.fillRect(x - hw - 8, y + 10, 5, 5);
    ctx.fillRect(x - hw - 12, y + 12, 4, 4);
    if (lvl >= 2) ctx.fillRect(x - hw - 10, y + 6, 4, 4);
  }
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
  const wallPal = paladin ? PALE_STONE : berserk ? DARKWOOD_WALL : DAUB;
  ctx.fillStyle = INK;
  ctx.fillRect(x - hw - 2, baseY - wallH - 2, hw * 2 + 4, wallH + 2);
  if (berserk) plankFace(ctx, x - hw, baseY - wallH, hw * 2, wallH, wallPal.mid, wallPal.lit, wallPal.mortar, true);
  else stoneWall(ctx, x - hw, baseY - wallH, hw * 2, wallH, wallPal);
  // sill course along the foot of the wall
  ctx.fillStyle = wallPal.shade;
  ctx.fillRect(x - hw, baseY - 2, hw * 2, 2);
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
    const ry = baseY - wallH - 3 - i * 4;
    ctx.fillStyle = i === 0 ? roofLt : roofCol;
    ctx.fillRect(x - wRow, ry, wRow * 2, 4);
    // shingle butts: a lit top edge and a notched shadow line below it
    ctx.fillStyle = roofLt;
    ctx.fillRect(x - wRow, ry, wRow * 2, 1);
    ctx.fillStyle = "rgba(20,20,26,0.28)";
    ctx.fillRect(x - wRow, ry + 3, wRow * 2, 1);
    for (let sx = x - wRow + (i % 2 ? 2 : 5); sx < x + wRow - 1; sx += 6) {
      ctx.fillRect(sx, ry + 1, 1, 2);
    }
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
  // chimney on the roof slope, smoking away — the hall is manned
  {
    const chx = x - hw + 4, chy = baseY - wallH - 12;
    ctx.fillStyle = INK;
    ctx.fillRect(chx - 1, chy - 1, 8, 12);
    stoneWall(ctx, chx, chy, 6, 10, wallPal);
    ctx.fillStyle = wallPal.lit;
    ctx.fillRect(chx - 1, chy - 1, 8, 2);
    for (let i = 0; i < 4; i++) {
      const t2 = ((time * 9 + i * 5 + t.id * 2) % 20);
      const sy2 = chy - 3 - t2;
      const drift = Math.round(Math.sin(time * 1.6 + i) * 3 + t2 * 0.25);
      ctx.fillStyle = `rgba(198,198,190,${Math.max(0, 0.45 - t2 * 0.022)})`;
      const sz = 2 + Math.round(t2 / 7);
      ctx.fillRect(chx + 1 + drift, sy2, sz, sz);
    }
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

export const drawBladewheel = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const lvl = t.level;
  const r4 = t.rank4 && t.branch ? t.branch + t.rank4 : null;
  const fire = t.branch === "b";
  const gale = t.branch === "a";
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - 14, y + 14, 28, 4);
  // Solar Crown / Wildheart: heat shimmer on the ground
  if (fire) {
    ctx.fillStyle = `rgba(216,118,58,${0.22 + 0.12 * Math.sin(time * 5 + t.id)})`;
    ctx.beginPath(); ctx.arc(x, y + 8, r4 ? 18 : 14, 0, 7); ctx.fill();
  }
  // stone ring base, laid in blocks with a dressed cap
  ctx.fillStyle = INK;
  ctx.fillRect(x - 13, y + 2, 26, 14);
  stoneWall(ctx, x - 11, y + 4, 22, 10, ALTAR);
  ctx.fillStyle = ALTAR.lit;
  ctx.fillRect(x - 11, y + 4, 22, 2);
  ctx.fillStyle = ALTAR.shade;
  ctx.fillRect(x - 11, y + 12, 22, 2);
  // center post: a squared oak beam with an iron collar
  ctx.fillStyle = INK;
  ctx.fillRect(x - 3, y - 10, 6, 16);
  plankFace(ctx, x - 2, y - 9, 4, 14, "#5f4326", "#7a5a34", "#3c2a18", true);
  // an iron collar per level bolted to the post — countable at a glance
  for (let i = 0; i < lvl; i++) {
    ctx.fillStyle = "#9aa0ac";
    ctx.fillRect(x - 3, y - 4 + i * 4, 6, 2);
    ctx.fillStyle = "#6c727e";
    ctx.fillRect(x - 3, y - 2 + i * 4, 6, 1);
  }
  // the wheel: a flat spinning disc of blades atop the post (squashed for depth)
  const spin = time * (gale ? 10 : fire ? 3 : 4.5) + t.id;
  const wy = y - 12 + Math.round(t.anim * 2);   // it kicks down as it bites
  const rr = 9 + lvl + (t.branch ? 1 : 0);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(x, wy, rr - 1, (rr - 1) * 0.55, 0, 0, 7); ctx.fill();
  ctx.fillStyle = fire ? "#8a5a3a" : gale ? "#b8bcc4" : "#9aa0ac";
  ctx.beginPath(); ctx.ellipse(x, wy, rr - 2.5, (rr - 2.5) * 0.55, 0, 0, 7); ctx.fill();
  // spikes riding the rim
  const nSpk = t.branch ? 12 : 4 + lvl * 2;      // 6 / 8 / 10 blades, 12 evolved
  const tipCol = fire ? "#e8c14a" : r4 === "aa" ? "#e8d47a" : r4 === "ab" ? "#8ce8f0" : "#dde2ea";
  for (let i = 0; i < nSpk; i++) {
    const ang = spin + (i / nSpk) * Math.PI * 2;
    ctx.fillStyle = fire && i % 2 ? "#d8763a" : tipCol;
    ctx.fillRect(S(x + Math.cos(ang) * rr) - 1, S(wy + Math.sin(ang) * rr * 0.55) - 1, 3, 3);
  }
  // Twin Rims (Lv3) / Steel Tempest: an inner counter-rotating ring
  if (lvl >= 3 && !fire) {
    for (let i = 0; i < 6; i++) {
      const ang = -spin * 1.3 + (i / 6) * Math.PI * 2;
      ctx.fillStyle = r4 === "aa" ? "#e8d47a" : "#c4c8d0";
      ctx.fillRect(S(x + Math.cos(ang) * (rr - 5)), S(wy + Math.sin(ang) * (rr - 5) * 0.55), CELL, CELL);
    }
  }
  // hub, with gear teeth that turn against the rim
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x, wy, 4.4, 0, 7); ctx.fill();
  ctx.fillStyle = "#6c727e";
  for (let i = 0; i < 8; i++) {
    const ang = -spin * 0.6 + (i / 8) * Math.PI * 2;
    ctx.fillRect(S(x + Math.cos(ang) * 5) - 1, S(wy + Math.sin(ang) * 5 * 0.55) - 1, 2, 2);
  }
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x, wy, 3.4, 0, 7); ctx.fill();
  ctx.fillStyle = fire ? "#e8c14a" : "#6e4c28";
  ctx.beginPath(); ctx.arc(x, wy, 2, 0, 7); ctx.fill();
  // Brazier: flames licking off the rim
  if (fire) {
    for (let i = 0; i < 4; i++) {
      const ang = time * 2 + i * 1.57;
      const fl = Math.sin(time * 11 + i * 2) > 0 ? 2 : 0;
      ctx.fillStyle = i % 2 ? "#e8d47a" : "#d8763a";
      ctx.fillRect(S(x + Math.cos(ang) * rr), S(wy + Math.sin(ang) * rr * 0.55) - 3 - fl, 2, 3 + fl);
    }
  }
  // Solar Crown: a golden halo hangs above the wheel
  if (r4 === "ba") {
    const hy = S(wy - 12 + Math.sin(time * 2.5 + t.id) * 2);
    ctx.fillStyle = "#e8d47a";
    ctx.fillRect(x - 5, hy, 10, 2);
    ctx.fillRect(x - 3, hy - 2, 6, 2);
  }
  // Wildheart Pyre: embers drift upward
  if (r4 === "bb") {
    ctx.fillStyle = "#e88a3a";
    for (let i = 0; i < 3; i++) {
      const ey2 = wy - ((time * 24 + i * 13 + t.id * 7) % 30);
      ctx.fillRect(S(x - 8 + i * 8 + Math.sin(time * 3 + i) * 3), S(ey2), CELL, CELL);
    }
  }
  // Hamstringer: barbed snares staked around the base
  if (r4 === "ab") {
    ctx.fillStyle = "#8ce8f0";
    ctx.fillRect(x - 16, y + 10, 2, 4);
    ctx.fillRect(x + 14, y + 8, 2, 4);
    ctx.fillRect(x + 17, y + 12, 2, 3);
  }
  // spare spike bundle beside the base
  ctx.fillStyle = "#6e4c28";
  ctx.fillRect(x - 19, y + 8, 6, 6);
  ctx.fillStyle = tipCol;
  ctx.fillRect(x - 18, y + 5, 2, 4);
  ctx.fillRect(x - 15, y + 4, 2, 5);
  // banner
  const wave = Math.round(Math.sin(time * 5 + t.id)) * CELL;
  const bc = r4 && SPIKE_BANNER[r4] ? SPIKE_BANNER[r4] : gale ? "#7a94b8" : fire ? "#c05a28" : "#a04a3f";
  ctx.fillStyle = "#5f4326";
  ctx.fillRect(x + 14, y - 16, 2, 28);
  ctx.fillStyle = bc;
  ctx.fillRect(x + 16, y - 16, 8 + wave, 3);
  ctx.fillRect(x + 16, y - 13, 5 + wave, 3);
};

const SPIKE_BANNER = { aa: "#e8d47a", ab: "#8ce8f0", ba: "#e8c14a", bb: "#e88a3a" };

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
  // The aura only SHOWS itself while it's working: no enemies inside, no
  // ring — a dozen idle wardens used to paper the whole board in circles.
  // With foes in the cold, a pulse sweeps out, brightening with the crowd.
  const live = t._auraLive || 0;
  if (live > 0) {
    const pr = ((time * 34 + t.id * 40) % st.range);
    const strength = 0.22 + Math.min(0.4, live * 0.07);
    ctx.strokeStyle = `rgba(${auraCol},${strength * (1 - pr / st.range)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - 13, y + 14, 26, 4);
  // stone altar platform (grows with level)
  const pw = 8 + lvl * 2;
  // stepped footing, block-laid body, and a dressed slab across the top
  ctx.fillStyle = INK;
  ctx.fillRect(x - pw - 4, y + 4, (pw + 4) * 2, 12);
  stoneWall(ctx, x - pw - 3, y + 6, (pw + 3) * 2, 8, ALTAR);
  ctx.fillStyle = INK;
  ctx.fillRect(x - pw - 1, y - 2, (pw + 1) * 2, 8);
  ctx.fillStyle = ALTAR.mid;
  ctx.fillRect(x - pw, y, pw * 2, 6);
  ctx.fillStyle = ALTAR.lit;
  ctx.fillRect(x - pw, y, pw * 2, 2);
  ctx.fillStyle = ALTAR.shade;
  ctx.fillRect(x - pw, y + 5, pw * 2, 1);
  // a rune cut into the face of the slab
  ctx.fillStyle = ALTAR.mortar;
  ctx.fillRect(x - 3, y + 2, 7, 1);
  ctx.fillRect(x, y + 1, 1, 4);
  // pillars + candles (Lv2+)
  if (lvl >= 2 || t.branch) {
    for (const side of [-1, 1]) {
      const px = x + side * (pw + 6);
      ctx.fillStyle = INK; ctx.fillRect(px - 3, y - 14, 6, 22);
      ctx.fillStyle = ALTAR.mid; ctx.fillRect(px - 2, y - 12, 4, 18);
      ctx.fillStyle = ALTAR.lit; ctx.fillRect(px - 2, y - 12, 1, 18);   // fluting
      ctx.fillStyle = ALTAR.shade; ctx.fillRect(px + 1, y - 12, 1, 18);
      ctx.fillStyle = ALTAR.mortar;
      for (let i = 0; i < 3; i++) ctx.fillRect(px - 2, y - 8 + i * 6, 4, 1);
      ctx.fillStyle = ALTAR.lit; ctx.fillRect(px - 3, y - 15, 6, 3);    // capital
      ctx.fillStyle = ALTAR.shade; ctx.fillRect(px - 3, y - 12, 6, 1);
      const fl = Math.sin(time * 12 + side + t.id) > 0 ? CELL : 0;
      ctx.fillStyle = "#e8d47a";
      ctx.fillRect(px - 1, y - 19 - fl, 2, 3 + fl);
    }
  }
  // A stone arch over the altar once the shrine is fully raised — the clearest
  // read that this warden is finished, and something for the censer to hang from.
  if (lvl >= 3 || t.branch) {
    const ah = 30, aw = pw + 7;
    ctx.fillStyle = INK;
    ctx.fillRect(x - aw - 1, y - ah - 5, aw * 2 + 2, 6);
    ctx.fillStyle = ALTAR.mid;
    ctx.fillRect(x - aw, y - ah - 4, aw * 2, 4);
    ctx.fillStyle = ALTAR.lit;
    ctx.fillRect(x - aw, y - ah - 4, aw * 2, 1);
    ctx.fillStyle = ALTAR.shade;
    ctx.fillRect(x - aw, y - ah - 1, aw * 2, 1);
    // the two piers, with a shadowed inner face
    for (const sgn of [-1, 1]) {
      const px2 = x + sgn * aw - (sgn < 0 ? 0 : 4);
      ctx.fillStyle = INK;
      ctx.fillRect(px2 - 1, y - ah - 1, 6, ah - 4);
      ctx.fillStyle = ALTAR.mid;
      ctx.fillRect(px2, y - ah, 4, ah - 6);
      ctx.fillStyle = sgn < 0 ? ALTAR.lit : ALTAR.shade;
      ctx.fillRect(px2, y - ah, 1, ah - 6);
    }
    // a censer on a chain, swinging under the keystone
    const sw = Math.sin(time * 1.6 + t.id) * 7;
    const cx2 = S(x + sw), cy2 = y - ah + 9 + Math.abs(sw) * 0.25;
    ctx.fillStyle = "#6c727e";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(S(x + sw * (i / 5)), y - ah + i * 2, 1, 2);
    }
    ctx.fillStyle = INK;
    ctx.fillRect(cx2 - 4, S(cy2), 8, 7);
    ctx.fillStyle = "#d8b34a";
    ctx.fillRect(cx2 - 3, S(cy2) + 1, 6, 5);
    ctx.fillStyle = "#8a6f28";
    ctx.fillRect(cx2 - 3, S(cy2) + 4, 6, 2);
    // incense curling up out of it
    for (let i = 0; i < 3; i++) {
      const py2 = S(cy2) - 3 - ((time * 12 + i * 6 + t.id * 3) % 14);
      ctx.fillStyle = `rgba(216,230,240,${0.5 - i * 0.12})`;
      ctx.fillRect(cx2 - 1 + Math.round(Math.sin(time * 3 + i) * 2), py2, 2, 2);
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

// ============ THE NEW WORKSHOPS ============
// Four towers that arrived together: the mint, the trap bench, the mews,
// and the captive sun. Same construction kit as the old six.

const FORGE_STONE = { mid: "#8a8072", lit: "#a89e8c", shade: "#6e6558", mortar: "#514a40", dark: "#7d7466" };

export const drawGoldworks = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const lvl = t.level;
  const alch = t.branch === "b";
  const hoard = t.branch === "a" && t.rank4 === "a";
  const stone = t.branch === "a" && t.rank4 === "b";
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - 14, y + 14, 28, 4);
  // the counting-house: squat stone furnace with a working mouth
  ctx.fillStyle = INK;
  ctx.fillRect(x - 13, y - 12, 26, 26);
  stoneWall(ctx, x - 11, y - 10, 22, 22, FORGE_STONE);
  // furnace mouth, breathing
  const hot = 0.6 + 0.4 * Math.sin(time * 5 + t.id);
  ctx.fillStyle = INK;
  ctx.fillRect(x - 5, y + 2, 10, 9);
  ctx.fillStyle = `rgba(216,118,58,${hot})`;
  ctx.fillRect(x - 4, y + 3, 8, 7);
  ctx.fillStyle = `rgba(232,193,74,${hot})`;
  ctx.fillRect(x - 2, y + 5, 4, 4);
  // chimney with gold-fleck smoke
  ctx.fillStyle = INK;
  ctx.fillRect(x + 4, y - 24, 8, 14);
  stoneWall(ctx, x + 5, y - 23, 6, 12, FORGE_STONE);
  for (let i = 0; i < 3; i++) {
    const rise = (time * 16 + i * 9 + t.id) % 26;
    ctx.fillStyle = i % 2 ? `rgba(232,193,74,${0.7 - rise / 40})` : `rgba(150,140,120,${0.5 - rise / 60})`;
    ctx.fillRect(S(x + 7 + Math.sin(time * 2 + i) * 2), S(y - 24 - rise), 2, 2);
  }
  // the takings: coin stacks that grow with the level
  const stacks = hoard ? 5 : lvl + (t.branch === "a" ? 1 : 0);
  for (let i = 0; i < stacks; i++) {
    const sx2 = x - 12 + i * 6, hgt = 3 + ((i * 7) % 3) * 2 + (hoard ? 2 : 0);
    ctx.fillStyle = INK;
    ctx.fillRect(sx2 - 1, y + 12 - hgt - 1, 6, hgt + 2);
    ctx.fillStyle = "#d8b34a";
    ctx.fillRect(sx2, y + 12 - hgt, 4, hgt);
    ctx.fillStyle = "#f0d885";
    ctx.fillRect(sx2, y + 12 - hgt, 4, 1);
  }
  if (alch) {
    // the transmuter's alembic, bubbling green on its stand
    ctx.fillStyle = INK;
    ctx.fillRect(x - 14, y - 20, 10, 14);
    ctx.fillStyle = "#4a7a4a";
    ctx.fillRect(x - 13, y - 19, 8, 10);
    ctx.fillStyle = "#7cc85c";
    ctx.fillRect(x - 12, y - 18, 6, 5);
    const bub = Math.sin(time * 7 + t.id) > 0.4 ? 1 : 0;
    ctx.fillStyle = "#b8f0a0";
    ctx.fillRect(x - 10, y - 18 - bub, 2, 2);
    ctx.fillStyle = "#3c2a18";
    ctx.fillRect(x - 14, y - 7, 10, 2);
  }
  if (stone) {
    // the philosopher's stone, hovering above the works
    const bob = Math.sin(time * 2 + t.id) * 2;
    ctx.fillStyle = `rgba(176,138,216,0.3)`;
    ctx.beginPath(); ctx.arc(x, S(y - 26 + bob), 7, 0, 7); ctx.fill();
    ctx.fillStyle = "#e8d8f4";
    ctx.fillRect(x - 2, S(y - 28 + bob), 4, 4);
    ctx.fillStyle = "#b08ad8";
    ctx.fillRect(x - 1, S(y - 27 + bob), 2, 2);
  }
};

export const drawTrapsmith = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const st = getStats(t);
  const blast = t.branch === "b";
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - 15, y + 14, 30, 4);
  // an open-fronted work shed: posts, plank roof, bench in shadow
  ctx.fillStyle = INK;
  ctx.fillRect(x - 14, y - 14, 28, 28);
  ctx.fillStyle = "#3c2a18";
  ctx.fillRect(x - 12, y - 10, 24, 22);
  ctx.fillStyle = "#2a1d10";
  ctx.fillRect(x - 10, y - 8, 20, 18);
  // roof
  ctx.fillStyle = INK;
  ctx.fillRect(x - 16, y - 18, 32, 7);
  ctx.fillStyle = "#6e4c28";
  ctx.fillRect(x - 15, y - 17, 30, 5);
  ctx.fillStyle = "#8a6238";
  ctx.fillRect(x - 15, y - 17, 30, 2);
  // the bench, and the little forge glowing on it
  ctx.fillStyle = "#5f4326";
  ctx.fillRect(x - 9, y + 2, 18, 4);
  const glow = 0.5 + 0.5 * Math.sin(time * 6 + t.id);
  ctx.fillStyle = `rgba(216,118,58,${glow * 0.9})`;
  ctx.fillRect(x + 3, y - 2, 5, 4);
  // hanging jaws and tongs
  ctx.fillStyle = "#8a8f9a";
  ctx.fillRect(x - 8, y - 8, 2, 5);
  ctx.fillRect(x - 4, y - 9, 2, 6);
  ctx.fillStyle = "#b8bcc4";
  ctx.fillRect(x - 8, y - 4, 4, 2);
  if (blast) {
    // powder kegs stacked beside the shed
    for (const [ox, oy] of [[-16, 6], [-16, -1]]) {
      ctx.fillStyle = INK;
      ctx.fillRect(x + ox - 1, y + oy - 1, 8, 8);
      ctx.fillStyle = "#6e4c28";
      ctx.fillRect(x + ox, y + oy, 6, 6);
      ctx.fillStyle = "#3c2a18";
      ctx.fillRect(x + ox, y + oy + 2, 6, 1);
    }
  }
  // the rack: one hung trap per ready charge — the shop's own ammo counter
  const charges = t.charges || 0;
  for (let i = 0; i < Math.min(5, st.maxCharges || 2); i++) {
    const rx = x - 12 + i * 6;
    const ready = i < charges;
    ctx.fillStyle = INK;
    ctx.fillRect(rx - 1, y - 15 + 1, 5, 5);
    ctx.fillStyle = ready ? (blast ? "#c05a28" : "#b8bcc4") : "#4a4640";
    ctx.fillRect(rx, y - 13, 3, 3);
    if (ready && blast) {
      ctx.fillStyle = Math.sin(time * 8 + i) > 0 ? "#e05248" : "#7d2f1a";
      ctx.fillRect(rx + 1, y - 12, 1, 1);
    }
  }
};

// the mistress herself, transcribed pixel-for-pixel from the approved concept
const LADY_MAP = [
  " GG        ",
  " KG        ",
  "  K   KKK  ",
  "  K  KHHHK ",
  "  K  KHFFHK",
  "  KK KHFFHK",
  "   K KFFFK ",
  "   KKDDDKH ",
  "   KDDDDKH ",
  "  KDDDDDKh ",
  "  KdDDDdK  ",
  "  KdDDDdK  ",
  "   KDDDK   ",
  "   KK KK   ",
];

const drawOrbitBird = (ctx, bx, by, up, court) => {
  ctx.fillStyle = INK;
  if (up) { ctx.fillRect(bx - 3, by - 2, 2, 2); ctx.fillRect(bx + 1, by - 2, 2, 2); ctx.fillRect(bx - 2, by, 4, 2); }
  else { ctx.fillRect(bx - 4, by, 3, 2); ctx.fillRect(bx + 1, by, 3, 2); ctx.fillRect(bx - 2, by - 1, 4, 2); }
  ctx.fillStyle = court ? "#8a6a44" : "#a08258";
  ctx.fillRect(bx - 1, by, 2, 1);
  ctx.fillStyle = "#e8e2d4"; ctx.fillRect(bx - 1, by + (up ? 1 : 0), 2, 1);
  ctx.fillStyle = "#e0b855"; ctx.fillRect(bx + 2, by - 1, 1, 1);
};

export const drawFalconry = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const st = getStats(t);
  const aviary = t.branch === "a";
  const court = t.branch === "b";
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - 11, y + 14, 22, 4);

  // the wheel of wings: her birds circle her like the wizard's runes, the
  // back half of the orbit passing behind her, the front half before her
  const birds = st.shots >= 3 ? 3 : (aviary || t.level >= 2) ? 2 : 1;
  const striking = t.anim > 0.35;
  const skip = striking ? (t.shotIdx || 0) % birds : -1;
  const wheel = [];
  for (let b = 0; b < birds; b++) {
    if (b === skip) continue; // that one is away on the stoop
    const ang = time * 1.7 + t.id * 0.7 + (b / birds) * Math.PI * 2;
    wheel.push({
      bx: Math.round(x + Math.cos(ang) * 15),
      by: Math.round(y - 37 + Math.sin(ang) * 5),
      up: Math.sin(time * 9 + b * 2.1) > 0,
      front: Math.sin(ang) >= 0,
      king: court && t.rank4 === "a" && b === 0,
    });
  }
  for (const w of wheel) if (!w.front) drawOrbitBird(ctx, w.bx, w.by, w.up, court);

  // the roost: a round stone tower with a crenellated rim
  ctx.fillStyle = INK;
  ctx.fillRect(x - 9, y - 22, 18, 36);
  ctx.fillStyle = "#5f6470";
  ctx.fillRect(x - 8, y - 21, 16, 34);
  ctx.fillStyle = "#494f5c";
  for (let i = 0; i < 5; i++) ctx.fillRect(x - 8 + ((i * 7) % 14), y - 18 + i * 6, 4, 2);
  ctx.fillStyle = "#3a3f4a";
  for (let i = 0; i < 3; i++) ctx.fillRect(x - 6 + i * 5, y - 14 + (i % 2) * 9, 2, 1);
  ctx.fillStyle = INK; ctx.fillRect(x - 3, y + 5, 6, 9);
  ctx.fillStyle = "#6e4c28"; ctx.fillRect(x - 2, y + 6, 4, 8);
  ctx.fillStyle = INK; ctx.fillRect(x - 11, y - 26, 22, 5);
  ctx.fillStyle = "#6a7080"; ctx.fillRect(x - 10, y - 25, 20, 3);
  ctx.fillStyle = "#575d6a";
  for (let i = -9; i <= 8; i += 4) ctx.fillRect(x + i, y - 28, 2, 3);
  // her banner, dyed by the path she keeps
  ctx.fillStyle = INK; ctx.fillRect(x + 9, y - 36, 1, 10);
  ctx.fillStyle = court ? "#8a6ad8" : "#c04838";
  ctx.fillRect(x + 10, y - 36, 4, 3); ctx.fillRect(x + 10, y - 33, 2, 1);

  // the falcon-mistress on the rim, gauntlet raised to the wheel
  const dress = court ? "#5a4a8c" : aviary ? "#7a3c30" : "#2e6e6a";
  const dressD = court ? "#403470" : aviary ? "#582a22" : "#1d4a48";
  const pal = { K: INK, G: "#b08858", H: "#a05a2c", h: "#7a401e", F: "#e8c9a2", D: dress, d: dressD };
  for (let r = 0; r < LADY_MAP.length; r++) {
    for (let c = 0; c < LADY_MAP[r].length; c++) {
      const ch = LADY_MAP[r][c];
      if (ch === " ") continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x - 6 + c, y - 42 + r, 1, 1);
    }
  }

  for (const w of wheel) {
    if (w.front) drawOrbitBird(ctx, w.bx, w.by, w.up, court);
    if (w.king) { ctx.fillStyle = "#e8c14a"; ctx.fillRect(w.bx + 2, w.by - 2, 1, 1); }
  }

  // a drifting feather, now and then
  const fall = (time * 9 + t.id * 3) % 40;
  if (fall < 26) {
    ctx.fillStyle = "rgba(232,226,212,0.8)";
    ctx.fillRect(x + 8 + Math.round(Math.sin(time * 3) * 3), y - 30 + Math.round(fall), 2, 1);
  }
};

export const drawSunforge = (ctx, t, time) => {
  const x = S(t.x), y = S(t.y);
  const moon = t.branch === "b";
  const ramp = t.ramp || 1;
  const st = getStats(t);
  const heat = (ramp - 1) / Math.max(1, (st.rampMax || 3) - 1);   // 0..1 focus
  ctx.fillStyle = "rgba(20,20,26,0.3)";
  ctx.fillRect(x - 13, y + 14, 26, 4);
  // an obsidian ring altar, cut with a channel that carries the light
  ctx.fillStyle = INK;
  ctx.fillRect(x - 13, y + 2, 26, 12);
  ctx.fillStyle = "#352e40";
  ctx.fillRect(x - 12, y + 3, 24, 10);
  ctx.fillStyle = "#443a52";
  ctx.fillRect(x - 12, y + 3, 24, 3);
  ctx.fillStyle = "#241f30";
  ctx.fillRect(x - 8, y + 6, 16, 2);
  // two obsidian prongs holding the sky open
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = INK;
    ctx.fillRect(x + sgn * 10 - 2, y - 22, 5, 26);
    ctx.fillStyle = "#352e40";
    ctx.fillRect(x + sgn * 10 - 1, y - 21, 3, 24);
    ctx.fillStyle = "#6a5c84";
    ctx.fillRect(x + sgn * 10 - 1, y - 21, 1, 24);
  }
  // the captive shard, turning; its halo breathes with the focus
  const spin = time * 2 + t.id;
  const core = moon ? "#dce8f4" : "#f4e6b4";
  const glowC = moon ? "168,196,240" : "232,193,74";
  ctx.fillStyle = `rgba(${glowC},${0.12 + heat * 0.3})`;
  ctx.beginPath(); ctx.arc(x, y - 16, 9 + heat * 6 + Math.sin(time * 6) * (heat * 2), 0, 7); ctx.fill();
  const wob = Math.sin(spin) * 3;
  ctx.fillStyle = INK;
  ctx.fillRect(S(x - 1 + wob / 2) - 2, y - 22, 6, 12);
  ctx.fillStyle = core;
  ctx.fillRect(S(x - 1 + wob / 2) - 1, y - 21, 4, 10);
  ctx.fillStyle = moon ? "#8cb4e0" : "#e0b855";
  ctx.fillRect(S(x - 1 + wob / 2), y - 18, 2, 4);
  // sparks shed at high focus
  if (heat > 0.5) {
    for (let i = 0; i < 3; i++) {
      const ang = time * 4 + i * 2.1;
      ctx.fillStyle = `rgba(${glowC},${heat})`;
      ctx.fillRect(S(x + Math.cos(ang) * 10), S(y - 16 + Math.sin(ang) * 8), 2, 2);
    }
  }
};
