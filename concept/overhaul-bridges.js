// ============ THE OVERHAUL: BRIDGES (concept round, 2026-11-22) ============
// Three bold directions for a bridge and how a river meets it (art/briefs/overhaul-concepts.md):
//   A "The humpback"        a stone bridge with real height: arches, voussoirs, cutwater starlings,
//                           a crowned deck, parapets with coping, a wayside lantern and shrine.
//   B "The timber trestle"  heavy carpentry: pile bents with cross bracing, a level deck of baulks
//                           high on its piles, truss rails, a toll hut and banner posts.
//   C "The weir crossing"   the river is ENGINEERED: the road runs on a dam; a still millpond above,
//                           a stepped spillway of white water below, sluice gear (and a mill wheel).
// Painted here at ART-pixel scale (1 px = half a board unit) on an 840 x 560 patch (420 x 280 board
// units), then shown x2. The game's own figures (pix/bake.js) and Archer hall (pix/halls.js) stand
// in it for scale. Nothing under src/ is changed.
import { PIX } from "../src/render/pix/pixrigs.js";
import { bakeFrame } from "../src/render/pix/bake.js";
import { hallPix } from "../src/render/pix/halls.js";
import * as archerHall from "../src/render/pix/hall-archer.js";
import * as bowman from "../src/render/pix/fig-bowman.js";
import { SUN_POS } from "../src/data/sun.js";

export const W = 840, H = 560;

// ---------------------------------------------------------------- kit
const CC = new Map();
const C = (h) => { if (typeof h !== "string") return h; let c = CC.get(h); if (!c) CC.set(h, (c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)])); return c; };
const mix = (a, b, t) => { a = C(a); b = C(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vn = (X, Y, s = 0) => {
  const x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (X, Y, s = 0) => vn(X, Y, s) * 0.62 + vn(X * 2.1, Y * 2.1, s + 9) * 0.38;

class Layer {
  constructor() { this.d = new Uint8ClampedArray(W * H * 4); }
  p(x, y, c, a = 1) {
    x = Math.round(x); y = Math.round(y);
    if (c == null || x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
    c = C(c); const i = (y * W + x) * 4, d = this.d;
    if (a >= 1 || d[i + 3] === 0) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a >= 1 ? 255 : a * 255; return; }
    d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a;
  }
  r(x, y, w, h, c, a = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c, a); }
  has(x, y) { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < W && y < H && this.d[(y * W + x) * 4 + 3] > 0; }
  get(x, y) { const i = (Math.round(y) * W + Math.round(x)) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
  dark(x, y, c, a) { if (this.has(x, y)) this.p(x, y, c, a); }
  canvas() { const cv = document.createElement("canvas"); cv.width = W; cv.height = H; cv.getContext("2d").putImageData(new ImageData(this.d, W, H), 0, 0); return cv; }
}
const line = (L, x0, y0, x1, y1, c, th = 1) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1;
  for (let s = 0; s <= n; s++) { const x = x0 + ((x1 - x0) * s) / n, y = y0 + ((y1 - y0) * s) / n; L.r(Math.round(x), Math.round(y), th, th, c); }
};
const disc = (L, cx, cy, rx, ry, c, a = 1) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) L.p(cx + x, cy + y, c, a); };

// ---------------------------------------------------------------- palettes
const PAL = {
  green: {
    grass: ["#3f7f2a", "#5fa636", "#6cb23a", "#80c246", "#a2da62"], dirt: ["#6e4e2c", "#9a7244", "#b48a52", "#c89e62", "#dcb87e"],
    earth: ["#3a2820", "#5a3e28", "#76553a", "#94704c"], stone: ["#4c4450", "#7a7066", "#988c7a", "#b6aa90", "#d2c8ac"],
    wood: ["#38241a", "#573a24", "#76512f", "#986c40", "#b88a58"], reed: ["#4a6a2a", "#6e8c34", "#a8a84e"],
    gravel: ["#8a8070", "#a89c86", "#c6bca2", "#dcd4bc"], banner: ["#24384f", "#3a5474", "#5a78a0"], road: "dirt",
  },
  iron: {
    grass: ["#3f5a2c", "#5a7638", "#62803e", "#728e46", "#8ca45a"], dirt: ["#5c5a52", "#7c786c", "#a09a88", "#b4ae9a", "#c8c2ae"],
    earth: ["#30282a", "#4a3e36", "#64564a", "#7c6e5e"], stone: ["#44464e", "#6e7076", "#8a8c92", "#a6a8ac", "#c2c4c6"],
    wood: ["#2e2420", "#4a3a2e", "#66503c", "#82684c", "#9c8264"], reed: ["#4e5e30", "#6a7a3c", "#9a9858"],
    gravel: ["#7a7670", "#96928a", "#b2ada2", "#cac6bc"], banner: ["#4a1a1e", "#7a2a2c", "#a4443e"], road: "flags",
  },
};
const WATER = { deep: "#1f4272", d2: "#2a5886", mid: "#3a6e9e", sh: "#5a92b4", bed: "#86b8bc", pale: "#b6d6d2", foam: "#eef6f2", glint: "#f2e6b8", gloom: "#16202e" };
const INK = "#2a2030";

// ---------------------------------------------------------------- the sun
const sunOf = (id) => {
  const s = SUN_POS[id] || SUN_POS.noon, gold = id !== "noon";
  return { id, gold, sx: gold ? s.fall[0] * s.len : 0.55, sy: gold ? s.fall[1] * s.len : 0.38, shade: gold ? s.shade : [42, 28, 44, 0.32], col: C(s.col), warm: s.warm };
};
// lit ground warms, shade cools (never a tint over all: what is in shadow stays cool)
const litC = (S, c) => { c = C(c); if (!S.warm) return c; const w = 0.55 * S.warm; return [c[0] + (Math.min(255, c[0] * 1.16 + 18) - c[0]) * w, c[1] + (c[1] * 1.0 + 4 - c[1]) * w, c[2] + (c[2] * 0.74 - c[2]) * w]; };
const shadeC = (S, c, k = 1) => { c = C(c); const a = S.shade[3] * k * (S.gold ? 1.25 : 1); return mix(c, [S.shade[0], S.shade[1], S.shade[2]], a); };

// ashlar: u along the face, v UP the face (ints); pal = stone ramp; returns a colour
const ashlar = (u, v, P, seed = 0, ch = 5, lo = 7, hi = 13, k = 0) => {
  const row = Math.floor(v / ch), bv = v - row * ch, off = Math.floor(hash(row, 7, seed) * 17);
  let uu = u + off, bi = 0, start = 0;
  // variable block lengths along a course
  const len = (i) => lo + Math.floor(hash(i, row, seed + 3) * (hi - lo));
  bi = Math.floor(uu / ((lo + hi) / 2)); start = bi * ((lo + hi) / 2);
  const L = len(bi); const bu = uu - start;
  if (bv === 0 || (bu | 0) === 0 || ((bu | 0) === Math.round(L) && L < (lo + hi) / 2)) return P[0];
  const t = hash(bi, row, seed + 1);
  let c = t < 0.28 ? P[1 + k] : t < 0.86 ? P[2 + k] : P[Math.min(4, 3 + k)];
  if (bv === ch - 1) c = P[Math.min(4, 3 + k)];
  return c;
};

// ---------------------------------------------------------------- figures and hall
const figOf = (type, view) => (view ? PIX[type].views[view === "front" ? "front" : "back"] : PIX[type].fig);
const FIGS = [];
// queue a figure: ground (gx, gy), lift z; f frame; left mirrored; view null|front|back
const fig = (type, gx, gy, z = 0, o = {}) => FIGS.push({ type, gx, gy, z, ...o });
const drawFig = (ctx, S, F) => {
  const m = figOf(F.type, F.view), clip = F.clip || "walk", n = m.CLIPS[clip].n;
  const rec = bakeFrame(m, clip, (F.f || 0) % n, { flip: !F.view && !!F.left });
  const x = Math.round(F.gx), y = Math.round(F.gy - F.z);
  // its shadow on whatever it stands on
  const len = S.gold ? 10 : 0;
  ctx.fillStyle = `rgba(${S.shade[0]},${S.shade[1]},${S.shade[2]},${S.gold ? 0.42 : 0.3})`;
  for (let j = -2; j <= 2; j++) { const w = Math.round((8 + len) * Math.sqrt(1 - (j * j) / 6.5)); ctx.fillRect(x - w + 2 + (S.gold ? len : 0), y + j, w * 2, 1); }
  ctx.save(); ctx.translate(x, y); if (!F.view && F.left) ctx.scale(-1, 1);
  ctx.drawImage(rec.cv, -rec.ox, -rec.oy); ctx.restore();
};
const drawHall = (ctx, gx, gy, level = 3) => {
  const Hh = hallPix("archer", archerHall, { level }, 1);
  const B = Hh.box;
  if (Hh.shadow) ctx.drawImage(Hh.shadow.cv, gx - Hh.shadow.ox, gy - Hh.shadow.oy);
  ctx.drawImage(Hh.back, gx - B.ox, gy - B.oy);
  for (const c of (Hh.spec.crew || [])) {
    try { const rec = bakeFrame(bowman, "idle", 2, { flip: c.dir < 0, variant: c.variant || "" }); ctx.save(); ctx.translate(gx + c.x, gy + c.y); if (c.dir < 0) ctx.scale(-1, 1); ctx.drawImage(rec.cv, -rec.ox, -rec.oy); ctx.restore(); } catch (e) { /* the building alone */ }
  }
  if (Hh.front) ctx.drawImage(Hh.front, gx - B.ox, gy - B.oy);
};

