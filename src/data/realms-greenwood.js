// ============ MORE GREENWOOD REALMS ============
// Battlefields added to the vale when the chapter grew from eleven levels to
// fifteen (2026-10-03). maps.js calls this with its greenwoodVariant(...)
// helper (the vale's meadow, palette, water and light) and merges what it
// returns into REALMS, so this file never imports maps.js (no import cycle).
//
// Four boards that each ask something the first eleven don't:
//   gullwick     THE STRAND    the longest straight in the vale walks the beach:
//                              towers can stand on one side of it only, and the
//                              sea behind will float a River Watch
//   millrace     THE MILL      the road walks the mill island between the race
//                              and the Foxwater: water on both hands, and the
//                              footings are thin strips along the banks
//   thistlecrag  THE CRAGS     vertical switchbacks with a ridge of crags
//                              between every pair of lanes: the spots that
//                              would watch two lanes are mostly solid rock
//   kingstones   THE RING      the road loops round the stone ring and crosses
//                              its own track; the ring's heart watches the
//                              whole loop, and the stones leave room for little
// Each keeps the water the campaign map promises for it (a coast, a river,
// none, none) — scripts/check-map-water.mjs holds the two to each other.
//
// Hand-placed `decor` is in grid px (x = 48·col + 24, y = 48·row + 24, before
// the border); a decorRecipe's count INCLUDES the hand-placed pieces.

// a hand-placed piece at a grid position
const at = (c, r, t, s = 1, dx = 0, dy = 0) => ({ x: Math.round(48 * c + 24 + dx), y: Math.round(48 * r + 24 + dy), t, s });

// a ridge of crag down column c: crags and boulders zigzagging either side
// of the line, bigger mid-ridge and smaller at its ends, with heather in the
// clefts beside them, so it reads as one broken spine, never a stacked row
const RIDGE = ["ircrag", "rock", "ircrag", "ircrag", "rock", "ircrag", "rock", "ircrag"];
const ridge = (c, rows) => rows.flatMap((r, i) => {
  const t = RIDGE[(i * 3 + Math.round(c * 2)) % RIDGE.length];
  const k = Math.sin(c * 7.1 + r * 3.3), side = i % 2 ? 1 : -1;
  const end = Math.min(i, rows.length - 1 - i);   // 0 at the ridge's two ends
  const sz = (t === "rock" ? 1.2 : 1.0) + Math.min(end, 2) * 0.1 + 0.12 * Math.abs(k);
  const out = [at(c, r, t, sz, side * (5 + 4 * Math.abs(k)), 6 * k)];
  if (i % 3 === 1) out.push(at(c, r, "irheather", 0.9 + 0.2 * Math.abs(k), -side * 16, 4));
  return out;
});
// a drystone field wall along row r from column a to b, end to end
const wall = (a, b, r) => {
  const out = [];
  for (let c = a; c <= b + 1e-6; c += 0.56) out.push(at(c, r, "irwall", 1, 0, Math.sin(c * 2.3) * 2));
  return out;
};
// rows from a to b every `step`, leaving out the saddles (rows near `gaps`)
const span = (a, b, step, gaps = []) => {
  const out = [];
  for (let r = a; r <= b + 1e-6; r += step) if (!gaps.some((g) => Math.abs(r - g) < step * 0.9)) out.push(+r.toFixed(2));
  return out;
};

