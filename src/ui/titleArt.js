// ============ TITLE VISTA ============
// The picture behind the title screen: dawn over the Greenwood, the crown's
// castle on its hill, the road winding up to its gate, and the forest
// closing in at the edges. Pixel art in the board's own style, painted once
// and cached. Everything is laid out in a 480x270 unit scene, 2 art pixels
// per unit, with the sun low on the left like the game's own light.

import {
  hash, rgb, rgba, hex, mix, lighten, darken, blobBall, ball, cone, inkOutline, bakeSprite, tuft, part, cylinder, SUN,
} from "../render/paint.js";
import { ashlar, merlons, footing, torchBracket } from "../render/buildkit.js";
import { DITH, turfTones } from "../render/world.js";
import { pixelTuft, strawOf } from "../render/groundblend.js";
import { REALMS } from "../data/maps.js";

const U = 2, SW = 480, SH = 270;
export const VW = SW * U, VH = SH * U;
// The road up to the gate, in scene units, gate first; each stretch is
// painted wider than the last as it nears (see ROAD_W). The title crowd
// (titleCrowd.js) walks these same points, so keep them in step.
export const ROAD = [[360, 172], [346, 184], [322, 194], [300, 206], [270, 218], [240, 232], [214, 250], [198, 272]];
export const ROAD_W = (k) => 3 + (k / ROAD.length) * 14;
// the haystack in the field right of the road, where the militiaman works
export const HAY = [312, 216];
const INK = "#241a26";
// these canvases are read back pixel by pixel, so keep them on the CPU
const RF = { willReadFrequently: true };

