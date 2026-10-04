// ============ THE RIMEWATER'S BOARDS, PART A ============
// Five of the chapter's fifteen boards (levels-rime.js), made with
// rimeVariant (rime-ground.js); maps.js merges what this returns into REALMS.
// Each keeps the WATER KIND the continent map shows for its level
// (scripts/check-map-water.mjs): coast / river / ponds / dry, as noted.
// A coastal board marked LANDING beaches a longship mid-level: it needs a
// `landings` entry (engine/rime.js) on its strand, beside the road.
//
//   frostwake  THE COVE      (coast, LANDING) the chapter's first board: a
//                            plain road whose long middle leg skirts one
//                            sheltered cove; the ship beaches there, half the
//                            road from the gate, in full view of the fields
//                            above the leg — the landing taught on its own
//   skerryway  THE SHELF     (coast) the sea takes the north of the board; the
//                            road zigzags four times across the narrow shelf
//                            under it, every northern turn on the strand where
//                            the kraken hunts, the pockets alternately open to
//                            the sea and closed by a bend
//   icefjord   THE FJORD     (river) a glacier river runs west down the board
//                            between the first two lanes, a creek at its head
//                            and a broad fjord at its mouth: banks to build on
//                            in the east, water no hall bridges in the west,
//                            and the serpent swimming the whole of it
//   whalebone  TWO STRANDS   (coast, LANDING) the road comes down to the bay
//                            twice; a ship may beach on either strand, early
//                            or late, and the bone-strewn pocket between them
//                            is the one ground that watches both
//   frostmere  THE MERES     (ponds) black meres fill the inside of the road's
//                            bends, where the towers would stand: build on the
//                            outside, or row the meres with the River Watch;
//                            no sea, so no monsters and no ships
const at = (c, r, t, s = 1, dx = 0, dy = 0, v) => ({ x: Math.round(48 * c + 24 + dx), y: Math.round(48 * r + 24 + dy), t, s, ...(v != null ? { v } : {}) });

