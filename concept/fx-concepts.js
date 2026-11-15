// ============ FX CONCEPTS: three directions for the combat effects (2026-11-15) ============
// A "clean" (match the new sprites: tinted one-pixel line, small palettes, few particles),
// B "worked" (layered: embers, smoke, debris, light pooled on the ground, scorch that fades),
// C "bold" (chunky, high contrast, icon-like marks that read on a phone).
// Every painter draws ONE frame at art-pixel resolution (1 px = 1 art pixel; the lab scales x3) onto a
// context whose origin is the anchor (the foe's feet / the blast's centre). No game imports, no DOM at
// load, so scripts/build-fx-concepts.mjs can read ROWS. fx-concepts.html supplies the TODAY cells.
// env: { i, N, t (=i/N, loops), p (=i/(N-1), one-shots), cw, ch, ax, ay, T (foe height), HW (foe half
//        width), ground, foe(frame, variant) -> {cv, ax, ay}, pixels(sprite) -> [[dx, dy, css]] }

const TAU = Math.PI * 2;
export const FIRE = ["#fff3d2", "#f8d868", "#f0a040", "#d8683a", "#9a3a30", "#5a2430"];
const ICE = ["#ffffff", "#d4f2fa", "#9fd4e8", "#62a4cc", "#3a6a98"];
const TOX = ["#e8f8b0", "#b8e050", "#6cb040", "#3c7a38", "#1e4a30"];
const HOLY = ["#fffbe0", "#f8e888", "#e8c45a", "#b8883a", "#6a4a2a"];
const NEC = ["#e4d0fc", "#b890e8", "#8a64c8", "#5a3a8a", "#2e1e4a"];
const WITCH = ["#eaffd0", "#b8f088", "#7cc85c", "#4a9040", "#2a5a34"];
const ARC = ["#fff3d2", "#e4d0fc", "#b890e8", "#8a64c8", "#5a3a8a"];
const HEAL = ["#f0ffe0", "#a8e890", "#62c262", "#3a8a4a", "#245a3a"];
const SMOKE = ["#d0c8c0", "#9c969a", "#6a666e", "#46424e"];
const DUST = ["#eee0bc", "#cdb68a", "#a48a64", "#766048"];
const STEEL = ["#f2f4f8", "#b4bac6", "#7e8694", "#4a505e"];
const SH = ["#eaf2ff", "#9ab6d8", "#5a7ab0", "#34486e"];
const SOOT = "#221a1e";

// ---- toolkit -------------------------------------------------------------------------------------------
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const ease = (p) => 1 - (1 - p) * (1 - p);
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const px = (c, x, y, col, a = 1) => { if (a < 1) c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); if (a < 1) c.globalAlpha = 1; };
const rect = (c, x, y, w, h, col, a = 1) => { if (a < 1) c.globalAlpha = a; c.fillStyle = col; c.fillRect(Math.floor(x), Math.floor(y), w, h); if (a < 1) c.globalAlpha = 1; };
const ell = (c, cx, cy, rx, ry, col, o = {}) => {
  const a = o.a ?? 1, dens = o.dens ?? 1, hole = o.hole ?? 0;
  if (rx < 0.5 || ry < 0.4) return;
  c.fillStyle = col; if (a < 1) c.globalAlpha = a;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1 || d < hole * hole) continue;
    if (dens < 1 && bay(x, y) >= dens) continue;
    c.fillRect(x, y, 1, 1);
  }
  c.globalAlpha = 1;
};
const ring = (c, cx, cy, rx, ry, col, o = {}) => ell(c, cx, cy, rx, ry, col, { ...o, hole: 1 - (o.th || 1) / Math.max(1, Math.min(rx, ry)) });
const line = (c, x0, y0, x1, y1, col, a = 1) => {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let er = dx + dy;
  for (let n = 0; n < 400; n++) {
    px(c, x0, y0, col, a);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * er;
    if (e2 >= dy) { er += dy; x0 += sx; }
    if (e2 <= dx) { er += dx; y0 += sy; }
  }
};
// scan-line polygon (even-odd), so shapes stay hard pixels
const poly = (c, pts, col, a = 1) => {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  c.fillStyle = col; if (a < 1) c.globalAlpha = a;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    const X = x + 0.5, Y = y + 0.5; let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) ins = !ins;
    }
    if (ins) c.fillRect(x, y, 1, 1);
  }
  c.globalAlpha = 1;
};
const starPts = (cx, cy, R, r, n, rot = -Math.PI / 2) => { const o = []; for (let k = 0; k < n * 2; k++) { const a = rot + (k * Math.PI) / n, rr = k & 1 ? r : R; o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return o; };
// a string-art stamp: rows of chars, a map char -> colour, '.' empty; (x, y) is the top-left
const stamp = (c, rows, map, x, y) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== "." && map[ch]) px(c, x + i, y + j, map[ch]); }));
// light pooled on the ground: a hard-stepped, dithered wash
const pool = (c, cx, cy, rx, ry, col, a = 0.3) => { ell(c, cx, cy, rx, ry, col, { a: a * 0.5, dens: 0.5 }); ell(c, cx, cy, rx * 0.6, ry * 0.6, col, { a, dens: 0.5 }); };

// draw on a spare layer, then ink it: a ONE-pixel line in the neighbour's own dark (the tinted line)
const inked = (c, e, draw, o = {}) => {
  const t = mk(e.cw, e.ch), g = t.getContext("2d", { willReadFrequently: true });
  g.translate(e.ax, e.ay); draw(g);
  for (let pass = 0; pass < (o.passes || 1); pass++) {
    const img = g.getImageData(0, 0, t.width, t.height), d = img.data, W = t.width, Hh = t.height, out = new Uint8ClampedArray(d);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] > 40) continue;
      let n = -1;
      if (x > 0 && d[i - 4 + 3] > 40) n = i - 4;
      else if (x < W - 1 && d[i + 4 + 3] > 40) n = i + 4;
      else if (y > 0 && d[i - W * 4 + 3] > 40) n = i - W * 4;
      else if (y < Hh - 1 && d[i + W * 4 + 3] > 40) n = i + W * 4;
      if (n < 0) continue;
      if (o.ink) { const k = parseInt(o.ink.slice(1), 16); out[i] = k >> 16; out[i + 1] = (k >> 8) & 255; out[i + 2] = k & 255; }
      else { out[i] = d[n] * 0.4 + 10; out[i + 1] = d[n + 1] * 0.32 + 4; out[i + 2] = d[n + 2] * 0.46 + 18; }
      out[i + 3] = 255;
    }
    img.data.set(out); g.putImageData(img, 0, 0);
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(t, 0, 0); c.restore();
};

// the foe under the effect; o: dx dy, flash (0..1 white), tint {col, dens, reach (bottom fraction), a}, clipY (cut below), variant
const drawFoe = (c, e, frame, o = {}) => {
  const s = e.foe(frame, o.variant); let src = s.cv;
  if (o.flash || o.tint) {
    const t = mk(src.width, src.height), g = t.getContext("2d");
    g.drawImage(src, 0, 0); g.globalCompositeOperation = "source-atop";
    if (o.flash) { g.globalAlpha = o.flash; g.fillStyle = o.flashCol || "#fff"; g.fillRect(0, 0, t.width, t.height); g.globalAlpha = 1; }
    if (o.tint) {
      const { col, dens = 0.3, reach = 1, a = 1 } = o.tint;
      g.fillStyle = col; g.globalAlpha = a;
      for (let y = 0; y < t.height; y++) { if (s.ay - y > e.T * reach) continue; for (let x = 0; x < t.width; x++) if (bay(x, y) < dens) g.fillRect(x, y, 1, 1); }
      g.globalAlpha = 1;
    }
    src = t;
  }
  c.save();
  if (o.clipY != null) { c.beginPath(); c.rect(-e.ax, -e.ay, e.cw, e.ay + o.clipY); c.clip(); }
  c.drawImage(src, Math.round(-s.ax + (o.dx || 0) - e.cx), Math.round(-s.ay + (o.dy || 0)));
  c.restore();
};

