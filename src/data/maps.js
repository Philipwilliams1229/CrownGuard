// ============ REALMS ============
// Complete per-realm definitions: ground & road palette, the road's waypoint
// grid, the scenery seed + scatter recipe, fixed decor, and ponds. The
// original battlefield is the first realm; future maps add entries here and
// switch REALM. Loading this module builds the active realm's path and
// terrain immediately (exports in path.js/terrain.js are live bindings).

import { buildPath } from "../engine/path.js";
import { regenTerrain } from "./terrain.js";

export const REALMS = {
  greenwood: {
    name: "Greenwood Vale",
    // ground & road palette
    GRASS: "#69874e",
    GRASS_DK: "#57713f",
    GRASS_LT: "#7a9a5c",
    PATH_MAIN: "#bfa476",
    PATH_DK: "#93794f",
    PATH_EDGE: "#63512f",
    // the road, as [col, row] waypoints on the tile grid
    path: [
      [0.9, 2], [3, 2], [3, 6], [7, 6], [7, 1], [11, 1], [11, 7], [5, 7], [5, 9], [13, 9], [13, 4], [13.7, 4],
    ],
    // scenery: seeded scatter recipe + fixed decor
    seed: 20260710,
    scatter: {
      patches: 46,
      tufts: 55,
      flowers: 26,
      flowerCols: ["#d88aa0", "#e0c070", "#e8e4d8", "#b08ad8"],
    },
    decor: [
      { x: 24, y: 30, t: "pine", s: 1.1 }, { x: 70, y: 420, t: "pine", s: 1 }, { x: 690, y: 26, t: "pine", s: 1.2 },
      { x: 606, y: 116, t: "pine", s: 0.9 }, { x: 60, y: 250, t: "tree", s: 1 }, { x: 452, y: 410, t: "tree", s: 1.05 },
      { x: 700, y: 330, t: "pine", s: 1 }, { x: 250, y: 22, t: "rock", s: 1 }, { x: 460, y: 170, t: "rock", s: 1.2 },
      { x: 26, y: 460, t: "rock", s: 0.9 }, { x: 210, y: 465, t: "pine", s: 0.85 },
    ],
    ponds: [],
  },
};

// the active realm
export const REALM = REALMS.greenwood;
export const { GRASS, GRASS_DK, GRASS_LT, PATH_MAIN, PATH_DK, PATH_EDGE } = REALM;

// build the active realm's road and scenery now, in dependency order
buildPath(REALM.path);
regenTerrain(REALM);
