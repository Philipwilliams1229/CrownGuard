// Effects concepts, Round 4 (rime and sea): see art/briefs/fx-round4.md. Owned by the rime artist.
// Rows: landing (the beach warning, then the longship holed and sinking), surface (the sea serpent
// breaks the water), frozenhall (the Seer's ice shell on a hall, then the thaw).
// Each row: { id, label, group: "Round 4", note, cw, ch, ax, ay, N, today, A, B, C }; painters get (c, e).
// The game's own painters are loaded only in a browser (top-level await), so Node can still read the rows.
const BR = typeof document !== "undefined";
const RX = BR ? await import("/src/render/rimefx.js") : null;
const RG = BR ? await import("/src/render/rigs.js") : null;
const PA = BR ? await import("/src/render/paint.js") : null;
const K = () => PA.PX;

// ---- toolkit (copied from concept/fx-concepts.js) ------------------------------------------------------
const H = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ez = (p) => 1 - (1 - p) * (1 - p);
const TAU = Math.PI * 2;
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
// a ring with a one-pixel dark line on both edges
const ring2 = (c, cx, cy, rx, ry, col, ink, th = 2, o = {}) => { ring(c, cx, cy, rx + 1, ry + 1, ink, { th: th + 2, a: o.a }); ring(c, cx, cy, rx, ry, col, { th, a: o.a, dens: o.dens }); };
const line = (c, x0, y0, x1, y1, col, a = 1) => {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let er = dx + dy;
  for (let n = 0; n < 400; n++) { px(c, x0, y0, col, a); if (x0 === x1 && y0 === y1) break; const e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; } }
};
// draw on a spare layer, then ink it with a one-pixel line in the neighbour's own dark (the tinted line)
const inked = (c, e, draw, o = {}) => {
  const t = mk(e.cw, e.ch), g = t.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = false; g.translate(e.ax, e.ay); draw(g);
  const img = g.getImageData(0, 0, t.width, t.height), d = img.data, W = t.width, Hh = t.height, out = new Uint8ClampedArray(d);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (d[i + 3] > 40) continue; let n = -1;
    if (x > 0 && d[i - 4 + 3] > 40) n = i - 4; else if (x < W - 1 && d[i + 4 + 3] > 40) n = i + 4;
    else if (y > 0 && d[i - W * 4 + 3] > 40) n = i - W * 4; else if (y < Hh - 1 && d[i + W * 4 + 3] > 40) n = i + W * 4;
    if (n < 0) continue;
    out[i] = d[n] * 0.4 + 10; out[i + 1] = d[n + 1] * 0.32 + 4; out[i + 2] = d[n + 2] * 0.46 + 18; out[i + 3] = 255;
  }
  img.data.set(out); g.putImageData(img, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(t, 0, 0); c.restore();
};
// the lab hands us c translated by (ax, ay); put it back to the cell's own pixels for inked()
const W = (c, k, fn) => { c.save(); c.scale(k, k); fn(); c.restore(); };

