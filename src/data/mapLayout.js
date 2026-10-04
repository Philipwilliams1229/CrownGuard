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
// between them; on 2026-10-03 each chapter grew to fifteen, the coasts
// pushed out into new lobes (the vale's north-west headland and south-east
// lobe, the Marches' east coast and south lobe, the fen's west lobe and
// northern downs). Waypoints of the vale sit ~60-70 units apart; keep new
// ones at least ~45 from their neighbours and ~30 from a coast (unless
// coastal: then within ~24 of it). The painted coast wanders up to ~20 units
// either side of these paths (mapArt.js warps it with noise), so a river
// meant to reach the sea should run a little past its path.
export const REGIONS = {
  greenwood: "M48,241 C43,229 40,219 37,208 C34,197 32,185 31,173 C30,162 30,150 30,139 C30,128 32,116 32,105 C32,94 31,83 30,72 C29,61 27,49 28,38 C29,27 30,15 34,4 C38,-7 43,-19 50,-30 C57,-41 68,-53 78,-62 C88,-71 100,-80 112,-84 C124,-88 137,-89 148,-86 C159,-83 169,-74 176,-66 C183,-58 188,-47 192,-38 C197,-29 198,-19 203,-14 C208,-9 215,-9 222,-7 C230,-5 239,-5 248,-3 C258,0 270,4 279,8 C288,13 297,18 304,24 C311,31 316,39 320,47 C324,56 326,66 326,75 C326,84 324,93 321,102 C318,111 313,119 308,127 C303,135 297,144 293,152 C289,160 284,169 282,177 C280,185 279,193 279,201 C279,209 281,217 282,225 C284,233 285,242 288,250 C291,259 295,267 298,276 C301,285 305,295 306,304 C307,313 308,323 306,332 C304,341 301,352 296,360 C291,368 283,377 274,382 C265,387 253,392 242,392 C231,392 219,388 210,382 C201,376 194,362 186,354 C178,346 171,339 160,334 C149,329 133,328 122,323 C111,319 101,314 92,307 C83,300 74,292 67,281 C60,270 53,253 48,241 Z",
  iron: "M394,253 C393,240 391,223 392,208 C394,193 397,178 403,164 C409,150 416,136 426,124 C436,112 450,101 461,93 C472,85 482,81 493,77 C504,73 516,70 527,68 C538,67 550,67 561,68 C572,70 584,75 593,77 C602,80 608,82 616,83 C624,84 632,83 640,83 C648,83 654,82 662,84 C670,86 677,92 686,96 C695,100 704,106 714,110 C724,114 736,117 746,122 C756,127 767,131 776,138 C785,145 794,155 800,166 C806,177 810,191 812,204 C814,217 812,232 810,246 C808,260 803,275 798,288 C793,301 786,314 778,324 C770,334 759,342 748,348 C737,354 723,358 712,362 C701,366 689,368 680,374 C671,380 666,388 660,396 C654,404 652,415 646,424 C640,433 634,443 626,452 C618,461 609,470 598,476 C587,482 573,488 560,490 C547,492 532,492 520,490 C508,488 496,483 486,476 C476,469 469,459 462,448 C455,437 451,424 446,412 C441,400 436,389 430,378 C425,367 418,355 413,344 C409,334 406,325 403,315 C400,305 399,294 397,284 C396,274 395,266 394,253 Z",
  // zone IV (2026-10-04): north across the water from the Hollowfen. A
  // first pass: the continent artist shapes the real coast.
  rime: "M300,-330 C313,-320 337,-319 360,-318 C383,-317 413,-325 440,-325 C467,-325 493,-318 520,-318 C547,-317 573,-322 600,-322 C627,-322 657,-316 680,-318 C703,-320 725,-325 740,-335 C755,-345 766,-362 770,-380 C774,-397 769,-420 765,-440 C761,-460 751,-480 745,-500 C739,-520 741,-544 730,-560 C719,-576 702,-589 680,-596 C658,-603 627,-603 600,-604 C573,-605 547,-601 520,-600 C493,-599 465,-600 440,-598 C415,-595 392,-592 370,-585 C348,-578 325,-569 310,-555 C295,-541 285,-519 280,-500 C275,-481 277,-460 278,-440 C279,-420 281,-398 285,-380 C289,-362 288,-340 300,-330 Z",
  hollow: "M352,-38 C344,-41 333,-34 324,-36 C315,-38 304,-42 296,-48 C288,-54 281,-63 276,-72 C271,-81 268,-93 268,-104 C268,-115 270,-127 274,-138 C278,-149 284,-159 292,-168 C300,-177 309,-185 320,-192 C331,-199 343,-204 356,-208 C369,-212 386,-211 400,-216 C414,-221 427,-229 440,-236 C453,-243 463,-254 476,-260 C489,-266 502,-271 516,-274 C530,-277 545,-278 560,-278 C575,-278 591,-277 604,-274 C617,-271 630,-268 640,-262 C650,-256 659,-247 666,-238 C673,-229 678,-218 684,-208 C690,-198 698,-187 704,-176 C710,-165 716,-154 721,-144 C726,-134 732,-124 734,-114 C737,-103 737,-91 736,-81 C735,-70 733,-60 729,-51 C725,-42 719,-32 712,-25 C705,-17 697,-11 685,-6 C674,-1 658,3 643,6 C628,9 611,12 594,13 C577,14 559,15 541,14 C524,14 506,12 489,10 C472,8 455,7 440,4 C425,2 410,-1 398,-5 C386,-9 378,-14 370,-20 C362,-25 360,-35 352,-38 Z",
};

export const LEVEL_POS = {
  gw1: [75, 286],
  gw2: [150, 248],
  gullwick: [281, 354],
  millrace: [240, 296],
  foxmere: [180, 201],
  gw3: [88, 170],
  bramblewick: [65, 105],
  gw4: [177, 105],
  wolfrun: [129, 44],
  thistlecrag: [72, 8],
  kingstones: [130, -50],
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
  brinewick: [500, 462],
  ironmouth: [553, 450],
  gallowscross: [525, 318],
  ir3: [562, 280],
  kestrel: [505, 86],
  ir4: [606, 166],
  coldwater: [635, 330],
  crowstair: [686, 282],
  wardenmoor: [760, 298],
  blackcliff: [790, 212],
  undercliff: [668, 205],
  ir5: [656, 100],
  // the fen: over the strait, west along the south shore, north past the
  // Stillmere, east along the drowned north, and down to the Throne
  hl1: [675, -42],
  saltgrave: [612, -2],
  hl2: [533, -42],
  bellmarsh: [391, -42],
  lanternfen: [318, -78],
  abbeymere: [332, -150],
  stillmere: [450, -108],
  hl3: [396, -158],
  drownholm: [455, -175],
  barrowdowns: [505, -238],
  hl4: [503, -130],
  reedmaze: [560, -128],
  lichgate: [600, -175],
  deadweir: [634, -232],
  hl5: [655, -162],
  // the Rimewater: landfall on the east, west along the south shore, north
  // past the snowfields, east along the north coast to the Jarl's fjord
  frostwake: [690, -370],
  skerryway: [620, -345],
  icefjord: [555, -385],
  whalebone: [490, -350],
  frostmere: [420, -385],
  runestead: [355, -360],
  wolfsound: [325, -430],
  glacierfoot: [395, -460],
  sealrocks: [470, -440],
  saltreach: [545, -470],
  bergwater: [615, -445],
  drakesfell: [690, -490],
  krakenfirth: [625, -550],
  skaldhold: [545, -560],
  jarlsfjord: [455, -555],
};
