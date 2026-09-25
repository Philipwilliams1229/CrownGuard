// ============ KIT B ============
// The yard-work shared by the engines and workshops of the second crew of
// halls — catapult, bladewheel, river watch, gold works, trapsmith and
// falconry: squared timbers at any angle, spoked wheels, hooped barrels,
// crates, rope, boulders, coin, and the one number every engine reads to
// wind up before it looses.
//
// Everything paints in world units into a bake (see buildkit's spriteCache),
// wrapped in part() where a piece should get its own ink edge.

import { lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part } from "../buildkit.js";
import { tuft } from "../paint.js";
import { getStats } from "../../engine/towers.js";

export const IRON = "#5c626e";
export const STEEL = "#c4c8d0";
export const ROPE = "#c8b48a";
export const GOLD = "#d8b34a";
export const PITCH = "#2e2630";

// ---- timing --------------------------------------------------------------
// How wound-up an engine is: 0 the instant after it looses, 1 when the next
// shot is ready. At rest (no foe near) an engine sits fully wound.
export const readiness = (t) => {
  if (t._idle || !(t.cd > 0)) return 1;
  const r = getStats(t).rate || 1;
  return Math.max(0, Math.min(1, 1 - t.cd / r));
};

// ---- ground ----------------------------------------------------------------
// THE FOOTPRINT. A hall may stand only 16 from the road's edge, so all it
// puts on the ground stays inside this ellipse round (x, y + 3); only what
// rises (arms, masts, roofs, balloons) may climb out of it.
export const FOOT_B = { dy: 3, rx: 18, ry: 13 };
// A narrow hall that stands closer to the road (the Bladewheel, 42 from the
// centreline) keeps its ground inside this smaller ellipse instead.
export const FOOT_NARROW = { dy: 3, rx: 13, ry: 9 };
export const footW = (y, gy, F = FOOT_B) => {
  const d = (gy - y - F.dy) / F.ry;
  return Math.abs(d) >= 1 ? 0 : F.rx * Math.sqrt(1 - d * d);
};

// The worked ground under a hall: trodden earth, the cast shadow, the dark
// contact, a few flagstones — all clipped to the footprint (o.foot, if the
// hall has a narrower one; the soft shapes shrink with it).
export const padB = (ctx, x, y, seed = 0, o = {}) => {
  const hw = o.hw ?? 14, F = o.foot || FOOT_B;
  const kx = F.rx / FOOT_B.rx, ky = F.ry / FOOT_B.ry;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y + F.dy, F.rx - 0.5, F.ry - 0.5, 0, 0, Math.PI * 2); ctx.clip();
  soft(ctx, x, y + 4, 17.5 * kx, 8.5 * ky, [[0, "rgba(110,84,54,0.4)"], [0.6, "rgba(110,84,54,0.26)"], [1, "rgba(110,84,54,0)"]]);
  soft(ctx, x + 3 * kx, y + 4, Math.min(hw + 3, 16 * kx), 5.5 * ky, [[0, "rgba(34,24,38,0.36)"], [0.7, "rgba(34,24,38,0.22)"], [1, "rgba(34,24,38,0)"]]);
  soft(ctx, x + 1, y + 2.5, hw + 1, 3, [[0, "rgba(30,20,32,0.45)"], [0.8, "rgba(30,20,32,0.3)"], [1, "rgba(30,20,32,0)"]]);
  const n = o.stones ?? 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed, i) * 0.8;
    const sx = x + Math.cos(a) * 13.5 * kx * (0.8 + hash(seed, i + 9) * 0.2), sy = y + 5 + Math.sin(a) * 6 * ky;
    if (sy < y + 2) continue;
    const big = hash(seed, i + 3) > 0.55;
    part(ctx, (c) => ball(c, sx, sy, big ? 2.2 : 1.4, big ? 1.2 : 0.9, mix("#b0a48e", "#8a7e6a", hash(seed, i + 5)), { hi: 0.45, lo: 0.45 }));
  }
  ctx.restore();
};

