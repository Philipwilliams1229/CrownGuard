// The overhaul concept round: WATER (art/briefs/overhaul-concepts.md). Owned by the water concept artist.
// Paints whole board patches (420 x 280 board units = 840 x 560 art px, shown at 2x) with three bold water
// directions: A "cut into the land", B "clear living water", C "painted current". The ground, road, trees,
// puddles and the placeholder bridge deck are painted here; the hall and the figures are the game's own
// pix sculpts (hall-archer, fig-bowman, fig-goblin, fig-garrison) for scale. Nothing under src/ is edited.
import { toCanvas } from "../src/render/pix/pix.js";
import { bakeFrame, clearBakes } from "../src/render/pix/bake.js";
import * as kit from "../src/render/pix/hall-kit.js";
import * as hallArcher from "../src/render/pix/hall-archer.js";
import * as goblin from "../src/render/pix/fig-goblin.js";
import * as garrison from "../src/render/pix/fig-garrison.js";
import * as bowman from "../src/render/pix/fig-bowman.js";
import { setDay, DAY, spriteSun } from "../src/data/sun.js";

export const W = 840, H = 560;

// ---- small toolkit -----------------------------------------------------------------------------------------
const hs = (a, b = 0, c = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sm = (t) => t * t * (3 - 2 * t);
const vn = (x, y, s = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
  const a = hs(xi, yi, s), b = hs(xi + 1, yi, s), c = hs(xi, yi + 1, s), d = hs(xi + 1, yi + 1, s);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
};
const fbm = (x, y, s = 0) => vn(x, y, s) * 0.55 + vn(x * 2.1, y * 2.1, s + 3) * 0.3 + vn(x * 4.3, y * 4.3, s + 7) * 0.15;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const pal = (...hs2) => hs2.map(hex);

// the art buffer: rgb floats, plus a shade mask (1 = in a cast shadow) used by the golden-hour grade
class Art {
  constructor() { this.c = new Float32Array(W * H * 3); this.sh = new Float32Array(W * H); this.tag = new Uint8Array(W * H); }
  in(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  set(x, y, c, tag) { x |= 0; y |= 0; if (!this.in(x, y)) return; const i = (y * W + x) * 3; this.c[i] = c[0]; this.c[i + 1] = c[1]; this.c[i + 2] = c[2]; if (tag !== undefined) this.tag[y * W + x] = tag; }
  get(x, y) { x = clamp(x | 0, 0, W - 1); y = clamp(y | 0, 0, H - 1); const i = (y * W + x) * 3; return [this.c[i], this.c[i + 1], this.c[i + 2]]; }
  mix(x, y, c, a) { x |= 0; y |= 0; if (!this.in(x, y) || a <= 0) return; const i = (y * W + x) * 3; this.c[i] += (c[0] - this.c[i]) * a; this.c[i + 1] += (c[1] - this.c[i + 1]) * a; this.c[i + 2] += (c[2] - this.c[i + 2]) * a; }
  shade(x, y, a = 1) { x |= 0; y |= 0; if (!this.in(x, y)) return; const k = y * W + x; if (this.sh[k] >= a) return; const d = a - this.sh[k]; this.sh[k] = a; this.mix(x, y, SHADE, 0.34 * d); }
  copy() { const o = new Art(); o.c.set(this.c); o.sh.set(this.sh); o.tag.set(this.tag); return o; }
}
const SHADE = hex("#2a1c34");

// ---- the sun ------------------------------------------------------------------------------------------------
const sunOf = (id) => {
  if (id === "golden") return { id, L: [-0.92, -0.26, 0.3], fall: [0.97, 0.24], len: 2.3, warm: hex("#ff9a2e") };
  return { id: "noon", L: [-0.6, -0.62, 0.5], fall: [0.93, 0.37], len: 0.35, warm: null };
};
const lam = (S, nx, ny, nz) => { const l = S.L, n = Math.hypot(l[0], l[1], l[2]); return (nx * l[0] + ny * l[1] + nz * l[2]) / n; };

// ---- geometry: polylines, a distance field along a curve ------------------------------------------------------
const spline = (P, step = 1) => {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  let s = 0; out[0][2] = 0;
  for (let i = 1; i < out.length; i++) { s += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]); out[i][2] = s; }
  return out;
};
// splat a curve: per pixel the distance, arc length, side and flow direction of the nearest sample
const field = (pts, R) => {
  const d = new Float32Array(W * H).fill(1e9), s = new Float32Array(W * H), sd = new Int8Array(W * H), tx = new Float32Array(W * H), ty = new Float32Array(W * H);
  for (let i = 0; i < pts.length; i++) {
    const [px, py, ps] = pts[i], a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
    let ux = b[0] - a[0], uy = b[1] - a[1]; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    for (let y = Math.max(0, Math.floor(py - R)); y <= Math.min(H - 1, Math.ceil(py + R)); y++) for (let x = Math.max(0, Math.floor(px - R)); x <= Math.min(W - 1, Math.ceil(px + R)); x++) {
      const dx = x + 0.5 - px, dy = y + 0.5 - py, dd = dx * dx + dy * dy, k = y * W + x;
      if (dd < d[k]) { d[k] = dd; s[k] = ps; sd[k] = ux * dy - uy * dx > 0 ? 1 : -1; tx[k] = ux; ty[k] = uy; }
    }
  }
  for (let k = 0; k < W * H; k++) d[k] = Math.sqrt(d[k]);
  return { d, s, sd, tx, ty };
};

// ---- the ground: Greenwood turf and the dirt road -------------------------------------------------------------
const TURF = pal("#3f7a3a", "#4f8e40", "#64a44a", "#7cb956", "#94c862", "#b0d878");
const turfAt = (x, y) => {
  const n = fbm(x / 46, y / 46, 1) * 0.75 + vn(x / 11, y / 11, 2) * 0.35 + (bay(x, y) - 0.5) * 0.12;
  const i = clamp(Math.floor((n - 0.18) * 7.2), 0, 4);
  return TURF[i + 1];
};
const DIRT = pal("#7f6440", "#9c7f52", "#b39567", "#c8ad7c", "#d8c08f");
const paintGround = (A, road) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) A.set(x, y, turfAt(x, y), 1);
  // tufts and a few flowers
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(hs(i, 1) * W), y = Math.floor(hs(i, 2) * H), c = turfAt(x, y), li = lerp(c, TURF[5], 0.6), dk = lerp(c, TURF[0], 0.6);
    A.set(x, y, dk); A.set(x, y - 1, c); A.set(x - 1, y - 1, li); A.set(x + 1, y - 2, li); A.set(x, y - 2, li);
  }
  for (let i = 0; i < 70; i++) { const x = hs(i, 8) * W, y = hs(i, 9) * H; A.set(x, y, hs(i, 3) > 0.5 ? hex("#f4ecd0") : hex("#e8c04c")); }
  if (!road) return;
  const { d } = road.f;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, e = road.hw + (vn(x / 7, y / 7, 5) - 0.5) * 5;
    if (d[k] < e) {
      const n = fbm(x / 22, y / 22, 6) + (bay(x, y) - 0.5) * 0.14;
      let c = DIRT[clamp(Math.floor(n * 4.2), 0, 4)];
      if (d[k] > e - 3) c = lerp(c, DIRT[0], 0.55);
      if (hs(x, y, 4) > 0.993) c = hex("#8c8270");
      A.set(x, y, c, 2);
    } else if (d[k] < e + 3 && bay(x, y) < (e + 3 - d[k]) / 3 * 0.8) A.mix(x, y, hex("#5a6a34"), 0.5);
  }
};

