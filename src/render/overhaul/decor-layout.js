// The overhaul's farm on Millrace: WHERE every piece stands (art/briefs/overhaul-build-millrace.md, B4).
// Pure data (no canvas, no render imports) so a node script can check it against the road, the water and
// the board's DECOR. Board units; (x, y) is each piece's FOOT (where it meets the ground). The approved
// picture is concept/overhaul2-decor-gw.js OPTIONS2.mr.farm (crop [320, 0]: board = lx + 320, ly);
// moved from it: the barn 4 and the farmhouse 10 west, its water butt dropped (the board's DECOR rock at
// 628,45 stands by its east gable), the
// haystacks into a stackyard round that rock (they stood out on the open ground east of it, which is
// hall ground by the road's last corner), the washing and the yard lamp nearer the yard, the woodpile off
// the bank; dropped: the long paddock fence east of the haystacks (hall ground), the deer (B3's wildlife).
//
// kinds: house (o = the kit's house() options), henhouse, well, haystack (r), hen (seed, col), cat,
// washing, woodpile, lamp (h), fence (pts in ART px from (x, y), as the concept's fenceRun), rock (s, fam,
// seed), smoke (dx, dy from its house's foot: the chimney's top). mirror: false = never mirrored under an
// eastern sun (a fence run's anchor is its first post: mirroring would swing the run the other way).

export const FARM = [
  { k: "house", id: "barn", x: 564, y: 44, o: { hw: 30, wall: 28, apex: 26, D: 36, roof: "thatch", walls: "boards", door: [-8, 16, 20, "hole"], windows: [], gableWin: false, chim: false, seed: 9 } },
  { k: "house", id: "farmhouse", x: 600, y: 58, o: { hw: 32, wall: 24, apex: 22, D: 30, roof: "tile", frame: true, door: [5, 8, 13, "doorR"], windows: [[-25, -17, 8, 7, { box: true }], [19, -17, 7, 7]], lamps: [[-2, -18, -1]], butt: false, chim: 10, seed: 6 } },
  { k: "smoke", of: "farmhouse", dx: 5, dy: -40 },
  { k: "henhouse", x: 552, y: 76 },
  { k: "well", x: 586, y: 84 },
  { k: "woodpile", x: 553, y: 60 },
  { k: "hen", x: 562, y: 82, seed: 0 }, { k: "hen", x: 571, y: 87, seed: 1 }, { k: "hen", x: 578, y: 81, seed: 2, col: "henB" },
  { k: "hen", x: 597, y: 89, seed: 3 }, { k: "hen", x: 566, y: 90, seed: 4, col: "henR" },
  { k: "cat", x: 597, y: 66 },
  // the kitchen garden, fenced, its gate toward the yard (the plot itself is a ground mark)
  { k: "fence", x: 549, y: 96, pts: [[0, 0], [60, 0], [60, 26], [0, 26], [0, 0]], gate: [0, 0.6, 0.85], h: 8, seed: 8, mirror: false },
  { k: "washing", x: 603, y: 106 },
  { k: "lamp", x: 621, y: 96, h: 20 },
  // the stackyard round the board's own rock (628,45: a DECOR piece, re-sculpted by decor.js)
  { k: "haystack", x: 643, y: 31, r: 11, seed: 2 }, { k: "haystack", x: 657, y: 41, r: 8, seed: 3 }, { k: "haystack", x: 646, y: 56, r: 10, seed: 4 },
  // a small granite group in the far field corner (the concept's, 0.6 scale), clear of the castle band
  { k: "rock", x: 694, y: 246, s: 42, fam: "granite", seed: 43 }, { k: "rock", x: 714, y: 250, s: 18, fam: "granite", seed: 44 },
  { k: "rock", x: 676, y: 251, s: 10, fam: "granite", seed: 45 }, { k: "rock", x: 723, y: 254, s: 7, fam: "granite", seed: 46 },
];

// the ground the farm takes (halls are refused inside; the lead puts these in the realm's `blocks`)
export const FARM_BLOCKS = [
  { x: 582, y: 70, rx: 45, ry: 44 },   // the farmhouse, barn, hen house, well, yard, garden, washing, yard lamp
  { x: 650, y: 42, rx: 19, ry: 18 },   // the stackyard (the DECOR rock at 628,45 has its own footprint)
  { x: 700, y: 249, rx: 28, ry: 9 },   // the granite group
];

