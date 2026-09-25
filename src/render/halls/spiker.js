// ============ HALL: THE BLADEWHEEL ============
// A flat wheel of blades on an upright post, spun through a gearbox by the
// wheelwright at the crank. It GROWS: an oak post in a ring of stakes with
// six blades at one, a stone drum and an iron-collared post at two, a
// dressed and capped drum with a double ring of ten at three.
//   The Razor Gale puts a windmill behind it, and the wheel screams: the
// Steel Tempest shoes the sails in steel and stacks a second wheel; the
// Hamstringer hangs barbed chains off the rim and stakes snares round it.
//   The Brazier Wheel trades blades for fire pots and stands on a brick
// furnace: the Solar Crown raises a gilded sun over it, the Wildheart Pyre
// grows its post into a living, smouldering trunk with its flames awake.
//
// Pixel art: the base and the sails are baked; the wheel is baked squashed
// at a few phases of one blade's turn, so it spins in crisp steps. Flames,
// sparks and chains are painted live.

import { OAKWOOD, pennant, spriteCache, stamp, canBake } from "../buildkit.js";
import {
  IRON, STEEL, GOLD, ROPE, FOOT_NARROW, readiness, foot, padB, skirtB, beam, planks, barrel, rope, boulder, glint,
  lighten, darken, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part,
} from "./kitB.js";
import { masonry } from "../buildkit.js";
import { drawCrew, CREW_FOLK } from "../folk.js";

const cache = spriteCache();
export const resetSpikerBakes = () => cache.clear();
const BOX = { left: 36, right: 36, up: 64, down: 18 };
const STONE = "#8a8478", BRICK = "#9a5a44";
const SQ = 0.5, PHASES = 4;

const spec = (t) => {
  const lvl = t.level, r4 = t.rank4 ? t.branch + t.rank4 : null;
  const gale = t.branch === "a", fire = t.branch === "b";
  return {
    lvl, r4, gale, fire,
    rr: 8 + lvl + (t.branch ? 1.5 : 0),
    n: fire ? 8 : t.branch ? 12 : 4 + lvl * 2,
    wy: 22 + lvl + (t.branch ? 2 : 0),        // how high the wheel rides
    key: r4 || t.branch || "l" + lvl,
  };
};

