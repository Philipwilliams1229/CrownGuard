// ============ HALL: THE KNIGHT GARRISON ============
// A timber-framed hall with a pitched roof and a south door the knights
// muster out of. Level two adds a fence and a weapon rack, level three a
// palisade and a campfire. Paladins whitewash it in pale stone under a gold
// roof; berserkers blacken it to dark timber. The knights themselves are
// units and walk the field; the hall only keeps the fire lit.

import {
  pad, timberWall, stoneBody, hipRoof, pennant, skirt, TIMBER, OAKWOOD, PALE_STONE,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, lin, part,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";

const CACHE = new Map();
export const resetGarrisonBakes = () => CACHE.clear();
const baked = (key, w, h, draw) => {
  let sp = CACHE.get(key);
  if (!sp) { sp = bakeSprite(w, h, draw); CACHE.set(key, sp); }
  return sp;
};

const BOX = { left: 40, right: 40, up: 62, down: 18 };

// Everything that never moves, anchored on the ground at (x, y).
const paintHall = (ctx, t, x, y) => {
  const lvl = t.level;
  const paladin = t.branch === "a", berserk = t.branch === "b";
  const grown = lvl >= 3 || !!t.branch;
  const hw = 12 + lvl * 2;
  const wallH = 12 + lvl;
  const baseY = y + 8;
  const wallCol = paladin ? PALE_STONE : berserk ? "#4a3226" : "#9a7a52";
  const roofCol = paladin ? "#d8b34a" : berserk ? "#48291f" : "#a0503c";
  const bc = paladin ? "#d8b34a" : berserk ? "#a0473a" : "#a04a3f";

  pad(ctx, x, y + 6, hw + 10, t.id);
  shadow(ctx, x + 6, y + 9, hw + 8, 4.5, 0.32);
  // palisade behind the hall
  if (grown) {
    part(ctx, (c) => {
      for (let i = -3; i <= 3; i++) {
        const ph = 16 - Math.abs(i) * 2;
        cylinder(c, x + i * 7 - 2, baseY - wallH - 6 - ph, 4, ph + 8, berserk ? "#4a3226" : OAKWOOD, { r: 1.5, hi: 0.3, lo: 0.5 });
        c.fillStyle = darken(berserk ? "#4a3226" : OAKWOOD, 0.2);
        c.beginPath(); c.moveTo(x + i * 7 - 2, baseY - wallH - 6 - ph); c.lineTo(x + i * 7, baseY - wallH - 9 - ph); c.lineTo(x + i * 7 + 2, baseY - wallH - 6 - ph); c.closePath(); c.fill();
      }
    });
  }
  // fence either side
  if (lvl >= 2 || t.branch) {
    for (const side of [-1, 1]) {
      const fx = x + side * (hw + 9);
      part(ctx, (c) => {
        cylinder(c, fx - 1, baseY - 10, 2.2, 10, OAKWOOD, { r: 1 });
        cylinder(c, fx + side * 8 - 1, baseY - 8, 2.2, 8, OAKWOOD, { r: 1 });
        c.fillStyle = lighten(OAKWOOD, 0.1);
        c.fillRect(Math.min(fx, fx + side * 8) - 1, baseY - 7, 10, 1.6);
      });
    }
  }
  // the hall's walls
  if (paladin) stoneBody(ctx, x, baseY - wallH, hw * 2, wallH, PALE_STONE);
  else timberWall(ctx, x, baseY - wallH, hw * 2, wallH, wallCol);
  // timber framing on the daub hall
  if (!paladin && !berserk) {
    part(ctx, (c) => {
      c.strokeStyle = darken(OAKWOOD, 0.1);
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x - hw + 2, baseY - wallH + 1); c.lineTo(x - hw + 2, baseY - 1);
      c.moveTo(x + hw - 2, baseY - wallH + 1); c.lineTo(x + hw - 2, baseY - 1);
      c.moveTo(x - hw + 2, baseY - wallH * 0.5); c.lineTo(x - 6, baseY - 2);
      c.moveTo(x + hw - 2, baseY - wallH * 0.5); c.lineTo(x + 6, baseY - 2);
      c.stroke();
    });
  }
  // the door, and the emblem beside it
  part(ctx, (c) => {
    c.fillStyle = "#33291a";
    roundRect(c, x - 4, baseY - wallH + 3, 8, wallH - 3, 2); c.fill();
    c.fillStyle = "#6a4a2e";
    c.fillRect(x - 3.5, baseY - wallH + 4, 1.2, wallH - 5);
    c.fillRect(x + 2.3, baseY - wallH + 4, 1.2, wallH - 5);
  });
  part(ctx, (c) => {
    c.fillStyle = bc;
    c.beginPath(); c.moveTo(x - hw + 3, baseY - wallH + 3); c.lineTo(x - hw + 9, baseY - wallH + 3); c.lineTo(x - hw + 9, baseY - wallH + 7); c.lineTo(x - hw + 6, baseY - wallH + 10); c.lineTo(x - hw + 3, baseY - wallH + 7); c.closePath(); c.fill();
    c.fillStyle = "#e0d6ba";
    c.fillRect(x - hw + 5, baseY - wallH + 5, 2, 2);
  });
  // the roof, wide over the walls, with a chimney
  hipRoof(ctx, x, baseY - wallH, hw + 4, hw * 0.35, 12 + lvl, roofCol);
  part(ctx, (c) => {
    const chx = x - hw + 6, chy = baseY - wallH - 12;
    cylinder(c, chx - 2.5, chy - 6, 5, 10, paladin ? PALE_STONE : "#7a746a", { r: 1, hi: 0.3, lo: 0.45 });
    c.fillStyle = darken(paladin ? PALE_STONE : "#7a746a", 0.2);
    c.fillRect(chx - 3, chy - 7, 6, 1.6);
  });
  skirt(ctx, x, y + 6, hw + 4, t.id);
  // weapon rack
  if (lvl >= 2 || t.branch) {
    const rx = x + hw + 7;
    part(ctx, (c) => {
      cylinder(c, rx - 5, baseY - 2, 10, 2, OAKWOOD, { r: 0.8 });
      c.fillStyle = "#c4c8d0";
      c.fillRect(rx - 3.5, baseY - 14, 1.6, 12);
      c.fillRect(rx + 1.5, baseY - 14, 1.6, 12);
      c.fillStyle = "#6a4a2e";
      c.fillRect(rx - 4.5, baseY - 6, 3.6, 1.4);
      c.fillRect(rx + 0.5, baseY - 6, 3.6, 1.4);
    });
  }
  // campfire ring
  if (grown) {
    const fx = x - hw - 10, fy = baseY - 3;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ball(ctx, fx + Math.cos(a) * 5, fy + Math.sin(a) * 2.2, 1.8, 1.3, "#8a8478", { hi: 0.4, lo: 0.45 });
    }
    part(ctx, (c) => {
      cylinder(c, fx - 5, fy - 1, 10, 2, "#5f4326", { r: 0.8 });
      cylinder(c, fx - 3, fy - 2.4, 8, 2, "#4a3018", { r: 0.8 });
    });
  }
};

