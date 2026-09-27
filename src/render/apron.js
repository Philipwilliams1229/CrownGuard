// ============ RENDER: THE APRON ============
// The world beyond the board. On a screen whose shape isn't the board's 3:2,
// the strip the board doesn't cover (usually on its left, sometimes above or
// below it) is filled with MORE OF THE REALM: its ground running on past the
// board's edges, the road leaving by the spawn edge, rivers and the sea
// carrying on, and the realm's own scenery thickening away from the field —
// Greenwood's wood, Frostfang's snowy pines, the fens' dead trees and bog
// pools, the Wastes' obsidian and embers, the Marches' pines and crags.
// Nothing can be built out here; it is only picture.
//
//   paintApron(canvas, { cssW, cssH, dpr, board: { x, y, w, h } })
//
// `canvas` sits BEHIND the board and covers the whole play area (cssW x cssH
// css px); `board` is the css-px rect the board's full 840x560 world is drawn
// into (x/y may be negative when its border is trimmed off-screen). Painted
// once per (realm, size, board rect) and cached on the canvas — call it on
// every resize or realm change; a repeat call with the same inputs is free.
//
// How the join stays invisible: the ground is world.js's own tone map, cut
// into its turfTones (tone by tone, cool / plain / warm by the sun on the
// swells) and frayed in its own dither on the BOARD's pixel grid; within ~30
// world units of the board it is evaluated on world.js's own noise lattice,
// so it is the board's field, and its fleck layer carries on, thinning. The
// sea and the beach are coast.js's pixels (coastPixel), the rivers water.js's
// (drawRiver, baked into the ground at its grain), the road road.js's
// (paintRoadStrip, in the direction of march) with the Marches' flags laid on
// it and the Iron camp's dark carried down it. The gate's crag carries on
// past the edge as the same heightfield, drawn the way the board draws it.
// Board trees whose sprites cross an edge are drawn here in full, so their
// outer halves carry on; the realm's light (tint, glow, vignette) is laid on
// in the board's own world coordinates, so the grade runs straight across
// the seam. Then it all falls away — a little darker, a little quieter — the
// farther it lies from the board. A big apron is painted coarser, with a band
// at the board's grain all round the seam, frayed at its outer edge.

import { W, H, RES, PATH_HALF, WALL_W } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { PTS } from "../engine/path.js";
import { DECOR, RIVERS, FOREST, COAST, forestDepthAt, seaDepthAt } from "../data/terrain.js";
import { drawTree, drawRiver } from "./scenery.js";
import { IRON_ART } from "./scenery-iron.js";
import { HOLLOW_ART } from "./scenery-hollow.js";
import { drawCastle } from "./castle.js";
import { wallDrums, GATE_TOWER_N, GATE_TOWER_S, TOWER } from "../data/castle.js";
import { mix, darken, lighten, rgba, hash, stone, shadow, blobBall, bakeSprite, part, PX } from "./paint.js";
import { turfTones } from "./world.js";
import { groundKind, pixelTuft } from "./groundblend.js";
import { paintRoadStrip } from "./road.js";
import { coastTones, coastPixel } from "./coast.js";
import { gateCrag, hasCrag } from "../data/gatecrag.js";

// ---- shared bits -----------------------------------------------------------

const hexRGB = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

// value noise on an unbounded lattice (the board's own lattice stops a few
// cells past its edges; the apron runs on for as far as the screen needs)
const vnoise = (seed, cell, x, y) => {
  const fx = x / cell, fy = y / cell, xi = Math.floor(fx), yi = Math.floor(fy);
  let u = fx - xi, v = fy - yi;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = hash(seed + xi * 7919, yi), b = hash(seed + (xi + 1) * 7919, yi);
  const c = hash(seed + xi * 7919, yi + 1), d = hash(seed + (xi + 1) * 7919, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
};

// world.js's own lattice noise, evaluated on the fly: its lattice runs three
// cells past the board's top/left edges and five past the others, so just
// outside the board this IS the board's ground field, and the seam has
// nothing to show
const boardNoise = (seed, cell, x, y) => {
  const gw = Math.ceil(W / cell) + 8, gh = Math.ceil(H / cell) + 8;
  const fx = Math.max(0, x / cell + 3), fy = Math.max(0, y / cell + 3);
  const xi = Math.min(gw - 2, fx | 0), yi = Math.min(gh - 2, fy | 0);
  let u = Math.min(1, fx - xi), v = Math.min(1, fy - yi);
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const i = yi * gw + xi;
  return (hash(seed, i) * (1 - u) + hash(seed, i + 1) * u) * (1 - v) + (hash(seed, i + gw) * (1 - u) + hash(seed, i + gw + 1) * u) * v;
};

// how far outside the board (x, y) lies, in world units (0 inside)
const outside = (x, y) => {
  const dx = x < 0 ? -x : x > W ? x - W : 0, dy = y < 0 ? -y : y > H ? y - H : 0;
  return dx && dy ? Math.hypot(dx, dy) : dx + dy;
};

// ---- what each country looks like past its edges ---------------------------
// `big`: the landmarks, weighted; `dense`: how thick they get far out;
// `near`: how thick right at an open (non-forest) board edge; `cell`: the
// grid they're sown on; `floor`: dark woodland floor under the thick of it;
// `low`: the small stuff between them.
const BIOMES = {
  green: { big: { tree: 5, pine: 4, rock: 0.4 }, dense: 0.95, near: 0.18, cell: 17, floor: true, low: "meadow" },
  burnt: { big: { deadtree: 5, pine: 1.5, rock: 1 }, dense: 0.7, near: 0.15, cell: 20, floor: true, low: "cinder" },
  frost: { big: { snowpine: 6, icerock: 1.6, crystal: 0.4 }, dense: 0.8, near: 0.15, cell: 19, floor: false, low: "drift" },
  marsh: { big: { willow: 3, deadtree: 2, mushroom: 0.3, reeds: 1.5 }, dense: 0.7, near: 0.15, cell: 21, floor: true, low: "bog" },
  fen: { big: { deadtree: 5, reeds: 1.6, cairn: 0.3, gravestone: 0.2 }, dense: 0.62, near: 0.12, cell: 21, floor: false, low: "bog" },
  ash: { big: { obsidian: 4, deadtree: 1.6, vent: 0.35 }, dense: 0.45, near: 0.1, cell: 25, floor: false, low: "ember" },
  iron: { big: { pine: 5, rock: 3, tree: 0.8 }, dense: 0.78, near: 0.14, cell: 19, floor: true, low: "crag" },
};
// landmark types a realm's own recipe may add to the mix (camps, banners and
// watchtowers belong to the field, not the country beyond it)
const LANDSCAPE = new Set(["tree", "pine", "snowpine", "deadtree", "willow", "rock", "icerock", "obsidian", "mushroom", "reeds", "cairn", "crystal"]);
const TALL = new Set(["tree", "pine", "snowpine", "willow", "deadtree"]);
// a chapter's own pieces join in: scenery-iron.js / scenery-hollow.js may carry
// `apron: { biome, big, landscape: [types], tall: [types] }` — `big` replaces
// that biome's landmark mix, `landscape` lets its recipes' pieces out here,
// `tall` marks the ones that stand like trees
// (joined on first paint, not at load: the registries sit in an import cycle)
let joined = false;
const joinChapters = () => {
  if (joined) return;
  joined = true;
  for (const { apron } of [IRON_ART, HOLLOW_ART]) {
    if (!apron) continue;
    if (apron.biome && apron.big && BIOMES[apron.biome]) BIOMES[apron.biome] = { ...BIOMES[apron.biome], big: apron.big };
    for (const t of apron.landscape || []) LANDSCAPE.add(t);
    for (const t of apron.tall || []) TALL.add(t);
  }
};
// the edge wood's own mix (map.wood), or the greenwood's oaks and pines
const woodPick = (R, h) => {
  const types = R.wood?.types;
  if (!types) return h < 0.68 ? "tree" : "pine";
  const tot = types.reduce((a, [, w]) => a + w, 0);
  let acc = 0;
  for (const [t, w] of types) { acc += w / tot; if (h < acc) return t; }
  return types[types.length - 1][0];
};

const biomeOf = (R) => {
  switch (R.ambient) {
    case "snow": return "frost";
    case "fireflies": return "marsh";
    case "wisps": return "fen";
    case "dust": return "iron";
    case "embers": return R.spawn === "grove" ? "burnt" : "ash";
    default: return "green";
  }
};

// the realm's landmark mix: its biome's, plus whatever its recipe favours
const mixFor = (R, B) => {
  const w = { ...B.big };
  // trees and stones carry their weight; the odd cairn or toadstool stays odd
  const MINOR = new Set(["cairn", "mushroom", "reeds", "crystal"]);
  for (const t of R.decorRecipe?.types || []) if (LANDSCAPE.has(t)) w[t] = (w[t] || 0) + (MINOR.has(t) ? 0.3 : 1.2);
  for (const d of R.decor || []) if (LANDSCAPE.has(d.t)) w[d.t] = (w[d.t] || 0) + 0.25;
  const list = Object.entries(w), total = list.reduce((a, [, v]) => a + v, 0);
  return (h) => { let acc = 0; for (const [t, v] of list) { acc += v / total; if (h < acc) return t; } return list[list.length - 1][0]; };
};

// a piece's rough reach from its foot, in world units: [half width, up, down]
const reachOf = (t, s) => (TALL.has(t) ? [17 * s, 50 * s, 10] : [13 * s, 24 * s, 8]);

// ---- the road and rivers, carried on off the board -------------------------

// A gentle wander that keeps heading away from the board.
const runOut = (x, y, ang, seed, len = 1400, step = 8, calm = 60) => {
  const pts = [];
  for (let s = step; s <= len; s += step) {
    const k = smooth((s - calm) / 160);
    const a = ang + k * (0.32 * Math.sin(s * 0.0065 + seed) + 0.14 * Math.sin(s * 0.019 + seed * 2.1));
    x += Math.cos(a) * step; y += Math.sin(a) * step;
    pts.push([x, y]);
  }
  return pts;
};

// Where the road leaves by the spawn edge, it carries on out of the realm.
const roadOut = () => {
  if (!PTS.length) return null;
  const [x0, y0] = PTS[0];
  if (x0 > 30 && y0 > 30) return null;
  let j = 1;
  while (j < PTS.length - 1 && Math.hypot(PTS[j][0] - x0, PTS[j][1] - y0) < 24) j++;
  const ang = Math.atan2(y0 - PTS[j][1], x0 - PTS[j][0]);
  return [[x0, y0], ...runOut(x0, y0, ang, (REALM.seed % 71) * 0.3)];
};

const segsOf = (pts) => {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], len = Math.hypot(x2 - x1, y2 - y1);
    if (len > 0.001) segs.push({ x1, y1, x2, y2, len });
  }
  return segs;
};
const distSegs = (segs, x, y) => {
  let best = Infinity;
  for (const s of segs) {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
    const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / (s.len * s.len)));
    const d = Math.hypot(x - (s.x1 + vx * t), y - (s.y1 + vy * t));
    if (d < best) best = d;
  }
  return best;
};

