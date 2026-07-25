// ============ TERRAIN & SCENERY DATA ============
// Pre-computed decoration positions: path chevrons, pebbles, ground patches,
// tufts, wildflowers, plus the realm's fixed decor and ponds. regenTerrain()
// rebuilds everything for the chosen realm. The random-based scatter uses a
// generator seeded per realm, and consumes it IN THIS EXACT ORDER — that is
// what keeps each map identical on every run, so do not reorder these blocks.

import { W, H, PATH_HALF, mulberry32 } from "./constants.js";
import { TOTAL_LEN, posAt, angleAt, nearestOnPath } from "../engine/path.js";

export let CHEVRONS = [];
export let PEBBLES = [];
export let GRASS_PATCHES = [];
export let TUFTS = [];
export let FLOWERS = [];
export let DECOR = [];
export let PONDS = [];

// Keep scatter out of the water: true if (x,y) falls inside a pond (plus a
// small shoreline margin).
const inPond = (ponds, x, y) =>
  ponds.some((p) => Math.abs(x - p.x) < p.w / 2 + 6 && Math.abs(y - p.y) < p.h / 2 + 6);

export function regenTerrain(map) {
  const rng = mulberry32(map.seed);
  const sc = map.scatter;
  DECOR = map.decor ? [...map.decor] : [];
  PONDS = map.ponds || [];

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
    if (inPond(PONDS, x, y)) continue;
    GRASS_PATCHES.push({ x, y, r: 14 + rng() * 26, s: rng() });
  }

  TUFTS = [];
  for (let i = 0; i < sc.tufts; i++) {
    const x = rng() * W, y = rng() * H;
    if (nearestOnPath(x, y).d < PATH_HALF + 8) continue;
    if (inPond(PONDS, x, y)) continue;
    TUFTS.push({ x, y, s: 0.7 + rng() * 0.7, p: rng() * 6 });
  }

  FLOWERS = [];
  for (let i = 0; i < sc.flowers; i++) {
    const x = 14 + rng() * (W - 28), y = 14 + rng() * (H - 28);
    if (nearestOnPath(x, y).d < PATH_HALF + 10) continue;
    if (inPond(PONDS, x, y)) continue;
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
      if (inPond(PONDS, x, y)) continue;
      if (DECOR.some((d) => Math.hypot(d.x - x, d.y - y) < 42)) continue;
      DECOR.push({ x, y, t: rec.types[Math.floor(rng() * rec.types.length)], s: 0.82 + rng() * 0.42 });
    }
  }
}