const smooth = (t) => t * t * (3 - 2 * t);
const vnoise = (x, s, seed) => {
  const g = x / s, i = Math.floor(g), f = smooth(g - i);
  return hash(i, seed) * (1 - f) + hash(i + 1, seed) * f;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const crisp = (cv) => {
  const c = cv.getContext("2d", RF), im = c.getImageData(0, 0, cv.width, cv.height), d = im.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
  c.putImageData(im, 0, 0);
  return cv;
};
// a full-scene layer drawn in units, hardened, maybe edged in ink
const layer = (draw, ink = 0) => {
  const cv = mk(VW, VH), c = cv.getContext("2d", RF);
  c.scale(U, U);
  draw(c);
  crisp(cv);
  if (ink) inkOutline(cv, INK, ink);
  return cv;
};
// the same over one box of the scene (whole units), drawn at [x0, y0]:
// the same pixels as a full layer for anything inside the box, and a
// fraction of the work to harden and ink
const layerAt = (ctx, x0, y0, w, h, draw, ink = 0) => {
  const cv = mk(w * U, h * U), c = cv.getContext("2d", RF);
  c.scale(U, U); c.translate(-x0, -y0);
  draw(c);
  crisp(cv);
  if (ink) inkOutline(cv, INK, ink);
  ctx.drawImage(cv, x0 * U, y0 * U);
};

// ---- the sky: dawn, banded and dithered --------------------------------
const SKY = [[0, "#1c2450"], [0.3, "#33427a"], [0.55, "#5d5f96"], [0.74, "#a07898"], [0.87, "#e0a07c"], [1, "#f6cf8e"]].map(([t, c]) => [t, rgb(c)]);
const skyAt = (t) => {
  for (let i = 1; i < SKY.length; i++) if (t <= SKY[i][0]) {
    const [t0, a] = SKY[i - 1], [t1, b] = SKY[i], k = (t - t0) / (t1 - t0);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  return SKY[SKY.length - 1][1];
};
function paintSky(ctx) {
  const img = ctx.createImageData(VW, VH), d = img.data, HZ = 176 * U, BANDS = 12;
  const PAL = Array.from({ length: BANDS + 1 }, (_, k) => skyAt(k / BANDS).map(Math.round));
  for (let y = 0; y < VH; y++) {
    const tb = Math.min(1, y / HZ) * BANDS - 0.5;
    for (let x = 0; x < VW; x++) {
      // quantise into bands, dithered across each step
      const c = PAL[Math.min(BANDS, Math.max(0, Math.floor(tb + bayer(x, y))))], i = (y * VW + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  // the sun and its halo
  const SX = 118 * U, SY = 150 * U, R = 40 * U;
  for (let y = SY - R; y < SY + R; y++) for (let x = SX - R; x < SX + R; x++) {
    const r = Math.hypot(x - SX, (y - SY) * 1.1) / U, i = (y * VW + x) * 4;
    if (r < 15) { const c = r < 13 ? [255, 238, 186] : [255, 222, 160]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
    else if (r < 34 + bayer(x, y) * 6) {
      const k = r < 22 ? 0.55 : 0.28;
      d[i] += (255 - d[i]) * k; d[i + 1] += (214 - d[i + 1]) * k; d[i + 2] += (150 - d[i + 2]) * k;
    }
  }
  // a few stars still out in the west
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(hash(k, 3) * VW), y = Math.floor(hash(k, 4) * 70 * U);
    const i = (y * VW + x) * 4, on = hash(k, 5) > 0.7 ? 255 : 200;
    d[i] = on; d[i + 1] = on; d[i + 2] = 230;
  }
  ctx.putImageData(img, 0, 0);
}

// ---- clouds: long wisps lit from beneath by the low sun -----------------
function paintClouds(ctx) {
  const cv = layer((c) => {
    c.fillStyle = "#fff";
    const banks = [[70, 58, 60], [190, 40, 46], [300, 78, 70], [420, 50, 50], [150, 96, 40], [40, 110, 34], [380, 112, 44]];
    for (const [cx, cy, w] of banks) for (let k = 0; k < 6; k++) {
      const x = cx + (hash(cx, k) - 0.5) * w * 1.3, y = cy + (hash(cy, k) - 0.5) * 5;
      c.beginPath(); c.ellipse(x, y, w * (0.25 + hash(k, cx) * 0.25), 3.4 + hash(k, cy) * 3.4, 0, 0, Math.PI * 2); c.fill();
    }
  });
  const c = cv.getContext("2d", RF), im = c.getImageData(0, 0, VW, VH), d = im.data;
  const rim = rgb("#ffd6a0"), warm = rgb("#e3a08e"), mid = rgb("#a883a6"), top = rgb("#7e70a2");
  const on = (x, y) => y >= 0 && y < VH && d[(y * VW + x) * 4 + 3] > 0;
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    const i = (y * VW + x) * 4;
    if (!d[i + 3]) continue;
    const col = !on(x, y + 2) ? rim : !on(x, y + 6) ? warm : !on(x, y - 4) ? top : mid;
    out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2];
  }
  c.putImageData(new ImageData(out, VW, VH), 0, 0);
  ctx.drawImage(cv, 0, 0);
}

// ---- ranges: peaks lit on their sunward (west) faces ---------------------
function paintRange(ctx, peaks, base, cols, snow = 0) {
  const img = ctx.getImageData(0, 0, VW, VH), d = img.data;
  const [lit, mid, dk, sn, snDk] = cols.map(rgb), rim = rgb(lighten(cols[0], 0.3));
  for (let x = 0; x < VW; x++) {
    const ux = x / U;
    let best = 1e9, bp = null;
    for (const p of peaks) {
      const y = p[1] + Math.abs(ux - p[0]) * p[2] + (vnoise(ux, 5, p[0]) - 0.5) * 3;
      if (y < best) { best = y; bp = p; }
    }
    const top = Math.round(best * U);
    for (let y = Math.max(0, top); y < base * U; y++) {
      const i = (y * VW + x) * 4, uy = y / U;
      const west = ux < bp[0] - (uy - bp[1]) * 0.12;
      let c = west ? lit : (ux - bp[0]) < (uy - bp[1]) * 0.5 ? mid : dk;
      if (y - top < 2 && west) c = rim;
      if (snow && uy < bp[1] + snow + (vnoise(ux, 3, 9) - 0.5) * 4) c = west ? sn : snDk;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ---- the ground: the board's own meadow and road, seen across the vale ------
// The turf is the in-game Greenwood's (render/world.js): its tone ramp
// (turfTones — seven tones, each cool / plain / warm), its blade dither
// (DITH) fraying every tone edge in short upright strokes, never a Bayer
// screen-door, and its blade flecks, clover, daisies, wildflowers and tufts.
// The board is seen from above; here the same meadow runs away from the eye,
// so its tone map is laid out on the ground plane (`persp`, `planeV`): broad
// and bold near the viewer, small and flattened toward the castle's hill,
// and hazed with distance in a few stepped levels (HAZE_K) that fray into
// each other in the same blades. The road is the board's (render/road.js):
// its dirt tones, a grass-bitten edge with a bank face (dark on the side
// facing the sun, lit on the far one), a worn verge, drifts, crisp rut
// grooves, grain and pebbles, all at the title's width.
const GW = REALMS.greenwood;
const SUNL = Math.hypot(SUN.x, SUN.y), SUX = SUN.x / SUNL, SUY = SUN.y / SUNL;
const HAZE = rgb("#9ca6c4");
const HAZE_K = [0, 0.1, 0.2, 0.31, 0.43, 0.54];
// the Greenwood's light, as atmosphere.js lays it over the board
const GRADE = [255, 236, 200].map((v) => 1 - 0.08 + (0.08 * v) / 255);
const toLight = (c, h) => [0, 1, 2].map((j) => Math.round((c[j] + (HAZE[j] - c[j]) * HAZE_K[h]) * GRADE[j]));
const hazed = (list) => HAZE_K.map((_, h) => list.map((c) => toLight(rgb(c), h)));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease01 = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

// the road's colours: road.js's Greenwood dirt
const roadCols = () => {
  const main = GW.PATH_MAIN, dk = GW.PATH_DK, edge = GW.PATH_EDGE;
  const stone = mix(dk, "#8d8478", 0.45), pebble = GW.PEBBLE;
  return [
    mix(dk, edge, 0.3), mix(main, dk, 0.5), main, lighten(main, 0.11), lighten(main, 0.22),   // 0-4 the dirt
    mix(dk, edge, 0.6), mix(dk, edge, 0.3), lighten(mix(main, GW.GRASS_LT, 0.25), 0.26),        // 5-7 bank: dark, mid, lit
    mix(mix(GW.GRASS_DK, GW.GRASS, 0.5), dk, 0.42),                                              // 8 the worn verge
    lighten(pebble, 0.42), pebble, mix(pebble, mix(dk, edge, 0.3), 0.55),                       // 9-11 a pale pebble
    lighten(stone, 0.42), stone, mix(stone, mix(dk, edge, 0.3), 0.55),                           // 12-14 a grey stone
  ];
};
let GPAL = null;
const groundPal = () => {
  if (GPAL) return GPAL;
  const tt = turfTones(GW);
  GPAL = {
    meadow: HAZE_K.map((_, h) => tt.meadow.map((c) => toLight(c, h))),
    floor: HAZE_K.map((_, h) => tt.floor.map((c) => toLight(c, h))),
    road: hazed(roadCols()),
    // world.js's tufts for grass: the scatter, its darker kin, the realm's own
    tuft: hazed([GW.TUFT, mix(GW.TUFT, GW.GRASS, 0.55), mix(GW.GRASS, GW.GRASS_LT, 0.6), lighten(GW.GRASS_LT, 0.22)]),
    tuftDk: hazed([darken(GW.TUFT, 0.15), GW.TUFT, mix(GW.GRASS, GW.GRASS_LT, 0.3), GW.GRASS_LT]),
    tuftLt: hazed([mix(GW.TUFT, GW.GRASS, 0.3), mix(GW.GRASS, GW.GRASS_LT, 0.35), mix(GW.GRASS, GW.GRASS_LT, 0.8), lighten(GW.GRASS_LT, 0.38)]),
    // road.js's edge tufts
    verge: hazed([darken(GW.GRASS_DK, 0.18), GW.GRASS, lighten(GW.GRASS_LT, 0.12)]),
    stem: hazed([darken(GW.TUFT, 0.1), mix(GW.TUFT, GW.GRASS, 0.4), mix(GW.GRASS, GW.GRASS_LT, 0.3)]),
    clover: hazed([mix(mix(GW.GRASS, GW.GRASS_LT, 0.45), "#5aa890", 0.16), mix(mix(GW.GRASS, GW.GRASS_DK, 0.2), "#3a7a68", 0.18), mix(mix(GW.GRASS, GW.GRASS_DK, 0.7), "#2e6a5e", 0.18), darken(GW.GRASS_DK, 0.12)]),
  };
  return GPAL;
};

// value noise from a 256x256 table of fixed random numbers; x, y in cells
const LATS = new Map();
const lat = (seed) => {
  if (!LATS.has(seed)) { const a = new Float32Array(65536); for (let i = 0; i < 65536; i++) a[i] = hash(i, seed); LATS.set(seed, a); }
  return LATS.get(seed);
};
const vn2 = (A, x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  let u = x - xi, v = y - yi;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const r0 = (yi & 255) << 8, r1 = ((yi + 1) & 255) << 8, c0 = xi & 255, c1 = (xi + 1) & 255;
  const a = A[r0 | c0], b = A[r0 | c1];
  return (a + (b - a) * u) * (1 - v) + (A[r1 | c0] + (A[r1 | c1] - A[r1 | c0]) * u) * v;
};
const vn1 = (A, x) => vn2(A, x, 0.5);
// the blade dither (world.js), and two more readings of it, offset
const dith = (px, py) => DITH[((py & 127) << 7) | (px & 127)];
const dithB = (px, py) => DITH[(((py + 71) & 127) << 7) | ((px + 53) & 127)];
const dithC = (px, py) => DITH[(((py + 37) & 127) << 7) | ((px + 91) & 127)];

// The ground plane: `persp(y)` is how many scene units one unit of ground
// spans at a height y in the picture (1 at its foot, a fifth at the castle's
// gate — the road's own widths, ROAD_W, fall off the same way), and
// `planeV(y)` how deep into the vale that row lies, foreshortened.
const HOR = 147;
const persp = (y) => Math.max(0.12, (y - HOR) / 123);
const planeV = (y) => 205 * Math.log(Math.max(1, y - HOR));
// how far off the haze is, in steps of HAZE_K, down the near ground
const hazeOf = (y) => Math.max(0, Math.min(1.3, (224 - y) / 44));

// A pixel buffer over the whole vista, like world.js's: every ground pixel
// knows its region (1 meadow, 2 wood floor, 3 road, 4 painted outright), its
// tone on the ramp, its temperature and its haze level, so any detail laid
// on later is a step up or down its own ramp.
function groundBuf(ctx) {
  const img = ctx.getImageData(0, 0, VW, VH), d = img.data, N = VW * VH;
  const tone = new Uint8Array(N), temp = new Uint8Array(N), hz = new Uint8Array(N), reg = new Uint8Array(N);
  const P = groundPal();
  const put = (i, c) => { const o = i << 2; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; };
  const ramp = (i) => (reg[i] === 2 ? P.floor : P.meadow)[hz[i]];
  const inside = (px, py) => px >= 0 && py >= 0 && px < VW && py < VH;
  return {
    d, tone, temp, hz, reg, P,
    lay(i, r, tn, tp, h) { reg[i] = r; tone[i] = tn; temp[i] = tp; hz[i] = h; put(i, ramp(i)[tn * 3 + tp]); },
    put(px, py, c) { if (inside(px, py)) put(py * VW + px, c); },
    shift(px, py, dt) {
      if (!inside(px, py)) return;
      const i = py * VW + px, r = reg[i];
      if (r !== 1 && r !== 2) return;
      const n = Math.max(0, Math.min(6, tone[i] + dt));
      tone[i] = n; put(i, ramp(i)[n * 3 + temp[i]]);
    },
    tint(px, py, tp) {
      if (!inside(px, py)) return;
      const i = py * VW + px, r = reg[i];
      if (r !== 1 && r !== 2) return;
      temp[i] = tp; put(i, ramp(i)[tone[i] * 3 + tp]);
    },
    // paint one pixel outright (anywhere: a blade may stand against the sky)
    set(px, py, c) {
      if (!inside(px, py)) return;
      const i = py * VW + px;
      if (reg[i]) reg[i] = 4;
      put(i, c);
    },
    dim(px, py, f) { if (!inside(px, py)) return; const o = (py * VW + px) << 2; d[o] *= f; d[o + 1] *= f; d[o + 2] *= f * 1.02; },
    // the colour a pixel would take a step or two along its ramp
    at(px, py, dt = 0) {
      const i = Math.max(0, Math.min(VH - 1, py)) * VW + Math.max(0, Math.min(VW - 1, px));
      return ramp(i)[Math.max(0, Math.min(6, tone[i] + dt)) * 3 + temp[i]];
    },
    haze(px, py) { return hz[Math.max(0, Math.min(VH - 1, py)) * VW + Math.max(0, Math.min(VW - 1, px))]; },
    isTurf(px, py) { if (!inside(px, py)) return false; const r = reg[py * VW + px]; return r === 1 || r === 2; },
    flush() { ctx.putImageData(img, 0, 0); },
  };
}

// ---- the tone map ---------------------------------------------------------
// The meadow from the line `topAt` down to the picture's foot (or, `far`, a
// distant ridge at one depth). The field is world.js's: warped value noise,
// cut into the ramp's four grass tones, lit on the swells that face the sun
// (up-left, warm) and cooled in the hollows beyond them; `shade(x, y)` adds
// the shadows thrown by what stands on it; `form(x, y)` the hill's own
// flanks, lit toward the low sun.
function* paintMeadow(G, topAt, o = {}) {
  const seed = o.seed ?? 5, far = o.far;
  const L1 = lat(seed + 11), L2 = lat(seed + 23), L3 = lat(seed + 37), Wa = lat(seed + 41), Wb = lat(seed + 53);
  // the fields, sampled once a scene unit and eased between
  const GX = SW + 2, top0 = Math.max(0, Math.floor(Math.min(...Array.from({ length: SW + 1 }, (_, x) => topAt(x)))) - 1);
  const bottom = Math.min(SH + 1, o.bottom ?? SH + 1), GY = bottom - top0 + 2;
  const field = new Float32Array(GX * GY), swell = new Float32Array(GX * GY), sun = new Float32Array(GX * GY);
  const flo = o.floor ? new Float32Array(GX * GY) : null;
  const pS = (y) => (far ? far : persp(y)), pV = (y) => (far ? y * 1.67 / far : planeV(y));
  for (let j = 0; j < GY; j++) {
    if (j === 56) yield `${o.tag} sampling`;   // the sampling is the heavy half: split it
    const y = top0 + j, s = pS(y), v = pV(y), fine = far ? 0 : ease01((s - 0.2) / 0.5);
    for (let i = 0; i < GX; i++) {
      const x = i, u = (x - 330) / s;
      const wx = (vn2(Wa, u / 110, v / 110) - 0.5) * 44, wy = (vn2(Wb, u / 110, v / 110) - 0.5) * 44;
      const sw = vn2(L1, (u + wx) / 64, (v + wy) / 64) * 0.56 + vn2(L2, (u + wx * 0.5) / 24, (v + wy * 0.5) / 24) * 0.3;
      swell[j * GX + i] = sw;
      const sh = o.shade ? o.shade(x, y) : 0;
      if (flo) flo[j * GX + i] = o.floor(sh, x, y);
      field[j * GX + i] = sw + (fine ? vn2(L3, u / 8, v / 8) * 0.14 * fine : 0) + 0.07 * (1 - fine) + sh + (o.lift ? o.lift(x, y) : 0);
    }
  }
  // the sun on the swells, from their slope on the ground plane
  for (let j = 0; j < GY; j++) {
    const y = top0 + j, s = pS(y), ja = Math.max(0, j - 1) * GX, jb = Math.min(GY - 1, j + 1) * GX;
    const du = 2 / s, dv = (pV(y + 1) - pV(y - 1)) || 1;
    for (let i = 0; i < GX; i++) {
      const ia = Math.max(0, i - 1), ib = Math.min(GX - 1, i + 1);
      const gx = (swell[j * GX + ib] - swell[j * GX + ia]) / du, gy = (swell[jb + i] - swell[ja + i]) / dv;
      const f = (gx * 0.42 + gy * 0.58) * 34 + (o.form ? o.form(i, y) : 0);
      sun[j * GX + i] = f < -1 ? -1 : f > 1 ? 1 : f;
    }
  }
  yield `${o.tag} sampling, sun`;
  const x0 = o.x0 ?? 0, x1 = o.x1 ?? VW;
  // `lip` (a number, or one per column) how many art px of the brow turn
  // over into a lit lip, `rim` (the same) the least tone it lights to (and
  // warms it; 0: a plain edge a step up); `tmin` the darkest tone the field
  // may take
  const tmin = o.tmin ?? 0;
  const xm = (x0 + x1) >> 1;
  for (let px = x0; px < x1; px++) {
    if (px === xm && o.split) yield `${o.tag} pixels, west`;
    const x = (px + 0.5) / U, top = topAt(x), ptop = Math.max(0, Math.round(top * U));
    const fx = x, xi = Math.min(GX - 2, fx | 0), u = fx - xi;
    const pbot = Math.min(VH, bottom * U), lip = typeof o.lip === "function" ? o.lip(x) : (o.lip ?? 2.2);
    const rim = typeof o.rim === "function" ? o.rim(x) : (o.rim ?? 0);
    for (let py = ptop; py < pbot; py++) {
      const y = (py + 0.5) / U, fy = y - top0, yi = Math.max(0, Math.min(GY - 2, fy | 0)), w = Math.max(0, Math.min(1, fy - yi));
      const k = yi * GX + xi;
      const w01 = (1 - u) * w, w11 = u * w, w00 = (1 - u) - w01, w10 = u - w11;
      const t = field[k] * w00 + field[k + 1] * w10 + field[k + GX] * w01 + field[k + GX + 1] * w11;
      const sn = sun[k] * w00 + sun[k + 1] * w10 + sun[k + GX] * w01 + sun[k + GX + 1] * w11;
      const dz = dith(px, py), dt = dithB(px, py);
      // the brow: a lit lip of blades where the ground turns over
      const brow = (py - top * U) + dz * 2.2;
      const tt = t + sn * 0.035 + dz * 0.07;
      let tn = Math.max(tmin, tt < 0.23 ? 1 : tt < 0.36 ? 2 : tt < 0.63 ? 3 : 4);
      const onLip = brow < lip;
      if (onLip) tn = Math.min(5, Math.max(rim, tn + 1));
      const wv = sn + (t - 0.47) * 1.3 + dt * 0.22 + (o.warm ? o.warm(x, y) : 0);
      const tp = onLip && rim ? 2 : wv < -0.42 ? 0 : wv > 0.42 ? 2 : 1;
      const hv = (o.haze ? o.haze(x, y) : 0) + dithC(px, py) * 0.9;
      const h = Math.max(0, Math.min(HAZE_K.length - 1, Math.round(hv)));
      const floor = flo && flo[k] * w00 + flo[k + 1] * w10 + flo[k + GX] * w01 + flo[k + GX + 1] * w11 + dz * 0.12 > 0;
      G.lay(py * VW + px, floor ? 2 : 1, floor ? Math.max(1, Math.min(3, tn - 1)) : tn, tp, h);
    }
  }
  return { swellAt: (x, y) => field[Math.max(0, Math.min(GY - 1, Math.round(y - top0))) * GX + Math.max(0, Math.min(GX - 1, Math.round(x)))] };
}

// ---- the road, pixel by pixel ---------------------------------------------
// ROAD run on past the picture's foot the way the crowd comes and goes
// (titleCrowd.js walks on to (184, 292)); its half-width eases along it
// between the stretches' ROAD_W, as the crowd's lanes do.
const RP = [...ROAD, [184, 292]];
const RSEG = [];
{
  let a = 0;
  for (let k = 0; k < RP.length - 1; k++) {
    const [x0, y0] = RP[k], [x1, y1] = RP[k + 1], l = Math.hypot(x1 - x0, y1 - y0);
    RSEG.push({ x0, y0, dx: (x1 - x0) / l, dy: (y1 - y0) / l, l, a0: a, k });
    a += l;
  }
}
const ROAD_LEN = RSEG[RSEG.length - 1].a0 + RSEG[RSEG.length - 1].l;
// how far along the road, in units of the road near the viewer (a stretch up
// by the gate, a fifth as wide, counts five times as far)
const RPL = [0];
for (let a = 1; a <= Math.ceil(ROAD_LEN) + 1; a++) {
  let s = RSEG[RSEG.length - 1];
  for (const g of RSEG) if (a - 0.5 < g.a0 + g.l) { s = g; break; }
  RPL.push(RPL[a - 1] + 15.2 / ROAD_W(Math.min(RP.length, s.k + (a - 0.5 - s.a0) / s.l)));
}
const roadPlane = (al) => { const i = Math.max(0, Math.min(RPL.length - 2, Math.floor(al))), f = al - i; return RPL[i] + (RPL[i + 1] - RPL[i]) * f; };
// the nearest point of the centreline: how far, which side (+1: right of the
// way down from the gate), how far along, the half-width there, and the
// unit normal out to (x, y)
const roadNear = (x, y) => {
  let best = 1e9, bs = RSEG[0], bt = 0;
  for (const s of RSEG) {
    const t = Math.max(0, Math.min(s.l, (x - s.x0) * s.dx + (y - s.y0) * s.dy));
    const ex = x - s.x0 - s.dx * t, ey = y - s.y0 - s.dy * t, dd = ex * ex + ey * ey;
    if (dd < best) { best = dd; bs = s; bt = t; }
  }
  const d = Math.sqrt(best), ex = x - bs.x0 - bs.dx * bt, ey = y - bs.y0 - bs.dy * bt;
  return { d, side: ex * -bs.dy + ey * bs.dx > 0 ? 1 : -1, al: bs.a0 + bt, hw: ROAD_W(bs.k + bt / bs.l) / 2, nx: d > 1e-4 ? ex / d : 0, ny: d > 1e-4 ? ey / d : 0, ux: bs.dx, uy: bs.dy };
};
// a point `off` across the road (+: right of the way down) at `al` along it
const roadAt = (al, off = 0) => {
  let s = RSEG[RSEG.length - 1];
  for (const g of RSEG) if (al < g.a0 + g.l) { s = g; break; }
  const t = Math.max(0, al - s.a0);
  return { x: s.x0 + s.dx * t - s.dy * off, y: s.y0 + s.dy * t + s.dx * off, hw: ROAD_W(Math.min(s.k + t / s.l, RP.length)) / 2, ux: s.dx, uy: s.dy };
};
// how far (x, y) lies outside the road's painted edge (negative: on it)
const offRoad = (x, y) => { const r = roadNear(x, y); return r.d - r.hw - 0.2; };
// the road's own noise along its length, per side
// (built on first use, inside a painting stage, not when the module loads)
let RNC = null;
const roadNoise = () => RNC || (RNC = { edge: lat(301), wand: lat(307), drift: lat(311), mid: lat(313), rutA: lat(317), rutB: lat(319), rutF: lat(323), lat: lat(329), verge: lat(331), clump: lat(337) });
const PEBBLES = [
  ["LS"],
  ["LB", "DS"],
  ["LB.", "BDS"],
  [".LB.", "LBBD", ".BDS", "..S."],
  [".LLB.", "LBBBD", "BBBDD", ".DDSS", "..SS."],
];

function* paintRoadPx(G) {
  const P = G.P, RN = roadNoise();
  const PX0 = 170 * U, PX1 = 384 * U, PY0 = 164 * U, PYM = (PY0 + VH) >> 1;
  const rutOn = (al, side) => { const q = roadPlane(al); return vn1(side > 0 ? RN.rutB : RN.rutA, q / 26) * 0.62 + vn1(RN.rutF, q / 9 + (side > 0 ? 40 : 0)) * 0.38 > 0.45; };
  for (let py = PY0; py < VH; py++) {
    if (py === PYM) yield "road, far half";
    const y = (py + 0.5) / U, hzy = hazeOf(y);
    for (let px = PX0; px < PX1; px++) {
      const x = (px + 0.5) / U, r = roadNear(x, y);
      const sc = r.hw / 7.6;
      if (r.d > r.hw + 1.2 + 4.2 * sc) continue;
      const i = py * VW + px;
      const s = r.nx * SUX + r.ny * SUY;                         // > 0: this edge faces the sun
      const sg = r.side, al = r.al;
      const hl = Math.max(0, Math.min(3, Math.round(hzy + dithC(px, py) * 0.9)));
      const T = P.road[hl];
      // the edge, bitten by the grass: each side its own bites, and a slow
      // wander of the whole road
      const bite = (vn1(RN.edge, al / Math.max(0.9, 2.3 * sc) + (sg > 0 ? 131 : 0)) - 0.5) * (0.6 + 1.1 * sc);
      const edgeR = r.hw + 0.45 + bite + (vn1(RN.wand, al / 16) - 0.5) * 0.5 * sc;
      const e = (r.d - edgeR) * U;                                // art pixels past the edge
      const cl = vn2(RN.clump, px / 3.6, py / 3.6) - 0.5;
      if (e >= 0) {
        // the bank's face: dark where it faces the sun, lit on the far side
        const bw = s > 0.6 && sc > 0.55 ? 2 : 1;
        if (e < bw) { G.set(px, py, T[s > 0.18 ? 5 : s < -0.25 ? 7 : 6]); G.reg[i] = 3; continue; }
        // dirt kicked out onto the grass, then the trampled verge
        const f0 = 1 - (e - bw) / (1 + 3 * sc);
        if (f0 > 0 && hash(px, py * 7 + 3) < 0.16 * f0 * f0) { G.set(px, py, T[1]); continue; }
        const vw = (2 + vn2(RN.verge, px / 14, py / 14) * 5.5) * Math.max(0.4, sc);
        if (e < vw && G.isTurf(px, py)) {
          const f = 1 - e / vw;
          if (f * 0.9 + cl * 0.75 + (hash(px, py) - 0.5) * 0.12 > 0.42) {
            const tw = 0.5 * (0.55 + 0.45 * f), c = T[8], o = i << 2, d = G.d;
            d[o] += (c[0] - d[o]) * tw; d[o + 1] += (c[1] - d[o + 1]) * tw; d[o + 2] += (c[2] - d[o + 2]) * tw;
          }
        }
        continue;
      }
      // ---- the dirt: one tone field, cut into five tones ----
      const a = r.d, inside = -e / U;
      // (the drifts lie on the road itself: along it and across it in its
      // own units, so they shrink and flatten with the road into the distance)
      const ra = roadPlane(al), rc = (sg * a) / sc;
      const fineR = ease01((sc - 0.3) / 0.4);
      let v = 0.48 + 0.1 * (1 - (a / r.hw) ** 2)
        + (vn2(RN.drift, ra / 16, rc / 9) - 0.5) * 0.3
        + (vn2(RN.mid, ra / 5 + 40, rc / 3.2) - 0.5) * 0.2 * fineR;
      // the bank's shadow thrown into the road along the sunward edge
      if (s > 0.2 && inside < (0.35 + 0.9 * (s - 0.2)) * Math.max(0.6, sc) + cl * 0.6 * sc) v -= 0.17;
      const ti = v + cl * 0.06;
      let idx = ti < 0.25 ? 0 : ti < 0.4 ? 1 : ti < 0.63 ? 2 : ti < 0.79 ? 3 : 4;
      // twin cart ruts: crisp grooves — a dark wall on the sun's side, a floor,
      // a lit lip on the far side — each running and breaking off on its own
      if (r.hw * U >= 6) {
        const g = r.hw * 0.44 + (vn1(RN.lat, roadPlane(al) / 40) - 0.5) * 0.9 * sc;
        const dq = (a - g) * U, wide = sc > 0.55;
        if (wide ? dq > -2 && dq < 2 : dq > -1 && dq < 1) {
          if (rutOn(al, sg)) {
            const ws = Math.floor(s >= 0 ? dq : -dq);   // + toward the sun
            if (wide) { if (ws === -1 || ws === 0) idx -= 1; else idx += ws > 0 ? -1 : 1; }
            else idx += ws === 0 ? -1 : 1;
          }
        }
      }
      // the road's own rim: a step darker where it meets the sunward bank
      if (inside < 0.5) idx += s > -0.3 ? -1 : 1;
      // grain: single pixels a step off
      const h = hash(px * 3 + 1, py * 5 + 2);
      if (h < 0.045) idx -= 1; else if (h > 0.978) idx += 1;
      G.set(px, py, T[idx < 0 ? 0 : idx > 4 ? 4 : idx]);
      G.reg[i] = 3;
    }
  }
}

// the road's small things: pebbles gathered toward its edges, grass tufts
// biting in along both edges and coming back on the hump between the ruts
function paintRoadDetail(G) {
  const P = G.P, toPx = (x, y) => [Math.floor(x * U), Math.floor(y * U)];
  const stamp = (x, y, rows, pal) => {
    const [px, py] = toPx(x, y), ox = px - (rows[0].length >> 1), oy = py - (rows.length >> 1);
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i];
      if (ch === ".") continue;
      if (ch === "S") G.dim(ox + i, oy + j, 0.72); else G.set(ox + i, oy + j, pal[ch]);
    }
  };
  let n = 0;
  for (let al = 8; al < ROAD_LEN; al += (2 + 4 * roadAt(al).hw / 7.6) * (0.5 + hash(n, 71)), n++) {
    const q = roadAt(al), sc = q.hw / 7.6;
    if (hash(n, 72) > 0.2 + sc * 0.35) continue;
    const r = hash(n, 73), side = hash(n, 74) < 0.5 ? -1 : 1;
    const off = side * q.hw * (r < 0.25 ? r * 1.2 : 0.42 + 0.46 * Math.sqrt(hash(n, 75)));
    const p = roadAt(al, off);
    const kind = Math.min(Math.floor(hash(n, 76) ** 1.6 * (1.2 + sc * 3.6)), PEBBLES.length - 1);
    const hl = Math.min(3, Math.round(hazeOf(p.y)));
    const T = P.road[hl], c = hash(n, 77);
    const pal = c < 0.55 ? { L: T[9], B: T[10], D: T[11] } : { L: T[12], B: T[13], D: T[14] };
    stamp(p.x, p.y, PEBBLES[kind], pal);
  }
  // tufts along the edges, rooted just past the bank, in clumps and gaps
  n = 0;
  for (let al = 4; al < ROAD_LEN; n++) {
    const q = roadAt(al), sc = q.hw / 7.6;
    al += (1.6 + 3.4 * sc) * (0.5 + hash(n, 81));
    if (hash(n, 82) < 0.4) continue;
    const side = hash(n, 83) < 0.5 ? -1 : 1;
    const p = roadAt(al, side * (q.hw + 0.3 + 0.8 * sc * hash(n, 84)));
    const hl = Math.min(3, Math.round(hazeOf(p.y))), cols = P.verge[hl];
    const [bx, by] = toPx(p.x, p.y);
    pixelTuft((a, b, c) => G.set(a, b, c), (a, b) => G.dim(a, b, 0.82), bx, by, 0.25 + 0.55 * sc, n + 400, [cols[0], cols[1], cols[1], cols[2]], { n: 3 + (n % 3) });
  }
  // grass coming back on the hump between the ruts, near the viewer
  for (let k = 0; k < 4; k++) {
    const al = ROAD_LEN * (0.62 + hash(k, 91) * 0.3), q = roadAt(al), sc = q.hw / 7.6;
    if (sc < 0.7) continue;
    const p = roadAt(al, (hash(k, 92) - 0.5) * q.hw * 0.4);
    const [bx, by] = toPx(p.x, p.y), cols = P.verge[0];
    pixelTuft((a, b, c) => G.set(a, b, c), (a, b) => G.dim(a, b, 0.82), bx, by, 0.35 + 0.3 * sc, k + 700, [cols[0], cols[0], cols[1], cols[2]], { n: 3 + (k % 2) });
  }
}

// ---- the meadow's small things, as world.js lays them ----------------------
// three leaflets of clover in a Y (L lit, m mid, D shaded, d the dark heart)
const CLOVER = [["Lm.Lm", "mDdmD", "..Lm.", "..mD."], ["Lm.Lm", "mDdmD", ".Lm..", ".mD.."]];
const DAISY = [".w.", "wYs", ".s."];
const FLOWER_SMALL = [".L.", "LCP", ".D."];
const FLOWER_COLS = GW.scatter.flowerCols;
const stampRows = (G, px, py, rows, map) => {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const m = map[rows[j][i]];
    if (m === undefined) continue;
    if (typeof m === "number") G.shift(px + i, py + j, m); else G.set(px + i, py + j, m);
  }
};
// a head of five round petals round a warm eye, the upper-left ones lit
// (world.js's petalHead): r 2 a meadow flower, 3 one close to the eye
const PETALS = [-90, -18, 54, 126, 198].map((a) => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)]);
const petalHead = (set, cx, cy, col, centre, r) => {
  const lt = rgb(lighten(col, 0.42)), c = rgb(col), dk = rgb(darken(col, 0.3)), eye = rgb(centre), eyeDk = rgb(darken(centre, 0.3));
  const pr = r * 0.95, rad = r * 0.62 + 0.55, B = r + 2;
  for (let j = -B; j <= B; j++) for (let i = -B; i <= B; i++) {
    const d0 = Math.hypot(i, j);
    if (d0 <= r * 0.42) { set(cx + i, cy + j, i + j < 0 || r < 3 ? eye : eyeDk); continue; }
    let best = 99, second = 99, bp = null;
    for (const p of PETALS) {
      const q = Math.hypot(i - p[0] * pr, j - p[1] * pr);
      if (q < best) { second = best; best = q; bp = p; } else if (q < second) second = q;
    }
    if (best > rad || (second - best < 0.45 && d0 > r * 0.9)) continue;
    const sunny = bp[0] * 0.5 + bp[1] * 0.8 < -0.2, rim = (i - bp[0] * pr) * 0.5 + (j - bp[1] * pr) * 0.8;
    set(cx + i, cy + j, sunny && rim < 0.3 ? lt : !sunny && rim > 0.2 ? dk : c);
  }
};
const eyeOf = (col) => { const [r, g, b] = rgb(col); return r > 180 && g > 150 && b < 140 ? "#a8642c" : "#f2c744"; };
// a wildflower at (px, py) art pixels, sized by how near it stands
const wildflower = (G, px, py, col, s, stemC, seed) => {
  const hl = G.haze(px, py), c = hl ? mix(col, "#9ca6c4", HAZE_K[hl]) : col;
  if (s < 0.3) return;
  const big = s > 0.8 ? 2 : s > 0.5 ? 1 : 0, stem = big > 1 ? 6 : big ? 5 : 2;
  for (let i = 0; i < (big ? 5 : 2); i++) G.shift(px + 1 + i, py + 1, -1);
  for (let k = 0; k < stem; k++) G.set(px, py - k, stemC[k === 0 ? 0 : 1]);
  if (big) {
    G.set(px + 1, py - 1, stemC[1]); G.set(px + 2, py - 2, stemC[2]); G.set(px - 1, py - 2, stemC[1]); G.set(px - 2, py - 3, stemC[2]);
    petalHead((a, b, q) => G.set(a, b, q), px, py - stem - (big > 1 ? 3 : 2), c, eyeOf(col), big > 1 ? 3 : 2);
  } else stampRows(G, px - 1, py - stem - 2, FLOWER_SMALL, { L: rgb(lighten(c, 0.4)), P: rgb(c), D: rgb(darken(c, 0.32)), C: rgb(eyeOf(col)) });
};

// Every small thing on the near meadow: blade flecks gathered in drifts,
// clover colonies, daisy patches, wildflowers with their kin, and the grass
// tufts — gathering where the turf is lush, bigger the nearer they stand.
function paintTurfDetail(G, field, trees) {
  const P = G.P, drift = lat(61);
  const inWood = (x, y) => trees.some(([tx, ty, , r]) => Math.abs(x - tx) < r * 0.9 && y < ty + 1 && y > ty - r * 1.6);
  // the flecks: a blade or two, or a lit tip catching the sun
  for (let cy = 330; cy < VH; cy += 5) for (let cx = 0; cx < VW; cx += 5) {
    const px = cx + Math.floor(hash(cx, cy + 71) * 5), py = cy + Math.floor(hash(cx + 5, cy + 72) * 5);
    if (!G.isTurf(px, py) || inHay(px / U, py / U, 0.5)) continue;
    const y = py / U, s = persp(y), u = (px / U - 330) / s, v = planeV(y);
    const dr = ease01((vn2(drift, u / 36, v / 36) - 0.28) / 0.5);
    if (hash(cx * 7 + 3, cy * 13 + 5) > 0.34 * (0.04 + 1.5 * dr * dr) * (0.6 + 0.6 * s)) continue;
    const h3 = hash(px, py + 3), h4 = hash(px + 1, py + 4);
    if (h3 < 0.3 || G.haze(px, py) >= 2) { G.shift(px, py, 1); if (h4 < 0.5 && s > 0.5) G.shift(px + 1, py - 1, 1); continue; }
    const len = Math.max(2, Math.round((2 + h3 * 2.2) * (0.55 + 0.75 * s))), lean = h4 < 0.4 ? 1 : 0;
    for (let k = 0; k < len - 1; k++) G.shift(px, py - k, -1);
    G.shift(px + lean, py - len + 1, 1);
    if (h4 > 0.75 && s > 0.45) { G.shift(px - 2, py, -1); G.shift(px - 3, py - 1, 1); }
  }
  const spot = (i, y0, y1) => { const x = hash(i, 1) * SW, y = y0 + hash(i, 2) * (y1 - y0); return [x, y]; };
  // clover, in little colonies
  for (let i = 0; i < 26; i++) {
    const [cx, cy] = spot(i + 500, 212, 268), s = persp(cy), n = 3 + Math.floor(hash(i, 3) * 5);
    for (let k = 0; k < n; k++) {
      const x = cx + (hash(i * 9 + k, 4) - 0.5) * 12 * s, y = cy + (hash(i * 9 + k, 5) - 0.5) * 4 * s;
      const px = Math.round(x * U), py = Math.round(y * U);
      if (offRoad(x, y) < 1.5 || !G.isTurf(px, py) || !G.isTurf(px + 3, py + 2) || inHay(x, y, 1)) continue;
      const c = P.clover[G.haze(px, py)];
      stampRows(G, px - 2, py - 2, CLOVER[k & 1], { L: c[0], m: c[1], D: c[2], d: c[3] });
    }
  }
  // daisies, now and then a patch of them
  const daisy = { w: rgb("#fbf6ea"), Y: rgb("#f0c040"), s: rgb("#d4d0c8") };
  for (let i = 0; i < 6; i++) {
    const [cx, cy] = spot(i + 600, 206, 266), s = persp(cy), n = 6 + Math.floor(hash(i, 3) * 9);
    for (let k = 0; k < n; k++) {
      const x = cx + (hash(i * 17 + k, 4) - 0.5) * 18 * s, y = cy + (hash(i * 17 + k, 5) - 0.5) * 5 * s;
      const px = Math.round(x * U), py = Math.round(y * U);
      if (offRoad(x, y) < 2 || !G.isTurf(px, py) || inWood(x, y) || inHay(x, y, 1)) continue;
      if (s < 0.4) { G.set(px, py, daisy.w); continue; }
      G.shift(px + 1, py + 1, -1);
      stampRows(G, px - 1, py - 1, DAISY, daisy);
    }
  }
  // grass: tufts gathering where the turf is lush (low in the field), each
  // rooted low enough that its tallest blade stays on the ground, never
  // standing up past the hill's brow against the ridge behind
  const blades = [];
  for (let i = 0; i < 1300; i++) {
    const x = hash(i, 11) * SW, y = 168 + hash(i, 12) * 104;
    const px = Math.round(x * U), py = Math.round(y * U);
    if (!G.isTurf(px, py) || offRoad(x, y) < 1.2 || inHay(x, y, 0.8)) continue;
    const s = persp(y), dr = ease01((vn2(drift, (x - 330) / s / 50, planeV(y) / 50) - 0.3) / 0.45);
    if (hash(i, 13) > (0.1 + 0.9 * s * s) * (0.25 + 0.75 * dr)) continue;
    if (hash(i, 14) > 0.2 + (0.6 - field.swellAt(x, y)) * 2.6) continue;
    const sz = (0.3 + 0.95 * s) * (0.6 + 0.55 * hash(i, 15));
    if (py - 15 * sz < (hillTop(x) + 1.5) * U) continue;
    blades.push([px, py, sz, i]);
  }
  blades.sort((a, b) => a[1] - b[1]);
  // grass in a wood's shade takes the floor's own tones (world.js's
  // floorTuft), but only the blades that stand on the floor: where one
  // rises out of it onto the open meadow it takes the meadow's darker tuft
  const onFloor = G.reg.map((r) => (r === 2 ? 1 : 0));
  for (const [px, py, sz, i] of blades) {
    const hl = G.haze(px, py);
    const cols = i % 4 === 0 ? P.tuftDk[hl] : i % 7 === 0 ? P.tuftLt[hl] : P.tuft[hl];
    if (onFloor[py * VW + px]) {
      const fl = [G.at(px, py, -1), G.at(px, py, 1), G.at(px, py, 3), G.at(px, py, 4)], dk = P.tuftDk[hl];
      pixelTuft((a, b, k) => G.set(a, b, a >= 0 && b >= 0 && a < VW && b < VH && onFloor[b * VW + a] ? fl[k] : dk[k]), (a, b) => G.shift(a, b, -1), px, py, sz, i, [0, 1, 2, 3], sz > 1 ? { n: 5 + (i % 3) } : undefined);
      continue;
    }
    pixelTuft((a, b, c) => G.set(a, b, c), (a, b) => G.shift(a, b, -1), px, py, sz, i, cols, sz > 1 ? { n: 5 + (i % 3) } : undefined);
  }
  // wildflowers, each with a few smaller ones of its kind about it
  for (let i = 0; i < 24; i++) {
    const [fx, fy] = spot(i + 700, 204, 266), s = persp(fy), col = FLOWER_COLS[i % FLOWER_COLS.length];
    if (offRoad(fx, fy) < 2.5 || inWood(fx, fy)) continue;
    const kin = Math.floor(hash(i, 8) * (1 + 3 * s));
    for (let k = 0; k <= kin; k++) {
      const x = k ? fx + (hash(i, k + 20) - 0.5) * 12 * s : fx, y = k ? fy + (hash(i, k + 30) - 0.5) * 4 * s : fy;
      const px = Math.round(x * U), py = Math.round(y * U);
      if (!G.isTurf(px, py) || offRoad(x, y) < 2 || inHay(x, y, 1)) continue;
      wildflower(G, px, py, col, k ? s * 0.55 : s, P.stem[G.haze(px, py)], i * 5 + k);
    }
  }
}

// the far ridge: the same meadow, a long way off. Its tone map keeps to the
// ramp's middle tones (a long way off, the grass's darkest hollows melt
// into the haze). `near` is the castle's hill in front of it: the farms keep
// a few units clear of its outline so the hill's edge reads against meadow.
function* paintFarHills(ctx, top, near) {
  const G = groundBuf(ctx);
  yield* paintMeadow(G, top, {
    tag: "far ridge", far: 0.18, seed: 3, bottom: 206, lip: 2.6, tmin: 2,
    haze: (x, y) => 4.4 - Math.min(0.6, (y - top(x)) / 24),
    lift: (x) => -(top(x + 2) - top(x - 2)) * 0.12,
    form: (x) => -(top(x + 2) - top(x - 2)) * 0.4,
    warm: (x) => (0.5 - x / SW) * 0.6,
  });
  yield "far ridge pixels";
  // farms on its slopes, as on the map's Greenwood: a patchwork of wheat,
  // ploughland, green corn and barley in a few farms along the ridge,
  // thinning out lower down. Each farm is a jittered lattice laid along the
  // fall of the ground: columns with wandering, leaning sides, and every
  // column its own rows, so no two fields' feet line up and nothing runs on
  // as a shelf. Hedges go round the fields they bound (a lumpy one along
  // each field's foot, a thin one up its sides); some fields are shared
  // between two crops or cut short, some cells are hedged pasture a shade
  // off the meadow, and the furrows run across the slope, down it, or not
  // at all. They take the ridge's own haze (a share of its hazed grass), so
  // ploughland stays brown and wheat stays gold.
  const KF = [0, 0.08, 0.15, 0.22, 0.3, 0.36];
  const grade = (c) => c.map((v, j) => Math.round(v * GRADE[j]));
  const toRidge = (c) => HAZE_K.map((_, h) => rgb(mix(grade(rgb(c)), G.P.meadow[h][3 * 3 + 1], KF[h])));
  const fp = FARM.map((pair) => pair.map(toRidge));
  const hedge = [darken(GW.TUFT, 0.25), GW.TUFT, mix(GW.GRASS, GW.GRASS_LT, 0.3)].map(toRidge);
  const fold = lat(359), clus = lat(361), leanN = lat(367);
  // the lattice: column k runs between the sides jb(k) and jb(k + 1) (in
  // units across the slope), its rows between the depths edges[m], edges[m+1]
  const CW = 23;
  const jb = (k) => k * CW + (hash(k, 31) - 0.5) * CW * 0.6;
  const COLS = new Map();
  const rowsOf = (k) => {
    if (!COLS.has(k)) {
      const e = [-hash(k, 32) * 5];
      for (let m = 0; e[m] < 60; m++) e.push(e[m] + 3.2 + hash(k * 37 + m, 33) * 5.4 + m * 0.45);
      COLS.set(k, e);
    }
    return COLS.get(k);
  };
  // what a cell is: 2 a field, 1 hedged pasture, 0 open meadow; farms
  // gather where the cluster noise is high and thin out down the slope
  const KINDS = new Map();
  const kindOf = (k, m) => {
    const key = k * 64 + m;
    if (!KINDS.has(key)) {
      const e = rowsOf(k), dm = (e[m] + e[m + 1]) / 2, cx = (jb(k) + jb(k + 1)) / 2, seed = k * 131 + m * 17 + 1000;
      const pf = clamp01((vn1(clus, cx / 58 + 3.3) - 0.3) * 2.8) * (1 - clamp01((dm - 22) / 16)) * (m === 0 ? 0.6 : 1);
      KINDS.set(key, hash(seed, 7) < pf ? 2 : hash(seed, 9) < pf * 0.55 ? 1 : 0);
    }
    return KINDS.get(key);
  };
  const cellAt = (k, d) => { const e = rowsOf(k); let m = 0; while (e[m + 1] <= d) m++; return m; };
  // how far (x, y) lies beside the near hill's outline, in units: the
  // nearest column where the outline has climbed up past it
  const NX = Array.from({ length: SW + 21 }, (_, k) => near(k - 10));
  const nearAt = (x) => NX[Math.max(0, Math.min(NX.length - 1, Math.round(x) + 10))];
  const offHill = (x, y) => {
    let d = 99;
    for (let dx = -7; dx <= 7; dx++) if (nearAt(x + dx) < y + 1.5) d = Math.min(d, Math.abs(dx));
    return d;
  };
  // a field the hill's outline would cut off at its side (where the outline
  // climbs through the field's row) is left out whole, never a sliver
  const cells = new Map();
  const cellClear = (seed, xa, cw, yb) => {
    if (!cells.has(seed)) {
      let ok = true;
      for (let xs = xa - 8; xs <= xa + cw + 8 && ok; xs += 2) ok = nearAt(xs) > yb + 3;
      cells.set(seed, ok);
    }
    return cells.get(seed);
  };
  for (let px = 0; px < VW; px++) {
    const x = (px + 0.5) / U, t = top(x), fx = (vn1(fold, x / 46) - 0.5) * 5, ln = (vn1(leanN, x / 90) - 0.5) * 1.1;
    let reach = 1e9;
    for (let dx = -7; dx <= 7; dx++) reach = Math.min(reach, nearAt(x + dx));
    for (let py = Math.ceil((t + 3) * U); py < 206 * U; py++) {
      const i = py * VW + px;
      if (G.reg[i] !== 1) continue;
      const y = (py + 0.5) / U;
      if (y + 1.5 > reach && offHill(x, y) < 6) continue;
      const d = y - t - 3 + fx * Math.min(1, (y - t) / 22);
      if (d < 0) continue;
      // the columns lean along the fall of the ground
      const xs = x + d * ln;
      let k = Math.floor(xs / CW);
      if (xs < jb(k)) k--; else if (xs >= jb(k + 1)) k++;
      const e = rowsOf(k), m = cellAt(k, d), kind = kindOf(k, m);
      if (!kind) continue;
      const seed = k * 131 + m * 17 + 1000, xa = jb(k), xb = jb(k + 1);
      if (!cellClear(seed, xa - (xs - x), xb - xa, y + (e[m + 1] - d))) continue;
      const h = G.hz[i], toFoot = (e[m + 1] - d) * U, fromW = (xs - xa) * U, toE = (xb - xs) * U;
      // the hedge along its foot: lit along its top, lumpy with bushes
      const lump = hash(Math.floor(x * 0.9), seed) < 0.3 ? 1 : 0;
      if (toFoot < 2 + lump) { G.set(px, py, hedge[toFoot < 1 ? 0 : toFoot < 2 ? 1 : 2][h]); continue; }
      // and thin ones up its sides (the east one only where no field of
      // the next column already hedges it)
      if (fromW < 1 || (toE < 1 && !kindOf(k + 1, cellAt(k + 1, d)))) { G.set(px, py, hedge[1][h]); continue; }
      if (kind === 1) { G.shift(px, py, hash(seed, 15) < 0.5 ? 1 : -1); continue; }
      // shared between two crops, or cut short and left to the meadow
      let fs = seed;
      if (hash(seed, 11) < 0.4) {
        const cut = xa + (xb - xa) * (0.35 + 0.3 * hash(seed, 12)), q = (xs - cut) * U;
        if (q >= 0) {
          if (hash(seed, 13) < 0.4) { if (q < 1) G.set(px, py, hedge[1][h]); continue; }
          if (q < 1) { G.set(px, py, hedge[1][h]); continue; }
          fs = seed + 7;
        }
      }
      const f = fp[CROP[Math.floor(hash(fs, 8) * CROP.length)]], fm = hash(fs, 14);
      const furrow = fm < 0.45 ? Math.floor(d * U + k) % 3 === 0 : fm < 0.8 ? Math.floor(xs * U) % 3 === 0 : dith(px, py) > 0.86;
      G.set(px, py, f[furrow ? 1 : 0][h]);
    }
  }
  G.flush();
}
// the farms' colours (the map's Greenwood fields): each a field and its furrow
const FARM = [["#d8bf62", "#c4a84e"], ["#a67e52", "#8e6a44"], ["#9cc462", "#86b052"], ["#c8c46a", "#b0ac58"]];
// how often each is sown: the ridge's own green takes the green corn in, so
// the golds and the ploughland carry the patchwork
const CROP = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3];