// ---- trees: a layered oak, painted into an RGBA layer --------------------------------------------------------
class Layer { constructor() { this.c = new Float32Array(W * H * 4); } set(x, y, c, a = 1) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; this.c[i] = c[0]; this.c[i + 1] = c[1]; this.c[i + 2] = c[2]; this.c[i + 3] = a; } a(x, y) { x |= 0; y |= 0; return x < 0 || y < 0 || x >= W || y >= H ? 0 : this.c[(y * W + x) * 4 + 3]; } }
const LEAF = pal("#24482c", "#2f6034", "#3f7a3c", "#57944a", "#77b05a", "#a2cc72");
const oak = (L, A, S, x0, y0, r, seed) => {
  // cast shadow on the ground first (into A), then trunk and canopy into L
  const len = 6 + S.len * r * 1.6, fx = S.fall[0], fy = S.fall[1];
  for (let y = -r * 1.4; y <= r * 1.4; y++) for (let x = -r * 1.4 - 2; x <= r * 1.4 + len + 4; x++) {
    // an ellipse slid along the fall
    for (let t = 0; t <= 1; t += 0.25) {
      const cx = fx * (len * t + 4), cy = fy * (len * t + 4) * 0.6 + 2;
      if (((x - cx) / (r * 1.05)) ** 2 + ((y - cy) / (r * 0.55)) ** 2 < 1 + (vn((x0 + x) / 4, (y0 + y) / 4, seed) - 0.5) * 0.5) { A.shade(x0 + x, y0 + y, 1); break; }
    }
  }
  const TR = pal("#3e2a1e", "#5a3e28", "#7a5638");
  for (let y = -Math.round(r * 0.75); y <= 0; y++) for (let x = -3; x <= 3; x++) { const t = x < -1 ? 2 : x > 1 ? 0 : 1; L.set(x0 + x, y0 + y, Math.abs(x) === 3 ? TR[0] : TR[t]); }
  // canopy: a cluster of lobes, shaded by the sun, inked with a tinted line
  const lobes = [];
  for (let i = 0; i < 11; i++) { const a = hs(seed, i) * 6.28, rr = r * (0.3 + 0.35 * hs(seed, i, 2)); lobes.push([Math.cos(a) * r * 0.62, -r * 1.12 + Math.sin(a) * r * 0.42, rr + r * 0.22]); }
  lobes.push([0, -r * 1.15, r * 0.72]);
  const inC = (x, y) => { let best = -1, bz = -9; for (const [lx, ly, lr] of lobes) { const q = ((x - lx) ** 2 + (y - ly) ** 2) / (lr * lr); if (q < 1) { const z = Math.sqrt(1 - q) * lr - ly * 0.15; if (z > bz) { bz = z; best = [lx, ly, lr]; } } } return best; };
  const m = new Map();
  for (let y = -r * 2.2; y <= 0; y++) for (let x = -r * 1.4; x <= r * 1.4; x++) {
    const lb = inC(x, y); if (lb === -1) continue;
    const [lx, ly, lr] = lb, nx = (x - lx) / lr, ny = (y - ly) / lr, nz = Math.sqrt(clamp(1 - nx * nx - ny * ny, 0, 1));
    let v = lam(S, nx, ny, nz) * 0.75 + 0.35 + (vn((x0 + x) / 2.5, (y0 + y) / 2.5, seed + 9) - 0.5) * 0.45 + (bay(x0 + x, y0 + y) - 0.5) * 0.18;
    let i = clamp(Math.floor(v * 5), 0, 5);
    let c = LEAF[i];
    if (S.warm && i >= 3) c = lerp(c, S.warm, 0.28 + 0.08 * (i - 3));
    if (S.warm && i <= 1) c = lerp(c, hex("#2a2a54"), 0.25);
    m.set(`${Math.round(x)},${Math.round(y)}`, 1);
    L.set(x0 + x, y0 + y, c);
  }
  // the tinted line round the canopy (underline heavier)
  for (let y = -r * 2.3; y <= 1; y++) for (let x = -r * 1.5; x <= r * 1.5; x++) {
    const X = Math.round(x), Y = Math.round(y); if (m.has(`${X},${Y}`)) continue;
    if (m.has(`${X + 1},${Y}`) || m.has(`${X - 1},${Y}`) || m.has(`${X},${Y + 1}`) || m.has(`${X},${Y - 1}`)) L.set(x0 + X, y0 + Y, hex("#1a3020"));
  }
};
const flatten = (A, L) => { for (let k = 0; k < W * H; k++) { const a = L.c[k * 4 + 3]; if (a > 0) { const i = k * 3; for (let j = 0; j < 3; j++) A.c[i + j] += (L.c[k * 4 + j] - A.c[i + j]) * a; } } };

// ---- water palettes ---------------------------------------------------------------------------------------
const WA = pal("#18384a", "#1f4a5a", "#28606c", "#33787c", "#46908a", "#68aa98", "#96c6ac");       // A: deep green-teal, cut water
const FOAM = hex("#f2f4e6"), FOAM2 = hex("#cfe2da");
const EARTH = pal("#3a2618", "#523624", "#6c4a30", "#86603e", "#a07a50");
const GRAVEL = pal("#6e6656", "#8a8270", "#a69c84", "#c4b89a", "#ddd2b2");
const SAND = pal("#a88e62", "#c2a878", "#d6c090", "#e6d4a8");

// the reflection of whatever stands above the axis row, darkened and tinted by the water
const reflect = (src, x, y, axis, tint, k) => { const my = 2 * axis - y; if (my < 0) return tint; const c = src.get(x, my); return lerp(lerp(c, tint, 0.45), mul(tint, 0.6), k); };

// ---- the river scene ---------------------------------------------------------------------------------------
const RIVER = [[-30, 112], [110, 104], [240, 140], [318, 222], [352, 330], [440, 400], [560, 404], [680, 372], [870, 330]];
const ROAD1 = [[-30, 492], [200, 494], [420, 498], [556, 486], [586, 440], [592, 330], [594, 200], [600, 60], [604, -30]];
const S1 = { river: spline(RIVER), road: spline(ROAD1) };
let F1 = null;
const scene1 = () => {
  if (F1) return F1;
  F1 = { river: field(S1.river, 90), road: { f: field(S1.road, 50), hw: 34 } };
  return F1;
};
const riverHW = (s) => 52 + 6 * Math.sin(s / 70) + 4 * Math.sin(s / 23 + 1);
const DECK = { x0: 558, x1: 626, y0: 0, y1: 0 };   // filled per option from the banks

// ---- the lake scene ----------------------------------------------------------------------------------------
const LAKE = { cx: 420, cy: 222, rx: 250, ry: 118 };
const ROAD2 = [[-30, 486], [180, 480], [400, 492], [620, 476], [760, 462], [870, 470]];
let F2 = null;
const lakeMask = () => {
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = (x - LAKE.cx) / LAKE.rx, ny = (y - LAKE.cy) / LAKE.ry, th = Math.atan2(ny, nx);
    let ed = 0.82 + 0.3 * vn(Math.cos(th) * 2.6 + 4, Math.sin(th) * 2.6 + 4, 11) + 0.1 * Math.sin(th * 3 + 1);
    // a bay in the south-west and a headland in the east
    ed += 0.16 * Math.exp(-((th - 2.3) ** 2) * 6) - 0.2 * Math.exp(-((th - 0.1) ** 2) * 12);
    if (Math.hypot(nx, ny) < ed) m[y * W + x] = 1;
  }
  // the islet
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x - 520) / 34) ** 2 + ((y - 196) / 19) ** 2 < 1 + (vn(x / 6, y / 6, 3) - 0.5) * 0.5) m[y * W + x] = 0;
  return m;
};
// distance (in px) inside a mask to its edge: a two-pass chamfer
const chamfer = (m) => {
  const d = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) d[k] = m[k] ? 1e6 : 0;
  const r2 = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (!d[k]) continue; let v = d[k]; if (x > 0) v = Math.min(v, d[k - 1] + 1); if (y > 0) { v = Math.min(v, d[k - W] + 1); if (x > 0) v = Math.min(v, d[k - W - 1] + r2); if (x < W - 1) v = Math.min(v, d[k - W + 1] + r2); } d[k] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const k = y * W + x; if (!d[k]) continue; let v = d[k]; if (x < W - 1) v = Math.min(v, d[k + 1] + 1); if (y < H - 1) { v = Math.min(v, d[k + W] + 1); if (x < W - 1) v = Math.min(v, d[k + W + 1] + r2); if (x > 0) v = Math.min(v, d[k + W - 1] + r2); } d[k] = v; }
  return d;
};
const scene2 = () => {
  if (F2) return F2;
  const m = lakeMask();
  F2 = { m, d: chamfer(m), road: { f: field(spline(ROAD2), 50), hw: 34 } };
  // puddles: irregular, larger than today's
  const P = [[700, 318, 58, 22, 1], [300, 486, 52, 15, 2], [118, 176, 40, 16, 3]];
  const pm = new Uint8Array(W * H);
  for (const [cx, cy, rx, ry, sd] of P) for (let y = cy - ry * 2; y <= cy + ry * 2; y++) for (let x = cx - rx * 2; x <= cx + rx * 2; x++) {
    const nx = (x - cx) / rx, ny = (y - cy) / ry, th = Math.atan2(ny, nx);
    const ed = 0.78 + 0.42 * vn(Math.cos(th) * 1.6 + sd * 3, Math.sin(th) * 1.6, sd + 20);
    if (Math.hypot(nx, ny) < ed && x >= 0 && y >= 0 && x < W && y < H) pm[y * W + x] = sd;
  }
  F2.pm = pm; F2.pd = chamfer(pm.map((v) => (v ? 1 : 0)));
  return F2;
};

