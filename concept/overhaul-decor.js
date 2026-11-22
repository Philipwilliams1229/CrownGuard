// ============ CONCEPT: the overhaul of ROCKS, STONES AND DECORATIONS (2026-11-22) ============
// Not in the game. The lab (overhaul-decor.html) draws a real board with the engine, lifts the
// board's own decor (trees stay: another artist's feature), and this file paints each option's
// pieces over it at board scale: 1 art px = 1 px of the 2x board canvas. Every piece is sculpted
// with the game's pixel sculptor (src/render/pix/pix.js: one sun, tinted one-pixel line), so it
// takes the level's light; long cast shadows follow data/sun.js.
//   A  BIGGER, FEWER, BETTER  every piece at a believable scale next to a hall, few of them
//   B  PLACES, NOT PROPS      pieces gathered into small scenes on worn ground (farmstead, camp, graveyard)
//   C  LAND WITH BONES        geology first: ledges and low cliffs, walls on the contours, old stones
import { Pix, mat, flat, toCanvas } from "../src/render/pix/pix.js";
import { DAY } from "../src/data/sun.js";
import { nearestOnPath } from "../src/engine/path.js";

export const KEEP = /tree|pine|spruce|willow|oak|birch|fendead|snag/;
const box = (x, y) => (px, py) => px > x - 30 && px < x + 450 && py > y - 30 && py < y + 310;
export const SCENES = {
  gw: { realm: "gullwick", faction: "greenwood", crop: [315, 160], halls: [["archer", 555, 300, 2], ["knight", 470, 250, 2]], wave: 6, at: 12, strip: [653, 178, 84, 100] },
  iron: { realm: "crowstair", faction: "iron", crop: [100, 140], halls: [["archer", 217, 285, 2]], wave: 6, at: 14 },
  hollow: { realm: "bellmarsh", faction: "hollow", crop: [310, 0], halls: [["archer", 455, 110, 2]], wave: 6, at: 30 },
};
for (const [k, s] of Object.entries(SCENES)) { s.id = k; s.inCrop = box(...s.crop); }

// ---- little helpers ----------------------------------------------------------------------
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rng = (seed) => { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const lerp = (a, b, t) => a + (b - a) * t;
let FRAME = 0;

// one sprite: build(px) sculpts about the anchor (feet, y up is negative); returns a baked canvas
const sprite = (w, h, build, oy = 4) => {
  w = Math.ceil(w); h = Math.ceil(h);
  const px = new Pix(w, h, w >> 1, h - oy);
  build(px);
  const img = px.resolve({ line: "tint" }), cv = toCanvas(img);
  grade(cv);
  return { cv, ox: img.ox, oy: img.oy };
};
// golden hour / sunrise: warm the baked piece the way the board's grade warms the ground
const grade = (cv) => {
  if (!DAY.on || !DAY.warm) return;
  const t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height;
  const c = t.getContext("2d");
  c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = "multiply"; c.fillStyle = DAY.tone === "rose" ? "#f0b8a0" : "#f6c690"; c.globalAlpha = 0.85 * DAY.warm; c.fillRect(0, 0, t.width, t.height);
  c.globalAlpha = 1; c.globalCompositeOperation = "destination-in"; c.drawImage(cv, 0, 0);
  const g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(t, 0, 0);
};

// ---- the scene list: sprites sorted by their foot line, shadows under all ----------------
class Scene {
  constructor(ctx, sc) { this.ctx = ctx; this.sc = sc; this.items = []; this.ground = []; this.cw = ctx.canvas.width; this.ch = ctx.canvas.height; }
  P(lx, ly) { return [Math.round((this.sc.crop[0] + lx) * 2), Math.round((this.sc.crop[1] + ly) * 2)]; }
  // a sculpted piece at board-local (lx, ly); shade: cast a shadow; h0: its foot line sorts here
  add(spr, lx, ly, o = {}) {
    const [x, y] = this.P(lx, ly);
    const near = nearestOnPath(this.sc.crop[0] + lx, this.sc.crop[1] + ly);
    if (near.d < 32 + 2 && !o.road) console.warn("on the road:", lx, ly, near.d.toFixed(1));
    this.items.push({ spr, x, y, shade: o.shade ?? 1, sort: y + (o.dy || 0) });
  }
  onGround(fn) { this.ground.push(fn); }
  render() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    for (const fn of this.ground) fn(ctx, this);
    // shadows: one opaque layer, laid at the sun's shade alpha (overlaps never double)
    const sh = document.createElement("canvas"); sh.width = this.cw; sh.height = this.ch;
    const s = sh.getContext("2d"); s.imageSmoothingEnabled = false;
    const day = DAY.on && DAY.len > 0, fx = day ? DAY.fall[0] : 0.93, fy = day ? DAY.fall[1] : 0.37, len = day ? DAY.len : 0.6;
    const [r, g, b, a] = DAY.on ? DAY.shade : [42, 28, 44, 0.3];
    for (const it of this.items) {
      if (!it.shade) continue;
      const sil = silhouette(it.spr.cv, `rgb(${r},${g},${b})`);
      const { ox, oy } = it.spr, L = len * it.shade;
      s.setTransform(1, 0, -fx * L, -fy * L, it.x - ox + fx * L * oy, it.y + fy * L * oy);
      s.drawImage(sil, 0, 0);
    }
    ctx.globalAlpha = Math.min(0.62, a * 1.55); ctx.drawImage(sh, 0, 0); ctx.globalAlpha = 1;
    this.items.sort((p, q) => p.sort - q.sort);
    for (const it of this.items) ctx.drawImage(it.spr.cv, it.x - it.spr.ox, it.y - it.spr.oy);
  }
}
const silhouette = (cv, col) => {
  const t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height;
  const c = t.getContext("2d"); c.drawImage(cv, 0, 0); c.globalCompositeOperation = "source-in"; c.fillStyle = col; c.fillRect(0, 0, t.width, t.height);
  return t;
};

// ---- ground work (painted straight onto the board, whole art pixels) -----------------------
const px1 = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
// trodden earth: an ellipse whose rim breaks up into grass, darker where it is wettest
const worn = (ctx, cx, cy, rx, ry, cols, seed = 1, k = 1) => {
  for (let j = -ry - 2; j <= ry + 2; j++) for (let i = -rx - 2; i <= rx + 2; i++) {
    const d = Math.hypot(i / rx, j / ry);
    const n = hash(i + seed * 97, j - seed * 13), n2 = hash((i >> 2) + seed, (j >> 2) - seed);
    const v = d + (n2 - 0.5) * 0.35 + (n - 0.5) * 0.18;
    if (v > 1) continue;
    if (v > 0.82 && n > 0.5 * k) continue;
    const c = v > 0.7 ? cols[0] : n > 0.86 ? cols[2] : n < 0.1 ? cols[3] ?? cols[1] : cols[1];
    px1(ctx, cx + i, cy + j, c);
  }
};
// a footpath along points (canvas px), w wide
const path = (ctx, pts, w, cols, seed = 3) => {
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let t = 0; t <= n; t += 1) {
      const x = lerp(ax, bx, t / n), y = lerp(ay, by, t / n), ww = w * (0.8 + 0.4 * hash(t + s * 50, seed));
      for (let j = -ww; j <= ww; j++) for (let i = -ww; i <= ww; i++) {
        const d = Math.hypot(i, j * 1.4) / ww, hh = hash(Math.round(x + i), Math.round(y + j) + seed);
        if (d > 1 || (d > 0.7 && hh > 0.55)) continue;
        px1(ctx, Math.round(x + i), Math.round(y + j), d > 0.65 ? cols[0] : hh > 0.9 ? cols[2] : cols[1]);
      }
    }
  }
};
// a tilled plot: rows of soil and greens, its edge trodden
const plot = (ctx, x0, y0, w, h, soil, leaf, seed = 5) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const row = j % 4, n = hash(i + seed, j);
    let c = row === 0 ? soil[2] : row === 3 ? soil[0] : soil[1];
    if ((row === 1 || row === 2) && (i + (j >> 2) * 3) % 5 < 3 && n > 0.25) c = row === 1 ? leaf[1] : leaf[0];
    if ((row === 1) && (i % 5 === 1) && n > 0.6) c = leaf[2];
    if ((i === 0 || i === w - 1 || j === 0 || j === h - 1) && n > 0.5) continue;
    px1(ctx, x0 + i, y0 + j, c);
  }
};

// ---- materials ---------------------------------------------------------------------------
const M = {
  stone: mat("#9c9586", { contrast: 1.25 }), stoneD: mat("#827c70", { contrast: 1.2 }), stoneW: mat("#b4a890", { contrast: 1.2 }), moss: mat("#6f8f34"), mossD: mat("#56722c"),
  lichen: mat("#a4a05a"), thatch: mat("#c49a4c"), thatchD: mat("#a07c3c"), timber: mat("#7a5230"), timberD: mat("#5c3c24"),
  plaster: mat("#e6dcc2"), tile: mat("#a6503a"), slate: mat("#6a6c78"), soil: mat("#7a5a3a"), hay: mat("#d6b450"),
  water: flat("#3c6a8a"), dark: flat("#2a2026"), glass: flat("#3a3442"), glow: flat("#ffd27a", { emis: true }),
  iron: mat("#4a4a52"), rope: mat("#b8a070"), white: mat("#ece6d8"), red: mat("#b03a2c"), blue: mat("#3a5a9a"),
  hull: mat("#8a5a34"), granite: mat("#7c7872", { contrast: 1.05 }), graniteD: mat("#5e5a60", { contrast: 1.05 }), heather: mat("#8a5a8a"), canvas: mat("#d8ccae"),
  cloth: mat("#8a2a26"), clothY: mat("#c8a040"), bstone: mat("#7e867a", { contrast: 1.2 }), bstoneD: mat("#636a60", { contrast: 1.15 }), floor: mat("#3c4236"), wet: mat("#4c5a4c"),
  ivy: mat("#4e7a34"), sand: mat("#d8c08a"), wool: mat("#ece4d0"), hen: mat("#e8e0cc"), comb: flat("#c83a2a"),
  bronze: mat("#7a8a5a"), candle: flat("#f4e8c0"), flame: flat("#ffc850", { emis: true }), bone: mat("#e0d8c0"),
  pine: mat("#3c5a3a"), turf: mat("#6a9a3a"), turfD: mat("#5a8030"),
};
const F_FRONT = [0, 0.18, 0.98], F_WEST = [-0.85, 0, 0.53], F_EAST = [0.85, 0.05, 0.52], F_TOP = [-0.12, -0.55, 0.83], F_ROOF = [-0.08, -0.32, 0.94];

// coursed masonry over a face already drawn: mortar every `ch` rows, staggered joints
const courses = (px, x0, y0, x1, y1, ch = 4, cw = 7, d = -1, seed = 1) => {
  for (let y = y0 + ch; y < y1; y += ch) {
    px.toneLine(x0, y, x1, y, d);
    const off = ((y / ch) | 0) % 2 ? 0 : cw >> 1;
    for (let x = x0 + off + Math.floor(hash(y, seed) * 3); x < x1; x += cw + Math.floor(hash(x, y + seed) * 3)) px.toneLine(x, y - ch + 1, x, y - 1, d);
  }
  for (let k = 0; k < (x1 - x0) * (y1 - y0) / 40; k++) px.tone(lerp(x0, x1, hash(k, seed + 7)), lerp(y0, y1, hash(seed, k + 3)), hash(k, k + seed) > 0.5 ? 1 : -1);
};

