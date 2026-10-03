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
//   barrowdowns THE BARROWS   the dry downs: the barrows sit on the best seats
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
  // the fifteen-level pieces: a corpse-light over its stake, a long barrow (a
  // circle can't hold it: its tail runs ~1.4x past this), a bowl barrow in
  // its ditch, a standing stone, a row of monks' crosses, the weir-keeper's hut
  fenwisp: 6, fenlongbarrow: 21, fenroundbarrow: 16, fenstone: 7, fenmonks: 13, fenhut: 17,
});
// What stands IN the water is not decor (the grounding pass would walk it
// ashore): a board lists it as `fenRelics` — [{ x, y, t, s, v }] in grid
// pixels, (x, y) on the waterline; scenery-hollow.js "the drowned relics".
// It blocks nothing (the water already does).

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
      "The crypt hill below the throne, the last dry ground before it, and every foot of it a grave. The shortest road in the chapter — and the court comes up it at a run.",
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
        // the corpse-lights themselves, hovering over stakes and reeds along
        // the creek's banks, and out over its black water
        decor: [
          { x: 424, y: 40, t: "fenwisp", s: 0.95 }, { x: 386, y: 230, t: "fenwisp", s: 0.9 },
          { x: 462, y: 324, t: "fenwisp", s: 0.85 }, { x: 316, y: 430, t: "fenwisp", s: 1 },
          { x: 208, y: 407, t: "fenwisp", s: 0.9 }, { x: 181, y: 462, t: "fenwisp", s: 0.95 },
        ],
        fenRelics: [
          { x: 398, y: 66, t: "wisp", h: 13 }, { x: 436, y: 318, t: "wisp", h: 12, s: 0.9 },
          { x: 331, y: 392, t: "wisp", h: 14 }, { x: 149, y: 430, t: "wisp", h: 12, s: 0.9 },
          { x: 452, y: 64, t: "wisp", h: 11, s: 0.85 },
          // and the lanterns someone hung over it, still burning
          { x: 358, y: 228, t: "lanternpost" }, { x: 250, y: 426, t: "lanternpost", s: 0.9 },
        ],
        fenMeadows: 14,
        // witch-fire: the corpse-lights wash the fen a sickly teal
        light: { tint: "150,204,190", amount: 0.22, vignette: 0.52 },
        decorRecipe: { count: 28, types: ["reedbed", "fendead", "fenwillow", "bogpool", "fenbones", "fenwisp", "reedbed", "fengrave", "fendead", "fensnag"] },
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
          // the drowned church north of the cloister: its nave is a black pool
          { x: 418, y: 128, w: 96, h: 56, t: "swamp" },
        ],
        // what stands in the water: the bell-tower's top out of the nave, the
        // stumps of its piers round it, the cloister's south arcade standing
        // in its flooded walk, columns of the inner walk
        fenRelics: [
          { x: 418, y: 138, t: "belltower", s: 0.95 },
          { x: 388, y: 138, t: "column", v: 1, s: 0.9 }, { x: 451, y: 141, t: "column", v: 2, s: 0.85 },
          { x: 398, y: 150, t: "column", v: 3, s: 0.8 },
          { x: 418, y: 294, t: "arcade", v: 0, s: 0.88 },
          { x: 392, y: 218, t: "column", v: 1, s: 0.8 }, { x: 446, y: 222, t: "column", v: 0, s: 0.8 },
          { x: 460, y: 262, t: "column", v: 2, s: 0.75 }, { x: 378, y: 238, t: "column", v: 3, s: 0.75 },
          { x: 588, y: 424, t: "column", v: 3, s: 0.8 },
        ],
        // on dry ground: the lychyard rails between church and cloister, and
        // the monks buried south of the cloister by their pond
        decor: [
          { x: 418, y: 176, t: "lichfence", s: 0.95 },
          { x: 424, y: 442, t: "fenmonks", s: 1 }, { x: 492, y: 468, t: "fenmonks", s: 0.95 },
        ],
        light: { tint: "168,180,222", amount: 0.21, vignette: 0.5 },
        decorRecipe: { count: 15, types: ["fengrave", "lichfence", "fenwillow", "fenmonks", "reedbed", "fendead", "fencandle", "fenstatue", "fengrave", "bogpool"] },
      },
    ),

    // The downs at the fen's north edge: high, dry and bare, and the old
    // kings' barrows crowd every rise. No water at all — like the Lichgate, a dry board
    // with room to build, except that the mounds stand on the best seats,
    // so the halls fight for the gaps between them.
    barrowdowns: hollowVariant(
      "barrowdowns", "The Barrowdowns", "THE BARROWS",
      "The high dry downs at the fen's north edge, the old kings' barrows shoulder to shoulder. Room to build at last — but the mounds stand on the best ground, and every one of them is open.",
      20261033,
      [[0.9, 4.6], [4.2, 4.6], [4.2, 1.4], [12, 1.4], [12, 4.4], [7, 4.4], [7, 8.2], [13.7, 8.2]],
      {
        // drier turf: fewer wet hollows and sedge meadows, a paler sward
        fenHollows: 2, fenMeadows: 3, fenPools: false,
        GRASS: "#475040", GRASS_DK: "#384031", GRASS_LT: "#5d684c", TUFT: "#30382b",
        light: { tint: "184,190,214", amount: 0.18, vignette: 0.46 },
        // the edge of the downs: dead and broken trees, no reeds up here
        wood: { types: [["fendead", 5], ["fensnag", 2.2], ["fenwillow", 0.8]], hem: false, depth: 0.85 },
        // (long, doored and bowl barrows mixed, so the field never reads as
        // one stamp; each sits where a barrow of the old layout sat, blocking
        // about as much. A piece's look follows a hash of where it stands, so
        // the odd pixel of nudge picks it: sealed or robbed, stone or thorn)
        decor: [
          // a row of barrows along the rise inside the long bend
          { x: 414, y: 166, t: "fenlongbarrow", s: 1.05 }, { x: 475, y: 159, t: "fenbarrow", s: 1.1 },
          { x: 536, y: 168, t: "fenroundbarrow", s: 1.3 }, { x: 300, y: 150, t: "fencairn", s: 1.1 },
          // the kings' barrow field on the open down below, in a line down the
          // slope, standing stones between them
          { x: 73, y: 319, t: "fenroundbarrow", s: 1.1 }, { x: 133, y: 358, t: "fenlongbarrow", s: 1.1 },
          { x: 193, y: 399, t: "fenbarrow", s: 1.2 }, { x: 262, y: 442, t: "fenlongbarrow", s: 1.2 },
          { x: 215, y: 324, t: "fenstone", s: 1.15 }, { x: 97, y: 429, t: "fenstone", s: 1.1 },
          // and along the ridgeway's north verge
          { x: 329, y: -3, t: "fenroundbarrow", s: 1.05 }, { x: 451, y: -1, t: "fenlongbarrow", s: 1.05 },
          // and two more in the field inside the last bend
          { x: 518, y: 327, t: "fenlongbarrow", s: 1.1 }, { x: 635, y: 316, t: "fenroundbarrow", s: 1.1 },
        ],
        decorRecipe: { count: 32, types: ["fencairn", "fengrave", "fenbones", "fencairn", "fensnag", "fengrave", "fenstone", "fendead", "fencairn", "fenbarrow", "fenroundbarrow"] },
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
        // the weir itself across the head of the sluices; the drowned
        // kingdom's kings, sunk to the chest in the pool below, guard its
        // outfall; its old piers stand in the still pool above
        fenRelics: [
          { x: 480, y: 240, t: "weir", w: 152, gaps: [432, 480, 528], gw: 18 },
          { x: 452, y: 412, t: "sunkking", v: 0 }, { x: 509, y: 413, t: "sunkking", v: 1 },
          { x: 446, y: 192, t: "column", v: 2, s: 0.9 }, { x: 520, y: 200, t: "column", v: 1, s: 0.9 },
          { x: 470, y: 214, t: "column", v: 3, s: 0.85 },
          { x: 548, y: 408, t: "wisp", h: 12, s: 0.9 },
        ],
        // the weir-keeper's hut, by the west end of his weir
        decor: [{ x: 372, y: 262, t: "fenhut", s: 1 }],
        light: { tint: "160,176,220", amount: 0.23, vignette: 0.54 },
        decorRecipe: { count: 20, types: ["fenstatue", "fendead", "fengrave", "lichfence", "fenwillow", "fenshrine", "fencandle", "reedbed", "fenbones", "fendead"] },
      },
    ),
  };
}
