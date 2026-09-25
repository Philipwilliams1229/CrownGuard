// ============ HALL: THE KNIGHT GARRISON ============
// The barracks the knights muster out of; the knights themselves are units
// and walk the field, the hall only keeps the fire lit. It GROWS: a plank
// bunkhouse with a straw dummy at one, a half-timbered hall with a fence,
// a weapon rack and a standard at two, a stone-footed hall behind a
// palisade with a corner watch-turret and a campfire at three.
//   Paladin Order — whitewashed stone, a blue slate roof with a gilt ridge,
//     a rose window over the door, sun banners.
//     Grand Champion: a colossal war-hammer planted in a plinth before the
//       door, glowing; the turret grows into a gold-capped keep.
//     Radiant Basilica: a golden dome, a sunburst over the door, holy runes
//       in the ground that burn gold.
//   Berserker Hall — a black-timber longhouse, crossed dragon-head finials,
//     round painted shields along the wall, an antlered skull over the door.
//     Wolf Lodge: pelts over the roof, a kennel door with eyes in the dark,
//       gnawed bones, the wolf banner.
//     Blood Frenzy: red war-paint slashed on the timbers, a spiked palisade
//       hung with skulls, a great war-drum, braziers burning red.
//
// Ground (un-inked) and hall (inked) are baked per form; fire, smoke, eyes,
// runes and flags are live.

import {
  pennant, hipRoof, TIMBER, OAKWOOD, PALE_STONE, GREY_STONE,
  lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, cone, lin, part, hash,
  groundBed, footClip, footHalf, footing, ashlar, planks, beam, door, banner, brazier, flame, torchBracket, rock, posy,
} from "../buildkit.js";
import { bakeSprite, PX } from "../paint.js";

const CACHE = new Map();
export const resetGarrisonBakes = () => CACHE.clear();
const baked = (key, w, h, draw, ink = true) => {
  let sp = CACHE.get(key);
  if (!sp) { sp = bakeSprite(w, h, draw, ink); CACHE.set(key, sp); }
  return sp;
};

const BOX = { left: 46, right: 46, up: 78, down: 20 };
const DARK = "#4a3226";

// the numbers every form is built on
const dims = (t, y = t.y) => {
  const lvl = t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  // the footing reaches hw + 2, which must stay inside the footprint
  const hw = r4 ? 14.5 : t.branch ? 14 : [11, 12.5, 13.5][lvl - 1];
  const wallH = r4 ? 15 : t.branch ? 14 : 11 + lvl;
  return { hw, wallH, baseY: y + 7, r4, lvl };
};
const COLORS = (t) => {
  const pal = t.branch === "a", ber = t.branch === "b", r4 = t.rank4 ? t.branch + t.rank4 : null;
  return {
    wall: pal ? "#e0d8c4" : ber ? DARK : "#9a7a52",
    roof: pal ? (r4 === "ab" ? "#d8b34a" : "#4a6a92") : ber ? (r4 === "ba" ? "#5a4a3a" : "#3a2620") : "#a0503c",
    flag: pal ? "#e8d47a" : ber ? (r4 === "ba" ? "#8a8a90" : "#a0302a") : "#a04a3f",
    trim: pal ? "#d8b34a" : ber ? "#8a2a22" : "#a04a3f",
  };
};

// A straw training dummy on a post, arms out, a painted target on its chest.
const dummy = (ctx, x, y) => {
  part(ctx, (c) => cylinder(c, x - 0.8, y - 14, 1.6, 14, OAKWOOD, { r: 0.8 }));
  part(ctx, (c) => cylinder(c, x - 5, y - 11.5, 10, 1.5, OAKWOOD, { r: 0.7 }));
  part(ctx, (c) => { roundRect(c, x - 2.6, y - 13, 5.2, 7, 2); c.fillStyle = lin(c, x - 3, 0, x + 3, 0, [[0, "#f0d890"], [0.5, "#d8b868"], [1, "#9a7a3a"]]); c.fill(); c.fillStyle = "#a04a3f"; c.fillRect(x - 1, y - 10.5, 2, 2); });
  part(ctx, (c) => ball(c, x, y - 15.5, 2.2, 2.2, "#d8b868", { hi: 0.4, lo: 0.45 }));
};

