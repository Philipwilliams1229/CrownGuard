// ============ RENDER: BRIDGES ============
// The spans that carry the road over a river (terrain.js finds them:
// BRIDGES = [{ x, y, a, d0, d1 }], the deck ARCHES by archAt(b, d), and
// draw.js lifts walkers on a deck by bridgeLift). See the style guide,
// "Bridges and boats".
//
// draw.js calls drawBridges(ctx, g) once a frame, after the water, the road's
// live bits and any River Watch skiff passing under a span, and before
// everything that walks.

import { BRIDGES, inRiver, archAt, BRIDGE_HALF } from "../data/terrain.js";
import { REALM } from "../data/maps.js";
import { posAt, angleAt } from "../engine/path.js";
import { lighten, darken, soft, roundRect, cylinder, strokePts, lin } from "./paint.js";

const DEFAULT_BRIDGE = { beam: "#4a3018", plank: "#8f6a3e", plankDk: "#75512c", rail: "#5f4326" };

export const drawBridge = (ctx, b, time, posAt, angleAt, pal) => {
  const bp = pal || DEFAULT_BRIDGE;
  const half = BRIDGE_HALF;
  const len = b.d1 - b.d0;
  // The deck ARCHES over the water (terrain.js archAt): level with the road
  // at each bank, a few pixels up mid-span, so a skiff can pass beneath and
  // the column visibly climbs over. Drawn back to front: the span's shadow
  // and the dark water under it, the piles it stands on, the side face that
  // looks at the camera (with its arch), then the planks and the rails.
  const edge = (d, side, up) => {
    const [px, py] = posAt(d);
    const a = angleAt(d) + Math.PI / 2;
    return [px + Math.cos(a) * half * side, py + Math.sin(a) * half * side - up];
  };
  // which spots under the span are water never changes: ask once per bridge
  const wetCache = b._wet || (b._wet = new Map());
  const wet = (x, y) => {
    const k = Math.round(x * 2) * 100000 + Math.round(y * 2);
    let w = wetCache.get(k);
    if (w === undefined) { w = inRiver(x, y, -1); wetCache.set(k, w); }
    return w;
  };
  // a soft darkening under the whole span
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.a);
  soft(ctx, 2, 5, len / 2 + 4, half + 4, [[0, "rgba(20,16,24,0.3)"], [0.8, "rgba(20,16,24,0.18)"], [1, "rgba(20,16,24,0)"]]);
  ctx.restore();
  // Over the water only: the gloom right under each edge, and the span's
  // cast shadow thrown down-right (the sun is up-left) as far as the deck
  // stands above the water — the gap between deck and shadow IS the height.
  for (const side of [-1, 1]) {
    const na = angleAt((b.d0 + b.d1) / 2) + Math.PI / 2;
    const out = (Math.cos(na) + Math.sin(na)) * side;   // how much this edge faces the shadow
    for (let d = b.d0 + 1; d < b.d1; d += 1.5) {
      const [gx, gy] = edge(d, side, 0);
      if (!wet(gx, gy)) continue;
      const lift = archAt(b, d);
      ctx.fillStyle = "rgba(10,14,26,0.34)";
      const [ix, iy] = edge(d, side * (1 + 3 / half), 0);
      ctx.fillRect(Math.min(gx, ix) - 0.5, Math.min(gy, iy) - 0.5, Math.abs(ix - gx) + 1.5, Math.abs(iy - gy) + 1.5);
      if (out > 0.3) {
        const reach = (lift + 1.5) * out;
        const [sx, sy] = edge(d, side * (1 + reach / half), 0);
        if (wet(sx, sy)) {
          ctx.fillStyle = "rgba(10,14,26,0.4)";
          ctx.fillRect(Math.min(gx, sx), Math.min(gy, sy) + 1, Math.abs(sx - gx) + 1.5, Math.abs(sy - gy) + 1.5);
        }
      }
    }
  }
  // piles driven into the riverbed just outside both edges, wet at the foot
  for (const side of [-1, 1]) {
    for (let d = b.d0 + 7; d <= b.d1 - 7; d += 9) {
      const [gx, gy] = edge(d, side * (1 + 1.5 / half), 0);
      if (!wet(gx, gy)) continue;
      const top = gy - archAt(b, d) + 1;
      cylinder(ctx, gx - 1.6, top, 3.2, gy + 3 - top, darken(bp.beam, 0.05), { r: 1 });
      ctx.fillStyle = "rgba(20,30,34,0.5)"; ctx.fillRect(gx - 1.6, gy + 1, 3.2, 2);
      ctx.fillStyle = "rgba(200,230,240,0.5)"; ctx.fillRect(gx - 2.4, gy + 2.6, 4.8, 0.8);   // the ripple round it
    }
  }
  // the side that faces the camera: a timber face from the deck down to the
  // water, with the dark of the arch cut into it (only when the span runs
  // across the screen — a span running up it shows its piles instead)
  for (const side of [-1, 1]) {
    const facing = Math.cos(b.a) * side;
    if (facing < 0.25) continue;
    const top = [], bot = [], arch = [];
    for (let d = b.d0; d <= b.d1 + 0.01; d += 2) {
      const lift = archAt(b, d);
      const [ex, ey] = edge(d, side, 0);
      top.push([ex, ey - lift + 1]);
      bot.push([ex, ey + 3.5]);
      arch.push([ex, ey + 3.5 - Math.max(0, lift * 1.1 - 1.5)]);
    }
    ctx.beginPath();
    top.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let k = bot.length - 1; k >= 0; k--) ctx.lineTo(bot[k][0], bot[k][1]);
    ctx.closePath();
    ctx.fillStyle = darken(bp.beam, 0.1); ctx.fill();
    // the opening under the arch, deep in shadow
    ctx.beginPath();
    arch.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let k = bot.length - 1; k >= 0; k--) ctx.lineTo(bot[k][0], bot[k][1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(12,14,24,0.72)"; ctx.fill();
    // a lit course along the top of the face
    strokePts(ctx, top, 1, lighten(bp.beam, 0.2));
  }
  // planks along the road's real curve, each lifted onto the arch; the beam
  // under them shows through the joints and thickens the deck's edge
  for (let d = b.d0; d < b.d1; d += 3) {
    const [px, py] = posAt(d);
    const lift = archAt(b, d);
    ctx.save();
    ctx.translate(px, py - lift);
    ctx.rotate(angleAt(d));
    ctx.fillStyle = bp.beam;
    ctx.fillRect(-1.6, -half - 2, 3.2, half * 2 + 4);
    ctx.restore();
  }
  for (let d = b.d0 + 2; d < b.d1 - 1; d += 6) {
    const [px, py] = posAt(d);
    const a = angleAt(d);
    ctx.save();
    ctx.translate(px, py - archAt(b, d));
    ctx.rotate(a);
    const k = Math.floor(d / 6);
    const col = k % 3 === 0 ? bp.plankDk : bp.plank;
    // planks on the rise catch the sun a little more than those falling away
    const tilt = (archAt(b, d - 3) - archAt(b, d + 3)) * 0.04;
    const g = lin(ctx, -2.5, 0, 2.5, 0, [[0, lighten(col, 0.22 + tilt)], [0.5, col], [1, darken(col, 0.3 - tilt)]]);
    ctx.fillStyle = g;
    roundRect(ctx, -2.6, -half, 5.2, half * 2, 1);
    ctx.fill();
    ctx.restore();
  }
  // the stringers: a heavy beam along each edge that the planks rest on,
  // bowed with the arch, dark on its outer face and lit along its top
  for (const side of [-1, 1]) {
    const outer = [], inner = [];
    for (let d = b.d0 + 1; d <= b.d1 - 1 + 0.01; d += 2) {
      outer.push(edge(d, side * (1 + 1.2 / half), archAt(b, d) - 1));
      inner.push(edge(d, side * (1 - 1.4 / half), archAt(b, d) + 0.6));
    }
    strokePts(ctx, outer, 3.4, darken(bp.beam, 0.2));
    strokePts(ctx, inner, 1.3, lighten(bp.rail, 0.28));
  }
  // rails: posts every few paces riding the arch, a beam along the top
  for (const side of [-1, 1]) {
    const railPts = [];
    for (let d = b.d0 + 2; d <= b.d1 - 1; d += 10) {
      const [rx, ry] = edge(d, side, archAt(b, d));
      cylinder(ctx, rx - 1.4, ry - 6, 2.8, 7, bp.rail, { r: 1 });
      railPts.push([rx, ry - 5.5]);
    }
    const [lx, ly] = edge(b.d1 - 1, side, archAt(b, b.d1 - 1));
    if (railPts.length && Math.hypot(lx - railPts[railPts.length - 1][0], ly - 5.5 - railPts[railPts.length - 1][1]) > 3) {
      cylinder(ctx, lx - 1.4, ly - 6, 2.8, 7, bp.rail, { r: 1 });
      railPts.push([lx, ly - 5.5]);
    }
    if (railPts.length > 1) strokePts(ctx, railPts, 1.8, lighten(bp.rail, 0.15));
    for (const dEnd of [b.d0, b.d1]) {
      const [rx, ry] = edge(dEnd, side, 0);
      cylinder(ctx, rx - 2.5, ry - 8, 5, 11, bp.beam, { r: 1.5 });
    }
  }
};

// Every span on the board, once a frame.
export const drawBridges = (ctx, g) => {
  for (const b of BRIDGES) drawBridge(ctx, b, g.time, posAt, angleAt, REALM.bridge);
};