// ---- the sea scene -----------------------------------------------------------------------------------------
const ROAD3 = [[-30, 150], [200, 160], [420, 140], [640, 158], [870, 150]];
let F3 = null;
const shoreY = (x) => 300 + 30 * Math.sin(x / 150 + 0.6) + 16 * (vn(x / 26, 0, 31) - 0.5) + 92 * Math.exp(-(((x - 600) / 80) ** 2)) - 40 * Math.exp(-(((x - 300) / 110) ** 2));
const cliffK = (x) => clamp(0.25 + 0.95 * Math.exp(-(((x - 600) / 120) ** 2)) + 0.4 * Math.exp(-(((x - 40) / 90) ** 2)), 0, 1);
const scene3 = () => { if (F3) return F3; F3 = { road: { f: field(spline(ROAD3), 50), hw: 34 } }; return F3; };

// ================================================================================================================
// OPTION A: cut into the land. The water lies BELOW the meadow: a face of earth, roots and stone under the
// far bank, a gravel beach sloping down on the near side, the turf lip overhanging, a weir where it drops.
// ================================================================================================================
const KZ = 0.75;                // screen px a unit of height shows as
const faceCol = (S, x, y, depth, top, nx) => {
  // strata, a root, stones; lit by the sun through the face's normal (it faces south, plus a turn)
  const band = Math.floor((y + 2 * vn(x / 9, 0, 41)) / 3) % 3;
  let v = 0.9 + lam(S, nx, 0.9, 0.2) * 0.3 - depth * 0.03 + (band === 1 ? 0.14 : band === 2 ? -0.08 : 0) + (bay(x, y) - 0.5) * 0.12;
  let c = EARTH[clamp(Math.floor(v * 5), 0, 4)];
  if (top < 2) c = hex("#2e4a26");                                      // the turf's hanging lip
  else if (top < 3 && hs(x, 0, 43) > 0.4) c = hex("#3c5c2c");
  if (hs(x, 0, 44) > 0.93 && top < 7) c = EARTH[0];                    // a root hanging down
  if (S.warm && nx < -0.2) c = lerp(c, S.warm, 0.25);
  return c;
};
const faceDetail = (A, S) => {
  // roots hanging from the lip, stones set in the earth, a dark seam at the foot where the water laps
  for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (A.tag[k] !== 4) continue;
    if (A.tag[k - W] !== 4 && hs(x, 1, 44) > 0.88) { const n = 3 + Math.floor(hs(x, 2, 45) * 7); for (let j = 0; j < n; j++) if (A.tag[k + j * W] === 4) A.set(x + (j > 4 ? 1 : 0), y + j, j < 2 ? hex("#2a1c12") : hex("#4a3220")); }
    if (A.tag[k + W] === 3) { A.set(x, y, hex("#24180e")); A.mix(x, y + 1, hex("#e8f0e0"), hs(x, y, 46) > 0.5 ? 0.6 : 0.2); }
    { const sx = x + Math.floor(vn(y / 3, 0, 48) * 4), cx = Math.floor(sx / 9), cy = Math.floor((y + (cx & 1) * 3) / 6); if (hs(cx, cy, 47) > 0.8 && A.tag[k - W] === 4 && A.tag[k + W] === 4) { const fx = (sx % 9) / 9 - 0.45, fy = ((y + (cx & 1) * 3) % 6) / 6 - 0.5; if (fx * fx + fy * fy * 1.6 < 0.16) A.set(x, y, fx + fy < -0.2 ? GRAVEL[4] : fx + fy > 0.2 ? GRAVEL[0] : GRAVEL[2]); } }
  }
};
const waterA = (S, x, y, depthN, s, t, flow) => {
  // depthN: 0 at the margin, 1 mid-channel; a stepped ramp with ragged band edges
  const n = depthN + (vn(x / 13 + s * 0.02, y / 9, 51) - 0.5) * 0.22;
  let c = WA[clamp(5 - Math.floor(n * 6), 0, 6)];
  // current: long thin pale streaks drifting with the flow
  if (flow) {
    const u = s - t * 40, w = (flow.side * flow.d) / 6;
    const st = vn(u / 26, w, 52);
    if (st > 0.74 && n > 0.25) c = lerp(c, WA[6], (st - 0.74) * 3);
    if (st > 0.86 && hs(Math.floor(u / 3), Math.floor(w), 53) > 0.3) c = lerp(c, FOAM2, 0.6);
  }
  return c;
};
const optionA = (scene, S, t) => {
  const A = new Art(), L = new Layer();
  if (scene === "river") {
    const F = scene1(), R = F.river;
    paintGround(A, F.road);
    const sWeir = 440, UP = 22, DN = 34, sShift = (s) => (s < sWeir ? UP : DN);        // the water surface 8 units down, 15 below the weir
    const chan = (x, y) => { if (y < 0) y = 0; if (y >= H || x < 0 || x >= W) return null; const k = y * W + x; const s = R.s[k]; const e = riverHW(s) + (vn(s / 12, R.sd[k], 54) - 0.5) * 7; return R.d[k] < e ? { k, s, d: R.d[k], e, side: R.sd[k] } : null; };
    const land = A.copy();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const here = chan(x, y);
      // land stays land (the near lip covers the lowered water at the south bank)
      if (!here) continue;
      // which water shows here: the surface lies sh px lower on screen
      let shown = null;
      for (const sh of [UP, DN]) { const c = chan(x, y - Math.round(sh * KZ)); if (c && sShift(c.s) === sh) { shown = { ...c, sh }; break; } }
      if (shown) {
        const dn = clamp(1 - shown.d / shown.e, 0, 1);
        let c = waterA(S, x, y, sm(dn), shown.s, t, shown);
        const below = shown.s - sWeir;
        if (below > 0 && below < 70) { const f = vn(x / 4, (shown.s - t * 50) / 4, 99); if (f > 0.42 + below / 110) c = f > 0.62 + below / 200 ? FOAM : lerp(c, FOAM2, 0.7); }
        // the far bank's cast shadow and the near gravel beach under the water
        A.set(x, y, c, 3);
        continue;
      }
      // between the lip and the water: the bank face (or the weir's fall)
      let top = 0; while (top < 24 && chan(x, y - top - 1)) top++;
      if (here.s > sWeir - 4 && here.s < sWeir + 22 && top >= Math.round(UP * KZ)) {
        // the weir's fall: a curtain of white water streaming down past the sill
        const fl = vn(x / 1.6, (y - t * 120) / 5, 55), c = fl > 0.5 ? FOAM : fl > 0.3 ? FOAM2 : WA[5];
        A.set(x, y, c, 8); continue;
      }
      A.set(x, y, faceCol(S, x, y, top, top, -R.tx[here.k] * 0.4), 4);
    }
    // the near bank: a gravel beach sloping down from the lip to the water (south / inner side of each bend)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x; if (A.tag[k] !== 3) continue;
      // land just below? then this is under the near lip: beach band of 6 px
      let below = 0; for (let j = 1; j <= 16; j++) if (!chan(x, y + j)) { below = j; break; }
      if (below) {
        const g = GRAVEL[clamp(Math.floor(((16 - below) / 16) * 2.6 + 1.6 + (hs(x, y, 56) - 0.5) * 1.6), 0, 4)];
        if (below <= 1) A.set(x, y, hex("#3e5a2c"));
        else if (below <= 11) A.set(x, y, below === 11 ? lerp(g, GRAVEL[0], 0.6) : g);
        else A.set(x, y, below === 12 ? FOAM : lerp(g, WA[4], 0.5 + (below - 12) * 0.12));
        if (hs(x, y, 57) > 0.92) A.set(x, y, GRAVEL[4]);
      }
    }
    // the far bank's shadow on the water (cast down-right of the face)
    for (let y = 0; y < H; y++) for (let x = W - 1; x >= 0; x--) {
      const k = y * W + x; if (A.tag[k] !== 3) continue;
      const fx = Math.round(x - S.fall[0] * 7), fy = Math.round(y - S.fall[1] * 7 - 5);
      if (A.in(fx, fy) && A.tag[fy * W + fx] !== 3 && A.tag[fy * W + fx] !== 8) A.shade(x, y, 1);
    }
    // the overhanging turf lip: a ragged dark edge with grass hanging into the face
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (A.tag[k] === 4 && A.tag[k - W] !== 4 && A.tag[k - W] !== 3 && A.tag[k - W] !== 8) { A.set(x, y - 1, hex("#b0d878")); A.set(x, y - 2, hex("#94c862")); if (hs(x, y, 58) > 0.5) A.set(x, y + 2, hex("#2e4a26")); } }
    faceDetail(A, S);
    // the weir's sill: a line of cut stones across the river where it drops
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (A.tag[k] === 8 && y > 0 && A.tag[k - W] === 3) for (let j = -3; j <= 0; j++) { const c = j === 0 ? GRAVEL[0] : (x + (j === -2 ? 3 : 0)) % 7 === 0 ? GRAVEL[1] : GRAVEL[j === -3 ? 4 : 3]; A.set(x, y + j, c, 9); } }
    // rocks in the stream with foam collars and a wake
    for (const [rx, ry, rr] of [[200, 146, 9], [262, 180, 7], [470, 424, 10], [700, 392, 8], [120, 120, 7]]) rockInWater(A, S, rx, ry, rr, t, true);
    deckA(A, S, F, chan);
    oak(L, A, S, 140, 52, 18, 1); oak(L, A, S, 418, 96, 22, 2); oak(L, A, S, 770, 64, 20, 3); oak(L, A, S, 780, 520, 20, 4); oak(L, A, S, 66, 280, 17, 5); oak(L, A, S, 250, 360, 14, 6);
  } else if (scene === "lake") {
    const F = scene2(); paintGround(A, F.road);
    lakeCut(A, S, F, t); puddles(A, S, F, "A", t);
    jetty(A, S, 356, 318, 46, true);
    oak(L, A, S, 520, 196, 13, 7); oak(L, A, S, 70, 70, 20, 8); oak(L, A, S, 780, 90, 22, 9); oak(L, A, S, 800, 300, 16, 10);
    reeds(A, S, 640, 190, 40, 30, t); reeds(A, S, 220, 140, 30, 20, t);
  } else {
    const F = scene3(); paintGround(A, F.road); seaCliff(A, S, t);
    oak(L, A, S, 90, 70, 19, 11); oak(L, A, S, 300, 250, 16, 12); oak(L, A, S, 760, 70, 21, 13); oak(L, A, S, 820, 230, 15, 14);
  }
  flatten(A, L);
  return A;
};
const SLATE = pal("#34343c", "#4e5058", "#6e6e70", "#908c84", "#b4ae9e");
const rockInWater = (A, S, rx, ry, rr, t, wake) => {
  for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
    const q = (x * x) / (rr * rr) + (y * y) / (rr * rr * 0.5); if (q > 1) continue;
    const v = 0.45 + lam(S, x / rr, y / rr, Math.sqrt(1 - q)) * 0.5;
    if (q > 0.86 + (vn((rx + x) / 3, (ry + y) / 3, rr) - 0.5) * 0.3) continue;
    A.set(rx + x, ry + y, SLATE[clamp(Math.floor(v * 5 + (hs(rx + x, ry + y, 7) - 0.5) * 0.8), 0, 4)]);
  }
  // foam collar upstream, a lacy wake downstream (flow runs west to east)
  for (let a = 0; a < 6.28; a += 0.12) { const ex = Math.cos(a) * (rr + 2), ey = Math.sin(a) * (rr * 0.7 + 1.5); if (Math.cos(a) < 0.2 && hs(a * 10, t * 9, 59) > 0.2) A.set(rx + ex, ry + ey, FOAM); }
  if (wake) for (let i = 0; i < 22; i++) { const u = ((i * 3 + t * 30) % 40), sp = 1 + u * 0.18; A.set(rx + rr + u, ry + sp * (i % 2 ? 1 : -1) * (0.5 + hs(i, 60)), u < 20 ? FOAM : FOAM2); }
};
// the placeholder bridge deck: plain planks at turf level over the cut, with its shadow on the water
const deckA = (A, S, F, chan) => {
  let y0 = H, y1 = 0; for (let y = 0; y < H; y++) if (chan(592, y) || A.tag[y * W + 592] >= 3) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  deck(A, S, 556, 628, y0 - 6, y1 + 4);
};
const deck = (A, S, x0, x1, y0, y1, drop = 12) => {
  // shadow first, down-right, onto whatever lies below
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) A.shade(x + Math.round(S.fall[0] * drop), y + Math.round(S.fall[1] * drop) + 3, 1);
  const P = pal("#4a3220", "#6c4a2e", "#86603c", "#a07a4c");
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const plank = (y - y0) % 6, v = plank === 5 ? 0 : plank === 0 ? 3 : 2 - (hs(Math.floor(x / 9), Math.floor((y - y0) / 6), 61) > 0.6 ? 1 : 0);
    A.set(x, y, x === x0 || x === x1 ? P[0] : P[v], 5);
  }
  for (let x = x0; x <= x1; x++) for (let j = 1; j <= 4; j++) A.set(x, y1 + j, j === 4 ? P[0] : P[1], 5);   // its south edge
  A.set(x0, y0, P[3]);
};
const beachW = (x, y) => sm(clamp((480 - x) / 90, 0, 1)) * sm(clamp((y - 220) / 50, 0, 1)) + (vn(x / 24, y / 24, 69) - 0.5) * 0.5;
const lakeCut = (A, S, F, t) => {
  const { m, d } = F; const drop = Math.round(20 * KZ);
  const land = (x, y) => y < 0 || y >= H || x < 0 || x >= W || !m[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (!m[k]) continue;
    const yy = y - drop;
    if (!land(x, yy)) {
      const dn = clamp(d[yy * W + x] / 80, 0, 1);
      let c = waterA(S, x, y, sm(dn) * 0.85, x * 0.4, t, null);
      // a still-water sheen: a few long glints on the sun's side, and the islet's and bank's dark lee
      if (vn(x / 40, y / 2.2, 62) > 0.84 && dn > 0.3 && x < 600) c = lerp(c, WA[6], 0.45);
      A.set(x, y, c, 3);
    } else { let top = 0; while (top < 10 && !land(x, y - top - 1)) top++; A.set(x, y, faceCol(S, x, y, top, top, 0), 4); }
  }
  // a sand beach on the south-west shore, reed margins elsewhere: under the near lip
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (A.tag[k] !== 3) continue;
    let below = 0; for (let j = 1; j <= 22; j++) if (land(x, y + j)) { below = j; break; }
    const beachy = beachW(x, y) > 0.5;
    if (below && beachy) { A.set(x, y, below <= 16 ? SAND[clamp(Math.floor((below + hs(x, y, 67) * 2) / 4.5), 0, 3)] : lerp(SAND[0], WA[4], 0.3 + (below - 17) * 0.12)); if (below === 17) A.set(x, y, FOAM); if (below === 16 && hs(x, 0, 68) > 0.5) A.set(x, y, FOAM2); }
    else if (below && below <= 3) A.set(x, y, GRAVEL[1 + (below % 2)]);
  }
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (A.tag[k] === 4 && A.tag[k - W] < 3) { A.set(x, y - 1, hex("#5d9a48")); } }
  for (let y = 0; y < H; y++) for (let x = W - 1; x >= 0; x--) { const k = y * W + x; if (A.tag[k] !== 3) continue; const fx = Math.round(x - S.fall[0] * 8), fy = Math.round(y - S.fall[1] * 8 - 4); if (A.in(fx, fy) && A.tag[fy * W + fx] === 4) A.shade(x, y, 1); }
  faceDetail(A, S);
};
const jetty = (A, S, x, y, len, cut) => {
  // a plank jetty running out north from the shore on posts
  const P = pal("#4a3220", "#6c4a2e", "#86603c", "#a07a4c");
  for (let yy = y - len; yy <= y + 2; yy++) for (let xx = x - 9; xx <= x + 9; xx++) A.shade(xx + Math.round(S.fall[0] * 6), yy + Math.round(S.fall[1] * 6) + 3, 1);
  for (const py of [y - len, y - len + 16, y - len + 32]) for (const px of [x - 9, x + 8]) for (let j = 0; j < (cut ? 12 : 5); j++) { A.set(px, py + 3 + j, P[0]); A.set(px + 1, py + 3 + j, P[1]); }
  for (let yy = y - len; yy <= y; yy++) for (let xx = x - 9; xx <= x + 9; xx++) A.set(xx, yy, xx === x - 9 || xx === x + 9 ? P[0] : (yy - y) % 5 === 0 ? P[1] : (xx - x + 9) % 6 === 0 ? P[2] : P[3], 5);
  for (let xx = x - 9; xx <= x + 9; xx++) { A.set(xx, y - len - 1, P[0]); A.set(xx, y + 1, P[1]); A.set(xx, y + 2, P[0]); }
};
const reeds = (A, S, cx, cy, rx, ry, t) => {
  const water = (k) => A.tag[k] === 3;
  for (let y = Math.max(8, cy - ry); y < Math.min(H - 8, cy + ry); y++) for (let x = Math.max(8, cx - rx); x < Math.min(W - 8, cx + rx); x++) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
    const K = y * W + x; if (!water(K) || hs(x, y, 63) > 0.09) continue;
    let near = 99; for (let j = 1; j <= 5; j++) if (!water(K + j) || !water(K - j) || !water(K + j * W) || !water(K - j * W)) { near = j; break; }
    if (near > 5) continue;
    const h = 7 + Math.floor(hs(x, y, 65) * 8), sway = Math.sin(t * 6.28 + x * 0.3) * 1.2;
    A.mix(x + 1, y + 1, hex("#1a3a30"), 0.5);
    for (let j = 0; j < h; j++) { const X = x + (j / h) * sway, top = j > h - 4 && hs(x, y, 66) > 0.7; A.set(X, y - j, j < 2 ? hex("#3a5a2a") : top ? hex("#6a4426") : (x + j) % 3 ? hex("#86b050") : hex("#5e8a3c"), 10); }
  }
};
// puddles: big, irregular; option A: dished into the ground, reflecting sky, wet mud margins
const SKY = pal("#6e98b8", "#86aecb", "#b4cfe0");
const puddles = (A, S, F, opt, t) => {
  const { pm, pd } = F;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    // the wet margin: dark mud ring outside the water
    if (!pm[k]) {
      let near = 0; for (let j = 1; j <= 7 && !near; j++) { if (pm[k - j] || pm[k + j] || (y > j && pm[k - j * W]) || (y < H - j && pm[k + j * W])) near = j; }
      if (near) A.mix(x, y, hex("#4a3a26"), near <= 2 ? 0.7 : near <= 4 ? 0.45 : bay(x, y) < 0.4 ? 0.3 : 0.1);
      continue;
    }
    const dd = pd[k], edgeTop = y > 0 && !pm[k - W];
    let c;
    if (opt === "C") { c = dd < 2 ? FOAM : dd < 5 ? hex("#7ec0d8") : vn(x / 9 - t * 2, y / 3, 70) > 0.66 ? hex("#e8f4f4") : hex("#4c94b8"); }
    else {
      c = lerp(SKY[0], SKY[1], clamp(dd / 10, 0, 1));
      if (vn(x / 18, y / 7, 71) > 0.64) c = SKY[2]; if (hs(x, y, Math.floor(t * 6) + 72) > 0.996) c = hex("#f4f8f0");                       // a cloud's reflection
      if (dd < 1.5) c = hex("#3a3024");
      if (opt === "A" && dd < 4 && y > 0) { let n = 0; for (let j = 1; j <= 3; j++) if (!pm[k - j * W]) n = j; if (n) c = lerp(hex("#5a4630"), c, n / 4); }   // its north lip shades the water
      if (opt === "B" && dd < 4) c = lerp(hex("#8a7450"), c, dd / 4);           // the muddy bottom seen through
    }
    if (edgeTop && opt !== "C") c = hex("#2e2418");
    if (S.warm) c = lerp(c, S.warm, 0.35);
    A.set(x, y, c, 6);
  }
};
const seaCliff = (A, S, t) => {
  for (let x = 0; x < W; x++) {
    const ck = cliffK(x), face = Math.round(5 + 24 * ck), ys = Math.round(shoreY(x)), beach = Math.round(6 + 46 * (1 - ck) + 8 * vn(x / 40, 0, 72));
    for (let y = ys; y < H; y++) {
      const dy = y - ys;
      if (dy < 2) A.set(x, y, hex("#4a7e3a"), 4);
      else if (dy < face) A.set(x, y, faceCol(S, x, y, dy, dy, Math.sin(x / 50) * 0.6), 4);
      else if (dy < face + beach) {
        const b = dy - face, wetN = b / beach;
        let c = wetN < 0.3 ? GRAVEL[2 + (hs(x, y, 73) > 0.6 ? 1 : 0)] : wetN < 0.7 ? SAND[2 - Math.floor(wetN * 2)] : lerp(SAND[0], hex("#7a6a4c"), 0.5);
        if (b < 4) c = lerp(c, SHADE, 0.35);                         // the cliff's shadow at its foot
        A.set(x, y, c, 7);
      } else {
        const w = y - ys - face - beach, ph = (w - t * 12) / 16;
        const dn = clamp(w / 160, 0, 1);
        let c = WA[clamp(5 - Math.floor(sm(dn) * 6 + (vn(x / 20, y / 8, 74) - 0.5) * 0.9), 0, 6)];
        const wave = Math.sin(ph * 6.28 + vn(x / 40, 0, 75) * 4);
        const br = vn(x / 14, w / 6, 78);
        if (w < 3) c = FOAM; else if (wave > 0.95 && w < 60 && br > 0.42) c = FOAM; else if (wave > 0.86 && w < 64 && br > 0.6) c = FOAM2; else if (w < 36 && vn(x / 3, (w - t * 10) / 2, 79) > 0.72) c = lerp(c, FOAM2, 0.7);
        if (w < 10 && hs(x, y, 76) > 0.6) c = FOAM2;
        if (vn(x / 34 - t * 0.5, y / 2, 77) > 0.86 && w > 60) c = lerp(c, hex("#d8e8c8"), 0.6);
        A.set(x, y, c, 3);
      }
    }
  }
  faceDetail(A, S);
  // sea stacks and a fallen block on the beach
  for (const [rx, dy, rr] of [[560, 44, 11], [646, 52, 14], [612, 76, 8], [700, 34, 9], [90, 50, 10]]) { const y = Math.round(shoreY(rx)) + Math.round(5 + 24 * cliffK(rx)) + dy; rockInWater(A, S, rx, y, rr, t, false); for (let a = 0; a < 6.28; a += 0.1) if (hs(a * 9, rx, 80) > 0.35) A.set(rx + Math.cos(a) * (rr + 3 + hs(a, 81) * 3), y + Math.sin(a) * (rr * 0.6 + 2), FOAM); }
};

