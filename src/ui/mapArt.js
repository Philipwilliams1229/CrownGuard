// ============ CAMPAIGN MAP ART ============
// The continent, painted once as pixel art: sea and shallows, inked coasts
// with a cliff lip on their southern faces, three countries that look like
// three countries (the green vale, the grey-blue Marches, the drowned purple
// fen), and the dressing that tells them apart. Everything is laid out in the
// map's own 850x1160 unit space (y from -640 to 520) and baked at U art pixels
// per unit — the same density as the board. The markers, the gold of the
// walked road and the fog over sealed countries go on a second, cheap layer
// that is redrawn whenever progress changes (see drawMapState).

import { CHAPTERS, LEVELS as ALL_LEVELS, isUnlocked } from "../data/campaign.js";
import { MAX_STARS } from "../data/profile.js";
import { hash, darken, rgb, ball, blobBall, cone, inkOutline } from "../render/paint.js";
import { canvasFont, typeEpoch } from "./fonts.js";

export const U = 2;                         // art pixels per map unit
export const MAP = { x: 0, y: -640, w: 850, h: 1160 };
export const AW = MAP.w * U, AH = MAP.h * U; // art size
const INK = "#241a26";
// the levels that have a waypoint (mapLayout.js LEVEL_POS); one not placed
// yet is left off the map, and the road runs on past it
export const LEVELS = ALL_LEVELS.filter((l) => l.pos);
// these canvases are read back pixel by pixel, so keep them on the CPU
const RF = { willReadFrequently: true };

// ---- noise -----------------------------------------------------------
const smooth = (t) => t * t * (3 - 2 * t);
const vnoise = (x, y, s, seed) => {
  const gx = x / s, gy = y / s, ix = Math.floor(gx), iy = Math.floor(gy);
  const fx = smooth(gx - ix), fy = smooth(gy - iy), k = seed * 1013;
  const a = hash(ix + k, iy), b = hash(ix + 1 + k, iy), c = hash(ix + k, iy + 1), d = hash(ix + 1 + k, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
export const fbm = (x, y, s, seed) =>
  vnoise(x, y, s, seed) * 0.55 + vnoise(x, y, s / 2, seed + 1) * 0.28 + vnoise(x, y, s / 4, seed + 2) * 0.17;
// 4x4 ordered dither, 0..1
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// ---- the land --------------------------------------------------------
// The isthmus (the only land road from the vale into the Marches) and a few
// islets of no account, on top of the three chapters' own coastlines.
const ISTHMUS = "M270,156 C315,146 360,179 394,208 C425,241 421,291 385,301 C351,311 307,284 288,254 C262,216 255,170 270,156 Z";
const ISLES = [
  // the lighthouse isle off the north-west headland
  "M21,-118 C14,-131 27,-141 41,-138 C55,-135 58,-121 48,-111 C38,-104 24,-107 21,-118 Z",
  // a skerry in the strait under the fen's north-west shore
  "M363,-272 C360,-285 374,-292 384,-288 C395,-285 395,-271 384,-264 C374,-260 367,-264 363,-272 Z",
  // a little isle between the vale's south-east lobe and the isthmus
  "M350,383 C347,373 357,368 366,371 C374,376 371,387 362,390 C355,392 352,388 350,383 Z",
  // a longer isle out in the western sea
  "M104,-150 C98,-164 116,-176 136,-172 C158,-168 172,-160 168,-148 C164,-136 142,-132 124,-136 C112,-139 106,-142 104,-150 Z",
];
// zone ids: 0-2 the chapters, 3 the isthmus (a mountain wall), 4 the islets
// The set pieces stand on land the coast may not eat: [zone, [x, y]].
const SET = { castle: [143, 323], citadel: [690, 116], ruin: [686, -152], jarl: [550, -578] };
// broad sandy strands on the vale's coast: [x, y, radius]
const SANDS = [[298, 362, 30]];
const SET_LAND = [[0, SET.castle], [1, SET.citadel], [2, SET.ruin], [5, SET.jarl]];
// (a chapter after the first three — the Rimewater — comes after the
// isthmus and the islets, so their ids 3 and 4 never move: zone 5 is it)
// The Rimewater's own isles, skerries and holms ride with its zone (painted in
// its snow, not the green islets'): [x, y, rx, ry, seed], a noisy blob each
// (not written as a lake's `{ x, y, rx }`: check-map-water.mjs reads those).
const RIME_ISLES = [
  [238, -452, 15, 9, 1],    // the Wolf Holm, off the Wolfsound's mouth
  [252, -566, 10, 7, 2],    // a holm off the north-west cape
  [630, -301, 6.5, 4.5, 3], // the Skerry Way's skerries
  [659, -298, 5.5, 4, 4],
  [829, -440, 8, 11, 5],    // the eastern holms
  [834, -404, 5.5, 5, 6],
  [742, -300, 6, 4, 7],     // a holm off Frostwake Strand
];
const blobPath = ([x, y, rx, ry, seed]) => {
  let d = "";
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, k = 0.8 + hash(seed * 31 + i, 77) * 0.35;
    d += `${i ? "L" : "M"}${(x + Math.cos(a) * rx * k).toFixed(1)},${(y + Math.sin(a) * ry * k).toFixed(1)} `;
  }
  return d + "Z";
};
export const ZONES = [...CHAPTERS.slice(0, 3).map((c) => c.region), ISTHMUS, ISLES,
  ...CHAPTERS.slice(3).map((c) => (c.id === "rime" ? [c.region, ...RIME_ISLES.map(blobPath)] : c.region))];
// a chapter's zone id (the isthmus and the islets sit between the third
// chapter and the fourth)
const zoneOfChapter = (k) => (k < 3 ? k : k + 2);
const RZ = 5;   // the Rimewater's zone

const toArt = (c) => { c.setTransform(U, 0, 0, U, -MAP.x * U, -MAP.y * U); c.imageSmoothingEnabled = false; };
const mk = (w = AW, h = AH) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; return cv; };

// separable box blur of a float field, in place-ish
const blur = (src, w, h, r) => {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / n;
      s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / n;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
};

// chamfer distance (in art px) from every pixel to the nearest set pixel,
// carrying the id of that pixel along
const distance = (set, id, w, h) => {
  const D = new Float32Array(w * h), L = new Int8Array(w * h);
  for (let i = 0; i < w * h; i++) { D[i] = set[i] ? 0 : 1e9; L[i] = set[i] ? id[i] : -1; }
  const relax = (i, j, c) => { if (D[j] + c < D[i]) { D[i] = D[j] + c; L[i] = L[j]; } };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (x > 0) relax(i, i - 1, 1);
    if (y > 0) { relax(i, i - w, 1); if (x > 0) relax(i, i - w - 1, 1.414); if (x < w - 1) relax(i, i - w + 1, 1.414); }
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (x < w - 1) relax(i, i + 1, 1);
    if (y < h - 1) { relax(i, i + w, 1); if (x < w - 1) relax(i, i + w + 1, 1.414); if (x > 0) relax(i, i + w - 1, 1.414); }
  }
  return { D, L };
};

// ---- palettes --------------------------------------------------------
const SEA = { deep: "#2a4a6a", mid: "#33597a", shal: "#437590", reef: "#5a93a6", foam: "#e4eee0", swell: "#4a7898" };
export const BIOME = [
  // Greenwood Vale: warm rolling green
  { lo: "#6a9a48", mid: "#82b256", hi: "#9cc462", alt: "#94b65a", cliff: ["#b08a58", "#8a6640", "#654a32"], sand: "#e6d49a" },
  // the Iron Marches: cool highland moor, grey-green turf and heather-brown
  // (the ground itself is painted by moorPx below, from MOOR)
  { lo: "#566250", mid: "#6e7a5e", hi: "#879270", alt: "#6e5850", cliff: ["#9a948c", "#76716c", "#55504f"], sand: "#b8b098" },
  // the Hollowfen: black-green bog and olive moss under a cold moon, with a
  // violet cast in its shadows (painted by fenPx below, from FEN_GROUND)
  { lo: "#2c332f", mid: "#3a453b", hi: "#4c5847", alt: "#443c50", cliff: ["#6a6668", "#4e4a52", "#36323c"], sand: "#6e6a70" },
  // the isthmus: stony upland between the two
  { lo: "#6c7c5a", mid: "#7c8c66", hi: "#929c78", alt: "#8a8a70", cliff: ["#9a8c78", "#76695a", "#554a40"], sand: "#d4c498" },
  // the islets
  { lo: "#5f7a48", mid: "#7ea05a", hi: "#a0bc70", alt: "#8aa060", cliff: ["#a89478", "#80705a", "#5a4c40"], sand: "#e2d29a" },
  // the Rimewater: snowfield and blue ice over black rock (a first pass)
  { lo: "#b8c8d2", mid: "#d2dee6", hi: "#eef4f8", alt: "#a8bcc8", cliff: ["#7e8a94", "#5c6670", "#3e464e"], sand: "#c8ccc4" },
];

// The Marches' moor, three kinds of ground banded by the hill shading (lo,
// mid, hi): grey-green turf, heather-brown on the high moor, greener pasture
// in the low country; bracken in rusty drifts, heather in flower, and grey
// stones breaking the turf.
const MOOR = {
  turf: ["#5c6852", "#76825f", "#8e9a72"].map(rgb),
  heath: ["#5e4e48", "#76625a", "#8e7866"].map(rgb),
  grass: ["#627050", "#7a8a56", "#94a266"].map(rgb),
  bracken: ["#665438", "#7c6844", "#927c52"].map(rgb),
  bloom: rgb("#8a5c6c"), stoneLt: rgb("#b0ab9e"), stoneDk: rgb("#57534e"), tuft: rgb("#4a5444"),
};
const moorPx = (x, y, band) => {
  const t = band < 0.27 ? 0 : band > 0.75 ? 2 : 1, b = bayer(x, y) * 0.05;
  const heath = fbm(x, y, 40, 22);
  let pal = heath > 0.6 + b ? MOOR.heath : heath < 0.42 - b ? MOOR.grass : MOOR.turf;
  if (pal !== MOOR.heath && vnoise(x, y, 26, 23) > 0.8 + b) pal = MOOR.bracken;
  // speckle on a 2x2 grain: a stone (lit top, dark foot), a flower, a tuft
  const bx = x >> 1, by = y >> 1, r = hash(bx * 3 + 7, by * 5 + 11);
  if (r < 0.018) return (y & 1) ? MOOR.stoneDk : MOOR.stoneLt;
  if (pal === MOOR.heath && r < 0.075 && !(x & 1)) return MOOR.bloom;
  if (r > 0.95 && (y & 1)) return pal === MOOR.heath ? MOOR.heath[0] : MOOR.tuft;
  return pal[t];
};

// The fen: sodden black-green bog, hummocks of olive moss and violet-dark
// heath, flecked with bog cotton, rusty sphagnum and dark tussocks.
const FEN_GROUND = {
  bog: ["#303832", "#3e4a3e", "#4e5a48"].map(rgb),
  moss: ["#414a35", "#52603e", "#667048"].map(rgb),
  heath: ["#342f3c", "#423c4e", "#524a60"].map(rgb),
  cotton: rgb("#d8d8c8"), cottonDk: rgb("#8a8c7e"), rust: rgb("#6e5038"), tuft: rgb("#232a26"),
};
// The barrow downs on the fen's north shore stand above the bog: drier,
// mossier ground and almost no standing water (1 at their heart, 0 off them).
// (not written as a lake's `{ x, y, rx }`: check-map-water.mjs reads those)
const DOWNS = { cx: 566, cy: -258, rx: 132, ry: 40 };
const downsAt = (ax, ay) => {
  const dx = (ax / U + MAP.x - DOWNS.cx) / DOWNS.rx, dy = (ay / U + MAP.y - DOWNS.cy) / DOWNS.ry, e = dx * dx + dy * dy;
  return e >= 1 ? 0 : smooth(Math.min(1, (1 - e) * 2.2));
};
const fenPx = (x, y, band) => {
  const t = band < 0.27 ? 0 : band > 0.75 ? 2 : 1, b = bayer(x, y) * 0.05, F = FEN_GROUND;
  const m = fbm(x, y, 34, 24) + downsAt(x, y) * 0.2;
  const pal = m > 0.6 + b ? F.moss : m < 0.4 - b ? F.heath : F.bog;
  const r = hash((x >> 1) * 5 + 3, (y >> 1) * 7 + 1);
  if (r < 0.007) return (y & 1) ? F.cottonDk : F.cotton;
  if (pal === F.moss && r < 0.05 && (x & 1)) return F.rust;
  if (r > 0.94 && (y & 1)) return F.tuft;
  return pal[t];
};

// The Rimewater: wind-packed snow (blue in its shadows), drifts combed out
// by the north-easter, blue ice in the hollows, black rock where the wind
// scours the snow off, and in the sheltered south dun tundra showing
// through; grey shingle on the strands.
const RIME = {
  snow: ["#aebfd0", "#cfdce8", "#eef4f8"].map(rgb),
  ice: ["#6f9cbe", "#8db6d2", "#b0d2e6"].map(rgb),
  rock: ["#2c3039", "#40454f", "#5a606a"].map(rgb),
  tundra: ["#5e5f52", "#737562", "#8c8c72"].map(rgb),
  drift: rgb("#9fb2c6"), glint: rgb("#ffffff"), shingle: ["#6a6c70", "#8a8c8e", "#a6a8a8"].map(rgb), fleck: rgb("#2a2e36"),
};
const rimePx = (x, y, band, inl) => {
  const t = band < 0.27 ? 0 : band > 0.75 ? 2 : 1, b = bayer(x, y) * 0.05, R = RIME;
  const my = y / U + MAP.y, south = smooth(Math.max(0, Math.min(1, (my + 440) / 100)));
  if (inl < 4 + fbm(x, y, 14, 125) * 4 && fbm(x, y, 20, 31) > 0.46) return R.shingle[hash(x >> 1, y >> 1) < 0.2 ? 0 : t];
  // black rock only where the wind scours a shadowed slope bare, blue ice in
  // the broad hollows, and dun tundra breaking through in the south
  const rock = fbm(x, y, 24, 120) + (0.5 - band) * 0.22, ice = fbm(x, y, 60, 121);
  if (rock > 0.83) return rock < 0.845 ? R.snow[0] : R.rock[Math.min(2, t + (rock > 0.87 ? 0 : 1))];
  if (ice > 0.7 + b) return (y % 7 === 3 && vnoise(x, y, 5, 126) > 0.62) ? R.glint : R.ice[t];
  if (south > 0.05 && fbm(x, y, 26, 122) < 0.12 + south * 0.2 - b) return R.tundra[t];
  // drifts: long ripples combed WSW-ENE by the wind, one pixel of shadow each
  const k = Math.floor(y * 1 - x * 0.28 + vnoise(x, y, 26, 123) * 22);
  if (k % 9 === 0 && vnoise(x, y, 11, 124) > 0.42) return t ? R.drift : R.snow[0];
  const r = hash((x >> 1) * 7 + 5, (y >> 1) * 3 + 9);
  return R.snow[t];
};
// The cold sea round it, and its ice: floes thickening northward into pack,
// fast ice along its own shores, the odd lead of open water.
const COLD = { deep: "#233f5a", mid: "#2c4c68", shal: "#3a6480", reef: "#5e90a6" };
const FLOE = { body: rgb("#d4e2ea"), lit: rgb("#f4f9fb"), thin: rgb("#a4bccc"), shade: rgb("#1a3149") };
// Floes are plates, one to a cell of a jittered grid: an octagon-ish slab
// whose size grows with the ice's density (so northward they crowd into
// pack, with dark leads between). inFloe answers for one art pixel.
const FC = 20;
// (drifting floes thin out away from the Rimewater, west and south; the
// pack along the top of the world lies right across it)
const floeDens = (x, y) => {
  const my = y / U + MAP.y, mx = x / U + MAP.x;
  const drift = smooth(Math.max(0, Math.min(1, (-380 - my) / 120))) * (0.25 + 0.75 * smooth(Math.max(0, Math.min(1, (mx - 120) / 170))));
  return drift * 0.45 + smooth(Math.max(0, Math.min(1, (-585 - my) / 45))) * 0.55;
};
const inFloe = (x, y, dens) => {
  const cy = Math.floor(y / FC), sx = x + (cy & 1) * (FC >> 1), cx = Math.floor(sx / FC), k = cx * 977 + cy * 131;
  const h1 = hash(k, 61);
  if (h1 > 0.1 + dens * 0.9) return 0;
  const r = FC * 0.5 * Math.min(1.02, 0.22 + hash(k, 62) * 0.5 + dens * 0.36);
  const ox = (cx + 0.5) * FC + (hash(k, 63) - 0.5) * Math.max(0, FC - 2 * r), oy = (cy + 0.5) * FC + (hash(k, 64) - 0.5) * Math.max(0, FC - 2 * r);
  const a = hash(k, 65) * 3.1416, ca = Math.cos(a), sa = Math.sin(a), dx = sx - ox, dy = (y - oy) * 1.35;
  const u = Math.abs(dx * ca - dy * sa) * (0.75 + hash(k, 66) * 0.5), v = Math.abs(dx * sa + dy * ca) * (0.8 + hash(k, 67) * 0.6);
  const d = Math.max(u, v, (u + v) * (0.62 + hash(k, 68) * 0.18)) + (vnoise(x, y, 4, 69) - 0.5) * 3;
  return d < r ? 1 : 0;
};
// fast ice along the Rimewater's own shores (dist: art px from its coast)
const seaIce = (x, y, dist, nearRime) => {
  if (dist < 4) return null;
  const dens = Math.min(1, floeDens(x, y) + (nearRime && dist < 26 ? 0.45 * (1 - dist / 26) : 0));
  if (dens < 0.04) return null;
  if (inFloe(x, y, dens)) return inFloe(x, y - 1, dens) ? (hash(x >> 1, y) < 0.04 ? FLOE.thin : FLOE.body) : FLOE.lit;
  if (inFloe(x, y - 1, dens) || inFloe(x, y - 2, dens)) return FLOE.shade;
  return null;
};

// ---- the base: land, cliffs, sea ------------------------------------
function* paintBase() {
  const w = AW, h = AH, N = w * h;
  // each zone's own soft mask
  const soft = [];
  for (const paths of ZONES) {
    const cv = mk(), c = cv.getContext("2d", RF);
    toArt(c);
    c.fillStyle = "#fff";
    for (const p of [].concat(paths)) c.fill(new Path2D(p));
    const d = c.getImageData(0, 0, w, h).data, f = new Float32Array(N);
    for (let i = 0; i < N; i++) f[i] = d[i * 4 + 3] / 255;
    soft.push(blur(blur(f, w, h, 4), w, h, 3));
    yield;
  }
  const keep = ZONES.map(() => new Float32Array(N));
  const anchors = [...LEVELS.map((lv) => [zoneOfChapter(CHAPTERS.indexOf(lv.chapter)), lv.pos]), ...SET_LAND];
  for (const [k, pos] of anchors) {
    const r = 16 * U;
    const cx = Math.round((pos[0] - MAP.x) * U), cy = Math.round((pos[1] - MAP.y) * U);
    for (let y = Math.max(0, cy - r); y < Math.min(h, cy + r); y++) for (let x = Math.max(0, cx - r); x < Math.min(w, cx + r); x++) {
      const dd = Math.hypot(x - cx, y - cy) / r;
      if (dd < 1) keep[k][y * w + x] = Math.max(keep[k][y * w + x], Math.min(1, (1 - dd) * 2.2));
    }
  }
  // warp the coasts with noise — bays and headlands, not ovals — and give
  // each pixel to its strongest zone (with a ragged border between them)
  const W8 = 84, G = 4, gw = Math.ceil(w / G) + 1, gh = Math.ceil(h / G) + 1;
  // the warp is smooth, so work it out on a coarse grid and blend between
  const wxg = new Float32Array(gw * gh), wyg = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    wxg[gy * gw + gx] = (fbm(gx * G, gy * G, 110, 71) - 0.5) * W8;
    wyg[gy * gw + gx] = (fbm(gx * G, gy * G, 110, 72) - 0.5) * W8;
  }
  const bil = (f, x, y) => {
    const fx = x / G, fy = y / G, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, i = iy * gw + ix;
    return (f[i] * (1 - tx) + f[i + 1] * tx) * (1 - ty) + (f[i + gw] * (1 - tx) + f[i + gw + 1] * tx) * ty;
  };
  const land = new Uint8Array(N), zone = new Int8Array(N).fill(-1);
  for (let y = 0; y < h; y++) {
  if (y === h >> 1) yield;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    // (the Rimewater's coast is warped half as hard, so its fjords keep their
    // shape, and frayed finer instead: a rocky, ragged shore. Nothing south of
    // y -310 changes.)
    const my = y / U + MAP.y, rf = my >= -310 ? 1 : my <= -345 ? 0.5 : 1 - smooth((-310 - my) / 35) * 0.5;
    const fx = rf < 1 ? (vnoise(x, y, 16, 73) - 0.5) * 16 * (1 - rf) : 0, fy = rf < 1 ? (vnoise(x, y, 16, 74) - 0.5) * 16 * (1 - rf) : 0;
    const wx = Math.round(x + bil(wxg, x, y) * rf + fx), wy = Math.round(y + bil(wyg, x, y) * rf + fy);
    const j = Math.max(0, Math.min(h - 1, wy)) * w + Math.max(0, Math.min(w - 1, wx));
    let best = -1, bv = 0, n = 0;
    for (let k = 0; k < soft.length; k++) {
      const v = Math.max(soft[k][j], keep[k][i]);
      if (v > 0.2) n++;
      if (v > bv) { bv = v; best = k; }
    }
    // where two countries meet, a ragged border rather than a ruled one
    if (n > 1) {
      bv = 0;
      for (let k = 0; k < 4; k++) {
        const v = Math.max(soft[k][j], keep[k][i]) + (vnoise(x, y, 14, 80 + k) - 0.5) * 0.25;
        if (v > bv) { bv = v; best = k; }
      }
    }
    bv *= Math.min(1, Math.min(x, w - 1 - x, y, h - 1 - y) / 26);
    if (bv < 0.2) continue;
    const t = bv > 0.85 ? 0 : 0.5 + (fbm(x, y, 22, 7) - 0.5) * 0.6;
    if (bv > t) { land[i] = 1; zone[i] = best; }
  }
  }
  yield;
  // the cliff lip: land seen from the south shows a face of earth below it
  const CL = 6;
  const cliff = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (land[i]) continue;
    for (let j = 1; j <= CL; j++) {
      if (y - j < 0) break;
      if (land[i - j * w]) { cliff[i] = j; zone[i] = zone[i - j * w]; break; }
    }
  }
  const solid = new Uint8Array(N);
  for (let i = 0; i < N; i++) solid[i] = land[i] || cliff[i] ? 1 : 0;
  yield;
  const sea = distance(solid, zone, w, h);
  yield;
  // how far inland each land pixel is
  const wet = new Uint8Array(N);
  for (let i = 0; i < N; i++) wet[i] = land[i] ? 0 : 1;
  const inland = distance(wet, zone, w, h).D;
  yield;

  // height, for hill shading: broad swells plus the country's own texture
  const hgt = new Float32Array(N);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!land[i] && !cliff[i]) continue;
    const z = zone[i];
    const amp = z === 1 ? 0.8 : z === 2 ? 0.45 : z === 3 ? 1 : 0.85;
    hgt[i] = fbm(x, y, z === 2 ? 90 : z === 0 ? 80 : 56, 11 + z) * amp;
  }

  yield;
  const img = new ImageData(w, h), d = img.data;
  const put = (i, c) => { const [r, g, b] = typeof c === "string" ? rgb(c) : c; d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; };
  const P = BIOME.map((b) => ({ lo: rgb(b.lo), mid: rgb(b.mid), hi: rgb(b.hi), alt: rgb(b.alt), sand: rgb(b.sand), cliff: b.cliff.map(rgb), lip: rgb(darken(b.lo, 0.35)) }));
  const S = { deep: rgb(SEA.deep), mid: rgb(SEA.mid), shal: rgb(SEA.shal), reef: rgb(SEA.reef), foam: rgb(SEA.foam), swell: rgb(SEA.swell), ink: rgb(INK),
    cDeep: rgb(COLD.deep), cMid: rgb(COLD.mid), cShal: rgb(COLD.shal), cReef: rgb(COLD.reef) };

  for (let y = 0; y < h; y++) {
  if (y === h >> 1) yield;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const z = zone[i];
    if (land[i]) {
      const p = P[z];
      // the coast's own ink ring
      const edge = (x > 0 && !land[i - 1] && !cliff[i - 1]) || (x < w - 1 && !land[i + 1] && !cliff[i + 1]) || (y > 0 && !land[i - w]);
      if (edge) { put(i, S.ink); continue; }
      // the lip where the land turns into its cliff: a dark line
      if (y < h - 1 && cliff[i + w]) { put(i, p.lip); continue; }
      // slope toward the sun lit, away from it dark
      const a = hgt[Math.max(0, i - 3 * w - 3)], b = hgt[Math.min(N - 1, i + 3 * w + 3)];
      const slope = (a - b) * 10;
      const v = 0.5 - slope + (vnoise(x, y, 6, 3 + z) - 0.5) * 0.18;
      const band = v + (bayer(x, y) - 0.5) * 0.2;
      if (z === 1) { put(i, moorPx(x, y, band)); continue; }
      if (z === 2) { put(i, fenPx(x, y, band)); continue; }
      if (z === RZ) { put(i, rimePx(x, y, band, inland[i])); continue; }
      let col = band < 0.27 ? p.lo : band > 0.75 ? p.hi : p.mid;
      // broad patches of the country's second colour (heather, moss, meadow)
      if (col === p.mid && fbm(x, y, 40, 21 + z) > 0.63 + bayer(x, y) * 0.05) col = p.alt;
      // a strip of beach on the lower coasts of the green lands
      if ((z === 0 || z === 4) && inland[i] < 5 && fbm(x, y, 20, 31) > 0.5) col = p.sand;
      // and the broad strands (Gullwick Sands), wider where nearer their heart
      else if (z === 0 && inland[i] < 16) for (const [sx, sy, sr] of SANDS) {
        const dd = Math.hypot(x / U + MAP.x - sx, y / U + MAP.y - sy) / sr;
        if (dd < 1 && inland[i] < (1 - dd) * 16 + (fbm(x, y, 12, 32) - 0.5) * 8) col = p.sand;
      }
      put(i, col);
      continue;
    }
    if (cliff[i]) {
      const p = P[z], j = cliff[i];
      // the bottom of the face meets the sea in ink
      if (y < h - 1 && !solid[i + w]) { put(i, S.ink); continue; }
      if (y < h - 2 && !solid[i + 2 * w]) { put(i, S.ink); continue; }
      const strata = (vnoise(x, y * 3, 6, 41) > 0.62) ? 1 : 0;
      const tone = j <= 1 ? 0 : j <= 3 ? 1 : 2;
      put(i, p.cliff[Math.min(2, tone + strata)]);
      continue;
    }
    // the sea, banded out from the coast
    const dist = sea.D[i];
    const n = vnoise(x, y, 9, 51) * 3;
    if (dist <= 1.5) { put(i, S.ink); continue; }
    if (dist <= 3 + n * 0.6 && vnoise(x, y, 3, 52) > 0.28) { put(i, S.foam); continue; }
    const b = dist + (bayer(x, y) - 0.5) * 5 + n;
    // north of the strait the sea turns cold (dithered in), and carries ice
    const my = y / U + MAP.y;
    if (my < -280) {
      const ice = seaIce(x, y, dist, sea.L[i] === RZ);
      if (ice) { put(i, ice); continue; }
      const cold = smooth(Math.min(1, (-280 - my) / 110));
      if (bayer(x, y) < cold) { put(i, b < 9 ? S.cReef : b < 20 ? S.cShal : b < 34 ? S.cMid : S.cDeep); continue; }
    }
    put(i, b < 9 ? S.reef : b < 20 ? S.shal : b < 34 ? S.mid : S.deep);
  }
  }

  // swells in the open water: short pale ticks, as on an old chart
  for (let k = 0; k < 560; k++) {
    const x = Math.floor(hash(k, 61) * (w - 12)), y = Math.floor(hash(k, 62) * (h - 6));
    const i = y * w + x;
    if (sea.D[i] < 22 || y / U + MAP.y < -300) continue;
    const len = 5 + Math.floor(hash(k, 63) * 5);
    for (let t = 0; t < len; t++) {
      const yy = y + (t === 0 || t === len - 1 ? 1 : 0);
      put(yy * w + x + t, S.swell);
    }
  }

  const cv = mk();
  cv.getContext("2d", RF).putImageData(img, 0, 0);
  return { cv, land, zone, cliff, seaD: sea.D, zoneOf: sea.L, inland };
}