// ---- pieces: rocks --------------------------------------------------------------------------
// one faceted rock: an outline of jittered points, fanned from a peak into lit / shaded facets
const rockPoly = (px, cx, cy, rx, ry, R, m, z, o = {}) => {
  const N = o.n ?? 8, pts = [];
  for (let k = 0; k < N; k++) {
    const a = Math.PI + (k / (N - 1)) * Math.PI, rr = 0.78 + R() * 0.3;
    pts.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr * (o.tall ?? 1)]);
  }
  pts.push([cx + rx * (0.85 + R() * 0.15), cy + ry * 0.12], [cx + rx * 0.5, cy + ry * 0.32], [cx - rx * 0.5, cy + ry * 0.32], [cx - rx * (0.85 + R() * 0.15), cy + ry * 0.1]);
  const pk = [cx - rx * (0.1 + R() * 0.2), cy - ry * (0.35 + R() * 0.25) * (o.tall ?? 1)];
  const part = px.part().body(0);
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length], mx = (a[0] + b[0]) / 2 - pk[0], my = (a[1] + b[1]) / 2 - pk[1], l = Math.hypot(mx, my) || 1;
    const tilt = my > 0 ? 0.55 : 0.85;   // the facets facing us stand steeper
    let nx = (mx / l) * tilt, ny = (my / l) * tilt * (my > 0 ? 0.5 : 1);
    if (my > 0 && Math.abs(mx / l) < 0.6) ny = 0.25;
    const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
    px.part().poly([pk, a, b], m, z + (my > 0 ? 0.05 : 0), { n: [nx, ny, nz], noSeam: true });
  }
  return pk;
};
// a boulder: one to three faceted rocks leaning together, cracks, moss on the crowns; r in art px
const boulder = (r, seed = 1, o = {}) => {
  const W = Math.ceil(r * 3.4) + 10, Hh = Math.ceil(r * 2.6) + 10, R = rng(seed);
  const m = o.m ?? M.stone, moss = o.moss ?? M.moss;
  return sprite(W, Hh, (px) => {
    const n = o.lumps ?? 3, peaks = [];
    for (let k = 0; k < n; k++) {
      const rr = r * (k === 0 ? 1 : 0.5 + R() * 0.3), cx = k === 0 ? 0 : (k % 2 ? 1 : -1) * r * (0.75 + R() * 0.3), cy = -rr * 0.55 + (k ? 2 : 0);
      peaks.push(rockPoly(px, cx, cy, rr * (o.wide ?? 1.05), rr * 0.8, R, k === 2 ? (o.m2 ?? M.stoneD) : m, k === 0 ? 2 : 2.5, { tall: o.tall ?? 1 }));
    }
    for (let k = 0; k < r * 0.5; k++) { const x = (R() - 0.5) * r * 1.6, y = -R() * r * 1.1; px.toneLine(x, y, x + (R() - 0.5) * 4, y + 2 + R() * 4, -1); }
    for (let k = 0; k < r * 3; k++) px.tone((R() - 0.5) * r * 2.2, -R() * r * 1.5, R() > 0.6 ? 1 : -1);
    if (moss !== null) for (const [x, y] of peaks) for (let k = 0; k < 2; k++) px.ellipse(x + (R() - 0.7) * r * 0.5, y + R() * 2, 1.5 + R() * r * 0.25, 1 + R() * 1.4, moss, 5, { wrap: true });
    if (o.grass) for (let k = 0; k < r * 1.2; k++) { const x = (R() - 0.5) * r * 2.8; px.part().line(x, -0.5, x + (R() - 0.5) * 2, -2 - R() * 3, R() > 0.5 ? M.turf : M.turfD, 9); }
  }, 5);
};
// a long whaleback of bedrock breaking the turf: a chain of faceted rocks, tallest in the middle, turf between
const outcrop = (len, hgt, seed = 2, o = {}) => {
  const R = rng(seed), m = o.m ?? M.stone, W = len + 24, Hh = hgt * 2.4 + 20;
  return sprite(W, Hh, (px) => {
    const n = Math.max(4, Math.round(len / 13));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = (t - 0.5) * len, hh = hgt * (0.35 + 0.65 * Math.sin(Math.PI * t)) * (0.8 + R() * 0.4);
      rockPoly(px, x, -hh * 0.42, len / n * 0.95 + R() * 4, hh * 0.6, R, R() > 0.65 ? (o.m2 ?? M.stoneD) : m, 2 + R() * 0.5, { n: 7 });
      if (o.turf !== false && R() > 0.35) px.ellipse(x + (R() - 0.5) * 4, -hh * 0.95, 3 + R() * 3, 1.5 + R(), M.turf, 5, { wrap: true });
      if (R() > 0.5) px.ellipse(x, -hh * 0.6, 2.5, 1.4, o.moss ?? M.moss, 5, { wrap: true });
    }
    if (o.turf !== false) for (let k = 0; k < len / 6; k++) { const x = (R() - 0.5) * len * 1.05; px.part().ellipse(x, -0.5, 3 + R() * 2, 1.4, R() > 0.5 ? M.turf : M.turfD, 6, { round: 0.6 }); }
  }, 6);
};
// a south-facing ledge (a low cliff) along a run of points: the land above is lifted, its face is rock.
// Built of blocks in two or three receding courses, each block its own facet, dark joints between,
// a ragged turf lip over the top, roots and ivy down the face, fallen blocks at the foot.
// pts: [[x, yFoot], ...] (the foot of the face, relative to the anchor); hgt: the face's height
const ledge = (pts, hgt, seed = 4, o = {}) => {
  const xs = pts.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), W = Math.ceil(x1 - x0) + 24, Hh = hgt + 44;
  const R = rng(seed), m = o.m ?? M.stone, m2 = o.m2 ?? M.stoneD;
  const taper = (x) => (o.taper ? Math.min(1, (x - x0) / o.taper) : 1);
  const footAt = (x) => { for (let i = 0; i + 1 < pts.length; i++) if (x <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0] || 1)); return pts[pts.length - 1][1]; };
  return sprite(W, Hh, (px) => {
    const bands = o.bands ?? 3, bh = hgt / bands;
    for (let b = 0; b < bands; b++) {
      // b = 0 the lowest course, standing furthest out; higher courses step back (up the screen) a little
      let x = x0 + (b % 2 ? -3 : 0);
      while (x < x1) {
        const w = 7 + Math.floor(R() * 10), xe = Math.min(x1, x + w), f0 = footAt(x), f1 = footAt(xe);
        const k0 = taper(x), k1 = taper(xe); if (b / bands >= k0 + 0.15) { x = xe + 0.5; continue; }
        const yb0 = f0 - (b * bh + b * 1.2) * k0, yb1 = f1 - (b * bh + b * 1.2) * k1, ht = (bh + 1 + R() * 2.5) * Math.max(0.35, Math.min(k0, k1) * 1.2);
        const tilt = (R() - 0.5) * 0.5, mm = R() > 0.7 ? m2 : m;
        px.part().poly([[x, yb0], [xe, yb1], [xe - R() * 1.5, yb1 - ht], [x + R() * 1.5, yb0 - ht - R() * 1.5]], mm, 3 + b * 0.6 + R() * 0.1, { n: [tilt, 0.12, 0.98], noSeam: true });
        // the block's top: a thin lit ledge where the course above steps back
        px.part().poly([[x + 1, yb0 - ht], [xe - 1, yb1 - ht], [xe - 2, yb1 - ht - 1.6], [x + 2, yb0 - ht - 1.6]], mm, 3.3 + b * 0.6, { n: F_TOP, noLine: true });
        for (let k = 0; k < w * bh / 10; k++) px.tone(lerp(x, xe, R()), lerp(yb0, yb0 - ht, R()), R() > 0.55 ? 1 : -1);
        if (R() > 0.6) px.toneLine(x + R() * w, yb0 - ht + 1, x + R() * w, yb0 - 1, -1);
        x = xe + 0.5;
      }
    }
    // the turf lip over the top: ragged, hanging in tongues
    for (let x = x0 - 2; x <= x1 + 2; x += 3) {
      const xc = Math.min(x1, Math.max(x0, x)), yt = footAt(xc) - (hgt + bands * 1.2) * taper(xc);
      px.part().ellipse(x, yt - 1, 3.2, 2 + R() * 1.5, R() > 0.5 ? M.turf : M.turfD, 8, { round: 0.5, noSeam: true });
      if (R() > 0.7) px.part().capsule(x, yt, 1.2, x + (R() - 0.5) * 2, yt + 3 + R() * 5, 0.8, M.turfD, 8.1);
    }
    for (let k = 0; k < W / 16; k++) { const x = lerp(x0, x1, R()), f = footAt(x), tk = taper(x); if (tk < 0.6) continue; px.part().limb([[x, f - hgt * tk], [x + (R() - 0.5) * 4, f - hgt * tk * (0.35 + R() * 0.4)]], 1.2, o.ivy ?? M.ivy, 9); }
    for (let k = 0; k < W / 14; k++) { const x = lerp(x0 + 3, x1 - 3, R()), f = footAt(x); rockPoly(px, x, f - 1.5, 3 + R() * 3, 2.5 + R() * 1.5, R, R() > 0.5 ? m : m2, 10); }
  }, 10);
};
// a standing stone: a tall slab, leaning, lichen and a turf ring
const menhir = (h, w, lean = 0, seed = 6, o = {}) => sprite(w * 2 + 16 + Math.abs(lean) * 2, h + 14, (px) => {
  const R = rng(seed), m = o.m ?? M.stone, top = -h;
  px.part().poly([[-w / 2, 0], [w / 2, 0], [w / 2 - 1 + lean, top + 4], [w / 4 + lean, top], [-w / 3 + lean, top + 2], [-w / 2 + lean, top + 6]], m, 2, { round: 0.6 });
  for (let k = 0; k < h / 3; k++) px.tone((R() - 0.5) * w, -R() * h, R() > 0.5 ? 1 : -1);
  for (let k = 0; k < 4; k++) px.ellipse((R() - 0.5) * w * 0.6 + lean * 0.7, -h * (0.5 + R() * 0.4), 1.5 + R() * 2, 1 + R(), o.lichen ?? M.lichen, 4, { wrap: true });
  if (o.ring) for (let k = 0; k < 6; k++) px.part().ellipse((R() - 0.5) * w * 1.4, -0.5, 2.5, 1.2, M.turf, 5);
  if (o.carve) for (let k = 0; k < 3; k++) px.toneLine(-w / 4 + lean * 0.5, -h * 0.4 - k * 3, w / 4 + lean * 0.5, -h * 0.4 - k * 3 - 1, -1);
}, 6);

