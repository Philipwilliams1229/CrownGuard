// ============ RENDER: SCENERY OF THE RIMEWATER ============
// Zone IV, the Rime Clans' frigid sea country (art/ZONES-4-5.md): the
// chapter's own snow ground, its gate and its pieces, plugged into the shared
// renderers through one registry object, the same shape as IRON_ART (read
// that header in scenery-iron.js). Nothing here runs at module load, so the
// import of the shared kit back from scenery.js is safe. Every Rimewater
// board gets all of it from rimeVariant (src/data/rime-ground.js); the
// footprints are registered there (data never imports render).
//
// The country: drifted snow under a low white sky, wind ripples and
// sastrugi all laid along ONE wind (from the west-north-west), black
// wind-scoured rock breaking through, frozen puddles, dead grass poking out
// of the drifts; dark spruce bowed under snow; the clans' sea-teal and
// ochre on their carving, shields and sails; frost-blue ice everywhere.
//
// Ground art key: "rime" (rimeTurf repaints the whole snow field itself —
// no square patches: its tones come from long wind-stretched drifts, never a
// thresholded lattice — and rimeRoad lays old flagstones showing through the
// packed snow of the track).
// Spawn kind: "rimegate" — a glacier wall along the spawn edge, the road
// coming out of a cleft cut through it, a carved clan gate (dragon-head
// posts, a lintel hung with shields) standing in the mouth. Works for left
// and top entries. Two decor pieces from rime-ground.js: "rmgate" v 9 (the
// near cleft wall and the gate's lintel, sorted SOUTH of the road so the
// column walks under it) and "rmice" (draws nothing: hall-blockers along
// the ice). The rest is the spawn layer, under the foes.
// Pieces IN the water (REALM.rimeFloes, drawn with the gate, like the fen's
// relics): floe, berg, seals, skerry. A board with water and no list gets a
// few floes sown in its sea or meres; `rimeFloes: false` turns that off.
//
// Pieces (decor types; a decor entry's `v` picks the look):
//   rmspruce     snow-laden spruce (the edge wood's tree too)
//   rmrock       black wind-scoured rock, snow in its lee (v0-3 shapes)
//   rmlonghouse  turf-roofed longhouse, carved gables, smoke (live);
//                v odd: the door and the woodpile on the other end
//   rmrunestone  a rune stone, a serpent band cut and painted teal/ochre
//   rmskaldstone a skald's tall picture stone (mushroom head, a ship cut on it)
//   rmwhale      v0 a whale's ribs arching out of the snow, v1 its skull+jaw
//   rmboat       a small boat upturned on stones (v odd: the other way)
//   rmlongship   a longship drawn up on rollers, prow east (v1: prow west);
//                the hull runs ~10 below its feet: feet on the sand line
//   rmrack       a fish-drying rack hung with stockfish
//   rmcairn      a cairn of black stones, snow-capped
//   rmicefall    v0 a frozen waterfall on a black crag, v1 an ice crag
//   rmsealrock   a seal colony hauled out on a shore rock
//   rmtussock    a tussock of dead grass in a drift (flat)

import { W, H, PATH_HALF, RES, MX, MY } from "../data/constants.js";
import { PTS, TOTAL_LEN, posAt, angleAt, nearestOnPath } from "../engine/path.js";
import { COAST, PONDS, RIVERS, inSea, seaDepthAt, coastLine, inRiver, forestDepthAt, DECOR } from "../data/terrain.js";
import { REALM } from "../data/maps.js";
import {
  lighten, darken, mix, rgb, rgba, soft, shadow, ball, glow, cylinder, hash, ellipse, lin, bakeSprite, inkOutline, part, PX,
} from "./paint.js";
import { turfTones, groundLayer } from "./world.js";
import { SEA_ICE } from "./coast.js";

// ---- the Rimewater's colours -------------------------------------------------
const INK = "#241a26";
const SNOW = "#e6eef2", SNOW_LT = "#f8fbfc", SNOW_SH = "#b8c8d8", SNOW_DK = "#90a6bc";
const ROCK = ["#1c1b22", "#28272f", "#36353e", "#47464f", "#5c5a64", "#74727c"];
const ICE = ["#4e7690", "#6f96ae", "#93bacd", "#b8d8e6", "#dcf0f6"];
const SPRUCE = ["#1f3a34", "#284840", "#33584c", "#3f6a5a"];
const TEAL = "#2f7f7a", TEAL_LT = "#4fa59a", TEAL_DK = "#1e5452";
const OCHRE = "#c8902e", OCHRE_LT = "#e2b452", OCHRE_DK = "#8e6020";
const FROST = "#a8d8f0";
const WOOD = "#5a4430", WOOD_LT = "#7e6244", WOOD_DK = "#3a2a1e", TAR = "#2e2a2c";
const TURF = "#5c6448", TURF_LT = "#7c8458", TURF_DK = "#3e4432";
const STRAW = ["#5e5236", "#8a7646", "#b49a5c", "#d6c08a"];
const BONE = "#ddd6c4", BONE_DK = "#a49c88";
const SEAL = "#9a9084", SEAL_LT = "#c0b6a6", SEAL_DK = "#5e564e";

const ap = (v) => Math.round(v * PX) / PX;
const px1 = (c, x, y, w = 0.5, h = 0.5) => c.fillRect(ap(x), ap(y), w, h);
const poly = (c, pts) => { c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); };
const hexRGB = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// value noise, eased, on an integer lattice (x, y in lattice cells)
const vn = (x, y, seed) => {
  const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(xi + seed * 7, yi), b = hash(xi + 1 + seed * 7, yi), c = hash(xi + seed * 7, yi + 1), d = hash(xi + 1 + seed * 7, yi + 1);
  return (a + (b - a) * su) * (1 - sv) + (c + (d - c) * su) * sv;
};
const fbm = (x, y, seed) => vn(x, y, seed) * 0.55 + vn(x * 2.03 + 5.1, y * 2.03 + 1.7, seed + 3) * 0.3 + vn(x * 4.1 + 2.3, y * 4.1 + 8.9, seed + 7) * 0.15;

// THE wind: from the west-north-west, a little down the board as it goes east
const WA = 0.2, WC = Math.cos(WA), WS = Math.sin(WA);
const windU = (x, y) => x * WC + y * WS;           // along the wind
const windV = (x, y) => -x * WS + y * WC;          // across it

// ============ THE GROUND ============
// rimeTurf repaints every turf pixel of the layer (the sea, the beach and
// anything off the board's turf are left as world.js painted them), so the
// Frostfang tone map's grey hollows never show. One snow field:
//  - DRIFTS: fbm stretched ~3:1 along the wind, lit on their sunward
//    (upper-left) slopes, a cool blue lee on their downwind side;
//  - WIND RIPPLES: fine crest lines across the wind on the drifts' backs,
//    dashed, lit crest over a blue shadow pixel;
//  - SASTRUGI: sharp lens-shaped ridges in clusters, along the wind;
//  - SCOURED ROCK: a few black outcrops, snow packed on their windward side;
//  - FROZEN PUDDLES: sunk ice lenses, a shaded north rim, cracks, dusting;
//  - TUSSOCKS: dead grass poking out of little drifts;
//  - the edge wood's floor in the spruces' cold shade, needles on it.
// Tones come from the realm's own turf ramp (world.js turfTones), so the
// apron beyond the board (which paints that ramp) meets it at the seam.
const rimeTurf = (ctx, kit) => {
  if (typeof document === "undefined") return;
  const R = REALM, seed = (R.seed | 0) % 100000;
  const cv = ctx.canvas, PW = cv.width, PHh = cv.height, K = PW / W;
  const img = ctx.getImageData(0, 0, PW, PHh), d = img.data;
  const T = turfTones(R).meadow;          // [r, g, b] at tone * 3 + temp
  const sand = COAST ? (COAST.sand ?? 22) : 0;
  // ---- the fields, every FS units, eased between
  const FS = 2, FW = Math.ceil(W / FS) + 3, FH = Math.ceil(H / FS) + 3;
  const drift = new Float32Array(FW * FH), rip = new Float32Array(FW * FH), wood = new Float32Array(FW * FH);
  for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
    const x = i * FS, y = j * FS, u = windU(x, y), v = windV(x, y);
    const wx = (vn(x / 90, y / 90, seed + 1) - 0.5) * 40, wy = (vn(x / 90 + 7, y / 90, seed + 2) - 0.5) * 30;
    drift[j * FW + i] = fbm((u + wx) / 150, (v + wy) / 48, seed + 11);
    rip[j * FW + i] = vn(u / 70, v / 34, seed + 21);
    wood[j * FW + i] = forestDepthAt(x, y);
  }
  const at = (F, x, y) => {
    const fx = Math.max(0, x / FS), fy = Math.max(0, y / FS);
    const xi = Math.min(FW - 2, fx | 0), yi = Math.min(FH - 2, fy | 0), u = fx - xi, v = fy - yi, k = yi * FW + xi;
    return (F[k] * (1 - u) + F[k + 1] * u) * (1 - v) + (F[k + FW] * (1 - u) + F[k + FW + 1] * u) * v;
  };
  // a pixel is ours if it is board turf: not the sea, the beach or its fringe
  const own = new Uint8Array(PW * PHh);
  const tone = new Uint8Array(PW * PHh), temp = new Uint8Array(PW * PHh);
  const put = (i, c) => { const o = i << 2; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; };
  // wind-streak dither: runs 3-7 px long along each row
  const streak = (px, py) => { const L = 3 + (hash(py, seed + 5) * 5 | 0), id = Math.floor((px + hash(py, seed + 6) * 9) / L); return hash(id, py * 31 + seed); };
  for (let py = 0; py < PHh; py++) {
    const y = py / K;
    for (let px = 0; px < PW; px++) {
      const x = px / K, i = py * PW + px;
      if (COAST) {
        const sd = seaDepthAt(x, y);
        // (the beach's own dithered edge is kept: a streaky hand-over band)
        if (sd > -sand - 2 || (sd > -sand - 6 && streak(px, py) < (sd + sand + 6) / 4)) continue;
      }
      own[i] = 1;
      const D = at(drift, x, y);
      // slope of the drifts: lit facing the sun (upper left), lee downwind
      const gx = (at(drift, x + 2, y) - at(drift, x - 2, y)) / 4, gy = (at(drift, x, y + 2) - at(drift, x, y - 2)) / 4;
      const sun = Math.max(-1, Math.min(1, -(gx * 0.42 + gy * 0.58) * 42));
      const lee = (gx * WC + gy * WS) * 60;                 // < 0: falling away downwind
      const dz = streak(px, py) - 0.5, dz2 = streak(px + 37, py + 3) - 0.5;
      let tt = 0.52 + (D - 0.5) * 0.55 + sun * 0.3 + dz * 0.1;
      let tn = tt < 0.3 ? 2 : tt < 0.69 ? 3 : tt < 0.86 ? 4 : 5;
      let tp = lee + dz2 * 0.5 < -0.55 ? 0 : sun + dz2 * 0.4 > 0.35 ? 2 : 1;
      if (lee + dz2 * 0.4 < -1.15 && tn > 2) tn--;          // the deep lee, one step down and blue
      // wind ripples on the drifts' backs: fine lines across the wind
      const m = at(rip, x, y) * sstep(0.38, 0.62, D);
      if (m > 0.42) {
        const u = windU(x, y), v = windV(x, y);
        const ph = (v + 2.2 * Math.sin(u * 0.045 + D * 7)) / 4.5, f = ph - Math.floor(ph);
        const dash = hash(Math.floor((u + hash(Math.floor(ph), seed) * 20) / (5 + (Math.floor(ph) & 3) * 2)), Math.floor(ph) + seed) < 0.55 + (m - 0.42) * 1.2;
        if (dash) {
          if (f < 0.11) { tn = Math.min(6, tn + 1); tp = 2; } else if (f < 0.22) { tn = Math.max(1, tn - 1); tp = 0; }
        }
      }
      // the wood's floor: the spruces' cold shade
      const wd = at(wood, x, y);
      if (wd + dz * 8 > -4) { tn = Math.max(1, tn - (wd > 18 ? 2 : 1)); tp = 0; }
      tone[i] = tn; temp[i] = tp;
      put(i, T[tn * 3 + tp]);
    }
  }
  const P = (v) => Math.round(v * K);
  const shift = (px, py, dt, tp = -1) => {
    if (px < 0 || py < 0 || px >= PW || py >= PHh) return;
    const i = py * PW + px; if (!own[i]) return;
    const n = Math.max(0, Math.min(6, tone[i] + dt)); tone[i] = n; if (tp >= 0) temp[i] = tp;
    put(i, T[n * 3 + temp[i]]);
  };
  const set = (px, py, c) => { if (px < 0 || py < 0 || px >= PW || py >= PHh) return; const i = py * PW + px; if (!own[i]) return; own[i] = 2; put(i, c); };
  const rng = mulberry((R.seed ^ 0x51e7) >>> 0);
  const taken = [];
  const free = (x, y, r) => kit.clear(x, y, r) && !taken.some(([tx, ty, tr]) => Math.hypot(tx - x, (ty - y) * 1.3) < tr + r)
    && !DECOR.some((q) => !q.forest && Math.hypot(q.x - x, (q.y - y) * 1.4) < 12 * (q.s || 1) + r);
  const spot = (r, tries = 30) => {
    for (let k = 0; k < tries; k++) {
      const x = 16 + rng() * (kit.SW - 32), y = 16 + rng() * (H - 32);
      if (free(x, y, r)) return [x, y];
    }
    return null;
  };

  // ---- scoured rock: a few black outcrops breaking the snow
  const RK = ROCK.map(hexRGB);
  const nRock = 4 + (rng() * 4 | 0);
  for (let n = 0; n < nRock; n++) {
    const big = n < 2, r = big ? 9 + rng() * 6 : 4 + rng() * 4;
    const at0 = spot(r + 6);
    if (!at0) continue;
    const [cx, cy] = at0, sd = (rng() * 1e5) | 0;
    taken.push([cx, cy, r + 4]);
    const rr = (a) => r * (0.62 + 0.55 * vn(Math.cos(a) * 1.6 + 3, Math.sin(a) * 1.6 + 3, sd));
    const x0 = P(cx - r * 1.4), x1 = P(cx + r * 1.4), y0 = P(cy - r), y1 = P(cy + r);
    // its shadow on the snow, thrown down-right, cool
    for (let py = y0; py <= y1 + P(3); py++) for (let px = x0; px <= x1 + P(4); px++) {
      const x = px / K - cx - 2.2, y = (py / K - cy - 1.6) * 1.6, a = Math.atan2(y, x);
      if (Math.hypot(x, y) < rr(a) * 0.95) shift(px, py, -1, 0);
    }
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const x = px / K - cx, y = (py / K - cy) * 1.6, a = Math.atan2(y, x), q = Math.hypot(x, y) / rr(a);
      if (q > 1) continue;
      // lit on the upper left, dark down-right; the bottom rim darkest
      const lit = -(x / r) * 0.5 - (y / r) * 0.7 + (vn(px / 3, py / 3, sd) - 0.5) * 0.9;
      let k = lit > 0.55 ? 4 : lit > 0.1 ? 3 : lit > -0.4 ? 2 : 1;
      if (q > 0.86 && y > 0) k = 0;
      // snow packed on the windward (west) side and lying in its pockets
      const snowy = (x / r < -0.25 + vn(px / 4, py / 5, sd + 1) * 0.5 && q < 0.95) || (vn(px / 2.5, py / 2.5, sd + 2) > 0.7 && y < r * 0.4);
      if (snowy) { const i = py * PW + px; if (own[i]) { tone[i] = lit > 0 ? 5 : 4; temp[i] = lit > 0 ? 2 : 0; set(px, py, T[tone[i] * 3 + temp[i]]); } }
      else set(px, py, RK[k]);
    }
  }

  // ---- frozen puddles: sunk lenses of ice
  const IC = ICE.map(hexRGB);
  const nPud = 3 + (rng() * 4 | 0);
  for (let n = 0; n < nPud; n++) {
    const rx = 4.5 + rng() * 7, ry = rx * (0.4 + rng() * 0.12);
    const at0 = spot(rx + 5);
    if (!at0) continue;
    const [cx, cy] = at0, sd = (rng() * 1e5) | 0;
    taken.push([cx, cy, rx + 3]);
    // (the same sheet as the meres', at a puddle's scale: a shaded north
    // rim and a wet thaw line on the sunlit south, snow streaked over the
    // windward half, a clear dark window in the lee, cracks with a lit lip)
    const wob = (a) => 1 + (vn(Math.cos(a) * 1.4 + 9, Math.sin(a) * 1.4 + 9, sd) - 0.5) * 0.35;
    const WIN = [Math.round(IC[0][0] * 0.55), Math.round(IC[0][1] * 0.55), Math.round(IC[0][2] * 0.6)], WET = [22, 40, 54];
    const wx = cx - rx * 0.3, wy = cy + ry * 0.15;                  // where the window lies (downwind of the middle)
    for (let py = P(cy - ry - 2); py <= P(cy + ry + 2); py++) for (let px = P(cx - rx - 2); px <= P(cx + rx + 2); px++) {
      const x = (px / K - cx) / rx, y = (py / K - cy) / ry, a = Math.atan2(y, x), q = Math.hypot(x, y) / wob(a);
      if (q > 1.18) continue;
      if (q > 1) { if (y < 0) shift(px, py, -1, 0); else shift(px, py, 1, 2); continue; }   // the sunk rim: shaded north, lit south
      if (q > 0.9 && y > 0.3) { set(px, py, WET); continue; }                                 // the thaw line along the sunlit edge
      if (q > 0.84 && y < 0) { set(px, py, IC[0]); continue; }                                 // the north rim's shadow on the ice
      const u = windU(px / K, py / K), v = windV(px / K, py / K);
      const S = vn(u / 7, v / 2.2, sd + 3) - x * 0.18;                                            // snow streaks, more on the windward (west) half
      if (S > 0.62 && q < 0.92) { shift(px, py, S > 0.72 ? 1 : 0, S > 0.72 ? 2 : 1); continue; }
      const wd = Math.hypot((px / K - wx) / (rx * 0.42), (py / K - wy) / (ry * 0.5)) + (vn(px / 2.5, py / 2.5, sd + 5) - 0.5) * 0.5;
      if (wd < 1 && q < 0.8) { set(px, py, ((px + py * 2 + sd) % 11) < 1 && y > -0.2 ? IC[1] : WIN); continue; }   // the window, the sun's sheen across it
      let k = y < -0.1 ? 2 : 3;
      if (((px + py * 2 + sd) % 23) < 2 && q < 0.8) k = 4;
      set(px, py, IC[k]);
    }
    // cracks, from the rim inward, a lit lip on their upper-left side
    for (let c = 0; c < 2 + (rng() * 2 | 0); c++) {
      const a0 = rng() * 6.3;
      let x = P(cx + Math.cos(a0) * rx * 0.8), y = P(cy + Math.sin(a0) * ry * 0.8), a = a0 + Math.PI + (rng() - 0.5) * 0.8;
      for (let k = 0; k < rx * 1.4; k++) {
        a += (rng() - 0.5) * 0.5; x += Math.round(Math.cos(a)); y += Math.round(Math.sin(a) * 0.6);
        const xx = (x / K - cx) / rx, yy = (y / K - cy) / ry;
        if (xx * xx + yy * yy > 0.8) break;
        set(x, y, IC[0]); if (k & 1) set(x - 1, y - 1, IC[4]);
      }
    }
  }

  // ---- sastrugi: sharp ridges carved by the wind, in clusters
  const nSas = 6 + (rng() * 5 | 0);
  for (let n = 0; n < nSas; n++) {
    const at0 = spot(14);
    if (!at0) continue;
    const [cx, cy] = at0, cnt = 3 + (rng() * 5 | 0);
    for (let k = 0; k < cnt; k++) {
      const sx = cx + (rng() - 0.5) * 22, sy = cy + (rng() - 0.5) * 12;
      if (!free(sx, sy, 3)) continue;
      const len = 5 + rng() * 9, hw = 0.9 + rng() * 1.1, L = Math.round(len * K);
      for (let t = 0; t <= L; t++) {
        const f = t / L, w = Math.max(1, Math.round(hw * K * Math.sin(Math.PI * Math.pow(f, 0.7))));
        const x = P(sx) + Math.round(t * WC), y = P(sy) + Math.round(t * WS);
        shift(x, y - w, 2, 2);                         // the lit crest
        for (let q = 1 - w; q < 0; q++) shift(x, y + q, 1, 2);
        shift(x, y, -1, 0); shift(x, y + 1, -2, 0);    // its blue face and the sharp shadow under it
        if (w > 1) shift(x, y + 2, -1, 0);
      }
    }
  }

  // ---- tussocks: dead grass poking out of little drifts
  const ST = STRAW.map(hexRGB);
  const nTus = 14 + (rng() * 8 | 0);
  for (let n = 0; n < nTus; n++) {
    const at0 = spot(6);
    if (!at0) continue;
    const cnt = 1 + (rng() * 4 | 0);
    for (let k = 0; k < cnt; k++) {
      const tx = at0[0] + (rng() - 0.5) * 14, ty = at0[1] + (rng() - 0.5) * 7;
      if (!free(tx, ty, 2)) continue;
      const bx = P(tx), by = P(ty), wN = 2 + (rng() * 3 | 0);
      // its drift: a lit mound and a blue lee to the east
      for (let q = -wN - 2; q <= wN + 4; q++) { shift(bx + q, by + 1, q < 2 ? 1 : -1, q < 2 ? 2 : 0); if (Math.abs(q) < wN) shift(bx + q, by, 1, 2); }
      const blades = 4 + (rng() * 6 | 0);
      for (let b = 0; b < blades; b++) {
        const ox = Math.round((rng() - 0.5) * wN * 2), hgt = 4 + (rng() * 7 | 0), lean = rng() < 0.65 ? 1 : 0;
        for (let h = 0; h < hgt; h++) {
          const yy = by - h, xx = bx + ox + (lean && h > hgt / 2 ? 1 : 0);
          set(xx, yy, ST[h === hgt - 1 ? 3 : h > hgt / 2 ? 2 : h > 0 ? 1 : 0]);
        }
      }
      taken.push([tx, ty, 3]);
    }
  }

  // ---- needles and twigs on the wood's floor; glints on the open snow
  const NE = [hexRGB("#34463c"), hexRGB("#4a5a46"), hexRGB("#5a4a3a")];
  for (let k = 0; k < 2600; k++) {
    const x = rng() * kit.SW, y = rng() * H, px = P(x), py = P(y);
    const wd = forestDepthAt(x, y);
    if (wd > -2 && hash(px, py) < 0.5) { const c = NE[(rng() * 3) | 0]; set(px, py, c); if (rng() < 0.4) set(px + 1, py + (rng() < 0.5 ? 1 : -1), c); }
    else if (wd < -10 && k < 700) { const i = py * PW + px; if (own[i] === 1 && tone[i] >= 4) shift(px, py, 2, 2); }
  }
  ctx.putImageData(img, 0, 0);
};