// ---- small tools -----------------------------------------------------
// Harden a canvas's edges: every pixel is either painted or not.
const crisp = (cv, cut = 110) => {
  const c = cv.getContext("2d", RF), img = c.getImageData(0, 0, cv.width, cv.height), d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= cut ? 255 : 0;
  c.putImageData(img, 0, 0);
  return cv;
};
// Bake a little sprite in map units: hard-edged, ringed in 1px ink.
const bake = (w, h, draw, ink = 1) => {
  const cv = mk(Math.ceil(w * U), Math.ceil(h * U)), c = cv.getContext("2d", RF);
  c.imageSmoothingEnabled = false;
  c.scale(U, U);
  draw(c);
  crisp(cv);
  if (ink) inkOutline(cv, INK, ink);
  return cv;
};
// A full-map layer drawn in map units, hardened, optionally edged.
const layer = (draw, edge = null) => {
  const cv = mk(), c = cv.getContext("2d", RF);
  toArt(c);
  draw(c);
  crisp(cv);
  if (edge) inkOutline(cv, edge, 1);
  return cv;
};
// The same, but only a box of the map (x0, y0, w, h in map units): far
// cheaper to harden and ink for something that covers one corner of it.
const layerBox = (x0, y0, w, h, draw, edge = null) => {
  const cv = mk(Math.ceil(w * U), Math.ceil(h * U)), c = cv.getContext("2d", RF);
  c.setTransform(U, 0, 0, U, -x0 * U, -y0 * U); c.imageSmoothingEnabled = false;
  draw(c);
  crisp(cv);
  if (edge) inkOutline(cv, edge, 1);
  return cv;
};
const artX = (x) => Math.round((x - MAP.x) * U), artY = (y) => Math.round((y - MAP.y) * U);
const stamp = (ctx, spr, x, y, ax, ay) => ctx.drawImage(spr, artX(x) - Math.round(ax * U), artY(y) - Math.round(ay * U));
const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); };
// a polyline through its points, smoothed (Chaikin)
const smoothPts = (pts, n = 2) => {
  let out = pts;
  for (let k = 0; k < n; k++) {
    const nx = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const [a, b] = [out[i], out[i + 1]];
      nx.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    nx.push(out[out.length - 1]);
    out = nx;
  }
  return out;
};

// ---- the road --------------------------------------------------------
// Each leg of the march is a gentle curve from one waypoint to the next. The
// dirt of it is painted into the terrain; the gold of a walked leg is laid
// over it by drawMapState.
export const ROADS = LEVELS.slice(1).map((lv, i) => {
  const a = LEVELS[i].pos, b = lv.pos;
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  const bend = (hash(i, 17) - 0.5) * 0.42 * len;
  const c = [(a[0] + b[0]) / 2 - (dy / len) * bend, (a[1] + b[1]) / 2 + (dx / len) * bend];
  const n = Math.max(4, Math.ceil(len / 1.5)), pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return { from: LEVELS[i].id, to: lv.id, pts, len };
});

// ---- rivers and lakes ------------------------------------------------
// The map tells the truth about water: every level whose battlefield has a
// river has a river running through its waypoint, every level with a pond
// or bog has a lake or pool beside it, and no river runs through a dry one
// (checked against REALMS[..].rivers / ponds / coast in data/maps.js — keep
// it so; a coastal level's waypoint stands by the shore, like Ravenscar).
//
// A river is a Catmull-Rom spline through its control points (it passes
// THROUGH them, so a river pinned to a waypoint really runs through it),
// pushed side to side by two octaves of noise — long lazy meanders and small
// kinks — held still near its pins, and widening from source to mouth.
const spline = (pts, step = 1) => {
  const P = [pts[0], ...pts, pts[pts.length - 1]], out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
const normals = (pts) => pts.map((_, i) => {
  const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
  const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
  return [-ty / l, tx / l];
});
// flare: [len, extra] opens the last `len` units into an estuary, `extra`
// units wider at the mouth than the river's own w1.
function river({ ctrl, pins = [], seed, w0, w1, amp = 8, fen = false, ice = false, flare = null }) {
  const base = spline(ctrl);
  const cum = [0];
  for (let i = 1; i < base.length; i++) cum.push(cum[i - 1] + Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]));
  const L = cum[cum.length - 1];
  // where along the river each pin (a waypoint, a lake's outflow) falls
  const pinS = [0, ...pins.map(([px, py]) => {
    let b = 0, bd = 1e9;
    base.forEach(([x, y], i) => { const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; b = i; } });
    return cum[b];
  })];
  const nb = normals(base), mid = [];
  for (let i = 0; i < base.length; i++) {
    const sa = cum[i];
    let env = 1;
    for (const ps of pinS) env *= smooth(Math.min(1, Math.abs(sa - ps) / 18));
    const off = ((fbm(sa * 3, seed * 7.3, 66, seed) - 0.5) * 2 * amp + (fbm(sa * 9, seed * 3.1, 36, seed + 5) - 0.5) * 2 * amp * 0.45) * env;
    mid.push([base[i][0] + nb[i][0] * off, base[i][1] + nb[i][1] * off]);
  }
  const hw = mid.map((_, i) => {
    const open = flare ? smooth(Math.max(0, Math.min(1, (cum[i] - (L - flare[0])) / flare[0]))) * flare[1] : 0;
    return ((w0 + (w1 - w0) * (cum[i] / L) + open) / 2) * (0.82 + fbm(cum[i] * 6, seed, 30, seed + 9) * 0.36 * (1 - open / (flare ? flare[1] * 1.6 : 1)));
  });
  return { pts: mid, hw, nrm: normals(mid), w: Math.max(w0, w1), fen, ice };
}
export const RIVERS = [
  // the Wolfrun, off the northern hills, through the Wolfrun fords, out west
  river({ ctrl: [[143, 7], [138, 20], [134, 32], [129, 44], [114, 53], [95, 58], [75, 68], [53, 71], [31, 78], [10, 82]], pins: [[129, 44]], seed: 11, w0: 2, w1: 4.4 }),
  // the Cinderburn, out of the ridge between the Barrowfields and Cinderholt,
  // down to the Fox Mere
  river({ ctrl: [[235, 58], [224, 77], [231, 97], [223, 117], [214, 138], [216, 160], [206, 180], [204, 206]], pins: [[204, 206]], seed: 19, w0: 1.9, w1: 3.8, amp: 6 }),
  // the Foxwater: out of the Fox Mere, through the mill leat at Millrace and
  // down across the south-east lobe to the sea, widening into the bay west
  // of Gullwick Sands
  river({ ctrl: [[211, 228], [219, 243], [231, 258], [236, 278], [240, 296], [247, 318], [249, 342], [247, 366], [250, 384], [254, 404]], pins: [[211, 228], [240, 296]], seed: 13, w0: 4, w1: 5.4, flare: [22, 2.4] }),
  // the Thornbrook, out of Oakmere's mere, across the farmland, through the
  // ford at Thornbrook and down to the sea
  river({ ctrl: [[75, 199], [88, 213], [105, 223], [128, 235], [150, 248], [158, 269], [165, 292], [167, 320], [172, 357]], pins: [[75, 199], [150, 248]], seed: 14, w0: 2.2, w1: 4, amp: 6 }),
  // the Iron river, out of its tarn above the ford, through Ironford, south
  // past the Gallows Cross road, and out through Ironmouth, where it opens
  // into a broad estuary to the southern sea
  river({ ctrl: [[544, 208], [550, 229], [556, 255], [562, 280], [570, 309], [566, 340], [564, 374], [563, 408], [553, 450], [553, 468], [557, 486], [559, 496]], pins: [[544, 208], [562, 280], [553, 450]], seed: 15, w0: 2.3, w1: 5, flare: [44, 13] }),
  // the Coldwater: two becks off the eastern peaks meeting at Coldwater,
  // then south to the sea
  river({ ctrl: [[596, 288], [606, 301], [619, 316], [635, 330]], pins: [[635, 330]], seed: 25, w0: 1.6, w1: 2.4, amp: 4 }),
  river({ ctrl: [[656, 262], [650, 285], [642, 308], [635, 330], [638, 352], [644, 374], [649, 400], [653, 424]], pins: [[635, 330]], seed: 26, w0: 1.8, w1: 4, amp: 5 }),
  // the fen's black rivers: the Blackwater past the Throne of Dust and the
  // Grave Road, out to the eastern sea
  // (it rises in a spring-mire on the northern downs and runs east under the
  // Dead Weir before it turns south)
  river({ ctrl: [[582, -250], [597, -246], [614, -241], [634, -232], [643, -212], [646, -186], [655, -162], [658, -130], [650, -100], [660, -70], [675, -42], [704, -50], [743, -62]], pins: [[634, -232], [655, -162], [675, -42]], seed: 16, w0: 1.4, w1: 4.4, amp: 7, fen: true }),
  // the Sorrow, south through the Cairnfields and the Causeway to the sea
  river({ ctrl: [[496, -210], [501, -174], [503, -130], [516, -100], [528, -70], [533, -42], [540, -14], [550, 22]], pins: [[503, -130], [533, -42]], seed: 17, w0: 1.9, w1: 4, amp: 7, fen: true }),
  // the Lantern creek: out of the Stillmere, slow through Bellmarsh, west
  // under the mire and through Lanternfen, and out to the western sea
  river({ ctrl: [[466, -80], [450, -68], [430, -64], [410, -54], [391, -42], [375, -47], [357, -55], [337, -64], [318, -78], [301, -86], [284, -92], [262, -98], [246, -101]], pins: [[466, -80], [391, -42], [318, -78]], seed: 18, w0: 1.7, w1: 4.2, amp: 6, fen: true }),
  // the Weepwater's two arms, meeting at Drownholm and running down into
  // the Stillmere
  river({ ctrl: [[438, -204], [446, -190], [455, -175]], pins: [[455, -175]], seed: 27, w0: 1.4, w1: 2.2, amp: 3, fen: true }),
  river({ ctrl: [[478, -206], [468, -192], [455, -175], [462, -155], [468, -132], [474, -112], [477, -100]], pins: [[455, -175]], seed: 28, w0: 1.6, w1: 3.2, amp: 4, fen: true }),
  // the Rimewater's meltwaters, milky glacier-blue (ice: true), each out of a
  // glacier's snout: the Ice-Fjord's river, out of the eastern ice and down
  // through Ice-Fjord into its fjord
  river({ ctrl: [[606, -426], [594, -410], [582, -392], [574, -376], [571, -362], [571, -350], [571, -340]], pins: [[574, -376]], seed: 41, w0: 1.4, w1: 3.4, amp: 4, ice: true }),
  // the Calving river, off the great glacier, through Glacier Foot and into
  // the Wolfsound
  river({ ctrl: [[392, -534], [380, -514], [370, -500], [362, -486], [357, -472], [353, -462], [351, -452]], pins: [[362, -486]], seed: 42, w0: 1.6, w1: 3.6, amp: 4, ice: true }),
  // the Drakewater, out of the fells' ice above Drakesfell, east under the
  // fells to the eastern sea
  river({ ctrl: [[676, -548], [665, -524], [652, -496], [664, -478], [690, -470], [722, -468], [758, -466], [790, -462], [816, -460]], pins: [[652, -496]], seed: 43, w0: 1.4, w1: 4, amp: 6, ice: true, flare: [20, 3] }),
];
// Lakes and tarns, each named for the level it sits by; fen pools are the
// bog's black water. rot tilts the long axis; seed shapes the shore.
const MERES = [
  { x: 206, y: 219, rx: 12.3, ry: 7.5, rot: 0.35, seed: 3 },               // the Fox Mere, by Foxmere
  { x: 68, y: 192, rx: 8.7, ry: 5.8, rot: -0.4, seed: 4 },                 // Oakmere's mere, the Thornbrook's source
  { x: 77, y: 122, rx: 6.7, ry: 4.1, rot: 0.2, seed: 5 },                  // the Bramblewick millpond
  { x: 542, y: 202, rx: 5.2, ry: 3.5, rot: 0.5, seed: 7 },                 // the Iron river's tarn
  { x: 426, y: 210, rx: 7.3, ry: 4.9, rot: 0.3, seed: 8 },                 // the Muster's ponds
  { x: 688, y: 214, rx: 6.7, ry: 4.6, rot: -0.5, seed: 9 },                // the pool under the Undercliff
  { x: 414, y: -176, rx: 11.3, ry: 7.1, rot: 0.25, seed: 20, fen: true },  // Wightwood's bog
  { x: 491, y: -62, rx: 9.4, ry: 5.7, rot: -0.3, seed: 21, fen: true },    // the Causeway's drowned fields
  { x: 567, y: -56, rx: 6.8, ry: 4.5, rot: 0.6, seed: 22, fen: true },
  { x: 361, y: -70, rx: 7.5, ry: 5.2, rot: 0.1, seed: 23, fen: true },     // Bellmarsh's mire
  { x: 689, y: -138, rx: 8.3, ry: 5.7, rot: -0.4, seed: 24, fen: true },   // the Throne's black pool
  { x: 478, y: -92, rx: 16, ry: 10, rot: 0.15, seed: 29, fen: true },      // the Stillmere
  { x: 632, y: -14, rx: 6, ry: 3.6, rot: 0.3, seed: 30, fen: true },       // Saltgrave's tide pool
  { x: 580, y: -121, rx: 6, ry: 4, rot: -0.2, seed: 31, fen: true },       // the Reedmaze's pools
  { x: 574, y: -107, rx: 4.4, ry: 3, rot: 0.4, seed: 32, fen: true },
  { x: 589, y: -104, rx: 4, ry: 2.8, rot: 0.1, seed: 33, fen: true },
  { x: 566, y: -145, rx: 3.6, ry: 2.4, rot: 0.5, seed: 34, fen: true },
  { x: 312, y: -142, rx: 10.5, ry: 6.4, rot: -0.3, seed: 35, fen: true },  // the Abbey Mere, under Abbeymere's ruin
  { x: 580, y: -251, rx: 4.6, ry: 3, rot: 0.2, seed: 36, fen: true },      // the spring-mire the Blackwater rises in
  // the Rimewater's meres: deep, cold and rimmed with ice (ice: true)
  { x: 432, y: -394, rx: 9.5, ry: 5.6, rot: -0.25, seed: 37, ice: true },  // the Frostmere, by Frostmere
  { x: 456, y: -401, rx: 4.6, ry: 3, rot: 0.3, seed: 38, ice: true },      // and its little sister
  { x: 593, y: -521, rx: 11.5, ry: 6.6, rot: 0.2, seed: 39, ice: true },   // the Bergwater, choked with bergs
];
// The Rimewater's glaciers: tongues of old ice coming down off its peaks,
// each to a river's source (its snout) or to the sea (a calving front).
// pts run from the ice field down to the snout; w0/w1 the width at each end.
const GLACIERS = [
  { pts: [[458, -575], [442, -567], [425, -553], [409, -545], [397, -537]], w0: 13, w1: 5, seed: 1 },  // the Calving river's, above Glacier Foot
  { pts: [[346, -545], [358, -553], [372, -559], [382, -568], [387, -579]], w0: 11, w1: 7, seed: 2 },  // into the western fjord
  { pts: [[506, -543], [496, -553], [486, -562], [479, -574], [474, -588]], w0: 12, w1: 7, seed: 3 },  // into the middle fjord
  { pts: [[664, -449], [648, -438], [632, -436], [618, -430], [608, -427]], w0: 12, w1: 4.5, seed: 4 }, // the Ice-Fjord river's
  { pts: [[706, -578], [696, -569], [684, -559], [677, -550]], w0: 10, w1: 4, seed: 5 },              // the Drakewater's, under the fells
  { pts: [[340, -524], [322, -516], [302, -517], [282, -513], [264, -514]], w0: 13, w1: 10, seed: 6 }, // calving into the western sea
].map((g) => {
  const base = spline(g.pts, 0.8), nb = normals(base), n = base.length;
  // a gentle wander, held at the snout
  const pts = base.map(([x, y], i) => { const o = (fbm(i * 7, g.seed * 50, 40, g.seed + 70) - 0.5) * 5 * (1 - i / n); return [x + nb[i][0] * o, y + nb[i][1] * o]; });
  const nrm = normals(pts);
  const hw = pts.map((_, i) => ((g.w0 + (g.w1 - g.w0) * Math.sqrt(i / (n - 1))) / 2) * (0.86 + fbm(i * 9, g.seed * 40, 30, g.seed + 60) * 0.28));
  return { ...g, pts, nrm, hw };
});
const glacierPath = (c, gl, grow = 0) => {
  const L = [], R = [];
  gl.pts.forEach(([x, y], i) => { const [nx, ny] = gl.nrm[i], h = gl.hw[i] + grow; L.push([x + nx * h, y + ny * h]); R.push([x - nx * h, y - ny * h]); });
  c.beginPath();
  L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  // a rounded snout
  const e = gl.pts.length - 1, [ex, ey] = gl.pts[e], [nx, ny] = gl.nrm[e], h = gl.hw[e] + grow;
  c.arc(ex, ey, h, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true);
  for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
  c.closePath();
};
// a lake's shore: a tilted ellipse whose radius wanders with seamless noise
const lakePath = (c, m, grow = 0) => {
  const n = 48, ca = Math.cos(m.rot || 0), sa = Math.sin(m.rot || 0);
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.72 + fbm(40 + Math.cos(a) * 26 + m.seed * 90, 40 + Math.sin(a) * 26, 30, m.seed) * 0.56;
    const lx = Math.cos(a) * (m.rx * k + grow), ly = Math.sin(a) * (m.ry * k + grow);
    const x = m.x + lx * ca - ly * sa, y = m.y + lx * sa + ly * ca;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
};
// a river's banks as one filled outline (grow widens it: shallows, ink)
const riverPath = (c, rv, grow = 0, from = 0) => {
  const L = [], R = [];
  rv.pts.forEach(([x, y], i) => {
    if (i < from) return;
    const [nx, ny] = rv.nrm[i], h = Math.max(0.2, rv.hw[i] + grow);
    L.push([x + nx * h, y + ny * h]); R.push([x - nx * h, y - ny * h]);
  });
  c.beginPath();
  L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
  c.closePath();
  // a rounded spring where it rises
  const [sx, sy] = rv.pts[from];
  c.moveTo(sx + rv.hw[from] + grow, sy);
  c.arc(sx, sy, Math.max(0.2, rv.hw[from] + grow), 0, Math.PI * 2);
};

// ---- the labels' ground ----------------------------------------------
// Where each waypoint's name scroll sits, so the dressing keeps clear of it.
// side: "b" below (the default), "a" above, "l" left, "r" right.
export const LABEL_SIDE = { foxmere: "a", ravenscar: "a", muster: "a", ir5: "a", hl4: "b" };
export const LABEL_FONT = 6.8;   // map units
let MEASURE = null, MEASURED = -1;   // (re-fonted when a type option's faces land)
export const textW = (t) => {
  if (MEASURED !== typeEpoch()) { MEASURE = MEASURE || mk(8, 8).getContext("2d", RF); MEASURE.font = canvasFont("map", LABEL_FONT * 10, true); MEASURED = typeEpoch(); }
  return MEASURE.measureText(t).width / 10;
};
export const labelBox = (lv) => {
  const tw = textW(lv.short || lv.name) + 7, th = 10;
  const [x, y] = lv.pos, side = LABEL_SIDE[lv.id] || (lv.labelAbove ? "a" : "b");
  if (side === "a") return { x: x - tw / 2, y: y - 25 - th, w: tw, h: th };
  if (side === "l") return { x: x - 9 - tw, y: y - th / 2, w: tw, h: th };
  if (side === "r") return { x: x + 9, y: y - th / 2, w: tw, h: th };
  return { x: x - tw / 2, y: y + 7.5, w: tw, h: th };
};

// the chapters' name ribbons, out at sea off their own coasts
export const BANNER_AT = { greenwood: [128, 418], iron: [748, 430], hollow: [206, -226], rime: [184, -392] };
const BANNERS = CHAPTERS.map((ch) => {
  const n = `${ch.numeral}. ${ch.name}`.length, w = n * 5.6 + 14 + 16, [cx, cy] = BANNER_AT[ch.id];
  return { x: cx - w / 2, y: cy - 8, w, h: 16 };
});
const LBOX = new Map();
const lbox = (lv) => { if (!LBOX.has(lv.id)) LBOX.set(lv.id, labelBox(lv)); return LBOX.get(lv.id); };
let BUSY = null;
const busyField = () => {
  if (BUSY) return BUSY;
  const w = MAP.w, h = MAP.h, cv = mk(w, h), c = cv.getContext("2d", RF);
  c.translate(-MAP.x, -MAP.y);
  c.fillStyle = c.strokeStyle = "#000"; c.lineJoin = c.lineCap = "round";
  for (const lv of LEVELS) {
    c.beginPath(); c.arc(lv.pos[0], lv.pos[1] - 5, 12, 0, Math.PI * 2); c.fill();
    const b = lbox(lv); c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 8);
  }
  for (const b of BANNERS) c.fillRect(b.x, b.y, b.w, b.h);
  for (const rd of ROADS) { c.lineWidth = 6.4; poly(c, rd.pts); c.stroke(); }
  for (const rv of RIVERS) { riverPath(c, rv, 1.2 + rv.w * 0.5); c.fill(); }
  for (const m of MERES) { c.beginPath(); c.ellipse(m.x, m.y, m.rx + 2, m.ry + 2, 0, 0, Math.PI * 2); c.fill(); }
  for (const gl of GLACIERS) { glacierPath(c, gl, 1); c.fill(); }
  const d = c.getImageData(0, 0, w, h).data, set = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) set[i] = d[i * 4 + 3] > 60 ? 1 : 0;
  return (BUSY = distance(set, new Int8Array(w * h), w, h).D);
};
// The same, but blind to water: for what stands IN the fen's meres.
let DRY = null;
const dryBusy = (x, y, r = 0) => {
  if (!DRY) {
    const w = MAP.w, h = MAP.h, cv = mk(w, h), c = cv.getContext("2d", RF);
    c.translate(-MAP.x, -MAP.y);
    c.fillStyle = c.strokeStyle = "#000"; c.lineJoin = c.lineCap = "round";
    for (const lv of LEVELS) {
      c.beginPath(); c.arc(lv.pos[0], lv.pos[1] - 5, 12, 0, Math.PI * 2); c.fill();
      const b = lbox(lv); c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 8);
    }
    for (const rd of ROADS) { c.lineWidth = 6.4; poly(c, rd.pts); c.stroke(); }
    const d = c.getImageData(0, 0, w, h).data, set = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) set[i] = d[i * 4 + 3] > 60 ? 1 : 0;
    DRY = distance(set, new Int8Array(w * h), w, h).D;
  }
  const ix = Math.round(x - MAP.x), iy = Math.round(y - MAP.y);
  if (ix < 0 || iy < 0 || ix >= MAP.w || iy >= MAP.h) return true;
  return DRY[iy * MAP.w + ix] <= r;
};
// Is a spot free for dressing? Clear of waypoints, their names, the road,
// the rivers, and the chapter banners (by r units more).
const busy = (x, y, r = 0) => {
  const ix = Math.round(x - MAP.x), iy = Math.round(y - MAP.y);
  if (ix < 0 || iy < 0 || ix >= MAP.w || iy >= MAP.h) return true;
  return busyField()[iy * MAP.w + ix] <= r;
};

// ---- sprites -----------------------------------------------------------
const SPR = new Map();
const spr = (key, w, h, draw, ink = 1) => {
  if (!SPR.has(key)) SPR.set(key, bake(w, h, draw, ink));
  return SPR.get(key);
};
const trunk = (c, x, y, h, col = "#6a4a30") => { c.fillStyle = col; c.fillRect(x - 0.5, y - h, 1, h); };

