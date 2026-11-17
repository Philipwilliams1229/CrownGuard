// Effects concepts, Round 4 (water): see art/briefs/fx-round4.md. Owned by the water artist.
// Rows: puddles (rain puddles and the wet road), flood (a flooded road), bolt (lightning strikes the ground).
// Each row: { id, label, group: "Round 4", note, cw, ch, ax, ay, N, today, A, B, C }  (today = the game's own look,
// drawn by calling the game's painter; A clean, B worked, C bold). Painters get (c, e): c is a cell canvas
// translated to (ax, ay), 1 unit = 1 art pixel; e = { i, N, t (0..1 looping), p (0..1 once), foe, hall, T, HW, ground }.
import * as B from "../src/render/weatherbake.js";
import { PX } from "../src/render/paint.js";

// ---- toolkit (copied small from fx-concepts.js) ------------------------------------------------------------
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (p) => 1 - (1 - p) * (1 - p);
const sm = (t) => t * t * (3 - 2 * t);
const vn = (x, y, s = 0) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
  const a = H(xi + s * 17, yi + s * 5), b = H(xi + 1 + s * 17, yi + s * 5), c2 = H(xi + s * 17, yi + 1 + s * 5), d = H(xi + 1 + s * 17, yi + 1 + s * 5);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c2 * (1 - fx) + d * fx) * fy;
};
const RGBC = {};
const rgb = (h) => RGBC[h] || (RGBC[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const mix = (a, b, t) => { const A = rgb(a), Bc = rgb(b); return "#" + [0, 1, 2].map((k) => Math.round(A[k] + (Bc[k] - A[k]) * t).toString(16).padStart(2, "0")).join(""); };
const px = (c, x, y, col, a = 1) => { if (a < 1) c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); if (a < 1) c.globalAlpha = 1; };
const eachCell = (e, f) => { for (let y = -e.ay; y < e.ch - e.ay; y++) for (let x = -e.ax; x < e.cw - e.ax; x++) f(x, y); };
// a water mask: one byte a pixel, 0 dry, 1..9 deeper in
const mkMask = (e) => ({ a: new Uint8Array(e.cw * e.ch), w: e.cw, h: e.ch, ox: e.ax, oy: e.ay });
const mg = (M, x, y) => { const X = x + M.ox, Y = y + M.oy; return X < 0 || X >= M.w || Y < 0 || Y >= M.h ? 0 : M.a[Y * M.w + X]; };
const ms = (M, x, y, v) => { const X = x + M.ox, Y = y + M.oy; if (X >= 0 && X < M.w && Y >= 0 && Y < M.h && v > M.a[Y * M.w + X]) M.a[Y * M.w + X] = v; };
const blob = (M, cx, cy, rx, ry, seed, g) => {
  if (g < 0.03) return;
  for (let y = Math.floor(cy - ry * 1.5 - 1); y <= Math.ceil(cy + ry * 1.5 + 1); y++) for (let x = Math.floor(cx - rx * 1.5 - 1); x <= Math.ceil(cx + rx * 1.5 + 1); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = Math.hypot(nx, ny), th = Math.atan2(ny, nx);
    const ed = (0.84 + 0.34 * vn(Math.cos(th) * 1.5 + seed * 3, Math.sin(th) * 1.5 + seed, seed)) * g;
    const dn = d / ed;
    if (dn < 1) ms(M, x, y, 1 + Math.floor((1 - dn) * 8));
  }
};
const HALO = [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]];

// ---- the storm scene: a wet road strip with grass verge ---------------------------------------------------
const DIRT = ["#a38559", "#b89d6c", "#876a40"], WETC = "#2c2218";
const roadEdge = (x, rw) => rw + (vn(x / 6, 3, 3) - 0.5) * 5;
const isRoad = (x, y, rw) => Math.abs(y + 0.5) < roadEdge(x, rw);
const paintRoad = (c, e, o = {}) => {
  const rw = o.rw || 36, soak = o.soak ?? 0.7;
  eachCell(e, (x, y) => {
    const ay = Math.abs(y + 0.5), ed = roadEdge(x, rw);
    if (ay < ed) {
      const n = vn(x / 5, y / 3, 1);
      let col = n < 0.36 ? DIRT[2] : n > 0.7 ? DIRT[1] : DIRT[0];
      if (H(x, y, 9) > 0.988) col = "#8e8068";
      const rut = Math.abs(ay - rw * 0.42) < 1.3 + vn(x / 9, 5, 2) * 1.2;
      col = mix(col, WETC, clamp(soak * 0.55 + (rut ? soak * 0.25 : 0) + (ay > ed - 2 ? 0.08 : 0)));
      px(c, x, y, col);
    } else if (ay < ed + 4) { const t = (ed + 4 - ay) / 4; if (bay(x, y) < t * 0.75) px(c, x, y, mix("#6a5a3a", "#2a2218", soak * 0.5)); }
  });
};
const wash = (c, e, a = 0.34) => { c.fillStyle = `rgba(22,32,58,${a})`; c.fillRect(-e.ax, -e.ay, e.cw, e.ch); };
const flashOver = (c, e, a) => { if (a > 0.01) { c.fillStyle = `rgba(222,232,255,${a})`; c.fillRect(-e.ax, -e.ay, e.cw, e.ch); } };

