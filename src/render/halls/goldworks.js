// ============ HALL: THE GOLD WORKS ============
// A squat stone counting-house with a working furnace mouth and a chimney
// that smokes gold, the clerk out front with his ledger. It GROWS: a plain
// slate-lipped furnace hut with a strongbox at one, a tiled roof, a taller
// chimney and a hanging coin sign at two, a gabled house with a gilt finial
// and a barrow of ore at three; the takings stack up beside it all the way.
//   The Royal Mint dresses in pale stone and royal blue and sets a screw
// press at the door: the Dragon's Hoard heaps its gold into a mound with a
// small red dragon asleep on top; the Philosopher's Stone floats a red stone
// over a pedestal inside a gilded circle.
//   The Transmuter greens its roof in copper, keeps an alembic bubbling and
// sends out an alchemist who throws acid: the Midas Cannon mounts a gilded
// gun beside him; Lead to Gold lays a glowing circle round a smoking vat
// and a stack of ingots turning from lead to gold.
//
// Pixel art: the house is baked per form; the alchemist and clerk are baked
// frames; smoke, glints, bubbles and the floating stone are live.

import { stoneBody, hipRoof, PALE_STONE, OAKWOOD, pennant, spriteCache, stamp, canBake } from "../buildkit.js";
import {
  IRON, STEEL, GOLD, readiness, foot, padB, skirtB, beam, planks, barrel, crate, coins, boulder, wheel, glint,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part,
} from "./kitB.js";
import { drawStander, drawBomber, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetGoldworksBakes = () => cache.clear();
const BOX = { left: 40, right: 40, up: 62, down: 18 };
const COIN = "#e0bb48";
const ROOF = { base: "#5a5e6a", l2: "#a8505c", a: "#3a5a8a", aa: "#8e2f2a", ab: "#5a3a7a", b: "#4a8a72", ba: "#4a8a72", bb: "#3a7a64" };
const ALCHEMIST = { skin: "#e8b990", hood: "#2e4a3a", coat: "#3a6a4e", boots: "#2a2a30", trim: "#d8b34a" };

const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const mint = t.branch === "a", alch = t.branch === "b";
  const stone = mint ? PALE_STONE : alch ? "#8a8474" : "#8a7a6a";
  const roof = r4 ? ROOF[r4] : t.branch ? ROOF[t.branch] : lvl >= 2 ? ROOF.l2 : ROOF.base;
  return { lvl, r4, mint, alch, stone, roof, bh: 14 + lvl * 3 };
};

// The house stands on a footing whose front edge is at y + 4 (LIFT above
// the old line), so everything set out in front of it — takings, the
// strongbox, the press, the vat, the crew — stands on open ground with its
// foot clearly below that edge.
const LIFT = 4;

// Where the crew stands (feet): ground props in front of this line are
// baked into a separate front layer drawn after him.
const crewSpot = (t, x, y) => {
  const { r4, mint, alch } = spec(t);
  if (alch) return r4 ? [x - 1, y + 8.5] : [x + 11, y + 8];
  if (r4 === "aa") return [x + 7, y + 8];
  if (mint) return [x + 2, y + 9.5];
  return [x + 11, y + 7];
};