// a broadleaf: a round lit crown on a short trunk
const oak = (v) => spr(`oak${v}`, 8, 9, (c) => {
  const cols = ["#4f8f3e", "#5a9a42", "#467f3a", "#6a9e44"];
  trunk(c, 4, 8.6, 3);
  blobBall(c, 4, 4.2, 3.4, 3.1, cols[v % 4], 40 + v, { hi: 0.55, lo: 0.6, wobble: 0.14, n: 9 });
});
// a pine: two stacked tiers
const pine = (v, dark = false) => spr(`pine${v}${dark}`, 7, 10, (c) => {
  const col = dark ? ["#35584a", "#3a5e44", "#2f5046"][v % 3] : ["#3f6e3a", "#467640", "#3a663a"][v % 3];
  trunk(c, 3.5, 9.8, 2);
  cone(c, 3.5, 3.4, 3.2, 5.6, col, { scallops: 3, sag: 0.8, hi: 0.35, lo: 0.5 });
  cone(c, 3.5, 0.4, 2.3, 4.6, col, { scallops: 2, sag: 0.7, hi: 0.4, lo: 0.45 });
});
// a drowned white tree, bare — or, burnt, a black one
const deadTree = (v, burnt = false) => spr(`dead${v}${burnt}`, 8, 10, (c) => {
  c.strokeStyle = burnt ? (v % 2 ? "#4a3a36" : "#3a2e2c") : v % 2 ? "#d8d0c4" : "#c4bcb4"; c.lineCap = "round";
  c.lineWidth = 1.1;
  poly(c, [[4, 10], [4, 5.5], [2.2, 2.6]]); c.stroke();
  poly(c, [[4, 6.5], [6, 3.4], [6.8, 1.4]]); c.stroke();
  c.lineWidth = 0.8;
  poly(c, [[4, 5], [4.4, 1.2]]); c.stroke();
  poly(c, [[2.8, 3.8], [1.2, 3.2]]); c.stroke();
  poly(c, [[5.6, 4.2], [7.2, 4.6]]); c.stroke();
});
// a mountain: a lit west face, a shadowed east face, snow on the peak
const mountain = (w, h, seed, pal) => spr(`mt${w}${h}${seed}${pal.key}`, w, h, (c) => {
  const px = w * (0.42 + hash(seed, 1) * 0.16), ry = w * (0.5 + hash(seed, 2) * 0.12);
  const L = [[0.2, h], [px, 0.4], [ry, h]], R = [[px, 0.4], [w - 0.2, h], [ry, h]];
  c.fillStyle = pal.lit; poly(c, L); c.fill();
  c.fillStyle = pal.dark; poly(c, R); c.fill();
  // a spur or two catching the light
  c.fillStyle = pal.mid;
  poly(c, [[px, 0.4], [ry, h], [ry - w * 0.08, h], [px - 0.2, h * 0.3]]); c.fill();
  if (pal.snow) {
    const sh = h * (0.3 + hash(seed, 3) * 0.1);
    const edge = (x0, x1, y) => { const out = []; for (let i = 0; i <= 4; i++) out.push([x0 + (x1 - x0) * (i / 4), y + (i % 2 ? 1.2 : -0.3)]); return out; };
    const lx = px - (px / h) * sh, rx = px + ((w - px) / h) * sh;
    c.fillStyle = pal.snow; poly(c, [[px, 0.4], ...edge(lx, px + (ry - px) * (sh / h), sh).map(([x, y]) => [x, y])]); c.fill();
    c.fillStyle = pal.snowDk; poly(c, [[px, 0.4], [px + (ry - px) * (sh / h), sh + 0.8], ...edge(px + (ry - px) * (sh / h), rx, sh).slice(1)]); c.fill();
  }
});
const ROCK = { key: "r", lit: "#bcb3a2", mid: "#9a9084", dark: "#6e6676", snow: "#f4f0e2", snowDk: "#b4c0d4" };
const IRONPK = { key: "i", lit: "#b0aa9c", mid: "#8e887c", dark: "#5e5a62", snow: "#eeece2", snowDk: "#aab4c4" };
const HILLG = { key: "g", lit: "#9cc462", mid: "#82b256", dark: "#5f8f43" };
// the vale's crags: bare grey-brown rock with no snow on it
const CRAG = { key: "c", lit: "#bdb4a0", mid: "#9a9080", dark: "#6e6870" };
// the isthmus's stony upland, for the hills at its peaks' feet
const ISTH_HILL = { key: "s", mid: "#7c8c66" };
// a rolling hill: a low lit mound
const hill = (w, h, seed, pal) => spr(`hl${w}${h}${seed}${pal.key}`, w, h, (c) => {
  c.save(); c.beginPath(); c.rect(0, 0, w, h - 0.01); c.clip();
  ball(c, w / 2, h, w / 2, h, pal.mid, { hi: 0.4, lo: 0.4, fx: -0.5, fy: -0.7 });
  c.restore();
});
// a cottage with a red roof
const cottage = (v) => spr(`cot${v}`, 6, 6, (c) => {
  c.fillStyle = v % 2 ? "#e8dcc0" : "#dcd0b0"; c.fillRect(0.8, 2.6, 4.4, 3.2);
  c.fillStyle = "#b8a888"; c.fillRect(3.4, 2.6, 1.8, 3.2);
  c.fillStyle = v % 3 ? "#a8505c" : "#8e4450"; poly(c, [[0.2, 3], [3, 0.4], [5.8, 3]]); c.fill();
  c.fillStyle = "#c46a70"; poly(c, [[0.2, 3], [3, 0.4], [3, 3]]); c.fill();
  c.fillStyle = "#4a3428"; c.fillRect(1.6, 4, 0.9, 1.8);
});
// the windmill on the farmland
const windmill = () => spr("mill", 11, 14, (c) => {
  c.fillStyle = "#e0d4b4"; poly(c, [[3.6, 13.6], [4.4, 5], [6.6, 5], [7.4, 13.6]]); c.fill();
  c.fillStyle = "#b8a888"; poly(c, [[5.5, 5], [6.6, 5], [7.4, 13.6], [5.9, 13.6]]); c.fill();
  c.fillStyle = "#a8505c"; poly(c, [[3.8, 5.4], [5.5, 2.8], [7.2, 5.4]]); c.fill();
  c.fillStyle = "#4a3428"; c.fillRect(5, 11.4, 1.1, 2.2);
  c.strokeStyle = "#7a5334"; c.lineWidth = 0.7;
  const cx = 5.5, cy = 4.4;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, ex = cx + Math.cos(a) * 4.9, ey = cy + Math.sin(a) * 4.2;
    poly(c, [[cx, cy], [ex, ey]]); c.stroke();
    c.fillStyle = "#f2ead4";
    const nx = -Math.sin(a) * 1.1, ny = Math.cos(a) * 1.1;
    poly(c, [[cx + Math.cos(a) * 1.6, cy + Math.sin(a) * 1.4], [ex, ey], [ex + nx, ey + ny], [cx + Math.cos(a) * 1.6 + nx, cy + Math.sin(a) * 1.4 + ny]]); c.fill();
  }
});
// a barrow: a grassy mound with a stone door
const barrow = (v) => spr(`bar${v}`, 10, 6, (c) => {
  c.save(); c.beginPath(); c.rect(0, 0, 10, 5.99); c.clip();
  ball(c, 5, 6, 4.8, 5, "#7aa452", { hi: 0.45, lo: 0.45, fx: -0.5, fy: -0.7 });
  c.restore();
  c.fillStyle = "#8a847a"; c.fillRect(3.8, 3, 2.4, 3);
  c.fillStyle = "#2a2230"; c.fillRect(4.4, 3.8, 1.2, 2.2);
});
// a sheep, and a haystack for the farms
const sheep = (v) => spr(`sheep${v}`, 3.6, 2.8, (c) => {
  ball(c, 1.9, 1.3, 1.5, 1.1, "#f2ecdc", { hi: 0.3, lo: 0.35 });
  c.fillStyle = "#3a2e2a"; c.fillRect(v % 2 ? 0 : 2.8, 0.8, 0.8, 0.9); c.fillRect(0.9, 2.2, 0.4, 0.6); c.fillRect(2.4, 2.2, 0.4, 0.6);
}, 0);
const hay = () => spr("hay", 4, 3.6, (c) => {
  c.save(); c.beginPath(); c.rect(0, 0, 4, 3.5); c.clip();
  ball(c, 2, 3.6, 1.9, 3.2, "#e0c060", { hi: 0.4, lo: 0.45, fx: -0.5, fy: -0.6 });
  c.restore();
});
// a rock standing out of the sea, and a slow whirlpool
const seaRock = (v) => spr(`srock${v}`, 6, 5, (c) => {
  blobBall(c, 3, 3, 2.6, 2, "#8a8478", 70 + v, { hi: 0.5, lo: 0.5 });
  if (v % 2) blobBall(c, 4.6, 3.8, 1.2, 1, "#8a8478", 80 + v, { hi: 0.5, lo: 0.5 });
});
const whirl = () => spr("whirl", 16, 10, (c) => {
  c.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    c.strokeStyle = ["#6aa0b8", "#4f86a0", "#e4eee0"][k]; c.lineWidth = 0.9;
    c.beginPath();
    for (let t = 0; t <= 1; t += 0.02) {
      const a = t * Math.PI * 3.2 + k * 2.1, r = 1 + t * 6.6;
      const x = 8 + Math.cos(a) * r, y = 5 + Math.sin(a) * r * 0.55;
      t ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  c.fillStyle = "#1e3650"; c.fillRect(7, 4.4, 2, 1.2);
}, 0);

// ---- the crown's castle, and other set pieces --------------------------
const crownCastle = () => spr("crown", 22, 20, (c) => {
  const stone = "#a19a8a", lit = "#bdb6a4", dk = "#7e776c", roof = "#a8505c", roofLt = "#c46a70";
  // curtain wall
  c.fillStyle = stone; c.fillRect(2, 11, 18, 8.6);
  c.fillStyle = dk; c.fillRect(2, 17.4, 18, 2.2);
  c.fillStyle = lit; for (let k = 0; k < 9; k++) c.fillRect(2 + k * 2, 10, 1.2, 1.4);
  // the gate
  c.fillStyle = "#3a2a24"; c.beginPath(); c.moveTo(9.4, 19.6); c.lineTo(9.4, 15.6); c.arc(11, 15.6, 1.6, Math.PI, 0); c.lineTo(12.6, 19.6); c.fill();
  // towers
  const tower = (x, top, w) => {
    c.fillStyle = stone; c.fillRect(x, top, w, 19.6 - top);
    c.fillStyle = dk; c.fillRect(x + w * 0.62, top, w * 0.38, 19.6 - top);
    c.fillStyle = roof; poly(c, [[x - 0.6, top + 0.2], [x + w / 2, top - 4.4], [x + w + 0.6, top + 0.2]]); c.fill();
    c.fillStyle = roofLt; poly(c, [[x - 0.6, top + 0.2], [x + w / 2, top - 4.4], [x + w / 2, top + 0.2]]); c.fill();
    c.fillStyle = "#2a2230"; c.fillRect(x + w / 2 - 0.4, top + 2, 0.9, 1.6);
  };
  tower(0.8, 8, 4); tower(17.2, 8, 4);
  // the keep, with the crown's banner
  tower(8.4, 5, 5.2);
  c.fillStyle = "#6b5a3c"; c.fillRect(10.8, -0.2 + 0.4, 0.6, 1.6);
  c.fillStyle = "#d8b34a"; c.fillRect(11.4, 0.4, 3, 1.8);
});
const ship = () => spr("ship", 14, 13, (c) => {
  c.fillStyle = "#7a5334"; poly(c, [[0.4, 9], [13.6, 9], [11.6, 12.4], [2.2, 12.4]]); c.fill();
  c.fillStyle = "#5a3c26"; c.fillRect(1.6, 11, 11, 1.4);
  c.fillStyle = "#6b4a2e"; c.fillRect(6.6, 0.6, 0.8, 8.6);
  c.fillStyle = "#f2ead4"; poly(c, [[2.2, 2], [7, 1.4], [7, 8], [2.8, 8.2]]); c.fill();
  c.fillStyle = "#d4c8a8"; poly(c, [[7.4, 2], [11.8, 3], [11.4, 8], [7.4, 8]]); c.fill();
  c.fillStyle = "#a8505c"; c.fillRect(4, 3.6, 1.4, 3.4); c.fillRect(3, 4.6, 3.4, 1.2);
  c.fillStyle = "#d8b34a"; c.fillRect(7.4, 0, 2.6, 1.2);
});
const lighthouse = () => spr("light", 5, 12, (c) => {
  c.fillStyle = "#e8e0cc"; poly(c, [[1, 11.8], [1.6, 3], [3.4, 3], [4, 11.8]]); c.fill();
  c.fillStyle = "#a8505c"; c.fillRect(1.3, 5.6, 2.4, 1.4); c.fillRect(1.1, 8.6, 2.8, 1.4);
  c.fillStyle = "#b8ac92"; c.fillRect(2.9, 3, 1.1, 8.8);
  c.fillStyle = "#f2c744"; c.fillRect(1.6, 1.2, 1.8, 1.8);
  c.fillStyle = "#4a3a40"; poly(c, [[1.2, 1.4], [2.5, 0], [3.8, 1.4]]); c.fill();
});
const serpent = () => spr("serpent", 34, 11, (c) => {
  const col = "#4f8a6a";
  // the tail, then coils breaking the water
  c.fillStyle = col; poly(c, [[0.4, 9.4], [2.4, 6.4], [4.2, 9.4]]); c.fill();
  for (const [x, r, t] of [[9, 3, 5.4], [17, 3.6, 4], [25, 3, 5.2]]) {
    c.save(); c.beginPath(); c.rect(x - r - 1, 0, r * 2 + 2, 9.4); c.clip();
    ball(c, x, 9.4, r, 9.4 - t + 2, col, { hi: 0.5, lo: 0.5, fx: -0.4, fy: -0.7 });
    c.restore();
    c.fillStyle = "#a8505c"; poly(c, [[x - 1.2, t - 0.4], [x - 0.2, t - 2.6], [x + 1, t - 0.6]]); c.fill();
  }
  // the neck and head, and its eye
  c.fillStyle = col; c.fillRect(28.6, 4.4, 2.2, 5);
  ball(c, 31, 3.6, 2.8, 2, col, { hi: 0.5, lo: 0.5 });
  c.fillStyle = "#e8d47a"; c.fillRect(31.4, 2.6, 0.9, 0.9);
});
const compass = () => spr("compass", 22, 24, (c) => {
  const cx = 11, cy = 13;
  const pt = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 4, r = k % 2 ? 6 : 10;
    const l = pt(a - 0.5, 2), rr = pt(a + 0.5, 2), tip = pt(a, r);
    c.fillStyle = k % 2 ? "#b8ac92" : "#e8dcbc"; poly(c, [[cx, cy], l, tip]); c.fill();
    c.fillStyle = k % 2 ? "#8a7e68" : k === 0 ? "#a8505c" : "#c8b48a"; poly(c, [[cx, cy], tip, rr]); c.fill();
  }
  ball(c, cx, cy, 1.6, 1.6, "#d8b34a", { hi: 0.5, lo: 0.4 });
  // the N
  c.fillStyle = "#e8dcbc"; c.fillRect(9.6, 0, 0.9, 2.8); c.fillRect(11.6, 0, 0.9, 2.8);
  poly(c, [[9.6, 0], [10.5, 0], [12.5, 2.8], [11.6, 2.8]]); c.fill();
});
const bridge = () => spr("bridge", 7, 5, (c) => {
  c.fillStyle = "#b4ad9c"; c.fillRect(0.4, 1, 6.2, 3);
  c.fillStyle = "#8a8474"; c.fillRect(0.4, 3.2, 6.2, 0.8);
  c.fillStyle = "#cfc7b2"; c.fillRect(0.4, 0.6, 6.2, 0.7); c.fillRect(0.4, 3.9, 6.2, 0.6);
});

// the mill at Millrace: a whitewashed mill house, its undershot wheel
// turning in the leat on its west side
const watermill = () => spr("wmill", 10, 8, (c) => {
  c.fillStyle = "#e8dcc0"; c.fillRect(3.4, 3.4, 5.8, 4.2);
  c.fillStyle = "#b8a888"; c.fillRect(7.2, 3.4, 2, 4.2);
  c.fillStyle = "#a8505c"; poly(c, [[2.8, 3.8], [6.3, 0.6], [9.8, 3.8]]); c.fill();
  c.fillStyle = "#c46a70"; poly(c, [[2.8, 3.8], [6.3, 0.6], [6.3, 3.8]]); c.fill();
  c.fillStyle = "#4a3428"; c.fillRect(5.6, 5.6, 1, 2);
  c.fillStyle = "#e8c070"; c.fillRect(7.6, 4.6, 0.7, 0.7);
  // the wheel, spokes and paddles, standing in its race
  c.fillStyle = "#3f7898"; c.fillRect(0, 6.6, 4, 1.4);
  c.strokeStyle = "#6b4a2e"; c.lineWidth = 0.6;
  c.beginPath(); c.arc(2, 5, 2, 0, Math.PI * 2); c.stroke();
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; poly(c, [[2 - Math.cos(a) * 2, 5 - Math.sin(a) * 2], [2 + Math.cos(a) * 2, 5 + Math.sin(a) * 2]]); c.stroke(); }
  c.fillStyle = "#8cc0d2"; c.fillRect(0.4, 7.2, 1.2, 0.4); c.fillRect(2.8, 7.4, 1, 0.4);
});
// a fishing boat drawn up on the sand, and the nets drying on their poles
const rowboat = (v) => spr(`rboat${v % 2}`, 6, 3, (c) => {
  c.fillStyle = v % 2 ? "#7a5334" : "#8a6a44"; poly(c, [[0.2, 0.8], [5.8, 0.8], [4.8, 2.6], [1, 2.6]]); c.fill();
  c.fillStyle = "#5a3c26"; c.fillRect(0.6, 2, 4.8, 0.6);
  c.fillStyle = v % 2 ? "#a8505c" : "#d8cfb4"; c.fillRect(0.4, 0.8, 5.2, 0.5);
  c.fillStyle = "#4a3428"; c.fillRect(2.6, 1.2, 0.8, 0.8);
});
const nets = () => spr("nets", 7, 4, (c) => {
  c.fillStyle = "#6b4a2e"; for (const x of [0.6, 3.3, 6]) c.fillRect(x, 0.4, 0.5, 3.4);
  c.fillStyle = "#8a8474"; poly(c, [[1.1, 0.8], [3.3, 0.8], [3.1, 2.6], [1.3, 2.2]]); c.fill(); poly(c, [[3.8, 0.8], [6, 0.8], [5.8, 2], [4, 2.6]]); c.fill();
  c.fillStyle = "#5e5a52"; for (let x = 1.4; x < 5.8; x += 0.9) c.fillRect(x, 0.8, 0.3, 1.6);
}, 0);
// a ring of grey standing stones on the vale's turf (the King Stones)
const kingStone = (v) => spr(`kstone${v % 3}`, 2.4, 4.4, (c) => {
  const h = 3 + (v % 3) * 0.5;
  c.fillStyle = "#a8a496"; poly(c, [[0.3, 4.2], [0.4, 4.2 - h + 0.5], [1.2, 4.2 - h], [2, 4.2 - h + 0.6], [2.1, 4.2]]); c.fill();
  c.fillStyle = "#77736a"; c.fillRect(1.4, 4.2 - h + 0.6, 0.7, h - 0.6);
  c.fillStyle = "#6a9a48"; c.fillRect(0.2, 3.7, 2, 0.5);
});

// ---- the Iron Marches ---------------------------------------------------
// A militarised highland kingdom: grey stone and slate, black-iron trim and
// the Iron Kingdom's OXBLOOD banners (never the crown's blue), dark pines,
// drystone walls, camps and watchtowers along every road.
const IK = {
  st: "#a4a096", stLt: "#bcb8ac", stDk: "#7a766e", stDp: "#5a5652",
  sl: "#505664", slLt: "#6a7282", slDk: "#3a3e4a",
  ox: "#7a2a2c", oxDk: "#521a1e", oxLt: "#98403c", iron: "#2e3038", brass: "#b8903e",
  wood: "#6a4a2e", woodDk: "#4a3222", door: "#2a2230", fire: "#f2a040", fireLt: "#ffe08a",
};
// an oxblood banner on a black-iron pole: the pole's foot at (x, y), the
// cloth `len` long, swallow-tailed, with the grey tower of the kingdom on it
const oxFlag = (c, x, y, pole, len = 2.6, h = 1.6) => {
  c.fillStyle = IK.iron; c.fillRect(x - 0.3, y - pole, 0.6, pole);
  const t = y - pole + 0.2;
  c.fillStyle = IK.ox; poly(c, [[x + 0.3, t], [x + 0.3 + len, t], [x + len - 0.4, t + h / 2], [x + 0.3 + len, t + h], [x + 0.3, t + h]]); c.fill();
  c.fillStyle = IK.oxDk; c.fillRect(x + 0.3, t + h - 0.5, len - 0.6, 0.5);
  c.fillStyle = "#a8a8b0"; c.fillRect(x + 0.9, t + 0.4, 0.6, 0.7);
};
// a square block seen from the south: its south face, the east third in
// shade, a paler roof-walk on top and a row of merlons
const block = (c, x, y, w, h, o = {}) => {
  c.fillStyle = o.st || IK.st; c.fillRect(x, y - h, w, h);
  c.fillStyle = o.dk || IK.stDk; c.fillRect(x + w * 0.64, y - h, w * 0.36, h);
  c.fillStyle = IK.stDp; c.fillRect(x, y - 0.6, w, 0.6);
  if (o.top !== false) {
    const d = o.deck ?? 1.2;
    c.fillStyle = IK.stLt; c.fillRect(x - 0.2, y - h - d, w + 0.4, d);
    c.fillStyle = IK.stDk; c.fillRect(x + 0.4, y - h - d + 0.5, w - 0.8, d - 0.5);
    c.fillStyle = IK.stLt;
    for (let k = x - 0.2; k < x + w; k += 1.6) c.fillRect(k, y - h - d - 0.8, 0.9, 0.8);
  }
};
const slit = (c, x, y, h = 1.2) => { c.fillStyle = IK.door; c.fillRect(x, y, 0.6, h); };
// a slate-roofed stone house: gable end to the south or the long side
const house = (c, x, y, w, h, v) => {
  const wall = v % 3 === 2 ? "#b4ac9a" : IK.st, dk = v % 3 === 2 ? "#8a8272" : IK.stDk;
  c.fillStyle = wall; c.fillRect(x, y - h, w, h);
  c.fillStyle = dk; c.fillRect(x + w * 0.66, y - h, w * 0.34, h);
  const rf = v % 4 === 3 ? ["#7a4a3a", "#94604a", "#5a3428"] : [IK.sl, IK.slLt, IK.slDk];
  c.fillStyle = rf[0]; poly(c, [[x - 0.4, y - h + 0.2], [x + 0.6, y - h - 1.8], [x + w - 0.6, y - h - 1.8], [x + w + 0.4, y - h + 0.2]]); c.fill();
  c.fillStyle = rf[1]; c.fillRect(x + 0.6, y - h - 1.8, w - 1.2, 0.6);
  c.fillStyle = rf[2]; c.fillRect(x - 0.4, y - h - 0.3, w + 0.8, 0.5);
  c.fillStyle = IK.door; c.fillRect(x + w * 0.3, y - 1.3, 0.8, 1.3);
  if (w > 3) { c.fillStyle = "#e8c070"; c.fillRect(x + w * 0.62, y - h + 0.5, 0.6, 0.6); }
  if (v % 2) { c.fillStyle = IK.stDk; c.fillRect(x + w - 1.4, y - h - 2.6, 0.8, 1.4); }
};
// a stone farmhouse with its byre
const steading = (v) => spr(`ik-stead${v}`, 9, 6, (c) => {
  house(c, 0.6, 5.8, 4.4, 2.4, v);
  if (v % 2) house(c, 5, 5.8, 3.4, 1.6, v + 1);
  else { c.fillStyle = "#8a7a58"; poly(c, [[5.2, 5.8], [5.6, 3.6], [8.4, 3.6], [8.6, 5.8]]); c.fill(); c.fillStyle = "#6a5a40"; c.fillRect(7, 3.6, 1.6, 2.2); }
});
// a square keep: tall, battlemented, one banner
const ironKeep = (v) => spr(`ik-keep${v}`, 9, 15, (c) => {
  const tall = v % 2 ? 7.6 : 9.2;
  if (v % 3 === 2) { block(c, 5.6, 14.6, 3, 3.4, { deck: 0.8 }); }
  block(c, 1.2, 14.6, 5.2, tall);
  slit(c, 2.6, 14.6 - tall + 1.6); slit(c, 4.4, 14.6 - tall + 3.4);
  c.fillStyle = IK.door; c.fillRect(3, 12.4, 1.4, 2.2);
  c.fillStyle = IK.iron; c.fillRect(1.2, 14.6 - tall + 0.2, 5.2, 0.4);
  oxFlag(c, 3.8, 14.6 - tall - 1.4, 3.4, 2.8, 1.7);
});
// a watchtower: slim, a timber hoarding, a beacon basket (lit or banner)
const watchtower = (v) => spr(`ik-watch${v}`, 6, 15, (c) => {
  c.fillStyle = IK.st; poly(c, [[1.2, 14.6], [1.7, 5], [4.3, 5], [4.8, 14.6]]); c.fill();
  c.fillStyle = IK.stDk; poly(c, [[3.4, 5], [4.3, 5], [4.8, 14.6], [3.7, 14.6]]); c.fill();
  c.fillStyle = IK.stDp; c.fillRect(1.2, 14, 3.6, 0.6);
  slit(c, 2.5, 8); slit(c, 2.5, 11);
  // the hoarding
  c.fillStyle = IK.wood; c.fillRect(0.8, 3.6, 4.4, 1.6);
  c.fillStyle = IK.woodDk; c.fillRect(0.8, 4.6, 4.4, 0.6); c.fillRect(3.6, 3.6, 1.6, 1.6);
  c.fillStyle = IK.sl; poly(c, [[0.4, 3.8], [3, 1.8], [5.6, 3.8]]); c.fill();
  c.fillStyle = IK.slLt; poly(c, [[0.4, 3.8], [3, 1.8], [3, 3.8]]); c.fill();
  if (v % 2) { c.fillStyle = IK.fire; c.fillRect(2.4, 0.6, 1.2, 1.3); c.fillStyle = IK.fireLt; c.fillRect(2.7, 0.3, 0.6, 0.8); c.fillStyle = IK.iron; c.fillRect(2.2, 1.7, 1.6, 0.4); }
  else oxFlag(c, 3, 2.4, 2.4, 2.4, 1.4);
});
// a border fort: a square curtain with corner towers, a gatehouse and a hall
const borderFort = (v) => spr(`ik-fort${v}`, 18, 14, (c) => {
  // the yard, and the back curtain's face seen across it
  c.fillStyle = "#8a826e"; c.fillRect(2, 5, 14, 7);
  block(c, 2, 6.6, 14, 1.8, { deck: 0.8 });
  // the hall inside
  house(c, 4.6, 10.2, 6, 2.4, v * 3);
  if (v % 2) house(c, 11.4, 10.4, 3, 1.6, 1);
  // the side walls' walks
  c.fillStyle = IK.stLt; c.fillRect(1.6, 5, 1.2, 8); c.fillRect(15.2, 5, 1.2, 8);
  c.fillStyle = IK.stDk; c.fillRect(15.8, 5, 0.6, 8);
  // the front curtain and its gatehouse
  block(c, 2, 13.6, 14, 2.4, { deck: 0.9 });
  block(c, 7, 13.6, 4, 4.4, { deck: 1 });
  c.fillStyle = IK.door; c.beginPath(); c.moveTo(8.2, 13.6); c.lineTo(8.2, 11.8); c.arc(9, 11.8, 0.8, Math.PI, 0); c.lineTo(9.8, 13.6); c.fill();
  c.fillStyle = IK.iron; for (let k = 8.3; k < 9.8; k += 0.6) c.fillRect(k, 11.4, 0.3, 2.2);
  // corner towers
  for (const [x, h] of [[0.4, 6.4], [14.2, 6.4]]) { block(c, x, 6.8, 3.4, h - 1, { deck: 0.9 }); }
  for (const [x, h] of [[0.4, 4.6], [14.2, 4.6]]) { block(c, x, 13.8, 3.4, h, { deck: 0.9 }); slit(c, x + 1.3, 13.8 - h + 1.2); }
  oxFlag(c, 9, 7.4, 3.8, 3, 1.8);
  oxFlag(c, 1.9, 2.8, 2.6, 2, 1.3);
});
// a walled town: curtain and towers round a huddle of slate roofs, a keep
// at its heart
const walledTown = (v) => spr(`ik-town${v}`, 24, 17, (c) => {
  c.fillStyle = "#8e8674"; c.fillRect(2.4, 5.4, 19.2, 8);
  block(c, 2.4, 6.8, 19.2, 1.6, { deck: 0.8 });
  const keepX = v % 2 ? 13.4 : 8;
  // back row of houses, the keep, the front row
  for (let k = 0; k < 5; k++) { const x = 3.4 + k * 3.7 + (hash(v, k) - 0.5); if (Math.abs(x + 1.4 - keepX - 2) < 3.4) continue; house(c, x, 9.6, 2.8 + hash(v, k + 9) * 0.8, 1.4, v + k); }
  block(c, keepX, 11.4, 4.2, 7.4, { deck: 1 });
  slit(c, keepX + 1.4, 6.4); c.fillStyle = IK.iron; c.fillRect(keepX, 4.2, 4.2, 0.4);
  oxFlag(c, keepX + 2.1, 2.8, 2.8, 3, 1.8);
  for (let k = 0; k < 5; k++) { const x = 3 + k * 3.8 + (hash(v, k + 20) - 0.5) * 0.8; if (Math.abs(x + 1.5 - 12) < 2.6) continue; house(c, x, 13, 3 + hash(v, k + 30) * 0.6, 1.6, v + k + 2); }
  c.fillStyle = IK.stLt; c.fillRect(1.8, 5.4, 1.2, 8.6); c.fillRect(21, 5.4, 1.2, 8.6);
  // the front curtain, gate, and four towers
  block(c, 2.4, 16.4, 19.2, 2.2, { deck: 0.8 });
  block(c, 10, 16.4, 4, 3.8, { deck: 0.9 });
  c.fillStyle = IK.door; c.beginPath(); c.moveTo(11.2, 16.4); c.lineTo(11.2, 14.8); c.arc(12, 14.8, 0.8, Math.PI, 0); c.lineTo(12.8, 16.4); c.fill();
  for (const x of [0.6, 20.2]) { block(c, x, 7.2, 3.2, 4, { deck: 0.8 }); block(c, x, 16.6, 3.2, 4.4, { deck: 0.8 }); slit(c, x + 1.2, 13.6); }
  oxFlag(c, 21.8, 11.4, 2.4, 2, 1.3);
});
// canvas tents of the Iron army, and the captain's striped pavilion
const ikTent = (v) => spr(`ik-tent${v}`, 6, 5.4, (c) => {
  const cloth = v % 3 === 2 ? IK.ox : "#ddd4bc", dk = v % 3 === 2 ? IK.oxDk : "#aea48a";
  c.fillStyle = cloth; poly(c, [[0.2, 5.2], [3, 0.8], [5.8, 5.2]]); c.fill();
  c.fillStyle = dk; poly(c, [[3, 0.8], [5.8, 5.2], [3.9, 5.2]]); c.fill();
  if (v % 3 !== 2) { c.fillStyle = IK.ox; poly(c, [[1.9, 2.8], [3, 0.8], [3.4, 1.5], [2.5, 3.2]]); c.fill(); }
  c.fillStyle = IK.door; poly(c, [[2.4, 5.2], [3, 3], [3.5, 5.2]]); c.fill();
  c.fillStyle = IK.wood; c.fillRect(2.8, 0, 0.5, 1);
});
const pavilion = () => spr("ik-pav", 11, 10, (c) => {
  c.fillStyle = "#ddd4bc"; c.fillRect(1.4, 5.4, 8.2, 4.2);
  c.fillStyle = IK.ox; for (let k = 0; k < 4; k++) c.fillRect(2.2 + k * 2, 5.4, 1, 4.2);
  c.fillStyle = "#aea48a"; c.fillRect(7.4, 5.4, 2.2, 4.2);
  c.fillStyle = IK.ox; poly(c, [[0.6, 5.8], [5.5, 2.4], [10.4, 5.8]]); c.fill();
  c.fillStyle = IK.oxLt; poly(c, [[0.6, 5.8], [5.5, 2.4], [5.5, 5.8]]); c.fill();
  c.fillStyle = IK.brass; c.fillRect(0.6, 5.6, 9.8, 0.5);
  c.fillStyle = IK.door; c.fillRect(4.8, 7.2, 1.4, 2.4);
  oxFlag(c, 5.5, 2.6, 2.6, 3, 1.6);
});
// a camp fire with its smoke
const campfire = () => spr("ik-fire", 2.4, 4, (c) => {
  c.fillStyle = "#8a8490"; c.fillRect(1, 0, 0.6, 0.8); c.fillRect(0.6, 0.8, 0.6, 0.8); c.fillRect(1.1, 1.6, 0.5, 0.6);
  c.fillStyle = IK.woodDk; c.fillRect(0.2, 3.4, 2, 0.5);
  c.fillStyle = IK.fire; c.fillRect(0.6, 2.4, 1.2, 1.1); c.fillStyle = IK.fireLt; c.fillRect(1, 2.6, 0.5, 0.8);
}, 0);
// a milestone by the military road
const milestone = (v) => spr(`ik-mile${v}`, 2.2, 3, (c) => {
  c.fillStyle = "#b8b4a8"; c.fillRect(0.4, 0.8, 1.4, 2.1); c.beginPath(); c.arc(1.1, 0.9, 0.7, Math.PI, 0); c.fill();
  c.fillStyle = "#86827a"; c.fillRect(1.2, 0.6, 0.6, 2.3);
  if (v % 2) { c.fillStyle = IK.ox; c.fillRect(0.4, 1.4, 1.4, 0.4); }
});
// the gallows at the crossroads
const gallows = () => spr("ik-gallows", 7, 8, (c) => {
  c.save(); c.beginPath(); c.rect(0, 0, 7, 7.9); c.clip();
  ball(c, 3.5, 8, 3.4, 1.6, "#6a7458", { hi: 0.4, lo: 0.4, fx: -0.5, fy: -0.7 }); c.restore();
  c.fillStyle = IK.wood; c.fillRect(1.4, 1.2, 0.8, 5.8); c.fillRect(1.4, 1.2, 4.6, 0.7);
  c.fillStyle = IK.woodDk; c.fillRect(1.9, 1.2, 0.3, 5.8); poly(c, [[2.2, 3.2], [3.6, 1.9], [2.9, 1.9], [2.2, 2.6]]); c.fill();
  c.fillStyle = "#b8a878"; c.fillRect(5.2, 1.9, 0.3, 1.6);
  c.fillStyle = "#2a2430"; c.fillRect(4.9, 3.5, 0.9, 0.8);
  c.fillStyle = "#1e1a22"; c.fillRect(4.6, 0.4, 1.2, 0.8);
});
// a granite tor: slabs stacked on the moor, each with a lit top, a grey
// south face and a shaded east end, split by dark joints
const tor = (v) => spr(`ik-tor${v}`, 11, 8, (c) => {
  const slab = (x, y, w, h, top = 0.9) => {
    c.fillStyle = "#8e897e"; c.fillRect(x, y - h, w, h);
    c.fillStyle = "#6a655e"; c.fillRect(x + w * 0.7, y - h, w * 0.3, h);
    c.fillStyle = "#56524c"; c.fillRect(x, y - 0.5, w, 0.5);
    c.fillStyle = "#b8b3a6"; c.fillRect(x + 0.2, y - h - top, w - 0.4, top);
    c.fillStyle = "#cfcabc"; c.fillRect(x + 0.4, y - h - top, w * 0.4, 0.5);
  };
  const stacks = [
    [[0.6, 7.6, 4.2, 1.6], [5, 7.6, 3.6, 2.2], [1.2, 5.1, 3.2, 1.6], [5.4, 4.5, 2.8, 1.4], [1.8, 2.6, 2, 1.2]],
    [[1, 7.6, 5, 2], [6.2, 7.6, 3.8, 1.4], [1.6, 4.7, 3.8, 1.8], [2.2, 2, 2.4, 1.2]],
    [[0.4, 7.6, 3, 1.4], [3.6, 7.6, 5.6, 2.4], [4.2, 4.3, 4, 1.8], [5, 1.6, 2.4, 1.2]],
    [[1.4, 7.6, 7.6, 1.6], [2.2, 5.1, 3.2, 1.8], [5.8, 5.1, 2.6, 1.2]],
  ][v % 4];
  for (const [x, y, w, h] of stacks) slab(x + (v > 3 ? 0.6 : 0), y, w, h);
  c.fillStyle = "#6e7a52"; c.fillRect(1 + (v % 3), 7.1, 1.4, 0.5);
});
// a column of the Iron host on the march: spears, helms, oxblood coats, a
// banner at the head
const column = (v) => spr(`ik-col${v}`, 14, 5, (c) => {
  const n = 5 + (v % 2);
  for (let k = 0; k < n; k++) {
    const x = 1 + k * 2.1, y = 4.8 - (k % 2) * 0.2;
    c.fillStyle = "#3a3440"; c.fillRect(x, y - 1.2, 0.5, 1.2); c.fillRect(x + 0.7, y - 1.2, 0.5, 1.2);
    c.fillStyle = k === n - 1 ? IK.brass : IK.ox; c.fillRect(x - 0.1, y - 2.6, 1.4, 1.5);
    c.fillStyle = IK.oxDk; c.fillRect(x + 0.8, y - 2.6, 0.5, 1.5);
    c.fillStyle = "#c4c8d0"; c.fillRect(x + 0.1, y - 3.4, 1, 0.8);
    c.fillStyle = "#8a8e98"; c.fillRect(x + 0.7, y - 3.4, 0.4, 0.8);
    if (k < n - 1) { c.fillStyle = IK.wood; c.fillRect(x + 1.2, y - 4.6, 0.3, 3); c.fillStyle = "#dadde4"; c.fillRect(x + 1.2, y - 5, 0.3, 0.5); }
  }
  oxFlag(c, 1 + (n - 1) * 2.1 + 1.3, 3.2, 3.2, 2, 1.2);
});
// the salt pans of Brinewick: shallow square pans of brine in stone
// kerbs, some white with salt, and a raker's hut at their head
const saltPans = (v) => spr(`ik-salt${v % 2}`, 13, 7, (c) => {
  c.fillStyle = "#8e8a7e"; c.fillRect(0.4, 1.6, 12.2, 5.2);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
    const k = hash(v * 7 + i, j + 3), x = 0.9 + i * 2.95, y = 2.1 + j * 2.4;
    c.fillStyle = k < 0.35 ? "#e8ecea" : k < 0.7 ? "#7aa2b0" : "#5f8a9c"; c.fillRect(x, y, 2.4, 1.9);
    c.fillStyle = k < 0.35 ? "#c4ccce" : "#9ac0cc"; c.fillRect(x, y, 2.4, 0.4);
  }
  house(c, v % 2 ? 9.6 : 0.6, 2.2, 2.6, 1.4, 3);
});
// a moor fell: a long low swell of turf or heather
const FELL = [{ key: "mt", mid: "#76825f" }, { key: "mh", mid: "#7a6a58" }];
// the Marches' pines: dark, narrow, three tiers, some tall
const moorPine = (v) => spr(`ik-pine${v}`, 7, 12, (c) => {
  const col = ["#2e4c40", "#34523e", "#2a463e", "#38543a"][v % 4], tall = v % 2 ? 1.6 : 0;
  trunk(c, 3.5, 11.8, 2.2, "#4a3a2c");
  cone(c, 3.5, 4.4 - tall * 0.2, 3, 5.6, col, { scallops: 3, sag: 0.7, hi: 0.35, lo: 0.55 });
  cone(c, 3.5, 2 - tall * 0.6, 2.4, 4.4, col, { scallops: 2, sag: 0.6, hi: 0.4, lo: 0.5 });
  cone(c, 3.5, 0.2 - tall * 0.8 + 1.2, 1.5, 3, col, { scallops: 2, sag: 0.4, hi: 0.45, lo: 0.45 });
});
// the Iron Citadel: the capital's fortress on its crag
const ironCitadel = () => spr("ik-citadel", 32, 28, (c) => {
  // the crag it stands on
  c.save(); c.beginPath(); c.rect(0, 14, 32, 13.9); c.clip();
  blobBall(c, 16, 26, 15.4, 7, "#8e887c", 311, { hi: 0.5, lo: 0.6, wobble: 0.08, n: 12 });
  c.restore();
  c.fillStyle = "#6e6860"; for (const [x, y] of [[6, 24], [11, 25.6], [20, 25], [26, 23.4]]) c.fillRect(x, y, 2.4, 0.5);
  // the outer curtain, back face and walks
  c.fillStyle = "#86806e"; c.fillRect(3, 11, 26, 9);
  block(c, 3, 12.4, 26, 2, { deck: 0.9 });
  c.fillStyle = IK.stLt; c.fillRect(2.4, 11, 1.2, 10); c.fillRect(28.4, 11, 1.2, 10);
  // the inner ward: barracks and the great keep
  house(c, 5, 16.6, 6, 2, 0); house(c, 21, 16.6, 5.4, 2, 2);
  block(c, 11.4, 18, 9.2, 13, { deck: 1.4 });
  block(c, 13.6, 5.2, 4.8, 3.2, { deck: 1 });
  c.fillStyle = IK.iron; c.fillRect(11.4, 5.2, 9.2, 0.5);
  for (const x of [12.8, 15.6, 18.4]) slit(c, x, 7.4, 1.6);
  for (const x of [12.8, 18.4]) slit(c, x, 11, 1.6);
  c.fillStyle = IK.ox; c.fillRect(15.2, 9.4, 1.8, 4.6); c.fillStyle = IK.oxDk; c.fillRect(15.2, 13.4, 1.8, 0.6);
  c.fillStyle = "#a8a8b0"; c.fillRect(15.8, 10.4, 0.6, 1.2);
  oxFlag(c, 16, 2.2, 2.2, 3.6, 2);
  // the front curtain, the great gate, and the towers
  block(c, 3, 23.4, 26, 3.2, { deck: 1 });
  block(c, 12.6, 23.8, 6.8, 5.6, { deck: 1.1 });
  c.fillStyle = IK.door; c.beginPath(); c.moveTo(14.8, 23.8); c.lineTo(14.8, 21.4); c.arc(16, 21.4, 1.2, Math.PI, 0); c.lineTo(17.2, 23.8); c.fill();
  c.fillStyle = IK.iron; for (let k = 15; k < 17.2; k += 0.7) c.fillRect(k, 20.6, 0.3, 3.2);
  for (const [x, top, h] of [[0.6, 12.8, 6.2], [26.4, 12.8, 6.2]]) { block(c, x, top, 4.4, h, { deck: 1 }); slit(c, x + 1.8, top - h + 2); }
  for (const [x, h] of [[0.4, 7.4], [26.6, 7.4]]) { block(c, x, 24, 5, h, { deck: 1.1 }); slit(c, x + 2, 24 - h + 2); slit(c, x + 2, 24 - h + 4.4); }
  oxFlag(c, 2.9, 15.4, 2.8, 2.6, 1.5); oxFlag(c, 29.1, 15.4, 2.8, 2.6, 1.5);
  oxFlag(c, 13.4, 16.8, 2.6, 2.4, 1.4);
});

