// ============ OVERHAUL CONCEPT, ROUND 2: WATER (option A "cut into the land", made ready to build) ============
// Brief: art/briefs/overhaul-round2.md (+ overhaul-concepts.md). Notes: concept/overhaul2-water.md.
// Lab: /overhaul2-water.html?scene=<name>&save=1 -> .shots/ovh2_water_<name>.png
//
// HOW A PANEL IS MADE (the real board, only its water replaced):
//   1. the engine runs the board (halls placed, a wave walking) with its rivers / ponds intact;
//   2. RIVERS / PONDS are emptied, then draw() renders it twice: A = everything, B = no halls, figures,
//      trees or bridges. B is the bare ground and road with NO old water;
//   3. the new water is painted over B (a signed-distance field per river / lake: + on land, - in water,
//      its normal, its distance along the flow, and an EDGE KIND per bank stretch);
//   4. every pixel where A differs from B (halls, figures, trees, the bridge) is laid back on top; where the
//      difference is only a darkening (a cast shadow) the new water under it is darkened by the same ratio.
// Everything is at the board's art scale: 1 canvas px = 1 art px = half a board unit.

import { selectRealm } from "/src/data/maps.js";
import { selectFaction } from "/src/data/factions.js";
import { setWaveWindow } from "/src/data/waves.js";
import { nearestOnPath } from "/src/engine/path.js";
import { updateGame } from "/src/engine/update.js";
import { placeTower, upgradeTower, buildableAt, startWave } from "/src/engine/actions.js";
import { draw } from "/src/render/draw.js";
import { setLevelWeather } from "/src/engine/weather.js";
import { setDay, DAY } from "/src/data/sun.js";
import { RIVERS, PONDS, BRIDGES, DECOR } from "/src/data/terrain.js";
import { PATH_HALF } from "/src/data/constants.js";

