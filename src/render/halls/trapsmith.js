// ============ HALL: THE TRAPSMITH ============
// An open-fronted smithy with the smith at his anvil out front where you can
// see him, and a rack of hung traps beside it counting his ready charges.
// It GROWS: a canvas lean-to over a stone fire-ring and a stump anvil at
// one, a plank shed with a brick forge and bellows at two, a stone forge
// with a chimney and a shingled roof, a grindstone and powder at three.
//   The Springworks hangs a great cog on the gable and bear-iron jaws on the
// rack: the Guillotine Gate stands a small, gleaming guillotine beside it;
// the Caltrop Field keeps a hopper spilling caltrops over the yard.
//   The Blastworks piles sandbags and bomb-marked kegs and racks round
// mines: the Minefield Doctrine mounts a brass horn and a map board full of
// pins; the Aerostat Yard flies a balloon on a windlass with a bomb slung
// under it.
//
// Pixel art: the smithy is baked per form; the forge glow, sparks, the hung
// traps, the balloon and the smith's frames are live or stamped.

import { pad, skirt, OAKWOOD, TIMBER, pennant, spriteCache, stamp, canBake } from "../buildkit.js";
import { masonry } from "../buildkit.js";
import {
  IRON, STEEL, GOLD, ROPE, foot, beam, planks, barrel, crate, rope, coil, boulder, wheel, glint,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part,
} from "./kitB.js";
import { drawSmith, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetTrapsmithBakes = () => cache.clear();
const BOX = { left: 42, right: 42, up: 70, down: 18 };
const CANVAS = "#d8c8a0", BRICK = "#9a5a44", SHINGLE = "#6a5a4e";

const spec = (t) => ({ lvl: t.branch ? 3 : t.level, r4: t.rank4 ? t.branch + t.rank4 : null, spring: t.branch === "a", blast: t.branch === "b" });

// A sloped plank roof between two eave points, the ridge behind.
const shedRoof = (ctx, x0, x1, eave, h, col) => part(ctx, (c) => {
  c.beginPath(); c.moveTo(x0 - 2, eave); c.lineTo(x0 + 2, eave - h); c.lineTo(x1 - 2, eave - h); c.lineTo(x1 + 2, eave); c.closePath();
  c.fillStyle = lin(c, x0, eave - h, x1, eave, [[0, lighten(col, 0.35)], [0.5, col], [1, darken(col, 0.4)]]); c.fill();
  c.fillStyle = rgba(darken(col, 0.5), 0.35);
  for (let ry = eave - 2.4; ry > eave - h; ry -= 2.4) c.fillRect(x0 - 1, ry, x1 - x0 + 2, 0.7);
  c.fillStyle = rgba(lighten(col, 0.5), 0.3); c.fillRect(x0 - 1, eave - 0.9, x1 - x0 + 2, 0.8);
});

const paintShed = (ctx, t, x, y) => {
  const { lvl, r4, spring, blast } = spec(t);
  pad(ctx, x, y + 6, 27, t.id);
  shadow(ctx, x + 6, y + 8, 25, 5, 0.34);
  if (r4 === "ab") for (let i = 0; i < 12; i++) {
    // caltrops scattered over the yard
    const cx = x - 24 + hash(t.id, i) * 48, cy = y + 2 + hash(t.id, i + 20) * 9;
    part(ctx, (c) => { c.fillStyle = "#6a707c"; c.fillRect(cx - 1, cy - 0.3, 2, 0.6); c.fillRect(cx - 0.3, cy - 1, 0.6, 2); c.fillStyle = STEEL; c.fillRect(cx - 0.3, cy - 1, 0.6, 0.6); });
  }
  // ---- the smithy at the back
  if (lvl === 1) {
    // a canvas lean-to on two poles, sloping away behind the fire
    beam(ctx, x - 14, y - 2, x - 14, y - 24, 2.2, OAKWOOD, { grain: false });
    beam(ctx, x + 10, y - 2, x + 10, y - 24, 2.2, OAKWOOD, { grain: false });
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(x - 17, y - 24); c.lineTo(x + 13, y - 24); c.lineTo(x + 11, y - 13); c.lineTo(x - 15, y - 13); c.closePath();
      c.fillStyle = lin(c, 0, y - 24, 0, y - 13, [[0, lighten(CANVAS, 0.2)], [1, darken(CANVAS, 0.3)]]); c.fill();
      c.fillStyle = rgba(darken(CANVAS, 0.4), 0.4); for (let px = x - 13; px < x + 12; px += 5) c.fillRect(px, y - 24, 0.6, 11);
    });
    rope(ctx, x - 14, y - 24, x - 22, y + 2, 1, ROPE, 0.6);
    // the fire ring with coals, where the iron heats
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; boulder(ctx, x + 7 + Math.cos(a) * 4.4, y - 7 + Math.sin(a) * 1.8, 1.4, "#8a8478", i); }
    part(ctx, (c) => ball(c, x + 7, y - 7.4, 3, 1.2, "#3a2a26", { hi: 0.2, lo: 0.2 }));
  } else {
    const col = lvl >= 3 ? "#5a4a3c" : TIMBER;
    // back wall
    planks(ctx, x - 16, y - 26, 30, 24, darken(col, 0.25), 4, t.id);
    part(ctx, (c) => { c.fillStyle = rgba("#1a1420", 0.35); c.fillRect(x - 15, y - 26, 28, 24); });
    // tools on the wall: tongs, a saw, spare jaws
    part(ctx, (c) => {
      c.strokeStyle = IRON; c.lineWidth = 1.1; c.lineCap = "round";
      c.beginPath(); c.moveTo(x - 11, y - 23); c.lineTo(x - 10, y - 15); c.moveTo(x - 9, y - 23); c.lineTo(x - 10, y - 15); c.stroke();
      c.fillStyle = "#b8bcc6"; c.fillRect(x - 6, y - 22, 6, 1.6); c.fillStyle = OAKWOOD; c.fillRect(x - 7.6, y - 22.4, 2, 2.4);
    });
    // the forge: brick at two, a stone hearth with a hood and chimney at three
    const fx = x + 6;
    if (lvl >= 3) {
      part(ctx, (c) => masonry(c, fx + 1, y - 46, 6, 34, "#8a8478", { r: 1, course: 3, block: 3, hi: 0.3, lo: 0.45 }));
      part(ctx, (c) => cylinder(c, fx, y - 47, 8, 2.4, "#6a655c", { r: 0.8 }));
    }
    part(ctx, (c) => masonry(c, fx - 4, y - 14, 14, 14, lvl >= 3 ? "#8a8478" : BRICK, { r: 1.5, course: 2.8, block: 4.5, hi: 0.3, lo: 0.45 }));
    part(ctx, (c) => { c.fillStyle = "#2a1c18"; roundRect(c, fx - 1, y - 11, 8, 5.5, 1.5); c.fill(); });
    if (lvl >= 3) part(ctx, (c) => { c.beginPath(); c.moveTo(fx - 5, y - 14); c.lineTo(fx + 11, y - 14); c.lineTo(fx + 7, y - 20); c.lineTo(fx - 1, y - 20); c.closePath(); c.fillStyle = lin(c, fx - 5, 0, fx + 11, 0, [[0, "#9a948a"], [1, "#5a554c"]]); c.fill(); });
    // the bellows, beside the hearth
    part(ctx, (c) => { c.beginPath(); c.moveTo(fx - 12, y - 9); c.lineTo(fx - 5, y - 11); c.lineTo(fx - 5, y - 7); c.closePath(); c.fillStyle = "#7a4a2e"; c.fill(); c.fillStyle = OAKWOOD; c.fillRect(fx - 13, y - 10.6, 2, 3); });
    // posts and roof: over the forge and the back, never over the smith
    for (const sgn of [-1, 1]) beam(ctx, x - 1 + sgn * 16, y + 1, x - 1 + sgn * 16, y - 26, 2.8, OAKWOOD, { bands: lvl >= 3 ? [0.8] : null });
    shedRoof(ctx, x - 20, x + 18, y - 25, lvl >= 3 ? 10 : 8, lvl >= 3 ? SHINGLE : TIMBER);
  }
  // ---- what the branches raise over it
  if (spring) {
    // the great cog on the gable
    part(ctx, (c) => {
      const gx = x - 1, gy = y - 38, R = 6.5;
      c.beginPath();
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, rr = i % 2 ? R : R + 1.8; c.lineTo(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = lin(c, gx - R, gy - R, gx + R, gy + R, [[0, "#b8bcc6"], [0.5, "#7a808c"], [1, "#4a4e58"]]); c.fill();
      c.fillStyle = "#3a3c46"; c.beginPath(); c.arc(gx, gy, 2.2, 0, Math.PI * 2); c.fill();
    });
    beam(ctx, x - 1, y - 31, x - 1, y - 35, 1.6, OAKWOOD, { grain: false });
  }
  if (blast) {
    // sandbags along the front corner
    for (const [dx, dy] of [[14, 3], [19, 3.4], [24, 3], [16.5, -0.6], [21.5, -0.4]]) part(ctx, (c) => { ball(c, x + dx, y + dy, 3, 2, "#b8a078", { hi: 0.35, lo: 0.45 }); c.fillStyle = rgba("#6a5a3a", 0.6); c.fillRect(x + dx - 0.4, y + dy - 1.6, 0.8, 3); });
  }
  // ---- the yard: anvil, kegs, grindstone, rack
  // the anvil: on a stump at one, on an iron block after
  if (lvl === 1) part(ctx, (c) => { cylinder(c, x - 3.5, y - 3, 7, 5.5, "#8a6238", { r: 1.5, hi: 0.3, lo: 0.45 }); ball(c, x, y - 3, 3.5, 1.2, "#d8b888", { hi: 0.25, lo: 0.3 }); });
  else part(ctx, (c) => cylinder(c, x - 3, y - 3, 6, 5.5, "#4a4a52", { r: 1.2, hi: 0.35, lo: 0.45 }));
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - 6, y - 7.4); c.lineTo(x + 4, y - 7.4); c.quadraticCurveTo(x + 8, y - 7, x + 9, y - 5.6); c.lineTo(x + 3, y - 5); c.lineTo(x + 2.5, y - 3); c.lineTo(x - 3.5, y - 3); c.lineTo(x - 4, y - 5); c.lineTo(x - 6, y - 5.6); c.closePath();
    c.fillStyle = lin(c, 0, y - 7.4, 0, y - 3, [[0, "#b8bcc6"], [0.35, IRON], [1, "#3a3c46"]]); c.fill();
  });
  if (lvl >= 3 && !blast) {
    // a grindstone on its frame
    beam(ctx, x + 17, y + 3, x + 17, y - 5, 1.4, OAKWOOD, { grain: false });
    beam(ctx, x + 23, y + 3, x + 23, y - 5, 1.4, OAKWOOD, { grain: false });
    part(ctx, (c) => ball(c, x + 20, y - 5, 4.4, 4.4, "#a8a49a", { hi: 0.4, lo: 0.45 }));
    part(ctx, (c) => { ball(c, x + 20, y - 5, 1.2, 1.2, OAKWOOD, { hi: 0.3, lo: 0.4 }); c.fillStyle = OAKWOOD; c.fillRect(x + 23.5, y - 5.5, 2.5, 1); });
  }
  if (blast || (lvl >= 3 && !spring)) {
    const kegs = blast ? [[18, -3], [23.5, -3], [21, -9.4]] : [[-19, 5]];
    for (const [dx, dy] of kegs) barrel(ctx, x + dx, y + dy, 5.4, 6.5, "#6a4a2e", { mark: blast ? "#c05848" : null });
  }
  if (r4 === "aa") {
    // the guillotine: two posts, a crossbar, the slanted blade high
    const gx = x + 20;
    beam(ctx, gx - 4, y + 3, gx - 4, y - 28, 2, "#6a3a2a", { grain: false });
    beam(ctx, gx + 4, y + 3, gx + 4, y - 28, 2, "#6a3a2a", { grain: false });
    beam(ctx, gx - 5.5, y - 28, gx + 5.5, y - 28, 2.4, "#5a2e22", { grain: false });
    part(ctx, (c) => { c.beginPath(); c.moveTo(gx - 3, y - 25); c.lineTo(gx + 3, y - 25); c.lineTo(gx + 3, y - 20); c.lineTo(gx - 3, y - 17.5); c.closePath(); c.fillStyle = lin(c, gx - 3, 0, gx + 3, 0, [[0, "#f0f2f6"], [1, "#8a909c"]]); c.fill(); c.fillStyle = "#4a4e58"; c.fillRect(gx - 3, y - 26, 6, 1.4); });
    part(ctx, (c) => { cylinder(c, gx - 4, y - 4, 8, 3, "#6a3a2a", { r: 1 }); c.fillStyle = "#2a1c18"; c.beginPath(); c.arc(gx, y - 3.6, 1.4, Math.PI, 0); c.fill(); });
    rope(ctx, gx + 4, y - 26, gx + 7, y - 2, 0.5, ROPE, 0.6);
  }
  if (r4 === "ab") {
    // the hopper on legs, caltrops spilling from its chute into a heap
    const hx = x + 20;
    for (const dx of [-5, 5]) beam(ctx, hx + dx, y + 3, hx + dx * 0.8, y - 12, 1.6, OAKWOOD, { grain: false });
    for (const [dx, dy] of [[-2, 3], [1.5, 3.4], [0, 1.8], [3, 2], [-3.5, 2.2]]) part(ctx, (c) => { c.fillStyle = "#6a707c"; c.fillRect(hx + dx - 1, y + dy - 0.4, 2.2, 0.8); c.fillRect(hx + dx - 0.4, y + dy - 1, 0.8, 2); });
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(hx - 8, y - 22); c.lineTo(hx + 8, y - 22); c.lineTo(hx + 4, y - 11); c.lineTo(hx - 4, y - 11); c.closePath();
      c.fillStyle = lin(c, hx - 8, 0, hx + 8, 0, [[0, lighten(TIMBER, 0.3)], [0.5, TIMBER], [1, darken(TIMBER, 0.4)]]); c.fill();
      c.fillStyle = rgba(darken(TIMBER, 0.5), 0.4); c.fillRect(hx - 6.6, y - 18, 13.2, 0.7);
      c.fillStyle = IRON; c.fillRect(hx - 7.4, y - 20.6, 14.8, 1.2);
      c.fillStyle = "#4a4e58"; c.fillRect(hx - 1.4, y - 11, 2.8, 3);
    });
    part(ctx, (c) => { ball(c, hx, y - 22, 7.6, 1.6, "#4a4e58", { hi: 0.2, lo: 0.2 }); c.fillStyle = STEEL; for (let i = 0; i < 6; i++) c.fillRect(hx - 5 + i * 2, y - 22.6 + (i % 2) * 0.8, 0.8, 0.8); });
  }
  if (r4 === "ba") {
    // the brass horn on its post, and the map board full of pins
    beam(ctx, x + 22, y + 3, x + 22, y - 22, 1.8, OAKWOOD, { grain: false });
    part(ctx, (c) => { c.beginPath(); c.moveTo(x + 21, y - 21); c.lineTo(x + 14, y - 26); c.lineTo(x + 13, y - 20); c.closePath(); c.fillStyle = lin(c, x + 13, 0, x + 21, 0, [[0, "#f0d070"], [1, "#9a7a2a"]]); c.fill(); });
    part(ctx, (c) => { cylinder(c, x - 29, y - 17, 10, 8, "#d8c8a0", { r: 0.6, hi: 0.2, lo: 0.3 }); c.fillStyle = "#8a7a5a"; c.fillRect(x - 28, y - 13.4, 8, 0.6); c.fillStyle = "#c03a2a"; for (const [dx, dy] of [[-27, -15], [-24, -12], [-22, -15.6], [-25.6, -10.8]]) c.fillRect(x + dx, y + dy, 1, 1); });
    beam(ctx, x - 24, y - 9, x - 24, y + 3, 1.4, OAKWOOD, { grain: false });
  }
  if (r4 === "bb") {
    // the balloon's windlass
    part(ctx, (c) => { for (const dx of [-4, 4]) cylinder(c, x + 21 + dx - 0.8, y - 8, 1.6, 10, OAKWOOD, { r: 0.6 }); });
    part(ctx, (c) => { cylinder(c, x + 16.5, y - 9, 9, 4, OAKWOOD, { r: 1.6, hi: 0.35, lo: 0.45 }); c.fillStyle = ROPE; c.fillRect(x + 17, y - 8, 8, 0.8); c.fillRect(x + 17, y - 6.6, 8, 0.8); });
  }
  // the rack of traps (what hangs on it is live)
  if (r4 !== "ba") {
    beam(ctx, x - 27, y + 3, x - 27, y - 20, 2.2, OAKWOOD, { grain: false });
    beam(ctx, x - 19, y + 3, x - 19, y - 20, 2.2, OAKWOOD, { grain: false });
    beam(ctx, x - 28.5, y - 19.5, x - 17.5, y - 19.5, 1.6, lighten(OAKWOOD, 0.1), { grain: false });
  }
  skirt(ctx, x, y + 7, 22, t.id);
};

