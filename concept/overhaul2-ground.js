// ============ OVERHAUL ROUND 2: THE GREENWOOD GROUND (concept only) ============
// art/briefs/overhaul-round2.md. Repaints the REAL board's ground layer (world.js groundLayer(), one art
// pixel = half a board unit, 1680 x 1120) in place, keeping the game's water, banks, the wood, the castle
// and the road's own surface, so draw() then lays the game's own trees, halls, bridges and figures on top.
//   repaint(layer, noonImg, goldImg, look, o, g)
//     look "meadow"  the everyday meadow (C dialled back): o.k 1 calm / 2 middle / 3 richer
//          "terrace" land with height, painted steps: o.v "banks" | "steps"
//          "farm"    the worked countryside: o.v "quiet" | "patch"
//          "downs"   open downland (the Kingstones): short pale turf, no tall stands
//     o.season "autumn" for the autumn panels
//   farmPlan(o, g) -> the orchard's trees (pushed into DECOR by the lab BEFORE the ground bakes)
// Everything is bake-time pixel work: a board is one pass of noise + a few masks.
import { W, H, PATH_HALF, WALL_W } from "/src/data/constants.js";
import { posAt, TOTAL_LEN, angleAt, nearestOnPath } from "/src/engine/path.js";
import { inRiver, PONDS, inSea, onSand, forestDepthAt, DECOR, BRIDGES } from "/src/data/terrain.js";
import { turfTones, DITH } from "/src/render/world.js";
import { footOf } from "/src/engine/footing.js";
import { DAY } from "/src/data/sun.js";

const AW = W * 2, AH = H * 2, N = AW * AH, RH = PATH_HALF * 2;
const DT = Math.round(Math.sqrt(DITH.length));
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const h32 = (x, y, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vn = (x, y, s = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h32(xi, yi, s), b = h32(xi + 1, yi, s), c = h32(xi, yi + 1, s), d = h32(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y, s = 0) => 0.55 * vn(x, y, s) + 0.3 * vn(x * 2.1 + 5.2, y * 2.1 + 1.3, s + 7) + 0.15 * vn(x * 4.3 + 9.1, y * 4.3 + 3.7, s + 13);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dith = (x, y) => DITH[(y % DT) * DT + (x % DT)];
const LEAFY = new Set(["tree", "pine", "willow", "oak", "birch", "poplar", "ash"]);

// ---- distance field (chamfer, two passes), in art px ----
function distField(seed) {
  const d = new Float32Array(N), D = Math.SQRT2;
  for (let i = 0; i < N; i++) d[i] = seed[i] ? 0 : 1e9;
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x; let v = d[i]; if (!v) continue;
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) { v = Math.min(v, d[i - AW] + 1); if (x > 0) v = Math.min(v, d[i - AW - 1] + D); if (x < AW - 1) v = Math.min(v, d[i - AW + 1] + D); }
    d[i] = v;
  }
  for (let y = AH - 1; y >= 0; y--) for (let x = AW - 1; x >= 0; x--) {
    const i = y * AW + x; let v = d[i]; if (!v) continue;
    if (x < AW - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < AH - 1) { v = Math.min(v, d[i + AW] + 1); if (x < AW - 1) v = Math.min(v, d[i + AW + 1] + D); if (x > 0) v = Math.min(v, d[i + AW - 1] + D); }
    d[i] = v;
  }
  return d;
}

// ---- the board's masks (once per board) ----
export function boardOf() {
  const rs = new Uint8Array(N);
  for (let d = 0; d <= TOTAL_LEN; d += 0.25) { const [x, y] = posAt(d); const X = Math.round(x * 2), Y = Math.round(y * 2); if (X >= 0 && X < AW && Y >= 0 && Y < AH) rs[Y * AW + X] = 1; }
  const roadD = distField(rs);
  const ws = new Uint8Array(N), fd = new Float32Array(W * H);
  for (let yu = 0; yu < H; yu++) for (let xu = 0; xu < W; xu++) {
    const x = xu + 0.5, y = yu + 0.5;
    fd[yu * W + xu] = forestDepthAt(x, y);
    let w = inRiver(x, y, 0) || inSea(x, y, 0) || onSand(x, y);
    if (!w) for (const p of PONDS) if (((x - p.x) / (p.w / 2)) ** 2 + ((y - p.y) / (p.h / 2)) ** 2 < 1) { w = true; break; }
    if (w) { const i = yu * 2 * AW + xu * 2; ws[i] = ws[i + 1] = ws[i + AW] = ws[i + AW + 1] = 1; }
  }
  const wD = distField(ws);
  const decor = DECOR.map((d) => ({ x: d.x, y: d.y, s: d.s || 1, t: d.t, tree: LEAFY.has(d.t) }));
  return { roadD, wD, fd, decor };
}
const FD = (B, X, Y) => B.fd[clamp(Y >> 1, 0, H - 1) * W + clamp(X >> 1, 0, W - 1)];

// may a feature stand at (xu, yu) (board units) with this much room?
const freeAt = (B, halls, xu, yu, pad) => {
  if (xu < 14 || xu > W - WALL_W - 18 || yu < 10 || yu > H - 10) return false;
  const i = Math.round(yu * 2) * AW + Math.round(xu * 2);
  if (B.roadD[i] < RH + pad * 2 + 8 || B.wD[i] < 24 + pad * 2) return false;
  if (FD(B, xu * 2, yu * 2) > -26 - pad) return false;
  for (const h of halls) if (Math.hypot((xu - h.x) / (h.rx + pad + 10), (yu - h.cy) / (h.ry + pad + 8)) < 1) return false;
  for (const d of B.decor) if (Math.hypot(d.x - xu, d.y - yu) < (d.tree ? 18 : 10) * d.s + pad) return false;
  return true;
};
const hallsOf = (g) => (g?.towers || []).map((t) => { const f = footOf(t.kind); return { x: t.x, y: t.y, cy: t.y + f.cy, rx: f.rx, ry: f.ry, kind: t.kind }; });
// elliptic distance to the nearest hall's footing (1 = its rim), in art px space
const hallE = (halls, X, Y) => { let e = 9; for (const h of halls) e = Math.min(e, Math.hypot((X / 2 - h.x) / h.rx, (Y / 2 - h.cy) / h.ry)); return e; };

// ---- the palette: the game's own Greenwood ramp (7 tones x cool / plain / warm) ----
const ramp = () => { const t = turfTones(); return (tone, temp = 1) => t.meadow[clamp(tone, 0, 6) * 3 + temp]; };

// autumn: the grass yellows toward olive and ochre, the shade browns
const autumnize = (c, k = 1) => {
  const [r, g, b] = c, l = (r + g + b) / 3;
  const ochre = [l * 1.25 + 24, l * 1.08 + 8, l * 0.55];
  return mix(c, ochre, 0.5 * k);
};

