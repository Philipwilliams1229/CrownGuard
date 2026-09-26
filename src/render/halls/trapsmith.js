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

import { OAKWOOD, TIMBER, pennant, spriteCache, stamp, canBake } from "../buildkit.js";
import { masonry } from "../buildkit.js";
import {
  IRON, STEEL, GOLD, ROPE, foot, padB, skirtB, beam, planks, barrel, crate, rope, coil, boulder, wheel, glint,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part,
} from "./kitB.js";
import { drawSmith, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetTrapsmithBakes = () => cache.clear();
const BOX = { left: 42, right: 42, up: 70, down: 18 };
const CANVAS = "#d8c8a0", BRICK = "#9a5a44", SHINGLE = "#6a5a4e";

// where the level-one fire ring sits (the live glow follows it)
const FIRE1 = [9.5, 1.6];
// the guillotine and the windlass stand here; the Doctrine piles its mines here
const GUIL = [12.5], WINCH = [13.5];
const MINES = [[-15, 0.6], [-10.6, 1], [-12.8, -3]];

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
  padB(ctx, x, y, t.id, { hw: 14 });
  if (r4 === "ab") for (let i = 0; i < 12; i++) {
    // caltrops scattered over the yard
    const a = hash(t.id, i) * Math.PI * 2, d = Math.sqrt(hash(t.id, i + 20)), cx = x + Math.cos(a) * d * 14, cy = y + 5 + Math.sin(a) * d * 6;
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
    rope(ctx, x - 14, y - 24, x - 16.5, y + 3, 1, ROPE, 0.6);
    // the fire ring with coals, where the iron heats: on the open ground at
    // the lean-to's mouth, in front of the pole's foot, not sunk behind it
    const [rx, ry] = FIRE1;
    foot(ctx, x + rx, y + ry + 0.6, 5.6, 0.3);
    // back stones, the coals, then the front stones over them
    const ring = (front) => { for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.2; if ((Math.sin(a) > 0) === front) boulder(ctx, x + rx + Math.cos(a) * 4.4, y + ry + Math.sin(a) * 1.8, 1.4, "#8a8478", i); } };
    ring(false);
    part(ctx, (c) => ball(c, x + rx, y + ry - 0.4, 3, 1.2, "#3a2a26", { hi: 0.2, lo: 0.2 }));
    ring(true);
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
    for (const sgn of [-1, 1]) beam(ctx, x - 1 + sgn * 14.5, y + 1, x - 1 + sgn * 14.5, y - 26, 2.8, OAKWOOD, { bands: lvl >= 3 ? [0.8] : null });
    shedRoof(ctx, x - 20, x + 18, y - 25, lvl >= 3 ? 10 : 8, lvl >= 3 ? SHINGLE : TIMBER);
  }
  // ---- what the branches raise over it
  if (spring) {
    // the great cog on the gable: its post stands on the ridge and the cog
    // rides clear above the shingles, left of the chimney
    const gx = x - 3, gy = y - 43.5;
    beam(ctx, gx, y - 35, gx, gy, 1.6, OAKWOOD, { grain: false });
    part(ctx, (c) => {
      const R = 6.5;
      c.beginPath();
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, rr = i % 2 ? R : R + 1.8; c.lineTo(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = lin(c, gx - R, gy - R, gx + R, gy + R, [[0, "#b8bcc6"], [0.5, "#7a808c"], [1, "#4a4e58"]]); c.fill();
      c.fillStyle = "#3a3c46"; c.beginPath(); c.arc(gx, gy, 2.2, 0, Math.PI * 2); c.fill();
    });
  }
  // ---- the yard: anvil, kegs, grindstone, rack
  // the anvil: on a stump at one, on an iron block after
  if (lvl === 1) part(ctx, (c) => { cylinder(c, x - 3.5, y - 3, 7, 5.5, "#8a6238", { r: 1.5, hi: 0.3, lo: 0.45 }); ball(c, x, y - 3, 3.5, 1.2, "#d8b888", { hi: 0.25, lo: 0.3 }); });
  else part(ctx, (c) => cylinder(c, x - 3, y - 3, 6, 5.5, "#4a4a52", { r: 1.2, hi: 0.35, lo: 0.45 }));
  part(ctx, (c) => {
    c.beginPath(); c.moveTo(x - 6, y - 7.4); c.lineTo(x + 4, y - 7.4); c.quadraticCurveTo(x + 8, y - 7, x + 9, y - 5.6); c.lineTo(x + 3, y - 5); c.lineTo(x + 2.5, y - 3); c.lineTo(x - 3.5, y - 3); c.lineTo(x - 4, y - 5); c.lineTo(x - 6, y - 5.6); c.closePath();
    c.fillStyle = lin(c, 0, y - 7.4, 0, y - 3, [[0, "#b8bcc6"], [0.35, IRON], [1, "#3a3c46"]]); c.fill();
  });
  // Everything below stands on the open yard IN FRONT of the shed's posts
  // (their feet are at y+1), each on its own contact print, back to front.
  if (lvl >= 3 && !blast && !r4) {
    // a grindstone on its frame, out in front of the right post
    const gx = x + 13, gy = y + 7.5;
    foot(ctx, gx, gy, 3.6, 0.35);
    beam(ctx, gx - 2.6, gy, gx - 2.6, gy - 8, 1.4, OAKWOOD, { grain: false });
    part(ctx, (c) => ball(c, gx, gy - 8.5, 3.6, 3.6, "#a8a49a", { hi: 0.4, lo: 0.45 }));
    part(ctx, (c) => { ball(c, gx, gy - 8.5, 1, 1, OAKWOOD, { hi: 0.3, lo: 0.4 }); c.fillStyle = OAKWOOD; c.fillRect(gx + 2.8, gy - 9, 2, 1); });
    beam(ctx, gx + 2.6, gy, gx + 2.6, gy - 8, 1.4, OAKWOOD, { grain: false });
  }
  if (r4 === "aa") {
    // the guillotine: two posts, a crossbar under the eave, the slanted blade
    const gx = x + GUIL[0], gy = y + 4;
    foot(ctx, gx, gy, 5.2, 0.38);
    beam(ctx, gx - 3.5, gy, gx - 3.5, y - 23.5, 2, "#6a3a2a", { grain: false });
    part(ctx, (c) => { c.beginPath(); c.moveTo(gx - 2.5, y - 21); c.lineTo(gx + 2.5, y - 21); c.lineTo(gx + 2.5, y - 16); c.lineTo(gx - 2.5, y - 13.8); c.closePath(); c.fillStyle = lin(c, gx - 2.5, 0, gx + 2.5, 0, [[0, "#f0f2f6"], [1, "#8a909c"]]); c.fill(); c.fillStyle = "#4a4e58"; c.fillRect(gx - 2.5, y - 22, 5, 1.4); });
    part(ctx, (c) => { cylinder(c, gx - 3.5, gy - 3.4, 7, 3.4, "#6a3a2a", { r: 1 }); c.fillStyle = "#2a1c18"; c.beginPath(); c.arc(gx, gy - 2.8, 1.4, Math.PI, 0); c.fill(); });
    beam(ctx, gx + 3.5, gy, gx + 3.5, y - 23.5, 2, "#6a3a2a", { grain: false });
    beam(ctx, gx - 5, y - 23.5, gx + 5, y - 23.5, 2.4, "#5a2e22", { grain: false });
    rope(ctx, gx + 3.5, y - 22, gx + 4.8, gy - 5, 0.5, ROPE, 0.6);
  }
  if (r4 === "ab") {
    // the hopper on legs, caltrops spilling from its chute into a heap
    const hx = x + 12.5, gy = y + 4;
    foot(ctx, hx, gy, 5.4, 0.35);
    for (const dx of [-4, 4]) beam(ctx, hx + dx, gy, hx + dx * 0.8, y - 12, 1.6, OAKWOOD, { grain: false });
    for (const [dx, dy] of [[-2, 3.6], [1.5, 4], [0, 2.4], [3, 2.6], [-3.5, 2.8]]) part(ctx, (c) => { c.fillStyle = "#6a707c"; c.fillRect(hx + dx - 1, y + dy - 0.4, 2.2, 0.8); c.fillRect(hx + dx - 0.4, y + dy - 1, 0.8, 2); });
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
    // the brass horn bracketed to the shed's right post, flaring out under
    // the eave; the map board full of pins stands behind the mine pile
    part(ctx, (c) => {
      c.fillStyle = IRON; c.fillRect(x + 12, y - 20, 3.4, 1.1);
      c.beginPath(); c.moveTo(x + 14.6, y - 19.6); c.lineTo(x + 20.6, y - 23.4); c.lineTo(x + 21.2, y - 16.4); c.closePath();
      c.fillStyle = lin(c, x + 14, 0, x + 21, 0, [[0, "#9a7a2a"], [0.6, "#e8c060"], [1, "#f0d070"]]); c.fill();
      c.fillStyle = "#5a4418"; c.fillRect(x + 20.4, y - 22.6, 0.8, 5.6);
    });
    foot(ctx, x - 17, y - 1, 1.6, 0.35);
    beam(ctx, x - 17, y - 14, x - 17, y - 1, 1.4, OAKWOOD, { grain: false });
    part(ctx, (c) => { cylinder(c, x - 22, y - 22, 10, 8, "#d8c8a0", { r: 0.6, hi: 0.2, lo: 0.3 }); c.fillStyle = "#8a7a5a"; c.fillRect(x - 21, y - 18.4, 8, 0.6); c.fillStyle = "#c03a2a"; for (const [dx, dy] of [[-20, -20], [-17, -17], [-15, -20.6], [-18.6, -15.8]]) c.fillRect(x + dx, y + dy, 1, 1); });
    for (const [dx, dy] of MINES.slice(0, 2)) foot(ctx, x + dx, y + dy + 2.4, 2.6, 0.3);
  }
  if (blast) {
    // bomb-marked kegs by the forge, then sandbags banked in front of them
    const kegs = r4 === "bb" ? [[8.6, 2.6]] : r4 ? [[12, 3]] : [[10, 2.5], [14.8, 3.5]];
    for (const [dx, dy] of kegs) { foot(ctx, x + dx, y + dy, 3, 0.35); barrel(ctx, x + dx, y + dy, 5.4, 6.5, "#6a4a2e", { mark: "#c05848" }); }
  }
  if (r4 === "bb") {
    // the balloon's windlass, out on the yard in front of the kegs
    const wx = x + WINCH[0], wy = y + 4;
    foot(ctx, wx, wy, 4.2, 0.35);
    part(ctx, (c) => { for (const dx of [-3.2, 3.2]) cylinder(c, wx + dx - 0.8, wy - 10, 1.6, 10, OAKWOOD, { r: 0.6 }); });
    part(ctx, (c) => { cylinder(c, wx - 4.2, wy - 11, 8.4, 4, OAKWOOD, { r: 1.6, hi: 0.35, lo: 0.45 }); c.fillStyle = ROPE; c.fillRect(wx - 3.8, wy - 10, 7.6, 0.8); c.fillRect(wx - 3.8, wy - 8.6, 7.6, 0.8); });
  }
  if (blast) for (const [dx, dy] of [[5.5, 9], [9.6, 8.4], [13, 6.9]]) part(ctx, (c) => {
    shadow(c, x + dx + 0.4, y + dy + 1.4, 2.8, 0.9, 0.3);
    ball(c, x + dx, y + dy, 2.6, 1.8, "#b8a078", { hi: 0.35, lo: 0.45 }); c.fillStyle = rgba("#6a5a3a", 0.6); c.fillRect(x + dx - 0.4, y + dy - 1.6, 0.8, 3);
  });
  // the rack of traps (what hangs on it is live)
  if (r4 !== "ba") {
    for (const px of [-17.5, -11]) foot(ctx, x + px, y + 3, 1.8, 0.35);
    beam(ctx, x - 17.5, y + 3, x - 17.5, y - 20, 2.2, OAKWOOD, { grain: false });
    beam(ctx, x - 11, y + 3, x - 11, y - 20, 2.2, OAKWOOD, { grain: false });
    beam(ctx, x - 18.8, y - 19.5, x - 9.8, y - 19.5, 1.6, lighten(OAKWOOD, 0.1), { grain: false });
  }
  skirtB(ctx, x, y, t.id);
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
  // t.noFolk (the build, buildanim.js): the hall without its people
  const x = t.x, y = t.y;
  const { lvl, r4, spring, blast } = spec(t);
  const bake = canBake();
  const id5 = t.id % 5;
  if (bake) stamp(ctx, cache.get(`shed|${t.level}|${t.branch}|${t.rank4}|${id5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintShed(c, { ...t, id: id5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintShed(ctx, t, x, y);
  // the forge (or fire ring) glows, the bellows breathing it up
  const br = Math.sin(time * 3 + t.id);
  if (lvl === 1) { const fx = x + FIRE1[0], fy = y + FIRE1[1]; glow(ctx, fx, fy - 1, 5 + br, "#f0903a", 0.85); ctx.fillStyle = "#f4a040"; ctx.fillRect(fx - 2, fy - 1.2, 4, 1); ctx.fillStyle = "#ffe08a"; ctx.fillRect(fx - 1 + (br > 0 ? 1 : 0), fy - 2, 1, 1); }
  else { glow(ctx, x + 9, y - 8.5, 6 + br, "#f0903a", 0.85); ctx.fillStyle = "#f4a040"; ctx.fillRect(x + 5.6, y - 7.6, 6.8, 1.2); ctx.fillStyle = "#ffe08a"; ctx.fillRect(x + 7 + (br > 0 ? 2 : 0), y - 8.4, 1.4, 0.8); }
  if (lvl >= 3) for (let i = 0; i < 2; i++) { const k = ((time * 0.45 + i * 0.5 + t.id * 0.1) % 1); soft(ctx, x + 10 + Math.sin(time + i) * 1.5, y - 50 - k * 14, 1.6 + k * 3, 1.6 + k * 3, [[0, `rgba(170,164,160,${0.4 * (1 - k)})`], [1, "rgba(170,164,160,0)"]]); }
  // hung traps on the rack, one per ready charge
  const charges = Math.min(4, t.charges || 0);
  const kind = spring ? "a" : blast ? "b" : "s";
  if (r4 !== "ba") for (let i = 0; i < 4; i++) hungTrap(ctx, x - 14.2, y - 18 + i * 5, kind, i < charges);
  else {
    // the Doctrine stacks its mines in a pyramid instead
    // (stacked at the left rear, behind the smith, on the rack's old ground)
    for (let i = 0; i < MINES.length; i++) if (i < Math.max(charges, 1)) hungTrap(ctx, x + MINES[i][0], y + MINES[i][1] - 2, "b", true);
  }
  if (r4 === "aa" && Math.sin(time * 1.6 + t.id) > 0.9) glint(ctx, x + GUIL[0] - 1.5, y - 19, 1, 0.95);
  // the balloon of the Aerostat Yard, bobbing on its tether
  if (r4 === "bb") {
    // it rides off the right of the chimney, its bomb clear of the ridge
    const bx = x + 19.5 + Math.sin(time * 0.9 + t.id) * 1.2, by = y - 61 + Math.sin(time * 1.4 + t.id) * 2;
    rope(ctx, x + WINCH[0], y - 5, bx, by + 12, 1, "#5a4a3a", 0.6);
    const cv = bake ? cache.get("balloon", 20, 30, (c) => paintBalloon(c, 10, 10)) : null;
    if (cv) stamp(ctx, cv, bx, by, 10, 10);
    else paintBalloon(ctx, bx, by);
    if (Math.sin(time * 9) > 0) { ctx.fillStyle = "#f4c060"; ctx.fillRect(bx + 1.8, by + 16.6, 1, 1); }
  }
  // the smith, hammer on the beat; sparks on the strike (neither under noFolk)
  const beat = Math.sin(time * (t._idle ? 3 : 6) + t.id);
  const swing = beat > 0.3 ? 1 : 0;
  const sx = x - 6.5, sy = y + 4;
  if (!t.noFolk) {
    if (bake) stamp(ctx, cache.get(`smith|${swing}`, 30, 37, (c) => drawSmith(c, 12, 34, 1, CREW_FOLK.smith, swing)), sx, sy, 12, 34, 1);
    else drawSmith(ctx, sx, sy, 1, CREW_FOLK.smith, swing);
    if (swing === 0 && beat > -0.3) {
      glow(ctx, x + 0.5, y - 8, 3, "#ffd070", 0.8);
      for (let i = 0; i < 4; i++) { const a = -0.4 - i * 0.55, d = 2 + (0.3 - beat) * 5; ctx.fillStyle = i % 2 ? "#ffe08a" : "#fff3d2"; ctx.fillRect(x + 0.5 + Math.cos(a) * d * 1.4, y - 8 + Math.sin(a) * d, 0.9, 0.9); }
    }
  }
  // the hot iron on the anvil
  ctx.fillStyle = "#f4a040"; ctx.fillRect(x - 1.5, y - 8.2, 4, 0.9);
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
