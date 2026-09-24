// ============ RENDER: THE CASTLE ============
// The crown's curtain wall down the right edge of every board, and the crews
// the castle works put on it. Split out of scenery.js so the castle can be
// worked on by itself.

import { W, H, RES, PATH_HALF, WALL_W } from "../data/constants.js";
import { PTS } from "../engine/path.js";
import { workTier, bowmenSpots, masonSpots } from "../data/castle.js";
import { drawArcher, drawHalberdier, drawMason, WALL_FOLK } from "./folk.js";
import { ballista } from "./halls/archer.js";
import {
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone,
  blade, tuft, strokePts, blobPath, blobBall, masonry, hash, ellipse, SUN, lin, rad, bakeSprite, PIXEL, part } from "./paint.js";

const CASTLE_STONE = "#a19a8a";
const ROOF = "#a8505c";

// ---- the castle -------------------------------------------------------
// The crown's curtain wall runs the whole right edge of the board. Seen from
// above it is a walkway between two battlemented parapets, studded with round
// drum towers; where the road arrives, two great drums flank a gate as wide
// as the road itself, a bridge of wall crossing over it and a portcullis
// under that. The road runs into the dark beneath and the board ends.

let DRUMS = [];   // where the wall's drums stand, for the live torchlight
const drum = (ctx, cx, cy, r, time, dire) => {
  const S1 = CASTLE_STONE;
  DRUMS.push([cx, cy]);
  const bh = r * 2.3;
  const foot = cy + bh * 0.5;
  // it stands on the wall: a dark pool where it meets the walkway, a splayed
  // footing course, and square-bottomed masonry above that
  soft(ctx, cx + 2, foot + 1, r * 1.5, r * 0.42, [[0, "rgba(28,20,30,0.55)"], [0.6, "rgba(28,20,30,0.3)"], [1, "rgba(28,20,30,0)"]]);
  part(ctx, (c) => {
    masonry(c, cx - r, cy - bh * 0.5, r * 2, bh - 3, S1, { r: r * 0.45, course: 6, block: r * 0.9 });
    c.fillStyle = darken(S1, 0.05);
    c.fillRect(cx - r, foot - 9, r * 2, 6);
  });
  part(ctx, (c) => cylinder(c, cx - r - 2.5, foot - 5, r * 2 + 5, 5.5, darken(S1, 0.14), { r: 1.5, hi: 0.28, lo: 0.45 }));
  part(ctx, (c) => cylinder(c, cx - r - 4, foot - 1.5, r * 2 + 8, 3, darken(S1, 0.28), { r: 1.2, hi: 0.2, lo: 0.45 }));
  part(ctx, (c) => cylinder(c, cx - r - 2, cy - bh * 0.5 - 4, r * 2 + 4, 4.5, lighten(S1, 0.1), { r: 1.5, hi: 0.35, lo: 0.4 }));
  ctx.fillStyle = "#2a2430";
  roundRect(ctx, cx - 1.6, cy - 4, 3.2, 11, 1.4); ctx.fill();
  const apex = cy - bh * 0.5 - 4 - r * 1.5;
  part(ctx, (c) => cone(c, cx, apex, r * 1.15, r * 1.5, dire ? "#4a3a30" : ROOF, { scallops: 3, sag: 2, hi: 0.4, lo: 0.5 }));
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
    part(ctx, (c) => cylinder(c, px, py, w, h, S1, { r: 1, hi: 0.32, lo: 0.42 }));
    ctx.fillStyle = darken(S1, 0.5);
    if (vertical) for (let y = py + 5; y < py + h - 4; y += 12) ctx.fillRect(px + 1.5, y, w - 3, 4);
    else for (let x = px + 5; x < px + w - 4; x += 12) ctx.fillRect(x, py + 1.5, 4, h - 3);
  }
};

// The stone is baked once per damage tier into an inked sprite; the wall's
// foot-shadow, the passage's dark, torchlight, pennants, banner, smoke and
// fire are painted live over it.
let CASTLE = { key: "", cv: null, x0: 0, y0: 0, w: 0, h: 0, drums: [], apex: [0, 0] };