// ---- the sea and a snowy beach -------------------------------------------------------------------------
const SEA = ["#2d4c64", "#3a5f78", "#4a738c", "#6a97ae", "#c4dde9"];
const FOAM = "#eef8fc", FOAM2 = "#c4dde9";
const SNOW = ["#f4f8fa", "#d6e0e8", "#aebccb", "#8496aa"], SHING = ["#928a7a", "#6f685c"];
const bx = (y) => 76 + Math.round(3 * Math.sin(y * 0.2) + 2 * Math.sin(y * 0.07 + 1));
const sea = (c, e, o = {}) => {
  const x0 = -e.ax, y0 = -e.ay;
  for (let y = y0; y < y0 + e.ch; y++) for (let x = x0; x < x0 + e.cw; x++) {
    const b = o.beach === false ? 1e9 : bx(y);
    if (x >= b) continue;
    const wv = Math.sin(x * 0.33 + y * 1.1 - e.t * TAU * 2) + Math.sin(x * 0.17 - y * 0.6 + e.t * TAU);
    let col = SEA[1];
    if (wv > 1.55) col = SEA[3]; else if (wv < -1.5) col = SEA[0]; else if (wv > 0.85 && bay(x, y) < 0.2) col = SEA[2];
    if (bay(x, y) < cl((b - 55 - x) / 90, 0, 0.55)) col = SEA[0];
    if (x >= b - 9 && bay(x, y) < 0.5 && wv > -0.6) col = SEA[2];
    px(c, x, y, col);
  }
  if (o.beach === false) return;
  for (let y = y0; y < y0 + e.ch; y++) {
    const b = bx(y), lap = Math.round(1.5 + 1.5 * Math.sin(e.t * TAU + y * 0.3));
    for (let x = b - 1 - lap; x < b; x++) px(c, x, y, x === b - 1 - lap ? FOAM2 : FOAM);
    for (let x = b; x < x0 + e.cw; x++) {
      const d = x - b, h = H(x, y);
      let col = d < 2 ? "#a2afba" : d < 4 ? SNOW[2] : h > 0.93 ? SHING[h > 0.97 ? 1 : 0] : h < 0.12 ? SNOW[1] : SNOW[0];
      if (d >= 4 && d < 8 && bay(x, y) < 0.35) col = SNOW[1];
      px(c, x, y, col);
    }
  }
};
// a rowed longship from the game's own sprite, waterline clip, halves
const ship = (c, x, y, o = {}) => {
  const k = K();
  c.save();
  if (o.wl != null) { c.beginPath(); c.rect(-400, -400, 800, 400 + o.wl); c.clip(); }
  c.translate(Math.round(x), Math.round(y)); c.rotate(o.tilt || 0); c.scale(k, k);
  if (o.half) { c.beginPath(); c.rect(o.half < 0 ? -200 : o.cut || 0, -300, 200 + (o.half < 0 ? (o.cut || 0) : 0), 600); c.clip(); }
  RX.ZONE_FX.beached(c, { x: 0, y: 0, face: 1, hp: o.sail === false ? 0 : 1, ttl: 1e9 }, { time: 0 });
  c.restore();
};
const foamRow = (c, cx, y, hw, amt, ph) => { for (let x = -hw; x <= hw; x++) { const h = H(x + ph * 3, 9); if (h < amt) px(c, cx + x, y + (h < amt * 0.3 ? -1 : 0), h < amt * 0.5 ? FOAM : FOAM2); } };
const bubbles = (c, cx, cy, n, p, spread) => { for (let i = 0; i < n; i++) { const u = (p * 1.2 + H(i, 3)) % 1, x = cx + (H(i, 5) - 0.5) * spread + Math.sin(u * 9 + i) * 1.2, y = cy - u * 26; px(c, x, y, FOAM, 1 - u); if (H(i, 8) > 0.6) px(c, x + 1, y, FOAM2, 1 - u); } };
// a sculpted horn, ivory with a red flare and a brass band, over the beach
const horn = (c, e, x, y, k) => {
  inked(c, e, (g) => {
    g.save(); g.translate(x, y); g.scale(1.7, 1.7);
    for (let i = 0; i <= 30; i++) {
      const u = i / 30, hx = -11 + 22 * u, hy = 5 - 11 * u + 6 * u * u, r = 4.4 - 3.4 * u;
      ell(g, hx, hy, r, r, u > 0.3 && u < 0.4 ? "#d9a63a" : u < 0.1 ? "#c44a3c" : "#f2ead2");
      if (u > 0.1 && !(u > 0.3 && u < 0.4)) ell(g, hx + 0.6, hy + r * 0.45, r * 0.8, r * 0.5, "#c9b88e", { dens: 0.75 });
      if (u > 0.4) px(g, hx - 1, hy - r * 0.5, "#ffffff");
    }
    ell(g, -11.5, 5, 3.4, 4.6, "#c44a3c"); ell(g, -11.2, 5, 2.2, 3.4, "#4a1a18"); px(g, -12, 3, "#e8705c"); px(g, -12, 4, "#e8705c");
    g.restore();
  });
};
const warnRing = (c, e, cx, cy, k, pulse, ink, col, a = 1) => { ring2(c, cx, cy, Math.round((17 + 6 * pulse) * k), Math.round((8 + 3 * pulse) * k * 0.9), col, ink, 3, { a }); };
const runDots = (c, e, x0, y0, x1, y1) => { for (let i = 0; i <= 6; i++) { if ((i + Math.floor(e.t * 7)) % 2) continue; const x = Math.round(x0 + (x1 - x0) * i / 6), y = Math.round(y0 + (y1 - y0) * i / 6); rect(c, x - 2, y - 2, 4, 4, "#4a1418"); rect(c, x - 1, y - 1, 2, 2, "#f05a44"); } };