// The road's polyline, bucketed (cells of CB world units, each listing the
// segments within reach), so the many "how far from the road" questions
// (the verge's shade, the paving, what may stand where) ask only the few
// segments near them. dist() also leaves the nearest point's distance along
// the road (from its board end) in `.al` and its signed offset in `.v`.
const roadIndex = (pts) => {
  const n = pts.length, cum = new Float32Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  // (each segment's start, run, 1/length² and length, as flat arrays)
  const SX = new Float64Array(n), SY = new Float64Array(n), VX = new Float64Array(n), VY = new Float64Array(n), IL2 = new Float64Array(n), LEN = new Float64Array(n);
  for (let i = 0; i < n - 1; i++) {
    SX[i] = pts[i][0]; SY[i] = pts[i][1]; VX[i] = pts[i + 1][0] - SX[i]; VY[i] = pts[i + 1][1] - SY[i];
    const L2 = VX[i] * VX[i] + VY[i] * VY[i]; IL2[i] = L2 > 0 ? 1 / L2 : 0; LEN[i] = Math.sqrt(L2) || 1;
  }
  const CB = 24, M = PATH_HALF + 36, buckets = new Map(), bk = (cx, cy) => (cx + 4096) * 8192 + cy + 4096;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    for (let cx = Math.floor((Math.min(x1, x2) - M) / CB); cx <= Math.floor((Math.max(x1, x2) + M) / CB); cx++)
      for (let cy = Math.floor((Math.min(y1, y2) - M) / CB); cy <= Math.floor((Math.max(y1, y2) + M) / CB); cy++) {
        const key = bk(cx, cy); let l = buckets.get(key); if (!l) buckets.set(key, (l = [])); l.push(i);
      }
  }
  const I = { pts, cum, CB, buckets, bk, al: 0, v: 0, total: cum[n - 1],
    // (1e9 past the buckets' reach)
    dist(x, y, l = buckets.get(bk(Math.floor(x / CB), Math.floor(y / CB)))) {
      if (!l) return 1e9;
      let best = 1e9, bi = -1, bt = 0;
      for (let q = 0; q < l.length; q++) {
        const i = l[q], x1 = SX[i], y1 = SY[i], vx = VX[i], vy = VY[i];
        let t = ((x - x1) * vx + (y - y1) * vy) * IL2[i];
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = x - x1 - vx * t, ey = y - y1 - vy * t, dd = ex * ex + ey * ey;
        if (dd < best) { best = dd; bi = i; bt = t; }
      }
      if (bi >= 0) { I.al = cum[bi] + bt * LEN[bi]; I.v = (VX[bi] * (y - SY[bi]) - VY[bi] * (x - SX[bi])) / LEN[bi]; }
      return Math.sqrt(best);
    },
  };
  return I;
};

// A river that runs off the left, top or bottom edge keeps running (the
// right-hand end goes under the castle's bailey and stays there).
const riversOut = () => RIVERS.map((rv, i) => {
  const pts = rv.pts;
  const off = ([x, y]) => x < 0 || y < 0 || y > H;
  const grow = (a, b) => runOut(a[0], a[1], Math.atan2(a[1] - b[1], a[0] - b[0]), i * 3.1 + 1.7, 1400, 10, 30);
  const head = off(pts[0]) ? grow(pts[0], pts[Math.min(2, pts.length - 1)]).reverse() : [];
  const n = pts.length;
  const tail = off(pts[n - 1]) ? grow(pts[n - 1], pts[Math.max(0, n - 3)]) : [];
  const all = [...head, ...pts, ...tail];
  return { pts: all, w: rv.w, segs: segsOf(all) };
});

// ---- small things ----------------------------------------------------------

// a low bush, three lit clumps inked along their undersides (as world.js
// dresses the wood's hem). Baked once per tint.
const BUSHES = new Map();
const bushSprite = (leaf, v) => {
  const key = leaf + v;
  if (BUSHES.has(key)) return BUSHES.get(key);
  const cv = bakeSprite(28, 20, (c) => {
    shadow(c, 16, 15, 11, 3, 0.26);
    const lobes = [[8, 12, 6], [20, 12, 5.5], [14, 9, 7]];
    lobes.forEach(([x, y, r], i) => part(c, (cc) => blobBall(cc, x + (hash(v, i) - 0.5) * 2, y, r, r * 0.8, i === 2 ? lighten(leaf, 0.08) : leaf, v * 9 + i, { hi: 0.45, lo: 0.5, wobble: 0.2, n: 9 }), { ink: "under" }));
    c.fillStyle = lighten(leaf, 0.4);
    for (let i = 0; i < 5; i++) c.fillRect(Math.round((9 + hash(v, i + 5) * 9) * PX) / PX, Math.round((6 + hash(v, i + 9) * 5) * PX) / PX, 1, 0.5);
  });
  BUSHES.set(key, cv);
  return cv;
};
const bush = (ctx, x, y, k, leaf, v) => ctx.drawImage(bushSprite(leaf, v), x - 14 * k, y - 14 * k, 28 * k, 20 * k);

// a snow drift: a long low mound in the ground's own snow, blue in its lee
const drift = (ctx, x, y, s, seed, R) => {
  // (its lee a flat stepped shade, not a soft halo)
  ctx.fillStyle = rgba(darken(R.GRASS_DK, 0.25), 0.22);
  ctx.beginPath(); ctx.ellipse(x + 2, y + 1.5, 13 * s, 2.4 * s, 0, 0, Math.PI * 2); ctx.fill();
  blobBall(ctx, x, y, 14 * s, 3 * s, mix(R.GRASS_LT, "#f4f8fa", 0.5), seed, { hi: 0.55, lo: 0.3, wobble: 0.28, n: 12 });
};
// a bog pool: black water in a sodden rim, a glint of sky
const pool = (ctx, x, y, s, seed, R) => {
  const wa = R.water || { deep: "#22302c", edge: "#2f423c", shine: "#4a6a58" };
  blobBall(ctx, x, y, 13 * s, 5.5 * s, darken(R.GRASS_DK, 0.35), seed, { hi: 0, lo: 0, wobble: 0.16, n: 11 });
  blobBall(ctx, x + 0.5, y + 0.4, 11 * s, 4.3 * s, wa.deep, seed + 1, { hi: 0, lo: 0, wobble: 0.16, n: 11 });
  ctx.fillStyle = rgba(wa.shine, 0.5);
  ctx.fillRect(Math.round((x - 5 * s) * PX) / PX, Math.round((y - 1.5 * s) * PX) / PX, 4 * s, 0.5);
};

// a clump of grass as pixel blades (groundblend.js pixelTuft, as the board's
// meadow grows them), straight into the pixels of the sprite being baked,
// its foot a touch of shade
const ptuft = (ctx, x, y, s, cols, seed, n) => {
  const cv = ctx.canvas, CW = cv.width, img = ctx.getImageData(0, 0, CW, cv.height), d = img.data;
  const C4 = cols.map(hexRGB);
  const put = (px, py, c) => { if (px < 0 || py < 0 || px >= CW || py >= cv.height) return; const o = (py * CW + px) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; };
  const shade = (px, py) => { if (px < 0 || py < 0 || px >= CW || py >= cv.height) return; const o = (py * CW + px) * 4; if (!d[o + 3]) { d[o] = 20; d[o + 1] = 24; d[o + 2] = 18; d[o + 3] = 56; } };
  pixelTuft(put, shade, Math.round(x * PX), Math.round(y * PX), s, seed, C4, n ? { n } : {});
  ctx.putImageData(img, 0, 0);
};
// each kind of country's tuft colours, root to tip (world.js's tuftCols)
const tuftColsOf = (R, kind) => kind === "drift" ? ["#6e6a5c", "#9a947e", "#c4bca0", "#e2dac4"]
  : kind === "cinder" ? [mix(R.GRASS_DK, "#3a2e22", 0.3), mix(R.GRASS_DK, "#6e6050", 0.5), "#8e7e66", mix(R.GRASS_LT, "#c8a860", 0.4)]
  : kind === "bog" ? [R.TUFT || R.GRASS_DK, mix(R.GRASS, R.TUFT || R.GRASS_DK, 0.3), mix(R.GRASS_LT, "#c8bc88", 0.35), mix(R.GRASS_LT, "#e0d49c", 0.5)]
  : [R.TUFT || R.GRASS_DK, mix(R.TUFT || R.GRASS_DK, R.GRASS, 0.55), mix(R.GRASS, R.GRASS_LT, 0.6), lighten(R.GRASS_LT, 0.22)];