// ---- the base: footing, post, gearbox ------------------------------------
const paintBase = (ctx, t, x, y) => {
  const s = spec(t), { lvl, r4, gale, fire } = s;
  // a narrow footprint (kitB FOOT_NARROW): the hall may stand 42 from the
  // road's centreline, so nothing it puts on the ground reaches past rx 13
  padB(ctx, x, y, t.id, { hw: 12, foot: FOOT_NARROW });
  if (fire) soft(ctx, x, y + 5, 12, 4, [[0, "rgba(40,30,34,0.3)"], [1, "rgba(40,30,34,0)"]]);   // soot
  // the windmill's mast stands at the back
  if (gale) {
    const mx = x + 11;
    beam(ctx, mx - 3, y - 2, mx, y - 44, 3, r4 === "aa" ? "#6a6a74" : OAKWOOD, { bands: [0.3, 0.7] });
    beam(ctx, mx + 1.5, y - 1, mx, y - 40, 2.4, darken(OAKWOOD, 0.2));
  }
  // the footing: stakes at one, a stone drum after, a brick furnace for fire
  if (fire) {
    part(ctx, (c) => masonry(c, x - 13, y - 9, 26, 15, BRICK, { r: 2, course: 3.2, block: 5, hi: 0.3, lo: 0.45 }));
    part(ctx, (c) => cylinder(c, x - 14, y - 11, 28, 3, "#5a4a44", { r: 1.2, hi: 0.35, lo: 0.4 }));
    part(ctx, (c) => { c.fillStyle = "#2a1c18"; roundRect(c, x - 5, y - 6, 10, 7, 2); c.fill(); });   // the grate
    part(ctx, (c) => { c.fillStyle = IRON; for (let i = 0; i < 4; i++) c.fillRect(x - 4 + i * 2.6, y - 6, 0.8, 7); });
  } else if (lvl === 1 && !t.branch) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3, sx = x + Math.cos(a) * 9, sy = y - 1 + Math.sin(a) * 3.6;
      if (Math.sin(a) < 0) beam(ctx, sx, sy + 1, sx + Math.cos(a) * 1.2, sy - 6, 1.8, darken(OAKWOOD, 0.1), { grain: false });
    }
    part(ctx, (c) => ball(c, x, y + 1, 10, 3.6, "#8a7a5a", { hi: 0.3, lo: 0.45 }));
  } else {
    const hh = lvl >= 3 || t.branch ? 12 : 9;
    part(ctx, (c) => masonry(c, x - 13, y - hh + 3, 26, hh + 3, STONE, { r: 2, course: 3.6, block: 6.5, hi: 0.3, lo: 0.45 }));
    part(ctx, (c) => cylinder(c, x - 14, y - hh + 1, 28, 3, lighten(STONE, 0.15), { r: 1.4, hi: 0.35, lo: 0.4 }));
    if (lvl >= 3 || t.branch) part(ctx, (c) => { c.fillStyle = IRON; for (const dx of [-12, -3, 6]) c.fillRect(x + dx, y - hh + 1, 1.6, 3); });
  }
  // the post
  const top = y - s.wy + 1, foot0 = fire ? y - 10 : y - 4;
  if (r4 === "bb") {
    // a living trunk, gnarled, with roots over the brick
    part(ctx, (c) => {
      c.beginPath();
      c.moveTo(x - 8, foot0 + 2); c.quadraticCurveTo(x - 3, foot0 - 5, x - 4.5, top + 1); c.lineTo(x + 4.5, top + 1);
      c.quadraticCurveTo(x + 3, foot0 - 5, x + 9, foot0 + 2); c.closePath();
      c.fillStyle = lin(c, x - 8, 0, x + 9, 0, [[0, "#8a6a44"], [0.5, "#5e4428"], [1, "#3a2818"]]); c.fill();
      c.strokeStyle = rgba("#2a1c14", 0.55); c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(x - 1, foot0 - 1); c.quadraticCurveTo(x - 1.5, foot0 - 8, x - 0.5, top + 4); c.stroke();
    });
    for (const [dx, dy, s2] of [[-7, 2, -1], [8, 3, 1]]) beam(ctx, x + dx * 0.5, foot0, x + dx + s2 * 3, foot0 + dy + 3, 2, "#5e4428", { grain: false });
    // leaves still sprouting from it, some singed
    for (const [dx, dy, col] of [[-7, -7, "#5a8a3a"], [-8.5, -4, "#4a7a34"], [7.5, -9, "#8a7a2a"], [9, -6, "#5a8a3a"], [6, -12, "#a0602a"]]) part(ctx, (c) => ball(c, x + dx, foot0 + dy, 2.4, 1.6, col, { hi: 0.45, lo: 0.4 }));
  } else {
    const pc = fire ? IRON : r4 === "aa" ? "#6a6a74" : OAKWOOD;
    part(ctx, (c) => cylinder(c, x - 2.4, top, 4.8, foot0 - top + 1, pc, { r: 1.4, hi: 0.35, lo: 0.5 }));
    const collars = t.branch ? 3 : lvl;
    for (let i = 0; i < collars; i++) part(ctx, (c) => cylinder(c, x - 3.3, foot0 - 3 - i * 5, 6.6, 2.2, r4 === "ba" ? GOLD : IRON, { r: 1, hi: 0.45, lo: 0.4 }));
  }
  // the gearbox and its crank, where the wheelwright works
  if (!(lvl === 1 && !t.branch)) {
    part(ctx, (c) => cylinder(c, x - 11, y - 8 + (fire ? -3 : 0), 7, 6, fire ? "#4a4a52" : darken(OAKWOOD, 0.1), { r: 1.2, hi: 0.3, lo: 0.45 }));
    part(ctx, (c) => ball(c, x - 7.5, y - 8.5 + (fire ? -3 : 0), 2.4, 2.4, IRON, { hi: 0.45, lo: 0.4 }));
  }
  // dressings at the foot
  if (lvl >= 3 || t.branch) {
    if (!fire) {
      // a whetstone on its frame, for the blades
      beam(ctx, x + 10.5, y + 4, x + 10.5, y - 3, 1.4, OAKWOOD, { grain: false });
      part(ctx, (c) => ball(c, x + 12, y - 3, 1.4, 3.6, "#a8a49a", { hi: 0.4, lo: 0.45 }));
    } else {
      // the coal heap
      for (const [dx, dy, r] of [[8.5, 6.5, 2.4], [11, 6, 1.6], [10, 4.4, 1.8]]) part(ctx, (c) => ball(c, x + dx, y + dy, r, r * 0.8, "#2e2a30", { hi: 0.35, lo: 0.4 }));
    }
  }
  if (r4 === "ab") {
    // snares staked round the base
    for (const [dx, dy] of [[-8, 7], [7, 7.5], [-0.5, 9.5]]) part(ctx, (c) => {
      c.strokeStyle = IRON; c.lineWidth = 0.8; c.beginPath(); c.ellipse(x + dx, y + dy, 3, 1.2, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = OAKWOOD; c.fillRect(x + dx + 2.6, y + dy - 3, 1, 3.5);
    });
  }
  if (r4 === "aa") for (const dx of [9.5, 11.5]) part(ctx, (c) => { c.fillStyle = STEEL; c.fillRect(x + dx, y - 5 + (dx - 9.5), 1, 10); c.fillStyle = "#8a909c"; c.fillRect(x + dx - 0.5, y + 2 + (dx - 9.5), 2, 1.2); });
  skirtB(ctx, x, y, t.id, 4, FOOT_NARROW);
};