export const drawGarrison = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const lvl = t.level;
  const paladin = t.branch === "a", berserk = t.branch === "b";
  const grown = lvl >= 3 || !!t.branch;
  const hw = 12 + lvl * 2, wallH = 12 + lvl, baseY = y + 8;
  const bc = paladin ? "#d8b34a" : berserk ? "#a0473a" : "#a04a3f";

  if (typeof document !== "undefined") {
    const cv = baked(`hall|${lvl}|${t.branch}|${t.id % 5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintHall(c, { ...t, id: t.id % 5 }, BOX.left, BOX.up));
    ctx.drawImage(cv, x - BOX.left, y - BOX.up, cv.width / PX, cv.height / PX);
  } else paintHall(ctx, t, x, y);

  // the fire, and the chimney's smoke
  if (grown) {
    const fx = x - hw - 10, fy = baseY - 3;
    const fl = 0.5 + 0.5 * Math.sin(time * 13 + t.id);
    soft(ctx, fx, fy - 4 - fl * 2, 3, 5 + fl * 3, [[0, "#ffe08a"], [0.4, "#f0903a"], [0.85, "rgba(200,60,30,0.6)"], [1, "rgba(200,60,30,0)"]], 0, 0.3);
  }
  for (let i = 0; i < 4; i++) {
    const t2 = (time * 9 + i * 5 + t.id * 2) % 20;
    const drift = Math.sin(time * 1.6 + i) * 3 + t2 * 0.25;
    soft(ctx, x - hw + 6 + drift, baseY - wallH - 21 - t2, 2 + t2 / 7, 2 + t2 / 7, [[0, `rgba(198,198,190,${Math.max(0, 0.45 - t2 * 0.022)})`], [1, "rgba(198,198,190,0)"]]);
  }
  // torchlight at the door
  if (Math.sin(time * 1.9 + t.id) > -0.6) glow(ctx, x, baseY - wallH * 0.5, 4, "#ffd070", 0.55);
  // banner at the peak
  pennant(ctx, x, baseY - wallH - 14 - lvl - 12, 12, bc, time, t.id, 1);
  // rally flag
  if (t.rally) {
    const rx = t.rally.x, ry = t.rally.y;
    shadow(ctx, rx + 1, ry + 4, 4, 1.5, 0.25);
    pennant(ctx, rx, ry - 10, 14, bc, time, t.id + 3, 1);
  }
};