const PALS = {
  road: { lip: "#2a2016", deep: "#35291e", mid: "#4c3f33", sky: "#6a6e7a", glint: "#aab2c0", rim: "#bcae8c", halo: "#2a2118", side: "#6a5c48" },
  grass: { lip: "#1a2a1a", deep: "#25402a", mid: "#355a3a", sky: "#7a9aa2", glint: "#d2e4e2", rim: "#a6c48c", halo: "#243620", side: "#4c7048" },
};
const shade = (c, e, M, o) => {
  const fl = o.flash || 0;
  eachCell(e, (x, y) => {
    const v = mg(M, x, y), pal = PALS[isRoad(x, y, o.rw) ? "road" : "grass"];
    if (!v) { for (const [dx, dy] of HALO) if (mg(M, x + dx, y + dy)) { if (bay(x, y) < 0.5) px(c, x, y, pal.halo, 0.7); return; } return; }
    const n = mg(M, x, y - 1), s = mg(M, x, y + 1), w = mg(M, x - 1, y), ea = mg(M, x + 1, y);
    let col;
    if (!s) col = pal.rim; else if (!n) col = pal.lip; else if (!w || !ea) col = pal.side;
    else {
      col = !mg(M, x, y - 2) ? pal.deep : (v > 4 || vn(x / 6, y / 3, 4) > 0.62) ? pal.deep : pal.mid;
      const sk = o.sky ? o.sky(x, y, e) : 0;
      if (sk === 1) col = pal.sky; else if (sk === 2) col = pal.glint;
      if (fl > 0.2 && sk) col = "#eef4ff";
    }
    if (fl > 0.2) col = mix(col, "#e4eeff", Math.round(fl * 3) / 3 * 0.6);
    px(c, x, y, col);
  });
};
// a drop's ring on the water (f 0..4), drawn only where there is water
const ripple = (c, M, cx, cy, sc, f) => {
  if (f === 0) { for (const [dx, dy, a] of [[0, 0, 1], [-1, 0, 1], [0, -2, 0.8], [0, -3, 0.6]]) if (mg(M, cx + dx, cy + dy)) px(c, cx + dx, cy + dy, "#f0f6fc", a); return; }
  const rr = [0, 1.6, 3.6, 5.8, 7.6][f] * sc, ry = rr * 0.42, n = Math.ceil(rr * 8);
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    if (f === 4 && k % 3 === 0) continue;
    const x = Math.round(cx + Math.cos(t) * rr), y = Math.round(cy + Math.sin(t) * ry);
    if (mg(M, x, y)) px(c, x, y, Math.sin(t) > 0 ? "#e8eef6" : "#8f9db0", f === 1 ? 1 : f === 2 ? 0.85 : 0.55);
  }
};
// a drop on dry road: a crown flicks up, a ring, a faint ring
const roadSplash = (c, x, y, f) => {
  const W = "#e6eef8", L = "#9fb0c8";
  if (f === 0) { px(c, x, y, W); px(c, x, y - 2, W, 0.8); px(c, x, y - 3, L, 0.6); }
  if (f === 1) { for (const [dx, dy, k] of [[-2, 0, L], [-1, 0, L], [1, 0, L], [2, 0, L], [-2, -2, W], [2, -2, W], [-1, -3, W], [1, -3, W], [0, -4, W]]) px(c, x + dx, y + dy, k); }
  if (f === 2) { for (let k = 0; k < 14; k++) { const t = (k / 14) * Math.PI * 2; px(c, Math.round(x + Math.cos(t) * 3.5), Math.round(y + Math.sin(t) * 1.5), Math.sin(t) > 0 ? W : L); } px(c, x - 3, y - 2, W); px(c, x + 4, y - 3, W); }
  if (f === 3) { for (let k = 0; k < 18; k++) { if (k % 3 === 0) continue; const t = (k / 18) * Math.PI * 2; px(c, Math.round(x + Math.cos(t) * 5.5), Math.round(y + Math.sin(t) * 2.3), L, 0.5); } }
};
// a thin run-off stream off the road's south verge, with a bead racing down it
const runoff = (c, e, R, p) => {
  if (p < R.th) return;
  const k1 = Math.floor(R.len * clamp((p - R.th) / 0.2));
  for (let k = 0; k < k1; k++) {
    const x = R.x + Math.round((vn(k / 4, R.seed, 6) - 0.5) * 5), y = R.y0 + k;
    px(c, x, y, k % 5 === 4 ? "#8da3ac" : "#a9bcc4", 0.9); px(c, x + 1, y, "#2c3c28", 0.5);
  }
  if (k1 > 4) { const b = (e.i * 3) % k1; px(c, R.x + Math.round((vn(b / 4, R.seed, 6) - 0.5) * 5), R.y0 + b, "#f4f8fa"); }
  for (let q = 0; q < 14; q++) { const a = H(q, R.seed) * 6.28, r = 1 + H(q, R.seed + 1) * 4; px(c, R.x + Math.cos(a) * r * 1.6, R.y0 + k1 + Math.sin(a) * r * 0.6, "#26301c", 0.6); }
};
const poolScene = (c, e, cfg) => {
  const p = e.p, rw = cfg.rw;
  paintRoad(c, e, { rw, soak: 0.15 + 0.7 * ease(p) });
  wash(c, e, 0.34);
  const fl = cfg.flash ? cfg.flash[e.i] || 0 : 0;
  flashOver(c, e, fl * 0.34);
  const M = mkMask(e);
  for (const P of cfg.pools) blob(M, P.x, P.y, P.rx, P.ry, P.seed, ease(clamp((p - P.th) / 0.5)));
  const drift = e.i * 1.3;
  const sky = (x, y) => {
    if (cfg.cloud) {
      const f = vn((x - drift) / 15, y / 3.2, 7) * 0.8 + vn((x - drift * 1.6) / 6, y / 2, 8) * 0.2;
      if (cfg.gust) { const gx = -95 + e.i * 20, env = Math.max(0, 1 - Math.abs(x - gx) / 30), r = Math.sin(y * 1.9 + Math.sin(x * 0.28) * 1.6 - e.i * 1.3); if (env > 0.15 && r > 0.55) return r > 0.86 && env > 0.55 ? 2 : 1; }
      if (f > 0.76) return 2;
      return f > 0.66 || (f > 0.62 && bay(x, y) < 0.5) ? 1 : 0;
    }
    const u = x * 0.45 + y * 0.9, k = ((u % 26) + 26) % 26;   // A: one fixed streak of sky
    return k < 5 ? 1 : k < 6.2 ? 2 : 0;
  };
  shade(c, e, M, { rw, sky, flash: fl });
  // rings
  cfg.pools.forEach((P, j) => {
    const g = ease(clamp((p - P.th) / 0.5)); if (g < 0.3) return;
    const n = Math.max(1, Math.round(cfg.drops * Math.min(1, P.rx / 14)));
    for (let k = 0; k < n; k++) {
      const b = Math.floor(H(j, k, 5) * (e.N + 2)) - 2, f = e.i - b; if (f < 0 || f > 4) continue;
      ripple(c, M, Math.round(P.x + (H(j, k, 6) - 0.5) * P.rx * 1.3), Math.round(P.y + (H(j, k, 7) - 0.5) * P.ry * 1.2), cfg.rscale * (0.8 + 0.5 * H(j, k, 8)), f);
    }
  });
  // drops on the dry road
  for (let k = 0; k < cfg.splashes; k++) {
    const b = Math.floor(H(k, 1, 9) * (e.N + 2)) - 2, f = e.i - b; if (f < 0 || f > 3) continue;
    const x = Math.round((H(k, 2, 9) - 0.5) * 140), y = Math.round((H(k, 3, 9) - 0.5) * rw * 1.8);
    if (!mg(M, x, y) && !mg(M, x, y + 2)) roadSplash(c, x, y, f);
  }
  // the flash mirrored in every pool: a jagged streak down each, and the sky gone white
  if (cfg.flash && fl > 0.2) {
    for (const P of cfg.pools) {
      if (ease(clamp((p - P.th) / 0.5)) < 0.3) continue;
      for (let y = Math.floor(P.y - P.ry); y <= Math.ceil(P.y + P.ry); y++) {
        const x = Math.round(P.x + 3 * Math.sin(y * 0.55 + P.seed) + 0.25 * (P.seed % 5 - 2) * (y - P.y));
        if (mg(M, x, y)) { px(c, x, y, "#ffffff"); if (fl > 0.6) { px(c, x - 1, y, "#bcd0ff", 0.8); px(c, x + 1, y, "#bcd0ff", 0.8); } }
      }
    }
  }
  if (cfg.runoff) for (const R of cfg.runoff) runoff(c, e, R, p);
};