// ---- the road: a trodden track over old flagstones ------------------------
// paintRoad (road.js) has laid the packed snow, its runners and ruts in the
// realm's PATH colours. Over it, in a few stretches, the clans' old road
// shows through: courses of dark flagstones (lengths and widths varying,
// tones from noise patches, never per stone), snow lying in their joints and
// drifted over their ends; churned grit along the lanes. No flags in bends
// (a flag belongs wholly to one arm) nor at the gate's cleft.
const rimeRoad = (ctx) => {
  if (typeof document === "undefined" || PTS.length < 2) return;
  const R = REALM, seed = (R.seed | 0) % 100000;
  const cv = ctx.canvas, PW = cv.width, PHh = cv.height, K = PW / W;
  const img = ctx.getImageData(0, 0, PW, PHh), d = img.data;
  // the old flags: a cool grey only a few steps below the trodden snow
  const STN = ["#8e989e", "#9aa4aa", "#a6b0b5", "#b2bbbf", "#c8d0d4"].map(hexRGB);
  const DUST = [hexRGB("#d8e2e8"), hexRGB("#e8f0f4")];
  const GRIT = [hexRGB("#8a8270"), hexRGB("#6e6656")];
  const put = (px, py, c) => { if (px < 0 || py < 0 || px >= PW || py >= PHh) return; const o = (py * PW + px) << 2; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; };
  const half = PATH_HALF - 5;
  // where the road bends, no flags
  const bendy = (dd) => { const a0 = angleAt(Math.max(0, dd - 16)), a1 = angleAt(Math.min(TOTAL_LEN, dd + 16)); let da = Math.abs(a1 - a0); if (da > Math.PI) da = 2 * Math.PI - da; return da > 0.06; };
  // courses: boundaries along the road
  const courses = [];
  for (let s = 0, k = 0; s < TOTAL_LEN; k++) { courses.push(s); s += 6 + hash(k, seed + 3) * 5; }
  let ci = 0;
  for (let dd = 70; dd < TOTAL_LEN - 50; dd += 0.5 / K * 2) {
    const patch = vn(dd / 60, 0.5, seed + 31);
    if (patch < 0.72 || bendy(dd)) continue;
    while (ci < courses.length - 2 && courses[ci + 1] <= dd) ci++;
    const c0 = courses[ci], c1 = courses[ci + 1], fu = (dd - c0) / (c1 - c0);
    const [x0, y0] = posAt(dd), a = angleAt(dd), nx = -Math.sin(a), ny = Math.cos(a);
    for (let o = -half; o <= half; o += 0.5) {
      // stones across this course: widths 5-9, the joints staggered by course
      let acc = -half - hash(ci, seed) * 6, si = 0, w = 0;
      while (acc <= o) { w = 5 + hash(ci * 13 + si, seed + 9) * 4; acc += w; si++; }
      // only some stones show at all: the rest lie under the snow
      const sid = ci * 31 + si;
      const want = (patch - 0.72) * 2.6 + 0.1 - Math.pow(Math.abs(o) / half, 2) * 0.4;
      if (hash(sid, seed + 17) > want) continue;
      const fo = (o - (acc - w)) / w;
      // each stone's edge broken: corners rounded off, a ragged snow line
      const ex = Math.min(fu, 1 - fu) * (c1 - c0), ey = Math.min(fo, 1 - fo) * w;
      const rag = (hash(Math.round(dd * 4), Math.round(o * 4) + sid) - 0.5) * 1.2;
      if (ex < 0.6 + rag * 0.5 || ey < 0.6 + rag * 0.5 || Math.hypot(Math.max(0, 1.8 - ex), Math.max(0, 1.8 - ey)) > 1.5 + rag) continue;
      const px = Math.round((x0 + nx * o) * K), py = Math.round((y0 + ny * o) * K);
      // snow dusting over it in drifts; a lit upper-left edge, a shaded lower
      const dust = vn(dd / 4, o / 4, seed + 41);
      if (dust > 0.7) { put(px, py, DUST[dust > 0.8 ? 1 : 0]); continue; }
      const edgeLit = (ex < 1.3 && fu < 0.5) || (ey < 1.3 && fo < 0.5), edgeDk = (ex < 1.3 && fu >= 0.5) || (ey < 1.3 && fo >= 0.5);
      const tn = 1.6 + (vn(dd / 22, o / 16, seed + 51) - 0.5) * 1.6 + (edgeLit ? 1 : 0) - (edgeDk ? 1 : 0);
      put(px, py, STN[Math.max(0, Math.min(4, Math.round(tn)))]);
    }
  }
  // churned grit along the lanes, sparse
  const rng = mulberry((R.seed ^ 0x77a1) >>> 0);
  for (let k = 0; k < TOTAL_LEN * 0.9; k++) {
    const dd = rng() * TOTAL_LEN, lane = [-18, 0, 18][(rng() * 3) | 0] + (rng() - 0.5) * 8;
    const [x0, y0] = posAt(dd), a = angleAt(dd);
    const px = Math.round((x0 - Math.sin(a) * lane) * K), py = Math.round((y0 + Math.cos(a) * lane) * K);
    put(px, py, GRIT[rng() < 0.6 ? 0 : 1]); if (rng() < 0.5) put(px + 1, py, GRIT[0]);
  }
  ctx.putImageData(img, 0, 0);
};

// ============ THE PIECES ============
// Painted with paths into baked sprites (scenery.js inks the silhouette);
// feet at (x, y + 8). Sun from the upper left: lit west faces, shaded east,
// snow on every top, a cool contact shadow down-right.
const snowCap = (c, pts, sh = true) => {
  poly(c, pts); c.fillStyle = SNOW; c.fill();
  if (sh) { c.save(); c.clip(); c.fillStyle = SNOW_LT; const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); c.fillRect(Math.min(...xs), Math.min(...ys), (Math.max(...xs) - Math.min(...xs)) * 0.45, 1); c.restore(); }
};
const groundDrift = (c, x, gy, w, sd) => {
  // a little drift banked round a foot: lit crest, blue lee to the east
  c.fillStyle = SNOW_SH; ellipse(c, x + w * 0.25, gy + 0.6, w * 1.05, 1.9); c.fill();
  c.fillStyle = SNOW; ellipse(c, x - w * 0.1, gy, w * 0.95, 1.6); c.fill();
  c.fillStyle = SNOW_LT; c.fillRect(ap(x - w * 0.8), ap(gy - 1.2), w * 0.8, 0.5);
  if (hash(sd, 9) < 0.6) { c.fillStyle = STRAW[2]; px1(c, x - w * 0.7, gy - 1.5, 0.5, 1.5); px1(c, x - w * 0.6, gy - 2, 0.5, 2); }
};

// ---- the snow-laden spruce --------------------------------------------------
// Narrow and dark, its tiers drooping under the snow: each tier a skirt lit on
// its west side, a white load along its top that slumps over the tip, a blue
// underside. The edge wood darkens it by depth (band 0-2).
const SPR_BAND = [["#2e544a", "#3c6858", "#1f3a34"], ["#264840", "#33594c", "#1a322e"], ["#1e3b36", "#284a40", "#14282a"]];
const rmspruce = (ctx, x, y, s, o) => {
  const gy = y + 8, band = o.forest ? o.band || 0 : 0, sd = o.seed;
  const [mid, lit, dk] = SPR_BAND[band];
  const h = (38 + (o.v % 2) * 6) * s, w0 = (10.5 + hash(sd, 1) * 2) * s, lean = (hash(sd, 2) - 0.5) * 1.6 * s;
  if (!o.forest) shadow(ctx, x + 7 * s, gy + 1, w0 * 1.1, 3.4 * s, 0.3);
  part(ctx, (c) => { c.fillStyle = WOOD_DK; c.fillRect(ap(x - 1.2 * s), gy - 6 * s, 2.4 * s, 6 * s); c.fillStyle = WOOD; c.fillRect(ap(x - 1.2 * s), gy - 6 * s, 1, 6 * s); });
  const N = 6;
  part(ctx, (c) => {
    for (let i = 0; i < N; i++) {
      const f0 = i / N, f1 = (i + 1.35) / N;
      const by = gy - 4 * s - (h - 6 * s) * f0, ty = gy - 4 * s - (h - 6 * s) * f1;
      const cx = x + lean * f0, tx = x + lean * f1, w = w0 * (1 - f0 * 0.82) * (1 + (hash(sd, i + 5) - 0.5) * 0.14);
      const droop = 2.6 * s * (1 - f0 * 0.5);
      const L = [cx - w, by + droop * 0.4], Rr = [cx + w * 0.96, by + droop * 0.2];
      poly(c, [L, [cx - w * 0.55, by + droop * 0.9], [cx, by + droop], [cx + w * 0.5, by + droop * 0.9], Rr, [tx + w * 0.12, ty], [tx - w * 0.12, ty]]);
      c.fillStyle = lin(c, cx - w, 0, cx + w, 0, [[0, lit], [0.45, mid], [1, dk]]); c.fill();
      // the snow load: on the upper half of the rim each tier shows below
      // the next, heaviest in the middle, thin toward the tips; the drooping
      // lower edge stays dark green
      const band = (h - 6 * s) / N, sy0 = by - band * 0.95, load = 0.3 + hash(sd, i + 60) * 0.35, sy1 = by + droop * 0.15 - band * (0.75 - load);
      const ws = 0.55 + hash(sd, i + 70) * 0.45, wo = (hash(sd, i + 80) - 0.5) * 0.3;
      const X = (k) => cx + w * (k * ws + wo);
      const sl = [[X(-0.85), by + droop * 0.05 - band * 0.25], [X(-0.5), sy0], [X(0.42), sy0 + 0.4 * s], [X(0.8), by - band * 0.3],
        [X(0.42), sy1 + 0.4 * s], [X(0), sy1 + Math.sin(i * 2.1 + sd) * 0.6 * s], [X(-0.45), sy1 - 0.3 * s]];
      poly(c, sl); c.fillStyle = band === 2 ? "#c4d2de" : SNOW; c.fill();
      c.fillStyle = band === 2 ? "#a8bccc" : SNOW_SH; c.fillRect(ap(cx + w * 0.05), ap(sy1), w * 0.4, 0.5);
      c.fillStyle = band === 2 ? "#dce6ee" : SNOW_LT; c.fillRect(ap(cx - w * 0.45), ap(sy0 + 0.3), w * 0.45, 0.5);
    }
    // the leader, snow on its tip
    c.fillStyle = dk; c.fillRect(ap(x + lean - 0.5), gy - h - 1.5 * s, 1, 3 * s);
    c.fillStyle = SNOW; c.fillRect(ap(x + lean - 1), gy - h - 2 * s, 1.5, 1);
  });
};

