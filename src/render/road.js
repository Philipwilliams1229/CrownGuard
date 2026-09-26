// ============ RENDER: THE ROAD ============
// The road the columns march along: painted once per realm into the ground
// layer (paintRoad, called by world.js's groundLayer after the turf and the
// chapter's turf art, and before the chapter's own road art — REALM.groundArt
// "iron" and "fen" paint their paving and causeways over this), and its live
// marks (drawRoadMarks: the chevrons that kindle when a column marches over
// them), drawn every frame over the cached ground.

import { W, H, PATH_HALF, mulberry32 } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { PTS } from "../engine/path.js";
import { PEBBLES, CHEVRONS } from "../data/terrain.js";
import { lighten, darken, mix, rgba, soft, stone, strokePts, tuft } from "./paint.js";

// ---- the road ----------------------------------------------------------
export function paintRoad(ctx) {
  const R = REALM;
  const rng = mulberry32((R.seed ^ 0x0a0ad) >>> 0);
  const main = R.PATH_MAIN, dk = R.PATH_DK, edge = R.PATH_EDGE;
  const lt = lighten(main, 0.2);
  const wide = PATH_HALF * 2;
  // where the road enters at a board edge it runs on off the board (the
  // landscape beyond, render/apron.js, carries it further), so no rounded
  // cap shows at the edge
  const [x0, y0] = PTS[0], [x1, y1] = PTS[1] || PTS[0];
  const edgeStart = x0 <= 30 || y0 <= 30 || x0 >= W - 30 || y0 >= H - 30;
  const dl = Math.hypot(x0 - x1, y0 - y1) || 1;
  const RP = edgeStart ? [[x0 + ((x0 - x1) / dl) * 60, y0 + ((y0 - y1) / dl) * 60], ...PTS] : PTS;

  // dirt spreads onto the grass: a feathered halo (many faint rings, so the
  // edge has no edge), then a firmer margin
  for (let k = 9; k >= 1; k--) strokePts(ctx, RP, wide + 2 + k * 3, rgba(edge, 0.03 + (9 - k) * 0.006));
  strokePts(ctx, RP, wide + 3, mix(main, edge, 0.45));
  // the road is worn a little below the turf: its sunward edge sits in
  // shadow, the far edge catches light
  ctx.save(); ctx.translate(-1.2, -1.2);
  strokePts(ctx, RP, wide + 2, rgba(darken(dk, 0.2), 0.4));
  ctx.restore();
  ctx.save(); ctx.translate(1.2, 1.2);
  strokePts(ctx, RP, wide + 2, rgba(lighten(main, 0.3), 0.45));
  ctx.restore();
  // the body, with a paler crown down the middle
  strokePts(ctx, RP, wide - 2, main);
  strokePts(ctx, RP, wide - 16, rgba(lt, 0.18));
  // (the three marching lanes are NOT painted: the owner wants one open
  // road, and the foes' own spacing shows the lanes well enough)
  // mottling: damp patches and dust
  for (let i = 0; i < 90; i++) {
    const d = rng() * 1;
    const idx = Math.floor(d * (PTS.length - 1));
    const [px, py] = PTS[idx];
    const x = px + (rng() - 0.5) * wide * 0.9, y = py + (rng() - 0.5) * wide * 0.9;
    const col = rng() > 0.45 ? dk : lt;
    soft(ctx, x, y, 5 + rng() * 12, 3 + rng() * 6, [[0, rgba(col, 0.16)], [1, rgba(col, 0)]]);
  }
  // pebbles and the odd bigger stone, half-trodden into the dirt
  for (const pb of PEBBLES) {
    const col = pb.s > 0.6 ? mix(dk, "#8d8478", 0.4) : R.PEBBLE;
    stone(ctx, pb.x, pb.y, pb.r * 0.9, pb.r * 0.62, col);
  }
  // grass creeping in over the edges
  const base = mix(R.GRASS_DK, R.GRASS, 0.25), tip = lighten(R.GRASS_LT, 0.15);
  for (let i = 1; i < PTS.length - 1; i += 2) {
    for (const side of [-1, 1]) {
      if (rng() > 0.55) continue;
      const p = PTS[Math.max(0, i - 1)], n = PTS[Math.min(PTS.length - 1, i + 1)];
      let dx = n[0] - p[0], dy = n[1] - p[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const off = (PATH_HALF + 1 + rng() * 3) * side;
      const x = PTS[i][0] - dy * off + (rng() - 0.5) * 8, y = PTS[i][1] + dx * off + (rng() - 0.5) * 4;
      tuft(ctx, x, y, 0.6 + rng() * 0.5, base, tip, 900 + i * 2 + side, { n: 3 });
    }
  }
}

// The living parts of the road: chevrons that kindle when a column marches
// over them. Drawn every frame, on top of the cached ground.
export function drawRoadMarks(ctx, g) {
  const R = REALM;
  const hot = lighten(R.PATH_MAIN, 0.6);
  for (const ch of CHEVRONS) {
    const on = Math.sin(g.time * 2.2 - ch.d * 0.045) > 0;
    let near = false;
    for (const e of g.enemies) {
      if (!e.dead && Math.abs(e.dist - ch.d) < 60) { near = true; break; }
    }
    ctx.save();
    ctx.translate(ch.x, ch.y);
    ctx.rotate(ch.a);
    const a = near ? (on ? 0.7 : 0.5) : on ? 0.32 : 0.16;
    ctx.strokeStyle = `rgba(${R.CHEVRON},${a})`;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-3, -5); ctx.lineTo(2, 0); ctx.lineTo(-3, 5);
    ctx.stroke();
    if (near) {
      ctx.strokeStyle = rgba(hot, on ? 0.55 : 0.3);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }
}