// a teardrop flame, base at (x, y), growing up; pal = a fire-like ramp
const flame = (c, x, y, h, w, ph, pal, o = {}) => {
  const sway = o.sway ?? 1.2, tone = o.tone || 4;
  for (let j = 0; j < h; j++) {
    const p = j / Math.max(1, h - 1), prof = p < 0.25 ? 0.62 + p * 1.5 : Math.pow(Math.cos(((p - 0.25) / 0.75) * (Math.PI / 2)), 0.85);
    const hw = Math.max(0.6, (w / 2) * prof), off = Math.sin(ph + p * 3.2) * sway * p;
    for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) {
      if (Math.abs(dx) > hw + 0.2) continue;
      const d = Math.abs(dx) / hw;
      const col = d > 0.72 ? pal[3] : d > 0.42 || p > 0.8 ? pal[2] : p < 0.55 && d < 0.2 && tone > 3 ? pal[0] : pal[1];
      px(c, x + dx + off, y - j, col);
    }
  }
};
const star4 = (c, x, y, r, pal) => { for (let k = -r; k <= r; k++) { const col = Math.abs(k) < 2 ? pal[0] : pal[1]; px(c, x + k, y, col); px(c, x, y + k, col); } px(c, x, y, pal[0]); px(c, x - 1, y - 1, pal[2]); px(c, x + 1, y - 1, pal[2]); px(c, x - 1, y + 1, pal[2]); px(c, x + 1, y + 1, pal[2]); };
const STAR5 = ["...1...", "..121..", "1122211", ".12221.", "..222..", ".22.22.", ".2...2."];
const drop = (c, x, y, h, pal) => { // teardrop, tip at (x, y)
  for (let j = 0; j < h; j++) {
    const p = j / (h - 1), hw = (p < 0.5 ? (p / 0.5) * 0.55 : Math.sqrt(Math.max(0, 1 - Math.pow((p - 0.5) / 0.5, 2)))) * (h * 0.36) + 0.4;
    for (let dx = -Math.floor(hw); dx <= Math.floor(hw); dx++) {
      const d = dx / hw; let col = pal[2];
      if (d < -0.3 && p > 0.5 && p < 0.8) col = pal[0]; else if (d > 0.35 && p > 0.5) col = pal[3]; else if (d < -0.1) col = pal[1];
      px(c, x + dx, y + j, col);
    }
  }
};
const snowflake = (c, x, y, rot, R, col, col2) => {
  for (let k = 0; k < 3; k++) {
    const a = rot + (k * Math.PI) / 3;
    for (const s of [-1, 1]) {
      const ex = x + Math.cos(a) * R * s, ey = y + Math.sin(a) * R * s * 0.9;
      line(c, x, y, ex, ey, col);
      const bx = x + Math.cos(a) * R * 0.62 * s, by = y + Math.sin(a) * R * 0.62 * s * 0.9;
      for (const d of [-0.9, 0.9]) line(c, bx, by, bx + Math.cos(a + d) * R * 0.38 * s, by + Math.sin(a + d) * R * 0.38 * s * 0.9, col2 || col);
    }
  }
  px(c, x, y, "#fff");
};
const jag = (c, pts, frac, col, col2, thick = 1) => {
  const n = (pts.length - 1) * frac;
  for (let k = 0; k < pts.length - 1; k++) {
    if (k >= n) break;
    const f = Math.min(1, n - k), [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const ex = x0 + (x1 - x0) * f, ey = y0 + (y1 - y0) * f;
    if (col2) line(c, x0 + 1, y0, ex + 1, ey, col2);
    line(c, x0, y0, ex, ey, col);
    if (thick > 1) { line(c, x0 + 1, y0, ex + 1, ey, col); }
  }
};
const CRACK = [[0, -7], [-2, -4], [1, -2], [-2, 1], [1, 3], [-1, 6]];
const BR1 = [[1, -2], [5, -4], [8, -3]], BR2 = [[-2, 1], [-6, 2], [-8, 5]];

// ============ the status rows (a goblin under the mark) ============
const burn = {
  A(c, e) {
    drawFoe(c, e, e.i);
    inked(c, e, (g) => { const X = [-0.4, 0.05, 0.4], Y = [0.28, 0.6, 0.4];
      for (let k = 0; k < 3; k++) flame(g, Math.round(X[k] * e.HW * 2), -Math.round(e.T * Y[k]), 9 + ((e.i + k) % 3), 6, e.i * 0.9 + k * 2.1, FIRE, { sway: 1 }); });
    const q = (e.t * 1.5) % 1; px(c, Math.sin(q * 7) * 2, -e.T * 0.8 - q * 9, q < 0.5 ? FIRE[1] : FIRE[3]);
  },
  B(c, e) {
    pool(c, 0, 1, e.HW + 9, 5, FIRE[2], 0.34 + 0.08 * Math.sin(e.i * 1.4));
    drawFoe(c, e, e.i, { tint: { col: SOOT, dens: 0.34, reach: 0.55, a: 0.8 } });
    inked(c, e, (g) => { const X = [-0.5, -0.12, 0.28, 0.55], Y = [0.3, 0.64, 0.42, 0.7];
      for (let k = 0; k < 4; k++) { flame(g, Math.round(X[k] * e.HW * 2), -Math.round(e.T * Y[k]), 10 + ((e.i + k) % 3), 6, e.i * 0.8 + k * 1.9, FIRE, { sway: 1.4 });
        flame(g, Math.round(X[k] * e.HW * 2), -Math.round(e.T * Y[k]) - 1, 5, 3, e.i * 0.8 + k * 1.9 + 1, [FIRE[0], FIRE[0], FIRE[1], FIRE[1]], { sway: 1 }); } });
    for (let k = 0; k < 5; k++) { const q = (e.t * 1.2 + k * 0.21) % 1, x = (H(k) - 0.5) * e.HW * 1.6 + Math.sin(q * 8 + k) * 2, y = -e.T * 0.55 - q * 20;
      px(c, x, y, q < 0.35 ? FIRE[1] : q < 0.7 ? FIRE[2] : FIRE[4]); }
    for (let k = 0; k < 3; k++) { const q = (e.t + k / 3) % 1; ell(c, (k - 1) * 5 + Math.sin(q * 6 + k) * 2, -e.T - 3 - q * 14, 2 + q * 3, 1.5 + q * 2, SMOKE[1], { a: 0.5, dens: 0.8 * (1 - q) }); }
  },
  C(c, e) {
    drawFoe(c, e, e.i);
    inked(c, e, (g) => {
      flame(g, 0, -e.T - 1, 17 + (e.i % 2) * 2, 12, e.i * 1.1, [FIRE[0], FIRE[1], FIRE[2], FIRE[3]], { sway: 1.6 });
      flame(g, -Math.round(e.HW * 0.8), -Math.round(e.T * 0.3), 10, 7, e.i + 2, [FIRE[0], FIRE[1], FIRE[2], FIRE[3]], { sway: 1 });
      flame(g, Math.round(e.HW * 0.8), -Math.round(e.T * 0.36), 10, 7, e.i + 4, [FIRE[0], FIRE[1], FIRE[2], FIRE[3]], { sway: 1 });
    }, { passes: 2, ink: "#3a1a1c" });
  },
};
const poison = {
  A(c, e) {
    drawFoe(c, e, e.i, { tint: { col: TOX[2], dens: 0.12, a: 0.7 } });
    inked(c, e, (g) => { for (let k = 0; k < 3; k++) { const q = (e.t * 1.1 + k * 0.33) % 1, x = (k - 1) * 5 + Math.sin(q * 7 + k) * 1.2, y = -e.T * 0.55 - q * 12;
      if (q > 0.86) { for (const [dx, dy] of [[-2, -1], [2, -1], [0, -3], [0, 2]]) px(g, x + dx, y + dy, TOX[1]); continue; }
      ell(g, x, y, 3, 3, TOX[2]); px(g, x - 1, y - 1, TOX[0]); px(g, x - 1, y - 2, TOX[0]); px(g, x, y - 1, TOX[1]); px(g, x + 1, y + 1, TOX[3]); px(g, x, y + 2, TOX[3]); } });
  },
  B(c, e) {
    pool(c, 0, 1, e.HW + 7, 4, TOX[2], 0.4); ell(c, 0, 1, e.HW + 5, 3, TOX[3], { a: 0.55, dens: 0.55 }); ring(c, 0, 1, e.HW + 6, 3.4, TOX[1], { a: 0.5, dens: 0.7 });
    drawFoe(c, e, e.i, { tint: { col: TOX[2], dens: 0.26 + 0.06 * Math.sin(e.i), a: 0.85 } });
    for (let k = 0; k < 3; k++) { const x = Math.round((k - 1) * e.HW * 0.8), q = (e.t * 1.3 + k * 0.37) % 1, y0 = -Math.round(e.T * (0.5 - 0.1 * k));
      line(c, x, y0, x, y0 + Math.round(q * -y0 * 0.7), TOX[2]);
      if (q > 0.7) px(c, x, y0 + Math.round((q - 0.7) / 0.3 * (-y0)), TOX[1]);
      if (q > 0.95) { px(c, x - 1, 0, TOX[1]); px(c, x + 1, 0, TOX[1]); } }
    inked(c, e, (g) => { for (let k = 0; k < 4; k++) { const q = (e.t * 1.1 + k * 0.25) % 1, x = (k - 1.5) * 4.5 + Math.sin(q * 7 + k) * 1.4, y = -e.T * 0.5 - q * 15, r = 1.6 + (k % 2) * 0.9 + q;
      if (q > 0.88) continue; ell(g, x, y, r, r, TOX[2]); px(g, x - 1, y - 1, TOX[0]); } });
    for (let k = 0; k < 4; k++) { const q = (e.t * 0.8 + k * 0.25) % 1; px(c, (k - 1.5) * 6 + Math.sin(q * 6) * 2, -e.T - q * 8, TOX[1], 1 - q); }
  },
  C(c, e) {
    drawFoe(c, e, e.i, { tint: { col: TOX[2], dens: 0.2, a: 0.8 } });
    const bob = Math.round(Math.sin(e.t * TAU) * 1.5);
    inked(c, e, (g) => { drop(g, 0, -e.T - 14 + bob, 12, TOX);
      for (let k = 0; k < 3; k++) { const q = (e.t + k / 3) % 1, x = (k - 1) * 7, y = -e.T * 0.35 - q * 12; if (q > 0.85) continue; ell(g, x, y, 2.4, 2.4, TOX[1]); px(g, x - 1, y - 1, TOX[0]); px(g, x, y, TOX[0]); } }, { passes: 2, ink: "#16301f" });
  },
};
const slow = {
  A(c, e) {
    drawFoe(c, e, e.i);
    ring(c, 0, 1, e.HW + 5, 2.8, ICE[3], { a: 0.8, dens: 0.6 });
    const items = [];
    for (let k = 0; k < 3; k++) { const a = e.t * TAU * 0.5 + (k * TAU) / 3; items.push([Math.cos(a) * 8, -e.T - 3 + Math.sin(a) * 2.4, Math.sin(a)]); }
    items.sort((a, b) => a[2] - b[2]);
    inked(c, e, (g) => { for (const [x, y] of items) { stamp(g, ['..1..', '.121.', '12221', '.232.', '..3..'], { 1: ICE[1], 2: ICE[2], 3: ICE[3] }, Math.round(x) - 2, Math.round(y) - 2); px(g, Math.round(x) - 1, Math.round(y) - 1, ICE[0]); } });
  },
  B(c, e) {
    ell(c, 0, 1, e.HW + 8, 4, ICE[1], { a: 0.5, dens: 0.35 }); ring(c, 0, 1, e.HW + 8, 4, ICE[2], { a: 0.8, dens: 0.7 });
    drawFoe(c, e, e.i, { tint: { col: ICE[1], dens: 0.45, reach: 0.5 + 0.1 * Math.sin(e.t * TAU), a: 0.75 } });
    for (let k = 0; k < 3; k++) { const x = (k - 1) * (e.HW * 0.9 + 1); line(c, x, 1, x, -2 - (k % 2) * 2, ICE[1]); px(c, x, -3 - (k % 2) * 2, ICE[0]); }
    inked(c, e, (g) => { for (let k = 0; k < 3; k++) { const a = e.t * TAU * 0.5 + (k * TAU) / 3, x = Math.cos(a) * 8, y = -e.T - 3 + Math.sin(a) * 2.4;
      stamp(g, ['..1..', '.121.', '12221', '.232.', '..3..'], { 1: ICE[1], 2: ICE[2], 3: ICE[3] }, Math.round(x) - 2, Math.round(y) - 2); px(g, Math.round(x) - 1, Math.round(y) - 1, ICE[0]); } });
    for (let k = 0; k < 7; k++) { const q = (e.t + k * 0.14) % 1; px(c, (H(k) - 0.5) * e.HW * 2.6 + Math.sin(q * 6 + k), -e.T - 6 + q * (e.T + 6), k % 2 ? "#fff" : ICE[1]); }
  },
  C(c, e) {
    drawFoe(c, e, e.i, { tint: { col: ICE[3], dens: 0.22, a: 0.8 } });
    inked(c, e, (g) => snowflake(g, 0, -e.T - 8, e.t * (TAU / 6), 7, ICE[1], ICE[2]), { passes: 2, ink: "#1c3a64" });
  },
};
const frozen = {
  shell(c, e, grow, style) {
    const bw = e.HW + 4, hb = Math.round((e.T + 4) * grow);
    const x0 = -bw, x1 = bw, y0 = 2 - hb, y1 = 2;
    const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && !((x < x0 + 2 && y < y0 + 2) || (x > x1 - 2 && y < y0 + 2));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y)) {
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) px(c, x, y, x < 0 || y < (y0 + y1) / 2 ? (style === "C" ? ICE[0] : ICE[1]) : (style === "C" ? ICE[3] : ICE[4]));
      else px(c, x, y, ICE[2], style === "C" ? 0.52 : 0.36);
    }
  },
  A(c, e) {
    drawFoe(c, e, 0, { tint: { col: ICE[2], dens: 0.18, a: 0.6 } });
    frozen.shell(c, e, 1, "A");
    const bw = e.HW + 4, hb = e.T + 4, sw = Math.floor(((e.t * 1.6) % 1) * (bw * 2 + hb)) - bw;
    for (let j = 0; j < hb - 3; j++) { const x = sw - j; if (x > -bw + 2 && x < bw - 1) px(c, x, 1 - j - 1, ICE[0], 0.9); }
    ell(c, 0, 1, bw + 3, 3, ICE[1], { a: 0.5, dens: 0.4 });
  },
  B(c, e) {
    const grow = e.i < 3 ? [0.35, 0.7, 0.92][e.i] : 1;
    ell(c, 0, 1, e.HW + 9, 4.2, ICE[1], { a: 0.5, dens: 0.4 }); ring(c, 0, 1, e.HW + 9, 4.2, ICE[2], { a: 0.8, dens: 0.6 });
    drawFoe(c, e, 0, { tint: { col: ICE[1], dens: 0.3, a: 0.7 } });
    frozen.shell(c, e, grow, "B");
    if (grow >= 1) {
      const bw = e.HW + 4, hb = e.T + 4;
      jag(c, [[-bw + 3, -hb + 8], [-2, -hb * 0.55], [1, -hb * 0.45], [bw - 3, -hb * 0.15]], 1, ICE[0], null);
      jag(c, [[1, -hb * 0.45], [3, -hb * 0.2], [-1, -3]], 1, ICE[1], null);
      for (let x = -bw + 2; x < bw - 1; x++) if (H(x, 4) > 0.45) px(c, x, 2 - hb - (H(x, 9) > 0.7 ? 1 : 0), ICE[0]);
      if ((e.i & 3) === 3) star4(c, -bw + 3, -hb + 5, 2, ICE.slice(0, 3));
      if ((e.i & 3) === 1) star4(c, bw - 3, -hb * 0.4, 2, ICE.slice(0, 3));
    }
    for (let k = 0; k < 4; k++) { const q = (e.t * 0.7 + k * 0.25) % 1; ell(c, (k - 1.5) * 7 + Math.sin(q * 5 + k) * 2, 0 - q * 6, 3 + q * 2, 1.3 + q, "#fff", { a: 0.5, dens: 0.55 * (1 - q) }); }
  },
  C(c, e) {
    drawFoe(c, e, 0, { tint: { col: ICE[2], dens: 0.2, a: 0.7 } });
    frozen.shell(c, e, 1, "C");
    const bw = e.HW + 4, hb = e.T + 4;
    inked(c, e, (g) => {
      for (const [x, h] of [[-bw + 3, 7], [1, 10], [bw - 4, 6]]) poly(g, [[x - 3, 2 - hb], [x, 2 - hb - h], [x + 3, 2 - hb]], ICE[1]);
      }, { passes: 2, ink: "#1c3a64" });
    rect(c, -bw + 3, 6 - hb, 2, Math.round(hb * 0.5), "#fff");
    ell(c, 0, 2, bw + 2, 3, ICE[1], { a: 0.7 });
  },
};
const stun = {
  A(c, e) {
    drawFoe(c, e, 0);
    const items = []; for (let k = 0; k < 3; k++) { const a = e.t * TAU + (k * TAU) / 3; items.push([Math.cos(a) * 8, -e.T - 2 + Math.sin(a) * 2.6, Math.sin(a)]); }
    items.sort((a, b) => a[2] - b[2]);
    inked(c, e, (g) => { for (const [x, y] of items) star4(g, Math.round(x), Math.round(y), 2, HOLY); });
  },
  B(c, e) {
    drawFoe(c, e, 0, { dx: e.i & 1 ? 1 : -1 });
    for (let k = 0; k < 4; k++) {
      const a = e.t * TAU + (k * TAU) / 4;
      for (let tr = 4; tr >= 1; tr--) { const aa = a - tr * 0.28; px(c, Math.cos(aa) * 9, -e.T - 2 + Math.sin(aa) * 2.8, HOLY[tr > 2 ? 3 : 2], 1 - tr * 0.2); }
    }
    inked(c, e, (g) => { for (let k = 0; k < 4; k++) { const a = e.t * TAU + (k * TAU) / 4; star4(g, Math.round(Math.cos(a) * 9), Math.round(-e.T - 2 + Math.sin(a) * 2.8), 2, HOLY); } });
    for (const s of [-1, 1]) { line(c, s * (e.HW + 3), -e.T * 0.7, s * (e.HW + 6), -e.T * 0.75 - (e.i & 1), HOLY[1]); line(c, s * (e.HW + 3), -e.T * 0.55, s * (e.HW + 7), -e.T * 0.55, HOLY[1]); }
    if (e.i % 4 === 0) { ell(c, -e.HW, 1, 4, 1.5, DUST[1], { a: 0.6, dens: 0.6 }); ell(c, e.HW, 1, 4, 1.5, DUST[1], { a: 0.6, dens: 0.6 }); }
  },
  C(c, e) {
    drawFoe(c, e, 0, { dx: e.i & 1 ? 1 : -1 });
    const items = []; for (let k = 0; k < 3; k++) { const a = e.t * TAU + (k * TAU) / 3; items.push([Math.cos(a) * 10, -e.T - 3 + Math.sin(a) * 3, Math.sin(a)]); }
    items.sort((a, b) => a[2] - b[2]);
    inked(c, e, (g) => { for (const [x, y] of items) stamp(g, STAR5, { 1: HOLY[0], 2: HOLY[2] }, Math.round(x) - 3, Math.round(y) - 3); }, { passes: 2, ink: "#4a2e1c" });
  },
};
const shield = {
  today(c, e, w) { // enemies.js: one 1x1 pip per blow, just under the health bar
    drawFoe(c, e, e.i);
    const n = 3, y = -e.T - 1; c.fillStyle = "#9ab6d8";
    for (let k = 0; k < n; k++) { if (k === 2 && e.i >= 6) continue; const gx = -(n * 6 - 2) / 2 + k * 6; c.fillRect(gx, y, 1, 1); c.fillRect(gx + 1, y + 2, 0.5, 0.5); }
  },
  pips(c, e, big) {
    const lost = e.i >= 5, n = 3, kick = e.i === 5;
    for (let k = 0; k < n; k++) {
      const x = (k - 1) * (big ? 11 : 7), y = -e.T - (big ? 9 : 6);
      if (k === 2 && lost) { if (e.i < 8) for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 3], [3, 3], [0, -4]]) px(c, x + dx * (e.i - 4) * 0.6, y + dy * (e.i - 4) * 0.6 + (e.i - 4), SH[1]); continue; }
      inked(c, e, (g) => {
        if (big) stamp(g, ["1111111", "1222221", "1222221", "1222221", ".12221.", ".12221.", "..131..", "...3..."], { 1: SH[0], 2: SH[1], 3: SH[2] }, x - 3, y - 4);
        else { rect(g, x - 1, y - 1, 3, 3, SH[1]); px(g, x, y - 2, SH[0]); px(g, x, y + 2, SH[2]); px(g, x - 1, y - 1, SH[0]); }
      }, big ? { passes: 2, ink: "#1c2a4c" } : {});
    }
  },
  A(c, e) { drawFoe(c, e, e.i); shield.pips(c, e, false); },
  B(c, e) {
    drawFoe(c, e, e.i);
    const hw = e.HW + 5, hh = (e.T + 8) / 2, cy = -e.T / 2 + 1;
    ring(c, 0, cy, hw, hh, SH[1], { a: 0.55, dens: 0.7 }); ell(c, 0, cy, hw, hh, SH[0], { a: 0.09, dens: 0.5 });
    const sh = (e.t * 1.2) % 1; for (let k = 0; k < 7; k++) { const a = -2.3 + sh * 3.4 + k * 0.045; px(c, Math.cos(a) * hw, cy + Math.sin(a) * hh, SH[0], 0.9); }
    if (e.i >= 5 && e.i <= 7) { ring(c, 0, cy, hw * (0.6 + (e.i - 5) * 0.2), hh * (0.6 + (e.i - 5) * 0.2), "#fff", { a: 0.7 - (e.i - 5) * 0.2, dens: 0.6 }); }
    shield.pips(c, e, false);
  },
  C(c, e) { drawFoe(c, e, e.i); shield.pips(c, e, true); },
};
const crack = {
  A(c, e) {
    drawFoe(c, e, 0);
    const f = Math.min(1, (e.p * 7) / 4.5), y = Math.round(-e.T * 0.48);
    c.save(); c.translate(0, y); jag(c, CRACK, f, ICE[1], ICE[4], 2); if (e.i > 3 && e.i < 7) { px(c, 4, 3 + (e.i - 3) * 2, ICE[1]); px(c, -4, 2 + (e.i - 3) * 2, ICE[2]); } c.restore();
  },
  B(c, e) {
    drawFoe(c, e, 0, { tint: { col: ICE[1], dens: 0.12, a: 0.6 } });
    const f = Math.min(1, (e.p * 7) / 4.5), y = Math.round(-e.T * 0.48), pulse = 0.5 + 0.5 * Math.sin(e.i * 1.1);
    c.save(); c.translate(0, y);
    if (f > 0.4) ell(c, 0, 0, 7, 9, ICE[2], { a: 0.16 + 0.1 * pulse, dens: 0.5 });
    jag(c, CRACK, f, ICE[0], ICE[4]); if (f > 0.5) { jag(c, BR1, (f - 0.5) * 2, ICE[1], ICE[4]); jag(c, BR2, (f - 0.5) * 2, ICE[1], ICE[4]); }
    for (let k = 0; k < 4; k++) { if (e.i < 3) break; const q = cl((e.p * 8 - 3 - k * 0.5) / 4); px(c, (k % 2 ? 1 : -1) * (3 + q * 9), -1 + q * 14 * q - 4 * q + k, k % 2 ? ICE[1] : "#b4bac6"); px(c, (k % 2 ? 1 : -1) * (3 + q * 9), q * 14 * q - 4 * q + k, ICE[3]); }
    c.restore();
  },
  C(c, e) {
    drawFoe(c, e, 0);
    const f = Math.min(1, (e.p * 7) / 4), y = Math.round(-e.T * 0.48);
    c.save(); c.translate(0, y);
    inked(c, { ...e, ax: e.ax, ay: e.ay + 0 }, (g) => { g.translate(0, y); jag(g, CRACK, f, ICE[0], ICE[1], 2); if (f > 0.9) poly(g, starPts(0, -1, 5, 2, 6), "#fff"); }, { passes: 1, ink: "#1c3a64" });
    for (let k = 0; k < 3; k++) { if (e.i < 4) break; const q = cl((e.p * 8 - 4 - k * 0.4) / 3.5); rect(c, (k - 1) * (3 + q * 7), q * q * 12 - 3 * q + 2, 3, 2, ICE[1]); rect(c, (k - 1) * (3 + q * 7), q * q * 12 - 3 * q + 4, 3, 1, ICE[4]); }
    c.restore();
  },
};