// ---- black scoured rock ------------------------------------------------------
const rockShape = (x, gy, w, h, sd, v) => {
  const n = 9, pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, a = Math.PI * (1 + t);           // the upper half, west to east
    const j = 1 + (hash(sd + v * 17, k) - 0.5) * 0.5 * (k % 2 ? 1.2 : 0.7);
    pts.push([x + Math.cos(a) * w * j, gy + Math.sin(a) * h * j * (v === 2 ? 0.7 : 1) - (v === 3 && k > n / 2 ? h * 0.25 : 0)]);
  }
  return pts;
};
const blackRock = (c, x, gy, w, h, sd, v, snowy = 1) => {
  const pts = rockShape(x, gy, w, h, sd, v);
  part(c, (cc) => {
    poly(cc, [...pts, [x + w, gy + 1], [x - w, gy + 1]]);
    cc.fillStyle = lin(cc, x - w, gy - h, x + w, gy, [[0, ROCK[4]], [0.4, ROCK[3]], [0.75, ROCK[2]], [1, ROCK[1]]]); cc.fill();
    cc.save(); cc.clip();
    // facets: a lit top plane, dark cracks running down
    poly(cc, [...pts.slice(1, 6).map(([px, py]) => [px, py]), [x + w * 0.1, gy - h * 0.35], [x - w * 0.6, gy - h * 0.25]]);
    cc.fillStyle = ROCK[4]; cc.fill();
    cc.fillStyle = ROCK[5];
    for (let k = 1; k < 5; k++) px1(cc, pts[k][0] + 0.5, pts[k][1] + 0.6, 1.5, 0.5);
    cc.fillStyle = ROCK[0];
    for (let k = 0; k < 3; k++) { const cx = x + (hash(sd, k + 40) - 0.3) * w * 1.2; for (let t = 0; t < h * 0.6; t += 0.5) px1(cc, cx + Math.sin(t + k) * 0.6, gy - t - 0.5); }
    // snow: on the top and banked on the windward (west) flank
    if (snowy) {
      cc.fillStyle = SNOW;
      poly(cc, [...pts.slice(0, 7).map(([px, py], i) => [px, py - 0.3]), [pts[6][0] - w * 0.15, pts[6][1] + h * 0.22], [x - w * 0.2, gy - h * 0.5 + 1.5], [x - w * 0.75, gy - h * 0.1], [x - w * 1.05, gy + 1]]);
      cc.fill();
      cc.fillStyle = SNOW_SH; for (let k = 2; k < 7; k++) px1(cc, pts[k][0], pts[k][1] + h * 0.18 + hash(sd, k) * 1.5, 1.5, 0.5);
      cc.fillStyle = SNOW_LT; for (let k = 1; k < 4; k++) px1(cc, pts[k][0], pts[k][1] + 0.2, 1.5, 0.5);
    }
    cc.restore();
  });
};
const rmrock = (ctx, x, y, s, o) => {
  const gy = y + 8, v = o.v % 4, w = (9 + v * 1.5) * s, h = (8 + (v === 1 ? 4 : 0)) * s;
  shadow(ctx, x + 4 * s, gy + 1, w * 1.15, 3.2 * s, 0.32);
  blackRock(ctx, x, gy, w, h, o.seed, v);
  groundDrift(ctx, x - w * 0.6, gy + 0.5, w * 0.55, o.seed);
};

// ---- a cairn of black stones ----------------------------------------------------
const rmcairn = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed;
  shadow(ctx, x + 4 * s, gy + 1, 9 * s, 3 * s, 0.3);
  // flat slabs of black stone, each course narrower, set a little askew
  const courses = [[9, 3], [7.5, 2.6], [6, 2.4], [4.4, 2.2], [3, 2]];
  let yy = gy;
  courses.forEach(([cw, ch], ri) => {
    const cx = x + (hash(sd, ri) - 0.5) * 1.6 * s, hw = cw * s * (0.9 + hash(sd, ri + 9) * 0.2), hh = ch * s;
    part(ctx, (c) => {
      const tl = (hash(sd, ri + 20) - 0.5) * 1.2 * s;
      poly(c, [[cx - hw, yy], [cx - hw * 0.94, yy - hh + tl], [cx + hw * 0.9, yy - hh - tl], [cx + hw, yy]]);
      c.fillStyle = lin(c, cx - hw, 0, cx + hw, 0, [[0, ROCK[4]], [0.5, ROCK[3]], [1, ROCK[1]]]); c.fill();
      c.fillStyle = ROCK[5]; c.fillRect(ap(cx - hw * 0.9), ap(yy - hh + 0.2), hw * 0.8, 0.5);
      c.fillStyle = ROCK[0]; c.fillRect(ap(cx - hw * (0.3 - hash(sd, ri + 4) * 0.4)), ap(yy - hh + 0.6), 0.5, hh - 0.6);
      // snow on its top ledge, more on the west
      c.fillStyle = SNOW; c.fillRect(ap(cx - hw * 0.95), ap(yy - hh - 0.6 + tl * 0.5), hw * (1 + hash(sd, ri + 30) * 0.6), 1);
    });
    yy -= hh * 0.92;
  });
  ctx.fillStyle = SNOW; ctx.fillRect(ap(x - 2.5 * s), ap(yy - 1), 4.5 * s, 1.2);
  // a clan's teal rag on a stick at the top
  ctx.fillStyle = WOOD_DK; ctx.fillRect(ap(x + 0.5), yy - 7 * s, 1, 7 * s + 1);
  ctx.fillStyle = TEAL; ctx.fillRect(ap(x + 1.5), ap(yy - 7 * s), 3 * s, 1.5); ctx.fillStyle = TEAL_LT; ctx.fillRect(ap(x + 1.5), ap(yy - 7 * s), 2 * s, 0.5);
  groundDrift(ctx, x - 7 * s, gy + 0.5, 4 * s, sd);
};

// ---- rune stone and skald's stone -------------------------------------------------
const slab = (c, x, gy, w, h, col, sd, head = 0) => {
  // an upright slab, rounded crown (head: a mushroom-headed picture stone)
  c.beginPath();
  c.moveTo(x - w, gy);
  if (head) {
    c.lineTo(x - w * 0.82, gy - h * 0.62); c.lineTo(x - w * 1.12, gy - h * 0.72);
    c.quadraticCurveTo(x - w * 1.2, gy - h * 1.02, x, gy - h * 1.02); c.quadraticCurveTo(x + w * 1.2, gy - h * 1.02, x + w * 1.12, gy - h * 0.72);
    c.lineTo(x + w * 0.82, gy - h * 0.62);
  } else {
    c.lineTo(x - w * 0.95, gy - h * 0.72); c.quadraticCurveTo(x - w * 0.9, gy - h * 1.02, x + w * 0.1, gy - h); c.quadraticCurveTo(x + w * 0.95, gy - h * 0.95, x + w * 0.9, gy - h * 0.6);
  }
  c.lineTo(x + w, gy); c.closePath();
  c.fillStyle = lin(c, x - w, 0, x + w, 0, [[0, lighten(col, 0.25)], [0.5, col], [1, darken(col, 0.35)]]); c.fill();
};
const rmrunestone = (ctx, x, y, s, o) => {
  const gy = y + 8, w = 5.5 * s, h = 21 * s, sd = o.seed, col = "#7e7c80";
  shadow(ctx, x + 5 * s, gy + 1, 8 * s, 2.8 * s, 0.3);
  part(ctx, (c) => {
    slab(c, x, gy, w, h, col, sd);
    c.save(); c.clip();
    // the serpent band: a ribbon looping down the face, ochre with teal edges
    c.lineWidth = 1.6 * s; c.strokeStyle = TEAL_DK; c.beginPath();
    const path = (cc, ox) => { cc.beginPath(); cc.moveTo(x - w * 0.55 + ox, gy - 2 * s); cc.bezierCurveTo(x - w * 0.9 + ox, gy - h * 0.6, x + w * 0.9 + ox, gy - h * 0.55, x + w * 0.4 + ox, gy - h * 0.86); cc.bezierCurveTo(x + w * 0.1 + ox, gy - h * 0.98, x - w * 0.5 + ox, gy - h * 0.82, x - w * 0.2 + ox, gy - h * 0.66); };
    path(c, 0); c.stroke();
    c.lineWidth = 0.9 * s; c.strokeStyle = OCHRE; path(c, 0); c.stroke();
    // runes cut along the band: short dark ticks
    c.fillStyle = "#3a3840";
    for (let k = 0; k < 9; k++) { const t = k / 9; px1(c, x - w * 0.55 + Math.sin(t * 5) * w * 0.4, gy - 3 * s - t * h * 0.55, 0.5, 1.2); }
    // the serpent's head, a teal eye; frost in the cut
    c.fillStyle = OCHRE_LT; px1(c, x - w * 0.25, gy - h * 0.67, 1.5, 1);
    c.fillStyle = FROST; px1(c, x - w * 0.6, gy - h * 0.35, 1, 0.5); px1(c, x + w * 0.3, gy - h * 0.5, 0.5, 0.5);
    c.restore();
    snowCap(c, [[x - w * 0.85, gy - h * 0.86], [x - w * 0.3, gy - h * 1.01], [x + w * 0.5, gy - h * 0.98], [x + w * 0.85, gy - h * 0.82], [x + w * 0.2, gy - h * 0.88]]);
  });
  groundDrift(ctx, x - 4 * s, gy + 0.5, 5 * s, sd);
};
const rmskaldstone = (ctx, x, y, s, o) => {
  const gy = y + 8, w = 5.2 * s, h = 30 * s, sd = o.seed, col = "#8a8278";
  shadow(ctx, x + 6 * s, gy + 1, 9 * s, 3 * s, 0.3);
  part(ctx, (c) => {
    slab(c, x, gy, w, h, col, sd, 1);
    c.save(); c.clip();
    // panels cut in bands: a sun-wheel in the head, a ship under sail, waves
    c.fillStyle = darken(col, 0.3); c.fillRect(x - w * 1.2, gy - h * 0.66, w * 2.4, 0.5); c.fillRect(x - w, gy - h * 0.34, w * 2, 0.5);
    c.strokeStyle = OCHRE; c.lineWidth = 0.6; ellipse(c, x, gy - h * 0.83, w * 0.55, w * 0.55); c.stroke();
    c.fillStyle = OCHRE_LT; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; px1(c, x + Math.cos(a) * w * 0.3, gy - h * 0.83 + Math.sin(a) * w * 0.3); }
    // the ship: teal hull, prow and stern curling, an ochre sail
    const sy = gy - h * 0.42;
    c.fillStyle = TEAL; poly(c, [[x - w * 0.8, sy - 1.6], [x + w * 0.8, sy - 1.6], [x + w * 0.5, sy], [x - w * 0.5, sy]]); c.fill();
    c.fillRect(ap(x - w * 0.85), ap(sy - 3.2), 0.6, 1.8); c.fillRect(ap(x + w * 0.75), ap(sy - 3.2), 0.6, 1.8);
    c.fillStyle = OCHRE; c.fillRect(ap(x - w * 0.42), ap(sy - 8.5 * s), w * 0.84, 5.5 * s);
    c.fillStyle = OCHRE_DK; for (let k = 0; k < 3; k++) c.fillRect(ap(x - w * 0.42 + k * w * 0.32), ap(sy - 8.5 * s), 0.5, 5.5 * s);
    c.fillStyle = WOOD_DK; c.fillRect(ap(x - 0.25), ap(sy - 9.5 * s), 0.5, 8 * s);
    c.fillStyle = TEAL_LT; for (let k = 0; k < 5; k++) px1(c, x - w * 0.8 + k * w * 0.4, gy - h * 0.2 + (k % 2) * 0.6, 1.2, 0.5);
    c.restore();
    snowCap(c, [[x - w * 1.12, gy - h * 0.92], [x - w * 0.4, gy - h * 1.03], [x + w * 0.6, gy - h * 1.02], [x + w * 1.1, gy - h * 0.88], [x, gy - h * 0.94]]);
    c.fillStyle = SNOW; c.fillRect(ap(x - w * 1.1), ap(gy - h * 0.72), w * 0.7, 0.8);
  });
  groundDrift(ctx, x - 4 * s, gy + 0.5, 5.5 * s, sd);
};

// ---- whale bones -------------------------------------------------------------------
const boneArc = (c, x0, y0, x1, y1, lift, wid) => {
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - lift;
  c.lineCap = "round"; c.lineWidth = wid + 1; c.strokeStyle = BONE_DK;
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
  c.lineWidth = wid; c.strokeStyle = BONE; c.beginPath(); c.moveTo(x0, y0 - 0.3); c.quadraticCurveTo(mx, my - 0.3, x1, y1 - 0.3); c.stroke();
  c.lineWidth = 0.5; c.strokeStyle = "#f4efe2"; c.beginPath(); c.moveTo(x0, y0 - wid * 0.4); c.quadraticCurveTo(mx, my - wid * 0.4, mx, my - wid * 0.25); c.stroke();
};
const rmwhale = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, v = o.v % 2;
  if (v === 0) {
    // the ribs: curved bones hooking up out of the snow from a buried spine,
    // all bowed the same way, tallest at the chest; the far row paler
    shadow(ctx, x + 5 * s, gy + 1, 26 * s, 4 * s, 0.26);
    const n = 6;
    for (const row of [1, 0]) for (let k = 0; k < n; k++) {
      const t = k / (n - 1), bx = x - 18 * s + t * 32 * s + row * 3 * s, by = gy - 2.5 * s + t * 2 * s - row * 3 * s;
      const hgt = (8 + Math.sin(Math.min(1, t * 1.2) * Math.PI) * 10) * s * (row ? 0.85 : 1);
      part(ctx, (c) => {
        c.lineCap = "round";
        const pth = () => { c.beginPath(); c.moveTo(bx, by); c.bezierCurveTo(bx - 2 * s, by - hgt * 0.55, bx, by - hgt, bx + 3 * s, by - hgt * 1.02); };
        c.lineWidth = 2 * s; c.strokeStyle = row ? BONE_DK : "#b4ac98"; pth(); c.stroke();
        c.lineWidth = 1.1 * s; c.strokeStyle = row ? "#cfc8b4" : BONE; pth(); c.stroke();
        c.fillStyle = SNOW; ellipse(c, bx + 0.5, by + 0.5, 2.4 * s, 1.1 * s); c.fill();
        c.fillStyle = SNOW_LT; px1(c, bx + 3.5 * s, by - hgt * 1.0, 1.5, 0.5);
      });
    }
    // the backbone's knuckles in the drift
    ctx.fillStyle = BONE_DK; for (let k = 0; k < 9; k++) px1(ctx, x - 20 * s + k * 4.4 * s, gy - 2 * s + k * 0.3 * s, 1.5, 1);
    groundDrift(ctx, x - 20 * s, gy, 8 * s, sd); groundDrift(ctx, x + 8 * s, gy + 1, 9 * s, sd + 1);
  } else {
    // the skull: a long flat rostrum ending in the brain-case, the jaw beside
    shadow(ctx, x + 4 * s, gy + 1, 24 * s, 4 * s, 0.3);
    part(ctx, (c) => {
      poly(c, [[x - 22 * s, gy - 3 * s], [x - 4 * s, gy - 6.5 * s], [x + 8 * s, gy - 10 * s], [x + 15 * s, gy - 8 * s], [x + 16 * s, gy - 1 * s], [x + 6 * s, gy], [x - 8 * s, gy - 0.5 * s], [x - 22 * s, gy - 1.5 * s]]);
      c.fillStyle = lin(c, 0, gy - 10 * s, 0, gy, [[0, "#f2ecdc"], [0.5, BONE], [1, BONE_DK]]); c.fill();
      c.fillStyle = "#5a5246"; ellipse(c, x + 9 * s, gy - 4.5 * s, 2.2 * s, 1.5 * s); c.fill();
      c.fillStyle = BONE_DK; c.fillRect(x - 20 * s, ap(gy - 2.6 * s), 22 * s, 0.5);
      c.fillStyle = SNOW; poly(c, [[x + 2 * s, gy - 8 * s], [x + 8 * s, gy - 10.3 * s], [x + 14 * s, gy - 8.6 * s], [x + 8 * s, gy - 8.4 * s]]); c.fill();
    });
    part(ctx, (c) => {
      c.lineCap = "round"; c.lineWidth = 2 * s; c.strokeStyle = BONE_DK; c.beginPath(); c.moveTo(x - 18 * s, gy + 4 * s); c.quadraticCurveTo(x - 2 * s, gy + 1 * s, x + 12 * s, gy + 4.5 * s); c.stroke();
      c.lineWidth = 1.3 * s; c.strokeStyle = BONE; c.beginPath(); c.moveTo(x - 18 * s, gy + 3.6 * s); c.quadraticCurveTo(x - 2 * s, gy + 0.6 * s, x + 12 * s, gy + 4 * s); c.stroke();
    });
    groundDrift(ctx, x - 16 * s, gy + 4.5 * s, 6 * s, sd);
  }
};

