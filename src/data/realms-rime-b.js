// ============ THE RIMEWATER'S BOARDS, PART B ============
// Five of the chapter's fifteen boards (levels-rime.js), made with
// rimeVariant (rime-ground.js); maps.js merges what this returns into REALMS.
// Each keeps the WATER KIND the continent map shows for its level
// (scripts/check-map-water.mjs): coast / river / ponds / dry, as noted.
// A coastal board marked LANDING beaches a longship mid-level: it needs a
// `landings` entry (engine/rime.js) on its strand, beside the road.
// STUB boards: a designer replaces each with the real one.
export default function rimeBoardsB(rimeVariant) {
  return {
    // DRY
    runestead: rimeVariant(
      "runestead", "Runestead", "THE SNOWFIELD",
      "Stub board.",
      20261207,
      [[0.9, 8], [4, 8], [4, 3], [8, 3], [8, 7], [11, 7], [11, 2], [13.7, 2]],
      {  },
    ),
    // COAST — LANDING
    wolfsound: rimeVariant(
      "wolfsound", "Wolfsound", "THE SHORE",
      "Stub board.",
      20261208,
      [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      { coast: { edge: "bottom", from: 60, to: 720, depth: 110, sand: 22 }, landings: [{ at: 0.62, from: "bottom" }] },
    ),
    // RIVER
    glacierfoot: rimeVariant(
      "glacierfoot", "Glacier Foot", "THE RIVER",
      "Stub board.",
      20261209,
      [[0.9, 2], [4, 2], [4, 7], [10, 7], [10, 3], [13.7, 3]],
      { rivers: [{ pts: [[7.5, -0.5], [7.3, 3.2], [7.8, 6.4], [7.6, 10.5]], w: 28 }] },
    ),
    // COAST — LANDING
    sealrocks: rimeVariant(
      "sealrocks", "The Seal Rocks", "THE SHORE",
      "Stub board.",
      20261210,
      [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      { coast: { edge: "bottom", from: 60, to: 720, depth: 110, sand: 22 }, landings: [{ at: 0.62, from: "bottom" }] },
    ),
    // COAST
    saltreach: rimeVariant(
      "saltreach", "Saltreach", "THE SHORE",
      "Stub board.",
      20261211,
      [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      { coast: { edge: "bottom", from: 60, to: 720, depth: 110, sand: 22 } },
    ),
  };
}