// an old arch half swallowed by the turf: two piers, voussoirs, ivy over all
const arch = (w, h, seed = 7, o = {}) => sprite(w + 24, h + 20, (px) => {
  const R = rng(seed), m = o.m ?? M.stoneW, d = M.stoneD, t = 7;
  px.part().rect(-w / 2, -h, t, h, m, 2, { n: F_FRONT }); px.part().rect(w / 2 - t, -h * 0.8, t, h * 0.8, m, 2, { n: F_FRONT });
  px.part().poly([[-w / 2 - 2, 0], [-w / 2, 0], [-w / 2, -h], [-w / 2 - 2, -h + 2]], d, 1.9, { n: F_WEST });
  const cx = 0, cy = -h + 2, ro = w / 2, ri = w / 2 - t;
  for (let k = 0; k < 9; k++) {
    const a0 = Math.PI + (k / 9) * Math.PI, a1 = Math.PI + ((k + 1) / 9) * Math.PI;
    if (k > 6) continue;   // the arch broke on its east side
    px.part().poly([[cx + Math.cos(a0) * ro, cy + Math.sin(a0) * ro * 0.9], [cx + Math.cos(a1) * ro, cy + Math.sin(a1) * ro * 0.9], [cx + Math.cos(a1) * ri, cy + Math.sin(a1) * ri * 0.9], [cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri * 0.9]], k % 2 ? m : d, 2.2, { n: F_FRONT });
  }
  courses(px, -w / 2, -h, -w / 2 + t, 0, 4, 7, -1, seed); courses(px, w / 2 - t, -h * 0.8, w / 2, 0, 4, 7, -1, seed + 1);
  for (let k = 0; k < 14; k++) px.ellipse((R() - 0.5) * w, -R() * h * 1.1, 2 + R() * 3, 2 + R() * 3, M.ivy, 4, { wrap: true });
  for (let k = 0; k < 4; k++) px.part().ellipse(w / 2 + 4 + R() * 6, -1 - R() * 2, 2.5 + R() * 2, 1.8, m, 5, { round: 0.9 });
  // the turf has climbed its foot
  for (let k = 0; k < 9; k++) px.part().ellipse((R() - 0.5) * (w + 10), -1, 4 + R() * 3, 2 + R() * 1.5, R() > 0.5 ? M.turf : M.turfD, 6, { round: 0.6 });
}, 6);

// ---- pieces: walls and fences ---------------------------------------------------------------
// a drystone wall along points (art px, relative to the anchor): stacked rough stones, a cope row
const dryWall = (pts, hgt = 6, seed = 8, o = {}) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - 6, x1 = Math.max(...xs) + 6, y0 = Math.min(...ys) - hgt - 6, y1 = Math.max(...ys) + 6;
  const W = Math.ceil(x1 - x0) + 4, Hh = Math.ceil(y1 - y0) + 4, R = rng(seed), m = o.m ?? M.stone;
  const ox = Math.round(-x0) + 2, oy = Math.round(-y0) + 2;
  const px = new Pix(W, Hh, ox, oy);
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 4.2);
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = lerp(ax, bx, t), y = lerp(ay, by, t);
      if (o.gaps && hash(Math.round(x), seed) < o.gaps) continue;
      for (let row = 0; row < Math.round(hgt / 3); row++) {
        const r = 2.4 + R() * 1.4;
        px.part().ellipse(x + (row % 2 ? 1.8 : 0) + (R() - 0.5), y - 2 - row * 3, r, r * 0.72, R() > 0.75 ? (o.m2 ?? M.stoneD) : m, y * 0.01 + row * 0.1, { round: 0.85 });
      }
      if (hash(k, s + seed) > 0.55) px.ellipse(x, y - hgt + 1, 3.2, 1.8, o.cope ?? M.moss, y * 0.01 + 2, { wrap: true });
    }
  }
  const img = px.resolve({ line: "tint" }), cv = toCanvas(img); grade(cv);
  return { cv, ox: img.ox, oy: img.oy };
};
// post-and-rail fence along points
const fence = (pts, seed = 9, o = {}) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), H0 = o.h ?? 9;
  const x0 = Math.min(...xs) - 4, x1 = Math.max(...xs) + 4, y0 = Math.min(...ys) - H0 - 4, y1 = Math.max(...ys) + 4;
  const ox = Math.round(-x0) + 2, oy = Math.round(-y0) + 2, px = new Pix(Math.ceil(x1 - x0) + 4, Math.ceil(y1 - y0) + 4, ox, oy), R = rng(seed);
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / (o.gap ?? 9)));
    for (let k = 0; k <= n; k++) {
      const x = lerp(ax, bx, k / n), y = lerp(ay, by, k / n), lean = (R() - 0.5) * 1.2;
      px.part().capsule(x, y, 1.1, x + lean, y - H0, 0.9, M.timberD, y * 0.01 + 1);
    }
    for (const hh of o.rails ?? [0.45, 0.8]) px.part().line(ax, ay - H0 * hh, bx, by - H0 * hh + (R() - 0.5), M.timber, Math.max(ay, by) * 0.01 + 1.5);
  }
  const img = px.resolve({ line: "tint" }), cv = toCanvas(img); grade(cv);
  return { cv, ox: img.ox, oy: img.oy };
};