// ---------------- small kit ----------------
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const pal = (...a) => a.map(hex);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hs = (x, y, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
};
const vn = (x, y, s = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hs(xi, yi, s), b = hs(xi + 1, yi, s), c = hs(xi, yi + 1, s), d = hs(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
// ---- LOOPS (round 3, art/briefs/overhaul-animation.md): t is 0..1 over one seamless loop of LF frames ----
const TAU = Math.PI * 2;
let LF = 30;                     // frames in the loop being drawn (whole-pixel steps are px a frame x LF)
// a noise field drifting (ka, kb) noise cells over one loop, seamless at t = 1: two copies a loop apart
// cross-faded, the contrast held up mid-loop so thresholds keep their coverage
const vl = (a, b, s, ka, kb, t) => {
  const n1 = vn(a + t * ka, b + t * kb, s), n2 = vn(a + (t - 1) * ka, b + (t - 1) * kb, s);
  const w1 = 1 - t, w2 = t; return 0.5 + (n1 * w1 + n2 * w2 - 0.5) / Math.sqrt(w1 * w1 + w2 * w2);
};
// value noise that repeats every P cells along x (for strips that scroll a whole period a loop)
const vnp = (x, y, s, P) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const x0 = ((xi % P) + P) % P, x1 = (x0 + 1) % P;
  const a = hs(x0, yi, s), b = hs(x1, yi, s), c = hs(x0, yi + 1, s), d = hs(x1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
// a strip scrolled `step` whole art px a frame: its period is step x LF px; returns the coordinate in cells
// (cell ~ `cell` px) and the period in cells, for vnp
const scroll = (s, t, step, cell) => { const P = Math.max(1, step) * LF, n = Math.max(2, Math.round(P / cell)); return [(s - Math.round(t * LF) * Math.max(1, step)) / (P / n), n]; };

// ---------------- palettes (A's water, which the owner chose, kept) ----------------
const WA = pal("#18384a", "#1f4a5a", "#28606c", "#33787c", "#46908a", "#68aa98", "#96c6ac");
const FOAM = hex("#f2f4e6"), FOAM2 = hex("#cfe2da");
const EARTH = pal("#3a2618", "#573a25", "#74503a", "#916a46", "#ae885a", "#c8a674");
const CLAY = pal("#6e5a44", "#8c765a", "#a89070");
const GRAVEL = pal("#5e584c", "#7a7464", "#988f7c", "#b6ac94", "#d4cab0");
const SAND = pal("#9a845e", "#b49c70", "#ccb486", "#e0cc9e", "#ece0bc");
const STONE = pal("#4a4842", "#666258", "#847e70", "#a49c8a", "#c4bca6", "#ddd6c0");
const TURF = pal("#2c4a22", "#3c6a2c", "#4f8a3a", "#6aa848", "#8cc45c", "#acd878");
const REED = pal("#2e4a24", "#46683a", "#628a44", "#82a854", "#a8c470", "#c8d890");
const PAD = pal("#23482a", "#336a34", "#4c8a3e", "#6cac52", "#90c86a");
const WOOD = pal("#2e2016", "#4a3322", "#664a32", "#846444", "#a4825a", "#c4a276");

// ---------------- the scenes ----------------
// crop: [x, y, w, h] in board units. rivers[i]: per river (by index in RIVERS) its default edge, zones and widening.
// zone: { bank: "N"|"S"|"E"|"W"|"*", from, to (board units along the river from its first point), kind, near }
// kinds: cut | lip | beach | sand | reeds | quay | rock     near (a bank the viewer looks down onto): overhang | reedtops | strip
const ARCHERS = (x, y, lv = 3) => ["archer", x, y, lv];
export const SCENES = {
  // ---- WOLFRUN: one river running across the screen: the edge vocabulary, one kind a panel ----
  wolf_today: { realm: "wolfrun", crop: [104, 264, 210, 140], today: true, towers: [ARCHERS(150, 286), ["riverwatch", 176, 352, 2]], at: 22 },
  ...Object.fromEntries([
    ["a_cut", "cut", "overhang", "(a) CUT BANK: far bank shows its earth face; near bank an overhanging turf lip"],
    ["b_lip", "lip", null, "(b) GRASSY LIP: turf to the water, tussocks, a thin dark waterline"],
    ["c_beach", "beach", null, "(c) SHINGLE: gravel shelving into clear shallows, a tide line of wrack"],
    ["d_reeds", "reeds", null, "(d) REEDS AND RUSHES: a reed margin, lilies in the slack"],
    ["e_quay", "quay", null, "(e) STONE QUAY: dressed courses, coping, a weed line at the water"],
  ].map(([k, kind, near, label]) => ["wolf_" + k, {
    realm: "wolfrun", crop: [104, 264, 210, 140], towers: [ARCHERS(150, 286), ["riverwatch", 176, 352, 2]], at: 22, label,
    rivers: [{ widen: 1.6, def: kind, near: near || "plain" }], puddles: [[226, 384, 9, 4, 1, "grass"]],
  }])),
  // the near bank when the far bank is CUT: three treatments side by side on the south bank
  wolf_near: {
    realm: "wolfrun", crop: [104, 264, 210, 140], towers: [ARCHERS(150, 286)], at: 22,
    label: "NEAR BANK under a cut far bank:  1 overhanging lip + shadow gap  |  2 reed tops  |  3 a shingle strip past the lip",
    rivers: [{ widen: 1.6, def: "cut", near: "overhang", zones: [
      { bank: "S", from: 0, to: 172, kind: "cut", near: "overhang" },
      { bank: "S", from: 172, to: 204, kind: "cut", near: "reedtops" },
      { bank: "S", from: 204, to: 900, kind: "cut", near: "strip" },
    ] }],
    tags: [[140, 346, "1"], [186, 348, "2"], [218, 350, "3"]],
  },
  // ---- THORNBROOK: a brook running UP the screen, edges mixed as a river makes them, and a weir ----
  thorn_today: { realm: "thornbrook", crop: [215, 210, 420, 280], today: true, towers: [ARCHERS(300, 300), ["wizard", 560, 300, 2]], at: 20 },
  thorn_mix: {
    realm: "thornbrook", crop: [215, 210, 420, 280], towers: [ARCHERS(300, 300), ["wizard", 560, 300, 2]], at: 20,
    label: "MIXED, up the screen: lit west face on the east bank, shaded lip on the west; shingle inside the bend, reeds in the slack, quay at the bridge, a weir",
    rivers: [{ widen: 1.35, def: "lip", zones: [
      { bank: "E", from: 0, to: 300, kind: "cut" }, { bank: "W", from: 0, to: 225, kind: "cut" },
      { bank: "W", from: 225, to: 330, kind: "beach" }, { bank: "E", from: 300, to: 400, kind: "lip" },
      { bank: "W", from: 330, to: 405, kind: "reeds" }, { bank: "*", from: 405, to: 999, kind: "quay" },
    ], weir: 268 }],
    puddles: [[262, 238, 10, 5, 1, "grass"], [352, 452, 12, 6, 2, "road"], [596, 420, 9, 5, 3, "grass"], [560, 222, 8, 4, 4, "road"]],
  },
  thorn_golden: null, // filled below (same as thorn_mix at golden hour)
  // ---- MILLRACE: the Foxwater and the stone-lined mill race ----
  mill_today: { realm: "millrace", crop: [262, 232, 420, 280], today: true, towers: [ARCHERS(452, 300)], at: 20 },
  mill_mix: {
    realm: "millrace", crop: [262, 232, 420, 280], towers: [ARCHERS(452, 300)], at: 20,
    label: "MILLRACE: the race is a cut channel (stone quay by the mill, turf lip below); the Foxwater cut on the outside of its bends, shingle inside, reeds in the slack",
    rivers: [
      { widen: 1.3, def: "lip", zones: [
        { bank: "E", from: 0, to: 330, kind: "cut" }, { bank: "W", from: 160, to: 330, kind: "beach" },
        { bank: "W", from: 330, to: 470, kind: "cut" }, { bank: "E", from: 330, to: 470, kind: "reeds" },
        { bank: "*", from: 470, to: 999, kind: "quay" },
      ] },
      { widen: 1.15, def: "quay", zones: [{ bank: "*", from: 330, to: 999, kind: "lip" }, { bank: "N", from: 330, to: 999, kind: "cut" }], weir: 215 },
    ],
    puddles: [[598, 300, 10, 5, 1, "grass"], [400, 470, 12, 5, 2, "grass"], [450, 500, 10, 4, 3, "road"]],
  },
  // ---- FOXMERE: the lake ----
  fox_today: { realm: "foxmere", crop: [250, 100, 420, 280], today: true, towers: [ARCHERS(640, 200), ["riverwatch", 470, 252, 2]], at: 18 },
  fox_lake: { realm: "foxmere", crop: [250, 100, 420, 280], towers: [ARCHERS(640, 200)], at: 18, lake: "fox",
    label: "THE LAKE: cut far shore, reed bay, rocky point, grassy bank, a sand beach with a tide line, the jetty, an islet",
    puddles: [[300, 330, 16, 7, 1, "grass"], [480, 306, 16, 6, 2, "road"], [636, 290, 12, 5, 3, "grass"], [356, 128, 12, 5, 4, "road"]] },
  fox_golden: null, fox_dusk: null,
  // ---- OAKMERE: a small pond and puddles ----
  oak_today: { realm: "oakmere", crop: [20, 236, 420, 280], today: true, towers: [ARCHERS(260, 300)], at: 18 },
  oak_pond: { realm: "oakmere", crop: [20, 236, 420, 280], towers: [ARCHERS(260, 300)], at: 18, lake: "oak",
    label: "A POND: grassy lip and rushes, lilies, a cut bank on its far side; puddles on the grass and on the road",
    puddles: [[300, 420, 17, 7, 1, "grass"], [196, 452, 16, 6, 2, "road"], [392, 296, 12, 5, 3, "grass"], [84, 476, 15, 6, 4, "grass"], [336, 448, 11, 5, 5, "road"]] },
};
SCENES.thorn_golden = { ...SCENES.thorn_mix, sun: "golden", label: "GOLDEN HOUR: the west-facing faces take the low sun, the banks throw long shadows on the water" };
SCENES.strip_weir = { ...SCENES.thorn_mix, frames: [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6], strip: [379, 232, 68, 64], label: "THE WEIR, 6 frames: the white fall, the churn running off downstream, the current's dashes travelling" };
SCENES.strip_reeds = { ...SCENES.fox_lake, frames: [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6], strip: [474, 160, 68, 64], label: "A QUIET REEDY EDGE, 6 frames: reeds sway, ducks paddle, slow ripples run across" };
SCENES.fox_lake2 = { ...SCENES.fox_lake, label: "THE LAKE, shore pass: the sand runs on under the water and fades as it deepens; the jetty walks out over the shallows" };
SCENES.fox_lake2_golden = { ...SCENES.fox_lake2, sun: "golden", label: "THE LAKE, shore pass, at golden hour" };
SCENES.fox_beach_zoom = { ...SCENES.fox_lake2, crop: [352, 196, 168, 112], label: "THE BEACH, 2.5x: dry sand + wrack, damp sand, the lapping edge, ankle-deep, knee-deep, the drop-off" };
SCENES.strip_beach = { ...SCENES.fox_lake2, frames: [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6], strip: [418, 222, 68, 50], label: "THE BEACH, 6 frames: the waterline laps, caustics move over the shallow sand" };
SCENES.fox_lake3 = { ...SCENES.fox_lake, label: "THE LAKE, blend pass: the sand runs into the water with no edge, lighter near the shore, darker as it deepens" };
SCENES.fox_lake3_golden = { ...SCENES.fox_lake3, sun: "golden", label: "THE LAKE, blend pass, at golden hour" };
SCENES.fox_beach_zoom3 = { ...SCENES.fox_lake3, crop: [352, 196, 168, 112], label: "THE BEACH, 2.5x, blend pass" };
// ---- ROUND 3: LOOPS (art/briefs/overhaul-animation.md): 30 frames, 10 fps, 3 s; crops ~225 x 150 board units at 2x ----
const ANIM = { F: 30, fps: 10, cols: 6 };
SCENES.anim_river_cut = { realm: "wolfrun", crop: [92, 258, 224, 146], towers: [ARCHERS(150, 286)], at: 22, anim: ANIM,
  rivers: [{ widen: 1.6, def: "lip", zones: [{ bank: "N", from: 0, to: 900, kind: "cut" }] }] };
SCENES.anim_river_reeds = { realm: "millrace", crop: [400, 240, 224, 146], towers: [ARCHERS(452, 300)], at: 20, anim: ANIM,
  rivers: [{ widen: 1.45, def: "reeds", flow: 0.45 }, { widen: 1.15, def: "lip", flow: 0.6 }], paddlers: [[511, 298, false]],
  rings: [[508, 270, 0.1, 8, 1], [520, 330, 0.55, 6, 0], [506, 352, 0.8, 5, 0]] };
SCENES.anim_river_quay = { realm: "millrace", crop: [290, 290, 224, 146], towers: [ARCHERS(452, 300)], at: 20, anim: ANIM,
  rivers: [
    { widen: 1.3, def: "lip", zones: [{ bank: "E", from: 0, to: 330, kind: "cut" }, { bank: "W", from: 330, to: 470, kind: "cut" }, { bank: "E", from: 330, to: 470, kind: "reeds" }, { bank: "*", from: 470, to: 999, kind: "quay" }] },
    { widen: 1.15, def: "quay", flow: 1.25, weir: 215, wakes: [[300, 1], [300, -1], [444, 1], [444, -1]] },
  ] };
SCENES.anim_weir = { realm: "thornbrook", crop: [300, 185, 230, 150], towers: [ARCHERS(300, 300)], at: 20, anim: ANIM,
  rivers: [{ widen: 1.35, def: "lip", zones: [
    { bank: "E", from: 0, to: 300, kind: "cut" }, { bank: "W", from: 0, to: 225, kind: "cut" },
    { bank: "E", from: 300, to: 400, kind: "lip" }, { bank: "W", from: 330, to: 405, kind: "reeds" }, { bank: "*", from: 405, to: 999, kind: "quay" },
  ], weir: 268 }] };
SCENES.anim_lake_beach = { ...SCENES.fox_lake, label: null, crop: [318, 162, 230, 150], anim: ANIM, puddles: [[480, 306, 16, 6, 2, "road"]] };
SCENES.anim_lake_far = { ...SCENES.fox_lake, label: null, crop: [365, 150, 230, 150], anim: ANIM, puddles: [],
  reflect: [463, 204, 210, 40], rings: [[402, 188, 0.2, 9, 1], [508, 214, 0.62, 7, 1]] };
SCENES.anim_pond = { ...SCENES.oak_pond, label: null, crop: [52, 322, 230, 152], anim: ANIM, calm: true,
  puddles: [[252, 436, 14, 6, 2, "road"], [92, 446, 13, 5, 4, "grass"]],
  rings: [[140, 372, 0.05, 6, 0], [170, 364, 0.45, 5, 0], [124, 381, 0.75, 7, 1]] };
SCENES.fox_golden = { ...SCENES.fox_lake, sun: "golden", label: "THE LAKE at golden hour" };
SCENES.fox_dusk = { ...SCENES.fox_lake, sun: "golden", dusk: true, label: "THE LAKE at dusk: the jetty's lanterns and the hall's lit door, a lantern's light broken on the water" };

// the lakes: centre, radii (board units), lobes, zones by screen angle (0 = east, 90 = south), islands, jetty
const LAKES = {
  fox: {
    cx: 426, cy: 213, rx: 104, ry: 40, lobes: [[3, 0.06, 1.1], [5, 0.035, 0.3], [2, 0.05, 2.6]],
    bays: [[-30, 0.16, 24], [100, 0.1, 30]], // a reed bay pushed out at -30 deg
    zones: [[-160, -95, "cut"], [-95, -50, "cut"], [-50, -8, "reeds"], [-8, 22, "rock"], [22, 40, "lip"], [40, 150, "sand"], [150, 172, "lip"], [172, 200, "reeds"]],
    islands: [{ cx: 466, cy: 200, rx: 16, ry: 8, zones: [[0, 180, "cut"], [180, 360, "lip"]] }],
    jetty: { x: 404, y: 262, len: 40, side: 1 }, rocks: [[528, 218, 4.5], [536, 211, 3.5], [533, 226, 3], [521, 228, 2.2]],
    birds: [["duck", 488, 182], ["duck", 496, 186], ["duck", 482, 189], ["swan", 360, 204], ["heron", 506, 178]],
    lanterns: [[427, 238]], prints: [[399, 262, -1, 0.18, 14], [446, 258, 1, -0.05, 9]],
  },
  oak: {
    cx: 151, cy: 370, rx: 50, ry: 26, lobes: [[3, 0.08, 0.4], [4, 0.05, 1.9]], bays: [],
    zones: [[-180, -40, "cut"], [-40, 40, "reeds"], [40, 140, "lip"], [140, 180, "reeds"]], islands: [],
    rocks: [], birds: [["duck", 140, 364], ["duck", 148, 370], ["heron", 186, 352]], lanterns: [],
  },
};

// ---------------- the field ----------------
// D signed distance in art px (+ land), NX/NY the unit normal toward land, S along the flow (art px), BODY, KIND, NEAR
function buildField(sc, rivers, bridges, X0, Y0, w, h) {
  const N = w * h, D = new Float32Array(N).fill(99), S = new Float32Array(N), LAT = new Float32Array(N), HWv = new Float32Array(N);
  const KW = new Float32Array(N).fill(1), BODY = new Int8Array(N).fill(-1), KIND = new Array(N), NEAR = new Array(N), BANK = new Array(N);
  const bodies = [];
  const bridgeDist = (x, y) => Math.min(999, ...bridges.map((b) => Math.hypot(b.x - x, b.y - y)));
  (sc.rivers || []).forEach((spec, ri) => {
    const rv = rivers[ri]; if (!rv) return;
    let cum = 0; const segs = rv.segs.map((s) => { const o = { ...s, c0: cum }; cum += s.len; return o; });
    // the half-width along the river: widened, but tapered back to the old width at a bridge and kept clear of the road
    const step = 4, hwAt = [];
    for (let s = 0; s <= cum + step; s += step) {
      let sg = segs.find((q) => s <= q.c0 + q.len) || segs[segs.length - 1];
      const t = clamp((s - sg.c0) / sg.len, 0, 1), x = sg.x1 + (sg.x2 - sg.x1) * t, y = sg.y1 + (sg.y2 - sg.y1) * t;
      const hw0 = (sg.hw1 ?? rv.w / 2) + ((sg.hw2 ?? rv.w / 2) - (sg.hw1 ?? rv.w / 2)) * t;
      let hw = hw0 * (1 + ((spec.widen || 1) - 1) * sstep(26, 62, bridgeDist(x, y)));
      const room = nearestOnPath(x, y).d - PATH_HALF - 7;
      if (bridgeDist(x, y) > 40) hw = Math.max(hw0, Math.min(hw, room));
      // a little life in the width
      hw *= 1 + (vn(s / 60, ri * 7, 3) - 0.5) * 0.16;
      hwAt.push(hw);
    }
    bodies.push({ type: "river", ri, spec, segs, cum, hwAt, step });
  });
  if (sc.lake) bodies.push({ type: "lake", L: LAKES[sc.lake] });
  const ZK = (kind) => kind;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = X0 + i, Y = Y0 + j, x = X / 2, y = Y / 2, k = j * w + i;
    for (let b = 0; b < bodies.length; b++) {
      const B = bodies[b];
      if (B.type === "river") {
        let bd = 1e9, bs = 0, bx = 0, by = 0, bdx = 1, bdy = 0;
        for (const sg of B.segs) {
          const vx = sg.x2 - sg.x1, vy = sg.y2 - sg.y1, t = clamp(((x - sg.x1) * vx + (y - sg.y1) * vy) / (sg.len * sg.len), 0, 1);
          const px = sg.x1 + vx * t, py = sg.y1 + vy * t, dd = Math.hypot(x - px, y - py);
          if (dd < bd) { bd = dd; bs = sg.c0 + t * sg.len; bx = x - px; by = y - py; bdx = vx / sg.len; bdy = vy / sg.len; }
        }
        const fi = clamp(bs / B.step, 0, B.hwAt.length - 1.001), i0 = Math.floor(fi), hw = B.hwAt[i0] + (B.hwAt[Math.min(i0 + 1, B.hwAt.length - 1)] - B.hwAt[i0]) * (fi - i0);
        const d = (bd - hw) * 2;
        if (d < D[k]) {
          D[k] = d; S[k] = bs * 2; HWv[k] = hw * 2; BODY[k] = b;
          const side = Math.sign(bdx * by - bdy * bx) || 1; LAT[k] = (bd / hw) * side;
          // which compass bank: the land direction from the centre line
          const lx = -bdy * side, ly = bdx * side;
          const bank = Math.abs(ly) >= Math.abs(lx) ? (ly < 0 ? "N" : "S") : (lx < 0 ? "W" : "E");
          BANK[k] = bank;
          // the zone (its start jittered so a change of edge never runs on a straight line across)
          const sj = bs + (vn(bs / 9, side * 3, 11) - 0.5) * 10;
          let kind = B.spec.def, near = B.spec.near || "overhang", kw = 1;
          for (const z of B.spec.zones || []) if ((z.bank === "*" || z.bank === bank) && sj >= z.from && sj < z.to) { kind = z.kind; if (z.near) near = z.near; kw = clamp(Math.min(sj - z.from + 2, z.to - sj + 2) / 22, 0, 1); }
          KIND[k] = ZK(kind); NEAR[k] = near; KW[k] = kw;
        }
      } else {
        const L = B.L;
        const ux = (x - L.cx) / L.rx, uy = (y - L.cy) / L.ry, th = Math.atan2(uy, ux), rho = Math.hypot(ux, uy);
        let r = 1; for (const [f, a, p] of L.lobes) r += a * Math.sin(f * th + p);
        for (const [deg, a, wd] of L.bays) { const dd = ((th * 180 / Math.PI - deg + 540) % 360) - 180; r += a * Math.exp(-(dd * dd) / (2 * wd * wd)); }
        const sc0 = Math.hypot(L.rx * Math.cos(th), L.ry * Math.sin(th));
        let d = (rho - r) * sc0 * 2, deg = th * 180 / Math.PI, isl = -1;
        for (let q = 0; q < L.islands.length; q++) {
          const I = L.islands[q], vx = (x - I.cx) / I.rx, vy = (y - I.cy) / I.ry, ti = Math.atan2(vy, vx);
          const ri = 1 + 0.12 * Math.sin(3 * ti + 1) + 0.06 * Math.sin(5 * ti);
          const di = (Math.hypot(vx, vy) - ri) * Math.hypot(I.rx * Math.cos(ti), I.ry * Math.sin(ti)) * 2;
          if (-di > d) { d = -di; isl = q; deg = ti * 180 / Math.PI; }
        }
        // the road is always dry land, a few units clear
        if (rho < 1.5) { const road = (nearestOnPath(x, y).d - PATH_HALF - 6) * 2; if (-road > d) d = -road; }
        if (d < D[k]) {
          D[k] = d; BODY[k] = b; S[k] = (deg + 180) * 3; HWv[k] = Math.min(L.rx, L.ry) * 2; LAT[k] = rho;
          const zs = isl >= 0 ? L.islands[isl].zones : L.zones;
          const dj = deg + (vn(deg / 7, isl + 2, 12) - 0.5) * 8;
          let kind = "lip", kw = 1;
          for (const [a0, a1, kd] of zs) { const dd = isl >= 0 ? (dj + 360) % 360 : dj; if (dd >= a0 && dd < a1) { kind = kd; kw = clamp(Math.min(dd - a0 + 1, a1 - dd + 1) / (isl >= 0 ? 30 : 34), 0, 1); } }
          if (isl < 0 && dj < -160) { kind = "lip"; kw = 1; }
          KIND[k] = kind; NEAR[k] = "overhang"; BANK[k] = isl >= 0 ? "I" : "L"; KW[k] = kw;
        }
      }
    }
  }
  // normals from the field (toward land)
  const NX = new Float32Array(N), NY = new Float32Array(N);
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const k = j * w + i; let gx = D[k + 1] - D[k - 1], gy = D[k + w] - D[k - w];
    // far from the shore the field is clipped at 99: fall back to the neighbours' slope
    const l = Math.hypot(gx, gy) || 1; NX[k] = gx / l; NY[k] = gy / l;
  }
  return { D, NX, NY, S, LAT, HWv, BODY, KIND, NEAR, BANK, KW, bodies, w, h };
}

// ---------------- the sun on a face ----------------
const faceTone = (fnx, fny) => {
  // fnx, fny: the face's outward normal (toward the water). A south face is the face we look at: mid, never black.
  const L = DAY.L, l = Math.hypot(L[0], L[1]) || 1, lit = (fnx * L[0] + fny * L[1]) / l;
  return Math.max(1.85, 2.35 + lit * 1.45 + (fny > 0 ? 0.65 * fny : 0));
};
const HFACE = { cut: 13, rock: 13, quay: 11 };
const faceW = (kind, nx, ny) => {
  const H = HFACE[kind]; if (!H) return 0;
  if (ny > 0.35) return 0; // a near bank: we look down on its top, its face is turned away
  return H * (Math.max(0, -ny) + Math.abs(nx) * 0.42);
};

// ---------------- painting the water ----------------
// P: the pixel buffer (Uint8ClampedArray of the crop, w*h*4, from B); F: the field. t: 0..1 the moment (animation)
function paintWater(P, F, sc, t, X0, Y0, MOD) {
  const { D, NX, NY, S, LAT, HWv, BODY, KIND, NEAR, KW, w, h } = F;
  const golden = DAY.id === "golden", fall = DAY.fall, slen = DAY.len || 0;
  const get = (k) => [P[k * 4], P[k * 4 + 1], P[k * 4 + 2]];
  const put = (k, c) => { P[k * 4] = c[0]; P[k * 4 + 1] = c[1]; P[k * 4 + 2] = c[2]; MOD[k] = 1; };
  const weirs = F.bodies.map((B) => (B.type === "river" && B.spec.weir ? B.spec.weir * 2 : null));
  for (let j = 2; j < h - 2; j++) for (let i = 2; i < w - 2; i++) {
    const k = j * w + i, d = D[k]; if (d > 8 || BODY[k] < 0) continue;
    const X = X0 + i, Y = Y0 + j, nx = NX[k], ny = NY[k], kind = KIND[k], near = NEAR[k], B = F.bodies[BODY[k]];
    const isNear = ny > 0.35, s = S[k];
    const g = get(k);
    if (d >= 0) {
      // ---- the land side of the shore ----
      if ((kind === "cut" || kind === "rock") && !isNear && d < 2.2) put(k, lerp(g, TURF[5], d < 1 ? 0.55 : 0.25));          // the lit lip of the drop
      else if (kind === "cut" && isNear && d < 1.2) put(k, lerp(g, TURF[4], 0.4));
      else if (kind === "quay" && d < (isNear ? 4 : 5)) {                                                                     // coping stones
        const run = Math.floor((s + (isNear ? 0 : 3)) / 11), jt = ((s % 11) + 11) % 11 < 1;
        let c = STONE[4 - (hs(run, 1, 5) > 0.6 ? 1 : 0)]; if (jt) c = STONE[1]; if (d > (isNear ? 3 : 4)) c = STONE[1]; if (d < 1) c = STONE[5];
        if (hs(X, Y, 7) > 0.93) c = lerp(c, hex("#7a8a50"), 0.5); put(k, c);
      } else if (kind === "lip" || kind === "reeds") { if (d < 3.5) put(k, lerp(g, kind === "reeds" ? hex("#3a5a2c") : TURF[1], (1 - d / 3.5) * 0.42)); }
      else if (kind === "beach" || kind === "sand") {
        const pal2 = kind === "sand" ? SAND : GRAVEL;
        const dune = (B.type === "lake" && kind === "sand" ? 16 + vn(X / 10, 0, 13) * 10 : 5) * (0.1 + 0.9 * sstep(0, 1, F.KW[k]));
        if (d < dune && hs(X, Y, 9) < (B.type === "lake" ? 1.15 : 0.75) - d / dune) put(k, kind === "sand" ? (vn(X / 5, Y / 3, 14) > 0.5 ? SAND[4] : SAND[3]) : pal2[3 + (hs(X, Y, 10) > 0.5 ? 1 : 0)]);
      }
      continue;
    }
    // ---- the water side ----
    const kwt = sstep(0, 1, KW[k]), e = -d, fw = faceW(kind, nx, ny) * (B.type === "lake" ? 1.35 : 1) * (0.15 + 0.85 * kwt);
    if (e < fw) { put(k, facePixel(kind, e / fw, fw, e, X, Y, s, -nx, -ny)); continue; }
    let ew = e - fw; // from the water's own edge
    // near bank treatments (we look onto its top)
    if (isNear && (kind === "cut" || kind === "rock" || kind === "quay")) {
      if (kind === "quay") { if (ew < 2) { put(k, ew < 1 ? STONE[2] : STONE[0]); continue; } }
      else if (ew < 1.6) { put(k, ew < 0.8 ? TURF[3] : TURF[1]); continue; }                                              // the turf lip's edge
      if (near === "strip" && ew < 7) {                                                                                       // shingle seen past the lip
        const c = ew < 2.6 ? GRAVEL[0] : ew < 5 ? GRAVEL[2 + (hs(X, Y, 21) > 0.6 ? 1 : 0)] : GRAVEL[1];
        put(k, hs(X, Y, 22) > 0.9 ? GRAVEL[4] : c); continue;
      }
      if (near === "strip") ew -= 7;
    }
    const bodyHW = HWv[k];
    let edge = kind; let wl = ew, ramped = false, q0 = 0;            // wl: distance from where the water meets the land
    if (B.type === "lake" && (kind !== "cut" || isNear) && kind !== "quay") {
      // a lake's shelving shore: the bed runs on under the water and fades out as it deepens (lakeShore below)
      const r = lakeShore(kind, ew, X, Y, t, kwt, s, F.BANK[k] === "I", golden);
      if (r.c) { put(k, r.c); continue; }
      wl = r.wl; ramped = true; q0 = r.q0;
    } else if (kind === "beach" || kind === "sand") {
      const bk = (B.type === "river" ? 1.7 : 1.9) * (0.15 + 0.85 * kwt), dry = (kind === "sand" ? 7 : 5) * bk, wet = (kind === "sand" ? 11 : 8) * bk, shelf = (kind === "sand" ? 22 : 18) * bk;
      const lap = Math.sin(t * Math.PI * 2 + s / 23) * 0.9;                                                                 // the lap of the water
      if (ew < dry + lap * 0.3) {
        const P2 = kind === "sand" ? SAND : GRAVEL;
        let c = P2[3]; const r = hs(X, Y, 31);
        if (kind === "beach") { const cell = hs(Math.floor(X / 3), Math.floor(Y / 2), 32); c = cell > 0.7 ? GRAVEL[4] : cell > 0.35 ? GRAVEL[3] : GRAVEL[2]; if (r > 0.92) c = GRAVEL[1]; }
        else { c = vn(X / 6, Y / 3, 33) > 0.55 ? SAND[4] : SAND[3]; if (r > 0.96) c = hex("#f4ecd8"); }
        if (B.type === "lake" && Math.abs(ew - (dry - 1.4) - (vn(X / 14, 0, 36) - 0.5) * 3) < 0.7 && hs(Math.floor(X / 2), 0, 34) > 0.35) c = hs(X, 1, 35) > 0.5 ? hex("#4e5a34") : hex("#6a5a3a"); // the tide line's wrack, wandering
        if (B.type === "river" && hs(Math.floor(X / 2), Math.floor(Y / 2), 37) > 0.9) c = (X + Y) & 1 ? GRAVEL[0] : GRAVEL[4];                     // a cobble
        put(k, c); continue;
      }
      if (ew < wet + lap) {                                                                                                   // wet: darker, holding the sky
        const P2 = kind === "sand" ? SAND : GRAVEL; let c = lerp(P2[1], P2[2], vn(X / 5, Y / 3, 36));
        if (hs(X, Y, 37) > 0.93) c = lerp(c, hex("#d8e4e0"), 0.5);
        if (ew > wet + lap - 1.2) c = lerp(c, FOAM, 0.7);                                                                      // the lap's thin foam
        put(k, c); continue;
      }
      wl = ew - wet;
      if (wl < shelf - wet) {                                                                                                 // clear shallows over the bed
        const a = clamp(wl / (shelf - wet), 0, 1);
        const bed = kind === "sand" ? lerp(SAND[2], SAND[1], vn(X / 7, Y / 4, 38)) : (hs(Math.floor(X / 3), Math.floor(Y / 2), 39) > 0.5 ? GRAVEL[2] : GRAVEL[1]);
        let c = lerp(bed, WA[5], 0.25 + a * 0.6);
        const q = Math.abs(Math.sin(vl(X / 6, Y / 4, 40, 2, 0, t) * 9));
        if (q < 0.13 && a < 0.7) c = lerp(c, hex("#f4f0d0"), 0.45 * (1 - a));                                                // caustics
        put(k, c); continue;
      }
      wl -= shelf - wet;
    }
    // the open water
    // depth: a river is deepest along its line (so a change of edge never makes a step in the water);
    // a shelving edge (beach, reeds, lip) still lightens the water right at it
    const qc = B.type === "river" ? clamp((1 - Math.abs(LAT[k])) * 1.55, 0, 1) : clamp((wl + (vn(X / 30, Y / 14, 43) - 0.5) * 10) / 54, 0, 1);
    const qe = B.type !== "river" || kind === "cut" || kind === "rock" || kind === "quay" ? 1 : clamp(wl / 14, 0, 1);
    const q = Math.min(qc, 0.35 + qe * 0.65) + (vn(X / 22, Y / 12, 41) - 0.5) * 0.18;
    if (B.type === "lake" && !ramped) { ramped = true; q0 = 0.45 * kwt; }   // a cut shore: deep at once
    if (ramped) {   // the lake: one continuous ramp, dithered, contours wandering
      const qq = clamp(q0 + (1 - q0) * (wl / 52) + (vn(X / 20, Y / 12, 276) - 0.5) * 0.08, 0, 1), fi = qq * (RAMP_DEEP.length - 1), i0 = Math.floor(fi);
      let c = RAMP_DEEP[Math.min(RAMP_DEEP.length - 1, fi - i0 > BAYER8[(Y & 7) * 8 + (X & 7)] ? i0 + 1 : i0)];
      // slow swell lines rolling toward the south shore: one wavelength (15 art px) a loop, broken by noise
      const sw = Math.sin(TAU * (Y / 15 - t) + vn(X / 34, Y / 22, 69) * 5), brk = vn(X / 14, Y / 7, 70);
      if (!sc.calm && sw > 0.93 && brk > 0.5 && wl > 10) c = lerp(c, WA[6], 0.24);
      else if (!sc.calm && sw < -0.96 && brk > 0.6 && wl > 14) c = mul(c, 0.94);
      const cl = vl(X / 90, Y / 9, 71, 0.15, 0, t);
      if (cl > 0.66 + bay(X, Y) * 0.1 && wl > 20 && (Y % 3)) c = lerp(c, hex("#b8d4cc"), 0.12);
      if (golden) { c = lerp(c, hex("#7a6a62"), 0.1); const g2 = vn(X / 8 + t * 2, Y / 1.4, 80), band = vn(X / 160, Y / 46, 81); if (!sc.dusk && g2 > 0.92 - band * 0.2 && band > 0.56 && (Y % 2 === 0) && wl > 8) c = lerp(c, hex("#ffc870"), 0.55); }
      if ((kind === "cut" || kind === "rock") && !isNear && wl < 6) c = wl < 1.2 ? lerp(c, FOAM2, 0.45) : mul(c, 0.74);   // the face's lap and its shade
      put(k, c); continue;
    }
    let idx = 6 - q * 6.2 + (bay(X, Y) - 0.5) * 0.3 + (vn(X / 7, Y / 3, 42) - 0.5) * 0.9;
    let c = WA[clamp(Math.round(idx), 0, 6)];
    // the bank's shade on the water at its foot, and the low sun's long shadow
    const fdot = -(nx * fall[0] + ny * fall[1]);
    const Hs = HFACE[kind] || (kind === "lip" || kind === "reeds" ? 3 : 1.5);
    const shadeLen = (isNear ? 0 : Math.max(0, -ny) * Hs * 0.45) + Math.max(0, fdot) * Hs * (0.3 + slen * 0.55) + (isNear ? 3.2 : 0);
    let shade = 0;
    if (wl < shadeLen && !ramped) shade = wl < shadeLen - 1.5 ? 0.62 : 0.78;
    // the edge itself
    if (ramped) {}
    else if (kind === "lip" && wl < 1.2) c = hex("#22361e");
    else if (kind === "lip" && wl < 6) c = lerp(c, hex("#4c7a3c"), 0.32 * (1 - wl / 6));                                       // the grass in the water
    else if (kind === "reeds" && wl < 12) c = lerp(c, hex("#3e5636"), 0.42 * (1 - wl / 12));                                  // still, brown-green slack
    else if ((kind === "cut" || kind === "rock") && !isNear && wl < 1.3) c = lerp(c, FOAM2, 0.55);                              // the water laps the face
    else if (kind === "quay" && !isNear && wl < 2.2) c = wl < 1.1 ? hex("#3a5a34") : lerp(c, FOAM2, 0.35);
    // the current: long light dashes that travel with the flow. Each lane is a strip scrolled a whole number of
    // art px a frame (fastest mid-channel), its noise repeating once a loop, so the loop is seamless
    if (B.type === "river") {
      const lat = LAT[k];
      const v = lat * 4.2, Ln = Math.round(v), flow = (B.spec.flow ?? sc.flow ?? 1);
      const step = Math.round((5 - Math.min(4, Math.abs(Ln)) * 0.75) * flow);
      const [u, nP] = scroll(s, t, step, 26);
      const n1 = vnp(u, v, 50 + BODY[k] + Ln * 7, nP);
      const strong = 1 - Math.abs(lat) * 0.8;
      const lane = Math.abs(v - Ln);
      if (n1 > 0.64 - strong * 0.06 && lane < 0.26 && wl > 3) c = lerp(c, WA[Math.min(6, Math.round(idx) + 1)], 0.75);
      if (n1 > 0.76 && lane < 0.2 && wl > 3) c = lerp(c, WA[Math.min(6, Math.round(idx) + 2)], 0.8);
      if (n1 > 0.88 && lane < 0.14 && wl > 4) c = lerp(c, FOAM2, 0.6);
      const cl = vn(X / 60, Y / 22, 72 + BODY[k]);                                                                       // the sky: still
      if (cl > 0.66 + bay(X, Y) * 0.08 && wl > 8) c = lerp(c, hex("#a8ccc4"), 0.16);                                    // the sky lying on it
      // water running along a wall or under a cut face: quick streaks hugging the stone, foam working at the foot
      if ((kind === "quay" || kind === "cut" || kind === "rock") && !isNear && wl < 7 && sc.anim) {
        const [u2, n2] = scroll(s, t, Math.max(2, Math.round(3 * flow)), 9), f2 = vnp(u2, wl / 2.2, 79 + BODY[k], n2);
        if (kind === "quay" && wl > 1.4 && f2 > 0.7) c = lerp(c, WA[Math.min(6, Math.round(idx) + 2)], 0.6);
        if (kind !== "quay" && wl < 3.6 && f2 > 0.56 - (wl < 1.6 ? 0.08 : 0)) c = lerp(c, FOAM, wl < 1.6 ? 0.75 : 0.45);
      }
      // a wake off a wall's corner: two broken lines slanting out into the stream, travelling down it
      for (const [ws, wside] of B.spec.wakes || []) {
        const ds = s - ws * 2; if (ds < 0 || ds > 110 || Math.sign(lat) !== wside) continue;
        const off = bodyHW * Math.abs(lat), lineAt = bodyHW - 2.5 - 2.6 * Math.sqrt(ds);   // curving out into the stream
        for (const [o, al] of [[0, 0.75], [-5, 0.4]]) {
          if (Math.abs(off - (lineAt + o)) > 0.75) continue;
          const [u3, n3] = scroll(ds, t, Math.round(4 * flow), 4);
          if (vnp(u3, o, 81, n3) > 0.52 + ds / 300) c = lerp(c, FOAM, al * (1 - ds / 120));
        }
      }
      // the weir: still above, a white fall, churn below
      const wr = weirs[BODY[k]];
      if (wr != null) {
        const dw = s - wr;
        if (dw > -60 && dw < 0) c = lerp(c, WA[2], 0.25 * (1 + dw / 60));                                                  // the glassy, darker pool above
        if (dw >= -5 && dw < 0) { c = hs(Math.floor(X / 4), 0, 60) > 0.5 ? STONE[3] : STONE[2]; if (dw >= -1.2) c = STONE[4]; if (dw < -4) c = STONE[1]; }   // the sill's stones
        else if (dw >= 0 && dw < 5) { c = lerp(FOAM, FOAM2, ((Math.floor(X / 2 + t * 6 + hs(X, 0, 61) * 3)) % 3) / 3); if (dw > 3.6 && hs(X, Math.floor(t * 6), 62) > 0.5) c = WA[5]; }
        else if (dw >= 5 && dw < 46) {
          // the churn runs off downstream at the current's mid speed (a strip scrolled 3 px a frame), fading out
          const [ua, na] = scroll(dw, t, 3, 3.2), [ub, nb] = scroll(dw, t, 3, 1.6);
          const fo = vnp(ua, X / 5, 63, na) * (1 - (dw - 5) / 41) * 1.5 + vnp(ub, X / 2.5, 64, nb) * 0.35;
          if (fo > 0.82) c = FOAM; else if (fo > 0.62) c = lerp(c, FOAM2, 0.7); else if (fo > 0.5) c = lerp(c, WA[5], 0.6);
        }
      }
    } else {
      // a lake: wind lanes, slow ripples, the sky lying on it
      const sw = Math.sin(TAU * (Y / 15 - t) + vn(X / 34, Y / 22, 69) * 5), brk = vn(X / 14, Y / 7, 70);
      if (sw > 0.93 && brk > 0.5 && wl > 6) c = lerp(c, WA[Math.min(6, Math.round(idx) + 2)], 0.5);
      const cl = vl(X / 90, Y / 9, 71, 0.15, 0, t);
      if (cl > 0.64 + bay(X, Y) * 0.1 && wl > 14 && (Y % 3)) c = lerp(c, hex("#b8d4cc"), cl > 0.72 ? 0.24 : 0.13);
    }
    if (golden) {
      // the low sun lies on the water as a warm path, and the sky's warmth on the open water
      // the low sun's glitter path: in lanes, gathered into one broad band, thickest toward the sun's side
      const glint = vn(X / 8 + t * 2, Y / 1.4, 80), band = vn(X / 160, Y / 46, 81), west = 1 - clamp((X - X0) / (w * 1.1), 0, 1);
      c = lerp(c, hex("#7a6a62"), 0.12);
      if (!sc.dusk && glint > 0.9 - band * 0.22 - west * 0.08 && band > 0.5 && (Y % 2 === 0) && wl > 5 && shade === 0) c = lerp(c, hex("#ffc870"), 0.65);
    }
    if (shade) c = lerp(mul(c, shade), golden ? hex("#2a2050") : hex("#14262e"), 0.12);
    put(k, c);
  }
}

// ---- a lake's shore, from the land outward: dry sand, damp sand, the lapping waterline, ankle-deep (the bed
// almost unchanged, tinted), knee-deep (greener, dimmer), the drop-off, then the open water. Each band's edge
// wanders (noise, a few stray pixels) and is dithered only right at the edge; the bands follow the shore.
// Returns { c } for a shore pixel, or { wl } (the distance past the drop-off) for the open water to colour.
const SHELF = {           // art px: [dry, damp, ankle, knee, drop]
  sand: [10, 8, 20, 18, 12], lip: [0, 0, 4, 5, 5], reeds: [0, 0, 4, 6, 5], rock: [0, 0, 5, 6, 6], beach: [6, 5, 12, 10, 8], cut: [0, 0, 4, 5, 5],
};
const SHELF_ISLET = [0, 2, 8, 8, 6];
const caustic = (X, Y, t) => {   // the netting drifts ~2 cells a loop (two fields crossing), seamless
  const a = vl(X / 6.5, Y / 4.2, 260, 2.0, 0.6, t), b = vl(X / 5.2, Y / 3.6, 261, -1.5, 1.0, t);
  return Math.abs(a - b) < 0.045;
};
function lakeShore(kind, ew, X, Y, t, kwt, s, islet, golden) {
  // ROUND 3 (owner: "let's have it blend into the water"): no bands, no lines. A continuous depth d (0 where the dry
  // sand ends, 1 where the open water takes over) picks ONE ramp of many close steps, each boundary dissolved by an
  // 8x8 ordered dither as wide as the step, with slow noise in d so the contours wander. The open water then carries
  // on darkening from the ramp's last colour.
  const sandy = kind === "sand" || islet;
  // the beach is widest at its middle and narrows smoothly (a bell over the angle, not the zone weight, so no fan edges)
  const kb = kind === "sand" && !islet ? Math.exp(-((((s / 3 - 180) - 95) / 30) ** 2)) : 0;
  const dryW = (sandy ? 3 + 9 * kb : 0), runW = sandy ? 16 + 52 * kb : (kind === "rock" ? 14 : 12);
  const nd = (vn(X / 18, Y / 13, 270) - 0.5) * 0.14 + (vn(X / 6, Y / 5, 271) - 0.5) * 0.05;
  const d = (ew - dryW) / runW + nd;
  if (d >= 1) return { wl: ew - dryW - runW, q0: 0 };
  const RAMP = sandy ? RAMP_SAND : kind === "rock" ? RAMP_PEB : RAMP_SILT;
  // the lap (loops): the water's edge runs up the sand and back once a loop, by up to ~4 art px at the beach's middle,
  // the swell arriving along the shore (its phase runs with s). Uncovered swash stays damp and dark; a thin film
  // covers the sand above the resting edge when it runs up. No line: the film is the ramp's first steps.
  if (sandy && !islet && kb > 0.04) {
    const lapA = 0.8 + 3.4 * kb, e2 = d * runW;                               // e2: art px past the resting edge
    const Lp = lapA * Math.sin(TAU * t - s / 36);                             // + : the water has drawn back
    if (e2 > -lapA - 0.5 && e2 < Lp) {                                         // the swash, uncovered: damp sand
      const rec = clamp((Lp - e2) / (2 * lapA), 0, 1);                        // how long since the water left it
      let c = lerp(RAMP_SAND[2], SAND[1], 0.55 * (1 - rec * 0.7));
      if (e2 < -lapA + 1.2) c = lerp(c, SAND[3], 0.5);                         // the top of the swash, nearly dry
      if (hs(X, Y, 277) > 0.95) c = lerp(c, hex("#e8eee4"), 0.35);             // a glint in the wet
      return { c: golden ? lerp(c, hex("#ffc880"), 0.1) : c };
    }
    if (e2 >= Lp && e2 < 0) {                                                 // run up over the resting edge: a thin film
      let c = lerp(RAMP_SAND[1], RAMP_SAND[3], clamp((e2 - Lp) / lapA, 0, 1));
      if (e2 - Lp < 0.9 && hs(Math.floor(X / 3), Math.floor(t * LF / 2), 278) > 0.55) c = lerp(c, FOAM, 0.55);   // the edge's broken foam
      return { c: golden ? lerp(c, hex("#ffc880"), 0.1) : c };
    }
  }
  if (d < 0) {                                                                // dry sand (only on a beach)
    let c = vn(X / 6, Y / 3, 33) > 0.55 ? SAND[4] : SAND[3];
    if (hs(X, Y, 31) > 0.97) c = hex("#f4ecd8");
    // the wrack: a few separate bits of weed and twig near the water
    const cx = Math.floor(X / 9), cy = Math.floor(Y / 7);
    if (d > -0.12 && hs(cx, cy, 272) > 0.82 && Math.hypot((X % 9) - 4, ((Y % 7) - 3) * 1.6) < 1.6) c = lerp(c, hs(cx, cy, 273) > 0.5 ? hex("#5a6238") : hex("#7a6244"), 0.65);
    return { c: golden ? lerp(c, hex("#ffc880"), 0.12) : c };
  }
  const fi = d * (RAMP.length - 1), i0 = Math.floor(fi), f = fi - i0;
  let c = RAMP[Math.min(RAMP.length - 1, f > BAYER8[(Y & 7) * 8 + (X & 7)] ? i0 + 1 : i0)];
  // what lies on the bed and the light on it: faint
  if (d > 0.1 && d < 0.8) {
    const rip = Math.sin(ew * 0.9 + vn(X / 24, Y / 18, 243) * 5);
    if (sandy && rip > 0.8 && (X + Y) % 2) c = mul(c, 0.95);
    if (caustic(X, Y, t)) c = lerp(c, hex("#f6f8e6"), 0.18 * (1 - d));
    if (sandy && d < 0.5) { const px = Math.floor(X / 4), py = Math.floor(Y / 3); if (hs(px, py, 244) > 0.96 && X % 4 < 2 && Y % 3 === 1) c = lerp(c, X % 4 === 0 ? GRAVEL[3] : GRAVEL[1], 0.45 * (1 - d * 2)); }
  }
  // sparse broken glints of foam where the water first covers the sand: 2-4 px, well apart, moving
  if (sandy && Math.abs(d - 0.1) < 0.025) { const cell = Math.floor((X + Math.round(t * 26)) / 13), fr = Math.floor(t * 6); if (hs(cell, fr, 274) > 0.62 && ((X + Math.round(t * 26)) % 13) < 2 + hs(cell, 1, 275) * 2) c = lerp(c, FOAM, 0.55); }
  if (golden) c = lerp(c, hex("#ffc880"), 0.1 * (1 - d));
  return { c };
}
// 8x8 ordered dither
const BAYER8 = (() => { const m = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21]; return m.map((v) => (v + 0.5) / 64); })();
// the ramps: many close steps from the bed at the water's edge to the open water's first colour (WA[6])
const ramp = (stops, n) => { const out = []; for (let i = 0; i < n; i++) { const u = (i / (n - 1)) * (stops.length - 1), a = Math.floor(u), f = u - a; out.push(lerp(stops[a], stops[Math.min(a + 1, stops.length - 1)], f).map(Math.round)); } return out; };
const RAMP_SAND = ramp(pal("#ccb486", "#b8a47e", "#a9a080", "#a4b096", "#a8c6b0", "#9ccab4", "#96c6ac"), 16);
// the open lake beyond the shore ramp: WA's light end to its deep end in close steps
const RAMP_DEEP = ramp([WA[6], WA[5], WA[4], WA[3], WA[2], WA[1], WA[0]], 20);
const SILT_Q0 = 7 / 19;   // a grassy or rocky bank's ramp hands over this far down the deep ramp (it starts darker)
const RAMP_SILT = ramp([hex("#7a8656"), hex("#86a07a"), hex("#90b49a"), WA[6]], 10);
const RAMP_PEB = ramp([hex("#8a8470"), hex("#8ca290"), hex("#92b8a2"), WA[6]], 10);