// The small things on the ground before the house, each with the y of its
// foot so it can be drawn behind or in front of the crew.
const groundProps = (t, x, y) => {
  const { lvl, r4, mint, alch } = spec(t);
  const out = [];
  const add = (fy, fn) => out.push({ fy, fn });
  // the takings: stacks of coin out front, their feet on open ground
  const stacks = r4 === "aa" || r4 === "bb" ? 0 : Math.min(5, lvl + (mint ? 2 : 0));
  const spots = alch
    ? [[-11.5, 11.3, 4], [-7, 12.8, 6], [-3, 13.5, 3]]
    : [[-12, 8.5, 4], [-7.5, 10.2, 6], [-14.3, 6.6, 3], [-10, 11.8, 5], [-3.5, 11.5, 7]];
  for (let i = 0; i < stacks; i++) {
    const [dx, dy, n] = spots[i];
    add(y + dy, (c) => { foot(c, x + dx + 0.4, y + dy, 2.6, 0.35); coins(c, x + dx, y + dy, n); });
  }
  if (lvl === 1) add(y + 9.5, (c) => {
    // the strongbox, on the ground before the wall
    foot(c, x + 3.4, y + 9.5, 3.6, 0.4);
    crate(c, x + 3, y + 9.5, 6, 4.5, "#6a4a2e");
    part(c, (k) => { k.fillStyle = GOLD; k.fillRect(x + 2.2, y + 6.2, 1.6, 1.6); });
  });
  if (mint && !r4) add(y + 12, (c) => {
    // a sack of fresh coin at the press's foot
    foot(c, x + 10.3, y + 11.8, 2.6, 0.4);
    part(c, (k) => { ball(k, x + 10, y + 9.6, 2.2, 2.4, "#b89a6a", { hi: 0.35, lo: 0.45 }); k.fillStyle = darken("#b89a6a", 0.4); k.fillRect(x + 9.2, y + 7, 1.6, 0.7); });
  });
  if (r4 === "aa") add(y + 8.5, (c) => {
    // a chest spilled at the hoard's foot
    foot(c, x - 0.6, y + 8.5, 4, 0.4);
    crate(c, x - 1, y + 8.5, 7, 5, "#8a3a2a");
    part(c, (k) => { k.fillStyle = GOLD; k.fillRect(x - 4.5, y + 4.5, 7, 1); k.fillRect(x - 1.6, y + 5.1, 1.2, 1.6); });
  });
  if (r4 === "bb") for (let i = 0; i < 5; i++) {
    // the ingots turning from lead to gold, stacked on the ground
    const gold = i >= 2, back = i >= 3;
    const ix = back ? x - 5.5 + (i - 3) * 5 : x - 8 + i * 5, iy = back ? y + 10.3 : y + 12.5;
    add(iy, (c) => {
      if (!back) foot(c, ix, iy, 2.6, 0.35);
      part(c, (k) => { k.beginPath(); k.moveTo(ix - 2.4, iy); k.lineTo(ix + 2.4, iy); k.lineTo(ix + 1.8, iy - 2.2); k.lineTo(ix - 1.8, iy - 2.2); k.closePath(); k.fillStyle = lin(k, ix - 2, 0, ix + 2, 0, gold ? [[0, "#f8e08a"], [1, "#a07a2a"]] : [[0, "#9aa0ac"], [1, "#4a4e58"]]); k.fill(); });
    });
  }
  return out.sort((a, b) => a.fy - b.fy);
};