// Grass growing back at the edge of the work, inside the footprint.
export const skirtB = (ctx, x, y, seed = 0, n = 4, F = FOOT_B) => {
  for (let i = 0; i < n; i++) {
    const sy = y + 5 + hash(seed, i + 7) * 5 * (F.ry / FOOT_B.ry), w = footW(y, sy, F) - 3;
    tuft(ctx, x - w + hash(seed, i) * w * 2, sy, 0.6, "#4f7a34", "#8ab848", seed + i, { n: 3 });
  }
};

// A tight dark print right under a foot, wheel or post, over the soft shadow.
export const foot = (ctx, x, y, rx, a = 0.42) => shadow(ctx, x, y, rx, Math.max(1, rx * 0.34), a);

// ---- timber ----------------------------------------------------------------
// A squared beam from (x0,y0) to (x1,y1), `w` thick, lit on its sunward
// face, with a grain line down it and pegs at the ends.
export const beam = (ctx, x0, y0, x1, y1, w, col, o = {}) => part(ctx, (c) => {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * w / 2, ny = dx / len * w / 2;
  c.beginPath();
  c.moveTo(x0 + nx, y0 + ny); c.lineTo(x1 + nx, y1 + ny); c.lineTo(x1 - nx, y1 - ny); c.lineTo(x0 - nx, y0 - ny); c.closePath();
  // the face nearest the sun (up-left) is lit
  const s = (nx * -0.42 + ny * -0.58) >= 0 ? 1 : -1;
  c.fillStyle = lin(c, (x0 + x1) / 2 + nx * s, (y0 + y1) / 2 + ny * s, (x0 + x1) / 2 - nx * s, (y0 + y1) / 2 - ny * s,
    [[0, lighten(col, o.hi ?? 0.3)], [0.5, col], [1, darken(col, o.lo ?? 0.42)]]);
  c.fill();
  if (w >= 2.4 && o.grain !== false) {
    c.strokeStyle = rgba(darken(col, 0.55), 0.45);
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(x0 + dx * 0.12 - nx * 0.2, y0 + dy * 0.12 - ny * 0.2);
    c.lineTo(x0 + dx * 0.55 - nx * 0.2, y0 + dy * 0.55 - ny * 0.2);
    c.moveTo(x0 + dx * 0.4 + nx * 0.3, y0 + dy * 0.4 + ny * 0.3);
    c.lineTo(x0 + dx * 0.88 + nx * 0.3, y0 + dy * 0.88 + ny * 0.3);
    c.stroke();
  }
  if (o.bands) for (const f of o.bands) {
    const bx = x0 + dx * f, by = y0 + dy * f, ux = dx / len * 0.8, uy = dy / len * 0.8;
    c.beginPath();
    c.moveTo(bx + nx * 1.15 - ux, by + ny * 1.15 - uy); c.lineTo(bx + nx * 1.15 + ux, by + ny * 1.15 + uy);
    c.lineTo(bx - nx * 1.15 + ux, by - ny * 1.15 + uy); c.lineTo(bx - nx * 1.15 - ux, by - ny * 1.15 - uy); c.closePath();
    c.fillStyle = o.bandCol || IRON; c.fill();
    c.fillStyle = rgba("#fff3d2", 0.5); c.fillRect(bx - 0.3 + nx * 0.6, by - 0.3 + ny * 0.6, 0.6, 0.6);
  }
});

