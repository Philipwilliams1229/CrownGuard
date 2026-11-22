// ============ CONCEPT ROUND 2: GREENWOOD ROCKS, WALLS, RUINS, BUILDINGS AND PROPS (2026-11-22) ============
// Not in the game. Lab: overhaul2-decor-gw.html. Notes and THE ROCK RULE: concept/overhaul2-decor-gw.md.
// The kit below (sprite, Scene, ground work, round 1's pieces) is copied from concept/overhaul-decor.js
// (round 1, left untouched); everything after "ROUND 2" is new.
import { Pix, mat, flat, toCanvas } from "../src/render/pix/pix.js";
import { DAY } from "../src/data/sun.js";
import { nearestOnPath } from "../src/engine/path.js";

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
// the lowest opaque row of each column of a baked piece (cached on it)
const bottoms = (spr) => {
  if (spr._bot) return spr._bot;
  const c = spr.cv, w = c.width, h = c.height, d = c.getContext("2d").getImageData(0, 0, w, h).data, b = new Int16Array(w).fill(-1);
  for (let u = 0; u < w; u++) for (let v = h - 1; v >= 0; v--) if (d[(v * w + u) * 4 + 3] > 100) { b[u] = v; break; }
  return (spr._bot = b);
};
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
const dryWallOld = (pts, hgt = 6, seed = 8, o = {}) => {
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
const fenceOld = (pts, seed = 9, o = {}) => {
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


// ROUND 3 walls and fences: a FOOT. The wall stands on a base course of big flat footing stones half sunk in the
// turf, a darker line where stone meets earth, tufts against it on both sides; its shadow and contact line run
// along its own foot (spr.foot), so a wall on a slope never hangs above its shadow.
const dryWall = (pts, hgt = 6, seed = 8, o = {}) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - 9, x1 = Math.max(...xs) + 9, y0 = Math.min(...ys) - hgt - 10, y1 = Math.max(...ys) + 6;
  const W = Math.ceil(x1 - x0) + 4, Hh = Math.ceil(y1 - y0) + 4, R = rng(seed), m = o.m ?? M.stone, m2 = o.m2 ?? M.stoneD;
  const px = new Pix(W, Hh, Math.round(-x0) + 2, Math.round(-y0) + 2);
  const P = [...pts].sort((a, b) => a[0] - b[0]), xa = Math.round(P[0][0]), xb = Math.round(P[P.length - 1][0]);
  const at = (x) => { if (x <= P[0][0]) return P[0][1]; for (let i = 0; i + 1 < P.length; i++) if (x <= P[i + 1][0]) return lerp(P[i][1], P[i + 1][1], (x - P[i][0]) / (P[i + 1][0] - P[i][0] || 1)); return P[P.length - 1][1]; };
  const top = (x) => Math.round(at(x) - hgt + (x - xa < 2 || xb - x < 2 ? 1.5 : 0) + (hash(x >> 1, seed) > 0.8 ? 1 : 0));
  // the body: one face, its courses of flat field stones drawn in (beds, staggered joints, each stone its own value)
  const body = []; for (let x = xa; x <= xb; x++) body.push([x, Math.round(at(x)) - 3]); for (let x = xb; x >= xa; x--) body.push([x, top(x) + 1]);
  px.part().poly(body, m, 1, { n: [0, 0.12, 0.99] });
  // its top: a lit band where the cope stones sit
  for (let x = xa; x <= xb; x++) { px.dot(x, top(x), m, 1.05, { n: [-0.15, -0.8, 0.55] }); }
  for (let row = 0, yo = 3; yo < hgt - 1; row++, yo += 3) {
    let x = xa + (row % 2 ? 2 : 0) + Math.floor(R() * 2);
    for (let xs2 = xa; x <= xb + 4; ) {
      const w = 4 + Math.floor(R() * 4), d = R() < 0.3 ? 1 : R() < 0.35 ? -1 : 0;
      for (let i = xs2; i < Math.min(x, xb + 1); i++) { const yb = Math.round(at(i)) - yo; for (let j = 0; j < 3; j++) if (yb - j > top(i)) { if (d) px.tone(i, yb - j, d); } if (yb - 3 > top(i)) px.tone(i, yb - 2, 1); }
      if (x <= xb) { const yb = Math.round(at(x)) - yo; px.toneLine(x, yb, x, Math.max(top(x) + 1, yb - 2), -1); }
      xs2 = x + 1; x += w;
    }
    for (let i = xa; i <= xb; i++) { const yb = Math.round(at(i)) - yo - 3; if (yb > top(i)) px.tone(i, yb + 0, -1); }
  }
  // the base course: bigger, darker footing stones standing a pixel proud of the face, set into the ground
  for (let x = xa - 1, k = 0; x < xb + 1; k++) {
    const w = 5 + Math.floor(R() * 4), xe = Math.min(xb + 1.5, x + w);
    px.part().poly([[x, at(x) + 0.5], [xe, at(xe) + 0.5], [xe, at(xe) - 3.5 - R()], [x, at(x) - 3.5 - R()]], R() > 0.5 ? m2 : m, 1.2, { n: [0, 0.2, 0.98], round: 0.4 });
    x = xe + 0.3;
  }
  // the cope: upright stones on edge along the top, leaning a little each way, some mossy
  for (let x = xa + 1; x <= xb - 1; x += 2) { const t = top(x), lean = (Math.floor(x / 2) % 3) - 1; px.part().poly([[x - 0.8, t + 1.5], [x + 1.2, t + 1.5], [x + 1.2 + lean * 0.5, t - 2.5], [x - 0.8 + lean * 0.5, t - 2.5]], hash(x, seed + 1) > 0.6 ? m2 : m, 1.3, { n: [-0.2, -0.2, 0.96] }); if (hash(x, seed + 2) > 0.7) px.dot(x, t - 2, o.cope ?? M.moss, 1.35); }
  // where stone meets earth: a dark line along the foot, then turf in front, at the ends and in the joints
  for (let x = xa - 1; x <= xb + 1; x++) { px.tone(x, Math.round(at(x)), -1); px.tone(x, Math.round(at(x)) - 1, -1); }
  for (let x = xa - 1; x <= xb + 1; x += 3) { const y = at(x); tufts(px, x - 1.5, x + 1.5, y, R, 0.5, 5, { every: 3, front: 0.8, h0: 1, h: 2.5 }); if (R() > 0.6) px.part().ellipse(x, y + 0.4, 1.6 + R(), 0.8, V.turfD, 5, { round: 0.6 }); }
  for (const [ex, sgn] of [[xa - 2, -1], [xb + 2, 1]]) tufts(px, ex - 2, ex + 2, at(ex), R, 0.5, 5, { every: 1.5, front: 0.5, h0: 2, h: 3 });
  for (let k = 0; k < (xb - xa) / 10; k++) { const x = xa + R() * (xb - xa); px.part(); px.line(x, top(x) + 4, x - 1, top(x) + 1, V.turfL, 1.4); }
  const img = px.resolve({ line: "tint" }), cv = toCanvas(img); grade(cv);
  return { cv, ox: img.ox, oy: img.oy, foot: footOf(P, img) };
};
// post-and-rail fence: posts driven into the turf (a collar of grass at each), rails pegged on, shadow from its foot
const fence = (pts, seed = 9, o = {}) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), H0 = o.h ?? 9;
  const x0 = Math.min(...xs) - 7, x1 = Math.max(...xs) + 7, y0 = Math.min(...ys) - H0 - 5, y1 = Math.max(...ys) + 5;
  const ox = Math.round(-x0) + 2, oy = Math.round(-y0) + 2, px = new Pix(Math.ceil(x1 - x0) + 4, Math.ceil(y1 - y0) + 4, ox, oy), R = rng(seed);
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / (o.gap ?? 9)));
    const gate = o.gate && s === o.gate[0];
    for (let k = s ? 1 : 0; k <= n && !o.noPosts; k++) {
      const x = lerp(ax, bx, k / n), y = lerp(ay, by, k / n), lean = (R() - 0.5) * 1;
      px.part().capsule(x, y + 0.5, 1.25, x + lean, y - H0, 1, M.timberD, y * 0.01 + 1);
      px.toneLine(x + lean - 1, y - H0, x + lean, y - H0, 1);
      px.part().ellipse(x, y + 0.2, 1.8, 0.9, V.turfD, y * 0.01 + 2.5, { round: 0.6 }); tufts(px, x - 2.5, x + 2.5, y, R, y * 0.01 + 0.5, y * 0.01 + 2.6, { every: 3, h0: 1, h: 2 });
    }
    if (gate) { const t0 = o.gate[1], t1 = o.gate[2]; for (const hh of [0.3, 0.6, 0.85]) px.part().line(lerp(ax, bx, t0), lerp(ay, by, t0) - H0 * hh, lerp(ax, bx, t1), lerp(ay, by, t1) - H0 * hh, M.timber, Math.max(ay, by) * 0.01 + 1.6);
      px.part().line(lerp(ax, bx, t0), lerp(ay, by, t0) - H0 * 0.3, lerp(ax, bx, t1), lerp(ay, by, t1) - H0 * 0.85, M.timber, Math.max(ay, by) * 0.01 + 1.65); }
    for (const hh of o.rails ?? [0.45, 0.8]) {
      if (gate) { const t0 = o.gate[1], t1 = o.gate[2]; px.part().line(ax, ay - H0 * hh, lerp(ax, bx, t0), lerp(ay, by, t0) - H0 * hh, M.timber, Math.max(ay, by) * 0.01 + 1.5); px.part().line(lerp(ax, bx, t1), lerp(ay, by, t1) - H0 * hh, bx, by - H0 * hh, M.timber, Math.max(ay, by) * 0.01 + 1.5); continue; }
      px.part().line(ax, ay - H0 * hh, bx, by - H0 * hh + (R() - 0.5), M.timber, Math.max(ay, by) * 0.01 + 1.5);
    }
  }
  const img = px.resolve({ line: "tint" }), cv = toCanvas(img); grade(cv);
  const span = Math.max(...xs) - Math.min(...xs);
  return { cv, ox: img.ox, oy: img.oy, foot: span >= 2 ? footOf([...pts].sort((a, b) => a[0] - b[0]), img) : undefined };
};
// one fence post on its own (the posts of a run going up the page each stand at their own foot)
const post = (H0 = 9, seed = 1) => sprite(12, H0 + 10, (px) => { const R = rng(seed); px.part().capsule(0, 0.5, 1.25, (R() - 0.5), -H0, 1, M.timberD, 1); px.toneLine(-1, -H0, 0, -H0, 1); px.part().ellipse(0, 0.2, 1.8, 0.9, V.turfD, 2.5, { round: 0.6 }); tufts(px, -2.5, 2.5, 0, R, 0.5, 2.6, { every: 3, h0: 1, h: 2 }); }, 3);

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
  // round 3: it sits on the ground: a flared, darker skirt, straw spilled round the foot, turf against it
  px.part().ellipse(0, -1.2, r * 1.12, 1.8, V.hayD, 2.3, { round: 0.5, n: [0, 0.3, 0.95] });
  for (let x = -r; x <= r; x += 1.5) px.toneLine(x, -2.5, x + (R() - 0.5), -0.2, -1);
  for (let k = 0; k < r * 1.2; k++) { const x = (R() - 0.5) * r * 2.8, y = 0.2 + R() * 1.4; px.part().line(x, y, x + (R() - 0.5) * 3, y - 0.4, V.hay, 2.4, { noLine: true }); }
  tufts(px, -r * 1.3, r * 1.3, 0, R, 1, 2.6, { every: 3, front: 0.4 });
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
const bench = () => sprite(24, 16, (px) => { px.part().rect(-8, -5, 16, 2, M.timber, 2, { n: F_TOP }); px.part().rect(-7, -3, 2, 3.5, M.timberD, 1.9); px.part().rect(5, -3, 2, 3.5, M.timberD, 1.9); tufts(px, -10, 10, 0, rng(27), 1.5, 2.5, { every: 3, front: 0.6 }); }, 3);
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
  // round 3: each pole wedged in a little pile of beach stones
  const R = rng(w); for (const x of [L, Rr]) for (const [dx, dy, r] of [[-2, -0.5, 1.8], [2, -0.5, 1.7], [0, -1.6, 1.4]]) px.part().ellipse(x + dx, dy, r, r * 0.7, R() > 0.5 ? M.stone : M.stoneD, 2.7, { round: 0.9 });
}, 3);
const creels = (seed = 19) => sprite(26, 18, (px) => { const R = rng(seed); for (let k = 0; k < 3; k++) { const x = -7 + k * 6 + R(); px.part().ellipse(x, -3.5, 3.5, 3.5, M.thatchD, 2 + k * 0.1, { round: 0.9 }); for (let y = -6; y < 0; y += 2) px.toneLine(x - 3, y, x + 3, y, -1); } }, 3);
const woodpile = (seed = 20) => sprite(34, 22, (px) => { const R = rng(seed); px.part().rect(-13, -1.5, 26, 1.5, M.timberD, 1.5); tufts(px, -14, 14, 0, R, 1, 6, { every: 3, front: 0.5 }); for (let row = 0; row < 3; row++) for (let k = 0; k < 6 - row; k++) { const x = -10 + k * 4 + row * 2, y = -2 - row * 3.5; px.part().ellipse(x, y, 2, 1.8, M.timber, 2 + row, { round: 0.9 }); px.dot(x, y, M.wool, 2.1 + row); } }, 3);
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
    // round 3: pegs at the guys' ends, the canvas's hem in the grass, turf against it
    for (const x of [L - 5, Rr + w * 0.3 + 5]) { px.part().line(x, 2.5, x, 0.5, V.peg, 3.1); }
    for (let x = L; x < Rr + w * 0.3; x += 1) px.tone(x, -0.5, -1);
    tufts(px, L - 2, Rr + w * 0.3 + 2, 0, R, 0.5, 3.3, { every: 3, front: 0.6 });
  }
}, 6);

// ======================================================================================================
// ROUND 2 (everything below is new): the Greenwood combination. B's places, built in TODAY's house style
// (gable end to the south, limewash and timber framing, red tile or combed thatch running back up the
// page: src/render/pix/vale-pix.js's cottage and mill), A's big rocks and tower re-sculpted to THE ROCK
// RULE (concept/overhaul2-decor-gw.md), C's ledges and drystone walls kept local, and light at dusk.
// ======================================================================================================
import { noteLamp, drawLampPools, drawLampBloom, swapLamps, clearLamps } from "../src/render/nightlight.js";

// ---- materials in today's vale palette -----------------------------------------------------------------
const V = {
  wood: mat("#6a4a2e"), woodL: mat("#8a6440"), woodD: mat("#46301e"), iron: mat("#4a4e5a"),
  rubble: mat("#968c7a", { contrast: 0.95 }), chim: mat("#b0a694", { contrast: 0.85 }), mason: mat("#8e8672", { contrast: 0.95 }),
  lime: mat("#ece4d0", { contrast: 0.7 }), limeD: mat("#c4b8a0", { contrast: 0.75 }), ochreW: mat("#e4c88e", { contrast: 0.7 }),
  tile: mat("#b45a64", { contrast: 1.1 }), tileE: mat("#8a4252", { contrast: 1.1 }), tileD: mat("#6a2e3e"),
  thatch: mat("#c4a058", { contrast: 1.2 }), thatchE: mat("#a8843e", { contrast: 1.2 }), thatchD: mat("#6e4e26"), thatchM: mat("#8a9a50", { contrast: 0.7 }),
  slate: mat("#6a7078", { contrast: 0.9 }), slateE: mat("#565c66", { contrast: 0.9 }),
  glass: mat("#3a4a6a", { contrast: 0.8 }), glint: flat("#a8bcd4"), gold: flat("#d8b34a"), door: mat("#3e6a66"), doorR: mat("#7a3a34"),
  lamp: flat("#ffd27a", { emis: true }), lampD: flat("#e09a48", { emis: true }), fire: flat("#ff9a3a", { emis: true }), fireL: flat("#fff0a0", { emis: true }),
  moss: mat("#5d8f3a", { contrast: 0.8 }), mossL: mat("#7aa84a", { contrast: 0.6 }), turf: mat("#6a9a3a"), turfD: mat("#56802e"), turfL: mat("#86b448"),
  lichG: mat("#b8c494", { contrast: 0.5 }), lichY: mat("#d4bc52", { contrast: 0.5 }), lichR: mat("#c47e46", { contrast: 0.5 }),
  ivy: mat("#46743a"), ivyL: mat("#5e8e44"), flowerR: flat("#d0483c"), flowerY: flat("#f0d050"), flowerW: flat("#f4f0e4"),
  sky: flat("#bcd6e6"), skyL: flat("#dceaf0"), hole: flat("#2a2226"), soil: mat("#6e5236", { contrast: 0.9 }),
  // the two rock families
  lime1: mat("#aca692", { contrast: 1.05 }), lime2: mat("#8c8572", { contrast: 1.1 }),
  gran1: mat("#8a8890", { contrast: 1.0 }), gran2: mat("#74727c", { contrast: 1.0 }),
  sign: mat("#2c4a7a"), cloth1: mat("#ece6d8"), cloth2: mat("#4a6a9a"), cloth3: mat("#b0483c"), cat: mat("#3a3436"), catG: mat("#c88a4a"),
  deer: mat("#9a6a40"), deerL: mat("#d8c0a0"), wool: mat("#ece4d0"),
  // round 3
  horn: mat("#e8d49a", { contrast: 0.5 }), pane: flat("#f6dc8c"), ironK: mat("#2e2c34", { contrast: 0.8 }), hen: mat("#ece4d0"), henB: mat("#a8643a"), henR: mat("#c88a48"), comb: flat("#d0382a"), beak: flat("#e0b040"), leg: mat("#c8a040"),
  fawn: mat("#a89478"), fawnL: mat("#ece2cc"), yew: mat("#2f4a30", { contrast: 0.9 }), yewL: mat("#3e6038", { contrast: 0.9 }), yewT: mat("#7a4a34"),
  bell: mat("#9a8440"), hay: mat("#d8b858", { contrast: 1.1 }), hayD: mat("#b89440"), peg: mat("#5c3c24"),
};
const SOUTH = [0, 0.12, 0.99];

