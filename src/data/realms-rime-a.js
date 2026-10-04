// ============ THE RIMEWATER'S BOARDS, PART A ============
// Five of the chapter's fifteen boards (levels-rime.js), made with
// rimeVariant (rime-ground.js); maps.js merges what this returns into REALMS.
// Each keeps the WATER KIND the continent map shows for its level
// (scripts/check-map-water.mjs): coast / river / ponds / dry, as noted.
// A coastal board marked LANDING beaches a longship mid-level: it needs a
// `landings` entry (engine/rime.js) on its strand, beside the road.
// STUB boards: a designer replaces each with the real one.
export default function rimeBoardsA(rimeVariant) {
  return {
    // COAST — LANDING
    frostwake: rimeVariant(
      "frostwake", "Frostwake Strand", "THE SHORE",
      "Stub board.",
      20261202,
      [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      { coast: { edge: "bottom", from: 60, to: 720, depth: 110, sand: 22 }, landings: [{ at: 0.62, from: "bottom" }] },
    ),
    // COAST
    skerryway: rimeVariant(
      "skerryway", "The Skerry Way", "THE SHORE",
      "Stub board.",
      20261203,
      [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      { coast: { edge: "bottom", from: 60, to: 720, depth: 110, sand: 22 } },
    ),
    // RIVER
    icefjord: rimeVariant(
      "icefjord", "Ice-Fjord", "THE RIVER",
      "Stub board.",
      20261204,
      [[0.9, 2], [4, 2], [4, 7], [10, 7], [10, 3], [13.7, 3]],
      { rivers: [{ pts: [[7.5, -0.5], [7.3, 3.2], [7.8, 6.4], [7.6, 10.5]], w: 28 }] },
    ),
    // COAST — LANDING
    whalebone: rimeVariant(
      "whalebone", "Whalebone Bay", "THE SHORE",
      "Stub board.",
      20261205,
      [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      { coast: { edge: "bottom", from: 60, to: 720, depth: 110, sand: 22 }, landings: [{ at: 0.62, from: "bottom" }] },
    ),
    // PONDS
    frostmere: rimeVariant(
      "frostmere", "Frostmere", "THE MERES",
      "Stub board.",
      20261206,
      [[0.9, 1.5], [11, 1.5], [11, 8], [3, 8], [3, 4.5], [13.7, 4.5]],
      { ponds: [{ x: 360, y: 280, w: 120, h: 60 }] },
    ),
  };
}
