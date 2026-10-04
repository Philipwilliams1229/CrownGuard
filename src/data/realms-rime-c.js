// ============ THE RIMEWATER'S BOARDS, PART C ============
// Five of the chapter's fifteen boards (levels-rime.js), made with
// rimeVariant (rime-ground.js); maps.js merges what this returns into REALMS.
// Each keeps the WATER KIND the continent map shows for its level
// (scripts/check-map-water.mjs): coast / river / ponds / dry, as noted.
// A coastal board marked LANDING beaches a longship mid-level: it needs a
// `landings` entry (engine/rime.js) on its strand, beside the road.
//
// What each asks (none of the chapter's other boards asks the same):
//   bergwater   PONDS   the road rings a berg-choked mere and walks out on a
//                       spit into it: the ground inside the ring is water
//   drakesfell  RIVER   a switchback cut down the middle by a river off the
//                       fells: every pocket is split, three bridges, and the
//                       serpent swims past all of them
//   krakenfirth COAST*  the road rings the head of a deep, narrow firth: the
//                       water is at hand on every lane, the kraken's own
//   skaldhold   COAST*  a long road round the hold, then the strand to the
//                       gate: the longship beaches LAST, under the walls
//   jarlsfjord  COAST*  the finale: the road dips twice to the fjord's shore
//                       and a ship may beach at either crest
//   (* = LANDING)
// Hand-placed decor is in grid px (maps.js adds the border); coasts are in
// board px along their edge.
export default function rimeBoardsC(rimeVariant) {
  return {
    // PONDS
    bergwater: rimeVariant(
      "bergwater", "Bergwater", "THE MERE",
      "A mere choked with stranded bergs. The road rings it and walks out on a spit into the water — the best ground inside the ring is lake.",
      20261212,
      [[0.9, 1.2], [2.3, 1.2], [2.3, 8.3], [5.4, 8.3], [5.4, 6.3], [8.6, 6.3], [8.6, 8.3], [11.6, 8.3], [11.6, 1.4], [13.7, 1.4]],
      {
        ponds: [
          { x: 362, y: 168, w: 320, h: 190 },
          { x: 286, y: 128, w: 180, h: 130 },
          { x: 452, y: 206, w: 170, h: 120 },
          // two arms of it reach down either side of the spit
          { x: 222, y: 262, w: 64, h: 120 },
          { x: 500, y: 266, w: 64, h: 116 },
        ],
        decorRecipe: { count: 14, types: ["rmspruce", "rmspruce", "rmtussock", "rmrock", "rmspruce"] },
        // bergs run aground in the mere, and floes
        rimeFloes: [
          { x: 292, y: 118, t: "berg", s: 1.2 }, { x: 430, y: 160, t: "berg", s: 0.85 },
          { x: 360, y: 214, t: "floe", s: 1 }, { x: 478, y: 112, t: "floe", s: 0.8 },
          { x: 252, y: 178, t: "floe", s: 0.7 }, { x: 500, y: 250, t: "floe", s: 0.6 },
        ],
        decor: [
          // bergs stranded on the shores when the mere fell
          { x: 232, y: 64, t: "rmrock", v: 2, s: 0.9 }, { x: 540, y: 196, t: "rmrock", v: 1, s: 0.8 },
          { x: 300, y: 300, t: "rmicefall", v: 1, s: 0.8 },
          // a fishing steading on the north shore
          { x: 344, y: 26, t: "rmlonghouse", v: 0, s: 1 }, { x: 410, y: 36, t: "rmrack", s: 1 },
          { x: 446, y: 52, t: "rmboat", v: 1, s: 1 }, { x: 274, y: 40, t: "rmcairn", s: 0.8 },
          // spruce outside the ring
          { x: 26, y: 250, t: "rmspruce", s: 1.1 }, { x: 52, y: 278, t: "rmspruce", s: 0.85 },
          { x: 22, y: 420, t: "rmspruce", s: 1 }, { x: 660, y: 270, t: "rmspruce", s: 1.1 },
          { x: 690, y: 300, t: "rmspruce", s: 0.9 }, { x: 650, y: 446, t: "rmspruce", s: 1 },
          { x: 610, y: 20, t: "rmspruce", s: 1 },
        ],
        // bergs stranded right on the waterline (strand: placed after grounding, unmoved)
        strand: [
          { x: 206, y: 98, t: "rmicefall", v: 1, s: 1.1 },
          { x: 532, y: 162, t: "rmicefall", v: 1, s: 1 },
        ],
      },
    ),
    // RIVER
    drakesfell: rimeVariant(
      "drakesfell", "Drakesfell", "THE RIVER",
      "A meltwater river falls off the drakes' fells and cuts the switchbacks down the middle. Every pocket is split in two, and something swims under all three bridges.",
      20261213,
      [[0.9, 1.3], [11.4, 1.3], [11.4, 4.7], [2.6, 4.7], [2.6, 8.2], [13.7, 8.2]],
      {
        rivers: [{ pts: [[7.4, -0.5], [7.1, 1.3], [7.7, 3.0], [7.1, 4.7], [7.6, 6.4], [7.2, 8.2], [7.5, 10.5]], w: 40, ws: [30, 32, 44, 36, 48, 36, 40] }],
        decorRecipe: { count: 16, types: ["rmspruce", "rmrock", "rmspruce", "rmtussock", "rmspruce"] },
        decor: [
          // the fells: the river comes down a frozen fall between black crags
          { x: 344, y: 10, t: "rmicefall", v: 0, s: 1.15 }, { x: 414, y: 12, t: "rmicefall", v: 1, s: 1 },
          { x: 300, y: 18, t: "rmrock", v: 0, s: 1.1 }, { x: 452, y: 20, t: "rmrock", v: 3, s: 0.9 },
          // the drakes' crag beside the gate, crystal where they nest
          { x: 640, y: 120, t: "rmicefall", v: 1, s: 1.2 }, { x: 668, y: 156, t: "crystal", s: 1.1 },
          { x: 618, y: 160, t: "rmrock", v: 2, s: 0.9 }, { x: 660, y: 290, t: "rmrock", v: 1, s: 1 },
          { x: 24, y: 300, t: "rmicefall", v: 1, s: 1 }, { x: 48, y: 334, t: "crystal", s: 0.85 },
          // waystones at the bridges' ends
          { x: 330, y: 92, t: "rmrunestone", s: 0.9 }, { x: 424, y: 262, t: "rmrunestone", s: 0.9 },
          { x: 322, y: 430, t: "rmcairn", s: 0.9 },
          { x: 30, y: 430, t: "rmspruce", s: 1 }, { x: 56, y: 450, t: "rmspruce", s: 0.8 },
          { x: 690, y: 20, t: "rmspruce", s: 1 },
        ],
      },
    ),
    // COAST — LANDING
    krakenfirth: rimeVariant(
      "krakenfirth", "Kraken Firth", "THE FIRTH",
      "A deep, narrow firth no fisher will sail. The road rings its head, so the water is at hand on every lane — and the kraken keeps it.",
      20261214,
      [[2.2, 0.8], [2.2, 8.2], [4.6, 8.2], [4.6, 1.4], [10.0, 1.4], [10.0, 7.4], [13.7, 7.4]],
      {
        coast: { edge: "bottom", from: 286, to: 556, depth: 340, sand: 16, ease: 98 },
        landings: [{ at: [7.2, 1.4], from: "bottom", put: [7.3, 10.6] }],
        decorRecipe: { count: 16, types: ["rmspruce", "rmspruce", "rmrock", "rmtussock", "rmspruce"] },
        rimeFloes: [
          { x: 404, y: 330, t: "skerry", s: 1 }, { x: 372, y: 428, t: "floe", s: 0.9 },
          { x: 428, y: 236, t: "floe", s: 0.7 }, { x: 446, y: 460, t: "skerry", s: 0.8 },
        ],
        decor: [
          // what the kraken left on the head of the firth
          // a steading nobody fishes from now
          { x: 330, y: 24, t: "rmlonghouse", v: 1, s: 1 }, { x: 396, y: 30, t: "rmrack", s: 0.9 },
          { x: 270, y: 30, t: "rmboat", v: 0, s: 1 },
          // black crags breaking the firth's sides where the road leaves them room
          { x: 286, y: 210, t: "rmrock", v: 1, s: 0.9 }, { x: 476, y: 300, t: "rmrock", v: 2, s: 0.8 },
          { x: 536, y: 440, t: "rmicefall", v: 1, s: 1 }, { x: 576, y: 456, t: "rmrock", v: 0, s: 0.9 },
          { x: 30, y: 140, t: "rmspruce", s: 1.1 }, { x: 22, y: 330, t: "rmspruce", s: 1 },
          { x: 50, y: 360, t: "rmspruce", s: 0.85 }, { x: 680, y: 30, t: "rmspruce", s: 1.1 },
          { x: 660, y: 446, t: "rmspruce", s: 1 },
        ],
        // on the shingle at the firth's head and down its west shore
        strand: [
          { x: 352, y: 164, t: "rmwhale", v: 1, s: 1 },
          { x: 424, y: 168, t: "rmwhale", v: 0, s: 0.85 },
          { x: 388, y: 166, t: "rmboat", v: 1, s: 0.9 },
          { x: 302, y: 300, t: "rmboat", v: 0, s: 0.85 },
        ],
      },
    ),
    // COAST — LANDING
    skaldhold: rimeVariant(
      "skaldhold", "Skaldhold", "THE STRAND",
      "The skalds' hold above the sea. The road goes the long way round the hold, then runs the strand to your gate — and the longship beaches last, under your walls.",
      20261215,
      [[0.9, 3.4], [3.6, 3.4], [3.6, 1.2], [11.6, 1.2], [11.6, 4.4], [6.0, 4.4], [6.0, 7.5], [13.7, 7.5]],
      {
        coast: { edge: "bottom", from: 190, to: 820, depth: 92, sand: 16, ease: 130 },
        landings: [{ at: [10.4, 7.5], from: "bottom" }],
        decorRecipe: { count: 16, types: ["rmspruce", "rmspruce", "rmrock", "rmtussock", "rmspruce"] },
        rimeFloes: [
          { x: 520, y: 470, t: "skerry", s: 0.9 }, { x: 640, y: 474, t: "seals", s: 1 },
          { x: 360, y: 476, t: "floe", s: 0.8 },
        ],
        decor: [
          // the hold: longhouses round the skalds' picture stone
          { x: 88, y: 292, t: "rmlonghouse", v: 0, s: 1.1 }, { x: 176, y: 356, t: "rmlonghouse", v: 1, s: 1 },
          { x: 96, y: 410, t: "rmlonghouse", v: 0, s: 1 }, { x: 160, y: 288, t: "rmskaldstone", s: 1.1 },
          { x: 136, y: 334, t: "rmrunestone", s: 0.9 },
          // the hold's ships drawn up on the strand below it
          // the cliff-top
          { x: 210, y: 14, t: "rmrock", v: 1, s: 1 }, { x: 470, y: 12, t: "rmrock", v: 3, s: 0.9 },
          { x: 690, y: 30, t: "rmspruce", s: 1 }, { x: 30, y: 30, t: "rmspruce", s: 1.1 },
          { x: 64, y: 54, t: "rmspruce", s: 0.85 },
        ],
        // the hold's strand, west of where the road comes down to it
        strand: [
          { x: 230, y: 445, t: "rmlongship", v: 1, s: 1 },
          { x: 198, y: 484, t: "rmboat", v: 0, s: 0.9 },
          { x: 262, y: 414, t: "rmrack", s: 0.9 },
          { x: 662, y: 442, t: "rmsealrock", s: 0.9 },
        ],
      },
    ),
    // COAST — LANDING (the boss)
    jarlsfjord: rimeVariant(
      "jarlsfjord", "The Jarl's Fjord", "THE FJORD",
      "The Rime Jarl's own fjord. The road dips twice to its shore, and his longships may beach at either crest — then the war-mammoth comes down the road.",
      20261216,
      [[0.9, 8.3], [2.8, 8.3], [2.8, 3.0], [5.8, 3.0], [5.8, 8.3], [8.8, 8.3], [8.8, 3.0], [11.8, 3.0], [11.8, 6.4], [13.7, 6.4]],
      {
        coast: { edge: "top", from: 30, to: 720, depth: 132, sand: 18, ease: 160 },
        landings: [{ at: [4.3, 3.0], from: "top" }, { at: [10.3, 3.0], from: "top" }],
        decorRecipe: { count: 16, types: ["rmspruce", "rmspruce", "rmrock", "rmtussock", "rmspruce"] },
        rimeFloes: [
          { x: 250, y: 40, t: "berg", s: 1.1 }, { x: 430, y: 30, t: "floe", s: 1 },
          { x: 560, y: 58, t: "skerry", s: 1 }, { x: 120, y: 30, t: "seals", s: 0.9 },
          { x: 340, y: 70, t: "floe", s: 0.7 },
        ],
        decor: [
          // the Jarl's hall above his gate
          { x: 84, y: 262, t: "rmlonghouse", v: 0, s: 1.25 }, { x: 98, y: 344, t: "rmlonghouse", v: 1, s: 1 },
          { x: 92, y: 192, t: "rmskaldstone", s: 1.15 }, { x: 104, y: 214, t: "rmrunestone", s: 1 },
          { x: 100, y: 392, t: "rmrunestone", s: 0.9 },
          // his fleet drawn up on the strand
          { x: 646, y: 196, t: "rmwhale", v: 0, s: 1 },
          { x: 680, y: 160, t: "rmboat", v: 1, s: 0.9 },
          { x: 690, y: 420, t: "rmspruce", s: 1.1 }, { x: 650, y: 450, t: "rmspruce", s: 0.9 },
          { x: 330, y: 456, t: "rmrock", v: 2, s: 0.9 }, { x: 20, y: 456, t: "rmspruce", s: 1 },
        ],
        // the Jarl's fleet drawn up along his strand, between and over the crests
        strand: [
          { x: 196, y: 110, t: "rmlongship", v: 0, s: 1 },
          { x: 356, y: 86, t: "rmlongship", v: 1, s: 1 },
          { x: 520, y: 100, t: "rmlongship", v: 0, s: 1 },
          { x: 284, y: 90, t: "rmboat", v: 1, s: 0.9 },
          { x: 412, y: 94, t: "rmrack", s: 0.9 },
          { x: 108, y: 70, t: "rmsealrock", s: 0.9 },
        ],
      },
    ),
  };
}