// ---- the Hollowfen -----------------------------------------------------
// A drowned kingdom's fen: dead and drowned trees, weeping willows, reeds,
// barrows and standing stones, ruined chapels and a drowned village, the
// dead court's teal witch-fire, all in the fen's own muted palette.
const HF = {
  bark: "#665c5a", barkLt: "#8a807a", barkDk: "#3a3438", moss: "#5a6a48", mossDk: "#3e4a36",
  wil: ["#3e4a38", "#4a5842", "#5a6a4a"], st: "#8a8a80", stLt: "#a8a89c", stDk: "#5e605c", stDp: "#43443f",
  thatch: "#6a5a44", thatchDk: "#4a3e30", dark: "#1e1a22", fire: "#7ce0b8", fireLt: "#d4fff0", fireDk: "#3a8a74",
  water: "#1c2428", waterLt: "#5a7078",
};
// a dead tree of the fen: a crooked trunk and a few bare, twisting limbs,
// leaning its own way; some hung with weed
const fenTree = (v) => spr(`hf-tree${v}`, 10, 12, (c) => {
  const lean = ((v % 5) - 2) * 0.5, top = 2 + (v % 3) * 1.2, x0 = 5;
  c.lineCap = "round"; c.lineJoin = "round";
  const limb = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; poly(c, pts); c.stroke(); };
  // one in four is bleached pale by the water that drowned it
  const bleach = v % 4 === 2, BK = bleach ? "#948e84" : HF.bark, BL = bleach ? "#b8b2a4" : HF.barkLt;
  const tx = x0 + lean * 2, ty = top + 3;
  limb([[x0, 11.8], [x0 + lean * 0.6, 8.4], [tx, ty]], 1.5, BK);
  limb([[x0 - 0.3, 11.8], [x0 - 0.3 + lean * 0.6, 8.4], [tx - 0.3, ty]], 0.6, BL);
  const br = [[[tx, ty], [tx - 2, ty - 1.4], [tx - 3.2, ty - 1]], [[tx, ty], [tx + 1.8, ty - 1.8], [tx + 2.4, ty - 3]], [[tx, ty], [tx + 0.3, ty - 2.4]],
    [[x0 + lean * 0.4, 8.8], [x0 + 2.4, 7.6], [x0 + 3.6, 7.8]], [[x0 + lean * 0.3, 9.4], [x0 - 2, 8.4]]];
  br.forEach((b, k) => { if (hash(v, k + 3) < (k < 2 ? 0.85 : 0.55)) limb(b, 0.8, BK); });
  if (v % 4 === 1) { limb([[x0 - 0.8, 11.8], [x0 - 1.4, 10.8]], 0.7, BK); limb([[x0 + 0.8, 11.8], [x0 + 1.6, 11]], 0.7, BK); }
  // weed hanging from the limbs
  if (v % 3 === 0) { c.fillStyle = HF.moss; c.fillRect(tx - 2.2, ty - 1.2, 0.5, 2.2); c.fillRect(tx + 1.6, ty - 1.6, 0.5, 1.8); c.fillStyle = HF.mossDk; c.fillRect(tx - 2.2, ty + 0.6, 0.5, 0.6); }
});
// a weeping willow: a low dome of leaves spilling in long strands almost
// to the ground, lit down its western fall
const willow = (v) => spr(`hf-wil${v}`, 12, 11, (c) => {
  const [dk, mid, lt] = HF.wil;
  trunk(c, 6, 10.8, 3, HF.barkDk);
  blobBall(c, 6, 3.6, 4.4, 2.6, mid, 120 + v, { hi: 0.45, lo: 0.55, wobble: 0.1, n: 9 });
  for (let k = 0; k < 11; k++) {
    const x = 0.8 + k * 0.95, edge = Math.abs(k - 5) / 5;
    const top = 3 + edge * 1.6, len = 5.6 - edge * 1.4 + hash(v, k) * 1.2;
    if (k === 5 || k === 6) continue;
    c.fillStyle = k < 5 ? (k % 2 ? mid : "#6a7a52") : k % 2 ? dk : mid;
    c.fillRect(x, top, 0.55, len);
  }
  c.fillStyle = "#6a7a52"; c.fillRect(3, 1.4, 2.4, 0.6); c.fillRect(2.2, 2.2, 1.2, 0.6);
});
// a reedbed: pale straw and olive stems with brown cattail heads
const reedbed = (v) => spr(`hf-reed${v}`, 7, 5, (c) => {
  const n = 6 + (v % 3);
  for (let k = 0; k < n; k++) {
    const x = 0.6 + (k / (n - 1)) * 5.6 + (hash(v, k) - 0.5) * 0.5, h = 2.4 + hash(v, k + 9) * 2.2;
    c.fillStyle = k % 3 === 0 ? "#a09466" : k % 3 === 1 ? "#6e7446" : "#86865a";
    c.fillRect(x, 4.9 - h, 0.5, h);
    if (hash(v, k + 20) < 0.4) { c.fillStyle = "#5a3a2a"; c.fillRect(x - 0.1, 4.9 - h - 0.2, 0.7, 1.1); }
  }
  c.fillStyle = "#2e3a30"; c.fillRect(0.4, 4.5, 6.2, 0.5);
}, 0);
// ripples round whatever stands in the water
const ripple = () => spr("hf-rip", 8, 3, (c) => {
  c.strokeStyle = HF.waterLt; c.lineWidth = 0.5;
  c.beginPath(); c.ellipse(4, 1.5, 3.4, 1.1, 0, 0, Math.PI); c.stroke();
}, 0);
// a barrow of the drowned kings: a mossy mound with a stone door
const fenBarrow = (v) => spr(`hf-bar${v}`, 12, 6, (c) => {
  c.save(); c.beginPath(); c.rect(0, 0, 12, 5.99); c.clip();
  ball(c, 6, 6, 5.8, 5, v % 2 ? "#4e5a3c" : "#465236", { hi: 0.45, lo: 0.5, fx: -0.5, fy: -0.7 });
  c.restore();
  c.fillStyle = HF.stLt; c.fillRect(4.4, 2.6, 3.2, 0.8);
  c.fillStyle = HF.st; c.fillRect(4.6, 3.4, 0.7, 2.6); c.fillRect(6.7, 3.4, 0.7, 2.6);
  c.fillStyle = HF.dark; c.fillRect(5.3, 3.4, 1.4, 2.6);
  if (v % 3 === 0) { c.fillStyle = HF.fire; c.fillRect(5.7, 4.2, 0.6, 0.6); }
});
// a standing stone, grey-green and lichened
const fenStone = (v) => spr(`hf-men${v}`, 3.4, 6.4, (c) => {
  const h = 4.6 + (v % 3) * 0.6;
  c.fillStyle = HF.st; poly(c, [[0.4, 6.2], [0.6, 6.2 - h + 0.8], [1.6, 6.2 - h], [2.8, 6.2 - h + 0.9], [3, 6.2]]); c.fill();
  c.fillStyle = HF.stDk; c.fillRect(2, 6.2 - h + 0.6, 1, h - 0.6);
  c.fillStyle = HF.stLt; c.fillRect(0.6, 6.2 - h + 0.8, 0.6, h * 0.5);
  c.fillStyle = HF.moss; c.fillRect(0.5, 5.2, 2.4, 1);
});
// a cairn: a heap of grey stones
const fenCairn = (v) => spr(`hf-cairn${v}`, 6, 5, (c) => {
  ball(c, 3, 3.6, 2.8, 1.5, "#74766e", { hi: 0.4, lo: 0.5 });
  ball(c, 2.6 + (v % 2) * 0.6, 2.2, 1.8, 1.2, "#828478", { hi: 0.4, lo: 0.5 });
  ball(c, 3.2, 1.1, 1, 0.9, "#909286", { hi: 0.4, lo: 0.5 });
});
// grave markers: leaning stones and a cross or two
const graves = (v) => spr(`hf-graves${v}`, 8, 4, (c) => {
  for (let k = 0; k < 4; k++) {
    const x = 0.6 + k * 1.9, y = 3.8 - (k % 2) * 0.6, lean = (hash(v, k) - 0.5) * 0.8;
    c.fillStyle = HF.st;
    if (hash(v, k + 5) < 0.3) { c.fillRect(x + 0.3, y - 2.4, 0.5, 2.4); c.fillRect(x - 0.1, y - 1.9, 1.3, 0.5); }
    else { poly(c, [[x, y], [x + lean, y - 1.8], [x + 0.5 + lean, y - 2.2], [x + 1 + lean, y - 1.8], [x + 1, y]]); c.fill(); c.fillStyle = HF.stDk; c.fillRect(x + 0.6, y - 1.6, 0.4, 1.6); }
  }
});
// a ruined chapel: roofless, its gable standing with an empty window, the
// bell-cote broken, a rafter or two left
const chapel = (v) => spr(`hf-chapel${v}`, 14, 13, (c) => {
  // the nave's side walls, broken to different heights
  c.fillStyle = HF.st; poly(c, [[1, 12.6], [1, 7], [3, 6.6], [4.4, 8], [6, 7.2], [7.6, 8.6], [9, 12.6]]); c.fill();
  c.fillStyle = HF.stDk; c.fillRect(1, 11.8, 8, 0.8);
  // the open window bays
  c.fillStyle = HF.dark; for (const x of [2.2, 5.4]) { c.fillRect(x, 9, 1.1, 2); c.beginPath(); c.arc(x + 0.55, 9, 0.55, Math.PI, 0); c.fill(); }
  // the west gable: tall, pointed, an empty lancet, a broken cote
  c.fillStyle = HF.st; poly(c, [[8.4, 12.6], [8.4, 5.2], [10.6, 2.4], [12.8, 5.2], [12.8, 12.6]]); c.fill();
  c.fillStyle = HF.stDk; poly(c, [[10.6, 2.4], [12.8, 5.2], [12.8, 12.6], [11.4, 12.6], [11.4, 3.4]]); c.fill();
  c.fillStyle = HF.stLt; c.fillRect(8.4, 5.2, 0.6, 7.4);
  c.fillStyle = HF.st; c.fillRect(9.8, 0.4, 1.6, 2.4); c.fillStyle = HF.stDk; c.fillRect(10.8, 0.8, 0.6, 2);
  c.fillStyle = HF.dark; c.fillRect(10.1, 1.2, 0.6, 1); c.beginPath(); c.moveTo(9.8, 8.4); c.lineTo(10.6, 6.6); c.lineTo(11.4, 8.4); c.lineTo(11.4, 10.8); c.lineTo(9.8, 10.8); c.fill();
  c.fillStyle = HF.dark; c.fillRect(10, 11, 1.4, 1.6);
  // what's left of the roof
  c.fillStyle = HF.barkDk; c.fillRect(2.4, 6, 0.5, 2.4); c.fillRect(5.6, 6.6, 0.5, 1.8);
  // ivy and weed
  c.fillStyle = HF.moss; c.fillRect(1, 7.4, 0.8, 3); c.fillRect(8.4, 9, 0.8, 3.6); c.fillStyle = HF.mossDk; c.fillRect(3.8, 11.4, 2, 0.6);
  if (v % 2) { c.fillStyle = HF.fire; c.fillRect(10.4, 9, 0.5, 0.6); c.fillRect(2.6, 9.8, 0.4, 0.5); }
});
// a drowned house: a cottage sunk to its sills, its thatch fallen in
const drowned = (v) => spr(`hf-drown${v}`, 8, 7, (c) => {
  const w = 5.4, x = 1.2;
  c.fillStyle = "#8e8676"; c.fillRect(x, 3.2, w, 3);
  c.fillStyle = "#6a6458"; c.fillRect(x + w * 0.64, 3.2, w * 0.36, 3);
  c.fillStyle = HF.dark; c.fillRect(x + 1, 4.2, 0.9, 1.2); c.fillRect(x + 3.2, 4.2, 0.9, 1.2);
  // the roof: whole thatch, or a broken one with bare rafters
  if (v % 3 === 0) {
    c.fillStyle = HF.thatch; poly(c, [[x - 0.4, 3.4], [x + w / 2, 0.6], [x + w + 0.4, 3.4]]); c.fill();
    c.fillStyle = HF.thatchDk; poly(c, [[x + w / 2, 0.6], [x + w + 0.4, 3.4], [x + w / 2 + 0.6, 3.4]]); c.fill();
    c.fillStyle = HF.dark; poly(c, [[x + 1.2, 3.2], [x + 2.2, 1.8], [x + 3.4, 2.6], [x + 2.6, 3.2]]); c.fill();
  } else {
    c.fillStyle = HF.thatch; poly(c, [[x - 0.4, 3.4], [x + 1.6, 1.4], [x + 2, 3.4]]); c.fill();
    c.fillStyle = HF.barkDk;
    for (let k = 0; k < 3; k++) { poly(c, [[x + 2.2 + k * 1.1, 3.4], [x + 2.4 + k * 1.1, 3.4], [x + w / 2 + 0.2, 0.8 + k * 0.3], [x + w / 2, 0.8 + k * 0.3]]); c.fill(); }
    c.fillRect(x + 1.2, 1.2, w - 1.6, 0.4);
  }
  // the water it stands in
  c.fillStyle = HF.water; c.fillRect(0, 5.6, 8, 1.3);
  c.fillStyle = HF.waterLt; c.fillRect(0.6, 5.6, 1.8, 0.4); c.fillRect(5.4, 6.2, 1.6, 0.4);
});
// the drowned village itself: roofs and a broken spire standing out of a
// sheet of black water
const drownedVillage = () => spr("hf-village", 22, 13, (c) => {
  c.fillStyle = HF.water; c.beginPath(); c.ellipse(11, 10.4, 10.6, 2.5, 0, 0, Math.PI * 2); c.fill();
  const hut = (x, y, w, broken) => {
    c.fillStyle = "#8e8676"; c.fillRect(x, y - 1.6, w, 1.6);
    c.fillStyle = "#6a6458"; c.fillRect(x + w * 0.64, y - 1.6, w * 0.36, 1.6);
    c.fillStyle = HF.dark; c.fillRect(x + 0.8, y - 1.2, 0.8, 0.8);
    c.fillStyle = HF.thatch; poly(c, broken ? [[x - 0.4, y - 1.4], [x + w * 0.4, y - 3.8], [x + w * 0.5, y - 1.4]] : [[x - 0.4, y - 1.4], [x + w / 2, y - 4.2], [x + w + 0.4, y - 1.4]]); c.fill();
    c.fillStyle = HF.thatchDk; if (!broken) { poly(c, [[x + w / 2, y - 4.2], [x + w + 0.4, y - 1.4], [x + w / 2 + 0.6, y - 1.4]]); c.fill(); }
    else { c.fillStyle = HF.barkDk; for (let k = 0; k < 3; k++) c.fillRect(x + w * 0.5 + k * 0.9, y - 3.6 + k * 0.5, 0.4, 2.2 - k * 0.5); }
  };
  // the church, its spire snapped
  c.fillStyle = "#8a8a80"; c.fillRect(9.4, 2.4, 3, 7.4); c.fillStyle = "#5e605c"; c.fillRect(11.2, 2.4, 1.2, 7.4);
  c.fillStyle = HF.thatchDk; poly(c, [[9, 2.6], [10.2, 0.2], [11.2, 1.4], [12.8, 2.6]]); c.fill();
  c.fillStyle = HF.dark; c.fillRect(10.2, 4, 0.8, 1.6);
  hut(2, 10, 4.6, false); hut(15, 9.8, 4.4, true); hut(6.4, 11.4, 3.8, true); hut(13.2, 11.8, 4, false);
  c.fillStyle = HF.waterLt; c.fillRect(1.4, 10.6, 1.8, 0.4); c.fillRect(8.2, 12, 2, 0.4); c.fillRect(18.4, 11, 2, 0.4); c.fillRect(11.6, 10, 1.4, 0.4);
  c.fillStyle = HF.fire; c.fillRect(3.2, 8.8, 0.5, 0.5);
});
// the bell tower of Bellmarsh, leaning in its mire, its bell still hung
const bellTower = () => spr("hf-bell", 8, 15, (c) => {
  c.save(); c.translate(4, 13.4); c.rotate(0.12);
  c.fillStyle = HF.st; c.fillRect(-2, -11, 4, 11);
  c.fillStyle = HF.stDk; c.fillRect(0.6, -11, 1.4, 11);
  c.fillStyle = HF.dark; c.fillRect(-1.2, -9.6, 2.4, 2.6);
  c.fillStyle = "#8a7a4a"; c.fillRect(-0.8, -8.8, 1.6, 1.6); c.fillStyle = "#5a8a78"; c.fillRect(-0.8, -7.6, 1.6, 0.4);
  c.fillStyle = HF.thatchDk; poly(c, [[-2.6, -10.8], [0, -13], [2.6, -10.8]]); c.fill();
  c.fillStyle = HF.moss; c.fillRect(-2, -3, 0.8, 3);
  c.restore();
  c.fillStyle = HF.water; c.fillRect(0, 13.4, 8, 1.4);
  c.fillStyle = HF.waterLt; c.fillRect(0.4, 13.6, 1.8, 0.4); c.fillRect(5.8, 14.2, 1.6, 0.4);
});
// the lychgate: a roofed gate into a drowned churchyard
const lychgate = () => spr("hf-lych", 9, 7, (c) => {
  c.fillStyle = HF.barkDk; c.fillRect(1.4, 3, 0.7, 3.8); c.fillRect(6.9, 3, 0.7, 3.8);
  c.fillStyle = HF.bark; c.fillRect(1.4, 3, 0.4, 3.8); c.fillRect(6.9, 3, 0.4, 3.8);
  c.fillStyle = HF.thatch; poly(c, [[0.2, 3.4], [2, 0.6], [7, 0.6], [8.8, 3.4]]); c.fill();
  c.fillStyle = HF.thatchDk; c.fillRect(0.2, 2.8, 8.6, 0.6); c.fillStyle = HF.moss; c.fillRect(2.4, 0.6, 3, 0.5);
  c.fillStyle = HF.fire; c.fillRect(4.2, 3.4, 0.6, 0.8);
});
// a mossy post of the old causeway
const fenPost = (v) => spr(`hf-post${v % 2}`, 1.6, 3.2, (c) => {
  c.fillStyle = v % 2 ? HF.bark : "#6e6c66"; c.fillRect(0.3, 0.4, 1, 2.8);
  c.fillStyle = v % 2 ? HF.barkLt : HF.stLt; c.fillRect(0.3, 0.4, 1, 0.5);
  c.fillStyle = HF.moss; c.fillRect(0.3, 2.4, 1, 0.8);
});
// a lantern post of Lanternfen: a crooked stake with a hooded lamp, its
// witch-fire burning teal (or, on a few, a warm candle)
const lanternPost = (v) => spr(`hf-lamp${v % 3}`, 3, 6, (c) => {
  c.fillStyle = HF.barkDk; c.fillRect(1, 1.4, 0.6, 4.6); c.fillRect(1, 1.4, 1.4, 0.4);
  c.fillStyle = HF.bark; c.fillRect(1, 1.4, 0.3, 4.6);
  c.fillStyle = "#2e3038"; c.fillRect(1.7, 1.8, 1, 0.4); c.fillRect(1.7, 3.2, 1, 0.3);
  c.fillStyle = v % 3 === 2 ? "#f2c060" : HF.fire; c.fillRect(1.8, 2.2, 0.8, 1);
  c.fillStyle = v % 3 === 2 ? "#fff0b8" : HF.fireLt; c.fillRect(2, 2.4, 0.4, 0.5);
  c.fillStyle = HF.moss; c.fillRect(0.8, 5.4, 1.2, 0.6);
});
// the Dead Weir: a broken timber weir across the black river, the water
// spilling white through its gaps
const weir = () => spr("hf-weir", 6, 9, (c) => {
  c.fillStyle = HF.stDk; for (let k = 0; k < 5; k++) if (k !== 2) c.fillRect(2 + (k % 2) * 0.4, 0.6 + k * 1.7, 1.8, 1.4);
  c.fillStyle = HF.stLt; for (let k = 0; k < 5; k++) if (k !== 2) c.fillRect(2 + (k % 2) * 0.4, 0.6 + k * 1.7, 1.8, 0.5);
  c.fillStyle = HF.barkLt; c.fillRect(2.6, 3.8, 0.5, 1.6);
  c.fillStyle = "#c8d8d8"; c.fillRect(3.8, 1.2, 1.2, 0.4); c.fillRect(3.6, 4.2, 1.8, 0.5); c.fillRect(4.2, 5, 1, 0.4); c.fillRect(4, 7.4, 1.2, 0.4);
  c.fillStyle = HF.waterLt; c.fillRect(5, 3.2, 0.8, 0.3); c.fillRect(4.8, 6.4, 0.9, 0.3);
});
// will-o'-the-wisps: a teal light and its glow
const wisp = (v) => spr(`hf-wisp${v}`, 3, 3, (c) => {
  c.fillStyle = HF.fireDk; c.fillRect(0.5, 1, 2, 1); c.fillRect(1, 0.5, 1, 2);
  c.fillStyle = v % 2 ? HF.fire : HF.fireLt; c.fillRect(1, 1, 1, 1);
}, 0);
// crows over the dead places
const crows = (v) => spr(`hf-crows${v}`, 7, 4, (c) => {
  c.fillStyle = "#1a161c";
  for (const [x, y] of [[0.6, 1.4], [3.2, 0.4], [4.8, 2.4]].slice(0, 2 + (v % 2))) { c.fillRect(x, y, 1.4, 0.5); c.fillRect(x + 0.4, y + 0.4, 0.6, 0.5); }
}, 0);
// the moon's reflection on the Stillmere
const moonGlint = () => spr("hf-moon", 10, 5, (c) => {
  c.fillStyle = "#6a7e88"; c.fillRect(2.6, 0.6, 4.8, 0.6); c.fillRect(1.4, 2.4, 7.2, 0.6); c.fillRect(3, 4, 4, 0.6);
  c.fillStyle = "#dce8e8"; c.fillRect(3.6, 1.2, 2.8, 1.2); c.fillRect(4.2, 3, 1.6, 0.8);
}, 0);
// a ferryman's punt on the black water
const punt = () => spr("hf-punt", 9, 6, (c) => {
  c.fillStyle = HF.barkDk; poly(c, [[0.6, 4], [8.4, 4], [7.4, 5.4], [1.4, 5.4]]); c.fill();
  c.fillStyle = HF.bark; c.fillRect(0.8, 4, 7.4, 0.5);
  c.fillStyle = "#2a2434"; c.fillRect(4, 1.4, 1.4, 2.6); c.fillStyle = "#e0d8c4"; c.fillRect(4.2, 0.6, 1, 0.9);
  c.fillStyle = HF.bark; poly(c, [[6.4, 0], [6.8, 0], [3, 5.6], [2.6, 5.6]]); c.fill();
  c.fillStyle = HF.fire; c.fillRect(7.6, 2.2, 0.7, 0.7);
});
// the Throne of Dust: the drowned king's hall, broken open to the sky, the
// throne still on its dais under a shattered arch, witch-fire in the ruin
const throneRuin = () => spr("hf-throne", 28, 22, (c) => {
  const st = "#7c7882", dk = "#4c4856", lt = "#a09ca6", dp = "#26222c";
  // the overgrown court
  c.fillStyle = "#3e4638"; c.fillRect(4, 11, 20, 8);
  c.fillStyle = "#56525c"; for (let k = 0; k < 6; k++) c.fillRect(6 + k * 3, 13 + (k % 2) * 1.6, 1.8, 1);
  // the back wall, broken, with the great arch and two windows
  c.fillStyle = st; poly(c, [[3.4, 12.4], [3.4, 5.4], [6, 4.4], [7, 6.6], [9, 3], [14, 1], [19, 3], [21, 6], [22.4, 4.6], [24.6, 5.8], [24.6, 12.4]]); c.fill();
  c.fillStyle = dk; poly(c, [[19, 3], [21, 6], [22.4, 4.6], [24.6, 5.8], [24.6, 12.4], [19, 12.4]]); c.fill();
  c.fillStyle = lt; c.fillRect(3.4, 5.4, 0.8, 7); poly(c, [[9, 3], [14, 1], [14, 1.8], [9.4, 3.8]]); c.fill();
  c.fillStyle = dp; c.beginPath(); c.moveTo(10.8, 12.4); c.lineTo(10.8, 7); c.arc(14, 7, 3.2, Math.PI, 0); c.lineTo(17.2, 12.4); c.fill();
  for (const x of [5.6, 21.4]) { c.fillRect(x, 7.4, 1.2, 2.4); c.beginPath(); c.arc(x + 0.6, 7.4, 0.6, Math.PI, 0); c.fill(); }
  // the throne on its dais, verdigris and bronze, a crown left on it
  c.fillStyle = "#5e5a64"; c.fillRect(11.4, 11, 5.2, 1.6); c.fillStyle = "#3e3a46"; c.fillRect(11.4, 12, 5.2, 0.6);
  c.fillStyle = "#8a7a4a"; c.fillRect(12.8, 6.6, 2.4, 4.4); c.fillStyle = "#5a8a78"; c.fillRect(12.8, 6.6, 2.4, 0.7); c.fillRect(12.4, 9, 3.2, 0.8);
  c.fillStyle = "#c8a84a"; c.fillRect(13.4, 5.8, 1.2, 0.8);
  // witch-fire braziers either side
  for (const x of [10, 17.2]) { c.fillStyle = "#2e3038"; c.fillRect(x, 10.2, 0.8, 1.8); c.fillStyle = HF.fire; c.fillRect(x - 0.2, 9, 1.2, 1.2); c.fillStyle = HF.fireLt; c.fillRect(x + 0.1, 8.6, 0.6, 0.8); }
  // broken towers at the corners
  for (const [x, top, w] of [[0.4, 2.4, 4], [23.6, 3.8, 4]]) {
    c.fillStyle = st; poly(c, [[x, 19.6], [x, top + 1], [x + w * 0.3, top], [x + w * 0.55, top + 1.8], [x + w, top + 0.6], [x + w, 19.6]]); c.fill();
    c.fillStyle = dk; c.fillRect(x + w * 0.62, top + 1, w * 0.38, 18.6 - top);
    c.fillStyle = lt; c.fillRect(x, top + 1, 0.7, 18.6 - top);
    c.fillStyle = dp; c.fillRect(x + w * 0.3, top + 4, 1, 1.6); c.fillRect(x + w * 0.3, top + 9, 1, 1.6);
    c.fillStyle = HF.fire; c.fillRect(x + w * 0.3 + 0.2, top + 4.4, 0.6, 0.8);
  }
  // the front wall: two stubs, the rest fallen into the court
  for (const [x0, x1, t0, t1] of [[4.4, 9.6, 15.6, 16.8], [18.4, 23.6, 16.6, 15.2]]) {
    c.fillStyle = st; poly(c, [[x0, 19.8], [x0, t0], [(x0 + x1) / 2, Math.min(t0, t1) - 0.8], [x1, t1], [x1, 19.8]]); c.fill();
    c.fillStyle = dk; c.fillRect(x0, 19, x1 - x0, 0.8); c.fillRect(x1 - 1.6, t1, 1.6, 19.8 - t1);
    c.fillStyle = lt; c.fillRect(x0, t0, 0.6, 19.8 - t0);
  }
  c.fillStyle = "#6a666e"; for (const [x, y] of [[10.6, 19.4], [12.8, 20.2], [15.6, 19.6], [17, 20.6]]) c.fillRect(x, y, 1.4, 0.9);
  // weed and moss on the stones
  c.fillStyle = HF.moss; c.fillRect(3.4, 10, 0.8, 2.4); c.fillRect(24, 9, 0.8, 3); c.fillRect(6, 18.8, 2, 0.6); c.fillRect(20, 4.6, 1.4, 0.6);
});
// a wreck on the strand
const wreck = () => spr("hf-wreck", 14, 7, (c) => {
  c.fillStyle = HF.barkDk; poly(c, [[0.6, 5.6], [2, 3.4], [11, 2.6], [13.4, 4.6], [12, 6.4], [2, 6.6]]); c.fill();
  c.fillStyle = HF.bark; c.fillRect(2.2, 3.2, 8.6, 0.6);
  c.fillStyle = HF.barkDk; for (const x of [3.6, 5.6, 7.6, 9.6]) c.fillRect(x, 0.8 + (x % 2), 0.6, 3);
  c.fillStyle = "#6a5a44"; poly(c, [[10.6, 3], [11.2, 0], [11.6, 0.2], [11.2, 3]]); c.fill();
  c.fillStyle = HF.water; c.fillRect(0, 6, 14, 1); c.fillStyle = "#e4eee0"; c.fillRect(1, 6, 2, 0.5); c.fillRect(9.6, 6.2, 2.4, 0.5);
});