// ---- boats ------------------------------------------------------------------------
// clinker strakes: a hull's side as bands, each lit along its upper lap
const strakes = (c, x0, x1, top, bot, n, col, f) => {
  for (let b = 0; b < n; b++) {
    const t0 = b / n, t1 = (b + 1) / n;
    c.fillStyle = b % 2 ? col : lighten(col, 0.08);
    c.beginPath();
    for (let k = 0; k <= 24; k++) { const u = k / 24, xx = x0 + (x1 - x0) * u, [ya, yb] = f(u); c.lineTo(xx, ya + (yb - ya) * t0); }
    for (let k = 24; k >= 0; k--) { const u = k / 24, xx = x0 + (x1 - x0) * u, [ya, yb] = f(u); c.lineTo(xx, ya + (yb - ya) * t1); }
    c.closePath(); c.fill();
    c.fillStyle = lighten(col, 0.3);
    for (let k = 1; k < 24; k++) { const u = k / 24, [ya, yb] = f(u); px1(c, x0 + (x1 - x0) * u, ya + (yb - ya) * t0); }
  }
};
const rmboat = (ctx, x, y, s, o) => {
  const gy = y + 8 + 2 * s, L = 13 * s, H = 5 * s, dir = o.v % 2 ? -1 : 1, sd = o.seed;
  shadow(ctx, x + 4 * s, gy + 1, L * 1.25, 3 * s, 0.32);
  // the stones it rests on
  part(ctx, (c) => { for (const k of [-0.6, 0.55]) ball(c, x + k * L, gy - 0.6, 2.2 * s, 1.4 * s, ROCK[3]); });
  part(ctx, (c) => {
    const base = gy - 1.4 * s, prof = (u) => base - H * (1 - u * u);
    c.beginPath(); c.moveTo(x - L, base + 0.5);
    for (let k = 0; k <= 24; k++) { const u = -1 + k / 12; c.lineTo(x + u * L, prof(u) - (u * dir > 0.8 ? (u * dir - 0.8) * 6 * s : 0)); }
    c.lineTo(x + L, base + 0.5); c.closePath(); c.fillStyle = TAR; c.fill(); c.save(); c.clip();
    strakes(c, x - L, x + L, 0, 0, 3, "#3a3436", (u) => { const uu = u * 2 - 1; return [prof(uu), base]; });
    c.fillStyle = TEAL; c.fillRect(x - L, ap(base - 1.2 * s), L * 2, 1); c.fillStyle = TEAL_LT; c.fillRect(x - L, ap(base - 1.2 * s), L * 2, 0.5);
    c.fillStyle = rgba("#2a1c2c", 0.3); c.fillRect(x + L * 0.3, base - H - 4, L, H + 6);
    c.restore();
    // snow along the keel
    c.fillStyle = SNOW; c.beginPath();
    for (let k = 0; k <= 16; k++) { const u = -0.8 + k / 10; c.lineTo(x + u * L, prof(u) - 0.8); }
    for (let k = 16; k >= 0; k--) { const u = -0.8 + k / 10; c.lineTo(x + u * L, prof(u) + 0.6 + Math.sin(k * 1.7 + sd) * 0.4); }
    c.fill();
  });
  groundDrift(ctx, x - L * 0.9, gy, 4 * s, sd);
};
// A longship hauled up on rollers: its long south side in clinker, a row of
// shields along the rail (teal and ochre), the dragon prow curling up at the
// bow, the stern post curling at the other end, the mast down along the
// deck on crutches with its striped sail furled to the yard.
const rmlongship = (ctx, x, y, s, o) => {
  const dir = o.v % 2 ? -1 : 1, gy = y + 8 + 6 * s, L = 30 * s, H = 7.5 * s, sd = o.seed;
  const X = (u) => x + u * L * dir;                         // u -1 stern .. 1 bow
  const keel = (u) => gy - 1.5 * s - Math.pow(Math.abs(u), 3) * 4 * s;
  const rail = (u) => gy - 1.5 * s - H - Math.pow(Math.abs(u), 2.4) * 3.5 * s;
  shadow(ctx, x + 6 * s, gy + 1.5, L * 1.15, 4 * s, 0.32);
  // rollers under the keel
  part(ctx, (c) => { for (const u of [-0.55, 0, 0.55]) { c.fillStyle = WOOD; c.fillRect(ap(X(u) - 1.2 * s), ap(gy - 1.2 * s), 2.4 * s, 2.4 * s); c.fillStyle = WOOD_LT; c.fillRect(ap(X(u) - 1.2 * s), ap(gy - 1.2 * s), 2.4 * s, 0.5); } });
  part(ctx, (c) => {
    c.beginPath();
    for (let k = 0; k <= 40; k++) { const u = -1 + k / 20; c.lineTo(X(u), rail(u)); }
    for (let k = 40; k >= 0; k--) { const u = -1 + k / 20; c.lineTo(X(u), keel(u)); }
    c.closePath(); c.fillStyle = "#3a302a"; c.fill(); c.save(); c.clip();
    const x0 = Math.min(X(-1), X(1)), x1 = Math.max(X(-1), X(1));
    strakes(c, x0, x1, 0, 0, 4, "#4a3a2e", (t) => { const u = (t * 2 - 1) * dir; return [rail(u), keel(u)]; });
    c.fillStyle = rgba("#2a1c2c", 0.28); c.fillRect(x0, keel(0) - 2.5 * s, x1 - x0, 4 * s);
    c.restore();
  });
  // prow and stern posts, curling up
  part(ctx, (c) => {
    for (const end of [1, -1]) {
      const bx = X(end * 0.97), by = rail(end * 0.97), up = (end === 1 ? 13 : 10) * s, k = end * dir;
      c.lineCap = "round"; c.lineWidth = 2.2 * s; c.strokeStyle = "#3a302a";
      c.beginPath(); c.moveTo(bx - k * 2 * s, by + 3 * s); c.quadraticCurveTo(bx + k * 3 * s, by - up * 0.4, bx + k * 1.5 * s, by - up); c.stroke();
      c.lineWidth = 1; c.strokeStyle = "#5e4a38"; c.beginPath(); c.moveTo(bx - k * 1.6 * s, by + 2 * s); c.quadraticCurveTo(bx + k * 2.4 * s, by - up * 0.4, bx + k * 1.1 * s, by - up + 0.5); c.stroke();
      if (end === 1) {
        // the dragon's head: snout forward, ochre jaw, a teal eye, crest
        const hx = bx + k * 1.5 * s, hy = by - up;
        c.fillStyle = OCHRE_DK; poly(c, [[hx - k * 1.5 * s, hy - 1.5 * s], [hx + k * 4.5 * s, hy - 0.6 * s], [hx + k * 4.2 * s, hy + 1.2 * s], [hx - k * 0.5 * s, hy + 1.8 * s]]); c.fill();
        c.fillStyle = OCHRE_LT; c.fillRect(ap(Math.min(hx, hx + k * 4 * s)), ap(hy - 1.2 * s), 4 * s, 0.5);
        c.fillStyle = TEAL_LT; px1(c, hx + k * 1.2 * s, hy - 0.6 * s, 1, 0.5);
        c.fillStyle = "#3a302a"; for (let q = 0; q < 3; q++) px1(c, hx - k * (1 + q) * s, hy - (2 + q * 0.6) * s, 1, 1);
      } else { c.fillStyle = OCHRE; ellipse(c, bx + k * 1.2 * s, by - up - 0.6, 1.4 * s, 1.4 * s); c.fill(); }
    }
  });
  // the mast and yard along the deck on two crutches; the sail furled, striped
  part(ctx, (c) => {
    for (const u of [-0.45, 0.4]) { c.fillStyle = WOOD_DK; c.fillRect(ap(X(u) - 0.5), rail(u) - 6 * s, 1, 6 * s); }
    const yy = rail(0) - 6 * s;
    c.fillStyle = WOOD; c.fillRect(Math.min(X(-0.62), X(0.62)), ap(yy - 0.6), L * 1.24, 1.4);
    for (let k = 0; k < 8; k++) {
      const u = -0.5 + k * 0.125;
      c.fillStyle = k % 2 ? OCHRE : "#b84a3c"; c.fillRect(ap(Math.min(X(u), X(u + 0.125))), ap(yy + 0.6), L * 0.125, 2.2 * s);
    }
    c.fillStyle = SNOW; c.fillRect(Math.min(X(-0.5), X(0.5)), ap(yy - 1), L, 0.8);
  });
  // shields along the rail (drawn last, on the hull's side)
  part(ctx, (c) => {
    for (let k = 0; k < 9; k++) {
      const u = -0.68 + k * 0.17, cx = X(u), cy = rail(u) + 2.2 * s;
      c.fillStyle = k % 2 ? TEAL : OCHRE; ellipse(c, cx, cy, 2.1 * s, 2.1 * s); c.fill();
      c.fillStyle = k % 2 ? TEAL_LT : OCHRE_LT; ellipse(c, cx - 0.5, cy - 0.5, 1.1 * s, 1.1 * s); c.fill();
      c.fillStyle = "#c4c8d0"; px1(c, cx - 0.25, cy - 0.25, 1, 1);
    }
  });
  groundDrift(ctx, X(-0.9), gy + 0.5, 6 * s, sd);
};

// ---- a fish-drying rack ----------------------------------------------------------
const rmrack = (ctx, x, y, s, o) => {
  const gy = y + 8, span = 14 * s, hh = 15 * s, sd = o.seed;
  shadow(ctx, x + 6 * s, gy + 1, span * 1.1, 3 * s, 0.26);
  part(ctx, (c) => {
    for (const e of [-1, 1]) {
      c.strokeStyle = WOOD_DK; c.lineWidth = 1.4 * s; c.lineCap = "round";
      c.beginPath(); c.moveTo(x + e * span - 3 * s, gy); c.lineTo(x + e * span + 1 * s, gy - hh); c.stroke();
      c.beginPath(); c.moveTo(x + e * span + 3 * s, gy + 0.5); c.lineTo(x + e * span - 1 * s, gy - hh); c.stroke();
    }
    c.fillStyle = WOOD; c.fillRect(x - span - 2, ap(gy - hh - 0.5), span * 2 + 4, 1.3);
    c.fillStyle = WOOD_LT; c.fillRect(x - span - 2, ap(gy - hh - 0.5), span * 2 + 4, 0.5);
  });
  part(ctx, (c) => {
    // stockfish hung head-down from the pole, a hand apart: tails tied
    // over it, bodies tapering to dark heads, a gap between each
    for (let k = 0; k < 7; k++) {
      const fx = x - span + 3 * s + k * (span * 2 - 6 * s) / 6 + (hash(sd, k + 5) - 0.5) * s, len = (6 + hash(sd, k) * 4) * s, top = gy - hh + 0.6;
      c.fillStyle = "#4a3e32"; c.fillRect(ap(fx - 1), ap(top - 0.5), 2.5, 1);
      poly(c, [[fx - 0.4, top], [fx + 0.9, top], [fx + 1.4 * s, top + len * 0.7], [fx + 0.9 * s, top + len], [fx - 0.6 * s, top + len], [fx - 0.9 * s, top + len * 0.6]]);
      c.fillStyle = k % 3 === 1 ? "#7e6e5a" : "#94826a"; c.fill();
      c.fillStyle = "#c0ae8a"; c.fillRect(ap(fx - 0.6 * s), top + 1, 0.5, len * 0.7);
      c.fillStyle = "#4e443a"; c.fillRect(ap(fx - 0.6 * s), ap(top + len - 1.5 * s), 1.8 * s, 1.5 * s);
    }
    c.fillStyle = SNOW; c.fillRect(x - span - 2, ap(gy - hh - 1.2), span * 2 + 4, 0.8);
  });
  groundDrift(ctx, x - span, gy + 0.5, 4 * s, sd);
};

// ---- frozen waterfall / ice crag ------------------------------------------------------
const rmicefall = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, v = o.v % 2;
  shadow(ctx, x + 7 * s, gy + 1.5, 20 * s, 4 * s, 0.32);
  if (v === 0) {
    // a black crag, a curtain of ice frozen down its south face into a pool
    const w = 17 * s, h = 26 * s;
    part(ctx, (c) => {
      poly(c, [[x - w, gy], [x - w * 0.95, gy - h * 0.55], [x - w * 0.6, gy - h * 0.9], [x - w * 0.1, gy - h], [x + w * 0.45, gy - h * 0.86], [x + w * 0.9, gy - h * 0.5], [x + w, gy]]);
      c.fillStyle = lin(c, x - w, 0, x + w, 0, [[0, ROCK[4]], [0.45, ROCK[2]], [1, ROCK[1]]]); c.fill();
      c.save(); c.clip();
      c.fillStyle = ROCK[0]; for (let k = 0; k < 5; k++) { const cx = x - w * 0.8 + k * w * 0.4; for (let t = 0; t < h * 0.7; t += 0.5) px1(c, cx + Math.sin(t * 0.4 + k) * 1.2, gy - t); }
      snowCap(c, [[x - w * 0.98, gy - h * 0.56], [x - w * 0.6, gy - h * 0.92], [x - w * 0.1, gy - h * 1.02], [x + w * 0.45, gy - h * 0.88], [x + w * 0.9, gy - h * 0.52], [x + w * 0.4, gy - h * 0.74], [x - w * 0.2, gy - h * 0.8], [x - w * 0.7, gy - h * 0.6]]);
      c.restore();
    });
    part(ctx, (c) => {
      // the ice curtain: columns of blue ice, lit edges, icicle tips
      const top = gy - h * 0.78;
      for (let k = 0; k < 9; k++) {
        const cx = x - 6 * s + k * 1.5 * s, len = h * 0.78 - hash(sd, k) * 3 * s, wd = (1.3 + hash(sd, k + 9)) * s, t0 = top + hash(sd, k + 3) * 2;
        // each column: pale ice, a blue depth down its middle, a lit left
        // edge and a dark right one, tapering to an icicle's tip
        c.fillStyle = k % 3 === 0 ? ICE[3] : ICE[2]; c.fillRect(ap(cx), t0, wd, len - 1.5 * s);
        c.fillStyle = k % 3 === 1 ? ICE[0] : ICE[1]; c.fillRect(ap(cx + wd * 0.4), t0 + len * 0.3, 0.5, len * 0.55);
        c.fillStyle = ICE[4]; c.fillRect(ap(cx), t0 + 1, 0.5, len * 0.7);
        c.fillStyle = ICE[1]; c.fillRect(ap(cx + wd - 0.5), t0 + 2, 0.5, len * 0.6);
        c.fillStyle = ICE[2]; c.fillRect(ap(cx + wd * 0.25), t0 + len - 1.5 * s, Math.max(0.5, wd * 0.5), 1.5 * s);   // the tip
        if (hash(sd, k + 20) < 0.5) { c.fillStyle = ICE[1]; c.fillRect(ap(cx + wd * 0.25), ap(t0 + len), 0.5, 0.5); }
      }
      // the frozen pool at its foot: a sheet with a dark window, cracks, snow at its rim
      c.fillStyle = ICE[1]; ellipse(c, x + 0.5, gy + 0.8, 9.5 * s, 2.6 * s); c.fill();
      c.fillStyle = ICE[3]; ellipse(c, x, gy, 9 * s, 2.4 * s); c.fill();
      c.fillStyle = mix(ICE[0], "#1f3a4a", 0.55); ellipse(c, x + 2 * s, gy + 0.4, 3.2 * s, 1 * s); c.fill();
      c.fillStyle = ICE[1]; c.fillRect(ap(x + 1 * s), ap(gy + 0.3), 2 * s, 0.5);
      c.fillStyle = ICE[0]; for (let k = 0; k < 5; k++) px1(c, x - 7 * s + k * 1.6 * s, gy - 0.5 + Math.sin(k * 1.7) * 0.7, 1.5, 0.5);
      c.fillStyle = ICE[4]; for (let k = 0; k < 5; k += 2) px1(c, x - 7.5 * s + k * 1.6 * s, gy - 1 + Math.sin(k * 1.7) * 0.7, 1, 0.5);
      c.fillStyle = SNOW; c.fillRect(ap(x - 8 * s), ap(gy - 1.8), 3 * s, 0.5); c.fillRect(ap(x + 4 * s), ap(gy - 1.5), 3.5 * s, 0.5);
      c.fillStyle = ICE[1]; c.fillRect(ap(x + 2 * s), ap(gy + 1.5), 5 * s, 0.5);
    });
  } else {
    // an ice crag: seracs of blue ice, snow on their tops, dark cracks
    const spires = [[-9, 14, 4.5], [-2, 22, 5.5], [6, 17, 5], [12, 10, 4]];
    spires.forEach(([dx, hh, wd], i) => part(ctx, (c) => {
      const cx = x + dx * s, h = hh * s * (0.9 + hash(sd, i) * 0.2), w = wd * s;
      poly(c, [[cx - w, gy], [cx - w * 0.8, gy - h * 0.7], [cx - w * 0.2, gy - h], [cx + w * 0.5, gy - h * 0.88], [cx + w, gy - h * 0.3], [cx + w, gy]]);
      c.fillStyle = lin(c, cx - w, 0, cx + w, 0, [[0, ICE[4]], [0.35, ICE[3]], [0.7, ICE[2]], [1, ICE[1]]]); c.fill();
      c.save(); c.clip();
      c.fillStyle = ICE[0]; for (let t = 0; t < h * 0.6; t += 0.5) px1(c, cx + Math.sin(t * 0.5 + i) * w * 0.3, gy - t * 1.2);
      snowCap(c, [[cx - w * 0.85, gy - h * 0.7], [cx - w * 0.2, gy - h * 1.02], [cx + w * 0.55, gy - h * 0.9], [cx + w * 0.2, gy - h * 0.78], [cx - w * 0.4, gy - h * 0.7]]);
      c.restore();
    }));
  }
  groundDrift(ctx, x - 14 * s, gy + 1, 6 * s, sd);
};