// ---- row 1: puddles -----------------------------------------------------------------------------------------
const PU_A = [
  { x: -40, y: -13, rx: 25, ry: 9, seed: 1, th: 0 }, { x: 18, y: 12, rx: 34, ry: 11, seed: 2, th: 0.1 }, { x: 58, y: -16, rx: 16, ry: 6, seed: 3, th: 0.22 },
  { x: -36, y: 46, rx: 14, ry: 4, seed: 4, th: 0.12 }, { x: 44, y: -46, rx: 11, ry: 4, seed: 5, th: 0.2 },
];
// B / C: puddles lie in the two ruts (y -15, +15), in chains that join as it soaks, and in two hollows
const PU_B = (() => {
  const out = [{ x: -26, y: 1, rx: 24, ry: 9, seed: 11, th: 0.04 }, { x: 40, y: -3, rx: 20, ry: 8, seed: 12, th: 0.1 }];
  let s = 20;
  for (let k = 0; k < 7; k++) out.push({ x: -66 + k * 21 + (H(k, 3) - 0.5) * 6, y: -15 + (H(k, 4) - 0.5) * 2, rx: 11 + H(k, 5) * 7, ry: 3 + H(k, 6) * 2.2, seed: s++, th: 0.06 + H(k, 7) * 0.32 });
  for (let k = 0; k < 7; k++) out.push({ x: -62 + k * 21 + (H(k, 13) - 0.5) * 6, y: 15 + (H(k, 14) - 0.5) * 2, rx: 11 + H(k, 15) * 7, ry: 3 + H(k, 16) * 2.2, seed: s++, th: 0.06 + H(k, 17) * 0.32 });
  out.push({ x: -36, y: 46, rx: 14, ry: 4, seed: 4, th: 0.12 }, { x: 44, y: -46, rx: 11, ry: 4, seed: 5, th: 0.2 });
  return out;
})();
const RUN_B = [{ x: -46, y0: 30, len: 22, seed: 3, th: 0.7 }, { x: 24, y0: 31, len: 19, seed: 8, th: 0.78 }];
const CFG_A = { rw: 36, pools: PU_A, drops: 3, rscale: 1, splashes: 3 };
const CFG_B = { rw: 36, pools: PU_B, drops: 3, rscale: 1.6, splashes: 7, cloud: true, runoff: RUN_B };
const CFG_C = { ...CFG_B, flash: [0, 0, 0, 0, 0, 0.3, 1, 0.45, 0.12, 0], gust: true, drops: 4 };
const gx = (c, s, x, y) => c.drawImage(s.cv, Math.round(x - s.ax), Math.round(y - s.ay));
const step4 = (v) => Math.ceil(clamp(v) * 4) / 4;
const puddlesToday = (c, e) => {
  const p = e.p, rw = 36;
  paintRoad(c, e, { rw, soak: 0 });
  // the game's wet road film, clipped to the strip
  const wet = B.wetRoad("fx4", [{ x1: 0, y1: 280, x2: 800, y2: 280 }], 800).wet;
  c.save(); c.beginPath(); c.rect(-e.ax, -rw, e.cw, rw * 2); c.clip(); c.imageSmoothingEnabled = false;
  c.globalAlpha = step4(ease(p) * 1.4);
  c.drawImage(wet, 420 - e.ax / PX, 280 - e.ay / PX, e.cw / PX, e.ch / PX, -e.ax, -e.ay, e.cw, e.ch); c.restore(); c.globalAlpha = 1;
  wash(c, e, 0.34);
  PU_A.forEach((P, j) => {
    const g = ease(clamp((p - P.th) / 0.5)), wu = 2 * Math.floor((P.rx * g * 1.0) / 2 * 1.0);
    if (wu < 4) return;
    c.globalAlpha = step4(g * 1.5); gx(c, B.puddle(wu, j, false), P.x, P.y); c.globalAlpha = 1;
    const rings = Math.min(3, 1 + Math.floor(wu / 9));
    for (let r = 0; r < rings; r++) { const q = (p * 1.4 + H(j, r, 202) * 0.8) % 0.8 / 0.8, f = Math.floor(q * 5); if (f > 3) continue; gx(c, B.dimple(f), P.x + (H(j + r, 4, 204) - 0.5) * wu * 0.8, P.y + (H(j + r, 5, 205) - 0.5) * wu * 0.4); }
  });
  for (let k = 0; k < 5; k++) { const f = Math.floor(((e.i + k * 3) % 8) / 2); if (f > 3) continue; gx(c, B.splash(f, 1), (H(k, 2, 9) - 0.5) * 130, (H(k, 3, 9) - 0.5) * 60); }
};

