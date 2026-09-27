// ============ HALL: THE POWDER WORKS ============
// A squat stone powder store with a plank deck on its roof, and the two men
// who never share a job standing up there in the open: the bombardier with
// a lit charge on the rear side, the musketeer braced at the rail on the
// near side, each firing on his own cadence. It GROWS: rubble walls, a rope
// rail and one keg at one; coursed stone, a banded door, a timber rail and a
// pile of shot at two; dressed stone, a red magazine door with a gold flame,
// kegs stacked and a crate of cartridges at three.
//   The Bombard Yard sets a bronze mortar in front of the store: the Grand
// Battery sets TWO under a crossed-guns banner; Dragon's Breath blackens the
// whole store with pitch, iron mortar glowing, pitch kegs, a fire in a
// brazier. The Long Muskets rack spare long guns on the deck: the
// Sharpshooters lay the musket in a forked rest with a brass scope; the
// Grapeshot Crew bore it out into a flared scattergun and heap grape bags.
//
// Pixel art: the ground and the store are baked per form and facing (the
// footprint stays inside kit B's ellipse); the two men are baked frames;
// fuses, flashes, smoke and fire are live.

import { OAKWOOD, TIMBER, ashlar, door, banner, brazier, flame, pennant, spriteCache, stamp, canBake } from "../buildkit.js";
import {
  IRON, ROPE, PITCH, GOLD, foot, padB, skirtB, beam, barrel, crate, rope, boulder,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part,
} from "./kitB.js";
import { drawBomber, drawMusketeer, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetGunpowderBakes = () => cache.clear();
const BOX = { left: 40, right: 40, up: 70, down: 18 };
const BRONZE = "#b8803e", CHARRED = "#544a46", RED_DOOR = "#8e3a32";

const spec = (t) => {
  const lvl = t.branch ? 3 : t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const key = r4 || t.branch || "l" + lvl;
  return { lvl, r4, key, bomb: t.branch === "a", musket: t.branch === "b", dragon: r4 === "ab", deckY: -9 - lvl };
};

// ---- the ground --------------------------------------------------------------
const paintGround = (ctx, t, x, y, f) => {
  const s = spec(t);
  padB(ctx, x, y, t.id, { hw: 14, stones: s.lvl >= 2 ? 7 : 5 });
  if (s.dragon) {
    // soot and spilled pitch, clipped to the footprint like the rest
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y + 3, 17.5, 12.5, 0, 0, Math.PI * 2); ctx.clip();
    soft(ctx, x - f * 4, y + 7, 13, 5, [[0, "rgba(38,30,34,0.5)"], [1, "rgba(38,30,34,0)"]]);
    part(ctx, (c) => ball(c, x + f * 9, y + 11, 3.4, 1.2, PITCH, { hi: 0.25, lo: 0.2 }));
    ctx.restore();
  }
  skirtB(ctx, x, y, t.id, s.dragon ? 2 : 4);
};

// A mortar on its wooden bed, mouth cocked toward the foe.
const mortar = (ctx, mx, gy, f, col, o = {}) => {
  foot(ctx, mx + 0.5, gy, 5.5);
  crate(ctx, mx, gy, 10, 3.2, o.bed || "#6a4a2e");
  part(ctx, (c) => {
    c.save(); c.translate(mx, gy - 5.6); c.rotate(f * 0.35);
    ball(c, 0, 0.8, 4.6, 3.6, col, { hi: 0.5, lo: 0.45 });
    cylinder(c, -3.2, -4.6, 6.4, 5, col, { r: 1.2, hi: 0.45, lo: 0.5 });
    c.fillStyle = o.band || darken(col, 0.4); c.fillRect(-3.4, -3.2, 6.8, 1); c.fillRect(-4.2, 0.6, 8.4, 0.9);
    ball(c, 0, -4.6, 3.3, 1.5, lighten(col, 0.2), { hi: 0.3, lo: 0.2 });
    ball(c, 0, -4.5, 2.3, 0.95, o.mouth || "#1e1a20", { hi: 0.05, lo: 0.05 });
    c.restore();
  });
  // the trunnion pin
  part(ctx, (c) => ball(c, mx - f * 0.4, gy - 5, 1.1, 1.1, IRON, { hi: 0.5, lo: 0.4 }));
};
// where a mortar's mouth ends up, for the live flash
const mouthOf = (mx, gy, f) => [mx + f * 1.6, gy - 10];

