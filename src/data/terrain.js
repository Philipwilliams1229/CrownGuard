// ============ TERRAIN & SCENERY DATA ============
// Pre-computed decoration positions: path chevrons, pebbles, grass patches,
// tufts, wildflowers, and the fixed trees/rocks. The random-based ones use the
// seeded generator IN THIS EXACT ORDER, which is what keeps the map identical
// on every run — do not reorder these blocks.

import { W, H, PATH_HALF, rng } from "./constants.js";
import { TOTAL_LEN, posAt, angleAt, nearestOnPath } from "../engine/path.js";

export const CHEVRONS = [];
for (let d = 40; d < TOTAL_LEN - 30; d += 52) {
  const [x, y] = posAt(d);
  CHEVRONS.push({ x, y, a: angleAt(d), d });
}

export const PEBBLES = [];
for (let d = 8; d < TOTAL_LEN; d += 15) {
  const [x, y] = posAt(d);
  const a = angleAt(d) + Math.PI / 2;
  const off = (rng() - 0.5) * PATH_HALF * 1.5;
  PEBBLES.push({ x: x + Math.cos(a) * off, y: y + Math.sin(a) * off, r: 2 + rng() * 2, s: rng() });
}

export const GRASS_PATCHES = [];
for (let i = 0; i < 46; i++) {
  const x = rng() * W, y = rng() * H;
  if (nearestOnPath(x, y).d < PATH_HALF + 6) continue;
  GRASS_PATCHES.push({ x, y, r: 14 + rng() * 26, s: rng() });
}

export const TUFTS = [];
for (let i = 0; i < 55; i++) {
  const x = rng() * W, y = rng() * H;
  if (nearestOnPath(x, y).d < PATH_HALF + 8) continue;
  TUFTS.push({ x, y, s: 0.7 + rng() * 0.7, p: rng() * 6 });
}

const FLOWER_COLS = ["#d88aa0", "#e0c070", "#e8e4d8", "#b08ad8"];
export const FLOWERS = [];
for (let i = 0; i < 26; i++) {
  const x = 14 + rng() * (W - 28), y = 14 + rng() * (H - 28);
  if (nearestOnPath(x, y).d < PATH_HALF + 10) continue;
  FLOWERS.push({ x, y, c: FLOWER_COLS[Math.floor(rng() * FLOWER_COLS.length)], p: rng() * 6 });
}

export const DECOR = [
  { x: 24, y: 30, t: "pine", s: 1.1 }, { x: 70, y: 420, t: "pine", s: 1 }, { x: 690, y: 26, t: "pine", s: 1.2 },
  { x: 606, y: 116, t: "pine", s: 0.9 }, { x: 60, y: 250, t: "tree", s: 1 }, { x: 452, y: 410, t: "tree", s: 1.05 },
  { x: 700, y: 330, t: "pine", s: 1 }, { x: 250, y: 22, t: "rock", s: 1 }, { x: 460, y: 170, t: "rock", s: 1.2 },
  { x: 26, y: 460, t: "rock", s: 0.9 }, { x: 210, y: 465, t: "pine", s: 0.85 },
];