// A plank face: boards side by side between x0 and x1, with seams and knots.
export const planks = (ctx, x0, top, w, h, col, board = 3.6, seed = 0) => {
  part(ctx, (c) => cylinder(c, x0, top, w, h, col, { r: 1, hi: 0.3, lo: 0.45 }));
  ctx.save();
  roundRect(ctx, x0, top, w, h, 1);
  ctx.clip();
  for (let px = x0 + board; px < x0 + w - 0.5; px += board) {
    ctx.fillStyle = rgba(darken(col, 0.55), 0.4); ctx.fillRect(px - 0.4, top, 0.7, h);
    ctx.fillStyle = rgba(lighten(col, 0.4), 0.2); ctx.fillRect(px + 0.3, top, 0.6, h);
  }
  for (let i = 0; i < Math.max(1, Math.floor(w / 8)); i++) {
    const kx = x0 + 1.5 + hash(seed + i, 3) * (w - 3), ky = top + 1.5 + hash(seed + i, 5) * (h - 3);
    ctx.fillStyle = rgba(darken(col, 0.5), 0.6); ctx.fillRect(kx, ky, 0.9, 0.7);
  }
  ctx.restore();
};

// ---- wheels, barrels, crates ------------------------------------------------
// A spoked cart wheel seen a little from the side: iron tyre, hub, spokes.
export const wheel = (ctx, x, y, r, col, o = {}) => {
  const sq = o.sq ?? 0.92, n = o.spokes ?? 6, rot = o.rot ?? 0.3;
  part(ctx, (c) => {
    c.save(); c.translate(x, y); c.scale(sq, 1);
    ball(c, 0, 0, r, r, o.rim || IRON, { hi: 0.35, lo: 0.45 });
    ball(c, 0, 0, r - 1.3, r - 1.3, col, { hi: 0.3, lo: 0.45 });
    c.fillStyle = rgba(darken(col, 0.6), 0.55);
    c.beginPath(); c.arc(0, 0, r - 2.4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = lighten(col, 0.15); c.lineWidth = 1.1; c.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 1, Math.sin(a) * 1); c.lineTo(Math.cos(a) * (r - 1.6), Math.sin(a) * (r - 1.6)); c.stroke();
    }
    ball(c, 0, 0, r * 0.3, r * 0.3, o.hub || IRON, { hi: 0.5, lo: 0.4 });
    c.restore();
  });
};

// An upright barrel with two hoops; `mark` paints a sign on its face.
export const barrel = (ctx, x, y, w, h, col, o = {}) => {
  part(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - w / 2 + 0.6, y - h);
    c.quadraticCurveTo(x - w / 2 - 0.8, y - h / 2, x - w / 2 + 0.6, y);
    c.lineTo(x + w / 2 - 0.6, y);
    c.quadraticCurveTo(x + w / 2 + 0.8, y - h / 2, x + w / 2 - 0.6, y - h);
    c.closePath();
    c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, [[0, lighten(col, 0.32)], [0.45, col], [1, darken(col, 0.45)]]);
    c.fill();
    c.fillStyle = rgba(darken(col, 0.5), 0.35);
    for (let sx = x - w / 2 + 2; sx < x + w / 2 - 1; sx += 2) c.fillRect(sx, y - h + 0.5, 0.5, h - 1);
    c.fillStyle = o.hoop || IRON;
    c.fillRect(x - w / 2 - 0.2, y - h + 1.2, w + 0.4, 1); c.fillRect(x - w / 2 - 0.2, y - 2.2, w + 0.4, 1);
    // the head, seen from above
    ball(c, x, y - h + 0.2, w / 2 - 0.4, 1, lighten(col, 0.18), { hi: 0.2, lo: 0.2 });
    if (o.mark) { c.fillStyle = o.mark; c.fillRect(x - 1, y - h * 0.55 - 1, 2, 2); c.fillRect(x - 0.4, y - h * 0.55 - 2, 0.8, 4); }
  });
};

// A plank crate with a cross brace.
export const crate = (ctx, x, y, w, h, col = "#8a6238") => {
  part(ctx, (c) => {
    cylinder(c, x - w / 2, y - h, w, h, col, { r: 0.8, hi: 0.3, lo: 0.45 });
    c.fillStyle = lighten(col, 0.3); c.fillRect(x - w / 2, y - h, w, 0.9);
    c.strokeStyle = darken(col, 0.35); c.lineWidth = 0.8;
    c.strokeRect(x - w / 2 + 0.8, y - h + 0.8, w - 1.6, h - 1.6);
    c.beginPath(); c.moveTo(x - w / 2 + 1, y - 1); c.lineTo(x + w / 2 - 1, y - h + 1); c.stroke();
  });
};