// a sprite that also carries its lights: windows (rects) and lamps (points), art px from the anchor
const spriteL = (w, h, build, oy = 4) => {
  w = Math.ceil(w); h = Math.ceil(h);
  const px = new Pix(w, h, w >> 1, h - oy), lights = [], lamps = [], post = [];
  // paint: pixels laid on AFTER the sculpt resolves (a lantern's 2-px panes are too small to survive the inked edges)
  build(px, { win: (x, y, ww, hh) => lights.push([x, y, ww, hh]), lamp: (x, y, r = 22, col = "#ffb24a") => lamps.push([x, y, r, col]), paint: (x, y, col) => post.push([x, y, col]) });
  const img = px.resolve({ line: "tint" }), cv = toCanvas(img);
  if (post.length) { const c = cv.getContext("2d"); for (const [x, y, col] of post) { c.fillStyle = col; c.fillRect(Math.floor(x + img.ox), Math.floor(y + img.oy), 1, 1); } }
  grade(cv);
  return { cv, ox: img.ox, oy: img.oy, lights, lamps };
};

// ---- ROUND 3: everything stands IN the turf ------------------------------------------------------------
// The owner: "This stone fence thing is floating off the ground". Every piece now has a FOOT: grass tufts
// growing against it on both sides (behind at zb, breaking over it in front at zf), and the Scene paints a
// dark earth line under every column whose lowest pixel sits on the ground (Scene2 `contact`), and casts a
// wall's or fence's shadow from its own foot line column by column (spr.foot), not from one anchor row.
const tufts = (px, xl, xr, y, R, zb, zf, o = {}) => {
  const n = Math.max(2, Math.round((xr - xl) / (o.every ?? 4)));
  for (let k = 0; k < n; k++) {
    const x = lerp(xl, xr, (k + R()) / n), front = R() < (o.front ?? 0.55), yy = y + (front ? 0.6 + R() * 0.8 : -0.5 - R() * 1.2);
    const h = (o.h0 ?? 2) + R() * (o.h ?? 2.5), m = R() > 0.5 ? V.turf : V.turfD;
    px.part(); px.line(x, yy, x - 1 - R(), yy - h, m, front ? zf : zb); px.line(x + 1, yy, x + 1.5 + R() * 1.5, yy - h * 0.8, m, front ? zf : zb);
  }
};
// a low turf collar over a foot (the rocks' skirt, for posts and stones)
const collar = (px, xl, xr, y, R, z, k = 1) => {
  for (let x = xl; x <= xr; x += 3) px.part().ellipse(x + R(), y + 0.3, 1.8 + R() * 1.5 * k, 1 + R() * 0.6, R() > 0.5 ? V.turf : V.turfD, z, { round: 0.6 });
};
// the foot line of a polyline sprite: canvas row of the ground for each column (for the shadow and contact)
const footOf = (pts, img) => {
  const at = (x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 0; i + 1 < pts.length; i++) if (x <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0] || 1)); return pts[pts.length - 1][1]; };
  return (u) => img.oy + at(u - img.ox);
};

// the lantern (round 3: a body you can see at noon): iron cap and ring, a horn-glazed body in a frame, a flame
const lantern = (b, Lt, lx, y, z, r = 20) => {
  lx = Math.round(lx); y = Math.round(y);
  b.part(); b.poly([[lx - 2.5, y + 2], [lx + 2.5, y + 2], [lx + 1, y], [lx - 1, y]], V.iron, z + 0.1, { n: [0, -0.6, 0.8] });
  b.part(); b.rect(lx - 2, y + 2, 4, 6, V.ironK, z + 0.1, { n: [0, 0, 1] });
  b.part(); b.rect(lx - 2.5, y + 8, 5, 1, V.iron, z + 0.12, { n: [0, -0.5, 0.86] });
  // the glass, laid on after: warm horn panes with the flame in them, readable by day
  for (let yy = y + 3; yy < y + 7; yy++) for (const xx of [lx - 1, lx]) Lt.paint(xx, yy, yy === y + 4 ? "#fff4b0" : yy === y + 5 ? (xx === lx - 1 ? "#ffcc5a" : "#f0b048") : "#e8c87a");
  Lt.lamp(lx - 0.5, y + 5, r);
};

// a hen you can read at board size: plump body, cocked tail, head with comb and beak, two legs
const hen3 = (t = 0, seed = 22, col = V.hen) => sprite(18, 16, (px) => {
  const peck = Math.sin(t * 2.2 + seed * 1.7) > 0.35, f = seed % 2 ? 1 : -1;
  px.part(); px.line(-0.5 * f, -2.5, -1 * f, 0, V.leg, 1); px.line(1.5 * f, -2.5, 1.5 * f, 0, V.leg, 1);
  px.part(); px.ellipse(0.5 * f, -4.5, 3.8, 2.7, col, 2, { round: 0.9 });
  px.poly([[2.5 * f, -5.5], [5.5 * f, -9.5], [6.5 * f, -7], [5 * f, -4], [3 * f, -3]], col, 2.05, { round: 0.6 });
  px.toneLine(-1 * f, -4, 2.5 * f, -3.5, -1); px.toneLine(5 * f, -8, 5.5 * f, -6, -1);
  const hx = (peck ? -4 : -3) * f, hy = peck ? -2.5 : -7.5;
  px.part(); px.ellipse(hx, hy, 1.7, 1.6, col, 2.3, { round: 0.9 });
  if (!peck) px.capsule(-2 * f, -6, 1.3, hx, hy, 1.3, col, 2.2, { round: 0.9 });
  px.dot(hx, hy - 2, V.comb, 2.5); px.dot(hx + 1 * f, hy - 2, V.comb, 2.5); px.dot(hx - 1 * f, hy + 1, V.comb, 2.5);
  px.dot(hx - 2 * f, hy, V.beak, 2.5); px.dot(hx - 0.5 * f, hy - 0.5, V.hole, 2.6, { noLine: true });
}, 3);
// the roe deer, after the trees artist's (concept/overhaul2-trees.js LIFE.deer): grey-fawn, pale rump, a clear
// head, neck and legs; grazing or looking up; drawn at 0.8 of theirs so it stands a little under a soldier
const doe = (t = 0, seed = 1) => sprite(42, 34, (P) => {
  const K = 0.8, q = (pts) => pts.map(([x, y]) => [x * K, y * K]), f = seed % 2 ? 1 : -1;
  const ph = Math.floor(t + seed) % 2, down = (Math.floor(t * 0.5 + seed) % 3) !== 1;
  const fur = V.fawn, pale = V.fawnL, dkm = V.hole;
  P.part(); P.limb(q([[-8 * f, -11], [-9 * f, -5], [-8 * f, 0]]), [0.9, 0.7, 0.6], fur, 30); P.limb(q([[7 * f, -11], [8 * f, -5], [9 * f, 0]]), [0.9, 0.7, 0.6], fur, 30);
  P.part(); P.ellipse(0, -14 * K, 10.5 * K, 4.8 * K, fur, 40); P.ellipse(0, -11.5 * K, 7 * K, 2 * K, pale, 41, { wrap: true });
  P.ellipse(-10 * f * K, -15 * K, 2.2 * K, 2.6 * K, pale, 42);
  P.part(); P.limb(q([[-6 * f, -11], [-6 * f, -5], [-5 * f, 0]]), [1, 0.7, 0.6], fur, 50); P.limb(q([[6 * f, -11], [6.5 * f, -5], [7 * f, 0]]), [1, 0.7, 0.6], fur, 50);
  const hx = (down ? 17 : 12) * f, hy = down ? -3 - ph : -26;
  P.part(); P.limb(q(down ? [[8 * f, -16], [13 * f, -12], [hx - 1 * f, hy - 1]] : [[8 * f, -16], [hx * 0.95, (hy - 16) / 2 - 2], [hx, hy + 2]]), [2.1, 1.6, 1.3], fur, 55);
  P.part(); P.ellipse((hx + (down ? 0.5 : 2) * f) * K, hy * K, (down ? 2.2 : 3.4) * K, (down ? 3.2 : 2.4) * K, fur, 60, { rot: (down ? 0.3 : 0.25) * f });
  P.dot((hx + (down ? 1 : 4.5) * f) * K, (hy + (down ? 2.5 : 0.5)) * K, dkm, 62); P.dot((hx + (down ? -0.5 : 1.5) * f) * K, (hy - (down ? 0 : 1)) * K, dkm, 62);
  const ea = ph && !down ? -1.2 : 0;
  P.part(); P.ellipse((hx - 0.5 * f) * K, (hy - 3.5 + ea * 0.5) * K, 0.9, 1.8, fur, 58, { rot: (0.5 + ea) * f });
}, 3);

// ======================================================================================================
// ROCKS, by THE ROCK RULE: stacked loaves, a lit top plane, a south face, a shaded east shoulder
// ======================================================================================================
// one block (a loaf): its south foot on y0 from xl to xr, a south face h tall, a top plane d deep
const block = (px, xl, xr, y0, h, d, fam, mt, z, R, o = {}) => {
  const w = xr - xl, gran = fam === "granite", b = Math.max(1, Math.min(gran ? 5 : 3, w * (gran ? 0.22 : 0.12), h * 0.45));
  const yt = y0 - h, back = yt - d, ins = gran ? w * 0.1 : w * 0.04;
  // the top plane: a rounded quad receding up the screen, narrower at the back (it is seen from the south)
  const top = [[xl + b * 0.6, yt + 0.5], [xr - b * 0.6, yt + 0.5], [xr - ins - b * 0.3, back + b * 0.6], [xr - ins - b * 1.2, back], [xl + ins + b * 1.2, back], [xl + ins + b * 0.3, back + b * 0.6]];
  px.part().poly(top, o.topM ?? mt, z, { round: gran ? 0.45 : 0.25, ny: -0.7 });
  // the south face: an octagon with bevelled corners, bulged so its west half takes the light and its east falls away
  const sf = [[xl, yt + b], [xl + b, yt], [xr - b, yt], [xr, yt + b], [xr, y0 - b * 0.7], [xr - b, y0], [xl + b, y0], [xl, y0 - b * 0.7]];
  px.part().poly(sf, mt, z + 0.02, { round: gran ? 0.78 : 0.6, ny: gran ? 0.14 : 0.24 });
  // the lit shoulder along the front edge of the top, and a dark line along the foot
  px.toneLine(xl + b, yt, xr - b - 1, yt, 1);
  px.toneLine(xl + b * 0.5, yt - 1, xl + w * 0.45, yt - 1, 1);
  // bedding: limestone has straight beds every 3-6 px with a lit lip above each; granite a curved joint or two
  if (!gran) {
    for (let y = yt + 3 + Math.floor(R() * 2); y < y0 - 2; y += 3 + Math.floor(R() * 3)) {
      const xa = xl + 1 + R() * 2, xb = xr - 1 - R() * 2;
      px.toneLine(xa, y, xb, y + (R() - 0.5), -1); px.toneLine(xa + 1, y - 1, xa + (xb - xa) * (0.3 + R() * 0.4), y - 1, 1);
      if (R() > 0.75) { const vx = xl + w * (0.2 + R() * 0.6); px.toneLine(vx, y + 1, vx + (R() - 0.5), Math.min(y0 - 1, y + 3 + R() * 3), -1); }
    }
    // grikes across the top plane (the clints between them)
    for (let k = 0; k < w / 14; k++) { const x = xl + w * (0.2 + R() * 0.6); px.toneLine(x, yt - 1, x + 2 + R() * 3, back + 1, -1); }
  } else {
    const jy = yt + h * (0.35 + R() * 0.3);
    for (let x = xl + 2; x < xr - 2; x++) px.tone(x, jy + Math.sin((x - xl) / w * Math.PI) * 1.5, -1);
    for (let k = 0; k < Math.max(1, w / 22); k++) { const vx = xl + w * (0.25 + R() * 0.5); px.toneLine(vx, yt + 1, vx + (R() - 0.5) * 2, jy, -1); }
    // granite's speckle
    for (let k = 0; k < w * h / 7; k++) px.tone(xl + R() * w, yt + R() * h, R() > 0.5 ? 1 : -1);
  }
  // weathering pits and a crack or two running down from the beds
  for (let k = 0; k < w * (h + d) / 30; k++) px.tone(xl + R() * w, back + R() * (h + d), R() > 0.6 ? 1 : -1);
  if (o.moss !== false && w > 11) {
    // moss on the top plane (thickest at the back, the damp north), lichen on the lit top and upper south face
    for (let k = 0; k < Math.max(1, w / 12); k++) px.ellipse(xl + w * (0.2 + R() * 0.6), back + d * (0.2 + R() * 0.4), 1.5 + R() * w * 0.12, 1 + R() * 1.5, R() > 0.4 ? V.moss : V.mossL, z + 0.1, { wrap: true, round: 0.5 });
    const L = [V.lichG, V.lichY, V.lichG, V.lichR, V.lichG];
    for (let k = 0; k < Math.max(1, w / 16); k++) { const lx = xl + w * (0.08 + R() * 0.6), ly = R() > 0.5 ? back + d * R() : yt + 1 + R() * h * 0.35; px.ellipse(lx, ly, 1 + R() * 1.6, 0.6 + R() * 0.8, L[k % 5], z + 0.12, { wrap: true }); }
    // grass in the joints
    for (let k = 0; k < Math.max(1, w / 16); k++) { const gx = xl + w * (0.15 + R() * 0.7), gy = yt + 2 + R() * h * 0.6; px.part().line(gx, gy, gx + (R() - 0.5) * 2, gy - 2 - R() * 2, V.turf, z + 0.15); }
  }
  return { yt, back };
};
// a whole rock or rock group of size s (its width in art px) from a family; returns a sprite
const ROCKS = new Map();
const rockMass = (s, fam = "limestone", seed = 1, o = {}) => {
  const key = `${s}|${fam}|${seed}|${JSON.stringify(o)}|${DAY.id}`;
  if (ROCKS.has(key)) return ROCKS.get(key);
  const R = rng(seed), gran = fam === "granite", m1 = gran ? V.gran1 : V.lime1, m2 = gran ? V.gran2 : V.lime2;
  const tall = o.tall ?? (gran ? 0.62 : 0.5), flatK = o.flat ?? 1;
  const spr = sprite(s * 1.3 + 30, s * 1.05 + 40, (px) => {
    // the plan (THE ROCK RULE): one main loaf, wider than tall; bigger rocks add a lower side block in front, a
    // taller mass BEHIND (its foot up the slope, so it rises over the main top), and on a landmark a cap and a
    // low front slab. Horizontal, never a pyramid: the highest point sits behind the middle.
    const H = (gran ? 0.34 : 0.26) * flatK * (o.tall ?? 1), Dp = gran ? 0.22 : 0.25, blocks = [];   // [xl, xr, y0, h, d, z]
    const J = () => 0.85 + R() * 0.3;
    if (s < 20) blocks.push([-s / 2, s / 2, 0, Math.max(2, s * H * 1.1 * J()), Math.max(2, s * Dp), 3]);
    else {
      const mx = -s * 0.08 + (R() - 0.5) * s * 0.08, mw = s * 0.72;
      const h = s * H * J(), d = s * Dp * J();
      blocks.push([mx - mw / 2, mx + mw / 2, 0, h, d, 3]);
      blocks.push([mx + mw * 0.3, mx + mw * 0.3 + s * 0.42, 2, h * 0.6 * J(), d * 0.7, 3.5]);
      if (s >= 34) { const bw = s * 0.5, bx = mx - mw * 0.12 + (R() - 0.5) * s * 0.1; blocks.push([bx - bw / 2, bx + bw / 2, -d * 0.75, h * 1.25 * J(), d * 0.8, 2]); }
      if (s >= 60) {
        blocks.push([mx - mw / 2 - s * 0.12, mx - mw / 2 + s * 0.2, 3, h * 0.45, d * 0.6, 3.6]);
        blocks.push([mx + mw * 0.02, mx + mw * 0.02 + s * 0.3, -h - d * 0.45, h * 0.5 * J(), d * 0.55, 3.2]);
      }
    }
    blocks.sort((a, b) => a[5] - b[5]);
    blocks.forEach(([xl, xr, y0, h, d, z], i) => block(px, xl, xr, y0, h, d, fam, gran ? (i % 3 === 1 ? m2 : m1) : m2, z + i * 0.01, R, gran ? o : { ...o, topM: m1 }));
    // the foot: a skirt of taller turf breaking over the lower edge, pebbles, so it sits IN the ground
    if (o.skirt !== false) {
      for (let k = 0; k < s / 3.5; k++) { const x = (R() - 0.5) * s * 1.05; px.part().ellipse(x, -0.5 + R(), 2 + R() * 2.5, 1.2 + R() * 0.8, R() > 0.5 ? V.turf : V.turfD, 9, { round: 0.6 }); }
      for (let k = 0; k < s / 5; k++) { const x = (R() - 0.5) * s * 1.05; px.part().line(x, 0, x + (R() - 0.5) * 2, -2 - R() * 3, R() > 0.5 ? V.turfL : V.turf, 9.5); }
    }
    for (let k = 0; k < (o.pebbles ?? Math.min(4, 1 + s / 20)); k++) { const x = (R() > 0.5 ? 1 : -1) * (s * 0.45 + 2 + R() * 8), ps = 1 + R() * 1.4; px.part().ellipse(x, -ps * 0.5, ps, ps * 0.7, R() > 0.5 ? m1 : m2, 8, { round: 0.9 }); }
  }, 6);
  spr.contact = s * 0.5;
  ROCKS.set(key, spr);
  return spr;
};