// ---------------------------------------------------------------- the ground and water pass
// sc: { water(x,y), drop(x,y) screen-space drop of the water there, road(x,y) -> edge distance or -1,
//       flow [fx,fy], calm(x,y) 0..1, extra(x,y) -> colour|null (gravel, paths, kerbs on land),
//       wextra(gx,gy,d) -> colour|null (bars and pads in the water), revet(x) -> bool (stone bank faces) }
const paintBase = (sc, S, P, SH) => {
  const L = new Layer();
  // water mask and distance to land (chamfer), in ground coordinates
  const M = new Uint8Array(W * H), D = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const w = sc.water(x, y) ? 1 : 0; M[y * W + x] = w; D[y * W + x] = w ? 1e4 : 0; }
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 1e4 : D[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!M[i]) continue; D[i] = Math.min(D[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.41, at(x + 1, y - 1) + 1.41); }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!M[i]) continue; D[i] = Math.min(D[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.41, at(x - 1, y + 1) + 1.41); }
  sc.D = D;
  const G = P.grass, Dr = P.dirt, E = P.earth;
  const land = (x, y) => x >= 0 && y >= 0 && x < W && y < H ? !M[y * W + x] : true;
  const grassAt = (x, y) => {
    const n = fbm(x / 70, y / 60, 1), m = vn(x / 11, y / 9, 2), h = hash(x, y, 5);
    let c = n > 0.62 ? G[3] : n > 0.3 ? G[2] : G[1];
    // the edges between tones break up in a few stray pixels, never a camouflage
    if (Math.abs(n - 0.62) < 0.025 || Math.abs(n - 0.36) < 0.025) c = h < 0.5 ? (n > 0.5 ? G[3] : G[2]) : (n > 0.5 ? G[2] : G[1]);
    if (m > 0.8 && n > 0.45) c = G[3];
    // tufts: a dark blade under a light one
    if (h > 0.988) c = G[0]; else if (hash(x, y + 1, 5) > 0.988) c = G[4];
    if (P.road !== "flags" && hash(x >> 1, y >> 1, 77) > 0.9988) c = ["#f0e6b0", "#f4f0e8", "#e8b8c4"][Math.floor(hash(x, y, 8) * 3)];
    return c;
  };
  const roadAt = (x, y, e) => {
    const h = hash(x, y, 11);
    if (P.road === "flags") {
      // flagstones in staggered courses, a darker kerb
      if (e < 2) return Dr[0];
      if (e < 4) return Dr[1];
      const ax = sc.flagAxis === "y" ? y : x, ay = sc.flagAxis === "y" ? x : y;
      const row = Math.floor(ay / 9), off = (row % 2) * 7 + Math.floor(hash(row, 2, 4) * 5), bx = Math.floor((ax + off) / 14);
      if ((ay % 9) === 0 || ((ax + off) % 14) === 0) return Dr[1];
      const t = hash(bx, row, 6); let c = t < 0.3 ? Dr[2] : t < 0.85 ? Dr[3] : Dr[4];
      if (h > 0.97) c = Dr[1];
      return c;
    }
    if (e < 1.5) return Dr[0];
    if (e < 4.5) return h < 0.35 ? grassAt(x, y) : Dr[1];
    const n = fbm(x / 26, y / 18, 3);
    let c = n > 0.6 ? Dr[4] : n > 0.38 ? Dr[3] : Dr[2];
    if (h > 0.986) c = Dr[0]; else if (h > 0.972) c = Dr[4];
    if (e < 7 && h < 0.5) c = Dr[2];
    return c;
  };
  const [fx, fy] = sc.flow;
  const waterAt = (gx, gy) => {
    const d0 = at(gx, gy), calm = sc.calm ? sc.calm(gx, gy) : 0;
    const d = d0 + (vn(gx / 9, gy / 9, 21) - 0.5) * 6 - calm * 2;
    const along = gx * fx + gy * fy, across = -gx * fy + gy * fx;
    let c;
    if (d < 2.2) c = WATER.pale; else if (d < 5.5) c = WATER.bed; else if (d < 12) c = WATER.sh; else if (d < 22) c = WATER.mid; else if (d < 34) c = WATER.d2; else c = WATER.deep;
    const we = sc.wextra && sc.wextra(gx, gy, d0);
    if (we) return we;
    if (d0 < 1.5) return hash(gx, gy, 3) < 0.5 ? "#4a5e4e" : WATER.bed;    // the wet line
    if (d > 4 && d < 12 && hash(gx >> 1, gy >> 1, 31) > 0.93) c = "#a2b89c";   // pebbles on the bed
    // the current: long broken streaks along the flow
    const s = vn(along / (calm > 0.5 ? 40 : 11), across / 1.6, 13);
    const sth = 0.77 + calm * 0.14;
    if (d > 6 && s > sth) c = s > sth + 0.1 && d > 12 ? WATER.pale : (c === WATER.deep ? WATER.d2 : c === WATER.d2 ? WATER.mid : WATER.sh);
    if (calm > 0.5 && d > 14 && vn(gx / 30, gy / 10, 5) > 0.7) c = mix(c, "#7ea8c8", 0.2);    // the sky in still water
    if (S.gold && d > 8 && hash(gx, gy, 41) > 0.992) c = WATER.glint;
    return c;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c, sh = 0;
    if (land(x, y)) {
      const ex = sc.extra && sc.extra(x, y);
      if (ex) c = ex;
      else { const e = sc.road(x, y); c = e >= 0 ? roadAt(x, y, e) : grassAt(x, y); }
      if (SH) { const ld = sc.landDrop || 8, X = Math.round(x + S.sx * ld), Y = Math.round(y + S.sy * ld); sh = X < W && Y < H ? SH[Y * W + X] : 0; }
    } else {
      const wz = sc.drop(x, y);
      let k = 0;
      for (let j = 1; j <= wz; j++) if (land(x, y - j)) { k = j; break; }
      if (k) {
        // the bank's face, earth (or dressed stone by a bridge)
        if (sc.revet && sc.revet(x, y - k)) c = k === 1 ? P.stone[4] : k === wz ? P.stone[0] : ashlar(x, wz - k, P.stone, 3, 4, 6, 10);
        else if (k === 1) c = G[0];
        else if (k >= wz - 1) c = E[0];
        else { const n = vn(x / 5, (y - k) / 3, 4) + (hash(x, k, 9) - 0.5) * 0.3; c = n > 0.62 ? E[3] : n > 0.4 ? E[2] : E[1]; if (hash(x, y, 4) > 0.95) c = P.gravel[1]; }
      } else {
        const gy = y - wz;
        c = waterAt(x, gy);
        sh = SH ? SH[gy * W + x] || 0 : 0;
        if (sc.gloom && sc.gloom(x, gy)) sh = Math.max(sh, 2);
      }
    }
    c = litC(S, c);
    if (sh) c = sh === 2 ? mix(c, WATER.gloom, 0.62) : shadeC(S, c, 1.25);
    L.p(x, y, c);
  }
  return L;
};

// foam: a white tongue from (x0, y0) along (dx, dy) on the water's SCREEN position
const tongue = (L, x0, y0, dx, dy, len, wid, seed, gloomy = false) => {
  // clumped white water: a bright core breaking into lumps and flecks, fading downstream
  const nx = -dy, ny = dx;
  for (let s = 0; s < len; s++) {
    const f = s / len, w = wid * (1 - f * 0.55) * (0.75 + 0.25 * vn(s / 5, seed, seed)) + f * wid * 0.6;
    for (let t = -w; t <= w; t += 0.5) {
      const n = vn(s / 3.2 + seed, t / 1.6, seed), e = Math.abs(t) / (w + 0.01);
      const keep = 1.05 - f * 0.95 - e * 0.45;
      if (n < keep * 0.85) {
        const x = x0 + dx * s + nx * t, y = y0 + dy * s + ny * t;
        L.p(x, y, n < keep * 0.45 ? WATER.foam : WATER.pale, gloomy ? 0.7 : 1);
      } else if (hash(Math.round(s), Math.round(t * 2), seed) > 0.985 - f * 0.01) L.p(x0 + dx * s + nx * t, y0 + dy * s + ny * t, WATER.pale);
    }
  }
};
const reeds = (L, P, x, y, n, seed) => {
  for (let i = 0; i < n; i++) {
    const rx = x + Math.round((hash(i, 1, seed) - 0.5) * 18), ry = y + Math.round((hash(i, 2, seed) - 0.5) * 8), h = 5 + Math.floor(hash(i, 3, seed) * 7);
    for (let j = 0; j < h; j++) L.p(rx + (j > h - 3 && hash(i, 4, seed) > 0.5 ? 1 : 0), ry - j, j > h - 2 ? P.reed[2] : j < 2 ? P.reed[0] : P.reed[1]);
    if (hash(i, 5, seed) > 0.7) { L.p(rx, ry - h, "#7a4a2a"); L.p(rx, ry - h - 1, "#7a4a2a"); L.p(rx, ry - h + 1, "#5a3420"); }
  }
};
const skiff = (L, P, x, y, left = false) => {
  // a small moored rowing boat: hull, inside, thwart, oar; its painter (rope) to the stage
  const Wd = P.wood;
  for (let i = -11; i <= 11; i++) {
    const hw = Math.round(4.2 * Math.sqrt(1 - (i / 11.8) ** 2));
    for (let j = -hw; j <= hw; j++) L.p(x + i, y + j, Math.abs(j) === hw ? Wd[1] : j < 0 ? Wd[3] : Wd[2]);
    if (hw > 1) for (let j = -hw + 1; j < hw; j++) L.p(x + i, y + j, j <= -hw + 1 ? Wd[4] : "#3a281c");
    L.p(x + i, y + hw + 1, WATER.gloom, 0.45);
  }
  L.r(x - 1, y - 3, 3, 7, Wd[3]); L.r(x + 5, y - 3, 2, 7, Wd[3]);
  line(L, x - 8, y + 1, x + 9, y - 1, Wd[4]);
  for (let i = 0; i < 9; i++) L.p(x + (left ? -12 - i : 12 + i), y - 1 - (i > 4 ? 1 : 0), "#c8b48a");
};
const lantern = (L, x, y, glow = true) => {
  // a hanging iron lantern with its warm light (art px; y its top)
  L.r(x, y, 1, 3, INK); L.r(x - 2, y + 3, 5, 1, INK); L.r(x - 2, y + 4, 5, 5, INK); L.r(x - 1, y + 5, 3, 3, "#ffd27a"); L.p(x, y + 6, "#fff2c4"); L.r(x - 2, y + 9, 5, 1, INK);
  if (glow) for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const r = Math.hypot(i, j * 1.1); if (r < 9 && r > 3.5 && hash(x + i, y + j, 2) < 0.5 * (1 - r / 9)) L.dark(x + i, y + 6 + j, "#ffd88a", 0.35); }
};
const banner = (L, P, x, y, h = 16) => {
  // a pole-hung banner (crown blue for the Greenwood, oxblood for Iron) with a gold edge and a device
  const B = P.banner;
  for (let j = 0; j < h; j++) for (let i = 0; i < 8; i++) {
    const tail = j > h - 4 ? Math.abs(i - 3.5) < (h - j) * 1.3 : true;
    if (!tail) continue;
    L.p(x + i, y + j + Math.round(Math.sin((i + j) / 3) * 0.6), i === 0 ? B[0] : i === 7 ? B[0] : j === 0 ? "#d8b34a" : (i + j) % 7 === 0 ? B[2] : B[1]);
  }
  L.r(x + 3, y + 4, 2, 5, "#d8b34a"); L.p(x + 2, y + 5, "#d8b34a"); L.p(x + 5, y + 5, "#d8b34a");
  L.r(x - 1, y - 1, 10, 1, P.wood[1]);
};
// a post (square timber or stone pillar) standing at ground (gx, gy), height h: its south face + top
const post = (L, gx, gy, w, h, P, kind = "wood") => {
  const R = kind === "wood" ? P.wood : P.stone;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) L.p(gx + i, gy - j, i === 0 ? R[3] : i === w - 1 ? R[1] : (kind === "stone" && j % 5 === 0) ? R[1] : R[2]);
  for (let i = 0; i < w; i++) { L.p(gx + i, gy - h, R[4]); L.p(gx + i, gy - h - 1, R[3]); }
};


// a structure's cast shadow on the water plane, filled row by row (no gaps at a long golden-hour sun)
const shadowRows = (SH, S, along, a0, a1, w0, w1, hOf) => {
  for (let g = a0; g <= a1; g++) {
    const h = hOf(g), h2 = hOf(g + 1);
    let X0, X1, Y0, Y1;
    if (along === "y") { X0 = w0 + S.sx * h; X1 = w1 + S.sx * h; Y0 = g + S.sy * h; Y1 = g + 1 + S.sy * h2; }
    else { X0 = g + S.sx * h; X1 = g + 1 + S.sx * h2; Y0 = w0 + S.sy * h; Y1 = w1 + S.sy * h; }
    for (let y = Math.round(Math.min(Y0, Y1)); y <= Math.round(Math.max(Y0, Y1)); y++) for (let x = Math.round(Math.min(X0, X1)); x <= Math.round(Math.max(X0, X1)); x++) if (x >= 0 && y >= 0 && x < W && y < H) SH[y * W + x] = 1;
  }
};

// ---------------------------------------------------------------- scene frames
const R1 = { cx: 430, hw: 50 };    // scene 1: the river down the screen
const RD1 = { cy: 300, hw: 44 };   // scene 1: the road across
const R2 = { cy: 270, hw: 50 };    // scene 2: the river across
const RD2 = { cx: 420, hw: 44 };   // scene 2: the road up

