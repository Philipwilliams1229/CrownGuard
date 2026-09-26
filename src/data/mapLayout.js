// ============ THE CONTINENT'S LAYOUT ============
// Where everything sits on the campaign map: each chapter's coastline
// (`REGIONS`, an SVG path the map roughens) and each level's waypoint
// (`LEVEL_POS`), in the map's unit space (see ui/mapArt.js MAP). Kept apart
// from the levels themselves (campaign.js, levels-*.js) so the map can be
// re-laid without touching a level, and a level added without touching the
// map. A level with no position here isn't drawn on the map yet.
export const REGIONS = {
  greenwood: "M28,142 C18,116 14,88 20,62 C24,38 40,18 64,8 C88,-2 118,-8 146,-2 C172,4 192,20 192,44 C192,66 172,84 166,104 C158,124 176,140 160,162 C146,182 118,196 92,194 C64,192 40,178 28,142 Z",
  iron: "M218,126 C212,96 224,62 252,44 C272,31 300,26 320,36 C336,44 352,32 366,46 C384,64 394,90 386,118 C378,148 372,176 342,192 C312,208 262,206 236,184 C222,172 220,146 218,126 Z",
  hollow: "M236,-30 C230,-64 244,-96 274,-108 C298,-117 330,-118 352,-108 C372,-99 388,-84 392,-62 C396,-40 390,-18 372,-8 C352,2 320,4 292,0 C264,-4 240,-6 236,-30 Z",
};

export const LEVEL_POS = {
  gw1: [44, 168],
  gw2: [88, 146],
  foxmere: [106, 118],
  gw3: [52, 100],
  bramblewick: [38, 62],
  gw4: [104, 62],
  wolfrun: [76, 26],
  ravenscar: [124, 8],
  blackbriar: [168, 32],
  cinderholt: [156, 74],
  gw5: [146, 110],
  ir1: [232, 150],
  muster: [244, 112],
  ir2: [268, 186],
  ir3: [304, 140],
  ir4: [330, 86],
  undercliff: [356, 122],
  ir5: [352, 48],
  hl1: [368, -26],
  hl2: [310, -26],
  bellmarsh: [252, -26],
  hl3: [248, -88],
  hl4: [298, -70],
  hl5: [360, -86],
};