// ======================================================================================================
// BUILDINGS in today's style, a level-1 hall's size
// ======================================================================================================
const beam2 = (b, x, y, w, h, z, mt) => { b.part(); b.rect(x, y, w, h, mt, z, { n: [0, 0, 1] }); if (w >= 3 && h > 2) { b.toneLine(x, y, x, y + h - 1, 1); b.toneLine(x + w - 1, y, x + w - 1, y + h - 1, -1); } };
const spar2 = (b, ax, ay, bx, by, r, z, mt) => { b.part(); b.capsule(ax, ay, r, bx, by, r, mt, z, { round: 0.8, limb: false }); };
const courses2 = (b, x0, y0, w, h, ch, seed) => {
  let y = y0, row = 0;
  while (y < y0 + h - 1) {
    const c = Math.max(3, Math.min(ch + (hash(seed, row) < 0.4 ? 1 : 0), y0 + h - y));
    if (y > y0) b.toneLine(x0, y, x0 + w - 1, y, -1);
    for (let vx = x0 + (row % 2 ? 3 : 7) + Math.floor(hash(seed + 1, row) * 3), last = x0; vx < x0 + w - 2; vx += 6 + Math.floor(hash(seed + 5, vx + row) * 6)) {
      b.toneLine(vx, y, vx, y + c - 1, -1);
      const r = hash(seed + vx, row);
      if (r < 0.26) b.toneLine(last + 1, y + 1, vx - 1, y + 1, 1); else if (r > 0.86) b.toneLine(last + 1, y + c - 1, vx - 1, y + c - 1, -1);
      last = vx;
    }
    y += c; row++;
  }
};
const win2 = (b, Lt, x, y, w, h, z, o = {}) => {
  b.part(); b.rect(x - 1, y - 1, w + 2, h + 2, V.woodD, z, { n: [0, 0, 1] });
  b.part(); b.rect(x, y, w, h, V.glass, z + 0.1, { n: [0, 0, 1], noLine: true, cast: 0 });
  if (o.lit !== false) for (let yy = y + Math.floor(h / 2); yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) b.dot(xx, yy, yy === y + Math.floor(h / 2) ? V.lampD : V.lamp, z + 0.15, { noLine: true, cast: 0 });
  b.toneLine(x, y, x + Math.floor(w / 2) - 1, y, 1);
  b.part(); b.rect(x + Math.floor(w / 2), y, 1, h, V.woodD, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.part(); b.rect(x, y + Math.floor(h / 2) - 1, w, 1, V.woodD, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.dot(x, y, V.glint, z + 0.3, { noLine: true, cast: 0 });
  if (o.shutter) { b.part(); b.rect(x - 3, y - 1, 2, h + 2, o.shutter, z + 0.1, { n: [0, 0, 1] }); b.part(); b.rect(x + w + 1, y - 1, 2, h + 2, o.shutter, z + 0.1, { n: [0, 0, 1] }); }
  if (o.box) { b.part(); b.rect(x - 1, y + h + 1, w + 2, 2, V.wood, z + 0.3, { n: [0, -0.3, 0.95] }); for (let xx = x - 1; xx < x + w + 1; xx++) b.dot(xx, y + h, hash(xx, y) > 0.5 ? V.flowerR : hash(xx, y + 1) > 0.5 ? V.flowerY : V.ivyL, z + 0.35, { noLine: true }); }
  if (o.lit !== false) Lt.win(x, y + Math.floor(h / 2), w, Math.ceil(h / 2));
};
const door2 = (b, x, y, w, h, z, mt) => {
  b.part(); b.rect(x - 1, y - 1, w + 2, h + 1, V.woodD, z, { n: [0, 0, 1] });
  b.part(); b.rect(x, y, w, h, mt, z + 0.1, { n: [0, 0, 1], noLine: true, cast: 0 });
  for (let k = 1; k < 3; k++) b.toneLine(x + Math.round((w * k) / 3), y, x + Math.round((w * k) / 3), y + h - 1, -1);
  b.toneLine(x, y, x, y + h - 1, 1);
  b.part(); b.rect(x, y + Math.round(h * 0.28), w, 1, V.iron, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.part(); b.rect(x, y + Math.round(h * 0.7), w, 1, V.iron, z + 0.2, { n: [0, 0, 1], noLine: true, cast: 0 });
  b.dot(x + w - 2, y + Math.round(h * 0.5), V.gold, z + 0.3, { noLine: true, cast: 0 });
};
// a wall lantern on an iron bracket at (x, y): the flame is a lamp
const wallLamp = (b, Lt, x, y, z, flip = 1, r = 20) => {
  // an iron arm out of the wall with a brace under it, the lantern hung from its tip
  b.part(); b.line(x, y, x + 4 * flip, y, V.iron, z); b.line(x, y + 2, x + 2 * flip, y, V.iron, z);
  lantern(b, Lt, x + 4 * flip, y + 0.5, z, r);
};
// the roof of a gable house seen from the gable end: two slopes running back up the page (vale-pix's gable)
const gable2 = (b, hw, eaveY, apexY, D, mtL, mtR, over = 3) => {
  const lE = [-hw - over, eaveY + 2], ap_ = [0, apexY - 2], rE = [hw + over, eaveY + 2];
  b.part(); b.poly([lE, ap_, [0, apexY - 2 - D], [lE[0], lE[1] - D]], mtL, 1, { n: [-0.5, -0.4, 0.76] });
  b.part(); b.poly([ap_, rE, [rE[0], rE[1] - D], [0, apexY - 2 - D]], mtR, 1, { n: [0.62, -0.32, 0.72] });
  return { lE, apex: ap_, rE };
};
// THE HOUSE: the vale cottage's language at a hall's size.
//   o.hw half width, o.wall (to the eave), o.apex (eave to ridge), o.D (roof depth), o.roof "tile" | "thatch" | "slate",
//   o.frame timber framing, o.jetty (an upper storey at wall1 that overhangs 2 px), o.walls "lime" | "rubble" | "boards",
//   o.door [x, w, h, mat], o.windows [[x, y, w, h, {shutter, box, lit}]], o.chim (x of the stack, or false), o.sign, o.lamps
const house = (o) => {
  const hw = o.hw, eave = -o.wall, apex = eave - o.apex, D = o.D, sd = o.seed ?? 3, jt = o.jetty ? 2 : 0;
  const W = hw * 2 + 70, H = o.wall + o.apex + D + 34;
  return spriteL(W, H, (b, Lt) => {
    const R = rng(sd), wallM = o.walls === "rubble" ? V.rubble : o.walls === "boards" ? V.wood : o.walls === "ochre" ? V.ochreW : V.lime;
    // the stack on the ridge, partway back
    if (o.chim !== false) {
      const cx = Math.round(o.chim ?? hw * 0.25), dd = Math.round(D * 0.45), ry = apex - 2 - dd, ch = 14 + (o.chimH ?? 0);
      b.part(); b.rect(cx - 3, ry - ch, 7, ch + 2, V.chim, 1.6, { n: [0, 0, 1] }); courses2(b, cx - 3, Math.round(ry - ch), 7, ch, 3, 5);
      b.toneLine(cx - 3, ry - ch, cx - 3, ry, 1); b.toneLine(cx + 3, ry - ch, cx + 3, ry, -1);
      b.part(); b.rect(cx - 4, ry - ch - 2, 9, 2, V.mason, 1.7, { n: [0, -0.4, 0.9] });
      b.part(); b.rect(cx - 1, ry - ch - 4, 3, 2, V.tileD, 1.75, { n: [0, 0, 1] });
    }
    // the gable wall
    const gw = hw + jt;
    if (o.jetty) {
      b.part(); b.rect(-hw, -o.jetty, hw * 2, o.jetty, wallM, 0.2, { n: [0.1, 0, 0.99] });
      b.part(); b.poly([[-gw, -o.jetty - 3], [-gw, eave], [0, apex], [gw, eave], [gw, -o.jetty - 3]], wallM, 0.2, { n: [0.1, 0, 0.99] });
      beam2(b, -gw - 1, -o.jetty - 3, gw * 2 + 2, 3, 0.35, V.woodD);
      for (let x = -gw; x < gw; x += 4) b.dot(x + 1, -o.jetty, V.woodD, 0.36);
    } else { b.part(); b.poly([[-hw, 0], [-hw, eave], [0, apex], [hw, eave], [hw, 0]], wallM, 0.2, { n: [0.1, 0, 0.99] }); }
    if (o.walls === "rubble") courses2(b, -hw, Math.round(eave), hw * 2, Math.round(-eave), 4, sd);
    if (o.walls === "boards") for (let y = eave + 2; y < 0; y += 2) b.toneLine(-hw, y, hw - 1, y, -1);
    // the gable end's east half in the shade of the roof's lip
    for (let xx = Math.floor(gw * 0.65); xx < gw; xx++) b.toneLine(xx, -2, xx, eave + 2 + Math.floor((xx / gw) * 3), -1);
    // limewash worn at the foot to rubble, moss in the splash zone
    if (!o.walls || o.walls === "lime" || o.walls === "ochre") {
      for (let i = 0; i < hw * 1.2; i++) { const bx = -hw + R() * hw * 2, by = -1 - R() * 5; b.dot(bx, by, R() < 0.55 ? V.limeD : V.rubble, 0.3, { noLine: true, cast: 0 }); }
      for (let xx = -hw; xx < hw; xx++) if (hash(xx, 77 + sd) < 0.5) b.dot(xx, -1, V.moss, 0.3, { noLine: true, cast: 0 });
    }
    // timber framing: corner posts, sill, the girt at the eave, studs and braces, the gable's collar and king post
    if (o.frame) {
      const top = o.jetty ? -o.jetty : eave;
      for (const x of [-hw, hw - 3]) beam2(b, x, top, 3, -top, 0.32, V.woodD);
      beam2(b, -hw, -3, hw * 2, 2, 0.32, V.woodD);
      if (!o.jetty) beam2(b, -hw, eave - 1, hw * 2, 3, 0.33, V.woodD);
      for (const u of o.studs ?? [-0.45, 0.45]) beam2(b, Math.round(u * hw) - 1, top, 2, -top - 3, 0.31, V.woodD);
      if (o.braces !== false) { spar2(b, -hw + 2, -4, -hw + hw * 0.4, top + 2, 0.8, 0.31, V.woodD); spar2(b, hw - 3, -4, hw - hw * 0.4, top + 2, 0.8, 0.31, V.woodD); }
      if (o.jetty) { for (const x of [-gw, gw - 3]) beam2(b, x, eave, 3, -o.jetty - 3 - eave, 0.32, V.woodD); beam2(b, -gw, eave - 1, gw * 2, 3, 0.33, V.woodD); for (const u of [-0.5, 0, 0.5]) beam2(b, Math.round(u * gw) - 1, eave, 2, -o.jetty - 3 - eave, 0.31, V.woodD); spar2(b, -gw + 2, -o.jetty - 4, -gw * 0.5, eave + 2, 0.8, 0.31, V.woodD); spar2(b, gw - 3, -o.jetty - 4, gw * 0.5, eave + 2, 0.8, 0.31, V.woodD); }
      const cy = eave - Math.round(o.apex * 0.42), cw = Math.round(gw * 0.58);
      beam2(b, -cw, cy, cw * 2, 2, 0.33, V.woodD); beam2(b, -1, apex + 2, 2, cy - apex - 2, 0.33, V.woodD);
      spar2(b, -1, cy + 1, -cw + 2, eave, 0.7, 0.32, V.woodD); spar2(b, 1, cy + 1, cw - 2, eave, 0.7, 0.32, V.woodD);
    }
    // the rubble plinth
    b.part(); b.rect(-hw - 1, -4, hw * 2 + 2, 4, V.rubble, 0.25, { n: [0, 0.1, 0.99] }); courses2(b, -hw - 1, -4, hw * 2 + 2, 4, 4, sd + 9);
    // round 3: the plinth sits in the turf (tufts behind the corners, breaking over its foot in front)
    tufts(b, -hw - 3, hw + 3, 0, R, 0.05, 2, { every: 3.5, front: 0.7, h: 2 });
    // door, windows, the gable window
    if (o.door !== false) { const [dx, dw, dh, dm] = o.door ?? [4, 8, 13, V.door]; door2(b, dx, -dh - 1, dw, dh, 0.5, dm); b.part(); b.rect(dx - 2, -1, dw + 4, 1, V.mason, 0.55, { n: [0, -0.5, 0.86] }); }
    for (const [x, y, w, h, wo] of o.windows ?? []) win2(b, Lt, x, y, w, h, 0.5, wo ?? {});
    if (o.gableWin !== false) win2(b, Lt, -3, Math.round(apex + o.apex * 0.38), 6, 6, 0.5, { lit: o.gableLit ?? true });
    // the roof
    const mL = o.roof === "tile" ? V.tile : o.roof === "slate" ? V.slate : V.thatch, mR = o.roof === "tile" ? V.tileE : o.roof === "slate" ? V.slateE : V.thatchE;
    const rf = gable2(b, gw, eave, apex, D, mL, mR, o.roof === "thatch" ? 4 : 3);
    for (let d = 2; d < D; d += o.roof === "thatch" ? 2 : 3) for (const [a, e, lit] of [[rf.lE, rf.apex, true], [rf.apex, rf.rE, false]]) {
      const n = Math.abs(e[0] - a[0]);
      for (let i = 0; i < n; i++) {
        const t = i / n, X = a[0] + (e[0] - a[0]) * t, Y = a[1] + (e[1] - a[1]) * t - d, r = hash(sd + d, i);
        if (o.roof === "thatch") { const run = hash(sd + d * 7, Math.floor(i / (3 + (d % 3)))) ; if (run < 0.62) b.tone(X, Y, -1); if (lit && run > 0.7 && r > 0.35) b.tone(X, Y - 1, 1); if (!lit && run < 0.3) b.tone(X, Y - 1, -1); }
        else { b.tone(X, Y, -1); if ((i + (d % 6 ? 0 : 2)) % 4 === 0) b.tone(X, Y - 1, -1); if (lit && r > 0.85) b.tone(X, Y + 1, 1); }
      }
    }
    // ridge, the verge's lip along the eaves
    spar2(b, 0, apex - 2, 0, apex - 2 - D, 1.3, 1.4, o.roof === "tile" ? V.tileD : o.roof === "slate" ? V.slateE : V.thatchD);
    b.toneLine(-1, apex - 3, -1, apex - 2 - D, 1);
    // a thatched ridge is bound with hazel liggers: a cross-hatch along the ridge roll and a cut lower edge
    if (o.roof === "thatch") for (let d = 0; d < D; d += 4) { b.dot(-2, apex - 3 - d, V.thatchD, 1.45, { noLine: true }); b.dot(-1, apex - 4 - d, V.thatchD, 1.45, { noLine: true }); b.dot(1, apex - 4 - d, V.thatchD, 1.45, { noLine: true }); b.dot(2, apex - 3 - d, V.thatchD, 1.45, { noLine: true }); }
    for (const [a, e] of [[rf.lE, rf.apex], [rf.apex, rf.rE]]) {
      const n = Math.abs(e[0] - a[0]);
      for (let i = 0; i <= n; i++) { const t = i / n, X = a[0] + (e[0] - a[0]) * t, Y = a[1] + (e[1] - a[1]) * t; b.dot(X, Y, o.roof === "tile" ? V.tileD : o.roof === "slate" ? V.slateE : V.thatchD, 1.3, { n: [0, 0.4, 0.9] }); if (o.roof === "thatch" && hash(sd, i + 300) < 0.45) b.dot(X, Y + 1, V.thatch, 1.3, { n: [0, 0.4, 0.9], noLine: true, cast: 0 }); }
    }
    // moss and weathering on the roof, thicker toward the back
    for (let k = 0; k < D * 0.6; k++) { const s = R() > 0.5 ? 1 : -1, t = 0.4 + R() * 0.6, d = R() * D; const X = s * (gw + 3) * t, Y = eave + 2 - (eave - apex) * (1 - t) - d; if (R() < 0.3 + d / D * 0.5) b.dot(X, Y, o.roof === "thatch" ? V.thatchM : V.mossL, 1.35, { noLine: true, cast: 0 }); }
    // lights and the little things round the door
    for (const [x, y, f] of o.lamps ?? []) wallLamp(b, Lt, x, y, 0.6, f ?? 1);
    if (o.butt) { const x = -hw - 4; b.part(); b.ellipse(x, -4, 3.5, 4.5, V.wood, 0.7, { round: 0.9 }); b.toneLine(x - 3, -6, x + 3, -6, -1); b.toneLine(x - 3, -2, x + 3, -2, -1); b.part(); b.ellipse(x, -8.5, 3.5, 1.2, V.glass, 0.75); }
    if (o.bench) { const x = o.bench; b.part(); b.rect(x, -5, 12, 2, V.woodL, 0.7, { n: [0, -0.5, 0.86] }); b.part(); b.rect(x + 1, -3, 2, 3, V.woodD, 0.69); b.part(); b.rect(x + 9, -3, 2, 3, V.woodD, 0.69); }
    if (o.barrels) for (let k = 0; k < o.barrels; k++) { const x = hw + 5 + k * 7; b.part(); b.ellipse(x, -4.5, 3.2, 4.5, V.wood, 0.7 + k * 0.01, { round: 0.9 }); b.toneLine(x - 3, -6, x + 3, -6, -1); b.toneLine(x - 3, -3, x + 3, -3, -1); }
    if (o.sign) {
      // the hanging sign: a post, an arm, a board painted with a crown (the Crown and Goblin)
      const sx = o.sign, top = eave - 6;
      b.part(); b.rect(sx, top, 2, -top, V.woodD, 0.9, { n: [0, 0, 1] }); b.part(); b.rect(sx - 12, top, 14, 2, V.woodD, 0.92, { n: [0, -0.4, 0.9] });
      b.part(); b.line(sx - 10, top + 2, sx - 10, top + 4, V.iron, 0.93); b.part(); b.line(sx - 3, top + 2, sx - 3, top + 4, V.iron, 0.93);
      b.part(); b.rect(sx - 12, top + 4, 11, 9, V.sign, 0.95, { n: [0, 0, 1] }); b.toneLine(sx - 12, top + 4, sx - 2, top + 4, 1);
      b.dot(sx - 9, top + 7, V.gold, 0.97); b.dot(sx - 7, top + 6, V.gold, 0.97); b.dot(sx - 5, top + 7, V.gold, 0.97); b.part(); b.rect(sx - 9, top + 8, 5, 2, V.gold, 0.97, { n: [0, 0, 1], noLine: true });
      wallLamp(b, Lt, sx + 2, top + 6, 0.98, 1);
    }
    if (o.forge) {
      // the smithy's open front: the forge's glow deep inside, an anvil on its block before it
      const [fx, fw, fh] = o.forge;
      b.part(); b.rect(fx, -fh, fw, fh - 1, V.hole, 0.45, { n: [0, 0, 1] }); beam2(b, fx - 1, -fh - 2, fw + 2, 2, 0.55, V.woodD);
      b.part(); b.rect(fx + 3, -9, 8, 5, V.rubble, 0.5, { n: [0, 0, 1] }); b.part(); b.ellipse(fx + 7, -9, 3, 1.5, V.fire, 0.52); b.dot(fx + 7, -10, V.fireL, 0.53);
      for (let k = 0; k < 4; k++) b.dot(fx + 2 + k * 3, -fh + 2 + (k % 2), V.lampD, 0.5, { noLine: true });
      Lt.win(fx + 2, -12, 10, 6); Lt.lamp(fx + 7, -9, 30, "#ff8a30");
      const ax = fx + fw + 5; b.part(); b.rect(ax - 2, -5, 4, 5, V.wood, 0.8); b.part(); b.poly([[ax - 5, -7], [ax + 4, -7], [ax + 2, -5], [ax - 3, -5]], V.iron, 0.85, { n: [0, -0.5, 0.86] }); b.part(); b.poly([[ax + 4, -7], [ax + 7, -6.5], [ax + 4, -6]], V.iron, 0.86);
    }
  }, 8);
};
// a hen house / byre lean-to: low, slate or thatch
const henhouse = (seed = 4) => house({ hw: 9, wall: 9, apex: 6, D: 12, roof: "thatch", walls: "boards", door: [-2, 4, 5, V.hole], windows: [], gableWin: false, chim: false, seed });
// the well: a round curb, posts, a little tiled roof, the bucket on its rope, a lantern on the post
const well2 = (t = 0) => spriteL(40, 48, (px, Lt) => {
  px.part().ellipse(0, -10, 10, 4.5, V.hole, 2.8);
  px.part().poly([[-11, -9], [11, -9], [11, -1], [-11, -1]], V.rubble, 3, { round: 0.95 }); px.part().ellipse(0, -1, 11, 3, V.rubble, 2.9, { round: 0.6 });
  courses2(px, -11, -9, 22, 8, 3, 4);
  px.part().ellipse(0, -9.5, 11, 4, V.mason, 3.1, { n: [0, -0.6, 0.8] }); px.part().ellipse(0, -9.5, 8, 2.6, V.hole, 3.2);
  beam2(px, -11, -28, 2, 19, 4, V.woodD); beam2(px, 9, -28, 2, 19, 4, V.woodD);
  px.part().line(-9, -21, 9, -21, V.woodL, 4.2); px.part().ellipse(-10, -21, 1.5, 1.5, V.iron, 4.3);
  px.part().poly([[-14, -26], [14, -26], [10, -35], [-10, -35]], V.tile, 5, { n: [-0.1, -0.5, 0.86] }); for (let y = -28; y > -35; y -= 2) px.toneLine(-13, y, 13, y, -1);
  px.part().rect(-11, -36, 22, 1.5, V.tileD, 5.1);
  const sw = Math.sin(t * 1.6) * 1.6;
  px.part().line(0, -21, sw, -14, V.woodL, 4.3); px.part().rect(-2 + sw, -14, 4, 4, V.wood, 4.4, { round: 1 }); px.toneLine(-2 + sw, -12, 2 + sw, -12, -1);
  // the lantern hung off the west post
  wallLamp(px, Lt, -11, -22, 4.5, -1);
  const R = rng(15); tufts(px, -13, 13, 0, R, 2, 6, { every: 3, front: 0.75 });
  px.part().ellipse(9, -0.5, 3.5, 1.6, V.mason, 3.05, { round: 0.6 });
}, 4);
// a lantern on a tall post (the fingerpost's, the yard's)
const lampPost = (h = 22) => spriteL(22, h + 14, (px, Lt) => {
  const R = rng(h); px.part().ellipse(0, -1, 3.2, 2, V.rubble, 1.8, { round: 0.7 });
  px.part().capsule(0, 0, 1.3, 0, -h, 1.1, V.woodD, 2); px.part(); px.line(0, -h, 5, -h, V.iron, 2.2); px.line(1, -h + 3, 4, -h, V.iron, 2.2);
  lantern(px, Lt, 5, -h + 0.5, 2.3, 22); collar(px, -3, 3, 0, R, 2.6); tufts(px, -5, 5, 0, R, 1.5, 2.7, { every: 2.5 });
}, 3);
const fingerpost2 = (t = 0) => spriteL(40, 44, (px, Lt) => {
  px.part().capsule(0, 0, 1.4, 0, -30, 1.3, V.woodD, 2);
  px.part().poly([[1, -27], [14, -27], [16, -25], [14, -23], [1, -23]], V.woodL, 3, { n: [0, 0, 1] }); px.part().poly([[-1, -20], [-13, -20], [-15, -18], [-13, -16], [-1, -16]], V.woodL, 3, { n: [0, 0, 1] });
  px.toneLine(3, -25, 12, -25, -1); px.toneLine(-3, -18, -11, -18, -1);
  px.part().ellipse(0, -31, 2, 1.3, V.woodD, 3);
  px.part(); px.line(0, -15, -5, -15, V.iron, 3.2); px.line(-1, -12, -3, -15, V.iron, 3.2); lantern(px, Lt, -5, -14.5, 3.25, 20);
  // footed in a cairn of field stones, turf grown over it
  const R = rng(17); for (const [x, y, r] of [[-3, -0.5, 2.6], [3, -0.5, 2.4], [0, -1.8, 2.2], [5.5, 0, 1.6]]) px.part().ellipse(x, y, r, r * 0.7, R() > 0.5 ? V.rubble : V.mason, 2.5 + x * 0.01, { round: 0.85 });
  collar(px, -6, 6, 0.3, R, 2.8); tufts(px, -8, 8, 0, R, 1.5, 2.9, { every: 2.5 });
}, 4);
const shrine2 = () => spriteL(36, 52, (px, Lt) => {
  px.part().rect(-7, -26, 14, 26, V.mason, 2, { n: SOUTH }); courses2(px, -7, -26, 14, 26, 3, 5);
  px.part().poly([[-4, -6], [4, -6], [4, -18], [0, -22], [-4, -18]], V.hole, 2.3);
  px.part().ellipse(0, -12, 2, 4, V.lime, 2.6); px.part().ellipse(0, -16.5, 1.5, 1.5, V.lime, 2.65);
  px.part().poly([[-10, -25], [10, -25], [0, -35]], V.tile, 3, { n: [-0.1, -0.5, 0.86] }); px.part().line(0, -35, 0, -39, V.iron, 3.2); px.part().line(-2, -37.5, 2, -37.5, V.iron, 3.2);
  for (const x of [-3, 3]) { px.dot(x, -7, V.lime, 2.7); px.dot(x, -8, V.fireL, 2.75); px.dot(x, -9, V.lamp, 2.75); }
  Lt.lamp(0, -8, 16);
  px.part().rect(-9, -2.5, 18, 3, V.mason, 2.4, { n: [0, -0.4, 0.9] }); courses2(px, -9, -2.5, 18, 3, 3, 8); px.toneLine(-9, 0, 8, 0, -1);
  px.part().ellipse(-11, -1.5, 3, 2, V.rubble, 2.5); for (let k = 0; k < 5; k++) px.dot(-7 + k * 3, -3, k % 2 ? V.flowerR : V.flowerY, 3);
  const R = rng(16); tufts(px, -13, 12, 0.5, R, 1.5, 3.2, { every: 2.5, front: 0.65 });
}, 4);
const campfire = (t = 0) => spriteL(20, 22, (px, Lt) => {
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; px.part().ellipse(Math.cos(a) * 6, -2 + Math.sin(a) * 2.4, 2, 1.5, V.rubble, 1 + Math.sin(a), { round: 0.9 }); }
  for (let k = 0; k < 3; k++) px.part().capsule(-4 + k * 3, -2, 1.1, -1 + k, -5, 0.9, V.woodD, 1.5);
  const f = [6, 8, 7, 5][t % 4];
  px.part().ellipse(0, -2 - f * 0.4, 3, f * 0.55, V.fire, 2); px.part().ellipse(0, -2 - f * 0.25, 1.5, f * 0.3, V.fireL, 2.1);
  Lt.lamp(0, -5, 34, "#ff9a3a");
}, 3);
const washing = (t = 0) => spriteL(56, 30, (px) => {
  px.part().capsule(-22, 0, 1, -22, -18, 1, V.woodD, 2); px.part().capsule(22, 0, 1, 22, -18, 1, V.woodD, 2);
  px.part().line(-22, -17, 22, -16, V.woodL, 2.1);
  const R = rng(5); for (const x of [-22, 22]) { collar(px, x - 2, x + 2, 0, R, 2.5); tufts(px, x - 4, x + 4, 0, R, 1.5, 2.6, { every: 2.5 }); }
  const cols = [V.cloth1, V.cloth2, V.cloth1, V.cloth3];
  for (let k = 0; k < 4; k++) { const x = -18 + k * 10, sw = Math.sin(t * 1.5 + k) * 1.5; px.part().poly([[x, -16.5], [x + 7, -16.3], [x + 7 + sw, -8 - (k % 2) * 2], [x + sw, -9]], cols[k], 2.2, { round: 0.3 }); }
}, 3);
const cat = (t = 0) => sprite(14, 14, (px) => {
  px.part().ellipse(0, -3, 2.5, 3, V.cat, 2, { round: 0.9 }); px.part().ellipse(-1.5, -6.5, 1.8, 1.6, V.cat, 2.2);
  px.dot(-3, -8, V.cat, 2.3); px.dot(-1, -8, V.cat, 2.3); px.dot(-2, -6.5, V.lichY, 2.4);
  const tl = [0, 1, 2, 1][t % 4]; px.part().limb([[2, -1], [4, -2 - tl * 0.5], [4 + tl * 0.6, -5 - tl]], 0.8, V.cat, 1.9);
}, 2);
const bird = (t = 0) => sprite(8, 6, (px) => { const up = t % 2; px.part().line(-3, up ? -3 : -1, 0, -1, V.hole, 2); px.part().line(0, -1, 3, up ? -3 : -1, V.hole, 2); }, 2);

// ======================================================================================================
// RUINS
// ======================================================================================================
// A's old tower, polished: a coursed cylinder whose joints crowd at the edges, a broken crown whose
// inside you can see (the back wall's inner face, the wall-top rim), an empty window showing sky, a
// doorway, ivy climbing the west side, fallen squared blocks, jackdaws on the rim.
const oldTower = (r = 24, h = 120, seed = 12, o = {}) => sprite(r * 2 + 60, h + 50, (px) => {
  const R = rng(seed), m = V.lime1, md = V.lime2, ry = r * 0.42, s = (x) => Math.sqrt(Math.max(0, 1 - (x / r) ** 2));
  // the front wall's broken top: full height on the west, a jagged fall to the east
  const brk = (x) => { const t = (x + r) / (2 * r), u = Math.max(0, Math.min(1, (t - 0.3) / 0.22)), sm = u * u * (3 - 2 * u); return sm * 44 + (t > 0.52 ? Math.sin(t * 15) * 5 : 0) + Math.floor(hash(Math.floor((x + 40) / 3), 7) * 3) * 2 * (t > 0.25 ? 1 : 0.4); };
  const topF = (x) => -h + brk(x) + ry * s(x);
  // the open top and the back wall's inner face (dark, in its own shade), drawn first
  const inner = []; for (let x = -r; x <= r; x++) inner.push([x, -h - ry * s(x)]); for (let x = r; x >= -r; x--) inner.push([x, topF(x) + 1]);
  px.part().poly(inner, md, 1, { n: [0.2, 0.35, 0.9] });
  for (let x = -r + 3; x < r - 3; x += 1) for (let y = -h - ry * s(x) + 5; y < topF(x); y += 4) px.tone(x, y, hash(x, y | 0) > 0.7 ? 0 : -1);
  // the wall-top rim of the standing back wall: a lit band
  for (let x = -r; x <= r; x++) { const y = -h - ry * s(x); px.dot(x, y, m, 1.2, { n: [-0.2, -0.8, 0.55] }); px.dot(x, y + 1, m, 1.2, { n: [-0.2, -0.8, 0.55] }); px.dot(x, y + 2, md, 1.15, { n: [0, -0.2, 0.95] }); }
  // the front wall: a cylinder (round 0.95), its foot on the front arc
  const front = []; for (let x = -r; x <= r; x++) front.push([x, topF(x)]); for (let x = r; x >= -r; x--) front.push([x, ry * s(x) * 0.5]);
  px.part().poly(front, m, 2, { round: 0.95 });
  // its broken top edge: the wall's thickness, lit
  for (let x = -r; x <= r; x++) { px.dot(x, topF(x), m, 2.3, { n: [-0.2, -0.8, 0.55] }); px.dot(x, topF(x) + 1, m, 2.3, { n: [-0.1, -0.6, 0.8] }); }
  // coursed rubble: courses of uneven height; on a cylinder the joints crowd toward the edges
  for (let y = -2, c = 0; y > -h; c++) {
    const ch = 4 + Math.floor(hash(c, seed) * 3); y -= ch;
    for (let x = -r; x <= r; x++) if (y > topF(x) + 2) px.tone(x, y + ry * s(x) * 0.5 * (1 - (-y / h)) , -1);
    for (let a = -1.5 + hash(c, 3) * 0.35; a < 1.5; a += 0.3 + hash(c, a * 10 | 0) * 0.25) {
      const x = r * Math.sin(a); if (y + 1 < topF(x) + 2) continue;
      px.toneLine(x, y + 1, x, y + ch - 1, -1);
      const v = hash(a * 100 | 0, c + 50); if (v > 0.85) px.toneLine(x + 1, y + 1, x + 1 + 3 * Math.cos(a), y + 1, 1);
    }
  }
  for (let k = 0; k < r * h / 25; k++) { const x = (R() - 0.5) * 2 * r, y = -R() * h; if (y > topF(x) + 2) px.tone(x, y, R() > 0.6 ? 1 : -1); }
  // the empty window high on the standing west part: sky through it, its jambs and sill
  const wx = -r * 0.55, wy = -h + 22;
  px.part().poly([[wx - 3, wy], [wx + 3, wy], [wx + 3, wy - 9], [wx, wy - 12], [wx - 3, wy - 9]], V.sky, 2.5);
  px.part().rect(wx - 3, wy - 4, 2, 4, V.skyL, 2.55, { noLine: true }); px.part().rect(wx - 4, wy, 8, 1.5, m, 2.6, { n: [0, -0.7, 0.7] });
  // a slit lower down, the doorway at the foot with its step
  px.part().rect(r * 0.2, -h * 0.45, 2, 8, V.hole, 2.5);
  px.part().poly([[-6, 2], [6, 2], [6, -12], [3, -16], [-3, -16], [-6, -12]], V.hole, 2.5);
  px.part().rect(-8, 1, 16, 2, md, 2.6, { n: [0, -0.6, 0.8] });
  for (const [x, y] of [[-6, -12], [-3, -16], [3, -16], [6, -12]]) px.dot(x, y, m, 2.55, { n: [0, -0.5, 0.85] });
  // ivy climbs the west side from the ground and spills over the top
  for (let k = 0; k < (o.ivy ?? 26); k++) { const t = R(), x = -r + 2 + R() * r * (0.9 - t * 0.5), y = -t * h * 0.9; if (y < topF(x) + 1) continue; px.ellipse(x, y, 2 + R() * 2.5, 2 + R() * 2.5, R() > 0.4 ? V.ivy : V.ivyL, 3, { wrap: true }); }
  for (let k = 0; k < 6; k++) { const x = -r * 0.8 + R() * r * 0.5; px.part().ellipse(x, -h + 3 + R() * 6, 2.5, 2, V.ivyL, 3.1, { round: 0.8 }); }
  // fallen squared blocks, half sunk, mossy
  for (let k = 0; k < (o.rubble ?? 7); k++) {
    const x = r * 0.6 + R() * r * 1.6, y = 2 - R() * 4, w = 4 + R() * 4, hh = 2.5 + R() * 2;
    px.part().poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - hh], [x - w / 2, y - hh]], R() > 0.5 ? m : md, 4 + k * 0.01, { round: 0.4, ny: 0.1 });
    px.part().poly([[x - w / 2 + 0.5, y - hh], [x + w / 2 - 0.5, y - hh], [x + w / 2 - 1.5, y - hh - 2], [x - w / 2 + 1, y - hh - 2]], m, 4.05 + k * 0.01, { n: [-0.1, -0.7, 0.7] });
    if (R() > 0.5) px.ellipse(x, y - hh - 1, w * 0.3, 0.8, V.moss, 4.1, { wrap: true });
  }
  // turf hugging the foot
  for (let k = 0; k < r; k++) px.part().ellipse((R() - 0.5) * r * 2.4, 1 + R() * 2, 2 + R() * 2, 1.2, R() > 0.5 ? V.turf : V.turfD, 5, { round: 0.6 });
  // jackdaws on the rim
  for (const x of o.daws ?? [-r * 0.7, -r * 0.35]) { const y = topF(x) - 1; px.part().ellipse(x, y - 1.5, 1.6, 1.2, V.hole, 3.5); px.dot(x - 1.5, y - 2.5, V.hole, 3.5); px.dot(x - 2.5, y - 2.5, V.gold, 3.6); }
}, 8);
// the second ruin: a roofless chapel's west gable standing alone, a bellcote on it, a lancet showing sky
const chapelGable = (seed = 41) => sprite(130, 130, (px) => {
  const R = rng(seed), m = V.lime1, d = V.lime2;
  // the stub of the north wall running back behind it, broken low
  px.part().poly([[8, -18], [40, -30], [40, -36], [32, -40], [22, -36], [8, -44]], d, 1, { n: [0.3, 0, 0.95] }); courses2(px, 8, -44, 32, 26, 3, 3);
  // the gable: a tall triangle on a wall, a little belcote at the apex, buttresses at the corners
  px.part().poly([[-24, 0], [24, 0], [24, -40], [0, -72], [-24, -40]], m, 3, { n: SOUTH }); courses2(px, -24, -72, 48, 72, 4, 7);
  for (let x = 0; x < 24; x++) px.toneLine(x, -40 - (24 - x) * 1.33 + 2, x, -1, x > 14 ? -1 : 0);
  for (const x of [-28, 22]) { px.part().poly([[x, 0], [x + 6, 0], [x + 6, -30], [x + 3, -36], [x, -32]], d, 3.5, { round: 0.4 }); }
  px.part().rect(-5, -86, 10, 15, m, 3.2, { n: SOUTH }); px.part().poly([[-7, -86], [7, -86], [0, -93]], m, 3.3, { n: [-0.1, -0.5, 0.86] });
  px.part().poly([[-2.5, -74], [2.5, -74], [2.5, -81], [0, -84], [-2.5, -81]], V.sky, 3.4); px.part().ellipse(0, -77, 2, 2, V.gold, 3.45, { round: 0.9 });
  // the lancet window: sky through it, a mullion, its arch; the doorway with its step
  px.part().poly([[-6, -30], [6, -30], [6, -52], [0, -60], [-6, -52]], V.sky, 3.5); px.part().rect(-6, -40, 4, 10, V.skyL, 3.55, { noLine: true });
  px.part().line(0, -58, 0, -30, d, 3.6); px.part().rect(-7, -30, 14, 2, d, 3.6, { n: [0, -0.6, 0.8] });
  px.part().poly([[-6, 0], [6, 0], [6, -12], [0, -18], [-6, -12]], V.hole, 3.5); px.part().rect(-8, -1, 16, 2, d, 3.6, { n: [0, -0.6, 0.8] });
  // ivy over the west corner and up the gable
  for (let k = 0; k < 22; k++) { const t = R(); px.ellipse(-26 + R() * 14 + t * 6, -t * 60, 2 + R() * 3, 2 + R() * 3, R() > 0.4 ? V.ivy : V.ivyL, 4, { wrap: true }); }
  // fallen blocks, a toppled cross, turf
  for (let k = 0; k < 6; k++) { const x = 20 + R() * 26, w = 4 + R() * 4; px.part().poly([[x - w / 2, 1], [x + w / 2, 1], [x + w / 2, -3], [x - w / 2, -3]], R() > 0.5 ? m : d, 5 + k * 0.01, { round: 0.4 }); px.part().poly([[x - w / 2, -3], [x + w / 2, -3], [x + w / 2 - 1, -5], [x - w / 2 + 1, -5]], m, 5.05 + k * 0.01, { n: [-0.1, -0.7, 0.7] }); }
  for (let k = 0; k < 18; k++) px.part().ellipse((R() - 0.5) * 70, 1 + R() * 2, 2 + R() * 2, 1.2, R() > 0.5 ? V.turf : V.turfD, 6, { round: 0.6 });
}, 8);