export default function moreGreenwoodRealms(greenwoodVariant) {
  return {
    // ---- Gullwick Sands ----
    // The road comes down out of the wood through the dunes, then walks the
    // strand for nine tiles with the sea at its back before it climbs inland
    // past the hamlet to the gate. Nothing stands on the sea side of the
    // strand but a sliver of beach; the dunes and the hamlet take the rest.
    gullwick: greenwoodVariant(
      "gullwick", "Gullwick Sands", "THE STRAND",
      "The vale's south shore. The road walks the strand for half a mile with the sea at its back — every tower faces it from the dunes, and the River Watch can row along behind it.",
      20261011,
      [[0.9, 1.2], [5.5, 1.2], [5.5, 3.8], [2.4, 3.8], [2.4, 6.6], [11.6, 6.6], [11.6, 3.2], [8.6, 3.2], [8.6, 1.2], [13.7, 1.2]],
      {
        coast: { edge: "bottom", from: 130, depth: 112, sand: 28 },
        // a bright sea-light, the shade gone out of the corners
        light: { tint: "250,240,214", amount: 0.09, vignette: 0.16 },
        // salt-bitten turf, a shade yellower than the vale's, thick with bent
        // grass, thrift and sea campion
        GRASS: "#8db35c", GRASS_DK: "#6d9343", GRASS_LT: "#acce74", TUFT: "#678a3d",
        scatter: { patches: 50, tufts: 150, flowers: 30, flowerCols: ["#e8a0b8", "#f0ece0", "#e0c070"] },
        decor: [
          // the hamlet on the last dune before the gate: the lookout, the
          // net-sheds (tents), a fish cart
          at(12.9, 3.9, "watchtower", 1.05),
          at(12.45, 3.15, "tent", 1), at(13.2, 3.0, "tent", 0.85), at(12.5, 4.45, "tent", 0.9),
          at(12.95, 5.0, "irwagon", 0.8),
          // a few stones and scrub on the dunes inside the loop
          at(6.9, 5.0, "rock", 1.1), at(7.4, 5.25, "rock", 0.75),
          at(4.2, 4.95, "pine", 0.95), at(4.7, 5.3, "pine", 0.8), at(9.8, 4.85, "pine", 0.9), at(10.3, 5.2, "tree", 0.8),
        ],
        decorRecipe: { count: 27, types: ["pine", "rock", "pine", "tree", "rock"] },
      },
    ),

    // ---- Millrace ----
    // The Foxwater runs down the middle of the board; the mill's race is cut
    // off it upstream (off the top of the board) and falls back in across
    // the island's foot. The road crosses the race onto the mill island,
    // walks it with water on both hands, crosses the race again, follows
    // the river's west bank down, crosses the river itself and climbs the
    // east bank to the gate.
    millrace: greenwoodVariant(
      "millrace", "Millrace", "THE ISLAND",
      "The Foxwater below the mere, and the mill's race beside it. The road walks the island between them with water on both hands — every footing is a riverbank.",
      20261012,
      [[0.9, 7.6], [3.0, 7.6], [3.0, 1.6], [7.2, 1.6], [7.2, 9.0], [11.6, 9.0], [11.6, 2.0], [13.7, 2.0]],
      {
        rivers: [
          // the Foxwater, listed first: the reach swimmers use
          { pts: [[9.6, -0.5], [9.0, 2.2], [9.6, 4.6], [9.1, 7.0], [9.5, 8.8], [9.2, 10.5]], w: 30 },
          // the race: in from upstream, turning the wheel, and falling back
          // into the river across the island's foot
          { pts: [[5.0, -0.5], [5.2, 2.4], [4.9, 4.4], [6.0, 5.7], [7.9, 6.4], [9.3, 7.3]], w: 18 },
        ],
        decor: [
          at(6.15, 3.4, "irwagon", 0.85),
          at(10.4, 3.3, "willow", 1), at(4.0, 5.6, "willow", 0.95), at(8.2, 0.6, "willow", 0.9), at(8.3, 7.6, "willow", 0.9),
        ],
        decorRecipe: { count: 20, types: ["tree", "willow", "tree", "pine", "rock", "tree"] },
      },
    ),

    // ---- Thistlecrag ----
    // Up the headland in four long switchbacks, a ridge of grey crag and
    // heather standing between each pair of lanes. Where the ridges break
    // there is a footing that watches two lanes; everywhere else a tower
    // watches one.
    thistlecrag: greenwoodVariant(
      "thistlecrag", "Thistlecrag", "THE CRAGS",
      "Grey crags on the vale's north-west headland. The road climbs it in long switchbacks, and a ridge of rock stands between every pair of lanes — only its gaps watch both.",
      20261013,
      [[2.0, 0.8], [2.0, 8.4], [5.0, 8.4], [5.0, 1.4], [8.0, 1.4], [8.0, 8.4], [11.0, 8.4], [11.0, 3.4], [13.7, 3.4]],
      {
        light: { tint: "226,232,236", amount: 0.1, vignette: 0.28 },
        GRASS: "#7aa456", GRASS_DK: "#5c8740", GRASS_LT: "#98bf68", TUFT: "#557d3a",
        // the wood the horde comes out of is thin pine and broken crag up here
        wood: { types: [["pine", 4], ["tree", 1.6], ["ircrag", 1.2]], depth: 0.8 },
        // the ridges: a crag every ~0.6 row, one saddle (a gap) in each
        decor: [
          ...ridge(3.5, span(1.2, 7.2, 0.62, [4.3])),
          ...ridge(6.5, span(2.5, 8.9, 0.62, [5.9])),
          ...ridge(9.5, span(1.2, 7.2, 0.62, [2.8])),
        ],
        decorRecipe: { count: 58, types: ["ircrag", "rock", "irheather", "pine", "rock", "ircrag", "tree"] },
      },
    ),

    // ---- The Kingstones ----
    // The road comes in across the down, loops south round the stone ring,
    // runs back north through its own crossroads and away along the top to
    // the gate. The ring's heart watches the whole loop; the stones take
    // nearly all the room in it.
    kingstones: greenwoodVariant(
      "kingstones", "The Kingstones", "THE RING",
      "A ring of standing stones on the high down. The road loops all the way round it and crosses its own track — the ring's heart watches the whole loop, if you can find room among the stones.",
      20261014,
      [[0.9, 4.6], [9.8, 4.6], [9.8, 8.2], [3.2, 8.2], [3.2, 1.6], [13.7, 1.6]],
      {
        // the high down: short sheep-bitten turf, a wide pale sky
        light: { tint: "244,240,220", amount: 0.08, vignette: 0.18 },
        GRASS: "#8ab65a", GRASS_DK: "#6a9442", GRASS_LT: "#a8d070", TUFT: "#5f8c3c",
        decor: [
          // the ring: nine stones round an ellipse at (6.5, 6.4)
          // (spaced by arc length, not angle, so the ends don't crowd)
          ...Array.from({ length: 9 }, (_, i) => {
            const t = (i / 9) * Math.PI * 2 + 0.35, a = t + 0.15 * Math.sin(2 * t);
            return at(6.5, 6.4, "rock", 1.08 + 0.22 * Math.abs(Math.sin(i * 2.7)), Math.cos(a) * 74, Math.sin(a) * 40);
          }),
          // field walls across the down, broken where the sheep go through
          ...wall(4.4, 6.0, 3.05), ...wall(7.0, 8.6, 3.0),
          ...wall(10.9, 13.3, 3.45), ...wall(10.9, 12.6, 7.25),
          // the long barrow of whoever raised the stones, and cairns by it
          at(12.0, 5.2, "fenbarrow", 1.05), at(11.0, 5.0, "cairn", 0.9), at(12.9, 8.6, "cairn", 0.85),
          // a hawthorn or two the wind has bent
          at(11.4, 9.0, "tree", 0.9), at(0.9, 6.9, "tree", 0.85),
        ],
        decorRecipe: { count: 52, types: ["irheather", "rock", "irheather", "tree", "cairn", "irheather", "pine"] },
      },
    ),
  };
}