// the Grapeshot Crew's bags, heaped on the ground at the front corner
// (back to front; the third rides on the first two, so casts no print)
const GRAPE = [[10.2, 6.6, 1], [13.6, 6.8, 1], [11.9, 4.4, 0], [11.2, 9.2, 1]];

const mortarSpots = (s, x, y, f) => s.r4 === "aa" ? [[x - f * 8.5, y + 10], [x + f * 3, y + 12.5]] : s.bomb ? [[x - f * 8, y + 11.5]] : [];

// ---- the store and its deck ------------------------------------------------------
const paintStore = (ctx, t, x, y, f) => {
  const s = spec(t), lvl = s.lvl, dY = y + s.deckY;
  const stone = s.dragon ? CHARRED : lvl >= 3 ? "#a29a8a" : lvl === 2 ? "#948c7e" : "#8a8272";
  const wood = s.dragon ? "#4a3a30" : TIMBER;
  const hw = 12 + (lvl >= 2 ? 1 : 0);
  // behind the deck: the pennant pole's socket, the Grand Battery's banner,
  // the Long Muskets' rack — all rising from the back corners
  if (s.r4 === "aa") {
    part(ctx, (c) => cylinder(c, x - f * 11 - 0.8, dY - 36, 1.6, 32, OAKWOOD, { r: 0.8, hi: 0.3, lo: 0.5 }));
    banner(ctx, x - f * 11 + f * 4.2, dY - 34, 7, 10, "#8a2e2a", GOLD, (c, bx, by) => {
      c.strokeStyle = GOLD; c.lineWidth = 0.9; c.lineCap = "round";
      c.beginPath(); c.moveTo(bx - 2.2, by + 2); c.lineTo(bx + 2.2, by - 2); c.moveTo(bx + 2.2, by + 2); c.lineTo(bx - 2.2, by - 2); c.stroke();
      c.fillStyle = "#2a2430"; c.fillRect(bx - 0.9, by + 1.6, 1.8, 1.8);
    });
  }
  if (s.musket) {
    // the rack: two posts, a bar, long guns leaning in it
    const rx = x + f * 10;
    for (const d of [-2.5, 3]) part(ctx, (c) => cylinder(c, rx + f * d - 0.7, dY - 20, 1.4, 17, OAKWOOD, { r: 0.6, hi: 0.3, lo: 0.5 }));
    beam(ctx, rx - f * 3.5, dY - 17, rx + f * 4, dY - 17, 1.4, OAKWOOD, { grain: false });
    const n = s.r4 === "bb" ? 2 : 3;
    for (let i = 0; i < n; i++) part(ctx, (c) => {
      const gx = rx + f * (-1.5 + i * 2.2);
      c.strokeStyle = "#5f4326"; c.lineWidth = 1.5; c.lineCap = "round";
      c.beginPath(); c.moveTo(gx - f * 0.5, dY - 4); c.lineTo(gx, dY - 11); c.stroke();
      c.strokeStyle = "#8a909c"; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(gx, dY - 11); c.lineTo(gx + f * 0.8, dY - 25 - (i % 2) * 2); c.stroke();
    });
  }
  // the deck: a plank top seen from above, the store's roof
  part(ctx, (c) => {
    c.fillStyle = lin(c, x - hw, dY - 6, x + hw, dY, [[0, lighten(wood, 0.35)], [1, lighten(wood, 0.05)]]);
    c.beginPath(); c.moveTo(x - hw + 1.5, dY - 6); c.lineTo(x + hw - 1.5, dY - 6); c.lineTo(x + hw + 0.5, dY); c.lineTo(x - hw - 0.5, dY); c.closePath(); c.fill();
    c.fillStyle = rgba(darken(wood, 0.55), 0.4);
    for (let py = dY - 4.5; py < dY; py += 2) c.fillRect(x - hw, py, hw * 2, 0.5);
    c.fillStyle = rgba(darken(wood, 0.5), 0.5);
    for (let i = 0; i < 4; i++) c.fillRect(x - hw + 3 + hash(t.id, i) * (hw * 2 - 6), dY - 5 + (i % 3) * 2, 0.7, 0.7);
  });
  // the back rail post and the pennant socket
  part(ctx, (c) => cylinder(c, x - f * (hw - 1.5) - 0.9, dY - 10, 1.8, 6, OAKWOOD, { r: 0.8 }));
  // the store's front face
  ashlar(ctx, x - hw, dY, hw * 2, y + 4 - dY, stone, t.id, { course: lvl === 1 ? 3.5 : 4, block: lvl === 1 ? 5 : lvl === 2 ? 7 : 9, r: 1 });
  if (lvl === 1) part(ctx, (c) => { c.fillStyle = rgba("#fff3d2", 0.2); for (let i = 0; i < 5; i++) c.fillRect(x - hw + 2 + i * 5, dY + 2 + (i % 2) * 4, 1.5, 0.8); });
  if (lvl >= 3) {
    part(ctx, (c) => { cylinder(c, x - hw - 0.5, dY - 0.5, hw * 2 + 1, 2.2, lighten(stone, 0.12), { r: 0.6, hi: 0.35, lo: 0.4 }); });   // the lintel course
    for (const sg of [-1, 1]) part(ctx, (c) => {   // pale quoins up the corners
      c.fillStyle = lighten(stone, 0.28);
      for (let i = 0; i < 4; i++) c.fillRect(x + sg * hw - (sg > 0 ? (i % 2 ? 3 : 4.5) : 0), dY + 2 + i * 3.6, i % 2 ? 3 : 4.5, 3);
      c.fillStyle = rgba(darken(stone, 0.6), 0.6);
      for (let i = 1; i < 4; i++) c.fillRect(x + sg * hw - (sg > 0 ? 4.5 : 0), dY + 1.8 + i * 3.6, 4.5, 0.5);
    });
    // a hooded lamp over the magazine door
    part(ctx, (c) => { const lx = x + f * 4.5; c.fillStyle = IRON; c.fillRect(lx - 0.4, dY + 1.5, 0.8, 2); cylinder(c, lx - 1.3, dY + 3.2, 2.6, 2.6, "#3a3440", { r: 0.6 }); c.fillStyle = "#f4c060"; c.fillRect(lx - 0.6, dY + 4, 1.2, 1.2); });
  }
  beam(ctx, x - hw - 1, dY, x + hw + 1, dY, 2.2, darken(wood, 0.1), { grain: false });
  if (s.dragon) part(ctx, (c) => {   // pitch runs down the stone
    c.fillStyle = rgba(PITCH, 0.8);
    for (const [dx, h] of [[-9, 6], [-3, 9], [6, 5], [10, 8]]) { c.fillRect(x + dx, dY + 1, 1.2, h); ball(c, x + dx + 0.6, dY + 1 + h, 0.9, 0.9, PITCH, { hi: 0.1, lo: 0.1 }); }
  });
  // the door: plank, banded, then the red magazine door with its gold flame
  const dx = x + f * 4.5, dh = Math.min(9, y + 4 - dY - 2);
  door(ctx, dx, y + 4, 6, dh, lvl >= 3 ? (s.dragon ? "#3a2c28" : RED_DOOR) : "#5e4128");
  if (lvl >= 2) part(ctx, (c) => { c.fillStyle = IRON; c.fillRect(dx - 3, y + 4 - dh + 2, 6, 0.9); c.fillRect(dx - 3, y + 1.5, 6, 0.9); });
  if (lvl >= 3) part(ctx, (c) => {
    c.fillStyle = s.dragon ? "#f08a3a" : GOLD;
    c.beginPath(); c.moveTo(dx, y + 4 - dh + 3); c.quadraticCurveTo(dx + 1.6, y + 4 - dh + 5.2, dx, y + 4 - dh + 6.4); c.quadraticCurveTo(dx - 1.6, y + 4 - dh + 5.2, dx, y + 4 - dh + 3); c.fill();
  });
  // on the ground: kegs on the rear side, shot, cartridges. The store's
  // front face ends at y+4; everything here stands on the ground IN FRONT
  // of that line (or off its corner), each on its own contact print, drawn
  // back to front — nothing half-sunk into the stone.
  const kegCol = s.dragon ? PITCH : "#7a5634";
  const kegs = lvl >= 3 ? [[14.8, 5.4, 4.6, 6, "#6e4c2e", !s.dragon], [12.4, 8.4, 5, 6.5, kegCol, true]] : [[13.6, 7.4, 5, 6.5, kegCol, true]];
  for (const [ox, oy, w, h, col, marked] of kegs) {
    foot(ctx, x - f * ox, y + oy, w * 0.62, 0.38);
    barrel(ctx, x - f * ox, y + oy, w, h, s.dragon ? PITCH : col, { mark: !marked ? null : s.dragon ? "#f08a3a" : lvl >= 2 ? "#c04a3a" : null });
  }
  if (s.dragon) { foot(ctx, x + f * 12, y + 9.6, 3.2, 0.4); brazier(ctx, x + f * 12, y + 9.5, 0.85, "#3a3440"); }
  else if (s.r4 === "bb") for (const [ox, oy, onGround] of GRAPE) part(ctx, (c) => {   // grape bags heaped on the ground
    if (onGround) shadow(c, x + f * ox + 0.4, y + oy + 1.8, 2.4, 0.8, 0.32);
    ball(c, x + f * ox, y + oy, 2, 2.2, "#b8a070", { hi: 0.4, lo: 0.45 });
    c.fillStyle = "#6c727e"; c.fillRect(x + f * ox - 1.2, y + oy - 0.2, 0.9, 0.9); c.fillRect(x + f * ox + 0.2, y + oy + 0.8, 0.9, 0.9);
    c.fillStyle = darken(ROPE, 0.4); c.fillRect(x + f * ox - 0.8, y + oy - 2.4, 1.6, 0.7);
  });
  else if (lvl >= 3) { foot(ctx, x + f * 12, y + 9, 3.8, 0.4); crate(ctx, x + f * 12, y + 9, 6, 4.5, darken(TIMBER, 0.08)); }
  if (lvl >= 2 && !s.bomb) {
    const shot = lvl >= 3 ? [[-7, 11.8, 1.6], [-4, 12, 1.6], [-5.5, 10.4, 1.5]] : [[-8, 11, 1.6], [-5, 11.2, 1.6], [-6.5, 9.6, 1.5]];
    foot(ctx, x + f * shot[0][0] + f * 1.5, shot[0][1] + y + 1, 3.6, 0.3);
    for (const [ox, oy, r] of shot) boulder(ctx, x + f * ox, y + oy, r, "#4a4e58", ox);
  }
  if (s.bomb) {
    const col = s.dragon ? "#3a3440" : BRONZE;
    for (const [mx, gy] of mortarSpots(s, x, y, f)) mortar(ctx, mx, gy, f, col, { band: s.r4 === "aa" ? GOLD : null, mouth: s.dragon ? "#6a2a1a" : null, bed: s.dragon ? "#3a2c28" : null });
    if (!s.r4) for (const [ox, oy, r] of [[1.5, 12.5, 1.4], [4, 12.6, 1.4]]) boulder(ctx, x + f * ox, y + oy, r, "#4a4e58", ox);
  }
};