// a pixel of an earth face / quay wall. hf: 0 top .. 1 bottom; fw its height; (fnx, fny): the face's outward normal
function facePixel(kind, hf, fw, e, X, Y, s, fnx, fny) {
  const tone = faceTone(fnx, fny);
  const golden = DAY.id === "golden";
  if (kind === "quay") {
    if (e < 1) return STONE[1];
    const row = Math.floor((e - 1) / 4), off = (row & 1) * 6, bl = Math.floor((s + off) / 12);
    const joint = ((e - 1) % 4) < 0.9 || ((s + off) % 12 + 12) % 12 < 1;
    let ti = clamp(Math.round(tone + (hs(bl, row, 71) - 0.5) * 1.2), 1, 5);
    let c = joint ? STONE[Math.max(0, ti - 2)] : STONE[ti];
    if (hf > 0.78) c = lerp(c, hex("#3e5a30"), hf > 0.9 ? 0.75 : 0.45);                                                      // weed and wet at the water
    if (golden && tone > 2.6) c = lerp(c, hex("#ffae5a"), 0.28);
    return c;
  }
  // earth: strata, set stones, roots under a hanging turf lip, a wet seam at the foot
  const ov = Math.min(1, fw / 10);                                                                                           // a thin side face keeps a thin lip
  if (e < 1.2 * ov) return tone > 2.8 ? TURF[3] : TURF[2];
  if (e < 2.4 * ov && hs(Math.floor(s), 2, 72) > 0.45) return TURF[1];
  const drip = hs(Math.floor(s / 1), 3, 73); if (e < (2 + drip * 4) * ov && drip > 0.78) return drip > 0.9 ? TURF[2] : TURF[1];  // grass hanging over
  if (hf > 0.86) return EARTH[0];                                                                                            // the wet seam
  const band = Math.floor(hf * 4.2 + (vn(s / 16, 3, 74) - 0.5) * 1.4);
  let ti = tone + [0.3, -0.2, 0.5, -0.5, 0.1][((band % 5) + 5) % 5] + (hs(X, Y, 75) - 0.5) * 0.5;
  let c = EARTH[clamp(Math.round(ti), 0, 5)];
  if (((band % 5) + 5) % 5 === 2) c = lerp(c, CLAY[clamp(Math.round(tone - 1), 0, 2)], 0.55);                              // a pale clay layer
  // set stones
  const cs = Math.floor(s / 5), cr = Math.floor(e / 3.4), st = hs(cs, cr, 76);
  if (st > (kind === "rock" ? 0.45 : 0.82) && fw > 6) {
    const fy = (e / 3.4) % 1, fx = (s / 5) % 1;
    if (Math.hypot(fx - 0.5, (fy - 0.5) * 1.3) < 0.42) c = fy < 0.35 ? STONE[4] : fy < 0.7 ? STONE[3] : STONE[1];
  }
  // roots
  if (hf < 0.55 && hs(Math.floor(s), 4, 77) > 0.94 && hf < 0.25 + hs(Math.floor(s), 5, 78) * 0.4) c = EARTH[0];
  if (golden && tone > 2.6) c = lerp(c, hex("#ff9a40"), 0.3 * clamp(tone - 2.6, 0, 1.2));
  return c;
}