// ============ one-shots (a goblin takes it) ============
const physhit = {
  A(c, e) {
    drawFoe(c, e, 0, { dx: e.i >= 1 && e.i <= 3 ? -1 : 0 });
    const y = -Math.round(e.T * 0.5), f = e.i - 1;
    if (f >= 0 && f < 3) {
      if (f === 0) { rect(c, -1, y - 1, 3, 3, STEEL[0]); for (let k = -4; k <= 4; k++) if (Math.abs(k) > 1) { px(c, k, y, STEEL[1]); px(c, 0, y + k, STEEL[1]); } }
      else { const d = f === 1 ? 4 : 7; for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) for (let i = 0; i < (f === 1 ? 3 : 2); i++) px(c, ex * (d + i), y + ey * (d + i), i ? STEEL[2] : STEEL[0]); }
      if (f >= 1) { px(c, 6 + f, y + 3 + f * 2, DUST[1]); px(c, -6 - f, y + 2 + f * 2, DUST[2]); }
    }
  },
  B(c, e) {
    const f = e.i - 1, y = -Math.round(e.T * 0.5);
    if (f >= 0 && f < 3) ell(c, 0, 1, 9, 3.5, DUST[1], { a: 0.35, dens: 0.4 });
    drawFoe(c, e, 0, { dx: f >= 0 && f < 4 ? -2 + Math.max(0, f - 1) : 0, flash: f === 0 ? 0.4 : 0 });
    if (f >= -1 && f < 3) { const L = [0, 9, 12][Math.max(0, f)]; if (f >= 0) { line(c, -6, y - 7, -6 + L, y - 7 + L * 0.9, STEEL[0]); line(c, -5, y - 7, -5 + L, y - 7 + L * 0.9, STEEL[1], 0.7); } }
    if (f >= 0 && f < 4) {
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.3, d = 3 + f * 3.5; px(c, Math.cos(a) * d, y + Math.sin(a) * d, k % 2 ? STEEL[0] : FIRE[1]); }
      if (f === 0) rect(c, -1, y - 1, 3, 3, "#fff");
      for (let k = 0; k < 3; k++) { const q = f / 3; px(c, 4 + k * 3 + q * 4, y + 2 + q * q * 18 + k, DUST[2 - (k & 1)]); }
      ell(c, 0, 0, 6 + f * 3, 2 + f, DUST[1], { a: 0.5 - f * 0.1, dens: 0.5 });
    }
  },
  C(c, e) {
    const f = e.i - 1, y = -Math.round(e.T * 0.5);
    drawFoe(c, e, 0, { dx: f >= 0 && f < 3 ? -2 : 0, flash: f === 0 ? 0.5 : 0 });
    if (f >= 0 && f < 4) {
      const s = [0.8, 1.15, 1.0, 0.7][f];
      inked(c, e, (g) => { poly(g, starPts(0, y, 11 * s, 5 * s, 8, 0.4), f < 2 ? "#fff" : HOLY[1]); poly(g, starPts(0, y, 7 * s, 3 * s, 8, 0.4), HOLY[0]); if (f < 3) poly(g, starPts(0, y, 4 * s, 2 * s, 8, 0.4), "#fff"); }, { passes: 2, ink: "#4a2e1c" });
    }
  },
};
const maghit = {
  A(c, e) {
    drawFoe(c, e, 0, { flash: e.i === 1 ? 0.28 : 0, flashCol: ARC[1] });
    const f = e.i - 1, y = -Math.round(e.T * 0.5);
    if (f >= 0 && f < 5) { const r = 3 + f * 3.2; ring(c, 0, y, r, r * 0.9, f < 2 ? ARC[0] : f < 4 ? ARC[2] : ARC[3], { a: 1 - f * 0.17 });
      if (f < 2) ell(c, 0, y, 3, 3, ARC[0]);
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.7, d = r + 2; px(c, Math.cos(a) * d, y + Math.sin(a) * d, ARC[1]); } }
  },
  B(c, e) {
    const f = e.i - 1, y = -Math.round(e.T * 0.5);
    if (f >= 0 && f < 6) { pool(c, 0, 1, 14, 5, ARC[3], 0.4 - f * 0.05); const gr = 8 + f; ring(c, 0, 1, gr, gr * 0.45, ARC[2], { a: 0.8 - f * 0.1, dens: 0.8 }); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + f * 0.4; px(c, Math.cos(a) * gr, 1 + Math.sin(a) * gr * 0.45, ARC[1]); } }
    drawFoe(c, e, 0, { flash: f === 0 ? 0.3 : 0, flashCol: ARC[1] });
    if (f >= 0 && f < 6) {
      ell(c, 0, y, Math.max(1, 8 - f * 2), Math.max(1, 8 - f * 2), ARC[0], { a: 0.7, dens: f < 2 ? 1 : 0.5 });
      ring(c, 0, y, 4 + f * 3, 4 + f * 3, ARC[2], { a: 0.9 - f * 0.12 });
      for (let k = 0; k < 6; k++) { const a = k * 1.9 + f * 0.9, q = f / 5, d = 3 + q * 10; px(c, Math.cos(a) * d, y + Math.sin(a) * d * 0.9 - q * 6, k % 2 ? ARC[0] : ARC[1]); }
      if (f === 1 || f === 3) star4(c, 6, y - 6, 2, ARC);
    }
  },
  C(c, e) {
    const f = e.i - 1, y = -Math.round(e.T * 0.5);
    drawFoe(c, e, 0, { flash: f === 0 ? 0.4 : 0, flashCol: ARC[1] });
    if (f >= 0 && f < 5) { const s = [0.8, 1.2, 1.05, 0.8, 0.5][f];
      inked(c, e, (g) => { poly(g, starPts(0, y, 12 * s, 6 * s, 8, 0.2), ARC[3]); poly(g, starPts(0, y, 9 * s, 4.5 * s, 8, 0.2), ARC[1]); poly(g, starPts(0, y, 5 * s, 2.5 * s, 8, 0.2), "#fff"); }, { passes: 2, ink: "#2a1650" });
      if (f > 0 && f < 4) for (const [x, yy] of [[-11, -9], [11, -11]]) stamp(c, STAR5, { 1: ARC[0], 2: ARC[2] }, x - 3, y + yy - 3); }
  },
};