// ---- a seal colony on a shore rock ------------------------------------------------
const seal = (c, x, y, s, dir, sd, up) => {
  const L = 5.4 * s;
  c.fillStyle = SEAL_DK; ellipse(c, x + 0.4, y + 0.4, L, 1.8 * s); c.fill();
  c.fillStyle = lin(c, 0, y - 2 * s, 0, y + 1.5 * s, [[0, SEAL_LT], [0.6, SEAL], [1, SEAL_DK]]); ellipse(c, x, y, L, 1.7 * s); c.fill();
  // head (raised or down), flippers, mottling
  const hx = x + dir * L * 0.9, hy = y - (up ? 2.2 : 0.8) * s;
  c.fillStyle = SEAL; ellipse(c, hx, hy, 1.5 * s, 1.3 * s); c.fill();
  c.fillStyle = "#1a1618"; px1(c, hx + dir * 0.6 * s, hy - 0.3 * s); px1(c, hx + dir * 1.3 * s, hy + 0.3 * s);
  c.fillStyle = SEAL_DK; px1(c, x - dir * L, y - 0.6 * s, 1.5, 1); px1(c, x - dir * (L + 0.8 * s), y + 0.2 * s, 1.5, 1);
  c.fillStyle = SEAL_LT; for (let k = 0; k < 3; k++) px1(c, x + (hash(sd, k) - 0.5) * L, y - 1 * s + hash(sd, k + 3) * 1.2, 0.5, 0.5);
};
const rmsealrock = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed, w = 15 * s, h = 5.5 * s;
  shadow(ctx, x + 4 * s, gy + 1, w * 1.1, 3.4 * s, 0.32);
  blackRock(ctx, x, gy, w, h, sd, 2, 0);
  part(ctx, (c) => {
    c.fillStyle = SNOW; ellipse(c, x - w * 0.6, gy - h * 0.5, w * 0.3, 1.5 * s); c.fill();
    c.fillStyle = "#e8e4d8"; for (let k = 0; k < 7; k++) px1(c, x + (hash(sd, k + 20) - 0.5) * w * 1.4, gy - h * 0.4 - hash(sd, k + 30) * h * 0.4, 0.5, 0.5);
  });
  part(ctx, (c) => seal(c, x - 6 * s, gy - h * 0.7, s, 1, sd, true));
  part(ctx, (c) => seal(c, x + 6 * s, gy - h * 0.55, s * 0.95, -1, sd + 1, false));
  part(ctx, (c) => seal(c, x + 1 * s, gy - 1.2 * s, s * 0.9, 1, sd + 2, true));
  if (o.v % 2) part(ctx, (c) => seal(c, x - 13 * s, gy - 0.8 * s, s * 0.75, -1, sd + 3, true));
};

// ---- a tussock of dead grass in its drift (flat: it carries its own underline)
const rmtussock = (ctx, x, y, s, o) => {
  const gy = y + 8, sd = o.seed;
  ctx.fillStyle = SNOW_SH; ellipse(ctx, x + 2 * s, gy + 0.6, 7 * s, 1.8 * s); ctx.fill();
  ctx.fillStyle = SNOW; ellipse(ctx, x, gy, 6 * s, 2 * s); ctx.fill();
  const n = 9 + (o.v % 3) * 2;
  for (let k = 0; k < n; k++) {
    const bx = x + (hash(sd, k) - 0.5) * 9 * s, hh = (4 + hash(sd, k + 20) * 6) * s, lean = (0.4 + hash(sd, k + 40) * 1.4) * s;
    ctx.strokeStyle = STRAW[k % 4]; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(ap(bx), gy - 0.5); ctx.quadraticCurveTo(bx, gy - hh * 0.6, bx + lean * 2, gy - hh); ctx.stroke();
  }
  ctx.fillStyle = STRAW[0]; ctx.fillRect(ap(x - 3 * s), ap(gy - 0.5), 6 * s, 0.5);
  ctx.fillStyle = SNOW_LT; ctx.fillRect(ap(x - 4 * s), ap(gy - 1), 3 * s, 0.5);
};

// ---- the longhouse (live: its smoke) ------------------------------------------------
// Long and low: drystone-and-turf walls, a turf roof heavy with snow (the turf
// shows only at the eaves, straw hanging from it), the gable boards crossed
// over each end of the ridge and carved into dragon heads (ochre, teal eyes),
// a timber door with a teal lintel, a woodpile, smoke from the roof-hole.
const BODIES = new Map();
const longhouseBody = (s, v) => {
  const key = `lh|${s}|${v}`;
  let sp = BODIES.get(key);
  if (sp) return sp;
  const hw = Math.ceil(30 * s + 8), top = Math.ceil(38 * s + 8), bot = Math.ceil(12 + 6 * s);
  const cv = bakeSprite(hw * 2, top + bot, (c) => {
    const x = hw, gy = top + 8, L = 23 * s, dir = v % 2 ? -1 : 1;
    shadow(c, x + 6 * s, gy + 1.5, L * 1.2, 4.5 * s, 0.32);
    // the walls: a low south face of stone courses under turf
    part(c, (cc) => {
      poly(cc, [[x - L, gy], [x - L - 0.5, gy - 6 * s], [x + L + 0.5, gy - 6 * s], [x + L, gy]]);
      cc.fillStyle = "#6a6660"; cc.fill(); cc.save(); cc.clip();
      for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) {
        const sx = x - L + (k + (r % 2) * 0.5) * (L * 2 / 13), sy = gy - 1.8 * s - r * 1.9 * s;
        cc.fillStyle = hash(k, r + 3) < 0.5 ? "#7e7a72" : "#5e5a56"; cc.fillRect(ap(sx), ap(sy), L * 2 / 13 - 0.5, 1.4 * s);
        cc.fillStyle = "#948e84"; cc.fillRect(ap(sx), ap(sy), L * 2 / 13 - 1, 0.5);
      }
      cc.fillStyle = rgba("#2a1c2c", 0.25); cc.fillRect(x - L, gy - 6 * s, L * 2, 1.2);
      cc.restore();
    });
    // the door, near one end
    const dx = x - dir * L * 0.55;
    part(c, (cc) => {
      cc.fillStyle = WOOD_DK; cc.fillRect(ap(dx - 3 * s), ap(gy - 6.5 * s), 6 * s, 6.5 * s);
      cc.fillStyle = "#1a1416"; cc.fillRect(ap(dx - 2 * s), ap(gy - 5.2 * s), 4 * s, 5.2 * s);
      cc.fillStyle = WOOD; cc.fillRect(ap(dx - 1.6 * s), ap(gy - 4.8 * s), 3.2 * s, 4.8 * s);
      cc.fillStyle = WOOD_LT; cc.fillRect(ap(dx - 1.6 * s), ap(gy - 4.8 * s), 0.5, 4.8 * s);
      cc.fillStyle = TEAL; cc.fillRect(ap(dx - 3.2 * s), ap(gy - 7 * s), 6.4 * s, 1.2 * s); cc.fillStyle = TEAL_LT; cc.fillRect(ap(dx - 3.2 * s), ap(gy - 7 * s), 6.4 * s, 0.5);
      cc.fillStyle = OCHRE; px1(cc, dx - 0.5, gy - 6.9 * s, 1, 1);
    });
    // the roof: turf, the snow on it, the eave's fringe, the north slope's sliver
    const eave = (u) => gy - 6 * s + Math.pow(Math.abs(u), 4) * 0.8 * s;
    const ridge = (u) => gy - 22 * s + u * u * 4.5 * s;
    const R0 = -0.86, R1 = 0.86;
    part(c, (cc) => {
      cc.beginPath();
      cc.moveTo(x - L - 1.5 * s, eave(-1) + 0.5);
      for (let k = 0; k <= 20; k++) { const u = R0 + (R1 - R0) * k / 20; cc.lineTo(x + u * L, ridge(u) - 2.6 * s); }
      cc.lineTo(x + L + 1.5 * s, eave(1) + 0.5);
      cc.closePath();
      cc.fillStyle = TURF; cc.fill(); cc.save(); cc.clip();
      // snow over most of it: lit on the west, blue to the east, ridged along the slope
      cc.beginPath();
      cc.moveTo(x - L - 1, eave(-1) - 2.2 * s);
      for (let k = 0; k <= 20; k++) { const u = R0 + (R1 - R0) * k / 20; cc.lineTo(x + u * L, ridge(u) - 3 * s); }
      cc.lineTo(x + L + 1, eave(1) - 2.2 * s);
      for (let k = 20; k >= 0; k--) { const u = -1 + 2 * k / 20; cc.lineTo(x + u * L * 1.02, eave(u) - 2 * s - Math.sin(k * 1.9) * 0.6 * s); }
      cc.closePath();
      cc.fillStyle = lin(cc, x - L, 0, x + L, 0, [[0, SNOW_LT], [0.35, SNOW], [0.8, "#d4e0ea"], [1, SNOW_SH]]); cc.fill();
      // the turf showing through where the wind has scoured it: by the ridge
      // ends and in a few patches along the slope; drift lines on the snow
      for (let k = 0; k < 7; k++) {
        const u = k < 2 ? (k ? 0.72 : -0.74) : -0.6 + hash(k, 41) * 1.2, f = k < 2 ? 0.25 : 0.35 + hash(k, 43) * 0.45;
        const px = x + u * L, py = ridge(u) + (eave(u) - ridge(u)) * f, rw = (k < 2 ? 4.5 : 2 + hash(k, 47) * 2.5) * s;
        cc.fillStyle = TURF_DK; ellipse(cc, px, py, rw, rw * 0.4); cc.fill();
        cc.fillStyle = TURF; ellipse(cc, px - 0.5, py - 0.4, rw * 0.75, rw * 0.28); cc.fill();
        cc.fillStyle = SNOW_SH; cc.fillRect(ap(px - rw * 0.6), ap(py + rw * 0.4), rw * 1.2, 0.5);
      }
      cc.fillStyle = "#c8d6e2";
      for (let k = 0; k < 14; k++) { const u = -0.8 + hash(k, 51) * 1.6, f = 0.2 + hash(k, 53) * 0.6; px1(cc, x + u * L, ridge(u) + (eave(u) - ridge(u)) * f, (3 + hash(k, 55) * 5) * s, 0.5); }
      cc.fillStyle = "#fffaf0"; for (let k = 0; k <= 30; k++) { const u = -0.85 + k * 0.056; px1(cc, x + u * L, ridge(u) - 2.6 * s, 1, 0.5); }
      // the turf eave: green-brown, straw hanging
      cc.fillStyle = TURF_DK; cc.fillRect(x - L - 2, eave(0) - 1.6 * s, L * 2 + 4, 2 * s);
      cc.fillStyle = TURF_LT; for (let k = 0; k < 40; k++) px1(cc, x - L + k * L / 20, eave(0) - 2 * s + hash(k, 5), 1, 0.5);
      cc.restore();
      cc.fillStyle = STRAW[1]; for (let k = 0; k < 30; k++) { const ex = x - L + k * L / 15 + hash(k, 2); px1(cc, ex, eave(0) + 0.3, 0.5, 0.8 + hash(k, 9) * 1.4); }
    });
    // the smoke-hole: a little louvred hood on the ridge
    part(c, (cc) => {
      const hx = x + dir * L * 0.15, hy = ridge(0.15) - 3.5 * s;
      cc.fillStyle = WOOD_DK; cc.fillRect(ap(hx - 2.5 * s), ap(hy - 2 * s), 5 * s, 2.5 * s);
      cc.fillStyle = WOOD; cc.fillRect(ap(hx - 2.5 * s), ap(hy - 2 * s), 5 * s, 0.8);
      cc.fillStyle = SNOW; cc.fillRect(ap(hx - 3 * s), ap(hy - 2.6 * s), 6 * s, 0.8);
    });
    // the gables: barge boards crossed above each ridge end, carved into dragon heads
    for (const e of [-1, 1]) part(c, (cc) => {
      const gx = x + e * L * 0.88, gyR = ridge(e * 0.86) - 2.6 * s;
      cc.lineCap = "round"; cc.lineWidth = 1.4 * s;
      for (const side of [-1, 1]) {
        cc.strokeStyle = WOOD_DK; cc.beginPath(); cc.moveTo(gx + side * 3.5 * s, gyR + 7 * s); cc.lineTo(gx - side * 2.5 * s, gyR - 5 * s); cc.stroke();
        // the head at the board's top end, snout out, ochre
        const hx = gx - side * 2.5 * s, hy = gyR - 5 * s;
        cc.fillStyle = OCHRE; poly(cc, [[hx, hy - 1 * s], [hx - side * 3 * s, hy - 0.3 * s], [hx - side * 2.6 * s, hy + 1 * s], [hx + side * 0.4 * s, hy + 1 * s]]); cc.fill();
        cc.fillStyle = OCHRE_LT; px1(cc, Math.min(hx, hx - side * 2.6 * s), hy - 0.8 * s, 2.4 * s, 0.5);
        cc.fillStyle = TEAL_LT; px1(cc, hx - side * 1.2 * s, hy - 0.5 * s);
      }
    });
    // the woodpile at the far end, snow on it
    part(c, (cc) => {
      const wx = x + dir * (L + 3 * s);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 3 - (r === 2 ? 1 : 0); k++) {
        const lx = wx + (k - 1) * 2.2 * s + (r % 2) * 1.1 * s, ly = gy - 1.2 * s - r * 2 * s;
        cc.fillStyle = WOOD; ellipse(cc, lx, ly, 1.1 * s, 1.1 * s); cc.fill(); cc.fillStyle = "#c4a070"; px1(cc, lx - 0.5, ly - 0.5, 1, 1);
      }
      cc.fillStyle = SNOW; cc.fillRect(ap(wx - 3 * s), ap(gy - 6.4 * s), 6 * s, 1);
    });
    groundDrift(c, x - L - 1, gy + 0.5, 5 * s, 3);
  });
  sp = { cv, hw, top, bot, smoke: [hw + (v % 2 ? -1 : 1) * 23 * s * 0.15, top + 8 - 22 * s - 6 * s] };
  BODIES.set(key, sp);
  return sp;
};
// smoke: puffs rising from a point, leaning downwind, fading; on the 2-unit grid
const smokePuffs = (ctx, x, y, time, n = 6, col = "196,200,208", a0 = 0.5) => {
  for (let k = 0; k < n; k++) {
    const ph = (time * 0.22 + k / n) % 1, r = 1.2 + ph * 3.6;
    const px = x + ph * 10 + Math.sin(time * 0.9 + k * 1.7) * 1.2, py = y - ph * 20;
    ctx.fillStyle = `rgba(${col},${(a0 * (1 - ph)).toFixed(3)})`;
    ellipse(ctx, ap(px), ap(py), ap(r) || 0.5, ap(r * 0.8) || 0.5); ctx.fill();
  }
};
const rmlonghouse = (ctx, x, y, s, o) => {
  if (typeof document === "undefined") return;
  const ss = Math.round(s * 10) / 10, sp = longhouseBody(ss, o.v || 0);
  ctx.drawImage(sp.cv, x - sp.hw, y - sp.top, sp.hw * 2, sp.top + sp.bot);
  smokePuffs(ctx, x - sp.hw + sp.smoke[0], y - sp.top + sp.smoke[1], (o.time || 0) + (o.seed % 7));
};

// ============ THE GATE THE RAIDERS COME OUT OF ============
// A glacier wall along the spawn edge, ~90 units either side of the road and
// fading into the spruce wood beyond; the road comes out of a CLEFT cut
// through it (flaring at its mouth, its floor in the north wall's cold
// shadow), and a carved clan gate stands in the mouth: two posts, painted in
// bands and topped with dragon heads looking out, a lintel hung with shields.
// The ice is a height field in edge-local coordinates (e: depth in from the
// board's edge, s: along it) rendered in the board's camera pixel by pixel —
// ground far to near, each sample lifted by its height, steep drops filled as
// faces — and baked once a board into two layers:
//   far:  everything north of the road (left entry) or all of the ice (top
//         entry), the cleft's shadow, the north gate post; drawn in the spawn
//         layer, under the foes and the wood.
//   near: the cleft's south wall (left entry) and the gate's lintel and
//         posts; drawn by the "rmgate" v 9 piece, sorted south of the road,
//         so the column walks under the lintel and behind the south wall.
// Everything is worked out from the road (PTS) — the pieces' own x, y only
// sort them and block halls, like the Iron camp's gatehouse.
const G_HMAX = 30;
const GEOM = { key: "" };
const rimeGeom = () => {
  const key = `${REALM.id}|${PTS[0]}|${PTS[1]}|${PTS.length}`;
  if (GEOM.key === key) return GEOM;
  const [x0, y0] = posAt(0), [x1, y1] = posAt(Math.min(60, TOTAL_LEN));
  const left = x0 <= y0;
  const e0 = left ? x0 : y0, s0 = left ? y0 : x0;
  const de = left ? x1 - x0 : y1 - y0, ds = left ? y1 - y0 : x1 - x0;
  const slope = de > 0.1 ? ds / de : 0;
  const sd = (REALM.seed | 0) % 9973;
  const sRoad = (e) => s0 + (e - e0) * slope;
  const FD = left ? 54 : 48, SW = left ? 10 : 6;
  const sR = sRoad(FD);
  // the foot wanders out in lobes (each lobe's flanks show a south face),
  // calm by the cleft so the mouth sits square to the road
  const foot = (s) => FD + ((vn(s / 26, 1.5, sd) - 0.5) * 24 + (vn(s / 9, 4.5, sd) - 0.5) * 5) * sstep(28, 62, Math.abs(s - sR));
  const amp = (s) => 1 - sstep(85, 170, Math.abs(s - sR));
  const F0 = foot(sR);
  const cw = (e) => PATH_HALF + 4 + 9 * sstep(F0 - SW - 8, F0 + 2, e);
  const hgt = (e, s) => {
    const a = amp(s);
    if (a <= 0) return 0;
    const F = foot(s) - (1 - a) * 34;
    let h = G_HMAX * Math.sqrt(a) * sstep(F, F - SW, e);
    if (h <= 0) return 0;
    h += 2.2 * (vn(e / 7, s / 7, sd + 5) - 0.5) * sstep(F - SW, F - SW - 6, e);
    const b = Math.abs(s - sRoad(e)) * Math.cos(Math.atan(slope)), c = cw(e);
    return Math.max(0, h * sstep(c, c + 6, b));
  };
  Object.assign(GEOM, { key, left, e0, s0, slope, sRoad, FD, SW, sR, F0, cw, hgt, foot, amp, sd, far: null, near: null });
  // the gate: posts either side of the road at the mouth; on a left entry
  // turned to face south-east (the north post set back), so its lintel reads
  const eg = F0 - 4, sg = sRoad(eg), off = PATH_HALF + 3, turn = left ? 9 : 0;
  GEOM.gate = { eg, posts: [sg - off, sg + off], es: [eg - turn, eg + turn] };
  return GEOM;
};
const toBoard = (G, e, s) => (G.left ? [e, s] : [s, e]);
export const rimeIceAt = (x, y) => { if (!PTS.length) return 0; const G = rimeGeom(); return G.left ? G.hgt(x, y) : G.hgt(y, x); };