// ---------------- sprites (pixel-sculpted props on the water) ----------------
function canvasPainter(P, w, h, X0, Y0, MOD) {
  const set = (X, Y, c, a = 1) => {
    const i = Math.round(X) - X0, j = Math.round(Y) - Y0; if (i < 0 || j < 0 || i >= w || j >= h) return;
    const k = j * w + i; if (a < 1) c = lerp([P[k * 4], P[k * 4 + 1], P[k * 4 + 2]], c, a);
    P[k * 4] = c[0]; P[k * 4 + 1] = c[1]; P[k * 4 + 2] = c[2]; MOD[k] = 1;
  };
  const getp = (X, Y) => { const i = Math.round(X) - X0, j = Math.round(Y) - Y0; if (i < 0 || j < 0 || i >= w || j >= h) return [0, 0, 0]; const k = j * w + i; return [P[k * 4], P[k * 4 + 1], P[k * 4 + 2]]; };
  return { set, getp };
}

let NOW = 0;
let SWAY = { reeds: 0, grass: 0, lily: 0 };   // sway amplitudes (art px); 0 in stills
// a reed / rush clump standing at (X, Y) (its foot at the water)
function reedClump(Pp, X, Y, size, seed, cattails = true) {
  const n = 7 + Math.floor(hs(seed, 1) * 6);
  for (let x = -4; x <= 4; x++) Pp.set(X + x, Y + 1, hex("#1e3426"), 0.45 * (1 - Math.abs(x) / 5));            // its dark foot in the water
  const stems = [];
  for (let q = 0; q < n; q++) {
    const dx = (hs(seed, q, 2) - 0.5) * 7, hgt = size * (0.6 + hs(seed, q, 3) * 0.5), lean = (hs(seed, q, 4) - 0.5) * 0.5 + dx * 0.05;
    stems.push({ dx, hgt, lean, q });
  }
  stems.sort((a, b) => a.dx - b.dx);
  const swA = SWAY.reeds, ph0 = TAU * NOW - X / 70;
  for (const { dx, hgt, lean, q } of stems) {
    const sw = swA * (Math.sin(ph0 + q * 0.35) + 0.35 * Math.sin(2 * ph0 + q));            // the stem's sway at its tip
    const at = (y) => X + dx + lean * y * (y / hgt) + sw * (y / hgt) * (y / hgt);
    for (let y = 0; y < hgt; y++) {
      const x = at(y);
      const c = y < 2 ? REED[0] : y < hgt * 0.35 ? REED[1] : dx < 0 ? REED[3 + (y > hgt * 0.7 ? 1 : 0)] : REED[2 + (y > hgt * 0.75 ? 1 : 0)];
      Pp.set(x, Y - y, c);
      if (q % 2 === 0 && y < hgt * 0.75) Pp.set(x + 1, Y - y, y < hgt * 0.35 ? REED[0] : REED[1]);           // a broad leaf: its shaded side
    }
    if (cattails && hs(seed, q, 5) > 0.82) { const x = at(hgt); for (let y = 0; y < 3; y++) { Pp.set(x, Y - hgt + 1 - y, y === 2 ? hex("#8a5a32") : hex("#5e3a20")); Pp.set(x + 1, Y - hgt + 1 - y, hex("#3e2614")); } Pp.set(x, Y - hgt - 2, REED[3]); }
    else if (hs(seed, q, 6) > 0.5) { const x = at(hgt); Pp.set(x + (lean > 0 ? 1 : -1), Y - hgt + 1, REED[4]); Pp.set(x + (lean > 0 ? 2 : -2), Y - hgt + 2, REED[3]); }  // a blade bending over
  }
}
// a tussock overhanging the water's edge
function tussock(Pp, X, Y, seed, dir = 1) {
  for (let q = 0; q < 9; q++) {
    const a = -Math.PI / 2 + (hs(seed, q, 1) - 0.5) * 2.2, L = 3 + hs(seed, q, 2) * 4;
    const st = SWAY.grass * Math.sin(TAU * 2 * NOW - X / 23 + q * 0.7);                     // stirring, twice a loop
    for (let r = 0; r < L; r++) { const x = X + Math.cos(a) * r * 1.2 + st * (r / L) * (r / L), y = Y + Math.sin(a) * r * 0.8 + (r > L * 0.6 ? (r - L * 0.6) * 0.8 : 0); Pp.set(x, y, r < 1.5 ? TURF[1] : Math.cos(a) < 0 ? TURF[4] : TURF[3]); }
  }
  Pp.set(X, Y + 1, TURF[0]); Pp.set(X - 1, Y + 1, TURF[0]); Pp.set(X + 1, Y + 1, TURF[0]);
}
// a lily pad (and sometimes its flower)
function lily(Pp, X, Y, r, seed) {
  const notch = hs(seed, 1) * 6.28;
  if (SWAY.lily) Y += Math.sin(TAU * NOW + seed * 0.61) > 0.35 ? 1 : 0;                      // a pad bobbing a pixel as a ripple passes
  for (let y = -r; y <= r; y++) for (let x = -r * 1.4; x <= r * 1.4; x++) {
    const u = x / (r * 1.4), v = y / r, rr = u * u + v * v; if (rr > 1) continue;
    const a = Math.atan2(v, u); let da = Math.abs(((a - notch + 9.42) % 6.28) - 3.14); if (da > 2.85 && rr > 0.05) continue;
    const c = rr > 0.7 && v > 0 ? PAD[0] : u + v < -0.6 ? PAD[4] : rr < 0.25 ? PAD[3] : PAD[2];
    Pp.set(X + x, Y + y, c);
  }
  if (hs(seed, 2) > 0.72) { const fx = X + (hs(seed, 3) - 0.5) * r, fy = Y - 1; const pink = hs(seed, 4) > 0.5;
    Pp.set(fx, fy, hex("#f6e070")); Pp.set(fx - 1, fy, pink ? hex("#e898b4") : hex("#f4f0ea")); Pp.set(fx + 1, fy, pink ? hex("#d47898") : hex("#dcd8d0")); Pp.set(fx, fy - 1, pink ? hex("#f4b8cc") : hex("#ffffff")); Pp.set(fx, fy + 1, pink ? hex("#c46888") : hex("#c8c4bc")); }
}
// a boulder at the water with its foam collar
function boulder(Pp, X, Y, r, seed, t) {
  for (let y = -r; y <= r * 0.7; y++) for (let x = -r * 1.2; x <= r * 1.2; x++) {
    const u = x / (r * 1.2), v = y / r, rr = u * u + v * v + (hs(seed, Math.round(x) + 9, Math.round(y)) - 0.5) * 0.15; if (rr > 1) continue;
    let c = u + v < -0.55 ? STONE[4] : u + v < 0 ? STONE[3] : v > 0.35 ? STONE[1] : STONE[2];
    if (rr > 0.85 && v > 0) c = STONE[0]; if (v > 0.45) c = lerp(c, hex("#2e3e30"), 0.5);
    if (hs(X + x, Y + y, 9) > 0.9 && v < 0) c = lerp(c, hex("#8a9a56"), 0.5);
    Pp.set(X + x, Y + y, c);
  }
  for (let x = -r * 1.3; x <= r * 1.3; x++) if (hs(Math.round(x), Math.floor(t * 6), seed) > 0.35) Pp.set(X + x, Y + r * 0.7 + 1, FOAM, 0.8);
}
// birds on the water: hand-placed pixels
const DUCK = ["..gg....", ".gGgk...", ".gge....", "bbbbbb..", "BBwwbbb.", ".BBBBb.."], SWAN = ["...ww......", "..wWw......", "..ow.......", "...w.......", "...w.......", "..ww...ww..", ".wWWWwwWWw.", "wWWWWWWWWww", ".wwwwwwwww.", "..sssssss.."];
const HERON = ["...gg..", "..gGG..", ".yy.g..", "....g..", "...gg..", "..gGGg.", ".gGGGgg", "..gGGg.", "...l...", "...l...", "...l...", "..wwww."];
function bird(Pp, kind, X, Y, t, flip) {
  const map = kind === "duck" ? DUCK : kind === "swan" ? SWAN : HERON;
  const C = { g: hex("#1e6a3e"), G: hex("#3aa060"), k: hex("#101010"), e: hex("#f0c040"), b: hex("#b08458"), B: hex("#6a4428"), w: hex("#f2f0e8"), W: hex("#ffffff"), o: hex("#e8803a"), s: hex("#9ab0b0"), y: hex("#d8b048"), l: hex("#6a6a5a") };
  if (kind === "heron") { C.g = hex("#8a9098"); C.G = hex("#b4bcc4"); }
  const bob = kind === "heron" ? 0 : (Math.sin(TAU * t + X * 0.3) > 0.4 ? 1 : 0);
  map.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") Pp.set(X + (flip ? row.length - 1 - i : i), Y + j + bob, C[ch]); }));
  if (kind !== "heron") { const L = map.length, W2 = map[0].length; for (let r = 1; r < 9; r++) { Pp.set(X + (flip ? -r : W2 + r), Y + L - 2 + Math.round(r * 0.35), FOAM2, 0.55 - r * 0.05); Pp.set(X + (flip ? -r : W2 + r), Y + L - 2 - Math.round(r * 0.35), FOAM2, 0.4 - r * 0.04); } }
  else for (let x = -3; x <= 4; x++) Pp.set(X + 3 + x, Y + map.length, FOAM2, 0.5);
}

