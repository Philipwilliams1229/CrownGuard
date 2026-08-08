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
    ambient: "leaves",
    clouds: true,
    // late-afternoon sun: a touch of gold, corners falling into shade
    light: { tint: "255,238,206", amount: 0.1, vignette: 0.26 },
    spawn: "grove",     // the horde shoulders out of the thicket
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
      patches: 58,
      tufts: 88,
      flowers: 34,
      flowerCols: ["#d88aa0", "#e0c070", "#e8e4d8", "#b08ad8"],
    },
    // A proper wood, not a few specimens — stands cluster and overlap.
    decor: [
      { x: 24, y: 30, t: "pine", s: 1.1 }, { x: 48, y: 62, t: "pine", s: 0.85 },
      { x: 70, y: 420, t: "pine", s: 1 }, { x: 44, y: 392, t: "tree", s: 0.9 },
      { x: 690, y: 26, t: "pine", s: 1.2 }, { x: 660, y: 58, t: "pine", s: 0.9 },
      { x: 606, y: 116, t: "pine", s: 0.9 }, { x: 636, y: 146, t: "tree", s: 0.85 },
      { x: 60, y: 250, t: "tree", s: 1 }, { x: 32, y: 214, t: "pine", s: 0.95 },
      { x: 452, y: 410, t: "tree", s: 1.05 }, { x: 500, y: 410, t: "pine", s: 0.9 },
      { x: 700, y: 330, t: "pine", s: 1 }, { x: 704, y: 300, t: "tree", s: 0.95 },
      { x: 250, y: 22, t: "rock", s: 1 }, { x: 282, y: 40, t: "rock", s: 0.7 },
      { x: 460, y: 170, t: "rock", s: 1.2 }, { x: 430, y: 190, t: "rock", s: 0.75 },
      { x: 26, y: 460, t: "rock", s: 0.9 }, { x: 210, y: 465, t: "pine", s: 0.85 },
      { x: 178, y: 438, t: "tree", s: 0.9 }, { x: 604, y: 316, t: "tree", s: 1 },
      { x: 700, y: 158, t: "pine", s: 0.8 }, { x: 108, y: 200, t: "tree", s: 0.95 },
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
    clouds: true,
    // flat overcast bouncing off the snow — cold, bright, low contrast
    light: { tint: "212,230,250", amount: 0.13, vignette: 0.3 },
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
    // dusk under a canopy: sickly green, and very dark at the edges
    light: { tint: "150,192,152", amount: 0.2, vignette: 0.46 },
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
    // lit from the ground up: hot orange wash rising off the scorched rock
    light: { tint: "255,196,140", amount: 0.16, vignette: 0.46, glow: "196,92,40", glowAmount: 0.1 },
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

// ============ CAMPAIGN REALMS ============
// The maps the campaign marches through. They share a biome's palette and
// scatter recipe and differ only in the road, the seed, and the landmarks —
// so a chapter feels like one country seen from five different valleys.
// Landmarks come from `decorRecipe` (see terrain.js): the generator scatters
// them itself and keeps them off the road, so no hand-placing is needed.

// Everything green: the same meadow as Greenwood Vale, a different road.
const greenwoodVariant = (id, name, tag, blurb, seed, path, extra = {}) => ({
  ...REALMS.greenwood, id, name, tag, blurb, seed, path,
  spawn: "grove",
  water: { deep: "#3a6a7c", edge: "#4a8094", shine: "#8cc4d8" },
  decor: undefined,
  decorRecipe: { count: 22, types: ["pine", "tree", "pine", "tree", "rock"] },
  ponds: [],
  ...extra,
});

// The Iron Kingdom's country: cropped highland turf and a paved military road.
const IRON_GROUND = {
  tag: "IRON MARCHES",
  tagColor: "#9ab6d8",
  ambient: "dust",
  clouds: true,
  // a steel overcast with no sun in it — colder and flatter than the Vale
  light: { tint: "214,224,240", amount: 0.13, vignette: 0.34 },
  GRASS: "#5a6557",
  GRASS_DK: "#4a5448",
  GRASS_LT: "#6a7566",
  TUFT: "#444e42",
  PATH_MAIN: "#9c9c96",
  PATH_DK: "#7c7c78",
  PATH_EDGE: "#4a4a48",
  PEBBLE: "#bcbcb6",
  CHEVRON: "48,48,52",
  scatter: {
    patches: 40,
    tufts: 34,
    flowers: 12,
    flowerCols: ["#d8d4c0", "#c8b898", "#a8b8c8"],
  },
};
const ironVariant = (id, name, blurb, seed, path, extra = {}) => ({
  ...IRON_GROUND, id, name, blurb, seed, path,
  water: { deep: "#33505e", edge: "#43647a", shine: "#7aa4bc" },
  decorRecipe: { count: 10, types: ["rock", "pine", "rock", "tree"] },
  ponds: [],
  ...extra,
});

Object.assign(REALMS, {
  // ---- Chapter I: Greenwood Vale ----
  thornbrook: greenwoodVariant(
    "thornbrook", "Thornbrook Ford", "THE BROOK",
    "Wide meadows cut in half by a living brook. One timber bridge carries the road over — the water carries nothing anywhere.",
    20260714,
    [[0.9, 8], [3, 8], [3, 3], [6, 3], [6, 8], [9, 8], [9, 2], [12, 2], [12, 6], [13.7, 6]],
    { rivers: [{ pts: [[7.5, -0.5], [7.2, 3.5], [7.7, 6.5], [7.4, 10.5]], w: 28 }] },
  ),
  oakmere: greenwoodVariant(
    "oakmere", "Oakmere Hollow", "TIGHT TURNS",
    "A sunken hollow ringed with old oaks. The road folds back on itself twice — one good tower covers both lanes.",
    20260715,
    [[2, 0.8], [2, 4], [6, 4], [6, 1], [10, 1], [10, 6], [4, 6], [4, 8], [13, 8], [13.7, 8]],
    { ponds: [{ x: 612, y: 396, w: 66, h: 34 }] },
  ),
  barrowfields: greenwoodVariant(
    "barrowfields", "The Barrowfields", "HAUNTED GROUND",
    "Burial mounds under long grass. The goblins have been digging here, and something is answering.",
    20260716,
    [[0.9, 1], [6, 1], [6, 4], [2, 4], [2, 7], [8, 7], [8, 4], [11, 4], [11, 9], [13.7, 9]],
  ),
  warrens: greenwoodVariant(
    "warrens", "The Goblin Warrens", "THE LAIR",
    "The mouth of the horde's home burrow. The road coils like a gut — and the dragon that guards it is awake.",
    20260717,
    [[0.9, 1], [4, 1], [4, 4], [1, 4], [1, 7], [5, 7], [5, 9], [9, 9], [9, 5], [7, 5], [7, 2], [11, 2], [11, 5], [13, 5], [13, 8], [13.7, 8]],
    { decorRecipe: { count: 26, types: ["pine", "pine", "tree", "rock"] } },
  ),

  // ---- Chapter II: The Iron Marches ----
  kingsroad: ironVariant(
    "kingsroad", "The King's Road",
    "The border highway, paved and straight. The first Iron column is already on it — and it marches in step.",
    20260721,
    [[0.9, 5], [5, 5], [5, 2], [9, 2], [9, 7], [13, 7], [13, 4], [13.7, 4]],
  ),
  stonewatch: ironVariant(
    "stonewatch", "Stonewatch",
    "A ruined border fort on bare rock. Three long lanes, no cover, and crossbows that shoot back at your knights.",
    20260722,
    [[0.9, 2], [3, 2], [3, 7], [7, 7], [7, 2], [11, 2], [11, 7], [13.7, 7]],
  ),
  ironford: ironVariant(
    "ironford", "Ironford",
    "A real river this time, crossed twice. The water eats your buildable ground, and the siege rams take the bridges like they own them.",
    20260723,
    [[0.9, 8], [4, 8], [4, 4], [8, 4], [8, 8], [11, 8], [11, 3], [13.7, 3]],
    {
      rivers: [{ pts: [[6.3, -0.5], [6.4, 4.8], [9.5, 6.8], [9.6, 10.5]], w: 34 }],
      ponds: [{ x: 132, y: 300, w: 54, h: 30 }],
    },
  ),
  greyhelm: ironVariant(
    "greyhelm", "Greyhelm Pass",
    "The climb into the Iron heartland. Switchbacks all the way up — and the whole army is coming down.",
    20260724,
    [[1, 0.8], [1, 4], [6, 4], [6, 1], [10, 1], [10, 6], [4, 6], [4, 9], [13, 9], [13, 5], [13.7, 5]],
    { decorRecipe: { count: 13, types: ["rock", "rock", "pine"] } },
  ),
  citadel: ironVariant(
    "citadel", "The Citadel Gate",
    "The last mile before the Iron throne. A gauntlet of a road, and the Lord Marshal himself at the end of it.",
    20260725,
    [[0.9, 1], [5, 1], [5, 4], [1, 4], [1, 7], [5, 7], [5, 9], [9, 9], [9, 6], [7, 6], [7, 3], [11, 3], [11, 6], [13, 6], [13, 2], [13.7, 2]],
    { decorRecipe: { count: 12, types: ["rock", "pine", "rock"] } },
  ),
});

// ============ CHAPTER III: THE HOLLOWFEN ============
// The drowned country. Black-green turf, a road of pale bone-dust, standing
// water everywhere, and a moon that never quite rises. The dead walk out of
// barrows instead of woods, and the water is the map's real opponent: rivers
// and meres eat the buildable ground on every one of these boards.

const HOLLOW_GROUND = {
  tag: "THE FEN",
  tagColor: "#b08ad8",
  ambient: "wisps",
  // a drowned moon: cold blue-grey light, edges falling away into the dark
  light: { tint: "168,186,224", amount: 0.2, vignette: 0.5 },
  spawn: "barrow",       // the dead come up out of the ground, not the trees
  GRASS: "#3e4438",
  GRASS_DK: "#333930",
  GRASS_LT: "#4a5142",
  TUFT: "#2c332a",
  // bone-dust road: pale enough to read at night
  PATH_MAIN: "#948b76",
  PATH_DK: "#776f5c",
  PATH_EDGE: "#46402f",
  PEBBLE: "#b0a88e",
  CHEVRON: "26,22,20",
  water: { deep: "#22302c", edge: "#2f423c", shine: "#4a6a58" },
  bridge: { beam: "#3c3428", plank: "#6e6656", plankDk: "#565040", rail: "#4a4438" },
  scatter: {
    patches: 50,
    tufts: 64,
    flowers: 14,
    flowerCols: ["#9a8ec4", "#b0a88e", "#7a8a6a"],
  },
};
const hollowVariant = (id, name, tag, blurb, seed, path, extra = {}) => ({
  ...HOLLOW_GROUND, id, name, tag, blurb, seed, path,
  decorRecipe: { count: 16, types: ["gravestone", "cairn", "deadtree", "gravestone", "boneheap"] },
  ponds: [],
  ...extra,
});

Object.assign(REALMS, {
  graveroad: hollowVariant(
    "graveroad", "The Grave Road", "FIRST CROSSING",
    "The old causeway into the fen, crossing the Weepwater twice. The dead walk it in floods — hold both bridges and bleed them the whole way.",
    20260801,
    [[0.9, 2], [4, 2], [4, 5], [8, 5], [8, 2], [12, 2], [12, 7], [6, 7], [6, 9], [13.7, 9]],
    { rivers: [{ pts: [[9.5, -0.5], [9.6, 3.5], [10.4, 6.2], [10.4, 10.5]], w: 30 }] },
  ),
  sunkencauseway: hollowVariant(
    "sunkencauseway", "The Sunken Causeway", "DROWNED GROUND",
    "Three black meres and a dead-straight moat, and between them barely enough dry ground to raise a tower. Every footing here has to earn its keep.",
    20260802,
    [[0.9, 8], [3, 8], [3, 4], [6, 4], [6, 1], [10, 1], [10, 6], [13, 6], [13, 3], [13.7, 3]],
    {
      ponds: [
        { x: 410, y: 200, w: 120, h: 64, t: "swamp" },
        { x: 120, y: 120, w: 90, h: 56, t: "swamp" },
        { x: 600, y: 430, w: 120, h: 56, t: "swamp" },
      ],
      rivers: [{ pts: [[-0.5, 9.15], [7, 9.0], [15.5, 9.15]], w: 22 }],
    },
  ),
  wightwood: hollowVariant(
    "wightwood", "Wightwood", "TIGHT TURNS",
    "A drowned forest of white, dead trees. The road coils through them like something lost — one well-set tower here watches four lanes at once.",
    20260803,
    [[1, 0.8], [1, 4], [4, 4], [4, 1], [7, 1], [7, 6], [2, 6], [2, 9], [9, 9], [9, 4], [12, 4], [12, 7], [13.7, 7]],
    {
      ponds: [
        { x: 560, y: 90, w: 74, h: 42, t: "swamp" },
        { x: 320, y: 350, w: 56, h: 32, t: "swamp" },
      ],
      decorRecipe: { count: 22, types: ["deadtree", "deadtree", "gravestone", "cairn", "reeds"] },
    },
  ),
  cairnfields: hollowVariant(
    "cairnfields", "The Cairnfields", "THREE BRIDGES",
    "A river straight through the burial fields, and the road forced over it three times. Every cairn is a door, and the bells know your name.",
    20260804,
    [[0.9, 1], [4, 1], [4, 7], [8, 7], [8, 3], [12, 3], [12, 9], [13.7, 9]],
    {
      rivers: [{ pts: [[-0.5, 5.4], [5, 5.6], [10, 5.3], [15.5, 5.5]], w: 28 }],
      decorRecipe: { count: 20, types: ["cairn", "cairn", "gravestone", "boneheap", "deadtree"] },
    },
  ),
  thronedust: hollowVariant(
    "thronedust", "The Throne of Dust", "THE COURT",
    "The drowned throne itself, ringed by the Weepwater. The longest road in the fen — and the Hollow King walking it home.",
    20260805,
    [[0.9, 8], [4, 8], [4, 5], [1, 5], [1, 2], [6, 2], [6, 6], [9, 6], [9, 1], [12, 1], [12, 6], [13.7, 6]],
    {
      rivers: [{ pts: [[-0.5, 6.2], [2.4, 6.8], [3.2, 8.9], [6.5, 9.5], [15.5, 9.3]], w: 26 }],
      ponds: [{ x: 660, y: 130, w: 70, h: 44, t: "swamp" }],
      decorRecipe: { count: 18, types: ["obelisk", "gravestone", "cairn", "boneheap", "deadtree"] },
    },
  ),
});

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
