// ============ RENDER: THE GROUND ============
// The static world — turf, its thousand small details, and the road —
// painted ONCE per realm into a high-resolution layer, then
// blitted every frame. Nothing here moves, so nothing here costs a frame.
//
// The detail is the point: zoomed in, the meadow is blades of grass, clover
// and daisies, and the road is packed earth with pebbles and damp patches.

import { W, H, PATH_HALF, RES, WALL_W, MX, MXR, mulberry32 } from "../data/constants.js";
// the ground's scatter is laid over the board's width before the castle's
// border widened, so every realm's turf looks as it did
const SW = W - (MXR - MX);
import { REALM } from "../data/maps.js";
import { PTS, nearestOnPath } from "../engine/path.js";
import { TUFTS, FLOWERS, SPECKS, PEBBLES, PONDS, CHEVRONS, DECOR, inRiver, FOREST, forestDepthAt, COAST, coastLine, seaDepthAt, inSea } from "../data/terrain.js";
import { lighten, darken, mix, rgba, soft, shadow, tuft, flower, stone, clover, blade, strokePts, hash, ball, blobBall, lin, rad, bakeSprite, part, PX } from "./paint.js";
import { IRON_ART } from "./scenery-iron.js";
import { paintShore, drawShoreLive, coastTones, coastPixel } from "./coast.js";
import { paintRoad, drawRoadMarks } from "./road.js";
import { bakeWater } from "./water.js";
import { HOLLOW_ART } from "./scenery-hollow.js";
// a chapter's own ground art, keyed by REALM.groundArt (looked up when the
// ground is painted, never at load — see the import cycle note in scenery.js)
const artFor = (part, key) => IRON_ART[part]?.[key] || HOLLOW_ART[part]?.[key];

let layer = null;
let layerKey = "";

const inPond = (x, y, m = 0) =>
  PONDS.some((p) => Math.abs(x - p.x) < p.w / 2 + 6 + m && Math.abs(y - p.y) < p.h / 2 + 6 + m)
  || !!(COAST && inSea(x, y, COAST.sand + m));

// Open turf: off the road, out of the water.
const clear = (x, y, m) => nearestOnPath(x, y).d > PATH_HALF + m && !inPond(x, y, m) && !inRiver(x, y, m) && forestDepthAt(x, y) < -6
  && !(COAST && inSea(x, y, COAST.sand + m));

// ---- the turf ----
// The meadow is one tone map, not a pile of blotches: warped value noise
// cut into three or four flat grass tones with a pixel dither where they
// meet, darkened under trees, along the treeline and at the road's edge,
// and warmed toward the sun. Tufts, clover and flowers go on top, thickest
// where the grass is lush.