// ---- pieces: buildings -----------------------------------------------------------------------
// a cottage, front-on: walls w x wh, a roof rising rh above them, ridge along the front
const cottage = (o) => {
  const w = o.w, wh = o.wh, rh = o.rh, over = o.over ?? 4, side = o.side ?? Math.round(w * 0.22);
  return sprite(w + side + 2 * over + 24, wh + rh + 30, (px) => {
    const R = rng(o.seed ?? 11), wall = o.wall ?? M.plaster, roof = o.roof ?? M.thatch, L = -w / 2, Rr = w / 2;
    // east gable end (the side we see), then the front wall
    px.part().poly([[Rr, 0], [Rr + side, -side * 0.5], [Rr + side, -wh - side * 0.5], [Rr + side * 0.5, -wh - rh * 0.55 - side * 0.25], [Rr, -wh]], o.sideWall ?? wall, 1, { n: F_EAST });
    px.part().rect(L, -wh, w, wh, wall, 2, { n: F_FRONT });
    if (o.stone) { courses(px, L, -wh, Rr, 0, 3, 6, -1, o.seed ?? 1); courses(px, Rr, -wh - side * 0.5, Rr + side, -side * 0.5, 3, 6, -1, 5); }
    if (o.frame) { // timber framing over plaster
      for (const x of [L + 1, Rr - 2, L + w * 0.5 - 1]) px.part().rect(x, -wh, 2, wh, M.timberD, 2.2, { n: F_FRONT });
      px.part().rect(L, -wh, w, 2, M.timberD, 2.2, { n: F_FRONT }); px.part().rect(L, -wh * 0.5, w, 2, M.timberD, 2.2, { n: F_FRONT });
      px.part().line(L + 2, -wh * 0.5, L + w * 0.25, -wh + 2, M.timberD, 2.25); px.part().line(Rr - 3, -wh * 0.5, Rr - w * 0.25, -wh + 2, M.timberD, 2.25);
    }
    // plinth of rubble stone
    px.part().rect(L - 1, -3, w + 2, 3, M.stoneD, 2.1, { n: F_FRONT });
    for (let x = L; x < Rr; x += 3 + Math.floor(R() * 2)) px.toneLine(x, -3, x, -1, -1);
    // door, windows
    const dx = o.door ?? L + w * 0.62;
    px.part().rect(dx, -Math.min(wh - 3, 12), 7, Math.min(wh - 3, 12), M.timber, 2.4, { n: F_FRONT });
    px.toneLine(dx + 3, -11, dx + 3, -1, -1); px.dot(dx + 5, -6, M.iron, 2.5);
    for (const wx of o.windows ?? [L + w * 0.18, L + w * 0.4]) {
      px.part().rect(wx, -wh + 5, 6, 6, M.glass, 2.4, { n: F_FRONT });
      px.part().rect(wx - 1, -wh + 11, 8, 1.2, M.timber, 2.5, { n: F_TOP });
      if (o.lit) px.part().rect(wx + 1, -wh + 6, 4, 4, M.glow, 2.45);
      px.part().line(wx + 3, -wh + 5, wx + 3, -wh + 10, M.timberD, 2.45);
    }
    // the roof: a thick thatch / tile slope seen from above, eave lip, ridge
    const ey = -wh + 2, ry = -wh - rh;
    px.part().poly([[L - over, ey], [Rr + over, ey], [Rr + side + over * 0.5, ey - side * 0.5], [Rr + side * 0.5 + 1, ry + 2], [L - over + 3, ry]], roof, 4, { n: F_ROOF, round: 0.25 });
    px.part().poly([[L - over, ey - 2], [Rr + over, ey - 2], [Rr + over, ey + 1], [L - over, ey + 1]], o.roofLip ?? roof, 4.5, { n: [0, 0.6, 0.8] });
    px.part().poly([[L - over + 3, ry - 2], [Rr + side * 0.5 + 1, ry], [Rr + side * 0.5 + 1, ry + 3], [L - over + 3, ry + 2]], o.ridge ?? (o.tile ? M.tile : M.thatchD), 4.6, { n: F_TOP, round: 0.3 });
    if (o.tile) for (let y = ey - 4; y > ry + 2; y -= 3) px.toneLine(L - over + 1, y, Rr + over + side * 0.4, y - 1, -1);
    else {
      // thatch laid in courses: each course a stepped band, darker at its foot, combed streaks
      for (let y = ey - 3, c = 0; y > ry + 3; y -= 5, c++) for (let x = L - over; x < Rr + over + side * 0.5; x++) { px.tone(x, y, -1); if (hash(x, c) > 0.6) px.tone(x, y - 1, -1); if (hash(x + 9, c) > 0.75) px.tone(x, y - 3, 1); }
      for (let k = 0; k < w * 2; k++) { const x = lerp(L - over, Rr + over, R()); const y = lerp(ry + 3, ey - 2, R()); px.toneLine(x, y, x + 0.4, y + 1 + R() * 2, R() > 0.5 ? -1 : 1); }
    }
    for (let x = L - over; x < Rr + over; x++) { px.tone(x, ey - 1, -1); px.tone(x, ry + 3, 1); }
    // chimney
    if (o.chimney !== false) {
      const cx = o.chimneyX ?? Rr - 7;
      px.part().rect(cx, ry - 9, 6, 14, M.stone, 6, { n: F_FRONT, round: 0.3 });
      courses(px, cx, ry - 9, cx + 6, ry + 5, 3, 4, -1, 3);
      px.part().rect(cx - 1, ry - 10, 8, 2, M.stoneD, 6.2, { n: F_TOP });
    }
    // moss on the thatch, a water butt, a bench
    for (let k = 0; k < 3; k++) px.ellipse(lerp(L, Rr, R()), lerp(ry + 4, ey - 3, R()), 3, 1.3, M.mossD, 5, { wrap: true });
    if (o.butt) { px.part().capsule(L - 4, -1, 3, L - 4, -7, 3, M.timber, 6, { round: 0.9 }); px.toneLine(L - 7, -4, L - 1, -4, -1); }
    if (o.bench) px.part().rect(L + 2, -4, 10, 2, M.timber, 6, { n: F_TOP });
  }, 8);
};
// a round tower, ruined: coursed stone cylinder, broken crown, ivy, an arrow slit
const ruinTower = (r, h, seed = 12, o = {}) => sprite(r * 2 + 30, h + 30, (px) => {
  const R = rng(seed), m = o.m ?? M.stone;
  const crown = []; for (let k = 0; k <= 10; k++) { const t = k / 10; crown.push([lerp(r, -r, t), -h + (o.broken ? Math.max(0, Math.sin(t * 3.1 + 0.5)) * h * 0.35 + R() * 4 : 0)]); }
  px.part().poly([[-r, 0], [r, 0], ...crown], m, 2, { round: 0.95 });
  // the inside of the broken top: a dark ring lip
  for (let k = 0; k < 10; k++) { const [x, y] = crown[k]; px.toneLine(x, y + 1, crown[k + 1][0], crown[k + 1][1] + 1, -1); }
  // rough coursed rubble: courses of uneven height, joints at random, some stones lighter or darker
  for (let y = -1, c = 0; y > -h; c++) {
    const ch = 3 + Math.floor(hash(c, seed) * 3); y -= ch;
    px.toneLine(-r, y, r, y, -1);
    for (let x = -r + hash(c, 3) * 4; x < r; x += 4 + hash(x | 0, c) * 6) { px.toneLine(x, y + 1, x, y + ch - 1, -1); const v = hash(x | 0, c + 50); if (v > 0.8 || v < 0.15) for (let i = 1; i < 4; i++) for (let j = 1; j < ch; j++) px.tone(x + i, y + j, v > 0.8 ? 1 : -1); }
  }
  for (let k = 0; k < r * h / 30; k++) px.tone((R() - 0.5) * 2 * r, -R() * h, R() > 0.6 ? 1 : -1);
  // slit, a doorway, ivy
  px.part().rect(-1, -h * 0.55, 2, 8, M.dark, 3); px.part().rect(-1.5, -h * 0.85 + (o.broken ? 12 : 0), 3, 6, M.dark, 3);
  px.part().poly([[-5, 0], [5, 0], [5, -11], [3, -14], [-3, -14], [-5, -11]], M.dark, 3);
  if (o.ivy !== false) for (let k = 0; k < (o.ivyN ?? 10); k++) { const x = -r + R() * r * 1.2, y = -R() * h * 0.7; px.ellipse(x, y, 2 + R() * 3, 2 + R() * 3, M.ivy, 4, { wrap: true }); }
  // rubble at its foot
  for (let k = 0; k < (o.rubble ?? 5); k++) px.part().ellipse((R() - 0.5) * r * 3, -1 - R() * 2, 2 + R() * 2.5, 1.5 + R() * 1.5, m, 6, { round: 0.9 });
  if (o.flag) { px.part().line(0, crown[5][1], 0, crown[5][1] - 14, M.timberD, 7); px.part().poly([[1, crown[5][1] - 14], [9, crown[5][1] - 12], [1, crown[5][1] - 9]], M.blue, 7); }
}, 8);
// a barn: tall timber walls, a big dark door, a hipped slate / thatch roof
const barn = (w, wh, rh, seed = 13, o = {}) => sprite(w + 40, wh + rh + 30, (px) => {
  const R = rng(seed), L = -w / 2, Rr = w / 2, side = Math.round(w * 0.25);
  px.part().poly([[Rr, 0], [Rr + side, -side * 0.5], [Rr + side, -wh - side * 0.5], [Rr, -wh]], M.timberD, 1, { n: F_EAST });
  px.part().rect(L, -wh, w, wh, M.timber, 2, { n: F_FRONT });
  for (let x = L + 2; x < Rr; x += 3) px.toneLine(x, -wh, x, -1, -1);
  for (let x = Rr + 2; x < Rr + side; x += 3) px.toneLine(x, -wh - (x - Rr) * 0.5, x, -(x - Rr) * 0.5 - 1, -1);
  px.part().rect(-7, -wh + 3, 14, wh - 3, M.dark, 2.3); px.part().line(-7, -wh + 3, 7, -1, M.timberD, 2.4); px.part().line(7, -wh + 3, -7, -1, M.timberD, 2.4);
  px.part().rect(-8, -wh + 2, 16, 1.5, M.timberD, 2.4, { n: F_TOP });
  const ey = -wh + 2, ry = -wh - rh;
  px.part().poly([[L - 4, ey], [Rr + 4, ey], [Rr + side + 2, ey - side * 0.5], [Rr + side * 0.6, ry + 2], [L + 5, ry]], o.roof ?? M.thatch, 4, { n: F_ROOF, round: 0.2 });
  px.part().poly([[L - 4, ey - 2], [Rr + 4, ey - 2], [Rr + 4, ey + 1], [L - 4, ey + 1]], o.roof ?? M.thatch, 4.5, { n: [0, 0.6, 0.8] });
  for (let k = 0; k < w * 2; k++) { const x = lerp(L - 4, Rr + 4, R()), y = lerp(ry + 3, ey - 2, R()); px.toneLine(x, y, x, y + 2 + R() * 3, R() > 0.5 ? -1 : 1); }
  px.part().poly([[L + 5, ry - 2], [Rr + side * 0.6, ry], [Rr + side * 0.6, ry + 3], [L + 5, ry + 2]], M.thatchD, 4.6, { n: F_TOP });
  // hay spilling at the door
  for (let k = 0; k < 8; k++) px.part().ellipse((R() - 0.5) * 16, -0.5, 2 + R() * 2, 1, M.hay, 5);
}, 8);
// a haystack: a stooked dome, a pole through its top
const haystack = (r, seed = 14) => sprite(r * 2 + 12, r * 2 + 16, (px) => {
  const R = rng(seed);
  px.part().ellipse(0, -r * 0.9, r, r * 0.95, M.hay, 2, { round: 1 });
  px.part().ellipse(0, -r * 0.35, r * 1.08, r * 0.45, M.hay, 2.2, { round: 0.8 });
  for (let k = 0; k < r * 6; k++) { const x = (R() - 0.5) * r * 1.8, y = -R() * r * 1.7; px.toneLine(x, y, x + (R() - 0.5), y + 2, R() > 0.5 ? -1 : 1); }
  px.part().line(0, -r * 1.85, 0, -r * 2.2, M.timberD, 4);
  px.toneLine(-r, -r * 0.7, r, -r * 0.6, -1);
}, 5);
// a well: round stone curb, two posts, a little shingled roof, a bucket
const well = (seed = 15, t = 0) => sprite(34, 44, (px) => {
  px.part().ellipse(0, -9, 9, 4, M.dark, 2.8);
  px.part().poly([[-10, -8], [10, -8], [10, -1], [-10, -1]], M.stone, 3, { round: 1 });
  px.part().ellipse(0, -1, 10, 3, M.stone, 2.9);
  courses(px, -10, -8, 10, -1, 3, 4, -1, seed);
  px.part().ellipse(0, -8.5, 10, 3.5, M.stoneD, 3.1, { n: F_TOP }); px.part().ellipse(0, -8.5, 7.5, 2.4, M.dark, 3.2);
  px.part().rect(-10, -26, 2, 18, M.timberD, 4); px.part().rect(8, -26, 2, 18, M.timberD, 4);
  px.part().line(-9, -20, 9, -20, M.timber, 4.2);
  px.part().poly([[-13, -24], [13, -24], [9, -32], [-9, -32]], M.slate, 5, { n: F_ROOF });
  for (let y = -26; y > -32; y -= 2) px.toneLine(-12, y, 12, y, -1);
  const sw = Math.sin(t * 1.6) * 1.5;
  px.part().line(0, -20, sw, -14, M.rope, 4.3); px.part().rect(-2 + sw, -14, 4, 4, M.timber, 4.4, { round: 1 });
}, 4);
// a little wayside shrine: a stone niche with a roof, a candle, a saint's figure; and a fingerpost
const shrine = (seed = 16, lit = false, k = 1.4) => big(k, 30, 44, (px) => {
  px.part().rect(-6, -22, 12, 22, M.stone, 2, { n: F_FRONT }); courses(px, -6, -22, 6, 0, 3, 5, -1, seed);
  px.part().poly([[-4, -6], [4, -6], [4, -17], [0, -20], [-4, -17]], M.dark, 2.3);
  px.part().ellipse(0, -11, 2, 4, M.white, 2.6); px.part().ellipse(0, -15.5, 1.5, 1.5, M.white, 2.65);
  px.part().poly([[-9, -21], [9, -21], [0, -30]], M.tile, 3, { n: F_ROOF }); px.part().line(0, -30, 0, -34, M.iron, 3.2); px.part().line(-2, -32.5, 2, -32.5, M.iron, 3.2);
  px.dot(-3, -7, M.candle, 2.7); px.dot(-3, -8, M.flame, 2.75); px.dot(3, -7, M.candle, 2.7); px.dot(3, -8, M.flame, 2.75);
  px.part().ellipse(-8, -1.5, 3, 2, M.stoneD, 2.5); for (let k = 0; k < 4; k++) px.part().ellipse(-6 + k * 4, -0.5, 1.4, 1.2, k % 2 ? M.red : M.clothY, 3);
}, 4);
const fingerpost = (seed = 17, t = 0, k = 1.3) => big(k, 34, 38, (px) => {
  px.part().capsule(0, 0, 1.3, 0, -26, 1.2, M.timberD, 2);
  const sw = Math.sin(t * 1.3) * 0.6;
  px.part().poly([[1, -24], [13, -24 + sw], [15, -22 + sw], [13, -20 + sw], [1, -20]], M.timber, 3, { n: F_FRONT });
  px.part().poly([[-1, -17], [-12, -17 - sw], [-14, -15 - sw], [-12, -13 - sw], [-1, -13]], M.timber, 3, { n: F_FRONT });
  px.toneLine(3, -22, 11, -22, -1); px.toneLine(-3, -15, -10, -15, -1);
  px.part().ellipse(0, -27, 1.8, 1.2, M.timberD, 3);
}, 4);
const bench = () => sprite(22, 14, (px) => { px.part().rect(-8, -5, 16, 2, M.timber, 2, { n: F_TOP }); px.part().rect(-7, -3, 2, 3, M.timberD, 1.9); px.part().rect(5, -3, 2, 3, M.timberD, 1.9); }, 3);
// a hauled-up boat: clinker hull keel-up on chocks, or upright with oars
const boat = (len, seed = 18, o = {}) => sprite(len + 16, 30, (px) => {
  const R = rng(seed), hl = len / 2;
  px.part().poly([[-hl, -6], [-hl + 4, -1], [hl - 6, -1], [hl, -7], [hl - 3, -10], [-hl + 3, -10]], M.hull, 2, { round: 0.5, ny: 0.1 });
  for (let y = -3; y > -10; y -= 2.2) px.toneLine(-hl + 2, y, hl - 2, y, -1);
  px.part().poly([[-hl + 3, -10], [hl - 3, -10], [hl - 4, -12], [-hl + 4, -12]], o.paint ?? M.blue, 2.4, { n: F_TOP });
  px.part().poly([[-hl + 5, -12], [hl - 5, -12], [hl - 7, -14], [-hl + 7, -14]], M.dark, 2.3);
  for (let x = -hl + 8; x < hl - 6; x += 7) px.part().line(x, -12, x, -14, M.timber, 2.5);
  px.part().line(-hl + 4, -15, hl - 2, -11, M.timberD, 3); px.part().rect(hl - 4, -13, 5, 2, M.timber, 3.1);
  px.part().ellipse(-hl + 6, -0.5, 3, 1.5, M.timberD, 3); px.part().ellipse(hl - 8, -0.5, 3, 1.5, M.timberD, 3);
}, 4);
// a net rack: two poles, a line, a net hung in a sag, floats
const netRack = (w = 34, t = 0) => sprite(w + 16, 34, (px) => {
  const L = -w / 2, Rr = w / 2;
  px.part().line(L, 0, L, -20, M.timberD, 2); px.part().line(Rr, 0, Rr, -20, M.timberD, 2);
  px.part().line(L, -19, Rr, -19, M.rope, 2.2);
  const sway = Math.sin(t * 1.4) * 1.2;
  for (let x = L + 2; x < Rr - 1; x += 2) { const sag = 8 + Math.sin(((x - L) / w) * Math.PI) * 4; px.part().line(x, -19, x + sway, -19 + sag, M.rope, 2.4, { noLine: true }); }
  for (let y = -17; y > -19 + 10; y -= 2) px.part().line(L + 2, y, Rr - 2, y, M.rope, 2.4, { noLine: true });
  for (let x = L + 4; x < Rr - 2; x += 6) px.part().ellipse(x + sway, -19 + 8 + Math.sin(((x - L) / w) * Math.PI) * 4, 1.2, 1.2, M.red, 2.6);
}, 3);
const creels = (seed = 19) => sprite(26, 18, (px) => { const R = rng(seed); for (let k = 0; k < 3; k++) { const x = -7 + k * 6 + R(); px.part().ellipse(x, -3.5, 3.5, 3.5, M.thatchD, 2 + k * 0.1, { round: 0.9 }); for (let y = -6; y < 0; y += 2) px.toneLine(x - 3, y, x + 3, y, -1); } }, 3);
const woodpile = (seed = 20) => sprite(32, 20, (px) => { const R = rng(seed); for (let row = 0; row < 3; row++) for (let k = 0; k < 6 - row; k++) { const x = -10 + k * 4 + row * 2, y = -2 - row * 3.5; px.part().ellipse(x, y, 2, 1.8, M.timber, 2 + row, { round: 0.9 }); px.dot(x, y, M.wool, 2.1 + row); } }, 3);
const cart = (seed = 21, o = {}) => sprite(54, 34, (px) => {
  px.part().ellipse(-12, -6, 6, 6, M.timberD, 1, { round: 0.2 }); px.part().ellipse(-12, -6, 4, 4, M.dark, 1.1);
  px.part().line(-12, -10, -12, -2, M.timberD, 1.2); px.part().line(-16, -6, -8, -6, M.timberD, 1.2);
  px.part().poly([[-20, -10], [10, -10], [12, -16], [-18, -16]], M.timber, 2, { n: F_FRONT });
  for (let x = -18; x < 12; x += 4) px.toneLine(x, -16, x, -10, -1);
  if (o.load === "hay") px.part().ellipse(-4, -20, 15, 7, M.hay, 2.5, { round: 1 });
  if (o.load === "crates") { px.part().rect(-16, -24, 9, 8, M.timber, 2.5, { n: F_FRONT }); px.part().rect(-6, -26, 10, 10, M.timber, 2.6, { n: F_FRONT }); px.toneLine(-6, -21, 4, -21, -1); }
  if (o.load === "stone") for (let k = 0; k < 5; k++) px.part().ellipse(-14 + k * 5, -18 - (k % 2) * 2, 3, 2.4, M.stone, 2.5 + k * 0.01);
  px.part().line(10, -12, 24, -4, M.timberD, 3); px.part().ellipse(6, -6, 6, 6, M.timberD, 3.2, { round: 0.2 }); px.part().ellipse(6, -6, 4, 4, M.dark, 3.3);
  px.part().line(6, -10, 6, -2, M.timberD, 3.4); px.part().line(2, -6, 10, -6, M.timberD, 3.4);
}, 4);
const hen = (t = 0, seed = 22, col = M.hen) => sprite(12, 12, (px) => {
  const peck = Math.sin(t * 2.2 + seed) > 0.4;
  px.part().ellipse(0, -2.5, 2.5, 1.8, col, 2); px.part().ellipse(-1.8, peck ? -1.5 : -4, 1.2, 1.2, col, 2.2);
  px.dot(-2, peck ? -2.5 : -5, M.comb, 2.4); px.dot(-3, peck ? -1 : -4, M.clothY, 2.4); px.dot(1.5, -3.5, M.timber, 2.1);
}, 2);
// cottage chimney smoke: soft puffs that rise and drift (live: a 4-frame strip)
const smoke = (t = 0) => sprite(30, 46, (px) => {
  for (let k = 0; k < 5; k++) {
    const u = ((k + t * 0.25) % 5) / 5, x = u * 10 + Math.sin(u * 5 + k) * 2, y = -u * 36, r = 1.5 + u * 4;
    px.part().ellipse(x, y, r, r * 0.8, mat("#d8d4cc"), 2 + k * 0.01, { round: 0.8, noLine: u > 0.6 });
  }
}, 4);
const flame = (t = 0) => sprite(16, 18, (px) => {
  for (let k = 0; k < 4; k++) px.part().capsule((k - 1.5) * 2, -1, 1.5, (k - 1.5) * 2.5 + Math.sin(t * 3 + k) * 0.8, -1, 1, M.timberD, 1);
  const f = [5, 7, 6, 4][t % 4];
  px.part().ellipse(0, -3, 3, f * 0.6, flat("#ffb040", { emis: true }), 2); px.part().ellipse(0, -2.5, 1.6, f * 0.35, flat("#fff0a0", { emis: true }), 2.1);
}, 3);