// ---- the windmill's sails, baked at a few turns -----------------------------
const paintSails = (ctx, cx, cy, ph, r4) => {
  const cloth = r4 === "aa" ? "#d8dce4" : r4 === "ab" ? "#c8a888" : "#e8dcc0";
  const frame = r4 === "aa" ? "#6a6a74" : OAKWOOD;
  for (let i = 0; i < 4; i++) {
    const a = ph + (i / 4) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
    const vx = -uy, vy = ux;   // across the sail
    part(ctx, (c) => {
      c.beginPath();
      c.moveTo(cx + ux * 4, cy + uy * 4);
      c.lineTo(cx + ux * 16, cy + uy * 16);
      c.lineTo(cx + ux * 16 + vx * 5, cy + uy * 16 + vy * 5);
      c.lineTo(cx + ux * 5 + vx * 3.5, cy + uy * 5 + vy * 3.5);
      c.closePath();
      c.fillStyle = i % 2 ? darken(cloth, 0.12) : cloth; c.fill();
      c.strokeStyle = rgba(darken(cloth, 0.45), 0.6); c.lineWidth = 0.5;
      for (const k of [0.45, 0.7]) { c.beginPath(); c.moveTo(cx + ux * 16 * k, cy + uy * 16 * k); c.lineTo(cx + ux * 16 * k + vx * 4.4, cy + uy * 16 * k + vy * 4.4); c.stroke(); }
      if (r4 === "ab" && i === 1) { c.fillStyle = "#a07858"; c.fillRect(cx + ux * 11 + vx * 2 - 1, cy + uy * 11 + vy * 2 - 1, 2.4, 2); }   // a patch
    });
    beam(ctx, cx, cy, cx + ux * 17, cy + uy * 17, 1.3, frame, { grain: false });
  }
  part(ctx, (c) => ball(c, cx, cy, 2.4, 2.4, r4 === "aa" ? GOLD : IRON, { hi: 0.5, lo: 0.4 }));
};

