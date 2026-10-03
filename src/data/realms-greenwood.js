// ============ MORE GREENWOOD REALMS ============
// Battlefields added to the vale when the chapter grew from eleven levels to
// fifteen (2026-10-03). maps.js calls this with its greenwoodVariant(...)
// helper (the vale's meadow, palette, water and light) and merges what it
// returns into REALMS, so this file never imports maps.js (no import cycle).
//
//   gullwick     THE SANDS     the vale's south shore: the sea along one edge
//   millrace     THE MILL      the Foxwater below the mere, a mill on its race
//   thistlecrag  THE CRAGS     the north-west headland's grey crags
//   kingstones   THE STONES    a ring of standing stones on the high down
// Each keeps the water the campaign map promises for it (a coast, a river,
// none, none) — scripts/check-map-water.mjs holds the two to each other.

export default function moreGreenwoodRealms(greenwoodVariant) {
  return {
    gullwick: greenwoodVariant(
      "gullwick", "Gullwick Sands", "THE SANDS",
      "The vale's south shore: dunes, a fishing hamlet, and the sea along the road's back.",
      20261011,
      [[0.9, 1.5], [6, 1.5], [6, 5], [10, 5], [10, 2], [13.7, 2]],
      { coast: { edge: "bottom", from: 40, depth: 96, sand: 26 } },
    ),
    millrace: greenwoodVariant(
      "millrace", "Millrace", "THE MILL",
      "The Foxwater below the mere, turning a mill on its way to the sea.",
      20261012,
      [[0.9, 2], [4, 2], [4, 7], [9, 7], [9, 3], [13.7, 3]],
      { rivers: [{ pts: [[6.5, -0.5], [6.6, 5], [6.4, 10.5]], w: 28 }] },
    ),
    thistlecrag: greenwoodVariant(
      "thistlecrag", "Thistlecrag", "THE CRAGS",
      "Grey crags on the vale's north-west headland.",
      20261013,
      [[0.9, 8], [4, 8], [4, 3], [8, 3], [8, 7], [11, 7], [11, 2], [13.7, 2]],
      { decorRecipe: { count: 24, types: ["rock", "rock", "pine", "rock", "tree"] } },
    ),
    kingstones: greenwoodVariant(
      "kingstones", "The Kingstones", "THE STONES",
      "A ring of standing stones on the high down.",
      20261014,
      [[0.9, 5], [3, 5], [3, 1.5], [11, 1.5], [11, 8], [5, 8], [5, 5.5], [13.7, 5.5]],
    ),
  };
}