// ROUND 3: THE CHAPEL, one building (owner: "the roof looks disconnected from the little tower"). The plan: a
// small nave running back up the page, its WEST GABLE toward us carrying a bellcote. The bellcote is the gable
// wall grown up past the roof line: one mass, one set of courses running through both, quoins up both corners,
// the raking copings dying into its piers at a clear junction. Behind, the nave's side walls run back (their
// tops broken lowest in the middle, the same on both sides), the east gable stands at the back with a lancet,
// and the roof is what is left: a run of slates still tucked under the west coping on the north-west slope,
// bare rafters and a purlin behind it, one rafter fallen. A yew beside it, two old headstones, fallen blocks.
const chapel = (seed = 41, o = {}) => spriteL(150, 116, (px, Lt) => {
  const R = rng(seed), m = V.lime1, d = V.lime2, hw = 26, eave = -34, apex = -62, bw = 7, D = 30, bTop = -80;
  const rake = (x) => eave + (apex - eave) * (1 - Math.abs(x) / hw), bBase = Math.round(rake(bw + 1));
  // 1. the east gable at the back: its inner face toward us, its top fallen from the north-west corner down
  const eg = [[-hw, -D], [-hw, -D - 24], [-20, -D - 26], [-15, -D - 21], [-10, -D - 23], [-4, -D - 16], [2, -D - 18], [8, -D - 12], [14, -D - 14], [20, -D - 9], [hw, -D - 11], [hw, -D]];
  px.part().poly(eg, d, 0.5, { n: [0.15, 0.25, 0.95] }); courses2(px, -hw, -84, hw * 2, 54, 4, seed + 3);
  for (let i = 1; i + 1 < eg.length - 1; i++) { const [ax, ay] = eg[i], [bx, by] = eg[i + 1]; for (let t = 0; t <= 1; t += 0.1) px.dot(lerp(ax, bx, t), lerp(ay, by, t) + 1, m, 0.52, { n: [-0.2, -0.8, 0.55], noLine: true }); }
  px.part().poly([[-20, -43], [-17, -43], [-17, -50], [-18.5, -52], [-20, -50]], V.hole, 0.55);
  // 2. the side walls running back: drawn slice by slice from the back, tops lit, broken lowest mid-nave
  const hL = (z) => z < 19 ? 34 : z < 24 ? lerp(34, 13, (z - 19) / 5) : z < 28 ? 12 + hash(z, 3) * 2 : lerp(13, 24, (z - 28) / 2);
  const hR = (z) => z < 15 ? 34 : z < 20 ? lerp(34, 10, (z - 15) / 5) : z < 27 ? 9 + hash(z, 5) * 2 : lerp(10, 11, (z - 27) / 3);
  for (const [x0, h] of [[-hw, hL], [hw - 4, hR]]) {
    px.part();
    for (let z = D; z >= 0; z--) { const top = Math.round(-z - h(z)); for (let x = x0; x < x0 + 4; x++) for (let y = top; y <= -z; y++) px.dot(x, y, (z + (x >> 1)) % 7 === 0 ? d : m, 0.6 + (D - z) * 0.002, { n: y - top < 1.5 ? [-0.2, -0.85, 0.5] : x0 > 0 ? [0.5, 0.1, 0.86] : SOUTH }); }
    for (let z = 2; z < D; z += 3) { const y = -z - h(z); px.toneLine(x0, y + 1, x0 + 3, y + 1, -1); }
  }
  // 3. what is left of the roof: slates still under the west coping (north-west slope), rafters, a purlin, a fallen rafter
  const sl = []; for (let x = -hw - 1; x <= -bw - 1; x++) sl.push([x, rake(x) - 0.5]);
  const brk = (x) => 5 + Math.round(hash(Math.floor((x + 40) / 3), seed) * 4) + (x > -14 ? 2 : 0);
  for (let x = -bw - 1; x >= -hw - 1; x--) sl.push([x, rake(x) - brk(x)]);
  px.part().poly(sl, V.slate, 1.2, { n: [-0.5, -0.4, 0.76] });
  for (let k = 1; k < 9; k += 2) for (let x = -hw; x <= -bw - 1; x++) if (k < brk(x)) px.tone(x, rake(x) - k, -1);
  for (let x = -hw; x < -bw; x += 3) px.tone(x, rake(x) - 2, 1);
  for (const z of [11, 17]) { px.part(); px.line(-hw + 2, eave - z, -bw - 2, rake(-bw - 2) - z, V.wood, 1 - z * 0.01); }
  for (const z of [6, 13]) { px.part(); px.line(hw - 2, eave - z, bw + 3, rake(bw + 3) - z, V.wood, 1 - z * 0.01); }
  px.part(); px.line(hw - 3, eave - 14, 13, -37, V.wood, 0.98);
  // 4. the west gable and its bellcote: ONE mass, the courses run through both
  const gp = [[-hw, 0], [hw, 0], [hw, eave], [bw + 1, bBase], [bw, bBase], [bw, bTop], [-bw, bTop], [-bw, bBase], [-bw - 1, bBase], [-hw, eave]];
  px.part().poly(gp, m, 3, { n: SOUTH }); courses2(px, -hw, bTop, hw * 2, -bTop, 4, seed + 7);
  for (let x = 13; x < hw; x++) px.toneLine(x, rake(x) + 3, x, -2, -1);
  for (let x = 3; x < bw; x++) px.toneLine(x, bTop + 2, x, bBase + 1, x > 4 ? -1 : 0);
  // quoins up both gable corners and both bellcote corners: long and short dressed blocks, lit
  const quoin = (x, y0, y1, dir) => { for (let y = y0, k = 0; y > y1 + 1; y -= 4, k++) { const w = k % 2 ? 2 : 4; for (let yy = y - 3; yy < y; yy++) for (let i = 0; i < w; i++) px.tone(x + dir * i, yy, dir > 0 ? 1 : 0); px.toneLine(x, y - 4, x + dir * (w - 1), y - 4, -1); px.toneLine(x + dir * w, y - 4, x + dir * w, y - 1, -1); } };
  quoin(-hw, 0, eave, 1); quoin(hw - 1, 0, eave, -1); quoin(-bw, bBase, bTop, 1); quoin(bw - 1, bBase, bTop, -1);
  // the raking copings from the kneelers up to the bellcote's piers, where they stop against its quoins
  px.part().poly([[-hw - 2, eave + 1], [-bw, bBase + 1], [-bw, bBase - 1.5], [-hw - 2, eave - 1.5]], m, 3.4, { n: [-0.35, -0.7, 0.62] });
  px.part().poly([[hw + 2, eave + 1], [bw, bBase + 1], [bw, bBase - 1.5], [hw + 2, eave - 1.5]], d, 3.4, { n: [0.45, -0.55, 0.7] });
  for (const x of [-hw - 2, hw - 3]) { px.part().rect(x, eave - 1, 5, 4, x < 0 ? m : d, 3.45, { n: [0, -0.3, 0.95] }); px.toneLine(x, eave + 3, x + 4, eave + 3, -1); }
  // the bellcote: a string course, the opening with its bell, a gabled cap, a cross
  px.part().rect(-bw - 1, bBase - 6, bw * 2 + 2, 1.5, m, 3.3, { n: [0, -0.7, 0.7] });
  px.part().poly([[-3.5, bBase - 7], [3.5, bBase - 7], [3.5, -72], [0, -76], [-3.5, -72]], V.sky, 3.5);
  px.part().ellipse(0, -69.5, 2.4, 2.8, V.bell, 3.6, { round: 0.9 }); px.part().rect(-3, -67.5, 6, 1, V.bell, 3.62); px.part().line(0, -73, 0, -72, V.iron, 3.6);
  px.part().poly([[-bw - 2, bTop + 1], [0, bTop - 7], [0, bTop + 1]], m, 3.7, { n: [-0.3, -0.6, 0.74] });
  px.part().poly([[0, bTop - 7], [bw + 2, bTop + 1], [0, bTop + 1]], d, 3.7, { n: [0.5, -0.45, 0.74] });
  px.part(); px.line(0, bTop - 7, 0, bTop - 12, m, 3.8); px.line(-2, bTop - 10, 2, bTop - 10, m, 3.8);
  // the west window: a tall lancet with Y-tracery, its hood-mould and sill; the doorway with its hood and step
  px.part().poly([[-4.5, -24], [4.5, -24], [4.5, -40], [0, -47], [-4.5, -40]], V.sky, 3.5); for (let y = -40; y < -25; y++) px.dot(-4, y, V.skyL, 3.52, { noLine: true });
  px.part(); px.line(0, -24, 0, -40, d, 3.6); px.line(0, -40, -3.5, -43, d, 3.6); px.line(0, -40, 3.5, -43, d, 3.6);
  for (const [x, y] of [[-5.5, -40], [-4.5, -44], [-2.5, -46.5], [0, -48.5], [2.5, -46.5], [4.5, -44], [5.5, -40]]) px.dot(x, y, m, 3.55, { n: [-0.1, -0.7, 0.7] });
  px.part().rect(-6, -24, 12, 1.5, d, 3.6, { n: [0, -0.6, 0.8] });
  px.part().poly([[-6, 0], [6, 0], [6, -12], [0, -18], [-6, -12]], V.hole, 3.5);
  for (let x = -5; x <= 5; x++) { px.dot(x, -1, V.turfD, 3.52, { noLine: true }); if (hash(x, 9) > 0.5) px.dot(x, -2, V.turf, 3.52, { noLine: true }); }
  for (const [x, y] of [[-7, -12], [-5.5, -15.5], [-3, -18], [0, -19.5], [3, -18], [5.5, -15.5], [7, -12]]) px.dot(x, y, m, 3.55, { n: [-0.1, -0.7, 0.7] });
  px.part().rect(-8, -1.5, 16, 2, d, 3.6, { n: [0, -0.6, 0.8] });
  // a plinth course along the foot, the buttresses at the corners with a set-off each
  px.part().rect(-hw - 1, -3, hw * 2 + 2, 3, d, 3.2, { n: [0, 0.1, 0.99] }); px.toneLine(-hw - 1, -3, hw, -3, 1);
  for (const [x, mm] of [[-hw - 5, m], [hw + 1, d]]) { px.part().poly([[x, 0], [x + 4, 0], [x + 4, -22], [x + 2, -26], [x, -24]], mm, 3.8, { round: 0.3 }); px.part().poly([[x, -12], [x + 4, -12], [x + 4, -14], [x, -12.5]], m, 3.85, { n: [0, -0.7, 0.7] }); courses2(px, x, -24, 4, 24, 4, x); }
  // ivy up the north-west corner, along the coping and over the slates' edge
  for (let k = 0; k < 30; k++) { const t = Math.pow(R(), 0.8), x = t < 0.7 ? -hw - 4 + R() * 9 : lerp(-hw, -16, (t - 0.7) / 0.3) + (R() - 0.5) * 3, y = t < 0.7 ? -t / 0.7 * 36 : rake(x) + 1 - R() * 2; px.ellipse(x, y, 1.6 + R() * 2.2, 1.6 + R() * 2, R() > 0.4 ? V.ivy : V.ivyL, 4, { wrap: true }); }
  // the yew to the east, its red-brown fluted trunk and dark layered crown
  px.part().capsule(45, -0.5, 3.4, 45, -10, 2.6, V.yewT, 0.4); px.toneLine(44, -1, 44, -9, 1); px.toneLine(46.5, -1, 47, -9, -1);
  px.part(); for (const [x, y, rx, ry] of [[45, -20, 16, 10], [33, -13, 6, 4], [57, -13, 6, 4], [38, -27, 9, 7], [52, -27, 9, 7], [45, -32, 9, 6], [30, -19, 5, 5], [60, -19, 5, 5]]) px.ellipse(x, y, rx, ry, V.yew, 0.42, { round: 0.6 });
  for (let k = 0; k < 26; k++) { const a = Math.PI * (0.15 + R() * 0.7), x = 45 + Math.cos(a) * 17, y = -12 + Math.sin(a) * 2; px.part().line(x, y - 3, x + (R() - 0.5), y, V.yew, 0.43); }
  for (const [x, y, rx, ry] of [[38, -29, 5, 3], [44, -34, 4, 2.5], [33, -21, 4, 3], [42, -22, 5, 2.5]]) px.part().ellipse(x, y, rx, ry, V.yewL, 0.44, { round: 0.5 });
  for (let k = 0; k < 60; k++) { const a = R() * 6.28, rr = Math.sqrt(R()); px.tone(45 + Math.cos(a) * rr * 15, -21 + Math.sin(a) * rr * 10, R() > 0.55 ? 1 : -1); }
  for (const [x, y] of [[38, -24], [50, -30], [47, -16], [55, -22]]) px.dot(x, y, V.flowerR, 0.46, { noLine: true });
  // two old headstones leaning in the turf, fallen blocks by the south-east buttress
  for (const [x, lean, hh] of [[-44, -1, 8], [-36, 1, 7]]) { px.part().poly([[x - 2.5, 0.5], [x + 2.5, 0.5], [x + 2.5 + lean, -hh + 2], [x + lean, -hh], [x - 2.5 + lean, -hh + 2]], d, 5, { round: 0.6 }); px.ellipse(x + lean, -hh + 2, 1.5, 1, V.lichG, 5.1, { wrap: true }); px.toneLine(x - 1 + lean, -hh + 4, x + 1 + lean, -hh + 4, -1); }
  for (let k = 0; k < 5; k++) { const x = 34 + k * 4 + R() * 2, w = 3.5 + R() * 3, y = 1 + R() * 2; px.part().poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - 3], [x - w / 2, y - 3]], R() > 0.5 ? m : d, 5 + k * 0.01, { round: 0.4 }); px.part().poly([[x - w / 2, y - 3], [x + w / 2, y - 3], [x + w / 2 - 1, y - 5], [x - w / 2 + 1, y - 5]], m, 5.05 + k * 0.01, { n: [-0.1, -0.7, 0.7] }); if (R() > 0.5) px.ellipse(x, y - 4, w * 0.3, 0.8, V.moss, 5.1, { wrap: true }); }
  // its foot in the turf
  tufts(px, -hw - 8, hw + 8, 0.3, R, 0.3, 4.5, { every: 2.6, front: 0.7, h: 2.5 }); collar(px, -hw - 6, hw + 6, 0.4, R, 4.4, 0.9);
  tufts(px, -48, -32, 0.5, R, 4, 5.5, { every: 2.5 }); tufts(px, 36, 54, 0.5, R, 0.3, 5.5, { every: 2.5 });
  // the lights: a lantern on a bracket by the door, a candle on the west window's sill
  if (o.lamp) {
    wallLamp(px, Lt, -8, -15, 3.9, -1, 14);
    px.dot(1, -25, V.wool, 3.7); px.dot(1, -26, V.wool, 3.7); px.dot(1, -27, V.fireL, 3.75, { noLine: true }); px.dot(1, -28, V.lamp, 3.75, { noLine: true });
    Lt.lamp(1, -27, 9); Lt.win(-3, -32, 7, 7);
  }
}, 10);

