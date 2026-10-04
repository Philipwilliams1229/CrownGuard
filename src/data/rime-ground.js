// ============ THE RIMEWATER'S GROUND ============
// The helper every Rimewater board is made with (realms-rime-a/b/c.js): the
// chapter's ground, palette, water, light, gate and edge wood. maps.js builds
// it from REALMS.frostfang and hands it to the three board files, so none of
// them imports maps.js. The art is src/render/scenery-rime.js (RIME_ART):
//   groundArt "rime"  drifted snow, wind ripples, sastrugi, scoured black
//                     rock, frozen puddles, dead grass; old flagstones
//                     showing through the trodden track
//   spawn "rimegate"  a glacier wall on the spawn edge, the road coming out of
//                     a cleft through it, a carved clan gate in the mouth
//                     (left or top entries; worked out from the road)
//   wood              snow-laden spruce and black rock along the spawn edge
//   rimeFloes         pieces IN the water (see below); sown automatically
//   rimeVariant(id, name, tag, blurb, seed, path, extra)
// `extra` overrides anything (coast, rivers, ponds, landings, decor...);
// its `decor` is ADDED to the gate's two pieces, never replaces them.
// Weather comes from the chapter's plan (weather-plan.js: the blizzard, by
// the level's place in the chapter); a board need not set it.
//
// Pieces a board may place by hand (decor types; `v` picks the look):
//   rmspruce rmrock rmcairn rmrunestone rmskaldstone rmwhale (v0 ribs, v1
//   skull) rmboat rmlongship (v0 prow east, v1 west; hull ~10 below its feet:
//   put its feet on the sand line) rmrack (fish-drying) rmicefall (v0 frozen
//   waterfall, v1 ice crag) rmsealrock rmtussock rmlonghouse (smoke; v odd
//   mirrored). Footprints below.
// In the water: rimeFloes: [{ x, y, t, s, v }] in grid px on the waterline,
//   t "floe" | "berg" | "seals" | "skerry"; leave it out to have a few floes
//   sown in the sea or a big mere, `rimeFloes: false` for none.
import { addFootprints } from "./terrain.js";

// how wide each piece stands (blocking halls and grounding), at s = 1
addFootprints({
  rmspruce: 11, rmrock: 9, rmcairn: 7, rmrunestone: 7, rmskaldstone: 7, rmwhale: 16, rmboat: 12,
  rmlongship: 24, rmrack: 12, rmicefall: 15, rmsealrock: 12, rmtussock: 5, rmlonghouse: 22,
  // the gate: the near piece (sorting only) and the hall-blockers along the ice
  rmgate: 6, rmice: 16,
});

// The gate's pieces, from the road (grid px; the border adds MX/MY = 40):
// the near piece ("rmgate" v 9) 36 along the road and 40 to its right, so it
// sorts after the column in the cleft; "rmice" blockers along the glacier
// (scenery-rime.js: ice ~54 deep at the road (48 on a top entry), fading out ~80-165 either side)
// so no hall stands on the ice.
const B = 40;
const rimeGate = (path) => {
  const left = path[0][0] < 1.5, top = !left && path[0][1] < 1.5;
  if (!left && !top) return [];
  const g = (c) => c * 48 + 24;
  const sx = left ? -18 : g(path[0][0]), sy = left ? g(path[0][1]) : -18;
  const nx = g(path[1][0]), ny = g(path[1][1]);
  const l = Math.hypot(nx - sx, ny - sy) || 1, ux = (nx - sx) / l, uy = (ny - sy) / l;
  const out = [{ x: Math.round(sx + ux * 36 - uy * 40), y: Math.round(sy + uy * 36 + ux * 40), t: "rmgate", s: 1, v: 9 }];
  // the ice: e is depth from the board's edge (board px), s along it
  const e0 = (left ? sx : sy) + B, s0 = (left ? sy : sx) + B;
  const de = left ? ux : uy, ds = left ? uy : ux, slope = de > 0.1 ? ds / de : 0;
  const sR = s0 + (54 - e0) * slope, span = left ? 560 : 840;
  for (const [off, e] of [[64, 32], [94, 32], [124, 24]]) for (const sg of [-1, 1]) {
    const s = sR + sg * off;
    if (s < 10 || s > span - (left ? 10 : 110)) continue;
    out.push(left ? { x: e - B, y: Math.round(s - B), t: "rmice", s: 1 } : { x: Math.round(s - B), y: e - B, t: "rmice", s: 1 });
  }
  return out;
};

export const makeRimeVariant = (frostfang) => (id, name, tag, blurb, seed, path, extra = {}) => ({
  ...frostfang,
  id, name, tag, blurb, seed, path,
  tagColor: "#bfe4f2",
  ambient: "snow",
  groundArt: "rime",
  spawn: "rimegate",
  wood: { types: [["rmspruce", 5], ["rmrock", 1]], hem: false },
  // drifted snow: blue in its hollows, never grey
  GRASS: "#d4e0e8",
  GRASS_DK: "#a9bfd2",
  GRASS_LT: "#f0f6f9",
  TUFT: "#8a7646",
  // the trodden track: packed snow gone grey with the passing of feet
  PATH_MAIN: "#b0bec6",
  PATH_DK: "#8e9ea8",
  PATH_EDGE: "#566672",
  PEBBLE: "#dce6ea",
  // the beach: cold grey shingle (coast.js reads coastSand)
  coastSand: "#9fa5a8",
  // the cold sea: black-green, white-capped
  water: { deep: "#1f3a4a", edge: "#2c5266", shine: "#9cc8dc" },
  bridge: { kind: "stone", stone: "#9aa4ac", cope: "#c4ccd2", moss: "#6c7c84", lamp: "#ffd88a" },
  decorRecipe: { count: 14, types: ["rmspruce", "rmspruce", "rmrock", "rmspruce", "rmcairn", "rmrock", "rmtussock", "rmrunestone"] },
  ponds: [],
  weather: undefined,
  ...extra,
  decor: [...rimeGate(path), ...(extra.decor || [])],
});