// scene 1's river: a meander, a pool above the bridge where the option asks, wider than today x2
const river1 = (o = {}) => (x, y) => {
  const wob = Math.sin(y / 70) * 10 + Math.sin(y / 23 + 1) * 3;
  let hw = R1.hw + Math.sin(y / 41) * 3;
  if (o.pool) hw += o.pool * clamp((230 - y) / 80, 0, 1) * (0.8 + 0.2 * Math.sin(y / 17));
  if (o.tail) hw += o.tail * clamp((y - 400) / 120, 0, 1);
  const cx = R1.cx + wob * clamp(Math.abs(y - 300) / 90, 0, 1);
  return Math.abs(x - cx) < hw;
};
const river2 = (o = {}) => (x, y) => {
  const wob = Math.sin(x / 80) * 9 + Math.sin(x / 27 + 2) * 3;
  let hw = R2.hw + Math.sin(x / 45) * 3;
  if (o.pool) hw += o.pool * clamp((330 - x) / 90, 0, 1) * (0.85 + 0.15 * Math.sin(x / 19));
  const cy = R2.cy + wob * clamp(Math.abs(x - 420) / 100, 0, 1);
  return Math.abs(y - cy) < hw;
};
const road1 = (x, y) => { const e = RD1.hw - Math.abs(y - RD1.cy) + (vn(x / 9, 3, 7) - 0.5) * 2; return e >= 0 ? e : -1; };
const road2 = (x, y) => { const e = RD2.hw - Math.abs(x - RD2.cx) + (vn(y / 9, 5, 7) - 0.5) * 2; return e >= 0 ? e : -1; };

// a path down to the water (a strip of bare earth), as an `extra` painter
const pathStrip = (P, pts, w = 3) => (x, y) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], vx = bx - ax, vy = by - ay, t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy), 0, 1);
    const d = Math.hypot(x - ax - vx * t, y - ay - vy * t);
    if (d < w) return d > w - 1 ? P.dirt[1] : hash(x, y, 3) > 0.8 ? P.dirt[4] : P.dirt[2];
  }
  return null;
};


// THE SLANTED WEST FACE (the castle's convention: a wall running up the screen shows its top and a
// slanting west face). For an up-screen span: (gy, z) on the face is drawn at
// x = x0 - K * (ztop - z), y = gy - z, so the face leans out at its foot and its width follows the
// height: the hump, the arches and the piles all read. col(gy, z) -> colour | null (see-through).
const KF = 0.85;
const westFace = (L, x0, ya, yb, ztop, zbot, col) => {
  for (let gy = ya; gy <= yb; gy++) {
    const zt = ztop(gy), zb = zbot(gy);
    for (let z = zb; z <= zt; z += 0.5) {
      const c = col(gy, Math.round(z)); if (!c) continue;
      const sx = x0 - KF * (zt - z), sy = gy - z;
      L.p(Math.floor(sx), Math.round(sy), c); L.p(Math.floor(sx) + 1, Math.round(sy), c);
    }
  }
};

// ================================================================ A: THE HUMPBACK
// across: the span runs along x; we see its whole south elevation
const humpAcross = (P, o = {}) => {
  const y0 = 250, y1 = 350, cx = R1.cx, xa = 314, xb = 546, Hc = 34, PH = o.iron ? 13 : 12, half = 116, WZ = 12;
  const z = (x) => Hc * Math.max(0, 1 - ((x - cx) / half) ** 2);
  const opens = [[378, 405], [415, 445], [455, 482]], zs = -4, piers = [410, 450], AH = 1.75;
  const sc = {
    flow: [0, 1], water: river1({ pool: 30, tail: 6 }), drop: () => WZ, road: road1,
    calm: (x, y) => clamp((235 - y) / 60, 0, 1),
    revet: (x) => x > 340 && x < 520,
    gloom: (x, y) => x > 376 && x < 484 && y > 330 && y < 352,
  };
  const zAt = (x) => (x >= xa && x <= xb ? z(x) : 0);
  // gravel bars in the slack below the abutments, a path down to a landing in the pool
  const bars = [[392, 392, 16, 30, 1], [470, 410, 14, 34, 2]];
  sc.wextra = (gx, gy, d) => {
    for (const [bx, by, rx, ry, s] of bars) { const q = ((gx - bx) / rx) ** 2 + ((gy - by) / ry) ** 2 + (vn(gx / 6, gy / 6, s) - 0.5) * 0.7; if (q < 1 && d < 22) return q > 0.8 ? WATER.bed : P.gravel[Math.floor(hash(gx, gy, s) * 3.6)]; }
    return null;
  };
  sc.extra = pathStrip(P, [[506, 252], [500, 228], [488, 212], [482, 200]], 3);
  const shadow = (SH, S) => shadowRows(SH, S, "x", xa, xb, y0, y1, (x) => zAt(x) + PH + WZ);

  const back = (L, S) => {
    const St = P.stone;
    for (let x = xa; x <= xb; x++) {
      const zz = zAt(x), dz = zAt(x + 1) - zAt(x - 1);
      // the north parapet: coping on top, its inner (south-facing) face toward us
      for (let gy = y0; gy < y0 + 6; gy++) L.p(x, gy - zz - PH, gy === y0 ? St[2] : ((x + 3) % 11 === 0 ? St[2] : St[4]));
      for (let v = 0; v < PH; v++) { const crenel = o.iron && v >= PH - 6 && ((x - xa) % 14) >= 8; if (!crenel) L.p(x, y0 + 6 - zz - v, ashlar(x, v, St, 5, 4, 6, 11)); }
      // the deck: setts in courses, the rise toward the sun lit, the fall away shaded
      for (let gy = y0 + 6; gy < y1 - 6; gy++) {
        const row = Math.floor(gy / 5), off = (row % 2) * 4, cell = Math.floor((x + off) / 8);
        let c = (gy % 5) === 0 ? St[1] : ((x + off) % 8) === 0 ? mix(St[1], St[2], 0.5) : hash(cell, row, 2) < 0.3 ? St[2] : hash(cell, row, 2) < 0.92 ? St[3] : St[4];
        if (o.iron) c = ((gy % 9) === 0 || ((x + (Math.floor(gy / 9) % 2) * 7) % 14) === 0) ? St[1] : hash(Math.floor((x + (Math.floor(gy / 9) % 2) * 7) / 14), Math.floor(gy / 9), 3) < 0.4 ? St[2] : St[3];
        if (dz > 0.25) c = mix(c, St[4], 0.35); else if (dz < -0.25) c = mix(c, St[0], 0.3);
        if (Math.abs(dz) <= 0.25) c = mix(c, St[4], 0.12);
        if (Math.abs(gy - y0 - 6) < 2) c = St[1];
        L.p(x, gy - zz, c);
      }
    }
    // the iron crenels show the sky behind: clear them where the merlons stop
  };
  const front = (L, S) => {
    const St = P.stone;
    for (let x = xa; x <= xb; x++) {
      const zz = zAt(x), wet = sc.water(x, y1 + 2), zb = wet ? -WZ : 0;
      for (let zv = zb; zv <= zz + PH; zv++) {
        const sy = y1 - zv; let c = null;
        // which arch (if any)
        let inArch = false, vou = false, keystone = false, op = null;
        for (const [a, b] of opens) {
          const c0 = (a + b) / 2, r = (b - a) / 2, d = Math.hypot(x - c0, Math.max(0, zv - zs) / AH);
          if (x >= a - 6 && x <= b + 6) {
            if (zv < zs + 0.01 ? (x >= a && x <= b) : d < r) { inArch = true; op = [a, b, c0, r]; }
            else if (d < r + 5 && zv >= zs) { vou = true; op = [a, b, c0, r]; const ang = Math.atan2((zv - zs) / AH, x - c0); keystone = Math.abs(ang - Math.PI / 2) < 0.16; const seg = (ang / (Math.PI / 11)) % 1; if (seg < 0.14 && !keystone) c = St[0]; }
          }
        }
        if (inArch) {
          const [a, b, c0, r] = op, top = zs + AH * Math.sqrt(Math.max(0, r * r - (x - c0) ** 2));
          // the barrel's gloom, the far opening's light, and water light on the soffit
          const far = Math.hypot(x - c0, Math.max(0, zv - zs) / AH) < r - 6;
          c = zv > top - 2 ? "#14121c" : far ? (zv < zs + 3 ? (hash(x, zv, 4) > 0.5 ? "#7aa2b6" : "#4e6a80") : "#2e3846") : "#1c1c28";
          if (!far && zv < zs + 2 && hash(x, zv, 8) > 0.55) c = "#3e5a6e";
          if (zv > top - 5 && zv <= top - 2 && hash(x >> 1, zv, 6) > 0.7) c = "#2c3c4c";   // ripple light on the soffit
          if (x === a || x === b) c = "#0e0c14";
        } else if (vou) {
          if (!c) { const [a, b, c0, r] = op, ang = Math.atan2((zv - zs) / AH, x - c0), k = Math.floor(ang / (Math.PI / 11)); c = keystone ? St[4] : k % 2 ? St[3] : St[2]; if (Math.hypot(x - c0, (zv - zs) / AH) > r + 4) c = St[1]; }
        } else if (zv > zz) {
          // the parapet's face above the string course
          const crenel = o.iron && zv > zz + PH - 6 && ((x - xa) % 14) >= 8;
          if (crenel) continue;
          c = ashlar(x, zv + 30, St, 7, 4, 6, 11);
        } else if (zv >= zz - 2) c = zv === zz - 2 ? St[0] : St[4];       // the string course at the deck's line
        else c = ashlar(x, zv + 12, St, 2, 5, 7, 13);
        // a few stains and moss where the water touches
        if (zv < zb + 3 && !inArch && hash(x, zv, 3) > 0.4) c = mix(c, "#3e5a3a", 0.45);
        if (!inArch && zv < zz && hash(x, zv, 12) > 0.993) c = "#5e7a3a";
        L.p(x, sy, c);
      }
      // the coping on the near parapet (its top), with the merlons' tops on Iron
      const ztop = zz + PH;
      for (let gy = y1 - 6; gy < y1; gy++) {
        const crenel = o.iron && ((x - xa) % 14) >= 8;
        L.p(x, gy - ztop + (crenel ? 6 : 0), crenel ? (gy < y1 - 3 ? St[1] : St[2]) : gy === y1 - 1 ? St[3] : ((x - xa) % (o.iron ? 14 : 11) === 0 ? St[2] : St[4]));
      }
      L.p(x, y1 - ztop - 6 + (o.iron && ((x - xa) % 14) >= 8 ? 6 : 0), INK);
    }
    // cutwater starlings on the downstream side, standing in the water
    for (const p of piers) {
      for (let x = p - 5; x <= p + 4; x++) {
        const tl = Math.round(12 * (1 - Math.abs(x + 0.5 - p) / 5.5));
        for (let gy = y1; gy <= y1 + tl; gy++) L.p(x, gy - 2, gy === y1 + tl ? St[2] : St[4]);
        for (let zv = -WZ; zv <= 2; zv++) L.p(x, y1 + tl - zv, x < p ? (zv === 2 ? St[4] : St[3]) : (zv === 2 ? St[3] : St[1]));
        L.p(x, y1 + tl + WZ + 1, "#3e5a3a");
      }
    }
    // the bridge-end newels: a lantern on the near west, a shrine on the far west (behind)
    post(L, xa - 1, y1, 9, PH + 9, P, "stone"); post(L, xb - 8, y1, 9, PH + 9, P, "stone");
    lantern(L, xa + 3, y1 - PH - 22);
    if (o.iron) { lantern(L, xb - 4, y1 - PH - 22); }
  };
  const backTop = (L) => {
    post(L, xa - 1, y0 + 6, 9, PH + 9, P, "stone"); post(L, xb - 8, y0 + 6, 9, PH + 9, P, "stone");
    if (!o.iron) {
      // a wayside shrine: a little gabled niche with a candle, on the far west newel
      const sx = xa - 2, sy = y0 + 6 - PH - 9;
      for (let j = 0; j < 12; j++) for (let i = 0; i < 11; i++) L.p(sx + i, sy - j, i === 0 ? P.stone[3] : i === 10 ? P.stone[1] : P.stone[2]);
      L.r(sx + 3, sy - 9, 5, 7, "#2a2030"); L.r(sx + 5, sy - 6, 1, 3, "#f4e8c0"); L.p(sx + 5, sy - 7, "#ffcf6a");
      for (let i = -1; i <= 11; i++) { const hh = 6 - Math.abs(i - 5) * 1; for (let j = 0; j < Math.max(1, hh); j++) L.p(sx + i, sy - 12 - j, j === Math.max(1, hh) - 1 ? "#c86a5a" : "#8a3e40"); }
    }
  };
  return { sc, z: zAt, back, backTop, front, shadow, y0, y1, xa, xb, PH };
};