// a carved post: banded teal/ochre, a dragon head on top looking outward
const gatePost = (c, x, gy, h, out, sd) => {
  part(c, (cc) => {
    cc.fillStyle = WOOD_DK; cc.fillRect(ap(x - 2.4), gy - h, 4.8, h);
    cc.fillStyle = WOOD; cc.fillRect(ap(x - 2.4), gy - h, 1.6, h);
    cc.fillStyle = "#2a1e16"; cc.fillRect(ap(x + 1.9), gy - h, 0.5, h);
    for (let k = 0; k < 4; k++) {
      const by = gy - h * (0.22 + k * 0.17);
      cc.fillStyle = k % 2 ? TEAL : OCHRE; cc.fillRect(ap(x - 2.4), ap(by), 4.8, 2);
      cc.fillStyle = k % 2 ? TEAL_LT : OCHRE_LT; cc.fillRect(ap(x - 2.4), ap(by), 1.6, 2);
      cc.fillStyle = WOOD_DK; px1(cc, x - 0.5, by + 0.5, 1, 1);
    }
    // frost on the windward edge, a drift at the foot
    cc.fillStyle = FROST; cc.fillRect(ap(x - 2.4), gy - h * 0.9, 0.5, h * 0.6);
    cc.fillStyle = SNOW; ellipse(cc, x - 0.5, gy, 3.5, 1.3); cc.fill();
  });
  part(c, (cc) => {
    // the neck curling up and out, the head with an open jaw
    const nx = x, ny = gy - h;
    cc.lineCap = "round"; cc.lineWidth = 3.2; cc.strokeStyle = WOOD_DK;
    cc.beginPath(); cc.moveTo(nx, ny + 1); cc.quadraticCurveTo(nx - out * 0.5, ny - 6, nx + out * 2.5, ny - 7.5); cc.stroke();
    cc.lineWidth = 1; cc.strokeStyle = WOOD_LT; cc.beginPath(); cc.moveTo(nx - 0.6, ny); cc.quadraticCurveTo(nx - out * 0.9, ny - 5.6, nx + out * 2.2, ny - 8); cc.stroke();
    const hx = nx + out * 2.5, hy = ny - 7.5;
    cc.fillStyle = OCHRE_DK; poly(cc, [[hx - out * 1, hy - 1.8], [hx + out * 4.2, hy - 1], [hx + out * 4.4, hy + 0.2], [hx + out * 1.5, hy + 0.3], [hx + out * 3.8, hy + 1.6], [hx - out * 0.3, hy + 1.8]]); cc.fill();
    cc.fillStyle = OCHRE_LT; cc.fillRect(ap(Math.min(hx, hx + out * 3.8)), ap(hy - 1.4), 3.6, 0.5);
    cc.fillStyle = TEAL_LT; px1(cc, hx + out * 1.2, hy - 1, 1, 0.5);
    cc.fillStyle = WOOD_DK; for (let q = 0; q < 3; q++) px1(cc, nx - out * (0.2 + q * 0.6), ny - 2.5 - q * 1.6, 1, 1);
    cc.fillStyle = SNOW; cc.fillRect(ap(Math.min(hx - out, hx + out * 3)), ap(hy - 2.4), 3.4, 0.7);
  });
};
const shield = (c, x, y, rx, ry, k) => {
  c.fillStyle = k % 2 ? TEAL : OCHRE; ellipse(c, x, y, rx, ry); c.fill();
  c.fillStyle = k % 2 ? TEAL_DK : OCHRE_DK; ellipse(c, x + rx * 0.25, y + ry * 0.25, rx * 0.7, ry * 0.7); c.fill();
  c.fillStyle = k % 2 ? TEAL_LT : OCHRE_LT; ellipse(c, x - rx * 0.3, y - ry * 0.3, rx * 0.45, ry * 0.45); c.fill();
  c.fillStyle = "#c4c8d0"; px1(c, x - 0.25, y - 0.25, 1, 1);
  c.fillStyle = "#3a3438"; px1(c, x - rx, y, 0.5, 0.5); px1(c, x + rx - 0.5, y, 0.5, 0.5);
};

// bake the ice and the gate (once a board)
const bakeRimeGate = () => {
  const G = rimeGeom();
  if (G.far) return G;
  const left = G.left, smin = G.sR - 175, smax = G.sR + 175, emax = G.FD + 12;
  const bx0 = left ? -2 : Math.max(-2, smin), by0 = left ? Math.max(-2, smin - G_HMAX - 6) : -2;
  const bx1 = left ? emax + 4 : Math.min(W, smax), by1 = left ? Math.min(H + 2, smax + 4) : emax + 4;
  const w = bx1 - bx0, h = by1 - by0, PW = Math.ceil(w * PX), PH = Math.ceil(h * PX);
  const mk = () => { const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH; return cv; };
  const far = mk(), near = mk();
  const fi = far.getContext("2d").createImageData(PW, PH), ni = near.getContext("2d").createImageData(PW, PH);
  const IC = ICE.map(hexRGB), RK = ROCK.map(hexRGB);
  const SN = [hexRGB("#9cb4c8"), hexRGB("#b8cee0"), hexRGB("#d0e2ee"), hexRGB("#e6f2f8"), hexRGB("#f8fcfe")];
  const sd = G.sd;
  const put = (img, px, py, c, a = 255) => {
    if (px < 0 || py < 0 || px >= PW || py >= PH) return;
    const o = (py * PW + px) << 2, D = img.data;
    if (a < 255 && D[o + 3]) return;
    D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = a;
  };
  const step = 0.5;
  // for each screen column: ground samples far (north) to near (south)
  for (let px = 0; px < PW; px++) {
    const bx = bx0 + (px + 0.5) / PX;
    let prevSy = -1e9, prevH = 0, lipPy = -1e9, onTop = false;
    const icl = 2 + Math.floor(Math.pow(hash(px, 3 + sd), 2) * 9), icOn = hash(px >> 1, 91 + sd) < 0.55;
    for (let gy = by0 - 2; gy <= by1 + G_HMAX; gy += step) {
      const e = left ? bx : gy, s = left ? gy : bx;
      const hh = G.hgt(e, s);
      const sy = gy - hh, spy = Math.floor((sy - by0) * PX);
      const nearSide = left && s > G.sRoad(e);
      const img = nearSide ? ni : fi;
      if (hh < 0.4) {
        // the cleft's floor (the road) in the north wall's shadow, and the
        // foot of the ice in its own
        const inCleft = e < G.F0 + 2 && Math.abs(s - G.sRoad(e)) < G.cw(e) + 7 && G.amp(s) > 0.5;
        const hn = left ? G.hgt(e - 3, s - 7) : G.hgt(e - 7, s - 3);
        if ((inCleft && e < G.F0 - 1 + (hash(px, spy) - 0.5) * 3) || hn > 6) {
          for (let q = Math.max(spy, Math.floor((prevSy - by0) * PX) + 1); q <= spy + 1; q++) put(fi, px, q, [40, 58, 92], 82);
        }
        prevSy = sy; prevH = hh;
        continue;
      }
      // the surface's slope and light
      const hx = (G.hgt(e + (left ? 1 : 0), s + (left ? 0 : 1)) - G.hgt(e - (left ? 1 : 0), s - (left ? 0 : 1))) / 2;
      const hy = (G.hgt(e + (left ? 0 : 1), s + (left ? 1 : 0)) - G.hgt(e - (left ? 0 : 1), s - (left ? 1 : 0))) / 2;
      // (hx, hy) in board axes
      const gxB = left ? hx : hy, gyB = left ? hy : hx;
      const sl = Math.hypot(gxB, gyB);
      const lit = (gxB * 0.42 + gyB * 0.58) / Math.max(0.25, sl) * Math.min(1, sl * 1.5) - (gyB < 0 ? Math.min(0.5, -gyB * 0.2) : 0);
      const dz = hash(px, Math.floor(gy * 2) + sd) - 0.5;
      let col = null;
      if (sl < 0.55) {
        // the top: snow, ridged by the wind, lit toward the sun
        let t = 3 + lit * 1.4 + dz * 0.6 + (vn(e / 6, s / 12, sd + 9) - 0.5) * 0.9;
        // crevasses across the ice, running out to the foot: a blue crack, lit lip
        const F = G.foot(s), cr = (s + 5 * Math.sin(e / 7 + sd)) / 23, fc = cr - Math.floor(cr), ci = Math.floor(cr);
        if (e < F - G.SW - 2 && hash(ci, sd) < 0.55 && e > F - G.SW - 4 - hash(ci, sd + 1) * 26) { if (fc < 0.04) col = IC[0]; else if (fc < 0.08) col = IC[2]; else if (fc < 0.12) t = 4; }
        if (!col) col = SN[Math.max(1, Math.min(4, Math.round(t)))];
      } else {
        // a face: blue ice in vertical streaks, black rock showing through
        // in bands, a white lip and icicles where it breaks from the top
        const rocky = vn(s / 13, (gy - hh) / 7, sd + 3) > 0.72 && sl > 1.2 && hh > G_HMAX * 0.4;
        col = rocky ? RK[Math.max(1, Math.min(5, Math.round(2.4 + lit * 2 + dz * 0.6)))] : null;
      }
      if (sl < 0.55) onTop = true;
      else if (onTop) { onTop = false; lipPy = Math.floor((prevSy - by0) * PX); }
      const faceT = (q) => {
        // lit by its facing, paler under the lip, darkening to its foot,
        // in vertical streaks a few pixels wide
        const fd = Math.max(0, Math.min(1, (q - lipPy) / (G_HMAX * PX * 0.9)));
        const st = (hash(px >> 2, 77 + sd) - 0.5) * 0.9 + (hash(px >> 1, 78 + sd) - 0.5) * 0.4;
        let k = Math.round(2.3 + lit * 1.4 + st - fd * 1.6);
        if (q - lipPy <= 1) return SN[3];
        if (icOn && q - lipPy < icl) k = q - lipPy < icl - 1 ? 4 : 3;
        return IC[Math.max(0, Math.min(4, k))];
      };
      // fill the run this sample covers: a drop is a face, painted down to here
      const p0 = Math.floor((prevSy - by0) * PX);
      if (spy > p0 + 1 && prevSy > -1e8) {
        for (let q = p0 + 1; q <= spy; q++) put(img, px, q, col && sl >= 0.55 ? col : sl >= 0.55 ? faceT(q) : col);
      } else put(img, px, spy, sl >= 0.55 && !col ? faceT(spy) : col);
      prevSy = sy; prevH = hh;
    }
  }
  far.getContext("2d").putImageData(fi, 0, 0);
  near.getContext("2d").putImageData(ni, 0, 0);
  inkOutline(far, INK, 1, "under"); inkOutline(near, INK, 1, "under");
  // the gate
  const { posts, es } = G.gate, PH_ = 32;
  const draw = (cv, fn) => { const c = cv.getContext("2d"); c.save(); c.imageSmoothingEnabled = false; c.scale(PX, PX); c.translate(-bx0, -by0); fn(c); c.restore(); };
  const [pnx, pny] = toBoard(G, es[0], posts[0]), [psx, psy] = toBoard(G, es[1], posts[1]);
  const gate = (c) => {
    if (left) {
      // a rope slung from head to head across the road, sagging, hung with
      // shields and, at its lowest, a horned skull: reads at any angle
      const ax = pnx, ay = pny - PH_ + 3, bx = psx, by = psy - PH_ + 3, sag = 9;
      const at = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t + sag * 4 * t * (1 - t)];
      for (let t = 0; t <= 1; t += 0.01) { const [rx, ry] = at(t); c.fillStyle = "#3a2e26"; c.fillRect(ap(rx - 0.25), ap(ry), 1, 1); c.fillStyle = "#8e7656"; c.fillRect(ap(rx - 0.25), ap(ry), 0.5, 0.5); }
      for (let k = 0; k < 4; k++) { const [rx, ry] = at(0.16 + k * 0.23 + (k > 1 ? 0.0 : 0)); if (k === 2) continue; c.fillStyle = "#3a2e26"; c.fillRect(ap(rx), ap(ry), 0.5, 2); shield(c, rx + 0.25, ry + 4.2, 2.1, 2.3, k); }
      // the skull: a pale dome, dark eyes, horns curling up
      const [kx, ky] = at(0.55);
      c.fillStyle = "#3a2e26"; c.fillRect(ap(kx), ap(ky), 0.5, 1.5);
      c.fillStyle = BONE_DK; ellipse(c, kx + 0.5, ky + 3.6, 2.2, 2); c.fill();
      c.fillStyle = BONE; ellipse(c, kx + 0.1, ky + 3.2, 1.8, 1.6); c.fill();
      c.fillStyle = "#2a2226"; px1(c, kx - 1, ky + 3.4, 1, 0.5); px1(c, kx + 0.5, ky + 3.4, 1, 0.5);
      c.strokeStyle = BONE; c.lineWidth = 0.7; c.lineCap = "round";
      c.beginPath(); c.moveTo(kx - 1.6, ky + 2.6); c.quadraticCurveTo(kx - 4.2, ky + 2.2, kx - 3.4, ky - 0.6); c.stroke();
      c.beginPath(); c.moveTo(kx + 1.8, ky + 2.6); c.quadraticCurveTo(kx + 4.4, ky + 2.2, kx + 3.6, ky - 0.6); c.stroke();
    } else {
      const top = pny - PH_ + 1, lx = Math.min(pnx, psx), rx = Math.max(pnx, psx);
      c.fillStyle = WOOD_DK; c.fillRect(lx - 2, ap(top - 2.5), rx - lx + 4, 4);
      c.fillStyle = WOOD; c.fillRect(lx - 2, ap(top - 2.5), rx - lx + 4, 1.2);
      c.fillStyle = SNOW; c.fillRect(lx - 2, ap(top - 3.2), rx - lx + 4, 1);
      for (let k = 0; k < 5; k++) shield(c, lx + 6 + k * (rx - lx - 12) / 4, top + 3.5, 2.6, 2.4, k);
      c.fillStyle = OCHRE; ellipse(c, (lx + rx) / 2, top - 0.5, 2.2, 1.6); c.fill();
    }
  };
  if (left) {
    draw(far, (c) => gatePost(c, pnx, pny, PH_, 1, sd));
    draw(near, (c) => { gatePost(c, psx, psy, PH_, 1, sd + 1); part(c, gate); });
  } else {
    draw(near, (c) => { gatePost(c, pnx, pny, PH_, -1, sd); gatePost(c, psx, psy, PH_, 1, sd + 1); part(c, gate); });
  }
  G.far = far; G.near = near; G.box = [bx0, by0, w, h];
  return G;
};
const drawGateFar = (ctx, time) => {
  const G = bakeRimeGate(), [x, y, w, h] = G.box;
  ctx.drawImage(G.far, x, y, w, h);
  // spindrift blowing off the lip of the ice, downwind
  for (let k = 0; k < 10; k++) {
    const ph = (time * 0.35 + k * 0.137) % 1, u = hash(k, 3) * 300 - 150;
    const [lx, ly] = toBoard(G, G.foot(G.sR + u) - G.SW - 2, G.sR + u);
    if (G.amp(G.sR + u) < 0.4 || Math.abs(u) < G.cw(G.F0) + 4) continue;
    ctx.fillStyle = `rgba(240,248,252,${(0.75 * (1 - ph)).toFixed(2)})`;
    ctx.fillRect(ap(lx + ph * 22), ap(ly - G_HMAX + ph * 6 + Math.sin(time * 3 + k) * 1.5), 1, 0.5);
  }
};
const drawGateNear = (ctx) => { const G = bakeRimeGate(), [x, y, w, h] = G.box; ctx.drawImage(G.near, x, y, w, h); };
const GATE_NEAR_V = 9;
const PIECES = { key: "", near: false };
const hasNear = () => {
  const key = `${REALM.id}|${PTS[0]}|${DECOR.length}`;
  if (PIECES.key !== key) { PIECES.key = key; PIECES.near = DECOR.some((d) => d.t === "rmgate" && d.v === GATE_NEAR_V); }
  return PIECES.near;
};
const rmgate = (ctx, x, y, s, o) => { if (PTS.length < 2 || typeof document === "undefined") return; if (o.v === GATE_NEAR_V) drawGateNear(ctx); };
const rmice = () => {};
// the edge wood round the gate: no tree on the ice, none hiding the mouth
const rimeGateTree = (d) => {
  if (!d.forest || PTS.length < 2) return 0;
  const G = rimeGeom(), e = G.left ? d.x : d.y, s = G.left ? d.y : d.x;
  if (G.hgt(e, s) > 0.5 || G.hgt(e + 6, s) > 0.5 || G.hgt(e, s - 6) > 0.5) return -1;
  const sg = G.sRoad(G.gate.eg);
  if (G.left) { if (d.x > G.gate.eg - 24 && d.x < G.gate.eg + 50 && d.y > sg - PATH_HALF - 10 && d.y < sg + PATH_HALF + 56) return -1; }
  else if (Math.abs(d.x - sg) < PATH_HALF + 18 && d.y < G.F0 + 52) return -1;
  return 0;
};