const paintCastleStone = (ctx, gx, gy, tier) => {
  const hurt = tier >= 1, bad = tier >= 2, dire = tier >= 3;
  const S1 = CASTLE_STONE;
  const WB = W - 44;
  const G = 70;
  if (bad) {
    for (const [dx, dy, r] of [[-14, -22, 3.5], [-6, 20, 3], [-20, 6, 2.2], [2, -8, 2.6]]) ball(ctx, gx + dx, gy + dy, r, r * 0.75, darken(S1, 0.15), { hi: 0.4, lo: 0.45 });
  }
  wallRun(ctx, WB, W + 4, -10, gy - G - 20);
  wallRun(ctx, WB, W + 4, gy + G + 20, H + 10);
  DRUMS = [];
  for (let y = 70; y < H; y += 150) {
    if (Math.abs(y - gy) < G + 92) continue;
    drum(ctx, WB + 18, y, 15, 0, dire);
  }
  wallRun(ctx, gx + 14, W + 4, gy - PATH_HALF - 7, gy + PATH_HALF + 7, false);
  ctx.fillStyle = "rgba(16,12,16,0.7)";
  ctx.fillRect(gx + 7, gy - PATH_HALF, 8, PATH_HALF * 2);
  ctx.fillStyle = "#8a909c";
  for (let y = gy - PATH_HALF + 3; y < gy + PATH_HALF - 2; y += 6) roundRect(ctx, gx + 8, y, 5.5, 2.4, 1), ctx.fill();
  ctx.fillStyle = "#b8bcc6";
  roundRect(ctx, gx + 8, gy - PATH_HALF - 1, 5.5, 3, 1); ctx.fill();
  roundRect(ctx, gx + 8, gy + PATH_HALF - 2, 5.5, 3, 1); ctx.fill();
  const apexN = drum(ctx, gx + 24, gy - G, 25, 0, dire);
  const apexS = drum(ctx, gx + 24, gy + G, 25, 0, dire);
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
  }
  return [apexN, apexS];
};

export const drawCastle = (ctx, time, hpPct) => {
  const [gx, gy] = PTS[PTS.length - 1];
  const tier = hpPct < 0.25 ? 3 : hpPct < 0.5 ? 2 : hpPct < 0.75 ? 1 : 0;
  const dire = tier >= 3, bad = tier >= 2;
  const WB = W - 44, G = 70;
  // the wall's foot, and the road running into the gate's dark
  const ao = lin(ctx, WB - 34, 0, WB, 0, [[0, "rgba(28,20,30,0)"], [1, "rgba(28,20,30,0.38)"]]);
  ctx.fillStyle = ao;
  ctx.fillRect(WB - 34, -10, 34, H + 20);
  ctx.fillStyle = lin(ctx, gx - 24, 0, gx + 18, 0, [[0, "rgba(16,12,16,0)"], [1, "rgba(16,12,16,0.85)"]]);
  ctx.fillRect(gx - 24, gy - PATH_HALF - 3, W - gx + 24, PATH_HALF * 2 + 6);
  // the stone
  const key = `${gx}|${gy}|${tier}|${W}|${H}`;
  if (CASTLE.key !== key && typeof document !== "undefined") {
    const x0 = W - 150, y0 = -12, w = 160, h = H + 24;
    let apex = [0, 0];
    const cv = bakeSprite(w, h, (c) => { c.translate(-x0, -y0); apex = paintCastleStone(c, gx, gy, tier); });
    CASTLE = { key, cv, x0, y0, w, h, drums: [...DRUMS], apex };
  }
  if (CASTLE.cv) ctx.drawImage(CASTLE.cv, CASTLE.x0, CASTLE.y0, CASTLE.w, CASTLE.h);
  else paintCastleStone(ctx, gx, gy, tier);
  const [apexN, apexS] = CASTLE.apex;
  // torchlight in the slits
  if (!dire) for (const [cx, cy] of CASTLE.drums) if (Math.sin(time * 1.9 + cx * 0.3 + cy * 0.7) > -0.5) glow(ctx, cx, cy + 1, 4, "#ffd070", 0.75);
  if (bad) {
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
    ctx.fillStyle = lin(ctx, px - bw, 0, px, 0, [[0, "#c89a34"], [1, "#ecc95a"]]);
    ctx.fill();
    if (!bad) ball(ctx, px - 9, py + 5.5, 2.4, 2.4, "#7c3f4a", { hi: 0.4, lo: 0.3 });
  }
};

