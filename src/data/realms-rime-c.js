// ============ THE RIMEWATER'S BOARDS, PART C ============
// Five of the chapter's fifteen boards (levels-rime.js), made with
// rimeVariant (rime-ground.js); maps.js merges what this returns into REALMS.
// Each keeps the WATER KIND the continent map shows for its level
// (scripts/check-map-water.mjs): coast / river / ponds / dry, as noted.
// A coastal board marked LANDING beaches a longship mid-level: it needs a
// `landings` entry (engine/rime.js) on its strand, beside the road.
// STUB boards: a designer replaces each with the real one.
export default function rimeBoardsC(rimeVariant) {
  return {
    // PONDS
    bergwater: rimeVariant(
      "bergwater", "Bergwater", "THE MERES",
      "Stub board.",
      20261212,
      [[0.9, 1.5], [11, 1.5], [11, 8], [3, 8], [3, 4.5], [13.7, 4.5]],
      { ponds: [{ x: 360, y: 280, w: 120, h: 60 }] },
    ),
    // RIVER
    drakesfell: rimeVariant(
      "drakesfell", "Drakesfell", "THE RIVER",
      "Stub board.",
      20261213,
      [[0.9, 2], [4, 2], [4, 7], [10, 7], [10, 3], [13.7, 3]],
      { rivers: [{ pts: [[7.5, -0.5], [7.3, 3.2], [7.8, 6.4], [7.6, 10.5]], w: 28 }] },
    ),
    // COAST — LANDING
    krakenfirth: rimeVariant(
      "krakenfirth", "Kraken Firth", "THE SHORE",
      "Stub board.",
      20261214,
      [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      { coast: { edge: "bottom", from: 60, to: 720, depth: 110, sand: 22 }, landings: [{ at: 0.62, from: "bottom" }] },
    ),
    // COAST — LANDING
    skaldhold: rimeVariant(
      "skaldhold", "Skaldhold", "THE SHORE",
      "Stub board.",
      20261215,
      [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      { coast: { edge: "bottom", from: 60, to: 720, depth: 110, sand: 22 }, landings: [{ at: 0.62, from: "bottom" }] },
    ),
    // COAST — LANDING
    jarlsfjord: rimeVariant(
      "jarlsfjord", "The Jarl's Fjord", "THE SHORE",
      "Stub board.",
      20261216,
      [[0.9, 1.5], [4.5, 1.5], [4.5, 6.4], [11, 6.4], [11, 2.5], [13.7, 2.5]],
      { coast: { edge: "bottom", from: 60, to: 720, depth: 110, sand: 22 }, landings: [{ at: 0.62, from: "bottom" }] },
    ),
  };
}