// ============ blasts ============
const blastBase = (c, e) => { };
const splash = {
  A(c, e) {
    const p = e.p, R = 34, rr = 0.35 + 0.65 * ease(Math.min(1, p / 0.7));
    if (p > 0.55) ell(c, 0, 0, R * 0.8, R * 0.5, SOOT, { a: 0.3 * (1 - (p - 0.55) / 0.45), dens: 0.4 });
    if (p < 0.28) { ell(c, 0, -4, R * 0.5, R * 0.42, FIRE[0], { a: 0.9 }); }
    if (p < 0.75) {
      const r = R * rr * 0.62, tones = p < 0.3 ? [FIRE[0], FIRE[1], FIRE[2]] : p < 0.55 ? [FIRE[1], FIRE[2], FIRE[3]] : [FIRE[2], FIRE[3], FIRE[4]];
      for (let k = 0; k < 5; k++) { const a = k * 1.26 + 0.4; ell(c, Math.cos(a) * r * 0.42, -6 + Math.sin(a) * r * 0.34, r * 0.6 + 1.2, r * 0.54 + 1.2, FIRE[4]); }
      for (let k = 0; k < 5; k++) { const a = k * 1.26 + 0.4; ell(c, Math.cos(a) * r * 0.42, -6 + Math.sin(a) * r * 0.34, r * 0.6, r * 0.54, tones[2]); } ell(c, -1, -7, r * 0.7, r * 0.62, tones[1]); ell(c, -1, -8, r * 0.38, r * 0.34, tones[0]);
    }
    ring(c, 0, 0, R * rr, R * rr * 0.55, p < 0.5 ? FIRE[2] : FIRE[3], { a: 1 - Math.max(0, (p - 0.5) / 0.5), th: 1 });
    if (p > 0.15 && p < 0.9) for (let k = 0; k < 6; k++) { const a = H(k) * TAU, d = 0.35 + 0.55 * H(k, 2); if ((k + e.i) % 3 === 0) continue; px(c, Math.cos(a) * R * d, Math.sin(a) * R * d * 0.55, FIRE[2]); }
    if (p > 0.3) inked(c, e, (g) => { const q = (p - 0.3) / 0.7; ell(g, 0, -R * 0.35 - q * 16, 4 + q * 3, 3.5 + q * 2.5, SMOKE[q < 0.5 ? 0 : 1], { a: 0.85 * (1 - q * 0.7) }); });
  },
  B(c, e) {
    const p = e.p, R = 34, rr = 0.3 + 0.7 * ease(Math.min(1, p / 0.7));
    pool(c, 0, 0, R * 1.05 * Math.min(1, p * 3 + 0.3), R * 0.6, FIRE[2], 0.42 * (1 - cl((p - 0.3) / 0.7)));
    const sc = 0.5 + 0.5 * cl((p - 0.15) / 0.5);
    ell(c, 0, 0, R * 0.78 * sc, R * 0.46 * sc, SOOT, { a: 0.55 * (p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2) * (p > 0.1 ? 1 : 0), dens: 0.55 });
    ell(c, 0, 0, R * 0.46 * sc, R * 0.28 * sc, SOOT, { a: 0.7 * (p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2) * (p > 0.1 ? 1 : 0), dens: 0.8 });
    ring(c, 0, 0, R * rr, R * rr * 0.55, FIRE[3], { a: 0.85 * (1 - cl((p - 0.35) / 0.45)), th: 2, dens: 0.75 });
    if (p > 0.2) for (let k = 0; k < 4; k++) { const q = cl((p - 0.2 - k * 0.07) / 0.75); if (q <= 0 || q >= 1) continue; ell(c, (k - 1.5) * 6 + Math.sin(q * 5 + k) * 3, -10 - q * 30, 4 + q * 5, 3.5 + q * 4, SMOKE[q < 0.4 ? 1 : 2], { a: 0.8 * (1 - q), dens: 0.85 - q * 0.4 }); }
    if (p < 0.7) {
      const base = 7 + 8 * ease(Math.min(1, p / 0.4)), tones = p < 0.25 ? [FIRE[0], FIRE[1], FIRE[2], FIRE[3]] : p < 0.5 ? [FIRE[1], FIRE[2], FIRE[3], FIRE[4]] : [FIRE[2], FIRE[3], FIRE[4], FIRE[5]];
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + H(k, 3), d = base * 0.45, rx = base * (0.5 + 0.2 * H(k, 5)) * (1 - p * 0.55); ell(c, Math.cos(a) * d, -base * 0.5 + Math.sin(a) * d * 0.6, rx, rx * 0.9, tones[3]); }
      ell(c, 0, -base * 0.55, base * 0.72 * (1 - p * 0.4), base * 0.62 * (1 - p * 0.4), tones[2]); ell(c, 0, -base * 0.6, base * 0.45 * (1 - p * 0.45), base * 0.4 * (1 - p * 0.45), tones[1]); ell(c, 0, -base * 0.62, base * 0.2 * (1 - p * 0.5), base * 0.18 * (1 - p * 0.5), tones[0]);
    }
    for (let k = 0; k < 7; k++) { const a = H(k, 7) * TAU, v = 0.5 + 0.5 * H(k, 8), q = cl((p - 0.04) / 0.8);
      const x = Math.cos(a) * v * R * 0.9 * ease(q), y = Math.sin(a) * v * R * 0.45 * ease(q) - Math.max(0, 22 * v * q - 38 * q * q);
      if (q > 0.02 && q < 0.98) { rect(c, x, y, 2, 2, DUST[3]); px(c, x, y, DUST[1]); } }
    if (p > 0.25 && p < 0.95) for (let k = 0; k < 8; k++) { const q = (p - 0.25) / 0.7, a = H(k, 11) * TAU, d = 0.3 + 0.6 * H(k, 12); px(c, Math.cos(a) * R * d, Math.sin(a) * R * d * 0.5 + q * 3, q < 0.5 ? FIRE[1] : FIRE[3], 1 - q * 0.8); }
  },
  C(c, e) {
    const p = e.p, R = 34;
    if (p < 0.2) ell(c, 0, 0, R * 0.9, R * 0.5, "#fff", { a: 0.6 });
    if (p < 0.65) {
      const s = p < 0.15 ? 0.7 + p * 2 : 1 - (p - 0.15) * 0.7, y = -12;
      inked(c, e, (g) => { poly(g, starPts(0, y, R * 0.95 * s, R * 0.5 * s, 9, 0.1), p < 0.4 ? FIRE[2] : FIRE[3]); poly(g, starPts(0, y, R * 0.7 * s, R * 0.4 * s, 9, 0.1), FIRE[1]); poly(g, starPts(0, y, R * 0.4 * s, R * 0.24 * s, 9, 0.1), p < 0.3 ? "#fff" : FIRE[0]); }, { passes: 2, ink: "#3a1a1c" });
    }
    if (p > 0.1 && p < 0.9) { const q = (p - 0.1) / 0.8, r = R * ease(q); inked(c, e, (g) => ring(g, 0, 0, r, r * 0.55, q < 0.5 ? FIRE[2] : FIRE[3], { th: 3, a: 1 }), { ink: "#3a1a1c" }); }
    if (p > 0.35) for (let k = 0; k < 3; k++) { const q = cl((p - 0.35 - k * 0.06) / 0.6); if (q <= 0 || q >= 1) continue; inked(c, e, (g) => ell(g, (k - 1) * 11, -16 - q * 24, 6 + q * 3, 5.5 + q * 2.5, q < 0.5 ? SMOKE[1] : SMOKE[2], { a: 1 - q * 0.6 }), { ink: "#2a262e" }); }
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.4, q = cl(p / 0.8); if (q >= 1) continue; rect(c, Math.cos(a) * R * 1.0 * ease(q) - 1, Math.sin(a) * R * 0.5 * ease(q) - 6 * Math.sin(q * Math.PI) + q * q * 8, 3, 3, DUST[2]); rect(c, Math.cos(a) * R * ease(q) - 1, Math.sin(a) * R * 0.5 * ease(q) - 6 * Math.sin(q * Math.PI) + q * q * 8, 3, 1, DUST[0]); }
  },
};
const shrapnel = {
  A(c, e) {
    const p = e.p;
    if (p < 0.2) { ell(c, 0, -4, 4, 3.5, FIRE[0]); ring(c, 0, -4, 7, 5, FIRE[1], { th: 1 }); } else if (p < 0.4) ring(c, 0, -3, 10, 6, FIRE[2], { a: 0.7 });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2, q = cl(p / 0.8), d = 4 + ease(q) * 28, x = Math.cos(a) * d, y = -4 + Math.sin(a) * d * 0.6 + q * q * 8;
      const tx = Math.cos(a) * 2.5, ty = Math.sin(a) * 1.5;
      if (q < 1) { px(c, x - tx * 2, y - ty * 2, STEEL[2], 0.7); px(c, x - tx, y - ty, STEEL[1]); rect(c, x, y, 2, 1, STEEL[0]); px(c, x, y + 1, STEEL[3]); }
      else { rect(c, x, y, 2, 1, STEEL[1]); px(c, x, y + 1, STEEL[3]); if ((k + e.i) % 3 === 0) px(c, x - 1, y - 1, STEEL[0]); } }
  },
  B(c, e) {
    const p = e.p;
    pool(c, 0, 0, 14, 5, FIRE[2], 0.4 * (1 - p));
    if (p < 0.3) { ell(c, 0, -4, 5 - p * 8, 4.5 - p * 8, FIRE[p < 0.12 ? 0 : 1]); ring(c, 0, -3, 5 + p * 40, 3 + p * 22, FIRE[2], { a: 0.8 }); }
    if (p > 0.1) ell(c, 0, -8 - (p - 0.1) * 12, 3 + p * 5, 2.5 + p * 4, SMOKE[1], { a: 0.6 * (1 - p), dens: 0.8 });
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + 0.15, v = 0.8 + 0.3 * H(k), q = cl(p / 0.85), d = 4 + ease(q) * 26 * v, x = Math.cos(a) * d, y = -4 + Math.sin(a) * d * 0.55 + q * q * 16 - Math.sin(q * Math.PI) * 5;
      if (q >= 1) { rect(c, x, y, 2, 1, STEEL[2]); px(c, x - 1, y, DUST[3]); px(c, x + 2, y, DUST[3]); continue; }
      const tx = Math.cos(a), ty = Math.sin(a) * 0.55;
      px(c, x - tx * 5, y - ty * 5, STEEL[3], 0.5); px(c, x - tx * 4, y - ty * 4, STEEL[2], 0.65); px(c, x - tx * 3, y - ty * 3, STEEL[2], 0.85); px(c, x - tx * 2, y - ty * 2, STEEL[1]);
      if ((k + e.i) % 2) { rect(c, x, y, 2, 1, STEEL[0]); px(c, x, y + 1, STEEL[3]); } else { rect(c, x, y, 1, 2, STEEL[0]); px(c, x + 1, y + 1, STEEL[3]); }
      if (q > 0.75) { ell(c, x, y + 1, 2.5 + (q - 0.75) * 12, 1.2, DUST[1], { a: 0.5, dens: 0.5 }); }
    }
  },
  C(c, e) {
    const p = e.p;
    if (p < 0.35) inked(c, e, (g) => { const s = p < 0.1 ? 0.8 : 1 - p * 0.9; poly(g, starPts(0, -5, 12 * s, 5 * s, 8, 0.2), FIRE[2]); poly(g, starPts(0, -5, 8 * s, 3.5 * s, 8, 0.2), FIRE[1]); poly(g, starPts(0, -5, 4 * s, 2 * s, 8, 0.2), "#fff"); }, { passes: 2, ink: "#3a1a1c" });
    if (p < 0.95) inked(c, e, (g) => { for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2, q = cl(p / 0.85), d = 6 + ease(q) * 24, x = Math.cos(a) * d, y = -5 + Math.sin(a) * d * 0.6 + q * q * 10;
      rect(g, x - 1, y - 1, 4, 2, STEEL[0]); rect(g, x, y + 1, 3, 1, STEEL[2]); px(g, x + 3, y, STEEL[0]); } }, { ink: "#262a38" });
    if (p > 0.7) for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.5; star4(c, Math.round(Math.cos(a) * 28), Math.round(Math.sin(a) * 17 + 4), 2, HOLY); }
  },
};