// The small stuff between the landmarks, sown thicker the farther out.
function paintLow(ctx, kind, R, x, y, h, dens) {
  const cols = tuftColsOf(R, kind), sd = Math.round(h * 997);
  switch (kind) {
    case "meadow": {
      const leaf = mix(R.GRASS_DK, "#3f7a40", 0.5);
      if (h < 0.3 * dens + 0.05) bush(ctx, x, y, 0.75 + hash(h * 1e4, 1) * 0.4, hash(h * 1e4, 2) < 0.5 ? leaf : lighten(leaf, 0.1), Math.floor(hash(h * 1e4, 3) * 3));
      else ptuft(ctx, x, y, 0.45 + h * 0.4, cols, sd);
      break;
    }
    case "cinder":
      if (h < 0.25) stone(ctx, x, y, 1.6, 1.1, "#3a302c");
      else ptuft(ctx, x, y, 0.4 + h * 0.35, cols, sd, 3);
      break;
    case "drift":
      if (h < 0.35) drift(ctx, x, y, 0.55 + h, Math.round(h * 991), R);
      else if (h < 0.7) ptuft(ctx, x, y, 0.4 + h * 0.3, cols, sd, 2);
      else stone(ctx, x, y, 2, 1.3, "#9fb4c2");
      break;
    case "bog":
      if (h < 0.22 * dens + 0.06) pool(ctx, x, y, 0.6 + h * 0.6, Math.round(h * 991), R);
      else ptuft(ctx, x, y, 0.55 + h * 0.45, cols, sd, 5);
      break;
    case "ember": {
      const X = Math.round(x * PX) / PX, Y = Math.round(y * PX) / PX, a = 1 / PX;
      if (h < 0.4) {
        ctx.fillStyle = rgba("#8a8078", 0.55);
        ctx.fillRect(X, Y, Math.round((1.5 + h * 3) * PX) / PX, a);
      } else if (h < 0.62) {
        // a live coal: a hot pixel in a plus of dull glow (no soft halo)
        ctx.fillStyle = "rgba(200,84,40,0.45)";
        ctx.fillRect(X - a, Y, 3 * a, a); ctx.fillRect(X, Y - a, a, 3 * a);
        ctx.fillStyle = h < 0.5 ? "#f0a040" : "#e0602c";
        ctx.fillRect(X, Y, a, a);
      } else stone(ctx, x, y, 1.8 + h, 1.2 + h * 0.6, "#2e2830");
      break;
    }
    case "crag":
      if (h < 0.45) stone(ctx, x, y, 2 + h * 3, 1.4 + h * 2, mix("#8a8a84", R.GRASS_DK, 0.2));
      else ptuft(ctx, x, y, 0.4 + h * 0.4, cols, sd);
      break;
  }
}

// The small stuff is stamped, not painted: each look (eight per kind, three
// thicknesses of cover) is baked once per realm into a little un-inked sprite.
const LOWS = new Map();
function stampLow(ctx, kind, R, x, y, h, dens) {
  const hv = Math.floor(h * 8), dv = Math.min(2, Math.floor(dens * 3));
  const key = `${kind}|${R.id}|${hv}|${dv}`;
  let cv = LOWS.get(key);
  if (!cv) {
    if (LOWS.size > 400) LOWS.clear();
    cv = bakeSprite(36, 24, (c) => paintLow(c, kind, R, 18, 16, (hv + 0.5) / 8, (dv + 0.5) / 3), false);
    LOWS.set(key, cv);
  }
  ctx.drawImage(cv, x - 18, y - 16, 36, 24);
}

// ---- the ground ------------------------------------------------------------
// The board's own turf, carried on: world.js's tone map (the same warped noise,
// on its own lattice near the board, an unbounded one farther out), cut into
// the realm's turfTones — tone by tone, cool / plain / warm by the sun on the
// swells — and frayed in the turf's own dither (DITH, or DITH_WIND on snow and
// ash) indexed by the BOARD's pixel grid, so right at the edge every pixel is
// the one the board would have painted. The sea and the beach are coast.js's
// own pixels (coastPixel). Then the turf's fleck layer, thinning with
// distance, and the gate's crag carried on past the edge.

// value noise that is the board's own lattice at the seam and the unbounded
// one `wf` of the way out
const fieldNoise = (seed, cell, x, y, wf) => (wf <= 0 ? boardNoise(seed, cell, x, y) : wf >= 1 ? vnoise(seed, cell, x, y) : boardNoise(seed, cell, x, y) * (1 - wf) + vnoise(seed, cell, x, y) * wf);

// each country's crag (scenery.js cragMat): its stone and what grows on it
const cragMatOf = (R) => {
  const grove = R.spawn === "grove";
  if (R.ambient === "snow") return { rock: "#8d9eae", moss: null, snow: true, bare: true };
  if (R.ambient === "embers" && !grove) return { rock: "#4c4454", moss: null, lava: "#f08a3c", bare: true };
  if (R.ambient === "fireflies") return { rock: "#77766a", moss: "#56753c" };
  return { rock: "#9b958a", moss: mix("#5d8f3a", R.GRASS_DK, 0.3) };
};
const INK_C = [36, 26, 38], SHADOW_C = [28, 20, 30];

