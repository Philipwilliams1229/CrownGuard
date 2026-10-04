// ============ THE RIMEWATER'S BOARDS, PART B ============
// Five of the chapter's fifteen boards (levels-rime.js), made with
// rimeVariant (rime-ground.js); maps.js merges what this returns into REALMS.
// Each keeps the WATER KIND the continent map shows for its level
// (scripts/check-map-water.mjs): coast / river / ponds / dry, as noted.
// A coastal board marked LANDING beaches a longship mid-level: it needs a
// `landings` entry (engine/rime.js) on its strand, beside the road.
//
//   runestead    DRY      the road crosses the high snow in four long
//                         diagonals (a W): halls in an apex see two legs at
//                         once, the open mouths of the pockets see one; the
//                         stone ring holds the low ground in the middle
//   wolfsound    COAST    a narrow sound cuts down from the north and the
//                LANDING  road hairpins round its head: the inside of the
//                         bend is all water, so halls shoot ACROSS it from the
//                         outer shores; the longship runs up the sound and
//                         beaches at its head, in the middle of the road
//   glacierfoot  RIVER    two meltwater channels run out of the glacier and
//                         meet below it; the road bridges onto the island
//                         between them, walks it, and bridges off — the
//                         island is the best ground and the serpent's
//   sealrocks    COAST    two sandy coves either side of the seal rocks, the
//                LANDING  road down at both: the raiders pick their cove each
//                         wave (a spot each, landingsOf rolls which), so a
//                         defence has to answer both beaches
//   saltreach    COAST    the sea fills the north-east, under the gate: the
//                         first half of the march is dry snow under the ice
//                         cliffs, the last climbs to the shore and runs the
//                         tideline to the gate — the kraken's reach is
//                         where the last stand is made
export default function rimeBoardsB(rimeVariant) {
  return {
    // DRY
    runestead: rimeVariant(
      "runestead", "Runestead", "THE RUNE-FIELD",
      "The clans' rune-field on the high snow, far from any water. The road crosses it in four long slants — a hall in the crook of a bend sees two of them, one in a pocket's mouth sees one.",
      20261207,
      [[0.9, 1.2], [1.8, 1.2], [4.2, 8.4], [7, 1.4], [9.8, 8.4], [12.4, 3.2], [13.7, 3.2]],
      {
        decorRecipe: { count: 34, types: ["snowpine", "snowpine", "icerock", "snowpine"] },
        decor: [
          // the runestead: a ring of standing stones on the low ground in the
          // middle, where the two inner slants spread apart
          { x: 400, y: 410, t: "menhir", s: 1.1, v: 0 },
          { x: 437, y: 424, t: "menhir", s: 0.95, v: 1 },
          { x: 450, y: 458, t: "menhir", s: 1.05, v: 2 },
          { x: 432, y: 492, t: "menhir", s: 0.9, v: 0 },
          { x: 396, y: 502, t: "stonefall", s: 1, v: 1 },
          { x: 360, y: 488, t: "menhir", s: 1, v: 3 },
          { x: 348, y: 452, t: "menhir", s: 1.1, v: 1 },
          { x: 364, y: 420, t: "menhir", s: 0.95, v: 2 },
          { x: 400, y: 456, t: "cairn", s: 1.1 },
          // a stone gate at the top of the field, in the crook of the high bend
          { x: 400, y: 30, t: "trilithon", s: 1 },
          // cairns that mark the slants
          { x: 168, y: 300, t: "cairn", s: 0.9 },
          { x: 296, y: 250, t: "cairn", s: 0.85 },
          { x: 548, y: 300, t: "cairn", s: 0.9 },
          { x: 646, y: 380, t: "cairn", s: 0.85 },
          // a stand of snow-pines below the last slant, by the gate
          { x: 628, y: 500, t: "snowpine", s: 1.15 },
          { x: 664, y: 470, t: "snowpine", s: 1 },
          { x: 700, y: 504, t: "snowpine", s: 1.2 },
          { x: 688, y: 432, t: "snowpine", s: 0.9 },
          { x: 590, y: 528, t: "snowpine", s: 0.95 },
          { x: 556, y: 500, t: "icerock", s: 0.9 },
        ],
      },
    ),
    // COAST — LANDING
    wolfsound: rimeVariant(
      "wolfsound", "Wolfsound", "THE SOUND",
      "A narrow sound runs in from the north, and the road goes all the way round its head. Inside the bend there is only black water — the halls on either shore shoot across it, and the longships run up it to the beach at its head.",
      20261208,
      [[0.9, 1.4], [2.6, 1.4], [2.6, 7.4], [10.4, 7.4], [10.4, 1.6], [13.7, 1.6]],
      {
        coast: { edge: "top", from: 262, to: 492, depth: 300, sand: 18, ease: 96 },
        landings: [{ at: [6.4, 7.4], from: "top" }],
        decorRecipe: { count: 26, types: ["snowpine", "snowpine", "icerock", "snowpine", "crystal"] },
        decor: [
          // sea stacks at the sound's mouth
          { x: 238, y: 30, t: "irstack", s: 1 },
          { x: 520, y: 34, t: "irstack", s: 0.9 },
          // the wolf-riders' muster below the road: cairns and old bones
          { x: 330, y: 500, t: "cairn", s: 1 },
          { x: 372, y: 520, t: "boneheap", s: 1 },
          { x: 456, y: 506, t: "cairn", s: 0.85 },
          // pines on the east shore's high ground
          { x: 640, y: 300, t: "snowpine", s: 1.1 },
          { x: 676, y: 330, t: "snowpine", s: 1 },
          { x: 700, y: 290, t: "snowpine", s: 1.2 },
        ],
      },
    ),
    // RIVER
    glacierfoot: rimeVariant(
      "glacierfoot", "Glacier Foot", "THE BRAIDS",
      "Two meltwater channels pour out from under the glacier and meet below it. The road bridges onto the island between them, walks it and bridges off — the best ground on the board, and something swims round it.",
      20261209,
      [[0.9, 2.4], [6.6, 2.4], [6.6, 6.6], [11.8, 6.6], [11.8, 2.6], [13.7, 2.6]],
      {
        rivers: [
          // the west channel (the serpent's: the first river)
          { pts: [[3.4, -0.5], [3.1, 1.6], [3.0, 4.0], [3.4, 6.4], [4.8, 8.2], [6.3, 9.3], [6.8, 10.5]], w: 52, ws: [52, 40, 32, 30, 30, 34, 40] },
          // the east channel, meeting it below the island
          { pts: [[9.6, -0.5], [9.9, 1.6], [10.0, 4.0], [9.7, 6.4], [8.6, 8.2], [7.2, 9.3], [6.8, 10.5]], w: 52, ws: [52, 40, 32, 30, 30, 34, 40] },
        ],
        decorRecipe: { count: 30, types: ["snowpine", "icerock", "crystal", "snowpine"] },
        decor: [
          // the glacier's snout along the top of the island: ice and crystal
          { x: 250, y: 26, t: "crystal", s: 1.2 },
          { x: 300, y: 34, t: "icerock", s: 1.3 },
          { x: 352, y: 24, t: "crystal", s: 1.1 },
          { x: 404, y: 30, t: "icerock", s: 1.4 },
          { x: 456, y: 22, t: "crystal", s: 1.3 },
          { x: 506, y: 32, t: "icerock", s: 1.2 },
          { x: 548, y: 24, t: "crystal", s: 1 },
          // boulders the ice dropped on the island's foot
          { x: 400, y: 470, t: "icerock", s: 1 },
          { x: 420, y: 500, t: "icerock", s: 0.8 },
        ],
      },
    ),
    // COAST — LANDING
    sealrocks: rimeVariant(
      "sealrocks", "The Seal Rocks", "TWO COVES",
      "A raider beach split by the seal rocks into two coves, and the road comes down to both. Every landing picks one — and you won't know which until the sail is on the water.",
      20261210,
      [[0.9, 1.4], [3.0, 1.4], [3.0, 6.6], [6.0, 6.6], [6.0, 3.0], [9.4, 3.0], [9.4, 6.6], [12.3, 6.6], [12.3, 2.4], [13.7, 2.4]],
      {
        coast: { edge: "bottom", from: 30, to: 790, depth: 122, sand: 24 },
        landings: [{ at: [4.6, 6.6], from: "bottom" }, { at: [10.9, 6.6], from: "bottom" }],
        decorRecipe: { count: 30, types: ["snowpine", "icerock", "snowpine", "icerock"] },
        decor: [
          // the seal rocks: stacks on the shore between the two coves
          { x: 352, y: 452, t: "irstack", s: 1 },
          { x: 400, y: 470, t: "irstack", s: 1.2 },
          { x: 452, y: 456, t: "irstack", s: 0.95 },
          { x: 380, y: 424, t: "icerock", s: 1 },
          { x: 428, y: 428, t: "icerock", s: 0.85 },
        ],
      },
    ),
    // COAST
    saltreach: rimeVariant(
      "saltreach", "Saltreach", "THE REACH",
      "A long salt-white shore runs under the ice cliffs to the gate. The march starts dry in the snow; its last mile is the tideline — and the deep water off it is the kraken's.",
      20261211,
      [[0.9, 7.6], [4.4, 7.6], [4.4, 4.2], [8.2, 4.2], [8.2, 7.2], [11.0, 7.2], [11.0, 3.4], [13.7, 3.4]],
      {
        coast: { edge: "top", from: 250, to: 1000, depth: 150, sand: 40, ease: 220 },
        decorRecipe: { count: 30, types: ["icerock", "snowpine", "icerock", "crystal", "snowpine"] },
        decor: [
          // the ice cliffs along the south edge
          { x: 120, y: 520, t: "icerock", s: 1.4 },
          { x: 180, y: 534, t: "icerock", s: 1.2 },
          { x: 300, y: 520, t: "icerock", s: 1.5 },
          { x: 360, y: 530, t: "crystal", s: 1.2 },
          { x: 420, y: 516, t: "icerock", s: 1.3 },
          { x: 560, y: 524, t: "icerock", s: 1.4 },
          { x: 620, y: 534, t: "crystal", s: 1.1 },
          { x: 690, y: 520, t: "icerock", s: 1.3 },
        ],
      },
    ),
  };
}