// ============ raise, heal, death ============
const rise = {
  foe(c, e, frac) { drawFoe(c, e, 0, { variant: "revived", dy: Math.round((1 - frac) * (e.T + 4)), clipY: 1 }); },
  A(c, e) {
    const p = e.p, frac = cl((p - 0.2) / 0.6);
    ring(c, 0, 1, 12, 5, NEC[3], { th: 1 }); ring(c, 0, 1, 15, 6.5, NEC[4], { th: 1, a: 0.6, dens: 0.6 });
    rise.foe(c, e, frac);
    for (let k = 0; k < 8; k++) { const t = cl(p * 1.3 - k * 0.07); if (t <= 0 || t >= 1) continue; const an = t * 9 + k * (TAU / 8), rad = 10 * (1 - t * 0.6); px(c, Math.cos(an) * rad, 1 + Math.sin(an) * rad * 0.45 - t * 30, k % 3 ? NEC[1] : WITCH[2]); if (k % 2) px(c, Math.cos(an) * rad, 2 + Math.sin(an) * rad * 0.45 - t * 30, NEC[3]); }
    if (p < 0.25) ell(c, 0, 0, 6, 3, NEC[0], { a: 0.8 });
  },
  B(c, e) {
    const p = e.p, frac = cl((p - 0.2) / 0.6);
    pool(c, 0, 1, 20, 8, NEC[2], 0.36); ell(c, 0, 1, 13, 5, "#1e1612", { a: 0.8, dens: 0.8 });
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + 0.3; line(c, Math.cos(a) * 4, 1 + Math.sin(a) * 1.6, Math.cos(a) * (6 + 8 * H(k) * cl(p * 3)), 1 + Math.sin(a) * (2.5 + 3.5 * H(k) * cl(p * 3)), "#120c0a"); }
    for (let k = 0; k < 4; k++) { const q = (e.t * 0.8 + k * 0.25) % 1; ell(c, (k - 1.5) * 7 + Math.sin(q * 5) * 3, -q * 20, 5, 2.5, WITCH[2], { a: 0.35 * (1 - q), dens: 0.55 }); }
    rise.foe(c, e, frac);
    for (let k = 0; k < 6; k++) { const q = cl((p - 0.1 - k * 0.04) / 0.6); if (q <= 0 || q >= 1) continue; const a = H(k, 4) * TAU, v = 7 + H(k, 6) * 9; rect(c, Math.cos(a) * v * q, -Math.sin(q * Math.PI) * 14 + q * q * 8 + 1, 2, 2, k % 2 ? "#4a3a2a" : "#6a5238"); }
    for (let k = 0; k < 8; k++) { const t = cl(p * 1.35 - k * 0.07); if (t <= 0 || t >= 1) continue; const an = t * 9 + k * (TAU / 8), rad = 11 * (1 - t * 0.6), x = Math.cos(an) * rad, y = 1 + Math.sin(an) * rad * 0.45 - t * 32;
      for (let tr = 1; tr < 4; tr++) { const a2 = an - tr * 0.3, t2 = t - tr * 0.03; px(c, Math.cos(a2) * 11 * (1 - t2 * 0.6), 1 + Math.sin(a2) * 11 * (1 - t2 * 0.6) * 0.45 - t2 * 32, NEC[3], 0.7 - tr * 0.2); }
      px(c, x, y, k % 3 ? NEC[1] : WITCH[1]); px(c, x, y - 1, NEC[0]); }
    if (p < 0.3) ell(c, 0, -2, 7 - p * 14, 4 - p * 8, NEC[0], { a: 0.7 });
  },
  C(c, e) {
    const p = e.p, frac = cl((p - 0.2) / 0.6);
    inked(c, e, (g) => { ring(g, 0, 1, 15, 7, NEC[1], { th: 2 }); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + e.t * 2; rect(g, Math.cos(a) * 15 - 1, 1 + Math.sin(a) * 7 - 1, 3, 3, NEC[0]); } }, { ink: "#2e1e4a" });
    ell(c, 0, 1, 12, 5.5, NEC[2], { a: 0.35, dens: 0.5 });
    rect(c, -5, -34, 10, 34, NEC[1], 0.18 * Math.min(1, p * 3));
    rise.foe(c, e, frac);
    inked(c, e, (g) => { for (const [x, h] of [[-10, 12], [0, 17], [10, 12]]) flame(g, x, -2, Math.round(h * cl(p * 2.2)) + 2, 7, e.i * 1.2 + x, WITCH, { sway: 1.2 }); }, { passes: 2, ink: "#17362a" });
  },
};
const heal = {
  A(c, e) {
    const p = e.p, R = 38, r = R * ease(Math.min(1, p * 1.2));
    drawFoe(c, e, 0, { flash: e.i === 2 ? 0.35 : 0, flashCol: HEAL[1] });
    ring(c, 0, 0, r, r * 0.5, HEAL[2], { a: 1 - p * 0.7, th: 1 }); if (r > 6) ring(c, 0, 0, r * 0.88, r * 0.44, HEAL[1], { a: 0.6 * (1 - p), th: 1, dens: 0.5 });
    inked(c, e, (g) => { for (let k = 0; k < 5; k++) { const born = 0.1 + k * 0.1; if (p < born) continue; const q = (p - born) * 1.6, x = (k - 2) * 8 + (k % 2) * 3, y = -2 - q * 24; if (q > 1) continue;
      rect(g, x - 1, y, 3, 1, HEAL[1]); rect(g, x, y - 1, 1, 3, HEAL[1]); px(g, x, y, HEAL[0]); } });
  },
  B(c, e) {
    const p = e.p, R = 38, r = R * ease(Math.min(1, p * 1.2));
    ell(c, 0, 0, r, r * 0.5, HEAL[2], { a: 0.28 * (1 - p * 0.6), dens: 0.5 }); ell(c, 0, 0, r * 0.6, r * 0.3, HEAL[1], { a: 0.2 * (1 - p), dens: 0.5 });
    drawFoe(c, e, 0, { tint: { col: HEAL[1], dens: 0.5, reach: cl(p * 1.5), a: 0.7 * (1 - Math.max(0, p - 0.6) * 2) } });
    ring(c, 0, 0, r, r * 0.5, HEAL[1], { a: 1 - p * 0.6, th: 1.5 });
    for (let k = 0; k < 14; k++) { const an = H(k) * TAU, d = R * Math.sqrt(H(k, 3)) * 0.95, born = (d / R) * 0.55; if (p < born) continue; const q = ((p - born) * 1.4) % 1, x = Math.cos(an) * d, y = Math.sin(an) * d * 0.5;
      line(c, x, y - q * 14, x, y - q * 14 - 4, HEAL[1], 0.85); px(c, x, y - q * 14 - 4, HEAL[0]); }
    for (let k = 0; k < 5; k++) { const an = H(k, 9) * TAU, d = R * 0.7 * H(k, 10), born = 0.15 + k * 0.08; if (p < born) continue; const q = (p - born) * 1.4; if (q > 1) continue; const x = Math.cos(an) * d + Math.sin(q * 9 + k) * 3, y = Math.sin(an) * d * 0.5 - 4 - q * 22;
      px(c, x, y, HEAL[2]); px(c, x + 1, y - 1, HEAL[1]); px(c, x + 1, y, HEAL[3]); }
    inked(c, e, (g) => { for (let k = 0; k < 3; k++) { const born = 0.2 + k * 0.15; if (p < born) continue; const q = (p - born) * 1.5; if (q > 1) continue; const x = (k - 1) * 9, y = -e.T * 0.5 - q * 20; rect(g, x - 1, y, 3, 1, HEAL[0]); rect(g, x, y - 1, 1, 3, HEAL[0]); } });
  },
  C(c, e) {
    const p = e.p, R = 38, r = R * ease(Math.min(1, p * 1.2));
    drawFoe(c, e, 0, { flash: e.i > 0 && e.i < 4 ? 0.5 : 0, flashCol: HEAL[0] });
    inked(c, e, (g) => ring(g, 0, 0, r, r * 0.5, HEAL[2], { th: 2.5, a: 1 }), { ink: "#1a3d2a" });
    if (r > 6) ring(c, 0, 0, r - 2, r * 0.5 - 1, HEAL[1], { th: 1 });
    inked(c, e, (g) => { for (let k = 0; k < 3; k++) { const born = 0.08 + k * 0.14; if (p < born) continue; const q = (p - born) * 1.45; if (q > 1) continue; const x = (k - 1) * 13, y = -6 - q * 26;
      stamp(g, ["..111..", "..121..", "1112111", "1222221", "1112111", "..121..", "..111.."], { 1: HEAL[1], 2: HEAL[0] }, x - 3, y - 3); } }, { passes: 2, ink: "#1a3d2a" });
  },
};
const death = {
  crumble(c, e, p, o = {}) { // the figure's own pixels flash white then come apart (as draw.js does), with our drift
    const s = e.foe(0), pxs = e.pixels(s);
    if (p < 0.22) { drawFoe(c, e, 0, { flash: 0.95 }); return; }
    const p2 = (p - 0.22) / 0.78;
    c.globalAlpha = 1 - p2;
    for (let i = 0; i < pxs.length; i++) { const [dx, dy, col] = pxs[i], hh = ((i * 7919) % 13) / 13; if (hh < p2 * 1.15) continue;
      const sc = p2 * (hh - 0.5) * (o.scatter || 52), fall = p2 * p2 * (36 + hh * 44) * (o.fall ?? 1) - (o.lift || 0) * p2;
      c.fillStyle = col; const S = o.chunk || 2; c.fillRect(Math.floor(dx - e.cx + sc), Math.floor(dy + fall), S, S); }
    c.globalAlpha = 1;
  },
  A(c, e) {
    death.crumble(c, e, e.p, { scatter: 30, fall: 0.6 });
    const f = e.i - 2; if (f >= 0 && f < 4) inked(c, e, (g) => { const T = [SMOKE[0], SMOKE[1], SMOKE[1], SMOKE[2]];
      for (let j = 0; j < 4; j++) { const a = j * 1.7 + 0.4, d = 3 + f * 3; ell(g, Math.cos(a) * d, -e.T * 0.3 + Math.sin(a) * d * 0.6 - f * 2, 3.2 + f * 0.9, 3 + f * 0.8, T[f], { a: 1 - f * 0.2, dens: 1 - f * 0.12 }); } });
  },
  B(c, e) {
    const p = e.p; ell(c, 0, 1, e.HW + 4 + p * 8, 3.5 + p * 2, "#000", { a: 0.2 * (1 - p), dens: 0.7 });
    death.crumble(c, e, p, { scatter: 44, fall: 0.5, lift: 16 });
    if (p > 0.1 && p < 0.95) for (let k = 0; k < 4; k++) { const q = cl((p - 0.1 - k * 0.04) / 0.8); ell(c, (k - 1.5) * 6 + Math.sin(q * 5 + k) * 3, -e.T * 0.35 - q * 14, 3 + q * 5, 2.5 + q * 4, SMOKE[q < 0.4 ? 0 : 1], { a: 0.7 * (1 - q), dens: 0.9 - q * 0.5 }); }
    if (p > 0.2 && p < 0.95) { const q = (p - 0.2) / 0.75; ell(c, 0, 1, 5 + q * 14, 2 + q * 5, DUST[1], { a: 0.5 * (1 - q), dens: 0.5 }); const y = -e.T * 0.6 - q * 22; px(c, Math.sin(q * 6) * 3, y, "#dff4ff"); px(c, Math.sin(q * 6) * 3, y + 1, "#9fd4e8", 0.7); px(c, Math.sin(q * 6) * 3, y + 2, "#9fd4e8", 0.4); }
  },
  C(c, e) {
    const p = e.p;
    if (p < 0.25) { drawFoe(c, e, 0, { flash: p < 0.12 ? 1 : 0.6 }); return; }
    const q = (p - 0.25) / 0.75;
    inked(c, e, (g) => { const T = q < 0.35 ? [SMOKE[0], SMOKE[1]] : q < 0.7 ? [SMOKE[1], SMOKE[2]] : [SMOKE[2], SMOKE[3]];
      for (let j = 0; j < 5; j++) { const a = j * 1.3 + 0.5, d = 3 + q * 12; ell(g, Math.cos(a) * d, -e.T * 0.35 + Math.sin(a) * d * 0.6 - q * 6, 6 - q * 1.5, 5.5 - q, T[0], { a: 1 - q * 0.85 }); ell(g, Math.cos(a) * d - 1, -e.T * 0.35 + Math.sin(a) * d * 0.6 - q * 6 - 1, 3, 2.5, T[1] === T[0] ? SMOKE[0] : SMOKE[0], { a: 1 - q }); } }, { passes: 2, ink: "#2a262e" });
    if (q < 0.7) for (let k = 0; k < 4; k++) { const a = q * 5 + (k * TAU) / 4, x = Math.cos(a) * 13, y = -e.T * 0.35 + Math.sin(a) * 6 - q * 12; stamp(c, ["..1..", ".121.", "12221", ".121.", "..1.."], { 1: HOLY[1], 2: HOLY[0] }, Math.round(x) - 2, Math.round(y) - 2); }
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, d = 4 + q * 18; rect(c, Math.cos(a) * d, -e.T * 0.3 + Math.sin(a) * d * 0.7 + q * q * 8, 2, 2, k % 2 ? "#5a8a4a" : "#3c5e34", 1 - q); }
  },
};

