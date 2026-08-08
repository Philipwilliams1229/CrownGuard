// ============ TERRAIN & SCENERY DATA ============
// Pre-computed decoration positions: path chevrons, pebbles, ground patches,
// tufts, wildflowers, plus the realm's fixed decor and ponds. regenTerrain()
// rebuilds everything for the chosen realm. The random-based scatter uses a
// generator seeded per realm, and consumes it IN THIS EXACT ORDER — that is
// what keeps each map identical on every run, so do not reorder these blocks.

import { W, H, PATH_HALF, TILE, mulberry32 } from "./constants.js";
import { TOTAL_LEN, posAt, angleAt, nearestOnPath, buildSmooth } from "../engine/path.js";

export let CHEVRONS = [];
export let PEBBLES = [];
export let GRASS_PATCHES = [];
export let TUFTS = [];
export let FLOWERS = [];
export let SPECKS = [];
export let DECOR = [];
export let PONDS = [];
export let RIVERS = [];   // [{ pts, w, segs }] — living water, in world px
export let BRIDGES = [];  // [{ x, y, a, d0, d1 }] — where the road spans it

// Keep scatter out of the water: true if (x,y) falls inside a pond (plus a
// small shoreline margin).
const inPond = (ponds, x, y) =>
  ponds.some((p) => Math.abs(x - p.x) < p.w / 2 + 6 && Math.abs(y - p.y) < p.h / 2 + 6);

// Perpendicular distance from (x,y) to a river's centerline.
const distToSegs = (segs, x, y) => {
  let best = Infinity;
  for (const s of segs) {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
    const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / (s.len * s.len)));
    const d = Math.hypot(x - (s.x1 + vx * t), y - (s.y1 + vy * t));
    if (d < best) best = d;
  }
  return best;
};

// True when (x,y) stands in running water (plus a bank margin). The build
// check and the scatter both ask this — nothing grows in the river, and
// nothing gets built in it.
export const inRiver = (x, y, margin = 0) =>
  RIVERS.some((rv) => distToSegs(rv.segs, x, y) < rv.w / 2 + margin);

export function regenTerrain(map) {
  const rng = mulberry32(map.seed);
  const sc = map.scatter;
  DECOR = map.decor ? [...map.decor] : [];
  PONDS = map.ponds || [];

  // ---- rivers & their bridges ----
  // A river is corner points on the same grid as the road, smoothed the same
  // way, carrying a width. Built FIRST (and with no randomness) so the
  // scatter below can keep its feet dry without its rng stream shifting.
  RIVERS = (map.rivers || []).map((rv) => {
    const pts = buildSmooth(rv.pts.map(([c, r]) => [c * TILE + TILE / 2, r * TILE + TILE / 2]));
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len > 0.001) segs.push({ x1, y1, x2, y2, len });
    }
    return { pts, w: rv.w || 32, segs };
  });
  // Wherever the road wades in, a bridge carries it: walk the road in small
  // steps, find each stretch inside a river band, and span it with a small
  // margin. The margin stays tight — a diagonal crossing already runs long,
  // and an over-long bridge reads as a boardwalk instead of a crossing.
  BRIDGES = [];
  for (const rv of RIVERS) {
    let inside = false, d0 = 0;
    for (let d = 0; d <= TOTAL_LEN; d += 4) {
      const [x, y] = posAt(d);
      const wet = distToSegs(rv.segs, x, y) < rv.w / 2 + 3;
      if (wet && !inside) { inside = true; d0 = d; }
      if (inside && (!wet || d + 4 > TOTAL_LEN)) {
        inside = false;
        const mid = (d0 + d) / 2;
        const span = (d - d0) + 16;
        const [bx, by] = posAt(mid);
        BRIDGES.push({ x: bx, y: by, a: angleAt(mid), d0: mid - span / 2, d1: mid + span / 2 });
      }
    }
  }

  CHEVRONS = [];
  for (let d = 40; d < TOTAL_LEN - 30; d += 52) {
    const [x, y] = posAt(d);
    CHEVRONS.push({ x, y, a: angleAt(d), d });
  }

  PEBBLES = [];
  for (let d = 8; d < TOTAL_LEN; d += 15) {
    const [x, y] = posAt(d);
    const a = angleAt(d) + Math.PI / 2;
    const off = (rng() - 0.5) * PATH_HALF * 1.5;
    PEBBLES.push({ x: x + Math.cos(a) * off, y: y + Math.sin(a) * off, r: 2 + rng() * 2, s: rng() });
  }

  GRASS_PATCHES = [];
  for (let i = 0; i < sc.patches; i++) {
    const x = rng() * W, y = rng() * H;
    if (nearestOnPath(x, y).d < PATH_HALF + 6) continue;
    if (inPond(PONDS, x, y) || inRiver(x, y, 4)) continue;
    GRASS_PATCHES.push({ x, y, r: 14 + rng() * 26, s: rng() });
  }

  TUFTS = [];
  for (let i = 0; i < sc.tufts; i++) {
    const x = rng() * W, y = rng() * H;
    if (nearestOnPath(x, y).d < PATH_HALF + 8) continue;
    if (inPond(PONDS, x, y) || inRiver(x, y, 4)) continue;
    TUFTS.push({ x, y, s: 0.7 + rng() * 0.7, p: rng() * 6 });
  }

  // Ground specks: little stones, twigs and dry clumps scattered over the
  // turf. Cheap, static, and they stop big fields of grass reading as felt.
  SPECKS = [];
  const nSpeck = sc.specks ?? Math.round(sc.patches * 2.2);
  for (let i = 0; i < nSpeck; i++) {
    const x = rng() * W, y = rng() * H;
    if (nearestOnPath(x, y).d < PATH_HALF + 4) continue;
    if (inPond(PONDS, x, y) || inRiver(x, y, 2)) continue;
    SPECKS.push({ x, y, k: rng(), w: 1 + Math.round(rng() * 2), h: 1 + Math.round(rng()) });
  }

  FLOWERS = [];
  for (let i = 0; i < sc.flowers; i++) {
    const x = 14 + rng() * (W - 28), y = 14 + rng() * (H - 28);
    if (nearestOnPath(x, y).d < PATH_HALF + 10) continue;
    if (inPond(PONDS, x, y) || inRiver(x, y, 6)) continue;
    FLOWERS.push({ x, y, c: sc.flowerCols[Math.floor(rng() * sc.flowerCols.length)], p: rng() * 6 });
  }

  // Scattered landmarks (trees, boulders...) for realms that describe their
  // decor as a recipe instead of hand-placing every item. Runs LAST so adding
  // a recipe to a map never shifts the scatter above it.
  const rec = map.decorRecipe;
  if (rec) {
    for (let tries = 0; tries < rec.count * 30 && DECOR.length < rec.count; tries++) {
      const x = 20 + rng() * (W - 40), y = 24 + rng() * (H - 44);
      if (nearestOnPath(x, y).d < PATH_HALF + 20) continue;
      if (inPond(PONDS, x, y) || inRiver(x, y, 14)) continue;
      if (DECOR.some((d) => Math.hypot(d.x - x, d.y - y) < 42)) continue;
      DECOR.push({ x, y, t: rec.types[Math.floor(rng() * rec.types.length)], s: 0.82 + rng() * 0.42 });
    }
  }
}