// up: the span runs along y (up the screen); height shows by starlings, shadow and the deck's light
const humpUp = (P, o = {}) => {
  const x0 = 370, x1 = 470, ya = 158, yb = 382, cy = R2.cy, Hc = 34, PH = 12, half = 116, WZ = 12, zs = -4, AH = 1.7;
  const opens = [[222, 248], [256, 284], [292, 318]];
  const z = (y) => Hc * Math.max(0, 1 - ((y - cy) / half) ** 2);
  const zAt = (y) => (y >= ya && y <= yb ? z(y) : 0);
  const piers = [252, 288];
  const sc = {
    flow: [1, 0], water: river2({ pool: 28 }), drop: () => WZ, road: road2, landDrop: WZ,
    calm: (x, y) => clamp((340 - x) / 70, 0, 1),
    revet: (x) => x > 320 && x < 520,
    gloom: (x, y) => (x >= x1 && x < x1 + 5) || (x > x0 - 3 && x < x0),
  };
  const bars = [[530, 312, 30, 10, 1], [318, 232, 26, 8, 2]];
  sc.wextra = (gx, gy, d) => {
    for (const [bx, by, rx, ry, s] of bars) { const q = ((gx - bx) / rx) ** 2 + ((gy - by) / ry) ** 2 + (vn(gx / 6, gy / 6, s) - 0.5) * 0.7; if (q < 1 && d < 18) return q > 0.8 ? WATER.bed : P.gravel[Math.floor(hash(gx, gy, s) * 3.6)]; }
    return null;
  };
  sc.extra = pathStrip(P, [[366, 352], [340, 340], [318, 330]], 3);
  const shadow = (SH, S) => shadowRows(SH, S, "y", ya, yb, x0 - 4, x1, (gy) => zAt(gy) + PH + WZ);

  const back = (L, S) => {
    const St = P.stone;
    // the east starlings (downstream), under the deck's far edge
    for (const p of piers) {
      for (let x = x1; x <= x1 + 12; x++) {
        const hw = 4.5 * ((x1 + 12) - x) / 12; if (hw < 0.5) continue;
        const top = Math.round(p - hw), bot = Math.round(p + hw);
        for (let gy = top; gy <= bot; gy++) L.p(x, gy - 2, gy === top ? St[3] : St[4]);
        for (let zv = -WZ; zv <= 2; zv++) L.p(x, bot - zv, zv === 2 ? St[3] : St[1]);
      }
    }
    // the west face: arches, voussoirs, the string course, the parapet's outer face
    const onWater = (gy) => sc.water(x0 - 4, gy);
    westFace(L, x0, ya + 6, yb - 1, (gy) => zAt(gy) + PH, (gy) => (onWater(gy) ? -WZ : 0), (gy, zv) => {
      const zz = zAt(gy);
      for (const [a, b] of opens) {
        const c0 = (a + b) / 2, r = (b - a) / 2, d = Math.hypot(gy - c0, Math.max(0, zv - zs) / AH);
        if (gy >= a - 6 && gy <= b + 6) {
          if (zv < zs ? gy >= a && gy <= b : d < r) { const far = d < r - 5; return zv > zs + AH * Math.sqrt(Math.max(0, r * r - (gy - c0) ** 2)) - 2 ? "#14121c" : far ? (zv < zs + 3 ? (hash(gy, zv, 4) > 0.5 ? "#7aa2b6" : "#4e6a80") : "#2e3846") : "#1c1c28"; }
          if (d < r + 5 && zv >= zs) { const ang = Math.atan2((zv - zs) / AH, gy - c0), seg = (ang / (Math.PI / 11)) % 1; if (Math.abs(ang - Math.PI / 2) < 0.16) return St[4]; if (seg < 0.14) return St[0]; return Math.floor(ang / (Math.PI / 11)) % 2 ? St[4] : St[3]; }
        }
      }
      if (zv > zz) return zv >= zz + PH - 1 ? St[4] : ashlar(gy, zv + 30, St, 7, 4, 6, 11);
      if (zv >= zz - 2) return zv === zz - 2 ? St[1] : St[4];
      let c = ashlar(gy, zv + 12, St, 2, 5, 7, 13);
      if (zv < -WZ + 3 && hash(gy, zv, 3) > 0.4) c = mix(c, "#3e5a3a", 0.45);
      return c;
    });
    // the west starlings (upstream noses) at the face's foot
    for (const p of piers) {
      const fx = x0 - KF * (zAt(p) + PH + WZ);
      for (let i = 0; i <= 14; i++) {
        const x = Math.round(fx - i), hw = 4.5 * (1 - i / 14);
        const top = Math.round(p - hw), bot = Math.round(p + hw);
        for (let gy = top; gy <= bot; gy++) L.p(x, gy - 2, gy === top ? St[3] : St[4]);
        for (let zv = -WZ; zv <= 2; zv++) L.p(x, bot - zv, zv === 2 ? St[3] : zv < -WZ + 3 ? mix(St[1], "#3e5a3a", 0.4) : St[2]);
        L.p(x, top - 3, St[4]);
      }
    }
    for (let gy = ya; gy <= yb; gy++) {
      const zz = zAt(gy), s0 = Math.round(gy - zz), s1 = Math.max(s0, Math.round(gy + 1 - zAt(gy + 1)) - 1), dz = zAt(gy + 1) - zAt(gy - 1);
      for (let sy = s0; sy <= s1; sy++) for (let x = x0 + 6; x <= x1 - 6; x++) {
        const row = Math.floor(gy / 4), off = (row % 2) * 3, cell = Math.floor((x + off) / 6);
        let c = ((gy % 4) === 0 || ((x + off) % 6) === 0) ? St[1] : hash(cell, row, 2) < 0.3 ? St[2] : hash(cell, row, 2) < 0.9 ? St[3] : St[4];
        if (dz > 0.3) c = mix(c, St[4], 0.4); else if (dz < -0.3) c = mix(c, St[0], 0.3); else c = mix(c, "#fff3d2", 0.15);
        L.p(x, sy, c);
      }
      // the parapets: coping band, its course lines, a kerb inside
      for (const [px0, inner] of [[x0, x0 + 6], [x1 - 6, x1 - 6]]) for (let x = px0; x <= px0 + 6; x++) {
        for (let v = PH; v >= 0; v--) {
          const sy = s0 - v; let c = v >= PH - 1 ? (x === px0 || x === px0 + 6 ? St[2] : St[4]) : ashlar(gy, v, St, x, 4, 6, 10);
          if (x === inner) c = v >= PH - 1 ? St[3] : St[1];
          L.p(x, sy, c);
        }
      }
    }
  };
  const front = (L, S) => {
    // the near newels with the lantern and the shrine, at the south end; the far ones behind
    post(L, x0 - 1, yb, 8, PH + 9, P, "stone"); post(L, x1 - 6, yb, 8, PH + 9, P, "stone");
    lantern(L, x1 - 2, yb - PH - 22);
    const sx = x0 - 2, sy = yb - PH - 9;
    for (let j = 0; j < 12; j++) for (let i = 0; i < 11; i++) L.p(sx + i, sy - j, i === 0 ? P.stone[3] : i === 10 ? P.stone[1] : P.stone[2]);
    L.r(sx + 3, sy - 9, 5, 7, "#2a2030"); L.r(sx + 5, sy - 6, 1, 3, "#f4e8c0"); L.p(sx + 5, sy - 7, "#ffcf6a");
    for (let i = -1; i <= 11; i++) { const hh = 6 - Math.abs(i - 5); for (let j = 0; j < Math.max(1, hh); j++) L.p(sx + i, sy - 12 - j, j === Math.max(1, hh) - 1 ? "#c86a5a" : "#8a3e40"); }
  };
  const backTop = (L) => { post(L, x0 - 1, ya + 6, 8, PH + 9, P, "stone"); post(L, x1 - 6, ya + 6, 8, PH + 9, P, "stone"); };
  return { sc, z: zAt, back, backTop, front, shadow, ya, yb, x0, x1, PH, piers };
};

