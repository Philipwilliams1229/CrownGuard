// ============ MORE HOLLOW REALMS ============
// Battlefields added to the chapter after the first set. maps.js calls this
// with its hollowVariant(...) helper (the chapter's ground, palette, water
// and light) and merges what it returns into REALMS, so this file never
// imports maps.js (no import cycle).
//
// Each one poses a different problem, so the fen never plays the same twice:
//   saltgrave  THE STRAND     the sea takes the south; one long shore road
//   stillmere  THE MERE       a huge black mere in the middle, the road laps it
//   drownholm  SIX BRIDGES    two arms of the Weepwater, three lanes over both
//   reedmaze   BOG MAZE       a coiled road with a bog pool in every pocket
//   lichgate   THE TOMBS      the shortest road in the fen, through a graveyard
//   lanternfen CORPSE-LIGHTS  a meandering creek eats the best bend; build on its necks
//   abbeymere  THE CLOISTER   a flooded cloister walk round a one-hall garth island
//   barrowdowns THE BARROWS   the one dry board: the barrows sit on the best seats
//   deadweir   THE SLUICES    one crossing, over a weir's three sluice bridges in a row
// Pond x/y are grid pixels (tile c's centre is c * 48 + 24); river points are
// [col, row] like the road's. Keep ponds 32+ px clear of the road's centre.
//
// The fen's own landmarks (src/render/scenery-hollow.js) and how wide each
// really stands — what blocks a hall and keeps the grounding pass honest.
import { addFootprints } from "./terrain.js";

addFootprints({
  fendead: 10, fenwillow: 16, fensnag: 7, reedbed: 10, bogpool: 13,
  fengrave: 7, fencairn: 9, fenbones: 9, fenstatue: 13, fenshrine: 12,
  bellstone: 11, fencandle: 6, lichfence: 12, fenthrone: 17, fenbarrow: 16,
});