// ---- the castle works ---------------------------------------------------
// What the crown has paid for stands on the wall in plain sight: bowmen on
// the walk each side of the gate, ballistae on the great drums, halberdiers
// at the portcullis and masons at their scaffold. Figures are baked once
// per pose and stamped; the ballista's recoil and the bowmen's draw follow
// the works' own cooldowns.
const WORKS = new Map();
const workFrame = (key, w, h, fn) => {
  let cv = WORKS.get(key);
  if (!cv && typeof document !== "undefined") { cv = bakeSprite(w, h, fn); WORKS.set(key, cv); }
  return cv;
};
export const drawCastleWorks = (ctx, g) => {
  const works = g.castle;
  if (!works) return;
  const [gx, gy] = PTS[PTS.length - 1];
  const time = g.time;
  const cd = g.castleCd || {};
  // the masons first: farthest from the gate, and nothing stands in front of them
  const guild = workTier(works, "masons");
  if (guild) {
    const spots = masonSpots(gy, guild.mend > 1 ? 2 : 1);
    for (let k = 0; k < spots.length; k++) {
      const y = spots[k] + 6;
      cylinder(ctx, W - 40, y - 2, 20, 3, "#8a6a40", { r: 1, hi: 0.3, lo: 0.5 });
      cylinder(ctx, W - 36, y - 10, 7, 6, "#6e6a60", { r: 1.5, hi: 0.3, lo: 0.5 });
      ctx.fillStyle = "#d8d0c0"; ctx.fillRect(W - 35, y - 10, 5, 1.2);
      const fr = Math.floor(((time * 2 + k) % 2));
      const cv = workFrame(`mason|${fr}`, 30, 36, (c) => drawMason(c, 12, 33, 1, WALL_FOLK.mason, fr));
      if (cv) ctx.drawImage(cv, W - 24 - 12, y - 33 - 2, 30, 36);
    }
  }
  const bows = workTier(works, "archers");
  if (bows) {
    const big = !!bows.pierce;
    const spots = bowmenSpots(gy, bows.count);
    for (let i = 0; i < spots.length; i++) {
      const y = spots[i] + 8;
      // each bowman draws on his own beat; the one who just loosed is slack
      const phase = ((time * 1000 / bows.rate) + i / bows.count) % 1;
      const fr = Math.round(Math.min(1, phase * 1.6) * 3);
      const cv = workFrame(`bow|${big ? 1 : 0}|${fr}`, 30, 36, (c) => drawArcher(c, 17, 33, -1, WALL_FOLK.bowman, fr / 3, { big, bowCol: big ? "#3a3a44" : undefined }));
      if (cv) ctx.drawImage(cv, W - 20 - 17, y - 33, 30, 36);
    }
  }
  const bal = workTier(works, "ballista");
  if (bal) {
    const spots = bal.twin ? [gy - 18, gy + 18] : [gy];
    for (let k = 0; k < spots.length; k++) {
      const y = spots[k] + 12;
      const left = cd.ballista ?? 0;
      const recoil = Math.max(0, 1 - (bal.rate - left) / 400);
      const fr = Math.round(recoil * 2);
      const cv = workFrame(`bal|${fr}`, 44, 48, (c) => ballista(c, 22, 44, -1, fr / 2));
      if (cv) ctx.drawImage(cv, gx + 26 - 22, y - 44, 44, 48);
      if (bal.burn) glow(ctx, gx + 16, y - 24, 3.5, "#ffa040", 0.5 + 0.3 * Math.sin(time * 9 + k));
    }
  }
  const guard = workTier(works, "guards");
  if (guard) {
    const cv = workFrame(`guard`, 28, 42, (c) => drawHalberdier(c, 12, 40, 1, WALL_FOLK.guard));
    for (const y of [gy - 12, gy + 28]) if (cv) ctx.drawImage(cv, gx - 4 - 12, y - 40, 28, 42);
    if (guard.oil) {
      // the cauldron over the gate, and its steam
      const cx = gx + 30, cy = gy - 34;
      cylinder(ctx, cx - 5, cy - 4, 10, 8, "#3a3a44", { r: 2, hi: 0.35, lo: 0.5 });
      ctx.fillStyle = "#c86a2a"; ctx.fillRect(cx - 3, cy - 3, 6, 1.5);
      for (let i = 0; i < 2; i++) {
        const pr = ((time * 0.6 + i * 0.5) % 1);
        soft(ctx, cx + Math.sin(time * 3 + i) * 2, cy - 7 - pr * 10, 2.5 + pr * 3, 2 + pr * 2, [[0, `rgba(230,225,215,${(1 - pr) * 0.4})`], [1, "rgba(230,225,215,0)"]]);
      }
    }
  }
};
export const resetWorksBakes = () => WORKS.clear();

export const resetCastleBakes = () => { CASTLE.key = ""; WORKS.clear(); };
