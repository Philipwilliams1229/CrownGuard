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
import { inRiver, PONDS, inSea, onSand, forestDepthAt, DECOR, BRIDGES, RIVERS, COAST } from "/src/data/terrain.js";
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
  const SC = look === "steps2" ? scarpField(o.scarps || [], B) : null;
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
  }[look === "steps2" ? "terrace" : look] || {};
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
    } else if (SC) {
      const lh = SC.LH[i] / 30;
      c = base(x, y, i, (lh - 0.35) * 0.14);
      if (lh > 0.6) c = mix(c, DRY, Math.min(0.16, (lh - 0.6) * 0.2)); else if (lh < 0.15) c = mix(c, DAMP, 0.08);
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

  if (SC) { paintSteps(SC, { C, SH, KEEP, set, get, G, orig, halls, aut, log, B }); log.push(...SC.log); }

  // ================= THE WORKED COUNTRYSIDE =================
  if (look === "farm") farm(S, B, halls, feature, o, G, aut, set, get, KEEP, rnd, log);

  // ---- puddles on the lane: the sky in a dark wet ring of mud ----
  puddles(B, SC ? { ...o, avoidD: SC.X.map((c) => c.d) } : o, set, KEEP, orig, aut, look, log);

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
// a sheep, 8 x 6 art px: a fleece you can see at board size (a pale dot with a dark face), its shadow
export function sheep(S, X, Y, flip, feature, set) {
  X = Math.round(X); Y = Math.round(Y);
  if (!feature(X, Y) || !feature(X + 10, Y + 2) || !feature(X, Y - 7) || !feature(X + 10, Y - 7)) return false;
  const { C, SH } = S;
  const put = (x, y, c) => { const i = (Y + y) * AW + (X + (flip ? 9 - x : x)); C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2]; };
  for (let x = 0; x < 11; x++) { SH[(Y + 1) * AW + X + x] = 1; SH[(Y + 2) * AW + X + x + 1] = 0.7; }
  const L = hex("#fffdf4"), M = hex("#ece6d2"), D = hex("#c0b8a2"), F = hex("#2e2828");
  for (let x = 1; x <= 7; x++) { put(x, -6, x > 1 && x < 7 ? L : M); put(x, -5, L); put(x, -4, x < 6 ? L : M); put(x, -3, M); put(x, -2, D); }
  put(0, -5, M); put(0, -4, M); put(0, -3, D); put(8, -6, F); put(8, -5, F); put(9, -5, F); put(8, -4, F); put(7, -7, F);
  put(1, -1, F); put(2, -1, F); put(6, -1, F); put(7, -1, F); put(1, 0, F); put(6, 0, F);
  return true;
}