const paintHouse = (ctx, t, x, y) => {
  const { lvl, r4, mint, alch, stone, roof, bh } = spec(t);
  const hx = x - 3, hw = 10 + (lvl >= 3 ? 1 : 0);
  const g = y - LIFT;   // the house's own ground line
  padB(ctx, x, y, t.id, { hw: 13 });
  if (r4 === "bb") {
    // the transmutation circle, gold on the ground
    part(ctx, (c) => {
      c.strokeStyle = rgba("#e8c14a", 0.85); c.lineWidth = 0.9;
      c.beginPath(); c.ellipse(x, y + 4, 17, 7.5, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(x, y + 4, 14, 6, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.fillStyle = "#f4d878"; c.fillRect(x + Math.cos(a) * 15.5 - 0.7, y + 4 + Math.sin(a) * 6.8 - 0.7, 1.4, 1.4); }
    }, { ink: "under" });
  }
  // the chimney at the back
  const cx = hx + hw - 5;
  part(ctx, (c) => masonryChimney(c, cx, g - bh - 14 - lvl * 2, 6, bh + 12 + lvl * 2, darken(stone, 0.08)));
  if (lvl >= 2) part(ctx, (c) => cylinder(c, cx - 0.8, g - bh - 14 - lvl * 2, 7.6, 2.2, darken(stone, 0.25), { r: 0.8 }));
  // the house
  stoneBody(ctx, hx, g - bh, hw * 2, bh + 8, stone);
  // the roof: a slate lip at one, a proper roof after
  if (lvl === 1) part(ctx, (c) => cylinder(c, hx - hw - 2, g - bh - 2, hw * 2 + 4, 3.4, roof, { r: 1.2, hi: 0.35, lo: 0.45 }));
  else {
    hipRoof(ctx, hx, g - bh + 1, hw + 2, lvl >= 3 ? 3 : 5, lvl >= 3 ? 11 : 8, roof);
    if (lvl >= 3) {
      // a gable dormer over the door, and the finial
      part(ctx, (c) => {
        c.beginPath(); c.moveTo(hx - 5, g - bh + 1); c.lineTo(hx, g - bh - 7); c.lineTo(hx + 5, g - bh + 1); c.closePath();
        c.fillStyle = lin(c, hx - 5, 0, hx + 5, 0, [[0, lighten(stone, 0.25)], [1, darken(stone, 0.2)]]); c.fill();
      });
      part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, hx - 1.4, g - bh - 3.5, 2.8, 3, 1.2); c.fill(); });
      part(ctx, (c) => ball(c, hx, g - bh - 11.5, 1.6, 1.6, GOLD, { hi: 0.55, lo: 0.3 }));
      if (mint) part(ctx, (c) => { c.fillStyle = GOLD; c.fillRect(hx - 2, g - bh - 15, 4, 2); c.fillRect(hx - 2, g - bh - 16.4, 0.9, 1.4); c.fillRect(hx - 0.45, g - bh - 16.8, 0.9, 1.8); c.fillRect(hx + 1.1, g - bh - 16.4, 0.9, 1.4); });   // a crown
    }
  }
  // the furnace mouth, with an iron door swung open
  part(ctx, (c) => { c.fillStyle = "#2a1c18"; roundRect(c, hx - 8, g - 7, 9, 9, 2.5); c.fill(); });
  part(ctx, (c) => { c.fillStyle = IRON; c.fillRect(hx - 10.4, g - 6.6, 2.2, 8); c.fillStyle = "#8a909c"; c.fillRect(hx - 10, g - 3, 0.8, 0.8); });
  // a shuttered window on the right of the door
  part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, hx + 4, g - bh + 5, 4, 5, 1); c.fill(); c.fillStyle = alch ? "#8ad0a0" : "#e8c860"; c.fillRect(hx + 4.6, g - bh + 6, 2.8, 3.4); });
  if (lvl >= 2 && !alch) {
    // the hanging coin sign
    beam(ctx, hx + hw, g - bh + 3, hx + hw + 6, g - bh + 3, 1.2, OAKWOOD, { grain: false });
    part(ctx, (c) => { ball(c, hx + hw + 5, g - bh + 7.5, 2.8, 2.8, GOLD, { hi: 0.5, lo: 0.4 }); c.fillStyle = darken(GOLD, 0.35); c.fillRect(hx + hw + 4.5, g - bh + 6, 1, 3); });
  }
  if (alch) {
    // a shelf of vials on the wall
    part(ctx, (c) => { cylinder(c, hx + 11, g - bh + 12, 9, 1.4, OAKWOOD, { r: 0.4 }); for (const [dx, col] of [[4, "#8ad0a0"], [6.4, "#c05a8a"], [8.6, "#7ab0e0"]]) { c.fillStyle = col; c.fillRect(hx + dx, g - bh + 9.4, 1.6, 2.6); } });
  }
  // ---- the trade, set out on the ground before the house
  if (mint && !r4) {
    // the screw press, standing on its own block before the door
    const px = x + 10, py = y + 7;
    foot(ctx, px + 0.5, py, 5.5, 0.4);
    part(ctx, (c) => cylinder(c, px - 4.5, py - 5, 9, 5, "#5a5e6a", { r: 1.2, hi: 0.35, lo: 0.45 }));
    beam(ctx, px - 4, py - 5, px - 4, py - 17, 2, IRON, { grain: false });
    beam(ctx, px + 4, py - 5, px + 4, py - 17, 2, IRON, { grain: false });
    beam(ctx, px - 5, py - 17, px + 5, py - 17, 2.4, "#5a5e6a", { grain: false });
    part(ctx, (c) => { c.fillStyle = "#8a909c"; c.fillRect(px - 0.8, py - 21, 1.6, 12); for (let i = 0; i < 5; i++) { c.fillStyle = "#4a4e58"; c.fillRect(px - 0.8, py - 20 + i * 2.2, 1.6, 0.6); } });
    beam(ctx, px - 7, py - 20.5, px + 7, py - 21.5, 1.4, IRON, { grain: false });
    part(ctx, (c) => { ball(c, px - 7.5, py - 20.5, 1.6, 1.6, "#4a4e58", { hi: 0.5, lo: 0.4 }); ball(c, px + 7.5, py - 21.5, 1.6, 1.6, "#4a4e58", { hi: 0.5, lo: 0.4 }); });
  }
  if (r4 === "aa") {
    // the hoard: a mound of gold heaped before the house, and the dragon on it
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - 17, y + 6.5); c.quadraticCurveTo(x - 15, y - 6, x - 7, y - 7); c.quadraticCurveTo(x - 1, y - 6, x + 4, y + 6.5); c.closePath();
      c.fillStyle = lin(c, x - 17, y - 7, x + 3, y + 6, [[0, "#f8e08a"], [0.45, COIN], [1, "#a07a2a"]]); c.fill();
      c.fillStyle = "#fff0b0"; for (const [dx, dy] of [[-13, -2], [-8, -4], [-4, 0], [-11, 2], [-1, 3]]) c.fillRect(x + dx, y + dy, 1, 1);
    });
    // the dragon, curled asleep, head on its tail
    part(ctx, (c) => {
      ball(c, x - 9, y - 8, 6, 3.6, "#b8402a", { hi: 0.4, lo: 0.5 });
      c.strokeStyle = lin(c, x - 15, 0, x - 3, 0, [[0, "#d05a3a"], [1, "#7a2a1e"]]); c.lineWidth = 2; c.lineCap = "round";
      c.beginPath(); c.moveTo(x - 4, y - 7); c.quadraticCurveTo(x - 2, y - 4, x - 7, y - 4.4); c.stroke();
    });
    part(ctx, (c) => {   // folded wing
      c.beginPath(); c.moveTo(x - 13, y - 9); c.lineTo(x - 8, y - 15); c.lineTo(x - 5, y - 9); c.closePath();
      c.fillStyle = lin(c, x - 13, y - 15, x - 5, y - 9, [[0, "#d86a4a"], [1, "#8a2e22"]]); c.fill();
    });
    part(ctx, (c) => { ball(c, x - 14, y - 7.4, 2.8, 2.2, "#c04a30", { hi: 0.45, lo: 0.45 }); c.fillStyle = "#e8dcc0"; c.fillRect(x - 14.5, y - 10.4, 0.8, 1.6); c.fillRect(x - 13, y - 10.2, 0.8, 1.4); });
    part(ctx, (c) => { c.fillStyle = "#2a1c1c"; c.fillRect(x - 15.6, y - 7.6, 1.4, 0.5); });   // a shut eye
  }
  if (r4 === "ab") {
    // the pedestal the stone floats over, on the ground before the house
    foot(ctx, x + 11.4, y + 8, 5, 0.4);
    part(ctx, (c) => cylinder(c, x + 7, y - 1, 8, 9, "#e8e0d0", { r: 1.2, hi: 0.3, lo: 0.4 }));
    part(ctx, (c) => cylinder(c, x + 6, y - 3, 10, 2.4, "#f0ead8", { r: 1, hi: 0.3, lo: 0.35 }));
    part(ctx, (c) => { c.fillStyle = GOLD; c.fillRect(x + 7, y + 2, 8, 0.9); c.fillRect(x + 10.5, y + 3.5, 1, 1); });
  }
  if (r4 === "ba") {
    // the Midas gun's carriage, wheels on the ground before the house
    foot(ctx, x + 9.5, y + 8, 7, 0.4);
    part(ctx, (c) => cylinder(c, x + 3, y - 1, 12, 6, "#5a3a24", { r: 1.2, hi: 0.3, lo: 0.45 }));
    wheel(ctx, x + 6, y + 5, 3, "#6a4a2e", { spokes: 6, rim: "#b08a3a" });
    wheel(ctx, x + 13, y + 5, 3, "#6a4a2e", { spokes: 6, rim: "#b08a3a" });
  }
  if (r4 === "bb") {
    // the vat, standing on the ground before the house
    foot(ctx, x + 10.5, y + 8, 6, 0.45);
    part(ctx, (c) => { ball(c, x + 10, y + 3.5, 6, 4.5, "#3a3c46", { hi: 0.35, lo: 0.45 }); ball(c, x + 10, y + 0.5, 4.6, 1.4, "#a8c060", { hi: 0.5, lo: 0.3 }); });
    part(ctx, (c) => { c.fillStyle = IRON; c.fillRect(x + 4.4, y + 2.5, 11.2, 1); });
  }
  // the props behind the crew line
  const [, cy] = crewSpot(t, x, y);
  for (const p of groundProps(t, x, y)) if (p.fy <= cy) p.fn(ctx);
  skirtB(ctx, x, y, t.id);
};

