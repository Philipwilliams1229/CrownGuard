// ============ PAINT KIT ============
// The soft, rounded, outline-free shape language the whole board is being
// rebuilt in: everything is a lit form, not a stack of squares. One sun (up
// and to the left), warm highlights, cool-dark shadows, and gradients doing
// the work an inked outline used to do.
//
// Every routine here takes WORLD units — the render buffer is scaled up
// underneath, so a 2px pebble comes out with real curved edges at any zoom.

// Where the light comes from, as a direction across the board.
export const SUN = { x: -0.42, y: -0.58 };

// ---- pixel mode ------------------------------------------------------
// The board is pixel art again, at PX art pixels per world unit. Every
// gradient collapses into flat tone bands, sprites get a one-pixel ink
// outline, and shapes snap to the art grid.
export let PX = 2;
export const PIXEL = true;
// The style dials. `line` is the ink outline's thickness in art pixels (0 =
// none); `bands` is how many flat tones a shaded shape gets (0 = keep each
// shape's own stops). The lab pages turn these; the game keeps PX = RES.
export const STYLE = { line: 2, bands: 3, inner: 1 };
export const setStyle = (o) => { Object.assign(STYLE, o); if (o.px) PX = o.px; };
// the lab pages try other densities; the game itself keeps PX = RES
export const setPX = (v) => { PX = v; };
export const INK_LINE = "#241a26";
export const snap = (v) => Math.round(v * PX) / PX;

// Smooth stops → hard bands. Each colour owns the stretch between the
// midpoints to its neighbours, so the darkest and lightest tones survive.
const isHex = (c) => typeof c === "string" && c[0] === "#";
// the colour a smooth gradient would show at t
const sampleStops = (stops, t) => {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
      return mix(c0, c1, t1 > t0 ? (t - t0) / (t1 - t0) : 0);
    }
  }
  return stops[stops.length - 1][1];
};
// Smooth stops → hard bands. With the tones dial set, the gradient is cut
// into that many equal tones; otherwise each colour owns the stretch between
// the midpoints to its neighbours, so the darkest and lightest tones survive.
const bandStops = (stops) => {
  const out = [];
  if (STYLE.bands > 0 && stops.every(([, c]) => isHex(c))) {
    const n = STYLE.bands;
    for (let i = 0; i < n; i++) {
      const c = sampleStops(stops, (i + 0.5) / n);
      out.push([i / n, c], [Math.min(1, (i + 1) / n - 0.0001), c]);
    }
    return out;
  }
  for (let i = 0; i < stops.length; i++) {
    const [t, c] = stops[i];
    const t0 = i === 0 ? 0 : (stops[i - 1][0] + t) / 2;
    const t1 = i === stops.length - 1 ? 1 : (t + stops[i + 1][0]) / 2;
    out.push([t0, c], [Math.min(1, t1 - 0.0001), c]);
  }
  return out;
};
const fillStops = (g, stops) => {
  for (const [t, c] of PIXEL ? bandStops(stops) : stops) g.addColorStop(Math.max(0, Math.min(1, t)), c);
  return g;
};
// A linear gradient (banded in pixel mode). `stops` is [[t, colour], ...].
export const lin = (ctx, x0, y0, x1, y1, stops) => fillStops(ctx.createLinearGradient(x0, y0, x1, y1), stops);
// A radial gradient (banded in pixel mode).
export const rad = (ctx, x0, y0, r0, x1, y1, r1, stops) => fillStops(ctx.createRadialGradient(x0, y0, r0, x1, y1, r1), stops);

// ---- colour ----------------------------------------------------------
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
export const rgb = (c) => {
  if (Array.isArray(c)) return c;
  const h = c.replace("#", "");
  const f = h.length === 3 ? h.split("").map((ch) => ch + ch).join("") : h;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
export const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, t) => {
  const A = rgb(a), B = rgb(b);
  return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
};
// A painter's shade: highlights warm toward sunlight, shadows sink toward a
// deep plum rather than flat black, so the dark side of a thing still has colour.
export const lighten = (c, t) => mix(c, "#fff3d2", t);
export const darken = (c, t) => mix(c, "#2a1c2c", t);
export const rgba = (c, a) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };

