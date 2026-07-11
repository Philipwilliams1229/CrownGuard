// ============ PATH MATH ============
// The enemy road: a handful of corner points, smoothed into a curve, then
// measured so we can ask "where am I at distance N along the road?".

import { TILE } from "../data/constants.js";

const RAW = [
  [0.9, 2], [3, 2], [3, 6], [7, 6], [7, 1], [11, 1], [11, 7], [5, 7], [5, 9], [13, 9], [13, 4], [13.7, 4],
].map(([c, r]) => [c * TILE + TILE / 2, r * TILE + TILE / 2]);

function buildSmooth() {
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

export const PTS = buildSmooth();
export const SEGS = [];
export let TOTAL_LEN = 0;
for (let i = 0; i < PTS.length - 1; i++) {
  const [x1, y1] = PTS[i];
  const [x2, y2] = PTS[i + 1];
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.001) continue;
  SEGS.push({ x1, y1, x2, y2, len, start: TOTAL_LEN });
  TOTAL_LEN += len;
}

export function posAt(dist) {
  if (dist <= 0) { const s = SEGS[0]; return [s.x1, s.y1]; }
  for (const s of SEGS) {
    if (dist <= s.start + s.len) {
      const t = (dist - s.start) / s.len;
      return [s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t];
    }
  }
  const l = SEGS[SEGS.length - 1];
  return [l.x2, l.y2];
}

export function angleAt(dist) {
  for (const s of SEGS) if (dist <= s.start + s.len) return Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
  const l = SEGS[SEGS.length - 1];
  return Math.atan2(l.y2 - l.y1, l.x2 - l.x1);
}

export function nearestOnPath(x, y) {
  let best = { d: Infinity, x: 0, y: 0 };
  for (const s of SEGS) {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
    const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / (s.len * s.len)));
    const px = s.x1 + vx * t, py = s.y1 + vy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { d, x: px, y: py };
  }
  return best;
}