// ---- rope, stone, coin -------------------------------------------------------
// A hanging rope between two points, sagging, with a twist dashed along it.
export const rope = (ctx, x0, y0, x1, y1, sag = 2, col = ROPE, w = 0.9) => {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
  ctx.lineCap = "round";
  ctx.strokeStyle = darken(col, 0.45); ctx.lineWidth = w + 0.5;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.setLineDash([1, 0.8]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
  ctx.setLineDash([]);
};

// A coil of rope lying on the boards.
export const coil = (ctx, x, y, r, col = ROPE) => part(ctx, (c) => {
  ball(c, x, y, r, r * 0.5, col, { hi: 0.35, lo: 0.45 });
  c.strokeStyle = rgba(darken(col, 0.5), 0.6); c.lineWidth = 0.6;
  for (let i = 1; i <= 2; i++) { c.beginPath(); c.ellipse(x, y, r * (1 - i * 0.3), r * 0.5 * (1 - i * 0.3), 0, 0, Math.PI * 2); c.stroke(); }
});

// A dressed boulder: lit stone with a chip or two.
export const boulder = (ctx, x, y, r, col = "#8e8c94", seed = 0) => part(ctx, (c) => {
  ball(c, x, y, r, r * 0.86, col, { hi: 0.45, lo: 0.5 });
  c.fillStyle = rgba(darken(col, 0.55), 0.5);
  c.fillRect(x + r * 0.2 * (hash(seed, 1) - 0.2), y + r * 0.1, r * 0.35, 0.6);
  c.fillStyle = rgba("#fff3d2", 0.5);
  c.fillRect(x - r * 0.45, y - r * 0.45, Math.max(0.8, r * 0.3), 0.7);
});

// A stack of coin, `n` high, a glint on the top.
export const coins = (ctx, x, y, n, col = GOLD) => part(ctx, (c) => {
  const h = n * 1.1;
  cylinder(c, x - 2.2, y - h, 4.4, h, col, { r: 0.8, hi: 0.45, lo: 0.45 });
  c.fillStyle = rgba(darken(col, 0.5), 0.5);
  for (let i = 1; i < n; i++) c.fillRect(x - 2.2, y - i * 1.1, 4.4, 0.35);
  ball(c, x, y - h, 2.2, 0.8, lighten(col, 0.25), { hi: 0.4, lo: 0.2 });
});

// A tiny four-point glint: gold catching the sun. Live, not baked.
export const glint = (ctx, x, y, s = 1, a = 1) => {
  ctx.fillStyle = `rgba(255,248,220,${a})`;
  ctx.fillRect(x - 0.4, y - 1.6 * s, 0.8, 3.2 * s);
  ctx.fillRect(x - 1.6 * s, y - 0.4, 3.2 * s, 0.8);
};

// A pennant on a pole, baked (no wave), for things that should not flutter.
export const flagPole = (ctx, x, top, len, col, dir = 1) => {
  part(ctx, (c) => cylinder(c, x - 0.8, top, 1.6, len, "#6f4a2a", { r: 0.8, hi: 0.3, lo: 0.5 }));
  part(ctx, (c) => {
    c.beginPath();
    c.moveTo(x + dir * 0.8, top);
    c.lineTo(x + dir * 9, top + 1.8);
    c.lineTo(x + dir * 0.8, top + 5);
    c.closePath();
    c.fillStyle = lin(c, x, 0, x + dir * 9, 0, [[0, lighten(col, 0.25)], [1, darken(col, 0.2)]]);
    c.fill();
  });
  part(ctx, (c) => ball(c, x, top - 0.6, 1.2, 1.2, GOLD, { hi: 0.5, lo: 0.3 }));
};

export { lighten, darken, mix, rgba, soft, shadow, ball, glow, roundRect, cylinder, hash, lin, part };