// deterministic scatter without touching the terrain's own RNG stream
export const hash = (a, b = 0) => {
  let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

// ---- primitives ------------------------------------------------------
export const ellipse = (ctx, x, y, rx, ry) => {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2);
};

// A radial gradient fitted to an ellipse. `stops` is [[t, colour], ...];
// (fx, fy) is where the gradient's centre sits, in unit space (-1..1).
export const soft = (ctx, x, y, rx, ry, stops, fx = 0, fy = 0, inner = 0) => {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  ctx.fillStyle = rad(ctx, fx, fy, inner, 0, 0, 1, stops);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

// A soft ground shadow. Caller places it already offset away from the sun.
export const shadow = (ctx, x, y, rx, ry, a = 0.28) =>
  soft(ctx, x, y, rx, ry, [[0, `rgba(28,20,30,${a})`], [0.55, `rgba(28,20,30,${a * 0.6})`], [1, "rgba(28,20,30,0)"]]);

// A lit ball (or ellipsoid): bright where the sun touches it, sinking to a
// coloured dark on the far side. The plush look in one call.
export const ball = (ctx, x, y, rx, ry, col, o = {}) => {
  const hi = o.hi ?? 0.55, lo = o.lo ?? 0.5;
  const fx = o.fx ?? SUN.x * 0.62, fy = o.fy ?? SUN.y * 0.62;
  if (PIXEL) {
    soft(ctx, x, y, rx, ry, [[0.1, lighten(col, hi * 0.8)], [0.5, col], [0.92, darken(col, lo * 0.8)]], fx, fy, 0);
    return;
  }
  soft(ctx, x, y, rx, ry, [
    [0, lighten(col, hi)],
    [0.32, lighten(col, hi * 0.35)],
    [0.7, col],
    [1, darken(col, lo)],
  ], fx, fy, 0);
};

// A translucent glow.
export const glow = (ctx, x, y, r, col, a = 0.5) =>
  soft(ctx, x, y, r, r, [[0, rgba(col, a)], [0.5, rgba(col, a * 0.45)], [1, rgba(col, 0)]]);

export const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
};

// A standing cylinder seen from the side: a rounded slab shaded across its
// width, lit on the sun side. Walls, trunks, posts.
export const cylinder = (ctx, x, top, w, h, col, o = {}) => {
  const r = o.r ?? Math.min(3, w / 2);
  roundRect(ctx, x, top, w, h, r);
  ctx.fillStyle = PIXEL
    ? lin(ctx, x, 0, x + w, 0, [[0, lighten(col, o.hi ?? 0.3)], [0.5, col], [0.9, darken(col, (o.lo ?? 0.5) * 0.8)]])
    : lin(ctx, x, 0, x + w, 0, [[0, lighten(col, o.hi ?? 0.3)], [0.28, lighten(col, (o.hi ?? 0.3) * 0.5)], [0.62, col], [1, darken(col, o.lo ?? 0.5)]]);
  ctx.fill();
};

// A plush cone: bows out at the sides, a scalloped hem, lit left-to-right.
// Pine tiers, tent canvas, turret roofs.
export const cone = (ctx, x, top, halfW, h, col, o = {}) => {
  const bottom = top + h;
  const n = o.scallops ?? 3;
  const sag = o.sag ?? 3;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.quadraticCurveTo(x + halfW * 0.6, top + h * 0.55, x + halfW, bottom - sag * 0.5);
  const step = (halfW * 2) / n;
  for (let i = 0; i < n; i++) {
    const x0 = x + halfW - i * step, x1 = x0 - step;
    ctx.quadraticCurveTo((x0 + x1) / 2, bottom + sag, x1, bottom - sag * 0.5);
  }
  ctx.quadraticCurveTo(x - halfW * 0.6, top + h * 0.55, x, top);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, x - halfW, top, x + halfW, bottom, [[0, lighten(col, o.hi ?? 0.42)], [0.42, col], [0.9, darken(col, o.lo ?? 0.48)]]);
  ctx.fill();
};