// ================== landing ==================
const LN = 14, LW = 74, LY = 20;     // warn / approach frames 0..5, holed and going under 6..13
const landToday = (c, e) => {
  const k = K(); sea(c, e); const warn = e.i < 6;
  if (warn) {
    W(c, k, () => { const f = { x: 42 / k, y: 14 / k, rx: 98 / k, ry: 30 / k, ttl: 4000, life: 5000 }; RX.ZONE_FX.landingWarn(c, f, { time: e.i * 0.35 }); });
    ship(c, -125 + 80 * ez(e.i / 5), 12 + Math.round(Math.sin(e.t * TAU * 2)), {}); }
  else { const q = (e.i - 6) / 7; W(c, k, () => RX.ZONE_FX.shipsink(c, { x: -30 / k, y: 12 / k, face: 1, ttl: 1000 * (1 - q), life: 1000 }, { time: 1 })); }
};
const landing = (o) => (c, e) => {
  const k = K(); sea(c, e);
  const i = e.i, pulse = 0.5 + 0.5 * Math.sin(e.t * TAU * 2), wy = 14, wx = 42;
  const INK = "#4a1418", RED = o.cold ? "#f05a44" : "#f05a44";
  const sx0 = -125 + 80 * ez(Math.min(1, i / 5)), bob = Math.round(Math.sin(e.t * TAU * 2));
  // the beach's warning ring and the dotted run up the shingle
  const showWarn = i < 11 || !o.fadeWarn;
  if (showWarn) {
    const a = i < 6 ? 1 : 0.55;
    warnRing(c, e, wx, wy, k, pulse, INK, RED, a); c.globalAlpha = a; runDots(c, e, wx + 14, wy + 8, 98, 28);
    if (o.bow && i < 6) ring(c, wx, wy, Math.round(8 * k), Math.round(3.6 * k), "#f6c0b0", { th: 1, dens: 0.5 });
    c.globalAlpha = 1;
    if (i < 6) horn(c, e, wx, wy - 34 + bob, k);
  }
  if (i < 6) {
    const sy = 12 + bob, hl = 25 * k;
    if (o.bow) {   // a bow wave and a trailing wake
      for (let n = 0; n < 9; n++) { const bxx = sx0 + hl - n * 3.2, off = 1 + n * 0.9; px(c, bxx, sy + 3 * k * 0.5 + off, n < 4 ? FOAM : FOAM2); px(c, bxx, sy + 3 * k * 0.5 - off * 0.3 + 2, FOAM2); }
      for (let n = 0; n < 4; n++) rect(c, sx0 + hl + 2 + n, sy + 2 * k * 0.5 - n % 2, 2, 1, FOAM);
      for (let n = 0; n < 26; n++) { const h = H(n, 2), xx = sx0 - hl + 2 - n * 2.2; if (h < 0.75 - n * 0.02) px(c, xx, sy + 3 * k * 0.5 + 3 + (h < 0.3 ? 1 : 0), h < 0.35 ? FOAM : FOAM2); }
    }
    ship(c, sx0, sy, { wl: sy + 2.5 * k });
    foamRow(c, sx0, sy + Math.round(2.5 * k), hl, 0.35, i);
    return;
  }
  const q = (i - 6) / 7, hx = -30, hy = 12;
  const wl = hy + 2.5 * k;
  if (!o.brk) {          // A: the hull listing and going under the waterline
    const sink = q * 40 * k * 0.9, tilt = 0.3 * q;
    ship(c, hx, hy + sink, { tilt, wl, sail: q < 0.5 });
    foamRow(c, hx, Math.round(wl), 25 * k * (1 - q * 0.5), 0.5, i);
    ring(c, hx, Math.round(wl), 10 * k * q + 5, 4 * k * q + 2, FOAM, { th: 1, a: 1 - q * 0.8, dens: 0.8 });
    bubbles(c, hx, wl, 6, q, 30);
  } else {              // B / C: the keel breaks, two halves go down, flotsam floats
    const brk = q > 0.12 ? 1 : 0, s = ez(q);
    if (brk) {
      ship(c, hx - 2 * s * k, hy + s * 38 * k * 0.8, { tilt: -0.25 * s, wl, half: -1, cut: 0, sail: q < 0.55 });
      ship(c, hx + 3 * s * k, hy + s * 44 * k * 0.9, { tilt: 0.35 * s, wl, half: 1, cut: 0, sail: q < 0.55 });
    } else ship(c, hx, hy + 2, { wl });
    foamRow(c, hx, Math.round(wl), 28 * k * 0.9, 0.55, i);
    ring(c, hx, Math.round(wl), 12 * k * q + 5, 4.5 * k * q + 2, FOAM, { th: 1, a: 1 - q * 0.7, dens: 0.8 });
    bubbles(c, hx, wl, 9, q, 34);
    // flotsam: planks, shields, a barrel, bobbing and drifting toward the beach
    const fl = [[-16, 3, "p"], [10, 5, "s"], [-30, 7, "p"], [22, 2, "b"], [-4, 9, "s"], [32, 8, "p"]];
    fl.forEach(([dx, dy, kind], n) => {
      if (q < 0.15 + n * 0.02) return;
      const t = q - 0.15, fx = hx + dx * (1 + t * 0.7) + t * 8, fy = hy + dy + Math.round(Math.sin(e.t * TAU * 2 + n)) - Math.max(0, 6 - t * 30);
      if (kind === "p") { rect(c, fx - 6, fy, 13, 3, "#4a3426"); rect(c, fx - 6, fy, 12, 2, "#8a6a48"); rect(c, fx - 2, fy, 4, 1, "#a8865c"); }
      else if (kind === "s") { ring(c, fx, fy, 8, 4, "#2a1c12", { th: 1 }); ell(c, fx, fy, 7, 3, n % 2 ? "#2f8a84" : "#d49a30"); ell(c, fx - 1.5, fy - 1, 4, 1.4, n % 2 ? "#52b0a6" : "#f0c050"); rect(c, fx - 1, fy, 2, 1, "#c4c8d0"); }
      else { rect(c, fx - 5, fy - 7, 10, 10, "#2a1c12"); rect(c, fx - 4, fy - 6, 8, 8, "#6e5440"); rect(c, fx - 4, fy - 6, 8, 2, "#8a6a48"); rect(c, fx - 4, fy - 3, 8, 1, "#3a2a20"); rect(c, fx - 4, fy, 8, 1, "#3a2a20"); }
      foamRow(c, fx, fy + 3, 8, 0.5, i + n);
    });
  }
  if (o.cold) {   // C: a cold flash as she is holed, then a burst of spray
    if (i <= 8) { const f = i - 6; if (f === 0) ell(c, hx, hy - 4, 22, 12, "#ffffff"); ring(c, hx, hy - 4, 16 + f * 26, 8 + f * 13, "#ffffff", { th: 4 - f }); ring(c, hx, hy - 4, 22 + f * 30, 11 + f * 15, "#bfe8ff", { th: 2, dens: 0.6 }); }
    for (let n = 0; n < 40; n++) {
      const ang = -0.2 - H(n, 1) * 2.75, v = (30 + H(n, 2) * 40) * k * 0.7, ph = Math.max(0, q * 1.4 - H(n, 3) * 0.12);
      const dx = Math.cos(ang) * v * ph * 1.3, dy = Math.sin(ang) * v * ph + 110 * k * 0.5 * ph * ph, col = n % 3 ? FOAM : "#bfe8ff";
      if (ph > 0 && ph < 1.1 && dy < 10) { rect(c, hx + dx, hy + dy, 2, 2, col); if (n % 3 === 0) px(c, hx + dx + 2, hy + dy + 1, FOAM2); }
    }
    ring(c, hx, Math.round(wl), 22 * k * ez(q), 7 * k * ez(q), "#bfe8ff", { th: 2, a: 1 - q, dens: 0.7 });
  }
};