// ======================================================================================================
// WALLS, a stile, a field gate, kerb stones
// ======================================================================================================
const stile = () => sprite(22, 22, (px) => {
  for (const x of [-6, 6]) beam2(px, x - 1, -12, 2, 12, 2, V.woodD);
  px.part().rect(-7, -8, 14, 2, V.woodL, 2.5, { n: [0, -0.5, 0.86] }); px.part().rect(-5, -4, 10, 2, V.woodL, 2.6, { n: [0, -0.5, 0.86] });
  const R = rng(3); for (const x of [-6, 6]) collar(px, x - 2, x + 2, 0, R, 2.7, 0.8); tufts(px, -9, 9, 0, R, 1, 2.8, { every: 2.5 });
}, 3);
const fieldGate = () => sprite(34, 22, (px) => {
  for (const x of [-14, 14]) beam2(px, x - 1.5, -14, 3, 14, 2, V.woodD);
  for (const y of [-12, -9, -6, -3]) px.part().line(-12, y, 12, y, V.woodL, 2.5); px.part().line(-12, -3, 12, -12, V.woodL, 2.6);
  const R = rng(4); for (const x of [-14, 14]) { collar(px, x - 3, x + 3, 0, R, 2.7, 0.9); tufts(px, x - 4, x + 4, 0, R, 1, 2.8, { every: 2.5 }); }
}, 3);
const kerb = (w, sunk, r) => sprite(w * 2 + 12, 18, (px) => {
  const top = -4 - (1 - sunk) * 3;
  px.part().poly([[-w, 0], [w, 0], [w + (r - 0.5) * 2, top + (r - 0.5) * 2], [-w, top]], V.lime1, 2, { n: [(r - 0.5) * 0.4, 0.15, 0.98] });
  px.part().poly([[-w, top], [w + (r - 0.5) * 2, top + (r - 0.5) * 2], [w - 1, top - 3], [-w + 1, top - 3]], V.lime1, 2.1, { n: [-0.1, -0.6, 0.8] });
  if (sunk > 0.4) px.ellipse(-w * 0.4 + r * w, top - 1, w * 0.6, 1.4, V.moss, 3, { wrap: true });
  px.part().ellipse(0, -0.5, w + 1, 1.6, V.turfD, 2.5);
}, 3);