// ---- row 2: flood ------------------------------------------------------------------------------------------
const FL = { lip: "#2e281e", rim: "#bcae88", side: "#8c8062", sh1: "#a29668", sh2: "#82764f", mid: "#5f5640", deep: "#463e2e", sky: "#74808e", glint: "#a9b6c6", foam: "#e4e8e2", foam2: "#b8c2bc" };
const XL = 138, HH = 54, FRW = 46;
const floodMask = (e, wob) => {
  const M = mkMask(e);
  eachCell(e, (x, y) => {
    const xl = x / XL; if (Math.abs(xl) >= 1) return;
    const h = (HH * Math.pow(1 - xl * xl, 0.32) + (vn(x / 7, 2, 5) - 0.5) * 5) * (1 + wob(x)), dn = Math.max(Math.abs(y + 0.5) / h, Math.abs(xl) ** 2);
    if (dn < 1) ms(M, x, y, 1 + Math.floor((1 - dn) * 8));
  });
  return M;
};
const edgeDist = (M, x, y) => { for (let d = 1; d <= 6; d++) if (!mg(M, x - d, y) || !mg(M, x + d, y) || !mg(M, x, y - d) || !mg(M, x, y + d)) return d; return 7; };
const floodBase = (c, e, soakRoad = 0.8) => { paintRoad(c, e, { rw: FRW, soak: soakRoad }); wash(c, e, 0.34); };
const floodShade = (c, e, M, o = {}) => {
  eachCell(e, (x, y) => {
    const v = mg(M, x, y);
    if (!v) {
      if (o.foam) { for (const [dx, dy] of HALO) if (mg(M, x + dx, y + dy)) { const f = vn(x / 3, y / 3, 6) * 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(e.t * 6.283 + H(x, y) * 6)); if (f > 0.5 && bay(x, y) < 0.6) px(c, x, y, FL.foam, 0.95); else if (bay(x, y) < 0.5) px(c, x, y, "#2a2218", 0.6); return; } return; }
      for (const [dx, dy] of HALO) if (mg(M, x + dx, y + dy)) { if (bay(x, y) < 0.5) px(c, x, y, "#2a2218", 0.65); return; }
      return;
    }
    const n = mg(M, x, y - 1), s = mg(M, x, y + 1), w = mg(M, x - 1, y), ea = mg(M, x + 1, y), dd = edgeDist(M, x, y);
    let col;
    if (!s) col = FL.rim; else if (!n) col = FL.lip; else if (!w || !ea) col = FL.side;
    else if (dd <= 3) col = FL.sh1;
    else if (dd <= 6) col = bay(x, y) < (7 - dd) / 4 ? FL.sh2 : FL.mid;
    else {
      const nn = vn(x / 10, y / 5, 3);
      col = nn < 0.3 ? FL.deep : FL.mid;
      const b = vn(x / 20 + (o.cur ? 0 : 0), y / 2.2, 11) * (0.55 + 0.45 * vn(x / 9, y / 6, 12));
      if (b > 0.66) col = b > 0.76 && bay(x, y) > 0.5 ? FL.glint : FL.sky;
      if (!o.cur && H(x + e.i * 7, y, 33) < 0.01) col = FL.glint;
    }
    if (o.foam && dd <= 3 && dd > 1) { const f = vn(x / 3, y / 3, 6) * 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(e.t * 6.283 + H(x, y) * 6)); if (f > 0.58) col = f > 0.74 ? FL.foam : FL.foam2; }
    px(c, x, y, col);
  });
};
const floodRings = (c, e, M, n, sc) => {
  for (let k = 0; k < n; k++) {
    const b = Math.floor(H(k, 21, 5) * (e.N + 2)) - 2, f = e.i - b; if (f < 0 || f > 4) continue;
    ripple(c, M, Math.round((H(k, 22, 5) - 0.5) * 140), Math.round((H(k, 23, 5) - 0.5) * 80), sc * (0.8 + 0.5 * H(k, 24, 5)), f);
  }
};
const floodToday = (c, e) => {
  floodBase(c, e, 0.8);
  const tw = Math.round(e.cw / PX), th = Math.round(e.ch / PX), cv = B.mk(tw, th), g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  const R = 33, pts = [-30, -10, 10, 30], rAt = (i) => Math.round(R * (i === 0 || i === 3 ? 0.72 : i === 1 || i === 2 ? 0.9 : 1)), ox = tw / 2, oy = th / 2;
  pts.forEach((x, i) => { const s = B.floodDisc(rAt(i), 1); g.drawImage(s.cv, Math.round(ox + x - s.r), Math.round(oy - s.r)); });
  g.globalCompositeOperation = "source-atop"; g.fillStyle = g.createPattern(B.floodTex(), "repeat"); g.fillRect(0, 0, tw, th);
  g.globalCompositeOperation = "destination-over";
  pts.forEach((x, i) => { const s = B.floodDisc(rAt(i), 0); g.drawImage(s.cv, Math.round(ox + x - s.r), Math.round(oy - s.r)); });
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 0.9; c.drawImage(cv, -e.ax, -e.ay, e.cw, e.ch); c.restore();
  for (let k = 0; k < 5; k++) { const P = 0.45 + H(k, 1, 380) * 0.25, q = ((e.t * 1.2 + H(k, 2, 380) * P) % P) / P, f = Math.floor(q * 5); if (f > 3) continue; gx(c, B.dimple(f, k % 3 === 0), (H(k, 3, 382) - 0.5) * 140, (H(k, 4, 383) - 0.5) * 60); }
  const wob = Math.floor(e.t * 8) & 1;
  const s = e.foe(e.i); c.save(); c.beginPath(); c.rect(-e.ax, -e.ay, e.cw, e.ay + 6 - 5); c.clip(); c.drawImage(s.cv, Math.round(-30 - s.ax + e.i * 8), Math.round(6 - s.ay)); c.restore();
  gx(c, B.wake(5, wob), -30 + e.i * 8, 6);
};
const flowDash = (c, e, M, step) => {
  for (let cx = -96; cx < 100; cx += 12) for (let r = 0; r < 4; r++) {
    const ph = H(cx, r, 41) * 32, len = 4 + Math.floor(H(cx, r, 42) * 4), y0 = ((ph + step * e.i) % 32) + (r - 2) * 32 - 8;
    const x = cx + Math.round((H(cx, r, 43) - 0.5) * 4);
    for (let k = 0; k < len; k++) { const y = Math.floor(y0 + k); if (edgeDist(M, x, y) > 4 && mg(M, x, y)) { px(c, x, y, k === 0 ? FL.glint : FL.sky); px(c, x + 1, y, FL.deep, 0.8); } }
  }
};
const debris = (c, e, M) => {
  const D = [{ x: -40, y: -50, k: 0 }, { x: 6, y: -62, k: 1 }, { x: 38, y: -44, k: 2 }, { x: -12, y: -22, k: 1 }];
  for (const d of D) {
    const y = Math.round(d.y + 7 * e.i), x = Math.round(d.x + Math.sin(e.i * 0.9 + d.x) * 1.5);
    if (!mg(M, x, y) || edgeDist(M, x, y) < 5) continue;
    if (d.k === 0) { for (let k = -4; k <= 4; k++) px(c, x + k, y, "#6a4a2c"); for (let k = -4; k <= 4; k++) px(c, x + k, y - 1, "#9a7448"); px(c, x - 5, y, "#2e2418"); px(c, x + 5, y, "#2e2418"); }
    if (d.k === 1) { px(c, x, y, "#5a7a2c"); px(c, x + 1, y, "#7a9a3c"); px(c, x, y - 1, "#9aba5c"); px(c, x + 2, y, "#2e3a1c"); }
    if (d.k === 2) { for (let k = 0; k < 6; k++) px(c, x + k, y + (k > 3 ? 1 : 0), k % 2 ? "#4a3420" : "#7a5a38"); }
    for (const dx of [-3, 3]) if (bay(x + dx, y + 1) < 0.6) px(c, x + dx, y + 1, FL.foam, 0.7);   // a little bow wave
  }
};
const floodA = (c, e) => {
  floodBase(c, e, 0.8);
  const M = floodMask(e, () => 0);
  floodShade(c, e, M);
  floodRings(c, e, M, 7, 1);
};
const wobB = (e) => (x) => 0.028 * Math.sin(e.t * 6.283 + x / 22);
const floodB = (c, e) => {
  floodBase(c, e, 0.8);
  const M = floodMask(e, wobB(e));
  floodShade(c, e, M, { foam: true, cur: true });
  flowDash(c, e, M, 4);
  debris(c, e, M);
  floodRings(c, e, M, 5, 1);
};
const floodC = (c, e) => {
  floodBase(c, e, 0.8);
  const M = floodMask(e, wobB(e));
  floodShade(c, e, M, { foam: true, cur: true });
  flowDash(c, e, M, 4);
  debris(c, e, M);
  floodRings(c, e, M, 4, 1);
  // a goblin wading: legs under the water, a ring round the shins, a V of wake behind, drops on the footfalls
  const gx0 = Math.round(-56 + e.i * 14), gy = 8;
  const s = e.foe(e.i);
  c.save(); c.beginPath(); c.rect(-e.ax, -e.ay, e.cw, e.ay + gy - 5); c.clip(); c.drawImage(s.cv, gx0 - s.ax, gy - s.ay); c.restore();
  for (let k = 0; k < 28; k++) { const t = (k / 28) * Math.PI * 2; if ((k + e.i) % 4 === 0) continue; px(c, Math.round(gx0 + Math.cos(t) * 10), Math.round(gy - 4 + Math.sin(t) * 3.4), Math.sin(t) > 0 ? "#e8eef2" : FL.glint, Math.sin(t) > 0 ? 0.95 : 0.7); }
  for (let k = 6; k < 30; k++) for (const sg of [-1, 1]) { const wx = Math.round(gx0 - 8 - k * 1.1), wy = Math.round(gy - 4 + sg * (1 + k * 0.28)); if (mg(M, wx, wy) && (k + (sg > 0 ? 1 : 0)) % 3 !== 0) px(c, wx, wy, sg > 0 ? "#e8eef2" : FL.glint, clamp(1.2 - k / 30)); }
  if (e.i & 1) for (let k = 0; k < 6; k++) px(c, gx0 + Math.round((H(k, e.i) - 0.5) * 16), gy - 8 - Math.round(H(k, e.i, 3) * 4), "#f0f6fa");
  else for (let k = 0; k < 3; k++) px(c, gx0 + Math.round((H(k, e.i) - 0.5) * 12), gy - 6 - Math.round(H(k, e.i, 3) * 2), "#cfd8e0");
};

