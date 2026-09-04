// ============ RENDER: THE GROUND ============
// The static world — turf, its thousand small details, and the road with its
// three lanes — painted ONCE per realm into a high-resolution layer, then
// blitted every frame. Nothing here moves, so nothing here costs a frame.
//
// The detail is the point: zoomed in, the meadow is blades of grass, clover
// and daisies, and the road is packed earth with pebbles and worn tracks.

import { W, H, PATH_HALF, LANE_OFF, RES, mulberry32 } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { PTS, nearestOnPath } from "../engine/path.js";
import { GRASS_PATCHES, TUFTS, FLOWERS, SPECKS, PEBBLES, PONDS, CHEVRONS, inRiver, FOREST, forestDepthAt } from "../data/terrain.js";
import { lighten, darken, mix, rgba, soft, tuft, flower, stone, clover, strokePts, offsetPts, hash, ball } from "./paint.js";

let layer = null;
let layerKey = "";

const inPond = (x, y, m = 0) =>
  PONDS.some((p) => Math.abs(x - p.x) < p.w / 2 + 6 + m && Math.abs(y - p.y) < p.h / 2 + 6 + m);

// Open turf: off the road, out of the water.
const clear = (x, y, m) => nearestOnPath(x, y).d > PATH_HALF + m && !inPond(x, y, m) && !inRiver(x, y, m) && forestDepthAt(x, y) < -6;