// ---- the wheel, flat, squashed for the 3/4 view ------------------------------
const paintWheel = (ctx, t, cx, cy, ph, small = false) => {
  const s = spec(t), { lvl, r4, fire } = s;
  const rr = small ? s.rr * 0.66 : s.rr, n = small ? 8 : s.n;
  const step = (Math.PI * 2) / n;
  const tip = r4 === "aa" ? "#e8ecf2" : r4 === "ab" ? "#b8a898" : "#dde2ea";
  const len = r4 === "aa" ? 7 : 5;
  const at = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r * SQ];
  // the rim's edge, below the top face
  part(ctx, (c) => ball(c, cx, cy + 1.8, rr, rr * SQ, "#2e3038", { hi: 0.25, lo: 0.4 }));
  if (!fire) {
    // blades, lit on the sunward side
    for (let i = 0; i < n; i++) {
      const a = ph + i * step, lit = -Math.cos(a) * 0.42 - Math.sin(a) * 0.58;
      part(ctx, (c) => {
        const [bx0, by0] = at(a - 0.16, rr - 0.5), [bx1, by1] = at(a + 0.1, rr - 0.5), [tx, ty] = at(a + (r4 === "ab" ? 0.18 : 0.02), rr + len);
        c.beginPath(); c.moveTo(bx0, by0); c.lineTo(tx, ty); c.lineTo(bx1, by1); c.closePath();
        c.fillStyle = lit > 0 ? lighten(tip, lit * 0.35) : darken(tip, -lit * 0.35); c.fill();
        if (r4 === "ab") { c.fillStyle = "#8a4a3a"; const [hx, hy] = at(a + 0.25, rr + len - 1.5); c.fillRect(hx - 0.6, hy - 0.6, 1.2, 1.2); }   // the barb
      });
    }
  }
  // the top face
  const face = fire ? "#4a4046" : r4 === "aa" ? "#5a5e6a" : "#4a4e58";
  part(ctx, (c) => {
    ball(c, cx, cy, rr, rr * SQ, face, { hi: 0.35, lo: 0.45 });
    c.strokeStyle = rgba(STEEL, 0.55); c.lineWidth = 0.8;
    c.beginPath(); c.ellipse(cx, cy, rr - 1.2, (rr - 1.2) * SQ, 0, 0, Math.PI * 2); c.stroke();
    // spokes, so the turn shows
    c.strokeStyle = rgba(darken(face, 0.5), 0.8); c.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) { const a = ph * 1 + (i / 4) * Math.PI * 2; const [sx, sy] = at(a, rr - 1.6); c.beginPath(); c.moveTo(cx, cy); c.lineTo(sx, sy); c.stroke(); }
  });
  if (!small && (lvl >= 3 || t.branch) && !fire) part(ctx, (c) => {
    c.strokeStyle = r4 === "aa" ? GOLD : "#c4c8d0"; c.lineWidth = 1.1;
    c.beginPath(); c.ellipse(cx, cy, rr * 0.6, rr * 0.6 * SQ, 0, 0, Math.PI * 2); c.stroke();
  });
  if (fire) {
    // the fire pots round the rim
    for (let i = 0; i < n; i++) {
      const [px, py] = at(ph + i * step, rr + 0.5);
      part(ctx, (c) => { ball(c, px, py, 2.2, 1.6, r4 === "ba" ? "#b08a3a" : "#3a3440", { hi: 0.4, lo: 0.45 }); ball(c, px, py - 0.7, 1.4, 0.6, "#e8703a", { hi: 0.5, lo: 0.2 }); });
    }
  }
  part(ctx, (c) => ball(c, cx, cy - 0.5, rr * 0.26, rr * 0.26 * 0.8, r4 === "aa" || r4 === "ba" ? GOLD : "#8a909c", { hi: 0.5, lo: 0.4 }));
};