// ======================================================================================================
// THE SCENE: items sorted by foot line, one shadow layer, contact shadows; golden hour and NIGHT
// ======================================================================================================
let MODE = "noon";   // noon | golden | night
class Scene2 {
  constructor(ctx, crop) { this.ctx = ctx; this.crop = crop; this.items = []; this.ground = []; this.lamps = []; this.cw = ctx.canvas.width; this.ch = ctx.canvas.height; }
  P(lx, ly) { return [Math.round((this.crop[0] + lx) * 2), Math.round((this.crop[1] + ly) * 2)]; }
  add(spr, lx, ly, o = {}) {
    const [x, y] = this.P(lx, ly);
    const near = nearestOnPath(this.crop[0] + lx, this.crop[1] + ly);
    if (near.d < 30 && !o.road) console.warn("on the road:", lx, ly, near.d.toFixed(1));
    this.items.push({ spr, x, y, shade: o.shade ?? 1, sort: y + (o.dy || 0), contact: o.contact ?? spr.contact ?? 0, legacy: !!o.legacy, ground: o.ground ?? !o.legacy });
    for (const [ax, ay, r, col] of spr.lamps ?? []) this.lamps.push([x + ax, y + ay, r, col, -ay]);
  }
  onGround(fn) { this.ground.push(fn); }
  render(t = 0) {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    for (const fn of this.ground) fn(ctx, this);
    // contact shadows: a dark band hugging each rock's foot (whole pixels, dithered edge)
    for (const it of this.items) if (it.contact) for (let i = -it.contact; i <= it.contact; i++) {
      const e = 1 - Math.abs(i) / it.contact; if (e < 0.08) continue;
      ctx.fillStyle = `rgba(36,30,40,${0.42 * Math.min(1, e * 2.5)})`; ctx.fillRect(it.x + i, it.y - 1, 1, e > 0.35 ? 3 : 2);
    }
    const sh = document.createElement("canvas"); sh.width = this.cw; sh.height = this.ch;
    const s = sh.getContext("2d"); s.imageSmoothingEnabled = false;
    const day = DAY.on && DAY.len > 0, fx = day ? DAY.fall[0] : 0.93, fy = day ? DAY.fall[1] : 0.37, len = MODE === "night" ? 0.35 : day ? DAY.len : 0.6;
    const [r, g, b, a] = DAY.on ? DAY.shade : [42, 28, 44, 0.3];
    for (const it of this.items) {
      if (!it.shade) continue;
      const sil = silhouette(it.spr.cv, `rgb(${r},${g},${b})`), { ox, oy } = it.spr, L = len * it.shade, foot = !it.legacy && it.spr.foot;
      if (foot) {
        // a wall or fence on a slope: each column's shadow starts at that column's own foot
        for (let u = 0; u < sil.width; u++) { const gv = foot(u); s.setTransform(1, 0, -fx * L, -fy * L, it.x - ox + fx * L * gv, it.y + (gv - oy) + fy * L * gv); s.drawImage(sil, u, 0, 1, sil.height, u, 0, 1, sil.height); }
      } else { s.setTransform(1, 0, -fx * L, -fy * L, it.x - ox + fx * L * oy, it.y + fy * L * oy); s.drawImage(sil, 0, 0); }
    }
    s.setTransform(1, 0, 0, 1, 0, 0);
    // round 3: the contact line. Under every column whose lowest pixel stands on the ground (within 3 px of the
    // foot), a dark earth line, and a softer pixel on the side away from the sun: nothing floats
    const cx = fx >= 0 ? 1 : -1;
    for (const it of this.items) {
      if (!it.ground) continue;
      const bot = bottoms(it.spr), { ox, oy } = it.spr, foot = it.spr.foot;
      for (let u = 0; u < bot.length; u++) {
        const v = bot[u]; if (v < 0) continue; const gv = foot ? foot(u) : oy; if (v < gv - 3 || v > gv + 3) continue;
        const X = it.x - ox + u, Y = it.y - oy + v;
        ctx.fillStyle = "rgba(30,24,30,0.5)"; ctx.fillRect(X, Y + 1, 1, 1);
        ctx.fillStyle = "rgba(30,24,30,0.24)"; ctx.fillRect(X + cx, Y + 2, 1, 1);
        if (bot[u - 1] === undefined || bot[u - 1] < 0) ctx.fillRect(X - 1, Y + 1, 1, 1);
        if (bot[u + 1] === undefined || bot[u + 1] < 0) { ctx.fillStyle = "rgba(30,24,30,0.4)"; ctx.fillRect(X + 1, Y + 1, 1, 1); }
      }
    }
    ctx.globalAlpha = Math.min(0.62, a * 1.55) * (MODE === "night" ? 0.6 : 1); ctx.drawImage(sh, 0, 0); ctx.globalAlpha = 1;
    // the pieces on their own layer (so the night can shade them less than the land)
    const lay = document.createElement("canvas"); lay.width = this.cw; lay.height = this.ch;
    const lc = lay.getContext("2d"); lc.imageSmoothingEnabled = false;
    this.items.sort((p, q) => p.sort - q.sort);
    for (const it of this.items) lc.drawImage(it.spr.cv, it.x - it.spr.ox, it.y - it.spr.oy);
    if (MODE === "night") {
      // the land's night (the Blood Moon's two layers, with a blue Greenwood night in place of its red)
      nightShade(ctx, 1);
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      clearLamps(); this.noteAll(); swapLamps(); drawLampPools(ctx, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      nightShade(lc, 1, true);
    }
    ctx.drawImage(lay, 0, 0);
    // lit windows and flames stay lit
    if (MODE !== "noon") {
      const k = MODE === "night" ? 1 : 0.55;
      for (const it of this.items) for (const [wx, wy, ww, wh] of it.spr.lights ?? []) {
        const x0 = it.x + wx, y0 = it.y + wy;
        for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) { ctx.fillStyle = j === 0 ? `rgba(240,160,70,${k})` : `rgba(255,214,130,${k})`; ctx.fillRect(x0 + i, y0 + j, 1, 1); }
      }
    }
    if (MODE === "night") {
      ctx.setTransform(2, 0, 0, 2, 0, 0); this.noteAll(); drawLampBloom(ctx, t); swapLamps(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else if (MODE === "golden") {
      ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.globalAlpha = 0.45; this.noteAll(0.6); drawLampBloom(ctx, t); swapLamps(); ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }
  noteAll(k = 1) { for (const [x, y, r, col, gr] of this.lamps) noteLamp(x / 2, y / 2, r / 2, col, k, gr / 2); }
}
// the night's shade, multiplied: dithered steps of a deep blue, lighter toward the upper left (the moon)
const nightShade = (c, a, atop) => {
  const w = c.canvas.width, h = c.canvas.height, sh = document.createElement("canvas"); sh.width = w >> 1; sh.height = h >> 1;
  const s = sh.getContext("2d"), img = s.createImageData(sh.width, sh.height), d = img.data, BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let j = 0; j < sh.height; j++) for (let i = 0; i < sh.width; i++) {
    const rr = Math.min(1, Math.hypot(i / sh.width, j / sh.height) / 1.3), b = (BY[(j & 3) * 4 + (i & 3)] + 0.5) / 16 - 0.5;
    const ls = Math.round(Math.max(0, Math.min(1, 0.55 + 0.4 * rr + b * 0.12)) * 6), o = (j * sh.width + i) * 4;
    d[o] = 32; d[o + 1] = 36; d[o + 2] = 80; d[o + 3] = Math.round([0, 0.3, 0.42, 0.54, 0.66, 0.78, 0.9][ls] * 255);
  }
  s.putImageData(img, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  let orig = null;
  if (atop) { orig = document.createElement("canvas"); orig.width = w; orig.height = h; orig.getContext("2d").drawImage(c.canvas, 0, 0); }
  c.globalAlpha = a; c.globalCompositeOperation = "multiply"; c.drawImage(sh, 0, 0, w, h);
  if (atop) { c.globalAlpha = 1; c.globalCompositeOperation = "destination-in"; c.drawImage(orig, 0, 0); }
  c.restore();
};

// ---- ground work in the vale's colours -----------------------------------------------------------------
const SOIL = ["#5a3e28", "#6e4c30", "#83603e"], LEAF = ["#4f8a2c", "#6aa83a", "#9ac850"];
const YARD = ["#8e8a44", "#a8885a", "#bc9c6c", "#8a6e46"], SAND = ["#c4ae7a", "#b49a6a", "#c8b488", "#a8906a"];
const glowGround = (ctx, x, y, r, col, a) => { for (let j = -r; j <= r; j++) for (let i = -r * 1.6; i <= r * 1.6; i++) { const d = Math.hypot(i / 1.6, j) / r; if (d > 1) continue; const s = d < 0.4 ? 3 : d < 0.7 ? 2 : 1; if (s === 1 && (i + j) % 2) continue; ctx.fillStyle = `rgba(${col},${a * s / 3})`; ctx.fillRect(Math.round(x + i), Math.round(y + j), 1, 1); } };
// the terrace's ground: the lifted land a step lighter above the lip, its foot in a shade band (C's, kept small)
const terraceGround = (S, lx0, lx1, ly, hgt, o = {}) => (c) => {
  const [x0, y0] = S.P(lx0, ly), x1 = S.P(lx1, ly)[0];
  for (let i = x0; i < x1; i++) {
    const e = Math.min(1, (i - x0) / 30, (x1 - i) / 30);
    for (let j = 0; j < 16 * e; j++) if (hash(i, j + 3) < 0.9 - j * 0.05) px1(c, i, y0 + j - 2, j < 6 ? "#3e6a24" : "#4a7a2c");
  }
  if (o.lift !== false) { c.fillStyle = "rgba(255,244,190,0.09)"; c.fillRect(x0 + 10, y0 - hgt - 4 - (o.liftH ?? 120), x1 - x0 - 20, (o.liftH ?? 120)); }
};

// ======================================================================================================
// THE BOARDS: Gullwick (ledges and walls present) and Millrace (nearly none). Variations:
//   1 THE CROFT   one big cottage, its garden and well; one low ledge; the old tower; the rock landmark
//   2 THE FARM    cottage + barn + hen house round a yard; two ledges; the tower and the hunters' camp
//   3 THE HAMLET  the Crown and Goblin (a jettied inn with its sign), a smithy, a cottage; one short ledge;
//                 the roofless chapel in place of the tower
// Coordinates are board units inside the 420 x 280 patch (lx, ly).
// ======================================================================================================
export const KEEP2 = /tree|pine|spruce|willow|oak|birch|watermill/;
export const SCENES2 = {
  gw: { realm: "gullwick", faction: "greenwood", crop: [315, 160], halls: [["archer", 555, 300, 2], ["knight", 470, 250, 2]], wave: 6, at: 12 },
  mr: { realm: "millrace", faction: "greenwood", crop: [320, 0], halls: [["archer", 470, 215, 2], ["knight", 600, 300, 1]], wave: 6, at: 12 },
};
for (const [k, v] of Object.entries(SCENES2)) v.id = k;

// pieces shared by the boards
// a fence along points (board units relative to lx, ly): each segment placed at its own foot so every post and
// its shadow stand where they are; o.gate = [segment, t0, t1] hangs a field gate in that segment
const fenceRun = (S, pts, lx, ly, seed = 8, o = {}) => {
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], dx = bx - ax, dy = by - ay;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const go = o.gate && o.gate[0] === s ? { gate: [0, o.gate[1], o.gate[2]] } : {};
      S.add(fence([[0, 0], [dx, dy]], seed + s, { h: o.h ?? 9, gap: o.gap ?? 9, ...go }), lx + ax / 2, ly + ay / 2);
    } else {
      const n = Math.max(1, Math.round(Math.abs(dy) / (o.gap ?? 9)));
      const yf = Math.max(ay, by), yb = Math.min(ay, by);
      S.add(fence([[0, yb - yf], [0.01, 0]], seed + s, { h: o.h ?? 9, noPosts: true }), lx + ax / 2, ly + yf / 2, { shade: 0, dy: 1 });
      for (let k = 1; k < n; k++) S.add(post(o.h ?? 9, seed + k), lx + ax / 2, ly + lerp(ay, by, k / n) / 2);
      if (s === pts.length - 2) S.add(post(o.h ?? 9, seed + 40), lx + bx / 2, ly + by / 2);
    }
  }
};
const rockGroup = (S, lx, ly, k = 1, seed = 1, fam = "limestone") => {
  S.add(rockMass(Math.round(70 * k), fam, seed), lx, ly);
  S.add(rockMass(Math.round(30 * k), fam, seed + 1), lx + 34 * k, ly + 4);
  S.add(rockMass(Math.round(16 * k), fam, seed + 2), lx - 30 * k, ly + 5);
  S.add(rockMass(7, fam, seed + 3), lx + 50 * k, ly + 8); S.add(rockMass(5, fam, seed + 4), lx - 42 * k, ly + 9);
};
const kerbRun = (S, lx0, lx1, ly, skip = []) => {
  for (let k = 0, lx = lx0; lx < lx1; k++) {
    const r = hash(k, 7), w = 5 + Math.floor(r * 5), sunk = hash(k, 9);
    lx += w * 0.5 + 2 + (hash(k, 11) > 0.8 ? 14 : 0);
    if (!skip.some(([a, b]) => lx > a && lx < b)) S.add(kerb(w, sunk, r), lx, ly, { road: true, shade: 0.5 });
    lx += w * 0.5;
  }
};
const ledgeRun = (n, wob, seed, x0 = -82) => { const p = []; for (let k = 0; k <= n; k++) p.push([x0 + k * 10, Math.sin(k * 0.7 + seed) * wob]); return p; };
const strand = (S, t, o = {}) => {
  S.onGround((c) => { const [x, y] = S.P(378, 266); worn(c, x, y, 44, 9, SAND, 6, 1.5); });
  S.add(netRack(44, t), 366, 264, { road: true }); S.add(creels(), 392, 266, { road: true });
  S.add(boat(56, 6, { paint: M.red }), 408, 277, { road: true });
  // a limestone shelf running into the sand, flat beds
  if (o.shelf !== false) { S.add(rockMass(40, "limestone", 61, { flat: 0.45, skirt: false }), 340, 276, { road: true }); S.add(rockMass(14, "limestone", 62, { flat: 0.5, skirt: false }), 318, 279, { road: true }); }
  S.add(lampPost(20), 382, 262, { road: true });
};
const wayside = (S, t) => {
  S.onGround((c) => { const [x, y] = S.P(56, 176); worn(c, x, y, 24, 7, YARD, 7, 1.5); });
  S.add(shrine2(), 52, 174); S.add(fingerpost2(t), 76, 180); S.add(bench(), 36, 180);
};