// ---- row 3: lightning strikes the ground -------------------------------------------------------------------
const BOLT_POOLS = [{ x: -32, y: 8, rx: 17, ry: 6, seed: 31, th: 0 }, { x: 31, y: -5, rx: 15, ry: 5, seed: 32, th: 0 }];
const boltBase = (c, e, flash = 0) => {
  paintRoad(c, e, { rw: 24, soak: 0.9 }); wash(c, e, 0.4);
  flashOver(c, e, flash);
  const M = mkMask(e); for (const P of BOLT_POOLS) blob(M, P.x, P.y, P.rx, P.ry, P.seed, 1);
  shade(c, e, M, { rw: 24, sky: (x, y) => { const u = x * 0.45 + y * 0.9, k = ((u % 26) + 26) % 26; return k < 5 ? 1 : 0; }, flash: flash > 0.3 ? flash : 0 });
  return M;
};
const BOLT_TIME = [0, 0, 1, 1, 1, 1, 0.66, 0.3, 0, 0, 0, 0];   // 2 hot flash, 3 bolt, 4 flicker...
const jag = (seed, n = 17, spread = 24) => {
  const pts = [[Math.round((H(seed, 1) - 0.5) * 50), -118]];
  for (let k = 1; k < n; k++) { const u = k / n; pts.push([Math.round(pts[0][0] * (1 - u) + (H(seed, k + 2) - 0.5) * spread * (1 - u * 0.5)), Math.round(-118 + 118 * u + (H(seed, k + 30) - 0.5) * 4)]); }
  pts.push([0, 0]); return pts;
};
const forks = (pts, seed) => [4, 9].map((fi, q) => { let [x, y] = pts[fi]; const sg = q ? 1 : -1, f = [[x, y]]; for (let k = 1; k <= 5; k++) { x += sg * (3 + Math.floor(H(seed, fi * 7 + k) * 5)); y += 3 + Math.floor(H(seed, fi * 5 + k) * 4); f.push([x, y]); } return f; });
const polyline = (c, pts, core, halo, wide) => {
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], st = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let q = 0; q <= st; q++) {
      const x = Math.round(ax + ((bx - ax) * q) / st), y = Math.round(ay + ((by - ay) * q) / st);
      if (halo) { px(c, x - 1, y, halo, 0.55); px(c, x + 1, y, halo, 0.55); if (wide) { px(c, x - 2, y, halo, 0.35); px(c, x + 2, y, halo, 0.35); } }
      px(c, x, y, core); if (wide) px(c, x + 1, y, core);
    }
  }
};
const drawBolt = (c, e, seed, hot, a) => {
  if (a <= 0) return;
  c.globalAlpha = a; const pts = jag(seed);
  for (const f of forks(pts, seed)) polyline(c, f, "#e8f0ff", "#7c98e8", false);
  polyline(c, pts, hot ? "#ffffff" : "#f4f8ff", hot ? "#c8d8ff" : "#7c98e8", hot);
  c.globalAlpha = 1;
};
const dither = (c, cx, cy, rx, ry, col, a, e) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); if (d < 1 && bay(x, y) < (1 - d) * a) px(c, x, y, col); } };
const scorchMask = (R, seed) => (x, y) => { const nx = x / R, ny = y / (R * 0.46), d = Math.hypot(nx, ny), e2 = 0.82 + 0.28 * vn(x / 4 + seed, y / 3, seed); return d / e2; };
const boltToday = (c, e) => {
  const i = e.i, M = boltBase(c, e, 0);
  const sc = B.boltScorch(14, 1), seed = 7;
  if (i < 2) { c.globalAlpha = step4(0.4 + i * 0.35); gx(c, B.staticGlow(10 + i * 3, i), 0, 3); c.globalAlpha = 1; }
  const a = [0, 0, 1, 1, 0.3, 1, 0.66, 0, 0, 0, 0, 0][i], hot = i === 2;
  if (a > 0) { const s = B.boltSprite(0, 70, seed, hot); c.globalAlpha = a; c.drawImage(s.cv, Math.round(s.x * PX), Math.round((s.y - 70) * PX)); c.globalAlpha = 1; }
  if (i >= 2 && i <= 6) { c.globalAlpha = step4(1 - (i - 2) / 4); gx(c, B.staticGlow(10, 2), 0, 0); c.globalAlpha = 1; for (let k = 0; k < 10; k++) { const an = k * 0.628 + H(7, k, 233), q = (i - 2) / 4, rr = 14 * (0.2 + q * (0.7 + 0.4 * H(7, k, 234))); const m = B.mote(k % 3 ? "#ffffff" : "#fff2a0", "#9ab4ff"); c.drawImage(m, Math.round(Math.cos(an) * rr * PX - 1), Math.round(Math.sin(an) * rr * 0.5 * PX - Math.sin(q * 3.1) * 12 - 1)); } }
  if (i >= 3) { c.globalAlpha = step4(i < 11 ? 1 : 0.5); gx(c, sc, 0, 6); c.globalAlpha = 1; }
  if (i >= 3 && i <= 5) { c.globalAlpha = step4(1 - (i - 3) / 3); gx(c, B.staticGlow(17, 2), 0, 6); c.globalAlpha = 1; }
};
// the scorch (A): stepped dark burn, a rim of ash, a few rays, a hot ember that cools
const scorchA = (c, e, heat) => {
  const f = scorchMask(24, 3);
  for (let y = -14; y <= 14; y++) for (let x = -32; x <= 32; x++) {
    const d = f(x, y);
    if (d > 1.12) continue;
    let col;
    if (d < 0.42) col = "#1d1517"; else if (d < 0.74) col = "#33262a"; else if (d < 0.98) col = "#4a3a32"; else { if (bay(x, y) > 0.55) continue; col = "#5d4c3c"; }
    if (heat > 0.05 && d < 0.55 && bay(x, y) < heat * 0.9) col = d < 0.25 ? "#ffd890" : "#ff9a48";
    if (heat > 0.05 && d < 0.14) col = "#ffe8b0";
    px(c, x, y, col);
  }
  for (let k = 0; k < 6; k++) { const an = k * 1.05 + 0.3; for (let s = 18; s < 27; s++) px(c, Math.round(Math.cos(an) * s * 1.2), Math.round(Math.sin(an) * s * 0.5), "#3c2e2c", 0.85 - (s - 18) * 0.08); }
};
const boltA = (c, e) => {
  const i = e.i, fl = i === 2 ? 0.45 : 0;
  boltBase(c, e, fl);
  if (i < 2) { dither(c, 0, 4, 9 + i * 4, 4 + i * 2, i ? "#e4ecff" : "#9ab4ff", 0.6, e); }
  const a = BOLT_TIME[i];
  drawBolt(c, e, i === 4 ? 12 : 11, i === 2 || i === 3 || i === 5, a);
  if (i >= 2 && i <= 6) { dither(c, 0, 1, 14 - (i - 2), 6 - (i - 2) * 0.6, i < 4 ? "#ffffff" : "#bcd0ff", 0.95 - (i - 2) * 0.12, e); }
  if (i >= 3) scorchA(c, e, clamp(1 - (i - 3) / 6));
  if (i >= 2 && i <= 5) for (let k = 0; k < 8; k++) { const an = k * 0.79 + 0.2, q = (i - 2) / 3, rr = 8 + q * 14; px(c, Math.round(Math.cos(an) * rr), Math.round(Math.sin(an) * rr * 0.5 - Math.sin(q * 3) * 5), k % 2 ? "#ffffff" : "#fff2a0"); }
};
// the Lichtenberg cracks (B): forking lines of glowing ember that cool over frames
const crackPts = (() => {
  const out = [];
  const grow = (x, y, a, len, depth, seed) => { for (let s = 0; s < len; s++) { a += (H(seed, s, 55) - 0.5) * 0.9; x += Math.cos(a) * 1.6; y += Math.sin(a) * 0.7; out.push([Math.round(x), Math.round(y), depth]); if (depth < 2 && s % 4 === 3) grow(x, y, a + (s & 4 ? 0.9 : -0.9), len * 0.4, depth + 1, seed + s * 3); } };
  for (let k = 0; k < 7; k++) grow(0, 0, (k / 7) * 6.28 + 0.2, 15 + H(k, 9) * 9, 0, k * 11);
  return out;
})();
const scorchB = (c, e, heat) => {
  const f = scorchMask(19, 5);
  for (let y = -12; y <= 12; y++) for (let x = -26; x <= 26; x++) { const d = f(x, y); if (d > 1.1) continue; let col = d < 0.5 ? "#1d1517" : d < 0.85 ? "#33262a" : "#4a3a32"; if (d > 0.95 && bay(x, y) > 0.5) continue; px(c, x, y, col); }
  for (const [x, y, depth] of crackPts) {
    const col = heat > 0.75 ? "#ffd890" : heat > 0.5 ? "#ffa044" : heat > 0.28 ? "#d0502c" : heat > 0.08 ? "#7c2c24" : "#3c2c2c";
    px(c, x, y, depth ? mix(col, "#2a1c1c", 0.35) : col);
    if (heat > 0.5 && !depth) px(c, x, y + 1, "#7c2c24", 0.5);
  }
  if (heat > 0.4) px(c, 0, 0, "#ffffff");
};
const steam = (c, e, from) => {
  for (const P of BOLT_POOLS) for (let k = 0; k < 4; k++) {
    const age = ((e.i - from + k * 1.6 + H(P.seed, k) * 3) % 6 + 6) % 6; if (e.i < from) continue;
    const x = P.x + (H(P.seed, k, 3) - 0.5) * P.rx * 1.2 + Math.sin(age + k) * 1.5, y = P.y - 3 - age * 3.5, r = 3 + age * 0.8, a = clamp(1.25 - age / 6);
    dither(c, x, y, r * 1.5, r, age < 2 ? "#eef2f6" : "#c4ccd6", a, e);
  }
};
const crawl = (c, e) => {
  const q = e.i - 2; if (q < 1 || q > 5) return;
  for (let k = 0; k < 6; k++) {
    let x = 0, y = 0, a = (k / 6) * 6.28 + 0.4; const L = Math.min(30, q * 8), keep = 1 - (q - 1) / 5;
    for (let s = 0; s < L; s++) {
      a += (H(k, s, 61 + (e.i & 1)) - 0.5) * 1.1; x += Math.cos(a) * 1.3; y += Math.sin(a) * 0.55;
      if (s > L - 7 - q && bay(Math.round(x), Math.round(y)) > keep + 0.35) continue;
      px(c, Math.round(x), Math.round(y), s > L - 4 ? "#ffffff" : "#bcd0ff", 0.95); px(c, Math.round(x), Math.round(y) + 1, "#7c98e8", 0.35);
    }
  }
};
const boltB = (c, e) => {
  const i = e.i;
  boltBase(c, e, i === 2 ? 0.45 : 0);
  if (i < 2) dither(c, 0, 4, 9 + i * 4, 4 + i * 2, i ? "#e4ecff" : "#9ab4ff", 0.6, e);
  drawBolt(c, e, i === 4 ? 12 : 11, i === 2 || i === 3 || i === 5, BOLT_TIME[i]);
  if (i >= 3) scorchB(c, e, clamp(1 - (i - 3) / 8.5));
  if (i >= 2 && i <= 6) dither(c, 0, 1, 13 - (i - 2), 6 - (i - 2) * 0.6, i < 4 ? "#ffffff" : "#bcd0ff", 0.95 - (i - 2) * 0.12, e);
  crawl(c, e);
  if (i >= 3) steam(c, e, 3);
};
const shadowOf = (c, fx, fy, a, L) => {
  const dxn = fx, dyn = fy, m = Math.hypot(dxn, dyn) || 1, ux = dxn / m, uy = dyn / m;
  for (let s = 0; s <= L; s++) { const cx = fx + ux * s, cy = fy + uy * s * 0.5, hw = 6.5 * (1 - s / L * 0.7) + 1; for (let k = -Math.ceil(hw); k <= Math.ceil(hw); k++) { const x = Math.round(cx), y = Math.round(cy + k * 0.6); if (Math.abs(k) < hw - 0.5 || bay(x, y) < 0.5) px(c, x, y, "#05070f", Math.min(1, a * 1.2)); } }
};
const boltC = (c, e) => {
  const i = e.i, fl = i === 2 ? 0.5 : i === 3 ? 0.2 : i === 5 ? 0.1 : 0;
  boltBase(c, e, fl);
  const G = [{ x: 36, y: 14 }, { x: -38, y: 16 }];
  if (i < 2) dither(c, 0, 4, 9 + i * 4, 4 + i * 2, i ? "#e4ecff" : "#9ab4ff", 0.6, e);
  if (i >= 2 && i <= 5) for (const g of G) shadowOf(c, g.x, g.y - 2, i === 2 ? 0.75 : i === 3 ? 0.65 : i === 4 ? 0.5 : 0.25, i === 2 ? 30 : 24);
  if (i >= 3) scorchB(c, e, clamp(1 - (i - 3) / 8.5));
  for (const g of G) { const s = e.foe(0); c.drawImage(s.cv, Math.round(g.x - s.ax), Math.round(g.y - s.ay)); }
  drawBolt(c, e, i === 4 ? 12 : 11, i === 2 || i === 3 || i === 5, BOLT_TIME[i]);
  if (i >= 2 && i <= 6) dither(c, 0, 1, 16 - (i - 2), 7 - (i - 2) * 0.6, i < 4 ? "#ffffff" : "#bcd0ff", 0.98 - (i - 2) * 0.12, e);
  crawl(c, e);
  if (i >= 3) steam(c, e, 3);
};