// The hay meadow right of the road, where the militiaman forks the stack:
// mown a step paler than the meadow round it, the cut hay raked into
// windrows along the fall of the ground (the board's own straw, strawOf),
// spaced wider as they come nearer. Each windrow is its own line: it
// wanders as the rake did, thickens and thins, catches the sun here and
// there and breaks off where it's been gathered; the field's edges wobble
// as the scythe went and fray in the blades.
let HAYN = null;
const hayNoise = () => HAYN || (HAYN = { edge: lat(343), wand: lat(347), body: lat(349), gap: lat(353) });
const inHay = (x, y, dz = 0) => {
  const N = hayNoise().edge, wob = (a, s) => (vn1(N, a / s) - 0.5) * 2.2;
  return y > 198.5 - (x - 326) * 0.075 + wob(x, 17) + dz && y < 233 - (x - 300) * 0.02 + wob(x + 400, 21) * 0.8 + dz
    && x < 404 + (y - 195) * 0.35 + wob(y + 800, 9) * 1.4 + dz * 2 && x > 282 + (233 - y) * 1.09 + wob(y + 1200, 8) * 1.4 + dz * 2
    && offRoad(x, y) > 2.6 + dz;
};
// a windrow's centre line (on the slope's datum), and the gap to the next
const rowY = (r) => HOR + Math.exp(((r + 0.5) * 7.5) / 205);
function paintHayField(G) {
  const straw = hazed(strawOf(GW)), N = hayNoise();
  for (let py = 186 * U; py < 240 * U; py++) {
    const y = (py + 0.5) / U;
    for (let px = 276 * U; px < 436 * U; px++) {
      const x = (px + 0.5) / U, dz = dith(px, py);
      if (!G.isTurf(px, py) || !inHay(x, y, (dz - 0.5) * 2.4)) continue;
      const h = G.hz[py * VW + px], w0 = y + (x - 326) * 0.06, r0 = Math.floor(planeV(w0) / 7.5);
      // the nearest windrow, each wandering on its own phase and pace
      let dy = 99, br = r0, sp = 1;
      for (let r = r0 - 1; r <= r0 + 1; r++) {
        const yc = rowY(r), s = (7.5 * (yc - HOR)) / 205;
        const wan = (vn1(N.wand, x / (8 + hash(r, 3) * 10) + r * 17.3) - 0.5) * s * 1.1
          + (vn1(N.wand, x / 38 + r * 5.1 + 99) - 0.5) * s * 0.9 + (hash(r, 4) - 0.5) * s * 0.3;
        const q = (w0 - yc - wan) * U;
        if (Math.abs(q) < Math.abs(dy)) { dy = q; br = r; sp = s * U; }
      }
      // thick and thin along its length, and broken off in long gaps
      const body = vn1(N.body, x / 6 + br * 7.7);
      const thick = sp > 5 ? (body > 0.42 ? 2 : 1) : sp > 3.6 && body > 0.68 ? 2 : 1;
      const gap = vn1(N.gap, x / (13 + hash(br, 5) * 12) + br * 5.3) < 0.3 - (body < 0.3 ? 0.06 : 0);
      const o = dy + thick / 2;                        // px down into this windrow
      if (!gap && o >= 0 && o < thick) {
        const lit = o < 1 && vn1(N.body, x / 4 + br * 3.1 + 50) > 0.36;
        G.set(px, py, straw[h][lit ? 3 : 2]);
      } else if (!gap && o >= thick && o < thick + 1) { G.shift(px, py, -1); G.tint(px, py, 2); }
      else { G.shift(px, py, 1); G.tint(px, py, 2); if (hash(px, py * 3 + 11) < 0.035) G.set(px, py, straw[h][2]); }
    }
  }
}