// value noise on a coarse lattice, eased between its points
const lattice = (seed, cell) => {
  const gw = Math.ceil(W / cell) + 8, gh = Math.ceil(H / cell) + 8;
  const a = new Float32Array(gw * gh);
  for (let i = 0; i < a.length; i++) a[i] = hash(seed, i);
  return { a, gw, gh, cell };
};
const noise = (L, x, y) => {
  const fx = Math.max(0, x / L.cell + 3), fy = Math.max(0, y / L.cell + 3);
  const xi = Math.min(L.gw - 2, fx | 0), yi = Math.min(L.gh - 2, fy | 0);
  let u = Math.min(1, fx - xi), v = Math.min(1, fy - yi);
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const i = yi * L.gw + xi, A = L.a;
  return (A[i] * (1 - u) + A[i + 1] * u) * (1 - v) + (A[i + L.gw] * (1 - u) + A[i + L.gw + 1] * u) * v;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const hexRGB = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const SHADY = new Set(["tree", "pine", "snowpine", "willow", "deadtree"]);

// Where the grass sits in shade: under lone trees (thrown down-right), along
// the wood's edge, a little along the road, and less toward the sun.
function shadeField() {
  const SC = 4, SW = Math.ceil(W / SC) + 2, SH = Math.ceil(H / SC) + 2;
  const sh = new Float32Array(SW * SH);
  const near = DECOR.filter((d) => !d.forest);
  for (let j = 0; j < SH; j++) {
    for (let i = 0; i < SW; i++) {
      const x = i * SC, y = j * SC;
      let v = 0.05 - 0.1 * (x / W * 0.55 + y / H * 0.45);
      const rd = nearestOnPath(x, y).d - PATH_HALF;
      if (rd < 16) v -= 0.06 * (1 - Math.max(0, rd) / 16);
      if (FOREST) { const fd = forestDepthAt(x, y); if (fd > -40) v -= 0.24 * Math.min(1, (fd + 40) / 40); }
      for (const d of near) {
        const s = d.s || 1, tree = SHADY.has(d.t);
        const r = (tree ? 17 : 10) * s;
        const dx = x - (d.x + (tree ? 7 : 3) * s), dy = (y - (d.y + (tree ? 7 : 8))) * 1.7;
        const q = (dx * dx + dy * dy) / (r * r);
        if (q < 4) v -= (tree ? 0.2 : 0.09) * Math.exp(-q * 1.3);
      }
      sh[j * SW + i] = v;
    }
  }
  return (x, y) => {
    const fx = Math.max(0, x / SC), fy = Math.max(0, y / SC);
    const xi = Math.min(SW - 2, fx | 0), yi = Math.min(SH - 2, fy | 0), u = fx - xi, v = fy - yi, k = yi * SW + xi;
    return (sh[k] * (1 - u) + sh[k + 1] * u) * (1 - v) + (sh[k + SW] * (1 - u) + sh[k + SW + 1] * u) * v;
  };
}

// The tone map itself, written straight into the layer's pixels. Returns the
// lushness field (low = dark, lush grass) for the scatter that follows.
function paintToneMap(ctx) {
  const R = REALM, seed = R.seed | 0;
  const L1 = lattice(seed + 11, 70), L2 = lattice(seed + 23, 26), L3 = lattice(seed + 37, 9);
  const Wa = lattice(seed + 41, 110), Wb = lattice(seed + 53, 110);
  const shade = shadeField();
  const FW = W + 1, FH = H + 1;
  const field = new Float32Array(FW * FH);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const wx = (noise(Wa, x, y) - 0.5) * 44, wy = (noise(Wb, x, y) - 0.5) * 44;
      field[y * FW + x] = noise(L1, x + wx, y + wy) * 0.56 + noise(L2, x + wx * 0.5, y + wy * 0.5) * 0.3 + noise(L3, x, y) * 0.14 + shade(x, y);
    }
  }
  const meadow = [darken(mix(R.GRASS, R.GRASS_DK, 0.85), 0.1), mix(R.GRASS, R.GRASS_DK, 0.4), R.GRASS, mix(R.GRASS, R.GRASS_LT, 0.34)].map(hexRGB);
  const floorDk = darken(R.GRASS_DK, 0.52);
  const floor = [darken(R.GRASS_DK, 0.62), floorDk, mix(floorDk, "#6a5432", 0.3)].map(hexRGB);
  const PW = W * RES, PH = H * RES;
  const img = ctx.createImageData(PW, PH);
  const d = img.data;
  const bound = FOREST ? new Float32Array(FOREST.edge === "left" ? PH : PW) : null;
  // the coast: the waterline for every pixel along its edge, then the sea
  // shaded by how far out it lies — foam, shallows, the blue, the deep — and
  // the beach: wet dark sand at the water, pale dry sand above it
  const alongX = COAST && (COAST.edge === "top" || COAST.edge === "bottom");
  const shore = COAST ? new Float32Array(alongX ? PW : PH) : null;
  if (shore) for (let i = 0; i < shore.length; i++) shore[i] = coastLine(i / RES);
  const sandW = COAST ? COAST.sand : 0;
  const tones = COAST ? coastTones(R) : null;
  if (bound) for (let i = 0; i < bound.length; i++) bound[i] = FOREST.edge === "left" ? forestDepthAt(0, i / RES) : forestDepthAt(i / RES, 0);
  for (let py = 0; py < PH; py++) {
    const y = py / RES, y0 = y | 0, v = y - y0, row = y0 * FW;
    for (let px = 0; px < PW; px++) {
      const x = px / RES, x0 = x | 0, u = x - x0, k = row + x0;
      const t = (field[k] * (1 - u) + field[k + 1] * u) * (1 - v) + (field[k + FW] * (1 - u) + field[k + FW + 1] * u) * v;
      const dz = BAYER[(py & 3) * 4 + (px & 3)];
      let c;
      const depth = !bound ? -999 : FOREST.edge === "left" ? bound[py] - x : bound[px] - y;
      const sd = !shore ? -999 : COAST.edge === "top" ? shore[px] - y : COAST.edge === "bottom" ? shore[px] - (H - y) : COAST.edge === "left" ? shore[py] - x : shore[py] - (W - x);
      // the sea and the beach (coast.js) take the pixel when it's theirs
      if (tones && (c = coastPixel(tones, sd, t, dz, sandW, x, y))) {
        // (coloured by the coast)
      } else if (depth + dz * 7 > 0) {
        const tt = t + dz * 0.1;
        c = floor[tt < 0.36 ? 0 : tt < 0.5 ? 1 : 2];
      } else {
        const tt = t + dz * 0.075;
        c = meadow[tt < 0.23 ? 0 : tt < 0.36 ? 1 : tt < 0.63 ? 2 : 3];
      }
      const o = (py * PW + px) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return (x, y) => field[Math.min(FH - 1, Math.max(0, y | 0)) * FW + Math.min(FW - 1, Math.max(0, x | 0))];
}

// A low bush for the wood's hem: three lit clumps, inked along their
// undersides like the trees behind them. Baked once per tint.
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
// a fern: fronds fanning from one root, each a tapered blade
const fern = (ctx, x, y, s, col, seed) => {
  const n = 5 + Math.floor(hash(seed, 1) * 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.4 + (hash(seed, i + 3) - 0.5) * 0.3;
    const len = (6 + hash(seed, i + 7) * 4) * s * (1 - Math.abs(i / (n - 1) - 0.5) * 0.5);
    blade(ctx, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.8, 1.1 * s, darken(col, 0.25), lighten(col, 0.2), 0.3);
  }
};

function paintTurf(ctx) {
  const R = REALM;
  const rng = mulberry32((R.seed ^ 0x5eed5eed) >>> 0);
  const lush = paintToneMap(ctx);
  if (COAST) paintShore(ctx);

  const base = mix(R.GRASS_DK, R.GRASS, 0.25);
  const tip = lighten(R.GRASS_LT, 0.22);
  const deep = darken(R.GRASS_DK, 0.2);

  // the forest floor: leaf litter and roots where the grass gives up
  if (FOREST && REALM.wood?.hem !== false) {
    for (let i = 0; i < 260; i++) {
      const x = rng() * SW, y = rng() * H;
      const dpt = forestDepthAt(x, y);
      if (dpt < 2 || nearestOnPath(x, y).d < PATH_HALF + 2) continue;
      const col = i % 3 === 0 ? "#6a4a2c" : i % 3 === 1 ? "#4a5a2c" : "#7a6234";
      ctx.fillStyle = rgba(col, 0.8);
      ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 1 + (i % 2) * 0.5, 0.5);
    }
  }

  // clover, in little colonies rather than evenly sown
  for (let i = 0; i < 70; i++) {
    const cx = rng() * SW, cy = rng() * H, n = 2 + Math.floor(rng() * 4);
    for (let k = 0; k < n; k++) {
      const x = cx + (rng() - 0.5) * 12, y = cy + (rng() - 0.5) * 7;
      if (!clear(x, y, 3)) continue;
      clover(ctx, x, y, k % 3 ? R.GRASS_DK : deep, 0.75 + rng() * 0.4);
    }
  }
  // small stones in the turf, and the odd twig-dark clump
  for (const sp of SPECKS) {
    if (sp.k > 0.62) stone(ctx, sp.x, sp.y, 1.4 + sp.w * 0.5, 1 + sp.h * 0.4, mix("#b9ae99", R.GRASS_DK, 0.25));
    else if (sp.k > 0.45) clover(ctx, sp.x, sp.y, deep, 0.7);
  }
  // grass: the realm's own tufts, then a scatter that gathers where the
  // turf is lush and thins out on the pale, sunny swells
  const blades = [];
  for (const tf of TUFTS) blades.push([tf.x, tf.y, 0.9 + tf.s * 0.6]);
  for (let i = 0; i < 900; i++) {
    const x = rng() * SW, y = rng() * H;
    if (!clear(x, y, 5)) continue;
    if (rng() > 0.2 + (0.6 - lush(x, y)) * 2.6) continue;
    blades.push([x, y, 0.5 + rng() * 0.65]);
  }
  blades.sort((a, b) => a[1] - b[1]);
  blades.forEach(([x, y, s], i) => tuft(ctx, x, y, s, i % 4 === 0 ? deep : base, i % 3 === 0 ? R.GRASS_LT : tip, i));

  // the wood's hem: bushes and ferns crowding the treeline (a realm whose
  // edge wood isn't green turns it off with wood.hem: false)
  if (FOREST && REALM.wood?.hem !== false) {
    const span = FOREST.edge === "left" ? H : W;
    const leaf = mix(R.GRASS_DK, "#3f7a40", 0.5);
    for (let u = 4, i = 0; u < span; u += 9 + hash(i, 71) * 8, i++) {
      const out = 2 + hash(i, 72) * 9;
      // forestDepthAt(0, u) is where the treeline crosses; step out onto the grass
      const x = FOREST.edge === "left" ? forestDepthAt(0, u) + out : u;
      const y = FOREST.edge === "left" ? u : forestDepthAt(u, 0) + out;
      if (nearestOnPath(x, y).d < PATH_HALF + 12 || inPond(x, y, 4) || inRiver(x, y, 6) || x > W - WALL_W - 8) continue;
      if (hash(i, 73) < 0.55) {
        const cv = bushSprite(hash(i, 74) < 0.5 ? leaf : lighten(leaf, 0.1), Math.floor(hash(i, 75) * 3));
        const k = 0.8 + hash(i, 76) * 0.35;
        ctx.drawImage(cv, x - 14 * k, y - 14 * k, 28 * k, 20 * k);
      } else {
        fern(ctx, x, y, 0.8 + hash(i, 77) * 0.4, mix(leaf, R.GRASS_LT, 0.2), i);
      }
    }
  }

  // wildflowers, each with a few smaller ones of its kind nearby
  FLOWERS.forEach((f, i) => {
    const n = Math.floor(hash(i, 8) * 4);
    for (let k = 0; k < n; k++) {
      const x = f.x + (hash(i, k + 20) - 0.5) * 14, y = f.y + (hash(i, k + 30) - 0.5) * 8;
      if (clear(x, y, 6)) flower(ctx, x, y, f.c, i * 7 + k, 0.6 + hash(i, k + 40) * 0.2);
    }
    flower(ctx, f.x, f.y, f.c, i, 0.9 + hash(i, 5) * 0.4);
  });
}

