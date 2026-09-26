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
// Pond x/y are grid pixels (tile c's centre is c * 48 + 24); river points are
// [col, row] like the road's. Keep ponds 32+ px clear of the road's centre.
//
// The fen's own landmarks (src/render/scenery-hollow.js) and how wide each
// really stands — what blocks a hall and keeps the grounding pass honest.
import { addFootprints } from "./terrain.js";

addFootprints({
  fendead: 10, fenwillow: 16, fensnag: 7, reedbed: 10, bogpool: 13,
  fengrave: 7, fencairn: 9, fenbones: 9, fenstatue: 13, fenshrine: 12,
  bellstone: 11, fencandle: 6, lichfence: 12,
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
        decorRecipe: { count: 50, types: ["fengrave", "lichfence", "fengrave", "fencairn", "fengrave", "fenshrine", "fenbones", "fencandle", "fenstatue", "fengrave"] },
      },
    ),
  };
}