// ================================================================================================================
// OPTION B: clear living water. You see INTO it: a bright stony bed in the shallows, weed streaming with the
// current, fish, a dark blue-green pool in the bends; the far bank, the trees, the deck and clouds lie on the
// surface broken by ripples; lily rafts, reeds, a heron.
// ================================================================================================================
const WB = pal("#174a64", "#1e6070", "#28787c", "#3a9288", "#5eae98", "#94cca8");
const BED = pal("#7a6440", "#a08250", "#c4a46c", "#dcc088", "#f2dcaa");
const waterB = (src, x, y, dn, s, t, axis, cl) => {
  // the bed: rounded pebbles, sunlit tops and dark gaps, seen everywhere through the water
  const pb = vn(x / 3.4 + 0.3 * vn(x / 9, y / 9, 79), y / 2.6, 80), pv = pb > 0.6 ? 4 : pb > 0.42 ? 3 : pb > 0.26 ? 2 : 1;
  let c = BED[pv];
  if (hs(Math.floor(x / 7), Math.floor(y / 5), 78) > 0.9 && pb > 0.4) c = hex("#b8b0a0");      // a pale cobble
  const deep = clamp((dn - 0.1) / 0.85, 0, 1) + (vn(x / 20, y / 14, 81) - 0.5) * 0.16;
  const di = clamp(Math.floor(deep * 6), 0, 5);
  c = lerp(c, WB[5 - di], clamp(0.18 + deep * 0.72, 0, 0.86));
  // caustics: a bright net of light wobbling over the shallows
  if (dn < 0.55) { const q = Math.abs(Math.sin(vn(x / 7 + t * 2, y / 5, 98) * 9)); if (q < 0.12) c = lerp(c, hex("#fff4c8"), 0.5 * (1 - dn / 0.55)); }
  // weed streaming with the current in the mid-depth
  if (cl && dn > 0.22 && dn < 0.85) {
    const w = (cl.side * cl.d) / 3.2 + Math.sin((s - t * 14) / 8) * 1.1;
    if (vn(s / 30, Math.floor(w), 82) > 0.6 && Math.abs(w - Math.round(w)) < 0.38) c = lerp(c, vn(s / 6, w, 96) > 0.5 ? hex("#6aa63e") : hex("#2e6a2e"), 0.8);
  }
  // the reflection of the far bank and its trees, broken by ripple rows
  if (axis != null) {
    const rip = Math.sin(y * 1.7 + vn(x / 8, y, 83) * 6 + t * 6.28), gap = y - axis;
    if (rip > -0.45) { const my = 2 * axis - y, sc = src.get(x + Math.round(rip * 1.2), my), r = lerp(mul(sc, 0.62), WB[0], 0.22); c = lerp(c, r, clamp(0.88 - gap * 0.012, 0, 0.88)); }
    // clouds passing overhead, lying broken on the deeper water
    const cl2 = fbm((x + t * 6) / 70, y / 26, 97);
    if (cl2 > 0.6 && dn > 0.3 && rip > -0.2 && gap > 30) c = lerp(c, hex("#e4f0ec"), cl2 > 0.66 ? 0.6 : 0.35);
  }
  return c;
};
const sparkle = (A, x, y, t, k = 1) => { if (hs(x, y, Math.floor(t * 8) + 84) > 1 - 0.0011 * k) { A.set(x, y, FOAM); A.set(x - 1, y, FOAM2); A.set(x + 1, y, FOAM2); A.set(x, y - 1, FOAM2); A.set(x, y + 1, FOAM2); } };
const lily = (A, S, x, y, r, seed, flower) => {
  for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    const q = (xx * xx) / (r * r) + (yy * yy) / (r * r * 0.45); if (q > 1) continue;
    const a = Math.atan2(yy, xx); if (Math.abs(a - hs(seed, 85) * 6) < 0.25) continue;     // its notch
    A.set(x + xx, y + yy, q > 0.7 ? hex("#2e5a2a") : yy < 0 && xx < 0 ? hex("#8cc05a") : hex("#5e9a40"));
  }
  if (flower) { A.set(x, y - 1, hex("#f8e8f0")); A.set(x - 1, y - 1, hex("#e890b0")); A.set(x + 1, y - 1, hex("#e890b0")); A.set(x, y - 2, hex("#f0b0c8")); A.set(x, y, hex("#f0d060")); }
};
const fish = (A, x, y, ang) => { for (let i = -6; i <= 6; i++) for (let j = -2; j <= 2; j++) { if (Math.abs(j) > (6 - Math.abs(i)) / 2.4) continue; A.mix(x + Math.cos(ang) * i - Math.sin(ang) * j, y + Math.sin(ang) * i + Math.cos(ang) * j, hex("#10262a"), 0.6); } for (let j = -2; j <= 2; j++) A.mix(x - Math.cos(ang) * 8 - Math.sin(ang) * j, y - Math.sin(ang) * 8 + Math.cos(ang) * j, hex("#10262a"), 0.5); A.set(x + Math.cos(ang) * 3 - Math.sin(ang) * -1, y + Math.sin(ang) * 3 + Math.cos(ang) * -1, hex("#c8d8c0")); };
const heron = (A0, x, y) => {
  const A = { set: (X, Y, c) => { const dx = X - x, dy = Y - y; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) A0.set(x + Math.round(dx * 1.4) + a, y + Math.round(dy * 1.4) + b, c); }, mix: (X, Y, c, k) => A0.mix(x + (X - x) * 1.4, y + (Y - y) * 1.4, c, k) };
  const G = pal("#3c4450", "#7a8494", "#b4bcc8", "#e8ecf0");
  // legs in the water, body, s-neck, dagger bill
  for (let j = 0; j < 7; j++) { A.set(x, y - j, G[0]); A.set(x + 2, y - j, G[0]); }
  for (let yy = -13; yy <= -7; yy++) for (let xx = -4; xx <= 5; xx++) if (((xx - 0.5) / 5) ** 2 + ((yy + 10) / 3.4) ** 2 < 1) A.set(x + xx, y + yy, yy < -10 ? G[2] : G[1]);
  for (let xx = -6; xx <= -2; xx++) A.set(x + xx, y - 8 + (xx + 6) * 0.2, G[0]);       // tail
  const neck = [[5, -13], [6, -15], [6, -17], [5, -19], [6, -21], [7, -22]];
  for (const [nx, ny] of neck) { A.set(x + nx, y + ny, G[3]); A.set(x + nx + 1, y + ny, G[2]); }
  A.set(x + 8, y - 23, G[3]); A.set(x + 7, y - 23, G[0]); for (let b = 9; b <= 13; b++) A.set(x + b, y - 22 + (b > 11 ? 1 : 0), hex("#d8b04c"));
  A.set(x + 6, y - 24, G[0]); A.set(x + 5, y - 24, G[0]); A.set(x + 4, y - 23, G[0]);   // the black crest
  // its ripple rings
  for (let a = 0; a < 6.28; a += 0.2) { A.mix(x + 1 + Math.cos(a) * 6, y + 1 + Math.sin(a) * 2, FOAM, 0.6); }
};
const optionB = (scene, S, t) => {
  const A = new Art(), L = new Layer();
  if (scene === "river") {
    const F = scene1(), R = F.river; paintGround(A, F.road);
    oak(L, A, S, 418, 96, 22, 2); oak(L, A, S, 780, 520, 20, 4); oak(L, A, S, 66, 280, 17, 5); oak(L, A, S, 250, 360, 14, 6);
    const wetAt = (x, y) => { const k = y * W + x, e = riverHW(R.s[k]) + (vn(R.s[k] / 12, R.sd[k], 54) - 0.5) * 7; return R.d[k] < e; };
    for (const [x, r, sd] of [[46, 18, 19], [236, 15, 20], [480, 16, 18], [706, 18, 15], [812, 14, 21]]) { let y = 0; while (y < H - 1 && !wetAt(x, y + 6)) y++; oak(L, A, S, x, y + 3, r, sd); }
    const src = A.copy(); flatten(src, L);
    // the placeholder deck goes into the reflection source too
    deck(src, S, 556, 628, 330, 456, 0);
    const wet = new Uint8Array(W * H), top = new Int16Array(W).fill(-1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, e = riverHW(R.s[k]) + (vn(R.s[k] / 12, R.sd[k], 54) - 0.5) * 7; if (R.d[k] < e) wet[k] = 1; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x; if (!wet[k]) continue;
      // the reflection axis: the top of this run of water in the column
      let ax = y; while (ax > 0 && wet[(ax - 1) * W + x]) ax--;
      const e = riverHW(R.s[k]) + (vn(R.s[k] / 12, R.sd[k], 54) - 0.5) * 7, dn = clamp(1 - R.d[k] / e, 0, 1);
      // pools in the bends: deeper on the outside of a curve
      let c = waterB(src, x, y, sm(dn) * 1.05, R.s[k], t, ax - 1, { side: R.sd[k], d: R.d[k] });
      if (R.d[k] > e - 2) c = lerp(c, hex("#e6ecd8"), 0.45);                // the wet edge catches light
      A.set(x, y, c, 3);
      if (dn > 0.3) sparkle(A, x, y, t, 1.5);
    }
    // stones that break the surface, sedge and reeds on the margins, lilies in the slack water
    for (const [rx, ry, rr] of [[200, 140, 4], [470, 412, 5], [700, 382, 4]]) rockInWater(A, S, rx, ry, rr, t, true);
    for (const [x, y, r, f] of [[278, 196, 9, 1], [296, 206, 6, 0], [266, 210, 7, 0], [284, 222, 5, 1], [740, 420, 9, 1], [758, 410, 6, 0], [726, 430, 6, 0], [130, 140, 8, 1], [148, 146, 5, 0]]) lily(A, S, x, y, r, x + y, f);
    for (const [x, y] of [[392, 352], [410, 366], [462, 446], [168, 92], [70, 132]]) fish(A, x, y, 0.2 + hs(x, 86) * 0.5);
    reeds(A, S, 300, 290, 40, 40, t); reeds(A, S, 520, 450, 40, 16, t); reeds(A, S, 60, 150, 40, 14, t); reeds(A, S, 650, 350, 40, 16, t); reeds(A, S, 800, 330, 40, 30, t);
    heron(A, 300, 292);
    deck(A, S, 556, 628, 330, 456);
  } else if (scene === "lake") {
    const F = scene2(); paintGround(A, F.road);
    oak(L, A, S, 520, 196, 13, 7); oak(L, A, S, 70, 70, 20, 8); oak(L, A, S, 780, 90, 22, 9); oak(L, A, S, 800, 300, 16, 10);
    oak(L, A, S, 330, 82, 18, 16); oak(L, A, S, 470, 74, 15, 17);
    const src = A.copy(); flatten(src, L);
    const { m, d } = F;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x; if (!m[k]) continue;
      let ax = y; while (ax > 0 && m[(ax - 1) * W + x]) ax--;
      const dn = clamp(d[k] / 52, 0, 1);
      let c = waterB(src, x, y, sm(dn), x * 0.3, t, ax - 1, null);
      if (d[k] < 1.5) c = lerp(c, hex("#e6ecd8"), 0.5);
      A.set(x, y, c, 3); if (dn > 0.4) sparkle(A, x, y, t, 1);
    }
    // a sand beach on the south-west shore (dry sand on the land side)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (m[k] || beachW(x, y) < 0.5) continue; let n = 99; for (let j = 1; j <= 12; j++) if (y - j >= 0 && m[k - j * W]) { n = j; break; } if (n < 12) A.set(x, y, SAND[clamp(3 - Math.floor(n / 4) + (hs(x, y, 87) > 0.8 ? -1 : 0), 0, 3)]); }
    for (const [x, y, r, f] of [[600, 250, 7, 1], [616, 262, 5, 0], [586, 266, 5, 0], [630, 244, 4, 1], [250, 170, 6, 0], [266, 160, 5, 1]]) lily(A, S, x, y, r, x + y, f);
    for (const [x, y] of [[380, 230], [430, 260], [470, 214]]) fish(A, x, y, hs(x, 88) * 6);
    reeds(A, S, 650, 196, 40, 34, t); reeds(A, S, 214, 150, 34, 22, t);
    puddles(A, S, F, "B", t);
    heron(A, 560, 276);
    jetty(A, S, 356, 318, 46, false);
  } else {
    const F = scene3(); paintGround(A, F.road);
    for (let x = 0; x < W; x++) { const ys = shoreY(x); for (let y = Math.round(ys); y < H; y++) { const w = y - ys; const dn = clamp(w / 180, 0, 1); let c = waterB(A, x, y, sm(dn), x, t, null, null); if (w < 18) c = lerp(SAND[2], c, w / 18); A.set(x, y, c, 3); } }
  }
  flatten(A, L);
  return A;
};