// The apron's ground, `r` pixels per world unit, over the world rect
// [vx0, vx0 + gw/r) x [vy0, vy0 + gh/r). Pixels under the board are left
// clear. `road`: the road carried off the board ({ pts, segs }) or null.
function paintGround(vx0, vy0, gw, gh, r, dens, road) {
  const R = REALM, seed = R.seed | 0;
  let T0 = performance.now();
  const cv = document.createElement("canvas");
  cv.width = gw; cv.height = gh;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(gw, gh), d = img.data;
  const TT = turfTones(R), look = TT.look, DZ = TT.dith, lee = !!look.lee;
  const kind = groundKind(R);
  joinChapters();
  const B0 = BIOMES[biomeOf(R)], shadeK = B0.floor ? 0.16 : 0.05;

  // ---- the fields, every G world units (the board's own FS grid) ----
  const G = r < 1.5 ? 4 : 2, HS = G === 2 ? 2 : 1;
  const ux0 = Math.floor(vx0 / G) * G - 2 * G, uy0 = Math.floor(vy0 / G) * G - 2 * G;
  const UW = Math.ceil(gw / r / G) + 7, UH = Math.ceil(gh / r / G) + 7, N = UW * UH;
  const tone = new Float32Array(N), swell = new Float32Array(N), sun = new Float32Array(N);
  const sea = COAST ? new Float32Array(N) : null, wood = FOREST ? new Float32Array(N) : null, pools = FOREST ? new Float32Array(N) : null;
  const L1 = seed + 11, L2 = seed + 23, L3 = seed + 37, Wa = seed + 41, Wb = seed + 53, Ld = seed + 67, Le = seed + 71;
  // the road's shade on the grass beside it (the board darkens 16 units of
  // verge): a coarse distance first, the fine one only near it
  const roadD = !road ? null : (x, y) => road.I.dist(x, y) - PATH_HALF;
  // the board's lone trees near an edge cast their shade on out
  const nearDecor = DECOR.filter((q) => !q.forest && (q.x < 40 || q.y < 40 || q.x > W - 40 || q.y > H - 40));
  for (let j = 0; j < UH; j++) {
    const y = uy0 + j * G;
    const rowIn = y > 14 && y < H - 14;
    for (let i = 0; i < UW; i++) {
      const x = ux0 + i * G;
      // (deep under the board nothing is needed but the sun's neighbours)
      if (rowIn && x > 14 && x < W - 14) { i = Math.max(i, Math.floor((W - 14 - ux0) / G) - 1); continue; }
      const od = outside(x, y), wf = smooth((od - 3) / 26), k = j * UW + i;
      const wx = (fieldNoise(Wa, 110, x, y, wf) - 0.5) * 44, wy = (fieldNoise(Wb, 110, x, y, wf) - 0.5) * 44;
      const sw = fieldNoise(L1, 70, x + wx, y + wy, wf) * 0.56 + fieldNoise(L2, 26, x + wx * 0.5, y + wy * 0.5, wf) * 0.3;
      swell[k] = sw;
      // the board's sun gradient, held at its edge values out here
      const cx = Math.min(W, Math.max(0, x)), cy = Math.min(H, Math.max(0, y));
      let t = sw + fieldNoise(L3, 9, x, y, wf) * 0.14 + 0.05 - 0.1 * (cx / W * 0.55 + cy / H * 0.45);
      if (roadD) { const rd = roadD(x, y); if (rd < 16) t -= 0.06 * (1 - Math.max(0, rd) / 16); }
      if (FOREST) {
        const fd = forestDepthAt(x, y);
        wood[k] = fd;
        if (fd > -40) t -= 0.24 * Math.min(1, (fd + 40) / 40);
        if (fd > 0) pools[k] = fieldNoise(Ld, 12, x + wx * 0.35 + y * 0.3, y + wy * 0.35, wf) * 0.8 + fieldNoise(Le, 5, x, y, wf) * 0.2;
      }
      for (const q of nearDecor) {
        const s = q.s || 1, tree = TALL.has(q.t), rr = (tree ? 17 : 10) * s;
        const dx = x - (q.x + (tree ? 7 : 3) * s), dy = (y - (q.y + (tree ? 7 : 8))) * 1.7, qq = (dx * dx + dy * dy) / (rr * rr);
        if (qq < 4) t -= (tree ? 0.22 : 0.09) * Math.exp(-qq * 1.3);
      }
      t -= shadeK * wf * dens(x, y);
      if (sea) sea[k] = seaDepthAt(x, y);
      tone[k] = t;
    }
  }
  PROF.grid += performance.now() - T0; T0 = performance.now();
  // the sun on the swells (world.js: a slope facing up-left is lit)
  const gain = 34 * look.relief;
  for (let j = 0; j < UH; j++) {
    const ya = Math.max(0, j - HS) * UW, yb = Math.min(UH - 1, j + HS) * UW;
    for (let i = 0; i < UW; i++) {
      const xa = Math.max(0, i - HS), xb = Math.min(UW - 1, i + HS);
      const v = ((swell[j * UW + xb] - swell[j * UW + xa]) * 0.42 + (swell[yb + i] - swell[ya + i]) * 0.58) / (2 * HS * G) * gain;
      sun[j * UW + i] = v < -1 ? -1 : v > 1 ? 1 : v;
    }
  }

  // ---- each pixel: a tone on its ramp, a temperature, a region ----
  const NP = gw * gh;
  const tn8 = new Uint8Array(NP), tp8 = new Uint8Array(NP), reg = new Uint8Array(NP);   // reg: 0 meadow, 1 floor, 2 sea/sand/crag, 3 the board
  const pal = [TT.meadow, TT.floor];
  const CT = COAST ? { ...coastTones(R), px: 1 / r } : null, sandW = COAST ? COAST.sand : 0;
  const warmth = look.relief * 0.035;
  const inv = 1 / r, iG = 1 / G;
  // the board's pixel grid under each column and row, for the dither
  const colD = new Int32Array(gw), colT = new Int32Array(gw);
  for (let px = 0; px < gw; px++) { const b = Math.floor((vx0 + (px + 0.5) * inv) * RES); colD[px] = b & 127; colT[px] = (b + 53) & 127; }
  const pxA = Math.max(0, Math.ceil((0.5 - vx0) * r - 0.5)), pxB = Math.min(gw, Math.floor((W - 0.5 - vx0) * r - 0.5) + 1);
  for (let py = 0; py < gh; py++) {
    const y = vy0 + (py + 0.5) * inv;
    const rowIn = y > 0.5 && y < H - 0.5;
    const fy = (y - uy0) * iG, yi = fy | 0, v = fy - yi, rowK = yi * UW;
    const bY = Math.floor(y * RES), drow = (bY & 127) * 128, trow = ((bY + 71) & 127) * 128;
    for (let px = 0; px < gw; px++) {
      if (rowIn && px === pxA && pxB > pxA) { for (let q = pxA; q < pxB; q++) reg[py * gw + q] = 3; px = pxB - 1; continue; }
      const x = vx0 + (px + 0.5) * inv, i = py * gw + px;
      const dz = DZ[drow + colD[px]], dt = DZ[trow + colT[px]];
      const fx = (x - ux0) * iG, xi = fx | 0, u = fx - xi, k = rowK + xi;
      const w01 = (1 - u) * v, w11 = u * v, w00 = (1 - u) - w01, w10 = u - w11;
      const t = tone[k] * w00 + tone[k + 1] * w10 + tone[k + UW] * w01 + tone[k + UW + 1] * w11;
      if (sea && sea[k] * w00 + sea[k + 1] * w10 + sea[k + UW] * w01 + sea[k + UW + 1] * w11 > -(sandW + 14)) {
        const c = coastPixel(CT, seaDepthAt(x, y), t, dz, sandW, x, y);
        if (c) { const o = i << 2; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; reg[i] = 2; continue; }
      }
      const sn = sun[k] * w00 + sun[k + 1] * w10 + sun[k + UW] * w01 + sun[k + UW + 1] * w11;
      const depth = wood ? wood[k] * w00 + wood[k + 1] * w10 + wood[k + UW] * w01 + wood[k + UW + 1] * w11 : -999;
      let tn, rg = 0;
      if (depth + dz * 7 > 0) {
        // the wood's floor, with the odd fleck of sun through the canopy
        const tt = t + dz * 0.1;
        tn = tt < 0.36 ? 1 : tt < 0.5 ? 2 : 3;
        if (depth > 6 && tn < 3) {
          const pl = pools[k] * w00 + pools[k + 1] * w10 + pools[k + UW] * w01 + pools[k + UW + 1] * w11 + dt * 0.25 + dz * 0.06;
          if (pl > 0.63) tn += pl > 0.72 ? 2 : 1;
        }
        rg = 1;
      } else if (B0.floor && t + dz * 0.1 < 0.08) {
        // the dark floor under the thick of the landscape's own wood
        tn = t + dz * 0.1 < 0.0 ? 1 : 2; rg = 1;
      } else {
        const tt = t + sn * warmth + dz * 0.07;
        tn = tt < 0.23 ? 1 : tt < 0.36 ? 2 : tt < 0.63 ? 3 : 4;
      }
      const wv = sn + (t - 0.47) * 1.3 + dt * 0.22;
      tn8[i] = tn; reg[i] = rg;
      tp8[i] = (lee ? sn + dt * 0.3 < -0.45 : wv < -0.42) ? 0 : wv > 0.42 ? 2 : 1;
    }
  }

  PROF.px += performance.now() - T0; T0 = performance.now();
  // ---- the fleck layer (world.js paintDetail), thinning with distance ----
  // (only at the board's own grain: coarser, a fleck would be a blot)
  if (r > 1.5) {
    const shift = (px, py, s) => {
      if (px < 0 || py < 0 || px >= gw || py >= gh) return;
      const i = py * gw + px;
      if (reg[i] > 1) return;
      const n = tn8[i] + s; tn8[i] = n < 0 ? 0 : n > 6 ? 6 : n;
    };
    const turf = (px, py) => px >= 0 && py >= 0 && px < gw && py < gh && reg[py * gw + px] < 2;
    const wx0 = Math.floor(vx0 * RES), wy0 = Math.floor(vy0 * RES);   // board px of pixel (0, 0)
    const driftAt = (x, y) => { const wf = smooth((outside(x, y) - 3) / 26); return fieldNoise(seed + 61, 36, x, y, wf); };
    const thin = (x, y) => 1 - 0.75 * smooth((outside(x, y) - 20) / 200);
    if (kind === "snow") {
      // wind-carved ridges along the one wind, thick in the drifts
      const tilt = -0.12;
      for (let ry = -6; ry < gh + gw * 0.12; ry += 6) {
        const RY = ry + wy0;
        let px = Math.floor(hash(RY, seed + 5) * 24) - 12, run = 0;
        while (px < gw) {
          const PXw = px + wx0, h0 = hash(PXw * 3 + 1, RY * 7 + seed), h3 = hash(PXw + 11, RY + 3), h4 = hash(PXw + 1, RY + 4);
          const py = ry + Math.round(px * tilt) + Math.round((hash(PXw, RY + 9) - 0.5) * 3);
          const len = 5 + Math.floor(Math.pow(h3, 1.4) * 13);
          const x = vx0 + px * inv, y = vy0 + py * inv;
          const dr = turf(px, py) ? smooth((driftAt(x, y) - 0.3) / 0.45) * thin(x, y) : 0;
          if (h0 < 0.42 * dr * dr && turf(px + len, py)) {
            const ah = len > 11 && h4 < 0.5 ? 2 : 1, sk = 0.6 + h4 * 0.6;
            for (let k = 0; k < len; k++) {
              const f = k / (len - 1), yy = py - Math.round(ah * Math.sin(Math.PI * Math.pow(f, sk)));
              if (k > 0 && k < len - 1) shift(px + k, yy, 1);
              if (f > 0.3) { shift(px + k, yy + 1, -1); if (turf(px + k, yy + 1)) tp8[(yy + 1) * gw + px + k] = 0; }
            }
            run++;
            px += len + (run < 3 && hash(PXw, RY + 17) < 0.3 ? 0 : 3 + Math.floor(hash(PXw, RY + 13) * 20));
          } else { run = 0; px += 4 + Math.floor(hash(PXw, RY + 15) * 10); }
        }
      }
    } else {
      const ashy = kind === "ash" || (kind === "grass" && R.ambient === "embers"), burnt = kind === "grass";
      const step = 5;
      for (let cy = -((wy0 % step) + step) % step; cy < gh; cy += step) {
        for (let cx = -((wx0 % step) + step) % step; cx < gw; cx += step) {
          const CX = cx + wx0, CY = cy + wy0;
          const h0 = hash(CX * 7 + 3, CY * 13 + seed);
          const px = cx + Math.floor(hash(CX, CY + 71) * step), py = cy + Math.floor(hash(CX + 5, CY + 72) * step);
          if (!turf(px, py)) continue;
          const x = vx0 + (px + 0.5) * inv, y = vy0 + (py + 0.5) * inv;
          const dr = smooth((driftAt(x, y) - 0.28) / 0.5);
          if (h0 > look.fleck * (0.04 + 1.5 * dr * dr) * thin(x, y)) continue;
          const h3 = hash(CX + px - cx, CY + py - cy + 3), h4 = hash(CX + px - cx + 1, CY + py - cy + 4);
          if (ashy) {
            if (h3 < 0.55) { shift(px, py, burnt ? -1 : -2); if (h4 < 0.5) shift(px + 1, py, -1); }
            else if (h3 < 0.85) { shift(px, py, 1); shift(px + 1, py, 1); }
            else { shift(px, py, -1); shift(px, py - 1, -1); shift(px + (h4 < 0.5 ? 1 : 0), py - 2, 1); }
          } else {
            if (h3 < 0.3) { shift(px, py, 1); if (h4 < 0.5) shift(px + 1, py - 1, 1); continue; }
            const len = 2 + Math.floor(h3 * 2.2), lean = h4 < 0.4 ? 1 : 0;
            for (let k = 0; k < len - 1; k++) shift(px, py - k, -1);
            shift(px + lean, py - len + 1, 1);
            if (h4 > 0.75) { shift(px - 2, py, -1); shift(px - 3, py - 1, 1); }
          }
        }
      }
    }
  }
  for (let i = 0; i < NP; i++) {
    const rg = reg[i];
    if (rg > 1) continue;
    const c = pal[rg][tn8[i] * 3 + tp8[i]], o = i << 2;
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  PROF.fleck += performance.now() - T0; T0 = performance.now();
  paintCragOut(d, reg, gw, gh, vx0, vy0, r);
  ctx.putImageData(img, 0, 0);
  PROF.crag += performance.now() - T0;
  return cv;
}

// ---- the gate's crag, carried on past the board's edge -------------------
// The crag the gate is cut into (gatecrag.js) is a ridge running back from
// the mouth; the board bakes the part on the board. Out here the rest of it
// is drawn the same way — column by column as the camera sees it, tops and
// south faces, the stone in lit facets with moss (or snow) on their tops,
// turf on the high ground, inked where it stands up off the field — sinking
// back into the wood a hundred and fifty units behind the face.
let HILL = null;
const hillOut = () => {
  if (!hasCrag(REALM)) return null;
  const C = gateCrag();
  if (!C) return null;
  if (HILL && HILL.C === C) return HILL;
  const { mx, my, nx, ny, hillAt } = C;
  const at = (x, y) => {
    const u = (x - mx) * nx + (y - my) * ny;
    if (u < -250) return 0;
    const z = hillAt(x, y);
    return u < -150 ? z * smooth((u + 250) / 100) : z;
  };
  HILL = { C, at };
  return HILL;
};

function paintCragOut(d, reg, gw, gh, vx0, vy0, r) {
  const Hh = hillOut();
  if (!Hh) return;
  let TC = performance.now();
  const R = REALM, C = Hh.C, { seed, mx, my, nx, ny, tx, ty, FL } = C, mat = cragMatOf(R);
  // the ridge's reach in the world, and the part of it on this canvas
  let X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
  for (const s of [-170, 170]) for (const u of [FL + 12, -250]) {
    const x = mx + tx * s + nx * u, y = my + ty * s + ny * u;
    X0 = Math.min(X0, x); X1 = Math.max(X1, x); Y0 = Math.min(Y0, y); Y1 = Math.max(Y1, y);
  }
  const inv = 1 / r, vx1 = vx0 + gw * inv, vy1 = vy0 + gh * inv;
  X0 = Math.max(X0, vx0 - 2); X1 = Math.min(X1, vx1 + 2); Y0 = Math.max(Y0, vy0 - 2); Y1 = Math.min(Y1, vy1 + 60);
  if (X0 >= X1 || Y0 >= Y1) return;
  // (all of it under the board: nothing to do)
  if (X0 > 0 && X1 < W && Y0 > 0 && Y1 - 50 < H) return;
  // heights every 2 units, eased between
  const S = 2, HX = Math.ceil((X1 - X0) / S) + 3, HY = Math.ceil((Y1 - Y0) / S) + 3;
  // (filled as they're asked for: most of the ridge's box lies under the
  // board, where only its projection past an edge is wanted)
  const Hc = new Float32Array(HX * HY).fill(NaN);
  const hC = (k) => { let z = Hc[k]; if (z !== z) { const i = k % HX, j = (k / HX) | 0; z = Hc[k] = Hh.at(X0 + (i - 1) * S, Y0 + (j - 1) * S); } return z; };
  const hAt = (x, y) => {
    const fx = (x - X0) / S + 1, fy = (y - Y0) / S + 1;
    if (fx < 0 || fy < 0 || fx >= HX - 1 || fy >= HY - 1) return 0;
    const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * HX + i;
    return (hC(k) * (1 - u) + hC(k + 1) * u) * (1 - v) + (hC(k + HX) * (1 - u) + hC(k + HX + 1) * u) * v;
  };
  // the sun from the upper left and fairly high (as the board's crag)
  const Lx = -0.391, Ly = -0.485, Lz = 0.782;
  let LG = 0;
  const litAt = (x, y) => {
    const hx = (hAt(x + 1, y) - hAt(x - 1, y)) / 2, hy = (hAt(x, y + 1) - hAt(x, y - 1)) / 2;
    LG = Math.hypot(hx, hy);
    return (-Lx * hx - Ly * hy + Lz) / Math.sqrt(hx * hx + hy * hy + 1);
  };
  const shaded = (x, y, z) => { for (let k = 1; k <= 14; k += 2) if (hAt(x - 0.586 * k, y - 0.81 * k) > z + k * 2.6) return true; return false; };
  // the light, its slope and the cast shadow per height cell, worked out once
  // (a ground row asks for them far more often than there are cells)
  const Lc = new Float32Array(HX * HY), Gc = new Float32Array(HX * HY), Cc = new Uint8Array(HX * HY), Dn = new Uint8Array(HX * HY);
  const cellOf = (x, y) => {
    const i = Math.round((x - X0) / S) + 1, j = Math.round((y - Y0) / S) + 1;
    if (i < 1 || j < 1 || i >= HX - 1 || j >= HY - 1) return -1;
    const k = j * HX + i;
    if (Dn[k]) return k;
    Dn[k] = 1;
    const z = hC(k), cx = X0 + (i - 1) * S, cy = Y0 + (j - 1) * S;
    // (flat ground with nothing up-sun of it: lit, and in no one's shadow)
    if (z <= 0.3 && !(hAt(cx - 2, cy - 2) > 0.3 || hAt(cx - 3, cy - 4) > 0 || hAt(cx - 5, cy - 6.5) > 0 || hAt(cx - 7, cy - 10) > 0 || hAt(cx - 8.2, cy - 11.4) > 0)) { Lc[k] = Lz; return k; }
    Lc[k] = litAt(cx, cy); Gc[k] = LG; Cc[k] = shaded(cx, cy, z) ? 1 : 0;
    return k;
  };
  const tone = (l) => (l > 0.55 ? 0 : l > 0.28 ? 1 : l > -0.05 ? 2 : l > -0.3 ? 3 : 4);
  const rock = [lighten(mat.rock, 0.34), lighten(mat.rock, 0.12), mat.rock, darken(mat.rock, 0.3), darken(mat.rock, 0.52)].map(hexRGB);
  const top = [lighten(R.GRASS, 0.14), R.GRASS, mix(R.GRASS, R.GRASS_DK, 0.55), darken(R.GRASS_DK, 0.18), darken(R.GRASS_DK, 0.4)].map(hexRGB);
  const moss = mat.moss ? [lighten(mat.moss, 0.22), mat.moss, darken(mat.moss, 0.3)].map(hexRGB) : mat.snow ? ["#f4f9fb", "#dde8ef", "#b4c4d2"].map(hexRGB) : null;
  const lava = mat.lava ? hexRGB(mat.lava) : null, lavaDk = mat.lava ? hexRGB(darken(mat.lava, 0.45)) : null;
  // the canvas columns and rows it can touch
  const c0 = Math.max(0, Math.floor((X0 - vx0) * r)), c1 = Math.min(gw - 1, Math.ceil((X1 - vx0) * r));
  const r0 = Math.max(0, Math.floor((Y0 - vy0 - 60) * r)), r1 = Math.min(gh - 1, Math.ceil((Y1 - vy0) * r));
  const BW = c1 - c0 + 1, BH = r1 - r0 + 1;
  if (BW <= 0 || BH <= 0) return;
  const kindB = new Uint8Array(BW * BH), zB = new Float32Array(BW * BH), lB = new Float32Array(BW * BH), castB = new Uint8Array(BW * BH), cellB = new Int32Array(BW * BH);
  const gB = new Float32Array(BW * BH);   // the world y of the ground each pixel shows
  const put = (i, c) => { const o = i << 2; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; };
  const blend = (i, c, a) => { const o = i << 2, k = a / 255; d[o] += (c[0] - d[o]) * k; d[o + 1] += (c[1] - d[o + 1]) * k; d[o + 2] += (c[2] - d[o + 2]) * k; };
  const G0 = Math.ceil((Y1 - vy0) * r);   // the nearest ground row, in canvas rows
  const Gtop = Math.floor((Y0 - vy0) * r);
  // the crag, front to back per column (each ground row paints from where it
  // stands on screen up to what's already painted in front of it)
  for (let px = c0; px <= c1; px++) {
    const x = vx0 + (px + 0.5) * inv;
    let front = BH + r0;
    // (a column over the board only shows what rises past its top or stands
    // below its bottom edge)
    const over = x > 0 && x < W;
    if (over && vy0 >= 0 && vy1 <= H) continue;
    const skipA = over ? Math.floor((60 - vy0) * r) : 1e9, skipB = over ? Math.ceil((H - vy0) * r) : -1e9;
    for (let gy = G0; gy >= Gtop; gy--) {
      if (gy > skipA && gy < skipB) { gy = skipA + 1; front = Math.min(front, skipA); continue; }
      const y = vy0 + (gy + 0.5) * inv, z = hAt(x, y);
      if (z <= 0.35) { if (gy < front) front = gy; continue; }
      const sp = Math.floor(gy - z * r);
      if (sp >= front) continue;
      const ck = cellOf(x, y);
      const l = ck < 0 ? Lz : Lc[ck], g = ck < 0 ? 0 : Gc[ck], cast = ck < 0 ? 0 : Cc[ck];
      for (let q = Math.max(r0, sp); q < Math.min(front, r1 + 1); q++) {
        const b = (q - r0) * BW + (px - c0);
        const steep = g > (mat.bare ? 1.7 : 1.15) + (vnoise(seed + 5, 2.5, x, y) - 0.5) * 0.9 || q > sp + 1;
        kindB[b] = steep ? 1 : 2; zB[b] = z - (q - sp) * inv; lB[b] = l; castB[b] = cast; gB[b] = y;
      }
      front = Math.max(r0, sp);
      if (front <= r0) break;
    }
  }
  PROF.cMarch = (PROF.cMarch || 0) + performance.now() - TC; TC = performance.now();
  // (the rest only looks inside the box the crag actually covers, a pixel or two round it)
  let tb0 = BH, tb1 = -1, tc0 = BW, tc1 = -1;
  for (let by = 0; by < BH; by++) for (let bx = 0, row = by * BW; bx < BW; bx++) if (kindB[row + bx]) { if (by < tb0) tb0 = by; if (by > tb1) tb1 = by; if (bx < tc0) tc0 = bx; if (bx > tc1) tc1 = bx; }
  if (tb1 < 0) return;
  tb0 = Math.max(0, tb0 - 3); tb1 = Math.min(BH - 1, tb1 + 3); tc0 = Math.max(0, tc0 - 2); tc1 = Math.min(BW - 1, tc1 + 2);
  // stone in blocks: each rock pixel belongs to the nearest of a scatter of
  // seeds in 3D (the board's own cells, in world units, so they carry on)
  const vor = (x, y, z) => {
    const X = x / 17, Y = y / 17, Z = z / 8.5;
    const xi = Math.floor(X), yi = Math.floor(Y), zi = Math.floor(Z);
    const sx = X - xi < 0.5 ? -1 : 1, sy = Y - yi < 0.5 ? -1 : 1, sz = Z - zi < 0.5 ? -1 : 1;
    let f1 = 99, id = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let e = 0; e < 2; e++) {
      const cx = xi + a * sx, cy = yi + b * sy, cz = zi + e * sz;
      const qx = cx + 0.2 + 0.6 * hash(cx * 31 + cz + seed, cy) - X, qy = cy + 0.2 + 0.6 * hash(cy * 17 + cz, cx + seed) - Y, qz = cz + 0.2 + 0.6 * hash(cz * 13 + seed, cx * 7 + cy) - Z;
      const dq = qx * qx + qy * qy + qz * qz * 0.8;
      if (dq < f1) { f1 = dq; id = ((cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)) | 0; }
    }
    return id;
  };
  for (let by = tb0; by <= tb1; by++) for (let b = by * BW + tc0, be = by * BW + tc1; b <= be; b++) if (kindB[b] === 1) cellB[b] = vor(vx0 + ((b % BW) + c0 + 0.5) * inv, gB[b], zB[b]);
  const idx = (b) => (((b / BW) | 0) + r0) * gw + (b % BW) + c0;
  const apronPx = (b) => reg[idx(b)] !== 3;
  PROF.cVor = (PROF.cVor || 0) + performance.now() - TC; TC = performance.now();
  // the crag's shadow on the field first
  let lastKey = -1, lastSh = false;
  for (let by = tb0; by <= tb1; by++) for (let b = by * BW + tc0, be = by * BW + tc1; b <= be; b++) {
    if (kindB[b] || !apronPx(b)) continue;
    const q = ((b / BW) | 0) + r0, x = vx0 + ((b % BW) + c0 + 0.5) * inv, y = vy0 + (q + 0.5) * inv;
    // (tested a world unit at a time)
    const key = Math.floor(x) * 65536 + Math.floor(y);
    if (key !== lastKey) { lastKey = key; const ck = cellOf(x, y); lastSh = ck >= 0 && Cc[ck] === 1 && hAt(x, y) <= 0.3; }
    if (lastSh) blend(idx(b), SHADOW_C, 70);
  }
  PROF.cShadow = (PROF.cShadow || 0) + performance.now() - TC; TC = performance.now();
  for (let by = tb0; by <= tb1; by++) for (let b = by * BW + tc0, be = by * BW + tc1; b <= be; b++) {
    const k = kindB[b];
    if (!k || !apronPx(b)) continue;
    const bx = b % BW, by = (b / BW) | 0, i = idx(b);
    const wxp = (bx + c0) * 2 * inv + vx0 * 2, wyp = (by + r0) * 2 * inv + vy0 * 2;   // board-art px, for the noise
    let t = tone(lB[b]) + castB[b];
    if (k === 1) {
      const id = cellB[b];
      t += Math.floor(hash(id, 5) * 3) - 1;
      const other = (bb) => bb >= 0 && bb < BW * BH && kindB[bb] === 1 && cellB[bb] !== id;
      const up = by > 0 && other(b - BW), up2 = by > 1 && other(b - 2 * BW), up3 = by > 2 && other(b - 3 * BW);
      const dn = by < BH - 1 && other(b + BW), dn2 = by < BH - 2 && other(b + 2 * BW);
      const rt = bx < BW - 1 && other(b + 1), lt = bx > 0 && other(b - 1);
      if (dn) t = 4;
      else if (rt) t = Math.max(t + 1, 3);
      else if (up || (lt && !dn2)) t -= 2;
      else if (up2 || up3) t -= 1;
      else if (dn2) t += 1;
      t = Math.max(0, Math.min(4, t));
      let col = rock[t];
      const patch = vnoise(seed + 7, 16, wxp, wyp);
      if (dn && lava && vnoise(seed + 12, 11, wxp, wyp) > 0.7) col = lava;
      else if (dn2 && lava && vnoise(seed + 12, 11, wxp, wyp + 1) > 0.7) col = lavaDk;
      else if (moss && !dn && !rt && ((up || up2 || (up3 && hash(bx, seed + 14) < 0.5)) && patch > (mat.snow ? 0.42 : 0.58) || patch > 0.72 && (mat.snow || hash(bx >> 1, by >> 1) < 0.85))) col = moss[Math.min(2, Math.max(0, (up ? 0 : 1) + castB[b]))];
      put(i, col); reg[i] = 2;
    } else {
      const l = lB[b], z = zB[b];
      // the low foot is left to the field, along a ragged line
      if (z < 3.6 + (vnoise(seed + 19, 5, wxp, wyp) - 0.5) * 3) { kindB[b] = 4; if (castB[b]) blend(i, SHADOW_C, 70); continue; }
      if (mat.bare) t = Math.min(2, (l > 0.52 ? 1 : 2) - (z > 6 && l > 0.52 && vnoise(seed + 3, 9, wxp, wyp) < 0.2 ? 1 : 0)) + castB[b];
      else {
        t = (l > 0.96 ? 0 : l > 0.52 ? 1 : l > 0.28 ? 2 : 3) + castB[b];
        t = Math.max(0, Math.min(4, t + (t === 1 && vnoise(seed + 8, 4, wxp, wyp) > 0.8 ? -1 : 0) + (vnoise(seed + 3, 9, wxp, wyp) < 0.16 ? 1 : 0)));
      }
      put(i, top[t]); reg[i] = 2;
    }
  }
  PROF.cPaint = (PROF.cPaint || 0) + performance.now() - TC; TC = performance.now();
  // the turf's lit rim where it breaks over the rock
  for (let by = Math.max(tb0, 1); by <= Math.min(tb1, BH - 5); by++) for (let b = by * BW + tc0, be = by * BW + tc1; b <= be; b++) {
    if (kindB[b] !== 2 || kindB[b + BW] !== 1 || !apronPx(b)) continue;
    if (kindB[b + 2 * BW] !== 1 || kindB[b + 3 * BW] !== 1) { put(idx(b + BW), top[2]); if (kindB[b + 2 * BW] === 1) put(idx(b + 2 * BW), top[2]); continue; }
    put(idx(b), top[0]); put(idx(b + BW), top[3]); kindB[b + BW] = 3;
    const bx = b % BW, by = (b / BW) | 0, hang = hash(bx + c0, by + r0 + seed) < 0.3 ? 1 + Math.floor(hash(bx + c0 + 1, by + r0 + seed) * 3) : 0;
    for (let q = 2; q < 2 + hang; q++) if (kindB[b + q * BW] === 1) put(idx(b + q * BW), top[q === 1 + hang ? 3 : 2]);
  }
  // ink round it, only where it stands up off the ground; its foot in shade
  const solid = (b) => kindB[b] > 0 && kindB[b] < 4;
  const out = new Uint8Array(BW * BH);
  for (let by = Math.max(tb0, 1); by <= Math.min(tb1, BH - 2); by++) for (let bx = Math.max(tc0, 1); bx <= Math.min(tc1, BW - 2); bx++) {
    const b = by * BW + bx;
    if (solid(b)) continue;
    const z0 = kindB[b] === 4 ? zB[b] : 0;
    if ((solid(b - 1) && zB[b - 1] - z0 > 2.2) || (solid(b + 1) && zB[b + 1] - z0 > 2.2) || (solid(b - BW) && zB[b - BW] - z0 > 2.2) || (solid(b + BW) && kindB[b + BW] !== 2 && zB[b + BW] - z0 > 2.2)) out[b] = 1;
  }
  for (let by = tb0; by <= tb1; by++) for (let b = by * BW + tc0, be = by * BW + tc1; b <= be; b++) if (out[b] && apronPx(b)) blend(idx(b), INK_C, 235);
  for (let by = tb0; by <= Math.min(tb1, BH - 3); by++) for (let b = by * BW + tc0, be = by * BW + tc1; b <= be; b++) {
    if (!solid(b) || solid(b + BW) || out[b + BW] || zB[b] >= 3) continue;
    if (apronPx(b + BW)) blend(idx(b + BW), SHADOW_C, 120);
    if (apronPx(b + 2 * BW)) blend(idx(b + 2 * BW), SHADOW_C, 60);
  }
}

