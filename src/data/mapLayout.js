// ============ THE CONTINENT'S LAYOUT ============
// Where everything sits on the campaign map: each chapter's coastline
// (`REGIONS`, an SVG path the map roughens) and each level's waypoint
// (`LEVEL_POS`), in the map's unit space (see ui/mapArt.js MAP). Kept apart
// from the levels themselves (campaign.js, levels-*.js) so the map can be
// re-laid without touching a level, and a level added without touching the
// map. A level with no position here isn't drawn on the map yet.
//
// The continent was laid out again (2026-09-25) about 1.9x larger than the
// first map, so the march feels like a journey: the vale 1.7x, the Marches
// ~2x and the fen ~2.2x, each big enough for eleven stops with country
// between them. Waypoints of the vale sit ~60-70 units apart; keep new ones
// at least ~45 from their neighbours and ~30 from a coast (unless coastal).
export const REGIONS = {
  greenwood: "M48,241 C31,197 24,150 34,105 C41,65 68,31 109,14 C150,-3 201,-14 248,-3 C292,7 326,34 326,75 C326,112 292,143 282,177 C269,211 299,238 272,275 C248,309 201,333 156,330 C109,326 68,303 48,241 Z",
  iron: "M394,253 C383,194 406,128 461,93 C500,67 554,58 593,77 C624,93 656,69 683,97 C718,132 737,182 722,237 C706,295 695,350 636,381 C578,412 480,409 429,366 C402,342 398,292 394,253 Z",
  hollow: "M351,-50 C337,-118 371,-182 444,-206 C503,-224 582,-226 636,-206 C685,-188 724,-158 734,-114 C743,-70 729,-26 685,-6 C636,14 557,18 489,10 C420,2 361,-2 351,-50 Z",
};

export const LEVEL_POS = {
  gw1: [75, 286],
  gw2: [150, 248],
  foxmere: [180, 201],
  gw3: [88, 170],
  bramblewick: [65, 105],
  gw4: [177, 105],
  wolfrun: [129, 44],
  ravenscar: [211, 14],
  blackbriar: [286, 54],
  cinderholt: [265, 126],
  gw5: [248, 187],
  // the Marches: in from the isthmus, south to Stonewatch, across the Iron
  // river, up to the north shore, then down the eastern peaks and back north
  // to the Citadel
  ir1: [422, 299],
  muster: [445, 225],
  ir2: [486, 366],
  gallowscross: [525, 318],
  ir3: [562, 280],
  kestrel: [505, 86],
  ir4: [606, 166],
  coldwater: [635, 330],
  crowstair: [686, 282],
  undercliff: [668, 205],
  ir5: [656, 100],
  // the fen: over the strait, west along the south shore, north past the
  // Stillmere, east along the drowned north, and down to the Throne
  hl1: [675, -42],
  saltgrave: [612, -2],
  hl2: [533, -42],
  bellmarsh: [391, -42],
  stillmere: [450, -108],
  hl3: [396, -158],
  drownholm: [455, -175],
  hl4: [503, -130],
  reedmaze: [560, -128],
  lichgate: [600, -175],
  hl5: [655, -162],
};