const FOE = { cw: 64, ch: 76, ax: 30, ay: 60, N: 8 };
const BLAST = { cw: 104, ch: 84, ax: 52, ay: 56, N: 8 };
export const ROWS = [
  { id: "burn", label: "Burn", group: "Status on a foe", note: "A goblin set alight.", ...FOE, A: burn.A, B: burn.B, C: burn.C },
  { id: "poison", label: "Poison", group: "Status on a foe", note: "Bubbles and drip on the body.", ...FOE, A: poison.A, B: poison.B, C: poison.C },
  { id: "slow", label: "Slow / chill", group: "Status on a foe", note: "Today: a wheel of stars over the head, more stars the harder the slow.", ...FOE, A: slow.A, B: slow.B, C: slow.C },
  { id: "frozen", label: "Frozen shell", group: "Status on a foe", note: "The foe is held in ice.", ...FOE, A: frozen.A, B: frozen.B, C: frozen.C },
  { id: "stun", label: "Stun", group: "Status on a foe", note: "The foe is dazed.", ...FOE, A: stun.A, B: stun.B, C: stun.C },
  { id: "shield", label: "Shield pips", group: "Status on a foe", note: "One pip per blow still to be swallowed; the last one breaks at frame 6.", ...FOE, A: shield.A, B: shield.B, C: shield.C },
  { id: "crack", label: "Armor crack (brittle)", group: "Status on a foe", note: "The crack opens over frames 1-5.", ...FOE, A: crack.A, B: crack.B, C: crack.C },
  { id: "phys", label: "Physical hit", group: "Hits and blasts", note: "A blow lands at frame 1.", ...FOE, A: physhit.A, B: physhit.B, C: physhit.C },
  { id: "magic", label: "Magic hit", group: "Hits and blasts", note: "A bolt lands at frame 1. (The spell rings themselves are kept.)", ...FOE, A: maghit.A, B: maghit.B, C: maghit.C },
  { id: "splash", label: "Catapult / keg blast", group: "Hits and blasts", note: "Splash on the ground, no foe under it.", ...BLAST, A: splash.A, B: splash.B, C: splash.C },
  { id: "shrapnel", label: "Shrapnel burst", group: "Hits and blasts", note: "The Powder Works' charge and its shards.", ...BLAST, A: shrapnel.A, B: shrapnel.B, C: shrapnel.C },
  { id: "raise", label: "Raising the dead", group: "Life and death", note: "A goblin climbs out as a Risen (bone-pale).", cw: 72, ch: 76, ax: 36, ay: 62, N: 8, A: rise.A, B: rise.B, C: rise.C },
  { id: "heal", label: "Heal wave", group: "Life and death", note: "The shaman's mending sweeps a hurt goblin.", ...BLAST, ay: 60, ch: 90, A: heal.A, B: heal.B, C: heal.C },
  { id: "death", label: "Death poof", group: "Life and death", note: "A goblin falls.", cw: 72, ch: 76, ax: 36, ay: 60, N: 8, A: death.A, B: death.B, C: death.C },
  { id: "rings", label: "Spell rings (kept as is)", group: "Kept", note: "The owner likes these: firenova | frostnova. No concepts.", ...BLAST, ay: 52, keep: true, cols2: true },
];
