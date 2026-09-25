// ============ CAMPAIGN MAP ART ============
// The continent, painted once as pixel art: sea and shallows, inked coasts
// with a cliff lip on their southern faces, three countries that look like
// three countries (the green vale, the grey-blue Marches, the drowned purple
// fen), and the dressing that tells them apart. Everything is laid out in the
// map's own 400x360 unit space (y from -120 to 240) and baked at U art pixels
// per unit — the same density as the board. The markers, the gold of the
// walked road and the fog over sealed countries go on a second, cheap layer
// that is redrawn whenever progress changes (see drawMapState).

import { CHAPTERS, LEVELS, isUnlocked } from "../data/campaign.js";
import { MAX_STARS } from "../data/profile.js";
import { hash, darken, rgb, ball, blobBall, cone, inkOutline } from "../render/paint.js";

export const U = 2;                         // art pixels per map unit
export const MAP = { x: 0, y: -120, w: 400, h: 360 };
export const AW = MAP.w * U, AH = MAP.h * U; // art size
const INK = "#241a26";
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
const ISTHMUS = "M158,90 C182,80 204,94 220,106 C234,120 232,146 216,156 C200,166 178,158 168,144 C154,126 150,100 158,90 Z";
const ISLES = [
  "M18,-28 C14,-36 22,-42 30,-40 C38,-38 40,-30 34,-24 C28,-20 20,-22 18,-28 Z",
  "M178,-62 C176,-70 184,-74 190,-72 C196,-70 196,-62 190,-58 C184,-56 180,-58 178,-62 Z",
  "M196,196 C194,190 200,187 205,189 C210,192 208,198 203,200 C199,201 197,199 196,196 Z",
];
// zone ids: 0-2 the chapters, 3 the isthmus (a mountain wall), 4 the islets
export const ZONES = [...CHAPTERS.map((c) => c.region), ISTHMUS, ISLES];

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
  // the Iron Marches: grey-blue moor and heather
  { lo: "#6b798c", mid: "#8190a0", hi: "#98a6b0", alt: "#8a9784", cliff: ["#9a948c", "#76716c", "#55504f"], sand: "#c8c0a8" },
  // the Hollowfen: murky purple bog
  { lo: "#54467a", mid: "#66578a", hi: "#7a6b9c", alt: "#5d6650", cliff: ["#7a6878", "#5b4a5e", "#3e3246"], sand: "#8e8298" },
  // the isthmus: stony upland between the two
  { lo: "#6c7c5a", mid: "#7c8c66", hi: "#929c78", alt: "#8a8a70", cliff: ["#9a8c78", "#76695a", "#554a40"], sand: "#d4c498" },
  // the islets
  { lo: "#5f7a48", mid: "#7ea05a", hi: "#a0bc70", alt: "#8aa060", cliff: ["#a89478", "#80705a", "#5a4c40"], sand: "#e2d29a" },
];