// The alembic on its stand before the wall, and its retort. Baked on its
// own and drawn after the live furnace glow, which it stands in front of.
const paintAlembic = (ctx, x, y) => {
  const ax = x - 12, ay = y + 8;
  for (const dx of [-3.5, 3.5]) foot(ctx, ax + dx + 0.3, ay, 1.4, 0.4);
  part(ctx, (c) => { for (const dx of [-3.5, 3.5]) cylinder(c, ax + dx - 0.6, ay - 8, 1.2, 8, IRON, { r: 0.5 }); cylinder(c, ax - 4.5, ay - 9, 9, 2, IRON, { r: 0.6 }); });
  part(ctx, (c) => ball(c, ax, ay - 13, 4.2, 4.2, "#8ad0a0", { hi: 0.6, lo: 0.35 }));
  part(ctx, (c) => cylinder(c, ax - 1.2, ay - 20.5, 2.4, 5, "#c8dcd0", { r: 0.8 }));
  beam(ctx, ax, ay - 20, ax + 6.5, ay - 16, 1, "#c8dcd0", { grain: false });
  part(ctx, (c) => ball(c, ax + 7, ay - 14.6, 2.2, 2, "#e0a060", { hi: 0.6, lo: 0.35 }));
};

// The props that stand in front of the crew, baked on their own.
const paintFrontProps = (ctx, t, x, y) => {
  const [, cy] = crewSpot(t, x, y);
  for (const p of groundProps(t, x, y)) if (p.fy > cy) p.fn(ctx);
};