const OPTIONS2 = {
  gw: {
    1: (S, t) => {
      // THE CROFT: one cottage the size of a hall, its yard, garden, well and washing; one ledge
      S.onGround((c) => {
        let [x, y] = S.P(378, 100); worn(c, x, y, 54, 13, YARD, 4, 2.2);
        path(c, [S.P(362, 104), S.P(348, 108), S.P(336, 110)], 5, YARD, 5);
        [x, y] = S.P(344, 118); plot(c, x, y, 76, 26, SOIL, LEAF, 3);
      });
      S.onGround(terraceGround(S, 336, 424, 150, 24));
      S.add(ledge(ledgeRun(9, 2, 1, -46), 24, 4, { bands: 3, taper: 24 }), 381, 150, { dy: -14 });
      S.add(house({ hw: 36, wall: 26, apex: 24, D: 32, roof: "thatch", frame: true, door: [6, 9, 14, V.door], windows: [[-28, -18, 8, 7, { shutter: V.door, box: true }], [22, -18, 8, 7, { box: true }]], lamps: [[-2, -19, -1]], butt: true, bench: -30, chim: -12, seed: 5 }), 380, 96);
      S.add(smoke(t), 374, 54, { shade: 0, dy: 300 });
      fenceRun(S, [[0, 0], [78, 0], [78, 30], [0, 30], [0, 8]], 342, 116, 8, { gate: [2, 0.4, 0.62] });
      S.add(well2(t), 410, 106);
      for (let k = 0; k < 5; k++) S.add(hen3(t, k, k === 2 ? V.henB : k === 4 ? V.henR : V.hen), 352 + (k * 11) % 40, 102 + (k * 5) % 9, { shade: 0.5 });
      S.add(cat(t), 362, 99, { shade: 0.5 });
      S.add(washing(t), 360, 64);
      // the old tower below the ledge, deer grazing under it
      S.add(oldTower(24, 124, 12), 392, 226);
      S.add(doe(t, 1), 358, 232, { shade: 0.6 }); S.add(doe(t, 2), 344, 238, { shade: 0.6 });
      S.add(rockMass(24, "limestone", 21), 352, 154); S.add(rockMass(9, "limestone", 22), 366, 158);
      // the landmark rock group on the field's corner, the drystone wall on the contour, a stile where the path crosses
      rockGroup(S, 96, 176, 1, 31, "granite");
      S.add(dryWall([[-70, 0], [-40, -6], [-14, -8]], 11, 3, { gaps: 0.03, m: M.stoneW }), 92, 128); S.add(stile(), 86, 122); S.add(dryWall([[0, -9], [24, -12], [54, -16]], 11, 4, { gaps: 0.03, m: M.stoneW }), 92, 128);
      kerbRun(S, 160, 262, 184);
      wayside(S, t);
      strand(S, t);
    },
    2: (S, t) => {
      // THE FARM: cottage, barn and hen house round a trodden yard; two ledges step the castle's strip
      S.onGround((c) => {
        let [x, y] = S.P(380, 94); worn(c, x, y, 62, 15, YARD, 4, 2.4);
        path(c, [S.P(362, 104), S.P(350, 104), S.P(336, 106)], 5, YARD, 5);
        path(c, [S.P(404, 104), S.P(408, 116), S.P(410, 128)], 3, YARD, 6);
        [x, y] = S.P(346, 114); plot(c, x, y, 52, 18, SOIL, LEAF, 3);
        [x, y] = S.P(388, 202); worn(c, x, y, 30, 9, YARD, 8, 1.5);
      });
      S.onGround(terraceGround(S, 336, 424, 142, 26)); S.onGround(terraceGround(S, 330, 424, 248, 20, { liftH: 90 }));
      S.add(ledge(ledgeRun(9, 2, 1, -46), 26, 4, { bands: 3, taper: 24 }), 381, 142, { dy: -14 });
      S.add(ledge(ledgeRun(10, 2, 3, -56), 20, 6, { bands: 2, taper: 30 }), 381, 248, { dy: -14 });
      S.add(house({ hw: 30, wall: 28, apex: 26, D: 36, roof: "thatch", walls: "boards", frame: false, door: [-8, 16, 20, V.hole], windows: [], gableWin: false, chim: false, seed: 9 }), 354, 74);
      S.add(house({ hw: 32, wall: 24, apex: 22, D: 30, roof: "tile", frame: true, door: [5, 8, 13, V.doorR], windows: [[-25, -17, 8, 7, { box: true }], [19, -17, 7, 7]], lamps: [[-2, -18, -1]], butt: true, chim: 10, seed: 6 }), 401, 84);
      S.add(smoke(t), 406, 44, { shade: 0, dy: 300 });
      S.add(henhouse(), 344, 102);
      S.add(well2(t), 378, 108);
      S.add(haystack(11, 2), 416, 118); S.add(haystack(8, 3), 405, 124);
      for (let k = 0; k < 6; k++) S.add(hen3(t, k, k === 2 ? V.henB : k === 4 ? V.henR : V.hen), 360 + (k * 11) % 34, 96 + (k * 5) % 9, { shade: 0.5 });
      S.add(cat(t), 392, 87, { shade: 0.5 });
      // the kitchen garden, fenced, its gate toward the yard
      fenceRun(S, [[0, 0], [56, 0], [56, 22], [0, 22], [0, 0]], 344, 112, 8, { gate: [2, 0.55, 0.8], h: 8 });
      S.add(woodpile(5), 333, 80);
      // the old tower and the hunters' camp under it, the deer they watch for
      S.add(oldTower(24, 124, 12), 396, 222);
      S.add(tent(26, 18, 7, { c1: M.canvas }), 366, 206); S.add(campfire(t), 378, 214, { shade: 0 }); S.add(woodpile(5), 356, 216);
      S.add(rockMass(30, "limestone", 23), 352, 148); S.add(rockMass(12, "limestone", 24), 370, 152); S.add(rockMass(18, "limestone", 25), 346, 252);
      rockGroup(S, 96, 176, 1, 31);
      S.add(doe(t, 1), 150, 150, { shade: 0.6 }); S.add(doe(t + 1, 2), 166, 156, { shade: 0.6 });
      S.add(dryWall([[-70, 0], [-40, -6], [-14, -8]], 11, 3, { gaps: 0.03, m: M.stoneW }), 92, 128); S.add(stile(), 86, 122); S.add(dryWall([[0, -9], [24, -12], [54, -16]], 11, 4, { gaps: 0.03, m: M.stoneW }), 92, 128);
      kerbRun(S, 160, 262, 184);
      wayside(S, t);
      strand(S, t);
    },
    3: (S, t) => {
      // THE HAMLET: the inn with its sign and lanterns, the smithy's open forge, a cottage; the chapel ruin
      S.onGround((c) => {
        let [x, y] = S.P(380, 104); worn(c, x, y, 50, 46, YARD, 4, 2.2);
        path(c, [S.P(358, 92), S.P(346, 96), S.P(336, 98)], 6, YARD, 5);
      });
      S.onGround(terraceGround(S, 360, 424, 176, 20, { liftH: 70 }));
      S.add(ledge(ledgeRun(6, 2, 2, -30), 20, 5, { bands: 2, taper: 20 }), 392, 176, { dy: -14 });
      S.add(house({ hw: 34, wall: 36, jetty: 17, apex: 24, D: 32, roof: "tile", frame: true, studs: [-0.15, 0.3], door: [-14, 9, 13, V.doorR], windows: [[2, -14, 8, 7, { box: true }], [-26, -30, 8, 7], [12, -30, 8, 7, { box: true }]], lamps: [[-16, -17, -1]], sign: 46, bench: 14, barrels: 0, chim: -14, chimH: 4, seed: 7 }), 386, 64);
      S.add(smoke(t), 379, 15, { shade: 0, dy: 300 });
      S.add(house({ hw: 26, wall: 22, apex: 18, D: 28, roof: "slate", walls: "rubble", frame: false, door: false, forge: [-20, 24, 18], windows: [], gableLit: false, chim: 8, chimH: 8, seed: 8 }), 356, 122);
      S.add(smoke(t + 2), 360, 82, { shade: 0, dy: 300 });
      S.add(house({ hw: 26, wall: 22, apex: 20, D: 28, roof: "thatch", walls: "ochre", door: [3, 7, 12, V.door], windows: [[-19, -16, 7, 6, { box: true }]], lamps: [[-2, -16, -1]], chim: -8, seed: 4 }), 404, 128);
      S.add(well2(t), 388, 152);
      S.add(lampPost(22), 348, 100);
      for (let k = 0; k < 4; k++) S.add(hen3(t, k, k === 1 ? V.henB : k === 4 ? V.henR : V.hen), 398 + (k * 7) % 20, 150 + (k * 3) % 6, { shade: 0.5 });
      S.add(cat(t), 372, 66, { shade: 0.5 });
      S.add(sprite(40, 24, (px) => { for (let k = 0; k < 3; k++) { const x = -10 + k * 8; px.part().ellipse(x, -4.5, 3.4, 4.5, V.wood, 2 + k * 0.01, { round: 0.9 }); px.toneLine(x - 3, -6, x + 3, -6, -1); px.toneLine(x - 3, -3, x + 3, -3, -1); } }, 3), 418, 70);
      // the roofless chapel below the ledge, deer in its lee
      S.add(chapel(41, { lamp: true }), 388, 238);
      S.add(doe(t, 1), 350, 226, { shade: 0.6 });
      S.add(rockMass(22, "limestone", 26), 368, 182);
      rockGroup(S, 100, 178, 0.75, 33, "granite");
      S.add(dryWall([[-70, 0], [-40, -6], [-14, -8]], 11, 3, { gaps: 0.03, m: M.stoneW }), 92, 128); S.add(fieldGate(), 85, 122); S.add(dryWall([[0, -9], [24, -12], [54, -16]], 11, 4, { gaps: 0.03, m: M.stoneW }), 92, 128);
      wayside(S, t);
      strand(S, t, { shelf: false });
    },
  },
  mr: {
    2: (S, t) => {
      // MILLRACE, THE FARM BY THE STREAM: no ledges; the farm on the Foxwater's east bank, a paddock, a boulder or two
      S.onGround((c) => {
        let [x, y] = S.P(268, 62); worn(c, x, y, 46, 14, YARD, 4, 2.2);
        path(c, [S.P(290, 72), S.P(304, 84), S.P(312, 94)], 5, YARD, 5);
        [x, y] = S.P(236, 98); plot(c, x, y, 56, 22, SOIL, LEAF, 3);
      });
      S.add(house({ hw: 30, wall: 28, apex: 26, D: 36, roof: "thatch", walls: "boards", door: [-8, 16, 20, V.hole], windows: [], gableWin: false, chim: false, seed: 9 }), 248, 44);
      S.add(house({ hw: 32, wall: 24, apex: 22, D: 30, roof: "tile", frame: true, door: [5, 8, 13, V.doorR], windows: [[-25, -17, 8, 7, { box: true }], [19, -17, 7, 7]], lamps: [[-2, -18, -1]], butt: true, chim: 10, seed: 6 }), 290, 58);
      S.add(smoke(t), 295, 18, { shade: 0, dy: 300 });
      S.add(well2(t), 266, 84); S.add(henhouse(), 232, 76);
      for (let k = 0; k < 5; k++) S.add(hen3(t, k, k === 2 ? V.henB : k === 4 ? V.henR : V.hen), 240 + (k * 9) % 30, 80 + (k * 5) % 9, { shade: 0.5 });
      fenceRun(S, [[0, 0], [60, 0], [60, 26], [0, 26], [0, 0]], 234, 96, 8, { gate: [0, 0.6, 0.85], h: 8 });
      S.add(washing(t), 300, 120);
      S.add(haystack(11, 2), 372, 40); S.add(haystack(8, 3), 386, 48); S.add(haystack(10, 4), 360, 60);
      fenceRun(S, [[0, 0], [70, 0]], 345, 80, 9, { h: 8, gap: 12 }); S.add(woodpile(5), 226, 56);
      rockGroup(S, 388, 246, 0.6, 43, "granite");
      S.add(doe(t, 1), 360, 228, { shade: 0.6 }); S.add(doe(t + 1, 2), 344, 236, { shade: 0.6 });
      S.add(lampPost(20), 316, 98);
    },
    3: (S, t) => {
      // MILLRACE, THE HAMLET BY THE STREAM: the inn by the bridge-road, the smithy, a cottage; no ledges
      S.onGround((c) => { let [x, y] = S.P(270, 80); worn(c, x, y, 48, 40, YARD, 4, 2.2); path(c, [S.P(296, 88), S.P(312, 92)], 6, YARD, 5); });
      S.add(house({ hw: 34, wall: 36, jetty: 17, apex: 24, D: 32, roof: "tile", frame: true, studs: [-0.15, 0.3], door: [-14, 9, 13, V.doorR], windows: [[2, -14, 8, 7, { box: true }], [-26, -30, 8, 7], [12, -30, 8, 7, { box: true }]], lamps: [[-16, -17, -1]], sign: 46, bench: 14, chim: -14, chimH: 4, seed: 7 }), 276, 56);
      S.add(smoke(t), 269, 7, { shade: 0, dy: 300 });
      S.add(house({ hw: 26, wall: 22, apex: 18, D: 28, roof: "slate", walls: "rubble", door: false, forge: [-20, 24, 18], windows: [], gableLit: false, chim: 8, chimH: 8, seed: 8 }), 246, 128);
      S.add(house({ hw: 26, wall: 22, apex: 20, D: 28, roof: "thatch", door: [3, 7, 12, V.door], windows: [[-19, -16, 7, 6, { box: true }]], lamps: [[-2, -16, -1]], chim: -8, seed: 4 }), 298, 116);
      S.add(well2(t), 262, 98); S.add(lampPost(22), 318, 98);
      S.add(cat(t), 262, 59, { shade: 0.5 });
      for (let k = 0; k < 4; k++) S.add(hen3(t, k, k === 1 ? V.henB : k === 4 ? V.henR : V.hen), 270 + (k * 7) % 20, 104 + (k * 3) % 6, { shade: 0.5 });
      S.add(haystack(11, 2), 372, 40); S.add(haystack(8, 3), 386, 48);
      rockGroup(S, 388, 246, 0.6, 43, "granite");
    },
  },
};