// ---- a raised mass (tall grass, a hedge, standing crop): footprint M, painted as a low prism ----
// paints C (rgb floats), respects Z (the ground row of what is already standing at each pixel), and
// records its shadow into SH. top(x, y, rim, lip) / face(x, y, j, hh) give colours.
function raised(S, M, box, h, o) {
  const { C, Z, SH } = S, jag = o.jag ?? 1, seed = o.seed || 1;
  const [bx0, by0, bx1, by1] = box, ls = Math.max(o.minLen ?? 0.5, DAY.len) * (o.shadowK ?? 1), fx = DAY.fall[0], fy = DAY.fall[1];
  const m = (x, y) => x >= 0 && x < AW && y >= 0 && y < AH && M[y * AW + x];
  for (let y = Math.max(0, by0 - h - 3); y <= Math.min(AH - 1, by1 + Math.ceil(h * ls) + 4); y++) for (let x = Math.max(0, bx0 - 2); x <= Math.min(AW - 1, bx1 + Math.ceil(h * ls * 1.2) + 4); x++) {
    const i = y * AW + x, hh = Math.max(1, h + Math.round((vn(x / 2.3, 0.5, seed) - 0.5) * 2 * jag));
    let k = -1;
    for (let kk = hh; kk >= 0; kk--) if (m(x, y + kk)) { k = kk; break; }
    if (k >= 0) {
      if (Z[i] > y + k) continue;
      Z[i] = y + k;
      const c = k === hh ? o.top(x, y, !m(x, y + hh - 1), !m(x, y + hh + 1)) : o.face(x, y, k, hh);
      C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2];
      continue;
    }
    // a blade tip or a sprig poking above the top's back rim
    if (o.tip && m(x, y + 1 + hh) && !m(x, y + hh) && h32(x, seed, 3) < o.tipP && Z[i] <= y + 1 + hh) {
      const c = o.tip(x, y); C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2]; Z[i] = y + 1 + hh; continue;
    }
    // its shadow on the ground
    if (Z[i] !== y) continue;
    const L = Math.max(2, Math.round(hh * ls));
    let sh = 0;
    for (let t = 1; t <= L; t++) if (m(Math.round(x - fx * t), Math.round(y - fy * t))) { sh = t <= 1 ? 1 : 0.8; break; }
    if (m(x, y - 1) || m(x, y - 2)) sh = Math.max(sh, 1); // the foot
    if (sh) SH[i] = Math.max(SH[i], sh * (o.shadow ?? 1));
  }
}
// a noisy ellipse footprint (units in, art px out); returns [M, box]
function blob(M, xu, yu, rx, ry, o = {}) {
  const X = xu * 2, Y = yu * 2, RX = rx * 2, RY = ry * 2, s = o.seed || 1, rag = o.rag ?? 0.35;
  const box = [Math.floor(X - RX * 1.4), Math.floor(Y - RY * 1.4), Math.ceil(X + RX * 1.4), Math.ceil(Y + RY * 1.4)];
  for (let y = Math.max(0, box[1]); y <= Math.min(AH - 1, box[3]); y++) for (let x = Math.max(0, box[0]); x <= Math.min(AW - 1, box[2]); x++) {
    const e = Math.hypot((x - X) / RX, (y - Y) / RY) + (fbm(x / 26, y / 20, s) - 0.5) * (o.warp ?? 0.7) + (vn(x / 2.6, y / 2.2, s + 3) - 0.5) * rag;
    if (e < 1 && (!o.ok || o.ok(x, y))) M[y * AW + x] = 1;
  }
  return box;
}