// ---- the lane's puddles ----
function puddles(B, o, set, KEEP, orig, aut, look, log) {
  const n = o.puddles ?? (look === "meadow" ? [0, 2, 3, 4][o.k || 2] : 3);
  if (!n) return;
  const picks = [];
  const cands = [];
  for (let d = 90; d < TOTAL_LEN - 110; d += 12) {
    if (BRIDGES.some((b) => d > b.d0 - 50 && d < b.d1 + 50)) continue;
    if ((o.avoidD || []).some((c) => Math.abs(d - c) < 80)) continue; // never on a step's ramp or cutting
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

// ---- the worked countryside: a field layout GENERATED per board (round 3) ----
// recipeOf(o): the board's character from its own shape (a pond -> orchards and closes; two rivers or more
// -> arable strips round the mill; a coast -> pasture and hay; otherwise -> ridge-and-furrow downs with a
// common), then every number of it (grid angle, field sizes, how the hedges bend, the crop mix, where the
// orchard sits, hedge density, hedgerow trees) drawn from the seed. o.char forces a character.
const CHARS = {
  arable: { u: [150, 230], v: [44, 66], wander: 8, bend: 18, jit: 0.1, hedge: 0.42, merge: 0.12, trees: 3,
    mix: [["plough", 0.26], ["crop", 0.26], ["stubble", 0.2], ["hay", 0.12], ["pasture", 0.08], ["meadow", 0.08]], orchard: [1, "water"] },
  pastoral: { u: [80, 125], v: [62, 110], wander: 22, bend: 46, jit: 0.28, hedge: 0.88, merge: 0.12, trees: 10,
    mix: [["pasture", 0.52], ["hay", 0.3], ["meadow", 0.18]], orchard: [1, "castle"], oneWheat: true },
  orchard: { u: [70, 100], v: [50, 74], wander: 14, bend: 26, jit: 0.2, hedge: 0.8, merge: 0.08, trees: 6,
    mix: [["pasture", 0.3], ["hay", 0.18], ["meadow", 0.14], ["crop", 0.18], ["plough", 0.2]], orchard: [3, "pond"], hops: 1, veg: 2 },
  downfarm: { u: [120, 180], v: [88, 140], wander: 28, bend: 60, jit: 0.32, hedge: 0.62, merge: 0.22, trees: 12,
    mix: [["ridge", 0.4], ["pasture", 0.26], ["hay", 0.16], ["meadow", 0.1], ["crop", 0.08]], orchard: [1, "wood"], common: 1 },
};
const rngOf = (seed) => { let s = (seed * 2654435761) | 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) | 0, (s >>> 0) / 4294967296); };
export function recipeOf(o) {
  const ch = o.char || (PONDS.length ? "orchard" : RIVERS.length >= 2 ? "arable" : COAST ? "pastoral" : "downfarm");
  const C0 = CHARS[ch], R = rngOf(o.seed || 7);
  // the road's main heading, folded into a quarter turn: the fields mostly square to the road
  const hist = new Array(18).fill(0);
  for (let d = 0; d < TOTAL_LEN; d += 4) { let a = angleAt(d) % (Math.PI / 2); if (a < 0) a += Math.PI / 2; hist[Math.floor(a / (Math.PI / 36)) % 18]++; }
  let best = 0; for (let k = 1; k < 18; k++) if (hist[k] > hist[best]) best = k;
  let dom = (best + 0.5) * Math.PI / 36; if (dom > Math.PI / 4) dom -= Math.PI / 2;
  const span = (r) => r[0] + R() * (r[1] - r[0]);
  return { ch, angle: dom * 0.6 + (R() - 0.5) * 2 * C0.jit, u: [C0.u[0] * (0.85 + R() * 0.3), C0.u[1] * (0.85 + R() * 0.3)], v: [C0.v[0] * (0.85 + R() * 0.3), C0.v[1] * (0.85 + R() * 0.3)],
    wander: C0.wander * (0.7 + R() * 0.6), bend: C0.bend * (0.6 + R() * 0.8), hedge: Math.min(0.95, C0.hedge * (0.85 + R() * 0.3)), merge: C0.merge, trees: Math.round(C0.trees * (0.7 + R() * 0.6)),
    mix: C0.mix, orchard: C0.orchard, hops: C0.hops || 0, veg: C0.veg || 0, common: C0.common || 0, oneWheat: !!C0.oneWheat, slopeK: span([0.04, 0.2]) };
}
function fieldGrid(o, rec) {
  const seed = o.seed || 7, R = rngOf(seed * 31 + 5), th = rec.angle, cs = Math.cos(th), sn = Math.sin(th);
  const U = (x, y) => x * cs + y * sn + (vn(x / 70, y / 70, seed + 1701) - 0.5) * rec.wander + (fbm(x / 260, y / 260, seed + 1705) - 0.5) * rec.bend;
  const V = (x, y) => -x * sn + y * cs + (vn(x / 80, y / 60, seed + 1702) - 0.5) * rec.wander * 0.8;
  const us = [-300]; while (us[us.length - 1] < 1100) us.push(us[us.length - 1] + rec.u[0] + R() * (rec.u[1] - rec.u[0]));
  const vs = us.map(() => { const a = [-400]; while (a[a.length - 1] < 900) a.push(a[a.length - 1] + rec.v[0] + R() * (rec.v[1] - rec.v[0])); return a; });
  const slope = us.map(() => (R() - 0.5) * 2 * rec.slopeK);
  return { U, V, us, vs, slope, R };
}
const cellAt = (F, xu, yu) => {
  const u = F.U(xu, yu); let ci = 0; while (F.us[ci + 1] <= u) ci++;
  const v = F.V(xu, yu) - F.slope[ci] * (u - (F.us[ci] + F.us[ci + 1]) / 2);
  const vv = F.vs[ci]; let cj = 0; while (vv[cj + 1] <= v) cj++;
  return { ci, cj, du: Math.min(u - F.us[ci], F.us[ci + 1] - u), dv0: v - vv[cj], dv1: vv[cj + 1] - v, u, v };
};
// the layout: which field is what, decided once from the board's masks (road, water, wood), never the decor
const LAYOUTS = new Map();
function layoutOf(o, B) {
  const rec = recipeOf(o), key = `${o.seed}|${rec.ch}|${TOTAL_LEN.toFixed(1)}|${JSON.stringify(o.fields || [])}`;
  if (LAYOUTS.has(key)) return LAYOUTS.get(key);
  const F = fieldGrid(o, rec), cells = new Map();
  const gx = (W - WALL_W) - 20;
  for (let y = 12; y < H - 8; y += 5) for (let x = 12; x < gx; x += 5) {
    const i = Math.round(y * 2) * AW + Math.round(x * 2);
    if (B.roadD[i] < RH + 20 || B.wD[i] < 24 || FD(B, x * 2, y * 2) > -24) continue;
    const c = cellAt(F, x, y), k = `${c.ci},${c.cj}`;
    let s = cells.get(k); if (!s) cells.set(k, (s = { ci: c.ci, cj: c.cj, n: 0, sx: 0, sy: 0, water: 1e9, castle: 1e9, wood: 1e9, road: 1e9 }));
    s.n++; s.sx += x; s.sy += y; s.water = Math.min(s.water, B.wD[i] / 2); s.castle = Math.min(s.castle, gx - x); s.wood = Math.min(s.wood, -FD(B, x * 2, y * 2)); s.road = Math.min(s.road, B.roadD[i] / 2);
  }
  const list = [...cells.values()].filter((s) => s.n >= 14).map((s) => { const cx = s.sx / s.n, cy = s.sy / s.n, ci = Math.round(cy * 2) * AW + Math.round(cx * 2); return { ...s, cx, cy, cRoad: B.roadD[ci] / 2, cWater: B.wD[ci] / 2, cWood: -FD(B, cx * 2, cy * 2) }; });
  const kinds = new Map(), R = rngOf((o.seed || 7) * 7 + 3);
  const pick = (n, kind, score, minN = 30) => {
    const free = list.filter((s) => !kinds.has(`${s.ci},${s.cj}`) && s.n >= minN).sort((a, b) => score(a) - score(b));
    for (const s of free.slice(0, n)) kinds.set(`${s.ci},${s.cj}`, kind);
  };
  const near = { water: (s) => s.water, castle: (s) => s.castle, wood: (s) => s.wood, road: (s) => s.road, pond: (s) => (PONDS.length ? Math.min(...PONDS.map((p) => Math.hypot(p.x - s.cx, p.y - s.cy))) : s.road) };
  // where the orchard sits: by the water, the castle, the wood or the pond, as the recipe says (a little dice)
  pick(rec.orchard[0], "orchard", (s) => near[rec.orchard[1]](s) + R() * 40, 40);
  if (rec.hops) pick(rec.hops, "hops", (s) => s.road + R() * 60, 40);
  if (rec.veg) pick(rec.veg, "veg", (s) => s.n * 0.5 + s.castle * 0.3 + R() * 30, 60);
  if (rec.common) pick(rec.common, "common", (s) => -Math.min(s.n, 400) + Math.abs(s.cx - 360) * 0.4 + (s.cy < 90 || s.cy > H - 90 || s.cWood < 50 || s.cRoad < 70 || s.cWater < 50 ? 1e4 : 0) + R() * 40, 120);
  for (const s of list) {
    const k = `${s.ci},${s.cj}`; if (kinds.has(k)) continue;
    const r = h32(s.ci, s.cj, (o.seed || 7) + 1200); let a = 0, kd = "pasture";
    for (const [kk, p] of rec.mix) { a += p; if (r < a) { kd = kk; break; } }
    kinds.set(k, kd);
  }
  if (rec.oneWheat) { // pasture country: one wheat field, the biggest open one
    for (const [k, v] of kinds) if (v === "crop") kinds.set(k, "hay");
    const big = list.filter((s) => ["pasture", "hay", "meadow"].includes(kinds.get(`${s.ci},${s.cj}`))).sort((a, b) => b.n - a.n)[0];
    if (big) kinds.set(`${big.ci},${big.cj}`, "crop");
  }
  // some neighbours were never hedged apart: one field across two cells
  const open = new Set();
  for (const s of list) if (h32(s.ci, s.cj, (o.seed || 7) + 1290) < rec.merge && cells.get(`${s.ci},${s.cj - 1}`)) {
    const up = kinds.get(`${s.ci},${s.cj - 1}`), me = kinds.get(`${s.ci},${s.cj}`);
    if (!["orchard", "common", "hops"].includes(up) && !["orchard", "common", "hops"].includes(me)) { kinds.set(`${s.ci},${s.cj}`, up); open.add(`${s.ci},${s.cj}`); }
  }
  for (const [kd, x, y] of o.fields || []) { const c = cellAt(F, x, y); kinds.set(`${c.ci},${c.cj}`, kd); }
  const L = { rec, F, kinds, open, list };
  LAYOUTS.set(key, L);
  return L;
}
const kindOf = (L, ci, cj) => L.kinds.get(`${ci},${cj}`) || "meadow";
// the orchard's trees and the hedgerow oaks (the game's own tree painter, pushed into DECOR before the bake)
export function farmPlan(o, g) {
  const B = boardOf(), L = layoutOf(o, B), F = L.F, halls = hallsOf(g), trees = [];
  const row = 15 + h32(o.seed || 7, 1, 1745) * 6, col = 18 + h32(o.seed || 7, 2, 1746) * 7;
  for (let y = 16; y < H - 12; y += row) for (let x = 16; x < W - WALL_W - 14; x += col) {
    const xx = x + (Math.round(y / row) & 1) * col * 0.5, c = cellAt(F, xx, y);
    if (kindOf(L, c.ci, c.cj) !== "orchard" || c.du < 9 || c.dv0 < 9 || c.dv1 < 6) continue;
    if (!freeAt(B, halls, xx, y, 4)) continue;
    trees.push({ x: xx, y, t: "tree", s: 0.5 + h32(xx, y, 5) * 0.1 });
  }
  for (let t = 0, n = 0; t < 6000 && n < L.rec.trees; t++) {
    const x = 20 + h32(t, 1, (o.seed || 7) + 1750) * (W - WALL_W - 50), y = 16 + h32(t, 2, 1751) * (H - 30), c = cellAt(F, x, y);
    if (Math.min(c.du, c.dv0) > 1.2) continue;
    if (!freeAt(B, halls, x, y, 10)) continue;
    if (trees.some((q) => Math.hypot(q.x - x, q.y - y) < 50)) continue;
    trees.push({ x, y, t: "tree", s: 0.68 + h32(t, 3, 1752) * 0.2 }); n++;
  }
  return trees;
}