// ================================================================================================================
// OPTION C: painted current. Bold, graphic water: a few big flat bands that follow the flow, long bright
// ribbons of light travelling with it, lacy foam fans below every stone, a sparkling sun path, a bold
// cream foam line along every shore.
// ================================================================================================================
const WC = pal("#163c6c", "#1f5a8c", "#2c7aa8", "#46a0c0", "#7cc8d4", "#bfe6e0");
const optionC = (scene, S, t) => {
  const A = new Art(), L = new Layer();
  const bandC = (dn, x, y, s, side, d) => {
    // flat bands with crisp, swept edges (the edges lean downstream like brush strokes)
    const sweep = Math.sin((s + (side || 0) * (d || 0) * 0.6) / 38) * 0.07 + Math.sin(s / 11 + (d || 0) / 7) * 0.03;
    const v = dn + sweep;
    let c = v < 0.1 ? WC[4] : v < 0.32 ? WC[3] : v < 0.62 ? WC[2] : v < 0.86 ? WC[1] : WC[0];
    // ribbons of light: long thin bright dashes travelling with the flow
    if (s != null) {
      const lane = ((side || 1) * (d || 0)) / 7, li = Math.round(lane);
      if (Math.abs(lane - li) < 0.16) { const u = s - t * 64 + hs(li, 90) * 300; if ((u % 130 + 130) % 130 < 34 + hs(li, 91) * 30) c = Math.abs(lane - li) < 0.07 ? WC[5] : WC[4]; }
    }
    return c;
  };
  if (scene === "river") {
    const F = scene1(), R = F.river; paintGround(A, F.road);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x, e = riverHW(R.s[k]) + (vn(R.s[k] / 12, R.sd[k], 54) - 0.5) * 4; if (R.d[k] >= e + 4) continue;
      if (R.d[k] >= e) { A.set(x, y, R.d[k] < e + 2 ? FOAM : hex("#3e6a48"), 4); continue; }     // a bold cream line, a dark grass rim
      const dn = clamp(1 - R.d[k] / e, 0, 1);
      let c = bandC(dn, x, y, R.s[k], R.sd[k], R.d[k]);
      // the sun's path: a band of star glints across the water
      if (Math.abs((x - y * 0.9) - 120) < 60 && hs(x, y, Math.floor(t * 6) + 92) > 0.985) { c = FOAM; A.set(x + 1, y, WC[5]); A.set(x - 1, y, WC[5]); }
      A.set(x, y, c, 3);
    }
    // lacy foam fans below each stone
    for (const [rx, ry, rr] of [[200, 146, 9], [262, 180, 7], [470, 424, 10], [700, 392, 8], [120, 120, 7]]) { foamFan(A, rx, ry, rr, t, R); rockInWater(A, S, rx, ry, rr, t, false); }
    deck(A, S, 556, 628, 330, 456, 8);
    foamFan(A, 634, 372, 14, t, R); foamFan(A, 634, 420, 14, t, R);
    oak(L, A, S, 140, 52, 18, 1); oak(L, A, S, 418, 96, 22, 2); oak(L, A, S, 770, 64, 20, 3); oak(L, A, S, 780, 520, 20, 4); oak(L, A, S, 66, 280, 17, 5); oak(L, A, S, 250, 360, 14, 6);
  } else if (scene === "lake") {
    const F = scene2(); paintGround(A, F.road);
    const { m, d } = F;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (!m[k]) { let n = 0; for (let j = 1; j <= 4 && !n; j++) if ((x + j < W && m[k + j]) || (x >= j && m[k - j]) || (y + j < H && m[k + j * W]) || (y >= j && m[k - j * W])) n = j; if (n) A.set(x, y, n <= 2 ? FOAM : hex("#3e6a48"), 4); continue; }
      const dn = clamp(d[k] / 54, 0, 1), rip = Math.sin(d[k] / 4 - t * 6.28) > 0.86 && d[k] < 26;
      let c = bandC(dn + (vn(x / 40, y / 20, 93) - 0.5) * 0.12, x, y, null);
      if (rip) c = WC[4];
      // the sun path: a tall band of glints toward the upper left sun
      if (Math.abs(x - 330 + (y - 222) * 0.7) < 34 && dn > 0.25 && hs(x, y, Math.floor(t * 6) + 92) > 0.975) { c = FOAM; A.set(x + 1, y, WC[5]); A.set(x - 1, y, WC[5]); }
      // long bright wind lanes on the open water
      if (vn(x / 60 - t, y / 3.2, 94) > 0.79 && dn > 0.4) c = WC[4];
      A.set(x, y, c, 3);
    }
    jetty(A, S, 356, 318, 46, false);
    oak(L, A, S, 520, 196, 13, 7); oak(L, A, S, 70, 70, 20, 8); oak(L, A, S, 780, 90, 22, 9); oak(L, A, S, 800, 300, 16, 10);
    puddles(A, S, F, "C", t);
  } else {
    const F = scene3(); paintGround(A, F.road);
    for (let x = 0; x < W; x++) { const ys = shoreY(x); for (let y = Math.round(ys); y < H; y++) { const w = y - ys; let c = bandC(clamp(w / 200, 0, 1), x, y, null); if (w < 3) c = FOAM; A.set(x, y, c, 3); } }
  }
  flatten(A, L);
  return A;
};
const foamFan = (A, rx, ry, rr, t, R, k = 1) => {
  // a lace V opening downstream along the flow: chevrons of foam beads that travel and thin out
  let ang = 0; if (R) { const K = Math.round(ry) * W + Math.round(rx); ang = Math.atan2(R.ty[K], R.tx[K]); }
  for (let ring = 0; ring < 8; ring++) {
    const u = ((ring * 8 + t * 40) % 64), arm = rr * 0.9 + u * 1.3, half = 0.5 + u * 0.004;
    for (const sd of [-1, 1]) for (let q = 0; q <= arm; q += 1) {
      if (hs(ring, Math.round(q), 95 + sd) < 0.12 + u / 110) continue;
      const a = ang + sd * half, wob = Math.sin(q / 3 + ring) * 0.8;
      const x = rx + Math.cos(ang) * (u * 0.9) + Math.cos(a) * q * 0.35 - Math.sin(ang) * wob, y = ry + Math.sin(ang) * (u * 0.9) + Math.sin(a) * q * 0.35 + Math.cos(ang) * wob + sd * q * 0.25;
      const K = Math.round(y) * W + Math.round(x); if (A.tag[K] !== 3) continue;
      A.set(x, y, u < 34 ? FOAM : FOAM2); if (u < 24 && A.tag[K + 1] === 3) A.set(x + 1, y, FOAM2);
    }
  }
};