// ---- the front rail, over the men's shins ---------------------------------------
const paintRail = (ctx, t, x, y, f) => {
  const s = spec(t), dY = y + s.deckY, hw = 12 + (s.lvl >= 2 ? 1 : 0);
  const wood = s.dragon ? "#4a3a30" : OAKWOOD;
  const posts = s.lvl === 1 ? [-hw + 1, hw - 1] : [-hw + 1, 0, hw - 1];
  for (const px of posts) part(ctx, (c) => cylinder(c, x + px - 0.7, dY - 5, 1.4, 5.5, wood, { r: 0.6, hi: 0.3, lo: 0.5 }));
  if (s.lvl === 1) rope(ctx, x - hw + 1, dY - 4, x + hw - 1, dY - 4, 1.4);
  else beam(ctx, x - hw, dY - 4.2, x + hw, dY - 4.2, 1.3, wood, { grain: false, bands: s.lvl >= 3 ? [0.1, 0.9] : null });
};

// The musketeer and his gun as the branch has it: the plain long gun, a
// scoped barrel laid in a forked rest, or a bell-mouthed scattergun.
const MUZZLE = { plain: 13, sharp: 19.5, grape: 15.5 };
const paintMusketeer = (ctx, gun, kick) => {
  ctx.save(); ctx.translate(12, 29);
  if (gun === "sharp") part(ctx, (c) => {   // the rest stands on the deck, forked at the barrel
    c.strokeStyle = "#5f4326"; c.lineWidth = 1.1; c.lineCap = "round";
    c.beginPath(); c.moveTo(5.2, 0.4); c.lineTo(13, -15.4); c.moveTo(13, -15.4); c.lineTo(11.9, -17.6); c.moveTo(13, -15.4); c.lineTo(14.4, -17.5); c.stroke();
  });
  ctx.restore();
  drawMusketeer(ctx, 12, 29, 1, CREW_FOLK.musketeer, 0);
  ctx.save(); ctx.translate(12, 29);
  if (gun === "sharp") part(ctx, (c) => {
    c.strokeStyle = "#6c727e"; c.lineWidth = 1.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(12, -16.4); c.lineTo(19.5, -17.4); c.stroke();
    c.strokeStyle = "#c89a48"; c.lineWidth = 1.5;                                   // the brass scope
    c.beginPath(); c.moveTo(4.5, -18.2); c.lineTo(10, -18.9); c.stroke();
    c.fillStyle = "#e8d8a8"; c.fillRect(9.4, -19.6, 1, 1.4);
  });
  if (gun === "grape") part(ctx, (c) => {
    c.fillStyle = lin(c, 0, -19, 0, -14, [[0, "#9aa0ac"], [1, "#4a4e58"]]);
    c.beginPath(); c.moveTo(11, -17.4); c.lineTo(15.8, -19.2); c.lineTo(15.8, -14.2); c.lineTo(11, -15.8); c.closePath(); c.fill();
    c.fillStyle = "#1e1a20"; c.fillRect(15, -18.4, 0.9, 3.4);
  });
  ctx.restore();
};