// the jetty: piles with wet feet and weed, a plank deck with gaps, a ladder, a lantern post, a moored skiff
function jetty(Pp, J, t, dusk, lights, ewAt = () => 99) {
  // a walk out from the beach (planks across, water showing in the gaps) to a T-head where the skiff ties up.
  // Posts stand just outside the deck: their tops above it, their wet feet (weed, a ripple) in the water beside it.
  const x0 = Math.round(J.x * 2), yLand = Math.round(J.y * 2), L = J.len * 2, Wd = 14, lift = 5;
  const yEnd = yLand - L, hx0 = x0 - 9, hW = Wd + 18, hH = 14;                      // the head
  const fall = DAY.fall, sx = Math.round(fall[0] * 4), sy = Math.round(3 + fall[1] * 2);
  const rect = (xa, ya, w2, h2, fn) => { for (let y = ya; y < ya + h2; y++) for (let x = xa; x < xa + w2; x++) fn(x, y); };
  // its shadow on the water (the sun's way)
  // on the dry and damp sand a sand-brown shade, through the shallows a soft dark on the bed, out deep a dark on the water
  const shadeAt = (x, y) => { const e = ewAt(x, y); return e < 10 ? [hex("#6a5236"), 0.32] : e < 60 ? [hex("#2a5a52"), 0.34] : [hex("#0e2028"), 0.4]; };
  rect(x0 + sx, yEnd + hH + sy, Wd, L - hH, (x, y) => { const [c, a] = shadeAt(x, y); Pp.set(x, y, c, a); });
  rect(hx0 + sx, yEnd + sy, hW, hH, (x, y) => Pp.set(x, y, hex("#0e2028"), 0.4));
  // the skiff tied alongside the head
  skiff(Pp, hx0 + hW + 9, yEnd + 12, t);
  // a post: its foot in the water (seen below the deck's edge), its top above the deck
  const post = (px, py, tall = 4) => {
    const e = ewAt(px, py + lift + 1), dry = e < 10, shallow = e < 60;
    if (dry) { Pp.set(px + 2, py + lift + 1, hex("#8a7050"), 0.6); Pp.set(px + 3, py + lift + 1, hex("#8a7050"), 0.35); }       // a foot in the sand, its little shadow
    else {
      if (shallow) { Pp.set(px + 2, py + lift + 2, hex("#3a6a5e"), 0.45); Pp.set(px + 3, py + lift + 3, hex("#3a6a5e"), 0.3); }  // its shadow on the bed, seen through
      for (let r = -2; r <= 3; r++) Pp.set(px + r, py + lift + 2, FOAM2, (r === -2 || r === 3 ? 0.25 : 0.55) * (shallow ? 0.6 : 1));
    }
    for (let y = 0; y <= lift + 1; y++) { const wet = !dry && y >= lift - (shallow ? 0 : 1); Pp.set(px, py + y, wet ? hex("#33502e") : WOOD[2]); Pp.set(px + 1, py + y, wet ? hex("#22361e") : WOOD[1]); }
    for (let y = 1; y <= tall; y++) { Pp.set(px, py - y, WOOD[4]); Pp.set(px + 1, py - y, WOOD[2]); }
    Pp.set(px, py - tall - 1, WOOD[5]); Pp.set(px + 1, py - tall - 1, WOOD[4]);
  };
  const planks = (xa, ya, w2, h2, across) => {
    for (let y = ya; y < ya + h2; y++) for (let x = xa; x < xa + w2; x++) {
      const u = across ? y - ya : x - xa, pr = Math.floor(u / 3), gap = u % 3 === 2;
      const ge = gap ? ewAt(x, y + lift) : 0; let c = gap ? (ge < 10 ? hex("#7a6040") : ge < 60 ? hex("#3e7a6c") : hex("#16303a")) : WOOD[3 + (hs(pr, 7, 3) > 0.55 ? 1 : 0)];
      if (!gap && hs(x, y, 4) > 0.95) c = WOOD[2];
      if (!gap && (across ? (x === xa || x === xa + w2 - 1) : (y === ya || y === ya + h2 - 1))) c = across && x === xa ? WOOD[5] : WOOD[2];   // the stringers' ends
      if (!gap && across && (x === xa + 2 || x === xa + w2 - 3) && u % 3 === 0) c = hex("#2a2a2e");                          // nail heads
      Pp.set(x, y, c);
    }
  };
  // posts behind (north side of the head) first
  for (let x = hx0; x <= hx0 + hW - 2; x += 10) post(x, yEnd - 1, 5);
  // the walk and the head
  planks(x0, yEnd + hH, Wd, L - hH + 4, true);
  planks(hx0, yEnd, hW, hH, false);
  for (let x = hx0; x < hx0 + hW; x++) { Pp.set(x, yEnd + hH, WOOD[1]); Pp.set(x, yEnd + hH + 1, WOOD[0]); }                 // the head's front beam
  for (let y = yEnd + hH + 10; y < yLand - 2; y += 13) { post(x0 - 2, y, 3); post(x0 + Wd, y, 3); }
  post(hx0 - 1, yEnd + hH - 2, 4); post(hx0 + hW - 1, yEnd + hH - 2, 4);
  // the ladder down off the head's west end, a bollard, a coil of rope, a crate
  for (let y = 0; y < lift + 5; y++) { Pp.set(hx0 - 3, yEnd + 3 + y, WOOD[4]); Pp.set(hx0 - 6, yEnd + 3 + y, WOOD[3]); if (y % 3 === 0) { Pp.set(hx0 - 5, yEnd + 3 + y, WOOD[2]); Pp.set(hx0 - 4, yEnd + 3 + y, WOOD[2]); } }
  for (let r = -7; r <= 0; r++) Pp.set(hx0 + r, yEnd + lift + 9, FOAM2, 0.5);
  rect(hx0 + hW - 6, yEnd + 3, 3, 4, (x, y) => Pp.set(x, y, y === yEnd + 3 ? WOOD[5] : x === hx0 + hW - 6 ? WOOD[3] : WOOD[1]));
  [[0, 0], [1, 0], [2, 1], [1, 2], [0, 2], [-1, 1], [0, 1]].forEach(([dx, dy]) => Pp.set(hx0 + hW - 12 + dx, yEnd + 5 + dy, dy === 1 && dx === 0 ? hex("#7a6040") : hex("#c8aa70")));
  rect(hx0 + 4, yEnd + 2, 6, 5, (x, y) => Pp.set(x, y, y === yEnd + 2 ? WOOD[5] : x === hx0 + 4 ? WOOD[4] : (y - yEnd) % 2 ? WOOD[2] : WOOD[3]));
  // the lantern post at the head's east corner
  const lx = hx0 + hW - 2, ly = yEnd + hH - 2;
  for (let y = 0; y < 22; y++) { Pp.set(lx, ly - y, WOOD[4]); Pp.set(lx + 1, ly - y, WOOD[2]); }
  for (let x = -4; x <= 1; x++) Pp.set(lx + x, ly - 21, WOOD[2]);
  const gx = lx - 4, gy = ly - 20;
  const glass = dusk ? hex("#ffe49a") : hex("#d8c890");
  for (let y = 0; y < 6; y++) for (let x = -1; x <= 1; x++) Pp.set(gx + x, gy + y, y === 0 || y === 5 ? hex("#2a2a2e") : x === 0 && dusk ? hex("#fff6d0") : x === 1 ? mul(glass, 0.8) : glass);
  Pp.set(gx, gy - 1, hex("#2a2a2e"));
  lights.push({ X: gx, Y: gy + 3, r: 56, col: [255, 190, 90], water: { X: gx, Y: yEnd + hH + lift + 3 } });
  // a lantern on a post where the walk meets the beach
  const bx = x0 - 4, by = yLand - 4;
  for (let y = 0; y < 14; y++) { Pp.set(bx, by - y, WOOD[4]); Pp.set(bx + 1, by - y, WOOD[2]); }
  for (let y = 0; y < 5; y++) for (let x = -1; x <= 1; x++) Pp.set(bx + x, by - 18 + y, y === 0 || y === 4 ? hex("#2a2a2e") : x === 0 && dusk ? hex("#fff6d0") : glass);
  lights.push({ X: bx, Y: by - 16, r: 46, col: [255, 180, 80] });
}
function skiff(Pp, X, Y, t) {
  const L = 34, bob = Math.sin(TAU * t) > 0.3 ? 1 : Math.sin(TAU * t) < -0.3 ? -1 : 0, roll = Math.sin(TAU * t + 1.4);
  for (let y = -L / 2; y <= L / 2; y++) {
    const u = y / (L / 2), half = Math.round(7 * Math.sqrt(Math.max(0, 1 - u * u * (u < 0 ? 1.05 : 0.8))));
    for (let x = -half; x <= half; x++) {
      const edge = Math.abs(x) >= half - 0.5, inner = Math.abs(x) < half - 1;
      let c = edge ? (x < 0 ? WOOD[5] : WOOD[3]) : inner ? ((Math.round(y + 40) % 4 === 0) ? WOOD[1] : WOOD[2]) : WOOD[1];
      if (inner && Math.abs(y) < 2) c = WOOD[4];                                                                                  // the thwart
      Pp.set(X + x, Y + y + bob, c);
    }
    Pp.set(X + half + 1, Y + y + 1 + bob, hex("#0e2028"), 0.45);                                                                 // its shadow
  }
  for (let y = -6; y < 7; y++) Pp.set(X - 2 + y * 0.12, Y + y + bob, WOOD[5]);                                                    // an oar shipped
  for (let x = -6; x <= 6; x++) Pp.set(X + x, Y + L / 2 + 2 + bob, FOAM2, 0.5);
  for (let r = 0; r < 6; r++) Pp.set(X - 7 - r, Y - 12 - r * 0.4, hex("#c8aa70"));                                               // the painter rope to the deck
}