// The Solar Crown's gilded sun, standing over the wheel.
const paintSun = (ctx, cx, cy) => {
  beam(ctx, cx, cy + 12, cx, cy + 2, 1.8, GOLD, { grain: false });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, l = i % 2 ? 8.5 : 10.5;
    part(ctx, (c) => {
      c.beginPath(); c.moveTo(cx + Math.cos(a - 0.2) * 4.5, cy + Math.sin(a - 0.2) * 4.5); c.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); c.lineTo(cx + Math.cos(a + 0.2) * 4.5, cy + Math.sin(a + 0.2) * 4.5); c.closePath();
      c.fillStyle = i % 2 ? "#e8c14a" : "#f4d878"; c.fill();
    });
  }
  part(ctx, (c) => ball(c, cx, cy, 5, 5, "#f0c850", { hi: 0.6, lo: 0.4 }));
  part(ctx, (c) => { c.fillStyle = "#b07a2a"; c.fillRect(cx - 2, cy - 1, 1, 1); c.fillRect(cx + 1, cy - 1, 1, 1); c.fillRect(cx - 1, cy + 1.6, 2, 0.8); });   // a sun's face
};

// A tongue of fire: two stacked pixel flames that flicker.
const flame = (ctx, x, y, s, time, seed, col = "#f0903a", core = "#ffe08a") => {
  const fl = Math.sin(time * 14 + seed * 2.3), h = s * (3 + fl * 0.8);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x - s * 1.3, y); ctx.quadraticCurveTo(x - s * 0.6, y - h * 0.6, x + fl * 0.4, y - h); ctx.quadraticCurveTo(x + s * 0.7, y - h * 0.5, x + s * 1.3, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.moveTo(x - s * 0.6, y); ctx.quadraticCurveTo(x, y - h * 0.55, x + s * 0.6, y); ctx.closePath(); ctx.fill();
};

