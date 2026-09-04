// ============ TERRAIN & SCENERY DATA ============
// Pre-computed decoration positions: path chevrons, pebbles, ground patches,
// tufts, wildflowers, plus the realm's fixed decor and ponds. regenTerrain()
// rebuilds everything for the chosen realm. The random-based scatter uses a
// generator seeded per realm, and consumes it IN THIS EXACT ORDER — that is
// what keeps each map identical on every run, so do not reorder these blocks.

import { W, H, PATH_HALF, TILE, WALL_W, mulberry32 } from "./constants.js";
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
// The first river as a ROUTE something can actually swim: cumulative lengths
// along its centerline, plus where it passes under the road. Swimmers enter at
// whichever bank-end lies nearest the spawn and climb out at the crossing.
export let RIVER_ROUTE = null;
export let BRIDGES = [];  // [{ x, y, a, d0, d1 }] — where the road spans it
// The wood the horde marches out of: a band of forest along the board edge
// nearest the spawn, with a wandering inner boundary. Null where the enemy
// comes out of a cave or a barrow instead.
export let FOREST = null;  // { edge: "left" | "top", seed }
const forestBound = (t, seed) =>
  74 + 20 * Math.sin(t * 0.019 + seed) + 12 * Math.sin(t * 0.047 + seed * 1.7) + 7 * Math.sin(t * 0.11 + seed * 0.3);
// How far inside the forest (x, y) stands; negative means open ground.
export const forestDepthAt = (x, y) =>
  !FOREST ? -999 : FOREST.edge === "left" ? forestBound(y, FOREST.seed) - x : forestBound(x, FOREST.seed) - y;

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
  // A river you can travel: measure its centerline, then find where the road
  // crosses it. That crossing is the only place a swimmer can climb out.
  RIVER_ROUTE = null;
  if (RIVERS.length) {
    const rv = RIVERS[0];
    const cum = [0];
    for (const sg of rv.segs) cum.push(cum[cum.length - 1] + sg.len);
    const total = cum[cum.length - 1];
    if (total > 60) {
      let crossD = 0, crossBest = Infinity;
      for (let d = 0; d <= TOTAL_LEN; d += 4) {
        const [x, y] = posAt(d);
        const dd = distToSegs(rv.segs, x, y);
        if (dd < crossBest) { crossBest = dd; crossD = d; }
      }
      // where along the water that crossing sits
      const [cx, cy] = posAt(crossD);
      let swimAt = 0, swimBest = Infinity;
      for (let i = 0; i < rv.segs.length; i++) {
        const sg = rv.segs[i];
        for (let t = 0; t <= 1; t += 0.1) {
          const px = sg.x1 + (sg.x2 - sg.x1) * t, py = sg.y1 + (sg.y2 - sg.y1) * t;
          const dd = Math.hypot(px - cx, py - cy);
          if (dd < swimBest) { swimBest = dd; swimAt = cum[i] + sg.len * t; }
        }
      }
      const at = (d) => {
        const q = Math.max(0, Math.min(total, d));
        let i = 0;
        while (i < rv.segs.length - 1 && cum[i + 1] < q) i++;
        const sg = rv.segs[i];
        const t = sg.len > 0 ? (q - cum[i]) / sg.len : 0;
        return [sg.x1 + (sg.x2 - sg.x1) * t, sg.y1 + (sg.y2 - sg.y1) * t];
      };
      // enter from the bank-end nearest the horde's own gate
      const [sx, sy] = posAt(0);
      const [ax, ay] = at(0), [bx, by] = at(total);
      const fromStart = Math.hypot(ax - sx, ay - sy) <= Math.hypot(bx - sx, by - sy);
      RIVER_ROUTE = { total, at, entry: fromStart ? 0 : total, exitSwim: swimAt, exitRoad: Math.min(TOTAL_LEN - 8, crossD + 10), dir: fromStart ? 1 : -1 };
    }
  }

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

  // ---- the grounding pass ----
  // Nothing floats. Every tree, rock and tent — recipe-scattered OR hand-
  // placed — must stand with its whole footprint on honest ground: clear of
  // the road, the water, and both gates. Offenders get walked away from the
  // road a few steps; whatever can't find footing is cleared away entirely.
  const [gx0, gy0] = posAt(0);
  const [gx1, gy1] = posAt(TOTAL_LEN);
  DECOR = DECOR.filter((d) => {
    const rad = decorFootprint(d);
    for (let step = 0; step < 8; step++) {
      const near = nearestOnPath(d.x, d.y);
      const clearRoad = near.d >= PATH_HALF + rad;
      const wet = inPond(PONDS, d.x, d.y) || inRiver(d.x, d.y, rad);
      const gate = Math.hypot(d.x - gx0, d.y - gy0) < 46 + rad || Math.hypot(d.x - gx1, d.y - gy1) < 40 + rad;
      const wall = d.x > W - WALL_W - rad;
      if (clearRoad && !wet && !gate && !wall) return true;
      const dd = Math.max(1, Math.hypot(d.x - near.x, d.y - near.y));
      d.x = Math.min(W - WALL_W - rad, Math.max(16, d.x + ((d.x - near.x) / dd) * 10 - (wall ? 10 : 0)));
      d.y = Math.min(H - 20, Math.max(20, d.y + ((d.y - near.y) / dd) * 10));
    }
    return false;
  });

  // ---- the forest ----
  // Where the horde comes out of the trees, the trees are real: a wood that
  // fills the board edge behind the spawn and runs its whole length, dense
  // at the edge and thinning toward a wandering treeline. The road is the
  // only way through it. Placed after grounding on purpose — these are
  // meant to crowd the gate.
  FOREST = null;
  if (map.spawn === "grove") {
    const edge = gx0 < 100 ? "left" : gy0 < 100 ? "top" : null;
    if (edge) {
      FOREST = { edge, seed: (map.seed % 97) * 0.37 };
      const frng = mulberry32((map.seed ^ 0xf03e57) >>> 0);
      const span = edge === "left" ? H : W;
      for (let u = -12; u < span + 12; u += 25) {
        const bound = forestBound(u, FOREST.seed);
        for (let dpt = -16; dpt < bound + 4; dpt += 25) {
          const ju = (frng() - 0.5) * 10, jd = (frng() - 0.5) * 10;
          const x = edge === "left" ? dpt + jd : u + ju;
          const y = edge === "left" ? u + ju : dpt + jd;
          if (nearestOnPath(x, y).d < PATH_HALF + 12) continue;
          if (inPond(PONDS, x, y) || inRiver(x, y, 6)) continue;
          if (x > W - WALL_W - 6) continue;
          const deep = 1 - Math.max(0, dpt) / Math.max(1, bound);
          const s = 0.95 + frng() * 0.35 + deep * 0.3;
          DECOR.push({ x, y, t: frng() < 0.68 ? "tree" : "pine", s: s * (frng() < 0.2 ? 1.2 : 1), forest: true });
        }
      }
    }
  }
}

// How wide a decor piece really stands, so blocking and grounding match the
// art instead of one loose circle for everything: boulders are stones, not
// oaks, and a banner pole is barely wider than its shadow.
const FOOTPRINT = {
  tree: 15, pine: 12, snowpine: 12, willow: 17, deadtree: 11,
  rock: 9, icerock: 9, obsidian: 10, crystal: 9, cairn: 9, gravestone: 7,
  mushroom: 8, reeds: 8, vent: 11, banner: 6, watchtower: 14, tent: 14,
};
export const decorFootprint = (d) => Math.round((FOOTPRINT[d.t] ?? 13) * (d.s || 1));
