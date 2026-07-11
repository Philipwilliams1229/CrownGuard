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
export const RALLY_RANGE = 140;
export const BUILD_TIME = 30;
export const RESPAWN_MS = 7000;
export const CELL = 2;

// ---- Palette ----
export const INK = "#2b2a33";
export const GRASS = "#69874e";
export const GRASS_DK = "#57713f";
export const GRASS_LT = "#7a9a5c";
export const PATH_MAIN = "#bfa476";
export const PATH_DK = "#93794f";
export const PATH_EDGE = "#63512f";

// Snap a coordinate to the pixel grid (used all over the renderer).
export const S = (v) => Math.round(v / CELL) * CELL;

// Deterministic pseudo-random generator, seeded so the map's scenery is
// laid out identically every run.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rng = mulberry32(20260710);