export const drawBladewheel = (ctx, t, time) => {
  const x = t.x, y = t.y;
  const s = spec(t), { lvl, r4, gale, fire, rr, n } = s;
  const bake = canBake();
  const r = readiness(t), anim = t.anim || 0;
  const id5 = t.id % 5;
  if (fire) glow(ctx, x, y + 2, 20, r4 === "bb" ? "#f07a3a" : "#e8a03a", 0.14 + 0.06 * Math.sin(time * 3 + t.id));

  // the sails turn behind everything, fast when the wheel is working
  if (gale) {
    const sp = time * (t._idle ? 0.8 : 3.2) + t.id;
    const k = Math.floor((sp / (Math.PI / 2)) * 3) % 3;
    const cv = bake ? cache.get(`sails|${t.rank4}|${k}`, 40, 40, (c) => paintSails(c, 20, 20, (k / 3) * (Math.PI / 2), r4)) : null;
    if (cv) stamp(ctx, cv, x + 11, y - 42, 20, 20);
  }
  if (bake) stamp(ctx, cache.get(`base|${lvl}|${t.branch}|${t.rank4}|${id5}`, BOX.left + BOX.right, BOX.up + BOX.down, (c) => paintBase(c, { ...t, id: id5 }, BOX.left, BOX.up)), x, y, BOX.left, BOX.up);
  else paintBase(ctx, t, x, y);
  // the furnace grate glows
  if (fire) { glow(ctx, x, y - 3, 6 + Math.sin(time * 5 + t.id), "#f0903a", 0.85); ctx.fillStyle = "#f4c060"; ctx.fillRect(x - 3, y - 1.5, 6, 1.2); }

  // the wheel: it winds up (rises, quickens) before it bites, and kicks down
  const wind = t._idle ? 0 : r > 0.85 ? (r - 0.85) / 0.15 : 0;
  const speed = (gale ? 10 : fire ? 3 : 4.5) * (t._idle ? 0.3 : 1 + wind * 0.8 + anim * 1.5);
  const spin = time * speed + t.id;
  const step = (Math.PI * 2) / n;
  const k = Math.floor(((spin % step) + step) % step / step * PHASES);
  const wy = y - s.wy - wind * 1.5 + anim * 2.5;
  const side = rr + 9;
  if (bake) stamp(ctx, cache.get(`wheel|${lvl}|${t.branch}|${t.rank4}|${k}`, side * 2, side * 2, (c) => paintWheel(c, t, side, side, (k / PHASES) * step)), x, wy, side, side);
  else paintWheel(ctx, t, x, wy, spin);
  if (r4 === "aa") {
    // the Steel Tempest's second wheel, counter-turning above
    const k2 = PHASES - 1 - k;
    const s2 = side * 0.7;
    beam(ctx, x, wy - 1, x, wy - 7, 2.4, "#6a6a74", { grain: false });
    if (bake) stamp(ctx, cache.get(`wheel2|${k2}`, s2 * 2, s2 * 2, (c) => paintWheel(c, t, s2, s2, (k2 / PHASES) * (Math.PI * 2 / 8), true)), x, wy - 7, s2, s2);
  }
  if (r4 === "ab") {
    // barbed chains flung out from the rim, hooks on the ends
    for (let i = 0; i < 4; i++) {
      const a = spin + (i / 4) * Math.PI * 2;
      const cx0 = x + Math.cos(a) * (rr - 1), cy0 = wy + Math.sin(a) * (rr - 1) * SQ;
      const fling = t._idle ? 3 : 9;
      const ex = cx0 + Math.cos(a) * fling, ey = cy0 + Math.sin(a) * fling * SQ + (t._idle ? 6 : 2);
      ctx.lineCap = "butt";
      ctx.strokeStyle = "#241a26"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = "#9aa0ac"; ctx.lineWidth = 0.8; ctx.setLineDash([0.8, 0.8]);
      ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#241a26"; ctx.fillRect(ex - 1.6, ey - 0.6, 3.2, 3);
      ctx.fillStyle = "#c4c8d0"; ctx.fillRect(ex - 1, ey, 0.9, 2); ctx.fillRect(ex - 1, ey + 1.4, 2, 0.8);
      ctx.fillStyle = "#a04a3a"; ctx.fillRect(ex + 0.5, ey - 0.2, 0.8, 1);
    }
  }
  // fire: a flame on every pot, swelling as the ring gathers, and the sun
  if (fire) {
    const swell = t._idle ? 0.7 : 0.6 + r * 0.5 + anim * 0.6;
    const col = r4 === "ba" ? "#f4c040" : r4 === "bb" ? "#f07030" : "#f0903a";
    const core = r4 === "ba" ? "#fff8d8" : "#ffe08a";
    const ph = (k / PHASES) * step;
    const pots = [];
    for (let i = 0; i < n; i++) { const a = ph + i * step; pots.push([x + Math.cos(a) * (rr + 0.5), wy + Math.sin(a) * (rr + 0.5) * SQ - 0.8, i]); }
    pots.sort((a, b) => a[1] - b[1]);
    for (const [px, py, i] of pots) flame(ctx, px, py, 0.9 * swell, time, i + t.id, col, core);
    if (anim > 0.4) { ctx.strokeStyle = `rgba(255,200,110,${anim * 0.8})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, wy, rr + 4 + (1 - anim) * 14, (rr + 4 + (1 - anim) * 14) * SQ, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (r4 === "ba") {
    const sy = wy - 18 + Math.sin(time * 2 + t.id) * 0.6;
    glow(ctx, x, sy, 14, "#f8d870", 0.3 + 0.15 * r);
    if (bake) stamp(ctx, cache.get("sun", 26, 38, (c) => paintSun(c, 13, 13)), x, sy, 13, 13);
  }
  if (r4 === "bb") {
    // the flames are awake: two imps hop the rim
    for (let i = 0; i < 2; i++) {
      const a = time * 1.3 + i * Math.PI + t.id;
      const ix = x + Math.cos(a) * (rr + 3), iy = wy + Math.sin(a) * (rr + 3) * SQ - 2 - Math.abs(Math.sin(time * 6 + i * 2)) * 3;
      glow(ctx, ix, iy, 4, "#f07a3a", 0.5);
      flame(ctx, ix, iy + 3, 1.7, time, i * 7, "#e85a2a", "#f8c050");
      ctx.fillStyle = "#2a1c1c"; ctx.fillRect(ix - 1.4, iy - 0.6, 0.9, 1.1); ctx.fillRect(ix + 0.5, iy - 0.6, 0.9, 1.1);
    }
    for (let i = 0; i < 3; i++) glow(ctx, x - 6 + i * 6 + Math.sin(time * 3 + i) * 2, y - 6 - ((time * 16 + i * 11 + t.id * 5) % 30), 1.4, "#f0a040", 0.85);
  }
  // release: sparks off the rim
  if (!fire && anim > 0.5) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t.id, d = rr + 4 + (1 - anim) * 16;
    const sx = x + Math.cos(a) * d, sy = wy + Math.sin(a) * d * SQ;
    ctx.fillStyle = `rgba(255,244,210,${anim})`; ctx.fillRect(sx - 0.5, sy - 0.5, 1.2, 1.2);
    ctx.fillRect(sx - Math.cos(a) * 2 - 0.3, sy - Math.sin(a) * SQ * 2 - 0.3, 0.7, 0.7);
  }

  // ---- the wheelwright at the crank (from level two; the post is turned by
  // hand-bar at one)
  const lvl1 = lvl === 1 && !t.branch;
  const turning = !t._idle;
  const work = turning ? Math.round((Math.sin(time * (gale ? 12 : 8) + t.id) + 1) * 1.5) : Math.round((Math.sin(time * 1.1 + t.id) + 1) * 0.5);
  const cx0 = x - 10, cy0 = y + (fire ? 4 : 5);   // his feet stay inside the narrow footprint
  if (bake) stamp(ctx, cache.get(`crew|${fire ? "s" : "w"}|${work}`, 28, 30, (c) => drawCrew(c, 12, 27, 1, fire ? STOKER : CREW_FOLK.engineer, (work - 1.5) * 0.4)), cx0, cy0, 12, 27, 1);
  else drawCrew(ctx, cx0, cy0, 1, CREW_FOLK.engineer, 0);
  if (lvl1) {
    // a hand-bar through the post, which he pushes round
    ctx.strokeStyle = "#241a26"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(cx0 + 5 + (work - 1.5) * 0.6, y - 9 + (work - 1.5) * 0.4); ctx.stroke();
    ctx.strokeStyle = "#8a6238"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(cx0 + 5 + (work - 1.5) * 0.6, y - 9 + (work - 1.5) * 0.4); ctx.stroke();
  } else {
    // the crank handle turning in his hands
    const ca = time * (turning ? 8 : 0.5), hx = x - 7.5 + Math.cos(ca) * 2.2, hy = y - 8.5 + (fire ? -3 : 0) + Math.sin(ca) * 1.2;
    ctx.fillStyle = "#241a26"; ctx.fillRect(hx - 1, hy - 1, 2, 2);
    ctx.fillStyle = "#8a909c"; ctx.fillRect(hx - 0.5, hy - 0.5, 1, 1);
  }
  // idle: a whetstone spark now and then
  if (t._idle && Math.sin(time * 3.1 + t.id * 1.9) > 0.9) glow(ctx, x + rr - 2, wy - 2, 2.5, "#ffffff", 0.9);
  if (!fire && Math.sin(time * 1.9 + t.id * 2.1) > 0.97) glint(ctx, x - rr * 0.6, wy - rr * 0.3, 1, 0.9);
  const bc = r4 === "aa" ? "#c4c8d0" : r4 === "ab" ? "#8a4a3a" : r4 === "ba" ? "#e8c14a" : r4 === "bb" ? "#e8703a" : gale ? "#7a94b8" : fire ? "#c05a28" : "#a04a3f";
  if ((lvl >= 2 || t.branch) && !gale) pennant(ctx, x + 11, y - (fire ? 31 : 30), 20, bc, time, t.id, 1);
};

const STOKER = { skin: "#e8b990", hood: "#3a3028", coat: "#6a3a2a", boots: "#2e2420", trim: "#3a2a20" };