// ---- the Marches' paving, carried on --------------------------------------
// scenery-iron.js lays the board's flags; the road strip gives the verge and
// leaves the middle bare, so out here the flags carry on in the same stone:
// courses across the road, each cut into flags of its own widths, beginning
// with a course joint right at the board's edge; a tone from a slow patch
// (not per stone), a lit lip on each flag's upper left and a dark joint on
// its lower right, kerb stones along each side — and the turf taking more of
// them the farther out, until the road is a grassy trace into the wood.
function paveOut(g, lx0, ly0, lw, lh, k, road) {
  const R = REALM, seed = R.seed | 0, main = R.PATH_MAIN, dk = R.PATH_DK;
  const tones = [mix(main, "#fff3d2", 0.07), mix(main, "#b09a74", 0.12), main, mix(main, "#8e9698", 0.14), mix(main, dk, 0.16), mix(main, dk, 0.3)].map(hexRGB);
  const kerbT = [mix(main, "#d0ccc0", 0.3), mix(main, "#b8b4aa", 0.22), mix(main, dk, 0.08)].map(hexRGB);
  // (a flag gone: moss and turf in its hole, near the flags' own value so it
  // reads as a grassed-over stone, not a hole, in the camp's dark)
  const gone = [mix(main, "#6a7a4a", 0.35), mix(main, R.GRASS, 0.45), mix(mix(main, dk, 0.3), R.GRASS_DK, 0.3)].map(hexRGB);
  const jointC = hexRGB(mix(main, dk, 0.62)), mossC = hexRGB(mix(R.TUFT || R.GRASS_DK, R.GRASS_DK, 0.4));
  const HALF = PATH_HALF, KERB = HALF - 4.5, KOUT = HALF - 1;
  const RI = road.I, pts = road.pts, n = pts.length, cum = RI.cum;
  // where it leaves the board: the courses start there
  let aE = 0;
  for (let i = 1; i < n && !aE; i++) {
    if (outside(pts[i][0], pts[i][1]) <= 0) continue;
    const L = cum[i] - cum[i - 1];
    for (let t = 0; t <= L; t += 0.25) {
      const f = t / L;
      if (outside(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f) > 0) { aE = cum[i - 1] + t; break; }
    }
  }
  const course = [aE], kerbs = [[aE - 3], [aE - 7]];
  for (let c = 0; course[c] < cum[n - 1]; c++) course.push(course[c] + 5 + hash(c, seed + 301) * 6.5);
  for (const side of [0, 1]) { const K = kerbs[side]; for (let c = 0; K[c] < cum[n - 1]; c++) K.push(K[c] + 6 + hash(c * 2 + side, seed + 303) * 5); }
  const find = (arr, a) => { let lo = 0, hi = arr.length - 1; if (a < arr[0]) return -1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] <= a) lo = m; else hi = m; } return lo; };
  const breaks = new Map();
  const breaksOf = (c) => {
    let b = breaks.get(c);
    if (!b) { b = []; for (let v = -KERB + 3 + hash(c, seed + 305) * 7, q = 0; v < KERB - 3; v += 5 + hash(c * 16 + q++, seed + 307) * 9) b.push(v); breaks.set(c, b); }
    return b;
  };
  const img = g.getImageData(0, 0, lw, lh), d = img.data;
  const ids = new Int32Array(lw * lh).fill(-1), tn = new Uint8Array(lw * lh), nearK = new Uint8Array(lw * lh);
  // the camp's gate stands in the dark of the wood (scenery-iron.js bakeCamp):
  // the column comes out of it, so out here the road lies in it
  const camp = R.spawn === "ironcamp", DARK = HALF + 16, acr = camp ? new Float32Array(lw * lh).fill(1e9) : null;
  const ik = 1 / k;
  const toneOf = new Map();
  // (only the pixels in the road's own buckets)
  const cells = [];
  for (const key of RI.buckets.keys()) {
    const cx = Math.floor(key / 8192) - 4096, cy = (key % 8192) - 4096;
    const X0 = Math.max(0, Math.floor((cx * RI.CB - lx0) * k)), X1 = Math.min(lw, Math.ceil(((cx + 1) * RI.CB - lx0) * k));
    const Y0 = Math.max(0, Math.floor((cy * RI.CB - ly0) * k)), Y1 = Math.min(lh, Math.ceil(((cy + 1) * RI.CB - ly0) * k));
    if (X1 > X0 && Y1 > Y0) cells.push([X0, X1, Y0, Y1, RI.buckets.get(key)]);
  }
  for (const [X0, X1, Y0, Y1, l] of cells) for (let py = Y0; py < Y1; py++) {
    const y = ly0 + (py + 0.5) * ik;
    for (let px = X0; px < X1; px++) {
      const x = lx0 + (px + 0.5) * ik;
      if (outside(x, y) <= 0) continue;
      const dist = RI.dist(x, y, l), best = dist * dist, al = RI.al, v = RI.v;
      const av = Math.abs(v);
      if (camp && best < DARK * DARK) acr[py * lw + px] = Math.sqrt(best);
      if (av >= KOUT) continue;
      const far = smooth((al - aE - 50) / 340);
      let id, t;
      if (av < KERB) {
        const c = find(course, al);
        if (c < 0) continue;
        const b = breaksOf(c);
        let f = 0; while (f < b.length && b[f] < v) f++;
        id = c * 64 + f;
        // (each flag's look worked out once, not per pixel)
        t = toneOf.get(id);
        if (t === undefined) {
          t = Math.max(0, Math.min(4, Math.floor(vnoise(seed + 211, 2.6, c, f * 0.7 + 3) * 4.4 + (hash(id, seed + 5) - 0.5) * 1.4)));
          // (a flag gone: turf and earth in the hole it left)
          if (hash(id, seed + 9) < 0.04 + 0.62 * far) t = 20 + Math.floor(hash(id, seed + 15) * 3);
          toneOf.set(id, t);
        }
      } else {
        const side = v > 0 ? 1 : 0, c = find(kerbs[side], al);
        if (c < 0) continue;
        id = 2e6 + side * 1e5 + c;
        t = toneOf.get(id);
        if (t === undefined) {
          t = 10 + Math.floor(hash(id, seed + 11) * 3);
          if (hash(id, seed + 13) < 0.1 + 0.7 * far) t = 20 + Math.floor(hash(id, seed + 17) * 3);
          toneOf.set(id, t);
        }
      }
      const i = py * lw + px;
      ids[i] = id; tn[i] = t; nearK[i] = av > KERB - 3 ? 1 : 0;
    }
  }
  // (its stepped bands on the camp's own ordered dither, on the board's grid)
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], campY0 = Math.max(0, Math.floor(PTS[0][1] - 130));
  const darkIn = (i, px, py) => {
    const a = acr[i];
    if (a >= DARK) return;
    const bx = Math.floor((lx0 + (px + 0.5) * ik) * PX), by = Math.floor((ly0 + (py + 0.5) * ik) * PX) - campY0 * PX;
    const lvl = Math.min(4, Math.floor(Math.min(1, (DARK - a) / 20) * 4 + B4[(by & 3) * 4 + (bx & 3)] / 16));
    if (lvl <= 0) return;
    const o = i << 2, al = [0, 60, 110, 160, 205][lvl] / 255;
    d[o] = Math.round(d[o] * (1 - al) + 14 * al); d[o + 1] = Math.round(d[o + 1] * (1 - al) + 14 * al); d[o + 2] = Math.round(d[o + 2] * (1 - al) + 18 * al);
  };
  const seen = new Uint8Array(lw * lh);
  for (const [X0, X1, Y0, Y1] of cells) for (let py = Y0; py < Y1; py++) for (let px = X0; px < X1; px++) {
    const i = py * lw + px, id = ids[i];
    if (seen[i]) continue;
    seen[i] = 1;
    if (id < 0) { if (camp) darkIn(i, px, py); continue; }
    const other = (j) => ids[j] !== id;
    const dn = py < lh - 1 && other(i + lw), rt = px < lw - 1 && other(i + 1);
    const upO = py > 0 && other(i - lw), lf = px > 0 && other(i - 1);
    const t = tn[i], kerb = t >= 10;
    let c;
    if (t >= 20) c = hash(px * 3, py * 5 + seed) < 0.18 ? mossC : gone[t - 20];
    else if (dn || rt) c = nearK[i] && hash(px, py + seed) < 0.3 ? mossC : jointC;
    else if (kerb) c = kerbT[upO || lf ? 0 : t - 10];
    else c = tones[upO || lf ? Math.max(0, t - 1) : t + (hash(px * 7, py * 13 + seed) < 0.07 ? 1 : 0)];
    const o = i << 2;
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    if (camp) darkIn(i, px, py);
  }
  g.putImageData(img, 0, 0);
}