// ---- Iron pieces -------------------------------------------------------------------------------
// a tor: stacked slabs of granite, each with a lit top and a cracked south face
const tor = (w, h, seed = 30, o = {}) => sprite(w + 30, h + 24, (px) => {
  const R = rng(seed), m = o.m ?? M.granite, m2 = o.m2 ?? M.graniteD;
  const blocks = o.blocks ?? 6;
  for (let b = 0; b < blocks; b++) {
    const row = b < blocks * 0.5 ? 0 : b < blocks * 0.84 ? 1 : 2;
    const bw = w * (row === 0 ? 0.42 : row === 1 ? 0.38 : 0.3) * (0.8 + R() * 0.4), bh = h * (row === 2 ? 0.3 : 0.36) * (0.85 + R() * 0.3);
    const cx = (R() - 0.5) * w * (row === 0 ? 0.7 : row === 1 ? 0.45 : 0.2), by = -row * h * 0.31 - (row ? 2 : 0);
    const top = by - bh, k = 3 + R() * 3;
    px.part().poly([[cx - bw / 2, by], [cx + bw / 2, by], [cx + bw / 2 + 1, top + k], [cx + bw / 2 - k, top], [cx - bw / 2 + k, top - 1], [cx - bw / 2 - 1, top + k]], b % 3 === 2 ? m2 : m, 2 + row + R() * 0.3, { round: 0.55 });
    px.part().poly([[cx - bw / 2 + k * 0.6, top + 1], [cx + bw / 2 - k * 0.6, top + 1], [cx + bw / 2 - k, top + bh * 0.28], [cx - bw / 2 + k, top + bh * 0.28]], m, 2.05 + row + 0.4, { n: F_TOP, noLine: true });
    for (let c = 0; c < bw / 6; c++) { const x = cx + (R() - 0.5) * bw * 0.9; px.toneLine(x, top + bh * 0.3, x + (R() - 0.5) * 3, by - 1, -1); }
    for (let c = 0; c < bw * bh / 16; c++) px.tone(cx + (R() - 0.5) * bw, by - R() * bh, R() > 0.55 ? 1 : -1);
    if (o.lichen !== false) for (let c = 0; c < 2; c++) px.ellipse(cx + (R() - 0.5) * bw * 0.6, top + 2 + R() * 3, 2 + R() * 2, 1.2, M.lichen, 6, { wrap: true });
  }
  if (o.heather) for (let k = 0; k < 9; k++) px.part().ellipse((R() - 0.5) * w * 1.1, -1 - R() * 3, 3 + R() * 3, 2 + R(), M.heather, 9, { round: 0.9 });
}, 6);
// a crag: big faceted granite masses stacked in rows, the biggest at the foot, lichen and heather in the clefts
const crag = (w, h, seed = 36, o = {}) => sprite(w * 1.6 + 30, h * 1.5 + 30, (px) => {
  const R = rng(seed), m = o.m ?? M.granite, m2 = o.m2 ?? M.graniteD;
  const rows = [[5, 0.24, 0.42], [4, 0.2, 0.36], [2, 0.18, 0.32]];
  let base = 0;
  rows.forEach(([n, rw, rh], row) => {
    for (let k = 0; k < n; k++) {
      const cx = (n === 1 ? (R() - 0.5) * 0.2 : (k / (n - 1) - 0.5) * (1 - row * 0.3)) * w * 0.66 + (R() - 0.5) * 8, rx = w * rw * (0.85 + R() * 0.3), ry = h * rh * (0.85 + R() * 0.3);
      rockPoly(px, cx, base - ry * 0.55, rx, ry, R, (k + row) % 3 === 1 ? m2 : m, 2 + row + R() * 0.2, { n: 9 });
      if (R() > 0.4) rockPoly(px, cx + (R() - 0.5) * rx, base - ry * (0.3 + R() * 0.5), rx * 0.45, ry * 0.4, R, m, 2.4 + row, { n: 6 });
    }
    base -= h * rh * 0.62;
  });
  for (let k = 0; k < w / 5; k++) { const x = (R() - 0.5) * w * 0.9, y = -R() * h * 0.95; px.toneLine(x, y, x + (R() - 0.5) * 5, y + 3 + R() * 7, -1); }
  for (let k = 0; k < w * 2; k++) px.tone((R() - 0.5) * w, -R() * h, R() > 0.6 ? 1 : -1);
  for (let k = 0; k < w / 14; k++) px.ellipse((R() - 0.5) * w * 0.7, -R() * h * 0.9, 2 + R() * 3, 1.3, M.lichen, 9, { wrap: true });
  if (o.heather) for (let k = 0; k < w / 8; k++) px.part().ellipse((R() - 0.5) * w * 1.2, -1 - R() * 10 * R(), 3 + R() * 4, 2 + R() * 1.4, R() > 0.4 ? M.heather : M.mossD, 12, { round: 0.9 });
}, 8);
const tent = (w, h, seed = 31, o = {}) => sprite(w + 24, h + 28, (px) => {
  const R = rng(seed), c1 = o.c1 ?? M.canvas, c2 = o.c2 ?? M.cloth, L = -w / 2, Rr = w / 2;
  if (o.pavilion) {
    px.part().poly([[L, 0], [Rr, 0], [Rr, -h * 0.45], [L, -h * 0.45]], c1, 2, { round: 0.95 });
    for (let k = 0; k < 6; k++) { const x0 = lerp(L, Rr, k / 6), x1 = lerp(L, Rr, (k + 1) / 6); if (k % 2) px.part().poly([[x0, 0], [x1, 0], [x1, -h * 0.45], [x0, -h * 0.45]], c2, 2.1, { round: 0.3 }); }
    px.part().poly([[L - 3, -h * 0.45], [Rr + 3, -h * 0.45], [0, -h]], c2, 3, { round: 0.7 });
    for (let k = 0; k < 4; k++) px.part().poly([[lerp(L - 3, Rr + 3, k / 4), -h * 0.45], [lerp(L - 3, Rr + 3, (k + 0.5) / 4), -h * 0.45], [0, -h]], c1, 3.1, { round: 0.7 });
    for (let x = L - 3; x < Rr + 3; x += 4) px.part().poly([[x, -h * 0.45], [x + 4, -h * 0.45], [x + 2, -h * 0.45 + 3]], c2, 3.2);
    px.part().poly([[-4, 0], [4, 0], [3, -h * 0.4], [-3, -h * 0.4]], M.dark, 2.3);
    px.part().line(0, -h, 0, -h - 10, M.timberD, 4); px.part().poly([[1, -h - 10], [10 + Math.sin((o.t ?? 0) * 2) * 1.5, -h - 8], [1, -h - 6]], o.pennant ?? M.clothY, 4);
  } else {
    px.part().poly([[L, 0], [0, -h], [Rr * 0.15, -h + 1], [Rr, 0]], c1, 2, { n: F_FRONT, round: 0.3 });
    px.part().poly([[Rr, 0], [Rr * 0.15, -h + 1], [Rr + w * 0.3, -h * 0.3], [Rr + w * 0.3, 0]], c1, 1.5, { n: F_EAST });
    px.part().poly([[-3, 0], [0, -h * 0.75], [3, 0]], M.dark, 2.2);
    px.part().line(0, -h, 0, -h - 4, M.timberD, 3);
    if (o.stripe) px.part().poly([[L * 0.5, -h * 0.5], [Rr * 0.55, -h * 0.5], [Rr * 0.48, -h * 0.4], [L * 0.6, -h * 0.4]], c2, 2.3);
    for (let k = 0; k < 4; k++) px.toneLine(lerp(L, Rr, R()), -R() * h * 0.6, lerp(L, Rr, R()), -1, -1);
    px.part().line(L, 0, L - 5, 2, M.rope, 3); px.part().line(Rr + w * 0.3, 0, Rr + w * 0.3 + 5, 2, M.rope, 3);
  }
}, 6);
const palisade = (pts, seed = 32) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - 6, x1 = Math.max(...xs) + 6, y0 = Math.min(...ys) - 24, y1 = Math.max(...ys) + 6;
  const ox = Math.round(-x0) + 2, oy = Math.round(-y0) + 2, px = new Pix(Math.ceil(x1 - x0) + 4, Math.ceil(y1 - y0) + 4, ox, oy), R = rng(seed);
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.round(Math.hypot(bx - ax, by - ay) / 3.4);
    for (let k = 0; k <= n; k++) { const x = lerp(ax, bx, k / n), y = lerp(ay, by, k / n), hh = 15 + R() * 4; px.part().poly([[x - 1.6, y], [x + 1.6, y], [x + 1.6, y - hh], [x, y - hh - 3], [x - 1.6, y - hh]], R() > 0.8 ? M.timberD : M.timber, y * 0.01 + 1, { round: 0.9 }); }
    px.part().line(ax, ay - 6, bx, by - 6, M.rope, Math.max(ay, by) * 0.01 + 1.5);
  }
  const img = px.resolve({ line: "tint" }), cv = toCanvas(img); grade(cv);
  return { cv, ox: img.ox, oy: img.oy };
};
const banner = (t = 0, h = 30, col = M.cloth) => sprite(26, h + 12, (px) => {
  px.part().line(0, 0, 0, -h, M.timberD, 2); px.part().line(-1, -h + 2, 10, -h + 2, M.timberD, 2.1);
  const w = Math.sin(t * 1.7);
  px.part().poly([[0, -h + 2], [10, -h + 2], [10 + w, -h + 16], [5 + w * 0.5, -h + 13], [0, -h + 16]], col, 2.2, { round: 0.5 });
  px.part().poly([[3, -h + 6], [7, -h + 6], [7 + w * 0.3, -h + 10], [3, -h + 10]], M.clothY, 2.3);
}, 3);
const rack = (seed = 33) => sprite(30, 26, (px) => {
  px.part().line(-10, 0, -10, -14, M.timberD, 1); px.part().line(10, 0, 10, -14, M.timberD, 1); px.part().line(-11, -12, 11, -12, M.timber, 1.2);
  for (let k = 0; k < 5; k++) { const x = -8 + k * 4; px.part().line(x, -1, x + 1, -18, M.timber, 2); px.part().poly([[x + 0.5, -18], [x + 2, -20], [x + 1.5, -16]], M.iron, 2.1); }
  px.part().ellipse(-12, -6, 4, 5, M.cloth, 3, { round: 0.6 }); px.part().ellipse(-12, -6, 1.5, 1.5, M.clothY, 3.1);
}, 3);
const crates = (seed = 34) => sprite(30, 26, (px) => {
  px.part().rect(-11, -9, 10, 9, M.timber, 2, { n: F_FRONT }); px.part().rect(0, -8, 9, 8, M.timber, 2.1, { n: F_FRONT }); px.part().rect(-6, -17, 9, 8, M.timber, 2.3, { n: F_FRONT });
  for (const [x, y, w] of [[-11, -9, 10], [0, -8, 9], [-6, -17, 9]]) { px.toneLine(x, y + 1, x + w, y + 1, -1); px.toneLine(x + 1, y + 1, x + w - 1, y + 7, -1); }
  px.part().capsule(11, -1, 3, 11, -8, 3, M.timberD, 2.2, { round: 0.9 }); px.toneLine(8, -4, 14, -4, -1);
}, 3);
const horse = (t = 0, seed = 35, col = M.hull) => sprite(44, 36, (px) => {
  const graze = Math.sin(t * 1.1 + seed * 2) > 0.2, tail = Math.sin(t * 1.7 + seed) * 1.5;
  for (const [x, z] of [[-7, 1.5], [9, 1.5]]) px.part().limb([[x, -12], [x - 0.5, -6], [x, 0]], 1.4, M.timberD, z);
  px.part().ellipse(1, -14, 11, 5.5, col, 2, { round: 0.9 });
  for (const [x, z] of [[-5, 3], [11, 3]]) px.part().limb([[x, -12], [x + 0.5, -6], [x, 0]], 1.5, col, z);
  px.part().limb([[-8, -16], graze ? [-14, -9] : [-13, -22], graze ? [-17, -3] : [-17, -24]], [3.4, 2.6, 2.2], col, 3.2);
  px.part().line(-9, -19, graze ? -14 : -12, graze ? -10 : -24, M.dark, 3.4);
  px.dot(graze ? -18 : -18, graze ? -3 : -24, M.white, 3.5);
  px.part().limb([[12, -16], [14 + tail, -10], [13 + tail, -5]], 1.4, M.dark, 1.8);
  px.part().rect(-2, -20, 7, 2, M.cloth, 3.6);
}, 3);