// A rack of spears and a shield leaned against it.
// Seven wide, spears and all; a shield (if any) leans on its left post.
const rack = (ctx, x, y, shield) => {
  if (shield) part(ctx, (c) => { ball(c, x - 3, y - 3.5, 2.6, 2.9, shield, { hi: 0.4, lo: 0.45 }); c.fillStyle = "#d8b34a"; c.fillRect(x - 3.5, y - 4, 1, 1); });
  part(ctx, (c) => { cylinder(c, x - 3.5, y - 9, 1.5, 9, OAKWOOD, { r: 0.7 }); cylinder(c, x + 2, y - 9, 1.5, 9, OAKWOOD, { r: 0.7 }); cylinder(c, x - 3.5, y - 8, 7, 1.4, lighten(OAKWOOD, 0.1), { r: 0.6 }); });
  part(ctx, (c) => {
    for (let i = 0; i < 3; i++) {
      const sx = x - 2 + i * 1.8;
      c.fillStyle = "#6a4a2e"; c.fillRect(sx, y - 15, 0.9, 15);
      c.fillStyle = "#c4c8d0"; c.beginPath(); c.moveTo(sx - 0.7, y - 15); c.lineTo(sx + 0.45, y - 18.5); c.lineTo(sx + 1.6, y - 15); c.closePath(); c.fill();
    }
  });
};

// A round painted shield hung on a wall.
const roundShield = (ctx, x, y, col, rim = "#6c727e", seed = 0) => part(ctx, (c) => {
  ball(c, x, y, 2.8, 2.8, rim, { hi: 0.4, lo: 0.45 });
  ball(c, x, y, 2.2, 2.2, col, { hi: 0.35, lo: 0.4 });
  c.fillStyle = hash(seed, 1) > 0.5 ? "#e8e0c8" : "#2a2230";
  if (hash(seed, 2) > 0.5) c.fillRect(x - 2, y - 0.4, 4, 0.8); else c.fillRect(x - 0.4, y - 2, 0.8, 4);
  c.fillStyle = "#c4c8d0"; c.fillRect(x - 0.5, y - 0.5, 1, 1);
});

// An antlered skull (the berserkers' door-piece).
const antlerSkull = (ctx, x, y) => {
  part(ctx, (c) => {
    c.strokeStyle = "#d8ccb0"; c.lineWidth = 1; c.lineCap = "round";
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(x + s * 1.5, y - 1); c.quadraticCurveTo(x + s * 6, y - 3, x + s * 6, y - 7); c.stroke();
      c.beginPath(); c.moveTo(x + s * 4.5, y - 3); c.lineTo(x + s * 3.5, y - 6); c.stroke();
    }
  });
  part(ctx, (c) => { ball(c, x, y, 2.2, 2.6, "#e8dfc6", { hi: 0.4, lo: 0.4 }); c.fillStyle = "#2a2230"; c.fillRect(x - 1.3, y - 0.5, 1, 1); c.fillRect(x + 0.4, y - 0.5, 1, 1); });
};

// A row of sharpened stakes, tallest in the middle, behind the hall.
const palisade = (ctx, x, top, half, col, spikes = false, seed = 0) => {
  const n = Math.round(half / 3.4);
  for (let i = -n; i <= n; i++) {
    const px = x + i * 3.4, ph = 18 - Math.abs(i) * (8 / n) + hash(seed, i + 9) * 2;
    part(ctx, (c) => {
      cylinder(c, px - 1.7, top - ph, 3.4, ph + 4, mix(col, darken(col, 0.3), hash(seed, i + 20)), { r: 1, hi: 0.3, lo: 0.5 });
      c.fillStyle = lighten(col, 0.1); c.beginPath(); c.moveTo(px - 1.7, top - ph); c.lineTo(px, top - ph - 3); c.lineTo(px + 1.7, top - ph); c.closePath(); c.fill();
    });
    if (spikes && i % 3 === 0) part(ctx, (c) => ball(c, px, top - ph - 3.5, 1.8, 1.9, "#e8dfc6", { hi: 0.4, lo: 0.4 }));
  }
  part(ctx, (c) => cylinder(c, x - n * 3.4 - 1.7, top - 6, n * 6.8 + 3.4, 1.4, darken(col, 0.2), { r: 0.6 }));
};