// ---- the Rimewater ------------------------------------------------------
// The Rime Clans' frigid sea country: snow and black rock, longhouses of dark
// timber under snow-laden roofs with their smoke going up, rune stones, the
// ribs of whales on the strands, longships drawn up and under sail, sea
// stacks, bergs and the Jarl's hall at the head of his fjord.
const RK = {
  wood: "#5a3e2a", woodDk: "#3a281c", woodLt: "#7a5838", snow: "#f2f7fa", snowDk: "#bccbd8",
  stone: "#6e727a", stoneLt: "#9a9ea6", stoneDk: "#464a54", bone: "#e6dfcc", boneDk: "#b4aa94",
  red: "#a8382c", redLt: "#c45040", sail: "#e8e0cc", gold: "#c8b060", blue: "#5a7890", blueLt: "#7898b0",
  smoke: "#c6ccd6", smokeDk: "#959cab", fire: "#f2a040", door: "#2a2230",
  ice: "#dceaf2", iceLt: "#f6fbfd", iceDk: "#9ebcd0", iceDp: "#6f98b4",
};
// the Rimewater's peaks carry snow far down their flanks, over blue-black rock
const RIMEPK = { key: "rm", lit: "#c4ced8", mid: "#8a94a2", dark: "#454b58", snow: "#f6fafc", snowDk: "#b8c8d8" };
const SNOWHILL = { key: "w", mid: "#d6e0e8" };
const SNOWHILL2 = { key: "w2", mid: "#c8d4de" };
// a snow-laden roof over dark timber walls: x, ground y, length, wall height
const longRoof = (c, x, y, w, h, v) => {
  c.fillStyle = RK.wood; c.fillRect(x, y - h, w, h);
  c.fillStyle = RK.woodDk; c.fillRect(x + w * 0.7, y - h, w * 0.3, h);
  c.fillStyle = RK.woodLt; for (let k = 1; k < w - 0.5; k += 1.4) c.fillRect(x + k, y - h, 0.35, h);
  // the roof: a long low hull turned over, its ridge sagging to the ends
  const rh = h * 1.15 + 1, top = y - h - rh;
  c.fillStyle = "#4a3c34"; poly(c, [[x - 0.7, y - h + 0.5], [x + 0.3, top + 0.7], [x + w * 0.5, top], [x + w - 0.3, top + 0.7], [x + w + 0.7, y - h + 0.5]]); c.fill();
  // snow lying on it, ragged along its lower edge
  c.fillStyle = RK.snow; const sn = [[x - 0.2, y - h - rh * 0.35], [x + 0.3, top + 0.7], [x + w * 0.5, top], [x + w - 0.3, top + 0.7], [x + w + 0.2, y - h - rh * 0.35]];
  for (let k = 8; k >= 0; k--) sn.push([x + (w * k) / 8, y - h - rh * (0.3 + ((k + v) % 3) * 0.12)]);
  poly(c, sn); c.fill();
  c.fillStyle = RK.snowDk; c.fillRect(x + w * 0.62, top + 0.6, w * 0.36, 0.5);
  // the gable boards crossed above each end, carved into beast heads
  c.strokeStyle = RK.woodDk; c.lineWidth = 0.5;
  for (const gx of [x + 0.3, x + w - 0.3]) { poly(c, [[gx - 0.9, top - 0.6], [gx + 0.5, top + 1.4]]); c.stroke(); poly(c, [[gx + 0.9, top - 0.6], [gx - 0.5, top + 1.4]]); c.stroke(); }
  c.fillStyle = RK.door; c.fillRect(x + w * 0.38, y - 1.4, 1, 1.4);
  c.fillStyle = RK.fire; c.fillRect(x + w * 0.18, y - h + 0.4, 0.5, 0.5);
};
// smoke going up from a roof hole, leaning with the wind
const smoke = (c, x, y, n = 3) => {
  for (let k = 0; k < n; k++) {
    const r = 0.95 + k * 0.42, px = x + k * 1.2, py = y - k * 1.9;
    c.fillStyle = k ? RK.smoke : RK.smokeDk; c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
  }
};
// a longhouse, its smoke rising
const longhouse = (v) => spr(`rm-long${v}`, 12, 13, (c) => {
  longRoof(c, 0.9, 12.6, 8.6 - (v % 2) * 1.6, 2, v);
  smoke(c, 3.4 + (v % 3) * 0.6, 6.4, 3);
});
// a steading: the longhouse, a storehouse on posts and a byre
const steadingR = (v) => spr(`rm-stead${v}`, 14, 13, (c) => {
  longRoof(c, 0.9, 12.6, 7.4, 1.9, v);
  if (v % 2) longRoof(c, 9.2, 12.6, 3.6, 1.4, v + 1);
  else {
    c.fillStyle = RK.woodDk; c.fillRect(9.6, 11.4, 0.5, 1.2); c.fillRect(11.8, 11.4, 0.5, 1.2);
    c.fillStyle = RK.wood; c.fillRect(9.2, 9.6, 3.6, 1.9);
    c.fillStyle = RK.snow; poly(c, [[8.8, 9.8], [11, 7.8], [13.2, 9.8]]); c.fill();
  }
  smoke(c, 3 + (v % 2), 6.6, 3);
});
// a dark spruce of the sheltered south, snow lying on its tiers
const rimePine = (v) => spr(`rm-pine${v}`, 6, 11, (c) => {
  const col = ["#22382f", "#273e34", "#1f352e", "#2a4036"][v % 4], tall = v % 2 ? 1.2 : 0;
  trunk(c, 3, 10.8, 2, "#3e3026");
  cone(c, 3, 4.6 - tall * 0.2, 2.7, 5, col, { scallops: 3, sag: 0.6, hi: 0.3, lo: 0.55 });
  cone(c, 3, 2.2 - tall * 0.6, 2.1, 4, col, { scallops: 2, sag: 0.5, hi: 0.35, lo: 0.5 });
  cone(c, 3, 0.6 - tall * 0.8 + 0.8, 1.3, 2.8, col, { scallops: 2, sag: 0.4, hi: 0.4, lo: 0.45 });
  // snow on the tiers' shoulders, the windward (west) side heavier
  c.fillStyle = RK.snow;
  for (const [ty, hw] of [[4.6 - tall * 0.2 + 1.2, 1.9], [2.2 - tall * 0.6 + 1, 1.4], [1.4 - tall * 0.8 + 0.6, 0.8]]) {
    poly(c, [[3 - hw, ty + 0.9], [3, ty - 0.2], [3 + hw * 0.6, ty + 0.5], [3 + hw * 0.2, ty + 0.9]]); c.fill();
  }
});
// a rune stone: a grey slab, a red rune-serpent winding on it, snow on its head
const runeStone = (v) => spr(`rm-rune${v % 3}`, 2.8, 5, (c) => {
  const h = 3.8 + (v % 3) * 0.4;
  c.fillStyle = RK.stone; poly(c, [[0.3, 4.8], [0.3, 4.8 - h + 1], [1, 4.8 - h], [1.9, 4.8 - h + 0.3], [2.5, 4.8 - h + 1.2], [2.5, 4.8]]); c.fill();
  c.fillStyle = RK.stoneDk; c.fillRect(1.8, 4.8 - h + 0.8, 0.7, h - 0.8);
  c.fillStyle = RK.snow; poly(c, [[0.3, 4.8 - h + 1], [1, 4.8 - h], [1.9, 4.8 - h + 0.3], [2.3, 4.8 - h + 0.9], [1.2, 4.8 - h + 0.8]]); c.fill();
  c.strokeStyle = RK.red; c.lineWidth = 0.35;
  c.beginPath(); c.moveTo(0.9, 4.4); c.quadraticCurveTo(0.6, 4.8 - h + 2.2, 1.4, 4.8 - h + 1.6); c.quadraticCurveTo(1.8, 3, 1.1, 3.6); c.stroke();
});
// the ribs of a whale on the shingle, and its jaw
const whaleRibs = (v) => spr(`rm-whale${v % 2}`, 8, 4.4, (c) => {
  c.strokeStyle = RK.bone; c.lineWidth = 0.55; c.lineCap = "round";
  for (let k = 0; k < 4; k++) {
    const x = 1.4 + k * 1.5, hgt = 3.2 - Math.abs(k - 1.3) * 0.5;
    c.beginPath(); c.moveTo(x - 0.4, 4.1); c.quadraticCurveTo(x - 0.8, 4.1 - hgt, x + 0.9, 4.1 - hgt * 0.8); c.stroke();
  }
  c.strokeStyle = RK.boneDk; c.lineWidth = 0.5;
  c.beginPath(); c.moveTo(0.6, 4); c.lineTo(7.4, 4); c.stroke();
  if (v % 2) { c.strokeStyle = RK.bone; c.beginPath(); c.moveTo(7.6, 4); c.quadraticCurveTo(7.2, 2, 5.8, 1.4); c.stroke(); }
});
// a longship drawn up on the strand: dragon prow, shields along her side,
// the striped sail furled on its yard
const shipBeached = (v) => spr(`rm-beach${v % 2}`, 10, 4.6, (c) => {
  c.save(); if (v % 2) { c.translate(10, 0); c.scale(-1, 1); }
  c.fillStyle = RK.wood; poly(c, [[0.4, 1.4], [1.4, 3], [2.4, 4.2], [7.8, 4.2], [8.8, 3], [9.6, 1.4], [8.8, 2.6], [1.2, 2.6]]); c.fill();
  c.fillStyle = RK.woodDk; c.fillRect(2.2, 3.6, 6, 0.6);
  for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? RK.gold : RK.blue; c.beginPath(); c.arc(2.6 + k * 1.2, 2.9, 0.5, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = RK.sail; c.fillRect(2.4, 1.6, 5.6, 0.7);
  c.fillStyle = RK.red; c.fillRect(3.4, 1.6, 0.8, 0.7); c.fillRect(5.2, 1.6, 0.8, 0.7);
  c.fillStyle = RK.woodDk; c.fillRect(0.2, 0.4, 0.7, 1.4); c.fillRect(9.2, 0.6, 0.6, 1.2);
  c.restore();
}, 1);
// a longship under sail: the square sail striped red and white
const shipSail = (v) => spr(`rm-sail${v % 2}`, 12, 11, (c) => {
  c.save(); if (v % 2) { c.translate(12, 0); c.scale(-1, 1); }
  c.fillStyle = RK.wood; poly(c, [[0.4, 6.6], [1.6, 8.4], [2.8, 9.4], [9.4, 9.4], [10.6, 8.4], [11.6, 6.6], [10.4, 7.8], [1.6, 7.8]]); c.fill();
  c.fillStyle = RK.woodDk; c.fillRect(2.6, 8.8, 7, 0.6);
  for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? RK.gold : RK.blue; c.beginPath(); c.arc(2.8 + k * 1.3, 8, 0.5, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = RK.woodDk; c.fillRect(5.7, 0.4, 0.6, 7.6); c.fillRect(0.2, 5.4, 0.7, 1.6);
  // the sail, bellied a little, five stripes
  for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? RK.sail : RK.red; poly(c, [[2.6 + k * 1.36, 1.2], [2.6 + (k + 1) * 1.36, 1.2], [2.8 + (k + 1) * 1.36, 6.4], [2.4 + k * 1.36, 6.4]]); c.fill(); }
  c.fillStyle = RK.woodDk; c.fillRect(2.2, 0.8, 7.6, 0.5);
  // her wake
  c.fillStyle = "#e4eee0"; c.fillRect(9.6, 9.8, 2, 0.5); c.fillRect(0.6, 10, 1.4, 0.5);
  c.restore();
});
// a sea stack: a pillar of black rock, snow on its crown, surf at its foot
const seaStack = (v) => spr(`rm-stack${v % 3}`, 5, 9, (c) => {
  const h = 6.4 + (v % 3) * 0.9, tilt = (v % 2) * 0.5;
  c.fillStyle = "#3c414c"; poly(c, [[0.6, 8.2], [1 + tilt, 8.2 - h], [3.4 + tilt, 8.2 - h - 0.4], [4.4, 8.2]]); c.fill();
  c.fillStyle = "#5a606c"; poly(c, [[0.6, 8.2], [1 + tilt, 8.2 - h], [2 + tilt, 8.2 - h], [1.8, 8.2]]); c.fill();
  c.fillStyle = RK.snow; poly(c, [[0.9 + tilt, 8.2 - h + 0.8], [1 + tilt, 8.2 - h], [3.4 + tilt, 8.2 - h - 0.4], [3.6 + tilt, 8.2 - h + 0.6], [2.4 + tilt, 8.2 - h + 1.2]]); c.fill();
  c.fillStyle = "#e4eee0"; c.fillRect(0, 8.2, 1.4, 0.6); c.fillRect(3.6, 8.2, 1.4, 0.6);
});
// a berg: a slab of old ice, its top lit, its east face in blue shadow
const berg = (v) => spr(`rm-berg${v % 3}`, 9, 7, (c) => {
  const w = 6 + (v % 3), t = 1.6 + (v % 2);
  c.fillStyle = "#4f86a4"; c.fillRect(0.6, 5.6, w + 1.4, 1);
  c.fillStyle = RK.iceDk; poly(c, [[1, 5.8], [1.4, t + 1.4], [w * 0.55, t + 1], [w + 1, t + 1.8], [w + 1.4, 5.8]]); c.fill();
  c.fillStyle = RK.ice; poly(c, [[1, 5.8], [1.4, t + 1.4], [w * 0.55, t + 1], [w * 0.5, 5.8]]); c.fill();
  c.fillStyle = RK.iceLt; poly(c, [[1.4, t + 1.4], [2.4, t], [w * 0.6, t - 0.4], [w + 0.6, t + 0.6], [w + 1, t + 1.8], [w * 0.55, t + 1]]); c.fill();
  c.fillStyle = RK.iceDp; c.fillRect(w * 0.7, t + 2.4, 0.4, 2.6);
});
// black crags breaking the snow
const rimeCrag = (v) => spr(`rm-crag${v % 4}`, 7, 4.6, (c) => {
  const pts = [[0.4, 4.4], [1.2, 2.2 - (v % 2) * 0.6], [2.6, 1.2], [3.8, 2], [5, 0.8 + (v % 3) * 0.3], [6.6, 4.4]];
  c.fillStyle = "#3a3f4a"; poly(c, pts); c.fill();
  c.fillStyle = "#565c68"; poly(c, [[0.4, 4.4], [1.2, 2.2 - (v % 2) * 0.6], [2.6, 1.2], [2.8, 4.4]]); c.fill();
  c.fillStyle = RK.snow; poly(c, [[1.1, 2.6], [2.6, 1.2], [3.8, 2], [5, 0.8 + (v % 3) * 0.3], [5.6, 1.9], [4.2, 2.6], [2.6, 2]]); c.fill();
}, 1);
// seals hauled out on a skerry
const sealRock = (v) => spr(`rm-seal${v % 2}`, 7, 4, (c) => {
  blobBall(c, 3.5, 2.8, 3, 1.3, "#5a606a", 90 + v, { hi: 0.5, lo: 0.5 });
  for (const [x, y] of v % 2 ? [[2, 1.6], [4.6, 1.8]] : [[1.6, 1.8], [3.6, 1.4], [5.4, 1.9]]) { c.fillStyle = "#4a4448"; c.beginPath(); c.ellipse(x, y, 0.9, 0.5, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#6e6870"; c.fillRect(x - 0.6, y - 0.4, 0.5, 0.3); }
  c.fillStyle = "#e4eee0"; c.fillRect(0, 3.4, 1.4, 0.5); c.fillRect(5.6, 3.4, 1.4, 0.5);
});
// the kraken's arms breaking the firth
const krakenArms = () => spr("rm-kraken", 16, 9, (c) => {
  const col = "#6a2e4a", lt = "#9a5070";
  c.lineCap = "round";
  for (const [x, h, d] of [[3, 6, 1], [8, 8, -1], [12.6, 5, 1]]) {
    c.strokeStyle = col; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x, 8.4); c.quadraticCurveTo(x + d * 1.6, 8.4 - h * 0.6, x - d * 0.4, 8.4 - h); c.quadraticCurveTo(x - d * 1.6, 8.4 - h - 0.4, x - d * 1.2, 8.4 - h + 1.2); c.stroke();
    c.strokeStyle = lt; c.lineWidth = 0.4;
    c.beginPath(); c.moveTo(x - 0.3, 8.2); c.quadraticCurveTo(x + d * 1.2, 8.4 - h * 0.6, x - d * 0.6, 8.4 - h + 0.3); c.stroke();
  }
  c.fillStyle = "#e4eee0"; for (const x of [1.6, 4.4, 6.8, 9.4, 11.4, 14]) c.fillRect(x, 8.4, 1, 0.5);
});
// the Jarl's hall: the great mead-hall at the head of his fjord, snow on its
// long roof and beast-heads on its gables, two lesser halls behind, the
// palisade round them and a gate, braziers burning, his blue war-banner
// over all, and the smoke of the feast going up
const jarlHall = () => spr("rm-jarl", 38, 30, (c) => {
  // the lesser halls behind, and their smoke
  longRoof(c, 1.6, 18, 10, 2.2, 1);
  longRoof(c, 25.4, 17.4, 10.4, 2.2, 2);
  smoke(c, 5.4, 10.4, 3); smoke(c, 29, 9.8, 3);
  // the great hall, long and high
  longRoof(c, 7, 25.6, 23.6, 4.6, 0);
  // its carved porch and doors
  c.fillStyle = RK.woodDk; poly(c, [[16, 25.6], [16, 20.6], [18.8, 18.6], [21.6, 20.6], [21.6, 25.6]]); c.fill();
  c.fillStyle = RK.snow; poly(c, [[15.6, 20.9], [18.8, 18.2], [22, 20.9], [21, 20.9], [18.8, 19.2], [16.6, 20.9]]); c.fill();
  c.fillStyle = RK.door; c.fillRect(17.4, 21.6, 2.8, 4);
  c.fillStyle = RK.red; c.fillRect(17.4, 21.6, 0.5, 4); c.fillRect(19.7, 21.6, 0.5, 4);
  c.fillStyle = RK.gold; c.fillRect(17.2, 21, 3.2, 0.6);
  // shields hung along its walls
  for (let k = 0; k < 8; k++) { if (k === 3 || k === 4) continue; c.fillStyle = k % 2 ? RK.gold : RK.blue; c.beginPath(); c.arc(9 + k * 2.6, 23.2, 0.65, 0, Math.PI * 2); c.fill(); }
  // the gilded beast-heads rearing off its gables
  c.fillStyle = RK.gold;
  for (const [gx, d] of [[7.2, -1], [30.4, 1]]) { poly(c, [[gx, 16.4], [gx + d * 1.2, 13.4], [gx + d * 2.8, 12.6], [gx + d * 3.2, 13.6], [gx + d * 2, 14], [gx + d * 1, 16.8]]); c.fill(); }
  smoke(c, 13.4, 11.6, 4); smoke(c, 24, 12, 4);
  // the palisade round the yard, snow on its stakes, and its gate
  for (let x = 0.6; x < 37.4; x += 1.15) {
    if (x > 16.4 && x < 21.4) continue;
    const h = 2 + (Math.round(x * 10) % 3) * 0.3;
    c.fillStyle = Math.round(x * 10) % 2 ? RK.wood : RK.woodLt; c.fillRect(x, 29.6 - h, 0.95, h);
    c.fillStyle = RK.snow; c.fillRect(x, 29.6 - h - 0.3, 0.95, 0.5);
  }
  c.fillStyle = RK.woodDk; c.fillRect(16.2, 26, 0.9, 3.6); c.fillRect(20.6, 26, 0.9, 3.6); c.fillRect(16, 25.8, 5.7, 0.9);
  // braziers either side of the gate
  for (const bx of [14.6, 22.2]) { c.fillStyle = RK.stoneDk; c.fillRect(bx, 27.4, 1.3, 2.2); c.fillStyle = RK.fire; c.fillRect(bx, 26.3, 1.3, 1.1); c.fillStyle = "#ffe08a"; c.fillRect(bx + 0.35, 26.1, 0.6, 0.6); }
  // the war-banner on its pole: ice-blue, a white star of frost
  c.fillStyle = RK.woodDk; c.fillRect(33.4, 1.2, 0.7, 16.6);
  c.fillStyle = RK.blue; poly(c, [[34.1, 1.6], [37.8, 1.6], [37.8, 6.4], [36, 5.3], [34.1, 6.4]]); c.fill();
  c.fillStyle = RK.blueLt; c.fillRect(34.1, 1.6, 3.7, 0.6);
  c.fillStyle = RK.snow; c.fillRect(35.6, 2.7, 0.7, 2.2); c.fillRect(34.9, 3.45, 2.1, 0.7);
  c.fillStyle = RK.gold; c.fillRect(33.2, 0.6, 1.1, 0.8);
});

// ---- the dressing ------------------------------------------------------
// Everything that stands on the land, gathered as [sprite, x, y, anchorX,
// anchorY, shadowRx] and drawn back to front.
function* dressing(base) {
  const items = [];
  const onZone = (x, y, z, inset = 2) => {
    for (const [dx, dy] of [[0, 0], [-inset, 0], [inset, 0], [0, -inset], [0, inset]]) {
      const ax = artX(x + dx), ay = artY(y + dy);
      if (ax < 0 || ay < 0 || ax >= AW || ay >= AH) return false;
      const i = ay * AW + ax;
      if (!base.land[i] || base.zone[i] !== z) return false;
    }
    return true;
  };
  const add = (s, x, y, sh = 0, ax = null, ay = null) =>
    items.push([s, x, y, ax ?? s.width / U / 2, ay ?? s.height / U - 0.6, sh]);
  // what already stands, bucketed on a 16-unit grid (no footprint reaches
  // further than that), so asking whether a spot is free stays cheap
  const TG = 16, tgrid = new Map();
  const taken = { push(t) { const key = Math.floor(t[0] / TG) * 4096 + Math.floor(t[1] / TG); if (!tgrid.has(key)) tgrid.set(key, []); tgrid.get(key).push(t); } };
  const clearOf = (x, y, r) => {
    const gx = Math.floor(x / TG), gy = Math.floor(y / TG);
    for (let i = gx - 1; i <= gx + 1; i++) for (let j = gy - 1; j <= gy + 1; j++) {
      const list = tgrid.get(i * 4096 + j);
      if (list) for (const [tx, ty, tr] of list) if (Math.hypot(x - tx, y - ty) <= (r + tr) * 0.5) return false;
    }
    return true;
  };
  const free = (x, y, r) => !busy(x, y, r * 0.5) && clearOf(x, y, r);
  // scatter a clump of things in an ellipse on one zone
  const clump = (cx, cy, rx, ry, z, step, pick, seed, sh = 1.6, r = 2) => {
    for (let gy = cy - ry; gy <= cy + ry; gy += step * 0.8) for (let gx = cx - rx; gx <= cx + rx; gx += step) {
      const k = Math.round(gx * 7 + gy * 131 + seed * 977);
      const x = gx + (hash(k, 1) - 0.5) * step * 0.9 + ((Math.round(gy / (step * 0.8)) & 1) ? step / 2 : 0);
      const y = gy + (hash(k, 2) - 0.5) * step * 0.7;
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (e > 1 - hash(k, 3) * 0.25) continue;
      if (!onZone(x, y, z) || !free(x, y, r)) continue;
      add(pick(k), x, y, sh);
    }
  };
  // set pieces first, so the woods grow around them
  const piece = (s, x, y, r, sh, force = false) => { if (!force && (busy(x, y - 1, 1) || !base.land[artY(y) * AW + artX(x)])) return; add(s, x, y, sh); taken.push([x, y, r]); };
  piece(crownCastle(), ...SET.castle, 14, 9, true);
  piece(windmill(), 207, 275, 6, 3);
  piece(windmill(), 116, 232, 6, 3);
  // the vale's villages: by the castle, on the western farms, in the middle
  // country and up under the northern hills
  for (const [x, y, v] of [[163, 275, 0], [177, 269, 1], [156, 289, 2], [99, 265, 3], [109, 255, 1], [190, 255, 2],
    [124, 140, 0], [132, 134, 2], [116, 132, 1], [226, 36, 3], [236, 44, 0], [40, 222, 1], [48, 228, 3], [232, 220, 1], [240, 228, 0]]) piece(cottage(v), x, y, 4, 2.2);
  for (const [x, y, v] of [[143, 85, 0], [211, 78, 1], [153, 129, 2], [204, 133, 3], [96, 80, 1], [236, 104, 0]]) piece(barrow(v), x, y, 6, 3.5);
  // the new country: a hamlet under Thistlecrag and one on the Kingstones
  // road, the fishers of Gullwick Sands, and a farm or two on the lobe
  for (const [x, y, v] of [[96, 30, 0], [104, 36, 2], [90, 40, 1], [166, -4, 3], [176, -10, 0], [292, 335, 1], [298, 344, 3], [286, 330, 0],
    [214, 352, 2], [222, 358, 1], [118, -20, 1], [160, 12, 2]]) piece(cottage(v), x, y, 4, 2.2);
  piece(windmill(), 222, 340, 6, 3);
  for (const [x, y, v] of [[60, -14, 2], [168, -38, 3], [104, -64, 0]]) piece(barrow(v), x, y, 6, 3.5);
  // the mill on the Foxwater at Millrace: the first spot by the river, on
  // the bank, clear of the road and the name
  {
    const fox = RIVERS[2];
    for (const ty of [283, 318, 326, 276]) {
      let i = 0; fox.pts.forEach(([, py], j) => { if (Math.abs(py - ty) < Math.abs(fox.pts[i][1] - ty)) i = j; });
      const [rx, ry] = fox.pts[i], x = rx + 0.6, y = ry + 0.4;
      // (blind to the river itself: the wheel stands in it)
      if (dryBusy(x + 4, y - 3, 1.5) || dryBusy(x + 7, y - 1, 0.5) || !clearOf(x + 4, y, 6)) continue;
      add(watermill(), x, y, 2.8, 2, 7.4); taken.push([x + 4, y, 6]); break;
    }
  }
  // the King Stones: a ring of grey stones on the turf north-east of the
  // waypoint
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2, x = 153 + Math.cos(a) * 6.5, y = -64 + Math.sin(a) * 3.4;
    if (!busy(x, y, 0.4)) { add(kingStone(k), x, y, 0.8); taken.push([x, y, 2]); }
  }
  // Gullwick Sands: boats drawn up on the beach and the nets on their poles
  for (const [x, y, v] of [[300, 360, 0], [306, 352, 1], [292, 372, 0], [270, 386, 1], [310, 342, 0]]) if (onZone(x, y, 0, 1) && !busy(x, y, 0.5) && clearOf(x, y, 3)) { add(rowboat(v), x, y, 1.4); taken.push([x, y, 3]); }
  for (const [x, y] of [[302, 328], [284, 380]]) if (onZone(x, y, 0, 1) && !busy(x, y - 1, 1) && clearOf(x, y, 4)) { add(nets(), x, y, 0); taken.push([x, y, 4]); }

  // mountains: the wall across the isthmus, the Marches' high ranges. A
  // range builds to its spine: the peaks are biggest along its middle and
  // shrink toward its rim (`axis` tilts that spine, in radians), and each
  // peak stands in a skirt of its country's own low hills (`foot`), drawn in
  // front of its base, so no grey cone rises straight off flat meadow.
  // Only the big peaks of the spine carry snow; `dense` thins the range.
  const range = (cx, cy, rx, ry, z, pal, seed, big = 1, foot = null, axis = 0, dense = 1) => {
    const n = Math.round(((rx * ry) / 20 + 20) * dense), ca = Math.cos(axis), sa = Math.sin(axis);
    const bare = pal.snow ? { ...pal, snow: null, key: pal.key + "n" } : pal;
    for (let k = 0; k < n; k++) {
      const a = hash(seed, k * 3) * Math.PI * 2, rr = Math.sqrt(hash(seed, k * 3 + 1));
      const lx = Math.cos(a) * rx * rr, ly = Math.sin(a) * ry * rr;
      const x = cx + lx * ca - ly * sa, y = cy + lx * sa + ly * ca;
      // off the spine (the long axis) the peaks fall away
      // off the spine (the long axis) the peaks fall away, and a little
      // toward its two ends too
      const spine = Math.abs(rx >= ry ? Math.sin(a) : Math.cos(a)) * rr, along = Math.abs(rx >= ry ? Math.cos(a) : Math.sin(a)) * rr;
      const w = Math.round((12 + hash(seed, k * 3 + 2) * 10) * big * (1.18 - 0.55 * spine - 0.3 * along * along)), h = Math.round(w * (0.75 + hash(seed, k) * 0.2));
      if (w < 7) continue;
      if (!onZone(x, y, z, 3) || !onZone(x - w / 2, y, z, 1) || !onZone(x + w / 2, y, z, 1)) continue;
      // the peak must not stand on a road, a name or a waypoint
      let clearAll = true;
      for (let sx = -w / 2 + 1; sx <= w / 2 - 1 && clearAll; sx += 2) for (let sy = -h + 3; sy <= 0 && clearAll; sy += 3) {
        if (Math.abs(sx) > (w / 2) * (1 + sy / h) + 0.5) continue;
        if (busy(x + sx, y + sy, 0.5)) clearAll = false;
      }
      if (!clearAll || !free(x, y - h / 3, w * 0.55)) continue;
      add(mountain(w, h, seed * 100 + k, w >= 17 ? pal : bare), x, y, w * 0.4, w / 2, h - 0.4);
      taken.push([x, y - h / 3, w * 0.55]);
      // the foothills across its foot
      if (!foot) continue;
      for (let f = 0; f < 2; f++) {
        const fw = Math.round(w * (0.55 + hash(seed + 7, k * 2 + f) * 0.35)), fx = x + (hash(seed + 9, k * 2 + f) - 0.5) * w * 0.9, fy = y + 0.8 + hash(seed + 11, k + f) * 2.2;
        if (fw < 6 || !onZone(fx, fy, z, 2) || busy(fx, fy - 1, fw * 0.3)) continue;
        add(hill(fw, Math.max(3, Math.round(fw * 0.36)), (k + f) % 4, foot), fx, fy, 0);
      }
    }
  };
  // the isthmus wall: grey peaks on the stony upland, its ridge running from
  // the vale's shoulder north-east into the Marches
  range(331, 229, 62, 50, 3, ROCK, 1, 1, ISTH_HILL, 0.75, 0.7);
  // the vale's one range is Thistlecrag's crags, not alps: bare rock, no
  // snow, in a skirt of green hills (the knot of cones once on the
  // Ravenscar coast is downland now: see the hills below)
  range(52, 40, 22, 18, 0, CRAG, 22, 0.72, HILLG, 1.3);
  yield;
  // rolling hills in the vale and on the moors
  const hills = (cx, cy, rx, ry, z, pal, seed) => {
    const n = Math.round((rx * ry) / 40) + 10;
    for (let k = 0; k < n; k++) {
      const x = cx + (hash(seed, k * 2) - 0.5) * 2 * rx, y = cy + (hash(seed, k * 2 + 1) - 0.5) * 2 * ry;
      const w = 10 + Math.round(hash(seed, k) * 8), h = Math.round(w * 0.45);
      if (!onZone(x, y, z, 3) || !free(x, y - 2, w * 0.6) || busy(x, y - 2, w * 0.35)) continue;
      add(hill(w, h, seed * 50 + k, pal), x, y, 0);
      taken.push([x, y - 2, w * 0.6]);
    }
  };
  hills(170, 136, 68, 37, 0, HILLG, 5);
  hills(80, 230, 40, 34, 0, HILLG, 23);
  hills(230, 240, 40, 30, 0, HILLG, 24);
  // the headland's downs round Thistlecrag and the King Stones, and the
  // swells of the south-east lobe
  hills(80, 10, 42, 30, 0, HILLG, 33);
  hills(135, -40, 45, 28, 0, HILLG, 34);
  hills(270, 360, 34, 22, 0, HILLG, 35);
  hills(146, 4, 18, 10, 0, HILLG, 36);
  hills(214, -2, 30, 10, 0, HILLG, 37);

  // the woods
  const oaks = (k) => (hash(k, 9) < 0.72 ? oak(Math.floor(hash(k, 8) * 4)) : pine(Math.floor(hash(k, 8) * 3)));
  clump(75, 146, 34, 27, 0, 4.2, oaks, 1);
  clump(119, 99, 27, 20, 0, 4.2, oaks, 2);
  // Blackbriar: the deep wood, dark pines packed close; and Cinderholt, the
  // wood the horde burned
  const darks = (k) => pine(Math.floor(hash(k, 8) * 3), true);
  clump(313, 61, 15, 27, 0, 3.4, darks, 18);
  clump(255, 71, 19, 14, 0, 3.4, darks, 20);
  clump(248, 99, 14, 10, 0, 3.6, darks, 21);
  clump(292, 129, 19, 15, 0, 4.4, (k) => deadTree(Math.floor(hash(k, 8) * 4), true), 19, 1.2);
  clump(224, 153, 20, 15, 0, 4.2, oaks, 3);
  clump(61, 245, 17, 20, 0, 4.2, oaks, 4);
  clump(258, 255, 17, 20, 0, 4.2, oaks, 5);
  clump(163, 75, 17, 10, 0, 4.2, oaks, 6);
  clump(105, 201, 17, 12, 0, 4.2, oaks, 7);
  clump(186, 30, 16, 10, 0, 4.2, oaks, 25);
  clump(40, 170, 12, 16, 0, 4.2, oaks, 26);
  clump(200, 300, 14, 10, 0, 4.2, oaks, 27);
  // the headland's woods, and copses on the south-east lobe
  clump(96, -40, 18, 12, 0, 4.2, oaks, 28);
  clump(176, -58, 13, 9, 0, 3.6, (k) => pine(Math.floor(hash(k, 8) * 3)), 29);
  clump(46, 2, 10, 14, 0, 4.2, oaks, 30);
  clump(272, 300, 14, 11, 0, 4.2, oaks, 31);
  clump(236, 376, 13, 8, 0, 4.2, oaks, 32);
  yield;
  // lone trees across the vale's open ground, sheep in its pastures, hay by
  // its fields
  // (the old vale, then the headland and the south-east lobe on seeds of their own)
  for (let k = 0; k < 400; k++) {
    const [x, y] = k < 280 ? [34 + hash(k, 201) * 290, hash(k, 202) * 330] : k < 350 ? [30 + hash(k, 201) * 170, -90 + hash(k, 202) * 92] : [200 + hash(k, 201) * 110, 300 + hash(k, 202) * 95];
    if (!onZone(x, y, 0) || !free(x, y, 5) || busy(x, y, 2)) continue;
    add(oaks(k + 500), x, y, 1.6);
    taken.push([x, y, 3]);
  }
  for (const [fx, fy, n] of [[129, 197, 6], [211, 163, 5], [51, 218, 4], [58, 143, 4], [120, 290, 4], [230, 200, 4], [100, -6, 5], [152, -24, 4], [262, 340, 4], [64, 24, 3]]) {
    for (let k = 0; k < n; k++) {
      const x = fx + (hash(fx, k) - 0.5) * 20, y = fy + (hash(fy, k) - 0.5) * 12;
      if (!onZone(x, y, 0) || !free(x, y, 2) || busy(x, y, 0.5)) continue;
      add(sheep(k), x, y, 1);
      taken.push([x, y, 2]);
    }
  }
  for (const [x, y] of [[190, 286], [105, 292], [224, 299], [180, 303], [130, 262], [90, 240], [238, 360], [205, 340], [262, 300], [110, 44], [120, 10]]) if (onZone(x, y, 0) && free(x, y, 3) && !busy(x, y, 0.5)) { add(hay(), x, y, 1.4); taken.push([x, y, 3]); }
  yield;
  yield* fenDressing(base, { add, taken, free, clearOf, onZone, piece });
  yield;

  // ---- the Iron Marches ----
  // A spot for a building w x h units near (x, y): the nearest free one on
  // the moor within rad, clear of the road, the names and what stands there.
  const IR = 1, farm = base.farm;
  const onFarm = (x, y) => { const ix = Math.round(x - MAP.x), iy = Math.round(y - MAP.y); return farm && ix >= 0 && iy >= 0 && ix < MAP.w && iy < MAP.h && farm[iy * MAP.w + ix]; };
  const site = (s, x, y, rad = 8, sh = null, fieldOk = true) => {
    const w = s.width / U, h = s.height / U, r = w * 0.5;
    for (let k = 0; k < 60; k++) {
      const a = k * 2.39996, d = k ? rad * Math.sqrt(k / 60) : 0;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (!onZone(px, py, IR, Math.min(4, r))) continue;
      if (busy(px, py, r * 0.8) || busy(px, py - h * 0.5, r * 0.8) || busy(px, py - h + 1, r * 0.6)) continue;
      if (!fieldOk && onFarm(px, py)) continue;
      if (!free(px, py - h * 0.3, r * 1.1)) continue;
      add(s, px, py, sh ?? r * 0.7); taken.push([px, py - h * 0.3, r * 1.1]);
      return [px, py];
    }
    return null;
  };
  // the capital's citadel, and the Muster's camp of the Iron host
  piece(ironCitadel(), ...SET.citadel, 16, 10, true);
  site(pavilion(), 481, 214, 4);
  for (let gy = 198; gy <= 236; gy += 7) for (let gx = 460; gx <= 512; gx += 7.5) {
    const k = gx * 3 + gy;
    if (Math.hypot(gx - 481, (gy - 214) * 1.3) < 9 || hash(k, 5) < 0.18) continue;
    site(ikTent(Math.floor(hash(k, 6) * 3)), gx + ((gy / 7) & 1) * 3, gy, 1.6, 2);
  }
  for (const [x, y] of [[472, 219], [494, 206], [498, 228], [466, 205]]) site(campfire(), x, y, 2, 0);
  // walled towns, border forts, square keeps and watchtowers
  site(walledTown(0), 594, 284, 10);
  site(walledTown(1), 515, 392, 12);
  site(walledTown(1), 612, 356, 10);
  // Ironmouth's town on the estuary's east bank, and the salt pans of
  // Brinewick along the strand
  site(walledTown(0), 582, 456, 10);
  site(saltPans(0), 474, 466, 9) && site(saltPans(1), 466, 452, 8);
  site(borderFort(0), 446, 352, 10);
  site(borderFort(1), 628, 190, 10);
  site(borderFort(0), 588, 72, 12);
  site(borderFort(1), 776, 296, 12);
  for (const [x, y, v] of [[488, 264, 0], [597, 338, 1], [702, 194, 2], [539, 194, 0], [464, 372, 1], [632, 299, 2],
    [600, 110, 1], [705, 305, 0], [432, 150, 2], [648, 225, 0], [575, 395, 1], [745, 262, 2], [785, 150, 0], [512, 448, 1], [628, 410, 2]]) site(ironKeep(v), x, y, 6);
  for (const [x, y, v] of [[524, 70, 1], [470, 106, 0], [712, 162, 1], [722, 245, 0], [446, 390, 1], [600, 400, 0],
    [560, 214, 1], [620, 258, 0], [680, 380, 1], [412, 238, 0], [456, 276, 1], [660, 140, 0],
    // beacons along the new east cliffs and the south shore
    [800, 232, 1], [796, 180, 0], [786, 322, 1], [538, 482, 1], [620, 452, 0], [460, 420, 0]]) site(watchtower(v), x, y, 6);
  site(gallows(), 541, 298, 12);
  // a second camp under the eastern peaks, and the host on the march
  for (const [x, y, v] of [[650, 262, 0], [657, 256, 2], [664, 262, 1], [657, 268, 0], [645, 270, 1]]) site(ikTent(v), x, y, 2, 2);
  site(campfire(), 656, 263, 2, 0);
  for (const [x, y, v] of [[520, 214, 0], [596, 236, 1], [452, 262, 1], [640, 360, 0], [590, 130, 0]]) site(column(v), x, y, 8, 0);
  // milestones along the military roads
  for (const rd of ROADS) {
    let run = 10;
    for (let k = 1; k < rd.pts.length - 1; k++) {
      const [x0, y0] = rd.pts[k - 1], [x1, y1] = rd.pts[k];
      run += Math.hypot(x1 - x0, y1 - y0);
      if (run < 26) continue;
      const l = Math.hypot(x1 - x0, y1 - y0) || 1, side = (k & 1) ? 1 : -1;
      const mx = x1 - ((y1 - y0) / l) * 4.8 * side, my = y1 + ((x1 - x0) / l) * 4.8 * side;
      if (!onZone(mx, my, IR) || busy(mx, my, 0.4) || !free(mx, my, 1.5)) continue;
      add(milestone(k), mx, my, 0.8); taken.push([mx, my, 1.5]); run = 0;
    }
  }
  // steadings on the farms
  for (const [x, y] of [[468, 290], [500, 340], [455, 345], [540, 360], [580, 322], [620, 232], [662, 318], [505, 250], [600, 205], [690, 330], [450, 190], [560, 250],
    [742, 312], [756, 342], [774, 236], [520, 410], [540, 436], [602, 418], [478, 432], [760, 190]])
    site(steading(Math.floor(hash(x, y) * 4)), x, y, 8);

  yield;
  // the ranges, the fells and the tors
  range(554, 136, 90, 39, IR, IRONPK, 2, 1.1, FELL[0]);
  // the eastern peaks: a spine running north and south, the new coast and
  // its moors beyond
  range(708, 256, 24, 88, IR, IRONPK, 3, 0.95, FELL[0], 0.08);
  range(650, 340, 40, 26, IR, IRONPK, 23, 0.95, FELL[1]);
  // a lesser knot of fells and crags behind Blackcliff
  range(762, 160, 22, 13, IR, IRONPK, 41, 0.72, FELL[0], 0.5);
  for (const [cx, cy, rx, ry, seed] of [[520, 300, 70, 50, 40], [610, 240, 45, 40, 41], [470, 250, 40, 40, 42], [770, 280, 34, 50, 43], [540, 440, 70, 30, 44]]) {
    for (let k = 0; k < (rx * ry) / 160; k++) {
      const x = cx + (hash(seed, k * 2) - 0.5) * 2 * rx, y = cy + (hash(seed, k * 2 + 1) - 0.5) * 2 * ry;
      const w = 12 + (k % 3) * 3, h = Math.round(w * 0.36);
      if (onFarm(x, y) || !onZone(x, y, IR, 3) || !free(x, y - 2, w * 0.6) || busy(x, y - 2, w * 0.35)) continue;
      add(hill(w, h, k % 3, FELL[(k + seed) % 2]), x, y, 0);
      taken.push([x, y - 2, w * 0.6]);
    }
  }
  yield;
  // (old country, then the new east coast and south lobe, each on its own seeds)
  for (let k = 0; k < 100; k++) {
    const [x, y] = k < 70 ? [405 + hash(k, 301) * 320, 70 + hash(k, 302) * 330] : k < 86 ? [725 + hash(k, 301) * 90, 110 + hash(k, 302) * 250] : [430 + hash(k, 301) * 230, 400 + hash(k, 302) * 95];
    if (onFarm(x, y) || !onZone(x, y, IR, 4) || busy(x, y - 2, 4) || !free(x, y - 2, 5)) continue;
    add(tor(k % 8), x, y, 3); taken.push([x, y - 2, 5]);
  }
  // the dark pine woods, and pines standing alone on the moor
  const mp = (k) => moorPine(Math.floor(hash(k, 8) * 4));
  const wood = (cx, cy, rx, ry, seed) => {
    for (let gy = cy - ry; gy <= cy + ry; gy += 3.2) for (let gx = cx - rx; gx <= cx + rx; gx += 3.6) {
      const k = Math.round(gx * 7 + gy * 131 + seed * 977);
      const x = gx + (hash(k, 1) - 0.5) * 3 + ((Math.round(gy / 3.2) & 1) ? 1.8 : 0), y = gy + (hash(k, 2) - 0.5) * 2.4;
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (vnoise(x, y, 9, seed) - 0.5) * 0.7;
      if (e > 1 || onFarm(x, y) || !onZone(x, y, IR) || !free(x, y, 2) || busy(x, y - 4, 2)) continue;
      add(mp(k), x, y, 1.6);
    }
  };
  wood(453, 147, 35, 27, 8);
  wood(620, 319, 24, 22, 9);
  wood(461, 331, 18, 18, 10);
  wood(535, 237, 20, 16, 11);
  wood(695, 350, 20, 20, 12);
  wood(640, 150, 22, 16, 28);
  wood(420, 262, 12, 20, 29);
  wood(575, 355, 12, 9, 30);
  wood(690, 120, 10, 8, 31);
  wood(598, 470, 16, 10, 32);
  wood(484, 412, 12, 12, 33);
  wood(790, 268, 9, 14, 34);
  wood(738, 196, 10, 9, 35);
  for (let k = 0; k < 380; k++) {
    const [x, y] = k < 260 ? [405 + hash(k, 311) * 320, 70 + hash(k, 312) * 330] : k < 320 ? [725 + hash(k, 311) * 90, 110 + hash(k, 312) * 250] : [430 + hash(k, 311) * 230, 400 + hash(k, 312) * 95];
    if (onFarm(x, y) || !onZone(x, y, IR) || busy(x, y - 4, 2) || !free(x, y, 4)) continue;
    add(mp(k + 900), x, y, 1.6); taken.push([x, y, 3]);
  }
  // sheep on the hill pastures
  for (const [fx, fy, n] of [[500, 285, 5], [612, 222, 5], [470, 305, 4], [655, 250, 4], [545, 345, 4], [520, 200, 4], [762, 316, 5], [784, 196, 3], [540, 470, 4]]) {
    for (let k = 0; k < n; k++) {
      const x = fx + (hash(fx, k) - 0.5) * 18, y = fy + (hash(fy, k) - 0.5) * 10;
      if (!onZone(x, y, IR) || !free(x, y, 2) || busy(x, y, 0.5)) continue;
      add(sheep(k), x, y, 1); taken.push([x, y, 2]);
    }
  }
  yield;
  yield* rimeDressing(base, { add, taken, free, clearOf, onZone, piece, range, hills });
  return items;
}

// The Marches' farms: drystone walls round small fields, laid on a jittered
// lattice so neighbours share their walls; each farm's fields are pasture,
// hay, oats or plough. Marks base.farm (map units) so the dressing keeps off.
const FARMS = [
  [470, 292, 26, 16, 0.2, 1], [505, 345, 30, 16, -0.15, 2], [578, 322, 20, 14, 0.3, 3], [618, 230, 20, 18, -0.25, 4],
  [665, 318, 16, 12, 0.1, 5], [455, 190, 14, 12, 0.35, 6], [598, 205, 14, 10, -0.1, 7], [505, 252, 16, 11, 0.15, 8],
  [540, 368, 18, 12, 0.05, 9], [690, 330, 10, 8, -0.3, 10], [640, 285, 12, 8, 0.2, 11], [455, 355, 10, 8, -0.2, 12],
  [690, 170, 10, 8, 0.25, 13], [560, 310, 10, 7, -0.1, 14],
  // the new country: Wardenmoor's in-bye, Blackcliff's crofts, the south
  // lobe's farms either side of the Iron estuary
  [742, 326, 16, 10, 0.2, 15], [772, 250, 9, 7, -0.3, 16], [522, 424, 22, 12, -0.1, 17], [608, 428, 16, 10, 0.25, 18],
  [470, 440, 12, 8, 0.3, 19], [756, 176, 10, 7, 0.1, 20],
];
function marchFields(base) {
  const farm = new Uint8Array(MAP.w * MAP.h);
  base.farm = farm;
  const land1 = (x, y) => { const ax = artX(x), ay = artY(y); return ax >= 0 && ay >= 0 && ax < AW && ay < AH && base.land[ay * AW + ax] && base.zone[ay * AW + ax] === 1; };
  const cols = [["#7c8e56", "#6e8050"], ["#86985c", "#76884e"], ["#a09858", "#8c844c"], ["#b0a262", "#988a52"], ["#6e5a40", "#5a4834"], ["#728054", "#66744c"]];
  return layer((c) => {
    for (const [cx, cy, rx, ry, ang, seed] of FARMS) {
      const cw = 7.4, ch = 5.6, nx = Math.ceil(rx / cw) + 1, ny = Math.ceil(ry / ch) + 1;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const P = (i, j) => {
        const k = (i + 40) * 131 + (j + 40) * 7 + seed * 977;
        const u = i * cw + (hash(k, 1) - 0.5) * 2.4, v = j * ch + (hash(k, 2) - 0.5) * 1.8;
        return [cx + u * ca - v * sa, cy + u * sa + v * ca];
      };
      const walls = new Map();
      for (let j = -ny; j < ny; j++) for (let i = -nx; i < nx; i++) {
        const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
        const mx = q.reduce((a, p) => a + p[0], 0) / 4, my = q.reduce((a, p) => a + p[1], 0) / 4;
        const k = (i + 40) * 53 + (j + 40) * 11 + seed * 313;
        if (((mx - cx) / rx) ** 2 + ((my - cy) / ry) ** 2 > 1 - hash(k, 3) * 0.35) continue;
        if (!q.every(([x, y]) => land1(x, y) && !busy(x, y, 1.4)) || busy(mx, my, 3)) continue;
        const [a, b] = cols[Math.floor(hash(k, 4) * cols.length)];
        c.fillStyle = a; poly(c, q); c.fill();
        c.save(); poly(c, q); c.clip();
        c.fillStyle = b;
        // furrows or swathes across the field, along the farm's lie
        for (let t = -8; t < 8; t += 1.3) { c.save(); c.translate(mx, my); c.rotate(ang + (hash(k, 5) < 0.5 ? 0 : Math.PI / 2)); c.fillRect(-8, t, 16, 0.5); c.restore(); }
        c.restore();
        for (let yy = Math.floor(my - 4); yy <= my + 4; yy++) for (let xx = Math.floor(mx - 5); xx <= mx + 5; xx++) {
          const ix = xx - MAP.x, iy = yy - MAP.y;
          if (ix >= 0 && iy >= 0 && ix < MAP.w && iy < MAP.h) farm[iy * MAP.w + ix] = 1;
        }
        for (const [e0, e1] of [[q[0], q[1]], [q[1], q[2]], [q[3], q[2]], [q[0], q[3]]]) walls.set(e0.join() + e1.join(), [e0, e1]);
      }
      // the walls: a shadow line down-right, then the grey stones
      c.lineCap = "round";
      c.strokeStyle = "#4a463e"; c.lineWidth = 0.7;
      for (const [[x0, y0], [x1, y1]] of walls.values()) { c.beginPath(); c.moveTo(x0 + 0.3, y0 + 0.5); c.lineTo(x1 + 0.3, y1 + 0.5); c.stroke(); }
      c.strokeStyle = "#b4afa2"; c.lineWidth = 0.6;
      for (const [[x0, y0], [x1, y1]] of walls.values()) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    }
  });
}

// the fen's black pools: a sodden green margin, a dark peat bank on the far
// (north) side, black water, and the moon's glint in broken streaks
const fenPoolAt = (ax, ay) => fbm(ax, ay, 26, 91) - downsAt(ax, ay) * 0.16;
function fenPools(ctx, base) {
  const img = ctx.getImageData(0, 0, AW, AH), d = img.data;
  const deep = rgb("#12161a"), mid = rgb("#1c2428"), bank = rgb("#1e1a20"), wet = rgb("#4e5c3a"), wetDk = rgb("#3e4a34"), glint = rgb("#7e969e");
  for (let y = 1; y < AH - 1; y++) for (let x = 1; x < AW - 1; x++) {
    const i = y * AW + x;
    if (!base.land[i] || base.zone[i] !== 2) continue;
    const v = fenPoolAt(x, y);
    if (v < 0.585) continue;
    // keep the pools off the causeway and the waypoints
    const ux = x / U + MAP.x, uy = y / U + MAP.y;
    if (busy(ux, uy, 1)) continue;
    let c;
    if (v < 0.62) c = bayer(x, y) < (v - 0.585) * 28 ? wet : wetDk;
    else if (fenPoolAt(x, y - 2) < 0.62) c = bank;
    else if (v > 0.66 && (y % 9) === 4 && vnoise(x, y, 7, 92) > 0.62) c = glint;
    else c = v > 0.67 ? deep : mid;
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2];
  }
  ctx.putImageData(img, 0, 0);
}