// ---- Hollow pieces -------------------------------------------------------------------------------
// draw a piece k times bigger with the SAME art pixel (coordinates and radii scale, lines stay 1 px)
const scaled = (px, k) => ({
  part: () => { px.part(); return scaled(px, k); },
  poly: (pts, m, z, o) => { px.poly(pts.map(([x, y]) => [x * k, y * k]), m, z, o); return scaled(px, k); },
  rect: (x, y, w, h, m, z, o) => { px.rect(x * k, y * k, w * k, h * k, m, z, o); return scaled(px, k); },
  ellipse: (x, y, rx, ry, m, z, o) => { px.ellipse(x * k, y * k, rx * k, ry * k, m, z, o); return scaled(px, k); },
  capsule: (ax, ay, ra, bx, by, rb, m, z, o) => { px.capsule(ax * k, ay * k, ra * k, bx * k, by * k, rb * k, m, z, o); return scaled(px, k); },
  line: (ax, ay, bx, by, m, z, o) => { px.line(ax * k, ay * k, bx * k, by * k, m, z, o); return scaled(px, k); },
  dot: (x, y, m, z, o) => { px.ellipse(x * k, y * k, k * 0.6, k * 0.6, m, z, o); return scaled(px, k); },
  tone: (x, y, d) => { px.tone(x * k, y * k, d); return scaled(px, k); },
  toneLine: (ax, ay, bx, by, d) => { px.toneLine(ax * k, ay * k, bx * k, by * k, d); return scaled(px, k); },
});
const big = (k, w, h, build, oy = 4) => sprite(w * k, h * k, (px) => build(scaled(px, k)), oy);

const headstone = (kind, seed = 40, lean = 0, k = 1.6) => big(k, 18, 24, (px) => {
  const R = rng(seed), m = R() > 0.5 ? M.bstone : M.bstoneD;
  if (kind === "cross") { px.part().rect(-1.2 + lean, -14, 2.4, 14, m, 2, { round: 0.6 }); px.part().rect(-4 + lean * 0.8, -11, 8, 2.2, m, 2.1, { round: 0.4 }); }
  else if (kind === "slab") { px.part().poly([[-4, 0], [4, 0], [4 + lean, -10], [2 + lean, -12], [-2 + lean, -12], [-4 + lean, -10]], m, 2, { round: 0.5 }); px.toneLine(-2 + lean * 0.5, -8, 2 + lean * 0.5, -8, -1); px.toneLine(-2 + lean * 0.4, -6, 2 + lean * 0.4, -6, -1); }
  else { px.part().ellipse(0, -1, 4, 1.6, M.bstoneD, 1.5); px.part().rect(-3, -3, 6, 3, m, 2, { n: F_TOP }); }
  px.ellipse(-1 + lean * 0.5, -7 - R() * 4, 1.6, 1.2, M.lichen, 4, { wrap: true });
  px.part().ellipse(0, -0.5, 4, 1.2, M.turfD, 3);
}, 3);
// a roofless chapel: a tall west gable with a pointed window, two stub walls, a fallen column
const chapel = (seed = 41, o = {}) => big(o.k ?? 1.6, 110, 110, (px) => {
  const R = rng(seed), m = M.bstone, d = M.bstoneD;
  // the far (north) wall, low and broken
  px.part().poly([[-30, -36], [26, -36], [26, -44], [18, -50], [8, -46], [-4, -54], [-16, -48], [-30, -52]], d, 1, { n: F_FRONT }); courses(px, -30, -54, 26, -36, 3, 6, -1, 3);
  // east side wall running toward us (its inner face), broken short
  px.part().poly([[26, -36], [34, -28], [34, -8], [30, -6], [30, -20], [26, -30]], d, 1.5, { n: F_WEST });
  // the floor inside: flagstones, weeds
  px.part().poly([[-30, -36], [26, -36], [34, -8], [-26, -6]], M.floor, 0.5, { n: [0, 0, 1], noLine: true });
  for (let k = 0; k < 40; k++) { const x = -26 + R() * 56, y = -34 + R() * 26; px.tone(x, y, R() > 0.5 ? -1 : 1); }
  for (let k = 0; k < 7; k++) px.part().ellipse(-22 + R() * 50, -30 + R() * 20, 2 + R() * 2, 1.2, M.mossD, 0.8);
  for (let k = 0; k < 5; k++) px.part().ellipse(-20 + R() * 48, -28 + R() * 18, 1.6, 1.2, m, 0.9, { round: 0.9 });
  // the west gable: tall, a lancet window, ivy
  px.part().poly([[-36, 0], [-24, 0], [-24, -62], [-30, -76], [-36, -62]], m, 3, { n: F_FRONT });
  px.part().poly([[-36, 0], [-36, -62], [-42, -58], [-42, -4]], d, 2.8, { n: F_WEST });
  courses(px, -42, -76, -24, 0, 3, 5, -1, 7);
  px.part().poly([[-32, -30], [-28, -30], [-28, -48], [-30, -53], [-32, -48]], M.dark, 3.2);
  px.part().line(-30, -52, -30, -30, d, 3.3);
  px.part().ellipse(-30, -66, 2, 2, M.dark, 3.2);
  for (let k = 0; k < 10; k++) px.ellipse(-40 + R() * 10, -R() * 50, 2 + R() * 2.5, 2 + R() * 3, M.ivy, 4, { wrap: true });
  // the south wall stub in front, with a doorway arch
  px.part().poly([[-24, 0], [6, 0], [6, -14], [0, -20], [-10, -18], [-18, -24], [-24, -22]], m, 6, { n: F_FRONT });
  courses(px, -24, -24, 6, 0, 3, 6, -1, 9);
  px.part().poly([[-16, 0], [-8, 0], [-8, -10], [-12, -14], [-16, -10]], M.dark, 6.2);
  // fallen column drums and blocks
  for (let k = 0; k < 3; k++) px.part().capsule(16 + k * 7, -2 - k * 0.5, 3, 20 + k * 7, -3, 3, m, 7 + k * 0.1, { round: 0.9 });
  for (let k = 0; k < 6; k++) px.part().ellipse(-4 + R() * 40, -1 - R() * 4, 2 + R() * 2, 1.5 + R(), d, 7.5, { round: 0.9 });
  if (o.lit) { px.dot(-31, -40, M.flame, 3.5); px.dot(-29, -36, M.glow, 3.5); }
}, 6);
const tomb = (seed = 42, k = 1.6) => big(k, 46, 46, (px) => {
  const m = M.bstone, d = M.bstoneD;
  px.part().poly([[14, 0], [20, -4], [20, -20], [14, -18]], d, 1, { n: F_EAST });
  px.part().rect(-14, -18, 28, 18, m, 2, { n: F_FRONT }); courses(px, -14, -18, 14, 0, 3, 7, -1, seed);
  px.part().poly([[-16, -18], [16, -18], [21, -21], [3, -30], [-16, -19]], d, 3, { n: F_ROOF });
  px.part().poly([[-16, -18], [16, -18], [0, -28]], m, 3.2, { n: F_FRONT });
  px.part().rect(-5, -14, 10, 14, M.iron, 2.2, { n: F_FRONT }); for (let x = -4; x < 5; x += 2) px.toneLine(x, -13, x, -1, 1);
  px.part().ellipse(0, -22, 2, 2, M.dark, 3.3);
  px.ellipse(-12, -6, 3, 4, M.ivy, 4, { wrap: true }); px.ellipse(10, -24, 3, 2, M.lichen, 4, { wrap: true });
}, 4);
const lychgate = (seed = 43, k = 1.5) => big(k, 48, 44, (px) => {
  for (const x of [-14, 12]) { px.part().rect(x, -20, 3, 20, M.timberD, 2, { round: 0.6 }); }
  px.part().poly([[-20, -18], [20, -18], [14, -30], [-14, -30]], M.slate, 3, { n: F_ROOF }); for (let y = -20; y > -30; y -= 2) px.toneLine(-18, y, 18, y, -1);
  px.part().poly([[-21, -19], [21, -19], [21, -17], [-21, -17]], M.timberD, 3.1);
  px.part().rect(-11, -4, 22, 2.5, M.timber, 2.2, { n: F_TOP });
  px.part().line(-13, -15, -13, -2, M.iron, 2.3);
}, 4);
const lantern = (t = 0) => big(1.4, 12, 26, (px) => { px.part().line(0, 0, 0, -16, M.iron, 1); px.part().line(0, -16, 3, -16, M.iron, 1); px.part().rect(2, -15, 3, 4, M.iron, 1.2); px.part().rect(2.5, -14, 2, 2, flat(t % 2 ? "#ffe08a" : "#ffc860", { emis: true }), 1.3); }, 3);
const railings = (len, seed = 44) => sprite(len + 10, 20, (px) => { px.part().line(-len / 2, -8, len / 2, -8, M.iron, 1); px.part().line(-len / 2, -3, len / 2, -3, M.iron, 1); for (let x = -len / 2; x <= len / 2; x += 2) px.part().line(x, 0, x + (hash(x | 0, seed) > 0.85 ? 1 : 0), -10, M.iron, 1.1); }, 3);
const glow = (ctx, x, y, r, col, a) => { // a stepped pool of light on the ground (the game's addLight look, in whole pixels)
  for (let j = -r; j <= r; j++) for (let i = -r * 1.6; i <= r * 1.6; i++) { const d = Math.hypot(i / 1.6, j) / r; if (d > 1) continue; const s = d < 0.4 ? 3 : d < 0.7 ? 2 : 1; if (s === 1 && (i + j) % 2) continue; ctx.fillStyle = `rgba(${col},${a * s / 3})`; ctx.fillRect(Math.round(x + i), Math.round(y + j), 1, 1); }
};