export const ROWS = [
  {
    id: "puddles", label: "Rain puddles and wet road", group: "Round 4", cw: 160, ch: 112, ax: 80, ay: 56, N: 10, today: puddlesToday, A: (c, e) => poolScene(c, e, CFG_A), B: (c, e) => poolScene(c, e, CFG_B), C: (c, e) => poolScene(c, e, CFG_C),
    note: "A road strip with its grass verge in a full storm, soaking over 10 frames (one pass). TODAY: one ruffled slate ellipse, the same blue on mud and turf, fading in. A: ground-coloured water (mud on the road, dark green on the turf), a dark far lip and a lit near rim, growing from the middle, one streak of sky, a few rings. B: puddles in the ruts and in hollows, irregular, joining as the ground soaks; slow clouds drifting over them; overlapping drop rings; run-off trickling off the verge with a bead racing down it. C: B plus a lightning flash (frame 6) mirrored in every pool and gusts rippling the water. The road is a narrower stretch than the game's.",
  },
  {
    id: "flood", label: "Flooded road", group: "Round 4", cw: 210, ch: 150, ax: 105, ay: 75, N: 8, today: floodToday, A: floodA, B: floodB, C: floodC,
    note: "A stretch of road under water (8 frames, loops; a goblin walks through in TODAY and C). TODAY: the game's discs with the road's silty texture and a wake. A: clean pixel water edge, a lit scum rim, stepped shallows, quiet sky streaks and rings. B: a foamy edge that creeps in and out, a current running across the road, debris (a plank, leaves, a branch) drifting with it (the debris drift once; it does not wrap). C: B plus a goblin wading: legs under, a broken ring round the shins, a V wake behind, drops on his steps.",
  },
  {
    id: "bolt", label: "Lightning strikes the ground", group: "Round 4", cw: 120, ch: 150, ax: 60, ay: 118, N: 12, today: boltToday, A: boltA, B: boltB, C: boltC,
    note: "A strike on a wet road beside two puddles (12 frames, one pass: glow gathers, white flash at frame 2, bolt, flicker, fade, then the scorch lingers). TODAY: the game's bolt, glow, motes and scorch. A: more bolt frames (flash, bright, flicker, bright, dim) and a clean stepped scorch with a hot ember that cools. B: a branching crawl of arcs across the wet ground, steam rising off the puddles, a scorch whose cracks glow white-gold then orange, red, dead. C: B plus a white flash frame and short shadows thrown by two goblins standing there, pointing away from the strike.",
  },
];
