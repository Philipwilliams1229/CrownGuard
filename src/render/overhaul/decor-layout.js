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
