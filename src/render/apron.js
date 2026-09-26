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
// How the join stays invisible: the ground is a tone map built the way
// world.js builds the meadow, and within ~30 world units of the board it is
// evaluated on world.js's OWN noise lattice, so it is the board's field; the road is stroked with the
// same stack paintRoad() uses; board trees whose sprites cross an edge are
// drawn here in full, so their outer halves carry on; and the realm's light
// (tint, glow, vignette) is laid on in the board's own world coordinates, so
// the grade runs straight across the seam. Then it all falls away — a little
// darker, a little quieter — the farther it lies from the board.

import { W, H, RES, PATH_HALF, WALL_W } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { PTS } from "../engine/path.js";
import { DECOR, RIVERS, FOREST, COAST, forestDepthAt, seaDepthAt } from "../data/terrain.js";
import { drawTree, drawRiver } from "./scenery.js";
import { IRON_ART } from "./scenery-iron.js";
import { HOLLOW_ART } from "./scenery-hollow.js";
import { drawCastle } from "./castle.js";
import { wallDrums, GATE_TOWER_N, GATE_TOWER_S, TOWER } from "../data/castle.js";
import { mix, darken, lighten, rgba, hash, tuft, stone, shadow, soft, strokePts, blobBall, bakeSprite, part, PX } from "./paint.js";

// ---- shared bits -----------------------------------------------------------

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
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
for (const { apron } of [IRON_ART, HOLLOW_ART]) {
  if (!apron) continue;
  if (apron.biome && apron.big && BIOMES[apron.biome]) BIOMES[apron.biome] = { ...BIOMES[apron.biome], big: apron.big };
  for (const t of apron.landscape || []) LANDSCAPE.add(t);
  for (const t of apron.tall || []) TALL.add(t);
}
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
  soft(ctx, x + 2, y + 2.5, 14 * s, 2.6 * s, [[0, rgba(darken(R.GRASS_DK, 0.25), 0.28)], [1, rgba(R.GRASS_DK, 0)]]);
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