// ================================================================ B: THE TIMBER TRESTLE
const trestleAcross = (P) => {
  const y0 = 250, y1 = 350, xa = 316, xb = 544, Z = 20, RH = 22, ra = 376, rb = 484;
  const zAt = (x) => (x < xa || x > xb ? 0 : x < ra ? Z * (x - xa) / (ra - xa) : x > rb ? Z * (xb - x) / (xb - rb) : Z);
  const bents = []; for (let x = ra + 2; x <= rb - 2; x += 18) bents.push(x);
  const sc = {
    flow: [0, 1], water: river1({ tail: 10 }), drop: () => 8, road: road1,
    gloom: (x, y) => x > ra - 2 && x < rb + 2 && y > 326 && y < 352,
  };
  sc.wextra = (gx, gy, d) => { const q = ((gx - 395) / 14) ** 2 + ((gy - 420) / 36) ** 2 + (vn(gx / 6, gy / 6, 4) - 0.5) * 0.7; if (q < 1 && d < 20) return q > 0.8 ? WATER.bed : P.gravel[Math.floor(hash(gx, gy, 4) * 3.6)]; return null; };
  sc.extra = pathStrip(P, [[492, 352], [496, 372], [486, 392]], 3);
  const shadow = (SH, S) => shadowRows(SH, S, "x", xa, xb, y0, y1, (x) => zAt(x) + RH * 0.6 + 8);
  const Wd = P.wood;
  // a truss rail along ground row gy: posts at the bents, a top chord, X braces between (see-through)
  const truss = (L, gy, lit) => {
    for (let x = xa + 4; x <= xb - 4; x++) {
      const zz = zAt(x);
      for (let v = 0; v <= RH; v++) {
        const pi = Math.floor((x - ra) / 18), u = ((x - ra) % 18 + 18) % 18;
        const isPost = u < 3, chord = v >= RH - 2, rail = v <= 1;
        const t = v / RH, diag1 = Math.abs(u - (3 + t * 15)) < 1.1, diag2 = Math.abs(u - (18 - t * 15)) < 1.1;
        let c = null;
        if (chord) c = v === RH ? Wd[4] : Wd[lit ? 3 : 2];
        else if (rail) c = Wd[lit ? 2 : 1];
        else if (isPost) c = u === 0 ? Wd[lit ? 4 : 3] : u === 2 ? Wd[0] : Wd[lit ? 3 : 2];
        else if ((diag1 || diag2) && v > 1 && v < RH - 2) c = Wd[lit ? 2 : 1];
        if (isPost && (v === 4 || v === RH - 5) && u === 1) c = "#5c5e66";     // iron straps
        if (c) L.p(x, gy - zz - v, c);
      }
    }
  };
  const back = (L, S) => {
    truss(L, y0 + 3, false);
    // the deck: big baulks laid across, worn pale in the lanes, nail lines over the stringers
    for (let x = xa; x <= xb; x++) {
      const zz = zAt(x), pl = Math.floor(x / 5), u = x % 5;
      for (let gy = y0 + 5; gy < y1 - 5; gy++) {
        let c;
        if (x < ra - 4 || x > rb + 4) { c = null; }
        else {
          c = u === 0 ? Wd[0] : hash(pl, 1, 3) < 0.35 ? Wd[2] : hash(pl, 1, 3) < 0.85 ? Wd[3] : Wd[4];
          if (u === 4) c = Wd[2];
          if (Math.abs(gy - 300) < 34 && vn(x / 4, gy / 18, 5) > 0.55 && u !== 0) c = mix(c, "#cfb08a", 0.35);
          if ((gy === 262 || gy === 338) && u === 2) c = "#3a3a44";
          if (u === 0 && hash(pl, Math.floor(gy / 7), 9) > 0.8) c = Wd[1];
        }
        if (c) L.p(x, gy - zz, c);
        else {
          // the ramps: the road carried up on an earth fill
          const e = 44 - Math.abs(gy - 300); const h = hash(x, gy, 11);
          L.p(x, gy - zz, e < 3 ? P.dirt[0] : h > 0.97 ? P.dirt[4] : vn(x / 20, gy / 14, 3) > 0.5 ? P.dirt[3] : P.dirt[2]);
        }
      }
      // the earth fill's banks beside the ramp (the side of the road over the crib wall)
      if (x < ra - 4 || x > rb + 4) for (let gy = y0; gy < y0 + 5; gy++) L.p(x, gy - zz, P.grass[1]);
    }
    // the sill beams where the timber deck meets the ramps
    for (const sx of [ra - 4, rb + 4]) for (let gy = y0 + 4; gy < y1 - 4; gy++) { L.p(sx, gy - Z, Wd[1]); L.p(sx + (sx < 400 ? 1 : -1), gy - Z, Wd[4]); }
  };
  const front = (L, S) => {
    for (let x = xa; x <= xb; x++) {
      const zz = zAt(x), wet = sc.water(x, y1 + 2);
      if (x >= ra - 4 && x <= rb + 4) {
        // the stringer: a heavy beam along the south edge, bolted
        for (let zv = zz - 5; zv <= zz; zv++) L.p(x, y1 - zv, zv === zz ? Wd[4] : zv === zz - 5 ? Wd[0] : (x % 9 === 0 && zv === zz - 2) ? "#5c5e66" : Wd[2]);
        // piles and the bracing between bents
        const bi = bents.findIndex((b) => x >= b - 1 && x <= b + 2);
        if (wet || bi >= 0) for (let zv = -8; zv < zz - 5; zv++) {
          let c = null;
          if (bi >= 0) { const u = x - bents[bi] + 1; c = u === 0 ? Wd[4] : u === 3 ? Wd[0] : Wd[3]; if (zv < -5) c = mix(c, "#3e5a3a", 0.5); if (zv === zz - 9) c = "#5c5e66"; }
          else {
            const k = bents.findIndex((b, i) => bents[i + 1] && x > b + 2 && x < bents[i + 1] - 1);
            if (k >= 0) {
              const a = bents[k] + 2, b = bents[k + 1] - 1, t = (x - a) / (b - a), lo = -3, hi = zz - 7;
              const za = lo + (hi - lo) * t, zb = hi - (hi - lo) * t;
              if (Math.abs(zv - za) < 1.3 || Math.abs(zv - zb) < 1.3) c = Math.abs(zv - za) < 1.3 ? Wd[2] : Wd[1];
              if (zv === hi - 1 || zv === hi) c = Wd[1];       // a waling piece under the stringer
            }
          }
          if (c) L.p(x, y1 - zv, c);
        }
      } else {
        // the crib walls: squared logs stacked, their ends notched
        for (let zv = 0; zv <= zz; zv++) { const row = Math.floor(zv / 4), v = zv % 4; L.p(x, y1 - zv, v === 0 ? Wd[0] : v === 3 ? Wd[3] : Wd[2]); if ((x + row * 9) % 22 < 3 && v > 0) L.p(x, y1 - zv, v === 3 ? Wd[4] : Wd[1]); }
      }
    }
    truss(L, y1 - 2, true);
    // banner posts at the bridgeheads (the near two)
    for (const bx of [xa - 8, xb + 2]) { post(L, bx, y1 + 4, 5, 46, P, "wood"); banner(L, P, bx + 5, y1 + 4 - 42, 18); lantern(L, bx + 2, y1 + 4 - 52); }
  };
  const backTop = (L) => {
    for (const bx of [xa - 8, xb + 2]) { post(L, bx, y0 - 2, 5, 46, P, "wood"); banner(L, P, bx + 5, y0 - 2 - 42, 18); }
    // the toll hut on the west bridgehead, north of the road
    const hx = 262, hy = 244, Wd2 = P.wood;
    for (let j = 0; j < 22; j++) for (let i = 0; i < 30; i++) L.p(hx + i, hy - j, i % 6 === 0 ? Wd2[1] : j % 5 === 0 ? Wd2[2] : Wd2[3]);
    L.r(hx + 18, hy - 15, 7, 15, "#2a1e18"); L.r(hx + 19, hy - 14, 5, 13, Wd2[1]); L.p(hx + 23, hy - 7, "#d8b34a");
    L.r(hx + 5, hy - 15, 8, 6, "#2a2030"); L.r(hx + 6, hy - 14, 6, 4, "#ffcf6a"); L.r(hx + 8, hy - 14, 1, 4, Wd2[1]);
    for (let j = 0; j < 14; j++) for (let i = -3 + Math.floor(j / 2); i < 33 - Math.floor(j / 2); i++) L.p(hx + i, hy - 22 - j, j === 13 || i === -3 + Math.floor(j / 2) ? "#5a3030" : (i + j * 3) % 5 === 0 ? "#6a3a34" : j % 3 === 0 ? "#7a4038" : "#9a5244");
    L.r(hx + 22, hy - 42, 4, 8, P.stone[2]); L.r(hx + 22, hy - 43, 4, 1, P.stone[4]);
    // the toll bar, raised
    line(L, hx + 32, hy - 2, hx + 50, hy - 30, Wd2[4], 2); line(L, hx + 32, hy - 2, hx + 50, hy - 30, "#c84a3a", 1);
    post(L, hx + 31, hy + 2, 4, 10, P, "wood");
  };
  return { sc, z: zAt, back, backTop, front, shadow, y0, y1, xa, xb };
};

const trestleUp = (P) => {
  const x0 = 370, x1 = 470, ya = 158, yb = 382, Z = 20, RH = 22, ra = 214, rb = 326;
  const zAt = (y) => (y < ya || y > yb ? 0 : y < ra ? Z * (y - ya) / (ra - ya) : y > rb ? Z * (yb - y) / (yb - rb) : Z);
  const bents = []; for (let y = ra + 4; y <= rb - 2; y += 18) bents.push(y);
  const sc = { flow: [1, 0], water: river2({}), drop: () => 8, road: road2, gloom: (x, y) => (x >= x1 && x < x1 + 6 && y > ra && y < rb) };
  sc.wextra = (gx, gy, d) => { const q = ((gx - 560) / 34) ** 2 + ((gy - 238) / 9) ** 2 + (vn(gx / 6, gy / 6, 4) - 0.5) * 0.7; if (q < 1 && d < 18) return q > 0.8 ? WATER.bed : P.gravel[Math.floor(hash(gx, gy, 4) * 3.6)]; return null; };
  const shadow = (SH, S) => shadowRows(SH, S, "y", ya, yb, x0 - 6, x1 + 14, (gy) => zAt(gy) + RH * 0.6 + 8);
  const Wd = P.wood;
  const back = (L, S) => {
    // the bents: caps standing out past the deck's east edge, a pile to the water at the end
    for (const b of bents) {
      const px = x1 + 9;
      for (let zv = -8; zv < Z - 4; zv++) for (let i = 0; i < 4; i++) L.p(px + i, b + 3 - zv, i === 0 ? Wd[4] : i === 3 ? Wd[0] : zv < -5 ? mix(Wd[3], "#3e5a3a", 0.5) : zv === 3 ? "#5c5e66" : Wd[3]);
      for (let x = x1 - 4; x <= x1 + 14; x++) { for (let gy = b; gy <= b + 3; gy++) L.p(x, gy - Z, gy === b ? Wd[4] : Wd[3]); for (let zv = Z - 4; zv < Z; zv++) L.p(x, b + 3 - zv, zv === Z - 4 ? Wd[0] : Wd[2]); }
      line(L, x1 + 12, b + 3 + 2, x1 + 1, b + 3 - Z + 6, Wd[1], 1);
    }
    // the slanted west face: piles in their bents, X braces, the stringer, the truss above (see-through)
    westFace(L, x0, ya + 2, yb - 2, (gy) => zAt(gy) + RH, (gy) => (sc.water(x0 - 4, gy) ? -8 : 0), (gy, zv) => {
      const zz = zAt(gy), u = ((gy - ra) % 18 + 18) % 18, over = gy >= ra - 3 && gy <= rb + 3;
      if (zv > zz) {
        const v = zv - zz, t = v / RH, isPost = u < 3;
        if (v >= RH - 1) return v === RH ? Wd[4] : Wd[3];
        if (v <= 1) return Wd[3];
        if (isPost) return u === 0 ? Wd[4] : u === 2 ? Wd[1] : Wd[3];
        if (Math.abs(u - (3 + t * 15)) < 1.1 || Math.abs(u - (18 - t * 15)) < 1.1) return Wd[2];
        return null;
      }
      if (!over) { const row = Math.floor(zv / 4), v = ((zv % 4) + 4) % 4; let c = v === 0 ? Wd[0] : v === 3 ? Wd[4] : Wd[3]; if ((gy + row * 9) % 22 < 3 && v > 0) c = v === 3 ? Wd[4] : Wd[1]; return c; }
      if (zv >= zz - 5) return zv === zz ? Wd[4] : zv === zz - 5 ? Wd[0] : (gy % 9 === 0 && zv === zz - 2) ? "#5c5e66" : Wd[3];
      const bi = bents.findIndex((b) => gy >= b && gy <= b + 3);
      if (bi >= 0) { const w = gy - bents[bi]; let c = w === 0 ? Wd[4] : w === 3 ? Wd[1] : Wd[3]; if (zv < -5) c = mix(c, "#3e5a3a", 0.5); if (zv === zz - 9) c = "#5c5e66"; return c; }
      const k = bents.findIndex((b, i) => bents[i + 1] && gy > b + 3 && gy < bents[i + 1]);
      if (k >= 0) { const a = bents[k] + 3, b = bents[k + 1], t = (gy - a) / (b - a), lo = -3, hi = zz - 7, za = lo + (hi - lo) * t, zb = hi - (hi - lo) * t; if (Math.abs(zv - za) < 1.3) return Wd[3]; if (Math.abs(zv - zb) < 1.3) return Wd[2]; if (zv === hi || zv === hi - 1) return Wd[2]; }
      return null;
    });
    for (let gy = ya; gy <= yb; gy++) {
      const zz = zAt(gy), s0 = Math.round(gy - zz), s1 = Math.max(s0, Math.round(gy + 1 - zAt(gy + 1)) - 1);
      for (let sy = s0; sy <= s1; sy++) for (let x = x0 + 5; x <= x1 - 5; x++) {
        let c;
        if (gy < ra - 3 || gy > rb + 3) { const e = 44 - Math.abs(x - 420); c = e < 3 ? P.dirt[0] : hash(x, gy, 11) > 0.97 ? P.dirt[4] : vn(x / 20, gy / 14, 3) > 0.5 ? P.dirt[3] : P.dirt[2]; }
        else {
          const pl = Math.floor(gy / 5), u = gy % 5;
          c = u === 0 ? Wd[0] : hash(pl, 2, 3) < 0.35 ? Wd[2] : hash(pl, 2, 3) < 0.85 ? Wd[3] : Wd[4];
          if (Math.abs(x - 420) < 34 && vn(gy / 4, x / 18, 5) > 0.55 && u !== 0) c = mix(c, "#cfb08a", 0.35);
          if ((x === 382 || x === 458) && u === 2) c = "#3a3a44";
        }
        L.p(x, sy, c);
      }
      // truss rails: the top chord and the lattice, seen from above (edge-on: a ladder of light)
      for (const rx of [x1 - 5]) for (let x = rx; x < rx + 5; x++) {
        const u = ((gy - ra) % 18 + 18) % 18, isPost = u < 3 && gy > ra - 30 && gy < rb + 30;
        for (let v = 0; v <= RH; v++) {
          const t = v / RH, diag = Math.abs(u - (3 + t * 15)) < 1.1 || Math.abs(u - (18 - t * 15)) < 1.1;
          let c = null;
          if (v >= RH - 1) c = x === rx || x === rx + 4 ? Wd[2] : Wd[4];
          else if (v <= 1) c = Wd[2];
          else if (isPost && (x === rx + 1 || x === rx + 3)) c = Wd[3];
          else if (diag && x === rx + 2) c = Wd[1];
          if (c) L.p(x, s0 - v, c);
        }
      }
    }
  };
  const front = (L, S) => {
    for (const bx of [x0 - 10, x1 + 5]) { post(L, bx, yb + 6, 5, 46, P, "wood"); banner(L, P, bx + 5, yb + 6 - 42, 18); lantern(L, bx + 2, yb + 6 - 52); }
    // the toll hut beside the near bridgehead
    const hx = 488, hy = 420, Wd2 = P.wood;
    for (let j = 0; j < 22; j++) for (let i = 0; i < 30; i++) L.p(hx + i, hy - j, i % 6 === 0 ? Wd2[1] : j % 5 === 0 ? Wd2[2] : Wd2[3]);
    L.r(hx + 4, hy - 15, 7, 15, "#2a1e18"); L.r(hx + 5, hy - 14, 5, 13, Wd2[1]);
    L.r(hx + 17, hy - 15, 8, 6, "#2a2030"); L.r(hx + 18, hy - 14, 6, 4, "#ffcf6a");
    for (let j = 0; j < 14; j++) for (let i = -3 + Math.floor(j / 2); i < 33 - Math.floor(j / 2); i++) L.p(hx + i, hy - 22 - j, j === 13 || i === -3 + Math.floor(j / 2) ? "#5a3030" : (i + j * 3) % 5 === 0 ? "#6a3a34" : j % 3 === 0 ? "#7a4038" : "#9a5244");
    line(L, hx - 2, hy - 2, hx - 20, hy - 30, Wd2[4], 2); line(L, hx - 2, hy - 2, hx - 20, hy - 30, "#c84a3a", 1);
  };
  const backTop = (L) => { for (const bx of [x0 - 10, x1 + 5]) { post(L, bx, ya - 4, 5, 46, P, "wood"); banner(L, P, bx + 5, ya - 4 - 42, 18); } };
  return { sc, z: zAt, back, backTop, front, shadow, ya, yb, x0, x1, bents, Z };
};