// A tapered blade — grass, reeds, a willow strand hanging the other way.
export const blade = (ctx, bx, by, tx, ty, w, base, tip, bow = 0.5) => {
  const cx = bx + (tx - bx) * 0.35 + (ty - by) * 0.18 * bow;
  const cy = by + (ty - by) * bow;
  ctx.beginPath();
  ctx.moveTo(bx - w, by);
  ctx.quadraticCurveTo(cx - w * 0.5, cy, tx, ty);
  ctx.quadraticCurveTo(cx + w * 0.5, cy, bx + w, by);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, bx, by, tx, ty, [[0, base], [0.7, tip]]);
  ctx.fill();
};

// A clump of grass: a few blades leaning with the wind, darker at the root.
export const tuft = (ctx, x, y, s, base, tip, seed, o = {}) => {
  const n = o.n ?? 4 + Math.floor(hash(seed, 1) * 3);
  const wind = o.wind ?? 0.25;
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed, i + 2), h2 = hash(seed, i + 40);
    const lean = (h1 - 0.5) * 1.5 + wind;
    const len = (5 + h2 * 6) * s;
    const bx = x + (i - (n - 1) / 2) * 1.5 * s;
    blade(ctx, bx, y, bx + lean * len * 0.6, y - len, 0.9 * s, base, tip, 0.5);
  }
};

// A wildflower: a shadow, a stem, a ring of petals and a warm heart.
export const flower = (ctx, x, y, col, seed, s = 1) => {
  shadow(ctx, x + 1.2, y + 1.2, 3.2 * s, 1.6 * s, 0.22);
  blade(ctx, x, y + 1, x + 0.6 * s, y - 4 * s, 0.6 * s, "#4f7a34", "#78a848", 0.4);
  const petals = 5 + (Math.floor(hash(seed, 3) * 2));
  const r = 1.7 * s;
  const rot = hash(seed, 4) * Math.PI;
  for (let i = 0; i < petals; i++) {
    const a = rot + (i / petals) * Math.PI * 2;
    ball(ctx, x + Math.cos(a) * r * 1.05, y - 4 * s + Math.sin(a) * r * 0.9, r * 0.85, r * 0.7, col, { hi: 0.45, lo: 0.25 });
  }
  ball(ctx, x, y - 4 * s, r * 0.55, r * 0.5, "#f2c744", { hi: 0.5, lo: 0.3 });
};

// A small stone or pebble, half sunk.
export const stone = (ctx, x, y, rx, ry, col) => {
  shadow(ctx, x + rx * 0.35, y + ry * 0.55, rx * 1.2, ry * 0.8, 0.22);
  ball(ctx, x, y, rx, ry, col, { hi: 0.5, lo: 0.5 });
};

// Three tiny leaves — clover in the turf.
export const clover = (ctx, x, y, col, s = 1) => {
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
    ball(ctx, x + Math.cos(a) * 1.3 * s, y + Math.sin(a) * 1.1 * s, 1.25 * s, 1.05 * s, col, { hi: 0.35, lo: 0.3 });
  }
};

// Stroke a polyline with round joins.
export const strokePts = (ctx, pts, width, style) => {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
};

// The same polyline slid sideways by `off` (positive = to the right of travel).
export const offsetPts = (pts, off) => {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[Math.max(0, i - 1)], n = pts[Math.min(pts.length - 1, i + 1)];
    let dx = n[0] - p[0], dy = n[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    out.push([pts[i][0] - dy * off, pts[i][1] + dx * off]);
  }
  return out;
};

// A closed wobbly blob (shorelines, canopies seen from above).
export const blobPath = (ctx, x, y, rx, ry, seed, wobble = 0.12, n = 12) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (hash(seed, i) - 0.5) * 2 * wobble;
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n];
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
  }
  const p0 = pts[0], pl = pts[n - 1];
  ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + pl[0]) / 2 + (p0[0] - pl[0]) / 2, (p0[1] + pl[1]) / 2 + (p0[1] - pl[1]) / 2);
  ctx.closePath();
};