export default function moreHollowRealms(hollowVariant) {
  return {
    // The fen's south shore, facing the strait. The sea runs the whole
    // bottom edge, so the long strand road has footings on one side only;
    // the big field inside the bend watches the strand and both climbs.
    saltgrave: hollowVariant(
      "saltgrave", "Saltgrave Strand", "THE STRAND",
      "The fen's grey shore, where the strait gives back what it drowned. The road walks the tideline the whole way — the sea on one hand, the dead on the other.",
      20261001,
      [[0.9, 1.3], [3.5, 1.3], [3.5, 6.9], [9.5, 6.9], [9.5, 2], [12.5, 2], [12.5, 5.5], [13.7, 5.5]],
      {
        coast: { edge: "bottom", from: 40, to: 700, depth: 84, sand: 14 },
        // a salt pool the tide left behind, in the field inside the bend
        ponds: [{ x: 300, y: 200, w: 84, h: 44, t: "swamp" }],
        // a salt wind off the strait: greyer and a little brighter than inland
        light: { tint: "184,198,218", amount: 0.17, vignette: 0.44 },
        decorRecipe: { count: 20, types: ["fenbones", "fendead", "fengrave", "reedbed", "fenwillow", "fenstatue", "bogpool", "fencandle", "fendead"] },
      },
    ),

    // One great black mere fills the middle of the board and the road laps
    // three sides of it. The inner shore is a single row of footings; the
    // rest is thin verge. The mere itself is the best seat — for a boat.
    stillmere: hollowVariant(
      "stillmere", "The Stillmere", "THE MERE",
      "A mere so still it shows no stars. The road walks three shores of it, and there is barely a tower's width of dry ground between the road and the water.",
      20261002,
      [[11.5, 0.8], [11.5, 1.6], [1.6, 1.6], [1.6, 7.9], [12.4, 7.9], [12.4, 4.6], [13.7, 4.6]],
      {
        ponds: [
          { x: 370, y: 252, w: 360, h: 150, t: "swamp" },
          { x: 670, y: 150, w: 56, h: 34, t: "swamp" },
        ],
        water: { deep: "#161f1c", edge: "#26352f", shine: "#44604f" },
        light: { tint: "150,170,214", amount: 0.22, vignette: 0.56 },
        decorRecipe: { count: 14, types: ["reedbed", "fendead", "reedbed", "fengrave", "fenwillow", "fencandle", "fenstatue"] },
      },
    ),

    // A village the fen took back. Two arms of the Weepwater cut the board
    // into three islands, and the road crosses the whole board three times —
    // six bridges, and the only dry ground is the islands between them.
    drownholm: hollowVariant(
      "drownholm", "Drownholm", "SIX BRIDGES",
      "A village the fen took back, cut three ways by the Weepwater. The road crosses its arms six times; every bridge is a place to hold, and the islands between are all the ground there is.",
      20261003,
      [[0.9, 1.3], [12.5, 1.3], [12.5, 4.6], [1.8, 4.6], [1.8, 7.9], [13.7, 7.9]],
      {
        rivers: [
          { pts: [[4.9, -0.5], [5.2, 2.9], [4.6, 6.3], [5.0, 10.5]], w: 26 },
          { pts: [[9.5, -0.5], [9.2, 3.1], [9.8, 6.2], [9.4, 10.5]], w: 24 },
        ],
        decorRecipe: { count: 22, types: ["fenwillow", "fengrave", "reedbed", "fendead", "fenbones", "fenshrine", "lichfence", "fencandle", "fenwillow", "fendead"] },
      },
    ),

    // A coiled road through a reedbed, and a bog pool drowning almost every
    // pocket between its lanes — exactly where a tower would cover two
    // stretches at once. The dry islands left over are the prize.
    reedmaze: hollowVariant(
      "reedmaze", "The Reedmaze", "BOG MAZE",
      "Reeds taller than a man and a road that loses itself among them. Every pocket between the lanes is a bog pool — find the dry islands, and fight from those.",
      20261004,
      [[0.9, 1.2], [4.5, 1.2], [4.5, 4.5], [1.6, 4.5], [1.6, 8], [7.5, 8], [7.5, 1.2], [12.3, 1.2], [12.3, 5], [10, 5], [10, 8], [13.7, 8]],
      {
        // the reeds stand thickest here: more and taller stands in the turf
        fenMeadows: 20, fenReeds: true,
        ponds: [
          { x: 170, y: 160, w: 56, h: 44, t: "swamp" },
          { x: 250, y: 330, w: 90, h: 44, t: "swamp" },
          { x: 500, y: 175, w: 80, h: 40, t: "swamp" },
          { x: 672, y: 200, w: 44, h: 60, t: "swamp" },
          { x: 140, y: 470, w: 90, h: 28, t: "swamp" },
        ],
        decorRecipe: { count: 22, types: ["reedbed", "reedbed", "fendead", "reedbed", "fenwillow", "fengrave", "bogpool", "fencandle"] },
      },
    ),

    // The approach to the drowned court's crypts: the one dry hill in the
    // fen, and the dead have buried it shoulder to shoulder. The shortest
    // road in the chapter: all the time you get is what the hook in the
    // middle buys, so the field inside it is the whole battle.
    lichgate: hollowVariant(
      "lichgate", "The Lichgate", "THE TOMBS",
      "The crypt hill below the throne, the one dry ground in the fen, and every foot of it a grave. The shortest road in the chapter — and the court comes up it at a run.",
      20261005,
      [[0.9, 7.6], [4.5, 7.6], [4.5, 2.2], [9.5, 2.2], [9.5, 6.4], [13.7, 6.4]],
      {
        light: { tint: "178,166,222", amount: 0.22, vignette: 0.5 },
        // fifty pieces on the fen's one dry hill: mostly small headstones,
        // bones and candles — big barrows and shrines would bury the build
        // ground (the old board's gravestones stood only 7 wide)
        decorRecipe: { count: 50, types: ["fengrave", "fengrave", "fencandle", "fengrave", "fenbones", "fengrave", "fencairn", "fengrave", "fencandle", "lichfence", "fengrave", "fenbones"] },
      },
    ),

    // ---- added when the chapter grew to fifteen (2026-10-03) ----
    // (each board's water kind is fixed: the continent map shows it, and
    // scripts/check-map-water.mjs holds the two to each other)
    // A creek of black water winds down through the middle of the board and
    // out to the western sea, and the road crosses it just once. Its loops
    // take the heart of the middle bend: what is left are the necks of land
    // inside each meander, and those are the seats that reach both lanes.
    // The coil before the gate is the board's one generous field.
    lanternfen: hollowVariant(
      "lanternfen", "The Lantern Fen", "CORPSE-LIGHTS",
      "Corpse-lights over a black creek winding out to the western sea. Its loops have eaten the heart of the middle bend — build on the necks of land inside them, and reach over the water.",
      20261031,
      [[0.9, 1.2], [2.3, 1.2], [2.3, 6.6], [5.6, 6.6], [5.6, 2.6], [12.3, 2.6], [12.3, 5.2], [9.9, 5.2], [9.9, 8], [13.7, 8]],
      {
        rivers: [{ pts: [[7.9, -0.5], [7.7, 1.6], [7.8, 3.0], [7.3, 3.7], [6.9, 4.3], [7.3, 4.9], [8.3, 5.3], [8.7, 5.9], [8.3, 6.6], [7.2, 7.2], [5.6, 8.1], [3.6, 8.6], [1.6, 8.3], [-0.5, 8.5]], w: 26 }],
        // side pools the creek left behind: one by its mouth, one under the wood
        ponds: [
          { x: 130, y: 404, w: 64, h: 34, t: "swamp" },
          { x: 446, y: 66, w: 60, h: 30, t: "swamp" },
        ],
        // the corpse-lights themselves, on stakes along the creek's banks
        decor: [
          { x: 424, y: 40, t: "fencandle", s: 0.95 }, { x: 386, y: 230, t: "fencandle", s: 0.9 },
          { x: 462, y: 324, t: "fencandle", s: 0.85 }, { x: 316, y: 430, t: "fencandle", s: 1 },
          { x: 208, y: 407, t: "fencandle", s: 0.9 }, { x: 181, y: 462, t: "fencandle", s: 0.95 },
        ],
        fenMeadows: 14,
        // witch-fire: the corpse-lights wash the fen a sickly teal
        light: { tint: "150,204,190", amount: 0.22, vignette: 0.52 },
        decorRecipe: { count: 28, types: ["reedbed", "fendead", "fenwillow", "bogpool", "fenbones", "fencandle", "reedbed", "fengrave", "fendead", "fensnag"] },
      },
    ),

    // The abbey the fen drowned. The mere has filled the cloister walks and
    // left the garth standing in the middle like an island; the road walks
    // three sides of the cloister, so the one hall that fits on the garth
    // reaches all three lanes over the water. The rest is narrow verge.
    abbeymere: hollowVariant(
      "abbeymere", "Abbeymere", "THE CLOISTER",
      "An abbey drowned to its bell-tower. The mere fills the cloister walks and leaves the garth an island in the middle — room for one hall, and it reaches every lane round the cloister.",
      20261032,
      [[0.9, 8.3], [3.4, 8.3], [3.4, 1.4], [6.38, 1.4], [6.38, 6.5], [10.04, 6.5], [10.04, 1.4], [12.4, 1.4], [12.4, 5], [13.7, 5]],
      {
        ponds: [
          // the four flooded walks round the garth
          { x: 380, y: 248, w: 32, h: 88, t: "swamp" },
          { x: 456, y: 248, w: 32, h: 88, t: "swamp" },
          { x: 418, y: 210, w: 100, h: 32, t: "swamp" },
          { x: 418, y: 286, w: 100, h: 32, t: "swamp" },
          // the monks' fishpond, below the cloister
          { x: 600, y: 420, w: 100, h: 40, t: "swamp" },
        ],
        // the drowned church north of the cloister: its bell-tower's top, the
        // altar shrine, a sunk saint, the lychyard rails
        decor: [
          { x: 418, y: 132, t: "bellstone", s: 1.15 },
          { x: 362, y: 120, t: "fenshrine", s: 1 },
          { x: 474, y: 118, t: "fenstatue", s: 1 },
          { x: 382, y: 156, t: "fencandle", s: 0.85 }, { x: 456, y: 160, t: "lichfence", s: 0.95 },
        ],
        light: { tint: "168,180,222", amount: 0.21, vignette: 0.5 },
        decorRecipe: { count: 18, types: ["fengrave", "lichfence", "fenwillow", "fengrave", "reedbed", "fendead", "fencandle", "fenstatue", "fengrave", "bogpool"] },
      },
    ),

    // The downs at the fen's north edge: high, dry and bare, and the old
    // kings' barrows crowd every rise. No water at all — the one dry board
    // with room to build, except that the mounds stand on the best seats,
    // so the halls fight for the gaps between them.
    barrowdowns: hollowVariant(
      "barrowdowns", "The Barrowdowns", "THE BARROWS",
      "The high dry downs at the fen's north edge, the old kings' barrows shoulder to shoulder. Room to build at last — but the mounds stand on the best ground, and every one of them is open.",
      20261033,
      [[0.9, 4.6], [4.2, 4.6], [4.2, 1.4], [12, 1.4], [12, 4.4], [7, 4.4], [7, 8.2], [13.7, 8.2]],
      {
        // drier turf: fewer wet hollows and sedge meadows, a paler sward
        fenHollows: 2, fenMeadows: 3,
        GRASS: "#475040", GRASS_DK: "#384031", GRASS_LT: "#5d684c", TUFT: "#30382b",
        light: { tint: "184,190,214", amount: 0.18, vignette: 0.46 },
        // the edge of the downs: dead and broken trees, no reeds up here
        wood: { types: [["fendead", 5], ["fensnag", 2.2], ["fenwillow", 0.8]], hem: false, depth: 0.85 },
        decor: [
          // a row of barrows along the rise inside the long bend
          { x: 404, y: 166, t: "fenbarrow", s: 1.3 }, { x: 470, y: 158, t: "fenbarrow", s: 1.15 },
          { x: 536, y: 168, t: "fenbarrow", s: 1.35 }, { x: 300, y: 150, t: "fencairn", s: 1.1 },
          // the kings' barrow field on the open down below, in a line down the slope
          { x: 74, y: 318, t: "fenbarrow", s: 1.1 }, { x: 132, y: 356, t: "fenbarrow", s: 1.4 },
          { x: 194, y: 398, t: "fenbarrow", s: 1.2 }, { x: 258, y: 440, t: "fenbarrow", s: 1.45 },
          { x: 214, y: 324, t: "fencairn", s: 1.0 }, { x: 96, y: 430, t: "fencairn", s: 1.15 },
          // and along the ridgeway's north verge
          { x: 330, y: -4, t: "fenbarrow", s: 1.1 }, { x: 452, y: 0, t: "fenbarrow", s: 1.25 },
          // and two more in the field inside the last bend
          { x: 520, y: 326, t: "fenbarrow", s: 1.3 }, { x: 636, y: 316, t: "fenbarrow", s: 1.1 },
        ],
        decorRecipe: { count: 32, types: ["fencairn", "fengrave", "fenbones", "fencairn", "fensnag", "fengrave", "fencandle", "fendead", "fencairn", "fenbarrow", "fengrave"] },
      },
    ),

    // The Blackwater comes down from the throne, spreads into the still pool
    // above the drowned kingdom's weir and pours through its three sluices.
    // The road crosses once — over all three sluice bridges in a row — and
    // that crossing is the last place to hold before the gate.
    deadweir: hollowVariant(
      "deadweir", "The Dead Weir", "THE SLUICES",
      "The Blackwater pours through the drowned kingdom's weir. The road crosses it once, over three sluice bridges in a row — the last place to hold before the throne, and the court knows it.",
      20261034,
      [[0.9, 1.4], [6.4, 1.4], [6.4, 3.9], [2.4, 3.9], [2.4, 8.2], [6.6, 8.2], [6.6, 6.4], [11.8, 6.4], [11.8, 3.2], [13.7, 3.2]],
      {
        rivers: [
          // the Blackwater above the weir, and below it
          { pts: [[9.0, -0.5], [9.2, 0.8], [9.8, 1.9], [9.5, 3.8]], w: 36 },
          { pts: [[9.5, 7.9], [9.3, 8.9], [9.6, 10.5]], w: 34 },
          // the three sluices through the weir
          { pts: [[8.5, 4.4], [8.5, 7.9]], w: 18 },
          { pts: [[9.5, 4.4], [9.5, 7.9]], w: 18 },
          { pts: [[10.5, 4.4], [10.5, 7.9]], w: 18 },
        ],
        // the still pool backed up above the weir, and the pool it falls into
        ponds: [
          { x: 480, y: 196, w: 140, h: 76, t: "swamp" },
          { x: 480, y: 404, w: 136, h: 40, t: "swamp" },
        ],
        decor: [
          // the drowned kingdom's kings, sunk to the chest, guard the weir
          { x: 432, y: 448, t: "fenstatue", s: 1.1 },
          { x: 530, y: 452, t: "fenstatue", s: 1.05 },
        ],
        light: { tint: "160,176,220", amount: 0.23, vignette: 0.54 },
        decorRecipe: { count: 20, types: ["fenstatue", "fendead", "fengrave", "lichfence", "fenwillow", "fenshrine", "fencandle", "reedbed", "fenbones", "fendead"] },
      },
    ),
  };
}