// The small stuff between the landmarks, sown thicker the farther out.
function paintLow(ctx, kind, R, x, y, h, dens) {
  const base = mix(R.GRASS_DK, R.GRASS, 0.25), tip = lighten(R.GRASS_LT, 0.22);
  switch (kind) {
    case "meadow": {
      const leaf = mix(R.GRASS_DK, "#3f7a40", 0.5);
      if (h < 0.3 * dens + 0.05) bush(ctx, x, y, 0.75 + hash(h * 1e4, 1) * 0.4, hash(h * 1e4, 2) < 0.5 ? leaf : lighten(leaf, 0.1), Math.floor(hash(h * 1e4, 3) * 3));
      else tuft(ctx, x, y, 0.6 + h * 0.6, base, tip, Math.round(h * 997));
      break;
    }
    case "cinder":
      if (h < 0.25) stone(ctx, x, y, 1.6, 1.1, "#3a302c");
      else tuft(ctx, x, y, 0.55 + h * 0.5, mix(R.GRASS_DK, "#5a4a30", 0.3), mix(R.GRASS_LT, "#c8a860", 0.25), Math.round(h * 997));
      break;
    case "drift":
      if (h < 0.35) drift(ctx, x, y, 0.55 + h, Math.round(h * 991), R);
      else if (h < 0.7) tuft(ctx, x, y, 0.6 + h * 0.4, mix(R.TUFT, R.GRASS_DK, 0.3), R.GRASS_LT, Math.round(h * 997), { n: 3 });
      else stone(ctx, x, y, 2, 1.3, "#9fb4c2");
      break;
    case "bog":
      if (h < 0.22 * dens + 0.06) pool(ctx, x, y, 0.6 + h * 0.6, Math.round(h * 991), R);
      else tuft(ctx, x, y, 0.7 + h * 0.6, mix(R.GRASS_DK, "#5a6440", 0.3), mix(R.GRASS_LT, "#9a9a6a", 0.35), Math.round(h * 997), { n: 5 });
      break;
    case "ember": {
      if (h < 0.4) {
        ctx.fillStyle = rgba("#8a8078", 0.55);
        ctx.fillRect(Math.round(x * PX) / PX, Math.round(y * PX) / PX, 1.5 + h * 3, 0.5);
      } else if (h < 0.62) {
        soft(ctx, x, y, 3.5, 2, [[0, "rgba(240,120,50,0.35)"], [1, "rgba(240,120,50,0)"]]);
        ctx.fillStyle = h < 0.5 ? "#f0a040" : "#e0602c";
        ctx.fillRect(Math.round(x * PX) / PX, Math.round(y * PX) / PX, 1, 0.5);
      } else stone(ctx, x, y, 1.8 + h, 1.2 + h * 0.6, "#2e2830");
      break;
    }
    case "crag":
      if (h < 0.45) stone(ctx, x, y, 2 + h * 3, 1.4 + h * 2, mix("#8a8a84", R.GRASS_DK, 0.2));
      else tuft(ctx, x, y, 0.55 + h * 0.5, base, tip, Math.round(h * 997));
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

// The apron's ground, `r` pixels per world unit, over the world rect
// [vx0, vx0 + gw/r) x [vy0, vy0 + gh/r). Pixels under the board are skipped.
function paintGround(vx0, vy0, gw, gh, r, dens) {
  const R = REALM, seed = R.seed | 0;
  const cv = document.createElement("canvas");
  cv.width = gw; cv.height = gh;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(gw, gh), d = img.data;

  // sample the fields every G world units, then interpolate per pixel
  const G = 2;
  const ux0 = Math.floor(vx0 / G) * G - G, uy0 = Math.floor(vy0 / G) * G - G;
  const UW = Math.ceil(gw / r / G) + 4, UH = Math.ceil(gh / r / G) + 4;
  const tone = new Float32Array(UW * UH), sea = COAST ? new Float32Array(UW * UH) : null, wood = FOREST ? new Float32Array(UW * UH) : null;
  const B0 = BIOMES[biomeOf(R)], shadeK = B0.floor ? 0.16 : 0.05;
  const L1 = seed + 11, L2 = seed + 23, L3 = seed + 37, Wa = seed + 41, Wb = seed + 53;
  for (let j = 0; j < UH; j++) {
    const y = uy0 + j * G;
    const rowIn = y > 4 && y < H - 4;
    for (let i = 0; i < UW; i++) {
      const x = ux0 + i * G;
      if (rowIn && x > 4 && x < W - 4) { i = Math.max(i, Math.floor((W - 4 - ux0) / G) - 1); continue; }
      // the board's field at the seam, the unbounded one farther out
      const od = outside(x, y), wf = smooth((od - 3) / 26);
      let t = 0;
      if (wf < 1) {
        const wx = (boardNoise(Wa, 110, x, y) - 0.5) * 44, wy = (boardNoise(Wb, 110, x, y) - 0.5) * 44;
        t += (1 - wf) * (boardNoise(L1, 70, x + wx, y + wy) * 0.56 + boardNoise(L2, 26, x + wx * 0.5, y + wy * 0.5) * 0.3 + boardNoise(L3, 9, x, y) * 0.14);
      }
      if (wf > 0) {
        const wx = (vnoise(Wa, 110, x, y) - 0.5) * 44, wy = (vnoise(Wb, 110, x, y) - 0.5) * 44;
        t += wf * (vnoise(L1, 70, x + wx, y + wy) * 0.56 + vnoise(L2, 26, x + wx * 0.5, y + wy * 0.5) * 0.3 + vnoise(L3, 9, x, y) * 0.14);
      }
      // the board's sun gradient, held at its edge values out here
      const cx = Math.min(W, Math.max(0, x)), cy = Math.min(H, Math.max(0, y));
      t += 0.05 - 0.1 * (cx / W * 0.55 + cy / H * 0.45);
      const k = j * UW + i;
      if (FOREST) { const fd = forestDepthAt(x, y); wood[k] = fd; if (fd > -40) t -= 0.24 * Math.min(1, (fd + 40) / 40); }
      t -= shadeK * wf * dens(x, y);
      if (sea) sea[k] = seaDepthAt(x, y);
      tone[k] = t;
    }
  }

  const meadow = [darken(mix(R.GRASS, R.GRASS_DK, 0.85), 0.1), mix(R.GRASS, R.GRASS_DK, 0.4), R.GRASS, mix(R.GRASS, R.GRASS_LT, 0.34)].map(hexRGB);
  const floorDk = darken(R.GRASS_DK, 0.52);
  const floor = [darken(R.GRASS_DK, 0.62), floorDk, mix(floorDk, "#6a5432", 0.3)].map(hexRGB);
  const wat = R.water || { deep: "#3a6a7c", edge: "#4a8094", shine: "#8cc4d8" };
  const seaC = [lighten(wat.shine, 0.45), mix(wat.shine, wat.edge, 0.35), wat.edge, mix(wat.edge, wat.deep, 0.5), wat.deep, darken(wat.deep, 0.18)].map(hexRGB);
  const beach = ["#b09568", "#c9b07a", "#dcc48e", "#e6d29e"].map(hexRGB);
  const sandW = COAST ? COAST.sand : 0;
  const inv = 1 / r, iG = 1 / G;
  const pxA = Math.max(0, Math.ceil((0.5 - vx0) * r - 0.5)), pxB = Math.min(gw, Math.floor((W - 0.5 - vx0) * r - 0.5) + 1);
  for (let py = 0; py < gh; py++) {
    const y = vy0 + (py + 0.5) * inv;
    const rowIn = y > 0.5 && y < H - 0.5;
    const fy = (y - uy0) * iG, yi = fy | 0, v = fy - yi, rowK = yi * UW;
    const bz = (py & 3) * 4;
    for (let px = 0; px < gw; px++) {
      if (rowIn && px === pxA && pxB > pxA) { px = pxB - 1; continue; }
      const x = vx0 + (px + 0.5) * inv;
      const dz = BAYER[bz + (px & 3)];
      const o = (py * gw + px) * 4;
      const fx = (x - ux0) * iG, xi = fx | 0, u = fx - xi, k = rowK + xi;
      const t = (tone[k] * (1 - u) + tone[k + 1] * u) * (1 - v) + (tone[k + UW] * (1 - u) + tone[k + UW + 1] * u) * v;
      let c;
      const sd = sea ? (sea[k] * (1 - u) + sea[k + 1] * u) * (1 - v) + (sea[k + UW] * (1 - u) + sea[k + UW + 1] * u) * v : -999;
      const depth = wood ? (wood[k] * (1 - u) + wood[k + 1] * u) * (1 - v) + (wood[k + UW] * (1 - u) + wood[k + UW + 1] * u) * v : -999;
      if (sd + dz * 3 > 0) {
        const kk = sd + (t - 0.5) * 10 + dz * 3;
        c = seaC[kk < 2.5 ? 0 : kk < 9 ? 1 : kk < 20 ? 2 : kk < 34 ? 3 : kk < 52 ? 4 : 5];
      } else if (sd + dz * 5 > -sandW) {
        const kk = sd + (t - 0.5) * 6 + dz * 2;
        c = beach[kk > -4 ? 0 : kk > -8 ? 1 : t + dz * 0.1 > 0.5 ? 3 : 2];
      } else if (depth + dz * 7 > 0 || (B0.floor && t + dz * 0.1 < 0.08)) {
        const tt = t + dz * 0.1 + (depth > 0 ? 0 : 0.2);
        c = floor[tt < 0.36 ? 0 : tt < 0.5 ? 1 : 2];
      } else {
        const tt = t + dz * 0.075;
        c = meadow[tt < 0.23 ? 0 : tt < 0.36 ? 1 : tt < 0.63 ? 2 : 3];
      }
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// the road, stroked with paintRoad()'s own stack so it meets the board's
function paintRoadOut(ctx, pts) {
  const R = REALM, main = R.PATH_MAIN, dk = R.PATH_DK, edge = R.PATH_EDGE, lt = lighten(main, 0.2), wide = PATH_HALF * 2;
  for (let k = 9; k >= 1; k--) strokePts(ctx, pts, wide + 2 + k * 3, rgba(edge, 0.03 + (9 - k) * 0.006));
  strokePts(ctx, pts, wide + 3, mix(main, edge, 0.45));
  ctx.save(); ctx.translate(-1.2, -1.2); strokePts(ctx, pts, wide + 2, rgba(darken(dk, 0.2), 0.4)); ctx.restore();
  ctx.save(); ctx.translate(1.2, 1.2); strokePts(ctx, pts, wide + 2, rgba(lighten(main, 0.3), 0.45)); ctx.restore();
  strokePts(ctx, pts, wide - 2, main);
  strokePts(ctx, pts, wide - 16, rgba(lt, 0.18));
  // dust and damp, and pebbles trodden in
  for (let i = 4; i < pts.length; i += 2) {
    const [x, y] = pts[i], h = hash(i, 811);
    const ox = (hash(i, 812) - 0.5) * wide * 0.8, oy = (hash(i, 813) - 0.5) * wide * 0.8;
    if (h < 0.35) soft(ctx, x + ox, y + oy, 6 + h * 20, 3 + h * 8, [[0, rgba(h < 0.18 ? dk : lt, 0.16)], [1, rgba(dk, 0)]]);
    else if (h < 0.7) stone(ctx, x + ox, y + oy, 1.6 + h * 1.5, 1.1 + h, h < 0.55 ? R.PEBBLE : mix(dk, "#8d8478", 0.4));
  }
  // the wood's dark closes over it, as the grove does on the board
  if (R.spawn === "grove" && FOREST) {
    const ink = "#0b0f09";
    [[17.4, 0.275], [12.4, 0.324], [7.4, 0.48], [2.4, 0.765]].forEach(([m, a]) => strokePts(ctx, pts, 2 * (PATH_HALF + m), rgba(ink, a)));
  }
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
  //    fewer when the apron is huge
  const ix = Math.max(0, Math.min(W, vx1) - Math.max(0, vx0)), iy = Math.max(0, Math.min(H, vy1) - Math.max(0, vy0));
  const area = (vx1 - vx0) * (vy1 - vy0) - ix * iy;
  const r = Math.max(0.75, Math.min(RES, Math.sqrt(4.5e5 / Math.max(1, area))));
  const road = (() => { const pts = roadOut(); return pts ? { pts, segs: segsOf(pts) } : null; })();
  const gx0 = Math.floor(vx0 * r) / r, gy0 = Math.floor(vy0 * r) / r;
  const gw = Math.ceil((vx1 - gx0) * r), gh = Math.ceil((vy1 - gy0) * r);
  const ground = paintGround(gx0, gy0, gw, gh, r, dens);
  const tG = performance.now();

  // scaled the way the board's own canvas is (smoothly, by the browser), so
  // the two share one grain at the seam
  ctx.setTransform(dpr * kx, 0, 0, dpr * ky, dpr * board.x, dpr * board.y);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(ground, gx0, gy0, gw / r, gh / r);

  // 2. water and the road
  const rivers = riversOut();
  for (const rv of rivers) drawRiver(ctx, rv, 0, R.water);
  if (road) paintRoadOut(ctx, road.pts);
  paintWallOut(ctx, vy0, vy1);
  const tR = performance.now();

  // 3. what stands on it: the small stuff, then the landmarks, sorted by
  //    their feet with any board piece that hangs over an edge
  const wet = (x, y, m) => (COAST && seaDepthAt(x, y) > -(COAST.sand + m)) || rivers.some((rv) => distSegs(rv.segs, x, y) < rv.w / 2 + m);
  const onRoad = (x, y, m) => road && distSegs(road.segs, x, y) < PATH_HALF + m;
  const hits = (x, y, t, s) => {
    const [hw, up, dn] = reachOf(t, s);
    return x + hw > 0 && x - hw < W && y + dn > 0 && y - up < H;
  };
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
      if (wet(x, y, 4) || onRoad(x, y, 4)) continue;
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
      items.push({ x, y, t, s, forest: true });
    }
  }
  // the board's own pieces that cross its edge carry on out here
  for (const d of DECOR) {
    const s = d.s || 1, [hw, up, dn] = reachOf(d.t, s);
    if (d.x - hw < 0 || d.x + hw > W || d.y - up < 0 || d.y + dn > H) items.push(d);
  }
  items.sort((a, b) => a.y - b.y);
  for (const d of items) drawTree(ctx, d, 0);
  const tI = performance.now();

  // 4. the realm's light, in the board's own coordinates so it runs straight
  //    across the seam, then the falloff into the distance
  grade(ctx, vx0, vy0, vx1, vy1);
  falloff(ctx, vx0, vy0, vx1, vy1);

  const tE = performance.now();
  STATS = { ms: tE - t0, items: items.length, key, r, parts: `ground ${(tG - t0).toFixed(0)} water/road/wall ${(tR - tG).toFixed(0)} low ${(tL - tR).toFixed(0)} items ${(tI - tL).toFixed(0)} light ${(tE - tI).toFixed(0)}` };
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
