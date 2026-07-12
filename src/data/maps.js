// ============ REALMS ============
// Complete per-realm definitions: ground & road palette, the road's waypoint
// grid, the scenery seed + scatter recipe, fixed decor, ponds, and ambient
// weather. selectRealm() rebuilds the live path and terrain in place, and
// because module exports are live bindings, the engine and renderer pick up
// the new realm automatically.
//
// Path waypoints are [col, row] on the 15x10 tile grid (fractions allowed at
// the edges). Keep parallel road lanes at least 2 rows/cols apart or they
// visually merge — the road is ~52px wide.

import { buildPath } from "../engine/path.js";
import { regenTerrain } from "./terrain.js";

export const REALMS = {
  greenwood: {
    id: "greenwood",
    name: "Greenwood Vale",
    tag: "BALANCED",
    tagColor: "#a8d88c",
    blurb: "Rolling meadows and a long, winding country road. The realm as you know it.",
    ambient: "none",
    // ground & road palette
    GRASS: "#69874e",
    GRASS_DK: "#57713f",
    GRASS_LT: "#7a9a5c",
    TUFT: "#57713f",
    PATH_MAIN: "#bfa476",
    PATH_DK: "#93794f",
    PATH_EDGE: "#63512f",
    PEBBLE: "#d2ba8e",
    CHEVRON: "60,46,28",
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

  frostfang: {
    id: "frostfang",
    name: "Frostfang Pass",
    tag: "SWITCHBACKS",
    tagColor: "#9fd4e8",
    blurb: "A frozen mountain pass. The road doubles back on itself — towers between the lanes cover two stretches at once.",
    ambient: "snow",
    GRASS: "#c9d6de",
    GRASS_DK: "#b2c2cd",
    GRASS_LT: "#e2ecf2",
    TUFT: "#8fa392",
    PATH_MAIN: "#a8c0cc",
    PATH_DK: "#88a2b0",
    PATH_EDGE: "#5c7484",
    PEBBLE: "#d4e4ea",
    CHEVRON: "38,58,78",
    path: [
      [1, 0.8], [1, 3], [6, 3], [6, 1], [10, 1], [10, 5], [3, 5], [3, 8], [13, 8], [13, 5], [13.8, 5],
    ],
    seed: 20260711,
    scatter: {
      patches: 44,
      tufts: 26,
      flowers: 10,
      flowerCols: ["#a8d8e8", "#e8f4f8", "#c8b8e8"],
    },
    decor: [
      { x: 560, y: 62, t: "snowpine", s: 1.15 }, { x: 648, y: 150, t: "snowpine", s: 0.95 },
      { x: 604, y: 96, t: "snowpine", s: 0.8 }, { x: 100, y: 434, t: "snowpine", s: 1.05 },
      { x: 56, y: 224, t: "snowpine", s: 0.9 }, { x: 240, y: 112, t: "snowpine", s: 0.9 },
      { x: 620, y: 222, t: "icerock", s: 1 }, { x: 40, y: 322, t: "icerock", s: 0.9 },
      { x: 448, y: 214, t: "icerock", s: 0.7 }, { x: 688, y: 46, t: "crystal", s: 1.1 },
      { x: 46, y: 392, t: "crystal", s: 0.9 }, { x: 686, y: 452, t: "crystal", s: 1 },
    ],
    ponds: [{ x: 300, y: 336, w: 64, h: 36, t: "ice" }],
  },

  mistmoor: {
    id: "mistmoor",
    name: "Mistmoor",
    tag: "HAUNTED",
    tagColor: "#c8a8e8",
    blurb: "A drowned marsh where fireflies drift through the fog. Ponds squeeze the buildable ground — plan your footing.",
    ambient: "fireflies",
    GRASS: "#4e5c3c",
    GRASS_DK: "#424f32",
    GRASS_LT: "#5c6c47",
    TUFT: "#3a4a2e",
    PATH_MAIN: "#7a6648",
    PATH_DK: "#64523a",
    PATH_EDGE: "#423624",
    PEBBLE: "#94805e",
    CHEVRON: "34,28,16",
    path: [
      [0.9, 1], [5, 1], [5, 4], [2, 4], [2, 7], [7, 7], [7, 3], [10, 3], [10, 9], [13, 9], [13, 5], [13.7, 5],
    ],
    seed: 20260712,
    scatter: {
      patches: 52,
      tufts: 72,
      flowers: 20,
      flowerCols: ["#7cc85c", "#a8d88c", "#c8a8e8"],
    },
    decor: [
      { x: 600, y: 72, t: "willow", s: 1.1 }, { x: 200, y: 142, t: "willow", s: 0.95 },
      { x: 250, y: 434, t: "willow", s: 1 }, { x: 58, y: 414, t: "willow", s: 0.9 },
      { x: 560, y: 120, t: "mushroom", s: 1 }, { x: 40, y: 182, t: "mushroom", s: 1.1 },
      { x: 330, y: 436, t: "mushroom", s: 0.9 }, { x: 616, y: 198, t: "mushroom", s: 0.8 },
      { x: 104, y: 444, t: "reeds", s: 1 }, { x: 424, y: 442, t: "reeds", s: 1.1 },
      { x: 540, y: 58, t: "reeds", s: 0.9 }, { x: 700, y: 118, t: "reeds", s: 1 },
      { x: 160, y: 428, t: "reeds", s: 0.85 },
    ],
    ponds: [
      { x: 310, y: 265, w: 52, h: 30, t: "swamp" },
      { x: 600, y: 150, w: 64, h: 36, t: "swamp" },
      { x: 60, y: 300, w: 48, h: 28, t: "swamp" },
    ],
  },

  ember: {
    id: "ember",
    name: "Ember Wastes",
    tag: "BRUTAL",
    tagColor: "#e07a72",
    blurb: "Scorched badlands and a short, straight warpath. Half the road means half the time — every shot must count.",
    ambient: "embers",
    GRASS: "#4a3e3a",
    GRASS_DK: "#3c322e",
    GRASS_LT: "#584a44",
    TUFT: "#32292a",
    PATH_MAIN: "#6e6662",
    PATH_DK: "#58504c",
    PATH_EDGE: "#2e2826",
    PEBBLE: "#847c78",
    CHEVRON: "240,160,80",
    path: [
      [0.9, 5], [4, 5], [4, 2], [8, 2], [8, 8], [12, 8], [12, 5], [13.7, 5],
    ],
    seed: 20260713,
    scatter: {
      patches: 44,
      tufts: 16,
      flowers: 0,
      flowerCols: [],
    },
    decor: [
      { x: 90, y: 74, t: "deadtree", s: 1.1 }, { x: 160, y: 182, t: "deadtree", s: 0.9 },
      { x: 556, y: 62, t: "deadtree", s: 1 }, { x: 300, y: 62, t: "deadtree", s: 0.85 },
      { x: 40, y: 202, t: "obsidian", s: 1 }, { x: 660, y: 120, t: "obsidian", s: 1.2 },
      { x: 240, y: 442, t: "obsidian", s: 0.9 }, { x: 60, y: 444, t: "obsidian", s: 0.8 },
      { x: 300, y: 332, t: "vent", s: 1 }, { x: 140, y: 330, t: "vent", s: 0.9 },
      { x: 500, y: 202, t: "vent", s: 1 }, { x: 646, y: 202, t: "vent", s: 0.85 },
    ],
    ponds: [
      { x: 100, y: 384, w: 64, h: 34, t: "lava" },
      { x: 676, y: 452, w: 52, h: 26, t: "lava" },
    ],
  },
};

// the active realm (live binding — reassigned by selectRealm)
export let REALM = REALMS.greenwood;

export function selectRealm(id) {
  REALM = REALMS[id] || REALMS.greenwood;
  buildPath(REALM.path);
  regenTerrain(REALM);
  return REALM;
}

// build the default realm's road and scenery now, in dependency order
selectRealm("greenwood");