// a clump of grass close to the eye: world.js's fan of blades, each blade two
// pixels wide at the root (its far edge a tone down), one at the tip
const boldTuft = (put, bx, by, s, seed, cols) => {
  const n = 5 + Math.floor(hash(seed, 1) * 4);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => hash(seed, b + 60) - hash(seed, a + 60));
  for (const i of order) {
    const side = i / (n - 1), h1 = hash(seed, i + 2), h2 = hash(seed, i + 40);
    const lean = (side - 0.5) * 2.2 + (h1 - 0.5) * 0.6 + 0.22, mid = 1 - Math.abs(side - 0.5) * 1.1;
    const len = Math.max(4, Math.round((5 + h2 * 5 + mid * 5) * s));
    const ox = Math.round((i - (n - 1) / 2) * s * 1.2);
    const c = side < 0.5 ? cols : [cols[0], cols[0], cols[1], cols[2]];
    for (let k = 0; k < len; k++) {
      const f = k / (len - 1), ci = f < 0.18 ? 0 : f < 0.5 ? 1 : f < 0.84 ? 2 : 3;
      const X = bx + ox + Math.round(lean * (0.35 * f + 0.65 * f * f) * len * 0.6);
      put(X, by - k, c[ci]);
      if (f < 0.6) put(X + 1, by - k, c[Math.max(0, ci - 1)]);
    }
  }
};