// ---- the game's own pieces on top: the Archer hall with its crew, and figures --------------------------------
const lay = (cx, img, x, y, a = 1) => { cx.globalAlpha = a; cx.drawImage(img.cv || img, Math.round(x - (img.ox || 0)), Math.round(y - (img.oy || 0))); cx.globalAlpha = 1; };
const hallAt = (cx, A, S, x, y) => {
  const b = kit.bakeHall(hallArcher.BOX, hallArcher.build({ level: 2, seed: 0 }), { sun: spriteSun(false) });
  const sp = b.spec, ox = hallArcher.BOX.ox, oy = hallArcher.BOX.oy;
  cx.drawImage(toCanvas(b.back), x - ox, y - oy + (hallArcher.SHEET_DY || 0));
  for (const c of [...(sp.crew || [])].sort((p, q) => p.y - q.y)) { const fr = bakeFrame(bowman, "idle", 0, { variant: c.variant || "" }); lay(cx, fr, x + c.x, y + c.y + (hallArcher.SHEET_DY || 0)); }
  if (b.front) cx.drawImage(toCanvas(b.front), x - ox, y - oy + (hallArcher.SHEET_DY || 0));
};
const hallShadow = (A, S, x, y) => {
  const len = 10 + S.len * 30;
  for (let yy = -10; yy <= 14; yy++) for (let xx = -24; xx <= 24 + len; xx++) {
    for (let k = 0; k <= 1; k += 0.2) { const cx = S.fall[0] * len * k, cy = S.fall[1] * len * k * 0.6; if (((xx - cx) / 22) ** 2 + ((yy - cy - 2) / 9) ** 2 < 1) { A.shade(x + xx, y + yy, 1); break; } }
  }
};
const figs = (cx, list, t) => {
  for (const [kind, x, y, flip, ph] of list.sort((a, b) => a[2] - b[2])) {
    const fig = kind === "gob" ? goblin : garrison, clip = kind === "gob" ? "walk" : "idle", n = fig.CLIPS[clip].n;
    const f = Math.floor((ph + t) * n) % n, fr = bakeFrame(fig, clip, f, { flip });
    cx.globalAlpha = 0.3; cx.fillStyle = "#2a1c34"; cx.beginPath(); cx.ellipse(x + 2, y + 1, 8, 3, 0, 0, 6.3); cx.fill(); cx.globalAlpha = 1;
    lay(cx, fr, x, y);
  }
};
const PEOPLE = {
  river: [["gob", 600, 70, false, 0.1], ["gob", 586, 104, false, 0.5], ["gob", 610, 140, false, 0.3], ["gob", 590, 180, false, 0.8], ["gob", 604, 230, false, 0.2], ["kn", 572, 482, true, 0], ["kn", 600, 496, true, 0.4], ["kn", 590, 470, true, 0.7]],
  lake: [["gob", 220, 484, false, 0.1], ["gob", 250, 470, false, 0.5], ["gob", 190, 494, false, 0.3], ["kn", 420, 486, true, 0], ["kn", 446, 498, true, 0.5]],
  sea: [["gob", 220, 150, false, 0.1], ["gob", 250, 166, false, 0.5], ["gob", 190, 140, false, 0.3], ["kn", 440, 146, true, 0], ["kn", 470, 156, true, 0.5]],
};
const HALL = { river: [210, 300], lake: [120, 330], sea: [560, 262] };