// round 3: the farm is chosen; `farm` names it
OPTIONS2.gw.farm = OPTIONS2.gw[2]; OPTIONS2.mr.farm = OPTIONS2.mr[2];
export const paintDecor2 = (ctx, sc, opt, o = {}) => {
  MODE = o.mode ?? "noon";
  const fn = OPTIONS2[sc.id]?.[opt];
  if (!fn) return;
  const S = new Scene2(ctx, sc.crop);
  fn(S, o.frame ?? 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 738 * 2, ctx.canvas.height); ctx.clip();
  S.render(o.time ?? 0);
  ctx.restore();
};
// a whole board at night with no option painted (today, at night): the shade only
export const nightOnly = (ctx) => nightShade(ctx, 1);

// ======================================================================================================
// CLOSE-UP SHEETS on the board's own grass (a 210 x 140 board patch, shown at 4x)
// ======================================================================================================
const label = (c, x, y, s) => { c.font = "bold 9px monospace"; c.fillStyle = "rgba(20,16,24,0.8)"; c.fillText(s, x + 1, y + 1); c.fillStyle = "#f4ecd8"; c.fillText(s, x, y); };
const SHEETS = {
  rocks: (S, c) => {
    // the round-1 boulder that pointed at the camera, then the new rule's ladder in two families
    S.add(boulder(16, 5, { grass: true }), 18, 58, { road: true });
    const xs = [[4, 46], [8, 58], [14, 74], [24, 98], [42, 132], [70, 182]];
    for (const [s, x] of xs) S.add(rockMass(s, "limestone", 100 + s), x, 60, { road: true });
    for (const [s, x] of xs) S.add(rockMass(s, "granite", 200 + s), x, 128, { road: true });
    S.label = [[4, 10, "ROUND 1"], [44, 10, "LIMESTONE: flat tops, straight beds, grikes"], [44, 78, "GRANITE: rounded loaves, few joints, speckle"]];
  },
  build: (S, c, t) => {
    S.add(house({ hw: 36, wall: 26, apex: 24, D: 32, roof: "thatch", frame: true, door: [6, 9, 14, V.door], windows: [[-28, -18, 8, 7, { shutter: V.door, box: true }], [22, -18, 8, 7, { box: true }]], lamps: [[-2, -19, -1]], butt: true, bench: -30, chim: -12, seed: 5 }), 30, 62, { road: true });
    S.add(house({ hw: 30, wall: 28, apex: 26, D: 36, roof: "thatch", walls: "boards", door: [-8, 16, 20, V.hole], windows: [], gableWin: false, chim: false, seed: 9 }), 82, 62, { road: true });
    S.add(house({ hw: 32, wall: 24, apex: 22, D: 30, roof: "tile", frame: true, door: [5, 8, 13, V.doorR], windows: [[-25, -17, 8, 7, { box: true }], [19, -17, 7, 7]], lamps: [[-2, -18, -1]], butt: true, chim: 10, seed: 6 }), 132, 62, { road: true });
    S.add(henhouse(), 170, 60, { road: true }); S.add(well2(t), 192, 62, { road: true });
    S.add(house({ hw: 34, wall: 36, jetty: 17, apex: 24, D: 32, roof: "tile", frame: true, studs: [-0.15, 0.3], door: [-14, 9, 13, V.doorR], windows: [[2, -14, 8, 7, { box: true }], [-26, -30, 8, 7], [12, -30, 8, 7, { box: true }]], lamps: [[-16, -17, -1]], sign: 46, bench: 14, chim: -14, chimH: 4, seed: 7 }), 30, 132, { road: true });
    S.add(house({ hw: 26, wall: 22, apex: 18, D: 28, roof: "slate", walls: "rubble", door: false, forge: [-20, 24, 18], windows: [], gableLit: false, chim: 8, chimH: 8, seed: 8 }), 88, 132, { road: true });
    S.add(house({ hw: 26, wall: 22, apex: 20, D: 28, roof: "thatch", walls: "ochre", door: [3, 7, 12, V.door], windows: [[-19, -16, 7, 6, { box: true }]], lamps: [[-2, -16, -1]], chim: -8, seed: 4 }), 130, 132, { road: true });
    S.add(shrine2(), 160, 130, { road: true }); S.add(fingerpost2(t), 176, 132, { road: true }); S.add(lampPost(22), 192, 132, { road: true }); S.add(campfire(t), 202, 132, { road: true });
    S.label = [[4, 10, "CROFT"], [66, 10, "BARN"], [114, 10, "FARMHOUSE (tile)"], [160, 10, "HENS, WELL"], [4, 80, "THE INN"], [70, 80, "SMITHY"], [112, 80, "COTTAGE"], [156, 80, "SHRINE, LAMPS, FIRE"]];
  },
  ruins: (S, c) => {
    S.add(oldTower(24, 124, 12), 40, 112, { road: true });
    S.add(chapelGable(41), 108, 112, { road: true });
    S.onGround(terraceGround(S, 150, 212, 124, 22, { liftH: 60 }));
    S.add(ledge(ledgeRun(6, 2, 1, -30), 22, 4, { bands: 3, taper: 20 }), 181, 124, { dy: -14, road: true });
    S.add(dryWallOld([[-30, 0], [0, -4], [10, -5]], 11, 3, { m: M.stoneW }), 180, 60, { road: true, legacy: true }); S.add(stile(), 194, 55, { road: true });
    S.add(fieldGate(), 168, 76, { road: true });
    kerbRun(S, 140, 210, 136);
    S.label = [[4, 10, "THE OLD TOWER (A, polished)"], [80, 10, "ROOFLESS CHAPEL"], [144, 10, "WALL, GATE, LEDGE, KERB"]];
  },
  // ---- ROUND 3 sheets ----
  // the farm's pieces at 4x, every one standing in the turf
  build2: (S, c, t) => {
    S.add(house({ hw: 30, wall: 28, apex: 26, D: 36, roof: "thatch", walls: "boards", door: [-8, 16, 20, V.hole], windows: [], gableWin: false, chim: false, seed: 9 }), 28, 62, { road: true });
    S.add(house({ hw: 32, wall: 24, apex: 22, D: 30, roof: "tile", frame: true, door: [5, 8, 13, V.doorR], windows: [[-25, -17, 8, 7, { box: true }], [19, -17, 7, 7]], lamps: [[-2, -18, -1]], butt: true, chim: 10, seed: 6 }), 82, 62, { road: true });
    S.add(house({ hw: 36, wall: 26, apex: 24, D: 32, roof: "thatch", frame: true, door: [6, 9, 14, V.door], windows: [[-28, -18, 8, 7, { shutter: V.door, box: true }], [22, -18, 8, 7, { box: true }]], lamps: [[-2, -19, -1]], butt: true, bench: -30, chim: -12, seed: 5 }), 138, 62, { road: true });
    S.add(henhouse(), 178, 58, { road: true }); S.add(well2(t), 198, 62, { road: true });
    S.onGround((cx) => { const [x, y] = S.P(8, 106); plot(cx, x, y, 56, 20, SOIL, LEAF, 3); });
    fenceRun(S, [[0, 0], [60, 0], [60, 24], [0, 24], [0, 0]], 6, 104, 8, { gate: [2, 0.55, 0.8], h: 8 });
    S.add(haystack(11, 2), 48, 128, { road: true }); S.add(haystack(8, 3), 60, 132, { road: true });
    for (let k = 0; k < 5; k++) S.add(hen3(t + k * 0.4, k, k === 1 ? V.henB : k === 3 ? V.henR : V.hen), 70 + (k * 7) % 22, 112 + (k * 5) % 9, { shade: 0.5, road: true });
    S.add(cat(t), 96, 118, { shade: 0.5, road: true });
    S.add(doe(t, 1), 104, 132, { shade: 0.6, road: true }); S.add(doe(t + 1, 2), 124, 134, { shade: 0.6, road: true });
    S.add(woodpile(5), 142, 132, { road: true });
    S.add(shrine2(), 160, 130, { road: true }); S.add(fingerpost2(t), 174, 132, { road: true }); S.add(lampPost(22), 186, 132, { road: true });
    S.add(washing(t), 158, 102, { road: true }); S.add(tent(26, 18, 7, { c1: M.canvas }), 196, 104, { road: true });
    S.label = [[4, 8, "BARN"], [62, 8, "FARMHOUSE"], [114, 8, "CROFT"], [168, 8, "HENS, WELL"], [4, 78, "GARDEN, STACKS, HENS, CAT, DEER"], [140, 78, "WOOD, SHRINE, POST, LAMP, TENT"]];
  },
  // the redone ruins: the old tower, the new chapel at 4x, the walls and fences with their feet
  ruins2: (S, c) => {
    S.add(oldTower(24, 124, 12), 28, 82, { road: true });
    S.add(chapel(41), 98, 82, { road: true });
    S.add(dryWall([[-32, 0], [0, -4], [18, -6]], 11, 3, { m: M.stoneW }), 168, 34, { road: true }); S.add(stile(), 178, 30, { road: true });
    S.add(dryWall([[-26, 0], [26, 0]], 9, 5, { m: M.stoneW }), 166, 52, { road: true });
    fenceRun(S, [[0, 0], [56, 0]], 150, 68, 9, { gate: [0, 0.35, 0.65] });
    kerbRun(S, 144, 210, 84);
    S.label = [[4, 7, "THE OLD TOWER"], [62, 7, "THE CHAPEL (round 3)"], [146, 7, "WALL, FENCE, KERB"]];
  },
  chapelOne: (S) => { S.add(chapel(41, { lamp: true }), 50, 80, { road: true }); S.label = []; },
  boardSize: (S) => {
    S.add(chapelGable(41), 26, 92, { road: true, legacy: true });
    S.add(chapel(41, { lamp: true }), 94, 92, { road: true });
    S.add(oldTower(24, 124, 12), 162, 92, { road: true });
    S.add(dryWall([[-30, 0], [0, -3], [26, -4]], 11, 3, { m: M.stoneW }), 186, 100, { road: true });
    S.label = [];
  },
  // before / after: the wall, the fence and the chapel
  fixes: (S) => {
    S.add(dryWallOld([[-30, 0], [0, -4], [10, -5]], 11, 3, { m: M.stoneW }), 26, 36, { road: true, legacy: true });
    S.add(dryWall([[-30, 0], [0, -4], [10, -5]], 11, 3, { m: M.stoneW }), 26, 74, { road: true });
    S.add(fenceOld([[0, 0], [40, 0], [40, 16]], 8, { h: 9, gap: 9 }), 50, 28, { road: true, legacy: true });
    fenceRun(S, [[0, 0], [40, 0], [40, 16]], 50, 66, 8);
    S.add(chapelGable(41), 106, 84, { road: true, legacy: true });
    S.add(chapel(41), 166, 84, { road: true });
    S.label = [[2, 7, "WALL + FENCE: BEFORE"], [2, 48, "AFTER"], [90, 7, "CHAPEL: BEFORE"], [140, 7, "AFTER"]];
  },
};
export const paintSheet = (ctx, kind, o = {}) => {
  MODE = o.mode ?? "noon";
  const S = new Scene2(ctx, [0, 0]);
  SHEETS[kind](S, ctx, o.frame ?? 0);
  S.render(0);
  return S.label ?? [];
};
export { label };