// a puddle: [x, y, rx, ry, seed, on] (board units). On grass: sodden turf, a rush or two; on the road: wet mud.
function puddle(Pp, F, pd, t, golden) {
  const [cx, cy, rx, ry, seed, on] = pd, X0 = cx * 2, Y0 = cy * 2;
  const R = (x, y) => {   // irregular: three overlapping lobes
    let best = 9;
    for (let q = 0; q < 3; q++) {
      const ox = (hs(seed, q, 1) - 0.5) * rx * 1.1, oy = (hs(seed, q, 2) - 0.5) * ry * 0.8, sx = rx * (0.55 + hs(seed, q, 3) * 0.45), sy = ry * (0.6 + hs(seed, q, 4) * 0.4);
      best = Math.min(best, Math.hypot((x - ox) / sx, (y - oy) / sy));
    }
    return best + (vn(x / 3, y / 3, seed) - 0.5) * 0.18;
  };
  const xr = rx * 2 + 8, yr = ry * 2 + 8;
  for (let j = -yr; j <= yr; j++) for (let i = -xr; i <= xr; i++) {
    const r = R(i / 2, j / 2), X = X0 + i, Y = Y0 + j;
    const g = Pp.getp(X, Y);
    if (r > 1.55) continue;
    if (r > 1) {                                                                                                                // the margin
      const a = (1.55 - r) / 0.55;
      if (on === "road") Pp.set(X, Y, lerp(g, hex("#5a442c"), a * 0.55));
      else Pp.set(X, Y, lerp(g, hex("#2e4a26"), a * 0.45));
      continue;
    }
    // the water: the sky lying in it, darker under its north lip, light catching its south edge
    const v = (j / (ry * 2) + 1) / 2;
    let c = lerp(hex("#a4bcc4"), hex("#566e7c"), v);
    if (golden) c = lerp(hex("#f0c890"), hex("#8a84a4"), v);
    if (vl(X / 9, Y / 4, seed + 5, 0.4, 0, t) > 0.66) c = lerp(c, hex("#dce8ec"), 0.35);                                         // a cloud
    if (r > 0.86 && j < 0) c = lerp(c, on === "road" ? hex("#3e2e1e") : hex("#263e22"), 0.65);                                  // its north lip shades it
    if (r > 0.92 && j > 0) c = lerp(c, hex("#d8e4e4"), 0.3);                                                                     // the wet edge catches light
    if (Math.abs(Math.sin((r - t) * 6 * Math.PI)) < 0.08 && r < 0.75 && hs(seed, 9) > 0.4) c = lerp(c, hex("#ffffff"), 0.2);             // a ring from a drip
    Pp.set(X, Y, c);
  }
  if (on === "grass") { tussock(Pp, X0 - rx * 2 + 1, Y0 - ry + 1, seed + 3); reedClump(Pp, X0 + rx * 2 - 2, Y0 + ry * 0.5, 9, seed + 4, false); }
  else for (let q = 0; q < 2; q++) { const yy = Y0 + (q ? 1 : -1) * ry * 0.6; for (let x = -rx * 2 - 6; x < -rx * 2 + 2; x++) Pp.set(X0 + x, yy, hex("#4a3420"), 0.4); }  // ruts running in
}