// ---- the castle wall, running on past the top and bottom -------------------
// The castle's stone is baked from y = -14 to H + 14; past that the wall
// carries on as plain curtain: the castle column is rendered once per realm
// and a stretch of plain wall (between drums, clear of the gatehouse, with
// the fewest red roofs in its bailey) is repeated outward from each end.
const CX0 = 712, CY0 = -16, CS = 2;
let COLUMN = { key: "", cv: null, win: 0, P: 0 };
const castleColumn = () => {
  const [gx, gy] = PTS[PTS.length - 1];
  const key = `${REALM.id}|${gx}|${gy}`;
  if (COLUMN.key === key) return COLUMN;
  const cw = W + 12 - CX0, ch = H - 2 * CY0;
  const cv = document.createElement("canvas");
  cv.width = cw * CS; cv.height = ch * CS;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.setTransform(CS, 0, 0, CS, -CX0 * CS, -CY0 * CS);
  drawCastle(c, 0, 1);
  // the plainest stretch of wall: clear of every drum and of the gatehouse
  const P = 26;
  const blocked = [...wallDrums(gy).map((f) => [f - TOWER.n - TOWER.h - 12, f + TOWER.s + 12]), [gy + GATE_TOWER_N - TOWER.n - TOWER.h - 30, gy + GATE_TOWER_S + 30]];
  const px = c.getImageData(0, 0, cv.width, cv.height).data;
  const roofy = (y0) => {
    let n = 0;
    for (let y = y0 * CS; y < (y0 + P) * CS; y += 2) for (let x = (TOWER.x2 - CX0) * CS; x < cv.width; x += 2) {
      const o = (y * cv.width + x) * 4;
      if (px[o] > px[o + 1] + 40 && px[o] > px[o + 2] + 30) n++;
    }
    return n;
  };
  let win = 20, best = Infinity;
  for (let y = 16; y + P < H - 16; y += 2) {
    if (blocked.some(([a, b]) => y < b && y + P > a)) continue;
    const sc = roofy(y - CY0) + Math.abs(y - H / 2) * 0.001;
    if (sc < best) { best = sc; win = y; }
  }
  COLUMN = { key, cv, win, P, cw };
  return COLUMN;
};
function paintWallOut(ctx, vy0, vy1) {
  if (vy0 > -14 && vy1 < H + 14) return;
  const C = castleColumn(), { cv, win, P, cw } = C;
  const sy = (win - CY0) * CS, sh = P * CS;
  for (let y = -14 - P; y > vy0 - P; y -= P) ctx.drawImage(cv, 0, sy, cv.width, sh, CX0, y, cw, P);
  for (let y = H + 14; y < vy1; y += P) ctx.drawImage(cv, 0, sy, cv.width, sh, CX0, y, cw, P);
  // the column's own ends over them: the drums that stand across the edge
  ctx.drawImage(cv, 0, 0, cv.width, 16 * CS, CX0, CY0, cw, 16);
  ctx.drawImage(cv, 0, (H - CY0) * CS, cv.width, 16 * CS, CX0, H, cw, 16);
}