// ================================================================ C: THE WEIR CROSSING
const weirAcross = (P) => {
  const y0 = 250, y1 = 350, xa = 322, xb = 538, Z = 10, ra = 362, rb = 498, sx0 = 378, sx1 = 482, steps = 4;
  const zAt = (x) => (x < xa || x > xb ? 0 : x < ra ? Z * (x - xa) / (ra - xa) : x > rb ? Z * (xb - x) / (xb - rb) : Z);
  const pond = (x, y) => { const cx = R1.cx + Math.sin(y / 40) * 8, hw = 92 + Math.sin(y / 23) * 8 + Math.sin(y / 9 + x / 50) * 3; return y < y0 + 2 && Math.abs(x - cx) < hw * clamp((y0 + 30 - y) / 50, 0.62, 1); };
  const tail = (x, y) => { const cx = R1.cx + Math.sin(y / 60) * 10 * clamp((y - 400) / 60, 0, 1); return y > y1 && Math.abs(x - cx) < R1.hw + 2 + Math.sin(y / 31) * 3 + clamp((y - 470) / 40, 0, 1) * 8; };
  const sc = {
    flow: [0, 1], water: (x, y) => pond(x, y) || tail(x, y), drop: (x, y) => (y < 300 ? 3 : 18), road: road1,
    calm: (x, y) => (y < 300 ? 1 : 0),
    // lily pads and a pebble beach in the pond's shallows
    wextra: (gx, gy, d) => {
      if (gy < 300) {
        const cell = [Math.floor(gx / 13), Math.floor(gy / 9)], h = hash(cell[0], cell[1], 7);
        if (d > 6 && d < 24 && h > 0.72) { const cx = cell[0] * 13 + 6 + (h - 0.86) * 20, cy = cell[1] * 9 + 4, q = ((gx - cx) / 4.5) ** 2 + ((gy - cy) / 2.6) ** 2; if (q < 1 && !(gx > cx && Math.abs(gy - cy) < 0.8)) return q > 0.6 ? "#3e7a34" : "#5ea040"; if (h > 0.95 && Math.abs(gx - cx - 1) < 1 && Math.abs(gy - cy + 1) < 1) return "#f4e6ee"; }
      }
      return null;
    },
    revet: (x) => true,
  };
  sc.extra = (x, y) => { // the spillway's training walls and the pond's stone edge where it meets the dam
    return null;
  };
  const stepOf = (gy) => clamp(Math.floor((gy - y1) / 7), 0, steps - 1);
  const shadow = (SH, S) => shadowRows(SH, S, "x", xa, xb, y0, y1, (x) => zAt(x) + 18);
  const St = P.stone, Wd = P.wood;
  const back = (L, S, T = 0) => {
    // the north parapet: a low wall, the four sluice frames standing on it with their winding wheels
    for (let x = xa; x <= xb; x++) {
      const zz = zAt(x);
      for (let gy = y0; gy < y0 + 5; gy++) L.p(x, gy - zz - 7, gy === y0 ? St[2] : St[4]);
      for (let v = 0; v < 7; v++) L.p(x, y0 + 5 - zz - v, ashlar(x, v, St, 5, 4, 6, 11));
      // the deck: big flags, the dam's crest
      for (let gy = y0 + 5; gy < y1 - 4; gy++) {
        const row = Math.floor(gy / 10), off = (row % 2) * 8, bx = Math.floor((x + off) / 16);
        let c = ((gy % 10) === 0 || ((x + off) % 16) === 0) ? St[1] : hash(bx, row, 3) < 0.35 ? St[2] : hash(bx, row, 3) < 0.9 ? St[3] : St[4];
        if (x < ra - 2 || x > rb + 2) { const e = 44 - Math.abs(gy - 300), h = hash(x, gy, 11); c = e < 3 ? P.dirt[0] : h > 0.97 ? P.dirt[4] : vn(x / 20, gy / 14, 3) > 0.5 ? P.dirt[3] : P.dirt[2]; }
        L.p(x, gy - zz, c);
      }
    }
    const gates = [386, 412, 438, 464];
    for (const gx of gates) {
      const base = y0 + 5 - Z - 7;
      post(L, gx, base, 3, 22, P, "wood"); post(L, gx + 14, base, 3, 22, P, "wood");
      L.r(gx - 1, base - 22, 19, 3, Wd[3]); L.r(gx - 1, base - 23, 19, 1, Wd[4]);
      // the gate board, raised, its rack
      L.r(gx + 3, base - 16, 11, 7, Wd[2]); for (let i = 0; i < 11; i += 3) L.r(gx + 3 + i, base - 16, 1, 7, Wd[1]);
      L.r(gx + 8, base - 30, 1, 14, "#5c5e66");
      // the winding wheel (it turns: four spokes at the clock)
      const cx = gx + 8, cy = base - 30, a = T / 900 + gx;
      for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2; L.p(cx + Math.round(Math.cos(t) * 5), cy + Math.round(Math.sin(t) * 5), "#4a4c56"); }
      for (let k = 0; k < 4; k++) { const t = a + (k * Math.PI) / 2; line(L, cx, cy, cx + Math.round(Math.cos(t) * 4), cy + Math.round(Math.sin(t) * 4), "#6a6c76"); }
      L.p(cx, cy, "#c4c8d0");
    }
  };
  const front = (L, S, T = 0) => {
    // the dam's south face with four culvert mouths gushing, then the stepped spillway
    for (let x = xa; x <= xb; x++) {
      const zz = zAt(x);
      for (let zv = 0; zv <= zz; zv++) {
        let c = ashlar(x, zv + 3, St, 9, 4, 7, 12);
        for (const m of [392, 418, 444, 470]) { const d = Math.hypot(x - m, Math.max(0, zv - 3)); if (d < 5.5 && zv >= 0) c = zv < 2 ? WATER.foam : "#121018"; else if (d < 7.5 && zv >= 0) c = St[3]; }
        L.p(x, y1 - zv, c);
      }
      // a low timber rail on the crest's south edge (posts every 12)
      for (let v = 1; v <= 8; v++) { const isP = ((x - xa) % 12) < 2; if (isP || v === 8 || v === 4) L.p(x, y1 - 4 - zz - v, v === 8 ? Wd[4] : isP ? Wd[3] : Wd[2]); }
    }
    // the spillway: treads and risers, white water sheeting over, spray at the foot
    for (let x = sx0 - 4; x <= sx1 + 4; x++) {
      const wall = x < sx0 || x > sx1;
      for (let gy = y1 + 1; gy <= y1 + steps * 7; gy++) {
        const k = stepOf(gy), u = (gy - y1 - 1) % 7, zt = -4 * k - 1;
        if (wall) { L.p(x, gy - zt - (x === sx0 - 4 || x === sx1 + 4 ? 0 : 0) - 4, u === 0 ? St[4] : St[3]); continue; }
        const n = vn(x / 3, (gy * 2 - T / 40) / 5, 3), c = n > 0.55 ? WATER.foam : n > 0.35 ? WATER.pale : "#8ec0cc";
        L.p(x, gy - zt, c);
        if (u === 6) for (let r = 1; r <= 4; r++) { const h = hash(x, r + Math.floor(T / 120), 9); L.p(x, gy - zt + r, h > 0.25 ? WATER.foam : WATER.pale); }
      }
      if (!wall) for (let s = 0; s < 14; s++) { const gy = y1 + steps * 7 + 18 + s, h = hash(x, s + Math.floor(T / 100), 5); if (h > s / 16) L.p(x, gy - 2 + (h > 0.9 ? -3 : 0), h > 0.55 ? WATER.foam : WATER.pale); }
    }
    // the training walls' south ends and their steps, stone
    for (const wx of [sx0 - 4, sx1 + 1]) for (let zv = -18; zv <= -12; zv++) for (let i = 0; i < 4; i++) L.p(wx + i, y1 + steps * 7 - zv, i === 0 ? St[3] : St[1]);
    for (const bx of [xa - 4, xb - 4]) { post(L, bx, y1 + 2, 8, 22, P, "stone"); }
    lantern(L, xa, y1 - 30);
  };
  const backTop = () => {};
  return { sc, z: zAt, back, backTop, front, shadow, y0, y1, xa, xb };
};

