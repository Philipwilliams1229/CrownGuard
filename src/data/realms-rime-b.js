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
// Decor and rimeFloes are in GRID px (board px less the 40 px margin,
// MX / MY): the terrain adds the margin when it places them.
export default function rimeBoardsB(rimeVariant) {
  return {
    // DRY
    runestead: rimeVariant(
      "runestead", "Runestead", "THE RUNE-FIELD",
      "The clans' rune-field on the high snow, far from any water. The road crosses it in four long slants — a hall in the crook of a bend sees two of them, one in a pocket's mouth sees one.",
      20261207,
      [[0.9, 1.2], [1.8, 1.2], [4.2, 8.4], [7, 1.4], [9.8, 8.4], [12.4, 3.2], [13.7, 3.2]],
      {
        decorRecipe: { count: 40, types: ["rmspruce", "rmspruce", "rmrock", "rmtussock", "rmspruce", "rmtussock"] },
        decor: [
          // the runestead: a ring of rune stones on the low ground in the
          // middle, where the two inner slants spread apart, and the skald's
          // picture stone at its heart
          { x: 360, y: 368, t: "rmrunestone", s: 1.05 },
          { x: 396, y: 382, t: "rmrunestone", s: 0.95 },
          { x: 410, y: 418, t: "rmrunestone", s: 1 },
          { x: 394, y: 454, t: "rmrunestone", s: 0.9 },
          { x: 358, y: 468, t: "rmrunestone", s: 1.05 },
          { x: 322, y: 452, t: "rmrunestone", s: 0.95 },
          { x: 308, y: 416, t: "rmrunestone", s: 1 },
          { x: 324, y: 380, t: "rmrunestone", s: 0.9 },
          { x: 360, y: 420, t: "rmskaldstone", s: 1.1 },
          // a picture stone in the crook of the high bend
          { x: 360, y: -6, t: "rmskaldstone", s: 0.95 },
          // cairns that mark the slants
          { x: 128, y: 260, t: "rmcairn", s: 0.9 },
          { x: 256, y: 210, t: "rmcairn", s: 0.85 },
          { x: 508, y: 260, t: "rmcairn", s: 0.9 },
          { x: 606, y: 340, t: "rmcairn", s: 0.85 },
          // the stead itself, below the last slant by the gate
          { x: 588, y: 446, t: "rmlonghouse", s: 1 },
          { x: 660, y: 480, t: "rmrack", s: 0.95 },
          { x: 664, y: 406, t: "rmspruce", s: 1.05 },
          { x: 520, y: 490, t: "rmspruce", s: 0.95 },
          // a spruce stand in the west, under the gate's ice
          { x: -4, y: 260, t: "rmspruce", s: 1.1 },
          { x: 30, y: 304, t: "rmspruce", s: 0.95 },
          { x: -10, y: 352, t: "rmspruce", s: 1.05 },
          { x: 70, y: 430, t: "rmrock", s: 1, v: 1 },
          // spruce and rock along the top, east of the high bend
          { x: 572, y: 0, t: "rmspruce", s: 1 },
          { x: 616, y: 30, t: "rmspruce", s: 1.1 },
          { x: 660, y: -6, t: "rmspruce", s: 0.95 },
          { x: 196, y: 4, t: "rmrock", s: 0.9, v: 2 },
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
        coast: { edge: "top", from: 256, to: 502, depth: 280, sand: 18, ease: 62 },
        landings: [{ at: [6.4, 7.4], from: "top", put: [6.3, -1.6] }],
        // a skerry at the sound's mouth, ice and seals in its water
        rimeFloes: [
          { x: 332, y: 18, t: "skerry", s: 0.9 }, { x: 374, y: 110, t: "floe", s: 0.85 },
          { x: 310, y: 186, t: "seals", s: 0.85 },
        ],
        decorRecipe: { count: 34, types: ["rmspruce", "rmspruce", "rmrock", "rmtussock", "rmspruce"] },
        decor: [
          // ice crags flanking the sound's mouth
          { x: 192, y: -4, t: "rmicefall", s: 1, v: 1 },
          { x: 488, y: 0, t: "rmicefall", s: 0.95, v: 1 },
          // boats drawn up at the head of the sound, where the longships beach
          { x: 290, y: 294, t: "rmboat", s: 0.95, v: 0 },
          { x: 434, y: 290, t: "rmboat", s: 0.9, v: 1 },
          // the wolf-riders' muster below the road: their halls and racks
          { x: 260, y: 462, t: "rmlonghouse", s: 1, v: 0 },
          { x: 466, y: 466, t: "rmlonghouse", s: 1, v: 1 },
          { x: 364, y: 478, t: "rmrack", s: 0.95 },
          { x: 174, y: 436, t: "rmcairn", s: 0.9 },
          { x: 552, y: 434, t: "rmcairn", s: 0.85 },
          // spruce on the east shore's high ground and in the west
          { x: 610, y: 260, t: "rmspruce", s: 1.1 },
          { x: 648, y: 294, t: "rmspruce", s: 1 },
          { x: 664, y: 232, t: "rmspruce", s: 1.15 },
          { x: 624, y: 480, t: "rmspruce", s: 1 },
          { x: 668, y: 452, t: "rmspruce", s: 0.95 },
          { x: 0, y: 220, t: "rmspruce", s: 1.05 },
          { x: 32, y: 266, t: "rmspruce", s: 0.95 },
          { x: 78, y: 412, t: "rmrock", s: 1, v: 0 },
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
          { pts: [[3.4, -0.5], [3.1, 1.6], [3.0, 4.0], [3.4, 6.4], [4.8, 8.2], [6.3, 9.3], [6.8, 10.5]], w: 76, ws: [76, 54, 36, 30, 30, 34, 40] },
          // the east channel, meeting it below the island
          { pts: [[9.6, -0.5], [9.9, 1.6], [10.0, 4.0], [9.7, 6.4], [8.6, 8.2], [7.2, 9.3], [6.8, 10.5]], w: 76, ws: [76, 54, 36, 30, 30, 34, 40] },
        ],
        // ice the glacier calved, riding the channels down
        rimeFloes: [
          { x: 190, y: 6, t: "floe", s: 0.6 }, { x: 488, y: 34, t: "floe", s: 0.55 },
        ],
        decorRecipe: { count: 36, types: ["rmspruce", "rmrock", "rmspruce", "rmtussock"] },
        decor: [
          // the glacier's snout along the top: frozen falls where the two
          // channels pour out, ice crags across the island's head
          { x: 132, y: 0, t: "rmicefall", s: 1.1, v: 0 },
          { x: 546, y: 0, t: "rmicefall", s: 1.1, v: 0 },
          { x: 260, y: -2, t: "rmicefall", s: 1, v: 1 },
          { x: 340, y: -10, t: "rmicefall", s: 1.1, v: 1 },
          { x: 418, y: 0, t: "rmicefall", s: 0.95, v: 1 },
          { x: 300, y: 46, t: "rmrock", s: 0.9, v: 2 },
          // boulders the ice dropped at the island's foot
          { x: 362, y: 428, t: "rmrock", s: 0.95, v: 1 },
          // a spruce wood on the west bank
          { x: 0, y: 290, t: "rmspruce", s: 1.1 },
          { x: 42, y: 338, t: "rmspruce", s: 0.95 },
          { x: -4, y: 392, t: "rmspruce", s: 1.05 },
          { x: 72, y: 434, t: "rmspruce", s: 1 },
          { x: 26, y: 482, t: "rmspruce", s: 1.1 },
          { x: 112, y: 486, t: "rmspruce", s: 0.9 },
          // a steading on the east bank below the road, spruce above it
          { x: 596, y: 430, t: "rmlonghouse", s: 1, v: 1 },
          { x: 654, y: 472, t: "rmrack", s: 0.9 },
          { x: 664, y: 390, t: "rmspruce", s: 1 },
          { x: 560, y: 490, t: "rmspruce", s: 0.95 },
          { x: 606, y: 20, t: "rmspruce", s: 1 },
          { x: 662, y: 52, t: "rmspruce", s: 1.1 },
        ],
      },
    ),
    // COAST — LANDING
    sealrocks: rimeVariant(
      "sealrocks", "The Seal Rocks", "TWO COVES",
      "A raider beach split by the seal rocks into two coves, and the road comes down to both. Every landing picks one — and you won't know which until the sail is on the water.",
      20261210,
      [[0.9, 1.4], [3.0, 1.4], [3.0, 6.2], [6.0, 6.2], [6.0, 2.8], [9.4, 2.8], [9.4, 6.2], [12.3, 6.2], [12.3, 2.2], [13.7, 2.2]],
      {
        coast: { edge: "bottom", from: 30, to: 790, depth: 100, sand: 22 },
        // each cove's ship comes in from its own side of the bay
        landings: [{ at: [4.5, 6.2], from: "bottom", put: [2.2, 10.8] }, { at: [10.85, 6.2], from: "bottom", put: [13.2, 10.8] }],
        // the seal rocks: skerries and a seal colony off the headland
        rimeFloes: [
          { x: 392, y: 468, t: "seals", s: 1 }, { x: 344, y: 482, t: "skerry", s: 0.9 },
          { x: 438, y: 490, t: "skerry", s: 0.8 }, { x: 210, y: 488, t: "floe", s: 0.8 }, { x: 580, y: 480, t: "floe", s: 0.75 },
        ],
        decorRecipe: { count: 34, types: ["rmspruce", "rmrock", "rmtussock", "rmspruce"] },
        decor: [
          // the headland between the coves, the seals hauled out on it
          { x: 392, y: 378, t: "rmsealrock", s: 1 },
          { x: 364, y: 336, t: "rmrock", s: 0.9, v: 3 },
          // the raiders' old landing west of the first cove: a longship drawn
          // up, its fish rack and a whale's ribs
          { x: 64, y: 396, t: "rmlongship", s: 1, v: 1 },
          { x: 20, y: 340, t: "rmrack", s: 0.9 },
          { x: 654, y: 374, t: "rmwhale", s: 1, v: 0 },
          // spruce on the high ground north of the bay
          { x: 380, y: 20, t: "rmspruce", s: 1.05 },
          { x: 430, y: 52, t: "rmspruce", s: 0.95 },
          { x: 480, y: 8, t: "rmspruce", s: 1.1 },
          { x: 344, y: 72, t: "rmspruce", s: 0.9 },
          { x: 600, y: 0, t: "rmspruce", s: 1 },
          { x: 660, y: 30, t: "rmspruce", s: 1.05 },
        ],
      },
    ),
    // COAST
    saltreach: rimeVariant(
      "saltreach", "Saltreach", "THE REACH",
      "A long salt-white shore runs under the ice cliffs to the gate. The march starts dry in the snow; its last mile is the tideline — and the deep water off it is the kraken's.",
      20261211,
      [[0.9, 6.8], [2.6, 6.8], [2.6, 8.6], [9.8, 8.6], [9.8, 5.6], [4.6, 5.6], [4.6, 2.8], [13.7, 2.8]],
      {
        coast: { edge: "top", from: 330, to: 1100, depth: 120, sand: 30, ease: 200 },
        // bergs calved off the ice cliffs, out on the reach
        rimeFloes: [
          { x: 600, y: 2, t: "berg", s: 1 }, { x: 480, y: -10, t: "floe", s: 0.9 },
          { x: 684, y: 32, t: "floe", s: 0.8 }, { x: 540, y: 46, t: "seals", s: 0.8 },
        ],
        decorRecipe: { count: 36, types: ["rmrock", "rmspruce", "rmtussock", "rmrock"] },
        decor: [
          // the head of the strand: a fishers' landing, a whale's skull
          { x: 380, y: 76, t: "rmrack", s: 0.95 },
          { x: 430, y: 102, t: "rmboat", s: 0.9, v: 1 },
          { x: 320, y: 52, t: "rmwhale", s: 0.95, v: 1 },
          // the steading in the north-west, spruce round it
          { x: 110, y: 78, t: "rmlonghouse", s: 1, v: 0 },
          { x: 174, y: 132, t: "rmrack", s: 0.9 },
          { x: 0, y: 0, t: "rmspruce", s: 1.1 },
          { x: 52, y: 22, t: "rmspruce", s: 0.95 },
          { x: 210, y: 0, t: "rmspruce", s: 1 },
          { x: 6, y: 120, t: "rmspruce", s: 1.05 },
          // the ice cliffs along the south edge
          { x: 140, y: 496, t: "rmicefall", s: 1, v: 1 },
          { x: 290, y: 498, t: "rmicefall", s: 1.05, v: 0 },
          { x: 434, y: 496, t: "rmicefall", s: 0.95, v: 1 },
          { x: 650, y: 434, t: "rmicefall", s: 1.1, v: 0 },
          { x: 600, y: 486, t: "rmrock", s: 1, v: 2 },
          { x: 664, y: 340, t: "rmspruce", s: 1 },
        ],
      },
    ),
  };
}