// ---- the whole apron ---------------------------------------------------------

let STATS = { ms: 0, items: 0, key: "" };
let PROF = {};
export const apronStats = () => STATS;

export function paintApron(canvas, { cssW, cssH, dpr = 1, board }) {
  if (!canvas || !board) return;
  const R = REALM;
  const key = `${R.id}|${cssW}|${cssH}|${dpr}|${board.x}|${board.y}|${board.w}|${board.h}|${PTS.length}|${PTS[0]}`;
  if (canvas.__apronKey === key) return;
  const t0 = performance.now();
  const pw = Math.max(1, Math.round(cssW * dpr)), ph = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== pw) canvas.width = pw;
  if (canvas.height !== ph) canvas.height = ph;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, pw, ph);
  canvas.__apronKey = key;

  // world units per css px, and the world rect the screen shows
  const kx = board.w / W, ky = board.h / H;
  const vx0 = -board.x / kx, vx1 = (cssW - board.x) / kx, vy0 = -board.y / ky, vy1 = (cssH - board.y) / ky;
  if (vx0 >= -0.5 && vy0 >= -0.5 && vx1 <= W + 0.5 && vy1 <= H + 0.5) { STATS = { ms: performance.now() - t0, items: 0, key }; return; }

  joinChapters();
  const B = BIOMES[biomeOf(R)];
  const pick = mixFor(R, B);
  const seed = R.seed | 0;
  const rightWall = (x) => x > W - WALL_W - 34;
  // how thick the landmarks stand at (x, y): the realm's wood where it has
  // one, else thin at the board's edge and thickening away from it, in
  // groves and clearings
  const dens = (x, y) => {
    if (rightWall(x) && x < W + 170) return 0;
    if (COAST && seaDepthAt(x, y) > -(COAST.sand + 8)) return 0;
    const wood = FOREST ? smooth((forestDepthAt(x, y) + 6) / 36) : 0;
    const far = B.near + (B.dense - B.near) * smooth(outside(x, y) / 150);
    const grove = 0.35 + 1.25 * vnoise(seed + 91, 58, x, y);
    return Math.max(wood * 0.97, Math.min(1, far * grove));
  };

  // 1. ground, at up to two art px per world unit (the board's own grain),
  //    fewer when the apron is huge — and then a band at the board's grain
  //    all round the seam, frayed at its outer edge, laid over it
  const ix = Math.max(0, Math.min(W, vx1) - Math.max(0, vx0)), iy = Math.max(0, Math.min(H, vy1) - Math.max(0, vy0));
  const area = (vx1 - vx0) * (vy1 - vy0) - ix * iy;
  const r = Math.max(0.75, Math.min(RES, Math.sqrt(4.5e5 / Math.max(1, area))));
  // (the road ends in the gate's crag where there is one; only the chapters'
  // camps and barrows stand at an edge the road runs on past)
  const road = (() => { const pts = hasCrag(R) ? null : roadOut(); return pts ? { pts, segs: segsOf(pts), I: roadIndex(pts) } : null; })();
  const rivers = riversOut();
  const layer = (x0, y0, x1, y1, k, fray) => {
    const lx0 = Math.floor(x0 * k) / k, ly0 = Math.floor(y0 * k) / k;
    const lw = Math.ceil((x1 - lx0) * k), lh = Math.ceil((y1 - ly0) * k);
    const cv = paintGround(lx0, ly0, lw, lh, k, dens, road, fray);
    let T0 = performance.now();
    const g = cv.getContext("2d");
    // the rivers and the road into the ground's own pixels, at its grain
    // (baked only over the strips beyond the board: a river's body costs by
    // its area, and the board has its own)
    if (rivers.length) {
      const X1 = lx0 + lw / k, Y1 = ly0 + lh / k;
      const strips = [[lx0, ly0, Math.min(X1, 2), Y1], [Math.max(lx0, W - 2), ly0, X1, Y1], [Math.max(lx0, 0), ly0, Math.min(X1, W), Math.min(Y1, 2)], [Math.max(lx0, 0), Math.max(ly0, H - 2), Math.min(X1, W), Y1]];
      for (const [a, b, c2, e] of strips) {
        if (c2 - a < 1 || e - b < 1) continue;
        const sw = Math.round((c2 - a) * k), sh = Math.round((e - b) * k);
        const tmp = document.createElement("canvas");
        tmp.width = sw; tmp.height = sh;
        const tc = tmp.getContext("2d");
        tc.setTransform(k, 0, 0, k, -a * k, -b * k);
        let any = false;
        for (const rv of rivers) {
          const m = rv.w / 2 + 30;
          if (!rv.pts.some(([x, y]) => x > a - m && x < c2 + m && y > b - m && y < e + m)) continue;
          drawRiver(tc, rv, 0, R.water); any = true;
        }
        if (any) g.drawImage(tmp, Math.round((a - lx0) * k), Math.round((b - ly0) * k));
      }
    }
    PROF.river += performance.now() - T0; T0 = performance.now();
    // (paintRoadStrip wants the points in the direction of march)
    if (road) paintRoadStrip(g, [...road.pts].reverse(), { x0: lx0, y0: ly0, k, extEnd: 30 });
    PROF.strip = (PROF.strip || 0) + performance.now() - T0;
    if (road && R.groundArt === "iron") paveOut(g, lx0, ly0, lw, lh, k, road);
    PROF.road += performance.now() - T0;
    if (fray) {
      // fray the band's outer edge so the two grains meet along no line
      const img = g.getImageData(0, 0, lw, lh), dd = img.data;
      for (let py = 0; py < lh; py++) for (let px = 0; px < lw; px++) {
        const x = lx0 + (px + 0.5) / k, y = ly0 + (py + 0.5) / k;
        if (outside(x, y) > fray - 10 * vnoise(seed + 5, 7, x, y)) dd[(py * lw + px) * 4 + 3] = 0;
      }
      g.putImageData(img, 0, 0);
    }
    return { cv, x: lx0, y: ly0, w: lw / k, h: lh / k };
  };
  PROF = { grid: 0, px: 0, fleck: 0, crag: 0, river: 0, road: 0 };
  const layers = [layer(vx0, vy0, vx1, vy1, r, 0)];
  const BAND = 44;
  if (r < RES - 0.01) layers.push(layer(Math.max(vx0, -BAND), Math.max(vy0, -BAND), Math.min(vx1, W + BAND), Math.min(vy1, H + BAND), RES, BAND));
  const tG = performance.now();

  // scaled the way the board's own canvas is (smoothly, by the browser), so
  // the two share one grain at the seam
  ctx.setTransform(dpr * kx, 0, 0, dpr * ky, dpr * board.x, dpr * board.y);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  for (const L of layers) ctx.drawImage(L.cv, L.x, L.y, L.w, L.h);

  // 2. the castle wall running on
  paintWallOut(ctx, vy0, vy1);
  const tR = performance.now();

  // 3. what stands on it: the small stuff, then the landmarks, sorted by
  //    their feet with any board piece that hangs over an edge
  const wet = (x, y, m) => (COAST && seaDepthAt(x, y) > -(COAST.sand + m)) || rivers.some((rv) => distSegs(rv.segs, x, y) < rv.w / 2 + m);
  const onRoad = (x, y, m) => road && road.I.dist(x, y) < PATH_HALF + m;
  const hits = (x, y, t, s) => {
    const [hw, up, dn] = reachOf(t, s);
    return x + hw > 0 && x - hw < W && y + dn > 0 && y - up < H;
  };
  const hill = hillOut();
  const M = 60, lx0 = vx0 - M, lx1 = vx1 + M, ly0 = vy0 - 20, ly1 = vy1 + 60;
  // small stuff, on a finer grid
  const lc = 12;
  for (let j = Math.floor(ly0 / lc); j <= Math.ceil(ly1 / lc); j++) {
    for (let i = Math.floor(lx0 / lc); i <= Math.ceil(lx1 / lc); i++) {
      const h = hash(seed + i * 131, j * 7 + 5);
      const x = (i + 0.2 + hash(seed + i, j * 3 + 1) * 0.6) * lc, y = (j + 0.2 + hash(seed + j, i * 3 + 2) * 0.6) * lc;
      const od = outside(x, y);
      if (od < 6 || hits(x, y, "rock", 0.5)) continue;
      // quieter with distance: the small stuff thins out as the light fails
      if (hash(seed + i * 23, j * 29) < 0.7 * smooth((od - 60) / 220)) continue;
      const dn = dens(x, y);
      if (hash(seed + i * 17, j * 19) > 0.3 + dn * 0.55) continue;
      if (wet(x, y, 4) || onRoad(x, y, 4) || (hill && hill.at(x, y) > 1)) continue;
      stampLow(ctx, B.low, R, x, y, h, dn);
    }
  }
  const tL = performance.now();
  const items = [];
  const c = B.cell;
  for (let j = Math.floor(ly0 / c); j <= Math.ceil(ly1 / c); j++) {
    for (let i = Math.floor(lx0 / c); i <= Math.ceil(lx1 / c); i++) {
      const x = (i + 0.5 + (hash(seed + i * 3, j * 5) - 0.5) * 0.9) * c;
      const y = (j + 0.5 + (hash(seed + i * 7, j * 11 + 1) - 0.5) * 0.9) * c;
      const dn = dens(x, y);
      if (hash(seed + i * 13, j * 17 + 2) > dn) continue;
      const inWood = FOREST && forestDepthAt(x, y) > 0;
      const t = inWood ? woodPick(R, hash(seed + i, j + 3)) : pick(hash(seed + i * 5, j * 9 + 4));
      const s = TALL.has(t) ? 0.95 + hash(seed + i, j + 6) * 0.65 : 0.8 + hash(seed + i, j + 6) * 0.6;
      if (hits(x, y, t, s)) continue;
      const fp = TALL.has(t) ? 13 * s : 9 * s;
      if (wet(x, y, fp) || onRoad(x, y, 12 + fp)) continue;
      // on the gate's crag: up on its top, never on its face
      let lift = 0;
      if (hill) {
        const z = hill.at(x, y);
        if (z > 0.8) {
          const slope = Math.abs(hill.at(x, y + 3) - hill.at(x, y - 3)) / 6 + Math.abs(hill.at(x + 3, y) - hill.at(x - 3, y)) / 6;
          if (z > 2.5 && (slope > 0.9 || z < hill.C.HMAX * 0.3)) continue;
          lift = Math.round(z * PX) / PX;
          if (hits(x, y - lift, t, s)) continue;
        }
      }
      items.push({ x, y, t, s, forest: true, lift });
    }
  }
  // the board's own pieces that cross its edge carry on out here
  for (const d of DECOR) {
    const s = d.s || 1, [hw, up, dn] = reachOf(d.t, s);
    if (d.x - hw < 0 || d.x + hw > W || d.y - up < 0 || d.y + dn > H) items.push(d);
  }
  items.sort((a, b) => a.y - b.y);
  for (const d of items) {
    if (!d.lift) { drawTree(ctx, d, 0); continue; }
    ctx.save(); ctx.translate(0, -d.lift); drawTree(ctx, d, 0); ctx.restore();
  }
  const tI = performance.now();

  // 4. the realm's light, in the board's own coordinates so it runs straight
  //    across the seam, then the falloff into the distance
  grade(ctx, vx0, vy0, vx1, vy1);
  falloff(ctx, vx0, vy0, vx1, vy1);

  const tE = performance.now();
  STATS = { ms: tE - t0, items: items.length, key, r, parts: `[${Object.entries(PROF).map(([k, v]) => k + " " + v.toFixed(0)).join(", ")}] ground ${(tG - t0).toFixed(0)} water/road/wall ${(tR - tG).toFixed(0)} low ${(tL - tR).toFixed(0)} items ${(tI - tL).toFixed(0)} light ${(tE - tI).toFixed(0)}` };
}