export default function rimeBoardsA(rimeVariant) {
  return {
    // ---- Frostwake Strand (COAST, LANDING) ----
    // Out of the fells, down to the shore, along the head of the cove and up
    // to the gate. The cove is the only sea on the board; its sand runs up to
    // the road's long middle leg, and that is where the longship grounds.
    frostwake: rimeVariant(
      "frostwake", "Frostwake Strand", "THE COVE",
      "The Rimewater's first shore. The road walks the head of a sheltered cove — and halfway along it the raiders' longship runs up the sand behind your first towers.",
      20261202,
      [[0.9, 2.9], [2.3, 2.9], [2.3, 0.9], [5.0, 0.9], [5.0, 4.4], [11, 4.4], [11, 1.8], [13.7, 1.8]],
      {
        coast: { edge: "bottom", from: 60, to: 770, depth: 180, sand: 24, ease: 190 },
        // the ship sails straight up the cove and grounds below the road
        landings: [{ at: [7.8, 4.4], from: "bottom", put: [7.6, 10.6] }],
        decor: [
          // the fishers' steading on the east headland over the cove
          at(12.5, 6.4, "rmlonghouse", 1.05, 0, 0, 1), at(13.25, 7.5, "rmrack", 1),
          at(13.3, 5.6, "rmspruce", 0.95), at(13.1, 8.5, "rmrock", 0.9, 0, 0, 1),
          // the west headland: spruce where the fells come down, a cairn
          at(0.4, 6.2, "rmspruce", 1.1), at(1.1, 6.9, "rmspruce", 0.95), at(0.3, 7.7, "rmspruce", 1),
          at(0.9, 8.7, "rmspruce", 0.9), at(1.7, 5.7, "rmrock", 1, 0, 0, 2), at(2.2, 6.5, "rmcairn", 0.9),
          // a rune stone where the road turns down to the shore
          at(1.1, 1.3, "rmrunestone", 1),
          // the open field above the cove: a stone or two, a few spruce
          at(6.6, 2.2, "rmrock", 0.85, 0, 0, 0), at(9.2, 0.9, "rmspruce", 1), at(9.75, 1.45, "rmspruce", 0.85),
          at(7.0, 0.45, "rmspruce", 0.95), at(0.5, 4.4, "rmspruce", 1), at(7.9, 2.9, "rmtussock", 1),
        ],
        decorRecipe: { count: 14, types: ["rmspruce", "rmspruce", "rmrock", "rmtussock", "rmspruce"] },
      },
    ),

    // ---- The Skerry Way (COAST) ----
    // The sea along the top; the land is a shelf under it, and the road
    // zigzags across the shelf four times on its way east.
    skerryway: rimeVariant(
      "skerryway", "The Skerry Way", "THE SHELF",
      "A shelf of land under a black sea. The road zigzags four times between strand and snowfield — every northern turn is on the beach, where the deep things hunt.",
      20261203,
      [[0.9, 4.6], [2.6, 4.6], [2.6, 8.4], [5.6, 8.4], [5.6, 4.6], [8.6, 4.6], [8.6, 8.4], [11.6, 8.4], [11.6, 4.6], [13.7, 4.6]],
      {
        coast: { edge: "top", from: 70, to: 700, depth: 192, sand: 24, ease: 210 },
        // the skerries the way is named for, out on the black water
        rimeFloes: [
          { x: 250, y: 46, t: "skerry", s: 1 }, { x: 352, y: 92, t: "seals", s: 1 }, { x: 420, y: 128, t: "seals", s: 0.85 },
          { x: 470, y: 40, t: "skerry", s: 0.9 }, { x: 560, y: 96, t: "floe", s: 0.9 }, { x: 170, y: 104, t: "floe", s: 0.8 },
        ],
        decor: [
          // the headland the road comes out of, west of the sea
          at(0.3, 2.3, "rmspruce", 1.1), at(1.0, 1.7, "rmspruce", 0.95), at(0.4, 1.0, "rmspruce", 1.05),
          at(1.5, 2.8, "rmrock", 1, 0, 0, 1),
          // the east headland by the gate: a longhouse and its fish rack
          at(12.6, 2.2, "rmlonghouse", 1), at(13.3, 3.3, "rmrack", 0.95), at(13.4, 0.8, "rmspruce", 1),
          // a boat drawn up by the longhouse
          at(12.0, 3.1, "rmboat", 0.95, 0, 0, 1),
          // the snowfield along the bottom
          at(4.1, 9.6, "rmspruce", 0.9), at(7.1, 9.5, "rmcairn", 0.85), at(10.1, 9.6, "rmspruce", 0.9),
        ],
        decorRecipe: { count: 12, types: ["rmspruce", "rmrock", "rmtussock", "rmspruce"] },
      },
    ),

    // ---- Ice-Fjord (RIVER) ----
    // The glacier stands off the top-right; its river comes down past the
    // gate's fields, under the road's one bridge, and widens west into the
    // fjord between the first lane and the second.
    icefjord: rimeVariant(
      "icefjord", "Ice-Fjord", "THE FJORD",
      "A glacier river runs west between the first two lanes — a creek at its head, a fjord at its mouth. Bank halls reach both lanes, and something long swims beneath them.",
      20261204,
      [[0.9, 1.0], [10.4, 1.0], [10.4, 6.0], [2.4, 6.0], [2.4, 8.7], [13.7, 8.7]],
      {
        rivers: [{
          pts: [[13.0, -0.6], [12.9, 1.4], [12.6, 2.7], [11.9, 3.3], [10.6, 3.5], [9.0, 3.45], [7.2, 3.2], [5.2, 3.65], [3.0, 3.3], [1.0, 3.55], [-0.7, 3.4]],
          ws: [20, 22, 26, 30, 34, 40, 48, 62, 78, 94, 100],
          w: 100,
        }],
        decor: [
          // the glacier's foot: the river comes out from under a frozen fall
          at(11.85, 0.15, "rmicefall", 1.1, 0, 0, 0), at(11.5, 1.9, "rmrock", 0.9, 0, 0, 2),
          // a steading on the east fields
          at(12.3, 5.0, "rmlonghouse", 1), at(12.95, 6.15, "rmrack", 0.95),
          at(13.2, 4.2, "rmspruce", 1), at(11.4, 6.7, "rmspruce", 0.9), at(13.2, 7.3, "rmspruce", 0.95),
          // the low field's west end
          at(0.6, 5.6, "rmspruce", 1.05), at(0.4, 6.6, "rmspruce", 0.95), at(1.1, 7.4, "rmrock", 0.9, 0, 0, 1),
          at(6.4, 7.35, "rmrunestone", 0.95),
        ],
        decorRecipe: { count: 14, types: ["rmspruce", "rmspruce", "rmrock", "rmtussock"] },
      },
    ),

    // ---- Whalebone Bay (COAST, LANDING) ----
    // The road comes down to the bay twice. Two strands, and a ship may run
    // up either: the west one under the road's head, the east one by its tail.
    whalebone: rimeVariant(
      "whalebone", "Whalebone Bay", "TWO STRANDS",
      "A whaling bay ribbed with old bones. The road comes down to the water twice, and a longship may beach on either strand — early behind your first towers, or late, near the gate.",
      20261205,
      [[0.9, 1.4], [3.2, 1.4], [3.2, 6.0], [6.0, 6.0], [6.0, 2.2], [9.4, 2.2], [9.4, 6.0], [11.8, 6.0], [11.8, 3.4], [13.7, 3.4]],
      {
        coast: { edge: "bottom", from: 40, to: 790, depth: 128, sand: 26, ease: 200 },
        // a strand under each shore leg; each landing wave takes one of them
        landings: [
          { at: [4.6, 6.0], from: "bottom", put: [5.4, 10.6] },
          { at: [10.6, 6.0], from: "bottom", put: [9.8, 10.6] },
        ],
        decor: [
          // the flensing strand in the pocket between the two shore legs
          at(7.7, 6.2, "rmwhale", 1.1, 0, 0, 0), at(7.0, 6.75, "rmwhale", 1, 0, 0, 1),
          // the whalers' longhouse on the east headland, its rack and a boat
          at(12.8, 6.6, "rmlonghouse", 1.05, 0, 0, 1), at(13.3, 5.4, "rmrack", 0.95), at(12.3, 7.85, "rmboat", 1),
          // the west shore below the first strand
          at(1.0, 7.6, "rmspruce", 1), at(0.4, 6.8, "rmspruce", 0.95), at(1.5, 8.4, "rmrock", 0.9, 0, 0, 3),
          // spruce up on the fells
          at(4.6, 0.4, "rmspruce", 1), at(5.2, 0.9, "rmspruce", 0.9), at(10.8, 0.6, "rmspruce", 1.05),
          at(12.6, 1.3, "rmspruce", 0.95), at(1.2, 3.4, "rmspruce", 1), at(0.6, 4.2, "rmspruce", 0.9),
          at(7.6, 1.0, "rmrock", 0.9, 0, 0, 0), at(13.2, 4.7, "rmskaldstone", 1),
        ],
        decorRecipe: { count: 14, types: ["rmspruce", "rmspruce", "rmrock", "rmtussock"] },
      },
    ),

    // ---- Frostmere (PONDS) ----
    // Black meres too deep to freeze, lying in the inside of the road's bends.
    frostmere: rimeVariant(
      "frostmere", "Frostmere", "THE MERES",
      "Black meres too deep to freeze lie in the crooks of the road, where towers would stand. Build on the outside of the bends — or put boats on the water.",
      20261206,
      [[0.9, 4.8], [3.2, 4.8], [3.2, 1.4], [7, 1.4], [7, 8.2], [10.8, 8.2], [10.8, 3.4], [13.7, 3.4]],
      {
        ponds: [
          // the north mere, in the crook of the road's first loop
          { x: 270, y: 196, w: 100, h: 112 },
          { x: 262, y: 268, w: 84, h: 64 },
          // the long mere in the crook of the second loop
          { x: 451, y: 246, w: 96, h: 120 },
          { x: 455, y: 330, w: 84, h: 82 },
          // a small one out on the south-west snowfield
          { x: 96, y: 412, w: 92, h: 48 },
        ],
        rimeFloes: false,   // too deep to freeze: black water, no ice on it
        decor: [
          at(0.4, 0.6, "rmspruce", 1.05), at(1.2, 0.3, "rmspruce", 0.9), at(0.6, 1.6, "rmrock", 0.9, 0, 0, 1),
          at(12.4, 0.6, "rmspruce", 1), at(13.1, 1.2, "rmspruce", 0.9), at(8.6, 0.4, "rmskaldstone", 1),
          at(12.6, 7.6, "rmspruce", 1), at(13.2, 8.4, "rmrock", 0.9, 0, 0, 2),
          at(4.8, 8.8, "rmspruce", 0.95), at(2.4, 8.2, "rmrunestone", 0.95), at(1.0, 9.0, "rmtussock", 1),
        ],
        decorRecipe: { count: 14, types: ["rmspruce", "rmspruce", "rmrock", "rmtussock"] },
      },
    ),
  };
}
