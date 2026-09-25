// ============ RENDER: THE GROUND ============
// The static world — turf, its thousand small details, and the road with its
// three lanes — painted ONCE per realm into a high-resolution layer, then
// blitted every frame. Nothing here moves, so nothing here costs a frame.
//
// The detail is the point: zoomed in, the meadow is blades of grass, clover
// and daisies, and the road is packed earth with pebbles and worn tracks.

import { W, H, PATH_HALF, LANE_OFF, RES, mulberry32 } from "../data/constants.js";
import { REALM } from "../data/maps.js";
import { PTS, nearestOnPath } from "../engine/path.js";
import { TUFTS, FLOWERS, SPECKS, PEBBLES, PONDS, CHEVRONS, DECOR, inRiver, FOREST, forestDepthAt } from "../data/terrain.js";
import { lighten, darken, mix, rgba, soft, shadow, tuft, flower, stone, clover, blade, strokePts, offsetPts, hash, ball, blobBall, lin, rad, bakeSprite, part, PX } from "./paint.js";

let layer = null;
let layerKey = "";

const inPond = (x, y, m = 0) =>
  PONDS.some((p) => Math.abs(x - p.x) < p.w / 2 + 6 + m && Math.abs(y - p.y) < p.h / 2 + 6 + m);

// Open turf: off the road, out of the water.
const clear = (x, y, m) => nearestOnPath(x, y).d > PATH_HALF + m && !inPond(x, y, m) && !inRiver(x, y, m) && forestDepthAt(x, y) < -6;

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
  if (bound) for (let i = 0; i < bound.length; i++) bound[i] = FOREST.edge === "left" ? forestDepthAt(0, i / RES) : forestDepthAt(i / RES, 0);
  for (let py = 0; py < PH; py++) {
    const y = py / RES, y0 = y | 0, v = y - y0, row = y0 * FW;
    for (let px = 0; px < PW; px++) {
      const x = px / RES, x0 = x | 0, u = x - x0, k = row + x0;
      const t = (field[k] * (1 - u) + field[k + 1] * u) * (1 - v) + (field[k + FW] * (1 - u) + field[k + FW + 1] * u) * v;
      const dz = BAYER[(py & 3) * 4 + (px & 3)];
      let c;
      const depth = !bound ? -999 : FOREST.edge === "left" ? bound[py] - x : bound[px] - y;
      if (depth + dz * 7 > 0) {
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

  const base = mix(R.GRASS_DK, R.GRASS, 0.25);
  const tip = lighten(R.GRASS_LT, 0.22);
  const deep = darken(R.GRASS_DK, 0.2);

  // the forest floor: leaf litter and roots where the grass gives up
  if (FOREST) {
    for (let i = 0; i < 260; i++) {
      const x = rng() * W, y = rng() * H;
      const dpt = forestDepthAt(x, y);
      if (dpt < 2 || nearestOnPath(x, y).d < PATH_HALF + 2) continue;
      const col = i % 3 === 0 ? "#6a4a2c" : i % 3 === 1 ? "#4a5a2c" : "#7a6234";
      ctx.fillStyle = rgba(col, 0.8);
      ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 1 + (i % 2) * 0.5, 0.5);
    }
  }

  // clover, in little colonies rather than evenly sown
  for (let i = 0; i < 70; i++) {
    const cx = rng() * W, cy = rng() * H, n = 2 + Math.floor(rng() * 4);
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
    const x = rng() * W, y = rng() * H;
    if (!clear(x, y, 5)) continue;
    if (rng() > 0.2 + (0.6 - lush(x, y)) * 2.6) continue;
    blades.push([x, y, 0.5 + rng() * 0.65]);
  }
  blades.sort((a, b) => a[1] - b[1]);
  blades.forEach(([x, y, s], i) => tuft(ctx, x, y, s, i % 4 === 0 ? deep : base, i % 3 === 0 ? R.GRASS_LT : tip, i));

  // the wood's hem: bushes and ferns crowding the treeline
  if (FOREST) {
    const span = FOREST.edge === "left" ? H : W;
    const leaf = mix(R.GRASS_DK, "#3f7a40", 0.5);
    for (let u = 4, i = 0; u < span; u += 9 + hash(i, 71) * 8, i++) {
      const out = 2 + hash(i, 72) * 9;
      // forestDepthAt(0, u) is where the treeline crosses; step out onto the grass
      const x = FOREST.edge === "left" ? forestDepthAt(0, u) + out : u;
      const y = FOREST.edge === "left" ? u : forestDepthAt(u, 0) + out;
      if (nearestOnPath(x, y).d < PATH_HALF + 12 || inPond(x, y, 4) || inRiver(x, y, 6) || x > W - 70) continue;
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

// ---- the road ----------------------------------------------------------
function paintRoad(ctx) {
  const R = REALM;
  const rng = mulberry32((R.seed ^ 0x0a0ad) >>> 0);
  const main = R.PATH_MAIN, dk = R.PATH_DK, edge = R.PATH_EDGE;
  const lt = lighten(main, 0.2);
  const wide = PATH_HALF * 2;

  // dirt spreads onto the grass: a feathered halo (many faint rings, so the
  // edge has no edge), then a firmer margin
  for (let k = 9; k >= 1; k--) strokePts(ctx, PTS, wide + 2 + k * 3, rgba(edge, 0.03 + (9 - k) * 0.006));
  strokePts(ctx, PTS, wide + 3, mix(main, edge, 0.45));
  // the road is worn a little below the turf: its sunward edge sits in
  // shadow, the far edge catches light
  ctx.save(); ctx.translate(-1.2, -1.2);
  strokePts(ctx, PTS, wide + 2, rgba(darken(dk, 0.2), 0.4));
  ctx.restore();
  ctx.save(); ctx.translate(1.2, 1.2);
  strokePts(ctx, PTS, wide + 2, rgba(lighten(main, 0.3), 0.45));
  ctx.restore();
  // the body, with a paler crown down the middle
  strokePts(ctx, PTS, wide - 2, main);
  strokePts(ctx, PTS, wide - 16, rgba(lt, 0.18));
  // three lanes: the packed, paler tracks where feet and wheels go, and the
  // faint ridges of loose dirt between them
  for (const off of [-LANE_OFF, 0, LANE_OFF]) {
    strokePts(ctx, offsetPts(PTS, off), 12, rgba(lighten(main, 0.28), 0.2));
    strokePts(ctx, offsetPts(PTS, off), 5, rgba(lighten(main, 0.4), 0.14));
  }
  for (const off of [-LANE_OFF / 2, LANE_OFF / 2]) {
    strokePts(ctx, offsetPts(PTS, off), 3, rgba(dk, 0.13));
  }
  // mottling: damp patches and dust
  for (let i = 0; i < 90; i++) {
    const d = rng() * 1;
    const idx = Math.floor(d * (PTS.length - 1));
    const [px, py] = PTS[idx];
    const x = px + (rng() - 0.5) * wide * 0.9, y = py + (rng() - 0.5) * wide * 0.9;
    const col = rng() > 0.45 ? dk : lt;
    soft(ctx, x, y, 5 + rng() * 12, 3 + rng() * 6, [[0, rgba(col, 0.16)], [1, rgba(col, 0)]]);
  }
  // pebbles and the odd bigger stone, half-trodden into the dirt
  for (const pb of PEBBLES) {
    const col = pb.s > 0.6 ? mix(dk, "#8d8478", 0.4) : R.PEBBLE;
    stone(ctx, pb.x, pb.y, pb.r * 0.9, pb.r * 0.62, col);
  }
  // grass creeping in over the edges
  const base = mix(R.GRASS_DK, R.GRASS, 0.25), tip = lighten(R.GRASS_LT, 0.15);
  for (let i = 1; i < PTS.length - 1; i += 2) {
    for (const side of [-1, 1]) {
      if (rng() > 0.55) continue;
      const p = PTS[Math.max(0, i - 1)], n = PTS[Math.min(PTS.length - 1, i + 1)];
      let dx = n[0] - p[0], dy = n[1] - p[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const off = (PATH_HALF + 1 + rng() * 3) * side;
      const x = PTS[i][0] - dy * off + (rng() - 0.5) * 8, y = PTS[i][1] + dx * off + (rng() - 0.5) * 4;
      tuft(ctx, x, y, 0.6 + rng() * 0.5, base, tip, 900 + i * 2 + side, { n: 3 });
    }
  }
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
  paintRoad(ctx);
  layerKey = key;
  return layer;
}

// The living parts of the road: chevrons that kindle when a column marches
// over them. Drawn every frame, on top of the cached ground.
export function drawRoadLive(ctx, g) {
  const R = REALM;
  const hot = lighten(R.PATH_MAIN, 0.6);
  for (const ch of CHEVRONS) {
    const on = Math.sin(g.time * 2.2 - ch.d * 0.045) > 0;
    let near = false;
    for (const e of g.enemies) {
      if (!e.dead && Math.abs(e.dist - ch.d) < 60) { near = true; break; }
    }
    ctx.save();
    ctx.translate(ch.x, ch.y);
    ctx.rotate(ch.a);
    const a = near ? (on ? 0.7 : 0.5) : on ? 0.32 : 0.16;
    ctx.strokeStyle = `rgba(${R.CHEVRON},${a})`;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-3, -5); ctx.lineTo(2, 0); ctx.lineTo(-3, 5);
    ctx.stroke();
    if (near) {
      ctx.strokeStyle = rgba(hot, on ? 0.55 : 0.3);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// a spare export for the lab pages: paint one lit ball where they ask
export { ball };
