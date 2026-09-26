// ============ MORE IRON REALMS ============
// Battlefields added to the chapter after the first set. maps.js calls this
// with its ironVariant(...) helper (the chapter's ground, palette, water
// and light) and merges what it returns into REALMS, so this file never
// imports maps.js (no import cycle).
//
// Four boards that each ask something the first seven don't:
//   gallowscross — the road crosses ITSELF: one crossroads, walked twice
//   kestrel      — the Marches' north shore: the sea along the top edge
//   coldwater    — two rivers meeting, and four bridges over them
//   crowstair    — a mountainside climbed in long SLANTED traverses
export default function moreIronRealms(ironVariant) {
  return {
    // ---- Gallows Cross ----
    // The column comes in along the middle of the board, loops north round
    // the gibbet field and comes back down straight through its own
    // crossroads. A tower at the cross shoots at the same army twice.
    gallowscross: ironVariant(
      "gallowscross", "Gallows Cross",
      "An old hanging crossroads on the border heath. The Kingdom's road loops round the gibbet and runs back through its own crossing — one army, both roads.",
      20260931,
      [[0.9, 5], [9, 5], [9, 2], [4, 2], [4, 8], [12, 8], [12, 3], [13.7, 3]],
      { decorRecipe: { count: 14, types: ["banner", "rock", "tree", "rock", "watchtower", "pine"] } },
    ),

    // ---- Kestrel Head ----
    // The Marches run down to the grey strait here. The road comes in along
    // the cliff-top, then turns its back on the sea and winds inland; the
    // sea along the top edge will float a River Watch.
    kestrel: ironVariant(
      "kestrel", "Kestrel Head",
      "A beacon on the headland over the grey strait. The road runs the cliff-top in the wind, then turns inland — and the sea will float a River Watch, if you moor one.",
      20260932,
      [[0.9, 2.6], [6, 2.6], [6, 5.2], [2, 5.2], [2, 8], [9, 8], [9, 3.2], [12, 3.2], [12, 6.2], [13.7, 6.2]],
      {
        coast: { edge: "top", from: 150, depth: 92, sand: 24 },
        light: { tint: "210,226,240", amount: 0.14, vignette: 0.3 },
        decorRecipe: { count: 13, types: ["rock", "rock", "watchtower", "pine", "rock", "banner"] },
      },
    ),

    // ---- Coldwater ----
    // The Coldwater comes down from the north and the Greywater in from the
    // west, and they meet mid-board. The road has to bridge them four times;
    // water walls in three sides of every build.
    coldwater: ironVariant(
      "coldwater", "Coldwater",
      "Where the Coldwater takes in the Greywater. Two rivers, four bridges, and the column crossing every one of them — moor a River Watch at the meeting of the waters.",
      20260933,
      [[0.9, 3], [4, 3], [4, 8.5], [12.5, 8.5], [12.5, 4], [7, 4], [7, 1.2], [13.7, 1.2]],
      {
        rivers: [
          // the Greywater: in from the west, running on under the Coldwater
          // so the main stream (drawn after it) covers the join. Listed
          // first, it is also the reach the River Watch's skiffs patrol.
          { pts: [[-0.5, 6.4], [3.5, 6.3], [7, 6.1], [9.75, 5.6]], w: 26 },
          // the Coldwater: north edge to south edge, the main stream
          { pts: [[10.3, -0.5], [10.1, 2.6], [9.7, 5.6], [9.9, 10.5]], w: 32 },
        ],
        decorRecipe: { count: 12, types: ["pine", "rock", "tree", "watchtower", "pine"] },
      },
    ),

    // ---- Crowstair ----
    // The mountain road the Kingdom cut down from the heights: three long
    // slanting traverses joined by hairpins. At each hairpin two traverses
    // run close; out at their far ends they are a long way apart.
    crowstair: ironVariant(
      "crowstair", "Crowstair",
      "The mountain road down from the heights, cut in three long slanting traverses. At every hairpin two of them run shoulder to shoulder — at the far ends, nothing reaches both.",
      20260934,
      [[0.9, 0.8], [12.3, 2.2], [12.3, 4.7], [1.8, 6.1], [1.8, 8.6], [13.7, 8.9]],
      {
        light: { tint: "212,222,238", amount: 0.14, vignette: 0.38 },
        decorRecipe: { count: 18, types: ["rock", "rock", "pine", "rock", "pine", "watchtower"] },
      },
    ),
  };
}