// ---- sprites --------------------------------------------------------------
const pineS = (h, col) => bakeSprite(h * 0.6, h + 2, (c) => {
  c.fillStyle = "#4a3424"; c.fillRect(h * 0.3 - 0.6, h - 2, 1.2, 4);
  cone(c, h * 0.3, h * 0.36, h * 0.28, h * 0.62, col, { scallops: 3, sag: 1.2, hi: 0.4, lo: 0.5 });
  cone(c, h * 0.3, h * 0.12, h * 0.22, h * 0.5, col, { scallops: 3, sag: 1, hi: 0.45, lo: 0.45 });
  cone(c, h * 0.3, 0, h * 0.14, h * 0.34, col, { scallops: 2, sag: 0.8, hi: 0.5, lo: 0.4 });
});
const oakS = (r, col, seed) => bakeSprite(r * 2.6, r * 2.8, (c) => {
  c.fillStyle = "#5a3e28"; c.fillRect(r * 1.3 - r * 0.14, r * 1.6, r * 0.28, r * 1.2);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + seed, d = r * 0.5;
    blobBall(c, r * 1.3 + Math.cos(a) * d, r * 1.25 + Math.sin(a) * d * 0.7, r * 0.72, r * 0.64, col, seed * 10 + k, { hi: 0.55, lo: 0.6 });
  }
  blobBall(c, r * 1.2, r * 1.05, r * 0.8, r * 0.72, col, seed * 10 + 9, { hi: 0.6, lo: 0.55 });
});