// ================== surface ==================
const SN = 14, SW = 190, SH_ = 150, NX = 16;   // NX: where the neck breaks the water
const rig = (c, e, frame, alpha = 1) => { const k = K(); c.save(); c.scale(k, k); RG.drawRig(c, "seaserpent", 0, 0, 1, "walk", frame, "", alpha); c.restore(); };
const spl = (c, e, q, n, R) => { for (let i = 0; i < n; i++) { const x0 = NX + 6 + (H(i, 1) - 0.4) * R, u = Math.max(0, q - H(i, 2) * 0.2), v = 40 + H(i, 3) * 60, dy = -v * u * 1.6 + 120 * u * u; if (u > 0 && dy < 3) { const x = x0 + (H(i, 4) - 0.4) * 50 * u, col = i % 3 ? FOAM : "#bfe8ff"; rect(c, x, dy - 4, 2, 2, col); if (i % 2 === 0) px(c, x + 2, dy - 3, FOAM2); if (i % 5 === 0) px(c, x, dy - 2, "#ffffff"); } } };
const boil = (c, e, g, R) => {   // a boil of foam: churned blobs and popping rings
  ell(c, NX, 1, R, R * 0.4, SEA[2], { dens: 0.5 });
  for (let i = 0; i < 46; i++) { const a = H(i, 1) * TAU, r = Math.sqrt(H(i, 2)) * R * g, x = NX + Math.cos(a) * r, y = Math.sin(a) * r * 0.4 + 1, ph = (g * 3 + H(i, 3) * 3) % 1; if (ph > 0.85) continue; const big = H(i, 4) > 0.45; rect(c, x, y, 2, 1, FOAM); if (big) { rect(c, x, y - 1, 2, 1, FOAM2); px(c, x + 1, y + 1, FOAM2); px(c, x - 1, y, "#ffffff"); } }
  for (let i = 0; i < 6; i++) { const a = H(i, 9) * TAU, r = H(i, 8) * R * 0.7 * g, ph = (g * 2 + H(i, 7)) % 1; ring(c, NX + Math.cos(a) * r, Math.sin(a) * r * 0.4, 3 + ph * 9, 1.4 + ph * 3.4, FOAM2, { th: 1, a: 1 - ph }); }
};
const surfToday = (c, e) => {
  const k = K(); sea(c, e, { beach: false }); const p = e.p;
  W(c, k, () => { const r = 6 + 12 * Math.min(1, p * 2), a = 0.8 * (1 - Math.min(1, p * 2) * 0.5); c.strokeStyle = `rgba(226,240,246,${a})`; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, r, r * 0.45, 0, 0, TAU); c.stroke(); });
  rig(c, e, "surface." + Math.min(3, Math.floor(p * 4)));
};
const surface = (o) => (c, e) => {
  const k = K(); sea(c, e, { beach: false }); const i = e.i;
  const f = i < 5 ? -1 : Math.min(3, Math.floor((i - 5) / 2.25));
  const g = cl(i / 5);
  if (o.shadow && i < 10) { const s = i < 5 ? ez(cl(i / 4)) : 1 - (i - 5) / 5; ell(c, -20, 6 - 3 * s, 70 * s + 4, 14 * s + 2, "#0c1e28", { dens: 0.6, a: 0.9 }); ell(c, -16, 6 - 3 * s, 46 * s + 2, 8 * s + 1, "#06141c", { dens: 0.85 }); ell(c, NX, 4, 20 * s + 1, 6 * s + 1, "#06141c"); }
  if (!o.boil) {   // A: a stepped ring and a following ripple, the body as it is
    const r = 8 + 40 * ez(cl(i / 10)), a = 1 - cl(i / 13) * 0.7;
    ring2(c, NX, 1, Math.round(r), Math.round(r * 0.4), FOAM, "#2d4c64", 2, { a });
    if (i > 3) ring(c, NX, 1, Math.round(r * 0.6), Math.round(r * 0.25), FOAM2, { th: 1, a });
  } else {
    if (i < 12) boil(c, e, i < 5 ? g : 1 - (i - 5) / 9 * 0.5, 28 + 18 * ez(cl(i / 6)));
    ring(c, NX, 1, Math.round(12 + 44 * ez(cl((i - 3) / 9))), Math.round(5 + 17 * ez(cl((i - 3) / 9))), FOAM, { th: 1, a: i < 3 ? 0 : 1 - cl((i - 3) / 10) });
  }
  if (f >= 0) rig(c, e, "surface." + f);
  else if (o.boil && i > 0) rig(c, e, "sub." + (i % 4), 0.55);
  if (o.boil && i >= 6) spl(c, e, (i - 6) / 7, 36, 30);
  if (o.boil && i >= 10) { for (let n = 0; n < 6; n++) { const x = NX - 2 + H(n, 4) * 16, u = ((i - 10) / 3 + H(n, 6)) % 1; rect(c, x, -24 + u * 26, 1, 2, "#bfe8ff"); } }
  if (o.shadow && i >= 5 && i < 9) ring(c, NX, 1, 14 + (i - 5) * 8, 5 + (i - 5) * 3, "#a8d4ea", { th: 1, dens: 0.6 });
};