// ---- per frame -------------------------------------------------------------------
export const drawGunpowder = (ctx, t, time) => {
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const s = spec(t), dY = y + s.deckY;
  const f = t._idle ? 1 : (Math.cos(t.lastAim || 0) >= 0 ? 1 : -1);
  const bake = canBake();
  const id5 = t.id % 5, form = `${s.key}|${s.lvl}|${f}`;
  const layer = (name, fn) => {
    if (!bake) { fn(ctx, t, x, y, f); return; }
    stamp(ctx, cache.get(`${name}|${form}|${name === "g" ? id5 : 0}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => fn(c, { ...t, id: id5 }, BOX.left, BOX.up, f)), x, y, BOX.left, BOX.up);
  };
  layer("g", paintGround);
  layer("s", paintStore);
  const anim = t.anim || 0, mA = t.mAnim || 0;
  // the pennant at the rear corner (the Battery flies its banner instead)
  if (s.r4 !== "aa") pennant(ctx, x - f * 10.5, dY - 22, 13, s.dragon ? "#c8502a" : s.musket ? "#3a4a6a" : s.bomb ? "#a04a3f" : "#5a4a3c", time, t.id, -f);
  // Dragon's Breath: the brazier burns, the pitch smokes
  if (s.dragon) {
    flame(ctx, x + f * 12, y + 3.4, 0.7, time, t.id);
    for (let i = 0; i < 2; i++) { const k = (time * 0.5 + i * 0.5 + t.id * 0.13) % 1; soft(ctx, x + f * 12 + Math.sin(time + i) * 1.5, y - 3 - k * 16, 2 + k * 3, 2 + k * 3, [[0, `rgba(52,44,50,${0.4 * (1 - k)})`], [1, "rgba(52,44,50,0)"]]); }
  }
  // ---- the bombardier, rear side: charge held low with a sputtering fuse, then up and away
  const throwing = anim > 0.45;
  const bx = x - f * 5.5, by = dY - 2.5;
  if (!t.noFolk) {
    if (bake) stamp(ctx, cache.get(`bomber|${throwing ? 1 : 0}`, 30, 34, (c) => drawBomber(c, 12, 30, 1, CREW_FOLK.bomber, throwing)), bx, by, 12, 30, f);
    else drawBomber(ctx, bx, by, f, CREW_FOLK.bomber, throwing);
    const fuse = s.dragon ? "#f08a3a" : "#ffe08a";
    if (anim === 0 || throwing) {
      const fx = bx + f * (throwing ? 6 : 6.5), fy = by + (throwing ? -27.5 : -15.5);
      const fl = Math.sin(time * 26 + t.id) > 0;
      glow(ctx, fx, fy, fl ? 2.6 : 1.8, fuse, 0.85);
      ctx.fillStyle = fl ? "#fff3d2" : fuse; ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
    }
  }
  // ---- the musketeer, near side: kicks back, flash and smoke from the muzzle
  // (his rest, scope and bell ride in his own sprite)
  const gun = s.r4 === "ba" ? "sharp" : s.r4 === "bb" ? "grape" : "plain";
  const kick = mA > 0.55 ? 1.5 : 0;
  const mx = x + f * 6.5, my = dY - 2.5;
  const tipX = mx - f * kick + f * MUZZLE[gun], tipY = my - (gun === "sharp" ? 17.4 : gun === "grape" ? 16.7 : 16.5);
  if (!t.noFolk) {
    if (bake) stamp(ctx, cache.get(`musk|${gun}`, 36, 34, (c) => paintMusketeer(c, gun, 0)), mx - f * kick, my, 12, 29, f);
    else drawMusketeer(ctx, mx, my, f, CREW_FOLK.musketeer, kick);
    if (mA > 0.7) {
      const k = (mA - 0.7) / 0.3;
      glow(ctx, tipX + f * 2, tipY, 5 + k * 3, "#f4c060", 0.8 * k);
      ctx.fillStyle = "#fff3d2";
      const rays = gun === "grape" ? [-0.4, -0.13, 0.13, 0.4] : [0];
      for (const a of rays) { const L = 3 + k * 3; for (let i = 1; i <= 3; i++) ctx.fillRect(tipX + f * Math.cos(a) * i * L / 3 - 0.6, tipY + Math.sin(a) * i * L / 3 - 0.6, 1.2, 1.2); }
    }
    if (mA > 0.1) {
      const p = 1 - mA;
      for (let i = 0; i < (gun === "grape" ? 3 : 2); i++) soft(ctx, tipX + f * (3 + p * 7 + i * 3), tipY - p * 4 - i * 1.5 + (gun === "grape" ? (i - 1) * 2 : 0), 2.5 + p * 4, 2.2 + p * 3, [[0, `rgba(214,210,200,${0.6 * mA})`], [1, "rgba(214,210,200,0)"]]);
    }
  }
  layer("r", paintRail);
  // the mortars bark with the throw: a flash and a ball of smoke at each mouth
  if (s.bomb && anim > 0.4) mortarSpots(s, x, y, f).forEach(([ox, gy], i) => {
    const [ux, uy] = mouthOf(ox, gy, f), k = (anim - 0.4) / 0.6, p = 1 - k;
    if (k > 0.6) glow(ctx, ux, uy, 4 + k * 2, s.dragon ? "#f08a3a" : "#f4c060", 0.8 * k);
    soft(ctx, ux + f * p * 3, uy - 2 - p * 8 - i, 3 + p * 4, 3 + p * 3, [[0, s.dragon ? `rgba(50,40,44,${0.7 * k})` : `rgba(210,206,196,${0.7 * k})`], [1, "rgba(200,196,186,0)"]]);
  });
  if (s.dragon) mortarSpots(s, x, y, f).forEach(([ox, gy]) => { const [ux, uy] = mouthOf(ox, gy, f); glow(ctx, ux, uy + 0.5, 2.2, "#f08a3a", 0.5 + 0.25 * Math.sin(time * 6 + t.id)); });
  // idle: the musketeer's barrel catches the sun
  if (!t.noFolk && t._idle && Math.sin(time * 1.7 + t.id) > 0.9) glow(ctx, tipX - f * 3, tipY, 1.8, "#ffffff", 0.85);
};