// =====================================================================================================
export function repaint(layer, noonImg, goldImg, look, o = {}, g = null) {
  const T0 = performance.now();
  const B = boardOf();
  const TB = performance.now() - T0;
  const halls = hallsOf(g), G = ramp(), aut = o.season === "autumn";
  const orig = noonImg.data, gold = goldImg ? goldImg.data : null;
  const C = new Float32Array(N * 3), Z = new Float32Array(N), SH = new Float32Array(N), KEEP = new Uint8Array(N);
  const S = { C, Z, SH };
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) Z[y * AW + x] = y;
  const set = (i, c) => { C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2]; };
  const get = (i) => [C[i * 3], C[i * 3 + 1], C[i * 3 + 2]];
  const grassy = (i) => { const r = orig[i * 4], gg = orig[i * 4 + 1], b = orig[i * 4 + 2]; return gg > r + 10 && gg >= b - 4; };
  const rnd = (n) => { let s = (o.seed || 7) + n * 977; return () => (s = (Math.imul(s, 1664525) + 1013904223) | 0, (s >>> 0) / 4294967296); };

  // ---- what stays the game's: water, banks and sand, the wood, the castle, the road's own surface ----
  const castleX = (W - WALL_W) * 2 - 10;
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x, rd = B.roadD[i], wd = B.wD[i], f = FD(B, x, y);
    let k = 0;
    if (x >= castleX) k = 1;
    else if (wd < 1.5) k = 1;
    else if (wd < 30 && !grassy(i)) k = 1;
    else if (rd < RH - 5) k = 1;
    else if (rd < RH + 10 && !grassy(i)) k = 1;
    else if (f > -8) k = 1;
    else if (f > -20 && h32(x, y, 5) < (f + 20) / 12) k = 1;
    KEEP[i] = k;
  }

  // ---- the land's big quiet masses ----
  const k = o.k || 2, downs = look === "downs";
  const P = {
    meadow: { sc: 330, thr: k === 1 ? [0.34, 0.47, 0.66] : k === 2 ? [0.33, 0.46, 0.64] : [0.32, 0.45, 0.62], tones: k === 1 ? [2, 2, 3, 4] : [1, 2, 3, 4], fleck: [0, 0.018, 0.03, 0.045][k], dry: [0, 0.04, 0.07, 0.1][k] },
    downs: { sc: 420, thr: [0.3, 0.44, 0.6], tones: [2, 3, 4, 4], fleck: 0.015, dry: 0.16 },
    terrace: { sc: 300, thr: [0.32, 0.46, 0.64], tones: [1, 2, 3, 4], fleck: 0.025, dry: 0.05 },
    farm: { sc: 330, thr: [0.33, 0.46, 0.64], tones: [2, 2, 3, 4], fleck: 0.02, dry: 0.04 },
  }[look] || {};
  const seed = o.seed || 11;
  const hgt = (x, y) => fbm(x / P.sc, y / P.sc, seed) * 0.82 + fbm(x / (P.sc * 0.42), y / (P.sc * 0.42), seed + 40) * 0.18;
  const DRY = hex("#d6c670"), DAMP = hex("#2f6a58");
  const base = (x, y, i, lvl = 0) => {
    const wd = B.wD[i];
    let v = hgt(x, y) - Math.max(0, 1 - wd / 110) * 0.22 + lvl;
    // the swell's sunny side a touch lighter (the game's own relief, gentler)
    const gx = hgt(x + 10, y) - hgt(x - 10, y), gy = hgt(x, y + 10) - hgt(x, y - 10);
    v += (-gx * 0.6 - gy * 0.8) * 2.2;
    // mass edges break in blade strokes (the game's own stroke tile), never a smooth airbrush
    const dt = dith(x, y), vd = v + (dt - 0.5) * 0.16 + (BAY[y & 3][x & 3] - 0.5) * 0.03;
    const [a, b2, c] = P.thr, T = P.tones;
    const ti = vd < a ? 0 : vd < b2 ? 1 : vd < c ? 2 : 3;
    let tone = T[ti], temp = ti === 0 ? 0 : ti === 3 ? 2 : 1;
    // the turf's blades: whole lit strokes and dark ones from the same tile, thicker on the masses' rims
    const rimK = 1 - Math.min(1, Math.min(Math.abs(vd - a), Math.abs(vd - b2), Math.abs(vd - c)) / 0.06);
    const pl = P.fleck * (3 + rimK * 3), pd = P.fleck * (2 + rimK * 2);
    const sv = h32(x, Math.floor(y / 3), 21 + (x & 7));
    if (dt > 0.72 && sv < pl * 2.2) tone += 1;
    else if (dt < 0.3 && sv < pd * 2.2) tone -= 1;
    let col = G(tone, temp);
    if (ti === 3) col = mix(col, DRY, P.dry);
    if (ti === 0) col = mix(col, DAMP, 0.08);
    return col;
  };

  // terraces: the level field (painted steps; the board stays flat)
  let LV = null, FH = 0;
  if (look === "terrace") {
    const st = o.v === "steps";
    FH = st ? 30 : 16;
    LV = new Uint8Array(N);
    const [ax, ay] = o.tilt || [0.35, -1], len = Math.hypot(ax, ay), bands = o.bands || [0.36, 0.64];
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      const t = ((x / AW - 0.5) * ax + (y / AH - 0.5) * ay) / len + 0.5 + (fbm(x / 300, y / 240, seed + 5) - 0.5) * (st ? 0.24 : 0.32);
      LV[y * AW + x] = t < bands[0] ? 0 : t < bands[1] ? 1 : 2;
    }
  }
  const lv = (x, y) => LV[clamp(y, 0, AH - 1) * AW + clamp(x, 0, AW - 1)];
  // the step is taller in places and lower in others along its length
  const FHc = (x) => Math.max(5, Math.round(FH * (0.62 + 0.6 * vn(x / 120, 2.5, seed + 66))));

  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x;
    if (KEEP[i]) continue;
    let c;
    if (LV) {
      const L = lv(x, y);
      c = base(x, y, i, (L - 1) * 0.16);
      if (L === 2) c = mix(c, DRY, 0.14); else if (L === 0) c = mix(c, DAMP, 0.12);
    } else c = base(x, y, i);
    if (downs) c = mix(c, hex("#bcbc82"), 0.22);
    set(i, c);
  }

  // ---- edges: the road verge, the water's edge, round trees and rocks ----
  const vergeP = look === "meadow" ? [0, 0.03, 0.05, 0.07][k] : 0.035;
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x;
    if (KEEP[i]) continue;
    const rd = B.roadD[i], wd = B.wD[i];
    // a trampled margin: paler, drier grass, dithered out over ~7 px
    if (rd < RH + 14) {
      const t = 1 - (rd - RH + 2) / 16;
      if (BAY[y & 3][x & 3] < t * 0.9) set(i, mix(get(i), mix(G(4, 2), hex("#c8b878"), 0.35), 0.55));
      // verge tufts
      if (rd > RH + 1 && rd < RH + 9 && h32(x >> 1, y >> 2, 31) < vergeP * 3 && h32(x, y, 32) < 0.5) {
        for (let j = 0; j < 3; j++) if (y - j >= 0 && !KEEP[i - j * AW]) set(i - j * AW, j === 2 ? G(6, 2) : j === 1 ? G(4, 1) : G(2, 0));
      }
    }
    // the water's edge: damp darker turf, a few rushes
    if (wd < 18) {
      const t = 1 - wd / 18;
      if (BAY[y & 3][x & 3] < t) set(i, mix(get(i), G(1, 0), 0.5));
      if (wd > 2 && wd < 9 && h32(x >> 1, y >> 2, 41) < 0.09) for (let j = 0; j < 5; j++) if (y - j >= 0 && !KEEP[i - j * AW]) set(i - j * AW, j >= 3 ? hex(aut ? "#a07040" : "#8a8a48") : j >= 1 ? G(2, 0) : G(0, 0));
    }
  }
  // round trees and rocks: a shade pool down-sun, a ring of grass left long, leaves in autumn
  for (const d of B.decor) {
    const r = (d.tree ? 15 : 7) * d.s * 2, X = d.x * 2, Y = d.y * 2;
    for (let y = Math.floor(Y - r); y <= Y + r * 1.2; y++) for (let x = Math.floor(X - r * 1.3); x <= X + r * 1.6; x++) {
      if (x < 0 || y < 0 || x >= AW || y >= AH) continue;
      const i = y * AW + x;
      if (KEEP[i]) continue;
      const e = Math.hypot((x - X - r * 0.25) / (r * 1.2), (y - Y - r * 0.12) / (r * 0.55));
      if (e < 1 && BAY[y & 3][x & 3] < (1 - e) * 1.6) set(i, mix(get(i), G(1, 0), d.tree ? 0.45 : 0.3));
      if (aut && d.tree) {
        const e2 = Math.hypot((x - X) / (r * 1.5), (y - Y) / (r * 0.75));
        if (e2 < 1 && h32(x, y, 77) < (1 - e2) * 0.85) set(i, hex(["#c86a2a", "#e09a34", "#a84a24", "#d8b040"][Math.floor(h32(x, y, 78) * 4)]));
      } else if (look === "meadow" && k >= 2 && d.tree) {
        const e2 = Math.hypot((x - X) / (r * 1.05), (y - Y) / (r * 0.5));
        if (e2 > 0.75 && e2 < 1.1 && h32(x >> 1, y >> 2, 79) < 0.18) for (let j = 0; j < 3; j++) if (y - j >= 0 && !KEEP[i - j * AW]) set(i - j * AW, j === 2 ? G(5, 2) : G(2, 0));
      }
    }
  }

  // ---- halls: a flattened ring of grass round each footing ----
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x;
    if (KEEP[i]) continue;
    const e = hallE(halls, x, y);
    if (e < 1.5 && e > 0.95) {
      const t = (1.5 - e) / 0.55;
      if (BAY[y & 3][x & 3] < t) set(i, ((x + y) % 4 < 2) ? mix(G(4, 2), hex("#c8b878"), 0.25) : G(3, 1));
    }
  }

  const feature = (x, y) => !KEEP[y * AW + x] && B.roadD[y * AW + x] > RH + 14 && hallE(halls, x, y) > 1.25;
  const log = [];

  // ================= THE EVERYDAY MEADOW (and the downs) =================
  if (look === "meadow" || look === "downs") {
    const R = rnd(1);
    const cand = [];
    for (let t = 0; t < 600; t++) cand.push([20 + R() * (W - WALL_W - 40), 20 + R() * (H - 40)]);
    const placed = [];
    const take = (n, rx, ry, extra = []) => {
      const out = [...extra];
      for (const [x, y] of cand) {
        if (out.length >= n) break;
        if (placed.some((p) => Math.hypot(p[0] - x, p[1] - y) < p[2] + rx + 30)) continue;
        if (!freeAt(B, halls, x, y, rx * 0.8)) continue;
        out.push([x, y, rx]); placed.push([x, y, rx]);
      }
      return out;
    };
    // stands of tall grass (bracken in autumn)
    const nSt = downs ? 0 : [0, 2, 3, 5][k], hSt = [0, 7, 8, 9][k];
    const stands = take(nSt, [0, 20, 24, 26][k], 0);
    if (o.standAtHall != null && g?.towers[o.standAtHall]) { const t = g.towers[o.standAtHall]; stands.push([t.x + 6, t.y + 6, 46]); }
    stands.forEach(([x, y, rx], n) => {
      const M = new Uint8Array(N);
      const box = blob(M, x, y, rx * 1.1, rx * 0.44, { seed: 100 + n, rag: 0.6, warp: 1.05, ok: feature });
      const sd = 200 + n;
      const brack = aut;
      // the seed heads: a duller, straw-tinged green, darker than the lawn round it; lit tips on the back rim
      const STRAW = hex("#b8ae5c");
      const TOP = brack ? [mix(hex("#6e5226"), G(2, 0), 0.25), hex("#94662e"), hex("#b4823c"), hex("#d0a454")] : [mix(G(2, 1), STRAW, 0.22), mix(G(4, 2), STRAW, 0.4), mix(G(5, 2), hex("#e8e0a0"), 0.5), mix(G(6, 2), hex("#f4eeb8"), 0.6)];
      const FACE = brack ? [hex("#33261a"), hex("#4a3420"), hex("#5c4226")] : [mul(G(0, 0), 0.82), G(0, 0), mix(G(0, 0), G(1, 0), 0.6)];
      raised(S, M, box, hSt, {
        seed: sd, jag: 1.6, tipP: 0.42, shadow: 1, minLen: 0.8,
        top: (x, y, rim, lip) => {
          if (rim) return h32(x, y, sd + 1) < 0.65 ? TOP[3] : TOP[2];
          const d = dith(x, y), w = vn(x / 9, y / 5, sd + 2);
          if (d > 0.78) return TOP[2];
          if (d < 0.22) return TOP[0];
          return w < 0.36 ? TOP[0] : TOP[1];
        },
        // the front: dark blades in columns, a lit blade here and there hanging from the lip
        face: (x, y, j, hh) => {
          if (j === 0) return FACE[0];
          const c = h32(x, 9, sd);
          if (c < 0.26 && j >= hh - 3) return TOP[1];
          return c < 0.55 ? FACE[1] : FACE[2];
        },
        tip: () => TOP[3],
      });
    });
    log.push(`${stands.length} stands`);
    // the flower drift (one you can see), near a tree if one is free
    const nDr = downs ? 1 : [0, 1, 1, 2][k];
    const drifts = take(nDr, 24, 0);
    drifts.forEach(([x0, y0], n) => {
      const X = x0 * 2, Y = y0 * 2, RX = 52, RY = 26;
      const cols = aut ? [hex("#e8c040"), hex("#c8582c")] : downs ? [hex("#f4f0e0"), hex("#e8d040")] : n ? [hex("#9a8ae8"), hex("#f4f0e0")] : [hex("#f4f0e0"), hex("#f2d030")];
      const dens = aut ? 0.16 : [0, 0.26, 0.34, 0.42][k] || 0.22;
      for (let y = Y - RY * 1.5; y < Y + RY * 1.5; y += 2) for (let x = X - RX * 1.5; x < X + RX * 1.5; x += 2) {
        const e = Math.hypot((x - X) / RX, (y - Y) / RY) + (fbm(x / 30, y / 20, 300 + n) - 0.5) * 0.8;
        if (e > 1) continue;
        const xi = Math.round(x + (h32(x, y, 301) - 0.5) * 2), yi = Math.round(y + (h32(x, y, 302) - 0.5) * 2);
        if (!feature(xi, yi) || !feature(xi + 1, yi + 1)) continue;
        if (h32(xi, yi, 303) > dens * (1.35 - e)) continue;
        const c = cols[h32(xi, yi, 304) < 0.62 ? 0 : 1], i = yi * AW + xi;
        set(i - 1, mul(c, 0.9)); set(i, c); set(i + 1, mul(c, 0.86)); set(i + AW, mul(c, 0.7)); set(i + AW - 1, G(1, 0)); set(i + AW + 1, G(1, 0));
      }
    });
    // a clover patch: a deeper, bluer green in little trefoils
    const nCl = downs ? 0 : [0, 0, 1, 2][k];
    take(nCl, 18, 0).forEach(([x0, y0], n) => {
      const X = x0 * 2, Y = y0 * 2, RX = 40, RY = 20;
      for (let y = Y - RY * 1.5; y < Y + RY * 1.5; y++) for (let x = X - RX * 1.5; x < X + RX * 1.5; x++) {
        if (!feature(x, y)) continue;
        const e = Math.hypot((x - X) / RX, (y - Y) / RY) + (fbm(x / 22, y / 16, 400 + n) - 0.5) * 0.7;
        if (e > 1 || BAY[y & 3][x & 3] > (1 - e) * 3) continue;
        const i = y * AW + x, cell = ((x >> 1) + (y >> 1)) & 1;
        set(i, cell ? mix(G(2, 0), hex("#2e7a62"), 0.3) : mix(G(3, 0), hex("#3e8a6a"), 0.25));
        if (h32(x >> 1, y >> 1, 401) < 0.05 && !aut) set(i, hex("#f0ece0"));
      }
    });
    // downland: chalk showing on the rises, a few sheep
    if (downs) {
      for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
        const i = y * AW + x; if (!feature(x, y)) continue;
        const v = hgt(x, y) + (fbm(x / 40, y / 24, 501) - 0.5) * 0.25;
        if (v > 0.6 && BAY[y & 3][x & 3] < (v - 0.6) * 8) set(i, h32(x, y, 502) < 0.3 ? hex("#c8c4b0") : hex("#e0dcc8"));
      }
      flock(S, B, halls, feature, take, 3, 5, rnd(9));
    }
  }

  // ================= TERRACES =================
  if (look === "terrace") {
    const st = o.v === "steps";
    const near = (x, y) => B.roadD[y * AW + x] < RH + 18; // the ramp: the road climbs, no face
    const EARTH = [hex("#86705a"), hex("#706048"), hex("#9c8462"), hex("#564636")].map((c) => aut ? mix(c, hex("#8a5a34"), 0.2) : c);
    const STONE = [hex("#7c7a76"), hex("#a4a098"), hex("#c8c2b4"), hex("#545250")];
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      const i = y * AW + x;
      if (KEEP[i] && B.roadD[i] >= RH - 5) continue;
      const L = lv(x, y);
      // the face: an upper terrace edge j px above (the board stays flat; the face is painted on the lower side)
      let j = -1, jb = -1;
      const fhc = FHc(x);
      for (let kk = 1; kk <= FH + 18; kk++) if (lv(x, y - kk) > L) { jb = kk - 1; break; }
      if (jb >= 0 && jb < fhc) j = jb;
      // which way it turns: lit when the high side lies to the right (facing the sun's side)
      const side = j >= 0 ? (lv(x + 12, y - j - 1) > L ? 1 : 0) - (lv(x - 12, y - j - 1) > L ? 1 : 0) : 0;
      if (j >= 0) {
        if (KEEP[i]) { // the road through the ramp: a little darker down the slope
          const kd = st ? 0.92 : 0.96; set(i, [orig[i * 4] * kd, orig[i * 4 + 1] * kd, orig[i * 4 + 2] * (kd + 0.02)]); KEEP[i] = 0; continue;
        }
        if (near(x, y) && !st) { if (B.roadD[i] < RH + 4) { const c0 = get(i); set(i, mul(c0, 0.9)); } continue; }
        if (near(x, y)) { // retaining stones in the cutting beside the road
          const bx = Math.floor((x + (Math.floor(j / 4) & 1) * 3) / 6), by = Math.floor(j / 4);
          const mx = (x + (Math.floor(j / 4) & 1) * 3) % 6 === 0 || j % 4 === 3;
          let c = mx ? STONE[3] : STONE[h32(bx, by, 601) < 0.5 ? 0 : 1];
          if (!mx && j % 4 === 0) c = STONE[2];
          if (j === 0) c = G(5, 2);
          set(i, c); continue;
        }
        const slump = vn(x / 16, 2, 619);
        const over = st ? 1 + Math.floor(h32(x, 7, 610) * 4) + (slump > 0.68 ? Math.floor((slump - 0.68) * 30) : 0) : fhc + 1;
        let c;
        if (j === 0) c = G(6, 2);
        else if (j < over) c = j === 1 ? G(5, 2) : G(3, 1);
        else if (!st) { // a grassed bank: combed down the slope, darker toward its foot
          const t = j / fhc, d = dith(x, y + j);
          c = d > 0.7 ? G(4, 1) : t > 0.7 ? G(1, 0) : d < 0.3 ? G(1, 0) : G(2, 0);
          if (h32(x, 1, 611) < 0.04 && !aut) c = hex("#f0ece0");
        }
        else {
          // earth: lighter under the turf, darker toward the damp foot; soft wavy strata, a pale sandy bed,
          // erosion streaks down the face, bedded stones and a few roots
          const t = (j - over) / Math.max(1, fhc - over);
          c = mix(EARTH[2], EARTH[3], Math.min(1, t * 1.15));
          const sj = j + 5 * (vn(x / 30, y / 50, 612) - 0.5) + 2 * (vn(x / 9, 3, 616) - 0.5);
          const sb = ((sj % 7) + 7) % 7;
          if (sb < 1.2) c = mul(c, 0.84); else if (sb > 4.8 && sb < 5.8 && vn(x / 40, 1, 617) > 0.45) c = mix(c, hex("#c8a874"), 0.45);
          c = mul(c, 0.94 + vn(x / 2.2, 5, 618) * 0.12);
          const cx = Math.floor((x + Math.floor(j / 5) * 3) / 8), cyy = Math.floor(j / 5), sx = (x + Math.floor(j / 5) * 3) % 8, sy = j % 5;
          if (h32(cx, cyy * 7 + Math.floor(y / 60), 613) < 0.22 && sx > 1 && sx < 7 && sy > 0 && j > over + 1 && j < fhc - 2) c = (sx === 2 && sy === 1) ? STONE[2] : (sx === 6 || sy === 4) ? STONE[3] : STONE[1];
          if (h32(x, 3, 614) < 0.06 && j < over + 3 + h32(x, 4, 615) * 6) c = hex("#4a3424"); // roots
        }
        c = mul(c, 0.94 + side * 0.07);
        if (j >= fhc - 1) c = mul(c, 0.7); // the foot's ink
        set(i, c); continue;
      }
      if (KEEP[i]) continue;
      // the shade band at the foot, and lusher, darker grass below it
      const below = jb >= fhc ? jb - fhc + 1 : -1;
      if (below > 0 && !near(x, y)) {
        const t = 1 - below / 18;
        if (below <= 5 || BAY[y & 3][x & 3] < t * 1.2) set(i, mix(get(i), mul(G(0, 0), 0.9), below <= 2 ? 0.7 : below <= 5 ? 0.55 : 0.38));
      }
      // the crest of a rise seen from behind (the high side to the south): a lit lip and a dark line
      if (lv(x, y + 1) > L || lv(x, y + 2) > L) { if (!near(x, y)) set(i, mix(get(i), G(0, 0), 0.5)); }
      else if (L > lv(x, y - 1) && !near(x, y)) set(i, G(5, 2));
      // the west side of a step running north-south: the sun from the upper left shades its east foot
      if (!near(x, y) && (lv(x - 2, y) > L || lv(x - 4, y) > L)) set(i, mix(get(i), G(0, 0), 0.4));
    }
    // golden hour: the terraces' long shadows
    if (DAY.len > 0) {
      const fx = DAY.fall[0], fy = DAY.fall[1], Lmax = Math.ceil(FH * 2 * DAY.len);
      for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
        const i = y * AW + x; if (KEEP[i]) continue;
        const hp = lv(x, y) * FH;
        for (let t = 2; t <= Lmax; t += 2) {
          const qx = Math.round(x - fx * t), qy = Math.round(y - fy * t);
          if (qx < 0 || qy < 0 || qx >= AW || qy >= AH) break;
          if (lv(qx, qy) * FH - hp > t / DAY.len) { SH[i] = Math.max(SH[i], 0.9); break; }
        }
      }
    }
    // a footpath over the step, with steps cut in the face
    for (const fp of o.paths || []) {
      for (let s = 0; s < fp.length - 1; s++) {
        const [ax, ay] = fp[s], [bx, by] = fp[s + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
        for (let q = 0; q <= n; q++) {
          const X = Math.round((ax + (bx - ax) * q / n) * 2), Y = Math.round((ay + (by - ay) * q / n) * 2);
          for (let dx = -3; dx <= 3; dx++) {
            const x = X + dx, y = Y, i = y * AW + x; if (x < 0 || x >= AW || KEEP[i]) continue;
            const L = lv(x, y); let j = -1;
            for (let kk = 1; kk <= FH; kk++) if (lv(x, y - kk) > L) { j = kk - 1; break; }
            if (j >= 0) { // the steps
              for (let yy = y - j; yy <= y - j + FH; yy++) { const ii = yy * AW + x; if (yy < 0 || yy >= AH || KEEP[ii]) continue; const jj = yy - (y - j); set(ii, Math.abs(dx) === 3 ? STONE[3] : jj % 4 === 0 ? STONE[2] : jj % 4 === 3 ? STONE[3] : STONE[1]); }
            } else if (Math.abs(dx) < 3 || BAY[y & 3][x & 3] < 0.5) set(i, Math.abs(dx) < 2 ? mix(hex("#b09a6a"), G(3, 1), 0.2) : mix(hex("#9a8a5a"), G(3, 1), 0.5));
          }
        }
      }
    }
  }

  // ================= THE WORKED COUNTRYSIDE =================
  if (look === "farm") farm(S, B, halls, feature, o, G, aut, set, get, KEEP, rnd, log);

  // ---- puddles on the lane: the sky in a dark wet ring of mud ----
  puddles(B, o, set, KEEP, orig, aut, look, log);

  // ---- shadows, then into the layer (golden: the game's own cast shadows carried over by ratio) ----
  const sc = DAY.shade || [42, 28, 44, 0.3], sa = Math.min(0.6, sc[3] * 1.35);
  const out = new ImageData(AW, AH), od = out.data;
  for (let i = 0; i < N; i++) {
    if (KEEP[i]) { const src = gold || orig; od[i * 4] = src[i * 4]; od[i * 4 + 1] = src[i * 4 + 1]; od[i * 4 + 2] = src[i * 4 + 2]; od[i * 4 + 3] = 255; continue; }
    let r = C[i * 3], gg = C[i * 3 + 1], b = C[i * 3 + 2];
    if (aut && !o.noAutumnTint) [r, gg, b] = autumnize([r, gg, b], 0.55);
    if (SH[i]) { const a = sa * SH[i]; r = r * (1 - a) + sc[0] * a; gg = gg * (1 - a) + sc[1] * a; b = b * (1 - a) + sc[2] * a; }
    if (gold) { // the bake's own cast shadows (trees, rocks, halls are not in it): golden / noon, where darker
      const rr = gold[i * 4] / Math.max(1, orig[i * 4]), rg = gold[i * 4 + 1] / Math.max(1, orig[i * 4 + 1]), rb = gold[i * 4 + 2] / Math.max(1, orig[i * 4 + 2]);
      const lum = (rr + rg + rb) / 3;
      if (lum < 0.95) { r *= clamp(rr, 0.3, 1); gg *= clamp(rg, 0.3, 1); b *= clamp(rb, 0.3, 1); }
    }
    od[i * 4] = r; od[i * 4 + 1] = gg; od[i * 4 + 2] = b; od[i * 4 + 3] = 255;
  }
  layer.getContext("2d").putImageData(out, 0, 0);
  return { ms: Math.round(performance.now() - T0), boardMs: Math.round(TB), log };
}