const paintGround = (ctx, t, x, y) => {
  const { hw, baseY, r4 } = dims(t, y);
  const ber = t.branch === "b";
  ctx.save();
  footClip(ctx, x, y);
  groundBed(ctx, x, baseY, hw + 2, t.id, { earth: ber ? "#5e4a36" : "#7c6242" });
  // the trodden mustering yard before the door
  soft(ctx, x, baseY + 4, 10, 4, [[0, "rgba(124,98,66,0.32)"], [1, "rgba(124,98,66,0)"]]);
  if (r4 === "ab") {
    ctx.strokeStyle = "rgba(232,200,90,0.45)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 8, 16, 5.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // gnawed bones in the Wolf Lodge's yard
  if (r4 === "ba") for (const [i, [bx, by]] of [[-6, 12], [1, 13], [7, 12]].entries()) part(ctx, (c) => { c.fillStyle = "#e8dfc6"; c.save(); c.translate(x + bx, y + by); c.rotate(0.5 - i * 0.6); c.fillRect(-2.5, -0.4, 5, 0.8); c.fillRect(-3, -0.8, 1, 1.6); c.fillRect(2, -0.8, 1, 1.6); c.restore(); });
};

const paintHall = (ctx, t, x, y) => {
  const { hw, wallH, baseY, r4, lvl } = dims(t, y);
  const pal = t.branch === "a", ber = t.branch === "b";
  const grown = lvl >= 3 || !!t.branch;
  const col = COLORS(t);
  const seed = t.id * 11 + lvl;
  const wallTop = baseY - wallH;

  // ---- behind the hall: palisade, turret or keep
  // (its feet are behind the hall, where the footprint is narrow: it only
  // shows its sharpened crown over the roof)
  if (grown) palisade(ctx, x + 1, wallTop - 4, footHalf(y, wallTop) - 2, ber ? (r4 === "bb" ? "#5a2a22" : DARK) : pal ? "#8a7a5a" : OAKWOOD, r4 === "bb", seed);
  if (grown && !ber) {
    // a corner watch-turret at the back left; the Champion's is a keep
    const tx = x - hw + 3, keep = r4 === "aa";
    const tw = keep ? 11 : 8, th = keep ? 34 : 24;
    const stone = pal ? PALE_STONE : GREY_STONE;
    ashlar(ctx, tx - tw / 2, wallTop - th + 8, tw, th, stone, seed + 4, { course: 3.5, block: 4.5 });
    part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, tx - 0.8, wallTop - th + 13, 1.6, 4, 0.6); c.fill(); });
    const ch = keep ? 13 : 10, ttop = wallTop - th + 8;
    part(ctx, (c) => cone(c, tx, ttop - ch + 1.5, tw / 2 + 2, ch, keep ? "#d8b34a" : pal ? "#4a6a92" : "#a0503c", { scallops: 2, sag: 1, hi: 0.42, lo: 0.5 }));
    if (keep) part(ctx, (c) => { c.fillStyle = "#d8b34a"; c.fillRect(tx - 0.5, ttop - ch - 3, 1, 4); });
  }

  // ---- the walls
  footing(ctx, x, baseY, hw, pal ? "#b8b0a0" : GREY_STONE, seed, grown ? 4 : 3);
  const wallBot = baseY - (grown ? 4 : 3);
  if (pal) ashlar(ctx, x - hw, wallTop, hw * 2, wallBot - wallTop, col.wall, seed, { course: 3.5, block: 6 });
  else if (ber) planks(ctx, x - hw, wallTop, hw * 2, wallBot - wallTop, col.wall, seed, { pw: 3 });
  else if (lvl === 1) planks(ctx, x - hw, wallTop, hw * 2, wallBot - wallTop, "#8a6238", seed, { pw: 3.2 });
  else {
    // wattle and daub between oak framing
    part(ctx, (c) => cylinder(c, x - hw, wallTop, hw * 2, wallBot - wallTop, "#e0d4b4", { r: 1, hi: 0.25, lo: 0.4 }));
    for (const fx of [x - hw + 1, x - hw * 0.45, x + hw * 0.45, x + hw - 1]) beam(ctx, fx, wallTop, fx, wallBot, 1.8, darken(OAKWOOD, 0.1));
    beam(ctx, x - hw, wallTop + 1, x + hw, wallTop + 1, 1.8, darken(OAKWOOD, 0.1));
    beam(ctx, x - hw + 1, wallBot - 1, x - hw * 0.45, wallTop + 2, 1.3, darken(OAKWOOD, 0.1));
    beam(ctx, x + hw - 1, wallBot - 1, x + hw * 0.45, wallTop + 2, 1.3, darken(OAKWOOD, 0.1));
  }
  if (r4 === "bb") part(ctx, (c) => {
    // war-paint slashed across the timbers
    c.fillStyle = "#b82a22";
    for (const [sx, sy] of [[x - hw + 3, wallTop + 3], [x + hw - 9, wallTop + 4]]) for (let k = 0; k < 3; k++) { c.save(); c.translate(sx + k * 1.8, sy); c.rotate(0.5); c.fillRect(0, 0, 1, 6); c.restore(); }
  });

  // ---- the door, and what hangs over it
  door(ctx, x, wallBot, 7, Math.min(wallH - 2, 10.5), ber ? "#3a2a20" : "#5e4128");
  if (r4 === "ba") part(ctx, (c) => {
    // the kennel dark behind the open door (eyes painted live)
    c.fillStyle = "#1a1418"; c.beginPath(); c.moveTo(x - 2.8, wallBot); c.lineTo(x - 2.8, wallBot - 6.5); c.arc(x, wallBot - 6.5, 2.8, Math.PI, 0); c.lineTo(x + 2.8, wallBot); c.closePath(); c.fill();
  });
  if (!pal && !ber) {
    // the kingdom's shield beside the door
    part(ctx, (c) => {
      const sx = x - hw * 0.72, sy = wallTop + 3;
      c.fillStyle = lin(c, sx - 3, 0, sx + 3, 0, [[0, "#c86a5a"], [0.5, col.trim], [1, darken(col.trim, 0.4)]]);
      c.beginPath(); c.moveTo(sx - 3, sy); c.lineTo(sx + 3, sy); c.lineTo(sx + 3, sy + 4); c.lineTo(sx, sy + 7); c.lineTo(sx - 3, sy + 4); c.closePath(); c.fill();
      c.fillStyle = "#e0d6ba"; c.fillRect(sx - 0.5, sy + 1, 1, 4); c.fillRect(sx - 2, sy + 2, 4, 1);
    });
    if (lvl >= 2) torchBracket(ctx, x + 5, wallBot - 6);
  }
  if (ber) {
    antlerSkull(ctx, x, wallTop + 2);
    for (let i = 0; i < 4; i++) {
      const sx = x - hw + 4 + i * ((hw * 2 - 8) / 3);
      if (Math.abs(sx - x) < 6) continue;
      roundShield(ctx, sx, wallTop + 5.5, ["#a0302a", "#d8b34a", "#3a5a8a", "#e8e0c8"][(i + seed) % 4], "#6c727e", seed + i);
    }
  }
  if (pal) {
    // the rose window over the door and a gilt band
    part(ctx, (c) => {
      c.fillStyle = "#e8e0c8"; c.beginPath(); c.arc(x, wallTop - 1, 3.4, 0, Math.PI * 2); c.fill();
      const panes = ["#3a6ac8", "#e8c14a", "#c8383a", "#3a6ac8"];
      for (let i = 0; i < 4; i++) { c.fillStyle = panes[i]; c.beginPath(); c.moveTo(x, wallTop - 1); c.arc(x, wallTop - 1, 2.6, i * Math.PI / 2, (i + 1) * Math.PI / 2); c.closePath(); c.fill(); }
    });
    for (const s of [-1, 1]) banner(ctx, x + s * hw * 0.62, wallTop + 2, 4.5, 8, r4 === "aa" ? "#e8e0c8" : "#3a5a8a", "#d8b34a", (c, cx, cy) => {
      c.fillStyle = "#e8c14a"; c.beginPath(); c.arc(cx, cy, 1.3, 0, 7); c.fill();
      c.fillRect(cx - 0.3, cy - 2.6, 0.6, 1); c.fillRect(cx - 0.3, cy + 1.6, 0.6, 1); c.fillRect(cx - 2.6, cy - 0.3, 1, 0.6); c.fillRect(cx + 1.6, cy - 0.3, 1, 0.6);
    }, { point: true });
  }
  if (r4 === "ba") for (const s of [-1, 1]) banner(ctx, x + s * hw * 0.62, wallTop + 2, 4.5, 8, "#6a6a72", "#e8e0c8", (c, cx, cy) => {
    c.fillStyle = "#e8e0c8"; c.beginPath(); c.moveTo(cx - 1.6, cy - 1.8); c.lineTo(cx - 0.6, cy - 0.4); c.lineTo(cx + 0.6, cy - 0.4); c.lineTo(cx + 1.6, cy - 1.8); c.lineTo(cx + 1.2, cy + 1); c.lineTo(cx, cy + 2.2); c.lineTo(cx - 1.2, cy + 1); c.closePath(); c.fill();
  }, { point: true });

  // ---- the roof
  const roofH = 11 + lvl + (t.branch ? 2 : 0) + (ber ? 3 : 0);
  if (r4 === "ab") {
    // the basilica: a short gilt-edged roof crowned by a golden dome
    hipRoof(ctx, x, wallTop, hw + 3, hw * 0.4, 9, "#e0d8c4");
    part(ctx, (c) => cylinder(c, x - 7, wallTop - 14, 14, 6, "#e0d8c4", { r: 1, hi: 0.3, lo: 0.45 }));
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - 8, wallTop - 13); c.bezierCurveTo(x - 8, wallTop - 25, x + 8, wallTop - 25, x + 8, wallTop - 13); c.closePath();
      c.fillStyle = lin(c, x - 8, wallTop - 24, x + 8, wallTop - 13, [[0, "#f8e8a0"], [0.45, "#d8b34a"], [1, "#8a6a2a"]]); c.fill();
      c.fillStyle = rgba("#8a6a2a", 0.6); c.fillRect(x - 3.5, wallTop - 21, 0.5, 8); c.fillRect(x + 3, wallTop - 21, 0.5, 8);
    });
    part(ctx, (c) => { c.fillStyle = "#d8b34a"; c.fillRect(x - 0.5, wallTop - 29, 1, 6); c.beginPath(); c.arc(x, wallTop - 30, 1.5, 0, 7); c.fill(); });
  } else {
    hipRoof(ctx, x, wallTop, hw + 4, hw * (ber ? 0.55 : 0.35), roofH, col.roof);
    if (pal) part(ctx, (c) => { c.fillStyle = "#d8b34a"; c.fillRect(x - hw * 0.35 - 1, wallTop - roofH - 1.5, hw * 0.7 + 2, 1.2); });
  }
  if (ber) {
    // crossed dragon-head finials at both ridge ends
    const rt = wallTop - roofH, rx = hw * 0.55;
    for (const s of [-1, 1]) part(ctx, (c) => {
      c.strokeStyle = "#5a3a26"; c.lineWidth = 1.6; c.lineCap = "round";
      c.beginPath(); c.moveTo(x + s * rx - s * 1, rt + 1); c.quadraticCurveTo(x + s * (rx + 3), rt - 3, x + s * (rx + 5), rt - 6); c.stroke();
      c.beginPath(); c.moveTo(x + s * rx + s * 1, rt + 1); c.quadraticCurveTo(x + s * (rx - 2), rt - 3, x + s * (rx - 3), rt - 6); c.stroke();
      ball(c, x + s * (rx + 5.5), rt - 6.5, 1.6, 1.2, "#5a3a26", { hi: 0.4, lo: 0.4 });
    });
    if (r4 === "ba") for (let i = 0; i < 3; i++) part(ctx, (c) => {
      // wolf pelts thrown over the roof
      const px = x - hw * 0.6 + i * hw * 0.6, py = wallTop - roofH * 0.45 + (i % 2);
      c.fillStyle = lin(c, px - 4, 0, px + 4, 0, [[0, "#b0acaa"], [0.5, "#8a8688"], [1, "#5a5658"]]);
      c.beginPath(); c.moveTo(px - 4, py - 3); c.lineTo(px + 4, py - 3); c.lineTo(px + 3.5, py + 3); c.lineTo(px + 1, py + 2); c.lineTo(px, py + 4); c.lineTo(px - 1, py + 2); c.lineTo(px - 3.5, py + 3); c.closePath(); c.fill();
    });
  }
  if (!ber && r4 !== "ab") part(ctx, (c) => {
    // the chimney
    const chx = x + hw * 0.5, chy = wallTop - roofH * 0.55;
    cylinder(c, chx - 2.5, chy - 7, 5, 9, pal ? PALE_STONE : "#7a746a", { r: 1, hi: 0.3, lo: 0.45 });
    c.fillStyle = darken(pal ? PALE_STONE : "#7a746a", 0.25); c.fillRect(chx - 3, chy - 8, 6, 1.6);
  });

  // ---- the yard: everything stands in front of the walls, inside the
  // footprint (the dummy's and the rack's feet at y + 10 or so)
  const fireX = x - Math.min(hw, 13.5) + 6.5, fireY = baseY + 4;
  if (!ber) {
    if (r4 === "aa") {
      // the Champion's hammer: handle driven into a plinth, the great head held high
      const hx = x + hw - 5.5;
      ashlar(ctx, hx - 5, baseY - 3, 10, 5, PALE_STONE, seed, { course: 5, block: 5 });
      part(ctx, (c) => cylinder(c, hx - 1.3, baseY - 23, 2.6, 21, "#6a4a2e", { r: 1 }));
      part(ctx, (c) => { c.fillStyle = "#d8b34a"; c.fillRect(hx - 1.7, baseY - 9, 3.4, 1.2); c.fillRect(hx - 1.7, baseY - 15, 3.4, 1.2); });
      part(ctx, (c) => {
        roundRect(c, hx - 7, baseY - 31, 14, 8, 1.5);
        c.fillStyle = lin(c, hx - 7, 0, hx + 7, 0, [[0, "#f0f2f8"], [0.5, "#b0b4c0"], [1, "#5a5e6a"]]); c.fill();
        c.fillStyle = "#d8b34a"; c.fillRect(hx - 7, baseY - 28, 14, 1.2); c.fillRect(hx - 1, baseY - 31, 2, 8);
      });
    } else if (!pal && lvl >= 2) rack(ctx, x + hw - 3.5, baseY + 3, "#a04a3f");
    if (!pal && lvl === 1) dummy(ctx, x + hw - 5, baseY + 4);
    if (!pal && lvl === 2) dummy(ctx, x - hw + 5, baseY + 4);
  } else if (r4 === "bb") {
    // the war-drum on its stand, and a brazier
    const dx = x + hw - 5.5;
    beam(ctx, dx - 4, baseY + 1, dx - 3, baseY - 5, 1.2, DARK); beam(ctx, dx + 4, baseY + 1, dx + 3, baseY - 5, 1.2, DARK);
    part(ctx, (c) => { cylinder(c, dx - 5, baseY - 11, 10, 7, "#8a3a2a", { r: 2, hi: 0.35, lo: 0.5 }); c.fillStyle = "#e8dfc6"; c.fillRect(dx - 5, baseY - 11, 10, 1.2); c.strokeStyle = "#d8ccb0"; c.lineWidth = 0.5; c.beginPath(); for (let k = 0; k < 4; k++) { c.moveTo(dx - 4 + k * 2.6, baseY - 10); c.lineTo(dx - 2.7 + k * 2.6, baseY - 4.5); } c.stroke(); });
    brazier(ctx, x - hw + 5, baseY + 4, 1);
  } else rack(ctx, x + hw - 3.5, baseY + 3, "#d8b34a");
  // the campfire ring (its fire is live)
  if (grown && r4 !== "bb") {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      rock(ctx, fireX + Math.cos(a) * 4.5, fireY + Math.sin(a) * 2, 1.6, 1.1, "#8a8478", seed + i);
    }
    part(ctx, (c) => { beam(c, fireX - 4, fireY, fireX + 3, fireY - 2, 1.5, "#5f4326"); beam(c, fireX - 3, fireY - 2, fireX + 4, fireY, 1.5, "#4a3018"); });
  }
  // the standard's pole on the ridge
  part(ctx, (c) => cylinder(c, x - 0.8, wallTop - roofH - (r4 === "ab" ? 18 : 12), 1.6, 12, OAKWOOD, { r: 0.8 }));
  if (!ber) posy(ctx, x + 9, baseY + 6, "#e8e4d8", seed);
};