// ============ THE ICE ON THE WATER ============
// Still water freezes from its shores (REALM.rimeIce, see the header): a
// sheet of fast ice baked once a board OVER the painted water, keyed to
// world coordinates, drawn with the gate's layer (after water.js's live
// marks, so nothing glints through it). Nature's terms:
//  - the shore edge is thick: a frost rim beside a shaded bank, a thin wet
//    THAW line beside a sunlit one (the light comes from the upper left);
//  - snow lies over part of the sheet in streaks along THE wind, piled
//    against the shore the wind blows onto; where it blew off, clear dark
//    WINDOWS show the deep water, with the sun's sheen across them;
//  - a crack network: dark hairlines with a lit upper-left lip, branching,
//    a few long ones out from the shore;
//  - PRESSURE RIDGES where two sheets met (a lit crest over a shadow,
//    rubble on it) and on sea ice LEADS of open water along the ridge line;
//  - the seaward edge is ragged, its face shaded over a dark wet line of
//    water, and beyond it BRASH: loose cakes drifting slowly (baked, stamped
//    live), then the floes and bergs.
//  - a fishing hole, chipped through a big mere's sheet.
// The sheet is art over water: skiffs row under it, ships sail through it,
// so it stays thin (a sea band of ~5-26 px), and a LANDING beach keeps a lane
// of open water (the longships' lane) through it.
// `rimeFastIceAt(x, y)` (0..1) tells coast.js where the sea is covered.
const ICE_SHEET = { key: "", B: null };
const SEA_THICK = { top: 14, bottom: 8, left: 10, right: 10 };    // base thickness by coast edge (units)
const MERE_ICE = 8;
// the sheet's own tones (RGB)
const RGB_ICE = ICE.map(hexRGB);
const RGB_SNOW = [SNOW_DK, SNOW_SH, SNOW, SNOW_LT].map(hexRGB);
const RGB_CRACK = hexRGB("#3b5a70"), RGB_RIDGE_SH = hexRGB("#5d82a0");
const lerp3 = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];

// where the longships land: a lane of open water is kept through the ice
const landingSpots = () => {
  const out = [];
  for (const L of REALM.landings || []) {
    if (!L || L.at == null) continue;
    if (Array.isArray(L.at)) out.push([L.at[0] * 48 + 24 + MX, L.at[1] * 48 + 24 + MY]);
    else if (PTS.length > 1) out.push(posAt(Math.max(0.05, Math.min(0.95, L.at)) * TOTAL_LEN));
  }
  return out;
};

const iceBake = () => {
  const key = `${REALM.id}|${PTS.length}|${PONDS.length}|${COAST ? COAST.edge + COAST.depth : ""}|${RES}`;
  if (ICE_SHEET.key === key) return ICE_SHEET.B;
  ICE_SHEET.key = key; ICE_SHEET.B = null; SEA_ICE.at = null;
  if (typeof document === "undefined" || REALM.rimeIce === false || RES !== PX) return null;
  const opt = REALM.rimeIce || {};
  const seaT = COAST && opt.sea !== false ? (opt.sea ?? SEA_THICK[COAST.edge] ?? 9) : 0;
  const mereT = opt.mere === false ? 0 : (opt.mere ?? MERE_ICE);
  // (an "ice" pond is painted frozen whole by water.js; lava never)
  const ponds = mereT ? PONDS.filter((p) => !p.t || p.t === "swamp") : [];
  if (!seaT && !ponds.length) return null;
  const K = PX, PW = W * K, PH = H * K, N = PW * PH, sd = (REALM.seed | 0) % 9973;
  const st = new Uint8Array(N);      // 0 land, 1 still water (ice forms), 2 water kept open (a river, the castle's water, a landing lane)
  const who = new Uint8Array(N);     // 1 the sea, 2+i pond i
  const base = [seaT];               // thickness per `who` - 1
  // ---- the sea, by its geometry
  if (seaT) {
    const e = COAST.edge, along = e === "top" || e === "bottom", span = along ? PW : PH;
    const line = new Float32Array(span + 1);
    for (let i = 0; i <= span; i++) line[i] = Math.max(0, coastLine(i / K));
    for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
      const u = along ? i : j, v = along ? (e === "top" ? j : PH - 1 - j) : (e === "left" ? i : PW - 1 - i);
      if (line[u] * K - v <= 0) continue;
      const k = j * PW + i;
      st[k] = i > (W - 96) * K ? 2 : 1; who[k] = 1;
    }
  }
  // ---- the meres, by the colour of the painted water (the shore is wobbled by water.js)
  if (ponds.length) {
    const g = groundLayer().getContext("2d").getImageData(0, 0, PW, PH).data;
    ponds.forEach((p, n) => {
      const m = Math.min(p.w, p.h) / 2;
      base.push(Math.min(mereT, Math.max(3, m * 0.42)));
      const x0 = Math.max(0, Math.floor((p.x - p.w / 2 - 14) * K)), x1 = Math.min(PW - 1, Math.ceil((p.x + p.w / 2 + 14) * K));
      const y0 = Math.max(0, Math.floor((p.y - p.h / 2 - 14) * K)), y1 = Math.min(PH - 1, Math.ceil((p.y + p.h / 2 + 14) * K));
      for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
        const k = j * PW + i;
        if (st[k]) continue;
        const o = k << 2, r = g[o], gg = g[o + 1], b = g[o + 2];
        // the cold water's tones: teal-blue (green well over red, blue over green), or the channel's near-black blue
        if ((gg - r >= 20 && b - gg >= 8 && r + gg + b < 490) || (b - r >= 20 && r + gg + b < 210)) { st[k] = 1; who[k] = 2 + n; }
      }
    });
  }
  // rivers run on; the longships' lanes stay open (a lane lies at the
  // stretch of shore nearest the landing's road spot)
  const lanes = landingSpots().map(([lx, ly]) => {
    let bx = lx, by = ly, bd = Infinity;
    for (let j = 0; j < PH; j += 2) for (let i = 0; i < PW; i += 2) {
      if (st[j * PW + i] !== 1) continue;
      const q = (i / K - lx) ** 2 + (j / K - ly) ** 2;
      if (q < bd) { bd = q; bx = i / K; by = j / K; }
    }
    return [bx, by];
  });
  if (RIVERS.length || lanes.length) for (let j = 0; j < PH; j += 1) for (let i = 0; i < PW; i += 1) {
    const k = j * PW + i;
    if (st[k] !== 1) continue;
    const x = i / K, y = j / K;
    if (RIVERS.length && inRiver(x, y, 1)) { st[k] = 2; continue; }
    for (const [lx, ly] of lanes) {
      const rr = 46 * (0.8 + 0.4 * vn(x / 9, y / 9, sd + 3));
      if (Math.hypot(x - lx, y - ly) < rr) { st[k] = 2; break; }
    }
  }
  // ---- distance to the nearest land pixel (two sweeps, carrying the seed)
  const sx = new Int16Array(N), sy = new Int16Array(N), d2 = new Int32Array(N);
  const FAR = 0x3fffffff;
  for (let k = 0, j = 0; j < PH; j++) for (let i = 0; i < PW; i++, k++) {
    if (st[k]) { d2[k] = FAR; sx[k] = -1; } else { d2[k] = 0; sx[k] = i; sy[k] = j; }
  }
  const take = (k, i, j, n) => {
    if (sx[n] < 0) return;
    const dx = i - sx[n], dy = j - sy[n], q = dx * dx + dy * dy;
    if (q < d2[k]) { d2[k] = q; sx[k] = sx[n]; sy[k] = sy[n]; }
  };
  for (let j = 1; j < PH; j++) {
    const row = j * PW, up = row - PW;
    for (let i = 0; i < PW; i++) { const k = row + i; if (!d2[k]) continue; take(k, i, j, up + i); if (i) { take(k, i, j, up + i - 1); take(k, i, j, k - 1); } if (i < PW - 1) take(k, i, j, up + i + 1); }
    for (let i = PW - 2; i >= 0; i--) { const k = row + i; if (d2[k]) take(k, i, j, k + 1); }
  }
  for (let j = PH - 2; j >= 0; j--) {
    const row = j * PW, dn = row + PW;
    for (let i = PW - 1; i >= 0; i--) { const k = row + i; if (!d2[k]) continue; take(k, i, j, dn + i); if (i < PW - 1) { take(k, i, j, dn + i + 1); take(k, i, j, k + 1); } if (i) take(k, i, j, dn + i - 1); }
    for (let i = 1; i < PW; i++) { const k = row + i; if (d2[k]) take(k, i, j, k - 1); }
  }
  // ---- the sheet
  const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH;
  const c = cv.getContext("2d"), img = c.createImageData(PW, PH), D = img.data;
  // the painted box of each water (the sea, each mere), so a frame stamps only those
  const boxes = base.map(() => [PW, PH, 0, 0]);
  const put = (k, col) => {
    const o = k << 2; D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
    const i = k % PW, j = (k - i) / PW, b = boxes[who[k] - 1];
    if (!b) return;
    if (i < b[0]) b[0] = i; if (i > b[2]) b[2] = i; if (j < b[1]) b[1] = j; if (j > b[3]) b[3] = j;
  };
  const isIce = (k) => k >= 0 && k < N && D[(k << 2) + 3] === 255 && st[k] === 1;
  const wa = REALM.water || {}, deep = hexRGB(wa.deep || "#1f3a4a");
  const WET = lerp3(deep, [6, 18, 28], 0.4), WIN = lerp3(deep, RGB_ICE[0], 0.3), WIN_LT = lerp3(deep, RGB_ICE[1], 0.62);
  const LX = 0.586, LY = 0.81;                         // the light, down and to the right
  const cover = new Uint8Array(W * H);
  const streak = (px, py) => { const L = 3 + (hash(py, sd + 5) * 5 | 0), id = Math.floor((px + hash(py, sd + 6) * 9) / L); return hash(id, py * 31 + sd); };
  const dz0 = (px, py) => hash(Math.floor(px / 3), py + sd);
  const thick = new Float32Array(N);                   // the local sheet thickness, for the dressing passes
  const starts = [], cakes = [], holes = [];
  const rng = mulberry((REALM.seed ^ 0x1ce5) >>> 0);
  for (let k = 0, j = 0; j < PH; j++) for (let i = 0; i < PW; i++, k++) {
    if (st[k] !== 1 || !d2[k]) continue;
    const d = Math.sqrt(d2[k]) / K, x = i / K, y = j / K, ax = sx[k] / K, ay = sy[k] / K;
    const nx = (x - ax) / d, ny = (y - ay) / d;         // the shore's outward normal, land to water
    // the sheet's reach from this stretch of shore: smooth along the shore, ragged at the pixel
    let T = base[who[k] - 1] * (0.6 + 0.8 * vn(ax / 16, ay / 16, sd + 1)) + (vn(x / 3.5, y / 3.5, sd + 2) - 0.5) * 2.6;
    if (T < 1.6) T = 1.6;
    thick[k] = T;
    if (d > T + 1.1) {
      // brash: loose cakes beyond the edge
      if (d < T + 3.2 && (i % K) === 0 && (j % K) === 0 && hash(i, j + sd) < 0.007 && cakes.length < 36) cakes.push({ x, y, z: (hash(j, i + sd) * 3) | 0, v: (hash(i + 7, j) * 3) | 0, tx: -ny, ty: nx, ph: hash(i, j) * 6.28 });
      continue;
    }
    if (d > T) { put(k, WET); continue; }              // the dark water under the sheet's edge
    if ((i % K) === 1 && (j % K) === 1 && who[k] === 1) cover[(j >> 1) * W + (i >> 1)] = 255;
    const q = d / T, lit = nx * LX + ny * LY;           // lit < 0: a sunlit shore; > 0: the bank's shade falls on the water
    const shade = lit > 0.3 && d < 1.6 + lit * 1.4;
    if (d > T - Math.min(0.9, T * 0.2)) { put(k, shade ? RGB_ICE[1] : RGB_ICE[2]); continue; }   // the edge's face
    if (d > T - 1.4 && T > 4 && !shade && dz0(i, j) > 0.45) { put(k, RGB_ICE[4]); continue; }   // its lip catching the light
    // snow: drifts along the wind, piled where the wind blows onto the shore, thinning out to the edge
    const u = windU(x, y), v = windV(x, y);
    let S = fbm(u / 38, v / 11, sd + 11) + (1 - q) * 0.1 - (nx * WC + ny * WS) * 0.1 - 0.13;
    const dz = streak(i, j);
    // the shore: a wet thaw line on a sunlit bank, a frost rim on a shaded one
    if (d < 0.6 && lit < -0.3) { put(k, WET); continue; }
    if (d < Math.min(T * 0.3, lit < -0.3 ? 1.1 : 1.3 + vn(x / 3, y / 3, sd + 4) * 1.2)) { put(k, shade ? RGB_SNOW[1] : dz > 0.55 ? RGB_SNOW[3] : RGB_SNOW[2]); continue; }
    // a pressure ridge where two sheets met, and (at sea) a lead beside it
    const ridgeOn = vn(ax / 30, ay / 30, sd + 5) > 0.48 && T > 4.5;
    const rd = T * (0.5 + (vn(ax / 22, ay / 22, sd + 6) - 0.5) * 0.3);
    if (ridgeOn && Math.abs(d - rd) < 0.55) { put(k, d < rd ? (dz > 0.4 ? RGB_SNOW[3] : RGB_SNOW[2]) : hash(i, j + 3) < 0.3 ? RGB_SNOW[1] : RGB_RIDGE_SH); continue; }
    if (ridgeOn && who[k] === 1 && d > rd + 0.8 && d < rd + 1.6 && vn(ax / 40, ay / 40, sd + 7) > 0.55) { put(k, WET); continue; }
    if (S > 0.6) { put(k, shade ? RGB_SNOW[1] : dz > 0.6 ? RGB_SNOW[3] : RGB_SNOW[2]); continue; }
    if (S > 0.54) { put(k, RGB_SNOW[shade ? 0 : 1]); continue; }       // a drift's blue lee edge
    if (S < 0.42 && q > 0.2 && vn(x / 13, y / 8, sd + 9) < (who[k] === 1 ? 0.42 : 0.37) + (vn(x / 3, y / 3, sd + 10) - 0.5) * 0.12) {
      // a clear window: deep water seen through the ice, the sun's sheen laid across it
      const band = (x * 0.8 - y * 1.3 + 400) % 17;
      put(k, !shade && band < 1.2 && vn(x / 10, y / 10, sd + 8) > 0.45 ? WIN_LT : WIN);
      if ((i % K) === 0 && (j % K) === 0 && hash(i, j + 9) < 0.006 && d > 1.5) starts.push([i, j, 1]);
      continue;
    }
    // bare ice: pale where it is thick by the shore, bluer out toward the edge
    let t = q < 0.4 ? (dz > 0.7 ? 3 : 2) : q < 0.8 ? 2 : dz > 0.5 ? 2 : 1;
    if (shade) t = Math.max(0, t - 1);
    if (hash(i, j * 3 + 11) > 0.988) t = 4;
    put(k, RGB_ICE[t]);
    if ((i % K) === 0 && (j % K) === 0 && d > 1.2 && d < 2.6 && hash(i, j + 13) < 0.02) starts.push([i, j, 0]);
    if ((i % K) === 0 && (j % K) === 0 && q > 0.3 && q < 0.7 && T > 6 && hash(i, j + 19) < 0.0025) starts.push([i, j, 2]);
    if (who[k] > 1 && (i % K) === 0 && (j % K) === 0 && q > 0.35 && q < 0.6 && hash(i, j + 17) < 0.004) holes.push([i, j, who[k]]);
  }
  // ---- cracks: from the shore inward and across the sheet, a lit lip up-left
  const crack = (i, j, a0, len, swing, depth) => {
    let x = i, y = j, a = a0;
    for (let s = 0; s < len; s++) {
      a += (rng() - 0.5) * 0.3; a = Math.max(a0 - swing, Math.min(a0 + swing, a));
      x += Math.cos(a); y += Math.sin(a);
      const ci = Math.round(x), cj = Math.round(y), k = cj * PW + ci;
      if (!isIce(k) || (st[k] === 1 && Math.sqrt(d2[k]) / K > thick[k] - 1)) return;
      put(k, RGB_CRACK);
      const kl = k - PW - 1;
      if (isIce(kl) && D[(kl << 2)] !== RGB_CRACK[0]) put(kl, RGB_ICE[4]);
      if (depth < 2 && s === Math.round(len * (0.45 + rng() * 0.3)) && rng() < 0.6) crack(ci, cj, a + (rng() < 0.5 ? 0.6 : -0.6), len * 0.45, 0.35, depth + 1);
    }
  };
  for (const [i, j, win] of starts) {
    const k = j * PW + i, nx = i - sx[k], ny = j - sy[k], a0 = Math.atan2(ny, nx) + (rng() - 0.5) * 1.2;
    crack(i, j, win === 2 ? a0 + Math.PI / 2 * (rng() < 0.5 ? 1 : -1) : a0, (win === 1 ? 4 : win === 2 ? 14 + rng() * 16 : 6 + rng() * 9) * K + (rng() < 0.2 ? 14 * K : 0), win === 2 ? 0.35 : 0.5, 0);
  }
  // a fishing hole on a big mere, with the chips round it
  for (const n of new Set(holes.map((h) => h[2]))) {
    const p = ponds[n - 2]; if (!p || p.w < 80) continue;
    const [i, j] = holes.find((h) => h[2] === n);
    for (let dy = -3 * K; dy <= 3 * K; dy++) for (let dx = -4 * K; dx <= 4 * K; dx++) {
      const k = (j + dy) * PW + i + dx, r = Math.hypot(dx / 2.2, dy / 1.5) / K;
      if (!isIce(k)) continue;
      if (r < 1) put(k, WET); else if (r < 1.6) put(k, dy < 0 ? RGB_ICE[1] : RGB_ICE[4]); else if (r < 2.8 && hash(dx, dy + sd) < 0.25) put(k, RGB_SNOW[3]);
    }
  }
  c.putImageData(img, 0, 0);
  const box = boxes.filter((b) => b[2] >= b[0]).map((b) => [b[0], b[1], b[2] - b[0] + 1, b[3] - b[1] + 1]);
  ICE_SHEET.B = { cv, cover, cakes, box };
  // coast.js keeps its swell, surf and swash off the fast ice
  if (seaT) SEA_ICE.at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && cover[(y | 0) * W + (x | 0)] > 0;
  return ICE_SHEET.B;
};
// How much fast ice lies on the sea at board point (x, y): 1 under the sheet,
// 0 on open water (coast.js keeps its swell off the ice). Art only.
export const rimeFastIceAt = (x, y) => {
  const B = iceBake();
  if (!B || x < 0 || y < 0 || x >= W || y >= H) return 0;
  return B.cover[(y | 0) * W + (x | 0)] / 255;
};