// Low mist lying over the fen: bands of pale pixels dithered into the ground,
// thickest along their middles, kept off the road and the names.
const MISTS = [[420, -120, 44, 5], [540, -80, 60, 6], [600, -150, 40, 5], [480, -196, 36, 4], [680, -110, 30, 5],
  [400, -30, 34, 4], [560, -10, 40, 4], [640, -60, 36, 4], [510, -170, 30, 4],
  [304, -112, 30, 5], [300, -52, 22, 4], [330, -186, 26, 4], [600, -214, 30, 3]];
function fenMist(ctx, base) {
  const img = ctx.getImageData(0, 0, AW, AH), d = img.data, pale = rgb("#9ea4b0");
  for (const [mx, my, rx, ry] of MISTS) {
    for (let y = artY(my - ry * 2); y < artY(my + ry * 2); y++) for (let x = artX(mx - rx * 1.3); x < artX(mx + rx * 1.3); x++) {
      if (x < 0 || y < 0 || x >= AW || y >= AH) continue;
      const i = y * AW + x;
      if (!base.land[i] || base.zone[i] !== 2) continue;
      const ux = x / U + MAP.x, uy = y / U + MAP.y;
      // a wavering band
      const cy = my + Math.sin((ux - mx) / 9 + mx) * ry * 0.5;
      const e = ((ux - mx) / rx) ** 2 + ((uy - cy) / ry) ** 2 + (vnoise(x, y, 12, 93) - 0.5) * 0.8;
      if (e > 1 || busy(ux, uy, 0.5)) continue;
      // in drawn-out streaks, two art pixels high, thinning at the ends
      if (((y >> 1) + Math.floor(x / 23)) % 3) continue;
      if (hash(x >> 3, y >> 1) > (1 - e) * 1.6) continue;
      d[i * 4] = (d[i * 4] + pale[0] * 2) / 3; d[i * 4 + 1] = (d[i * 4 + 1] + pale[1] * 2) / 3; d[i * 4 + 2] = (d[i * 4 + 2] + pale[2] * 2) / 3;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// The fen's dressing, laid after the vale's and before the Marches'.
function* fenDressing(base, { add, taken, free, clearOf, onZone, piece }) {
  const Z = 2;
  const pool = (x, y) => fenPoolAt(artX(x), artY(y));
  const inMere = (x, y, g = 0) => MERES.some((m) => m.fen && ((x - m.x) / (m.rx + g)) ** 2 + ((y - m.y) / (m.ry + g)) ** 2 < 1);
  const dry = (x, y) => pool(x, y) < 0.55 && !inMere(x, y, 1.5);
  // the nearest free spot for a thing near (x, y); wet: it stands in water
  const site = (s, x, y, rad = 8, wet = false, sh = null) => {
    const w = s.width / U, h = s.height / U, r = w * 0.5;
    for (let k = 0; k < 60; k++) {
      const a = k * 2.39996, d = k ? rad * Math.sqrt(k / 60) : 0;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (!onZone(px, py, Z, Math.min(3, r))) continue;
      const B = wet ? dryBusy : busy;
      if (B(px, py, r * 0.8) || B(px, py - h * 0.5, r * 0.8) || B(px, py - h + 1, r * 0.6)) continue;
      if (wet ? !(inMere(px, py, -1) || pool(px, py) > 0.62) : !dry(px, py) || !dry(px - r, py) || !dry(px + r, py)) continue;
      if (!clearOf(px, py - h * 0.3, r * 1.1)) continue;
      add(s, px, py, sh ?? (wet ? 0 : r * 0.7)); taken.push([px, py - h * 0.3, r * 1.1]);
      return [px, py];
    }
    return null;
  };
  // the Throne of Dust, the drowned village, the bell of Bellmarsh, the
  // Lichgate, and the chapels
  piece(throneRuin(), ...SET.ruin, 16, 10, true);
  site(bellTower(), 361, -67, 5, true);
  for (const [x, y] of [[430, -200], [488, -200], [470, -214], [420, -190]]) if (site(drownedVillage(), x, y, 8, true) || site(drownedVillage(), x, y, 8)) break;
  let n = 0;
  for (const [x, y] of [[450, -200], [462, -204], [430, -178], [424, -192], [486, -176], [490, -162], [436, -206], [476, -214], [420, -166], [498, -190], [440, -150], [470, -146]]) {
    if (n < 5 && (site(drowned(n), x, y, 5, true) || site(drowned(n), x, y, 5))) n++;
  }
  site(chapel(1), 478, -204, 8);
  site(lychgate(), 614, -188, 14);
  site(chapel(0), 630, -200, 14) || site(chapel(0), 585, -205, 12);
  site(chapel(1), 702, -76, 10);
  site(chapel(0), 360, -110, 10);
  // the ruined abbey of Abbeymere on the Abbey Mere's north shore: its two
  // roofless ranges, and its drowned graveyard
  if (site(chapel(1), 314, -156, 10)) site(chapel(0), 300, -160, 10);
  for (const [x, y, v] of [[324, -168, 1], [296, -136, 2], [286, -170, 0]]) site(graves(v), x, y, 5);
  // a drowned hamlet in the western fen, and its graves by the creek
  for (const [x, y, v] of [[292, -100, 1], [300, -92, 2], [340, -96, 0]]) site(drowned(v), x, y, 5, true) || site(drowned(v), x, y, 5);
  for (const [x, y, v] of [[288, -68, 1], [346, -42, 0]]) site(graves(v), x, y, 5);
  for (const [x, y, v] of [[596, -198, 0], [620, -178, 1], [640, -196, 2], [690, -58, 0], [660, -26, 1], [700, -32, 2], [604, -20, 1], [626, -26, 0], [388, -20, 2]])
    site(graves(v), x, y, 6);
  yield;
  // the Cairnfields: barrows, cairns, a ring of stones; and stone rows by
  // the Stillmere
  for (const [x, y, v] of [[520, -150, 0], [486, -158, 1], [532, -112, 2], [478, -130, 3], [540, -182, 1], [512, -194, 0], [590, -148, 2], [410, -120, 1], [700, -120, 0], [640, -94, 3]])
    site(fenBarrow(v), x, y, 7);
  // the Barrow Downs: long rows of the drowned kings' barrows along the
  // dry ridge, cairns between them, a stone row striding east
  for (const [x, y, v] of [[478, -250, 0], [492, -262, 1], [526, -256, 2], [540, -244, 3], [470, -230, 1], [530, -222, 0], [556, -262, 2],
    [574, -232, 1], [596, -266, 3], [460, -246, 2], [512, -272, 0], [612, -256, 1], [546, -276, 2], [488, -224, 3]]) site(fenBarrow(v), x, y, 6);
  for (const [x, y, v] of [[506, -252, 0], [552, -228, 1], [482, -270, 0], [588, -248, 1], [462, -222, 0], [620, -270, 1]]) site(fenCairn(v), x, y, 4);
  for (let k = 0; k < 7; k++) site(fenStone(k), 548 + k * 7, -238 - k * 1.6 + (k % 2) * 1.2, 2);

  for (const [x, y, v] of [[582, -142, 0], [508, -176, 1], [601, -208, 0], [520, -134, 1], [562, -110, 0],
    [492, -142, 1], [620, -80, 0], [700, -100, 1], [470, -120, 0], [560, -180, 1], [545, -160, 0], [680, -190, 1]]) site(fenCairn(v), x, y, 5);
  const ring = site(fenStone(0), 528, -165, 14);
  if (ring) {
    const [rx, ry] = ring;
    for (let k = 1; k < 9; k++) { const a = (k / 9) * Math.PI * 2; site(fenStone(k), rx + Math.cos(a) * 6.5, ry + Math.sin(a) * 3.6, 1); }
  }
  for (const [x, y, v] of [[420, -94, 0], [428, -88, 1], [436, -82, 2], [420, -70, 0], [449, -70, 1], [440, -30, 1], [470, -24, 0], [478, -28, 2],
    [660, -120, 1], [720, -80, 0], [380, -95, 2], [590, -40, 1]]) site(fenStone(v), x, y, 3);
  // the Stillmere under the moon, and the ferryman
  add(moonGlint(), 474, -95, 0); add(punt(), 489, -86, 0);
  yield;
  // Wightwood and the other drowned woods: dead trees and willows, and
  // where they stand in water, ripples round their feet
  const tree = (k, x, y, willowShare) => {
    const wet = pool(x, y) > 0.6 || inMere(x, y, -0.5);
    const s = hash(k, 9) < willowShare && !wet ? willow(Math.floor(hash(k, 8) * 5)) : fenTree(Math.floor(hash(k, 8) * 10));
    if (wet) add(ripple(), x, y + 1.2, 0);
    add(s, x, y, wet ? 0 : 1.4);
  };
  const wood = (cx, cy, rx, ry, step, willowShare, seed) => {
    for (let gy = cy - ry; gy <= cy + ry; gy += step * 0.8) for (let gx = cx - rx; gx <= cx + rx; gx += step) {
      const k = Math.round(gx * 7 + gy * 131 + seed * 977);
      const x = gx + (hash(k, 1) - 0.5) * step * 0.9 + ((Math.round(gy / (step * 0.8)) & 1) ? step / 2 : 0), y = gy + (hash(k, 2) - 0.5) * step * 0.7;
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (vnoise(x, y, 10, seed) - 0.5) * 0.6;
      if (e > 1 || !onZone(x, y, Z) || inMere(x, y, 1) || !free(x, y, 2.4) || busy(x, y - 5, 2.4)) continue;
      tree(k, x, y, willowShare);
    }
  };
  wood(380, -165, 44, 36, 4.4, 0.18, 13);
  wood(612, -112, 60, 38, 7, 0.15, 14);
  wood(470, -178, 30, 22, 6.5, 0.2, 30);
  wood(690, -90, 24, 20, 6, 0.25, 31);
  wood(420, -60, 20, 14, 6, 0.4, 32);
  // the western fen's drowned woods, thinning toward the abbey
  wood(296, -118, 22, 24, 4.8, 0.22, 40);
  wood(318, -190, 26, 12, 5.4, 0.25, 41);
  wood(296, -56, 14, 10, 5.4, 0.35, 42);
  // (the old fen, then the west lobe, then a few lone trees on the open downs)
  for (let k = 0; k < 540; k++) {
    const [x, y] = k < 420 ? [360 + hash(k, 401) * 370, -220 + hash(k, 402) * 235] : k < 500 ? [266 + hash(k, 401) * 96, -212 + hash(k, 402) * 178] : [440 + hash(k, 401) * 250, -290 + hash(k, 402) * 72];
    if (!onZone(x, y, Z) || inMere(x, y, 1) || !free(x, y, 5) || busy(x, y - 5, 2.4)) continue;
    tree(k + 3000, x, y, 0.3); taken.push([x, y, 3]);
  }
  yield;
  // reedbeds: along the black rivers, round the meres, thick in the Reedmaze
  const reed = (k, x, y) => { if (onZone(x, y, Z) && !busy(x, y, 0.3) && clearOf(x, y, 2.4)) { add(reedbed(k % 6), x, y, 0); taken.push([x, y, 1.6]); } };
  for (const rv of RIVERS) {
    if (!rv.fen) continue;
    for (let i = 3; i < rv.pts.length; i += 5) {
      const k = i * 7 + rv.pts.length;
      if (hash(k, 5) < 0.45) continue;
      const [x, y] = rv.pts[i], [nx, ny] = rv.nrm[i], side = hash(k, 6) < 0.5 ? 1 : -1, o = rv.hw[i] + 2.6 + hash(k, 7) * 1.5;
      reed(k, x + nx * o * side, y + ny * o * side);
      // and now and then a willow leaning over the bank
      const wx = x - nx * (o + 3) * side, wy = y - ny * (o + 3) * side;
      if (hash(k, 9) < 0.3 && onZone(wx, wy, Z) && dry(wx, wy) && !busy(wx, wy - 4, 2.6) && free(wx, wy, 4)) { add(willow(k % 5), wx, wy, 1.4); taken.push([wx, wy, 3]); }
    }
  }
  for (const m of MERES) {
    if (!m.fen) continue;
    for (let a = 0; a < Math.PI * 2; a += 0.35) {
      const k = Math.round(m.x * 3 + a * 50);
      if (hash(k, 8) < 0.35) continue;
      reed(k, m.x + Math.cos(a) * (m.rx + 3.2), m.y + Math.sin(a) * (m.ry + 2.8));
    }
  }
  for (let gy = -150; gy <= -100; gy += 3.4) for (let gx = 535; gx <= 605; gx += 5) {
    const k = Math.round(gx * 7 + gy * 13);
    const x = gx + (hash(k, 1) - 0.5) * 3, y = gy + (hash(k, 2) - 0.5) * 2;
    if (((x - 570) / 36) ** 2 + ((y - -125) / 26) ** 2 > 1 - hash(k, 3) * 0.3 || inMere(x, y, 0.5)) continue;
    reed(k, x, y);
  }
  for (let k = 0; k < 330; k++) {
    const [x, y] = k < 260 ? [360 + hash(k, 411) * 370, -220 + hash(k, 412) * 235] : k < 310 ? [266 + hash(k, 411) * 96, -212 + hash(k, 412) * 178] : [440 + hash(k, 411) * 250, -290 + hash(k, 412) * 72];
    if (pool(x, y) < 0.5 && hash(k, 413) < 0.7) continue;
    reed(k, x, y);
  }
  // causeway posts along the fen's roads
  for (const rd of ROADS) {
    let run = 6;
    for (let k = 1; k < rd.pts.length - 1; k++) {
      const [x0, y0] = rd.pts[k - 1], [x1, y1] = rd.pts[k];
      run += Math.hypot(x1 - x0, y1 - y0);
      if (run < 14) continue;
      const l = Math.hypot(x1 - x0, y1 - y0) || 1, side = (k & 1) ? 1 : -1;
      const mx = x1 - ((y1 - y0) / l) * 4.6 * side, my = y1 + ((x1 - x0) / l) * 4.6 * side;
      if (!onZone(mx, my, Z) || busy(mx, my, 0.4) || !clearOf(mx, my, 1.4)) continue;
      add(fenPost(k), mx, my, 0.6); taken.push([mx, my, 1.4]); run = 0;
    }
  }
  // witch-lights over the black water, and crows over the dead places
  for (let k = 0; k < 480; k++) {
    const [x, y] = k < 400 ? [360 + hash(k, 421) * 370, -220 + hash(k, 422) * 235] : [266 + hash(k, 421) * 96, -212 + hash(k, 422) * 178];
    if (!onZone(x, y, Z) || !(pool(x, y) > 0.62 || inMere(x, y, -1)) || dryBusy(x, y, 1) || !clearOf(x, y, 3)) continue;
    add(wisp(k % 2), x, y - 2 - hash(k, 423) * 3, 0); taken.push([x, y, 3]);
  }
  for (const [x, y, v] of [[676, -186, 0], [382, -196, 1], [612, -214, 1], [520, -200, 0], [700, -30, 1], [560, -60, 0], [298, -176, 1], [520, -264, 0], [592, -280, 1]])
    if (!busy(x, y, 1)) add(crows(v), x, y, 0);
  // Lanternfen's lantern posts, set along the creek either side of the
  // waypoint to light the way over the bog
  {
    const cr = RIVERS.find((rv) => rv.fen && rv.pts.some(([x, y]) => Math.hypot(x - 318, y + 78) < 1.5));
    let run = 0;
    for (let i = 1; cr && i < cr.pts.length; i++) {
      const [x, y] = cr.pts[i], [nx, ny] = cr.nrm[i];
      run += Math.hypot(x - cr.pts[i - 1][0], y - cr.pts[i - 1][1]);
      if (run < 7 || Math.hypot(x - 318, y + 78) > 46) continue;
      const side = i & 1 ? 1 : -1, o = cr.hw[i] + 2.2, px = x + nx * o * side, py = y + ny * o * side;
      if (!onZone(px, py, Z, 1) || dryBusy(px, py, 0.6) || !clearOf(px, py, 2.4)) continue;
      add(lanternPost(i), px, py, 0.6); taken.push([px, py, 2.4]); run = 0;
    }
  }
  // the Dead Weir across the Blackwater, upstream of the waypoint
  {
    const bw = RIVERS.find((rv) => rv.fen && rv.pts.some(([x, y]) => Math.hypot(x - 634, y + 232) < 1.5));
    if (bw) {
      let i = 0; bw.pts.forEach(([x, y], j) => { if (Math.hypot(x - 616, y + 240) < Math.hypot(bw.pts[i][0] - 616, bw.pts[i][1] + 240)) i = j; });
      add(weir(), bw.pts[i][0], bw.pts[i][1] + 4.4, 0, 3, 8.6);
    }
  }
}

// The Rimewater's dressing, laid last, on seeds of its own.
function* rimeDressing(base, { add, taken, free, clearOf, onZone, piece, range, hills }) {
  const Z = RZ;
  // how far inland a spot is (units): the strands are where it is small
  const inl = (x, y) => { const ax = artX(x), ay = artY(y); return ax < 0 || ay < 0 || ax >= AW || ay >= AH ? 0 : base.inland[ay * AW + ax] / U; };
  const site = (s, x, y, rad = 8, sh = null) => {
    const w = s.width / U, h = s.height / U, r = w * 0.5;
    for (let k = 0; k < 60; k++) {
      const a = k * 2.39996, d = k ? rad * Math.sqrt(k / 60) : 0;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (!onZone(px, py, Z, Math.min(4, r))) continue;
      if (busy(px, py, r * 0.8) || busy(px, py - h * 0.5, r * 0.8) || busy(px, py - h + 1, r * 0.6)) continue;
      if (!free(px, py - h * 0.3, r * 1.1)) continue;
      add(s, px, py, sh ?? r * 0.7); taken.push([px, py - h * 0.3, r * 1.1]);
      return [px, py];
    }
    return null;
  };
  // a thing on the strand: the nearest spot near (x, y) between lo and hi
  // units in from the waterline
  const strand = (s, x, y, rad = 10, lo = 0.8, hi = 4, sh = 1.2) => {
    const w = s.width / U;
    for (let k = 0; k < 80; k++) {
      const a = k * 2.39996, d = k ? rad * Math.sqrt(k / 80) : 0;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, n = inl(px, py);
      if (n < lo || n > hi || !onZone(px, py, Z, 0.6) || busy(px, py, 0.5) || !clearOf(px, py, w * 0.6)) continue;
      add(s, px, py, sh); taken.push([px, py, w * 0.6]);
      return true;
    }
    return false;
  };
  // the Jarl's hall at the head of his fjord
  piece(jarlHall(), ...SET.jarl, 18, 12, true);
  // the glaciers' ice fields and the peaks they come down from: the great
  // spine across the north, the eastern peaks, the ridge between the south
  // shore and the Wolfsound, the drake fells, and the western cape's knot
  range(440, -553, 104, 24, Z, RIMEPK, 51, 1.12, SNOWHILL, -0.06);
  range(716, -418, 26, 56, Z, RIMEPK, 52, 1, SNOWHILL, 0.12);
  range(430, -411, 78, 12, Z, RIMEPK, 53, 0.8, SNOWHILL2, 0.04, 0.85);
  range(700, -566, 32, 14, Z, RIMEPK, 54, 0.9, SNOWHILL, 0.2);
  range(306, -548, 16, 26, Z, RIMEPK, 55, 0.82, SNOWHILL, 1.4);
  range(612, -462, 26, 14, Z, RIMEPK, 56, 0.78, SNOWHILL2, -0.3);
  yield;
  // snowy swells across the white country
  for (const [cx, cy, rx, ry, seed] of [[520, -430, 120, 30, 61], [470, -520, 120, 26, 62], [700, -470, 70, 60, 63], [340, -380, 50, 40, 64]]) {
    for (let k = 0; k < (rx * ry) / 150; k++) {
      const x = cx + (hash(seed, k * 2) - 0.5) * 2 * rx, y = cy + (hash(seed, k * 2 + 1) - 0.5) * 2 * ry;
      const w = 12 + (k % 3) * 3, h = Math.max(3, Math.round(w * 0.3));
      if (!onZone(x, y, Z, 3) || !free(x, y - 2, w * 0.6) || busy(x, y - 2, w * 0.35)) continue;
      add(hill(w, h, k % 3, k % 2 ? SNOWHILL : SNOWHILL2), x, y, 0);
      taken.push([x, y - 2, w * 0.6]);
    }
  }
  // black crags where the wind has the snow off the rock
  for (let k = 0; k < 150; k++) {
    const x = 285 + hash(k, 401) * 520, y = -612 + hash(k, 402) * 285;
    if (!onZone(x, y, Z, 3) || busy(x, y - 2, 3) || !free(x, y - 2, 5)) continue;
    add(rimeCrag(k), x, y, 2.4); taken.push([x, y - 2, 5]);
  }
  // the dark spruce woods of the sheltered south, and lone spruces
  const rp = (k) => rimePine(Math.floor(hash(k, 8) * 4));
  const wood = (cx, cy, rx, ry, seed) => {
    for (let gy = cy - ry; gy <= cy + ry; gy += 3) for (let gx = cx - rx; gx <= cx + rx; gx += 3.4) {
      const k = Math.round(gx * 7 + gy * 131 + seed * 977);
      const x = gx + (hash(k, 1) - 0.5) * 2.8 + ((Math.round(gy / 3) & 1) ? 1.7 : 0), y = gy + (hash(k, 2) - 0.5) * 2.2;
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (vnoise(x, y, 9, seed) - 0.5) * 0.7;
      if (e > 1 || !onZone(x, y, Z) || !free(x, y, 2) || busy(x, y - 4, 2)) continue;
      add(rp(k), x, y, 1.4);
    }
  };
  wood(612, -370, 20, 11, 71);
  wood(540, -394, 16, 10, 72);
  wood(478, -402, 15, 8, 73);
  wood(342, -374, 17, 13, 74);
  wood(748, -374, 16, 22, 75);
  wood(676, -384, 13, 10, 76);
  wood(300, -362, 10, 15, 77);
  wood(408, -330, 13, 6, 78);
  wood(460, -488, 14, 7, 79);
  wood(330, -484, 12, 8, 80);
  for (let k = 0; k < 220; k++) {
    const x = 285 + hash(k, 411) * 510, y = -505 + hash(k, 412) * 180;
    // thinning northward: the spruce keeps to the south
    if (hash(k, 413) > 0.25 + Math.max(0, (y + 505) / 180) * 0.75) continue;
    if (!onZone(x, y, Z) || busy(x, y - 4, 2) || !free(x, y, 4)) continue;
    add(rp(k + 900), x, y, 1.4); taken.push([x, y, 3]);
  }
  yield;
  // the steadings and longhouses of the clans
  for (const [x, y, v] of [[728, -352, 0], [690, -330, 1], [656, -354, 2], [602, -346, 3], [534, -342, 0], [486, -344, 1],
    [466, -392, 2], [398, -374, 3], [300, -394, 0], [340, -398, 1], [342, -472, 2], [450, -486, 3], [418, -488, 0],
    [520, -498, 1], [556, -492, 2], [638, -512, 3], [744, -556, 0], [712, -530, 1], [684, -598, 2], [642, -598, 3], [612, -566, 0], [566, -556, 1]]) {
    site((hash(x, y) < 0.55 ? steadingR : longhouse)(v), x, y, 8);
  }
  // the rune-stone field of Runestead, and rune stones by the roads
  for (let k = 0; k < 16; k++) {
    const a = hash(k, 421) * Math.PI * 2, d = 10 + hash(k, 422) * 20, x = 380 + Math.cos(a) * d * 1.3, y = -360 + Math.sin(a) * d * 0.8;
    if (!onZone(x, y, Z, 1) || busy(x, y, 0.4) || !clearOf(x, y, 2.4)) continue;
    add(runeStone(k), x, y, 0.9); taken.push([x, y, 2.4]);
  }
  for (const rd of ROADS) {
    let run = 14;
    for (let k = 1; k < rd.pts.length - 1; k++) {
      const [x0, y0] = rd.pts[k - 1], [x1, y1] = rd.pts[k];
      run += Math.hypot(x1 - x0, y1 - y0);
      if (run < 34) continue;
      const l = Math.hypot(x1 - x0, y1 - y0) || 1, side = (k & 1) ? 1 : -1;
      const mx = x1 - ((y1 - y0) / l) * 4.8 * side, my = y1 + ((x1 - x0) / l) * 4.8 * side;
      if (!onZone(mx, my, Z) || busy(mx, my, 0.4) || !free(mx, my, 1.5)) continue;
      add(runeStone(k), mx, my, 0.8); taken.push([mx, my, 1.5]); run = 0;
    }
  }
  // the strands: whale ribs on Whalebone Bay and the shingle, longships
  // drawn up by the raiders' landings
  for (const [x, y, v] of [[508, -330, 0], [524, -328, 1], [494, -326, 1], [454, -322, 0], [560, -326, 1], [282, -440, 0], [744, -326, 1]]) strand(whaleRibs(v), x, y, 9, 0.8, 3.6, 1.2);
  for (const [x, y, v] of [[684, -326, 0], [758, -334, 1], [728, -330, 1], [318, -422, 0], [300, -426, 1], [440, -466, 0], [752, -540, 1], [578, -582, 0], [596, -588, 1], [472, -588, 0], [540, -606, 1], [650, -604, 0]]) strand(shipBeached(v), x, y, 8, 0.6, 3.4, 1.4);
}

// The whole terrain: the base, then water, fields, road, and the dressing.
function* paintTerrain() {
  const base = yield* paintBase();
  yield;
  const cv = base.cv, ctx = cv.getContext("2d", RF);
  ctx.imageSmoothingEnabled = false;
  const landMask = mk(), lm = landMask.getContext("2d", RF), lmi = new ImageData(AW, AH);
  for (let i = 0; i < AW * AH; i++) lmi.data[i * 4 + 3] = base.land[i] ? 255 : 0;
  lm.putImageData(lmi, 0, 0);
  const onLand = (layerCv) => { const c = layerCv.getContext("2d", RF); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "destination-in"; c.drawImage(landMask, 0, 0); return layerCv; };

  fenPools(ctx, base);
  yield;

  // fields: a patchwork of strips across the southern vale
  const fields = layer((c) => {
    const cols = [["#d8bf62", "#c4a84e"], ["#9cc462", "#86b052"], ["#a67e52", "#8e6a44"], ["#c8c46a", "#b0ac58"]];
    let k = 0;
    // (k numbers the old cells as before, so the old farmland keeps its look)
    for (let gy = 220; gy < 384; gy += 8) for (let gx = 60; gx < 300; gx += 10) {
      const row = (gy - 220) / 8, col = (gx - 60) / 10;
      k = gx < 260 && gy < 334 ? row * 20 + col + 1 : 2000 + row * 24 + col;
      const x = gx + (hash(k, 1) - 0.5) * 4, y = gy + (hash(k, 2) - 0.5) * 3;
      if (fbm(x * 4, y * 4, 60, 5) < 0.5) continue;
      const w = 7 + hash(k, 3) * 5, h = 5 + hash(k, 4) * 3;
      if (busy(x + w / 2, y + h / 2, 3)) continue;
      const [a, b] = cols[Math.floor(hash(k, 5) * cols.length)];
      c.save(); c.translate(x, y); c.transform(1, 0, -0.25 + hash(k, 6) * 0.5, 1, 0, 0);
      c.fillStyle = a; c.fillRect(0, 0, w, h);
      c.fillStyle = b; for (let s = 1; s < h; s += 1.5) c.fillRect(0, s, w, 0.5);
      c.restore();
    }
  }, "#5f8f43");
  ctx.drawImage(onLand(fields), 0, 0);
  yield;
  ctx.drawImage(onLand(marchFields(base)), 0, 0);

  yield;
  // rivers and lakes: an inked bank, a pale shallows rim, deep water, and a
  // glint of current down the wider reaches. Fen water is black, moonlit.
  const PAL = { shal: "#5f9cb6", deep: "#3f7898", glint: "#8cc0d2" }, FEN = { shal: "#4a5c58", deep: "#161c20", glint: "#a8c0c4" };
  // the Rimewater's water: milky glacier-blue rivers, meres dark under an ice rim
  const ICEW = { shal: "#8cc2d4", deep: "#4f8eaa", glint: "#e8f6fa" }, MEREW = { shal: "#d4e6ee", deep: "#2c5674", glint: "#a8d0e2" };
  const wpal = (o, mere = false) => (o.fen ? FEN : o.ice ? (mere ? MEREW : ICEW) : PAL);
  const water = layer((c) => {
    for (const rv of RIVERS) { c.fillStyle = wpal(rv).shal; riverPath(c, rv); c.fill(); }
    for (const m of MERES) { c.fillStyle = wpal(m, true).shal; lakePath(c, m); c.fill(); }
    for (const rv of RIVERS) { c.fillStyle = wpal(rv).deep; riverPath(c, rv, -0.45); c.fill(); }
    for (const m of MERES) { c.fillStyle = wpal(m, true).deep; lakePath(c, m, m.ice ? -1.8 : -1.1); c.fill(); }
  }, INK);
  const shine = layer((c) => {
    c.lineJoin = "round"; c.lineCap = "round";
    for (const rv of RIVERS) {
      c.strokeStyle = wpal(rv).glint; c.lineWidth = 0.5;
      // broken glints along the reaches wide enough to show them
      for (let i = 0; i < rv.pts.length - 3; i += 7) {
        if (rv.hw[i] < 1 || hash(i, 71 + rv.pts.length) < 0.35) continue;
        const [x0, y0] = rv.pts[i], [x1, y1] = rv.pts[i + 3], [nx, ny] = rv.nrm[i], o = rv.hw[i] * 0.35;
        c.beginPath(); c.moveTo(x0 - nx * o, y0 - ny * o); c.lineTo(x1 - nx * o, y1 - ny * o); c.stroke();
      }
    }
    for (const m of MERES) {
      c.strokeStyle = wpal(m, true).glint; c.lineWidth = 0.5;
      for (let k = 0; k < 2; k++) {
        const y = m.y - m.ry * 0.3 + k * m.ry * 0.45, x = m.x - m.rx * 0.35 + k * m.rx * 0.2;
        c.beginPath(); c.moveTo(x - m.rx * 0.22, y); c.lineTo(x + m.rx * 0.22, y); c.stroke();
      }
    }
  });
  ctx.drawImage(onLand(water), 0, 0);
  ctx.drawImage(onLand(shine), 0, 0);
  yield;
  // the Rimewater's glaciers: blue-white ice, lit along their western edge,
  // banded with crevasses across the flow and a dark moraine down the middle
  const GB = [250, -600, 470, 190];   // the box the glaciers lie in
  const glaciers = layerBox(...GB, (c) => {
    c.lineCap = "round";
    for (const gl of GLACIERS) {
      c.fillStyle = RK.iceDk; glacierPath(c, gl); c.fill();
      c.fillStyle = RK.ice; glacierPath(c, gl, -0.9); c.fill();
      c.save(); glacierPath(c, gl, -0.9); c.clip();
      c.strokeStyle = RK.iceLt; c.lineWidth = 0.9;
      // (on the side facing the north-west sun)
      const m = gl.nrm[gl.nrm.length >> 1], sd = m[0] + m[1] < 0 ? 1 : -1;
      c.beginPath(); gl.pts.forEach(([x, y], i) => { const [nx, ny] = gl.nrm[i], o = gl.hw[i] * 0.6 * sd; i ? c.lineTo(x + nx * o, y + ny * o) : c.moveTo(x + nx * o, y + ny * o); }); c.stroke();
      // crevasses: short broken strokes across the flow, thickest where the
      // ice spills down toward its snout
      c.strokeStyle = RK.iceDp; c.lineWidth = 0.5;
      for (let i = 4; i < gl.pts.length - 2; i++) {
        if (hash(i, gl.seed * 13) > 0.08 + (i / gl.pts.length) * 0.16) continue;
        const [x, y] = gl.pts[i], [nx, ny] = gl.nrm[i], h = gl.hw[i] * (0.18 + hash(i, gl.seed) * 0.3), off = (hash(i, gl.seed + 5) - 0.5) * gl.hw[i] * 1.1;
        const tx = -ny * 0.5, ty = nx * 0.5;
        c.beginPath(); c.moveTo(x + nx * (off - h) - tx, y + ny * (off - h) - ty); c.lineTo(x + nx * off + tx, y + ny * off + ty); c.lineTo(x + nx * (off + h) - tx, y + ny * (off + h) - ty); c.stroke();
      }
      // the medial moraine, a broken dark line down its lower reach
      c.strokeStyle = "#6a707c"; c.lineWidth = 0.45;
      for (let i = gl.pts.length >> 2; i < gl.pts.length - 3; i += 4) { if (hash(i, gl.seed + 9) < 0.3) continue; const [x0, y0] = gl.pts[i], [x1, y1] = gl.pts[i + 2]; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
      c.restore();
    }
  }, INK);
  {
    const g = glaciers.getContext("2d", RF);
    g.globalCompositeOperation = "destination-in"; g.drawImage(landMask, -artX(GB[0]), -artY(GB[1]));
    ctx.drawImage(glaciers, artX(GB[0]), artY(GB[1]));
  }
  // ...and the ice field each rises in, dithered out into the snow (over the
  // tongue's inked head, so it flows out of the field rather than starting)
  {
    const bx = artX(GB[0]), by = artY(GB[1]), bw = glaciers.width, bh = glaciers.height;
    const img = ctx.getImageData(bx, by, bw, bh), d = img.data, ice = rgb(RK.ice), lit = rgb(RK.iceLt), dk = rgb(RK.iceDk);
    for (const gl of GLACIERS) {
      const [sx, sy] = gl.pts[0], R = gl.w0 * 0.95;
      for (let y = artY(sy - R); y <= artY(sy + R); y++) for (let x = artX(sx - R * 1.3); x <= artX(sx + R * 1.3); x++) {
        const i = y * AW + x, j = (y - by) * bw + (x - bx);
        if (x < bx || y < by || x >= bx + bw || y >= by + bh || !base.land[i] || base.zone[i] !== RZ) continue;
        const ux = x / U + MAP.x, uy = y / U + MAP.y, e = Math.hypot((ux - sx) / 1.3, uy - sy) / R + (vnoise(x, y, 7, 130 + gl.seed) - 0.5) * 0.5;
        if (e > 1 || bayer(x, y) < (e - 0.45) * 1.8 || busy(ux, uy, 0.5)) continue;
        const c = vnoise(x, y, 5, 140) > 0.62 ? lit : (y % 6 === 0 && hash(x >> 2, y) < 0.3 ? dk : ice);
        d[j * 4] = c[0]; d[j * 4 + 1] = c[1]; d[j * 4 + 2] = c[2];
      }
    }
    ctx.putImageData(img, bx, by);
  }
  yield;

  // the road: packed dirt with a darker edge, only on land
  const road = layer((c) => {
    c.lineJoin = "round"; c.lineCap = "round";
    for (const rd of ROADS) { c.strokeStyle = "#d4b47a"; c.lineWidth = 2.4; poly(c, rd.pts); c.stroke(); }
  }, "#8a6a44");
  ctx.drawImage(onLand(road), 0, 0);
  // where the road meets the sea, a ferry lane of pale dashes
  const lane = layer((c) => {
    c.fillStyle = "#cfe2e6";
    for (const rd of ROADS) rd.pts.forEach(([x, y], k) => { if (k % 3 === 0) c.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); });
  });
  { const c = lane.getContext("2d", RF); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "destination-out"; c.drawImage(landMask, 0, 0); }
  // keep the lane off the coast's ink and foam too
  ctx.drawImage(lane, 0, 0);
  yield;

  // bridges wherever the road crosses running water (not at the fords)
  // (the rivers' centrelines, 2 units wide, as a mask to look the road up in)
  const wet = layer((c) => { c.strokeStyle = "#000"; c.lineWidth = 2; for (const rv of RIVERS) { poly(c, rv.pts); c.stroke(); } });
  const wd = wet.getContext("2d", RF).getImageData(0, 0, AW, AH).data;
  const bridges = [];
  for (const rd of ROADS) for (let k = 0; k < rd.pts.length; k++) {
    const [x, y] = rd.pts[k], ax = artX(x), ay = artY(y);
    if (ax < 0 || ay < 0 || ax >= AW || ay >= AH || !wd[(ay * AW + ax) * 4 + 3]) continue;
    if (LEVELS.some((l) => Math.hypot(x - l.pos[0], y - l.pos[1]) < 10)) continue;
    if (bridges.every(([bx, by]) => Math.hypot(x - bx, y - by) > 8)) bridges.push([x, y]);
  }
  for (const [x, y] of bridges) stamp(ctx, bridge(), x, y, 3.5, 2.5);
  yield;
  fenMist(ctx, base);

  yield;
  // contact shadows, then the dressing back to front
  const items = (yield* dressing(base)).sort((a, b) => a[2] - b[2]);
  const shade = layer((c) => {
    c.fillStyle = "#2a1c2c";
    for (const [, x, y, , , sh] of items) if (sh > 0) { c.beginPath(); c.ellipse(x + sh * 0.35, y + 0.2, sh, sh * 0.42, 0, 0, Math.PI * 2); c.fill(); }
  });
  ctx.globalAlpha = 0.26; ctx.drawImage(shade, 0, 0); ctx.globalAlpha = 1;
  for (const [s, x, y, ax, ay] of items) stamp(ctx, s, x, y, ax, ay);

  yield;
  // out at sea: the ferry, the serpent, a lighthouse, the compass
  stamp(ctx, ship(), 712, 40, 7, 11);
  stamp(ctx, ship(), 318, 436, 7, 11);
  stamp(ctx, ship(), 572, 512, 7, 11);
  stamp(ctx, serpent(), 52, -196, 17, 9);
  stamp(ctx, lighthouse(), 37, -122, 2.5, 11.4);
  stamp(ctx, compass(), 30, 480, 11, 13);
  stamp(ctx, whirl(), 226, -160, 8, 5);
  // a wreck on the rocks off Saltgrave Strand
  for (const [x, y] of [[598, 28], [620, 30], [584, 24], [640, 26], [600, 36]]) {
    const i = artY(y) * AW + artX(x), j = artY(y) * AW + artX(x + 7);
    if (!base.land[i] && !base.land[j] && base.seaD[i] > 9 && base.seaD[j] > 9 && base.seaD[i] < 40) { stamp(ctx, wreck(), x, y, 7, 6.4); break; }
  }
  for (const [x, y, v] of [[10, 40, 0], [345, 30, 1], [836, 280, 0], [384, 412, 1], [270, 420, 0], [252, -54, 1], [750, -210, 0], [20, -250, 1], [430, 40, 0], [214, -64, 1], [748, 60, 1],
    [476, 506, 0], [640, 476, 1], [830, 120, 1], [94, -110, 0], [700, -282, 1], [258, -194, 0]]) {
    const i = artY(y) * AW + artX(x);
    if (!base.land[i] && base.seaD[i] > 6) stamp(ctx, seaRock(v), x, y, 3, 4);
  }
  // the Rimewater's seas: stacks and skerries off its cliffs, seals in the
  // Wolfsound, bergs among the floes, the Bergwater's stranded bergs, the
  // kraken in its firth, and longships under sail — at the Jarl's moorings,
  // in the sound, and a raid putting out south for the fen
  const atSea = (x, y, lo = 3, hi = 1e9) => { const ax = artX(x), ay = artY(y); if (ax < 0 || ay < 0 || ax >= AW || ay >= AH) return false; const i = ay * AW + ax; return !base.land[i] && !base.cliff[i] && base.seaD[i] >= lo * U && base.seaD[i] <= hi * U; };
  for (const [x, y, v] of [[648, -306, 0], [614, -305, 1], [262, -382, 2], [258, -496, 0], [262, -536, 1], [418, -616, 2], [822, -520, 0], [790, -330, 1], [268, -414, 2], [700, -614, 0], [356, -620, 1]])
    if (atSea(x, y, 3, 22)) stamp(ctx, seaStack(v), x, y, 2.5, 8.4);
  for (const [x, y, v] of [[414, -453, 0], [458, -456, 1]]) if (atSea(x, y, 1.5)) stamp(ctx, sealRock(v), x, y, 3.5, 3.6);
  for (const [x, y, v] of [[206, -520, 0], [196, -606, 1], [322, -630, 2], [560, -630, 0], [766, -624, 1], [838, -566, 2], [842, -336, 0], [222, -346, 1], [836, -492, 2], [128, -560, 0], [88, -470, 1], [640, -630, 2], [452, -632, 1]])
    if (atSea(x, y, 6)) stamp(ctx, berg(v), x, y, 4.5, 6.2);
  for (const [x, y, v] of [[588, -523, 0], [598, -518, 1]]) stamp(ctx, berg(v + 3), x, y, 4.5, 6.2);
  if (atSea(776, -546, 3)) stamp(ctx, krakenArms(), 776, -546, 8, 8.6);
  for (const [x, y, v] of [[586, -596, 1], [262, -446, 0], [470, -456, 1], [612, -296, 0], [560, -300, 1], [786, -612, 0]])
    if (atSea(x, y, 2)) stamp(ctx, shipSail(v), x, y, 6, 9.6);
  return { canvas: cv, base };
}

// ---- terrain, cached -------------------------------------------------
// The land is painted in stages (a generator), so the title screen can lay
// it out a slice at a time while the player reads the menu; asking for it
// outright finishes whatever is left at once.
// PAINT_MS keeps how long each stage took (map-lab.html reports them).
let TERRAIN = null, GEN = null;
export const PAINT_MS = [];
const next = () => { const t = performance.now(), r = GEN.next(); PAINT_MS.push(Math.round(performance.now() - t)); return r; };
export function mapTerrain() {
  if (TERRAIN) return TERRAIN;
  GEN = GEN || paintTerrain();
  let r;
  do r = next(); while (!r.done);
  GEN = null;
  return (TERRAIN = r.value);
}
export function warmMapTerrain() {
  if (TERRAIN || GEN) return;
  GEN = paintTerrain();
  const step = () => {
    if (TERRAIN || !GEN) return;
    const r = next();
    if (r.done) { TERRAIN = r.value; GEN = null; } else setTimeout(step, 16);
  };
  setTimeout(step, 16);
}

// A puff of cloud: a few lit balls heaped together, pale on top and
// lavender-grey beneath, ringed in a soft slate line. Unlit, it is the
// flat shape of its own shadow.
const PUFFS = new Map();
const cloudPuff = (v, lit = false) => {
  const key = `${v}${lit}`;
  if (PUFFS.has(key)) return PUFFS.get(key);
  const w = 26 + v * 7, h = 15;
  const cv = mk(Math.ceil(w * U), Math.ceil(h * U)), c = cv.getContext("2d", RF);
  c.scale(U, U);
  const balls = [[w * 0.22, 10, 5], [w * 0.45, 9.4, 6.2], [w * 0.7, 10, 5.4], [w * 0.36, 6.4, 5.4], [w * 0.58, 6, 4.8]];
  if (v % 2) balls.push([w * 0.85, 10.6, 3.8]);
  if (v > 1) balls.push([w * 0.12, 11, 3.4]);
  for (const [x, y, r] of balls) {
    if (lit) ball(c, x, y, r, r * 0.86, "#d4d8e4", { hi: 0.6, lo: 0.45 });
    else { c.fillStyle = "#2a1c2c"; c.beginPath(); c.ellipse(x, y, r, r * 0.86, 0, 0, Math.PI * 2); c.fill(); }
  }
  // a flat underside
  c.clearRect(0, 12.6, w, h);
  crisp(cv);
  if (lit) inkOutline(cv, "#4a5064", 1);
  PUFFS.set(key, cv);
  return cv;
};

// ---- sealed countries ------------------------------------------------
// A country you have not reached yet lies under cloud: its colours drained
// toward slate, and banks of pale mist rolling over it. One composite per
// combination of sealed countries, cached.
const SEALED = new Map();
export function terrainFor(progress) {
  const T = mapTerrain();
  const sealed = CHAPTERS.map((ch, k) => (isUnlocked(ch.levels[0].id, progress) ? -1 : zoneOfChapter(k))).filter((k) => k >= 0);
  const key = sealed.join(",");
  if (!key) return T.canvas;
  if (SEALED.has(key)) return SEALED.get(key);
  const cv = mk(), c = cv.getContext("2d", RF);
  c.drawImage(T.canvas, 0, 0);
  const img = c.getImageData(0, 0, AW, AH), d = img.data;
  const { zoneOf, seaD } = T.base;
  const slate = rgb("#566074");
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x;
    // a ragged border where a sealed country meets an open one
    const jx = Math.max(0, Math.min(AW - 1, x + Math.round((vnoise(x, y, 10, 95) - 0.5) * 26)));
    const jy = Math.max(0, Math.min(AH - 1, y + Math.round((vnoise(x, y, 10, 96) - 0.5) * 26)));
    if (!sealed.includes(zoneOf[jy * AW + jx])) continue;
    const reach = seaD[i] + (vnoise(x, y, 18, 97) - 0.5) * 22;
    if (reach > 26) continue;
    // the edge of the fog bank, dithered into the clear sea
    const edge = Math.max(0, Math.min(1, (26 - reach) / 8));
    if (edge < 1 && bayer(x, y) > edge) continue;
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const l = (r * 0.3 + g * 0.55 + b * 0.15) / 255;
    let o = [slate[0] + (l - 0.45) * 120, slate[1] + (l - 0.45) * 120, slate[2] + (l - 0.45) * 110];
    d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2];
  }
  c.putImageData(img, 0, 0);
  // and clouds sitting over it, each with its shadow on the ground
  const puffs = [];
  for (let gy = MAP.y + 8; gy < MAP.y + MAP.h; gy += 27) for (let gx = MAP.x + 4; gx < MAP.x + MAP.w; gx += 46) {
    const k = Math.round(gx * 13 + gy * 7);
    const x = gx + (hash(k, 1) - 0.5) * 26 + ((Math.round(gy / 27) & 1) ? 23 : 0), y = gy + (hash(k, 2) - 0.5) * 12;
    const ax = artX(x), ay = artY(y);
    if (ax < 0 || ay < 0 || ax >= AW || ay >= AH) continue;
    const i = ay * AW + ax;
    if (!sealed.includes(zoneOf[i]) || seaD[i] > 8 || hash(k, 3) < 0.25) continue;
    puffs.push([x, y, Math.floor(hash(k, 4) * 4)]);
  }
  c.globalAlpha = 0.3;
  for (const [x, y, v] of puffs) { const p = cloudPuff(v); c.drawImage(p, artX(x + 3) - p.width / 2, artY(y + 4) - p.height / 2); }
  c.globalAlpha = 1;
  // the shadow first (drawn in plum through the alpha above), then the cloud
  for (const [x, y, v] of puffs) { const p = cloudPuff(v, true); c.drawImage(p, artX(x) - p.width / 2, artY(y) - p.height / 2); }
  SEALED.set(key, cv);
  return cv;
}

// ---- waypoints ---------------------------------------------------------
// The crown's banner, planted where a level has been won.
const MK = 1.3;
const flag = () => spr("flag", 10 * MK, 16 * MK, (c) => {
  c.scale(MK, MK);
  c.fillStyle = "#8a8474"; c.fillRect(0.6, 13.6, 5.4, 2.2);
  c.fillStyle = "#b4ad9c"; c.fillRect(0.6, 13.6, 3, 1);
  c.fillStyle = "#6b4a2e"; c.fillRect(2.6, 0.6, 1.2, 13.4);
  c.fillStyle = "#d8b34a"; c.fillRect(2.4, 0, 1.6, 1.2);
  c.fillStyle = "#a8505c"; poly(c, [[3.8, 1.4], [9.8, 1.4], [8.4, 4.2], [9.8, 7], [3.8, 7]]); c.fill();
  c.fillStyle = "#c46a70"; c.fillRect(3.8, 1.4, 5.6, 1.1);
  // the crown, in gold
  c.fillStyle = "#e8c65a"; c.fillRect(4.8, 4, 3, 1.4);
  c.fillRect(4.8, 2.8, 0.8, 1.2); c.fillRect(5.9, 2.4, 0.8, 1.6); c.fillRect(7, 2.8, 0.8, 1.2);
});
// A shield on a post: the next battle. Boss fights carry a skull.
const shield = (boss, lit) => spr(`shield${boss}${lit}`, 11 * MK, 15 * MK, (c) => {
  c.scale(MK, MK);
  c.fillStyle = lit ? "#6b4a2e" : "#4a4450"; c.fillRect(4.8, 9, 1.4, 6);
  const rim = lit ? "#d8b34a" : "#7a7680", field = !lit ? "#5a5664" : boss ? "#3a2a3a" : "#a8505c";
  const heater = (inset) => {
    c.beginPath();
    c.moveTo(0.4 + inset, 0.4 + inset); c.lineTo(10.6 - inset, 0.4 + inset); c.lineTo(10.6 - inset, 5 + inset * 0.2);
    c.quadraticCurveTo(10.4 - inset, 9.6 - inset * 0.4, 5.5, 12.2 - inset * 1.2);
    c.quadraticCurveTo(0.6 + inset, 9.6 - inset * 0.4, 0.4 + inset, 5 + inset * 0.2);
    c.closePath(); c.fill();
  };
  c.fillStyle = rim; heater(0);
  c.fillStyle = field; heater(1.2);
  // the lit half of the field
  c.save(); c.beginPath(); c.rect(0, 0, 5.5, 13); c.clip();
  c.fillStyle = lit ? (boss ? "#4e3a4c" : "#c46a70") : "#66626e"; heater(1.2);
  c.restore();
  if (lit) { c.fillStyle = "#f2dc8a"; c.fillRect(0.4, 0.4, 10.2, 0.9); }
  if (boss) {
    // a skull: dome, eyes, jaw
    c.fillStyle = lit ? "#ece4d0" : "#9a96a0";
    ball(c, 5.5, 5, 2.6, 2.3, lit ? "#ece4d0" : "#9a96a0", { hi: 0.3, lo: 0.25 });
    c.fillRect(4, 6.2, 3, 2);
    c.fillStyle = "#2a1c2c"; c.fillRect(4.1, 4.6, 1.1, 1.2); c.fillRect(5.9, 4.6, 1.1, 1.2); c.fillRect(4.8, 7.4, 0.5, 0.8); c.fillRect(5.8, 7.4, 0.5, 0.8);
  } else if (lit) {
    // a sword, point down
    c.fillStyle = "#eef0f4"; c.fillRect(5, 2.6, 1.1, 6.2);
    c.fillStyle = "#c4c8d0"; c.fillRect(5.6, 2.6, 0.5, 6.2);
    c.fillStyle = "#e8c65a"; c.fillRect(3.4, 3.8, 4.2, 1); c.fillRect(5, 1.6, 1.1, 1.1);
  } else {
    // a padlock
    c.strokeStyle = "#8e8a96"; c.lineWidth = 0.9; c.beginPath(); c.arc(5.5, 5.2, 1.5, Math.PI, 0); c.stroke();
    c.fillStyle = "#8e8a96"; c.fillRect(3.6, 5.2, 3.8, 3);
    c.fillStyle = "#3a3640"; c.fillRect(5.2, 6, 0.7, 1.4);
  }
});
const star = (lit) => spr(`star${lit}`, 5, 5, (c) => {
  c.scale(1.25, 1.25);
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 0.9 : 2;
    pts.push([2 + Math.cos(a) * r, 2.1 + Math.sin(a) * r]);
  }
  c.fillStyle = lit ? "#f2cf4a" : "#4a4450"; poly(c, pts); c.fill();
  if (lit) { c.fillStyle = "#fff3d2"; c.fillRect(1.6, 1.2, 0.8, 0.8); }
});