// ---- the base: land, cliffs, sea ------------------------------------
function* paintBase() {
  const w = AW, h = AH, N = w * h;
  // each zone's own soft mask
  const soft = ZONES.map((paths) => {
    const cv = mk(), c = cv.getContext("2d", RF);
    toArt(c);
    c.fillStyle = "#fff";
    for (const p of [].concat(paths)) c.fill(new Path2D(p));
    const d = c.getImageData(0, 0, w, h).data, f = new Float32Array(N);
    for (let i = 0; i < N; i++) f[i] = d[i * 4 + 3] / 255;
    return blur(blur(f, w, h, 4), w, h, 3);
  });
  yield;
  const keep = ZONES.map(() => new Float32Array(N));
  for (const lv of LEVELS) {
    const k = CHAPTERS.indexOf(lv.chapter), r = 16 * U;
    const cx = (lv.pos[0] - MAP.x) * U, cy = (lv.pos[1] - MAP.y) * U;
    for (let y = Math.max(0, cy - r); y < Math.min(h, cy + r); y++) for (let x = Math.max(0, cx - r); x < Math.min(w, cx + r); x++) {
      const dd = Math.hypot(x - cx, y - cy) / r;
      if (dd < 1) keep[k][y * w + x] = Math.max(keep[k][y * w + x], Math.min(1, (1 - dd) * 2.2));
    }
  }
  // warp the coasts with noise — bays and headlands, not ovals — and give
  // each pixel to its strongest zone (with a ragged border between them)
  const W8 = 80, G = 4, gw = Math.ceil(w / G) + 1, gh = Math.ceil(h / G) + 1;
  // the warp is smooth, so work it out on a coarse grid and blend between
  const wxg = new Float32Array(gw * gh), wyg = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    wxg[gy * gw + gx] = (fbm(gx * G, gy * G, 90, 71) - 0.5) * W8;
    wyg[gy * gw + gx] = (fbm(gx * G, gy * G, 90, 72) - 0.5) * W8;
  }
  const bil = (f, x, y) => {
    const fx = x / G, fy = y / G, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, i = iy * gw + ix;
    return (f[i] * (1 - tx) + f[i + 1] * tx) * (1 - ty) + (f[i + gw] * (1 - tx) + f[i + gw + 1] * tx) * ty;
  };
  const land = new Uint8Array(N), zone = new Int8Array(N).fill(-1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const wx = Math.round(x + bil(wxg, x, y)), wy = Math.round(y + bil(wyg, x, y));
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
  // how far inland each land pixel is
  const wet = new Uint8Array(N);
  for (let i = 0; i < N; i++) wet[i] = land[i] ? 0 : 1;
  const inland = distance(wet, zone, w, h).D;

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
  const S = { deep: rgb(SEA.deep), mid: rgb(SEA.mid), shal: rgb(SEA.shal), reef: rgb(SEA.reef), foam: rgb(SEA.foam), swell: rgb(SEA.swell), ink: rgb(INK) };

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
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
      let col = band < 0.27 ? p.lo : band > 0.75 ? p.hi : p.mid;
      // broad patches of the country's second colour (heather, moss, meadow)
      if (col === p.mid && fbm(x, y, 40, 21 + z) > 0.63 + bayer(x, y) * 0.05) col = p.alt;
      // a strip of beach on the lower coasts of the green lands
      if ((z === 0 || z === 4) && inland[i] < 5 && fbm(x, y, 20, 31) > 0.5) col = p.sand;
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
    put(i, b < 9 ? S.reef : b < 20 ? S.shal : b < 34 ? S.mid : S.deep);
  }

  // swells in the open water: short pale ticks, as on an old chart
  for (let k = 0; k < 150; k++) {
    const x = Math.floor(hash(k, 61) * (w - 12)), y = Math.floor(hash(k, 62) * (h - 6));
    const i = y * w + x;
    if (sea.D[i] < 22) continue;
    const len = 5 + Math.floor(hash(k, 63) * 5);
    for (let t = 0; t < len; t++) {
      const yy = y + (t === 0 || t === len - 1 ? 1 : 0);
      put(yy * w + x + t, S.swell);
    }
  }

  const cv = mk();
  cv.getContext("2d", RF).putImageData(img, 0, 0);
  return { cv, land, zone, cliff, seaD: sea.D, zoneOf: sea.L };
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
const segDist = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2));
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
};
const lineDist = (x, y, pts) => { let m = 1e9; for (let i = 0; i < pts.length - 1; i++) m = Math.min(m, segDist(x, y, pts[i], pts[i + 1])); return m; };

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
// (checked against REALMS[..].rivers / ponds in data/maps.js — keep it so).
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
function river({ ctrl, pins = [], seed, w0, w1, amp = 5.5, fen = false }) {
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
    for (const ps of pinS) env *= smooth(Math.min(1, Math.abs(sa - ps) / 13));
    const off = ((fbm(sa * 3, seed * 7.3, 66, seed) - 0.5) * 2 * amp + (fbm(sa * 9, seed * 3.1, 36, seed + 5) - 0.5) * 2 * amp * 0.45) * env;
    mid.push([base[i][0] + nb[i][0] * off, base[i][1] + nb[i][1] * off]);
  }
  const hw = mid.map((_, i) => ((w0 + (w1 - w0) * (cum[i] / L)) / 2) * (0.82 + fbm(cum[i] * 6, seed, 30, seed + 9) * 0.36));
  return { pts: mid, hw, nrm: normals(mid), w: Math.max(w0, w1), fen };
}
export const RIVERS = [
  // the Wolfrun, off the northern hills, through the Wolfrun fords, out west
  river({ ctrl: [[84, 4], [81, 12], [79, 19], [76, 26], [67, 31], [56, 34], [44, 40], [31, 42], [18, 46], [6, 48]], pins: [[76, 26]], seed: 11, w0: 1.9, w1: 3.9 }),
  // the Cinderburn, out of the ridge between the Barrowfields and Cinderholt,
  // down to the Fox Mere
  river({ ctrl: [[138, 34], [132, 45], [136, 57], [131, 69], [126, 81], [127, 94], [121, 106], [120, 121]], pins: [[120, 121]], seed: 19, w0: 1.8, w1: 3.4, amp: 4 }),
  // out of the Fox Mere to the southern sea
  river({ ctrl: [[124, 134], [129, 143], [136, 152], [140, 166], [146, 180], [150, 194], [154, 210]], pins: [[124, 134]], seed: 13, w0: 3.8, w1: 4.8 }),
  // the Thornbrook, out of Oakmere's mere, across the farmland, through the
  // ford at Thornbrook and down to the sea
  river({ ctrl: [[44, 117], [52, 125], [62, 131], [75, 138], [88, 146], [93, 158], [97, 172], [98, 188], [101, 210]], pins: [[44, 117], [88, 146]], seed: 14, w0: 2.1, w1: 3.6, amp: 4 }),
  // the Iron river, out of its tarn above the ford, through Ironford, south
  river({ ctrl: [[295, 103], [298, 114], [301, 127], [304, 140], [308, 155], [305, 171], [301, 189], [297, 216]], pins: [[295, 103], [304, 140]], seed: 15, w0: 2.2, w1: 4.2 }),
  // the fen's black rivers: the Blackwater past the Throne of Dust and the
  // Grave Road, out to the eastern sea
  river({ ctrl: [[344, -104], [352, -95], [360, -86], [361, -70], [358, -55], [362, -40], [368, -26], [380, -30], [396, -36]], pins: [[360, -86], [368, -26]], seed: 16, w0: 1.9, w1: 3.9, amp: 4.5, fen: true }),
  // the Sorrow, south through the Cairnfields and the Causeway to the sea
  river({ ctrl: [[295, -110], [297, -92], [298, -70], [303, -55], [308, -40], [310, -26], [313, -12], [317, 6]], pins: [[298, -70], [310, -26]], seed: 17, w0: 1.8, w1: 3.6, amp: 4.5, fen: true }),
  // a slow creek through Bellmarsh to the western shore
  river({ ctrl: [[276, -50], [270, -40], [262, -36], [257, -30], [252, -26], [245, -18], [238, -17], [230, -12]], pins: [[252, -26]], seed: 18, w0: 1.6, w1: 2.8, amp: 4, fen: true }),
];
// Lakes and tarns, each named for the level it sits by; fen pools are the
// bog's black water. rot tilts the long axis; seed shapes the shore.
const MERES = [
  { x: 121, y: 129, rx: 8.5, ry: 5.2, rot: 0.35, seed: 3 },               // the Fox Mere, by Foxmere
  { x: 40, y: 113, rx: 6, ry: 4, rot: -0.4, seed: 4 },                    // Oakmere's mere, the Thornbrook's source
  { x: 45, y: 72, rx: 4.6, ry: 2.8, rot: 0.2, seed: 5 },                  // the Bramblewick millpond
  { x: 137, y: 3, rx: 5, ry: 3, rot: -0.2, seed: 6 },                     // the tarn under Ravenscar
  { x: 294, y: 100, rx: 3.6, ry: 2.4, rot: 0.5, seed: 7 },                // the Iron river's tarn
  { x: 231, y: 102, rx: 5, ry: 3.4, rot: 0.3, seed: 8 },                  // the Muster's ponds
  { x: 367, y: 116, rx: 4.6, ry: 3.2, rot: -0.5, seed: 9 },               // the pool under the Undercliff
  { x: 263, y: -97, rx: 7.8, ry: 4.9, rot: 0.25, seed: 20, fen: true },     // Wightwood's bog
  { x: 293, y: -36, rx: 6.5, ry: 3.9, rot: -0.3, seed: 21, fen: true },       // the Causeway's drowned fields
  { x: 324, y: -33, rx: 4.7, ry: 3.1, rot: 0.6, seed: 22, fen: true },
  { x: 240, y: -40, rx: 5.2, ry: 3.6, rot: 0.1, seed: 23, fen: true },      // Bellmarsh's mire
  { x: 374, y: -74, rx: 5.7, ry: 3.9, rot: -0.4, seed: 24, fen: true },     // the Throne's black pool
];
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
export const LABEL_SIDE = { foxmere: "a", ravenscar: "a", muster: "a", ir5: "a" };
export const LABEL_FONT = 6.8;   // map units
let MEASURE = null;
export const textW = (t) => {
  if (!MEASURE) { MEASURE = mk(8, 8).getContext("2d", RF); MEASURE.font = `bold ${LABEL_FONT * 10}px Verdana, Geneva, sans-serif`; }
  return MEASURE.measureText(t).width / 10;
};
export const labelBox = (lv) => {
  const tw = textW(lv.short || lv.name) + 7, th = 10;
  const [x, y] = lv.pos, side = LABEL_SIDE[lv.id] || "b";
  if (side === "a") return { x: x - tw / 2, y: y - 25 - th, w: tw, h: th };
  if (side === "l") return { x: x - 9 - tw, y: y - th / 2, w: tw, h: th };
  if (side === "r") return { x: x + 9, y: y - th / 2, w: tw, h: th };
  return { x: x - tw / 2, y: y + 7.5, w: tw, h: th };
};