// ---- the turf ----------------------------------------------------------
function paintTurf(ctx) {
  const R = REALM;
  const rng = mulberry32((R.seed ^ 0x5eed5eed) >>> 0);
  ctx.fillStyle = R.GRASS;
  ctx.fillRect(0, 0, W, H);

  // rolling ground: broad soft swells of lighter and darker turf
  for (const p of GRASS_PATCHES) {
    const col = p.s > 0.5 ? R.GRASS_LT : R.GRASS_DK;
    soft(ctx, p.x, p.y, p.r * 1.7, p.r * 1.05, [[0, rgba(col, 0.6)], [0.6, rgba(col, 0.3)], [1, rgba(col, 0)]]);
  }
  for (let i = 0; i < 70; i++) {
    const x = rng() * W, y = rng() * H, r = 18 + rng() * 40;
    const col = rng() > 0.5 ? R.GRASS_LT : R.GRASS_DK;
    soft(ctx, x, y, r * 1.5, r, [[0, rgba(col, 0.28)], [1, rgba(col, 0)]]);
  }
  // the sun: a warm wash from the upper left, the far corner cooling off
  const sun = ctx.createLinearGradient(0, 0, W, H);
  sun.addColorStop(0, "rgba(255,238,190,0.13)");
  sun.addColorStop(0.5, "rgba(255,238,190,0)");
  sun.addColorStop(1, "rgba(30,26,60,0.14)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  const base = mix(R.GRASS_DK, R.GRASS, 0.25);
  const tip = lighten(R.GRASS_LT, 0.22);
  const deep = darken(R.GRASS_DK, 0.2);

  // the forest floor: shade under the canopy, feathered at the treeline,
  // with leaf litter and roots where the grass gives up
  if (FOREST) {
    const floor = darken(R.GRASS_DK, 0.5);
    const line = [];
    const span = FOREST.edge === "left" ? H : W;
    for (let u = -20; u <= span + 20; u += 6) {
      line.push(FOREST.edge === "left" ? [forestDepthAt(0, u), u] : [u, forestDepthAt(u, 0)]);
    }
    ctx.beginPath();
    if (FOREST.edge === "left") { ctx.moveTo(-20, -20); for (const [bx, by] of line) ctx.lineTo(bx, by); ctx.lineTo(-20, span + 20); }
    else { ctx.moveTo(-20, -20); for (const [bx, by] of line) ctx.lineTo(bx, by); ctx.lineTo(span + 20, -20); }
    ctx.closePath();
    ctx.fillStyle = rgba(floor, 0.72);
    ctx.fill();
    for (const [w, a] of [[40, 0.1], [26, 0.12], [14, 0.16], [6, 0.2]]) strokePts(ctx, line, w, rgba(floor, a));
    for (let i = 0; i < 160; i++) {
      const x = rng() * W, y = rng() * H;
      const dpt = forestDepthAt(x, y);
      if (dpt < 2 || nearestOnPath(x, y).d < PATH_HALF + 2) continue;
      const col = i % 3 === 0 ? "#6a4a2c" : i % 3 === 1 ? "#4a5a2c" : "#7a6234";
      soft(ctx, x, y, 2 + rng() * 2.5, 1.2 + rng() * 1.4, [[0, rgba(col, 0.55)], [1, rgba(col, 0)]]);
    }
  }

  // clover and low leaves, the carpet under everything else
  for (let i = 0; i < 220; i++) {
    const x = rng() * W, y = rng() * H;
    if (!clear(x, y, 3)) continue;
    clover(ctx, x, y, i % 3 ? R.GRASS_DK : deep, 0.8 + rng() * 0.5);
  }
  // small stones in the turf, and the odd twig-dark clump
  for (const sp of SPECKS) {
    if (sp.k > 0.62) stone(ctx, sp.x, sp.y, 1.4 + sp.w * 0.5, 1 + sp.h * 0.4, mix("#b9ae99", R.GRASS_DK, 0.25));
    else if (sp.k > 0.45) clover(ctx, sp.x, sp.y, deep, 0.7);
  }
  // grass: the realm's own tufts, then a dense scatter of smaller ones
  const blades = [];
  for (const tf of TUFTS) blades.push([tf.x, tf.y, 0.9 + tf.s * 0.6]);
  for (let i = 0; i < 520; i++) {
    const x = rng() * W, y = rng() * H;
    if (!clear(x, y, 5)) continue;
    blades.push([x, y, 0.55 + rng() * 0.65]);
  }
  blades.sort((a, b) => a[1] - b[1]);
  blades.forEach(([x, y, s], i) => tuft(ctx, x, y, s, i % 4 === 0 ? deep : base, i % 3 === 0 ? R.GRASS_LT : tip, i));
  // wildflowers
  FLOWERS.forEach((f, i) => flower(ctx, f.x, f.y, f.c, i, 0.9 + hash(i, 5) * 0.4));
}

// ---- the road ----------------------------------------------------------
function paintRoad(ctx) {
  const R = REALM;
  const rng = mulberry32((R.seed ^ 0x0a0ad) >>> 0);
  const main = R.PATH_MAIN, dk = R.PATH_DK, edge = R.PATH_EDGE;
  const lt = lighten(main, 0.2);
  const wide = PATH_HALF * 2;

  // dirt spreads onto the grass: a feathered halo (many faint rings, so the
  // edge has no edge), then a firmer margin
  for (let k = 9; k >= 1; k--) strokePts(ctx, PTS, wide + 2 + k * 3, rgba(edge, 0.03 + (9 - k) * 0.006));
  strokePts(ctx, PTS, wide + 3, mix(main, edge, 0.45));
  // the road is worn a little below the turf: its sunward edge sits in
  // shadow, the far edge catches light
  ctx.save(); ctx.translate(-1.2, -1.2);
  strokePts(ctx, PTS, wide + 2, rgba(darken(dk, 0.2), 0.4));
  ctx.restore();
  ctx.save(); ctx.translate(1.2, 1.2);
  strokePts(ctx, PTS, wide + 2, rgba(lighten(main, 0.3), 0.45));
  ctx.restore();
  // the body, with a paler crown down the middle
  strokePts(ctx, PTS, wide - 2, main);
  strokePts(ctx, PTS, wide - 16, rgba(lt, 0.18));
  // three lanes: the packed, paler tracks where feet and wheels go, and the
  // faint ridges of loose dirt between them
  for (const off of [-LANE_OFF, 0, LANE_OFF]) {
    strokePts(ctx, offsetPts(PTS, off), 12, rgba(lighten(main, 0.28), 0.2));
    strokePts(ctx, offsetPts(PTS, off), 5, rgba(lighten(main, 0.4), 0.14));
  }
  for (const off of [-LANE_OFF / 2, LANE_OFF / 2]) {
    strokePts(ctx, offsetPts(PTS, off), 3, rgba(dk, 0.13));
  }
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

// The cached ground for the realm currently loaded. Rebuilt whenever the
// road changes underneath it (a new realm) — and only then.
export function groundLayer() {
  const key = `${REALM.id}|${PTS.length}|${PTS[0]}|${PTS[PTS.length - 1]}|${RES}|${PATH_HALF}`;
  if (layer && key === layerKey) return layer;
  layer = document.createElement("canvas");
  layer.width = W * RES;
  layer.height = H * RES;
  const ctx = layer.getContext("2d");
  ctx.scale(RES, RES);
  paintTurf(ctx);
  paintRoad(ctx);
  layerKey = key;
  return layer;
}

// The living parts of the road: chevrons that kindle when a column marches
// over them. Drawn every frame, on top of the cached ground.
export function drawRoadLive(ctx, g) {
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

// a spare export for the lab pages: paint one lit ball where they ask
export { ball };