// a haystack: a golden dome, lit from the upper left, shadow down-right
const hayS = () => bakeSprite(20, 14, (c) => {
  c.fillStyle = "rgba(42,28,44,0.35)"; c.beginPath(); c.ellipse(11, 12, 8, 1.8, 0, 0, Math.PI * 2); c.fill();
  blobBall(c, 9, 8, 7.4, 4.6, "#d8b860", 7, { hi: 0.6, lo: 0.5 });
  blobBall(c, 8.6, 5.2, 4.8, 3.4, "#e0c070", 8, { hi: 0.65, lo: 0.45 });
  c.fillStyle = "#a88a40"; for (const [x, y] of [[5, 9], [9, 10], [12, 8], [7, 6]]) c.fillRect(x, y, 1.6, 0.5);
});

// ---- the crown's castle ------------------------------------------------------
// The in-game castle (render/castle.js) seen from the front, looking up the
// hill at it: SQUARE towers with open, battlemented tops (merlons against the
// sky), corbelled parapets, small red-roofed stair turrets keeping a little red
// on the skyline, a tall keep behind, and the gatehouse with its portcullis.
// Ballista arms and a crewman's kettle hat peep between the merlons. What
// moves (flags, the gate's crown banners, torches, smoke, the sentry on the
// wall walk, birds) is drawn live by titleCrowd.js at the anchors in
// CASTLE_LIFE, never baked here.
const ST = "#aca494", ROOF = "#a8505c", STEEL = "#c4c8d0", OAK = "#7a5334";
// sprite size and anchor: the gate's sill (cx, G) sits at scene (360, 172)
const CS = { w: 132, h: 128, cx: 66, g: 124, x: 360, y: 172 };
const G = CS.g, CX = CS.cx, CURTAIN_GAP = 3.8;
// the gate passage: the portcullis hangs `raise` over the sill (a soldier
// walks under it), the passage runs `depth` up the picture to a lit courtyard
// opening `far` wide each side of centre
const PASS = { raise: 12.5, depth: 4, far: 3 };
const sx = (x) => CS.x - CS.cx + x, sy = (y) => CS.y - CS.g + y;   // sprite -> scene

// an arrow loop: a dark slit, a few with torchlight low inside
const slit = (c, x, y, h, lit = true) => part(c, (cc) => {
  cc.fillStyle = "#2a2230"; cc.fillRect(x - 0.9, y, 1.8, h);
  cc.fillRect(x - 0.4, y - 0.5, 0.8, 0.5);
  if (lit) { cc.fillStyle = "#e89a48"; cc.fillRect(x - 0.4, y + h * 0.45, 0.8, h * 0.4); cc.fillStyle = "#ffd070"; cc.fillRect(x - 0.4, y + h * 0.65, 0.8, h * 0.2); }
});

// merlons spread evenly across a parapet [x0, x1], tops `h` over `y`
const crenels = (x0, x1, mw = 4, gap = 2.6) => {
  const n = Math.max(2, Math.round((x1 - x0 - mw) / (mw + gap)) + 1);
  return { x0, x1, mw, step: (x1 - x0 - mw) / (n - 1), n };
};
const crenelRow = (c, cr, y, col, seed, h = 5) =>
  merlons(c, (cr.x0 + cr.x1) / 2, y, (cr.x1 - cr.x0) / 2, col, { step: cr.step, w: cr.mw, h, seed });

// a pyramid roof in shingle rows, the sunward half lit, a gold knop on top
const pyramid = (ctx, x, eave, hw, h, col) => {
  part(ctx, (c) => {
    c.fillStyle = lighten(col, 0.1);
    c.beginPath(); c.moveTo(x - hw, eave); c.lineTo(x, eave - h); c.lineTo(x + 0.3, eave); c.closePath(); c.fill();
    c.fillStyle = darken(col, 0.28);
    c.beginPath(); c.moveTo(x + 0.3, eave); c.lineTo(x, eave - h); c.lineTo(x + hw, eave); c.closePath(); c.fill();
    c.fillStyle = rgba(darken(col, 0.55), 0.55);
    for (let k = 1; k < 4; k++) { const y = eave - (h * k) / 4, w = hw * (1 - k / 4); c.fillRect(x - w, y, w * 2, 0.5); }
    c.fillStyle = rgba("#fff3d2", 0.35); c.fillRect(x - 0.6, eave - h + 1, 0.5, h - 1.5);
    c.fillStyle = darken(col, 0.5); c.fillRect(x - hw, eave - 0.6, hw * 2, 0.6);
  });
  part(ctx, (c) => ball(c, x, eave - h, 1.1, 1.1, "#d8b34a", { hi: 0.5, lo: 0.3 }));
};

// a square tower (or wall block) with a corbelled parapet and merlons;
// returns its crenel layout so things can peep between the merlons
const block = (c, x, top, w, bottom, col, seed, o = {}) => {
  const x0 = x - w / 2, lip = o.lip ?? 1.2, band = o.band ?? 5;
  ashlar(c, x0, top + band, w, bottom - top - band, col, seed, { course: 3.6, block: 5.5, moss: o.moss, r: 0.8, lo: 0.5 });
  // corbels under the jutting parapet
  if (lip > 0) part(c, (cc) => {
    for (let px = x0 + 1; px < x0 + w - 1; px += 3.2) {
      cc.fillStyle = darken(col, 0.35); cc.fillRect(px, top + band, 1.8, 1.6);
      cc.fillStyle = darken(col, 0.6); cc.fillRect(px, top + band + 1.6, 1.8, 0.6);
    }
  });
  ashlar(c, x0 - lip, top, w + lip * 2, band, lighten(col, 0.06), seed + 9, { course: 2.5, block: 5, r: 0.5, hi: 0.35 });
  const cr = crenels(x0 - lip, x0 + w + lip, 4, o.gap ?? 2.6);
  if (o.peep) o.peep(cr);
  crenelRow(c, cr, top + 0.5, lighten(col, 0.12), seed);
  return cr;
};

// a ballista standing on a gate tower's deck, facing us: the bow's arms
// and its bolt head showing over the merlons
const ballistaPeep = (c, x, y) => part(c, (cc) => {
  cc.strokeStyle = OAK; cc.lineWidth = 1.1; cc.lineCap = "round";
  cc.beginPath(); cc.moveTo(x - 5, y - 1.8); cc.quadraticCurveTo(x - 2.5, y + 0.6, x, y + 0.4); cc.quadraticCurveTo(x + 2.5, y + 0.6, x + 5, y - 1.8); cc.stroke();
  cc.strokeStyle = "#e8e0c8"; cc.lineWidth = 0.4;
  cc.beginPath(); cc.moveTo(x - 5, y - 1.8); cc.lineTo(x, y + 2); cc.lineTo(x + 5, y - 1.8); cc.stroke();
  cc.fillStyle = darken(OAK, 0.3); cc.fillRect(x - 1, y - 1.2, 2, 5);
  cc.fillStyle = STEEL; cc.beginPath(); cc.moveTo(x, y - 3.4); cc.lineTo(x + 1.3, y - 1.4); cc.lineTo(x, y + 0.2); cc.lineTo(x - 1.3, y - 1.4); cc.closePath(); cc.fill();
});
const kettleHat = (c, x, y) => part(c, (cc) => {
  ball(cc, x, y, 1.9, 1.5, STEEL, { hi: 0.5, lo: 0.45 });
  cc.fillStyle = darken(STEEL, 0.3); cc.fillRect(x - 2.6, y + 0.8, 5.2, 0.7);
});

// the layout, shared with the live layer
const L = {
  keep: [CX, G - 92, 34], keepTurret: [CX + 12, G - 106, 8], chimney: [CX + 1, G - 100],
  rear: [[CX - 33, G - 80, 14], [CX + 33, G - 80, 14]],
  corner: [[13, G - 70, 24], [119, G - 70, 24]], cornerTurret: [[21.5, G - 80, 7], [110.5, G - 80, 7]],
  curtain: [20, 112, G - 48], gateTower: [[CX - 16, G - 64, 12], [CX + 16, G - 64, 12]], gateWall: [CX, G - 56, 22],
  arch: [CX, G - 16, 8],
};