// A lit blob with a wandering edge: the ball, clipped to a blobPath. Rocks,
// leaf masses, anything nature made rather than a mason.
export const blobBall = (ctx, x, y, rx, ry, col, seed, o = {}) => {
  ctx.save();
  blobPath(ctx, x, y, rx, ry, seed, o.wobble ?? 0.16, o.n ?? 10);
  ctx.clip();
  ball(ctx, x, y, rx * 1.12, ry * 1.12, col, o);
  ctx.restore();
};

// Soft stone: block courses drawn as low-contrast seams over a lit slab, so
// a wall reads as masonry without a single hard line.
export const masonry = (ctx, x, top, w, h, col, o = {}) => {
  cylinder(ctx, x, top, w, h, col, { r: o.r ?? 2, hi: o.hi ?? 0.26, lo: o.lo ?? 0.42 });
  const ch = o.course ?? 6, bw = o.block ?? Math.max(6, w / 3);
  ctx.save();
  roundRect(ctx, x, top, w, h, o.r ?? 2);
  ctx.clip();
  ctx.strokeStyle = rgba(darken(col, 0.6), 0.22);
  ctx.lineWidth = 0.8;
  let row = 0;
  for (let cy = top + ch; cy < top + h; cy += ch, row++) {
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); ctx.stroke();
    const off = row % 2 ? bw / 2 : 0;
    for (let bx = x + off; bx < x + w; bx += bw) {
      ctx.beginPath(); ctx.moveTo(bx, cy - ch); ctx.lineTo(bx, cy); ctx.stroke();
    }
  }
  // a few lighter blocks catch the sun
  for (let i = 0; i < Math.floor((w * h) / 140); i++) {
    const hx = x + hash(i, 7) * w, hy = top + hash(i, 9) * h;
    ctx.fillStyle = rgba(lighten(col, 0.5), 0.12);
    roundRect(ctx, hx - bw * 0.4, hy - ch * 0.4, bw * 0.8, ch * 0.75, 1);
    ctx.fill();
  }
  ctx.restore();
};

// ---- sprites ---------------------------------------------------------
// Bake a drawing into an offscreen canvas at art resolution and ink its
// silhouette: every transparent pixel touching a painted one turns to ink.
// `draw(ctx)` paints in world units with (0,0) at the sprite's top-left.
export const inkOutline = (cv, ink = INK_LINE, passes = STYLE.line) => {
  const c = cv.getContext("2d");
  const w = cv.width, h = cv.height;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  // translucent ground shadows are not part of the silhouette
  for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 110 ? 1 : 0;
  const [r, g, b] = rgb(ink);
  // grow the silhouette outward `line` times, inking each new ring
  let ring = solid;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8Array(ring);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (ring[i]) continue;
        const near = (x > 0 && ring[i - 1]) || (x < w - 1 && ring[i + 1]) || (y > 0 && ring[i - w]) || (y < h - 1 && ring[i + w]);
        if (near) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 235; next[i] = 1; }
      }
    }
    ring = next;
  }
  c.putImageData(img, 0, 0);
  return cv;
};

// While a sprite bakes, `part()` can ink each piece of it separately.
let BAKING = null;
export const bakeSprite = (w, h, draw, outline = true) => {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(w * PX);
  cv.height = Math.ceil(h * PX);
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.scale(PX, PX);
  const outer = BAKING;
  BAKING = { w: cv.width, h: cv.height };
  try { draw(c); } finally { BAKING = outer; }
  if (outline && PIXEL && STYLE.line > 0) inkOutline(cv);
  return cv;
};

// One piece of a sprite — a trunk, a leaf lobe, a roof, a limb. While
// baking with the inner dial on, the piece is painted on its own layer,
// given a thin ink edge, and laid over what came before, so lines appear
// wherever pieces meet. Outside a bake it simply paints.
export const part = (ctx, fn) => {
  if (!BAKING || !PIXEL || STYLE.inner <= 0) { fn(ctx); return; }
  const layer = document.createElement("canvas");
  layer.width = BAKING.w; layer.height = BAKING.h;
  const c = layer.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.setTransform(ctx.getTransform());
  fn(c);
  inkOutline(layer, INK_LINE, STYLE.inner);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
};