// ---------------- the shore's dressing (sprites along the edges) ----------------
function dressShores(Pp, F, sc, t, X0, Y0) {
  const { D, KIND, NEAR, NY, NX, BODY, S, w, h } = F;
  const items = [];
  // walk the shoreline: pixels with D just below 0
  const seen = new Set();
  for (let j = 3; j < h - 3; j++) for (let i = 3; i < w - 3; i++) {
    const k = j * w + i, d = D[k]; if (BODY[k] < 0 || d > 0 || d < -1) continue;
    const X = X0 + i, Y = Y0 + j, kind = KIND[k], near = NEAR[k], isNear = NY[k] > 0.35, cz = kind === "reeds" ? 5 : 7, cell = `${kind}${Math.floor(X / cz)},${Math.floor(Y / cz)}`;
    if (seen.has(cell)) continue; seen.add(cell);
    const r = hs(X, Y, 90);
    const inx = -NX[k], iny = -NY[k]; // into the water
    if (kind === "reeds") {
      if (r < 0.82) items.push({ y: Y + iny * 4, fn: () => reedClump(Pp, X + inx * 4, Y + iny * 4 + 3, 10 + hs(X, Y, 91) * 7, X * 31 + Y) });
      if (r < 0.5) { const dd = 12 + hs(X, Y, 92) * 20; items.push({ y: -1e4, fn: () => lily(Pp, X + inx * dd + (hs(X, Y, 93) - 0.5) * 10, Y + iny * dd, 2 + Math.round(hs(X, Y, 94) * 2), X + Y * 7) }); }
    } else if (kind === "lip") {
      if (r < 0.4) items.push({ y: Y, fn: () => tussock(Pp, X + inx * 1.5, Y + iny * 1.5 + 1, X * 13 + Y) });
      else if (r < 0.48 && !isNear) items.push({ y: Y, fn: () => reedClump(Pp, X + inx * 3, Y + iny * 3 + 2, 9, X + Y * 3, false) });
    } else if ((kind === "cut" || kind === "rock") && isNear && near === "reedtops") {
      if (r < 0.9) items.push({ y: Y + 6, fn: () => reedClump(Pp, X + inx * 5, Y + iny * 5 + 10, 12 + hs(X, Y, 95) * 5, X * 7 + Y) });
    } else if ((kind === "cut") && isNear && near === "overhang") {
      if (r < 0.35) items.push({ y: Y, fn: () => tussock(Pp, X + inx * 0.5, Y + iny * 0.5 + 1, X * 5 + Y) });
    } else if (kind === "rock") {
      if (r < 0.3) items.push({ y: Y + iny * 6, fn: () => boulder(Pp, X + inx * (fwOf(F, k) + 3), Y + iny * (fwOf(F, k) + 3), 2 + hs(X, Y, 96) * 3, X + Y, t) });
    } else if (kind === "beach" || kind === "sand") {
      if (r < 0.08) items.push({ y: Y, fn: () => boulder(Pp, X + inx * 3, Y + iny * 3, 1.5 + hs(X, Y, 97) * 1.5, X * 3 + Y, t) });
    }
  }
  return items;
}
const fwOf = (F, k) => faceW(F.KIND[k], F.NX[k], F.NY[k]);

// ---------------- the scene ----------------
export async function runScene(name, q) {
  const sc = SCENES[name]; if (!sc) throw new Error("no scene " + name);
  const log = [], DT = 1 / 60, t = +(q.get("t") || 0);
  setDay(sc.sun || "noon");
  selectRealm(sc.realm); selectFaction("greenwood"); setWaveWindow(null); setLevelWeather(null);
  const g = {
    run: { kills: 0, goldEarned: 0, towersBuilt: 0, leaks: 0 }, gold: 1e7, lives: 9999, wave: 3, phase: "build",
    towers: [], enemies: [], projectiles: [], effects: [], spawnQueue: [], spawnTimer: 0, speed: 1, paused: false,
    selectedId: null, buildMode: null, hover: null, time: 0, shake: 0, snapshot: null,
    cam: { zoom: 1, x: 0, y: 0 }, buildUntil: null, buildMenuOpen: false, victory: false, rush: false, bands: [], militiaCd: 0, freeplay: true,
  };
  for (const [kd, x0, y0, lv] of sc.towers || []) {
    let spot = null;
    for (let r = 0; r < 70 && !spot; r += 3) for (let a = 0; a < 6.28 && !spot; a += 0.4) { const x = x0 + Math.cos(a) * r, y = y0 + Math.sin(a) * r; if (buildableAt(g, x, y, kd)) spot = [x, y]; }
    if (!spot) { log.push("no spot " + kd); continue; }
    placeTower(g, kd, spot[0], spot[1]);
    const tw = g.towers[g.towers.length - 1]; for (let l = 1; l < lv; l++) upgradeTower(g, tw);
    tw.readyAt = 0; tw.raised = null; log.push(`${kd}@${spot.map(Math.round)}`);
  }
  for (let i = 0; i < 30; i++) updateGame(g, DT);
  startWave(g);
  for (let el = 0; el < (sc.anim ? 0 : sc.at); el += DT) { updateGame(g, DT); g.lives = 9999; if (g.phase !== "combat") startWave(g); }
  if (sc.anim) { g.enemies = []; g.projectiles = []; g.effects = []; }   // a loop shows the water, not a frozen wave
  const [cx0, cy0, cw, ch] = sc.crop;
  const X0 = cx0 * 2, Y0 = cy0 * 2, w = cw * 2, h = ch * 2;
  const crop = (cv) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(cv, X0, Y0, w, h, 0, 0, w, h); return c; };
  const finish = (small) => {
    const Z = 1680 / w, out = document.createElement("canvas"); out.width = w * Z; out.height = h * Z;
    const oc = out.getContext("2d"); oc.imageSmoothingEnabled = false; oc.drawImage(small, 0, 0, w * Z, h * Z);
    if (sc.label || sc.today) {
      const text = sc.today ? "TODAY (the game as it is)" : sc.label;
      oc.font = "bold 22px monospace"; const tw2 = Math.min(out.width - 20, oc.measureText(text).width + 24);
      oc.fillStyle = "rgba(16,18,24,0.78)"; oc.fillRect(10, 10, tw2, 36); oc.fillStyle = "#f4ead0"; oc.fillText(text, 22, 36, out.width - 44);
    }
    for (const [tx, ty, s] of sc.tags || []) { const px = (tx - cx0) * 2 * Z, py = (ty - cy0) * 2 * Z; oc.fillStyle = "rgba(16,18,24,0.8)"; oc.fillRect(px - 18, py - 18, 36, 36); oc.fillStyle = "#ffd86a"; oc.font = "bold 26px monospace"; oc.fillText(s, px - 8, py + 9); }
    return out;
  };
  if (sc.today) {
    const cv = document.createElement("canvas"); cv.width = 1680; cv.height = 1120;
    draw(g, cv, { current: null }); draw(g, cv, { current: null });
    return { canvas: finish(crop(cv)), log };
  }
  // keep the geometry, then take the old water away
  const rivers = RIVERS.map((r) => ({ w: r.w, segs: r.segs.map((s) => ({ ...s })) }));
  const bridges = BRIDGES.map((b) => ({ ...b }));
  RIVERS.length = 0; PONDS.length = 0;
  // the islet's tree: the game's own oak, added for the A render only
  const L = sc.lake ? LAKES[sc.lake] : null;
  if (L && L.islands.length) { const proto = DECOR.find((d) => d.t === "tree" && !d.forest); if (proto) for (const I of L.islands) DECOR.push({ ...proto, x: I.cx - 3, y: I.cy + 2, s: 0.5 }); }
  const cvA = document.createElement("canvas"); cvA.width = 1680; cvA.height = 1120;
  draw(g, cvA, { current: null }); draw(g, cvA, { current: null });
  const A = crop(cvA).getContext("2d").getImageData(0, 0, w, h).data;
  // B: the bare ground
  const keep = { towers: g.towers, enemies: g.enemies, bands: g.bands, projectiles: g.projectiles, effects: g.effects };
  Object.assign(g, { towers: [], enemies: [], bands: [], projectiles: [], effects: [] });
  const decorKeep = DECOR.splice(0), brKeep = BRIDGES.splice(0);
  const cvB = document.createElement("canvas"); cvB.width = 1680; cvB.height = 1120;
  draw(g, cvB, { current: null }); draw(g, cvB, { current: null });
  DECOR.push(...decorKeep); BRIDGES.push(...brKeep); Object.assign(g, keep);
  const bimg = crop(cvB).getContext("2d").getImageData(0, 0, w, h);
  const Bd = bimg.data;
  if (sc.anim) { LF = sc.anim.F; SWAY = { reeds: 1.6, grass: 0.9, lily: 1 }; } else { LF = 30; SWAY = { reeds: 0, grass: 0, lily: 0 }; }
  const frames = sc.anim ? Array.from({ length: LF }, (_, i) => i / LF) : sc.frames || [t];
  const F = buildField(sc, rivers, bridges, X0, Y0, w, h);
  log.push(`field ${F.bodies.length} bodies`);
  const SHADE = DAY.shade || [42, 28, 44];
  const NEARBR = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) { const x = (X0 + (k % w)) / 2, y = (Y0 + Math.floor(k / w)) / 2; for (const b of bridges) if (Math.hypot(x - b.x, y - b.y) < 46) NEARBR[k] = 1; }
  const outs = [];
  for (const ft of frames) {
    NOW = ft; const P = new Uint8ClampedArray(Bd), MOD = new Uint8Array(w * h);
    paintWater(P, F, sc, ft, X0, Y0, MOD);
    const Pp = canvasPainter(P, w, h, X0, Y0, MOD);
    const lights = [];
    const items = dressShores(Pp, F, sc, ft, X0, Y0);
    if (L) {
      for (const [x, y, r] of L.rocks) items.push({ y: y * 2, fn: () => boulder(Pp, x * 2, y * 2, r * 2, x + y, ft) });
      for (const [kd, x, y] of L.birds) items.push({ y: y * 2 + 8, fn: () => {
        if (!sc.anim || kd === "heron") return bird(Pp, kd, x * 2 + (kd === "heron" ? 0 : (x > L.cx ? -1 : 1) * ft * 8), y * 2, ft, x > L.cx);
        // loops: a bird can't cross the frame in 3 s, so the swan turns a slow circle and the ducks idle about a spot
        const ph = TAU * ft + x * 0.7, rx = kd === "swan" ? 7 : 2.5, ry = kd === "swan" ? 2.5 : 1;
        bird(Pp, kd, x * 2 + Math.round(rx * Math.cos(ph)), y * 2 + Math.round(ry * Math.sin(ph)), ft, Math.sin(ph) < 0);
      } });
      for (const [px, py, dx, dy, n] of L.prints || []) items.push({ y: -1e4 + 1, fn: () => { for (let i = 0; i < n; i++) { const fx = px * 2 + dx * i * 5, fy = py * 2 + dy * i * 5 + (i & 1 ? 2 : -1) + Math.sin(i * 0.7) * 2; const e = -F.D[(Math.round(fy) - Y0) * w + Math.round(fx) - X0]; if (!(e > -14 && e < 9)) continue; Pp.set(fx, fy, SAND[1]); Pp.set(fx + 1, fy, SAND[1]); Pp.set(fx, fy + 1, SAND[2]); } } });
      if (L.jetty) items.push({ y: L.jetty.y * 2, fn: () => jetty(Pp, L.jetty, ft, sc.dusk, lights, (X, Y) => { const i = Math.round(X) - X0, j = Math.round(Y) - Y0; return i < 0 || j < 0 || i >= w || j >= h ? 99 : -F.D[j * w + i]; }) });
    }
    for (const pd of sc.puddles || []) items.push({ y: -2e4, fn: () => puddle(Pp, F, pd, ft, DAY.id === "golden") });
    for (const rg of sc.rings || []) items.push({ y: -1.5e4, fn: () => ring(Pp, F, X0, Y0, rg, ft) });
    for (const [x, y, flip] of sc.paddlers || []) items.push({ y: y * 2 + 8, fn: () => paddler(Pp, x * 2, y * 2, ft, flip) });
    items.sort((a, b) => a.y - b.y); for (const it of items) it.fn();
    // lay the game's halls, figures, trees and bridge back on top
    for (let k = 0; k < w * h; k++) {
      const a0 = A[k * 4], a1 = A[k * 4 + 1], a2 = A[k * 4 + 2], b0 = Bd[k * 4], b1 = Bd[k * 4 + 1], b2 = Bd[k * 4 + 2];
      if (Math.abs(a0 - b0) + Math.abs(a1 - b1) + Math.abs(a2 - b2) < 4) continue;
      if (MOD[k] && !NEARBR[k]) {
        // a cast shadow is the ground pulled toward the sun's shade colour by some alpha: the same alpha in every channel
        const al = [0, 1, 2].map((c) => { const bb = Bd[k * 4 + c], aa = A[k * 4 + c], sh = SHADE[c]; return Math.abs(bb - sh) < 12 ? null : (bb - aa) / (bb - sh); }).filter((v) => v != null);
        const amx = Math.max(...al), amn = Math.min(...al);
        if (al.length >= 2 && amn > 0.04 && amx < 0.8 && amx - amn < 0.12) { const aa = (amx + amn) / 2; for (let c = 0; c < 3; c++) P[k * 4 + c] = P[k * 4 + c] + (SHADE[c] - P[k * 4 + c]) * aa; continue; }
      }
      P[k * 4] = a0; P[k * 4 + 1] = a1; P[k * 4 + 2] = a2;
    }
    if (sc.reflect) reflectTree(P, A, Bd, F, w, h, X0, Y0, sc.reflect, ft);
    if (sc.dusk) { for (const tw of g.towers) lights.push({ X: Math.round(tw.x * 2 + 7), Y: Math.round(tw.y * 2 - 12), r: 30, col: [255, 170, 80] }); duskPass(P, w, h, X0, Y0, lights, F, ft); }
    const img = new ImageData(P, w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").putImageData(img, 0, 0);
    outs.push(c);
  }
  if (sc.anim) {   // the sprite sheet: frames left to right, top to bottom, no gaps
    const cols = sc.anim.cols, rows = LF / cols, sheet = document.createElement("canvas"); sheet.width = w * cols; sheet.height = h * rows;
    const sx2 = sheet.getContext("2d"); outs.forEach((c, f) => sx2.drawImage(c, (f % cols) * w, Math.floor(f / cols) * h));
    return { canvas: sheet, still: outs[0], anim: { cols, rows, fps: sc.anim.fps }, outs, log };
  }
  if (sc.frames) {
    const [sx, sy, sw, sh] = sc.strip; // board units inside the crop
    const out = document.createElement("canvas"); out.width = sw * 4 * frames.length + 8 * (frames.length - 1); out.height = sh * 4 + 40;
    const oc = out.getContext("2d"); oc.imageSmoothingEnabled = false; oc.fillStyle = "#20242c"; oc.fillRect(0, 0, out.width, out.height);
    outs.forEach((c, f) => { oc.drawImage(c, (sx - cx0) * 2, (sy - cy0) * 2, sw * 2, sh * 2, f * (sw * 4 + 8), 40, sw * 4, sh * 4); });
    oc.fillStyle = "#f4ead0"; oc.font = "bold 20px monospace"; oc.fillText(sc.label, 10, 26);
    return { canvas: out, log };
  }
  return { canvas: finish(outs[0]), log };
}