// ---- sheep: little flocks ----
function flock(S, B, halls, feature, take, nFlocks, per, R) {
  const spots = take(nFlocks, 16, 0);
  for (const [x0, y0] of spots) for (let s = 0; s < per; s++) sheep(S, (x0 + (R() - 0.5) * 40) * 2, (y0 + (R() - 0.5) * 22) * 2, R() < 0.5, feature);
}
export function sheep(S, X, Y, flip, feature) {
  X = Math.round(X); Y = Math.round(Y);
  if (!feature(X, Y) || !feature(X + 6, Y + 3)) return;
  const { C, SH } = S, W6 = AW;
  const put = (x, y, c) => { const i = (Y + y) * W6 + (X + (flip ? 6 - x : x)); C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2]; };
  for (let x = 1; x < 7; x++) SH[(Y + 4) * W6 + X + x] = 1, SH[(Y + 5) * W6 + X + x - 1] = 0.7;
  const L = hex("#fbf8ee"), M = hex("#e6e0cc"), D = hex("#b4ac98"), F = hex("#3a3230");
  for (let x = 1; x <= 5; x++) { put(x, 0, x < 4 ? L : M); put(x, 1, M); put(x, 2, D); }
  put(0, 1, M); put(6, 0, F); put(6, 1, F); put(7 - 0, 1, F);
  put(1, 3, F); put(4, 3, F);
}