// ================== frozen hall ==================
const FN = 16;
const ICE = ["#f2fcff", "#c8eafa", "#94cbe8", "#5f98c6"], ICE_INK = "#2c4c78";
const MCACHE = new Map();
const hallMask = (e) => {
  const key = e.cw + "x" + e.ch + "@" + K(); let r = MCACHE.get(key); if (r) return r;
  const cv = mk(e.cw, e.ch), g = cv.getContext("2d", { willReadFrequently: true }); g.imageSmoothingEnabled = false; g.translate(e.ax, e.ay); e.hall(g, { level: 2 });
  const d = g.getImageData(0, 0, e.cw, e.ch).data, m = new Uint8Array(e.cw * e.ch);
  let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
  for (let y = 0; y < e.ch; y++) for (let x = 0; x < e.cw; x++) if (d[(y * e.cw + x) * 4 + 3] > 40) { m[y * e.cw + x] = 1; y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const dil = (src, rad) => { const o = new Uint8Array(src.length); for (let y = 0; y < e.ch; y++) for (let x = 0; x < e.cw; x++) { let v = 0; for (let dy = -rad; dy <= rad && !v; dy++) for (let dx = -rad; dx <= rad; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < e.cw && Y < e.ch && src[Y * e.cw + X] && dx * dx + dy * dy <= rad * rad + 1) { v = 1; break; } } o[y * e.cw + x] = v; } return o; };
  r = { m, D: dil(m, 3), y0: y0 - e.ay, y1: y1 - e.ay, x0: x0 - e.ax, x1: x1 - e.ax }; MCACHE.set(key, r); return r;
};
const iceLayer = (c, e, o) => {
  const M = hallMask(e), w = e.cw, h = e.ch, top = M.y0 - 2, bot = M.y1 + 2, span = bot - top, mid = (M.x0 + M.x1) / 2, hw = (M.x1 - M.x0) / 2 + 2;
  const V = new Uint8Array(w * h), tone = new Uint8Array(w * h), ALP = new Float32Array(w * h);
  const grow = o.grow, melt = o.melt || 0, dens = o.dens ?? 0.75;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = y * w + x; if (!M.D[j]) continue;
    const X = x - e.ax, Y = y - e.ay, hh = (bot - Y) / span;
    const noise = o.rag ? (H(X * 0.8, 3) - 0.5) * 0.16 + Math.sin(X * 0.35) * 0.04 : 0;
    if (hh > grow + noise) continue;
    if (hh > 1 - melt * 1.25 + (H(X, Y * 0.3) - 0.5) * (o.rag ? 0.18 : 0.05)) continue;
    const rim = !M.m[j];
    V[j] = 1; ALP[j] = rim ? 0.95 : 0.62 * (1 - melt * 0.45);
    let t;
    if (o.facets) { const f = Math.floor((X * 0.8 + Y * 0.55 + 100) / 7) % 3; if (!rim) ALP[j] = [0.56, 0.7, 0.48][f] * (1 - melt * 0.45); t = [1, 2, 1][f] + (bay(X, Y) < 0.28 ? (f === 1 ? 1 : -1) : 0); if (H(X, Y) > 0.985) t = 0; }
    else t = Math.floor(((X - mid + hw) / (2 * hw)) * 3 + bay(X, Y) * 0.8 + (rim ? -0.4 : 0.2));
    tone[j] = cl(t, 0, 3);
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : V[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = y * w + x; if (!V[j]) continue;
    let t = tone[j]; const X = x - e.ax, Y = y - e.ay;
    if (!at(x - 1, y - 1) || !at(x, y - 1) && !at(x - 1, y)) t = 0; else if (!at(x + 1, y + 1) || !at(x, y + 1) && !at(x + 1, y)) t = 3;
    const edge = t === 0 || t === 3 ? !(at(x - 1, y - 1) && at(x + 1, y + 1)) : false;
    px(c, X, Y, ICE[t], edge ? 0.95 : ALP[j]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = y * w + x; if (V[j] || !(at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) continue; px(c, x - e.ax, y - e.ay, ICE_INK); }
  if (o.icicles) for (let x = 0; x < w; x++) for (let y = 0; y < h - 1; y++) {
    if (!(V[y * w + x] && !V[(y + 1) * w + x]) || y - e.ay > bot - 8) continue; const hs = H(x, 7); if (hs < 0.5) continue;
    const L = Math.round((2 + Math.floor(hs * 6)) * (1 - melt * 1.1) * cl(grow * 1.4 - 0.2)); for (let n = 1; n <= L; n++) { px(c, x - e.ax, y - e.ay + n, n === L ? ICE[0] : ICE[1]); if (n > 1 && n < L && o.cracks !== undefined) px(c, x - e.ax + 1, y - e.ay + n, ICE_INK, 0.5); } px(c, x - e.ax, y - e.ay + L + 1, ICE_INK);
  }
  if (o.cracks > 0) for (let n = 0; n < 4; n++) {
    let cx = M.x0 + 6 + (n * (M.x1 - M.x0 - 10)) / 3 + H(n, 5) * 4, cy = top + 8 + H(n, 6) * span * 0.35; const len = Math.round(o.cracks * span * 0.6);
    for (let s = 0; s < len; s++) { cx += (H(n, s) - 0.5) * 2.2; cy += 1; const jx = Math.round(cx), jy = Math.round(cy), j = (jy + e.ay) * w + (jx + e.ax); if (j > 0 && V[j]) { px(c, jx, jy, "#4a78a6"); px(c, jx - 1, jy, ICE[0], 0.9); } }
  }
  return { M, bot, top, mid, hw, V };
};
const drips = (c, e, M, melt, bot) => { if (melt <= 0) return; for (let n = 0; n < 8; n++) { const x = M.x0 + 4 + H(n, 2) * (M.x1 - M.x0 - 8), u = (melt * 2 + H(n, 3)) % 1; px(c, x, bot - 6 + u * 12, "#bfe4f6", 1 - u * 0.5); } const r = melt * (M.x1 - M.x0) * 0.55; ell(c, (M.x0 + M.x1) / 2, bot - 1, r, r * 0.22, "#7fb4d6", { dens: 0.8, a: 0.9 }); ell(c, (M.x0 + M.x1) / 2 - 2, bot - 2, r * 0.6, r * 0.12, "#d6f0ff", { dens: 0.5 }); };
const frostSheet = (c, M, bot, g, dens) => { const mid = (M.x0 + M.x1) / 2, r = ((M.x1 - M.x0) / 2 + 12) * g; ell(c, mid, bot - 2, r, r * 0.28, "#d6eaf4", { dens, a: 0.9 }); ell(c, mid, bot - 2, r * 0.7, r * 0.2, "#f2fcff", { dens: dens * 0.6 }); ring(c, mid, bot - 2, r, r * 0.28, "#5f98c6", { th: 1, dens: 0.5 }); };
const crystals = (c, M, bot, g, melt) => {
  const mid = (M.x0 + M.x1) / 2, R = (M.x1 - M.x0) / 2 + 18;
  for (let n = 0; n < 12; n++) {
    const a = (n / 12) * TAU + 0.2, x = Math.round(mid + Math.cos(a) * R), y = Math.round(bot - 2 + Math.sin(a) * R * 0.3), gg = cl(g * 1.5 - H(n, 1) * 0.5) * (1 - cl(melt * 1.4 - H(n, 2) * 0.4)), L = Math.round((4 + H(n, 3) * 5) * gg);
    if (L < 1) continue; for (let s = 0; s < L; s++) { px(c, x, y - s, s > L - 2 ? ICE[0] : ICE[2]); if (s < L - 2 && s > 0) { px(c, x + 1, y - s, ICE[3]); px(c, x - 1, y - s, ICE[1]); } } px(c, x, y + 1, ICE_INK); px(c, x - 1, y, ICE[1]); px(c, x + 1, y, ICE[3]);
    if (L > 6) { px(c, x + 2, y - 3, ICE[1]); px(c, x - 2, y - 4, ICE[1]); }
  }
};
const frozenToday = (c, e) => {
  const k = K(), p = e.p; e.hall(c, { level: 2 });
  const kk = p < 0.55 ? 1 : cl(1 - (p - 0.55) / 0.45), tms = 5000, born = p < 0.12 ? p / 0.12 * 200 : 400;
  const t = { x: 0, y: 0, iceLeft: kk * 4000, iceMax: 4000, iceAt: tms - born, units: [] }, g = { time: tms / 1000, towers: [t], enemies: [], bands: [], units: [], effects: [] };
  if (kk > 0.001) W(c, k, () => RX.drawFrostShells(c, g));
};
const frozen = (o) => (c, e) => {
  const p = e.p, grow = cl(p / (o.slow ? 0.24 : 0.14)), th = cl((p - 0.6) / 0.4);
  e.hall(c, { level: 2 });
  const Mk = hallMask(e), bot = Mk.y1 + 2;
  if (o.ground) frostSheet(c, Mk, bot, ez(grow) * (1 - cl(th * 1.5)), 0.55);
  if (o.rimeRing) { ell(c, (Mk.x0 + Mk.x1) / 2, bot - 2, ((Mk.x1 - Mk.x0) / 2 + 22) * ez(grow), ((Mk.x1 - Mk.x0) / 2 + 22) * 0.3 * ez(grow), "#bfe8ff", { dens: 0.3 * (1 - th), a: 0.8 }); }
  const shat = o.shatter && th > 0.3;
  const melt = o.shatter ? 0 : o.cracks ? cl((th - 0.5) / 0.5) : cl(th * 1.1);
  const dens = shat ? 0 : 0.75 - (o.ground ? 0 : 0);
  const r = shat && th > 0.34 ? { M: Mk, top: Mk.y0 - 2, bot: Mk.y1 + 2, mid: (Mk.x0 + Mk.x1) / 2 } : iceLayer(c, e, { grow, melt, dens: dens || 0.0001, rag: o.rag, facets: o.facets, icicles: o.icicles, cracks: o.cracks ? cl(th / 0.5) : undefined });
  if (shat) {   // C: the shell bursts into shards that fly out and drop
    const s = cl((th - 0.3) / 0.7), mid = r.mid;
    for (let n = 0; n < 70; n++) {
      const a = H(n, 1) * TAU, sp = 18 + H(n, 2) * 48, x0 = mid + (H(n, 3) - 0.5) * 34, y0 = r.top + H(n, 4) * (r.bot - r.top) * 0.9;
      const x = x0 + Math.cos(a) * sp * s * 1.1, y = y0 + Math.sin(a) * sp * s * 0.6 + 70 * s * s - 10 * s;
      if (y > r.bot + 6 || s > 0.98) continue; const col = ICE[1 + (n % 3 === 0 ? -1 : n % 3 === 1 ? 0 : 1)], big = H(n, 5) > 0.55;
      px(c, x, y, col); px(c, x + 1, y, col); if (big) { px(c, x, y + 1, ICE[3]); px(c, x - 1, y - 1, ICE[0]); }
    }
    if (th < 0.4) { const fa = cl(1 - (th - 0.3) * 10) * 0.85; for (let y = 0; y < e.ch; y++) for (let x = 0; x < e.cw; x++) if (Mk.D[y * e.cw + x]) px(c, x - e.ax, y - e.ay, "#f6fdff", fa); }
  }
  if (o.rimeRing) crystals(c, Mk, bot, ez(grow), th);
  if (th > 0.3 && !o.shatter) drips(c, e, Mk, melt, bot);
  if (shat) drips(c, e, Mk, cl((th - 0.5) / 0.5) * 0.9, bot);
  if (grow > 0 && grow < 1 || (o.rimeRing && grow < 1)) for (let n = 0; n < 6; n++) { const u = (p * 6 + H(n, 4)) % 1; px(c, Mk.x0 + H(n, 2) * (Mk.x1 - Mk.x0), bot - u * 30, "#f2fcff", 1 - u); }
};

export const ROWS = [
  { id: "landing", label: "Longship lands / sinks", group: "Round 4", note: "The beach warning (the horn, the ring, the run up the shingle), then the holed longship going under. A: today's shapes pixel-baked, hull listing under a waterline cut. B: bow wave and wake, the keel snaps in two, flotsam. C: B plus a cold flash and a spray burst.",
    cw: 240, ch: 130, ax: 130, ay: 80, N: LN, today: landToday, A: landing({}), B: landing({ bow: true, brk: true }), C: landing({ bow: true, brk: true, cold: true }) },
  { id: "surface", label: "Sea serpent surfaces", group: "Round 4", note: "The monster comes up. A: a pixel ring and ripple, then the figure's own rise. B: a boil of foam, the body breaking water, spray falling. C: B plus a dark shadow rising first.",
    cw: SW, ch: SH_, ax: 95, ay: 100, N: SN, today: surfToday, A: surface({}), B: surface({ boil: true }), C: surface({ boil: true, shadow: true }) },
  { id: "frozenhall", label: "Frozen hall", group: "Round 4", note: "A Rime Seer freezes a hall: the ice shell, then the thaw. A: a clean pixel shell fitted to the hall's outline, melting from the top. B: ice creeping up from the ground, facets, icicles, then cracking and melting. C: B plus a ring of rime crystals and a shatter of shards at the thaw.",
    cw: 130, ch: 190, ax: 65, ay: 170, N: FN, today: frozenToday, A: frozen({}), B: frozen({ rag: true, facets: true, icicles: true, cracks: true, ground: true, slow: true }), C: frozen({ rag: true, facets: true, icicles: true, shatter: true, ground: true, rimeRing: true, slow: true }) },
];