// ---------------- loop extras ----------------
// a ring on still water (a rising fish, a drop, an insect): [x, y, phase, R (art px), splash]; it opens and fades
// inside one loop, so the wrap is seamless (u = 0 and u = 1 both show nothing)
function ring(Pp, F, X0, Y0, [x, y, ph, R, splash], t) {
  const u = (((t + ph) % 1) + 1) % 1, life = 0.75; if (u >= life) return;
  const k = u / life, r = 1.5 + k * R, al = 0.55 * (1 - k) * (k < 0.08 ? k / 0.08 : 1), X = x * 2, Y = y * 2;
  const n = Math.max(12, Math.round(r * 5));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, px = Math.round(X + Math.cos(a) * r), py = Math.round(Y + Math.sin(a) * r * 0.5);
    const kk = (py - Y0) * F.w + (px - X0); if (kk < 0 || kk >= F.D.length || F.D[kk] > -1) continue;
    Pp.set(px, py, Math.sin(a) > 0 ? FOAM2 : FOAM, Math.sin(a) > 0 ? al : al * 0.7);
  }
  if (k < 0.5 && r > 5) { const r2 = r * 0.55; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; if (i % 2) continue; Pp.set(X + Math.cos(a) * r2, Y + Math.sin(a) * r2 * 0.5, FOAM2, al * 0.6); } }
  if (splash && u < 0.06) { Pp.set(X, Y - 1, FOAM); Pp.set(X - 1, Y, FOAM2); Pp.set(X + 1, Y, FOAM2); if (u < 0.03) Pp.set(X, Y - 2, FOAM); }
}
// a duck paddling against the current, holding its place: it surges a pixel or two and drops back; ripples run
// off its tail in a V and go downstream (flip: facing right = upstream is to the right)
function paddler(Pp, X, Y, t, flip) {
  const dx = Math.round(1.5 * Math.sin(TAU * t)), x = X + (flip ? dx : -dx);
  for (let r = 1; r < 16; r++) {
    const pulse = 0.5 + 0.5 * Math.cos(TAU * (r / 5 - 2 * t)); if (pulse < 0.45) continue;   // ripples leaving the tail, 2 a loop
    const tx = flip ? x - r : x + 8 + r, spread = Math.round(r * 0.38), al = (0.6 - r * 0.035) * pulse;
    Pp.set(tx, Y + 4 + spread, FOAM2, al); Pp.set(tx, Y + 4 - spread, FOAM2, al * 0.7);
  }
  const map = DUCK, C = { g: hex("#1e6a3e"), G: hex("#3aa060"), k: hex("#101010"), e: hex("#f0c040"), b: hex("#b08458"), B: hex("#6a4428"), w: hex("#f2f0e8") };
  const bob = Math.sin(TAU * 2 * t) > 0.5 ? 1 : 0;
  map.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") Pp.set(x + (flip ? row.length - 1 - i : i), Y + j - 2 + bob, C[ch]); }));
  for (let i = -1; i <= 8; i++) Pp.set(x + i, Y + 5, FOAM2, (i + Math.round(t * 6)) % 3 === 0 ? 0.6 : 0.25);   // paddling feet stir the water
}
// a tree's reflection on the water below it, wobbling: [baseX, baseY (board), height (art px)]
function reflectTree(P, A, Bd, F, w, h, X0, Y0, [bx, by, wy, H], t) {
  // mirrored about the tree's foot, laid from the islet's waterline (wy) down
  const Yb = Math.round(by * 2) - Y0, Yw = Math.round(wy * 2) - Y0;
  for (let j = Yw; j < Math.min(h, Yw + H); j++) {
    const wob = Math.round(Math.sin(TAU * (2 * t) + j * 0.55) * (0.6 + (j - Yw) / 14));
    const js = Yb - (j - Yw) - 2; if (js < 0) continue;
    for (let i = 0; i < w; i++) {
      const k = j * w + i; if (F.D[k] > -2 || F.BODY[k] < 0) continue;
      const is = i + wob; if (is < 0 || is >= w) continue; const ks = js * w + is;
      if (Math.abs(A[ks * 4] - Bd[ks * 4]) + Math.abs(A[ks * 4 + 1] - Bd[ks * 4 + 1]) + Math.abs(A[ks * 4 + 2] - Bd[ks * 4 + 2]) < 12) continue;
      if (Math.abs(bx * 2 - X0 - i) > 34) continue;
      if (((j - Yb) % 5 === 2) && Math.sin(TAU * t + i * 0.3) > 0.2) continue;                                       // ripples break it up
      const fa = 0.55 * (1 - (j - Yw) / H);
      for (let c = 0; c < 3; c++) P[k * 4 + c] = P[k * 4 + c] + (A[ks * 4 + c] * 0.7 - P[k * 4 + c]) * fa;
    }
  }
}

// ---------------- dusk: the board sinks into blue, lamps add light (stepped, dithered, as nightlight.js does) ----------------
function duskPass(P, w, h, X0, Y0, lights, F, t) {
  const tint = [0.42, 0.46, 0.68];
  for (let k = 0; k < w * h; k++) { P[k * 4] *= tint[0]; P[k * 4 + 1] *= tint[1]; P[k * 4 + 2] *= tint[2]; }
  // the sky's last light on open water: a cool lilac sheen
  for (let k = 0; k < w * h; k++) if (F.D[k] < -6 && F.BODY[k] >= 0) { const X = X0 + (k % w), Y = Y0 + Math.floor(k / w), a = 0.5 + 0.5 * vn(X / 120, Y / 30, 7); P[k * 4] += 16 * a; P[k * 4 + 1] += 10 * a; P[k * 4 + 2] += 20 * a; }
  // cottage lights and torches the game would carry at night: here a lamp at each hall's door
  for (const L of lights) {
    for (let j = -L.r; j <= L.r; j++) for (let i = -L.r; i <= L.r; i++) {
      const rr = Math.hypot(i, j / 0.55) / L.r; if (rr > 1) continue;
      const lv = Math.floor((1 - rr) * 4 + bay(i + 64, j + 64) * 0.999) / 4; if (lv <= 0) continue;
      const X = L.X + i - X0, Y = L.Y + j - Y0 + 6; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const k = Y * w + X; P[k * 4] += L.col[0] * lv * 0.42; P[k * 4 + 1] += L.col[1] * lv * 0.34; P[k * 4 + 2] += L.col[2] * lv * 0.18;
    }
    // the bloom round the flame
    for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) { const rr = Math.hypot(i, j) / 5; if (rr > 1) continue; const X = L.X + i - X0, Y = L.Y + j - Y0; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const k = Y * w + X, a = (1 - rr) * 0.8; P[k * 4] += 255 * a; P[k * 4 + 1] += 200 * a; P[k * 4 + 2] += 110 * a; }
    // its reflection: a broken vertical streak on the water below
    if (L.water) for (let j = 0; j < 46; j++) { const wob = Math.round(Math.sin(j * 0.9 + t * 12) * (1 + j / 16)); for (let i = -2; i <= 2; i++) {
      if (Math.abs(i) === 2 && hs(j, i, 5) > 0.5) continue; if (hs(j, Math.floor(t * 8), 6) > 0.8 - j / 80) continue;
      const X = L.water.X + i + wob - X0, Y = L.water.Y + j - Y0; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const k = Y * w + X; if (F.D[k] > -1) continue;
      const a = (1 - j / 46) * (i === 0 ? 0.9 : 0.5); P[k * 4] += 240 * a; P[k * 4 + 1] += 170 * a; P[k * 4 + 2] += 80 * a; } }
  }
}