// The progress layer: gold over walked road, and every waypoint's marker.
export function drawMapState(ctx, { progress, stars = {} }) {
  const T = mapTerrain();
  // the walked road, gilded
  const walked = ROADS.filter((rd) => progress.cleared[rd.from]);
  if (walked.length) {
    const gold = layer((c) => {
      c.lineJoin = "round"; c.lineCap = "round";
      for (const rd of walked) { c.strokeStyle = "#e8c65a"; c.lineWidth = 1.3; poly(c, rd.pts); c.stroke(); }
    }, "#9a7a2a");
    // over the sea it is a line of gold dots, like the ferry lane
    const g = gold.getContext("2d", RF);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(landMaskOf(T.base), 0, 0);
    ctx.drawImage(gold, 0, 0);
    const dots = layer((c) => {
      c.fillStyle = "#e8c65a";
      for (const rd of walked) rd.pts.forEach(([x, y], k) => { if (k % 3 === 0) c.fillRect(x - 0.7, y - 0.7, 1.4, 1.4); });
    });
    const dc = dots.getContext("2d", RF);
    dc.setTransform(1, 0, 0, 1, 0, 0);
    dc.globalCompositeOperation = "destination-out";
    dc.drawImage(landMaskOf(T.base), 0, 0);
    ctx.drawImage(dots, 0, 0);
  }
  // the markers, back to front
  const order = [...LEVELS].sort((a, b) => a.pos[1] - b.pos[1]);
  for (const lv of order) {
    const [x, y] = lv.pos;
    const won = !!progress.cleared[lv.id], open = isUnlocked(lv.id, progress);
    const boss = lv.index === lv.chapter.levels.length - 1;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#2a1c2c";
    ctx.fillRect(artX(x - 4), artY(y - 0.6), 9 * U, 2 * U);
    ctx.fillRect(artX(x - 5.5), artY(y - 0.1), 12 * U, 1 * U);
    ctx.globalAlpha = 1;
    if (won) stamp(ctx, flag(), x, y, 3.2 * MK, 15.4 * MK);
    else stamp(ctx, shield(boss, open), x, y, 5.5 * MK, 14.6 * MK);
    if (won) {
      const n = stars[lv.id] || 0;
      for (let k = 0; k < MAX_STARS; k++) stamp(ctx, star(k < n), x - 11.3 + k * 4.4, y + 0.8, 0, 0);
    }
  }
}
let LANDMASK = null;
const landMaskOf = (base) => {
  if (LANDMASK) return LANDMASK;
  const cv = mk(), c = cv.getContext("2d", RF), im = new ImageData(AW, AH);
  for (let i = 0; i < AW * AH; i++) im.data[i * 4 + 3] = base.land[i] ? 255 : 0;
  c.putImageData(im, 0, 0);
  return (LANDMASK = cv);
};