// The cached ground for the realm currently loaded. Rebuilt whenever the
// road changes underneath it (a new realm) — and only then.
export function groundLayer() {
  const key = `${REALM.id}|${PTS.length}|${PTS[0]}|${PTS[PTS.length - 1]}|${RES}|${PATH_HALF}`;
  if (layer && key === layerKey) return layer;
  layer = document.createElement("canvas");
  layer.width = W * RES;
  layer.height = H * RES;
  const ctx = layer.getContext("2d");
  ctx.scale(RES, RES);
  paintTurf(ctx);
  const art = REALM.groundArt, kit = () => ({ clear, rng: mulberry32((REALM.seed ^ 0x6a7d) >>> 0), SW });
  if (artFor("turf", art)) artFor("turf", art)(ctx, kit());
  paintRoad(ctx);
  if (artFor("road", art)) artFor("road", art)(ctx, kit());
  bakeWater(ctx);
  layerKey = key;
  return layer;
}

// The living parts of the ground, every frame over the cached layer: the
// sea's wash on a coast (coast.js) and the road's chevrons (road.js).
export function drawRoadLive(ctx, g) {
  drawShoreLive(ctx, g);
  drawRoadMarks(ctx, g);
}

// a spare export for the lab pages: paint one lit ball where they ask
export { ball };