// the ground marks: trodden yard, the path to the road, the garden plot (board units; sizes in ART px as
// the concept's worn / path / plot take them)
export const MARKS = {
  yard: { x: 588, y: 62, rx: 46, ry: 14, seed: 4, k: 2.2 },
  stack: { x: 649, y: 44, rx: 26, ry: 16, seed: 9, k: 1.6 },
  path: { pts: [[610, 72], [622, 84], [630, 98], [634, 110]], w: 5, seed: 5 },
  plot: { x: 551, y: 98, w: 56, h: 22, seed: 3 },
};

// ======================================================================================================
// THE GREENWOOD ROLL-OUT (art/briefs/overhaul-greenwood-rollout.md): one layout per realm that has a place.
// Every other overhaul board has only its rocks re-sculpted (decor.js owns every DECOR `rock`).
//   pieces: as FARM above, plus: chapel (the approved roofless chapel, concept round 3), wall (a drystone
//           run, pts in ART px from (x, y), as the concept's dryWall), stile.
//   marks:  ground marks [{ m: "worn" | "path" | "plot", ... }] (sizes in ART px as the concept's helpers)
//   own:    DECOR types this realm's look redraws ({ type: { k, ...opts } }), e.g. Gullwick's watchtower as
//           the approved ruin (A's old tower, concept round 3); the piece keeps its DECOR spot and footprint
//   blocks: ellipses where halls may not be built (the lead copies them into the realm's `blocks`)
// ======================================================================================================
const marksOf = (M) => [
  { m: "worn", ...M.yard }, { m: "worn", ...M.stack }, { m: "path", ...M.path }, { m: "plot", ...M.plot },
];
export const LAYOUTS = {
  millrace: { pieces: FARM, marks: marksOf(MARKS), blocks: FARM_BLOCKS },

  // GULLWICK: the fishing hamlet keeps TODAY's cottage (690,198), creels, net rack and boats; round them the
  // approved village details: a fenced kitchen garden before the cottage, the well, hens and the cat in the
  // yard, washing between the creels and the tower, a woodpile against the castle side, lanterns at the
  // cottage door, by the net rack and on the strand; the old watchtower (686,285) drawn as the approved ruin.
  gullwick: {
    pieces: [
      { k: "fence", x: 668, y: 214, pts: [[0, 0], [44, 0], [44, 18], [0, 18], [0, 0]], gate: [0, 0.55, 0.85], h: 8, seed: 21, mirror: false },
      { k: "well", x: 722, y: 222 },
      { k: "woodpile", x: 719, y: 196 },
      { k: "lamp", x: 709, y: 208, h: 18 },
      { k: "hen", x: 700, y: 230, seed: 0 }, { k: "hen", x: 708, y: 236, seed: 1, col: "henB" }, { k: "hen", x: 694, y: 240, seed: 2 },
      { k: "hen", x: 714, y: 228, seed: 3, col: "henR" },
      { k: "cat", x: 703, y: 214 },
      { k: "washing", x: 709, y: 262 },
      { k: "lamp", x: 703, y: 338, h: 20 },
      { k: "lamp", x: 697, y: 380, h: 18 },
    ],
    marks: [
      { m: "worn", x: 704, y: 226, rx: 36, ry: 11, seed: 14, k: 2 },
      { m: "path", pts: [[700, 236], [698, 262], [700, 300], [698, 330], [694, 370]], w: 4, seed: 15 },
      { m: "plot", x: 669, y: 216, w: 42, h: 14, seed: 16 },
    ],
    own: { watchtower: { k: "tower", r: 16, h: 88, seed: 12, foot: 8 } },
    blocks: [
      { x: 700, y: 222, rx: 33, ry: 16 },   // the garden, the well, the yard
      { x: 709, y: 262, rx: 16, ry: 5 },    // the washing line
    ],
  },

  // THE GREENWOOD (gw1): THE CROFT, the concept's variation 1 made compact, in the open top-right corner
  // (the road's nearest point ~60 off): one thatched cottage, its fenced garden, the well, a haystack, hens,
  // the cat, washing, a woodpile and the cottage's own lantern and smoke.
  greenwood: {
    pieces: [
      { k: "house", id: "croft", x: 668, y: 46, o: { hw: 30, wall: 24, apex: 22, D: 30, roof: "thatch", frame: true, door: [5, 8, 13, "door"], windows: [[-24, -16, 8, 7, { shutter: "door", box: true }], [17, -16, 7, 7, { box: true }]], lamps: [[-2, -17, -1]], butt: true, chim: -10, seed: 5 } },
      { k: "smoke", of: "croft", dx: -5, dy: -38 },
      { k: "henhouse", x: 704, y: 38 },
      { k: "well", x: 646, y: 62 },
      { k: "haystack", x: 721, y: 36, r: 10, seed: 6 },
      { k: "woodpile", x: 634, y: 40 },
      { k: "fence", x: 666, y: 66, pts: [[0, 0], [52, 0], [52, 20], [0, 20], [0, 0]], gate: [0, 0.15, 0.4], h: 8, seed: 31, mirror: false },
      { k: "hen", x: 690, y: 54, seed: 0 }, { k: "hen", x: 700, y: 50, seed: 1, col: "henR" }, { k: "hen", x: 684, y: 58, seed: 2, col: "henB" },
      { k: "cat", x: 655, y: 50 },
      { k: "washing", x: 696, y: 18 },
    ],
    marks: [
      { m: "worn", x: 676, y: 54, rx: 40, ry: 9, seed: 24, k: 2 },
      { m: "path", pts: [[650, 66], [644, 80], [640, 94]], w: 4, seed: 25 },
      { m: "plot", x: 667, y: 68, w: 50, h: 16, seed: 26 },
    ],
    blocks: [{ x: 676, y: 58, rx: 48, ry: 28 }],
  },

  // BRAMBLEWICK: THE STEADING, a different farm: an ochre thatched farmhouse and a boarded, slate-roofed byre
  // below the big oak (684,468) with its two haystacks, round a yard: the hen house, the well, hens, the cat, washing, a yard
  // lamp; in the open bottom-right (the road ~60 off).
  bramblewick: {
    pieces: [
      { k: "house", id: "byre", x: 686, y: 530, o: { hw: 28, wall: 24, apex: 22, D: 34, roof: "slate", walls: "boards", door: [-7, 14, 18, "hole"], windows: [], gableWin: false, chim: false, seed: 11 } },
      { k: "house", id: "steading", x: 620, y: 468, o: { hw: 28, wall: 22, apex: 20, D: 28, roof: "thatch", walls: "ochre", door: [3, 7, 12, "door"], windows: [[-20, -16, 7, 6, { box: true }], [14, -15, 6, 6]], lamps: [[-2, -16, -1]], bench: -24, chim: -8, seed: 4 } },
      { k: "smoke", of: "steading", dx: -4, dy: -36 },
      { k: "henhouse", x: 592, y: 486 },
      { k: "well", x: 644, y: 492 },
      { k: "haystack", x: 718, y: 514, r: 9, seed: 7 }, { k: "haystack", x: 725, y: 532, r: 7, seed: 8 },
      { k: "hen", x: 604, y: 494, seed: 0 }, { k: "hen", x: 616, y: 498, seed: 1, col: "henB" }, { k: "hen", x: 628, y: 492, seed: 2 }, { k: "hen", x: 598, y: 502, seed: 4, col: "henR" },
      { k: "cat", x: 644, y: 472 },
      { k: "washing", x: 632, y: 516 },
      { k: "lamp", x: 662, y: 498, h: 20 },
      { k: "woodpile", x: 650, y: 452 },
    ],
    marks: [
      { m: "worn", x: 646, y: 482, rx: 44, ry: 12, seed: 34, k: 2.2 },
      { m: "worn", x: 704, y: 528, rx: 30, ry: 10, seed: 35, k: 1.6 },
      { m: "path", pts: [[612, 504], [596, 520], [584, 534]], w: 4, seed: 36 },
    ],
    blocks: [{ x: 636, y: 478, rx: 48, ry: 26 }, { x: 704, y: 526, rx: 30, ry: 14 }],
  },

  // FOXMERE: the approved roofless chapel (round 3: west gable and bellcote one wall, the yew, two headstones)
  // in the open top band, a short drystone wall with a stile west of it (the oak at 113,34 hides any longer run; three birches stand east); a ruin, so no lived-in light (its door
  // lantern and sill candle are the chapel's own, lit at night).
  foxmere: {
    pieces: [
      { k: "chapel", x: 190, y: 50, seed: 41 },
      { k: "stile", x: 140, y: 61 },
      { k: "wall", x: 146, y: 61, pts: [[0, 0], [20, 1], [36, 3]], hgt: 10, seed: 4, mirror: false },
    ],
    marks: [{ m: "worn", x: 188, y: 54, rx: 22, ry: 6, seed: 44, k: 1.4 }],
    blocks: [{ x: 196, y: 44, rx: 30, ry: 18 }, { x: 152, y: 62, rx: 16, ry: 5 }],
  },
};