function farm(S, B, halls, feature, o, G, aut, set, get, KEEP, rnd, log) {
  const L = layoutOf(o, B), F = L.F, rec = L.rec;
  const WHEAT = (aut ? ["#a89050", "#c4ac68", "#d8c488", "#8a7444"] : ["#9c9048", "#b2a658", "#c8bc74", "#746a36"]).map(hex);
  const SOIL = ["#4a3628", "#614a38", "#7a6450", "#33261c"].map(hex);
  const HEDGE = (aut ? ["#3e3a1e", "#5e5226", "#7e6430", "#a07838"] : ["#1e4022", "#28562a", "#367034", "#4e8c3c"]).map(hex);
  const HAY = ["#b4b06a", "#c6be7c", "#a4a462"].map(hex);
  const field = (x, y) => { const c = cellAt(F, x / 2, y / 2); return { ...c, kind: kindOf(L, c.ci, c.cj) }; };
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
  const HM = new Uint8Array(N), crops = new Map(), HOPS = new Uint8Array(N), GORSE = new Uint8Array(N), counts = {};
  // the common's pond: painted here (the engine would add it to PONDS)
  const commons = L.list.filter((s) => kindOf(L, s.ci, s.cj) === "common").map((s) => ({ x: s.cx * 2, y: s.cy * 2, rx: 30 + h32(s.ci, s.cj, 1800) * 14, ry: 14 + h32(s.ci, s.cj, 1801) * 6 }));
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x;
    if (KEEP[i]) continue;
    if (TM[i]) { const tm = TM[i] === 2; if (tm || B.roadD[i] < RH + 6) set(i, mix(hex("#a48a5c"), G(3, 1), tm ? 0.12 : 0.55)); else set(i, mix(G(3, 1), hex("#a48a5c"), 0.25)); continue; }
    const f = field(x, y);
    const nearEdge = f.du < 1.6 || (f.dv0 < 1.6 && !L.open.has(`${f.ci},${f.cj}`));
    const hedgeOK = B.roadD[i] > RH + 26 && B.wD[i] > 30 && FD(B, x, y) < -22 && hallE(halls, x, y) > 1.3 && x < (W - WALL_W) * 2 - 40;
    const edgeHedge = f.du < 1.6 ? h32(f.ci, f.cj >> 1, (o.seed || 7) + 1310) < rec.hedge : h32(f.ci, f.cj, (o.seed || 7) + 1311) < rec.hedge * 0.85;
    if (nearEdge && hedgeOK && edgeHedge) {
      let gate = false;
      for (let r = -14; r <= 14 && !gate; r += 2) for (let s2 = -14; s2 <= 14; s2 += 2) if (TM[clamp(y + s2, 0, AH - 1) * AW + clamp(x + r, 0, AW - 1)]) { gate = true; break; }
      if (!gate) { HM[i] = 1; continue; }
      continue;
    }
    if (!feature(x, y)) continue;
    const hd = Math.min(f.du, f.dv0 + (L.open.has(`${f.ci},${f.cj}`) ? 99 : 0), f.dv1); // headland: grass round every field
    if (hd < 4.5) continue;
    counts[f.kind] = (counts[f.kind] || 0) + 1;
    const ax = f.u * 2, av = f.v * 2;
    if (f.kind === "plough" || (aut && f.kind === "crop" && h32(f.ci, f.cj, 1320) < 0.5)) {
      // deep furrows: a lit ridge, its body, the shaded furrow (darker than the road at any hour)
      const fu = ((Math.floor(av) % 5) + 5) % 5, c = fu === 0 ? SOIL[2] : fu === 1 ? SOIL[1] : fu >= 3 ? SOIL[3] : SOIL[0];
      set(i, (hd < 7 && BAY[y & 3][x & 3] < 0.5) ? mix(c, G(2, 1), 0.5) : mul(c, 0.94 + vn(x / 40, y / 30, 1321) * 0.1));
    } else if (f.kind === "stubble") {
      const r = ((Math.floor(av / 2) % 2) + 2) % 2;
      let c = r ? hex(aut ? "#b8a46c" : "#c2b276") : hex(aut ? "#9e8c58" : "#a89a62");
      if (h32(x, y, 1325) < 0.09) c = hex("#7e6e40");
      if ((((Math.floor(ax) % 23) + 23) % 23) < 1 && h32(f.ci, f.cj, 1326) < 0.6) c = mix(c, G(2, 1), 0.5); // the drill's wheel lines
      set(i, c);
    } else if (f.kind === "crop") {
      if (aut || f.dv1 < 14) set(i, ((Math.floor(ax / 3) & 1) ? hex(aut ? "#c4b47e" : "#c0b272") : hex(aut ? "#a49660" : "#a49858")));
      else { const key = `${f.ci},${f.cj}`; if (!crops.has(key)) crops.set(key, new Uint8Array(N)); crops.get(key)[i] = 1; set(i, WHEAT[0]); }
    } else if (f.kind === "hay") {
      const sw = ((Math.floor(av / 8) % 2) + 2) % 2;
      set(i, aut ? (sw ? hex("#aca262") : hex("#989056")) : (sw ? HAY[0] : HAY[2]));
      if (((Math.floor(av) % 16) + 16) % 16 === 0 && !aut) set(i, hex("#9a9450"));
    } else if (f.kind === "pasture") {
      // each pasture its own green: grazed short and pale, or lush and dark, so the closes read as a patchwork
      const tv = h32(f.ci, f.cj, (o.seed || 7) + 1329);
      if (tv < 0.34) set(i, mix(get(i), mix(G(4, 2), hex("#c8c07a"), 0.35), 0.62)); else if (tv > 0.67) set(i, mix(get(i), G(1, 0), 0.55));
      if (h32(x >> 2, y >> 1, 1330) < 0.04) set(i, G(1, 0));
      const tr = Math.sin((ax * 0.8 + av * 0.25) / 46 + f.ci * 1.7) * 26 - (((av % 70) + 70) % 70 - 35);
      if (Math.abs(tr) < 1 && h32(x, y, 1331) < 0.7) set(i, mix(get(i), hex("#b4ac78"), 0.4));
    } else if (f.kind === "ridge") {
      // ridge and furrow: broad curving ridges (the old plough's reversed S), lit on the sun's side
      const ph = (av + Math.sin(ax / 90 + f.cj) * 10) / 18, fr = ((ph % 1) + 1) % 1;
      set(i, mix(get(i), fr < 0.3 ? G(5, 2) : fr < 0.55 ? G(3, 1) : fr < 0.8 ? G(2, 0) : G(1, 0), 0.6));
      if (h32(x >> 2, y >> 1, 1335) < 0.03) set(i, G(1, 0));
    } else if (f.kind === "hops") {
      // a hop yard: rows of bines up their poles (raised below), bare earth between
      const rw = ((Math.floor(ax) % 11) + 11) % 11;
      if (rw < 3 && hd > 7) HOPS[i] = 1; else set(i, mix(SOIL[1], G(2, 1), 0.35));
    } else if (f.kind === "veg") {
      // vegetable plots: narrow beds of different greens, earth paths between
      const bd = ((Math.floor(av) % 30) + 30) % 30, bed = Math.floor(av / 30) + f.ci;
      if (bd < 2) set(i, mix(SOIL[2], G(3, 1), 0.3));
      else { const t = ((bed % 4) + 4) % 4, dot = (x + (y >> 1)) % 3 === 0 && (y & 1);
        set(i, t === 0 ? (dot ? hex("#7aa4a0") : hex("#4e7470")) : t === 1 ? ((x & 1) ? hex("#2e5a2c") : SOIL[1]) : t === 2 ? (dot ? hex("#b8d47c") : hex("#6e9a46")) : (((x >> 1) & 1) ? hex("#8a5a3c") : SOIL[0])); }
    } else if (f.kind === "meadow" && h32(f.ci, f.cj, (o.seed || 7) + 1336) < 0.5) {
      set(i, mix(get(i), G(2, 0), 0.3)); if (h32(x >> 1, y >> 1, 1337) < 0.05) set(i, h32(x, y, 1338) < 0.5 ? hex("#f0ece0") : hex("#e8d040"));
    } else if (f.kind === "common") {
      // rough grass, tussocks and gorse round a pond
      if (h32(x >> 1, y >> 1, 1340) < 0.06) set(i, G(1, 0)); else if (h32(x, y, 1341) < 0.04) set(i, G(5, 2));
      if (fbm(x / 22, y / 14, 1342) > 0.66 && h32(x >> 2, y >> 2, 1343) < 0.9) GORSE[i] = 1;
    } else if (f.kind === "orchard") {
      if (h32(x, y, 1344) < 0.03) set(i, G(5, 2));
    }
  }
  for (const p of commons) pond(S, p, set, get, G, KEEP, B, GORSE);
  if (commons.length) log.push(`common pond at ${commons.map((p) => Math.round(p.x / 2) + "," + Math.round(p.y / 2)).join(" ")}`);
  // the hedges: low and leafy (5 px), a lit top, never touching the road
  raised(S, HM, [0, 0, AW - 1, AH - 1], 5, {
    seed: 1400, jag: 1, tipP: 0.14, shadow: 1, minLen: 0.7,
    top: (x, y, rim) => { const n = vn(x / 3, y / 3, 1401); return rim && n > 0.4 ? HEDGE[3] : n > 0.6 ? HEDGE[3] : n > 0.38 ? HEDGE[2] : HEDGE[1]; },
    face: (x, y, j) => (j === 0 ? mul(HEDGE[0], 0.8) : vn(x / 2.5, y / 2, 1402) > 0.55 ? HEDGE[1] : HEDGE[0]),
    tip: () => HEDGE[2],
  });
  for (let i = 0; i < N; i++) if (HM[i] && h32(i, 0, 1403) < 0.01) { const ii = i - 3 * AW; if (ii > 0) set(ii, aut ? hex("#c83a2a") : hex("#f0ece0")); }
  if (HOPS.some((v) => v)) raised(S, HOPS, [0, 0, AW - 1, AH - 1], 9, {
    seed: 1450, jag: 1, tipP: 0.3, shadow: 1, minLen: 0.8,
    top: (x, y) => (h32(x, y, 1451) < 0.25 ? hex("#c4dc8a") : hex("#4c8a3a")),
    face: (x, y, j) => (j === 0 ? hex("#1e3a1c") : h32(x, y, 1452) < 0.2 ? hex("#b4d07c") : (x & 1) ? hex("#2e6428") : hex("#3e7a32")),
    tip: () => hex("#6a5230"),
  });
  if (GORSE.some((v) => v)) raised(S, GORSE, [0, 0, AW - 1, AH - 1], 4, {
    seed: 1460, jag: 1, tipP: 0.2, shadow: 1, minLen: 0.7,
    top: (x, y) => (h32(x, y, 1461) < (aut ? 0.05 : 0.22) ? hex("#f0cc3a") : vn(x / 3, y / 3, 1462) > 0.5 ? hex("#4a6a2a") : hex("#34502a")),
    face: (x, y, j) => (j === 0 ? hex("#1c2a16") : hex("#2a4020")),
    tip: () => hex("#4a6a2a"),
  });
  let ci = 0;
  for (const [, M] of crops) {
    raised(S, M, [0, 0, AW - 1, AH - 1], 4, {
      seed: 1500 + ci++, jag: 0.5, tipP: 0.3, shadow: 0.7,
      top: (x, y, rim) => { if (rim) return WHEAT[2]; const d = dith(x, y), wave = vn(x / 90 + y / 140, y / 50, 1501); return d > 0.8 ? WHEAT[2] : d < 0.2 ? WHEAT[0] : wave > 0.62 ? mix(WHEAT[1], WHEAT[2], 0.5) : WHEAT[1]; },
      face: (x, y, j) => (j === 0 ? WHEAT[3] : (x & 1) ? WHEAT[0] : mix(WHEAT[0], WHEAT[3], 0.5)),
      tip: () => WHEAT[2],
    });
  }
  // stooks in rows on some hay fields, flocks on the pasture and the ridges, a scarecrow and his crows
  let stooks = 0, sheepN = 0, scare = 0, flocks = 0;
  const flockDone = new Set(), stookField = (f) => h32(f.ci, f.cj, 1606) < (rec.ch === "arable" ? 0.6 : 0.3);
  const flockP = { pastoral: 0.6, downfarm: 0.6, orchard: 0.5, arable: 0.5 }[rec.ch];
  for (let y = 24; y < AH - 20; y += 26) for (let x = 20; x < AW - 20; x += 30) {
    const X = x + Math.round((h32(x, y, 1600) - 0.5) * 4), Y = y + Math.round((h32(x, y, 1601) - 0.5) * 3);
    const f = field(X, Y), hd = Math.min(f.du, f.dv0, f.dv1);
    if (hd < 10 || !feature(X, Y) || !feature(X + 6, Y + 6) || !feature(X - 4, Y - 8)) continue;
    if (f.kind === "hay" && stookField(f)) { stook(S, X, Y, set); stooks++; }
    const key = `${f.ci},${f.cj}`;
    if ((f.kind === "pasture" || f.kind === "ridge" || f.kind === "common") && !flockDone.has(key) && hd > 18) {
      flockDone.add(key);
      if (h32(f.ci, f.cj, 1609) > flockP) continue;
      // a flock: a dozen or so, bunched as sheep graze, one or two strays
      const n = 8 + Math.floor(h32(X, Y, 1603) * 7); flocks++;
      for (let s2 = 0; s2 < n; s2++) {
        const r = s2 < n - 2 ? 1 : 2.2, ang = h32(s2, X, 1607) * 6.28, rr = Math.sqrt(h32(s2, Y, 1608)) * 17 * r;
        const sx = Math.round(X + Math.cos(ang) * rr * 1.6), sy = Math.round(Y + Math.sin(ang) * rr * 0.75);
        if (field(sx, sy).kind === f.kind && sheep(S, sx, sy, h32(s2, 1, 1604) < 0.5, feature, set)) sheepN++;
      }
    }
    if (f.kind === "crop" && !aut && f.dv1 > 26 && !scare && hd > 22) { scarecrow(S, X, Y, set); scare++; }
  }
  if (trackEnd) cat(S, Math.round(trackEnd[0] * 2) + 14, Math.round(trackEnd[1] * 2) + 6, set, feature);
  const tot = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  log.push(`${rec.ch} (angle ${(rec.angle * 57.3).toFixed(0)}deg, fields ${Math.round(rec.u[0])}-${Math.round(rec.u[1])} x ${Math.round(rec.v[0])}-${Math.round(rec.v[1])}, hedges ${rec.hedge.toFixed(2)}) ` + Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v * 100 / tot)}%`).join(" ") + `; ${stooks} stooks, ${flocks} flocks / ${sheepN} sheep, ${scare} scarecrow`);
}
// a pond on the common: the sky in it, a dark rim of wet mud, rushes
function pond(S, p, set, get, G, KEEP, B, GORSE) {
  const SKY = DAY.len > 0 ? [hex("#f4dcb0"), hex("#c8a890"), hex("#6a5c6c")] : [hex("#b8d8e6"), hex("#7aa8c8"), hex("#4a7090")];
  for (let y = Math.floor(p.y - p.ry * 1.6); y <= p.y + p.ry * 1.6; y++) for (let x = Math.floor(p.x - p.rx * 1.5); x <= p.x + p.rx * 1.5; x++) {
    if (x < 0 || y < 0 || x >= AW || y >= AH) continue;
    const i = y * AW + x; if (KEEP[i]) continue;
    const e = Math.hypot((x - p.x) / p.rx, (y - p.y) / p.ry) + (fbm(x / 16, y / 10, 1810) - 0.5) * 0.35;
    if (e < 1.5) GORSE[i] = 0;
    if (e < 0.86) { const t = (y - (p.y - p.ry)) / (2 * p.ry); set(i, t < 0.22 ? SKY[2] : t > 0.6 ? SKY[0] : SKY[1]); if (e < 0.5 && Math.abs((x - p.x) * 0.3 - (y - p.y)) < 0.6) set(i, hex("#f4f8fa")); }
    else if (e < 1) set(i, e < 0.93 ? mix(SKY[2], hex("#2a2420"), 0.5) : hex("#4a3c2c"));
    else if (e < 1.22 && h32(x >> 1, y >> 1, 1811) < 0.3) { for (let j = 0; j < 5; j++) if (y - j >= 0) set(i - j * AW, j >= 3 ? hex("#8a8a48") : j >= 1 ? G(2, 0) : G(0, 0)); }
  }
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

// =====================================================================================================
// ROUND 3: STEPS THAT MEET THE ROAD (art/briefs/overhaul-round2.md, the owner's comments)
// A step is an authored SCARP: a polyline in board units, high side north ("ew", the face hangs below the
// line toward the viewer) or a north-south one ("ns", high side "e" or "w", seen side-on as a sliver).
// It tapers into the slope at both ends (its height eases to 0 over `taper` units and its line bends
// downhill), and where the road crosses it, it meets the road in one of two ways:
//   cross: "ramp"  the road climbs: two flanking wedges of bank, kerbed, taper to nothing down the road;
//                  the road's surface shades across the rise, tread lines closing up, a lit lip at the top
//   cross: "cut"   the road keeps its level and cuts through: timber-revetted banks either side rise from
//                  nothing to the step's height at the scarp and fall again into the high ground
// THE RULE (checked, and logged by scarpField): a scarp keeps STEP_RULE.gap units clear of every road edge
// except where it crosses; it crosses square-on (within `square` degrees) on a straight (within `straight`
// degrees over 40 units either side), and a road stretch (between two bends) is crossed at most once.
export const STEP_RULE = { gap: 24, square: 20, straight: 15 };
const sstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const RAMP_L = 56, CUT_L = 72; // art px: the ramp's run below the scarp, the cutting's run into the high ground

function prepScarp(sc, n) {
  const ew = sc.dir !== "ns", pts = sc.pts.map(([a, b]) => [a * 2, b * 2]);
  const A = pts.map((p) => (ew ? p[0] : p[1])), V = pts.map((p) => (ew ? p[1] : p[0]));
  const a0 = A[0], a1 = A[A.length - 1], h = sc.h || 30, T = (sc.taper || 32) * 2, seed = 700 + n * 13;
  const high = ew ? "n" : sc.high || "e";
  const lowSign = ew ? 1 : high === "e" ? -1 : 1; // the low side along v: south for ew, west when the high side is east
  const raw = (a) => { let k = 0; while (k < A.length - 2 && A[k + 1] < a) k++; const t = clamp((a - A[k]) / (A[k + 1] - A[k]), 0, 1); return V[k] + (V[k + 1] - V[k]) * t; };
  const S = { ew, a0, a1, h, T, seed, high, lowSign, raw, hold: [], id: n, cross: sc.cross || "ramp", name: sc.name || `S${n + 1}` };
  S.taper = (a) => sstep((a - a0) / T) * sstep((a1 - a) / T);
  S.holdK = (a) => { let k = 0; for (const c of S.hold) k = Math.max(k, 1 - clamp((Math.abs(a - c) - 70) / 70, 0, 1)); return k; };
  S.line = (a) => { const hk = S.holdK(a); return raw(a) + (1 - hk) * (vn(a / 46, 0.5, seed) - 0.5) * 9 + (1 - S.taper(a)) * 18 * lowSign; };
  S.hAt = (a) => { if (a <= a0 || a >= a1) return 0; const hk = S.holdK(a), nz = clamp(0.72 + 0.5 * vn(a / 90, 1.5, seed + 1), 0.6, 1.15); return h * (hk + (1 - hk) * nz) * S.taper(a); };
  return S;
}

// the road's stretches: a new stretch after every bend (heading turned 45 degrees since the stretch began)
function roadStretches() {
  const out = []; let id = 0, a0 = angleAt(0);
  for (let d = 0; d <= TOTAL_LEN; d += 2) {
    const a = angleAt(d), da = Math.abs(((a - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (da > Math.PI / 4) { id++; a0 = a; }
    out.push(id);
  }
  return (d) => out[clamp(Math.round(d / 2), 0, out.length - 1)];
}

export function scarpField(scarps, B) {
  const SS = scarps.map(prepScarp), log = [], X = [];
  const stretchOf = roadStretches(), perStretch = new Map();
  // the crossings: where the road's centre line passes the scarp's line
  for (const S of SS) {
    let prev = null;
    for (let d = 0; d <= TOTAL_LEN; d += 0.5) {
      const [x, y] = posAt(d), Xp = x * 2, Yp = y * 2, a = S.ew ? Xp : Yp;
      if (a <= S.a0 + S.T * 0.5 || a >= S.a1 - S.T * 0.5) { prev = null; continue; }
      const sg = Math.sign((S.ew ? Yp : Xp) - S.raw(a));
      if (prev != null && sg && sg !== prev) {
        const ang = angleAt(d), dx = Math.cos(ang), dy = Math.sin(ang);
        const square = Math.acos(Math.min(1, Math.abs(S.ew ? dy : dx))) * 180 / Math.PI;
        const bend = Math.abs(((angleAt(d + 40) - angleAt(d - 40) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 180 / Math.PI;
        const st = stretchOf(d); perStretch.set(st, (perStretch.get(st) || 0) + 1);
        const c = { S, d, X: Xp, Y: Yp, a, square, bend, stretch: st };
        X.push(c); S.hold.push(a);
        log.push(`${S.name} ${S.cross} crosses at (${Math.round(x)},${Math.round(y)}) ${square < STEP_RULE.square ? "square" : "GLANCING " + Math.round(square) + "deg"}${bend > STEP_RULE.straight ? " ON A BEND " + Math.round(bend) + "deg" : ""}`);
      }
      if (sg) prev = sg;
    }
  }
  for (const [st, n] of perStretch) if (n > 1) log.push(`RULE: road stretch ${st} crossed ${n} times`);
  // the gap rule: no scarp within `gap` units of a road edge, except at its crossings
  for (const S of SS) {
    let bad = 0;
    for (let a = S.a0; a <= S.a1; a += 4) {
      if (S.hAt(a) < 2) continue;
      const v = S.line(a), Xp = Math.round(S.ew ? a : v), Yp = Math.round(S.ew ? v : a);
      if (Xp < 0 || Yp < 0 || Xp >= AW || Yp >= AH) continue;
      if (X.some((c) => c.S === S && Math.abs(c.a - a) < RH + STEP_RULE.gap * 2 + 24)) continue;
      if (B.roadD[Yp * AW + Xp] - RH < STEP_RULE.gap * 2) bad++;
    }
    if (bad) log.push(`RULE: ${S.name} runs within ${STEP_RULE.gap} units of the road for ~${bad * 2} units`);
  }
  // the fields: height (for tone and the low sun's shadows), the faces, the shade at their feet
  const LH = new Float32Array(N), FJ = new Int16Array(N).fill(-1), FH = new Float32Array(N), FK = new Uint8Array(N), SB = new Float32Array(N);
  const fade = (dist) => 1 - clamp((dist - 60) / 300, 0, 0.7);
  for (const S of SS) {
    for (let a = Math.max(0, Math.floor(S.a0)); a <= Math.min((S.ew ? AW : AH) - 1, Math.ceil(S.a1)); a++) {
      const L = S.line(a), hx = S.hAt(a); if (hx <= 0.2) continue;
      const Li = Math.floor(L);
      if (S.ew) {
        for (let y = 0; y < Math.min(AH, Li); y++) LH[y * AW + a] += hx * fade(Li - y);
        const hh = Math.round(hx);
        for (let y = Li; y < Math.min(AH, Li + hh); y++) { const i = y * AW + a; if (FJ[i] < 0 || FH[i] < hh) { FJ[i] = y - Li; FH[i] = hh; FK[i] = 1; } }
        for (let y = Li + hh; y < Math.min(AH, Li + hh + 18); y++) { const i = y * AW + a; SB[i] = SB[i] ? Math.min(SB[i], y - Li - hh + 1) : y - Li - hh + 1; }
      } else {
        const ws = Math.max(1, Math.round(hx * 0.6)), y = a;
        if (S.high === "e") {
          for (let x = Li; x < AW; x++) LH[y * AW + x] += hx * fade(x - Li);
          for (let x = Li - ws; x < Li; x++) if (x >= 0) { const i = y * AW + x; FJ[i] = Li - 1 - x; FH[i] = ws; FK[i] = 2; }
        } else {
          for (let x = 0; x < Li; x++) LH[y * AW + x] += hx * fade(Li - x);
          for (let x = Li; x < Math.min(AW, Li + ws); x++) { const i = y * AW + x; FJ[i] = x - Li; FH[i] = ws; FK[i] = 3; }
          for (let x = Li + ws; x < Math.min(AW, Li + ws + 12); x++) { const i = y * AW + x; SB[i] = SB[i] ? Math.min(SB[i], x - Li - ws + 1) : x - Li - ws + 1; }
        }
      }
    }
  }
  // the box round each crossing, where the road's own verge gives way to the crossing's work
  const inBox = (x, y) => X.some((c) => Math.abs(x - c.X) < RH + 40 && Math.abs(y - c.Y) < RH + 40 + (c.S.ew ? RAMP_L + CUT_L : 0) && (c.S.ew || Math.abs(x - c.X) < RAMP_L + CUT_L + 20));
  return { SS, X, LH, FJ, FH, FK, SB, inBox, log };
}

// paint the faces, the shade at their feet, the lit lips, then each crossing; the low sun's shadows last
export function paintSteps(SC, ctx) {
  const { C, SH, KEEP, set, get, G, orig, halls, aut, log } = ctx;
  const { FJ, FH, FK, SB, LH } = SC;
  const EARTH = [hex("#86705a"), hex("#706048"), hex("#9c8462"), hex("#564636")].map((c) => (aut ? mix(c, hex("#8a5a34"), 0.2) : c));
  const STONE = [hex("#7c7a76"), hex("#a4a098"), hex("#ccc6b6"), hex("#4e4c4a")];
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const i = y * AW + x;
    if (KEEP[i]) continue;
    const j = FJ[i];
    if (j >= 0) {
      const hh = FH[i], kind = FK[i];
      let c;
      if (kind === 1) {
        const slump = vn(x / 16, 2, 619), over = 1 + Math.floor(h32(x, 7, 610) * 3) + (slump > 0.7 ? Math.floor((slump - 0.7) * 26) : 0);
        if (j === 0) c = G(6, 2);
        else if (j < over) c = j === 1 ? G(5, 2) : G(3, 1);
        else {
          const t = (j - over) / Math.max(1, hh - over);
          c = mix(EARTH[2], EARTH[3], Math.min(1, t * 1.15));
          const sj = j + 5 * (vn(x / 30, y / 50, 612) - 0.5) + 2 * (vn(x / 9, 3, 616) - 0.5), sb = ((sj % 7) + 7) % 7;
          if (sb < 1.2) c = mul(c, 0.84); else if (sb > 4.8 && sb < 5.8 && vn(x / 40, 1, 617) > 0.45) c = mix(c, hex("#c8a874"), 0.45);
          c = mul(c, 0.94 + vn(x / 2.2, 5, 618) * 0.12);
          const cx = Math.floor((x + Math.floor(j / 5) * 3) / 8), cyy = Math.floor(j / 5), sx = (x + Math.floor(j / 5) * 3) % 8, sy = j % 5;
          if (h32(cx, cyy * 7 + Math.floor(y / 60), 613) < 0.2 && sx > 1 && sx < 7 && sy > 0 && j > over + 1 && j < hh - 2) c = (sx === 2 && sy === 1) ? STONE[2] : (sx === 6 || sy === 4) ? STONE[3] : STONE[1];
          if (h32(x, 3, 614) < 0.06 && j < over + 3 + h32(x, 4, 615) * 6) c = hex("#4a3424");
        }
        if (j >= hh - 1 && hh > 3) c = mul(c, 0.7);
      } else {
        // a north-south step seen side-on: a sliver of turf lip and earth, lit when it faces west (the sun's side)
        const lit = kind === 2;
        if (j === 0) c = lit ? G(6, 2) : G(4, 1);
        else if (j === 1) c = lit ? G(4, 2) : G(2, 0);
        else { c = lit ? mix(EARTH[2], hex("#c8aa78"), 0.25) : mix(EARTH[1], EARTH[3], 0.5); c = mul(c, 0.92 + vn(x / 2, y / 7, 640) * 0.14); if (h32(x, y >> 2, 641) < 0.08) c = lit ? STONE[2] : STONE[3]; }
        if (j === hh - 1 && hh > 2) c = mul(c, lit ? 0.82 : 0.72);
      }
      set(i, c); continue;
    }
    if (SB[i]) { const b = SB[i], t = 1 - b / 18; if (b <= 4 || BAY[y & 3][x & 3] < t * 1.2) set(i, mix(get(i), mul(G(0, 0), 0.9), b <= 2 ? 0.65 : b <= 4 ? 0.5 : 0.34)); }
  }
  for (const c of SC.X) crossing(c, ctx, STONE);
  // halls must stand on one level, clear of a face and of a crossing's work
  for (const h of halls) {
    let bad = false;
    for (let y = Math.floor((h.cy - h.ry) * 2); y <= (h.cy + h.ry) * 2 && !bad; y++) for (let x = Math.floor((h.x - h.rx) * 2); x <= (h.x + h.rx) * 2; x++) { if (x < 0 || y < 0 || x >= AW || y >= AH) continue; if (Math.hypot((x / 2 - h.x) / h.rx, (y / 2 - h.cy) / h.ry) < 1 && FJ[y * AW + x] >= 0) { bad = true; break; } }
    if (bad) log.push(`RULE: the ${h.kind} hall at (${Math.round(h.x)},${Math.round(h.y)}) straddles a step (buildableAt would refuse it)`);
  }
  // golden hour: the steps' own long shadows, marched down-sun over the height field
  if (DAY.len > 0) {
    const fx = DAY.fall[0], fy = DAY.fall[1], Lmax = Math.ceil(70 * DAY.len);
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      const i = y * AW + x; if (KEEP[i] || FJ[i] >= 0) continue;
      const hp = LH[i];
      for (let t = 2; t <= Lmax; t += 2) {
        const qx = Math.round(x - fx * t), qy = Math.round(y - fy * t);
        if (qx < 0 || qy < 0 || qx >= AW || qy >= AH) break;
        if (LH[qy * AW + qx] - hp > 4 + t / DAY.len) { SH[i] = Math.max(SH[i], 0.85); break; }
      }
    }
  }
}

// one crossing: the ramp or the cutting, for a road running up the screen (an "ew" scarp) or across it ("ns")
function crossing(c, ctx, STONE) {
  const { S } = c, { set, get, KEEP, orig, G, SH, B } = ctx, h = S.h;
  const EARTH = [hex("#86705a"), hex("#706048"), hex("#9c8462"), hex("#564636")];
  const road = (i, k) => { set(i, [orig[i * 4] * k, orig[i * 4 + 1] * k, orig[i * 4 + 2] * k]); KEEP[i] = 0; };
  const put = (i, col) => { set(i, col); KEEP[i] = 0; };
  const WOOD = { lit: [hex("#b48a5c"), hex("#9a7650"), hex("#c8a070")], dark: [hex("#6a4c34"), hex("#563c28"), hex("#7a5a3e")], post: hex("#3a2a1c") };
  const lenK = 0.3 + 0.3 * DAY.len;
  const ramp = S.cross === "ramp";
  // z(s): the bank's height at s (s > 0 into the high ground, s < 0 toward the low side)
  const z = ramp ? (s) => (s > 0 ? h : h * clamp((s + RAMP_L) / RAMP_L, 0, 1))
    : (s, rise) => (s < -rise ? 0 : s < 0 ? h * (s + rise) / rise : h * Math.max(0, 1 - s / CUT_L));
  if (S.ew) {
    // the road runs up the screen; s grows northward, dx eastward
    for (let y = Math.floor(c.Y - CUT_L - 14); y <= c.Y + RAMP_L + h + 14; y++) for (let x = Math.floor(c.X - RH - 36); x <= c.X + RH + 36; x++) {
      if (x < 0 || y < 0 || x >= AW || y >= AH) continue;
      const i = y * AW + x, s = c.Y - y, dx = x - c.X, ax = Math.abs(dx), west = dx < 0;
      const onRoad = B.roadD[i] < RH - 3 && ax < RH - 3;
      if (ramp) {
        if (s < -RAMP_L - 2 || s > 6) continue;
        const zz = z(s), t = (s + RAMP_L) / RAMP_L;
        if (onRoad) {
          if (s > 0) { if (s <= 2) road(i, 0.9); continue; }
          // the climb: its own pebbles drawn closer together (sampled from further down), shading from a
          // darker foot up to a lit lip where it tops out
          const ys = Math.round(c.Y - s * 1.45), si = ys * AW + x;
          const src = ys < AH && B.roadD[si] < RH - 3 ? si : i;
          // shaded slope (it faces away from the sun): eases in from the foot, darkest just under the lip
          // barely shaded (it faces a little away from the sun); dotted contour lines closing up as it climbs
          let k = 1 - 0.07 * sstep(t * 1.4);
          const ph = (1 - Math.pow(1 - t, 1.8)) * 6;
          if (ph % 1 < 0.13 && t > 0.08 && ((x + y) & 1)) k *= 0.88;
          if (s >= -2) k = 1.16; else if (s >= -4 && BAY[y & 3][x & 3] < 0.5) k = 1.07;
          set(i, [orig[src * 4] * k, orig[src * 4 + 1] * k, orig[src * 4 + 2] * k]); KEEP[i] = 0; continue;
        }
        // the wedges: the step's own earth face turns down along each side of the road and tapers to nothing
        // at the ramp's foot; a course of retaining stones lines it against the road, a turf lip on its top
        const bw = Math.round(zz * 1.05);
        if (ax >= RH - 3 && ax <= RH + bw && s <= 0 && zz > 1.5) {
          const q = ax - (RH - 3);
          let col;
          if (q < 4) { const blk = Math.floor((s + 200 + (q > 1 ? 2 : 0)) / 5), mort = (s + 200 + (q > 1 ? 2 : 0)) % 5 === 0; col = mort ? STONE[3] : q === 0 ? STONE[2] : STONE[h32(blk, west ? 1 : 2, 650) < 0.5 ? 0 : 1]; if (!west) col = mul(col, 0.82); }
          else if (ax >= RH + bw - 1) col = west ? G(6, 2) : G(4, 1);
          else { col = west ? mix(EARTH_LIT, EARTH[2], 0.3) : EARTH_DK; col = mul(col, 0.9 + vn(x / 2, y / 6, 652) * 0.16); if (h32(x >> 1, (y + 200) >> 2, 653) < 0.1) col = west ? STONE[2] : STONE[3]; }
          put(i, col); continue;
        }
        if (ax > RH + bw && ax <= RH + bw + 2 && s <= 0 && s > -RAMP_L + 4 && !west) { const i2 = i; set(i2, mix(get(i2), mul(G(0, 0), 0.9), 0.5)); }
      } else {
        if (s < -h - 2 || s > CUT_L + 2) continue;
        const zz = z(s, h), ww = zz > 1 ? Math.round(zz * 0.55) + 2 : 0;
        if (onRoad) {
          // the west bank's shadow down the road, the walls' feet
          const shw = Math.round(zz * lenK);
          if (west && ax > RH - 4 - shw) road(i, 0.72); else if (ax >= RH - 5 && zz > 1) road(i, 0.8);
          continue;
        }
        if (!ww) continue;
        if (ax >= RH - 3 && ax < RH - 3 + ww) { // the timber revetment, seen side-on
          const post = ((s + 300) % 7) === 0, pal = west ? WOOD.dark : WOOD.lit;
          const top = ax === RH - 3 + ww - 1;
          put(i, post ? WOOD.post : top ? (west ? WOOD.dark[2] : WOOD.lit[2]) : pal[((ax + (s >> 2)) & 1) ? 0 : 1]); continue;
        }
        if (ax >= RH - 3 + ww && ax < RH - 1 + ww) { put(i, ax === RH - 3 + ww ? G(6, 2) : G(4, 1)); continue; } // the bank's grassed top
      }
    }
  } else {
    // the road runs across the screen; s grows toward the high side, dy southward
    const sg = S.high === "e" ? 1 : -1, ws = Math.max(1, Math.round(h * 0.6)), litSlope = S.high === "e";
    for (let y = Math.floor(c.Y - RH - h - 8); y <= c.Y + RH + h + 8; y++) for (let x = Math.floor(c.X - RAMP_L - CUT_L - 10); x <= c.X + RAMP_L + CUT_L + 10; x++) {
      if (x < 0 || y < 0 || x >= AW || y >= AH) continue;
      const i = y * AW + x, s = (x - c.X) * sg, dy = y - c.Y, ay = Math.abs(dy), north = dy < 0;
      const onRoad = B.roadD[i] < RH - 3 && ay < RH - 3;
      if (ramp) {
        if (s < -RAMP_L - 2 || s > 6) continue;
        const zz = z(s), t = (s + RAMP_L) / RAMP_L;
        if (onRoad) {
          if (s > 0) { if (s <= 2) road(i, 0.92); continue; }
          const xs = Math.round(c.X + s * 1.45 * sg), si = y * AW + xs;
          const src = xs >= 0 && xs < AW && B.roadD[si] < RH - 3 ? si : i;
          // facing the sun's side it lightens as it climbs; facing away it darkens
          let k = litSlope ? 1 + 0.1 * sstep(t * 1.4) : 1 - 0.07 * sstep(t * 1.4);
          const ph = (1 - Math.pow(1 - t, 1.8)) * 6;
          if (ph % 1 < 0.13 && t > 0.08 && ((x + y) & 1)) k *= 0.88;
          if (s >= -2) k = 1.22; else if (s >= -4 && BAY[y & 3][x & 3] < 0.5) k = litSlope ? 1.16 : 1.05;
          set(i, [orig[src * 4] * k, orig[src * 4 + 1] * k, orig[src * 4 + 2] * k]); KEEP[i] = 0; continue;
        }
        if (zz <= 1.5) continue;
        // the north kerb: a line of capstones along the far edge of the climb
        // the far side: a kerb of capstones, then a narrow bank of earth falling away, a turf lip on its top
        const nb = Math.round(zz * 0.5);
        if (north && ay >= RH - 3 && ay < RH + 1) { const mort = ((x + 200) % 6) === 0; put(i, mort ? STONE[3] : ay === RH - 3 ? STONE[2] : STONE[1]); continue; }
        if (north && ay >= RH + 1 && ay <= RH + 1 + nb && s <= 0) { put(i, ay >= RH + nb ? G(6, 2) : mul(mix(EARTH[2], EARTH[1], 0.5), 0.9 + vn(x / 5, y / 2, 654) * 0.15)); continue; }
        // the south face of the embankment, toward us: dressed stone in courses, growing with the climb
        if (!north && ay >= RH - 3 && ay < RH - 3 + Math.round(zz)) {
          const j = ay - (RH - 3), course = Math.floor(j / 4), off = (course & 1) * 4, mort = j % 4 === 3 || ((x + off + 200) % 8) === 0;
          let col = j === 0 ? STONE[2] : mort ? STONE[3] : STONE[h32(Math.floor((x + off) / 8), course, 651) < 0.5 ? 0 : 1];
          if (j === Math.round(zz) - 1) col = mul(STONE[3], 0.8);
          put(i, col); continue;
        }
        if (!north && ay >= RH - 3 + Math.round(zz) && ay < RH - 1 + Math.round(zz) + Math.round(2 + 3 * DAY.len)) SH[i] = Math.max(SH[i], 0.8);
      } else {
        if (s < -ws - 2 || s > CUT_L + 2) continue;
        const zz = z(s, ws), zi = Math.round(zz);
        if (onRoad) {
          const shw = Math.round(zz * lenK);
          if (north && ay > RH - 4 - shw) road(i, 0.72); else if (!north && ay >= RH - 5 && zz > 1) road(i, 0.82);
          continue;
        }
        if (zz <= 1) continue;
        if (north && ay >= RH - 3 && ay < RH - 3 + zi) { // the far bank's face, toward us: timber planks between posts
          const j = ay - (RH - 3), post = ((x + 300) % 9) === 0;
          put(i, post ? WOOD.post : j % 3 === 0 ? WOOD.dark[1] : WOOD.dark[(j >> 1) & 1 ? 0 : 2]); continue;
        }
        if (north && ay >= RH - 3 + zi && ay < RH - 1 + zi) { put(i, ay === RH - 3 + zi ? G(4, 1) : G(6, 2)); continue; } // its grassed top
        if (!north && ay >= RH - 3 && ay <= RH - 1) { put(i, ay === RH - 3 ? mul(G(0, 0), 0.8) : ((x + 300) % 9) === 0 ? WOOD.post : G(6, 2)); continue; } // the near bank's top, its posts' heads
      }
    }
  }
}
const EARTH_LIT = hex("#b49870"), EARTH_DK = hex("#5a4a38");