// golden hour: lit ground warms, shade cools (stepped, by the shade mask and a little dither)
const gradeDay = (A, S) => {
  if (!S.warm) return;
  const cool = hex("#3a2a6a");
  for (let k = 0; k < W * H; k++) {
    const i = k * 3, x = k % W, y = (k / W) | 0, c = [A.c[i], A.c[i + 1], A.c[i + 2]];
    const wet = A.tag[k] === 3 || A.tag[k] === 8;
    let o = A.sh[k] > 0.5 ? lerp(c, cool, wet ? 0.1 : 0.22) : lerp(c, S.warm, (wet ? 0.08 : 0.16) + (bay(x, y) > 0.5 ? 0.04 : 0));
    o = mul(o, A.sh[k] > 0.5 ? (wet ? 0.94 : 0.86) : 1.02);
    if (wet && A.sh[k] < 0.5 && (c[0] + c[1] + c[2]) > 420) o = lerp(o, hex("#ffd08a"), 0.55);   // the low sun on every foam and streak
    A.c[i] = o[0]; A.c[i + 1] = o[1]; A.c[i + 2] = o[2];
  }
};

export const OPTIONS = { A: optionA, B: optionB, C: optionC };
// render one panel: returns a canvas at 1x art (840 x 560)
export const renderPanel = async (scene, opt, o = {}) => {
  const S = sunOf(o.sun || "noon"), t = o.t || 0;
  setDay(S.id); clearBakes();
  const A = OPTIONS[opt](scene, S, t);
  const [hx, hy] = HALL[scene]; hallShadow(A, S, hx, hy);
  gradeDay(A, S);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const cx = cv.getContext("2d"), id = cx.createImageData(W, H);
  for (let k = 0; k < W * H; k++) { id.data[k * 4] = A.c[k * 3]; id.data[k * 4 + 1] = A.c[k * 3 + 1]; id.data[k * 4 + 2] = A.c[k * 3 + 2]; id.data[k * 4 + 3] = 255; }
  cx.putImageData(id, 0, 0);
  hallAt(cx, A, S, hx, hy);
  figs(cx, [...PEOPLE[scene]], t);
  setDay("noon");
  return cv;
};
export const at2x = (cv, crop) => {
  const [x, y, w, h] = crop || [0, 0, cv.width, cv.height];
  const o = document.createElement("canvas"); o.width = w * 2; o.height = h * 2;
  const c = o.getContext("2d"); c.imageSmoothingEnabled = false; c.drawImage(cv, x, y, w, h, 0, 0, w * 2, h * 2); return o;
};
