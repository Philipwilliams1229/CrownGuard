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

const paintHouse = (ctx, t, x, y) => {
  const { lvl, r4, mint, alch, stone, roof, bh } = spec(t);
  const hx = x - 3, hw = 10 + (lvl >= 3 ? 1 : 0);
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
  part(ctx, (c) => masonryChimney(c, cx, y - bh - 14 - lvl * 2, 6, bh + 12 + lvl * 2, darken(stone, 0.08)));
  if (lvl >= 2) part(ctx, (c) => cylinder(c, cx - 0.8, y - bh - 14 - lvl * 2, 7.6, 2.2, darken(stone, 0.25), { r: 0.8 }));
  // the house
  stoneBody(ctx, hx, y - bh, hw * 2, bh + 8, stone);
  // the roof: a slate lip at one, a proper roof after
  if (lvl === 1) part(ctx, (c) => cylinder(c, hx - hw - 2, y - bh - 2, hw * 2 + 4, 3.4, roof, { r: 1.2, hi: 0.35, lo: 0.45 }));
  else {
    hipRoof(ctx, hx, y - bh + 1, hw + 2, lvl >= 3 ? 3 : 5, lvl >= 3 ? 11 : 8, roof);
    if (lvl >= 3) {
      // a gable dormer over the door, and the finial
      part(ctx, (c) => {
        c.beginPath(); c.moveTo(hx - 5, y - bh + 1); c.lineTo(hx, y - bh - 7); c.lineTo(hx + 5, y - bh + 1); c.closePath();
        c.fillStyle = lin(c, hx - 5, 0, hx + 5, 0, [[0, lighten(stone, 0.25)], [1, darken(stone, 0.2)]]); c.fill();
      });
      part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, hx - 1.4, y - bh - 3.5, 2.8, 3, 1.2); c.fill(); });
      part(ctx, (c) => ball(c, hx, y - bh - 11.5, 1.6, 1.6, GOLD, { hi: 0.55, lo: 0.3 }));
      if (mint) part(ctx, (c) => { c.fillStyle = GOLD; c.fillRect(hx - 2, y - bh - 15, 4, 2); c.fillRect(hx - 2, y - bh - 16.4, 0.9, 1.4); c.fillRect(hx - 0.45, y - bh - 16.8, 0.9, 1.8); c.fillRect(hx + 1.1, y - bh - 16.4, 0.9, 1.4); });   // a crown
    }
  }
  // the furnace mouth, with an iron door swung open
  part(ctx, (c) => { c.fillStyle = "#2a1c18"; roundRect(c, hx - 8, y - 7, 9, 9, 2.5); c.fill(); });
  part(ctx, (c) => { c.fillStyle = IRON; c.fillRect(hx - 10.4, y - 6.6, 2.2, 8); c.fillStyle = "#8a909c"; c.fillRect(hx - 10, y - 3, 0.8, 0.8); });
  // a shuttered window on the right of the door
  part(ctx, (c) => { c.fillStyle = "#2a2430"; roundRect(c, hx + 4, y - bh + 5, 4, 5, 1); c.fill(); c.fillStyle = alch ? "#8ad0a0" : "#e8c860"; c.fillRect(hx + 4.6, y - bh + 6, 2.8, 3.4); });
  // ---- the takings and the trade, beside it
  const stacks = r4 === "aa" || r4 === "bb" ? 0 : Math.min(5, lvl + (mint ? 2 : 0));
  const spots = [[-13, 7, 4], [-9, 8.5, 6], [-15.5, 4, 3], [-11, 4.8, 5], [-14, 1.5, 7]];
  for (let i = 0; i < stacks; i++) coins(ctx, x + spots[i][0], y + spots[i][1], spots[i][2]);
  if (lvl === 1) crate(ctx, x + 8, y + 1, 7, 5, "#6a4a2e");   // the strongbox
  if (lvl === 1) part(ctx, (c) => { c.fillStyle = GOLD; c.fillRect(x + 7.2, y - 2.8, 1.6, 1.6); });
  if (lvl >= 2 && !alch) {
    // the hanging coin sign
    beam(ctx, hx + hw, y - bh + 3, hx + hw + 6, y - bh + 3, 1.2, OAKWOOD, { grain: false });
    part(ctx, (c) => { ball(c, hx + hw + 5, y - bh + 7.5, 2.8, 2.8, GOLD, { hi: 0.5, lo: 0.4 }); c.fillStyle = darken(GOLD, 0.35); c.fillRect(hx + hw + 4.5, y - bh + 6, 1, 3); });
  }
  if (mint && r4 !== "aa") {
    // the screw press at the door
    const px = x + 9;
    part(ctx, (c) => cylinder(c, px - 4.5, y - 3, 9, 5, "#5a5e6a", { r: 1.2, hi: 0.35, lo: 0.45 }));
    beam(ctx, px - 4, y - 3, px - 4, y - 15, 2, IRON, { grain: false });
    beam(ctx, px + 4, y - 3, px + 4, y - 15, 2, IRON, { grain: false });
    beam(ctx, px - 5, y - 15, px + 5, y - 15, 2.4, "#5a5e6a", { grain: false });
    part(ctx, (c) => { c.fillStyle = "#8a909c"; c.fillRect(px - 0.8, y - 19, 1.6, 12); for (let i = 0; i < 5; i++) { c.fillStyle = "#4a4e58"; c.fillRect(px - 0.8, y - 18 + i * 2.2, 1.6, 0.6); } });
    beam(ctx, px - 7, y - 18.5, px + 7, y - 19.5, 1.4, IRON, { grain: false });
    part(ctx, (c) => { ball(c, px - 7.5, y - 18.5, 1.6, 1.6, "#4a4e58", { hi: 0.5, lo: 0.4 }); ball(c, px + 7.5, y - 19.5, 1.6, 1.6, "#4a4e58", { hi: 0.5, lo: 0.4 }); });
    // a sack of fresh coin
    part(ctx, (c) => { ball(c, x + 13.5, y + 7, 3, 3.2, "#b89a6a", { hi: 0.35, lo: 0.45 }); c.fillStyle = darken("#b89a6a", 0.4); c.fillRect(x + 12.5, y + 3.6, 2, 0.8); });
  }
  if (r4 === "aa") {
    // the hoard: a mound of gold, chests half-buried, and the dragon on it
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - 17, y + 6); c.quadraticCurveTo(x - 15, y - 6, x - 7, y - 7); c.quadraticCurveTo(x - 1, y - 6, x + 4, y + 6); c.closePath();
      c.fillStyle = lin(c, x - 17, y - 7, x + 3, y + 6, [[0, "#f8e08a"], [0.45, COIN], [1, "#a07a2a"]]); c.fill();
      c.fillStyle = "#fff0b0"; for (const [dx, dy] of [[-13, -2], [-8, -4], [-4, 0], [-11, 2], [-1, 3]]) c.fillRect(x + dx, y + dy, 1, 1);
    });
    crate(ctx, x - 1, y + 7, 7, 5, "#8a3a2a");
    part(ctx, (c) => { c.fillStyle = GOLD; c.fillRect(x - 4.5, y + 3, 7, 1); c.fillRect(x - 1.6, y + 3.6, 1.2, 1.6); });
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
    // the pedestal the stone floats over
    part(ctx, (c) => cylinder(c, x + 6.5, y - 6, 8, 9, "#e8e0d0", { r: 1.2, hi: 0.3, lo: 0.4 }));
    part(ctx, (c) => cylinder(c, x + 5.5, y - 8, 10, 2.4, "#f0ead8", { r: 1, hi: 0.3, lo: 0.35 }));
    part(ctx, (c) => { c.fillStyle = GOLD; c.fillRect(x + 6.5, y - 3, 8, 0.9); c.fillRect(x + 10, y - 1.5, 1, 1); });
  }
  if (alch) {
    // the alembic on its stand, a retort, a shelf of vials
    part(ctx, (c) => { for (const dx of [-4, 4]) cylinder(c, x - 13 + dx - 0.6, y - 5, 1.2, 8, IRON, { r: 0.5 }); cylinder(c, x - 18, y - 6, 10, 2, IRON, { r: 0.6 }); });
    part(ctx, (c) => ball(c, x - 13, y - 10.5, 4.4, 4.4, "#8ad0a0", { hi: 0.6, lo: 0.35 }));
    part(ctx, (c) => cylinder(c, x - 14.2, y - 18, 2.4, 5, "#c8dcd0", { r: 0.8 }));
    beam(ctx, x - 13, y - 17.5, x - 6, y - 13, 1, "#c8dcd0", { grain: false });
    part(ctx, (c) => ball(c, x - 5.5, y - 11.6, 2.2, 2, "#e0a060", { hi: 0.6, lo: 0.35 }));
    part(ctx, (c) => { cylinder(c, hx + 11, y - bh + 12, 9, 1.4, OAKWOOD, { r: 0.4 }); for (const [dx, col] of [[4, "#8ad0a0"], [6.4, "#c05a8a"], [8.6, "#7ab0e0"]]) { c.fillStyle = col; c.fillRect(hx + dx, y - bh + 9.4, 1.6, 2.6); } });
  }
  if (r4 === "ba") {
    // the Midas gun's carriage, in front of the house
    part(ctx, (c) => cylinder(c, x + 3, y - 3, 12, 6, "#5a3a24", { r: 1.2, hi: 0.3, lo: 0.45 }));
    wheel(ctx, x + 6, y + 3, 3, "#6a4a2e", { spokes: 6, rim: "#b08a3a" });
    wheel(ctx, x + 13, y + 3, 3, "#6a4a2e", { spokes: 6, rim: "#b08a3a" });
  }
  if (r4 === "bb") {
    // the vat, and the ingots turning
    part(ctx, (c) => { ball(c, x + 10, y - 1, 6, 4.5, "#3a3c46", { hi: 0.35, lo: 0.45 }); ball(c, x + 10, y - 4, 4.6, 1.4, "#a8c060", { hi: 0.5, lo: 0.3 }); });
    part(ctx, (c) => { c.fillStyle = IRON; c.fillRect(x + 4.4, y - 2, 11.2, 1); });
    for (let i = 0; i < 5; i++) {
      const gold = i >= 2, ix = x - 14 + (i % 3) * 5.2, iy = y + 8 - Math.floor(i / 3) * 3;
      part(ctx, (c) => { c.beginPath(); c.moveTo(ix - 2.4, iy); c.lineTo(ix + 2.4, iy); c.lineTo(ix + 1.8, iy - 2.2); c.lineTo(ix - 1.8, iy - 2.2); c.closePath(); c.fillStyle = lin(c, ix - 2, 0, ix + 2, 0, gold ? [[0, "#f8e08a"], [1, "#a07a2a"]] : [[0, "#9aa0ac"], [1, "#4a4e58"]]); c.fill(); });
    }
  }
  skirtB(ctx, x, y, t.id);
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
    glow(ctx, hx - 3.5, y - 1.5, 5 + br * 2, "#f0903a", 0.85 * br);
    ctx.fillStyle = "#f4c060"; ctx.fillRect(hx - 6.5, y, 6, 1.2);
    ctx.fillStyle = "#e8703a"; ctx.fillRect(hx - 6, y - 1.2, 5, 1);
  }
  // gold-fleck smoke from the chimney
  const cx = hx + hw - 2, ctop = y - bh - 14 - lvl * 2;
  for (let i = 0; i < 3; i++) {
    const t2 = (time * 9 + i * 7 + t.id * 3) % 22;
    soft(ctx, cx + Math.sin(time * 1.5 + i) * 2, ctop - 2 - t2, 2 + t2 / 8, 2 + t2 / 8, [[0, `rgba(200,196,180,${Math.max(0, 0.4 - t2 * 0.018)})`], [1, "rgba(200,196,180,0)"]]);
    if (i === 1 && t2 < 12) glint(ctx, cx + 1, ctop - 4 - t2, 0.6, 0.9);
  }
  // glints on the takings
  if (Math.sin(time * 1.7 + t.id) > 0.9) glint(ctx, x - 14, y - 5, 1, 0.9);
  if (r4 === "aa") {
    if (Math.sin(time * 2.3 + t.id) > 0.8) glint(ctx, x - 5, y - 1, 1, 0.9);
    // the dragon snores smoke
    const k = (time * 0.5 + t.id * 0.2) % 1;
    soft(ctx, x - 17 - k * 3, y - 9 - k * 8, 1.4 + k * 2, 1.4 + k * 2, [[0, `rgba(210,200,190,${0.5 * (1 - k)})`], [1, "rgba(210,200,190,0)"]]);
  }
  if (r4 === "ab") {
    const sy = y - 16 + Math.sin(time * 2 + t.id) * 1.6;
    glow(ctx, x + 10.5, sy, 8, "#e04070", 0.35 + 0.1 * Math.sin(time * 3));
    ball(ctx, x + 10.5, sy, 2.8, 3, "#d8305a", { hi: 0.6, lo: 0.35 });
    ctx.fillStyle = "#fff3d2"; ctx.fillRect(x + 9.5, sy - 1.6, 1, 1);
    for (let i = 0; i < 3; i++) { const a = time * 1.8 + (i / 3) * Math.PI * 2; glint(ctx, x + 10.5 + Math.cos(a) * 6, sy + Math.sin(a) * 2, 0.5, 0.8); }
  }
  if (alch) { const bub = (time * 3 + t.id) % 1; glow(ctx, x - 13, y - 12 - bub * 6, 1.4, "#c8f0d8", 1 - bub); }
  if (r4 === "bb") {
    const bub = (time * 2 + t.id) % 1;
    for (let i = 0; i < 2; i++) soft(ctx, x + 10 + (i - 0.5) * 4, y - 8 - ((bub + i * 0.5) % 1) * 12, 2.5, 2.5, [[0, "rgba(200,220,150,0.4)"], [1, "rgba(200,220,150,0)"]]);
    if (Math.sin(time * 2.1 + t.id) > 0.85) glint(ctx, x - 9, y + 5, 0.9, 0.9);
  }
  if (r4 === "ba") {
    // the gilded gun: it kicks back on the shot
    const kick = anim > 0.5 ? 2 : anim > 0.2 ? 1 : 0;
    if (bake) stamp(ctx, cache.get("gun", 20, 12, (c) => paintGun(c, 4, 8)), x + 7 - kick, y - 4, 4, 8);
    if (anim > 0.4) { soft(ctx, x + 22, y - 8, 4 + (1 - anim) * 5, 3 + (1 - anim) * 4, [[0, `rgba(240,230,210,${anim * 0.8})`], [1, "rgba(240,230,210,0)"]]); glow(ctx, x + 21, y - 7.5, 3, "#f8d870", anim); }
    if (Math.sin(time * 1.4 + t.id) > 0.92) glint(ctx, x + 15, y - 7, 0.9, 0.9);
  }
  // ---- the crew
  if (alch) {
    // the alchemist: vial low while he mixes, up and glowing when ready,
    // thrown on the shot
    const throwing = anim > 0.35 || (!t._idle && r > 0.8);
    const ax = r4 ? x - 1 : x + 11, ay = y + 6;
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
    const kx = mint ? x + 3 : x + 11;
    if (bake) stamp(ctx, cache.get("clerk", 26, 30, (c) => drawStander(c, 12, 27, 1, CREW_FOLK.clerk)), kx, y + 6, 12, 27, -1);
    else drawStander(ctx, kx, y + 6, -1, CREW_FOLK.clerk);
    // his ledger, under the arm
    ctx.fillStyle = "#241a26"; ctx.fillRect(kx - 5.2, y - 9.4, 3.6, 4.6);
    ctx.fillStyle = "#8a3a2e"; ctx.fillRect(kx - 4.8, y - 9, 2.8, 3.8);
    ctx.fillStyle = "#e8dcc0"; ctx.fillRect(kx - 2.4, y - 8.6, 0.6, 3);
    const cyc = ((time / 2.4) + t.id * 0.37) % 1;
    if (cyc < 0.7) {
      const cy = y - 17 - Math.sin(cyc / 0.7 * Math.PI) * 10;
      ctx.fillStyle = "#241a26"; ctx.fillRect(kx - 1.6, cy - 1.2, 3.2, 2.4);
      ctx.fillStyle = Math.sin(time * 20) > 0 ? "#f8e08a" : "#b08a3a"; ctx.fillRect(kx - 1.1, cy - 0.7, 2.2, 1.4);
    }
  }
  const pc = alch ? "#8ad0a0" : r4 === "aa" ? "#c04a30" : r4 === "ab" ? "#8a5ab0" : mint ? "#3a5a8a" : GOLD;
  if (lvl >= 2 || t.branch) pennant(ctx, hx - hw + 2, y - bh - (lvl >= 3 ? 16 : 12), 14, pc, time, t.id, -1);
};