const castleS = () => bakeSprite(CS.w, CS.h, (c) => {
  const back = darken(ST, 0.1), rear = darken(ST, 0.2);
  // the keep: chimney and stair turret on its deck, then its body
  const [kx, kt, kw] = L.keep;
  part(c, (cc) => cylinder(cc, L.chimney[0] - 2, L.chimney[1], 4, kt - L.chimney[1] + 2, darken(ST, 0.05), { r: 0.5, hi: 0.35, lo: 0.5 }));
  part(c, (cc) => { cc.fillStyle = "#3a3038"; cc.fillRect(L.chimney[0] - 2.4, L.chimney[1] - 0.6, 4.8, 1.4); });
  const [tx, tt, tw] = L.keepTurret;
  ashlar(c, tx - tw / 2, tt, tw, kt - tt + 4, back, 31, { course: 3.2, block: 4, r: 0.5 });
  slit(c, tx, tt + 3.5, 4, false);
  pyramid(c, tx, tt + 0.5, tw / 2 + 1.4, 11, ROOF);
  // the royal standard's pole (its flag flies live)
  part(c, (cc) => cylinder(cc, kx - 10.8, G - 122, 1.4, 32, "#6a4a2e", { r: 0.6, hi: 0.3, lo: 0.5 }));
  block(c, kx, kt, kw, G - 30, back, 3, { lip: 1.4 });
  slit(c, kx - 7, kt + 13, 6); slit(c, kx + 7, kt + 13, 6, false);
  slit(c, kx, kt + 26, 7, false);
  // rear towers either side of the keep
  for (const [x, t, w] of L.rear) { block(c, x, t, w, G - 30, rear, 40 + x, { lip: 1 }); slit(c, x, t + 12, 5, x > CX); }
  // the corner towers' stair turrets, behind their parapets
  for (const [x, t, w] of L.cornerTurret) {
    ashlar(c, x - w / 2, t, w, 16, back, 50 + x, { course: 3.2, block: 4, r: 0.5 });
    pyramid(c, x, t + 0.5, w / 2 + 1.3, 10, ROOF);
  }
  // the curtain wall, its merlons against the keep's foot
  const [c0, c1, ct] = L.curtain;
  block(c, (c0 + c1) / 2, ct, c1 - c0, G, darken(ST, 0.07), 11, { lip: 0.8, moss: 0.5, gap: CURTAIN_GAP });
  // the gatehouse: the wall over the gate, then its two towers (ballistae up top)
  const [gx, gt, gw] = L.gateWall;
  block(c, gx, gt, gw, G, darken(ST, 0.04), 21, { lip: 1 });
  for (const [x, t, w] of L.gateTower) {
    block(c, x, t, w, G, ST, 60 + x, { lip: 1.4, moss: 0.6, peep: () => ballistaPeep(c, x, t - 4.2) });
    slit(c, x, t + 32, 6);
  }
  // the arch, its ring of voussoirs, the dark passage and the portcullis
  const [ax, ay, ar] = L.arch;
  part(c, (cc) => {
    cc.fillStyle = "#e0d8c4";
    cc.beginPath(); cc.moveTo(ax - ar - 2, G); cc.lineTo(ax - ar - 2, ay); cc.arc(ax, ay, ar + 2, Math.PI, 0); cc.lineTo(ax + ar + 2, G); cc.closePath(); cc.fill();
    cc.fillStyle = darken(ST, 0.45);
    for (let k = 0; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI; cc.fillRect(ax + Math.cos(a) * (ar + 1) - 0.25, ay + Math.sin(a) * (ar + 1) - 0.25, 0.5, 0.5); }
    cc.fillStyle = "#1e1822";
    cc.beginPath(); cc.moveTo(ax - ar, G); cc.lineTo(ax - ar, ay); cc.arc(ax, ay, ar, Math.PI, 0); cc.lineTo(ax + ar, G); cc.closePath(); cc.fill();
    // down the passage: its floor running in to the courtyard, lit by the
    // morning at the far end
    const fw = PASS.far, fy = G - PASS.depth;
    cc.fillStyle = "#2e2428"; cc.fillRect(ax - ar + 1.2, fy - 7, 1.2, 7); cc.fillRect(ax + ar - 2.4, fy - 7, 1.2, 7);
    cc.fillStyle = "#5a4642"; cc.fillRect(ax - fw, fy - 5, fw * 2, 5);                 // the courtyard's far wall
    cc.fillStyle = "#7a6052"; cc.fillRect(ax - fw, fy - 5, fw * 0.8, 5);
    cc.fillStyle = "#e8b878"; cc.fillRect(ax - fw, fy - 1.5, fw * 2, 1.5);             // sunlit flags
    cc.fillStyle = "#ffe0a0"; cc.fillRect(ax - fw, fy - 1.5, fw, 0.5);
    cc.fillStyle = "#3a2e30";
    cc.beginPath(); cc.moveTo(ax - ar, G); cc.lineTo(ax - fw, fy); cc.lineTo(ax + fw, fy); cc.lineTo(ax + ar, G); cc.closePath(); cc.fill();
    cc.fillStyle = "#5a4640";
    for (let k = 1; k < 4; k++) { const t = k / 4, y = fy + (G - fy) * t, w = fw + (ar - fw) * t; cc.fillRect(ax - w, y, w * 2, 0.5); }
    cc.fillStyle = rgba("#e8b878", 0.35); cc.fillRect(ax - fw, fy, fw * 2, 1);
  });
  // the portcullis, raised to a man's height over the sill: bars, cross
  // bands, iron teeth along its foot, and the chains it hangs from
  part(c, (cc) => {
    const pb = G - PASS.raise;
    cc.save(); cc.beginPath(); cc.moveTo(ax - ar, pb); cc.lineTo(ax - ar, ay); cc.arc(ax, ay, ar, Math.PI, 0); cc.lineTo(ax + ar, pb); cc.closePath(); cc.clip();
    for (let px = ax - ar + 1.6; px < ax + ar; px += 2.6) { cc.fillStyle = "#3e424c"; cc.fillRect(px - 0.5, ay - ar, 1, pb - ay + ar); cc.fillStyle = "#6a707c"; cc.fillRect(px - 0.5, ay - ar, 0.5, pb - ay + ar); }
    for (let py = ay - ar + 2; py < pb - 1; py += 2.8) { cc.fillStyle = "#4a4e5a"; cc.fillRect(ax - ar, py, ar * 2, 0.8); }
    cc.fillStyle = "#34363e"; cc.fillRect(ax - ar, pb - 1.2, ar * 2, 1.2);
    cc.restore();
    for (let px = ax - ar + 1.6; px < ax + ar; px += 2.6) {
      cc.fillStyle = "#8a909c";
      cc.beginPath(); cc.moveTo(px - 0.7, pb); cc.lineTo(px + 0.7, pb); cc.lineTo(px, pb + 1.6); cc.closePath(); cc.fill();
    }
    for (const x of [ax - ar + 0.6, ax + ar - 0.6]) for (let y = ay - ar + 3; y < pb - 1; y += 1.4) { cc.fillStyle = y % 2.8 < 1.4 ? "#8a909c" : "#4a4e5a"; cc.fillRect(x - 0.4, y, 0.8, 1); }
  });
  // torches at the gate (their flames burn live)
  for (const x of [ax - ar - 3.6, ax + ar + 3.6]) torchBracket(c, x, G - 17);
  // the corner towers, a crewman's hat between the merlons of one
  for (const [x, t, w] of L.corner) {
    block(c, x, t, w, G, ST, 70 + x, { lip: 1.6, moss: 0.8, peep: (cr) => { if (x > CX) kettleHat(c, cr.x0 + cr.mw + cr.step * 1 + (cr.step - cr.mw) / 2, t - 2.6); } });
    slit(c, x, t + 16, 7, false); slit(c, x, t + 38, 7, x < CX);
  }
  // the footing course the whole castle stands on, broken by the gate
  footing(c, (1 + ax - ar - 2) / 2, G, (ax - ar - 2 - 1) / 2 - 2, darken(ST, 0.14), 5, 4.5);
  footing(c, (ax + ar + 2 + 131) / 2, G, (131 - ax - ar - 2) / 2 - 2, darken(ST, 0.14), 9, 4.5);
});

// Where the live bits go, in scene units (see titleCrowd.js).
const curtainCr = crenels(L.curtain[0] - 0.8, L.curtain[1] + 0.8, 4, CURTAIN_GAP);
export const CASTLE_LIFE = {
  gate: [CS.x, CS.y],
  // the gate's opening under the raised portcullis, and the passage floor's
  // far end: walkers going in are clipped to this and fade into the dark
  passage: { x0: sx(L.arch[0] - L.arch[2]), x1: sx(L.arch[0] + L.arch[2]), top: sy(G - PASS.raise + 1.4), sill: CS.y, far: sy(G - PASS.depth) },
  standard: [sx(L.keep[0] - 10.1), sy(G - 121)],                       // the royal standard, top of its pole
  pennants: [...L.cornerTurret.map(([x, t]) => [sx(x), sy(t - 10.3)]), [sx(L.keepTurret[0]), sy(L.keepTurret[1] - 11.3)]],
  banners: L.gateTower.map(([x, t]) => [sx(x), sy(t + 7.4)]),            // the crown banners on the gate towers
  torches: [sx(L.arch[0] - L.arch[2] - 3.6), sx(L.arch[0] + L.arch[2] + 3.6)].map((x) => [x, sy(G - 22.8)]),
  chimney: [sx(L.chimney[0]), sy(L.chimney[1] - 0.5)],
  // the wall walk: the sentry walks [x0, x1] with his feet hidden behind
  // the parapet top at `y`; he shows only in the gaps between merlons
  walk: {
    x0: sx(L.corner[0][0] + 15), x1: sx(L.gateTower[0][0] - 8.5), y: sy(L.curtain[2] + 0.5), top: sy(L.curtain[2] + 0.5 - 5),
    gaps: Array.from({ length: curtainCr.n - 1 }, (_, i) => [sx(curtainCr.x0 + i * curtainCr.step + curtainCr.mw), sx(curtainCr.x0 + (i + 1) * curtainCr.step)]),
  },
  // merlon tops where birds settle
  perches: [
    [sx(L.corner[0][0] - 11.6), sy(L.corner[0][1] - 4.6)], [sx(L.corner[1][0] + 11.6), sy(L.corner[1][1] - 4.6)],
    [sx(L.gateTower[1][0] + 5.4), sy(L.gateTower[1][1] - 4.6)], [sx(L.keep[0] - 16.4), sy(L.keep[1] - 4.6)],
  ],
};