// ---- the lane's puddles ----
function puddles(B, o, set, KEEP, orig, aut, look, log) {
  const n = o.puddles ?? (look === "meadow" ? [0, 2, 3, 4][o.k || 2] : 3);
  if (!n) return;
  const picks = [];
  const cands = [];
  for (let d = 90; d < TOTAL_LEN - 110; d += 12) {
    if (BRIDGES.some((b) => d > b.d0 - 50 && d < b.d1 + 50)) continue;
    const bend = Math.abs(((angleAt(d + 30) - angleAt(d - 30) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    cands.push([d, bend + h32(d, 1, (o.seed || 7) + 900) * 0.4]);
  }
  cands.sort((a, b) => b[1] - a[1]);
  for (const [d] of cands) { if (picks.length >= n) break; if (picks.some((p) => Math.abs(p - d) < TOTAL_LEN / (n + 1.5))) continue; picks.push(d); }
  const SKY = DAY.len > 0 ? [hex("#fff4d8"), hex("#f8dca8"), hex("#9a8494")] : [hex("#d6e8f2"), hex("#9cc0dc"), hex("#6a90b4")];
  picks.forEach((d, n2) => {
    const [cx, cy] = posAt(d), a = angleAt(d), side = h32(n2, 2, 901) < 0.5 ? -1 : 1, off = 4 + h32(n2, 3, 902) * 10;
    const X = (cx + Math.cos(a + Math.PI / 2) * off * side) * 2, Y = (cy + Math.sin(a + Math.PI / 2) * off * side) * 2;
    const RX = 32 + h32(n2, 4, 903) * 16, RY = RX * 0.4;
    for (let y = Math.floor(Y - RY * 2); y <= Y + RY * 2; y++) for (let x = Math.floor(X - RX * 1.6); x <= X + RX * 1.6; x++) {
      const i = y * AW + x; if (x < 0 || y < 0 || x >= AW || y >= AH) continue;
      if (B.roadD[i] > RH - 8) continue;
      const e = Math.hypot((x - X) / RX, (y - Y) / RY) + (fbm(x / 14, y / 9, 910 + n2) - 0.5) * 0.45;
      const road = [orig[i * 4], orig[i * 4 + 1], orig[i * 4 + 2]];
      if (e < 1) {
        // the water: the inside of the far bank in shade, then the sky, lighter toward the near rim, one glint
        const t = (y - (Y - RY)) / (2 * RY), rim = e > 0.86;
        let c = t < 0.25 && e > 0.55 ? SKY[2] : t > 0.55 ? SKY[0] : SKY[1];
        if (rim && t < 0.5) c = mix(SKY[2], [40, 34, 30], 0.4);
        if (Math.abs((x - X) * 0.35 - (y - Y) + RY * 0.1) < 0.6 && e < 0.7) c = hex("#f4f8fa");
        set(i, c); KEEP[i] = 0;
      } else if (e < 1.32) {
        // the ring of wet mud, darkest at the brim; a few splashed specks beyond
        set(i, mul(road, e < 1.12 ? 0.52 : 0.72)); KEEP[i] = 0;
      } else if (e < 1.7 && h32(x, y, 920) < 0.12 * (1.7 - e) * 3) { set(i, mul(road, 0.68)); KEEP[i] = 0; }
    }
  });
  log.push(`${picks.length} puddles`);
}

// ---- the worked countryside: fields on a skewed grid, low hedges, the work of each field ----
function fieldGrid(o) {
  const th = o.angle ?? 0.1, R = (() => { let s = (o.seed || 7) * 31 + 5; return () => (s = (Math.imul(s, 1664525) + 1013904223) | 0, (s >>> 0) / 4294967296); })();
  const cs = Math.cos(th), sn = Math.sin(th);
  // the hedgerows wander a little: old field edges follow the land, not a ruler
  const U = (x, y) => x * cs + y * sn + (vn(x / 70, y / 70, 1701) - 0.5) * 14, V = (x, y) => -x * sn + y * cs + (vn(x / 80, y / 60, 1702) - 0.5) * 12;
  const us = [-200]; while (us[us.length - 1] < 1000) us.push(us[us.length - 1] + 105 + R() * 85);
  const vs = us.map(() => { const a = [-300]; while (a[a.length - 1] < 800) a.push(a[a.length - 1] + 70 + R() * 60); return a; });
  return { U, V, us, vs, R };
}
const cellAt = (F, xu, yu) => {
  const u = F.U(xu, yu), v = F.V(xu, yu);
  let ci = 0; while (F.us[ci + 1] <= u) ci++;
  const vv = F.vs[ci]; let cj = 0; while (vv[cj + 1] <= v) cj++;
  return { ci, cj, du: Math.min(u - F.us[ci], F.us[ci + 1] - u), dv0: v - vv[cj], dv1: vv[cj + 1] - v, u, v };
};
const KIND = (F, ci, cj, o) => {
  for (const [kd, x, y] of o.fields || []) { const c = cellAt(F, x, y); if (c.ci === ci && c.cj === cj) return kd; }
  const r = h32(ci, cj, (o.seed || 7) + 1200);
  const w = o.v === "quiet" ? [["pasture", 0.42], ["hay", 0.22], ["meadow", 0.26], ["plough", 0.05], ["crop", 0.05]] : [["plough", 0.2], ["crop", 0.24], ["hay", 0.16], ["pasture", 0.2], ["meadow", 0.2]];
  let a = 0; for (const [k, p] of w) { a += p; if (r < a) return k; } return "pasture";
};
// the orchard's trees (the game's own tree painter, pushed into DECOR before the bake)
export function farmPlan(o, g) {
  const F = fieldGrid(o), halls = hallsOf(g), trees = [];
  const B = boardOf();
  for (let y = 16; y < H - 12; y += 19) for (let x = 16; x < W - WALL_W - 14; x += 22) {
    const xx = x + (Math.round(y / 19) & 1) * 11, c = cellAt(F, xx, y);
    if (KIND(F, c.ci, c.cj, o) !== "orchard" || c.du < 9 || c.dv0 < 9 || c.dv1 < 6) continue;
    if (!freeAt(B, halls, xx, y, 4)) continue;
    trees.push({ x: xx, y, t: "tree", s: 0.5 + h32(xx, y, 5) * 0.1 });
  }
  // hedgerow trees: a few oaks standing in the hedges
  const want = o.v === "quiet" ? 4 : 9;
  for (let t = 0, n = 0; t < 4000 && n < want; t++) {
    const x = 20 + h32(t, 1, 1750) * (W - WALL_W - 50), y = 16 + h32(t, 2, 1751) * (H - 30), c = cellAt(F, x, y);
    if (Math.min(c.du, c.dv0) > 1.2) continue;
    if (!freeAt(B, halls, x, y, 10)) continue;
    if (trees.some((q) => Math.hypot(q.x - x, q.y - y) < 60)) continue;
    trees.push({ x, y, t: "tree", s: 0.7 + h32(t, 3, 1752) * 0.15 }); n++;
  }
  return trees;
}

function farm(S, B, halls, feature, o, G, aut, set, get, KEEP, rnd, log) {
  const F = fieldGrid(o), quiet = o.v === "quiet";
  const WHEAT = (aut ? ["#a89050", "#c4ac68", "#d8c488", "#8a7444"] : ["#9c9048", "#b2a658", "#c8bc74", "#746a36"]).map(hex);
  const SOIL = ["#5e4836", "#76604c", "#8e7860", "#463628"].map(hex);
  const HEDGE = (aut ? ["#3e3a1e", "#5e5226", "#7e6430", "#a07838"] : ["#1e4022", "#28562a", "#367034", "#4e8c3c"]).map(hex);
  const HAY = ["#b4b06a", "#c6be7c", "#a4a462"].map(hex);
  const field = (x, y) => { const c = cellAt(F, x / 2, y / 2); return { ...c, kind: KIND(F, c.ci, c.cj, o) }; };
  // the cart track: from the road's edge straight out into a field, through a gate
  const TM = new Uint8Array(N);
  let trackEnd = null;
  if (o.trackAt) {
    const n = nearestOnPath(o.trackAt[0], o.trackAt[1]), rx = n.x, ry = n.y, a = Math.atan2(o.trackAt[1] - ry, o.trackAt[0] - rx);
    const L0 = PATH_HALF - 6, L1 = Math.hypot(o.trackAt[0] - rx, o.trackAt[1] - ry);
    for (let t = L0; t <= L1; t += 0.5) {
      const cx = rx + Math.cos(a) * t, cy = ry + Math.sin(a) * t, nx = -Math.sin(a), ny = Math.cos(a);
      for (let w = -5; w <= 5; w += 0.5) { const X = Math.round((cx + nx * w) * 2), Y = Math.round((cy + ny * w) * 2); if (X >= 0 && Y >= 0 && X < AW && Y < AH) TM[Y * AW + X] = Math.abs(w) > 1.8 && Math.abs(w) < 4.2 ? 2 : 1; }
      trackEnd = [cx, cy];
    }
  }
  const HM = new Uint8Array(N), crops = new Map();
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x;
    if (KEEP[i]) continue;
    if (TM[i]) { // two worn wheel tracks, grass down the middle
      const tm = TM[i] === 2;
      if (tm || B.roadD[i] < RH + 6) set(i, mix(hex("#a48a5c"), G(3, 1), tm ? 0.12 : 0.55)); else set(i, mix(G(3, 1), hex("#a48a5c"), 0.25));
      continue;
    }
    const f = field(x, y);
    const nearEdge = f.du < 1.6 || f.dv0 < 1.6;
    const hedgeOK = B.roadD[i] > RH + 26 && B.wD[i] > 30 && FD(B, x, y) < -22 && hallE(halls, x, y) > 1.3 && x < (W - WALL_W) * 2 - 40;
    const edgeHedge = (f.du < 1.6 ? h32(f.ci, 0, 1310) < (quiet ? 0.5 : 0.8) : h32(f.ci, f.cj, 1311) < (quiet ? 0.35 : 0.65));
    if (nearEdge && hedgeOK && edgeHedge) {
      // a gate where the track meets the hedge
      let gate = false;
      for (let r = -14; r <= 14 && !gate; r += 2) for (let s2 = -14; s2 <= 14; s2 += 2) if (TM[clamp(y + s2, 0, AH - 1) * AW + clamp(x + r, 0, AW - 1)]) { gate = true; break; }
      if (!gate) { HM[i] = 1; continue; }
      const along = Math.abs(TM[i] ? 0 : 1);
      set(i, (y & 1) === 0 && along ? hex("#a07c50") : get(i));
      continue;
    }
    if (!feature(x, y)) continue;
    const hd = Math.min(f.du, f.dv0, f.dv1); // headland: grass round every field
    if (hd < 4.5) continue;
    const ax = f.u * 2, av = f.v * 2;
    if (f.kind === "plough" || (aut && f.kind === "crop" && h32(f.ci, f.cj, 1320) < 0.5)) {
      const fu = ((Math.floor(av) % 5) + 5) % 5, c = fu === 0 ? SOIL[2] : fu === 1 ? SOIL[1] : fu === 4 ? SOIL[3] : SOIL[0];
      set(i, (hd < 7 && BAY[y & 3][x & 3] < 0.5) ? mix(c, G(2, 1), 0.5) : mul(c, 0.96 + vn(x / 40, y / 30, 1321) * 0.08));
    } else if (f.kind === "crop") {
      // stubble on the mown edge (the field's south side), the standing crop raised behind it
      if (aut || f.dv1 < 14) set(i, ((Math.floor(ax / 3) & 1) ? hex(aut ? "#c4b47e" : "#c0b272") : hex(aut ? "#a49660" : "#a49858")));
      else { const key = `${f.ci},${f.cj}`; if (!crops.has(key)) crops.set(key, new Uint8Array(N)); crops.get(key)[i] = 1; set(i, WHEAT[0]); }
    } else if (f.kind === "hay") {
      // mown in swathes; the windrows lie darker
      const sw = ((Math.floor(av / 8) % 2) + 2) % 2;
      set(i, aut ? (sw ? hex("#aca262") : hex("#989056")) : (sw ? HAY[0] : HAY[2]));
      if (((Math.floor(av) % 16) + 16) % 16 === 0 && !aut) set(i, hex("#9a9450"));
    } else if (f.kind === "pasture") {
      if (h32(x >> 2, y >> 1, 1330) < 0.04) set(i, G(1, 0)); // tussocks
      const tr = Math.sin((ax * 0.8 + av * 0.25) / 46 + f.ci * 1.7) * 26 - (((av % 70) + 70) % 70 - 35);
      if (Math.abs(tr) < 1 && h32(x, y, 1331) < 0.7) set(i, mix(get(i), hex("#b4ac78"), 0.4)); // sheep tracks
    } else if (f.kind === "orchard") {
      if (h32(x, y, 1340) < 0.03) set(i, G(5, 2));
    }
  }
  // the hedges: low and leafy (5 px), a lit top, never touching the road
  raised(S, HM, [0, 0, AW - 1, AH - 1], 5, {
    seed: 1400, jag: 1, tipP: 0.14, shadow: 1, minLen: 0.7,
    top: (x, y, rim, lip) => { const n = vn(x / 3, y / 3, 1401); return rim && n > 0.4 ? HEDGE[3] : n > 0.6 ? HEDGE[3] : n > 0.38 ? HEDGE[2] : HEDGE[1]; },
    face: (x, y, j) => (j === 0 ? mul(HEDGE[0], 0.8) : vn(x / 2.5, y / 2, 1402) > 0.55 ? HEDGE[1] : HEDGE[0]),
    tip: () => HEDGE[2],
  });
  for (let i = 0; i < N; i++) if (HM[i] && h32(i, 0, 1403) < 0.01) { const ii = i - 3 * AW; if (ii > 0) set(ii, aut ? hex("#c83a2a") : hex("#f0ece0")); }
  // the standing crop: 4 px of wheat, its front face where it meets the stubble
  let ci = 0;
  for (const [, M] of crops) {
    raised(S, M, [0, 0, AW - 1, AH - 1], 4, {
      seed: 1500 + ci++, jag: 0.5, tipP: 0.3, shadow: 0.7,
      top: (x, y, rim) => {
        if (rim) return WHEAT[2];
        const d = dith(x, y), wave = vn(x / 90 + y / 140, y / 50, 1501);
        return d > 0.8 ? WHEAT[2] : d < 0.2 ? WHEAT[0] : wave > 0.62 ? mix(WHEAT[1], WHEAT[2], 0.5) : WHEAT[1];
      },
      face: (x, y, j) => (j === 0 ? WHEAT[3] : (x & 1) ? WHEAT[0] : mix(WHEAT[0], WHEAT[3], 0.5)),
      tip: () => WHEAT[2],
    });
  }
  // stooks in rows on some hay fields, little flocks on the pasture, a scarecrow and his crows
  let stooks = 0, sheepN = 0, scare = 0;
  const flockDone = new Set(), stookField = (f) => h32(f.ci, f.cj, 1606) < (quiet ? 0.3 : 0.6);
  for (let y = 24; y < AH - 20; y += 26) for (let x = 20; x < AW - 20; x += 30) {
    const X = x + Math.round((h32(x, y, 1600) - 0.5) * 4), Y = y + Math.round((h32(x, y, 1601) - 0.5) * 3);
    const f = field(X, Y), hd = Math.min(f.du, f.dv0, f.dv1);
    if (hd < 10 || !feature(X, Y) || !feature(X + 6, Y + 6) || !feature(X - 4, Y - 8)) continue;
    if (f.kind === "hay" && stookField(f)) { stook(S, X, Y, set); stooks++; }
    const key = `${f.ci},${f.cj}`;
    if (f.kind === "pasture" && !flockDone.has(key)) {
      flockDone.add(key);
      const n = 3 + Math.floor(h32(X, Y, 1603) * 4);
      for (let s2 = 0; s2 < n; s2++) { const sx = X + Math.round((h32(s2, X, 1607) - 0.5) * 40), sy = Y + Math.round((h32(s2, Y, 1608) - 0.5) * 18); if (field(sx, sy).kind === "pasture") { sheep(S, sx, sy, h32(s2, 1, 1604) < 0.5, feature); sheepN++; } }
    }
    if (f.kind === "crop" && !aut && f.dv1 > 26 && !scare && hd > 22) { scarecrow(S, X, Y, set); scare++; }
  }
  if (trackEnd) cat(S, Math.round(trackEnd[0] * 2) + 14, Math.round(trackEnd[1] * 2) + 6, set, feature);
  log.push(`${crops.size} crops, ${stooks} stooks, ${sheepN} sheep, ${scare} scarecrow, track ${trackEnd ? trackEnd.map(Math.round) : '-'}`);
}
function cat(S, X, Y, set, feature) {
  if (!feature(X, Y)) return;
  const O = hex("#d08840"), D = hex("#9a5a28"), L = hex("#f0b870"), K = hex("#2a2020");
  const px = [[0, -4, O], [2, -4, O], [0, -3, O], [1, -3, L], [2, -3, O], [1, -2, K], [0, -2, O], [2, -2, O], [0, -1, O], [1, -1, O], [2, -1, D], [3, -1, D], [0, 0, D], [1, 0, O], [2, 0, D], [3, 0, D], [4, 0, O], [5, -1, O], [5, -2, D]];
  for (const [dx, dy, c] of px) set((Y + dy) * AW + X + dx, c);
  for (let x = 0; x < 6; x++) S.SH[(Y + 1) * AW + X + x] = 1;
}
function stook(S, X, Y, set) {
  const L = hex("#e4cc7c"), M = hex("#c4a858"), D = hex("#8c7440");
  for (let y = 0; y < 7; y++) { const w = Math.min(3, 1 + (y >> 1)); for (let x = -w; x <= w; x++) set((Y - 7 + y) * AW + X + x, x < 0 ? L : x === 0 ? M : D); }
  for (let x = 0; x < 6; x++) { S.SH[(Y + 1) * AW + X + x] = 1; S.SH[Y * AW + X + 3 + x] = 0.8; }
}
function scarecrow(S, X, Y, set) {
  const P = hex("#5a4028"), C = hex("#6a5a8a"), Hh = hex("#4a3a28"), F = hex("#d8c088"), K = hex("#1e1a20");
  for (let y = 0; y < 14; y++) set((Y - y) * AW + X, P);
  for (let x = -5; x <= 5; x++) set((Y - 9) * AW + X + x, x === -5 || x === 5 ? F : C);
  for (let y = 5; y < 9; y++) for (let x = -2; x <= 2; x++) set((Y - y) * AW + X + x, C);
  set((Y - 11) * AW + X, F); set((Y - 12) * AW + X, F); set((Y - 11) * AW + X + 1, F);
  for (let x = -2; x <= 2; x++) set((Y - 13) * AW + X + x, Hh); set((Y - 14) * AW + X, Hh);
  for (let x = 0; x < 9; x++) S.SH[(Y + 1) * AW + X + x] = 1;
  // crows: two on the arm, three about
  for (const [cx, cy] of [[-4, -10], [4, -10], [-12, -2], [10, 3], [16, -4]]) { set((Y + cy) * AW + X + cx, K); set((Y + cy) * AW + X + cx + 1, K); set((Y + cy - 1) * AW + X + cx + 1, K); }
}