const DEFAULT_LIGHT = { tint: "255,244,222", amount: 0.09, vignette: 0.26 };
// atmosphere.js's drawGrade, laid over the apron's world rect
function grade(ctx, x0, y0, x1, y1) {
  const L = REALM.light || DEFAULT_LIGHT, w = x1 - x0, h = y1 - y0;
  if (L.amount > 0) {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(${L.tint},${L.amount})`;
    ctx.fillRect(x0, y0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }
  if (L.glow) {
    const gg = ctx.createLinearGradient(0, H, 0, H * 0.45);
    gg.addColorStop(0, `rgba(${L.glow},${L.glowAmount || 0.12})`);
    gg.addColorStop(1, `rgba(${L.glow},0)`);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gg;
    ctx.fillRect(x0, H * 0.45, w, Math.max(0, y1 - H * 0.45));
    ctx.globalCompositeOperation = "source-over";
  }
  if (L.vignette > 0) {
    const gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.92);
    gr.addColorStop(0, "rgba(12,10,18,0)");
    gr.addColorStop(0.62, `rgba(12,10,18,${L.vignette * 0.35})`);
    gr.addColorStop(1, `rgba(12,10,18,${L.vignette})`);
    ctx.fillStyle = gr;
    ctx.fillRect(x0, y0, w, h);
  }
}

// Darker and quieter with distance from the board: a small mask, one texel
// per 6 world units, stretched smooth over the whole rect.
function falloff(ctx, x0, y0, x1, y1) {
  const S = 6, mw = Math.ceil((x1 - x0) / S) + 1, mh = Math.ceil((y1 - y0) / S) + 1;
  const cv = document.createElement("canvas");
  cv.width = mw; cv.height = mh;
  const c = cv.getContext("2d"), img = c.createImageData(mw, mh), d = img.data;
  const [r, g, b] = [20, 16, 26];
  for (let j = 0; j < mh; j++) {
    for (let i = 0; i < mw; i++) {
      const o = (j * mw + i) * 4, dd = outside(x0 + i * S, y0 + j * S);
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(255 * 0.42 * smooth(dd / 260));
    }
  }
  c.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(cv, x0, y0, mw * S, mh * S);
  ctx.restore();
}