const weirUp = (P) => {
  const x0 = 366, x1 = 474, ya = 160, yb = 380, Z = 10, ra = 196, rb = 344, sx1 = x1 + 32, steps = 4;
  const zAt = (y) => (y < ya || y > yb ? 0 : y < ra ? Z * (y - ya) / (ra - ya) : y > rb ? Z * (yb - y) / (yb - rb) : Z);
  const pond = (x, y) => { const cy = R2.cy + Math.sin(x / 40) * 7, hw = 78 + Math.sin(x / 23) * 7 + Math.sin(x / 9 + y / 50) * 3; return x < x0 + 2 && Math.abs(y - cy) < hw * clamp((x0 + 50 - x) / 70, 0.66, 1); };
  const tail = (x, y) => { const cy = R2.cy + Math.sin(x / 60) * 8 * clamp((x - 560) / 60, 0, 1); return x > x1 && Math.abs(y - cy) < R2.hw + Math.sin(x / 31) * 3; };
  const sc = {
    flow: [1, 0], water: (x, y) => pond(x, y) || tail(x, y), drop: (x, y) => (x < 420 ? 3 : x < x1 + 6 ? 3 + 15 * clamp((x - x1) / 32, 0, 1) : 18), road: road2,
    calm: (x, y) => (x < 420 ? 1 : 0), revet: (x) => true,
    wextra: (gx, gy, d) => {
      if (gx < 420) { const cell = [Math.floor(gx / 13), Math.floor(gy / 9)], h = hash(cell[0], cell[1], 7); if (d > 6 && d < 26 && h > 0.72) { const cx = cell[0] * 13 + 6 + (h - 0.86) * 20, cy = cell[1] * 9 + 4, q = ((gx - cx) / 4.5) ** 2 + ((gy - cy) / 2.6) ** 2; if (q < 1 && !(gx > cx && Math.abs(gy - cy) < 0.8)) return q > 0.6 ? "#3e7a34" : "#5ea040"; if (h > 0.95 && Math.abs(gx - cx - 1) < 1 && Math.abs(gy - cy + 1) < 1) return "#f4e6ee"; } }
      return null;
    },
  };
  const shadow = (SH, S) => shadowRows(SH, S, "y", ya, yb, x0, x1, (gy) => zAt(gy) + 8 + 6);
  const St = P.stone, Wd = P.wood;
  const riverY = (x) => [R2.cy - R2.hw + 2, R2.cy + R2.hw - 2];
  const back = (L, S, T = 0) => {
    // the spillway east of the crest: treads stepping down eastward (each drawn lower), white water
    const [ry0, ry1] = riverY();
    for (let x = x1; x <= sx1; x++) {
      const k = clamp(Math.floor((x - x1) / 8), 0, steps - 1), zt = -4 * k - 1, u = (x - x1) % 8;
      for (let gy = ry0; gy <= ry1; gy++) {
        const n = vn((x * 2 - T / 40) / 5, gy / 3, 3);
        L.p(x, gy - zt, u === 7 ? (hash(x, gy + Math.floor(T / 120), 3) > 0.3 ? WATER.foam : WATER.pale) : n > 0.55 ? WATER.foam : n > 0.35 ? WATER.pale : "#8ec0cc");
      }
      // the north training wall: its south face, stepping down (this is what shows the drop)
      for (let zv = zt - 1; zv <= 2; zv++) L.p(x, ry0 - 1 - zv, zv === 2 ? St[4] : ashlar(x, zv + 20, St, 4, 4, 6, 10));
      for (let gy = ry0 - 5; gy < ry0 - 1; gy++) L.p(x, gy - 2, St[3]);
      // the south wall's top
      for (let gy = ry1 + 1; gy < ry1 + 5; gy++) L.p(x, gy - 2, gy === ry1 + 1 ? St[2] : St[3]);
    }
    // churn at the foot
    for (let x = sx1; x < sx1 + 26; x++) for (let gy = ry0; gy <= ry1; gy++) { const h = hash(x + Math.floor(T / 100), gy, 5); if (h > (x - sx1) / 28) L.p(x, gy + 18, h > 0.55 ? WATER.foam : WATER.pale); }
    // the dam crest: flags, parapets low
    for (let gy = ya; gy <= yb; gy++) {
      const zz = zAt(gy), s0 = Math.round(gy - zz), s1 = Math.max(s0, Math.round(gy + 1 - zAt(gy + 1)) - 1);
      for (let sy = s0; sy <= s1; sy++) for (let x = x0 + 5; x <= x1 - 5; x++) {
        const row = Math.floor(x / 10), off = (row % 2) * 8, by = Math.floor((gy + off) / 16);
        let c = ((x % 10) === 0 || ((gy + off) % 16) === 0) ? St[1] : hash(by, row, 3) < 0.35 ? St[2] : hash(by, row, 3) < 0.9 ? St[3] : St[4];
        if (gy < ra - 2 || gy > rb + 2) { const e = 44 - Math.abs(x - 420), h = hash(x, gy, 11); c = e < 3 ? P.dirt[0] : h > 0.97 ? P.dirt[4] : vn(x / 20, gy / 14, 3) > 0.5 ? P.dirt[3] : P.dirt[2]; }
        L.p(x, sy, c);
      }
      for (const px0 of [x0, x1 - 5]) for (let x = px0; x < px0 + 5; x++) for (let v = 7; v >= 0; v--) L.p(x, s0 - v, v >= 6 ? St[4] : ashlar(gy, v, St, x, 4, 6, 10));
    }
    // the dam's slanted west face, the pond lapping it; a culvert mouth under each sluice
    westFace(L, x0, ya + 2, yb - 2, (gy) => zAt(gy) + 7, (gy) => (pond(x0 - 4, gy) ? -3 : 0), (gy, zv) => {
      for (const m of [234, 258, 282, 306]) if (Math.abs(gy - m) < 6 && zv < 4) return zv < -1 ? WATER.pale : "#121018";
      if (zv >= zAt(gy) + 6) return St[4];
      let c = ashlar(gy, zv + 10, St, 9, 4, 7, 12, 1);
      if (zv < 0 && hash(gy, zv, 3) > 0.4) c = mix(c, "#3e5a3a", 0.5);
      return c;
    });
    // sluice frames on the pond side
    for (const gy of [234, 258, 282, 306]) {
      const base = gy - Z - 7;
      post(L, x0 - 12, base + 3, 3, 22, P, "wood");
      L.r(x0 - 15, base - 20, 9, 3, Wd[3]);
      const cx = x0 - 11, cy = base - 26, a = T / 900 + gy;
      for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2; L.p(cx + Math.round(Math.cos(t) * 5), cy + Math.round(Math.sin(t) * 5), "#4a4c56"); }
      for (let k = 0; k < 4; k++) { const t = a + (k * Math.PI) / 2; line(L, cx, cy, cx + Math.round(Math.cos(t) * 4), cy + Math.round(Math.sin(t) * 4), "#6a6c76"); }
      L.p(cx, cy, "#c4c8d0");
      // the drawdown: a dimple of foam where the pond pours in
      for (let i = 0; i < 12; i++) L.p(x0 - 8 + Math.round(Math.cos(i) * 4), gy + 3 + Math.round(Math.sin(i) * 2), WATER.pale);
    }
  };
  const front = (L, S, T = 0) => {
    // the mill on the south bank, its wheel turning in the tailrace (plane facing us)
    const mx = 560, my = 372, Wd2 = P.wood;
    // the wheel first (behind the mill's front)
    const cx = 590, cy = 316, Rr = 20, a = T / 700;
    for (let j = -Rr; j <= Rr; j++) for (let i = -Rr; i <= Rr; i++) { const r = Math.hypot(i, j); if (r <= Rr && r > Rr - 3) L.p(cx + i, cy + j, r > Rr - 1 ? Wd2[1] : Wd2[3]); }
    for (let k = 0; k < 8; k++) { const t = a + (k * Math.PI) / 4; line(L, cx, cy, cx + Math.cos(t) * (Rr - 2), cy + Math.sin(t) * (Rr - 2), Wd2[2]); const px = cx + Math.cos(t) * Rr, py = cy + Math.sin(t) * Rr; L.r(Math.round(px) - 1, Math.round(py) - 1, 3, 3, Wd2[3]); }
    L.r(cx - 2, cy - 2, 5, 5, "#4a4c56");
    for (let i = -Rr - 4; i <= Rr + 4; i++) for (let s = 0; s < 6; s++) if (hash(i + Math.floor(T / 110), s, 3) > 0.3 + s / 10) L.p(cx + i, cy + Rr - 2 + s, s < 2 ? WATER.foam : WATER.pale);
    // the mill house
    for (let j = 0; j < 34; j++) for (let i = 0; i < 52; i++) L.p(mx + i, my - j, j < 12 ? ashlar(i, j, St, 3, 4, 6, 11) : (i % 13 === 0 ? Wd2[1] : "#e8dcc0"));
    L.r(mx + 8, my - 26, 8, 9, "#2a2030"); L.r(mx + 9, my - 25, 6, 7, "#ffcf6a"); L.r(mx + 30, my - 18, 9, 18, "#2a1e18"); L.r(mx + 31, my - 17, 7, 17, Wd2[2]);
    for (let j = 0; j < 20; j++) for (let i = -4 + Math.floor(j * 0.6); i < 56 - Math.floor(j * 0.6); i++) L.p(mx + i, my - 34 - j, j === 19 || i === -4 + Math.floor(j * 0.6) ? "#5a3030" : (i + j * 3) % 5 === 0 ? "#6a3a34" : j % 3 === 0 ? "#7a4038" : "#9a5244");
    // near newels and the lantern
    for (const bx of [x0 - 2, x1 - 6]) post(L, bx, yb + 2, 8, 20, P, "stone");
    lantern(L, x1 - 2, yb - 28);
  };
  const backTop = () => {};
  return { sc, z: zAt, back, backTop, front, shadow, ya, yb, x0, x1 };
};