// the chapters' name ribbons, out at sea off their own coasts
export const BANNER_AT = { greenwood: [108, 222], iron: [300, 226], hollow: [150, -40] };
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
  for (const rv of RIVERS) { c.lineWidth = rv.w * 2 + 2.4; poly(c, rv.pts); c.stroke(); }
  for (const m of MERES) { c.beginPath(); c.ellipse(m.x, m.y, m.rx + 2, m.ry + 2, 0, 0, Math.PI * 2); c.fill(); }
  const d = c.getImageData(0, 0, w, h).data, set = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) set[i] = d[i * 4 + 3] > 60 ? 1 : 0;
  return (BUSY = distance(set, new Int8Array(w * h), w, h).D);
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
const IRONPK = { key: "i", lit: "#aab0b8", mid: "#8a90a0", dark: "#5e6278", snow: "#f2f2ea", snowDk: "#aebcd4" };
const HILLG = { key: "g", lit: "#9cc462", mid: "#82b256", dark: "#5f8f43" };
const CRAG = { key: "c", lit: "#b0aca4", mid: "#8e8a86", dark: "#646070" };
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
// a grey keep of the Marches: stone, battlements, a slate cap
const keep = (v) => spr(`keep${v}`, 7, 12, (c) => {
  const tall = v % 2 ? 0 : 1.5;
  c.fillStyle = "#a19a8a"; c.fillRect(1.2, 3.4 - tall, 4.6, 8.4 + tall);
  c.fillStyle = "#7e776c"; c.fillRect(4, 3.4 - tall, 1.8, 8.4 + tall);
  c.fillStyle = "#b4ad9c"; c.fillRect(0.8, 2.2 - tall, 5.4, 1.4);
  c.fillStyle = "#a19a8a";
  for (let k = 0; k < 3; k++) c.fillRect(0.8 + k * 2, 1.2 - tall, 1.2, 1.2);
  c.fillStyle = "#2a2230"; c.fillRect(2.8, 5.4 - tall, 1, 1.6); c.fillRect(2.8, 9.6, 1.4, 2.2);
  c.fillStyle = "#56647a"; poly(c, [[5.9, 1.2 - tall], [5.9, -0 - tall], [7, 0.6 - tall]]); c.fill();
});
// the Marches' tents on the muster field
const tent = (v) => spr(`tent${v}`, 6, 5, (c) => {
  c.fillStyle = v % 2 ? "#e8e0cc" : "#d8ccb0"; poly(c, [[0.2, 4.8], [3, 0.4], [5.8, 4.8]]); c.fill();
  c.fillStyle = v % 2 ? "#56647a" : "#b8ac92"; poly(c, [[3, 0.4], [5.8, 4.8], [3.8, 4.8]]); c.fill();
  c.fillStyle = "#2a2230"; poly(c, [[2.4, 4.8], [3, 2.6], [3.4, 4.8]]); c.fill();
});
// a standing stone of the fen
const menhir = (v) => spr(`men${v}`, 3, 6, (c) => {
  c.fillStyle = "#9a94a0"; poly(c, [[0.3, 5.8], [0.6, 1], [1.6, 0.2], [2.6, 1.2], [2.7, 5.8]]); c.fill();
  c.fillStyle = "#6e6680"; c.fillRect(1.8, 1, 0.9, 4.8);
});
// a cairn: a heap of stones
const cairn = (v) => spr(`cairn${v}`, 6, 5, (c) => {
  ball(c, 3, 3.6, 2.8, 1.5, "#8e8898", { hi: 0.4, lo: 0.5 });
  ball(c, 2.6, 2.2, 1.8, 1.2, "#9a94a4", { hi: 0.4, lo: 0.5 });
  ball(c, 3.2, 1.1, 1, 0.9, "#a8a2b0", { hi: 0.4, lo: 0.5 });
});
// reeds
const reeds = (v) => spr(`reed${v}`, 4, 4, (c) => {
  c.fillStyle = v % 2 ? "#7a8a58" : "#6a7a50";
  for (let k = 0; k < 3; k++) c.fillRect(0.6 + k * 1.2, 1 + (k % 2) * 0.8, 0.6, 3 - (k % 2) * 0.8);
  c.fillStyle = "#5a4034"; c.fillRect(1.8, 0.4, 0.6, 1);
}, 0);

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
const citadel = () => spr("citadel", 24, 18, (c) => {
  const stone = "#9a9aa4", dk = "#6e6e80", lit = "#b8b8c0", roof = "#46546c";
  c.fillStyle = stone; c.fillRect(1, 9, 22, 8.6);
  c.fillStyle = dk; c.fillRect(1, 15.6, 22, 2);
  c.fillStyle = lit; for (let k = 0; k < 11; k++) c.fillRect(1 + k * 2, 8, 1.2, 1.4);
  const tower = (x, top, w) => {
    c.fillStyle = stone; c.fillRect(x, top, w, 17.6 - top);
    c.fillStyle = dk; c.fillRect(x + w * 0.6, top, w * 0.4, 17.6 - top);
    c.fillStyle = lit; for (let k = 0; k < Math.floor(w / 1.6); k++) c.fillRect(x + k * 1.6, top - 1, 0.9, 1.2);
    c.fillStyle = "#2a2230"; c.fillRect(x + w / 2 - 0.4, top + 2.2, 0.9, 1.6);
  };
  tower(0, 5, 4); tower(20, 5, 4); tower(6, 6.5, 3.2); tower(14.8, 6.5, 3.2);
  tower(9.6, 1.6, 4.8);
  c.fillStyle = roof; poly(c, [[9.2, 1.2], [12, -1.4 + 1.4], [14.8, 1.2]]); c.fill();
  c.fillStyle = "#3a2a24"; c.fillRect(10.6, 13.2, 2.8, 4.4);
  c.fillStyle = "#56647a"; c.fillRect(2, 1.4, 0.5, 3.6); c.fillRect(2.5, 1.4, 2.4, 1.4);
  c.fillStyle = "#56647a"; c.fillRect(21.2, 1.4, 0.5, 3.6); c.fillRect(21.7, 1.4, 2.2, 1.4);
});
const ruin = () => spr("ruin", 20, 16, (c) => {
  const st = "#6e647c", dk = "#4a4058", lit = "#8a80a0";
  c.fillStyle = st; c.fillRect(1, 9, 18, 6.6);
  c.fillStyle = dk; c.fillRect(1, 13.8, 18, 1.8);
  // broken towers
  c.fillStyle = st; poly(c, [[1, 15.6], [1, 3], [2.6, 2], [3.4, 4], [5, 3.2], [5, 15.6]]); c.fill();
  c.fillStyle = dk; c.fillRect(3.6, 3.4, 1.4, 12.2);
  c.fillStyle = st; poly(c, [[7.4, 15.6], [7.4, 1], [9.4, 0.2], [11, 2.2], [12.6, 0.6], [12.6, 15.6]]); c.fill();
  c.fillStyle = dk; c.fillRect(10.8, 1.6, 1.8, 14);
  c.fillStyle = st; poly(c, [[15, 15.6], [15, 5], [17, 6.4], [19, 4.6], [19, 15.6]]); c.fill();
  c.fillStyle = dk; c.fillRect(17.6, 5, 1.4, 10.6);
  c.fillStyle = lit; c.fillRect(1, 3, 1.2, 12.6); c.fillRect(7.4, 1, 1.2, 14.6);
  // the dead court's lights
  c.fillStyle = "#9ae8b0"; c.fillRect(9.4, 5, 1.2, 1.8); c.fillRect(2.4, 8, 1, 1.4); c.fillRect(16.4, 9, 1, 1.4);
  c.fillStyle = "#2a2230"; c.fillRect(8.8, 11.6, 2.4, 4);
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

// ---- the dressing ------------------------------------------------------
// Everything that stands on the land, gathered as [sprite, x, y, anchorX,
// anchorY, shadowRx] and drawn back to front.
function dressing(base) {
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
  const taken = [];
  const free = (x, y, r) => !busy(x, y, r * 0.5) && taken.every(([tx, ty, tr]) => Math.hypot(x - tx, y - ty) > (r + tr) * 0.5);
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
  const piece = (s, x, y, r, sh, force = false) => { if (!force && busy(x, y - 1, 1)) return; add(s, x, y, sh); taken.push([x, y, r]); };
  piece(crownCastle(), 84, 190, 14, 9, true);
  piece(windmill(), 122, 162, 6, 3);
  piece(citadel(), 373, 64, 14, 9, true);
  piece(ruin(), 381, -90, 12, 8, true);
  for (const [x, y, v] of [[96, 162, 0], [104, 158, 1], [92, 170, 2], [58, 156, 3], [64, 150, 1], [112, 150, 2]]) piece(cottage(v), x, y, 4, 2.2);
  for (const [x, y, v] of [[84, 50, 0], [124, 46, 1], [90, 76, 2], [120, 78, 3]]) piece(barrow(v), x, y, 6, 3.5);
  for (const [x, y, v] of [[266, 132, 0], [286, 164, 1], [322, 170, 0], [376, 96, 1], [292, 96, 0], [254, 184, 1], [340, 150, 1]]) piece(keep(v), x, y, 5, 2.6);
  for (const [x, y, v] of [[256, 104, 0], [262, 110, 1], [256, 116, 0], [268, 102, 1], [268, 116, 0]]) piece(tent(v), x, y, 3, 2);
  for (const [x, y, v] of [[264, -52, 0], [270, -46, 1], [264, -40, 0], [276, -52, 1], [276, -40, 0]]) piece(menhir(v), x, y, 2, 1.4);
  for (const [x, y, v] of [[330, -76, 0], [300, -102, 1], [338, -104, 2], [298, -72, 0], [322, -60, 1]]) piece(cairn(v), x, y, 3, 2);

  // mountains: the wall across the isthmus, the Marches' high ranges
  const range = (cx, cy, rx, ry, z, pal, seed, big = 1) => {
    for (let k = 0; k < 60; k++) {
      const a = hash(seed, k * 3) * Math.PI * 2, rr = Math.sqrt(hash(seed, k * 3 + 1));
      const x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr;
      const w = Math.round((12 + hash(seed, k * 3 + 2) * 10) * big), h = Math.round(w * (0.75 + hash(seed, k) * 0.2));
      if (!onZone(x, y, z, 3) || !onZone(x - w / 2, y, z, 1) || !onZone(x + w / 2, y, z, 1)) continue;
      // the peak must not stand on a road, a name or a waypoint
      let clearAll = true;
      for (let sx = -w / 2 + 1; sx <= w / 2 - 1 && clearAll; sx += 2) for (let sy = -h + 3; sy <= 0 && clearAll; sy += 3) {
        if (Math.abs(sx) > (w / 2) * (1 + sy / h) + 0.5) continue;
        if (busy(x + sx, y + sy, 0.5)) clearAll = false;
      }
      if (!clearAll || !free(x, y - h / 3, w * 0.55)) continue;
      add(mountain(w, h, seed * 100 + k, pal), x, y, w * 0.4, w / 2, h - 0.4);
      taken.push([x, y - h / 3, w * 0.55]);
    }
  };
  range(190, 124, 36, 32, 3, ROCK, 1, 1);
  range(300, 66, 46, 20, 1, IRONPK, 2, 1.1);
  range(378, 130, 14, 40, 1, IRONPK, 3, 0.9);
  range(120, -2, 22, 8, 0, ROCK, 4, 0.8);
  // rolling hills in the vale and on the moors
  const hills = (cx, cy, rx, ry, z, pal, seed) => {
    for (let k = 0; k < 24; k++) {
      const x = cx + (hash(seed, k * 2) - 0.5) * 2 * rx, y = cy + (hash(seed, k * 2 + 1) - 0.5) * 2 * ry;
      const w = 10 + Math.round(hash(seed, k) * 8), h = Math.round(w * 0.45);
      if (!onZone(x, y, z, 3) || !free(x, y - 2, w * 0.6) || busy(x, y - 2, w * 0.35)) continue;
      add(hill(w, h, seed * 50 + k, pal), x, y, 0);
      taken.push([x, y - 2, w * 0.6]);
    }
  };
  hills(100, 80, 40, 22, 0, HILLG, 5);
  // crags on the moor: small bare peaks
  const crags = (cx, cy, rx, ry, z, seed) => {
    for (let k = 0; k < 30; k++) {
      const x = cx + (hash(seed, k * 2) - 0.5) * 2 * rx, y = cy + (hash(seed, k * 2 + 1) - 0.5) * 2 * ry;
      const w = 7 + Math.round(hash(seed, k) * 4), h = Math.round(w * 0.7);
      if (!onZone(x, y, z, 3) || !free(x, y - 2, w * 0.7) || busy(x, y - 2, w * 0.45)) continue;
      add(mountain(w, h, seed * 50 + k, CRAG), x, y, w * 0.35, w / 2, h - 0.4);
      taken.push([x, y - 2, w * 0.7]);
    }
  };
  crags(290, 150, 50, 50, 1, 6);
  crags(310, -60, 70, 40, 2, 17);

  // the woods
  const oaks = (k) => (hash(k, 9) < 0.72 ? oak(Math.floor(hash(k, 8) * 4)) : pine(Math.floor(hash(k, 8) * 3)));
  clump(44, 86, 20, 16, 0, 4.2, oaks, 1);
  clump(70, 58, 16, 12, 0, 4.2, oaks, 2);
  // Blackbriar: the deep wood, dark pines packed close; and Cinderholt, the
  // wood the horde burned
  const darks = (k) => pine(Math.floor(hash(k, 8) * 3), true);
  clump(184, 36, 9, 16, 0, 3.4, darks, 18);
  clump(150, 42, 11, 8, 0, 3.4, darks, 20);
  clump(146, 58, 8, 6, 0, 3.6, darks, 21);
  clump(172, 76, 11, 9, 0, 4.4, (k) => deadTree(Math.floor(hash(k, 8) * 4), true), 19, 1.2);
  clump(132, 90, 12, 9, 0, 4.2, oaks, 3);
  clump(36, 144, 10, 12, 0, 4.2, oaks, 4);
  clump(152, 150, 10, 12, 0, 4.2, oaks, 5);
  clump(96, 44, 10, 6, 0, 4.2, oaks, 6);
  clump(62, 118, 10, 7, 0, 4.2, oaks, 7);
  // lone trees across the vale's open ground, sheep in its pastures, hay by
  // its fields
  for (let k = 0; k < 90; k++) {
    const x = 26 + hash(k, 201) * 150, y = 10 + hash(k, 202) * 180;
    if (!onZone(x, y, 0) || !free(x, y, 5) || busy(x, y, 2)) continue;
    add(oaks(k + 500), x, y, 1.6);
    taken.push([x, y, 3]);
  }
  for (const [fx, fy, n] of [[76, 116, 5], [124, 96, 4], [30, 128, 3], [34, 84, 3]]) {
    for (let k = 0; k < n; k++) {
      const x = fx + (hash(fx, k) - 0.5) * 12, y = fy + (hash(fy, k) - 0.5) * 7;
      if (!onZone(x, y, 0) || !free(x, y, 2) || busy(x, y, 0.5)) continue;
      add(sheep(k), x, y, 1);
      taken.push([x, y, 2]);
    }
  }
  for (const [x, y] of [[112, 168], [62, 172], [132, 176], [106, 178]]) if (onZone(x, y, 0) && free(x, y, 3) && !busy(x, y, 0.5)) { add(hay(), x, y, 1.4); taken.push([x, y, 3]); }
  const pines = (k) => pine(Math.floor(hash(k, 8) * 3), true);
  clump(248, 72, 18, 14, 1, 4, pines, 8);
  clump(334, 160, 16, 14, 1, 4, pines, 9);
  clump(252, 166, 10, 10, 1, 4, pines, 10);
  clump(290, 118, 10, 8, 1, 4, pines, 11);
  clump(372, 176, 10, 10, 1, 4, pines, 12);
  const deads = (k) => deadTree(Math.floor(hash(k, 8) * 4));
  clump(246, -86, 22, 22, 2, 5.5, deads, 13, 1.2);
  clump(340, -60, 30, 24, 2, 9, deads, 14, 1.2);
  clump(300, -28, 60, 14, 2, 7, (k) => reeds(Math.floor(hash(k, 8) * 2)), 15, 0, 1);
  clump(310, -80, 60, 30, 2, 8, (k) => reeds(Math.floor(hash(k, 8) * 2)), 16, 0, 1);
  return items;
}

// the fen's black pools, sunk into the purple
function fenPools(ctx, base) {
  const img = ctx.getImageData(0, 0, AW, AH), d = img.data;
  const deep = rgb("#2a2440"), rim = rgb("#8e82ac"), mid = rgb("#3a3256");
  for (let y = 1; y < AH - 1; y++) for (let x = 1; x < AW - 1; x++) {
    const i = y * AW + x;
    if (!base.land[i] || base.zone[i] !== 2) continue;
    const v = fbm(x, y, 26, 91);
    if (v < 0.6) continue;
    // keep the pools off the causeway and the waypoints
    const ux = x / U + MAP.x, uy = y / U + MAP.y;
    if (busy(ux, uy, 1)) continue;
    const above = fbm(x, y - 1, 26, 91) >= 0.6;
    const c = !above ? rim : v > 0.66 ? deep : mid;
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2];
  }
  ctx.putImageData(img, 0, 0);
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
    for (let gy = 132; gy < 196; gy += 8) for (let gx = 40; gx < 150; gx += 10) {
      k++;
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
  // rivers and lakes: an inked bank, a pale shallows rim, deep water, and a
  // glint of current down the wider reaches. Fen water is black and purple.
  const PAL = { shal: "#5f9cb6", deep: "#3f7898", glint: "#8cc0d2" }, FEN = { shal: "#4c4274", deep: "#262036", glint: "#9a8ec0" };
  const water = layer((c) => {
    for (const rv of RIVERS) { c.fillStyle = (rv.fen ? FEN : PAL).shal; riverPath(c, rv); c.fill(); }
    for (const m of MERES) { c.fillStyle = (m.fen ? FEN : PAL).shal; lakePath(c, m); c.fill(); }
    for (const rv of RIVERS) { c.fillStyle = (rv.fen ? FEN : PAL).deep; riverPath(c, rv, -0.45); c.fill(); }
    for (const m of MERES) { c.fillStyle = (m.fen ? FEN : PAL).deep; lakePath(c, m, -1.1); c.fill(); }
  }, INK);
  const shine = layer((c) => {
    c.lineJoin = "round"; c.lineCap = "round";
    for (const rv of RIVERS) {
      c.strokeStyle = (rv.fen ? FEN : PAL).glint; c.lineWidth = 0.5;
      // broken glints along the reaches wide enough to show them
      for (let i = 0; i < rv.pts.length - 3; i += 7) {
        if (rv.hw[i] < 1 || hash(i, 71 + rv.pts.length) < 0.35) continue;
        const [x0, y0] = rv.pts[i], [x1, y1] = rv.pts[i + 3], [nx, ny] = rv.nrm[i], o = rv.hw[i] * 0.35;
        c.beginPath(); c.moveTo(x0 - nx * o, y0 - ny * o); c.lineTo(x1 - nx * o, y1 - ny * o); c.stroke();
      }
    }
    for (const m of MERES) {
      if (m.fen) continue;
      c.strokeStyle = PAL.glint; c.lineWidth = 0.5;
      for (let k = 0; k < 2; k++) {
        const y = m.y - m.ry * 0.3 + k * m.ry * 0.45, x = m.x - m.rx * 0.35 + k * m.rx * 0.2;
        c.beginPath(); c.moveTo(x - m.rx * 0.22, y); c.lineTo(x + m.rx * 0.22, y); c.stroke();
      }
    }
  });
  ctx.drawImage(onLand(water), 0, 0);
  ctx.drawImage(onLand(shine), 0, 0);

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

  // bridges wherever the road crosses running water (not at the fords)
  const bridges = [];
  for (const rd of ROADS) for (let k = 0; k < rd.pts.length; k++) {
    const [x, y] = rd.pts[k];
    if (LEVELS.some((l) => Math.hypot(x - l.pos[0], y - l.pos[1]) < 10)) continue;
    if (RIVERS.some((rv) => lineDist(x, y, rv.pts) < 1) && bridges.every(([bx, by]) => Math.hypot(x - bx, y - by) > 8)) bridges.push([x, y]);
  }
  for (const [x, y] of bridges) stamp(ctx, bridge(), x, y, 3.5, 2.5);

  yield;
  // contact shadows, then the dressing back to front
  const items = dressing(base).sort((a, b) => a[2] - b[2]);
  const shade = layer((c) => {
    c.fillStyle = "#2a1c2c";
    for (const [, x, y, , , sh] of items) if (sh > 0) { c.beginPath(); c.ellipse(x + sh * 0.35, y + 0.2, sh, sh * 0.42, 0, 0, Math.PI * 2); c.fill(); }
  });
  ctx.globalAlpha = 0.26; ctx.drawImage(shade, 0, 0); ctx.globalAlpha = 1;
  for (const [s, x, y, ax, ay] of items) stamp(ctx, s, x, y, ax, ay);

  yield;
  // out at sea: the ferry, the serpent, a lighthouse, the compass
  stamp(ctx, ship(), 386, 12, 7, 11);
  stamp(ctx, serpent(), 70, -64, 17, 9);
  stamp(ctx, lighthouse(), 26, -32, 2.5, 11.4);
  stamp(ctx, compass(), 22, 214, 11, 13);
  stamp(ctx, whirl(), 212, -100, 8, 5);
  for (const [x, y, v] of [[8, 60, 0], [196, 60, 1], [390, 220, 0], [228, 232, 1], [160, 222, 0]]) {
    const i = artY(y) * AW + artX(x);
    if (!base.land[i] && base.seaD[i] > 6) stamp(ctx, seaRock(v), x, y, 3, 4);
  }
  return { canvas: cv, base };
}

// ---- terrain, cached -------------------------------------------------
// The land is painted in stages (a generator), so the title screen can lay
// it out a slice at a time while the player reads the menu; asking for it
// outright finishes whatever is left at once.
let TERRAIN = null, GEN = null;
export function mapTerrain() {
  if (TERRAIN) return TERRAIN;
  GEN = GEN || paintTerrain();
  let r;
  do r = GEN.next(); while (!r.done);
  GEN = null;
  return (TERRAIN = r.value);
}
export function warmMapTerrain() {
  if (TERRAIN || GEN) return;
  GEN = paintTerrain();
  const step = () => {
    if (TERRAIN || !GEN) return;
    const r = GEN.next();
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
  const sealed = CHAPTERS.map((ch, k) => (isUnlocked(ch.levels[0].id, progress) ? -1 : k)).filter((k) => k >= 0);
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