// The threshold: setts laid in rows, fanning from the gate's sill down into
// the dirt road, with a darker kerb of edge stones.
const THRESHOLD = [[349, 171.2], [371, 171.2], [371.5, 173.6], [366, 177], [356, 181.5], [348, 184], [343, 183], [343.5, 179.5], [347.5, 175]];
function paintThreshold(c) {
  const edge = () => { c.beginPath(); THRESHOLD.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
  c.save(); edge(); c.clip();
  c.fillStyle = "#6e6454"; c.fillRect(330, 168, 50, 20);
  for (let row = 0, y = 171.2; y < 185; row++, y += 1.5) {
    for (let x = 340 + (row % 2) * 1.3, k = 0; x < 376; x += 2.6, k++) {
      const t = hash(row * 31 + k, 7);
      c.fillStyle = t < 0.3 ? "#a89e88" : t > 0.75 ? "#d0c8b2" : "#bdb39c";
      c.fillRect(x, y, 2.1, 1.05);
      c.fillStyle = "#e4dcc8"; c.fillRect(x, y, 1.6, 0.35);
    }
  }
  c.restore();
  edge(); c.strokeStyle = "#8a806c"; c.lineWidth = 0.9; c.stroke();
}
// The bank: soil and a lip of turf along the castle's foot (not across the
// threshold), tufts leaning on the stones, rubble at the corners. Its turf
// takes the ground's colours (`pal`; its turf and lip may be a colour, or
// one per x); the app icon (icon-lab.html) paints it on its own hill in the
// colours it was drawn with.
const BANK = { soil: "#5a4430", turf: "#86ba56", lip: "#a4d070", tuftDk: "#3f6e2e", tuftLt: "#8ac050", stone: "#8e8878" };
function paintBank(c, pal = BANK) {
  const x0 = sx(0), x1 = sx(CS.w), gy = CS.y;
  for (let x = x0 - 2; x < x1 + 2; x += 0.5) {
    if (x > 347 && x < 373) continue;
    const top = gy - 0.6 - (hash(Math.floor(x * 2), 3) > 0.75 ? 0.5 : 0) - Math.max(0, Math.sin(x / 7)) * 0.6;
    c.fillStyle = pal.soil; c.fillRect(x, top - 0.5, 0.5, 0.5);
    c.fillStyle = typeof pal.turf === "function" ? pal.turf(x) : pal.turf; c.fillRect(x, top, 0.5, gy + 3 - top);
    c.fillStyle = typeof pal.lip === "function" ? pal.lip(x) : pal.lip; c.fillRect(x, top, 0.5, 0.5);
  }
  for (let k = 0; k < 12; k++) {
    const x = x0 + 2 + hash(k, 21) * (CS.w - 4);
    if (x > 344 && x < 376) continue;
    tuft(c, x, gy + 1 + hash(k, 22), 0.35 + hash(k, 23) * 0.25, pal.tuftDk, pal.tuftLt, k + 90, { n: 3 });
  }
  for (const [x, y, r] of [[x0 + 1, gy + 1.2, 1.6], [x0 + 4, gy + 2, 1.1], [x1 - 2, gy + 1.4, 1.7], [x1 - 5.5, gy + 2.2, 1], [344.5, gy + 1, 1.2], [375.5, gy + 1.2, 1.3], [377.5, gy + 2.2, 0.8]]) {
    blobBall(c, x, y, r, r * 0.75, pal.stone, Math.round(x * 3), { hi: 0.45, lo: 0.5 });
  }
}

// The castle's hill: it rises to a level top under the castle, so the castle
// stands IN the ground rather than on the slope.
const hillTop = (x) => Math.min(
  200 + Math.sin(x / 30) * 3 - 30 * Math.exp(-(((x - 360) / 78) ** 2)),
  170.5 + Math.max(0, Math.abs(x - 362) - 70) ** 2 * 0.05);

// the woods closing in on both sides: [x, y (the trunk's foot), seed, the
// canopy's half-width, pine?, how near (0-1)], far to near
const woodsList = () => {
  const woods = [];
  for (let k = 0; k < 26; k++) {
    const left = k < 16, x = left ? -10 + hash(k, 7) * 120 : 400 + hash(k, 7) * 90, y = 196 + hash(k, 8) * 70;
    if (!left && x < 420 && y < 220) continue;
    const near = (y - 196) / 70, pine = hash(k, 9) < 0.45;
    woods.push([x, y, k, pine ? Math.round(22 + near * 30) * 0.3 : Math.round(10 + near * 14) * 1.15, pine, near]);
  }
  return woods.sort((a, b) => a[1] - b[1]);
};

// ---- the scene -------------------------------------------------------------
// Painted in stages, like the map, so it can be spread over a few frames.
let VISTA = null;
export function titleVista() {
  if (VISTA) return VISTA;
  const g = paintVista();
  let r;
  do r = g.next(); while (!r.done);
  return (VISTA = r.value);
}
export function titleVistaAsync(done) {
  if (VISTA) { done(VISTA); return () => {}; }
  const g = paintVista();
  let alive = true;
  const step = () => {
    if (!alive) return;
    if (VISTA) { done(VISTA); return; }
    const r = g.next();
    if (r.done) { VISTA = r.value; done(VISTA); } else setTimeout(step, 0);
  };
  setTimeout(step, 0);
  return () => { alive = false; };
}
function* paintVista() {
  const cv = mk(VW, VH), ctx = cv.getContext("2d", RF);
  ctx.imageSmoothingEnabled = false;
  paintSky(ctx);
  yield "sky";
  paintClouds(ctx);
  yield "clouds";
  // far snowy range, then a nearer blue one
  paintRange(ctx, [[20, 120, 0.9], [78, 104, 0.8], [150, 126, 0.85], [212, 96, 0.75], [276, 118, 0.9], [330, 100, 0.8], [402, 112, 0.85], [470, 98, 0.8]],
    180, ["#8c86b8", "#6e6a9c", "#5a5688", "#f4dce0", "#b8a8c8"], 10);
  paintRange(ctx, [[0, 150, 0.6], [60, 140, 0.55], [128, 152, 0.6], [196, 138, 0.5], [262, 150, 0.6], [318, 142, 0.5], [390, 148, 0.55], [456, 140, 0.5]],
    190, ["#6a7aa0", "#56648a", "#48547a"]);
  yield "ranges";
  // the far ridge: the same meadow a long way off, hazy, with a line of pines
  const farTop = (x) => 168 + Math.sin(x / 40) * 5 + Math.sin(x / 17 + 1) * 2;
  yield* paintFarHills(ctx, farTop, hillTop);
  const farPine = pineS(10, "#44685a");
  for (let x = -4; x < SW; x += 5 + hash(x, 1) * 5) {
    const y = farTop(x) + 3;
    if (hash(x, 2) < 0.35) continue;
    ctx.drawImage(farPine, Math.round((x - 3) * U), Math.round((y - 11) * U));
  }
  yield "farms, pines";
  // the castle's hill and the near meadow (hillTop, above)
  const trees = woodsList();
  // shade: the castle's at its foot and each tree's, thrown down-right (the
  // meadow asks a row at a time, so only the trees near that row are tried).
  // Where the woods stand deep, their shade is the wood's floor (a hem at
  // their feet, as the board's woods have); a tree out on the hill's brow
  // throws only a shadow on the grass (`deepShade`, the share of the last
  // point's shade thrown by deep trees)
  const deep = new Set(trees.filter(([tx, ty]) => ty - hillTop(tx) > 7).map((t) => t[2]));
  let rowY0 = NaN, rowTrees = trees, deepShade = 0;
  const treeShade = (x, y) => {
    if (y !== rowY0) { rowY0 = y; rowTrees = trees.filter(([, ty, , r]) => Math.abs(y - ty - 0.8) <= r * 0.75); }
    let v = 0;
    deepShade = 0;
    for (const [tx, ty, k, r] of rowTrees) {
      if (Math.abs(x - tx - r * 0.45) > r * 2.6 || Math.abs(y - ty - 0.8) > r * 0.75) continue;
      const dx = (x - tx - r * 0.45) / (r * 1.25), dy = (y - ty - 0.8) / (r * 0.34), q = dx * dx + dy * dy;
      if (q < 4) { const e = 0.24 * Math.exp(-q * 1.3); v -= e; if (deep.has(k)) deepShade -= e; }
    }
    return v;
  };
  const castleShade = (x, y) => { const q = ((x - 370) / 74) ** 2 + ((y - 173.5) / 4.2) ** 2; return q < 3 ? -0.3 * Math.exp(-q * 1.4) : 0; };
  const flank = (x) => Math.max(-0.6, Math.min(0.6, -(hillTop(x + 3) - hillTop(x - 3)) / 6 * 1.4));
  // the ground the castle stands on: no lit brow and no lift of the flanks
  // there, so nothing lightens its contact shadow
  const foot = (x) => x > 292 && x < 428;
  const footness = (x) => ease01((x - 290) / 12) * ease01((430 - x) / 12);
  // how far onto the hill's east shoulder, past the castle
  const east = (x) => ease01((x - 412) / 24);
  const G = groundBuf(ctx);
  const field = yield* paintMeadow(G, hillTop, {
    tag: "near meadow", seed: 5, split: true,
    shade: (x, y) => treeShade(x, y) + castleShade(x, y),
    // the hill's flanks: lit toward the low sun on the west, falling into
    // shade past the castle on the east (darker there, and kept clear of
    // the haze, so its shoulder stands against the pale ridge behind)
    lift: (x, y) => (y < 178 ? 1 - footness(x) : 1) * flank(x) * (flank(x) < 0 ? 0.7 : 0.28) * Math.exp(-(y - hillTop(x)) / 22),
    form: (x, y) => flank(x) * 1.6 * Math.exp(-(y - hillTop(x)) / 26),
    warm: (x) => (0.5 - x / SW) * 0.35,
    haze: (x, y) => hazeOf(y) - east(x) * Math.max(0, Math.min(1, (206 - y) / 16)) * 0.75,
    floor: (sh, x, y) => -deepShade + castleShade(x, y) - 0.2,
    // the brow's lit lip along the hill's sunward outline, but not under the
    // walls; on the east shoulder, falling into shade, a plain edge
    lip: (x) => (foot(x) ? -9 : flank(x) < -0.05 ? 1 : 2.4),
    rim: (x) => (flank(x) < -0.05 ? 0 : 5),
  });
  // the castle's contact shadow: a band of the ramp's own shade (two tones
  // down, cool) thrown down-right under the whole footing, frayed in the
  // blades; the bank's turf lip lies over its upper edge
  for (let py = 169 * U; py < 181 * U; py++) {
    const y = (py + 0.5) / U;
    for (let px = 290 * U; px < 440 * U; px++) {
      const x = (px + 0.5) / U, q = ((x - 365) / 73) ** 2 + ((y - 174.4) / 5) ** 2 + (dith(px, py) - 0.5) * 0.36 + Math.max(0, x - 427) * 0.04;
      const i = py * VW + px, rg = G.reg[i];
      if (q >= 1 || (rg !== 1 && rg !== 2)) continue;
      G.lay(i, rg, Math.max(0, Math.min(G.tone[i], 3) - (q < 0.6 ? 2 : 1)), 0, G.hz[i]);
    }
  }
  yield "near meadow pixels, east; contact shadow";
  // the road up to the gate, wider as it nears
  yield* paintRoadPx(G);
  yield "road, near half";
  paintHayField(G);
  yield "hay meadow";
  paintTurfDetail(G, field, trees);
  paintRoadDetail(G);
  G.flush();
  // a haystack in the field, forked up by the militiaman who works it
  ctx.drawImage(hayS(), Math.round((HAY[0] - 9) * U), Math.round((HAY[1] - 12) * U));
  yield "turf and road detail, haystack";
  const castle = castleS();
  ctx.drawImage(castle, Math.round(sx(0) * U), Math.round(sy(0) * U));
  yield "castle";
  // bedding it in: the cobbled threshold running up into the gate, an earth
  // bank over the footing's foot, grass and a little rubble creeping on it
  layerAt(ctx, 334, 164, 46, 26, paintThreshold, 1);
  // (the bank's turf in the contact shadow's deepest tone, so the shadow
  // runs up to the footing; its lip a step up. The shadow falls down-right,
  // so at the west corner the bank steps up into the lit brow beside it)
  const gp = groundPal(), mc = (tn, tp) => hex(gp.meadow[1][tn * 3 + tp]);
  const west = (x) => (x < 293.5 ? 2 : x < 296 ? 1 : 0);
  layerAt(ctx, 284, 156, 152, 28, (c) => paintBank(c, {
    soil: "#57402e", turf: (x) => mc(west(x), west(x) > 1 ? 1 : 0), lip: (x) => mc(west(x) + 1, west(x) > 1 ? 2 : 0),
    tuftDk: hex(gp.tuft[1][0]), tuftLt: hex(gp.tuft[1][2]), stone: "#8e8878",
  }));
  // woods closing in on both sides, darker toward the viewer; each tree
  // marks the pixels it covers with its foot's row (`occ`), so the grass and
  // flowers laid on after never grow over a tree that stands nearer
  const occ = new Int16Array(VW * VH);
  // (each sprite is copied once onto a CPU canvas and read there: one
  // readback per tree, not one to draw it and another to read it)
  const stand = (s0, ox, oy, footY) => {
    const s = mk(s0.width, s0.height), sc = s.getContext("2d", RF);
    sc.drawImage(s0, 0, 0);
    ctx.drawImage(s, ox, oy);
    const a = sc.getImageData(0, 0, s.width, s.height).data;
    for (let j = 0; j < s.height; j++) {
      const Y = oy + j;
      if (Y < 0 || Y >= VH) continue;
      for (let i = 0; i < s.width; i++) {
        const X = ox + i;
        if (X >= 0 && X < VW && a[(j * s.width + i) * 4 + 3] > 127) occ[Y * VW + X] = footY;
      }
    }
  };
  for (const [x, y, k, , pine, near] of trees) {
    if (pine) {
      const h = Math.round(22 + near * 30), s = pineS(h, near > 0.5 ? "#2f5a3c" : "#3a6a44");
      stand(s, Math.round((x - h * 0.3) * U), Math.round((y - h) * U), Math.round(y * U));
    } else {
      const r = Math.round(10 + near * 14), s = oakS(r, near > 0.5 ? "#3f7a34" : "#4f8a3e", k);
      stand(s, Math.round((x - r * 1.3) * U), Math.round((y - r * 2.6) * U), Math.round(y * U));
    }
  }
  yield "threshold, bank, woods";
  // the foreground: grass close to the eye, and a few tall flowers
  // (never on the road, where the walkers go)
  {
    const F = groundBuf(ctx), P = F.P;
    // is a nearer tree standing on this pixel, for a thing rooted at row `by`?
    const behind = (a, b, by) => a >= 0 && b >= 0 && a < VW && b < VH && occ[b * VW + a] > by;
    const rooted = (by) => ({
      ...F,
      set: (a, b, c) => { if (!behind(a, b, by)) F.set(a, b, c); },
      shift: (a, b, dt) => { if (!behind(a, b, by)) F.shift(a, b, dt); },
      dim: (a, b, f) => { if (!behind(a, b, by)) F.dim(a, b, f); },
    });
    for (let k = 0; k < 60; k++) {
      const x = hash(k, 11) * SW, y = 238 + hash(k, 12) * 34;
      if (offRoad(x, y) < 3) continue;
      const s = 1 + ((y - 238) / 34) * 0.8 + hash(k, 13) * 0.35, bx = Math.round(x * U), by = Math.round(y * U);
      if (behind(bx, by, by)) continue;
      const R = rooted(by);
      for (let i = -3; i <= 5; i++) R.dim(bx + i, by + 1, 0.85);
      boldTuft(R.set, bx, by, s, k + 900, k % 4 === 0 ? P.tuftDk[0] : k % 5 === 0 ? P.tuftLt[0] : P.tuft[0]);
    }
    for (let k = 0; k < 18; k++) {
      const x = hash(k, 14) * SW, y = 244 + hash(k, 15) * 24;
      const px = Math.round(x * U), py = Math.round(y * U);
      if (offRoad(x, y) < 3 || behind(px, py, py)) continue;
      wildflower(rooted(py), px, py, ["#f2ead4", "#e0c070", "#d88aa0", "#b08ad8"][k % 4], 1, P.stem[0], k + 40);
    }
    F.flush();
  }
  // birds, heading home
  ctx.fillStyle = "#2a2440";
  for (const [x, y] of [[196, 62], [206, 68], [188, 72], [214, 58]]) {
    ctx.fillRect(x * U - 3, y * U, 3, 1); ctx.fillRect(x * U, y * U - 1, 1, 1); ctx.fillRect(x * U + 1, y * U, 3, 1);
  }
  return cv;
}

// For the app icon (icon-lab.html), which paints this same castle, its
// threshold and its bank at its own size and density.
export { castleS as castleSprite, CS as CASTLE_SPR, paintThreshold, paintBank };
// For the title lab (title-lab.html): the stages, to time each one.
export { paintVista as vistaStages };