// One hung trap, by trade: a spike board, bear-iron jaws, or a mine.
const hungTrap = (ctx, x, y, kind, ready) => {
  if (!ready) { ctx.fillStyle = "rgba(60,54,62,0.45)"; ctx.fillRect(x - 0.3, y - 1.6, 0.6, 1.6); return; }
  ctx.fillStyle = "#241a26"; ctx.fillRect(x - 0.3, y - 2, 0.6, 2);
  if (kind === "a") {
    ctx.fillStyle = "#241a26"; ctx.fillRect(x - 3, y - 0.2, 6, 3.4);
    ctx.fillStyle = "#9aa0ac"; ctx.fillRect(x - 2.5, y + 0.3, 5, 2.4);
    ctx.fillStyle = "#e8ecf2"; for (let i = 0; i < 3; i++) ctx.fillRect(x - 2 + i * 1.7, y + 0.3, 0.7, 1);
    ctx.fillStyle = "#4a4e58"; ctx.fillRect(x - 2.5, y + 1.8, 5, 0.9);
  } else if (kind === "b") {
    ctx.fillStyle = "#241a26"; ctx.beginPath(); ctx.arc(x, y + 2, 2.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4a4a52"; ctx.beginPath(); ctx.arc(x, y + 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a909c"; ctx.fillRect(x - 1.2, y + 0.8, 1, 1);
    ctx.fillStyle = "#c05848"; ctx.fillRect(x - 0.5, y - 0.3, 1, 1);
  } else {
    ctx.fillStyle = "#241a26"; ctx.fillRect(x - 3, y, 6, 2.6);
    ctx.fillStyle = "#8a6238"; ctx.fillRect(x - 2.5, y + 0.5, 5, 1.6);
    ctx.fillStyle = "#e8ecf2"; for (let i = 0; i < 3; i++) ctx.fillRect(x - 2 + i * 1.8, y - 0.8, 0.6, 1.4);
  }
};

export const drawTrapsmith = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const { lvl, r4, spring, blast } = spec(t);
  const bake = canBake();
  const id5 = t.id % 5;
  if (bake) stamp(ctx, cache.get(`shed|${t.level}|${t.branch}|${t.rank4}|${id5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintShed(c, { ...t, id: id5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintShed(ctx, t, x, y);
  // the forge (or fire ring) glows, the bellows breathing it up
  const br = Math.sin(time * 3 + t.id);
  if (lvl === 1) { glow(ctx, x + 7, y - 8, 5 + br, "#f0903a", 0.85); ctx.fillStyle = "#f4a040"; ctx.fillRect(x + 5, y - 8.2, 4, 1); ctx.fillStyle = "#ffe08a"; ctx.fillRect(x + 6 + (br > 0 ? 1 : 0), y - 9, 1, 1); }
  else { glow(ctx, x + 9, y - 8.5, 6 + br, "#f0903a", 0.85); ctx.fillStyle = "#f4a040"; ctx.fillRect(x + 5.6, y - 7.6, 6.8, 1.2); ctx.fillStyle = "#ffe08a"; ctx.fillRect(x + 7 + (br > 0 ? 2 : 0), y - 8.4, 1.4, 0.8); }
  if (lvl >= 3) for (let i = 0; i < 2; i++) { const k = ((time * 0.45 + i * 0.5 + t.id * 0.1) % 1); soft(ctx, x + 10 + Math.sin(time + i) * 1.5, y - 50 - k * 14, 1.6 + k * 3, 1.6 + k * 3, [[0, `rgba(170,164,160,${0.4 * (1 - k)})`], [1, "rgba(170,164,160,0)"]]); }
  // hung traps on the rack, one per ready charge
  const charges = Math.min(4, t.charges || 0);
  const kind = spring ? "a" : blast ? "b" : "s";
  if (r4 !== "ba") for (let i = 0; i < 4; i++) hungTrap(ctx, x - 23, y - 18 + i * 5, kind, i < charges);
  else {
    // the Doctrine stacks its mines in a pyramid instead
    const pts = [[-26, 4], [-21, 4], [-16, 4], [-23.5, 0], [-18.5, 0], [-21, -4]];
    for (let i = 0; i < pts.length; i++) if (i < Math.max(charges, 1) + 2) hungTrap(ctx, x + pts[i][0], y + pts[i][1] - 2, "b", true);
  }
  if (r4 === "aa" && Math.sin(time * 1.6 + t.id) > 0.9) glint(ctx, x + 18, y - 23, 1, 0.95);
  // the balloon of the Aerostat Yard, bobbing on its tether
  if (r4 === "bb") {
    const bx = x + 20 + Math.sin(time * 0.9 + t.id) * 1.2, by = y - 50 + Math.sin(time * 1.4 + t.id) * 2;
    rope(ctx, x + 21, y - 8, bx, by + 12, 1, "#5a4a3a", 0.6);
    const cv = bake ? cache.get("balloon", 20, 30, (c) => paintBalloon(c, 10, 10)) : null;
    if (cv) stamp(ctx, cv, bx, by, 10, 10);
    else paintBalloon(ctx, bx, by);
    if (Math.sin(time * 9) > 0) { ctx.fillStyle = "#f4c060"; ctx.fillRect(bx + 1.8, by + 16.6, 1, 1); }
  }
  // the smith, hammer on the beat; sparks on the strike
  const beat = Math.sin(time * (t._idle ? 3 : 6) + t.id);
  const swing = beat > 0.3 ? 1 : 0;
  const sx = x - 8, sy = y + 4;
  if (bake) stamp(ctx, cache.get(`smith|${swing}`, 30, 37, (c) => drawSmith(c, 12, 34, 1, CREW_FOLK.smith, swing)), sx, sy, 12, 34, 1);
  else drawSmith(ctx, sx, sy, 1, CREW_FOLK.smith, swing);
  if (swing === 0 && beat > -0.3) {
    glow(ctx, x - 1, y - 8, 3, "#ffd070", 0.8);
    for (let i = 0; i < 4; i++) { const a = -0.4 - i * 0.55, d = 2 + (0.3 - beat) * 5; ctx.fillStyle = i % 2 ? "#ffe08a" : "#fff3d2"; ctx.fillRect(x - 1 + Math.cos(a) * d * 1.4, y - 8 + Math.sin(a) * d, 0.9, 0.9); }
  }
  // the hot iron on the anvil
  ctx.fillStyle = "#f4a040"; ctx.fillRect(x - 3, y - 8.2, 4, 0.9);
  const pc = r4 === "aa" ? "#8a2f2a" : r4 === "ab" ? "#8a8f9a" : r4 === "ba" ? "#d8b34a" : r4 === "bb" ? "#c05848" : spring ? "#7a94b8" : blast ? "#c05848" : "#8a8f9a";
  if (lvl >= 2 || t.branch) pennant(ctx, x - 17, y - (lvl >= 3 ? 44 : 40), 14, pc, time, t.id, -1);
};

const paintBalloon = (ctx, x, y) => {
  part(ctx, (c) => ball(c, x, y, 7, 8, "#c05848", { hi: 0.45, lo: 0.45 }));
  part(ctx, (c) => { c.fillStyle = rgba("#e8dcc0", 0.8); c.fillRect(x - 0.6, y - 8, 1.2, 16); c.fillRect(x - 5, y - 2, 1, 7); c.fillRect(x + 4, y - 2, 1, 7); });
  rope(ctx, x - 4, y + 6, x - 2, y + 11, 0, ROPE, 0.5);
  rope(ctx, x + 4, y + 6, x + 2, y + 11, 0, ROPE, 0.5);
  part(ctx, (c) => cylinder(c, x - 2.5, y + 10.5, 5, 3, "#8a6238", { r: 0.8 }));
  part(ctx, (c) => { ball(c, x, y + 15.6, 2.4, 2.4, "#2e2e36", { hi: 0.45, lo: 0.4 }); c.fillStyle = "#6a5a3a"; c.fillRect(x - 0.3, y + 13.4, 0.6, 1); });
};