// ---------------------------------------------------------------- compose a panel
// opt: "A" | "B" | "C"; scene: 1 (across) | 2 (up) | 3 (Iron humpback); sunId; T ms for live bits
export const paint = (scene, opt, sunId = "noon", T = 0) => {
  const iron = scene === 3, P = iron ? PAL.iron : PAL.green, S = sunOf(sunId);
  const across = scene !== 2;
  const B = across ? (opt === "A" ? humpAcross(P, { iron }) : opt === "B" ? trestleAcross(P) : weirAcross(P)) : (opt === "A" ? humpUp(P) : opt === "B" ? trestleUp(P) : weirUp(P));
  if (iron) B.sc.flagAxis = "x";
  const SH = new Uint8Array(W * H); B.shadow(SH, S);
  // the hall and its ground shadow belong to the base pass's shade too (by the figures' shadows below)
  const base = paintBase(B.sc, S, P, SH);
  // reeds and a moored boat, foam where the river meets the bridge
  const back = new Layer(), front = new Layer();
  B.back(back, S, T); if (B.backTop) B.backTop(back, S, T); B.front(front, S, T);
  // the reflection of an across span's face in the water below it
  if (across) {
    for (let x = B.xa; x <= B.xb; x++) {
      if (!B.sc.water(x, B.y1 + 3)) continue;
      const wl = B.y1 + (B.sc.drop(x, B.y1 + 3) || 8);
      for (let r = 1; r < 40; r++) {
        const src = wl - r, dst = wl + r; if (!front.has(x, src)) break;
        if (hash(x >> 2, r, 3) < 0.18 + r / 70) continue;
        const c = front.get(x, src), w = base.get(x, dst);
        base.p(x, dst, mix([w[0], w[1], w[2]], [c[0], c[1], c[2]], Math.max(0, 0.42 - r / 110)));
      }
    }
  }
  // the water's life where it meets the bridge
  if (scene !== 2) {
    if (opt === "A") {
      for (const [a, b] of [[378, 405], [415, 445], [455, 482]]) { tongue(base, (a + b) / 2, B.y1 + 13, 0, 1, 70, (b - a) * 0.3, a); tongue(base, (a + b) / 2 + 3, B.y1 + 40, 0.06, 1, 60, 1.5, a + 3); }
      for (const p of [410, 450]) { tongue(base, p - 2, B.y1 + 26, -0.3, 1, 28, 1.1, p); tongue(base, p + 2, B.y1 + 26, 0.3, 1, 28, 1.1, p + 1); }
      reeds(base, P, 372, 378, 9, 2); reeds(base, P, 492, 398, 11, 3); reeds(base, P, 356, 210, 10, 4); reeds(base, P, 512, 172, 8, 5);
      // the landing stage and the moored skiff in the pool
      for (let i = 0; i < 18; i++) for (let j = 0; j < 7; j++) base.p(474 + i, 190 + j, i % 4 === 0 ? P.wood[1] : j === 0 ? P.wood[4] : P.wood[3]);
      post(base, 474, 199, 2, 6, P, "wood"); post(base, 490, 199, 2, 6, P, "wood");
      skiff(base, P, 456, 206, false);
    } else if (opt === "B") {
      const bents = []; for (let x = 378; x <= 482; x += 18) bents.push(x);
      for (const bx of bents) if (B.sc.water(bx, 355)) { const L0 = 30 + Math.floor(hash(bx, 1, 3) * 34); tongue(base, bx + 1, B.y1 + 12 + Math.floor(hash(bx, 2, 3) * 6), (hash(bx, 3, 3) - 0.5) * 0.12, 1, L0, 2.2, bx + 5); }
      reeds(base, P, 386, 392, 12, 6); reeds(base, P, 486, 210, 9, 7); reeds(base, P, 374, 160, 8, 8);
      skiff(base, P, 470, 410, true);
      // driftwood snagged on the bents' upstream side shows above the deck edge? (hidden): a log by the bank instead
      line(base, 388, 196, 410, 202, P.wood[2], 2); line(base, 388, 195, 410, 201, P.wood[4], 1);
    } else {
      reeds(base, P, 350, 200, 14, 9); reeds(base, P, 520, 176, 12, 10); reeds(base, P, 340, 160, 9, 11); reeds(base, P, 392, 470, 10, 12); reeds(base, P, 478, 498, 10, 13);
      skiff(base, P, 470, 150, false);
      for (let k = 0; k < 7; k++) tongue(base, 386 + k * 14, B.y1 + 64, (k - 3) * 0.05, 1, 70 - Math.abs(k - 3) * 8, 2.2, 40 + k);
    }
  } else {
    if (opt === "A") {
      for (const c of [234, 270, 306]) for (let k = -1; k <= 1; k++) tongue(base, B.x1 + 6, c + 8 + k * 7, 1, 0.03 * k, 70 - Math.abs(k) * 22, 2.4, c + k);
      for (const p of B.piers) { tongue(base, B.x1 + 14, p + 8, 1, -0.3, 30, 1.2, p); tongue(base, B.x1 + 14, p + 10, 1, 0.3, 30, 1.2, p + 2); for (let i = 0; i < 10; i++) base.p(B.x0 - 20 - (i % 3), p + 4 + i - 5, WATER.foam); }
      reeds(base, P, 512, 330, 10, 2); reeds(base, P, 300, 344, 12, 3); reeds(base, P, 250, 208, 10, 4);
      for (let i = 0; i < 18; i++) for (let j = 0; j < 7; j++) base.p(300 + i, 320 + j, i % 4 === 0 ? P.wood[1] : j === 0 ? P.wood[4] : P.wood[3]);
      skiff(base, P, 290, 312, false);
    } else if (opt === "B") {
      for (const b of B.bents) { for (const px of [B.x0 - 10, B.x1 + 11]) { tongue(base, px + 3, b + 12, 1, 0.25, 20, 1, px + b); tongue(base, px + 3, b + 12, 1, -0.25, 20, 1, px + b + 1); } tongue(base, B.x1 + 16, b + 12, 1, 0, 60, 1.6, b + 9); }
      reeds(base, P, 300, 334, 12, 6); reeds(base, P, 540, 214, 9, 7);
      skiff(base, P, 610, 318, false);
    } else {
      reeds(base, P, 300, 196, 14, 9); reeds(base, P, 250, 340, 12, 10); reeds(base, P, 330, 352, 9, 11);
      skiff(base, P, 280, 222, false);
      for (let k = 0; k < 6; k++) tongue(base, B.x1 + 64, 236 + k * 13, 1, (k - 2.5) * 0.04, 70 - Math.abs(k - 2.5) * 10, 2.2, 50 + k);
    }
  }
  // ----- the canvas
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base.canvas(), 0, 0);
  // the hall
  FIGS.length = 0;
  const hall = across ? [654, 214] : [704, 478];
  const onDeck = [], off = [];
  // figures: foes on the march, soldiers waiting
  const foeA = iron ? ["levy", "levy", "sergeant", "levy", "levy", "levy"] : ["goblin", "goblin", "orc", "goblin", "goblin", "goblin"];
  if (across) {
    const xs = [212, 262, 340, 372, 404, 436, 470, 506];
    xs.forEach((x, i) => { const y = 300 + [-24, 18, -6, 26, -28, 4, 22, -14][i]; const t = foeA[i % foeA.length]; const inB = x >= B.xa && x <= B.xb; (inB ? onDeck : off).push({ type: t, gx: x, gy: y, z: inB ? B.z(x) : 0, f: i * 3 }); });
    const kn = iron ? "knight" : "knight";
    [[606, 284], [618, 312], [640, 296]].forEach(([x, y], i) => off.push({ type: kn, gx: x, gy: y, z: 0, left: true, clip: "idle", f: i * 2 }));
  } else {
    const ys = [500, 452, 372, 336, 300, 262, 226, 190];
    ys.forEach((y, i) => { const x = 420 + [-20, 22, -8, 24, -26, 6, 20, -12][i]; const t = foeA[i % foeA.length]; const inB = y >= B.ya && y <= B.yb; (inB ? onDeck : off).push({ type: t, gx: x, gy: y, z: inB ? B.z(y) : 0, view: "back", f: i * 3 }); });
    [[404, 112], [436, 120]].forEach(([x, y], i) => off.push({ type: "knight", gx: x, gy: y, z: 0, view: "front", f: i * 4 }));
  }
  // things north of the bridge first (the hall when it stands north)
  const draws = [];
  draws.push({ y: hall[1], fn: () => drawHall(ctx, hall[0], hall[1], 3) });
  for (const F of off) draws.push({ y: F.gy, fn: () => drawFig(ctx, S, F) });
  const bridgeY = across ? B.y1 : B.yb;
  draws.sort((a, b) => a.y - b.y);
  for (const d of draws) if (d.y < (across ? B.y0 : B.ya)) d.fn();
  ctx.drawImage(back.canvas(), 0, 0);
  onDeck.sort((a, b) => a.gy - b.gy).forEach((F) => drawFig(ctx, S, F));
  ctx.drawImage(front.canvas(), 0, 0);
  for (const d of draws) if (d.y >= (across ? B.y0 : B.ya)) d.fn();
  // the Iron bridge's gate towers at the east bridgehead (drawn last: they stand south of the road too)
  if (iron) {
    const T2 = new Layer();
    for (const [tx, ty] of [[572, 232], [572, 380]]) tower(T2, P, tx, ty, ty > 300 ? 40 : 52);
    ctx.drawImage(T2.canvas(), 0, 0);
  }
  return cv;
};

// a squat round gate tower (Iron) at ground (cx, cy), radius 15, height h, slate cone, a banner
const tower = (L, P, cx, cy, h) => {
  const St = P.stone, r = 19;
  for (let i = -r; i <= r; i++) {
    const dy = Math.round(Math.sqrt(r * r - i * i) * 0.55), lit = i < -4 ? 1 : i > 6 ? -1 : 0;
    for (let zv = 0; zv <= h; zv++) { let c = ashlar(i + 40, zv, St, 6, 4, 5, 8, lit < 0 ? -1 : 0); if (lit > 0 && hash(i, zv, 2) > 0.5) c = mix(c, St[4], 0.3); if (lit < 0) c = mix(c, St[0], 0.25); L.p(cx + i, cy + dy - zv, c); }
    // a band of corbels and the battlement
    for (let zv = h - 5; zv <= h; zv++) L.p(cx + i, cy + dy - zv, ((i + 40) % 6 < 3 || zv < h - 2) ? (lit > 0 ? St[4] : lit < 0 ? St[1] : St[3]) : null);
  }
  for (let j = 0; j < 22; j++) { const w = Math.round((r + 1) * (1 - j / 22)); for (let i = -w; i <= w; i++) L.p(cx + i, cy - h - 2 - j, i < -w / 3 ? "#6a6e7e" : i > w / 3 ? "#3a3c4a" : "#52566a"); }
  L.r(cx, cy - h - 38, 1, 14, "#2a2030"); banner(L, P, cx + 1, cy - h - 37, 12);
  L.r(cx - 3, cy - Math.round(h * 0.55), 3, 7, "#14121c"); L.p(cx - 2, cy - Math.round(h * 0.55) + 2, "#ffcf6a");
};

// ---------------------------------------------------------------- the Ironford repath sketch
// drawn over the game's own shot of Ironford (1680 x 1120 = 2 px a board unit)
export const repath = (img) => {
  const cv = document.createElement("canvas"); cv.width = 1680; cv.height = 1120;
  const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const g2b = ([gx, gy]) => [65 + 47.5 * gx, 77 + 46 * gy];
  // the old course, filled in: grass over it, a dashed ghost line
  const old = [[6.3, -0.5], [6.4, 4.8], [9.5, 6.8], [9.6, 10.5]].map(g2b);
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(112,140,70,0.88)"; ctx.lineWidth = 40 * 2;
  ctx.beginPath(); old.forEach(([x, y], i) => (i ? ctx.lineTo(x * 2, y * 2) : ctx.moveTo(x * 2, y * 2))); ctx.stroke();
  ctx.strokeStyle = "rgba(40,60,100,0.8)"; ctx.setLineDash([10, 10]); ctx.lineWidth = 3;
  ctx.beginPath(); old.forEach(([x, y], i) => (i ? ctx.lineTo(x * 2, y * 2) : ctx.moveTo(x * 2, y * 2))); ctx.stroke();
  ctx.setLineDash([]);
  // the new river: down the inner loop, crossing the top leg once, square-on; a pool above the bridge
  const pts = [[352, -10], [346, 90], [356, 170], [350, 228], [350, 300], [356, 380], [344, 470], [350, 570]];
  const hwAt = (y) => 34 + (y < 230 && y > 120 ? 16 * Math.sin(((y - 120) / 110) * Math.PI) : 0);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = -10; y < 570; y += 1) {
      let i = 0; while (i < pts.length - 2 && pts[i + 1][1] < y) i++;
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], t = clamp((y - ay) / (by - ay), 0, 1), x = ax + (bx - ax) * t, hw = hwAt(y);
      ctx.fillStyle = pass === 0 ? "#5a4430" : pass === 1 ? "#3a6e9e" : "#2a5886";
      const k = pass === 0 ? hw + 2 : pass === 1 ? hw - 1 : hw - 12;
      if (k > 0) ctx.fillRect((x - k) * 2, y * 2, k * 4, 2);
    }
  }
  // the one bridge, a humpback across the top leg (board y ~ 261)
  const by = 261, bx = 350;
  ctx.fillStyle = "#988c7a"; ctx.fillRect((bx - 56) * 2, (by - 25) * 2 - 18, 112 * 4 / 2, 50 * 2);
  ctx.fillStyle = "#b6aa90"; for (let x = bx - 56; x < bx + 56; x += 3) ctx.fillRect(x * 2, (by - 25) * 2 - 18, 4, 100);
  ctx.fillStyle = "#7a7066"; ctx.fillRect((bx - 56) * 2, (by + 25) * 2 - 18, 224, 34);
  ctx.fillStyle = "#1c1c28"; for (const ax of [-30, 0, 30]) { ctx.beginPath(); ctx.arc((bx + ax) * 2, (by + 25) * 2 + 16, 22, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = "#d2c8ac"; ctx.fillRect((bx - 56) * 2, (by - 25) * 2 - 24, 224, 6); ctx.fillRect((bx - 56) * 2, (by + 25) * 2 - 24, 224, 6);
  // labels
  const tag = (x, y, s, col = "#fff3d2") => { ctx.font = "bold 22px monospace"; const w = ctx.measureText(s).width; ctx.fillStyle = "rgba(20,16,24,0.78)"; ctx.fillRect(x - 6, y - 22, w + 12, 30); ctx.fillStyle = col; ctx.fillText(s, x, y); };
  tag(820, 140, "pool above the bridge");
  tag(820, 470, "ONE crossing, square-on, under one big humpback");
  tag(830, 760, "river x2 wide (68 units), down the inner loop");
  tag(1100, 610, "old course filled in: the two old", "#e8d8a8"); tag(1100, 642, "bridges become plain flagged road", "#e8d8a8");
  tag(40, 1080, "SKETCH: Ironford repathed (needs the realm's river points and its decor re-placed)");
  ctx.restore();
  return cv;
};