// A narrow stone stack.
const masonryChimney = (c, x, top, w, h, col) => {
  cylinder(c, x, top, w, h, col, { r: 1, hi: 0.3, lo: 0.45 });
  c.fillStyle = rgba(darken(col, 0.55), 0.3);
  for (let yy = top + 3; yy < top + h; yy += 3) c.fillRect(x, yy, w, 0.6);
};

// The Midas Cannon's gilded barrel, recoiling.
const paintGun = (ctx, x, y) => {
  beam(ctx, x - 2, y, x + 12, y - 3, 4, "#d0a040", { bands: [0.1, 0.55, 0.92], bandCol: "#8a6a2a", hi: 0.45 });
  part(ctx, (c) => { ball(c, x - 2.4, y + 0.2, 2.4, 2.4, "#b08a3a", { hi: 0.5, lo: 0.4 }); ball(c, x + 12.4, y - 3.1, 1.2, 1.6, "#2a1c18", { hi: 0.1, lo: 0.1 }); });
};

export const drawGoldworks = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const { lvl, r4, mint, alch, stone, bh } = spec(t);
  const hx = x - 3, hw = 10 + (lvl >= 3 ? 1 : 0);
  const bake = canBake();
  const id5 = t.id % 5;
  const r = readiness(t), anim = t.anim || 0;
  if (r4 === "bb") glow(ctx, x, y + 4, 22, "#e8c14a", 0.12 + 0.05 * Math.sin(time * 2 + t.id));
  if (bake) stamp(ctx, cache.get(`house|${t.level}|${t.branch}|${t.rank4}|${id5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintHouse(c, { ...t, id: id5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintHouse(ctx, t, x, y);
  // the furnace breathes
  const br = 0.6 + 0.4 * Math.sin(time * 2.2 + t.id);
  if (r4 !== "aa") {   // (the hoard has buried the furnace mouth)
    const g = y - LIFT;
    glow(ctx, hx - 3.5, g - 1.5, 5 + br * 2, "#f0903a", 0.85 * br);
    ctx.fillStyle = "#f4c060"; ctx.fillRect(hx - 6.5, g, 6, 1.2);
    ctx.fillStyle = "#e8703a"; ctx.fillRect(hx - 6, g - 1.2, 5, 1);
  }
  // gold-fleck smoke from the chimney
  const cx = hx + hw - 2, ctop = y - LIFT - bh - 14 - lvl * 2;
  for (let i = 0; i < 3; i++) {
    const t2 = (time * 9 + i * 7 + t.id * 3) % 22;
    soft(ctx, cx + Math.sin(time * 1.5 + i) * 2, ctop - 2 - t2, 2 + t2 / 8, 2 + t2 / 8, [[0, `rgba(200,196,180,${Math.max(0, 0.4 - t2 * 0.018)})`], [1, "rgba(200,196,180,0)"]]);
    if (i === 1 && t2 < 12) glint(ctx, cx + 1, ctop - 4 - t2, 0.6, 0.9);
  }
  // glints on the takings
  if (!r4 && Math.sin(time * 1.7 + t.id) > 0.9) glint(ctx, x - 7.5, y + 3, 1, 0.9);
  if (r4 === "aa") {
    if (Math.sin(time * 2.3 + t.id) > 0.8) glint(ctx, x - 5, y - 1, 1, 0.9);
    // the dragon snores smoke
    const k = (time * 0.5 + t.id * 0.2) % 1;
    soft(ctx, x - 17 - k * 3, y - 9 - k * 8, 1.4 + k * 2, 1.4 + k * 2, [[0, `rgba(210,200,190,${0.5 * (1 - k)})`], [1, "rgba(210,200,190,0)"]]);
  }
  if (r4 === "ab") {
    const sy = y - 9.5 + Math.sin(time * 2 + t.id) * 1.6;
    glow(ctx, x + 11, sy, 8, "#e04070", 0.35 + 0.1 * Math.sin(time * 3));
    ball(ctx, x + 11, sy, 2.8, 3, "#d8305a", { hi: 0.6, lo: 0.35 });
    ctx.fillStyle = "#fff3d2"; ctx.fillRect(x + 10, sy - 1.6, 1, 1);
    for (let i = 0; i < 3; i++) { const a = time * 1.8 + (i / 3) * Math.PI * 2; glint(ctx, x + 11 + Math.cos(a) * 6, sy + Math.sin(a) * 2, 0.5, 0.8); }
  }
  if (alch) {
    if (bake) stamp(ctx, cache.get("alembic", 40, 40, (c) => paintAlembic(c, 20, 20)), x, y, 20, 20);
    else paintAlembic(ctx, x, y);
  }
  if (alch) { const bub = (time * 3 + t.id) % 1; glow(ctx, x - 12, y - 6.5 - bub * 6, 1.4, "#c8f0d8", 1 - bub); }
  if (r4 === "bb") {
    const bub = (time * 2 + t.id) % 1;
    for (let i = 0; i < 2; i++) soft(ctx, x + 10 + (i - 0.5) * 4, y - 3 - ((bub + i * 0.5) % 1) * 12, 2.5, 2.5, [[0, "rgba(200,220,150,0.4)"], [1, "rgba(200,220,150,0)"]]);
    if (Math.sin(time * 2.1 + t.id) > 0.85) glint(ctx, x + 2, y + 9.5, 0.9, 0.9);
  }
  if (r4 === "ba") {
    // the gilded gun: it kicks back on the shot
    const kick = anim > 0.5 ? 2 : anim > 0.2 ? 1 : 0;
    if (bake) stamp(ctx, cache.get("gun", 20, 12, (c) => paintGun(c, 4, 8)), x + 7 - kick, y - 2, 4, 8);
    if (anim > 0.4) { soft(ctx, x + 22, y - 6, 4 + (1 - anim) * 5, 3 + (1 - anim) * 4, [[0, `rgba(240,230,210,${anim * 0.8})`], [1, "rgba(240,230,210,0)"]]); glow(ctx, x + 21, y - 5.5, 3, "#f8d870", anim); }
    if (Math.sin(time * 1.4 + t.id) > 0.92) glint(ctx, x + 15, y - 5, 0.9, 0.9);
  }
  // ---- the crew
  if (alch) {
    // the alchemist: vial low while he mixes, up and glowing when ready,
    // thrown on the shot
    const throwing = anim > 0.35 || (!t._idle && r > 0.8);
    const [ax, ay] = crewSpot(t, x, y);
    if (bake) stamp(ctx, cache.get(`alch|${throwing ? 1 : 0}`, 28, 34, (c) => drawBomber(c, 12, 31, 1, ALCHEMIST, throwing)), ax, ay, 12, 31, -1);
    else drawBomber(ctx, ax, ay, -1, ALCHEMIST, throwing);
    // the vial over the charge he holds (none just after the throw)
    if (anim <= 0.35) {
      const vx = ax - (throwing ? 5.5 : 6), vy = ay + (throwing ? -25 : -13);
      ctx.fillStyle = "#241a26"; ctx.fillRect(vx - 2, vy - 2.4, 4, 4.4); ctx.fillRect(vx - 0.9, vy - 4, 1.8, 2);
      ctx.fillStyle = "#8ad0a0"; ctx.fillRect(vx - 1.4, vy - 1.8, 2.8, 3.2);
      ctx.fillStyle = "#c8f0d8"; ctx.fillRect(vx - 1, vy - 1.4, 1, 1);
      ctx.fillStyle = "#c8b898"; ctx.fillRect(vx - 0.5, vy - 3.4, 1, 1.4);
      if (throwing) glow(ctx, vx, vy, 4, "#8ad0a0", 0.5 + 0.2 * Math.sin(time * 10));
    }
  } else {
    // the clerk at the door, flipping a coin between waves
    const [kx, ky] = crewSpot(t, x, y);
    if (bake) stamp(ctx, cache.get("clerk", 26, 30, (c) => drawStander(c, 12, 27, 1, CREW_FOLK.clerk)), kx, ky, 12, 27, -1);
    else drawStander(ctx, kx, ky, -1, CREW_FOLK.clerk);
    // his ledger, under the arm
    ctx.fillStyle = "#241a26"; ctx.fillRect(kx - 5.2, ky - 15.4, 3.6, 4.6);
    ctx.fillStyle = "#8a3a2e"; ctx.fillRect(kx - 4.8, ky - 15, 2.8, 3.8);
    ctx.fillStyle = "#e8dcc0"; ctx.fillRect(kx - 2.4, ky - 14.6, 0.6, 3);
    const cyc = ((time / 2.4) + t.id * 0.37) % 1;
    if (cyc < 0.7) {
      const cy = ky - 23 - Math.sin(cyc / 0.7 * Math.PI) * 10;
      ctx.fillStyle = "#241a26"; ctx.fillRect(kx - 1.6, cy - 1.2, 3.2, 2.4);
      ctx.fillStyle = Math.sin(time * 20) > 0 ? "#f8e08a" : "#b08a3a"; ctx.fillRect(kx - 1.1, cy - 0.7, 2.2, 1.4);
    }
  }
  // the takings and wares that stand in front of him
  if (bake) stamp(ctx, cache.get(`front|${t.level}|${t.branch}|${t.rank4}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintFrontProps(c, t, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintFrontProps(ctx, t, x, y);
  const pc = alch ? "#8ad0a0" : r4 === "aa" ? "#c04a30" : r4 === "ab" ? "#8a5ab0" : mint ? "#3a5a8a" : GOLD;
  if (lvl >= 2 || t.branch) pennant(ctx, hx - hw + 2, y - LIFT - bh - (lvl >= 3 ? 16 : 12), 14, pc, time, t.id, -1);
};