export const drawGarrison = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const { hw, wallH, baseY, r4, lvl } = dims(t);
  const pal = t.branch === "a", ber = t.branch === "b";
  const grown = lvl >= 3 || !!t.branch;
  const col = COLORS(t);
  const wallTop = baseY - wallH;
  const roofH = 11 + lvl + (t.branch ? 2 : 0) + (ber ? 3 : 0);
  const form = `${lvl}|${t.branch}|${t.rank4}`, v = t.id % 3, tv = { ...t, id: v };

  if (typeof document !== "undefined") {
    const g = baked(`ground|${form}|${v}`, BOX.left + BOX.right, 44, (c) => paintGround(c, tv, BOX.left, 16), false);
    ctx.drawImage(g, x - BOX.left, y - 16, g.width / PX, g.height / PX);
    const cv = baked(`hall|${form}|${v}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintHall(c, tv, BOX.left, BOX.up));
    ctx.drawImage(cv, x - BOX.left, y - BOX.up, cv.width / PX, cv.height / PX);
  } else paintHall(ctx, t, x, y);

  // ---- fire: the campfire, the Frenzy's brazier
  if (grown && r4 !== "bb") flame(ctx, x - Math.min(hw, 13.5) + 6.5, baseY + 2.5, 0.75, time, t.id);
  if (r4 === "bb") flame(ctx, x - hw + 5, baseY - 3, 0.9, time, t.id, ["#ffd0a0", "#e84a2a", "#8a1a18"]);
  // the chimney's smoke
  if (!ber && r4 !== "ab") for (let i = 0; i < 4; i++) {
    const t2 = (time * 9 + i * 5 + t.id * 2) % 20;
    const drift = Math.sin(time * 1.6 + i) * 3 + t2 * 0.25;
    soft(ctx, x + hw * 0.5 + drift, wallTop - roofH * 0.55 - 9 - t2, 2 + t2 / 7, 2 + t2 / 7, [[0, `rgba(198,198,190,${Math.max(0, 0.45 - t2 * 0.022)})`], [1, "rgba(198,198,190,0)"]]);
  }
  // torchlight at the door and in the windows
  const dg = 0.45 + 0.15 * Math.sin(time * 1.9 + t.id);
  if (lvl >= 2 && !pal && !ber) flame(ctx, x + 5, baseY - 11.5, 0.4, time, t.id + 2);
  if (pal) glow(ctx, x, wallTop - 1, 4, "#f8e8a0", dg);
  if (r4 === "ba") {
    // eyes in the kennel dark
    const blink = Math.sin(time * 0.7 + t.id * 1.3) > 0.94;
    if (!blink) { ctx.fillStyle = "#f0d040"; ctx.fillRect(x - 1.8, baseY - 9, 1, 0.8); ctx.fillRect(x + 0.6, baseY - 9, 1, 0.8); }
  }
  if (r4 === "aa") glow(ctx, x + hw - 5.5, baseY - 27, 9, "#f8e8a0", 0.35 + 0.15 * Math.sin(time * 2 + t.id));
  if (r4 === "ab") {
    // the sunburst over the door and holy runes burning in the ring
    glow(ctx, x, wallTop - 20, 10, "#f8e08a", 0.3 + 0.12 * Math.sin(time * 1.4 + t.id));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.25;
      const on = 0.5 + 0.5 * Math.sin(time * 2.5 + i * 1.7);
      ctx.fillStyle = rgba("#f8e08a", 0.35 + on * 0.6);
      const rx = x + Math.cos(a) * 15.5, ry = y + 8 + Math.sin(a) * 5;
      ctx.fillRect(rx - 0.5, ry - 1.5, 1, 3); ctx.fillRect(rx - 1.5, ry - 0.5, 3, 1);
    }
  }
  // the standard on the ridge
  pennant(ctx, x, wallTop - roofH - (r4 === "ab" ? 18 : 12), 1, col.flag, time, t.id, 1);
  // rally flag
  if (t.rally) {
    const rx = t.rally.x, ry = t.rally.y;
    shadow(ctx, rx + 1, ry + 4, 4, 1.5, 0.25);
    pennant(ctx, rx, ry - 10, 14, col.flag, time, t.id + 3, 1);
  }
};
