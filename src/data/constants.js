// ============ CORE CONSTANTS ============
// Board dimensions, gameplay tuning numbers, the color palette, and the
// seeded random generator. These are shared everywhere, so they live here.

export const TILE = 48;
export const COLS = 15;
export const ROWS = 10;
export const W = COLS * TILE;
export const H = ROWS * TILE;
export const PATH_HALF = 26;
export const BLOCK_DIST = 38;
export const CASTLE_HP = 20;
export const RALLY_RANGE = 96;
export const BUILD_TIME = 30;
// global pacing: <1 slows the whole simulation (enemies, shots, cooldowns)
// without touching balance — the 1x/2x/4x button multiplies on top
export const BASE_SPEED = 0.8;
export const RESPAWN_MS = 7000;
export const CELL = 2;

// ---- Palette ----
// Ground & road colors now live per-realm in data/maps.js. Only the shared
// outline ink stays here.
export const INK = "#2b2a33";

// Snap a coordinate to the pixel grid (used all over the renderer).
export const S = (v) => Math.round(v / CELL) * CELL;

// Deterministic pseudo-random generator. Each realm seeds its own instance
// (see data/terrain.js) so every map's scenery is laid out identically on
// every run.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