// ---- brash: the loose cakes beyond the sheet's edge, drifting slowly ----
// (three looks at three sizes, each stamped at its own size: no scaling)
const CAKES = [];
const cakeSprite = (v, z) => {
  const key = v * 3 + z;
  if (CAKES[key]) return CAKES[key];
  return (CAKES[key] = bakeSprite(8, 6, (c) => {
    const x = 4, y = 3, r = 1.1 + z * 0.55 + v * 0.2, sd = v * 7 + z;
    const pts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, j = 1 + (hash(sd, i) - 0.5) * 0.4; pts.push([x + Math.cos(a) * r * j, y + Math.sin(a) * r * 0.5 * j]); }
    poly(c, pts.map(([px, py]) => [px, py + 1])); c.fillStyle = rgba(ICE[0], 0.9); c.fill();           // its dark side and the water under it
    poly(c, pts.map(([px, py]) => [px, py + 0.5])); c.fillStyle = ICE[1]; c.fill();
    poly(c, pts); c.fillStyle = v === 1 ? ICE[3] : ICE[2]; c.fill();
    c.fillStyle = v === 1 ? ICE[4] : ICE[3]; c.fillRect(ap(x - r * 0.6), ap(y - r * 0.3), r * 0.7, 0.5);
  }, false));
};
const drawBrash = (ctx, B, time) => {
  for (const ck of B.cakes) {
    const sp = cakeSprite(ck.v, ck.z), sl = Math.sin(time * 0.21 + ck.ph) * 5;     // a slow drift along the shore, there and back
    const x = ap(ck.x + ck.tx * sl), y = ap(ck.y + ck.ty * sl + Math.round(Math.sin(time * 0.7 + ck.ph * 3) * 0.5 * PX) / PX);
    ctx.drawImage(sp, x - 4, y - 3, 8, 6);
  }
};

// ---- floes, bergs, skerries, seals ----
// Each baked once with its waterline: the lit lap, an underwater skirt in
// pale teal, a dark reflection in the water, lit faces to the upper left.
// REALM.rimeFloes lists them (grid px, on the waterline); a board with sea
// or meres and no list gets a few sown, clear of the road and the beach.
const FLOES = { key: "", list: [] };
const floeList = () => {
  const key = `${REALM.id}|${PONDS.length}|${COAST ? COAST.edge : ""}`;
  if (FLOES.key === key) return FLOES.list;
  FLOES.key = key;
  let list = [];
  if (Array.isArray(REALM.rimeFloes)) list = REALM.rimeFloes.map((f) => ({ ...f, x: f.x + MX, y: f.y + MY }));
  else if (REALM.rimeFloes !== false) {
    const rng = mulberry((REALM.seed ^ 0xf10e) >>> 0);
    const ok = (x, y, r) => nearestOnPath(x, y).d > PATH_HALF + 16 + r && x > 10 && x < W - 110 && y > 10 && y < H - 6 && !list.some((f) => Math.hypot(f.x - x, f.y - y) < 34);
    if (COAST) {
      const kinds = ["floe", "floe", "berg", "floe", "skerry", "floe", "seals", "floe"];
      for (let k = 0, n = 0; k < 400 && n < 7; k++) {
        const x = rng() * W, y = rng() * H, dd = seaDepthAt(x, y);
        if (dd < 24 || dd > 120 || !ok(x, y, 10)) continue;
        list.push({ x, y, t: kinds[n % kinds.length], s: 0.8 + rng() * 0.45, v: (rng() * 4) | 0 }); n++;
      }
    }
    for (const p of PONDS) {
      if (p.t || p.w < 60) continue;
      for (let k = 0, n = 0; k < 60 && n < (p.w > 110 ? 2 : 1); k++) {
        const a = rng() * 6.28, r = rng() * 0.42, x = p.x + Math.cos(a) * p.w * r, y = p.y + Math.sin(a) * p.h * r;
        if (!ok(x, y, 0)) continue;
        list.push({ x, y, t: "floe", s: 0.6 + rng() * 0.3, v: (rng() * 4) | 0 }); n++;
      }
    }
  }
  FLOES.list = list.sort((a, b) => a.y - b.y);
  return list;
};
const FLOE_SP = new Map();
const floeSprite = (f) => {
  const s = Math.round((f.s || 1) * 10) / 10, v = (f.v || 0) % 4, key = `${f.t}|${s}|${v}|${REALM.id}`;
  let sp = FLOE_SP.get(key);
  if (sp) return sp;
  const wa = REALM.water || {}, deep = wa.deep || "#1f3a4a", edge = wa.edge || "#2c5266";
  const hw = Math.ceil(26 * s), top = Math.ceil(26 * s), bot = Math.ceil(10 * s);
  const cv = bakeSprite(hw * 2, top + bot, (c) => {
    const x = hw, y = top, sd = v * 31 + s * 10;
    const blob = (rx, ry, k, n = 12) => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, j = 1 + (hash(sd + k, i) - 0.5) * 0.4; pts.push([x + Math.cos(a) * rx * j, y + Math.sin(a) * ry * j]); } return pts; };
    const skirt = (rx, ry) => { c.fillStyle = rgba(mix(edge, ICE[2], 0.45), 0.85); ellipse(c, x, y + 1.2, rx, ry); c.fill(); };
    const reflect = (rx, ry, dx = 1.5) => { c.fillStyle = rgba(deep, 0.75); ellipse(c, x + dx, y + ry * 0.9 + 1, rx * 0.85, ry * 0.55); c.fill(); };
    if (f.t === "floe" || f.t === "seals") {
      const big = f.t === "seals", rx = (big ? 13 : 8 + v * 1.5) * s, ry = rx * 0.42, th = (big ? 2.2 : 1.6) * s;
      skirt(rx * 1.22, ry * 1.5);
      reflect(rx, ry + th);
      const pts = blob(rx, ry, 2);
      part(c, (cc) => {
        // the side face down to the waterline, the dark line of water along it
        poly(cc, pts.map(([px, py]) => [px, py + th])); cc.fillStyle = ICE[1]; cc.fill();
        cc.fillStyle = rgba(deep, 0.9); cc.fillRect(ap(x - rx * 0.9), ap(y + ry + th - 0.5), rx * 1.6, 0.5);
        cc.fillStyle = ICE[2]; cc.fillRect(ap(x - rx * 0.95), ap(y + ry * 0.2 + th * 0.5), rx * 0.5, 0.5);
      });
      part(c, (cc) => {
        // the top: pale ice, snow drifted over its windward (left) half, a lit rim, a clear window
        poly(cc, pts); cc.fillStyle = ICE[3]; cc.fill();
        cc.save(); cc.clip();
        cc.fillStyle = SNOW; ellipse(cc, x - rx * 0.3, y - ry * 0.1, rx * 0.75, ry * 0.8); cc.fill();
        cc.fillStyle = SNOW_LT; cc.fillRect(ap(x - rx * 0.8), ap(y - ry * 0.55), rx * 0.9, 0.5);
        cc.fillStyle = SNOW_SH; cc.fillRect(ap(x - rx * 0.1), ap(y + ry * 0.35), rx * 0.5, 0.5);
        cc.fillStyle = mix(deep, ICE[1], 0.3); cc.fillRect(ap(x + rx * 0.35), ap(y - ry * 0.1), 2.5 * s, 1 * s);
        cc.fillStyle = ICE[4]; px1(cc, x + rx * 0.4, y - ry * 0.1, 1, 0.5);
        cc.fillStyle = ICE[1]; for (let i = 0; i < 3; i++) px1(cc, x + (hash(sd, i) - 0.2) * rx, y + (hash(sd, i + 9) - 0.5) * ry, 1.5, 0.5);
        cc.restore();
      });
      if (big) {
        part(c, (cc) => seal(cc, x - 5 * s, y - ry * 0.3, s * 0.9, 1, sd, true));
        part(c, (cc) => seal(cc, x + 4 * s, y - ry * 0.05, s * 0.85, -1, sd + 1, false));
        if (v % 2) part(c, (cc) => seal(cc, x - 1 * s, y + ry * 0.45, s * 0.7, 1, sd + 2, true));
      }
    } else if (f.t === "berg") {
      const rx = (9 + v) * s, hh = (13 + v * 2) * s;
      skirt(rx * 1.35, 4.2 * s);
      // its shadow in the water, long and to the right
      c.fillStyle = rgba(deep, 0.78); ellipse(c, x + rx * 0.4, y + 2.4 * s, rx * 1.1, 2.6 * s); c.fill();
      const P = [[x - rx, y], [x - rx * 0.8, y - hh * 0.55], [x - rx * 0.35, y - hh], [x + rx * 0.2, y - hh * 0.8], [x + rx * 0.55, y - hh * 0.92], [x + rx, y - hh * 0.3], [x + rx * 0.9, y]];
      part(c, (cc) => {
        poly(cc, P); cc.fillStyle = lin(cc, x - rx, 0, x + rx, 0, [[0, ICE[4]], [0.3, ICE[3]], [0.62, ICE[2]], [1, ICE[1]]]); cc.fill();
        cc.save(); cc.clip();
        // the shaded face on the right, a blue depth in its cleft, lit edges on the left
        poly(cc, [[x + rx * 0.2, y - hh * 0.8], [x + rx * 0.55, y - hh * 0.92], [x + rx, y - hh * 0.3], [x + rx * 0.9, y], [x + rx * 0.25, y]]); cc.fillStyle = ICE[1]; cc.fill();
        cc.fillStyle = ICE[0]; for (let t = 0; t < hh * 0.72; t += 0.5) { px1(cc, x + rx * 0.22 + Math.sin(t * 0.4) * 1.2, y - t); }
        cc.fillStyle = ICE[1]; for (let t = 0; t < hh * 0.5; t += 0.5) px1(cc, x - rx * 0.45 + Math.sin(t * 0.5 + 2) * 0.8, y - t * 0.8);
        cc.fillStyle = ICE[4]; for (let t = 0; t < hh * 0.5; t += 0.5) px1(cc, x - rx * 0.8 + t * 0.45 * (rx / hh) * 1.6, y - hh * 0.55 - t * 0.8);
        snowCap(cc, [[x - rx * 0.85, y - hh * 0.55], [x - rx * 0.35, y - hh * 1.02], [x + rx * 0.2, y - hh * 0.82], [x + rx * 0.55, y - hh * 0.95], [x + rx * 0.8, y - hh * 0.55], [x + rx * 0.3, y - hh * 0.7], [x - rx * 0.4, y - hh * 0.72]]);
        // the waterline: the ice gone dark and wet where the sea laps it, foam above
        cc.fillStyle = mix(deep, ICE[0], 0.5); cc.fillRect(x - rx, ap(y - 1.4 * s), rx * 2, 1.4 * s);
        cc.fillStyle = ICE[4]; for (let i = 0; i < 6; i++) if (hash(sd, i + 40) < 0.7) px1(cc, x - rx * 0.9 + i * rx * 0.33, y - 1.6 * s, 1.5, 0.5);
        cc.restore();
      });
    } else {
      // a skerry: black rock awash, wet and dark at the waterline, rime on its north side, gull-streaked
      const rx = 10 * s, ry = 5 * s;
      c.fillStyle = rgba(mix(edge, "#5a6a70", 0.3), 0.8); ellipse(c, x, y + 1, rx * 1.25, ry * 0.9); c.fill();
      c.fillStyle = rgba(deep, 0.7); ellipse(c, x + 2, y + ry * 0.55 + 1, rx * 0.9, ry * 0.5); c.fill();
      blackRock(c, x, y + 1, rx, ry * 1.3, sd, 2, 0);
      part(c, (cc) => {
        // the wet band at the waterline, a sheen pixel or two on it
        cc.fillStyle = rgba("#101418", 0.55); cc.fillRect(x - rx * 0.95, ap(y - 1.2 * s), rx * 1.9, 1.6 * s);
        cc.fillStyle = rgba(ICE[3], 0.7); px1(cc, x - rx * 0.5, y - 1.2 * s, 2, 0.5); px1(cc, x + rx * 0.3, y - 0.9 * s, 1.5, 0.5);
        // rime: frost on the cold north face, on the rock's top edges
        cc.fillStyle = SNOW_LT; for (let i = 0; i < 7; i++) { const px = x - rx * 0.8 + i * rx * 0.26; px1(cc, px, y - ry * 1.15 - hash(sd, i + 50) * ry * 0.9, 1.5 + hash(sd, i + 60), 0.5); }
        cc.fillStyle = SNOW; ellipse(cc, x - rx * 0.45, y - ry * 0.75, rx * 0.35, 1.2 * s); cc.fill();
        cc.fillStyle = "#e8e4d8"; for (let i = 0; i < 5; i++) px1(cc, x + (hash(sd, i + 20) - 0.5) * rx * 1.3, y - ry * 0.4 - hash(sd, i + 30) * ry * 0.5, 0.5, 1);
      });
    }
  }, true);
  sp = { cv, hw, top, bot };
  FLOE_SP.set(key, sp);
  return sp;
};
const drawFloes = (ctx, time) => {
  if (typeof document === "undefined") return;
  for (const f of floeList()) {
    const sp = floeSprite(f), s = f.s || 1, ph = hash(Math.round(f.x), Math.round(f.y));
    const floe = f.t === "floe" || f.t === "seals";
    const bob = Math.round(Math.sin(time * 0.55 + ph * 6) * 0.6 * PX) / PX * (floe ? 1 : 0);
    ctx.drawImage(sp.cv, f.x - sp.hw, f.y - sp.top + bob, sp.hw * 2, sp.top + sp.bot);
    // the slow lap of foam round it
    const rx = (f.t === "berg" ? 12 : f.t === "seals" ? 15 : f.t === "floe" ? 10 : 12) * s, ry = rx * 0.38;
    ctx.fillStyle = "rgba(226,240,246,0.7)";
    for (let k = 0; k < 14; k++) {
      if ((k + Math.floor(time * 0.6 + ph * 9)) % 3 === 0) continue;
      const a = k / 14 * Math.PI * 2 + time * 0.08, px = f.x + Math.cos(a) * rx * (1.05 + 0.08 * Math.sin(time * 0.9 + k)), py = f.y + 1.5 + Math.sin(a) * ry;
      if (py < f.y) continue;
      ctx.fillRect(ap(px), ap(py), 1.5, 0.5);
    }
  }
};

const drawRimeGate = (ctx, time) => {
  if (typeof document !== "undefined") {
    const B = iceBake();
    if (B) { for (const [x, y, w, h] of B.box) ctx.drawImage(B.cv, x, y, w, h, x / PX, y / PX, w / PX, h / PX); drawBrash(ctx, B, time); }
  }
  drawFloes(ctx, time);
  if (PTS.length < 2 || typeof document === "undefined") return;
  drawGateFar(ctx, time);
  if (!hasNear()) drawGateNear(ctx);
};

// ============ THE REGISTRY ============
export const RIME_ART = {
  // baked without the 2px ring: the tussock carries its own underline
  flat: ["rmtussock", "rmice"],
  decor: {
    rmspruce, rmrock, rmcairn, rmrunestone, rmskaldstone, rmwhale, rmboat, rmlongship, rmrack,
    rmicefall, rmsealrock, rmtussock, rmlonghouse, rmgate, rmice,
  },
  live: ["rmlonghouse", "rmgate", "rmice"],
  box: {
    rmspruce: [16, 50], rmrock: [18, 18], rmcairn: [12, 24], rmrunestone: [10, 26], rmskaldstone: [10, 36],
    rmwhale: [30, 26], rmboat: [18, 12], rmlongship: [36, 28], rmrack: [20, 20], rmicefall: [24, 30],
    rmsealrock: [22, 14], rmtussock: [10, 12],
  },
  dress: {},
  spawn: { rimegate: drawRimeGate },
  gateTree: { rimegate: rimeGateTree },
  turf: { rime: rimeTurf },
  road: { rime: rimeRoad },
  // the country beyond the board (render/apron.js): no biome of its own (the
  // frost biome is the Frostfang Pass's too), but its pieces may go out there
  apron: {
    landscape: ["rmspruce", "rmrock", "rmcairn", "rmicefall", "rmtussock"],
    tall: ["rmspruce"],
  },
};