// ---- the ground palettes --------------------------------------------------------------------------
const DIRT = { gw: ["#8e8a44", "#a8885a", "#bc9c6c", "#8a6e46"], iron: ["#66704a", "#7e7660", "#8e8670", "#6a6252"], hollow: ["#3e4a34", "#5a5644", "#6a6450", "#4a463a"] };
const SOIL = ["#5a3e28", "#6e4c30", "#83603e"], LEAF = ["#4f8a2c", "#6aa83a", "#9ac850"];

// ======================================================================================================
// THE OPTIONS, per scene. Coordinates are board units inside the 420 x 280 patch (lx, ly).
// ======================================================================================================
const OPTIONS = {
  // ---------------- the Greenwood meadow (Gullwick) ----------------
  gw: {
    A: (S, t) => {
      // one cottage the size of a hall, a tall ruined tower, a boulder group you could hide behind, a big hauled boat
      S.onGround((c) => { const [x, y] = S.P(380, 100); worn(c, x, y + 4, 60, 12, DIRT.gw, 2, 0.8); });
      S.add(cottage({ w: 96, wh: 36, rh: 52, seed: 3, frame: true, butt: true, bench: true, windows: [-38, -20, 14], door: -4, chimneyX: 30 }), 375, 98);
      S.add(smoke(t), 392, 50, { shade: 0, dy: 200 });
      S.add(fence([[-56, 0], [56, 0]], 3, { h: 11, gap: 12 }), 380, 128);
      S.add(ruinTower(26, 132, 12, { broken: true, ivyN: 22, rubble: 9 }), 386, 226);
      S.add(boulder(34, 5, { grass: true }), 80, 172);
      S.add(boulder(15, 9, { grass: true, lumps: 2 }), 120, 178);
      S.add(boulder(9, 11, { lumps: 1 }), 48, 179);
      S.add(boat(96, 4, { paint: M.red }), 378, 272, { road: true });
      S.add(woodpile(3), 352, 150);
    },
    B: (S, t) => {
      // the farmstead: yard, cottage, barn, well, hay, a kitchen garden in its paddock, hens, a path to the road
      S.onGround((c) => {
        const D = DIRT.gw;
        let [x, y] = S.P(382, 96); worn(c, x, y, 76, 22, D, 4, 2.4); worn(c, x - 20, y + 6, 40, 10, D, 9, 2.4);
        path(c, [S.P(366, 104), S.P(352, 110), S.P(336, 114)], 5, D, 5);
        path(c, [S.P(396, 110), S.P(392, 150), S.P(388, 196)], 3, D, 6);
        [x, y] = S.P(346, 126); plot(c, x, y, 70, 34, SOIL, LEAF, 3);
        [x, y] = S.P(52, 176); worn(c, x, y, 26, 8, D, 7, 1.5);
        [x, y] = S.P(388, 214); worn(c, x, y, 40, 12, D, 8, 1.5);
        [x, y] = S.P(378, 266); worn(c, x, y, 44, 9, ["#c4ae7a", "#b49a6a", "#c8b488"], 6, 1.5);
      });
      S.add(barn(54, 30, 30, 4), 357, 70);
      S.add(cottage({ w: 54, wh: 26, rh: 32, seed: 5, stone: true, wall: M.stoneW, butt: true, windows: [-20, -8], door: 6, chimneyX: 16 }), 394, 80);
      S.add(smoke(t), 403, 47, { shade: 0, dy: 200 });
      S.add(well(5, t), 381, 106);
      S.add(haystack(11, 2), 405, 116); S.add(haystack(8, 3), 416, 109);
      S.add(fence([[0, 0], [72, 0], [72, 40], [0, 40], [0, 8]], 8, { h: 9, gap: 9 }), 344, 124);
      S.add(sprite(30, 28, (px) => { px.part().rect(-6, -14, 12, 14, M.timber, 2, { n: F_FRONT }); px.part().poly([[-8, -14], [8, -14], [0, -21]], M.thatch, 3, { n: F_ROOF }); px.part().rect(-2, -6, 4, 4, M.dark, 2.2); }, 3), 352, 99);
      for (let k = 0; k < 6; k++) S.add(hen(t, k, k === 2 ? M.hull : M.hen), 364 + (k * 9) % 34, 100 + (k * 5) % 12, { shade: 0.5 });
      // the wayside shrine at the bend: a fingerpost, a bench, offerings
      S.add(shrine(2), 52, 174); S.add(fingerpost(1, t), 74, 180); S.add(bench(), 38, 180);
      // the old watchtower kept by hunters: a lean-to, their fire, the deer hung on a rack
      S.add(ruinTower(16, 74, 14, { broken: true, ivyN: 8, flag: true, rubble: 4 }), 400, 214);
      S.add(tent(26, 18, 7, { c1: M.canvas }), 372, 212); S.add(flame(t), 382, 222, { shade: 0 }); S.add(woodpile(5), 362, 224);
      // the fishers' strand: rack, creels, boat
      S.add(netRack(44, t), 366, 264, { road: true }); S.add(creels(), 392, 266, { road: true }); S.add(boat(56, 6), 408, 276, { road: true });
    },
    C: (S, t) => {
      // the land has a skeleton: ledges lift the castle's strip in terraces, an outcrop spine breaks the field,
      // a drystone wall follows the contour, kerb stones line the old road, standing stones and an old arch on the rise
      const terrace = (c, lx0, lx1, ly, hgt) => {
        // the lifted land catches the sun (a lighter rim above the edge), the foot lies in its own shade, scree spills
        const [x0, y0] = S.P(lx0, ly), x1 = S.P(lx1, ly)[0];
        for (let i = x0; i < x1; i++) {
          for (let j = 1; j < 9; j++) if (hash(i, j) < 0.75 - j * 0.07) px1(c, i, y0 - hgt - 3 - j, "#a6d856");
          for (let j = 0; j < 22; j++) if (hash(i, j + 3) < 0.95 - j * 0.04) px1(c, i, y0 + j - 2, j < 8 ? "#3a6420" : "#47762a");
        }
        // the lifted land is lit a step brighter than the land below it
        c.fillStyle = "rgba(255,244,190,0.13)"; c.fillRect(x0, y0 - hgt - 3 - 200, x1 - x0, 200 - 4);
        for (let k = 0; k < (x1 - x0) * 0.7; k++) { const i = x0 + hash(k, 1) * (x1 - x0), j = 2 + hash(k, 2) * 26 * hash(k, 3); px1(c, Math.round(i), Math.round(y0 + j), hash(k, 4) > 0.5 ? "#a29d90" : "#7c786e"); }
      };
      S.onGround((c) => { terrace(c, 340, 421, 136, 38); terrace(c, 340, 421, 240, 30); });
      const run = (n, wob, seed) => { const p = []; for (let k = 0; k <= n; k++) p.push([-82 + k * 10, Math.sin(k * 0.7 + seed) * wob]); return p; };
      S.add(ledge(run(16, 3, 1), 38, 4, { bands: 4 }), 381, 136, { dy: -14 });
      S.add(ledge(run(16, 3, 3), 30, 6, { bands: 3 }), 381, 240, { dy: -14 });
      S.add(boulder(11, 41), 346, 140); S.add(boulder(7, 42, { lumps: 1 }), 358, 146);
      S.add(boulder(9, 43), 349, 245);
      S.add(menhir(54, 15, 3, 6, { ring: true, carve: true }), 404, 96);
      S.add(menhir(34, 12, -4, 7, { ring: true }), 384, 102);
      S.add(arch(40, 42, 3), 382, 206);
      // the spine of bedrock across the field's foot, a scree fan below its end
      S.add(outcrop(190, 22, 3), 106, 176);
      S.add(boulder(12, 13), 186, 177); S.add(boulder(6, 14, { lumps: 1 }), 198, 180);
      S.add(dryWall([[-70, 0], [-40, -6], [-10, -8], [20, -14], [50, -16]], 11, 3, { gaps: 0.04 }), 92, 128);
      // the old road's kerb: big squared stones just off the road edge, some sunk and tilted, all mossy
      for (let k = 0, lx = 46; lx < 262; k++) {
        const r = hash(k, 7), w = 5 + Math.floor(r * 5), sunk = hash(k, 9);
        lx += w * 0.5 + 2 + (hash(k, 11) > 0.8 ? 14 : 0);
        if (lx < 160 || lx > 200) S.add(sprite(w * 2 + 12, 18, (px) => {
          const top = -4 - (1 - sunk) * 3;
          px.part().poly([[-w, 0], [w, 0], [w + (r - 0.5) * 2, top + (r - 0.5) * 2], [-w, top]], M.stoneW, 2, { n: [(r - 0.5) * 0.4, 0.15, 0.98] });
          px.part().poly([[-w, top], [w + (r - 0.5) * 2, top + (r - 0.5) * 2], [w - 1, top - 3], [-w + 1, top - 3]], M.stoneW, 2.1, { n: F_TOP });
          if (sunk > 0.4) px.ellipse(-w * 0.4 + r * w, top - 1, w * 0.6, 1.4, M.moss, 3, { wrap: true });
          px.part().ellipse(0, -0.5, w + 1, 1.6, M.turfD, 2.5); }, 3), lx, 184, { road: true, shade: 0.5 });
        lx += w * 0.5;
      }
      // the beach: bedrock shelves running into the sand
      S.add(outcrop(90, 9, 9, { turf: false, moss: M.wet }), 384, 270, { road: true });
      S.add(boulder(8, 15, { moss: M.wet }), 346, 272, { road: true });
    },
  },
  // ---------------- the Iron Marches (Crowstair) ----------------
  iron: {
    A: (S, t) => {
      // one crag the size of a keep, one great pavilion, a menhir taller than a knight: few, huge
      S.onGround((c) => { const [x, y] = S.P(215, 96); worn(c, x, y, 70, 18, DIRT.iron, 2, 1.6); });
      S.add(crag(190, 110, 4, { heather: true }), 340, 122);
      S.add(tent(110, 84, 2, { pavilion: true, t }), 215, 92);
      S.add(banner(t, 64), 168, 100); S.add(banner(t + 2, 64), 262, 100);
      S.add(cart(4, { load: "stone" }), 262, 120);
      S.add(boulder(16, 21, { m: M.granite, moss: M.lichen }), 400, 270);
      S.add(menhir(76, 20, 2, 9, { m: M.granite, carve: true, ring: true }), 176, 270);
    },
    B: (S, t) => {
      // a war camp: palisade on the north, tents round a fire, horse lines, banners, a weapon rack, stores
      S.onGround((c) => { const D = DIRT.iron; let [x, y] = S.P(305, 82); worn(c, x, y, 150, 44, D, 3);
        path(c, [S.P(250, 108), S.P(232, 126), S.P(222, 136)], 5, D, 3); path(c, [S.P(360, 40), S.P(372, 26)], 4, D, 4); });
      const P = []; for (let k = 0; k <= 12; k++) { const a = Math.PI * (1.08 + k / 12 * 0.84); P.push([Math.cos(a) * 150, Math.sin(a) * 34]); }
      S.add(palisade(P, 2), 305, 74, { dy: -70 });
      S.add(tent(44, 32, 1, { stripe: true }), 236, 72); S.add(tent(44, 32, 2), 268, 60); S.add(tent(48, 34, 3, { stripe: true }), 352, 62);
      S.add(tent(72, 58, 4, { pavilion: true, t }), 310, 64);
      S.add(tent(40, 30, 5), 390, 76);
      S.add(sprite(40, 20, (px) => { const R = rng(9); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; px.part().ellipse(Math.cos(a) * 9, -3 + Math.sin(a) * 3.5, 2.4, 1.8, M.granite, 1 + Math.sin(a), { round: 0.9 }); } px.part().ellipse(0, -3, 7, 2.5, M.dark, 0.5); }, 4), 300, 98); S.add(flame(t), 300, 97, { shade: 0 }); S.add(flame(t + 1), 297, 97, { shade: 0 }); S.add(sprite(30, 16, (px) => { for (let k = 0; k < 4; k++) px.part().rect(-12 + k * 7, -3, 5, 2, M.timber, 2, { n: F_TOP }); }, 3), 300, 106);
      S.add(banner(t, 48), 262, 100); S.add(banner(t + 1, 48), 336, 102);
      S.add(rack(1), 272, 104); S.add(crates(2), 360, 106); S.add(crates(3), 232, 94);
      S.add(fence([[0, 0], [60, 0]], 5, { h: 7, rails: [0.7], gap: 15 }), 370, 125); for (let k = 0; k < 3; k++) S.add(horse(t, k, [M.hull, M.timberD, M.wool][k]), 380 + k * 20, 130);
      S.add(cart(6, { load: "crates" }), 400, 100);
    },
    C: (S, t) => {
      S.onGround((c) => {
        const [x, y] = S.P(140, 62);
        for (let j = 0; j < 26; j++) for (let i = 0; i < 560; i++) if (hash(i, j + 4) < 0.85 - j * 0.035) px1(c, x + i, y + 6 + j, j < 8 ? "#3c4a34" : "#4a5840");
        for (let j = 0; j < 50; j += 2) for (let i = 0; i < 560; i += 2) { const ff = j / 50; if (i > 140 && hash(i, j) < 0.4 * (1 - ff) * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.013)))) { c.fillStyle = hash(i, j + 9) > 0.5 ? "#8c877a" : "#5c584e"; c.fillRect(x + i, y + 30 + j, 2, 2); } }
      });
      const pts = []; for (let k = 0; k <= 30; k++) pts.push([-160 + k * 10, -Math.sin(k * 0.45) * 4 - k * 0.6 + (hash(k, 3) - 0.5) * 3]);
      S.add(ledge(pts, 42, 9, { m: M.granite, m2: M.graniteD, ivy: M.mossD, bands: 4, taper: 90 }), 280, 76, { dy: -14 });
      S.add(dryWall([[-60, 30], [-40, 20], [-20, 14], [0, 8], [20, 4], [44, 0]], 16, 4, { m: M.granite, m2: M.graniteD, cope: M.lichen }), 260, 110);
      S.add(dryWall([[0, 0], [30, 2], [60, 0], [96, 4]], 16, 5, { m: M.granite, m2: M.graniteD, cope: M.lichen, gaps: 0.1 }), 300, 120);
      S.add(sprite(30, 32, (px) => { const R = rng(3); for (let k = 0; k < 12; k++) { const row = k < 6 ? 0 : k < 10 ? 1 : 2; px.part().ellipse((R() - 0.5) * (12 - row * 4), -2 - row * 4 - R(), 3, 2.2, M.granite, row + R() * 0.2, { round: 0.9 }); } }, 4), 214, 112);
      S.add(boulder(9, 22, { m: M.granite, moss: M.lichen }), 400, 102); S.add(boulder(6, 23, { m: M.granite, moss: M.lichen }), 384, 108);
      S.add(outcrop(170, 20, 5, { m: M.granite, m2: M.graniteD, moss: M.lichen }), 300, 268);
      S.add(menhir(48, 14, -2, 4, { m: M.granite, ring: true }), 156, 266); S.add(menhir(36, 12, 3, 5, { m: M.granite }), 176, 270);
    },
  },
  // ---------------- the Hollowfen (Bellmarsh): the strongest option only ----------------
  hollow: {
    B: (S, t) => {
      // the chapel of the drowned parish and its walled garth: lychgate, rows of stones, a tomb, an open grave, lanterns
      const STONE = { m: M.bstone, m2: M.bstoneD, cope: M.mossD };
      S.onGround((c) => {
        const D = DIRT.hollow;
        // the garth's turf: kept shorter and darker inside the wall, trodden between the rows
        let [x, y] = S.P(234, 32); const [x2, y2] = S.P(414, 152);
        for (let j = y; j < y2; j++) for (let i = x; i < x2; i++) { const n = hash(i, j); if (n < 0.55) px1(c, i, j, n < 0.12 ? "#2e3a28" : n < 0.35 ? "#34402c" : "#3a4630"); }
        for (const row of [96, 116, 136]) { [x, y] = S.P(240, row + 4); for (let i = 0; i < 340; i++) if (hash(i, row) < 0.6) px1(c, x + i, y + Math.round(hash(i, row + 1) * 2), "#4a4a3a"); }
        path(c, [S.P(300, 154), S.P(306, 180), S.P(318, 205), S.P(330, 228)], 6, D, 6);
        path(c, [S.P(300, 150), S.P(306, 118), S.P(318, 92), S.P(330, 82)], 4, D, 7);
        [x, y] = S.P(352, 80); glow(c, x - 50, y - 70, 16, "255,196,110", 0.22);
        for (const lx of [284, 318]) { [x, y] = S.P(lx, 152); glow(c, x, y - 4, 12, "255,196,110", 0.28); }
        [x, y] = S.P(370, 126); worn(c, x, y, 10, 4, ["#4a3e2c", "#3a3024", "#56482e"], 3, 1.8);
      });
      // the garth's wall: back, sides, front with a gap for the gate
      S.add(dryWall([[-92, 0], [92, 0]], 14, 11, { ...STONE, gaps: 0.05 }), 324, 30);
      S.add(dryWall([[0, 0], [-4, 120]], 14, 12, STONE), 232, 30, { dy: 230 });
      S.add(dryWall([[0, 0], [4, 120]], 14, 13, { ...STONE, gaps: 0.08 }), 416, 30, { dy: 230 });
      S.add(dryWall([[-6, 0], [52, 0]], 14, 14, STONE), 236, 152);
      S.add(dryWall([[0, 0], [100, 0]], 14, 15, { ...STONE, gaps: 0.06 }), 318, 152);
      S.add(chapel(3, { lit: true, k: 1.7 }), 360, 82);
      S.add(tomb(1, 1.7), 268, 70);
      S.add(lychgate(2, 1.6), 301, 156);
      S.add(lantern(t), 285, 154); S.add(lantern(t + 1), 318, 154);
      const kinds = ["slab", "cross", "slab", "flat", "slab", "cross"];
      let k = 0;
      for (const row of [96, 116, 136]) for (let lx = 246; lx < 410; lx += 15) {
        if (lx > 290 && lx < 314) continue;                 // the path
        if (row < 104 && lx > 318) continue;                 // the chapel
        if (lx > 360 && lx < 382 && row === 116) continue;   // the open grave
        if (hash(lx, row) < 0.18) continue;
        S.add(headstone(kinds[(k++ + row) % kinds.length], lx * 7 + row, (hash(row, lx) - 0.5) * 4), lx + (hash(lx, row + 1) - 0.5) * 4, row);
      }
      // the open grave: a pit, its spoil heap, a spade stuck in it
      S.add(sprite(40, 24, (px) => { px.part().rect(-8, -4, 16, 5, M.dark, 1); px.part().ellipse(12, -3, 8, 4, M.soil, 2, { round: 0.9 }); for (let i = 0; i < 6; i++) px.tone(8 + i, -5 + (i % 3), -1); px.part().line(14, -6, 17, -18, M.timber, 3); px.part().rect(12, -6, 4, 4, M.iron, 3.1); }, 4), 372, 124);
      S.add(railings(30, 3), 392, 140);
      S.add(boulder(6, 31, { m: M.bstone, moss: M.lichen }), 226, 160);
    },
  },
};

export const paintDecor = (ctx, sc, opt, o = {}) => {
  FRAME = o.frame ?? 0;
  const fn = OPTIONS[sc.id]?.[opt];
  if (!fn) return;
  const S = new Scene(ctx, sc);
  fn(S, FRAME);
  S.render();
};
export const hasOption = (scene, opt) => !!OPTIONS[scene]?.[opt];
