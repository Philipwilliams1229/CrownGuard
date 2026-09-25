// ============ PATH MATH ============
// The enemy road: a handful of corner points, smoothed into a curve, then
// measured so we can ask "where am I at distance N along the road?".
// Each realm supplies its own corner points (see data/maps.js); buildPath()
// rebuilds everything in place, and because ES module exports are live
// bindings, every importer sees the new road immediately.

import { W, WALL_W, tileX, tileY } from "../data/constants.js";

export let PTS = [];
export let SEGS = [];
export let TOTAL_LEN = 0;

// Also used by terrain.js to bend rivers the same way roads bend.
export function buildSmooth(RAW) {
  const out = [RAW[0]];
  const R = 34;
  for (let i = 1; i < RAW.length - 1; i++) {
    const [px, py] = RAW[i - 1];
    const [cx, cy] = RAW[i];
    const [nx, ny] = RAW[i + 1];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const r1 = Math.min(R, d1 * 0.45), r2 = Math.min(R, d2 * 0.45);
    const ax = cx - ((cx - px) / d1) * r1, ay = cy - ((cy - py) / d1) * r1;
    const bx = cx + ((nx - cx) / d2) * r2, by = cy + ((ny - cy) / d2) * r2;
    out.push([ax, ay]);
    for (let s = 1; s <= 7; s++) {
      const u = s / 7;
      out.push([
        (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * cx + u * u * bx,
        (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * cy + u * u * by,
      ]);
    }
  }
  out.push(RAW[RAW.length - 1]);
  return out;
}

// rawGrid: waypoints in [col, row] grid units (fractions allowed at the edges).
export function buildPath(rawGrid) {
  const RAW = rawGrid.map(([c, r]) => [tileX(c), tileY(r)]);
  // the road begins deep in the border — inside the wood or the cave mouth —
  // and ends at the castle wall, whatever the grid says
  const [sx, sy] = RAW[0];
  if (sx < tileX(2)) RAW[0] = [22, sy]; else if (sy < 120) RAW[0] = [sx, 22];
  // (the road's end sits a fixed step in through the gate, from the wall's face)
  RAW[RAW.length - 1] = [W - WALL_W + 18, RAW[RAW.length - 1][1]];
  PTS = buildSmooth(RAW);
  SEGS = [];
  TOTAL_LEN = 0;
  for (let i = 0; i < PTS.length - 1; i++) {
    const [x1, y1] = PTS[i];
    const [x2, y2] = PTS[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 0.001) continue;
    SEGS.push({ x1, y1, x2, y2, len, start: TOTAL_LEN });
    TOTAL_LEN += len;
  }
}

// the segment holding `dist` (binary search: every foe asks several times a tick)
function segAt(dist) {
  let lo = 0, hi = SEGS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (dist <= SEGS[mid].start + SEGS[mid].len) hi = mid; else lo = mid + 1;
  }
  return SEGS[lo];
}

export function posAt(dist) {
  if (dist <= 0) { const s = SEGS[0]; return [s.x1, s.y1]; }
  if (dist >= TOTAL_LEN) { const l = SEGS[SEGS.length - 1]; return [l.x2, l.y2]; }
  const s = segAt(dist);
  const t = (dist - s.start) / s.len;
  return [s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t];
}

export function angleAt(dist) {
  const s = dist >= TOTAL_LEN ? SEGS[SEGS.length - 1] : segAt(Math.max(0, dist));
  return Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
}

// Where a foe in lane `lane` stands at road distance `dist`, and the road's
// smoothed heading there — the tangent across a short stretch, so a lane
// offset doesn't jitter through a corner's short segments.
export function lanePos(dist, lane) {
  const [px, py] = posAt(dist);
  const [ax, ay] = posAt(Math.max(0, dist - 6));
  const [bx, by] = posAt(Math.min(TOTAL_LEN, dist + 6));
  const a = Math.hypot(bx - ax, by - ay) > 0.01 ? Math.atan2(by - ay, bx - ax) : angleAt(dist);
  return [px + Math.cos(a + Math.PI / 2) * lane, py + Math.sin(a + Math.PI / 2) * lane, a];
}

export function nearestOnPath(x, y) {
  let best = { d: Infinity, x: 0, y: 0 };
  for (const s of SEGS) {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
    const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / (s.len * s.len)));
    const px = s.x1 + vx * t, py = s.y1 + vy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { d, x: px, y: py, dist: s.start + t * s.len };
  }
  return best;
}
